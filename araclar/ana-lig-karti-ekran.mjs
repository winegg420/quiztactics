// ANA SAYFA LİG KARTI + LİG BİLGİ SATIRI (7 Eki 2026). SUNUCUYA YAZMAZ: lig_grubum_ozet taklit edilir (sıra 8/8, uzun ad).
// Ölçer: yatay taşma · kart dışına taşan öğe · kartın dokunma yüksekliği ≥44 · "Sen" satırı mavi · bilgi satırı TEK satır
// (Dünya sekmesi) · konsol hatası. 5 lig × 360x640/390x664/390x844 × TR/EN × normal/--azalt.
// Kullanım: npm run dev -- --port 5199 · node araclar/ana-lig-karti-ekran.mjs [--adres=...] [--hizli] [--azalt] [--cikti=tasarim/profil-ana-lig/ana]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const arg = (ad, v) => (process.argv.find((a) => a.startsWith(`--${ad}=`)) ?? `--${ad}=${v}`).slice(ad.length + 3);
const ADRES = arg("adres", "http://localhost:5199"), HIZLI = process.argv.includes("--hizli"), AZALT = process.argv.includes("--azalt");
const CIKTI = path.resolve(arg("cikti", "tasarim/profil-ana-lig/ana")); fs.mkdirSync(CIKTI, { recursive: true });
const origin = new URL(ADRES).origin;
const oku = (d) => { if (!fs.existsSync(d)) return null; const k = JSON.parse(fs.readFileSync(d, "utf8")).origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token"))); return k ? k.localStorage : null; };
const KAYNAK = { tr: oku(path.resolve(".arayuz-denetim-oturum.json")), en: oku(path.resolve(".arayuz-denetim-oturum-en.json")) };
if (!KAYNAK.tr) { console.error("Oturum yok: node araclar/arayuz-denetim.mjs --sadece-oturum"); process.exit(1); }
const DILLER = HIZLI ? ["tr"] : ["tr", "en"].filter((d) => KAYNAK[d]);
const LIGLER = arg("lig", "") ? [arg("lig", "")] : ["bronz", "gumus", "altin", "elmas", "efsane"];
const BOYUTLAR = HIZLI ? [[360, 640]] : [[360, 640], [390, 664], [390, 844]];
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
const ADLAR = ["Deniz", "Ayşe Nur Karadeniz Yıldırım", "Elif", "Mert", "Zeynep", "Burak", "Ece", "Can"];
const ozet = (lig) => ({
  lig, sira: 8, grup_boyu: 8, hafta_bitis: new Date(Date.now() + (2 * 24 + 1) * 3600e3).toISOString(), bolge: "dusme", ust_lig: lig !== "efsane",
  yukselme_cizgisine_fark: 75, ust_siraya_fark: 12, yukselme_sirasi: 3, dusme_sirasi: 7,
  satirlar: ADLAR.map((ad, i) => ({ sira: i + 1, user_id: crypto.randomUUID(), ad: i === 7 ? "Ben" : ad, avatar: null, puan: 640 - i * 61, ben: i === 7 })),
});
const OLC = () => {
  const iw = window.innerWidth, s = [];
  const k = document.querySelector("a.as-lk");
  if (!k) return { s: ["lig kartı yok"] };
  const kr = k.getBoundingClientRect();
  if (kr.height < 44 && innerHeight >= 800) s.push(`kart <44px (${Math.round(kr.height)})`);
  for (const e of k.querySelectorAll("*")) { const r = e.getBoundingClientRect(); if (r.width && (r.right > kr.right + 1 || r.left < kr.left - 1)) { s.push(`kart dışına taşan: ${String(e.className).slice(0, 30)}`); break; } }
  const ben = k.querySelector(".as-lk-satir--ben");
  if (ben && ben.getBoundingClientRect().height && !/rgb\(\s*2\d\d|rgb\(\s*[0-9]+, *[0-9]+, *2\d\d/.test(getComputedStyle(ben).backgroundColor)) s.push(`Sen satırı mavi değil: ${getComputedStyle(ben).backgroundColor}`);
  if (document.scrollingElement.scrollWidth > iw + 0.5) s.push("yatay taşma");
  return { s, yuk: Math.round(kr.height) };
};
const OLC_BILGI = () => {
  const iw = window.innerWidth, s = [];
  const hepsi = [...document.querySelectorAll(".lg-bilgi-serit")];
  if (!hepsi.length) return ["bilgi satırı yok"];
  for (const b of hepsi) {
    const sp = b.querySelector("span"), lh = parseFloat(getComputedStyle(sp).lineHeight) || 16;
    if (sp.getBoundingClientRect().height > lh * 1.5) s.push("bilgi satırı iki satır");
    if (b.getBoundingClientRect().right > iw + 0.5) s.push("bilgi satırı taşıyor");
  }
  if (document.scrollingElement.scrollWidth > iw + 0.5) s.push("yatay taşma");
  return s;
};
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
let hata = 0, top = 0;
for (const dil of DILLER) for (const lig of LIGLER) for (const [w, h] of BOYUTLAR) {
  const yerel = [...KAYNAK[dil].filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }];
  const b = await tarayici.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
    reducedMotion: AZALT ? "reduce" : "no-preference", storageState: { cookies: [], origins: [{ origin, localStorage: yerel }] } });
  const sf = await b.newPage(), konsol = [];
  sf.on("console", (m) => { if (m.type() === "error" && !/favicon|chrome-extension|lig_grubum_ozet/.test(m.text())) konsol.push(m.text().slice(0, 140)); });
  sf.on("pageerror", (e) => konsol.push(String(e).slice(0, 140)));
  await sf.route(/\/rest\/v1\/rpc\/lig_grubum_ozet(\?|$)/, (r) => r.request().method() === "OPTIONS" ? r.fulfill({ status: 204, headers: CORS })
    : r.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: JSON.stringify(ozet(lig)) }));
  const ad = `${lig}-${w}x${h}-${dil}${AZALT ? "-azalt" : ""}`; top++;
  try {
    await sf.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
    await sf.waitForSelector("a.as-lk", { timeout: 30000 }); await sf.waitForTimeout(1200);
    const o = await sf.evaluate(OLC);
    await (await sf.$("a.as-lk")).screenshot({ path: path.join(CIKTI, `ana-${ad}.png`) });
    let sorun = [...o.s];
    if (lig === LIGLER[0]) {
      await sf.goto(ADRES + "/siralama", { waitUntil: "domcontentloaded" });
      await sf.waitForSelector(".lg-sekmeler [role=tab]", { timeout: 25000 });
      for (const i of [1, 3]) {   // Şehir, Dünya
        await sf.locator(".lg-sekmeler [role=tab]").nth(i).click(); await sf.waitForTimeout(1500);
        sorun.push(...(await sf.evaluate(OLC_BILGI)).map((x) => `sekme${i}: ${x}`));
        await sf.screenshot({ path: path.join(CIKTI, `bilgi-sekme${i}-${w}x${h}-${dil}${AZALT ? "-azalt" : ""}.png`) });
      }
    }
    sorun.push(...konsol.map((k) => "konsol: " + k));
    if (sorun.length) { hata++; console.log("✗", ad, sorun.join(" | ")); } else console.log("✓", ad, `kart ${o.yuk}px`);
  } catch (e) { hata++; console.log("✗", ad, "açılamadı:", e.message.split("\n")[0]); }
  await b.close();
}
await tarayici.close();
console.log(`\n${top - hata}/${top} temiz`); process.exit(hata ? 1 : 0);
