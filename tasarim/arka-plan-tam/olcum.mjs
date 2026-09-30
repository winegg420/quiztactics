// Kart arka planı TAM GÖRÜNÜR mod — önizleme ölçümü ve ekran görüntüsü (yalnız /arka-plan-onizleme).
// Kullanım: node tasarim/arka-plan-tam/olcum.mjs [--adres=http://localhost:5174] [--asama=gorsel|olcum|kontrast|fps|onceki|sonraki]
// Sahip kapısı (sahip_mi RPC) yalnız bu tarayıcıda taklit edilir; sunucuya/DB'ye dokunulmaz.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright-core";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5174";
const ASAMA = ARG.asama || "hepsi";
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const DIZIN = path.resolve("tasarim/arka-plan-tam");
const TURLER = ["su", "kar", "yaprak", "kor", "gece", "kuzey"];

async function ac(tarayici, { w = 390, mod = "yeni", azalt = false } = {}) {
  const baglam = await tarayici.newContext({
    storageState: fs.existsSync(OTURUM) ? OTURUM : undefined,
    viewport: { width: w, height: 900 }, reducedMotion: azalt ? "reduce" : "no-preference", deviceScaleFactor: 2,
  });
  await baglam.addInitScript((m) => { try { localStorage.setItem("qt_arka_plan_onizleme_tam", JSON.stringify({ mod: m, karar: null })); } catch { /* yut */ } }, mod);
  await baglam.route("**/rest/v1/rpc/sahip_mi*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "true" }));
  const s = await baglam.newPage();
  const hatalar = [];
  s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text().slice(0, 140)); });
  s.on("pageerror", (e) => hatalar.push(String(e).slice(0, 140)));
  await s.goto(ADRES + "/arka-plan-onizleme", { waitUntil: "domcontentloaded" });
  await s.waitForSelector(".abpo-bolum .abp", { timeout: 20000 });
  await s.waitForTimeout(600);
  return { baglam, s, hatalar };
}
const bolum = (s, i) => s.locator(".abpo-bolum").nth(i);

async function gorsel(tarayici) {
  for (const mod of ["yeni", "eski"]) {
    for (const w of [390, 360]) {
      const { baglam, s } = await ac(tarayici, { w, mod });
      for (let i = 0; i < TURLER.length; i++) {
        await bolum(s, i).scrollIntoViewIfNeeded();
        await s.waitForTimeout(500);
        await bolum(s, i).screenshot({ path: path.join(DIZIN, `${mod}-${TURLER[i]}-${w}.png`) });
      }
      await baglam.close();
    }
  }
}

// Sabit karelerin (hareketi azalt açık → hepsi sabit) piksel özeti: önce/sonra karşılaştırması için.
async function ozet(tarayici, etiket) {
  const { baglam, s } = await ac(tarayici, { w: 390, mod: "eski", azalt: true });
  const sonuc = {};
  await s.addStyleTag({ content: ".abpo-mod, .abpo-tamkarar { display: none !important; }" });   // yeni anahtar satırları düzeni kaydırmasın (HEAD ile piksel karşılaştırması)
  for (let i = 0; i < TURLER.length; i++) {
    const kartlar = bolum(s, i).locator(".abp");
    const n = await kartlar.count();
    for (let j = 0; j < n; j++) {
      await kartlar.nth(j).scrollIntoViewIfNeeded();
      await s.waitForTimeout(250);
      const buf = await kartlar.nth(j).screenshot();
      sonuc[`${TURLER[i]}#${j}`] = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 12);
      // DOM parmak izi: kartın HTML'i (useId kimlikleri normalleştirilmiş) — eski modda HEAD ile aynı olmalı
      const html = await kartlar.nth(j).evaluate((e) => e.outerHTML.replace(/:r[0-9a-z]+:/g, "ID"));
      sonuc[`${TURLER[i]}#${j}`] += "|" + crypto.createHash("sha1").update(html).digest("hex").slice(0, 12);
      if (etiket === "onceki" || etiket === "sonraki") fs.writeFileSync(path.join(DIZIN, `_${etiket}-${TURLER[i]}-${j}.png`), buf);
    }
  }
  await baglam.close();
  fs.writeFileSync(path.join(DIZIN, `ozet-${etiket}.json`), JSON.stringify(sonuc, null, 1));
  return sonuc;
}

