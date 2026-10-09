// Dükkân › Avatar: listeden dokunuşta pencere açılıyor mu? (Ida 9 Eki 2026) — 360×640 / 390×844 × TR/EN.
// SUNUCUYA YAZMAZ: avatar_sahiplik_durumu taklit; avatar_onayla / avatar_satin_al / kozmetik_* yazmaları 400 döner.
// Kullanım: npm run dev -- --port 5187 (başka kabukta) · node araclar/dukkan-avatar-pencere-ekran.mjs [--adres=http://localhost:5187]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5187";
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/dukkan-avatar-pencere");
fs.mkdirSync(CIKTI, { recursive: true });
const sql770 = fs.readFileSync(path.resolve("supabase/migrations/20260612000770_avatar_nadirlik_yaz_ve_ac.sql"), "utf8");
const adres = (a) => `/avatars/${/-k\d+$/.test(a) ? "pro" : "pro2"}/${a}.svg`;
const SAHIP = new Set(["korsan-k19"]);
const UCRETLI = [...sql770.matchAll(/\('([a-z0-9-]+)','(epik|efsanevi)'\)/g)].map((m, i) => ({
  url: adres(m[1]), anahtar: m[1], nadirlik: m[2], fiyat: m[2] === "epik" ? 150 : 300, sahibim: SAHIP.has(m[1]), satilik: true, sira: i }));
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
  s.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  await s.route(/\/rest\/v1\/(profiles|rpc)/, async (r) => {
    const u = r.request().url();
    try {
      if (u.includes("/rpc/avatar_sahiplik_durumu")) return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(UCRETLI) });
      if (r.request().method() !== "GET" && /\/rpc\/(avatar_onayla|avatar_satin_al|kozmetik_satin_al|kozmetik_tak)/.test(u)) return r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "Ölçüm aracı: yazma kapalı" }) });
      const y = await r.fetch();
      await r.fulfill({ response: y, body: (await y.text()).replace(/"dil":\s*"(tr|en)"/g, `"dil":"${dil}"`) });
    } catch { try { await r.continue(); } catch { /* kapandı */ } }
  });
  const et = `${w}-${dil}`;
  console.log(`\n== ${w}×${h} ${dil}`);
  try {
    await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" }); await s.waitForTimeout(2500);
    await s.goto(ADRES + "/joker?sekme=avatar", { waitUntil: "domcontentloaded" });
    await s.waitForFunction(() => document.querySelectorAll(".qt-dc-oge").length > 30, null, { timeout: 40000 }); await s.waitForTimeout(800);
    // 1) kilitli (satın alınabilir) avatar → sayfa kaymadan onay sayfası
    const kilitli = s.locator(".qt-dc-oge.qt-av-kilitli").first();
    await kilitli.scrollIntoViewIfNeeded(); await kilitli.click(); await s.waitForTimeout(700);
    const d = s.locator("[role=dialog]").last();
    const metin = (await d.innerText().catch(() => "")).replace(/\s+/g, " ");
    ok("kilitli avatara dokununca pencere açılır", await d.count() > 0 && /150/.test(metin), metin.slice(0, 120));
    ok("pencere: nadirlik etiketi + Vazgeç/Cancel + (Yetersiz elmas | Satın al)", await d.locator(".qt-dc-nadirlik").count() > 0 && /(Vazgeç|Cancel)/.test(metin) && /(Yetersiz elmas|Not enough gems|Satın al|Buy)/.test(metin), metin.slice(0, 160));
    const dugme = d.locator("button", { hasText: /Yetersiz elmas|Not enough gems|Satın al|Buy/ }).first();
    const yetmez = /Yetersiz elmas|Not enough gems/.test(await dugme.innerText());
    if (yetmez) ok("elmas yetmiyor: düğme pasif + Elmas sekmesine giden bağlantı", await dugme.isDisabled() && await d.getByRole("button", { name: /Nasıl kazanılır|How/ }).count() > 0);
    const kucuk = await d.evaluate((el) => [...el.querySelectorAll("button")].filter((e) => { const r = e.getBoundingClientRect(); return r.height < 44; }).map((e) => e.textContent.trim()));
    ok("pencere: dokunma hedefi ≥ 44 px", kucuk.length === 0, JSON.stringify(kucuk));
    ok("pencere: yatay taşma yok", await s.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0);
    await s.screenshot({ path: path.join(CIKTI, `kilitli-${et}.png`) });
    if (!yetmez) { await dugme.click(); await s.waitForTimeout(900); ok("satın alma hatası pencerede görünür (yazma kapalı)", await s.locator("[role=dialog] [role=alert], [role=alert]").count() > 0); await s.screenshot({ path: path.join(CIKTI, `hata-${et}.png`) }); }
    await d.getByRole("button", { name: /Vazgeç|Cancel/ }).first().click().catch(() => {}); await s.waitForTimeout(400);
    // 2) sahip olunan avatar → Tak penceresi, yazma 400 → pencerede hata
    await s.keyboard.press("Escape");
    const sahip = s.locator(".qt-dc-oge:has(.qt-dc-sahip)").nth(3);
    await sahip.scrollIntoViewIfNeeded(); await sahip.click(); await s.waitForTimeout(600);
    const d2 = s.locator("[role=dialog]").last();
    ok("sahip olunan avatara dokununca Tak penceresi açılır", await d2.getByRole("button", { name: /^(Tak|Equip)$/ }).count() > 0 || await d2.getByRole("button", { name: /Takılı|Equipped/ }).count() > 0, (await d2.innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 100));
    const tak = d2.getByRole("button", { name: /^(Tak|Equip)$/ });
    if (await tak.count()) { await tak.click(); await s.waitForTimeout(900); ok("Tak hatası pencerede görünür (yazma kapalı)", await d2.locator("[role=alert]").count() > 0); }
    await s.screenshot({ path: path.join(CIKTI, `tak-${et}.png`) });
  } catch (e) { console.log("  ✗ BEKLENMEYEN HATA:", String(e).slice(0, 300)); kaldi++; try { await s.screenshot({ path: path.join(CIKTI, `hata-genel-${et}.png`) }); } catch {} }
  const g = konsol.filter((k) => !/Ölçüm aracı|favicon|net::ERR_|Failed to load resource/.test(k));
  ok("konsol hatası yok", g.length === 0, JSON.stringify(g.slice(0, 3)));
  await b.close();
}
await tarayici.close();
console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
