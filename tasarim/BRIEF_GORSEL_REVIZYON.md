# QUIZ TACTICS — GÖRSEL REVİZYON: TASARIM BELGESİ + ÖNİZLEME GÖREVİ (BULUT)

Depo: winegg420/quiztactics. Türkçe kod/yorum/commit.

## İLK ADIM — BU BELGEYİ DEPOYA KAYDET
Bu dosyanın tamamını değiştirmeden `tasarim/BRIEF_GORSEL_REVIZYON.md` olarak depoya ekle ve commit et. Bundan sonraki bütün görsel işlerde (önizleme, oyuna entegrasyon, Battle Pass içerikleri) tek doğru kaynak bu belgedir. Sonra PROJECT_CONTEXT.md, PROGRESS.md (son 15 girdi), AGENTS.md ve kurulu tasarım skill'lerini (.claude/skills: Impeccable, emil-design-eng) oku; bu işte kullan.

---

# BÖLÜM A — TASARIM BELGESİ

## A1. Bu belge neden var
Görseller haftalardır turlarca yeniden yapıldı ve çoğu beğenilmedi. Ortak sebepler:
1. Adaylar "kural tuttu, ölçüm geçti, test yeşil" diye sunuldu ama göze kötü görünüyordu. **Bu işte başarının tek ölçüsü GÖZDÜR.** "0 hata" raporu başarı sayılmaz; kanıt görseldir.
2. Adaylar tek tek, bir öncekine bakmadan üretildi → oyunda tek bir görsel dil oluşmadı.
3. Sohbet ekranında elle çizilen prototipler "hepsi berbat" bulundu. Beğenilen işlerin hepsi Claude Code'un oyunun içinde, gerçek bileşenlerle ve gerçek avatarlarla yaptığı işlerdi.
Hedef: Ida'nın önüne çıkan her aday **vitrin kalitesinde** olsun; "şunu yeniden üret" demek zorunda kalmasın.

## A2. Ida'nın görsellerle ilgili kendi tespitleri (kronolojik özet)
- Oyunun genel görüntüsü "oyun gibi değil"; animasyon, geçiş, simge — hepsi yetersiz bulundu (21 Eyl).
- **Çerçeveler albenisiz.** İnceleme sonucu: hepsi aynı yuvarlak halkanın renk/malzeme değişikliğiydi (degrade + küçük süs) — "20 çerçeve ama aslında tek şeklin 20 rengi".
- **Eski auralar:** "çerçevenin arkasına iliştirilmiş küçük görseller, hiç iyi durmuyor." İstenen: çerçevenin İÇİNDE, avatarın arkasındaki boş duvarın hareketlenmesi. → Bu, bugünkü **"Arka Plan"** kategorisi oldu ("aura" adı kullanılmıyor).
- **Satılan (elmaslı) çerçeveler hareketli olmalı:** "hiç sönmeyen yanan alevler", "çerçevenin etrafından sürekli akan yapraklar". Hareket etmeyen bir şeyi kimse satın almaz; **dükkânda da hareket etmeli.** (Bir ara mobilde animasyonlar çalışmıyordu, bilgisayarda çalışıyordu — mobilde mutlaka doğrula.)
- Premium önizleme 1. turda: elektrik çemberi beğenilmedi; ejderha zayıf; kupa/alev/buz efektleri "çok yetersiz, daha canlı olmalı".
- İsim ve lig çerçevesi "daha premium, daha altın, komple canlı bir sarı" olmalı.
- **Lig ve level çerçeveleri "berbat", "çok geride kaldı".** Satılık premium çerçeveler güzelleşince kazanılan lig çerçeveleri yanında sönük kaldı.
- **Rozetler** soluk ve birbirine benzer (101 adet). **Lig amblemleri** "antivirüs kalkanı" gibi (denetim).
- Oyunda **iki farklı coin/elmas çizimi** var; tek set olmalı.
- **Joker/skill sembolleri** "çok yetersiz, göze kötü geliyor": her jokerin kendi rengi, karakteri olmalı, bakınca anlaşılmalı.
- Dükkândaki bütün görseller **yayına çıkacak kalitede** olmalı.
- Asıl sorun: **kalite tabanı** — bütün çizimlerin aynı görsel dilde ve uyumlu olmaması.
- Baykuş maskot YOK (kaldırıldı). Yeni maskot çizilmeyecek.

