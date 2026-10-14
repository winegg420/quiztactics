# android/ — Quiz Tactics Play Store paketi (TWA)

Trusted Web Activity: uygulama, Chrome'un adres çubuksuz tam ekran sekmesinde
`https://quiztactics.com/` açar. Oyun kodu burada DEĞİL — site güncellenince uygulama da güncellenir.
AAB yeniden yalnız paket ayarı (ad, simge, renk, sürüm) değişince gerekir.

| Ayar | Değer |
|---|---|
| Paket adı | `com.quiztactics.app` (`public/.well-known/assetlinks.json` ile aynı) |
| Ad (simge altı) | Quiz Tactics |
| Adres | https://quiztactics.com/ (başlangıç `/`) |
| Renk (açılış, durum/gezinme çubuğu) | `#3D8CE8` (manifest `theme_color`) |
| Ekran yönü | dikey (`portrait`) |
| Simge | `public/quiztactics-q-icon-512.png` (any + maskable, manifest ile aynı) |
| Bildirim | açık (Chrome bildirim delegasyonu → web push aynen çalışır) |
| minSdk / targetSdk | 24 / 36 (androidbrowserhelper 2.7.4 en az 24 ister) |
| Yükleme anahtarı | `C:\Users\ida\quiztactics-anahtar\upload.keystore`, alias `upload` (depo DIŞI) |
| İmzalı çıktılar | `C:\Users\ida\quiztactics-play\quiztactics-<sürüm>.aab / .apk` (depo DIŞI) |

Proje Bubblewrap ile üretildi (`twa-manifest.json` → `npx @bubblewrap/cli update`).
Araçlar sisteme kurulmadı; Bubblewrap'ın kendi klasöründe: `~/.bubblewrap/jdk` (Temurin 17),
`~/.bubblewrap/android_sdk` (cmdline-tools, build-tools 35, platform 35/36). Ayar:
`~/.bubblewrap/config.json`.

## Yeni sürüm çıkarmak

1. `twa-manifest.json` › `appVersionCode` +1 (her yüklemede ZORUNLU artar), `appVersionName`.
2. Proje dosyalarını yenile (depo kökünden, git bash):
   ```bash
   cd android && npx -y @bubblewrap/cli@latest update --skipVersionUpgrade
   ```
   (Simgeleri `iconUrl` adresinden indirir. Canlıya hiç istek atılmasın istenirse `public/`
   klasörü yerelde sunulup adres geçici olarak `http://127.0.0.1:<port>/...` yapılır — ilk
   üretim böyle yapıldı.)
3. İmzasız derle:
   ```bash
   export JAVA_HOME="$(cygpath -w ~/.bubblewrap/jdk/jdk-17.0.20.1+1)"
   export ANDROID_HOME="$(cygpath -w ~/.bubblewrap/android_sdk)"
   ./gradlew.bat bundleRelease assembleRelease --no-daemon
   ```
4. İmzala — **sahibi kendi PowerShell penceresinde**, şifreyi kendisi yazar:
   ```powershell
   powershell -ExecutionPolicy Bypass -File C:\Users\ida\Desktop\quiztactics\android\imzala.ps1
   ```
   Çıktı: `C:\Users\ida\quiztactics-play\quiztactics-<sürüm>.aab` (+ deneme APK'sı) ve yükleme
   anahtarının SHA-256 parmak izi.

## Anahtar ve şifre

- Keystore ve şifre ASLA depoya, loga, sohbete girmez (`.gitignore`: `*.keystore`, `*.jks`, `*.aab`, `*.apk`).
- Keystore'un bir yedeği depo dışında ayrı bir yerde (USB / şifre yöneticisi) tutulmalı.
- Play App Signing açık olacağı için bu anahtar yalnız **yükleme anahtarı**dır; kaybolursa Play
  Console › Uygulama bütünlüğü'nden sıfırlatılır (uygulama kaybolmaz).

## "Uygulama içinde mi" kapısı (src/lib/uygulamaKipi.js) — TWA doğrulaması

Dosyaya dokunulmadı; okunarak doğrulandı (14 Eki 2026):

- TWA açılışında Chrome sayfaya `document.referrer = "android-app://com.quiztactics.app/"` verir →
  `ilkOlcum` bunu `sessionStorage.qt_twa = "1"` olarak saklar; `uygulamaIcindeMi()` hem referrer'ı
  hem bu anahtarı okur → kapı açılır, kurulum sayfası gösterilmez.
- Doğrulanmış TWA ayrıca `display-mode: standalone` verir (manifest `display: standalone`), yani
  referrer kaybolsa bile ilk koşul tutar.
- Doğrulama başarısız olursa (assetlinks parmak izi yanlış/eksik) uygulama adres çubuklu Custom
  Tab'a düşer: `display-mode` artık `browser` olur ama referrer yine `android-app://` geldiği
  için kapı yine açılır — oyun oynanır, yalnız üstte adres çubuğu görünür. Adres çubuğu
  görünüyorsa sebep **assetlinks.json**'dur.
- Dikkat: `sessionStorage` sekme ömrüyle sınırlı; TWA'da sekme uygulama süreciyle aynıdır, yani
  uygulama kapatılıp açılınca referrer yeniden gelir. Sorun yok.
- Bulgu (değişiklik gerektirmez): `android-app://` öneki paket adına bakmaz; başka bir
  uygulamanın WebView'ı/Custom Tab'ı da bu referrer'la açarsa kapı açılır. Kapı zaten "deneyim
  kapısı, güvenlik değil" olarak tasarlandığı için kabul edilebilir.
