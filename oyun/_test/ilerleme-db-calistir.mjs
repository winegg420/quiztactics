// Paket 2 · Şerit A — ilerleme/ödül migration'ları (277–279) BİRLİKTE bir işlem içinde
// uygulanır, sunucu testleri çalışır, her şey geri alınır (canlıya hiçbir şey yazılmaz).
//
// yardim.mjs TEST_ONCE_SQL tek dosya alır → 277 + 278 + 279 geçici klasörde tek dosyada
// birleşir. Dosya adı bilerek 268'in adıyla biter: duello-v2.test.mjs yalnız o adla koşar
// (268 ve 269 canlıda uygulandı; birleşik dosyada YALNIZ 277–279 vardır).
//
// Kullanım: node oyun/_test/ilerleme-db-calistir.mjs            → bütün _test/sunucu testleri
//           node oyun/_test/ilerleme-db-calistir.mjs a.test.mjs → yalnız verilenler
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const kok = fileURLToPath(new URL("../..", import.meta.url));
const klasor = path.join(os.tmpdir(), "quiztactics-ilerleme");
fs.mkdirSync(klasor, { recursive: true });
const birlesik = path.join(klasor, "20260612000268_duello_v2_sunucu.sql");
fs.writeFileSync(
  birlesik,
  [
    "20260612000277_ilerleme_ekonomi_ayarlari.sql",
    "20260612000278_level_sistemi_temeli.sql",
    "20260612000279_mac_sonu_xp.sql",
  ]
    .map((f) => fs.readFileSync(path.join(kok, "supabase", "migrations", f), "utf8"))
    .join("\n;\n"),
);

const secilen = process.argv.slice(2);
const dosyalar = secilen.length
  ? secilen.map((f) => (f.includes("/") ? f : `_test/sunucu/${f}`))
  : fs.readdirSync(path.join(kok, "_test", "sunucu")).filter((f) => f.endsWith(".test.mjs")).map((f) => `_test/sunucu/${f}`);

const sonuc = spawnSync(process.execPath, ["--test", "--test-concurrency=1", ...dosyalar], {
  cwd: kok,
  stdio: "inherit",
  env: { ...process.env, TEST_ONCE_SQL: birlesik },
});
process.exit(sonuc.status ?? 1);
