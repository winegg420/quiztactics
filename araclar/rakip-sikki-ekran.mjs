// Rakibin şıkkı + Ort. cevap (1062) ekran ölçümü — YEREL test sahnesi (araclar/rakip-sikki-sahne), taklit veri, canlıya istek yok.
// 390×844 TR ve 360×780 EN: Klasik soru sonrası işaret (farklı / aynı / rakip cevapsız) · Ortak Hazine tur sonrası işaret ·
// maç sonu satırı (veri var / tek taraf / veri yok). Ölçer: yatay taşma · işaretten önce/sonra şık kutuları (kayma) ·
// işaret ekran içinde · satır metni. Çıktı: tasarim/rakip-sikki/*.png + olcum.json
// Kullanım: npm run dev -- --port 5193 (başka kabukta) · node araclar/rakip-sikki-ekran.mjs --adres=http://localhost:5193
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5193";
const CIKTI = path.resolve("tasarim/rakip-sikki");
fs.mkdirSync(CIKTI, { recursive: true });
const GORUNUMLER = [{ w: 390, h: 844, dil: "tr" }, { w: 360, h: 780, dil: "en" }];
const SAHNELER = ["klasik-farkli", "klasik-ayni", "klasik-yok", "kasa", "sonu-var", "sonu-tek", "sonu-yok"];

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const olcum = {};
const kutular = (s) => s.$$eval(".qt-sik", (l) => l.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.y), Math.round(r.width), Math.round(r.height)].join(","); }).join("|"));
// (x ölçülmez: yanlış şıkkın mevcut titreme animasyonu x ekseninde oynar, işaretle ilgisi yok)

try {
  for (const g of GORUNUMLER) {
    const b = await tarayici.newContext({ viewport: { width: g.w, height: g.h }, hasTouch: true, serviceWorkers: "block" });
    // Ağ: yalnız yerel geliştirme sunucusu; Supabase'e giden her istek kesilir (canlı yük YOK)
    await b.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: "null" }));
    for (const ad of SAHNELER) {
      const s = await b.newPage();
      const konsol = [];
      s.on("pageerror", (e) => konsol.push(String(e).slice(0, 200)));
      await s.goto(`${ADRES}/araclar/rakip-sikki-sahne/index.html?g=${ad}&dil=${g.dil}`, { waitUntil: "domcontentloaded" });
      const etiket = `${ad} ${g.w}x${g.h} ${g.dil}`;
      const o = {};
      if (ad.startsWith("klasik")) {
        await s.waitForSelector(".qt-sik--yanlis", { timeout: 8000 });
        const once = await kutular(s);
        await s.waitForTimeout(900);
        const sonra = await kutular(s);
        o.isaret = await s.locator(".qt-sik-ek").count();
        o.avatar = await s.locator(".qt-sik-ek > *").count();
        ok(`${etiket}: şıklar kaymadı`, once === sonra, `${once} → ${sonra}`);
        ok(`${etiket}: işaret sayısı`, o.isaret === (ad === "klasik-yok" ? 0 : 1), String(o.isaret));
        if (ad === "klasik-ayni") ok(`${etiket}: aynı şıkta iki avatar`, o.avatar === 2, String(o.avatar));
        if (ad === "klasik-farkli") {
          ok(`${etiket}: işaret doğru şıkta (B)`, await s.locator(".qt-sik-yuva").nth(1).locator(".qt-sik-ek").count() === 1);
          ok(`${etiket}: aria-label`, Boolean(await s.locator(".qt-sik-ek").getAttribute("aria-label")));
        }
      } else if (ad === "kasa") {
        await s.waitForSelector(".qt-sik-ek", { timeout: 8000 });
        o.isaret = await s.locator(".qt-sik-ek").count();
        ok(`${etiket}: işaret var`, o.isaret === 1);
      } else {
        await s.waitForSelector(".msk", { timeout: 8000 });
        await s.waitForTimeout(400); await s.locator(".msk").click({ position: { x: 5, y: 5 } }).catch(() => {});   // sahneyi sona atla
        await s.waitForTimeout(900);
        o.satir = await s.locator(".msk-ort-cevap").textContent().catch(() => null);
        const bek = { "sonu-var": g.dil === "en" ? "Avg. answer 6.2s · opponent 8.1s" : "Ort. cevap 6,2 sn · rakip 8,1 sn",
          "sonu-tek": g.dil === "en" ? "Avg. answer 5.5s" : "Ort. cevap 5,5 sn", "sonu-yok": null }[ad];
        ok(`${etiket}: satır "${bek}"`, (o.satir ?? null) === bek, String(o.satir));
      }
      const tasma = await s.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(`${etiket}: yatay taşma 0`, tasma === 0, String(tasma));
      if (o.isaret) {
        const r = await s.locator(".qt-sik-ek").first().boundingBox();
        ok(`${etiket}: işaret ekran içinde`, r && r.x >= 0 && r.x + r.width <= g.w && r.y >= 0, JSON.stringify(r));
      }
      ok(`${etiket}: sayfa hatası yok`, konsol.length === 0, konsol.join(" | "));
      o.tasma = tasma;
      olcum[etiket] = o;
      await s.screenshot({ path: path.join(CIKTI, `${ad}-${g.w}x${g.h}-${g.dil}.png`) });
      await s.close();
    }
    await b.close();
  }
} finally {
  await tarayici.close();
  fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(olcum, null, 2));
  console.log(`\n${gecti} geçti · ${kaldi} kaldı`);
  process.exit(kaldi ? 1 : 0);
}