const OLC = () => {
  const METIN = [".abpo-ad", ".abpo-lv", ".abpo-sira", ".abpo-puan"];
  const PARCA = ".abp-d, .abp-kor-koz, .abp-gece-yildiz, .abp-gece-kayan, .abp-kuzey-yildiz";
  const kesisim = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const yaziKutusu = (el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };
  const cikti = [];
  document.querySelectorAll(".abpo-bolum").forEach((b, bi) => {
    b.querySelectorAll(".abp").forEach((k, ki) => {
      k.scrollIntoView({ block: "center" });
      const kr = k.getBoundingClientRect();
      const yazilar = [...k.querySelectorAll(METIN.join(","))].map(yaziKutusu);
      const xp = k.querySelector(".abpo-xp"); if (xp) yazilar.push(xp.getBoundingClientRect());
      let ortusen = 0; let toplam = 0;
      k.querySelectorAll(PARCA).forEach((p) => {
        const pr = p.getBoundingClientRect();
        if (pr.width < 0.5) return;
        const ic = { left: Math.max(pr.left, kr.left), right: Math.min(pr.right, kr.right), top: Math.max(pr.top, kr.top), bottom: Math.min(pr.bottom, kr.bottom) };
        if (ic.right <= ic.left || ic.bottom <= ic.top) return;
        toplam++;
        if (yazilar.some((y) => kesisim(ic, y) > 0.5)) ortusen++;
      });
      const ad = k.querySelector(".abpo-ad");
      let dokunma = null;
      if (ad) { const y = yaziKutusu(ad); const el = document.elementFromPoint(y.left + y.width / 2, y.top + y.height / 2); dokunma = el ? (el.closest(".abp-parca") ? "PARCACIK-ENGELLIYOR" : "icerik") : null; }
      const pc = getComputedStyle(k.querySelector(".abp-parca"));
      cikti.push({
        bolum: bi, kart: ki, sinif: k.className.replace(/\s+/g, " "), parcaToplam: toplam, yaziyiKapatan: ortusen, dokunma,
        parcaPE: pc.pointerEvents, parcaZ: pc.zIndex, parcaMaske: pc.maskImage, okuma: !!k.querySelector(".abp-okuma"),
        icerikZ: getComputedStyle(k.querySelector(".abp-icerik")).zIndex, yaziGolgesi: getComputedStyle(k.querySelector(".abp-icerik")).textShadow,
        yatayTasma: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      });
    });
  });
  return cikti;
};

async function olcum(tarayici) {
  const rapor = {};
  for (const w of [390, 360]) {
    for (const [ad, azalt] of [["normal", false], ["azalt", true]]) {
      const { baglam, s, hatalar } = await ac(tarayici, { w, mod: "yeni", azalt });
      await s.waitForTimeout(800);
      const o = await s.evaluate(OLC);
      rapor[`${w}-${ad}`] = { konsolHatasi: hatalar, kartlar: o };
      if (azalt) rapor[`${w}-${ad}`].oynayan = await s.locator(".abp--oynar, .abp--yumusak").count();
      await baglam.close();
    }
  }
  fs.writeFileSync(path.join(DIZIN, "olcum.json"), JSON.stringify(rapor, null, 1));
  for (const [k, v] of Object.entries(rapor)) {
    const sabit = v.kartlar.filter((c) => c.sinif.includes("abp--sabit"));
    console.log(k, "| konsol:", v.konsolHatasi.length, "| oynayan(azalt):", v.oynayan ?? "-", "| sabit kart:", sabit.length,
      "| sabit karede yazıyı kapatan parçacık:", sabit.reduce((t, c) => t + c.yaziyiKapatan, 0), "/", sabit.reduce((t, c) => t + c.parcaToplam, 0),
      "| dokunma engeli:", v.kartlar.filter((c) => c.dokunma !== "icerik").length, "| pointer-events:", [...new Set(v.kartlar.map((c) => c.parcaPE))].join(","),
      "| okuma katmanı:", v.kartlar.filter((c) => c.okuma).length, "| yatay taşma:", Math.max(...v.kartlar.map((c) => c.yatayTasma)));
    const hareketli = v.kartlar.filter((c) => c.sinif.includes("abp--oynar"));
    if (hareketli.length) console.log("   hareketli kart:", hareketli.length, "z(parça/içerik):", hareketli[0].parcaZ, "/", hareketli[0].icerikZ, "maske:", hareketli[0].parcaMaske, "gölge:", hareketli[0].yaziGolgesi);
  }
}

