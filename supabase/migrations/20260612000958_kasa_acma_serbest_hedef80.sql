-- 958: KASA AÇ alt sınırı kalkar (kasa_acma_min 10 → 0) + hedef puan 60 → 80 (Ida, 5 Eki 2026; simülasyonla doğrulandı).
--
-- SORUN: kasa 10'a kadar AÇ kilitliydi, karar ekranı hiç gelmiyordu (Ida: "saçma"); hedef 60 azdı — ikisi de bilince
--    kasa hızla büyüyor, tek AÇ maçı bitiriyordu.
-- KURAL: kasa kaç olursa olsun tek başına bilen (sahip) bir sonraki soru gelmeden AÇ / DEVAM der (kasa 2 iken de).
--    Sahipsizken karar fazı yine açılmaz. Hedef 80.
-- YALNIZ AYAR DEĞERLERİ değişir; fonksiyon/şema DEĞİŞMEZ (canlı tanımlar 0'ı "hiç kilitleme" diye işler):
--    kasa_tur_baslat  : sahip is not null and kasa > 0 and kasa >= acma_min (0) → sahip varsa her turda karar fazı
--                       (sahip ancak tek başına bilerek olunur, o an kasa ≥ artış > 0).
--    kasa_karar       : AÇ ve kasa < acma_min → red; 0 iken hiçbir zaman.
--    kasa_karar_uygula: AÇ ve kasa >= acma_min → AÇ yolu; 0 iken her zaman.
--    kasa_bot_karar   : kasa < acma_min → açmaz; 0 iken eşik (8/14/20 ± sapma) / tavan / hedef kuralı karar verir.
--    kasa_olustur     : acma_min ve hedef yeni maçta kasa_maclari.acma_min / hedef kolonlarına SABİTLENİR
--                       → süren 957 maçları acma_min 10 / hedef 60 ile biter.
-- DEĞİŞMEYENLER: 36 tur, soru 15 sn, karar 5 sn, tavan 60, DEVAM ×2, +2 / +6, DEVAM sahipliği bırakır, bilerek DEVAM →
--    ücretsiz 50:50, bot eşikleri 8/14/20 ve gecikmesi, Altın Soru, jokerler, ödüller, 957 ortak özellikleri.
-- GERİ ALMA: docs/kasa-geri-alma-958.sql.

update public.oyun_ayarlari
   set deger = '0'::jsonb,
       aciklama = 'KASA: kasa bunun altındayken AÇ reddedilir, karar fazı açılmaz (951: 10; 958: 0). 0 = sınırsız (sahip her turda AÇ/DEVAM der). Yeni maçlar.'
 where anahtar = 'kasa_acma_min';
update public.oyun_ayarlari
   set deger = '80'::jsonb,
       aciklama = 'KASA: kazanmak için gereken puan (950: 20; 951: 50; 955: 60; 958: 80). Yeni maçlar.'
 where anahtar = 'kasa_hedef_puan';

do $$ begin
  if (select count(*) from public.oyun_ayarlari where anahtar in ('kasa_acma_min', 'kasa_hedef_puan')) <> 2 then
    raise exception '958: kasa_acma_min / kasa_hedef_puan ayarı yok (951 uygulanmamış)';
  end if;
end $$;
