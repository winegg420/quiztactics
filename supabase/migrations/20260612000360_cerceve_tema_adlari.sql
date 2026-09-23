-- Çerçeveler premium görünüme geçti (oyun/tasarim/cerceveler): her çerçevenin bir teması var.
-- Yalnız görünen ad değişir. Anahtar, nadirlik, kaynak, fiyat, koşul, sıra ve sahiplikler AYNEN kalır.
update public.cerceveler c
set ad_tr = v.ad_tr, ad_en = v.ad_en
from (values
  ('dukkan_gece',    'Bulut',                    'Cloud'),
  ('dukkan_nane',    'Çiçek Bahçesi',            'Flower Garden'),
  ('dukkan_mercan',  'Neon Çizgi',               'Neon Line'),
  ('dukkan_yakut',   'Buz Kristali',             'Ice Crystal'),
  ('dukkan_okyanus', 'Okyanus Dalgası',          'Ocean Wave'),
  ('dukkan_zumrut',  'Yıldız Tozu',              'Stardust'),
  ('dukkan_ametist', 'Ejder Pulu',               'Dragon Scale'),
  ('dukkan_kutup',   'Şimşek',                   'Lightning'),
  ('dukkan_nebula',  'Gezegen Halkası',          'Planet Ring'),
  ('dukkan_anka',    'Alev Kanatları',           'Flame Wings'),
  ('dukkan_gunes',   'Kraliyet',                 'Royal'),
  ('dukkan_ejder',   'Kozmik',                   'Cosmic'),
  ('level_25',       'Level 25 Bronz',           'Level 25 Bronze'),
  ('level_50',       'Level 50 Gümüş',           'Level 50 Silver'),
  ('level_75',       'Level 75 Altın',           'Level 75 Gold'),
  ('level_100',      'Level 100 Altın Kanatlar', 'Level 100 Golden Wings')
) as v(anahtar, ad_tr, ad_en)
where c.anahtar = v.anahtar;
