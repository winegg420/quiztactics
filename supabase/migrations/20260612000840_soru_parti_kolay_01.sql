-- ============================================================
-- 840 — soru_parti_kolay_01 (stil: docs/SORU_STIL_PROFILI.md): 50 soru · 2026-10-01
--
-- Kategori: edebiyat 4 · genel_kultur 8 · muzik 10 · sanat 10 · sinema 5 · spor 3 · tarih 2 · teknoloji 8
-- Yerel (kapsam='yerel', ulke='TR'): 1 · zorluk 1–5: 0/50/0/0/0
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
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti 1 --no 840 --klasor kolay-01 --ad soru_parti_kolay_01 --cevirisiz
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
('Picasso''nun öncülüğünü yaptığı, nesneleri geometrik parçalara bölen sanat akımı hangisidir?', '["Kübizm","Sürrealizm","Empresyonizm","Dadaizm"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Paris''teki Louvre Müzesi''nin avlusunda yer alan cam yapı hangi biçimdedir?', '["Piramit","Küre","Küp","Kubbe"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Andy Warhol''un tablolarında defalarca resmettiği konserve çorba markası hangisidir?', '["Campbell''s","Kellogg''s","Hellmann''s","Heinz"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Mimar Gaudí''nin sıra dışı yapılarıyla ünlü İspanyol şehri hangisidir?', '["Barselona","Madrid","Sevilla","Valensiya"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Kâğıdı kesmeden katlayarak şekiller yapma sanatına ne ad verilir?', '["Origami","İkebana","Kirigami","Bonsai"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Michelangelo''nun ünlü ''Davut'' heykeli hangi şehirde sergilenir?', '["Floransa","Roma","Venedik","Milano"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Van Gogh''un defalarca resmettiği, vazodaki sarı çiçekler hangisidir?', '["Ayçiçekleri","Papatyalar","Laleler","Nergisler"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Ünlülerin balmumu heykelleriyle tanınan müze hangisidir?', '["Madame Tussauds","Tate Modern","Uffizi Galerisi","Prado Müzesi"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Mısır''da piramitlerin yanında duran, aslan gövdeli ve insan başlı dev heykelin adı nedir?', '["Sfenks","Anubis","Ramses","Obelisk"]'::jsonb, 0, 'sanat', 'global', null, 2),
('''Poker Face'' ve ''Bad Romance'' şarkılarının sahibi kimdir?', '["Lady Gaga","Katy Perry","Britney Spears","Miley Cyrus"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Hello'', ''Someone Like You'' ve ''Rolling in the Deep'' şarkılarını seslendiren şarkıcı kimdir?', '["Adele","Rihanna","Dua Lipa","Sia"]'::jsonb, 0, 'muzik', 'global', null, 2),
('BTS ve Blackpink gibi gruplarla dünyaya yayılan müzik türü hangisidir?', '["K-pop","J-pop","Reggaeton","Afrobeat"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Shake It Off'' ve ''Blank Space'' şarkılarının sahibi kimdir?', '["Taylor Swift","Katy Perry","Ariana Grande","Selena Gomez"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Baby'' şarkısıyla çocuk yaşta dünyaca ünlenen şarkıcı kimdir?', '["Justin Bieber","Shawn Mendes","Bruno Mars","Harry Styles"]'::jsonb, 0, 'muzik', 'global', null, 2),
('İskoçya ile özdeşleşen, torbasına hava üflenerek çalınan çalgı hangisidir?', '["Gayda","Obua","Klarnet","Flüt"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Elton John sahnede hangi çalgının başında şarkı söyler?', '["Piyano","Gitar","Keman","Bateri"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Eminem hangi müzik türünün sanatçısıdır?', '["Rap","Rock","Caz","Country"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Tellerine yay sürtülerek çalınan ve çene altında tutulan çalgı hangisidir?', '["Keman","Çello","Arp","Ud"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Dört müzisyenden oluşan topluluğa ne ad verilir?', '["Kuartet","Düet","Trio","Kentet"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Google''ın geliştirdiği mobil işletim sistemi hangisidir?', '["Android","iOS","Symbian","HarmonyOS"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Google''ın geliştirdiği internet tarayıcısı hangisidir?', '["Chrome","Firefox","Safari","Opera"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Apple''ın iPhone''larda kullanılan sesli asistanının adı nedir?', '["Siri","Alexa","Cortana","Bixby"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Windows''ta bir belgedeki her şeyi seçmek için kullanılan klavye kısayolu hangisidir?', '["Ctrl+A","Ctrl+S","Ctrl+T","Ctrl+E"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Sony''nin ilki 1994''te çıkan oyun konsolu serisinin adı nedir?', '["PlayStation","GameCube","Dreamcast","Game Boy"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Snapchat uygulamasının sarı logosunda hangi figür yer alır?', '["Hayalet","Baykuş","Tilki","Zarf"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('''The Legend of Zelda'' oyunlarında oyuncunun yönettiği kahramanın adı nedir?', '["Link","Zelda","Ganon","Epona"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('''Pac-Man'' oyununda oyuncuyu labirentte kovalayan düşmanlar nedir?', '["Hayaletler","Robotlar","Uzaylılar","Canavarlar"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Mobilya devi IKEA hangi ülkenin markasıdır?', '["İsveç","Danimarka","Norveç","Finlandiya"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Barbie bebeğin erkek arkadaşının adı nedir?', '["Ken","Tom","Max","Ben"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('İtalyancada ''teşekkürler'' anlamına gelen sözcük hangisidir?', '["Grazie","Gracias","Merci","Danke"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Pizzanın anavatanı sayılan İtalyan şehri hangisidir?', '["Napoli","Roma","Milano","Venedik"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Venedik''in kanallarında kullanılan uzun ve dar geleneksel teknenin adı nedir?', '["Gondol","Kano","Sandal","Kayık"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('ABD''de Şükran Günü sofrasının geleneksel yemeği hangi hayvanın etidir?', '["Hindi","Ördek","Kaz","Tavuk"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Burçlar kuşağında ilk sırada yer alan burç hangisidir?', '["Koç","Boğa","Oğlak","Kova"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Bir bowling atışında devrilmesi gereken kaç lobut vardır?', '["10","8","9","12"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('''Titanic'' filminde Rose''u canlandıran oyuncu kimdir?', '["Kate Winslet","Nicole Kidman","Julia Roberts","Cate Blanchett"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Avatar'' filminde Pandora gezegeninde yaşayan mavi tenli halkın adı nedir?', '["Na''vi","Twi''lek","Ewok","Wookiee"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Star Wars'' serisinde Luke Skywalker''ın babası olduğu ortaya çıkan karakter kimdir?', '["Darth Vader","Obi-Wan Kenobi","Han Solo","Boba Fett"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Matrix'' filminde Neo gerçeği görmek için hangi renk hapı seçer?', '["Kırmızı","Mavi","Yeşil","Sarı"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Buz Devri'' filmlerinde palamudunun peşinden koşan Scrat hangi hayvandır?', '["Sincap","Kunduz","Gelincik","Köstebek"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Moby Dick'' romanında Kaptan Ahab''ın peşine düştüğü Moby Dick nedir?', '["Balina","Köpekbalığı","Ahtapot","Timsah"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Küçük Prens'' kitabında Küçük Prens''e ''evcilleştirmeyi'' öğreten hayvan hangisidir?', '["Tilki","Kuzu","Yılan","Kedi"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Sherlock Holmes''un maceralarını anlatan yakın dostu ve yardımcısı kimdir?', '["Watson","Moriarty","Lestrade","Mycroft"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Açlık Oyunları'' serisinin okçu kahramanının adı nedir?', '["Katniss","Tris","Bella","Hermione"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Tenisçi Rafael Nadal hangi ülkelidir?', '["İspanya","Arjantin","İtalya","Portekiz"]'::jsonb, 0, 'spor', 'global', null, 2),
('NBA''de ''Black Mamba'' lakabıyla tanınan efsane oyuncu kimdir?', '["Kobe Bryant","LeBron James","Allen Iverson","Kevin Durant"]'::jsonb, 0, 'spor', 'global', null, 2),
('Michael Jordan''ın Chicago Bulls''ta giydiği efsanevi forma numarası kaçtır?', '["23","10","32","24"]'::jsonb, 0, 'spor', 'global', null, 2),
('Japonya''nın kılıç kuşanan geleneksel savaşçı sınıfına ne ad verilir?', '["Samuray","Şogun","Geyşa","Sumo"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Rusya''da imparatorlara verilen unvan hangisidir?', '["Çar","Şah","Kayzer","Han"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Suyun üzerine serpilen boyaların kâğıda aktarılmasıyla yapılan geleneksel süsleme sanatı hangisidir?', '["Ebru","Tezhip","Hat","Çini"]'::jsonb, 0, 'sanat', 'yerel', 'TR', 2)
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
