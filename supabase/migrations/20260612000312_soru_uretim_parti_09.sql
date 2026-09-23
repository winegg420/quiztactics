-- ============================================================
-- 312 — Paket 3 soru üretimi, parti 9: 100 soru · 2026-09-23
--
-- Kategori: muzik 25 · sanat 24 · sinema 28 · spor 23
-- Yerel (kapsam='yerel', ulke='TR'): 11 · zorluk 1–5: 1/15/28/37/19
-- İngilizce çeviri: 93 · çevrilmeyen (ceviri_atlanan, kod 'cevrilemez'): 7
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
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti 9 --no 312
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
('''Black Panther'' (2018) filmindeki kahramanın kral olduğu hayali Afrika ülkesinin adı nedir?', '["Wakanda","Zamunda","Genovia","Latveria"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Pretty Woman'' (1990) filminde Julia Roberts''ın karşısındaki başrol oyuncusu kimdir?', '["Richard Gere","Hugh Grant","Kevin Costner","Tom Hanks"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Disney''in ''Moana'' (2016) filminde Moana''ya eşlik eden yarı tanrının adı nedir?', '["Maui","Tamatoa","Heihei","Tui"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Tim Burton''ın ''Makas Eller'' (1990) filminde elleri makas olan Edward''ı kim canlandırır?', '["Johnny Depp","Tim Robbins","Keanu Reeves","Nicolas Cage"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Yağmur Adam'' (Rain Man, 1988) filminde otistik savant Raymond''u canlandıran oyuncu kimdir?', '["Dustin Hoffman","Tom Cruise","Robin Williams","Al Pacino"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''Kirli Dans'' (Dirty Dancing, 1987) filminde dans eğitmeni Johnny Castle''ı kim canlandırır?', '["Patrick Swayze","John Travolta","Kevin Bacon","Tom Cruise"]'::jsonb, 0, 'sinema', 'global', null, 3),
('Biyografik ''Ray'' (2004) filminde Ray Charles''ı canlandırarak En İyi Erkek Oyuncu Oscar''ını kazanan kimdir?', '["Jamie Foxx","Denzel Washington","Will Smith","Don Cheadle"]'::jsonb, 0, 'sinema', 'global', null, 3),
('Tina Turner''ın hayatını anlatan ''What''s Love Got to Do with It'' (1993) filminde onu kim canlandırmıştır?', '["Angela Bassett","Whitney Houston","Halle Berry","Jada Pinkett"]'::jsonb, 0, 'sinema', 'global', null, 4),
('''Yenilmezler: Sonsuzluk Savaşı'' (2018) filminde Thanos hangi altı nesneyi toplamaya çalışır?', '["Sonsuzluk Taşları","Ejderha Topları","Ölüm Yadigârları","Güç Yüzükleri"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Alfred Hitchcock kariyeri boyunca kaç kez En İyi Yönetmen Oscar''ı kazanmıştır?', '["Hiç kazanmadı","Bir kez kazandı","İki kez kazandı","Üç kez kazandı"]'::jsonb, 0, 'sinema', 'global', null, 4),
('Sergey Eisenstein''ın ''Aleksandr Nevski'' (1938) filminin müziğini kim bestelemiştir?', '["Sergey Prokofyev","Dmitri Şostakoviç","Aram Haçaturyan","İsaak Dunayevski"]'::jsonb, 0, 'sinema', 'global', null, 4),
('''Madagaskar'' (2005) filmindeki zebranın adı nedir?', '["Marty","Melman","Gloria","Julien"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Hitchcock''un birkaç uzun plandan oluşup tek çekimmiş izlenimi veren 1948 filmi hangisidir?', '["İp","Arka Pencere","Şüphe","Sapık"]'::jsonb, 0, 'sinema', 'global', null, 4),
('''Karate Kid'' (1984) filminde Daniel''e karate öğreten ustanın adı nedir?', '["Bay Miyagi","Bay Han","John Kreese","Usta Shifu"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Kurosawa''nın 16 filminde oynayan, ''Yedi Samuray''daki Kikuchiyo rolüyle bilinen Japon oyuncu kimdir?', '["Toshiro Mifune","Takashi Shimura","Tatsuya Nakadai","Ken Watanabe"]'::jsonb, 0, 'sinema', 'global', null, 4),
('''Bollywood''un Kralı'' (King Khan) lakabıyla anılan Hint oyuncu kimdir?', '["Shah Rukh Khan","Salman Khan","Aamir Khan","Saif Ali Khan"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''Notting Hill'' (1999) filminde Hugh Grant''in canlandırdığı William''ın mesleği nedir?', '["Kitapçı","Gazeteci","Aşçı","Avukat"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''Siyah Giyen Adamlar'' (Men in Black, 1997) filminde Ajan K''yi hangi oyuncu canlandırır?', '["Tommy Lee Jones","Will Smith","Jeff Goldblum","Samuel L. Jackson"]'::jsonb, 0, 'sinema', 'global', null, 3),
('Orson Welles''in ''Gecenin Sonu'' (Touch of Evil, 1958) filmi hangi olayı gösteren ünlü uzun planla açılır?', '["Bir arabaya bomba konmasını","Bir bankanın gece soyulmasını","Bir trenin raydan çıkmasını","Bir düğün alayının geçişini"]'::jsonb, 0, 'sinema', 'global', null, 5),
('Charlie Chaplin''in sesinin beyazperdede ilk kez duyulduğu, anlamsız sözlerle şarkı söylediği film hangisidir?', '["Modern Zamanlar","Şehir Işıkları","Altına Hücum","Büyük Diktatör"]'::jsonb, 0, 'sinema', 'global', null, 4),
('Terrence Malick''in ''Cennet Günleri'' (1978) filmiyle En İyi Görüntü Yönetmenliği Oscar''ını kazanan kimdir?', '["Néstor Almendros","Vilmos Zsigmond","Conrad L. Hall","Sven Nykvist"]'::jsonb, 0, 'sinema', 'global', null, 5),
('Sergio Leone''nin ''Bir Zamanlar Batıda'' (1968) filminde armonika çalan gizemli adamı kim canlandırır?', '["Charles Bronson","Henry Fonda","Clint Eastwood","Jason Robards"]'::jsonb, 0, 'sinema', 'global', null, 4),
('En İyi Film Oscar''ına aday gösterilen ilk animasyon filmi hangisidir?', '["Güzel ve Çirkin","Aslan Kral","Küçük Deniz Kızı","Oyuncak Hikâyesi"]'::jsonb, 0, 'sinema', 'global', null, 4),
('David Lynch''in ilk uzun metrajlı filmi hangisidir?', '["Eraserhead","Fil Adam","Mavi Kadife","Dune"]'::jsonb, 0, 'sinema', 'global', null, 4),
('''Enjoy the Silence'' ve ''Personal Jesus'' şarkılarıyla tanınan İngiliz synth-pop grubu hangisidir?', '["Depeche Mode","Pet Shop Boys","Tears for Fears","New Order"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Beethoven''ın ''Eroica'' senfonisi, besteci ithafı öfkeyle silmeden önce kime adanmıştı?', '["Napolyon Bonapart","George Washington","Büyük Friedrich","Çar I. Aleksandr"]'::jsonb, 0, 'muzik', 'global', null, 3),
('''Take On Me'' şarkısıyla tanınan a-ha grubu hangi ülkedendir?', '["Norveç","İsveç","Danimarka","Finlandiya"]'::jsonb, 0, 'muzik', 'global', null, 3),
('''Boys Don''t Cry'' ve ''Friday I''m in Love'' şarkılarıyla tanınan The Cure grubunun solisti kimdir?', '["Robert Smith","Morrissey","Ian Curtis","Dave Gahan"]'::jsonb, 0, 'muzik', 'global', null, 3),
('''Du hast'' ve ''Sonne'' şarkılarıyla tanınan endüstriyel metal grubu Rammstein hangi ülkedendir?', '["Almanya","Avusturya","İsviçre","Hollanda"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Livin'' la Vida Loca'' şarkısıyla tanınan Ricky Martin nerelidir?', '["Porto Riko","Dominik Cumhuriyeti","Kolombiya","Venezuela"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Yalınayak Diva'' lakaplı morna şarkıcısı Cesária Évora hangi ülkedendir?', '["Yeşil Burun Adaları","São Tomé ve Príncipe","Gine-Bissau","Ekvator Ginesi"]'::jsonb, 0, 'muzik', 'global', null, 5),
('Soğuk Savaş''ın sona erişiyle özdeşleşen ''Wind of Change'' şarkısını seslendiren Alman grubu hangisidir?', '["Scorpions","Accept","Helloween","Kraftwerk"]'::jsonb, 0, 'muzik', 'global', null, 3),
('''Livin'' on a Prayer'' şarkısıyla tanınan Bon Jovi grubu hangi ABD eyaletinde kurulmuştur?', '["New Jersey","New York","Pensilvanya","Ohio"]'::jsonb, 0, 'muzik', 'global', null, 3),
('''Soul Müziğin Babası'' (Godfather of Soul) lakabıyla anılan şarkıcı kimdir?', '["James Brown","Marvin Gaye","Otis Redding","Sam Cooke"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Siyah-beyaz yüz makyajları ve ''Demon'', ''Starchild'' karakterleriyle tanınan rock grubu hangisidir?', '["Kiss","Twisted Sister","Mötley Crüe","Alice Cooper"]'::jsonb, 0, 'muzik', 'global', null, 3),
('1971 tarihli ''What''s Going On'' albümüyle tanınan soul şarkıcısı kimdir?', '["Marvin Gaye","Curtis Mayfield","Bill Withers","Al Green"]'::jsonb, 0, 'muzik', 'global', null, 4),
('''Fransız Elvis''i olarak anılan rock şarkıcısı kimdir?', '["Johnny Hallyday","Serge Gainsbourg","Jacques Dutronc","Michel Polnareff"]'::jsonb, 0, 'muzik', 'global', null, 4),
('Tangonun en ünlü sesi sayılan, ''Por una Cabeza''nın bestecisi olan şarkıcı kimdir?', '["Carlos Gardel","Astor Piazzolla","Aníbal Troilo","Julio Sosa"]'::jsonb, 0, 'muzik', 'global', null, 4),
('Verdi''nin ''Aida'' operasının 1871''deki dünya prömiyeri hangi şehirde yapılmıştır?', '["Kahire","Milano","İskenderiye","İstanbul"]'::jsonb, 0, 'muzik', 'global', null, 4),
('Jimi Hendrix, Janis Joplin, Jim Morrison ve Kurt Cobain kaç yaşında hayatını kaybetmiştir?', '["27","25","29","33"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Johann Sebastian Bach''ın iki evliliğinden toplam kaç çocuğu olmuştur?', '["20","12","16","24"]'::jsonb, 0, 'muzik', 'global', null, 5),
('''Bamboléo'' ve ''Volare'' yorumlarıyla tanınan flamenko-pop grubu Gipsy Kings hangi ülkede kurulmuştur?', '["Fransa","İspanya","Portekiz","Arjantin"]'::jsonb, 0, 'muzik', 'global', null, 4),
('Stravinski''nin ''Bahar Ayini'' balesinin 1913''teki olaylı prömiyeri Paris''te hangi tiyatroda yapılmıştır?', '["Champs-Élysées Tiyatrosu","Opéra Garnier Sarayı","Châtelet Tiyatrosu","Odéon Tiyatrosu"]'::jsonb, 0, 'muzik', 'global', null, 5),
('''We Are the World'' (1985) şarkısını Michael Jackson ile birlikte kim yazmıştır?', '["Lionel Richie","Stevie Wonder","Paul McCartney","Bob Geldof"]'::jsonb, 0, 'muzik', 'global', null, 4),
('Céline Dion 1988 Eurovision Şarkı Yarışması''nı hangi ülke adına yarışarak kazanmıştır?', '["İsviçre","Fransa","Belçika","Lüksemburg"]'::jsonb, 0, 'muzik', 'global', null, 5),
('2016''da Nobel Edebiyat Ödülü''ne layık görülen şarkıcı ve söz yazarı kimdir?', '["Bob Dylan","Leonard Cohen","Paul Simon","Bruce Springsteen"]'::jsonb, 0, 'muzik', 'global', null, 2),
('2003''te Tate Modern''in Türbin Salonu''na yapay bir güneş yerleştirdiği ''Hava Projesi''nin sanatçısı kimdir?', '["Olafur Eliasson","Anish Kapoor","Ai Weiwei","Louise Bourgeois"]'::jsonb, 0, 'sanat', 'global', null, 5),
('1956 tarihli ünlü ''Lounge Chair'' koltuğunu tasarlayan Amerikalı çift kimdir?', '["Charles ve Ray Eames","Alvar ve Aino Aalto","Josef ve Anni Albers","Robert ve Sonia Delaunay"]'::jsonb, 0, 'sanat', 'global', null, 4),
('2017''de açık artırmada 450 milyon dolara satılan Leonardo da Vinci''ye atfedilen tablo hangisidir?', '["Salvator Mundi","Ginevra de'' Benci","La Belle Ferronnière","Leda ve Kuğu"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Örümceği andıran ''Juicy Salif'' limon sıkacağını Alessi için tasarlayan Fransız tasarımcı kimdir?', '["Philippe Starck","Michael Graves","Ettore Sottsass","Alessandro Mendini"]'::jsonb, 0, 'sanat', 'global', null, 5),
('1947''de ''New Look'' koleksiyonuyla savaş sonrası kadın modasını değiştiren tasarımcı kimdir?', '["Christian Dior","Coco Chanel","Cristóbal Balenciaga","Hubert de Givenchy"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Roma''daki Navona Meydanı''nda bulunan ''Dört Nehir Çeşmesi''nin heykeltıraşı kimdir?', '["Gian Lorenzo Bernini","Francesco Borromini","Pietro da Cortona","Nicola Salvi"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Henry Moore''un çağdaşı olan, St Ives''taki atölyesiyle bilinen İngiliz modernist kadın heykeltıraş kimdir?', '["Barbara Hepworth","Rachel Whiteread","Elisabeth Frink","Louise Nevelson"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Jackson Pollock''un eşi olan soyut dışavurumcu ressam kimdir?', '["Lee Krasner","Helen Frankenthaler","Joan Mitchell","Elaine de Kooning"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Kuala Lumpur''daki Petronas İkiz Kuleleri''nin mimarı kimdir?', '["César Pelli","Kisho Kurokawa","Norman Foster","Ieoh Ming Pei"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Pembe elbiseli bir kadının salıncakta ayakkabısını havaya fırlattığı Rokoko tablosu ''Salıncak'' kimin eseridir?', '["Jean-Honoré Fragonard","François Boucher","Antoine Watteau","Jacques-Louis David"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Provence''lı köylüleri iskambil oynarken gösteren ''Kart Oyuncuları'' tablo dizisinin ressamı kimdir?', '["Paul Cézanne","Camille Pissarro","Gustave Caillebotte","Jean-François Millet"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Frida Kahlo''nun çelik korseye sarılı ve çivilerle delinmiş bedenini gösterdiği 1944 tablosunun adı nedir?', '["Kırık Sütun","İki Frida","Yaralı Geyik","Hastane Henry Ford"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Van Gogh''un 1888''de Arles''da kiraladığı ve bir tablosuna da konu ettiği ev hangi adla bilinir?', '["Sarı Ev","Mavi Ev","Kırmızı Ev","Beyaz Ev"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Kolezyum''u andıran dev bir yapıyı gösteren 1563 tarihli ''Babil Kulesi'' tablosunun ressamı kimdir?', '["Pieter Bruegel","Hieronymus Bosch","Jan van Eyck","Peter Paul Rubens"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Paris''te bir çiftin sokakta öpüştüğü ''Belediye Binası Önünde Öpücük'' (1950) fotoğrafı kimindir?', '["Robert Doisneau","Henri Cartier-Bresson","Brassaï","Willy Ronis"]'::jsonb, 0, 'sanat', 'global', null, 4),
('19. yüzyıl İngiltere''sinde ''Arts and Crafts'' (Sanat ve Zanaat) hareketinin öncüsü olan tasarımcı kimdir?', '["William Morris","Aubrey Beardsley","Owen Jones","Christopher Dresser"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Frank Lloyd Wright''ın tasarladığı, 1923 Büyük Kanto Depremi''ni atlatan ama 1968''de yıkılan Tokyo oteli hangisidir?', '["Imperial Hotel","Okura Hotel","Hotel New Otani","Palace Hotel"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Roma''daki Kolezyum''un özgün adı nedir?', '["Flavius Amfitiyatrosu","Marcellus Tiyatrosu","Pompeius Tiyatrosu","Maximus Sirki"]'::jsonb, 0, 'sanat', 'global', null, 3),
('1994''te Microsoft için ''Comic Sans'' yazı karakterini tasarlayan kimdir?', '["Vincent Connare","Matthew Carter","Adrian Frutiger","Erik Spiekermann"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Times New Roman yazı karakteri 1932''de ilk olarak hangi gazete için tasarlanmıştır?', '["The Times","The Guardian","The Daily Telegraph","The Observer"]'::jsonb, 0, 'sanat', 'global', null, 4),
('1924''te ''Sürrealizm Manifestosu''nu yayımlayarak akımın önderi olan Fransız yazar kimdir?', '["André Breton","Tristan Tzara","Paul Éluard","Filippo Marinetti"]'::jsonb, 0, 'sanat', 'global', null, 4),
('New York''taki Brooklyn Köprüsü''nü tasarlayan ve inşaat başlamadan ölen mühendis kimdir?', '["John Roebling","Othmar Ammann","Joseph Strauss","Gustave Eiffel"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Futbolcu Son Heung-min hangi ülkenin milli takımında oynar?', '["Güney Kore","Japonya","Tayvan","Kuzey Kore"]'::jsonb, 0, 'spor', 'global', null, 2),
('Formula 1''de sıralama turlarında en hızlı olan pilotun kazandığı ilk sıradaki çıkış konumuna ne ad verilir?', '["Pole position","Pit stop","Safety car","Parc fermé"]'::jsonb, 0, 'spor', 'global', null, 3),
('Tenisçi Carlos Alcaraz hangi ülkenin sporcusudur?', '["İspanya","Arjantin","İtalya","Portekiz"]'::jsonb, 0, 'spor', 'global', null, 2),
('Futbolcu Mohamed Salah hangi ülkenin milli takımında oynar?', '["Mısır","Fas","Tunus","Cezayir"]'::jsonb, 0, 'spor', 'global', null, 1),
('Basketbolcu Luka Dončić hangi ülkenin milli takımında oynar?', '["Slovenya","Sırbistan","Hırvatistan","Slovakya"]'::jsonb, 0, 'spor', 'global', null, 2),
('Basketbolcu Giannis Antetokounmpo hangi ülkenin milli takımında oynar?', '["Yunanistan","Nijerya","Arnavutluk","Bulgaristan"]'::jsonb, 0, 'spor', 'global', null, 2),
('''Kuzey Londra Derbisi'' Arsenal ile hangi takım arasında oynanır?', '["Tottenham Hotspur","Queens Park Rangers","West Ham United","Crystal Palace"]'::jsonb, 0, 'spor', 'global', null, 3),
('Golfte ABD ile Avrupa''nın kadın takımları arasında oynanan kupa hangisidir?', '["Solheim Kupası","Ryder Kupası","Walker Kupası","Presidents Kupası"]'::jsonb, 0, 'spor', 'global', null, 4),
('1988 Seul Olimpiyatları''nda başını tramplene çarpmasına rağmen altın madalya kazanan ABD''li atlayıcı kimdir?', '["Greg Louganis","Mark Lenzi","Dmitri Sautin","Tom Daley"]'::jsonb, 0, 'spor', 'global', null, 4),
('Formula 1 pilotu Max Verstappen hangi ülkenin bayrağı altında yarışır?', '["Hollanda","Belçika","Almanya","Danimarka"]'::jsonb, 0, 'spor', 'global', null, 2),
('Buz hokeyi efsanesi Wayne Gretzky''nin NHL''de tüm takımlarca emekliye ayrılan forma numarası kaçtır?', '["99","66","87","9"]'::jsonb, 0, 'spor', 'global', null, 3),
('2012 ve 2016 Olimpiyatları''nda hem 5000 hem 10.000 metrede altın madalya kazanan İngiliz atlet kimdir?', '["Mo Farah","Kenenisa Bekele","Paul Tergat","Haile Gebrselassie"]'::jsonb, 0, 'spor', 'global', null, 3),
('Futbolda adını 1974 Dünya Kupası''nda İsveç''e karşı yapılan bir çalımdan alan hareket hangi oyuncunun adını taşır?', '["Johan Cruyff","Diego Maradona","Franz Beckenbauer","Gerd Müller"]'::jsonb, 0, 'spor', 'global', null, 3),
('Formula 1 pilotu Charles Leclerc hangi ülkenin bayrağı altında yarışır?', '["Monako","Fransa","İsviçre","Belçika"]'::jsonb, 0, 'spor', 'global', null, 3),
('1972 Münih Olimpiyatları''nda yıldızlaşan, ''Minsk''in Serçesi'' lakaplı Sovyet jimnastikçi kimdir?', '["Olga Korbut","Nadia Comăneci","Larisa Latınina","Lüdmila Turişçeva"]'::jsonb, 0, 'spor', 'global', null, 4),
('1974''ten beri kullanılan FIFA Dünya Kupası kupasını tasarlayan İtalyan heykeltıraş kimdir?', '["Silvio Gazzaniga","Abel Lafleur","Arnaldo Pomodoro","Pietro Consagra"]'::jsonb, 0, 'spor', 'global', null, 5),
('Wimbledon''da kadınlar tekler şampiyonuna verilen gümüş tabağın adı nedir?', '["Venus Rosewater Dish","Challenge Cup","Suzanne Lenglen Kupası","Daphne Akhurst Kupası"]'::jsonb, 0, 'spor', 'global', null, 5),
('Bugün NBA şampiyonuna verilen kupanın adı nedir?', '["Larry O''Brien Kupası","Walter A. Brown Kupası","Vince Lombardi Kupası","Stanley Kupası"]'::jsonb, 0, 'spor', 'global', null, 4),
('Sırıkla atlamada 6 metreyi aşan ilk atlet olan ve onlarca kez dünya rekoru kıran Ukraynalı sporcu kimdir?', '["Sergey Bubka","Renaud Lavillenie","Armand Duplantis","Rodion Gataullin"]'::jsonb, 0, 'spor', 'global', null, 4),
('ABD Açık tenis turnuvasının bugün oynandığı kompleks New York''un hangi bölgesindedir?', '["Flushing Meadows","Forest Hills","Central Park","Coney Island"]'::jsonb, 0, 'spor', 'global', null, 4),
('Etiyopyalı atlet Haile Gebrselassie iki olimpiyat altınını hangi mesafede kazanmıştır?', '["10.000 metre","5000 metre","Maraton","3000 metre engelli"]'::jsonb, 0, 'spor', 'global', null, 4),
('Yılmaz Erdoğan''ın ''Kelebeğin Rüyası'' (2013) filmi hangi iki genç şairin hayatını anlatır?', '["Muzaffer Tayyip Uslu ve Rüştü Onur","Cahit Sıtkı Tarancı ve Ziya Osman","Orhan Veli Kanık ve Oktay Rifat","Attilâ İlhan ve Ahmed Arif"]'::jsonb, 0, 'sinema', 'yerel', 'TR', 5),
('Rock grubu Duman''ın solisti kimdir?', '["Kaan Tangöze","Harun Tekin","Cem Adrian","Hayko Cepkin"]'::jsonb, 0, 'muzik', 'yerel', 'TR', 3),
('Otomobil hırsızlarını anlatan ''Organize İşler'' (2005) filminin yönetmeni kimdir?', '["Yılmaz Erdoğan","Cem Yılmaz","Ömer Faruk Sorak","Yavuz Turgul"]'::jsonb, 0, 'sinema', 'yerel', 'TR', 3),
('Metin Erksan''ın ''Sevmek Zamanı'' (1965) filminde badanacı Halil, Meral''in neyine âşık olur?', '["Fotoğrafına","Sesine","Mektuplarına","Resmettiği tablolara"]'::jsonb, 0, 'sinema', 'yerel', 'TR', 5),
('İstiklal Marşı''nın 1930''dan beri resmî olarak kullanılan bestesi kime aittir?', '["Osman Zeki Üngör","Ali Rıfat Çağatay","Cemal Reşit Rey","Ahmet Adnan Saygun"]'::jsonb, 0, 'muzik', 'yerel', 'TR', 3),
('Galatasaray''ın efsane golcüsü olan ve ''Taçsız Kral'' lakabıyla anılan futbolcu kimdir?', '["Metin Oktay","Lefter Küçükandonyadis","Can Bartu","Turgay Şeren"]'::jsonb, 0, 'spor', 'yerel', 'TR', 3),
('İstanbul''da 1969''da açılan ilk Atatürk Kültür Merkezi binasının mimarı kimdir?', '["Hayati Tabanlıoğlu","Sedad Hakkı Eldem","Behruz Çinici","Turgut Cansever"]'::jsonb, 0, 'sanat', 'yerel', 'TR', 5),
('Cem Yılmaz''ın ''Yahşi Batı'' (2010) filminde iki Osmanlı elçisi Amerika''ya hangi amaçla gider?', '["Padişahın hediyesini götürmek","Kayıp bir hazineyi aramak","Bir kaçak mahkûmu yakalamak","Bir demiryolu hattı kurmak"]'::jsonb, 0, 'sinema', 'yerel', 'TR', 3),
('Ressam Fahrelnissa Zeid''in kız kardeşi olan gravür ve resim sanatçısı kimdir?', '["Aliye Berger","Hale Asaf","Mihri Müşfik","Eren Eyüboğlu"]'::jsonb, 0, 'sanat', 'yerel', 'TR', 5),
('''Adam Olacak Çocuk'' şarkısı hangi sanatçıya aittir?', '["Barış Manço","Cem Karaca","Erkin Koray","Fikret Kızılok"]'::jsonb, 0, 'muzik', 'yerel', 'TR', 3),
('2004''te Bergen''de 5000 metrede dünya rekoru kıran Türk atlet kimdir?', '["Elvan Abeylegesse","Alemitu Bekele","Süreyya Ayhan","Yasemin Can"]'::jsonb, 0, 'spor', 'yerel', 'TR', 5)
on conflict (soru) do nothing;

-- ---------------------------------------------------- İngilizce çeviri
insert into public.question_translations (question_id, dil, soru, secenekler)
select q.id, 'en', v.en_soru, v.en_secenekler
  from (values
  ('''Black Panther'' (2018) filmindeki kahramanın kral olduğu hayali Afrika ülkesinin adı nedir?', 'What is the name of the fictional African nation ruled by the hero of ''Black Panther'' (2018)?', '["Wakanda","Zamunda","Genovia","Latveria"]'::jsonb),
  ('''Pretty Woman'' (1990) filminde Julia Roberts''ın karşısındaki başrol oyuncusu kimdir?', 'Who is Julia Roberts''s leading man in ''Pretty Woman'' (1990)?', '["Richard Gere","Hugh Grant","Kevin Costner","Tom Hanks"]'::jsonb),
  ('Disney''in ''Moana'' (2016) filminde Moana''ya eşlik eden yarı tanrının adı nedir?', 'In Disney''s ''Moana'' (2016), what is the name of the demigod who accompanies Moana?', '["Maui","Tamatoa","Heihei","Tui"]'::jsonb),
  ('Tim Burton''ın ''Makas Eller'' (1990) filminde elleri makas olan Edward''ı kim canlandırır?', 'Who plays Edward, the man with scissors for hands, in Tim Burton''s ''Edward Scissorhands'' (1990)?', '["Johnny Depp","Tim Robbins","Keanu Reeves","Nicolas Cage"]'::jsonb),
  ('''Yağmur Adam'' (Rain Man, 1988) filminde otistik savant Raymond''u canlandıran oyuncu kimdir?', 'Which actor plays Raymond, the autistic savant, in ''Rain Man'' (1988)?', '["Dustin Hoffman","Tom Cruise","Robin Williams","Al Pacino"]'::jsonb),
  ('''Kirli Dans'' (Dirty Dancing, 1987) filminde dans eğitmeni Johnny Castle''ı kim canlandırır?', 'Who plays dance instructor Johnny Castle in ''Dirty Dancing'' (1987)?', '["Patrick Swayze","John Travolta","Kevin Bacon","Tom Cruise"]'::jsonb),
  ('Biyografik ''Ray'' (2004) filminde Ray Charles''ı canlandırarak En İyi Erkek Oyuncu Oscar''ını kazanan kimdir?', 'Who won the Academy Award for Best Actor for playing Ray Charles in the biopic ''Ray'' (2004)?', '["Jamie Foxx","Denzel Washington","Will Smith","Don Cheadle"]'::jsonb),
  ('Tina Turner''ın hayatını anlatan ''What''s Love Got to Do with It'' (1993) filminde onu kim canlandırmıştır?', 'Who played Tina Turner in the biopic ''What''s Love Got to Do with It'' (1993)?', '["Angela Bassett","Whitney Houston","Halle Berry","Jada Pinkett"]'::jsonb),
  ('''Yenilmezler: Sonsuzluk Savaşı'' (2018) filminde Thanos hangi altı nesneyi toplamaya çalışır?', 'In ''Avengers: Infinity War'' (2018), which six objects does Thanos try to collect?', '["The Infinity Stones","The Dragon Balls","The Deathly Hallows","The Rings of Power"]'::jsonb),
  ('Alfred Hitchcock kariyeri boyunca kaç kez En İyi Yönetmen Oscar''ı kazanmıştır?', 'How many times did Alfred Hitchcock win the Academy Award for Best Director?', '["Never","Once","Twice","Three times"]'::jsonb),
  ('Sergey Eisenstein''ın ''Aleksandr Nevski'' (1938) filminin müziğini kim bestelemiştir?', 'Who composed the score for Sergei Eisenstein''s ''Alexander Nevsky'' (1938)?', '["Sergei Prokofiev","Dmitri Shostakovich","Aram Khachaturian","Isaak Dunayevsky"]'::jsonb),
  ('''Madagaskar'' (2005) filmindeki zebranın adı nedir?', 'What is the name of the zebra in ''Madagascar'' (2005)?', '["Marty","Melman","Gloria","Julien"]'::jsonb),
  ('Hitchcock''un birkaç uzun plandan oluşup tek çekimmiş izlenimi veren 1948 filmi hangisidir?', 'Which 1948 Hitchcock film is made of a few long takes to give the impression of a single continuous shot?', '["Rope","Rear Window","Suspicion","Psycho"]'::jsonb),
  ('''Karate Kid'' (1984) filminde Daniel''e karate öğreten ustanın adı nedir?', 'In ''The Karate Kid'' (1984), what is the name of the master who teaches Daniel karate?', '["Mr. Miyagi","Mr. Han","John Kreese","Master Shifu"]'::jsonb),
  ('Kurosawa''nın 16 filminde oynayan, ''Yedi Samuray''daki Kikuchiyo rolüyle bilinen Japon oyuncu kimdir?', 'Which Japanese actor, who appeared in 16 Kurosawa films, is known for playing Kikuchiyo in ''Seven Samurai''?', '["Toshiro Mifune","Takashi Shimura","Tatsuya Nakadai","Ken Watanabe"]'::jsonb),
  ('''Bollywood''un Kralı'' (King Khan) lakabıyla anılan Hint oyuncu kimdir?', 'Which Indian actor is nicknamed ''King Khan'', the King of Bollywood?', '["Shah Rukh Khan","Salman Khan","Aamir Khan","Saif Ali Khan"]'::jsonb),
  ('''Notting Hill'' (1999) filminde Hugh Grant''in canlandırdığı William''ın mesleği nedir?', 'In ''Notting Hill'' (1999), what is the profession of William, played by Hugh Grant?', '["Bookshop owner","Journalist","Chef","Lawyer"]'::jsonb),
  ('''Siyah Giyen Adamlar'' (Men in Black, 1997) filminde Ajan K''yi hangi oyuncu canlandırır?', 'Which actor plays Agent K in ''Men in Black'' (1997)?', '["Tommy Lee Jones","Will Smith","Jeff Goldblum","Samuel L. Jackson"]'::jsonb),
  ('Orson Welles''in ''Gecenin Sonu'' (Touch of Evil, 1958) filmi hangi olayı gösteren ünlü uzun planla açılır?', 'Orson Welles''s ''Touch of Evil'' (1958) opens with a famous long take showing what?', '["A bomb being planted in a car","A bank being robbed at night","A train derailing","A wedding procession passing"]'::jsonb),
  ('Charlie Chaplin''in sesinin beyazperdede ilk kez duyulduğu, anlamsız sözlerle şarkı söylediği film hangisidir?', 'In which film was Charlie Chaplin''s voice heard on screen for the first time, singing a song with nonsense lyrics?', '["Modern Times","City Lights","The Gold Rush","The Great Dictator"]'::jsonb),
  ('Terrence Malick''in ''Cennet Günleri'' (1978) filmiyle En İyi Görüntü Yönetmenliği Oscar''ını kazanan kimdir?', 'Who won the Academy Award for Best Cinematography for Terrence Malick''s ''Days of Heaven'' (1978)?', '["Néstor Almendros","Vilmos Zsigmond","Conrad L. Hall","Sven Nykvist"]'::jsonb),
  ('Sergio Leone''nin ''Bir Zamanlar Batıda'' (1968) filminde armonika çalan gizemli adamı kim canlandırır?', 'Who plays the mysterious harmonica-playing man in Sergio Leone''s ''Once Upon a Time in the West'' (1968)?', '["Charles Bronson","Henry Fonda","Clint Eastwood","Jason Robards"]'::jsonb),
  ('En İyi Film Oscar''ına aday gösterilen ilk animasyon filmi hangisidir?', 'What was the first animated film to be nominated for the Academy Award for Best Picture?', '["Beauty and the Beast","The Lion King","The Little Mermaid","Toy Story"]'::jsonb),
  ('David Lynch''in ilk uzun metrajlı filmi hangisidir?', 'What was David Lynch''s first feature-length film?', '["Eraserhead","The Elephant Man","Blue Velvet","Dune"]'::jsonb),
  ('''Enjoy the Silence'' ve ''Personal Jesus'' şarkılarıyla tanınan İngiliz synth-pop grubu hangisidir?', 'Which English synth-pop band is known for ''Enjoy the Silence'' and ''Personal Jesus''?', '["Depeche Mode","Pet Shop Boys","Tears for Fears","New Order"]'::jsonb),
  ('Beethoven''ın ''Eroica'' senfonisi, besteci ithafı öfkeyle silmeden önce kime adanmıştı?', 'Before Beethoven angrily struck out the dedication, to whom was his ''Eroica'' symphony dedicated?', '["Napoleon Bonaparte","George Washington","Frederick the Great","Tsar Alexander I"]'::jsonb),
  ('''Take On Me'' şarkısıyla tanınan a-ha grubu hangi ülkedendir?', 'Which country is a-ha, the band known for ''Take On Me'', from?', '["Norway","Sweden","Denmark","Finland"]'::jsonb),
  ('''Boys Don''t Cry'' ve ''Friday I''m in Love'' şarkılarıyla tanınan The Cure grubunun solisti kimdir?', 'Who is the lead singer of The Cure, known for ''Boys Don''t Cry'' and ''Friday I''m in Love''?', '["Robert Smith","Morrissey","Ian Curtis","Dave Gahan"]'::jsonb),
  ('''Du hast'' ve ''Sonne'' şarkılarıyla tanınan endüstriyel metal grubu Rammstein hangi ülkedendir?', 'Which country is the industrial metal band Rammstein, known for ''Du hast'' and ''Sonne'', from?', '["Germany","Austria","Switzerland","Netherlands"]'::jsonb),
  ('''Livin'' la Vida Loca'' şarkısıyla tanınan Ricky Martin nerelidir?', 'Where is Ricky Martin, known for ''Livin'' la Vida Loca'', from?', '["Puerto Rico","Dominican Republic","Colombia","Venezuela"]'::jsonb),
  ('''Yalınayak Diva'' lakaplı morna şarkıcısı Cesária Évora hangi ülkedendir?', 'Which country was Cesária Évora, the morna singer nicknamed ''the Barefoot Diva'', from?', '["Cape Verde","São Tomé and Príncipe","Guinea-Bissau","Equatorial Guinea"]'::jsonb),
  ('Soğuk Savaş''ın sona erişiyle özdeşleşen ''Wind of Change'' şarkısını seslendiren Alman grubu hangisidir?', 'Which German band performed ''Wind of Change'', the song associated with the end of the Cold War?', '["Scorpions","Accept","Helloween","Kraftwerk"]'::jsonb),
  ('''Livin'' on a Prayer'' şarkısıyla tanınan Bon Jovi grubu hangi ABD eyaletinde kurulmuştur?', 'In which US state was Bon Jovi, the band known for ''Livin'' on a Prayer'', formed?', '["New Jersey","New York","Pennsylvania","Ohio"]'::jsonb),
  ('''Soul Müziğin Babası'' (Godfather of Soul) lakabıyla anılan şarkıcı kimdir?', 'Which singer was nicknamed ''the Godfather of Soul''?', '["James Brown","Marvin Gaye","Otis Redding","Sam Cooke"]'::jsonb),
  ('Siyah-beyaz yüz makyajları ve ''Demon'', ''Starchild'' karakterleriyle tanınan rock grubu hangisidir?', 'Which rock band is known for its black-and-white face paint and personas such as ''the Demon'' and ''the Starchild''?', '["Kiss","Twisted Sister","Mötley Crüe","Alice Cooper"]'::jsonb),
  ('1971 tarihli ''What''s Going On'' albümüyle tanınan soul şarkıcısı kimdir?', 'Which soul singer is known for the 1971 album ''What''s Going On''?', '["Marvin Gaye","Curtis Mayfield","Bill Withers","Al Green"]'::jsonb),
  ('''Fransız Elvis''i olarak anılan rock şarkıcısı kimdir?', 'Which rock singer was known as ''the French Elvis''?', '["Johnny Hallyday","Serge Gainsbourg","Jacques Dutronc","Michel Polnareff"]'::jsonb),
  ('Tangonun en ünlü sesi sayılan, ''Por una Cabeza''nın bestecisi olan şarkıcı kimdir?', 'Which singer, regarded as the most famous voice of tango, composed ''Por una Cabeza''?', '["Carlos Gardel","Astor Piazzolla","Aníbal Troilo","Julio Sosa"]'::jsonb),
  ('Verdi''nin ''Aida'' operasının 1871''deki dünya prömiyeri hangi şehirde yapılmıştır?', 'In which city did Verdi''s opera ''Aida'' have its world premiere in 1871?', '["Cairo","Milan","Alexandria","Istanbul"]'::jsonb),
  ('Jimi Hendrix, Janis Joplin, Jim Morrison ve Kurt Cobain kaç yaşında hayatını kaybetmiştir?', 'At what age did Jimi Hendrix, Janis Joplin, Jim Morrison and Kurt Cobain each die?', '["27","25","29","33"]'::jsonb),
  ('Johann Sebastian Bach''ın iki evliliğinden toplam kaç çocuğu olmuştur?', 'How many children did Johann Sebastian Bach have from his two marriages?', '["20","12","16","24"]'::jsonb),
  ('''Bamboléo'' ve ''Volare'' yorumlarıyla tanınan flamenko-pop grubu Gipsy Kings hangi ülkede kurulmuştur?', 'In which country was the flamenco-pop band Gipsy Kings, known for ''Bamboléo'' and ''Volare'', formed?', '["France","Spain","Portugal","Argentina"]'::jsonb),
  ('Stravinski''nin ''Bahar Ayini'' balesinin 1913''teki olaylı prömiyeri Paris''te hangi tiyatroda yapılmıştır?', 'In which Paris theatre did Stravinsky''s ''The Rite of Spring'' have its riotous premiere in 1913?', '["Théâtre des Champs-Élysées","Palais Garnier","Théâtre du Châtelet","Théâtre de l''Odéon"]'::jsonb),
  ('''We Are the World'' (1985) şarkısını Michael Jackson ile birlikte kim yazmıştır?', 'Who co-wrote ''We Are the World'' (1985) with Michael Jackson?', '["Lionel Richie","Stevie Wonder","Paul McCartney","Bob Geldof"]'::jsonb),
  ('Céline Dion 1988 Eurovision Şarkı Yarışması''nı hangi ülke adına yarışarak kazanmıştır?', 'Which country did Céline Dion represent when she won the 1988 Eurovision Song Contest?', '["Switzerland","France","Belgium","Luxembourg"]'::jsonb),
  ('2016''da Nobel Edebiyat Ödülü''ne layık görülen şarkıcı ve söz yazarı kimdir?', 'Which singer-songwriter was awarded the Nobel Prize in Literature in 2016?', '["Bob Dylan","Leonard Cohen","Paul Simon","Bruce Springsteen"]'::jsonb),
  ('2003''te Tate Modern''in Türbin Salonu''na yapay bir güneş yerleştirdiği ''Hava Projesi''nin sanatçısı kimdir?', 'Which artist installed an artificial sun in Tate Modern''s Turbine Hall for ''The Weather Project'' in 2003?', '["Olafur Eliasson","Anish Kapoor","Ai Weiwei","Louise Bourgeois"]'::jsonb),
  ('1956 tarihli ünlü ''Lounge Chair'' koltuğunu tasarlayan Amerikalı çift kimdir?', 'Which American couple designed the famous 1956 ''Lounge Chair''?', '["Charles and Ray Eames","Alvar and Aino Aalto","Josef and Anni Albers","Robert and Sonia Delaunay"]'::jsonb),
  ('2017''de açık artırmada 450 milyon dolara satılan Leonardo da Vinci''ye atfedilen tablo hangisidir?', 'Which painting attributed to Leonardo da Vinci sold at auction for 450 million dollars in 2017?', '["Salvator Mundi","Ginevra de'' Benci","La Belle Ferronnière","Leda and the Swan"]'::jsonb),
  ('Örümceği andıran ''Juicy Salif'' limon sıkacağını Alessi için tasarlayan Fransız tasarımcı kimdir?', 'Which French designer created the spider-like ''Juicy Salif'' lemon squeezer for Alessi?', '["Philippe Starck","Michael Graves","Ettore Sottsass","Alessandro Mendini"]'::jsonb),
  ('1947''de ''New Look'' koleksiyonuyla savaş sonrası kadın modasını değiştiren tasarımcı kimdir?', 'Which designer transformed post-war women''s fashion with his 1947 ''New Look'' collection?', '["Christian Dior","Coco Chanel","Cristóbal Balenciaga","Hubert de Givenchy"]'::jsonb),
  ('Roma''daki Navona Meydanı''nda bulunan ''Dört Nehir Çeşmesi''nin heykeltıraşı kimdir?', 'Who sculpted the ''Fountain of the Four Rivers'' in Rome''s Piazza Navona?', '["Gian Lorenzo Bernini","Francesco Borromini","Pietro da Cortona","Nicola Salvi"]'::jsonb),
  ('Henry Moore''un çağdaşı olan, St Ives''taki atölyesiyle bilinen İngiliz modernist kadın heykeltıraş kimdir?', 'Which English modernist sculptor, a contemporary of Henry Moore, is known for her studio in St Ives?', '["Barbara Hepworth","Rachel Whiteread","Elisabeth Frink","Louise Nevelson"]'::jsonb),
  ('Jackson Pollock''un eşi olan soyut dışavurumcu ressam kimdir?', 'Which Abstract Expressionist painter was married to Jackson Pollock?', '["Lee Krasner","Helen Frankenthaler","Joan Mitchell","Elaine de Kooning"]'::jsonb),
  ('Kuala Lumpur''daki Petronas İkiz Kuleleri''nin mimarı kimdir?', 'Who was the architect of the Petronas Twin Towers in Kuala Lumpur?', '["César Pelli","Kisho Kurokawa","Norman Foster","Ieoh Ming Pei"]'::jsonb),
  ('Pembe elbiseli bir kadının salıncakta ayakkabısını havaya fırlattığı Rokoko tablosu ''Salıncak'' kimin eseridir?', 'Who painted ''The Swing'', the Rococo picture of a woman in pink kicking off her shoe on a swing?', '["Jean-Honoré Fragonard","François Boucher","Antoine Watteau","Jacques-Louis David"]'::jsonb),
  ('Provence''lı köylüleri iskambil oynarken gösteren ''Kart Oyuncuları'' tablo dizisinin ressamı kimdir?', 'Who painted ''The Card Players'', a series showing Provençal peasants playing cards?', '["Paul Cézanne","Camille Pissarro","Gustave Caillebotte","Jean-François Millet"]'::jsonb),
  ('Frida Kahlo''nun çelik korseye sarılı ve çivilerle delinmiş bedenini gösterdiği 1944 tablosunun adı nedir?', 'What is the title of Frida Kahlo''s 1944 painting showing her body bound in a steel corset and pierced with nails?', '["The Broken Column","The Two Fridas","The Wounded Deer","Henry Ford Hospital"]'::jsonb),
  ('Van Gogh''un 1888''de Arles''da kiraladığı ve bir tablosuna da konu ettiği ev hangi adla bilinir?', 'By what name is the house Van Gogh rented in Arles in 1888, which he also painted, known?', '["The Yellow House","The Blue House","The Red House","The White House"]'::jsonb),
  ('Kolezyum''u andıran dev bir yapıyı gösteren 1563 tarihli ''Babil Kulesi'' tablosunun ressamı kimdir?', 'Who painted ''The Tower of Babel'' (1563), which shows a vast structure resembling the Colosseum?', '["Pieter Bruegel","Hieronymus Bosch","Jan van Eyck","Peter Paul Rubens"]'::jsonb),
  ('Paris''te bir çiftin sokakta öpüştüğü ''Belediye Binası Önünde Öpücük'' (1950) fotoğrafı kimindir?', 'Who took ''The Kiss by the Hôtel de Ville'' (1950), the photograph of a couple kissing in a Paris street?', '["Robert Doisneau","Henri Cartier-Bresson","Brassaï","Willy Ronis"]'::jsonb),
  ('19. yüzyıl İngiltere''sinde ''Arts and Crafts'' (Sanat ve Zanaat) hareketinin öncüsü olan tasarımcı kimdir?', 'Which designer led the Arts and Crafts movement in 19th-century England?', '["William Morris","Aubrey Beardsley","Owen Jones","Christopher Dresser"]'::jsonb),
  ('Frank Lloyd Wright''ın tasarladığı, 1923 Büyük Kanto Depremi''ni atlatan ama 1968''de yıkılan Tokyo oteli hangisidir?', 'Which Tokyo hotel designed by Frank Lloyd Wright survived the 1923 Great Kanto earthquake but was demolished in 1968?', '["Imperial Hotel","Okura Hotel","Hotel New Otani","Palace Hotel"]'::jsonb),
  ('Roma''daki Kolezyum''un özgün adı nedir?', 'What is the original name of the Colosseum in Rome?', '["The Flavian Amphitheatre","The Theatre of Marcellus","The Theatre of Pompey","The Circus Maximus"]'::jsonb),
  ('1994''te Microsoft için ''Comic Sans'' yazı karakterini tasarlayan kimdir?', 'Who designed the ''Comic Sans'' typeface for Microsoft in 1994?', '["Vincent Connare","Matthew Carter","Adrian Frutiger","Erik Spiekermann"]'::jsonb),
  ('Times New Roman yazı karakteri 1932''de ilk olarak hangi gazete için tasarlanmıştır?', 'For which newspaper was the Times New Roman typeface first designed in 1932?', '["The Times","The Guardian","The Daily Telegraph","The Observer"]'::jsonb),
  ('1924''te ''Sürrealizm Manifestosu''nu yayımlayarak akımın önderi olan Fransız yazar kimdir?', 'Which French writer published the ''Surrealist Manifesto'' in 1924 and became the movement''s leader?', '["André Breton","Tristan Tzara","Paul Éluard","Filippo Marinetti"]'::jsonb),
  ('New York''taki Brooklyn Köprüsü''nü tasarlayan ve inşaat başlamadan ölen mühendis kimdir?', 'Which engineer designed New York''s Brooklyn Bridge but died before construction began?', '["John Roebling","Othmar Ammann","Joseph Strauss","Gustave Eiffel"]'::jsonb),
  ('Futbolcu Son Heung-min hangi ülkenin milli takımında oynar?', 'Which national team does footballer Son Heung-min play for?', '["South Korea","Japan","Taiwan","North Korea"]'::jsonb),
  ('Formula 1''de sıralama turlarında en hızlı olan pilotun kazandığı ilk sıradaki çıkış konumuna ne ad verilir?', 'In Formula 1, what is the front starting spot earned by the fastest driver in qualifying called?', '["Pole position","Pit stop","Safety car","Parc fermé"]'::jsonb),
  ('Tenisçi Carlos Alcaraz hangi ülkenin sporcusudur?', 'Which country does tennis player Carlos Alcaraz represent?', '["Spain","Argentina","Italy","Portugal"]'::jsonb),
  ('Futbolcu Mohamed Salah hangi ülkenin milli takımında oynar?', 'Which national team does footballer Mohamed Salah play for?', '["Egypt","Morocco","Tunisia","Algeria"]'::jsonb),
  ('Basketbolcu Luka Dončić hangi ülkenin milli takımında oynar?', 'Which national team does basketball player Luka Dončić play for?', '["Slovenia","Serbia","Croatia","Slovakia"]'::jsonb),
  ('Basketbolcu Giannis Antetokounmpo hangi ülkenin milli takımında oynar?', 'Which national team does basketball player Giannis Antetokounmpo play for?', '["Greece","Nigeria","Albania","Bulgaria"]'::jsonb),
  ('''Kuzey Londra Derbisi'' Arsenal ile hangi takım arasında oynanır?', 'The ''North London Derby'' is played between Arsenal and which club?', '["Tottenham Hotspur","Queens Park Rangers","West Ham United","Crystal Palace"]'::jsonb),
  ('Golfte ABD ile Avrupa''nın kadın takımları arasında oynanan kupa hangisidir?', 'Which golf trophy is contested between the women''s teams of the USA and Europe?', '["Solheim Cup","Ryder Cup","Walker Cup","Presidents Cup"]'::jsonb),
  ('1988 Seul Olimpiyatları''nda başını tramplene çarpmasına rağmen altın madalya kazanan ABD''li atlayıcı kimdir?', 'Which American diver won gold at the 1988 Seoul Olympics despite hitting his head on the springboard?', '["Greg Louganis","Mark Lenzi","Dmitri Sautin","Tom Daley"]'::jsonb),
  ('Formula 1 pilotu Max Verstappen hangi ülkenin bayrağı altında yarışır?', 'Under which country''s flag does Formula 1 driver Max Verstappen race?', '["Netherlands","Belgium","Germany","Denmark"]'::jsonb),
  ('Buz hokeyi efsanesi Wayne Gretzky''nin NHL''de tüm takımlarca emekliye ayrılan forma numarası kaçtır?', 'What was Wayne Gretzky''s jersey number, retired by every team in the NHL?', '["99","66","87","9"]'::jsonb),
  ('2012 ve 2016 Olimpiyatları''nda hem 5000 hem 10.000 metrede altın madalya kazanan İngiliz atlet kimdir?', 'Which British athlete won gold in both the 5000 and 10,000 metres at the 2012 and 2016 Olympics?', '["Mo Farah","Kenenisa Bekele","Paul Tergat","Haile Gebrselassie"]'::jsonb),
  ('Futbolda adını 1974 Dünya Kupası''nda İsveç''e karşı yapılan bir çalımdan alan hareket hangi oyuncunun adını taşır?', 'The football move first made famous against Sweden at the 1974 World Cup is named after which player?', '["Johan Cruyff","Diego Maradona","Franz Beckenbauer","Gerd Müller"]'::jsonb),
  ('Formula 1 pilotu Charles Leclerc hangi ülkenin bayrağı altında yarışır?', 'Under which country''s flag does Formula 1 driver Charles Leclerc race?', '["Monaco","France","Switzerland","Belgium"]'::jsonb),
  ('1972 Münih Olimpiyatları''nda yıldızlaşan, ''Minsk''in Serçesi'' lakaplı Sovyet jimnastikçi kimdir?', 'Which Soviet gymnast, nicknamed ''the Sparrow from Minsk'', became a star at the 1972 Munich Olympics?', '["Olga Korbut","Nadia Comăneci","Larisa Latynina","Ludmilla Tourischeva"]'::jsonb),
  ('1974''ten beri kullanılan FIFA Dünya Kupası kupasını tasarlayan İtalyan heykeltıraş kimdir?', 'Which Italian sculptor designed the FIFA World Cup trophy used since 1974?', '["Silvio Gazzaniga","Abel Lafleur","Arnaldo Pomodoro","Pietro Consagra"]'::jsonb),
  ('Wimbledon''da kadınlar tekler şampiyonuna verilen gümüş tabağın adı nedir?', 'What is the name of the silver salver presented to the Wimbledon ladies'' singles champion?', '["Venus Rosewater Dish","Challenge Cup","Suzanne Lenglen Cup","Daphne Akhurst Cup"]'::jsonb),
  ('Bugün NBA şampiyonuna verilen kupanın adı nedir?', 'What is the name of the trophy awarded to the NBA champions today?', '["Larry O''Brien Trophy","Walter A. Brown Trophy","Vince Lombardi Trophy","Stanley Cup"]'::jsonb),
  ('Sırıkla atlamada 6 metreyi aşan ilk atlet olan ve onlarca kez dünya rekoru kıran Ukraynalı sporcu kimdir?', 'Which Ukrainian athlete was the first to clear 6 metres in the pole vault and broke the world record dozens of times?', '["Sergey Bubka","Renaud Lavillenie","Armand Duplantis","Rodion Gataullin"]'::jsonb),
  ('ABD Açık tenis turnuvasının bugün oynandığı kompleks New York''un hangi bölgesindedir?', 'In which area of New York is the complex where the US Open tennis tournament is played today?', '["Flushing Meadows","Forest Hills","Central Park","Coney Island"]'::jsonb),
  ('Etiyopyalı atlet Haile Gebrselassie iki olimpiyat altınını hangi mesafede kazanmıştır?', 'In which event did Ethiopian athlete Haile Gebrselassie win his two Olympic gold medals?', '["10,000 metres","5,000 metres","Marathon","3,000 metres steeplechase"]'::jsonb),
  ('Metin Erksan''ın ''Sevmek Zamanı'' (1965) filminde badanacı Halil, Meral''in neyine âşık olur?', 'In Metin Erksan''s ''Time to Love'' (1965), what does the house painter Halil fall in love with?', '["Meral''s photograph","Meral''s voice","Meral''s letters","Meral''s paintings"]'::jsonb),
  ('İstanbul''da 1969''da açılan ilk Atatürk Kültür Merkezi binasının mimarı kimdir?', 'Who was the architect of the original Atatürk Cultural Centre building in Istanbul, opened in 1969?', '["Hayati Tabanlıoğlu","Sedad Hakkı Eldem","Behruz Çinici","Turgut Cansever"]'::jsonb),
  ('Ressam Fahrelnissa Zeid''in kız kardeşi olan gravür ve resim sanatçısı kimdir?', 'Which printmaker and painter was the sister of the painter Fahrelnissa Zeid?', '["Aliye Berger","Hale Asaf","Mihri Müşfik","Eren Eyüboğlu"]'::jsonb),
  ('2004''te Bergen''de 5000 metrede dünya rekoru kıran Türk atlet kimdir?', 'Which Turkish athlete set a 5000 metres world record in Bergen in 2004?', '["Elvan Abeylegesse","Alemitu Bekele","Süreyya Ayhan","Yasemin Can"]'::jsonb)
  ) v(soru, en_soru, en_secenekler)
  join public.questions q on q.soru = v.soru and q.created_at >= transaction_timestamp()
on conflict (question_id, dil) do nothing;

-- ---------------------------------------------------- Çevrilmeyenler
insert into public.ceviri_atlanan (question_id, dil, neden, kod)
select q.id, 'en', v.neden, 'cevrilemez'
  from (values
  ('Yılmaz Erdoğan''ın ''Kelebeğin Rüyası'' (2013) filmi hangi iki genç şairin hayatını anlatır?', 'Türk filmi ve şair adları; İngilizce oyuncu için anlamsız'),
  ('Rock grubu Duman''ın solisti kimdir?', 'Türk rock müzisyenleri; İngilizce oyuncu için anlamsız'),
  ('Otomobil hırsızlarını anlatan ''Organize İşler'' (2005) filminin yönetmeni kimdir?', 'Türk komedi filmi ve yönetmenler; İngilizce oyuncu için anlamsız'),
  ('İstiklal Marşı''nın 1930''dan beri resmî olarak kullanılan bestesi kime aittir?', 'Türk ulusal marşı bestecileri; İngilizce oyuncu için anlamsız'),
  ('Galatasaray''ın efsane golcüsü olan ve ''Taçsız Kral'' lakabıyla anılan futbolcu kimdir?', 'Türkçe lakap ve Türk futbolcular; İngilizce oyuncu için anlamsız'),
  ('Cem Yılmaz''ın ''Yahşi Batı'' (2010) filminde iki Osmanlı elçisi Amerika''ya hangi amaçla gider?', 'Türk komedi filmi; İngilizce oyuncu için anlamsız'),
  ('''Adam Olacak Çocuk'' şarkısı hangi sanatçıya aittir?', 'Türkçe şarkı adı; İngilizce oyuncu için anlamsız')
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
