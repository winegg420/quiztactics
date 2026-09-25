// TURNUVA ŞAMPİYONU ÇERÇEVESİ — kupa/defne kimliği; Altın Lig'e (altın halka + altın defne + taç) BENZEMESİN:
// halka lacivert mine ya da kupanın kendisi, defne ZÜMRÜT yeşili, taç yok, kırmızı kurdele ve "1".
// A "Kupa Tepesi" · B "Kupanın İçinde" · iç (elenen) C "Kürsü" · D "Madalya Kurdelesi".
import { kutup, f, K, METAL, TAS, KREM, MARKA, SAHNE, cz, svg, halkaDuz, yaprak, yayYol, yildiz, cift, yerlestir, adres } from "./araclar.js";
import { ZUMRUT_TON } from "../../palet.js";
import { sayi } from "./level.js";

const A = METAL.altin;
const Z = ZUMRUT_TON;
const LAC = { acik: SAHNE.lacivert, orta: MARKA.lacivert, koyu: K, kenar: SAHNE.lacivert };
const KIR = { acik: "#ff8e9c", orta: TAS.yakut, koyu: TAS.yakutKoyu };

/** Kupa (yerel: merkez 0,0; yükseklik ~34). */
function kupa(s = 1) {
  const kulp = `M-11 -11C-21 -12 -21 2 -8.6 3.6M11 -11C21 -12 21 2 8.6 3.6`;
  return `<g transform="scale(${f(s)})">`
    + `<path d="${kulp}" fill="none" stroke="${K}" stroke-width="5.4" stroke-linecap="round"/><path d="${kulp}" fill="none" stroke="${A.koyu}" stroke-width="2.6" stroke-linecap="round"/>`
    + `<path d="M-13 -15H13V-6C13 4 7 9.5 0 9.5C-7 9.5 -13 4 -13 -6Z" fill="${A.orta}"/>`
    + `<path d="M-13 -15H-1V9.4C-7.6 9 -13 4 -13 -6Z" fill="${A.acik}"/>`
    + `<path d="M6 -15H13V-6C13 3 8 8.6 3 9.2C7 5 7 -2 6 -15Z" fill="${A.koyu}"/>`
    + `<path d="M-13 -15H13V-6C13 4 7 9.5 0 9.5C-7 9.5 -13 4 -13 -6Z" fill="none" ${cz(1.7)}/>`
    + `<rect x="-14.5" y="-17.6" width="29" height="4.2" rx="1.6" fill="${A.acik}" ${cz(1.5)}/>`
    + `<path d="M-3 9.4H3V14H-3Z" fill="${A.koyu}" ${cz(1.4)}/>`
    + `<path d="M-10 20H10L8 14H-8Z" fill="${A.orta}" ${cz(1.6)}/><path d="M-10.6 20H10.6V23H-10.6Z" fill="${A.koyu}" ${cz(1.4)}/>`
    + yildiz(0, -4, 5, { acik: "#fff", orta: KREM, koyu: A.acik }, 1.1)
    + `<path d="M-10 -10.6C-10 -4 -8.6 0 -6 3" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></g>`;
}

/** Zümrüt defne dalı: alttan yukarı; yon 1 sağ, −1 sol; bitiş açısı a1 (derece, tepe 0). */
function defne(yon, a1 = 40, r = 56, s = 1) {
  const kok = [];
  for (let a = 178; a >= a1; a -= 6) kok.push(kutup(r, yon > 0 ? a : 360 - a));
  const d = kok.map((q, i) => `${i ? "L" : "M"}${q[0]} ${q[1]}`).join("");
  let g = `<path d="${d}" fill="none" stroke="${K}" stroke-width="${f(3.4 * s)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${Z.koyu}" stroke-width="${f(1.6 * s)}" stroke-linecap="round"/>`;
  let i = 0;
  for (let a = 170; a >= a1 + 4; a -= 11) {
    const aa = yon > 0 ? a : 360 - a;
    const [x, y] = kutup(r, aa);
    const don = aa + (yon > 0 ? -1 : 1) * 50;   // yaprak ucu yukarı/dışa
    g += `<g transform="translate(${x} ${y}) rotate(${f(don + (i % 2 ? 180 + (yon > 0 ? -60 : 60) : 0))}) scale(${f(s)})">${yaprak(15, 5.6, Z, 1.3)}</g>`;
    i += 1;
  }
  return g;
}

