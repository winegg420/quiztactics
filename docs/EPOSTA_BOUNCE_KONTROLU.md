# E-posta "bounce" uyarısı kontrolü (2 Eki 2026)

Salt okunur inceleme. Veritabanına yazılmadı, hesap silinmedi, ayar değişmedi. Adresler maskelidir (ilk 3 harf + alan adı).

Supabase uyarısı: 2 Eki 2026 00:05 (TSİ). Konu: projenin işlemsel e-postalarında yüksek geri dönme (bounce) oranı.

## Sonuç (kısa)

**Sahte/test hesap kaynaklı değil.** Test ve denetim betikleri e-posta göndermiyor. Uyarıdan ~2 dakika önce gerçek giriş formundan **aynı adrese iki kez** kayıt/bağlantı isteği gitmiş: `bbu***@icloud.com`.

- 1 Eki 21:03:04 UTC (= 2 Eki 00:03 TSİ) ve 21:04:44 UTC (00:04 TSİ): iki ayrı kullanıcı kaydı, ikisinde de `confirmation_sent_at` dolu, ikisi de doğrulanmamış.
- Uyarı bundan 1–2 dakika sonra geldi.
- Proje çok az e-posta gönderdiği için (son 30 günde yalnız 4 doğrulama maili) **2–3 geri dönen mail bile oranı yükseltiyor**.
- Adresin yazım hatası olup olmadığı veritabanından anlaşılamaz. Gerçek bir kişi mi denedi, yoksa adres var olmayan bir kutu mu, bunu yalnız Ida bilebilir. `bbu***` Ida'nın adresiyse bunu Ida bilir.

## 1) auth.users ölçümü

| Ölçü | Değer |
|---|---|
| Toplam hesap | 273 |
| Anonim (misafir) | 85 |
| E-postalı | 188 |
| E-postalı ve doğrulanmamış | **3** |

E-posta alan adı dağılımı (e-postalı 188 hesap):

| Alan adı | Hesap | Doğrulanmamış |
|---|---|---|
| bildim.local | 157 | 0 |
| gmail.com | 22 | 0 |
| icloud.com | 4 | 2 |
| bildim.app | 3 | 0 |
| outlook.com | 1 | 1 |
| googlemail.com | 1 | 0 |

- `bildim.local` (157) ve `bildim.app` (3): gizli bot hesapları. Migration'larda doğrudan `auth.users` içine, **doğrulanmış** olarak eklenmiş (`supabase/migrations/20260612000004`, `…007`, `…068`, `…150`). `confirmation_sent_at` boş → bunlara **hiç e-posta gitmedi**, bounce üretemez.
- Doğrulanmamış 3 adres:
  - `bbu***@icloud.com` — 1 Eki 21:03 UTC
  - `bbu***@icloud.com` — 1 Eki 21:04 UTC (aynı adres, ikinci kayıt)
  - `sil***@outlook.com` — 24 Eyl 17:55 UTC
- Son 7 günde e-posta tetikleyen: doğrulama maili **2** (ikisi de `bbu***`), kurtarma 0, e-posta değişimi 0.
- Son 30 günde doğrulama maili 4: `bbu***` ×2, `sil***@outlook.com` (24 Eyl), `sil***@icloud.com` (8 Eyl; sonradan doğrulanmış).
- example.com / test / fake / mailinator / nonexistent alan adlı hesap: **yok**. Şüpheli listesi yalnız `bildim.local` botlarından oluşuyor (bunlar mail almaz).
- Anonim hesaplar e-posta taşımaz; mail tetiklemez (son 30 günde günde 0–16 anonim hesap açılmış, yani denetim/test oturumları misafir olarak giriyor).

## 2) auth.audit_log_entries

Tablo var ve okunabiliyor ama **0 satır** (proje günlüğü bu tabloya yazmıyor). Bu yüzden olay türü/gün dağılımı çıkarılamadı; kanıt `auth.users` zaman damgalarından alındı. Gönderim ve bounce kayıtları için Supabase panelinde Authentication → Logs ve e-posta uyarı mesajındaki ayrıntıya bakılmalı (Ida).

## 3) Kod taraması

E-posta gönderen tek istemci yerleri:
- `src/pages/Login.jsx:164` — `signInWithOtp({ email })` (e-posta bağlantısıyla giriş; `shouldCreateUser` varsayılan açık, yani yazım hatalı adres bile **yeni hesap açıp** mail yollar).
- `oyun/components/HesapGuvence.jsx:74` — `updateUser({ email })` (misafir hesabı e-postaya bağlama; doğrulama maili gider).

