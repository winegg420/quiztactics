// Bir migration dosyasını üretim bağlantısında transaction içinde dener ve geri alır.
import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';

const dosya = process.argv[2];
if (!dosya) throw new Error('Kullanım: node araclar/migration-prova.mjs <migration.sql>');
const dizgi = await baglantiDizgisi();
if (!dizgi) throw new Error('Veritabanı bağlantı bilgisi bulunamadı.');
const db = await new PgIstemci(dizgi).baglan();
try {
  await db.sorgu('begin');
  await db.sorgu(fs.readFileSync(dosya, 'utf8'));
  console.log(`Migration provası başarılı: ${dosya}`);
} finally {
  try { await db.sorgu('rollback'); } finally { await db.kapat(); }
}
