-- ============================================================
-- 660 — "Seri Kalkanı" paket adı → "Seri Koruma Paketi" (D-317 kalıcı çözüm)
--
-- Envanter, jokerler.js, push metni ve EN "Streak Shield" hep "Seri Koruma" diyor; yalnız
-- Dükkân paketinin kaynak verisi (052 tohumu) eski "Seri Kalkanı" adını taşıyordu ve istemcide
-- dil.js › TR_DUZELTME ile örtülüyordu. Kaynak düzeltilir; açıklama ("3 adet seri koruma") aynı kalır.
-- Yalnız ad kolonu; yetki/politika/fiyat değişmez. Tekrar çalıştırılabilir.
-- ============================================================
update public.joker_paketleri
   set ad = 'Seri Koruma Paketi'
 where urun_id = 'seri_koruma_3'
   and ad is distinct from 'Seri Koruma Paketi';
