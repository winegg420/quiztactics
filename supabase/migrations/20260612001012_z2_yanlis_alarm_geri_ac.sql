-- 012 — 011'de yanlışlıkla kapanan 2 soru yeniden açıldı (9 Eki 2026).
-- Tarama bunları "yanlış cevap" saymıştı; elle bakıldı: işaretli cevaplar doğru
-- (kalbe kan taşıyan damar → Toplardamar; Akdeniz kıyısı olmayan ülke → Portekiz). Model gerekçesiyle çelişmişti.
update public.questions
   set aktif = true
 where not aktif and id in (
  '2d74846f-3935-4980-a0d0-d239753ab194',
  '1badd06f-ace5-4cf8-a647-81021955fef7'
);
