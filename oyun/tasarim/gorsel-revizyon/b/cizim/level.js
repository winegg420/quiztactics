// LEVEL ÇERÇEVELERİ (25 · 50 · 75 · 100) — lig çerçeveleriyle KARIŞMASIN diye farklı şekil dili:
// lig = yuvarlak halka + süs (defne, taç, kanat); level = KÖŞELİ, KALIN, faset (pahlı) gövde + büyük rakam plakası.
// Renk metal değil sahne tonları (LEVEL: turkuaz → safir → ametist → yakut+altın). Düz dolgu, faset başına tek ton
// (ışık sol üstten: sol-üst yüzler açık, sağ-alt yüzler koyu), kalın #0b1220 kontur, tek beyaz parlama.
// Set A "Altıgen Madalya" · Set B "Pahlı Kare" · iç (elenen) C "Dişli" · D "Tırtıklı Mühür".
import { kutup, f, K, METAL, TAS, KREM, cz, svg, P, yerlestir, yildiz, tas, adres } from "./araclar.js";
import { LEVEL } from "../../palet.js";

export const LEVEL_SIRA = ["25", "50", "75", "100"];
const RENK = { 25: LEVEL.turkuaz, 50: LEVEL.safir, 75: LEVEL.ametist, 100: LEVEL.yakut };
const A = METAL.altin;

// ---------------------------------------------------------------- çizgi rakam yazısı (6 × 10 birim kutu)
const RAKAM = {
  0: "M0 2.6Q0 0 3 0Q6 0 6 2.6V7.4Q6 10 3 10Q0 10 0 7.4Z",
  1: "M1.2 2.4L3.6 0V10",
  2: "M0.2 2.4Q0.6 0 3 0Q6 0 6 2.8Q6 4.6 3.8 6.2L0 10H6",
  5: "M5.8 0H0.8L0.3 4.6Q1.4 3.7 3 3.7Q6 3.7 6 6.9Q6 10 3 10Q0.9 10 0 8.6",
  7: "M0 0H6L2.2 10",
};
/** Rakamlar ortalanmış (x, y merkez), yükseklik h. Önce kalın lacivert kontur, üstte dolgu çizgisi. */
export function sayi(metin, x, y, h, dolgu = KREM) {
  const s = h / 10;
  const gen = metin.length * 6 + (metin.length - 1) * 2.6;
  const yol = [...metin].map((c, i) => `<path d="${RAKAM[c]}" transform="translate(${f(i * 8.6)} 0)"/>`).join("");
  const g = (renk, w) => `<g fill="none" stroke="${renk}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round">${yol}</g>`;
  return `<g transform="translate(${f(x - (gen * s) / 2)} ${f(y - 5 * s)}) scale(${f(s)})">${g(K, 4.4)}${g(dolgu, 2)}</g>`;
}

