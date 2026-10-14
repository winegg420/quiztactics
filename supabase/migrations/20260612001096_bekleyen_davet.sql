-- 1096 — Bekleyen davet: tarayıcıda açılan davet linkini kurulu uygulamaya taşıma (Yalnız uygulama, Aşama 4).
--
-- NEDEN: iOS'ta Safari ile ana ekran uygulamasının depoları ayrı; tarayıcıda saklanan davet kodu uygulamaya
-- geçmez. Kurulum sayfası daveti sunucuya "bekleyen" olarak yazar; uygulamada giriş yapan YENİ hesap aynı
-- ağ (IP özeti) + aynı cihaz tipinden geliyorsa "X seni davet etti, doğru mu?" diye sorulur; ödül/arkadaşlık
-- ANCAK onaydan sonra mevcut RPC'lerle (claim_referral / arkadas_davet_kodu_ile_ekle) verilir.
--
-- Ida şartları (14 Eki 2026):
--   · RLS açık, HİÇ policy yok; erişim yalnız security definer RPC.
--   · Ham IP saklanmaz: sha256(tuz | ip). Tuz Vault'ta (davet_ip_tuzu), değeri DB içinde üretilir, kimse görmez.
--   · IP başlığı: cf-connecting-ip (ölçüldü: istemci bu başlığı gönderirse Cloudflare isteği 1000 hatasıyla
--     reddeder; x-forwarded-for ve x-real-ip ise istemciden geçer → KULLANILMAZ). Başlık yoksa eşleştirme yok.
--   · Mobil operatörde çok kişi aynı IP'yi paylaşır: aynı IP özeti + cihaz tipi için 48 saatte birden fazla
--     bekleyen kayıt varsa EŞLEŞTİRME YAPILMAZ (oyuncu Arkadaşlar › davet koduyla ekle'ye düşer).
--   · Kayıt bir kez tüketilir (onay ya da ret), 48 saat geçerli.
--   · Hız sınırı: kayıt IP özeti başına saatte 10; bul/cevapla hesap başına dakikada 10 (hiz_siniri).
--   · YETKİ (Ida onayı): yalnız davet_bekle_kaydet anon'a açık (kurulum sayfasında oturum yok). Hiçbir şey
--     okumaz/döndürmez. bul/cevapla yalnız authenticated.
-- Geri alma: docs/davet-1096-geri-al.sql

create table if not exists public.bekleyen_davet (
  id uuid primary key default gen_random_uuid(),
  ip_ozet text not null,
  cihaz text not null check (cihaz in ('ios', 'android', 'masaustu', 'diger')),
  tur text not null check (tur in ('arkadas', 'referans')),
  davet_eden uuid not null references public.profiles(id) on delete cascade,
  kod text,
  olusturma timestamptz not null default now(),
  tuketildi timestamptz
);
create index if not exists bekleyen_davet_ip_idx on public.bekleyen_davet (ip_ozet, cihaz, olusturma);

alter table public.bekleyen_davet enable row level security;
-- policy YOK: anon/authenticated tabloya doğrudan erişemez.
revoke all on table public.bekleyen_davet from public, anon, authenticated;

-- Tuz: Vault'ta, DB içinde rastgele üretilir (bir kez).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'davet_ip_tuzu') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'davet_ip_tuzu',
      'bekleyen_davet IP özeti tuzu (1096) — değiştirilirse bekleyen kayıtlar eşleşmez');
  end if;
end $$;

-- İç yardımcı: çağıranın IP özeti (cf-connecting-ip yoksa null). Dışarıya kapalı.
create or replace function public.davet_ip_ozet_ic()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ip text;
  v_tuz text;
begin
  begin
    v_ip := nullif(btrim(current_setting('request.headers', true)::json ->> 'cf-connecting-ip'), '');
  exception when others then
    v_ip := null;
  end;
  if v_ip is null then return null; end if;
  select decrypted_secret into v_tuz from vault.decrypted_secrets where name = 'davet_ip_tuzu' limit 1;
  if v_tuz is null then return null; end if;
  return encode(extensions.digest(v_tuz || '|' || v_ip, 'sha256'), 'hex');
end;
$$;
revoke all on function public.davet_ip_ozet_ic() from public, anon, authenticated;