/** Kırmızı kurdele + altın "1" madalyonu (alt). */
function birKurdele(y = 56, s = 1) {
  return `<g transform="translate(0 ${f(y)}) scale(${f(s)})">`
    + cift(`<path d="M4 -4L26 -6L21 1L27 8L4 6Z" fill="${KIR.koyu}" ${cz(1.5)}/><path d="M4 -4L22 -5.4L20 -1.6L4 -1Z" fill="${KIR.orta}"/>`)
    + `<circle r="10.4" fill="${A.orta}" ${cz(1.8)}/><path d="M-7.4 -6A10 10 0 0 1 6 -8" fill="none" stroke="${A.acik}" stroke-width="2.6" stroke-linecap="round"/>`
    + `<circle r="7" fill="none" stroke="${A.koyu}" stroke-width="1.2"/>` + sayi("1", 0.4, 0.4, 10, KREM) + `</g>`;
}

// ================================================================ A — Kupa Tepesi
function kupaTepesi(k) {
  if (k === "kucuk") {
    const yap = (s) => `<g transform="scale(${s} 1)"><g transform="translate(36 38) rotate(-40)">${yaprak(12, 4.6, Z, 1.4)}</g><g transform="translate(43 29) rotate(-20)">${yaprak(10, 4, Z, 1.4)}</g></g>`;
    return svg(yap(1) + yap(-1) + halkaDuz({ m: LAC, ic: 41, dis: 49.5, kw: 2.8 })
      + [45, 135, 225, 315].map((a) => { const [x, y] = kutup(45.2, a); return `<circle cx="${x}" cy="${y}" r="1.6" fill="${A.orta}" ${cz(0.8)}/>`; }).join("")
      // Düzeltme 3 (25 Eyl): kupa 40 px'te okunsun diye 0,5 → 0,9 (halkanın tepesine oturur, kutudan taşmaz)
      + `<g transform="translate(0 -38)">${kupa(0.9)}</g>`);
  }
  const civi = [30, 70, 110, 150, 210, 250, 290, 330].map((a) => { const [x, y] = kutup(47, a); return `<circle cx="${x}" cy="${y}" r="1.7" fill="${A.orta}" ${cz(0.8)}/>`; }).join("");
  return svg(defne(1, 36) + defne(-1, 36) + halkaDuz({ m: LAC, kw: 2.6 })
    + `<circle r="50" fill="none" stroke="${A.orta}" stroke-width="1.2"/>` + civi
    + `<g transform="translate(0 -68.6)">${kupa(0.92)}</g>` + birKurdele(55));
}

