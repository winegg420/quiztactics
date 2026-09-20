# Paket 42 — Kozmetik · Rapor

19 Eylül 2026. Her madde ayrı commit + `main`'e push. SQL/migration yok, yeni paket yok.
Ölçümler Playwright + Chromium, 390×844 ve 1280×800, açık tema. Ekran görüntüleri
`denetim/goruntuler/p42-*.png` (86 dosya; "once/sonra" olanlar karşılaştırmalı).
Her commit'te `npm run build` temiz ("eski iPhone'larda ayrıştırma hatası yok").

**Kararını istediğim iki madde (K.2, U) ve bir not (P.2) en altta.**

---

## A. Düğme dili — `61291ef`
- `oyun/styles/tema.css:8111` blok: birincil turuncu · ikincil beyaz + turuncu kenar · tehlike beyaz + kırmızı kenar (dolu kırmızı yalnız onay penceresinde).
- `Home.jsx:621` turnuva şeridi "Katıl/Lobiye katıl" ikincil → ana sayfanın tek birincili "Hemen oyna".
- `FriendsPage.jsx:358` "Sil" → "Reddet"; liste "Oyna" ikincil. `ProfilePage.jsx:404` "Hesabımı sil" küçük tehlike, `:420` "Çıkış Yap" ikincil.
- Ölçüm: ana sayfa, turnuva lobisi, arkadaşlar, profil › ayarlar, meydan davet — her ekranda **tek birincil**. Görüntü: `p42-a-*`.

