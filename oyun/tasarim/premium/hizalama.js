// PREMIUM HİZALAMA (görsel revizyon Bölüm 13, Ida: 7 çerçeve + 6 arka planın hepsi GİRSİN — 25 Eyl 2026).
// SVG + CSS premium çerçevelerin (Sonbahar, Galaksi, Sakura) üstüne stil rehberi katmanı: kalın #0b1220 dış/iç kontur
// (avatar kontur oranı) + tek beyaz parlama; 48 px ve altında kaybolan kimlik için tek imza süsü (yaprak / gezegen /
// çiçek). Çizimin kendisi ve anahtarlar (id) DEĞİŞMEDİ; bu katman PremiumCerceve'nin en üstüne biner.
// Birim: kutunun %1'i, merkez 0,0, tuval −85…85 (tur2/sanat.js ile aynı).
import { kutup, f } from "./cizim.jsx";

const K = "#0b1220";
export const HIZALI_CSS = new Set(["sonbahar", "galaksi", "sakura"]);

const cz = (w) => `stroke="${K}" stroke-width="${f(w)}" stroke-linejoin="round" stroke-linecap="round"`;
function yay(r, a0, a1) {
  const [x0, y0] = kutup(r, a0);
  const [x1, y1] = kutup(r, a1);
  return `M${x0} ${y0}A${f(r)} ${f(r)} 0 0 1 ${x1} ${y1}`;
}

/** 48 px ve altında kimliği taşıyan tek imza süsü (sol üst). */
function imza(cerceve) {
  const [x, y] = kutup(47, 318);
  if (cerceve === "sakura") {
    const yap = [0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-5.2" rx="3.6" ry="5.2" transform="rotate(${a})" fill="#ff7ab8" ${cz(1.3)}/>`).join("");
    return `<g transform="translate(${x} ${y}) scale(1.05)">${yap}<circle r="2.6" fill="#ffd23a" ${cz(1)}/><circle cx="-1.8" cy="-6.4" r="1" fill="#fff"/></g>`;
  }
  if (cerceve === "sonbahar") {
    const yol = "M0 -10L2.6 -5L6.8 -6.4L5.4 -1.8L9.2 0.4L4.4 2.4L5 6.4L0.8 4.4L0 9L-0.8 4.4L-5 6.4L-4.4 2.4L-9.2 0.4L-5.4 -1.8L-6.8 -6.4L-2.6 -5Z";
    return `<g transform="translate(${x} ${y}) rotate(-20)"><path d="${yol}" fill="#e0894a" ${cz(1.3)}/><path d="M0 9V-6" stroke="#7a3a12" stroke-width="1"/><path d="M-3 -4L-1 -7" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/></g>`;
  }
  // galaksi: halkalı gezegen
  return `<g transform="translate(${x} ${y})"><circle r="6.4" fill="#9d74f0" ${cz(1.3)}/><path d="M-6.4 0A6.4 6.4 0 0 0 5 4" fill="none" stroke="#6a45c8" stroke-width="2.4"/>`
    + `<ellipse rx="11" ry="3.2" transform="rotate(-20)" fill="none" stroke="${K}" stroke-width="3.2"/><ellipse rx="11" ry="3.2" transform="rotate(-20)" fill="none" stroke="#ffd23a" stroke-width="1.4"/>`
    + `<circle cx="-2.2" cy="-2.4" r="1.4" fill="#fff"/></g>`;
}

/** Hizalama katmanının SVG iç metni (kademe: "kucuk" | "orta" | "tam"). */
export function hizaKatmani(cerceve, kademe) {
  const kw = kademe === "kucuk" ? 3 : 2.4;
  return `<circle r="50.6" fill="none" ${cz(kw)}/><circle r="43.2" fill="none" ${cz(kw * 0.85)}/>`
    + `<path d="${yay(48.4, 300, 324)}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`
    + (kademe === "kucuk" ? imza(cerceve) : "");
}
