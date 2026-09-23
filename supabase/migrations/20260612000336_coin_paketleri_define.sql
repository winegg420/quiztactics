-- ============================================================
-- 336 · Coin paketleri: bonus merdiveni + 5. paket "Define"
--
-- Bonus (paketin taban coin'ine oran): Avuç %0 · Kese %10 · Sandık %15 · Hazine %20 · Define %30.
-- Arayüz bonus yüzdesini veriden hesaplar (bonus / coin) — rakam koda gömülmez.
--
-- Define: fiyatı Hazine'nin ~2 katı → taban coin de 2 katı (8.000 × 2 = 16.000), bonus %30 = 4.800,
-- toplam 20.800. Play ürün kimliği 'coin_16000' (mevcut 'coin_<taban>' kalıbı).
-- Gerçek para fiyatı veritabanında YOK (bilerek): Play Console belirler, istemci Digital Goods
-- API'den okur (playFatura.js › fiyatlariAl). Play'de ürün henüz tanımlı değil ve satın alma kapalı;
-- canlı satış olmaz. Fiyat kuralı: docs/YAYIN_ONCESI.md.
-- ============================================================

update public.coin_paketleri set bonus = 0    where urun_id = 'coin_500';    -- Avuç   %0
update public.coin_paketleri set bonus = 120  where urun_id = 'coin_1200';   -- Kese   %10 (eski 100)
update public.coin_paketleri set bonus = 450  where urun_id = 'coin_3000';   -- Sandık %15 (eski 400)
update public.coin_paketleri set bonus = 1600 where urun_id = 'coin_8000';   -- Hazine %20 (eski 1.500)

insert into public.coin_paketleri (urun_id, ad, coin, bonus, sira, aktif)
values ('coin_16000', 'Define', 16000, 4800, 5, true)                         -- Define %30
on conflict (urun_id) do update
  set ad = excluded.ad, coin = excluded.coin, bonus = excluded.bonus, sira = excluded.sira, aktif = excluded.aktif;
