// 6 yeni avatar (1009) + Dükkân "Sahip olunan" etiketi ekran ölçümü — 390×844, 390×664, 360×640 × TR/EN.
// SUNUCUYA YAZMAZ: migration canlıda olmadığı için avatar_katalogu_oyun / avatar_sahiplik_durumu / avatar_nadirlik_renkleri
// yanıtlarına 6 yeni avatar tarayıcıda eklenir (page.route); yazan RPC'ler kapalıdır. Tek misafir oturumu açar (1 kez).
// Kullanım: npm run dev -- --port 5187 (başka kabukta) · node araclar/avatar-1009-ekran.mjs --adres=http://localhost:5187
// Çıktı: tasarim/avatar-1009/*.png
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5187";
const CIKTI = path.resolve("tasarim/avatar-1009");
fs.mkdirSync(CIKTI, { recursive: true });

const YENI = [
  { anahtar: "kovboy-y40", ad_tr: "Kovboy", ad_en: "Cowboy", tur: "gunluk", nad: "nadir" },
  { anahtar: "korkuluk-y41", ad_tr: "Korkuluk", ad_en: "Scarecrow", tur: "kostumlu", nad: "nadir" },
  { anahtar: "kurt-adam-y42", ad_tr: "Kurt Adam", ad_en: "Werewolf", tur: "kostumlu", nad: "epik", fiyat: 150, sahibim: true },
  { anahtar: "balkabagi-adam-y43", ad_tr: "Balkabağı Adam", ad_en: "Pumpkin Head", tur: "kostumlu", nad: "epik", fiyat: 150, sahibim: false },
  { anahtar: "gunes-kral-y44", ad_tr: "Güneş Kralı", ad_en: "Sun King", tur: "kostumlu", nad: "efsanevi", fiyat: 300, sahibim: false },
  { anahtar: "ay-tanricasi-y45", ad_tr: "Ay Tanrıçası", ad_en: "Moon Goddess", tur: "kostumlu", nad: "efsanevi", fiyat: 300, sahibim: true },
];
const url = (y) => `/avatars/pro2/${y.anahtar}.svg`;
const SAHIP_ESKI = new Set(["korsan-k19", "kristal-uzayli-y28"]);   // mevcut ücretlilerden ikisi de sahip gösterilir
const BEKLENEN_SAHIP = 4;
const RENK = { epik: "#8b2fd6", efsanevi: "#f5c431", nadir: "#3fae6a" };

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const b = await tarayici.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
let dil = "tr";
await b.addInitScript(() => { try { localStorage.setItem("bildim_tanitim", "1"); } catch { /* yok */ } });
const s = await b.newPage();
const konsol = [];
s.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 200)); });
s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
await s.route(/\/rest\/v1\/(profiles|rpc)/, async (r) => {
  const u = r.request().url();
  try {
    if (r.request().method() !== "GET" && /\/rpc\/(avatar_onayla|avatar_satin_al|kozmetik_satin_al|kozmetik_tak|bp_)/.test(u)) return r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "Ölçüm aracı: yazma kapalı" }) });
    const y = await r.fetch();
    let m = (await y.text()).replace(/"dil":\s*"(tr|en)"/g, `"dil":"${dil}"`);
    if (u.includes("/rpc/avatar_sahiplik_durumu")) {
      const d = JSON.parse(m);
      const ek = YENI.filter((x) => x.fiyat).map((x, i) => ({ url: url(x), anahtar: x.anahtar, nadirlik: x.nad, fiyat: x.fiyat, sahibim: x.sahibim, satilik: true, sira: 100 + i }));
      m = JSON.stringify([...d.map((x) => (SAHIP_ESKI.has(x.anahtar) ? { ...x, sahibim: true } : x)), ...ek]);
    } else if (u.includes("/rpc/avatar_katalogu_oyun")) {
      const d = JSON.parse(m);
      const sablon = d.find((x) => x.tur === "kostumlu") ?? d[0];
      m = JSON.stringify([...d, ...YENI.map((x, i) => ({ ...sablon, anahtar: x.anahtar, url: url(x), ad_tr: x.ad_tr, ad_en: x.ad_en, tur: x.tur, sira: 40 + i, kullanabilir: true, fiyat_elmas: 0 }))]);
    } else if (u.includes("/rpc/avatar_nadirlik_renkleri")) {
      m = JSON.stringify([...JSON.parse(m), ...YENI.map((x) => ({ url: url(x), nadirlik: x.nad }))]);
    }
    await r.fulfill({ response: y, body: m });
  } catch { try { await r.continue(); } catch { /* sayfa kapandı */ } }
});

let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const bekle = async (q, n = 1, sure = 25000) => { try { await s.waitForFunction(([a, c]) => document.querySelectorAll(a).length >= c, [q, n], { timeout: sure }); await s.waitForTimeout(700); return true; } catch { return false; } };

