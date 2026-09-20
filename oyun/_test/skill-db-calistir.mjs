import { spawnSync } from "node:child_process";

const sonuc = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "_test/sunucu/skill-sistemi-v1.test.mjs"], {
  cwd: new URL("../..", import.meta.url),
  stdio: "inherit",
  env: {
    ...process.env,
    TEST_ONCE_SQL: "supabase/migrations/20260612000254_skill_sistemi_v1.sql",
  },
});
process.exit(sonuc.status ?? 1);
