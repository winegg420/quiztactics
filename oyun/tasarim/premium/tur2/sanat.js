/**
 * TUR 2 ÇERÇEVE ÇİZİMLERİ — SVG metni üretir (görünür katman <img> + gölgelendirici dokusu aynı kaynak).
 * Birim: kutunun %1'i, merkez 0,0, y aşağı, tuval −85…85 (kutunun %170'i). Halka 43…51, avatar dairesi 43.
 * Çizim dili avatarlarla aynı: kalın koyu kontur (#0b1220), düz renk alanları, 2–3 ton gölge, beyaz parlama.
 * Kademe: "tam" (≥ 100 px; taşan süsler) · "orta" (49–99 px; ejderha kanadı küçük) · "kucuk" (≤ 48 px; yalnız halka + küçük vurgu, kutudan taşmaz).
 * Efekt noktaları (göz, ağız, mücevher, uç) buradan hesaplanır ve gölgelendiriciye aynen verilir.
 */
import { kutup, f, tohum, yay } from "../cizim.jsx";

export const K = "#0b1220";
const cz = (w = 1.4, renk = K) => `stroke="${renk}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const svg = (defs, govde) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-85 -85 170 170">${defs ? `<defs>${defs}</defs>` : ""}${govde}</svg>`;
const duraklar = (d) => d.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ""}/>`).join("");
const lg = (id, d, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${duraklar(d)}</linearGradient>`;
const rg = (id, d, cx = 0.5, cy = 0.5, r = 0.5) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${duraklar(d)}</radialGradient>`;
const P = (pts) => pts.map((q, i) => `${i ? "L" : "M"}${f(q[0])} ${f(q[1])}`).join("");
const dondur = (x, y, a) => { const c = Math.cos(a * Math.PI / 180); const s = Math.sin(a * Math.PI / 180); return [x * c - y * s, x * s + y * c]; };

/** Kalın katmanlı halka: dış kontur, degrade bant, üst-sol ışık, alt-sağ gölge, iç kontur. */
function halka({ bant, ic = 43, dis = 51, isik = 0.55, golge = 0.3, konturW = 1.8 }) {
  const orta = (ic + dis) / 2;
  const gen = dis - ic;
  return `<circle r="${f(orta)}" fill="none" stroke="url(#${bant})" stroke-width="${f(gen)}"/>`
    + `<path d="${yay(orta + gen * 0.08, 110, 230)}" fill="none" stroke="#000" stroke-width="${f(gen * 0.55)}" opacity="${golge}"/>`
    + `<path d="${yay(dis - 1.5, 285, 25)}" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity="${isik}"/>`
    + `<path d="${yay(ic + 1.3, 300, 350)}" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity="${isik * 0.6}"/>`
    + `<circle r="${f(dis + konturW / 2 - 0.2)}" fill="none" stroke="${K}" stroke-width="${konturW}"/>`
    + `<circle r="${f(ic)}" fill="none" stroke="${K}" stroke-width="${f(konturW * 0.85)}"/>`;
}

/** Açı boyunca bant çokgeni (ejder gövdesi): rF, wF açıya göre yarıçap/genişlik. */
function bantYolu(a0, a1, rF, wF, adim) {
  const dis = [];
  const ic = [];
  for (let i = 0; i <= adim; i += 1) {
    const a = a0 + ((a1 - a0) * i) / adim;
    const r = rF(a);
    const w = wF(a);
    dis.push(kutup(r + w / 2, a));
    ic.push(kutup(r - w / 2, a));
  }
  return { dolgu: `${P(dis)}${P([...ic].reverse()).replace("M", "L")}Z`, dis: P(dis), ic: P(ic) };
}

/** Kübik Bezier merkez çizgisinden bant (boyun). */
function bezierBant(p0, p1, p2, p3, w0, w1, adim = 16) {
  const nok = (t) => {
    const u = 1 - t;
    return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
  };
  const a = [];
  const b = [];
  for (let i = 0; i <= adim; i += 1) {
    const t = i / adim;
    const q = nok(t);
    const q2 = nok(Math.min(1, t + 0.01));
    const q1 = nok(Math.max(0, t - 0.01));
    const dx = q2[0] - q1[0];
    const dy = q2[1] - q1[1];
    const l = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * t) / 2;
    a.push([q[0] - (dy / l) * w, q[1] + (dx / l) * w]);
    b.push([q[0] + (dy / l) * w, q[1] - (dx / l) * w]);
  }
  return { dolgu: `${P(a)}${P([...b].reverse()).replace("M", "L")}Z`, a: P(a), b: P(b) };
}

// =====================================================================================================
// EJDERHA
// =====================================================================================================
const EJ = {
  // Gövde (açı saat yönünün tersine azalır): omuz −20° → kuyruk ucu −290° (= 70°, sağ)
  a0: -20, a1: -290,
  onArka: [[-18, 1], [-60, 1], [-80, -1], [-114, -1], [-134, 1], [-190, 1], [-210, -1], [-238, -1], [-256, 1], [-300, 1]],
  gen: [[-18, 12.5], [-100, 12], [-180, 10], [-240, 7], [-272, 4.2], [-290, 1.8]],
  bas: { x: -3.4, y: -61, aci: -8, s: 0.95 },
};
const ara = (liste, a) => {
  for (let i = 0; i < liste.length - 1; i += 1) {
    const [x0, y0] = liste[i];
    const [x1, y1] = liste[i + 1];
    if (a <= x0 && a >= x1) { const t = (x0 - a) / (x0 - x1); const s = t * t * (3 - 2 * t); return y0 + (y1 - y0) * s; }
  }
  return liste[a > liste[0][0] ? 0 : liste.length - 1][1];
};
const ejS = (a) => ara(EJ.onArka, a);
const ejR = (a) => 52 + 3 * ejS(a);
const ejW = (a) => ara(EJ.gen, a);
/** Baş yerel koordinatı (x ileri, y aşağı) → genel. */
function basGenel(x, y) {
  const { x: hx, y: hy, aci, s } = EJ.bas;
  const [rx, ry] = dondur(x * s, y * s, aci);
  return [f(hx + rx), f(hy + ry)];
}
function basYon(x, y) {
  const [rx, ry] = dondur(x, y, EJ.bas.aci);
  const l = Math.hypot(rx, ry);
  return [f(rx / l), f(ry / l)];
}
/** Gölgelendirici noktaları: göz, ikinci göz (gizli), ağız + yön, burun deliği. */
export function ejderhaNoktalari() {
  const goz = basGenel(13.2, -5.4);
  const agiz = basGenel(29.5, 4.2);
  const yon = basYon(1, 0.62);
  const burun = basGenel(29.6, -3.4);
  return [[goz[0], goz[1], 1.5, 1], [0, 0, 0, 0], [agiz[0], agiz[1], yon[0], yon[1]], [burun[0], burun[1], 0, 0]];
}

function ejGovdeParca(a0, a1, arka) {
  const adim = Math.max(6, Math.round(Math.abs(a1 - a0) / 2));
  const b = bantYolu(a0, a1, ejR, ejW, adim);
  const pul = bantYolu(a0, a1, (a) => ejR(a) + ejW(a) * 0.2, (a) => ejW(a) * 0.24, adim);
  const karin = bantYolu(a0, a1, (a) => ejR(a) - ejW(a) * 0.27, (a) => ejW(a) * 0.4, adim);
  let dikenler = "";
  let pullar = "";
  let karinCizgi = "";
  const yon = a1 < a0 ? -1 : 1;
  for (let a = a0; yon < 0 ? a >= a1 : a <= a1; a += yon * 4.5) {
    const w = ejW(a);
    const r = ejR(a);
    const [x, y] = kutup(r + w * 0.03, a);
    const s = w / 12;
    // yerel: x teğet (kuyruğa doğru), y içe
    pullar += `<path d="M${f(-1.6 * s)} ${f(-2.3 * s)}Q${f(1.8 * s)} 0 ${f(-1.6 * s)} ${f(2.3 * s)}" transform="translate(${x} ${y}) rotate(${f(a + 180)})" fill="none" stroke="#7a0a1c" stroke-width="${f(0.8 * Math.max(s, 0.5))}" stroke-linecap="round"/>`;
    const [kx, ky] = kutup(r - w * 0.27, a);
    karinCizgi += `<path d="M0 ${f(-w * 0.2)}V${f(w * 0.2)}" transform="translate(${kx} ${ky}) rotate(${f(a)})" stroke="#b8701a" stroke-width="${f(0.7 * Math.max(s, 0.5))}"/>`;
  }
  for (let a = a0 - yon * 3; yon < 0 ? a >= a1 + 6 : a <= a1 - 6; a += yon * 9) {
    const w = ejW(a);
    const [x, y] = kutup(ejR(a) + w * 0.42, a);
    const s = Math.max(0.35, w / 12);
    dikenler += `<path d="M${f(2.8 * s)} 0L${f(-1.2 * s)} ${f(-5.6 * s)}L${f(-2.8 * s)} 0Z" transform="translate(${x} ${y}) rotate(${f(a)})" fill="#5c0a18" ${cz(1)}/>`;
  }
  const g = `${dikenler}<path d="${b.dolgu}" fill="#b8142a"/>`
    + `<path d="${pul.dolgu}" fill="#e8413a"/>${pullar}`
    + `<path d="${karin.dolgu}" fill="#f6b73c"/>${karinCizgi}`
    + `<path d="${bantYolu(a0, a1, (a) => ejR(a) + ejW(a) * 0.33, () => 0.9, adim).dolgu}" fill="#fff" opacity=".4"/>`
    + `<path d="${b.dis}" fill="none" ${cz(1.5)}/><path d="${b.ic}" fill="none" ${cz(1.5)}/>`;
  return arka ? `<g>${g}<path d="${b.dolgu}" fill="#12040a" opacity=".42"/></g>` : g;
}

function ejParcalar() {
  // ön/arka aralıklarını onArka listesinden çıkar (işaret değişimi)
  const parcalar = [];
  let bas = EJ.a0;
  let isaret = ejS(bas) >= 0;
  for (let a = EJ.a0; a >= EJ.a1; a -= 1) {
    const s = ejS(a) >= 0;
    if (s !== isaret) { parcalar.push([bas, a - 0.8, !isaret]); bas = a + 0.8; isaret = s; }
  }
  parcalar.push([bas, EJ.a1, !isaret]);
  return parcalar;   // [a0, a1, arka]
}

function ejKanat(orta = false) {
  const om = kutup(57, -34);
  const dirsek = [-45, -71];
  const bilek = [-60, -80];
  const uclar = [[-83, -73], [-84, -50], [-73, -31]];
  const govdeUc = kutup(58, -62);
  const zar = `M${om.join(" ")}L${dirsek.join(" ")}L${bilek.join(" ")}L${uclar[0].join(" ")}Q-74 -62 ${uclar[1].join(" ")}Q-70 -45 ${uclar[2].join(" ")}Q-60 -34 ${govdeUc.join(" ")}Z`;
  const kemik = `M${om.join(" ")}L${dirsek.join(" ")}L${bilek.join(" ")}M${bilek.join(" ")}L${uclar[0].join(" ")}M${bilek.join(" ")}L${uclar[1].join(" ")}M${bilek.join(" ")}L${uclar[2].join(" ")}`;
  // uzak kanat: aynı kanadın omuz çevresinde döndürülmüş, koyu, küçük kopyası (derinlik)
  const uzak = `<g transform="rotate(12 ${om[0]} ${om[1]}) translate(${om[0]} ${om[1]}) scale(.9) translate(${-om[0]} ${-om[1]})">`
    + `<path d="${zar}" fill="#5c0a18" ${cz(1.6)}/><path d="${kemik}" fill="none" stroke="#2a0409" stroke-width="2.2" stroke-linecap="round"/></g>`;
  const g = uzak
    + `<path d="${zar}" fill="#8a1024" ${cz(1.6)}/>`
    + `<path d="M${bilek.join(" ")}L${uclar[0].join(" ")}Q-74 -62 ${uclar[1].join(" ")}Z" fill="#c42a34"/>`
    + `<path d="M${bilek.join(" ")}L${uclar[1].join(" ")}Q-70 -45 ${uclar[2].join(" ")}Z" fill="#a51a2c"/>`
    + `<path d="${zar}" fill="none" ${cz(1.6)}/>`
    + `<path d="${kemik}" fill="none" stroke="#3a0610" stroke-width="2.4" stroke-linecap="round"/>`
    + `<path d="${kemik}" fill="none" stroke="#f0a64a" stroke-width=".8" stroke-linecap="round" opacity=".7"/>`
    + uclar.map(([x, y]) => `<path d="M${x} ${y}l-2.4 -1.2l1 2.8Z" fill="#f3e3c0" ${cz(0.7)}/>`).join("")
    + `<path d="M${bilek[0] + 1} ${bilek[1] - 1}l-3 -4l3.8 1.2Z" fill="#f3e3c0" ${cz(0.8)}/>`;
  // orta kademe: kanat omuz çevresinde küçülür (dar yerlerde sola taşıp kesilmesin)
  return orta ? `<g transform="translate(${om[0]} ${om[1]}) scale(.66) translate(${-om[0]} ${-om[1]})">${g}</g>` : g;
}

function ejPence(a, r = 47.6) {
  // halkayı kavrayan üç tırnak (yerel: y içe)
  const [x, y] = kutup(r, a);
  const tirnak = (dx) => `<path d="M${dx} -3.4C${dx + 1.4} -1 ${dx + 1.2} 2 ${dx - 0.4} 4.2C${dx - 0.2} 1.6 ${dx - 1} -1 ${dx - 1.6} -3Z" fill="#f3e3c0" ${cz(0.9)}/>`;
  return `<g transform="translate(${x} ${y}) rotate(${f(a)}) scale(1.55)">`
    + `<path d="M-5.4 -7.6C-5 -3 5 -3 5.4 -7.6L4 -2C2 0 -2 0 -4 -2Z" fill="#9e1026" ${cz(1.2)}/>`
    + tirnak(-3.2) + tirnak(0.4) + tirnak(3.8) + `</g>`;
}

function ejKuyrukUcu() {
  const a = EJ.a1;
  const [x, y] = kutup(ejR(a), a);
  // yerel: y dışa doğru eksi; kürek biçimli uç, yukarı bakar
  return `<g transform="translate(${x} ${y}) rotate(-12) scale(1.6)">`
    + `<path d="M0 1L-5.6 -6.4L-1.2 -5L0 -12.6L1.2 -5L5.6 -6.4Z" fill="#5c0a18" ${cz(1.2)}/>`
    + `<path d="M0 -1.6L-2.4 -5.4L0 -10" fill="none" stroke="#e8413a" stroke-width=".9" stroke-linecap="round"/></g>`;
}

function ejBas() {
  const { x, y, aci, s } = EJ.bas;
  const kafa = "M-6 -7C-2 -11 6 -12.6 11 -10.6C15 -9 19 -7.4 24 -6.2C28 -5.4 31.4 -4.6 32.4 -2.4C33 -.6 31.6 .6 29.4 .8L12 2.2C8 2.6 4 4.4 1 6.4C-2 7.6 -5 7.4 -6.4 5.8Z";
  const cene = "M1.6 4.6C8 6.2 16 9.4 25 13.6C26.8 14.4 26.6 16.2 24.8 16.6C16.4 17.2 7.6 14.2 .8 10Z";
  const agizIci = "M2.6 5L29.4 .9L25.4 13.8L2 8.2Z";
  let dis = "";
  for (let k = 0; k < 6; k += 1) { const dx = 14 + k * 2.6; dis += `M${dx} ${f(2 - k * 0.2)}l1 2.6l1 -2.7`; }
  let alt = "";
  for (let k = 0; k < 5; k += 1) { const dx = 9 + k * 3; alt += `M${dx} ${f(7.4 + k * 1.15)}l1.1 -2.6l1.1 2.9`; }
  return `<g transform="translate(${x} ${y}) rotate(${aci}) scale(${s})">`
    // boynuzlar
    + `<path d="M7 -10.4C2 -17 -6 -22.4 -13 -23.6C-7 -20 -2 -15 3 -9Z" fill="#e8d3a6" ${cz(1.2)}/>`
    + `<path d="M2 -9.6C-4 -14 -12 -18 -19 -17.4C-13 -15.4 -7 -12 -1 -7Z" fill="#f3e3c0" ${cz(1.2)}/>`
    + `<path d="M-2 -12.4C-6 -15 -10 -16.6 -14 -17" fill="none" stroke="#b89a66" stroke-width=".7"/>`
    // yanak püskülleri
    + `<path d="M-4 4L-13 9.4L-6 1.4ZM-5 -1L-15 .6L-6.4 -4.4Z" fill="#5c0a18" ${cz(1)}/>`
    // alt çene + ağız içi
    + `<path d="${agizIci}" fill="#3a0410"/>`
    + `<path d="M5 7.6C11 9 17 10.6 22 11.4" fill="none" stroke="#c2304a" stroke-width="2.2" stroke-linecap="round"/>`
    + `<path d="${cene}" fill="#8a0e22" ${cz(1.4)}/>`
    + `<path d="${alt}" fill="#fff8ec" ${cz(0.5)}/>`
    + `<path d="M4 10.4C10 13 16 14.6 23 15.2" fill="none" stroke="#f6b73c" stroke-width="1.2" stroke-linecap="round"/>`
    // kafa
    + `<path d="${kafa}" fill="#c8182c" ${cz(1.5)}/>`
    + `<path d="M-4 3C0 1.4 6 1 12 1.6L28 .4C30 .2 31 -.4 31.6 -1.4" fill="none" stroke="#8a0e22" stroke-width="2.4" stroke-linecap="round"/>`
    + `<path d="${dis}" fill="#fff8ec" ${cz(0.5)}/>`
    + `<path d="M-2.6 -9.4C3 -11.8 9 -12 14.4 -10" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>`
    + `<path d="M16 -7.6C20 -6.8 24 -5.8 28 -5" fill="none" stroke="#ff7a6a" stroke-width="1.2" stroke-linecap="round"/>`
    // kaş çıkıntısı + göz
    + `<path d="M7 -7.4C10 -9.6 14 -9.4 17.4 -7.2L16 -5.6C13 -7 10 -7 8 -5.8Z" fill="#5c0a18" ${cz(0.9)}/>`
    + `<path d="M10 -5.2C11.6 -7 15 -7 16.8 -5C15 -3.8 12 -3.6 10 -5.2Z" fill="#ffd23a" ${cz(0.8)}/>`
    + `<ellipse cx="13.6" cy="-5.3" rx=".5" ry="1.4" fill="#2a0400"/>`
    + `<circle cx="12.4" cy="-5.8" r=".45" fill="#fff"/>`
    // burun deliği + pullar
    + `<ellipse cx="29.6" cy="-3.4" rx="1.1" ry=".6" transform="rotate(-20 29.6 -3.4)" fill="#2a0400"/>`
    + `<path d="M2 -4q2 1.6 0 3.2M5 -2.6q2 1.6 0 3.2M0 1q1.8 1.4 0 2.8" fill="none" stroke="#7a0a1c" stroke-width=".7" stroke-linecap="round"/>`
    + `</g>`;
}

function ejBoyun() {
  const p0 = kutup(ejR(EJ.a0), EJ.a0 + 0.5);
  const t0 = [Math.cos(EJ.a0 * Math.PI / 180), Math.sin(EJ.a0 * Math.PI / 180)];
  const b = basGenel(-6, 0);
  const d = basYon(1, 0);
  const p1 = [p0[0] + t0[0] * 6, p0[1] + t0[1] * 6];
  const p2 = [b[0] - d[0] * 6, b[1] - d[1] * 6];
  const bb = bezierBant(p0, p1, p2, [b[0] + d[0] * 2, b[1] + d[1] * 2], 12.5, 11);
  const kb = bezierBant([p0[0] + 1.2, p0[1] + 3.4], [p1[0] + 1, p1[1] + 3], [p2[0] + 0.6, p2[1] + 3], [b[0] + 2, b[1] + 3.4], 4.6, 4);
  return `<path d="${bb.dolgu}" fill="#b8142a"/><path d="${kb.dolgu}" fill="#f6b73c"/>`
    + `<path d="${bb.a}" fill="none" ${cz(1.5)}/><path d="${bb.b}" fill="none" ${cz(1.5)}/>`;
}

function ejderhaTam(orta = false) {
  const defs = lg("ejh", [[0, "#4a1a2c"], [0.45, "#22101a"], [1, "#12060c"]])
    + lg("ejA", [[0, "#fff1a8"], [0.5, "#ffc62a"], [1, "#c9820a"]]);
  const parcalar = ejParcalar();
  const arka = parcalar.filter((p) => p[2]).map(([a0, a1]) => ejGovdeParca(a0, a1, true)).join("");
  const on = parcalar.filter((p) => !p[2]).map(([a0, a1]) => ejGovdeParca(a0, a1, false)).join("");
  let run = "";
  for (let a = 0; a < 360; a += 30) { const [x, y] = kutup(47, a + 15); run += `<circle cx="${x}" cy="${y}" r=".9" fill="#ffc62a"/>`; }
  const g = ejKanat(orta) + arka
    + halka({ bant: "ejh", isik: 0.35 })
    + `<circle r="50.2" fill="none" stroke="url(#ejA)" stroke-width="1.4"/><circle r="44" fill="none" stroke="url(#ejA)" stroke-width="1.1"/>${run}`
    + ejPence(-44) + ejPence(-160)
    + on + ejKuyrukUcu() + ejBoyun() + ejBas();
  return svg(defs, g);
}

function ejderhaKucuk() {
  const defs = lg("ejk", [[0, "#e8413a"], [0.5, "#b8142a"], [1, "#6a0a1a"]]) + lg("ejA", [[0, "#fff1a8"], [0.5, "#ffc62a"], [1, "#c9820a"]]);
  let pul = "";
  for (let a = 0; a < 360; a += 15) { const [x, y] = kutup(47, a); pul += `<path d="M-1.8 -2.2Q2 0 -1.8 2.2" transform="translate(${x} ${y}) rotate(${a + 180})" fill="none" stroke="#6a0a1a" stroke-width="1.1" stroke-linecap="round"/>`; }
  // tepede ejder gözü (kutudan taşmaz)
  const goz = `<g transform="translate(0 -47)"><path d="M-7 0C-3 -5 3 -5 7 0C3 5 -3 5 -7 0Z" fill="#ffd23a" ${cz(1.6)}/><ellipse rx="1.1" ry="3.4" fill="#2a0400"/><circle cx="-2" cy="-1.4" r=".9" fill="#fff"/></g>`;
  return svg(defs, halka({ bant: "ejk", ic: 42, dis: 51.5, isik: 0.5, konturW: 2.4 }) + pul
    + `<circle r="50.4" fill="none" stroke="url(#ejA)" stroke-width="1.6"/>` + goz);
}

// =====================================================================================================
// SÖNMEYEN ALEV
// =====================================================================================================
function catlaklar(tohumAdi, adet = 7) {
  const r = tohum(tohumAdi);
  let d = "";
  for (let i = 0; i < adet; i += 1) {
    const a0 = (i / adet) * 360 + r() * 20;
    const uz = 22 + r() * 22;
    const pts = [];
    for (let k = 0; k <= 6; k += 1) pts.push(kutup(44.8 + r() * 4.4, a0 + (uz * k) / 6));
    d += P(pts);
    // dal
    const q = pts[2 + Math.floor(r() * 3)];
    const [bx, by] = q;
    d += `M${bx} ${by}l${f((r() - 0.5) * 5)} ${f((r() - 0.5) * 5)}`;
  }
  return d;
}

function alevHalkasi(kucuk = false) {
  const defs = lg("alh", [[0, "#5a3326"], [0.45, "#2a1510"], [1, "#140807"]])
    + lg("alc", [[0, "#ffe27a"], [0.5, "#ff8a1f"], [1, "#e0400c"]])
    + rg("alg", [[0, "#fff6c8"], [0.35, "#ffd23a"], [0.7, "#ff7a1a"], [1, "#c8300a"]], 0.5, 0.62, 0.6);
  const c = catlaklar("alev2");
  let perc = "";
  for (let a = 22.5; a < 360; a += 45) {
    const [x, y] = kutup(47, a);
    perc += `<circle cx="${x}" cy="${y}" r="2" fill="#1a0c08" ${cz(0.9)}/><circle cx="${f(x - 0.5)}" cy="${f(y - 0.5)}" r=".6" fill="#ff9a4a"/>`;
  }
  // tepede kor yüreği: demir tutamaklı alev biçimli taş
  const yurek = `<g transform="translate(0 -49)">`
    + `<path d="M-10.6 3.6L-12.4 -4L-6 -1.4L-4 -9L0 -4.2L4 -9L6 -1.4L12.4 -4L10.6 3.6C6 7 -6 7 -10.6 3.6Z" fill="#241210" ${cz(1.4)}/>`
    + `<path d="M0 -17C4.6 -12 7 -8 6.4 -3.4C5.8 1.4 2.8 4 0 4C-2.8 4 -5.8 1.4 -6.4 -3.4C-7 -8 -3 -10 -2 -14C-.4 -11 1 -10.6 1.4 -11.6C2 -13.4 1.2 -15.4 0 -17Z" fill="url(#alg)" ${cz(1.4)}/>`
    + `<path d="M0 -6C2 -4 2.6 -2 2 -.4C1.4 1.2 -1.4 1.2 -2 -.4C-2.6 -2 -1.4 -3.4 0 -6Z" fill="#fff6c8"/>`
    + `<path d="M-3.8 -6.6C-4 -9 -3 -10.6 -2.2 -12" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".8"/></g>`;
  const g = halka({ bant: "alh", isik: 0.3, ic: kucuk ? 42 : 43, dis: kucuk ? 51.5 : 51.2, konturW: kucuk ? 2.4 : 1.8 })
    + `<path d="${c}" fill="none" stroke="#c8300a" stroke-width="${kucuk ? 2.2 : 1.8}" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="${c}" fill="none" stroke="#ff8a1f" stroke-width="${kucuk ? 1.3 : 1.05}" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="${c}" fill="none" stroke="#ffe27a" stroke-width=".45" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<circle r="43.6" fill="none" stroke="#ff7a1a" stroke-width=".8" opacity=".85"/>`
    + perc + (kucuk ? `<g transform="translate(0 4) scale(.8)">${yurek}</g>` : yurek);
  return svg(defs, g);
}

// =====================================================================================================
// BUZ KRİSTALİ
// =====================================================================================================
function kristal(a, L, W, uzak = false) {
  const tip = [f(W * 0.06), -L];
  const om = -L * 0.74;
  const x1 = -W * 0.14;
  const x2 = W * 0.22;
  const sol = `M${f(-W / 2)} 0L${f(-W / 2)} ${f(om)}L${tip.join(" ")}L${f(x1)} ${f(om)}L${f(x1)} 0Z`;
  const orta = `M${f(x1)} 0L${f(x1)} ${f(om)}L${tip.join(" ")}L${f(x2)} ${f(om)}L${f(x2)} 0Z`;
  const sag = `M${f(x2)} 0L${f(x2)} ${f(om)}L${tip.join(" ")}L${f(W / 2)} ${f(om)}L${f(W / 2)} 0Z`;
  const kont = `M${f(-W / 2)} 1L${f(-W / 2)} ${f(om)}L${tip.join(" ")}L${f(W / 2)} ${f(om)}L${f(W / 2)} 1`;
  const koyu = uzak ? 0.25 : 0;
  return `<g transform="rotate(${f(a)}) translate(0 -46.5)">`
    + `<path d="${sol}" fill="#effdff"/><path d="${orta}" fill="#9fe3ff"/><path d="${sag}" fill="#4aa8e8"/>`
    + `<path d="M${f(-W / 2)} ${f(om)}L${tip.join(" ")}L${f(W / 2)} ${f(om)}" fill="none" stroke="#fff" stroke-width=".5" opacity=".7"/>`
    + `<path d="M${f(x1 + W * 0.12)} ${f(-L * 0.12)}L${f(x1 + W * 0.12)} ${f(om * 0.8)}" stroke="#fff" stroke-width="${f(Math.max(0.5, W * 0.08))}" stroke-linecap="round" opacity=".85"/>`
    + (koyu ? `<path d="${sol}${orta}${sag}" fill="#0b2a4a" opacity="${koyu}"/>` : "")
    + `<path d="${kont}" fill="none" stroke="#0b2140" stroke-width="1.2" stroke-linejoin="round"/></g>`;
}
// [açı, uzunluk, genişlik, uzak]
const BUZ_KRISTAL = [
  [-26, 14, 6, 1], [26, 14, 6, 1], [-14, 23, 8], [14, 23, 8], [0, 34, 10.5],
  [-74, 13, 6, 1], [74, 13, 6, 1], [-50, 13, 6, 1], [50, 13, 6, 1], [-62, 21, 8.5], [62, 21, 8.5],
  [-106, 9, 5, 1], [106, 9, 5, 1], [-130, 9, 5, 1], [130, 9, 5, 1], [-118, 15, 7], [118, 15, 7],
  [-168, 7, 5, 1], [168, 7, 5, 1], [180, 11, 6.5],
];
export function buzNoktalari() {
  const uc = (a, L) => kutup(46.5 + L, a);
  return [[0, 34, 5.5, 0], [-14, 23, 4, 0.37], [14, 23, 4, 0.71], [-62, 21, 4.2, 0.23], [62, 21, 4.2, 0.55],
    [-118, 15, 3.4, 0.86], [118, 15, 3.4, 0.12], [180, 11, 3, 0.64]].map(([a, L, s, faz]) => [...uc(a, L), s, faz]);
}
function donDeseni() {
  const r = tohum("don2");
  let d = "";
  for (let i = 0; i < 26; i += 1) {
    const a = (i / 26) * 360 + r() * 6;
    const rr = 45 + r() * 4;
    const [x, y] = kutup(rr, a);
    const u = 3 + r() * 2.4;
    const yon = r() > 0.5 ? 1 : -1;
    d += `<g transform="translate(${x} ${y}) rotate(${f(a + 90 * yon)})"><path d="M0 0H${f(u)}M${f(u * 0.3)} 0l1 -1.2M${f(u * 0.3)} 0l1 1.2M${f(u * 0.62)} 0l.8 -1M${f(u * 0.62)} 0l.8 1" fill="none" stroke="#fff" stroke-width=".42" stroke-linecap="round" opacity=".8"/></g>`;
  }
  return d;
}
function karTanesi(x, y, s) {
  let kol = "";
  for (let k = 0; k < 6; k += 1) kol += `<path d="M0 0V-4.4M0 -2.4l-1.4 -1.2M0 -2.4l1.4 -1.2" transform="rotate(${k * 60})"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})"><circle r="4.8" fill="#1a5fa8" ${cz(1.1, "#0b2140")}/>`
    + `<g fill="none" stroke="#effdff" stroke-width="1.1" stroke-linecap="round">${kol}</g><circle r=".9" fill="#fff"/></g>`;
}
function buzHalkasi(kucuk = false) {
  const defs = lg("bzh", [[0, "#effdff"], [0.3, "#9fe3ff"], [0.62, "#3a96e0"], [1, "#1a5fa8"]]);
  const halkaG = halka({ bant: "bzh", isik: 0.8, golge: 0.22, ic: kucuk ? 42 : 43, dis: kucuk ? 51.5 : 51, konturW: kucuk ? 2.4 : 1.8 })
    + donDeseni() + `<circle r="44" fill="none" stroke="#effdff" stroke-width=".9" opacity=".9"/>`;
  if (kucuk) {
    return svg(defs, halkaG + `<g transform="translate(0 -3) scale(.62)">${kristal(0, 20, 10)}${kristal(-16, 12, 7)}${kristal(16, 12, 7)}</g>`
      + karTanesi(0, 47, 0.9));
  }
  const uzak = BUZ_KRISTAL.filter((k) => k[3]).map(([a, L, W]) => kristal(a, L, W, true)).join("");
  const yakin = BUZ_KRISTAL.filter((k) => !k[3]).map(([a, L, W]) => kristal(a, L, W)).join("");
  return svg(defs, uzak + yakin + halkaG + karTanesi(...kutup(47, 90), 1) + karTanesi(...kutup(47, 270), 1) + karTanesi(...kutup(47, 150), 0.8) + karTanesi(...kutup(47, 210), 0.8));
}

