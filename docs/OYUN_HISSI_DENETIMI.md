# Oyun Hissi Denetimi — 1 Ekim 2026

> Not: ortak önek `qt-oyk-` olarak kuruldu (rapordaki `qt-ok-` değil).

Salt okunur denetim; kod değişmedi. Referans: Görevler sayfasının yeni hâli (commit `48c9414a`).
Renk değişikliği (`8fe8d31a`: Turnuva sarı, Düello kan kırmızısı) ekranlarda yeni hâliyle görüldü.

**Yöntem:** altı sayfanın kodu ve stilleri okundu; canlı sitede (quiztactics.vercel.app) 390 × 844 telefon
ölçüsünde, yeni bir misafir hesapla 12 ekran ölçüldü ve görüntüsü alındı. Misafir hesabın arkadaşı, rozeti,
alınabilir görevi yok; o yüzden "dolu" hâller koddan, "boş" hâller ekrandan değerlendirildi.

---

## 1. Kısa sonuç

1. **Asıl fark hareket değil, yüzey.** Görevler'de ilk ekranın %12'si düz beyaz; Lig'de %65, Dükkân'da
   %53–59, Profil ve Arkadaşlar'da %47. "Uygulama gibi" hissinin kaynağı bu: konturu olmayan, soluk dudaklı
   büyük beyaz kartlar. Görevler (ve Sezon Yolu, Düello tahtası) 3 px lacivert konturlu, renk şeritli, kabartmalı
   kart kullanıyor; diğer sayfalar eski "yumuşak beyaz kart" dilinde kaldı. **Oyunda iki ayrı kart dili var.**
2. **İçerik girişi yalnız Görevler'de var.** Diğer bütün sayfalarda tek hareket kabuğun 280 ms'lik sayfa girişi
   (`qt-page-in`) ve yükleme iskeleti. Kartlar, satırlar, podyum bir anda beliriyor.
3. **Ödül anı yalnız Görevler'de kutlanıyor.** Dükkânda satın alma = bir ses + üstte yazı şeridi. Lig'de
   yükselme bölgesine girmek, Profil'de rozet/level, Arkadaşlar'da kabul — hiçbirinde an yok.
4. **Dokunma geri bildirimi düğmelerde iyi, satırlarda zayıf.** `QtDugme`, `QtKart--tiklanir`, `QtCip`,
   `QtModKart` basınca çöküyor (120 ms). Liste satırları (`qt-satir--tiklanir`, Lig satırı) yalnız renk
   değiştiriyor. Dokunuş sesi (`sesDokunus`) ve titreşim maç dışında yalnız Görevler'de.
