// Şık ipucu düzeltmesini (migration 420–422) geri alır — sik-ipucu-duzeltme.csv'den.
//
//   node araclar/soru-temizlik/sik-ipucu-geri-al.mjs [--parti N] [--id <uuid>]           → PROVA (geri alınır)
//   node araclar/soru-temizlik/sik-ipucu-geri-al.mjs [--parti N] [--id <uuid>] --uygula  → kalıcı
//
// Yalnız sonuc = 'duzeltildi' satırlar: TR şıkları eski_tr'ye, EN şıkları eski_en'e döner ve
// sik_ipucu_jev işareti geri konur (rekabetçi havuzdan yeniden çıkar). Satır o arada başka bir
// düzeltmeyle değiştiyse (şıklar yeni_tr değilse) dokunulmaz, raporda "atlandı" olarak görünür.
// Eski hâl soru_surum'a da yazılır (surum +1), yani geri alma da izlenebilir.
import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from '../pg-mini.mjs';

const arg = process.argv.slice(2);
const deger = (ad) => { const i = arg.indexOf(ad); return i >= 0 ? arg[i + 1] : null; };
const uygula = arg.includes('--uygula');
const parti = deger('--parti');
const tekId = deger('--id');

/** RFC 4180 CSV ayrıştırıcı (tırnaklı alan, "" kaçışı, alan içinde virgül/satır sonu). */
function csvOku(metin) {
  const satirlar = [];
  let alan = '', satir = [], tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) {
      if (c === '"' && metin[i + 1] === '"') { alan += '"'; i++; }
      else if (c === '"') tirnak = false;
      else alan += c;
    } else if (c === '"') tirnak = true;
    else if (c === ',') { satir.push(alan); alan = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && metin[i + 1] === '\n') i++;
      satir.push(alan); alan = '';
      if (satir.some((x) => x !== '')) satirlar.push(satir);
      satir = [];
    } else alan += c;
  }
  if (alan || satir.length) { satir.push(alan); satirlar.push(satir); }
  const [baslik, ...govde] = satirlar;
  return govde.map((s) => Object.fromEntries(baslik.map((b, i) => [b, s[i] ?? ''])));
}

const CSV = new URL('./sik-ipucu-duzeltme.csv', import.meta.url);
const kayitlar = csvOku(fs.readFileSync(CSV, 'utf8'))
  .filter((r) => r.sonuc === 'duzeltildi')
  .filter((r) => !parti || r.parti === String(parti))
  .filter((r) => !tekId || r.id === tekId);
if (!kayitlar.length) { console.log('Geri alınacak satır yok.'); process.exit(0); }

const alinti = (v) => (v === '' || v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const degerler = kayitlar.map((r) =>
  `(${alinti(r.id)}::uuid, ${alinti(r.eski_tr)}::jsonb, ${alinti(r.yeni_tr)}::jsonb, ${alinti(r.eski_en)}::jsonb, ${alinti(r.yeni_en)}::jsonb)`).join(',\n');

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
try {
  await db.sorgu('begin');
  await db.sorgu(`select set_config('app.soru_elle_isaret_yaz', 'on', true)`);
  await db.sorgu(`create temp table _geri (id uuid primary key, eski_tr jsonb, yeni_tr jsonb, eski_en jsonb, yeni_en jsonb) on commit drop;
    insert into _geri values ${degerler};`);
  await db.sorgu(`insert into public.soru_surum (question_id, surum, soru, secenekler, dogru_cevap, degisiklik_notu)
    select q.id, q.surum, q.soru, q.secenekler, q.dogru_cevap, 'Şık ipucu düzeltmesi geri alındı'
      from public.questions q join _geri g on g.id = q.id where q.secenekler = g.yeni_tr`);
  const tr = await db.sorgu(`update public.questions q
       set secenekler = g.eski_tr,
           supheli_isaretler = array_append(array_remove(q.supheli_isaretler, 'sik_ipucu_jev'), 'sik_ipucu_jev'),
           surum = q.surum + 1
      from _geri g where g.id = q.id and q.secenekler = g.yeni_tr
    returning q.id`);
  const en = await db.sorgu(`update public.question_translations t set secenekler = g.eski_en
      from _geri g where t.question_id = g.id and t.dil = 'en' and g.yeni_en is not null and t.secenekler = g.yeni_en
    returning t.question_id`);
  const isaret = await db.tek(`select count(*) from public.questions q join _geri g on g.id = q.id
     where 'sik_ipucu_jev' = any(q.supheli_isaretler)`);
  await db.sorgu(uygula ? 'commit' : 'rollback');
  console.log(`${uygula ? 'UYGULANDI' : 'PROVA (geri alındı)'} — hedef ${kayitlar.length} · TR geri ${tr.length} · EN geri ${en.length} · işaretli ${isaret} · atlandı ${kayitlar.length - tr.length}`);
  if (!uygula) console.log('Kalıcı yapmak için aynı komuta --uygula ekle.');
} catch (e) {
  try { await db.sorgu('rollback'); } catch { /* bağlantı kopmuş olabilir */ }
  console.error('Geri alma başarısız, hiçbir şey değişmedi:', e.message);
  process.exitCode = 1;
} finally {
  await db.kapat();
}