`signUp`, `resetPasswordForEmail`, `auth.resend`, `admin.createUser`, `generateLink`, `inviteUserByEmail` depoda **kullanılmıyor**.

Test/denetim betikleri (`araclar/`, `_test/`, `oyun/_test/`, `scripts/`): `example.com`, `test@`, `fake`, `+test`, `mailinator` veya rastgele adres üreten **hiçbir yer yok**; e-posta ile kayıt çağrısı da yok. `araclar/arayuz-denetim.mjs` "Misafir olarak dene" ile (anonim) oturum açıyor. Sorumlu betik: **yok**. Tek e-posta içeren test dosyası `src/lib/_test/hata-izleme-test.mjs` (gizlilik temizleme testi; ağa çıkmaz).

## 4) Giriş akışı ve öneriler (uygulanmadı)

Bugün: `Login.jsx` yalnız biçim denetimi yapıyor (`/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`). "Yeniden gönder" düğmesi var ama **istemci tarafı bekleme süresi yok**; sunucuda Supabase'in adres başına varsayılan sınırı geçerli. Aynı adrese kısa sürede iki kayıt açılabildi (kanıt yukarıda).

Öneriler:
1. **Yaygın alan adı yazım uyarısı** ("gmial.com → gmail.com demek mi istedin?"; gmail/hotmail/outlook/icloud/yahoo için küçük bir liste) — yeni paket gerekmez.
2. **Göndermeden önce "Bu adrese gönderilecek: …, doğru mu?" onayı**; ikinci kez aynı alanı yazdırmak da seçenek.
3. **"Yeniden gönder"e 60 sn geri sayım** ve gönderildi ekranında adresin görünür olması ("Yanlışsa geri dön").
4. Tek kullanımlık/geçici e-posta alan adlarını (mailinator, 10minutemail vb.) reddeden küçük bir engel listesi.
5. Yayın öncesi Google ile girişi ön plana almak (Google hesabının adresi doğrulanmış olduğundan bounce üretmez): kimlik sağlayıcı dağılımı şu an google 23, e-posta 6.

## 5) Öneri özeti

**(a) En olası kaynak:** `bbu***@icloud.com` adresine 2 Eki 00:03 ve 00:04 (TSİ) iki doğrulama bağlantısı; ikisi de hiç doğrulanmadı, uyarı 1–2 dk sonra geldi. Küçük hacimde bu iki mail oranı yüksek gösterir. Bu adres gerçek ve ulaşılabilir ise başka bir sebep aranmalı: bu durumda Supabase e-posta uyarı ayrıntısına ve panel loglarına bakılmalı (benden doğrulanamadı).

**(b) Test için:** sahte adres yerine **misafir (anonim) hesap** (denetim araçlarının bugün yaptığı), e-posta akışı gerekiyorsa **gerçek Gmail +alias** (`ad+test1@gmail.com`); `example.com`, `test.com` kullanma.

**(c) Temizlik adayları (SİLİNMEDİ, Ida onayı gerekir):**
- `bbu***@icloud.com` — 2 kayıt (1 Eki), doğrulanmamış, hiç oturum açmamış.
- `sil***@outlook.com` — 1 kayıt (24 Eyl), doğrulanmamış, hiç oturum açmamış.
Doğrulanmamış hesap kalması yeni bounce üretmez; silmek zorunlu değil. Bot hesapları (`bildim.local`/`bildim.app`) oyunun parçası, **silinmemeli**.

**(d) Yayın öncesi özel SMTP:** Supabase'in yerleşik e-posta gönderimi yalnız deneme içindir, sıkı hız sınırı vardır ve bounce itibarı projeye bağlıdır. Gerçek oyuncu gelmeden önce kendi alan adından (ör. `bildim.app`) Resend veya AWS SES kurulmalı: alan adı doğrulaması (SPF, DKIM, DMARC kayıtları), Supabase panelinde Authentication → SMTP ayarına gönderici bilgisinin girilmesi, e-posta şablonlarının gönderici adıyla uyumlanması ve bounce/şikayet bildirimlerinin açılması gerekir. Supabase'i yeni Gmail hesabına taşıma planı yapılacaksa bu ayar taşıma sırasında aynı anda kurulabilir (yeni projede SMTP baştan doğru girilir, iki kez iş yapılmaz).
