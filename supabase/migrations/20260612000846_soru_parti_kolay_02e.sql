-- ============================================================
-- 846 — soru_parti_kolay_02e (stil: docs/SORU_STIL_PROFILI.md): 149 soru · 2026-10-01
--
-- Kategori: edebiyat 18 · genel_kultur 12 · muzik 36 · sanat 39 · sinema 4 · spor 10 · tarih 4 · teknoloji 26
-- Yerel (kapsam='yerel', ulke='TR'): 10 · zorluk 1–5: 0/149/0/0/0
-- İngilizce çeviri: YAPILMADI (arayüz kararı: soru çevirisi şimdilik yok)
--
-- Kalite: her soru Jev kapısından geçti (doğru cevap verilmeden, şıklar karıştırılarak;
-- Jev >0,9 güvenle başka şık diyen soru elendi ya da düzeltilip yeniden soruldu), şık
-- denge kapısı (soru_kural_isaretleri, ağırlık ≥ 2) veritabanında doğrulandı, havuzla
-- birebir ve anlamca tekrar tarandı. Zorluk: yazar etiketi; Jev puanıyla açık çelişkide
-- düzeltildi (araclar/soru-uretim/birlestir-parti.mjs).
--
-- Sıra: sorular doğru şık 0'da eklenir, çeviriler aynı sırayla yazılır, sonunda YALNIZ
-- bu işlemde eklenen satırların şıkları karıştırılır — TR ve EN AYNI permütasyonla
-- (dogru_cevap indeksi ortak olduğu için şart). `created_at >= transaction_timestamp()`
-- koşulu ZORUNLUDUR; onsuz tüm havuz karışır ve oynanan maçlarda indeks kayar.
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti 6 --no 846 --klasor kolay-02e --ad soru_parti_kolay_02e --cevirisiz
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
('Küçük Deniz Kızı heykeli hangi şehirdedir?', '["Kopenhag","Oslo","Stockholm","Helsinki"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Monet''nin ünlü serilerinde göletlerde resmettiği çiçek hangisidir?', '["Nilüfer","Gül","Lale","Papatya"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Madrid''deki ünlü ressam müzesi hangisidir?', '["Prado","Louvre","Uffizi","Orsay"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Picasso''nun Alman bombardımanını anlatan, siyah beyaz dev tablosunun adı nedir?', '["Guernica","Çığlık","Pietà","Las Meninas"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Dünyaca ünlü Bolşoy Balesi hangi ülkededir?', '["Rusya","Fransa","İtalya","Almanya"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Kimliği hâlâ gizli olan, duvarlara yaptığı eleştirel resimlerle tanınan sokak sanatçısı kimdir?', '["Banksy","Picasso","Van Gogh","Andy Warhol"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Osmanlı''da kitapları süsleyen küçük boyutlu resim sanatına ne ad verilir?', '["Minyatür","Fresk","Afiş","Karikatür"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Çin ve Japonya''da görülen, çok katlı çatılı kule biçimli yapıya ne ad verilir?', '["Pagoda","Minare","Kubbe","Kemer"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Tate Modern müzesi hangi şehirdedir?', '["Londra","Paris","New York","Amsterdam"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Tiyatroda oyuncuların sözlerini unutunca onları kurtaran kişiye ne ad verilir?', '["Suflör","Dekoratör","Rejisör","Işıkçı"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Louvre''daki ünlü ''Milo Venüsü'' heykelinin en bilinen özelliği nedir?', '["Kollarının olmaması","Başının olmaması","Ayaklarının olmaması","Gözlerinin olmaması"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Hollandalı ressam Vermeer''in en ünlü tablosunda ne giyen genç bir kız resmedilmiştir?', '["İnci küpe","Altın taç","Kırmızı şal","Mavi şapka"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Mimar Sinan''ın İstanbul''daki en bilinen eseri olan cami hangisidir?', '["Süleymaniye","Sultanahmet","Ortaköy","Nusretiye"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Klasik bale gösterilerinde dansçıların ucunda yürüdüğü ayakkabılara ne ad verilir?', '["Puant","Çizme","Sandalet","Terlik"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Gotik katedrallerde ışık süzen renkli cam pencerelere ne ad verilir?', '["Vitray","Mozaik","Fresk","Kabartma"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Gotik mimarinin simgesi olan Paris''teki katedral hangisidir?', '["Notre Dame","Sacré-Cœur","Saint-Denis","Chartres"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Güzel yazı yazan sanatçıya ne ad verilir?', '["Hattat","Ressam","Nakkaş","Müzehhip"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Hollandalı ressam Rembrandt hangi tür tablolarıyla ünlüdür?', '["Portre","Natürmort","Soyut","Manzara"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Heykellerde en çok kullanılan değerli beyaz taş hangisidir?', '["Mermer","Granit","Bazalt","Kireçtaşı"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Andy Warhol''un tekrarlı renkli portreleriyle ölümsüzleştirdiği ünlü oyuncu kimdir?', '["Marilyn Monroe","Audrey Hepburn","Elizabeth Taylor","Grace Kelly"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Altın maskesiyle ünlü genç firavun Tutankamon''un mezarı hangi ülkede bulunmuştur?', '["Mısır","Hindistan","Çin","Meksika"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Dolmabahçe Sarayı hangi şehirdedir?', '["İstanbul","Ankara","Edirne","Bursa"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Mavi kubbeli beyaz evleriyle ünlü Santorini adası hangi ülkededir?', '["Yunanistan","İtalya","İspanya","Hırvatistan"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Chanel markasının kurucusu kimdir?', '["Coco Chanel","Christian Dior","Yves Saint Laurent","Donatella Versace"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Galata Kulesi hangi şehirdedir?', '["İstanbul","İzmir","Ankara","Bursa"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Tiyatro bölgesi West End hangi şehirdedir?', '["Londra","New York","Paris","Roma"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Yelken biçimli lüks otel Burj Al Arab hangi şehirdedir?', '["Dubai","Abu Dabi","Doha","Riyad"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Ermitaj Müzesi hangi ülkededir?', '["Rusya","Polonya","Çekya","Ukrayna"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Windows''un basit çizim programı hangisidir?', '["Paint","Word","Excel","Outlook"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Rijksmuseum hangi şehirdedir?', '["Amsterdam","Brüksel","Berlin","Viyana"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Türk sinemasının eski adıyla anılan film endüstrisi hangisidir?', '["Yeşilçam","Hollywood","Bollywood","Nollywood"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Chichén Itzá piramidi hangi ülkededir?', '["Meksika","Peru","Guatemala","Küba"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Metropolitan Sanat Müzesi hangi şehirdedir?', '["New York","Los Angeles","San Francisco","Washington"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Çin''in kapalı saray kenti olan, İmparatorların yaşadığı yer hangisidir?', '["Yasak Şehir","Gökyüzü Tapınağı","Yaz Sarayı","Büyük Salon"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Çizgi roman ya da film karakterlerinin kostümlerini giymeye ne ad verilir?', '["Cosplay","Karaoke","Origami","Karnaval"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Londra''da Thames Nehri üzerindeki, ortası açılabilen ünlü köprü hangisidir?', '["Tower Bridge","London Bridge","Brooklyn Köprüsü","Rialto Köprüsü"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Sinema kaçıncı sanat olarak anılır?', '["Yedinci","Beşinci","Altıncı","Sekizinci"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Paris''te Şanzelize Caddesi''nin ucunda yer alan ünlü yapı hangisidir?', '["Zafer Takı","Eyfel Kulesi","Louvre Müzesi","Notre Dame"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Avustralya yerlilerinin uzun borulu geleneksel çalgısı hangisidir?', '["Didgeridoo","Akordeon","Mandolin","Saksofon"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Sweet Child O'' Mine'' şarkısı hangi gruba aittir?', '["Guns N'' Roses","Red Hot Chili Peppers","Bon Jovi","Def Leppard"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Purple Rain'' şarkısının sahibi sanatçı kimdir?', '["Prince","David Bowie","Stevie Wonder","Michael Jackson"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Dancing Queen'' ve ''Waterloo'' şarkılarının grubu ABBA hangi ülkeden çıkmıştır?', '["İsveç","Norveç","Danimarka","Finlandiya"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Space Oddity'' ve ''Heroes'' şarkılarıyla tanınan sanatçı kimdir?', '["David Bowie","Elton John","Freddie Mercury","Lou Reed"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Wonderwall'' şarkısı hangi gruba aittir?', '["Oasis","Blur","Radiohead","Pulp"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Another Brick in the Wall'' şarkısı hangi gruba aittir?', '["Pink Floyd","Led Zeppelin","Deep Purple","The Doors"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Every Breath You Take'' şarkısı hangi gruba aittir?', '["The Police","The Who","The Doors","The Kinks"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Highway to Hell'' ve ''Back in Black'' şarkılarının grubu hangisidir?', '["AC/DC","Kiss","Scorpions","Iron Maiden"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Take On Me'' şarkısı hangi gruba aittir?', '["a-ha","Duran Duran","Depeche Mode","Wham!"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Mr. Brightside'' şarkısı hangi gruba aittir?', '["The Killers","Arctic Monkeys","Muse","The Strokes"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Vals müziğiyle özdeşleşen, Strauss''un şehri hangi başkenttir?', '["Viyana","Paris","Berlin","Roma"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''In Da Club'' şarkısı hangi sanatçıya aittir?', '["50 Cent","Eminem","Jay-Z","Snoop Dogg"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Blowin'' in the Wind'' şarkısının sahibi Nobel ödüllü şarkıcı kimdir?', '["Bob Dylan","Bruce Springsteen","Neil Young","Paul Simon"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Lose Yourself'' şarkısı hangi sanatçıya aittir?', '["Eminem","Jay-Z","50 Cent","Snoop Dogg"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Havana'' şarkısı hangi sanatçıya aittir?', '["Camila Cabello","Selena Gomez","Dua Lipa","Ariana Grande"]'::jsonb, 0, 'muzik', 'global', null, 2),
('U2 grubu hangi ülkenin grubudur?', '["İrlanda","İskoçya","Galler","Avustralya"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Nothing Else Matters'' şarkısı hangi gruba aittir?', '["Metallica","AC/DC","Iron Maiden","Scorpions"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Africa'' şarkısı hangi gruba aittir?', '["Toto","The Police","Journey","Foreigner"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Jolene'' ve ''9 to 5'' şarkılarıyla tanınan country şarkıcısı kimdir?', '["Dolly Parton","Taylor Swift","Shania Twain","Reba McEntire"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Gangsta''s Paradise'' şarkısı hangi sanatçıya aittir?', '["Coolio","Tupac","Notorious B.I.G.","Ice Cube"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''What Makes You Beautiful'' şarkısı hangi gruba aittir?', '["One Direction","Backstreet Boys","Jonas Brothers","The Wanted"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Wake Me Up'' şarkısı hangi DJ''e aittir?', '["Avicii","David Guetta","Calvin Harris","Martin Garrix"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Justin Bieber hayranlarına ne ad verilir?', '["Beliebers","Swifties","Little Monsters","Directioners"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Latin müziğinde sallanarak çalınan, içi taneli çalgı hangisidir?', '["Marakas","Davul","Zurna","Tambur"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Piyanosuyla ''Piano Man'' şarkısını söyleyen sanatçı kimdir?', '["Billy Joel","Elton John","Neil Diamond","Rod Stewart"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Jonas Brothers adlı müzik grubunda kaç kardeş vardır?', '["3","2","4","5"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Counting Stars'' şarkısı hangi gruba aittir?', '["OneRepublic","Imagine Dragons","Maroon 5","Coldplay"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''No Woman, No Cry'' şarkısı hangi sanatçıya aittir?', '["Bob Marley","Jimi Hendrix","Bob Dylan","Peter Tosh"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Eye of the Tiger'' şarkısı hangi boks filminin müziğidir?', '["Rocky","Rambo","Terminatör","Gladyatör"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''How Far I''ll Go'' şarkısı hangi Disney filminde yer alır?', '["Moana","Mulan","Encanto","Coco"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Star Wars'' ve ''Jaws'' film müziklerini bestelemiş ünlü besteci kimdir?', '["John Williams","Hans Zimmer","Ennio Morricone","Danny Elfman"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''You''ll Be in My Heart'' şarkısı hangi Disney filminde yer alır?', '["Tarzan","Mulan","Pocahontas","Aladdin"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''When You Wish Upon a Star'' şarkısı hangi Disney filminde yer alır?', '["Pinokyo","Bambi","Dumbo","Peter Pan"]'::jsonb, 0, 'muzik', 'global', null, 2),
('PlayStation hangi şirketin oyun konsoludur?', '["Sony","Microsoft","Nintendo","Sega"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('iCloud hangi şirketin bulut hizmetidir?', '["Apple","Google","Microsoft","Samsung"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Elon Musk''ın uzay şirketinin adı nedir?', '["SpaceX","NASA","Blue Origin","Boeing"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Microsoft''un e-posta hizmeti hangisidir?', '["Outlook","Gmail","Yahoo Mail","ProtonMail"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('iPad hangi şirketin ürünüdür?', '["Apple","Microsoft","Samsung","Huawei"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('MacBook hangi şirketin ürünüdür?', '["Apple","Microsoft","Samsung","Dell"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Minecraft''ta her şey hangi şekildeki bloklardan oluşur?', '["Küp","Küre","Piramit","Silindir"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Web sayfalarının temel yapı dili hangisidir?', '["HTML","Python","SQL","Excel"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Bilgisayarda yapılan son işlemi geri almak için hangi kısayol kullanılır?', '["Ctrl+Z","Ctrl+C","Ctrl+V","Ctrl+X"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Herkesin düzenleyebildiği çevrim içi ansiklopedi hangisidir?', '["Vikipedi","Google","YouTube","Facebook"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Dizüstü bilgisayarın İngilizce adı nedir?', '["Laptop","Desktop","Tablet","Server"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Sahibinden.com hangi amaçla kullanılır?', '["İlan","Müzik","Oyun","Haber"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Twitter''ın mavi kuş logosu yerine 2023''te geçilen yeni adı nedir?', '["X","Y","Z","Q"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Instagram Hikâyeleri kaç saat sonra kaybolur?', '["24","12","48","72"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Instagram''da bir gönderiyi beğenmek için hangi simge kullanılır?', '["Kalp","Yıldız","Başparmak","Gülen yüz"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('TikTok hangi ülkede geliştirilmiştir?', '["Çin","ABD","Japonya","Hindistan"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Sesi kaydetmek için kullanılan aygıt hangisidir?', '["Mikrofon","Hoparlör","Kamera","Yazıcı"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Kulaklıkla kasetli müzik dinletmeyi yaygınlaştıran Sony ürünü hangisidir?', '["Walkman","Discman","Gramofon","Teyp"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Oyuncuların canlı yayın yaptığı, mor logolu platform hangisidir?', '["Twitch","YouTube","Discord","Steam"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('''I''m Lovin'' It'' sloganı hangi markaya aittir?', '["McDonald''s","Coca-Cola","Starbucks","Domino''s"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Donkey Kong hangi hayvanın adıdır?', '["Goril","Fil","Aslan","Kaplan"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Süper Mario''da Mario''nun kırmızı şapkasında hangi harf yazar?', '["M","L","W","N"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Trendyol ve Hepsiburada hangi alanda hizmet verir?', '["Alışveriş","Bankacılık","Sigorta","Eğitim"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Netflix''in kırmızı logosunda hangi harf yer alır?', '["N","F","X","M"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Londra''da Parlamento Sarayı''nın saat kulesindeki ünlü çanın lakabı nedir?', '["Big Ben","Tower Bridge","London Eye","Buckingham"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Volvo hangi ülkenin otomobil markasıdır?', '["İsveç","Almanya","Fransa","İtalya"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Zara hangi ülkenin moda markasıdır?', '["İspanya","İtalya","Fransa","Portekiz"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Nestlé hangi ülkenin gıda şirketidir?', '["İsviçre","Belçika","Fransa","Hollanda"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Hindistan''da insanların birbirine renkli toz attığı bahar festivali hangisidir?', '["Holi","Diwali","Nevruz","Karnaval"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Lamborghini''nin logosunda hangi hayvan yer alır?', '["Boğa","At","Kartal","Yılan"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Ferrari''nin logosunda hangi hayvan yer alır?', '["At","Boğa","Aslan","Kartal"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Bilardoda siyah top kaç numaralıdır?', '["8","7","9","10"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Papa''nın yaşadığı şehir devleti hangisidir?', '["Vatikan","Monako","San Marino","Lüksemburg"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Tom ve Jerry''de Tom hangi hayvandır?', '["Kedi","Fare","Köpek","Tavşan"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Winnie the Pooh hangi renktedir?', '["Sarı","Kırmızı","Mavi","Yeşil"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Scooby-Doo hangi hayvandır?', '["Köpek","Kedi","Kurt","Ayı"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Donald Duck hangi hayvandır?', '["Ördek","Fare","Köpek","Kaz"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Olmak ya da olmamak'' sözü Shakespeare''in hangi oyunundadır?', '["Hamlet","Macbeth","Othello","Romeo ve Juliet"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Harry Potter''ın okulu hangi adla bilinir?', '["Hogwarts","Narnia","Oz","Atlantis"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Hobbit'' kitabında Bilbo''nun karşılaştığı ejderhanın adı nedir?', '["Smaug","Drogon","Toothless","Norbert"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Kral Arthur''un büyücü danışmanı kimdir?', '["Merlin","Gandalf","Dumbledore","Saruman"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Sherlock Holmes''un baş düşmanı kimdir?', '["Moriarty","Watson","Lestrade","Hudson"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Türk edebiyatında ''Halk Ozanı'' olarak bilinen Âşık Veysel hangi çalgıyı çalardı?', '["Bağlama","Keman","Ney","Kanun"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Yaşlı Adam ve Deniz'' romanının yazarı kimdir?', '["Ernest Hemingway","Mark Twain","John Steinbeck","Jack London"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Kafka''nın ''Dönüşüm'' öyküsünde Gregor Samsa neye dönüşür?', '["Böceğe","Kuşa","Fareye","Köpeğe"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Peri masalları hangi kitap türüne girer?', '["Masal","Anı","Gezi","Deneme"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Dünyanın Merkezine Yolculuk'' romanının yazarı kimdir?', '["Jules Verne","H.G. Wells","Mark Twain","Edgar Allan Poe"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Pippi Uzunçorap hangi ülkenin çocuk edebiyatı karakteridir?', '["İsveç","Norveç","Danimarka","Finlandiya"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Hayvan Çiftliği'' romanında çiftliği yöneten hayvanlar hangileridir?', '["Domuzlar","Atlar","İnekler","Koyunlar"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Alice, Harikalar Diyarı''nda gülümseyen hangi hayvanla karşılaşır?', '["Kedi","Tavşan","Kurbağa","Kuş"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Tarzan''ı ormanda hangi hayvanlar büyütür?', '["Goriller","Aslanlar","Kurtlar","Ayılar"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Asterix çizgi romanında Obelix''in taşımasıyla ünlü olduğu şey nedir?', '["Dikilitaş","Kazan","Bumerang","Balta"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Robin Hood''un en bilinen silahı nedir?', '["Yay","Kılıç","Mızrak","Balta"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Parmak Kız (Thumbelina) masalında küçük kız hangi çiçeğin içinde doğar?', '["Lale","Gül","Papatya","Zambak"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Kitapları basıp dağıtan kuruma ne ad verilir?', '["Yayınevi","Kütüphane","Müze","Okul"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('En çok olimpiyat madalyası kazanan yüzücü Michael Phelps hangi ülkelidir?', '["ABD","Avustralya","İngiltere","Rusya"]'::jsonb, 0, 'spor', 'global', null, 2),
('Futbolda oyun dışı pozisyona ne ad verilir?', '["Ofsayt","Faul","Korner","Penaltı"]'::jsonb, 0, 'spor', 'global', null, 2),
('Arjantin milli takımının çizgili forması hangi renklerdir?', '["Mavi-beyaz","Kırmızı-beyaz","Sarı-yeşil","Siyah-beyaz"]'::jsonb, 0, 'spor', 'global', null, 2),
('Tour de France''ta lider bisikletçinin giydiği mayo hangi renktir?', '["Sarı","Kırmızı","Mavi","Yeşil"]'::jsonb, 0, 'spor', 'global', null, 2),
('Futbolda köşe bayrağı yakınından atılan atışa ne ad verilir?', '["Korner","Penaltı","Taç","Frikik"]'::jsonb, 0, 'spor', 'global', null, 2),
('Voleybolda topu file üstünden güçlü vurmaya ne ad verilir?', '["Smaç","Servis","Blok","Pas"]'::jsonb, 0, 'spor', 'global', null, 2),
('NBA''de ''Kral'' lakabıyla anılan oyuncu kimdir?', '["LeBron James","Kobe Bryant","Stephen Curry","Kevin Durant"]'::jsonb, 0, 'spor', 'global', null, 2),
('Galatasaray''ın simgesi hangi hayvandır?', '["Aslan","Kartal","Kanarya","Kurt"]'::jsonb, 0, 'spor', 'global', null, 2),
('Eski Çağ''da Mısır''ın ölüleri koruma geleneğinde kullanılan bandajlı cesetlere ne denir?', '["Mumya","Heykel","Kukla","Maske"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Fenikeliler hangi icatla bilinir?', '["Alfabe","Matbaa","Barut","Pusula"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Hititler hangi bölgede yaşamıştır?', '["Anadolu","Mısır","İran","Arabistan"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Romalı gladyatörlerin dövüştüğü yer neresidir?', '["Arena","Tiyatro","Kütüphane","Saray"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Bayraktar TB2 hangi tür araçtır?', '["SİHA","Tank","Gemi","Denizaltı"]'::jsonb, 0, 'teknoloji', 'yerel', 'TR', 2),
('Milli güreşçi Hamza Yerlikaya hangi sporla anılır?', '["Güreş","Halter","Boks","Judo"]'::jsonb, 0, 'spor', 'yerel', 'TR', 2),
('''Müslüm Baba'' lakabıyla bilinen arabesk sanatçı kimdir?', '["Müslüm Gürses","İbrahim Tatlıses","Orhan Gencebay","Ferdi Tayfur"]'::jsonb, 0, 'muzik', 'yerel', 'TR', 2),
('Sultanahmet Camii''nin kaç minaresi vardır?', '["6","4","2","8"]'::jsonb, 0, 'sanat', 'yerel', 'TR', 2),
('''Filenin Sultanları'' lakabıyla anılan Türk kadın milli takımı hangi sporda yarışır?', '["Voleybol","Basketbol","Hentbol","Tenis"]'::jsonb, 0, 'spor', 'yerel', 'TR', 2),
('Türkiye''nin yerli ve elektrikli otomobil markası hangisidir?', '["Togg","Anadol","Tofaş","Otokar"]'::jsonb, 0, 'teknoloji', 'yerel', 'TR', 2),
('Çiğ köftesiyle ünlü ilimiz hangisidir?', '["Şanlıurfa","Adana","Mardin","Diyarbakır"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('''Bir fincan kahvenin ...'' atasözünün devamı nedir?', '["kırk yıl hatırı vardır","bin yıl hatırı vardır","yüz yıl hatırı vardır","on yıl hatırı vardır"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('''Sabreden derviş ...'' atasözünün devamı nedir?', '["muradına ermiş","yolunu bulmuş","cezasını çekmiş","hatasını görmüş"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('Geleneksel Türk düğünlerinde davulla birlikte çalınan üflemeli çalgı hangisidir?', '["Zurna","Ney","Kaval","Mızıka"]'::jsonb, 0, 'muzik', 'yerel', 'TR', 2)
on conflict (soru) do nothing;

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
