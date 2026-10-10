-- ============================================================
-- 1046 — soru_parti_codex_01 (stil: docs/SORU_STIL_PROFILI.md): 50 soru · 2026-10-10
--
-- Kategori: edebiyat 5 · genel_kultur 11 · muzik 4 · sanat 8 · sinema 6 · spor 6 · tarih 1 · teknoloji 9
-- Yerel (kapsam='yerel', ulke='TR'): 1 · zorluk 1–5: 0/35/15/0/0
-- İngilizce çeviri: 49 · çevrilmeyen (ceviri_atlanan, kod 'cevrilemez'): 1
--
-- Kalite: Codex yazımı; codex-kapi.mjs kapı 1–5 (TR/EN biçim ve şık denge,
-- havuz/parti birebir ve Jaccard tekrar, cevap soruda değil, DB kural kapısı,
-- Jev şık ipucu p ≤ 0,75 ve tek doğru yanlış şık p < 0,5).
-- Claude API kullanılmadı. Son Claude incelemesi AYRI; bekleyen SQL onaysız UYGULANMAZ.
--
-- Sıra: sorular doğru şık 0'da eklenir, çeviriler aynı sırayla yazılır, sonunda YALNIZ
-- bu işlemde eklenen satırların şıkları karıştırılır — TR ve EN AYNI permütasyonla
-- (dogru_cevap indeksi ortak olduğu için şart). `created_at >= transaction_timestamp()`
-- koşulu ZORUNLUDUR; onsuz tüm havuz karışır ve oynanan maçlarda indeks kayar.
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti 1 --no 1046 --klasor codex-01 --ad soru_parti_codex_01 --codex --bekleyen
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
('Rodin''in ''Düşünen Adam'' heykelinde figür hangi konumdadır?', '["Oturur","Yürür","Uzanır","Diz çöker"]'::jsonb, 0, 'sanat', 'global', null, 2),
('René Magritte''in ''Âşıklar'' tablosundaki çiftin yüzlerini ne örter?', '["Beyaz kumaş","Siyah maske","Kırmızı perde","Mavi tül"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Magritte''in ''Golconda'' tablosunda havada asılı duran erkekler hangi şapkayı takar?', '["Melon","Fötr","Silindir","Kasket"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Michelangelo''nun Sistina Şapeli tavanındaki Âdem''e uzanan el kime aittir?', '["Tanrı","Musa","İbrahim","Davud"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Edvard Munch''un ''Çığlık'' tablosunda ana figür ellerini nereye götürür?', '["Başına","Göğsüne","Dizlerine","Bel kısmına"]'::jsonb, 0, 'sanat', 'global', null, 2),
('''Kaplumbağa Terbiyecisi'' tablosundaki yaşlı adam elinde hangi çalgıyı tutar?', '["Ney","Kaval","Zurna","Klarnet"]'::jsonb, 0, 'sanat', 'yerel', 'TR', 2),
('Goya''nın ''3 Mayıs 1808'' tablosundaki kurbanın açık kollarıyla görülen gömleği hangi renktir?', '["Beyaz","Siyah","Mavi","Yeşil"]'::jsonb, 0, 'sanat', 'global', null, 3),
('Salvador Dalí''nin ''Belleğin Azmi'' tablosunda eriyen saatlerden biri neye asılıdır?', '["Ağaç dalına","Kapı koluna","Sandalye sırtına","Pencere çerçevesine"]'::jsonb, 0, 'sanat', 'global', null, 3),
('''Blue Monday'' adlı 1983 şarkısını hangi grup kaydetti?', '["New Order","Depeche Mode","Pet Shop Boys","Erasure"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Never Gonna Give You Up'' şarkısının 1987''deki yorumcusu kimdir?', '["Rick Astley","George Michael","Phil Collins","Billy Ocean"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Gangnam Style'' şarkısıyla ünlenen Güney Koreli müzisyen kimdir?', '["PSY","Rain","G-Dragon","Taeyang"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Walk This Way''in 1986 yorumunda Run-DMC hangi rock grubuyla bir araya geldi?', '["Aerosmith","Van Halen","Bon Jovi","Def Leppard"]'::jsonb, 0, 'muzik', 'global', null, 3),
('''Tomb Raider'' serisinin arkeolog kahramanının soyadı nedir?', '["Croft","Drake","Kennedy","Redfield"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('''Animal Crossing'' oyunlarında kullanılan ana para biriminin adı nedir?', '["Bells","Rupees","Gil","Septims"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('''Stardew Valley''de oyuncunun çiftliğinin yanındaki kasabanın adı nedir?', '["Pelican Town","Pallet Town","Lavender Town","Twinleaf Town"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('''God of War'' serisindeki Kratos''un oğlunun adı nedir?', '["Atreus","Deimos","Baldur","Brok"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('''Overwatch''taki Winston karakteri hangi hayvandır?', '["Goril","Şempanze","Orangutan","Babun"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('''Fallout'' serisinin mavi tulumlu, sarı saçlı maskotunun adı nedir?', '["Vault Boy","Pip-Boy","Dogmeat","Codsworth"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('''Kirby'' oyunlarının kahramanının memleketi olan yıldız biçimli gezegen hangisidir?', '["Popstar","Mobius","Zebes","Tallon IV"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('Reddit''in antenli uzaylı maskotunun adı nedir?', '["Snoo","Tux","Clippy","Domo"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('''The Last of Us''ta Joel''in öykü başında hayatını kaybeden kızının adı nedir?', '["Sarah","Ellie","Tess","Maria"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('1976 Montreal Olimpiyatları''nda Nadia Comăneci hangi ülkeyi temsil etti?', '["Romanya","Macaristan","Bulgaristan","Çekoslovakya"]'::jsonb, 0, 'spor', 'global', null, 2),
('2004''te ''Yenilmezler'' olarak Premier League''i bitiren takım hangisidir?', '["Arsenal","Chelsea","Liverpool","Manchester United"]'::jsonb, 0, 'spor', 'global', null, 2),
('1998 Dünya Kupası finalinde Brezilya''yı 3-0 yenen ülke hangisidir?', '["Fransa","İtalya","Arjantin","Hollanda"]'::jsonb, 0, 'spor', 'global', null, 2),
('2011 NBA Finalleri''nde Miami Heat''i yenerek şampiyon olan takım hangisidir?', '["Dallas Mavericks","Denver Nuggets","Phoenix Suns","Portland Trail Blazers"]'::jsonb, 0, 'spor', 'global', null, 2),
('''Malice at the Palace'' kavgasındaki 2004 maçında Detroit''in rakibi hangi takımdı?', '["Indiana Pacers","Chicago Bulls","New Jersey Nets","Cleveland Cavaliers"]'::jsonb, 0, 'spor', 'global', null, 3),
('2000 Avrupa Futbol Şampiyonası finalinde Fransa''nın altın golünü kim attı?', '["David Trezeguet","Thierry Henry","Sylvain Wiltord","Nicolas Anelka"]'::jsonb, 0, 'spor', 'global', null, 3),
('Napolyon''un 1815''te yenildiği Waterloo Savaşı''ndaki İngiliz komutan kimdi?', '["Wellington","Nelson","Marlborough","Montgomery"]'::jsonb, 0, 'tarih', 'global', null, 2),
('''Arabalar'' filmindeki Sally hangi otomobil markasının modelidir?', '["Porsche","Ferrari","Chevrolet","Mercedes"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Yukarı Bak''ta Carl''a yolculuğunda eşlik eden izci çocuğun adı nedir?', '["Russell","Elliott","Miguel","Hiccup"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Kung Fu Panda''da Po''nun babası Bay Ping hangi hayvandır?', '["Kaz","Ördek","Turna","Pelikan"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''The Incredibles''ta süper kahraman kostümlerini tasarlayan kişinin adı nedir?', '["Edna Mode","Mirage","Helen Parr","Evelyn Deavor"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Ratatouille''de Remy''nin peşinden Paris''e gelen kardeşinin adı nedir?', '["Emile","Gusteau","Skinner","Django"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''Shrek 2''de Fiona''nın babası Kral Harold hangi hayvana dönüşür?', '["Kurbağa","Kertenkele","Fare","Yarasa"]'::jsonb, 0, 'sinema', 'global', null, 3),
('Pringles kutularındaki maskotun yüzündeki belirgin özellik hangisidir?', '["Bıyık","Sakal","Gözlük","Göz bandı"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Tintin''in beyaz köpeğinin Fransızca özgün adı nedir?', '["Milou","Idefix","Rantanplan","Snoopy"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('''SpongeBob SquarePants''ta Bob''un evcil salyangozunun adı nedir?', '["Gary","Patrick","Sandy","Pearl"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Paddington''ın şapkasında sakladığı sandviçin dolgusu nedir?', '["Marmelat","Peynir","Fıstık ezmesi","Çikolata kreması"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Grinch''in köpeğinin adı nedir?', '["Max","Rex","Spot","Buddy"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Şirinler''de Gargamel''in kedisinin adı nedir?', '["Azman","Tom","Felix","Sylvester"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('''The Flintstones''ta ailenin evcil dinozorunun adı nedir?', '["Dino","Hoppy","Bam-Bam","Gazoo"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('McDonald''s''ın Ronald adlı maskotu hangi kostümle tanınır?', '["Palyaço","Kovboy","Korsan","Sihirbaz"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('M&M''s markasındaki iki M, Mars ve hangi soyadını temsil eder?', '["Murrie","Milton","Morgan","Merrill"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('Klasik İngiliz ''Cluedo'' oyununda öldürülen ev sahibinin adı nedir?', '["Dr. Black","Dr. Green","Dr. White","Dr. Grey"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('''Peanuts''ta Snoopy''nin küçük sarı kuş arkadaşının adı nedir?', '["Woodstock","Tweety","Road Runner","Zazu"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('''Harry Potter''da Draco Malfoy''un okul binası hangisidir?', '["Slytherin","Gryffindor","Ravenclaw","Hufflepuff"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Matilda'' romanında kahramanın sevdiği öğretmenin soyadı nedir?', '["Honey","Trunchbull","Wormwood","Phelps"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Narnia Günlükleri''nde dört kardeşin soyadı nedir?', '["Pevensie","Weasley","Baudelaire","March"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Uğultulu Tepeler''de Catherine''in evlendiği Edgar''ın soyadı nedir?', '["Linton","Earnshaw","Heathcliff","Lockwood"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('''Harry Potter''da Hogwarts''ın okul poltergeistının adı nedir?', '["Peeves","Dobby","Kreacher","Winky"]'::jsonb, 0, 'edebiyat', 'global', null, 3)
on conflict (soru) do nothing;

-- ---------------------------------------------------- İngilizce çeviri
insert into public.question_translations (question_id, dil, soru, secenekler)
select q.id, 'en', v.en_soru, v.en_secenekler
  from (values
  ('Rodin''in ''Düşünen Adam'' heykelinde figür hangi konumdadır?', 'What is the figure doing in Rodin''s The Thinker?', '["Sitting","Walking","Lying down","Kneeling"]'::jsonb),
  ('René Magritte''in ''Âşıklar'' tablosundaki çiftin yüzlerini ne örter?', 'What covers the couple''s faces in Rene Magritte''s The Lovers?', '["White cloth","Black masks","Red curtains","Blue veils"]'::jsonb),
  ('Magritte''in ''Golconda'' tablosunda havada asılı duran erkekler hangi şapkayı takar?', 'What kind of hats do the men wear in Magritte''s Golconda?', '["Bowler","Fedora","Top hat","Flat cap"]'::jsonb),
  ('Michelangelo''nun Sistina Şapeli tavanındaki Âdem''e uzanan el kime aittir?', 'Whose hand reaches toward Adam in Michelangelo''s Sistine Chapel ceiling?', '["God","Moses","Abraham","David"]'::jsonb),
  ('Edvard Munch''un ''Çığlık'' tablosunda ana figür ellerini nereye götürür?', 'Where does the central figure place its hands in Edvard Munch''s The Scream?', '["Its head","Its chest","Its knees","Its waist"]'::jsonb),
  ('Goya''nın ''3 Mayıs 1808'' tablosundaki kurbanın açık kollarıyla görülen gömleği hangi renktir?', 'What color is the shirt of the man with outstretched arms in Goya''s The Third of May 1808?', '["White","Black","Blue","Green"]'::jsonb),
  ('Salvador Dalí''nin ''Belleğin Azmi'' tablosunda eriyen saatlerden biri neye asılıdır?', 'What does one of the melting watches hang from in Dali''s The Persistence of Memory?', '["A tree branch","A door handle","A chair back","A window frame"]'::jsonb),
  ('''Blue Monday'' adlı 1983 şarkısını hangi grup kaydetti?', 'Which band recorded the 1983 song Blue Monday?', '["New Order","Depeche Mode","Pet Shop Boys","Erasure"]'::jsonb),
  ('''Never Gonna Give You Up'' şarkısının 1987''deki yorumcusu kimdir?', 'Who recorded Never Gonna Give You Up in 1987?', '["Rick Astley","George Michael","Phil Collins","Billy Ocean"]'::jsonb),
  ('''Gangnam Style'' şarkısıyla ünlenen Güney Koreli müzisyen kimdir?', 'Which South Korean performer became famous worldwide for Gangnam Style?', '["PSY","Rain","G-Dragon","Taeyang"]'::jsonb),
  ('''Walk This Way''in 1986 yorumunda Run-DMC hangi rock grubuyla bir araya geldi?', 'Which rock band joined Run-DMC for the 1986 version of Walk This Way?', '["Aerosmith","Van Halen","Bon Jovi","Def Leppard"]'::jsonb),
  ('''Tomb Raider'' serisinin arkeolog kahramanının soyadı nedir?', 'What is the surname of the archaeologist who stars in Tomb Raider?', '["Croft","Drake","Kennedy","Redfield"]'::jsonb),
  ('''Animal Crossing'' oyunlarında kullanılan ana para biriminin adı nedir?', 'What is the main currency in the Animal Crossing games called?', '["Bells","Rupees","Gil","Septims"]'::jsonb),
  ('''Stardew Valley''de oyuncunun çiftliğinin yanındaki kasabanın adı nedir?', 'What is the name of the town beside the player''s farm in Stardew Valley?', '["Pelican Town","Pallet Town","Lavender Town","Twinleaf Town"]'::jsonb),
  ('''God of War'' serisindeki Kratos''un oğlunun adı nedir?', 'What is the name of Kratos''s son in God of War?', '["Atreus","Deimos","Baldur","Brok"]'::jsonb),
  ('''Overwatch''taki Winston karakteri hangi hayvandır?', 'What animal is Winston in Overwatch?', '["Gorilla","Chimpanzee","Orangutan","Baboon"]'::jsonb),
  ('''Fallout'' serisinin mavi tulumlu, sarı saçlı maskotunun adı nedir?', 'What is the name of Fallout''s blond mascot in a blue jumpsuit?', '["Vault Boy","Pip-Boy","Dogmeat","Codsworth"]'::jsonb),
  ('''Kirby'' oyunlarının kahramanının memleketi olan yıldız biçimli gezegen hangisidir?', 'What is the name of Kirby''s star-shaped home planet?', '["Popstar","Mobius","Zebes","Tallon IV"]'::jsonb),
  ('Reddit''in antenli uzaylı maskotunun adı nedir?', 'What is the name of Reddit''s antenna-wearing alien mascot?', '["Snoo","Tux","Clippy","Domo"]'::jsonb),
  ('''The Last of Us''ta Joel''in öykü başında hayatını kaybeden kızının adı nedir?', 'What is the name of Joel''s daughter who dies at the start of The Last of Us?', '["Sarah","Ellie","Tess","Maria"]'::jsonb),
  ('1976 Montreal Olimpiyatları''nda Nadia Comăneci hangi ülkeyi temsil etti?', 'Which country did Nadia Comaneci represent at the 1976 Olympics?', '["Romania","Hungary","Bulgaria","Czechoslovakia"]'::jsonb),
  ('2004''te ''Yenilmezler'' olarak Premier League''i bitiren takım hangisidir?', 'Which team completed the 2004 Premier League season as the Invincibles?', '["Arsenal","Chelsea","Liverpool","Manchester United"]'::jsonb),
  ('1998 Dünya Kupası finalinde Brezilya''yı 3-0 yenen ülke hangisidir?', 'Which country beat Brazil 3-0 in the 1998 World Cup final?', '["France","Italy","Argentina","Netherlands"]'::jsonb),
  ('2011 NBA Finalleri''nde Miami Heat''i yenerek şampiyon olan takım hangisidir?', 'Which team beat Miami Heat to win the 2011 NBA Finals?', '["Dallas Mavericks","Denver Nuggets","Phoenix Suns","Portland Trail Blazers"]'::jsonb),
  ('''Malice at the Palace'' kavgasındaki 2004 maçında Detroit''in rakibi hangi takımdı?', 'Which team faced Detroit in the 2004 game known for the Malice at the Palace brawl?', '["Indiana Pacers","Chicago Bulls","New Jersey Nets","Cleveland Cavaliers"]'::jsonb),
  ('2000 Avrupa Futbol Şampiyonası finalinde Fransa''nın altın golünü kim attı?', 'Who scored France''s golden goal in the Euro 2000 final?', '["David Trezeguet","Thierry Henry","Sylvain Wiltord","Nicolas Anelka"]'::jsonb),
  ('Napolyon''un 1815''te yenildiği Waterloo Savaşı''ndaki İngiliz komutan kimdi?', 'Who commanded the British forces that defeated Napoleon at Waterloo in 1815?', '["Wellington","Nelson","Marlborough","Montgomery"]'::jsonb),
  ('''Arabalar'' filmindeki Sally hangi otomobil markasının modelidir?', 'What car brand is Sally in Cars?', '["Porsche","Ferrari","Chevrolet","Mercedes"]'::jsonb),
  ('''Yukarı Bak''ta Carl''a yolculuğunda eşlik eden izci çocuğun adı nedir?', 'What is the name of the young scout who joins Carl on his journey in Up?', '["Russell","Elliott","Miguel","Hiccup"]'::jsonb),
  ('''Kung Fu Panda''da Po''nun babası Bay Ping hangi hayvandır?', 'What kind of bird is Mr. Ping, Po''s father in Kung Fu Panda?', '["Goose","Duck","Crane","Pelican"]'::jsonb),
  ('''The Incredibles''ta süper kahraman kostümlerini tasarlayan kişinin adı nedir?', 'Who designs the superhero costumes in The Incredibles?', '["Edna Mode","Mirage","Helen Parr","Evelyn Deavor"]'::jsonb),
  ('''Ratatouille''de Remy''nin peşinden Paris''e gelen kardeşinin adı nedir?', 'What is the name of Remy''s brother in Ratatouille?', '["Emile","Gusteau","Skinner","Django"]'::jsonb),
  ('''Shrek 2''de Fiona''nın babası Kral Harold hangi hayvana dönüşür?', 'What animal does King Harold turn into in Shrek 2?', '["Frog","Lizard","Mouse","Bat"]'::jsonb),
  ('Pringles kutularındaki maskotun yüzündeki belirgin özellik hangisidir?', 'What distinctive feature appears on the face of the Pringles mascot?', '["Mustache","Beard","Glasses","Eyepatch"]'::jsonb),
  ('Tintin''in beyaz köpeğinin Fransızca özgün adı nedir?', 'What is the name of Tintin''s white dog in the original French comics?', '["Milou","Idefix","Rantanplan","Snoopy"]'::jsonb),
  ('''SpongeBob SquarePants''ta Bob''un evcil salyangozunun adı nedir?', 'What is the name of SpongeBob''s pet snail?', '["Gary","Patrick","Sandy","Pearl"]'::jsonb),
  ('Paddington''ın şapkasında sakladığı sandviçin dolgusu nedir?', 'What filling does Paddington put in the sandwich he keeps under his hat?', '["Marmalade","Cheese","Peanut butter","Chocolate spread"]'::jsonb),
  ('Grinch''in köpeğinin adı nedir?', 'What is the name of the Grinch''s dog?', '["Max","Rex","Spot","Buddy"]'::jsonb),
  ('Şirinler''de Gargamel''in kedisinin adı nedir?', 'What is the name of Gargamel''s cat in The Smurfs?', '["Azrael","Tom","Felix","Sylvester"]'::jsonb),
  ('''The Flintstones''ta ailenin evcil dinozorunun adı nedir?', 'What is the name of the Flintstone family''s pet dinosaur?', '["Dino","Hoppy","Bam-Bam","Gazoo"]'::jsonb),
  ('McDonald''s''ın Ronald adlı maskotu hangi kostümle tanınır?', 'What costume is McDonald''s mascot Ronald known for?', '["Clown","Cowboy","Pirate","Magician"]'::jsonb),
  ('M&M''s markasındaki iki M, Mars ve hangi soyadını temsil eder?', 'The two M''s in M&M''s stand for Mars and which other surname?', '["Murrie","Milton","Morgan","Merrill"]'::jsonb),
  ('Klasik İngiliz ''Cluedo'' oyununda öldürülen ev sahibinin adı nedir?', 'What is the murdered host called in the classic British version of Cluedo?', '["Dr. Black","Dr. Green","Dr. White","Dr. Grey"]'::jsonb),
  ('''Peanuts''ta Snoopy''nin küçük sarı kuş arkadaşının adı nedir?', 'What is the name of Snoopy''s small yellow bird friend in Peanuts?', '["Woodstock","Tweety","Road Runner","Zazu"]'::jsonb),
  ('''Harry Potter''da Draco Malfoy''un okul binası hangisidir?', 'Which Hogwarts house does Draco Malfoy belong to in Harry Potter?', '["Slytherin","Gryffindor","Ravenclaw","Hufflepuff"]'::jsonb),
  ('''Matilda'' romanında kahramanın sevdiği öğretmenin soyadı nedir?', 'What is the surname of Matilda''s beloved teacher in Roald Dahl''s novel?', '["Honey","Trunchbull","Wormwood","Phelps"]'::jsonb),
  ('''Narnia Günlükleri''nde dört kardeşin soyadı nedir?', 'What is the surname of the four siblings in The Chronicles of Narnia?', '["Pevensie","Weasley","Baudelaire","March"]'::jsonb),
  ('''Uğultulu Tepeler''de Catherine''in evlendiği Edgar''ın soyadı nedir?', 'What is Edgar''s surname in Wuthering Heights?', '["Linton","Earnshaw","Heathcliff","Lockwood"]'::jsonb),
  ('''Harry Potter''da Hogwarts''ın okul poltergeistının adı nedir?', 'What is the name of Hogwarts''s resident poltergeist in the Harry Potter books?', '["Peeves","Dobby","Kreacher","Winky"]'::jsonb)
  ) v(soru, en_soru, en_secenekler)
  join public.questions q on q.soru = v.soru and q.created_at >= transaction_timestamp()
on conflict (question_id, dil) do nothing;

-- ---------------------------------------------------- Çevrilmeyenler
insert into public.ceviri_atlanan (question_id, dil, neden, kod)
select q.id, 'en', v.neden, 'cevrilemez'
  from (values
  ('''Kaplumbağa Terbiyecisi'' tablosundaki yaşlı adam elinde hangi çalgıyı tutar?', 'Türkiye’ye özgü eser; stil profiline göre yerel soru İngilizce havuza eklenmez.')
  ) v(soru, neden)
  join public.questions q on q.soru = v.soru and q.created_at >= transaction_timestamp()
on conflict (question_id, dil) do nothing;

-- ---------------------------------------------------- Karıştırma (TR + EN aynı permütasyon)
drop table if exists pg_temp._parti_karistir;
create temp table _parti_karistir as
select q.id, array_agg(s.idx order by s.rnd) as perm
  from public.questions q
  cross join lateral (
    select (ordinality - 1)::int as idx, random() as rnd
      from jsonb_array_elements(q.secenekler) with ordinality
  ) s
 where q.created_at >= transaction_timestamp()
 group by q.id;

update public.questions q
   set secenekler = (select jsonb_agg(q.secenekler -> u.p order by u.o)
                       from unnest(k.perm) with ordinality u(p, o)),
       dogru_cevap = (array_position(k.perm, q.dogru_cevap::int) - 1)::smallint
  from _parti_karistir k
 where q.id = k.id;

update public.question_translations t
   set secenekler = (select jsonb_agg(t.secenekler -> u.p order by u.o)
                       from unnest(k.perm) with ordinality u(p, o))
  from _parti_karistir k
 where t.question_id = k.id;

drop table if exists pg_temp._parti_karistir;
