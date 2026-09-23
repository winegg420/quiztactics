-- ============================================================
-- 315 — Paket 3 soru üretimi, parti 12: 100 soru · 2026-09-23
--
-- Kategori: bilim 22 · edebiyat 22 · genel_kultur 9 · tarih 19 · teknoloji 28
-- Yerel (kapsam='yerel', ulke='TR'): 0 · zorluk 1–5: 4/11/30/35/20
-- İngilizce çeviri: 94 · çevrilmeyen (ceviri_atlanan, kod 'cevrilemez'): 6
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
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti 12 --no 315
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
('Microsoft''un adını Halo oyunundaki bir yapay zekâ karakterinden alan sesli asistanı hangisidir?', '["Cortana","Alexa","Siri","Bixby"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('Wi-Fi teknolojisinin temel patentlerinden birini alan devlet araştırma kurumu CSIRO hangi ülkenindir?', '["Avustralya","Kanada","İsveç","Finlandiya"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('''Final Fantasy'' oyun serisinin yaratıcısı kimdir?', '["Hironobu Sakaguchi","Hideo Kojima","Shigeru Miyamoto","Koji Igarashi"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Çalan şarkıyı tanıyan Shazam uygulamasını 2018''de satın alan şirket hangisidir?', '["Apple","Google","Spotify","Microsoft"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('''Civilization'' strateji oyunu serisinin yaratıcısı kimdir?', '["Sid Meier","Will Wright","Peter Molyneux","Richard Garriott"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('Mortal Kombat serisini John Tobias ile birlikte yaratan programcı kimdir?', '["Ed Boon","John Romero","Tim Schafer","Sid Meier"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('Sonic the Hedgehog''un yaratıcılarından olan Sega programcısı kimdir?', '["Yuji Naka","Satoshi Tajiri","Hideo Kojima","Shigeru Miyamoto"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('1987''de GIF görüntü biçimini geliştiren çevrim içi hizmet şirketi hangisidir?', '["CompuServe","Prodigy","America Online","Netscape"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('USB standardının geliştirilmesine öncülük eden Intel mühendisi kimdir?', '["Ajay Bhatt","Federico Faggin","Ted Hoff","Andy Grove"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('1978 yapımı Space Invaders oyununu piyasaya süren Japon şirketi hangisidir?', '["Taito","Namco","Konami","Capcom"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('1958''de bir osiloskop ekranında oynanan ''Tennis for Two'' oyununu tasarlayan fizikçi kimdir?', '["William Higinbotham","Ralph Henry Baer","Steve Russell","Nolan Bushnell"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('Hotmail''i 1996''da Jack Smith ile birlikte kuran girişimci kimdir?', '["Sabeer Bhatia","Vinod Khosla","Sundar Pichai","Satya Nadella"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('Motorola''nın 1983''te satışa çıkardığı ilk ticari el tipi cep telefonunun model adı nedir?', '["DynaTAC 8000X","StarTAC 3000","MicroTAC 9800X","RAZR V3"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('Microsoft Office''e 1997''de eklenen ataç biçimli yardımcı karakterin adı nedir?', '["Clippy","Cortana","Rover","Bob"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('Grand Theft Auto serisini yayımlayan şirket hangisidir?', '["Rockstar Games","Ubisoft","Electronic Arts","Activision"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Tatlı adları taşıyan Android sürümleri arasında ilk tatlı adını alan sürüm hangisidir?', '["Cupcake","Donut","Eclair","Froyo"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Ağ bağlantısını sınayan ''ping'' komutu adını hangi aygıtın çıkardığı sesten almıştır?', '["Sonar","Radar","Telgraf","Metronom"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Rus sosyal ağı VKontakte''yi ve Telegram''ı kuran girişimci kimdir?', '["Pavel Durov","Yuri Milner","Arkadi Voloj","Yevgeni Kaspersky"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Doom''un tasarımcılarından olup ardından ''Daikatana''yı yapan oyun geliştiricisi kimdir?', '["John Romero","John Carmack","Gabe Newell","Cliff Bleszinski"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Unix dünyasının klasik metin düzenleyicisi vi''yi 1976''da yazan programcı kimdir?', '["Bill Joy","Richard Stallman","Ken Thompson","Brian Kernighan"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('Wikipedia''dan önce Jimmy Wales ile Larry Sanger''ın başlattığı, uzmanlarca yazılan çevrim içi ansiklopedi hangisidir?', '["Nupedia","Encarta","Everipedia","Interpedia"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('''Kes, kopyala, yapıştır'' komutlarını Xerox PARC''ta geliştiren bilgisayar bilimci kimdir?', '["Larry Tesler","Alan Kay","Butler Lampson","Charles Simonyi"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('Super Mario oyunlarında Bowser''ın sık sık kaçırdığı prenses kimdir?', '["Peach","Zelda","Rosalina","Pauline"]'::jsonb, 0, 'teknoloji', 'global', null, 1),
('IBM PC için Ctrl+Alt+Del tuş birleşimini tasarlayan mühendis kimdir?', '["David Bradley","Mark Dean","Don Estridge","Bill Lowe"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('Arkeolog Lara Croft''un başrolde olduğu oyun serisi hangisidir?', '["Tomb Raider","Uncharted","Prince of Persia","Resident Evil"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Nintendo oyunlarında düşmanlarını yutup yeteneklerini kopyalayan pembe karakter kimdir?', '["Kirby","Toad","Birdo","Wario"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Angry Birds oyununda kuşların yumurtalarını çalan düşmanlar hangi hayvanlardır?', '["Domuzlar","Kediler","Tilkiler","Yılanlar"]'::jsonb, 0, 'teknoloji', 'global', null, 1),
('İlk Macintosh''un simgelerini ve yazı tiplerini tasarlayan grafik tasarımcı kimdir?', '["Susan Kare","Paula Scher","April Greiman","Muriel Cooper"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('''Ivanhoe'' romanının yazarı kimdir?', '["Walter Scott","Robert Louis Stevenson","Charles Dickens","William Thackeray"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('Gerçek adı François-Marie Arouet olan Fransız yazar hangi adla tanınır?', '["Voltaire","Rousseau","Diderot","Montesquieu"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('Tolkien''in ''Hobbit'' romanında cücelerle birlikte Yalnız Dağ''a yolculuğa çıkan hobbit kimdir?', '["Bilbo Baggins","Frodo Baggins","Samwise Gamgee","Peregrin Took"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('''Açlık'' romanıyla tanınan 1920 Nobel Edebiyat Ödüllü Norveçli yazar kimdir?', '["Knut Hamsun","Henrik Ibsen","Bjørnstjerne Bjørnson","Sigrid Undset"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('Kral Arthur efsanesinde Arthur''un kılıcının adı nedir?', '["Excalibur","Durendal","Zülfikar","Kusanagi"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Monte Kristo Kontu''nda Edmond Dantès''in haksız yere hapsedildiği kale hangisidir?', '["If Şatosu","Bastille","Vincennes Şatosu","Chillon Şatosu"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('E. B. White''ın ''Charlotte''un Ağı'' romanında örümcek Charlotte''un hayatını kurtardığı domuz kimdir?', '["Wilbur","Babe","Napolyon","Templeton"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('''Küçük Kadınlar'' romanındaki March kardeşlerden yazar olmak isteyen kimdir?', '["Jo","Meg","Beth","Amy"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('''Suç ve Ceza''da Raskolnikov''un suçunu itiraf ettiği ve onunla Sibirya''ya giden genç kadın kimdir?', '["Sonya","Dunya","Nastasya","Pulherya"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('''Sefiller''de Jean Valjean''ın kürek mahkûmu olarak taşıdığı numara nedir?', '["24601","24061","26401","20461"]'::jsonb, 0, 'edebiyat', 'global', null, 5),
('Goethe''nin ''Faust''unda Faust''un ruhu karşılığında anlaşma yaptığı şeytan kimdir?', '["Mefisto","Lucifer","Belzebub","Asmodeus"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Kemal Tahir''in işgal altındaki İstanbul''da Kâmil Bey''in hikâyesini anlatan romanı hangisidir?', '["Esir Şehrin İnsanları","Bozkırdaki Çekirdek","Yorgun Savaşçı","Rahmet Yolları Kesti"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('Ahmet Mithat Efendi''nin alafranga bir züppe ile çalışkan, kendini yetiştirmiş bir genci karşılaştırdığı romanı hangisidir?', '["Felatun Bey ile Rakım Efendi","Hasan Mellah yahut Sır İçinde Esrar","Demir Bey yahut İnkişaf-ı Esrar","Henüz On Yedi Yaşında"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('Reşat Nuri''nin ''Çalıkuşu'' romanında Feride''nin öğretmenlik yaptığı ilk köy hangisidir?', '["Zeyniler","Kırlangıç","Dervişler","Yeşilyurt"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('Recaizade Mahmut Ekrem''in ''Araba Sevdası'' romanının alafranga züppe kahramanı kimdir?', '["Bihruz Bey","Felatun Bey","Behlül Bey","Adnan Bey"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('Ray Bradbury''nin Mars''a yerleşen insanları anlatan 1950 tarihli öykü kitabı hangisidir?', '["Mars Yıllıkları","Resimli Adam","Kızıl Gezegen","Güneşin Altın Elmaları"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('Kafka''nın ''Dönüşüm'' öyküsünde bir sabah böceğe dönüşen Gregor Samsa''nın mesleği nedir?', '["Gezici satıcı","Demiryolu memuru","Postane memuru","Muhasebe katibi"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('Dede Korkut hikâyelerinde Azrail''e meydan okuyan kahraman kimdir?', '["Deli Dumrul","Bamsı Beyrek","Kan Turalı","Basat"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('''Buzul Çağının Virüsü'' romanının yazarı kimdir?', '["Vüsat O. Bener","Bilge Karasu","Yusuf Atılgan","Ahmet Hamdi Tanpınar"]'::jsonb, 0, 'edebiyat', 'global', null, 5),
('''Semenderlerle Savaş'' romanının yazarı olan Çek yazar kimdir?', '["Karel Čapek","Jaroslav Hašek","Bohumil Hrabal","Milan Kundera"]'::jsonb, 0, 'edebiyat', 'global', null, 5),
('''Ben Sana Mecburum'' şiirinin şairi kimdir?', '["Attilâ İlhan","Ümit Yaşar Oğuzcan","Ahmed Arif","Cemal Süreya"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('Reşat Nuri Güntekin''in ''Yaprak Dökümü'' romanında ailesinin çözülüşünü çaresizce izleyen baba kimdir?', '["Ali Rıza Bey","Adnan Bey","Cevdet Bey","Hacı Kâmil Bey"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('Kuzey yarımkürede yön bulmada kullanılan Kutup Yıldızı''nın uluslararası adı nedir?', '["Polaris","Vega","Capella","Deneb"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Adını dinamitin mucidinden alan element hangisidir?', '["Nobelyum","Einsteinyum","Fermiyum","Mendelevyum"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Lyme hastalığı insana hangi canlının ısırığıyla bulaşır?', '["Kene","Sivrisinek","Pire","Tatarcık"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Eşittir (=) işaretini 1557''de ilk kez kullanan Galli matematikçi kimdir?', '["Robert Recorde","John Napier","Thomas Harriot","Henry Briggs"]'::jsonb, 0, 'bilim', 'global', null, 5),
('Güneş Sistemi''nin bilinen en büyük kanyon sistemi Valles Marineris hangi gezegendedir?', '["Mars","Venüs","Merkür","Jüpiter"]'::jsonb, 0, 'bilim', 'global', null, 3),
('1997''de Mars yüzeyinde dolaşan ilk tekerlekli gezici robot hangisidir?', '["Sojourner","Spirit","Opportunity","Curiosity"]'::jsonb, 0, 'bilim', 'global', null, 4),
('''Gülme gazı'' olarak bilinen bileşik hangisidir?', '["Diazot monoksit","Karbon monoksit","Kükürt dioksit","Azot dioksit"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Sarılıkta cilde ve göz akına sarı rengi veren madde hangisidir?', '["Bilirubin","Melanin","Hemoglobin","Keratin"]'::jsonb, 0, 'bilim', 'global', null, 4),
('20 °C sıcaklıktaki havada sesin hızı yaklaşık kaç metre/saniyedir?', '["343","243","443","543"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Mutlak sıcaklık ölçeğine adını veren Lord Kelvin''in asıl adı nedir?', '["William Thomson","James Joule","William Rankine","Humphry Davy"]'::jsonb, 0, 'bilim', 'global', null, 5),
('Renk körlüğünü ilk kez bilimsel olarak tanımlayan, kendisi de renk körü olan kimyager kimdir?', '["John Dalton","Humphry Davy","Joseph Priestley","Robert Boyle"]'::jsonb, 0, 'bilim', 'global', null, 4),
('Arşimet''in hamamda ''Eureka!'' diye bağırdığı anlatılan buluşu hangi sorunu çözmesini sağlamıştı?', '["Tacın sahte olup olmadığını","Sütunun ne kadar yük taşıdığını","Kaldıracın nasıl çalıştığını","Suyun yukarı nasıl taşınacağını"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Bebeklerin kafatası kemikleri arasındaki kapanmamış yumuşak bölgeye halk arasında ne denir?', '["Bıngıldak","Kıkırdak","Alın çukuru","Tepelik"]'::jsonb, 0, 'bilim', 'global', null, 2),
('İnsanda süt dişlerinin toplam sayısı kaçtır?', '["20","16","24","28"]'::jsonb, 0, 'bilim', 'global', null, 2),
('Fizikçi Murray Gell-Mann ''kuark'' sözcüğünü hangi yazarın bir kitabından almıştır?', '["James Joyce","Lewis Carroll","T. S. Eliot","Samuel Beckett"]'::jsonb, 0, 'bilim', 'global', null, 5),
('Parçacık etkileşimlerini basit çizimlerle gösteren diyagramlara adını veren fizikçi kimdir?', '["Richard Feynman","Paul Dirac","Murray Gell-Mann","Wolfgang Pauli"]'::jsonb, 0, 'bilim', 'global', null, 3),
('''Homo sapiens'' adı Latincede ne anlama gelir?', '["Bilge insan","Dik insan","Becerikli insan","Öncü insan"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Ay''ın yörüngesine giren ilk insanlı uzay görevi hangisidir?', '["Apollo 8","Apollo 7","Apollo 10","Gemini 7"]'::jsonb, 0, 'bilim', 'global', null, 4),
('Plütonyum dahil on elementin keşfine katılan ve yaşarken adı bir elemente verilen ilk bilim insanı kimdir?', '["Glenn Seaborg","Ernest Lawrence","Enrico Fermi","Emilio Segre"]'::jsonb, 0, 'bilim', 'global', null, 4),
('Kurbağa yavrusuna ne ad verilir?', '["İribaş","Tırtıl","Kurtçuk","Pupa"]'::jsonb, 0, 'bilim', 'global', null, 1),
('Adı Yunanca ''tembel'' anlamına gelen soy gaz hangisidir?', '["Argon","Neon","Kripton","Ksenon"]'::jsonb, 0, 'bilim', 'global', null, 4),
('2005''te keşfedilip Plüton''un ''cüce gezegen'' sayılmasına yol açan gök cismi hangisidir?', '["Eris","Sedna","Makemake","Haumea"]'::jsonb, 0, 'bilim', 'global', null, 5),
('Abraham Lincoln''ü 1865''te Ford Tiyatrosu''nda vuran suikastçı kimdir?', '["John Wilkes Booth","Lee Harvey Oswald","Charles Guiteau","Leon Czolgosz"]'::jsonb, 0, 'tarih', 'global', null, 3),
('1945''te Kore''yi Sovyet ve Amerikan bölgelerine ayıran sınır hangi enlem çizgisidir?', '["38. paralel","17. paralel","36. paralel","49. paralel"]'::jsonb, 0, 'tarih', 'global', null, 3),
('Jeanne d''Arc 1429''da hangi kentin kuşatmasını kaldırarak ün kazanmıştır?', '["Orleans","Reims","Rouen","Calais"]'::jsonb, 0, 'tarih', 'global', null, 3),
('1827''de Osmanlı-Mısır donanmasının İngiliz, Fransız ve Rus filolarınca yakıldığı baskın hangisidir?', '["Navarin","Çeşme","Sinop","Preveze"]'::jsonb, 0, 'tarih', 'global', null, 4),
('1961''de ABD destekli sürgünlerin başarısız ''Domuzlar Körfezi Çıkarması'' hangi ülkeye yapılmıştır?', '["Küba","Nikaragua","Guatemala","Panama"]'::jsonb, 0, 'tarih', 'global', null, 3),
('Gdańsk tersanesinde bir elektrikçi olarak başlayıp 1990''da Polonya cumhurbaşkanı olan sendika lideri kimdir?', '["Lech Wałęsa","Wojciech Jaruzelski","Tadeusz Mazowiecki","Aleksander Kwaśniewski"]'::jsonb, 0, 'tarih', 'global', null, 4),
('1916''da Kûtülamâre''de Osmanlı ordusuna teslim olan İngiliz komutan kimdir?', '["Charles Townshend","Edmund Allenby","Ian Hamilton","Frederick Maude"]'::jsonb, 0, 'tarih', 'global', null, 5),
('1396 Niğbolu Savaşı''nda Haçlı ordusunu yenen Osmanlı padişahı kimdir?', '["I. Bayezid","I. Murad","Orhan Bey","Çelebi Mehmed"]'::jsonb, 0, 'tarih', 'global', null, 3),
('Jül Sezar''ın öldürüldüğü 15 Mart gününe Roma takviminde ne ad verilir?', '["Mart İdusu","Mart Kalendası","Mart Nonası","Mart Ekinoksu"]'::jsonb, 0, 'tarih', 'global', null, 4),
('Titanik 1912''deki ilk ve son seferine hangi limandan çıkmıştır?', '["Southampton","Liverpool","Belfast","Plymouth"]'::jsonb, 0, 'tarih', 'global', null, 3),
('1570-1571''de Kıbrıs''ın fethini karada yöneten Osmanlı komutanı kimdir?', '["Lala Mustafa Paşa","Sokullu Mehmed Paşa","Kılıç Ali Paşa","Özdemiroğlu Osman Paşa"]'::jsonb, 0, 'tarih', 'global', null, 4),
('İstanbul''un fethinden kısa süre sonra II. Mehmed tarafından idam ettirilen sadrazam kimdir?', '["Çandarlı Halil Paşa","Zağanos Paşa","Mahmud Paşa","Karamani Mehmed Paşa"]'::jsonb, 0, 'tarih', 'global', null, 4),
('1565 Malta Kuşatması sırasında şehit düşen ünlü Osmanlı denizcisi kimdir?', '["Turgut Reis","Piyale Paşa","Kılıç Ali Paşa","Salih Reis"]'::jsonb, 0, 'tarih', 'global', null, 4),
('Don ve Volga nehirlerini bir kanalla birleştirme projesini başlatan Osmanlı sadrazamı kimdir?', '["Sokullu Mehmed Paşa","Rüstem Paşa","Kuyucu Murad Paşa","Merzifonlu Kara Mustafa Paşa"]'::jsonb, 0, 'tarih', 'global', null, 4),
('Fatih Sultan Mehmed''in 1452''de İstanbul Boğazı''nda yaptırdığı, ''Boğazkesen'' diye de anılan hisar hangisidir?', '["Rumeli Hisarı","Anadolu Hisarı","Yedikule Hisarı","Kilitbahir Kalesi"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Osman Bey''in 1302''de Bizans''a karşı kazandığı ve Osmanlı''nın ilk büyük zaferi sayılan savaş hangisidir?', '["Koyunhisar","Pelekanon","Sırpsındığı","Kosova"]'::jsonb, 0, 'tarih', 'global', null, 4),
('Mustafa Kemal''in 19 Mayıs 1919''da Samsun''a çıktığı vapurun adı nedir?', '["Bandırma","Gülcemal","Ertuğrul","Tarı"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Safevilerle 1639 yılında imzalanan ve iki devlet arasındaki sınırı uzun süre belirleyen Kasr-ı Şirin Antlaşması hangi padişah döneminde yapılmıştır?', '["IV. Murad","I. İbrahim","III. Murad","II. Osman"]'::jsonb, 0, 'tarih', 'global', null, 4),
('Efsaneye göre Roma''nın kurucuları Romulus ile Remus''u emziren hayvan hangisidir?', '["Kurt","Ayı","Keçi","Geyik"]'::jsonb, 0, 'tarih', 'global', null, 1),
('İngilizcedeki ''July'' (Temmuz) ayı adını kimden almıştır?', '["Jül Sezar","Tanrı Janus","Tanrı Mars","İmparator Augustus"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Sandviç adını hangi İngiliz soylusundan almıştır?', '["Sandwich Kontu","Wellington Dükü","Cardigan Kontu","Grey Kontu"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('Yapay dil Esperanto adını yaratıcısının takma adından alır; bu sözcük ne anlama gelir?', '["Umut eden","Barış getiren","Birleştiren","Anlaşan"]'::jsonb, 0, 'genel_kultur', 'global', null, 4),
('''Leviathan'' adlı siyaset felsefesi eserinin yazarı kimdir?', '["Thomas Hobbes","John Locke","Jean-Jacques Rousseau","Niccolò Machiavelli"]'::jsonb, 0, 'genel_kultur', 'global', null, 4),
('Minyatür ağaç yetiştirme sanatının Japonca adı nedir?', '["Bonsai","Ikebana","Origami","Kintsugi"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Perçinli kot pantolonun patentini 1873''te Levi Strauss ile birlikte alan terzi kimdir?', '["Jacob Davis","Henry David Lee","Isaac Singer","Charles Goodyear"]'::jsonb, 0, 'genel_kultur', 'global', null, 5),
('Coca-Cola''yı 1886''da Atlanta''da ilk kez hazırlayan eczacı kimdir?', '["John Pemberton","Caleb Bradham","Charles Alderton","Asa Candler"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('''Gereksiz yere varsayım çoğaltılmamalıdır'' ilkesiyle anılan 14. yüzyıl filozofu kimdir?', '["Ockhamlı William","Roger Bacon","Thomas Aquinas","Duns Scotus"]'::jsonb, 0, 'genel_kultur', 'global', null, 4),
('Sokrates''in idam edilirken içtiği zehir hangi bitkiden elde edilmiştir?', '["Baldıran","Banotu","Güzelavratotu","Yüksükotu"]'::jsonb, 0, 'genel_kultur', 'global', null, 3)
on conflict (soru) do nothing;

-- ---------------------------------------------------- İngilizce çeviri
insert into public.question_translations (question_id, dil, soru, secenekler)
select q.id, 'en', v.en_soru, v.en_secenekler
  from (values
  ('Microsoft''un adını Halo oyunundaki bir yapay zekâ karakterinden alan sesli asistanı hangisidir?', 'Which Microsoft voice assistant is named after an AI character from the game Halo?', '["Cortana","Alexa","Siri","Bixby"]'::jsonb),
  ('Wi-Fi teknolojisinin temel patentlerinden birini alan devlet araştırma kurumu CSIRO hangi ülkenindir?', 'CSIRO, the government research agency that holds a key Wi-Fi patent, belongs to which country?', '["Australia","Canada","Sweden","Finland"]'::jsonb),
  ('''Final Fantasy'' oyun serisinin yaratıcısı kimdir?', 'Who created the ''Final Fantasy'' video game series?', '["Hironobu Sakaguchi","Hideo Kojima","Shigeru Miyamoto","Koji Igarashi"]'::jsonb),
  ('Çalan şarkıyı tanıyan Shazam uygulamasını 2018''de satın alan şirket hangisidir?', 'Which company bought the song-recognition app Shazam in 2018?', '["Apple","Google","Spotify","Microsoft"]'::jsonb),
  ('''Civilization'' strateji oyunu serisinin yaratıcısı kimdir?', 'Who created the ''Civilization'' strategy game series?', '["Sid Meier","Will Wright","Peter Molyneux","Richard Garriott"]'::jsonb),
  ('Mortal Kombat serisini John Tobias ile birlikte yaratan programcı kimdir?', 'Which programmer created the Mortal Kombat series together with John Tobias?', '["Ed Boon","John Romero","Tim Schafer","Sid Meier"]'::jsonb),
  ('Sonic the Hedgehog''un yaratıcılarından olan Sega programcısı kimdir?', 'Which Sega programmer was one of the creators of Sonic the Hedgehog?', '["Yuji Naka","Satoshi Tajiri","Hideo Kojima","Shigeru Miyamoto"]'::jsonb),
  ('1987''de GIF görüntü biçimini geliştiren çevrim içi hizmet şirketi hangisidir?', 'Which online service company developed the GIF image format in 1987?', '["CompuServe","Prodigy","America Online","Netscape"]'::jsonb),
  ('USB standardının geliştirilmesine öncülük eden Intel mühendisi kimdir?', 'Which Intel engineer led the development of the USB standard?', '["Ajay Bhatt","Federico Faggin","Ted Hoff","Andy Grove"]'::jsonb),
  ('1978 yapımı Space Invaders oyununu piyasaya süren Japon şirketi hangisidir?', 'Which Japanese company released the 1978 game Space Invaders?', '["Taito","Namco","Konami","Capcom"]'::jsonb),
  ('1958''de bir osiloskop ekranında oynanan ''Tennis for Two'' oyununu tasarlayan fizikçi kimdir?', 'Which physicist designed ''Tennis for Two'', a game played on an oscilloscope screen in 1958?', '["William Higinbotham","Ralph Henry Baer","Steve Russell","Nolan Bushnell"]'::jsonb),
  ('Hotmail''i 1996''da Jack Smith ile birlikte kuran girişimci kimdir?', 'Which entrepreneur co-founded Hotmail with Jack Smith in 1996?', '["Sabeer Bhatia","Vinod Khosla","Sundar Pichai","Satya Nadella"]'::jsonb),
  ('Motorola''nın 1983''te satışa çıkardığı ilk ticari el tipi cep telefonunun model adı nedir?', 'What was the model name of Motorola''s first commercial handheld mobile phone, released in 1983?', '["DynaTAC 8000X","StarTAC 3000","MicroTAC 9800X","RAZR V3"]'::jsonb),
  ('Microsoft Office''e 1997''de eklenen ataç biçimli yardımcı karakterin adı nedir?', 'What was the name of the paper-clip-shaped assistant added to Microsoft Office in 1997?', '["Clippy","Cortana","Rover","Bob"]'::jsonb),
  ('Grand Theft Auto serisini yayımlayan şirket hangisidir?', 'Which company publishes the Grand Theft Auto series?', '["Rockstar Games","Ubisoft","Electronic Arts","Activision"]'::jsonb),
  ('Tatlı adları taşıyan Android sürümleri arasında ilk tatlı adını alan sürüm hangisidir?', 'Among the dessert-named Android versions, which was the first to get a dessert name?', '["Cupcake","Donut","Eclair","Froyo"]'::jsonb),
  ('Ağ bağlantısını sınayan ''ping'' komutu adını hangi aygıtın çıkardığı sesten almıştır?', 'The ''ping'' network command is named after the sound made by which device?', '["Sonar","Radar","Telegraph","Metronome"]'::jsonb),
  ('Rus sosyal ağı VKontakte''yi ve Telegram''ı kuran girişimci kimdir?', 'Which entrepreneur founded the Russian social network VKontakte and Telegram?', '["Pavel Durov","Yuri Milner","Arkady Volozh","Eugene Kaspersky"]'::jsonb),
  ('Doom''un tasarımcılarından olup ardından ''Daikatana''yı yapan oyun geliştiricisi kimdir?', 'Which game developer, one of Doom''s designers, went on to make ''Daikatana''?', '["John Romero","John Carmack","Gabe Newell","Cliff Bleszinski"]'::jsonb),
  ('Unix dünyasının klasik metin düzenleyicisi vi''yi 1976''da yazan programcı kimdir?', 'Which programmer wrote vi, the classic Unix text editor, in 1976?', '["Bill Joy","Richard Stallman","Ken Thompson","Brian Kernighan"]'::jsonb),
  ('Wikipedia''dan önce Jimmy Wales ile Larry Sanger''ın başlattığı, uzmanlarca yazılan çevrim içi ansiklopedi hangisidir?', 'Before Wikipedia, what was the expert-written online encyclopedia launched by Jimmy Wales and Larry Sanger?', '["Nupedia","Encarta","Everipedia","Interpedia"]'::jsonb),
  ('''Kes, kopyala, yapıştır'' komutlarını Xerox PARC''ta geliştiren bilgisayar bilimci kimdir?', 'Which computer scientist developed the ''cut, copy, paste'' commands at Xerox PARC?', '["Larry Tesler","Alan Kay","Butler Lampson","Charles Simonyi"]'::jsonb),
  ('Super Mario oyunlarında Bowser''ın sık sık kaçırdığı prenses kimdir?', 'In the Super Mario games, which princess does Bowser frequently kidnap?', '["Peach","Zelda","Rosalina","Pauline"]'::jsonb),
  ('IBM PC için Ctrl+Alt+Del tuş birleşimini tasarlayan mühendis kimdir?', 'Which engineer designed the Ctrl+Alt+Del key combination for the IBM PC?', '["David Bradley","Mark Dean","Don Estridge","Bill Lowe"]'::jsonb),
  ('Arkeolog Lara Croft''un başrolde olduğu oyun serisi hangisidir?', 'Which video game series stars the archaeologist Lara Croft?', '["Tomb Raider","Uncharted","Prince of Persia","Resident Evil"]'::jsonb),
  ('Nintendo oyunlarında düşmanlarını yutup yeteneklerini kopyalayan pembe karakter kimdir?', 'In Nintendo games, which pink character swallows enemies and copies their abilities?', '["Kirby","Toad","Birdo","Wario"]'::jsonb),
  ('Angry Birds oyununda kuşların yumurtalarını çalan düşmanlar hangi hayvanlardır?', 'In Angry Birds, which animals steal the birds'' eggs?', '["Pigs","Cats","Foxes","Snakes"]'::jsonb),
  ('İlk Macintosh''un simgelerini ve yazı tiplerini tasarlayan grafik tasarımcı kimdir?', 'Which graphic designer created the icons and fonts of the original Macintosh?', '["Susan Kare","Paula Scher","April Greiman","Muriel Cooper"]'::jsonb),
  ('''Ivanhoe'' romanının yazarı kimdir?', 'Who wrote the novel ''Ivanhoe''?', '["Walter Scott","Robert Louis Stevenson","Charles Dickens","William Thackeray"]'::jsonb),
  ('Gerçek adı François-Marie Arouet olan Fransız yazar hangi adla tanınır?', 'The French writer born François-Marie Arouet is known by which name?', '["Voltaire","Rousseau","Diderot","Montesquieu"]'::jsonb),
  ('Tolkien''in ''Hobbit'' romanında cücelerle birlikte Yalnız Dağ''a yolculuğa çıkan hobbit kimdir?', 'In Tolkien''s ''The Hobbit'', which hobbit sets out with the dwarves on the journey to the Lonely Mountain?', '["Bilbo Baggins","Frodo Baggins","Samwise Gamgee","Peregrin Took"]'::jsonb),
  ('''Açlık'' romanıyla tanınan 1920 Nobel Edebiyat Ödüllü Norveçli yazar kimdir?', 'Which Norwegian writer, known for the novel ''Hunger'', won the 1920 Nobel Prize in Literature?', '["Knut Hamsun","Henrik Ibsen","Bjørnstjerne Bjørnson","Sigrid Undset"]'::jsonb),
  ('Kral Arthur efsanesinde Arthur''un kılıcının adı nedir?', 'In the legend of King Arthur, what is the name of Arthur''s sword?', '["Excalibur","Durendal","Zulfiqar","Kusanagi"]'::jsonb),
  ('''Monte Kristo Kontu''nda Edmond Dantès''in haksız yere hapsedildiği kale hangisidir?', 'In ''The Count of Monte Cristo'', in which fortress is Edmond Dantès wrongly imprisoned?', '["Château d''If","The Bastille","Château de Vincennes","Château de Chillon"]'::jsonb),
  ('E. B. White''ın ''Charlotte''un Ağı'' romanında örümcek Charlotte''un hayatını kurtardığı domuz kimdir?', 'In E. B. White''s ''Charlotte''s Web'', which pig does the spider Charlotte save?', '["Wilbur","Babe","Napoleon","Templeton"]'::jsonb),
  ('''Küçük Kadınlar'' romanındaki March kardeşlerden yazar olmak isteyen kimdir?', 'In ''Little Women'', which of the March sisters wants to become a writer?', '["Jo","Meg","Beth","Amy"]'::jsonb),
  ('''Suç ve Ceza''da Raskolnikov''un suçunu itiraf ettiği ve onunla Sibirya''ya giden genç kadın kimdir?', 'In ''Crime and Punishment'', which young woman, to whom Raskolnikov confesses, follows him to Siberia?', '["Sonya","Dunya","Nastasya","Pulcheria"]'::jsonb),
  ('''Sefiller''de Jean Valjean''ın kürek mahkûmu olarak taşıdığı numara nedir?', 'In ''Les Misérables'', what was Jean Valjean''s number as a galley convict?', '["24601","24061","26401","20461"]'::jsonb),
  ('Goethe''nin ''Faust''unda Faust''un ruhu karşılığında anlaşma yaptığı şeytan kimdir?', 'In Goethe''s ''Faust'', which devil makes a pact with Faust for his soul?', '["Mephisto","Lucifer","Beelzebub","Asmodeus"]'::jsonb),
  ('Ray Bradbury''nin Mars''a yerleşen insanları anlatan 1950 tarihli öykü kitabı hangisidir?', 'Which 1950 story collection by Ray Bradbury describes humans settling on Mars?', '["The Martian Chronicles","The Illustrated Man","Red Planet","The Golden Apples of the Sun"]'::jsonb),
  ('Kafka''nın ''Dönüşüm'' öyküsünde bir sabah böceğe dönüşen Gregor Samsa''nın mesleği nedir?', 'In Kafka''s ''The Metamorphosis'', what is the job of Gregor Samsa, who wakes up as an insect?', '["Travelling salesman","Railway ticket clerk","Post office clerk","Accounts clerk"]'::jsonb),
  ('Dede Korkut hikâyelerinde Azrail''e meydan okuyan kahraman kimdir?', 'In the Book of Dede Korkut, which hero challenges Azrael, the angel of death?', '["Deli Dumrul","Bamsı Beyrek","Kan Turalı","Basat"]'::jsonb),
  ('''Semenderlerle Savaş'' romanının yazarı olan Çek yazar kimdir?', 'Which Czech writer wrote the novel ''War with the Newts''?', '["Karel Čapek","Jaroslav Hašek","Bohumil Hrabal","Milan Kundera"]'::jsonb),
  ('Reşat Nuri Güntekin''in ''Yaprak Dökümü'' romanında ailesinin çözülüşünü çaresizce izleyen baba kimdir?', 'In Reşat Nuri Güntekin''s novel ''Yaprak Dökümü'' (Falling Leaves), which father helplessly watches his family fall apart?', '["Ali Rıza Bey","Adnan Bey","Cevdet Bey","Hacı Kâmil Bey"]'::jsonb),
  ('Kuzey yarımkürede yön bulmada kullanılan Kutup Yıldızı''nın uluslararası adı nedir?', 'What is the international name of the North Star, used for navigation in the Northern Hemisphere?', '["Polaris","Vega","Capella","Deneb"]'::jsonb),
  ('Adını dinamitin mucidinden alan element hangisidir?', 'Which element is named after the inventor of dynamite?', '["Nobelium","Einsteinium","Fermium","Mendelevium"]'::jsonb),
  ('Lyme hastalığı insana hangi canlının ısırığıyla bulaşır?', 'Lyme disease is transmitted to humans by the bite of which creature?', '["Tick","Mosquito","Flea","Sandfly"]'::jsonb),
  ('Eşittir (=) işaretini 1557''de ilk kez kullanan Galli matematikçi kimdir?', 'Which Welsh mathematician first used the equals sign (=) in 1557?', '["Robert Recorde","John Napier","Thomas Harriot","Henry Briggs"]'::jsonb),
  ('Güneş Sistemi''nin bilinen en büyük kanyon sistemi Valles Marineris hangi gezegendedir?', 'On which planet is Valles Marineris, the largest known canyon system in the Solar System?', '["Mars","Venus","Mercury","Jupiter"]'::jsonb),
  ('1997''de Mars yüzeyinde dolaşan ilk tekerlekli gezici robot hangisidir?', 'In 1997, which became the first wheeled rover to roam the surface of Mars?', '["Sojourner","Spirit","Opportunity","Curiosity"]'::jsonb),
  ('''Gülme gazı'' olarak bilinen bileşik hangisidir?', 'Which compound is known as ''laughing gas''?', '["Nitrous oxide","Carbon monoxide","Sulphur dioxide","Nitrogen dioxide"]'::jsonb),
  ('Sarılıkta cilde ve göz akına sarı rengi veren madde hangisidir?', 'In jaundice, which substance gives the skin and the whites of the eyes their yellow colour?', '["Bilirubin","Melanin","Hemoglobin","Keratin"]'::jsonb),
  ('20 °C sıcaklıktaki havada sesin hızı yaklaşık kaç metre/saniyedir?', 'Roughly how many metres per second does sound travel in air at 20 °C?', '["343","243","443","543"]'::jsonb),
  ('Mutlak sıcaklık ölçeğine adını veren Lord Kelvin''in asıl adı nedir?', 'What was the real name of Lord Kelvin, after whom the absolute temperature scale is named?', '["William Thomson","James Joule","William Rankine","Humphry Davy"]'::jsonb),
  ('Renk körlüğünü ilk kez bilimsel olarak tanımlayan, kendisi de renk körü olan kimyager kimdir?', 'Which chemist, himself colour-blind, was the first to describe colour blindness scientifically?', '["John Dalton","Humphry Davy","Joseph Priestley","Robert Boyle"]'::jsonb),
  ('Arşimet''in hamamda ''Eureka!'' diye bağırdığı anlatılan buluşu hangi sorunu çözmesini sağlamıştı?', 'Archimedes'' ''Eureka!'' discovery in the bath is said to have solved which problem?', '["Whether a crown was fake","How much load a column bears","How a lever works","How to raise water uphill"]'::jsonb),
  ('Bebeklerin kafatası kemikleri arasındaki kapanmamış yumuşak bölgeye halk arasında ne denir?', 'What is the common name for the gap between a baby''s skull bones that has not yet closed?', '["Soft spot","Cartilage","Brow hollow","Crown"]'::jsonb),
  ('İnsanda süt dişlerinin toplam sayısı kaçtır?', 'How many milk (baby) teeth does a human have in total?', '["20","16","24","28"]'::jsonb),
  ('Fizikçi Murray Gell-Mann ''kuark'' sözcüğünü hangi yazarın bir kitabından almıştır?', 'From which writer''s book did physicist Murray Gell-Mann take the word ''quark''?', '["James Joyce","Lewis Carroll","T. S. Eliot","Samuel Beckett"]'::jsonb),
  ('Parçacık etkileşimlerini basit çizimlerle gösteren diyagramlara adını veren fizikçi kimdir?', 'Which physicist gave his name to the diagrams that depict particle interactions with simple drawings?', '["Richard Feynman","Paul Dirac","Murray Gell-Mann","Wolfgang Pauli"]'::jsonb),
  ('''Homo sapiens'' adı Latincede ne anlama gelir?', 'What does the name ''Homo sapiens'' mean in Latin?', '["Wise man","Upright man","Handy man","Pioneer man"]'::jsonb),
  ('Ay''ın yörüngesine giren ilk insanlı uzay görevi hangisidir?', 'Which was the first crewed space mission to enter lunar orbit?', '["Apollo 8","Apollo 7","Apollo 10","Gemini 7"]'::jsonb),
  ('Plütonyum dahil on elementin keşfine katılan ve yaşarken adı bir elemente verilen ilk bilim insanı kimdir?', 'Which scientist, who helped discover ten elements including plutonium, was the first to have an element named after him while still alive?', '["Glenn Seaborg","Ernest Lawrence","Enrico Fermi","Emilio Segre"]'::jsonb),
  ('Kurbağa yavrusuna ne ad verilir?', 'What is a baby frog called?', '["Tadpole","Caterpillar","Maggot","Pupa"]'::jsonb),
  ('Adı Yunanca ''tembel'' anlamına gelen soy gaz hangisidir?', 'Which noble gas takes its name from the Greek word for ''lazy''?', '["Argon","Neon","Krypton","Xenon"]'::jsonb),
  ('2005''te keşfedilip Plüton''un ''cüce gezegen'' sayılmasına yol açan gök cismi hangisidir?', 'Which body, discovered in 2005, led to Pluto being reclassified as a ''dwarf planet''?', '["Eris","Sedna","Makemake","Haumea"]'::jsonb),
  ('Abraham Lincoln''ü 1865''te Ford Tiyatrosu''nda vuran suikastçı kimdir?', 'Who shot Abraham Lincoln at Ford''s Theatre in 1865?', '["John Wilkes Booth","Lee Harvey Oswald","Charles Guiteau","Leon Czolgosz"]'::jsonb),
  ('1945''te Kore''yi Sovyet ve Amerikan bölgelerine ayıran sınır hangi enlem çizgisidir?', 'In 1945, which line of latitude divided Korea into Soviet and American zones?', '["The 38th parallel","The 17th parallel","The 36th parallel","The 49th parallel"]'::jsonb),
  ('Jeanne d''Arc 1429''da hangi kentin kuşatmasını kaldırarak ün kazanmıştır?', 'Joan of Arc rose to fame in 1429 by lifting the siege of which city?', '["Orleans","Reims","Rouen","Calais"]'::jsonb),
  ('1827''de Osmanlı-Mısır donanmasının İngiliz, Fransız ve Rus filolarınca yakıldığı baskın hangisidir?', 'In which 1827 battle was the Ottoman-Egyptian fleet destroyed by British, French and Russian squadrons?', '["Navarino","Chesma","Sinop","Preveza"]'::jsonb),
  ('1961''de ABD destekli sürgünlerin başarısız ''Domuzlar Körfezi Çıkarması'' hangi ülkeye yapılmıştır?', 'In 1961, the failed US-backed ''Bay of Pigs Invasion'' by exiles targeted which country?', '["Cuba","Nicaragua","Guatemala","Panama"]'::jsonb),
  ('Gdańsk tersanesinde bir elektrikçi olarak başlayıp 1990''da Polonya cumhurbaşkanı olan sendika lideri kimdir?', 'Which trade union leader, who began as an electrician at the Gdańsk shipyard, became President of Poland in 1990?', '["Lech Wałęsa","Wojciech Jaruzelski","Tadeusz Mazowiecki","Aleksander Kwaśniewski"]'::jsonb),
  ('1916''da Kûtülamâre''de Osmanlı ordusuna teslim olan İngiliz komutan kimdir?', 'Which British commander surrendered to the Ottoman army at Kut al-Amara in 1916?', '["Charles Townshend","Edmund Allenby","Ian Hamilton","Frederick Maude"]'::jsonb),
  ('1396 Niğbolu Savaşı''nda Haçlı ordusunu yenen Osmanlı padişahı kimdir?', 'Which Ottoman sultan defeated the Crusader army at the Battle of Nicopolis in 1396?', '["Bayezid I","Murad I","Orhan","Mehmed I"]'::jsonb),
  ('Jül Sezar''ın öldürüldüğü 15 Mart gününe Roma takviminde ne ad verilir?', 'In the Roman calendar, what is 15 March, the day Julius Caesar was killed, called?', '["The Ides of March","The Kalends of March","The Nones of March","The March Equinox"]'::jsonb),
  ('Titanik 1912''deki ilk ve son seferine hangi limandan çıkmıştır?', 'From which port did the Titanic depart on its first and only voyage in 1912?', '["Southampton","Liverpool","Belfast","Plymouth"]'::jsonb),
  ('1570-1571''de Kıbrıs''ın fethini karada yöneten Osmanlı komutanı kimdir?', 'Which Ottoman commander led the land campaign that conquered Cyprus in 1570-1571?', '["Lala Mustafa Pasha","Sokollu Mehmed Pasha","Kılıç Ali Pasha","Özdemiroğlu Osman Pasha"]'::jsonb),
  ('İstanbul''un fethinden kısa süre sonra II. Mehmed tarafından idam ettirilen sadrazam kimdir?', 'Which grand vizier was executed by Mehmed II shortly after the conquest of Constantinople?', '["Çandarlı Halil Pasha","Zağanos Pasha","Mahmud Pasha","Karamani Mehmed Pasha"]'::jsonb),
  ('1565 Malta Kuşatması sırasında şehit düşen ünlü Osmanlı denizcisi kimdir?', 'Which famous Ottoman admiral was killed during the Siege of Malta in 1565?', '["Turgut Reis","Piyale Pasha","Kılıç Ali Pasha","Salih Reis"]'::jsonb),
  ('Don ve Volga nehirlerini bir kanalla birleştirme projesini başlatan Osmanlı sadrazamı kimdir?', 'Which Ottoman grand vizier launched the project to link the Don and Volga rivers with a canal?', '["Sokollu Mehmed Pasha","Rüstem Pasha","Kuyucu Murad Pasha","Merzifonlu Kara Mustafa Pasha"]'::jsonb),
  ('Fatih Sultan Mehmed''in 1452''de İstanbul Boğazı''nda yaptırdığı, ''Boğazkesen'' diye de anılan hisar hangisidir?', 'Which fortress, also called ''Boğazkesen'' (Strait-Cutter), did Mehmed II build on the Bosphorus in 1452?', '["Rumeli Fortress","Anadolu Fortress","Yedikule Fortress","Kilitbahir Castle"]'::jsonb),
  ('Osman Bey''in 1302''de Bizans''a karşı kazandığı ve Osmanlı''nın ilk büyük zaferi sayılan savaş hangisidir?', 'Which battle, won by Osman against the Byzantines in 1302, is considered the first major Ottoman victory?', '["Bapheus","Pelekanon","Maritsa","Kosovo"]'::jsonb),
  ('Mustafa Kemal''in 19 Mayıs 1919''da Samsun''a çıktığı vapurun adı nedir?', 'What was the name of the steamship on which Mustafa Kemal landed at Samsun on 19 May 1919?', '["Bandırma","Gülcemal","Ertuğrul","Tarı"]'::jsonb),
  ('Safevilerle 1639 yılında imzalanan ve iki devlet arasındaki sınırı uzun süre belirleyen Kasr-ı Şirin Antlaşması hangi padişah döneminde yapılmıştır?', 'The 1639 Treaty of Zuhab (Kasr-ı Şirin), which fixed the Ottoman-Safavid border for a long time, was signed during the reign of which sultan?', '["Murad IV","Ibrahim I","Murad III","Osman II"]'::jsonb),
  ('Efsaneye göre Roma''nın kurucuları Romulus ile Remus''u emziren hayvan hangisidir?', 'According to legend, which animal suckled Romulus and Remus, the founders of Rome?', '["Wolf","Bear","Goat","Deer"]'::jsonb),
  ('İngilizcedeki ''July'' (Temmuz) ayı adını kimden almıştır?', 'After whom is the month of July named?', '["Julius Caesar","The god Janus","The god Mars","Emperor Augustus"]'::jsonb),
  ('Sandviç adını hangi İngiliz soylusundan almıştır?', 'The sandwich takes its name from which English nobleman?', '["The Earl of Sandwich","The Duke of Wellington","The Earl of Cardigan","Earl Grey"]'::jsonb),
  ('Yapay dil Esperanto adını yaratıcısının takma adından alır; bu sözcük ne anlama gelir?', 'The constructed language Esperanto takes its name from its creator''s pen name; what does that word mean?', '["One who hopes","One who brings peace","One who unites","One who agrees"]'::jsonb),
  ('''Leviathan'' adlı siyaset felsefesi eserinin yazarı kimdir?', 'Who wrote the work of political philosophy ''Leviathan''?', '["Thomas Hobbes","John Locke","Jean-Jacques Rousseau","Niccolò Machiavelli"]'::jsonb),
  ('Minyatür ağaç yetiştirme sanatının Japonca adı nedir?', 'What is the Japanese name for the art of growing miniature trees?', '["Bonsai","Ikebana","Origami","Kintsugi"]'::jsonb),
  ('Perçinli kot pantolonun patentini 1873''te Levi Strauss ile birlikte alan terzi kimdir?', 'Which tailor patented riveted denim jeans together with Levi Strauss in 1873?', '["Jacob Davis","Henry David Lee","Isaac Singer","Charles Goodyear"]'::jsonb),
  ('Coca-Cola''yı 1886''da Atlanta''da ilk kez hazırlayan eczacı kimdir?', 'Which pharmacist first made Coca-Cola in Atlanta in 1886?', '["John Pemberton","Caleb Bradham","Charles Alderton","Asa Candler"]'::jsonb),
  ('''Gereksiz yere varsayım çoğaltılmamalıdır'' ilkesiyle anılan 14. yüzyıl filozofu kimdir?', 'Which 14th-century philosopher is associated with the principle ''entities should not be multiplied without necessity''?', '["William of Ockham","Roger Bacon","Thomas Aquinas","John Duns Scotus"]'::jsonb),
  ('Sokrates''in idam edilirken içtiği zehir hangi bitkiden elde edilmiştir?', 'The poison Socrates drank at his execution was made from which plant?', '["Hemlock","Henbane","Belladonna","Foxglove"]'::jsonb)
  ) v(soru, en_soru, en_secenekler)
  join public.questions q on q.soru = v.soru and q.created_at >= transaction_timestamp()
on conflict (question_id, dil) do nothing;

-- ---------------------------------------------------- Çevrilmeyenler
insert into public.ceviri_atlanan (question_id, dil, neden, kod)
select q.id, 'en', v.neden, 'cevrilemez'
  from (values
  ('Kemal Tahir''in işgal altındaki İstanbul''da Kâmil Bey''in hikâyesini anlatan romanı hangisidir?', 'Türkçe roman adlarından seçim; İngilizce oyuncu için anlamlı değil.'),
  ('Ahmet Mithat Efendi''nin alafranga bir züppe ile çalışkan, kendini yetiştirmiş bir genci karşılaştırdığı romanı hangisidir?', 'Türkçe roman adlarından seçim; İngilizce oyuncu için anlamlı değil.'),
  ('Reşat Nuri''nin ''Çalıkuşu'' romanında Feride''nin öğretmenlik yaptığı ilk köy hangisidir?', 'Türk edebiyatına özgü; İngilizce oyuncu için anlamsız'),
  ('Recaizade Mahmut Ekrem''in ''Araba Sevdası'' romanının alafranga züppe kahramanı kimdir?', 'Türk edebiyatına özgü; İngilizce oyuncu için anlamsız'),
  ('''Buzul Çağının Virüsü'' romanının yazarı kimdir?', 'Türk edebiyatına özgü; İngilizce oyuncu için anlamsız'),
  ('''Ben Sana Mecburum'' şiirinin şairi kimdir?', 'Türk edebiyatına özgü; İngilizce oyuncu için anlamsız')
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
