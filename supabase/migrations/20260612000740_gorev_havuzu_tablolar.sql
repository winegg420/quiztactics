-- 740 — Görev sistemi genişlemesi (1/4): havuz, seçim ve alım tabloları + ayarlar. Ida onaylı kararlar (30 Eyl 2026):
--  * GÜNLÜK görev: her gün havuzdan 3 görev (1 kolay + 1 orta + 1 zor), herkese aynı (tarihten deterministik).
--  * HAFTALIK görev: 3 görev (pazartesi 00:00 TSİ'de yenilenir, ligle aynı hafta) + "Haftalık sandık".
--  * Görev tanımları (hedef, TR/EN ad) koda değil `gorev_havuzu` tablosuna gömülü; ödül rakamları `oyun_ayarlari`nda.
--  * Antrenman (açık bot) maçları görevlere sayılmaz; arkadaş/turnuva görevi yok.
-- Tablolar RLS açık + politika yok + tüm yetkiler kapalı: yalnız security definer RPC'ler (741–743) okur/yazar.

-- ---------------------------------------------------------------- ayarlar (TEST değerleri; Ida değiştirir)
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('gorev_haftalik_coin',              '50',            'Haftalık görev ödülü: coin (günlük tavan kuralı günlük görevle aynı)'),
  ('sp_haftalik_gorev',                '25',            'Haftalık görev ödülü: SP (BP sahibinde x bp_sp_carpan)'),
  ('gorev_haftalik_sandik_sp',         '75',            'Haftalık sandık: SP'),
  ('gorev_haftalik_sandik_joker_adet', '1',             'Haftalık sandık: joker adedi'),
  ('gorev_haftalik_sandik_joker_tur',  '"soru_degistir"', 'Haftalık sandık: joker türü')
on conflict (anahtar) do nothing;

-- ---------------------------------------------------------------- havuz
create table if not exists public.gorev_havuzu (
  quest_id  text primary key,
  kapsam    text not null check (kapsam in ('gunluk', 'haftalik')),
  zorluk    text check (zorluk in ('kolay', 'orta', 'zor')),
  sayac     text not null check (sayac in ('mac_oyna', 'mac_kazan', 'dogru_soru', 'duello_mac', 'duello_galibiyet',
                                           'kategori_dogru', 'farkli_kategori_dogru')),
  hedef     int  not null check (hedef > 0),
  parametre jsonb not null default '{}'::jsonb,   -- kategori_dogru: {"kategori":"gunun"} = günün kategorisi (seçimde somutlaşır)
  ad_tr     text not null,
  ad_en     text not null,
  aktif     boolean not null default true,
  check ((kapsam = 'gunluk' and zorluk is not null) or (kapsam = 'haftalik' and zorluk is null))
);
alter table public.gorev_havuzu enable row level security;
revoke all on public.gorev_havuzu from anon, authenticated;

insert into public.gorev_havuzu (quest_id, kapsam, zorluk, sayac, hedef, parametre, ad_tr, ad_en) values
  -- günlük · kolay
  ('gun_mac_oyna_2',          'gunluk', 'kolay', 'mac_oyna',         2,  '{}', '2 maç oyna',                                   'Play 2 matches'),
  ('gun_mac_oyna_3',          'gunluk', 'kolay', 'mac_oyna',         3,  '{}', '3 maç oyna',                                   'Play 3 matches'),
  ('gun_dogru_10',            'gunluk', 'kolay', 'dogru_soru',       10, '{}', '10 soruyu doğru cevapla',                      'Answer 10 questions correctly'),
  -- günlük · orta
  ('gun_mac_kazan_2',         'gunluk', 'orta',  'mac_kazan',        2,  '{}', '2 maç kazan',                                  'Win 2 matches'),
  ('gun_duello_mac_1',        'gunluk', 'orta',  'duello_mac',       1,  '{}', 'Düello''da 1 maç oyna',                        'Play 1 Duel match'),
  ('gun_dogru_25',            'gunluk', 'orta',  'dogru_soru',       25, '{}', '25 soruyu doğru cevapla',                      'Answer 25 questions correctly'),
  ('gun_duello_galibiyet_1',  'gunluk', 'orta',  'duello_galibiyet', 1,  '{}', 'Düello''da 1 galibiyet al',                    'Win 1 Duel match'),
  -- günlük · zor
  ('gun_mac_kazan_5',         'gunluk', 'zor',   'mac_kazan',        5,  '{}', '5 maç kazan',                                  'Win 5 matches'),
  ('gun_dogru_50',            'gunluk', 'zor',   'dogru_soru',       50, '{}', '50 soruyu doğru cevapla',                      'Answer 50 questions correctly'),
  ('gun_kategori_dogru_10',   'gunluk', 'zor',   'kategori_dogru',   10, '{"kategori":"gunun"}', 'Bugünün kategorisinde 10 soruyu doğru cevapla', 'Answer 10 questions correctly in today''s category'),
  -- haftalık (her hafta 3'ü seçilir)
  ('hft_mac_oyna_15',         'haftalik', null,  'mac_oyna',         15,  '{}', 'Bu hafta 15 maç oyna',                        'Play 15 matches this week'),
  ('hft_duello_galibiyet_3',  'haftalik', null,  'duello_galibiyet', 3,   '{}', 'Düello''da 3 galibiyet',                      'Win 3 Duel matches'),
  ('hft_farkli_kategori_5',   'haftalik', null,  'farkli_kategori_dogru', 5, '{}', '5 farklı kategoride doğru cevap',           'Answer correctly in 5 different categories'),
  ('hft_mac_kazan_7',         'haftalik', null,  'mac_kazan',        7,   '{}', 'Bu hafta 7 maç kazan',                        'Win 7 matches this week'),
  ('hft_dogru_100',           'haftalik', null,  'dogru_soru',       100, '{}', '100 soruyu doğru cevapla',                    'Answer 100 questions correctly'),
  ('hft_duello_mac_5',        'haftalik', null,  'duello_mac',       5,   '{}', 'Düello''da 5 maç oyna',                       'Play 5 Duel matches')
on conflict (quest_id) do nothing;

-- ---------------------------------------------------------------- seçimler (tembel yazılır; yazılınca o gün/hafta DEĞİŞMEZ)
create table if not exists public.gunluk_gorev_secimi (
  tarih     date not null,
  zorluk    text not null check (zorluk in ('kolay', 'orta', 'zor')),
  quest_id  text not null,
  parametre jsonb not null default '{}'::jsonb,   -- kategori görevinde {"kategori":"<anahtar>"} (günün kategorisi)
  created_at timestamptz not null default now(),
  primary key (tarih, zorluk)
);
create table if not exists public.haftalik_gorev_secimi (
  hafta     date not null,                        -- haftanın pazartesisi (TSİ)
  slot      int  not null check (slot between 1 and 3),
  quest_id  text not null,
  created_at timestamptz not null default now(),
  primary key (hafta, slot)
);

-- Haftalık alım kaydı (görevler + sandık; sandık quest_id = 'sandik'). quest_progress'e dokunulmaz.
create table if not exists public.haftalik_gorev_alimi (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  hafta     date not null,
  quest_id  text not null,
  odul      jsonb not null default '{}'::jsonb,
  alindi_at timestamptz not null default now(),
  primary key (user_id, hafta, quest_id)
);

alter table public.gunluk_gorev_secimi  enable row level security;
alter table public.haftalik_gorev_secimi enable row level security;
alter table public.haftalik_gorev_alimi enable row level security;
revoke all on public.gunluk_gorev_secimi, public.haftalik_gorev_secimi, public.haftalik_gorev_alimi from anon, authenticated;
