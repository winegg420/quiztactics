-- ============================================================
-- 842 — soru_parti_kolay_02a (stil: docs/SORU_STIL_PROFILI.md): 100 soru · 2026-10-01
--
-- Kategori: edebiyat 11 · genel_kultur 17 · muzik 18 · sanat 18 · sinema 12 · spor 4 · tarih 4 · teknoloji 16
-- Yerel (kapsam='yerel', ulke='TR'): 0 · zorluk 1–5: 0/100/0/0/0
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
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti 2 --no 842 --klasor kolay-02a --ad soru_parti_kolay_02a --cevirisiz
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
('Bale dansçılarının giydiği kabarık kısa etek hangisidir?', '["Tütü","Kilt","Pareo","Şalvar"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Michelangelo''nun ''Pietà'' heykeli Meryem''in kucağında kimi tutarken gösterir?', '["İsa","Yusuf","Davut","Musa"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Pisa''daki ünlü kule neden dünyaca bilinir?', '["Eğik duruşuyla","Yüksekliğiyle","Altın kaplamasıyla","Renkli camlarıyla"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Karagöz gölge oyununda Karagöz''ün yanındaki ünlü arkadaşı kimdir?', '["Hacivat","Tiryaki","Beberuhi","Zenne"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Aynalar Salonu''yla ünlü Versay Sarayı hangi ülkededir?', '["Fransa","İtalya","Avusturya","Belçika"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Eyfel Kulesi hangi nehrin kıyısındadır?', '["Seine","Ren","Tuna","Thames"]'::jsonb, 0, 'sanat', 'global', null, 2),
('New York Limanı''ndaki Özgürlük Heykeli, ABD''ye hangi ülkenin hediyesidir?', '["Fransa","İngiltere","İtalya","İspanya"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Eski Mısır''da kullanılan, resimlerden oluşan yazı sistemine ne ad verilir?', '["Hiyeroglif","Çivi yazısı","Rün yazısı","Braille"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Roma''da gladyatör dövüşlerine sahne olan dev amfitiyatro hangisidir?', '["Kolezyum","Pantheon","Parthenon","Forum"]'::jsonb, 0, 'sanat', 'global', null, 2),
('San Francisco''nun simgesi olan, turuncu-kırmızı renkli ünlü köprü hangisidir?', '["Golden Gate","Tower Bridge","Brooklyn Köprüsü","Sidney Köprüsü"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Kızılderililerin yontulmuş ve boyanmış ağaç direklerine ne ad verilir?', '["Totem","Tipi","Kano","Mızrak"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Rio de Janeiro''da kollarını iki yana açmış duran dev Kurtarıcı İsa heykeli hangi ülkededir?', '["Brezilya","Arjantin","Portekiz","Şili"]'::jsonb, 0, 'sanat', 'global', null, 2),
('İç içe geçen Rus ahşap bebeklerine ne ad verilir?', '["Matruşka","Barbie","Kokeshi","Marionet"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Akropolis hangi şehirdedir?', '["Atina","Selanik","Roma","Kahire"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Eskimoların buz bloklarından yaptığı kubbe biçimli ev hangisidir?', '["İglo","Çadır","Yurt","Kulübe"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Müzikalleriyle ünlü Broadway hangi şehirdedir?', '["New York","Los Angeles","Las Vegas","Londra"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Çektiği fotoğrafı anında basan ünlü makinenin markası hangisidir?', '["Polaroid","Kodak","Canon","Nikon"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Venedik Karnavalı''nda katılımcılar yüzlerine ne takar?', '["Maske","Gözlük","Peçe","Bandana"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Metallica hangi müzik türüyle anılır?', '["Metal","Reggae","Country","Disko"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Gangnam Style'' şarkısıyla YouTube''da rekorlar kıran sanatçı hangi ülkelidir?', '["Güney Kore","Kuzey Kore","Hong Kong","Yeni Zelanda"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Elvis Presley''in ünlü şarkısı ''Jailhouse Rock'' neyi anlatır?', '["Hapishane partisini","Deniz yolculuğunu","Çiftlik hayatını","Uzay yolculuğunu"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''I Will Always Love You'' şarkısını ''The Bodyguard'' filminde seslendiren sanatçı kimdir?', '["Whitney Houston","Mariah Carey","Diana Ross","Celine Dion"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Wannabe'' şarkısıyla 90''larda dünyayı sallayan beş kişilik kız grubu hangisidir?', '["Spice Girls","Destiny''s Child","Little Mix","Pussycat Dolls"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Mikrofona şarkı söyleyen gruptaki ana şarkıcıya ne ad verilir?', '["Solist","Basçı","Davulcu","Prodüktör"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Her yıl Avrupa ülkelerinin şarkıcılarının yarıştığı büyük müzik yarışması hangisidir?', '["Eurovision","Grammy","Brit Awards","Billboard"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Hawaii ile özdeşleşen, küçük dört telli gitar benzeri çalgı hangisidir?', '["Ukulele","Mandolin","Banjo","Lavta"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Bateri çalan müzisyene ne ad verilir?', '["Davulcu","Gitarist","Basçı","Klavyeci"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Umbrella'' ve ''Diamonds'' şarkılarının sahibi sanatçı kimdir?', '["Rihanna","Beyoncé","Nicki Minaj","Kesha"]'::jsonb, 0, 'muzik', 'global', null, 2),
('The Beatles''ın üyelerinden hangisi bateri çalar?', '["Ringo Starr","Paul McCartney","George Harrison","John Lennon"]'::jsonb, 0, 'muzik', 'global', null, 2),
('DJ''lerin plak çalmak için kullandığı alete ne ad verilir?', '["Pikap","Radyo","Teyp","Amfi"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Happy'' şarkısıyla dünya çapında ünlenen sanatçı kimdir?', '["Pharrell Williams","Bruno Mars","Justin Timberlake","Ed Sheeran"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Müzik dünyasının en prestijli ödüllerinden biri hangisidir?', '["Grammy","Oscar","Emmy","Tony"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Ekranda sözleri izleyerek şarkı söyleme eğlencesine ne ad verilir?', '["Karaoke","Playback","Kolaj","Stüdyo"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Let It Go'' şarkısı hangi Disney filminde yer alır?', '["Karlar Ülkesi","Aslan Kral","Güzel ve Çirkin","Küçük Denizkızı"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Under the Sea'' şarkısı hangi Disney filminde yer alır?', '["Küçük Denizkızı","Güzel ve Çirkin","Uyuyan Güzel","Karlar Ülkesi"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Hakuna Matata'' şarkısı hangi Disney filminde yer alır?', '["Aslan Kral","Karlar Ülkesi","Aladdin","Moana"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Tesla elektrikli otomobillerinin başındaki ünlü isim kimdir?', '["Elon Musk","Jeff Bezos","Tim Cook","Sundar Pichai"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Çalan şarkıyı dinleyip adını bulan ünlü uygulama hangisidir?', '["Shazam","Zoom","Waze","Uber"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Yapay zekâ sohbet botu ChatGPT''yi hangi şirket geliştirmiştir?', '["OpenAI","Google","Meta","Apple"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Galaxy telefon serisi hangi şirkete aittir?', '["Samsung","Huawei","Xiaomi","Sony"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Amazon''un sesli asistanının adı nedir?', '["Alexa","Siri","Cortana","Bixby"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Taşınabilir oyun konsolu Game Boy hangi şirkete aittir?', '["Nintendo","Microsoft","Samsung","Logitech"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Apple''ın şarkıları cebe sığdıran ünlü müzik çaları hangisiydi?', '["iPod","Walkman","Zune","Discman"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Firefox tarayıcısının logosunda hangi hayvan yer alır?', '["Tilki","Kurt","Kedi","Panda"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Kullanıcılara müzik dinleten yeşil logolu uygulama hangisidir?', '["Spotify","Netflix","Twitter","Zoom"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Bitcoin ne tür bir para birimidir?', '["Dijital","Kâğıt","Madeni","Plastik"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Pandemide uzaktan toplantılar için yaygınlaşan görüntülü görüşme uygulaması hangisidir?', '["Zoom","Spotify","TikTok","Twitch"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Çoğunlukla kısa dikey videolarla öne çıkan Çin çıkışlı uygulama hangisidir?', '["TikTok","Snapchat","Pinterest","LinkedIn"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Steve Jobs hangi şirketin kurucularındandır?', '["Apple","Microsoft","Google","Amazon"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('İnternetten bir dosyayı kendi cihazımıza kaydetmeye ne denir?', '["İndirme","Yükleme","Silme","Yedekleme"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Android''in maskotu olan yeşil karakter nedir?', '["Robot","Penguen","Kurbağa","Kedi"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Bilgisayar ekranında fareyle oynattığımız küçük oka ne ad verilir?', '["İmleç","Simge","Pencere","Menü"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('ABD Başkanı''nın resmî konutu olan yapı hangisidir?', '["Beyaz Saray","Kremlin Sarayı","Elysée Sarayı","Buckingham Sarayı"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('İskoç erkeklerin giydiği ekose desenli geleneksel etek hangisidir?', '["Kilt","Sari","Poncho","Kimono"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Sevgililer Günü hangi ayda kutlanır?', '["Şubat","Ocak","Mart","Nisan"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Louis Vuitton ve Chanel hangi ülkenin lüks moda markalarıdır?', '["Fransa","İtalya","İngiltere","ABD"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Fransa ile özdeşleşen uzun ince ekmek hangisidir?', '["Baget","Simit","Pide","Lavaş"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Japonya bayrağının ortasındaki kırmızı daire neyi simgeler?', '["Güneşi","Ayı","Yıldızı","Gülü"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Eski Yunan tanrılarının yaşadığı efsanevi dağ hangisidir?', '["Olimpos","Etna","Ararat","Kilimanjaro"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Japonya''nın geleneksel kıyafeti hangisidir?', '["Kimono","Sari","Hanbok","Kaftan"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Plastik yapı bloklarıyla ünlü LEGO hangi ülkenin markasıdır?', '["Danimarka","İsveç","Almanya","Hollanda"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Yılbaşında evlerde süslenen ağaç türü hangisidir?', '["Çam","Meşe","Çınar","Kavak"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Avustralya''nın simgesi olan, sıçrayarak ilerleyen hayvan hangisidir?', '["Kanguru","Koala","Emu","Vombat"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Meksika ile özdeşleşen geniş kenarlı şapka hangisidir?', '["Sombrero","Panama","Kasket","Fötr"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Hindistan''da kutsal kabul edilen hayvan hangisidir?', '["İnek","Köpek","At","Koyun"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Tacos hangi ülkenin mutfağıyla özdeşleşmiştir?', '["Meksika","İspanya","Brezilya","Arjantin"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Noel Baba''nın kızağını hangi hayvanlar çeker?', '["Geyikler","Atlar","Kurtlar","Köpekler"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Bira festivali Oktoberfest hangi ülkede kutlanır?', '["Almanya","Avusturya","Belçika","İrlanda"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Suşi hangi ülkenin mutfağıyla özdeşleşmiştir?', '["Japonya","Çin","Kore","Tayland"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Mr. Bean karakterini hangi oyuncu canlandırmıştır?', '["Rowan Atkinson","Jim Carrey","Steve Carell","Eddie Murphy"]'::jsonb, 0, 'sinema', 'global', null, 2),
('2023 yapımı ''Barbie'' filminde Barbie''yi hangi oyuncu canlandırmıştır?', '["Margot Robbie","Emma Stone","Zendaya","Anne Hathaway"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Karayip Korsanları''nda Kaptan Jack Sparrow''u hangi oyuncu canlandırmıştır?', '["Johnny Depp","Orlando Bloom","Brad Pitt","Tom Cruise"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Titanic'' filminde Jack Dawson''ı kim canlandırmıştır?', '["Leonardo DiCaprio","Joaquin Phoenix","Christian Bale","Ryan Gosling"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Gladyatör'' filminde Maximus''u hangi oyuncu canlandırmıştır?', '["Russell Crowe","Tom Hardy","Brad Pitt","Mel Gibson"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Harry Potter'' filmlerinde Harry''nin en yakın arkadaşı Ron''un soyadı nedir?', '["Weasley","Granger","Malfoy","Longbottom"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Kayıp Balık Nemo'' filminde Nemo hangi balık türüdür?', '["Palyaço balığı","Köpek balığı","Altın balık","Kılıç balığı"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Karlar Ülkesi'' filminde buz gücüne sahip prenses kimdir?', '["Elsa","Anna","Ariel","Belle"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Oyuncak Hikâyesi'' filminde Woody hangi türde bir oyuncaktır?', '["Kovboy","Astronot","Asker","Korsan"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Jurassic Park'' filminde laboratuvarda yeniden canlandırılan yaratıklar nelerdir?', '["Dinozorlar","Mamutlar","Ejderhalar","Dev böcekler"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Minyonlar hangi renktedir?', '["Sarı","Mavi","Yeşil","Mor"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Canavarlar Şirketi'' filminde tek gözlü yeşil canavarın adı nedir?', '["Mike","Sulley","Randall","Boo"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Tolstoy ve Dostoyevski hangi ülkenin yazarlarıdır?', '["Rusya","Fransa","Almanya","Polonya"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Peter Pan''ın yanında dolaşan, ışıldayan minik peri kimdir?', '["Tinker Bell","Pamuk Prenses","Küçük Deniz Kızı","Uyuyan Güzel"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Sherlock Holmes''un yaşadığı sokak hangisidir?', '["Baker Street","Oxford Street","Abbey Road","Downing Street"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Peter Pan''ın baş düşmanı Kaptan Hook''un elinin yerine taktığı şey nedir?', '["Kanca","Kılıç","Çekiç","Çatal"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Pinokyo yalan söylediğinde vücudunun hangi bölümü uzar?', '["Burnu","Kulağı","Kolu","Parmağı"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Alice, ''Harikalar Diyarı''nda hangi hayvanın peşinden koşar?', '["Tavşan","Kedi","Tilki","Kuş"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Çirkin Ördek Yavrusu'' masalında yavru büyüyünce hangi kuş olur?', '["Kuğu","Kaz","Kartal","Güvercin"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Heidi''nin dedesiyle yaşadığı dağlık ülke hangisidir?', '["İsviçre","Avusturya","Norveç","Almanya"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Narnia Günlükleri''nde çocuklar Narnia''ya hangi eşyadan geçerek ulaşır?', '["Gardırop","Sandık","Sehpa","Piyano"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Robinson Crusoe yıllarca nerede yaşar?', '["Issız bir adada","Karlı bir dağda","Derin bir mağarada","Kalabalık bir şehirde"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Külkedisi''nin baloda kaybettiği ayakkabı neyden yapılmıştır?', '["Cam","Altın","Ahşap","Deri"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('LeBron James hangi spor dalıyla tanınır?', '["Basketbol","Beyzbol","Amerikan futbolu","Hokey"]'::jsonb, 0, 'spor', 'global', null, 2),
('Wimbledon hangi sporun prestijli turnuvasıdır?', '["Tenis","Golf","Kriket","Yüzme"]'::jsonb, 0, 'spor', 'global', null, 2),
('Futbolda kalecilerin topu tutmasına yardım eden giysi hangisidir?', '["Eldiven","Dizlik","Kask","Forma"]'::jsonb, 0, 'spor', 'global', null, 2),
('Futbolda oyuncuyu oyundan atan kart hangi renktir?', '["Kırmızı","Sarı","Mavi","Yeşil"]'::jsonb, 0, 'spor', 'global', null, 2),
('Roma döneminin ünlü Pompei kenti hangi yanardağın külleri altında kalmıştır?', '["Vezüv","Etna","Stromboli","Fuji"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Kristof Kolomb 1492''de hangi kıtaya ulaşmıştır?', '["Amerika","Avustralya","Antarktika","Afrika"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Titanik gemisi neye çarparak batmıştır?', '["Buzdağına","Kayalığa","Gemiye","Denizaltıya"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Truva Savaşı''nda Yunanlıların askerlerini içine gizlediği dev ahşap yapı neye benzer?', '["At","Aslan","Boğa","Kartal"]'::jsonb, 0, 'tarih', 'global', null, 2)
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
