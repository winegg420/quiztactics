-- ============================================================
-- 700 · AVATAR NİTELİKLERİ: grup / nadirlik / seri / edinme / kademeli açılış (30 Eyl 2026)
--
-- Üç ayrı katman (Ida onayı): GRUP (göz atma; rengi etkilemez) · NADİRLİK (yaygin|nadir|epik|efsanevi) ·
-- SERİ (nullable etiket). Avatar kozmetiktir, oynanışı etkilemez.
--
-- Neden ayrı tablo: 31 hazır avatar `avatar_katalogu`'nda DEĞİL (avatar_onayla'da sabit liste) ve
-- 520'de "o tabloya girmez" kararı var; katalogdaki `nadirlik` kolonu Koleksiyon Puanı'nın (646/648,
-- değerler siradan|nadir|epik|efsanevi, bilerek boş) — dokunulmaz. Bu tablo 31 + 39 = 70 avatarın hepsini
-- tek yerde tutar; anahtar = avatar adresi (profiles.avatar_url ile aynı).
--
-- Kademeli açılış: acilis_zamani gelmemiş avatar oyuncuya hiçbir yerde görünmez (katalog RPC'si,
-- kilitli liste, avatar_onayla — 701). NULL = açık. Bu migration hiçbir tarih atamaz.
-- Nadirlik → Sahne rengi ÖN YÜZÜ hazır ama `avatar_nadirlik_renk = false` (Ida işaretlemeyi bitirince açılır).
--
-- Nadirlik başlangıç değerleri = /avatar-nadirlik sayfasının ön işareti (basit günlük = yaygin, kostümlü = nadir,
-- hikâyeli = epik, özel = efsanevi); Ida yalnız yanlışları değiştirir, sonra ayrı iş olarak veritabanına yazılır.
-- Edinme: bugünkü durum (550'den beri hepsi ücretsiz) → 'ucretsiz'.
-- Tekrar çalıştırılabilir.
-- ============================================================

-- ---------- 1. Ayar ----------
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('avatar_nadirlik_renk', to_jsonb(false),
   '700: true → avatarın Sahne (renkli kare zemin) rengi nadirliğinden türetilir (Yaygın gri-mavi, Nadir yeşil, Epik turuncu, Efsanevi altın). Ida işaretlemeyi onaylayınca açılır.')
on conflict (anahtar) do nothing;

-- ---------- 2. Tablo ----------
create table if not exists public.avatar_nitelikleri (
  url           text primary key check (url ~ '^/avatars/pro2?/[a-z0-9-]+\.svg$'),
  anahtar       text not null unique check (anahtar ~ '^[a-z0-9-]{2,40}$'),
  ad_tr         text not null,
  ad_en         text not null,
  grup          text not null check (grup in ('hayvan', 'insan', 'meslek', 'kahraman', 'fantastik', 'robot', 'uzayli', 'uzay')),
  nadirlik      text not null default 'yaygin' check (nadirlik in ('yaygin', 'nadir', 'epik', 'efsanevi')),
  seri          text check (seri is null or (length(seri) between 2 and 40)),
  edinme        text not null default 'ucretsiz' check (edinme in ('ucretsiz', 'elmas', 'battle_pass', 'turnuva', 'lig', 'seri')),
  acilis_zamani timestamptz,                                   -- null = açık
  sira          integer not null default 0
);
alter table public.avatar_nitelikleri enable row level security;   -- politika yok: yalnız RPC
revoke all on public.avatar_nitelikleri from public, anon, authenticated;

-- ---------- 3. Tohum: 31 hazır avatar ----------
insert into public.avatar_nitelikleri (url, anahtar, ad_tr, ad_en, grup, nadirlik, sira)
select '/avatars/pro/' || v.dosya || '.svg', v.dosya, v.ad_tr, v.ad_en, v.grup, v.nadirlik, v.sira
  from (values
    ('kedi-k01',       'Kedi',       'Cat',        'hayvan',    'yaygin',  1),
    ('kopek-k02',      'Köpek',      'Dog',        'hayvan',    'yaygin',  2),
    ('baykus-k03',     'Baykuş',     'Owl',        'hayvan',    'yaygin',  3),
    ('tilki-k04',      'Tilki',      'Fox',        'hayvan',    'yaygin',  4),
    ('panda-k05',      'Panda',      'Panda',      'hayvan',    'yaygin',  5),
    ('penguen-k06',    'Penguen',    'Penguin',    'hayvan',    'yaygin',  6),
    ('kurbaga-k07',    'Kurbağa',    'Frog',       'hayvan',    'yaygin',  7),
    ('ayi-k08',        'Ayı',        'Bear',       'hayvan',    'yaygin',  8),
    ('maymun-k09',     'Maymun',     'Monkey',     'hayvan',    'yaygin',  9),
    ('dinozor-k10',    'Dinozor',    'Dinosaur',   'hayvan',    'yaygin', 10),
    ('ejderha-k11',    'Ejderha',    'Dragon',     'fantastik', 'epik',   11),
    ('kopekbaligi-k12','Köpekbalığı','Shark',      'hayvan',    'yaygin', 12),
    ('ahtapot-k13',    'Ahtapot',    'Octopus',    'hayvan',    'yaygin', 13),
    ('ari-k14',        'Arı',        'Bee',        'hayvan',    'yaygin', 14),
    ('robot-k15',      'Robot',      'Robot',      'robot',     'epik',   15),
    ('uzayli-k16',     'Uzaylı',     'Alien',      'uzayli',    'epik',   16),
    ('astronot-k17',   'Astronot',   'Astronaut',  'uzay',      'epik',   17),
    ('ninja-k18',      'Ninja',      'Ninja',      'kahraman',  'epik',   18),
    ('korsan-k19',     'Korsan',     'Pirate',     'kahraman',  'nadir',  19),
    ('sovalye-k20',    'Şövalye',    'Knight',     'kahraman',  'nadir',  20),
    ('buyucu-k21',     'Büyücü',     'Wizard',     'fantastik', 'nadir',  21),
    ('dedektif-k22',   'Dedektif',   'Detective',  'meslek',    'nadir',  22),
    ('asci-k23',       'Aşçı',       'Chef',       'meslek',    'yaygin', 23),
    ('profesor-k24',   'Profesör',   'Professor',  'meslek',    'nadir',  24),
    ('viking-k25',     'Viking',     'Viking',     'kahraman',  'nadir',  25),
    ('hayalet-k26',    'Hayalet',    'Ghost',      'fantastik', 'nadir',  26),
    ('zombi-k27',      'Zombi',      'Zombie',     'fantastik', 'nadir',  27),
    ('mumya-k28',      'Mumya',      'Mummy',      'fantastik', 'nadir',  28),
    ('kahraman-k29',   'Kahraman',   'Hero',       'kahraman',  'nadir',  29),
    ('palyaco-k30',    'Palyaço',    'Clown',      'insan',     'nadir',  30),
    ('kral-k31',       'Kral',       'King',       'insan',     'nadir',  31)
  ) as v(dosya, ad_tr, ad_en, grup, nadirlik, sira)
on conflict (url) do nothing;

-- ---------- 4. Tohum: katalog avatarları (39) — adlar ve sıra katalogdan ----------
insert into public.avatar_nitelikleri (url, anahtar, ad_tr, ad_en, grup, nadirlik, sira)
select k.url, k.anahtar, k.ad_tr, k.ad_en,
       case k.anahtar
         when 'bilim-y11' then 'meslek' when 'doktor-y12' then 'meslek' when 'veteriner-y13' then 'meslek'
         when 'pilot-y38' then 'meslek' when 'hostes-y39' then 'meslek' when 'ogrenci-y10' then 'meslek'
         when 'golge-ninja-y14' then 'kahraman' when 'samuray-y15' then 'kahraman' when 'kaptan-y17' then 'kahraman'
         when 'pelerinli-y22' then 'kahraman' when 'gece-y23' then 'kahraman' when 'uzay-sovalye-y24' then 'kahraman'
         when 'kasli-sampiyon-y33' then 'kahraman' when 'demir-pazi-y34' then 'kahraman'
         when 'vampir-y19' then 'fantastik' when 'ates-buyucu-y20' then 'fantastik' when 'canavar-y25' then 'fantastik'
         when 'uzay-kasifi-y18' then 'uzay'
         when 'kristal-uzayli-y28' then 'uzayli' when 'gozsapli-uzayli-y29' then 'uzayli'
         when 'mekanik-y21' then 'robot' when 'savas-robotu-y30' then 'robot' when 'siborg-y31' then 'robot' when 'android-y32' then 'robot'
         when 'kedili-genc-y36' then 'hayvan' when 'kedili-kiz-y37' then 'hayvan'
         else 'insan' end,
       case k.anahtar
         when 'golge-ninja-y14' then 'epik' when 'samuray-y15' then 'epik' when 'noel-baba-y16' then 'epik'
         when 'kaptan-y17' then 'epik' when 'uzay-kasifi-y18' then 'epik' when 'vampir-y19' then 'epik'
         when 'ates-buyucu-y20' then 'epik' when 'mekanik-y21' then 'epik' when 'uzay-sovalye-y24' then 'epik'
         when 'canavar-y25' then 'epik' when 'android-y32' then 'epik' when 'pilot-y38' then 'epik'
         when 'pelerinli-y22' then 'nadir' when 'gece-y23' then 'nadir' when 'hostes-y39' then 'nadir'
         when 'yuce-kral-y26' then 'efsanevi' when 'kralice-y27' then 'efsanevi'
         when 'kristal-uzayli-y28' then 'efsanevi' when 'gozsapli-uzayli-y29' then 'efsanevi'
         when 'savas-robotu-y30' then 'efsanevi' when 'siborg-y31' then 'efsanevi'
         else 'yaygin' end,
       k.sira
  from public.avatar_katalogu k
on conflict (url) do nothing;

-- ---------- 5. Kademeli açılış: tek kural ----------
-- Açık mı: acilis_zamani yok ya da geldi. Tabloda kaydı olmayan avatar (ileride eklenen) açık sayılır.
create or replace function public.avatar_acilmis_mi(p_url text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select n.acilis_zamani is null or n.acilis_zamani <= now()
                     from public.avatar_nitelikleri n where n.url = p_url), true);
