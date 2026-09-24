-- ============================================================
-- 596 · 595'TEKİ 12 YENİ AVATARDAN 8'İ AÇIK (Ida, 24 Eyl 2026)
--
-- Açılan (ücretsiz, herkes seçer; avatar_fiyati 550'den beri 0):
--   kristal-uzayli-y28 · gozsapli-uzayli-y29 · savas-robotu-y30 · siborg-y31 · android-y32 ·
--   kedili-kiz-y37 · pilot-y38 · hostes-y39
-- KAPALI kalan: kasli-sampiyon-y33 · demir-pazi-y34 · fitness-kralicesi-y35 · kedili-genc-y36
--
-- 595'in dosya sonundaki "açma adımı" (1 + 2) bu 8 anahtarla: onay 'girsin' + aktif = true, sonra gizli
-- botlar 550 › bölüm 6 kuralıyla (31 sabit + AKTİF katalog, id sırasıyla döngüsel) yeniden dağılır —
-- kapalı 4 avatar aktif olmadığı için botlara gitmez. Açık botlar ve avatarsız botlar değişmez.
-- Yalnız veri; tablo, kısıt, fonksiyon, yetki değişmez. Tekrar çalıştırılabilir.
-- ============================================================

update public.avatar_katalogu
   set aktif = true,
       onay = 'girsin',
       onay_zamani = coalesce(onay_zamani, now())
 where anahtar in ('kristal-uzayli-y28', 'gozsapli-uzayli-y29', 'savas-robotu-y30', 'siborg-y31',
                   'android-y32', 'kedili-kiz-y37', 'pilot-y38', 'hostes-y39')
   and (not aktif or onay is distinct from 'girsin');

-- Gizli botlar: 550 › bölüm 6 (461'in kuralı) aynen — liste 31 sabit + aktif katalog
with liste as (
  select array[
    '/avatars/pro/kedi-k01.svg', '/avatars/pro/kopek-k02.svg', '/avatars/pro/baykus-k03.svg',
    '/avatars/pro/tilki-k04.svg', '/avatars/pro/panda-k05.svg', '/avatars/pro/penguen-k06.svg',
    '/avatars/pro/kurbaga-k07.svg', '/avatars/pro/ayi-k08.svg', '/avatars/pro/maymun-k09.svg',
    '/avatars/pro/dinozor-k10.svg', '/avatars/pro/ejderha-k11.svg', '/avatars/pro/kopekbaligi-k12.svg',
    '/avatars/pro/ahtapot-k13.svg', '/avatars/pro/ari-k14.svg', '/avatars/pro/robot-k15.svg',
    '/avatars/pro/uzayli-k16.svg', '/avatars/pro/astronot-k17.svg', '/avatars/pro/ninja-k18.svg',
    '/avatars/pro/korsan-k19.svg', '/avatars/pro/sovalye-k20.svg', '/avatars/pro/buyucu-k21.svg',
    '/avatars/pro/dedektif-k22.svg', '/avatars/pro/asci-k23.svg', '/avatars/pro/profesor-k24.svg',
    '/avatars/pro/viking-k25.svg', '/avatars/pro/hayalet-k26.svg', '/avatars/pro/zombi-k27.svg',
    '/avatars/pro/mumya-k28.svg', '/avatars/pro/kahraman-k29.svg', '/avatars/pro/palyaco-k30.svg',
    '/avatars/pro/kral-k31.svg'
  ] || coalesce((select array_agg(k.url order by k.sira, k.anahtar) from public.avatar_katalogu k where k.aktif),
                array[]::text[]) as a
), sira as (
  select p.id, row_number() over (order by p.id) - 1 as i
    from public.profiles p
   where coalesce(p.is_bot, false)
     and not public.acik_bot_mu(p.is_bot, p.bot_turu)
     and not coalesce(p.acik_bot, false)
     and (p.avatar_url like '/avatars/pro/%' or p.avatar_url like '/avatars/pro2/%')
)
update public.profiles p
   set avatar_url = liste.a[(sira.i % cardinality(liste.a)) + 1]
  from sira, liste
 where p.id = sira.id
   and p.avatar_url is distinct from liste.a[(sira.i % cardinality(liste.a)) + 1];

do $$
declare v_acik text; v_kapali text; v_bot int;
begin
  select string_agg(anahtar, ', ' order by sira) filter (where aktif),
         string_agg(anahtar, ', ' order by sira) filter (where not aktif)
    into v_acik, v_kapali from public.avatar_katalogu where sira between 28 and 39 and url like '%-y%';
  select count(*) into v_bot from public.profiles p join public.avatar_katalogu k on k.url = p.avatar_url
   where coalesce(p.is_bot, false) and not k.aktif;
  raise notice '596 açık: %', coalesce(v_acik, '(yok)');
  raise notice '596 kapalı: %', coalesce(v_kapali, '(yok)');
  raise notice '596 kapalı avatarlı bot: % (0 olmalı)', v_bot;
end $$;
