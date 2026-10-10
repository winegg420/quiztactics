// Grup maçı canlı duman testi (1056) — test hesabıyla (.arayuz-denetim-oturum.json) bota karşı TEK tam grup maçı.
// Meydan › "Rastgele oyna" → sunucu boş yerleri botla doldurur → Hazırım → her soruda ilk şık → maç sonu.
// Ölçülen: her sorunun ekrana gelişi, takılma (aynı soru 30 sn+), maç sonu ekranı, istemci istek sayıları
// (grup_mac_nabiz / advance_group_match / group_matches okuma) ve aynı anda uçuşta en fazla kaç nabız olduğu.
// Kullanım: node araclar/grup-canli-testi.mjs [--adres=https://quiztactics.com]
import { chromium, devices } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "http://127.0.0.1:5173").replace(/\/$/, "");
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const yerel = durum.origins?.[0]?.localStorage ?? [];

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({ ...devices["Pixel 7"], viewport: { width: 390, height: 800 } });
await baglam.addInitScript((kayitlar) => {
  if (sessionStorage.getItem("__grupTestiYuklendi")) return;
  for (const k of kayitlar) localStorage.setItem(k.name, k.value);
  sessionStorage.setItem("__grupTestiYuklendi", "1");
}, yerel);
const s = await baglam.newPage();

const sayac = { grup_mac_nabiz: 0, advance_group_match: 0, group_matches: 0 };
const ucusta = { grup_mac_nabiz: 0 };
let enCokUcusta = 0;
const sureler = { grup_mac_nabiz: [], advance_group_match: [] };
const ad = (u) => (u.includes("/rpc/grup_mac_nabiz") ? "grup_mac_nabiz" : u.includes("/rpc/advance_group_match") ? "advance_group_match" : u.includes("/rest/v1/group_matches") ? "group_matches" : null);
const basla = new Map();
s.on("request", (r) => { const a = ad(r.url()); if (!a) return; sayac[a]++; basla.set(r, Date.now());
  if (a === "grup_mac_nabiz") { ucusta[a]++; enCokUcusta = Math.max(enCokUcusta, ucusta[a]); } });
const bitti = (r) => { const a = ad(r.url()); if (!a) return; if (a === "grup_mac_nabiz") ucusta[a]--;
  if (sureler[a]) sureler[a].push(Date.now() - (basla.get(r) ?? Date.now())); };
s.on("requestfinished", bitti); s.on("requestfailed", bitti);
const konsol = [];
s.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 160)); });

const hatalar = [];
let macId = null, sorular = 0, baslangic = Date.now();
try {
  await s.goto(ADRES + "/meydan", { waitUntil: "domcontentloaded" });
  await s.waitForTimeout(3000);
  const panel = s.locator(".a-meydan-panel-bas").filter({ hasText: /Grup Maçı Kur/ }).first();
  await panel.scrollIntoViewIfNeeded().catch(() => {});
  if ((await panel.getAttribute("aria-expanded").catch(() => "false")) !== "true") await panel.tap({ timeout: 8000 });
  await s.waitForTimeout(600);
  const rastgele = s.getByRole("button", { name: /Rastgele oyna/ }).first();
  await rastgele.scrollIntoViewIfNeeded().catch(() => {});
  await rastgele.tap({ timeout: 8000 });
  await s.waitForURL(/\/grup-mac\/[0-9a-f-]{36}/, { timeout: 45000 });
  macId = s.url().match(/grup-mac\/([0-9a-f-]{36})/)[1];
  console.log("Grup maçı:", macId);
  baslangic = Date.now();
  let sonMetin = "", sonDegisim = Date.now();
  while (Date.now() - baslangic < 8 * 60 * 1000) {
    const hazir = s.getByRole("button", { name: /Hazırım/ });
    if (await hazir.count() && await hazir.first().isEnabled().catch(() => false)) await hazir.first().tap().catch(() => {});
    if (await s.getByText(/^(ZAFER!|BERABERE|Maç bitti)$/).count()) break;
    const metin = await s.locator(":is(.bd-soru-metin, .qt-soru-metin)").first().innerText({ timeout: 500 }).catch(() => "");
    if (metin && metin !== sonMetin) { sorular++; sonMetin = metin; sonDegisim = Date.now();
      console.log(`  soru ${sorular} · ${((Date.now() - baslangic) / 1000).toFixed(1)} sn`);
      await s.waitForTimeout(1500 + Math.random() * 1500);
      await s.locator(".qt-sik:not(.qt-sik--elendi)").first().tap({ timeout: 3000 }).catch(() => {});
    }
    if (Date.now() - sonDegisim > 30000) { hatalar.push(`soru ${sorular}'de 30 sn+ takılma`); sonDegisim = Date.now(); }
    await s.waitForTimeout(400);
  }
  if (!(await s.getByText(/^(ZAFER!|BERABERE|Maç bitti)$/).count())) hatalar.push("maç sonu ekranı gelmedi");
  await s.screenshot({ path: path.resolve("tasarim/grup-kilit-1056-mac-sonu-390.png") }).catch(() => {});
} catch (e) { hatalar.push("Beklenmeyen: " + String(e.message).split("\n")[0]); }
await s.waitForTimeout(1000);
const ort = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
const sn = Math.max(1, (Date.now() - baslangic) / 1000);
console.log("\n==== SONUÇ ====");
console.log(`maç ${macId} · ${sorular} soru · ${sn.toFixed(0)} sn`);
for (const k of Object.keys(sayac)) console.log(`  ${k}: ${sayac[k]} istek (${(sayac[k] / sn * 60).toFixed(1)}/dk)` + (sureler[k] ? ` · ort ${ort(sureler[k])} ms · maks ${Math.max(0, ...sureler[k])} ms` : ""));
console.log(`  aynı anda uçuşta en çok nabız: ${enCokUcusta}`);
if (konsol.length) console.log("  konsol hataları:", konsol.slice(0, 5));
await tarayici.close();
if (hatalar.length) { console.log("BAŞARISIZ:", hatalar); process.exit(1); }
console.log("GEÇTİ");
process.exit(0);
