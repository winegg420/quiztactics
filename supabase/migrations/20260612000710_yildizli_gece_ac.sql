-- Kart arka planı: Yıldızlı Gece oyuna açılır (Ida onayı, 30 Eyl 2026).
-- Yükselen Köz (pa_kor) ve Kuzey Işıkları (pa_kuzey) aktif=false KALIR. Fiyat/sahiplik/takma akışı değişmez.
update public.kozmetikler set aktif = true where anahtar = 'pa_gece';
