/**
 * YENİ LİG ARKA PLANLARI (9 Eki 2026, 4. tur — yalnız /lig-sahne-onizleme "Yeni"; canlıda hiçbir yer `sahneArka` vermez).
 * Eski sahnenin kimliği korunur: ışınlar avatarın arkasından (50% 36%) açılır, her lig kendi renk ailesinde.
 * a1 sade: iki tonlu ışın bandı + merkez parlama + köşede yarım-ton noktalar.
 * a2 orta: + kenar gölgesi + avatar çevresinde ince halka + lige özgü seyrek motif.
 * a3 zengin: + ışınlarda ikinci (dar) parıltı bandı + daha çok motif + alt zemin parlaması + yoğun yarım-ton.
 * Merkez (avatar + isim + rozet sütunu) sade kalır: motifler yalnız kenar şeritlerinde (|x| ≥ 112 ya da üst köşeler).
 * Statik SVG, hareket yok. Dil: #1f2a44 kontur, 3 ton, sol-üstten ışık, tek beyaz vurgu. Katman: .qt-ok-sahne (z −1, kırpılı).
 */
import { useId } from "react";

const K = "#1f2a44";
/* zemin / isik = eski token değerleri (tokenlar.css 7c); derin = ışının gölge yarısı; koyu/orta/acik = motif 3 tonu */
const PALET = {
  bronz:  { zemin: "#fbe9d9", isik: "#f0c29c", derin: "#e6a87a", koyu: "#B4612A", orta: "#E39457", acik: "#FFD3AE" },
  gumus:  { zemin: "#e4eefb", isik: "#98b6e0", derin: "#7f9fcf", koyu: "#4F74AD", orta: "#9FBCE6", acik: "#F4F8FF" },
  altin:  { zemin: "#faeeda", isik: "#fac775", derin: "#efb052", koyu: "#C58F0E", orta: "#F5C542", acik: "#FFE9A3" },
  elmas:  { zemin: "#dff6fc", isik: "#9fe3f4", derin: "#76d2ea", koyu: "#1E7DB0", orta: "#4DBDEB", acik: "#E2F7FF" },
  efsane: { zemin: "#f1e6ff", isik: "#d2b1ff", derin: "#b993f5", koyu: "#6A35B8", orta: "#A774F2", acik: "#EBDDFF" },
};
const r1 = (x) => Math.round(x * 10) / 10;
const nok = (r, a) => [r1(r * Math.cos((a * Math.PI) / 180)), r1(r * Math.sin((a * Math.PI) / 180))];
const cokgen = (n) => n.map((p) => p.join(",")).join(" ");
const kama = (a0, a1, R = 900) => cokgen([[0, 0], nok(R, a0), nok(R, a1)]);

