-- ============================================================
-- 845 — soru_parti_kolay_02d (stil: docs/SORU_STIL_PROFILI.md): 71 soru · 2026-10-01
--
-- Kategori: genel_kultur 24 · muzik 6 · sanat 5 · sinema 18 · spor 7 · tarih 4 · teknoloji 7
-- Yerel (kapsam='yerel', ulke='TR'): 17 · zorluk 1–5: 0/71/0/0/0
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
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti 5 --no 845 --klasor kolay-02d --ad soru_parti_kolay_02d --cevirisiz
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
('Lacoste''un logosunda hangi hayvan yer alır?', '["Timsah","Aslan","Kartal","Kaplan"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Fotoğrafçıların kullandığı, üç ayaklı sabitleyiciye ne ad verilir?', '["Tripod","Zoom","Flaş","Obje"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Barbie''nin yaratıcısı Mattel hangi ülkenin oyuncak şirketidir?', '["ABD","Japonya","Almanya","Danimarka"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Audi''nin logosunda kaç halka vardır?', '["4","3","5","6"]'::jsonb, 0, 'sanat', 'global', null, 2),
('Mısır''da firavunların gömüldüğü ünlü vadi hangisidir?', '["Krallar Vadisi","Ölüm Vadisi","Nil Vadisi","Gece Vadisi"]'::jsonb, 0, 'sanat', 'global', null, 2),
('''Toxic'' şarkısı hangi sanatçıya aittir?', '["Britney Spears","Christina Aguilera","Beyoncé","Rihanna"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Jailhouse Rock'' ve ''Hound Dog'' şarkıları hangi sanatçıya aittir?', '["Elvis Presley","Chuck Berry","Buddy Holly","Johnny Cash"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Mozart''ın doğduğu ülke neresidir?', '["Avusturya","Almanya","İtalya","Macaristan"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''My Heart Will Go On'' şarkısı hangi filmin ana temasıdır?', '["Titanic","Avatar","Gladyatör","Matrix"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''I''ll Make a Man Out of You'' şarkısı hangi Disney filminde yer alır?', '["Mulan","Tarzan","Aladdin","Pinokyo"]'::jsonb, 0, 'muzik', 'global', null, 2),
('''Hakuna Matata'' şarkısı hangi hayvanlar tarafından söylenir?', '["Timon ve Pumbaa","Simba ve Nala","Zazu ve Rafiki","Scar ve Mufasa"]'::jsonb, 0, 'muzik', 'global', null, 2),
('Samsung hangi ülkenin teknoloji şirketidir?', '["Güney Kore","Kuzey Kore","Hong Kong","Yeni Zelanda"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('WhatsApp hangi şirkete aittir?', '["Meta","Google","Apple","Microsoft"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Sony hangi ülkenin teknoloji şirketidir?', '["Japonya","Güney Kore","ABD","Çin"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Huawei hangi ülkenin teknoloji şirketidir?', '["Çin","Japonya","Hindistan","Tayvan"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Bilgisayarda dosyaların bulunduğu kutu simgesine ne denir?', '["Klasör","Pencere","Kısayol","Menü"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('''Just Do It'' sloganı hangi markaya aittir?', '["Nike","Adidas","Puma","Reebok"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('Pokémon''lar hangi ülkeden çıkmıştır?', '["Japonya","ABD","Çin","Güney Kore"]'::jsonb, 0, 'teknoloji', 'global', null, 2),
('BMW hangi ülkenin otomobil markasıdır?', '["Almanya","İtalya","Fransa","Japonya"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Toyota hangi ülkenin otomobil markasıdır?', '["Japonya","Güney Kore","Çin","Almanya"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Ferrari hangi ülkenin otomobil markasıdır?', '["İtalya","Fransa","Almanya","İngiltere"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Gucci hangi ülkenin lüks moda markasıdır?', '["İtalya","Fransa","İspanya","İngiltere"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Coca-Cola hangi ülkede doğmuş bir içecek markasıdır?', '["ABD","İngiltere","Fransa","Meksika"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Halloween''da çocuklar kapıları çalarak ne ister?', '["Şeker","Para","Oyuncak","Yemek"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('''Think Different'' sloganı hangi şirkete aittir?', '["Apple","Microsoft","Google","IBM"]'::jsonb, 0, 'genel_kultur', 'global', null, 2),
('Emma Watson hangi Harry Potter karakterini canlandırmıştır?', '["Hermione","Luna","Ginny","Bellatrix"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Tom Cruise''un ''Görevimiz Tehlike'' serisindeki karakterinin adı nedir?', '["Ethan Hunt","Jason Bourne","James Bond","John Wick"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Chris Hemsworth hangi Marvel karakterini canlandırmıştır?', '["Thor","Hulk","Iron Man","Kaptan Amerika"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Aladdin''in kötü vezirinin adı nedir?', '["Jafar","Scar","Hades","Gaston"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Robert Downey Jr. hangi Marvel karakterini canlandırmıştır?', '["Iron Man","Thor","Hulk","Kaptan Amerika"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Chris Evans hangi Marvel karakterini canlandırmıştır?', '["Kaptan Amerika","Kara Panter","Örümcek Adam","Doktor Strange"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Gal Gadot hangi süper kahramanı canlandırmıştır?', '["Wonder Woman","Süper Kız","Kedi Kadın","Batgirl"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Daniel Radcliffe hangi karakteri canlandırmıştır?', '["Harry Potter","Ron Weasley","Frodo","Percy Jackson"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Harrison Ford hangi karakteri canlandırmıştır?', '["Indiana Jones","James Bond","Jack Sparrow","Batman"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Hercules'' filminde ölüler diyarının tanrısı kimdir?', '["Hades","Zeus","Ares","Poseidon"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Sylvester Stallone hangi boks karakteriyle ünlenmiştir?', '["Rocky","Rambo","Terminatör","Predator"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Moana'' filminde Moana''nın yanındaki komik horozun adı nedir?', '["Heihei","Pua","Maui","Tamatoa"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Karlar Ülkesi''ndeki geyiğin adı nedir?', '["Sven","Olaf","Kristoff","Marshmallow"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Şimşek McQueen hangi renktedir?', '["Kırmızı","Mavi","Sarı","Yeşil"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Daniel Craig hangi karakteri canlandırmıştır?', '["James Bond","Sherlock Holmes","Indiana Jones","Jason Bourne"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Madagaskar'' filminde aslanın adı nedir?', '["Alex","Marty","Gloria","Melman"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Karlar Ülkesi''nde Anna''nın aşık olduğu ilk prensin adı nedir?', '["Hans","Kristoff","Olaf","Sven"]'::jsonb, 0, 'sinema', 'global', null, 2),
('''Güzel ve Çirkin'' filmindeki prensin lanetli hâline ne denir?', '["Canavar","Dev","Ejderha","Kurt"]'::jsonb, 0, 'sinema', 'global', null, 2),
('Los Angeles Lakers hangi spor dalının takımıdır?', '["Basketbol","Beyzbol","Hokey","Amerikan futbolu"]'::jsonb, 0, 'spor', 'global', null, 2),
('Serena Williams hangi sporla anılır?', '["Tenis","Golf","Basketbol","Voleybol"]'::jsonb, 0, 'spor', 'global', null, 2),
('Juventus hangi ülkenin futbol kulübüdür?', '["İtalya","İspanya","Fransa","Portekiz"]'::jsonb, 0, 'spor', 'global', null, 2),
('Michael Phelps hangi sporda olimpiyat şampiyonudur?', '["Yüzme","Atletizm","Jimnastik","Dalış"]'::jsonb, 0, 'spor', 'global', null, 2),
('Neymar hangi ülkelidir?', '["Brezilya","Arjantin","Portekiz","Uruguay"]'::jsonb, 0, 'spor', 'global', null, 2),
('Roland Garros turnuvası hangi sporda düzenlenir?', '["Tenis","Golf","Atletizm","Bisiklet"]'::jsonb, 0, 'spor', 'global', null, 2),
('Zinedine Zidane hangi ülkenin futbolcusudur?', '["Fransa","İtalya","İspanya","Cezayir"]'::jsonb, 0, 'spor', 'global', null, 2),
('Fransız Devrimi hangi ülkede olmuştur?', '["Fransa","İngiltere","Almanya","İtalya"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Matbaayı icat eden Gutenberg hangi ülkelidir?', '["Almanya","Fransa","İtalya","İngiltere"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Eski Yunan''da ilk olimpiyat oyunlarının yapıldığı yer neresidir?', '["Olimpiya","Atina","Sparta","Delfi"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Julius Caesar hangi imparatorluğun lideriydi?', '["Roma","Yunan","Bizans","Pers"]'::jsonb, 0, 'tarih', 'global', null, 2),
('Yoğurt, su ve tuzla yapılan geleneksel Türk içeceği hangisidir?', '["Ayran","Şalgam","Boza","Salep"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('Gençlik ve Spor Bayramı hangi tarihte kutlanır?', '["19 Mayıs","23 Nisan","30 Ağustos","29 Ekim"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('Türkiye''de trafik ışığında ''geç'' anlamına gelen renk hangisidir?', '["Yeşil","Kırmızı","Mavi","Sarı"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('''Rüzgâr eken ...'' atasözünün devamı nedir?', '["fırtına biçer","yağmur biçer","buğday biçer","meyve biçer"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('''Acele işe ...'' atasözünün devamı nedir?', '["şeytan karışır","bereket gelir","uğur gelir","sabır karışır"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('''Gülü seven ...'' atasözünün devamı nedir?', '["dikenine katlanır","rengine bakar","kokusunu sever","bahçesini sular"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('''Tatlı dil ...'' atasözünün devamı nedir?', '["yılanı deliğinden çıkarır","arıyı kovandan çıkarır","kuşu kafesten çıkarır","balığı sudan çıkarır"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('''Ağaç yaşken ...'' atasözünün devamı nedir?', '["eğilir","uzar","kurur","büyür"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('''Sakla samanı ...'' atasözünün devamı nedir?', '["gelir zamanı","biter zamanı","kalır zamanı","geçer zamanı"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('''Su akar ...'' atasözünün devamı nedir?', '["yolunu bulur","geri döner","sonsuza dek durur","dağa çıkar"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('''Ateş düştüğü yeri ...'' atasözünün devamı nedir?', '["yakar","söndürür","ısıtır","kurutur"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('''Sütten ağzı yanan ...'' atasözünün devamı nedir?', '["yoğurdu üfleyerek yer","çorbayı soğutarak yer","çayı ılıtarak içer","suyu bekleyerek içer"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('Yufka, ceviz ve şerbetle yapılan tatlı hangisidir?', '["Baklava","Kadayıf","Sütlaç","Revani"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('Üzerinde kıyma ve baharat bulunan ince hamur yemeği hangisidir?', '["Lahmacun","Pide","Börek","Gözleme"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('Zafer Bayramı hangi tarihte kutlanır?', '["30 Ağustos","29 Ekim","19 Mayıs","23 Nisan"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('Atatürk''ü Anma Günü hangi tarihte anılır?', '["10 Kasım","29 Ekim","19 Mayıs","23 Nisan"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2),
('Çayıyla ünlü ilimiz hangisidir?', '["Rize","Trabzon","Artvin","Samsun"]'::jsonb, 0, 'genel_kultur', 'yerel', 'TR', 2)
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
