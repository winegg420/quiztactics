# Yayın günü geri alma planı

Yayın günü bir şey bozulursa **sırayla** şunlar yapılır. Hız için önce en hızlı ve en az riskli adım:
site/uygulama kodu (1–2 dk) → gerekirse veritabanı (5–15 dk). Her adımda neyin geri alındığını
bilmeden bir sonrakine geçme.

> Proje adresi: `https://quiztactics.com` · Supabase proje kimliği: `etezccrifaetzrgfvawl` (eu-central-1) ·
> Dal: yalnız `main`. Bu belgedeki her komut/yol repoda doğrulanmıştır (15 Eki 2026).

## 0. Önce teşhis (2 dk)

| Bakılacak yer | Ne söyler |
|---|---|
| `https://quiztactics.com/api/saglik` | `200 {"durum":"ok"}` = Vercel + veritabanı ayakta; `503` = veritabanına ulaşılamıyor |
| UptimeRobot paneli | Kesinti başlangıcı ve süresi (bekçi yoksa bkz. §7) |
| `/yonetim/izleme` (yalnız sahip) | Son 24 saatteki istemci hataları, olaylar; hata patlaması hangi sayfada |
| Sentry paneli | Hata kümesi ve hangi sürümden başladığı |
| Vercel › Deployments | Son dağıtım ne zaman, hata verdi mi |
| Supabase › Logs | Veritabanı / Auth / Edge Function hataları |

Karar ağacı:
- Sorun **yeni dağıtımdan sonra** başladı, veritabanı sağlıklı → §1 (Vercel geri dönüşü) + §2 (git revert).
- Sorun **yeni migration'dan sonra** başladı → §3 (migration geri alma).
- Veritabanı erişilemiyor / yük altında donuyor → §5 değil, önce Supabase panelinde proje durumu ve
  Disk IO; geri yükleme son çaredir (§4).
- Push bildirimleri gitmiyor → §5.
- Oyunculara haber vermek gerekiyor → §6.

## 1. Vercel'de önceki sürüme dönüş (Instant Rollback)

Kod sorunu için en hızlı yoldur; yeniden derleme beklemez.

1. Vercel paneli → projeyi aç → **Deployments** sekmesi.
2. Listede **son sağlıklı Production** dağıtımını bul (hata verenin altındaki, "Production" etiketli).
3. Satırın sağındaki **⋯ (üç nokta)** menüsü → **Instant Rollback** → onayla.
4. Birkaç saniye içinde `quiztactics.com` o sürümü sunar. Doğrula: `/api/saglik` ve ana sayfa.

Dikkat:
- Instant Rollback sonrası Vercel, alan adının **yeni push'larla otomatik yeni sürüme gitmesini durdurur**.
  Düzeltme push'ladıktan sonra yeni dağıtımı **Promote to Production** ile elle yayına almak (ya da panelde
  "auto-assign domains"i yeniden açmak) gerekir. Bunu unutursan düzeltme canlıya çıkmaz.
- Plan sınırı: ücretsiz (Hobby) planda yalnız bir önceki Production dağıtımına dönülebilir; listede
  seçenek görünmüyorsa o dağıtımı ⋯ → **Promote to Production** (ya da **Redeploy**) ile yayına al.
- Vercel'e kaynaktan doğrudan dağıtım **yapılmaz** (`CLAUDE.md` › Yayın): bir sonraki normal push'ta silinir.
  Panel geri dönüşü yalnız geçici kurtarmadır; kalıcı çözüm §2'dir.
- Vercel yalnız **kodu** geri alır. Veritabanı (migration/ayar) etkilenmez.

## 2. Git'te geri alma (revert; force push YOK)

Bozuk işi tarihi silmeden, "tersini uygulayan yeni commit" ile geri al:

```bash
git pull                       # güncel main
git log --oneline -15          # bozan commit'i bul (kısa kimlik: 7fff98fa gibi)
git revert <commit>            # tek commit'in tersini yeni commit olarak ekler
git revert <eski>..<yeni>      # ardışık birkaç commit'i geri al (yeni dahil, eski hariç)
npm run build                  # derleme hatasız olmalı
git push origin main           # Vercel yeniden derler; --force KULLANMA
```

