// LİG SET A — "Defne ve Taç": onaylı WebGL'li Altın Lig çerçevesinin (premium/tur2/sanat.js › altinLigHalkasi)
// dilinden türetildi. Altın = oyundaki Altın Lig'in KENDİSİ (Cerceve2 "altinlig"); diğer dört lig aynı
// yapı taşlarıyla (bantlı metal halka, oyma kıvrımları, boncuk kenar, defne dalı, plaka, taç, taş) çizilir.
// Kademe ŞEKİLLE artar: Bronz (kısa dal + düz plaka) → Gümüş (yarım dal + tepe taşı + kurdele) → Altın
// (tam dal + üç uçlu taç) → Elmas (kristal dal + beş kristalli taç + yan kristaller) → Efsane (açık kanatlar +
// büyük taç + alev). Renk yalnız yardımcı. Metal tonları ortak paletten (METAL); altın isim sarısı.
import { kutup, f, K, METAL, TAS, cz, svg, P, yerlestir, cift, yildizYol, adres, kanatGrup } from "./araclar.js";

const duraklar = (d) => d.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("");
const lg = (id, d, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${duraklar(d)}</linearGradient>`;

/** Altın Lig'in gA/gB/gC bant dili, verilen metalin palet tonlarıyla. */
function defs(m) {
  return lg("gA", [[0, "#ffffff"], [0.18, m.acik], [0.42, m.orta], [0.6, m.koyu], [0.78, m.orta], [1, m.acik]])
    + lg("gB", [[0, m.acik], [0.5, m.orta], [1, m.koyu]])
    + lg("gC", [[0, m.acik], [1, m.koyu]], 0, 0, 1, 1)
    + lg("gE", [[0, METAL.efsane.acik], [0.45, METAL.efsane.orta], [1, METAL.efsane.koyu]], 0, 0, 1, 1)
    + lg("gL", [[0, METAL.altin.acik], [0.5, METAL.altin.orta], [1, METAL.altin.koyu]]);
}

function yay(r, a0, a1) {
  const [x0, y0] = kutup(r, a0);
  const [x1, y1] = kutup(r, a1);
  const b = ((((a1 - a0) % 360) + 360) % 360) > 180 ? 1 : 0;
  return `M${x0} ${y0}A${f(r)} ${f(r)} 0 ${b} 1 ${x1} ${y1}`;
}

/** Bantlı halka (Altın Lig'in altinHalka'sı; metal parametreli). */
function halka(m, { ic = 43, dis = 51.2, kw = 1.8, boncuk = true, oyma = true } = {}) {
  const orta = (ic + dis) / 2;
  const gen = dis - ic;
  let g = `<circle r="${f(orta)}" fill="none" stroke="url(#gA)" stroke-width="${f(gen)}"/>`
    + `<path d="${yay(orta + gen * 0.08, 110, 230)}" fill="none" stroke="${m.kenar}" stroke-width="${f(gen * 0.5)}" opacity=".3"/>`
    + `<path d="${yay(dis - 1.5, 285, 25)}" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".85"/>`
    + `<circle r="${f(dis + kw / 2 - 0.2)}" fill="none" stroke="${K}" stroke-width="${kw}"/>`
    + `<circle r="${f(ic)}" fill="none" stroke="${K}" stroke-width="${f(kw * 0.85)}"/>`;
  if (oyma) {
    for (let a = 0; a < 360; a += 20) {
      const [x, y] = kutup(orta, a + 10);
      g += `<path d="M-2.6 .6C-2 -1.6 0 -1.6 0 0S2 1.6 2.6 -.6" transform="translate(${x} ${y}) rotate(${a + 100})" fill="none" stroke="${m.kenar}" stroke-width=".55" stroke-linecap="round" opacity=".9"/>`;
    }
  }
  if (boncuk) {
    for (let a = 0; a < 360; a += 7.5) {
      const [x, y] = kutup(dis - 1.2, a);
      g += `<circle cx="${x}" cy="${y}" r=".95" fill="${m.acik}" stroke="${m.koyu}" stroke-width=".35"/>`;
    }
  }
  return g;
}

/** Defne dalı (Altın Lig'le aynı kurgu): adet yaprak çifti, alttan yukarı. yon 1 sağ, −1 sol. yaprak: "defne" | "kristal". */
function dal(yon, adet, m, tur = "defne", r0 = 55) {
  let g = "";
  const kok = [];
  const son = 10 + (adet + 0.4) * 16;
  for (let a = 10; a <= son; a += 6) kok.push(kutup(r0, 180 - yon * a));
  g += `<path d="${P(kok, false)}" fill="none" stroke="${K}" stroke-width="2.6" stroke-linecap="round"/><path d="${P(kok, false)}" fill="none" stroke="${m.koyu}" stroke-width="1.2" stroke-linecap="round"/>`;
  for (let i = 0; i < adet; i += 1) {
    const a = 180 - yon * (16 + i * 16);
    const s = 1.55 - i * 0.07;
    [[r0 + 3.4, 1], [r0 - 3.2, -1]].forEach(([r, d], j) => {
      if (j === 1 && i < 1) return;
      const [x, y] = kutup(r, a - yon * 3);
      const d0 = a + (j ? 180 : 0) + yon * 35 * d;
      const ic = tur === "kristal"
        ? `<path d="M0 3L2.6 -2L0 -9L-2.6 -2Z" fill="url(#gC)" ${cz(1)}/><path d="M0 3L0 -9L-2.6 -2Z" fill="#fff" opacity=".45"/>`
        : `<path d="M0 3C3 1 3.4 -4 0 -8C-3.4 -4 -3 1 0 3Z" fill="url(#gC)" ${cz(1)}/><path d="M0 2V-6" stroke="${m.kenar}" stroke-width=".6"/><path d="M-1.4 -1C-1.6 -3 -1.2 -5 0 -6.4" fill="none" stroke="#fff" stroke-width=".7" stroke-linecap="round" opacity=".85"/>`;
      g += `<g transform="translate(${x} ${y}) rotate(${f(d0)}) scale(${f(s)})">${ic}</g>`;
    });
  }
  return g;
}

/** Düz faset taş (palet renkleri; Altın Lig'in radyal taş dilinin düz karşılığı). */
function tas(x, y, r, renk, koyu, yuva = "url(#gB)") {
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r + 1.3)}" fill="${yuva}" ${cz(1)}/>`
    + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${renk}" ${cz(0.7)}/>`
    + `<path d="M${f(x - r)} ${f(y + r * 0.1)}A${f(r)} ${f(r)} 0 0 0 ${f(x + r * 0.75)} ${f(y + r * 0.65)}L${f(x)} ${f(y)}Z" fill="${koyu}"/>`
    + `<ellipse cx="${f(x - r * 0.34)}" cy="${f(y - r * 0.38)}" rx="${f(r * 0.28)}" ry="${f(r * 0.19)}" transform="rotate(-30 ${f(x - r * 0.34)} ${f(y - r * 0.38)})" fill="#fff"/>`;
}
const elmasTas = (x, y, s) => `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})">`
  + `<path d="M-5 -1.6L-2.8 -4.4H2.8L5 -1.6L0 5Z" fill="${METAL.elmas.orta}" ${cz(0.9)}/>`
  + `<path d="M-5 -1.6H5M-2.8 -4.4L-1.4 -1.6L0 5L1.4 -1.6L2.8 -4.4" fill="none" stroke="${K}" stroke-width=".5"/>`
  + `<path d="M-5 -1.6L-2.8 -4.4H0L-1.4 -1.6Z" fill="#fff"/><path d="M1.4 -1.6L0 5L5 -1.6Z" fill="${METAL.elmas.koyu}"/></g>`;

