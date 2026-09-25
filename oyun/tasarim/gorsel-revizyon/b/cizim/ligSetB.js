// LİG SET B — "Yükselen Kanat": stil rehberinin katı hâli — degradesiz düz dolgu + 2–3 ton hücre gölgesi,
// kalın #0b1220 kontur, ışık sol üstten, tek beyaz parlama. Kademe KANATLA büyür (0 → 3 → 5 → kristal → alevli 6 tüy)
// ve tepelik değişir (yok → yok → yıldız → taş → boynuzlu taç). Altta her ligde kurdele (işaret sayısı artar).
import { kutup, f, K, METAL, TAS, KREM, cz, svg, halkaDuz, yerlestir, cift, yildiz, tuy, kristal, tas, adres, kanatGrup } from "./araclar.js";

const perc = (m, r = 47, acilar = [45, 135, 225, 315], s = 1.5) => acilar.map((a) => {
  const [x, y] = kutup(r, a);
  return `<circle cx="${x}" cy="${y}" r="${s}" fill="${m.acik}" ${cz(0.8)}/>`;
}).join("");

/** Kurdele: orta şerit + çatal kuyruklar; işaret sayısı (0–3 yıldız / şerit). */
function kurdele(m, { gen = 18, y = 50, h = 10, yildizSay = 0, kuyruk = true, yr = 2.8 } = {}) {
  const alt = y + h;
  let g = "";
  if (kuyruk) {
    const kq = (s) => `<path d="M${s * gen * 0.8} ${y + 2}L${s * (gen + 9)} ${y + 3}L${s * (gen + 6)} ${y + h * 0.62}L${s * (gen + 10)} ${alt + 2}L${s * gen * 0.8} ${alt}Z" fill="${m.koyu}" ${cz(1.3)}/>`;
    g += kq(1) + kq(-1);
  }
  g += `<path d="M${-gen} ${y}Q0 ${y - 3} ${gen} ${y}L${gen} ${alt}Q0 ${alt - 3} ${-gen} ${alt}Z" fill="${m.orta}"/>`
    + `<path d="M${-gen} ${y}Q0 ${y - 3} ${gen} ${y}L${gen} ${y + h * 0.36}Q0 ${y + h * 0.36 - 3} ${-gen} ${y + h * 0.36}Z" fill="${m.acik}"/>`
    + `<path d="M${-gen} ${y}Q0 ${y - 3} ${gen} ${y}L${gen} ${alt}Q0 ${alt - 3} ${-gen} ${alt}Z" fill="none" ${cz(1.4)}/>`;
  const x0 = -(yildizSay - 1) * (yr * 2.4) / 2;
  for (let i = 0; i < yildizSay; i += 1) g += yildiz(x0 + i * yr * 2.4, y + h * 0.5 - 1, yr, METAL.altin, 0.8);
  return g;
}

/** Kanat: n tüy, sağ taraf (ayna ile sol). Tüy kökleri halkanın arkasında. */
function kanat(n, m, { L = 26, W = 5.6, a0 = 58, adim = 13, egim = -28, alevUc = false } = {}) {
  let g = "";
  for (let i = n - 1; i >= 0; i -= 1) {
    const a = a0 + i * adim;
    const Li = L * (1 - i * 0.09);
    const [x, y] = kutup(46, a);
    let ic = tuy(Li, W, m, 1.3, 0.22);
    if (alevUc) {
      // tüy ucu alev dili (turuncu → sarı), kontur ile
      ic += `<path d="M${f(Li * 0.22 - 3)} ${f(-Li + 2)}C${f(Li * 0.22 - 4)} ${f(-Li - 5)} ${f(Li * 0.22 + 1)} ${f(-Li - 8)} ${f(Li * 0.22 + 2)} ${f(-Li - 12)}C${f(Li * 0.22 + 5)} ${f(-Li - 6)} ${f(Li * 0.22 + 5)} ${f(-Li - 1)} ${f(Li * 0.22 + 2)} ${f(-Li + 2)}Z" fill="${METAL.altin.orta}" ${cz(1.1)}/>`
        + `<path d="M${f(Li * 0.22)} ${f(-Li)}C${f(Li * 0.22 - 0.6)} ${f(-Li - 3)} ${f(Li * 0.22 + 1)} ${f(-Li - 5)} ${f(Li * 0.22 + 1.6)} ${f(-Li - 7)}" fill="none" stroke="${METAL.altin.acik}" stroke-width="1.4" stroke-linecap="round"/>`;
    }
    g += `<g transform="translate(${x} ${y}) rotate(${f(a + egim)})">${ic}</g>`;
  }
  return g;
}
const kanatCift = (n, m, o) => cift(kanat(n, m, o));

const KUCUK = { ic: 41, dis: 49.5, kw: 2.8 };

