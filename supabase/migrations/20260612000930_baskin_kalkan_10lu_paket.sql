-- 930 — Baskın ve Kalkan 10'lu paket satırları (Düello jokerleri; Ida isteği, 2 Eki 2026).
--
-- Sorun: Dükkân › Joker › Düello'da Baskın/Kalkan'ın "10×" düğmesi yoktu. skill_dukkani() 10'lu
-- düğmeyi joker_paketleri'nde "tek-tür içerik + fiyat_anahtari dolu" satırdan çıkarır (282/307 kalıbı);
-- oyun_ayarlari'nda coin_joker_baskin_10 / coin_joker_kalkan_10 vardı ama paket satırları hiç eklenmemişti.
-- Fiyatlar canlıda ölçüldü, 910'daki ×0,85 ile tutarlı: Baskın 70 → 595, Kalkan 50 → 425 (değişmedi).
-- Satın alma RPC'si (joker_coin_ile_al) urun_id beyaz listesi taşımaz; yeni satırlar kendiliğinden geçer.

insert into public.joker_paketleri (urun_id, ad, aciklama, icerik, sira, aktif, coin_fiyat, fiyat_anahtari) values
  ('skill_baskin_10', '10 × Baskın', '10 hak', '{"baskin": 10}'::jsonb, 18, true, 595, 'coin_joker_baskin_10'),
  ('skill_kalkan_10', '10 × Kalkan', '10 hak', '{"kalkan": 10}'::jsonb, 19, true, 425, 'coin_joker_kalkan_10')
on conflict (urun_id) do update set
  ad = excluded.ad, aciklama = excluded.aciklama, icerik = excluded.icerik, sira = excluded.sira,
  aktif = excluded.aktif, coin_fiyat = excluded.coin_fiyat, fiyat_anahtari = excluded.fiyat_anahtari;
