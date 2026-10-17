# Yayın günü geri alma rehberi (sade sürüm)

Bu belge **Ida için** yazıldı: kod bilmeden, adım adım izlenebilir. Teknik terimin yanında kısa açıklama var.
Ayrıntılı ve teknik sürüm: `docs/GERI-ALMA-PLANI.md` (migration tablosu, Edge Function dağıtımı, kim neyi yapar).
Bu belgede olmayan bilgi tahmin edilmedi; bulunamayan her şey **BİLİNMİYOR** olarak işaretli (§9).

> Adresler: site `https://quiztactics.com` · Supabase proje kimliği `etezccrifaetzrgfvawl` · tek dal `main`.
> İlke: önce **en hızlı ve en az riskli** adım. Sıra: kod (1–2 dk) → ayar kapatma → veritabanı (5–15 dk) → yedekten yükleme (son çare).

---

## 1. Belirti → ne yapılır

| Belirti | Önce bak | İlk aksiyon |
|---|---|---|
| **Site hiç açılmıyor** | `https://quiztactics.com/api/saglik` (sağlık adresi: `200` = site+veritabanı ayakta, `503` = veritabanına ulaşılmıyor) | `200` ise sorun yeni sürümde → **§2** (Vercel geri dönüş). `503` ise **Supabase paneli › proje durumu** (duraksamış/donmuş olabilir); gerekirse "Restart project". Kota dolduysa **§7** |
| **Giriş yapılamıyor** | Hata metni: `429 over_request_rate_limit` mı, e-posta kodu mu gelmiyor mu, Google mı | `429` → Supabase › Authentication › Rate Limits (anonim giriş IP başına sınırlı). Kod gelmiyor → Resend günlük limit (§7). Google/hepsi → son dağıtımdan sonra başladıysa **§2** |
| **Maç başlamıyor / eşleşmiyor** | Son migration veya dağıtım ne zaman? `/yonetim/izleme`'de hata kümesi | Dağıtımdan sonra → **§2**. Migration'dan sonra → **§4**. Sadece bir mod bozuksa o modu **§6** ile kapat |
| **Ses / ekran bozuk (tek cihazda değil herkeste)** | Sentry paneli + `/yonetim/izleme` (ses_gec/ses_yok/kasma olayları) | İstemci kodu sorunudur → **§2** ya da **§3**. Veritabanına dokunma |
| **Veritabanı hatası / donma** | Supabase › Reports › Database (Disk IO, CPU) | Ücretsiz Nano sunucu yük altında donabiliyor. Yeni yük (test, betik, cron) varsa durdur. Donmuşsa panelden yeniden başlat. Geri yükleme (§5) **en son çare** |
| **Kota doldu** (Supabase egress/log, Resend 100 mail/gün, Vercel 100 dağıtım/gün) | İlgili panelin kullanım sayfası | **§7** |
| **Push bildirimi gitmiyor** | Edge Function `send-push` günlükleri | `docs/GERI-ALMA-PLANI.md §5` (JWT uyarısı: `--no-verify-jwt` unutulursa push sessizce kırılır) |

---

## 2. Web sürümünü önceki sürüme döndürme

**Bu repoda uygulanabilir iki yol var.** Vercel doğrudan kaynak dağıtımı **yapılmaz** (bir sonraki push'ta silinir, 13 Eyl'de yaşandı) — canlıya yalnız GitHub push'u çıkar.

### 2a. Vercel'de önceki dağıtıma dönüş (en hızlı, ~1 dk — Ida yapar)
(Instant Rollback = yeniden derlemeden eski yayını geri açar.)
1. Vercel paneli → projeyi aç → **Deployments**.
2. Son **sağlıklı** Production dağıtımını bul (bozuk olanın bir altı).
3. Sağdaki **⋯** → **Instant Rollback** → onayla. Seçenek yoksa aynı menüden **Promote to Production**.
4. Doğrula: `/api/saglik` ve ana sayfa; `https://quiztactics.com/version.json` eski commit kimliğini göstermeli.
5. **Dikkat:** Rollback sonrası Vercel yeni push'ları otomatik yayına almayı durdurur. Düzeltme push'lanınca yeni dağıtımı elle **Promote** et, yoksa düzeltme canlıya çıkmaz.
6. Sadece **kodu** geri alır; veritabanı değişmez.

