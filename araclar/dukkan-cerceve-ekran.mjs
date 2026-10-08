// Dükkân premium çerçeveleri donduruldu + altın isim BP'ye ait — ekran taraması (GERÇEK veri, sunucuya yazmaz).
// Dükkân: Çerçeve sekmesi YOK (3 sekme), ?sekme=cerceve varsayılana düşer, İsim bölümünde Altın yok.
// Sezon Yolu: "Altın isim" avantajı yazılı. Profil: taşma/konsol. 360×640 + 390×844 × TR/EN.
// Kullanım: npm run dev -- --port 5193 (başka kabukta) · node araclar/dukkan-cerceve-ekran.mjs [--adres=...]
// Oturum: araclar/arayuz-denetim.mjs'in yazdığı .arayuz-denetim-oturum.json. Çıktı: tasarim/dukkan-cerceve/*.png
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5193";
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/dukkan-cerceve");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
let gecti = 0, kaldi = 0;
const ok = (ad, k, ek = "") => { if (k) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };

for (const dil of ["tr", "en"]) for (const [w, h] of [[360, 640], [390, 844]]) {
  const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  durum.origins = (durum.origins || []).map((o) => ({ ...o, origin: kok,
    localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim"].includes(x.name)), { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" }] }));
  const b = await tarayici.newContext({ storageState: durum, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block" });
  const s = await b.newPage();
  const konsol = [];
  s.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of [45]\d\d|net::/.test(m.text())) konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  const etiket = `${w}x${h}-${dil}`;
  const tasmaYok = async (ad) => { const t = await s.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(`${etiket} ${ad}: yatay taşma yok`, t <= 0, `taşma=${t}`); };
  const git = async (yol, bekle) => {
    await s.goto(ADRES + yol, { waitUntil: "domcontentloaded", timeout: 30000 });
    if (bekle) await s.waitForSelector(bekle, { timeout: 30000 }).catch(() => {});
    await s.waitForFunction(() => !document.querySelector(".qt-iskelet, .qt-sayfa-yukleniyor"), null, { timeout: 20000 }).catch(() => {});
    await s.waitForTimeout(1500);
  };
  console.log(`\n== ${etiket}`);
  try {
    await git("/", null);
    // --- Dükkân
    await git("/joker", "[role=tablist]");
    const sekmeler = await s.locator("[role=tablist] [role=tab]").allInnerTexts();
    ok(`${etiket} Dükkân: 3 sekme (Çerçeve yok)`, sekmeler.length === 3 && !sekmeler.some((t) => /Çerçeve|Frame/i.test(t)), sekmeler.join(" | "));
    await s.screenshot({ path: path.join(CIKTI, `${etiket}-dukkan.png`), fullPage: true });
    await tasmaYok("Dükkân");
    await git("/joker?sekme=cerceve", "[role=tablist]");
    const sec = await s.locator("[role=tab][aria-selected=true]").allInnerTexts();
    ok(`${etiket} Dükkân ?sekme=cerceve: çerçeve ızgarası yok, varsayılana düştü`, !(await s.locator("[id=qt-panel-cerceve]").count()) && sec.length === 1, sec.join("|"));
    await git("/joker?sekme=avatar", "[role=tablist]");
    const panel = (await s.locator("[role=tabpanel]").innerText().catch(() => "")) || "";
    ok(`${etiket} Dükkân Avatar: Altın isim yok`, !/Altın|Gold/.test(panel) && !/Kraliyet|Royal|Şimşek|Lightning|Galaksi|Galaxy|Sönmeyen|Eternal/.test(panel), panel.slice(0, 160).replace(/\n/g, " | "));
    await s.screenshot({ path: path.join(CIKTI, `${etiket}-dukkan-avatar.png`), fullPage: true });
    await tasmaYok("Dükkân Avatar");
    // --- Sezon Yolu (Battle Pass)
    await git("/sezon-yolu", null);
    const sezon = (await s.locator("body").innerText().catch(() => "")) || "";
    ok(`${etiket} Sezon Yolu: açılıyor`, sezon.length > 50, sezon.slice(0, 80));
    await s.screenshot({ path: path.join(CIKTI, `${etiket}-sezon.png`), fullPage: false });
    await tasmaYok("Sezon Yolu");
    // Satın alma sayfasındaki avantaj listesi: altın isim yazılı mı
    const bpDugme = s.getByRole("button", { name: /Battle Pass/i }).first();
    if (await bpDugme.count()) { await bpDugme.click().catch(() => {}); await s.waitForTimeout(1200); }
    const bpMetin = (await s.locator("body").innerText().catch(() => "")) || "";
    ok(`${etiket} Battle Pass: "Altın isim"/"Gold name" avantajı yazılı`, /Altın isim|Gold name/i.test(sezon + "\n" + bpMetin));
    await s.screenshot({ path: path.join(CIKTI, `${etiket}-bp.png`), fullPage: false });
    // --- Profil
    await git("/profil", null);
    await s.screenshot({ path: path.join(CIKTI, `${etiket}-profil.png`), fullPage: false });
    await tasmaYok("Profil");
    ok(`${etiket}: konsol hatası yok`, konsol.length === 0, konsol.slice(0, 3).join(" | "));
  } catch (e) { kaldi++; console.log("  ✗ beklenmeyen:", String(e).slice(0, 200)); }
  await b.close();
}
await tarayici.close();
console.log(`\n${kaldi ? "✗ " + kaldi + " başarısız" : "✓ hepsi geçti"} (${gecti} geçti) — çıktı: tasarim/dukkan-cerceve/`);
process.exit(kaldi ? 1 : 0);
