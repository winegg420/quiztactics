-- 956: KASA DEVAM çarpanı ×1,25 → ×2, kasa tavanı 30 → 60 (Ida, 5 Eki 2026; 955 canlı testi sonrası, simülasyonla doğrulandı).
--
-- SORUN (955 canlı testi): kasa 10'da DEVAM ×1,25 yalnız +3 ekliyordu (normal soru artışı kadar, hissedilmiyor);
--    kasa 30'da tavana çarpıp büyümüyordu.
-- KURAL: her DEVAM (bilerek / süre dolumu / bot) kasa = ceil(kasa × 2), sonra min(kasa, 60). Seri/kademe YOK.
--    Tavan 60 = hedef 60 → yüksek kasa tek AÇ ile maçı bitirebilir. 955'in "en az 2 AÇ" tasarımı BİLEREK terk edildi (Ida kabul).
-- YALNIZ AYAR DEĞERLERİ değişir; fonksiyon/şema DEĞİŞMEZ (955 mantığı ayardan okur):
--    kasa_olustur yeni maçta kasa_maclari.kasa_tavan / devam_carpan kolonlarına sabitler → süren 955 maçları ×1,25 / 30 ile biter.
-- DEĞİŞMEYENLER: hedef 60, 36 tur, soru 15 sn, karar 5 sn, acma_min 10, +2/+6, bot eşikleri 8/14/20 (tavandaki kasayı açar),
--    954 (DEVAM sahipliği bırakır, bilerek DEVAM → ücretsiz 50:50), Altın Soru, jokerler, ödüller.
-- GERİ ALMA: docs/kasa-geri-alma-956.sql.

update public.oyun_ayarlari
   set deger = '60'::jsonb,
       aciklama = 'KASA: kasa bu değeri geçemez (artıştan ve DEVAM çarpanından sonra uygulanır; 955: 30, 956: 60). 0 = tavan yok (yeni maçlar).'
 where anahtar = 'kasa_tavan';
update public.oyun_ayarlari
   set deger = '2'::jsonb,
       aciklama = 'KASA: DEVAM (bilerek ya da süre dolumu) kasayı ceil(kasa × çarpan) yapar, sonra tavan (955: 1.25, 956: 2). 1 = kapalı (yeni maçlar).'
 where anahtar = 'kasa_devam_carpan';

do $$ begin
  if (select count(*) from public.oyun_ayarlari where anahtar in ('kasa_tavan', 'kasa_devam_carpan')) <> 2 then
    raise exception '956: kasa_tavan / kasa_devam_carpan ayarı yok (955 uygulanmamış)';
  end if;
end $$;
