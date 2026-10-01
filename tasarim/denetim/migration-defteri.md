# Migration defteri tutarlılık denetimi (salt okunur) — 1 Eki 2026

**Özet.** 431 migration dosyası, defterde (`supabase_migrations.schema_migrations`) 430 kayıt. Tek gerçek fark: `20260612000710_yildizli_gece_ac.sql` dosyası var, defterde yok; defterin en yükseği 781 olduğu için `db push` bunu "sırasız" sayıyor. Etkisi canlıda VAR (pa_gece aktif, Köz/Kuzey kapalı) — yani migration elle/başka yoldan uygulanmış, yalnız deftere işlenmemiş; risk düşük (idempotent bir `update`). Ek olarak 16 kayıtta isim uyumsuzluğu (kozmetik). Taşımadan önce en önemli 3 şey: (1) 710'u deftere işlemek (aksi halde yeni hesapta `db push` hep uyarı/`--include-all` ister); (2) Edge Function listesi ve secret adlarını Ida'nın hesabıyla doğrulamak (bu oturumun CLI yetkisi 403 verdi) ve secret değerlerini yeni projeye elle taşımak; (3) migration dışı canlı ayarları (Auth: Google OAuth + e-posta/OTP + anonim giriş, `avatarlar`/`muzik` bucket'ları dosyalarda var ama Auth sağlayıcı ayarları yalnız panelde) yeni projede elle kurmak.

## 1. Defter ↔ dosya

| Liste | Sonuç |
|---|---|
| (a) Dosyası var, defterde YOK | **1**: `20260612000710_yildizli_gece_ac` (sırasız) |
| (b) Defterde var, dosyası YOK | 0 |
| (c) Sırasız (en yüksek defter kaydından eski, uygulanmamış) | yalnız 710 (en yüksek kayıt: 781) |
| Aynı numaralı çift dosya | yok |
| Tarih öneki dışı dosya | yok (hepsi `20260612000NNN`) |
| Numara boşlukları | çok (10'ar atlayan numaralama, 1→781); eksik dosya anlamına gelmez, defterle birebir eşleşiyor |
| İsim uyumsuzluğu | `…104`–`…118` (15 kayıt): defterde `name` **NULL**; `…226`: defterde ad `20260612000226_duello_daveti` (numara öneki tekrarlı). Fonksiyonel etkisi yok |

## 2. Defterde olmayan dosyanın canlı etkisi

| Dosya | İçerik | Kanıt (1 hafif select) | Sonuç |
|---|---|---|---|
| 710 `yildizli_gece_ac` | `update kozmetikler set aktif=true where anahtar='pa_gece'` | `pa_gece` aktif=**t**, `pa_kor` aktif=f, `pa_kuzey` aktif=f (690 üçünü kapatmıştı; 710 yalnız pa_gece'yi açar) | **VAR (deftere işlenmemiş)** |

## 3. Önerilen düzeltme planı (UYGULANMADI)

| # | İş | Öneri |
|---|---|---|
| 1 | 710 deftere kayıt | "Deftere kayıt eklenmeli": `insert into supabase_migrations.schema_migrations (version, name) values ('20260612000710','yildizli_gece_ac') on conflict do nothing;` (alternatif: `npx supabase migration repair --status applied 20260612000710`). Migration yeniden çalıştırılmasına gerek yok |
| 2 | 104–118 NULL ad, 226 öneki | Ayrıca düzeltmeye değmez; yeni projede dosyalardan sıfırdan kurulacaksa defter zaten temiz yazılır. İstenirse `update … set name=…` ile kozmetik düzeltme |
| 3 | Dosya silme/yeniden numaralama | **Gerekmez** (CLAUDE.md: mevcut migration düzenlenmez/silinmez) |

## 4. Taşıma envanteri (yalnız ad/sayı)

| Kalem | Canlıda | Dosyalarda tarif | Not |
|---|---|---|---|
| pg_cron işleri | 28 iş (27 aktif; `bildim-ikram-zaman-asimi` pasif) | **28/28 migration'larda** | `bildim-*` 26, ayrıca `duello_tik`; ikisi saniyelik (`bildim-bot-oyna`, `duello_tik`: 2 saniye) |
| Extension | 8: pg_cron, pg_net, pg_stat_statements, pg_trgm, pgcrypto, plpgsql, supabase_vault, uuid-ossp | pg_cron (5 dosya), pg_trgm (1) | Diğerleri Supabase varsayılanı; yeni projede pg_cron ayrıca etkinleştirilmeli |
| Storage bucket | 2: `avatarlar` (public), `muzik` (public) | ikisi de (132, 450) | 5 storage politikası var (avatarlar×4, muzik×1); **bucket içindeki dosyalar migration'la gelmez, ayrıca kopyalanmalı** |
| Edge Function (dosya) | `generate-questions`, `satin_alma_dogrula`, `satin_alma_iade_tara`, `send-push` (4 klasör) | evet (`supabase/functions`) | `verify_jwt=false`: generate-questions, satin_alma_iade_tara (config.toml) |
| Edge Function (canlıda deploy) | **KANITLANAMADI** | — | `supabase functions list` → 403 (hesap yetkisi yok) |
| Secrets adları | **KANITLANAMADI** (`secrets list` 403). Kodun okuduğu adlar: `ANTHROPIC_API_KEY`, `CRON_SECRET`, `PLAY_PACKAGE_NAME`, `PLAY_SERVICE_ACCOUNT`, `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY` (+ yerleşik `SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY`) | yalnız adlar kodda; değerler yalnız canlıda | Vault'ta kayıt yok (0), cron komutları vault/net.http kullanmıyor |
| Auth sağlayıcıları | Veriden: **Google** (23 kimlik), **e-posta** (4 kimlik; kodda `signInWithOtp` var), **anonim** açık (70 anonim kullanıcı) | `config.toml`'da `[auth.external.*]` yorum satırı → **yalnız panelde elle kurulu** | Google OAuth client id/secret + redirect URL yeni hesapta elle girilmeli; "açık/kapalı" yalnız kullanım verisinden çıkarıldı, panel doğrulaması yok |

## 5. Not
- Oturumda yalnız okuma sorgusu atıldı (defter, kozmetikler, cron.job, pg_extension, storage.buckets, vault ad listesi, auth.identities sayımı, storage politika adları); hiçbir yazma/DDL/db push yok, 57014/timeout alınmadı.