/** Alt plaka (Altın Lig'in plakası): kuyruk rengi, ortadaki işaret. */
function plaka({ gen = 21, kuyruk = null, isaret = "" }) {
  const k = kuyruk ? `<path d="M${-gen - 3} 52L${-gen - 9} 49L${-gen - 6} 56L${-gen - 9} 63L${-gen} 60ZM${gen + 3} 52L${gen + 9} 49L${gen + 6} 56L${gen + 9} 63L${gen} 60Z" fill="${kuyruk}" ${cz(1.2)}/>` : "";
  return k + `<path d="M${-gen} 50H${gen}L${gen + 2} 56L${gen} 62H${-gen}L${-gen - 2} 56Z" fill="url(#gA)" ${cz(1.4)}/>`
    + `<path d="M${-gen + 1.4} 52H${gen - 1.4}" stroke="#fff" stroke-width=".8" stroke-linecap="round" opacity=".85"/>` + isaret;
}
/**
 * KÜÇÜK BOY SİLUET SÜSÜ (≤ 48 px; düzeltme 1, 25 Eyl): kademe renkten bağımsız okunsun diye halkanın dışında,
 * kutunun KÖŞELERİNDE (daire ile kare arası boşluk; kutudan taşmaz). Bronz yalın · Gümüş alt köşelerde defne ·
 * Altın alt defne + üst yıldız (sanat.js › altinLigHalkasi) · Elmas dört köşede kristal · Efsane üstte kanat.
 */
