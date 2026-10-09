-- 033 — ZORLUK 2: DOĞRULUK SORUNLU 3 SORU PASİFE ALINDI (2026-10-09)
-- Yüksek atlamada "süre dolunca", erozyonda "nadas", klavyeyle gezinmede "hız için" şıkları da doğru sayılabiliyor.
-- Kaynak: araclar/soru-temizlik/z2-dogruluk-sorunlari.csv · Silinen yok; yalnız aktif = false · Geri alma: docs/z2-asiri-basit-2-geri-al.sql
update public.questions
   set aktif = false
 where aktif and zorluk = 2 and id in (
  '0596f062-6311-41d4-9a7e-ab1a239ee7f8',
  '73b11e97-0c24-48a3-bc67-0aea2a27cbc4',
  'd1a7c671-a8a9-4020-8b64-1f4b82b23726'
);
