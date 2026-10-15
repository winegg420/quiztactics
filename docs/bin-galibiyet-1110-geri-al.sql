-- 1110 geri alma: eski açıklama metni
update public.unvan_tanimlari
   set aciklama_tr = '1.000 maç kazan (Antrenman hariç; Klasik, Düello, Grup, Turnuva)',
       aciklama_en = 'Win 1,000 matches (excluding Practice; Classic, Duel, Group, Tournament)'
 where anahtar = 'bin_galibiyet';