- `git reset --hard` + `git push --force` **yapılmaz**: 13 Eyl 2026'da ayrık kopya yüzünden 26 commitlik iş
  görünmez oldu (`arsiv/OKU.md`).
- Revert çakışırsa dur; çakışan dosyaları elle çözmeden commit etme.
- `vite.config.js › rollupOptions.input` listesine dokunan bir commit'i geri alırken dört girişin
  (`index.html`, `oyun/avatar3d/index.html`, `meydan.html`, `gardrop.html`) yerinde kaldığını kontrol et.
- §1'de Vercel'i elle geri aldıysan, revert push'u sonrası §1'deki **Promote** adımını yap.

## 3. Migration geri alma

Kural: mevcut migration **düzenlenmez**; geri alma = ya aşağıdaki `docs/*-geri-al*.sql` dosyası ya da
**yeni numaralı** bir migration (`supabase/migrations/20260612000NNN_ad.sql`, `npx supabase db push`).

Geri alma dosyası çalıştırılmadan önce:
1. Dosyanın **başlık yorumunu oku** (neyi geri aldığı, süren maçlara etkisi, "önce istemciyi geri al" uyarısı).
2. İstemci kodu o migration'ın eklediği RPC/kolonu kullanıyorsa **önce §1/§2** (kod), sonra veritabanı.
3. Dosyalar canlıda **elle ve tek seferde** çalıştırılır (Supabase › SQL Editor — Ida — ya da `araclar/pg-mini.mjs`
   ile). Tek seferlik prova: `node araclar/migration-prova.mjs docs/<dosya>.sql` (işlemi açar, sonunda
   `rollback` yapar; canlıda döngüyle/sürekli **koşulmaz**).
4. Veritabanında simülasyon/toplu deneme yapılmaz (WAL ve disk G/Ç; 10 Eki 2026 olayı).
5. Ayar bayrağıyla kapatılabilen özellikte (Düello v4, Hızlı Mod vb.) **dosya yerine bayrak** tercih edilir;
   dosyaların başlıkları bunu belirtir.

### 3a. Geri alma dosyası OLAN migration'lar

