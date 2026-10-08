// /duello-onizleme ekran görüntüsü + ölçüm — TAKLİT VERİYLE: Supabase istekleri sahte yanıtlanır, canlıya yük bindirmez.
// 11 ekran (+ alt durumlar, rakip-kontrol bakışı) × 390×844 ve 360×640 × TR/EN. Ölçer: yatay taşma · 44 px altı dokunma hedefi ·
// kesik metin · konsol hatası · (EN) ekranda kalan Türkçe metin.
// Kullanım: npm run dev -- --port 5190 · node araclar/duello-onizleme-ekran.mjs [--adres=http://localhost:5190] [--cikti=tasarim/duello-onizleme]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { ceviriToplayici } from "./ceviri-dom.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5190";
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve(ARG.cikti || "tasarim/duello-onizleme");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }

const OLC = () => {
  const gorunur = (el) => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const s = getComputedStyle(el); return s.visibility !== "hidden" && s.display !== "none"; };
  const yol = (el) => el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "");
  const tasan = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && !e.closest(".dop-konfeti"); }).slice(0, 5).map(yol);
  const kucuk = [...document.querySelectorAll(".dop-sahne button, .dop-arac button")].filter(gorunur)
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map((e) => `${yol(e)} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
  const kesik = [...document.querySelectorAll(".dop-sahne *")].filter((e) => gorunur(e) && e.children.length === 0 && e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0)
    .map((e) => `${yol(e)}: ${e.textContent.trim().slice(0, 30)}`);
  return { yatayTasma: document.documentElement.scrollWidth - innerWidth, tasan, kucuk, kesik, sahneYuk: Math.round(document.querySelector(".dop-sahne")?.getBoundingClientRect().height ?? 0) };
};

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
const sonuc = {}; let kaldi = 0;
const CEVIRI = await ceviriToplayici();
try {
  for (const dil of ["tr", "en"]) for (const boy of ["390x844", "360x640"]) {
    const [w, h] = boy.split("x").map(Number);
    const dosya = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
    dosya.origins = (dosya.origins || []).map((o) => ({ ...o, origin: kok,
      localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim"].includes(x.name)), { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" }] }));
    const b = await tarayici.newContext({ storageState: dosya, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block" });
    const s = await b.newPage();
    const konsol = [];
    s.on("console", (m) => { if (m.type() === "error" && !/status of (400|401|403|404)|Failed to load resource/.test(m.text())) konsol.push(m.text().slice(0, 200)); });
    s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
    // Canlı Supabase'e istek gitmez: REST/RPC boş, gerisi geçer.
    await s.route(/\/rest\/v1\/|\/functions\/v1\//, (r) => r.fulfill({ status: 200, contentType: "application/json", body: r.request().url().includes("/rpc/") ? "{}" : "[]" }));
    await s.goto(`${ADRES}/duello-onizleme`, { waitUntil: "domcontentloaded" });
    await s.waitForSelector(".dop-sahne", { timeout: 20000 });
    const tab = (n) => s.locator(".dop-arac [role=tab]").nth(n - 1);
    const rolSec = (ad) => s.locator(".dop-arac [role=tablist]").nth(1).locator("[role=tab]").nth(ad === "ben" ? 0 : 1).click();
    const alt = (ad) => s.locator(".dop-sahne .dop-alt-sekme [role=tab]").nth(ad);
    const etiket = `${w}x${h}-${dil}`;
    const cek = async (ad) => {
      await s.waitForTimeout(1300);
      await s.screenshot({ path: path.join(CIKTI, `${ad}-${etiket}.png`), fullPage: true });
      const o = await s.evaluate(OLC); sonuc[`${ad}-${etiket}`] = o;
      const sorun = o.yatayTasma > 0 || o.kucuk.length || o.kesik.length;
      if (sorun) { kaldi++; console.log("  ✗", ad, etiket, JSON.stringify({ t: o.yatayTasma, tasan: o.tasan, kucuk: o.kucuk.slice(0, 3), kesik: o.kesik.slice(0, 3) })); }
      if (dil === "en") await CEVIRI.tara(s, `${ad}-${etiket}`);
    };
    const ekran = async (n, ad, ...onlar) => { await tab(n).click(); for (const f of onlar) await f(); await cek(ad); };
    await rolSec("ben");
    await ekran(1, "01-notr-soru");
    await ekran(2, "02-kontrol-sende");
    await ekran(3, "03-kontrol-a-rakibe-gonder");
    await ekran(4, "04-kontrol-b-kendine-sec");
    await ekran(5, "05-rakip-ekrani-bekliyor");
    await alt(1).click(); await cek("05b-rakip-ekrani-acildi");
    await ekran(6, "06-soru-turu");
    await ekran(7, "07a-sonuc-basarili-saldiri");
    await alt(1).click(); await cek("07b-sonuc-kontrol-degisti");
    await alt(2).click(); await cek("07c-sonuc-notr");
    await ekran(8, "08b-seri-2-3");
    await alt(0).click(); await cek("08a-seri-1-3");
    await ekran(9, "09-duello-kazanildi");
    await ekran(10, "10-kontrol-el-degistirdi");
    await ekran(11, "11-son-duello");
    // rakip kontrol sahibi bakışı
    await rolSec("rakip");
    await ekran(2, "r02-kontrol-rakipte");
    await ekran(6, "r06-soru-turu");
    await ekran(7, "r07a-sonuc-rakip-saldirdi");
    await alt(1).click(); await cek("r07b-sonuc-kontrol-bende");
    await ekran(8, "r08b-seri-2-3");
    await ekran(9, "r09-duello-kaybedildi");
    await ekran(10, "r10-kontrol-bende");
    if (konsol.length) { kaldi++; console.log("  ✗ konsol", etiket, konsol.slice(0, 3)); }
    sonuc[`konsol-${etiket}`] = konsol;
    await b.close();
  }
} finally {
  await tarayici.close();
}
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(sonuc, null, 1));
console.log(kaldi ? `${kaldi} sorun` : "Hepsi temiz");
process.exit(kaldi ? 1 : 0);
