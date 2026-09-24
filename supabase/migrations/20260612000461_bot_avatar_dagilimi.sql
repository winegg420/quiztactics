-- 461: Bot avatarları 31 profesyonel avatara eşit dağıtılır (A.2 — "maç sonunda rakip Ida'nın avatarıyla").
--
-- Kök sebep (ölçüldü, 24 Eyl 2026): kod hatası değil, veri. Migration 256 eski k01…k31 avatarlarını
-- yalnız ~10 profesyonel avatara eşledi; avatarlı 78 gizli botun 18'i `kahraman-k29` (Ida'nın avatarı),
-- 13'ü `profesor-k24`, 12'si `kedi-k01`… 20 avatarı hiçbir bot kullanmıyordu. Ida'nın rakibi yukii
-- (f1fe1d9c) hem aynı avatarı hem aynı lig çerçevesini (lig_gumus — aynı ligdeki herkes aynı lig
-- çerçevesini taşır) taşıdığı için maç sonunda Ida'nın kopyası gibi göründü. Bütün modlarda aynı.
--
-- Düzeltme: avatarı profesyonel setten olan gizli botlar id sırasıyla 31 avatara döngüsel dağıtılır
-- (her avatarda 2–3 bot). Avatarı olmayan (baş harf) botlar ve açık botların /avatars/botN.svg
-- görselleri değişmez. Yalnız veri; yetki/kural değişmez.

with sira as (
  select p.id, (row_number() over (order by p.id) - 1) % 31 as i
    from public.profiles p
   where coalesce(p.is_bot, false)
     and p.avatar_url like '/avatars/pro/%'
), liste as (
  select (array[
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
  ]) as a
)
update public.profiles p
   set avatar_url = liste.a[sira.i + 1]
  from sira, liste
 where p.id = sira.id
   and p.avatar_url is distinct from liste.a[sira.i + 1];
