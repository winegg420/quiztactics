-- ============================================================
-- 1009 · 6 YENİ AVATAR (4. set) — Ida onayladı, doğrudan AÇIK (9 Eki 2026)
--
-- Çizim: araclar/avatar-yeni-kaynak/ (20 adaydan 6'sı) → public/avatars/pro2/<anahtar>.svg (c2pa üst verisi ayıklandı).
--   Kovboy y40 · Korkuluk y41 (Nadir, ücretsiz) · Kurt Adam y42 · Balkabağı Adam y43 (Epik, elmas) ·
--   Güneş Kralı y44 · Ay Tanrıçası y45 (Efsanevi, elmas).
-- Fiyat nadirlikten gelir (820: Epik 150 · Efsanevi 300, oyun_ayarlari.elmas_avatar_*); burada fiyat YOK.
-- Grup: Kovboy kahraman · Korkuluk fantastik · Kurt Adam fantastik · Balkabağı Adam fantastik ·
--       Güneş Kralı insan (Kral / Yüce Kral ile aynı) · Ay Tanrıçası fantastik. acilis_zamani NULL (açık).
-- DEĞİŞMEZ: avatar_katalogu.nadirlik (Koleksiyon Puanı, bilerek boş), mevcut satırlar, sahiplikler, botlar
-- (gizli bot avatarları yeniden dağıtılmaz). Yalnız veri; tablo, kısıt, fonksiyon, yetki değişmez.
-- 'hazır 31' listesine ve avatar_onayla sabit listesine GİRMEZ: pro2 avatarları katalogdan gelir.
-- Tekrar çalıştırılabilir (on conflict do nothing).
-- ============================================================

insert into public.avatar_katalogu (anahtar, url, ad_tr, ad_en, tur, aktif, onay, onay_zamani, sira) values
  ('kovboy-y40',        '/avatars/pro2/kovboy-y40.svg',        'Kovboy',         'Cowboy',      'gunluk',   true, 'girsin', now(), 40),
  ('korkuluk-y41',      '/avatars/pro2/korkuluk-y41.svg',      'Korkuluk',       'Scarecrow',   'kostumlu', true, 'girsin', now(), 41),
  ('kurt-adam-y42',     '/avatars/pro2/kurt-adam-y42.svg',     'Kurt Adam',      'Werewolf',    'kostumlu', true, 'girsin', now(), 42),
  ('balkabagi-adam-y43','/avatars/pro2/balkabagi-adam-y43.svg','Balkabağı Adam', 'Pumpkin Head','kostumlu', true, 'girsin', now(), 43),
  ('gunes-kral-y44',    '/avatars/pro2/gunes-kral-y44.svg',    'Güneş Kralı',    'Sun King',    'kostumlu', true, 'girsin', now(), 44),
  ('ay-tanricasi-y45',  '/avatars/pro2/ay-tanricasi-y45.svg',  'Ay Tanrıçası',   'Moon Goddess','kostumlu', true, 'girsin', now(), 45)
on conflict (anahtar) do nothing;

insert into public.avatar_nitelikleri (url, anahtar, ad_tr, ad_en, grup, nadirlik, edinme, sira) values
  ('/avatars/pro2/kovboy-y40.svg',         'kovboy-y40',         'Kovboy',         'Cowboy',       'kahraman',  'nadir',    'ucretsiz', 40),
  ('/avatars/pro2/korkuluk-y41.svg',       'korkuluk-y41',       'Korkuluk',       'Scarecrow',    'fantastik', 'nadir',    'ucretsiz', 41),
  ('/avatars/pro2/kurt-adam-y42.svg',      'kurt-adam-y42',      'Kurt Adam',      'Werewolf',     'fantastik', 'epik',     'elmas',    42),
  ('/avatars/pro2/balkabagi-adam-y43.svg', 'balkabagi-adam-y43', 'Balkabağı Adam', 'Pumpkin Head', 'fantastik', 'epik',     'elmas',    43),
  ('/avatars/pro2/gunes-kral-y44.svg',     'gunes-kral-y44',     'Güneş Kralı',    'Sun King',     'insan',     'efsanevi', 'elmas',    44),
  ('/avatars/pro2/ay-tanricasi-y45.svg',   'ay-tanricasi-y45',   'Ay Tanrıçası',   'Moon Goddess', 'fantastik', 'efsanevi', 'elmas',    45)
on conflict (url) do nothing;

do $$
declare v_katalog int; v_nitelik int; v_dagilim text;
begin
  select count(*) into v_katalog from public.avatar_katalogu
   where sira between 40 and 45 and aktif and onay = 'girsin';
  select count(*), string_agg(nadirlik || '/' || edinme, ' · ' order by sira)
    into v_nitelik, v_dagilim
    from public.avatar_nitelikleri where sira between 40 and 45;
  if v_katalog <> 6 or v_nitelik <> 6 then
    raise exception '1009: beklenen 6+6 satır, bulunan katalog % · nitelik %', v_katalog, v_nitelik;
  end if;
  raise notice '1009: 6 yeni avatar açık — %', v_dagilim;
end $$;
