-- 328: Coin paketi adları küçükten büyüğe (Ida, 23 Eyl 2026): Avuç / Kese / Sandık / Hazine / Define.
-- Satıştaki 4 paket sıra (sira) düzeninde Avuç, Kese, Sandık, Hazine olur. "Define" adı beşinci
-- (en büyük) paket içindir; o paket henüz yok — fiyat/coin miktarı ürün kararıdır, uydurulmadı.
-- urun_id (Play ürün kimliği), coin, bonus DEĞİŞMEZ; yalnız görünen ad.
update public.coin_paketleri set ad = 'Avuç'   where urun_id = 'coin_500';
update public.coin_paketleri set ad = 'Kese'   where urun_id = 'coin_1200';
update public.coin_paketleri set ad = 'Sandık' where urun_id = 'coin_3000';
update public.coin_paketleri set ad = 'Hazine' where urun_id = 'coin_8000';
