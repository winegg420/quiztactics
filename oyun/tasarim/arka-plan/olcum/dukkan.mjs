// Dükkân › Arka Plan: kalemler + (İSTEĞE BAĞLI) Yıldızlı Gece satın al/tak akışı. Test hesabı; bitince sahiplik ve takılı arka plan eski hâline döner.
import { chromium } from "playwright-core"; import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "../../../../araclar/pg-mini.mjs";
const ADRES = process.env.ADRES || "http://localhost:5175"; const GEN = Number(process.argv[2] || 390); const DIL = process.argv[3] || "tr"; const SATIN = process.argv[4] === "satin";
const dizin = "tasarim/arka-plan-varsayilan";
const oturum = JSON.parse(fs.readFileSync(".arka-plan-oturum.json", "utf8"));
const UID = JSON.parse(oturum.origins[0].localStorage.find((x) => x.name.includes("auth-token")).value).user.id;
const db = await new PgIstemci(await baglantiDizgisi()).baglan(); const Q = (s) => db.sorgu(s);
const on = (await Q(`select takili_premium_aura, elmas from public.profiles where id='${UID}'`))[0];
const sahipOnce = (await Q(`select kozmetik from public.oyuncu_kozmetikleri where user_id='${UID}'`)).map((r) => r.kozmetik);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: GEN, height: 844 }, deviceScaleFactor: 2, storageState: { cookies: [], origins: [{ origin: ADRES, localStorage: [...oturum.origins[0].localStorage.filter((x) => x.name !== "qt_dil"), { name: "qt_dil", value: DIL }] }] } });
const p = await c.newPage(); const hata = [];
p.on("pageerror", (e) => hata.push(e.message.slice(0, 140))); p.on("console", (m) => { if (m.type() === "error") hata.push("K:" + m.text().slice(0, 140)); });
try {
  await Q(`update public.profiles set takili_premium_aura=null where id='${UID}'`);
  await p.goto(`${ADRES}/joker?sekme=paura`, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(4000);
  const metin = await p.evaluate(() => document.body.innerText.replace(/\n+/g, " | ").slice(0, 900)); console.log(metin);
  console.log("taşma", await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), "hareketli-kart", await p.evaluate(() => document.querySelectorAll(".abp--oynar").length), "kart", await p.evaluate(() => document.querySelectorAll(".abp").length));
  await p.screenshot({ path: `${dizin}/dukkan-${GEN}-${DIL}.png` });
  if (SATIN) {
    await p.getByText(/Yıldızlı Gece|Starry Night/).first().click(); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${dizin}/dukkan-gece-detay-${GEN}-${DIL}.png` });
    console.log(await p.evaluate(() => [...document.querySelectorAll("button")].map((x) => x.innerText.trim()).filter(Boolean).slice(0, 40).join(" | ")));
  }
} finally {
  if (!SATIN) { await Q(`update public.profiles set takili_premium_aura=${on.takili_premium_aura ? `'${on.takili_premium_aura}'` : "null"} where id='${UID}'`); }
  try { fs.writeFileSync(".arka-plan-oturum.json", JSON.stringify(await c.storageState())); } catch {}
  await db.kapat(); await b.close();
}
console.log("hatalar", [...new Set(hata)].slice(0, 5));