$$;
revoke execute on function public.avatar_acilmis_mi(text) from public, anon, authenticated;

-- ---------- 6. Oyuncu RPC'leri (yalnız authenticated) ----------
-- Henüz açılmamış avatarların adresleri: istemci, koddaki 31 hazır avatarı bu listeyle süzer.
create or replace function public.avatar_kilitli_urller()
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  return coalesce((select array_agg(n.url order by n.sira)
                     from public.avatar_nitelikleri n
                    where n.acilis_zamani is not null and n.acilis_zamani > now()), array[]::text[]);
end;
$$;
revoke execute on function public.avatar_kilitli_urller() from public, anon;
grant execute on function public.avatar_kilitli_urller() to authenticated;

-- Sahne rengi için nadirlikler: bayrak kapalıyken BOŞ döner (arayüz eskisi gibi kalır).
create or replace function public.avatar_nadirlik_renkleri()
returns table (url text, nadirlik text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_acik boolean;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  select coalesce(case jsonb_typeof(deger)
                    when 'boolean' then (deger #>> '{}')::boolean
                    when 'string' then lower(deger #>> '{}') in ('true', '1', 'evet')
                    else false end, false)
    into v_acik from public.oyun_ayarlari where anahtar = 'avatar_nadirlik_renk';
  if not coalesce(v_acik, false) then return; end if;
  return query select n.url, n.nadirlik from public.avatar_nitelikleri n;
end;
$$;
revoke execute on function public.avatar_nadirlik_renkleri() from public, anon;
grant execute on function public.avatar_nadirlik_renkleri() to authenticated;

-- /avatar-nadirlik (yalnız sahip): bütün satırlar + aktif mi (hazır avatarlar hep aktif, katalog aktif kolonu)
create or replace function public.avatar_nitelik_yonetici()
returns table (url text, anahtar text, ad_tr text, ad_en text, grup text, nadirlik text, seri text,
               edinme text, acilis_zamani timestamptz, sira integer, aktif boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  if not public.sahip_mi() then raise exception 'Yalnız sahip'; end if;
  return query
    select n.url, n.anahtar, n.ad_tr, n.ad_en, n.grup, n.nadirlik, n.seri, n.edinme, n.acilis_zamani, n.sira,
           coalesce(k.aktif, true)
      from public.avatar_nitelikleri n
      left join public.avatar_katalogu k on k.url = n.url
     order by n.sira, n.anahtar;
end;
$$;
revoke execute on function public.avatar_nitelik_yonetici() from public, anon;
grant execute on function public.avatar_nitelik_yonetici() to authenticated;

do $$
declare v_toplam int; v_dagilim text;
begin
  select count(*) into v_toplam from public.avatar_nitelikleri;
  select string_agg(nadirlik || ' ' || n, ' · ') into v_dagilim
    from (select nadirlik, count(*) n from public.avatar_nitelikleri group by nadirlik order by nadirlik) t;
  raise notice '700 satır: % (70 olmalı) — %', v_toplam, v_dagilim;
end $$;
