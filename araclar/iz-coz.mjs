// Chrome izi (trace JSON) çözümleyici (16 Eki 2026, maç içi kasma paketi).
// Ana iş parçacığındaki (CrRendererMain) her uzun görev (RunTask ≥ eşik) için: süre dağılımı (JS · stil · yerleşim ·
// boyama · GC · diğer), stil yeniden hesabının öğe sayısı, zorunlu (JS içinden) stil/yerleşim ve en pahalı JS çağrıları
// (FunctionCall/TimerFire/EventDispatch adı + kaynak; --dist verilirse kaynak haritasıyla özgün dosya:satır).
// Kullanım: node araclar/iz-coz.mjs <iz.json> [--esik=80] [--dist=.tmp/dist-perf] [--bas=ms] [--bit=ms]
import fs from "node:fs";
import path from "node:path";
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";
const [dosya, ...rest] = process.argv.slice(2);
const ARG = Object.fromEntries(rest.map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ESIK = Number(ARG.esik ?? 80);
const ham = JSON.parse(fs.readFileSync(dosya, "utf8"));
const olaylar = Array.isArray(ham) ? ham : ham.traceEvents;
const adlar = new Map();
for (const e of olaylar) if (e.ph === "M" && e.name === "thread_name") adlar.set(`${e.pid}:${e.tid}`, e.args.name);
const anaAnahtar = [...adlar].filter(([, v]) => v === "CrRendererMain").map(([k]) => k);
// birden çok renderer olabilir: en çok olaylı olanı seç
const say = new Map(); for (const e of olaylar) { const k = `${e.pid}:${e.tid}`; if (anaAnahtar.includes(k)) say.set(k, (say.get(k) ?? 0) + 1); }
const ana = [...say].sort((a, b) => b[1] - a[1])[0]?.[0];
const ev = olaylar.filter((e) => `${e.pid}:${e.tid}` === ana && e.ph === "X" && e.dur != null).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
const t0 = Math.min(...ev.filter((e) => (e.name === "RunTask" || e.name === "ThreadControllerImpl::RunTask")).map((e) => e.ts));
const haritalar = new Map();
function kaynak(url, satir, sutun) {
  const m = (url || "").match(/\/assets\/([^?#]+\.js)/);
  if (!m || !ARG.dist) return `${(url || "").split("/").pop()}:${satir}`;
  let tm = haritalar.get(m[1]);
  if (tm === undefined) { try { tm = new TraceMap(fs.readFileSync(path.join(String(ARG.dist), "assets", m[1] + ".map"), "utf8")); } catch { tm = null; } haritalar.set(m[1], tm); }
  if (!tm) return `${m[1]}:${satir}`;
  const o = originalPositionFor(tm, { line: Number(satir) + (satir === 0 ? 1 : 0) || 1, column: Number(sutun) || 0 });
  return `${o.name ? o.name + " " : ""}${(o.source || "?").replace(/^.*?(oyun|src|node_modules)\//, "$1/")}:${o.line}`;
}
const gorevler = ev.filter((e) => (e.name === "RunTask" || e.name === "ThreadControllerImpl::RunTask") && e.dur / 1000 >= ESIK)
  .filter((e) => (ARG.bas == null || (e.ts - t0) / 1000 >= Number(ARG.bas)) && (ARG.bit == null || (e.ts - t0) / 1000 <= Number(ARG.bit)));
const KAT = { FunctionCall: "js", EvaluateScript: "js", "v8.compile": "derleme", "v8.compileModule": "derleme", "V8.Compile": "derleme", TimerFire: "js", EventDispatch: "js", FireAnimationFrame: "js",
  UpdateLayoutTree: "stil", RecalculateStyles: "stil", Layout: "yerlesim", PrePaint: "boyama", Paint: "boyama", "Layerize": "boyama", UpdateLayer: "boyama", "MinorGC": "gc", "MajorGC": "gc", "V8.GC_SCAVENGER": "gc",
  ParseHTML: "html", "ParseAuthorStyleSheet": "css-ayristir", Decode: "gorsel", "Decode Image": "gorsel", "ImageDecodeTask": "gorsel", "HitTest": "isabet" };
for (const g of gorevler) {
  const ic = ev.filter((e) => e !== g && e.ts >= g.ts && e.ts + e.dur <= g.ts + g.dur);
  const kat = {}; const stil = []; const yer = []; const js = [];
  // yalnız kategorili en dış olaylar sayılır (iç içe çift sayım yok)
  const ust = [];
  for (const e of ic) { const k = KAT[e.name]; if (!k) continue; if (ust.some((u) => e.ts >= u.ts && e.ts + e.dur <= u.ts + u.dur && KAT[u.name] === k)) continue; ust.push(e); kat[k] = (kat[k] ?? 0) + e.dur / 1000; }
  for (const e of ic) {
    if (e.name === "UpdateLayoutTree") stil.push(`${Math.round(e.dur / 1000)}ms/${e.args?.elementCount ?? "?"} öğe`);
    if (e.name === "Layout") yer.push(`${Math.round(e.dur / 1000)}ms/${e.args?.beginData?.dirtyObjects ?? "?"}→${e.args?.endData ? "" : ""}`);
    if (["FunctionCall", "TimerFire", "EventDispatch", "FireAnimationFrame", "EvaluateScript"].includes(e.name) && e.dur / 1000 >= 5) {
      const d = e.args?.data ?? {};
      const kay = d.url ? kaynak(d.url, d.lineNumber, d.columnNumber) : "";
      js.push([e.dur / 1000, `${e.name}${d.functionName ? " " + d.functionName : ""}${d.type ? " " + d.type : ""} ${kay}`]);
    }
  }
  const diger = g.dur / 1000 - Object.values(kat).reduce((a, b) => a + b, 0);
  console.log(`\n■ @${Math.round((g.ts - t0) / 1000)} ms · ${Math.round(g.dur / 1000)} ms — ${Object.entries(kat).map(([k, v]) => `${k} ${Math.round(v)}`).join(" · ")} · diğer ${Math.round(diger)}`);
  if (stil.length) console.log(`   stil: ${stil.slice(0, 6).join(", ")}`);
  if (yer.length) console.log(`   yerleşim: ${yer.length} kez, ${yer.slice(0, 4).join(", ")}`);
  for (const [d, a] of js.sort((a, b) => b[0] - a[0]).slice(0, 6)) console.log(`   js ${Math.round(d)}ms ${a}`);
}
console.log(`\n${gorevler.length} görev ≥ ${ESIK} ms`);

// --gecersiz: geçersizleştirme izi (invalidationTracking kategorisi) — her uzun görevdeki stil hesabını kimin başlattığı
if (ARG.gecersiz) {
  const tum = olaylar.filter((e) => `${e.pid}:${e.tid}` === ana);
  for (const g of gorevler) {
    const ic = tum.filter((e) => e.ts >= g.ts - 400000 && e.ts <= g.ts + g.dur && /InvalidationTracking/.test(e.name));
    const say = new Map();
    for (const e of ic) {
      const d = e.args?.data ?? {};
      const neden = [e.name.replace("InvalidationTracking", ""), d.reason, d.changedClass && "sınıf:" + d.changedClass, d.changedAttribute && "öznitelik:" + d.changedAttribute,
        d.changedPseudo && "sözde:" + d.changedPseudo, d.changedId && "id:" + d.changedId, d.invalidationSet?.[0]?.classes && "küme:" + JSON.stringify(d.invalidationSet[0].classes).slice(0, 60),
        d.nodeName && "düğüm:" + String(d.nodeName).slice(0, 60), d.extraData && String(d.extraData).slice(0, 40)].filter(Boolean).join(" | ");
      say.set(neden, (say.get(neden) ?? 0) + 1);
    }
    console.log(`\n◆ @${Math.round((g.ts - t0) / 1000)} ms geçersizleştirme (önceki 400 ms dahil) — ${ic.length} kayıt`);
    for (const [n, c] of [...say].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`   ${c}× ${n}`);
  }
}
