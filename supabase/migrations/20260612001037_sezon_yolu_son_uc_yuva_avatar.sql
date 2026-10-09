-- ============================================================
-- 1037 · SEZON YOLU: kalan üç "?" yuva avatar ödülü oldu (Ida, 9 Eki 2026)
--
-- 19 (çerçeve "?") → Şövalye · 22 (tepki paketi "?") → Büyücü · 23 (çerçeve "?") → Kral — hepsi ücretli kol.
-- Seçim: yalnız Nadir, ücretsiz edinilen, dondurulmamış (pro / pro2) avatarlar; Epik/Efsanevi ve elmasla satılan YOK;
-- Sezon Yolu'nda zaten verilenler (korsan, samuray, kristal uzaylı, savaş robotu) tekrarlanmadı.
-- Seçim değiştirmek TEK SATIR: aşağıdaki update'te anahtarı değiştir (ad, nadirlik, url trg_bp_odul_doldur ile dolar).
-- Sezon 2+ Sezon 1 ödüllerini aynen tekrar eder; ayrı sezon verisi yazılmadı. Geri alma: docs/1037-geri-al.sql
-- ============================================================
update public.bp_seviye_odulleri o
   set tur = 'avatar', placeholder = false,
       veri = jsonb_build_object('anahtar', v.anahtar)
  from (values (19, 'sovalye-k20'), (22, 'buyucu-k21'), (23, 'kral-k31')) as v(seviye, anahtar)
 where o.seviye = v.seviye and o.kol = 'ucretli' and o.placeholder;