## A3. HEDEF KALİTE — beğenilen, oyunda duran işler (bunlara eşit ya da üstün olunacak)
Başlamadan önce kaynak dosyalarını aç; katman sayısını, konturu, gölgeyi, ışığı ve animasyon tekniğini incele, aynı teknik seviyede çalış.
- **Profil avatarları** (31 + 27 + 8 yeni: Kristal Uzaylı, Göz Saplı Uzaylı, Savaş Robotu, Siborg, Android, Kedili Kız, Pilot, Hostes). Ida: "şu anki avatar çizimlerimizden memnunum." **Bütün stilin referansı bunlardır.**
- **Premium çerçeveler (girenler):** Sonbahar, Galaksi, Sakura; 2. tur WebGL'li Ejderha, Sönmeyen Alev, Şimşek, Kraliyet, Altın Lig. Denetim: Kraliyet ve Ejderha "çok iyi".
- **Arka Planlar (girenler):** Düşen Sonbahar Yaprakları, Yağan Kar, Yükselen Köz, Yıldızlı Gece, Kuzey Işıkları, Su Altı.
- **Elmas paketi görselleri** (5 SVG): Avuç, Kese, Sandık, Hazine, Define.
- **Işık Şeritli altın isim:** parlak sarı harf, lacivert kontur, arkada ince yarı saydam altın ışık.
- **Güneş Halkası** rakip arama ekranı (gök mavisi).
- **Şeker Q** uygulama ikonu.
- **Yön A "Şeker Kutusu"**: parlak, yuvarlak, kabarık düğmeler. Maç zemini kategoriye göre pastel.

## A4. YASAK ÖRNEKLER — bunlara benzeyen aday atılır
- Mevcut lig/level çerçeveleri (degradeli, ince, parlak 3B; ligler yalnız renkle ayrışıyor).
- Mevcut lig amblemleri ("antivirüs kalkanı").
- Mevcut 101 rozet (soluk, birbirine benzer).
- Eski auralar (çerçeveye iliştirilmiş küçük resim), eski VS kartı, elektrik çemberi, 1. tur buz/alev/kupa efektleri.
- Premium önizlemede girmeyenler: Buz Kristali (1. ve 2. tur), Altın isim plakası, yakut zemin plaka.
- "Clip-art" görünümü: tek renk düz kalkan/yıldız/daire, stok ikon hissi, tek şeklin renk varyasyonu.
- Telifli karakter veya amblem çağrışımı (Batman, Star Wars, Homelander vb. — benzeterek bile yok).

