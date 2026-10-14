// ============================================================
// TANITIM GÖRSELLERİ → WEBP — tanitim-ham/*.png (araclar/tanitim-ekran.mjs) dosyalarını
// public/tanitim/*.webp yapar. Makinede cwebp/sharp yok ve yeni paket kurulmaz: Chrome'un
// kendi webp kodlayıcısı (canvas.toDataURL("image/webp")) kullanılır.
//
// Kullanım: node araclar/tanitim-webp.mjs [--dil=en]
// Ham görüntüler 390×844 @2x (780×1688). Tam ekranlar 585 px genişliğe (1,5x) indirilir;
// kırpmalar (öne çıkanlar) ham piksel koordinatıyla verilir.
// ============================================================
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const EK = ARG.dil === "en" ? "-en" : "";
const HAM = path.resolve("tanitim-ham");
const HEDEF = path.resolve("public/tanitim");
fs.mkdirSync(HEDEF, { recursive: true });

// ad → { kaynak, kirp?: [x, y, g, y], genislik }
const ISLER = [
  { ad: "klasik", kaynak: "klasik-soru", genislik: 585 },
  { ad: "duello", kaynak: "duello-soru", genislik: 585 },
  { ad: "hazine", kaynak: "kasa-karar", genislik: 585 },
  { ad: "turnuva", kaynak: "turnuva", genislik: 585 },
  { ad: "lig", kaynak: "lig", genislik: 585 },
  { ad: "siralama", kaynak: "lig-siralama", genislik: 585 },
  { ad: "podyum", kaynak: "lig-siralama", kirp: [0, 880, 780, 510], genislik: 640 },
  { ad: "sampiyon", kaynak: "lig-siralama", kirp: [0, 530, 780, 340], genislik: 640 },
  { ad: "davet",kaynak: "arkadaslar", kirp: [24, 540, 732, 380], genislik: 600 },
];

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const s = await tarayici.newPage();
try {
  for (const is of ISLER) {
    const dosya = path.join(HAM, `${is.kaynak}${EK}.png`);
    if (!fs.existsSync(dosya)) { console.log("  · yok:", path.relative(process.cwd(), dosya)); continue; }
    const veri = "data:image/png;base64," + fs.readFileSync(dosya).toString("base64");
    const { url, g, y } = await s.evaluate(async ({ veri, kirp, genislik }) => {
      const img = new Image();
      img.src = veri;
      await img.decode();
      const [kx, ky, kg, kyuk] = kirp ?? [0, 0, img.naturalWidth, img.naturalHeight];
      const g = genislik;
      const y = Math.round(kyuk * (genislik / kg));
      const c = document.createElement("canvas");
      c.width = g; c.height = y;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, kx, ky, kg, kyuk, 0, 0, g, y);
      return { url: c.toDataURL("image/webp", 0.82), g, y };
    }, { veri, kirp: is.kirp ?? null, genislik: is.genislik });
    const cikti = path.join(HEDEF, `${is.ad}${EK}.webp`);
    fs.writeFileSync(cikti, Buffer.from(url.split(",")[1], "base64"));
    console.log(`  ✓ ${path.relative(process.cwd(), cikti)}  ${g}×${y}  ${(fs.statSync(cikti).size / 1024).toFixed(0)} KB`);
  }
} finally {
  await tarayici.close();
}
