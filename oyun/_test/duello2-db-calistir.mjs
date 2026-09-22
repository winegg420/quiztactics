// Düello 1.0 sunucu testleri: migration 268 bir işlem içinde uygulanır, testler çalışır,
// her şey geri alınır (canlı veritabanına hiçbir şey yazılmaz).
import { spawnSync } from "node:child_process";

const sonuc = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "_test/sunucu/duello-v2.test.mjs"], {
  cwd: new URL("../..", import.meta.url),
  stdio: "inherit",
  env: {
    ...process.env,
    TEST_ONCE_SQL: "supabase/migrations/20260612000268_duello_v2_sunucu.sql",
  },
});
process.exit(sonuc.status ?? 1);
