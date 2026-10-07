// KOYU ZEMİN + OKUNMAYAN YAZI TARAMASI (7 Eki 2026, Sekme B) — sunucuya yazmaz, kayıtlı oturumla gezer.
// Ölçer: (1) koyu lacivert/mor büyük zemin (ekranın ≥ %12'si, parlaklık < 0,12, mavi-mor ton) — site teması açık mavi;
// (2) WCAG AA metin kontrastı (normal ≥ 4,5, büyük ≥ 3; zincirdeki yarı saydam zeminler karıştırılır);
// (3) yatay taşma; ekran görüntüsü alır. Mod giriş ekranları + Klasik/Saf Bilgi penceresi + maç kabukları (yok maç kimliği).
// Maç fazları için taklit testleri ayrı: kasa-ekran.mjs, duello-puan-ekran.mjs.
// Kullanım: npm run dev (başka kabukta) → node araclar/koyu-zemin-tarama.mjs [--adres=http://localhost:5173] [--cikti=tasarim/koyu-zemin]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5173";
const CIKTI = path.resolve(ARG.cikti || "tasarim/koyu-zemin");
const OTURUM = ARG.oturum || ".arayuz-denetim-oturum.json";
const YOK = "00000000-0000-4000-8000-000000000000";
// [ad, yol, tıklanacak seçici (pencere açar)]
const SAYFALAR = [["ana", "/"], ["klasik-pencere", "/", ".as-mod-serit--klasik"], ["safbilgi-pencere", "/", ".as-renk--saf"],
  ["modlar", "/modlar"], ["meydan", "/meydan"], ["grup", "/meydan?bolum=grup"], ["duello", "/duello"], ["kasa", "/kasa"],
  ["turnuva", "/turnuva"], ["hatalarim", "/calisma"], ["mac-yok", `/mac/${YOK}`], ["duello-yok", `/duello/${YOK}`], ["kasa-yok", `/kasa/${YOK}`]];
const BOYUTLAR = [[390, 844], [360, 740]];
fs.mkdirSync(CIKTI, { recursive: true });
const st = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const kok = new URL(ADRES).origin;
const origin = { ...(st.origins.find((o) => o.origin === kok) || st.origins[0]), origin: kok };

const OLC = () => {
  const ayril = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const kar = (ust, alt) => ({ r: ust.r * ust.a + alt.r * (1 - ust.a), g: ust.g * ust.a + alt.g * (1 - ust.a), b: ust.b * ust.a + alt.b * (1 - ust.a), a: 1 });
  // Zemin: arka plan rengi + (renk yoksa) degrade/görselin ilk rengi
  const renk = (e) => { const s = getComputedStyle(e); const c = ayril(s.backgroundColor); if (c && c.a > 0) return c; const g = s.backgroundImage.match(/linear-gradient\([^#r]*?(rgba?\([^)]+\))/); return g ? ayril(g[1]) : null; };
  const zemin = (el) => { const z = []; for (let e = el; e; e = e.parentElement) { const c = renk(e); if (c && c.a > 0) { z.push(c); if (c.a >= 1) break; } } let t = { r: 255, g: 255, b: 255, a: 1 }; for (const c of z.reverse()) t = kar(c, t); return t; };
  const gorunur = (el) => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) return false; const s = getComputedStyle(el); if (s.visibility === "hidden" || s.display === "none") return false; for (let e = el; e; e = e.parentElement) if (+getComputedStyle(e).opacity === 0) return false; return true; };
  const yol = (el) => { const c = (typeof el.className === "string" ? el.className : "").trim().split(/\s+/).slice(0, 2).join("."); return el.tagName.toLowerCase() + (c ? "." + c : ""); };
  const alan = innerWidth * innerHeight; const koyu = [];
  for (const e of document.querySelectorAll("body *")) {
    if (!gorunur(e)) continue; const r = e.getBoundingClientRect();
    const g = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
    if (g < alan * 0.12) continue; const c = renk(e); if (!c || c.a < 0.6) continue;
    if (lum(c) < 0.12 && c.b >= c.g) koyu.push(`${yol(e)} rgb(${c.r},${c.g},${c.b})`);
  }
  const dusuk = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const gor = new Set();
  for (let n; (n = w.nextNode()); ) {
    const t = n.nodeValue.trim(); const el = n.parentElement;
    if (!t || !el || gor.has(el) || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName) || el.closest("[aria-hidden='true'], .qt-gizli, [disabled], [aria-disabled='true']") || !gorunur(el)) continue;
    gor.add(el); const s = getComputedStyle(el); const on = ayril(s.color); if (!on) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    const arka = zemin(el); const k = kar({ ...on, a: on.a * op }, arka);
    const oran = (Math.max(lum(k), lum(arka)) + 0.05) / (Math.min(lum(k), lum(arka)) + 0.05);
    const px = parseFloat(s.fontSize); const buyuk = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700);
    if (oran < (buyuk ? 3 : 4.5)) dusuk.push(`${yol(el)} "${t.slice(0, 32)}" ${oran.toFixed(2)}`);
  }
  const de = document.documentElement;
  return { koyu: [...new Set(koyu)].slice(0, 4), dusuk: [...new Set(dusuk)].slice(0, 6), tasma: de.scrollWidth - de.clientWidth };
};

const t = await chromium.launch({ channel: "chrome", headless: true });
let top = 0, hata = 0;
for (const dil of ["tr", "en"]) for (const [w, h] of BOYUTLAR) {
  const yerel = [...(origin.localStorage || []).filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }];
  const b = await t.newContext({ viewport: { width: w, height: h }, storageState: { cookies: st.cookies, origins: [{ origin: kok, localStorage: yerel }] } });
  for (const [ad, yolu, tikla] of SAYFALAR) {
    const s = await b.newPage();
    // Giriş yapmış oyuncuda dili profil belirler: yazmadan, yalnız tarayıcıya gelen yanıtta değiştir.
    await s.route(/\/rest\/v1\/(profiles|rpc\/profilim)/, async (r) => {
      try { const y = await r.fetch(); await r.fulfill({ response: y, body: (await y.text()).replace(/"dil":\s*"(tr|en)"/g, `"dil":"${dil}"`) }); } catch { await r.continue(); }
    });
    try {
      await s.goto(ADRES + yolu, { waitUntil: "domcontentloaded" }); await s.waitForTimeout(2500);
      await s.waitForFunction(() => !document.querySelector(".qt-sayfa-yukleniyor, #qt-ilk-yukleme"), null, { timeout: 10000 }).catch(() => {});
      if (yolu === "/") await s.waitForSelector(".as-a-seritler", { timeout: 20000 }).catch(() => {});   // ana sayfa verisi (profil) yavaş gelebilir
      if (tikla) { await s.click(tikla, { timeout: 8000 }); await s.waitForTimeout(900); }
      const o = await s.evaluate(OLC);
      await s.screenshot({ path: path.join(CIKTI, `${ad}-${w}x${h}-${dil}.png`) });
      top++;
      if (o.koyu.length || o.dusuk.length || o.tasma > 1) { hata++; console.log("✗", ad, `${w}x${h}`, dil, JSON.stringify(o)); }
    } catch (e) { hata++; top++; console.log("✗ HATA", ad, `${w}x${h}`, dil, e.message.slice(0, 90)); }
    await s.close();
  }
  await b.close();
}
await t.close();
console.log(`${top - hata}/${top} temiz — görüntüler: ${path.relative(process.cwd(), CIKTI)}`); process.exit(hata ? 1 : 0);
