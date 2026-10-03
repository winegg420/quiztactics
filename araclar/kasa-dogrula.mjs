// KASA (950) canlı kurulum doğrulaması — salt okunur.
// Kullanım: node araclar/kasa-dogrula.mjs
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
try {
  await db.sorgu("set default_transaction_read_only = on; set statement_timeout = '10s'");
  const r = (await db.sorgu(`select
      (select count(*) from oyun_ayarlari where anahtar like 'kasa\\_%')::text ayar,
      (to_regclass('public.kasa_maclari') is not null)::text tablo,
      (select count(*) from cron.job where jobname = 'kasa_tik')::text cron,
      (select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'kasa_sinyal')::text realtime,
      (select count(*) from supabase_migrations.schema_migrations where version = '20260612000950')::text defter`))[0];
  const tamam = r.ayar === '25' && r.tablo === 'true' && r.cron === '1' && r.realtime === '1' && r.defter === '1';
  console.log(`ayar ${r.ayar}/25 · tablo ${r.tablo} · cron ${r.cron}/1 · realtime ${r.realtime}/1 · defter ${r.defter}/1`);
  console.log(tamam ? 'KASA kurulumu TAMAM' : 'EKSİK — çıktıyı Claude\'a gönder');
  if (!tamam) process.exitCode = 1;
} finally {
  await db.kapat();
}
