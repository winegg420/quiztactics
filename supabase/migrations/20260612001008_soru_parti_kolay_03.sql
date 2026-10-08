-- ============================================================
-- 1008 — soru_parti_kolay_03 (stil: docs/SORU_STIL_PROFILI.md): 50 soru · 2026-10-08
--
-- Kategori: muzik 8 · sanat 12 · sinema 7 · spor 11 · tarih 4 · teknoloji 8
-- Yerel (kapsam='yerel', ulke='TR'): 1 · zorluk 1–5: 0/36/14/0/0
-- İngilizce çeviri: 49 · çevrilmeyen (ceviri_atlanan, kod 'cevrilemez'): 1
--
-- Kalite (araclar/soru-uretim/api-uret.mjs; üretim claude-opus-5-5, hakem claude-sonnet-5-5):
-- biçim + şık denge (TR/EN), havuzla birebir ve anlamca tekrar (aynı cevap + Jaccard ≥ 0,3),
-- cevap soru metninde değil, soru_kural_isaretleri (ağırlık ≥ 2 yok), Jev şık ipucu testi
-- (soru gizli, doğru şıkka p ≤ 0,75), Jev tek doğru, Claude hakem (doğru şık kesin, yanlış
-- şıklar kesin yanlış, yasak tip yok: genel kavram / tanımlama / okuduğunu anlama / mantıkla
-- bulunur; tek olgu, eskimez, EN aynı sırada ve doğal, zorluk tahmini etiketle uyumlu).
--
-- Sıra: sorular doğru şık 0'da eklenir, çeviriler aynı sırayla yazılır, sonunda YALNIZ
-- bu işlemde eklenen satırların şıkları karıştırılır — TR ve EN AYNI permütasyonla
-- (dogru_cevap indeksi ortak olduğu için şart). `created_at >= transaction_timestamp()`
-- koşulu ZORUNLUDUR; onsuz tüm havuz karışır ve oynanan maçlarda indeks kayar.
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti 3 --no 1008 --klasor kolay-03 --ad soru_parti_kolay_03 --api
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
('Anish Kapoor''un ''Fasulye'' lakaplı ayna gibi parlak ''Cloud Gate'' heykeli hangi şehirdedir?', '["Chicago","New York","Seattle","Boston"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Edward Hopper''ın ''Nighthawks'' tablosu gece hangi tür mekânın içini gösterir?', '["Lokanta","Sinema","Otel lobisi","Tren garı"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Michelangelo''nun Davut heykeli sol omzunda hangi silahı tutar?', '["Sapan","Kılıç","Mızrak","Yay"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Hiyerogliflerin çözülmesini sağlayan Rosetta Taşı hangi müzede sergilenir?', '["British Museum","Louvre Müzesi","Metropolitan Müzesi","Kahire Mısır Müzesi"]'::jsonb, 0, 'sanat', 'global', null, 2),
('New York''taki Özgürlük Heykeli sol elinde ne tutar?', '["Tablet","Kılıç","Terazi","Kalkan"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Louise Bourgeois''nın dev ''Maman'' heykeli hangi hayvanı betimler?', '["Örümcek","Akrep","Yengeç","Karınca"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Magritte''in ''İnsanoğlu'' tablosunda adamın yüzünü hangi meyve kapatır?', '["Elma","Armut","Portakal","Ayva"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Frank Gehry''nin titanyum kaplı Guggenheim Müzesi hangi İspanyol şehrindedir?', '["Bilbao","San Sebastián","Valensiya","Málaga"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Dalí''nin sürrealist telefon heykelinde ahize hangi hayvan biçimindedir?', '["Istakoz","Yengeç","Karides","Balık"]'::jsonb, 0, 'sanat', 'global', null, 3),
('Van Gogh''un ''Yıldızlı Gece'' tablosunun ön planında yükselen ağaç hangisidir?', '["Selvi","Kavak","Çam","Zeytin"]'::jsonb, 0, 'sanat', 'global', null, 3),
('Leonardo da Vinci''nin Krakov''daki ünlü kadın portresinde kadının kucağında hangi hayvan vardır?', '["Kakım","Kedi","Tavşan","Köpek"]'::jsonb, 0, 'sanat', 'global', null, 3),
('Berlin''deki Reichstag binasını kumaşla tamamen saran sanatçı çifti kimdir?', '["Christo ve Jeanne-Claude","Gilbert ve George","Marina Abramović ve Ulay","Bernd ve Hilla Becher"]'::jsonb, 0, 'sanat', 'global', null, 3),
('Defalarca yeniden yorumlanan ''Hallelujah'' şarkısını yazan sanatçı kimdir?', '["Leonard Cohen","Jeff Buckley","Bob Dylan","Gordon Lightfoot"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Livin'' on a Prayer'' ve ''It''s My Life'' şarkılarıyla tanınan rock grubu hangisidir?', '["Bon Jovi","Def Leppard","Van Halen","Journey"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Elvis Presley''in ünlü malikânesi Graceland hangi şehirdedir?', '["Memphis","Nashville","Tupelo","New Orleans"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Debbie Harry''nin vokalistliğini yaptığı, ''Heart of Glass'' şarkılı grup hangisidir?', '["Blondie","The Pretenders","The Go-Go''s","Eurythmics"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''The Sound of Silence'' şarkısını seslendiren ünlü ikili hangisidir?', '["Simon & Garfunkel","The Everly Brothers","Hall & Oates","The Righteous Brothers"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Country ile rap''i karıştıran ''Old Town Road'' şarkısının sahibi kimdir?', '["Lil Nas X","Post Malone","Travis Scott","Lil Uzi Vert"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Beyoncé''nin 2008 albümüne adını veren sahne kişiliğinin adı nedir?', '["Sasha Fierce","Roman Zolanski","Chris Gaines","Ziggy Stardust"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Michael Jackson''ın yanından ayırmadığı ünlü şempanzenin adı nedir?', '["Bubbles","Cheeta","Bonzo","Coco"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Mavi kirpi Sonic hangi oyun şirketinin maskotudur?', '["Sega","Nintendo","Atari","Capcom"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Bill Gates ile birlikte Microsoft''u kuran kişi kimdir?', '["Paul Allen","Steve Ballmer","Steve Wozniak","Gary Kildall"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Hareket algılayan kumandasıyla ünlü, Nintendo''nun 2006''da çıkardığı konsol hangisidir?', '["Wii","GameCube","Switch","Nintendo 64"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Microsoft''un kendi ürettiği tablet ve dizüstü bilgisayar serisinin adı nedir?', '["Surface","Galaxy Tab","ThinkPad","Pixelbook"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Klasik arcade oyunu Pac-Man''i geliştiren Japon şirketi hangisidir?', '["Namco","Sega","Konami","Capcom"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Şeker eşleştirme oyunu Candy Crush Saga''yı geliştiren şirket hangisidir?', '["King","Zynga","PopCap","Gameloft"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Twitter''ın mavi kuş logosuna verilen ad nedir?', '["Larry","Tweety","Robin","Jack"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('Windows XP''nin yeşil tepeli, mavi gökyüzlü varsayılan duvar kâğıdının adı nedir?', '["Bliss","Serenity","Harmony","Meadow"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('Futbolcu Gareth Bale hangi ülkenin milli takımında oynamıştır?', '["Galler","İskoçya","İrlanda","İngiltere"]'::jsonb, 0, 'spor', 'global', null, 2),
('Cristiano Ronaldo 2003''te Manchester United''a hangi Portekiz kulübünden transfer oldu?', '["Sporting","Benfica","Porto","Boavista"]'::jsonb, 0, 'spor', 'global', null, 2),
('Lionel Messi''nin İspanyolca lakabı ''La Pulga'' hangi canlıyı ifade eder?', '["Pire","Karınca","Sivrisinek","Arı"]'::jsonb, 0, 'spor', 'global', null, 2),
('''All Blacks'' lakabıyla bilinen rugby milli takımı hangi ülkenindir?', '["Yeni Zelanda","Avustralya","Güney Afrika","Fiji"]'::jsonb, 0, 'spor', 'global', null, 2),
('Cristiano Ronaldo hangi adada doğmuştur?', '["Madeira","Sicilya","Sardinya","Korsika"]'::jsonb, 0, 'spor', 'global', null, 2),
('Ali ile Foreman arasındaki ''Rumble in the Jungle'' maçı hangi ülkede yapıldı?', '["Zaire","Nijerya","Kenya","Gana"]'::jsonb, 0, 'spor', 'global', null, 2),
('David Beckham 2007''de Real Madrid''den ayrılıp hangi ABD kulübüne transfer oldu?', '["LA Galaxy","NY Red Bulls","Inter Miami","Seattle Sounders"]'::jsonb, 0, 'spor', 'global', null, 2),
('Golfte Masters turnuvasının kazananına giydirilen ceket hangi renktir?', '["Yeşil","Kırmızı","Lacivert","Beyaz"]'::jsonb, 0, 'spor', 'global', null, 2),
('Pelé lakabıyla tanınan Brezilyalı futbol efsanesinin gerçek ilk adı nedir?', '["Edson","Arthur","Manoel","Jair"]'::jsonb, 0, 'spor', 'global', null, 3),
('Formula 1''de ''Gümüş Oklar'' lakabıyla anılan takım hangisidir?', '["Mercedes","Ferrari","Williams","Renault"]'::jsonb, 0, 'spor', 'global', null, 3),
('Tenisçi Rafael Nadal hangi İspanyol adasında doğmuştur?', '["Mallorca","Ibiza","Menorca","Tenerife"]'::jsonb, 0, 'spor', 'global', null, 3),
('Charles Darwin, Galapagos Adaları''nı da ziyaret ettiği ünlü yolculuğunu hangi gemiyle yaptı?', '["HMS Beagle","HMS Endeavour","HMS Bounty","HMS Victory"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Amiral Nelson, Trafalgar Savaşı''nda hangi gemisinin güvertesinde ölümcül yaralandı?', '["HMS Victory","HMS Bounty","HMS Beagle","HMS Endeavour"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Paskalya Adası''ndaki dev taş insan başı heykellerine ne ad verilir?', '["Moai","Tiki","Totem","Menhir"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Kennedy suikastının zanlısı Lee Harvey Oswald''ı iki gün sonra vurarak öldüren kişi kimdir?', '["Jack Ruby","James Earl Ray","Sirhan Sirhan","Frank Sturgis"]'::jsonb, 0, 'tarih', 'global', null, 3),
('''Schindler''in Listesi'' filminde Oskar Schindler''i canlandıran oyuncu kimdir?', '["Liam Neeson","Ralph Fiennes","Gary Oldman","Daniel Day-Lewis"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Örümcek Adam'' filmlerinde Peter Parker''ı büyüten amcasının adı nedir?', '["Ben","Frank","George","Harry"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Rüzgâr Gibi Geçti'' filminde Rhett Butler''ı canlandıran oyuncu kimdir?', '["Clark Gable","Cary Grant","Gregory Peck","Errol Flynn"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Şener Şen''in Baran''ı oynadığı ''Eşkıya'' filminin yönetmeni kimdir?', '["Yavuz Turgul","Ertem Eğilmez","Zeki Ökten","Atıf Yılmaz"]'::jsonb, 0, 'sinema', 'yerel', 'TR', 2),
('''Dövüş Kulübü'' filminde Tyler Durden''ı canlandıran oyuncu kimdir?', '["Brad Pitt","Edward Norton","Jared Leto","Matt Damon"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Harry Potter'' filmlerinde Hagrid''in kulübesinde yaşayan iri köpeğin adı nedir?', '["Fang","Fluffy","Norbert","Buckbeak"]'::jsonb, 0, 'sinema', 'global', null, 3),
('Scorsese''nin ''Sıkı Dostlar'' filminde Henry Hill''i canlandıran oyuncu kimdir?', '["Ray Liotta","Joe Pesci","Robert De Niro","Paul Sorvino"]'::jsonb, 0, 'sinema', 'global', null, 3)
on conflict (soru) do nothing;

-- ---------------------------------------------------- İngilizce çeviri
insert into public.question_translations (question_id, dil, soru, secenekler)
select q.id, 'en', v.en_soru, v.en_secenekler
  from (values
  ('Anish Kapoor''un ''Fasulye'' lakaplı ayna gibi parlak ''Cloud Gate'' heykeli hangi şehirdedir?', 'Anish Kapoor''s mirrored sculpture Cloud Gate, nicknamed ''The Bean'', stands in which city?', '["Chicago","New York","Seattle","Boston"]'::jsonb),
  ('Edward Hopper''ın ''Nighthawks'' tablosu gece hangi tür mekânın içini gösterir?', 'Edward Hopper''s ''Nighthawks'' shows people inside what kind of place at night?', '["A diner","A cinema","A hotel lobby","A train station"]'::jsonb),
  ('Michelangelo''nun Davut heykeli sol omzunda hangi silahı tutar?', 'What weapon does Michelangelo''s David hold over his left shoulder?', '["A sling","A sword","A spear","A bow"]'::jsonb),
  ('Hiyerogliflerin çözülmesini sağlayan Rosetta Taşı hangi müzede sergilenir?', 'The Rosetta Stone is on display in which museum?', '["The British Museum","The Louvre","The Metropolitan Museum","The Egyptian Museum in Cairo"]'::jsonb),
  ('New York''taki Özgürlük Heykeli sol elinde ne tutar?', 'What does the Statue of Liberty hold in her left hand?', '["A tablet","A sword","Scales","A shield"]'::jsonb),
  ('Louise Bourgeois''nın dev ''Maman'' heykeli hangi hayvanı betimler?', 'Louise Bourgeois''s giant sculpture ''Maman'' depicts which creature?', '["Spider","Scorpion","Crab","Ant"]'::jsonb),
  ('Magritte''in ''İnsanoğlu'' tablosunda adamın yüzünü hangi meyve kapatır?', 'In Magritte''s ''The Son of Man'', which fruit hides the man''s face?', '["Apple","Pear","Orange","Quince"]'::jsonb),
  ('Frank Gehry''nin titanyum kaplı Guggenheim Müzesi hangi İspanyol şehrindedir?', 'Frank Gehry''s titanium-clad Guggenheim Museum is in which Spanish city?', '["Bilbao","San Sebastian","Valencia","Malaga"]'::jsonb),
  ('Dalí''nin sürrealist telefon heykelinde ahize hangi hayvan biçimindedir?', 'In Dali''s surrealist telephone sculpture, the handset is shaped like what animal?', '["A lobster","A crab","A shrimp","A fish"]'::jsonb),
  ('Van Gogh''un ''Yıldızlı Gece'' tablosunun ön planında yükselen ağaç hangisidir?', 'What kind of tree rises in the foreground of Van Gogh''s The Starry Night?', '["Cypress","Poplar","Pine","Olive"]'::jsonb),
  ('Leonardo da Vinci''nin Krakov''daki ünlü kadın portresinde kadının kucağında hangi hayvan vardır?', 'In Leonardo da Vinci''s famous portrait of a woman now in Krakow, what animal is she holding?', '["Ermine","Cat","Rabbit","Dog"]'::jsonb),
  ('Berlin''deki Reichstag binasını kumaşla tamamen saran sanatçı çifti kimdir?', 'Which artist couple famously wrapped Berlin''s Reichstag building in fabric?', '["Christo and Jeanne-Claude","Gilbert and George","Marina Abramovic and Ulay","Bernd and Hilla Becher"]'::jsonb),
  ('Defalarca yeniden yorumlanan ''Hallelujah'' şarkısını yazan sanatçı kimdir?', 'Who wrote the much-covered song ''Hallelujah''?', '["Leonard Cohen","Jeff Buckley","Bob Dylan","Gordon Lightfoot"]'::jsonb),
  ('''Livin'' on a Prayer'' ve ''It''s My Life'' şarkılarıyla tanınan rock grubu hangisidir?', 'Which rock band is known for ''Livin'' on a Prayer'' and ''It''s My Life''?', '["Bon Jovi","Def Leppard","Van Halen","Journey"]'::jsonb),
  ('Elvis Presley''in ünlü malikânesi Graceland hangi şehirdedir?', 'In which city is Elvis Presley''s famous mansion, Graceland, located?', '["Memphis","Nashville","Tupelo","New Orleans"]'::jsonb),
  ('Debbie Harry''nin vokalistliğini yaptığı, ''Heart of Glass'' şarkılı grup hangisidir?', 'Fronted by Debbie Harry, which band had a hit with ''Heart of Glass''?', '["Blondie","The Pretenders","The Go-Go''s","Eurythmics"]'::jsonb),
  ('''The Sound of Silence'' şarkısını seslendiren ünlü ikili hangisidir?', 'Which famous duo recorded ''The Sound of Silence''?', '["Simon & Garfunkel","The Everly Brothers","Hall & Oates","The Righteous Brothers"]'::jsonb),
  ('Country ile rap''i karıştıran ''Old Town Road'' şarkısının sahibi kimdir?', 'Who had a massive country-rap hit with ''Old Town Road''?', '["Lil Nas X","Post Malone","Travis Scott","Lil Uzi Vert"]'::jsonb),
  ('Beyoncé''nin 2008 albümüne adını veren sahne kişiliğinin adı nedir?', 'What is the name of Beyonce''s stage alter ego that gave its name to her 2008 album?', '["Sasha Fierce","Roman Zolanski","Chris Gaines","Ziggy Stardust"]'::jsonb),
  ('Michael Jackson''ın yanından ayırmadığı ünlü şempanzenin adı nedir?', 'What was the name of Michael Jackson''s famous pet chimpanzee?', '["Bubbles","Cheeta","Bonzo","Coco"]'::jsonb),
  ('Mavi kirpi Sonic hangi oyun şirketinin maskotudur?', 'Sonic the Hedgehog is the mascot of which video game company?', '["Sega","Nintendo","Atari","Capcom"]'::jsonb),
  ('Bill Gates ile birlikte Microsoft''u kuran kişi kimdir?', 'Who co-founded Microsoft with Bill Gates?', '["Paul Allen","Steve Ballmer","Steve Wozniak","Gary Kildall"]'::jsonb),
  ('Hareket algılayan kumandasıyla ünlü, Nintendo''nun 2006''da çıkardığı konsol hangisidir?', 'Which Nintendo console, launched in 2006, was famous for its motion-sensing controller?', '["Wii","GameCube","Switch","Nintendo 64"]'::jsonb),
  ('Microsoft''un kendi ürettiği tablet ve dizüstü bilgisayar serisinin adı nedir?', 'What is the name of Microsoft''s own line of tablets and laptops?', '["Surface","Galaxy Tab","ThinkPad","Pixelbook"]'::jsonb),
  ('Klasik arcade oyunu Pac-Man''i geliştiren Japon şirketi hangisidir?', 'Which Japanese company created the classic arcade game Pac-Man?', '["Namco","Sega","Konami","Capcom"]'::jsonb),
  ('Şeker eşleştirme oyunu Candy Crush Saga''yı geliştiren şirket hangisidir?', 'Which company makes the candy-matching game Candy Crush Saga?', '["King","Zynga","PopCap","Gameloft"]'::jsonb),
  ('Twitter''ın mavi kuş logosuna verilen ad nedir?', 'What name was given to Twitter''s blue bird logo?', '["Larry","Tweety","Robin","Jack"]'::jsonb),
  ('Windows XP''nin yeşil tepeli, mavi gökyüzlü varsayılan duvar kâğıdının adı nedir?', 'What is the name of Windows XP''s default wallpaper showing a green hill and blue sky?', '["Bliss","Serenity","Harmony","Meadow"]'::jsonb),
  ('Futbolcu Gareth Bale hangi ülkenin milli takımında oynamıştır?', 'Which national team did footballer Gareth Bale play for?', '["Wales","Scotland","Ireland","England"]'::jsonb),
  ('Cristiano Ronaldo 2003''te Manchester United''a hangi Portekiz kulübünden transfer oldu?', 'From which Portuguese club did Cristiano Ronaldo join Manchester United in 2003?', '["Sporting","Benfica","Porto","Boavista"]'::jsonb),
  ('Lionel Messi''nin İspanyolca lakabı ''La Pulga'' hangi canlıyı ifade eder?', 'Lionel Messi''s nickname ''La Pulga'' refers to which creature?', '["Flea","Ant","Mosquito","Bee"]'::jsonb),
  ('''All Blacks'' lakabıyla bilinen rugby milli takımı hangi ülkenindir?', 'Which country''s national rugby team is nicknamed the ''All Blacks''?', '["New Zealand","Australia","South Africa","Fiji"]'::jsonb),
  ('Cristiano Ronaldo hangi adada doğmuştur?', 'On which island was Cristiano Ronaldo born?', '["Madeira","Sicily","Sardinia","Corsica"]'::jsonb),
  ('Ali ile Foreman arasındaki ''Rumble in the Jungle'' maçı hangi ülkede yapıldı?', 'In which country did Ali and Foreman fight the ''Rumble in the Jungle''?', '["Zaire","Nigeria","Kenya","Ghana"]'::jsonb),
  ('David Beckham 2007''de Real Madrid''den ayrılıp hangi ABD kulübüne transfer oldu?', 'Which American club did David Beckham join after leaving Real Madrid in 2007?', '["LA Galaxy","NY Red Bulls","Inter Miami","Seattle Sounders"]'::jsonb),
  ('Golfte Masters turnuvasının kazananına giydirilen ceket hangi renktir?', 'What color jacket is awarded to the winner of golf''s Masters tournament?', '["Green","Red","Navy blue","White"]'::jsonb),
  ('Pelé lakabıyla tanınan Brezilyalı futbol efsanesinin gerçek ilk adı nedir?', 'What is the real first name of the Brazilian football legend known as Pele?', '["Edson","Arthur","Manoel","Jair"]'::jsonb),
  ('Formula 1''de ''Gümüş Oklar'' lakabıyla anılan takım hangisidir?', 'Which Formula 1 team is nicknamed the ''Silver Arrows''?', '["Mercedes","Ferrari","Williams","Renault"]'::jsonb),
  ('Tenisçi Rafael Nadal hangi İspanyol adasında doğmuştur?', 'On which Spanish island was Rafael Nadal born?', '["Mallorca","Ibiza","Menorca","Tenerife"]'::jsonb),
  ('Charles Darwin, Galapagos Adaları''nı da ziyaret ettiği ünlü yolculuğunu hangi gemiyle yaptı?', 'Charles Darwin made his famous voyage, including a stop at the Galapagos, aboard which ship?', '["HMS Beagle","HMS Endeavour","HMS Bounty","HMS Victory"]'::jsonb),
  ('Amiral Nelson, Trafalgar Savaşı''nda hangi gemisinin güvertesinde ölümcül yaralandı?', 'Aboard which ship was Admiral Nelson fatally wounded at the Battle of Trafalgar?', '["HMS Victory","HMS Bounty","HMS Beagle","HMS Endeavour"]'::jsonb),
  ('Paskalya Adası''ndaki dev taş insan başı heykellerine ne ad verilir?', 'What are the giant stone head statues on Easter Island called?', '["Moai","Tiki","Totem","Menhir"]'::jsonb),
  ('Kennedy suikastının zanlısı Lee Harvey Oswald''ı iki gün sonra vurarak öldüren kişi kimdir?', 'Who shot and killed Lee Harvey Oswald two days after the Kennedy assassination?', '["Jack Ruby","James Earl Ray","Sirhan Sirhan","Frank Sturgis"]'::jsonb),
  ('''Schindler''in Listesi'' filminde Oskar Schindler''i canlandıran oyuncu kimdir?', 'Who played Oskar Schindler in ''Schindler''s List''?', '["Liam Neeson","Ralph Fiennes","Gary Oldman","Daniel Day-Lewis"]'::jsonb),
  ('''Örümcek Adam'' filmlerinde Peter Parker''ı büyüten amcasının adı nedir?', 'In the ''Spider-Man'' films, what is the first name of the uncle who raised Peter Parker?', '["Ben","Frank","George","Harry"]'::jsonb),
  ('''Rüzgâr Gibi Geçti'' filminde Rhett Butler''ı canlandıran oyuncu kimdir?', 'Who played Rhett Butler in ''Gone with the Wind''?', '["Clark Gable","Cary Grant","Gregory Peck","Errol Flynn"]'::jsonb),
  ('''Dövüş Kulübü'' filminde Tyler Durden''ı canlandıran oyuncu kimdir?', 'Who played Tyler Durden in ''Fight Club''?', '["Brad Pitt","Edward Norton","Jared Leto","Matt Damon"]'::jsonb),
  ('''Harry Potter'' filmlerinde Hagrid''in kulübesinde yaşayan iri köpeğin adı nedir?', 'In the ''Harry Potter'' films, what is the name of the big dog that lives in Hagrid''s hut?', '["Fang","Fluffy","Norbert","Buckbeak"]'::jsonb),
  ('Scorsese''nin ''Sıkı Dostlar'' filminde Henry Hill''i canlandıran oyuncu kimdir?', 'Who played Henry Hill in Martin Scorsese''s ''Goodfellas''?', '["Ray Liotta","Joe Pesci","Robert De Niro","Paul Sorvino"]'::jsonb)
  ) v(soru, en_soru, en_secenekler)
  join public.questions q on q.soru = v.soru and q.created_at >= transaction_timestamp()
on conflict (question_id, dil) do nothing;

-- ---------------------------------------------------- Çevrilmeyenler
insert into public.ceviri_atlanan (question_id, dil, neden, kod)
select q.id, 'en', v.neden, 'cevrilemez'
  from (values
  ('Şener Şen''in Baran''ı oynadığı ''Eşkıya'' filminin yönetmeni kimdir?', 'Yerel TR sorusu (kapsam=yerel); İngilizce oyuncu için anlamsız')
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
