-- ============================================================
-- 844 — soru_parti_kolay_02c (stil: docs/SORU_STIL_PROFILI.md): 85 soru · 2026-10-01
--
-- Kategori: edebiyat 11 · genel_kultur 12 · muzik 16 · sanat 7 · sinema 14 · spor 8 · tarih 6 · teknoloji 11
-- Yerel (kapsam='yerel', ulke='TR'): 2 · zorluk 1–5: 0/85/0/0/0
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
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti 4 --no 844 --klasor kolay-02c --ad soru_parti_kolay_02c --cevirisiz
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
('Edinburgh Kalesi hangi ülkededir?', '["İskoçya","İrlanda","Galler","Norveç"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Mavi kot pantolonuyla ünlü Levi''s hangi ülkenin markasıdır?', '["ABD","İtalya","Fransa","Japonya"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Altın ve gümüşten takı yapan zanaatkâra ne ad verilir?', '["Kuyumcu","Dökümcü","Demirci","Tesviyeci"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Sirk palyaçolarının burunları genellikle hangi renktedir?', '["Kırmızı","Mavi","Yeşil","Sarı"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Roma''daki Trevi Çeşmesi''ne atılan bozuk paralar ne için atılır?', '["Dilek","Bağış","Oyun","Hesap"]'::jsonb, 0, 'sanat', 'global', null, 2),
('''Love Story'' ve ''Anti-Hero'' şarkılarının sahibi sanatçı kimdir?', '["Taylor Swift","Katy Perry","Ariana Grande","Selena Gomez"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Hips Don''t Lie'' şarkısıyla tanınan sanatçı kimdir?', '["Shakira","Beyoncé","Rihanna","Madonna"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Yellow'' ve ''Fix You'' şarkılarının grubu hangisidir?', '["Coldplay","Oasis","Muse","Radiohead"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Material Girl'' şarkısının sahibi sanatçı kimdir?', '["Madonna","Cyndi Lauper","Whitney Houston","Cher"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Stayin'' Alive'' şarkısı hangi gruba aittir?', '["Bee Gees","ABBA","Boney M","Eagles"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Money, Money, Money'' şarkısı hangi gruba aittir?', '["ABBA","Queen","Bee Gees","Eagles"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Plakların çalındığı eski ses cihazı hangisidir?', '["Gramofon","Radyo","Teyp","Walkman"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Bir şarkının farklı biçimde yeniden düzenlenmiş hâline ne ad verilir?', '["Remix","Single","Albüm","Konser"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Sanatçının önceden kaydedilmiş sesiyle dudak oynatmasına ne ad verilir?', '["Playback","Karaoke","Remix","Cover"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Colors of the Wind'' şarkısı hangi Disney filminde yer alır?', '["Pocahontas","Rapunzel","Aladdin","Pinokyo"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Circle of Life'' şarkısıyla başlayan Disney filmi hangisidir?', '["Aslan Kral","Güzel ve Çirkin","Karlar Ülkesi","Küçük Denizkızı"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Be Our Guest'' şarkısı hangi Disney filminde yer alır?', '["Güzel ve Çirkin","Karlar Ülkesi","Aslan Kral","Küçük Deniz Kızı"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Supercalifragilisticexpialidocious'' şarkısı hangi filmde yer alır?', '["Mary Poppins","Peter Pan","Aslan Kral","Güzel ve Çirkin"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Remember Me'' şarkısı hangi animasyon filminde yer alır?', '["Coco","Moana","Encanto","Ratatouille"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''The Bare Necessities'' şarkısı hangi Disney filminde yer alır?', '["Orman Kitabı","Aslan Kral","Peter Pan","Güzel ve Çirkin"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''You''ve Got a Friend in Me'' şarkısı hangi animasyon filminde yer alır?', '["Oyuncak Hikâyesi","Arabalar","Yukarı Bak","Canavarlar Şirketi"]'::jsonb, 0, 'muzik', 'global', null, 2),
('İstenmeyen toplu e-postalara ne ad verilir?', '["Spam","Meme","Link","Hack"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Bilgisayarı virüslerden korumak için kullanılan program hangisidir?', '["Antivirüs","Tarayıcı","Oyun","Kelime işlemci"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Fotoğraf ve belgeleri bilgisayara aktaran cihaz hangisidir?', '["Tarayıcı","Yazıcı","Fare","Hoparlör"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Duolingo uygulaması ne öğrenmek için kullanılır?', '["Dil","Matematik","Resim","Müzik"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('''Ctrl+C'' kısayolu ne işe yarar?', '["Kopyalar","Siler","Yapıştırır","Kaydeder"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('iPhone hangi işletim sistemini kullanır?', '["iOS","Android","Windows","Linux"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Pinterest en çok neyi paylaşmak için kullanılır?', '["Görselleri","Müzikleri","Oyunları","Haberleri"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Microsoft''un arama motoru hangisidir?', '["Bing","Google","Yahoo","DuckDuckGo"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('İnternette hızla yayılan komik görsellere ne ad verilir?', '["Meme","Spam","Virüs","Hack"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Uzaktan kumandayla uçurulan, kameralı cihaza ne ad verilir?', '["Dron","Robot","Balon","Paraşüt"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Pac-Man hangi renktedir?', '["Sarı","Kırmızı","Mavi","Yeşil"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Noel hangi ayda kutlanır?', '["Aralık","Kasım","Ocak","Şubat"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('''Ciao'' hangi dilde ''merhaba'' anlamına gelir?', '["İtalyanca","Fransızca","İspanyolca","Almanca"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('''Namaste'' hangi ülkede kullanılan bir selamlaşma sözüdür?', '["Hindistan","Japonya","Mısır","Meksika"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('''Bonjour'' hangi dilde ''günaydın'' anlamına gelir?', '["Fransızca","İtalyanca","İspanyolca","Portekizce"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('''Merci'' hangi dilde ''teşekkürler'' anlamına gelir?', '["Fransızca","İtalyanca","Almanca","İspanyolca"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('New York''un simgesi olan taksiler hangi renktedir?', '["Sarı","Kırmızı","Mavi","Siyah"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('''Aloha'' hangi ada eyaletinde kullanılan bir selamlaşma sözüdür?', '["Hawaii","Alaska","Tahiti","Bali"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Londra''nın simgesi olan çift katlı otobüsler hangi renktedir?', '["Kırmızı","Mavi","Sarı","Yeşil"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('McDonald''s''ın maskotu olan palyaçonun adı nedir?', '["Ronald","Bozo","Krusty","Pennywise"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Dünya çapında ünlü döner hangi ülkenin mutfağından çıkmıştır?', '["Türkiye","Yunanistan","Lübnan","İran"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Pamuk Prenses''in yanında kaç cüce yaşar?', '["7","5","6","8"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Alaaddin''in sihirli lambasını ovalayınca çıkan varlık nedir?', '["Cin","Peri","Cadı","Dev"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('James Bond''un kod adı nedir?', '["007","001","006","009"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Dumbo''nun belirgin özelliği nedir?', '["Büyük kulakları","Uzun hortumu","Kısa boyu","Renkli derisi"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Charlie Chaplin hangi tür filmlerle ünlenmiştir?', '["Sessiz film","Korku filmi","Bilim kurgu","Western"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Kaptan Amerika''nın en bilinen aracı nedir?', '["Kalkan","Kılıç","Yay","Çekiç"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Aladdin filmindeki cin hangi renktedir?', '["Mavi","Yeşil","Kırmızı","Mor"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Joker hangi çizgi roman kahramanının baş düşmanıdır?', '["Batman","Süpermen","Örümcek Adam","Iron Man"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Yüzüklerin Efendisi''nde yüzüğü Mordor''a götüren hobbit kimdir?', '["Frodo","Gandalf","Aragorn","Legolas"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Batman hangi kurgusal şehirde yaşar?', '["Gotham","Metropolis","Smallville","Wakanda"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Şirinler''in kötü büyücüsünün adı nedir?', '["Gargamel","Merlin","Voldemort","Saruman"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Batman''in yardımcısı olan genç kahramanın adı nedir?', '["Robin","Joker","Gordon","Bane"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Bambi hangi hayvandır?', '["Geyik","Tavşan","Kedi","At"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Clark Kent''in mesleği nedir?', '["Gazeteci","Doktor","Polis","Öğretmen"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Lazanyaya bayılan, turuncu çizgili çizgi film kedisi hangisidir?', '["Garfield","Tom","Sylvester","Felix"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Muppet Show''un yeşil kurbağası kimdir?', '["Kermit","Elmo","Grover","Gonzo"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Victor Hugo hangi ülkenin yazarıdır?', '["Fransa","İtalya","İspanya","Belçika"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Hans Christian Andersen hangi ülkenin masal yazarıdır?', '["Danimarka","Almanya","Norveç","İsveç"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Küçük Prens'' kitabının yazarı hangi ülkelidir?', '["Fransa","İngiltere","Almanya","İtalya"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Hamelin''in Flütçüsü masalında flütçü hangi hayvanları şehirden çıkarır?', '["Fareleri","Kuşları","Kedileri","Köpekleri"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Ali Baba ve Kırk Haramiler'' masalında kaç haramî vardır?', '["40","30","50","100"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Binbir Gece Masalları''ndaki ünlü denizci kimdir?', '["Sinbad","Aladdin","Ali Baba","Harun"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('''Çirkin Ördek Yavrusu'' masalını kim yazmıştır?', '["Andersen","Grimm","Perrault","Esop"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Agatha Christie hangi türün ustası olarak bilinir?', '["Polisiye","Bilim kurgu","Korku","Aşk"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Grimm Kardeşler hangi ülkenin masal derleyicileridir?', '["Almanya","Fransa","Danimarka","Avusturya"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Stephen King hangi türdeki romanlarıyla ünlüdür?', '["Korku","Aşk","Tarih","Komedi"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Dokunduğu her şeyi altına çeviren efsanevi kral kimdir?', '["Midas","Leonidas","Odysseus","Priamos"]'::jsonb, 0, 'edebiyat', 'global', null, 2),
('Tiger Woods hangi sporla anılır?', '["Golf","Tenis","Beyzbol","Kriket"]'::jsonb, 0, 'spor', 'global', null, 2),
('Real Madrid ve Barcelona hangi ülkenin kulüpleridir?', '["İspanya","İtalya","Portekiz","Fransa"]'::jsonb, 0, 'spor', 'global', null, 2),
('Formula 1''de Ferrari takımı hangi renkle özdeşleşmiştir?', '["Kırmızı","Mavi","Sarı","Yeşil"]'::jsonb, 0, 'spor', 'global', null, 2),
('Formula 1 yarışını bitiren pilota gösterilen bayrak nasıldır?', '["Damalı","Kırmızı","Sarı","Mavi"]'::jsonb, 0, 'spor', 'global', null, 2),
('Basketbolda topu potaya yukarıdan çakma hareketine ne ad verilir?', '["Smaç","Pas","Blok","Faul"]'::jsonb, 0, 'spor', 'global', null, 2),
('Hollanda milli futbol takımının forma rengi nedir?', '["Turuncu","Mavi","Kırmızı","Yeşil"]'::jsonb, 0, 'spor', 'global', null, 2),
('Bir basketbol maçında potanın yüksekliği yaklaşık kaç metredir?', '["3","2","4","5"]'::jsonb, 0, 'spor', 'global', null, 2),
('Brezilya milli futbol takımı hangi renk formayla oynar?', '["Sarı","Mavi","Kırmızı","Beyaz"]'::jsonb, 0, 'spor', 'global', null, 2),
('Termopylae''de savaşan 300 savaşçı hangi şehir devletindendi?', '["Sparta","Atina","Roma","Truva"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Güney Afrika''nın ilk siyah başkanı kimdir?', '["Nelson Mandela","Desmond Tutu","Barack Obama","Muhammed Ali"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Orta Çağ şövalyelerinin vücutlarını korumak için giydiği metal giysiye ne denir?', '["Zırh","Pelerin","Kaftan","Cübbe"]'::jsonb, 0, 'tarih', 'global', null, 2),
('''Bir rüyam var'' konuşmasıyla tanınan sivil haklar lideri kimdir?', '["Martin Luther King","Malcolm X","Booker T. Washington","Nelson Mandela"]'::jsonb, 0, 'tarih', 'global', null, 2),
('İlk insanlı Ay görevi hangi ülkeye aittir?', '["ABD","Rusya","Çin","Fransa"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Ortaçağ kalelerini çevreleyen su dolu çukura ne ad verilir?', '["Hendek","Kule","Kapı","Sur"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Düğünlerde el ele tutuşarak oynanan halk oyununa ne ad verilir?', '["Halay","Tango","Vals","Polka"]'::jsonb, 0, 'sanat', 'yerel', 'TR', 2),
('İstanbul''da İstiklal Caddesi''nde çalışan nostaljik araç hangisidir?', '["Tramvay","Troleybüs","Teleferik","Vapur"]'::jsonb, 0, 'sanat', 'yerel', 'TR', 2)
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
