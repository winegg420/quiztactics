// Düello 1.0 BOT testleri: migration 268 + 269 BİRLİKTE bir işlem içinde uygulanır, testler
// çalışır, her şey geri alınır (canlı veritabanına hiçbir şey yazılmaz).
//
// yardim.mjs TEST_ONCE_SQL tek dosya alır → 268 + 269 geçici klasörde tek dosyada birleşir.
// Dosya adı bilerek 268'in adıyla biter: duello-v2.test.mjs yalnız o adla çalışır, böylece
// 268'in kendi testleri de 269'un üstünde koşar. duello.test.mjs (eski akış) da aynı
// birleşik SQL ile koşar.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const kok = fileURLToPath(new URL("../..", import.meta.url));
const klasor = path.join(os.tmpdir(), "quiztactics-duello2-bot");
fs.mkdirSync(klasor, { recursive: true });
const birlesik = path.join(klasor, "20260612000268_duello_v2_sunucu.sql");
fs.writeFileSync(
  birlesik,
  ["20260612000268_duello_v2_sunucu.sql", "20260612000269_duello_v2_bot.sql"]
    .map((f) => fs.readFileSync(path.join(kok, "supabase", "migrations", f), "utf8"))
    .join("\n;\n"),
);

const sonuc = spawnSync(
  process.execPath,
  [
    "--test",
    "--test-concurrency=1",
    "_test/sunucu/duello-v2-bot.test.mjs",
    "_test/sunucu/duello-v2.test.mjs",
    "_test/sunucu/duello.test.mjs",
  ],
  { cwd: kok, stdio: "inherit", env: { ...process.env, TEST_ONCE_SQL: birlesik } },
);
process.exit(sonuc.status ?? 1);
