// Bayrak + Lv + lig yıldızı satırı sığma ölçümü — YALNIZ yerel (sunucuya istek atmaz), sessiz (ses kapalı, başsız).
// Önce: npx vite --port 5190   Sonra: node araclar/bayrak-sigdir-olcum.mjs --etiket=once [--yer=kasa,klasik,...] [--gorsel]
// Her (yer × genişlik × dil × lig × durum) için gerçek bileşenleri açar; bayrak / Lv / yıldızın görünür olup olmadığını,
// kırpan atadan taşmasını, birbirine ve ad/skor/avatara binmesini ve sayfa yatay taşmasını ölçer.
// Çıktı: tasarim/bayrak-sigdir/<etiket>/olcum.json (+ --gorsel ile *.png). Konsola yer başına özet basar.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5190";
const ETIKET = ARG.etiket || "once";
const YERLER = String(ARG.yer || "kasa,duello,klasik,coklu,vs,vitrin,liste,sonu").split(",");
const GENISLIK = String(ARG.genislik || "320,340,360,375,390,412,430").split(",").map(Number);
const DILLER = ["tr", "en"];
const LIGLER = String(ARG.lig || "bronz,gumus,altin,elmas,efsane").split(",");
// durum: rakip Lv · ben Lv · ad · skor (3 basamaklı skor + Lv 112 + uzun ad = en kötü durum)
const DURUMLAR = [
  { k: "kisa-lv5", lv: 5, benlv: 5, ad: "Ece", skor: "45:30" },
  { k: "orta-lv35", lv: 35, benlv: 35, ad: "Deniz Yıldız", skor: "120:95" },
  { k: "uzun-lv112", lv: 112, benlv: 100, ad: "Deniz Yıldırımoğlu", skor: "995:120" },
];
const CIKTI = path.resolve("tasarim/bayrak-sigdir", ETIKET);
fs.mkdirSync(CIKTI, { recursive: true });

const OLC = () => {
  const sonuc = [];
  const kesici = (el, r) => {
    let kes = 0; let kesen = null;
    for (let p = el.parentElement; p && p.id !== "kok"; p = p.parentElement) {
      const pc = getComputedStyle(p);
      if (pc.overflowX === "visible" && pc.overflowY === "visible") continue;
      const pr = p.getBoundingClientRect();
      const k = Math.max(0, pr.left - r.left, pr.top - r.top, r.right - pr.right, r.bottom - pr.bottom);
      if (k > kes) { kes = k; kesen = `${p.tagName.toLowerCase()}.${String(p.className).split(" ")[0]}`; }
    }
    return { kes, kesen };
  };
  const ogeler = [...document.querySelectorAll("#sahne .mo-bayrak, #sahne .ara-kart-bayrak, #sahne .mo-lv, #sahne .ara-kart-rozetler .qt-rozet, #sahne .qt-ok-lv, #sahne .pp-amblem")];
  const komsular = [...document.querySelectorAll("#sahne .qt-oyuncu-ad, #sahne .qt-skor, #sahne .ks-tur, #sahne .hk-tur, #sahne .mo-sayi, #sahne .qt-avatar, #sahne .lg-puan, #sahne .lg-sira")];
  for (const el of ogeler) {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    const tur = el.matches(".mo-bayrak, .ara-kart-bayrak") ? "bayrak" : el.matches(".mo-lv, .qt-rozet, .qt-ok-lv") ? "lv" : "yildiz";
    const gorunur = r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden";
    const { kes, kesen } = kesici(el, r);
    const bin = [];
    for (const d of [...ogeler, ...komsular]) {
      if (d === el || d.contains(el) || el.contains(d)) continue;
      const dr = d.getBoundingClientRect(); if (dr.width === 0) continue;
      const x = Math.min(r.right, dr.right) - Math.max(r.left, dr.left); const y = Math.min(r.bottom, dr.bottom) - Math.max(r.top, dr.top);
      if (x > 1 && y > 1) bin.push(`${String(d.className).split(" ")[0]}:${Math.round(x)}x${Math.round(y)}`);
    }
    // Satır, kendi sütunundan (qt-oyuncu-yazi / mo-ben-yazi / lg-bilgi) dışarı taşıyor mu
    let sutun = el.closest(".qt-oyuncu-yazi, .mo-ben-yazi, .lg-bilgi, .msk-isim");
    if (sutun && getComputedStyle(sutun).display === "contents") sutun = el.closest(".qt-oyuncu");   // dar telefonda yazı sütunu 'contents': asıl kap oyuncu bloğu
    let tasma = 0;
    if (sutun) { const sr = sutun.getBoundingClientRect(); tasma = Math.max(0, r.right - sr.right, sr.left - r.left); }
    sonuc.push({ tur, gorunur, w: Math.round(r.width * 10) / 10, x: Math.round(r.left), y: Math.round(r.top), kesik: Math.round(kes * 10) / 10, kesen, bin, sutunTasma: Math.round(tasma * 10) / 10,
      font: tur === "lv" ? parseFloat(cs.fontSize) : null });
  }
  // Satır sayısı: aynı .mo-seviye içinde 3 öğe tek hizada mı
  const satirlar = [...document.querySelectorAll("#sahne .mo-seviye")].map((s) => { const r = s.getBoundingClientRect(); const o = s.closest(".qt-oyuncu-yazi, .mo-ben-yazi")?.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), sutunW: o ? Math.round(o.width) : null }; });
  // Üç parça tek satırda mı: aynı .mo-seviye içindeki görünür öğelerin dikey merkezleri arası fark
  const tekSatir = [...document.querySelectorAll("#sahne .mo-seviye")].every((s) => { const m = [...s.children].filter((c) => c.getBoundingClientRect().width > 0).map((c) => { const r = c.getBoundingClientRect(); return r.top + r.height / 2; }); return !m.length || Math.max(...m) - Math.min(...m) < 6; });
  return { ogeler: sonuc, satirlar, tekSatir, yatay: document.documentElement.scrollWidth - document.documentElement.clientWidth };
};

