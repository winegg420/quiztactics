// Ülke bayrağı — emoji yerine satır içi SVG.
//
// Neden: Windows bayrak emojisi (regional indicator) çizmez; "🇹🇷" yerine
// "TR" harfleri çıkıyordu. Paket eklemek yasak, bu yüzden `ulkeler`
// tablosundaki 87 ülke (+ profillerde görülen GH) burada sade SVG olarak
// çizilir. Küçük boyutta (14-20 px) tanınır olacak kadar sadeleştirildi;
// armalar/amblemler basit şekillerle temsil edilir.
//
// Listede olmayan geçerli bir kod gelirse nötr gri bayrak çizilir; kod
// yoksa/geçersizse dünya simgesi (🌍, Windows'ta da çizilir) döner.
// Erişilebilirlik: role="img" + aria-label = oyuncunun dilinde ülke adı.
import { aktifDil } from "../lib/dil.js";

// ---- Küçük çizim yardımcıları (viewBox 30 x 20) ----
const R = (x, y, w, h, f) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`;
const T = (...r) => r.join("");
/** Eşit yatay şeritler (yukarıdan aşağı). */
const h = (...c) => c.map((f, i) => R(0, (20 / c.length) * i, 30, 20 / c.length + 0.05, f)).join("");
/** Ağırlıklı yatay şeritler: [[oran, renk], ...] */
const hw = (...p) => {
  const top = p.reduce((a, [o]) => a + o, 0);
  let y = 0;
  return p.map(([o, f]) => { const s = R(0, y, 30, (20 * o) / top + 0.05, f); y += (20 * o) / top; return s; }).join("");
};
/** Eşit dikey şeritler (soldan sağa). */
const v = (...c) => c.map((f, i) => R((30 / c.length) * i, 0, 30 / c.length + 0.05, 20, f)).join("");
const C = (cx, cy, r, f) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"/>`;
const P = (d, f) => `<path d="${d}" fill="${f}"/>`;
const G = (pts, f) => `<polygon points="${pts}" fill="${f}"/>`;
/** Beş köşeli yıldız. */
const Y = (cx, cy, r, f, don = 0) => {
  const n = [];
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + don + i * 36) * Math.PI) / 180;
    const rr = i % 2 ? r * 0.382 : r;
    n.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return G(n.join(" "), f);
};
/**
 * Hilal: r yarıçaplı daireden, dx sağa kaymış 0.8r'lik daire çıkarılır.
 * Gerçek yol olarak çizilir (zemin rengine bağlı değil; iki renge taşan
 * hilallerde de doğru). `zemin` parametresi imza uyumu için durur.
 */
// eslint-disable-next-line no-unused-vars
const hilal = (cx, cy, r, dx, zemin, on) => {
  const ri = r * 0.8;
  const x = (dx * dx + r * r - ri * ri) / (2 * dx);
  const y = Math.sqrt(Math.max(0, r * r - x * x));
  const f = (n) => n.toFixed(2);
  return P(`M${f(cx + x)},${f(cy - y)}A${r},${r} 0 1 0 ${f(cx + x)},${f(cy + y)}A${ri},${ri} 0 ${x - dx > 0 ? 1 : 0} 1 ${f(cx + x)},${f(cy - y)}Z`, on);
};
/** İskandinav haçı (çerçeveli ya da düz). */
const iskandinav = (zemin, hac, cerceve) =>
  R(0, 0, 30, 20, zemin) +
  (cerceve ? R(8, 0, 5, 20, cerceve) + R(0, 7.5, 30, 5, cerceve) : "") +
  R(9, 0, 3, 20, hac) + R(0, 8.5, 30, 3, hac);
/** Birleşik Krallık bayrağı (30 x 20 alanına). */
const UK =
  R(0, 0, 30, 20, "#012169") +
  `<path d="M0,0L30,20M30,0L0,20" stroke="#fff" stroke-width="4"/>` +
  `<path d="M0,0L30,20M30,0L0,20" stroke="#C8102E" stroke-width="1.4"/>` +
  R(12, 0, 6, 20, "#fff") + R(0, 7, 30, 6, "#fff") +
  R(13.2, 0, 3.6, 20, "#C8102E") + R(0, 8.2, 30, 3.6, "#C8102E");
const kanton = (ic) => `<g transform="scale(.5)">${ic}</g>`;