/** Faset gövde: dış çokgen (köşeler) ile iç daire (r) arası; her kenar yüzü ışığa göre tek ton. */
function fasetGovde(koseler, m, { r = 43, kw = 2.6, id = "m" } = {}) {
  const n = koseler.length;
  let yuz = "";
  for (let i = 0; i < n; i += 1) {
    const a = koseler[i];
    const b = koseler[(i + 1) % n];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    // yüz normali (dışa) · ışık (sol üst: −0,7, −0,7)
    const l = Math.hypot(mx, my) || 1;
    const d = (-(mx / l) - (my / l)) * 0.707;
    const ton = d > 0.35 ? m.acik : d < -0.35 ? m.koyu : m.orta;
    yuz += `<path d="M0 0L${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}Z" fill="${ton}"/>`;
  }
  const dis = P(koseler);
  const maske = `<mask id="${id}"><path d="${dis}" fill="#fff"/><circle r="${r}" fill="#000"/></mask>`;
  const govde = `<g mask="url(#${id})">${yuz}`
    // köşe sırtları (faset çizgileri)
    + koseler.map(([x, y]) => `<path d="M${f(x)} ${f(y)}L${f(x * 0.72)} ${f(y * 0.72)}" stroke="${m.kenar}" stroke-width=".9" opacity=".55"/>`).join("")
    + `</g>`;
  return { defs: maske, g: govde + `<path d="${dis}" fill="none" ${cz(kw)}/><circle r="${r}" fill="none" ${cz(kw * 0.9)}/>`
    + `<circle r="${r + 2.2}" fill="none" stroke="${m.kenar}" stroke-width="1" opacity=".6"/>` };
}
/** Yuvarlatılmış köşeli çokgen köşe listesi (köşe başına 3 nokta). */
function yuvarlat(koseler, k = 0.14) {
  const n = koseler.length;
  const o = [];
  for (let i = 0; i < n; i += 1) {
    const p = koseler[i];
    const a = koseler[(i + n - 1) % n];
    const b = koseler[(i + 1) % n];
    o.push([p[0] + (a[0] - p[0]) * k, p[1] + (a[1] - p[1]) * k]);
    o.push([p[0] * 0.985, p[1] * 0.985]);
    o.push([p[0] + (b[0] - p[0]) * k, p[1] + (b[1] - p[1]) * k]);
  }
  return o;
}
const cokgen = (n, R, don = 0) => Array.from({ length: n }, (_, i) => kutup(R, don + (i * 360) / n));

