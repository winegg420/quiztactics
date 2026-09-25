// Ajan B çizim yardımcıları — SVG METNİ üretir (görünür <img> + WebGL dokusu aynı kaynak; tur2/sanat.js ile aynı yöntem).
// Birim: kutunun %1'i, merkez 0,0, y aşağı, tuval −85…85 (kutunun %170'i). Halka 43…51, avatar dairesi 43.
// Stil (A6): kalın #0b1220 kontur · düz dolgu + 2–3 ton hücre gölgesi · ışık SOL ÜSTTEN · tek beyaz parlama.
// Renkler YALNIZ ortak paletten (../../palet.js).
import { kutup, f, serit } from "../../../premium/cizim.jsx";
import { KONTUR as K, METAL, TAS, SAHNE, MARKA, KREM } from "../../palet.js";

export { kutup, f, K, METAL, TAS, SAHNE, MARKA, KREM };
export const cz = (w = 1.4, renk = K) => `stroke="${renk}" stroke-width="${f(w)}" stroke-linejoin="round" stroke-linecap="round"`;
export const svg = (govde, defs = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-85 -85 170 170">${defs ? `<defs>${defs}</defs>` : ""}${govde}</svg>`;
export const P = (pts, kapa = true) => pts.map((q, i) => `${i ? "L" : "M"}${f(q[0])} ${f(q[1])}`).join("") + (kapa ? "Z" : "");
export const don = (x, y, a) => { const c = Math.cos(a * Math.PI / 180); const s = Math.sin(a * Math.PI / 180); return [f(x * c - y * s), f(x * s + y * c)]; };
/** Yerel çizimi (yukarı = dışa) halkanın a açısına, r yarıçapına taşır. */
export const yerlestir = (a, r, ic, s = 1) => `<g transform="rotate(${f(a)}) translate(0 ${f(-r)}) scale(${f(s)})">${ic}</g>`;
export const ayna = (ic) => `<g transform="scale(-1 1)">${ic}</g>`;
/** Aynı çizim + yatay aynası (simetrik süsler). */
export const cift = (ic) => ic + ayna(ic);

/** Uçlarda incelen hilal şerit (hücre gölgesi / ışık bandı): a0→a1 arası, ortada en kalın. */
export function hilal(r, a0, a1, w) {
  const m = (a0 + a1) / 2;
  return serit(r, a0, m, 0.01, w, 14) + serit(r, m, a1, w, 0.01, 14);
}

/**
 * Düz halka — hücre gölgeli (degrade yok): orta ton bant, sağ-altta koyu hilal, sol-üstte açık hilal,
 * tek beyaz parlama vuruşu, dış + iç kalın kontur. m = METAL girdisi {acik, orta, koyu, kenar}.
 */
export function halkaDuz({ m, ic = 43, dis = 51, kw = 2.2, parlama = true, oluk = true }) {
  const orta = (ic + dis) / 2;
  const gen = dis - ic;
  let g = `<circle r="${f(orta)}" fill="none" stroke="${m.orta}" stroke-width="${f(gen)}"/>`;
  g += `<path d="${hilal(orta + gen * 0.12, 100, 260, gen * 0.78)}" fill="${m.koyu}"/>`;
  g += `<path d="${hilal(orta - gen * 0.1, 280, 400, gen * 0.52)}" fill="${m.acik}"/>`;
  if (oluk) g += `<circle r="${f(orta)}" fill="none" stroke="${m.kenar}" stroke-width="${f(Math.max(0.6, gen * 0.1))}" opacity=".55"/>`;
  if (parlama) g += `<path d="${yayYol(dis - gen * 0.3, 300, 322)}" fill="none" stroke="#fff" stroke-width="${f(gen * 0.2)}" stroke-linecap="round"/>`;
  g += `<circle r="${f(dis)}" fill="none" ${cz(kw)}/><circle r="${f(ic)}" fill="none" ${cz(kw * 0.85)}/>`;
  return g;
}
export function yayYol(r, a0, a1) {
  const [x0, y0] = kutup(r, a0);
  const [x1, y1] = kutup(r, a1);
  const buyuk = ((((a1 - a0) % 360) + 360) % 360) > 180 ? 1 : 0;
  return `M${x0} ${y0}A${f(r)} ${f(r)} 0 ${buyuk} 1 ${x1} ${y1}`;
}

/** Düz yaprak (defne): yerel 0,0 sap, uç −L; iki ton (açık yarım + orta) + damar. */
export function yaprak(L, W, m, kw = 1) {
  const d = `M0 0C${f(W)} ${f(-L * 0.3)} ${f(W * 0.8)} ${f(-L * 0.75)} 0 ${f(-L)}C${f(-W * 0.8)} ${f(-L * 0.75)} ${f(-W)} ${f(-L * 0.3)} 0 0Z`;
  const yarim = `M0 0C${f(-W)} ${f(-L * 0.3)} ${f(-W * 0.8)} ${f(-L * 0.75)} 0 ${f(-L)}Z`;
  return `<path d="${d}" fill="${m.orta}"/><path d="${yarim}" fill="${m.acik}"/>`
    + `<path d="M0 ${f(-L * 0.1)}L0 ${f(-L * 0.8)}" stroke="${m.koyu}" stroke-width="${f(W * 0.18)}" stroke-linecap="round"/>`
    + `<path d="${d}" fill="none" ${cz(kw)}/>`;
}

/** Beş köşeli yıldız yolu (r dış, ri iç). */
export function yildizYol(x, y, r, ri = r * 0.45, uc = 5, ilk = 0) {
  const pts = [];
  for (let i = 0; i < uc * 2; i += 1) {
    const rr = i % 2 ? ri : r;
    const a = ilk + (i * 180) / uc;
    const [px, py] = kutup(rr, a);
    pts.push([x + px, y + py]);
  }
  return P(pts);
}
/** Hücre gölgeli yıldız: açık sol yarı, orta sağ, kontur. */
export function yildiz(x, y, r, m, kw = 1.1, uc = 5) {
  const yol = yildizYol(x, y, r, r * 0.46, uc);
  return `<path d="${yol}" fill="${m.orta}"/>`
    + `<path d="${yildizYol(x - r * 0.08, y - r * 0.08, r * 0.62, r * 0.28, uc)}" fill="${m.acik}"/>`
    + `<path d="${yol}" fill="none" ${cz(kw)}/>`;
}
/** Faset taş (yuvarlak): kenar halkası + taş + üçgen faset + tek parlama. */
export function tas(x, y, r, renk, koyu, kw = 0.9, yuva = METAL.altin) {
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r + 1.2)}" fill="${yuva.orta}" ${cz(kw)}/>`
    + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${renk}" ${cz(kw * 0.8)}/>`
    + `<path d="M${f(x - r * 0.9)} ${f(y + r * 0.1)}A${f(r)} ${f(r)} 0 0 0 ${f(x + r * 0.7)} ${f(y + r * 0.7)}L${f(x)} ${f(y)}Z" fill="${koyu}"/>`
    + `<circle cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.38)}" r="${f(r * 0.28)}" fill="#fff"/>`;
}
/** Kristal parçası: yerel 0,0 taban, uç −L; iki yüz (açık sol / koyu sağ) + orta sırt. */
export function kristal(L, W, m, kw = 1.1) {
  const d = `M${f(-W)} 0L${f(-W * 0.8)} ${f(-L * 0.62)}L0 ${f(-L)}L${f(W * 0.8)} ${f(-L * 0.62)}L${f(W)} 0Z`;
  return `<path d="${d}" fill="${m.orta}"/>`
    + `<path d="M${f(-W)} 0L${f(-W * 0.8)} ${f(-L * 0.62)}L0 ${f(-L)}L0 0Z" fill="${m.acik}"/>`
    + `<path d="M${f(W)} 0L${f(W * 0.8)} ${f(-L * 0.62)}L0 ${f(-L)}L${f(W * 0.3)} ${f(-L * 0.55)}L${f(W * 0.35)} 0Z" fill="${m.koyu}"/>`
    + `<path d="${d}" fill="none" ${cz(kw)}/>`;
}
/** Tüy (kanat): yerel 0,0 kök, uç −L, hafif kavis; açık üst kenar + koyu alt kenar. */
export function tuy(L, W, m, kw = 1.1, kivrim = 0.25) {
  const k = L * kivrim;
  const d = `M${f(-W * 0.5)} 0C${f(-W)} ${f(-L * 0.4)} ${f(-W * 0.6 + k)} ${f(-L * 0.85)} ${f(k)} ${f(-L)}C${f(W * 0.9 + k * 0.6)} ${f(-L * 0.8)} ${f(W)} ${f(-L * 0.35)} ${f(W * 0.5)} 0Z`;
  return `<path d="${d}" fill="${m.orta}"/>`
    + `<path d="M${f(W * 0.5)} 0C${f(W)} ${f(-L * 0.35)} ${f(W * 0.9 + k * 0.6)} ${f(-L * 0.8)} ${f(k)} ${f(-L)}C${f(W * 0.3 + k)} ${f(-L * 0.7)} ${f(W * 0.35)} ${f(-L * 0.3)} ${f(W * 0.1)} 0Z" fill="${m.koyu}"/>`
    + `<path d="M${f(-W * 0.35)} ${f(-L * 0.12)}C${f(-W * 0.7)} ${f(-L * 0.45)} ${f(-W * 0.4 + k)} ${f(-L * 0.8)} ${f(k * 0.9)} ${f(-L * 0.93)}" fill="none" stroke="${m.acik}" stroke-width="${f(W * 0.32)}" stroke-linecap="round"/>`
    + `<path d="${d}" fill="none" ${cz(kw)}/>`;
}

