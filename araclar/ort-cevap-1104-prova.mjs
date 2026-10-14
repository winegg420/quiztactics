// 1104 prova: migration'ı tek transaction'da uygular, işlevlerin derlendiğini doğrular, ROLLBACK eder (canlıya yazmaz).
// Kullanım: node araclar/ort-cevap-1104-prova.mjs
import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
try {
  await db.sorgu('begin');
  await db.sorgu(`set local statement_timeout = '20s'`);
  await db.sorgu(fs.readFileSync('supabase/migrations/20260612001104_ort_cevap_bot_suresi.sql', 'utf8'));
  const say = async (fn, desen) => (await db.tek(`select position('${desen}' in pg_get_functiondef('public.${fn}'::regprocedure)) > 0`)) === 't';
  const kontrol = [
    ['sütun', (await db.tek(`select count(*) from information_schema.columns where table_name='kasa_maclari' and column_name='bot_cevap_gercek'`)) === '1'],
    ['submit_match_answer b_ms', await say('submit_match_answer(uuid,smallint,integer)', 'b_ms:=least')],
    ['kasa_cevap bot_cevap_gercek', await say('kasa_cevap(uuid,smallint)', 'bot_cevap_gercek')],
    ['kasa_ilerlet_ic bot_cevap_gercek', await say('kasa_ilerlet_ic(uuid)', 'bot_cevap_gercek')],
  ];
  for (const [ad, ok] of kontrol) console.log(ok ? '  ✓' : '  ✗', ad);
  await db.sorgu('rollback');
  console.log('ROLLBACK edildi.');
  process.exit(kontrol.every(([, o]) => o) ? 0 : 1);
} catch (e) { console.error('HATA:', e.message); try { await db.sorgu('rollback'); } catch {} process.exit(1); }
