# Telefon kontrol listesi — "yalnız uygulama" (14 Eki 2026)

Gerçek telefonda, sırayla. Her madde ✓ / ✗ + kısa not. ✗ çıkan maddeyi ekran görüntüsüyle bildir.
Otomatik testler (taklit, canlıya yük yok): `araclar/uygulama-kapisi-testi.mjs`, `eposta-kod-testi.mjs`,
`davet-eslestirme-testi.mjs`, `push-kapisi-testi.mjs` — headless'ta ölçülemeyenler aşağıda.

Hazırlık: Telefonda Quiz Tactics kuruluysa önce sil (iPhone: simgeye basılı tut → Uygulamayı Sil;
Android: simgeye basılı tut → Kaldır). Bir arkadaşının (ya da ikinci hesabın) davet linkini hazır tut
(Arkadaşlar › Davet et › linki kopyala).

## iPhone (Safari)

1. **Kapı** — Safari'de `quiztactics.com/turnuva` aç → oyun DEĞİL, "Quiz Tactics bir uygulama" kurulum sayfası.
   Altta 4 adım (Paylaş → Ana Ekrana Ekle → Ekle → simgeden aç).
2. **Yanlış tarayıcı** — Aynı linki iPhone'da Chrome'da ya da Instagram mesajından aç → "iPhone'da uygulama
   Safari'den kurulur" + "Bağlantıyı kopyala". Kopyala → Safari'ye yapıştır → 1. maddedeki sayfa.
3. **Davet linki** — Arkadaşının davet linkini Safari'de aç → kurulum sayfasında "Davet kodun" kartı ve 8 harfli kod.
4. **Kurulum** — Paylaş → Ana Ekrana Ekle → Ekle. Ana ekrandaki Quiz Tactics simgesinden aç → tam ekran, adres çubuğu yok.
5. **E-posta kodu** — Uygulamada e-posta adresini yaz → "E-posta ile giriş kodu al".
   - E-posta **tamamen Türkçe** (konu dahil), **bağlantı yok**, yalnız 8 haneli kod.
   - Klavyenin üstünde kod önerisi çıkıyor mu? (Mail uygulamasından otomatik doldurma — çıkmazsa sorun değil, not et.)
   - Kodu yaz → "Giriş yap" → oyun açılır. Yanlış kodda "Kod yanlış ya da süresi dolmuş" uyarısı.
   - Dil EN iken tekrar dene (giriş ekranında EN) → e-posta tamamen İngilizce.
6. **Davet "doğru mu?"** — 3. maddedeki linki açtığın **aynı Wi-Fi'de**, YENİ bir hesapla giriş yap (ad/avatar
   kurulumunu bitir) → "X seni davet etti, doğru mu?" sorusu. Evet → "artık arkadaşsınız". (Mobil veride IP
   değişebilir → soru çıkmayabilir; o zaman Arkadaşlar › Davet koduyla ekle'ye 3. maddedeki kodu yapıştır.)
7. **Bildirim izni** — Bir maç bitir, ana sayfaya dön → bildirim şeridi → "Aç" → iPhone izin penceresi
   (iOS 16.4+). İzin ver → Profil › Ayarlar › Bildirimler açık. iOS 16.4 öncesinde "iOS 16.4 veya üstü gerekir".
8. **Google** — Uygulamada "Google ile giriş" → sonucu yaz:
   A) uygulamanın içinde oyuna döndü · B) üstte bir tarayıcı katmanı açıldı, dönüşte kurulum sayfası çıktı ya da
   giriş olmadı · C) başka (ekran görüntüsü).
9. **Safari'de oyun yok** — Uygulama kuruluyken Safari'de quiztactics.com → yine kurulum sayfası (beklenen).

## Android (Chrome)

1. **Kapı** — Chrome'da `quiztactics.com/turnuva` → kurulum sayfası. Birkaç saniye içinde **"Uygulamayı yükle"**
   düğmesi (çıkmazsa: menü ⋮ → "Uygulamayı yükle" anlatımı).
2. **Uygulama içi tarayıcı** — Linki Instagram/WhatsApp/Facebook mesajından aç → "Chrome'da aç" düğmesi →
   Chrome açılır, aynı sayfa.
3. **Davet linki** — Arkadaşının davet linkini Chrome'da aç → "Davet kodun" kartı.
4. **Kurulum** — "Uygulamayı yükle" → Yükle → "Uygulama kuruldu" yazısı. Simgeden aç → tam ekran.
5. **E-posta kodu** — iPhone 5. madde ile aynı (TR ve EN, bağlantı yok, kodla giriş).
6. **Davet** — 3. maddeden sonra uygulamada YENİ hesapla giriş → davet kendiliğinden bağlanır (Android'de
   Chrome ile uygulama aynı depoyu kullanır; "doğru mu?" sorusu çıkmaz, Arkadaşlar'da istek/arkadaşlık görünür).
7. **Bildirim izni** — Maç sonrası ana sayfada şerit → "Aç" → Android izin penceresi → izin ver → bir arkadaşın
   sana meydan okusun → bildirim gelir, dokununca uygulama açılır.
8. **Google** — Uygulamada "Google ile giriş" → oyuna dönüyor mu (iPhone 8. madde ile aynı A/B/C).
9. **Chrome'da oyun yok** — Uygulama kuruluyken Chrome'da quiztactics.com → kurulum sayfası ("Zaten kuruluysa
   uygulamadan aç").

## Masaüstü (isteğe bağlı)

- Chrome/Edge: adres çubuğundaki yükle simgesi ya da "Uygulamayı yükle" düğmesi → pencere olarak açılır.
- Firefox: "Bu tarayıcı uygulama kuramıyor" + QR → telefonla okut → telefonda kurulum sayfası.
- macOS Safari 17+: Dosya → Dock'a Ekle → Dock'tan aç.
