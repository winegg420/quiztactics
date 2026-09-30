import { chromium } from "playwright-core";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: +(process.argv[2] || 390), height: 900 } });
await c.addInitScript(() => { localStorage.setItem("qt_arka_plan_onizleme_tam", JSON.stringify({ mod: "yeni" })); });
const p = await c.newPage(); await p.goto(""+(process.env.ADRES||"http://localhost:5173")+"/oyun/tasarim/arka-plan/olcum/index.html"); await p.waitForTimeout(1000);
const sonuc = await p.evaluate(() => {
  const out = [];
  for (const sec of document.querySelectorAll("section[data-bolum]")) for (const [i, kok] of [...sec.querySelectorAll(".abp")].entries()) {
    if (i === 0) continue;
    const kr = kok.getBoundingClientRect(); const yazi = [];
    const w = document.createTreeWalker(kok.querySelector(".abp-icerik"), NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const q of rg.getClientRects()) yazi.push([n.textContent.trim().slice(0, 6), Math.round(q.left - kr.left), Math.round(q.top - kr.top), Math.round(q.right - kr.left), Math.round(q.bottom - kr.top)]); }
    const av = kok.querySelector(".abp-icerik img, .abp-icerik svg"); 
    const liste = [];
    kok.querySelectorAll(".abp-st:not(.abp-st-tepe), .abp-gece-yildiz").forEach((e) => { const q = e.getBoundingClientRect(); const o = [Math.max(0, q.left - kr.left), Math.max(0, q.top - kr.top), Math.min(kr.width, q.right - kr.left), Math.min(kr.height, q.bottom - kr.top)]; if (o[2] <= o[0] || o[3] <= o[1]) return;
      for (const z of yazi) if (o[0] < z[3] + 1 && o[2] > z[1] - 1 && o[1] < z[4] + 1 && o[3] > z[2] - 1) liste.push(`${Math.round(o[0])},${Math.round(o[1])}-${Math.round(o[2])},${Math.round(o[3])} × ${z[0]}(${z[1]},${z[2]}-${z[3]},${z[4]})`); });
    out.push({ bolum: sec.dataset.bolum, yer: i === 1 ? "kart" : "serit", boy: Math.round(kr.width) + "x" + Math.round(kr.height), yazi: yazi.map((z) => z.join(":")).join(" "), kesisen: liste });
  }
  return out;
});
for (const s of sonuc) console.log(s.bolum, s.yer, s.boy, "| yazı:", s.yazi, "\n   kesişen:", s.kesisen.length ? s.kesisen.join(" ; ") : "yok");
await b.close();
