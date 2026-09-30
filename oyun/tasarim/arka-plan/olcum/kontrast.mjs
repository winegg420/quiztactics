// Taban kontrastı (parçacıksız taban kare + yazı ≥ 4,5:1) ve özel sabit tasarımlarda yazı bölgesine parçacık girmiyor mu.
// Kullanım: node kontrast.mjs [genislik=390] [mod=yeni]
import { chromium } from "playwright-core";
const gen = +(process.argv[2] || 390); const mod = process.argv[3] || "yeni";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: gen, height: 900 }, deviceScaleFactor: 1 });
await c.addInitScript((m) => { localStorage.setItem("qt_arka_plan_onizleme_tam", JSON.stringify({ mod: m })); }, mod);
const p = await c.newPage();
await p.goto(""+(process.env.ADRES||"http://localhost:5173")+"/oyun/tasarim/arka-plan/olcum/index.html"); await p.waitForTimeout(1200);
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const adlar = ["hareketli kart", "özel sabit kart", "özel lig satırı"];
const tablo = [];
for (const t of ["su", "kar", "yaprak", "gece"]) {
  for (let i = 0; i < 3; i++) {
    const el = p.locator(`section[data-bolum="${t}"] .abp`).nth(i);
    await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    // yazı (ink) dikdörtgenleri + etkin opaklık
    const bilgi = await el.evaluate((kok) => {
      const kr = kok.getBoundingClientRect(); const r = [];
      const w = document.createTreeWalker(kok.querySelector(".abp-icerik"), NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n);
        let op = 1; for (let e = n.parentElement; e && e !== kok; e = e.parentElement) op *= +getComputedStyle(e).opacity;
        for (const q of rg.getClientRects()) r.push({ x: q.left - kr.left, y: q.top - kr.top, w: q.width, h: q.height, op, t: n.textContent.trim().slice(0, 12) }); }
      // kalıcı parçacık (sabit tasarım öğeleri / yıldızlar) × yazı: kesişim sayısı
      const oge = [...kok.querySelectorAll(".abp-st, .abp-gece-yildiz")].map((e) => { const q = e.getBoundingClientRect(); return { x: Math.max(0, q.left - kr.left), y: Math.max(0, q.top - kr.top), x2: Math.min(kr.width, q.right - kr.left), y2: Math.min(kr.height, q.bottom - kr.top), tepe: e.classList.contains("abp-st-tepe") }; }).filter((o) => o.x2 > o.x && o.y2 > o.y);
      return { r, oge, w: kr.width, h: kr.height };
    });
    const kesisen = bilgi.oge.filter((o) => !o.tepe && bilgi.r.some((q) => o.x < q.x + q.w + 2 && o.x2 > q.x - 2 && o.y < q.y + q.h + 2 && o.y2 > q.y - 2)).length;
    // taban kare: parçacık katmanı gizli, yazı saydam
    await el.evaluate((kok) => { kok.dataset.onceki = ""; kok.querySelector(".abp-parca").style.display = "none"; kok.querySelector(".abp-icerik").style.color = "transparent"; kok.querySelectorAll(".abp-icerik *").forEach((e) => { e.style.color = "transparent"; e.style.textShadow = "none"; }); kok.querySelector(".abp-icerik").style.textShadow = "none"; });
    const buf = await el.screenshot();
    await el.evaluate((kok) => { kok.querySelector(".abp-parca").style.display = ""; kok.querySelector(".abp-icerik").style.color = ""; kok.querySelectorAll(".abp-icerik *").forEach((e) => { e.style.color = ""; e.style.textShadow = ""; }); kok.querySelector(".abp-icerik").style.textShadow = ""; });
    const { min, enKotu } = await p.evaluate(async ({ b64, r }) => {
      const img = await createImageBitmap(await (await fetch("data:image/png;base64," + b64)).blob());
      const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height; const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, img.width, img.height).data;
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      let min = 99, enKotu = "";
      for (const q of r) for (let y = Math.max(0, Math.floor(q.y)); y < Math.min(img.height, Math.ceil(q.y + q.h)); y++) for (let x = Math.max(0, Math.floor(q.x)); x < Math.min(img.width, Math.ceil(q.x + q.w)); x++) {
        const k = (y * img.width + x) * 4; const R = d[k], G = d[k + 1], B = d[k + 2];
        const cr = (L(255 * q.op + R * (1 - q.op), 255 * q.op + G * (1 - q.op), 255 * q.op + B * (1 - q.op)) + 0.05) / (L(R, G, B) + 0.05);
        if (cr < min) { min = cr; enKotu = q.t + "@" + x + "," + y; }
      }
      return { min, enKotu };
    }, { b64: buf.toString("base64"), r: bilgi.r });
    tablo.push({ arka: t, yer: adlar[i], "min kontrast": +min.toFixed(2), tamam: min >= 4.5 ? "EVET" : "HAYIR", "en kötü": enKotu, "yazıya değen kalıcı parçacık": i === 0 ? "(hareketli)" : kesisen });
  }
}
console.table(tablo);
await b.close();
