-- 721 — Sezon Yolu ödül tablosu (56 yuva = 28 seviye × ücretsiz/ücretli) + yol unvanları. TASLAK (Ida onaylayacak).
-- Hazır kaynaklar tam dolu: coin, elmas, joker hakkı, mevcut tepki paketleri (tepki_eglence, tepki_rekabet), unvan.
-- Tasarlanmamış görsel ödüller "?" placeholder (yeni avatar ×4, yeni çerçeve ×5, 3. tepki paketi): yuva görünür,
-- "Yakında"; gerçek ödüle çevirmek TEK SATIR:
--   update bp_seviye_odulleri set placeholder=false, veri='{"anahtar":"<cerceve>"}', ad_tr='…', ad_en='…'
--    where seviye=… and kol='ucretli';
-- (daha önce o yuvayı alanlara tetikleyici gerçek ödülü verir).
-- Ekonomi: ücretli kol elmas toplamı 140 (< BP 500), ücretsiz kol elmas 35; coin ücretsiz 1.350 / ücretli 1.300 (28 günde).
-- Joker hakları küçük; maç içi sınırlar (Klasik 6/2/1, Düello 4/2/1) aynen — pay-to-win yok.

insert into public.unvan_tanimlari (anahtar, tur, kural, sira, aktif, ad_tr, ad_en, aciklama_tr, aciklama_en, nadirlik) values
  ('sezon_yolcu',      'sezon', 'olay', 880, true, 'Yolcu',      'Traveler',   'Sezon Yolu''nda 8. seviyeye ulaş.',                   'Reach level 8 on the Season Path.',                    'siradan'),
  ('sezon_kasif',      'sezon', 'olay', 881, true, 'Kâşif',      'Explorer',   'Sezon Yolu''nda 16. seviyeye ulaş.',                  'Reach level 16 on the Season Path.',                   'nadir'),
  ('sezon_yol_ustasi', 'sezon', 'olay', 882, true, 'Yol Ustası', 'Pathmaster', 'Battle Pass''le Sezon Yolu''nda 18. seviyeye ulaş.',  'Reach level 18 on the Season Path with the Battle Pass.', 'epik')
on conflict (anahtar) do nothing;

