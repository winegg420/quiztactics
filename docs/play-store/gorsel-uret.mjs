// ============================================================
// PLAY STORE GÖRSELLERİ — docs/play-store/gorseller/ altına üretir.
//   · simge-512.png            512×512, 32 bit PNG (public/quiztactics-q-icon-1024.png'den)
//   · tanitim-1024x500-{tr,en}.png   feature graphic
//   · ekran-{n}-{ad}-{tr,en}.png     1080×1920 telefon ekran görüntüsü (9:16)
//
// Kaynak: tanitim-ham/*.png (araclar/tanitim-ekran.mjs çıktısı, 780×1688). Canlıya istek YOK —
// yalnız yerel dosyalar Chrome'da (playwright-core, channel chrome) çizilip PNG alınır.
// Play kuralı: ekran görüntüsünde uzun kenar ≤ 2× kısa kenar; ham 780×1688 (2,16) doğrudan
// yüklenemez, bu yüzden 9:16 zemine yerleştirilir.
//
// Kullanım (depo kökünden): node docs/play-store/gorsel-uret.mjs
// ============================================================
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const KOK = process.cwd();
const HAM = path.join(KOK, "tanitim-ham");
const HEDEF = path.join(KOK, "docs/play-store/gorseller");
fs.mkdirSync(HEDEF, { recursive: true });

const dataUrl = (dosya, tur = "image/png") => `data:${tur};base64,${fs.readFileSync(dosya).toString("base64")}`;
const FONT_BALOO = dataUrl(path.join(KOK, "public/fonts/baloo-2-latin-ext.woff2"), "font/woff2");
const FONT_BALOO_L = dataUrl(path.join(KOK, "public/fonts/baloo-2-latin.woff2"), "font/woff2");
const FONT_NUNITO = dataUrl(path.join(KOK, "public/fonts/nunito-latin-ext.woff2"), "font/woff2");
const FONT_NUNITO_L = dataUrl(path.join(KOK, "public/fonts/nunito-latin.woff2"), "font/woff2");
const IKON = dataUrl(path.join(KOK, "public/quiztactics-q-icon-1024.png"));

const STIL = `
@font-face{font-family:B;src:url(${FONT_BALOO_L}) format("woff2");font-weight:400 800}
@font-face{font-family:B;src:url(${FONT_BALOO}) format("woff2");font-weight:400 800}
@font-face{font-family:N;src:url(${FONT_NUNITO_L}) format("woff2");font-weight:200 1000}
@font-face{font-family:N;src:url(${FONT_NUNITO}) format("woff2");font-weight:200 1000}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
body{background:radial-gradient(120% 90% at 50% 0%,#5AA2F0 0%,#3D8CE8 45%,#2463B8 100%);color:#fff;font-family:N,sans-serif}
.nokta{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.13) 3px,transparent 3.5px);background-size:44px 44px}
`;

// Ekran görüntüleri: [ham dosya (TR), başlık TR, başlık EN]
const EKRANLAR = [
  { ad: "klasik", ham: "klasik-soru", tr: "Aynı sorular, aynı anda", en: "Same questions, same moment" },
  { ad: "duello", ham: "duello-soru", tr: "Düello: kontrolü al, 3 doğru yap", en: "Duel: take control, hit 3 in a row" },
  { ad: "hazine", ham: "kasa-karar", tr: "Ortak Hazine: doğru anda aç", en: "Shared Treasure: open it at the right moment" },
  { ad: "turnuva", ham: "turnuva", tr: "Günde beş turnuva", en: "Five tournaments a day" },
  { ad: "siralama", ham: "lig-siralama", tr: "Haftalık lig, yüksel ya da düş", en: "Weekly leagues: climb or drop" },
  { ad: "ana", ham: "ana", tr: "Tek ekranda bütün modlar", en: "Every mode on one screen" },
];

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
try {
  const sayfa = await tarayici.newPage({ deviceScaleFactor: 1 });

  async function ciz(html, g, y, dosya) {
    await sayfa.setViewportSize({ width: g, height: y });
    await sayfa.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${STIL}</style></head><body>${html}</body></html>`);
    await sayfa.evaluate(() => document.fonts.ready);
    await sayfa.screenshot({ path: path.join(HEDEF, dosya), type: "png", omitBackground: false });
    console.log("✓", dosya);
  }

  // 1) Simge 512×512 (Play: 32 bit PNG, ≤ 1 MB). Saydam kenar yok; ikonun kendisi.
  await ciz(`<img src="${IKON}" style="width:512px;height:512px;display:block">`, 512, 512, "simge-512.png");

  // 2) Tanıtım görseli 1024×500
  for (const dil of ["tr", "en"]) {
    const slogan = dil === "tr" ? "Bilgi yarışması · 1v1 · Turnuva · Lig" : "Trivia · 1v1 · Tournaments · Leagues";
    const alt = dil === "tr" ? "Arkadaşına meydan oku, ligde yüksel." : "Challenge friends, climb the league.";
    await ciz(`
      <div class="nokta"></div>
      <div style="position:absolute;inset:0;display:flex;align-items:center;gap:44px;padding:0 64px">
        <img src="${IKON}" style="width:250px;height:250px;border-radius:56px;box-shadow:0 18px 40px rgba(10,40,90,.35)">
        <div>
          <div style="font-family:B;font-weight:800;font-size:96px;line-height:.95;white-space:nowrap;text-shadow:0 6px 0 rgba(10,40,90,.25)">Quiz Tactics</div>
          <div style="font-weight:800;font-size:31px;margin-top:22px;opacity:.95;white-space:nowrap">${slogan}</div>
          <div style="font-weight:700;font-size:28px;margin-top:10px;opacity:.85">${alt}</div>
        </div>
      </div>`, 1024, 500, `tanitim-1024x500-${dil}.png`);
  }

  // 3) Telefon ekran görüntüleri 1080×1920
  for (const dil of ["tr", "en"]) {
    let n = 0;
    for (const e of EKRANLAR) {
      const dosya = path.join(HAM, `${e.ham}${dil === "en" ? "-en" : ""}.png`);
      if (!fs.existsSync(dosya)) { console.warn("! yok:", dosya); continue; }
      n += 1;
      await ciz(`
        <div class="nokta"></div>
        <div style="position:absolute;top:70px;left:60px;right:60px;text-align:center;font-family:B;font-weight:800;font-size:76px;line-height:1.05;text-shadow:0 5px 0 rgba(10,40,90,.25)">${e[dil]}</div>
        <img src="${dataUrl(dosya)}" style="position:absolute;left:50%;bottom:-40px;transform:translateX(-50%);height:1640px;border-radius:56px;border:10px solid #13305C;box-shadow:0 24px 60px rgba(10,40,90,.45)">
      `, 1080, 1920, `ekran-${n}-${e.ad}-${dil}.png`);
    }
  }
} finally {
  await tarayici.close();
}
