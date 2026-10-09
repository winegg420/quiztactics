-- 1017 · Düello v4 test listesi: otomatik ekran/uçtan uca testlerin iki hesabı (ArayuzDenetim934 · ArayuzDenetim758,
-- .arayuz-denetim-oturum.json hesap1/hesap2) duello_v2_test_kullanicilari'na eklenir — bayrak "test"te v4 maçı açabilsinler.
-- Liste zaten Ida'nın hesabını (idagg) içerir. Yalnız ayar değeri; tekrar çalışırsa çift eklemez.
-- Geri alma: listeden bu iki uuid çıkarılır.
update public.oyun_ayarlari a
   set deger = a.deger || (select coalesce(jsonb_agg(u), '[]'::jsonb)
                             from unnest(array['4c5ddc70-a045-42cf-9043-5ddb8012e634', 'eeb11c7e-f239-43b6-8c91-3be11b947e6c']) u
                            where not (a.deger ? u))
 where a.anahtar = 'duello_v2_test_kullanicilari';
