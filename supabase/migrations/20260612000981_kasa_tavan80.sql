-- 981: ORTAK HAZİNE (kod adı kasa) tavanı 60 → 80 (Ida, 6 Eki 2026).
--
-- KURAL: hazine hiçbir zaman 80'i geçemez (soru artışından ve DEVAM ×2'den SONRA min(kasa, tavan)). Hedef 80 = tavan 80
--    → dolu hazine tek AÇ ile maçı bitirebilir (958'de hedef 80 > tavan 60 iken imkânsızdı; bilinçli karar).
-- YALNIZ AYAR DEĞERİ değişir; fonksiyon/şema DEĞİŞMEZ: kasa_olustur tavanı yeni maçta kasa_maclari.kasa_tavan'a SABİTLER
--    → süren maçlar tavan 60 ile biter.
-- DEĞİŞMEYENLER: hedef 80, 36 tur, soru 15 sn, karar 5 sn, DEVAM ×2, +2 / +6, AÇ alt sınırı 0, gösterim payı, bot eşikleri.
-- GERİ ALMA: docs/kasa-geri-alma-981.sql.

update public.oyun_ayarlari
   set deger = '80'::jsonb,
       aciklama = 'KASA: hazine bu değeri hiç geçemez (artıştan ve DEVAM çarpanından sonra). 955: 30; 956: 60; 981: 80. 0 = tavan yok. Yeni maçlar.'
 where anahtar = 'kasa_tavan';

do $$ begin
  if (select deger::text from public.oyun_ayarlari where anahtar = 'kasa_tavan') is distinct from '80' then
    raise exception '981: kasa_tavan ayarı yok (955 uygulanmamış)';
  end if;
end $$;
