-- ============================================================
-- 314 — Paket 3 soru üretimi, parti 11: 100 soru · 2026-09-23
--
-- Kategori: muzik 25 · sanat 22 · sinema 25 · spor 28
-- Yerel (kapsam='yerel', ulke='TR'): 11 · zorluk 1–5: 2/13/30/35/20
-- İngilizce çeviri: 95 · çevrilmeyen (ceviri_atlanan, kod 'cevrilemez'): 5
--
-- Kalite: her soru Jev kapısından geçti (doğru cevap verilmeden, şıklar karıştırılarak;
-- Jev >0,9 güvenle başka şık diyen soru elendi ya da düzeltilip yeniden soruldu), şık
-- denge kapısı (soru_kural_isaretleri, ağırlık ≥ 2) veritabanında doğrulandı, havuzla
-- birebir ve anlamca tekrar tarandı. Zorluk: yazar etiketi; Jev puanıyla açık çelişkide
-- düzeltildi (araclar/soru-uretim/birlestir-parti.mjs). İngilizce taraf da Jev'den geçti.
--
-- Sıra: sorular doğru şık 0'da eklenir, çeviriler aynı sırayla yazılır, sonunda YALNIZ
-- bu işlemde eklenen satırların şıkları karıştırılır — TR ve EN AYNI permütasyonla
-- (dogru_cevap indeksi ortak olduğu için şart). `created_at >= transaction_timestamp()`
-- koşulu ZORUNLUDUR; onsuz tüm havuz karışır ve oynanan maçlarda indeks kayar.
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti 11 --no 314
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
('Pixar''ın ''İnanılmaz Aile'' (The Incredibles, 2004) filmindeki süper kahraman ailenin soyadı nedir?', '["Parr","Kent","Wayne","Parker"]'::jsonb, 0, 'sinema', 'global', null, 4),
('Disney''in ''Karmakarışık'' (Tangled, 2010) filmindeki upuzun saçlı prensesin adı nedir?', '["Rapunzel","Aurora","Belle","Ariel"]'::jsonb, 0, 'sinema', 'global', null, 1),
('Clint Eastwood''un ''Milyon Dolarlık Bebek'' (2004) filmi hangi spor dalını konu alır?', '["Boks","Güreş","Tenis","Basketbol"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Pixar''ın ''Coco'' (2017) filmi Meksika''da hangi geleneksel bayram sırasında geçer?', '["Ölüler Günü","Hasat Bayramı","Bağımsızlık Günü","Üç Kral Yortusu"]'::jsonb, 0, 'sinema', 'global', null, 3),
('Clint Eastwood''a ilk En İyi Yönetmen Oscar''ını kazandıran 1992 yapımı western hangisidir?', '["Unforgiven","Pale Rider","The Outlaw Josey Wales","High Plains Drifter"]'::jsonb, 0, 'sinema', 'global', null, 4),
('Roald Dahl uyarlaması ''Matilda'' (1996) filminde küçük Matilda''nın olağanüstü yeteneği nedir?', '["Nesneleri zihniyle oynatmak","Görünmez olabilmek","Hayvanların dilini anlamak","Zamanı geri sarabilmek"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''Kazablanka'' (1942) filminin yönetmeni kimdir?', '["Michael Curtiz","Howard Hawks","John Huston","William Wyler"]'::jsonb, 0, 'sinema', 'global', null, 4),
('''Kramer Kramer''e Karşı'' (1979) filminde oğlunun velayeti için mücadele eden babayı kim canlandırır?', '["Dustin Hoffman","Robert Redford","Al Pacino","Jack Nicholson"]'::jsonb, 0, 'sinema', 'global', null, 3),
('1939''da hem ''Rüzgâr Gibi Geçti''yi hem de ''Oz Büyücüsü''nü yöneten yönetmen kimdir?', '["Victor Fleming","Frank Capra","John Ford","Howard Hawks"]'::jsonb, 0, 'sinema', 'global', null, 4),
('''Yeşil Rehber'' (Green Book, 2018) filminde Tony Lip''in şoförlüğünü yaptığı piyanist kimdir?', '["Don Shirley","Nat King Cole","Oscar Peterson","Thelonious Monk"]'::jsonb, 0, 'sinema', 'global', null, 4),
('''12 Yıllık Esaret'' (2013) filminin yönetmeni kimdir?', '["Steve McQueen","Lee Daniels","Spike Lee","Barry Jenkins"]'::jsonb, 0, 'sinema', 'global', null, 4),
('''Spotlight'' (2015) filmi hangi gazetenin araştırmacı muhabir ekibini anlatır?', '["The Boston Globe","The Washington Post","The New York Times","Chicago Tribune"]'::jsonb, 0, 'sinema', 'global', null, 4),
('Guillermo del Toro''nun ''Suyun Sesi'' (2017) filminde dilsiz temizlik görevlisi Elisa''yı kim canlandırır?', '["Sally Hawkins","Octavia Spencer","Frances McDormand","Olivia Colman"]'::jsonb, 0, 'sinema', 'global', null, 4),
('''Tiffany''de Kahvaltı'' (1961) filmi hangi yazarın aynı adlı kısa romanından uyarlanmıştır?', '["Truman Capote","J. D. Salinger","Norman Mailer","Gore Vidal"]'::jsonb, 0, 'sinema', 'global', null, 4),
('''Birdman'' (2014) filminde eski bir süper kahraman oyuncusunu canlandıran aktör kimdir?', '["Michael Keaton","Edward Norton","Christian Bale","George Clooney"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''Akıl Oyunları'' (A Beautiful Mind, 2001) filmi hangi matematikçinin hayatını anlatır?', '["John Nash","Alan Turing","Kurt Gödel","Richard Feynman"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''Kurtlarla Dans'' (1990) filmini hem yöneten hem de başrolünü oynayan kimdir?', '["Kevin Costner","Clint Eastwood","Robert Redford","Mel Gibson"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''Top Gun'' (1986) filminde Maverick''in uçuş arkadaşı Goose''u canlandıran oyuncu kimdir?', '["Anthony Edwards","Val Kilmer","Tim Robbins","Tom Skerritt"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''My Fair Lady'' (1964) filminde Eliza Doolittle''ı kim canlandırmıştır?', '["Audrey Hepburn","Julie Andrews","Grace Kelly","Natalie Wood"]'::jsonb, 0, 'sinema', 'global', null, 3),
('Disney''in ''Külkedisi'' (1950) filminde gece yarısı balkabağına dönüşen nedir?', '["Arabası","Elbisesi","Tacı","Sarayı"]'::jsonb, 0, 'sinema', 'global', null, 1),
('''Zoraki Kral'' (The King''s Speech, 2010) filminde kekemeliğini yenmeye çalışan İngiliz kral kimdir?', '["VI. George","VIII. Edward","V. George","VII. Edward"]'::jsonb, 0, 'sinema', 'global', null, 3),
('Maceracı arkeolog Indiana Jones''un en büyük korkusu nedir?', '["Yılanlar","Örümcekler","Yükseklik","Karanlık"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Disney''in ''Mulan'' (1998) filminde Mulan''a eşlik eden küçük ejderhanın adı nedir?', '["Mushu","Cri-Kee","Khan","Shan Yu"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Aşık Shakespeare'' (1998) filminde Viola rolüyle En İyi Kadın Oyuncu Oscar''ını kazanan kimdir?', '["Gwyneth Paltrow","Kate Winslet","Cate Blanchett","Emily Watson"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''American Idiot'' (2004) albümüyle tanınan punk rock grubu hangisidir?', '["Green Day","The Offspring","Blink-182","Sum 41"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''In the End'' ve ''Numb'' şarkılarıyla tanınan grup hangisidir?', '["Linkin Park","Evanescence","Limp Bizkit","Papa Roach"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Viva la Vida'' (2008) şarkısı hangi gruba aittir?', '["Coldplay","Radiohead","Oasis","Muse"]'::jsonb, 0, 'muzik', 'global', null, 3),
('''Alive'' ve ''Jeremy'' şarkılarıyla tanınan Pearl Jam grubunun solisti kimdir?', '["Eddie Vedder","Chris Cornell","Layne Staley","Scott Weiland"]'::jsonb, 0, 'muzik', 'global', null, 3),
('''Mr. Brightside'' ve ''Somebody Told Me'' şarkılarıyla tanınan Las Vegas çıkışlı grup hangisidir?', '["The Killers","The Strokes","Kings of Leon","Imagine Dragons"]'::jsonb, 0, 'muzik', 'global', null, 3),
('''Supermassive Black Hole'' şarkısıyla tanınan İngiliz rock grubu Muse''un solisti kimdir?', '["Matt Bellamy","Chris Martin","Brandon Flowers","Tom Chaplin"]'::jsonb, 0, 'muzik', 'global', null, 4),
('Bach''ın üslubuyla Brezilya halk müziğini birleştiren ''Bachianas Brasileiras''ın bestecisi kimdir?', '["Heitor Villa-Lobos","Antônio Carlos Jobim","Alberto Ginastera","Carlos Chávez"]'::jsonb, 0, 'muzik', 'global', null, 5),
('Nirvana''nın davulcusuyken grubun dağılmasının ardından Foo Fighters''ı kuran müzisyen kimdir?', '["Dave Grohl","Krist Novoselic","Taylor Hawkins","Chad Channing"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Justin Timberlake solo kariyerinden önce hangi erkek grubunun üyesiydi?', '["*NSYNC","Backstreet Boys","98 Degrees","Boyz II Men"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Beyoncé''nin eşi olan rapçi kimdir?', '["Jay-Z","Kanye West","Nas","Pharrell Williams"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Ritüel Ateş Dansı''nı içeren ''El amor brujo'' balesinin İspanyol bestecisi kimdir?', '["Manuel de Falla","Isaac Albéniz","Enrique Granados","Joaquín Rodrigo"]'::jsonb, 0, 'muzik', 'global', null, 4),
('''I Kissed a Girl'' ve ''Roar'' şarkılarıyla tanınan şarkıcı kimdir?', '["Katy Perry","Lady Gaga","Kelly Clarkson","Miley Cyrus"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Besteci Pietro Mascagni''yi 1890''da ünlendiren tek perdelik opera hangisidir?', '["Cavalleria rusticana","Andrea Chénier","L''amico Fritz","Adriana Lecouvreur"]'::jsonb, 0, 'muzik', 'global', null, 4),
('''Californication'' ve ''Under the Bridge'' şarkılarıyla tanınan Red Hot Chili Peppers''ın solisti kimdir?', '["Anthony Kiedis","John Frusciante","Chad Smith","Mike Patton"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Joaquín Rodrigo''nun ''Aranjuez Konçertosu'' hangi solo çalgı için yazılmıştır?', '["Gitar","Keman","Piyano","Arp"]'::jsonb, 0, 'muzik', 'global', null, 3),
('''(I Can''t Get No) Satisfaction'' şarkısı hangi gruba aittir?', '["The Rolling Stones","The Moody Blues","The Yardbirds","The Small Faces"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Seven Nation Army'' (2003) şarkısıyla tanınan ikili hangisidir?', '["The White Stripes","The Black Keys","The Raconteurs","The Kills"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Arctic Monkeys grubu İngiltere''nin hangi şehrinde kurulmuştur?', '["Sheffield","Manchester","Liverpool","Leeds"]'::jsonb, 0, 'muzik', 'global', null, 4),
('Swing ve caz standartlarını yorumlayan şarkıcı Michael Bublé hangi ülkelidir?', '["Kanada","ABD","İtalya","Avustralya"]'::jsonb, 0, 'muzik', 'global', null, 3),
('1999 tarihli ''Genie in a Bottle'' şarkısıyla çıkış yapan şarkıcı kimdir?', '["Christina Aguilera","Jessica Simpson","Mandy Moore","Britney Spears"]'::jsonb, 0, 'muzik', 'global', null, 3),
('21 ''Macar Dansı'' ile tanınan Alman besteci kimdir?', '["Johannes Brahms","Franz Liszt","Antonín Dvořák","Béla Bartók"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Rapçi Drake hangi şehirde doğup büyümüştür?', '["Toronto","Montréal","Vancouver","Detroit"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Rushmore Dağı''ndaki dört ABD başkanının yüzünü tasarlayıp yontma işini yöneten heykeltıraş kimdir?', '["Gutzon Borglum","Daniel Chester French","Augustus Saint-Gaudens","Lorado Taft"]'::jsonb, 0, 'sanat', 'global', null, 5),
('New York''ta Wall Street yakınındaki bronz ''Hücum Eden Boğa'' (Charging Bull) heykelinin sanatçısı kimdir?', '["Arturo Di Modica","Kristen Visbal","Fernando Botero","Daniel Chester French"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Ceylan kürküyle kaplı bir fincan, tabak ve kaşıktan oluşan 1936 tarihli sürrealist ''Nesne'' yapıtı kimindir?', '["Meret Oppenheim","Leonora Carrington","Dora Maar","Lee Miller"]'::jsonb, 0, 'sanat', 'global', null, 5),
('1990''da Vermeer''in ''Konser''i dahil 13 eserin çalındığı ve hâlâ çözülemeyen soygun hangi Boston müzesinde yaşandı?', '["Isabella Stewart Gardner Müzesi","Boston Güzel Sanatlar Müzesi","Harvard Sanat Müzeleri","Boston Çağdaş Sanat Enstitüsü"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Montreal''deki modüler konut kompleksi ''Habitat 67'' ile Singapur''daki Marina Bay Sands''in mimarı kimdir?', '["Moshe Safdie","Bjarke Ingels","Rem Koolhaas","Renzo Piano"]'::jsonb, 0, 'sanat', 'global', null, 5),
('''Yeşil Bugatti''deki Otoportre'' (1929) tablosuyla tanınan Art Deco ressamı kimdir?', '["Tamara de Lempicka","Sonia Delaunay","Marie Laurencin","Sophie Taeuber-Arp"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Berlin Dadacıları arasında fotomontajlarıyla öne çıkan, ''Mutfak Bıçağıyla Kesmek'' (1919) yapıtının sanatçısı kimdir?', '["Hannah Höch","Sophie Taeuber-Arp","Käthe Kollwitz","Emmy Hennings"]'::jsonb, 0, 'sanat', 'global', null, 5),
('1885''te Nuenen''de yapılan ''Patates Yiyenler'' tablosunun ressamı kimdir?', '["Vincent van Gogh","Jean-François Millet","Jozef Israëls","Anton Mauve"]'::jsonb, 0, 'sanat', 'global', null, 4),
('1960''ta MoMA''nın bahçesinde kendi kendini parçalayan ''New York''a Saygı'' makinesinin sanatçısı kimdir?', '["Jean Tinguely","Alexander Calder","Nam June Paik","Yves Klein"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Bisiklet gidonundan esinlenerek bükme çelik borudan yapılan ''Wassily'' koltuğunun tasarımcısı kimdir?', '["Marcel Breuer","Ludwig Mies van der Rohe","Charles Eames","Alvar Aalto"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Tuvali bıçakla yararak ''Concetto spaziale'' (Mekânsal Kavram) serisini üreten İtalyan sanatçı kimdir?', '["Lucio Fontana","Alberto Burri","Piero Manzoni","Giorgio Morandi"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Rio de Janeiro''daki Kurtarıcı İsa heykelini tasarlayan Fransız heykeltıraş kimdir?', '["Paul Landowski","Antoine Bourdelle","Aristide Maillol","Auguste Bartholdi"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Gaudí''nin Barselona''daki Casa Milà binası, dalgalı taş cephesi yüzünden halk arasında hangi adla anılır?', '["La Pedrera","Casa dels Ossos","El Capricho","La Rotonda"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Tasarımında Leonardo da Vinci''nin etkisi olduğu düşünülen çift sarmal merdiveniyle ünlü Loire şatosu hangisidir?', '["Chambord","Chenonceau","Amboise","Villandry"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Kurşun çerçeveli renkli cam abajurları kendi adıyla anılan Amerikalı Art Nouveau tasarımcısı kimdir?', '["Louis Comfort Tiffany","John La Farge","Frank Lloyd Wright","Gustav Stickley"]'::jsonb, 0, 'sanat', 'global', null, 4),
('1914''te bir süfrajet tarafından bıçakla yırtılan ''Rokeby Venüsü'' tablosunun ressamı kimdir?', '["Diego Velázquez","Bartolomé Esteban Murillo","Peter Paul Rubens","Francisco Goya"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Barack Obama''nın 2008 seçim kampanyasıyla özdeşleşen kırmızı-bej-mavi ''Hope'' afişinin sanatçısı kimdir?', '["Shepard Fairey","Barbara Kruger","Robbie Conal","Mr. Brainwash"]'::jsonb, 0, 'sanat', 'global', null, 4),
('İnşaatı 1248''de başlayıp ancak 1880''de tamamlanan Gotik katedral hangisidir?', '["Köln Katedrali","Chartres Katedrali","Notre-Dame de Paris","Milano Katedrali"]'::jsonb, 0, 'sanat', 'global', null, 5),
('1954-55''te enkostik teknikle ABD bayrağını resmettiği ''Bayrak'' tablosuyla tanınan sanatçı kimdir?', '["Jasper Johns","Robert Rauschenberg","Robert Indiana","Larry Rivers"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Oryantalist ''Yılan Oynatıcı'' (1879 civarı) tablosunun ressamı kimdir?', '["Jean-Léon Gérôme","Eugène Fromentin","Jean-Joseph Benjamin-Constant","Jean-Jules-Antoine Lecomte du Noüy"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Venedik lagünündeki hangi ada yüzyıllardır cam işçiliğiyle ünlüdür?', '["Murano","Burano","Torcello","Giudecca"]'::jsonb, 0, 'sanat', 'global', null, 3),
('1962 Dünya Fuarı için inşa edilen ''Space Needle'' kulesi hangi şehirdedir?', '["Seattle","Portland","San Francisco","Denver"]'::jsonb, 0, 'sanat', 'global', null, 3),
('Formula 1''in ünlü ''Eau Rouge'' virajı hangi pisttedir?', '["Spa-Francorchamps","Circuit Paul Ricard","Red Bull Ring","Yas Marina"]'::jsonb, 0, 'spor', 'global', null, 4),
('1973''te ABD Üçlü Tacı''nı kazanıp Belmont Stakes''i 31 boy farkla bitiren efsanevi yarış atı hangisidir?', '["Secretariat","Seabiscuit","Man o'' War","War Admiral"]'::jsonb, 0, 'spor', 'global', null, 5),
('Fransa Bisiklet Turu''nu 1991-1995 arasında üst üste beş kez kazanan İspanyol bisikletçi kimdir?', '["Miguel Indurain","Alberto Contador","Pedro Delgado","Carlos Sastre"]'::jsonb, 0, 'spor', 'global', null, 4),
('1990 Dünya Kupası''nın gol kralı olan İtalyan forvet kimdir?', '["Salvatore Schillaci","Roberto Baggio","Gianluca Vialli","Andrea Carnevale"]'::jsonb, 0, 'spor', 'global', null, 4),
('1996 Atlanta Olimpiyatları''nda 200 ve 400 metrede altın kazanan, altın rengi ayakkabılarıyla hatırlanan ABD''li atlet kimdir?', '["Michael Johnson","Carl Lewis","Maurice Greene","Butch Reynolds"]'::jsonb, 0, 'spor', 'global', null, 4),
('2013''te Wimbledon''ı kazanarak İngiliz erkeklerin 77 yıllık şampiyonluk hasretine son veren tenisçi kimdir?', '["Andy Murray","Tim Henman","Greg Rusedski","Cameron Norrie"]'::jsonb, 0, 'spor', 'global', null, 3),
('2032 Yaz Olimpiyat Oyunları''nın ev sahipliğini 2021''de kazanan şehir hangisidir?', '["Brisbane","Doha","Budapeşte","Madrid"]'::jsonb, 0, 'spor', 'global', null, 3),
('Çarpık bacaklarına rağmen 1958 ve 1962''de Dünya Kupası kazanan, lakabı küçük bir kuş türünün adından gelen Brezilyalı kanat oyuncusu kimdir?', '["Garrincha","Nílton Santos","Vavá","Zagallo"]'::jsonb, 0, 'spor', 'global', null, 4),
('Michael Jordan''ın hasta olmasına rağmen 38 sayı attığı ünlü ''Flu Game'', 1997 NBA Finalleri''nde hangi takıma karşı oynandı?', '["Utah Jazz","Seattle SuperSonics","Portland Trail Blazers","Phoenix Suns"]'::jsonb, 0, 'spor', 'global', null, 5),
('1994 Dünya Kupası''nda Kamerun''a tek maçta beş gol atarak rekor kıran Rus forvet kimdir?', '["Oleg Salenko","Igor Kolyvanov","Dmitri Radchenko","Sergei Yuran"]'::jsonb, 0, 'spor', 'global', null, 5),
('Jackie Stewart''ın ''Yeşil Cehennem'' adını taktığı, Almanya''daki ünlü yarış pisti hangisidir?', '["Nordschleife","Hockenheimring","Sachsenring","Norisring"]'::jsonb, 0, 'spor', 'global', null, 4),
('''Buz Adam'' lakabıyla anılan 2007 Formula 1 dünya şampiyonu Finli pilot kimdir?', '["Kimi Räikkönen","Mika Häkkinen","Valtteri Bottas","Heikki Kovalainen"]'::jsonb, 0, 'spor', 'global', null, 3),
('Yüksek atlamada 1993''te 2,45 metrelik dünya rekorunu kıran Kübalı atlet kimdir?', '["Javier Sotomayor","Patrik Sjöberg","Mutaz Essa Barshim","Igor Paklin"]'::jsonb, 0, 'spor', 'global', null, 4),
('Formula 1''de 2018''den beri pilotun başını korumak için kokpitin üzerine takılan titanyum çerçevenin adı nedir?', '["Halo","Aeroscreen","Canopy","Roll hoop"]'::jsonb, 0, 'spor', 'global', null, 4),
('Profesyonel boks kariyerini 50 galibiyet ve hiç yenilgisiz tamamlayan ABD''li boksör kimdir?', '["Floyd Mayweather Jr.","Oscar De La Hoya","Sugar Ray Leonard","Pernell Whitaker"]'::jsonb, 0, 'spor', 'global', null, 3),
('2010 Dünya Kupası''nda turnuvanın en iyi oyuncusu seçilerek Altın Top''u alan futbolcu kimdir?', '["Diego Forlán","Wesley Sneijder","Andrés Iniesta","David Villa"]'::jsonb, 0, 'spor', 'global', null, 5),
('1995''te üç adım atlamada geçerli bir atlayışla 18 metreyi aşan ilk atlet kimdir?', '["Jonathan Edwards","Kenny Harrison","Christian Olsson","Willie Banks"]'::jsonb, 0, 'spor', 'global', null, 5),
('2000 Sidney Olimpiyatları''nda 100 m serbestteki çok yavaş derecesiyle ''Yılan Balığı Eric'' lakabını alan yüzücü hangi ülkeyi temsil ediyordu?', '["Ekvator Ginesi","Gine-Bissau","Sierra Leone","Burkina Faso"]'::jsonb, 0, 'spor', 'global', null, 5),
('Parke taşlı yollarıyla ''Kuzeyin Cehennemi'' diye anılan tek günlük bisiklet yarışı hangisidir?', '["Paris-Roubaix","Milano-Sanremo","Liège-Bastogne-Liège","Flandre Turu"]'::jsonb, 0, 'spor', 'global', null, 5),
('Futbolda topa, destek ayağının arkasından bacak çaprazlanarak vurulmasına ne ad verilir?', '["Rabona","Panenka","Rövaşata","Elastico"]'::jsonb, 0, 'spor', 'global', null, 4),
('Dövüş, dans ve müziği birleştiren, berimbau eşliğinde oynanan capoeira hangi ülkede doğmuştur?', '["Brezilya","Küba","Kolombiya","Portekiz"]'::jsonb, 0, 'spor', 'global', null, 3),
('''Kurtlar Vadisi'' dizisinde Polat Alemdar''ı hangi oyuncu canlandırmıştır?', '["Necati Şaşmaz","Kenan İmirzalıoğlu","Haluk Bilginer","Kıvanç Tatlıtuğ"]'::jsonb, 0, 'sinema', 'yerel', 'TR', 2),
('Galatasaray Spor Kulübü''nü 1905''te arkadaşlarıyla birlikte kuran kişi kimdir?', '["Ali Sami Yen","Ziya Songülen","Mehmet Şamil Şhaplı","Şeref Bey"]'::jsonb, 0, 'spor', 'yerel', 'TR', 3),
('2012 Londra Olimpiyatları''nda tekvandoda Türkiye''ye altın madalya kazandıran sporcu kimdir?', '["Servet Tazegül","Bahri Tanrıkulu","Nur Tatar","Rıza Kayaalp"]'::jsonb, 0, 'spor', 'yerel', 'TR', 4),
('2017 Londra Dünya Atletizm Şampiyonası''nda 200 metrede altın madalya kazanan Türk atlet kimdir?', '["Ramil Guliyev","Jak Ali Harvey","Emre Zafer Barnes","Yasmani Copello"]'::jsonb, 0, 'spor', 'yerel', 'TR', 4),
('''Kara Kartallar'' lakabıyla anılan futbol kulübü hangisidir?', '["Beşiktaş","Fenerbahçe","Galatasaray","Trabzonspor"]'::jsonb, 0, 'spor', 'yerel', 'TR', 2),
('Euro 2008 çeyrek finalinde Hırvatistan''a karşı uzatmanın son saniyelerinde eşitliği getiren golü atan Türk futbolcu kimdir?', '["Semih Şentürk","Nihat Kahveci","Arda Turan","Hamit Altıntop"]'::jsonb, 0, 'spor', 'yerel', 'TR', 5),
('Lazca ve Karadeniz ezgilerini rock müzikle buluşturan, 2005''te genç yaşta hayatını kaybeden müzisyen kimdir?', '["Kâzım Koyuncu","Fuat Saka","Volkan Konak","Birol Topaloğlu"]'::jsonb, 0, 'muzik', 'yerel', 'TR', 4),
('Barış Manço''nun yıllarca TRT''de sunduğu çocuk ve gezi programının adı nedir?', '["7''den 77''ye","Bir Varmış Bir Yokmuş","Pazar Sabahı Çocuk Saati","Haydi Gel Bizimle Ol"]'::jsonb, 0, 'muzik', 'yerel', 'TR', 2),
('Tokyo 2020 Olimpiyatları''nda kadınlar boksunda Türkiye''ye altın madalya kazandıran sporcu kimdir?', '["Busenaz Sürmeneli","Buse Naz Çakıroğlu","Hatice Akbaş","Esra Yıldız"]'::jsonb, 0, 'spor', 'yerel', 'TR', 3),
('Türkiye''yi 2002 Dünya Kupası''nda üçüncülüğe taşıyan teknik direktör kimdir?', '["Şenol Güneş","Fatih Terim","Mustafa Denizli","Ersun Yanal"]'::jsonb, 0, 'spor', 'yerel', 'TR', 2),
('Şebnem Ferah solo kariyerinden önce hangi grupta şarkı söylüyordu?', '["Volvox","Pentagram","Kargo","Athena"]'::jsonb, 0, 'muzik', 'yerel', 'TR', 4)
on conflict (soru) do nothing;

-- ---------------------------------------------------- İngilizce çeviri
insert into public.question_translations (question_id, dil, soru, secenekler)
select q.id, 'en', v.en_soru, v.en_secenekler
  from (values
  ('Pixar''ın ''İnanılmaz Aile'' (The Incredibles, 2004) filmindeki süper kahraman ailenin soyadı nedir?', 'What is the surname of the superhero family in Pixar''s ''The Incredibles'' (2004)?', '["Parr","Kent","Wayne","Parker"]'::jsonb),
  ('Disney''in ''Karmakarışık'' (Tangled, 2010) filmindeki upuzun saçlı prensesin adı nedir?', 'What is the name of the princess with extremely long hair in Disney''s ''Tangled'' (2010)?', '["Rapunzel","Aurora","Belle","Ariel"]'::jsonb),
  ('Clint Eastwood''un ''Milyon Dolarlık Bebek'' (2004) filmi hangi spor dalını konu alır?', 'Which sport is at the centre of Clint Eastwood''s ''Million Dollar Baby'' (2004)?', '["Boxing","Wrestling","Tennis","Basketball"]'::jsonb),
  ('Pixar''ın ''Coco'' (2017) filmi Meksika''da hangi geleneksel bayram sırasında geçer?', 'Pixar''s ''Coco'' (2017) is set during which traditional Mexican holiday?', '["Day of the Dead","Harvest Festival","Independence Day","Three Kings'' Day"]'::jsonb),
  ('Clint Eastwood''a ilk En İyi Yönetmen Oscar''ını kazandıran 1992 yapımı western hangisidir?', 'Which 1992 western won Clint Eastwood his first Academy Award for Best Director?', '["Unforgiven","Pale Rider","The Outlaw Josey Wales","High Plains Drifter"]'::jsonb),
  ('Roald Dahl uyarlaması ''Matilda'' (1996) filminde küçük Matilda''nın olağanüstü yeteneği nedir?', 'In the Roald Dahl adaptation ''Matilda'' (1996), what is young Matilda''s extraordinary ability?', '["Moving objects with her mind","Turning invisible","Understanding animal speech","Rewinding time itself"]'::jsonb),
  ('''Kazablanka'' (1942) filminin yönetmeni kimdir?', 'Who directed ''Casablanca'' (1942)?', '["Michael Curtiz","Howard Hawks","John Huston","William Wyler"]'::jsonb),
  ('''Kramer Kramer''e Karşı'' (1979) filminde oğlunun velayeti için mücadele eden babayı kim canlandırır?', 'Who plays the father fighting for custody of his son in ''Kramer vs. Kramer'' (1979)?', '["Dustin Hoffman","Robert Redford","Al Pacino","Jack Nicholson"]'::jsonb),
  ('1939''da hem ''Rüzgâr Gibi Geçti''yi hem de ''Oz Büyücüsü''nü yöneten yönetmen kimdir?', 'Which director made both ''Gone with the Wind'' and ''The Wizard of Oz'' in 1939?', '["Victor Fleming","Frank Capra","John Ford","Howard Hawks"]'::jsonb),
  ('''Yeşil Rehber'' (Green Book, 2018) filminde Tony Lip''in şoförlüğünü yaptığı piyanist kimdir?', 'In ''Green Book'' (2018), which pianist does Tony Lip work for as a driver?', '["Don Shirley","Nat King Cole","Oscar Peterson","Thelonious Monk"]'::jsonb),
  ('''12 Yıllık Esaret'' (2013) filminin yönetmeni kimdir?', 'Who directed ''12 Years a Slave'' (2013)?', '["Steve McQueen","Lee Daniels","Spike Lee","Barry Jenkins"]'::jsonb),
  ('''Spotlight'' (2015) filmi hangi gazetenin araştırmacı muhabir ekibini anlatır?', '''Spotlight'' (2015) portrays the investigative team of which newspaper?', '["The Boston Globe","The Washington Post","The New York Times","Chicago Tribune"]'::jsonb),
  ('Guillermo del Toro''nun ''Suyun Sesi'' (2017) filminde dilsiz temizlik görevlisi Elisa''yı kim canlandırır?', 'Who plays Elisa, the mute cleaner, in Guillermo del Toro''s ''The Shape of Water'' (2017)?', '["Sally Hawkins","Octavia Spencer","Frances McDormand","Olivia Colman"]'::jsonb),
  ('''Tiffany''de Kahvaltı'' (1961) filmi hangi yazarın aynı adlı kısa romanından uyarlanmıştır?', '''Breakfast at Tiffany''s'' (1961) is based on a novella by which writer?', '["Truman Capote","J. D. Salinger","Norman Mailer","Gore Vidal"]'::jsonb),
  ('''Birdman'' (2014) filminde eski bir süper kahraman oyuncusunu canlandıran aktör kimdir?', 'Which actor plays a former superhero movie star in ''Birdman'' (2014)?', '["Michael Keaton","Edward Norton","Christian Bale","George Clooney"]'::jsonb),
  ('''Akıl Oyunları'' (A Beautiful Mind, 2001) filmi hangi matematikçinin hayatını anlatır?', 'Which mathematician''s life is the subject of ''A Beautiful Mind'' (2001)?', '["John Nash","Alan Turing","Kurt Gödel","Richard Feynman"]'::jsonb),
  ('''Kurtlarla Dans'' (1990) filmini hem yöneten hem de başrolünü oynayan kimdir?', 'Who both directed and starred in ''Dances with Wolves'' (1990)?', '["Kevin Costner","Clint Eastwood","Robert Redford","Mel Gibson"]'::jsonb),
  ('''Top Gun'' (1986) filminde Maverick''in uçuş arkadaşı Goose''u canlandıran oyuncu kimdir?', 'Who played Goose, Maverick''s flying partner, in ''Top Gun'' (1986)?', '["Anthony Edwards","Val Kilmer","Tim Robbins","Tom Skerritt"]'::jsonb),
  ('''My Fair Lady'' (1964) filminde Eliza Doolittle''ı kim canlandırmıştır?', 'Who played Eliza Doolittle in the film ''My Fair Lady'' (1964)?', '["Audrey Hepburn","Julie Andrews","Grace Kelly","Natalie Wood"]'::jsonb),
  ('Disney''in ''Külkedisi'' (1950) filminde gece yarısı balkabağına dönüşen nedir?', 'In Disney''s ''Cinderella'' (1950), what turns back into a pumpkin at midnight?', '["Her carriage","Her dress","Her tiara","Her palace"]'::jsonb),
  ('''Zoraki Kral'' (The King''s Speech, 2010) filminde kekemeliğini yenmeye çalışan İngiliz kral kimdir?', 'Which British king tries to overcome his stammer in ''The King''s Speech'' (2010)?', '["George VI","Edward VIII","George V","Edward VII"]'::jsonb),
  ('Maceracı arkeolog Indiana Jones''un en büyük korkusu nedir?', 'What is the adventurer archaeologist Indiana Jones most afraid of?', '["Snakes","Spiders","Heights","The dark"]'::jsonb),
  ('Disney''in ''Mulan'' (1998) filminde Mulan''a eşlik eden küçük ejderhanın adı nedir?', 'In Disney''s ''Mulan'' (1998), what is the name of the little dragon who accompanies Mulan?', '["Mushu","Cri-Kee","Khan","Shan Yu"]'::jsonb),
  ('''Aşık Shakespeare'' (1998) filminde Viola rolüyle En İyi Kadın Oyuncu Oscar''ını kazanan kimdir?', 'Who won the Academy Award for Best Actress for playing Viola in ''Shakespeare in Love'' (1998)?', '["Gwyneth Paltrow","Kate Winslet","Cate Blanchett","Emily Watson"]'::jsonb),
  ('''American Idiot'' (2004) albümüyle tanınan punk rock grubu hangisidir?', 'Which punk rock band is known for the album ''American Idiot'' (2004)?', '["Green Day","The Offspring","Blink-182","Sum 41"]'::jsonb),
  ('''In the End'' ve ''Numb'' şarkılarıyla tanınan grup hangisidir?', 'Which band is known for the songs ''In the End'' and ''Numb''?', '["Linkin Park","Evanescence","Limp Bizkit","Papa Roach"]'::jsonb),
  ('''Viva la Vida'' (2008) şarkısı hangi gruba aittir?', 'Which band recorded the 2008 song ''Viva la Vida''?', '["Coldplay","Radiohead","Oasis","Muse"]'::jsonb),
  ('''Alive'' ve ''Jeremy'' şarkılarıyla tanınan Pearl Jam grubunun solisti kimdir?', 'Who is the lead singer of Pearl Jam, known for ''Alive'' and ''Jeremy''?', '["Eddie Vedder","Chris Cornell","Layne Staley","Scott Weiland"]'::jsonb),
  ('''Mr. Brightside'' ve ''Somebody Told Me'' şarkılarıyla tanınan Las Vegas çıkışlı grup hangisidir?', 'Which Las Vegas band is known for ''Mr. Brightside'' and ''Somebody Told Me''?', '["The Killers","The Strokes","Kings of Leon","Imagine Dragons"]'::jsonb),
  ('''Supermassive Black Hole'' şarkısıyla tanınan İngiliz rock grubu Muse''un solisti kimdir?', 'Who is the lead singer of the English rock band Muse, known for ''Supermassive Black Hole''?', '["Matt Bellamy","Chris Martin","Brandon Flowers","Tom Chaplin"]'::jsonb),
  ('Bach''ın üslubuyla Brezilya halk müziğini birleştiren ''Bachianas Brasileiras''ın bestecisi kimdir?', 'Who composed the ''Bachianas Brasileiras'', which blend Bach''s style with Brazilian folk music?', '["Heitor Villa-Lobos","Antônio Carlos Jobim","Alberto Ginastera","Carlos Chávez"]'::jsonb),
  ('Nirvana''nın davulcusuyken grubun dağılmasının ardından Foo Fighters''ı kuran müzisyen kimdir?', 'Which musician, formerly Nirvana''s drummer, founded Foo Fighters after the band ended?', '["Dave Grohl","Krist Novoselic","Taylor Hawkins","Chad Channing"]'::jsonb),
  ('Justin Timberlake solo kariyerinden önce hangi erkek grubunun üyesiydi?', 'Which boy band was Justin Timberlake a member of before his solo career?', '["*NSYNC","Backstreet Boys","98 Degrees","Boyz II Men"]'::jsonb),
  ('Beyoncé''nin eşi olan rapçi kimdir?', 'Which rapper is married to Beyoncé?', '["Jay-Z","Kanye West","Nas","Pharrell Williams"]'::jsonb),
  ('''Ritüel Ateş Dansı''nı içeren ''El amor brujo'' balesinin İspanyol bestecisi kimdir?', 'Which Spanish composer wrote the ballet ''El amor brujo'', which includes the ''Ritual Fire Dance''?', '["Manuel de Falla","Isaac Albéniz","Enrique Granados","Joaquín Rodrigo"]'::jsonb),
  ('''I Kissed a Girl'' ve ''Roar'' şarkılarıyla tanınan şarkıcı kimdir?', 'Which singer is known for ''I Kissed a Girl'' and ''Roar''?', '["Katy Perry","Lady Gaga","Kelly Clarkson","Miley Cyrus"]'::jsonb),
  ('Besteci Pietro Mascagni''yi 1890''da ünlendiren tek perdelik opera hangisidir?', 'Which one-act opera made composer Pietro Mascagni famous in 1890?', '["Cavalleria rusticana","Andrea Chénier","L''amico Fritz","Adriana Lecouvreur"]'::jsonb),
  ('''Californication'' ve ''Under the Bridge'' şarkılarıyla tanınan Red Hot Chili Peppers''ın solisti kimdir?', 'Who is the lead singer of Red Hot Chili Peppers, known for ''Californication'' and ''Under the Bridge''?', '["Anthony Kiedis","John Frusciante","Chad Smith","Mike Patton"]'::jsonb),
  ('Joaquín Rodrigo''nun ''Aranjuez Konçertosu'' hangi solo çalgı için yazılmıştır?', 'For which solo instrument did Joaquín Rodrigo write the ''Concierto de Aranjuez''?', '["Guitar","Violin","Piano","Harp"]'::jsonb),
  ('''(I Can''t Get No) Satisfaction'' şarkısı hangi gruba aittir?', 'Which band recorded ''(I Can''t Get No) Satisfaction''?', '["The Rolling Stones","The Moody Blues","The Yardbirds","The Small Faces"]'::jsonb),
  ('''Seven Nation Army'' (2003) şarkısıyla tanınan ikili hangisidir?', 'Which duo is known for the 2003 song ''Seven Nation Army''?', '["The White Stripes","The Black Keys","The Raconteurs","The Kills"]'::jsonb),
  ('Arctic Monkeys grubu İngiltere''nin hangi şehrinde kurulmuştur?', 'In which English city was the band Arctic Monkeys formed?', '["Sheffield","Manchester","Liverpool","Leeds"]'::jsonb),
  ('Swing ve caz standartlarını yorumlayan şarkıcı Michael Bublé hangi ülkelidir?', 'Which country is Michael Bublé, the singer of swing and jazz standards, from?', '["Canada","USA","Italy","Australia"]'::jsonb),
  ('1999 tarihli ''Genie in a Bottle'' şarkısıyla çıkış yapan şarkıcı kimdir?', 'Which singer broke through with the 1999 song ''Genie in a Bottle''?', '["Christina Aguilera","Jessica Simpson","Mandy Moore","Britney Spears"]'::jsonb),
  ('21 ''Macar Dansı'' ile tanınan Alman besteci kimdir?', 'Which German composer is known for his 21 ''Hungarian Dances''?', '["Johannes Brahms","Franz Liszt","Antonín Dvořák","Béla Bartók"]'::jsonb),
  ('Rapçi Drake hangi şehirde doğup büyümüştür?', 'In which city was the rapper Drake born and raised?', '["Toronto","Montreal","Vancouver","Detroit"]'::jsonb),
  ('Rushmore Dağı''ndaki dört ABD başkanının yüzünü tasarlayıp yontma işini yöneten heykeltıraş kimdir?', 'Which sculptor designed and directed the carving of the four presidents'' faces on Mount Rushmore?', '["Gutzon Borglum","Daniel Chester French","Augustus Saint-Gaudens","Lorado Taft"]'::jsonb),
  ('New York''ta Wall Street yakınındaki bronz ''Hücum Eden Boğa'' (Charging Bull) heykelinin sanatçısı kimdir?', 'Which artist made the bronze ''Charging Bull'' sculpture near Wall Street in New York?', '["Arturo Di Modica","Kristen Visbal","Fernando Botero","Daniel Chester French"]'::jsonb),
  ('Ceylan kürküyle kaplı bir fincan, tabak ve kaşıktan oluşan 1936 tarihli sürrealist ''Nesne'' yapıtı kimindir?', 'Who created ''Object'' (1936), the Surrealist cup, saucer and spoon covered in gazelle fur?', '["Meret Oppenheim","Leonora Carrington","Dora Maar","Lee Miller"]'::jsonb),
  ('1990''da Vermeer''in ''Konser''i dahil 13 eserin çalındığı ve hâlâ çözülemeyen soygun hangi Boston müzesinde yaşandı?', 'In 1990, thirteen works including Vermeer''s ''The Concert'' were stolen from which Boston museum in a still-unsolved heist?', '["Isabella Stewart Gardner Museum","Museum of Fine Arts, Boston","Harvard Art Museums","Institute of Contemporary Art, Boston"]'::jsonb),
  ('Montreal''deki modüler konut kompleksi ''Habitat 67'' ile Singapur''daki Marina Bay Sands''in mimarı kimdir?', 'Which architect designed both the modular housing complex ''Habitat 67'' in Montreal and Marina Bay Sands in Singapore?', '["Moshe Safdie","Bjarke Ingels","Rem Koolhaas","Renzo Piano"]'::jsonb),
  ('''Yeşil Bugatti''deki Otoportre'' (1929) tablosuyla tanınan Art Deco ressamı kimdir?', 'Which Art Deco painter is known for ''Self-Portrait in the Green Bugatti'' (1929)?', '["Tamara de Lempicka","Sonia Delaunay","Marie Laurencin","Sophie Taeuber-Arp"]'::jsonb),
  ('Berlin Dadacıları arasında fotomontajlarıyla öne çıkan, ''Mutfak Bıçağıyla Kesmek'' (1919) yapıtının sanatçısı kimdir?', 'Which Berlin Dada artist, known for her photomontages, made ''Cut with the Kitchen Knife'' (1919)?', '["Hannah Höch","Sophie Taeuber-Arp","Käthe Kollwitz","Emmy Hennings"]'::jsonb),
  ('1885''te Nuenen''de yapılan ''Patates Yiyenler'' tablosunun ressamı kimdir?', 'Who painted ''The Potato Eaters'', made in Nuenen in 1885?', '["Vincent van Gogh","Jean-François Millet","Jozef Israëls","Anton Mauve"]'::jsonb),
  ('1960''ta MoMA''nın bahçesinde kendi kendini parçalayan ''New York''a Saygı'' makinesinin sanatçısı kimdir?', 'Which artist built ''Homage to New York'', the machine that destroyed itself in the MoMA garden in 1960?', '["Jean Tinguely","Alexander Calder","Nam June Paik","Yves Klein"]'::jsonb),
  ('Bisiklet gidonundan esinlenerek bükme çelik borudan yapılan ''Wassily'' koltuğunun tasarımcısı kimdir?', 'Who designed the tubular-steel ''Wassily'' chair, inspired by bicycle handlebars?', '["Marcel Breuer","Ludwig Mies van der Rohe","Charles Eames","Alvar Aalto"]'::jsonb),
  ('Tuvali bıçakla yararak ''Concetto spaziale'' (Mekânsal Kavram) serisini üreten İtalyan sanatçı kimdir?', 'Which Italian artist slit his canvases with a blade for the ''Concetto spaziale'' series?', '["Lucio Fontana","Alberto Burri","Piero Manzoni","Giorgio Morandi"]'::jsonb),
  ('Rio de Janeiro''daki Kurtarıcı İsa heykelini tasarlayan Fransız heykeltıraş kimdir?', 'Which French sculptor designed the Christ the Redeemer statue in Rio de Janeiro?', '["Paul Landowski","Antoine Bourdelle","Aristide Maillol","Auguste Bartholdi"]'::jsonb),
  ('Gaudí''nin Barselona''daki Casa Milà binası, dalgalı taş cephesi yüzünden halk arasında hangi adla anılır?', 'Because of its undulating stone façade, Gaudí''s Casa Milà in Barcelona is popularly known by what name?', '["La Pedrera","Casa dels Ossos","El Capricho","La Rotonda"]'::jsonb),
  ('Tasarımında Leonardo da Vinci''nin etkisi olduğu düşünülen çift sarmal merdiveniyle ünlü Loire şatosu hangisidir?', 'Which Loire château is famous for a double-helix staircase thought to reflect Leonardo da Vinci''s influence?', '["Chambord","Chenonceau","Amboise","Villandry"]'::jsonb),
  ('Kurşun çerçeveli renkli cam abajurları kendi adıyla anılan Amerikalı Art Nouveau tasarımcısı kimdir?', 'Which American Art Nouveau designer gave his name to the famous leaded stained-glass lampshades?', '["Louis Comfort Tiffany","John La Farge","Frank Lloyd Wright","Gustav Stickley"]'::jsonb),
  ('1914''te bir süfrajet tarafından bıçakla yırtılan ''Rokeby Venüsü'' tablosunun ressamı kimdir?', 'Who painted the ''Rokeby Venus'', slashed by a suffragette in 1914?', '["Diego Velázquez","Bartolomé Esteban Murillo","Peter Paul Rubens","Francisco Goya"]'::jsonb),
  ('Barack Obama''nın 2008 seçim kampanyasıyla özdeşleşen kırmızı-bej-mavi ''Hope'' afişinin sanatçısı kimdir?', 'Which artist created the red, beige and blue ''Hope'' poster associated with Barack Obama''s 2008 campaign?', '["Shepard Fairey","Barbara Kruger","Robbie Conal","Mr. Brainwash"]'::jsonb),
  ('İnşaatı 1248''de başlayıp ancak 1880''de tamamlanan Gotik katedral hangisidir?', 'Which Gothic cathedral was begun in 1248 but not completed until 1880?', '["Cologne Cathedral","Chartres Cathedral","Notre-Dame de Paris","Milan Cathedral"]'::jsonb),
  ('1954-55''te enkostik teknikle ABD bayrağını resmettiği ''Bayrak'' tablosuyla tanınan sanatçı kimdir?', 'Which artist is known for ''Flag'' (1954–55), an encaustic painting of the US flag?', '["Jasper Johns","Robert Rauschenberg","Robert Indiana","Larry Rivers"]'::jsonb),
  ('Oryantalist ''Yılan Oynatıcı'' (1879 civarı) tablosunun ressamı kimdir?', 'Who painted the Orientalist canvas ''The Snake Charmer'' (c. 1879)?', '["Jean-Léon Gérôme","Eugène Fromentin","Jean-Joseph Benjamin-Constant","Jean-Jules-Antoine Lecomte du Noüy"]'::jsonb),
  ('Venedik lagünündeki hangi ada yüzyıllardır cam işçiliğiyle ünlüdür?', 'Which island in the Venetian lagoon has been famous for its glassmaking for centuries?', '["Murano","Burano","Torcello","Giudecca"]'::jsonb),
  ('1962 Dünya Fuarı için inşa edilen ''Space Needle'' kulesi hangi şehirdedir?', 'The Space Needle, built for the 1962 World''s Fair, stands in which city?', '["Seattle","Portland","San Francisco","Denver"]'::jsonb),
  ('Formula 1''in ünlü ''Eau Rouge'' virajı hangi pisttedir?', 'The famous ''Eau Rouge'' corner is on which Formula 1 circuit?', '["Spa-Francorchamps","Circuit Paul Ricard","Red Bull Ring","Yas Marina"]'::jsonb),
  ('1973''te ABD Üçlü Tacı''nı kazanıp Belmont Stakes''i 31 boy farkla bitiren efsanevi yarış atı hangisidir?', 'Which legendary racehorse won the US Triple Crown in 1973, taking the Belmont Stakes by 31 lengths?', '["Secretariat","Seabiscuit","Man o'' War","War Admiral"]'::jsonb),
  ('Fransa Bisiklet Turu''nu 1991-1995 arasında üst üste beş kez kazanan İspanyol bisikletçi kimdir?', 'Which Spanish cyclist won the Tour de France five times in a row from 1991 to 1995?', '["Miguel Indurain","Alberto Contador","Pedro Delgado","Carlos Sastre"]'::jsonb),
  ('1990 Dünya Kupası''nın gol kralı olan İtalyan forvet kimdir?', 'Which Italian striker was the top scorer of the 1990 World Cup?', '["Salvatore Schillaci","Roberto Baggio","Gianluca Vialli","Andrea Carnevale"]'::jsonb),
  ('1996 Atlanta Olimpiyatları''nda 200 ve 400 metrede altın kazanan, altın rengi ayakkabılarıyla hatırlanan ABD''li atlet kimdir?', 'Which American sprinter, remembered for his gold-coloured shoes, won both the 200 m and 400 m at the 1996 Atlanta Olympics?', '["Michael Johnson","Carl Lewis","Maurice Greene","Butch Reynolds"]'::jsonb),
  ('2013''te Wimbledon''ı kazanarak İngiliz erkeklerin 77 yıllık şampiyonluk hasretine son veren tenisçi kimdir?', 'Which tennis player won Wimbledon in 2013, ending a 77-year wait for a British men''s champion?', '["Andy Murray","Tim Henman","Greg Rusedski","Cameron Norrie"]'::jsonb),
  ('2032 Yaz Olimpiyat Oyunları''nın ev sahipliğini 2021''de kazanan şehir hangisidir?', 'Which city was awarded the 2032 Summer Olympic Games in 2021?', '["Brisbane","Doha","Budapest","Madrid"]'::jsonb),
  ('Çarpık bacaklarına rağmen 1958 ve 1962''de Dünya Kupası kazanan, lakabı küçük bir kuş türünün adından gelen Brezilyalı kanat oyuncusu kimdir?', 'Which Brazilian winger, who won the World Cup in 1958 and 1962 despite his bent legs, took his nickname from a small bird?', '["Garrincha","Nílton Santos","Vavá","Zagallo"]'::jsonb),
  ('Michael Jordan''ın hasta olmasına rağmen 38 sayı attığı ünlü ''Flu Game'', 1997 NBA Finalleri''nde hangi takıma karşı oynandı?', 'Michael Jordan''s famous ''Flu Game'', in which he scored 38 points while ill, came against which team in the 1997 NBA Finals?', '["Utah Jazz","Seattle SuperSonics","Portland Trail Blazers","Phoenix Suns"]'::jsonb),
  ('1994 Dünya Kupası''nda Kamerun''a tek maçta beş gol atarak rekor kıran Rus forvet kimdir?', 'Which Russian striker set a record by scoring five goals in a single match against Cameroon at the 1994 World Cup?', '["Oleg Salenko","Igor Kolyvanov","Dmitri Radchenko","Sergei Yuran"]'::jsonb),
  ('Jackie Stewart''ın ''Yeşil Cehennem'' adını taktığı, Almanya''daki ünlü yarış pisti hangisidir?', 'Which famous German race track did Jackie Stewart nickname ''the Green Hell''?', '["Nordschleife","Hockenheimring","Sachsenring","Norisring"]'::jsonb),
  ('''Buz Adam'' lakabıyla anılan 2007 Formula 1 dünya şampiyonu Finli pilot kimdir?', 'Which Finnish driver, nicknamed ''The Iceman'', was the 2007 Formula 1 world champion?', '["Kimi Räikkönen","Mika Häkkinen","Valtteri Bottas","Heikki Kovalainen"]'::jsonb),
  ('Yüksek atlamada 1993''te 2,45 metrelik dünya rekorunu kıran Kübalı atlet kimdir?', 'Which Cuban athlete set the high jump world record of 2.45 metres in 1993?', '["Javier Sotomayor","Patrik Sjöberg","Mutaz Essa Barshim","Igor Paklin"]'::jsonb),
  ('Formula 1''de 2018''den beri pilotun başını korumak için kokpitin üzerine takılan titanyum çerçevenin adı nedir?', 'Since 2018, what is the titanium frame fitted over Formula 1 cockpits to protect the driver''s head called?', '["Halo","Aeroscreen","Canopy","Roll hoop"]'::jsonb),
  ('Profesyonel boks kariyerini 50 galibiyet ve hiç yenilgisiz tamamlayan ABD''li boksör kimdir?', 'Which American boxer finished his professional career with 50 wins and no defeats?', '["Floyd Mayweather Jr.","Oscar De La Hoya","Sugar Ray Leonard","Pernell Whitaker"]'::jsonb),
  ('2010 Dünya Kupası''nda turnuvanın en iyi oyuncusu seçilerek Altın Top''u alan futbolcu kimdir?', 'Who won the Golden Ball as the best player of the 2010 World Cup?', '["Diego Forlán","Wesley Sneijder","Andrés Iniesta","David Villa"]'::jsonb),
  ('1995''te üç adım atlamada geçerli bir atlayışla 18 metreyi aşan ilk atlet kimdir?', 'In 1995, who became the first athlete to clear 18 metres in the triple jump with a legal jump?', '["Jonathan Edwards","Kenny Harrison","Christian Olsson","Willie Banks"]'::jsonb),
  ('2000 Sidney Olimpiyatları''nda 100 m serbestteki çok yavaş derecesiyle ''Yılan Balığı Eric'' lakabını alan yüzücü hangi ülkeyi temsil ediyordu?', 'Which country did ''Eric the Eel'', the swimmer famous for his very slow 100 m freestyle at the Sydney 2000 Olympics, represent?', '["Equatorial Guinea","Guinea-Bissau","Sierra Leone","Burkina Faso"]'::jsonb),
  ('Parke taşlı yollarıyla ''Kuzeyin Cehennemi'' diye anılan tek günlük bisiklet yarışı hangisidir?', 'Which one-day cycling race, known for its cobbled roads, is nicknamed ''the Hell of the North''?', '["Paris-Roubaix","Milan-San Remo","Liège-Bastogne-Liège","Tour of Flanders"]'::jsonb),
  ('Futbolda topa, destek ayağının arkasından bacak çaprazlanarak vurulmasına ne ad verilir?', 'In football, what is it called when the ball is struck by crossing the kicking leg behind the standing leg?', '["Rabona","Panenka","Bicycle kick","Elastico"]'::jsonb),
  ('Dövüş, dans ve müziği birleştiren, berimbau eşliğinde oynanan capoeira hangi ülkede doğmuştur?', 'Capoeira, which combines fighting, dance and music and is played to the berimbau, originated in which country?', '["Brazil","Cuba","Colombia","Portugal"]'::jsonb),
  ('Galatasaray Spor Kulübü''nü 1905''te arkadaşlarıyla birlikte kuran kişi kimdir?', 'Who founded Galatasaray Sports Club together with his friends in 1905?', '["Ali Sami Yen","Ziya Songülen","Mehmet Şamil Şhaplı","Şeref Bey"]'::jsonb),
  ('2012 Londra Olimpiyatları''nda tekvandoda Türkiye''ye altın madalya kazandıran sporcu kimdir?', 'Which athlete won Turkey''s taekwondo gold medal at the London 2012 Olympics?', '["Servet Tazegül","Bahri Tanrıkulu","Nur Tatar","Rıza Kayaalp"]'::jsonb),
  ('2017 Londra Dünya Atletizm Şampiyonası''nda 200 metrede altın madalya kazanan Türk atlet kimdir?', 'Which Turkish sprinter won the 200 metres gold at the 2017 World Championships in London?', '["Ramil Guliyev","Jak Ali Harvey","Emre Zafer Barnes","Yasmani Copello"]'::jsonb),
  ('Euro 2008 çeyrek finalinde Hırvatistan''a karşı uzatmanın son saniyelerinde eşitliği getiren golü atan Türk futbolcu kimdir?', 'Which Turkish player scored the last-gasp equaliser in extra time against Croatia in the Euro 2008 quarter-final?', '["Semih Şentürk","Nihat Kahveci","Arda Turan","Hamit Altıntop"]'::jsonb),
  ('Tokyo 2020 Olimpiyatları''nda kadınlar boksunda Türkiye''ye altın madalya kazandıran sporcu kimdir?', 'Which boxer won Turkey a gold medal in women''s boxing at the Tokyo 2020 Olympics?', '["Busenaz Sürmeneli","Buse Naz Çakıroğlu","Hatice Akbaş","Esra Yıldız"]'::jsonb),
  ('Türkiye''yi 2002 Dünya Kupası''nda üçüncülüğe taşıyan teknik direktör kimdir?', 'Which coach led Turkey to third place at the 2002 World Cup?', '["Şenol Güneş","Fatih Terim","Mustafa Denizli","Ersun Yanal"]'::jsonb)
  ) v(soru, en_soru, en_secenekler)
  join public.questions q on q.soru = v.soru and q.created_at >= transaction_timestamp()
on conflict (question_id, dil) do nothing;

-- ---------------------------------------------------- Çevrilmeyenler
insert into public.ceviri_atlanan (question_id, dil, neden, kod)
select q.id, 'en', v.neden, 'cevrilemez'
  from (values
  ('''Kurtlar Vadisi'' dizisinde Polat Alemdar''ı hangi oyuncu canlandırmıştır?', 'Türk dizisi ve oyuncular; İngilizce oyuncu için anlamsız'),
  ('''Kara Kartallar'' lakabıyla anılan futbol kulübü hangisidir?', 'Türk kulübü lakabı; İngilizce oyuncu için anlamsız'),
  ('Lazca ve Karadeniz ezgilerini rock müzikle buluşturan, 2005''te genç yaşta hayatını kaybeden müzisyen kimdir?', 'Türk yöresel müzisyenler; İngilizce oyuncu için anlamsız'),
  ('Barış Manço''nun yıllarca TRT''de sunduğu çocuk ve gezi programının adı nedir?', 'Türkiye''ye özgü TV programı adları; İngilizce oyuncu için anlamsız'),
  ('Şebnem Ferah solo kariyerinden önce hangi grupta şarkı söylüyordu?', 'Türk rock grupları; İngilizce oyuncu için anlamsız')
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