/* ---------- motifler (merkez 0,0; ~12 px) ---------- */
function Kivilcim({ x, y, s = 1, t }) {   // Bronz: 4 kollu kıvılcım
  const p = [[0, -9], [2.2, -2.2], [9, 0], [2.2, 2.2], [0, 9], [-2.2, 2.2], [-9, 0], [-2.2, -2.2]];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <polygon points={cokgen(p)} fill={t.orta} />
      <polygon points={cokgen([[0, -9], [0, 0], [-9, 0], [-2.2, -2.2]])} fill={t.acik} />
      <polygon points={cokgen([[9, 0], [2.2, 2.2], [0, 9], [0, 0]])} fill={t.koyu} />
      <polygon points={cokgen(p)} fill="none" stroke={K} strokeWidth="1.6" strokeLinejoin="round" />
    </g>
  );
}
function Zimba({ x, y, t }) {             // Bronz: 3'lü zımba noktası
  return <g>{[-7, 0, 7].map((d) => <circle key={d} cx={x + d} cy={y} r="2" fill={t.koyu} stroke={K} strokeWidth="1" />)}</g>;
}
function Kristal({ x, y, s = 1, t }) {    // Gümüş: uzun altıgen kristal
  const p = [[0, -12], [5, -6], [5, 6], [0, 12], [-5, 6], [-5, -6]];
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(-18)`}>
      <polygon points={cokgen(p)} fill={t.orta} />
      <polygon points={cokgen([[0, -12], [0, 12], [-5, 6], [-5, -6]])} fill={t.acik} />
      <polygon points={cokgen([[5, -6], [5, 6], [0, 12], [0, 4]])} fill={t.koyu} />
      <polygon points={cokgen(p)} fill="none" stroke={K} strokeWidth="1.6" strokeLinejoin="round" />
      <line x1="0" y1="-12" x2="0" y2="12" stroke={K} strokeWidth="1" />
    </g>
  );
}
function Isilti({ x, y, s = 1, t }) {     // Ortak: ince 4 kollu parıltı (kontursuz değil — ince kontur)
  const p = [[0, -8], [1.4, -1.4], [8, 0], [1.4, 1.4], [0, 8], [-1.4, 1.4], [-8, 0], [-1.4, -1.4]];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <polygon points={cokgen(p)} fill={t.acik} stroke={K} strokeWidth="1.3" strokeLinejoin="round" />
    </g>
  );
}
function Sikke({ x, y, s = 1, t }) {      // Altın: sikke
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle r="9" fill={t.orta} />
      <path d="M-6.4 6.4A9 9 0 0 1 6.4 -6.4" fill="none" stroke={t.acik} strokeWidth="3" />
      <path d="M6.4 -6.4A9 9 0 0 1 -6.4 6.4" fill="none" stroke={t.koyu} strokeWidth="3" />
      <circle r="9" fill="none" stroke={K} strokeWidth="1.8" />
      <circle r="5" fill="none" stroke={t.koyu} strokeWidth="1.4" />
      <rect x="-1.2" y="-3" width="2.4" height="6" fill={t.koyu} />
    </g>
  );
}
function Faset({ x, y, s = 1, t }) {      // Elmas: pırlanta
  const S = 9, GL = [-S, 0], GR = [S, 0], TL = [-0.55 * S, -0.62 * S], TR = [0.55 * S, -0.62 * S], B = [0, S], ML = [-0.4 * S, 0], MR = [0.4 * S, 0];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <polygon points={cokgen([GL, GR, B])} fill={t.orta} />
      <polygon points={cokgen([GL, ML, B])} fill={t.acik} />
      <polygon points={cokgen([MR, GR, B])} fill={t.koyu} />
      <polygon points={cokgen([TL, TR, MR, ML])} fill={t.acik} />
      <polygon points={cokgen([TR, GR, MR])} fill={t.koyu} />
      <polygon points={cokgen([GL, TL, ML])} fill={t.orta} />
      <polygon points={cokgen([GL, TL, TR, GR, B])} fill="none" stroke={K} strokeWidth="1.6" strokeLinejoin="round" />
    </g>
  );
}
function Kirik({ x, y, s = 1, t }) {      // Elmas: faset kırığı (üçgen parça)
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(20)`}>
      <polygon points="-6,5 0,-7 6,5" fill={t.orta} />
      <polygon points="-6,5 0,-7 0,5" fill={t.acik} />
      <polygon points="-6,5 0,-7 6,5" fill="none" stroke={K} strokeWidth="1.4" strokeLinejoin="round" />
    </g>
  );
}
function Yildiz5({ x, y, s = 1, t }) {    // Efsane: 5 köşeli yıldız
  const p = Array.from({ length: 10 }, (_, k) => { const rr = k % 2 ? 3.8 : 8.5, a = (Math.PI / 5) * k - Math.PI / 2; return [r1(rr * Math.cos(a)), r1(rr * Math.sin(a))]; });
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <polygon points={cokgen(p)} fill={t.acik} />
      <polygon points={cokgen([[0, 3.8], ...p.filter(([px]) => px >= 0)])} fill={t.orta} />
      <polygon points={cokgen(p)} fill="none" stroke={K} strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  );
}
function TacSiluet({ x, y, s = 1, t }) {  // Efsane: taç silueti (soluk)
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity=".55">
      <polygon points="-11,6 -11,-5 -5.5,0 0,-8 5.5,0 11,-5 11,6" fill={t.orta} stroke={K} strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="-11" y="3" width="22" height="3" fill={t.koyu} />
    </g>
  );
}
function Toz({ x, y, t }) {               // Efsane: yıldız tozu
  return <g>{[[0, 0, 1.8], [6, -4, 1.2], [-5, 5, 1.1], [9, 4, 0.9]].map(([dx, dy, r]) => <circle key={`${dx}${dy}`} cx={x + dx} cy={y + dy} r={r} fill={t.acik} stroke={K} strokeWidth=".8" />)}</g>;
}

/* Lig başına motif çifti (ana, ikincil); konumlar avatar merkezine göre px. Sol ve sağ şerit simetrik değil (el çizimi hissi). */
const MOTIF = {
  bronz:  [Kivilcim, (p) => <Zimba {...p} />],
  gumus:  [Kristal, Isilti],
  altin:  [Sikke, Isilti],
  elmas:  [Faset, Kirik],
  efsane: [Yildiz5, (p) => <Toz {...p} />],
};
// [x, y, ölçek, tür(0 ana / 1 ikincil)] — a2 ilk 6'yı, a3 hepsini çizer
const YER = [
  [-128, -66, 1, 0], [134, -40, 0.9, 1], [-142, 40, 0.8, 1], [126, 92, 1, 0], [-122, 168, 0.9, 0], [138, 210, 0.8, 1],
  [-96, -104, 0.7, 1], [100, -104, 0.85, 0], [-150, 120, 0.7, 0], [150, 150, 0.7, 1], [-140, 250, 0.8, 1], [122, 290, 0.9, 0],
  [-150, -20, 0.6, 0], [155, 20, 0.6, 0],
];
const EFSANE_TAC = [[-118, 6, 0.9], [120, 30, 0.8]];

