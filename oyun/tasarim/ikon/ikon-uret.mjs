// Uygulama ikonu ADAYLARI üreticisi — /ikon-onizleme için (yalnız önizleme; oyunun ikonu DEĞİŞMEZ).
// Çalıştır:  node oyun/tasarim/ikon/ikon-uret.mjs
// Her aday için public/ikon-aday/<ad>/ altına yazar:
//   ikon-tam.svg        tam kare (taşan zemin) — maskable kaynağı, önizlemedeki maskeler bunu kırpar
//   favicon.svg         yuvarlatılmış kare (köşeler saydam) — tarayıcı sekmesi
//   icon-192.png        "any" amaçlı, yuvarlatılmış kare, saydam köşe
//   icon-512.png        "any" amaçlı, yuvarlatılmış kare, saydam köşe
//   maskable-512.png    "maskable" amaçlı, tam kare (önemli çizim merkez %80 dairede)
//   apple-touch-icon.png 180 px, tam kare, opak (iOS köşeyi kendisi yuvarlar)
// PNG'ler Playwright ile SVG'nin ekran görüntüsü alınarak üretilir (yeni paket yok).
// Güvenli alan: 512'lik tuvalde merkez (256,256), yarıçap 204,8. Bütün ana çizim r ≤ 196 içinde.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "../../../node_modules/playwright-core/index.mjs";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const HEDEF = path.join(KOK, "public/ikon-aday");
const TARAYICI = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium";

// Resmi logonun Q'su (oyun/components/Logo.jsx — Q Logo Lab 03 Forward Pulse), 120'lik kutuda.
const Q_GOVDE = "M56 10C28 10 10 29 10 58s18 48 46 48c10 0 19-2 27-7l12 11h21L94 88c7-8 10-18 10-30 0-29-19-48-48-48Zm0 23c15 0 25 10 25 25S71 83 56 83 33 73 33 58s8-25 23-25Z";
const Q_KUYRUK = "m73 78 21 10 15 15H94L69 85Z";
// Q'yu 512 tuvalin ortasına yerleştirir (Logo.jsx'teki eğim korunur). Merkez (62,63) alınır: kuyruk ucu en uzak nokta (≈66 birim) → ölçek ≤ 2,8 güvenli alanda kalır.
const qYerlestir = (olcek, dy = 0) => `translate(256 ${256 + dy}) scale(${olcek}) translate(-62 -63) translate(7 -1) skewX(-7)`;

