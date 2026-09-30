// DİKEY kartlarda (maç başı VS ~150×186) taban kontrastı + özel sabit tasarımda yazıya değen öğe sayısı. vs.html üzerinde. Kullanım: node dikey-kontrast.mjs [genislik=390]
import { chromium } from "playwright-core";
const gen = +(process.argv[2] || 390); const ADRES = process.env.ADRES || "http://localhost:5175";
const b = await chromium.launch(); const tablo = [];
for (const [a, bb] of [["sualti", "kar"], ["yaprak", "gece"]]) {
  const c = await b.newContext({ viewport: { width: gen, height: 560 }, reducedMotion: "reduce" }); const p = await c.newPage();
  await p.goto(`${ADRES}/oyun/tasarim/arka-plan/olcum/vs.html?a=${a}&b=${bb}`); await p.waitForTimeout(2500);
  for (let i = 0; i < 2; i++) {
    const el = p.locator(".ara-kart").nth(i);
    const bilgi = await el.evaluate((kok) => {
      const kr = kok.getBoundingClientRect(); const r = [];
      const w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim() || n.parentElement.closest(".abp")) continue; const rg = document.createRange(); rg.selectNodeContents(n);
        for (const q of rg.getClientRects()) r.push({ x: q.left - kr.left, y: q.top - kr.top, w: q.width, h: q.height, t: n.textContent.trim().slice(0, 10) }); }
      const oge = [...kok.querySelectorAll(".abp-st, .abp-gece-yildiz")].map((e) => { const q = e.getBoundingClientRect(); return { x: Math.max(0, q.left - kr.left), y: Math.max(0, q.top - kr.top), x2: Math.min(kr.width, q.right - kr.left), y2: Math.min(kr.height, q.bottom - kr.top), tepe: e.classList.contains("abp-st-tepe") }; }).filter((o) => o.x2 > o.x && o.y2 > o.y);
      return { r, oge, statik: !!kok.querySelector(".abp-st, .abp-gece-yildiz"), w: kr.width, h: kr.height };
    });
    const kesisen = bilgi.oge.filter((o) => !o.tepe && bilgi.r.some((q) => o.x < q.x + q.w + 2 && o.x2 > q.x - 2 && o.y < q.y + q.h + 2 && o.y2 > q.y - 2)).length;
    await el.evaluate((kok) => { kok.querySelector(".abp-parca").style.display = "none"; kok.style.color = "transparent"; kok.querySelectorAll("*:not(.abp):not(.abp *)").forEach((e) => { e.style.color = "transparent"; e.style.textShadow = "none"; }); kok.style.textShadow = "none"; });
    const buf = await el.screenshot();
    const { min, enKotu } = await p.evaluate(async ({ b64, r }) => {
      const img = await createImageBitmap(await (await fetch("data:image/png;base64," + b64)).blob());
      const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height; const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, img.width, img.height).data;
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      let min = 99, enKotu = "";
      for (const q of r) for (let y = Math.max(0, Math.floor(q.y)); y < Math.min(img.height, Math.ceil(q.y + q.h)); y++) for (let x = Math.max(0, Math.floor(q.x)); x < Math.min(img.width, Math.ceil(q.x + q.w)); x++) {
        const k = (y * img.width + x) * 4; const cr = 1.05 / (L(d[k], d[k + 1], d[k + 2]) + 0.05); if (cr < min) { min = cr; enKotu = q.t + "@" + x + "," + y; } }
      return { min, enKotu };
    }, { b64: buf.toString("base64"), r: bilgi.r });
    tablo.push({ arka: i === 0 ? a : bb, boyut: Math.round(bilgi.w) + "x" + Math.round(bilgi.h), "özel sabit": bilgi.statik, "min kontrast (beyaz yazı)": +min.toFixed(2), tamam: min >= 4.5 ? "EVET" : "HAYIR", "en kötü": enKotu, "yazıya değen öğe": kesisen });
  }
  await c.close();
}
console.table(tablo); await b.close();