/** Köşede yarım-ton nokta üçgeni (köşeden uzaklaştıkça küçülür). sx/sy: köşe yönü. */
function YarimTon({ sx, sy, renk, adim = 9, n = 6, rMax = 2.6 }) {
  const noktalar = [];
  for (let i = 0; i < n; i += 1) for (let j = 0; j < n - i; j += 1) {
    const r = rMax * (1 - (i + j) / n);
    if (r > 0.5) noktalar.push(<circle key={`${i}-${j}`} cx={sx * (6 + i * adim + (j % 2 ? adim / 2 : 0) * 0)} cy={sy * (6 + j * adim)} r={r1(r)} fill={renk} />);
  }
  return <svg x={sx > 0 ? 0 : "100%"} y={sy > 0 ? 0 : "100%"} overflow="visible">{noktalar}</svg>;
}

export default function LigSahneArka({ lig, seviye = "a1" }) {
  const id = useId().replace(/:/g, "");
  const p = PALET[lig];
  if (!p) return null;
  const s = seviye === "a3" ? 3 : seviye === "a2" ? 2 : 1;
  const [Ana, Ikincil] = MOTIF[lig];
  const yerler = s === 1 ? [] : s === 2 ? YER.slice(0, 6) : YER;
  return (
    <span className="qt-ok-sahne" aria-hidden="true">
      <svg width="100%" height="100%" focusable="false" style={{ display: "block" }}>
        <defs>
          <radialGradient id={`${id}p`} cx="0" cy="0" r={s === 3 ? 150 : 125} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".55" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}v`} cx="50%" cy="36%" r="75%">
            <stop offset=".55" stopColor={p.koyu} stopOpacity="0" /><stop offset="1" stopColor={p.koyu} stopOpacity={s === 3 ? 0.28 : 0.2} />
          </radialGradient>
          <linearGradient id={`${id}z`} x1="0" y1="0" x2="0" y2="1">
            <stop offset=".72" stopColor={p.acik} stopOpacity="0" /><stop offset="1" stopColor={p.acik} stopOpacity=".7" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill={p.zemin} />
        <svg x="50%" y="36%" overflow="visible">
          {/* ışın: 18 çift; her açık bandın sağ yarısı gölge tonunda (katlanmış şerit derinliği) */}
          {Array.from({ length: 9 }, (_, k) => {
            const a = k * 40 - 90;
            return (
              <g key={k}>
                <polygon points={kama(a + 20, a + 40)} fill={p.isik} />
                <polygon points={kama(a + 30, a + 40)} fill={p.derin} opacity=".55" />
                {s === 3 && <polygon points={kama(a + 8, a + 11)} fill={p.acik} opacity=".7" />}
              </g>
            );
          })}
          {s >= 2 && <>
            <circle r="96" fill="none" stroke={p.acik} strokeWidth="6" opacity=".8" />
            <circle r="96" fill="none" stroke={p.koyu} strokeWidth="1.4" strokeDasharray="2 7" opacity=".55" />
          </>}
          <circle r={s === 3 ? 150 : 125} fill={`url(#${id}p)`} />
        </svg>
        {s >= 2 && <rect width="100%" height="100%" fill={`url(#${id}v)`} />}
        {s === 3 && <rect width="100%" height="100%" fill={`url(#${id}z)`} />}
        {[[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sy]) => (
          <YarimTon key={`${sx}${sy}`} sx={sx} sy={sy} renk={p.koyu} n={s === 3 ? 8 : s === 2 ? 7 : 5} rMax={s === 1 ? 2.2 : 2.8} />
        ))}
        {s >= 2 && (
          <svg x="50%" y="36%" overflow="visible">
            {lig === "efsane" && EFSANE_TAC.map(([x, y, sc]) => <TacSiluet key={x} x={x} y={y} s={s === 3 ? sc : sc * 0.85} t={p} />)}
            {yerler.map(([x, y, sc, tur]) => {
              const M = tur ? Ikincil : Ana;
              return <M key={`${x},${y}`} x={x} y={y} s={sc} t={p} />;
            })}
            {/* tek beyaz vurgu: sol-üstteki parıltı */}
            <path d="M-134 -72l3 -3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </svg>
    </span>
  );
}
