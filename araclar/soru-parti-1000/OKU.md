# Soru partisi 1000 + Jev zorluğu (Şerit D, 22 Eyl 2026)

Migration'lar: `20260612000270…273_soru_parti_1000_[a-d].sql` (1000 soru + İngilizce çeviri, 250'şer) ve `20260612000274_soru_zorluk_jev.sql` (havuz zorluğu).

## Hat
1. Taslak (git dışı, scratchpad): `[{k, yerel, s, d, y[3], z, en:{s,d,y[3]}|null, en_neden?, benzerOk?}]`
2. `node araclar/soru-parti-1000/denetle.mjs <taslak> --mevcut <havuz.json>` — biçim, şık denge (kural.mjs = `soru_kural_isaretleri` aynası), havuzla birebir/anlamca tekrar.
3. `node araclar/soru-parti-1000/jev-kapi.mjs <taslak> <jev.jsonl>` — Jev'e doğru cevap verilmeden, şıklar karışık: doğru şık, kategori, zorluk, eskiyebilir, hassas, "bu şık da doğru mu"; İngilizce: doğru şık, anlamlı mı, cevabı ele veriyor mu. İçerik değişince yeniden sorar.
4. `node araclar/soru-parti-1000/birlestir.mjs <taslak> <jev.jsonl>` → `sorular.json` + `ozet.json`. Jev >0,9 güvenle başka şık derse elenir; `kararlar.json` elle kararlar; kota fazlası düşer. Zorluk = Jev puanı + `zorluk-esikler.json`.
5. `node araclar/soru-parti-1000/uret-migration.mjs [--kontrol]` → 270–273. Kapı veritabanındaki `soru_kural_isaretleri`'dir (`soru_denetim/kapi.mjs`); takılan varsa dosya yazılmaz. Havuzla UNIQUE çakışanlar çıkarılır.
6. `node araclar/soru-parti-1000/uret-zorluk-migration.mjs` → 274 (`jev-tarama/ozet.csv`'den sıralama: %10/20/40/20/10 → 1–5; aynı puan aynı seviye).

Karıştırma: sorular doğru şık 0'da eklenir, sonunda yalnız bu işlemde eklenen satırlar (`created_at >= transaction_timestamp()`) TR ve EN **aynı permütasyonla** karışır.
