-- ============================================================
-- 310 — Paket 3 soru üretimi, parti 7: 100 soru · 2026-09-23
--
-- Kategori: muzik 28 · sanat 22 · sinema 26 · spor 24
-- Yerel (kapsam='yerel', ulke='TR'): 11 · zorluk 1–5: 4/12/30/36/18
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
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti 7 --no 310
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
('Disney''in ''Aslan Kral'' (1994) filminde Simba''nın babası olan kral aslanın adı nedir?', '["Mufasa","Scar","Rafiki","Zazu"]'::jsonb, 0, 'sinema', 'global', null, 1),
('''Hızlı ve Öfkeli'' serisinde Dominic Toretto''yu hangi oyuncu canlandırır?', '["Vin Diesel","Dwayne Johnson","Jason Statham","Paul Walker"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Mel Gibson''ın yönetip başrolünü oynadığı ''Cesur Yürek'' (1995) filminde canlandırdığı İskoç kahraman kimdir?', '["William Wallace","Robert the Bruce","Rob Roy MacGregor","Andrew Moray"]'::jsonb, 0, 'sinema', 'global', null, 3),
('Richard Gere''in oynadığı ''Hachi: Bir Köpeğin Hikâyesi'' (2009) filmindeki sadık köpek hangi Japon ırkındandır?', '["Akita","Shiba Inu","Tosa Inu","Shikoku"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''Singin'' in the Rain'' (Yağmur Altında, 1952) filminde yağmur altında şarkı söyleyip dans eden başrol oyuncusu kimdir?', '["Gene Kelly","Fred Astaire","Frank Sinatra","Dean Martin"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''Harry Potter ve Felsefe Taşı'' (2001) filminde Hogwarts''ın müdürü kimdir?', '["Albus Dumbledore","Severus Snape","Minerva McGonagall","Rubeus Hagrid"]'::jsonb, 0, 'sinema', 'global', null, 1),
('''Shrek'' filminde Eşek karakterini İngilizce seslendiren oyuncu kimdir?', '["Eddie Murphy","Chris Rock","Mike Myers","Will Smith"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Truman Show'' (1998) filminde hayatı habersizce canlı yayınlanan Truman Burbank''i kim canlandırır?', '["Jim Carrey","Tom Hanks","Robin Williams","Matthew Broderick"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Disney''in ''Aslan Kral'' (1994) filminin hikâyesi en çok hangi Shakespeare oyununa benzetilir?', '["Hamlet","Macbeth","Othello","Fırtına"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''Yeni Hayat'' (Cast Away, 2000) filminde ıssız adaya düşen Chuck''ın dost edindiği voleybol topunun adı nedir?', '["Wilson","Spalding","Mikasa","Friday"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''Evde Tek Başına'' (1990) filminde McCallister ailesi Noel tatili için hangi şehre uçar?', '["Paris","Londra","Roma","Madrid"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''Çılgın Hırsız'' (Despicable Me) filmlerinde sarı Minyonlara emir veren kötü karakterin adı nedir?', '["Gru","Vector","Nefario","Balthazar"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Sam Mendes''in ilk sinema filmi olan ve En İyi Film Oscar''ını kazanan yapım hangisidir?', '["Amerikan Güzeli","Cehennem Yolu","Hayallerin Peşinde","1917"]'::jsonb, 0, 'sinema', 'global', null, 4),
('''Her Şey Her Yerde Aynı Anda'' filmiyle 2023''te En İyi Kadın Oyuncu Oscar''ını kim kazandı?', '["Michelle Yeoh","Cate Blanchett","Zhang Ziyi","Gong Li"]'::jsonb, 0, 'sinema', 'global', null, 3),
('''Gremlinler'' (1984) filminde sevimli Mogwai''nin çoğalmasına ne yol açar?', '["Suya değmesi","Güneş görmesi","Gece beslenmesi","Müzik duyması"]'::jsonb, 0, 'sinema', 'global', null, 3),
('Billy Wilder''ın ''Bazıları Sıcak Sever'' (1959) filmi hangi ünlü replikle biter?', '["Kimse mükemmel değildir","Yarın başka bir gündür","Hiçbir yer ev gibi değildir","İşte hepsi bu kadar"]'::jsonb, 0, 'sinema', 'global', null, 4),
('''Koş Lola Koş'' (1998) filminde Lola''nın 100.000 markı bulmak için kaç dakikası vardır?', '["20","10","30","60"]'::jsonb, 0, 'sinema', 'global', null, 4),
('ABBA şarkılarıyla kurulu ''Mamma Mia!'' (2008) filmi hangi ülkenin bir adasında geçer?', '["Yunanistan","İtalya","İspanya","Hırvatistan"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Kubrick''in ''Cinnet'' (The Shining, 1980) filminde Danny''nin girmesi yasaklanan otel odasının numarası kaçtır?', '["237","217","247","327"]'::jsonb, 0, 'sinema', 'global', null, 5),
('''Yüzüklerin Efendisi'' filmlerinde yüzüğe ''kıymetlim'' diye seslenen karakter kimdir?', '["Gollum","Bilbo","Saruman","Frodo"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Buz Devri'' (2002) filminde Manny hangi hayvandır?', '["Mamut","Fil","Gergedan","Bizon"]'::jsonb, 0, 'sinema', 'global', null, 1),
('''Jumanji'' (1995) filminde Alan Parrish oyunun içinde kaç yıl mahsur kalır?', '["26","10","20","30"]'::jsonb, 0, 'sinema', 'global', null, 4),
('1980 Cannes Film Festivali''nde Kurosawa''nın ''Kagemusha''sıyla Altın Palmiye''yi paylaşan film hangisidir?', '["All That Jazz","Apocalypse Now","Kramer vs. Kramer","Raging Bull"]'::jsonb, 0, 'sinema', 'global', null, 5),
('Fritz Lang''ın ''M'' (1931) filminde çocuk katili ıslıkla hangi klasik ezgiyi çalar?', '["Dağ Kralının Salonunda","Solveig''in Şarkısı","Valkürlerin Uçuşu","Radetzky Marşı"]'::jsonb, 0, 'sinema', 'global', null, 5),
('''Smells Like Teen Spirit'' şarkısıyla tanınan Nirvana grubunun solisti kimdir?', '["Kurt Cobain","Dave Grohl","Eddie Vedder","Chris Cornell"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Sweet Child o'' Mine'' şarkısıyla tanınan Guns N'' Roses grubunun solisti kimdir?', '["Axl Rose","Slash","Jon Bon Jovi","Sebastian Bach"]'::jsonb, 0, 'muzik', 'global', null, 2),
('The Beatles''ın ''Abbey Road'' albümü adını nereden alır?', '["Stüdyonun bulunduğu caddeden","Liverpool''daki bir kafeden","Londra''daki bir parktan","Bir kraliyet sarayından"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Stravinski''nin ''Ateş Kuşu'' balesini Rus Baleleri (Ballets Russes) için sipariş eden empresaryo kimdir?', '["Sergey Diaghilev","Vaslav Nijinski","Marius Petipa","Léonide Massine"]'::jsonb, 0, 'muzik', 'global', null, 4),
('The Rolling Stones grubunun solisti kimdir?', '["Mick Jagger","Keith Richards","Roger Daltrey","Robert Plant"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Uptown Funk'' ve ''Just the Way You Are'' şarkılarıyla tanınan Bruno Mars hangi şehirde doğmuştur?', '["Honolulu","Los Angeles","San Juan","Las Vegas"]'::jsonb, 0, 'muzik', 'global', null, 4),
('Haydn''ın ''Veda Senfonisi''nin finalinde müzisyenler ne yapar?', '["Birer birer sahneden ayrılır","Hep birlikte ayağa kalkar","Çalgılarını değiş tokuş eder","Seyirciye dönüp şarkı söyler"]'::jsonb, 0, 'muzik', 'global', null, 4),
('''Uptown Funk'' şarkısını Mark Ronson ile birlikte seslendiren şarkıcı kimdir?', '["Bruno Mars","Pharrell Williams","Justin Timberlake","The Weeknd"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Guten Abend, gut'' Nacht'' diye başlayan ünlü ninni ''Wiegenlied''in bestecisi kimdir?', '["Johannes Brahms","Robert Schumann","Felix Mendelssohn","Carl Maria von Weber"]'::jsonb, 0, 'muzik', 'global', null, 3),
('''Şövalyelerin Dansı'' bölümüyle bilinen ''Romeo ve Juliet'' balesinin bestecisi kimdir?', '["Sergey Prokofyev","Aram Haçaturyan","İgor Stravinski","Dmitri Şostakoviç"]'::jsonb, 0, 'muzik', 'global', null, 4),
('Elton John''un doğum adı nedir?', '["Reginald Dwight","Gordon Sumner","David Jones","Farrokh Bulsara"]'::jsonb, 0, 'muzik', 'global', null, 4),
('''Operanın Hayaleti'' müzikalinin bestecisi kimdir?', '["Andrew Lloyd Webber","Stephen Sondheim","Claude-Michel Schönberg","Jerry Herman"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Kankan dansıyla özdeşleşen ''Cehennem Galopu''nu içeren ''Cehennemdeki Orfeus'' operetinin bestecisi kimdir?', '["Jacques Offenbach","Johann Strauss II","Franz Lehár","Georges Bizet"]'::jsonb, 0, 'muzik', 'global', null, 4),
('''Time to Say Goodbye'' düetini Sarah Brightman ile seslendiren İtalyan tenor kimdir?', '["Andrea Bocelli","Luciano Pavarotti","Plácido Domingo","José Carreras"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Ravel''in ''Bolero''sunu 1928''de bir bale gösterisi için sipariş eden dansçı kimdir?', '["Ida Rubinstein","Anna Pavlova","Isadora Duncan","Tamara Karsavina"]'::jsonb, 0, 'muzik', 'global', null, 5),
('Gustav Mahler''in ölümüyle yarım kalan senfonisi kaçıncı senfonisidir?', '["10.","7.","8.","9."]'::jsonb, 0, 'muzik', 'global', null, 5),
('Saint-Saëns''ın ''Danse Macabre'' eserinde iskeletlerin takırdayan kemiklerini hangi çalgı canlandırır?', '["Ksilofon","Kastanyet","Çelesta","Timpani"]'::jsonb, 0, 'muzik', 'global', null, 4),
('Lady Gaga sahne adını hangi Queen şarkısından almıştır?', '["Radio Ga Ga","Killer Queen","We Will Rock You","Somebody to Love"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Taylor Swift''e ilk Yılın Albümü Grammy ödülünü kazandıran albüm hangisidir?', '["Fearless","Red","Speak Now","1989"]'::jsonb, 0, 'muzik', 'global', null, 4),
('Franz Liszt''in ''Macar Rapsodileri'' dizisi kaç eserden oluşur?', '["19","12","15","24"]'::jsonb, 0, 'muzik', 'global', null, 5),
('İskoç gaydasında (Great Highland) sürekli tek ses veren kaç dem borusu (drone) bulunur?', '["3","1","2","5"]'::jsonb, 0, 'muzik', 'global', null, 5),
('''Levitating'' ve ''New Rules'' şarkılarıyla tanınan şarkıcı Dua Lipa hangi şehirde doğmuştur?', '["Londra","Priştine","Tiran","Dublin"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Napolyon askerlerinin İspanyol sivilleri kurşuna dizmesini gösteren ''Üç Mayıs 1808'' tablosunun ressamı kimdir?', '["Francisco Goya","Diego Velázquez","El Greco","Bartolomé Murillo"]'::jsonb, 0, 'sanat', 'global', null, 3),
('Nike''ın ''Swoosh'' logosunu 1971''de tasarlayan grafik tasarım öğrencisi kimdir?', '["Carolyn Davidson","Paula Scher","Margaret Calvert","April Greiman"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Antik Yunan heykeli ''Venüs de Milo'' bugün hangi müzede sergilenmektedir?', '["Louvre","British Museum","Vatikan Müzeleri","Pergamon Müzesi"]'::jsonb, 0, 'sanat', 'global', null, 3),
('''IKB'' adıyla patentini aldığı yoğun ultramarin maviyle tanınan Fransız sanatçı kimdir?', '["Yves Klein","Pierre Soulages","Jean Dubuffet","Henri Matisse"]'::jsonb, 0, 'sanat', 'global', null, 4),
('2017''de açılan, kubbesinden süzülen ''ışık yağmuru''yla bilinen Louvre Abu Dabi müzesinin mimarı kimdir?', '["Jean Nouvel","Norman Foster","Frank Gehry","Tadao Ando"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Kendini farklı kadın tiplerine bürünerek fotoğrafladığı ''İsimsiz Film Kareleri'' dizisiyle tanınan sanatçı kimdir?', '["Cindy Sherman","Nan Goldin","Diane Arbus","Annie Leibovitz"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Monet''nin iki oval salonu boydan boya kaplayan dev ''Nilüferler'' panoları Paris''te hangi müzededir?', '["Orangerie Müzesi","Orsay Müzesi","Louvre Müzesi","Petit Palais"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Paris''teki Rodin Müzesi, heykeltıraşın son yıllarında atölye olarak kullandığı hangi konaktadır?', '["Hôtel Biron","Hôtel Salé","Hôtel Carnavalet","Hôtel de Sully"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Monet''nin İzlenimcilik akımına adını veren ''İzlenim, Gün Doğumu'' tablosunda resmettiği liman kenti hangisidir?', '["Le Havre","Marsilya","Honfleur","Saint-Malo"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Van Gogh''un ''Yıldızlı Gece'' tablosu bugün hangi müzede sergilenmektedir?', '["MoMA","Van Gogh Müzesi","Orsay Müzesi","Rijksmuseum"]'::jsonb, 0, 'sanat', 'global', null, 3),
('Vermeer''in ''Sütçü Kız'' tablosu bugün hangi müzede sergilenmektedir?', '["Rijksmuseum","Mauritshuis","Louvre","National Gallery"]'::jsonb, 0, 'sanat', 'global', null, 4),
('1929 Barselona Uluslararası Fuarı için yapılan Almanya Pavyonu''nun mimarı kimdir?', '["Mies van der Rohe","Walter Gropius","Le Corbusier","Josep Lluís Sert"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Kazimir Maleviç''in 1915''te sergilediği ''Siyah Kare'' hangi akımın simgesidir?', '["Süprematizm","Konstrüktivizm","Fütürizm","Dadaizm"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Michelangelo''nun Roma''daki ''Musa'' heykelinde, bir çeviri yanılgısı yüzünden Musa''nın başında ne yer alır?', '["Boynuzlar","Işık halesi","Defne tacı","Kukuleta"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Venedikli ressam Tintoretto''nun lakabı, babasının hangi mesleğinden gelir?', '["Kumaş boyacılığı","Cam ustalığı","Gemi yapımcılığı","Kuyumculuk"]'::jsonb, 0, 'sanat', 'global', null, 4),
('Mimar Antoni Gaudí 1926''da Barselona''da nasıl hayatını kaybetmiştir?', '["Tramvay çarpmasıyla","İskeleden düşmesiyle","Bir yapı yangınında","Kalp krizi geçirerek"]'::jsonb, 0, 'sanat', 'global', null, 5),
('FedEx logosunda ''E'' ile ''x'' harflerinin arasındaki boşlukta gizli hangi şekil vardır?', '["Ok","Yıldız","Kalp","Anahtar"]'::jsonb, 0, 'sanat', 'global', null, 3),
('1945''te Times Meydanı''nda bir denizcinin bir kadını öptüğü ünlü ''VJ Günü'' fotoğrafını Life dergisi için çeken fotoğrafçı kimdir?', '["Alfred Eisenstaedt","Robert Capa","Joe Rosenthal","Margaret Bourke-White"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Leonardo da Vinci''nin ''Kakımlı Kadın'' portresi bugün hangi şehirde sergilenmektedir?', '["Krakov","Milano","Viyana","Floransa"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Edward Hopper''ın ''Gece Kuşları'' tablosunda lokantanın üstündeki tabelada hangi puro markasının adı yazar?', '["Phillies","Lucky Strike","Chesterfield","White Owl"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Londra metrosunun istasyonları düz çizgi ve 45 derecelik açılarla gösteren şematik haritasını 1931''de tasarlayan kimdir?', '["Harry Beck","Edward Johnston","Frank Pick","Massimo Vignelli"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Salvador Dalí''nin kendi tasarladığı Tiyatro-Müze hangi kenttedir?', '["Figueres","Cadaqués","Girona","Tarragona"]'::jsonb, 0, 'sanat', 'global', null, 5),
('Golcü Erling Haaland hangi ülkenin milli takımında oynamaktadır?', '["Norveç","İsveç","Danimarka","İzlanda"]'::jsonb, 0, 'spor', 'global', null, 2),
('Golcü Robert Lewandowski hangi ülkenin milli futbolcusudur?', '["Polonya","Çekya","Ukrayna","Slovakya"]'::jsonb, 0, 'spor', 'global', null, 2),
('Kylian Mbappé 2018 Dünya Kupası''nı hangi ülkenin milli takımıyla kazanmıştır?', '["Fransa","Belçika","Hırvatistan","Portekiz"]'::jsonb, 0, 'spor', 'global', null, 1),
('2000 Sidney Olimpiyatları''nda olimpiyat ateşini yakan ve ardından 400 metrede altın madalya kazanan Avustralyalı atlet kimdir?', '["Cathy Freeman","Betty Cuthbert","Sally Pearson","Jana Pittman"]'::jsonb, 0, 'spor', 'global', null, 4),
('Tenisçi Andre Agassi 2001''de hangi eski dünya bir numarası tenisçiyle evlenmiştir?', '["Steffi Graf","Martina Hingis","Monica Seles","Gabriela Sabatini"]'::jsonb, 0, 'spor', 'global', null, 3),
('Shaquille O''Neal NBA kariyerine 1992''de hangi takımda başlamıştır?', '["Orlando Magic","Los Angeles Lakers","Miami Heat","Phoenix Suns"]'::jsonb, 0, 'spor', 'global', null, 3),
('2004''te 17 yaşında finalde Serena Williams''ı yenerek Wimbledon şampiyonu olan Rus tenisçi kimdir?', '["Maria Şarapova","Svetlana Kuznetsova","Anastasia Myskina","Elena Dementieva"]'::jsonb, 0, 'spor', 'global', null, 3),
('''El Fenómeno'' lakabıyla anılan, 2002 Dünya Kupası''nın gol kralı Brezilyalı futbolcu kimdir?', '["Ronaldo","Romário","Rivaldo","Ronaldinho"]'::jsonb, 0, 'spor', 'global', null, 3),
('Basketbolcu ''Magic'' Johnson''ın asıl adı nedir?', '["Earvin","Marcus","Darnell","Anthony"]'::jsonb, 0, 'spor', 'global', null, 4),
('Profesyonel kariyerini 49 galibiyet ve hiç yenilgi almadan bitiren ağır sıklet boks şampiyonu kimdir?', '["Rocky Marciano","Joe Louis","Jack Dempsey","Joe Frazier"]'::jsonb, 0, 'spor', 'global', null, 4),
('Sekiz farklı sıklette dünya şampiyonluğu kazanan Filipinli boksör kimdir?', '["Manny Pacquiao","Oscar De La Hoya","Floyd Mayweather","Juan Manuel Márquez"]'::jsonb, 0, 'spor', 'global', null, 3),
('Basketbolda ''skyhook'' (gök kancası) atışıyla özdeşleşen efsanevi pivot kimdir?', '["Kareem Abdul-Jabbar","Shaquille O''Neal","Hakeem Olajuwon","Bill Walton"]'::jsonb, 0, 'spor', 'global', null, 3),
('Golfçü Tiger Woods''un gerçek ilk adı nedir?', '["Eldrick","Earl","Tyler","Edward"]'::jsonb, 0, 'spor', 'global', null, 4),
('Sırıkla atlamada 5 metreyi aşan ilk kadın atlet kimdir?', '["Yelena İsinbayeva","Stacy Dragila","Jennifer Suhr","Katerina Stefanidi"]'::jsonb, 0, 'spor', 'global', null, 4),
('Boston Celtics ile 11 NBA şampiyonluğu kazanan efsanevi pivot kimdir?', '["Bill Russell","Larry Bird","Wilt Chamberlain","Robert Parish"]'::jsonb, 0, 'spor', 'global', null, 4),
('2021''de yedinci Super Bowl zaferini kazanan Amerikan futbolu oyun kurucusu kimdir?', '["Tom Brady","Peyton Manning","Joe Montana","Dan Marino"]'::jsonb, 0, 'spor', 'global', null, 3),
('1968''de Ballon d''Or kazanan, Manchester United''ın Kuzey İrlandalı efsanesi kimdir?', '["George Best","Denis Law","Bobby Charlton","Pat Jennings"]'::jsonb, 0, 'spor', 'global', null, 4),
('Wimbledon kadınlar tekler şampiyonluğunu 1990''da dokuzuncu kez kazanan tenisçi kimdir?', '["Martina Navratilova","Serena Williams","Margaret Court","Billie Jean King"]'::jsonb, 0, 'spor', 'global', null, 4),
('NBA''in tarihindeki ilk maç sayılan 1 Kasım 1946 karşılaşmasında New York Knicks hangi takıma rakip oldu?', '["Toronto Huskies","Boston Celtics","Chicago Stags","Philadelphia Warriors"]'::jsonb, 0, 'spor', 'global', null, 5),
('2016 Rio Olimpiyatları''nda dört altın madalya kazanan Amerikalı jimnastikçi kimdir?', '["Simone Biles","Gabby Douglas","Aly Raisman","Nastia Liukin"]'::jsonb, 0, 'spor', 'global', null, 3),
('1991''de 15 yaşında büyükusta unvanı alarak Bobby Fischer''ın yaş rekorunu kıran Macar satranççı kimdir?', '["Judit Polgar","Zsuzsa Polgar","Péter Lékó","Lajos Portisch"]'::jsonb, 0, 'spor', 'global', null, 5),
('Türkiye''nin Oscar adayı olan ''Ayla: Savaşın Kızı'' (2017) filmi hangi savaşta geçer?', '["Kore Savaşı","Kurtuluş Savaşı","Çanakkale Savaşı","Kıbrıs Harekâtı"]'::jsonb, 0, 'sinema', 'yerel', 'TR', 3),
('İstanbul''da düzenlenen 2004 Eurovision Şarkı Yarışması''nı ''Wild Dances'' ile kazanan sanatçı kimdir?', '["Ruslana","Helena Paparizou","Sakis Rouvas","Željko Joksimović"]'::jsonb, 0, 'muzik', 'yerel', 'TR', 4),
('Türkiye A Milli Futbol Takımı ilk kez hangi yıl Dünya Kupası''nda oynamıştır?', '["1954","1950","1958","1962"]'::jsonb, 0, 'spor', 'yerel', 'TR', 4),
('Yeşilçam''da ''Çirkin Kral'' lakabıyla anılan oyuncu ve yönetmen kimdir?', '["Yılmaz Güney","Cüneyt Arkın","Ayhan Işık","Tarık Akan"]'::jsonb, 0, 'sinema', 'yerel', 'TR', 3),
('Milli basketbolcu Cedi Osman NBA''deki ilk maçına 2017''de hangi takımın formasıyla çıkmıştır?', '["Cleveland Cavaliers","Milwaukee Bucks","Oklahoma City Thunder","San Antonio Spurs"]'::jsonb, 0, 'spor', 'yerel', 'TR', 4),
('''Dönence'' (1981) şarkısı hangi sanatçıya aittir?', '["Barış Manço","Cem Karaca","Erkin Koray","Fikret Kızılok"]'::jsonb, 0, 'muzik', 'yerel', 'TR', 3),
('Ajda Pekkan 1980 Eurovision Şarkı Yarışması''nda Türkiye adına hangi şarkıyı seslendirmiştir?', '["Pet''r Oil","Sevince","Opera","Didai Didai Dai"]'::jsonb, 0, 'muzik', 'yerel', 'TR', 4),
('Türkiye 1975''te Eurovision''a ilk kez katıldığında ''Seninle Bir Dakika'' şarkısıyla ülkeyi kim temsil etmiştir?', '["Semiha Yankı","Ajda Pekkan","Nilüfer","Füsun Önal"]'::jsonb, 0, 'muzik', 'yerel', 'TR', 4),
('Fenerbahçe stadına adını veren Şükrü Saracoğlu 1942-1946 yıllarında hangi görevi yürütmüştür?', '["Başbakan","Genelkurmay Başkanı","Cumhurbaşkanı","İstanbul Valisi"]'::jsonb, 0, 'spor', 'yerel', 'TR', 4),
('Yılmaz Güney''in senaryosunu yazdığı ''Sürü'' (1978) filminin müziklerini kim yapmıştır?', '["Zülfü Livaneli","Cahit Berkay","Attila Özdemiroğlu","Timur Selçuk"]'::jsonb, 0, 'muzik', 'yerel', 'TR', 5),
('Türkiye''yi 2009 Eurovision Şarkı Yarışması''nda ''Düm Tek Tek'' şarkısıyla temsil eden şarkıcı kimdir?', '["Hadise","Sibel Tüzün","Kenan Doğulu","Gökhan Özoğuz"]'::jsonb, 0, 'muzik', 'yerel', 'TR', 3)
on conflict (soru) do nothing;

-- ---------------------------------------------------- İngilizce çeviri
insert into public.question_translations (question_id, dil, soru, secenekler)
select q.id, 'en', v.en_soru, v.en_secenekler
  from (values
  ('Disney''in ''Aslan Kral'' (1994) filminde Simba''nın babası olan kral aslanın adı nedir?', 'In Disney''s ''The Lion King'' (1994), what is the name of Simba''s father, the lion king?', '["Mufasa","Scar","Rafiki","Zazu"]'::jsonb),
  ('''Hızlı ve Öfkeli'' serisinde Dominic Toretto''yu hangi oyuncu canlandırır?', 'Which actor plays Dominic Toretto in the ''Fast & Furious'' series?', '["Vin Diesel","Dwayne Johnson","Jason Statham","Paul Walker"]'::jsonb),
  ('Mel Gibson''ın yönetip başrolünü oynadığı ''Cesur Yürek'' (1995) filminde canlandırdığı İskoç kahraman kimdir?', 'Which Scottish hero does Mel Gibson play in ''Braveheart'' (1995), which he also directed?', '["William Wallace","Robert the Bruce","Rob Roy MacGregor","Andrew Moray"]'::jsonb),
  ('Richard Gere''in oynadığı ''Hachi: Bir Köpeğin Hikâyesi'' (2009) filmindeki sadık köpek hangi Japon ırkındandır?', 'In ''Hachi: A Dog''s Tale'' (2009), starring Richard Gere, what Japanese breed is the loyal dog?', '["Akita","Shiba Inu","Tosa Inu","Shikoku"]'::jsonb),
  ('''Singin'' in the Rain'' (Yağmur Altında, 1952) filminde yağmur altında şarkı söyleyip dans eden başrol oyuncusu kimdir?', 'In ''Singin'' in the Rain'' (1952), which lead actor sings and dances in the rain?', '["Gene Kelly","Fred Astaire","Frank Sinatra","Dean Martin"]'::jsonb),
  ('''Harry Potter ve Felsefe Taşı'' (2001) filminde Hogwarts''ın müdürü kimdir?', 'In ''Harry Potter and the Philosopher''s Stone'' (2001), who is the headmaster of Hogwarts?', '["Albus Dumbledore","Severus Snape","Minerva McGonagall","Rubeus Hagrid"]'::jsonb),
  ('''Shrek'' filminde Eşek karakterini İngilizce seslendiren oyuncu kimdir?', 'Who voices the character Donkey in ''Shrek''?', '["Eddie Murphy","Chris Rock","Mike Myers","Will Smith"]'::jsonb),
  ('''Truman Show'' (1998) filminde hayatı habersizce canlı yayınlanan Truman Burbank''i kim canlandırır?', 'Who plays Truman Burbank, whose life is secretly broadcast live, in ''The Truman Show'' (1998)?', '["Jim Carrey","Tom Hanks","Robin Williams","Matthew Broderick"]'::jsonb),
  ('Disney''in ''Aslan Kral'' (1994) filminin hikâyesi en çok hangi Shakespeare oyununa benzetilir?', 'The story of Disney''s ''The Lion King'' (1994) is most often compared to which Shakespeare play?', '["Hamlet","Macbeth","Othello","The Tempest"]'::jsonb),
  ('''Yeni Hayat'' (Cast Away, 2000) filminde ıssız adaya düşen Chuck''ın dost edindiği voleybol topunun adı nedir?', 'In ''Cast Away'' (2000), what is the name of the volleyball that stranded Chuck befriends on the island?', '["Wilson","Spalding","Mikasa","Friday"]'::jsonb),
  ('''Evde Tek Başına'' (1990) filminde McCallister ailesi Noel tatili için hangi şehre uçar?', 'In ''Home Alone'' (1990), which city does the McCallister family fly to for Christmas?', '["Paris","London","Rome","Madrid"]'::jsonb),
  ('''Çılgın Hırsız'' (Despicable Me) filmlerinde sarı Minyonlara emir veren kötü karakterin adı nedir?', 'In the ''Despicable Me'' films, what is the name of the villain the yellow Minions work for?', '["Gru","Vector","Nefario","Balthazar"]'::jsonb),
  ('Sam Mendes''in ilk sinema filmi olan ve En İyi Film Oscar''ını kazanan yapım hangisidir?', 'Which film, Sam Mendes''s debut feature, won the Academy Award for Best Picture?', '["American Beauty","Road to Perdition","Revolutionary Road","1917"]'::jsonb),
  ('''Her Şey Her Yerde Aynı Anda'' filmiyle 2023''te En İyi Kadın Oyuncu Oscar''ını kim kazandı?', 'Who won the 2023 Academy Award for Best Actress for ''Everything Everywhere All at Once''?', '["Michelle Yeoh","Cate Blanchett","Zhang Ziyi","Gong Li"]'::jsonb),
  ('''Gremlinler'' (1984) filminde sevimli Mogwai''nin çoğalmasına ne yol açar?', 'In ''Gremlins'' (1984), what causes the cute Mogwai to multiply?', '["Getting wet","Seeing sunlight","Eating at night","Hearing music"]'::jsonb),
  ('Billy Wilder''ın ''Bazıları Sıcak Sever'' (1959) filmi hangi ünlü replikle biter?', 'Which famous line ends Billy Wilder''s ''Some Like It Hot'' (1959)?', '["Nobody''s perfect","Tomorrow is another day","There''s no place like home","That''s all folks"]'::jsonb),
  ('''Koş Lola Koş'' (1998) filminde Lola''nın 100.000 markı bulmak için kaç dakikası vardır?', 'In ''Run Lola Run'' (1998), how many minutes does Lola have to find 100,000 marks?', '["20","10","30","60"]'::jsonb),
  ('ABBA şarkılarıyla kurulu ''Mamma Mia!'' (2008) filmi hangi ülkenin bir adasında geçer?', '''Mamma Mia!'' (2008), built around ABBA songs, is set on an island in which country?', '["Greece","Italy","Spain","Croatia"]'::jsonb),
  ('Kubrick''in ''Cinnet'' (The Shining, 1980) filminde Danny''nin girmesi yasaklanan otel odasının numarası kaçtır?', 'In Kubrick''s film ''The Shining'' (1980), what is the number of the hotel room Danny is warned never to enter?', '["237","217","247","327"]'::jsonb),
  ('''Yüzüklerin Efendisi'' filmlerinde yüzüğe ''kıymetlim'' diye seslenen karakter kimdir?', 'In ''The Lord of the Rings'' films, which character calls the ring ''my precious''?', '["Gollum","Bilbo","Saruman","Frodo"]'::jsonb),
  ('''Buz Devri'' (2002) filminde Manny hangi hayvandır?', 'In ''Ice Age'' (2002), what kind of animal is Manny?', '["Mammoth","Elephant","Rhinoceros","Bison"]'::jsonb),
  ('''Jumanji'' (1995) filminde Alan Parrish oyunun içinde kaç yıl mahsur kalır?', 'In ''Jumanji'' (1995), for how many years is Alan Parrish trapped inside the game?', '["26","10","20","30"]'::jsonb),
  ('1980 Cannes Film Festivali''nde Kurosawa''nın ''Kagemusha''sıyla Altın Palmiye''yi paylaşan film hangisidir?', 'Which film shared the Palme d''Or with Kurosawa''s ''Kagemusha'' at the 1980 Cannes Film Festival?', '["All That Jazz","Apocalypse Now","Kramer vs. Kramer","Raging Bull"]'::jsonb),
  ('Fritz Lang''ın ''M'' (1931) filminde çocuk katili ıslıkla hangi klasik ezgiyi çalar?', 'In Fritz Lang''s ''M'' (1931), which classical tune does the child murderer whistle?', '["In the Hall of the Mountain King","Solveig''s Song","Ride of the Valkyries","Radetzky March"]'::jsonb),
  ('''Smells Like Teen Spirit'' şarkısıyla tanınan Nirvana grubunun solisti kimdir?', 'Who was the lead singer of Nirvana, the band known for ''Smells Like Teen Spirit''?', '["Kurt Cobain","Dave Grohl","Eddie Vedder","Chris Cornell"]'::jsonb),
  ('''Sweet Child o'' Mine'' şarkısıyla tanınan Guns N'' Roses grubunun solisti kimdir?', 'Who is the lead singer of Guns N'' Roses, the band known for ''Sweet Child o'' Mine''?', '["Axl Rose","Slash","Jon Bon Jovi","Sebastian Bach"]'::jsonb),
  ('The Beatles''ın ''Abbey Road'' albümü adını nereden alır?', 'Where does The Beatles'' album ''Abbey Road'' get its name from?', '["The street where the studio stands","A café in Liverpool","A park in London","A royal palace"]'::jsonb),
  ('Stravinski''nin ''Ateş Kuşu'' balesini Rus Baleleri (Ballets Russes) için sipariş eden empresaryo kimdir?', 'Which impresario commissioned Stravinsky''s ballet ''The Firebird'' for the Ballets Russes?', '["Sergei Diaghilev","Vaslav Nijinsky","Marius Petipa","Léonide Massine"]'::jsonb),
  ('The Rolling Stones grubunun solisti kimdir?', 'Who is the lead singer of The Rolling Stones?', '["Mick Jagger","Keith Richards","Roger Daltrey","Robert Plant"]'::jsonb),
  ('''Uptown Funk'' ve ''Just the Way You Are'' şarkılarıyla tanınan Bruno Mars hangi şehirde doğmuştur?', 'In which city was Bruno Mars, known for ''Uptown Funk'' and ''Just the Way You Are'', born?', '["Honolulu","Los Angeles","San Juan","Las Vegas"]'::jsonb),
  ('Haydn''ın ''Veda Senfonisi''nin finalinde müzisyenler ne yapar?', 'What do the musicians do in the finale of Haydn''s ''Farewell'' Symphony?', '["Leave the stage one by one","All stand up together","Swap their instruments","Turn and sing to the audience"]'::jsonb),
  ('''Uptown Funk'' şarkısını Mark Ronson ile birlikte seslendiren şarkıcı kimdir?', 'Which singer performs ''Uptown Funk'' with Mark Ronson?', '["Bruno Mars","Pharrell Williams","Justin Timberlake","The Weeknd"]'::jsonb),
  ('''Guten Abend, gut'' Nacht'' diye başlayan ünlü ninni ''Wiegenlied''in bestecisi kimdir?', 'Who composed the famous lullaby ''Wiegenlied'', which begins ''Guten Abend, gut'' Nacht''?', '["Johannes Brahms","Robert Schumann","Felix Mendelssohn","Carl Maria von Weber"]'::jsonb),
  ('''Şövalyelerin Dansı'' bölümüyle bilinen ''Romeo ve Juliet'' balesinin bestecisi kimdir?', 'Who composed the ballet ''Romeo and Juliet'', known for its ''Dance of the Knights''?', '["Sergei Prokofiev","Aram Khachaturian","Igor Stravinsky","Dmitri Shostakovich"]'::jsonb),
  ('Elton John''un doğum adı nedir?', 'What is Elton John''s birth name?', '["Reginald Dwight","Gordon Sumner","David Jones","Farrokh Bulsara"]'::jsonb),
  ('''Operanın Hayaleti'' müzikalinin bestecisi kimdir?', 'Who composed the musical ''The Phantom of the Opera''?', '["Andrew Lloyd Webber","Stephen Sondheim","Claude-Michel Schönberg","Jerry Herman"]'::jsonb),
  ('Kankan dansıyla özdeşleşen ''Cehennem Galopu''nu içeren ''Cehennemdeki Orfeus'' operetinin bestecisi kimdir?', 'Who composed the operetta ''Orpheus in the Underworld'', whose ''Infernal Galop'' is famous as the can-can?', '["Jacques Offenbach","Johann Strauss II","Franz Lehár","Georges Bizet"]'::jsonb),
  ('''Time to Say Goodbye'' düetini Sarah Brightman ile seslendiren İtalyan tenor kimdir?', 'Which Italian tenor sang the duet ''Time to Say Goodbye'' with Sarah Brightman?', '["Andrea Bocelli","Luciano Pavarotti","Plácido Domingo","José Carreras"]'::jsonb),
  ('Ravel''in ''Bolero''sunu 1928''de bir bale gösterisi için sipariş eden dansçı kimdir?', 'Which dancer commissioned Ravel''s ''Boléro'' for a ballet performance in 1928?', '["Ida Rubinstein","Anna Pavlova","Isadora Duncan","Tamara Karsavina"]'::jsonb),
  ('Gustav Mahler''in ölümüyle yarım kalan senfonisi kaçıncı senfonisidir?', 'Which of Gustav Mahler''s symphonies was left unfinished at his death?', '["10th","7th","8th","9th"]'::jsonb),
  ('Saint-Saëns''ın ''Danse Macabre'' eserinde iskeletlerin takırdayan kemiklerini hangi çalgı canlandırır?', 'In Saint-Saëns''s ''Danse Macabre'', which instrument depicts the rattling bones of the skeletons?', '["Xylophone","Castanets","Celesta","Timpani"]'::jsonb),
  ('Lady Gaga sahne adını hangi Queen şarkısından almıştır?', 'Which Queen song gave Lady Gaga her stage name?', '["Radio Ga Ga","Killer Queen","We Will Rock You","Somebody to Love"]'::jsonb),
  ('Taylor Swift''e ilk Yılın Albümü Grammy ödülünü kazandıran albüm hangisidir?', 'Which album won Taylor Swift her first Grammy for Album of the Year?', '["Fearless","Red","Speak Now","1989"]'::jsonb),
  ('Franz Liszt''in ''Macar Rapsodileri'' dizisi kaç eserden oluşur?', 'How many pieces make up Franz Liszt''s ''Hungarian Rhapsodies''?', '["19","12","15","24"]'::jsonb),
  ('İskoç gaydasında (Great Highland) sürekli tek ses veren kaç dem borusu (drone) bulunur?', 'How many drones, the pipes that sound a continuous note, does the Great Highland bagpipe have?', '["3","1","2","5"]'::jsonb),
  ('''Levitating'' ve ''New Rules'' şarkılarıyla tanınan şarkıcı Dua Lipa hangi şehirde doğmuştur?', 'In which city was Dua Lipa, the singer known for ''Levitating'' and ''New Rules'', born?', '["London","Pristina","Tirana","Dublin"]'::jsonb),
  ('Napolyon askerlerinin İspanyol sivilleri kurşuna dizmesini gösteren ''Üç Mayıs 1808'' tablosunun ressamı kimdir?', 'Who painted ''The Third of May 1808'', showing Napoleon''s soldiers executing Spanish civilians?', '["Francisco Goya","Diego Velázquez","El Greco","Bartolomé Murillo"]'::jsonb),
  ('Nike''ın ''Swoosh'' logosunu 1971''de tasarlayan grafik tasarım öğrencisi kimdir?', 'Which graphic design student created Nike''s ''Swoosh'' logo in 1971?', '["Carolyn Davidson","Paula Scher","Margaret Calvert","April Greiman"]'::jsonb),
  ('Antik Yunan heykeli ''Venüs de Milo'' bugün hangi müzede sergilenmektedir?', 'In which museum is the ancient Greek statue ''Venus de Milo'' displayed today?', '["The Louvre","The British Museum","The Vatican Museums","The Pergamon Museum"]'::jsonb),
  ('''IKB'' adıyla patentini aldığı yoğun ultramarin maviyle tanınan Fransız sanatçı kimdir?', 'Which French artist is known for the intense ultramarine blue he patented as ''IKB''?', '["Yves Klein","Pierre Soulages","Jean Dubuffet","Henri Matisse"]'::jsonb),
  ('2017''de açılan, kubbesinden süzülen ''ışık yağmuru''yla bilinen Louvre Abu Dabi müzesinin mimarı kimdir?', 'Who was the architect of the Louvre Abu Dhabi, opened in 2017 and known for the ''rain of light'' filtering through its dome?', '["Jean Nouvel","Norman Foster","Frank Gehry","Tadao Ando"]'::jsonb),
  ('Kendini farklı kadın tiplerine bürünerek fotoğrafladığı ''İsimsiz Film Kareleri'' dizisiyle tanınan sanatçı kimdir?', 'Which artist is known for the ''Untitled Film Stills'' series, in which she photographed herself posing as different female types?', '["Cindy Sherman","Nan Goldin","Diane Arbus","Annie Leibovitz"]'::jsonb),
  ('Monet''nin iki oval salonu boydan boya kaplayan dev ''Nilüferler'' panoları Paris''te hangi müzededir?', 'In which Paris museum are Monet''s huge ''Water Lilies'' panels that line two oval rooms?', '["Musée de l''Orangerie","Musée d''Orsay","The Louvre","Petit Palais"]'::jsonb),
  ('Paris''teki Rodin Müzesi, heykeltıraşın son yıllarında atölye olarak kullandığı hangi konaktadır?', 'The Musée Rodin in Paris occupies which mansion, used by the sculptor as a studio in his final years?', '["Hôtel Biron","Hôtel Salé","Hôtel Carnavalet","Hôtel de Sully"]'::jsonb),
  ('Monet''nin İzlenimcilik akımına adını veren ''İzlenim, Gün Doğumu'' tablosunda resmettiği liman kenti hangisidir?', 'Which port city did Monet depict in ''Impression, Sunrise'', the painting that gave Impressionism its name?', '["Le Havre","Marseille","Honfleur","Saint-Malo"]'::jsonb),
  ('Van Gogh''un ''Yıldızlı Gece'' tablosu bugün hangi müzede sergilenmektedir?', 'In which museum is Van Gogh''s ''The Starry Night'' displayed today?', '["MoMA","Van Gogh Museum","Musée d''Orsay","Rijksmuseum"]'::jsonb),
  ('Vermeer''in ''Sütçü Kız'' tablosu bugün hangi müzede sergilenmektedir?', 'In which museum is Vermeer''s ''The Milkmaid'' displayed today?', '["Rijksmuseum","Mauritshuis","Louvre","National Gallery"]'::jsonb),
  ('1929 Barselona Uluslararası Fuarı için yapılan Almanya Pavyonu''nun mimarı kimdir?', 'Who was the architect of the German Pavilion built for the 1929 Barcelona International Exposition?', '["Mies van der Rohe","Walter Gropius","Le Corbusier","Josep Lluís Sert"]'::jsonb),
  ('Kazimir Maleviç''in 1915''te sergilediği ''Siyah Kare'' hangi akımın simgesidir?', 'Kazimir Malevich''s ''Black Square'', exhibited in 1915, is the emblem of which movement?', '["Suprematism","Constructivism","Futurism","Dadaism"]'::jsonb),
  ('Michelangelo''nun Roma''daki ''Musa'' heykelinde, bir çeviri yanılgısı yüzünden Musa''nın başında ne yer alır?', 'Because of a translation error, what appears on the head of Michelangelo''s ''Moses'' statue in Rome?', '["Horns","A halo","A laurel wreath","A hood"]'::jsonb),
  ('Venedikli ressam Tintoretto''nun lakabı, babasının hangi mesleğinden gelir?', 'Venetian painter Tintoretto''s nickname comes from his father''s profession. What was it?', '["Cloth dyeing","Glassmaking","Shipbuilding","Goldsmithing"]'::jsonb),
  ('Mimar Antoni Gaudí 1926''da Barselona''da nasıl hayatını kaybetmiştir?', 'How did the architect Antoni Gaudí die in Barcelona in 1926?', '["Hit by a tram","Fell from scaffolding","In a building fire","Of a heart attack"]'::jsonb),
  ('FedEx logosunda ''E'' ile ''x'' harflerinin arasındaki boşlukta gizli hangi şekil vardır?', 'What shape is hidden in the space between the ''E'' and the ''x'' of the FedEx logo?', '["An arrow","A star","A heart","A key"]'::jsonb),
  ('1945''te Times Meydanı''nda bir denizcinin bir kadını öptüğü ünlü ''VJ Günü'' fotoğrafını Life dergisi için çeken fotoğrafçı kimdir?', 'Which photographer took the famous ''V-J Day'' picture of a sailor kissing a woman in Times Square in 1945 for Life magazine?', '["Alfred Eisenstaedt","Robert Capa","Joe Rosenthal","Margaret Bourke-White"]'::jsonb),
  ('Leonardo da Vinci''nin ''Kakımlı Kadın'' portresi bugün hangi şehirde sergilenmektedir?', 'In which city is Leonardo da Vinci''s ''Lady with an Ermine'' displayed today?', '["Kraków","Milan","Vienna","Florence"]'::jsonb),
  ('Edward Hopper''ın ''Gece Kuşları'' tablosunda lokantanın üstündeki tabelada hangi puro markasının adı yazar?', 'In Edward Hopper''s ''Nighthawks'', which cigar brand is named on the sign above the diner?', '["Phillies","Lucky Strike","Chesterfield","White Owl"]'::jsonb),
  ('Londra metrosunun istasyonları düz çizgi ve 45 derecelik açılarla gösteren şematik haritasını 1931''de tasarlayan kimdir?', 'Who designed the 1931 diagrammatic London Underground map that shows stations with straight lines and 45-degree angles?', '["Harry Beck","Edward Johnston","Frank Pick","Massimo Vignelli"]'::jsonb),
  ('Salvador Dalí''nin kendi tasarladığı Tiyatro-Müze hangi kenttedir?', 'In which town is the Theatre-Museum designed by Salvador Dalí himself?', '["Figueres","Cadaqués","Girona","Tarragona"]'::jsonb),
  ('Golcü Erling Haaland hangi ülkenin milli takımında oynamaktadır?', 'Which country does striker Erling Haaland play for at international level?', '["Norway","Sweden","Denmark","Iceland"]'::jsonb),
  ('Golcü Robert Lewandowski hangi ülkenin milli futbolcusudur?', 'Which country does striker Robert Lewandowski play for at international level?', '["Poland","Czech Republic","Ukraine","Slovakia"]'::jsonb),
  ('Kylian Mbappé 2018 Dünya Kupası''nı hangi ülkenin milli takımıyla kazanmıştır?', 'With which national team did Kylian Mbappé win the 2018 World Cup?', '["France","Belgium","Croatia","Portugal"]'::jsonb),
  ('2000 Sidney Olimpiyatları''nda olimpiyat ateşini yakan ve ardından 400 metrede altın madalya kazanan Avustralyalı atlet kimdir?', 'Which Australian athlete lit the Olympic flame at the Sydney 2000 Games and then won the 400 metres gold?', '["Cathy Freeman","Betty Cuthbert","Sally Pearson","Jana Pittman"]'::jsonb),
  ('Tenisçi Andre Agassi 2001''de hangi eski dünya bir numarası tenisçiyle evlenmiştir?', 'Which former world number one tennis player did Andre Agassi marry in 2001?', '["Steffi Graf","Martina Hingis","Monica Seles","Gabriela Sabatini"]'::jsonb),
  ('Shaquille O''Neal NBA kariyerine 1992''de hangi takımda başlamıştır?', 'With which team did Shaquille O''Neal begin his NBA career in 1992?', '["Orlando Magic","Los Angeles Lakers","Miami Heat","Phoenix Suns"]'::jsonb),
  ('2004''te 17 yaşında finalde Serena Williams''ı yenerek Wimbledon şampiyonu olan Rus tenisçi kimdir?', 'Which Russian player won Wimbledon in 2004 at the age of 17, beating Serena Williams in the final?', '["Maria Sharapova","Svetlana Kuznetsova","Anastasia Myskina","Elena Dementieva"]'::jsonb),
  ('''El Fenómeno'' lakabıyla anılan, 2002 Dünya Kupası''nın gol kralı Brezilyalı futbolcu kimdir?', 'Which Brazilian striker, nicknamed ''O Fenômeno'', was the top scorer of the 2002 World Cup?', '["Ronaldo","Romário","Rivaldo","Ronaldinho"]'::jsonb),
  ('Basketbolcu ''Magic'' Johnson''ın asıl adı nedir?', 'What is basketball player ''Magic'' Johnson''s real first name?', '["Earvin","Marcus","Darnell","Anthony"]'::jsonb),
  ('Profesyonel kariyerini 49 galibiyet ve hiç yenilgi almadan bitiren ağır sıklet boks şampiyonu kimdir?', 'Which heavyweight boxing champion ended his professional career with 49 wins and no defeats?', '["Rocky Marciano","Joe Louis","Jack Dempsey","Joe Frazier"]'::jsonb),
  ('Sekiz farklı sıklette dünya şampiyonluğu kazanan Filipinli boksör kimdir?', 'Which Filipino boxer won world titles in eight different weight divisions?', '["Manny Pacquiao","Oscar De La Hoya","Floyd Mayweather","Juan Manuel Márquez"]'::jsonb),
  ('Basketbolda ''skyhook'' (gök kancası) atışıyla özdeşleşen efsanevi pivot kimdir?', 'Which legendary centre is most associated with the ''skyhook'' shot in basketball?', '["Kareem Abdul-Jabbar","Shaquille O''Neal","Hakeem Olajuwon","Bill Walton"]'::jsonb),
  ('Golfçü Tiger Woods''un gerçek ilk adı nedir?', 'What is golfer Tiger Woods''s real first name?', '["Eldrick","Earl","Tyler","Edward"]'::jsonb),
  ('Sırıkla atlamada 5 metreyi aşan ilk kadın atlet kimdir?', 'Who was the first female pole vaulter to clear 5 metres?', '["Yelena Isinbayeva","Stacy Dragila","Jennifer Suhr","Katerina Stefanidi"]'::jsonb),
  ('Boston Celtics ile 11 NBA şampiyonluğu kazanan efsanevi pivot kimdir?', 'Which legendary centre won 11 NBA championships with the Boston Celtics?', '["Bill Russell","Larry Bird","Wilt Chamberlain","Robert Parish"]'::jsonb),
  ('2021''de yedinci Super Bowl zaferini kazanan Amerikan futbolu oyun kurucusu kimdir?', 'Which American football quarterback won his seventh Super Bowl in 2021?', '["Tom Brady","Peyton Manning","Joe Montana","Dan Marino"]'::jsonb),
  ('1968''de Ballon d''Or kazanan, Manchester United''ın Kuzey İrlandalı efsanesi kimdir?', 'Which Northern Irish Manchester United legend won the Ballon d''Or in 1968?', '["George Best","Denis Law","Bobby Charlton","Pat Jennings"]'::jsonb),
  ('Wimbledon kadınlar tekler şampiyonluğunu 1990''da dokuzuncu kez kazanan tenisçi kimdir?', 'Which player won the Wimbledon women''s singles title for the ninth time in 1990?', '["Martina Navratilova","Serena Williams","Margaret Court","Billie Jean King"]'::jsonb),
  ('NBA''in tarihindeki ilk maç sayılan 1 Kasım 1946 karşılaşmasında New York Knicks hangi takıma rakip oldu?', 'On 1 November 1946, in the game regarded as the first in NBA history, which team did the New York Knicks face?', '["Toronto Huskies","Boston Celtics","Chicago Stags","Philadelphia Warriors"]'::jsonb),
  ('2016 Rio Olimpiyatları''nda dört altın madalya kazanan Amerikalı jimnastikçi kimdir?', 'Which American gymnast won four gold medals at the 2016 Rio Olympics?', '["Simone Biles","Gabby Douglas","Aly Raisman","Nastia Liukin"]'::jsonb),
  ('1991''de 15 yaşında büyükusta unvanı alarak Bobby Fischer''ın yaş rekorunu kıran Macar satranççı kimdir?', 'Which Hungarian chess player broke Bobby Fischer''s age record by becoming a grandmaster at 15 in 1991?', '["Judit Polgár","Zsuzsa Polgár","Péter Lékó","Lajos Portisch"]'::jsonb),
  ('Türkiye''nin Oscar adayı olan ''Ayla: Savaşın Kızı'' (2017) filmi hangi savaşta geçer?', 'In which war is ''Ayla: The Daughter of War'' (2017), Turkey''s Oscar submission, set?', '["The Korean War","The Turkish War of Independence","The Gallipoli Campaign","The Cyprus Operation"]'::jsonb),
  ('İstanbul''da düzenlenen 2004 Eurovision Şarkı Yarışması''nı ''Wild Dances'' ile kazanan sanatçı kimdir?', 'Which artist won the 2004 Eurovision Song Contest, held in Istanbul, with ''Wild Dances''?', '["Ruslana","Helena Paparizou","Sakis Rouvas","Željko Joksimović"]'::jsonb),
  ('Türkiye A Milli Futbol Takımı ilk kez hangi yıl Dünya Kupası''nda oynamıştır?', 'In which year did Turkey''s national football team first play at a World Cup?', '["1954","1950","1958","1962"]'::jsonb),
  ('Milli basketbolcu Cedi Osman NBA''deki ilk maçına 2017''de hangi takımın formasıyla çıkmıştır?', 'For which team did Turkish basketball player Cedi Osman make his NBA debut in 2017?', '["Cleveland Cavaliers","Milwaukee Bucks","Oklahoma City Thunder","San Antonio Spurs"]'::jsonb),
  ('Ajda Pekkan 1980 Eurovision Şarkı Yarışması''nda Türkiye adına hangi şarkıyı seslendirmiştir?', 'Which song did Ajda Pekkan perform for Turkey at the 1980 Eurovision Song Contest?', '["Pet''r Oil","Sevince","Opera","Didai Didai Dai"]'::jsonb),
  ('Türkiye 1975''te Eurovision''a ilk kez katıldığında ''Seninle Bir Dakika'' şarkısıyla ülkeyi kim temsil etmiştir?', 'When Turkey first entered Eurovision in 1975, who represented the country with the song ''Seninle Bir Dakika''?', '["Semiha Yankı","Ajda Pekkan","Nilüfer","Füsun Önal"]'::jsonb),
  ('Yılmaz Güney''in senaryosunu yazdığı ''Sürü'' (1978) filminin müziklerini kim yapmıştır?', 'Who composed the score for ''The Herd'' (''Sürü'', 1978), the film written by Yılmaz Güney?', '["Zülfü Livaneli","Cahit Berkay","Attila Özdemiroğlu","Timur Selçuk"]'::jsonb),
  ('Türkiye''yi 2009 Eurovision Şarkı Yarışması''nda ''Düm Tek Tek'' şarkısıyla temsil eden şarkıcı kimdir?', 'Which singer represented Turkey at the 2009 Eurovision Song Contest with ''Düm Tek Tek''?', '["Hadise","Sibel Tüzün","Kenan Doğulu","Gökhan Özoğuz"]'::jsonb)
  ) v(soru, en_soru, en_secenekler)
  join public.questions q on q.soru = v.soru and q.created_at >= transaction_timestamp()
on conflict (question_id, dil) do nothing;

-- ---------------------------------------------------- Çevrilmeyenler
insert into public.ceviri_atlanan (question_id, dil, neden, kod)
select q.id, 'en', v.neden, 'cevrilemez'
  from (values
  ('Yeşilçam''da ''Çirkin Kral'' lakabıyla anılan oyuncu ve yönetmen kimdir?', 'Türkçe lakap ve Yeşilçam oyuncuları; İngilizce oyuncu için anlamsız'),
  ('''Dönence'' (1981) şarkısı hangi sanatçıya aittir?', 'Türkçe şarkı adı; İngilizce oyuncu için anlamsız'),
  ('Fenerbahçe stadına adını veren Şükrü Saracoğlu 1942-1946 yıllarında hangi görevi yürütmüştür?', 'Türk kulübü stadı ve devlet adamı; İngilizce oyuncu için anlamsız')
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
