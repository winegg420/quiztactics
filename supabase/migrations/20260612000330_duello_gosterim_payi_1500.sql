-- 330: Düello gösterim payı 1200 → 1500 ms. Canlı ölçüm (23 Eyl 2026, quiztactics.vercel.app,
-- 20 faz): ilk görünüş gecikmesi medyan 360 ms, en çok 1347 ms — 1200 ms'yi aşan tek fazda
-- ilk rakam 867 ms kaldı. 1500 ms ölçülen en kötü durumu da kapsar.
update public.oyun_ayarlari set deger = '1500'::jsonb where anahtar = 'duello_gosterim_payi_ms';
