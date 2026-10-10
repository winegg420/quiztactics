// Ekran revizyonu Aşama 1 — /ekran-revizyon-onizleme ekran görüntüleri (360 + 390 px, TR + EN).
// Yerel, Supabase'siz geliştirme sunucusuna karşı koşar (sunucuya istek atmaz):
//   VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite --port 5199
//   node araclar/ekran-revizyon-ekran.mjs [--adres=http://localhost:5199]
// Çıktı: tasarim/ekran-revizyon/onizleme-<genişlik>-<dil>[-<bölüm>].png
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const adres = (process.argv.find((a) => a.startsWith("--adres="))?.slice(8)) || "http://localhost:5199";
const KLASOR = "tasarim/ekran-revizyon";
mkdirSync(KLASOR, { recursive: true });

const tarayici = await chromium.launch({ channel: "chrome" });
try {
  for (const dil of ["tr", "en"]) {
    for (const w of [360, 390]) {
      const sayfa = await tarayici.newPage({ viewport: { width: w, height: 800 }, deviceScaleFactor: 1 });
      const hatalar = [];
      sayfa.on("pageerror", (e) => hatalar.push(e.message));
      await sayfa.addInitScript((d) => { try { localStorage.setItem("bildim_dil", d); } catch { /* yok */ } }, dil);
      await sayfa.goto(`${adres}/ekran-revizyon-onizleme`, { waitUntil: "networkidle" });
      await sayfa.waitForSelector(".er-sayfa");
      await sayfa.waitForTimeout(600);
      const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      await sayfa.screenshot({ path: `${KLASOR}/onizleme-${w}-${dil}.png`, fullPage: true });
      // Hatalarım boş hâli + Profil doğrudan Ayarlar
      if (w === 390) {
        await sayfa.getByRole("button", { name: dil === "tr" ? "Boş (hiç hatalı soru yok)" : "Empty (no missed questions)" }).click();
        await sayfa.locator("#hatalarim").screenshot({ path: `${KLASOR}/onizleme-${w}-${dil}-hatalarim-bos.png` });
        await sayfa.getByRole("button", { name: dil === "tr" ? "Ayarlar" : "Settings", exact: true }).first().click();
        await sayfa.locator("#profil").screenshot({ path: `${KLASOR}/onizleme-${w}-${dil}-profil-ayarlar.png` });
        // B yapışkan sekme: B telefonunu kaydır
        await sayfa.getByRole("button", { name: dil === "tr" ? "İstatistik" : "Stats", exact: true }).first().click().catch(() => {});
        await sayfa.evaluate(() => { const e = document.querySelectorAll("#profil .er-tel-ekran")[2]; if (e) e.scrollTop = 420; });
        await sayfa.waitForTimeout(200);
        await sayfa.locator("#profil").screenshot({ path: `${KLASOR}/onizleme-${w}-${dil}-profil-B-kaydirilmis.png` });
      }
      console.log(`${dil} ${w}px · yatay taşma ${tasma}px · sayfa hatası ${hatalar.length}${hatalar.length ? " → " + hatalar.join(" | ") : ""}`);
      await sayfa.close();
    }
  }
} finally {
  await tarayici.close();
}
