# Yedek ve geri yükleme

Ücretsiz Supabase planında otomatik yedek yoktur; yedek bu araçla elle (haftalık) alınır.

## Yedek almak (tek komut, yalnız okuma)

```bash
node araclar/yedek-al.mjs
```

- Parola: `.env.local` içindeki `SUPABASE_DB_PASSWORD` (yoksa araç durur; parola loga yazılmaz).
- Çıktı (repo DIŞI): `C:\Users\ida\Desktop\quiztactics-yedek\YYYY-MM-DD\`
  - `sema.sql` — public şeması: tablolar, kısıtlar, indeksler, fonksiyonlar, tetikleyiciler, RLS + policy (public + storage), yetkiler, cron işleri
  - `veri/*.ndjson` — public, auth (kullanıcı hesapları dahil), storage meta, cron, migration kaydı
  - `storage/<kova>/…` — Storage dosyaları (özel kova varsa `.env.local`'e `SUPABASE_SERVICE_ROLE_KEY` gerekir)
  - `manifest.json` — satır/nesne sayıları (geri yükleme karşılaştırması)
- Tek tutarlı görüntü (repeatable read, read only) kullanır; canlıya yazmaz, yük bindirmez.
- Ölçüm (14 Eki 2026): **82 MB**, **~123 sn** (210 tablo, 269 Storage dosyası / 41 MB).

## Saklama

- Yedek kullanıcı verisi (e-posta, auth kayıtları, cron komutları) içerir: repoya, sohbete, bulut paylaşım linkine **girmez**.
- Birinci kopya yerel klasör; **ikinci kopya** Ida'nın bulut diskine (özel, paylaşımsız klasör).
- Son 4 haftayı tut, eskisini sil.

## Geri yüklemek (yerel Postgres'e — canlıya değil)

1. Yerel Postgres: `npx supabase start` (Docker gerekir) → bağlantı `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
2. ```bash
   SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres node araclar/geri-yukle.mjs C:\Users\ida\Desktop\quiztactics-yedek\YYYY-MM-DD
   ```
   Şemayı uygular, NDJSON verisini yükler, tablo/fonksiyon/policy/tetikleyici sayılarını `manifest.json` ile karşılaştırır (`TÜM SAYILAR EŞLEŞTİ`).
3. Canlıya gerçek felaket geri yüklemesi ayrı, bilinçli bir işlemdir (yeni Supabase projesi + aynı araç, adres elle verilir).

## Durum

- `geri-yukle.mjs` **henüz çalıştırılıp doğrulanmadı**: bu makinede Docker ve Postgres yok (bkz. PROGRESS.md 14 Eki 2026).