// ---------------------------------------------------------------- BRONZ
function bronz(k) {
  const m = METAL.bronz;
  if (k === "kucuk") return svg(halkaDuz({ m, ...KUCUK }) + perc(m, 45.2, [45, 135, 225, 315], 1.6) + kurdele(m, { gen: 11, y: 42, h: 7.4, kuyruk: false }));
  const kulak = (s) => `<g transform="scale(${s} 1)"><path d="M49 -9H56Q60 -9 60 -5V5Q60 9 56 9H49Z" fill="${m.orta}"/><path d="M49 -9H56Q60 -9 60 -5V-1H49Z" fill="${m.acik}"/><path d="M49 -9H56Q60 -9 60 -5V5Q60 9 56 9H49Z" fill="none" ${cz(1.8)}/><circle cx="55" cy="2" r="1.6" fill="${m.koyu}" ${cz(0.7)}/></g>`;
  return svg(kulak(1) + kulak(-1) + halkaDuz({ m, kw: 2.4 }) + perc(m) + kurdele(m, { gen: 16, kuyruk: false }));
}
// ---------------------------------------------------------------- GÜMÜŞ
function gumus(k) {
  const m = METAL.gumus;
  if (k === "kucuk") {
    return svg(cift(kanatGrup({ n: 2, renk: m, L: 17, W: 5, kok: 48, r: 43, yelpaze: [30, 75], ortu: false, kw: 1.6 }))
      + halkaDuz({ m, ...KUCUK }) + kurdele(m, { gen: 12, y: 42, h: 7.4, kuyruk: false, yildizSay: 1, yr: 2.4 }));
  }
  return svg(cift(kanatGrup({ n: 3, renk: m, L: 34, W: 6.6, kok: 76, r: 48, yelpaze: [48, 118] })) + halkaDuz({ m, kw: 2.4 }) + perc(m, 47, [0, 180], 1.7)
    + kurdele(m, { gen: 18, yildizSay: 1 }));
}
// ---------------------------------------------------------------- ALTIN
function altin(k) {
  const m = METAL.altin;
  const tepe = (s, y) => `<g transform="translate(0 ${y}) scale(${s})"><path d="M-8 6L-5 -2H5L8 6Z" fill="${m.koyu}" ${cz(1.3)}/>${yildiz(0, -8, 9, m, 1.4)}</g>`;
  if (k === "kucuk") {
    return svg(cift(kanatGrup({ n: 3, renk: m, L: 19, W: 5, kok: 46, r: 43, yelpaze: [22, 80], ortu: false, kw: 1.6 })) + halkaDuz({ m, ...KUCUK })
      + tepe(0.62, -43) + kurdele(m, { gen: 12, y: 42, h: 7.4, kuyruk: false, yildizSay: 2, yr: 2.2 }));
  }
  return svg(cift(kanatGrup({ n: 5, renk: m, L: 44, W: 7.4, kok: 72, r: 48, yelpaze: [36, 132] })) + halkaDuz({ m, kw: 2.4 }) + tepe(1, -52)
    + kurdele(m, { gen: 19, yildizSay: 2 }));
}
// ---------------------------------------------------------------- ELMAS
function kristalKanat(n, m, { L = 26, kok = 68, r = 44, yelpaze = [16, 112], W = 5, kw = 1.3 } = {}) {
  let g = "";
  const [ox, oy] = kutup(r, kok);
  for (let i = n - 1; i >= 0; i -= 1) {
    const t = n === 1 ? 0 : i / (n - 1);
    const yon = yelpaze[0] + (yelpaze[1] - yelpaze[0]) * t;
    const Li = L * (1 - 0.5 * t);
    g += `<g transform="translate(${ox} ${oy}) rotate(${f(yon)})">${kristal(Li, W, m, kw)}</g>`;
  }
  return cift(g);
}
function elmas(k) {
  const m = METAL.elmas;
  const tepe = (s, y) => `<g transform="translate(0 ${y}) scale(${s})">`
    + `<g transform="rotate(-28) translate(0 -2)">${kristal(9, 3.4, m, 1.1)}</g><g transform="rotate(28) translate(0 -2)">${kristal(9, 3.4, m, 1.1)}</g>`
    + `<path d="M-8 -2L-5 -7H5L8 -2L0 9Z" fill="${m.orta}"/><path d="M-8 -2L-5 -7H0L-2.4 -2Z" fill="#fff"/><path d="M2.4 -2L0 9L8 -2Z" fill="${m.koyu}"/>`
    + `<path d="M-8 -2L-5 -7H5L8 -2L0 9ZM-8 -2H8" fill="none" ${cz(1.3)}/></g>`;
  if (k === "kucuk") {
    return svg(kristalKanat(3, m, { L: 19, kok: 46, r: 43, yelpaze: [22, 80], W: 4, kw: 1.5 }) + halkaDuz({ m, ...KUCUK })
      + `<g transform="translate(0 -44) scale(.62)"><path d="M-8 -2L-5 -7H5L8 -2L0 9Z" fill="${m.orta}"/><path d="M-8 -2L-5 -7H0L-2.4 -2Z" fill="#fff"/><path d="M2.4 -2L0 9L8 -2Z" fill="${m.koyu}"/><path d="M-8 -2L-5 -7H5L8 -2L0 9ZM-8 -2H8" fill="none" ${cz(1.8)}/></g>`
      + kurdele(m, { gen: 12, y: 42, h: 7.4, kuyruk: false, yildizSay: 3, yr: 1.9 }));
  }
  return svg(kristalKanat(6, m, { L: 46, W: 6, kok: 72, r: 48, yelpaze: [34, 132] }) + halkaDuz({ m, kw: 2.4 })
    + [30, 150, 210, 330].map((a) => yerlestir(a, 50, kristal(8, 3, m, 1))).join("")
    + tepe(1.35, -55) + kurdele(m, { gen: 20, yildizSay: 3 }));
}
// ---------------------------------------------------------------- EFSANE
const alevUcu = (L, W) => `<path d="M${f(-W * 0.66)} ${f(-L * 0.66)}C${f(-W * 0.6)} ${f(-L * 0.88)} ${f(-W * 0.32)} ${f(-L * 0.97)} 0 ${f(-L)}C${f(W * 0.62)} ${f(-L * 0.9)} ${f(W * 0.82)} ${f(-L * 0.78)} ${f(W * 0.78)} ${f(-L * 0.62)}Q0 ${f(-L * 0.74)} ${f(-W * 0.66)} ${f(-L * 0.66)}Z" fill="${METAL.altin.orta}"/>`
  + `<path d="M${f(-W * 0.4)} ${f(-L * 0.74)}C${f(-W * 0.36)} ${f(-L * 0.86)} ${f(-W * 0.2)} ${f(-L * 0.93)} ${f(-W * 0.02)} ${f(-L * 0.95)}" fill="none" stroke="${METAL.altin.acik}" stroke-width="${f(W * 0.3)}" stroke-linecap="round"/>`;
