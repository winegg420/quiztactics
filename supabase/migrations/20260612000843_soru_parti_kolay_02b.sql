-- ============================================================
-- 843 — soru_parti_kolay_02b (stil: docs/SORU_STIL_PROFILI.md): 86 soru · 2026-10-01
--
-- Kategori: edebiyat 8 · genel_kultur 16 · muzik 16 · sanat 14 · sinema 12 · spor 3 · tarih 2 · teknoloji 15
-- Yerel (kapsam='yerel', ulke='TR'): 2 · zorluk 1–5: 0/86/0/0/0
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
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti 3 --no 843 --klasor kolay-02b --ad soru_parti_kolay_02b --cevirisiz
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
('Hokusai''nin ''Büyük Dalga'' adlı ünlü eseri hangi ülkenin sanatıdır?', '["Japonya","Çin","Kore","Hindistan"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Soğan biçimli renkli kubbeleriyle ünlü Aziz Vasil Katedrali hangi ülkededir?', '["Rusya","Polonya","Ukrayna","Bulgaristan"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Resimde fırçayla kâğıda sürülen şeffaf, suyla inceltilen boyaya ne denir?', '["Suluboya","Yağlıboya","Guaj","Mum boya"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Dört ABD başkanının yüzünün kayalara oyulduğu ünlü anıt hangi dağdadır?', '["Rushmore Dağı","Fuji Dağı","Elbrus Dağı","Ararat Dağı"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Empire State Binası hangi şehirdedir?', '["New York","Chicago","Los Angeles","Boston"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Eğik Pisa Kulesi hangi ülkededir?', '["İtalya","İspanya","Fransa","Yunanistan"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Hindistan''da Şah Cihan''ın sevgili eşi için yaptırdığı beyaz mermer türbe hangisidir?', '["Tac Mahal","Kızıl Kale","Lotus Tapınağı","Amber Kalesi"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Film çekiminde sahne başlarken çıtlatılan alete ne ad verilir?', '["Klaket","Megafon","Spot","Tripod"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Güvercinleriyle ünlü San Marco Meydanı hangi İtalyan şehrindedir?', '["Venedik","Roma","Floransa","Napoli"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Fotoğraf makinesinde uzaktaki nesneyi yakınlaştıran özelliğe ne ad verilir?', '["Zoom","Flaş","Filtre","Zamanlayıcı"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Hawaii''nin geleneksel dansı hangisidir?', '["Hula","Haka","Samba","Tango"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Uzaydan görülebildiği söylenen, binlerce kilometre uzanan antik yapı hangisidir?', '["Çin Seddi","Büyük Kanal","Yasak Şehir","Terakota Ordusu"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Japon çizgi filmlerine ne ad verilir?', '["Anime","Manga","Cosplay","Origami"]'::jsonb, 0, 'sanat', 'global', null, 2),
('''Single Ladies'' şarkısıyla tanınan sanatçı kimdir?', '["Beyoncé","Rihanna","Shakira","Adele"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Firework'' şarkısının sahibi sanatçı kimdir?', '["Katy Perry","Lady Gaga","Taylor Swift","Selena Gomez"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Don''t Stop Believin'' şarkısı hangi gruba aittir?', '["Journey","Toto","Foreigner","Boston"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Her Noel''de çalan ''Last Christmas'' şarkısı hangi gruba aittir?', '["Wham!","ABBA","Queen","Bee Gees"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Luciano Pavarotti hangi ses türünde şarkı söylerdi?', '["Tenor","Bas","Soprano","Bariton"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Oops!... I Did It Again'' şarkısıyla tanınan pop yıldızı kimdir?', '["Britney Spears","Christina Aguilera","Jessica Simpson","Mandy Moore"]'::jsonb, 0, 'muzik', 'global', null, 2),
('The Rolling Stones''un ünlü logosunda hangi vücut parçası yer alır?', '["Dil","Göz","El","Kulak"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Dünya çapında YouTube rekorları kıran ''Baby Shark'' çocuk şarkısı hangi hayvanı anlatır?', '["Köpek balığı","Mavi balina","Deniz atı","Kedi balığı"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Disney dizisi ''Hannah Montana''nın yıldızı olup ''Flowers'' şarkısıyla tanınan sanatçı kimdir?', '["Miley Cyrus","Selena Gomez","Demi Lovato","Vanessa Hudgens"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Rapçi Snoop Dogg''un adındaki hayvan hangisidir?', '["Köpek","Kedi","Kurt","Kaplan"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Standart bir keman kaç telden oluşur?', '["4","3","5","6"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Müzikte ''La'' notasından sonra hangi nota gelir?', '["Si","Do","Sol","Re"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Michael Jackson''ın ''Thriller'' klibinde dans eden yaratıklar hangileridir?', '["Zombiler","Vampirler","Kurt adamlar","Hayaletler"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''A Whole New World'' şarkısı hangi Disney filmindedir?', '["Aladdin","Mulan","Pocahontas","Tarzan"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''La Marseillaise'' hangi ülkenin milli marşıdır?', '["Fransa","İtalya","Belçika","İspanya"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''We Don''t Talk About Bruno'' şarkısı hangi animasyon filminde yer alır?', '["Encanto","Coco","Moana","Raya"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Sanal insanların hayatını yönettiğimiz ünlü oyun serisi hangisidir?', '["The Sims","Pac-Man","Space Invaders","Mortal Kombat"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Google''ın e-posta hizmeti hangisidir?', '["Gmail","Outlook","Yahoo","iCloud"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Microsoft''un oyun konsolu serisi hangisidir?', '["Xbox","PlayStation","Switch","Wii"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Adobe Photoshop hangi iş için kullanılır?', '["Fotoğraf düzenleme","Muhasebe hesaplama","Müzik besteleme","Video oynatma"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Sanal gerçeklik gözlüklerinin kısaltması nedir?', '["VR","AR","AI","PC"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Apple''ın bileğe takılan akıllı saati hangisidir?', '["Apple Watch","Galaxy Watch","Mi Band","Fitbit"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Amazon''un e-kitap okuma cihazı hangisidir?', '["Kindle","iPad","Nook","Surface"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Microsoft PowerPoint ile ne hazırlanır?', '["Sunum","Film","Fatura","Harita"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Bilgisayarda yazı yazılan Microsoft programı hangisidir?', '["Word","Excel","Paint","Access"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Bilgisayar ekranındaki küçük resimlere ne ad verilir?', '["Simge","İmleç","Pencere","Dosya"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Eski Nokia telefonlarda oynanan klasik oyun hangi hayvanın adını taşır?', '["Yılan","Kedi","Kuş","Fare"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('WhatsApp''ta mesajın okunduğunu gösteren çift işaret hangi renge döner?', '["Mavi","Yeşil","Kırmızı","Gri"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Mario karakterinin yaratıcısı olan şirket hangi ülkelidir?', '["Japonya","ABD","Güney Kore","Çin"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Cep boyunda, bakımını yapmanız gereken sanal evcil hayvan oyuncağı hangisidir?', '["Tamagotchi","Game Boy","Rubik Küpü","Furby"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Telefonla çekilen kendi fotoğrafımıza ne ad verilir?', '["Selfie","Poster","Karikatür","Portre"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Harf taşlarıyla kelime oluşturulan ünlü masa oyunu hangisidir?', '["Scrabble","Monopoly","Tavla","Dama"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('''Arigato'' hangi dilde ''teşekkürler'' anlamına gelir?', '["Japonca","Korece","Çince","Tayca"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('''Danke'' hangi dilde ''teşekkürler'' anlamına gelir?', '["Almanca","İsveççe","Fransızca","İspanyolca"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Dünya genelinde ünlü Hello Kitty hangi ülkenin karakteridir?', '["Japonya","Çin","Güney Kore","ABD"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Burçlardan hangisinin simgesi aslandır?', '["Aslan","Koç","Boğa","Yengeç"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Starbucks''ın yeşil logosunda hangi efsanevi yaratık yer alır?', '["Denizkızı","Ejderha","Şövalye","Gladyatör"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('''Hola'' hangi dilde ''merhaba'' anlamına gelir?', '["İspanyolca","İtalyanca","Fransızca","Almanca"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Adidas''ın ünlü işareti kaç çizgiden oluşur?', '["3","2","4","5"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Nike''ın ünlü logosu hangi işarete benzer?', '["Tik","Yıldız","Kalp","Daire"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Espresso hangi ülkenin kahve kültürünün simgesidir?', '["İtalya","Fransa","Brezilya","Kolombiya"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Mercedes-Benz''in logosunda hangi şekil bulunur?', '["Yıldız","Aslan","At","Kalkan"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Hollanda hangi çiçekle özdeşleşmiştir?', '["Lale","Gül","Papatya","Karanfil"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('ABD''nin ulusal simgesi olan kuş hangisidir?', '["Kartal","Baykuş","Şahin","Güvercin"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Mickey Mouse''un kız arkadaşının adı nedir?', '["Minnie","Daisy","Clarabelle","Lola"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Monopoly''de oyuncular neyi alıp satarak zengin olmaya çalışır?', '["Mülk","Altın","Mücevher","Tarla"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Hollywood hangi ABD şehrinde yer alır?', '["Los Angeles","New York","San Francisco","Las Vegas"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('''Frozen'' filminde Elsa''nın kız kardeşinin adı nedir?', '["Anna","Ariel","Aurora","Belle"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Terk edilmiş Dünya''da çöp biriktiren küçük robot hangi Pixar filminin kahramanıdır?', '["WALL-E","Toy Story","Monsters Inc","Finding Nemo"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Shrek''in eşi olan prenses kimdir?', '["Fiona","Elsa","Aurora","Jasmine"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Star Wars''taki bilge Jedi ustası Yoda hangi renktedir?', '["Yeşil","Mavi","Kırmızı","Mor"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Yukarı Bak'' (Up) filminde yaşlı adamın evi neyle uçar?', '["Balonlarla","Roketle","Pervaneyle","Rüzgârla"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Arabalar'' filminde Şimşek McQueen''in en iyi arkadaşı olan çekici kamyonun adı nedir?', '["Mater","Doc","Luigi","Sally"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Aslan Kral''da Timon hangi hayvandır?', '["Surikat","Domuz","Fare","Tavşan"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Coco'' filmi hangi ülkenin Ölüler Günü geleneğini anlatır?', '["Meksika","İspanya","Brezilya","Peru"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Kung Fu Panda''nın kahramanı Po''nun en sevdiği yiyecek nedir?', '["Erişte","Pizza","Hamburger","Salata"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Marvel''ın yeşil devi Hulk''ın gerçek adı nedir?', '["Bruce Banner","Peter Parker","Steve Rogers","Tony Stark"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Alacakaranlık'' serisinde Edward Cullen hangi yaratıktır?', '["Vampir","Kurt adam","Cin","Hayalet"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Süpermen hangi gezegende doğmuştur?', '["Krypton","Mars","Venüs","Jüpiter"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Victor Hugo''nun ünlü romanındaki kambur Quasimodo hangi şehirdeki katedralin çan kulesinde yaşar?', '["Paris","Lyon","Roma","Londra"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Pamuk Prenses''in yediği zehirli meyve hangisidir?', '["Elma","Armut","Şeftali","Üzüm"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Üç Küçük Domuz'' masalında kurdun üfleyip yıkamadığı ev neyden yapılmıştır?', '["Tuğla","Saman","Çubuk","Kar"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Alice, Harikalar Diyarı''nda şapkacıyla hangi içecek vakti partisine katılır?', '["Çay","Kahve","Süt","Meyve suyu"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Pinokyo''yu yapan marangozun adı nedir?', '["Geppetto","Gargamel","Pepe","Merlin"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Hansel ve Gretel masalında kardeşler ormanda yollarını bulmak için ne bırakır?', '["Ekmek kırıntıları","Renkli taşlar","Kuru yapraklar","Küçük çiçekler"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Uyuyan Güzel''in parmağını batırdığı sivri nesne nedir?', '["İğ","Diken","Bıçak","Çivi"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Amerikan futbolunun final maçına ne ad verilir?', '["Super Bowl","World Series","Stanley Cup","Grand Slam"]'::jsonb, 0, 'spor', 'global', null, 2),
('Yılın en iyi futbolcusuna verilen ödül hangisidir?', '["Altın Top","Altın Ayakkabı","Altın Eldiven","Altın Kupa"]'::jsonb, 0, 'spor', 'global', null, 2),
('Futbolda bir takımın yedeklerinin oturduğu yere ne ad verilir?', '["Yedek kulübesi","Tribün","Soyunma odası","Stat girişi"]'::jsonb, 0, 'spor', 'global', null, 2),
('İlk motorlu uçağı uçuran kardeşler kimlerdir?', '["Wright Kardeşler","Lumière Kardeşler","Grimm Kardeşler","Marx Kardeşler"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Telefonun mucidi kimdir?', '["Graham Bell","Thomas Edison","Nikola Tesla","Samuel Morse"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Masalların kahramanı Keloğlan''ın belirgin özelliği nedir?', '["Saçsız oluşu","Çok zengin olması","Çok uzun boylu olması","Dev olması"]'::jsonb, 0, 'edebiyat', 'yerel', 'TR', 2),
('Mevlana Türbesi hangi şehrimizdedir?', '["Konya","Bursa","Kayseri","Mardin"]'::jsonb, 0, 'sanat', 'yerel', 'TR', 2)
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
