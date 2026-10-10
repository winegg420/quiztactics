// Sezon Yolu v3 CANLI doğrulama (hafif): 360×640 TR, tek tarayıcı, sayfa başına tek tur, sunucuya YAZMAZ (yalnız okuma; satın alma açılır, onaylanmaz).
//  1) yükleme iskeleti: çizim parçası geciktirilir → hero'da iskelet var, "?" yok
//  2) BP satın alma vitrini: Ejderha çizildi + metinlerin gerçek piksel kontrastı ≥ 4,5 (çizim parçası normal)
// Oturum: .sezon-b-oturum.json (misafir; git'e girmez). Kullanım: node araclar/sezon-yolu-v3-canli.mjs [--adres=https://quiztactics.com]
import { chromium } from "playwright-core";
import fs from "node:fs";
const ADRES = (process.argv.find((a) => a.startsWith("--adres=")) ?? "--adres=https://quiztactics.com").slice(8);
const origin = new URL(ADRES).origin;
const oturum = JSON.parse(fs.readFileSync(".sezon-b-oturum.json", "utf8"));
const kaynak = oturum.origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token")));
const ls = [...kaynak.localStorage.filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: "tr" }];
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({ serviceWorkers: "block", viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
  storageState: { cookies: [], origins: [{ origin, localStorage: ls }] } });
let hata = 0;
const ok = (ad, k, ek = "") => { if (k) console.log("  ✓", ad); else { hata++; console.log("  ✗", ad, ek); } };
try {
  // 1) iskelet
  const s1 = await baglam.newPage();
  await s1.route(/PremiumAvatarCizim/, async (r) => { await new Promise((x) => setTimeout(x, 6000)); await r.continue(); });
  await s1.goto(`${ADRES}/sezon-yolu`, { waitUntil: "domcontentloaded" });
  await s1.waitForSelector(".sy-final-kart", { timeout: 30000 });
  await s1.waitForTimeout(800);
  const isk = await s1.evaluate(() => ({ iskelet: document.querySelectorAll(".sy-final-gorsel .sy-cerceve-iskelet").length, soru: document.querySelectorAll(".sy-final-gorsel .sy-soru").length,
    etiket: document.querySelector(".sy-final-etiket")?.textContent ?? null }));
  await s1.screenshot({ path: "tasarim/sezon-yolu/v3/canli-iskelet-360x640.png" });
  ok("yük sırasında hero'da iskelet var, '?' yok", isk.iskelet === 1 && isk.soru === 0, JSON.stringify(isk));
  ok("hero 'Sezon sonu ödülü' etiketi canlıda", /Sezon sonu ödülü/.test(isk.etiket ?? ""), String(isk.etiket));
  await s1.close();

  // 2) satın alma vitrini
  const s2 = await baglam.newPage();
  const konsol = [];
  s2.on("pageerror", (e) => konsol.push(String(e).slice(0, 160)));
  await s2.goto(`${ADRES}/sezon-yolu`, { waitUntil: "domcontentloaded" });
  await s2.waitForSelector(".sy-yol", { timeout: 30000 });
  // Misafir hesap kurulumu bitirmedi: Tanıtım/Kurulum pencereleri yalnız bu sayfada gizlenir (profil yazılmaz)
  await s2.addStyleTag({ content: ".g-tanitim-katman, .bd-modal-katman:not(.sy-modal):has(.g-sihirbaz-adim), [aria-label=Kurulum], [aria-label=Tanıtım] { display: none !important; }" });
  await s2.waitForTimeout(1000);
  await s2.screenshot({ path: "tasarim/sezon-yolu/v3/canli-sayfa-360x640.png" });
  await s2.getByRole("button", { name: /Battle Pass al/i }).first().dispatchEvent("click");
  await s2.waitForSelector("[role=dialog] .sy-final-vitrin", { timeout: 15000 });
  await s2.waitForFunction(() => { const e = document.querySelector(".sy-final-vitrin"); return e?.querySelector(".sy-cerceve-odul") && !e.querySelector(".sy-cerceve-iskelet") && !e.querySelector(".sy-cerceve-yedek"); }, null, { timeout: 20000 })
    .then(() => ok("vitrinde Ejderha çerçevesi çizildi", true)).catch(() => ok("vitrinde Ejderha çerçevesi çizildi", false));
  await s2.waitForTimeout(1200);
  const taşma = await s2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok("yatay taşma yok", taşma <= 0, String(taşma));
  const liste = await s2.evaluate(() => [...document.querySelectorAll("[role=dialog] .sy-final-vitrin-metin *, [role=dialog] .sy-final-vitrin-metin")]
    .filter((e) => e.children.length === 0 && e.textContent.trim()).map((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { t: e.textContent.trim().slice(0, 30), x: r.left, y: r.top + r.height * 0.22, w: r.width, h: r.height * 0.56, renk: cs.color }; }));
  await s2.screenshot({ path: "tasarim/sezon-yolu/v3/canli-satin-alma-360x640.png" });
  await s2.addStyleTag({ content: "*{color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:transparent!important}" });
  await s2.waitForTimeout(400);
  const png = (await s2.screenshot({ type: "png", scale: "css" })).toString("base64");
  const sonuc = await s2.evaluate(async ({ png, liste }) => {
    const img = new Image(); await new Promise((a, b) => { img.onload = a; img.onerror = b; img.src = "data:image/png;base64," + png; });
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const lum = (r, gg, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b); };
    const cr = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    return liste.map((o) => {
      const m = o.renk.match(/[\d.]+/g).map(Number);
      const d = g.getImageData(Math.max(0, Math.floor(o.x)), Math.max(0, Math.floor(o.y)), Math.max(1, Math.ceil(o.w)), Math.max(1, Math.ceil(o.h))).data;
      let en = 99;
      for (let i = 0; i < d.length; i += 4) en = Math.min(en, cr(lum(m[0], m[1], m[2]), lum(d[i], d[i + 1], d[i + 2])));
      return { t: o.t, min: +en.toFixed(2) };
    });
  }, { png, liste });
  const dus = Math.min(...sonuc.map((o) => o.min));
  ok(`vitrin metinleri gerçek piksel kontrastı ≥ 4,5 (${sonuc.length} metin, en düşük ${dus})`, sonuc.length > 0 && dus >= 4.5, JSON.stringify(sonuc));
  ok("konsolda sayfa hatası yok", konsol.length === 0, konsol.join(" | "));
  await s2.close();
} catch (e) {
  hata++; console.log("HATA:", String(e.message).slice(0, 900));
} finally {
  await tarayici.close();
}
console.log(hata ? `${hata} KALDI` : "HEPSİ GEÇTİ");
process.exit(hata ? 1 : 0);
