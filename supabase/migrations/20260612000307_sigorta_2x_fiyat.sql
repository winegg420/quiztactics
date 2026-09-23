-- Kararlar (23 Eyl 2026, TEST değeri) — Sigorta ve 2X kullanım hakkı fiyatları
--
-- Karar: Sigorta 30 · 2X 40 coin; 10'lu paket %15 indirimli → 255 / 340.
-- İkisi de yalnız Klasik'te kullanılır; Düello'ya gelmiyor (değişmedi).
--
-- Önce (canlı, 23 Eyl ölçümü):
--   coin_joker_sigorta     = 60   (282'de eski etkin değer olarak yazılmıştı)
--   coin_joker_cifte_puan  = 60
--   coin_joker_sigorta_10 / coin_joker_cifte_puan_10 → YOK
--   joker_paketleri.skill_sigorta_10 / skill_cifte_puan_10 → YOK
-- Sonra:
--   coin_joker_sigorta 30 · coin_joker_sigorta_10 255
--   coin_joker_cifte_puan 40 · coin_joker_cifte_puan_10 340
--   10'lu paket satırları eklenir (282'deki kalıp: fiyat_anahtari → oyun_ayarlari).
--   skill_dukkani() tek-tür + fiyat_anahtari dolu paketi kendiliğinden gösterir.
--
-- Fiyat tek kaynak: joker_fiyati() / joker_paket_fiyati() — fonksiyonlara dokunulmaz.
-- Başlangıç coin'i (baslangic_coin = 10000) DEĞİŞMEZ.

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('coin_joker_sigorta',       '30'::jsonb,  'Skill hakkı fiyatı — Sigorta, 1 hak (coin). TEST değeri (karar 23 Eyl 2026).'),
  ('coin_joker_cifte_puan',    '40'::jsonb,  'Skill hakkı fiyatı — 2X, 1 hak (coin). TEST değeri (karar 23 Eyl 2026).'),
  ('coin_joker_sigorta_10',    '255'::jsonb, '10''lu skill paketi fiyatı — Sigorta × 10 hak (coin, %15 indirim). TEST değeri. Paket: joker_paketleri.skill_sigorta_10'),
  ('coin_joker_cifte_puan_10', '340'::jsonb, '10''lu skill paketi fiyatı — 2X × 10 hak (coin, %15 indirim). TEST değeri. Paket: joker_paketleri.skill_cifte_puan_10')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;

insert into public.joker_paketleri (urun_id, ad, aciklama, icerik, sira, aktif, coin_fiyat, fiyat_anahtari) values
  ('skill_sigorta_10',    '10 × Sigorta', '10 hak', '{"sigorta": 10}'::jsonb,    16, true, 255, 'coin_joker_sigorta_10'),
  ('skill_cifte_puan_10', '10 × 2X',      '10 hak', '{"cifte_puan": 10}'::jsonb, 17, true, 340, 'coin_joker_cifte_puan_10')
on conflict (urun_id) do update set
  ad = excluded.ad, aciklama = excluded.aciklama, icerik = excluded.icerik, sira = excluded.sira,
  aktif = excluded.aktif, coin_fiyat = excluded.coin_fiyat, fiyat_anahtari = excluded.fiyat_anahtari;
