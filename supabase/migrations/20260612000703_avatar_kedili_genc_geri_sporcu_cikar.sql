-- ============================================================
-- 703 · AVATAR: KEDİLİ GENÇ GERİ GİRER, SPORCU ÇIKAR (30 Eyl 2026, Ida)
--
-- Ida 24 Eyl "girmesin" kararını Kedili Genç'in yeni çizimiyle geri aldı; Sporcu oyundan çıkar.
--   kedili-genc-y36 → aktif = true,  onay = 'girsin'    (Dükkân / Koleksiyon / Profil / Kurulum listelerinde görünür)
--   sporcu-y09      → aktif = false, onay = 'girmesin'  (hiçbir listede yok; satır ve SVG dosyası SİLİNMEZ)
-- Aktif avatar sayısı 62 kalır (31 hazır + 31 katalog). fiyat, edinme (ücretsiz), acilis_zamani ve nadirlik DEĞİŞMEZ.
-- Takılı avatar korunur: oyuncunun profiles.avatar_url'ü DOKUNULMAZ (adres aynı SVG'yi göstermeye devam eder).
-- Yalnız Sporcu'yu kullanan GİZLİ BOTLAR 649'daki kuralla aktif listeye taşınır (canlıda 2 bot; gerçek oyuncu yok — ölçüldü).
-- Yalnız veri; tablo, fonksiyon, yetki, politika değişmez. Tekrar çalıştırılabilir.
-- ============================================================

update public.avatar_katalogu
   set aktif = true, onay = 'girsin', onay_zamani = now()
 where anahtar = 'kedili-genc-y36' and (not aktif or onay is distinct from 'girsin');

update public.avatar_katalogu
   set aktif = false, onay = 'girmesin', onay_zamani = now()
 where anahtar = 'sporcu-y09' and (aktif or onay is distinct from 'girmesin');

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
declare v_acik int; v_bot int; v_insan int;
begin
  select count(*) into v_acik from public.avatar_katalogu where aktif and onay = 'girsin';
  select count(*) into v_bot from public.profiles p join public.avatar_katalogu k on k.url = p.avatar_url
   where coalesce(p.is_bot, false) and not k.aktif;
  select count(*) into v_insan from public.profiles p join public.avatar_katalogu k on k.url = p.avatar_url
   where not coalesce(p.is_bot, false) and not k.aktif;
  raise notice '703 katalogda açık: % (31 olmalı; +31 hazır = 62)', v_acik;
  raise notice '703 kapalı avatarlı bot: % (0 olmalı) · insan: % (takılı avatar korunur; bilgi)', v_bot, v_insan;
end $$;
