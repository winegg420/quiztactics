-- 956 geri alma: KASA DEVAM çarpanı 2 → 1.25, tavan 60 → 30 (canlı 956 ÖNCESİ değerler ve açıklamalar, 2026-10-05 ölçüldü).
-- 956 yalnız iki ayar değerini değiştirdi; fonksiyon/şema değişmedi. Yeni maçlar eski değerleri alır,
-- süren 956 maçları satıra sabit ×2 / 60 ile biter.
-- Uygulama: canlı veritabanında tek işlemde çalıştır. (ÇALIŞTIRILMADI)
begin;
update public.oyun_ayarlari
   set deger = '30'::jsonb,
       aciklama = 'KASA: kasa bu değeri geçemez (artıştan ve DEVAM çarpanından sonra uygulanır; 955). 0 = tavan yok (yeni maçlar).'
 where anahtar = 'kasa_tavan';
update public.oyun_ayarlari
   set deger = '1.25'::jsonb,
       aciklama = 'KASA: DEVAM (bilerek ya da süre dolumu) kasayı ceil(kasa × çarpan) yapar, sonra tavan (955). 1 = kapalı (yeni maçlar).'
 where anahtar = 'kasa_devam_carpan';
commit;
