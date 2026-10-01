-- ============================================================
-- 770 · AVATAR NADİRLİĞİ: Ida'nın işaretlediği değerler yazılır + Sahne rengi bayrağı açılır (1 Eki 2026)
--
-- 702 hiç yazılmadı; işaretleme listesi (62 aktif avatar) burada: Yaygın 21 · Nadir 15 · Epik 18 · Efsanevi 8.
-- Eşleşme görünen ada göre (anahtar sütunu); yalnız `nadirlik` kolonu değişir.
-- DEĞİŞMEZ: 8 pasif avatar (sakalli, sporcu, ogrenci, veteriner, android, kasli-sampiyon, demir-pazi,
-- fitness-kralicesi), seri, edinme, acilis_zamani, avatar_katalogu.nadirlik (Koleksiyon Puanı).
-- Bayrak avatar_nadirlik_renk = true: Sahne zemini nadirlikten türer (Yaygın gri-mavi, Nadir yeşil,
-- Epik = oyunun Epik moru #8b2fd6, Efsanevi altın). Yıkıcı değil, tekrar çalıştırılabilir.
-- ============================================================

update public.avatar_nitelikleri n
   set nadirlik = v.nadirlik
  from (values
    -- Yaygın (21)
    ('kedi-k01','yaygin'),('kopek-k02','yaygin'),('baykus-k03','yaygin'),('tilki-k04','yaygin'),('panda-k05','yaygin'),
    ('penguen-k06','yaygin'),('kurbaga-k07','yaygin'),('ayi-k08','yaygin'),('maymun-k09','yaygin'),('dinozor-k10','yaygin'),
    ('kopekbaligi-k12','yaygin'),('ahtapot-k13','yaygin'),('ari-k14','yaygin'),('sarisin-y01','yaygin'),('kivircik-y02','yaygin'),
    ('kizil-y03','yaygin'),('basortulu-y04','yaygin'),('gozluklu-y05','yaygin'),('kel-y06','yaygin'),('dede-y08','yaygin'),
    ('asci-k23','yaygin'),
    -- Nadir (15)
    ('kedili-kiz-y37','nadir'),('palyaco-k30','nadir'),('kral-k31','nadir'),('dedektif-k22','nadir'),('hostes-y39','nadir'),
    ('sovalye-k20','nadir'),('pelerinli-y22','nadir'),('gece-y23','nadir'),('viking-k25','nadir'),('kahraman-k29','nadir'),
    ('buyucu-k21','nadir'),('hayalet-k26','nadir'),('zombi-k27','nadir'),('mumya-k28','nadir'),('kedili-genc-y36','nadir'),
    -- Epik (18)
    ('noel-baba-y16','epik'),('bilim-y11','epik'),('doktor-y12','epik'),('pilot-y38','epik'),('golge-ninja-y14','epik'),
    ('samuray-y15','epik'),('kaptan-y17','epik'),('ninja-k18','epik'),('korsan-k19','epik'),('uzay-sovalye-y24','epik'),
    ('ejderha-k11','epik'),('vampir-y19','epik'),('ates-buyucu-y20','epik'),('canavar-y25','epik'),('robot-k15','epik'),
    ('mekanik-y21','epik'),('astronot-k17','epik'),('uzay-kasifi-y18','epik'),
    -- Efsanevi (8)
    ('yuce-kral-y26','efsanevi'),('kralice-y27','efsanevi'),('profesor-k24','efsanevi'),('savas-robotu-y30','efsanevi'),
    ('siborg-y31','efsanevi'),('uzayli-k16','efsanevi'),('kristal-uzayli-y28','efsanevi'),('gozsapli-uzayli-y29','efsanevi')
  ) as v(anahtar, nadirlik)
 where n.anahtar = v.anahtar and n.nadirlik is distinct from v.nadirlik;

-- Bayrak + açıklama (renkler güncel karara göre)
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('avatar_nadirlik_renk', to_jsonb(true),
   '700/770: true → avatarın Sahne (renkli kare zemin) rengi nadirliğinden türetilir (Yaygın gri-mavi, Nadir yeşil, Epik mor, Efsanevi altın) ve seçim ekranları nadirliğe göre bölümlenir.')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;

-- Doğrulama: aktif 62 avatarın dağılımı 21/15/18/8 değilse migration geri alınır
do $$
declare v_dagilim text; v_bayrak text;
begin
  select string_agg(nadirlik || ' ' || n, ' · ' order by nadirlik) into v_dagilim
    from (select n.nadirlik, count(*) n
            from public.avatar_nitelikleri n
            left join public.avatar_katalogu k on k.url = n.url
           where coalesce(k.aktif, true)
           group by n.nadirlik) t;
  if v_dagilim is distinct from 'efsanevi 8 · epik 18 · nadir 15 · yaygin 21' then
    raise exception '770 dağılım beklenenden farklı: %', v_dagilim;
  end if;
  select deger #>> '{}' into v_bayrak from public.oyun_ayarlari where anahtar = 'avatar_nadirlik_renk';
  raise notice '770 aktif dağılım: % · bayrak: %', v_dagilim, v_bayrak;
end $$;