/** Rakam plakası: yuvarlak köşeli dikdörtgen + rakam. */
function plaka(metin, y, m, { gen = null, h = 15 } = {}) {
  const w = gen ?? (metin.length * 7.2 + 12);
  return `<rect x="${f(-w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${h}" rx="${f(h * 0.36)}" fill="${m.koyu}" ${cz(2)}/>`
    + `<path d="M${f(-w / 2 + 3)} ${f(y - h / 2 + 2.6)}H${f(w / 2 - 3)}" stroke="${m.orta}" stroke-width="2.2" stroke-linecap="round"/>`
    + sayi(metin, 0, y + 0.4, h * 0.62);
}
const percin = (x, y, r, m) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${m.acik}" ${cz(0.9)}/><circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.3)}" r="${f(r * 0.32)}" fill="#fff"/>`;

// ================================================================ SET A — Altıgen Madalya
function altigen(lv, k) {
  const m = RENK[lv];
  const kucuk = k === "kucuk";
  const R = kucuk ? 54 : 60;
  const kos = yuvarlat(cokgen(6, R, 0), 0.12);
  const ham = cokgen(6, R, 0);
  const g0 = fasetGovde(kos, m, { r: 43, kw: kucuk ? 3 : 2.6, id: "hx" });
  let arka = "";
  let on = "";
  if (lv === "100") {
    // altın ışın uçları (köşelerden) + altın iç bilezik
    ham.forEach(([x, y], i) => {
      const a = i * 60;
      const L = kucuk ? 8 : 16;
      arka += yerlestir(a, R - 4, `<path d="M-6 0L0 ${-L}L6 0Z" fill="${A.orta}"/><path d="M-6 0L0 ${-L}L0 0Z" fill="${A.acik}"/><path d="M-6 0L0 ${-L}L6 0Z" fill="none" ${cz(1.6)}/>`);
    });
    on += `<circle r="45.2" fill="none" stroke="${A.orta}" stroke-width="3.4"/><path d="M-33 -30A45 45 0 0 1 -8 -44.6" fill="none" stroke="${A.acik}" stroke-width="2"/>`
      + `<circle r="47" fill="none" ${cz(1.3)}/><circle r="43.4" fill="none" ${cz(1.8)}/>`;
  }
  if (lv !== "25") on += ham.map(([x, y]) => percin(x * 0.86, y * 0.86, kucuk ? 2.2 : 2.4, lv === "100" ? A : m)).join("");
  if (lv === "75" || lv === "100") {
    if (!kucuk) {
      // yan kanat bıçakları (düz kenarlardan dışa)
      const bicak = (s) => `<g transform="scale(${s} 1)"><path d="M50 -10L70 -4L74 0L70 4L50 10Z" fill="${m.orta}"/><path d="M50 -10L70 -4L74 0H50Z" fill="${m.acik}"/><path d="M50 -10L70 -4L74 0L70 4L50 10Z" fill="none" ${cz(2)}/><path d="M56 -6L66 -2.6" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></g>`;
      arka += bicak(1) + bicak(-1);
    }
    const sy = kucuk ? -47 : -64;
    on += yildiz(0, sy, kucuk ? 6 : 9, lv === "100" ? A : { acik: KREM, orta: m.acik, koyu: m.orta }, kucuk ? 1.4 : 1.6);
    if (lv === "100" && !kucuk) on += yildiz(-17, -58, 6, A, 1.3) + yildiz(17, -58, 6, A, 1.3);
  }
  if (!kucuk) on += plaka(lv, 58, lv === "100" ? { koyu: A.koyu, orta: A.orta } : m);
  // tek beyaz parlama (sol üst yüz)
  on += `<path d="M${f(-R * 0.62)} ${f(-R * 0.36)}L${f(-R * 0.36)} ${f(-R * 0.52)}" stroke="#fff" stroke-width="${kucuk ? 2.6 : 2.2}" stroke-linecap="round"/>`;
  return svg(arka + g0.g + on, g0.defs);
}

// ================================================================ SET B — Pahlı Kare
function kare(lv, k) {
  const m = RENK[lv];
  const kucuk = k === "kucuk";
  const S = kucuk ? 50 : 56;
  const pah = kucuk ? 12 : 14;
  const kos = [[-S + pah, -S], [S - pah, -S], [S, -S + pah], [S, S - pah], [S - pah, S], [-S + pah, S], [-S, S - pah], [-S, -S + pah]];
  const g0 = fasetGovde(kos, m, { r: 43, kw: kucuk ? 3 : 2.6, id: "kr" });
  let arka = "";
  let on = "";
  if (lv === "100") {
    // arkada 45° dönük altın kare → sekiz köşeli yıldız siluet
    const S2 = kucuk ? 0 : 66;
    if (S2) {
      const d = [[0, -S2 * 1.08], [S2 * 1.08, 0], [0, S2 * 1.08], [-S2 * 1.08, 0]];
      arka += `<path d="${P(d)}" fill="${A.orta}"/><path d="M0 ${f(-S2 * 1.08)}L${f(-S2 * 1.08)} 0L0 0Z" fill="${A.acik}"/><path d="M0 ${f(S2 * 1.08)}L${f(S2 * 1.08)} 0L0 0Z" fill="${A.koyu}"/><path d="${P(d)}" fill="none" ${cz(2.4)}/>`;
    }
  }
  const kose = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => [x * (S - pah * 0.62), y * (S - pah * 0.62)]);
  if (lv === "50") on += kose.map(([x, y]) => percin(x, y, kucuk ? 2.6 : 3, m)).join("");
  if (lv === "75" || lv === "100") {
    on += kose.map(([x, y], i) => tas(x, y, kucuk ? 2.6 : 3.2, i % 2 ? TAS.yakut : TAS.safir, i % 2 ? TAS.yakutKoyu : TAS.safirKoyu, 0.9, lv === "100" ? A : { orta: m.acik })).join("");
    if (!kucuk) {
      const sev = (y) => `<path d="M-12 ${y + 5}L0 ${y - 3}L12 ${y + 5}" fill="none" stroke="${K}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M-12 ${y + 5}L0 ${y - 3}L12 ${y + 5}" fill="none" stroke="${lv === "100" ? A.orta : m.acik}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
      on += sev(-64) + sev(-72);
    }
  }
  if (lv === "100") {
    on += `<circle r="45.2" fill="none" stroke="${A.orta}" stroke-width="3.4"/><path d="M-33 -30A45 45 0 0 1 -8 -44.6" fill="none" stroke="${A.acik}" stroke-width="2"/><circle r="47" fill="none" ${cz(1.3)}/><circle r="43.4" fill="none" ${cz(1.8)}/>`;
    if (kucuk) on += yildiz(0, -45, 6, A, 1.4);
  }
  if (!kucuk) on += plaka(lv, S + 1, lv === "100" ? { koyu: A.koyu, orta: A.orta } : m, { h: 16 });
  on += `<path d="M${f(-S + 4)} ${f(-S + pah + 6)}L${f(-S + pah + 4)} ${f(-S + 4)}" stroke="#fff" stroke-width="${kucuk ? 2.6 : 2.2}" stroke-linecap="round"/>`;
  // arka katman avatar dairesinin üstüne düşmesin
  const delik = `<mask id="kr2"><rect x="-85" y="-85" width="170" height="170" fill="#fff"/><circle r="43" fill="#000"/></mask>`;
  return svg(`<g mask="url(#kr2)">${arka}</g>` + g0.g + on, g0.defs + delik);
}