function efsane(k) {
  const m = METAL.efsane;
  const boynuz = (s) => `<g transform="scale(${s} 1)"><path d="M6 -46C12 -52 16 -60 14 -72C22 -62 22 -50 13 -42Z" fill="${m.orta}"/><path d="M6 -46C12 -52 16 -60 14 -72C15 -60 12 -52 9 -47Z" fill="${m.acik}"/><path d="M6 -46C12 -52 16 -60 14 -72C22 -62 22 -50 13 -42Z" fill="none" ${cz(1.4)}/></g>`;
  const tac = `<path d="M-15 -44L-17 -56L-8 -50L0 -62L8 -50L17 -56L15 -44Z" fill="${METAL.altin.orta}"/><path d="M-15 -44L-17 -56L-8 -50L0 -62L0 -44Z" fill="${METAL.altin.acik}"/><path d="M-15 -44L-17 -56L-8 -50L0 -62L8 -50L17 -56L15 -44Z" fill="none" ${cz(1.5)}/>`
    + tas(0, -50, 3.2, TAS.ametist, TAS.ametistKoyu, 0.9, METAL.altin);
  if (k === "kucuk") {
    return svg(cift(kanatGrup({ n: 3, renk: m, L: 21, W: 5, kok: 44, r: 43, yelpaze: [14, 78], ortu: false, kw: 1.6 })) + halkaDuz({ m, ...KUCUK })
      + `<g transform="translate(0 3) scale(.72)">${boynuz(1) + boynuz(-1)}</g>`
      + `<g transform="translate(0 8.6) scale(.8)"><path d="M-10 -52L-11 -60L-5 -56L0 -63L5 -56L11 -60L10 -52Z" fill="${METAL.altin.orta}" ${cz(1.8)}/></g>`
      + kurdele(m, { gen: 12, y: 42, h: 7.4, kuyruk: false, yildizSay: 3, yr: 1.9 }));
  }
  return svg(cift(kanatGrup({ n: 7, renk: m, L: 54, W: 8, kok: 68, r: 48, yelpaze: [26, 142], uc: alevUcu })) + boynuz(1) + boynuz(-1) + halkaDuz({ m, kw: 2.4 })
    + perc(METAL.altin, 47, [45, 135, 225, 315], 1.8) + tac + kurdele(m, { gen: 21, yildizSay: 3 }));
}

export const LIG_B = { bronz, gumus, altin, elmas, efsane };
export const ligBAdres = (lig, k) => adres(`ligB:${lig}:${k}`, () => LIG_B[lig](k));
export const LIG_B_EFEKT = {
  bronz: null,
  gumus: { a: [0.2, 0, 0, 1], n: [[0, 55, 2.6, 0.3]] },
  altin: { a: [0.5, 1, 0, 2], n: [[0, -60, 5, 0], [...kutup(70, 60), 3, 0.3], [...kutup(70, 300), 3, 0.7], [0, 55, 3, 0.5]] },
  elmas: { a: [0.55, 1, 1, 3], n: [[0, -60, 5.4, 0], [...kutup(74, 55), 3.4, 0.35], [...kutup(74, 305), 3.4, 0.75], [...kutup(54, 30), 2.4, 0.5], [...kutup(54, 330), 2.4, 0.1]] },
  efsane: { a: [0.75, 1, 2, 4], olcek: 0.85, n: [[0, -50, 4.6, 0], [...kutup(80, 50), 3.4, 0.3], [...kutup(80, 310), 3.4, 0.7], [14, -72, 2.6, 0.5], [-14, -72, 2.6, 0.9]] },
};
export { KREM, K };
