-- ============================================================
-- 308 — Paket 3 soru üretimi, parti 6: 100 soru · 2026-09-23
--
-- Kategori: muzik 23 · sanat 26 · sinema 26 · spor 25
-- Yerel (kapsam='yerel', ulke='TR'): 11 · zorluk 1–5: 4/11/30/35/20
-- İngilizce çeviri: 97 · çevrilmeyen (ceviri_atlanan, kod 'cevrilemez'): 3
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
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti 6 --no 308
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
('Kurosawa''nın ''Throne of Blood'' (Kumonosu-jō, 1957) filmi Shakespeare''in hangi oyunundan uyarlanmıştır?', '["Macbeth","Hamlet","Othello","Kral Lear"]'::jsonb, 0, 'sinema', 'global', null, 4),
('Sandra Bullock''un uzayda mahsur kalan bir astronotu oynadığı ''Yerçekimi'' (Gravity, 2013) filminin yönetmeni kimdir?', '["Alfonso Cuarón","Christopher Nolan","Guillermo del Toro","Denis Villeneuve"]'::jsonb, 0, 'sinema', 'global', null, 3),
('Kubrick''in ''Full Metal Jacket'' filminde eğitim çavuşu Hartman''ı, gerçekte de eski bir asker eğitmeni olan hangi oyuncu canlandırır?', '["R. Lee Ermey","Vincent D''Onofrio","Matthew Modine","Adam Baldwin"]'::jsonb, 0, 'sinema', 'global', null, 5),
('''Şeytan Marka Giyer'' (2006) filminde moda dergisi editörü Miranda Priestly''yi kim canlandırır?', '["Meryl Streep","Glenn Close","Helen Mirren","Anne Hathaway"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Warren Beatty ile Faye Dunaway''in başrolde olduğu ''Bonnie ve Clyde'' (1967) filminin yönetmeni kimdir?', '["Arthur Penn","Mike Nichols","Sam Peckinpah","Dennis Hopper"]'::jsonb, 0, 'sinema', 'global', null, 5),
('''Slumdog Milyoner'' (2008) filminin yönetmeni kimdir?', '["Danny Boyle","Mira Nair","Sam Mendes","Ang Lee"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''Wallace ve Gromit'' kil animasyonlarını üreten İngiliz stüdyosu hangisidir?', '["Aardman","Laika","Pixar","Ghibli"]'::jsonb, 0, 'sinema', 'global', null, 4),
('Christopher Nolan''ın ''Oppenheimer'' (2023) filminde J. Robert Oppenheimer''ı kim canlandırmıştır?', '["Cillian Murphy","Matt Damon","Tom Hardy","Robert Downey Jr."]'::jsonb, 0, 'sinema', 'global', null, 2),
('David Fincher''ın ''Yedi'' (Se7en, 1995) filmindeki seri katil cinayetlerini neye göre planlar?', '["Yedi ölümcül günah","On Emir","Mısır''ın on belası","Burç işaretleri"]'::jsonb, 0, 'sinema', 'global', null, 3),
('Tüm diyalogları şarkıyla söylenen ''Cherbourg Şemsiyeleri'' (1964) filminin yönetmeni kimdir?', '["Jacques Demy","Jacques Tati","Louis Malle","François Truffaut"]'::jsonb, 0, 'sinema', 'global', null, 5),
('''Kung Fu Panda'' (2008) filminde Po''yu İngilizce seslendiren oyuncu kimdir?', '["Jack Black","Seth Rogen","Ben Stiller","Adam Sandler"]'::jsonb, 0, 'sinema', 'global', null, 3),
('Dustin Hoffman''lı ''Mezun'' (1967) filminin şarkılarını hangi ikili seslendirmiştir?', '["Simon & Garfunkel","The Everly Brothers","Sonny & Cher","Hall & Oates"]'::jsonb, 0, 'sinema', 'global', null, 4),
('Peter Fonda ile başrolünü paylaştığı ''Easy Rider'' (1969) filmini kim yönetmiştir?', '["Dennis Hopper","Bob Rafelson","Monte Hellman","Hal Ashby"]'::jsonb, 0, 'sinema', 'global', null, 5),
('Anna Magnani''nin rol aldığı ''Roma, Açık Şehir'' (1945) filminin yönetmeni kimdir?', '["Roberto Rossellini","Vittorio De Sica","Luchino Visconti","Michelangelo Antonioni"]'::jsonb, 0, 'sinema', 'global', null, 4),
('1978 Oscar töreninde ''Yıldız Savaşları''nı geride bırakıp En İyi Film seçilen Woody Allen filmi hangisidir?', '["Annie Hall","Manhattan","Aşk ve Ölüm","Zelig"]'::jsonb, 0, 'sinema', 'global', null, 4),
('''Mrs. Doubtfire'' (1993) filminde Robin Williams''ın canlandırdığı baba, çocuklarının yanında olmak için kılık değiştirip ne olarak işe girer?', '["Dadı","Aşçı","Bahçıvan","Şoför"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Disney''in ''Bambi'' (1942) filminde Bambi''nin tavşan arkadaşının İngilizce adı nedir?', '["Thumper","Flower","Roger","Oswald"]'::jsonb, 0, 'sinema', 'global', null, 4),
('Kieślowski''nin ''Üç Renk'' üçlemesindeki renkler hangi ülkenin bayrağından alınmıştır?', '["Fransa","İtalya","Almanya","Belçika"]'::jsonb, 0, 'sinema', 'global', null, 3),
('Abbas Kiarostami''ye 1997''de Cannes''da Altın Palmiye kazandıran film hangisidir?', '["Kirazın Tadı","Yakın Plan","Rüzgâr Bizi Götürecek","Zeytin Ağaçları Altında"]'::jsonb, 0, 'sinema', 'global', null, 5),
('James Bond filmi ''Goldfinger''da (1964) kötü adamın yardımcısı Oddjob silah olarak neyi fırlatır?', '["Melon şapkasını","Altın tabancasını","Zehirli şemsiyesini","Çelik uçlu bastonunu"]'::jsonb, 0, 'sinema', 'global', null, 4),
('''2001: Bir Uzay Destanı''nda bilgisayar HAL 9000 kapatılırken hangi şarkıyı söyler?', '["Daisy Bell","Frère Jacques","Oh! Susanna","Mavi Tuna"]'::jsonb, 0, 'sinema', 'global', null, 4),
('Wes Anderson''ın ''Büyük Budapeşte Oteli'' (2014) filmi hangi hayali ülkede geçer?', '["Zubrowka","Freedonia","Syldavia","Latveria"]'::jsonb, 0, 'sinema', 'global', null, 5),
('John Sturges''ün ''Muhteşem Yedili'' (1960) westerni hangi Kurosawa filminin yeniden çevrimidir?', '["Yedi Samuray","Gizli Kale","Kızıl Sakal","Yojimbo"]'::jsonb, 0, 'sinema', 'global', null, 3),
('Ozu''nun ''Tokyo Hikâyesi'' (1953) filminde yaşlı çifte en içten ilgiyi gösteren dul gelin Noriko''yu kim canlandırır?', '["Setsuko Hara","Kinuyo Tanaka","Machiko Kyō","Hideko Takamine"]'::jsonb, 0, 'sinema', 'global', null, 5),
('''Titanik'' filminin şarkısı ''My Heart Will Go On''u kim seslendirmiştir?', '["Celine Dion","Whitney Houston","Shania Twain","Toni Braxton"]'::jsonb, 0, 'muzik', 'global', null, 1),
('The Police grubunun solisti ve basçısı olan Gordon Sumner hangi sahne adıyla tanınır?', '["Sting","Bono","Seal","Slash"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Vivaldi''nin uzun yıllar kız öğrencilere müzik öğrettiği Venedik yetimhanesinin adı nedir?', '["Ospedale della Pietà","Scuola di San Rocco","Teatro La Fenice","Santa Maria Novella"]'::jsonb, 0, 'muzik', 'global', null, 5),
('Andrew Lloyd Webber ile Tim Rice''ın ''Evita'' müzikali kimin hayatını anlatır?', '["Eva Peron","Edith Piaf","Frida Kahlo","Grace Kelly"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Coldplay grubunun solisti kimdir?', '["Chris Martin","Thom Yorke","Brandon Flowers","Matt Bellamy"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Musorgski''nin ''Bir Sergiden Tablolar''ı hangi ressam dostunun ölümünden sonra açılan sergiden esinlenmiştir?', '["Viktor Hartmann","İlya Repin","İvan Ayvazovski","Vasili Kandinski"]'::jsonb, 0, 'muzik', 'global', null, 5),
('''Vesti la giubba'' aryasını içeren, palyaço Canio''nun trajedisini anlatan opera hangisidir?', '["Pagliacci","Rigoletto","Tosca","Cavalleria rusticana"]'::jsonb, 0, 'muzik', 'global', null, 4),
('''Mamma Mia!'' müzikali hangi grubun şarkıları üzerine kurulmuştur?', '["ABBA","Bee Gees","Boney M.","Roxette"]'::jsonb, 0, 'muzik', 'global', null, 1),
('''All I Want for Christmas Is You'' (1994) şarkısını kim seslendirmiştir?', '["Mariah Carey","Whitney Houston","Celine Dion","Christina Aguilera"]'::jsonb, 0, 'muzik', 'global', null, 1),
('Justin Bieber hangi ülkede doğmuştur?', '["Kanada","ABD","İngiltere","Avustralya"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''I Want It That Way'' (1999) şarkısı hangi erkek grubuna aittir?', '["Backstreet Boys","New Kids on the Block","Boyz II Men","Take That"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Both Sides, Now'' ve ''Big Yellow Taxi'' şarkılarını yazan Kanadalı müzisyen kimdir?', '["Joni Mitchell","Carole King","Joan Baez","Carly Simon"]'::jsonb, 0, 'muzik', 'global', null, 4),
('Lin-Manuel Miranda''nın hip hop ağırlıklı ünlü müzikali hangi ABD kurucu babasının hayatını anlatır?', '["Alexander Hamilton","Thomas Jefferson","Benjamin Franklin","John Adams"]'::jsonb, 0, 'muzik', 'global', null, 3),
('''Blinding Lights'' şarkısıyla tanınan Kanadalı şarkıcı kimdir?', '["The Weeknd","Drake","Shawn Mendes","Michael Bublé"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Adele''in ''Rolling in the Deep'' ve ''Someone Like You'' şarkılarını içeren 2011 albümünün adı nedir?', '["21","19","25","30"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Harry Styles''ın da üyesi olduğu One Direction grubu hangi yarışma programında bir araya getirilmiştir?', '["The X Factor","Pop Idol","The Voice","Britain''s Got Talent"]'::jsonb, 0, 'muzik', 'global', null, 3),
('The Doors''un solisti Jim Morrison hangi şehirdeki Père Lachaise Mezarlığı''na gömülüdür?', '["Paris","Los Angeles","New York","Londra"]'::jsonb, 0, 'muzik', 'global', null, 3),
('U2''nin solisti Bono''nun gerçek adı nedir?', '["Paul Hewson","David Evans","Adam Clayton","Larry Mullen"]'::jsonb, 0, 'muzik', 'global', null, 4),
('Deep Purple''ın ''Smoke on the Water'' şarkısı hangi İsviçre kentinde bir gazinonun yanmasını anlatır?', '["Montrö","Cenevre","Lozan","Zürih"]'::jsonb, 0, 'muzik', 'global', null, 4),
('Bob Geldof ile Midge Ure''un 1984''te Etiyopya''daki kıtlık için kurduğu, ''Do They Know It''s Christmas?'' şarkısını seslendiren topluluk hangisidir?', '["Band Aid","USA for Africa","Farm Aid","Artists United"]'::jsonb, 0, 'muzik', 'global', null, 4),
('Dokuz senfonisiyle tanınan ve St. Florian Manastırı''ndaki orgun altına gömülen Avusturyalı besteci kimdir?', '["Anton Bruckner","Gustav Mahler","Hugo Wolf","Franz Schubert"]'::jsonb, 0, 'muzik', 'global', null, 5),
('Metronomun patentini 1815''te alan ve Beethoven''ın dostu olan mucit kimdir?', '["Johann Maelzel","Anton Diabelli","Carl Czerny","Ignaz Pleyel"]'::jsonb, 0, 'muzik', 'global', null, 5),
('1985''te National Geographic kapağında yer alan yeşil gözlü ''Afgan Kız'' fotoğrafını kim çekmiştir?', '["Steve McCurry","Sebastião Salgado","James Nachtwey","Annie Leibovitz"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Marcel Duchamp 1919''da ''L.H.O.O.Q.'' adını verdiği yapıtta hangi tablonun kartpostalına bıyık çizmiştir?', '["Mona Lisa","Son Akşam Yemeği","Yıldızlı Gece","Çığlık"]'::jsonb, 0, 'sanat', 'global', null, 3),
('''Nereden Geliyoruz? Neyiz? Nereye Gidiyoruz?'' adlı büyük tablo hangi ressamın Tahiti döneminde yapılmıştır?', '["Paul Gauguin","Henri Matisse","Henri Rousseau","Paul Cézanne"]'::jsonb, 0, 'sanat', 'global', null, 3),
('Pennsylvania''da bir şelalenin üzerine kurulan ''Fallingwater'' konutunun mimarı kimdir?', '["Frank Lloyd Wright","Le Corbusier","Mies van der Rohe","Louis Kahn"]'::jsonb, 0, 'sanat', 'global', null, 3),
('1957''de İsviçre''de Max Miedinger ile Eduard Hoffmann''ın tasarladığı, dünyanın en yaygın yazı karakterlerinden biri hangisidir?', '["Helvetica","Futura","Garamond","Times New Roman"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Jacques-Louis David''in 1793 tarihli tablosunda küvette öldürülmüş olarak gösterilen devrimci kimdir?', '["Jean-Paul Marat","Maximilien Robespierre","Georges Danton","Louis de Saint-Just"]'::jsonb, 0, 'sanat', 'global', null, 4),
('İstanbul''daki Ayasofya''nın 6. yüzyıldaki mimarları kimlerdir?', '["Anthemios ve İsidoros","İktinos ve Kallikrates","Vitruvius ve Agrippa","Apollodoros ve Hadrianus"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Portre ressamı Lucian Freud hangi ünlü kişinin torunudur?', '["Sigmund Freud","Gustav Mahler","Albert Einstein","Ludwig Wittgenstein"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Dubai''deki Burç Halife gökdelenini tasarlayan mimar kimdir?', '["Adrian Smith","Norman Foster","César Pelli","Zaha Hadid"]'::jsonb, 0, 'sanat', 'global', null, 5),
('1977''de ''I ♥ NY'' logosunu tasarlayan grafik tasarımcı kimdir?', '["Milton Glaser","Paul Rand","Saul Bass","Massimo Vignelli"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Claude Monet''nin nilüferli bahçesini ve Japon köprüsünü resmettiği evi hangi köydedir?', '["Giverny","Argenteuil","Barbizon","Auvers-sur-Oise"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Velázquez''in ''Nedimeler'' (Las Meninas) tablosunda arka duvardaki aynada kimlerin yansıması görünür?', '["Kral ve kraliçe","Ressamın anne babası","Papa ve kardinal","Prenses ve dadısı"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Arkasındaki aynada kalabalık salonun yansıdığı bir barmeni gösteren ''Folies-Bergère''de Bir Bar'' kimin eseridir?', '["Édouard Manet","Edgar Degas","Auguste Renoir","Georges Seurat"]'::jsonb, 0, 'sanat', 'global', null, 4),
('İngiltere Kralı I. Charles''ın saray ressamı olan, kralı üç yönden gösteren portreyi yapan Flaman ressam kimdir?', '["Anthony van Dyck","Peter Paul Rubens","Jacob Jordaens","Peter Lely"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Picasso''nun ''Guernica'' tablosu bugün hangi müzede sergilenmektedir?', '["Reina Sofía","Museo del Prado","Pompidou Merkezi","Picasso Müzesi"]'::jsonb, 0, 'sanat', 'global', null, 4),
('İngiltere Kralı VIII. Henry''nin saray ressamı olarak kralın ünlü portresini yapan Alman ressam kimdir?', '["Hans Holbein","Albrecht Dürer","Lucas Cranach","Anthony van Dyck"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Frida Kahlo''nun ömür boyu acı çekmesine yol açan 1925''teki olay neydi?', '["Bir otobüs kazası","Bir ev yangını","Bir at kazası","Bir deprem"]'::jsonb, 0, 'sanat', 'global', null, 3),
('John Singer Sargent''ın 1884 Paris Salonu''nda skandal yaratan kadın portresi hangi adla bilinir?', '["Madam X","Olympia","Kırmızılı Kadın","Mavi Hanım"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Michelangelo''nun Sistina Şapeli''nin sunak duvarına yaptığı dev fresk hangisidir?', '["Son Yargı","Âdem''in Yaratılışı","Atina Okulu","Son Akşam Yemeği"]'::jsonb, 0, 'sanat', 'global', null, 3),
('Botticelli''nin ''Venüs''ün Doğuşu'' tablosunda Venüs neyin üzerinde kıyıya gelir?', '["Deniz kabuğu","Yunus sırtı","Ahşap sal","Kuğu sırtı"]'::jsonb, 0, 'sanat', 'global', null, 2),
('New York''taki Özgürlük Heykeli''nin iç demir iskeletini tasarlayan mühendis kimdir?', '["Gustave Eiffel","Frédéric Bartholdi","John Roebling","Ferdinand de Lesseps"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Degas''nın ''On Dört Yaşındaki Küçük Dansçı'' heykelinin 1881''de olay yaratan özelliği neydi?', '["Gerçek tül etek giymesi","Altın varakla kaplanmış olması","Hareketli kollara sahip olması","Mermerden oyulmuş olması"]'::jsonb, 0, 'sanat', 'global', null, 5),
('''Kara Panter'' lakaplı, 1966 Dünya Kupası''nın gol kralı olan Portekizli futbolcu kimdir?', '["Eusébio","Luís Figo","Mário Coluna","Cristiano Ronaldo"]'::jsonb, 0, 'spor', 'global', null, 4),
('LeBron James NBA kariyerine hangi takımda başlamıştır?', '["Cleveland Cavaliers","Miami Heat","Los Angeles Lakers","Chicago Bulls"]'::jsonb, 0, 'spor', 'global', null, 3),
('Arsenal''i 1996-2018 arasında 22 yıl çalıştıran Fransız teknik direktör kimdir?', '["Arsène Wenger","Gérard Houllier","Didier Deschamps","Aimé Jacquet"]'::jsonb, 0, 'spor', 'global', null, 3),
('Çocukken çocuk felci geçirmesine rağmen 1960 Roma Olimpiyatları''nda üç altın madalya kazanan Amerikalı atlet kimdir?', '["Wilma Rudolph","Jackie Joyner-Kersee","Babe Didrikson","Evelyn Ashford"]'::jsonb, 0, 'spor', 'global', null, 4),
('2004''te Chelsea''ye geldiğinde kendini ''Special One'' (Özel Biri) olarak tanıtan teknik direktör kimdir?', '["José Mourinho","Carlo Ancelotti","Claudio Ranieri","Rafael Benítez"]'::jsonb, 0, 'spor', 'global', null, 2),
('Tenisçi Roger Federer hangi ülkenin sporcusudur?', '["İsviçre","Avusturya","Almanya","İsveç"]'::jsonb, 0, 'spor', 'global', null, 1),
('1985''te henüz 17 yaşındayken Wimbledon erkekler tekler şampiyonu olan Alman tenisçi kimdir?', '["Boris Becker","Michael Stich","Tommy Haas","Nicolas Kiefer"]'::jsonb, 0, 'spor', 'global', null, 4),
('Dallas Mavericks''i 2011''de NBA şampiyonluğuna taşıyıp finallerin en değerli oyuncusu seçilen basketbolcu kimdir?', '["Dirk Nowitzki","Jason Kidd","LeBron James","Dwyane Wade"]'::jsonb, 0, 'spor', 'global', null, 3),
('1950''lerde beş Formula 1 dünya şampiyonluğu kazanan Arjantinli pilot kimdir?', '["Juan Manuel Fangio","Alberto Ascari","Stirling Moss","Froilán González"]'::jsonb, 0, 'spor', 'global', null, 4),
('Lewis Hamilton ilk Formula 1 dünya şampiyonluğunu 2008''de hangi takımla kazanmıştır?', '["McLaren","Mercedes","Ferrari","Williams"]'::jsonb, 0, 'spor', 'global', null, 3),
('Tekler kategorisinde 23 Grand Slam şampiyonluğuyla 2022''de tenisi bırakan Amerikalı oyuncu kimdir?', '["Serena Williams","Venus Williams","Lindsay Davenport","Chris Evert"]'::jsonb, 0, 'spor', 'global', null, 3),
('2014''te Brezilya''ya attığı golle Dünya Kupası''ndaki toplam gol sayısını 16''ya çıkaran Alman futbolcu kimdir?', '["Miroslav Klose","Lukas Podolski","Thomas Müller","Jürgen Klinsmann"]'::jsonb, 0, 'spor', 'global', null, 3),
('Manchester United''ı 1986-2013 arasında çalıştıran İskoç teknik direktör kimdir?', '["Alex Ferguson","Matt Busby","Kenny Dalglish","Bill Shankly"]'::jsonb, 0, 'spor', 'global', null, 2),
('Ayrton Senna''nın McLaren''daki takım arkadaşı ve en büyük rakibi olan Fransız pilot kimdir?', '["Alain Prost","Jean Alesi","René Arnoux","Didier Pironi"]'::jsonb, 0, 'spor', 'global', null, 3),
('Wimbledon''da hakeme ''You cannot be serious!'' diye bağırmasıyla ünlenen Amerikalı tenisçi kimdir?', '["John McEnroe","Jimmy Connors","Andre Agassi","Pete Sampras"]'::jsonb, 0, 'spor', 'global', null, 3),
('1988''de 100 metrede 10,49 saniyelik dünya rekorunu koşan kadın atlet kimdir?', '["Florence Griffith-Joyner","Jackie Joyner-Kersee","Evelyn Ashford","Shelly-Ann Fraser-Pryce"]'::jsonb, 0, 'spor', 'global', null, 4),
('Michael Jordan 1993''teki ilk emekliliğinin ardından hangi sporda profesyonel olarak oynamıştır?', '["Beyzbol","Amerikan futbolu","Golf","Buz hokeyi"]'::jsonb, 0, 'spor', 'global', null, 3),
('2003 Londra Maratonu''nda 2:15:25''lik derecesiyle uzun yıllar dünya rekorunu elinde tutan İngiliz atlet kimdir?', '["Paula Radcliffe","Kelly Holmes","Jessica Ennis","Liz McColgan"]'::jsonb, 0, 'spor', 'global', null, 4),
('''Thorpedo'' lakabıyla anılan Avustralyalı yüzücü kimdir?', '["Ian Thorpe","Grant Hackett","Kieren Perkins","Michael Klim"]'::jsonb, 0, 'spor', 'global', null, 4),
('1948 Londra Olimpiyatları''nda dört altın madalya kazanan, ''Uçan Ev Kadını'' lakaplı atlet kimdir?', '["Fanny Blankers-Koen","Babe Didrikson Zaharias","Betty Cuthbert","Shirley Strickland"]'::jsonb, 0, 'spor', 'global', null, 4),
('Tenisçi Novak Djokovic hangi ülkenin sporcusudur?', '["Sırbistan","Hırvatistan","Karadağ","Slovenya"]'::jsonb, 0, 'spor', 'global', null, 2),
('Milli futbolcu Arda Güler 2023''te Fenerbahçe''den hangi kulübe transfer olmuştur?', '["Real Madrid","Barcelona","Bayern Münih","Manchester City"]'::jsonb, 0, 'spor', 'yerel', 'TR', 3),
('Ankara''daki Anıtkabir''in uygulanan projesini tasarlayan mimarlar kimlerdir?', '["Emin Onat ve Orhan Arda","Sedad Hakkı Eldem ve Paul Bonatz","Bruno Taut ve Seyfi Arkan","Vedat Tek ve Mimar Kemaleddin"]'::jsonb, 0, 'sanat', 'yerel', 'TR', 4),
('II. Bayezid''in hat hocası olan ve ''hattatların kıblesi'' diye anılan Osmanlı hattatı kimdir?', '["Şeyh Hamdullah","Hafız Osman","Ahmed Karahisari","Mustafa Rakım"]'::jsonb, 0, 'sanat', 'yerel', 'TR', 4),
('''Bozkırın Tezenesi'' lakabıyla anılan halk müziği ustası kimdir?', '["Neşet Ertaş","Âşık Veysel","Mahzuni Şerif","Arif Sağ"]'::jsonb, 0, 'muzik', 'yerel', 'TR', 3),
('2016''da İstanbul Cup''ı kazanarak WTA tekler şampiyonluğu kazanan ilk Türk kadın tenisçi kimdir?', '["Çağla Büyükakçay","Başak Eraydın","Pemra Özgen","Zeynep Sönmez"]'::jsonb, 0, 'spor', 'yerel', 'TR', 5),
('Şener Şen''in başrolde olduğu ''Züğürt Ağa'' (1985) filminin yönetmeni kimdir?', '["Nesli Çölgeçen","Yavuz Turgul","Ertem Eğilmez","Kartal Tibet"]'::jsonb, 0, 'sinema', 'yerel', 'TR', 5),
('Cem Yılmaz''ın ''G.O.R.A.'' (2004) filminde uzaylılarca kaçırılan halı satıcısının adı nedir?', '["Arif","Erşan","Faruk","Kemal"]'::jsonb, 0, 'sinema', 'yerel', 'TR', 3),
('Türkiye A Milli Futbol Takımı Euro 2008''de yarı finalde hangi ülkeye elenmiştir?', '["Almanya","Hollanda","Rusya","Hırvatistan"]'::jsonb, 0, 'spor', 'yerel', 'TR', 3),
('Türkiye''ye ilk olimpiyat altın madalyasını 1936 Berlin Olimpiyatları''nda kazandıran güreşçi kimdir?', '["Yaşar Erkan","Yaşar Doğu","Hamit Kaplan","Mahmut Atalay"]'::jsonb, 0, 'spor', 'yerel', 'TR', 5),
('16. yüzyılda ''Hünername'' ve ''Şehnâme-i Selim Han'' minyatürlerini yapan saray nakkaşı kimdir?', '["Nakkaş Osman","Kara Memi","Matrakçı Nasuh","Nigâri"]'::jsonb, 0, 'sanat', 'yerel', 'TR', 5),
('İstanbul Sirkeci''deki Büyük Postane binasının (1909) mimarı kimdir?', '["Vedat Tek","Mimar Kemaleddin","Alexandre Vallaury","Giulio Mongeri"]'::jsonb, 0, 'sanat', 'yerel', 'TR', 5)
on conflict (soru) do nothing;

-- ---------------------------------------------------- İngilizce çeviri
insert into public.question_translations (question_id, dil, soru, secenekler)
select q.id, 'en', v.en_soru, v.en_secenekler
  from (values
  ('Kurosawa''nın ''Throne of Blood'' (Kumonosu-jō, 1957) filmi Shakespeare''in hangi oyunundan uyarlanmıştır?', 'Kurosawa''s ''Throne of Blood'' (1957) is adapted from which Shakespeare play?', '["Macbeth","Hamlet","Othello","King Lear"]'::jsonb),
  ('Sandra Bullock''un uzayda mahsur kalan bir astronotu oynadığı ''Yerçekimi'' (Gravity, 2013) filminin yönetmeni kimdir?', 'Who directed ''Gravity'' (2013), in which Sandra Bullock plays an astronaut stranded in space?', '["Alfonso Cuarón","Christopher Nolan","Guillermo del Toro","Denis Villeneuve"]'::jsonb),
  ('Kubrick''in ''Full Metal Jacket'' filminde eğitim çavuşu Hartman''ı, gerçekte de eski bir asker eğitmeni olan hangi oyuncu canlandırır?', 'In Kubrick''s ''Full Metal Jacket'', which actor, himself a former military drill instructor, plays Gunnery Sergeant Hartman?', '["R. Lee Ermey","Vincent D''Onofrio","Matthew Modine","Adam Baldwin"]'::jsonb),
  ('''Şeytan Marka Giyer'' (2006) filminde moda dergisi editörü Miranda Priestly''yi kim canlandırır?', 'In ''The Devil Wears Prada'' (2006), who plays the fashion magazine editor Miranda Priestly?', '["Meryl Streep","Glenn Close","Helen Mirren","Anne Hathaway"]'::jsonb),
  ('Warren Beatty ile Faye Dunaway''in başrolde olduğu ''Bonnie ve Clyde'' (1967) filminin yönetmeni kimdir?', 'Who directed ''Bonnie and Clyde'' (1967), starring Warren Beatty and Faye Dunaway?', '["Arthur Penn","Mike Nichols","Sam Peckinpah","Dennis Hopper"]'::jsonb),
  ('''Slumdog Milyoner'' (2008) filminin yönetmeni kimdir?', 'Who directed ''Slumdog Millionaire'' (2008)?', '["Danny Boyle","Mira Nair","Sam Mendes","Ang Lee"]'::jsonb),
  ('''Wallace ve Gromit'' kil animasyonlarını üreten İngiliz stüdyosu hangisidir?', 'Which British studio makes the ''Wallace & Gromit'' clay animations?', '["Aardman","Laika","Pixar","Ghibli"]'::jsonb),
  ('Christopher Nolan''ın ''Oppenheimer'' (2023) filminde J. Robert Oppenheimer''ı kim canlandırmıştır?', 'Who plays J. Robert Oppenheimer in Christopher Nolan''s ''Oppenheimer'' (2023)?', '["Cillian Murphy","Matt Damon","Tom Hardy","Robert Downey Jr."]'::jsonb),
  ('David Fincher''ın ''Yedi'' (Se7en, 1995) filmindeki seri katil cinayetlerini neye göre planlar?', 'In David Fincher''s ''Se7en'' (1995), what does the serial killer base his murders on?', '["The seven deadly sins","The Ten Commandments","The ten plagues of Egypt","The signs of the zodiac"]'::jsonb),
  ('Tüm diyalogları şarkıyla söylenen ''Cherbourg Şemsiyeleri'' (1964) filminin yönetmeni kimdir?', 'Who directed ''The Umbrellas of Cherbourg'' (1964), in which all the dialogue is sung?', '["Jacques Demy","Jacques Tati","Louis Malle","François Truffaut"]'::jsonb),
  ('''Kung Fu Panda'' (2008) filminde Po''yu İngilizce seslendiren oyuncu kimdir?', 'Who voices Po in ''Kung Fu Panda'' (2008)?', '["Jack Black","Seth Rogen","Ben Stiller","Adam Sandler"]'::jsonb),
  ('Dustin Hoffman''lı ''Mezun'' (1967) filminin şarkılarını hangi ikili seslendirmiştir?', 'Which duo performed the songs in ''The Graduate'' (1967), starring Dustin Hoffman?', '["Simon & Garfunkel","The Everly Brothers","Sonny & Cher","Hall & Oates"]'::jsonb),
  ('Peter Fonda ile başrolünü paylaştığı ''Easy Rider'' (1969) filmini kim yönetmiştir?', 'Who directed ''Easy Rider'' (1969), in which he co-starred with Peter Fonda?', '["Dennis Hopper","Bob Rafelson","Monte Hellman","Hal Ashby"]'::jsonb),
  ('Anna Magnani''nin rol aldığı ''Roma, Açık Şehir'' (1945) filminin yönetmeni kimdir?', 'Who directed ''Rome, Open City'' (1945), starring Anna Magnani?', '["Roberto Rossellini","Vittorio De Sica","Luchino Visconti","Michelangelo Antonioni"]'::jsonb),
  ('1978 Oscar töreninde ''Yıldız Savaşları''nı geride bırakıp En İyi Film seçilen Woody Allen filmi hangisidir?', 'Which Woody Allen film beat ''Star Wars'' to win Best Picture at the 1978 Academy Awards?', '["Annie Hall","Manhattan","Love and Death","Zelig"]'::jsonb),
  ('''Mrs. Doubtfire'' (1993) filminde Robin Williams''ın canlandırdığı baba, çocuklarının yanında olmak için kılık değiştirip ne olarak işe girer?', 'In ''Mrs. Doubtfire'' (1993), the father played by Robin Williams disguises himself and takes a job as what to be near his children?', '["Nanny","Cook","Gardener","Chauffeur"]'::jsonb),
  ('Disney''in ''Bambi'' (1942) filminde Bambi''nin tavşan arkadaşının İngilizce adı nedir?', 'In Disney''s ''Bambi'' (1942), what is the name of Bambi''s rabbit friend?', '["Thumper","Flower","Roger","Oswald"]'::jsonb),
  ('Kieślowski''nin ''Üç Renk'' üçlemesindeki renkler hangi ülkenin bayrağından alınmıştır?', 'The colours in Kieślowski''s ''Three Colours'' trilogy are taken from which country''s flag?', '["France","Italy","Germany","Belgium"]'::jsonb),
  ('Abbas Kiarostami''ye 1997''de Cannes''da Altın Palmiye kazandıran film hangisidir?', 'Which film won Abbas Kiarostami the Palme d''Or at Cannes in 1997?', '["Taste of Cherry","Close-Up","The Wind Will Carry Us","Through the Olive Trees"]'::jsonb),
  ('James Bond filmi ''Goldfinger''da (1964) kötü adamın yardımcısı Oddjob silah olarak neyi fırlatır?', 'In the James Bond film ''Goldfinger'' (1964), what does the villain''s henchman Oddjob throw as a weapon?', '["His bowler hat","His golden gun","His poisoned umbrella","His steel-tipped cane"]'::jsonb),
  ('''2001: Bir Uzay Destanı''nda bilgisayar HAL 9000 kapatılırken hangi şarkıyı söyler?', 'In ''2001: A Space Odyssey'', which song does the computer HAL 9000 sing as it is being shut down?', '["Daisy Bell","Frère Jacques","Oh! Susanna","The Blue Danube"]'::jsonb),
  ('Wes Anderson''ın ''Büyük Budapeşte Oteli'' (2014) filmi hangi hayali ülkede geçer?', 'In which fictional country is Wes Anderson''s ''The Grand Budapest Hotel'' (2014) set?', '["Zubrowka","Freedonia","Syldavia","Latveria"]'::jsonb),
  ('John Sturges''ün ''Muhteşem Yedili'' (1960) westerni hangi Kurosawa filminin yeniden çevrimidir?', 'John Sturges''s western ''The Magnificent Seven'' (1960) is a remake of which Kurosawa film?', '["Seven Samurai","The Hidden Fortress","Red Beard","Yojimbo"]'::jsonb),
  ('Ozu''nun ''Tokyo Hikâyesi'' (1953) filminde yaşlı çifte en içten ilgiyi gösteren dul gelin Noriko''yu kim canlandırır?', 'In Ozu''s ''Tokyo Story'' (1953), who plays Noriko, the widowed daughter-in-law who treats the elderly couple most kindly?', '["Setsuko Hara","Kinuyo Tanaka","Machiko Kyō","Hideko Takamine"]'::jsonb),
  ('''Titanik'' filminin şarkısı ''My Heart Will Go On''u kim seslendirmiştir?', 'Who sang ''My Heart Will Go On'', the song from the film ''Titanic''?', '["Celine Dion","Whitney Houston","Shania Twain","Toni Braxton"]'::jsonb),
  ('The Police grubunun solisti ve basçısı olan Gordon Sumner hangi sahne adıyla tanınır?', 'Gordon Sumner, singer and bassist of The Police, is known by which stage name?', '["Sting","Bono","Seal","Slash"]'::jsonb),
  ('Vivaldi''nin uzun yıllar kız öğrencilere müzik öğrettiği Venedik yetimhanesinin adı nedir?', 'What was the name of the Venetian orphanage where Vivaldi taught music to girls for many years?', '["Ospedale della Pietà","Scuola di San Rocco","Teatro La Fenice","Santa Maria Novella"]'::jsonb),
  ('Andrew Lloyd Webber ile Tim Rice''ın ''Evita'' müzikali kimin hayatını anlatır?', 'Whose life does Andrew Lloyd Webber and Tim Rice''s musical ''Evita'' tell?', '["Eva Perón","Edith Piaf","Frida Kahlo","Grace Kelly"]'::jsonb),
  ('Coldplay grubunun solisti kimdir?', 'Who is the lead singer of Coldplay?', '["Chris Martin","Thom Yorke","Brandon Flowers","Matt Bellamy"]'::jsonb),
  ('Musorgski''nin ''Bir Sergiden Tablolar''ı hangi ressam dostunun ölümünden sonra açılan sergiden esinlenmiştir?', 'Mussorgsky''s ''Pictures at an Exhibition'' was inspired by a memorial exhibition of which artist friend?', '["Viktor Hartmann","Ilya Repin","Ivan Aivazovsky","Wassily Kandinsky"]'::jsonb),
  ('''Vesti la giubba'' aryasını içeren, palyaço Canio''nun trajedisini anlatan opera hangisidir?', 'Which opera, featuring the aria ''Vesti la giubba'', tells the tragedy of the clown Canio?', '["Pagliacci","Rigoletto","Tosca","Cavalleria rusticana"]'::jsonb),
  ('''Mamma Mia!'' müzikali hangi grubun şarkıları üzerine kurulmuştur?', 'The musical ''Mamma Mia!'' is built around the songs of which group?', '["ABBA","Bee Gees","Boney M.","Roxette"]'::jsonb),
  ('''All I Want for Christmas Is You'' (1994) şarkısını kim seslendirmiştir?', 'Who sang ''All I Want for Christmas Is You'' (1994)?', '["Mariah Carey","Whitney Houston","Celine Dion","Christina Aguilera"]'::jsonb),
  ('Justin Bieber hangi ülkede doğmuştur?', 'In which country was Justin Bieber born?', '["Canada","USA","England","Australia"]'::jsonb),
  ('''I Want It That Way'' (1999) şarkısı hangi erkek grubuna aittir?', 'Which boy band recorded ''I Want It That Way'' (1999)?', '["Backstreet Boys","New Kids on the Block","Boyz II Men","Take That"]'::jsonb),
  ('''Both Sides, Now'' ve ''Big Yellow Taxi'' şarkılarını yazan Kanadalı müzisyen kimdir?', 'Which Canadian musician wrote the songs ''Both Sides, Now'' and ''Big Yellow Taxi''?', '["Joni Mitchell","Carole King","Joan Baez","Carly Simon"]'::jsonb),
  ('Lin-Manuel Miranda''nın hip hop ağırlıklı ünlü müzikali hangi ABD kurucu babasının hayatını anlatır?', 'Lin-Manuel Miranda''s famous hip-hop-driven musical tells the life of which US Founding Father?', '["Alexander Hamilton","Thomas Jefferson","Benjamin Franklin","John Adams"]'::jsonb),
  ('''Blinding Lights'' şarkısıyla tanınan Kanadalı şarkıcı kimdir?', 'Which Canadian singer is known for the song ''Blinding Lights''?', '["The Weeknd","Drake","Shawn Mendes","Michael Bublé"]'::jsonb),
  ('Adele''in ''Rolling in the Deep'' ve ''Someone Like You'' şarkılarını içeren 2011 albümünün adı nedir?', 'What is the title of Adele''s 2011 album featuring ''Rolling in the Deep'' and ''Someone Like You''?', '["21","19","25","30"]'::jsonb),
  ('Harry Styles''ın da üyesi olduğu One Direction grubu hangi yarışma programında bir araya getirilmiştir?', 'On which talent show was One Direction, the band that included Harry Styles, put together?', '["The X Factor","Pop Idol","The Voice","Britain''s Got Talent"]'::jsonb),
  ('The Doors''un solisti Jim Morrison hangi şehirdeki Père Lachaise Mezarlığı''na gömülüdür?', 'The Doors'' singer Jim Morrison is buried in Père Lachaise Cemetery in which city?', '["Paris","Los Angeles","New York","London"]'::jsonb),
  ('U2''nin solisti Bono''nun gerçek adı nedir?', 'What is the real name of U2''s singer Bono?', '["Paul Hewson","David Evans","Adam Clayton","Larry Mullen"]'::jsonb),
  ('Deep Purple''ın ''Smoke on the Water'' şarkısı hangi İsviçre kentinde bir gazinonun yanmasını anlatır?', 'Deep Purple''s ''Smoke on the Water'' describes a casino burning down in which Swiss town?', '["Montreux","Geneva","Lausanne","Zurich"]'::jsonb),
  ('Bob Geldof ile Midge Ure''un 1984''te Etiyopya''daki kıtlık için kurduğu, ''Do They Know It''s Christmas?'' şarkısını seslendiren topluluk hangisidir?', 'Which charity supergroup, formed by Bob Geldof and Midge Ure in 1984 for the Ethiopian famine, recorded ''Do They Know It''s Christmas?''?', '["Band Aid","USA for Africa","Farm Aid","Artists United"]'::jsonb),
  ('Dokuz senfonisiyle tanınan ve St. Florian Manastırı''ndaki orgun altına gömülen Avusturyalı besteci kimdir?', 'Which Austrian composer, known for his nine symphonies, is buried beneath the organ of St. Florian Monastery?', '["Anton Bruckner","Gustav Mahler","Hugo Wolf","Franz Schubert"]'::jsonb),
  ('Metronomun patentini 1815''te alan ve Beethoven''ın dostu olan mucit kimdir?', 'Which inventor, a friend of Beethoven, patented the metronome in 1815?', '["Johann Maelzel","Anton Diabelli","Carl Czerny","Ignaz Pleyel"]'::jsonb),
  ('1985''te National Geographic kapağında yer alan yeşil gözlü ''Afgan Kız'' fotoğrafını kim çekmiştir?', 'Who took the photograph of the green-eyed ''Afghan Girl'' that appeared on the cover of National Geographic in 1985?', '["Steve McCurry","Sebastião Salgado","James Nachtwey","Annie Leibovitz"]'::jsonb),
  ('Marcel Duchamp 1919''da ''L.H.O.O.Q.'' adını verdiği yapıtta hangi tablonun kartpostalına bıyık çizmiştir?', 'In his 1919 work ''L.H.O.O.Q.'', Marcel Duchamp drew a moustache on a postcard of which painting?', '["Mona Lisa","The Last Supper","The Starry Night","The Scream"]'::jsonb),
  ('''Nereden Geliyoruz? Neyiz? Nereye Gidiyoruz?'' adlı büyük tablo hangi ressamın Tahiti döneminde yapılmıştır?', 'The large painting ''Where Do We Come From? What Are We? Where Are We Going?'' was made during which painter''s Tahiti period?', '["Paul Gauguin","Henri Matisse","Henri Rousseau","Paul Cézanne"]'::jsonb),
  ('Pennsylvania''da bir şelalenin üzerine kurulan ''Fallingwater'' konutunun mimarı kimdir?', 'Who was the architect of ''Fallingwater'', the house built over a waterfall in Pennsylvania?', '["Frank Lloyd Wright","Le Corbusier","Mies van der Rohe","Louis Kahn"]'::jsonb),
  ('1957''de İsviçre''de Max Miedinger ile Eduard Hoffmann''ın tasarladığı, dünyanın en yaygın yazı karakterlerinden biri hangisidir?', 'Which typeface, one of the most widely used in the world, was designed in Switzerland in 1957 by Max Miedinger and Eduard Hoffmann?', '["Helvetica","Futura","Garamond","Times New Roman"]'::jsonb),
  ('Jacques-Louis David''in 1793 tarihli tablosunda küvette öldürülmüş olarak gösterilen devrimci kimdir?', 'Which revolutionary is shown murdered in his bathtub in Jacques-Louis David''s painting of 1793?', '["Jean-Paul Marat","Maximilien Robespierre","Georges Danton","Louis de Saint-Just"]'::jsonb),
  ('İstanbul''daki Ayasofya''nın 6. yüzyıldaki mimarları kimlerdir?', 'Who were the 6th-century architects of Hagia Sophia in Istanbul?', '["Anthemius and Isidore","Ictinus and Callicrates","Vitruvius and Agrippa","Apollodorus and Hadrian"]'::jsonb),
  ('Portre ressamı Lucian Freud hangi ünlü kişinin torunudur?', 'Portrait painter Lucian Freud was the grandson of which famous person?', '["Sigmund Freud","Gustav Mahler","Albert Einstein","Ludwig Wittgenstein"]'::jsonb),
  ('Dubai''deki Burç Halife gökdelenini tasarlayan mimar kimdir?', 'Which architect designed the Burj Khalifa skyscraper in Dubai?', '["Adrian Smith","Norman Foster","César Pelli","Zaha Hadid"]'::jsonb),
  ('1977''de ''I ♥ NY'' logosunu tasarlayan grafik tasarımcı kimdir?', 'Which graphic designer created the ''I ♥ NY'' logo in 1977?', '["Milton Glaser","Paul Rand","Saul Bass","Massimo Vignelli"]'::jsonb),
  ('Claude Monet''nin nilüferli bahçesini ve Japon köprüsünü resmettiği evi hangi köydedir?', 'In which village is the house where Claude Monet painted his water-lily garden and Japanese bridge?', '["Giverny","Argenteuil","Barbizon","Auvers-sur-Oise"]'::jsonb),
  ('Velázquez''in ''Nedimeler'' (Las Meninas) tablosunda arka duvardaki aynada kimlerin yansıması görünür?', 'In Velázquez''s ''Las Meninas'', whose reflection appears in the mirror on the back wall?', '["The king and queen","The painter''s parents","The pope and a cardinal","The princess and her nurse"]'::jsonb),
  ('Arkasındaki aynada kalabalık salonun yansıdığı bir barmeni gösteren ''Folies-Bergère''de Bir Bar'' kimin eseridir?', 'Who painted ''A Bar at the Folies-Bergère'', showing a barmaid with a crowded hall reflected in the mirror behind her?', '["Édouard Manet","Edgar Degas","Auguste Renoir","Georges Seurat"]'::jsonb),
  ('İngiltere Kralı I. Charles''ın saray ressamı olan, kralı üç yönden gösteren portreyi yapan Flaman ressam kimdir?', 'Which Flemish painter, court painter to King Charles I of England, painted the triple portrait of the king?', '["Anthony van Dyck","Peter Paul Rubens","Jacob Jordaens","Peter Lely"]'::jsonb),
  ('Picasso''nun ''Guernica'' tablosu bugün hangi müzede sergilenmektedir?', 'In which museum is Picasso''s ''Guernica'' displayed today?', '["Reina Sofía","Museo del Prado","Centre Pompidou","Museu Picasso"]'::jsonb),
  ('İngiltere Kralı VIII. Henry''nin saray ressamı olarak kralın ünlü portresini yapan Alman ressam kimdir?', 'Which German painter, court painter to King Henry VIII, made the famous portrait of the king?', '["Hans Holbein","Albrecht Dürer","Lucas Cranach","Anthony van Dyck"]'::jsonb),
  ('Frida Kahlo''nun ömür boyu acı çekmesine yol açan 1925''teki olay neydi?', 'What event in 1925 left Frida Kahlo in pain for the rest of her life?', '["A bus accident","A house fire","A riding accident","An earthquake"]'::jsonb),
  ('John Singer Sargent''ın 1884 Paris Salonu''nda skandal yaratan kadın portresi hangi adla bilinir?', 'By what name is the portrait of a woman by John Singer Sargent that caused a scandal at the 1884 Paris Salon known?', '["Madame X","Olympia","Woman in Red","The Blue Lady"]'::jsonb),
  ('Michelangelo''nun Sistina Şapeli''nin sunak duvarına yaptığı dev fresk hangisidir?', 'Which huge fresco did Michelangelo paint on the altar wall of the Sistine Chapel?', '["The Last Judgment","The Creation of Adam","The School of Athens","The Last Supper"]'::jsonb),
  ('Botticelli''nin ''Venüs''ün Doğuşu'' tablosunda Venüs neyin üzerinde kıyıya gelir?', 'In Botticelli''s ''The Birth of Venus'', what does Venus arrive on at the shore?', '["A seashell","A dolphin''s back","A wooden raft","A swan''s back"]'::jsonb),
  ('New York''taki Özgürlük Heykeli''nin iç demir iskeletini tasarlayan mühendis kimdir?', 'Which engineer designed the internal iron framework of the Statue of Liberty in New York?', '["Gustave Eiffel","Frédéric Bartholdi","John Roebling","Ferdinand de Lesseps"]'::jsonb),
  ('Degas''nın ''On Dört Yaşındaki Küçük Dansçı'' heykelinin 1881''de olay yaratan özelliği neydi?', 'What feature of Degas''s sculpture ''Little Dancer Aged Fourteen'' caused a stir in 1881?', '["It wore a real tulle skirt","It was covered in gold leaf","It had movable arms","It was carved from marble"]'::jsonb),
  ('''Kara Panter'' lakaplı, 1966 Dünya Kupası''nın gol kralı olan Portekizli futbolcu kimdir?', 'Which Portuguese footballer, nicknamed ''the Black Panther'', was top scorer at the 1966 World Cup?', '["Eusébio","Luís Figo","Mário Coluna","Cristiano Ronaldo"]'::jsonb),
  ('LeBron James NBA kariyerine hangi takımda başlamıştır?', 'Which team did LeBron James begin his NBA career with?', '["Cleveland Cavaliers","Miami Heat","Los Angeles Lakers","Chicago Bulls"]'::jsonb),
  ('Arsenal''i 1996-2018 arasında 22 yıl çalıştıran Fransız teknik direktör kimdir?', 'Which French manager was in charge of Arsenal for 22 years, from 1996 to 2018?', '["Arsène Wenger","Gérard Houllier","Didier Deschamps","Aimé Jacquet"]'::jsonb),
  ('Çocukken çocuk felci geçirmesine rağmen 1960 Roma Olimpiyatları''nda üç altın madalya kazanan Amerikalı atlet kimdir?', 'Which American athlete, who had polio as a child, won three gold medals at the 1960 Rome Olympics?', '["Wilma Rudolph","Jackie Joyner-Kersee","Babe Didrikson","Evelyn Ashford"]'::jsonb),
  ('2004''te Chelsea''ye geldiğinde kendini ''Special One'' (Özel Biri) olarak tanıtan teknik direktör kimdir?', 'Which manager introduced himself as ''the Special One'' when he arrived at Chelsea in 2004?', '["José Mourinho","Carlo Ancelotti","Claudio Ranieri","Rafael Benítez"]'::jsonb),
  ('Tenisçi Roger Federer hangi ülkenin sporcusudur?', 'Which country does tennis player Roger Federer represent?', '["Switzerland","Austria","Germany","Sweden"]'::jsonb),
  ('1985''te henüz 17 yaşındayken Wimbledon erkekler tekler şampiyonu olan Alman tenisçi kimdir?', 'Which German player won the Wimbledon men''s singles title in 1985 at just 17 years old?', '["Boris Becker","Michael Stich","Tommy Haas","Nicolas Kiefer"]'::jsonb),
  ('Dallas Mavericks''i 2011''de NBA şampiyonluğuna taşıyıp finallerin en değerli oyuncusu seçilen basketbolcu kimdir?', 'Which player led the Dallas Mavericks to the 2011 NBA title and was named Finals MVP?', '["Dirk Nowitzki","Jason Kidd","LeBron James","Dwyane Wade"]'::jsonb),
  ('1950''lerde beş Formula 1 dünya şampiyonluğu kazanan Arjantinli pilot kimdir?', 'Which Argentine driver won five Formula 1 world championships in the 1950s?', '["Juan Manuel Fangio","Alberto Ascari","Stirling Moss","Froilán González"]'::jsonb),
  ('Lewis Hamilton ilk Formula 1 dünya şampiyonluğunu 2008''de hangi takımla kazanmıştır?', 'With which team did Lewis Hamilton win his first Formula 1 world championship in 2008?', '["McLaren","Mercedes","Ferrari","Williams"]'::jsonb),
  ('Tekler kategorisinde 23 Grand Slam şampiyonluğuyla 2022''de tenisi bırakan Amerikalı oyuncu kimdir?', 'Which American player retired from tennis in 2022 with 23 Grand Slam singles titles?', '["Serena Williams","Venus Williams","Lindsay Davenport","Chris Evert"]'::jsonb),
  ('2014''te Brezilya''ya attığı golle Dünya Kupası''ndaki toplam gol sayısını 16''ya çıkaran Alman futbolcu kimdir?', 'Which German footballer raised his World Cup goal tally to 16 with a goal against Brazil in 2014?', '["Miroslav Klose","Lukas Podolski","Thomas Müller","Jürgen Klinsmann"]'::jsonb),
  ('Manchester United''ı 1986-2013 arasında çalıştıran İskoç teknik direktör kimdir?', 'Which Scottish manager was in charge of Manchester United from 1986 to 2013?', '["Alex Ferguson","Matt Busby","Kenny Dalglish","Bill Shankly"]'::jsonb),
  ('Ayrton Senna''nın McLaren''daki takım arkadaşı ve en büyük rakibi olan Fransız pilot kimdir?', 'Which French driver was Ayrton Senna''s McLaren teammate and greatest rival?', '["Alain Prost","Jean Alesi","René Arnoux","Didier Pironi"]'::jsonb),
  ('Wimbledon''da hakeme ''You cannot be serious!'' diye bağırmasıyla ünlenen Amerikalı tenisçi kimdir?', 'Which American tennis player became famous for shouting ''You cannot be serious!'' at an umpire at Wimbledon?', '["John McEnroe","Jimmy Connors","Andre Agassi","Pete Sampras"]'::jsonb),
  ('1988''de 100 metrede 10,49 saniyelik dünya rekorunu koşan kadın atlet kimdir?', 'Which female athlete ran the 100 metres world record of 10.49 seconds in 1988?', '["Florence Griffith-Joyner","Jackie Joyner-Kersee","Evelyn Ashford","Shelly-Ann Fraser-Pryce"]'::jsonb),
  ('Michael Jordan 1993''teki ilk emekliliğinin ardından hangi sporda profesyonel olarak oynamıştır?', 'Which sport did Michael Jordan play professionally after his first retirement in 1993?', '["Baseball","American football","Golf","Ice hockey"]'::jsonb),
  ('2003 Londra Maratonu''nda 2:15:25''lik derecesiyle uzun yıllar dünya rekorunu elinde tutan İngiliz atlet kimdir?', 'Which British athlete ran 2:15:25 at the 2003 London Marathon, a world record that stood for many years?', '["Paula Radcliffe","Kelly Holmes","Jessica Ennis","Liz McColgan"]'::jsonb),
  ('''Thorpedo'' lakabıyla anılan Avustralyalı yüzücü kimdir?', 'Which Australian swimmer was nicknamed ''the Thorpedo''?', '["Ian Thorpe","Grant Hackett","Kieren Perkins","Michael Klim"]'::jsonb),
  ('1948 Londra Olimpiyatları''nda dört altın madalya kazanan, ''Uçan Ev Kadını'' lakaplı atlet kimdir?', 'Which athlete, nicknamed ''the Flying Housewife'', won four gold medals at the 1948 London Olympics?', '["Fanny Blankers-Koen","Babe Didrikson Zaharias","Betty Cuthbert","Shirley Strickland"]'::jsonb),
  ('Tenisçi Novak Djokovic hangi ülkenin sporcusudur?', 'Which country does tennis player Novak Djokovic represent?', '["Serbia","Croatia","Montenegro","Slovenia"]'::jsonb),
  ('Milli futbolcu Arda Güler 2023''te Fenerbahçe''den hangi kulübe transfer olmuştur?', 'Which club did Turkish footballer Arda Güler join from Fenerbahçe in 2023?', '["Real Madrid","Barcelona","Bayern Munich","Manchester City"]'::jsonb),
  ('Ankara''daki Anıtkabir''in uygulanan projesini tasarlayan mimarlar kimlerdir?', 'Which architects designed the executed project of Anıtkabir, Atatürk''s mausoleum in Ankara?', '["Emin Onat and Orhan Arda","Sedad Hakkı Eldem and Paul Bonatz","Bruno Taut and Seyfi Arkan","Vedat Tek and Mimar Kemaleddin"]'::jsonb),
  ('II. Bayezid''in hat hocası olan ve ''hattatların kıblesi'' diye anılan Osmanlı hattatı kimdir?', 'Which Ottoman calligrapher, teacher of Sultan Bayezid II, was called ''the qibla of calligraphers''?', '["Şeyh Hamdullah","Hafız Osman","Ahmed Karahisari","Mustafa Rakım"]'::jsonb),
  ('2016''da İstanbul Cup''ı kazanarak WTA tekler şampiyonluğu kazanan ilk Türk kadın tenisçi kimdir?', 'Who became the first Turkish woman to win a WTA singles title, at the 2016 Istanbul Cup?', '["Çağla Büyükakçay","Başak Eraydın","Pemra Özgen","Zeynep Sönmez"]'::jsonb),
  ('Türkiye A Milli Futbol Takımı Euro 2008''de yarı finalde hangi ülkeye elenmiştir?', 'Which country knocked Turkey out in the semi-finals of Euro 2008?', '["Germany","Netherlands","Russia","Croatia"]'::jsonb),
  ('Türkiye''ye ilk olimpiyat altın madalyasını 1936 Berlin Olimpiyatları''nda kazandıran güreşçi kimdir?', 'Which wrestler won Turkey''s first Olympic gold medal, at the 1936 Berlin Olympics?', '["Yaşar Erkan","Yaşar Doğu","Hamit Kaplan","Mahmut Atalay"]'::jsonb),
  ('16. yüzyılda ''Hünername'' ve ''Şehnâme-i Selim Han'' minyatürlerini yapan saray nakkaşı kimdir?', 'Which 16th-century Ottoman court painter produced the miniatures of the ''Hünername'' and the ''Şehnâme-i Selim Han''?', '["Nakkaş Osman","Kara Memi","Matrakçı Nasuh","Nigâri"]'::jsonb),
  ('İstanbul Sirkeci''deki Büyük Postane binasının (1909) mimarı kimdir?', 'Who was the architect of the Grand Post Office building (1909) in Sirkeci, Istanbul?', '["Vedat Tek","Mimar Kemaleddin","Alexandre Vallaury","Giulio Mongeri"]'::jsonb)
  ) v(soru, en_soru, en_secenekler)
  join public.questions q on q.soru = v.soru and q.created_at >= transaction_timestamp()
on conflict (question_id, dil) do nothing;

-- ---------------------------------------------------- Çevrilmeyenler
insert into public.ceviri_atlanan (question_id, dil, neden, kod)
select q.id, 'en', v.neden, 'cevrilemez'
  from (values
  ('''Bozkırın Tezenesi'' lakabıyla anılan halk müziği ustası kimdir?', 'Türkçe lakap ve halk müziği adları; İngilizce oyuncu için anlamsız'),
  ('Şener Şen''in başrolde olduğu ''Züğürt Ağa'' (1985) filminin yönetmeni kimdir?', 'Türkiye''ye özgü film ve yönetmen adları; İngilizce oyuncu için anlamsız'),
  ('Cem Yılmaz''ın ''G.O.R.A.'' (2004) filminde uzaylılarca kaçırılan halı satıcısının adı nedir?', 'Türkiye''ye özgü komedi filmi ve karakter adları; İngilizce oyuncu için anlamsız')
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