const ADAYLAR = {
  // 1) Resmi Q, açık gökyüzü zemin — logoya en sadık, sitenin tema rengiyle aynı aile.
  "q-nabiz": `
    <defs>
      <linearGradient id="z" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4F6FF"/><stop offset="1" stop-color="#A9DBFF"/></linearGradient>
      <radialGradient id="p" cx=".3" cy=".22" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="512" height="512" fill="url(#z)"/>
    <rect width="512" height="512" fill="url(#p)"/>
    <g transform="${qYerlestir(2.75, 10)}" fill="#0A1330" opacity=".2" fill-rule="evenodd"><path d="${Q_GOVDE}"/><path d="${Q_KUYRUK}"/></g>
    <g transform="${qYerlestir(2.75)}">
      <path d="${Q_GOVDE}" fill="#17213C" fill-rule="evenodd"/>
      <path d="${Q_KUYRUK}" fill="#FF6B2C"/>
    </g>`,

  // 2) Şeker Q — turuncu zemin, kabarık beyaz Q, lacivert kontur + dudak (oyunun düğme dili).
  "seker-q": `
    <defs>
      <linearGradient id="z" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFA05A"/><stop offset="1" stop-color="#FF6B2C"/></linearGradient>
      <radialGradient id="p" cx=".28" cy=".18" r=".55"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="512" height="512" fill="url(#z)"/>
    <rect width="512" height="512" fill="url(#p)"/>
    <g transform="${qYerlestir(2.58, 13)}" stroke-linejoin="round">
      <path d="${Q_GOVDE}" fill="#1D2152" stroke="#1D2152" stroke-width="7" fill-rule="evenodd"/>
      <path d="${Q_KUYRUK}" fill="#1D2152" stroke="#1D2152" stroke-width="7"/>
    </g>
    <g transform="${qYerlestir(2.58)}" stroke-linejoin="round">
      <path d="${Q_GOVDE}" fill="#FFFFFF" stroke="#1D2152" stroke-width="7" fill-rule="evenodd" paint-order="stroke fill"/>
      <path d="${Q_KUYRUK}" fill="#FFC933" stroke="#1D2152" stroke-width="7" paint-order="stroke fill"/>
      <path d="M30 40c6-10 16-17 28-19" fill="none" stroke="#DDEBFF" stroke-width="6" stroke-linecap="round"/>
    </g>
    <path d="M372 110l9 22 22 9-22 9-9 22-9-22-22-9 22-9z" fill="#FFF4CF"/>`,

  // 3) Soru balonu — mor zemin, beyaz konuşma balonu, turuncu soru işareti (quiz = soru-cevap).
  "soru-balonu": `
    <defs>
      <linearGradient id="z" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8A6BFF"/><stop offset="1" stop-color="#4F2FD6"/></linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#z)"/>
    <circle cx="96" cy="84" r="120" fill="#fff" opacity=".08"/>
    <g transform="translate(256 256) scale(.94) translate(-256 -256)">
    <path d="M150 124h212a52 52 0 0 1 52 52v126a52 52 0 0 1-52 52H236l-62 52v-52h-24a52 52 0 0 1-52-52V176a52 52 0 0 1 52-52Z"
      transform="translate(0 16)" fill="#1D2152"/>
    <path d="M150 124h212a52 52 0 0 1 52 52v126a52 52 0 0 1-52 52H236l-62 52v-52h-24a52 52 0 0 1-52-52V176a52 52 0 0 1 52-52Z"
      fill="#FFFFFF" stroke="#1D2152" stroke-width="14" stroke-linejoin="round"/>
    <path d="M214 204c0-26 19-42 44-42s44 16 44 38c0 30-40 32-40 62" fill="none" stroke="#1D2152" stroke-width="50" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M214 204c0-26 19-42 44-42s44 16 44 38c0 30-40 32-40 62" fill="none" stroke="#FF7A2E" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="262" cy="310" r="24" fill="#1D2152"/>
    <circle cx="262" cy="310" r="14" fill="#FF7A2E"/>
    </g>`,

  // 4) Dört şık — lacivert zemin, mod renklerinde 2×2 cevap karesi, biri doğru (tik).
  "dort-sik": `
    <defs>
      <radialGradient id="z" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#2F3585"/><stop offset="1" stop-color="#141843"/></radialGradient>
    </defs>
    <rect width="512" height="512" fill="url(#z)"/>
    ${[["#FF8A3D", "#C7560F", 122, 122], ["#6A48F5", "#4526C4", 266, 122], ["#FFC933", "#C28B00", 122, 266], ["#2FD27A", "#1C9A55", 266, 266]]
      .map(([r, d, x, y]) => `<rect x="${x}" y="${y + 12}" width="124" height="124" rx="30" fill="${d}"/><rect x="${x}" y="${y}" width="124" height="124" rx="30" fill="${r}"/>
      <rect x="${x + 16}" y="${y + 12}" width="56" height="16" rx="8" fill="#fff" opacity=".35"/>`).join("")}
    <path d="M298 330l24 24 44-50" fill="none" stroke="#0D2A1B" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" opacity=".35" transform="translate(0 5)"/>
    <path d="M298 330l24 24 44-50" fill="none" stroke="#FFFFFF" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>`,
};

const svg = (govde, yuvarlak) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${
  yuvarlak ? `<clipPath id="k"><rect width="512" height="512" rx="112"/></clipPath><g clip-path="url(#k)">${govde}</g>` : govde}</svg>\n`;

const tarayici = await chromium.launch({ executablePath: TARAYICI });
const sayfa = await tarayici.newPage();
async function png(icerik, boyut, dosya, saydam) {
  await sayfa.setViewportSize({ width: boyut, height: boyut });
  await sayfa.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${
    icerik.replace('width="512" height="512"', `width="${boyut}" height="${boyut}" style="display:block"`)}</body></html>`);
  await sayfa.screenshot({ path: dosya, omitBackground: saydam, clip: { x: 0, y: 0, width: boyut, height: boyut } });
}

try {
  for (const [ad, govde] of Object.entries(ADAYLAR)) {
    const klasor = path.join(HEDEF, ad);
    fs.mkdirSync(klasor, { recursive: true });
    const tam = svg(govde, false);
    const yuv = svg(govde, true);
    fs.writeFileSync(path.join(klasor, "ikon-tam.svg"), tam);
    fs.writeFileSync(path.join(klasor, "favicon.svg"), yuv);
    await png(yuv, 192, path.join(klasor, "icon-192.png"), true);
    await png(yuv, 512, path.join(klasor, "icon-512.png"), true);
    await png(tam, 512, path.join(klasor, "maskable-512.png"), false);
    await png(tam, 180, path.join(klasor, "apple-touch-icon.png"), false);
    console.log("yazıldı:", ad);
  }
} catch (e) {
  console.error("ikon üretimi başarısız:", e?.message ?? e);
  process.exitCode = 1;
} finally {
  await tarayici.close();
}