insert into public.bp_seviye_odulleri (seviye, kol, tur, veri, placeholder, ad_tr, ad_en, nadirlik) values
  ( 1,'ucretsiz','coin',  '{"miktar":50}',  false,'50 coin','50 coins',null),
  ( 1,'ucretli', 'elmas', '{"miktar":20}',  false,'20 elmas','20 gems',null),
  ( 2,'ucretsiz','joker', '{"tur":"sure","adet":2}', false,'+2 Ek Süre','+2 Extra Time',null),
  ( 2,'ucretli', 'coin',  '{"miktar":150}', false,'150 coin','150 coins',null),
  ( 3,'ucretsiz','coin',  '{"miktar":50}',  false,'50 coin','50 coins',null),
  ( 3,'ucretli', 'tepki_paketi','{"anahtar":"tepki_eglence"}', false,'Eğlence tepki paketi','Fun reaction pack','nadir'),
  ( 4,'ucretsiz','elmas', '{"miktar":5}',   false,'5 elmas','5 gems',null),
  ( 4,'ucretli', 'joker', '{"tur":"elli","adet":2}', false,'+2 50:50','+2 50:50',null),
  ( 5,'ucretsiz','coin',  '{"miktar":75}',  false,'75 coin','75 coins',null),
  ( 5,'ucretli', 'avatar','{}',             true, 'Yeni avatar','New avatar','epik'),
  ( 6,'ucretsiz','joker', '{"tur":"soru_degistir","adet":1}', false,'+1 Soru Değiştir','+1 Change Question',null),
  ( 6,'ucretli', 'coin',  '{"miktar":200}', false,'200 coin','200 coins',null),
  ( 7,'ucretsiz','coin',  '{"miktar":75}',  false,'75 coin','75 coins',null),
  ( 7,'ucretli', 'elmas', '{"miktar":20}',  false,'20 elmas','20 gems',null),
  ( 8,'ucretsiz','unvan', '{"anahtar":"sezon_yolcu"}', false,'Unvan: Yolcu','Title: Traveler','siradan'),
  ( 8,'ucretli', 'cerceve','{}',            true, 'Yeni çerçeve','New frame','nadir'),
  ( 9,'ucretsiz','coin',  '{"miktar":100}', false,'100 coin','100 coins',null),
  ( 9,'ucretli', 'joker', '{"tur":"ikinci_sans","adet":2}', false,'+2 İkinci Şans','+2 Second Chance',null),
  (10,'ucretsiz','elmas', '{"miktar":5}',   false,'5 elmas','5 gems',null),
  (10,'ucretli', 'coin',  '{"miktar":250}', false,'250 coin','250 coins',null),
  (11,'ucretsiz','joker', '{"tur":"zaman_baskisi","adet":1}', false,'+1 Zaman Baskısı','+1 Time Pressure',null),
  (11,'ucretli', 'elmas', '{"miktar":20}',  false,'20 elmas','20 gems',null),
  (12,'ucretsiz','coin',  '{"miktar":100}', false,'100 coin','100 coins',null),
  (12,'ucretli', 'tepki_paketi','{"anahtar":"tepki_rekabet"}', false,'Rekabet tepki paketi','Rivalry reaction pack','nadir'),
  (13,'ucretsiz','coin',  '{"miktar":100}', false,'100 coin','100 coins',null),
  (13,'ucretli', 'joker', '{"tur":"soru_degistir","adet":3}', false,'+3 Soru Değiştir','+3 Change Question',null),
  (14,'ucretsiz','elmas', '{"miktar":5}',   false,'5 elmas','5 gems',null),
  (14,'ucretli', 'avatar','{}',             true, 'Yeni avatar','New avatar','epik'),
  (15,'ucretsiz','joker', '{"tur":"sure","adet":2}', false,'+2 Ek Süre','+2 Extra Time',null),
  (15,'ucretli', 'coin',  '{"miktar":300}', false,'300 coin','300 coins',null),
  (16,'ucretsiz','unvan', '{"anahtar":"sezon_kasif"}', false,'Unvan: Kâşif','Title: Explorer','nadir'),
  (16,'ucretli', 'elmas', '{"miktar":25}',  false,'25 elmas','25 gems',null),
  (17,'ucretsiz','coin',  '{"miktar":100}', false,'100 coin','100 coins',null),
  (17,'ucretli', 'cerceve','{}',            true, 'Yeni çerçeve','New frame','epik'),
  (18,'ucretsiz','joker', '{"tur":"elli","adet":1}', false,'+1 50:50','+1 50:50',null),
  (18,'ucretli', 'unvan', '{"anahtar":"sezon_yol_ustasi"}', false,'Unvan: Yol Ustası','Title: Pathmaster','epik'),
  (19,'ucretsiz','coin',  '{"miktar":125}', false,'125 coin','125 coins',null),
  (19,'ucretli', 'cerceve','{}',            true, 'Yeni çerçeve','New frame','epik'),
  (20,'ucretsiz','elmas', '{"miktar":5}',   false,'5 elmas','5 gems',null),
  (20,'ucretli', 'elmas', '{"miktar":25}',  false,'25 elmas','25 gems',null),
  (21,'ucretsiz','coin',  '{"miktar":125}', false,'125 coin','125 coins',null),
  (21,'ucretli', 'avatar','{}',             true, 'Yeni avatar','New avatar','epik'),
  (22,'ucretsiz','joker', '{"tur":"ikinci_sans","adet":1}', false,'+1 İkinci Şans','+1 Second Chance',null),
  (22,'ucretli', 'tepki_paketi','{}',       true, 'Yeni tepki paketi','New reaction pack','nadir'),
  (23,'ucretsiz','coin',  '{"miktar":150}', false,'150 coin','150 coins',null),
  (23,'ucretli', 'cerceve','{}',            true, 'Yeni çerçeve','New frame','epik'),
  (24,'ucretsiz','elmas', '{"miktar":5}',   false,'5 elmas','5 gems',null),
  (24,'ucretli', 'elmas', '{"miktar":30}',  false,'30 elmas','30 gems',null),
  (25,'ucretsiz','coin',  '{"miktar":150}', false,'150 coin','150 coins',null),
  (25,'ucretli', 'joker', '{"tur":"elli","adet":3}', false,'+3 50:50','+3 50:50',null),
  (26,'ucretsiz','joker', '{"tur":"soru_degistir","adet":2}', false,'+2 Soru Değiştir','+2 Change Question',null),
  (26,'ucretli', 'coin',  '{"miktar":400}', false,'400 coin','400 coins',null),
  (27,'ucretsiz','coin',  '{"miktar":150}', false,'150 coin','150 coins',null),
  (27,'ucretli', 'avatar','{}',             true, 'Yeni avatar','New avatar','efsanevi'),
  (28,'ucretsiz','elmas', '{"miktar":10}',  false,'10 elmas','10 gems',null),
  (28,'ucretli', 'cerceve','{}',            true, 'Sezon finali çerçevesi','Season finale frame','efsanevi')
on conflict (seviye, kol) do nothing;
