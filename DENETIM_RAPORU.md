# Quiz Tactics — Kalite Denetimi (Paket 39)

19 Eyl 2026. **Yalnız rapor — hiçbir kod değiştirilmedi.**

**Yöntem.** Vite dev sunucusu + Playwright Chromium. Supabase yanıtları sahte (canlı veritabanına hiçbir şey yazılmadı).
Her ekranın ana durumu beş görünümde çekildi: 390×844 ve 1280×800, açık ve koyu tema, ayrıca 390 İngilizce.
Öteki durumlar (boş, hata, taşkın…) 390 açık temada çekildi. Görüntüler: `denetim/goruntuler/<ekran>-<durum>-<genişlik>-<tema>.png`.

Her görünümde otomatik ölçülenler:
- yatay taşma (`scrollWidth − innerWidth`),
- 44 px altı dokunma hedefleri,
- görünen her metnin yazı/zemin kontrastı (WCAG; degrade zeminde degradenin ilk rengiyle yaklaşık, `~` işaretli),
- İngilizce modda görünür kalan Türkçe metin,
- konsol hataları.

**Koyu tema notu:** `oyun/lib/tema.js:26` `KOYU_TEMA_KAPALI = true` — oyuncular bugün koyu temaya ulaşamıyor.
Koyu görüntüler `data-tema="koyu"` elle verilerek alındı; oradaki bulgular yayını değil, tema açıldığı günü ilgilendirir.

Önem: 🔴 Hata · 🟡 Eksik · 🔵 Kozmetik · ✅ İyi olan · ❔ Şüpheli (doğrulanamadı).

---

## 1. Giriş (`/giris`)
Görüntüler: giris-normal-{390,1280}-{acik,koyu}.png · giris-normal-390-en.png · giris-misafir-hata-390-acik.png ·
giris-yukleniyor-390-acik.png · giris-eposta-gecersiz-390-acik.png · giris-eposta-gonderildi-390-acik.png

