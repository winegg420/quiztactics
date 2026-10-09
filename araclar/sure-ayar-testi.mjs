// /sure-ayar sayfa testi (yerel, sunucuya yazmaz): 390 px ekran görüntüsü + taşma + 44 px hedef, kaydırıcı → localStorage,
// "Bu süreyi dene" ölçülen süre seçili değere uyuyor mu, "Seçimlerimi kopyala" JSON'u, localStorage KAPALIYKEN çökme yok.
// Kullanım: npm run dev -- --port 5188 · node araclar/sure-ayar-testi.mjs --oturum=.arayuz-denetim-oturum-sure.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const OTURUM = path.resolve(typeof ARG.oturum === "string" ? ARG.oturum : ".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/sure-olcum/ss/sure-ayar");
fs.mkdirSync(CIKTI, { recursive: true });
let gecti = 0, kaldi = 0;
const ok = (ad, k, ek = "") => { if (k) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };

const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const kok = new URL(ADRES).origin;
durum.origins = (durum.origins || []).map((o) => ({ ...o, origin: kok }));
const t = await chromium.launch({ channel: "chrome", headless: true });

async function baglam(depoKapali) {
  const b = await t.newContext({ storageState: durum, viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block",
    permissions: ["clipboard-read", "clipboard-write"] });
  if (depoKapali) await b.addInitScript(() => {
    // Oturum belirteci okunabilsin (giriş), süre ayarı deposu kapalı: qt-sure-ayar* anahtarları hata atar
    const oku = Storage.prototype.getItem, yaz = Storage.prototype.setItem, sil = Storage.prototype.removeItem;
    Storage.prototype.getItem = function (k) { if (String(k).startsWith("qt-sure-ayar")) throw new Error("depo kapalı"); return oku.call(this, k); };
    Storage.prototype.setItem = function (k, v) { if (String(k).startsWith("qt-sure-ayar")) throw new Error("depo kapalı"); return yaz.call(this, k, v); };
    Storage.prototype.removeItem = function (k) { if (String(k).startsWith("qt-sure-ayar")) throw new Error("depo kapalı"); return sil.call(this, k); };
  });
  const s = await b.newPage();
  const hatalar = [];
  s.on("pageerror", (e) => hatalar.push(String(e).slice(0, 200)));
  s.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) hatalar.push(m.text().slice(0, 200)); });
  return { b, s, hatalar };
}

