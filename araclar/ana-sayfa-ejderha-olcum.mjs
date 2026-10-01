// Hero (kompakt oyuncu kartı) Ejderha çerçevesi taşma ölçümü — oyuncu_kartlari cevabı tarayıcıda taklit edilir (premium_cerceve = pc_ejderha2), SUNUCUYA YAZMAZ.
// Kullanım: node araclar/ana-sayfa-ejderha-olcum.mjs --adres=http://localhost:5230 [--etiket=once|sonra]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5230";
const ETIKET = ARG.etiket || "sonra";
const CIKTI = path.resolve("tasarim/ana-sayfa-serit");
fs.mkdirSync(CIKTI, { recursive: true });
const KOK = new URL(ADRES).origin;
const durum = JSON.parse(fs.readFileSync(path.resolve(".arayuz-denetim-oturum.json"), "utf8"));
durum.origins = (durum.origins || []).map((o) => ({ ...o, origin: KOK }));
const t = await chromium.launch({ channel: "chrome", headless: true });
const sonuc = {};
for (const [g, y] of [[360, 740], [390, 844], [390, 664]]) {
  const b = await t.newContext({ storageState: durum, viewport: { width: g, height: y }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const s = await b.newPage();
  await s.route(/\/rest\/v1\/rpc\/oyuncu_kartlari/, async (r) => {
    try {
      const yanit = await r.fetch(); const j = await yanit.json();
      const yama = (k) => ({ ...k, premium_cerceve: "pc_ejderha2", cerceve: null });
      const govde = Array.isArray(j) ? j.map(yama) : j && typeof j === "object" ? Object.fromEntries(Object.entries(j).map(([a, k]) => [a, k && typeof k === "object" ? yama(k) : k])) : j;
      await r.fulfill({ response: yanit, body: JSON.stringify(govde), contentType: "application/json" });
    } catch { await r.continue(); }
  });
  await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  await s.waitForSelector(".as-ko", { timeout: 20000 });
  await s.waitForTimeout(9000);   // tembel çerçeve çizimi inene kadar
  const o = await s.evaluate(() => {
    const ko = document.querySelector(".as-ko"); const kb = ko.getBoundingClientRect();
    const sayfa = document.querySelector(".as-a2")?.getBoundingClientRect();
    const dis = [];
    for (const e of ko.querySelectorAll("*")) {
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const tasma = { sol: Math.round(kb.left - r.left), ust: Math.round(kb.top - r.top), sag: Math.round(r.right - kb.right), alt: Math.round(r.bottom - kb.bottom) };
      if (tasma.sol > 0 || tasma.ust > 0 || tasma.sag > 0 || tasma.alt > 0) dis.push({ e: String(e.className?.baseVal ?? e.className).slice(0, 36) || e.tagName, ...tasma });
    }
    const ap = ko.querySelector(".p2, .pc, .qt-cerceve")?.getBoundingClientRect();
    return { kart: { sol: Math.round(kb.left), ust: Math.round(kb.top), g: Math.round(kb.width), y: Math.round(kb.height) },
      cerceve: ap ? { sol: Math.round(ap.left - kb.left), ust: Math.round(ap.top - kb.top), g: Math.round(ap.width), y: Math.round(ap.height) } : null,
      ekranSolTasma: Math.round(Math.min(0, kb.left)), sayfaSol: sayfa ? Math.round(sayfa.left) : null, dis: dis.slice(0, 8),
      kesen: getComputedStyle(ko).overflow, yatay: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  sonuc[`${g}x${y}`] = o;
  const kutu = await s.locator(".as-ko").boundingBox();
  await s.screenshot({ path: path.join(CIKTI, `${ETIKET}-ejderha-${g}x${y}.png`), clip: { x: 0, y: Math.max(0, kutu.y - 14), width: g, height: kutu.height + 28 } });
  await b.close();
}
await t.close();
fs.writeFileSync(path.join(CIKTI, `${ETIKET}-ejderha-olcum.json`), JSON.stringify(sonuc, null, 1));
console.log(JSON.stringify(sonuc, null, 1));
