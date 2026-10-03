-- 950: KASA modu (deneysel) — Ida, 3 Eki 2026.
--
-- KURAL (kesin):
--   2 oyuncu, aynı soru aynı anda. Ortada KASA (K) 0'dan başlar. Her soru sonrası K += kasa_artis (2);
--   ikisi de doğruysa K += kasa_ikisi_dogru_artis (6, toplam — 2'ye eklenmez). Soruyu TEK BAŞINA bilen
--   kasanın sahibi olur; ikisi de bilir/bilmezse sahip değişmez. Tur başında (soru gelmeden) sahip
--   AÇ ya da DEVAM der (kasa_karar_sn, dolarsa DEVAM). AÇ: K sahibine puan, K = 0, sahip yok; soru
--   aynı turda yine oynanır. Hedef kasa_hedef_puan (20): AÇ sonrası ilk ulaşan kazanır. kasa_max_tur
--   (24) dolarsa sahip kasayı alır, çok puanlı kazanır; eşitse Altın Soru (yalnız biri bilirse kazanır).
--   Joker / skill / hız bonusu YOK.
--
-- DESEN: Düello (`duellolar`) — bütün durum sunucuda, istemci yalnız `kasa_durum` okur. Her okuma ve
--   eylem `kasa_ilerlet`i (idempotent) çağırır; `kasa_tik` cron'u emniyet ağıdır. Doğru cevap ve botun
--   önceden belirlenen cevabı oyun boyunca istemciye gitmez. Ana tablolar RLS açık + politika YOK
--   (yalnız RPC; Ida onayı 3 Eki 2026); `_select_own` yalnız `kasa_sinyal` ve `kasa_davetleri`'nde.
--
-- ÖDÜL: Klasik ile AYNI yardımcılar (coin_mac_odulu, xp_mac_odulu, lig_mac_*, gunluk_seri_bonusu,
--   mac_sayaci_arttir, istatistikli_mac_arttir, award_badge, sezon_mac_sp) — kopya hesap yok.
--   Ek çarpan: kasa_odul_acik (1/0) × kasa_odul_carpani (1). Düello yeni oyuncu kilidi UYGULANMAZ.
--   Ortak fonksiyonlara yalnız 'kasa' DALI eklenir (mevcut dallar aynen): cift_odul_carpani,
--   xp_mac_odulu, sezon_puani_ekle, gorev_olcum, gorev_dogru_satirlari, gorev_sayaci, mac_sonu_ozet,
--   odul_dokumu, level_kazancim, trg_iletisim_engel.
--
-- TEST: cron ve realtime adımları dosyanın SONUNDA "TEST DIŞI" işaretli bölümdedir; SQL testi o
--   bölümü kesip ROLLBACK'li işlemde çalıştırır.

-- =====================================================================================
-- 1) AYARLAR (rakam koda gömülmez; fonksiyonlardaki varsayılanlar yalnız yedektir)
-- =====================================================================================
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('kasa_modu_acik',          '1'::jsonb,    'KASA modu (deneysel) açık mı: 1 açık, 0 kapalı — kapalıyken arama/davet sunucuda reddedilir (950).'),
  ('kasa_odul_acik',          '1'::jsonb,    'KASA ödülleri (coin, XP, lig, seri, görev, SP) açık mı: 1/0 (950).'),
  ('kasa_odul_carpani',       '1'::jsonb,    'KASA ödül çarpanı: Klasik ödül çarpanıyla çarpılır; 0 = ödülsüz (950).'),
  ('kasa_artis',              '2'::jsonb,    'TEST DEĞERİ — her soru sonrası kasaya eklenen (950).'),
  ('kasa_ikisi_dogru_artis',  '6'::jsonb,    'TEST DEĞERİ — ikisi de doğruysa kasaya eklenen TOPLAM (950).'),
  ('kasa_hedef_puan',         '20'::jsonb,   'TEST DEĞERİ — kazanma hedefi (950).'),
  ('kasa_max_tur',            '24'::jsonb,   'TEST DEĞERİ — tur üst sınırı (950).'),
  ('kasa_soru_sn',            '15'::jsonb,   'KASA soru süresi (sn) (950).'),
  ('kasa_karar_sn',           '8'::jsonb,    'KASA AÇ/DEVAM karar süresi (sn); dolarsa DEVAM (950).'),
  ('kasa_sonuc_sn',           '3'::jsonb,    'KASA soru sonu sonuç bandı süresi (sn) (950).'),
  ('kasa_gosterim_payi_ms',   '1500'::jsonb, 'KASA faz bitişine eklenen gösterim payı (ms) — Düello 325 deseni (950).'),
  ('kasa_cevap_tolerans_sn',  '1'::jsonb,    'KASA geç cevap toleransı (sn) (950).'),
  ('kasa_baglanma_sn',        '10'::jsonb,   'Aramayla kurulan KASA maçında rakip bu sürede gelmezse cezasız iptal (950).'),
  ('kasa_kopuk_sn',           '25'::jsonb,   'KASA: nabızsız bu kadar sn → kopuk, faz donar (950).'),
  ('kasa_kopuk_bekleme_sn',   '45'::jsonb,   'KASA: kopuk bu kadar sn sürerse terk sayılır (950).'),
  ('kasa_kopuk_taban_sn',     '3'::jsonb,    'KASA: kopukluktan dönüşte fazda kalan en az süre (sn) (950).'),
  ('kasa_zaman_asimi_dk',     '60'::jsonb,   'KASA: hareketsiz maç bu kadar dk sonra ödülsüz iptal (950).'),
  ('kasa_bot_esik_temkinli',  '4'::jsonb,    'TEST DEĞERİ — Temkinli bot kasa ≥ bu ise AÇ (950).'),
  ('kasa_bot_esik_dengeli',   '8'::jsonb,    'TEST DEĞERİ — Dengeli bot kasa ≥ bu ise AÇ (950).'),
  ('kasa_bot_esik_acgozlu',   '12'::jsonb,   'TEST DEĞERİ — Açgözlü bot kasa ≥ bu ise AÇ (950).'),
  ('kasa_bot_esik_sapma',     '2'::jsonb,    'TEST DEĞERİ — bot eşiğine her kararda −sapma / 0 / +sapma (950).'),
  ('kasa_bot_cevap_min_sn',   '2'::jsonb,    'KASA bot cevap süresi alt sınırı (sn) (950).'),
  ('kasa_bot_cevap_max_sn',   '6'::jsonb,    'KASA bot cevap süresi üst sınırı (sn) (950).'),
  ('kasa_bot_karar_min_sn',   '1'::jsonb,    'KASA bot karar süresi alt sınırı (sn) (950).'),
  ('kasa_bot_karar_max_sn',   '3'::jsonb,    'KASA bot karar süresi üst sınırı (sn) (950).')
on conflict (anahtar) do nothing;

-- =====================================================================================
-- 2) TABLOLAR
-- =====================================================================================
create table if not exists public.kasa_maclari (
  id uuid primary key default gen_random_uuid(),
  oyuncu1 uuid not null references public.profiles(id) on delete cascade,
  oyuncu2 uuid not null references public.profiles(id) on delete cascade,
  durum text not null default 'aktif' check (durum in ('aktif', 'bitti', 'iptal')),
  dereceli boolean not null default true,
  davetli boolean not null default false,          -- davet/antrenman (aramadan değil): bağlanma iptali yok
  faz text not null default 'baslangic' check (faz in ('baslangic', 'karar', 'cevap', 'sonuc')),
  faz_bitis timestamptz,
  tur int not null default 0,
  altin boolean not null default false,            -- Altın Soru aşaması
  kasa int not null default 0,
  sahip uuid,
  puan1 int not null default 0,
  puan2 int not null default 0,
  -- Maç başında sabitlenen kural değerleri (ayar değişse de süren maç etkilenmez; analiz için de kayıt)
  hedef int not null,
  max_tur int not null,
  artis int not null,
  ikisi_artis int not null,
  soru_sn int not null,
  karar_sn int not null,
  sonuc_sn int not null,
  -- Soru
  soru_ids uuid[] not null default '{}',
  kullanilan_sorular uuid[] not null default '{}',
  soru_id uuid,
  soru_baslangic timestamptz,
  karar_baslangic timestamptz,
  cevaplar jsonb not null default '{}'::jsonb,     -- {uid: {cevap, at}} — istemciye ham gitmez
  son_karar jsonb,                                 -- bu turun kararı {veren, ac, deger, sure_doldu, son}
  son_tur jsonb,                                   -- son çözümlenen soru (sonuç bandı)
  -- Bot (gizli alanlar)
  bot uuid,
  bot_tarz text check (bot_tarz in ('temkinli', 'dengeli', 'acgozlu')),
  bot_cevap smallint,
  bot_cevap_at timestamptz,
  bot_karar boolean,
  bot_karar_at timestamptz,
  -- Ayar denemesi kaydı
  acma_sayisi1 int not null default 0,
  acma_sayisi2 int not null default 0,
  acma_toplam1 int not null default 0,
  acma_toplam2 int not null default 0,
  sonuc_neden text check (sonuc_neden in ('hedef', 'tur_siniri', 'altin', 'terk', 'kopuk')),
  -- Bitiş / bağlantı
  kazanan uuid,
  terk_eden uuid,
  odul_carpan numeric,
  odul_acik boolean,
  giris1 timestamptz,
  giris2 timestamptz,
  baglanmayan uuid,
  kopuk_at timestamptz,
  kopuk_kalan interval,
  bitis timestamptz,
  son_hareket timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (oyuncu1 <> oyuncu2)
);
create index if not exists kasa_maclari_aktif_idx on public.kasa_maclari (durum) where durum = 'aktif';
create index if not exists kasa_maclari_o1_idx on public.kasa_maclari (oyuncu1, bitis);
create index if not exists kasa_maclari_o2_idx on public.kasa_maclari (oyuncu2, bitis);

-- Tur başına bir satır: karar + soru sonucu (ayar analizi)
create table if not exists public.kasa_hamleler (
  id bigserial primary key,
  kasa_id uuid not null references public.kasa_maclari(id) on delete cascade,
  tur int not null,
  altin boolean not null default false,
  soru_id uuid,
  kategori text,
  kasa_once int not null,
  sahip_once uuid,
  karar text check (karar in ('ac', 'devam', 'sure_doldu')),
  karar_veren uuid,
  karar_ms int,
  acilan_deger int,
  dogru1 boolean,
  dogru2 boolean,
  artis int,
  kasa_sonra int,
  sahip_sonra uuid,
  son_tasima int,                                  -- tur sınırında sahibe yazılan kasa
  puan1_sonra int,
  puan2_sonra int,
  created_at timestamptz not null default now(),
  unique (kasa_id, tur)
);

-- Oyuncu başına cevap (görev sayacı, XP "oynadı mı", istatistik)
create table if not exists public.kasa_cevaplari (
  id bigserial primary key,
  kasa_id uuid not null references public.kasa_maclari(id) on delete cascade,
  tur int not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  soru_id uuid,
  kategori text,
  cevap smallint,                                  -- null = yanıtsız
  dogru boolean not null default false,
  sure_ms int,
  created_at timestamptz not null default now(),
  unique (kasa_id, tur, user_id)
);
create index if not exists kasa_cevaplari_user_idx on public.kasa_cevaplari (user_id, created_at);

create table if not exists public.kasa_kuyrugu (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  dereceli boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.kasa_davetleri (
  id uuid primary key default gen_random_uuid(),
  kuran uuid not null references public.profiles(id) on delete cascade,
  rakip uuid not null references public.profiles(id) on delete cascade,
  dereceli boolean not null default true,
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'kabul', 'red', 'iptal')),
  kasa_id uuid references public.kasa_maclari(id) on delete set null,
  created_at timestamptz not null default now(),
  yanit_at timestamptz
);
create index if not exists kasa_davetleri_rakip_idx on public.kasa_davetleri (rakip, durum);

-- Realtime: yalnız sürüm numarası (sır yok); istemci değişince kasa_durum okur
create table if not exists public.kasa_sinyal (
  kasa_id uuid primary key references public.kasa_maclari(id) on delete cascade,
  oyuncu1 uuid not null,
  oyuncu2 uuid not null,
  surum bigint not null default 0,
  guncellendi timestamptz not null default now()
);

-- Güvenlik: ana tablolar yalnız RPC (politika yok); sinyal ve davet taraflara okunur
alter table public.kasa_maclari   enable row level security;
alter table public.kasa_hamleler  enable row level security;
alter table public.kasa_cevaplari enable row level security;
alter table public.kasa_kuyrugu   enable row level security;
alter table public.kasa_davetleri enable row level security;
alter table public.kasa_sinyal    enable row level security;
revoke all on public.kasa_maclari, public.kasa_hamleler, public.kasa_cevaplari, public.kasa_kuyrugu,
              public.kasa_davetleri, public.kasa_sinyal from anon, authenticated;
revoke all on sequence public.kasa_hamleler_id_seq, public.kasa_cevaplari_id_seq from anon, authenticated;

drop policy if exists kasa_sinyal_select_own on public.kasa_sinyal;
create policy kasa_sinyal_select_own on public.kasa_sinyal
  for select to authenticated using (auth.uid() in (oyuncu1, oyuncu2));
grant select on public.kasa_sinyal to authenticated;

drop policy if exists kasa_davetleri_select_own on public.kasa_davetleri;
create policy kasa_davetleri_select_own on public.kasa_davetleri
  for select to authenticated using (auth.uid() in (kuran, rakip));
grant select on public.kasa_davetleri to authenticated;