## A5. KOZMETİK KATMAN MODELİ (kararlar)
1. **Kazanılan çerçeveler** (lig, level, turnuva şampiyonu, etkinlik — Yılbaşı, Ramazan Bayramı vb.): **asla satılmaz.** Başarıyı gösterir. Kazanılan prestij, satılık premium çerçevelerden **daha az gösterişli olamaz.**
2. **Premium çerçeveler** (elmas): hareketli, temalı ("renk değil hikâye satın alınır": ejder, alev, uzay, kraliyet…). Siluet daireyi taşar (taç, boynuz, kanat, plaka).
3. **Arka Plan** (eski adıyla aura; elmas): çerçevenin içinde, avatarın arkasında hareketli sahne.
4. **Avatar**: ortada; günlük olanlar ücretsiz, kostümlüler premium olabilir.
5. **İsim efekti**: altın isim ileride Battle Pass'e geçecek.
6. **Unvan** (yeni sistem, kararlaştırıldı): isim altında kazanılan yazı ("Tarih Ustası", "Balıkesir Şampiyonu", "Sezon 1 Efsanesi").
7. **Tepkiler**: Google Noto emoji seti (herkes aynı emojiyi görsün), renkli.
8. **VS teması, zafer efekti**: oyunda kodu var ama satışta değil (VS temaları pasif). Bu pakette yok; ileride yeniden tasarlanıp Battle Pass'e girebilir.
9. **Tek oyuncu kartı** (kararlaştırıldı, öncelikli): avatar + çerçeve + arka plan + isim + unvan + vitrin rozetleri + lig amblemi + level **bir arada, her yerde aynı kart.**
10. **Koleksiyon Puanı** (öneri, karar bekliyor): sahip olunan rozet/ödüllerin nadirliğe göre ağırlıklı toplamı; oyuncu kartında ve profilde.

## A6. STİL REHBERİ (onaylandı — bütün oyuna uygulanacak)
- Referans: avatarların çizim dili.
- Kalın **koyu lacivert kontur** (avatarlarla aynı kalınlık oranı), düz renk dolgu + **2–3 ton hücre gölgesi**, ışık **sol üstten**, **tek beyaz parlama vuruşu**. Fotogerçekçi degrade ve 3B plastik parlaklık yok.
- Metaller (bronz, gümüş, altın, elmas) stilize: her metal kendi 3 tonlu paletiyle. Altın = **canlı sarı** (Işık Şeritli altın isim tonu), soluk hardal değil.
- Ortak palet tek dosyada; her yeni çizim bu paletten.
- Oyunda örnekli bir **stil rehberi sayfası** olacak; her yeni çizim ona bakılarak yapılır; kurala uymayan eski çizimler yeniden çizilir ya da hizalanır.

## A7. NADİRLİK DİLİ (onaylandı)
Renk eşyanın kendisine değil **kartının kenarına ve etiketine** konur:
Sıradan **gri** · Nadir **mavi** + köşede "NADİR" · Epik **mor** + hafif parıltı + "EPİK" · Efsanevi **altın** + kenarda dolaşan ışık + "EFSANEVİ".
Dükkânda, koleksiyonda, satın alma penceresinde, maç sonu ödülünde aynı dil. (Örnek: Sakura = Nadir, Ejderha = Efsanevi.)

## A8. HAREKET KURALLARI
- Premium çerçeve ve arka planlar hareketli; **dükkânda, koleksiyonda ve oyunda hareket eder; mobilde de çalışır.**
- "Hareketi azalt" açıksa durmaz, **2,5× yavaşlar**; flaş, şimşek çakması, konfeti kapanır.
- Liste ekranlarında (lig tablosu vb.) hareket durur ya da en aza iner; büyük gösterimlerde (VS, profil, maç sonu) akar.
- En gösterişli parçalar için premium çerçevelerde kullanılan WebGL yöntemi; diğerleri CSS/SVG. 60 fps; görünmeyen WebGL durur.

## A9. GERÇEK KULLANIM BOYUTLARI (her aday bu boylarda değerlendirilir)
Avatar+çerçeve: ana sayfa 64 · maç şeridi 48 · lig tablosu 40 · maç sonu 76 · profil 88 px. Rozet/amblem 20–24 px (isim yanında) ve 64 px (vitrin). Coin/elmas 16–20 px (üst çubuk, fiyat) ve 48 px (ödül). Ekran: 390×844 ve 360×640.

