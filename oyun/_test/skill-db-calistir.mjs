import { spawnSync } from "node:child_process";

const sonuc = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "_test/sunucu/skill-genisletme.test.mjs"], {
  cwd: new URL("../..", import.meta.url),
  stdio: "inherit",
  env: {
    ...process.env,
    TEST_ONCE_SQL: "supabase/migrations/20260612000266_skill_mobil_deneyim.sql",
  },
});
process.exit(sonuc.status ?? 1);
