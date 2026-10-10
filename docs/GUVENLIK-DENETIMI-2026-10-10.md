# Yayın Öncesi Güvenlik Denetimi — 10 Ekim 2026

**Araç:** Claude Code · **Kapsam:** yayın öncesi listesinin 1–6, 8 ve 11. maddeleri (raporda 1–7 olarak numaralı).
**Yöntem:** Kod ve git geçmişi okundu. Canlı veritabanında yalnız katalog sorguları çalıştı (pg_policies, pg_proc,
information_schema, storage.buckets; toplam birkaç toplu sorgu). Supabase Auth ayarı Management API'den yalnız
okundu. Canlı siteye tek tük istek atıldı (başlıklar + paket). Veri değişikliği, yük testi ya da saldırı denemesi
yapılmadı. **Bu dosyada gizli değer yoktur.**

**Sonuç:** 0 Acil · 24 Öneri (12'si onay gerektiren yetki kuralı — bölüm A; 12'si kod/ayar önerisi — bölüm C). Yetkisiz biri (anon) ya da başka bir oyuncu, ana oyunda özel veri okuyamıyor/yazamıyor
ve bedava coin/elmas/ödül alamıyor. Öneriler daha çok yan oyun tabloları, gereksiz geniş yetkiler ve kötüye kullanım
(spam, misafir hesap çoğaltma) üzerine.

---

## A. Sahibinin onayı gereken güvenlik kuralı değişiklikleri (önem sırasıyla)

Hiçbiri uygulanmadı. Hepsi yetki/izin değişikliği olduğu için Ida'nın onayını bekliyor.

| # | Değişiklik | Neden | Risk seviyesi |
|---|---|---|---|
| 1 | **Push aboneliği doğrulaması** (`save_push_subscription`): endpoint alan adı izin listesi (fcm.googleapis.com, *.push.services.mozilla.com, *.push.apple.com, *.notify.windows.com), ≤ 1000 karakter, kullanıcı başına ≤ 5 abonelik; `on conflict (endpoint)` başka kullanıcının endpoint'ini **devralmasın** | Bugün herhangi bir adres kaydedilebiliyor → `send-push` sunucusu rastgele adreslere istek atar (sınırlı SSRF); başkasının cihazının bildirimleri üstlenilebilir | Orta-Yüksek |
| 2 | **Misafir (anonim) girişe captcha** (Supabase Auth › hCaptcha/Turnstile) | `security_captcha_enabled = false`; misafir hesap IP başına saatte 30 açılabiliyor. Davet ödülü (100 coin) ve reklam tavanı hesap çoğaltarak katlanır | Orta |
| 3 | **Yan oyun tabloları:** `pr_users` ve `dg_profiles` için `revoke update ... from authenticated` (yazma RPC'ye taşınsın); `pr_races` UPDATE `using (true)` politikası kalksın (oda sahibi kontrolü); `dg_ghosts` sahip kolonu + `user_id = auth.uid()`; `pr_error_logs` INSERT `with check (user_id = auth.uid())` | Oyuncu kendi PatiRun puanını / DidaGP XP'sini doğrudan istediği değere yazabiliyor, başkasının yarışını/hayaletini ezebiliyor. Bu değerler anon'a açık `birlesik_siralama()`'ya giriyor | Orta (ana oyunla para bağı yok) |
| 4 | **Facebook kimliği** (`facebook_kimligi_kaydet`): `fb_id` istemciden değil `auth.identities`'ten okunsun; `facebook_arkadas_onerileri` anon'dan kapatılsın | Biri başkasının FB kimliğini sahiplenip onun arkadaşlarına "Facebook arkadaşı" olarak önerilebilir | Orta |
| 5 | **PUBLIC/anon EXECUTE temizliği:** 57 fonksiyonda PUBLIC'e EXECUTE açık (38'i security definer) → anon 47 definer fonksiyonu çağırabiliyor. `revoke execute ... from public, anon` + `grant ... to authenticated`; `alter default privileges in schema public revoke execute on functions from public` | Bugün açık yok (çoğu `auth.uid()` boşsa reddediyor) ama gereksiz saldırı yüzeyi. Anon'a gerçekten açık kalması gerekenler ayrı seçilmeli (ör. `sonraki_turnuva_*`, `birlesik_siralama` bilinçli mi?) | Düşük-Orta |
| 6 | `coin_harca` istemciye kapatılsın (`elmas_harca` zaten kapalı) | Yalnız kendi coin'ini düşürür ama `p_tur`/`p_referans` serbest → `coin_hareketleri`'ne sahte kayıt; istemci kodu çağırmıyor | Düşük |
| 7 | `get_tournament_question` üyelik/elenme kontrolü | Anon dahil herkes aktif turnuva sorusunu (cevapsız) çekebiliyor | Düşük |
| 8 | `eski_davetleri_temizle` (cron işi) ve `mac_oyuncu_indeksi` (iç yardımcı) authenticated'dan kapatılsın | İstemcinin çağırması gerekmiyor; ikincisi başka maçın soru indeksini gösteriyor | Düşük |
| 9 | `avatarlar` kovası: `file_size_limit` 2 MB + `allowed_mime_types` png/jpeg/webp | Herkese açık kovada boyut/tür sınırı yok (yazma yalnız kendi klasörüne) | Düşük |
| 10 | `net.http_*` (pg_net) anon/authenticated'dan kapatılsın | `net` şeması REST'e açık değil, savunma derinliği | Düşük |
| 11 | Varsayılan tablo yetkisi: `alter default privileges in schema public revoke insert, update, delete on tables from anon` | 56 tabloda anon'a yazma GRANT'ı var (Supabase varsayılanı); RLS kapattığı için fiilen kapalı | Düşük |
| 12 | `kasa_deneme_ozeti` view'ı `security_invoker = on` | Definer view; bugün kimse SELECT edemiyor | Düşük |

