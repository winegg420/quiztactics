// Yıldızlı Gece: dükkândan satın al → tak → ana sayfada görünür; sonra temizle (sahiplik, elmas, takılı).
import { chromium } from "playwright-core"; import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "../../../../araclar/pg-mini.mjs";
const ADRES = process.env.ADRES || "http://localhost:5175"; const dizin = "tasarim/arka-plan-varsayilan";
const oturum = JSON.parse(fs.readFileSync(".arka-plan-oturum.json", "utf8"));
const UID = JSON.parse(oturum.origins[0].localStorage.find((x) => x.name.includes("auth-token")).value).user.id;
const db = await new PgIstemci(await baglantiDizgisi()).baglan(); const Q = (s) => db.sorgu(s);
const on = (await Q(`select takili_premium_aura, elmas from public.profiles where id='${UID}'`))[0];
const vardi = (await Q(`select 1 from public.oyuncu_kozmetikleri where user_id='${UID}' and kozmetik='pa_gece'`)).length > 0;
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, storageState: { cookies: [], origins: [{ origin: ADRES, localStorage: oturum.origins[0].localStorage }] } });
const p = await c.newPage(); const hata = [];
p.on("pageerror", (e) => hata.push(e.message.slice(0, 140))); p.on("console", (m) => { if (m.type() === "error") hata.push("K:" + m.text().slice(0, 140)); });
const dur = async () => (await Q(`select takili_premium_aura pa, elmas from public.profiles where id='${UID}'`))[0];
try {
  await Q(`update public.profiles set takili_premium_aura=null where id='${UID}'`);
  await p.goto(`${ADRES}/joker?sekme=paura`, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(3500);
  await p.getByText("Yıldızlı Gece").first().click(); await p.waitForTimeout(1200);
  await p.locator("button:has-text(\"Satın al\")").last().click(); await p.waitForTimeout(1500); await p.locator("button").filter({ hasText: /^Al$/ }).click(); await p.waitForTimeout(3000);
  await p.screenshot({ path: `${dizin}/dukkan-gece-satin-alindi-390.png` });
  console.log("düğmeler:", await p.evaluate(() => [...document.querySelectorAll("button")].map((x) => x.innerText.trim()).filter(Boolean).join(" | ")));
  const sahip = await Q(`select 1 from public.oyuncu_kozmetikleri where user_id='${UID}' and kozmetik='pa_gece'`);
  console.log("sahiplik kaydı:", sahip.length, "durum:", JSON.stringify(await dur()));
  const tak = p.locator("button").filter({ hasText: /^(Tak|Kuşan|Kullan|Giy)/ });
  if (await tak.count()) { await tak.last().click(); await p.waitForTimeout(2500); }
  console.log("takıldıktan sonra:", JSON.stringify(await dur()));
  await p.goto(`${ADRES}/`, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(4000);
  await p.screenshot({ path: `${dizin}/ana-gece-satin-390.png` });
  console.log("ana sayfada gece kartı:", await p.evaluate(() => document.querySelectorAll(".abp--gece").length));
} finally {
  if (!vardi) await Q(`delete from public.oyuncu_kozmetikleri where user_id='${UID}' and kozmetik='pa_gece'`);
  await Q(`update public.profiles set takili_premium_aura=${on.takili_premium_aura ? `'${on.takili_premium_aura}'` : "null"}, elmas=${on.elmas} where id='${UID}'`);
  console.log("temizlik sonrası:", JSON.stringify(await dur()), "sahiplik:", (await Q(`select 1 from public.oyuncu_kozmetikleri where user_id='${UID}' and kozmetik='pa_gece'`)).length);
  try { fs.writeFileSync(".arka-plan-oturum.json", JSON.stringify(await c.storageState())); } catch {}
  await db.kapat(); await b.close();
}
console.log("hatalar", [...new Set(hata)].slice(0, 5));