-- 1) Kurulum sayfası (tarayıcı, oturumsuz): daveti bekleyen olarak yaz. Hiçbir şey döndürmez.
create or replace function public.davet_bekle_kaydet(p_tur text, p_deger text, p_cihaz text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ozet text := public.davet_ip_ozet_ic();
  v_eden uuid;
  v_kod text;
  v_sayi int;
begin
  if v_ozet is null then return; end if;
  if p_tur not in ('arkadas', 'referans') or p_cihaz not in ('ios', 'android', 'masaustu', 'diger') then return; end if;

  -- Hız sınırı: aynı IP özeti saatte en çok 10 kayıt/yenileme.
  select count(*) into v_sayi from public.bekleyen_davet
   where ip_ozet = v_ozet and olusturma > now() - interval '1 hour';
  if v_sayi >= 10 then raise exception 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.'; end if;

  if p_tur = 'arkadas' then
    v_kod := upper(btrim(coalesce(p_deger, '')));
    if v_kod !~ '^[A-Z0-9]{8}$' then return; end if;
    select p.id into v_eden from public.profiles p where p.davet_kodu = v_kod and not coalesce(p.is_bot, false);
  else
    if coalesce(p_deger, '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return; end if;
    select p.id into v_eden from public.profiles p where p.id = p_deger::uuid and not coalesce(p.is_bot, false);
  end if;
  if v_eden is null then return; end if;   -- bilinmeyen kod: sessiz (kodun varlığı sızdırılmaz)

  -- 48 saati geçenler temizlenir (tablo küçük kalır).
  delete from public.bekleyen_davet where olusturma < now() - interval '48 hours';

  -- Aynı ağ+cihazdan aynı davet tekrar açıldıysa yeni satır değil, süre yenilenir.
  update public.bekleyen_davet
     set olusturma = now()
   where ip_ozet = v_ozet and cihaz = p_cihaz and tur = p_tur and davet_eden = v_eden and tuketildi is null;
  if found then return; end if;

  insert into public.bekleyen_davet (ip_ozet, cihaz, tur, davet_eden, kod)
  values (v_ozet, p_cihaz, p_tur, v_eden, v_kod);
end;
$$;
revoke all on function public.davet_bekle_kaydet(text, text, text) from public;
grant execute on function public.davet_bekle_kaydet(text, text, text) to anon, authenticated;

-- 2) Uygulama (girişli): bu ağ+cihaz için TEK bekleyen davet varsa onu göster (tüketmez).
create or replace function public.davet_bekleyen_bul(p_cihaz text)
returns table (id uuid, tur text, gorunen_ad text, avatar_url text)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_ozet text;
  v_sayi int;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('davet_bekleyen_bul', 10, interval '60 seconds');
  v_ozet := public.davet_ip_ozet_ic();
  if v_ozet is null or p_cihaz not in ('ios', 'android', 'masaustu', 'diger') then return; end if;

  select count(*) into v_sayi from public.bekleyen_davet b
   where b.ip_ozet = v_ozet and b.cihaz = p_cihaz and b.tuketildi is null
     and b.olusturma > now() - interval '48 hours';
  -- Paylaşılan IP (operatör/okul/kafe): birden fazla bekleyen → eşleştirme YOK.
  if v_sayi <> 1 then return; end if;

  return query
    select b.id, b.tur, p.gorunen_ad, p.avatar_url
      from public.bekleyen_davet b
      join public.profiles p on p.id = b.davet_eden
     where b.ip_ozet = v_ozet and b.cihaz = p_cihaz and b.tuketildi is null
       and b.olusturma > now() - interval '48 hours'
       and b.davet_eden <> auth.uid();
end;
$$;
revoke all on function public.davet_bekleyen_bul(text) from public, anon;
grant execute on function public.davet_bekleyen_bul(text) to authenticated;

-- 3) Uygulama (girişli): oyuncu "doğru mu?" sorusunu cevaplar. Kayıt her iki durumda da tüketilir.
--    Evet → mevcut RPC'ler (ödül/arkadaşlık kuralları, kendi hız sınırları aynen geçerli).
create or replace function public.davet_bekleyen_cevapla(p_id uuid, p_kabul boolean)
returns table (durum text, gorunen_ad text)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_ozet text;
  v_b public.bekleyen_davet%rowtype;
  v_ad text;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('davet_bekleyen_cevapla', 10, interval '60 seconds');
  v_ozet := public.davet_ip_ozet_ic();
  if v_ozet is null then raise exception 'Davet bulunamadı.'; end if;

  select * into v_b from public.bekleyen_davet b
   where b.id = p_id and b.ip_ozet = v_ozet and b.tuketildi is null
     and b.olusturma > now() - interval '48 hours'
   for update;
  if not found or v_b.davet_eden = auth.uid() then raise exception 'Davet bulunamadı.'; end if;

  update public.bekleyen_davet set tuketildi = now() where id = v_b.id;
  select p.gorunen_ad into v_ad from public.profiles p where p.id = v_b.davet_eden;

  if not coalesce(p_kabul, false) then
    return query select 'reddedildi'::text, v_ad;
    return;
  end if;

  if v_b.tur = 'arkadas' then
    return query select * from public.arkadas_davet_kodu_ile_ekle(v_b.kod);
  else
    return query select case when public.claim_referral(v_b.davet_eden) then 'baglandi' else 'baglanamadi' end, v_ad;
  end if;
end;
$$;
revoke all on function public.davet_bekleyen_cevapla(uuid, boolean) from public, anon;
grant execute on function public.davet_bekleyen_cevapla(uuid, boolean) to authenticated;
