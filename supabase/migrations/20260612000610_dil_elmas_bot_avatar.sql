-- ============================================================
-- 610 · YENİ PROFİL DİLİ (D-203) + TEST ELMASI + AVATARSIZ GİZLİ BOTLAR (Ida, 25 Eyl 2026)
--
-- 1) D-203: yeni profil `dil` = 'tr' (sütun varsayılanı) doğup giriş ekranında EN seçen oyuncuyu Türkçeye
--    düşürüyordu (soru dili de profiles.dil → oyuncu_dili() → soru_dilinde). handle_new_user artık kayıt
--    verisindeki dili (raw_user_meta_data->>'dil', misafir ve e-posta girişi gönderir) profile yazar; yoksa
--    'tr'. Google girişi (yönlendirme) istemcide yazılır (useDil, yeni hesapsa). MEVCUT profillere dokunulmaz.
-- 2) Başlangıç elması tek ayar: oyun_ayarlari.baslangic_elmas (TEST 10.000; yayında 150'ye çekilecek —
--    koda gömülü değer yok). Yeni hesap ilk girişte (handle_new_user) bu kadar elmas alır; bot hesabı
--    (raw_app_meta_data.provider = 'bot') ve gizli botlar almaz (elmas_ekle de botu reddeder).
--    Mevcut insan hesapların bakiyesi bu ayara TAMAMLANIR (kimse düşmez; defter: tur 'test', referans
--    'test_bakiye_baslangic' — tekrar çalışınca ikinci kez verilmez).
-- 3) Avatarı boş gizli botlar: açık avatarlardan (31 profesyonel + aktif katalog) bot ADINA göre sabit
--    (hashtext) bir avatar. Açık botlar ve avatarı olan botlar değişmez.
-- Yetki/politika değişmez (handle_new_user tetikleyici fonksiyonu; create or replace yetkileri korur).
-- Tekrar çalıştırılabilir.
-- ============================================================

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('baslangic_elmas', '10000', 'TEST — Yeni hesabın başlangıç elması ve mevcut hesapların test bakiyesi (610). Yayında 150.')
on conflict (anahtar) do nothing;

-- ---------- 1 + 2. Yeni hesap: dil + başlangıç elması ----------
create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_dil text := lower(btrim(coalesce(new.raw_user_meta_data->>'dil', '')));
begin
  insert into public.profiles (id, username, avatar_url, provider, davet_kodu, dil)
  values (
    new.id,
    'oyuncu_' || substr(md5(new.id::text || random()::text), 1, 8),
    null,                                    -- Google fotoğrafı ALINMAZ
    new.raw_app_meta_data->>'provider',
    public.yeni_davet_kodu(),
    case when v_dil in ('tr', 'en') then v_dil else 'tr' end   -- 610 (D-203): giriş ekranındaki dil
  );

  -- Her ödül AYRI blokta. Tek blok olsaydı birinin hatası ötekileri de geri alırdı
  -- (plpgsql'de exception bloğu örtük alt-işlemdir) — Paket 27'de tam bu oldu.
  -- Paket 35: başlangıç coin'i baslangic_coin ayarından (test dönemi 10.000)
  begin perform public.coin_ekle(new.id, public.ayar_sayi('baslangic_coin', 10000), 'baslangic', null);
  exception when others then null; end;

  -- 610: başlangıç elması baslangic_elmas ayarından (bot hesabı almaz)
  if coalesce(new.raw_app_meta_data->>'provider', '') <> 'bot' then
    begin perform public.elmas_ekle(new.id, public.ayar_sayi('baslangic_elmas', 0)::int, 'baslangic', 'baslangic');
    exception when others then null; end;
  end if;

  begin perform public.ucretsiz_esyalari_ver(new.id);
  exception when others then null; end;

  begin perform public.ucretsiz_karakter_ve_parca_ver(new.id);
  exception when others then null; end;

  begin perform public.baslangic_jokerleri_ver(new.id);   -- Paket 27 A
  exception when others then null; end;

  return new;
end;
$function$;

-- ---------- 2. Mevcut insan hesapları: bakiye baslangic_elmas'a tamamlanır ----------
do $$
declare
  v_hedef int := public.ayar_sayi('baslangic_elmas', 0)::int;
  r record;
  v_n int := 0;
begin
  for r in
    select p.id, p.elmas from public.profiles p
     where not coalesce(p.is_bot, false) and p.elmas < v_hedef
  loop
    if public.elmas_ekle(r.id, v_hedef - r.elmas, 'test', 'test_bakiye_baslangic') is not null then
      v_n := v_n + 1;
    end if;
  end loop;
  raise notice '610: % hesabın elması % bakiyeye tamamlandı', v_n, v_hedef;
end $$;

-- ---------- 3. Avatarsız gizli botlar: açık avatarlardan bot adına göre sabit ----------
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
   set avatar_url = liste.a[(abs(hashtext(lower(coalesce(p.gorunen_ad, p.username, p.id::text)))) % cardinality(liste.a)) + 1]
  from liste
 where coalesce(p.is_bot, false)
   and not public.acik_bot_mu(p.is_bot, p.bot_turu)
   and not coalesce(p.acik_bot, false)
   and nullif(btrim(coalesce(p.avatar_url, '')), '') is null;

do $$
declare v_bos int; v_elmas int;
begin
  select count(*) into v_bos from public.profiles p
   where coalesce(p.is_bot, false) and not public.acik_bot_mu(p.is_bot, p.bot_turu) and not coalesce(p.acik_bot, false)
     and nullif(btrim(coalesce(p.avatar_url, '')), '') is null;
  select count(*) into v_elmas from public.profiles where coalesce(is_bot, false) and elmas > 0;
  raise notice '610: avatarsız gizli bot % (0 olmalı) · elması olan bot % (0 olmalı)', v_bos, v_elmas;
end $$;