## B. Ana sayfa — `1ad0968`
- B.1 `tema.css:8143`: eski `:last-child:nth-child(odd)` kuralı Düello'yu saymadığı için Hatalarım tam genişliğe çıkıp Turnuva tek kalıyordu. Artık Düello tam genişlik + 2×2. Ölçüm: 390'da dört kart 178×116, 1280'de 293×116 — hepsi eşit.
- B.2 `Home.jsx:745`: "Haftalık lig bitimine…" başıboş satırı başlıklı **"Lig"** şeridi oldu (44 px, Lig sekmesine gider, metin #4F6680 beyazda ≈6:1). `p42-b-*`.

## C. Mod seçim penceresi — `8cfbaa1`
- C.1 `ModSecimPenceresi.jsx:53`: açan düğme klavye odağındaysa ilk karta, değilse pencerenin kendisine (halkasız) odak. Ölçüm: fareyle açınca yalnız farenin üstündeki kart turuncu, halka yok; klavyeyle açınca ilk kartta `:focus-visible` halka.
- C.2 `Modal.jsx:55`: **bütün alttan açılan pencerelerde** (mod seçimi, rakip kategorisi, joker satın al) tutamaçtan/üst 56 px'ten aşağı sürükleme — %25'i (en çok 120 px) geçince kapanır, geçmezse yerine döner. Dönüşüm panelde, sabit katmanda değil (iOS kuralı). Ölçüm: 220 px sürükleme kapattı, 40 px geri döndü.
- C.3 `tema.css:8167`: ≥700 px'te alt boşluk 24 px + dört köşe yuvarlak (ölçüm: alt boşluk 40 px). `p42-c-*`.

## D. Rakip arama ve maç — `3aedc89`
- D.1 `KarsilasmaSahnesi.jsx:35` + `RakipAra.jsx` + `DuelloPage.jsx`: boş rakip kartı başlıkla aynı durumu söyler ("Hazırlanıyor…", "Rakip bulunamadı", "Botunu seç").
- D.2 `tema.css:8183`: "+10" koyu altın (#8A6A00) + beyaz hale + gölge. `p42-d-puan-ucus-*`.
- D.3: fiyat rozeti alt ortada köşeli etiket (coin ikonlu), adet rozeti sağ üstte yuvarlak. `p42-d-joker-rozet-*`.
- D.4 `MatchPage.jsx:715`, `GroupMatchPage.jsx:433,448`: herkes için tek dil **hazır / hazır değil** (hazır yeşil ✓); "Beklenen:" listesi kendisini "Sen" diye sayar. Ölçüm: Klasik "hazır değil | hazır | 1/2 hazır · Beklenen: Sen"; Grup "… 2/4 hazır · Beklenen: Sen, Ayşe".

## E. Maç sonu — `3944786`
- E.1 `tema.css:8206`: eylem çubuğu **135 → 113 px** (düğme 50→44, iç boşluk 12→8); `MacSonuSahnesi.jsx:359` Detay açılınca başa kayar — üç satır + toplam görünür.
- E.2: masaüstünde çubuk zemini sekme çubuğu genişliğinde (620 px); kaydırma sonunda son kart çubuktan 16 px yukarıda (ölçüm: kart alt 569, çubuk üst 585).
- E.3 `MacSonuSahnesi.jsx:130`: tamamlanmış görevde "Ödülünü ana sayfadaki Günlük Görevler'den al".
- E.4 `MacSonuSahnesi.jsx:270`: sahne sekme çubuğuna kadar uzar, çubuk en alta iner. Ölçüm: Düello 390'da çubuğun altındaki boşluk **219 → 68 px** (yalnız sekme çubuğu). Ortak bileşen — Klasik, Düello, Turnuva, Grup aynı. `p42-e-*-once/sonra`.

## F. Düello — `d6f52d6`
- `DuelloPage.jsx:691`: kural ilk turda tam; sonra tek satır "Kırmızı çerçeve: riskli kategori · **Detay**" (44 px, açılır). `p42-f-*`.

## G. Grup maçı — `b72e338`
- G.1 `GroupMatchPage.jsx:374`: "Sen ve Ayşe henüz kabul etmediniz." / "Sen henüz kabul etmedin."
- G.2 `GroupMatchPage.jsx:632`: tepki şeridi soru kartının altına. Ölçüm 390: skor 64 → soru 306 → şerit 731. `p42-g-*`.

## H. Meydan okumalar — `8b238ba`
- H.1 `ChallengesPage.jsx`: "Oyuncular" (üstteki arkadaş listesinin puanlı tekrarı), "Bitenler", "Biten grup maçları", "Biten hızlı yarışlar" katlanır, varsayılan kapalı, başlıkta sayı. Listelerdeki 24 "Meydan oku" **ikincil**. Canlıda açık bot sayısı 4 (salt okuma ölçüldü).
- H.2 `ChallengesPage.jsx:718`: "Bota ya da bir arkadaşına meydan oku." `p42-h-*`.

## I. Arkadaşlar — `0e5f02b`
- `FriendsPage.jsx:374`: boş durumdaki ikinci paylaş düğmesi kalktı; metin alttaki kartı işaret eder. Ölçüm: sayfada tek "Davet linkini paylaş". `p42-i-*`.

## J. Mesajlar — `220a81b`
- J.1 `SohbetKutusu.jsx:321`: arkadaş değilken "İlk mesajı sen at." çizilmez.
- J.2 `SohbetKutusu.jsx:36`: gün ayırıcı — ölçüm "16 Eyl | Dün | Bugün".
- J.3 `MesajlarPage.jsx:77` Geri düğmesi; `SohbetKutusu.jsx:313` kişi adının yanında "›". `p42-j-*`.

## K. Profil kartı — `d098e26`
- K.1 `KategoriProfili.jsx:16`: RPC boş dönünce iskelet (60 px + kenarlar ≈ 90 px) sonsuza dek yer tutuyordu; artık blok çizilmez, içi boş `.kart` gizlenir (`tema.css:8273`). Ölçüm: istatistik satırından kart sonuna 30 px (yalnız kart iç boşluğu). `p42-k-*`.
- K.2 — **soru, aşağıda.**

## L. Lig — `e9f5dad`
- L.1: arkadaş sekmesi kodda oyuncunun kendisini zaten ekliyordu; denetimdeki boşluk sahte veridendi. Canlıda doğrulandı (`profiles_select` politikası `true`). Eksik olan: podyumda "sen" rozeti → `LeaderboardPage.jsx:447`. `p42-l-lig-arkadas-*`.
- L.2 `tema.css:8277`: kılıç zeminsiz, gri ikon (beyazda ≈3,7:1, ikon eşiği 3:1), 44 px; üstüne gelince/odakta turuncu. `p42-l-lig-kilic-*`.

## M. Dükkân — `e83e99e`
- M.1 `JokerDukkani.jsx:281,379`: sıra: Joker paketleri → Tek tek al → Envanter + kurallar. Ölçüm 390: "Joker paketleri" 201 px'te (ilk ekranda), envanter 1386 px'te.
- M.2 `JokerDukkani.jsx:90,273`: coin en ucuz jokere yetmiyorsa üstte "Coin'in şu an hiçbir jokere yetmiyor. **Coin kazan**". 20 coinde çıkıyor, 10.050'de çıkmıyor. `p42-m-*`.

## N. Profil — `8e16a19`
- `ProfilePage.jsx:160`: "1 · turnuva kazan, ilk kupan gelsin", "1 · maç oyna, serin başlasın" (büyük harf yok, #5A7089). `p42-n-*`.

## O. Çalışma — `746f20e`
- `CalismaPage.jsx:346`: düğme sayısı tekse 3 sütun. Ölçüm: 10/20/30 aynı satırda (390'da 117 px'lik üç sütun). `p42-o-*`.

## P. Bildirim zili — `d72716c`
- P.1 `BildirimZili.jsx:64`: okunmuş grupta "yeni" yok → "2 meydan okuma · 1 gün önce".
- P.2: alt kenarda 28 px solma (kaydırılabilir listede). "Tümünü okundu say" için not aşağıda.
- P.3 `BildirimZili.jsx:266`: başlıkta ✕, 44×44, tıklayınca kapanıyor (ölçüldü). `p42-p-*`.

## R. Gizlilik / Koşullar — `d97d377`
- R.1: 2013 çeviri anahtarı tarandı (kalın/bağlantı ile düz metin arası, uç boşluklar, yan yana iki çeviri). **Boşluk kaybı olan anahtarlar (2 tane, ikisi de `GizlilikPage.jsx:39`):**
  - `". Cihazının GPS konumunu"` → EN `"you choose yourself. We"` (… **city and country**you choose)
  - `". Bu bilgi şehir/ülke liglerinde herkese görünür."` → EN `"your device's GPS location…"` (… **don't collect**your device's)
  İkisinin EN değerine baştaki boşluk eklendi; tarama tekrar: 0 sorun.
- R.2 `oyun/components/Icindekiler.jsx` (yeni): sayfanın `<h2>` başlıklarından üretilen içindekiler, iki sütun; Gizlilik 10, Koşullar 18 bağlantı. `p42-r-*`.

## S. Giriş — `d758786`
- S.1 `src/styles.css:43`: `button, input, textarea, select { font-family: inherit; }` (eskiden yalnız `button`). Ölçüm: giriş sayfasında form öğeleri Nunito/Baloo 2, Arial yok; Profil › Ayarlar'da 23 Nunito + 9 Baloo 2. Form öğesi olan diğer dosyalar (HesapGuvence, KonumSecici, KurulumSihirbazi, ProfilAyarlari, SohbetKutusu, FriendsPage, Home, ProfilePage, TournamentPage) aynı kuraldan devralır.
- S.2 `src/pages/Login.jsx:48`: hata basılan düğmenin altında (sosyal / e-posta / misafir). Ölçüm: misafir hatası düğmenin 18 px altında, üstteki düğmeler 0 px kaydı.
- S.3 `Login.jsx:181`: **mevcut maskot Bilge** (`oyun/components/Maskot.jsx`, "selam" pozu, 88 px) logo ile slogan arasında. Yeni görsel üretilmedi. `p42-s-*`.

## T. Kontrastlar — `4f1d73f`
| Yer | Önce | Sonra | Değişiklik |
|---|---|---|---|
| Lig "↑ yükselme sınırı" (11,5 px) | 3,02 | **4,93** | `tema.css:8351` koyu yeşil `--bd-basari-metin` (düşme çizgisi 6,30) |
| Rütbe etiketi "Efsane" (11 px) | 3,59 | **4,92** | `ranks.js:7` metin karışımı %50 → %35 (bütün rütbeler koyulaştı) |
| Maç: geride kalan rakip | 3,86 (avatar harfi) | **7,57** (ad 11,91) | avatar saydamlığı 0,62 → 0,85 |
| Kilitli rozet adı (12 px) | — | **6,63** | değişiklik gerekmedi (Paket 40'tan beri ≥ 4,5) |

## iOS kontrolü
Bu makinede WebKit çalışmıyor; kontrol listesi Chromium'da 390×844'te hesaplanmış stillerle yapıldı:
ana sayfa, mod seçimi açık, zil açık, maç sonu, meydan, dükkân — **sabit öğede ya da atasında transform/filter/perspective: 0**, yatay taşma 0,
kaydırınca sekme çubuğu yerinde (alt 0 px). Sürükleme dönüşümü yalnız panelde, sabit katmanda değil. Gerçek telefonda bakılması gerekenler: alttan açılan pencereyi aşağı sürükleme (C.2) ve maç sonu çubuğu (E).

---

## Sorular — karar senin

**K.2 — Ülke bayrağı Windows'ta "TR" harfleri olarak çiziliyor.** Telefonlarda sorun yok. Seçenekler:
(a) olduğu gibi bırak; (b) bayrak emojisi yerine küçük SVG bayrak — yalnız kullanılan ülkeler için (bugün TR ağırlıklı) birkaç dosya, her yerde aynı görünür;
(c) Windows'ta emoji yerine ülke kodunu küçük bir etiket içinde göster ("TR" rozeti), diğer cihazlarda emoji. Hangisini istersin?

**U — Masaüstü düzeni.** Bugün her ekran 1280'de 600 px'lik telefon sütunu, sekme çubuğu altta ortada. Yapılabilecek olan: ≥1024 px'te alt sekme çubuğunu sol kenarda dikey bir menüye çevirmek (aynı altı sekme, ikon + ad), içerik sütununu ~720 px'e genişletmek ve bazı ekranlarda iki sütun kullanmak (ana sayfada "Seni bekleyenler" sağda; Lig'de podyum solda, liste sağda; maç ekranı telefon genişliğinde kalır). Mobil düzene dokunulmaz; iş yalnız CSS + Layout'ta bir kırılma noktasıdır, ama her ekranın 1280'de ayrıca denetlenmesi gerekir (tahminen bir paket). Yapalım mı, yoksa telefon sütunu kalsın mı?

**Not — P.2 "Tümünü okundu say":** eklemedim, çünkü zil açıldığı anda `bildirimleri_oku` bütün bildirimleri zaten okundu yapıyor (`BildirimZili.jsx › ac()`), rozet sıfırlanıyor. Düğme hiçbir şey yapmayan bir düğme olurdu. Açılınca okundu sayılması yerine elle "tümünü okundu say" istersen söyle, davranışı ona çeviririm.

**Dokunulmayanlar (paket gereği):** koyu tema, Gardırop/Meydan 3B, ekonomi/joker fiyatları, İngilizce soru bankası, "0 kişi lobide" gibi düşük sayılar.
