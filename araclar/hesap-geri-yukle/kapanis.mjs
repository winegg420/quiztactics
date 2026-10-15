// Ida'nın satırlarının kaskad kapanışı (yedek 15 Eki 04:10 UTC) — yalnız okuma; çıktı JSON
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "../pg-mini.mjs";
const [veriYolu, cikti] = process.argv.slice(2);
const IDA = "e4f6006f-d6bb-4ca8-be67-3bdf9efc9708";
// COPY metin biçimi çözücü
const coz = (s) => s === "\\N" ? null : s.replace(/\\(\\|t|n|r|b|f|v|[0-7]{1,3})/g, (_, k) => ({ "\\": "\\", t: "\t", n: "\n", r: "\r", b: "\b", f: "\f", v: "\v" }[k] ?? String.fromCharCode(parseInt(k, 8))));
const T = new Map(); let cur = null;
for (const satir of fs.readFileSync(veriYolu, "utf8").split("\n")) {
  if (cur) { if (satir === "\\.") { cur = null; continue; } cur.rows.push(satir.split("\t").map(coz)); continue; }
  const m = satir.match(/^COPY ([\w."]+) \((.*)\) FROM stdin;$/);
  if (m) { const ad = m[1].replace(/"/g, ""); cur = { cols: m[2].split(", ").map((c) => c.replace(/"/g, "")), rows: [] }; T.set(ad, cur); }
}
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const s = async (q) => { const r = await db.sorgu(q); return r.satirlar ?? r.rows ?? r; };
const fk = await s(`select c.conname, cn.nspname||'.'||cl.relname cocuk, pn.nspname||'.'||pl.relname ebeveyn, c.confdeltype tip,
  (select array_agg(a.attname order by k.o) from unnest(c.conkey) with ordinality k(n,o) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.n) ccols,
  (select array_agg(a.attname order by k.o) from unnest(c.confkey) with ordinality k(n,o) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.n) pcols
  from pg_constraint c join pg_class cl on cl.oid=c.conrelid join pg_namespace cn on cn.oid=cl.relnamespace
  join pg_class pl on pl.oid=c.confrelid join pg_namespace pn on pn.oid=pl.relnamespace where c.contype='f'`);
await db.kapat?.();
const arr = (x) => Array.isArray(x) ? x : String(x).replace(/[{}]/g, "").split(",");
const sec = new Map(); // tablo -> Set(satır indeksi)
const ekle = (t, i) => { if (!sec.has(t)) sec.set(t, new Set()); if (sec.get(t).has(i)) return false; sec.get(t).add(i); return true; };
const u = T.get("auth.users"); const iu = u.rows.findIndex((r) => r[u.cols.indexOf("id")] === IDA);
if (iu < 0) throw new Error("yedekte Ida yok");
const kuyruk = [["auth.users", iu]]; ekle("auth.users", iu);
const setNull = [];
while (kuyruk.length) {
  const [pt, pi] = kuyruk.shift(); const P = T.get(pt); const prow = P.rows[pi];
  for (const f of fk.filter((f) => f.ebeveyn === pt)) {
    const C = T.get(f.cocuk); if (!C) continue;
    const pc = arr(f.pcols), cc = arr(f.ccols);
    const pv = pc.map((c) => prow[P.cols.indexOf(c)]);
    C.rows.forEach((r, i) => {
      if (!cc.every((c, k) => r[C.cols.indexOf(c)] === pv[k])) return;
      if (f.tip === "c") { if (ekle(f.cocuk, i)) kuyruk.push([f.cocuk, i]); }
      else setNull.push({ tablo: f.cocuk, kisit: f.conname, tip: f.tip, cols: cc, satir: Object.fromEntries(C.cols.map((c, k) => [c, r[k]])) });
    });
  }
}
const ozet = [...sec].map(([t, set]) => [t, set.size]).sort((a, b) => b[1] - a[1]);
console.log(JSON.stringify(ozet)); console.log("set-null/diğer:", setNull.length, JSON.stringify([...new Set(setNull.map((x) => x.tablo + ":" + x.tip + ":" + x.cols))]));
fs.writeFileSync(cikti, JSON.stringify({ tablolar: [...sec].map(([t, set]) => ({ tablo: t, cols: T.get(t).cols, rows: [...set].map((i) => T.get(t).rows[i]) })), setNull, fk }));
