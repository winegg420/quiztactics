-- ============================================================
-- 669 · DÜELLO KATEGORİ KARTI — EŞLEŞME EŞİĞİ (Ida, 27 Eyl 2026)
--
-- Kategori seçim kartının rengi artık yıldız yerine "eşleşme" ile belirleniyor:
-- kendi doğru oranın rakipten bu yüzdeden fazla yüksekse yeşil, düşükse kırmızı,
-- aradaysa gri. Eşik istemcide (DuelloV2.jsx) okunur; kural/güvenlik değişikliği
-- değil, yalnız bir ayar satırı.
-- ============================================================

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_kat_esik_yuzde', '10'::jsonb, 'Düello kategori kartı: kendi oranın rakipten bu kadar (yüzde puan) yüksek/düşükse yeşil/kırmızı, arası gri')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;
