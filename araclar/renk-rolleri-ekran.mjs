// RENK ROLLERİ EKRAN TESTİ (7 Eki 2026) — sunucuya yazmaz, misafir oturumuyla gezer.
// Ölçer: yatay taşma, konsol hatası, mor (nadirlik/lig/joker dışı) dolgu; ekran görüntüsü alır.
// Kullanım: npm run dev (başka kabukta) → node araclar/renk-rolleri-ekran.mjs [--cikti=tasarim/renk-rolleri/sonra]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5173";
const CIKTI = path.resolve(ARG.cikti || "tasarim/renk-rolleri/sonra");
const OTURUM = ".arayuz-denetim-oturum.json";
const SAYFALAR = [["ana", "/"], ["modlar", "/modlar"], ["meydan", "/meydan"], ["arkadaslar", "/arkadaslar"], ["dukkan", "/joker"], ["profil", "/profil"], ["gorevler", "/gorevler"], ["sezon", "/sezon-yolu"], ["kasa", "/kasa"], ["duello", "/duello"]];
const BOYUTLAR = [[360, 640], [390, 844]];
const MOR_IZINLI = /qt-srozet|sy-kutu-cerceve|sy-sirada-yuva|qt-kp-|qt-av-bolum|nadir|epik|lg-|lig/;   // joker rozeti, nadirlik, lig
fs.mkdirSync(CIKTI, { recursive: true });
const st = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const origin = st.origins.find((o) => o.origin === new URL(ADRES).origin) || st.origins[0];
const t = await chromium.launch({ channel: "chrome", headless: true });
let top = 0, hata = 0;
for (const dil of ["tr", "en"]) for (const azalt of [false, true]) for (const [w, h] of BOYUTLAR) {
  const yerel = [...origin.localStorage.filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }];
  const b = await t.newContext({ viewport: { width: w, height: h }, reducedMotion: azalt ? "reduce" : "no-preference", storageState: { cookies: st.cookies, origins: [{ origin: origin.origin, localStorage: yerel }] } });
  for (const [ad, yol] of SAYFALAR) {
    const s = await b.newPage(); const konsol = [];
    s.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource|net::ERR|supabase|WebSocket/i.test(m.text())) konsol.push(m.text().slice(0, 100)); });
    s.on("pageerror", (e) => konsol.push("pageerror " + e.message.slice(0, 100)));
    try {
      await s.goto(ADRES + yol, { waitUntil: "domcontentloaded" }); await s.waitForTimeout(2200);
      await s.waitForFunction(() => !document.querySelector(".qt-sayfa-yukleniyor, #qt-ilk-yukleme"), null, { timeout: 10000 }).catch(() => {});   // tembel sayfa yükleyicisi kalksın
      const o = await s.evaluate((izin) => {
        const de = document.documentElement; const mor = [];
        const re = new RegExp(izin);
        for (const e of document.querySelectorAll("body *")) {
          const r = e.getBoundingClientRect(); if (r.width < 6 || r.height < 6) continue;
          const m = getComputedStyle(e).backgroundColor.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?/); if (!m || (m[4] !== undefined && +m[4] < 0.6)) continue;
          const [R, G, B] = [m[1], m[2], m[3]].map((x) => x / 255); const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn; if (d < 0.15 || mx < 0.2) continue;
          let hh = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; hh = (hh * 60 + 360) % 360;
          const cls = typeof e.className === "string" ? e.className : ""; const ata = e.closest("[class]")?.className || "";
          if (hh >= 262 && hh <= 320 && !re.test(cls) && !re.test(String(ata))) mor.push(cls.split(" ")[0]);
        }
        return { tasma: de.scrollWidth - de.clientWidth, mor: [...new Set(mor)].slice(0, 5) };
      }, MOR_IZINLI.source);
      await s.screenshot({ path: path.join(CIKTI, `${ad}-${w}x${h}-${dil}${azalt ? "-azalt" : ""}.png`) });
      top++;
      if (o.tasma > 1 || konsol.length || o.mor.length) { hata++; console.log("✗", ad, w + "x" + h, dil, azalt ? "azalt" : "", JSON.stringify({ ...o, konsol })); }
    } catch (e) { hata++; console.log("✗ HATA", ad, e.message.slice(0, 80)); }
    await s.close();
  }
  await b.close();
}
await t.close();
console.log(`${top - hata}/${top} temiz`); process.exit(hata ? 1 : 0);