const B = {
  AE: T(hw([1, "#00732F"], [1, "#fff"], [1, "#000"]), R(0, 0, 7.5, 20, "#FF0000")),
  AL: T(R(0, 0, 30, 20, "#E41E20"), P("M15,4.5l2,2.2 3.6-1.4-1.2 3 2.4 1.2-3.2 1.2 1.4 3.4-3.3-1.6L15,15.5l-1.7-3-3.3 1.6 1.4-3.4-3.2-1.2 2.4-1.2-1.2-3 3.6 1.4z", "#000")),
  AM: h("#D90012", "#0033A0", "#F2A800"),
  AR: T(h("#74ACDF", "#fff", "#74ACDF"), C(15, 10, 2, "#F6B40E")),
  AT: h("#C8102E", "#fff", "#C8102E"),
  AU: T(R(0, 0, 30, 20, "#012169"), kanton(UK), Y(7.5, 15, 2.4, "#fff"), Y(22.5, 4.5, 1, "#fff"), Y(19.5, 9, 1, "#fff"), Y(25.5, 8, 1, "#fff"), Y(22.5, 16, 1.1, "#fff")),
  AZ: T(h("#00B5E2", "#EF3340", "#509E2F"), hilal(14, 10, 2.6, 0.7, "#EF3340", "#fff"), Y(17.2, 10, 1.2, "#fff")),
  BA: T(R(0, 0, 30, 20, "#002395"), G("8,0 22,0 22,20", "#FECB00"), Y(6, 1.5, 0.9, "#fff"), Y(8.6, 4.4, 0.9, "#fff"), Y(11.2, 7.3, 0.9, "#fff"), Y(13.8, 10.2, 0.9, "#fff"), Y(16.4, 13.1, 0.9, "#fff"), Y(19, 16, 0.9, "#fff")),
  BD: T(R(0, 0, 30, 20, "#006A4E"), C(13.5, 10, 5, "#F42A41")),
  BE: v("#000", "#FDDA24", "#EF3340"),
  BG: h("#fff", "#00966E", "#D62612"),
  BR: T(R(0, 0, 30, 20, "#009C3B"), G("15,2.5 27.5,10 15,17.5 2.5,10", "#FFDF00"), C(15, 10, 4.2, "#002776"), `<path d="M11,9.2Q15,8.2 19,11" fill="none" stroke="#fff" stroke-width=".8"/>`),
  BY: T(hw([2, "#C8313E"], [1, "#4AA657"]), R(0, 0, 3.4, 20, "#fff"), R(1.1, 0, 1.2, 20, "#C8313E")),
  CA: T(v("#D80621", "#fff", "#D80621"), G("15,3 16.2,5.7 17.8,5 17.2,8.6 19.8,6.8 19.4,8.4 21.4,8.8 20,10.4 20.8,11.2 16,12.6 16.3,15.6 15.3,15 15.3,17 14.7,17 14.7,15 13.7,15.6 14,12.6 9.2,11.2 10,10.4 8.6,8.8 10.6,8.4 10.2,6.8 12.8,8.6 12.2,5 13.8,5.7", "#D80621")),
  CH: T(R(0, 0, 30, 20, "#DA291C"), R(13, 4, 4, 12, "#fff"), R(9, 8, 12, 4, "#fff")),
  CL: T(h("#fff", "#D52B1E"), R(0, 0, 10, 10, "#0039A6"), Y(5, 5, 2.4, "#fff")),
  CN: T(R(0, 0, 30, 20, "#EE1C25"), Y(5, 5, 3, "#FFFF00"), Y(10, 2, 1, "#FFFF00", 20), Y(12, 4, 1, "#FFFF00", 40), Y(12, 7, 1, "#FFFF00"), Y(10, 9, 1, "#FFFF00", 20)),
  CO: hw([2, "#FCD116"], [1, "#003893"], [1, "#CE1126"]),
  CY: T(R(0, 0, 30, 20, "#fff"), P("M8,8.5c3-1.5 8-2.5 13-3.5l1.5 1-3 2.5c-2 1.5-6 2-8.5 1.5z", "#D57800"), P("M10,15q5,2.5 10,0q-5,1-10,0z", "#4E5B31")),
  CZ: T(h("#fff", "#D7141A"), G("0,0 15,10 0,20", "#11457E")),
  DE: h("#000", "#DD0000", "#FFCE00"),
  DK: iskandinav("#C8102E", "#fff"),
  DZ: T(v("#006233", "#fff"), hilal(15.5, 10, 4.6, 1.3, "#fff", "#D21034"),Y(17.3, 10, 1.9, "#D21034")),
  EE: h("#0072CE", "#000", "#fff"),
  EG: T(h("#CE1126", "#fff", "#000"), R(13.5, 8, 3, 4, "#C09300")),
  ES: T(hw([1, "#AA151B"], [2, "#F1BF00"], [1, "#AA151B"]), R(8, 7.5, 3.5, 5, "#AA151B")),
  FI: iskandinav("#fff", "#002F6C"),
  FR: v("#0055A4", "#fff", "#EF4135"),
  GB: UK,
  GE: T(R(0, 0, 30, 20, "#fff"), R(13, 0, 4, 20, "#FF0000"), R(0, 8, 30, 4, "#FF0000"),
    ...[[6.5, 4], [23.5, 4], [6.5, 16], [23.5, 16]].map(([x, y]) => R(x - 0.6, y - 2, 1.2, 4, "#FF0000") + R(x - 2, y - 0.6, 4, 1.2, "#FF0000"))),
  GH: T(h("#CE1126", "#FCD116", "#006B3F"), Y(15, 10, 3, "#000")),
  GR: T(...Array.from({ length: 9 }, (_, i) => R(0, (20 / 9) * i, 30, 20 / 9 + 0.05, i % 2 ? "#fff" : "#0D5EAF")),
    R(0, 0, 11.1, 11.1, "#0D5EAF"), R(4.44, 0, 2.22, 11.1, "#fff"), R(0, 4.44, 11.1, 2.22, "#fff")),
  HR: T(h("#FF0000", "#fff", "#171796"), R(12, 5.5, 6, 7, "#fff"), R(12, 5.5, 2, 2.33, "#FF0000"), R(16, 5.5, 2, 2.33, "#FF0000"), R(14, 7.83, 2, 2.33, "#FF0000"), R(12, 10.17, 2, 2.33, "#FF0000"), R(16, 10.17, 2, 2.33, "#FF0000")),
  HU: h("#CE2939", "#fff", "#477050"),
  ID: h("#CE1126", "#fff"),
  IE: v("#169B62", "#fff", "#FF883E"),
  IL: T(R(0, 0, 30, 20, "#fff"), R(0, 2, 30, 3, "#0038B8"), R(0, 15, 30, 3, "#0038B8"),
    `<path d="M15,6.3L18.2,11.9H11.8ZM15,13.7L11.8,8.1H18.2Z" fill="none" stroke="#0038B8" stroke-width=".8"/>`),
  IN: T(h("#FF9933", "#fff", "#138808"), `<circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" stroke-width=".7"/>`, C(15, 10, 0.6, "#000080")),
  IQ: T(h("#CE1126", "#fff", "#000"), R(10, 9, 10, 1.6, "#007A3D")),
  IR: T(h("#239F40", "#fff", "#DA0000"), C(15, 10, 1.8, "#DA0000"), C(15, 10, 1, "#fff")),
  IS: iskandinav("#02529C", "#DC1E35", "#fff"),
  IT: v("#009246", "#fff", "#CE2B37"),
  JO: T(h("#000", "#fff", "#007A3D"), G("0,0 15,10 0,20", "#CE1126"), Y(5, 10, 1.6, "#fff")),
  JP: T(R(0, 0, 30, 20, "#fff"), C(15, 10, 6, "#BC002D")),
  KG: T(R(0, 0, 30, 20, "#E8112D"), C(15, 10, 5.5, "#FFEF00"), C(15, 10, 3.2, "#E8112D"), `<path d="M12,9.5H18M12,10.8H18" stroke="#FFEF00" stroke-width=".6"/>`),
  KR: T(R(0, 0, 30, 20, "#fff"), C(15, 10, 5, "#0047A0"), P("M10,10A5,5 0 0 1 20,10A2.5,2.5 0 0 1 15,10A2.5,2.5 0 0 0 10,10Z", "#CD2E3A"),
    ...[[5, 4, 33.7], [25, 16, 33.7], [25, 4, -33.7], [5, 16, -33.7]].map(([x, y, a]) =>
      `<g transform="translate(${x} ${y}) rotate(${a})">${R(-2.2, -2, 4.4, 0.9, "#000")}${R(-2.2, -0.45, 4.4, 0.9, "#000")}${R(-2.2, 1.1, 4.4, 0.9, "#000")}</g>`)),
  KW: T(h("#007A3D", "#fff", "#CE1126"), G("0,0 7.5,6.7 7.5,13.3 0,20", "#000")),
  KZ: T(R(0, 0, 30, 20, "#00AFCA"), C(16, 8.5, 3.8, "#FEC50C"), P("M11,14q5,-2.5 10,0q-5,1.2-10,0z", "#FEC50C"), R(2, 1, 1.4, 18, "#FEC50C")),
  LB: T(hw([1, "#ED1C24"], [2, "#fff"], [1, "#ED1C24"]), G("15,5.3 19.5,14.2 10.5,14.2", "#00A651")),
  LT: h("#FDB913", "#006A44", "#C1272D"),
  LU: h("#ED2939", "#fff", "#00A1DE"),
  LV: hw([2, "#9E3039"], [1, "#fff"], [2, "#9E3039"]),
  LY: T(hw([1, "#E70013"], [2, "#000"], [1, "#239E46"]), hilal(14.3, 10, 2.8, 0.8, "#000", "#fff"), Y(17.2, 10, 1.3, "#fff")),
  MA: T(R(0, 0, 30, 20, "#C1272D"), `<path d="M15,5.6L17.6,13.6L10.8,8.7H19.2L12.4,13.6Z" fill="none" stroke="#006233" stroke-width=".9" stroke-linejoin="round"/>`),
  MD: T(v("#0046AE", "#FFD200", "#CC092F"), R(13.2, 7, 3.6, 5.5, "#B07E3F")),
  MK: T(R(0, 0, 30, 20, "#D20000"),
    `<path d="M0,0L15,10M30,0L15,10M0,20L15,10M30,20L15,10M15,0V20M0,10H30" stroke="#FFE600" stroke-width="2.2"/>`, C(15, 10, 3.6, "#D20000"), C(15, 10, 2.8, "#FFE600")),
  MX: T(v("#006847", "#fff", "#CE1126"), C(15, 10, 2.4, "#8C5A2B"), `<path d="M12.6,11q2.4,2.2 4.8,0" fill="none" stroke="#006847" stroke-width=".7"/>`),
  MY: T(...Array.from({ length: 14 }, (_, i) => R(0, (20 / 14) * i, 30, 20 / 14 + 0.05, i % 2 ? "#fff" : "#CC0001")),
    R(0, 0, 15, 11.43, "#010066"), hilal(5.5, 5.7, 3.8, 1, "#010066", "#FC0"), Y(11, 5.7, 2.2, "#FC0")),
  NG: v("#008751", "#fff", "#008751"),
  NL: h("#AE1C28", "#fff", "#21468B"),
  NO: iskandinav("#BA0C2F", "#00205B", "#fff"),
  NZ: T(R(0, 0, 30, 20, "#012169"), kanton(UK), Y(22.5, 4.5, 1.5, "#fff"), Y(22.5, 4.5, 1, "#C8102E"), Y(19.5, 9.5, 1.5, "#fff"), Y(19.5, 9.5, 1, "#C8102E"),
    Y(25.5, 8.5, 1.5, "#fff"), Y(25.5, 8.5, 1, "#C8102E"), Y(22.5, 16, 1.6, "#fff"), Y(22.5, 16, 1.1, "#C8102E")),
  PH: T(h("#0038A8", "#CE1126"), G("0,0 17.3,10 0,20", "#fff"), C(6, 10, 2, "#FCD116"), Y(1.8, 2.7, 0.8, "#FCD116"), Y(1.8, 17.3, 0.8, "#FCD116"), Y(14, 10, 0.8, "#FCD116")),
  PK: T(R(0, 0, 30, 20, "#01411C"), R(0, 0, 7.5, 20, "#fff"), C(18.5, 10, 5, "#fff"), C(20.3, 8.8, 4, "#01411C"), Y(21, 7.8, 1.9, "#fff", 30)),
  PL: h("#fff", "#DC143C"),
  PT: T(R(0, 0, 12, 20, "#006600"), R(12, 0, 18, 20, "#FF0000"), C(12, 10, 3.6, "#FFE000"), R(10.6, 8, 2.8, 3.8, "#fff"), `<rect x="10.6" y="8" width="2.8" height="3.8" fill="none" stroke="#FF0000" stroke-width=".6"/>`),
  QA: T(R(0, 0, 30, 20, "#8A1538"), G("0,0 8,0 10.5,1.1 8,2.2 10.5,3.3 8,4.4 10.5,5.6 8,6.7 10.5,7.8 8,8.9 10.5,10 8,11.1 10.5,12.2 8,13.3 10.5,14.4 8,15.6 10.5,16.7 8,17.8 10.5,18.9 8,20 0,20", "#fff")),
  RO: v("#002B7F", "#FCD116", "#CE1126"),
  RS: T(h("#C6363C", "#0C4076", "#fff"), R(8, 5, 5, 7, "#C6363C"), R(10, 6, 1, 5, "#fff"), R(8.8, 8, 3.4, 1, "#fff")),
  RU: h("#fff", "#0039A6", "#D52B1E"),
  SA: T(R(0, 0, 30, 20, "#006C35"), P("M8,6.5h14v1.2h-14zM9,8.6h12v1.2h-12zM10,10.7h10v1h-10z", "#fff"), R(9, 13.2, 12, 0.9, "#fff"), G("21,13 23,13.65 21,14.3", "#fff")),
  SE: iskandinav("#006AA7", "#FECC00"),
  SG: T(h("#EF3340", "#fff"), hilal(5.8, 5, 3, 1, "#EF3340", "#fff"), Y(9.3, 2.9, 0.65, "#fff"), Y(7.6, 4.1, 0.65, "#fff"), Y(11, 4.1, 0.65, "#fff"), Y(8.3, 6.3, 0.65, "#fff"), Y(10.3, 6.3, 0.65, "#fff")),
  SI: T(h("#fff", "#005DA4", "#ED1C24"), P("M7,4h5v3.5q0,3-2.5,4q-2.5-1-2.5-4z", "#005DA4"), P("M7.3,8.6l1.1-1.4 1.1,1.2 1.1-1.2 1.1,1.4v.8h-4.4z", "#fff")),
  SK: T(h("#fff", "#0B4EA2", "#EE1C25"), P("M7,5h8v6q0,3.5-4,5q-4-1.5-4-5z", "#fff"), P("M7.6,5.5h6.8v5.5q0,3-3.4,4.3q-3.4-1.3-3.4-4.3z", "#EE1C25"),
    R(10.5, 6.3, 1, 6.5, "#fff"), R(9, 7.6, 4, 0.9, "#fff"), R(8.4, 9.4, 5.2, 0.9, "#fff"), C(11, 13.4, 1.4, "#0B4EA2")),
  // Suriye: 2025'te kabul edilen bağımsızlık bayrağı (yeşil-beyaz-siyah, üç kırmızı yıldız)
  SY: T(h("#007A3D", "#fff", "#000"), Y(9, 10, 1.9, "#CE1126"), Y(15, 10, 1.9, "#CE1126"), Y(21, 10, 1.9, "#CE1126")),
  TH: hw([1, "#A51931"], [1, "#F4F5F8"], [2, "#2D2A4A"], [1, "#F4F5F8"], [1, "#A51931"]),
  TM: T(R(0, 0, 30, 20, "#00843D"), R(4, 0, 5, 20, "#D22630"), P("M5,2h3v3h-3zM5,7h3v3h-3zM5,12h3v3h-3zM5,17h3v2h-3z", "#FFB300"),
    hilal(14, 5, 2.4, 0.9, "#00843D", "#fff"), Y(17, 3.2, 0.6, "#fff"), Y(18, 5, 0.6, "#fff"), Y(17, 6.8, 0.6, "#fff")),
  TN: T(R(0, 0, 30, 20, "#E70013"), C(15, 10, 5, "#fff"), hilal(14.5, 10, 3.7, 0.9, "#fff", "#E70013"), Y(16.3, 10, 1.8, "#E70013", -18)),
  TR: T(R(0, 0, 30, 20, "#E30A17"), hilal(10.6, 10, 5, 1.25, "#E30A17", "#fff"), Y(16.2, 10, 2, "#fff", -18)),
  UA: h("#0057B7", "#FFD700"),
  US: T(...Array.from({ length: 13 }, (_, i) => R(0, (20 / 13) * i, 30, 20 / 13 + 0.05, i % 2 ? "#fff" : "#B22234")),
    R(0, 0, 12, 10.77, "#3C3B6E"),
    ...Array.from({ length: 20 }, (_, i) => C(1.4 + (i % 5) * 2.3 + (Math.floor(i / 5) % 2) * 1.15, 1.4 + Math.floor(i / 5) * 2.6, 0.45, "#fff"))),
  UZ: T(h("#0099B5", "#fff", "#1EB53A"), R(0, 6.5, 30, 0.5, "#CE1126"), R(0, 13, 30, 0.5, "#CE1126"), hilal(4.5, 3.3, 2.3, 0.8, "#0099B5", "#fff"),
    Y(8.5, 2, 0.45, "#fff"), Y(10, 2, 0.45, "#fff"), Y(11.5, 2, 0.45, "#fff"), Y(8.5, 3.6, 0.45, "#fff"), Y(10, 3.6, 0.45, "#fff"), Y(11.5, 3.6, 0.45, "#fff")),
  VN: T(R(0, 0, 30, 20, "#DA251D"), Y(15, 10.3, 6, "#FFFF00")),
  XK: T(R(0, 0, 30, 20, "#244AA5"), P("M11,9l3-1.5 4,0.5 2,2 -1,3 -3,1.5 -3,-1 -2,-2.5z", "#D0A650"), Y(9.5, 5.5, 0.8, "#fff"), Y(11.5, 4.3, 0.8, "#fff"), Y(13.8, 3.7, 0.8, "#fff"), Y(16.2, 3.7, 0.8, "#fff"), Y(18.5, 4.3, 0.8, "#fff"), Y(20.5, 5.5, 0.8, "#fff")),
  ZA: T(R(0, 0, 30, 10, "#E03C31"), R(0, 10, 30, 10, "#001489"),
    `<path d="M0,0L14,10L0,20M14,10H30" fill="none" stroke="#fff" stroke-width="6.6"/>`,
    `<path d="M0,0L14,10L0,20M14,10H30" fill="none" stroke="#007749" stroke-width="4"/>`,
    G("0,3.2 9.4,10 0,16.8", "#FFB81C"), G("0,4.8 7.2,10 0,15.2", "#000")),
};