### 🔴 Hata
- Giriş hataları okunmuyor: hata kutusunun yazısı açık pembe zeminde açık pembe. Nerede: `src/styles.css:415` (`.hata-kutu` #FCA5A5).
  Açık tema düzeltmesi (`tema.css:4431`) yalnız `.app` ve modal içinde geçerli; giriş sayfası ikisinin de dışında.
  Oyuncuya etkisi: "Misafir girişi şu an kapalı…" gibi yol gösteren mesajı okuyamaz, giriş yapamadığını anlamaz.
  Kanıt: ölçüldü **1,49:1** (13 px; eşik 4,5) — giris-misafir-hata-390-acik.png.

### 🟡 Eksik
- "Bağlantı gönderildi" durumunda adresi düzeltme ya da yeniden gönderme yolu yok; form yerine yalnız bilgi kutusu kalıyor.
  Nerede: `src/pages/Login.jsx:201-205`. Oyuncuya etkisi: adresi yanlış yazan ya da e-postası gelmeyen sayfayı yenilemek zorunda.
  Kanıt: giris-eposta-gonderildi-390-acik.png.
- Geçersiz e-postada uygulama içi mesaj yok; tarayıcının kendi balonu çıkıyor ve dili tarayıcının arayüz dilinde
  (Türkçe sayfada İngilizce "Please include an '@'…" göründü). Nerede: `Login.jsx` e-posta `input` (`type="email" required`).
  Kanıt: giris-eposta-gecersiz-390-acik.png.
- TR/EN düğmeleri 44×30 px; "Gizlilik politikası" 85×16, "Kullanım koşulları" 94×16 px. Nerede: `src/styles.css:212` (`.giris-dil-btn`),
  `Login.jsx:246-248`. Oyuncuya etkisi: telefonda iskalamak kolay (hedef ≥ 44×44).
- İlk ekranda oyunu gösteren hiçbir görsel yok (maskot, soru kartı, ekran görüntüsü): yalnız logo + iki satır + düğmeler.
  Oyuncuya etkisi: mağazadan gelen biri ne oynayacağını görmeden hesap açmaya çağrılıyor.

### 🔵 Kozmetik
- E-posta alanı ve yer tutucu metni sistem yazı tipinde (Arial kalın), sayfanın geri kalanı Nunito/Baloo.
  Nerede: `oyun/styles/tema.css:3703` (`font-family` yok; `input` yazı tipini devralmaz). Kanıt: giris-normal-390-acik.png.
- Hata kutusu formun en üstünde açılıyor ve bütün sayfayı ~46 px aşağı itiyor; hata, basılan düğmeden (Misafir, en altta) uzakta.
  Kanıt: giris-misafir-hata-390-acik.png ile giris-normal-390-acik.png karşılaştırması.

### ❔ Şüpheli
- Facebook düğmesi her zaman görünüyor, sağlayıcı kapalıysa basınca hata veriyor (`Login.jsx:60-70`, bilinçli karar yorumda).
  Canlıda Facebook'un açık olup olmadığı buradan ölçülemedi; kapalıysa oyuncuya çalışmayan bir düğme gösteriliyor
  (üstelik hatası yukarıdaki 🔴 yüzünden okunmuyor).
- Paketteki "üç giriş yolu"nun üçüncüsü X (Twitter) sağlayıcı ayarına bağlı gizli (`Login.jsx:188`); denetimde çizilmedi.

### ✅ İyi olan
- 390 ve 1280'de yatay taşma yok; birincil eylem (Google) tek ve belirgin, ötekiler beyaz ikincil.
- Yükleniyor hâli var: basılan düğme "Giriş yapılıyor…" oluyor, öteki düğmeler pasif (giris-yukleniyor-390-acik.png).
- İngilizce çeviri eksiksiz (görünür Türkçe kalıntı yok; "Türkiye" özel isim).
- Misafir notu dürüst ("bu cihaza bağlıdır… sonra bağlayabilirsin"); gizlilik/koşullar bağlantıları var.
- Koyu tema okunur, düğmeler ayrışıyor.

---

## 2. Ana Sayfa (`/`)
Görüntüler: anasayfa-dolu-{390,1280}-{acik,koyu}.png · anasayfa-dolu-390-en.png · anasayfa-tam-*.png (tam sayfa) ·
anasayfa-alt-390-acik.png · anasayfa-taskin-390-acik.png · anasayfa-yeni-oyuncu-390-acik.png · anasayfa-yukleniyor-390-acik.png ·
anasayfa-hata-390-acik.png · anasayfa-bildirim-izni-390-acik.png

### 🔴 Hata
- Gelen davet bandında (üst çubuğun altında "X sana meydan okudu! · Kabul Et") davet edenin adı ve metin görünmüyor:
  beyaz yazı beyaz zeminde. Nerede: `oyun/styles/tema.css:566-576` (`.bd-davet-bandi` `color:#fff`, `background: var(--bd-yuzey-2)`)
  + `tema.css:4516` ("zemini kendi renkli gradyanı" yorumu var ama gradyan uygulanmıyor). Oyuncuya etkisi: kimin, hangi modda
  davet ettiğini göremeden yalnız "Kabul Et" düğmesini görüyor; Reddet de seçilemiyor gibi. Kanıt: ölçüldü "sana meydan okudu!"
  **1,00:1**, "Bir oyuncu" 1,00:1, "Karışık" 1,00:1 — anasayfa-taskin-390-acik.png (üstteki bant).
- (Yalnız koyu tema) "Dereceli" kartı koyu temada beyaz kalıyor, üstündeki açık renk yazı okunmuyor. Nerede: `DereceliAnahtari`
  (yer: tema.css'te kartın zemin kuralı bulunamadı). Kanıt: "Dereceli" **1,14:1**, "Lig puanı + tam coin" 2,01:1,
  rütbe rozeti "Üstat" 1,51:1 — anasayfa-dolu-390-koyu.png. Koyu tema bugün kapalı olduğu için oyuncuyu etkilemiyor.

### 🟡 Eksik
- Veri gelmezse ya da hata dönerse hata mesajı yok; sayfa sahte bir profil çiziyor: "Oyuncu", **0 PUAN**, "Çaylak",
  "?" avatar. Üst çubukta zil ve coin kayboluyor. Oyuncuya etkisi: puanının ve rütbesinin sıfırlandığını sanır, yenileme önerisi yok.
  Kanıt: anasayfa-hata-390-acik.png (bütün istekler 400).
- Yüklenirken iskelet ya da gösterge yok: aynı sahte "Oyuncu / 0 PUAN / Çaylak" görünüp sonra gerçek değere atlıyor.
  Kanıt: anasayfa-yukleniyor-390-acik.png (istekler 5 sn geciktirildi).
- "Seni bekleyenler" başlığı altında bekleyen davet yokken yalnız "Günlük Görevler" satırı var; boş durum metni ya da
  "arkadaşına meydan oku" gibi bir eylem yok. Nerede: `oyun/pages/Home.jsx:614-619`. Kanıt: anasayfa-alt-390-acik.png.
- Üst çubukta ses kapatma yok (`Layout.jsx:152-157` yorumu: tema ve ses üst bardan kaldırılmış). Ses yalnız Profil › Ayarlar'da;
  maç ortasında kapatmanın yolu bu denetimde bulunamadı (bkz. §6).
- Profil (D) ve Görünüm (tişört) düğmeleri 40×44 px (hedef 44×44). Kanıt: otomatik ölçüm, 390.
- Aktif sekme etiketi "Ana Sayfa" 9,5 px turuncu, açık zeminde **2,92:1** (eşik 4,5). Nerede: `tema.css:881` / `tema.css:4219`.
  Bütün sekme etiketleri 9,5 px — telefonda zor okunur.

### 🔵 Kozmetik
- Mod kartları ızgarası dengesiz: Düello tam genişlik; Saf Bilgi ile Meydan Oku yan yana ama farklı yükseklikte (Meydan Oku'nun alt satırı yok);
  Turnuva yarım genişlikte tek başına kalıyor, sağı boş; Hatalarım yine tam genişlik. Nerede: `Home.jsx` "Başka nasıl oynanır" bloğu,
  `tema.css:2373`. Kanıt: anasayfa-alt-390-acik.png.
- İki birincil düğme yan yana yarışıyor: "Hemen oyna" sarı (`.bd-ana-eylem`, `tema.css:273`), hemen altındaki "Lobiye katıl"
  turuncu. Marka vurgusu turuncu olduğu hâlde ana eylem sarı; hangisinin asıl eylem olduğu belirsizleşiyor.
- Masaüstünde (1280) içerik 600 px'lik dar bir sütun, alt sekme çubuğu da telefon düzeninde ortada; iki yan boş.
  Masaüstüne özel gezinme yok. Kanıt: anasayfa-dolu-1280-acik.png.
- "Haftalık lig bitimine 1 gün 13 saat" satırı ayrı, soluk bir kartta; neye ait olduğu belli değil (lig kartı değil).

### ❔ Şüpheli
- Turnuva saatleri: ana sayfa "12:30 · 15:00 · 18:00 · 20:00 · 22:00 · 24:00" gösteriyor. Bu, sunucu ayarı okunamayınca devreye giren
  kod varsayılanı (`oyun/lib/zaman.js:15`). Giriş sayfası ise sabit metinle "Her gün 13:00 ve 21:50" diyor
  (`src/pages/Login.jsx:165`); CLAUDE.md de 13:00 ve 21:50 diyor. Canlı `oyun_ayarlari.turnuva_saatleri` değeri anonim
  okunamadı. Hangisi doğruysa öteki yanlış.
- Bildirim izni kartı çizilmedi (oturum işareti verildi); headless Chromium'da bildirim izni "denied" döndüğü için kartın
  kendi kuralı onu gizliyor olabilir. Doğrulanamadı.

### ✅ İyi olan
- Hiçbir durumda yatay taşma yok; 16 karakterlik ad, 9.999 puan, 99.999 coin sığıyor (anasayfa-taskin-390-acik.png).
- İlk ekranın bilgi hiyerarşisi net: kim olduğun → puan ve rütbe ilerlemesi → rakip kategorisi → Dereceli → tek büyük "Hemen oyna".
- Rütbe ilerleme metni somut ("Kahin rütbesine 50 puan"); en üst rütbede "En yüksek rütbedesin".
- Turnuva geri sayımı ve "Lobiye katıl" görünür; Hatalarım kartında banka sayısı rozeti var.
- İngilizce'de görünür Türkçe kalıntı yok.

---

## 3. Mod seçim penceresi ("Hemen oyna")
Görüntüler: modsecim-acik-{390,1280}-{acik,koyu}.png · modsecim-acik-390-en.png · modsecim-seciliyor-390-acik.png

### 🟡 Eksik
- Pencerede ödül bilgisi görünmüyor: kod her mod için ödül satırı çiziyor ama ayar (`oyun_ayarlari`) okunamazsa satır tamamen
  kayboluyor, yerine "—" ya da bekleme metni yok. Nerede: `oyun/components/ModSecimPenceresi.jsx:43,84-89`.
  Oyuncuya etkisi: "En çok ödül" rozeti var ama ne kadar olduğu yazmıyor. (Sahte ortamda ayar boştu — canlıda dolu olabilir, ❔.)

### 🔵 Kozmetik
- Pencere açılınca ilk kart (Klasik Maç) odak halkasıyla turuncu çerçeveli çiziliyor; seçilmiş gibi görünüyor.
  Nerede: `ModSecimPenceresi.jsx:51` (`ilkRef.current?.focus()`). Masaüstünde fare hangi kartın üstündeyse o da turuncu,
  iki kart aynı anda "seçili" görünebiliyor. Kanıt: modsecim-acik-390-acik.png, modsecim-acik-1280-acik.png.
- Üstte sürükleme tutamacı çiziliyor ama pencere sürüklenerek kapanmıyor (kodda dokunma/sürükleme işleyicisi yok,
  `ModSecimPenceresi.jsx:110`). Tutamaç bir hareket vaat ediyor.
- Masaüstünde alttan açılan pencere ekranın altına yapışık, "Vazgeç"in altında boşluk yok. Nerede: `tema.css:6725`.
  Kanıt: modsecim-acik-1280-acik.png.

### ✅ İyi olan
- Üç mod tek bakışta ayrışıyor: ikon + ad + tek cümle kural + joker satırı; Düello'da "En çok ödül" rozeti.
- Vazgeç artık beyaz ikincil (Paket 38); seçim sürerken diğer kartlar soluklaşıyor (modsecim-seciliyor-390-acik.png).
- İngilizce'de Türkçe kalıntı yok; yatay taşma yok.

---

## 4. Rakip arama
Görüntüler: rakiparama-aranıyor-{390,1280}-{acik,koyu}.png · rakiparama-aranıyor-390-en.png · rakiparama-15sn-390-acik.png ·
rakiparama-hata-390-acik.png · rakiparama-bot-hata-390-acik.png · rakiparama-vazgec-sonrasi-390-acik.png

### 🟡 Eksik
- Arama hatası mesajı çıkıyor ama ekran aynı anda "Rakip aranıyor…" demeye ve saniye saymaya devam ediyor; "Tekrar dene" düğmesi yok.
  Kanıt: rakiparama-hata-390-acik.png. Oyuncuya etkisi: aramanın sürüp sürmediği anlaşılmıyor.
- Bot maçı açılamazsa ("Maç başlatılamadı…") ekranda yalnız "Vazgeç" kalıyor; "Beklemeden bot ile oyna" düğmesi de kayboluyor.
  Tekrar deneme yolu yok. Kanıt: rakiparama-bot-hata-390-acik.png.
- ~15 sn sonra ekran "Maç hazırlanıyor…" hâline geçiyor ve maç kimliği gelene kadar saniyede bir yokluyor; üst sınır yok.
  Nerede: `oyun/components/RakipAra.jsx:~193` (`setInterval`, sınırsız). Sunucu hiç dönmezse oyuncu sonsuza dek bekler;
  "Beklemeden bot ile oyna" düğmesi de bu hâlde kayboluyor. Kanıt: rakiparama-15sn-390-acik.png.
- "Beklemeden bot ile oyna" düğmesinde beyaz yazı turuncu zeminde: yaklaşık **2,1:1** (17 px kalın; eşik 4,5). Arama katmanı `.app`
  dışında olduğu için Şenlik'in "turuncu üstünde koyu yazı" kuralı uygulanmıyor, taban `.btn` (`src/styles.css:129-134`, `color:#fff`) geçerli.

### 🔵 Kozmetik
- Aynı birincil düğme burada beyaz yazılı, ana sayfada ve pencerelerde koyu yazılı (`--bd-vurgu-ustu`) — iki farklı turuncu düğme var.
- Rakip kutusu ile başlık çelişiyor: başlık "Maç hazırlanıyor…" derken kutu hâlâ "Rakip aranıyor" yazıyor (rakiparama-15sn-390-acik.png).
- (Koyu tema) "Rakip aranıyor" ~1,0:1 ve "Vazgeç" 1,14:1 — koyu temada arama katmanı açık zeminini koruyor, yazılar kayboluyor.

### ✅ İyi olan
- Sahne sade ve anlaşılır: sen ↔ VS ↔ "?" kutusu, kategori açıklaması, geçen süre sayacı, belirgin bir birincil ve bir ikincil düğme.
- Bot yolu dürüst: "Bot maçında coin ödülü yarıya iner" yazıyor (rakiparama-bot-hata-390-acik.png).
- Vazgeç ana sayfaya temiz dönüyor, kuyruktan çıkış çağrısı yapılıyor (rakiparama-vazgec-sonrasi-390-acik.png).
- Hata mesajı Şenlik kırmızısında ve okunur (bu katmanda `tema.css:4434` düzeltmesi geçerli).

---

## 5. Maç hazırlık ("Hazır mısın?")
Görüntüler: machazirlik-bekliyor-{390,1280}-{acik,koyu}.png · machazirlik-bekliyor-390-en.png · machazirlik-ben-hazir-390-acik.png ·
machazirlik-geri-sayim-390-acik.png · machazirlik-geri-sayim2-390-acik.png · machazirlik-davet-bekliyor-390-acik.png ·
machazirlik-yukleme-hatasi-390-acik.png

### 🔴 Hata
- Maç başındaki 3-2-1 geri sayımı görünmüyor. `.bd-geri-sayim` iki kez tanımlı: `oyun/styles/tema.css:2143` (eski kural:
  `position:absolute; transform:translate(-50%,-50%)` + `bd-sayim-vur` animasyonu, sonunda opaklık 0) ve `tema.css:5099`
  (yeni kural: `position:fixed; inset:0`). İkisi birleşince katman `fixed` + `transform` oluyor. Ölçüldü: katman
  `matrix(0.86,0,0,0.86,-195,-422)` ile ekranın sol üstüne, dışına itilmiş; kutu x=−168, y=−363; opaklık 0.
  Oyuncuya etkisi: "Hazır ol!" ve sayı hiç görünmüyor, soru hazırlıksız anda beliriyor. CLAUDE.md'nin "fixed ile transform aynı
  öğede olmaz" kuralını da çiğniyor. Kanıt: machazirlik-geri-sayim-390-acik.png ve -geri-sayim2- (sayım sürerken çekildi, katman yok).

### 🟡 Eksik
- Davet gönderilmiş, rakip henüz kabul etmemiş maçta ekran yalnız "Cevap bekleniyor — Sıla henüz kabul etmedi." diyor.
  Daveti geri çekme, geri dönme ya da süre bilgisi yok. Nerede: `oyun/pages/MatchPage.jsx:677-685`. Kanıt: machazirlik-davet-bekliyor-390-acik.png.
- Maç açılamayınca ham sunucu mesajı gösteriliyor (sahte ortamda "sahte hata"; canlıda İngilizce/teknik metin olabilir).
  Nerede: `MacYukleniyor` `hata` prop'u (`MatchPage.jsx:662-665`). "Tekrar dene" ve "Meydan okumalara dön" var — iyi.

### 🔵 Kozmetik
- İki oyuncu da hazır değilken alt satır "Beklenen: Sıla" diyor; asıl beklenen oyuncunun kendisi de olduğu hâlde yalnız rakip adı yazıyor.
  Kanıt: machazirlik-bekliyor-390-acik.png.
- Kendi adının altında "bekleniyor…", rakibin altında "ekranda": iki farklı durum dili aynı satırda; hangisinin iyi olduğu belli değil.

### ✅ İyi olan
- Kural bir cümlede anlatılıyor ("eş zamanlı… hepiniz hazır olunca başlar"), sayaç "0/2 hazır", tek birincil "Hazırım".
- Hazıra basınca düğme "Hazırsın — diğerleri bekleniyor" durum satırına dönüşüyor; maskot da değişiyor (machazirlik-ben-hazir-390-acik.png).
- Yükleme hatasında "Tekrar dene" + çıkış yolu var.
- İngilizce'de yalnız oyuncu adı ("Sıla") Türkçe — doğru.

---

## 6. Maç ekranı (Klasik)
Görüntüler: mac-soru-basi-{390,1280}-{acik,koyu}.png · mac-soru-basi-390-en.png · mac-yari-sure-390-acik.png · mac-son5sn-390-acik.png ·
mac-son5sn-an-390-acik.png · mac-sure-doldu-390-acik.png · mac-dogru-390-acik.png · mac-dogru-anında-390-acik.png · mac-yanlis-390-acik.png ·
mac-uzun-soru-390-acik.png · mac-joker-5050-390-acik.png · mac-joker-satinal-390-{acik,koyu}.png · mac-joker-coin-yetmez-390-acik.png ·
mac-rakip-sis-390-acik.png · mac-saf-bilgi-390-{acik,koyu}.png

### 🔴 Hata
- Son 5 saniyedeki büyük sayı görünmüyor ve kayık. §5'teki aynı sınıf çakışması: soru kartındaki son-5-sn sayısı da
  `.bd-geri-sayim` sınıfını kullanıyor. Hazırlık ekranı için yazılan `tema.css:5099` kuralı onu da `position:fixed`,
  bulanık zeminli, tam ekran bir katmana çeviriyor, eski kuralın `transform`'u yerinde kalıyor. Ölçüldü: x=−160
  (yarısı ekran dışında), yazı rengi `rgba(255,255,255,.14)`; açık zeminde görünmez. Oyuncuya etkisi: "son saniyeler" uyarısı yok,
  yalnız halka kırmızıya dönüyor. Kanıt: mac-son5sn-an-390-acik.png. (Tek düzeltme iki ekranı birden çözer: iki öğeye ayrı sınıf.)

### 🟡 Eksik
- Maç sırasında sesi kapatmanın yolu yok (üst çubukta ses düğmesi yok; ses yalnız Profil › Ayarlar'da).
- 1280×800'de joker çubuğu ve sohbet düğmesi ekranın altında kalıyor: joker etiketleri (50:50, +10 sn…) kesik. Oyuncu 15 saniyelik
  soruda kaydırmak zorunda. Kanıt: mac-soru-basi-1280-acik.png. 390×844'te de sohbet düğmesi kıvrımın altında.
- Uzun soruda (5 satır) şıklar ve joker çubuğu ekranın altına iniyor; D şıkkı ve jokerler için kaydırmak gerekiyor.
  Kanıt: mac-uzun-soru-390-acik.png. Yazı boyutu uzun soruda küçülmüyor.
- Üst çubuk (zil, coin, tişört, profil) maç boyunca açık ve dokunulabilir; soru ortasında zile ya da profile basıp maçtan çıkılabiliyor.
  Alt sekme çubuğu maçta gizleniyor (`useOyunModu`) ama üst çubuk gizlenmiyor.
- Maçtan çık (X) düğmesi 36×36 px (hedef 44). Nerede: `MatchPage.jsx:~1001`.
- "3/10" ilerleme yazısı 11 px, **2,55:1** (`tema.css:3899`, `--bd-metin-2` açık mavi zeminde); rakip adı "Sıla" 12,5 px **3,87:1**
  (rakip tarafı soluk çiziliyor). Eşik 4,5.

### 🔵 Kozmetik
- Doğru cevaptaki "+10" uçuşu sarı (#FFC53D) ve açık yeşil şıkkın üstünde çıkıyor; kontrastı çok düşük, anlık da olsa okunmuyor.
  Nerede: `tema.css:2891` (`.bd-puan-ucus`). Kanıt: mac-dogru-anında-390-acik.png.
- (Koyu tema) Kullanılamaz jokerlerin etiketleri ("+10 sn", "Süreyi Kısalt", "Sis") 11 px, **1,57:1**; satın alma penceresinde fiyat "40" 2,40:1.
- Joker çubuğundaki sayı rozetleri ("1", "2") ile fiyat rozetleri ("🪙 40") aynı köşede ve aynı biçimde; "elinde var" ile
  "satın alınır" ancak rengin tonundan ayrılıyor.

### ❔ Şüpheli / kurulamadı
- Süre doldu: sayaç "0" oluyor, şıklar dokunulabilir görünüyor, "Süre doldu" satırı çıkmadı. Sahte sunucu `mac_soruyu_atla`ya boş döndüğü için
  istemci "yeniden denenecek" döngüsüne girdi (konsol). Canlıda ne göründüğü doğrulanamadı (mac-sure-doldu-390-acik.png).
- Rakibin Sis jokeri: `joker_surum` artışı sahte ortamda tetiklenmedi, sis efekti görülemedi (mac-rakip-sis-390-acik.png).
- Coin yetmezken joker: düğme pasif olduğu için dokunulamadı (beklenen). Satın alma penceresinin "yetersiz" hâli açılamadı.

### ✅ İyi olan
- Doğru/yanlış geri bildirimi çok net: seçilen yanlış şık kırmızı + ✕, doğru şık yeşil + ✓, öteki şıklar soluyor; konfeti var
  (mac-dogru/mac-yanlis). "Sıla cevaplayınca soru geçecek…" beklemeyi açıklıyor; "Bu soru adil miydi?" oylaması yerinde.
- Süre hem halka hem çubukla gösteriliyor; yarıda turuncuya, son saniyelerde kırmızıya dönüyor (mac-yari-sure, mac-son5sn).
- 50:50 sonrası elenen iki şık üstü çizili ve soluk, joker düğmesinde onay işareti (mac-joker-5050).
- Joker satın alma penceresi temiz: ne işe yaradığı, fiyat, bakiye, Vazgeç ikincil, "Al ve kullan" birincil (mac-joker-satinal-390-acik.png).
- "Bu maçta 3 joker hakkın kaldı" satırı hakkı görünür kılıyor. 390'da yatay taşma yok.
- İngilizce'de yalnız soru metni ve şıklar Türkçe kaldı — soru bankası Türkçe, beklenen (bkz. §sonu).

---

## 8. Saf Bilgi (maç ekranı)
Görüntüler: mac-saf-bilgi-390-{acik,koyu}.png (sonuç ekranı Klasik ile aynı bileşen — §7)

### 🟡 Eksik
- Maç ekranında bunun Saf Bilgi (jokersiz) maçı olduğunu söyleyen hiçbir şey yok: joker çubuğu yalnızca kayboluyor; başlıkta ya da
  skor tabelasında mod adı/rozeti yok. Oyuncuya etkisi: jokerlerin neden gittiğini "hata" sanabilir. Kanıt: mac-saf-bilgi-390-acik.png.

### ✅ İyi olan
- Jokersiz ekran daha sade; soru ve şıklar ekrana tam sığıyor, kaydırma gerekmiyor.

---

## 7. Maç sonu (Klasik)
Görüntüler: macsonu-kazandi-{390,1280}-{acik,koyu}.png · macsonu-kazandi-390-en.png · macsonu-kazandi-detay-390-acik.png ·
macsonu-kaybetti-390-{acik,koyu}.png · macsonu-berabere-390-acik.png · macsonu-taskin-390-acik.png · macsonu-odul-hata-390-acik.png

### 🟡 Eksik
- Ödül dökümü alınamazsa ekranda ödül hapları, görev satırları ve Detay'daki döküm tamamen kayboluyor, "ödül bilgisi alınamadı" gibi bir satır yok.
  Oyuncuya etkisi: kazandığı hâlde hiçbir kazanım görmüyor, ödül verilmedi sanıyor. Kanıt: macsonu-odul-hata-390-acik.png
  (`odul_dokumu` + `mac_odulum` hata döndü; konsolda iki hata, ekranda hiçbir şey).
- Tepki emojileri (👍 😄 😮 😠 🔥 😎 💬) 34×34 px (hedef 44). Kanıt: otomatik ölçüm.
- İngilizce'de günlük görev adları Türkçe kalıyor ("10 doğru cevap ver") — ad sunucudan geliyor, `tt()` sözlüğünde karşılığı yok.
  Kanıt: macsonu-kazandi-390-en.png.

### 🔵 Kozmetik
- 390'da yapışkan eylem çubuğu (iki büyük düğme + not satırı) ekranın ~%25'ini kaplıyor. Detay açılınca yalnız ilk iki satır görünüyor,
  gerisi çubuğun arkasında; kaydırmadan okunmuyor. Kanıt: macsonu-kazandi-detay-390-acik.png.
- Masaüstünde eylem çubuğu içerikten dar, "Maç bitti ama oturum açık…" kartının alt kenarı çubuğun arkasında kalıyor.
  Kanıt: macsonu-kazandi-1280-acik.png.
- Görev satırı "10 doğru cevap ver · 10/10 ✓" tamamlanmış ama "ödülünü al" yönlendirmesi yok; ödül ana sayfadaki Günlük Görevler'den alınıyor.

### ❔ Şüpheli
- Skorların altındaki "3/10" maç bittiği hâlde çiziliyor. Sahte veride `oyuncuN_soru = 3` verildiği için olabilir; canlıda bitmiş maçta 10/10 mu yazıyor, doğrulanamadı.

### ✅ İyi olan
- Kazan/kaybet/berabere üç ayrı ton: turuncu sıcak zemin + kupa + hale / soğuk mavi zemin + küçük soluk avatar / nötr.
  "3 soru farkla", "2 soru farkla" yakınlık satırı iyi.
- Ödül hapları + günlük görev çubuğu Detay açmadan görünüyor (Paket 37 D.1 çalışıyor). Kaybedince de görev ilerlemesi var — eli boş çıkılmıyor.
- Kaybedince "Rövanş" birincil + koşulları tek satırda ("aynı kategori · 24 saat geçerli").
- 16 karakterlik rakip adı ve 100 puan sığıyor; yatay taşma yok.

---

## 9. Düello
Görüntüler: duello-lobi-{390,1280}-{acik,koyu}.png · duello-lobi-390-en.png · duello-tanitim-390-acik.png · duello-kategori-sec-{390,1280}-{acik,koyu}.png ·
duello-kategori-sec-390-en.png · duello-kategori-bekle · duello-saldiri-hazirligi · duello-saldiri-geliyor · duello-savunma-390-{acik,koyu} ·
duello-savunma-son-can-baski · duello-rakip-dusunuyor · duello-tur-gecisi · duello-sonuc-kazandi-{390,1280}-acik · duello-sonuc-kaybetti ·
duello-rovans-geldi · duello-yukleme-hatasi (hepsi -390-acik aksi yazılmadıkça)

### 🔴 Hata
- **Mod paritesi:** düello maçı sırasında alt sekme çubuğu ve üst çubuk açık kalıyor. Klasik, Grup, Turnuva maçları `useOyunModu(...)` ile
  sekme çubuğunu gizliyor; `DuelloPage.jsx` bu kancayı hiç çağırmıyor (`grep useOyunModu`: MatchPage:525, GroupMatchPage:347,
  TournamentPage:379 — DuelloPage yok). Oyuncuya etkisi: savunma ve saldırı jokerleri sekme çubuğunun arkasında kalıyor
  (duello-savunma-son-can-baski-390-acik.png: "SAVUNMA JOKERLERİ" başlığından sonrası görünmüyor), maç ortasında yanlışlıkla
  Ana Sayfa'ya basılabiliyor.

### 🟡 Eksik
- Düello açılamazsa ham sunucu mesajı ("sahte hata") ve yalnız "Düello'ya dön" var; "Tekrar dene" yok (Klasik'te var — parite).
  Kanıt: duello-yukleme-hatasi-390-acik.png.
- Tanıtım penceresindeki "İleri" düğmesi beyaz yazı / turuncu zemin ~**2,1:1** (portal katmanında taban `.btn` rengi; §4 ile aynı kök).
  Kanıt: duello-tanitim-390-acik.png.
- "Kurallar nasıl işliyor?" bağlantısı 32 px yüksekliğinde (hedef 44).
- Maç sırasında ses kapatma yolu yok (§6 ile aynı).

### 🔵 Kozmetik
- Kategori seçim ekranında üç satırlık kural açıklaması ("En zayıf kategori maç başında sabitlenir; yüzdeler eşitse…") her turda tekrar
  okunuyor; ilk turdan sonra kısaltılabilir. Kanıt: duello-kategori-sec-390-acik.png.
- Rövanş isteği gelince eylem çubuğu ekranın ortasında kalıyor, altında ~120 px boş turuncu alan var (içerik ekrandan kısa).
  Kanıt: duello-rovans-geldi-390-acik.png.
- (Koyu tema) Kategori kartları, oyuncu kartları ve sayaç koyu temada beyaz kalıyor, üstlerindeki yazılar **1,14:1** ("Tarih", "Deneme", "9").
  Kanıt: duello-kategori-sec-390-koyu.png.

### ❔ Kurulamadı
- Rakip arama ekranı: tanıtım penceresi geçilemedi (hangi localStorage anahtarının "görüldü" saydığı sahte ortamda tutturulamadı),
  arama sahnesi çekilemedi. Arama bileşeni Klasik'teki `RakipAra`'dan ayrı (`DuelloPage.jsx:~175`, `duello_ara`).
- Joker kullanımı ve joker satın alma: sahte veride `jokerler.hak` alanı eksik kaldı, jokerler "hakkın doldu" ile pasif çizildi;
  dokunma ve satın alma penceresi açılamadı. (Canlı sorunu değil, düzenek eksiği.)

### ✅ İyi olan
- Roller çok net: büyük "SALDIRIYORSUN" (turuncu) / "SAVUNUYORSUN" (mavi) şeridi, kenarlarda rol rengi parıltısı, sırası gelen oyuncu turuncu çerçeveli.
- Kategori seçimi taktik bilgisini veriyor: rakibin kategori yüzdeleri, "veri yok", kullanım sayacı (0/2), kırmızı "RİSKLİ" rozeti.
- Tur geçişinde son hamlenin özeti ("İsabet! Rakip can kaybetti."); savunmada Zaman Baskısı ve Savunma Kilidi bantları okunur.
- Sonuç ekranı ortak `MacSonuSahnesi`: kalpler, ödül hapları, görev satırı, rövanş Kabul/Reddet (Paket 36-38 paritesi tamam).
- Lobi sayfası kuralları üç maddede anlatıyor, ödülü ("Galibiyet: +50 lig puanı ve 50 coin") birincil düğmenin hemen üstünde veriyor.

---

## 10. Grup maçı
Görüntüler: grup-davet-lobi-390-acik · grup-lobi-bekliyor-390-acik · grup-hazir-kapisi-390-acik · grup-mac-{390,1280}-{acik,koyu} ·
grup-mac-390-en · grup-mac-uzun-ad-390-acik · grup-sohbet-acik-390-acik · grup-sonuc-kazandi-{390-acik,1280-acik,390-koyu} · grup-sonuc-kaybetti-390-acik

### 🟡 Eksik
- **Mod paritesi:** grup maçı sırasında maçtan çıkış düğmesi yok (Klasik'te sol üstte X var, Düello'da "Düellodan çık").
  Nerede: `GroupMatchPage.jsx` soru ekranı (çıkış yalnız hazır kapısındaki "Vazgeç"te, `:145`). Kanıt: grup-mac-390-acik.png.
- Davet lobisindeki yeşil "Hazır" etiketi 12 px, **2,17:1**. Kanıt: grup-davet-lobi-390-acik.png.
- Skor tablosunda kendi adın turuncu, krem zeminde **2,73:1** (14 px). Kanıt: grup-mac-390-acik.png.
- Tepki emojileri 34×34 px (hedef 44). Maç sırasında ses kapatma yok (§6).

### 🔵 Kozmetik
- Davet lobisinde "Deneme, Ayşe henüz kabul etmedi." — oyuncu kendi adını üçüncü şahıs gibi okuyor; "Sen ve Ayşe" daha doğal.
  Nerede: `GroupMatchPage.jsx:373`.
- Sohbet/tepki şeridi skor tablosu ile soru kartının arasına sıkışmış; soru kartını aşağı itiyor.

### ❔ Şüpheli / kurulamadı
- Grup maçında joker çubuğu hiç çizilmedi (`macTur="grup"` veriliyor, `GroupMatchPage.jsx:622`). Sahte `joker_mac_durumu` boş döndüğü için
  olabilir; grup maçında joker olup olmadığı bu denetimde doğrulanamadı.
- Hazır kapısında liste herkesi "hazır" gösterirken sayaç "0/4 hazır" diyor. Liste `group_match_players.hazir`'dan, sayaç nabızdan besleniyor;
  sahte veride ikisi tutarsız verildi. Canlıda iki kaynak ayrışırsa aynı görüntü çıkar — izlenmeli.
- Sohbet düğmesi dokunulabilir bulunamadı; sohbet penceresi açılmış hâli çekilemedi.

### ✅ İyi olan
- Davet lobisi net: kimin kabul ettiği etiketle, Kabul Et (turuncu) / Reddet (kırmızı) / Geri dön (beyaz) ayrışıyor.
- Maçta canlı sıralama tablosu (sen vurgulu) + "Soru 3/10"; 16 karakterlik ad sığıyor.
- Sonuç podyumu (2-1-3) güzel; "Arkadaş maçı — ödül ve puan yok." dürüst; görev ilerlemesi yine görünüyor.

---

## 11. Hızlı Mod (dondurulmuş)
Görüntüler: hizlimod-rota-{390,1280}-acik.png · hizlimod-mac-rotasi-390-acik.png

### ✅ İyi olan
- `/hizli-mod` ve `/hizli-mac/:id` ana sayfaya `replace` ile yönleniyor (ölçüldü: ikisi de `/`); kırık sayfa, boş ekran, konsol hatası yok.
  Ana sayfada ve mod seçim penceresinde Hızlı Mod'a giriş yok. Dondurma CLAUDE.md'de yazıldığı gibi.

### 🔵 Kozmetik
- Eski bir bağlantıdan (bildirim, paylaşım) gelen oyuncu hiçbir açıklama görmeden ana sayfaya düşüyor; "Bu mod şu an kapalı" gibi tek satırlık bir not yok.

---

## 12. Turnuva
Görüntüler: turnuva-yok-{390,1280}-{acik,koyu}.png · turnuva-yok-390-en.png · turnuva-lobi-katilmadin · turnuva-lobi-katildin · turnuva-lobi-bos ·
turnuva-mac-{390-acik,390-koyu,1280-acik} · turnuva-altin-soru · turnuva-elendin · turnuva-sonuc-{390,1280}-acik

### 🟡 Eksik
- **Mod paritesi:** turnuva maçında çıkış düğmesi yok (Klasik'te X var). Kanıt: turnuva-mac-390-acik.png.
- Canlı bant "CANLI · 3 oyuncu hayatta · Soru 7/15" yeşil yazı / açık yeşil zemin **1,94:1** (14 px). Nerede: `TournamentPage.jsx:635`.
- "Hayatta Kalanlar" çipleri ("Sıla (5 doğru)") yeşil yazı **2,17:1** (12 px). Nerede: `TournamentPage.jsx:670` altı.
- "Elendin. Kalan oyuncuları izlemeye devam edebilirsin." kırmızı yazı / pembe zemin **2,75:1**. Nerede: `TournamentPage.jsx:642`.
- Elenen oyuncu izlerken soru için kalan süreyi görmüyor ("Oyuncular cevaplıyor…" var, sayaç yok). Kanıt: turnuva-elendin-390-acik.png.
- Maç sırasında ses kapatma yok (§6).

### 🔵 Kozmetik
- Lobi listesinde kendi satırında "sen" rozeti yok (maç ve sonuç ekranlarında var). Kanıt: turnuva-lobi-katildin-390-acik.png.
- Sonuç ekranında içerik kısa kaldığı için eylem çubuğu ekranın ortasında, altında ~150 px boş gri alan (düello ile aynı). Kanıt: turnuva-sonuc-390-acik.png.
- "Lobiden Ayrıl" krem renkli düz kutu; ne birincil ne `.btn.ikincil` gibi görünüyor.

### ❔ Şüpheli
- Turnuva saatleri yine üç ayrı yerde farklı: "Nasıl oynanır?" kartı "her gün 10:00, 12:30, 15:00, 18:00, 20:00, 22:00, 24:00" diyor
  (kod varsayılanı, `oyun/lib/zaman.js:15`); giriş sayfası "13:00 ve 21:50"; CLAUDE.md "13:00 ve 21:50, sabit". Canlı ayar okunamadı (bkz. §2).
- CLAUDE.md "Toplam oyuncu sayısı hiçbir yerde gösterilmez" diyor; turnuvada "Lobideki Oyuncular (3)", "0 kişi lobide" (ana sayfa) ve
  "3 oyuncu hayatta" gösteriliyor. Bunlar toplam oyuncu sayısı değil ama düşük sayılar (0-3) oyunun boş olduğu izlenimini aynı şekilde veriyor.
- Turnuva maçında joker çubuğu çizilmedi; kural "finalde joker yok" diyor, öncesi için ne olması gerektiği doğrulanamadı.

### ✅ İyi olan
- "Sıradaki turnuva" geri sayımı büyük ve okunur; "Nasıl oynanır?" üç adımda anlatılıyor.
- Lobide Tümü / Arkadaşlarım / Kendi Ligim süzgeci + ada göre arama + kişiye meydan okuma kısayolu.
- Altın soru bandı ("ALTIN SORU · 3 oyuncu başa baş — biri bilene kadar sürer") ayırt edici.
- Sonuç: şampiyon ortada, "2. oldun", ödül hapları; "Turnuvalara dön" birincil.

---

## 13. Meydan okumalar (`/meydan`, ChallengesPage)
Görüntüler: meydan-dolu-{390,1280}-{acik,koyu}.png · meydan-dolu-390-en.png · meydan-tam-*.png (tam sayfa) · meydan-bos-390-acik ·
meydan-hata-390-acik · meydan-duello-modu-390-acik

### 🟡 Eksik
- Veri gelmezse hata mesajı yok; ekran boş durumla aynı: "0 arkadaş — Henüz arkadaşın yok." Oyuncuya etkisi: arkadaşları silindi sanır.
  Kanıt: meydan-hata-390-acik.png ile meydan-bos-390-acik.png birebir aynı (istekler 400).
- Kategori kartlarındaki "0 soru · %0 çözüldü" 9,5 px, **2,34:1** (Düello modunda soluk hâlde 1,42:1). Nerede: `ChallengesPage.jsx:870`.

### 🔵 Kozmetik
- Sayfa 390'da ~2.000 px uzunluğunda: davetler, mod seçimi, kategori şeridi, bot listesi, Dereceli, arkadaşlar, Grup Maçı Kur, Oyuncular,
  Gönderdiğin, Bitenler alt alta. Onlarca turuncu "Meydan oku" düğmesi var; birincil eylem tek ve belirgin değil. Kanıt: meydan-tam-390-acik.png.
- Üstteki açıklama ("Bu sayfa bota ya da arkadaşına meydan okumak içindir. 'Hemen oyna' ve 'Dereceli Maç'ın…") üç satır ve teknik;
  "Dereceli Maç" diye bir düğme artık yok.
- Davet kartlarında "Reddet" kırmızı dolu, "Kabul" turuncu dolu — iki dolu düğme yan yana; geri alınamaz eylem de birincil kadar ağır.

### ❔ Şüpheli
- Konsolda "Encountered two children with the same key" uyarısı (5+ kez). Sahte veride aynı maç satırları iki sorguya da döndüğü için
  olabilir (listelerde tekrar eden satırlar bundan). Canlıda tekrar ediyorsa listede satır kaybı/çiftlenme olur — izlenmeli.

### ✅ İyi olan
- Mod anahtarı (Klasik / Düello / Saf Bilgi) sayfanın üstünde; Düello seçilince kategori şeridi soluklaşıp "düelloda kullanılmaz" diyor.
- Boş durumda arkadaş kartı yol gösteriyor ("Arkadaşlar sekmesinden davet linkini paylaş"). Gönderilen davet geri çekilebiliyor (✕).
- Kategori şeridi Paket 37'deki gibi sağdan soluyor ve ok ipucu var.

---

## 14. Arkadaşlar (`/arkadaslar`)
Görüntüler: arkadaslar-dolu-{390,1280}-{acik,koyu}.png · arkadaslar-dolu-390-en · arkadaslar-bos · arkadaslar-22-kisi (+ -tam) ·
arkadaslar-hata · arkadaslar-cikarma-onayi · arkadaslar-davet-kodu-hata (hepsi -390-acik)

### 🟡 Eksik
- Liste yüklenemezse ham sunucu mesajı ("sahte hata") ve hemen altında "Henüz arkadaşın yok" boş durumu aynı anda çiziliyor; "Tekrar dene" yok.
  Kanıt: arkadaslar-hata-390-acik.png.
- Arkadaş çıkarma onayı satır içinde: "Oyna | Sil | Vazgeç" üç düğme sıkışıyor, "437 puan" iki satıra kırılıyor, "Mert arkadaşlıktan çıkarılsın mı?"
  gibi bir soru cümlesi yok. Kanıt: arkadaslar-cikarma-onayi-390-acik.png.
- Çıkarma (✕) düğmesi 44×36 px ve "Oyna"nın hemen yanında; yanlış dokunma riski. Nerede: `FriendsPage.jsx:398`.
- Davet kodu yüklenemezse kutuda yalnız "–" görünüyor; iki paylaş düğmesi soluk (pasif gibi), neden olduğu yazmıyor. (Sahte ortamda kod yoktu; ❔.)

### 🔵 Kozmetik
- Boş durumda "Davet linkini paylaş" iki kez (boş durum kartı + hemen altta "Arkadaş davet et" kartı).
- Gelen istek ve çıkarma onayında red düğmesi "Sil" diyor (`FriendsPage.jsx:333,388`); arkadaşlık isteği için "Reddet" daha doğru ve
  Meydan sayfasıyla tutarlı olur.

### ✅ İyi olan
- Boş durum örnek gibi: maskot + "Henüz arkadaşın yok — davet linkini paylaş, birlikte yarışın." + eylem düğmesi (arkadaslar-bos-390-acik.png).
- Gelen istekler en üstte, sonra arkadaşlar, bekleyen istekler (Geri çek), davet — sıra mantıklı. 22 kişilik listede taşma yok.
- Davet kodu istemcide doğrulanıyor ("Davet kodu 8 karakter olmalı.").
- Satıra dokununca profil kartı açılıyor (Paket 35 C); "Mesajlar" girişi sayfanın başında.
