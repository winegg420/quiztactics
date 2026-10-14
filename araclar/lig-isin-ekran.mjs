// Ana sayfa profil kartı ışınları × 5 lig (+ ligsiz) — 390×844 ekran görüntüsü. Lig verisi TAKLİT (ana_sayfa_ozet /
// lig_grubum_ozet yanıtında yalnız `lig` değiştirilir), canlıya yazmaz. Çıktı: tasarim/lig-isin/<lig>.png + kart-<lig>.png
//   node araclar/lig-isin-ekran.mjs --adres=http://localhost:5199 --oturum=<dosya> --ornek=<lig_grubum_ozet örneği .json>
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "http://localhost:5199");
const ham = JSON.parse(fs.readFileSync(path.resolve(String(ARG.oturum)), "utf8"));
const ornek = JSON.parse(fs.readFileSync(path.resolve(String(ARG.ornek)), "utf8"));
const CIKTI = path.resolve("tasarim/lig-isin"); fs.mkdirSync(CIKTI, { recursive: true });
const t = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const lig of ["yok", "bronz", "gumus", "altin", "elmas", "efsane"]) {
    const b = await t.newContext({ storageState: { ...ham, origins: ham.origins.map((x) => ({ ...x, origin: new URL(ADRES).origin })) }, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: "block", locale: "tr-TR" });
    const s = await b.newPage();
    const veri = lig === "yok" ? null : { ...ornek, lig, satirlar: (ornek.satirlar ?? []).map((r) => ({ ...r, lig })) };
    await s.route(/\/rest\/v1\/rpc\/(ana_sayfa_ozet|lig_grubum_ozet)/, async (r) => {
      const y = await r.fetch();
      let g = await y.json().catch(() => null);
      if (r.request().url().includes("lig_grubum_ozet")) g = veri; else if (g && "lig_grubum_ozet" in g) g.lig_grubum_ozet = veri;
      await r.fulfill({ response: y, body: JSON.stringify(g) });
    });
    await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
    await s.waitForSelector(".as-ko", { timeout: 20000 }); await s.waitForTimeout(2500);
    const sinif = await s.locator(".as-ko").first().getAttribute("class");
    await s.screenshot({ path: path.join(CIKTI, `${lig}.png`) });
    await s.locator(".as-ko").first().screenshot({ path: path.join(CIKTI, `kart-${lig}.png`) });
    console.log(lig, "→", sinif);
    await b.close();
  }
} finally { await t.close(); }
