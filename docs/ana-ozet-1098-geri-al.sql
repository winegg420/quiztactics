-- 1098 geri alma: ana_sayfa_ozet kaldırılır. İstemci özet yoksa (404/hata) her çağrıyı eskisi gibi ağdan yapar.
drop function if exists public.ana_sayfa_ozet(text);
