-- 832 · Normal maç soru ağırlığı: kolay (zorluk 1–2) artırıldı (Ida onayı).
-- 350'deki 70/25/5 → 80/17/3. Turnuva ayarlarına (turnuva_zorluk_*) dokunulmaz.
update public.oyun_ayarlari set deger = '80'::jsonb,
  aciklama = 'Normal maç soru seçimi: kolay (zorluk 1–2) grubunun ağırlığı (832: 70 → 80)'
where anahtar = 'soru_agirlik_kolay';
update public.oyun_ayarlari set deger = '17'::jsonb,
  aciklama = 'Normal maç soru seçimi: orta (zorluk 3) grubunun ağırlığı (832: 25 → 17)'
where anahtar = 'soru_agirlik_orta';
update public.oyun_ayarlari set deger = '3'::jsonb,
  aciklama = 'Normal maç soru seçimi: zor (zorluk 4–5) grubunun ağırlığı (832: 5 → 3)'
where anahtar = 'soru_agirlik_zor';
