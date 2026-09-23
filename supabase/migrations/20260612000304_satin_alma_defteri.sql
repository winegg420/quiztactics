-- Şerit S4 — Satın alma güvenliği, 1/3: satın alma defteri ve tekil makbuz
-- (docs/SATIN_ALMA_DENETIMI.md §3.3-A ve §3.3-E)
--
-- Sorun: coin_satin_alma_isle tekrarı yalnız (user_id, referans) ile ve kilitsiz
-- kontrol ediyordu. Aynı Play jetonu (purchaseToken) başka bir hesapla ya da
-- aynı hesaptan eşzamanlı iki istekle ikinci kez coin'e çevrilebiliyordu.
--
-- Çözüm:
--   1) coin_satin_alma_defteri: purchase_token ve order_id HESAPTAN BAĞIMSIZ
--      benzersiz. Jetonu ilk işleyen hesap sahibidir; ikinci hesap reddedilir.
--   2) Kayıt `insert … on conflict do nothing` ile açılır. Eşzamanlı iki istekte
--      ikinci insert, birincinin transaction'ı bitene kadar benzersiz indekste
--      bekler; sonra çakışmayı görür ve coin yazmaz. Yalnız biri işlenir.
--   3) coin_hareketleri'nde tur='satin_alma' için referans (jeton) üzerinde
--      hesaptan bağımsız kısmi benzersiz indeks — ikinci savunma hattı.
--      (Canlıda tur='satin_alma' satırı 0; çakışma yok, 23 Eyl 2026 ölçüldü.)
--   4) Aynı hesabın aynı jetonla tekrar gelmesi hata değil: 'tekrar' döner,
--      coin yazılmaz. Böylece sunucudaki tüketim (consume) yeniden denenebilir.
--
-- Tüm fonksiyonlar yalnız service_role (Edge Function) içindir.

-- ---------------------------------------------------------------------------
-- 1) Defter
-- ---------------------------------------------------------------------------
create table if not exists public.coin_satin_alma_defteri (
  id                 bigserial primary key,
  purchase_token     text not null unique,
  order_id           text unique,               -- Play orderId (GPA.…); eski yolda boş olabilir
  user_id            uuid not null references auth.users(id) on delete cascade,
  urun_id            text not null,
  coin               bigint not null check (coin > 0),
  durum              text not null default 'islendi'
                     check (durum in ('islendi', 'tuketildi', 'iade')),
  satin_alma_turu    int,                       -- Play purchaseType: null=gerçek, 0=test, 1=promosyon, 2=ödüllü
  bolge              text,                      -- Play regionCode
  satin_alma_zamani  timestamptz,               -- Play purchaseTimeMillis
  olusturuldu        timestamptz not null default now(),
  tuketildi          timestamptz,
  tuketim_hatasi     text,                      -- sunucu consume başarısızsa son hata
  iade_zamani        timestamptz,
  iade_nedeni        int,                       -- Play voidedReason
  iade_kaynagi       int,                       -- Play voidedSource
  iade_geri_alinan   bigint,                    -- iadede bakiyeden düşülen
  iade_eksik         bigint not null default 0  -- bakiye yetmediği için düşülemeyen (işaret)
);

create index if not exists coin_satin_alma_defteri_kullanici
  on public.coin_satin_alma_defteri (user_id, olusturuldu desc);
-- İadede bakiyesi yetmeyen hesapları bulmak için
create index if not exists coin_satin_alma_defteri_iade_eksik
  on public.coin_satin_alma_defteri (user_id) where iade_eksik > 0;

alter table public.coin_satin_alma_defteri enable row level security;
-- Politika yok: oyuncu doğrudan okuyamaz/yazamaz. Varsayılan yetkiler de geri alınır.
revoke all on table public.coin_satin_alma_defteri from public, anon, authenticated;
revoke all on sequence public.coin_satin_alma_defteri_id_seq from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) coin_hareketleri: satın alma jetonu hesaptan bağımsız tekil
-- ---------------------------------------------------------------------------
create unique index if not exists coin_hareketleri_satin_alma_tek
  on public.coin_hareketleri (referans)
  where tur = 'satin_alma' and referans is not null;