// =====================================================================================================
// ŞİMŞEK (enerji)
// =====================================================================================================
export const SIMSEK_ELEKTROT = { sayi: 6, ilk: 30, r: 50.5 };
function simsekHalkasi(kucuk = false) {
  const defs = lg("smh", [[0, "#6b7d9c"], [0.4, "#34405a"], [1, "#141a2a"]])
    + rg("sme", [[0, "#ffffff"], [0.35, "#b8f4ff"], [0.7, "#39b6ff"], [1, "#1a4aa8"]])
    + lg("smy", [[0, "#fff6b0"], [0.45, "#ffd23a"], [1, "#f59e0b"]])
    + lg("smm", [[0, "#dfe6f2"], [0.5, "#8b98b0"], [1, "#4a566e"]]);
  let el = "";
  for (let i = 0; i < SIMSEK_ELEKTROT.sayi; i += 1) {
    const a = SIMSEK_ELEKTROT.ilk + (i * 360) / SIMSEK_ELEKTROT.sayi;
    const [x, y] = kutup(kucuk ? 47 : SIMSEK_ELEKTROT.r - 1.2, a);
    el += `<g transform="translate(${x} ${y}) rotate(${a})">`
      + (kucuk ? "" : `<path d="M-2.2 -3.4V-6.4H2.2V-3.4Z" fill="url(#smm)" ${cz(0.9)}/>`)
      + `<circle r="${kucuk ? 3.4 : 4.3}" fill="url(#smm)" ${cz(1.1)}/><circle r="${kucuk ? 1.8 : 2.3}" fill="url(#sme)" ${cz(0.6)}/><circle cx="-.6" cy="-.7" r=".6" fill="#fff"/></g>`;
  }
  const rozet = `<g transform="translate(0 ${kucuk ? -46 : -50}) scale(${kucuk ? 0.62 : 1})">`
    + `<path d="M-10 -9L0 -14L10 -9V4L0 12L-10 4Z" fill="#1c2640" ${cz(1.5)}/>`
    + `<path d="M-8 -7.6L0 -11.8L8 -7.6" fill="none" stroke="#6b7d9c" stroke-width="1" stroke-linecap="round"/>`
    + `<path d="M2.4 -10.8L-5.4 1.4H-.4L-2.6 10.6L6 -2H.8L3.8 -10.8Z" fill="url(#smy)" ${cz(1.2)}/>`
    + `<path d="M1.6 -9L-3 -1.2" stroke="#fff" stroke-width=".8" stroke-linecap="round" opacity=".9"/></g>`;
  const g = halka({ bant: "smh", isik: 0.45, ic: kucuk ? 42 : 43, dis: kucuk ? 51.5 : 51, konturW: kucuk ? 2.4 : 1.8 })
    + `<circle r="47" fill="none" stroke="#070c1c" stroke-width="3.2"/>`
    + `<circle r="47" fill="none" stroke="#39b6ff" stroke-width="1.4"/>`
    + `<circle r="47" fill="none" stroke="#e8fbff" stroke-width=".45"/>`
    + el + rozet;
  return svg(defs, g);
}