try {
  console.log("== /sure-ayar 390×844");
  const { b, s, hatalar } = await baglam(false);
  await s.goto(`${ADRES}/sure-ayar`, { waitUntil: "domcontentloaded" });
  await s.waitForSelector(".sa-kart", { timeout: 30000 });
  await s.evaluate(() => { try { localStorage.removeItem("qt-sure-ayar-v1"); } catch { /* yok */ } });
  await s.reload({ waitUntil: "domcontentloaded" }); await s.waitForSelector(".sa-kart");
  await s.screenshot({ path: path.join(CIKTI, "duello-390.png") });
  await s.screenshot({ path: path.join(CIKTI, "duello-390-tam.png"), fullPage: true });
  const o = await s.evaluate(() => ({
    yatay: document.documentElement.scrollWidth - innerWidth,
    kucuk: [...document.querySelectorAll(".sa-sayfa button, .sa-sayfa input")].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.height < 44 || r.width < 44); }).length,
    robots: document.querySelector('meta[name="robots"]')?.content ?? null,
  }));
  ok(`yatay taşma yok (${o.yatay})`, o.yatay <= 0);
  ok(`dokunma hedefleri ≥ 44 px (küçük: ${o.kucuk})`, o.kucuk === 0);
  ok(`noindex meta (${o.robots})`, /noindex/.test(o.robots ?? ""));
  ok("Düello sekmesinde ortak + Düello süreleri", await s.locator(".sa-kart").count() >= 10);

  // Hazine sekmesi: ÇİFTE'yi 2500 ms yap, dene → ölçülen ≈ 2500
  await s.getByRole("tab", { name: "Ortak Hazine" }).click();
  await s.screenshot({ path: path.join(CIKTI, "hazine-390.png") });
  const kart = s.locator(".sa-kart", { hasText: "ÇİFTE" });
  await kart.locator("input[type=range]").fill("2500");
  const depo = await s.evaluate(() => localStorage.getItem("qt-sure-ayar-v1"));
  ok(`kaydırıcı localStorage'a yazdı (${depo})`, /"kasa_cifte":2500/.test(depo ?? ""));
  ok("kök CSS ölçeği --sr-kasa_cifte", Math.abs(Number(await s.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--sr-kasa_cifte"))) - 2500 / 1400) < 0.01);
  await kart.getByRole("button", { name: "Bu süreyi dene" }).click();
  const t0 = Date.now();
  await s.waitForSelector(".sa-sahne .ks-cifte", { timeout: 3000 });
  await s.waitForTimeout(600);
  await s.screenshot({ path: path.join(CIKTI, "dene-cifte-390.png") });
  await s.waitForSelector(".sa-sahne", { state: "detached", timeout: 6000 });
  const gecen = Date.now() - t0;
  ok(`"Bu süreyi dene" ÇİFTE ≈ 2500 ms (${gecen})`, gecen > 2300 && gecen < 2900);
  const not = await kart.locator(".sa-not").innerText();
  ok(`ölçülen not "${not}"`, /2,[45]\d sn/.test(not));
  // AÇ anı dene (gerçek bileşen) — varsayılan
  const ac = s.locator(".sa-kart", { hasText: "AÇ anı" });
  await ac.getByRole("button", { name: "Bu süreyi dene" }).click();
  await s.waitForSelector(".sa-sahne .ks-ac-an", { timeout: 3000 });
  await s.waitForTimeout(500);
  await s.screenshot({ path: path.join(CIKTI, "dene-ac-390.png") });
  await s.waitForSelector(".sa-sahne", { state: "detached", timeout: 4000 });
  // Bugünkü değere dön + kopyala
  await kart.getByRole("button", { name: "Bugünkü değere dön" }).click();
  ok("bugünkü değere dön: depo boş", (await s.evaluate(() => localStorage.getItem("qt-sure-ayar-v1"))) === null);
  await kart.locator("input[type=range]").fill("2000");
  await s.getByRole("button", { name: /Seçimlerimi kopyala/ }).click();
  await s.waitForTimeout(300);
  const pano = await s.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  ok(`kopyalanan JSON (${pano.replace(/\s+/g, " ").slice(0, 80)})`, /"kasa_cifte": 2000/.test(pano));
  await s.getByRole("button", { name: "Hepsini sıfırla" }).click();
  ok("sıfırla: depo boş", (await s.evaluate(() => localStorage.getItem("qt-sure-ayar-v1"))) === null);
  ok(`konsol/sayfa hatası yok (${hatalar.join(" | ")})`, hatalar.length === 0);
  await b.close();

  console.log("== localStorage KAPALI");
  const k = await baglam(true);
  await k.s.goto(`${ADRES}/sure-ayar`, { waitUntil: "domcontentloaded" });
  await k.s.waitForSelector(".sa-kart", { timeout: 30000 });
  ok("sayfa açıldı, uyarı görünüyor", await k.s.locator(".sa-uyari").count() === 1);
  const kartK = k.s.locator(".sa-kart").first();
  await kartK.locator("input[type=range]").fill("3000");
  ok("depo kapalıyken de seçim bu sekmede geçerli", /3,00 sn/.test(await kartK.locator(".sa-deger").innerText()));
  await k.s.screenshot({ path: path.join(CIKTI, "depo-kapali-390.png") });
  await k.s.goto(`${ADRES}/`, { waitUntil: "domcontentloaded" });
  await k.s.waitForTimeout(2500);
  ok(`depo kapalı: sayfa/konsol hatası yok (${k.hatalar.join(" | ")})`, k.hatalar.length === 0);
  await k.b.close();
} catch (e) {
  ok("HATA: " + String(e).slice(0, 300), false);
}
await t.close();
console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