## A10. KALİTE KAPISI (her aday Ida'ya gösterilmeden önce)
1. **Siluet testi:** tek renk siyaha çevrilince ne olduğu ve hangi kademe olduğu anlaşılıyor mu?
2. **Küçük boy testi:** A9'daki en küçük boyda okunuyor mu, çamurlaşmıyor mu?
3. **Gri ton testi:** renksizleştirince kademeler ayrışıyor mu?
4. **Set testi:** set yan yana konunca aynı elden çıkmış gibi mi; kademe artışı (Bronz→Efsane, Lv25→Lv100) hemen fark ediliyor mu?
5. **Avatar yanında test:** 6 farklı avatarla birlikte stil uyuyor mu?
6. **Hedef kalite testi:** A3'teki referansların yanına konunca daha sönük kalıyor mu? Kalıyorsa ATILIR.
7. **Mobil test:** hareketliler telefon boyutunda gerçekten hareket ediyor mu?

## A11. ÇALIŞMA YÖNTEMİ
- Not: Önceki planda önce stil rehberi onaylanacak, sonra paket paket çizilecekti. Ida bütün adayları tek sayfada görüp tek seferde seçmek istedi; bu bilinçli bir değişiklik. Bu yüzden Bölüm 0'daki stil rehberi ve bütün adaylar AYNI dilde olmak zorunda — Ida stil rehberini beğenmezse diğer adaylar da boşa gider.
- Her grupta önce **içeride en az 4 aday** üret, hepsini A9 boylarında ekran görüntüsüyle kendin incele, A10'dan geçmeyenleri at. Ida'ya **en iyi 2–3 aday** (setlerde 2 tam set) gösterilir.
- Adaylar arasındaki fark **tasarım** (şekil, süs, kompozisyon) olsun, stil değil.
- Zayıf bulduğun ama atamadığın bir şey varsa gizleme; raporda açıkça yaz.
- **Yalnız Ida'nın "girsin" işaretlediği kalemler oyuna girer.** İşaretsiz ya da "girmesin" denen her şey girmez.
- Oyun yayında değil, gerçek oyuncu yok; mevcut görseller serbestçe değiştirilebilir.

## A12. YAPILACAKLAR ENVANTERİ
**Baştan çizilecek:** coin ve elmas ikonu (tek set, elmas paketi görselleriyle aynı aile) · lig çerçeveleri (5) · level çerçeveleri (25/50/75/100) · Turnuva Şampiyonu çerçevesi · lig amblemleri (5) · rozetler (~15 temel amblem + seviyeye göre süs sistemi; 101 rozet bu sistemle yeniden) · logo (Şeker Q ailesinde).
**Hizalanacak (baştan değil):** joker/skill ikonları (daha önce kendi renk ve karakterleriyle yenilendi; yalnız stil rehberine uydurulur) · premium çerçeveler (Kraliyet ve Ejderha'nın karakteri korunur; Sönmeyen Alev'in pikselli kenarı düzelir) · 6 arka plan (küçük boyda okunurluk).
**Dokunulmayacak:** avatarlar (referans) · elmas paketi görselleri · Işık Şeritli altın isim.
**Yeni:** tek oyuncu kartı · unvan görünümü · nadirlik kart kenarı · stil rehberi sayfası.

---

# BÖLÜM B — BU GÖREV: TEK ÖNİZLEME SAYFASI

Oyundaki görsellere, dükkâna ve veritabanına DOKUNMA; migration yok. Adaylar ayrı klasörde; oyuna bağlanmıyor. Seçimden sonra ayrı pakette oyuna girecek.

## B1. Sayfa: `/gorsel-revizyon`
Giriş yapmış kullanıcıya açık, menüde yok. Her grupta adaylar büyük boy + GERÇEK kullanım yerinde (oyunun gerçek bileşenleriyle, gerçek avatarlarla) gösterilir; her adayın altında: "Seç", kısa not alanı ve hangi kalite kapısı testlerini geçtiği.