// Parçacıksız TABAN kare: parçacık katmanı gizli, yazı saydam → yazı bölgesindeki taban pikselleri; beyaz yazıya karşı kontrast.
async function kontrast(tarayici) {
  const sonuc = [];
  for (const mod of ["yeni", "eski"]) {
    const { baglam, s } = await ac(tarayici, { w: 390, mod, azalt: true });
    for (let i = 0; i < TURLER.length; i++) {
      const kartlar = bolum(s, i).locator(".abp");
      for (const j of [1, 2]) {   // 1 = sabit kart, 2 = lig satırı
        const kart = kartlar.nth(j);
        await kart.scrollIntoViewIfNeeded();
        const kutular = await s.evaluate(({ i, j }) => {
          const k = document.querySelectorAll(".abpo-bolum")[i].querySelectorAll(".abp")[j];
          const kr = k.getBoundingClientRect();
          const yaz = (sel) => [...k.querySelectorAll(sel)].map((el) => { const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return { ad: sel, x: b.left - kr.left, y: b.top - kr.top, w: b.width, h: b.height }; });
          const kutular = [...yaz(".abpo-ad"), ...yaz(".abpo-lv"), ...yaz(".abpo-sira"), ...yaz(".abpo-puan")];
          k.querySelector(".abp-parca").style.visibility = "hidden";
          k.querySelectorAll(".abp-icerik span, .abp-icerik b").forEach((e) => { if (!e.closest("svg") && !e.closest(".abpo-xp")) { e.style.color = "transparent"; e.style.textShadow = "none"; } });
          k.querySelector(".abp-icerik").style.textShadow = "none";
          return kutular;
        }, { i, j });
        await s.waitForTimeout(150);
        const png = (await kart.screenshot()).toString("base64");
        const olc = await s.evaluate(async ({ png, kutular }) => {
          const img = new Image(); img.src = "data:image/png;base64," + png; await img.decode();
          const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
          const g = c.getContext("2d"); g.drawImage(img, 0, 0);
          const ol = 2;
          const lum = (r, gg, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b); };
          return kutular.filter((k) => k.w > 1).map((k) => {
            const d = g.getImageData(Math.max(0, Math.round(k.x * ol)), Math.max(0, Math.round(k.y * ol)), Math.max(1, Math.round(k.w * ol)), Math.max(1, Math.round(k.h * ol))).data;
            const L = []; for (let p = 0; p < d.length; p += 4) L.push(lum(d[p], d[p + 1], d[p + 2]));
            L.sort((a, b) => a - b);
            return { ad: k.ad, enKotuKontrast: +(1.05 / (L[L.length - 1] + 0.05)).toFixed(2) };
          });
        }, { png, kutular });
        sonuc.push({ mod, tur: TURLER[i], kart: j === 1 ? "kart" : "satir", enKotu: Math.min(...olc.map((o) => o.enKotuKontrast)), ayrinti: olc });
        await s.evaluate(({ i, j }) => {
          const k = document.querySelectorAll(".abpo-bolum")[i].querySelectorAll(".abp")[j];
          k.querySelector(".abp-parca").style.visibility = "";
        }, { i, j });
      }
    }
    await baglam.close();
  }
  fs.writeFileSync(path.join(DIZIN, "kontrast.json"), JSON.stringify(sonuc, null, 1));
  console.log("mod   tur    kart   en kötü piksel kontrastı (beyaz yazı / taban; hedef ≥ 4,5)");
  for (const r of sonuc) console.log(r.mod.padEnd(5), r.tur.padEnd(6), r.kart.padEnd(5), r.enKotu);
}

// FPS: CPU 6× yavaş, ekranda 2 hareketli kart; rAF hızı + ana iş parçacığı yükü (sn başına iş süresi).
async function fps(tarayici) {
  const cikti = [];
  for (const mod of ["eski", "yeni"]) {
    for (const tur of ["su", "kar", "kuzey", "kor", "gece"]) {
      const { baglam, s } = await ac(tarayici, { w: 390, mod });
      const cdp = await baglam.newCDPSession(s);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
      await cdp.send("Performance.enable");
      const i = TURLER.indexOf(tur);
      // ekranda TAM 2 hareketli kart kalana dek görünür yüksekliği daralt
      let oynayan = 0;
      for (const yuk of [900, 800, 720, 660, 600, 540]) {
        await s.setViewportSize({ width: 390, height: yuk });
        await s.evaluate((i) => { document.querySelectorAll(".abpo-bolum")[i].scrollIntoView(); }, i);
        await s.waitForTimeout(1200);
        oynayan = await s.locator(".abp--oynar").count();
        if (oynayan === 2) break;
      }
      const metrik = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
      const m0 = await metrik();
      const kare = await s.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const d = () => { n++; if (performance.now() - t0 >= 5000) res(n / ((performance.now() - t0) / 1000)); else requestAnimationFrame(d); }; requestAnimationFrame(d); }));
      const m1 = await metrik();
      cikti.push({ mod, tur, oynayan, rafFps: +kare.toFixed(1), isSnPerSn: +((m1.TaskDuration - m0.TaskDuration) / 5).toFixed(3), scriptSnPerSn: +((m1.ScriptDuration - m0.ScriptDuration) / 5).toFixed(3) });
      await baglam.close();
    }
  }
  fs.writeFileSync(path.join(DIZIN, "fps.json"), JSON.stringify(cikti, null, 1));
  console.table(cikti);
}

(async () => {
  const tarayici = await chromium.launch({ channel: "chrome", headless: true });
  try {
    if (ASAMA === "gorsel" || ASAMA === "hepsi") await gorsel(tarayici);
    if (ASAMA === "olcum" || ASAMA === "hepsi") await olcum(tarayici);
    if (ASAMA === "kontrast" || ASAMA === "hepsi") await kontrast(tarayici);
    if (ASAMA === "fps" || ASAMA === "hepsi") await fps(tarayici);
    if (ASAMA === "onceki" || ASAMA === "sonraki") console.log(await ozet(tarayici, ASAMA));
  } catch (e) { console.error("HATA:", e?.message ?? e); process.exitCode = 1; }
  await tarayici.close();
})();
