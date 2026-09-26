// Hesap silme indekslerini (656) canlıya CONCURRENTLY kurar: yazmayı kilitlemez.
// CONCURRENTLY transaction içinde çalışmaz; pg-mini basit sorgu protokolüyle her ifade ayrı gider.
// Kullanım: node araclar/hesap-silme-indeks.mjs   (sonra migration-uygula ile 656 kaydı)
import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';

const sql = fs.readFileSync('supabase/migrations/20260612000656_hesap_silme_indeksleri.sql', 'utf8');
const ifadeler = sql.split('\n').filter((s) => /^create index if not exists/.test(s)).map((s) => s.replace(/\s+/g, ' ').replace('create index if not exists', 'create index concurrently if not exists').trim());
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
try {
  for (const s of ifadeler) {
    const t = Date.now();
    try { await db.sorgu(s); console.log(`${Date.now() - t} ms  ${s.slice(0, 90)}`); }
    catch (e) { console.error('HATA:', s.slice(0, 90), e.message); process.exitCode = 1; }
  }
  const gecersiz = await db.sorgu(`select indexrelid::regclass::text as ad from pg_index where not indisvalid`);
  console.log('Geçersiz indeks:', JSON.stringify(gecersiz));
} finally { await db.kapat(); }
