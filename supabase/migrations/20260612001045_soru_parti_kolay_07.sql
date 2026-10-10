-- ============================================================
-- 1045 — soru_parti_kolay_07 (stil: docs/SORU_STIL_PROFILI.md): 108 soru · 2026-10-10
--
-- Kategori: edebiyat 22 · genel_kultur 14 · muzik 20 · sanat 10 · tarih 4 · teknoloji 38
-- Yerel (kapsam='yerel', ulke='TR'): 5 · zorluk 1–5: 0/69/39/0/0
-- İngilizce çeviri: 103 · çevrilmeyen (ceviri_atlanan, kod 'cevrilemez'): 5
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
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti 7 --no 1045 --klasor kolay-07 --ad soru_parti_kolay_07 --api
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
('Charlie Chaplin''in serseri karakteri Şarlo elinde hangi nesneyi taşır?', '["Baston","Şemsiye","Çanta","Fener"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Antonio Stradivari en çok hangi çalgının yapımcısı olarak ünlüdür?', '["Keman","Piyano","Klavsen","Flüt"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Magritte''in ''İmgelerin İhaneti'' tablosunda resmedilen nesne nedir?', '["Pipo","Şapka","Elma","Şemsiye"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Ringo Starr, The Beatles''ta hangi çalgıyı çalardı?', '["Davul","Bas gitar","Klavye","Ritim gitar"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Dev taş Moai heykelleriyle ünlü ada hangisidir?', '["Paskalya Adası","Noel Adası","Pitcairn Adası","Norfolk Adası"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Türkiye''ye Eurovision Şarkı Yarışması''nda ilk birinciliği getiren şarkıcı kimdir?', '["Sertab Erener","Candan Erçetin","Kenan Doğulu","Hadise"]'::jsonb, 0, 'sanat', 'yerel', 'TR', 2),
('''Casablanca'' filminde ''As Time Goes By''ı çalması istenen piyanistin adı nedir?', '["Sam","Joe","Ray","Max"]'::jsonb, 0, 'sanat', 'global', null, 3),
('''Damdaki Kemancı'' müzikalinin baş karakteri Tevye''nin mesleği nedir?', '["Sütçü","Terzi","Fırıncı","Kasap"]'::jsonb, 0, 'sanat', 'global', null, 3),
('Kankan müziğiyle ünlü ''Cehennemde Orfeus'' operetinin bestecisi kimdir?', '["Offenbach","Saint-Saëns","Massenet","Gounod"]'::jsonb, 0, 'sanat', 'global', null, 3),
('Kral Lear''ın kendisini gerçekten seven ama mirastan dışladığı kızı kimdir?', '["Cordelia","Goneril","Regan","Miranda"]'::jsonb, 0, 'sanat', 'global', null, 3),
('Motown plak şirketi hangi ABD şehrinde kurulmuştur?', '["Detroit","Chicago","Memphis","Philadelphia"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Sweet Caroline'' şarkısının sahibi olan Amerikalı şarkıcı kimdir?', '["Neil Diamond","Barry Manilow","Billy Joel","Tom Jones"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Jim Morrison hangi rock grubunun solistiydi?', '["The Doors","The Byrds","The Who","The Kinks"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Stronger'' ve ''Gold Digger'' şarkılarıyla tanınan rapçi kimdir?', '["Kanye West","Jay-Z","Kendrick Lamar","Travis Scott"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Ele Güne Karşı'' ve ''Peki Peki Anladık'' şarkılarıyla tanınan grup hangisidir?', '["MFÖ","Moğollar","Kurtalan Ekspres","Mavi Sakal"]'::jsonb, 0, 'muzik', 'yerel', 'TR', 2),
('Baz Luhrmann''ın ''Elvis'' (2022) filminde Elvis Presley''yi canlandıran oyuncu kimdir?', '["Austin Butler","Ansel Elgort","Miles Teller","Timothée Chalamet"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''School of Rock'' filminde öğrencilerden rock grubu kuran sahte öğretmeni kim oynar?', '["Jack Black","Will Ferrell","Adam Sandler","Ben Stiller"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''The Greatest Showman'' müzikal filminde P. T. Barnum''u canlandıran oyuncu kimdir?', '["Hugh Jackman","Russell Crowe","Ryan Gosling","Ewan McGregor"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Jamie Foxx hangi müzisyeni canlandırarak En İyi Erkek Oyuncu Oscar''ını kazandı?', '["Ray Charles","Stevie Wonder","Nat King Cole","Sam Cooke"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Sister Act'' filminde rahibe kılığında saklanan bar şarkıcısını kim oynar?', '["Whoopi Goldberg","Queen Latifah","Halle Berry","Angela Bassett"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Chandelier'' şarkısını seslendiren, sahnede yüzünü perukla gizleyen şarkıcı kimdir?', '["Sia","Lorde","Kesha","Halsey"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Nirvana ve Pearl Jam''in çıktığı grunge akımı hangi ABD şehriyle özdeşleşir?', '["Seattle","Portland","Chicago","San Diego"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Anarchy in the U.K.'' ve ''God Save the Queen'' şarkılarıyla tanınan punk grubu hangisidir?', '["Sex Pistols","The Clash","Ramones","The Damned"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Purple Haze'' ve ''Hey Joe'' ile özdeşleşen efsanevi gitarist kimdir?', '["Jimi Hendrix","Eric Clapton","Jimmy Page","Chuck Berry"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Operadaki Hayalet'' müzikalinde hayaletin tutulduğu genç soprano kimdir?', '["Christine","Cosette","Juliette","Marguerite"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Queen grubunun davulcusu kimdir?', '["Roger Taylor","Ian Paice","Charlie Watts","Phil Collins"]'::jsonb, 0, 'muzik', 'global', null, 3),
('''West Side Story'' müzikalinin müziğini besteleyen kimdir?', '["Leonard Bernstein","George Gershwin","Cole Porter","Irving Berlin"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Ünlü ''Guillaume Tell'' (William Tell) uvertürünün bestecisi kimdir?', '["Gioachino Rossini","Gaetano Donizetti","Vincenzo Bellini","Giuseppe Verdi"]'::jsonb, 0, 'muzik', 'global', null, 3),
('''Moldau'' (Vltava) adlı senfonik şiirin bestecisi kimdir?', '["Bedrich Smetana","Leos Janacek","Antonin Dvorak","Bohuslav Martinu"]'::jsonb, 0, 'muzik', 'global', null, 3),
('Efsanevi Woodstock festivali hangi ABD eyaletinde yapılmıştır?', '["New York","California","New Jersey","Pennsylvania"]'::jsonb, 0, 'muzik', 'global', null, 3),
('PlayStation''da bir oyunun tüm kupaları toplanınca hangi kupa kazanılır?', '["Platin","Altın","Elmas","Kristal"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Windows''ta seçili metni kesip panoya almak için kullanılan klavye kısayolu hangisidir?', '["Ctrl+X","Ctrl+C","Ctrl+K","Ctrl+B"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Minecraft''ta yay ve okla saldıran düşman yaratık hangisidir?', '["İskelet","Zombi","Örümcek","Enderman"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Telegram mesajlaşma uygulamasının logosunda hangi figür yer alır?', '["Kâğıt uçak","Zarf","Konuşma balonu","Güvercin"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Danny Boyle''un 2015 yapımı ''Steve Jobs'' filminde Jobs''u kim canlandırmıştır?', '["Michael Fassbender","Ashton Kutcher","Jesse Eisenberg","Andrew Garfield"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('''Angry Birds'' mobil oyununu geliştiren Fin şirketi hangisidir?', '["Rovio","Supercell","King","Zynga"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('''GTA V'' oyununda Michael ve Franklin''in yanındaki üçüncü oynanabilir karakter kimdir?', '["Trevor","Niko","Tommy","Claude"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Motorola''nın 2004''te çıkardığı ince kapaklı ünlü telefon modeli hangisidir?', '["Razr","3310","Communicator","Sidekick"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Sonic serisindeki kırmızı ekidna karakterin adı nedir?', '["Knuckles","Shadow","Silver","Espio"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Minecraft''ta gözüne bakınca saldıran, blok taşıyabilen uzun siyah yaratık hangisidir?', '["Enderman","Creeper","Blaze","Ghast"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Google''ı Larry Page ile birlikte kuran kişi kimdir?', '["Sergey Brin","Eric Schmidt","Sundar Pichai","Reed Hastings"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('''Cyberpunk 2077'' oyunu hangi kurgusal şehirde geçer?', '["Night City","Liberty City","Midgar","Columbia"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Roblox oyun platformunda kullanılan sanal paranın adı nedir?', '["Robux","V-Bucks","Simoleon","Minecoin"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Pokémon animesinin kahramanı Ash''in soyadı nedir?', '["Ketchum","Oak","Birch","Rowan"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Apple''ın genel merkezi Kaliforniya''nın hangi şehrinde bulunur?', '["Cupertino","Mountain View","Menlo Park","Palo Alto"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Apple''ın 1998''de çıkardığı renkli, yarı saydam kasalı bilgisayarı hangisidir?', '["iMac","Lisa","Apple III","PowerBook"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('''Pokémon Go'' mobil oyununu geliştiren şirket hangisidir?', '["Niantic","Zynga","Rovio","Supercell"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Togg''un seri üretime giren ilk modelinin adı nedir?', '["T10X","T10F","TX1","T8X"]'::jsonb, 0, 'teknoloji', 'yerel', 'TR', 2),
('Hem ''Crash Bandicoot'' hem ''The Last of Us'' oyunlarını geliştiren stüdyo hangisidir?', '["Naughty Dog","Insomniac Games","Sucker Punch","Santa Monica Studio"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Super Mario oyunlarında Prenses Peach''i kaçıran kaplumbağa benzeri kötü karakter kimdir?', '["Bowser","Wario","Ganondorf","King K. Rool"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Sony''nin 2004''te piyasaya sürdüğü ilk el konsolu hangisidir?', '["PSP","PS Vita","Game Gear","Nintendo DS"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('''Sosyal Ağ'' (2010) filminde Mark Zuckerberg''i hangi oyuncu canlandırmıştır?', '["Jesse Eisenberg","Andrew Garfield","Michael Cera","Jonah Hill"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Amazon''un Alexa asistanıyla çalışan akıllı hoparlör serisinin adı nedir?', '["Echo","HomePod","Nest","Sonos"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Mac klavyelerinde kopyala-yapıştır kısayollarında Ctrl yerine kullanılan tuş hangisidir?', '["Command","Option","Control","Shift"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Nvidia''yı 1993''te kuranlardan biri olup CEO''luğunu üstlenen kişi kimdir?', '["Jensen Huang","Lisa Su","Pat Gelsinger","Satya Nadella"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Atari''nin 1972''de çıkardığı, masa tenisini taklit eden ünlü oyun hangisidir?', '["Pong","Breakout","Asteroids","Centipede"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Elon Musk''ın kurduğu beyin-bilgisayar arayüzü şirketi hangisidir?', '["Neuralink","DeepMind","Synchron","Kernel"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Türk oyun şirketi Peak Games''i 2020''de satın alan şirket hangisidir?', '["Zynga","King","Supercell","Rovio"]'::jsonb, 0, 'teknoloji', 'yerel', 'TR', 3),
('''Plants vs. Zombies'' oyununu geliştiren şirket hangisidir?', '["PopCap","Rovio","Supercell","Zynga"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('Çin''in popüler mesajlaşma uygulaması WeChat''i geliştiren şirket hangisidir?', '["Tencent","Alibaba","Baidu","Huawei"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('Go şampiyonu Lee Sedol''u yenen AlphaGo''yu hangi şirket geliştirmiştir?', '["DeepMind","OpenAI","Anthropic","Nvidia"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('PlayStation kumandasındaki dört simgeden hangisi yeşil renktedir?', '["Üçgen","Kare","Daire","Çarpı"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('Windows 95''in tanıtım kampanyasında kullanılan Rolling Stones şarkısı hangisidir?', '["Start Me Up","Satisfaction","Paint It Black","Angie"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('Ekşi Sözlük''ü 1999''da kuran kişi kimdir?', '["Sedat Kapanoğlu","Nevzat Aydın","Hakan Bulgurlu","Sina Afra"]'::jsonb, 0, 'teknoloji', 'yerel', 'TR', 3),
('Sega Mega Drive konsolu Kuzey Amerika''da hangi adla satılmıştır?', '["Genesis","Saturn","Master System","Dreamcast"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('Microsoft''un genel merkezi hangi ABD şehrinde bulunur?', '["Redmond","Cupertino","Mountain View","Palo Alto"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('StarCraft''ta Terran ve Protoss''un yanındaki üçüncü oynanabilir ırk hangisidir?', '["Zerg","Covenant","Chimera","Locust"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('''The Legend of Zelda'' serisinde Link''in sadık atının adı nedir?', '["Epona","Agro","Roach","Shadowfax"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('Rushmore Dağı''na yüzü oyulan ABD başkanlarından biri OLMAYAN hangisidir?', '["John Adams","George Washington","Thomas Jefferson","Abraham Lincoln"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Mao önderliğindeki Çinli komünistlerin binlerce kilometrelik büyük geri çekilmesi hangi adla bilinir?', '["Uzun Yürüyüş","Büyük Sıçrama","Kültür Devrimi","Yüz Çiçek"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Anne Frank ve ailesi Nazilerden hangi şehirdeki gizli bir bölmede saklandı?', '["Amsterdam","Rotterdam","Frankfurt","Brüksel"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Ünlü gezgin Marco Polo hangi İtalyan şehir devletindendi?', '["Venedik","Cenova","Floransa","Pisa"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Vatikan''daki ünlü ''Atina Okulu'' freskinin ressamı kimdir?', '["Raffaello","Michelangelo","Leonardo","Tiziano"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Picasso ile Braque''ın birlikte geliştirdiği sanat akımı hangisidir?', '["Kübizm","Fovizm","Dadaizm","Sürrealizm"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('''Buz Devri'' filmlerinde sürekli palamudunun peşinden koşan sincap benzeri yaratığın adı nedir?', '["Scrat","Sid","Manny","Diego"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('''Simpsonlar'' ailesi hangi kasabada yaşar?', '["Springfield","Shelbyville","Quahog","Riverdale"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Pipo resminin altına ''Bu bir pipo değildir'' yazan ünlü tablonun ressamı kimdir?', '["René Magritte","Salvador Dalí","Max Ernst","Joan Miró"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('Starbucks adını hangi romandaki bir karakterden almıştır?', '["Moby Dick","Define Adası","Robinson Crusoe","Yaşlı Adam ve Deniz"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('Teniste sıfır puan İngilizcede hangi sözcükle söylenir?', '["Love","Nil","Duck","Blank"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('''Mutlu Prens'' masalının yazarı kimdir?', '["Oscar Wilde","Charles Dickens","Lewis Carroll","Rudyard Kipling"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('Ferrari''nin fabrikası ve merkezi hangi İtalyan kasabasındadır?', '["Maranello","Imola","Monza","Sant''Agata"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('''Casablanca'' filminde bar sahibi Rick''i canlandıran oyuncu kimdir?', '["Humphrey Bogart","Cary Grant","Clark Gable","James Stewart"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('''Game of Thrones''ta Daenerys''in üç ejderhasından en büyüğünün adı nedir?', '["Drogon","Rhaegal","Viserion","Balerion"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('Tac Mahal''i eşi için yaptıran Babür hükümdarı kimdir?', '["Şah Cihan","Ekber Şah","Babür Şah","Cihangir Şah"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('''Breaking Bad''de Walter White''ın ortağı Jesse''nin soyadı nedir?', '["Pinkman","Fring","Salamanca","Ehrmantraut"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('George Orwell''ın ''1984'' romanının baş karakterinin adı nedir?', '["Winston","Bernard","Julian","Holden"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('Rick Riordan''ın kahramanı Percy Jackson hangi Yunan tanrısının oğludur?', '["Poseidon","Zeus","Hades","Apollon"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Robin Hood''un baş düşmanı olan şerif hangi kentin şerifidir?', '["Nottingham","Canterbury","Leicester","Lincoln"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Tom Sawyer''ın Maceraları''nda Tom''un gönlünü kaptırdığı kızın adı nedir?', '["Becky","Polly","Mary","Sally"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Shakespeare''in ''Romeo ve Juliet'' oyununda Romeo hangi ailedendir?', '["Montague","Capulet","Sforza","Borgia"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Ali Baba masalında hazine mağarasını açan sihirli sözde hangi bitkinin adı geçer?', '["Susam","Buğday","Arpa","Mercimek"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Winnie the Pooh'' kitaplarının yazarı kimdir?', '["A.A. Milne","Kenneth Grahame","Lewis Carroll","J.M. Barrie"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Shakespeare''in ''Othello'' oyununda Othello''nun kıskançlıkla öldürdüğü eşi kimdir?', '["Desdemona","Ophelia","Cordelia","Rosalind"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Açlık Oyunları''nda Katniss''le birlikte arenaya giren 12. Mıntıka''nın erkek haracı kimdir?', '["Peeta","Gale","Finnick","Haymitch"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Yüzüklerin Efendisi''nde Frodo''nun bahçıvanı olan sadık yol arkadaşı kimdir?', '["Sam","Merry","Pippin","Legolas"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Harry Potter''ın teyzesi ve eniştesiyle yaşadığı evin bulunduğu sokağın adı nedir?', '["Privet Drive","Grimmauld Place","Spinner''s End","Diagon Alley"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Pippi Uzunçorap'' karakterini yaratan yazar kimdir?', '["Astrid Lindgren","Selma Lagerlöf","Tove Jansson","Enid Blyton"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Tolstoy''un romanının sonunda Anna Karenina kendini neyin altına atar?', '["Tren","Tramvay","At arabası","Kızak"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Tom Amca''nın Kulübesi'' romanının yazarı kimdir?', '["Harriet Beecher Stowe","Louisa May Alcott","Frances Hodgson Burnett","Elizabeth Gaskell"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Kral Arthur efsanelerinde Arthur''un eşi olan kraliçenin adı nedir?', '["Guinevere","Gwendolyn","Isolde","Morgana"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Frankenstein'' romanında Victor Frankenstein yaratığını hangi üniversite kentinde yaratır?', '["Ingolstadt","Heidelberg","Jena","Leipzig"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('H.G. Wells''in ''Görünmez Adam'' romanındaki görünmez bilim insanının soyadı nedir?', '["Griffin","Moreau","Prendick","Kemp"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('''Bir Yaz Gecesi Rüyası''nda başı eşek başına dönüştürülen dokumacı kimdir?', '["Bottom","Puck","Oberon","Lysander"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('Daphne du Maurier''nin ''Rebecca'' romanındaki de Winter malikânesinin adı nedir?', '["Manderley","Pemberley","Thornfield","Wildfell"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('''Otostopçunun Galaksi Rehberi''ndeki bunalımlı robotun adı nedir?', '["Marvin","Eddie","Zaphod","Arthur"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('Roald Dahl''ın ''Koca Sevimli Dev'' kitabında devle dost olan yetim kızın adı nedir?', '["Sophie","Matilda","Lucy","Wendy"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('''Bambi'' romanının yazarı kimdir?', '["Felix Salten","Erich Kästner","Hermann Hesse","Stefan Zweig"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('Roald Dahl''ın ''Matilda'' kitabındaki zalim okul müdiresinin soyadı nedir?', '["Trunchbull","Wormwood","Honey","Hardcastle"]'::jsonb, 0, 'edebiyat', 'global', null, 3)
on conflict (soru) do nothing;

-- ---------------------------------------------------- İngilizce çeviri
insert into public.question_translations (question_id, dil, soru, secenekler)
select q.id, 'en', v.en_soru, v.en_secenekler
  from (values
  ('Charlie Chaplin''in serseri karakteri Şarlo elinde hangi nesneyi taşır?', 'What does Charlie Chaplin''s Tramp character famously carry in his hand?', '["Cane","Umbrella","Bag","Lantern"]'::jsonb),
  ('Antonio Stradivari en çok hangi çalgının yapımcısı olarak ünlüdür?', 'Antonio Stradivari is most famous for making which instrument?', '["Violin","Piano","Harpsichord","Flute"]'::jsonb),
  ('Magritte''in ''İmgelerin İhaneti'' tablosunda resmedilen nesne nedir?', 'What object is depicted in Magritte''s painting ''The Treachery of Images''?', '["Pipe","Hat","Apple","Umbrella"]'::jsonb),
  ('Ringo Starr, The Beatles''ta hangi çalgıyı çalardı?', 'What instrument did Ringo Starr play in The Beatles?', '["Drums","Bass guitar","Keyboards","Rhythm guitar"]'::jsonb),
  ('Dev taş Moai heykelleriyle ünlü ada hangisidir?', 'Which island is famous for its giant stone Moai statues?', '["Easter Island","Christmas Island","Pitcairn Island","Norfolk Island"]'::jsonb),
  ('''Casablanca'' filminde ''As Time Goes By''ı çalması istenen piyanistin adı nedir?', 'In ''Casablanca'', what is the name of the pianist asked to play ''As Time Goes By''?', '["Sam","Joe","Ray","Max"]'::jsonb),
  ('''Damdaki Kemancı'' müzikalinin baş karakteri Tevye''nin mesleği nedir?', 'In ''Fiddler on the Roof'', what is Tevye''s job?', '["Milkman","Tailor","Baker","Butcher"]'::jsonb),
  ('Kankan müziğiyle ünlü ''Cehennemde Orfeus'' operetinin bestecisi kimdir?', 'Who composed the operetta ''Orpheus in the Underworld'', famous for its can-can?', '["Offenbach","Saint-Saens","Massenet","Gounod"]'::jsonb),
  ('Kral Lear''ın kendisini gerçekten seven ama mirastan dışladığı kızı kimdir?', 'Which of King Lear''s daughters truly loves him but is disinherited?', '["Cordelia","Goneril","Regan","Miranda"]'::jsonb),
  ('Motown plak şirketi hangi ABD şehrinde kurulmuştur?', 'In which US city was the Motown record label founded?', '["Detroit","Chicago","Memphis","Philadelphia"]'::jsonb),
  ('''Sweet Caroline'' şarkısının sahibi olan Amerikalı şarkıcı kimdir?', 'Which singer recorded the singalong classic ''Sweet Caroline''?', '["Neil Diamond","Barry Manilow","Billy Joel","Tom Jones"]'::jsonb),
  ('Jim Morrison hangi rock grubunun solistiydi?', 'Jim Morrison was the lead singer of which rock band?', '["The Doors","The Byrds","The Who","The Kinks"]'::jsonb),
  ('''Stronger'' ve ''Gold Digger'' şarkılarıyla tanınan rapçi kimdir?', 'Which rapper is known for the songs ''Stronger'' and ''Gold Digger''?', '["Kanye West","Jay-Z","Kendrick Lamar","Travis Scott"]'::jsonb),
  ('Baz Luhrmann''ın ''Elvis'' (2022) filminde Elvis Presley''yi canlandıran oyuncu kimdir?', 'Who played the title role in Baz Luhrmann''s 2022 film ''Elvis''?', '["Austin Butler","Ansel Elgort","Miles Teller","Timothee Chalamet"]'::jsonb),
  ('''School of Rock'' filminde öğrencilerden rock grubu kuran sahte öğretmeni kim oynar?', 'Who plays the fake teacher who turns his students into a rock band in ''School of Rock''?', '["Jack Black","Will Ferrell","Adam Sandler","Ben Stiller"]'::jsonb),
  ('''The Greatest Showman'' müzikal filminde P. T. Barnum''u canlandıran oyuncu kimdir?', 'Who plays P. T. Barnum in the musical film ''The Greatest Showman''?', '["Hugh Jackman","Russell Crowe","Ryan Gosling","Ewan McGregor"]'::jsonb),
  ('Jamie Foxx hangi müzisyeni canlandırarak En İyi Erkek Oyuncu Oscar''ını kazandı?', 'Jamie Foxx won the Best Actor Oscar for playing which musician?', '["Ray Charles","Stevie Wonder","Nat King Cole","Sam Cooke"]'::jsonb),
  ('''Sister Act'' filminde rahibe kılığında saklanan bar şarkıcısını kim oynar?', 'In ''Sister Act'', who plays the lounge singer hiding out as a nun?', '["Whoopi Goldberg","Queen Latifah","Halle Berry","Angela Bassett"]'::jsonb),
  ('''Chandelier'' şarkısını seslendiren, sahnede yüzünü perukla gizleyen şarkıcı kimdir?', 'Which singer, famous for hiding her face behind a wig, recorded ''Chandelier''?', '["Sia","Lorde","Kesha","Halsey"]'::jsonb),
  ('Nirvana ve Pearl Jam''in çıktığı grunge akımı hangi ABD şehriyle özdeşleşir?', 'The grunge scene that produced Nirvana and Pearl Jam is linked to which US city?', '["Seattle","Portland","Chicago","San Diego"]'::jsonb),
  ('''Anarchy in the U.K.'' ve ''God Save the Queen'' şarkılarıyla tanınan punk grubu hangisidir?', 'Which punk band recorded ''Anarchy in the U.K.'' and ''God Save the Queen''?', '["Sex Pistols","The Clash","Ramones","The Damned"]'::jsonb),
  ('''Purple Haze'' ve ''Hey Joe'' ile özdeşleşen efsanevi gitarist kimdir?', 'Which legendary guitarist is famous for ''Purple Haze'' and ''Hey Joe''?', '["Jimi Hendrix","Eric Clapton","Jimmy Page","Chuck Berry"]'::jsonb),
  ('''Operadaki Hayalet'' müzikalinde hayaletin tutulduğu genç soprano kimdir?', 'In ''The Phantom of the Opera'', which young soprano is the Phantom obsessed with?', '["Christine","Cosette","Juliette","Marguerite"]'::jsonb),
  ('Queen grubunun davulcusu kimdir?', 'Who was the drummer of Queen?', '["Roger Taylor","Ian Paice","Charlie Watts","Phil Collins"]'::jsonb),
  ('''West Side Story'' müzikalinin müziğini besteleyen kimdir?', 'Who wrote the music for ''West Side Story''?', '["Leonard Bernstein","George Gershwin","Cole Porter","Irving Berlin"]'::jsonb),
  ('Ünlü ''Guillaume Tell'' (William Tell) uvertürünün bestecisi kimdir?', 'Who composed the famous ''William Tell'' Overture?', '["Gioachino Rossini","Gaetano Donizetti","Vincenzo Bellini","Giuseppe Verdi"]'::jsonb),
  ('''Moldau'' (Vltava) adlı senfonik şiirin bestecisi kimdir?', 'Who composed the symphonic poem ''The Moldau'' (Vltava)?', '["Bedrich Smetana","Leos Janacek","Antonin Dvorak","Bohuslav Martinu"]'::jsonb),
  ('Efsanevi Woodstock festivali hangi ABD eyaletinde yapılmıştır?', 'The original Woodstock festival took place in which US state?', '["New York","California","New Jersey","Pennsylvania"]'::jsonb),
  ('PlayStation''da bir oyunun tüm kupaları toplanınca hangi kupa kazanılır?', 'On PlayStation, which trophy do you earn for collecting all of a game''s trophies?', '["Platinum","Gold","Diamond","Crystal"]'::jsonb),
  ('Windows''ta seçili metni kesip panoya almak için kullanılan klavye kısayolu hangisidir?', 'In Windows, which keyboard shortcut cuts the selected text to the clipboard?', '["Ctrl+X","Ctrl+C","Ctrl+K","Ctrl+B"]'::jsonb),
  ('Minecraft''ta yay ve okla saldıran düşman yaratık hangisidir?', 'In Minecraft, which hostile mob attacks with a bow and arrows?', '["Skeleton","Zombie","Spider","Enderman"]'::jsonb),
  ('Telegram mesajlaşma uygulamasının logosunda hangi figür yer alır?', 'What figure appears in the Telegram app''s logo?', '["A paper plane","An envelope","A speech bubble","A pigeon"]'::jsonb),
  ('Danny Boyle''un 2015 yapımı ''Steve Jobs'' filminde Jobs''u kim canlandırmıştır?', 'Who played the title role in Danny Boyle''s 2015 film ''Steve Jobs''?', '["Michael Fassbender","Ashton Kutcher","Jesse Eisenberg","Andrew Garfield"]'::jsonb),
  ('''Angry Birds'' mobil oyununu geliştiren Fin şirketi hangisidir?', 'Which Finnish company developed the mobile game Angry Birds?', '["Rovio","Supercell","King","Zynga"]'::jsonb),
  ('''GTA V'' oyununda Michael ve Franklin''in yanındaki üçüncü oynanabilir karakter kimdir?', 'In GTA V, who is the third playable character alongside Michael and Franklin?', '["Trevor","Niko","Tommy","Claude"]'::jsonb),
  ('Motorola''nın 2004''te çıkardığı ince kapaklı ünlü telefon modeli hangisidir?', 'What was Motorola''s famously slim flip phone launched in 2004?', '["Razr","3310","Communicator","Sidekick"]'::jsonb),
  ('Sonic serisindeki kırmızı ekidna karakterin adı nedir?', 'What is the name of the red echidna in the Sonic the Hedgehog series?', '["Knuckles","Shadow","Silver","Espio"]'::jsonb),
  ('Minecraft''ta gözüne bakınca saldıran, blok taşıyabilen uzun siyah yaratık hangisidir?', 'In Minecraft, which tall black mob carries blocks and attacks if you look it in the eye?', '["Enderman","Creeper","Blaze","Ghast"]'::jsonb),
  ('Google''ı Larry Page ile birlikte kuran kişi kimdir?', 'Who co-founded Google with Larry Page?', '["Sergey Brin","Eric Schmidt","Sundar Pichai","Reed Hastings"]'::jsonb),
  ('''Cyberpunk 2077'' oyunu hangi kurgusal şehirde geçer?', 'In which fictional city is Cyberpunk 2077 set?', '["Night City","Liberty City","Midgar","Columbia"]'::jsonb),
  ('Roblox oyun platformunda kullanılan sanal paranın adı nedir?', 'What is the name of the virtual currency used on Roblox?', '["Robux","V-Bucks","Simoleons","Minecoins"]'::jsonb),
  ('Pokémon animesinin kahramanı Ash''in soyadı nedir?', 'What is the surname of Ash, the hero of the Pokemon anime?', '["Ketchum","Oak","Birch","Rowan"]'::jsonb),
  ('Apple''ın genel merkezi Kaliforniya''nın hangi şehrinde bulunur?', 'In which California city is Apple headquartered?', '["Cupertino","Mountain View","Menlo Park","Palo Alto"]'::jsonb),
  ('Apple''ın 1998''de çıkardığı renkli, yarı saydam kasalı bilgisayarı hangisidir?', 'Which Apple computer launched in 1998 with a colorful, translucent case?', '["iMac","Lisa","Apple III","PowerBook"]'::jsonb),
  ('''Pokémon Go'' mobil oyununu geliştiren şirket hangisidir?', 'Which company developed the mobile game Pokemon Go?', '["Niantic","Zynga","Rovio","Supercell"]'::jsonb),
  ('Hem ''Crash Bandicoot'' hem ''The Last of Us'' oyunlarını geliştiren stüdyo hangisidir?', 'Which studio developed both Crash Bandicoot and The Last of Us?', '["Naughty Dog","Insomniac Games","Sucker Punch","Santa Monica Studio"]'::jsonb),
  ('Super Mario oyunlarında Prenses Peach''i kaçıran kaplumbağa benzeri kötü karakter kimdir?', 'In the Super Mario games, which turtle-like villain keeps kidnapping Princess Peach?', '["Bowser","Wario","Ganondorf","King K. Rool"]'::jsonb),
  ('Sony''nin 2004''te piyasaya sürdüğü ilk el konsolu hangisidir?', 'What was Sony''s first handheld game console, released in 2004?', '["PSP","PS Vita","Game Gear","Nintendo DS"]'::jsonb),
  ('''Sosyal Ağ'' (2010) filminde Mark Zuckerberg''i hangi oyuncu canlandırmıştır?', 'Who played Mark Zuckerberg in the 2010 film The Social Network?', '["Jesse Eisenberg","Andrew Garfield","Michael Cera","Jonah Hill"]'::jsonb),
  ('Amazon''un Alexa asistanıyla çalışan akıllı hoparlör serisinin adı nedir?', 'What is Amazon''s line of Alexa-powered smart speakers called?', '["Echo","HomePod","Nest","Sonos"]'::jsonb),
  ('Mac klavyelerinde kopyala-yapıştır kısayollarında Ctrl yerine kullanılan tuş hangisidir?', 'On a Mac keyboard, which key replaces Ctrl in copy and paste shortcuts?', '["Command","Option","Control","Shift"]'::jsonb),
  ('Nvidia''yı 1993''te kuranlardan biri olup CEO''luğunu üstlenen kişi kimdir?', 'Which Nvidia co-founder from 1993 took the helm as the company''s CEO?', '["Jensen Huang","Lisa Su","Pat Gelsinger","Satya Nadella"]'::jsonb),
  ('Atari''nin 1972''de çıkardığı, masa tenisini taklit eden ünlü oyun hangisidir?', 'What was Atari''s famous 1972 game that simulated table tennis?', '["Pong","Breakout","Asteroids","Centipede"]'::jsonb),
  ('Elon Musk''ın kurduğu beyin-bilgisayar arayüzü şirketi hangisidir?', 'Which brain-computer interface company was co-founded by Elon Musk?', '["Neuralink","DeepMind","Synchron","Kernel"]'::jsonb),
  ('''Plants vs. Zombies'' oyununu geliştiren şirket hangisidir?', 'Which company developed the game ''Plants vs. Zombies''?', '["PopCap","Rovio","Supercell","Zynga"]'::jsonb),
  ('Çin''in popüler mesajlaşma uygulaması WeChat''i geliştiren şirket hangisidir?', 'Which company developed the popular Chinese messaging app WeChat?', '["Tencent","Alibaba","Baidu","Huawei"]'::jsonb),
  ('Go şampiyonu Lee Sedol''u yenen AlphaGo''yu hangi şirket geliştirmiştir?', 'Which company developed AlphaGo, the program that beat Go champion Lee Sedol?', '["DeepMind","OpenAI","Anthropic","Nvidia"]'::jsonb),
  ('PlayStation kumandasındaki dört simgeden hangisi yeşil renktedir?', 'Which of the four PlayStation controller symbols is colored green?', '["Triangle","Square","Circle","Cross"]'::jsonb),
  ('Windows 95''in tanıtım kampanyasında kullanılan Rolling Stones şarkısı hangisidir?', 'Which Rolling Stones song was used in the launch campaign for Windows 95?', '["Start Me Up","Satisfaction","Paint It Black","Angie"]'::jsonb),
  ('Sega Mega Drive konsolu Kuzey Amerika''da hangi adla satılmıştır?', 'Under what name was the Sega Mega Drive sold in North America?', '["Genesis","Saturn","Master System","Dreamcast"]'::jsonb),
  ('Microsoft''un genel merkezi hangi ABD şehrinde bulunur?', 'In which US city is Microsoft headquartered?', '["Redmond","Cupertino","Mountain View","Palo Alto"]'::jsonb),
  ('StarCraft''ta Terran ve Protoss''un yanındaki üçüncü oynanabilir ırk hangisidir?', 'In StarCraft, which race joins the Terrans and Protoss as the third playable faction?', '["Zerg","Covenant","Chimera","Locust"]'::jsonb),
  ('''The Legend of Zelda'' serisinde Link''in sadık atının adı nedir?', 'In The Legend of Zelda series, what is the name of Link''s trusty horse?', '["Epona","Agro","Roach","Shadowfax"]'::jsonb),
  ('Rushmore Dağı''na yüzü oyulan ABD başkanlarından biri OLMAYAN hangisidir?', 'Which of these US presidents is NOT carved into Mount Rushmore?', '["John Adams","George Washington","Thomas Jefferson","Abraham Lincoln"]'::jsonb),
  ('Mao önderliğindeki Çinli komünistlerin binlerce kilometrelik büyük geri çekilmesi hangi adla bilinir?', 'What is the name given to the huge retreat of Chinese Communists led by Mao in the 1930s?', '["The Long March","The Great Leap","The Cultural Revolution","The Hundred Flowers"]'::jsonb),
  ('Anne Frank ve ailesi Nazilerden hangi şehirdeki gizli bir bölmede saklandı?', 'In which city did Anne Frank and her family hide from the Nazis in a secret annex?', '["Amsterdam","Rotterdam","Frankfurt","Brussels"]'::jsonb),
  ('Ünlü gezgin Marco Polo hangi İtalyan şehir devletindendi?', 'The famous traveler Marco Polo came from which Italian city-state?', '["Venice","Genoa","Florence","Pisa"]'::jsonb),
  ('Vatikan''daki ünlü ''Atina Okulu'' freskinin ressamı kimdir?', 'Which artist painted the famous Vatican fresco The School of Athens?', '["Raphael","Michelangelo","Leonardo","Titian"]'::jsonb),
  ('Picasso ile Braque''ın birlikte geliştirdiği sanat akımı hangisidir?', 'Which art movement did Picasso and Georges Braque develop together?', '["Cubism","Fauvism","Dadaism","Surrealism"]'::jsonb),
  ('''Buz Devri'' filmlerinde sürekli palamudunun peşinden koşan sincap benzeri yaratığın adı nedir?', 'In the Ice Age films, what is the name of the squirrel-like creature forever chasing his acorn?', '["Scrat","Sid","Manny","Diego"]'::jsonb),
  ('''Simpsonlar'' ailesi hangi kasabada yaşar?', 'In which town do the Simpsons live?', '["Springfield","Shelbyville","Quahog","Riverdale"]'::jsonb),
  ('Pipo resminin altına ''Bu bir pipo değildir'' yazan ünlü tablonun ressamı kimdir?', 'Which painter created the famous picture of a pipe captioned ''This is not a pipe''?', '["Rene Magritte","Salvador Dali","Max Ernst","Joan Miro"]'::jsonb),
  ('Starbucks adını hangi romandaki bir karakterden almıştır?', 'Starbucks takes its name from a character in which novel?', '["Moby-Dick","Treasure Island","Robinson Crusoe","The Old Man and the Sea"]'::jsonb),
  ('Teniste sıfır puan İngilizcede hangi sözcükle söylenir?', 'In tennis scoring, what word is used to call a score of zero?', '["Love","Nil","Duck","Blank"]'::jsonb),
  ('''Mutlu Prens'' masalının yazarı kimdir?', 'Who wrote the fairy tale ''The Happy Prince''?', '["Oscar Wilde","Charles Dickens","Lewis Carroll","Rudyard Kipling"]'::jsonb),
  ('Ferrari''nin fabrikası ve merkezi hangi İtalyan kasabasındadır?', 'In which Italian town are Ferrari''s headquarters and factory?', '["Maranello","Imola","Monza","Sant''Agata"]'::jsonb),
  ('''Casablanca'' filminde bar sahibi Rick''i canlandıran oyuncu kimdir?', 'Who played the bar owner Rick in the film ''Casablanca''?', '["Humphrey Bogart","Cary Grant","Clark Gable","James Stewart"]'::jsonb),
  ('''Game of Thrones''ta Daenerys''in üç ejderhasından en büyüğünün adı nedir?', 'In Game of Thrones, what is the name of the largest of Daenerys''s three dragons?', '["Drogon","Rhaegal","Viserion","Balerion"]'::jsonb),
  ('Tac Mahal''i eşi için yaptıran Babür hükümdarı kimdir?', 'Which Mughal emperor built the Taj Mahal in memory of his wife?', '["Shah Jahan","Akbar the Great","Babur","Jahangir"]'::jsonb),
  ('''Breaking Bad''de Walter White''ın ortağı Jesse''nin soyadı nedir?', 'In ''Breaking Bad'', what is the surname of Walter White''s partner Jesse?', '["Pinkman","Fring","Salamanca","Ehrmantraut"]'::jsonb),
  ('George Orwell''ın ''1984'' romanının baş karakterinin adı nedir?', 'What is the first name of the protagonist of George Orwell''s 1984?', '["Winston","Bernard","Julian","Holden"]'::jsonb),
  ('Rick Riordan''ın kahramanı Percy Jackson hangi Yunan tanrısının oğludur?', 'In Rick Riordan''s books, Percy Jackson is the son of which Greek god?', '["Poseidon","Zeus","Hades","Apollo"]'::jsonb),
  ('Robin Hood''un baş düşmanı olan şerif hangi kentin şerifidir?', 'Robin Hood''s arch-enemy is the Sheriff of which town?', '["Nottingham","Canterbury","Leicester","Lincoln"]'::jsonb),
  ('''Tom Sawyer''ın Maceraları''nda Tom''un gönlünü kaptırdığı kızın adı nedir?', 'In ''The Adventures of Tom Sawyer'', what is the name of the girl Tom falls for?', '["Becky","Polly","Mary","Sally"]'::jsonb),
  ('Shakespeare''in ''Romeo ve Juliet'' oyununda Romeo hangi ailedendir?', 'In Shakespeare''s ''Romeo and Juliet'', which family does Romeo belong to?', '["Montague","Capulet","Sforza","Borgia"]'::jsonb),
  ('Ali Baba masalında hazine mağarasını açan sihirli sözde hangi bitkinin adı geçer?', 'In the tale of Ali Baba, which plant is named in the magic words that open the treasure cave?', '["Sesame","Wheat","Barley","Lentil"]'::jsonb),
  ('''Winnie the Pooh'' kitaplarının yazarı kimdir?', 'Who wrote the ''Winnie-the-Pooh'' books?', '["A.A. Milne","Kenneth Grahame","Lewis Carroll","J.M. Barrie"]'::jsonb),
  ('Shakespeare''in ''Othello'' oyununda Othello''nun kıskançlıkla öldürdüğü eşi kimdir?', 'In Shakespeare''s ''Othello'', which wife does Othello kill out of jealousy?', '["Desdemona","Ophelia","Cordelia","Rosalind"]'::jsonb),
  ('''Açlık Oyunları''nda Katniss''le birlikte arenaya giren 12. Mıntıka''nın erkek haracı kimdir?', 'In ''The Hunger Games'', who is the male tribute from District 12 alongside Katniss?', '["Peeta","Gale","Finnick","Haymitch"]'::jsonb),
  ('''Yüzüklerin Efendisi''nde Frodo''nun bahçıvanı olan sadık yol arkadaşı kimdir?', 'In ''The Lord of the Rings'', which loyal companion of Frodo was his gardener?', '["Sam","Merry","Pippin","Legolas"]'::jsonb),
  ('Harry Potter''ın teyzesi ve eniştesiyle yaşadığı evin bulunduğu sokağın adı nedir?', 'On which street does Harry Potter live with his aunt and uncle?', '["Privet Drive","Grimmauld Place","Spinner''s End","Diagon Alley"]'::jsonb),
  ('''Pippi Uzunçorap'' karakterini yaratan yazar kimdir?', 'Which author created Pippi Longstocking?', '["Astrid Lindgren","Selma Lagerlof","Tove Jansson","Enid Blyton"]'::jsonb),
  ('Tolstoy''un romanının sonunda Anna Karenina kendini neyin altına atar?', 'At the end of Tolstoy''s novel, Anna Karenina throws herself under what?', '["A train","A tram","A carriage","A sleigh"]'::jsonb),
  ('''Tom Amca''nın Kulübesi'' romanının yazarı kimdir?', 'Who wrote ''Uncle Tom''s Cabin''?', '["Harriet Beecher Stowe","Louisa May Alcott","Frances Hodgson Burnett","Elizabeth Gaskell"]'::jsonb),
  ('Kral Arthur efsanelerinde Arthur''un eşi olan kraliçenin adı nedir?', 'In the Arthurian legends, what is the name of King Arthur''s queen?', '["Guinevere","Gwendolyn","Isolde","Morgana"]'::jsonb),
  ('''Frankenstein'' romanında Victor Frankenstein yaratığını hangi üniversite kentinde yaratır?', 'In ''Frankenstein'', in which university town does Victor bring his creature to life?', '["Ingolstadt","Heidelberg","Jena","Leipzig"]'::jsonb),
  ('H.G. Wells''in ''Görünmez Adam'' romanındaki görünmez bilim insanının soyadı nedir?', 'In H.G. Wells''s ''The Invisible Man'', what is the invisible scientist''s surname?', '["Griffin","Moreau","Prendick","Kemp"]'::jsonb),
  ('''Bir Yaz Gecesi Rüyası''nda başı eşek başına dönüştürülen dokumacı kimdir?', 'In ''A Midsummer Night''s Dream'', which weaver ends up with a donkey''s head?', '["Bottom","Puck","Oberon","Lysander"]'::jsonb),
  ('Daphne du Maurier''nin ''Rebecca'' romanındaki de Winter malikânesinin adı nedir?', 'In Daphne du Maurier''s ''Rebecca'', what is the name of the de Winter estate?', '["Manderley","Pemberley","Thornfield","Wildfell"]'::jsonb),
  ('''Otostopçunun Galaksi Rehberi''ndeki bunalımlı robotun adı nedir?', 'In ''The Hitchhiker''s Guide to the Galaxy'', what is the name of the gloomy, depressed robot?', '["Marvin","Eddie","Zaphod","Arthur"]'::jsonb),
  ('Roald Dahl''ın ''Koca Sevimli Dev'' kitabında devle dost olan yetim kızın adı nedir?', 'In Roald Dahl''s ''The BFG'', what is the name of the orphan girl who befriends the giant?', '["Sophie","Matilda","Lucy","Wendy"]'::jsonb),
  ('''Bambi'' romanının yazarı kimdir?', 'Who wrote the original novel ''Bambi''?', '["Felix Salten","Erich Kastner","Hermann Hesse","Stefan Zweig"]'::jsonb),
  ('Roald Dahl''ın ''Matilda'' kitabındaki zalim okul müdiresinin soyadı nedir?', 'In Roald Dahl''s ''Matilda'', what is the surname of the tyrannical headmistress?', '["Trunchbull","Wormwood","Honey","Hardcastle"]'::jsonb)
  ) v(soru, en_soru, en_secenekler)
  join public.questions q on q.soru = v.soru and q.created_at >= transaction_timestamp()
on conflict (question_id, dil) do nothing;

-- ---------------------------------------------------- Çevrilmeyenler
insert into public.ceviri_atlanan (question_id, dil, neden, kod)
select q.id, 'en', v.neden, 'cevrilemez'
  from (values
  ('Türkiye''ye Eurovision Şarkı Yarışması''nda ilk birinciliği getiren şarkıcı kimdir?', 'Yerel TR sorusu (kapsam=yerel); İngilizce oyuncu için anlamsız'),
  ('''Ele Güne Karşı'' ve ''Peki Peki Anladık'' şarkılarıyla tanınan grup hangisidir?', 'Yerel TR sorusu (kapsam=yerel); İngilizce oyuncu için anlamsız'),
  ('Togg''un seri üretime giren ilk modelinin adı nedir?', 'Yerel TR sorusu (kapsam=yerel); İngilizce oyuncu için anlamsız'),
  ('Türk oyun şirketi Peak Games''i 2020''de satın alan şirket hangisidir?', 'Yerel TR sorusu (kapsam=yerel); İngilizce oyuncu için anlamsız'),
  ('Ekşi Sözlük''ü 1999''da kuran kişi kimdir?', 'Yerel TR sorusu (kapsam=yerel); İngilizce oyuncu için anlamsız')
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