const tarayici = await chromium.launch({ channel: "chrome", args: ["--mute-audio"] });
const olcum = [];
try {
  for (const g of GENISLIK) {
    const baglam = await tarayici.newContext({ viewport: { width: g, height: 640 }, deviceScaleFactor: ARG.gorsel ? 3 : 1, hasTouch: true, isMobile: true });
    await baglam.route((u) => !/localhost|127\.0\.0\.1/.test(u.hostname), (r) => r.abort());
    for (const dil of DILLER) for (const yer of YERLER) for (const lig of LIGLER) for (const d of DURUMLAR) {
      // Görsel çekimde yalnız en kötü durum + iki lig (dosya sayısı); ölçümde hepsi
      const sayfa = await baglam.newPage();
      const hatalar = [];
      sayfa.on("pageerror", (e) => hatalar.push(String(e.message).slice(0, 120)));
      const ad = `${yer}-${g}-${dil}-${lig}-${d.k}`;
      try {
        await sayfa.goto(`${ADRES}/araclar/lig-yildiz-sahne/index.html?dil=${dil}&lig=${lig}&yer=${yer}&lv=${d.lv}&benlv=${d.benlv}&ad=${encodeURIComponent(d.ad)}&skor=${d.skor}`, { waitUntil: "domcontentloaded" });
        await sayfa.waitForFunction(() => document.documentElement.dataset.hazir === "1", null, { timeout: 20000 });
        await sayfa.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 8000 }).catch(() => {});
        await sayfa.waitForTimeout(200);
        const o = await sayfa.evaluate(OLC);
        if (ARG.gorsel && d.k === "uzun-lv112" && (lig === "altin" || lig === "efsane") && dil === "tr") await sayfa.locator("#sahne").screenshot({ path: path.join(CIKTI, `${ad}.png`) });
        olcum.push({ ad, yer, g, dil, lig, durum: d.k, ...o, hatalar });
      } catch (e) { olcum.push({ ad, yer, g, dil, lig, durum: d.k, hata: String(e.message).slice(0, 200) }); }
      await sayfa.close();
    }
    await baglam.close();
  }
} finally { await tarayici.close(); }
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(olcum, null, 1));

// Özet: yer × genişlik → sorunlu senaryo sayısı (bayrak yok, yıldız yok, kesik > 0.5, binme, sütun taşması, yatay taşma)
const ozet = {};
for (const o of olcum) {
  const k = (ozet[`${o.yer}@${o.g}`] ??= { n: 0, bayrakYok: 0, lvYok: 0, yildizYok: 0, kesik: 0, bin: 0, sutunTasma: 0, cokSatir: 0, yatay: 0, hata: 0 });
  k.n++;
  if (o.hata || o.hatalar?.length) { k.hata++; continue; }
  const t = (x) => o.ogeler.filter((e) => e.tur === x);
  if (!t("bayrak").some((e) => e.gorunur)) k.bayrakYok++;
  if (!t("lv").some((e) => e.gorunur)) k.lvYok++;
  if (!t("yildiz").some((e) => e.gorunur)) k.yildizYok++;
  if (o.ogeler.some((e) => e.gorunur && e.kesik > 0.5)) k.kesik++;
  if (o.ogeler.some((e) => e.gorunur && e.bin.length)) k.bin++;
  if (o.ogeler.some((e) => e.gorunur && e.sutunTasma > 0.5)) k.sutunTasma++;
  if (o.tekSatir === false) k.cokSatir++;
  if (o.yatay > 0) k.yatay++;
}
const satirlar = Object.entries(ozet).map(([a, k]) => `${a.padEnd(12)} n=${String(k.n).padStart(3)} bayrakYok=${k.bayrakYok} lvYok=${k.lvYok} yildizYok=${k.yildizYok} kesik=${k.kesik} bin=${k.bin} sutunTasma=${k.sutunTasma} cokSatir=${k.cokSatir} yatay=${k.yatay} hata=${k.hata}`);
fs.writeFileSync(path.join(CIKTI, "ozet.txt"), satirlar.join("\n"));
console.log(satirlar.join("\n"));
