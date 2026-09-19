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