/** Blob URL önbelleği (aynı anahtar tek kez). */
const onbellek = new Map();
export function adres(anahtar, uret) {
  let u = onbellek.get(anahtar);
  if (!u) {
    const metin = uret();
    try { u = URL.createObjectURL(new Blob([metin], { type: "image/svg+xml" })); }
    catch { u = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(metin)}`; }
    onbellek.set(anahtar, u);
  }
  return u;
}

/**
 * Gerçek kanat (sağ taraf; sol için ayna): tüyler TEK omuz noktasından yelpaze gibi açılır, üst üste biner;
 * kökleri örten örtü tüyü (kol) üstte. renk = { orta, acik, koyu } (düz renk ya da "url(#…)").
 * kok: omuz açısı (0 = tepe, saat yönü) · n: tüy sayısı · L: en uzun tüy · yelpaze: [ilk, son] tüy yönü (derece).
 */
export function kanatGrup({ n = 5, renk, L = 30, W = 6, kok = 62, r = 44, yelpaze = [18, 112], kw = 1.3, ortu = true, uc = null }) {
  const [ox, oy] = kutup(r, kok);
  let g = "";
  // alttan üste: alttaki tüy önce (üstteki üstüne biner)
  for (let i = n - 1; i >= 0; i -= 1) {
    const t = n === 1 ? 0 : i / (n - 1);
    const yon = yelpaze[0] + (yelpaze[1] - yelpaze[0]) * t;
    const Li = L * (1 - 0.5 * t);   // üst tüy en uzun: kanat yukarı-dışa süpürülür
    const d = `M${f(-W * 0.55)} 0C${f(-W * 0.9)} ${f(-Li * 0.45)} ${f(-W * 0.5)} ${f(-Li * 0.9)} 0 ${f(-Li)}C${f(W * 0.75)} ${f(-Li * 0.88)} ${f(W)} ${f(-Li * 0.42)} ${f(W * 0.55)} 0Z`;
    const golge = `M${f(W * 0.1)} ${f(-Li * 0.05)}C${f(W * 0.5)} ${f(-Li * 0.4)} ${f(W * 0.5)} ${f(-Li * 0.8)} 0 ${f(-Li)}C${f(W * 0.75)} ${f(-Li * 0.88)} ${f(W)} ${f(-Li * 0.42)} ${f(W * 0.55)} 0Z`;
    g += `<g transform="translate(${ox} ${oy}) rotate(${f(yon)})">`
      + `<path d="${d}" fill="${renk.orta}"/><path d="${golge}" fill="${renk.koyu}"/>`
      + `<path d="M${f(-W * 0.35)} ${f(-Li * 0.2)}C${f(-W * 0.55)} ${f(-Li * 0.5)} ${f(-W * 0.3)} ${f(-Li * 0.78)} ${f(-W * 0.05)} ${f(-Li * 0.9)}" fill="none" stroke="${renk.acik}" stroke-width="${f(W * 0.34)}" stroke-linecap="round"/>`
      + (uc ? uc(Li, W) : "")
      + `<path d="${d}" fill="none" ${cz(kw)}/></g>`;
  }
  if (ortu) {
    // omuz örtüsü: kökten üst tüy boyunca uzanan pürüzsüz kol; alt kenarı üç yuvarlak tüy ucu
    const yon = (yelpaze[0] + 22) * Math.PI / 180;
    const ux = Math.sin(yon); const uy = -Math.cos(yon);
    const nx = -uy; const ny = ux;   // yönün sağ-altı (dış)
    const Lk = L * 0.46; const Wk = W * 1.35;
    const nok = (a, b) => `${f(ox + ux * a + nx * b)} ${f(oy + uy * a + ny * b)}`;
    const yol = `M${nok(0, -Wk * 0.6)}Q${nok(Lk * 0.55, -Wk * 1.1)} ${nok(Lk, 0)}`
      + `Q${nok(Lk * 0.92, Wk * 0.9)} ${nok(Lk * 0.7, Wk * 0.7)}Q${nok(Lk * 0.6, Wk * 1.5)} ${nok(Lk * 0.38, Wk * 0.95)}`
      + `Q${nok(Lk * 0.25, Wk * 1.7)} ${nok(Lk * 0.05, Wk * 1.1)}Z`;
    const isik = `M${nok(Lk * 0.1, -Wk * 0.5)}Q${nok(Lk * 0.55, -Wk * 0.95)} ${nok(Lk * 0.9, -Wk * 0.05)}`;
    g += `<path d="${yol}" fill="${renk.orta}"/><path d="${isik}" fill="none" stroke="${renk.acik}" stroke-width="${f(W * 0.45)}" stroke-linecap="round"/><path d="${yol}" fill="none" ${cz(kw)}/>`;
  }
  return g;
}