/** Bu kod için çizilmiş bayrak var mı? */
export function bayrakVarMi(kod) {
  return Boolean(kod && B[String(kod).toUpperCase()]);
}

// Ülke adı: tarayıcının kendi bölge adları sözlüğü (Intl.DisplayNames).
let adSozlugu = null;
export function ulkeAdi(kod) {
  const k = String(kod ?? "").toUpperCase();
  try {
    if (!adSozlugu) adSozlugu = new Intl.DisplayNames([aktifDil()], { type: "region" });
    return adSozlugu.of(k) || k;
  } catch {
    return k;
  }
}

/**
 * <Bayrak kod="TR" />  — satır içi, metinle aynı hizada küçük bayrak.
 * @param {string} kod    ISO-3166 alpha-2
 * @param {number} boyut  yükseklik (px); genişlik 1.5 katı
 * @param {string} ad     erişilebilir ad (verilmezse ülke adı otomatik)
 */
export default function Bayrak({ kod, boyut = 14, ad, className = "", style }) {
  const k = String(kod ?? "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(k)) {
    return <span role="img" aria-label={ad || "Dünya"} className={className} style={style}>🌍</span>;
  }
  const etiket = ad || ulkeAdi(k);
  const ic = B[k] ?? R(0, 0, 30, 20, "#9AA3AF");
  return (
    <svg
      role="img"
      aria-label={etiket}
      viewBox="0 0 30 20"
      width={boyut * 1.5}
      height={boyut}
      className={`bd-bayrak ${className}`.trim()}
      style={{
        display: "inline-block",
        verticalAlign: "-0.15em",
        borderRadius: 2,
        boxShadow: "0 0 0 0.5px rgba(0,0,0,.28)",
        flex: "none",
        overflow: "hidden",
        ...style,
      }}
      // İçerik bu dosyadaki sabit tablodan gelir (kullanıcı girdisi yok).
      dangerouslySetInnerHTML={{ __html: `<title>${etiket.replace(/[<&>"]/g, "")}</title>${ic}` }}
    />
  );
}