export function koseDefne(m, aci = [135, 225], s = 1) {
  return aci.map((a) => {
    const yon = a < 180 ? 1 : -1;
    const yap = (don, L) => `<g transform="rotate(${don})"><path d="M0 0C3.6 ${-L * 0.3} 3.4 ${-L * 0.75} 0 ${-L}C-3.4 ${-L * 0.75} -3.6 ${-L * 0.3} 0 0Z" fill="${m.orta}" ${cz(1.9)}/><path d="M0 0C-3.6 ${-L * 0.3} -3.4 ${-L * 0.75} 0 ${-L}Z" fill="${m.acik}"/></g>`;
    return yerlestir(a, 51, yap(-26 * yon, 15) + yap(22 * yon, 12), s);
  }).join("");
}
export const koseYildiz = (renk, aci = [45, 315], r = 6.4) => aci.map((a) => {
  const [x, y] = kutup(58, a);
  return `<path d="${yildizYol(x, y, r)}" fill="${renk}" ${cz(1.6)}/>`;
}).join("");
const sevron = (y, renk) => `<path d="M-5 ${f(y + 2)}L0 ${f(y - 1.6)}L5 ${f(y + 2)}" fill="none" stroke="${K}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M-5 ${f(y + 2)}L0 ${f(y - 1.6)}L5 ${f(y + 2)}" fill="none" stroke="${renk}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`;
const yildizIsaret = (x, y, r, renk) => `<path d="${yildizYol(x, y, r)}" fill="${renk}" ${cz(1)}/>`;

