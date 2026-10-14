# Google Play — hesap açıldıktan sonra yükleme adımları

Hazır olanlar (14 Eki 2026):

| Ne | Nerede |
|---|---|
| İmzalı AAB (Play'e yüklenecek dosya) | `C:\Users\ida\quiztactics-play\quiztactics-1.0.0.aab` (depo dışı) |
| Deneme APK'sı (telefona doğrudan kurulur) | `C:\Users\ida\quiztactics-play\quiztactics-1.0.0.apk` |
| Yükleme anahtarı | `C:\Users\ida\quiztactics-anahtar\upload.keystore` (alias `upload`) |
| TWA projesi + yeniden derleme | `android/` (bkz. `android/OKU.md`) |
| Mağaza metinleri TR/EN | `docs/play-store/magaza-metinleri.md` |
| Simge, tanıtım görseli, ekran görüntüleri | `docs/play-store/gorseller/` (üretim: `node docs/play-store/gorsel-uret.mjs`) |
| Veri güvenliği formu | `docs/play-store/veri-guvenligi.md` |
| İçerik derecelendirme, hedef kitle, kategori | `docs/play-store/icerik-derecelendirme.md` |
| Digital Asset Links | `public/.well-known/assetlinks.json` — yükleme anahtarı SHA-256: `72:80:26:D9:…:4E:FD:E3` (Play App Signing izi hesap açılınca EKLENECEK, adım 3) |

---

## 0. Hesap

1. https://play.google.com/console → geliştirici hesabı (tek seferlik 25 $). Hesap türü:
   **Kişisel** ya da **Kuruluş** — Ida kararı. Kişisel hesapta 2. adımdaki kapalı test ZORUNLU;
   kuruluş hesabında (D-U-N-S numarası gerekir) zorunlu değildir.
2. Kimlik doğrulaması + iletişim e-postası (info@quiztactics.com önerilir) + telefon doğrulaması.
3. Hesap e-postası **quiztacticsapp@gmail.com** olabilir (Supabase hesabıyla aynı) — karar Ida'nın.

## 1. Uygulamayı oluştur

Play Console › **Uygulama oluştur**:
- Uygulama adı: `Quiz Tactics: Bilgi Yarışması`
- Varsayılan dil: **Türkçe – tr-TR**
- Uygulama/Oyun: **Oyun** · Ücretsiz/Ücretli: **Ücretsiz**
- Beyanlar (Geliştirici Program Politikaları, ABD ihracat yasaları) → işaretle.

## 2. AAB'yi yükle — önce KAPALI TEST

Kişisel hesaplarda üretime çıkmadan önce: **en az 12 test kullanıcısı, kesintisiz 14 gün** kapalı
testte kalmalı (Play kuralı, Kasım 2023'ten beri).

1. Test ve sürüm › Test › **Kapalı test** › yeni kanal (ör. "Kapalı test") › **Sürüm oluştur**.
2. **Play App Signing**: ilk yüklemede "Google tarafından oluşturulan anahtarı kullan" seçili kalsın
   (önerilen). Bizim anahtarımız yalnız **yükleme anahtarı** olur.
3. `C:\Users\ida\quiztactics-play\quiztactics-1.0.0.aab` dosyasını sürükle.
4. Sürüm adı: `1.0.0 (1)` · Sürüm notu (tr-TR): `İlk sürüm.` · (en-US): `First release.`
5. Test kullanıcıları: e-posta listesi oluştur, **en az 12 Gmail adresi** ekle. Katılım bağlantısını
   onlara gönder; her biri bağlantıdan "test kullanıcısı ol"a basıp uygulamayı Play'den kurmalı.
6. 14 gün boyunca en az 12 kişi kayıtlı kalmalı (uygulamayı silmeleri sayacı bozabilir).
   Testerların ara ara açması, üretim başvurusundaki "test sürecinde ne öğrendin" sorusuna
   cevap verir.

## 3. Play App Signing parmak izini assetlinks.json'a EKLE (kritik)

Play, kullanıcılara giden uygulamayı **kendi anahtarıyla** yeniden imzalar. assetlinks.json'da
o anahtarın parmak izi yoksa Play'den kurulan uygulama **adres çubuklu** açılır (TWA doğrulaması
düşer; oyun yine açılır ama tarayıcı gibi görünür).

1. Play Console › uygulama › **Test ve sürüm › Kurulum › Uygulama bütünlüğü** › **Uygulama imzalama**.
2. "Uygulama imzalama anahtarı sertifikası" altındaki **SHA-256 sertifika parmak izi**ni kopyala.
   (Aynı sayfada "Digital Asset Links JSON" kutusu da hazır gelir — ondaki iki parmak izi esas alınır.)
3. `public/.well-known/assetlinks.json` › `sha256_cert_fingerprints` dizisine **ikinci satır** olarak
   ekle; yükleme anahtarının satırı KALIR (yerel APK denemesi için):
   ```json
   "sha256_cert_fingerprints": [
     "<yükleme anahtarı — zaten yazılı>",
     "<Play App Signing — buraya>"
   ]
   ```
4. Commit + push → Vercel yayınlar. Kontrol:
   `https://quiztactics.com/.well-known/assetlinks.json` iki parmak izini göstermeli.
   Google'ın denetleyicisi:
   `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://quiztactics.com&relation=delegate_permission/common.handle_all_urls`
5. Telefonda: uygulamayı Play'den (test bağlantısıyla) kur → açılışta **adres çubuğu görünmemeli**.
   Görünüyorsa: Chrome'un önbelleği için uygulamayı kaldır-kur ya da birkaç dakika bekle.

## 4. Mağaza kaydı (Ana mağaza girişi)

Büyüme › Mağaza varlığı › **Ana mağaza girişi**:
- Ad / kısa açıklama / tam açıklama: `magaza-metinleri.md` (tr-TR). **Çeviri ekle › English (United
  States) – en-US** → EN metinleri.
- Uygulama simgesi: `gorseller/simge-512.png`
- Öne çıkan grafik (feature graphic): `gorseller/tanitim-1024x500-tr.png` (EN girişte `-en`)
- Telefon ekran görüntüleri (2–8 adet): `gorseller/ekran-1…6-*-tr.png` (EN girişte `-en`)
- Tablet ekran görüntüleri: zorunlu değil (boş bırakılabilir; boşsa tabletlerde "telefon için
  tasarlandı" görünür).

## 5. Uygulama içeriği (Politika › Uygulama içeriği) — hepsi doldurulmadan yayın olmaz

| Bölüm | Kaynak |
|---|---|
| Gizlilik politikası | `https://quiztactics.com/gizlilik` |
| Uygulama erişimi | "Tüm işlevler kısıtlamasız" — misafir girişi (`icerik-derecelendirme.md`) |
| Reklamlar | **Hayır** |
| İçerik derecelendirme | `icerik-derecelendirme.md` › IARC |
| Hedef kitle | 13–15, 16–17, 18+ |
| Veri güvenliği | `veri-guvenligi.md` |
| Hesap silme | `https://quiztactics.com/hesap-sil` |
| Devlet uygulaması / Finansal / Sağlık / Haber | Hayır |

Mağaza ayarları: Kategori **Oyun › Bilgi yarışması (Trivia)**, iletişim e-postası, web sitesi.

## 6. Üretime başvuru

14 gün + 12 tester tamamlanınca: Panel › **Üretime erişim için başvur** → kısa anket (test
sürecinde ne değişti, hedef kitle). Onay genelde birkaç gün. Sonra Üretim kanalında kapalı testteki
sürümü **yükselt** (yeniden AAB gerekmez) → ülkeler: önce Türkiye, istenirse tüm ülkeler.

## 7. Sonraki sürümler

- Oyun güncellemesi = siteye push. **AAB yeniden yüklenmez.**
- AAB yalnız paket değişince (ad, simge, renk, sürüm): `android/OKU.md › Yeni sürüm çıkarmak`
  (`appVersionCode` her yüklemede +1).

## Açık kararlar / riskler

- **Gerçek parayla satış (elmas) açılırsa:** Play kuralı gereği dijital ürünler TWA içinde
  **Google Play Faturalandırma** (Digital Goods API + Payment Request) ile satılmalı; web ödeme
  sayfası Play sürümünde kullanılamaz. Ayrıca Veri güvenliği + IARC "dijital satın alma" güncellenir.
- **Ödüllü reklam açılırsa:** "Reklam içeriyor = Evet" + Veri güvenliği'nde reklam kimliği.
- **Hesap türü ve geliştirici adı** (mağazada görünen "Quiz Tactics" / kişi adı) — Ida kararı.
  `/gizlilik`'te veri sorumlusu unvanı/adresi hâlâ eksik; kuruluş hesabında Play bu bilgiyi ister.