-- ---------------------------------------------------------------------------
-- 3) Defteri açan ve coin'i yazan tek kapı
-- ---------------------------------------------------------------------------
-- Dönüş: { durum: 'yeni' | 'tekrar', coin, bakiye, tuketildi }
--   'tekrar' = bu jeton zaten BU hesaba işlenmiş; coin yazılmadı.
-- Jeton ya da sipariş başka hesaba aitse hata: 'Bu satın alma başka bir hesaba ait'.
create or replace function public.coin_satin_alma_kaydet(
  p_user uuid,
  p_urun_id text,
  p_token text,
  p_order_id text default null,
  p_satin_alma_turu int default null,
  p_bolge text default null,
  p_satin_alma_ms bigint default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paket public.coin_paketleri%rowtype;
  v_toplam bigint;
  v_token text := nullif(btrim(coalesce(p_token, '')), '');
  v_order text := nullif(btrim(coalesce(p_order_id, '')), '');
  v_id bigint;
  v_kayit public.coin_satin_alma_defteri%rowtype;
  v_bakiye bigint;
begin
  if p_user is null then raise exception 'Kullanıcı gerekli'; end if;
  if v_token is null then raise exception 'Satın alma jetonu gerekli'; end if;

  select * into v_paket from public.coin_paketleri where urun_id = p_urun_id and aktif;
  if not found then raise exception 'Coin paketi bulunamadı: %', p_urun_id; end if;
  v_toplam := v_paket.coin + v_paket.bonus;

  -- Kaydı aç. Aynı jeton/sipariş için eşzamanlı ikinci istek burada bekler,
  -- birincinin sonucunu görünce çakışmaya düşer (hiçbir şey eklemez).
  insert into public.coin_satin_alma_defteri
    (purchase_token, order_id, user_id, urun_id, coin, satin_alma_turu, bolge, satin_alma_zamani)
  values
    (v_token, v_order, p_user, p_urun_id, v_toplam, p_satin_alma_turu, nullif(btrim(coalesce(p_bolge, '')), ''),
     case when p_satin_alma_ms is null then null else to_timestamp(p_satin_alma_ms / 1000.0) end)
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    -- Zaten var: jeton ya da sipariş numarası üzerinden bul, satırı kilitle
    select * into v_kayit
      from public.coin_satin_alma_defteri
     where purchase_token = v_token or (v_order is not null and order_id = v_order)
     order by (purchase_token = v_token) desc
     limit 1
     for update;
    if not found then
      raise exception 'Satın alma kaydı çakıştı, tekrar dene';
    end if;
    if v_kayit.user_id <> p_user then
      raise exception 'Bu satın alma başka bir hesaba ait';
    end if;
    if v_kayit.purchase_token <> v_token then
      raise exception 'Bu sipariş başka bir jetonla işlendi';
    end if;
    if v_kayit.durum = 'iade' then
      raise exception 'Bu satın alma iade edilmiş';
    end if;
    select coin into v_bakiye from public.profiles where id = p_user;
    return jsonb_build_object('durum', 'tekrar', 'coin', v_kayit.coin, 'bakiye', v_bakiye,
                              'tuketildi', v_kayit.durum = 'tuketildi');
  end if;

  v_bakiye := public.coin_ekle(p_user, v_toplam, 'satin_alma', v_token);

  -- coin_ekle sessizce vazgeçebilir (bot, profil yok, benzersizlik): o zaman
  -- defter kaydı da geri alınsın diye hata fırlat.
  if v_bakiye is null or not exists (
    select 1 from public.coin_hareketleri
     where tur = 'satin_alma' and referans = v_token and user_id = p_user
  ) then
    raise exception 'Coin hesaba yazılamadı';
  end if;

  return jsonb_build_object('durum', 'yeni', 'coin', v_toplam, 'bakiye', v_bakiye, 'tuketildi', false);
end;
$$;

revoke all on function public.coin_satin_alma_kaydet(uuid, text, text, text, int, text, bigint)
  from public, anon, authenticated;
grant execute on function public.coin_satin_alma_kaydet(uuid, text, text, text, int, text, bigint)
  to service_role;

-- ---------------------------------------------------------------------------
-- 4) Sunucudaki tüketim (consume) sonucunu yaz
-- ---------------------------------------------------------------------------
create or replace function public.coin_satin_alma_tuketim_yaz(p_token text, p_hata text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_hata is null then
    update public.coin_satin_alma_defteri
       set durum = case when durum = 'islendi' then 'tuketildi' else durum end,
           tuketildi = coalesce(tuketildi, now()),
           tuketim_hatasi = null
     where purchase_token = p_token;
  else
    update public.coin_satin_alma_defteri
       set tuketim_hatasi = left(p_hata, 500)
     where purchase_token = p_token;
  end if;
end;
$$;

revoke all on function public.coin_satin_alma_tuketim_yaz(text, text) from public, anon, authenticated;
grant execute on function public.coin_satin_alma_tuketim_yaz(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 5) Eski giriş kapısı: aynı güvenceyle yeni fonksiyona devret
-- ---------------------------------------------------------------------------
-- Canlıda dağıtılmış eski Edge Function sürümü bunu çağırıyor. İmza ve dönüş
-- tipi (bigint bakiye) korunur; tekrar eden jetonda eski davranış gibi hata.
create or replace function public.coin_satin_alma_isle(p_user uuid, p_urun_id text, p_token text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sonuc jsonb;
begin
  v_sonuc := public.coin_satin_alma_kaydet(p_user, p_urun_id, p_token);
  if v_sonuc->>'durum' = 'tekrar' then
    raise exception 'Bu satın alma zaten işlendi';
  end if;
  return (v_sonuc->>'bakiye')::bigint;
end;
$$;

revoke all on function public.coin_satin_alma_isle(uuid, text, text) from public, anon, authenticated;
grant execute on function public.coin_satin_alma_isle(uuid, text, text) to service_role;
