-- ============================================================
-- 649 · AVATAR KATALOĞU — IDA'NIN /avatar-onizleme SEÇİMİ OYUNA İŞLENDİ (25 Eyl 2026)
--
-- Seçim sunucuda zaten kayıtlıydı (onay kolonu); oyuncuya görünürlük ise yalnız `aktif`e bağlı
-- (550: avatar_katalogu.aktif yeter). Bu migration ikisini eşitler — tutarlılık kuralı:
--   onay = 'girsin'   → aktif = true   (39 − 8 = 31 avatar)
--   onay = 'girmesin' → aktif = false  (8 avatar)
-- GİRMESİN: veteriner-y13 · ogrenci-y10 · sakalli-y07 · kedili-genc-y36 · fitness-kralicesi-y35 ·
--           demir-pazi-y34 · kasli-sampiyon-y33 · android-y32  (596'da açılan android kapanır)
-- Kapanan avatarı kullanan gizli botlar 596'daki kuralla (31 sabit + AKTİF katalog, döngüsel) taşınır;
-- yalnız kapananların botları etkilenir. Gerçek oyuncu: kapanan avatarda kimse yok (ölçüldü).
-- kozmetik_satis_acik dokunulmaz — kayıt sunucuda durur, satış açılınca yansır.
-- Yalnız veri; tablo, fonksiyon, yetki, politika değişmez. Tekrar çalıştırılabilir.
-- ============================================================

update public.avatar_katalogu
   set aktif = false
 where anahtar in ('veteriner-y13', 'ogrenci-y10', 'sakalli-y07', 'kedili-genc-y36',
                   'fitness-kralicesi-y35', 'demir-pazi-y34', 'kasli-sampiyon-y33', 'android-y32')
   and (aktif or onay is distinct from 'girmesin');

update public.avatar_katalogu
   set onay = 'girmesin', onay_zamani = coalesce(onay_zamani, now())
 where anahtar in ('veteriner-y13', 'ogrenci-y10', 'sakalli-y07', 'kedili-genc-y36',
                   'fitness-kralicesi-y35', 'demir-pazi-y34', 'kasli-sampiyon-y33', 'android-y32')
   and onay is distinct from 'girmesin';

-- Kalan tüm avatarlar girsin (zaten öyle; tutarlılık için aktif de doğrulanır)
update public.avatar_katalogu
   set aktif = true, onay = 'girsin', onay_zamani = coalesce(onay_zamani, now())
 where anahtar not in ('veteriner-y13', 'ogrenci-y10', 'sakalli-y07', 'kedili-genc-y36',
                       'fitness-kralicesi-y35', 'demir-pazi-y34', 'kasli-sampiyon-y33', 'android-y32')
   and (not aktif or onay is distinct from 'girsin');

-- Kapanan avatarlı gizli botlar → aktif listeden, bot kimliğine göre sabit (hashtext) seçim
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
)
update public.profiles p
   set avatar_url = liste.a[(abs(hashtext(p.id::text)) % cardinality(liste.a)) + 1]
  from liste, public.avatar_katalogu k
 where k.url = p.avatar_url and not k.aktif
   and coalesce(p.is_bot, false)
   and not public.acik_bot_mu(p.is_bot, p.bot_turu)
   and not coalesce(p.acik_bot, false);

do $$
declare v_acik int; v_kapali text; v_bot int; v_insan int;
begin
  select count(*) into v_acik from public.avatar_katalogu where aktif and onay = 'girsin';
  select string_agg(anahtar, ', ' order by sira) into v_kapali from public.avatar_katalogu where not aktif;
  select count(*) into v_bot from public.profiles p join public.avatar_katalogu k on k.url = p.avatar_url
   where coalesce(p.is_bot, false) and not k.aktif;
  select count(*) into v_insan from public.profiles p join public.avatar_katalogu k on k.url = p.avatar_url
   where not coalesce(p.is_bot, false) and not k.aktif;
  raise notice '649 açık (aktif+girsin): % (31 olmalı)', v_acik;
  raise notice '649 kapalı: %', v_kapali;
  raise notice '649 kapalı avatarlı bot: % (0 olmalı) · insan: % (0 olmalı)', v_bot, v_insan;
end $$;
