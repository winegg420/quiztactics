-- ============================================================
-- 311 — Paket 3 soru üretimi, parti 8: 100 soru · 2026-09-23
--
-- Kategori: bilim 22 · edebiyat 22 · genel_kultur 9 · tarih 19 · teknoloji 28
-- Yerel (kapsam='yerel', ulke='TR'): 0 · zorluk 1–5: 3/12/28/37/20
-- İngilizce çeviri: 98 · çevrilmeyen (ceviri_atlanan, kod 'cevrilemez'): 2
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
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti 8 --no 311
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
('''World of Warcraft'' oyununu geliştiren şirket hangisidir?', '["Blizzard","BioWare","Bethesda","Valve"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Valve''ın ''Portal'' oyununda oyuncuyu test odalarında yönlendiren yapay zekânın adı nedir?', '["GLaDOS","SHODAN","Cortana","HAL 9000"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Frekans atlamalı haberleşme tekniğinin patentini 1942''de besteci George Antheil ile birlikte alan Hollywood yıldızı kimdir?', '["Hedy Lamarr","Greta Garbo","Marlene Dietrich","Ingrid Bergman"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('BeiDou adlı uydu navigasyon sistemi hangi ülkeye aittir?', '["Çin","Japonya","Hindistan","Güney Kore"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('''Among Us'' oyununu geliştiren stüdyo hangisidir?', '["Innersloth","Mediatonic","Supercell","Mojang"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('İlk dijital fotoğraf makinesini 1975''te geliştiren mühendis Steven Sasson hangi şirkette çalışıyordu?', '["Kodak","Polaroid","Canon","Fujifilm"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Jupyter projesinin adı hangi üç programlama dilinin adından türetilmiştir?', '["Julia, Python ve R","Java, Python ve Ruby","JavaScript, PHP ve R","Julia, Perl ve Rust"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('IBM''in ThinkPad dahil kişisel bilgisayar bölümünü 2005''te satın alan şirket hangisidir?', '["Lenovo","Acer","Asus","Dell"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('Debian Linux dağıtımını 1993''te başlatan programcı kimdir?', '["Ian Murdock","Patrick Volkerding","Marc Ewing","Mark Shuttleworth"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('Radar magnetronu yanında cebindeki çikolatanın eridiğini fark ederek mikrodalga fırının icadına yol açan mühendis kimdir?', '["Percy Spencer","Robert Watson-Watt","Edwin Armstrong","Lee de Forest"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Boston Dynamics''in köpeği andıran dört ayaklı ticari robotunun adı nedir?', '["Spot","Atlas","Stretch","Handle"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Dijital kameraların görüntü algılayıcısı CCD''yi 1969''da icat eden Willard Boyle ve George Smith hangi kurumda çalışıyordu?', '["Bell Laboratuvarları","Xerox PARC","IBM Araştırma Merkezi","Kodak Araştırma Laboratuvarı"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('Canlı yayın platformu Twitch, 2011''de hangi sitenin oyun kategorisinden ayrılarak kurulmuştur?', '["Justin.tv","Own3d.tv","Blip.tv","Ustream"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('Steve Jobs, Pixar''ın temelini oluşturan bilgisayar grafik bölümünü 1986''da hangi şirketten satın almıştır?', '["Lucasfilm","Paramount","Universal","Xerox"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('''Byte'' terimini 1956''da IBM''de ortaya atan bilgisayar bilimci kimdir?', '["Werner Buchholz","Gene Amdahl","Frederick Brooks","John Backus"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('Twitter''da konuları # işaretiyle etiketleme fikrini 2007''de öneren tasarımcı kimdir?', '["Chris Messina","Biz Stone","Evan Williams","Noah Glass"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('İlk ''Grand Theft Auto'' oyununu 1997''de geliştiren DMA Design hangi ülkenin şirketiydi?', '["İskoçya","İrlanda","Kanada","Galler"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('İlk elektronik hesap tablosu programı VisiCalc ilk olarak hangi bilgisayar için yazılmıştır?', '["Apple II","Commodore PET","IBM PC","TRS-80"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Hewlett-Packard''ın ilk ürünü olan ses osilatörünü ''Fantasia'' filmi için satın alan stüdyo hangisidir?', '["Walt Disney","MGM","Warner Bros.","Paramount"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('JetBrains''in geliştirdiği Kotlin programlama dili adını neyden almıştır?', '["Bir adadan","Bir nehirden","Bir kahve türünden","Bir dağ geçidinden"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Sega şirketinin adı hangi ifadenin kısaltmasından gelir?', '["Service Games","Special Electronic Games","Sound Engineering Games","Standard Entertainment"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Nintendo''nun Super Mario oyunlarında Mario''nun yeşil şapkalı kardeşi kimdir?', '["Luigi","Wario","Yoshi","Toad"]'::jsonb, 0, 'teknoloji', 'global', null, 1),
('Blaise Pascal''ın 1642''de yaptığı mekanik hesap makinesi Pascaline hangi işlemleri doğrudan yapabiliyordu?', '["Toplama ve çıkarma","Çarpma ve bölme","Üs ve kök alma","Logaritma ve üs alma"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Nintendo''nun hem elde taşınabilen hem de televizyona bağlanabilen 2017 çıkışlı oyun konsolu hangisidir?', '["Switch","Wii U","GameCube","3DS"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Sega''nın maskotu Sonic ne tür bir hayvandır?', '["Kirpi","Tilki","Sincap","Köstebek"]'::jsonb, 0, 'teknoloji', 'global', null, 1),
('2021''de Mars''ta uçarak başka bir gezegende motorlu uçuş yapan ilk araç olan NASA helikopterinin adı nedir?', '["Ingenuity","Dragonfly","Sojourner","Zhurong"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('İstatistik programlama dili R, 1990''larda hangi ülkedeki bir üniversitede geliştirilmiştir?', '["Yeni Zelanda","Güney Afrika","Birleşik Krallık","Avustralya"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('''Binary digit'' ifadesini kısaltarak ''bit'' kelimesini türeten istatistikçi kimdir?', '["John Tukey","Claude Shannon","Norbert Wiener","Alan Turing"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('''Moby Dick''te Kaptan Ahab''ın balina avı gemisinin adı nedir?', '["Pequod","Nautilus","Hispaniola","Bounty"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('''Venedik Taciri''nde borcuna karşılık Antonio''dan bir libre et isteyen tefeci kimdir?', '["Shylock","Falstaff","Iago","Polonius"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('''Gulliver''in Gezileri''nde bilginlerin yaşadığı uçan adanın adı nedir?', '["Laputa","Lilliput","Brobdingnag","Blefuscu"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('''Maymunların Tarzanı'' romanıyla Tarzan karakterini yaratan yazar kimdir?', '["Edgar Rice Burroughs","H. Rider Haggard","Arthur Conan Doyle","Rudyard Kipling"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('''Robinson Crusoe''nun yazarı Daniel Defoe, romanı yazarken hangi gerçek kazazedenin öyküsünden esinlenmiştir?', '["Alexander Selkirk","William Bligh","James Cook","Fletcher Christian"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('''Otostopçunun Galaksi Rehberi''nde dev bilgisayarın ''hayat, evren ve her şey'' sorusuna verdiği cevap hangi sayıdır?', '["42","7","13","108"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Siberuzay'' kavramını yaygınlaştıran 1984 tarihli ''Neuromancer'' romanının yazarı kimdir?', '["William Gibson","Isaac Asimov","Philip K. Dick","Arthur C. Clarke"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('''Kral Lear''da babasına dalkavukluk etmeyi reddeden en küçük kızı kimdir?', '["Cordelia","Goneril","Regan","Ophelia"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('Gılgamış Destanı''nda tanrıların Gılgamış''a denk olsun diye yarattığı, sonra onun en yakın dostu olan vahşi adam kimdir?', '["Enkidu","Humbaba","Utnapiştim","Lugalbanda"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('Orwell''in ''1984''üne de ilham veren, 1920''lerde yazılmış distopya ''Biz''in yazarı kimdir?', '["Yevgeni Zamyatin","Andrey Platonov","Mihail Bulgakov","Boris Pilnyak"]'::jsonb, 0, 'edebiyat', 'global', null, 5),
('Edgar Allan Poe''nun öykülerinde gizemleri çözen, modern polisiyenin ilk dedektiflerinden sayılan Parisli karakter kimdir?', '["Auguste Dupin","Hercule Poirot","Jules Maigret","Arsène Lupin"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('''Uğultulu Tepeler''de Earnshaw ailesinin evlat edindiği, Catherine''e tutkuyla bağlı kahraman kimdir?', '["Heathcliff","Mr. Rochester","Mr. Darcy","Edgar Linton"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('''Alice Harikalar Diyarında''da gövdesi kaybolup yalnızca sırıtışı havada kalan hayvan hangisidir?', '["Cheshire Kedisi","Mart Tavşanı","Beyaz Tavşan","Mavi Tırtıl"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Budapeşte''de bir arsa için savaşan çocukları anlatan ''Pal Sokağı Çocukları'' romanının yazarı kimdir?', '["Ferenc Molnár","Erich Kästner","Edmondo De Amicis","Mark Twain"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('Márquez''in ''Yüzyıllık Yalnızlık'' romanında Buendía ailesinin kurduğu kasabanın adı nedir?', '["Macondo","Yoknapatawpha","Comala","Maycomb"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('Dante''nin ''İlahi Komedya''sında Cennet''te şaire rehberlik eden kadın kimdir?', '["Beatrice","Laura","Fiammetta","Francesca"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('Daniel Defoe''nun romanında Robinson Crusoe''nun ıssız adada kurtardığı yerliye verdiği ad nedir?', '["Cuma","Pazar","Salı","Perşembe"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Shakespeare''in ''Macbeth''inde kehanete göre Macbeth, hangi orman Dunsinane Tepesi''ne yürüyene dek yenilmeyecektir?', '["Birnam","Arden","Sherwood","Ettrick"]'::jsonb, 0, 'edebiyat', 'global', null, 5),
('Sherlock Holmes''un ilk kez göründüğü 1887 tarihli roman hangisidir?', '["Kızıl Dosya","Dörtlerin Yemini","Korku Vadisi","Baskerville''lerin Köpeği"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('''Evler'', ''Çevre'' ve ''Kapalı Çarşı'' şiir kitaplarının şairi kimdir?', '["Behçet Necatigil","Cahit Külebi","Ziya Osman Saba","Oktay Rifat"]'::jsonb, 0, 'edebiyat', 'global', null, 5),
('Türk edebiyatında köy yaşamını işleyen ilk yapıt sayılan ''Karabibik''in yazarı kimdir?', '["Nabizade Nazım","Samipaşazade Sezai","Mehmet Rauf","Hüseyin Cahit"]'::jsonb, 0, 'edebiyat', 'global', null, 5),
('Hüseyin Rahmi Gürpınar''ın, bir köşkte görülen hayaletin düzmece çıktığı ve batıl inançla alay ettiği romanı hangisidir?', '["Gulyabani","Şıpsevdi","Mürebbiye","Toraman"]'::jsonb, 0, 'edebiyat', 'global', null, 5),
('Endonezya''da 2003''te kalıntıları bulunan, yaklaşık bir metrelik boyu nedeniyle ''hobbit'' diye anılan soyu tükenmiş insan türü hangisidir?', '["Homo floresiensis","Homo naledi","Homo antecessor","Homo ergaster"]'::jsonb, 0, 'bilim', 'global', null, 4),
('''Kuru buz'' hangi maddenin katı hâlidir?', '["Karbondioksit","Kükürt dioksit","Hidrojen","Amonyak"]'::jsonb, 0, 'bilim', 'global', null, 2),
('Jüpiter''in hangi uydusunun kalın buz kabuğunun altında sıvı su okyanusu bulunduğu düşünülmektedir?', '["Europa","Io","Amalthea","Himalia"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Namib Çölü''ne özgü olan ve yüzyıllarca yaşadığı ömrü boyunca yalnızca iki yaprak büyüten bitki hangisidir?', '["Welwitschia","Baobab","Rafflesia","Nepenthes"]'::jsonb, 0, 'bilim', 'global', null, 5),
('Doğal seçilim kuramını Darwin''den bağımsız olarak geliştiren, Malay Takımadaları''nda çalışmış doğa bilimci kimdir?', '["Alfred Russel Wallace","Thomas Henry Huxley","Joseph Dalton Hooker","Charles Lyell"]'::jsonb, 0, 'bilim', 'global', null, 4),
('Mısıra dayalı beslenmenin yaygın olduğu bölgelerde görülen, niasin (B3 vitamini) eksikliğinden kaynaklanan hastalık hangisidir?', '["Pellagra","Beriberi","Skorbüt","Guatr"]'::jsonb, 0, 'bilim', 'global', null, 4),
('D vitamini eksikliğinin çocuklarda kemiklerin yumuşayıp eğilmesine yol açan hastalığı hangisidir?', '["Raşitizm","Skorbüt","Beriberi","Pellagra"]'::jsonb, 0, 'bilim', 'global', null, 2),
('Olgunlaştıktan sonra yaşam döngüsünü tersine çevirip yeniden gençleşebildiği için ''ölümsüz'' diye anılan Turritopsis dohrnii ne tür bir canlıdır?', '["Denizanası","Deniz yıldızı","Deniz kestanesi","Deniz hıyarı"]'::jsonb, 0, 'bilim', 'global', null, 4),
('Kara deliklerin kuantum etkileri sayesinde ışıma yayarak zamanla buharlaşabileceğini 1974''te öne süren fizikçi kimdir?', '["Stephen Hawking","Roger Penrose","Kip Thorne","John Wheeler"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Dünya''yı kendi kendini düzenleyen tek bir sistem olarak ele alan Gaia hipotezini 1970''lerde öneren bilim insanı kimdir?', '["James Lovelock","E. O. Wilson","Richard Dawkins","Carl Woese"]'::jsonb, 0, 'bilim', 'global', null, 4),
('Mauritius adasına özgü olan ve 17. yüzyılda soyu tükenen uçamayan kuş hangisidir?', '["Dodo","Moa","Büyük auk","Kivi"]'::jsonb, 0, 'bilim', 'global', null, 2),
('Yelpaze biçimli yapraklarıyla tanınan ve ''yaşayan fosil'' sayılan ağaç hangisidir?', '["Ginkgo","Çınar","Ihlamur","Akçaağaç"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Hacim bakımından dünyanın en büyük tek gövdeli ağacı sayılan ''General Sherman'' hangi türdendir?', '["Dev sekoya","Kıyı sekoyası","Okaliptüs","Baobab"]'::jsonb, 0, 'bilim', 'global', null, 4),
('1974''te Etiyopya''da bulunan ünlü ''Lucy'' fosili hangi türe aittir?', '["Australopithecus afarensis","Australopithecus africanus","Ardipithecus ramidus","Paranthropus boisei"]'::jsonb, 0, 'bilim', 'global', null, 5),
('Dünya''da bulunmadan önce 1868''de bir Güneş tutulması sırasında Güneş''in tayfında saptanan element hangisidir?', '["Helyum","Neon","Argon","Kripton"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Bal arıları peteklerini hangi maddeden örer?', '["Balmumu","Reçine","Kil","Polen"]'::jsonb, 0, 'bilim', 'global', null, 1),
('Voyager 1''in 1990''da yaklaşık 6 milyar km uzaktan çektiği Dünya fotoğrafına ''Soluk Mavi Nokta'' adını veren bilim insanı kimdir?', '["Carl Sagan","Stephen Hawking","Frank Drake","Neil deGrasse Tyson"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Hawaii''deki Mauna Loa Gözlemevi''nde 1958''den beri ölçülen atmosferdeki karbondioksit artışı grafiği kimin adıyla anılır?', '["Keeling","Revelle","Arrhenius","Callendar"]'::jsonb, 0, 'bilim', 'global', null, 5),
('Tanzanya''daki Gombe''de şempanzelerin alet yapıp kullandığını ilk gözlemleyen primatolog kimdir?', '["Jane Goodall","Dian Fossey","Biruté Galdikas","Cheryl Knott"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Sibirya''daki Altay Dağları''nda bir mağarada bulunan parmak kemiğinin DNA''sıyla tanımlanan eski insan grubu hangisidir?', '["Denisovalılar","Neandertaller","Cro-Magnonlar","Grimaldiler"]'::jsonb, 0, 'bilim', 'global', null, 4),
('Güneş Sistemi''ni en dıştan küresel bir kabuk gibi sardığı düşünülen, uzun dönemli kuyruklu yıldızların kaynağı sayılan yapı hangisidir?', '["Oort Bulutu","Kuiper Kuşağı","Dağınık Disk","Asteroit Kuşağı"]'::jsonb, 0, 'bilim', 'global', null, 4),
('Charles Darwin''in 1831-1836 yılları arasında dünya çevresinde yaptığı yolculuktaki geminin adı nedir?', '["HMS Beagle","HMS Endeavour","HMS Bounty","HMS Victory"]'::jsonb, 0, 'bilim', 'global', null, 3),
('1415''te Konstanz Konsili kararıyla yakılan Bohemyalı din reformcusu kimdir?', '["Jan Hus","Jan Žižka","Ulrich Zwingli","Girolamo Savonarola"]'::jsonb, 0, 'tarih', 'global', null, 4),
('Lale soğanı fiyatlarının fırlayıp 1637''de çöktüğü ''Lale Çılgınlığı'' hangi ülkede yaşanmıştır?', '["Hollanda","Fransa","Portekiz","İsviçre"]'::jsonb, 0, 'tarih', 'global', null, 3),
('IV. Murad ve Sultan İbrahim''in annesi olan, 1651''de saray içinde öldürülen valide sultan kimdir?', '["Kösem Sultan","Hürrem Sultan","Safiye Sultan","Nurbanu Sultan"]'::jsonb, 0, 'tarih', 'global', null, 4),
('Almanya''nın 22 Haziran 1941''de Sovyetler Birliği''ne başlattığı saldırının kod adı nedir?', '["Barbarossa","Deniz Aslanı","Zitadelle","Weserübung"]'::jsonb, 0, 'tarih', 'global', null, 3),
('1890''da Japonya dönüşünde Kuşimoto açıklarında fırtınada batan Osmanlı gemisi hangisidir?', '["Ertuğrul","Hamidiye","Mecidiye","Nusret"]'::jsonb, 0, 'tarih', 'global', null, 4),
('Apollo 11 görevinde Ay''a inmeyip Columbia komuta modülünde yörüngede kalan astronot kimdir?', '["Michael Collins","Edwin Aldrin","James Lovell","Charles Conrad"]'::jsonb, 0, 'tarih', 'global', null, 3),
('1989''da Çekoslovakya''daki Kadife Devrim''in ardından cumhurbaşkanı olan oyun yazarı kimdir?', '["Václav Havel","Alexander Dubček","Gustáv Husák","Milan Kundera"]'::jsonb, 0, 'tarih', 'global', null, 3),
('Tarihin en kısa savaşı sayılan ve 1896''da 40 dakika kadar süren savaş Britanya ile hangi sultanlık arasında yapılmıştır?', '["Zanzibar","Brunei","Johor","Lahej"]'::jsonb, 0, 'tarih', 'global', null, 4),
('Osmanlı dış borçlarını yönetmek için Düyun-u Umumiye İdaresi''nin kurulmasını sağlayan 1881 tarihli belge hangisidir?', '["Muharrem Kararnamesi","Islahat Fermanı","Kanun-ı Esasi","Tanzimat Fermanı"]'::jsonb, 0, 'tarih', 'global', null, 4),
('Fransa Kraliçesi Marie Antoinette doğuştan hangi ülkenin prensesiydi?', '["Avusturya","İspanya","Bavyera","Savoya"]'::jsonb, 0, 'tarih', 'global', null, 3),
('1932''de Avustralya ordusunun makineli tüfeklerle, ekinlere zarar veren hangi kuşlara karşı başarısız bir ''savaş'' yürüttüğü bilinir?', '["Emu","Kazuar","Kakadu","Pelikan"]'::jsonb, 0, 'tarih', 'global', null, 4),
('1919''da dev bir tanktan taşan melasın 21 kişinin ölümüne yol açtığı ''Büyük Melas Seli'' hangi şehirde yaşanmıştır?', '["Boston","Chicago","Baltimore","Philadelphia"]'::jsonb, 0, 'tarih', 'global', null, 5),
('1974''te askerlerin tüfek namlularına karanfil taktığı ve diktatörlüğü deviren kansız darbe hangi ülkede olmuştur?', '["Portekiz","İspanya","Yunanistan","İtalya"]'::jsonb, 0, 'tarih', 'global', null, 3),
('Kuzey Amerika''ya ayak basan ilk Avrupalı sayılan Viking kâşif kimdir?', '["Leif Erikson","Kızıl Erik","Harald Hardrada","Ragnar Lodbrok"]'::jsonb, 0, 'tarih', 'global', null, 3),
('Osmanlı Devleti Bağdat Demiryolu''nun yapım imtiyazını hangi ülkenin şirketine vermiştir?', '["Almanya","Britanya","Fransa","Avusturya-Macaristan"]'::jsonb, 0, 'tarih', 'global', null, 3),
('Ağabeyi II. Bayezid''le taht mücadelesini kaybedip ömrünün sonunu Rodos şövalyeleri ve Papalığın gözetiminde geçiren şehzade kimdir?', '["Cem Sultan","Şehzade Korkut","Şehzade Mustafa","Şehzade Bayezid"]'::jsonb, 0, 'tarih', 'global', null, 3),
('Bizans''ın deniz savaşlarında kullandığı, suyla sönmeyen ''Rum ateşi''ni 7. yüzyılda geliştirdiği anlatılan mimar kimdir?', '["Kallinikos","Anthemios","İsidoros","Prokopios"]'::jsonb, 0, 'tarih', 'global', null, 5),
('1913 Bâbıâli Baskını sırasında öldürülen Harbiye Nazırı kimdir?', '["Nazım Paşa","Kâmil Paşa","Said Halim Paşa","Hüseyin Hilmi Paşa"]'::jsonb, 0, 'tarih', 'global', null, 5),
('Yüzlerce kişinin günlerce durmadan dans ettiği 1518 ''dans salgını'' hangi şehirde görülmüştür?', '["Strazburg","Nürnberg","Frankfurt","Augsburg"]'::jsonb, 0, 'tarih', 'global', null, 5),
('Japon mutfağında pirinç kullanılmadan ince dilimlenerek sunulan çiğ balığa ne ad verilir?', '["Sashimi","Tempura","Yakitori","Teriyaki"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('İki parçalı ''bikini'' mayoyu 1946''da bu adla tanıtan Fransız tasarımcı kimdir?', '["Louis Réard","Christian Dior","Hubert de Givenchy","Paul Poiret"]'::jsonb, 0, 'genel_kultur', 'global', null, 5),
('İtalyan mutfağında makarnanın ''al dente'' pişirilmesi ne anlama gelir?', '["Dişe gelecek kıvamda","Tamamen yumuşayana dek","Tereyağında çevrilerek","Buharda yavaşça pişerek"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('''Jumbo'' kelimesini ''dev boy'' anlamında yaygınlaştıran, 1882''de Londra Hayvanat Bahçesi''nden Barnum Sirki''ne satılan hayvan neydi?', '["Bir fil","Bir zürafa","Bir su aygırı","Bir gergedan"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('Telsizde kullanılan ''Mayday'' tehlike çağrısı hangi dildeki bir ifadeden türemiştir?', '["Fransızca","İspanyolca","İtalyanca","Almanca"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('İtalyan kahvesi ''cappuccino'' adını hangi grubun giysisinin renginden alır?', '["Kapuçin keşişleri","Benediktin keşişleri","Dominiken rahipleri","Kartuziyen rahipleri"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('Domates, mozzarella ve fesleğeniyle İtalyan bayrağını andıran pizza hangi kraliçenin adını taşır?', '["Margherita","Elena","Vittoria","Maria José"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Lale anlamındaki İngilizce ''tulip'' kelimesi, çiçeğin benzetildiği hangi Türkçe kelimeye dayanır?', '["Tülbent","Turna","Tulum","Türbe"]'::jsonb, 0, 'genel_kultur', 'global', null, 4),
('Fındıklı kakao kreması Nutella''yı üreten İtalyan şirketi hangisidir?', '["Ferrero","Barilla","Lavazza","Perugina"]'::jsonb, 0, 'genel_kultur', 'global', null, 2)
on conflict (soru) do nothing;

-- ---------------------------------------------------- İngilizce çeviri
insert into public.question_translations (question_id, dil, soru, secenekler)
select q.id, 'en', v.en_soru, v.en_secenekler
  from (values
  ('''World of Warcraft'' oyununu geliştiren şirket hangisidir?', 'Which company developed the game ''World of Warcraft''?', '["Blizzard","BioWare","Bethesda","Valve"]'::jsonb),
  ('Valve''ın ''Portal'' oyununda oyuncuyu test odalarında yönlendiren yapay zekânın adı nedir?', 'In Valve''s game ''Portal'', what is the name of the AI that guides the player through the test chambers?', '["GLaDOS","SHODAN","Cortana","HAL 9000"]'::jsonb),
  ('Frekans atlamalı haberleşme tekniğinin patentini 1942''de besteci George Antheil ile birlikte alan Hollywood yıldızı kimdir?', 'Which Hollywood star patented a frequency-hopping communication system with composer George Antheil in 1942?', '["Hedy Lamarr","Greta Garbo","Marlene Dietrich","Ingrid Bergman"]'::jsonb),
  ('BeiDou adlı uydu navigasyon sistemi hangi ülkeye aittir?', 'Which country operates the BeiDou satellite navigation system?', '["China","Japan","India","South Korea"]'::jsonb),
  ('''Among Us'' oyununu geliştiren stüdyo hangisidir?', 'Which studio developed the game ''Among Us''?', '["Innersloth","Mediatonic","Supercell","Mojang"]'::jsonb),
  ('İlk dijital fotoğraf makinesini 1975''te geliştiren mühendis Steven Sasson hangi şirkette çalışıyordu?', 'Steven Sasson built the first digital camera in 1975 while working for which company?', '["Kodak","Polaroid","Canon","Fujifilm"]'::jsonb),
  ('Jupyter projesinin adı hangi üç programlama dilinin adından türetilmiştir?', 'The name of Project Jupyter is derived from which three programming languages?', '["Julia, Python and R","Java, Python and Ruby","JavaScript, PHP and R","Julia, Perl and Rust"]'::jsonb),
  ('IBM''in ThinkPad dahil kişisel bilgisayar bölümünü 2005''te satın alan şirket hangisidir?', 'Which company bought IBM''s personal computer division, including ThinkPad, in 2005?', '["Lenovo","Acer","Asus","Dell"]'::jsonb),
  ('Debian Linux dağıtımını 1993''te başlatan programcı kimdir?', 'Which programmer started the Debian Linux distribution in 1993?', '["Ian Murdock","Patrick Volkerding","Marc Ewing","Mark Shuttleworth"]'::jsonb),
  ('Radar magnetronu yanında cebindeki çikolatanın eridiğini fark ederek mikrodalga fırının icadına yol açan mühendis kimdir?', 'Which engineer led the way to the microwave oven after noticing a chocolate bar melting in his pocket near a radar magnetron?', '["Percy Spencer","Robert Watson-Watt","Edwin Armstrong","Lee de Forest"]'::jsonb),
  ('Boston Dynamics''in köpeği andıran dört ayaklı ticari robotunun adı nedir?', 'What is the name of Boston Dynamics'' dog-like, four-legged commercial robot?', '["Spot","Atlas","Stretch","Handle"]'::jsonb),
  ('Dijital kameraların görüntü algılayıcısı CCD''yi 1969''da icat eden Willard Boyle ve George Smith hangi kurumda çalışıyordu?', 'Willard Boyle and George Smith invented the CCD image sensor in 1969 while working where?', '["Bell Labs","Xerox PARC","IBM Research Center","Kodak Research Laboratories"]'::jsonb),
  ('Canlı yayın platformu Twitch, 2011''de hangi sitenin oyun kategorisinden ayrılarak kurulmuştur?', 'The streaming platform Twitch was spun off in 2011 from the gaming section of which website?', '["Justin.tv","Own3d.tv","Blip.tv","Ustream"]'::jsonb),
  ('Steve Jobs, Pixar''ın temelini oluşturan bilgisayar grafik bölümünü 1986''da hangi şirketten satın almıştır?', 'In 1986 Steve Jobs bought the computer graphics division that became Pixar from which company?', '["Lucasfilm","Paramount","Universal","Xerox"]'::jsonb),
  ('''Byte'' terimini 1956''da IBM''de ortaya atan bilgisayar bilimci kimdir?', 'Which computer scientist coined the term ''byte'' at IBM in 1956?', '["Werner Buchholz","Gene Amdahl","Frederick Brooks","John Backus"]'::jsonb),
  ('Twitter''da konuları # işaretiyle etiketleme fikrini 2007''de öneren tasarımcı kimdir?', 'Which designer proposed using the # sign to group topics on Twitter in 2007?', '["Chris Messina","Biz Stone","Evan Williams","Noah Glass"]'::jsonb),
  ('İlk ''Grand Theft Auto'' oyununu 1997''de geliştiren DMA Design hangi ülkenin şirketiydi?', 'DMA Design, the developer of the first ''Grand Theft Auto'' in 1997, was based in which country?', '["Scotland","Ireland","Canada","Wales"]'::jsonb),
  ('İlk elektronik hesap tablosu programı VisiCalc ilk olarak hangi bilgisayar için yazılmıştır?', 'VisiCalc, the first electronic spreadsheet program, was originally written for which computer?', '["Apple II","Commodore PET","IBM PC","TRS-80"]'::jsonb),
  ('Hewlett-Packard''ın ilk ürünü olan ses osilatörünü ''Fantasia'' filmi için satın alan stüdyo hangisidir?', 'Which studio bought Hewlett-Packard''s first product, an audio oscillator, for the film ''Fantasia''?', '["Walt Disney","MGM","Warner Bros.","Paramount"]'::jsonb),
  ('JetBrains''in geliştirdiği Kotlin programlama dili adını neyden almıştır?', 'JetBrains'' Kotlin programming language is named after what?', '["An island","A river","A type of coffee","A mountain pass"]'::jsonb),
  ('Sega şirketinin adı hangi ifadenin kısaltmasından gelir?', 'The company name Sega comes from an abbreviation of what?', '["Service Games","Special Electronic Games","Sound Engineering Games","Standard Entertainment"]'::jsonb),
  ('Nintendo''nun Super Mario oyunlarında Mario''nun yeşil şapkalı kardeşi kimdir?', 'In Nintendo''s Super Mario games, who is Mario''s brother in the green cap?', '["Luigi","Wario","Yoshi","Toad"]'::jsonb),
  ('Blaise Pascal''ın 1642''de yaptığı mekanik hesap makinesi Pascaline hangi işlemleri doğrudan yapabiliyordu?', 'Which operations could Blaise Pascal''s 1642 mechanical calculator, the Pascaline, perform directly?', '["Addition and subtraction","Multiplication and division","Powers and roots","Logarithms and powers"]'::jsonb),
  ('Nintendo''nun hem elde taşınabilen hem de televizyona bağlanabilen 2017 çıkışlı oyun konsolu hangisidir?', 'Which Nintendo console, released in 2017, can be used both as a handheld and connected to a TV?', '["Switch","Wii U","GameCube","3DS"]'::jsonb),
  ('Sega''nın maskotu Sonic ne tür bir hayvandır?', 'What kind of animal is Sega''s mascot Sonic?', '["A hedgehog","A fox","A squirrel","A mole"]'::jsonb),
  ('2021''de Mars''ta uçarak başka bir gezegende motorlu uçuş yapan ilk araç olan NASA helikopterinin adı nedir?', 'What was the name of the NASA helicopter that made the first powered flight on another planet, on Mars in 2021?', '["Ingenuity","Dragonfly","Sojourner","Zhurong"]'::jsonb),
  ('İstatistik programlama dili R, 1990''larda hangi ülkedeki bir üniversitede geliştirilmiştir?', 'The statistical programming language R was developed in the 1990s at a university in which country?', '["New Zealand","South Africa","United Kingdom","Australia"]'::jsonb),
  ('''Binary digit'' ifadesini kısaltarak ''bit'' kelimesini türeten istatistikçi kimdir?', 'Which statistician coined the word ''bit'' as a contraction of ''binary digit''?', '["John Tukey","Claude Shannon","Norbert Wiener","Alan Turing"]'::jsonb),
  ('''Moby Dick''te Kaptan Ahab''ın balina avı gemisinin adı nedir?', 'In ''Moby-Dick'', what is the name of Captain Ahab''s whaling ship?', '["Pequod","Nautilus","Hispaniola","Bounty"]'::jsonb),
  ('''Venedik Taciri''nde borcuna karşılık Antonio''dan bir libre et isteyen tefeci kimdir?', 'In ''The Merchant of Venice'', which moneylender demands a pound of Antonio''s flesh as a bond?', '["Shylock","Falstaff","Iago","Polonius"]'::jsonb),
  ('''Gulliver''in Gezileri''nde bilginlerin yaşadığı uçan adanın adı nedir?', 'In ''Gulliver''s Travels'', what is the name of the flying island inhabited by scholars?', '["Laputa","Lilliput","Brobdingnag","Blefuscu"]'::jsonb),
  ('''Maymunların Tarzanı'' romanıyla Tarzan karakterini yaratan yazar kimdir?', 'Which author created Tarzan in the novel ''Tarzan of the Apes''?', '["Edgar Rice Burroughs","H. Rider Haggard","Arthur Conan Doyle","Rudyard Kipling"]'::jsonb),
  ('''Robinson Crusoe''nun yazarı Daniel Defoe, romanı yazarken hangi gerçek kazazedenin öyküsünden esinlenmiştir?', 'Daniel Defoe''s ''Robinson Crusoe'' was inspired by the true story of which castaway?', '["Alexander Selkirk","William Bligh","James Cook","Fletcher Christian"]'::jsonb),
  ('''Otostopçunun Galaksi Rehberi''nde dev bilgisayarın ''hayat, evren ve her şey'' sorusuna verdiği cevap hangi sayıdır?', 'In ''The Hitchhiker''s Guide to the Galaxy'', what number does the supercomputer give as the answer to life, the universe and everything?', '["42","7","13","108"]'::jsonb),
  ('''Siberuzay'' kavramını yaygınlaştıran 1984 tarihli ''Neuromancer'' romanının yazarı kimdir?', 'Who wrote ''Neuromancer'' (1984), the novel that popularised the idea of ''cyberspace''?', '["William Gibson","Isaac Asimov","Philip K. Dick","Arthur C. Clarke"]'::jsonb),
  ('''Kral Lear''da babasına dalkavukluk etmeyi reddeden en küçük kızı kimdir?', 'In ''King Lear'', who is the youngest daughter who refuses to flatter her father?', '["Cordelia","Goneril","Regan","Ophelia"]'::jsonb),
  ('Gılgamış Destanı''nda tanrıların Gılgamış''a denk olsun diye yarattığı, sonra onun en yakın dostu olan vahşi adam kimdir?', 'In the Epic of Gilgamesh, which wild man is created by the gods as Gilgamesh''s equal and becomes his closest friend?', '["Enkidu","Humbaba","Utnapishtim","Lugalbanda"]'::jsonb),
  ('Orwell''in ''1984''üne de ilham veren, 1920''lerde yazılmış distopya ''Biz''in yazarı kimdir?', 'Who wrote ''We'', the 1920s dystopian novel that influenced Orwell''s ''Nineteen Eighty-Four''?', '["Yevgeny Zamyatin","Andrei Platonov","Mikhail Bulgakov","Boris Pilnyak"]'::jsonb),
  ('Edgar Allan Poe''nun öykülerinde gizemleri çözen, modern polisiyenin ilk dedektiflerinden sayılan Parisli karakter kimdir?', 'Which Parisian character, who solves mysteries in Edgar Allan Poe''s stories, is regarded as one of the first detectives of modern crime fiction?', '["Auguste Dupin","Hercule Poirot","Jules Maigret","Arsène Lupin"]'::jsonb),
  ('''Uğultulu Tepeler''de Earnshaw ailesinin evlat edindiği, Catherine''e tutkuyla bağlı kahraman kimdir?', 'In ''Wuthering Heights'', who is the foundling taken in by the Earnshaw family and passionately bound to Catherine?', '["Heathcliff","Mr. Rochester","Mr. Darcy","Edgar Linton"]'::jsonb),
  ('''Alice Harikalar Diyarında''da gövdesi kaybolup yalnızca sırıtışı havada kalan hayvan hangisidir?', 'In ''Alice''s Adventures in Wonderland'', which creature vanishes until only its grin remains?', '["The Cheshire Cat","The March Hare","The White Rabbit","The Caterpillar"]'::jsonb),
  ('Budapeşte''de bir arsa için savaşan çocukları anlatan ''Pal Sokağı Çocukları'' romanının yazarı kimdir?', 'Who wrote ''The Paul Street Boys'', the novel about boys fighting over a vacant lot in Budapest?', '["Ferenc Molnár","Erich Kästner","Edmondo De Amicis","Mark Twain"]'::jsonb),
  ('Márquez''in ''Yüzyıllık Yalnızlık'' romanında Buendía ailesinin kurduğu kasabanın adı nedir?', 'In García Márquez''s ''One Hundred Years of Solitude'', what is the name of the town founded by the Buendía family?', '["Macondo","Yoknapatawpha","Comala","Maycomb"]'::jsonb),
  ('Dante''nin ''İlahi Komedya''sında Cennet''te şaire rehberlik eden kadın kimdir?', 'In Dante''s ''Divine Comedy'', which woman guides the poet through Paradise?', '["Beatrice","Laura","Fiammetta","Francesca"]'::jsonb),
  ('Daniel Defoe''nun romanında Robinson Crusoe''nun ıssız adada kurtardığı yerliye verdiği ad nedir?', 'In Daniel Defoe''s novel, what name does Robinson Crusoe give to the native he rescues on the island?', '["Friday","Sunday","Tuesday","Thursday"]'::jsonb),
  ('Shakespeare''in ''Macbeth''inde kehanete göre Macbeth, hangi orman Dunsinane Tepesi''ne yürüyene dek yenilmeyecektir?', 'In Shakespeare''s ''Macbeth'', the prophecy says Macbeth will not be defeated until which wood comes to Dunsinane Hill?', '["Birnam","Arden","Sherwood","Ettrick"]'::jsonb),
  ('Sherlock Holmes''un ilk kez göründüğü 1887 tarihli roman hangisidir?', 'In which 1887 novel did Sherlock Holmes first appear?', '["A Study in Scarlet","The Sign of the Four","The Valley of Fear","The Hound of the Baskervilles"]'::jsonb),
  ('Türk edebiyatında köy yaşamını işleyen ilk yapıt sayılan ''Karabibik''in yazarı kimdir?', 'Who wrote ''Karabibik'', regarded as the first work of Turkish literature to depict village life?', '["Nabizade Nazım","Samipaşazade Sezai","Mehmet Rauf","Hüseyin Cahit"]'::jsonb),
  ('Endonezya''da 2003''te kalıntıları bulunan, yaklaşık bir metrelik boyu nedeniyle ''hobbit'' diye anılan soyu tükenmiş insan türü hangisidir?', 'Which extinct human species, discovered in Indonesia in 2003, is nicknamed the ''hobbit'' because of its height of about one metre?', '["Homo floresiensis","Homo naledi","Homo antecessor","Homo ergaster"]'::jsonb),
  ('''Kuru buz'' hangi maddenin katı hâlidir?', '''Dry ice'' is the solid form of which substance?', '["Carbon dioxide","Sulphur dioxide","Hydrogen","Ammonia"]'::jsonb),
  ('Jüpiter''in hangi uydusunun kalın buz kabuğunun altında sıvı su okyanusu bulunduğu düşünülmektedir?', 'Which of Jupiter''s moons is thought to have a liquid water ocean beneath its thick ice shell?', '["Europa","Io","Amalthea","Himalia"]'::jsonb),
  ('Namib Çölü''ne özgü olan ve yüzyıllarca yaşadığı ömrü boyunca yalnızca iki yaprak büyüten bitki hangisidir?', 'Which plant, native to the Namib Desert, grows only two leaves throughout a life that can last centuries?', '["Welwitschia","Baobab","Rafflesia","Nepenthes"]'::jsonb),
  ('Doğal seçilim kuramını Darwin''den bağımsız olarak geliştiren, Malay Takımadaları''nda çalışmış doğa bilimci kimdir?', 'Which naturalist, who worked in the Malay Archipelago, developed the theory of natural selection independently of Darwin?', '["Alfred Russel Wallace","Thomas Henry Huxley","Joseph Dalton Hooker","Charles Lyell"]'::jsonb),
  ('Mısıra dayalı beslenmenin yaygın olduğu bölgelerde görülen, niasin (B3 vitamini) eksikliğinden kaynaklanan hastalık hangisidir?', 'Which disease, common where diets rely heavily on maize, is caused by a lack of niacin (vitamin B3)?', '["Pellagra","Beriberi","Scurvy","Goitre"]'::jsonb),
  ('D vitamini eksikliğinin çocuklarda kemiklerin yumuşayıp eğilmesine yol açan hastalığı hangisidir?', 'Which disease, caused by vitamin D deficiency, softens and bends the bones of children?', '["Rickets","Scurvy","Beriberi","Pellagra"]'::jsonb),
  ('Olgunlaştıktan sonra yaşam döngüsünü tersine çevirip yeniden gençleşebildiği için ''ölümsüz'' diye anılan Turritopsis dohrnii ne tür bir canlıdır?', 'Turritopsis dohrnii, called ''immortal'' because it can reverse its life cycle after maturing, is what kind of animal?', '["A jellyfish","A starfish","A sea urchin","A sea cucumber"]'::jsonb),
  ('Kara deliklerin kuantum etkileri sayesinde ışıma yayarak zamanla buharlaşabileceğini 1974''te öne süren fizikçi kimdir?', 'Which physicist proposed in 1974 that black holes can emit radiation through quantum effects and slowly evaporate?', '["Stephen Hawking","Roger Penrose","Kip Thorne","John Wheeler"]'::jsonb),
  ('Dünya''yı kendi kendini düzenleyen tek bir sistem olarak ele alan Gaia hipotezini 1970''lerde öneren bilim insanı kimdir?', 'Which scientist proposed the Gaia hypothesis in the 1970s, treating Earth as a single self-regulating system?', '["James Lovelock","E. O. Wilson","Richard Dawkins","Carl Woese"]'::jsonb),
  ('Mauritius adasına özgü olan ve 17. yüzyılda soyu tükenen uçamayan kuş hangisidir?', 'Which flightless bird, found only on Mauritius, became extinct in the 17th century?', '["The dodo","The moa","The great auk","The kiwi"]'::jsonb),
  ('Yelpaze biçimli yapraklarıyla tanınan ve ''yaşayan fosil'' sayılan ağaç hangisidir?', 'Which tree, known for its fan-shaped leaves, is considered a ''living fossil''?', '["Ginkgo","Plane tree","Linden","Maple"]'::jsonb),
  ('Hacim bakımından dünyanın en büyük tek gövdeli ağacı sayılan ''General Sherman'' hangi türdendir?', '''General Sherman'', considered the world''s largest single-trunk tree by volume, is of which species?', '["Giant sequoia","Coast redwood","Eucalyptus","Baobab"]'::jsonb),
  ('1974''te Etiyopya''da bulunan ünlü ''Lucy'' fosili hangi türe aittir?', 'The famous ''Lucy'' fossil, found in Ethiopia in 1974, belongs to which species?', '["Australopithecus afarensis","Australopithecus africanus","Ardipithecus ramidus","Paranthropus boisei"]'::jsonb),
  ('Dünya''da bulunmadan önce 1868''de bir Güneş tutulması sırasında Güneş''in tayfında saptanan element hangisidir?', 'Which element was detected in the Sun''s spectrum during an 1868 solar eclipse before it was found on Earth?', '["Helium","Neon","Argon","Krypton"]'::jsonb),
  ('Bal arıları peteklerini hangi maddeden örer?', 'What material do honeybees build their honeycombs from?', '["Beeswax","Resin","Clay","Pollen"]'::jsonb),
  ('Voyager 1''in 1990''da yaklaşık 6 milyar km uzaktan çektiği Dünya fotoğrafına ''Soluk Mavi Nokta'' adını veren bilim insanı kimdir?', 'Which scientist named Voyager 1''s 1990 photo of Earth, taken from about 6 billion km away, the ''Pale Blue Dot''?', '["Carl Sagan","Stephen Hawking","Frank Drake","Neil deGrasse Tyson"]'::jsonb),
  ('Hawaii''deki Mauna Loa Gözlemevi''nde 1958''den beri ölçülen atmosferdeki karbondioksit artışı grafiği kimin adıyla anılır?', 'The graph of rising atmospheric carbon dioxide measured at Hawaii''s Mauna Loa Observatory since 1958 is named after whom?', '["Keeling","Revelle","Arrhenius","Callendar"]'::jsonb),
  ('Tanzanya''daki Gombe''de şempanzelerin alet yapıp kullandığını ilk gözlemleyen primatolog kimdir?', 'Which primatologist first observed chimpanzees making and using tools at Gombe in Tanzania?', '["Jane Goodall","Dian Fossey","Biruté Galdikas","Cheryl Knott"]'::jsonb),
  ('Sibirya''daki Altay Dağları''nda bir mağarada bulunan parmak kemiğinin DNA''sıyla tanımlanan eski insan grubu hangisidir?', 'Which archaic human group was identified from the DNA of a finger bone found in a cave in Siberia''s Altai Mountains?', '["Denisovans","Neanderthals","Cro-Magnons","Grimaldi people"]'::jsonb),
  ('Güneş Sistemi''ni en dıştan küresel bir kabuk gibi sardığı düşünülen, uzun dönemli kuyruklu yıldızların kaynağı sayılan yapı hangisidir?', 'Which structure, thought to surround the Solar System like a spherical shell, is considered the source of long-period comets?', '["The Oort Cloud","The Kuiper Belt","The Scattered Disc","The Asteroid Belt"]'::jsonb),
  ('Charles Darwin''in 1831-1836 yılları arasında dünya çevresinde yaptığı yolculuktaki geminin adı nedir?', 'What was the name of the ship on which Charles Darwin sailed around the world from 1831 to 1836?', '["HMS Beagle","HMS Endeavour","HMS Bounty","HMS Victory"]'::jsonb),
  ('1415''te Konstanz Konsili kararıyla yakılan Bohemyalı din reformcusu kimdir?', 'Which Bohemian church reformer was burned at the stake in 1415 by order of the Council of Constance?', '["Jan Hus","Jan Žižka","Ulrich Zwingli","Girolamo Savonarola"]'::jsonb),
  ('Lale soğanı fiyatlarının fırlayıp 1637''de çöktüğü ''Lale Çılgınlığı'' hangi ülkede yaşanmıştır?', 'In which country did ''Tulip Mania'', when tulip bulb prices soared and then crashed in 1637, take place?', '["Netherlands","France","Portugal","Switzerland"]'::jsonb),
  ('IV. Murad ve Sultan İbrahim''in annesi olan, 1651''de saray içinde öldürülen valide sultan kimdir?', 'Which valide sultan, mother of Murad IV and Sultan Ibrahim, was killed inside the palace in 1651?', '["Kösem Sultan","Hürrem Sultan","Safiye Sultan","Nurbanu Sultan"]'::jsonb),
  ('Almanya''nın 22 Haziran 1941''de Sovyetler Birliği''ne başlattığı saldırının kod adı nedir?', 'What was the code name of Germany''s invasion of the Soviet Union launched on 22 June 1941?', '["Barbarossa","Sea Lion","Citadel","Weserübung"]'::jsonb),
  ('1890''da Japonya dönüşünde Kuşimoto açıklarında fırtınada batan Osmanlı gemisi hangisidir?', 'Which Ottoman ship sank in a storm off Kushimoto in 1890 while returning from Japan?', '["Ertuğrul","Hamidiye","Mecidiye","Nusret"]'::jsonb),
  ('Apollo 11 görevinde Ay''a inmeyip Columbia komuta modülünde yörüngede kalan astronot kimdir?', 'Which Apollo 11 astronaut stayed in lunar orbit aboard the command module Columbia instead of landing on the Moon?', '["Michael Collins","Edwin Aldrin","James Lovell","Charles Conrad"]'::jsonb),
  ('1989''da Çekoslovakya''daki Kadife Devrim''in ardından cumhurbaşkanı olan oyun yazarı kimdir?', 'Which playwright became president after Czechoslovakia''s 1989 Velvet Revolution?', '["Václav Havel","Alexander Dubček","Gustáv Husák","Milan Kundera"]'::jsonb),
  ('Tarihin en kısa savaşı sayılan ve 1896''da 40 dakika kadar süren savaş Britanya ile hangi sultanlık arasında yapılmıştır?', 'The shortest war in history, lasting about 40 minutes in 1896, was fought between Britain and which sultanate?', '["Zanzibar","Brunei","Johor","Lahej"]'::jsonb),
  ('Osmanlı dış borçlarını yönetmek için Düyun-u Umumiye İdaresi''nin kurulmasını sağlayan 1881 tarihli belge hangisidir?', 'Which 1881 decree set up the Ottoman Public Debt Administration to manage the empire''s foreign debts?', '["Decree of Muharrem","Imperial Reform Edict","Ottoman Constitution","Tanzimat Edict"]'::jsonb),
  ('Fransa Kraliçesi Marie Antoinette doğuştan hangi ülkenin prensesiydi?', 'Queen Marie Antoinette of France was born a princess of which country?', '["Austria","Spain","Bavaria","Savoy"]'::jsonb),
  ('1932''de Avustralya ordusunun makineli tüfeklerle, ekinlere zarar veren hangi kuşlara karşı başarısız bir ''savaş'' yürüttüğü bilinir?', 'In 1932 the Australian army waged an unsuccessful ''war'' with machine guns against which crop-damaging birds?', '["Emus","Cassowaries","Cockatoos","Pelicans"]'::jsonb),
  ('1919''da dev bir tanktan taşan melasın 21 kişinin ölümüne yol açtığı ''Büyük Melas Seli'' hangi şehirde yaşanmıştır?', 'In which city did the 1919 ''Great Molasses Flood'', which killed 21 people when a huge tank burst, take place?', '["Boston","Chicago","Baltimore","Philadelphia"]'::jsonb),
  ('1974''te askerlerin tüfek namlularına karanfil taktığı ve diktatörlüğü deviren kansız darbe hangi ülkede olmuştur?', 'In which country did the bloodless 1974 coup, in which soldiers put carnations in their rifle barrels, bring down the dictatorship?', '["Portugal","Spain","Greece","Italy"]'::jsonb),
  ('Kuzey Amerika''ya ayak basan ilk Avrupalı sayılan Viking kâşif kimdir?', 'Which Viking explorer is regarded as the first European to set foot in North America?', '["Leif Erikson","Erik the Red","Harald Hardrada","Ragnar Lodbrok"]'::jsonb),
  ('Osmanlı Devleti Bağdat Demiryolu''nun yapım imtiyazını hangi ülkenin şirketine vermiştir?', 'The Ottoman Empire granted the concession to build the Baghdad Railway to a company from which country?', '["Germany","Britain","France","Austria-Hungary"]'::jsonb),
  ('Ağabeyi II. Bayezid''le taht mücadelesini kaybedip ömrünün sonunu Rodos şövalyeleri ve Papalığın gözetiminde geçiren şehzade kimdir?', 'Which Ottoman prince lost the struggle for the throne to his brother Bayezid II and spent the rest of his life in the custody of the Knights of Rhodes and the Papacy?', '["Cem Sultan","Prince Korkut","Prince Mustafa","Prince Bayezid"]'::jsonb),
  ('Bizans''ın deniz savaşlarında kullandığı, suyla sönmeyen ''Rum ateşi''ni 7. yüzyılda geliştirdiği anlatılan mimar kimdir?', 'Which architect is said to have developed ''Greek fire'', the Byzantine naval weapon that water could not put out, in the 7th century?', '["Kallinikos","Anthemios","Isidore","Procopius"]'::jsonb),
  ('1913 Bâbıâli Baskını sırasında öldürülen Harbiye Nazırı kimdir?', 'Which Ottoman Minister of War was killed during the 1913 Raid on the Sublime Porte?', '["Nazım Pasha","Kâmil Pasha","Said Halim Pasha","Hüseyin Hilmi Pasha"]'::jsonb),
  ('Yüzlerce kişinin günlerce durmadan dans ettiği 1518 ''dans salgını'' hangi şehirde görülmüştür?', 'In which city did the 1518 ''dancing plague'', when hundreds of people danced for days without stopping, break out?', '["Strasbourg","Nuremberg","Frankfurt","Augsburg"]'::jsonb),
  ('Japon mutfağında pirinç kullanılmadan ince dilimlenerek sunulan çiğ balığa ne ad verilir?', 'In Japanese cuisine, what is thinly sliced raw fish served without rice called?', '["Sashimi","Tempura","Yakitori","Teriyaki"]'::jsonb),
  ('İki parçalı ''bikini'' mayoyu 1946''da bu adla tanıtan Fransız tasarımcı kimdir?', 'Which French designer introduced the two-piece swimsuit under the name ''bikini'' in 1946?', '["Louis Réard","Christian Dior","Hubert de Givenchy","Paul Poiret"]'::jsonb),
  ('İtalyan mutfağında makarnanın ''al dente'' pişirilmesi ne anlama gelir?', 'In Italian cooking, what does it mean to cook pasta ''al dente''?', '["Slightly firm","Completely soft","Butter-tossed","Slowly steamed"]'::jsonb),
  ('''Jumbo'' kelimesini ''dev boy'' anlamında yaygınlaştıran, 1882''de Londra Hayvanat Bahçesi''nden Barnum Sirki''ne satılan hayvan neydi?', 'The word ''jumbo'', meaning extra large, was popularised by which animal sold by London Zoo to Barnum''s circus in 1882?', '["An elephant","A giraffe","A hippopotamus","A rhinoceros"]'::jsonb),
  ('Telsizde kullanılan ''Mayday'' tehlike çağrısı hangi dildeki bir ifadeden türemiştir?', 'The radio distress call ''Mayday'' comes from a phrase in which language?', '["French","Spanish","Italian","German"]'::jsonb),
  ('İtalyan kahvesi ''cappuccino'' adını hangi grubun giysisinin renginden alır?', 'The Italian coffee ''cappuccino'' is named after the colour of which group''s habits?', '["Capuchin friars","Benedictine monks","Dominican friars","Carthusian monks"]'::jsonb),
  ('Domates, mozzarella ve fesleğeniyle İtalyan bayrağını andıran pizza hangi kraliçenin adını taşır?', 'Which queen gave her name to the pizza whose tomato, mozzarella and basil echo the Italian flag?', '["Margherita","Elena","Vittoria","Maria José"]'::jsonb),
  ('Lale anlamındaki İngilizce ''tulip'' kelimesi, çiçeğin benzetildiği hangi Türkçe kelimeye dayanır?', 'The English word ''tulip'' goes back to a Turkish word for which item that the flower was likened to?', '["Turban","Crane","Bagpipe","Tomb"]'::jsonb),
  ('Fındıklı kakao kreması Nutella''yı üreten İtalyan şirketi hangisidir?', 'Which Italian company makes the hazelnut cocoa spread Nutella?', '["Ferrero","Barilla","Lavazza","Perugina"]'::jsonb)
  ) v(soru, en_soru, en_secenekler)
  join public.questions q on q.soru = v.soru and q.created_at >= transaction_timestamp()
on conflict (question_id, dil) do nothing;

-- ---------------------------------------------------- Çevrilmeyenler
insert into public.ceviri_atlanan (question_id, dil, neden, kod)
select q.id, 'en', v.neden, 'cevrilemez'
  from (values
  ('''Evler'', ''Çevre'' ve ''Kapalı Çarşı'' şiir kitaplarının şairi kimdir?', 'Türkçe şiir kitabı adlarına dayanıyor; İngilizce oyuncu için anlamlı değil.'),
  ('Hüseyin Rahmi Gürpınar''ın, bir köşkte görülen hayaletin düzmece çıktığı ve batıl inançla alay ettiği romanı hangisidir?', 'Türkçe roman adlarından seçim; İngilizce oyuncu için anlamlı değil.')
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
