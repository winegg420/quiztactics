-- 350 · Sorular kolaylaştı (Ida, 23 Eyl 2026: "iki Düello maçı oynadım, sorular hâlâ çok zor").
-- Normal maç soru seçimi (soru_sec, 324) ağırlıkları 55/30/15 → 70/25/5.
-- Turnuva kendi kuralında (turnuva_soru_sec), dokunulmadı. Test değeri.
update public.oyun_ayarlari set deger = '70'::jsonb,
  aciklama = 'Normal maç soru seçimi: kolay (zorluk 1–2) grubunun ağırlığı (350: 55 → 70)'
where anahtar = 'soru_agirlik_kolay';
update public.oyun_ayarlari set deger = '25'::jsonb,
  aciklama = 'Normal maç soru seçimi: orta (zorluk 3) grubunun ağırlığı (350: 30 → 25)'
where anahtar = 'soru_agirlik_orta';
update public.oyun_ayarlari set deger = '5'::jsonb,
  aciklama = 'Normal maç soru seçimi: zor (zorluk 4–5) grubunun ağırlığı (350: 15 → 5)'
where anahtar = 'soru_agirlik_zor';
