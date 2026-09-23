-- ============================================================
-- 313 — Paket 3 soru üretimi, parti 10: 100 soru · 2026-09-23
--
-- Kategori: bilim 22 · edebiyat 22 · genel_kultur 9 · tarih 19 · teknoloji 28
-- Yerel (kapsam='yerel', ulke='TR'): 0 · zorluk 1–5: 3/12/27/38/20
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
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti 10 --no 313
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
('Kuru fotokopi (kserografi) yöntemini 1938''de icat eden mucit kimdir?', '["Chester Carlson","George Eastman","Lewis Waterman","Herman Hollerith"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('''Metal Gear'' oyun serisinin yaratıcısı kimdir?', '["Hideo Kojima","Shinji Mikami","Hironobu Sakaguchi","Keiji Inafune"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('''Resident Evil'' serisini geliştiren Japon şirketi hangisidir?', '["Capcom","Konami","Sega","Namco"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('''Counter-Strike'' ilk olarak hangi oyunun modu (eklentisi) olarak ortaya çıkmıştır?', '["Half-Life","Quake III","Unreal Tournament","Doom"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Sony''nin 1999''da piyasaya sürdüğü robot köpeğin adı nedir?', '["AIBO","QRIO","Pepper","Nao"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('''Dota'' ilk olarak hangi strateji oyunu için hazırlanmış bir harita modudur?', '["Warcraft III","StarCraft","Age of Empires II","Command & Conquer"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('''Assassin''s Creed'' serisinin yayıncısı olan oyun şirketi hangisidir?', '["Ubisoft","Electronic Arts","Activision","Square Enix"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Anında fotoğraf veren makineleri geliştiren Polaroid şirketinin kurucusu kimdir?', '["Edwin Land","George Eastman","Oskar Barnack","Louis Daguerre"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Akıllı telefonlarda kullanılan Snapdragon işlemcilerini tasarlayan şirket hangisidir?', '["Qualcomm","MediaTek","Nvidia","Broadcom"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('1961''de General Motors fabrikasında çalışmaya başlayan ilk endüstriyel robot hangisidir?', '["Unimate","Shakey","Elektro","ASIMO"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('1962''de MIT''te PDP-1 bilgisayarında geliştirilen, ilk dijital video oyunlarından sayılan uzay oyunu hangisidir?', '["Spacewar!","Pong","Computer Space","Asteroids"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('ARPANET''in 1969''da kurulan ilk düğümü hangi üniversitedeydi?', '["UCLA","MIT","Harvard","Carnegie Mellon"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('1926''da Londra''da hareketli görüntü ileten televizyon sistemini ilk kez gösteren İskoç mucit kimdir?', '["John Logie Baird","Philo Taylor Farnsworth","Vladimir Zworykin","Paul Nipkow"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('Atari şirketi adını hangi masa oyunundaki bir terimden almıştır?', '["Go","Şogi","Mahjong","Satranç"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('QWERTY klavye düzenini 1870''lerde daktilo için geliştiren Amerikalı mucit kimdir?', '["Christopher Sholes","Charles Thurber","Rasmus Malling-Hansen","Samuel Morse"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Çocuklara programlamayı ekrandaki bir ''kaplumbağa''yı yönlendirerek öğreten Logo dilinin tasarımcılarından olan eğitimci kimdir?', '["Seymour Papert","Alan Kay","Jean Piaget","Maria Montessori"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Tetris''te yukarıdan düşen her parça kaç kareden oluşur?', '["4","3","5","6"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Blizzard''ın ''StarCraft'' oyunu profesyonel e-spor olarak en çok hangi ülkede yaygınlaşmıştır?', '["Güney Kore","Birleşik Krallık","Çin","Japonya"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Sony''nin PlayStation''ı ilk olarak hangi şirketin konsolu için bir CD eklentisi olarak planlanmıştı?', '["Nintendo","Panasonic","Atari","Commodore"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Sony''nin 1992''de tanıttığı, kartuş içindeki küçük bir optik diske kayıt yapan ses biçimi hangisidir?', '["MiniDisc","Digital Audio Tape","Digital Compact Cassette","Betamax"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('Unix işletim sisteminin ilk sürümü 1969''da hangi bilgisayar için yazılmıştır?', '["PDP-7","PDP-11","IBM 360","VAX-11"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('Nesne yönelimli programlamanın öncüsü sayılan Simula dili 1960''larda hangi ülkede geliştirilmiştir?', '["Norveç","İsveç","Danimarka","Finlandiya"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('Cırt cırt bant, İsviçreli mühendis George de Mestral''ın hangi bitkinin tohumlarını incelemesiyle icat edilmiştir?', '["Dulavratotu","Böğürtlen","Devedikeni","Isırgan"]'::jsonb, 0, 'teknoloji', 'global', null, 4),
('İlk bilgisayar solucanı sayılan Creeper''ı ağdan silmek için yazılan programın adı nedir?', '["Reaper","Hunter","Sweeper","Cleaner"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('Mantık programlama dili Prolog 1972''de hangi ülkede geliştirilmiştir?', '["Fransa","Almanya","İtalya","Hollanda"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('DeepMind''ın AlphaFold sistemi hangi bilimsel problemde çığır açmıştır?', '["Protein katlanması","Hava tahmini","Deprem öngörüsü","Kanser taraması"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('''Japon yapıştırıcısı'' olarak bilinen siyanoakrilat yapıştırıcıyı ilk kez 1942''de keşfeden kimyager kimdir?', '["Harry Coover","Spencer Silver","Leo Baekeland","Percy Julian"]'::jsonb, 0, 'teknoloji', 'global', null, 5),
('''The Legend of Zelda'' serisinde Link''in ezeli düşmanı olan kötü karakter kimdir?', '["Ganon","Bowser","Ridley","Dr. Eggman"]'::jsonb, 0, 'teknoloji', 'global', null, 3),
('''Seçilmeyen Yol'' (The Road Not Taken) şiirinin şairi kimdir?', '["Robert Frost","Walt Whitman","Emily Dickinson","T. S. Eliot"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('Jules Verne''in ''Denizler Altında Yirmi Bin Fersah''ında Kaptan Nemo''nun denizaltısının adı nedir?', '["Nautilus","Albatros","Hispaniola","Argo"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Madde 22'' (Catch-22) romanının yazarı kimdir?', '["Joseph Heller","Kurt Vonnegut","Norman Mailer","Thomas Pynchon"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('''Yol'' ve ''İhtiyarlara Yer Yok'' romanlarının yazarı kimdir?', '["Cormac McCarthy","Don DeLillo","Philip Roth","Paul Auster"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('Harry Potter serisinde Lord Voldemort''un gerçek adı nedir?', '["Tom Riddle","Gellert Grindelwald","Salazar Slytherin","Regulus Black"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Pinokyo''nun burnu ne zaman uzar?', '["Yalan söyleyince","Hapşırınca","Çok korkunca","Karnı acıkınca"]'::jsonb, 0, 'edebiyat', 'global', null, 1),
('''Sefiller''de Jean Valjean''ın annesi öldükten sonra yanına alıp büyüttüğü kız kimdir?', '["Cosette","Éponine","Fantine","Esmeralda"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('Mark Twain takma adını kullanan yazarın gerçek adı nedir?', '["Samuel Langhorne Clemens","William Sydney Porter","Eric Arthur Blair","Charles Lutwidge Dodgson"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('''Açlık Oyunları''nda Katniss Everdeen hangi mıntıkadandır?', '["12. Mıntıka","1. Mıntıka","7. Mıntıka","13. Mıntıka"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('Bitmemiş dev romanı ''Niteliksiz Adam''ın yazarı olan Avusturyalı yazar kimdir?', '["Robert Musil","Hermann Broch","Joseph Roth","Stefan Zweig"]'::jsonb, 0, 'edebiyat', 'global', null, 5),
('1955 Nobel Edebiyat Ödülü''nü alan İzlandalı yazar kimdir?', '["Halldór Laxness","Knut Hamsun","Pär Lagerkvist","Sigrid Undset"]'::jsonb, 0, 'edebiyat', 'global', null, 5),
('1990''da Nobel Edebiyat Ödülü''nü alan, ''Yalnızlık Labirenti''nin yazarı Meksikalı şair kimdir?', '["Octavio Paz","Carlos Fuentes","Juan Rulfo","Pablo Neruda"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('H. G. Wells''in ''Dünyalar Savaşı''nda istilacı Marslıları sonunda ne yok eder?', '["Mikroplar","Toplar","Fırtınalar","Yangınlar"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('1986''da Nobel Edebiyat Ödülü''nü alarak bu ödülü kazanan ilk Sahra altı Afrikalı yazar olan Nijeryalı kimdir?', '["Wole Soyinka","Chinua Achebe","Ben Okri","Ngugi wa Thiongo"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('Jules Verne''in ''Dünyanın Merkezine Yolculuk'' romanında kahramanlar yeraltına hangi ülkedeki bir yanardağdan iner?', '["İzlanda","Norveç","İrlanda","Grönland"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('Dickens''ın kendi hayatından en çok iz taşıyan ve ''en sevdiğim çocuğum'' dediği romanı hangisidir?', '["David Copperfield","Büyük Umutlar","Oliver Twist","Martin Chuzzlewit"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('Tolkien''in yarattığı, Fince''den esinlenen Yüksek Elf dilinin adı nedir?', '["Quenya","Sindarin","Khuzdul","Klingon"]'::jsonb, 0, 'edebiyat', 'global', null, 5),
('''Yaşlı Kadının Ziyareti'' oyununun yazarı İsviçreli yazar kimdir?', '["Friedrich Dürrenmatt","Max Frisch","Ödön von Horváth","Hugo von Hofmannsthal"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('Paddington Ayı Londra''ya hangi ülkeden gelmiştir?', '["Peru","Bolivya","Şili","Kolombiya"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('Beat kuşağının manifestosu sayılan 1956 tarihli ''Uluma'' şiirinin şairi kimdir?', '["Allen Ginsberg","Jack Kerouac","Gregory Corso","Gary Snyder"]'::jsonb, 0, 'edebiyat', 'global', null, 4),
('Hawthorne''un ''Kızıl Damga'' romanında Hester Prynne''in göğsüne takmak zorunda kaldığı harf hangisidir?', '["A","B","H","S"]'::jsonb, 0, 'edebiyat', 'global', null, 3),
('''Kınar Hanımın Denizleri'' ve ''Bakışsız Bir Kedi Kara'' kitaplarının şairi kimdir?', '["Ece Ayhan","Sezai Karakoç","İlhan Berk","Ülkü Tamer"]'::jsonb, 0, 'edebiyat', 'global', null, 5),
('Laktoz intoleransı olan kişiler hangi besindeki şekeri sindirmekte zorlanır?', '["Süt","Buğday","Yumurta","Fıstık"]'::jsonb, 0, 'bilim', 'global', null, 1),
('1994''te parçalara ayrılıp Jüpiter''e çarpan kuyruklu yıldız hangisidir?', '["Shoemaker-Levy 9","Hale-Bopp","67P/Churyumov-Gerasimenko","Swift-Tuttle"]'::jsonb, 0, 'bilim', 'global', null, 4),
('2017''de Satürn''ün atmosferine dalarak görevini sona erdiren uzay sondası hangisidir?', '["Cassini","Galileo","Juno","Voyager 2"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Stetoskobu 1816''da icat eden Fransız hekim kimdir?', '["René Laennec","Louis Pasteur","Claude Bernard","Jean-Martin Charcot"]'::jsonb, 0, 'bilim', 'global', null, 4),
('Bir asteroitten örnek alıp Dünya''ya getiren ilk uzay aracı Hayabusa hangi ülkeye aittir?', '["Japonya","Hindistan","Çin","Rusya"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Güneş''ten çıkan ışığın Dünya''ya ulaşması yaklaşık ne kadar sürer?', '["8 dakika","8 saniye","1 saat","3 gün"]'::jsonb, 0, 'bilim', 'global', null, 2),
('Çocukken 1''den 100''e kadar olan sayıların toplamını bir anda bulduğu anlatılan ''matematiğin prensi'' kimdir?', '["Carl Friedrich Gauss","Leonhard Euler","Pierre de Fermat","Gottfried Wilhelm Leibniz"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Sesleri renk olarak algılamak gibi duyuların birbirine karıştığı duruma ne ad verilir?', '["Sinestezi","Hiperestezi","Parestezi","Anestezi"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Enzim gibi davranabilen RNA''ların keşfiyle 1989 Nobel Kimya Ödülü''nü Sidney Altman ile paylaşan bilim insanı kimdir?', '["Thomas Cech","Kary Mullis","Walter Gilbert","Frederick Sanger"]'::jsonb, 0, 'bilim', 'global', null, 5),
('Down sendromu hangi kromozomun fazladan bir kopyasından kaynaklanır?', '["21","13","18","23"]'::jsonb, 0, 'bilim', 'global', null, 3),
('Programlanmış hücre ölümüne ne ad verilir?', '["Apoptoz","Nekroz","Mitoz","Fagositoz"]'::jsonb, 0, 'bilim', 'global', null, 4),
('Uygarlıkları kullanabildikleri enerji miktarına göre sınıflandıran ölçek kimin adını taşır?', '["Kardaşev","Drake","Fermi","Sagan"]'::jsonb, 0, 'bilim', 'global', null, 4),
('Gökyüzünün mavi görünmesini açıklayan ışık saçılmasına ne ad verilir?', '["Rayleigh saçılması","Mie saçılması","Compton saçılması","Raman saçılması"]'::jsonb, 0, 'bilim', 'global', null, 4),
('Ahtapot ve kalamarların tehlike anında suya püskürttüğü koyu sıvıya ne ad verilir?', '["Mürekkep","Zehirli salgı","Sindirim sıvısı","Salya"]'::jsonb, 0, 'bilim', 'global', null, 1),
('Yüzleri tanıyamama durumuna verilen tıbbi ad nedir?', '["Prozopagnozi","Aleksitimi","Anozognozi","Disleksi"]'::jsonb, 0, 'bilim', 'global', null, 4),
('1848''de kafasından demir bir çubuk geçip kişiliği değişen, beyin bilimi tarihinin ünlü vakası kimdir?', '["Phineas Gage","Henry Molaison","Louis Leborgne","Kaspar Hauser"]'::jsonb, 0, 'bilim', 'global', null, 4),
('Doğada bulunan en yoğun element hangisidir?', '["Osmiyum","Platin","Altın","Uranyum"]'::jsonb, 0, 'bilim', 'global', null, 4),
('Einsteinyum ve fermiyum elementleri ilk kez neyin kalıntılarında bulunmuştur?', '["Hidrojen bombası denemesi","Süpernova patlaması gözlemi","Göktaşı düşüşü","Reaktör kazası"]'::jsonb, 0, 'bilim', 'global', null, 5),
('Samanyolu''na en yakın büyük sarmal gökada hangisidir?', '["Andromeda","Üçgen Gökadası","Girdap Gökadası","Sombrero Gökadası"]'::jsonb, 0, 'bilim', 'global', null, 2),
('Einstein''ın alan denklemlerinin ilk tam çözümünü 1916''da Birinci Dünya Savaşı cephesindeyken bulan Alman fizikçi kimdir?', '["Karl Schwarzschild","Arthur Eddington","Hermann Minkowski","David Hilbert"]'::jsonb, 0, 'bilim', 'global', null, 5),
('1846''da Boston''da eterle ilk halka açık cerrahi anestezi gösterisini yapan diş hekimi kimdir?', '["William Morton","Horace Wells","Crawford Long","Joseph Lister"]'::jsonb, 0, 'bilim', 'global', null, 5),
('Anders Celsius''un 1742''de önerdiği ilk ölçekte suyun donma noktası kaç dereceydi?', '["100","0","32","273"]'::jsonb, 0, 'bilim', 'global', null, 5),
('1876 Little Bighorn Savaşı''nda Siu ve Çeyen savaşçılarına yenilip ölen ABD''li komutan kimdir?', '["George Custer","Ulysses Grant","William Sherman","Philip Sheridan"]'::jsonb, 0, 'tarih', 'global', null, 3),
('Süveyş Kanalı''nın yapımını yöneten Fransız diplomat kimdir?', '["Ferdinand de Lesseps","Gustave Eiffel","Georges-Eugène Haussmann","Sadi Carnot"]'::jsonb, 0, 'tarih', 'global', null, 3),
('1940''ta Meksika''da buz kazmasıyla öldürülen Sovyet devrimcisi kimdir?', '["Lev Troçki","Nikolay Buharin","Grigori Zinovyev","Lev Kamenev"]'::jsonb, 0, 'tarih', 'global', null, 4),
('''Mozole'' kelimesine adını veren, Halikarnas''taki anıt mezarı yapılan Karya kralı kimdir?', '["Mausolos","Kroisos","Midas","Kandaules"]'::jsonb, 0, 'tarih', 'global', null, 4),
('Son Rus Çarı II. Nikolay''ın ailesi üzerinde büyük etki kuran ve 1916''da öldürülen mistik kimdir?', '["Grigori Rasputin","Sergey Witte","Pyotr Stolıpin","Konstantin Pobedonostsev"]'::jsonb, 0, 'tarih', 'global', null, 3),
('Powhatan kabilesinden Pocahontas''ın evlendiği İngiliz kolonist kimdir?', '["John Rolfe","John Smith","John Winthrop","William Bradford"]'::jsonb, 0, 'tarih', 'global', null, 4),
('''Bakire Kraliçe'' lakabıyla anılan İngiltere hükümdarı kimdir?', '["I. Elizabeth","I. Mary","Victoria","Aragonlu Catherine"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Eski Farsça, Elamca ve Babilce metinleriyle çivi yazısının çözülmesini sağlayan kaya yazıtı hangisidir?', '["Behistun Yazıtı","Rosetta Taşı","Orhun Yazıtları","Kültepe Tabletleri"]'::jsonb, 0, 'tarih', 'global', null, 4),
('Küba Devrimi''nin simge isimlerinden Che Guevara hangi ülkede doğmuştur?', '["Arjantin","Küba","Bolivya","Venezuela"]'::jsonb, 0, 'tarih', 'global', null, 3),
('1851 Londra Büyük Sergisi için camdan ve demirden inşa edilen dev yapı hangisidir?', '["Kristal Saray","Albert Salonu","Buckingham Sarayı","Kew Serası"]'::jsonb, 0, 'tarih', 'global', null, 3),
('Rivayete göre Jül Sezar, suikastçıları arasında gördüğü kime ''Sen de mi …?'' demiştir?', '["Brutus","Cassius","Antonius","Octavianus"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Ünlü olmak için MÖ 356''da Efes''teki Artemis Tapınağı''nı yakan kişi kimdir?', '["Herostratos","Pausanias","Empedokles","Kleomenes"]'::jsonb, 0, 'tarih', 'global', null, 4),
('Kanuni Sultan Süleyman''ın sadrazamı olup 1536''da idam ettirilen, ''Makbul'' ve ''Maktul'' lakaplarıyla anılan kişi kimdir?', '["Pargalı İbrahim Paşa","Rüstem Paşa","Kara Ahmed Paşa","Sokullu Mehmed Paşa"]'::jsonb, 0, 'tarih', 'global', null, 3),
('1833''te Osmanlı ile Rusya arasında imzalanan ve Boğazları Rusya dışındaki devletlerin savaş gemilerine kapatan antlaşma hangisidir?', '["Hünkâr İskelesi","Edirne","Balta Limanı","Londra Boğazlar"]'::jsonb, 0, 'tarih', 'global', null, 4),
('Kanuni Sultan Süleyman''ın tahta çıktıktan sonraki ilk seferinde 1521''de aldığı kale hangisidir?', '["Belgrad","Rodos","Budin","Estergon"]'::jsonb, 0, 'tarih', 'global', null, 3),
('Hint Okyanusu seferinden karadan dönerek ''Mir''atü''l-Memalik''i yazan Osmanlı amirali kimdir?', '["Seydi Ali Reis","Piri Reis","Murat Reis","Hadım Süleyman Paşa"]'::jsonb, 0, 'tarih', 'global', null, 5),
('Topkapı Sarayı''ndaki Revan Köşkü hangi padişahın doğu seferindeki zaferinin anısına yaptırılmıştır?', '["IV. Murad","Yavuz Sultan Selim","III. Murad","IV. Mehmed"]'::jsonb, 0, 'tarih', 'global', null, 4),
('Kadeş Antlaşması''nın ardından Mısır kraliçesi Nefertari ile mektuplaşan Hitit kraliçesi kimdir?', '["Puduhepa","Asmunikal","Gassulawiya","Danuhepa"]'::jsonb, 0, 'tarih', 'global', null, 5),
('MÖ 1274''teki Kadeş Savaşı''nda II. Ramses''e karşı savaşan Hitit kralı kimdir?', '["II. Muvatalli","I. Şuppiluliuma","III. Hattuşili","I. Murşili"]'::jsonb, 0, 'tarih', 'global', null, 5),
('Katılımcıların birbirine domates fırlattığı ''La Tomatina'' festivali hangi ülkede düzenlenir?', '["İspanya","İtalya","Portekiz","Meksika"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Dünyanın en büyük bira festivali Oktoberfest her yıl hangi şehirde düzenlenir?', '["Münih","Berlin","Köln","Frankfurt"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Bolonez sos adını hangi İtalyan şehrinden alır?', '["Bologna","Napoli","Milano","Torino"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Monopoly''nin atası sayılan ''The Landlord''s Game''i 1904''te tasarlayan kişi kimdir?', '["Elizabeth Magie","Charles Darrow","Milton Bradley","Alfred Butts"]'::jsonb, 0, 'genel_kultur', 'global', null, 5),
('Japon içkisi sake hangi tahıldan yapılır?', '["Pirinç","Arpa","Buğday","Darı"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Köpüklü şarap ''şampanya'' adını nereden alır?', '["Bir Fransız bölgesinden","Bir keşişin adından","Bir üzüm türünden","Bir İtalyan kentinden"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('Meksika içkisi tekila hangi bitkiden elde edilir?', '["Mavi agav","Kaktüs","Şeker kamışı","Mısır"]'::jsonb, 0, 'genel_kultur', 'global', null, 3),
('''Sabotaj'' kelimesi hangi nesnenin Fransızca adından türemiştir?', '["Tahta ayakkabı","Demir çekiç","Çelik anahtar","Ahşap tokmak"]'::jsonb, 0, 'genel_kultur', 'global', null, 4),
('Kruvasanın atası sayılan hilal biçimli ''kipferl'' hangi ülkenin mutfağından gelir?', '["Avusturya","İsviçre","Belçika","Macaristan"]'::jsonb, 0, 'genel_kultur', 'global', null, 4)
on conflict (soru) do nothing;

-- ---------------------------------------------------- İngilizce çeviri
insert into public.question_translations (question_id, dil, soru, secenekler)
select q.id, 'en', v.en_soru, v.en_secenekler
  from (values
  ('Kuru fotokopi (kserografi) yöntemini 1938''de icat eden mucit kimdir?', 'Which inventor created dry photocopying (xerography) in 1938?', '["Chester Carlson","George Eastman","Lewis Waterman","Herman Hollerith"]'::jsonb),
  ('''Metal Gear'' oyun serisinin yaratıcısı kimdir?', 'Who created the ''Metal Gear'' video game series?', '["Hideo Kojima","Shinji Mikami","Hironobu Sakaguchi","Keiji Inafune"]'::jsonb),
  ('''Resident Evil'' serisini geliştiren Japon şirketi hangisidir?', 'Which Japanese company developed the ''Resident Evil'' series?', '["Capcom","Konami","Sega","Namco"]'::jsonb),
  ('''Counter-Strike'' ilk olarak hangi oyunun modu (eklentisi) olarak ortaya çıkmıştır?', '''Counter-Strike'' began as a mod of which game?', '["Half-Life","Quake III","Unreal Tournament","Doom"]'::jsonb),
  ('Sony''nin 1999''da piyasaya sürdüğü robot köpeğin adı nedir?', 'What is the name of the robot dog Sony launched in 1999?', '["AIBO","QRIO","Pepper","Nao"]'::jsonb),
  ('''Dota'' ilk olarak hangi strateji oyunu için hazırlanmış bir harita modudur?', '''Dota'' started as a custom map mod for which strategy game?', '["Warcraft III","StarCraft","Age of Empires II","Command & Conquer"]'::jsonb),
  ('''Assassin''s Creed'' serisinin yayıncısı olan oyun şirketi hangisidir?', 'Which company publishes the ''Assassin''s Creed'' series?', '["Ubisoft","Electronic Arts","Activision","Square Enix"]'::jsonb),
  ('Anında fotoğraf veren makineleri geliştiren Polaroid şirketinin kurucusu kimdir?', 'Who founded Polaroid, the company that developed instant cameras?', '["Edwin Land","George Eastman","Oskar Barnack","Louis Daguerre"]'::jsonb),
  ('Akıllı telefonlarda kullanılan Snapdragon işlemcilerini tasarlayan şirket hangisidir?', 'Which company designs the Snapdragon processors used in smartphones?', '["Qualcomm","MediaTek","Nvidia","Broadcom"]'::jsonb),
  ('1961''de General Motors fabrikasında çalışmaya başlayan ilk endüstriyel robot hangisidir?', 'Which was the first industrial robot, put to work at a General Motors plant in 1961?', '["Unimate","Shakey","Elektro","ASIMO"]'::jsonb),
  ('1962''de MIT''te PDP-1 bilgisayarında geliştirilen, ilk dijital video oyunlarından sayılan uzay oyunu hangisidir?', 'Which space game, developed at MIT on a PDP-1 computer in 1962, is one of the first digital video games?', '["Spacewar!","Pong","Computer Space","Asteroids"]'::jsonb),
  ('ARPANET''in 1969''da kurulan ilk düğümü hangi üniversitedeydi?', 'At which university was the first ARPANET node installed in 1969?', '["UCLA","MIT","Harvard","Carnegie Mellon"]'::jsonb),
  ('1926''da Londra''da hareketli görüntü ileten televizyon sistemini ilk kez gösteren İskoç mucit kimdir?', 'Which Scottish inventor first demonstrated a television system transmitting moving images in London in 1926?', '["John Logie Baird","Philo Taylor Farnsworth","Vladimir Zworykin","Paul Nipkow"]'::jsonb),
  ('Atari şirketi adını hangi masa oyunundaki bir terimden almıştır?', 'The company Atari took its name from a term in which board game?', '["Go","Shogi","Mahjong","Chess"]'::jsonb),
  ('QWERTY klavye düzenini 1870''lerde daktilo için geliştiren Amerikalı mucit kimdir?', 'Which American inventor devised the QWERTY layout for typewriters in the 1870s?', '["Christopher Sholes","Charles Thurber","Rasmus Malling-Hansen","Samuel Morse"]'::jsonb),
  ('Çocuklara programlamayı ekrandaki bir ''kaplumbağa''yı yönlendirerek öğreten Logo dilinin tasarımcılarından olan eğitimci kimdir?', 'Which educator co-designed Logo, the language that teaches children programming by steering an on-screen ''turtle''?', '["Seymour Papert","Alan Kay","Jean Piaget","Maria Montessori"]'::jsonb),
  ('Tetris''te yukarıdan düşen her parça kaç kareden oluşur?', 'In Tetris, how many squares make up each falling piece?', '["4","3","5","6"]'::jsonb),
  ('Blizzard''ın ''StarCraft'' oyunu profesyonel e-spor olarak en çok hangi ülkede yaygınlaşmıştır?', 'In which country did Blizzard''s ''StarCraft'' become hugely popular as a professional esport?', '["South Korea","United Kingdom","China","Japan"]'::jsonb),
  ('Sony''nin PlayStation''ı ilk olarak hangi şirketin konsolu için bir CD eklentisi olarak planlanmıştı?', 'Sony''s PlayStation was originally planned as a CD add-on for which company''s console?', '["Nintendo","Panasonic","Atari","Commodore"]'::jsonb),
  ('Sony''nin 1992''de tanıttığı, kartuş içindeki küçük bir optik diske kayıt yapan ses biçimi hangisidir?', 'Which audio format, introduced by Sony in 1992, recorded onto a small optical disc inside a cartridge?', '["MiniDisc","Digital Audio Tape","Digital Compact Cassette","Betamax"]'::jsonb),
  ('Unix işletim sisteminin ilk sürümü 1969''da hangi bilgisayar için yazılmıştır?', 'The first version of the Unix operating system was written in 1969 for which computer?', '["PDP-7","PDP-11","IBM 360","VAX-11"]'::jsonb),
  ('Nesne yönelimli programlamanın öncüsü sayılan Simula dili 1960''larda hangi ülkede geliştirilmiştir?', 'Simula, regarded as the pioneer of object-oriented programming, was developed in the 1960s in which country?', '["Norway","Sweden","Denmark","Finland"]'::jsonb),
  ('Cırt cırt bant, İsviçreli mühendis George de Mestral''ın hangi bitkinin tohumlarını incelemesiyle icat edilmiştir?', 'Swiss engineer George de Mestral invented Velcro after studying the seed heads of which plant?', '["Burdock","Blackberry","Thistle","Nettle"]'::jsonb),
  ('İlk bilgisayar solucanı sayılan Creeper''ı ağdan silmek için yazılan programın adı nedir?', 'What was the name of the program written to delete Creeper, regarded as the first computer worm, from the network?', '["Reaper","Hunter","Sweeper","Cleaner"]'::jsonb),
  ('Mantık programlama dili Prolog 1972''de hangi ülkede geliştirilmiştir?', 'The logic programming language Prolog was developed in 1972 in which country?', '["France","Germany","Italy","Netherlands"]'::jsonb),
  ('DeepMind''ın AlphaFold sistemi hangi bilimsel problemde çığır açmıştır?', 'DeepMind''s AlphaFold system made a breakthrough on which scientific problem?', '["Protein folding","Weather forecasting","Earthquake prediction","Cancer screening"]'::jsonb),
  ('''Japon yapıştırıcısı'' olarak bilinen siyanoakrilat yapıştırıcıyı ilk kez 1942''de keşfeden kimyager kimdir?', 'Which chemist first discovered cyanoacrylate, the basis of ''super glue'', in 1942?', '["Harry Coover","Spencer Silver","Leo Baekeland","Percy Julian"]'::jsonb),
  ('''The Legend of Zelda'' serisinde Link''in ezeli düşmanı olan kötü karakter kimdir?', 'In ''The Legend of Zelda'' series, who is Link''s archenemy?', '["Ganon","Bowser","Ridley","Dr. Eggman"]'::jsonb),
  ('''Seçilmeyen Yol'' (The Road Not Taken) şiirinin şairi kimdir?', 'Who wrote the poem ''The Road Not Taken''?', '["Robert Frost","Walt Whitman","Emily Dickinson","T. S. Eliot"]'::jsonb),
  ('Jules Verne''in ''Denizler Altında Yirmi Bin Fersah''ında Kaptan Nemo''nun denizaltısının adı nedir?', 'In Jules Verne''s ''Twenty Thousand Leagues Under the Seas'', what is Captain Nemo''s submarine called?', '["Nautilus","Albatross","Hispaniola","Argo"]'::jsonb),
  ('''Madde 22'' (Catch-22) romanının yazarı kimdir?', 'Who wrote the novel ''Catch-22''?', '["Joseph Heller","Kurt Vonnegut","Norman Mailer","Thomas Pynchon"]'::jsonb),
  ('''Yol'' ve ''İhtiyarlara Yer Yok'' romanlarının yazarı kimdir?', 'Who wrote the novels ''The Road'' and ''No Country for Old Men''?', '["Cormac McCarthy","Don DeLillo","Philip Roth","Paul Auster"]'::jsonb),
  ('Harry Potter serisinde Lord Voldemort''un gerçek adı nedir?', 'In the Harry Potter series, what is Lord Voldemort''s real name?', '["Tom Riddle","Gellert Grindelwald","Salazar Slytherin","Regulus Black"]'::jsonb),
  ('Pinokyo''nun burnu ne zaman uzar?', 'When does Pinocchio''s nose grow?', '["When he lies","When he sneezes","When he is scared","When he is hungry"]'::jsonb),
  ('''Sefiller''de Jean Valjean''ın annesi öldükten sonra yanına alıp büyüttüğü kız kimdir?', 'In ''Les Misérables'', which girl does Jean Valjean raise after her mother''s death?', '["Cosette","Éponine","Fantine","Esmeralda"]'::jsonb),
  ('Mark Twain takma adını kullanan yazarın gerçek adı nedir?', 'What was the real name of the writer known as Mark Twain?', '["Samuel Langhorne Clemens","William Sydney Porter","Eric Arthur Blair","Charles Lutwidge Dodgson"]'::jsonb),
  ('''Açlık Oyunları''nda Katniss Everdeen hangi mıntıkadandır?', 'In ''The Hunger Games'', which district is Katniss Everdeen from?', '["District 12","District 1","District 7","District 13"]'::jsonb),
  ('Bitmemiş dev romanı ''Niteliksiz Adam''ın yazarı olan Avusturyalı yazar kimdir?', 'Which Austrian writer wrote the vast unfinished novel ''The Man Without Qualities''?', '["Robert Musil","Hermann Broch","Joseph Roth","Stefan Zweig"]'::jsonb),
  ('1955 Nobel Edebiyat Ödülü''nü alan İzlandalı yazar kimdir?', 'Which Icelandic writer won the 1955 Nobel Prize in Literature?', '["Halldór Laxness","Knut Hamsun","Pär Lagerkvist","Sigrid Undset"]'::jsonb),
  ('1990''da Nobel Edebiyat Ödülü''nü alan, ''Yalnızlık Labirenti''nin yazarı Meksikalı şair kimdir?', 'Which Mexican poet, author of ''The Labyrinth of Solitude'', won the 1990 Nobel Prize in Literature?', '["Octavio Paz","Carlos Fuentes","Juan Rulfo","Pablo Neruda"]'::jsonb),
  ('H. G. Wells''in ''Dünyalar Savaşı''nda istilacı Marslıları sonunda ne yok eder?', 'In H. G. Wells''s ''The War of the Worlds'', what finally destroys the Martian invaders?', '["Germs","Artillery","Storms","Fires"]'::jsonb),
  ('1986''da Nobel Edebiyat Ödülü''nü alarak bu ödülü kazanan ilk Sahra altı Afrikalı yazar olan Nijeryalı kimdir?', 'Which Nigerian writer, winning the 1986 Nobel Prize in Literature, became the first sub-Saharan African laureate?', '["Wole Soyinka","Chinua Achebe","Ben Okri","Ngugi wa Thiongo"]'::jsonb),
  ('Jules Verne''in ''Dünyanın Merkezine Yolculuk'' romanında kahramanlar yeraltına hangi ülkedeki bir yanardağdan iner?', 'In Jules Verne''s ''Journey to the Centre of the Earth'', the explorers descend through a volcano in which country?', '["Iceland","Norway","Ireland","Greenland"]'::jsonb),
  ('Dickens''ın kendi hayatından en çok iz taşıyan ve ''en sevdiğim çocuğum'' dediği romanı hangisidir?', 'Which Dickens novel, the most autobiographical, did he call his ''favourite child''?', '["David Copperfield","Great Expectations","Oliver Twist","Martin Chuzzlewit"]'::jsonb),
  ('Tolkien''in yarattığı, Fince''den esinlenen Yüksek Elf dilinin adı nedir?', 'What is the name of the High-Elven language created by Tolkien and inspired by Finnish?', '["Quenya","Sindarin","Khuzdul","Klingon"]'::jsonb),
  ('''Yaşlı Kadının Ziyareti'' oyununun yazarı İsviçreli yazar kimdir?', 'Which Swiss writer wrote the play ''The Visit''?', '["Friedrich Dürrenmatt","Max Frisch","Ödön von Horváth","Hugo von Hofmannsthal"]'::jsonb),
  ('Paddington Ayı Londra''ya hangi ülkeden gelmiştir?', 'Paddington Bear came to London from which country?', '["Peru","Bolivia","Chile","Colombia"]'::jsonb),
  ('Beat kuşağının manifestosu sayılan 1956 tarihli ''Uluma'' şiirinin şairi kimdir?', 'Who wrote ''Howl'' (1956), the poem seen as a manifesto of the Beat Generation?', '["Allen Ginsberg","Jack Kerouac","Gregory Corso","Gary Snyder"]'::jsonb),
  ('Hawthorne''un ''Kızıl Damga'' romanında Hester Prynne''in göğsüne takmak zorunda kaldığı harf hangisidir?', 'In Hawthorne''s ''The Scarlet Letter'', which letter is Hester Prynne forced to wear on her chest?', '["A","B","H","S"]'::jsonb),
  ('Laktoz intoleransı olan kişiler hangi besindeki şekeri sindirmekte zorlanır?', 'People with lactose intolerance have trouble digesting the sugar in which food?', '["Milk","Wheat","Eggs","Peanuts"]'::jsonb),
  ('1994''te parçalara ayrılıp Jüpiter''e çarpan kuyruklu yıldız hangisidir?', 'Which comet broke apart and crashed into Jupiter in 1994?', '["Shoemaker-Levy 9","Hale-Bopp","67P/Churyumov-Gerasimenko","Swift-Tuttle"]'::jsonb),
  ('2017''de Satürn''ün atmosferine dalarak görevini sona erdiren uzay sondası hangisidir?', 'Which space probe ended its mission in 2017 by plunging into Saturn''s atmosphere?', '["Cassini","Galileo","Juno","Voyager 2"]'::jsonb),
  ('Stetoskobu 1816''da icat eden Fransız hekim kimdir?', 'Which French physician invented the stethoscope in 1816?', '["René Laennec","Louis Pasteur","Claude Bernard","Jean-Martin Charcot"]'::jsonb),
  ('Bir asteroitten örnek alıp Dünya''ya getiren ilk uzay aracı Hayabusa hangi ülkeye aittir?', 'Hayabusa, the first spacecraft to bring back a sample from an asteroid, belonged to which country?', '["Japan","India","China","Russia"]'::jsonb),
  ('Güneş''ten çıkan ışığın Dünya''ya ulaşması yaklaşık ne kadar sürer?', 'Roughly how long does light from the Sun take to reach Earth?', '["8 minutes","8 seconds","1 hour","3 days"]'::jsonb),
  ('Çocukken 1''den 100''e kadar olan sayıların toplamını bir anda bulduğu anlatılan ''matematiğin prensi'' kimdir?', 'Which ''prince of mathematics'' is said to have instantly summed the numbers from 1 to 100 as a child?', '["Carl Friedrich Gauss","Leonhard Euler","Pierre de Fermat","Gottfried Wilhelm Leibniz"]'::jsonb),
  ('Sesleri renk olarak algılamak gibi duyuların birbirine karıştığı duruma ne ad verilir?', 'What is the condition in which the senses blend, such as perceiving sounds as colours, called?', '["Synaesthesia","Hyperaesthesia","Paraesthesia","Anaesthesia"]'::jsonb),
  ('Enzim gibi davranabilen RNA''ların keşfiyle 1989 Nobel Kimya Ödülü''nü Sidney Altman ile paylaşan bilim insanı kimdir?', 'Which scientist shared the 1989 Nobel Prize in Chemistry with Sidney Altman for discovering that RNA can act as an enzyme?', '["Thomas Cech","Kary Mullis","Walter Gilbert","Frederick Sanger"]'::jsonb),
  ('Down sendromu hangi kromozomun fazladan bir kopyasından kaynaklanır?', 'Down syndrome is caused by an extra copy of which chromosome?', '["21","13","18","23"]'::jsonb),
  ('Programlanmış hücre ölümüne ne ad verilir?', 'What is programmed cell death called?', '["Apoptosis","Necrosis","Mitosis","Phagocytosis"]'::jsonb),
  ('Uygarlıkları kullanabildikleri enerji miktarına göre sınıflandıran ölçek kimin adını taşır?', 'The scale that classifies civilisations by the amount of energy they can use is named after whom?', '["Kardashev","Drake","Fermi","Sagan"]'::jsonb),
  ('Gökyüzünün mavi görünmesini açıklayan ışık saçılmasına ne ad verilir?', 'What is the light scattering that explains why the sky looks blue called?', '["Rayleigh scattering","Mie scattering","Compton scattering","Raman scattering"]'::jsonb),
  ('Ahtapot ve kalamarların tehlike anında suya püskürttüğü koyu sıvıya ne ad verilir?', 'What is the dark liquid octopuses and squid squirt into the water when in danger?', '["Ink","Venom","Digestive fluid","Saliva"]'::jsonb),
  ('Yüzleri tanıyamama durumuna verilen tıbbi ad nedir?', 'What is the medical name for the inability to recognise faces?', '["Prosopagnosia","Alexithymia","Anosognosia","Dyslexia"]'::jsonb),
  ('1848''de kafasından demir bir çubuk geçip kişiliği değişen, beyin bilimi tarihinin ünlü vakası kimdir?', 'Who is the famous case in brain science whose personality changed after an iron rod passed through his head in 1848?', '["Phineas Gage","Henry Molaison","Louis Leborgne","Kaspar Hauser"]'::jsonb),
  ('Doğada bulunan en yoğun element hangisidir?', 'Which naturally occurring element is the densest?', '["Osmium","Platinum","Gold","Uranium"]'::jsonb),
  ('Einsteinyum ve fermiyum elementleri ilk kez neyin kalıntılarında bulunmuştur?', 'Einsteinium and fermium were first found in the debris of what?', '["A hydrogen bomb test","A distant supernova explosion","A meteorite fall","A reactor accident"]'::jsonb),
  ('Samanyolu''na en yakın büyük sarmal gökada hangisidir?', 'Which is the nearest large spiral galaxy to the Milky Way?', '["Andromeda","Triangulum Galaxy","Whirlpool Galaxy","Sombrero Galaxy"]'::jsonb),
  ('Einstein''ın alan denklemlerinin ilk tam çözümünü 1916''da Birinci Dünya Savaşı cephesindeyken bulan Alman fizikçi kimdir?', 'Which German physicist found the first exact solution of Einstein''s field equations in 1916 while serving on the First World War front?', '["Karl Schwarzschild","Arthur Eddington","Hermann Minkowski","David Hilbert"]'::jsonb),
  ('1846''da Boston''da eterle ilk halka açık cerrahi anestezi gösterisini yapan diş hekimi kimdir?', 'Which dentist gave the first public demonstration of surgical anaesthesia with ether in Boston in 1846?', '["William Morton","Horace Wells","Crawford Long","Joseph Lister"]'::jsonb),
  ('Anders Celsius''un 1742''de önerdiği ilk ölçekte suyun donma noktası kaç dereceydi?', 'On the original scale Anders Celsius proposed in 1742, what was the freezing point of water?', '["100","0","32","273"]'::jsonb),
  ('1876 Little Bighorn Savaşı''nda Siu ve Çeyen savaşçılarına yenilip ölen ABD''li komutan kimdir?', 'Which US commander was defeated and killed by Sioux and Cheyenne warriors at the Battle of the Little Bighorn in 1876?', '["George Custer","Ulysses Grant","William Sherman","Philip Sheridan"]'::jsonb),
  ('Süveyş Kanalı''nın yapımını yöneten Fransız diplomat kimdir?', 'Which French diplomat led the construction of the Suez Canal?', '["Ferdinand de Lesseps","Gustave Eiffel","Georges-Eugène Haussmann","Sadi Carnot"]'::jsonb),
  ('1940''ta Meksika''da buz kazmasıyla öldürülen Sovyet devrimcisi kimdir?', 'Which Soviet revolutionary was killed with an ice axe in Mexico in 1940?', '["Leon Trotsky","Nikolai Bukharin","Grigory Zinoviev","Lev Kamenev"]'::jsonb),
  ('''Mozole'' kelimesine adını veren, Halikarnas''taki anıt mezarı yapılan Karya kralı kimdir?', 'Which Carian king, whose monumental tomb at Halicarnassus gave us the word ''mausoleum'', was it?', '["Mausolus","Croesus","Midas","Candaules"]'::jsonb),
  ('Son Rus Çarı II. Nikolay''ın ailesi üzerinde büyük etki kuran ve 1916''da öldürülen mistik kimdir?', 'Which mystic, who gained great influence over the family of the last Tsar Nicholas II, was murdered in 1916?', '["Grigori Rasputin","Sergei Witte","Pyotr Stolypin","Konstantin Pobedonostsev"]'::jsonb),
  ('Powhatan kabilesinden Pocahontas''ın evlendiği İngiliz kolonist kimdir?', 'Which English colonist did Pocahontas of the Powhatan people marry?', '["John Rolfe","John Smith","John Winthrop","William Bradford"]'::jsonb),
  ('''Bakire Kraliçe'' lakabıyla anılan İngiltere hükümdarı kimdir?', 'Which English monarch was known as ''the Virgin Queen''?', '["Elizabeth I","Mary I","Victoria","Catherine of Aragon"]'::jsonb),
  ('Eski Farsça, Elamca ve Babilce metinleriyle çivi yazısının çözülmesini sağlayan kaya yazıtı hangisidir?', 'Which rock inscription, with texts in Old Persian, Elamite and Babylonian, made it possible to decipher cuneiform?', '["Behistun Inscription","Rosetta Stone","Orkhon Inscriptions","Kültepe Tablets"]'::jsonb),
  ('Küba Devrimi''nin simge isimlerinden Che Guevara hangi ülkede doğmuştur?', 'In which country was Che Guevara, an icon of the Cuban Revolution, born?', '["Argentina","Cuba","Bolivia","Venezuela"]'::jsonb),
  ('1851 Londra Büyük Sergisi için camdan ve demirden inşa edilen dev yapı hangisidir?', 'Which huge glass and iron building was erected for the Great Exhibition in London in 1851?', '["The Crystal Palace","The Albert Hall","Buckingham Palace","The Kew Palm House"]'::jsonb),
  ('Rivayete göre Jül Sezar, suikastçıları arasında gördüğü kime ''Sen de mi …?'' demiştir?', 'According to tradition, which of his assassins did Julius Caesar address with ''You too…?''', '["Brutus","Cassius","Antony","Octavian"]'::jsonb),
  ('Ünlü olmak için MÖ 356''da Efes''teki Artemis Tapınağı''nı yakan kişi kimdir?', 'Who burned down the Temple of Artemis at Ephesus in 356 BC in order to become famous?', '["Herostratus","Pausanias","Empedocles","Cleomenes"]'::jsonb),
  ('Kanuni Sultan Süleyman''ın sadrazamı olup 1536''da idam ettirilen, ''Makbul'' ve ''Maktul'' lakaplarıyla anılan kişi kimdir?', 'Which grand vizier of Suleiman the Magnificent, executed in 1536, is remembered as both ''the Favourite'' and ''the Executed''?', '["Pargalı Ibrahim Pasha","Rüstem Pasha","Kara Ahmed Pasha","Sokollu Mehmed Pasha"]'::jsonb),
  ('1833''te Osmanlı ile Rusya arasında imzalanan ve Boğazları Rusya dışındaki devletlerin savaş gemilerine kapatan antlaşma hangisidir?', 'Which 1833 treaty between the Ottoman Empire and Russia closed the Straits to the warships of all states except Russia?', '["Treaty of Hünkâr İskelesi","Treaty of Adrianople","Treaty of Balta Liman","London Straits Convention"]'::jsonb),
  ('Kanuni Sultan Süleyman''ın tahta çıktıktan sonraki ilk seferinde 1521''de aldığı kale hangisidir?', 'Which fortress did Suleiman the Magnificent capture in 1521, on his first campaign as sultan?', '["Belgrade","Rhodes","Buda","Esztergom"]'::jsonb),
  ('Topkapı Sarayı''ndaki Revan Köşkü hangi padişahın doğu seferindeki zaferinin anısına yaptırılmıştır?', 'The Revan (Yerevan) Pavilion in Topkapı Palace commemorates the eastern campaign victory of which sultan?', '["Murad IV","Selim I","Murad III","Mehmed IV"]'::jsonb),
  ('Kadeş Antlaşması''nın ardından Mısır kraliçesi Nefertari ile mektuplaşan Hitit kraliçesi kimdir?', 'Which Hittite queen corresponded with the Egyptian queen Nefertari after the Treaty of Kadesh?', '["Puduhepa","Asmunikal","Gassulawiya","Danuhepa"]'::jsonb),
  ('MÖ 1274''teki Kadeş Savaşı''nda II. Ramses''e karşı savaşan Hitit kralı kimdir?', 'Which Hittite king fought against Ramesses II at the Battle of Kadesh in 1274 BC?', '["Muwatalli II","Suppiluliuma I","Hattusili III","Mursili I"]'::jsonb),
  ('Katılımcıların birbirine domates fırlattığı ''La Tomatina'' festivali hangi ülkede düzenlenir?', 'In which country is ''La Tomatina'', the festival where people throw tomatoes at each other, held?', '["Spain","Italy","Portugal","Mexico"]'::jsonb),
  ('Dünyanın en büyük bira festivali Oktoberfest her yıl hangi şehirde düzenlenir?', 'In which city is Oktoberfest, the world''s largest beer festival, held every year?', '["Munich","Berlin","Cologne","Frankfurt"]'::jsonb),
  ('Bolonez sos adını hangi İtalyan şehrinden alır?', 'Bolognese sauce takes its name from which Italian city?', '["Bologna","Naples","Milan","Turin"]'::jsonb),
  ('Monopoly''nin atası sayılan ''The Landlord''s Game''i 1904''te tasarlayan kişi kimdir?', 'Who designed ''The Landlord''s Game'' in 1904, regarded as the forerunner of Monopoly?', '["Elizabeth Magie","Charles Darrow","Milton Bradley","Alfred Butts"]'::jsonb),
  ('Japon içkisi sake hangi tahıldan yapılır?', 'Which grain is Japanese sake made from?', '["Rice","Barley","Wheat","Millet"]'::jsonb),
  ('Köpüklü şarap ''şampanya'' adını nereden alır?', 'Where does sparkling ''champagne'' get its name from?', '["A region of France","A monk''s name","A grape variety","An Italian town"]'::jsonb),
  ('Meksika içkisi tekila hangi bitkiden elde edilir?', 'Which plant is Mexican tequila made from?', '["Blue agave","Cactus","Sugar cane","Maize"]'::jsonb),
  ('''Sabotaj'' kelimesi hangi nesnenin Fransızca adından türemiştir?', 'The word ''sabotage'' comes from the French name of which object?', '["Wooden shoe","Iron hammer","Steel spanner","Wooden mallet"]'::jsonb),
  ('Kruvasanın atası sayılan hilal biçimli ''kipferl'' hangi ülkenin mutfağından gelir?', 'The crescent-shaped ''kipferl'', seen as the ancestor of the croissant, comes from which country''s cuisine?', '["Austria","Switzerland","Belgium","Hungary"]'::jsonb)
  ) v(soru, en_soru, en_secenekler)
  join public.questions q on q.soru = v.soru and q.created_at >= transaction_timestamp()
on conflict (question_id, dil) do nothing;

-- ---------------------------------------------------- Çevrilmeyenler
insert into public.ceviri_atlanan (question_id, dil, neden, kod)
select q.id, 'en', v.neden, 'cevrilemez'
  from (values
  ('''Kınar Hanımın Denizleri'' ve ''Bakışsız Bir Kedi Kara'' kitaplarının şairi kimdir?', 'Türkçe şiir kitabı adlarına dayanıyor; İngilizce oyuncu için anlamlı değil.'),
  ('Hint Okyanusu seferinden karadan dönerek ''Mir''atü''l-Memalik''i yazan Osmanlı amirali kimdir?', 'Osmanlıca eser adına dayanıyor; İngilizce oyuncu için anlamlı değil.')
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