// =====================================================================================================
// ALTIN (Kraliyet · Altın Lig) — canlı parlak sarı altın; kahverengi yok (yalnız ince oyma çizgisi)
// =====================================================================================================
const ALTIN_DEFS = lg("gA", [[0, "#fffbe0"], [0.18, "#ffe45c"], [0.42, "#ffc81f"], [0.6, "#f0a012"], [0.78, "#ffd84a"], [1, "#fff4b0"]])
  + lg("gB", [[0, "#fff8c8"], [0.5, "#ffd23a"], [1, "#f0a012"]])
  + lg("gC", [[0, "#ffe45c"], [1, "#e8940c"]], 0, 0, 1, 1)
  + rg("gY", [[0, "#ff9aa8"], [0.35, "#ff2a4a"], [0.8, "#b0102a"], [1, "#6a0418"]], 0.38, 0.32, 0.7)
  + rg("gS", [[0, "#b8dcff"], [0.35, "#3a8cff"], [0.8, "#1646b8"], [1, "#0a2a78"]], 0.38, 0.32, 0.7)
  + rg("gZ", [[0, "#b8ffd8"], [0.35, "#22d07a"], [0.8, "#0a8a4a"], [1, "#045a2e"]], 0.38, 0.32, 0.7)
  + rg("gI", [[0, "#ffffff"], [0.6, "#f4eee4"], [1, "#c9bfae"]], 0.35, 0.3, 0.7)
  + lg("gK", [[0, "#e0203c"], [0.6, "#a8102a"], [1, "#5e0616"]]);