## B. Döndürülmesi (rotate) gereken anahtarlar

| Tür | Yer | Durum |
|---|---|---|
| — | — | **Depoda/git geçmişinde döndürülmesi gereken canlı anahtar YOK.** |
| CRON_SECRET (eski değer) | 8 eski migration dosyası (ilk: `17fd5657`, 12 Haz 2026; son: `180f148e`, 21 Eyl 2026) — HEAD'de duruyor | **Döndürülmüş, geçersiz.** Canlı değer 18 Eyl 2026'da değişmiş (Edge secret ve `sunucu_gizli` aynı yeni değer). Migration'lar değiştirilemediği için metin depoda kalır; işlem gerekmez. |
| Veritabanı şifresi | `.env.local` (yerel, git'e girmez) | **Sahibinin kararı (önerilir):** denetim sırasında yerel bir araç çıktısında kısmen göründü; depoya, rapora ya da dosyaya girmedi. |

## C. Maddeler

### 1. Anahtar sızıntısı — **Sorun yok**
- **Git geçmişi** (1.946 commit, 13.886 blob, silinmiş dosyalar dahil): service_role JWT, `sk-ant-`, `sk-proj-`, `sbp_`,
  `sb_secret_`, Sentry auth token, TypeSafe/Jev anahtarı, GitHub/Google/Vercel token, özel anahtar (PEM, `"private_key"`)
  **yok**. Canlı Supabase secret özetleri bütün bloblarla karşılaştırıldı (ANTHROPIC, SERVICE_ROLE, DB_URL, VAPID_PRIVATE): eşleşme yok.
- `.env`, `.env.local`, `.vercel`, `*.pem`, service-account JSON, oturum dosyaları hiç commit edilmemiş. Tek istisna
  `.env.bildim` (`e20f56a4`, 9 Eyl; `3ebfa0bd` ile silindi) — yalnız `VITE_MOD` içeriyordu.
- **Çalışma ağacı:** gizli değer taşıyan dosyalar (`.env*`, oturum JSON'ları) git dışında. `denetim/oturum-*.json`,
  `denetim/betikler/tur2/*.json`, `.arka-plan-oturum*.json` yalnız makineye özel `.git/info/exclude` ile dışarıdaydı →
  **düzeltildi:** `.gitignore`'a eklendi. İzlenmeyen `araclar/_gecici-*.mjs`, `_q.mjs`, `RAPOR-*.md` dosyalarında sabit gizli değer yok.
- **Frontend paketi (`dist/`):** yalnız anon key (`role=anon`), VAPID açık anahtarı ve Sentry DSN (canlıda
  `ingest.de.sentry.io`). Pakete giren `VITE_*` adlarının hiçbiri gizli değil (`SUPABASE_URL/ANON_KEY`, `SENTRY_DSN`,
  `H5_ADS_CLIENT`, bayraklar). `vite.config.js` `define` ile değer enjekte etmiyor.
- Edge Function'larda sabit anahtar yok; hepsi `Deno.env`. `vercel.json` temiz.

### 2. Yetki (RLS / GRANT / security definer) — **Öneri**
- **RLS:** public'teki **169 tablonun hepsinde açık.** RLS'i kapalı tablolar yalnız Supabase'in yönettiği `auth.*`/`realtime.*`.
- **Politikasız RLS tabloları** (71 public; ör. `questions`, `sunucu_gizli`, `sikayetler`, `push_subscriptions`) istemciye tamamen kapalı — doğru.
- **`using (true)` SELECT:** 40 politika; `{public}` rollü 7'si katalog tablosu (badges, cerceveler, sehirler…).
  `profiles` politikası `true` ama **kolon yetkisi kısıtlı**: authenticated yalnız 22 zararsız kolonu okur; `coin`, `elmas`,
  `davet_kodu`, `facebook_id`, `cinsiyet`, `hile_yetkisi` okunamaz; anon hiç okuyamaz. `tournaments.soru_ids` herkese açık
  (soru metni/cevabı veren RPC istemciye kapalı → düşük).
- **Herkese yazma:** yalnız yan oyun tabloları (`pr_races`, `pr_users`, `dg_profiles`, `dg_ghosts`, `pr_error_logs`) → A.3.
- **Fonksiyonlar:** 799 fonksiyon, 754'ü security definer; **search_path'i sabitlenmemiş definer fonksiyon: 0.**
  Kimlik parametresi alan 16 istemciye açık fonksiyon incelendi: çağıran her yerde `auth.uid()`'den alınıyor; parametre
  yalnız hedef oyuncu/davet. Ödül veren iç fonksiyonlar (`coin_ekle`, `elmas_ekle`, `xp_ver`, `rozet_ver`, `satin_alma_isle`,
  `coin_satin_alma_kaydet`, `sezon_puani_ekle`, `bp_odul_ver_ic`, `hiz_siniri` …) authenticated'a **kapalı**.
  PUBLIC/anon EXECUTE genişliği → A.5–A.8.
- **Storage:** 3 kova (avatarlar, muzik, ses-adaylar) public okunur; yazma yalnız `avatarlar`'da ve yalnız
  `foldername[1] = auth.uid()` → doğru. Boyut/tür sınırı yok → A.9.
- **Realtime:** yayındaki 16 tablonun 14'ü kendi satırı/maç üyeliğiyle sınırlı; `tournaments`/`tournament_players` authenticated'a açık (bilinçli).

### 3. Kritik RPC'ler — **Öneri** (Acil yok)

| RPC | Risk | Kanıt | Öneri |
|---|---|---|---|
| `satin_alma_dogrula` (Edge) → `coin_satin_alma_kaydet` / `satin_alma_isle` | Yok | Kimlik JWT'den (`auth.getUser()`); Play makbuzu doğrulanıyor (durum, hesap kimliği, adet 1); `purchase_token`/`play_token` UNIQUE; iç RPC'ler authenticated'a kapalı | — |
| `avatar_satin_al`, `kozmetik_satin_al`, `aura_satin_al`, `skill_kilidi_ac`, `bp_satin_al` | Yok | `auth.uid()`; fiyat sunucu tablosundan; `profiles FOR UPDATE` → sahiplik → harca; `hiz_siniri` | — |
| `esya_satin_al`, `karakter_satin_al`, `avatar3d_satin_al` | Düşük | "zaten sende" kontrolü kilitten ÖNCE: eşzamanlı iki çağrı iki kez coin düşürür (zarar oyuncunun kendisine); dondurulmuş modüller | Başa `perform 1 from profiles where id = auth.uid() for update` (kural değişikliği değil, migration) |
| `joker_coin_ile_al`, `joker_tek_al`, `olta_al`, `ikram_gonder/yanitla` | Yok | Fiyat sunucuda; `coin_harca` kilitli, `p_miktar <= 0` reddediliyor | — |
| `coin_harca` (doğrudan) | Düşük | Kendi coin'i; serbest `p_tur/p_referans` | A.6 |
| `bp_odul_al`, `bp_tasma_al`, `bp_toplu_al` | Yok | Seviye satırı `FOR UPDATE`; `on conflict` + `row_count` ile tekrar alma engelli; ücretli kol `bp_aktif_mi` | — |
| `claim_quest`, `gorev_al`, `haftalik_sandik_al` | Yok | İlerleme sunucuda (`gorev_olcum`); `on conflict`; günlük coin tavanı | — |
| Maç sonu: `advance_*`, `hizli_mod_bitir`, `calisma_*` | Yok | Oturum `FOR UPDATE`, `aktif → bitti` bir kez; ödül sunucudaki doğru sayısından | — |
| Cevap: `duello*_cevap`, `kasa_cevap/karar`, `submit_*_answer` | Yok | İstemci yalnız şık indeksi yollar; doğruluk/süre sunucuda; `dogru_cevap` istemciye kapalı | — |
| `reklam_odulu_al`, `elmas_reklam_odulu_al` | Orta | Jeton sunucuda, tek kullanımlık, günde 5×25 coin + 1×2 elmas; **reklamın izlendiği doğrulanmıyor** (jeton al, 10 sn bekle, al) | AdMob SSV (sunucu tarafı doğrulama) ile kapat; o zamana dek tavan düşük kalsın |
| `meydan_turnuva_damgasi` | Düşük | 10 dk kala çağırmak 50 coin; gerçek katılım şartı yok (turnuva başına 1, günlük tavan) | Ödülü en az bir cevaba bağla |
| `claim_referral`, `davet_kodu_bagla`, `arkadas_davet_kodu_ile_ekle` | Düşük | `auth.uid()`, profil kilitli, 72 sa pencere, aynı cihaz kontrolü, davet edene level 5 + ayda 10 sınırı; davet edilen anında 100 coin → çoklu hesapla toplanabilir | `hiz_siniri` ekle + A.2 captcha |
| `hesabimi_sil` | Yok | Yalnız `auth.uid()`; bot silinemez | Sil-yeniden-aç ile davet ödülü tekrarı yalnız `ayni_cihaz_mi` ile kısmen önleniyor |
| Yönetici: `sezon_sahip_*`, `sikayet_isle`, `kafatopu_admin_*` | Yok | `sahip_mi()` / `yonetici_mi()` / `kafatopu_admin_mi()` kapısı | — |
| Yan oyun skorları: `kafatopu_sonuc_kaydet`, `meyvekes_skor_kaydet`, `pr_apply_race_result`, `boks_oturum_kaydet` | Orta (yan oyun) | Skor istemciden (sınırlı aralık); coin/elmas vermiyor | Yayına girerlerse skor sunucuda hesaplanmalı; A.3 |
| `facebook_kimligi_kaydet` | Orta | `fb_id` istemciden, doğrulanmıyor | A.4 |

### 4. Girdi doğrulama — **Öneri**
- **Takma ad** (`takma_ad_sec`): 3–16 karakter, yalnız `[A-Za-z0-9_ğüşıöçĞÜŞİÖÇ]` (sıfır genişlikli/RTL/kontrol karakteri giremez), küfür filtresi, büyük/küçük harf duyarsız eşsizlik, 24 sa kuralı → **Sorun yok.**
- **DM** (`dm_gonder`): 1–500 (fonksiyon + CHECK), yalnız arkadaşa, engel/askı/koşul/küfür tetikleyicisi → iyi; ama **kontrol, sıfır genişlikli ve bidi/RTL override karakterleri süzülmüyor** (küfür maskesini atlatma, sahte metin) → **Öneri:** tetikte `regexp_replace(metin, '[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮⁠-⁩﻿]', '', 'g')`. Aynısı `sikayet_et` açıklamasına (yalnız yönetici görür, düşük).
- **Maç içi / grup sohbeti:** yalnız sabit `izinli_mesajlar()` listesi; 2 sn + 20/dk → **Sorun yok.**
- **Şikâyet:** sebep sabit liste, açıklama ≤ 500, aynı kişiye 24 sa'te 1 → **Sorun yok.**
- **Şehir/ülke:** `ulkeler`/`sehirler` tablolarından doğrulanıyor → **Sorun yok.**
- **Öneri:** `profiles.tercih_kategori` doğrudan yazılabilir, uzunluk/değer kısıtı yok → CHECK ya da kategori listesine bağla.
- **Öneri:** `avatar3d_portre_kaydet` URL deseni herhangi bir `*.supabase.co` projesini kabul ediyor → bu projenin kimliğine sabitle (dondurulmuş modül).
- **XSS:** `dangerouslySetInnerHTML` 3 yerde (`Bayrak.jsx` sabit SVG, `PremiumCerceve.jsx` sabit üretici, tasarım prototipi), `innerHTML` 1 yerde (`CevapImzasi.jsx` sabit CSS) — **hiçbirinde kullanıcı verisi yok.** React metin kaçışı geri kalanını kapsıyor.

### 5. Hız sınırı — **Öneri**
- **Kendi RPC'lerimiz:** `hiz_siniri` (`rpc_sayac`, istemciye kapalı) şu çağrılarda var: `dm_gonder` 20/dk, maç mesajları 20/dk,
  `sikayet_et` 10/dk, arkadaşlık 30/dk, `create_challenge` 20/dk, düello/kasa daveti 30/dk, maç arama 90/dk, `kuyruga_gir`/`quick_match` 30/dk,
  `takma_ad_sec` 10/dk, `save_push_subscription` 10/dk, bütün satın alma ve ödül RPC'leri → iyi.
- **Öneri:** günlük tavan yok — arkadaşlık isteği ve düello/kasa daveti dakikada 30 ama günde binlerce kişiye spam mümkün → 24 sa'te ~100 + aynı hedefe tekrar davette bekleme.
- **Öneri:** `cihaz_bildir`, `claim_referral`, `arkadas_davet_kodu_ile_ekle`, `kalp_at`, `ikram_yanitla`'da `hiz_siniri` yok (düşük maliyet).
- **Supabase Auth (canlı ayar, okundu):** anonim giriş IP başına saatte 30, e-posta saatte 2, doğrulama/OTP 30, token yenileme 150;
  refresh token rotasyonu açık; **captcha kapalı** → A.2. Şifre en az 6 karakter (Google + misafir giriş ağırlıklı; düşük).
- **Edge Function'lar:** `generate-questions` (Anthropic, ücretli) ve `satin_alma_iade_tara` `x-cron-secret` ister, secret yoksa reddeder;
  `satin_alma_dogrula` JWT zorunlu (canlı `verify_jwt = true`); `send-push` `x-cron-secret`. Hız sınırı yok ama hepsi gizli anahtar ya da JWT arkasında.
  **Öneri:** secret karşılaştırmasını sabit zamanlı yap (`!==` yerine); `satin_alma_dogrula` için kullanıcı başına sınır; `send-push`'ta boş `user_ids` = herkese gönderim olmasın, `req.json()` try içinde.

### 6. Hata sızıntısı — **Düzeltildi** (istemci) / **Öneri** (dağıtım)
- **İstemci:** merkezi `oyun/lib/hata.js › hataMesaji` (51 dosya kullanıyor) zaten ham SQL'i saklıyordu; genişletildi:
  daha fazla Postgres/PostgREST kalıbı + SQLSTATE kodları (22/23/42, P0002/P0003, PGRST*). Bilinçli Türkçe `raise exception`
  mesajları (P0001) aynen geçer. Teknik hata artık Sentry'ye de gider (`hataBildir`; kişisel alanlar `temizleOlay` ile siliniyor).
  `elmas.js › elmasHatasi` ham metin döndürüyordu → `hataMesaji`'ne bağlandı.
- **Kök hata ekranı** "Teknik ayrıntı" altında ham hata metnini canlıda da gösteriyordu → yalnız geliştirmede (madde 7).
- **Edge Function yanıtları:** `satin_alma_dogrula` (Play ham yanıtı `detay`, DB iç hatası, beklenmeyen hata metni, eksik secret adları),
  `satin_alma_iade_tara` (beklenmeyen hata), `send-push` (DB hatası) → kod düzeltildi, ayrıntı yalnız fonksiyon günlüğünde.
  `generate-questions` yalnız cron secret sahibine `error.message` döndürüyor; elle tetiklemede gerektiği için bırakıldı.
- **⚠ DAĞITILMADI — sahibinin kararı:** canlı Edge Function sürümleri depodan geride:
  `send-push` canlıda 12 Haz 2026 sürümü, `satin_alma_dogrula` 9 Eyl 2026 sürümü (depodaki 23 Eyl "defter + jeton/sipariş tekilliği"
  değişikliği canlıda değil), **`satin_alma_iade_tara` canlıda hiç yok**. Bugün dağıtmak bu işin dışındaki eski değişiklikleri de canlıya
  çıkarır. Satın alma akışı canlıya alınırken birlikte dağıtılmalı. Dikkat: `supabase/config.toml`'da `send-push` kaydı yok —
  canlıda `verify_jwt = false`; normal `functions deploy` bunu `true` yapıp push'u bozar → dağıtırken `--no-verify-jwt` ya da config.toml'a kayıt.
- Dondurulmuş, arayüzden girişi olmayan `oyun/avatar3d/*` ve `oyun/harita/*` ham `e.message` gösteriyor; açılırlarsa `hataMesaji`'ne bağlanmalı.

### 7. 500 / beklenmeyen hata sayfası — **Düzeltildi**
- Hata sınırı zaten vardı (`src/components/HataSiniri.jsx`: kökte + Layout içinde sayfa kipi; Sentry'ye bildiriyor) — beyaz ekran kalmıyor.
- Kök ekran eski `.btn` kartıydı → oyun stiline çevrildi: `QtKart` + `QtBosDurum gorsel="bulunamadi"` (404 ile aynı sahne) +
  "Bir şeyler ters gitti" + **Sayfayı yenile** / **Ana sayfa** (TR/EN). Doğrulama: yerel geliştirmede kök bileşen bilerek çökertildi,
  390 px TR ve 360 px EN: başlık, görsel, iki düğme (52 px), yatay taşma yok.

### Ek: güvenlik başlıkları — **Öneri**
Canlı yanıtta yalnız `Strict-Transport-Security` var. `X-Content-Type-Options: nosniff` ve `Referrer-Policy: strict-origin-when-cross-origin`
düşük riskle `vercel.json › headers`'a eklenebilir. `X-Frame-Options`/CSP `frame-ancestors` dikkat ister: oyun H5 portallarında iframe içinde
yayınlanacaksa kırar — önce dağıtım kanalı kararı. Tam CSP (Supabase, Sentry, reklam alan adları) ayrı iş.

---

## Bu işte yapılan düşük riskli düzeltmeler
- `src/components/HataSiniri.jsx`, `src/styles.css` — kök hata ekranı oyun stilinde, ham hata metni yalnız geliştirmede.
- `oyun/lib/hata.js`, `oyun/lib/elmas.js` — iç hata kalıpları + SQLSTATE, Sentry bildirimi.
- `supabase/functions/satin_alma_dogrula/{akis,index}.ts`, `satin_alma_iade_tara/index.ts`, `send-push/index.ts` — genel hata yanıtı (dağıtılmadı).
- `.gitignore` — oturum belirteci taşıyan yerel dosyalar.
- Ek: `araclar/lig-gorsel-ekran.mjs`, `araclar/denetim-10eki-ekran.mjs` yeni profil kimlik satırına uyarlandı.

Doğrulama: `npm run build` temiz · `arayuz-denetim` TEMİZ · `lig-gorsel-ekran --hizli` 5/5 temiz · `denetim-10eki-ekran` TR+EN profil adı bulundu, konsol temiz.
