// Teslim ekran görüntüleri: 390 ve 360 px; dört arka plan; yeni ve eski; hareketli durum + hareketi azalt (özel sabit).
import { chromium } from "playwright-core"; import fs from "node:fs";
const dizin = "oyun/tasarim/arka-plan/olcum/ekran"; fs.mkdirSync(dizin, { recursive: true });
const b = await chromium.launch();
async function cek(gen, mod, azalt, etiket) {
  const c = await b.newContext({ viewport: { width: gen, height: 900 }, reducedMotion: azalt ? "reduce" : "no-preference", deviceScaleFactor: 2 });
  await c.addInitScript((m) => { localStorage.setItem("qt_arka_plan_onizleme_tam", JSON.stringify({ mod: m })); }, mod);
  const p = await c.newPage(); let hata = [];
  p.on("pageerror", (e) => hata.push(e.message.slice(0, 120)));
  await p.goto(""+(process.env.ADRES||"http://localhost:5173")+"/oyun/tasarim/arka-plan/olcum/index.html"); await p.waitForTimeout(1200);
  for (const t of ["su", "kar", "yaprak", "gece"]) {
    const s = p.locator(`section[data-bolum="${t}"]`); await s.scrollIntoViewIfNeeded(); await p.waitForTimeout(900);
    const r = await s.boundingBox();
    const y = await p.evaluate(() => scrollY);
    await p.screenshot({ path: `${dizin}/${etiket}-${t}-${gen}.png`, clip: { x: 0, y: r.y + y - 4, width: gen, height: r.height + 12 }, fullPage: true });
  }
  const tas = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(etiket, gen, "yatay taşma", tas, "sayfa hatası", hata.length);
  await c.close();
}
for (const g of [390, 360]) { await cek(g, "yeni", false, "yeni"); await cek(g, "eski", false, "eski"); }
await cek(390, "yeni", true, "yeni-hareketi-azalt");
await b.close();
