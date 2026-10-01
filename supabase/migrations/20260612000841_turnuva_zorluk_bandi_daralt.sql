-- Turnuva zorluk bandı (Ida kararı): zorluk 3 zaten zor, 4-5 kalkar.
-- 1-5. soru 1-2 (aynı) · 6-10. soru 2-3 · 11+ yalnız 3.
update public.oyun_ayarlari set deger = '2'::jsonb where anahtar = 'turnuva_zorluk_dilim2_min';
update public.oyun_ayarlari set deger = '3'::jsonb where anahtar = 'turnuva_zorluk_dilim2_max';
update public.oyun_ayarlari set deger = '3'::jsonb where anahtar = 'turnuva_zorluk_dilim3_min';
update public.oyun_ayarlari set deger = '3'::jsonb where anahtar = 'turnuva_zorluk_dilim3_max';
