-- Sezon Yolu joker ödülleri: İngilizce ad arayüzle aynı terim ("Swap Question").
-- 721'de "Change Question" yazılmıştı; Dükkân/Görevler/maç içi çeviriler "Swap Question".
update public.bp_seviye_odulleri
   set ad_en = replace(ad_en, 'Change Question', 'Swap Question')
 where ad_en like '%Change Question%';