### 2b. Git revert (kalıcı çözüm — Claude Code yapar)
(Revert = bozan değişikliğin tersini yeni bir kayıt olarak ekler; geçmiş silinmez.)
```bash
git pull
git log --oneline -15          # bozan commit'in kısa kimliğini bul
git revert <kimlik>            # birkaç ardışık commit: git revert <eski>..<yeni>
npm run build                  # hatasız olmalı
git push origin main           # Vercel yeniden derler
```
- `git reset --hard` ve `git push --force` **yasak** (13 Eyl'de 26 commitlik iş görünmez oldu).
- `vite.config.js` içindeki **dört giriş** listesine dokunan commit geri alınıyorsa dört girişin yerinde kaldığını doğrula.
- Push sonrası `https://quiztactics.com/version.json` içindeki commit kimliğinin yeni push ile aynı olduğunu kontrol et.

---

## 3. Android / PWA tarafı

- Oyun **web uygulamasıdır**. Ana ekrana eklenmiş PWA ve Android'in Play Store sürümü (TWA = Play paketi içinde sitenin kendisini açan kabuk) **aynı siteyi** yükler. Yani §2'deki her geri alma Android/PWA'ya da otomatik yansır.
- Uygulama yeni sürümü `version.json` ile fark eder (`oyun/lib/surumKontrol.js`) ve yeni sürümü arka planda indirir. Geri alınca eski sürüm kimliği yayında olur; açık olan uygulamalar bir sonraki yoklamada kendini günceller. Tarayıcı önbelleği: `/assets/*` değişmez (hash'li dosya), `version.json` önbelleğe alınmaz (`vercel.json`).
- **Geri alınamayan:** Play Store'a yüklenmiş AAB/APK paketinin kendisi (`android/`, `C:\Users\ida\quiztactics-play\quiztactics-1.0.0.aab`). Sorun pakette ise yeni sürüm yüklemek ve Play incelemesi gerekir; bu günler sürebilir. Pakette oyun mantığı yok, bu yüzden sorun neredeyse her zaman web tarafındadır.
- Digital Asset Links (`public/.well-known/assetlinks.json`): Play App Signing izi hesap açılınca eklenecekti — **Play hesabı/yayın durumu BİLİNMİYOR** (§9).
- iOS: ana ekrana eklenmiş PWA; ayrı paket yok, §2 yeterli.

---

## 4. Migration geri alma

(Migration = veritabanını değiştiren numaralı SQL dosyası.) **Kurallar**
1. Mevcut migration **düzenlenmez**; geri alma = aşağıdaki `docs/*-geri-al*.sql` dosyası ya da **yeni numaralı** migration.
2. Önce dosyanın **ilk satırlarındaki yorumu oku** (neyi geri aldığı, "önce istemciyi geri al" uyarısı, yalnız kapatmak için tek ayar var mı).
3. İstemci kodu o migration'ın eklediği fonksiyonu kullanıyorsa **önce §2** (kod), **sonra** SQL.
4. Çoklu migration geri alınacaksa **sondan başa** git (1128 → 1126 → 1125 …). Yani en yeni migration önce geri alınır.
5. Canlıda **tek seferde, elle** (Supabase › SQL Editor ya da `node araclar/pg-mini.mjs`). Prova: `node araclar/migration-prova.mjs docs/<dosya>.sql` (işlemi açar, sonunda geri alır). Simülasyon / döngü / toplu deneme **yok** (10 Eki disk olayı).
6. **Yetki / RLS / GRANT** içeren geri almalar (1047, 1053, 1054, 1066, 1106) önce Ida'ya sorulmadan çalıştırılmaz.
7. Özellik **ayarla kapatılabiliyorsa** dosya yerine ayarı kapat (§6) — daha hızlı ve riski düşük.

### Son migration'lar (1119–1128)

| No | Ad | Geri alma dosyası | Not |
|---|---|---|---|
| 1119 | `izleme_kasma` | `docs/izleme-1119-geri-al.sql` | `kasma` kayıtlarını siler (yalnız izleme verisi) |
| 1120 | `tepki_paketi_tum_modlar` | `docs/tepki-1120-geri-al.sql` | Tepki yalnız Antrenman'a + eski 6 emoji. Sadece kapatmak için: `tepki_bot_olasilik = 0` |
| 1121–1124 | — | — | Numara kullanılmadı (migration yok) |
| 1125 | `kasa_bot_joker` | `docs/kasa-bot-joker-1125-geri-al.sql` | Yalnız kapatmak: `kasa_bot_joker_yuzde = 0` |
| 1126 | `bot_parite` | `docs/bot-parite-geri-al.sql` | **1126 + 1127 + 1128'i birlikte** geri alır (tek dosya) |
| 1127 | `bot_grup_tepki` | `docs/bot-parite-geri-al.sql` | aynı dosya |
| 1128 | `bot_grup_turnuva_joker` | `docs/bot-parite-geri-al.sql` | aynı dosya |

Eski (1114–1118): 1114 `docs/sure-doldu-1114-geri-al.sql` · 1115 `docs/dereceli-1115-geri-al.sql` · 1116 `docs/izleme-1116-geri-al.sql` · 1117 `docs/sesli-sohbet-1117-geri-al.sql` · 1118 `docs/soru-duzelt-2-geri-al.sql`.

**Geri alma dosyası OLMAYAN migration var mı (1119–1128 içinde):** hayır, hepsinin dosyası var. 1041–1106 arasında dosyası olmayanların listesi `docs/GERI-ALMA-PLANI.md §3b`'de. Dosyası olmayan için: yeni numaralı bir geri alma migration'ı yazılır, eski fonksiyon gövdesi en son yedeğin `sema.sql` dosyasından alınır, önce prova koşulur.

**Migration numarası kuralı:** paralel pencerelerde numara önceden ayrılır; geri alma migration'ı da başkasının aralığından numara almaz.

---

## 5. Veritabanını yedekten geri yükleme (son çare)

Ücretsiz Supabase planında **otomatik yedek yoktur**; elimizdekiler:

| Yedek | Nerede | Not |
|---|---|---|
| Elle alınan tam yedek (`node araclar/yedek-al.mjs`) | `C:\Users\ida\Desktop\quiztactics-yedek\YYYY-MM-DD\` | Şema + veri + Storage dosyaları + `manifest.json`. ~82 MB, ~2 dk, canlıya yalnız okur |
| Ikinci kopya | `C:\Users\ida\OneDrive\quiztactics-yedek\2026-10-14` (OneDrive, kişisel hesap) | 14 Eki'de 481 dosya / 86.102.713 bayt, kaynakla birebir doğrulandı |
| Gece yedeği (GitHub Actions `veritabani-yedek.yml`, her gün 03:00 TSİ) | Actions › ilgili çalıştırma › **Artifact** (14 gün saklanır) | Her gece boş bir Postgres'e geri yükleyip satır sayılarını karşılaştırır; tutmazsa "Gece yedeği başarısız" konusu açar. **Gece yedeği `SUPABASE_DB_URL` secret'ı güncellenene kadar kırıktır** (14 Eki parola değişimi) — güncel durum **BİLİNMİYOR**, yayından önce `gh workflow run veritabani-yedek.yml` ile doğrula |

**Test edilmişlik:** 14 Eki 2026'da geçici Postgres'e `geri-yukle.mjs` ile yükleme denendi: 172/172 tablo, 834/834 fonksiyon, 103/103 tetikleyici, veri satır sayıları eşleşti. Policy 130/133 (3 storage policy'si yerelde kurulamadı). **Canlıya (Supabase'e) gerçek geri yükleme hiç denenmedi.**

### Komutlar
```bash
node araclar/yedek-al.mjs      # taze yedek (parola .env.local › SUPABASE_DB_PASSWORD)

# Yerel Postgres'e yükleme (inceleme/doğrulama; Docker gerekir)
npx supabase start
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres node araclar/geri-yukle.mjs C:\Users\ida\Desktop\quiztactics-yedek\YYYY-MM-DD
# çıktıda "TÜM SAYILAR EŞLEŞTİ" yazmalı
```

**Önemli sınır:** `geri-yukle.mjs` yalnız yerel adrese (127.0.0.1/localhost) yükler; canlıya yazmayı kod olarak reddeder. Yani canlıyı geri yüklemek tek komut **değildir**: yeni Supabase projesi açılır, `sema.sql` + `veri/*.ndjson` oraya yüklenir, `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (Vercel ortam değişkenleri) ve Edge Function sırları yeniden girilir, Edge Function'lar yeniden dağıtılır, Auth ayarları (Google, Resend SMTP, e-posta şablonları `docs/eposta-sablon-*.json`) yeniden yapılır. Yedek tarihinden sonraki oyuncu verisi **kaybolur**. Bu işlem **Ida'nın açık onayıyla** başlar.

Yedek kullanıcı verisi içerir (e-posta, hesap kayıtları): repoya, sohbete, paylaşım linkine **konmaz**.

---

## 6. Acil kapatma düğmeleri

**Tam siteyi kapatan bakım modu: YOK** (hazır bir "bakım sayfası" anahtarı bulunamadı). Yerine: §2 ile sağlıklı sürüme dön ya da aşağıdaki gibi yalnız bozuk özelliği kapat.

Ayarlar `oyun_ayarlari` tablosunda (anahtar → değer). Değiştirme: Supabase › SQL Editor'da `update public.oyun_ayarlari set deger = '<değer>'::jsonb where anahtar = '<anahtar>';` Ayar değişince `PROJECT_CONTEXT.md`'deki satır da güncellenir.

| Anahtar | Ne yapar | Kapatma değeri |
|---|---|---|
| `duello_v4_acik` | Düello v4: `"acik"` herkes · `"test"` yalnız 6 test hesabı · `"kapali"` kapalı (eski biçim) | `"test"` (hızlı geri alma: `docs/duello-v4-acik-geri-al.sql`) |
| `kasa_modu_acik` | Ortak Hazine modu (mod kartları ve davetler gizlenir) | `false` |
| `hizli_mod_acik`, `hizli_mac_acik` | Hızlı Mod / "Hızlı Olan Kazanır" (zaten `false`) | `false` |
| `kozmetik_satis_acik` | Kozmetik satışı: `true` yalnız aktifleri satar | `false` |
| `cevap_imzasi_satis_acik` | Dükkân › Efekt herkese açık; `false` = yalnız sahip hesap | `false` |
| `elmas_satin_alma_acik` | Gerçek parayla elmas satışı (şu an `0` = kapalı) | `0` |
| `sezon_yolu_acik` | Sezon Yolu | `false` (dikkat: kapanınca sezon durur) |
| `tepki_bot_olasilik` / `tepki_acik_modlar` | Bot tepkisi / tepkinin açık olduğu modlar | `0` / `["antrenman"]` |
| `klasik_bot_joker_yuzde`, `duello_bot_joker_yuzde`, `kasa_bot_joker_yuzde` | Bot joker kullanımı (%) | `0` |
| `kasa_bot_gecikme_profili` | Hazine bot gecikme profili | `0` = eski 2–6 sn |
| `bot_soru_isabet`, `bot_zorluk_ofset`, `bot_gecikme_sn`, `bot_kategori_isabet` | Bot oranları/zorluğu (bot ne sıklıkla doğru bilir, ne kadar bekler) | Ayarlar var; **güvenli değer BİLİNMİYOR** — değiştirmeden önce `PROJECT_CONTEXT.md`'ye bak |
| `soru_kapsam_filtresi_acik` | Soru kapsam (ülke/bölge) filtresi | `false` |
| `turnuva_saat_sabah`, `turnuva_saat_aksam`, `turnuva_lobi_acilis_dk` | Turnuva saatleri/lobi. Eski saat anahtarları yerine liste `oyun/lib/zaman.js › VARSAYILAN_LISTE`'de. **Turnuvayı tek ayarla kapatan düğme bulunamadı** | BİLİNMİYOR |
| İstemci bayrakları `oyun/lib/ozellikBayraklari.js` (`MEYDAN_ACIK`, `GARDIROP_ACIK`) | Meydan / Gardırop | Koda dokunur = yeni dağıtım gerekir (§2b) |
| Bot oyun döngüsü (`bot_oyna` cron) | Botları durdurmak | **Ayrı bir "botları kapat" ayarı YOK**; cron durdurma veritabanı işlemidir (`cron.unschedule`), Ida onayı gerekir |
| **Yeni kayıt kapatma** | Yeni oyuncu alımını durdurmak | **YOK** (Supabase › Authentication › Sign In / Providers panelinden elle kapatılabilir; bu repoda ayar yok) |
| **Genel bakım modu** | Siteyi bakım sayfasına almak | **YOK** |

Duyuru: oyun içi posta kutusu `https://quiztactics.com/yonetim/posta` (yalnız sahip; başlık + metin + isteğe bağlı ödül, oyuncu uygulamayı açınca görür). Push bildirimi `send-push` ile, yalnız abone olanlara.

---

## 7. Kontrol listeleri

### Yayın günü sabahı
1. `https://quiztactics.com/api/saglik` → `200 {"durum":"ok"}`.
2. `https://quiztactics.com/version.json` → son push'un commit kimliği.
3. **UptimeRobot**: izleyici `/api/saglik` adresini 5 dk'da bir kontrol ediyor mu, bildirim e-postası doğru mu. (Kurulumu **Ida yapar**; kurulup kurulmadığı **BİLİNMİYOR**.)
4. **Sentry paneli**: gece yeni hata kümesi var mı. (`VITE_SENTRY_DSN` Vercel'de tanımlı değilse hata izleme çalışmaz — tanım durumu **BİLİNMİYOR**.)
5. `/yonetim/izleme`: son 24 saatte hata/olay özeti.
6. **GitHub › Actions › Veritabanı Yedeği**: son gece yeşil mi. Değilse `SUPABASE_DB_URL` secret'ını güncelle.
7. **Taze yedek**: `node araclar/yedek-al.mjs` + OneDrive kopyası.
8. **Supabase**: proje durumu, Reports › Database (Disk IO), kullanım/egress kotası, Authentication › Rate Limits (anonim giriş sınırı yayın günü için yeterli mi).
9. **Resend**: bugünkü gönderim sayısı (ücretsiz planda **günde 100 mail**; dolunca e-posta giriş kodu gitmez, hata uyarı e-postası da bu kotadan yenir).
10. **Vercel**: bugünkü dağıtım sayısı (günlük 100 sınır) — yayın öncesi küçük push'ları biriktir.
11. Telefonda yeni (misafir) oturum aç, bir maç başlat.

### Yayından 1 saat sonra
1. `/api/saglik` yeniden; UptimeRobot'ta kesinti yok.
2. Sentry'de yeni hata kümesi / hata patlaması (uyarı eşiği: 10 dk'da ≥ 50 hata → `info@quiztactics.com`'a e-posta, saatte en çok 1).
3. `/yonetim/izleme`: kayıt/giriş sayısı, maç başlama oranı, kasma/ses_yok olayları.
4. Supabase: Disk IO ve CPU yükselmiş mi, egress.
5. Resend: kullanım günlük 100'ün ne kadarı; yeni kayıt hızı 100'ü aşacak gibiyse **kota dolmadan** planı yükselt.
6. Supabase Auth: `429 over_request_rate_limit` şikâyeti var mı.
7. `info@quiztactics.com` kutusunda oyuncu şikâyeti.

> Yayın günü canlıya yük bindiren **hiçbir test/betik** çalıştırılmaz (kural: canlıda toplu istek yok). Doğrulama için tek seferlik `node araclar/oyuncu-testi.mjs --adres=https://quiztactics.com`.

---

## 8. İletişim

- Destek/iletişim: **info@quiztactics.com** (Cloudflare yönlendirmesi; Play Console ve gizlilik sayfasında da bu adres).
- Oyunculara duyuru: oyun içi posta (`/yonetim/posta`, §6) ve push (`send-push`). Sosyal medya/e-posta bülteni gibi başka bir duyuru kanalı: **BİLİNMİYOR**.
- Geliştirme: Claude Code veya Codex, **aynı anda tek araç**; push öncesi `git pull`, force push yok.
- Hesaplar (Vercel, Supabase, UptimeRobot, Resend, Sentry, Play Console) **Ida'dadır**; Claude şifre/anahtar görmez.

---

## 9. BİLİNMİYOR listesi

Repoda bulunamadığı için tahmin edilmedi:
1. Gece yedeği iş akışının şu anki durumu (`SUPABASE_DB_URL` secret'ı güncellendi mi, son çalıştırma yeşil mi).
2. UptimeRobot izleyicisinin kurulu olup olmadığı, bildirim adresi.
3. `VITE_SENTRY_DSN`'in Vercel'de tanımlı olup olmadığı.
4. Supabase anonim giriş hız sınırının güncel değeri (panelde).
5. Play Console hesabı / uygulamanın yayın durumu (AAB hazır; Play App Signing izi `assetlinks.json`'a eklendi mi).
6. Turnuvayı tek ayarla kapatan düğme.
7. Bot oranı ayarlarının (`bot_soru_isabet`, `bot_zorluk_ofset`, `bot_gecikme_sn`, `bot_kategori_isabet`) güvenli/kapalı değerleri.
8. Genel bakım modu ve yeni kayıt kapatma anahtarı (yok olduğu doğrulandı; panelden elle yapılır).
9. Oyunculara başka duyuru kanalı (sosyal medya, e-posta listesi).
10. Vercel planı (Hobby/Pro) ve "önceki dağıtım" seçeneği sayısı.
