-- ============================================================
-- 595: 12 YENİ PROFİL AVATARI (3. set) — KAPALI başlar (aktif = false)
--
-- 2 uzaylı · 3 robot/siborg · 3 vücut geliştirmeci · omzunda yavru kedi olan 2 insan · pilot + hostes.
-- Çizim: oyun/components/AvatarProIllustrations3.jsx → statik dosyalar public/avatars/pro2/<anahtar>.svg
-- (520'deki url kısıtı `^/avatars/pro2/…` aynen kalsın diye klasör pro2; kısıt DEĞİŞMEDİ).
--
-- DİKKAT: 550'den beri avatar_katalogu.aktif = true "herkese açık + ücretsiz" demek
-- (avatar_acik_mi = aktif, avatar_katalogu_oyun yalnız aktif satırları listeler). Bu yüzden 12 satır
-- aktif = false eklenir: normal oyuncu görmez/seçemez, gizli botlar almaz. Sahip /avatar-onizleme'de
-- görür (avatar_onizleme_listesi aktif'e bakmaz — 520 › bölüm 6) ve avatar_onay_kaydet ile
-- "girsin / girmesin" der. Fiyat: avatar_fiyati (550) her zaman 0 → ücretsiz.
--
-- Yalnız veri: tablo, kısıt, fonksiyon, yetki değişmez. Tekrar çalıştırılabilir (on conflict do nothing;
-- sonradan açılmış satırın aktif/onay değeri ezilmez).
-- ============================================================

insert into public.avatar_katalogu (anahtar, url, ad_tr, ad_en, tur, aktif, sira) values
  ('kristal-uzayli-y28',    '/avatars/pro2/kristal-uzayli-y28.svg',    'Kristal Uzaylı',    'Crystal Alien',    'kostumlu', false, 28),
  ('gozsapli-uzayli-y29',   '/avatars/pro2/gozsapli-uzayli-y29.svg',   'Göz Saplı Uzaylı',  'Eyestalk Alien',   'kostumlu', false, 29),
  ('savas-robotu-y30',      '/avatars/pro2/savas-robotu-y30.svg',      'Savaş Robotu',      'Battle Mech',      'kostumlu', false, 30),
  ('siborg-y31',            '/avatars/pro2/siborg-y31.svg',            'Siborg',            'Cyborg',           'kostumlu', false, 31),
  ('android-y32',           '/avatars/pro2/android-y32.svg',           'Android',           'Android',          'kostumlu', false, 32),
  ('kasli-sampiyon-y33',    '/avatars/pro2/kasli-sampiyon-y33.svg',    'Kaslı Şampiyon',    'Muscle Champ',     'gunluk',   false, 33),
  ('demir-pazi-y34',        '/avatars/pro2/demir-pazi-y34.svg',        'Demir Pazı',        'Iron Biceps',      'gunluk',   false, 34),
  ('fitness-kralicesi-y35', '/avatars/pro2/fitness-kralicesi-y35.svg', 'Fitness Kraliçesi', 'Fitness Queen',    'gunluk',   false, 35),
  ('kedili-genc-y36',       '/avatars/pro2/kedili-genc-y36.svg',       'Kedili Genç',       'Cat Buddy',        'gunluk',   false, 36),
  ('kedili-kiz-y37',        '/avatars/pro2/kedili-kiz-y37.svg',        'Kedili Kız',        'Kitten Friend',    'gunluk',   false, 37),
  ('pilot-y38',             '/avatars/pro2/pilot-y38.svg',             'Pilot',             'Pilot',            'gunluk',   false, 38),
  ('hostes-y39',            '/avatars/pro2/hostes-y39.svg',            'Hostes',            'Flight Attendant', 'gunluk',   false, 39)
on conflict (anahtar) do nothing;

do $$
declare v_kapali int; v_acik int;
begin
  select count(*) filter (where not aktif), count(*) filter (where aktif)
    into v_kapali, v_acik
    from public.avatar_katalogu
   where sira between 28 and 39;
  raise notice '595: 12 yeni avatar — kapalı %, açık % (onaydan önce hepsi kapalı olmalı)', v_kapali, v_acik;
end $$;

-- ============================================================
-- IDA ONAYLADIKTAN SONRA (/avatar-onizleme'de "Oyuna girsin" seçildikten sonra) — SQL düzenleyicide çalıştır.
-- Bu dosya zaten uygulanmış olacağından aşağıdakiler YORUMDUR; yeni migration gerekmez.
--
-- 1) Açma — TEK SATIR (yalnız "girsin" dediklerin açılır; "girmesin"/karar verilmemiş kapalı kalır):
--
-- update public.avatar_katalogu set aktif = true where anahtar in ('kristal-uzayli-y28','gozsapli-uzayli-y29','savas-robotu-y30','siborg-y31','android-y32','kasli-sampiyon-y33','demir-pazi-y34','fitness-kralicesi-y35','kedili-genc-y36','kedili-kiz-y37','pilot-y38','hostes-y39') and onay = 'girsin';
--
-- 2) Gizli botlar yeni açılanları da kullansın — 550 › bölüm 6 (461'in kuralı) aynen: profesyonel avatarlı
--    (pro ya da pro2) gizli botlar id sırasıyla 31 sabit + AKTİF katalog (sira sırası) listesine döngüsel
--    dağılır; seçim bot kimliğinden sabittir, aynı veride tekrar çalışınca aynı sonuç. Açık botlar
--    (/avatars/botN.svg) ve avatarsız (baş harf) botlar değişmez. Kapalı (aktif = false) avatar botlara gitmez.
--
-- with liste as (
--   select array[
--     '/avatars/pro/kedi-k01.svg', '/avatars/pro/kopek-k02.svg', '/avatars/pro/baykus-k03.svg',
--     '/avatars/pro/tilki-k04.svg', '/avatars/pro/panda-k05.svg', '/avatars/pro/penguen-k06.svg',
--     '/avatars/pro/kurbaga-k07.svg', '/avatars/pro/ayi-k08.svg', '/avatars/pro/maymun-k09.svg',
--     '/avatars/pro/dinozor-k10.svg', '/avatars/pro/ejderha-k11.svg', '/avatars/pro/kopekbaligi-k12.svg',
--     '/avatars/pro/ahtapot-k13.svg', '/avatars/pro/ari-k14.svg', '/avatars/pro/robot-k15.svg',
--     '/avatars/pro/uzayli-k16.svg', '/avatars/pro/astronot-k17.svg', '/avatars/pro/ninja-k18.svg',
--     '/avatars/pro/korsan-k19.svg', '/avatars/pro/sovalye-k20.svg', '/avatars/pro/buyucu-k21.svg',
--     '/avatars/pro/dedektif-k22.svg', '/avatars/pro/asci-k23.svg', '/avatars/pro/profesor-k24.svg',
--     '/avatars/pro/viking-k25.svg', '/avatars/pro/hayalet-k26.svg', '/avatars/pro/zombi-k27.svg',
--     '/avatars/pro/mumya-k28.svg', '/avatars/pro/kahraman-k29.svg', '/avatars/pro/palyaco-k30.svg',
--     '/avatars/pro/kral-k31.svg'
--   ] || coalesce((select array_agg(k.url order by k.sira, k.anahtar) from public.avatar_katalogu k where k.aktif),
--                 array[]::text[]) as a
-- ), sira as (
--   select p.id, row_number() over (order by p.id) - 1 as i
--     from public.profiles p
--    where coalesce(p.is_bot, false)
--      and not public.acik_bot_mu(p.is_bot, p.bot_turu)
--      and not coalesce(p.acik_bot, false)
--      and (p.avatar_url like '/avatars/pro/%' or p.avatar_url like '/avatars/pro2/%')
-- )
-- update public.profiles p
--    set avatar_url = liste.a[(sira.i % cardinality(liste.a)) + 1]
--   from sira, liste
--  where p.id = sira.id
--    and p.avatar_url is distinct from liste.a[(sira.i % cardinality(liste.a)) + 1];
-- ============================================================
