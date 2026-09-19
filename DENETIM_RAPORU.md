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
