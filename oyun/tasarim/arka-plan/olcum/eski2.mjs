import { chromium } from "playwright-core"; import fs from "node:fs"; import crypto from "node:crypto";
const et = process.argv[2]; const dir = process.env.TEMP + "/eski2-" + et; fs.mkdirSync(dir, { recursive: true });
const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 1100 }, reducedMotion: "reduce" });
const p = await c.newPage(); await p.goto(""+(process.env.ADRES||"http://localhost:5173")+"/oyun/tasarim/arka-plan/olcum/eski2.html"); await p.waitForTimeout(1000);
const dom = await p.evaluate(() => document.getElementById("root").innerHTML);
const buf = await p.screenshot({ path: dir + "/s.png" });
console.log(et, "dom", crypto.createHash("sha1").update(dom).digest("hex").slice(0, 10), "png", crypto.createHash("sha1").update(buf).digest("hex").slice(0, 10), "abp sayısı", (dom.match(/class="abp /g) || []).length);
await b.close();