0. **Stil rehberi:** kurallar + palet + 6 avatar yanında yeni dilde coin, elmas, bir lig çerçevesi, bir rozet. "Bu dil tamam / düzeltme notu".
1. **Coin ikonu:** 2–3 aday; üst çubukta, dükkân fiyatında, maç sonu ödülünde.
2. **Elmas ikonu:** 2–3 aday; aynı yerlerde; coin ile bir çift gibi dursun.
3. **Nadirlik kart kenarı:** 2 stil × 4 nadirlik, gerçek dükkân ve koleksiyon kartlarında.
4. **Tek oyuncu kartı:** 2 aday; profil kartında, VS ekranında, lig tablosu satırında. Uzun isim, "Afyonkarahisar Şampiyonu" unvanı, premium çerçeve + altın isim birlikte → 360 px'te taşma yok.
5. **Unvan görünümü:** 2 yazı stili + ~20 örnek unvan listesi (başarı, lig, sezon, şehir şampiyonu türleri). Ida listeyi de onaylayacak.
6. **Lig çerçeveleri:** 2 tam set (Bronz→Efsane). Setlerden biri, Ida'nın daha önce onayladığı WebGL'li **Altın Lig** çerçevesinin dilinden türetilsin (Altın Lig o setin Altın'ı olur, diğer ligler onunla aynı aileden); diğer set ondan farklı bir yorum olsun. Ligler ŞEKİL ve SÜSLE ayrışsın (kademeli kanat, taç, kristal, alev vb.). Efsane, en gösterişli premium çerçeve kadar etkileyici; üst ligler hareketli.
7. **Level çerçeveleri:** 2 tam set (25/50/75/100); kalın; lig çerçeveleriyle karışmasın.
8. **Turnuva Şampiyonu çerçevesi:** 2 aday; kupa/defne kimliği; Altın Lig'e benzemesin.
9. **Lig amblemleri:** 2 tam set; 20 px'te de hangi lig olduğu anlaşılsın.
10. **Rozet sistemi:** 2 stil; her stilde 3 örnek rozet (galibiyet, kategori ustalığı, seri) × 4 seviye. Temel amblem + seviyeye göre eklenen süs; kurallı olsun ki ~100 rozet bu sistemle üretilebilsin.
11. **Joker/skill ikonları:** yeni set üretme; mevcut ikonların stil rehberine uydurulmuş hâli önce/sonra, her biri için "Girsin / Girmesin".
12. **Logo:** 2–3 aday, Şeker Q ailesinde; giriş ekranında ve üst çubukta.
13. **Premium çerçeve + arka plan hizalaması:** mevcut 8 premium çerçeve (Altın Lig hariç, o madde 6'da ele alınıyor; kalan 7) ve 6 arka plan, önce/sonra yan yana; her biri için "Girsin / Girmesin".

## B2. Seçim kaydı
Seçimler sayfada işaretlensin (localStorage). En altta **"Seçimlerimi kopyala"**: bütün seçimleri, Girsin/Girmesin kararlarını ve notları tek düz metin olarak panoya kopyalar.

## B3. Teknik kurallar
- Sayfa ayrı parça olarak yüklensin; ana paket boyutu artmasın. `npm run build` temiz.
- 390×844 ve 360×640'ta taşma yok; 60 fps; görünmeyen WebGL durur; "hareketi azalt" A8'e göre.
- Yeni npm paketi yok; SVG + CSS, gerekiyorsa mevcut WebGL yöntemi.
- İki ajan kullanılabilir (A: 0, 1, 2, 3, 9, 10, 11, 12 — B: 4, 5, 6, 7, 8, 13). Önce ikisi birlikte A6'daki ortak paleti sabitler; sonra ayrı dosyalarda çalışırlar.
- Ekran görüntüsünü içerideki eleme ve son kontrol için al; gereksiz tekrar alma (kredi sınırlı).
- Push et.

## B4. Teslim (kısa, Türkçe)
Sayfa adresi · her bölümde içeride kaç aday üretildi, kaçı gösterildi · elenenlerin kısa sebebi · zayıf bulduğun ama gösterdiğin bir şey varsa açıkça yaz · mobilde hareketlerin çalıştığının doğrulaması.
