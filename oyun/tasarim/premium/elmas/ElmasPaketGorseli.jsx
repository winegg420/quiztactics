/**
 * ELMAS PAKETİ GÖRSELİ — 5 paket (Avuç · Kese · Sandık · Hazine · Define), avatarlarla aynı çizim dilinde
 * (AvatarProIllustrations.jsx): kalın koyu kontur (#0b1220), düz renk alanları, 2–3 ton gölge, her yüzeyde
 * net beyaz parlama. Dış varlık yok. Şimdilik yalnız /premium-onizleme; Ida onaylayınca Dükkân'a tek satırla:
 *   <span className="qt-dk-coin-gorsel …"><ElmasPaketGorseli seviye={i + 1} /></span>
 * 1 tek büyük elmas → 2 küçük elmas yığını → 3 altın kenarlı küçük sandık (dolu) → 4 taşan büyük süslü sandık
 * → 5 altın ışıklı dev elmas dağı. Işıltı yalnız transform/opacity; "hareketi azalt"ta durur.
 */
import "./elmas-paket.css";

const KONTUR = "#0b1220";
const R = { en: "#dcfcff", acik: "#8ae9ff", yan: "#5fd8f7", ana: "#2ec4f0", orta: "#1d9ee0", koyu: "#1565b8", derin: "#0d4a8f", pembe: "#ff7ab8" };
const ALTIN = { acik: "#fff3a0", ana: "#ffd23a", orta: "#ffb81f", koyu: "#e8940c" };
const MOR = { acik: "#9d74f0", ana: "#7a4ad8", koyu: "#5a2fb0", derin: "#3a1a78" };
const cz = (w) => ({ stroke: KONTUR, strokeWidth: w, strokeLinejoin: "round", strokeLinecap: "round" });

/** Pırlanta: düz üst tabla, sivri alt. Yerel ölçü 40 × 35 (merkez kuşak çizgisinin ortası). */
function Elmas({ x, y, s = 1, don = 0, pembe = true }) {
  const kw = (1.5 + s * 1.3) / s;   // dış kontur: büyükte kalın, küçükte okunur
  return (
    <g transform={`translate(${x} ${y}) rotate(${don}) scale(${s})`}>
      <path d="M-9 -13H9L20 -4L0 22L-20 -4Z" fill={R.ana} />
      <path d="M-20 -4L-9 -13L-5 -4Z" fill={R.acik} />
      <path d="M-9 -13H9L5 -4H-5Z" fill={R.en} />
      <path d="M9 -13L20 -4H5Z" fill={R.orta} />
      <path d="M-20 -4H-5L0 22Z" fill={R.yan} />
      <path d="M5 -4H20L0 22Z" fill={R.koyu} />
      {pembe && <path d="M8 -4H13.6L5.4 6.4Z" fill={R.pembe} />}
      <path d="M-20 -4H20M-5 -4L-9 -13M5 -4L9 -13M-5 -4L0 22M5 -4L0 22" fill="none" stroke={R.derin} strokeWidth={1.1 / Math.max(s, 0.6)} strokeLinejoin="round" />
      <path d="M-6.4 -10.4L-3.4 -6.6" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" />
      <path d="M-15.4 -2.6L-8 7.4" stroke="#fff" strokeWidth={1.7} strokeLinecap="round" opacity=".8" />
      <path d="M-9 -13H9L20 -4L0 22L-20 -4Z" fill="none" {...cz(kw)} />
    </g>
  );
}

