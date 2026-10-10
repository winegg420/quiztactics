// Salt okuma: cron süreleri (verilen andan beri) + WAL hızı (N sn örnek). Tek bağlantı, döngü yok.
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";
const [bas, son, ornekSn = "60"] = process.argv.slice(2);
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const q = async (s) => { const r = await db.sorgu(s); return r.rows ?? r; };
const r = await q(`select j.jobname, count(*) n, count(*) filter (where status<>'succeeded') hata,
  round(avg(extract(epoch from end_time-start_time))::numeric*1000) ort_ms,
  round((percentile_cont(0.95) within group (order by extract(epoch from end_time-start_time)))::numeric*1000) p95_ms,
  round(max(extract(epoch from end_time-start_time))::numeric*1000) maks_ms
  from cron.job_run_details d join cron.job j using(jobid)
  where j.jobname in ('hizli_tik','bildim-dakika-tik') and start_time >= ${alintila(bas)} and start_time < ${alintila(son)} and end_time is not null group by 1`);
console.log(JSON.stringify(r));
const a = (await q("select pg_current_wal_lsn()::text l, clock_timestamp() t"))[0];
await new Promise((x) => setTimeout(x, Number(ornekSn) * 1000));
const b = (await q(`select pg_wal_lsn_diff(pg_current_wal_lsn(), ${alintila(a.l)}::pg_lsn) d`))[0];
console.log(`WAL ${ornekSn} sn: ${(Number(b.d)/1024).toFixed(0)} KB → ${(Number(b.d)/1024/Number(ornekSn)).toFixed(1)} KB/sn`);
const t = await q("select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname like 'pg_temp%' or p.proname like 'sim_%'");
console.log("pg_temp/sim nesneleri:", JSON.stringify(t));
await db.kapat?.(); process.exit(0);
