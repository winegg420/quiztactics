# Paket 3 — soru üretimi (parti parti, kesintiye dayanıklı)

Durum: `durum.json`. Yeni oturum ÖNCE onu okur, `siradaki_parti` ile devam eder.
Biten parti tekrar üretilmez. Yarım parti veritabanına yazılmaz.

## Hedef (5000 soru = 20 parti × 250)
Kategori oranı: sinema %13 · teknoloji %13 · müzik %12 · sanat %12 · spor %11 ·
edebiyat %10 · bilim %10 · tarih %9 · TR yerel %6 · genel kültür %4 · **coğrafya %0**.
Zorluk: kolay (1-2) %15 · orta (3) %30 · zor (4) %35 · çok zor (5) %20.
Parti kotaları `durum.json › sayac` ile hedef arasındaki farka göre dengelenir.
TR yerel sorular kategori değil kapsamdır: `yerel: true` (kapsam='yerel', ulke='TR'),
konusuna göre kategoriye düşer (önceki partiyle aynı).

## Bir partinin 7 adımı (sırayla, bitmeden sonrakine geçilmez)
Klasör: `araclar/soru-uretim/parti-NN/` (taslak ve ham Jev çıktısı scratchpad'de,
git'e yalnız son `sorular.json` + `ozet.json` girer).
1. **Üret** — 250 + yedek taslak (`[{k, yerel, s, d, y[3], z, en|null, en_neden?}]`),
   önce kategorideki mevcut soruların anahtar kavramları çekilir (anlamca tekrar yok).
2. **Kalite kapısı** — `denetle.mjs` (biçim, şık denge = `soru_kural_isaretleri` aynası,
   havuzla birebir/anlamca tekrar) + `jev-kapi.mjs` (doğru cevap verilmeden; >0,9 güvenle
   başka şık → elenir/düzeltilir; zorluk etiketi Jev puanıyla çelişirse düzeltilir).
   Elenenin yerine yenisi; parti net 250.
3. **İngilizce** — `question_translations`. Düz çeviri yok; kültüre bağlı anlamsız
   soru çevrilmez (`en: null` + `en_neden`, `ceviri_atlanan` 'cevrilemez'). Parantezle
   cevabı ele veren çeviri yok.
4. **Migration** — `supabase/migrations/2026061200NNNN_soru_uretim_parti_NN.sql`
   (`durum.json › siradaki_migration_no`), `on conflict (soru) do nothing`, `zorluk`
   yazılır, sonda yalnız bu işlemin satırları (`created_at >= transaction_timestamp()`)
   TR+EN aynı permütasyonla karışır. Kapı: `soru_denetim/kapi.mjs` (veritabanı kuralı).
5. **Prova → uygula → doğrula** — `node araclar/migration-prova.mjs <dosya>`,
   `node araclar/migration-uygula.mjs <dosya>`, sonra aktif soru sayısı gerçekten arttı mı.
   Hata → geri alınır, `atlanan_partiler`'e yazılır, sonrakine geçilir.
   **Arka arkaya iki parti uygulamada hata verirse DUR.**
6. **durum.json** — parti kaydı (no, soru, migration, commit, kategori/zorluk sayımı,
   Jev maliyeti, elenen, etiket düzeltmesi, çevrilmeyen), sayaçlar, sıradaki no.
7. **Commit + push** (`gelistirme`; `main`'e ASLA).

Araçlar: `araclar/soru-parti-1000/` (kural.mjs, denetle.mjs, jev-kapi.mjs, zorluk.mjs,
birlestir.mjs, uret-migration.mjs) — parti klasörü ve çıktı dosyası parametreli kullanılır.
Parametreli sarmalayıcılar (parti 1'de yazıldı, o araçlar değiştirilmeden import edilir):
- `birlestir-parti.mjs --taslak <k> --jev <jsonl> --parti N [--kota j] [--zorluk j] [--rapor]` →
  `parti-NN/sorular.json` + `ozet.json`. Kova kotası tam tutulur, kova içi takasla zorluk hedefe
  yaklaştırılır. Zorluk = yazar etiketi; Jev seviyesiyle fark ≥ 2 ise 1 adım Jev'e kayar,
  z=4 + Jev yanlış + seviye 5 ise 5 olur.
- `uret-migration-parti.mjs --parti N --no NNN [--kontrol]` → tek migration dosyası.
