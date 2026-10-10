// Maç sonu SP şeridi + seviye atlama ve BP tanıtım penceresi ekran görüntüsü / ölçüm (taklit veri; sunucuya YAZMAZ).
// sahip_mi, sezon_ozetim, sezon_mac_sp_ozetim, bp_tanitim_gosterilsin_mi cevapları tarayıcıda taklit edilir (page.route).
// Kullanım: npm run dev -- --port 5182   (başka kabukta)   node araclar/mac-sonu-sp-ekran.mjs [--adres=http://localhost:5182]
// Çıktı: tasarim/mac-sonu-sp-bp/macsonu-*.png, bp-tanitim-*.png
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ADRES = (process.argv.find((a) => a.startsWith("--adres=")) ?? "--adres=http://localhost:5182").slice(8);
const origin = new URL(ADRES).origin;
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/mac-sonu-sp-bp");
fs.mkdirSync(CIKTI, { recursive: true });
const OTURUM_EN = path.resolve(".arayuz-denetim-oturum-en.json");   // dil profilden geldiği için EN için EN hesap
const oku = (d) => JSON.parse(fs.readFileSync(d, "utf8")).origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token")))?.localStorage;
const ls = (dil) => [
  ...((dil === "en" && fs.existsSync(OTURUM_EN) && oku(OTURUM_EN)) || oku(OTURUM))
    .filter((x) => x.name !== "bildim_dil"),
  { name: "bildim_dil", value: dil },
];
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };

const SP_NORMAL = { gorunur: true, kazanilan: 20, sp_once: 1080, sp_sonra: 1100, seviye_once: 10, seviye_sonra: 11, seviye_sayisi: 28,
  once_alt: 1000, once_ust: 1100, sonra_alt: 1100, sonra_ust: 1200, kalan: 100, atlandi: true, oduller: [] };
const SP_YAKIN = { gorunur: true, kazanilan: 20, sp_once: 1141, sp_sonra: 1161, seviye_once: 11, seviye_sonra: 11, seviye_sayisi: 28,
  once_alt: 1100, once_ust: 1200, sonra_alt: 1100, sonra_ust: 1200, kalan: 39, atlandi: false, oduller: [] };
const SP_ATLA = { gorunur: true, kazanilan: 30, sp_once: 1285, sp_sonra: 1315, seviye_once: 12, seviye_sonra: 13, seviye_sayisi: 28,
  once_alt: 1200, once_ust: 1300, sonra_alt: 1300, sonra_ust: 1400, kalan: 85, atlandi: true,
  oduller: [{ seviye: 13, kol: "ucretsiz", tur: "coin", veri: { miktar: 100 }, placeholder: false, ad_tr: "100 coin", ad_en: "100 coins", nadirlik: null }] };
void SP_NORMAL;

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const sonuc = [];
async function sayfa(w, h, dil, sp) {
  const baglam = await tarayici.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
    storageState: { cookies: [], origins: [{ origin, localStorage: ls(dil) }] },
  });
  const p = await baglam.newPage();
  const konsol = [];
  p.on("console", (m) => { if (m.type() === "error") konsol.push(m.text()); });
  p.on("pageerror", (e) => konsol.push(String(e)));
  const rpc = (ad, govde) => p.route(new RegExp(`/rest/v1/rpc/${ad}(\\?|$)`), (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: CORS });
    return r.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: JSON.stringify(govde) });
  });
  await rpc("sahip_mi", true);
  await rpc("sezon_ozetim", { gorunur: true, sezon: { id: 1, no: 1 }, seviye: 11, seviye_sayisi: 28, sp: 1100, onceki_esik: 1100, sonraki_esik: 1200, bp: false, alinabilir: 0 });
  await rpc("sezon_mac_sp_ozetim", sp);
  await rpc("bp_tanitim_gosterilsin_mi", { goster: true, sezon_no: 1, ucretli_odul_sayisi: 28, fiyat: 500, sp_carpan: 1.25 });
  return { baglam, p, konsol };
}

for (const [w, h] of [[390, 844], [360, 640]]) {
  for (const dil of ["tr", "en"]) {
    const ek = `${w}x${h}-${dil}`;
    // 1) maç sonu: SP (seviye atlamadan) ve seviye atlama
    for (const [ad, sp] of [["sp", SP_YAKIN], ["seviye", SP_ATLA]]) {
      const { baglam, p, konsol } = await sayfa(w, h, dil, sp);
      await p.goto(ADRES + "/mac-sonu-onizleme?arac=0", { waitUntil: "domcontentloaded" });
      await p.waitForSelector(".msk", { timeout: 20000 });
      await p.waitForSelector("[data-sezon-sp]", { timeout: 15000 });
      if (ad === "seviye") { await p.waitForTimeout(700); await p.screenshot({ path: `${CIKTI}/macsonu-seviye-ara-${ek}.png` }); }
      await p.waitForTimeout(2600);
      await p.screenshot({ path: `${CIKTI}/macsonu-${ad}-${ek}.png` });
      const ol = await p.evaluate(() => {
        const s = document.querySelector("[data-sezon-sp]").getBoundingClientRect();
        return { tasma: document.documentElement.scrollWidth > innerWidth + 1, alt: Math.round(s.bottom), ust: Math.round(s.top), ih: innerHeight };
      });
      sonuc.push({ ek, ad, ...ol, konsol: konsol.filter((x) => !/Failed to load resource|favicon/.test(x)) });
      await baglam.close();
    }
    // 2) BP tanıtımı: ana sayfa
    const { baglam, p, konsol } = await sayfa(w, h, dil, SP_YAKIN);
    await p.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".bpt-kart", { timeout: 25000 });
    await p.waitForTimeout(1800);
    await p.screenshot({ path: `${CIKTI}/bp-tanitim-${ek}.png` });
    const ol = await p.evaluate(() => {
      const k = document.querySelector(".bpt-kart").getBoundingClientRect();
      const bt = [...document.querySelectorAll(".bpt-kart button")].map((b) => { const r = b.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; });
      return { kartAlt: Math.round(k.bottom), kartUst: Math.round(k.top), ih: innerHeight, bt, tasma: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    sonuc.push({ ek, ad: "bp-tanitim", ...ol, konsol: konsol.filter((x) => !/Failed to load resource|favicon/.test(x)) });
    await baglam.close();
  }
}
await tarayici.close();
console.log(JSON.stringify(sonuc, null, 1));