const TAS = { yakut: "gY", safir: "gS", zumrut: "gZ" };
function tas(x, y, r, tur, oval = false) {
  const rx = oval ? r * 0.78 : r;
  return `<ellipse cx="${x}" cy="${y}" rx="${f(rx + 1.3)}" ry="${f(r + 1.3)}" fill="url(#gB)" ${cz(1)}/>`
    + `<ellipse cx="${x}" cy="${y}" rx="${f(rx)}" ry="${f(r)}" fill="url(#${TAS[tur]})" ${cz(0.7)}/>`
    + `<path d="M${f(x - rx * 0.5)} ${f(y - r * 0.2)}L${x} ${f(y - r * 0.62)}L${f(x + rx * 0.5)} ${f(y - r * 0.2)}L${x} ${f(y + r * 0.55)}Z" fill="#fff" opacity=".22"/>`
    + `<ellipse cx="${f(x - rx * 0.34)}" cy="${f(y - r * 0.38)}" rx="${f(rx * 0.26)}" ry="${f(r * 0.18)}" transform="rotate(-30 ${f(x - rx * 0.34)} ${f(y - r * 0.38)})" fill="#fff" opacity=".95"/>`;
}
const inci = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#gI)" ${cz(0.7)}/><circle cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.3)}" fill="#fff"/>`;
function altinHalka({ ic = 43, dis = 52, boncuk = true, oyma = true, konturW = 1.8 }) {
  let g = halka({ bant: "gA", ic, dis, isik: 0.85, golge: 0.16, konturW });
  if (oyma) {
    for (let a = 0; a < 360; a += 20) {
      const [x, y] = kutup((ic + dis) / 2, a + 10);
      g += `<path d="M-2.6 .6C-2 -1.6 0 -1.6 0 0S2 1.6 2.6 -.6" transform="translate(${x} ${y}) rotate(${a + 10 + 90})" fill="none" stroke="#b8700a" stroke-width=".55" stroke-linecap="round" opacity=".9"/>`;
    }
  }
  if (boncuk) {
    for (let a = 0; a < 360; a += 7.5) {
      const [x, y] = kutup(dis - 1.2, a);
      g += `<circle cx="${x}" cy="${y}" r=".95" fill="#fff1a0" stroke="#c9820a" stroke-width=".35"/>`;
    }
  }
  return g;
}
function zambak(a, r = 53) {
  // fleur-de-lis: yerel yukarı = dışa
  return `<g transform="rotate(${a}) translate(0 ${-r})">`
    + `<path d="M0 -13C3 -9 3.6 -5 1.6 -1.4L0 1L-1.6 -1.4C-3.6 -5 -3 -9 0 -13Z" fill="url(#gC)" ${cz(1)}/>`
    + `<path d="M1.4 -2C4 -6 8.4 -6.6 9.6 -3.6C10.4 -1.4 8.4 .4 6.2 -.6C7.4 -2.6 5.4 -3.8 2.6 -.4ZM-1.4 -2C-4 -6 -8.4 -6.6 -9.6 -3.6C-10.4 -1.4 -8.4 .4 -6.2 -.6C-7.4 -2.6 -5.4 -3.8 -2.6 -.4Z" fill="url(#gB)" ${cz(1)}/>`
    + `<rect x="-4.6" y="-1.6" width="9.2" height="3" rx="1" fill="url(#gB)" ${cz(0.9)}/>`
    + `<path d="M-.8 -10.6C-1.2 -8 -1 -6 0 -4" fill="none" stroke="#fff" stroke-width=".7" stroke-linecap="round"/></g>`;
}
// Kraliyet tacı kutusu (PNG yuvası da aynı kutuya oturur): x −30…30, y −86…−42
export const KRALIYET_TAC_KUTU = [-30, -86, 60, 44];
function kraliyetTac() {
  const uclar = [[-24, -68], [-12, -75], [0, -79], [12, -75], [24, -68]];
  const govde = `M-26 -44L-28 -60L${uclar[0].join(" ")}L-18 -58L${uclar[1].join(" ")}L-6 -60L${uclar[2].join(" ")}L6 -60L${uclar[3].join(" ")}L18 -58L${uclar[4].join(" ")}L28 -60L26 -44Z`;
  return `<path d="M-22 -54C-22 -70 -12 -76 0 -76C12 -76 22 -70 22 -54Z" fill="url(#gK)" ${cz(1.3)}/>`
    + `<path d="M-14 -64C-12 -70 -6 -73 0 -73" fill="none" stroke="#ff6a7a" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>`
    + `<path d="${govde}" fill="url(#gA)" ${cz(1.5)}/>`
    + `<path d="M-24.6 -58L${uclar[0].join(" ")}M-14.4 -60L${uclar[1].join(" ")}M-3 -62L${uclar[2].join(" ")}" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".85"/>`
    + `<path d="M-27.2 -52H27.2" stroke="#b8700a" stroke-width=".7"/>`
    + `<rect x="-27.4" y="-52.4" width="54.8" height="8.8" rx="1.6" fill="url(#gB)" ${cz(1.3)}/>`
    + `<path d="M-26 -51H26" stroke="#fff" stroke-width=".8" stroke-linecap="round" opacity=".8"/>`
    + tas(0, -48, 3.2, "yakut", true) + tas(-12.5, -48, 2.4, "safir") + tas(12.5, -48, 2.4, "safir")
    + inci(-21.2, -48, 1.3) + inci(21.2, -48, 1.3) + inci(-6.2, -48, 1) + inci(6.2, -48, 1)
    + uclar.map(([x, y], i) => inci(x, y - 1.6, i === 2 ? 0 : 2)).join("")
    + `<circle cx="0" cy="-81" r="2.8" fill="url(#gB)" ${cz(1)}/><path d="M0 -84.6V-78.4M-2 -82.6H2" stroke="${K}" stroke-width="2.2" stroke-linecap="round"/><path d="M0 -84.2V-78.8M-1.6 -82.6H1.6" stroke="#ffe45c" stroke-width="1" stroke-linecap="round"/>`
    + tas(0, -64, 2.2, "zumrut");
}
function kraliyetHalkasi(kucuk = false, tacYok = false) {
  if (kucuk) {
    const g = altinHalka({ ic: 42, dis: 51.5, boncuk: false, oyma: false, konturW: 2.4 })
      + tas(0, 47, 2.8, "yakut", true) + tas(...kutup(47, 90), 2, "safir") + tas(...kutup(47, 270), 2, "safir")
      // küçük taç: yalnız halkanın tepesinde, kutudan taşmaz
      + `<path d="M-9 -44L-10 -52L-5 -48.6L0 -54L5 -48.6L10 -52L9 -44Z" fill="url(#gA)" ${cz(1.4)}/>` + tas(0, -46.4, 1.5, "yakut");
    return svg(ALTIN_DEFS, g);
  }
  let taslar = "";
  [[45, "safir"], [135, "zumrut"], [225, "zumrut"], [315, "safir"]].forEach(([a, t]) => { const [x, y] = kutup(47.5, a); taslar += tas(x, y, 2.6, t); });
  const g = zambak(90) + zambak(270)
    + altinHalka({})
    + taslar
    + `<g>${tas(0, 50, 4.2, "yakut", true)}<path d="M-5.6 44.6L-3 46.4M5.6 44.6L3 46.4M-5.6 55.4L-3 53.6M5.6 55.4L3 53.6" stroke="${K}" stroke-width="1.3" stroke-linecap="round"/></g>`
    + (tacYok ? "" : kraliyetTac());
  return svg(ALTIN_DEFS, g);
}
export function kraliyetNoktalari() {
  return [[0, -48, 5, 0], [-12.5, -48, 3.6, 0.31], [12.5, -48, 3.6, 0.62], [-24, -71, 3.4, 0.17], [0, -81, 4.4, 0.47],
    [24, -71, 3.4, 0.83], [0, 50, 5.4, 0.55], [...kutup(47.5, 45), 3.2, 0.09], [...kutup(47.5, 225), 3.2, 0.72], [...kutup(47.5, 315), 3.2, 0.39]];
}

