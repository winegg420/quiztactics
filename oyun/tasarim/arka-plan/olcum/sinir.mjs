// 3 hareketli kart sınırı: 4. kart özel sabit tasarıma düşer; hareketi azalt/sekme durumları
import { chromium } from "playwright-core";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 390, height: 2600 } });
await c.addInitScript(() => { localStorage.setItem("qt_arka_plan_onizleme_tam", JSON.stringify({ mod: "yeni" })); });
const p = await c.newPage(); await p.goto(""+(process.env.ADRES||"http://localhost:5173")+"/oyun/tasarim/arka-plan/olcum/index.html"); await p.waitForTimeout(1500);
const r = await p.evaluate(() => [...document.querySelectorAll("section[data-bolum]")].map((s) => { const k = s.querySelector(".abp"); return { bolum: s.dataset.bolum, sinif: k.className.replace(/abp abp--\w+ /, ""), hareketOgesi: k.querySelectorAll(".abp-y").length + k.querySelectorAll(".abp-gece-yildiz:not(.abp-st)").length, ozelSabit: k.querySelectorAll(".abp-st, .abp-st-tepe").length }; }));
console.table(r);
console.log("ekran dışı: aşağıda kalan kart sabit mi →");
await b.close();