try {
  await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  await s.getByRole("button", { name: /Misafir olarak dene/i }).click({ timeout: 15000 });
  await s.waitForFunction(() => !document.body.innerText.includes("Misafir olarak dene"), null, { timeout: 60000 }).catch(() => {});
  await s.waitForTimeout(2500);
  for (const d of ["tr", "en"]) {
    dil = d;
    for (const [w, h] of [[390, 844], [390, 664], [360, 640]]) {
      const et = `${w}x${h}-${d}`;
      console.log(`\n== ${et}`);
      await s.setViewportSize({ width: w, height: h });
      await s.evaluate((x) => { try { localStorage.setItem("bildim_dil", x); } catch { /* yok */ } }, d);
      await s.goto(ADRES + "/joker?sekme=avatar", { waitUntil: "domcontentloaded" });
      await bekle(".qt-dc-oge", 8, 40000);
      await s.addStyleTag({ content: ".bd-modal-katman, .bd-tanitim-katman { display: none !important; }" });   // kurulum penceresi yalnız görüntüyü örter (ölçüm DOM üzerinden)
      const o = await s.evaluate(([yeni, d2]) => {
        const kartlar = [...document.querySelectorAll(".qt-dc-oge")];
        const bul = (ad) => kartlar.find((k) => k.querySelector(".qt-dc-ad")?.textContent.trim() === ad);
        const sahipEt = d2 === "en" ? "Owned" : "Sahip olunan";
        const sahipler = kartlar.filter((k) => k.querySelector(".qt-dc-sahip"));
        const kirpik = sahipler.filter((k) => { const e = k.querySelector(".qt-dc-sahip"); const r = e.getBoundingClientRect(), kr = k.getBoundingClientRect(); return e.scrollWidth > e.clientWidth + 1 || r.left < kr.left - 0.5 || r.right > kr.right + 0.5; }).length;
        const yeniOzet = yeni.map((y) => {
          const k = bul(d2 === "en" ? y.ad_en : y.ad_tr); if (!k) return { anahtar: y.anahtar, var: false };
          const img = k.querySelector("img"); const src = img?.getAttribute("src") ?? "";
          const dec = src.startsWith("data:") ? decodeURIComponent(src.split(",").slice(1).join(",")) : "";
          return { anahtar: y.anahtar, var: true, durum: k.querySelector(".qt-dc-durum")?.textContent.trim(), etiket: k.querySelector(".qt-dc-nadirlik")?.textContent ?? null,
            sahne: (dec.match(/<rect width="320" height="320" rx="38" fill="(#[0-9a-fA-F]+)"/) ?? [])[1] ?? (src.startsWith("data:") ? "?" : "ham-dosya") };
        });
        return { sahipEt, sahipSayi: sahipler.length, sahipMetin: [...new Set(sahipler.map((k) => k.querySelector(".qt-dc-sahip").textContent.trim()))],
          kirpik, tasma: document.documentElement.scrollWidth - window.innerWidth, yeniOzet,
          kucukHedef: kartlar.filter((k) => { const r = k.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length };
      }, [YENI, d]);
      ok("yatay taşma yok", o.tasma <= 0, String(o.tasma));
      ok(`"${o.sahipEt}" etiketi ${BEKLENEN_SAHIP} kartta (2 mevcut + 2 yeni)`, o.sahipSayi === BEKLENEN_SAHIP && o.sahipMetin.length === 1 && o.sahipMetin[0] === o.sahipEt, JSON.stringify([o.sahipSayi, o.sahipMetin]));
      ok("etiket kırpılmıyor, kartın dışına taşmıyor", o.kirpik === 0, String(o.kirpik));
      ok("dokunma hedefi ≥ 44 px", o.kucukHedef === 0, String(o.kucukHedef));
      const dukkanda = o.yeniOzet.filter((x) => x.var).map((x) => x.anahtar);
      ok("Dükkân'da yalnız 4 ücretli yeni avatar (ücretsiz Kovboy / Korkuluk profilde seçilir)", dukkanda.length === 4 && !dukkanda.includes("kovboy-y40") && !dukkanda.includes("korkuluk-y41"), JSON.stringify(dukkanda));
      ok("durumlar: Kurt Adam + Ay Tanrıçası sahip, Balkabağı + Güneş Kralı fiyatlı", o.yeniOzet.filter((x) => x.var).every((x) => (["kurt-adam-y42", "ay-tanricasi-y45"].includes(x.anahtar) ? x.durum === o.sahipEt : /\d/.test(x.durum))), JSON.stringify(o.yeniOzet));
      ok("Sahne rengi nadirlikten: Epik mor · Efsanevi altın", o.yeniOzet.filter((x) => x.var).every((x) => { const n = YENI.find((y) => y.anahtar === x.anahtar).nad; return x.sahne.toLowerCase() === RENK[n]; }), JSON.stringify(o.yeniOzet.map((x) => [x.anahtar, x.sahne, x.etiket])));
      await s.waitForTimeout(1500);   // tembel resimler
      await s.screenshot({ path: path.join(CIKTI, `dukkan-avatar-${et}.png`), fullPage: true });
    }
  }
} catch (e) {
  kaldi++; console.log("  ✗ BEKLENMEYEN HATA:", String(e).slice(0, 300));
  try { await s.screenshot({ path: path.join(CIKTI, "hata.png") }); } catch { /* yok */ }
}
const gercek = konsol.filter((k) => !/Ölçüm aracı|favicon|net::ERR_|Failed to load resource/.test(k));
ok("konsol hatası yok", gercek.length === 0, JSON.stringify(gercek.slice(0, 4)));
await tarayici.close();
console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı — sunucuya yazılmadı. Görüntüler: tasarim/avatar-1009/`);
process.exit(kaldi ? 1 : 0);