function defneDali(yon) {
  // yon 1: sağ taraf (alttan yukarı), −1: sol
  let g = "";
  const kok = [];
  for (let i = 0; i <= 12; i += 1) kok.push(kutup(55, 180 - yon * (10 + i * 9)));
  g += `<path d="${P(kok)}" fill="none" stroke="${K}" stroke-width="2.6" stroke-linecap="round"/><path d="${P(kok)}" fill="none" stroke="#e8940c" stroke-width="1.2" stroke-linecap="round"/>`;
  for (let i = 0; i < 7; i += 1) {
    const a = 180 - yon * (16 + i * 16);
    const s = 1.55 - i * 0.08;
    [[58.4, 1], [51.8, -1]].forEach(([r, d], j) => {
      const [x, y] = kutup(r - (j ? 0 : 0), a - yon * 3);
      const don = a + (j ? 180 : 0) + yon * 35 * d;
      if (j === 1 && i < 1) return;
      g += `<g transform="translate(${x} ${y}) rotate(${f(don)}) scale(${f(s)})">`
        + `<path d="M0 3C3 1 3.4 -4 0 -8C-3.4 -4 -3 1 0 3Z" fill="url(#gC)" ${cz(1)}/>`
        + `<path d="M0 2V-6" stroke="#c9820a" stroke-width=".6"/><path d="M-1.4 -1C-1.6 -3 -1.2 -5 0 -6.4" fill="none" stroke="#fff" stroke-width=".7" stroke-linecap="round" opacity=".85"/></g>`;
    });
  }
  return g;
}
function altinLigHalkasi(kucuk = false) {
  if (kucuk) {
    const g = altinHalka({ ic: 42, dis: 51.5, boncuk: false, oyma: false, konturW: 2.4 })
      + `<path d="M-8 -44L-9 -51.6L-4 -48.4L0 -53.4L4 -48.4L9 -51.6L8 -44Z" fill="url(#gA)" ${cz(1.4)}/>`
      + `<path d="M0 42.6L1.6 46L5.2 46.3L2.4 48.6L3.3 52.2L0 50.2L-3.3 52.2L-2.4 48.6L-5.2 46.3L-1.6 46Z" fill="#fff6b0" ${cz(1)}/>`;
    return svg(ALTIN_DEFS, g);
  }
  const tac = `<path d="M-17 -44L-19 -58L-9.4 -51.6L0 -66L9.4 -51.6L19 -58L17 -44Z" fill="url(#gA)" ${cz(1.5)}/>`
    + `<path d="M-16.4 -54.6L-17.6 -57M0 -63L-6.4 -53" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".85"/>`
    + `<rect x="-18" y="-48.4" width="36" height="6.4" rx="1.4" fill="url(#gB)" ${cz(1.3)}/>`
    + tas(0, -45.2, 2.2, "yakut") + tas(-9.4, -45.2, 1.5, "safir") + tas(9.4, -45.2, 1.5, "safir")
    + inci(-19, -59.4, 1.8) + inci(19, -59.4, 1.8) + inci(0, -67.8, 2.2);
  const plaka = `<path d="M-24 52L-30 49L-27 56L-30 63L-21 60ZM24 52L30 49L27 56L30 63L21 60Z" fill="#c8182c" ${cz(1.2)}/>`
    + `<path d="M-21 50H21L23 56L21 62H-21L-23 56Z" fill="url(#gA)" ${cz(1.4)}/>`
    + `<path d="M-19.6 52H19.6" stroke="#fff" stroke-width=".8" stroke-linecap="round" opacity=".85"/>`
    + `<path d="M0 50.4L2 54.4L6.4 54.8L3 57.6L4.1 62L0 59.6L-4.1 62L-3 57.6L-6.4 54.8L-2 54.4Z" fill="#fff6b0" ${cz(1)}/>`;
  return svg(ALTIN_DEFS, defneDali(1) + defneDali(-1) + altinHalka({ ic: 43, dis: 51.2 }) + tac + plaka);
}
export function altinLigNoktalari() {
  return [[0, -45.2, 4, 0], [0, -68, 4.2, 0.4], [-19, -59.4, 3, 0.7], [19, -59.4, 3, 0.2], [0, 56.5, 4.4, 0.55], [...kutup(51, 60), 3, 0.85], [...kutup(51, 300), 3, 0.33]];
}

// =====================================================================================================
// Kayıt
// =====================================================================================================
const URETICI = {
  ejderha: (k) => (k === "kucuk" ? ejderhaKucuk() : ejderhaTam(k === "orta")),
  alev: (k) => alevHalkasi(k === "kucuk"),
  buz: (k) => buzHalkasi(k === "kucuk"),
  simsek: (k) => simsekHalkasi(k === "kucuk"),
  kraliyet: (k, s) => kraliyetHalkasi(k === "kucuk", s?.tacYok),
  altinlig: (k) => altinLigHalkasi(k === "kucuk"),
};

const onbellek = new Map();
/** Çizimin adresi (blob: URL, önbellekli). secenek: { tacYok } (PNG yuvası dolu olunca). */
export function sanatAdresi(tur, kademe, secenek) {
  const anahtar = `${tur}:${kademe}:${secenek?.tacYok ? 1 : 0}`;
  let u = onbellek.get(anahtar);
  if (!u) {
    const metin = URETICI[tur](kademe, secenek);
    try {
      u = URL.createObjectURL(new Blob([metin], { type: "image/svg+xml" }));
    } catch {
      u = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(metin)}`;
    }
    onbellek.set(anahtar, u);
  }
  return u;
}
