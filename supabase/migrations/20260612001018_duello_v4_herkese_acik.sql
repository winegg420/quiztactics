-- 1018 · Düello v4 herkese açık (Ida, 9 Eki 2026): duello_v4_acik "test" → "acik".
-- Yalnız ayar değeri; yeni açılan bütün Düello maçları v4 (surum 4) olur. Süren eski (surum 2) maçlar eski kuralla biter.
-- Geri alma: docs/duello-v4-acik-geri-al.sql
update public.oyun_ayarlari set deger = '"acik"'::jsonb where anahtar = 'duello_v4_acik';
