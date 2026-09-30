// fps: CPU 6× yavaş, ekranda 2 hareketli kart. Kullanım: node fps.mjs
import { chromium } from "playwright-core";
const b = await chromium.launch();
const sonuc = [];
for (const mod of ["eski", "yeni", "eski", "yeni"]) {
  for (const t of ["su", "kar", "yaprak"]) {
    const c = await b.newContext({ viewport: { width: 390, height: 844 } });
    await c.addInitScript((m) => { localStorage.setItem("qt_arka_plan_onizleme_tam", JSON.stringify({ mod: m })); }, mod);
    const p = await c.newPage();
    await p.goto(""+(process.env.ADRES||"http://localhost:5173")+"/oyun/tasarim/arka-plan/olcum/index.html"); await p.waitForTimeout(800);
    // iki bölümü birlikte görünür yap: seçilen bölüm + bir sonraki
    await p.evaluate((t) => { const s = document.querySelector(`section[data-bolum="${t === "yaprak" ? "kar" : t}"]`); window.scrollTo(0, s.getBoundingClientRect().top + scrollY - 70); }, t);
    await p.waitForTimeout(600);
    const cdp = await c.newCDPSession(p);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => new Promise((res) => {
      const oynayan = document.querySelectorAll(".abp--oynar").length; let n = 0; const bas = performance.now(); let son = bas; let enUzun = 0;
      const f = (z) => { n++; enUzun = Math.max(enUzun, z - son); son = z; if (z - bas < 5000) requestAnimationFrame(f); else res({ oynayan, fps: n / ((z - bas) / 1000), enUzunKare: enUzun }); };
      requestAnimationFrame(f);
    }));
    sonuc.push({ mod, arka: t, "hareketli kart": r.oynayan, fps: +r.fps.toFixed(1), "en uzun kare ms": +r.enUzunKare.toFixed(0) });
    await c.close();
  }
}
console.table(sonuc);
await b.close();
