import { chromium } from "playwright-core"; import fs from "node:fs";
const ADRES = process.env.ADRES || "http://localhost:5175"; const GEN = Number(process.argv[2] || 390);
const dizin = "tasarim/arka-plan-varsayilan"; fs.mkdirSync(dizin, { recursive: true });
const b = await chromium.launch(); const hata = [];
for (const [a, bb] of [["sualti", "kar"], ["yaprak", "gece"]]) for (const azalt of [false, true]) {
  const c = await b.newContext({ viewport: { width: GEN, height: 560 }, deviceScaleFactor: 2, reducedMotion: azalt ? "reduce" : "no-preference" });
  const p = await c.newPage(); p.on("pageerror", (e) => hata.push(e.message.slice(0, 120)));
  await p.goto(`${ADRES}/oyun/tasarim/arka-plan/olcum/vs.html?a=${a}&b=${bb}`, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${dizin}/vs-${a}-${bb}-${GEN}${azalt ? "-azalt" : ""}.png` });
  console.log(a, bb, azalt, "taşma", await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), "kart", await p.evaluate(() => [...document.querySelectorAll(".ara-kart")].map((e) => Math.round(e.clientWidth) + "x" + Math.round(e.clientHeight)).join(",")));
  await c.close();
}
await b.close(); console.log("hata", hata);
