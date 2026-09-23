-- ============================================================
-- 316 — Soru temizliği: pasife alma + 1 çeviri düzeltmesi (23 Eyl 2026)
--
-- Soru SİLİNMEZ, yeniden yazılmaz; yalnız aktif=false. Geri alma ve her satırın sebebi:
-- araclar/soru-temizlik/degisiklikler.csv (migration = 20260612000316_soru_temizlik_pasif).
--   2c · ilk Jev taramasındaki 21 yüksek güvenli itiraz elle okundu → 4 gerçekten tartışmalı
--   2d · iki şüpheli çeviri: 053a7fb7 TR'de de çoklu doğru → pasif; 8b64cc47 EN metni düzeltildi
--   2b · Jev ikinci geçiş (çoklu doğru 115 · eskiyebilir 103 · hassas 77, odaklı tek soru):
--        >= 0.8 güvenle sorunlu 2 soru (382ca1e0, 77f16153)
-- Toplam pasif: 7
-- Üretici: node araclar/soru-temizlik/uret-migration.mjs pasif 316
-- ============================================================

update public.questions set aktif = false
 where id = any('{
  053a7fb7-080f-465e-8984-12160f2ec4d9,06a589ca-dacf-4200-92e3-18015337151b,382ca1e0-3a6c-491e-96b6-205764ae35f4,5c895c72-cdfa-4ba6-acd5-318da35c5ca0,
  77f16153-b221-4744-8db0-870d42db11e1,7ab45305-86df-4ba6-b46a-1421f5ef459f,92466ab9-81c6-4538-8189-9c397bfe32f4
}'::uuid[])
   and aktif;

update public.question_translations
   set soru = 'Who edits a manuscript and prepares it for publication?'
 where question_id = '8b64cc47-d5ab-4638-8aea-0ae2418739cc' and dil = 'en';