// ---------------------------------------------------------------- BRONZ
function bronz(k) {
  const m = METAL.bronz;
  if (k === "kucuk") {
    return svg(halka(m, { ic: 42, dis: 51, kw: 2.6, boncuk: false, oyma: false })
      + `<path d="M-13 43H13L14.6 47L13 50H-13L-14.6 47Z" fill="url(#gA)" ${cz(1.8)}/>` + sevron(46.2, "#fff"), defs(m));
  }
  return svg(dal(1, 3, m) + dal(-1, 3, m) + halka(m, { boncuk: false })
    + plaka({ gen: 15, isaret: sevron(55.4, m.kenar) }), defs(m));
}
// ---------------------------------------------------------------- GÜMÜŞ
function gumus(k) {
  const m = METAL.gumus;
  const tepe = (s) => `<g transform="scale(${s})"><path d="M-11 -45C-7 -51 -3 -54 0 -60C3 -54 7 -51 11 -45Z" fill="url(#gA)" ${cz(1.4)}/>`
    + `<path d="M-7.6 -47.4C-4.6 -50.6 -2 -52.6 0 -56" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round"/>`
    + tas(0, -50.5, 2.3, TAS.safir, TAS.safirKoyu) + `</g>`;
  if (k === "kucuk") {
    return svg(koseDefne(m) + halka(m, { ic: 42, dis: 51, kw: 2.6, boncuk: false, oyma: false }) + tepe(0.88)
      + `<path d="M-13 43H13L14.6 47L13 50H-13L-14.6 47Z" fill="url(#gA)" ${cz(1.8)}/>` + sevron(46.4, TAS.safir), defs(m));
  }
  return svg(dal(1, 5, m) + dal(-1, 5, m) + halka(m) + tepe(1)
    + plaka({ gen: 19, kuyruk: TAS.safir, isaret: sevron(53.8, m.kenar) + sevron(58.2, m.kenar) }), defs(m));
}
// ---------------------------------------------------------------- ELMAS
function elmas(k) {
  const m = METAL.elmas;
  const kris = (a, L, W, r = 50) => yerlestir(a, r, `<path d="M${-W} 2L${-W * 0.8} ${-L * 0.6}L0 ${-L}L${W * 0.8} ${-L * 0.6}L${W} 2Z" fill="url(#gB)" ${cz(1.3)}/>`
    + `<path d="M${-W} 2L${-W * 0.8} ${-L * 0.6}L0 ${-L}L0 2Z" fill="#fff" opacity=".55"/><path d="M${W * 0.35} 2L${W * 0.3} ${-L * 0.5}L0 ${-L}" fill="none" stroke="${m.kenar}" stroke-width=".6"/>`);
  if (k === "kucuk") {
    // kristaller köşelerde (üstte uzun, altta kısa) — kutudan taşmaz
    return svg(kris(45, 15, 4.8) + kris(315, 15, 4.8) + kris(135, 11, 4) + kris(225, 11, 4)
      + halka(m, { ic: 42, dis: 51, kw: 2.6, boncuk: false, oyma: false }) + elmasTas(0, 46.6, 0.95), defs(m));
  }
  const tac = kris(-28, 14, 4.6) + kris(28, 14, 4.6) + kris(-14, 19, 5.2) + kris(14, 19, 5.2) + kris(0, 26, 6)
    + `<path d="M-19 -44.5C-10 -49.6 10 -49.6 19 -44.5L18 -41.4C10 -45.6 -10 -45.6 -18 -41.4Z" fill="url(#gA)" ${cz(1.3)}/>`
    + elmasTas(0, -47, 1.25);
  const yan = [90, 270].map((a) => kris(a - 12, 11, 3.6) + kris(a + 12, 11, 3.6) + kris(a, 15, 4.4)).join("");
  return svg(dal(1, 6, m, "kristal") + dal(-1, 6, m, "kristal") + yan + halka(m) + tac
    + plaka({ gen: 20, kuyruk: TAS.safir, isaret: elmasTas(0, 56, 1.05) }), defs(m));
}
// ---------------------------------------------------------------- EFSANE
function kanat(yon, buyuk) {
  // Açık kanat: 6 tüy, halkanın arkasında, yukarı-dışa; gölge tüyler koyu, uçlar pembe
  const e = METAL.efsane;
  let g = "";
  const n = buyuk ? 6 : 4;
  for (let i = n - 1; i >= 0; i -= 1) {
    const a = 58 + i * (buyuk ? 15 : 17);
    const L = (buyuk ? 30 : 20) + (i < 3 ? i * 4 : (n - i) * 3);
    const [x, y] = kutup(44, a);
    const tuy = `M-4 0C-6 ${-L * 0.4} -3 ${-L * 0.85} 1 ${-L}C5 ${-L * 0.8} 6 ${-L * 0.4} 4 0Z`;
    g += `<g transform="translate(${x} ${y}) rotate(${f(a - 8)})">`
      + `<path d="${tuy}" fill="url(#gE)" ${cz(1.3)}/>`
      + `<path d="M1 ${-L * 0.1}L1 ${-L * 0.85}" stroke="${e.kenar}" stroke-width=".8" opacity=".7"/>`
      + `<path d="M-2.6 ${-L * 0.25}C-3.8 ${-L * 0.5} -2.4 ${-L * 0.75} 0 ${-L * 0.9}" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".8"/>`
      + `</g>`;
  }
  return yon > 0 ? g : `<g transform="scale(-1 1)">${g}</g>`;
}
function efsane(k) {
  const m = METAL.efsane;
  const tac = (s = 1) => `<g transform="scale(${s})">`
    + `<path d="M-22 -44L-25 -61L-14 -53L-7 -68L0 -58L7 -68L14 -53L25 -61L22 -44Z" fill="url(#gL)" ${cz(1.5)}/>`
    + `<path d="M-21 -54L-23 -58.6M-8 -64L-6 -60.4M-14 -53.4L-13 -51" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round"/>`
    + `<rect x="-23" y="-48.6" width="46" height="6.6" rx="1.4" fill="url(#gL)" ${cz(1.3)}/>`
    + tas(0, -52, 3.4, TAS.ametist, TAS.ametistKoyu, "url(#gL)") + tas(-12.5, -45.3, 1.6, TAS.yakut, TAS.yakutKoyu, "url(#gL)") + tas(12.5, -45.3, 1.6, TAS.yakut, TAS.yakutKoyu, "url(#gL)")
    + `<circle cx="-25" cy="-62.4" r="2" fill="${METAL.altin.acik}" ${cz(0.9)}/><circle cx="25" cy="-62.4" r="2" fill="${METAL.altin.acik}" ${cz(0.9)}/>`
    + `<circle cx="-7" cy="-69.6" r="2.2" fill="${METAL.altin.acik}" ${cz(0.9)}/><circle cx="7" cy="-69.6" r="2.2" fill="${METAL.altin.acik}" ${cz(0.9)}/></g>`;
  if (k === "kucuk") {
    // köşe kanatları (kutunun köşelerinde; dairenin dışı), taç ve yıldız — kutudan taşmaz
    return svg(cift(kanatGrup({ n: 3, renk: { orta: "url(#gE)", acik: METAL.efsane.acik, koyu: METAL.efsane.koyu }, L: 20, W: 5, kok: 46, r: 43, yelpaze: [18, 78], ortu: false, kw: 1.6 })) + halka(m, { ic: 42, dis: 51, kw: 2.6, boncuk: false, oyma: false })
      + `<path d="M-12 -43L-13.4 -49.4L-6.4 -46.4L0 -51.6L6.4 -46.4L13.4 -49.4L12 -43Z" fill="url(#gL)" ${cz(1.6)}/>`
      + yildizIsaret(0, 46.4, 4.6, METAL.altin.acik), defs(m));
  }
  const buyuk = k === "tam";
  const plk = plaka({ gen: 22, kuyruk: TAS.ametist, isaret: yildizIsaret(-9, 56, 3, METAL.altin.acik) + yildizIsaret(0, 56, 3.8, METAL.altin.acik) + yildizIsaret(9, 56, 3, METAL.altin.acik) });
  return svg(cift(kanatGrup({ n: 6, renk: { orta: "url(#gE)", acik: METAL.efsane.acik, koyu: METAL.efsane.koyu }, L: buyuk ? 54 : 48, W: 8, kok: 68, r: 48, yelpaze: [26, 140] })) + dal(1, 5, METAL.altin) .replace(/url\(#gC\)/g, "url(#gL)") + dal(-1, 5, METAL.altin).replace(/url\(#gC\)/g, "url(#gL)")
    + halka(m) + tac(1) + plk, defs(m));
}

export const LIG_A = { bronz, gumus, elmas, efsane };
export const ligAAdres = (lig, k) => adres(`ligA:${lig}:${k}`, () => LIG_A[lig](k));

/** Efekt ayarları (tur2 motoru, grLig). Bronz durağan; Gümüş yalnız yansıma; üst ligler parıltı + toz / alev. */
export const LIG_A_EFEKT = {
  bronz: null,
  gumus: { a: [0.25, 0, 0, 1], n: [[0, -57, 3.2, 0.2], [...kutup(51, 300), 2.4, 0.7]] },
  elmas: { a: [0.55, 1, 1, 3], n: [[0, -73, 4.4, 0], [-14, -65, 3.2, 0.35], [14, -65, 3.2, 0.7], [0, -47, 3.6, 0.5], [...kutup(64, 90), 3, 0.15], [...kutup(64, 270), 3, 0.85], [0, 56, 3.6, 0.6]] },
  efsane: { a: [0.7, 1, 2, 4], olcek: 0.85, n: [[0, -52, 4.6, 0], [-7, -70, 3, 0.4], [7, -70, 3, 0.8], [0, 56, 4, 0.55], [-25, -62, 2.6, 0.2], [25, -62, 2.6, 0.65]] },
};