-- Engelleme (620): davet tablosuna mevcut tetikleyici (dal aşağıda trg_iletisim_engel'e eklenir)
drop trigger if exists trg_iletisim_engel on public.kasa_davetleri;
create trigger trg_iletisim_engel before insert on public.kasa_davetleri
  for each row execute function public.trg_iletisim_engel();

-- =====================================================================================
-- 3) İÇ YARDIMCILAR (istemciye kapalı)
-- =====================================================================================
create or replace function public.kasa_acik_mi()
returns boolean language sql stable security definer set search_path = public as $$
  select public.ayar_sayi('kasa_modu_acik', 1) >= 1;
$$;

create or replace function public.kasa_gosterim_payi()
returns interval language sql stable security definer set search_path = public as $$
  select make_interval(secs => greatest(0, public.ayar_sayi('kasa_gosterim_payi_ms', 1500)) / 1000.0);
$$;

create or replace function public.kasa_nabiz_sn()
returns int language sql stable security definer set search_path = public as $$
  -- duello_nabiz_sn kuralı: nabız, kopukluk eşiğinin yarısından kısa; en az 3 sn.
  select greatest(3, least(public.ayar_sayi('duello_nabiz_sn', 10),
                           floor(public.ayar_sayi('kasa_kopuk_sn', 25) / 2.0)))::int;
$$;

