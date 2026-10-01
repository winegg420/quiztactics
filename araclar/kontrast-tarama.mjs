// Kontrast + dokunma hedefi taraması (360 px, TR/EN). Önce `npm run dev`, sonra:
//   node araclar/kontrast-tarama.mjs [--dil=en] [--esik=4.5]
// Oturum: araclar/arayuz-denetim.mjs'in yazdığı .arayuz-denetim-oturum.json.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:4173"; // npm run build && npx vite preview --port 4173
const DIL = ARG.dil || "tr";
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const SAYFALAR = ["/", "/siralama", "/profil", "/turnuva", "/sezon-yolu", "/gorevler", "/joker", "/gizlilik", "/kosullar"];

const OLC = () => {
  const ayril = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const kar = (ust, alt) => ({ r: ust.r * ust.a + alt.r * (1 - ust.a), g: ust.g * ust.a + alt.g * (1 - ust.a), b: ust.b * ust.a + alt.b * (1 - ust.a), a: 1 });
  const zemin = (el) => { const zincir = []; for (let e = el; e; e = e.parentElement) { const c = ayril(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { zincir.push(c); if (c.a >= 1) break; } } let t = { r: 255, g: 255, b: 255, a: 1 }; for (const c of zincir.reverse()) t = kar(c, t); return t; };
  const sonuc = [];
  const gorunur = (el) => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const s = getComputedStyle(el); if (s.visibility === "hidden" || s.display === "none") return false; for (let e = el, o = 1; e; e = e.parentElement) { if (+getComputedStyle(e).opacity === 0) return false; } return true; };
  const yol = (el) => { const c = (el.className && el.className.baseVal === undefined ? String(el.className) : "").trim().split(/\s+/).slice(0, 2).join("."); return el.tagName.toLowerCase() + (c ? "." + c : ""); };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const gor = new Set();
  for (let n; (n = w.nextNode()); ) {
    const t = n.nodeValue.trim(); const el = n.parentElement;
    if (!t || !el || gor.has(el) || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName) || !gorunur(el)) continue;
    gor.add(el);
    const s = getComputedStyle(el); const on = ayril(s.color); if (!on) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    const arka = zemin(el); const k = kar({ ...on, a: on.a * op }, arka);
    const oran = (Math.max(lum(k), lum(arka)) + 0.05) / (Math.min(lum(k), lum(arka)) + 0.05);
    const px = parseFloat(s.fontSize); const kalin = +s.fontWeight >= 700;
    const buyuk = px >= 24 || (px >= 18.66 && kalin);
    sonuc.push({ el: yol(el), metin: t.slice(0, 40), oran: +oran.toFixed(2), px, buyuk });
  }
  return sonuc;
};

const t = await chromium.launch({ channel: "chrome", headless: true });
// Oturum başka bir porttan (dev 5173) yazılmış olabilir: depolama kökenini hedef adrese taşı.
let durum;
if (fs.existsSync(OTURUM)) {
  durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  const kok = new URL(ADRES).origin;
  durum.origins = (durum.origins || []).map((o) => ({ ...o, origin: kok }));
}
// Dil, her açılışta yazılan init script ile DEĞİL, bir kez depolamaya konur (yoksa uygulama dil değişimi sanıp yeniden yükler).
if (durum) for (const o of durum.origins) o.localStorage = [...(o.localStorage || []).filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: DIL }];
const b = await t.newContext({ storageState: durum, viewport: { width: 360, height: 800 } });
const s = await b.newPage();
// Giriş yapmış oyuncuda dili profil belirler (profiles.dil): yazmadan, yalnız tarayıcıya gelen yanıtta değiştir.
await s.route(/\/rest\/v1\/(profiles|rpc)/, async (r) => {
  try { const y = await r.fetch(); const m = (await y.text()).replace(/"dil":\s*"(tr|en)"/g, `"dil":"${DIL}"`); await r.fulfill({ response: y, body: m }); } catch { await r.continue(); }
});
// Dil değişince uygulama bir kez yeniden yükleyebilir: ilk açılışı ısıt.
try { await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" }); await s.waitForTimeout(4000); } catch {}
const hepsi = {};
for (const y of SAYFALAR) {
  try {
    await s.goto(ADRES + y, { waitUntil: "domcontentloaded", timeout: 20000 });
    await s.waitForTimeout(3500);
    const liste = await s.evaluate(OLC);
    const gerek = (x) => (x.buyuk ? 3 : 4.5);
    hepsi[y] = liste.filter((x) => x.oran < gerek(x));
    console.log(`\n## ${y} (${DIL}) — ${liste.length} metin, ${hepsi[y].length} eşik altı`);
    const g = new Map(); for (const x of hepsi[y]) { const a = x.el + "|" + x.oran; if (!g.has(a)) g.set(a, x); }
    for (const x of g.values()) console.log(`  ${x.oran}\t${x.px}px\t${x.el}\t"${x.metin}"`);
  } catch (e) { console.log(`## ${y}: açılamadı — ${String(e).slice(0, 100)}`); }
}
await t.close();