| Geri alma dosyası | Geri aldığı migration / değişiklik | Tür |
|---|---|---|
| `docs/asiri-basit-z1-geri-al.sql` | 1007 `asiri_basit_z1_kapat` | veri (soru yeniden açma) |
| `docs/soru-agirlik-geri-alma-1010.sql` | 1010 soru ağırlığı (`soru_sec`) | fonksiyon + ayar |
| `docs/z2-tarama-geri-al.sql` | 1011 `z2_tarama_kapat` | veri |
| `docs/duello-geri-alma-v4.sql` | 1013–1015 Düello v4 (hızlı: yalnız bayrak) | fonksiyon + ayar |
| `docs/duello-v4-acik-geri-al.sql` | `duello_v4_acik` ayarını `"test"`e çeker | ayar |
| `docs/sik-ipucu-837-geri-al.sql` | 1030 şık ipucu düzeltmesi (dosya adındaki 837 eski numara) | veri |
| `docs/en-ceviri-eksik-geri-al.sql` | 1031 eksik EN soru çevirileri | veri |
| `docs/z2-asiri-basit-2-geri-al.sql` | 1032 `z2_asiri_basit_2_kapat` | veri |
| `docs/duello-v4-kart-akisi-geri-al.sql` | 1034 Düello v4 kart akışı | fonksiyon |
| `docs/duello-v4-sure-10-geri-al.sql` | 1035 kart seçimi 10 sn | ayar |
| `docs/yuk-geri-al-1036.sql` | 1036 boşta hızlı tik aralığı | fonksiyon/cron |
| `docs/1037-geri-al.sql` | 1037 Sezon Yolu üç yuvası | veri |
| `docs/kasa-giris-4000-geri-al.sql` | 1038 `kasa_giris_sahne_ms` 4000 → 3000 | ayar |
| `docs/avatar-edinme-1039-geri-al.sql` | 1039 avatar edinme = ilerleme (coin iadesi yok) | fonksiyon + veri |
| `docs/cevap-imzasi-1040-geri-al.sql` | 1040 Cevap İmzası (alınmış imza varsa iade kararı Ida'nın) | şema + fonksiyon |
| `docs/guvenlik-a-geri-al.sql` | 1047 `guvenlik_a_yetki_temizligi` (yetki: **önce Ida'ya sor**) | yetki (GRANT/REVOKE) |
| `docs/guvenlik-c-geri-al.sql` | 1053 `guvenlik_c_girdi_hiz_siniri` (yetki/sınır: **önce Ida'ya sor**) | fonksiyon |
| `docs/grup-mac-kilit-1056-geri-al.sql` | 1056 `grup_mac_kilit` (cron komutunu da eski haline alır) | fonksiyon + cron |
| `docs/mac-duzeltme-1058-geri-al.sql` | 1058 `mac_duzeltme_kart_sayac_budama` | fonksiyon + cron |
| `docs/kopuk-1059-geri-al.sql` | 1059 `kopuk_toplam_60sn` | ayar + fonksiyon |
| `docs/coin-gunluk-kalan-1080-geri-al.sql` | 1080 `coin_gunluk_kalan_muaf` | fonksiyon |
| `docs/duello-1093-geri-al.sql` | 1093 `duello_son_kurali_rehber` | fonksiyon + tetikleyici |
| `docs/hazine-1094-geri-al.sql` | 1094 `hazine_rehber` | fonksiyon + tetikleyici |
| `docs/codex-15-1095-geri-al.sql` | 1095 `codex_15_sorular` (önce pasifleştir) | veri |
| `docs/davet-1096-geri-al.sql` | 1096 `bekleyen_davet` | fonksiyon |
| `docs/izleme-1097-geri-al.sql` | 1097 `izleme_kaydi` (**`/api/saglik` 503 verir; UptimeRobot'u kapat**) | tablo + fonksiyon + cron |
| `docs/ana-ozet-1098-geri-al.sql` | 1098 `ana_sayfa_ozet` | fonksiyon |
| `docs/kategori-havuz-1099-geri-al.sql` | 1099 `kategori_havuz_onbellek` | fonksiyon + cron |
| `docs/grup-kilit-1100-geri-al.sql` | 1100 `grup_kilit` | fonksiyon |
| `docs/soru-sayac-1101-geri-al.sql` | 1101 `soru_sayac_kuyruk` (önce kuyruğu boşaltır) | fonksiyon + cron |
| `docs/duello-1102-geri-al.sql` | 1102 `duello_son_sinir_beraberlik` | fonksiyon |
| `docs/soru-tarama-1103-geri-al.sql` | 1103 `soru_tarama_karar_en` | veri |
| `araclar/ort-cevap-1104-geri-alma.sql` | 1104 `ort_cevap_bot_suresi` (dosya `araclar/` altında) | fonksiyon |
| `docs/son-gorulme-geri-alma-1106.sql` | 1106 `son_gorulme` (**önce eski istemci sürümü**, sonra SQL) | yetki + fonksiyon |

Hazine (eski adıyla KASA) ve Düello'nun eski paketleri:

| Geri alma dosyası | Geri aldığı |
|---|---|
| `docs/kasa-geri-alma-950.sql` … `-958.sql` | 950 … 958 (her dosya kendi numarasını geri alır; **ters sırayla**: 958 → 950) |
| `docs/kasa-geri-alma-980.sql` | 980 Ortak Hazine sunucu metinleri |
| `docs/kasa-geri-alma-981.sql`, `-985.sql`, `-987.sql`, `-988.sql` | 981, 985, 987, 988 |
| `docs/duello-geri-alma-secim.sql` | 960 sıralı kategori seçimi (yalnız ayar) |
| `docs/duello-geri-alma-puan.sql` | 970 yeni puan kuralı (yalnız ayar) |
| `docs/duello-geri-alma-982.sql` | 982 Düello ban (önerilen: yalnız `duello_ban_acik`) |
| `docs/duello-geri-alma-986.sql` | 986 `duello_gosterim_payi_ms` (ayar) |

### 3b. Geri alma dosyası OLMAYAN son migration'lar (1041 → 1106)

Bu migration'lar için hazır SQL **yok**. Gerekirse: (1) yeni numaralı bir geri alma migration'ı yaz, (2) önceki
fonksiyon gövdesini en son alınan yedeğin `sema.sql` dosyasından (§4) ya da önceki migration dosyasından al,
(3) önce `node araclar/migration-prova.mjs` ile tek seferlik prova yap.

**Şema / fonksiyon / yetki değiştirenler (asıl risk):**

| No | Migration | Not |
|---|---|---|
| 1041 | `bp_joker_adi_swap_question` | Battle Pass metin/ad |
| 1049 | `cerceve_lig_varsayilan_avatar_prestij` | çerçeve/lig |
| 1050 | `mac_sonu_sp_ve_bp_tanitim` | maç sonu SP, BP tanıtım |
| 1052 | `basili_tut_tum_modlar` | tüm modlar |
| 1054 | `guvenlik_c_sessiz_sinir` | güvenlik — değişiklikten önce Ida'ya sor |
| 1055 | `kasa_durum_kilit_beklemesi` | Hazine durum kilidi |
| 1057 | `grup_mac_tik_kilitsiz_bakis` | grup maçı |
| 1060 | `posta_kutusu` | yeni tablolar + RPC; geri almak oyuncu postalarını siler |
| 1061 | `bp_parlama_prestij_kaldir` | BP parlaması |
| 1062 | `rakip_sikki_ort_cevap` | rakip şıkkı |
| 1063 | `kasa_karar_sure_doldu` | Hazine karar süresi |
| 1064 | `arac_hesabi_lig_disi` | lig |
| 1065 | `koleksiyon_rozetleri` | koleksiyon |
| 1066 | `guvenlik_c_kalan` | güvenlik — değişiklikten önce Ida'ya sor |
| 1067 | `yanan_kart_dondur` | kozmetik kapatma (yeni migration ile açılır) |
| 1069 | `avatarsiz_devam` | avatar |
| 1070 | `lig_cercevesi_lige_bagli` | lig çerçevesi |
| 1072 | `mac_gecmisim` | maç geçmişi |
| 1073 | `koleksiyon_profil_duzeltme` | profil |
| 1075 | `arkadas_ara` | arkadaş arama |
| 1076 | `arkadas_istegi_engel` | arkadaş isteği + engel |
| 1077 / 1078 | `bildirim_emoji_temizle` / `_duzeltme` | bildirim metinleri (veri) |
| 1079 | `arayuz_dili_adlar` | dil |
| 1082 | `bp_sahip_olunan_odul_coin` | BP ödül coini |
| 1083 | `baskin_kalkan_satistan_kalkti` | kozmetik satış |
| 1084 | `calisma_bitir_aktif_soru` | çalışma modu |
| 1085 | `lig_kapanis_dusme_cakisma` | lig kapanışı |
| 1086 | `duello_paketleri_geri` | Düello paketleri |
| 1087 | `bot_bp_gorunumu` | bot görünümü |
| 1088 | `bot_bekletmez` | bot eşleşme |
| 1089 | `yeni_proje_adresleri` | Supabase taşıması: fonksiyonlardaki proje adresi (send-push, avatar kovası); geri almak eski projeye işaret eder — **yapılmaz** |
| 1091 | `grup_duello_geri_sayim` | grup/Düello sayım |
| 1092 | `senkron_paketi` | **maç çekirdeği** (senkron eşleşme) — en yüksek risk |
| 1105 | `hazine_giris_sayim` | Hazine giriş sayımı (faz süresi); 1094 geri alma dosyası bunu kapsamaz (1094 rehber tetikleyicisidir) |

**Yalnız soru verisi ekleyen/kapatan migration'lar** (geri alma = ilgili soruları `aktif = false` yapmak;
maçlarda `soru_ids` kırılmasın diye **silinmez**; örnek: `docs/codex-15-1095-geri-al.sql`):
1042, 1043, 1044, 1045 (`soru_parti_kolay_04…07`), 1046, 1048, 1051 (`soru_parti_codex_01…03`),
1068 (`soru_parti_codex_04_07`), 1081 (`soru_parti_codex_08_12`), 1090 (`codex_13_14_sorular`).

Not: 1071 ve 1074 numaralı migration yoktur (atlanmış numara).

## 4. Supabase yedekten geri yükleme

Ücretsiz planda Supabase'in otomatik yedeği **yoktur**. Elimizdeki yedekler:

| Kaynak | Ne zaman | Nerede |
|---|---|---|
| `node araclar/yedek-al.mjs` (elle, haftalık) | son alınan tarih | `C:\Users\ida\Desktop\quiztactics-yedek\YYYY-MM-DD\` + ikinci kopya `C:\Users\ida\OneDrive\quiztactics-yedek\` |
| GitHub Actions `veritabani-yedek.yml` (her gece 03:00 TSİ) | `SUPABASE_DB_URL` secret'ı güncel olduğu sürece | Actions artifact, 14 gün |

> Gece yedeği, parola döndürüldükten sonra `SUPABASE_DB_URL` secret'ı güncellenene kadar **kırıktır**
> (`docs/YEDEK.md` › 14 Eki 2026 notu). Yayın öncesi: secret'ı güncelle, `gh workflow run veritabani-yedek.yml`
> ile bir kez koştur ve yeşil olduğunu gör. **Yayından hemen önce de `node araclar/yedek-al.mjs` ile taze yedek al.**

Ayrıntılar: `docs/YEDEK.md`. Komutlar:

```bash
# 1) Yedek almak (yalnız okur; parola .env.local › SUPABASE_DB_PASSWORD)
node araclar/yedek-al.mjs

# 2) Yedeği YEREL Postgres'e yüklemek (doğrulama / inceleme; Docker gerekir)
npx supabase start             # yerel bağlantı: postgresql://postgres:postgres@127.0.0.1:54322/postgres
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres node araclar/geri-yukle.mjs C:\Users\ida\Desktop\quiztactics-yedek\YYYY-MM-DD
# çıktıda "TÜM SAYILAR EŞLEŞTİ" görülmeli (manifest.json ile karşılaştırır)
```

**Önemli sınır:** `araclar/geri-yukle.mjs` **yalnız yerel adrese** (127.0.0.1/localhost) yükler; canlıya
yazmayı kod olarak reddeder. Yani canlıyı yedekten geri yükleme bu araçla tek komut **değildir**:

1. Önce §1–§3'ü dene; felaket geri yüklemesi **son çaredir** (yedek günü ile arası kadar oyuncu verisi kaybolur).
2. Gerçek felakette: yeni bir Supabase projesi aç → `sema.sql` + `veri/*.ndjson` içeriğini oraya yükle
   (yedek klasörü, `geri-yukle.mjs`'in uyguladığı sırayı izler) → `.env` ve Vercel ortam değişkenlerindeki
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` ile Edge Function gizli anahtarlarını (`ANTHROPIC_API_KEY`,
   `CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) yeni projeye taşı → Edge Function'ları yeniden dağıt (§5) →
   Auth sağlayıcı ayarlarını (Google, Resend SMTP, e-posta şablonları: `docs/eposta-sablon-*.json`) yeniden gir.
   Bu işlem ayrı, bilinçli bir görevdir; Ida'nın onayı olmadan başlanmaz.
3. Yedek içeriği kullanıcı verisi (e-posta, auth kayıtları, cron komutları) taşır: repoya, sohbete, paylaşım
   bağlantısına konmaz.

## 5. Edge Function'ı önceki sürüme alma

Supabase, Edge Function için komut satırından "önceki sürüme dön" sunmaz; geri alma = **önceki kodu yeniden
dağıtmak**:

```bash
git revert <fonksiyonu bozan commit>        # §2'deki gibi; supabase/functions/<ad>/ eski haline döner
npx supabase functions deploy send-push --no-verify-jwt --project-ref etezccrifaetzrgfvawl
```

**JWT uyarısı (en sık yapılan hata):** `send-push` canlıda `verify_jwt = false` çalışır ve `supabase/config.toml`'da
kaydı **yoktur**. `--no-verify-jwt` olmadan dağıtırsan Supabase `verify_jwt`'yi `true` yapar ve **tüm push
bildirimleri 401 ile sessizce kırılır**. Her yeniden dağıtımda bayrağı ver.

| Fonksiyon | JWT | Dağıtım komutu |
|---|---|---|
| `send-push` | kapalı | `npx supabase functions deploy send-push --no-verify-jwt` |
| `satin_alma_iade_tara` | kapalı (`config.toml`'da kayıtlı; cron `x-cron-secret` ile çağırır) | `npx supabase functions deploy satin_alma_iade_tara` |
| `satin_alma_dogrula` | açık | `npx supabase functions deploy satin_alma_dogrula` |
| `generate-questions` | açık + devre dışı (kodda `SORU_URET_ACIK` kapısı, yoksa 410; `docs/generate-questions-kapali.md`) | **yayın günü dağıtılmaz** |

Notlar:
- Dağıtım Supabase erişim belirteci ister (`npx supabase login`); bu adım **Ida'dadır** (§9).
- 23 Eyl 2026'da CLI 403 verip iki fonksiyon dağıtılamamıştı; 13 Eki'den beri dört fonksiyon yeni projede dağıtıktır.
  Dağıtım hata verirse fonksiyonu panelden (Edge Functions › kod düzenleyici) elle güncellemek mümkündür; yine de
  JWT anahtarını **kapalı** bırak.
- Push gizli anahtarı değiştirildiyse (`VAPID_*`) eski abonelikler istemcide otomatik yenilenir.

## 6. Bakım / duyuru (oyunculara haber verme)

- **Oyun içi posta kutusu:** `https://quiztactics.com/yonetim/posta` (yalnız sahip; menüde yok). Başlık + metin
  + isteğe bağlı ödül gönderilir; oyuncu uygulamayı açınca posta kutusunda görür (e-posta/telefon bildirimi
  yoktur). Sunucuda `sahip_mi()` kontrolü vardır.
- **Push bildirimi:** `send-push` ile; yalnız abone olanlara gider (§5 JWT uyarısı).
- **Özellik kapatma (bakım yerine):** modun bayrağını kapatmak çoğu zaman tüm siteyi kapatmaktan iyidir —
  `oyun_ayarlari`'nda ilgili ayar (ör. `duello_v4_acik`, `hizli_mod_acik`; ayrıntı `PROJECT_CONTEXT.md`).
  Ayar değişince `PROJECT_CONTEXT.md`'deki satır da aynı işte güncellenir.
- **Tam bakım:** hazır bir "bakım sayfası" anahtarı yoktur. Gerekirse §1 ile sorunsuz sürüme dön; veritabanı
  kapalıysa `/api/saglik` zaten 503 verir ve UptimeRobot haber verir.
- Destek adresi: `info@quiztactics.com` (Cloudflare yönlendirmesi).

## 7. Yayın günü kontrol listesi

| # | Kontrol | Nasıl |
|---|---|---|
| 1 | Sağlık adresi | `https://quiztactics.com/api/saglik` → `200 {"durum":"ok"}` (CDN 30 sn önbellekler) |
| 2 | UptimeRobot | HTTP(s) izleyici → `https://quiztactics.com/api/saglik`, 5 dk aralık, anahtar kelime `ok` (ya da yalnız 200). **Ida kuracak**; kurulmadıysa kesinti kimseye haber vermez |
| 3 | Sentry | Panelde son 1 saatte yeni hata kümesi var mı. Yalnız `VITE_SENTRY_DSN` Vercel'de tanımlıysa çalışır; boşsa hata izleme **kurulmaz** |
| 4 | Uygulama içi izleme | `/yonetim/izleme` (hata + olay özeti). Uyarı: 10 dk'da ≥ 50 hata → `info@quiztactics.com` (saatte en çok 1) |
| 5 | Kayıt akışı | Telefonda yeni (misafir) oturum aç, bir maç başlat |
| 6 | E-posta kodu | Test e-postasıyla giriş kodu geliyor mu (Resend; §8) |
| 7 | Gece yedeği | Actions › Veritabanı Yedeği yeşil mi; değilse `SUPABASE_DB_URL` secret'ı |
| 8 | Yedek | `node araclar/yedek-al.mjs` ile yayın öncesi taze yedek + ikinci kopya |
| 9 | Canlı doğrulama | `node araclar/oyuncu-testi.mjs --adres=https://quiztactics.com` (tek seferlik; döngüyle koşulmaz) |
| 10 | Disk G/Ç | Supabase › Reports › Database: nano sunucuda Disk IO bütçesi; yük altında donarsa §0 |

## 8. Yayın günü ayarları (ücretsiz plan sınırları)

- **Supabase anonim giriş hız sınırı:** misafir girişi `signInAnonymously` kullanır; Supabase Auth, anonim hesap
  açmayı IP başına saatlik sınırlar (Authentication › Rate Limits › anonim kullanıcılar). Mobil operatör NAT'ı
  ya da aynı okul/ev ağı arkasındaki çok sayıda yeni oyuncu `429 over_request_rate_limit` alır ve bir süre
  giremez (test sırasında ~1 saat kilitlenme görüldü). **Yayın günü sınırı panelden gözden geçir/yükselt**
  (güncel değer panelde; bu belgede varsayım yazılmaz). Giriş ekranında Cloudflare Turnstile doğrulaması vardır;
  robot doğrulaması çıkarsa aşmaya çalışma.
- **Resend günlük 100 mail sınırı:** e-posta giriş kodları Resend SMTP üzerinden gider; ücretsiz planda günde
  100 mail (aylık 3.000). Yayın günü yeni kayıt/giriş sayısı 100'ü aşarsa kodlar **gitmez**; giriş yalnız
  Google ve misafir yoluyla çalışır. Kota dolmadan Resend planını yükselt ya da kullanımı panelden izle.
  Aynı kota hata uyarı e-postasını da (`bildim-izleme-uyari`) tüketir.
- **E-posta şablonları:** canlı şablon `docs/eposta-sablon-tekdil-20261014.json`, yedek
  `docs/eposta-sablon-yedek-20261014.json`; geri alma `docs/eposta-sablon-GERI-AL.md`.
- **Vercel günlük 100 dağıtım sınırı:** her küçük düzeltmeyi ayrı push'lama; işi biriktirip tek push gönder.

## 9. Kim neyi yapar

| İş | Kim | Not |
|---|---|---|
| Teşhis (§0), kod okuma, `git revert` + push (§2), derleme kontrolü | Claude Code / Codex (aynı anda **tek araç**) | Push öncesi `git pull`, commit edilmemiş iş bırakma |
| Geri alma migration'ı yazmak, prova (§3) | Claude Code | Canlıya uygulama **Ida onayıyla** |
| Yetki/RLS/GRANT içeren geri alma (1047, 1053, 1054, 1066, 1106) | Önce Ida'ya sorulur | `CLAUDE.md` › Kurallar |
| Vercel'de Instant Rollback / Promote (§1) | **Ida** | Vercel oturumu Ida'da |
| Supabase paneli: SQL Editor, Rate Limits, Auth ayarları, proje durumu | **Ida** | Şifre/anahtar gerektirir |
| `npx supabase login` + Edge Function dağıtımı (§5) | **Ida** (belirteç) — Claude komutu hazırlar | `--no-verify-jwt` unutulmaz |
| Yedek alma (`yedek-al.mjs`), ikinci kopya, Actions secret'ı | **Ida** (parola `.env.local`'de) | Yedekler repoya girmez |
| Felaket geri yüklemesi (§4, yeni proje) | **Ida karar verir**, Claude yürütür | Geri dönüşsüz; açık onay şart |
| UptimeRobot, Resend, Sentry, Play Console hesapları | **Ida** | Şifreler Ida'da |
| Oyunculara duyuru (§6) | **Ida** (`/yonetim/posta`) ya da Ida'nın metniyle Claude | Metin Türkçe + İngilizce |

## İlgili belgeler

- `docs/YEDEK.md` — yedek alma ve yerel geri yükleme
- `docs/YAYIN_ONCESI.md` — yayın öncesi yapılacaklar
- `docs/eposta-sablon-GERI-AL.md` — e-posta şablonu geri alma
- `docs/generate-questions-kapali.md` — soru üretim fonksiyonunun kapatılması
- `PROJECT_CONTEXT.md` › Açık İşler — izleme, Edge Function ve güvenlik durumu
