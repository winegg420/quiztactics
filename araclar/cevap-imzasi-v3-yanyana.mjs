// Cevap İmzası v3 — maket ve oyun karelerini yan yana tek görüntüde toplar (tasarim/cevap-imzasi-v3/yanyana-*.png).
// Önce: node araclar/cevap-imzasi-v3-ekran.mjs (kareleri üretir). Ağ yok, yalnız yerel dosyalar.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const D = path.resolve("tasarim/cevap-imzasi-v3");
const KARELER = ["0000", "0150", "0400", "0700", "1000"];
const b = await chromium.launch({ channel: "chrome", headless: true });
const s = await b.newPage({ viewport: { width: 1400, height: 800 } });
for (const tur of ["yildiz", "ampul"]) for (const w of [390, 360]) {
  const satirlar = ["maket", "klasik", "hazine", "dukkan"].filter((k) => fs.existsSync(path.join(D, `${k}-${tur}-${w}-0000.png`)));
  const h = `<body style="margin:0;background:#fff;font:700 14px system-ui"><table style="border-spacing:6px">
    <tr><td></td>${KARELER.map((k) => `<td style="text-align:center">${Number(k)} ms</td>`).join("")}</tr>
    ${satirlar.map((k) => `<tr><td style="writing-mode:vertical-rl">${k}</td>${KARELER.map((t) => `<td style="vertical-align:top"><img style="width:260px" src="${pathToFileURL(path.join(D, `${k}-${tur}-${w}-${t}.png`)).href}"></td>`).join("")}</tr>`).join("")}
  </table></body>`;
  fs.writeFileSync(path.join(D, "_yanyana.html"), h);
  await s.goto(pathToFileURL(path.join(D, "_yanyana.html")).href);
  await s.waitForTimeout(300);
  await s.locator("table").screenshot({ path: path.join(D, `yanyana-${tur}-${w}.png`) });
}
fs.rmSync(path.join(D, "_yanyana.html"));
await b.close();
