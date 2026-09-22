// Paket 2 · Şerit B — skill ekonomisi sunucu testleri: migration 281–284 tek bir işlem içinde
// uygulanır, testler çalışır, her şey geri alınır (canlı veritabanına hiçbir şey yazılmaz).
//
// Birleşik dosyanın adı ...268_duello_v2_sunucu.sql ile biter: böylece Düello 1.0 testleri de
// (yalnız o adla koşarlar) yeni kapı/kilit/loadout mantığıyla birlikte çalışır. 268/269 canlıda
// zaten uygulandı; dosyaya yalnız 281–284 girer.
//
//   node oyun/_test/skill-ekonomisi-db-calistir.mjs          → skill-ekonomisi + duello-v2
//   node oyun/_test/skill-ekonomisi-db-calistir.mjs --hepsi  → bütün _test/sunucu testleri
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const kok = fileURLToPath(new URL("../..", import.meta.url));
const mig = path.join(kok, "supabase", "migrations");
const dosyalar = fs.readdirSync(mig).filter((d) => /^2026061200028[1-4]_.*\.sql$/.test(d)).sort();
if (dosyalar.length !== 4) throw new Error(`281–284 bekleniyordu, bulunan: ${dosyalar.join(", ")}`);
const birlesik = path.join(os.tmpdir(), "p2b_birlesik_20260612000268_duello_v2_sunucu.sql");
fs.writeFileSync(birlesik, dosyalar.map((d) => fs.readFileSync(path.join(mig, d), "utf8")).join("\n;\n"));

const hepsi = process.argv.includes("--hepsi");
const testler = hepsi
  ? fs.readdirSync(path.join(kok, "_test", "sunucu")).filter((d) => d.endsWith(".test.mjs")).map((d) => `_test/sunucu/${d}`)
  : ["_test/sunucu/skill-ekonomisi.test.mjs", "_test/sunucu/duello-v2.test.mjs"];

const sonuc = spawnSync(process.execPath, ["--test", "--test-concurrency=1", ...testler], {
  cwd: kok,
  stdio: "inherit",
  env: { ...process.env, TEST_ONCE_SQL: birlesik },
});
process.exit(sonuc.status ?? 1);