create or replace function public.kasa_sinyal_ver(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.kasa_sinyal set surum = surum + 1, guncellendi = now() where kasa_id = p_id;
$$;

create or replace function public.kasa_kopuk_kim(p_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select p.id
    from public.kasa_maclari k
    join public.profiles p on p.id in (k.oyuncu1, k.oyuncu2)
   where k.id = p_id and k.durum = 'aktif'
     and not coalesce(p.is_bot, false)
     and p.last_seen < now() - make_interval(secs => public.ayar_sayi('kasa_kopuk_sn', 25))
   order by p.last_seen
   limit 1;
$$;

-- Botun tarzı bot adından deterministik
create or replace function public.kasa_bot_tarz(p_bot uuid)
returns text language sql stable security definer set search_path = public as $$
  select (array['temkinli', 'dengeli', 'acgozlu'])[1 + mod(hashtext(coalesce(p.gorunen_ad, p.id::text))::bigint + 2147483648, 3)::int]
    from public.profiles p where p.id = p_bot;
$$;

-- Bot kararı (true = AÇ): tarz eşiği + {−sapma, 0, +sapma}; kasa hedefi getiriyorsa her zaman açar
create or replace function public.kasa_bot_karar(p_id uuid)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_esik int;
  v_puan int;
begin
  select * into k from public.kasa_maclari where id = p_id;
  if k.bot is null or k.sahip is distinct from k.bot then return false; end if;
  v_puan := case when k.bot = k.oyuncu1 then k.puan1 else k.puan2 end;
  if v_puan + k.kasa >= k.hedef then return true; end if;
  v_esik := public.ayar_sayi('kasa_bot_esik_' || coalesce(k.bot_tarz, 'dengeli'),
                             case k.bot_tarz when 'temkinli' then 4 when 'acgozlu' then 12 else 8 end)::int
            + (floor(random() * 3)::int - 1) * public.ayar_sayi('kasa_bot_esik_sapma', 2)::int;
  return k.kasa >= v_esik;
end $$;

-- Karışık soru yedeği (ön seçim tükenirse)
create or replace function public.kasa_soru_bul(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_s uuid;
begin
  select * into k from public.kasa_maclari where id = p_id;
  foreach v_s in array coalesce(public.soru_sec(null::text, 8, array[k.oyuncu1, k.oyuncu2]), '{}'::uuid[]) loop
    if not (v_s = any(k.kullanilan_sorular)) then return v_s; end if;
  end loop;
  select q.id into v_s from public.questions q
   where q.aktif and not (q.id = any(k.kullanilan_sorular))
     and (q.kapsam = 'global' or not public.soru_kapsam_evrensel_mi(array[k.oyuncu1, k.oyuncu2]))
   order by random() limit 1;
  return v_s;
end $$;

-- Altın Soru: Düello/Turnuva seçicisi (önce zorluk 4–5, boşsa alt dilim), maçta kullanılmamış
create or replace function public.kasa_altin_soru_bul(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_yeni uuid;
  v_aralik int[] := array[
    public.ayar_sayi('turnuva_altin_zorluk_min', 4)::int,  public.ayar_sayi('turnuva_altin_zorluk_max', 5)::int,
    public.ayar_sayi('turnuva_zorluk_dilim2_min', 3)::int, public.ayar_sayi('turnuva_zorluk_dilim2_max', 3)::int,
    public.ayar_sayi('turnuva_zorluk_dilim1_min', 1)::int, public.ayar_sayi('turnuva_zorluk_dilim1_max', 2)::int];
  v_i int;
begin
  select * into k from public.kasa_maclari where id = p_id;
  if public.soru_kapsam_evrensel_mi(array[k.oyuncu1, k.oyuncu2]) then
    perform set_config('app.soru_kapsam', 'evrensel', true);
  end if;
  for v_i in 0..2 loop
    v_yeni := (public.turnuva_soru_aday(1, k.kullanilan_sorular, v_aralik[v_i*2+1], v_aralik[v_i*2+2], 'tr'))[1];
    exit when v_yeni is not null;
  end loop;
  perform set_config('app.soru_kapsam', '', true);
  return coalesce(v_yeni, public.kasa_soru_bul(p_id));
end $$;

-- Maç kur (eşleşme, davet, antrenman ortak yolu)
create or replace function public.kasa_olustur(p_a uuid, p_b uuid, p_dereceli boolean, p_davetli boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_x uuid;
  v_bot uuid;
  v_max int := greatest(1, public.ayar_sayi('kasa_max_tur', 24)::int);
begin
  if not public.kasa_acik_mi() then raise exception 'Bu mod şu an kapalı'; end if;
  if random() < 0.5 then v_x := p_a; p_a := p_b; p_b := v_x; end if;
  select p.id into v_bot from public.profiles p where p.id in (p_a, p_b) and coalesce(p.is_bot, false) limit 1;

  insert into public.kasa_maclari (
    oyuncu1, oyuncu2, dereceli, davetli, faz, faz_bitis,
    hedef, max_tur, artis, ikisi_artis, soru_sn, karar_sn, sonuc_sn,
    soru_ids, bot, bot_tarz)
  values (
    p_a, p_b, coalesce(p_dereceli, true), coalesce(p_davetli, false), 'baslangic',
    -- Klasik 3-2-1 (651): ilk soru now + geri sayım + gösterim payı
    now() + make_interval(secs => public.ayar_sayi('mac_geri_sayim_sn', 3)
                                  + greatest(0, public.ayar_sayi('mac_geri_sayim_payi_ms', 2000)) / 1000.0),
    greatest(1, public.ayar_sayi('kasa_hedef_puan', 20)::int), v_max,
    greatest(0, public.ayar_sayi('kasa_artis', 2)::int),
    greatest(0, public.ayar_sayi('kasa_ikisi_dogru_artis', 6)::int),
    greatest(5, public.ayar_sayi('kasa_soru_sn', 15)::int),
    greatest(3, public.ayar_sayi('kasa_karar_sn', 8)::int),
    greatest(1, public.ayar_sayi('kasa_sonuc_sn', 3)::int),
    coalesce(public.soru_sec(null::text, v_max + 2, array[p_a, p_b]), '{}'::uuid[]),
    v_bot, case when v_bot is not null then public.kasa_bot_tarz(v_bot) end)
  returning id into v_id;

  insert into public.kasa_sinyal (kasa_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.kasa_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $$;

-- Soruyu aç (normal tur ya da Altın Soru); bot cevabı ve zamanı burada, gizli alana
create or replace function public.kasa_soru_ac(p_id uuid, p_soru uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_soru uuid := p_soru;
  v_kat text;
  v_dogru smallint;
  v_bot_cevap smallint;
  v_gecikme numeric;
  v_min numeric := public.ayar_ondalik('kasa_bot_cevap_min_sn', 2);
  v_max numeric := public.ayar_ondalik('kasa_bot_cevap_max_sn', 6);
begin
  select * into k from public.kasa_maclari where id = p_id;
  if v_soru is null and not k.altin and k.tur between 1 and coalesce(array_length(k.soru_ids, 1), 0) then
    v_soru := k.soru_ids[k.tur];
    if v_soru = any(k.kullanilan_sorular) then v_soru := null; end if;
  end if;
  if v_soru is null then v_soru := public.kasa_soru_bul(p_id); end if;
  if v_soru is null then
    -- Havuz tamamen boş: ödülsüz iptal (asılı kalmasın)
    update public.kasa_maclari set durum = 'iptal', bitis = now(), son_hareket = now() where id = p_id;
    return;
  end if;
  select q.kategori, q.dogru_cevap into v_kat, v_dogru from public.questions q where q.id = v_soru;

  if k.bot is not null then
    if random() < public.bot_soru_isabet(k.bot, v_kat, v_soru) then
      v_bot_cevap := v_dogru;
    else
      select x into v_bot_cevap from generate_series(0, 3) x where x <> v_dogru order by random() limit 1;
    end if;
    v_gecikme := least(v_min + (greatest(v_max, v_min) - v_min) * random()::numeric, k.soru_sn - 1);
  end if;

  update public.kasa_maclari
     set soru_id = v_soru,
         kullanilan_sorular = array_append(kullanilan_sorular, v_soru),
         faz = 'cevap',
         soru_baslangic = now(),
         faz_bitis = now() + make_interval(secs => k.soru_sn) + public.kasa_gosterim_payi(),
         cevaplar = '{}'::jsonb,
         bot_cevap = v_bot_cevap,
         bot_cevap_at = case when k.bot is not null
                             then now() + public.kasa_gosterim_payi() + make_interval(secs => v_gecikme) end,
         son_hareket = now()
   where id = p_id;
  update public.kasa_hamleler set soru_id = v_soru, kategori = v_kat where kasa_id = p_id and tur = k.tur;
end $$;

-- Yeni tur: sahip varsa önce karar fazı, yoksa doğrudan soru
create or replace function public.kasa_tur_baslat(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_min numeric := public.ayar_ondalik('kasa_bot_karar_min_sn', 1);
  v_max numeric := public.ayar_ondalik('kasa_bot_karar_max_sn', 3);
begin
  select * into k from public.kasa_maclari where id = p_id;
  update public.kasa_maclari
     set tur = tur + 1, son_karar = null, son_tur = null, cevaplar = '{}'::jsonb,
         bot_karar = null, bot_karar_at = null, son_hareket = now()
   where id = p_id;
  insert into public.kasa_hamleler (kasa_id, tur, altin, kasa_once, sahip_once)
  values (p_id, k.tur + 1, false, k.kasa, k.sahip)
  on conflict (kasa_id, tur) do nothing;

  if k.sahip is not null and k.kasa > 0 then
    update public.kasa_maclari
       set faz = 'karar', karar_baslangic = now(),
           faz_bitis = now() + make_interval(secs => k.karar_sn) + public.kasa_gosterim_payi()
     where id = p_id;
    if k.sahip = k.bot then
      update public.kasa_maclari
         set bot_karar = public.kasa_bot_karar(p_id),
             bot_karar_at = now() + public.kasa_gosterim_payi()
                            + make_interval(secs => v_min + (greatest(v_max, v_min) - v_min) * random()::numeric)
       where id = p_id;
    end if;
  else
    perform public.kasa_soru_ac(p_id);
  end if;
end $$;

-- =====================================================================================
-- 4) ÖDÜL — Klasik ile aynı yardımcılar (duello_bitir / mac_sonuclandir sırası)
-- =====================================================================================
create or replace function public.kasa_bitir(p_id uuid, p_kazanan uuid, p_neden text)
returns void language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_bot_var boolean;
  v_acik_bot boolean;
  v_carpan numeric := 1;
  v_odul numeric;
  v_lig int;
  v_kazanan_bot boolean;
  v_oyuncu uuid;
  v_terk uuid;
begin
  select * into k from public.kasa_maclari where id = p_id for update;
  if not found or k.durum <> 'aktif' then return; end if;
  perform public.odul_baglam('kasa:' || p_id::text);

  -- Terk (460): kasa_terk önceden yazar; kopukluk süresi dolan burada bulunur. Terk eden kazanamaz.
  v_terk := k.terk_eden;
  if v_terk is null and k.kopuk_at is not null
     and k.kopuk_at < now() - make_interval(secs => public.ayar_sayi('kasa_kopuk_bekleme_sn', 45)) then
    v_terk := public.kasa_kopuk_kim(p_id);
  end if;
  if v_terk is not distinct from p_kazanan then v_terk := null; end if;

  select bool_or(coalesce(p.is_bot, false)),
         bool_or(coalesce(p.is_bot, false) and coalesce(p.bot_turu, 'acik') = 'acik')
    into v_bot_var, v_acik_bot
    from public.profiles p where p.id in (k.oyuncu1, k.oyuncu2);

  -- Aynı çift günlük sınırı + aynı cihaz/IP (Klasik gibi; botla maçta uygulanmaz)
  if not coalesce(v_bot_var, false) then
    v_carpan := public.cift_odul_carpani(k.oyuncu1, k.oyuncu2, p_id);
  end if;
  -- KASA ek çarpanı: tek ayarla ödüller kapatılabilir
  v_odul := case when public.ayar_sayi('kasa_odul_acik', 1) >= 1
                 then greatest(0, public.ayar_ondalik('kasa_odul_carpani', 1)) else 0 end;
  v_carpan := v_carpan * v_odul;

  update public.kasa_maclari
     set durum = 'bitti', kazanan = p_kazanan, bitis = now(), odul_carpan = v_carpan,
         odul_acik = v_odul > 0, terk_eden = v_terk, son_hareket = now(),
         sonuc_neden = coalesce(p_neden, case when v_terk is not null then 'terk' end)
   where id = p_id;

  -- Coin: Klasik değerleri (coin_mac_*), serbest/açık bot/çift indirimi "en düşüğü" kuralıyla
  perform public.coin_mac_odulu('kasa:' || p_id::text, p_kazanan, array[k.oyuncu1, k.oyuncu2],
                                v_carpan, not k.dereceli, coalesce(v_acik_bot, false));
  -- XP: Klasik değerleri (xp_mac_*); terk edene yok
  perform public.xp_mac_odulu('kasa:' || p_id::text, 'kasa', p_kazanan,
                              array_remove(array[k.oyuncu1, k.oyuncu2], v_terk),
                              v_carpan, coalesce(v_acik_bot, false));

  foreach v_oyuncu in array array[k.oyuncu1, k.oyuncu2] loop
    -- Günlük seri yalnız ödüllü maçta ve terk etmeyende ilerler
    perform public.mac_sayaci_arttir(v_oyuncu, v_oyuncu is distinct from v_terk and v_odul > 0);
    perform public.istatistikli_mac_arttir(v_oyuncu);
  end loop;

  -- Rozet: yalnız genel rozetler (Ida, 3 Eki 2026) — ilk galibiyet + 10 galibiyet
  if p_kazanan is not null and v_carpan > 0 then
    perform public.award_badge(p_kazanan, 'ilk_galibiyet');
    if (select count(*) from public.matches where kazanan = p_kazanan and durum = 'bitti')
       + (select count(*) from public.kasa_maclari where kazanan = p_kazanan and durum = 'bitti') >= 10 then
      perform public.award_badge(p_kazanan, 'mac_10');
    end if;
  end if;

  -- Lig puanı: yalnız Dereceli, Klasik değerleri (lig_mac_galibiyet / lig_mac_beraberlik)
  if k.dereceli then
    if p_kazanan is not null then
      select coalesce(is_bot, false) into v_kazanan_bot from public.profiles where id = p_kazanan;
      v_lig := floor(public.ayar_sayi('lig_mac_galibiyet', 25) * v_carpan *
                     (case when v_kazanan_bot then public.ayar_sayi('lig_bot_puan_yuzde', 40)::numeric / 100 else 1 end))::int;
      if v_lig > 0 then
        update public.profiles set puan = puan + v_lig, puan_hafta = puan_hafta + v_lig where id = p_kazanan;
      end if;
      perform public.odul_kalem_yaz(p_kazanan, 'galibiyet', greatest(v_lig, 0), 0, public.odul_lig_indirimi(v_carpan));
    elsif v_terk is null then
      foreach v_oyuncu in array array[k.oyuncu1, k.oyuncu2] loop
        v_lig := floor(public.ayar_sayi('lig_mac_beraberlik', 10) * v_carpan)::int;
        if v_lig > 0 and not exists (select 1 from public.profiles where id = v_oyuncu and coalesce(is_bot, false)) then
          update public.profiles set puan = puan + v_lig, puan_hafta = puan_hafta + v_lig where id = v_oyuncu;
        end if;
        perform public.odul_kalem_yaz(v_oyuncu, 'beraberlik', greatest(v_lig, 0), 0, public.odul_lig_indirimi(v_carpan));
      end loop;
    end if;
    if v_odul > 0 then
      foreach v_oyuncu in array array[k.oyuncu1, k.oyuncu2] loop
        continue when v_oyuncu is not distinct from v_terk;
        perform public.gunluk_seri_bonusu(v_oyuncu);
      end loop;
    end if;
  end if;

  perform public.odul_baglam(null);
  perform public.kasa_sinyal_ver(p_id);
end $$;

-- Sezon Puanı (720 deseni): bitişte iki oyuncuya, terk edene yok; çarpan 0 ise sezon_mac_sp vermez
create or replace function public.trg_sezon_kasa()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.durum = 'bitti' and old.durum is distinct from 'bitti' then
    begin
      if new.terk_eden is distinct from new.oyuncu1 then
        perform public.sezon_mac_sp('kasa', 'kasa:' || new.id, new.oyuncu1, new.oyuncu2, new.kazanan, new.odul_carpan);
      end if;
      if new.terk_eden is distinct from new.oyuncu2 then
        perform public.sezon_mac_sp('kasa', 'kasa:' || new.id, new.oyuncu2, new.oyuncu1, new.kazanan, new.odul_carpan);
      end if;
    exception when others then
      raise warning 'sezon_kasa_sp: %', sqlerrm;
    end;
  end if;
  return null;
end $$;
drop trigger if exists trg_sezon_kasa on public.kasa_maclari;
create trigger trg_sezon_kasa after update of durum on public.kasa_maclari
  for each row execute function public.trg_sezon_kasa();

-- =====================================================================================
-- 5) DURUM MAKİNESİ
-- =====================================================================================
-- Karar uygula (insan RPC'si, bot ya da süre dolumu)
create or replace function public.kasa_karar_uygula(p_id uuid, p_ac boolean, p_sure_doldu boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_p1 int; v_p2 int;
  v_ms int;
begin
  select * into k from public.kasa_maclari where id = p_id;
  if k.durum <> 'aktif' or k.faz <> 'karar' or k.sahip is null then return; end if;
  v_ms := greatest(0, round(extract(epoch from (now() - coalesce(k.karar_baslangic, now()) - public.kasa_gosterim_payi())) * 1000))::int;

  if coalesce(p_ac, false) then
    v_p1 := k.puan1 + case when k.sahip = k.oyuncu1 then k.kasa else 0 end;
    v_p2 := k.puan2 + case when k.sahip = k.oyuncu2 then k.kasa else 0 end;
    update public.kasa_maclari
       set puan1 = v_p1, puan2 = v_p2,
           acma_sayisi1 = acma_sayisi1 + (k.sahip = k.oyuncu1)::int,
           acma_sayisi2 = acma_sayisi2 + (k.sahip = k.oyuncu2)::int,
           acma_toplam1 = acma_toplam1 + case when k.sahip = k.oyuncu1 then k.kasa else 0 end,
           acma_toplam2 = acma_toplam2 + case when k.sahip = k.oyuncu2 then k.kasa else 0 end,
           kasa = 0, sahip = null,
           son_karar = jsonb_build_object('veren', k.sahip, 'ac', true, 'deger', k.kasa),
           son_hareket = now()
     where id = p_id;
    update public.kasa_hamleler
       set karar = 'ac', karar_veren = k.sahip, karar_ms = v_ms, acilan_deger = k.kasa,
           puan1_sonra = v_p1, puan2_sonra = v_p2
     where kasa_id = p_id and tur = k.tur;
    -- AÇ sonrası hedef kontrolü
    if (case when k.sahip = k.oyuncu1 then v_p1 else v_p2 end) >= k.hedef then
      perform public.kasa_bitir(p_id, k.sahip, 'hedef');
      return;
    end if;
  else
    update public.kasa_maclari
       set son_karar = jsonb_build_object('veren', k.sahip, 'ac', false, 'deger', k.kasa,
                                          'sure_doldu', coalesce(p_sure_doldu, false)),
           son_hareket = now()
     where id = p_id;
    update public.kasa_hamleler
       set karar = case when p_sure_doldu then 'sure_doldu' else 'devam' end,
           karar_veren = k.sahip, karar_ms = v_ms
     where kasa_id = p_id and tur = k.tur;
  end if;
  perform public.kasa_soru_ac(p_id);
end $$;

-- Soruyu çözümle: kasa, sahiplik, sonuç bandı
create or replace function public.kasa_cozumle(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_dogru smallint;
  v_kat text;
  v_c1 smallint; v_c2 smallint;
  v_d1 boolean; v_d2 boolean;
  v_artis int := 0;
  v_kasa int;
  v_sahip uuid;
  v_kazanan uuid;
  v_oy uuid; v_c smallint; v_d boolean; v_at timestamptz;
begin
  select * into k from public.kasa_maclari where id = p_id;
  if k.durum <> 'aktif' or k.faz <> 'cevap' then return; end if;
  select q.dogru_cevap, q.kategori into v_dogru, v_kat from public.questions q where q.id = k.soru_id;
  v_c1 := (k.cevaplar -> k.oyuncu1::text ->> 'cevap')::smallint;
  v_c2 := (k.cevaplar -> k.oyuncu2::text ->> 'cevap')::smallint;
  v_d1 := v_c1 is not null and v_c1 = v_dogru;
  v_d2 := v_c2 is not null and v_c2 = v_dogru;

  -- Oyuncu cevapları (yanıtsız da yazılır: cevap null, yanlış)
  foreach v_oy in array array[k.oyuncu1, k.oyuncu2] loop
    v_c := case when v_oy = k.oyuncu1 then v_c1 else v_c2 end;
    v_d := case when v_oy = k.oyuncu1 then v_d1 else v_d2 end;
    v_at := (k.cevaplar -> v_oy::text ->> 'at')::timestamptz;
    insert into public.kasa_cevaplari (kasa_id, tur, user_id, soru_id, kategori, cevap, dogru, sure_ms)
    values (p_id, k.tur, v_oy, k.soru_id, v_kat, v_c, v_d,
            case when v_at is not null then greatest(0, round(extract(epoch from
                 (v_at - k.soru_baslangic - public.kasa_gosterim_payi())) * 1000))::int end)
    on conflict (kasa_id, tur, user_id) do nothing;
    if v_c is not null then
      perform public.kategori_istatistik_yaz(v_oy, v_kat, v_d);
    end if;
  end loop;

  if k.altin then
    v_kasa := k.kasa; v_sahip := k.sahip;
    v_kazanan := case when v_d1 and not v_d2 then k.oyuncu1 when v_d2 and not v_d1 then k.oyuncu2 end;
  else
    v_artis := case when v_d1 and v_d2 then k.ikisi_artis else k.artis end;
    v_kasa := k.kasa + v_artis;
    v_sahip := case when v_d1 and not v_d2 then k.oyuncu1
                    when v_d2 and not v_d1 then k.oyuncu2
                    else k.sahip end;
  end if;

  update public.kasa_maclari
     set faz = 'sonuc',
         faz_bitis = now() + make_interval(secs => k.sonuc_sn),
         kasa = v_kasa, sahip = v_sahip,
         son_tur = jsonb_build_object(
           'tur', k.tur, 'altin', k.altin, 'dogru_cevap', v_dogru,
           'dogru', jsonb_build_object(k.oyuncu1::text, v_d1, k.oyuncu2::text, v_d2),
           'artis', v_artis, 'kasa_once', k.kasa, 'kasa_sonra', v_kasa,
           'sahip_once', k.sahip, 'sahip_sonra', v_sahip, 'kazanan', v_kazanan),
         son_hareket = now()
   where id = p_id;
  update public.kasa_hamleler
     set dogru1 = v_d1, dogru2 = v_d2, artis = v_artis, kasa_sonra = v_kasa, sahip_sonra = v_sahip,
         puan1_sonra = k.puan1, puan2_sonra = k.puan2, soru_id = k.soru_id, kategori = v_kat
   where kasa_id = p_id and tur = k.tur;
end $$;

-- Altın Soru aç (eşitlik)
create or replace function public.kasa_altin_ac(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
begin
  select * into k from public.kasa_maclari where id = p_id;
  update public.kasa_maclari
     set altin = true, tur = tur + 1, son_karar = null, son_tur = null, sahip = null, kasa = 0,
         bot_karar = null, bot_karar_at = null, son_hareket = now()
   where id = p_id;
  insert into public.kasa_hamleler (kasa_id, tur, altin, kasa_once, sahip_once)
  values (p_id, k.tur + 1, true, 0, null)
  on conflict (kasa_id, tur) do nothing;
  perform public.kasa_soru_ac(p_id, public.kasa_altin_soru_bul(p_id));
end $$;

-- Sonuç fazı bitti: sonraki tur / tur sınırı / Altın Soru
create or replace function public.kasa_sonraki(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_p1 int; v_p2 int;
  v_w uuid;
begin
  select * into k from public.kasa_maclari where id = p_id;
  if k.durum <> 'aktif' or k.faz <> 'sonuc' then return; end if;

  if k.altin then
    v_w := (k.son_tur ->> 'kazanan')::uuid;
    if v_w is not null then
      perform public.kasa_bitir(p_id, v_w, 'altin');
    else
      perform public.kasa_altin_ac(p_id);
    end if;
    return;
  end if;

  if k.tur >= k.max_tur then
    -- Tur sınırı: sahip kasayı alır, çok puanlı kazanır; eşitse Altın Soru (jokersiz)
    v_p1 := k.puan1 + case when k.sahip = k.oyuncu1 then k.kasa else 0 end;
    v_p2 := k.puan2 + case when k.sahip = k.oyuncu2 then k.kasa else 0 end;
    update public.kasa_maclari
       set puan1 = v_p1, puan2 = v_p2, kasa = 0, sahip = null,
           son_karar = case when k.sahip is not null
                            then jsonb_build_object('veren', k.sahip, 'ac', true, 'deger', k.kasa, 'son', true) end,
           son_hareket = now()
     where id = p_id;
    update public.kasa_hamleler
       set son_tasima = case when k.sahip is not null then k.kasa end, puan1_sonra = v_p1, puan2_sonra = v_p2
     where kasa_id = p_id and tur = k.tur;
    if v_p1 > v_p2 then
      perform public.kasa_bitir(p_id, k.oyuncu1, 'tur_siniri');
    elsif v_p2 > v_p1 then
      perform public.kasa_bitir(p_id, k.oyuncu2, 'tur_siniri');
    else
      perform public.kasa_altin_ac(p_id);
    end if;
    return;
  end if;

  perform public.kasa_tur_baslat(p_id);
end $$;

-- İdempotent ilerletme (her okuma/eylem + cron). Botun karar ve cevabını zamanı gelince uygular.
create or replace function public.kasa_ilerlet(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_adim int := 0;
  v_kopuk uuid;
  v_tol interval := make_interval(secs => public.ayar_sayi('kasa_cevap_tolerans_sn', 1));
  v_taban interval := make_interval(secs => public.ayar_sayi('kasa_kopuk_taban_sn', 3));
  v_kayma interval;
begin
  select * into k from public.kasa_maclari where id = p_id for update;
  if not found or k.durum <> 'aktif' then return; end if;

  -- ---------- KOPUKLUK KAPISI (Düello 760 deseni: faz donar, bekleme dolunca terk) ----------
  v_kopuk := public.kasa_kopuk_kim(p_id);
  if v_kopuk is not null then
    if k.kopuk_at is null then
      update public.kasa_maclari
         set kopuk_at = now(), kopuk_kalan = greatest(coalesce(k.faz_bitis, now()) - now(), v_taban)
       where id = p_id;
      perform public.kasa_sinyal_ver(p_id);
      select * into k from public.kasa_maclari where id = p_id;
    end if;
    if k.kopuk_at < now() - make_interval(secs => public.ayar_sayi('kasa_kopuk_bekleme_sn', 45)) then
      perform public.kasa_bitir(p_id, case when v_kopuk = k.oyuncu1 then k.oyuncu2 else k.oyuncu1 end, 'kopuk');
      return;
    end if;
    update public.kasa_maclari
       set faz_bitis = now() + greatest(coalesce(k.kopuk_kalan, v_taban), v_taban)
     where id = p_id;
    return;
  end if;
  if k.kopuk_at is not null then
    v_kayma := now() - k.kopuk_at;
    update public.kasa_maclari
       set kopuk_at = null, kopuk_kalan = null,
           faz_bitis = now() + greatest(coalesce(k.kopuk_kalan, v_taban), v_taban),
           bot_cevap_at = bot_cevap_at + v_kayma,
           bot_karar_at = bot_karar_at + v_kayma,
           son_hareket = now()
     where id = p_id;
    perform public.kasa_sinyal_ver(p_id);
  end if;
  -- ---------- /KOPUKLUK KAPISI ----------

  loop
    v_adim := v_adim + 1;
    exit when v_adim > 12;
    select * into k from public.kasa_maclari where id = p_id;
    exit when not found or k.durum <> 'aktif';

    if k.son_hareket < now() - make_interval(mins => public.ayar_sayi('kasa_zaman_asimi_dk', 60)::int) then
      update public.kasa_maclari set durum = 'iptal', bitis = now() where id = p_id;
      perform public.kasa_sinyal_ver(p_id);
      exit;
    end if;

    if k.faz = 'baslangic' then
      exit when now() < k.faz_bitis;
      perform public.kasa_tur_baslat(p_id);
    elsif k.faz = 'karar' then
      if k.bot is not null and k.sahip = k.bot and k.bot_karar_at is not null and now() >= k.bot_karar_at then
        perform public.kasa_karar_uygula(p_id, coalesce(k.bot_karar, false), false);
      elsif now() >= k.faz_bitis then
        perform public.kasa_karar_uygula(p_id, false, true);   -- süre doldu → DEVAM
      else
        exit;
      end if;
    elsif k.faz = 'cevap' then
      if k.bot is not null and not (k.cevaplar ? k.bot::text) and k.bot_cevap_at is not null
         and now() >= k.bot_cevap_at then
        update public.kasa_maclari
           set cevaplar = cevaplar || jsonb_build_object(k.bot::text,
                            jsonb_build_object('cevap', k.bot_cevap, 'at', k.bot_cevap_at))
         where id = p_id;
        select * into k from public.kasa_maclari where id = p_id;
      end if;
      exit when not ((k.cevaplar ? k.oyuncu1::text) or now() > k.faz_bitis + v_tol)
             or not ((k.cevaplar ? k.oyuncu2::text) or now() > k.faz_bitis + v_tol);
      perform public.kasa_cozumle(p_id);
    elsif k.faz = 'sonuc' then
      exit when now() < k.faz_bitis;
      perform public.kasa_sonraki(p_id);
    else
      exit;
    end if;
    perform public.kasa_sinyal_ver(p_id);
  end loop;
end $$;

-- Kilit + üyelik + ilk geliş + nabız + tembel ilerletme (duello_kilitle deseni)
create or replace function public.kasa_kilitle(p_id uuid)
returns public.kasa_maclari language plpgsql security definer set search_path = public as $$
declare k public.kasa_maclari%rowtype;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  select * into k from public.kasa_maclari where id = p_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if auth.uid() not in (k.oyuncu1, k.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
  if k.oyuncu1 = auth.uid() and k.giris1 is null then
    update public.kasa_maclari set giris1 = now() where id = p_id;
  elsif k.oyuncu2 = auth.uid() and k.giris2 is null then
    update public.kasa_maclari set giris2 = now() where id = p_id;
  end if;
  update public.profiles set last_seen = now()
   where id = auth.uid() and (last_seen is null or last_seen < now() - interval '5 seconds');
  perform public.kasa_ilerlet(p_id);
  select * into k from public.kasa_maclari where id = p_id;
  return k;
end $$;

-- Cron emniyet ağı: aktif maç yoksa hemen çıkar
create or replace function public.kasa_tik_hepsi()
returns int language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_n int := 0;
begin
  if not pg_try_advisory_xact_lock(hashtext('kasa_tik_hepsi')) then return 0; end if;
  for r in select x.id from public.kasa_maclari x where x.durum = 'aktif' loop
    begin
      perform 1 from public.kasa_maclari where id = r.id for update skip locked;
      if not found then continue; end if;
      perform public.kasa_ilerlet(r.id);
      v_n := v_n + 1;
    exception when others then
      raise warning 'kasa_tik_hepsi %: %', r.id, sqlerrm;
      begin
        update public.kasa_maclari
           set durum = 'iptal', bitis = now(), son_hareket = now()
         where id = r.id and durum = 'aktif'
           and coalesce(faz_bitis, son_hareket) < now() - interval '60 seconds';
        if found then perform public.kasa_sinyal_ver(r.id); end if;
      exception when others then
        raise warning 'kasa_tik_hepsi % iptal edilemedi: %', r.id, sqlerrm;
      end;
    end;
  end loop;
  return v_n;
end $$;

-- =====================================================================================
-- 6) İSTEMCİ RPC'LERİ (yalnız authenticated)
-- =====================================================================================
create or replace function public.kasa_ara(p_dereceli boolean default true)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_lig int;
  v_rakip uuid;
  v_bas timestamptz;
  v_bot uuid;
begin
  perform public.hiz_siniri('kasa_ara', 90, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if not public.kasa_acik_mi() then raise exception 'Bu mod şu an kapalı'; end if;

  select x.id into v_id from public.kasa_maclari x
   where x.durum = 'aktif' and v_me in (x.oyuncu1, x.oyuncu2) limit 1;
  if found then
    delete from public.kasa_kuyrugu where user_id = v_me;
    return v_id;
  end if;

  delete from public.kasa_kuyrugu where created_at < now() - interval '90 seconds';
  select public.lig_sirasi(coalesce(lig, 'bronz')) into v_lig from public.profiles where id = v_me;
  v_lig := coalesce(v_lig, 1);

  select q.user_id into v_rakip
    from public.kasa_kuyrugu q
    join public.profiles pr on pr.id = q.user_id
   where q.user_id <> v_me
     and not public.iletisim_engelli(v_me, q.user_id)
     and q.dereceli = coalesce(p_dereceli, true)
     and public.lig_sirasi(coalesce(pr.lig, 'bronz')) between v_lig - 1 and v_lig + 1
   order by q.created_at
   limit 1
   for update of q skip locked;

  if v_rakip is not null then
    perform public.mac_kotasi_kontrol();
    return public.kasa_olustur(v_rakip, v_me, p_dereceli, false);
  end if;

  select q.created_at into v_bas from public.kasa_kuyrugu q where q.user_id = v_me;
  if v_bas is null then
    insert into public.kasa_kuyrugu (user_id, dereceli) values (v_me, coalesce(p_dereceli, true))
    on conflict (user_id) do update set dereceli = excluded.dereceli, created_at = now();
    return null;
  end if;
  update public.kasa_kuyrugu set dereceli = coalesce(p_dereceli, true) where user_id = v_me;

  -- 370: kimse yoksa aramaya özgü rastgele sürede gizli bot (lig ± 1)
  if not public.eslesme_bot_hazir(v_me, v_bas, 0.5) then return null; end if;
  v_bot := public.bot_sec(v_me);
  if v_bot is null then raise exception 'Şu an uygun rakip yok, birazdan tekrar dene.'; end if;
  perform public.mac_kotasi_kontrol();
  perform public.bot_kisilik_tohumla(v_bot);
  return public.kasa_olustur(v_me, v_bot, p_dereceli, false);
end $$;

create or replace function public.kasa_aramadan_cik()
returns void language sql security definer set search_path = public as $$
  delete from public.kasa_kuyrugu where user_id = auth.uid();
$$;

create or replace function public.kasa_aktif_benim()
returns table(id uuid, oyuncu1 uuid, oyuncu2 uuid, tur int)
language sql stable security definer set search_path = public as $$
  select k.id, k.oyuncu1, k.oyuncu2, k.tur
    from public.kasa_maclari k
   where k.durum = 'aktif' and auth.uid() in (k.oyuncu1, k.oyuncu2)
   order by k.created_at desc
   limit 5;
$$;

-- Aramayla kurulan maçta rakip hiç gelmezse cezasız iptal (duello_giris deseni)
create or replace function public.kasa_giris(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_me uuid := auth.uid();
  v_ben_p1 boolean;
  v_rakip uuid;
  v_rakip_bot boolean;
  v_rakip_giris timestamptz;
  v_sure numeric := public.ayar_ondalik('kasa_baglanma_sn', 10);
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('kasa_giris', 90, interval '60 seconds');
  select * into k from public.kasa_maclari where id = p_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if v_me not in (k.oyuncu1, k.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;

  v_ben_p1 := (k.oyuncu1 = v_me);
  v_rakip := case when v_ben_p1 then k.oyuncu2 else k.oyuncu1 end;
  select coalesce(is_bot, false) into v_rakip_bot from public.profiles where id = v_rakip;
  if v_ben_p1 then
    update public.kasa_maclari set giris1 = now() where id = p_id and giris1 is null;
  else
    update public.kasa_maclari set giris2 = now() where id = p_id and giris2 is null;
  end if;
  v_rakip_giris := case when v_ben_p1 then k.giris2 else k.giris1 end;

  if k.durum = 'aktif' and not coalesce(v_rakip_bot, false) and v_rakip_giris is null
     and not k.davetli and now() >= k.created_at + make_interval(secs => v_sure) then
    update public.kasa_maclari
       set durum = 'iptal', kazanan = null, bitis = now(), baglanmayan = v_rakip
     where id = p_id;
    perform public.kasa_sinyal_ver(p_id);
    return jsonb_build_object('durum', 'iptal', 'rakip_geldi', false, 'kalan_sn', 0, 'baglanmayan', v_rakip);
  end if;

  return jsonb_build_object(
    'durum', k.durum,
    'rakip_geldi', coalesce(v_rakip_bot, false) or v_rakip_giris is not null or k.davetli,
    'kalan_sn', greatest(0, ceil(v_sure - extract(epoch from (now() - k.created_at))))::int,
    'baglanmayan', k.baglanmayan);
end $$;

create or replace function public.kasa_durum(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_me uuid := auth.uid();
  v_rakip uuid;
  v_dil text := public.oyuncu_dili();
  v_soru jsonb;
  v_sonuc jsonb;
  v_gecmis jsonb;
  v_kopuk uuid;
  v_payi interval := public.kasa_gosterim_payi();
begin
  perform public.hiz_siniri('kasa_durum', 400, interval '60 seconds');
  k := public.kasa_kilitle(p_id);
  v_rakip := case when k.oyuncu1 = v_me then k.oyuncu2 else k.oyuncu1 end;

  if k.soru_id is not null and (k.faz in ('cevap', 'sonuc') or k.durum <> 'aktif') then
    select jsonb_build_object('soru', sd.soru, 'secenekler', sd.secenekler, 'kategori', sd.kategori)
      into v_soru from public.soru_dilinde(k.soru_id, v_dil) sd;
  end if;

  -- Sonuç bandı: soru çözümlendikten SONRA (doğru cevap ancak burada)
  if k.faz = 'sonuc' and k.son_tur is not null then
    v_sonuc := k.son_tur || jsonb_build_object(
      'benim_cevabim', k.cevaplar -> v_me::text -> 'cevap',
      'ben_dogru', coalesce((k.son_tur -> 'dogru' ->> v_me::text)::boolean, false),
      'rakip_dogru', coalesce((k.son_tur -> 'dogru' ->> v_rakip::text)::boolean, false));
    v_sonuc := v_sonuc - 'dogru';
  end if;

  if k.durum <> 'aktif' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'tur', h.tur, 'altin', h.altin, 'kategori', h.kategori,
             'soru', sd.soru, 'secenekler', sd.secenekler, 'dogru_cevap', q.dogru_cevap,
             'benim_cevabim', cb.cevap, 'ben_dogru', coalesce(cb.dogru, false),
             'rakip_dogru', coalesce(cr.dogru, false),
             'karar', h.karar, 'karar_ben', h.karar_veren = v_me, 'acilan_deger', h.acilan_deger,
             'kasa_sonra', h.kasa_sonra) order by h.tur), '[]'::jsonb)
      into v_gecmis
      from public.kasa_hamleler h
      left join public.questions q on q.id = h.soru_id
      left join public.kasa_cevaplari cb on cb.kasa_id = h.kasa_id and cb.tur = h.tur and cb.user_id = v_me
      left join public.kasa_cevaplari cr on cr.kasa_id = h.kasa_id and cr.tur = h.tur and cr.user_id = v_rakip
      left join lateral public.soru_dilinde(h.soru_id, v_dil) sd on h.soru_id is not null
     where h.kasa_id = p_id;
  end if;

  if k.durum = 'aktif' and k.kopuk_at is not null then
    v_kopuk := public.kasa_kopuk_kim(p_id);
  end if;

  return jsonb_build_object(
    'id', k.id, 'durum', k.durum, 'dereceli', k.dereceli,
    'faz', k.faz, 'faz_bitis', k.faz_bitis, 'sunucu_zamani', clock_timestamp(),
    'ben', v_me, 'tur', k.tur, 'max_tur', k.max_tur, 'hedef', k.hedef, 'altin', k.altin,
    'artis', k.artis, 'ikisi_artis', k.ikisi_artis,
    'kasa', k.kasa, 'sahip', k.sahip,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'unvan', public.oyuncu_unvani(p.id), 'puan', k.puan1, 'acma', k.acma_sayisi1)
         from public.profiles p where p.id = k.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'unvan', public.oyuncu_unvani(p.id), 'puan', k.puan2, 'acma', k.acma_sayisi2)
         from public.profiles p where p.id = k.oyuncu2)),
    'karar', case when k.faz = 'karar' then jsonb_build_object('veren', k.sahip, 'deger', k.kasa) end,
    'son_karar', k.son_karar,
    'soru', v_soru,
    'cevap', case when k.faz = 'cevap' then jsonb_build_object(
               'ben_cevapladim', k.cevaplar ? v_me::text,
               'benim_cevabim', k.cevaplar -> v_me::text -> 'cevap',
               'rakip_cevapladi', k.cevaplar ? v_rakip::text) end,
    'sonuc', v_sonuc,
    'sureler', jsonb_build_object(
       'soru', k.soru_sn, 'karar', k.karar_sn, 'sonuc', k.sonuc_sn,
       'nabiz', public.kasa_nabiz_sn(), 'kopuk', public.ayar_sayi('kasa_kopuk_sn', 25),
       'gosterim_payi_ms', public.ayar_sayi('kasa_gosterim_payi_ms', 1500),
       'gosterim_bas', case k.faz
          when 'karar' then k.karar_baslangic + v_payi
          when 'cevap' then k.soru_baslangic + v_payi end),
    'kopuk', case when k.durum = 'aktif' and k.kopuk_at is not null then jsonb_build_object(
       'ben_mi', v_kopuk is not null and v_kopuk = v_me,
       'bitis', k.kopuk_at + make_interval(secs => public.ayar_sayi('kasa_kopuk_bekleme_sn', 45)),
       'faz_kalan_sn', round(extract(epoch from coalesce(k.kopuk_kalan, interval '0'))::numeric, 2)) end,
    'kazanan', k.kazanan, 'sonuc_neden', k.sonuc_neden,
    'terk', case when k.durum <> 'aktif' then jsonb_build_object(
       'ben', k.terk_eden = v_me, 'rakip', k.terk_eden is not null and k.terk_eden <> v_me) end,
    'baglanmayan', k.baglanmayan,
    'gecmis', v_gecmis
  );
end $$;

create or replace function public.kasa_cevap(p_id uuid, p_cevap smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_me uuid := auth.uid();
begin
  perform public.hiz_siniri('kasa_eylem', 90, interval '60 seconds');
  if p_cevap is null or p_cevap not between 0 and 3 then raise exception 'Geçersiz cevap'; end if;
  k := public.kasa_kilitle(p_id);   -- FOR UPDATE: iki oyuncunun cevabı sıraya girer
  if k.durum <> 'aktif' then raise exception 'Maç bitti'; end if;
  if k.faz <> 'cevap' then raise exception 'Şu an cevap verilemez'; end if;
  if k.cevaplar ? v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  if now() > k.faz_bitis + make_interval(secs => public.ayar_sayi('kasa_cevap_tolerans_sn', 1)) then
    raise exception 'Süre doldu';
  end if;

  update public.kasa_maclari
     set cevaplar = cevaplar || jsonb_build_object(v_me::text, jsonb_build_object('cevap', p_cevap, 'at', now())),
         son_hareket = now()
   where id = p_id;
  perform public.gorulen_kaydet(k.soru_id);
  if p_cevap is distinct from (select dogru_cevap from public.questions where id = k.soru_id) then
    perform public.yanlis_kaydet(k.soru_id);
  end if;
  perform public.kasa_ilerlet(p_id);
  perform public.kasa_sinyal_ver(p_id);
  -- Doğru/yanlış burada SÖYLENMEZ (rakip henüz cevaplamamış olabilir)
  return jsonb_build_object('cevaplandi', true);
end $$;

create or replace function public.kasa_karar(p_id uuid, p_ac boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
begin
  perform public.hiz_siniri('kasa_eylem', 90, interval '60 seconds');
  k := public.kasa_kilitle(p_id);
  if k.durum <> 'aktif' then raise exception 'Maç bitti'; end if;
  if k.faz <> 'karar' then raise exception 'Şu an karar verilemez'; end if;
  if k.sahip is distinct from auth.uid() then raise exception 'Karar kasanın sahibinde'; end if;
  perform public.kasa_karar_uygula(p_id, coalesce(p_ac, false), false);
  perform public.kasa_ilerlet(p_id);
  perform public.kasa_sinyal_ver(p_id);
end $$;

create or replace function public.kasa_terk(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare k public.kasa_maclari%rowtype;
begin
  k := public.kasa_kilitle(p_id);
  if k.durum <> 'aktif' then return; end if;
  -- 460: terk eden ödül almaz; kalan tam galibiyet
  update public.kasa_maclari set terk_eden = auth.uid() where id = p_id;
  perform public.kasa_bitir(p_id, case when k.oyuncu1 = auth.uid() then k.oyuncu2 else k.oyuncu1 end, 'terk');
end $$;

-- Davet (arkadaş) + Antrenman (açık bot → maç hemen)
create or replace function public.kasa_davet_et(p_rakip uuid, p_dereceli boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_davet uuid;
  v_kasa uuid;
  v_bot boolean;
  v_ad text;
begin
  -- 440: açık botla antrenman her zaman serbest
  if exists (select 1 from public.profiles b where b.id = p_rakip and public.acik_bot_mu(b.is_bot, b.bot_turu)) then
    p_dereceli := false;
  end if;
  perform public.hiz_siniri('kasa_davet_et', 30, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if not public.kasa_acik_mi() then raise exception 'Bu mod şu an kapalı'; end if;
  if p_rakip = v_me then raise exception 'Kendine meydan okuyamazsın'; end if;
  if not exists (select 1 from public.profiles where id = p_rakip) then raise exception 'Oyuncu bulunamadı'; end if;
  if not public.oynanabilir_mi(p_rakip) then
    raise exception 'Yalnız arkadaşlarına ve botlara meydan okuyabilirsin.';
  end if;

  delete from public.kasa_davetleri where durum = 'bekliyor' and created_at < now() - interval '24 hours';
  if exists (select 1 from public.kasa_maclari
              where durum = 'aktif' and (v_me in (oyuncu1, oyuncu2) or p_rakip in (oyuncu1, oyuncu2))) then
    raise exception 'Devam eden bir Kasa maçı var';
  end if;
  if exists (select 1 from public.kasa_davetleri
              where durum = 'bekliyor'
                and ((kuran = v_me and rakip = p_rakip) or (kuran = p_rakip and rakip = v_me))) then
    raise exception 'Bu oyuncuyla bekleyen bir Kasa davetin zaten var';
  end if;
  perform public.davet_siniri_kontrol(p_rakip);
  perform public.mac_kotasi_kontrol();

  insert into public.kasa_davetleri (kuran, rakip, dereceli)
  values (v_me, p_rakip, coalesce(p_dereceli, true))
  returning id into v_davet;

  select coalesce(is_bot, false) and coalesce(acik_bot, false) into v_bot from public.profiles where id = p_rakip;
  if coalesce(v_bot, false) then
    v_kasa := public.kasa_olustur(v_me, p_rakip, coalesce(p_dereceli, true), true);
    update public.kasa_davetleri set durum = 'kabul', kasa_id = v_kasa, yanit_at = now() where id = v_davet;
  else
    select gorunen_ad into v_ad from public.profiles where id = v_me;
    perform public.bildirim_yaz(p_rakip, 'kasa_daveti',
      coalesce(v_ad, 'Bir oyuncu') || ' seni Kasa maçına çağırdı!', '/bildim/kasa');
  end if;
  return jsonb_build_object('davet_id', v_davet, 'kasa_id', v_kasa);
end $$;

create or replace function public.kasa_davet_cevap(p_id uuid, p_kabul boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  d public.kasa_davetleri%rowtype;
  v_kasa uuid;
  v_ad text;
begin
  perform public.hiz_siniri('kasa_davet_cevap', 60, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select * into d from public.kasa_davetleri where id = p_id for update;
  if not found then raise exception 'Davet bulunamadı'; end if;
  if d.rakip <> v_me then raise exception 'Bu davet sana ait değil'; end if;
  if d.durum <> 'bekliyor' then raise exception 'Davet zaten yanıtlanmış'; end if;

  if not coalesce(p_kabul, false) then
    update public.kasa_davetleri set durum = 'red', yanit_at = now() where id = p_id;
    return null;
  end if;
  if not public.kasa_acik_mi() then raise exception 'Bu mod şu an kapalı'; end if;
  if exists (select 1 from public.kasa_maclari
              where durum = 'aktif' and (v_me in (oyuncu1, oyuncu2) or d.kuran in (oyuncu1, oyuncu2))) then
    raise exception 'Devam eden bir Kasa maçı var';
  end if;
  perform public.davet_kabul_kontrol(d.kuran);
  perform public.mac_kotasi_kontrol();

  v_kasa := public.kasa_olustur(d.kuran, v_me, d.dereceli, true);
  update public.kasa_davetleri set durum = 'kabul', kasa_id = v_kasa, yanit_at = now() where id = p_id;
  select gorunen_ad into v_ad from public.profiles where id = v_me;
  perform public.bildirim_yaz(d.kuran, 'kasa_kabul',
    coalesce(v_ad, 'Rakibin') || ' Kasa davetini kabul etti - maç başlıyor!', '/bildim/kasa/' || v_kasa::text);
  return v_kasa;
end $$;

create or replace function public.kasa_davet_iptal(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.kasa_davetleri set durum = 'iptal', yanit_at = now()
   where id = p_id and kuran = auth.uid() and durum = 'bekliyor';
$$;

-- Ayar denemesi özeti (yalnız sahip/servis; istemciye kapalı)
create or replace view public.kasa_deneme_ozeti as
select k.id, k.created_at, k.bitis, k.durum, k.dereceli, k.sonuc_neden, k.tur, k.altin,
       k.hedef, k.max_tur, k.artis, k.ikisi_artis,
       k.puan1, k.puan2, k.kazanan = k.oyuncu1 as kazanan_o1,
       k.bot is not null as bot_maci, k.bot_tarz,
       k.acma_sayisi1, k.acma_toplam1, k.acma_sayisi2, k.acma_toplam2,
       (select coalesce(jsonb_agg(h.acilan_deger order by h.tur), '[]'::jsonb)
          from public.kasa_hamleler h where h.kasa_id = k.id and h.karar = 'ac') as acilan_degerler,
       (select count(*) from public.kasa_hamleler h where h.kasa_id = k.id and h.karar = 'sure_doldu') as sure_dolan_karar,
       extract(epoch from (k.bitis - k.created_at))::int as sure_sn
  from public.kasa_maclari k;
revoke all on public.kasa_deneme_ozeti from public, anon, authenticated;

-- =====================================================================================
-- 7) ORTAK FONKSİYONLARA 'kasa' DALI (mevcut dallar aynen; yalnız ekleme)
-- =====================================================================================

-- 7a) Aynı çift günlük sayımı: Kasa maçları da sayılır
CREATE OR REPLACE FUNCTION public.cift_odul_carpani(p_a uuid, p_b uuid, p_mac_id uuid DEFAULT NULL::uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tam  int := public.ayar_sayi('mac_cift_tam_sinir', 5)::int;
  v_yari int := public.ayar_sayi('mac_cift_yari_sinir', 10)::int;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_sira int;
begin
  -- Aynı cihaz/IP: sıralı maç hiç ödül vermez (sessiz koruma).
  if public.ayni_cihaz_mi(p_a, p_b) then return 0; end if;

  select
    (select count(*) from public.matches m
      where m.durum = 'bitti'
        and ((m.oyuncu1 = p_a and m.oyuncu2 = p_b) or (m.oyuncu1 = p_b and m.oyuncu2 = p_a))
        and (coalesce(m.bitis, m.created_at) at time zone 'Europe/Istanbul')::date = v_bugun
        and (p_mac_id is null or m.id <> p_mac_id))
  + (select count(*) from public.duellolar x
      where x.durum = 'bitti'
        and ((x.oyuncu1 = p_a and x.oyuncu2 = p_b) or (x.oyuncu1 = p_b and x.oyuncu2 = p_a))
        and (coalesce(x.bitis, x.created_at) at time zone 'Europe/Istanbul')::date = v_bugun
        and (p_mac_id is null or x.id <> p_mac_id))
  + (select count(*) from public.kasa_maclari kx   -- 950
      where kx.durum = 'bitti'
        and ((kx.oyuncu1 = p_a and kx.oyuncu2 = p_b) or (kx.oyuncu1 = p_b and kx.oyuncu2 = p_a))
        and (coalesce(kx.bitis, kx.created_at) at time zone 'Europe/Istanbul')::date = v_bugun
        and (p_mac_id is null or kx.id <> p_mac_id))
  into v_sira;

  v_sira := v_sira + 1;   -- bu maç kaçıncı olacak

  if v_sira <= v_tam then return 1; end if;
  if v_sira <= v_yari then return 0.5; end if;
  return 0;
end;
$function$;

-- 7b) XP: 'kasa' Klasik değerleriyle; "oynadı mı" kasa_cevaplari'ndan
CREATE OR REPLACE FUNCTION public.xp_mac_odulu(p_kaynak text, p_mod text, p_kazanan uuid, p_oyuncular uuid[], p_cift numeric DEFAULT 1, p_acik_bot boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_oyuncu uuid; v_sonuc text; v_taban int; v_xp int; v_carpan numeric; v_indirim text;
  v_id uuid; v_oynadi boolean;
  v_bot_carpan numeric := public.ayar_ondalik('xp_acik_bot_carpani', 0.5);
begin
  if p_kaynak is null then return; end if;
  begin v_id := split_part(p_kaynak, ':', 2)::uuid; exception when others then v_id := null; end;

  v_carpan := least(coalesce(p_cift, 1), case when coalesce(p_acik_bot, false) then v_bot_carpan else 1 end);
  v_indirim := case when v_carpan >= 1 then null
                    when coalesce(p_cift, 1) <= 0 then 'cift_odulsuz'
                    when coalesce(p_cift, 1) = v_carpan then 'cift_yari'
                    else 'acik_bot' end;

  foreach v_oyuncu in array coalesce(p_oyuncular, '{}'::uuid[]) loop
    continue when v_oyuncu is null;
    v_sonuc := case when p_kazanan is null then 'beraberlik' when p_kazanan = v_oyuncu then 'galibiyet' else 'maglubiyet' end;
    if p_mod = 'duello' then
      -- Düello'da beraberlik yok; kazanansız biterse iki taraf mağlubiyet XP'si alır
      v_taban := case when v_sonuc = 'galibiyet' then public.ayar_sayi('xp_duello_galibiyet', 45)
                      else public.ayar_sayi('xp_duello_maglubiyet', 15) end;
      v_oynadi := exists (select 1 from public.duello_hamleler h
                           where h.duello_id = v_id and (h.saldiran = v_oyuncu or h.savunan = v_oyuncu));
    else
      v_taban := case v_sonuc when 'galibiyet' then public.ayar_sayi('xp_mac_galibiyet', 30)
                              when 'beraberlik' then public.ayar_sayi('xp_mac_beraberlik', 15)
                              else public.ayar_sayi('xp_mac_maglubiyet', 10) end;
      if p_mod = 'kasa' then   -- 950
        v_oynadi := exists (select 1 from public.kasa_cevaplari c
                             where c.kasa_id = v_id and c.user_id = v_oyuncu and c.cevap is not null);
      else
        v_oynadi := exists (select 1 from public.match_answers a where a.match_id = v_id and a.user_id = v_oyuncu);
      end if;
    end if;
    if v_sonuc <> 'galibiyet' and not v_oynadi then v_taban := 0; end if;
    v_xp := greatest(floor(v_taban * v_carpan), 0)::int;
    perform public.xp_ver(v_oyuncu, v_xp, p_kaynak,
      jsonb_strip_nulls(jsonb_build_object('sonuc', v_sonuc, 'taban', v_taban, 'carpan', v_carpan,
                                           'indirim', v_indirim, 'oynamadi', case when not v_oynadi and v_sonuc <> 'galibiyet' then true end)));
  end loop;
end $function$;

-- 7c) Sezon Puanı: 'kasa' maç kaynağı gibi (günlük maç SP tavanı + BP çarpanı)
CREATE OR REPLACE FUNCTION public.sezon_puani_ekle(p_user uuid, p_kaynak text, p_referans text, p_miktar integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_sezon bigint;
  v_taban int := coalesce(p_miktar, 0);
  v_miktar int;
  v_kullanilan int;
  v_id bigint;
  v_sp int;
  v_seviye int;
begin
  if p_user is null or v_taban <= 0 or p_referans is null then return null; end if;
  if exists (select 1 from public.profiles where id = p_user and coalesce(is_bot, false)) then return null; end if;
  v_sezon := public.sezon_gecerli(p_user);
  if v_sezon is null then return null; end if;

  -- Oyuncu satırını kilitle: günlük tavan ve seviye hesabı yarışsız
  insert into public.oyuncu_sezon_puani (sezon, user_id) values (v_sezon, p_user) on conflict do nothing;
  perform 1 from public.oyuncu_sezon_puani where sezon = v_sezon and user_id = p_user for update;

  if p_kaynak in ('mac', 'duello', 'kasa') then   -- 950: kasa
    select coalesce(sum(h.taban), 0) into v_kullanilan from public.sezon_puan_hareketleri h
     where h.user_id = p_user and h.sezon = v_sezon and h.kaynak in ('mac', 'duello', 'kasa')
       and (h.created_at at time zone 'Europe/Istanbul')::date = (now() at time zone 'Europe/Istanbul')::date;
    v_taban := least(v_taban, greatest(0, public.ayar_sayi('sp_gunluk_mac_tavan', 150)::int - v_kullanilan));
    if v_taban <= 0 then return null; end if;
  end if;

  v_miktar := v_taban;
  if p_kaynak in ('mac', 'duello', 'kasa', 'turnuva', 'gorev') and public.bp_aktif_mi(v_sezon, p_user) then
    v_miktar := round(v_taban * public.ayar_ondalik('bp_sp_carpan', 1.25))::int;
  end if;

  insert into public.sezon_puan_hareketleri (sezon, user_id, kaynak, referans, taban, miktar)
  values (v_sezon, p_user, p_kaynak, p_referans, v_taban, v_miktar)
  on conflict do nothing returning id into v_id;
  if v_id is null then return null; end if;   -- bu kaynak zaten puan verdi

  update public.oyuncu_sezon_puani set sp = sp + v_miktar, guncellendi = now()
   where sezon = v_sezon and user_id = p_user returning sp into v_sp;
  v_seviye := public.sezon_seviye(v_sp);
  update public.oyuncu_sezon_puani set seviye = v_seviye where sezon = v_sezon and user_id = p_user and seviye <> v_seviye;
  perform public.sezon_final_kontrol(v_sezon, p_user);
  return v_sp;
end $function$;

-- 7d) Görev ölçümü: Kasa maçı "maç oyna / kazan / doğru" sayımına girer (yeni görev türü YOK).
--     Ödülsüz (kasa_odul_acik=0 ya da çarpan 0 ayarıyla biten) maç sayılmaz; açık bot maçı sayılmaz.
CREATE OR REPLACE FUNCTION public.gorev_olcum(p_user uuid, p_sayac text, p_param jsonb, p_bas timestamp with time zone, p_son timestamp with time zone, p_haric_tur text, p_haric_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v bigint := 0;
begin
  if p_user is null then return 0; end if;

  if p_sayac in ('mac_oyna', 'duello_mac') then
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and (p_haric_tur is distinct from 'duello' or d.id is distinct from p_haric_id) and p_user in (d.oyuncu1, d.oyuncu2) and d.terk_eden is distinct from p_user
       and d.bitis >= p_bas and d.bitis < p_son
       and not public.gorev_acik_bot_mu(case when d.oyuncu1 = p_user then d.oyuncu2 else d.oyuncu1 end);
    if p_sayac = 'mac_oyna' then
      v := v
        + (select count(*) from public.matches m
            where m.durum = 'bitti' and (p_haric_tur is distinct from 'mac' or m.id is distinct from p_haric_id) and p_user in (m.oyuncu1, m.oyuncu2) and m.terk_eden is distinct from p_user
              and m.bitis >= p_bas and m.bitis < p_son
              and not public.gorev_acik_bot_mu(case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end))
        + (select count(*) from public.hizli_mod_oturumlar h
            where h.durum = 'bitti' and h.user_id = p_user and h.bitis >= p_bas and h.bitis < p_son)
        + (select count(*) from public.group_matches g join public.group_match_players gp on gp.group_match_id = g.id
            where g.durum = 'bitti' and (p_haric_tur is distinct from 'grup' or g.id is distinct from p_haric_id) and gp.user_id = p_user and gp.davet_durumu = 'kabul' and gp.terk_at is null
              and g.bitis >= p_bas and g.bitis < p_son)
        + (select count(*) from public.tournaments t join public.tournament_players tp on tp.tournament_id = t.id
            where t.durum = 'bitti' and (p_haric_tur is distinct from 'turnuva' or t.id is distinct from p_haric_id) and tp.user_id = p_user and tp.terk_at is null and t.bitis >= p_bas and t.bitis < p_son)
        + (select count(*) from public.kasa_maclari k   -- 950
            where k.durum = 'bitti' and coalesce(k.odul_acik, false) and (p_haric_tur is distinct from 'kasa' or k.id is distinct from p_haric_id)
              and p_user in (k.oyuncu1, k.oyuncu2) and k.terk_eden is distinct from p_user
              and k.bitis >= p_bas and k.bitis < p_son
              and not public.gorev_acik_bot_mu(case when k.oyuncu1 = p_user then k.oyuncu2 else k.oyuncu1 end));
    end if;

  elsif p_sayac in ('mac_kazan', 'duello_galibiyet') then
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and (p_haric_tur is distinct from 'duello' or d.id is distinct from p_haric_id) and d.kazanan = p_user and d.terk_eden is distinct from p_user
       and d.bitis >= p_bas and d.bitis < p_son
       and not public.gorev_acik_bot_mu(case when d.oyuncu1 = p_user then d.oyuncu2 else d.oyuncu1 end);
    if p_sayac = 'mac_kazan' then
      v := v
        + (select count(*) from public.matches m
            where m.durum = 'bitti' and (p_haric_tur is distinct from 'mac' or m.id is distinct from p_haric_id) and m.kazanan = p_user and m.terk_eden is distinct from p_user
              and m.bitis >= p_bas and m.bitis < p_son
              and not public.gorev_acik_bot_mu(case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end))
        + (select count(*) from public.group_matches g join public.group_match_players gp on gp.group_match_id = g.id
            where g.durum = 'bitti' and (p_haric_tur is distinct from 'grup' or g.id is distinct from p_haric_id) and g.kazanan = p_user and gp.user_id = p_user and gp.davet_durumu = 'kabul'
              and gp.terk_at is null and g.bitis >= p_bas and g.bitis < p_son)
        + (select count(*) from public.tournaments t
            where t.durum = 'bitti' and (p_haric_tur is distinct from 'turnuva' or t.id is distinct from p_haric_id) and t.kazanan = p_user and t.bitis >= p_bas and t.bitis < p_son
              and exists (select 1 from public.tournament_players tp
                           where tp.tournament_id = t.id and tp.user_id = p_user and tp.terk_at is null))
        + (select count(*) from public.kasa_maclari k   -- 950
            where k.durum = 'bitti' and coalesce(k.odul_acik, false) and (p_haric_tur is distinct from 'kasa' or k.id is distinct from p_haric_id)
              and k.kazanan = p_user and k.terk_eden is distinct from p_user
              and k.bitis >= p_bas and k.bitis < p_son
              and not public.gorev_acik_bot_mu(case when k.oyuncu1 = p_user then k.oyuncu2 else k.oyuncu1 end));
    end if;

  elsif p_sayac = 'dogru_soru' then
    select count(*) into v from public.gorev_dogru_satirlari(p_user, p_bas, p_son, p_haric_tur, p_haric_id);

  elsif p_sayac = 'kategori_dogru' then
    select count(*) into v from public.gorev_dogru_satirlari(p_user, p_bas, p_son, p_haric_tur, p_haric_id) s
     where s.kategori = p_param ->> 'kategori';

  elsif p_sayac = 'farkli_kategori_dogru' then
    select count(distinct s.kategori) into v from public.gorev_dogru_satirlari(p_user, p_bas, p_son, p_haric_tur, p_haric_id) s
     where s.kategori is not null;
  end if;

  return coalesce(v, 0);
end $function$;

CREATE OR REPLACE FUNCTION public.gorev_dogru_satirlari(p_user uuid, p_bas timestamp with time zone, p_son timestamp with time zone, p_haric_tur text, p_haric_id uuid)
 RETURNS TABLE(kategori text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select q.kategori
    from public.match_answers a
    join public.matches m on m.id = a.match_id
    left join public.questions q on q.id = m.soru_ids[a.soru_index + 1]
   where a.user_id = p_user and a.dogru and a.created_at >= p_bas and a.created_at < p_son
     and m.durum in ('aktif', 'bitti') and (p_haric_tur is distinct from 'mac' or m.id is distinct from p_haric_id) and m.terk_eden is distinct from p_user
     and not public.gorev_acik_bot_mu(case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end)
  union all
  select coalesce(q.kategori, h.kategori)
    from public.duello_hamleler h
    join public.duellolar d on d.id = h.duello_id
    left join public.questions q on q.id = h.soru_id
   where h.created_at >= p_bas and h.created_at < p_son
     and ((h.savunan = p_user and h.dogru) or (h.saldiran = p_user and coalesce(h.dogru_saldiran, false)))
     and d.durum in ('aktif', 'bitti') and (p_haric_tur is distinct from 'duello' or d.id is distinct from p_haric_id) and d.terk_eden is distinct from p_user
     and not public.gorev_acik_bot_mu(case when d.oyuncu1 = p_user then d.oyuncu2 else d.oyuncu1 end)
  union all
  select h.kategori
    from public.hizli_mod_oturumlar h
    cross join lateral generate_series(1, greatest(coalesce(h.dogru, 0), 0)) g
   where h.durum = 'bitti' and h.user_id = p_user and h.bitis >= p_bas and h.bitis < p_son
  union all
  select q.kategori
    from public.group_match_answers ga
    join public.group_matches gm on gm.id = ga.group_match_id
    left join public.questions q on q.id = gm.soru_ids[ga.soru_index + 1]
   where ga.user_id = p_user and ga.dogru and (p_haric_tur is distinct from 'grup' or ga.group_match_id is distinct from p_haric_id) and ga.created_at >= p_bas and ga.created_at < p_son
     and not exists (select 1 from public.group_match_players gx
                      where gx.group_match_id = ga.group_match_id and gx.user_id = p_user and gx.terk_at is not null)
  union all
  select q.kategori
    from public.tournament_answers ta
    join public.tournaments t on t.id = ta.tournament_id
    left join public.questions q on q.id = t.soru_ids[ta.soru_index + 1]
   where ta.user_id = p_user and ta.dogru and (p_haric_tur is distinct from 'turnuva' or ta.tournament_id is distinct from p_haric_id) and ta.created_at >= p_bas and ta.created_at < p_son
     and not exists (select 1 from public.tournament_players tx
                      where tx.tournament_id = ta.tournament_id and tx.user_id = p_user and tx.terk_at is not null)
  union all   -- 950: Kasa (ödüllü maç; aktif maçta odul_acik henüz yok → kasa_odul_acik ayarına bakılır)
  select c.kategori
    from public.kasa_cevaplari c
    join public.kasa_maclari k on k.id = c.kasa_id
   where c.user_id = p_user and c.dogru and c.created_at >= p_bas and c.created_at < p_son
     and k.durum in ('aktif', 'bitti') and (p_haric_tur is distinct from 'kasa' or k.id is distinct from p_haric_id)
     and k.terk_eden is distinct from p_user
     and coalesce(k.odul_acik, public.ayar_sayi('kasa_odul_acik', 1) >= 1 and public.ayar_ondalik('kasa_odul_carpani', 1) > 0)
     and not public.gorev_acik_bot_mu(case when k.oyuncu1 = p_user then k.oyuncu2 else k.oyuncu1 end);
$function$;

-- 7e) Eski 3 görev sayacı (BP bonus görevi bunu kullanır): Kasa da sayılır
CREATE OR REPLACE FUNCTION public.gorev_sayaci(p_quest_id text, p_user uuid, p_tarih date)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with sinir as (
    select (p_tarih::timestamp at time zone 'Europe/Istanbul') as bas,
           ((p_tarih + 1)::timestamp at time zone 'Europe/Istanbul') as son
  )
  select case p_quest_id
    when 'mac_oyna_3' then
      (select count(*) from public.matches m, sinir s
        where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2) and m.terk_eden is distinct from p_user and m.bitis >= s.bas and m.bitis < s.son)
    + (select count(*) from public.duellolar d, sinir s
        where d.durum = 'bitti' and p_user in (d.oyuncu1, d.oyuncu2) and d.terk_eden is distinct from p_user and d.bitis >= s.bas and d.bitis < s.son)
    + (select count(*) from public.hizli_mod_oturumlar h, sinir s
        where h.durum = 'bitti' and h.user_id = p_user and h.bitis >= s.bas and h.bitis < s.son)
    + (select count(*) from public.group_matches g join public.group_match_players gp on gp.group_match_id = g.id, sinir s
        where g.durum = 'bitti' and gp.user_id = p_user and gp.davet_durumu = 'kabul' and gp.terk_at is null and g.bitis >= s.bas and g.bitis < s.son)
    + (select count(*) from public.tournaments t join public.tournament_players tp on tp.tournament_id = t.id, sinir s
        where t.durum = 'bitti' and tp.user_id = p_user and tp.terk_at is null and t.bitis >= s.bas and t.bitis < s.son)
    + (select count(*) from public.kasa_maclari k, sinir s   -- 950
        where k.durum = 'bitti' and coalesce(k.odul_acik, false) and p_user in (k.oyuncu1, k.oyuncu2) and k.terk_eden is distinct from p_user and k.bitis >= s.bas and k.bitis < s.son)
    when 'mac_kazan_5' then
      (select count(*) from public.matches m, sinir s
        where m.durum = 'bitti' and m.kazanan = p_user and m.bitis >= s.bas and m.bitis < s.son)
    + (select count(*) from public.duellolar d, sinir s
        where d.durum = 'bitti' and d.kazanan = p_user and d.bitis >= s.bas and d.bitis < s.son)
    + (select count(*) from public.group_matches g join public.group_match_players gp on gp.group_match_id = g.id, sinir s
        where g.durum = 'bitti' and g.kazanan = p_user and gp.user_id = p_user and gp.davet_durumu = 'kabul' and gp.terk_at is null and g.bitis >= s.bas and g.bitis < s.son)
    + (select count(*) from public.tournaments t, sinir s
        where t.durum = 'bitti' and t.kazanan = p_user and t.bitis >= s.bas and t.bitis < s.son)
    + (select count(*) from public.kasa_maclari k, sinir s   -- 950
        where k.durum = 'bitti' and coalesce(k.odul_acik, false) and k.kazanan = p_user and k.bitis >= s.bas and k.bitis < s.son)
    when 'dogru_25' then
      (select count(*) from public.match_answers a, sinir s
        where a.user_id = p_user and a.dogru and a.created_at >= s.bas and a.created_at < s.son
          and not exists (select 1 from public.matches mx where mx.id = a.match_id and mx.terk_eden = p_user))
    + (select count(*) from public.duello_hamleler dh, sinir s
        where dh.savunan = p_user and dh.dogru and dh.created_at >= s.bas and dh.created_at < s.son
          and not exists (select 1 from public.duellolar dx where dx.id = dh.duello_id and dx.terk_eden = p_user))
    + (select coalesce(sum(h.dogru), 0) from public.hizli_mod_oturumlar h, sinir s
        where h.durum = 'bitti' and h.user_id = p_user and h.bitis >= s.bas and h.bitis < s.son)
    + (select count(*) from public.group_match_answers ga, sinir s
        where ga.user_id = p_user and ga.dogru and ga.created_at >= s.bas and ga.created_at < s.son
          and not exists (select 1 from public.group_match_players gx where gx.group_match_id = ga.group_match_id and gx.user_id = p_user and gx.terk_at is not null))
    + (select count(*) from public.tournament_answers ta, sinir s
        where ta.user_id = p_user and ta.dogru and ta.created_at >= s.bas and ta.created_at < s.son
          and not exists (select 1 from public.tournament_players tx where tx.tournament_id = ta.tournament_id and tx.user_id = p_user and tx.terk_at is not null))
    + (select count(*) from public.kasa_cevaplari kc, sinir s   -- 950
        where kc.user_id = p_user and kc.dogru and kc.created_at >= s.bas and kc.created_at < s.son
          and exists (select 1 from public.kasa_maclari kx where kx.id = kc.kasa_id and kx.terk_eden is distinct from p_user
                        and coalesce(kx.odul_acik, public.ayar_sayi('kasa_odul_acik', 1) >= 1 and public.ayar_ondalik('kasa_odul_carpani', 1) > 0)))
    else public.gorev_havuz_sayaci(p_quest_id, p_user, p_tarih)
  end;
$function$;

-- 7f) Ödül dökümü + level kazancı: 'kasa:' kaynağını tanır
CREATE OR REPLACE FUNCTION public.odul_dokumu(p_kaynak text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v jsonb;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_kaynak is null or p_kaynak !~ '^(mac|duello|hizli|turnuva|grup|kasa):[0-9a-f-]{36}$' then raise exception 'Geçersiz kaynak'; end if;

  select jsonb_build_object(
    'hazir', exists (select 1 from public.odul_kalemleri o where o.user_id = v_me and o.kaynak = p_kaynak),
    'kalemler', coalesce((
      select jsonb_agg(jsonb_build_object('kalem', k.kalem, 'lig', k.lig, 'coin', k.coin, 'detay', k.detay) order by k.ilk)
        from (select o.kalem, sum(o.lig)::int lig, sum(o.coin)::int coin, min(o.id) ilk,
                     (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
                        from public.odul_kalemleri x, jsonb_each(x.detay) e
                       where x.user_id = v_me and x.kaynak = p_kaynak and x.kalem = o.kalem) detay
                from public.odul_kalemleri o
               where o.user_id = v_me and o.kaynak = p_kaynak and o.kalem <> 'rozet'
               group by o.kalem) k), '[]'::jsonb),
    'rozetler', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'ad', b.ad, 'ikon', b.ikon) order by o.id)
        from public.odul_kalemleri o join public.badges b on b.id = o.detay ->> 'rozet'
       where o.user_id = v_me and o.kaynak = p_kaynak and o.kalem = 'rozet'), '[]'::jsonb),
    'toplam', (select jsonb_build_object('lig', coalesce(sum(o.lig), 0), 'coin', coalesce(sum(o.coin), 0))
                 from public.odul_kalemleri o where o.user_id = v_me and o.kaynak = p_kaynak),
    'gorevler', coalesce((select jsonb_agg(jsonb_build_object('id', g.quest_id, 'ad', g.ad, 'ilerleme', g.ilerleme,
                                                              'hedef', g.hedef, 'alindi', g.alindi))
                            from public.get_daily_quests() g), '[]'::jsonb)
  ) into v;
  return v;
end $function$;

CREATE OR REPLACE FUNCTION public.level_kazancim(p_kaynak text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  h public.xp_hareketleri%rowtype;
  p record;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_kaynak is null or p_kaynak !~ '^(mac|duello|turnuva|kasa):[0-9a-f-]{36}$' then raise exception 'Geçersiz kaynak'; end if;
  select level, level_xp, xp into p from public.profiles where id = v_me;
  select * into h from public.xp_hareketleri where user_id = v_me and kaynak = p_kaynak;
  return jsonb_build_object(
    'hazir', h.id is not null,
    'xp', coalesce(h.xp, 0),
    'level_once', h.level_once,
    'level_sonra', h.level_sonra,
    'rutbe_once', case when h.id is not null then public.level_rutbe(h.level_once) end,
    'rutbe_sonra', case when h.id is not null then public.level_rutbe(h.level_sonra) end,
    'indirim', h.detay ->> 'indirim',
    'oynamadi', coalesce((h.detay ->> 'oynamadi')::boolean, false),
    'level_coin', coalesce((h.detay ->> 'level_coin')::int, 0),
    'rutbe_coin', coalesce((h.detay ->> 'rutbe_coin')::int, 0),
    'skiller', coalesce(h.detay -> 'skiller', '[]'::jsonb),
    'level', coalesce(p.level, 1),
    'level_xp', coalesce(p.level_xp, 0),
    'level_gereken', public.level_gereken_xp(coalesce(p.level, 1))
  );
end $function$;

-- 7g) Maç sonu özeti: 'kasa' dalı (MacSonuKutlama tek çağrı)
CREATE OR REPLACE FUNCTION public.mac_sonu_ozet(p_kaynak text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_tur text;
  v_id uuid;
  v_bitti boolean := false;
  v_bitis timestamptz;
  v_kazanan uuid;
  v_ben_terk boolean := false;
  v_rakip_terk boolean := false;
  v_edenler uuid[] := '{}';
  v_hazir boolean := false;
  v_dokum jsonb;
  v_level jsonb;
  v_lig jsonb;
  v_rozet jsonb;
  v_gorev jsonb;
  v_haftalik jsonb;
  v_hafta date := public.gorev_hafta_basi(now());
  v_lig_puan int := 0;
  v_dogru int := 0;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_bugun_mu boolean := false;
  v_dil text := public.oyuncu_dili();
  p record;
  h public.xp_hareketleri%rowtype;
  v_kalan int; v_l int;
  v_sira bigint; v_puan int; v_once int; v_sira_once bigint;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_kaynak is null or p_kaynak !~ '^(mac|duello|turnuva|grup|kasa):[0-9a-f-]{36}$' then raise exception 'Geçersiz kaynak'; end if;
  v_tur := split_part(p_kaynak, ':', 1);
  v_id := split_part(p_kaynak, ':', 2)::uuid;

  -- Maç durumu + katılım denetimi (başkasının maçı okunmaz)
  if v_tur = 'mac' then
    select m.durum = 'bitti', m.bitis, m.kazanan,
           m.terk_eden = v_me, m.terk_eden is not null and m.terk_eden <> v_me,
           case when m.terk_eden is null then '{}'::uuid[] else array[m.terk_eden] end,
           (select count(*) from public.match_answers a where a.match_id = m.id and a.user_id = v_me and a.dogru)
      into v_bitti, v_bitis, v_kazanan, v_ben_terk, v_rakip_terk, v_edenler, v_dogru
      from public.matches m where m.id = v_id and v_me in (m.oyuncu1, m.oyuncu2);
  elsif v_tur = 'duello' then
    select d.durum = 'bitti', d.bitis, d.kazanan,
           d.terk_eden = v_me, d.terk_eden is not null and d.terk_eden <> v_me,
           case when d.terk_eden is null then '{}'::uuid[] else array[d.terk_eden] end,
           (select count(*) from public.duello_hamleler dh where dh.duello_id = d.id and dh.savunan = v_me and dh.dogru)
      into v_bitti, v_bitis, v_kazanan, v_ben_terk, v_rakip_terk, v_edenler, v_dogru
      from public.duellolar d where d.id = v_id and v_me in (d.oyuncu1, d.oyuncu2);
  elsif v_tur = 'kasa' then   -- 950
    select k.durum = 'bitti', k.bitis, k.kazanan,
           k.terk_eden = v_me, k.terk_eden is not null and k.terk_eden <> v_me,
           case when k.terk_eden is null then '{}'::uuid[] else array[k.terk_eden] end,
           (select count(*) from public.kasa_cevaplari c where c.kasa_id = k.id and c.user_id = v_me and c.dogru)
      into v_bitti, v_bitis, v_kazanan, v_ben_terk, v_rakip_terk, v_edenler, v_dogru
      from public.kasa_maclari k where k.id = v_id and v_me in (k.oyuncu1, k.oyuncu2);
  elsif v_tur = 'grup' then
    select g.durum = 'bitti', g.bitis, g.kazanan,
           exists (select 1 from public.group_match_players x where x.group_match_id = g.id and x.user_id = v_me and x.terk_at is not null),
           false,
           coalesce((select array_agg(x.user_id) from public.group_match_players x
                      where x.group_match_id = g.id and x.terk_at is not null), '{}'::uuid[]),
           (select count(*) from public.group_match_answers a where a.group_match_id = g.id and a.user_id = v_me and a.dogru)
      into v_bitti, v_bitis, v_kazanan, v_ben_terk, v_rakip_terk, v_edenler, v_dogru
      from public.group_matches g
     where g.id = v_id
       and exists (select 1 from public.group_match_players x where x.group_match_id = g.id and x.user_id = v_me);
  else
    select t.durum = 'bitti', t.bitis, t.kazanan,
           exists (select 1 from public.tournament_players x where x.tournament_id = t.id and x.user_id = v_me and x.terk_at is not null),
           false, '{}'::uuid[],
           (select count(*) from public.tournament_answers a where a.tournament_id = t.id and a.user_id = v_me and a.dogru)
      into v_bitti, v_bitis, v_kazanan, v_ben_terk, v_rakip_terk, v_edenler, v_dogru
      from public.tournaments t
     where t.id = v_id
       and exists (select 1 from public.tournament_players x where x.tournament_id = t.id and x.user_id = v_me);
  end if;
  if not found then raise exception 'Bu maçta değilsin'; end if;
  v_bitti := coalesce(v_bitti, false);
  v_ben_terk := coalesce(v_ben_terk, false);
  v_rakip_terk := coalesce(v_rakip_terk, false);
  v_bugun_mu := v_bitis is not null and (v_bitis at time zone 'Europe/Istanbul')::date = v_bugun;

  v_dokum := public.odul_dokumu(p_kaynak);
  v_lig_puan := coalesce((v_dokum -> 'toplam' ->> 'lig')::int, 0);

  -- XP / level (grup XP vermez)
  if v_tur <> 'grup' then
    v_level := public.level_kazancim(p_kaynak);
    select * into h from public.xp_hareketleri where user_id = v_me and kaynak = p_kaynak;
    if h.id is not null then
      select level, level_xp into p from public.profiles where id = v_me;
      if h.level_sonra > h.level_once and p.level = h.level_sonra then
        -- Atlamadan önceki levelin doluluğu: bu maçın XP'sinden atlanan levellerin ihtiyacı düşülür.
        -- (Bu maçtan sonra başka XP geldiyse yaklaşık kalır; yalnız çubuk animasyonu içindir.)
        v_kalan := h.xp - p.level_xp;
        v_l := h.level_once + 1;
        while v_l < h.level_sonra loop
          v_kalan := v_kalan - public.level_gereken_xp(v_l);
          v_l := v_l + 1;
        end loop;
        -- Maçtan sonra başka XP geldiyse hesap tutmaz (v_kalan ≤ 0): alan yazılmaz, istemci varsayılanı kullanır.
        if v_kalan > 0 and v_kalan < public.level_gereken_xp(h.level_once) then
          v_level := v_level || jsonb_build_object(
            'level_gereken_once', public.level_gereken_xp(h.level_once),
            'level_xp_once', public.level_gereken_xp(h.level_once) - v_kalan);
        end if;
      end if;
    end if;
  end if;

  v_hazir := v_bitti and (v_ben_terk or v_tur = 'grup'
                          or exists (select 1 from public.xp_hareketleri x where x.user_id = v_me and x.kaynak = p_kaynak)
                          or coalesce((v_dokum ->> 'hazir')::boolean, false));

  -- Lig sırası (yalnız bu maçtan lig puanı geldiyse): sonra = bugünkü sıra, önce = puan düşülmüş hâl
  if v_lig_puan > 0 and not v_ben_terk then
    begin
      select g.sira, g.puan into v_sira, v_puan from public.lig_grubum() g where g.ben;
      if v_sira is not null then
        v_once := v_puan - v_lig_puan;
        select 1 + count(*) into v_sira_once
          from public.lig_grubum() g
         where not g.ben and (g.puan > v_once or (g.puan = v_once and g.sira < v_sira));
        v_lig := jsonb_build_object('puan', v_lig_puan, 'sira_sonra', v_sira,
                                    'sira_once', greatest(v_sira_once, v_sira));
      else
        v_lig := jsonb_build_object('puan', v_lig_puan);
      end if;
    exception when others then
      v_lig := jsonb_build_object('puan', v_lig_puan);
    end;
  elsif v_lig_puan > 0 then
    v_lig := jsonb_build_object('puan', v_lig_puan);
  end if;

  -- Bu maçta kazanılan rozetler (rozet coini bu kaynağa yazıldıysa ya da maç bitişiyle aynı işlemde)
  select coalesce(jsonb_agg(jsonb_build_object(
           'anahtar', t.anahtar,
           'ad', case when v_dil = 'en' then coalesce(t.ad_en, t.ad_tr) else t.ad_tr end,
           'ikon', t.ikon, 'grup', t.grup, 'kademe', t.kademe) order by r.kazanildi_at, t.sira), '[]'::jsonb)
    into v_rozet
    from public.oyuncu_rozetleri r
    join public.rozet_tanimlari t on t.anahtar = r.rozet
   where r.user_id = v_me and not r.geriye_donuk
     and (exists (select 1 from public.odul_kalemleri o
                   where o.user_id = v_me and o.kaynak = p_kaynak and o.kalem = 'rozet_odulu'
                     and o.detay ->> 'rozet' = r.rozet)
          or (v_bitis is not null and r.kazanildi_at between v_bitis - interval '2 seconds' and v_bitis + interval '5 seconds'));

  -- Günlük görevler + bu maçtan önceki ilerleme (744: yeni havuz görevleri için sayaç bu maç HARİÇ yeniden ölçülür;
  -- eski 3 kimlik (mac_oyna_3…) için 462'deki hesap aynen)
  -- (görev listesi odul_dokumu'dan — get_daily_quests ikinci kez çağrılmaz)
  select coalesce(jsonb_agg(g.j || jsonb_build_object(
           'onceki', case when gh.quest_id is not null then
               least((g.j ->> 'ilerleme')::int, greatest(0,
                 case when not v_bitti or v_ben_terk or not v_bugun_mu
                      then public.gorev_sayaci(g.j ->> 'id', v_me, v_bugun)
                      else public.gorev_olcum(v_me, gh.sayac, coalesce(gs.parametre, gh.parametre),
                             public.gorev_gun_bas(v_bugun), public.gorev_gun_bas(v_bugun + 1), v_tur, v_id) end))
             else
               least((g.j ->> 'ilerleme')::int, greatest(0, public.gorev_sayaci(g.j ->> 'id', v_me, v_bugun) - (
                  case when not v_bitti or v_ben_terk or not v_bugun_mu then 0
                       when g.j ->> 'id' = 'mac_oyna_3' then 1
                       when g.j ->> 'id' = 'mac_kazan_5' then (case when v_kazanan = v_me then 1 else 0 end)
                       when g.j ->> 'id' = 'dogru_25' then v_dogru
                       else 0 end)))
             end)), '[]'::jsonb)
    into v_gorev
    from jsonb_array_elements(coalesce(v_dokum -> 'gorevler', '[]'::jsonb)) as g(j)
    left join public.gorev_havuzu gh on gh.quest_id = g.j ->> 'id'
    left join public.gunluk_gorev_secimi gs on gs.tarih = v_bugun and gs.quest_id = gh.quest_id;

  -- Haftalık görevler (744, ekleyici anahtar): aynı biçim {id, ad, ilerleme, hedef, alindi, onceki}
  perform public.haftalik_secim_yap(v_hafta);
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', gh.quest_id, 'ad', gh.ad_tr, 'hedef', gh.hedef,
           'ilerleme', least(n.simdi, gh.hedef::bigint),
           'alindi', exists (select 1 from public.haftalik_gorev_alimi a
                              where a.user_id = v_me and a.hafta = v_hafta and a.quest_id = gh.quest_id),
           'onceki', least(n.once, n.simdi, gh.hedef::bigint)) order by gs.slot), '[]'::jsonb)
    into v_haftalik
    from public.haftalik_gorev_secimi gs
    join public.gorev_havuzu gh on gh.quest_id = gs.quest_id
    cross join lateral (
      select public.gorev_olcum(v_me, gh.sayac, gh.parametre, public.gorev_gun_bas(v_hafta), public.gorev_gun_bas(v_hafta + 7)) as simdi,
             case when v_bitti and not v_ben_terk and v_bitis >= public.gorev_gun_bas(v_hafta) and v_bitis < public.gorev_gun_bas(v_hafta + 7)
                  then public.gorev_olcum(v_me, gh.sayac, gh.parametre, public.gorev_gun_bas(v_hafta), public.gorev_gun_bas(v_hafta + 7), v_tur, v_id)
                  else public.gorev_olcum(v_me, gh.sayac, gh.parametre, public.gorev_gun_bas(v_hafta), public.gorev_gun_bas(v_hafta + 7)) end as once) n
   where gs.hafta = v_hafta;

  return jsonb_build_object(
    'kaynak', p_kaynak,
    'hazir', v_hazir,
    'bitti', v_bitti,
    'kazanan', v_kazanan,
    'terk', jsonb_build_object('ben', v_ben_terk, 'rakip', v_rakip_terk, 'edenler', to_jsonb(v_edenler)),
    'dokum', v_dokum,
    'level', v_level,
    'lig', v_lig,
    'rozetler', v_rozet,
    'gorevler', v_gorev,
    'haftalik_gorevler', v_haftalik
  );
end $function$;

-- 7h) Engelleme tetikleyicisi: kasa_davetleri dalı (mevcut dallar aynen)
CREATE OR REPLACE FUNCTION public.trg_iletisim_engel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_a uuid; v_b uuid;
begin
  if tg_table_name = 'friendships' then
    if new.durum not in ('bekliyor', 'arkadas') then return new; end if;
    if tg_op = 'UPDATE' and old.durum is not distinct from new.durum then return new; end if;
    v_a := new.requester; v_b := new.addressee;
  elsif tg_table_name = 'matches' then
    if new.durum is distinct from 'bekliyor' then return new; end if;     -- yalnız meydan okuma / rövanş daveti
    v_a := new.oyuncu1; v_b := new.oyuncu2;
  elsif tg_table_name = 'duello_davetleri' then
    v_a := new.kuran; v_b := new.rakip;
  elsif tg_table_name = 'kasa_davetleri' then   -- 950
    v_a := new.kuran; v_b := new.rakip;
  elsif tg_table_name = 'group_match_players' then
    if new.davet_durumu is distinct from 'bekliyor' then return new; end if;
    select g.kurucu into v_a from public.group_matches g where g.id = new.group_match_id;
    v_b := new.user_id;
  elsif tg_table_name = 'duellolar' then
    if tg_op = 'INSERT' and new.onceki_id is null then return new; end if;   -- yalnız rövanş düellosu
    if tg_op = 'UPDATE' and (new.rovans_isteyen is null or old.rovans_isteyen is not distinct from new.rovans_isteyen) then return new; end if;
    v_a := new.oyuncu1; v_b := new.oyuncu2;
  elsif tg_table_name = 'match_messages' then
    select case when m.oyuncu1 = new.user_id then m.oyuncu2 else m.oyuncu1 end into v_b from public.matches m where m.id = new.match_id;
    v_a := new.user_id;
  else
    return new;
  end if;
  if auth.uid() is not null and public.askida_mi(auth.uid()) then
    raise exception 'Hesabın askıya alındı; bu işlemi yapamazsın.';
  end if;
  if public.iletisim_engelli(v_a, v_b) then
    raise exception 'Bu oyuncuyla iletişim kuramazsın.';
  end if;
  return new;
end;
$function$;

-- =====================================================================================
-- 8) YETKİLER: istemci RPC'leri yalnız authenticated; iç fonksiyonlar herkese kapalı
-- =====================================================================================
do $$
declare f text;
begin
  foreach f in array array[
    'kasa_ara(boolean)', 'kasa_aramadan_cik()', 'kasa_aktif_benim()', 'kasa_giris(uuid)',
    'kasa_durum(uuid)', 'kasa_cevap(uuid,smallint)', 'kasa_karar(uuid,boolean)', 'kasa_terk(uuid)',
    'kasa_davet_et(uuid,boolean)', 'kasa_davet_cevap(uuid,boolean)', 'kasa_davet_iptal(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array[
    'kasa_acik_mi()', 'kasa_gosterim_payi()', 'kasa_nabiz_sn()', 'kasa_sinyal_ver(uuid)', 'kasa_kopuk_kim(uuid)',
    'kasa_bot_tarz(uuid)', 'kasa_bot_karar(uuid)', 'kasa_soru_bul(uuid)', 'kasa_altin_soru_bul(uuid)',
    'kasa_olustur(uuid,uuid,boolean,boolean)', 'kasa_soru_ac(uuid,uuid)', 'kasa_tur_baslat(uuid)',
    'kasa_bitir(uuid,uuid,text)', 'trg_sezon_kasa()', 'kasa_karar_uygula(uuid,boolean,boolean)',
    'kasa_cozumle(uuid)', 'kasa_altin_ac(uuid)', 'kasa_sonraki(uuid)', 'kasa_ilerlet(uuid)',
    'kasa_kilitle(uuid)', 'kasa_tik_hepsi()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- >>> TEST DIŞI — cron + realtime (SQL testi bu işaretten sonrasını çalıştırmaz)
-- Realtime: yalnız sinyal tablosu
do $$
begin
  alter publication supabase_realtime add table public.kasa_sinyal;
exception when duplicate_object then null;
end $$;

-- Cron emniyet ağı (istemci okuması zaten ilerletir; bu yalnız asılı kalmayı önler)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'kasa_tik') then
    perform cron.unschedule('kasa_tik');
  end if;
  perform cron.schedule('kasa_tik', '10 seconds', 'select public.kasa_tik_hepsi()');
end $$;
