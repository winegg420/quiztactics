// Lig yıldızı (lig amblemi) kesilme ölçümü + yakın plan ekran görüntüsü — YALNIZ yerel (sunucuya istek atmaz).
// Önce: npx vite --port 5190   Sonra: node araclar/lig-yildiz-ekran.mjs --etiket=once [--yer=kasa,duello,klasik,coklu]
// Her (yer × genişlik × dil × lig) için sahneyi (araclar/lig-yildiz-sahne) açar; amblemin her kırpan atadan (overflow ≠ visible)
// kaç px dışarıda kaldığını ve komşu öğelerle (Lv hapı, ad) çakışmasını ölçer. Çıktı: tasarim/lig-yildiz/<etiket>/*.png + olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5190";
const ETIKET = ARG.etiket || "once";
const YERLER = String(ARG.yer || "kasa,duello,klasik,coklu").split(",");
const GENISLIK = [360, 390, 412];
const DILLER = ["tr", "en"];
const LIGLER = ["bronz", "gumus", "altin", "elmas", "efsane"];
const CIKTI = path.resolve("tasarim/lig-yildiz", ETIKET);
fs.mkdirSync(CIKTI, { recursive: true });

const OLC = () => {
  const sonuc = [];
  for (const a of document.querySelectorAll("#sahne .pp-amblem")) {
    const r = a.getBoundingClientRect();
    const cs = getComputedStyle(a);
    const gorunur = r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden";
    let kes = { sol: 0, ust: 0, sag: 0, alt: 0 }; let kesen = null;
    for (let p = a.parentElement; p && p.id !== "kok"; p = p.parentElement) {
      const pc = getComputedStyle(p);
      if (pc.overflowX === "visible" && pc.overflowY === "visible") continue;
      const pr = p.getBoundingClientRect();
      const k = { sol: Math.max(0, pr.left - r.left), ust: Math.max(0, pr.top - r.top), sag: Math.max(0, r.right - pr.right), alt: Math.max(0, r.bottom - pr.bottom) };
      if (Math.max(...Object.values(k)) > Math.max(...Object.values(kes))) { kes = k; kesen = `${p.tagName.toLowerCase()}.${String(p.className).split(" ")[0]}`; }
    }
    const cakisma = [];
    for (const d of document.querySelectorAll("#sahne .mo-lv, #sahne .qt-oyuncu-ad, #sahne .qt-skor, #sahne .ks-tur, #sahne .hk-tur, #sahne .mo-sayi")) {
      const dr = d.getBoundingClientRect();
      if (dr.width === 0 || d.contains(a)) continue;
      const x = Math.min(r.right, dr.right) - Math.max(r.left, dr.left); const y = Math.min(r.bottom, dr.bottom) - Math.max(r.top, dr.top);
      if (x > 1 && y > 1) cakisma.push(`${String(d.className).split(" ")[0]}:${Math.round(x)}x${Math.round(y)}`);
    }
    const mo = a.closest(".mo-seviye"); const lv = mo?.querySelector(".mo-lv");
    sonuc.push({ gorunur, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, x: Math.round(r.left), y: Math.round(r.top),
      kesik: Math.max(...Object.values(kes)), yon: kes, kesen, cakisma, lvH: lv ? Math.round(lv.getBoundingClientRect().height * 10) / 10 : null,
      seviyeH: mo ? Math.round(mo.getBoundingClientRect().height * 10) / 10 : null });
  }
  return { amblemler: sonuc, yatay: document.documentElement.scrollWidth - document.documentElement.clientWidth };
};

const tarayici = await chromium.launch({ channel: "chrome" });
const olcum = [];
try {
  for (const g of GENISLIK) {
    const baglam = await tarayici.newContext({ viewport: { width: g, height: 640 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
    await baglam.route((u) => !/localhost|127\.0\.0\.1/.test(u.hostname), (r) => r.abort());
    for (const dil of DILLER) for (const yer of YERLER) for (const lig of LIGLER) {
      const sayfa = await baglam.newPage();
      const hatalar = [];
      sayfa.on("pageerror", (e) => hatalar.push(String(e.message).slice(0, 120)));
      try {
        await sayfa.goto(`${ADRES}/araclar/lig-yildiz-sahne/index.html?dil=${dil}&lig=${lig}&yer=${yer}${ARG.skor ? `&skor=${ARG.skor}` : ""}${ARG.ek ? `&${ARG.ek}` : ""}`, { waitUntil: "domcontentloaded" });
        await sayfa.waitForFunction(() => document.documentElement.dataset.hazir === "1", null, { timeout: 20000 });
        await sayfa.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 8000 }).catch(() => {});
        await sayfa.waitForTimeout(250);
        const o = await sayfa.evaluate(OLC);
        const ad = `${yer}-${g}-${dil}-${lig}`;
        await sayfa.locator("#sahne").screenshot({ path: path.join(CIKTI, `${ad}.png`) });
        olcum.push({ ad, yer, g, dil, lig, ...o, hatalar });
      } catch (e) { olcum.push({ ad: `${yer}-${g}-${dil}-${lig}`, hata: String(e.message).slice(0, 200) }); }
      await sayfa.close();
    }
    await baglam.close();
  }
} finally { await tarayici.close(); }
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(olcum, null, 1));
const ozet = {};
for (const o of olcum) {
  if (o.hata) { (ozet[o.yer ?? "?"] ??= []).push(o.ad + " HATA " + o.hata); continue; }
  const a = o.amblemler.filter((x) => x.gorunur);
  const enKesik = Math.max(0, ...a.map((x) => x.kesik));
  const k = ozet[o.yer] ??= { amblemYok: 0, kesik: 0, cakisan: 0, toplam: 0, enKesik: 0, hata: 0 };
  k.toplam++; if (!a.length) k.amblemYok++; if (enKesik > 0.5) k.kesik++; k.enKesik = Math.max(k.enKesik, Math.round(enKesik * 10) / 10);
  if (a.some((x) => x.cakisma.length)) k.cakisan++; if (o.hatalar.length) k.hata++;
}
console.log(JSON.stringify(ozet, null, 1));
