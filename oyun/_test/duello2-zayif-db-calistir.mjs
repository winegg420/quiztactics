// Düello zayıf nokta + kategori limiti sunucu testleri: migration 470 bir işlem içinde uygulanır,
// testler çalışır, her şey geri alınır (canlı veritabanına hiçbir şey yazılmaz).
import { spawnSync } from "node:child_process";

const sonuc = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "_test/sunucu/duello-zayif-nokta.test.mjs"], {
  cwd: new URL("../..", import.meta.url),
  stdio: "inherit",
  env: {
    ...process.env,
    TEST_ONCE_SQL: "supabase/migrations/20260612000470_duello_zayif_nokta.sql",
  },
});
process.exit(sonuc.status ?? 1);
