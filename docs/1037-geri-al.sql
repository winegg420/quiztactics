-- 1037 geri alma: üç yuvayı eski "?" placeholder haline döndürür.
update public.bp_seviye_odulleri set tur='cerceve', placeholder=true, veri='{}', ad_tr='Yeni çerçeve', ad_en='New frame', nadirlik='epik' where seviye in (19,23) and kol='ucretli';
update public.bp_seviye_odulleri set tur='tepki_paketi', placeholder=true, veri='{}', ad_tr='Yeni tepki paketi', ad_en='New reaction pack', nadirlik='nadir' where seviye=22 and kol='ucretli';