5. **Modlar ve Meydan Okumalar görsel olarak zaten "oyun".** Modlar'da ilk ekranın %55'i renkli mod kartı.
   Bu ikisinde eksik olan hareket ve (Meydan'da) sadelik.

### Ölçüm tablosu (390 × 844, canlı, ilk ekran)

| Ekran | Düz beyaz yüzey | İçerik girişi | Sürekli hareket | Dokunulabilir öğe | Metin parçası | Yazı boyu çeşidi | Sayfa boyu (ekran) |
|---|---|---|---|---|---|---|---|
| **Görevler (referans)** | **%12** | kart + çubuk dolması | 0 (alınabilir yokken) | 1 | 35 | 5 | 1,3 |
| Lig | %65 | yok | 0 | 16 | 43 | 9 | 1,1 |
| Dükkân › Joker | %53 | yok | 0 | 14 | 39 | 7 | 3,4 |
| Dükkân › Avatar | %59 | yok | 0 | 15 | 23 | 8 | 5,0 |
| Dükkân › Arka Plan | %38 | yok | 90 (önizlemelerin kendi döngüsü) | 10 | 24 | 9 | 1,4 |
| Dükkân › Elmas | %45 | yok | 4 (paket parıltısı) | 8 | 25 | 6 | 2,0 |
| Profil | %47 (+%28 koyu kimlik kartı) | yok | 0 | 5 | 32 | 8 | 2,9 |
| Profil › Koleksiyon | %49 | yok | 0 | 5 | 37 | 9 | 8,6 |
| Profil › Rozetler | %42 | yok | 0 | 5 | 37 | 9 | 8,9 |
| Arkadaşlar | %47 | yok | 0 | 3 | 17 | 7 | 1,4 |
| Meydan Okumalar | %24 | yok | 0 | 18 | **79** | 7 | 1,9 |
| Modlar | %17 (renkli %55) | yok | 0 | 7 | 20 | 7 | 1,4 |

"Metin parçası" ve "dokunulabilir öğe" karışıklık göstergesidir: Meydan Okumalar ilk ekranda 79 ayrı yazı
ve 18 dokunulabilir öğe taşıyor — sitenin en kalabalık ekranı.

---

## 2. Görevler'de ne kullanılmış (referansın dökümü)

Dosyalar: `oyun/pages/GorevlerPage.jsx`, `oyun/pages/gorevler.css`.

**Hazır ortak parçalardan kullandıkları**

| Parça | Nereden | Ne için |
|---|---|---|
| `Konfeti` | `oyun/components/Konfeti.jsx` | sandık açılınca 28 parça |
| `titresim("dogru" / "kirilma")` | `oyun/tasarim/hareket.js` | ödül / sandık anı (Efektler kapalıysa çalmaz) |
| `sesCoin`, `sesRozet`, `sesAcikMi` | `oyun/lib/ses.js` | ödül / sandık sesi |
| `qt-h-kart-gir`, `qt-h-zipla`, `qt-h-halka` | `oyun/tasarim/hareket.css` | kart girişi, ikon zıplaması, altın halka |
| `QtDugme`, `QtIkonDugme`, `QtIkon`, `QtIskelet` | `oyun/tasarim/` | düğme, geri, ikon, yükleme |
| `coinTazele`, `sezonTazele` | `oyun/lib/coin.js`, `sezonYolu.js` | üst çubuktaki coin sayarak artar |

**Sayfaya özel yazılanlar (ortaklaştırılabilir — bkz. Bölüm 5)**

| Sınıf / parça | Ne yapıyor |
|---|---|
| `--gv-sira` + `animation-delay: sira × 60ms` | sıralı kart girişi |
| `.gv-kart` (3 px kontur + sol renk şeridi + `--gv-kalinlik` alt dudak) | kart ağırlığı: kolay 3 px, orta 4, zor/haftalık 5, sandık 6, alınmış 2 |
| `.gv-kart--alinabilir::after` + `gv-nabiz` | alınabilir kartta turuncu nabız halkası (yalnız opaklık) |
| `gv-hop` | "Al" düğmesinin ara ara zıplaması |
| `.gv-isilti` + `gv-isilti` / `gv-isilti-dongu` | ödülde bir kez, açılabilir sandıkta ara ara parıltı bandı |
| `.gv-ucan` + `gv-uc` (bileşen `Ucan`) | "+15 coin" uçan çip, 2,2 sn |
| `.gv-bar` + `gv-bar-dol` + `gv-kayma` | çubuk dolarak gelir, dolu kısımda parıltı kayar |
| `.gv-ozet` | "Günlük a/3 · Haftalık b/3" özet şerit + alınabilir sayısı çipi |
| `.gv-cip--acil` + `gv-tik-tak` | 1 saatten az kalınca kehribar çip, saat ikonu sallanır |
| `.gv-noktalar` | sandık x/3 nokta ilerlemesi |
| `.gv-sandik .m1-konfeti` kuralları | `m1-mac.css`'teki konfeti stilinin bu sayfaya **kopyası** |
| `odulTitresimi()` | "Efektler açıksa titret" sarmalayıcısı |

### Görevler'in yeni hâlinde kalan eksikler

| # | Eksik | Öneri | Büyüklük |
|---|---|---|---|
| G1 | Başlık hâlâ "geri oku + Görevler" yazısı; afiş yok. | Ortak sayfa afişi (Bölüm 5 › P1): ikon diski + başlık + özet şerit tek blokta. | küçük |
| G2 | Hepsi alınınca sayfa sessizce yeşile dönüyor; "bugünlük tamam" anı yok. | Günlük 3/3 alınınca özet şeritte kısa "Bugünlük tamam" hâli (tek seferlik parıltı). | küçük |
| G3 | Konfeti stili `m1-mac.css`'ten kopyalanmış. | `Konfeti.jsx` kendi stilini taşısın; kopya silinsin (P4). | küçük |
| G4 | İki ayrı titreşim yardımcısı var: `hareket.js › titresim` (hareket azaltmaya ve "sayfaya dokunuldu mu"ya bakmaz) ve `geriBildirim.js › titret` (bakar). Görevler birincisini kullanıyor. | Tek kapı (P3). | küçük |
| G5 | Alınabilir 3–4 kart aynı anda olursa: her kartta nabız + zıplama + çubukta kayan parıltı aynı anda döner. | Kayan parıltıyı yalnız alınabilir kartta bırak; nabız yalnız **ilk** alınabilir kartta. (Sadelik çatışması — Bölüm 7.) | küçük |
| G6 | Uçan çip kartın içinde kalıyor; üst çubuktaki coin ile bağ yalnız sayının sayarak artması. | Coin hapına ödül anında tek `qt-h-zipla`. | küçük |

---

## 3. Sayfa sayfa denetim

### 3.1 Lig (`/siralama`)

Dosyalar: `oyun/pages/LeaderboardPage.jsx`, `oyun/pages/lig-a.css`.

**Görevler'e göre eksik**
- **Giriş animasyonu:** yok. Pankart, podyum ve 25 satır bir anda geliyor. `lig-a.css`'te tek `animation` satırı yok.
- **İlerleme hissi:** pankarttaki "yükselme hattına yakınlık" çubuğu dolarak gelmiyor, parıltısı yok. Puanlar
  `SayanSayi` ile yalnız değişince sayıyor; ilk açılışta sabit.
- **Ödül hissi:** haftalık ödüller (coin + elmas) yalnız ⓘ penceresinde düz madde listesi. Sayfada "1. olursan
  ne kazanırsın" görünmüyor. Yükselme bölgesine girmek yalnız yeşil rozet metni.
- **Dokunma:** satıra basınca yalnız zemin rengi değişiyor; podyum kartı çöküyor (iyi). Kılıç düğmesi küçülüyor. Ses/titreşim yok.
- **Kart ağırlığı:** ilk ekranın %65'i düz beyaz — en "uygulama" görünen sayfa. Pankart beyaz kart + üstte ince
  lig rengi şerit; lig rengi neredeyse görünmüyor. Kendi satırım yalnız soluk mor zemin.
- **Başlık/afiş:** pankart var ama içi 6 satır yazı (lig adı, süre, sıra, rozet, çubuk etiketi, çubuk notu, kural cümlesi).
- **Canlılık:** amblem `hareketli` çiziliyor ama sayfada dönen tek CSS animasyonu yok.

**Öneri**
1. Pankart lig renginde dolu zemin + 3 px kontur + kabartma olsun (Bronz/Gümüş/Altın/Elmas/Efsane token'ları zaten var:
   `--qt-lig-*`). Beyaz kart değil, "lig bayrağı".
2. Pankart metnini 3 satıra indir: lig adı + süre · büyük sıra + bölge rozeti · çubuk. "İlk 5 yükselir" cümlesi ⓘ'de kalsın.
3. Pankarta **ödül şeridi**: "1. → coin + elmas" üç küçük çip (`gv-cip` kalıbı; sayılar `oyun_ayarlari`'ndan, şimdi ⓘ'de okunuyor).
4. Podyum + satırlara sıralı giriş (en çok ilk 8 satır; kalanlar gecikmesiz).
5. Kendi satırım: turuncu kontur + alınabilir nabzının sakin hâli (yalnız sayfa açılışında 2 tur).
6. Yükselme/düşme çizgisi: ok ikonuna tek seferlik `qt-h-zipla`.
7. Çubuk `gv-bar-dol` gibi dolarak gelsin.

**Büyüklük:** orta. **Hazır parça:** `qt-h-kart-gir`, `qt-h-zipla`, `SayanSayi`, Görevler'in kart/çip/çubuk/nabız sınıfları (ortaklaşınca).

---

### 3.2 Dükkân (`/joker`) — Joker Dükkânı + görünüm sekmeleri

"Gardırop" notu: 3B gardırop dondurulmuş (`GARDIROP_ACIK = false`, Kıyafet sekmesi gizli). Bugün gardırobun
işini Dükkân'ın görünüm sekmeleri (Çerçeve · Arka Plan · Avatar · VS Kartı · İsim Efekti · Zafer Efekti · Tepki) ve
Profil › Koleksiyon görüyor; ikisi de bu başlıkta ve 3.3'te denetlendi.

Dosyalar: `oyun/pages/JokerDukkani.jsx`, `oyun/components/DukkanKozmetik.jsx`, `DukkanAuralar.jsx`,
`JokerSatinAlModal.jsx`, `oyun/tasarim/ekranlar/dukkan-magaza.css`, `dukkan-cerceve.css`, `dukkan-kozmetik.css`.

**Görevler'e göre eksik**
- **Giriş animasyonu:** yok. Dört dükkân stil dosyasında tek `animation` satırı yok. Sekme değişince içerik bir anda değişiyor.
- **Ödül hissi (en büyük boşluk):** satın alma = `sesSatinAlma()` + üstte "Jokerler hesabına eklendi" yazı şeridi.
  Kartta hiçbir şey olmuyor; "Sende: 2" rozeti sessizce "3" oluyor. Avatar/arka plan alınca da aynı.
- **Dokunma:** düğmeler çöküyor (iyi). Joker kartının kendisi tıklanmıyor. Avatar ızgara kartlarında basış yok
  (`dukkan-kozmetik.css`'te `:active` yok); arka plan kartında var (`scale(0.97)`).
- **Kart ağırlığı:** bütün kartlar aynı beyaz, aynı boy. Nadirlik (Sıradan/Nadir/Epik/Efsanevi) yalnız küçük etiket ve
  bölüm başlığında; kartın kendisi nadirliğe göre ağırlaşmıyor — Görevler'deki zorluk şeridinin tam karşılığı burada eksik.
- **Başlık/afiş:** "Dükkân" yazısı + iki bakiye hapı. Coin bakiyesi üst çubukta da var → aynı sayı iki kez.
- **Boş alan:** Avatar sekmesinde ilk ekranın yarısı tek beyaz önizleme kartı (takılı avatar + "Takılı" düğmesi).
  Joker sekmesi 3,4 ekran, Avatar 5 ekran uzunluğunda.
- **Canlılık:** Joker/Avatar/Coin'de 0. Arka Plan'da tersi: 90 sürekli animasyon (önizlemelerin kendi döngüsü).

**Öneri**
1. **Satın alma anı (ortak P2):** kartta parıltı bandı + ikon zıplaması + altın halka + "+1" uçan çip; "Sende: n" rozeti
   `qt-h-zipla`; titreşim. Kozmetikte (avatar/arka plan/efekt) ek olarak küçük konfeti. Yazı şeridi kalsın (ekran okuyucu).
2. **Nadirlik ağırlığı:** kart konturu + alt dudak nadirlik renginde (Sıradan gri 3 px · Nadir yeşil 4 · Epik mor 5 ·
   Efsanevi altın 6 + ara ara parıltı). Görevler'in `--gv-serit / --gv-kalinlik` kalıbı aynen.
3. **Joker kartı:** 3 px kontur + sol şerit joker renginde (`--qt-skill-<tur>` zaten var). Coin yetmeyen kart soluk, alınabilen canlı.
4. **Afiş:** başlıktaki coin hapı kalksın (üst çubukta var), yalnız elmas kalsın — hem sadeleşir hem afişe yer açılır.
5. Sekme değişiminde kartlara sıralı giriş (ilk 6 kart).
6. Avatar önizleme kartı küçülsün (yatay: solda avatar, sağda ad + düğme) → ızgara ilk ekrana girsin.

**Büyüklük:** büyük (4 bileşen, 3 stil dosyası, 9 sekme). **Hazır parça:** `Konfeti`, `sesSatinAlma`, `titresim`,
`qt-h-zipla`, `qt-h-halka`, Görevler'in `Ucan` + `gv-isilti` + kart ağırlığı kalıbı, `NadirlikEtiketi`, `SkillRozeti`.

**Dikkat:** `oyun/components/DukkanKozmetik.jsx` şu an başka bir pencerede değiştirilmiş, commit edilmemiş duruyor.
Dükkân işi o commit'ten sonra başlamalı.

---

### 3.3 Profil (`/profil`)

Dosyalar: `oyun/pages/ProfilePage.jsx`, `oyun/tasarim/ekranlar/dukkan-profil.css`, `dukkan-bilesen.css`,
`oyun/components/Koleksiyon.jsx` (+ `cerceve-secici.css`), `RozetlerPaneli.jsx` (+ `rozet-panel.css`),
`KoleksiyonDokumu.jsx`, `LevelCubugu.jsx`, `UstalikIzgarasi.jsx`, `KategoriProfili.jsx`.

**Görevler'e göre eksik**
- **Giriş animasyonu:** yok. (Rozet panelinde tek hazır hareket: kazanılmış rozette bir kerelik parıltı `qt-rb-parilti`.)
- **İlerleme hissi:** XP çubuğu dolarak gelmiyor; "Level 2 için 61 XP" düz yazı. Koleksiyon çubuğu gri, düz.
  Sonraki rütbe çubuğu sayfanın en altında.
- **Ödül hissi:** rozet kazanıldığında/level atlayınca profilde iz yok (kutlama maç sonunda oluyor; profil yalnız kayıt).
- **Dokunma:** sekmeler ve düğmeler iyi. Üç sayı kartı (Puan / Şampiyonluk / Seri) tıklanmıyor, basış yok.
- **Kart ağırlığı:** koyu lacivert vitrin kartı güçlü (ilk ekranın %28'i) ama **beyaz bir kartın içine gömülü** — kart içinde kart.
  Altındaki her şey aynı beyaz. Üç sayı kartı eşit; "0 Puan" ile iki hedef cümlesi aynı ağırlıkta.
- **Boş alan:** yeni oyuncuda Koleksiyon kartı "0 rozet · 0 unvan" + gri çubuk; üç sayı kartından ikisi düz cümle.
- **Sayfa boyu:** Koleksiyon 8,6 ekran, Rozetler 8,9 ekran — çok uzun düz liste.
- **Başlık:** `h1` gizli; kimlik kartı afiş görevi görüyor (doğru tercih).

**Öneri**
1. Vitrin kartını beyaz çerçeveden çıkar: kimlik = tek koyu afiş, rütbe rozetleri ve level çubuğu afişin altına bitişik şerit.
2. Level çubuğu Görevler çubuğu gibi: dolarak gelir, dolu kısımda parıltı; levele ≤ %10 kala alınabilir nabzı.
3. Üç sayı kartı 3 px kontur + ikon diski renkli (puan mor · kupa altın · seri turuncu). Seri > 0 ise alev ikonu hafif sallansın.
4. Rozet ve koleksiyon ızgaralarına sıralı giriş (ilk ekrandaki kadar); kazanılmış rozet konturlu + renkli, kilitli soluk.
5. Koleksiyon özet çubuğu nadirlik renkleriyle dolu parçalı çubuk (şimdi gri); boşken "ilk rozetine X kaldı" hedefi.
6. Ayarlar sekmesi **dokunulmaz** — orası gerçekten ayar ekranı, sade kalmalı.

**Büyüklük:** orta (üst blok + İstatistik) · Rozetler ve Koleksiyon ızgaraları ayrı küçük iş.
**Hazır parça:** `SayanSayi`, `LevelCubugu`, `qt-rb-parilti`, `qt-h-kart-gir`, Görevler'in çubuk + kart kalıbı, `OyuncuVitrinKarti`.

---

### 3.4 Arkadaşlar (`/arkadaslar`)

Dosyalar: `oyun/pages/FriendsPage.jsx`, `oyun/tasarim/ekranlar/l-sosyal.css`, `oyun/pages/arkadasCevrimici.css`,
`oyun/components/DavetKarti.jsx` (+ `davet-karti.css`).

**Görevler'e göre eksik**
- **Giriş animasyonu:** yok. Tek hareket: bekleyen davette üç nokta (`ar-nokta`).
- **Ödül hissi:** davet kartı 300 + 100 coin vaat ediyor ama kart düz beyaz; hediye ikonu kıpırdamıyor. Arkadaşlık isteği
  kabul edilince satır sessizce listeye geçiyor. Davet kodu kopyalanınca kutlama yok.
- **Dokunma:** "Oyna", "Kabul" düğmeleri iyi. Satıra basınca yalnız zemin rengi. Çevrimiçi arkadaşta "Oyna" düğmesi
  renk değiştiriyor ama hareket yok.
- **Kart ağırlığı:** gelen istek, arkadaş, bekleyen istek, Facebook önerisi — hepsi aynı beyaz satır. Çevrimiçi arkadaş
  yalnız 10 px yeşil nokta ile ayrışıyor.
- **Boş alan (en kötü boş durum):** arkadaşı olmayan oyuncuda ilk ekranın üçte biri "Henüz arkadaşın yok" beyaz kutusu;
  asıl eylem (bağlantıyı paylaş) ekranın altında, alt menünün arkasında yarım görünüyor.
- **Başlık:** "Arkadaşlar" + iki satır açıklama + Mesajlar düğmesi — düz uygulama başlığı.
- **Sayfa yapısı:** 6 bölüm başlığı alt alta (Gelen · Arkadaşların · Bekleyen · Davet et · Facebook · Kodla ekle).

**Öneri**
1. Boş durumda sıra değişsin: **davet kartı en üstte**, "Henüz arkadaşın yok" kutusu tek satırlık nota insin.
2. Davet kartı "ödül kartı" olsun: altın zemin + 3 px kontur (Görevler sandığı kalıbı), hediye ikonu `gv-salla`,
   "Bağlantıyı paylaş" düğmesinde `gv-hop`. Kopyalayınca `sesCoin` değil kısa `sesDokunus` + çipte tik.
3. Gelen istek satırı alınabilir kart gibi (turuncu kontur + nabız); "Kabul"e basınca satır parıltıyla listeye geçsin + titreşim.
4. Çevrimiçi arkadaş satırı: yeşil sol şerit; "Oyna" düğmesinde sakin `gv-hop`. Maçta olan turuncu şerit.
5. Satırlara sıralı giriş (ilk 8).
6. "Davet koduyla ekle" bölümü katlanır olsun (nadir kullanılır) — sayfa kısalır.
7. Başlık açıklaması kalksın; afiş: başlık + arkadaş sayısı + çevrimiçi sayısı çipi + Mesajlar.

**Büyüklük:** orta. **Hazır parça:** `QtBosDurum`, Görevler'in sandık kartı/nabız/hop/salla, `sesDokunus`, `titresim`.

**Not:** `DavetKarti` Profil › Davet sekmesinde de kullanılıyor; değişiklik iki yeri birden etkiler (istenen bu).

---

### 3.5 Meydan Okumalar (`/meydan`)

Dosyalar: `oyun/pages/ChallengesPage.jsx` (1.446 satır), `oyun/tasarim/ekranlar/a-meydan.css`, `a-ortak.css`.

**Görevler'e göre eksik**
- **Giriş animasyonu:** yok (yalnız katlanır grup paneli açılırken `qt-h-gir`).
- **Dokunma:** mod kartları ve kategori kartları çöküyor (iyi). Seçim anında ses/titreşim yok; seçili kategori yalnız mor kontur.
- **Ödül/ilerleme hissi:** kategori kartlarındaki "%0 çözüldü" çubukları boşken gri şerit; dolarak gelmiyor. Gelen meydan
  okuma (en heyecanlı an) sıradan bir liste satırı gibi duruyor.
- **Kart ağırlığı:** mod kartları güçlü (turuncu / kan kırmızısı / mavi). Ama altındaki kategori şeridi, Serbest|Dereceli
  anahtarı, Antrenman, arkadaş listesi, grup paneli hepsi beyaz ve eşit. Gelen davetler doğru yerde (en üstte) ama
  hareketsiz, yalnız hafif vurgulu bir liste satırı.
- **Karışıklık (asıl sorun burada):** ilk ekranda 79 metin parçası, 18 dokunulabilir öğe. Sayfa tek akışta 5 iş yapıyor:
  mod seç → kategori seç → dereceli seç → bota meydan oku → arkadaşa meydan oku → grup kur → devam edenler → gönderdiklerin →
  bekleyenler + 3 katlanır bölüm. Bölüm başlıklarının sağındaki küçük notlar ("arkadaşına", "1v1 · grup · hızlı mod için",
  "her zaman hazır") gürültü.
- **Başlık:** "Meydan Oku" + iki satır açıklama.

**Öneri** (burada önce sadeleştir, sonra canlandır)
1. **Gelen davetler (zaten en üstte) alınabilir kart olsun:** turuncu kontur + nabız, rakibin avatarı büyük, "Kabul" zıplar.
   Kabulde titreşim + `sesRakipBulundu`.
2. Başlık açıklaması ve bölüm başlığı yan notları kalksın.
3. Sıra: Gelen → Devam eden → **Kime?** (arkadaş / bot tek şerit) → Mod → Kategori → Serbest|Dereceli. Bugün seçimler üstte,
   "kime" altta; oyuncu önce ayar yapıp sonra rakip arıyor.
4. Seçim anları: mod/kategori seçilince `sesKategoriSecildi` + `titresim("dokunus")` + seçili kartta tek `qt-h-zipla`.
5. Kategori çubukları dolarak gelsin; %0 olanlarda çubuk gizlensin (boş çubuk = gürültü).
6. Antrenman bot kartlarına sıralı giriş.

**Büyüklük:** büyük (dosya çok uzun, sıra değişimi mantığa dokunmadan yapılmalı). **Hazır parça:** `QtModKart`,
`sesKategoriSecildi`, `sesRakipBulundu`, `titresim`, `qt-h-zipla`, Görevler'in alınabilir nabzı.

---

### 3.6 Modlar (`/modlar`)

Dosyalar: `oyun/pages/ModlarPage.jsx` (133 satır), `oyun/tasarim/ekranlar/a-modlar.css`, `QtModKart` (`oyun/tasarim/oyun.jsx`).

**Durum:** altı sayfanın en "oyun" görüneni. İlk ekranın %55'i renkli mod kartı; kartlar kabartmalı, basınca çöküyor.
Yeni renkler yerinde (Düello kan kırmızısı, Turnuva sarı).

**Görevler'e göre eksik**
- **Giriş animasyonu:** yok. Dört büyük kart bir anda geliyor — en ucuz ve en çok fark edecek kazanım burada.
- **Dokunma:** basış var; ses/titreşim yok.
- **Canlılık:** ikon diskleri sabit. Turnuva lobisi açıkken ya da Düello kilitliyken kart bunu söylemiyor.
- **Kart ağırlığı:** dört kart eşit boyda. Oyunun iki ana modu (Klasik, Düello) ile Saf Bilgi/Turnuva aynı ağırlıkta.
- **Başlık:** "Tarzını seç, bilgini göster" + iki satır açıklama; ardından beyaz Serbest|Dereceli kutusu. Kartlar ekranın %30'undan başlıyor.
- **Alt bölüm:** "Arkadaşların ve sen" beyaz liste (Meydan Oku · Hatalarım · Lig) — Lig zaten alt menüde.

**Öneri**
1. Dört karta sıralı giriş (60 ms arayla) + ikon diskine giriş sonunda tek `qt-h-zipla`.
2. Karta basınca `sesDokunus` + `titresim("dokunus")`.
3. Başlık açıklaması kalksın; Serbest|Dereceli anahtarı kutusuz, başlığın hemen altında ince şerit olsun → kartlar yukarı çıkar.
4. Turnuva kartında canlı durum çipi: lobi açıksa "Lobi açık" + alınabilir nabzı; değilse sıradaki saat (`lib/zaman.js`).
5. Düello kilitliyse kartta kilit + "X maç daha" (veri `duello_acilis_benim` zaten var).
6. Alt listeden "Lig" satırı kalksın (alt menüde var).

**Büyüklük:** küçük (1–3) · orta (4–5 ile). **Hazır parça:** `QtModKart` (`kilitli`, `rozet` prop'ları hazır),
`qt-h-kart-gir`, `qt-h-zipla`, `sesDokunus`, `titresim`, `DereceliAnahtari`.

---

## 4. Sayfalar arası tekrar eden eksikler

| Eksik | Lig | Dükkân | Profil | Arkadaşlar | Meydan | Modlar |
|---|---|---|---|---|---|---|
| Sıralı içerik girişi yok | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Beyaz, kontursuz kart dili | ✗ | ✗ | ✗ | ✗ | kısmen | — |
| Ödül / başarı anı kutlanmıyor | ✗ | ✗ | ✗ | ✗ | ✗ | — |
| Dokunuşta ses + titreşim yok | ✗ | kısmen (yalnız satın alma sesi) | ✗ | ✗ | ✗ | ✗ |
| Satır basışı yalnız renk | ✗ | — | — | ✗ | ✗ | ✗ (alt liste) |
| Çubuklar dolarak gelmiyor | ✗ | — | ✗ | — | ✗ | — |
| Düz yazı başlık (afiş yok) | — | ✗ | — | ✗ | ✗ | ✗ |
| Boş durum = büyük beyaz kutu | ✗ | — | ✗ | ✗ | ✗ | — |
| "Göz buraya" işareti (nabız) yok | ✗ | ✗ | — | ✗ | ✗ | ✗ |

---

## 5. Ortak "oyun hissi" parçaları — öneri

Görevler'de yazılan kod sayfaya özel `gv-` önekiyle duruyor. Altı sayfaya aynı şeyi altı kez yazmak yerine
**önce ortaklaştır, sonra dağıt.** Yeni paket gerekmez; hepsi düz CSS + mevcut bileşenler.

| # | Parça | Nereye | İçerik | Görevler'den taşınan |
|---|---|---|---|---|
| **P1** | **Oyun kartı** sınıfları `qt-ok-*` | yeni `oyun/tasarim/oyun-hissi.css` | 3 px kontur + sol renk şeridi + kabartma; değişkenler `--ok-serit`, `--ok-dudak`, `--ok-kalinlik`; hâller `--alinabilir`, `--tamam`, `--kilitli`, `--altin`; ağırlık `--hafif / --orta / --agir`. Sayfa afişi `qt-ok-afis` (ikon diski + başlık + sağ yuva + alt şerit). | `.gv-kart*`, `.gv-ik*`, `.gv-sandik`, `.gv-ozet` |
| **P2** | **Ödül anı** bileşeni `OdulAni` + `UcanOdul` | yeni `oyun/components/OdulAni.jsx` | Tek çağrı: parıltı bandı + ikon zıplaması + altın halka + uçan çip (+ isteğe bağlı konfeti) + ses + titreşim. Kanca: `const { kutla, ucan } = useOdulAni()`. | `Ucan`, `.gv-isilti`, `.gv-kutla`, `.gv-ucan`, `goster()` zamanlayıcısı, `odulTitresimi` |
| **P3** | **Dokunuş tek kapısı** `dokunus()` / `odulHissi()` | `oyun/tasarim/hareket.js` (ekleme) | "Efektler açık mı + hareket azaltılmış mı + sayfaya dokunuldu mu" kontrolünü tek yerde yapıp `sesDokunus` + `titresim` çağırır. `geriBildirim.js › titret` ile `hareket.js › titresim` tek kurala bağlanır. | `odulTitresimi` |
| **P4** | **Konfeti kendi stiliyle** | `oyun/components/Konfeti.jsx` + `oyun/tasarim/hareket.css` | `.m1-konfeti` kuralları `m1-mac.css`'ten ortak dosyaya; Görevler'deki kopya silinir. | `.gv-sandik .m1-konfeti`, `gv-konfeti` |
| **P5** | **Sıralı giriş** `qt-h-sirali` | `oyun/tasarim/hareket.css` | `animation: qt-h-kart-gir …; animation-delay: calc(var(--sira, 0) * 60ms)`; üst sınır 8 öğe (sonrası gecikmesiz). | `--gv-sira` |
| **P6** | **Dikkat çekiciler** `qt-h-nabiz`, `qt-h-hop`, `qt-h-salla-ara`, `qt-h-isilti` | `oyun/tasarim/hareket.css` | Alınabilir nabız halkası, ara ara zıplama, ara ara sallanma, parıltı bandı. Hepsi yalnız transform/opacity. | `gv-nabiz`, `gv-hop`, `gv-salla`, `gv-isilti*` |
| **P7** | **Canlı çubuk** | `QtIlerleme` (`oyun/tasarim/temel.jsx` + `bilesenler.css`) | `canli` prop'u: dolarak gelir + dolu kısımda kayan parıltı; kontur seçeneği. | `.gv-bar`, `gv-bar-dol`, `gv-kayma` |
| **P8** | **Satır basışı** | `bilesenler.css › .qt-satir--tiklanir` | Renk değişimine ek 120 ms `scale(0.985)`. Tek satır kural, bütün listeler kazanır. | — |
| **P9** | **Boş durum küçük hâli** | `QtBosDurum` (`boyut="k"`) | Tek satır: ikon + cümle + düğme. Büyük beyaz kutu yalnız sayfanın tamamı boşken. | — |
| **P10** | **Çipler** `qt-ok-cip` | `oyun-hissi.css` | Konturlu ödül / süre / kilit çipi; `--acil` hâli. | `.gv-cip*`, `gv-tik-tak` |

**Kurallar (hepsi için):** azaltılmış harekette giriş/nabız/zıplama/konfeti kapanır, renk ve durum kalır (Görevler'deki
gibi). `position: fixed` + `transform` aynı öğede kullanılmaz; uçan çip kartın içinde `absolute`. Kırmızı = rakip/Düello;
aciliyet kehribar, zorluk mor.

**Görevler'i ortak hâle getirmek mümkün mü?** Evet. `gorevler.css`'in ~%70'i P1, P2, P5, P6, P7, P10'a taşınır;
sayfada yalnız yerleşim kuralları kalır. Bu taşıma **Aşama 0'ın parçası** olmalı: ortak parçanın doğru olduğunun kanıtı,
Görevler'in piksel piksel aynı kalmasıdır (`node araclar/gorevler-ekran.mjs` öncesi/sonrası).

---

## 6. Sıra ve pencere planı

Aynı anda birden çok pencere çalışacaksa dosyalar çakışmamalı. Aşağıdaki bölüşümde **hiçbir dosya iki pencerede yok.**

### Aşama 0 — ortak parçalar (TEK pencere, diğerleri bekler)

| | |
|---|---|
| **Model** | **Opus** (ortak API tasarımı; yanlış kurulursa altı sayfa birden etkilenir) |
| **Dosyalar** | yeni `oyun/tasarim/oyun-hissi.css`, yeni `oyun/components/OdulAni.jsx`, `oyun/tasarim/hareket.css`, `hareket.js`, `bilesenler.css`, `temel.jsx`, `index.js`, `OKU.md`, `oyun/components/Konfeti.jsx`, `oyun/tasarim/ekranlar/m1-mac.css` (yalnız konfeti kuralı), `oyun/pages/GorevlerPage.jsx`, `gorevler.css`, `oyun/tasarim/TasarimSistemiPage.jsx` (örnek) |
| **İş** | P1–P10 + Görevler'i ortak sınıflara geçir + G1–G6 |
| **Kanıt** | Görevler ekran ölçümü öncesi/sonrası aynı; `arayuz-denetim.mjs` temiz; `npm run build` |
| **Büyüklük** | orta-büyük |

### Aşama 1 — dört paralel pencere (Aşama 0 `main`'e girdikten sonra)

| Pencere | Sayfa | Dokunacağı dosyalar | Çeviri dosyası | Model | Büyüklük |
|---|---|---|---|---|---|
| **A** | Lig | `oyun/pages/LeaderboardPage.jsx`, `oyun/pages/lig-a.css` | `ceviri/lig.js` | **Sonnet** (tek dosya çifti, ağırlık stilde) | orta |
| **B** | Dükkân | `oyun/pages/JokerDukkani.jsx`, `oyun/components/DukkanKozmetik.jsx`, `DukkanAuralar.jsx`, `JokerSatinAlModal.jsx`, `ekranlar/dukkan-magaza.css`, `dukkan-cerceve.css`, `dukkan-kozmetik.css`, `satin-al-onay.css` | `ceviri/dukkan.js` | **Opus** (9 sekme, satın alma akışı, sunucu cevabına bağlı an) | büyük |
| **C** | Profil | `oyun/pages/ProfilePage.jsx`, `ekranlar/dukkan-profil.css`, `dukkan-bilesen.css`, `oyun/components/Koleksiyon.jsx`, `KoleksiyonDokumu.jsx`, `RozetlerPaneli.jsx`, `LevelCubugu.jsx`, `UstalikIzgarasi.jsx`, `KategoriProfili.jsx`, `ekranlar/cerceve-secici.css`, `rozet-panel.css`, `koleksiyon-puani.css` | `ceviri/koleksiyon.js` | **Sonnet** | orta |
| **D** | Arkadaşlar + Modlar | `oyun/pages/FriendsPage.jsx`, `ekranlar/l-sosyal.css`, `oyun/pages/arkadasCevrimici.css`, `oyun/components/DavetKarti.jsx`, `ekranlar/davet-karti.css`, `oyun/pages/ModlarPage.jsx`, `ekranlar/a-modlar.css`, `a-ortak.css` | `ceviri/ana.js` | **Sonnet** | orta |

### Aşama 2 — tek pencere

| Pencere | Sayfa | Dokunacağı dosyalar | Model | Büyüklük |
|---|---|---|---|---|
| **E** | Meydan Okumalar | `oyun/pages/ChallengesPage.jsx`, `ekranlar/a-meydan.css`, `ceviri/antrenman.js` | **Opus** (1.446 satır, bölüm sırası değişecek, davet/realtime mantığına değmeden) | büyük |

Meydan Okumalar sona kaldı çünkü (a) en riskli dosya, (b) önce sadeleştirme kararı gerekiyor (Bölüm 7 › S1),
(c) Serbest|Dereceli anahtarı ve mod kartları Modlar sayfasıyla ortak (`a-ortak.css`, `QtModKart`) — D'nin oradaki
değişikliği bittikten sonra başlaması çakışmayı önler. Karar hazırsa E, Aşama 1 ile aynı anda da başlayabilir
(dosyaları ayrı); o zaman 5 paralel pencere olur.

### Paralel pencere kuralları

- Her pencere yalnız kendi satırındaki dosyalara dokunur. Ortak dosyada (`hareket.css`, `bilesenler.css`,
  `oyun-hissi.css`, `temel.jsx`, `OdulAni.jsx`) eksik görürse **düzeltmez, not düşer**; Aşama 1 sonunda tek pencere toplar.
- Yeni metin gerekirse yalnız kendi çeviri dosyasına yazar; `oyun/lib/dil.js`'e dokunmaz.
- `PROGRESS.md` ve `PROJECT_CONTEXT.md` paralel pencerelerde **yazılmaz** (commit'ler `[progress-yok]`); dört pencere bitince
  tek pencere toplu kayıt düşer. Aksi hâlde dosya sonu dört yerden çakışır.
- Mod paritesi: bir sayfada yapılan basış/ses düzeltmesi Düello dahil bütün modlarda aynı olmalı — bu yüzden P3 ve P8 ortak
  dosyada, sayfada değil.
- Her pencere bitince: `npm run build`, `node araclar/arayuz-denetim.mjs`, 360 ve 390 px ekran görüntüsü.

**Toplam:** 1 + 4 paralel + 1 = 6 pencere işi; 3 Opus (Aşama 0, Dükkân, Meydan), 3 Sonnet (Lig, Profil, Arkadaşlar + Modlar).

**Başlamadan önce:** çalışma klasöründe commit edilmemiş üç dosya var (`oyun/components/DukkanKozmetik.jsx`,
`oyun/lib/ceviri/mac.js`, `src/BildimApp.jsx`). Sahibi pencere bunları commit etmeden B penceresi başlamamalı.

---

## 7. Sadeleştirme ile çatışma riski olan maddeler

"Oyun hissi" eklemek ile "arayüz karışık" şikâyeti aynı anda çözülmeli. Aşağıdakiler dikkatsiz yapılırsa karışıklığı artırır.

| # | Madde | Risk | Öneri |
|---|---|---|---|
| **S1** | Meydan Okumalar'a hareket eklemek | Sayfa zaten 79 metin / 18 dokunulabilir öğe. Üstüne nabız ve giriş animasyonu = daha çok gürültü. | **Önce** çıkar (açıklamalar, yan notlar, boş çubuklar, sıra), **sonra** canlandır. Ida kararı gerekir: bölüm sırası değişsin mi? |
| **S2** | Alınabilir nabzı her yere koymak | Aynı ekranda 3+ nabız = hiçbiri dikkat çekmez. | Kural: **bir ekranda en çok 1 nabız** (en önemli eylem). Görevler'de de ilk alınabilir kartla sınırla (G5). |
| **S3** | Sürekli dönen animasyonlar | Dükkân › Arka Plan'da şimdiden 90 sürekli animasyon var. Kartlara parıltı eklemek orayı yorar, pili tüketir. | Arka Plan / efekt sekmelerinde kart hareketi eklenmez; yalnız satın alma anı. Sürekli hareket bütçesi: ekran başına ≤ 3. |
| **S4** | 3 px lacivert konturu her karta vermek | Lig'de 25 satırın her biri konturlu olursa ekran çizgi yığını olur. | Kontur **kart**a, satıra değil: Lig listesi tek konturlu kutu içinde satırlar; yalnız podyum, pankart ve "ben" satırı ayrı ağırlık alır. |
| **S5** | Dokunuş sesi + titreşimi her düğmeye | Her basışta ses yorucu; titreşim Android'de rahatsız eder. | `dokunus()` yalnız **seçim ve eylem** düğmelerinde (mod kartı, satın al, kabul, al). Gezinme, sekme, geri düğmesinde yok (alt menüde zaten `sesSayfaGecis` var). |
| **S6** | Lig pankartına ödül şeridi eklemek | Pankartta zaten 6 satır yazı var. | Ekleme, **değiştirme** olmalı: kural cümlesi ve çubuk notu çıkar, ödül çipleri girer. Net satır sayısı artmamalı. |
| **S7** | Dükkân afişi | Coin iki yerde (üst çubuk + başlık). | Afiş eklerken başlıktaki coin hapını kaldır; elmas kalsın. Net öğe sayısı azalır. |
| **S8** | Profil'e hareket | Ayarlar sekmesi gerçek bir ayar ekranı. | Ayarlar sekmesine **hiç dokunma**. Oyun hissi yalnız kimlik bloğu, İstatistik, Rozetler, Koleksiyon'da. |
| **S9** | Sıralı giriş uzun listelerde | 25 satır × 60 ms = 1,5 sn bekleyen liste; hem yavaş hem dikkat dağıtır. | En çok ilk 8 öğe sıralı, toplam ≤ 480 ms; kalanlar gecikmesiz. Sekme değişiminde ve veri yenilenince **yeniden oynamaz**. |
| **S10** | Konfeti | Her satın almada konfeti değerini kaybeder. | Konfeti yalnız nadir anlarda: sandık, kozmetik satın alma, lig yükselişi. Joker satın alma = parıltı + uçan çip, konfetisiz. |
| **S11** | Kart ağırlığı ile renk sayısı | Zorluk yeşil/kehribar/mor + nadirlik yeşil/mor/altın + lig renkleri + mod renkleri aynı sayfada buluşursa renk anlamı kaybolur. | Sayfa başına tek renk ekseni: Dükkân = nadirlik, Lig = lig rengi, Görevler = zorluk. Kırmızı yalnız Düello/rakip. |
| **S12** | Modlar'da canlı durum çipleri | Dört kartın dördüne çip + nabız eklemek sade sayfayı bozar. | Yalnız **durumu olan** kart çip alır (Turnuva lobisi açık, Düello kilitli). Diğerleri bugünkü gibi. |

**Çatışmayan, hem sadeleştiren hem canlandıran maddeler (önce bunlar):** başlık açıklamalarını kaldırmak (Modlar, Meydan,
Arkadaşlar) · Dükkân başlığındaki çift coin · boş durumun küçük hâli (P9) · Avatar önizleme kartını küçültmek ·
"Davet koduyla ekle"yi katlamak · Modlar alt listesinden Lig satırını çıkarmak · %0 kategori çubuklarını gizlemek.

---

## 8. Ida'dan beklenen kararlar

1. **Kart dili:** bütün sayfalar Görevler'in 3 px konturlu kabartmalı kartına geçsin mi? (Öneri: evet — iki dil tek dile iner.)
2. **Meydan Okumalar bölüm sırası** değişsin mi (önce "kime", sonra mod/kategori)?
3. **Dokunuş titreşimi** ayrı bir ayar mı olsun, yoksa bugünkü gibi "Efektler" anahtarına mı bağlı kalsın?
4. **Lig pankartı** lig renginde dolu zemin olsun mu (beyaz kart yerine)?
