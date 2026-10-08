// Dükkân › Avatar: İsim bölümü yok (Altın isim Battle Pass'e ait; sahibi olana da dükkânda görünmez) — ekran ölçümü, SUNUCUYA YAZMAZ.
// kozmetik_katalogu cevabı tarayıcıda taklit edilir: (a) Altın satılık + sahipsiz, Alev satılık → Altın GÖRÜNMEZ, Alev kalır;
// (b) Altın sahipli → "Sende var" olarak görünmeye devam eder. 360×640 ve 390×844 × TR/EN. Ölçer: yatay taşma, konsol hatası.
// Kullanım: npm run dev -- --port 5193 (başka kabukta) · node araclar/dukkan-isim-ekran.mjs [--adres=http://localhost:5193]
// Oturum: araclar/arayuz-denetim.mjs'in yazdığı .arayuz-denetim-oturum.json. Çıktı: tasarim/dukkan-isim/*.png
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5193";
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/dukkan-isim");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }

const kalem = (anahtar, ad_tr, ad_en, sira, sahip) => ({ anahtar, tur: "isim_efekti", ad: ad_tr, ad_tr, ad_en, fiyat: 100, satilik: true, sahip, takili: false, sira, icerik: {}, nadirlik: null });
const katalog = (altinSahip) => [kalem("isim_altin", "Altın", "Gold", 201, altinSahip), kalem("isim_alev", "Alev", "Flame", 204, false), kalem("isim_buz", "Buz", "Ice", 205, false)];

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
let gecti = 0, kaldi = 0;
const ok = (ad, k, ek = "") => { if (k) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };

for (const dil of ["tr", "en"]) for (const [w, h] of [[360, 640], [390, 844]]) for (const sahip of [false, true]) {
  const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  durum.origins = (durum.origins || []).map((o) => ({ ...o, origin: kok,
    localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim"].includes(x.name)), { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" }] }));
  const b = await tarayici.newContext({ storageState: durum, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block" });
  const s = await b.newPage();
  const konsol = [];
  s.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of [45]\d\d|net::/.test(m.text())) konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  await s.route(/\/rest\/v1\/(profiles|rpc)/, async (r) => {
    const u = r.request().url();
    try {
      if (u.includes("/rpc/kozmetik_katalogu")) return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(katalog(sahip)) });
      if (r.request().method() !== "GET" && /\/rpc\/(avatar_onayla|avatar_satin_al|kozmetik_satin_al|kozmetik_tak)/.test(u)) return r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "Ölçüm aracı: yazma kapalı" }) });
      const y = await r.fetch();
      await r.fulfill({ response: y, body: (await y.text()).replace(/"dil":\s*"(tr|en)"/g, `"dil":"${dil}"`) });
    } catch { try { await r.continue(); } catch { /* sayfa kapandı */ } }
  });
  const etiket = `${w}x${h}-${dil}-${sahip ? "altin-sahipli" : "altin-yok"}`;
  console.log(`\n== ${etiket}`);
  try {
    await s.goto(ADRES + "/", { waitUntil: "domcontentloaded", timeout: 30000 }); await s.waitForTimeout(2500);
    await s.goto(ADRES + "/joker?sekme=avatar", { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.waitForSelector("#qt-dk-avatarlar", { timeout: 30000 }).catch(() => {});
    await s.waitForTimeout(1200);
    const isimBolumu = await s.locator("#qt-dk-isim").count();
    const panel = (await s.locator("[role=tabpanel]").innerText().catch(() => "")) || "";
    ok(`${etiket}: İsim bölümü YOK (Altın sahibinde de)`, isimBolumu === 0 && !/Altın|Gold/.test(panel), panel.slice(0, 160).replace(/\n/g, " | "));
    const tasma = await s.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(`${etiket}: yatay taşma yok`, tasma <= 0, `taşma=${tasma}`);
    const ic = await s.evaluate(() => [...document.querySelectorAll("section[aria-labelledby=qt-dk-avatarlar] *")].filter((e) => { const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.right > window.innerWidth + 0.5)) return false; for (let p = e.parentElement; p; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if ((ox === "auto" || ox === "scroll") && p.scrollWidth > p.clientWidth) return false; if ((ox === "hidden" || ox === "clip") && p.getBoundingClientRect().right <= window.innerWidth + 0.5) return false; } return true; }).length); // kaydırmalı şerit içindekiler ve ekran içindeki kırpıcı (overflow:hidden) atanın taşan çocuğu görünmez
    const kim = ic ? await s.evaluate(() => [...document.querySelectorAll("section[aria-labelledby=qt-dk-avatarlar] *")].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 0.5 && e.getBoundingClientRect().width > 0).map((e) => e.tagName + "." + String(e.className).slice(0, 40) + ":" + Math.round(e.getBoundingClientRect().right) + "/" + innerWidth + " ox=" + getComputedStyle(e.parentElement).overflowX).slice(0, 4).join(" ; ")) : "";
    ok(`${etiket}: İsim bölümünde ekran dışına taşan öğe yok`, ic === 0, `taşan=${ic} ${kim}`);
    await bolum.scrollIntoViewIfNeeded().catch(() => {});
    await s.screenshot({ path: path.join(CIKTI, `${etiket}.png`), fullPage: true });
    ok(`${etiket}: konsol hatası yok`, konsol.length === 0, konsol.slice(0, 3).join(" | "));
  } catch (e) { kaldi++; console.log("  ✗ beklenmeyen:", String(e).slice(0, 200)); }
  await b.close();
}
await tarayici.close();
console.log(`\n${kaldi ? "✗ " + kaldi + " başarısız" : "✓ hepsi geçti"} (${gecti} geçti) — çıktı: tasarim/dukkan-isim/`);
process.exit(kaldi ? 1 : 0);