/** Işıltı yıldızı — ayrı HTML katmanı (yalnız transform/opacity; SVG her karede yeniden boyanmaz). */
function Parilti({ x, y, r = 5, g = 0 }) {
  const i = r * 0.24;
  return (
    <span className="ep-p" style={{ left: `${(x / 120) * 100}%`, top: `${(y / 120) * 100}%`, width: `${((r * 2 + 2) / 120) * 100}%` }}>
      <svg viewBox={`${-r - 1} ${-r - 1} ${r * 2 + 2} ${r * 2 + 2}`} style={{ animationDelay: `${g}s` }} aria-hidden="true" focusable="false">
        <path d={`M0 ${-r}L${i} ${-i}L${r} 0L${i} ${i}L0 ${r}L${-i} ${i}L${-r} 0L${-i} ${-i}Z`} fill="#fff" stroke={KONTUR} strokeWidth=".9" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
// [x, y, r, gecikme] — seviyeye göre
const PARILTI = {
  1: [[94, 28, 7, 0], [24, 40, 4.5, 0.9], [88, 86, 3.6, 1.6]],
  2: [[98, 34, 6, 0], [20, 54, 4, 1.1]],
  3: [[96, 30, 5.4, 0], [24, 40, 3.8, 1.2]],
  4: [[104, 20, 6.4, 0], [16, 30, 4.4, 0.8], [80, 20, 3.4, 1.5]],
  5: [[100, 22, 7, 0], [18, 30, 5, 0.7], [84, 58, 3.6, 1.4], [36, 60, 3.2, 2.1]],
};

const Golge = ({ cx = 60, cy = 106, rx = 34 }) => <ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.16} fill={KONTUR} opacity=".16" />;

function Avuc() {
  return (
    <>
      <circle cx="60" cy="56" r="40" fill={R.acik} opacity=".22" />
      <Golge rx={26} />
      <Elmas x={60} y={62} s={1.9} />
    </>
  );
}

function Kese() {
  return (
    <>
      <circle cx="60" cy="62" r="42" fill={R.acik} opacity=".2" />
      <Golge rx={40} />
      <Elmas x={28} y={92} s={0.78} don={-12} />
      <Elmas x={92} y={92} s={0.78} don={10} pembe={false} />
      <Elmas x={60} y={94} s={0.9} don={3} />
      <Elmas x={42} y={68} s={0.86} don={-6} pembe={false} />
      <Elmas x={78} y={68} s={0.86} don={8} />
      <Elmas x={60} y={42} s={1.05} don={-2} />
    </>
  );
}

/** Sandık: gövde (mor ahşap), altın kenar, kilit; iç = içindekiler (arkadaki kapakla gövde arasında). */
function Sandik({ x0, x1, y0, y1, kapakY, ic, susle = false }) {
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const kay = Math.min(10, w * 0.12);
  return (
    <>
      {/* açık kapak (arkada) */}
      <path d={`M${x0 + 3} ${y0}L${x0 + kay} ${kapakY}H${x1 - kay}L${x1 - 3} ${y0}Z`} fill={MOR.derin} {...cz(2.6)} />
      <path d={`M${x0 + kay + 2} ${kapakY + 3}H${x1 - kay - 2}`} stroke={ALTIN.ana} strokeWidth="3" strokeLinecap="round" />
      <path d={`M${x0 + 8} ${y0 - 2}L${x0 + kay + 4} ${kapakY + 6}H${x1 - kay - 4}L${x1 - 8} ${y0 - 2}Z`} fill={R.acik} opacity=".35" />
      {ic}
      {/* gövde */}
      <rect x={x0} y={y0} width={w} height={y1 - y0} rx="5" fill={MOR.ana} {...cz(2.8)} />
      <path d={`M${x0 + 3} ${y1 - 6}H${x1 - 3}V${y1 - 3}H${x0 + 3}Z`} fill={MOR.koyu} />
      <path d={`M${x0 + 2} ${(y0 + y1) / 2 + 3}H${x1 - 2}`} stroke={MOR.koyu} strokeWidth="1.6" />
      <path d={`M${x0 + 5} ${y0 + 10}H${x1 - 5}`} stroke={MOR.acik} strokeWidth="2" strokeLinecap="round" opacity=".9" />
      {/* altın kenar bandı + dikey kayışlar + köşeler */}
      <rect x={x0 - 1.5} y={y0 - 1.5} width={w + 3} height="8" rx="3" fill={ALTIN.ana} {...cz(2.4)} />
      <path d={`M${x0 + 2} ${y0 + 0.8}H${x1 - 2}`} stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".9" />
      {[x0 + w * 0.2, x1 - w * 0.2].map((sx) => (
        <g key={sx}>
          <rect x={sx - 4} y={y0 + 6} width="8" height={y1 - y0 - 6} fill={ALTIN.orta} {...cz(2.2)} />
          <path d={`M${sx - 1.6} ${y0 + 9}V${y1 - 4}`} stroke={ALTIN.acik} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ))}
      {susle && [[x0, y1], [x1, y1]].map(([kx, ky], i) => (
        <g key={i} transform={`translate(${kx} ${ky}) scale(${i ? -1 : 1} 1)`}>
          <path d="M-2 2V-14L4 -8L10 -4L14 2Z" fill={ALTIN.ana} {...cz(2)} />
          <circle cx="3" cy="-3" r="2.4" fill="#ff2a4a" {...cz(1.2)} />
        </g>
      ))}
      {/* kilit */}
      <g transform={`translate(${cx} ${y0 + 12})`}>
        <path d="M-9 -6H9V6C9 11 4 14 0 15C-4 14 -9 11 -9 6Z" fill={ALTIN.ana} {...cz(2.4)} />
        <path d="M-5.6 -3H3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="0" cy="3" r="2.4" fill={KONTUR} />
        <path d="M-1.1 3.6L-1.8 9H1.8L1.1 3.6Z" fill={KONTUR} />
        {susle && <circle cx="0" cy="-10" r="3.4" fill={R.ana} {...cz(1.4)} />}
      </g>
    </>
  );
}

function SandikPaket() {
  return (
    <>
      <circle cx="60" cy="60" r="44" fill={R.acik} opacity=".18" />
      <Golge rx={42} />
      <Sandik x0={22} x1={98} y0={60} y1={100} kapakY={34} ic={(
        <>
          <Elmas x={40} y={56} s={0.6} don={-14} pembe={false} />
          <Elmas x={80} y={56} s={0.6} don={12} />
          <Elmas x={60} y={50} s={0.78} don={2} />
        </>
      )} />
    </>
  );
}

function Hazine() {
  return (
    <>
      <circle cx="60" cy="56" r="50" fill={R.acik} opacity=".2" />
      <circle cx="60" cy="50" r="30" fill="#fff" opacity=".25" />
      <Golge rx={52} cy={108} />
      <Sandik x0={14} x1={106} y0={58} y1={100} kapakY={24} susle ic={(
        <>
          <Elmas x={30} y={54} s={0.6} don={-20} pembe={false} />
          <Elmas x={90} y={54} s={0.6} don={18} />
          <Elmas x={46} y={46} s={0.72} don={-8} />
          <Elmas x={74} y={46} s={0.72} don={10} pembe={false} />
          <Elmas x={60} y={34} s={0.95} don={0} />
        </>
      )} />
      {/* taşanlar: kenardan düşen ve yerdekiler */}
      <Elmas x={12} y={70} s={0.5} don={-38} pembe={false} />
      <Elmas x={22} y={104} s={0.52} don={-16} />
      <Elmas x={100} y={104} s={0.56} don={22} pembe={false} />
      <Elmas x={60} y={108} s={0.44} don={6} />
    </>
  );
}

function Define() {
  const yigin = [
    [16, 100, 0.5, -14], [34, 102, 0.56, 8], [52, 104, 0.52, -4], [70, 104, 0.54, 12], [88, 102, 0.56, -10], [104, 100, 0.5, 16],
    [26, 86, 0.54, 10], [44, 88, 0.58, -8], [62, 90, 0.56, 4], [80, 88, 0.58, -12], [96, 86, 0.52, 14],
    [36, 72, 0.56, -6], [54, 74, 0.6, 10], [72, 74, 0.6, -8], [88, 72, 0.52, 6],
  ];
  return (
    <>
      <circle cx="60" cy="50" r="40" fill={ALTIN.acik} opacity=".55" />
      <circle cx="60" cy="48" r="24" fill="#fff" opacity=".55" />
      <Golge rx={54} cy={110} />
      <path d="M8 106C20 80 40 58 60 52C80 58 100 80 112 106Z" fill={R.orta} {...cz(2.6)} />
      <path d="M16 102C28 82 44 64 60 58" fill="none" stroke={R.acik} strokeWidth="3" strokeLinecap="round" opacity=".8" />
      {yigin.map(([x, y, s, d], i) => <Elmas key={i} x={x} y={y} s={s} don={d} pembe={i % 3 === 0} />)}
      <Elmas x={60} y={42} s={1.3} />
    </>
  );
}

const PAKET = [null, Avuc, Kese, SandikPaket, Hazine, Define];

const ISINLAR = Array.from({ length: 12 }, (_, i) => i * 30);

/** @param {{ seviye: 1|2|3|4|5, hareketli?: boolean, className?: string }} p */
export default function ElmasPaketGorseli({ seviye = 1, hareketli = true, className = "" }) {
  const s = Math.min(5, Math.max(1, Math.round(seviye)));
  const Paket = PAKET[s];
  return (
    <span className={`ep ep--${s}${hareketli ? " ep--oynar" : ""} ${className}`.trim()} aria-hidden="true">
      {s === 5 && (
        <svg className="ep-isinlar" viewBox="0 0 120 120" focusable="false">
          {ISINLAR.map((a) => <path key={a} d="M60 50L55 -8H65Z" transform={`rotate(${a} 60 50)`} fill={ALTIN.ana} opacity=".55" />)}
        </svg>
      )}
      <svg className="ep-govde" viewBox="0 0 120 120" focusable="false"><Paket /></svg>
      {PARILTI[s].map(([x, y, r, g], i) => <Parilti key={i} x={x} y={y} r={r} g={g} />)}
    </span>
  );
}
