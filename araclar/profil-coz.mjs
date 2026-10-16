// node profil-coz.mjs <cpuprofile> <uzunGorevlerJson|-> <distKok> [esik=100] [perfBas]
// Her uzun görev için: örneklerin yaprak (self) dağılımı + uygulama kodundaki ilk çağıran (kaynak haritasıyla).
import fs from "node:fs";
import path from "node:path";
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";
const [, , pYol, uYol, distKok, esikS, perfBasS] = process.argv;
const prof = JSON.parse(fs.readFileSync(pYol, "utf8"));
const perfBas = Number(perfBasS ?? prof.perfBas ?? 0);
const esik = Number(esikS ?? 100);
const dugum = new Map(prof.nodes.map((n) => [n.id, n]));
const ebeveyn = new Map();
for (const n of prof.nodes) for (const c of n.children ?? []) ebeveyn.set(c, n.id);
const haritalar = new Map();
function cevir(cf) {
  const u = cf.url || ""; const m = u.match(/\/assets\/([^?#]+\.js)/);
  if (!m) return `${cf.functionName || "(anon)"}${u ? " " + u.split("/").pop() : ""}`;
  let tm = haritalar.get(m[1]);
  if (tm === undefined) { try { tm = new TraceMap(fs.readFileSync(path.join(distKok, "assets", m[1] + ".map"), "utf8")); } catch { tm = null; } haritalar.set(m[1], tm); }
  if (!tm) return `${cf.functionName} ${m[1]}:${cf.lineNumber + 1}`;
  const o = originalPositionFor(tm, { line: cf.lineNumber + 1, column: cf.columnNumber });
  const kay = (o.source || "?").replace(/^.*?(oyun|src|node_modules)\//, "$1/");
  return `${o.name || cf.functionName || "(anon)"} ${kay}:${o.line}`;
}
const ad = new Map();
const adi = (id) => { if (!ad.has(id)) ad.set(id, cevir(dugum.get(id).callFrame)); return ad.get(id); };
const yigin = (id) => { const y = []; for (let x = id; x != null; x = ebeveyn.get(x)) y.push(x); return y; }; // yapraktan köke
// örnek zamanları (sayfa performance.now ms)
const zaman = []; let t = prof.startTime;
for (const d of prof.timeDeltas) { t += d; zaman.push((t - prof.startTime) / 1000 + perfBas); }
let gorevler = uYol && uYol !== "-" ? JSON.parse(fs.readFileSync(uYol, "utf8")) : null;
if (!gorevler) { // profilden: ardışık (program/idle olmayan) örnek kümeleri
  gorevler = []; let bas = null, son = null;
  for (let i = 0; i < prof.samples.length; i++) {
    const n = dugum.get(prof.samples[i]).callFrame.functionName;
    const bos = n === "(idle)";
    if (!bos) { if (bas == null) bas = zaman[i]; son = zaman[i]; } else if (bas != null) { if (son - bas >= esik) gorevler.push([bas, son - bas]); bas = null; }
  }
}
gorevler = gorevler.filter((g) => g[1] >= esik).sort((a, b) => a[0] - b[0]);
for (const [b, s] of gorevler) {
  const yaprak = new Map(), ilkUyg = new Map(), kapsar = new Map(); let n = 0;
  for (let i = 0; i < prof.samples.length; i++) {
    if (zaman[i] < b || zaman[i] > b + s) continue; n++;
    const y = yigin(prof.samples[i]);
    const ya = adi(y[0]); yaprak.set(ya, (yaprak.get(ya) ?? 0) + 1);
    // uygulama kodundaki en derin çerçeve (node_modules olmayan oyun/src)
    const uyg = y.map(adi).find((x) => / (oyun|src)\//.test(x)) ?? "(uygulama çerçevesi yok)";
    ilkUyg.set(uyg, (ilkUyg.get(uyg) ?? 0) + 1);
    const gor = new Set(y.map(adi).filter((x) => / (oyun|src)\//.test(x)));
    for (const x of gor) kapsar.set(x, (kapsar.get(x) ?? 0) + 1);
  }
  const top = (m, k = 6) => [...m].sort((a, b) => b[1] - a[1]).slice(0, k).map(([x, c]) => `${c}ms ${x}`).join("\n      ");
  console.log(`\n■ görev @${Math.round(b)} ms, ${Math.round(s)} ms (örnek ${n})`);
  console.log(`   yaprak: ${top(yaprak)}`);
  console.log(`   en derin uygulama çerçevesi: ${top(ilkUyg)}`);
  console.log(`   kapsayan uygulama fonksiyonları: ${top(kapsar, 10)}`);
}
