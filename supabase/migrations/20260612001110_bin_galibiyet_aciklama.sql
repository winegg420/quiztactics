-- 1110 · "Bin Galibiyet" açıklaması: oyunda Antrenman yolu yok; sayılan modlar yazılır (15 Eki 2026, tam tur düzeltmesi)
-- Sayım kuralı (toplam_galibiyet: Klasik/Saf Bilgi, Düello, Grup, Turnuva) DEĞİŞMEDİ; yalnız açıklama metni.
-- Geri alma: docs/bin-galibiyet-1110-geri-al.sql
update public.unvan_tanimlari
   set aciklama_tr = '1.000 maç kazan (Klasik, Düello, Grup, Turnuva)',
       aciklama_en = 'Win 1,000 matches (Classic, Duel, Group, Tournament)'
 where anahtar = 'bin_galibiyet';
