// Doğrulanmış tek bir migrationı transaction içinde uygular ve ledger'a kaydeder.
import fs from 'node:fs';
import path from 'node:path';
import { PgIstemci, baglantiDizgisi, alintila } from './pg-mini.mjs';

const giris = process.argv[2];
if (!giris) throw new Error('Migration dosyası gerekli.');
const kok = path.resolve('supabase/migrations');
const dosya = path.resolve(giris);
if (!dosya.startsWith(kok + path.sep)) throw new Error('Yalnız supabase/migrations altı uygulanabilir.');
const eslesme = /^(\d+)_([a-z0-9_]+)\.sql$/.exec(path.basename(dosya));
if (!eslesme) throw new Error('Geçersiz migration dosya adı.');
const [, surum, ad] = eslesme;
const sql = fs.readFileSync(dosya, 'utf8');
const dizgi = await baglantiDizgisi();
if (!dizgi) throw new Error('Veritabanı bağlantı bilgisi bulunamadı.');

const db = await new PgIstemci(dizgi).baglan();
try {
  await db.sorgu('begin');
  await db.sorgu(`select pg_advisory_xact_lock(hashtext('quiztactics:migration'))`);
  const varMi = await db.tek(`select exists(select 1 from supabase_migrations.schema_migrations where version=${alintila(surum)})`);
  if (varMi === 't') {
    await db.sorgu('rollback');
    console.log(`Zaten uygulanmış: ${surum}`);
  } else {
    await db.sorgu(sql);
    await db.sorgu(`insert into supabase_migrations.schema_migrations(version,name,statements)
      values(${alintila(surum)},${alintila(ad)},array[]::text[])`);
    await db.sorgu('commit');
    console.log(`Uygulandı: ${surum}_${ad}`);
  }
} catch (e) {
  try { await db.sorgu('rollback'); } catch { /* bağlantı kopmuş olabilir */ }
  throw e;
} finally {
  await db.kapat();
}
