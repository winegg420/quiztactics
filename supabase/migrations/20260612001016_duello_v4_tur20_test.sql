-- 1016 · Düello v4: saldırı turu sınırı 15 → 20 (Ida, 9 Eki 2026 — Aşama 2 simülasyonu: Son Düello %28,7 → %13,6,
-- ortalama süre aynı) + bayrak "test" (yalnız duello_v2_test_kullanicilari listesindeki gerçek oyuncular; diğer herkes eski Düello).
-- İkisi de yalnız ayar değeri; tur sınırı maç açılırken satıra sabitlenir (süren maç etkilenmez).
-- Geri alma: update ... set deger = '15' where anahtar = 'duello4_max_tur'; bayrak için '"kapali"'.
update public.oyun_ayarlari set deger = '20'::jsonb where anahtar = 'duello4_max_tur';
update public.oyun_ayarlari set deger = '"test"'::jsonb where anahtar = 'duello_v4_acik';