// ================================================================ B — Kupanın İçinde (avatar kupanın ağzında)
function kupaIci(k) {
  const kucuk = k === "kucuk";
  const m = A;
  if (kucuk) {
    const kulp = `M38 -34C50 -40 52 -26 46 -18`;
    return svg(`<path d="${kulp}" fill="none" stroke="${K}" stroke-width="6" stroke-linecap="round"/><path d="${kulp}" fill="none" stroke="${m.orta}" stroke-width="2.8" stroke-linecap="round"/>`
      + `<g transform="scale(-1 1)"><path d="${kulp}" fill="none" stroke="${K}" stroke-width="6" stroke-linecap="round"/><path d="${kulp}" fill="none" stroke="${m.orta}" stroke-width="2.8" stroke-linecap="round"/></g>`
      + halkaDuz({ m, ic: 41, dis: 49.5, kw: 2.8 })
      + `<path d="M-14 50H14L11 43H-11Z" fill="${KIR.orta}" ${cz(2)}/>`);
  }
  const kulp = `M44 -30C74 -40 80 12 48 22`;
  const kulpG = `<path d="${kulp}" fill="none" stroke="${K}" stroke-width="10" stroke-linecap="round"/><path d="${kulp}" fill="none" stroke="${m.orta}" stroke-width="6" stroke-linecap="round"/>`
    + `<path d="M50 -32C66 -36 72 -20 70 -8" fill="none" stroke="${m.acik}" stroke-width="2.2" stroke-linecap="round"/>`
    + `<path d="M64 8C60 16 54 20 48 22" fill="none" stroke="${m.koyu}" stroke-width="2.4" stroke-linecap="round"/>`;
  const ayak = `<path d="M-8 50H8L10 62H-10Z" fill="${m.orta}"/><path d="M-8 50H0V62H-10Z" fill="${m.acik}"/><path d="M-8 50H8L10 62H-10Z" fill="none" ${cz(2)}/>`
    + `<path d="M-30 74H30L26 62H-26Z" fill="${LAC.orta}"/><path d="M-26 62H26L27 65.4H-27Z" fill="${LAC.acik}"/><path d="M-30 74H30L26 62H-26Z" fill="none" ${cz(2.2)}/>`
    + `<rect x="-17" y="64.4" width="34" height="7.6" rx="2" fill="${m.orta}" ${cz(1.4)}/>` + yildiz(-9, 68.2, 2.6, { acik: KREM, orta: KREM, koyu: KREM }, 0.8) + yildiz(9, 68.2, 2.6, { acik: KREM, orta: KREM, koyu: KREM }, 0.8)
    + sayi("1", 0.2, 68.3, 6.6, KREM);
  // kupa gövdesi: halkanın altını saran yarım kase
  const kase = `<path d="M-51 0C-51 30 -30 52 0 52C30 52 51 30 51 0L45 0C45 26 26 45 0 45C-26 45 -45 26 -45 0Z" fill="${m.orta}"/>`
    + `<path d="M-51 0C-51 30 -30 52 0 52L0 45C-26 45 -45 26 -45 0Z" fill="${m.acik}" opacity=".7"/>`
    + `<path d="M51 0C51 30 30 52 0 52L0 48C24 47 44 30 45 0Z" fill="${m.koyu}"/>`
    + `<path d="M-51 0C-51 30 -30 52 0 52C30 52 51 30 51 0" fill="none" ${cz(2.2)}/>`;
  // kurdele: kupa karnında çapraz kırmızı şerit
  const kb = (w, renk, r = 48.6) => `<path d="${yayYol(r, 128, 232)}" fill="none" stroke="${renk}" stroke-width="${w}" stroke-linecap="butt"/>`;
  const serit = kb(7.2, K) + kb(4.6, KIR.orta) + kb(1.4, KIR.acik, 47.4);
  const yildizlar = yildiz(0, -63, 6.4, A, 1.4) + yildiz(-20, -57, 4.4, A, 1.2) + yildiz(20, -57, 4.4, A, 1.2);
  return svg(kulpG + `<g transform="scale(-1 1)">${kulpG}</g>` + ayak + halkaDuz({ m, ic: 43, dis: 52, kw: 2.6 }) + kase + serit + yildizlar);
}

// ================================================================ İÇ C — Kürsü
function kursu(k) {
  const kucuk = k === "kucuk";
  const b = `<path d="M-16 44H16V${kucuk ? 50 : 66}H-16Z" fill="${A.orta}" ${cz(2)}/><path d="M-40 54H-16V${kucuk ? 50 : 66}H-40ZM16 58H40V${kucuk ? 50 : 66}H16Z" fill="${METAL.gumus.orta}" ${cz(2)}/>`;
  return svg(b + halkaDuz({ m: LAC, ic: kucuk ? 41 : 43, dis: kucuk ? 49.5 : 51, kw: 2.6 }) + (kucuk ? "" : sayi("1", 0, 58, 9, KREM)));
}
// ================================================================ İÇ D — Madalya Kurdelesi
function madalya(k) {
  const kucuk = k === "kucuk";
  const v = `<path d="M-30 -40L-12 -80H4L-14 -40Z" fill="${KIR.orta}" ${cz(2)}/><path d="M30 -40L12 -80H-4L14 -40Z" fill="${TAS.safir}" ${cz(2)}/>`;
  return svg((kucuk ? "" : v) + halkaDuz({ m: A, ic: kucuk ? 41 : 43, dis: kucuk ? 49.5 : 51, kw: 2.6 }) + (kucuk ? "" : birKurdele(55)));
}

export const TURNUVA = { a: kupaTepesi, b: kupaIci, c: kursu, d: madalya };
export const turnuvaAdres = (t, k) => adres(`tr:${t}:${k}`, () => TURNUVA[t](k));
export const TURNUVA_EFEKT = {
  a: { a: [0.5, 1, 0, 5], n: [[0, -68, 5, 0], [0, 55, 4.2, 0.5], [-15, -78, 2.6, 0.3], [15, -78, 2.6, 0.8]] },
  b: { a: [0.55, 1, 3, 5], n: [[0, -63, 5.6, 0], [-20, -57, 3.4, 0.35], [20, -57, 3.4, 0.7], [...kutup(64, 90), 3, 0.5], [...kutup(64, 270), 3, 0.15], [0, 68, 3.6, 0.6]] },
  c: null, d: null,
};