// ================================================================ İÇ C — Dişli
function disli(lv, k) {
  const m = RENK[lv];
  const kucuk = k === "kucuk";
  const n = 12;
  const kos = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i * 360) / n;
    kos.push(kutup(52, a - 11), kutup(kucuk ? 54 : 60, a - 6), kutup(kucuk ? 54 : 60, a + 6), kutup(52, a + 11));
  }
  const g0 = fasetGovde(kos, m, { r: 43, id: "ds" });
  return svg(g0.g + (kucuk ? "" : plaka(lv, 58, m)), g0.defs);
}
// ================================================================ İÇ D — Tırtıklı Mühür
function muhur(lv, k) {
  const m = RENK[lv];
  const kucuk = k === "kucuk";
  const kos = [];
  const n = 20;
  for (let i = 0; i < n * 2; i += 1) kos.push(kutup(i % 2 ? (kucuk ? 50 : 54) : (kucuk ? 54 : 60), (i * 180) / n));
  const g0 = fasetGovde(kos, m, { r: 43, id: "mh" });
  return svg(g0.g + (kucuk ? "" : plaka(lv, 58, m)), g0.defs);
}

const uretici = (fn) => Object.fromEntries(LEVEL_SIRA.map((lv) => [lv, (k) => fn(lv, k)]));
export const LEVEL_A = uretici(altigen);
export const LEVEL_B = uretici(kare);
export const LEVEL_C = uretici(disli);
export const LEVEL_D = uretici(muhur);
export const levelAdres = (set, lv, k) => adres(`lv${set}:${lv}:${k}`, () => ({ A: LEVEL_A, B: LEVEL_B, C: LEVEL_C, D: LEVEL_D })[set][lv](k));

/** Efekt: 25 durağan · 50 durağan · 75 yansıma + yıldız parıltısı · 100 dönen hüzme + parıltı + toz (tur2 motoru, grLig). */
export const LEVEL_EFEKT = {
  A: { 25: null, 50: null, 75: { a: [0.3, 0, 0, 7], n: [[0, -64, 4, 0]] },
    100: { a: [0.6, 1, 3, 6], n: [[0, -64, 5, 0], [-17, -58, 3.4, 0.4], [17, -58, 3.4, 0.75], ...[0, 120, 240].map((a, i) => [...kutup(74, a + 60), 3, 0.2 + i * 0.3])] } },
  B: { 25: null, 50: null, 75: { a: [0.3, 0, 0, 7], n: [[-39, -39, 3.2, 0], [39, 39, 3.2, 0.5]] },
    100: { a: [0.6, 1, 3, 6], n: [[0, -71, 5, 0], [71, 0, 3.6, 0.3], [-71, 0, 3.6, 0.6], [0, 71, 3.6, 0.85], [-39, -39, 3, 0.45]] } },
};
