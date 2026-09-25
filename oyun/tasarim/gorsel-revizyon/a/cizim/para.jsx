// COIN ve ELMAS ikonları — görsel revizyon (Bölüm 1–2). Elmas paketi görselleriyle (premium/elmas/) aynı aile:
// kalın #0b1220 kontur, düz dolgu + hücre gölgesi, ışık sol üstten, tek beyaz parlama vuruşu, pırlanta fasetleri.
// Boy kuralı (A9): ≤ 28 px "küçük çizim" (iç ayrıntı azalır, kontur kalınlaşır) · üstü tam çizim.
// Dışa aktarım: <CoinA boyut={20} /> … <ElmasA boyut={48} hareketli />  (Ajan B oyuncu kartında da kullanabilir)
import { METAL, ELMAS_FASET as R } from "../../palet.js";
import { BEYAZ, Hareket, HucreGolge, Isiltilar, K, Parlama, cokgen, cz, dilim, f, kutup, useKimlik, yay, yildizYolu } from "./ortak.jsx";

const A = METAL.altin;
export const daire = (cx, cy, r) => `M${f(cx - r)} ${cy}a${r} ${r} 0 1 0 ${f(2 * r)} 0a${r} ${r} 0 1 0 ${f(-2 * r)} 0Z`;
const elips = (cx, cy, rx, ry) => `M${f(cx - rx)} ${cy}a${rx} ${ry} 0 1 0 ${f(2 * rx)} 0a${rx} ${ry} 0 1 0 ${f(-2 * rx)} 0Z`;
const kucukMu = (boyut) => boyut <= 28;
const konturW = (boyut) => (kucukMu(boyut) ? 4.8 : 3.2);

// Şeker Q (uygulama ikonu) harfi — public/quiztactics-sekerq-favicon.svg ile aynı yol
const Q_YOL = "M56 10C28 10 10 29 10 58s18 48 46 48c10 0 19-2 27-7l12 11h21L94 88c7-8 10-18 10-30 0-29-19-48-48-48Zm0 23c15 0 25 10 25 25S71 83 56 83 33 73 33 58s8-25 23-25Z";
const Q_KUYRUK = "m73 78 21 10 15 15H94L69 85Z";
/** Kabartma Q: gölge kopyası (sağ alt) + açık dolgu + kenar çizgisi. s = ölçek (≈ genişlik / 106). */
export function KabartmaQ({ x, y, s, sx = 1, dolgu = A.acik, golge = A.kenar, cizgi = A.kenar, kuyruk = BEYAZ, cw = 1.4, kay = 1.5 }) {
  const t = (dx, dy) => `translate(${f(x + dx)} ${f(y + dy)}) scale(${f(s * sx)} ${f(s)}) translate(-60 -60) skewX(-7) translate(7 0)`;
  const w = f(cw / s);
  return (
    <>
      <g transform={t(kay, kay)} fill={golge}><path d={Q_YOL} fillRule="evenodd" /><path d={Q_KUYRUK} /></g>
      <g transform={t(0, 0)} strokeLinejoin="round">
        <path d={Q_YOL} fillRule="evenodd" fill={dolgu} stroke={cizgi} strokeWidth={w} />
        <path d={Q_KUYRUK} fill={kuyruk} stroke={cizgi} strokeWidth={w} />
      </g>
    </>
  );
}

/** Küçük boy (≤ 28 px) Q: kabartma okunmaz → koyu oyma harf, beyaz kuyruk (Şeker Q'nun tersi), tek parça. */
export function KucukQ({ x, y, s, sx = 1 }) {
  const t = `translate(${f(x)} ${f(y)}) scale(${f(s * sx)} ${f(s)}) translate(-60 -60) skewX(-7) translate(7 0)`;
  return (
    <g transform={t} strokeLinejoin="round">
      <path d={Q_YOL} fillRule="evenodd" fill={A.kenar} />
      <path d={Q_KUYRUK} fill={BEYAZ} stroke={A.kenar} strokeWidth={f(2 / s)} />
    </g>
  );
}

/** Ön görünüş sikke gövdesi (kalınlık + yüz + kenar ışığı + çukur alan). amblem = alan içine çizilen öğe. */
function Sikke({ id, cx = 32, cy = 30, r = 25, t = 4, w = 3.2, kucuk = false, amblem, yuz }) {
  const ic = r - (kucuk ? 5.5 : 7);
  const yuzYol = yuz ?? daire(cx, cy, r);
  return (
    <>
      {/* kalınlık (yan yüz) */}
      <path d={yuz ? yuz : daire(cx, cy + t, r)} transform={yuz ? `translate(0 ${t})` : undefined} fill={A.koyu} {...cz(w)} />
      {!kucuk && Array.from({ length: 9 }, (_, i) => {
        const a = 112 + i * 17;
        const [x0, y0] = kutup(r, a, cx, cy);
        return <path key={i} d={`M${x0} ${f(y0 + 0.6)}V${f(y0 + t - 0.4)}`} stroke={A.kenar} strokeWidth="1.1" strokeLinecap="round" />;
      })}
      {/* yüz: sağ altta hücre gölgesi */}
      <HucreGolge id={`${id}y`} d={yuzYol} acik={A.orta} koyu={A.koyu} dx={-2.2} dy={-2.6} />
      {/* kabarık kenarın ışık aldığı sol üst yay */}
      <path d={dilim(r - 1, ic + 1.2, 262, 352, cx, cy)} fill={A.acik} />
      {/* çukur alan: sol üstte kenarın gölgesi */}
      {!kucuk && (
        <>
          <HucreGolge id={`${id}a`} d={daire(cx, cy, ic)} acik={A.orta} koyu={A.koyu} dx={1.8} dy={2.2} />
          <circle cx={cx} cy={cy} r={ic} fill="none" stroke={A.kenar} strokeWidth="1.4" />
        </>
      )}
      {amblem}
      <Parlama d={yay(r - 3.4, 292, 334, cx, cy)} w={kucuk ? 3.2 : 2.6} />
      <path d={yuzYol} fill="none" {...cz(w)} />
    </>
  );
}

function Kap({ boyut, hareketli, isilti, etiket, children, kutu = 64 }) {
  const oynar = hareketli && boyut >= 40;
  return (
    <Hareket className="gra-para" style={{ width: boyut, height: boyut }} role={etiket ? "img" : undefined} aria-label={etiket} aria-hidden={etiket ? undefined : "true"}>
      <svg viewBox={`0 0 ${kutu} ${kutu}`} focusable="false">{children}</svg>
      {oynar && <Isiltilar noktalar={isilti} kutu={kutu} />}
    </Hareket>
  );
}

// ---------------------------------------------------------------- COIN A — Q Sikke
export function CoinA({ boyut = 48, hareketli = false, etiket }) {
  const id = useKimlik("ca");
  const k = kucukMu(boyut);
  return (
    <Kap boyut={boyut} hareketli={hareketli} etiket={etiket} isilti={[[52, 12, 6, 0], [10, 44, 4, 1.2]]}>
      <Sikke id={id} w={konturW(boyut)} kucuk={k} t={k ? 3.6 : 4}
             amblem={k ? <KucukQ x={32.4} y={30.4} s={0.27} /> : <KabartmaQ x={32.6} y={30.4} s={0.2} cw={1.5} kay={1.5} />} />
    </Kap>
  );
}

// ---------------------------------------------------------------- COIN B — Tırtıklı yıldız sikke
function tirtikli(cx, cy, r, n = 16) {
  let d = "";
  for (let i = 0; i <= n; i += 1) {
    const a = (i * 360) / n;
    const [x, y] = kutup(r, a, cx, cy);
    if (i === 0) d += `M${x} ${y}`;
    else d += `A${f((Math.PI * r) / n / 1.1)} ${f((Math.PI * r) / n / 1.1)} 0 0 1 ${x} ${y}`;
  }
  return `${d}Z`;
}
export function CoinB({ boyut = 48, hareketli = false, etiket }) {
  const id = useKimlik("cb");
  const k = kucukMu(boyut);
  const yol = tirtikli(32, 30, 24.5, k ? 12 : 16);
  return (
    <Kap boyut={boyut} hareketli={hareketli} etiket={etiket} isilti={[[53, 12, 6, 0], [9, 42, 4, 1.2]]}>
      <Sikke id={id} w={konturW(boyut)} kucuk={k} t={k ? 3.6 : 4} r={24.5} yuz={yol}
             amblem={(
               <>
                 <path d={yildizYolu(5, k ? 13 : 11, k ? 6 : 5, 33.4, 32.2)} fill={A.kenar} strokeLinejoin="round" stroke={A.kenar} strokeWidth="2" />
                 <path d={yildizYolu(5, k ? 13 : 11, k ? 6 : 5, 32, 30.6)} fill={A.acik} stroke={A.kenar} strokeWidth={k ? 2.2 : 1.6} strokeLinejoin="round" />
               </>
             )} />
    </Kap>
  );
}

// ---------------------------------------------------------------- COIN C — Dönen (eğik) sikke
export function CoinC({ boyut = 48, hareketli = false, etiket }) {
  const id = useKimlik("cc");
  const k = kucukMu(boyut);
  const w = konturW(boyut);
  const cx = 28, cy = 32, rx = 19.5, ry = 25, t = k ? 6 : 7;
  const yuz = elips(cx, cy, rx, ry);
  const ic = elips(cx, cy, rx - 5.4, ry - 6.6);
  return (
    <Kap boyut={boyut} hareketli={hareketli} etiket={etiket} isilti={[[54, 10, 6, 0], [8, 50, 4, 1.2]]}>
      {/* yan yüz: arka elips + bağlayan bant */}
      <path d={`M${cx} ${cy - ry}H${cx + t}A${rx} ${ry} 0 0 1 ${cx + t} ${cy + ry}H${cx}Z`} fill={A.koyu} {...cz(w)} />
      <path d={elips(cx + t, cy, rx, ry)} fill={A.koyu} {...cz(w)} />
      {!k && Array.from({ length: 11 }, (_, i) => {
        const a = -70 + i * 14;
        const x0 = cx + rx * Math.cos(a * Math.PI / 180);
        const y0 = cy + ry * Math.sin(a * Math.PI / 180);
        return <path key={i} d={`M${f(x0 + 0.8)} ${f(y0)}H${f(x0 + t - 0.6)}`} stroke={A.kenar} strokeWidth="1.1" strokeLinecap="round" />;
      })}
      <HucreGolge id={`${id}y`} d={yuz} acik={A.orta} koyu={A.koyu} dx={-2} dy={-2.4} />
      {!k && (
        <>
          <HucreGolge id={`${id}a`} d={ic} acik={A.orta} koyu={A.koyu} dx={1.6} dy={2} />
          <path d={ic} fill="none" stroke={A.kenar} strokeWidth="1.4" />
        </>
      )}
      {k ? <KucukQ x={cx + 0.4} y={cy + 0.4} s={0.26} sx={0.82} /> : <KabartmaQ x={cx + 0.6} y={cy + 0.4} s={0.19} sx={0.82} cw={1.5} />}
      <Parlama d={`M${f(cx - rx + 4.2)} ${f(cy - 5)}Q${f(cx - rx + 5)} ${f(cy - ry + 7)} ${f(cx - 4)} ${f(cy - ry + 3.6)}`} w={k ? 3.2 : 2.6} />
      <path d={yuz} fill="none" {...cz(w)} />
    </Kap>
  );
}

// ---------------------------------------------------------------- COIN D — İki sikke (yığın)
export function CoinD({ boyut = 48, hareketli = false, etiket }) {
  const id = useKimlik("cd");
  const k = kucukMu(boyut);
  const w = konturW(boyut);
  return (
    <Kap boyut={boyut} hareketli={hareketli} etiket={etiket} isilti={[[56, 8, 5, 0], [6, 30, 3.6, 1.2]]}>
      <Sikke id={`${id}1`} cx={42} cy={21} r={17} t={3.4} w={w} kucuk
             amblem={null} />
      <Sikke id={`${id}2`} cx={26} cy={36} r={21} t={4} w={w} kucuk={k}
             amblem={<KabartmaQ x={26.6} y={36.4} s={k ? 0.21 : 0.17} cw={k ? 2.2 : 1.4} />} />
    </Kap>
  );
}

// ================================================================= ELMAS
/** Pırlanta (elmas paketi Elmas ile aynı kesim ve tonlar). Yerel ölçü 40 × 35 → s ile büyür; (x,y) = kuşak ortası. */
export function Pirlanta({ x = 32, y = 26, s = 1.3, w = 3.2, kucuk = false, pembe = true, don = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${don})`}>
      <g transform={`scale(${s})`}>
        <path d="M-9 -13H9L20 -4L0 22L-20 -4Z" fill={R.ana} />
        <path d="M-20 -4L-9 -13L-5 -4Z" fill={R.acik} />
        <path d="M-9 -13H9L5 -4H-5Z" fill={R.en} />
        <path d="M9 -13L20 -4H5Z" fill={R.orta} />
        <path d="M-20 -4H-5L0 22Z" fill={R.yan} />
        <path d="M5 -4H20L0 22Z" fill={R.koyu} />
        {pembe && !kucuk && <path d="M8 -4H13.6L5.4 6.4Z" fill={R.pembe} />}
        <path d={kucuk ? "M-20 -4H20M-5 -4L0 22M5 -4L0 22" : "M-20 -4H20M-5 -4L-9 -13M5 -4L9 -13M-5 -4L0 22M5 -4L0 22"} fill="none" stroke={R.derin}
              strokeWidth={f((kucuk ? 1.8 : 1.15) / s * 1.3)} strokeLinejoin="round" strokeLinecap="round" />
        <path d={kucuk ? "M-6 -9.6L-12 -4.8" : "M-6.4 -10.4L-3.4 -6.6"} stroke={BEYAZ} strokeWidth={f((kucuk ? 3.4 : 2.6) / s * 1.3 * 0.8)} strokeLinecap="round" />
        {!kucuk && <path d="M-15.4 -2.6L-8 7.4" stroke={BEYAZ} strokeWidth={f(1.7 / s)} strokeLinecap="round" opacity=".8" />}
        <path d="M-9 -13H9L20 -4L0 22L-20 -4Z" fill="none" stroke={K} strokeWidth={f(w / s)} strokeLinejoin="round" />
      </g>
    </g>
  );
}

// ---------------------------------------------------------------- ELMAS A — Pırlanta (paket ailesi)
export function ElmasA({ boyut = 48, hareketli = false, etiket }) {
  const k = kucukMu(boyut);
  return (
    <Kap boyut={boyut} hareketli={hareketli} etiket={etiket} isilti={[[54, 10, 6, 0], [9, 44, 4, 1.3]]}>
      <Pirlanta x={32} y={k ? 24.4 : 25} s={k ? 1.46 : 1.34} w={konturW(boyut)} kucuk={k} />
    </Kap>
  );
}

// ---------------------------------------------------------------- ELMAS B — Sekizgen (üstten kesim)
export function ElmasB({ boyut = 48, hareketli = false, etiket }) {
  const k = kucukMu(boyut);
  const w = konturW(boyut);
  const cx = 32, cy = 32, r = 27, rt = 12.5;
  const dis = Array.from({ length: 8 }, (_, i) => kutup(r, 22.5 + i * 45, cx, cy));
  const tab = Array.from({ length: 8 }, (_, i) => kutup(rt, 22.5 + i * 45, cx, cy));
  const orta = Array.from({ length: 8 }, (_, i) => kutup(r * 0.93, i * 45, cx, cy));
  // ışık sol üstten: açı → ton
  const ton = (a) => { const d = ((a - 315 + 540) % 360) - 180; const m = Math.abs(d); return m < 50 ? R.en : m < 95 ? R.acik : m < 140 ? R.ana : R.koyu; };
  const ton2 = (a) => { const d = ((a - 315 + 540) % 360) - 180; const m = Math.abs(d); return m < 50 ? R.acik : m < 95 ? R.yan : m < 140 ? R.orta : R.derin; };
  return (
    <Kap boyut={boyut} hareketli={hareketli} etiket={etiket} isilti={[[56, 8, 6, 0], [8, 50, 4, 1.3]]}>
      <path d={cokgen(dis)} fill={R.ana} />
      {dis.map((p, i) => {
        const q = dis[(i + 1) % 8];
        const a = 45 + i * 45;
        return (
          <g key={i}>
            <path d={cokgen([p, orta[(i + 1) % 8], tab[i]])} fill={ton2(a - 22)} />
            <path d={cokgen([q, orta[(i + 1) % 8], tab[(i + 1) % 8]])} fill={ton2(a + 22)} />
            <path d={cokgen([tab[i], orta[(i + 1) % 8], tab[(i + 1) % 8]])} fill={ton(a)} />
          </g>
        );
      })}
      <path d={cokgen(tab)} fill={R.en} />
      {!k && <path d={cokgen([tab[1], orta[2], tab[2]])} fill={R.pembe} />}
      {!k && (
        <path d={`${cokgen(tab)}${dis.map((p, i) => `M${p.join(" ")}L${tab[i].join(" ")}M${tab[i].join(" ")}L${orta[(i + 1) % 8].join(" ")}L${tab[(i + 1) % 8].join(" ")}`).join("")}`}
              fill="none" stroke={R.derin} strokeWidth="1.1" strokeLinejoin="round" />
      )}
      {k && <path d={cokgen(tab)} fill="none" stroke={R.derin} strokeWidth="1.8" strokeLinejoin="round" />}
      <Parlama d={`M${f(cx - 8)} ${f(cy - 3)}L${f(cx - 3)} ${f(cy - 8)}`} w={k ? 3.4 : 2.8} />
      <path d={cokgen(dis)} fill="none" {...cz(w)} />
    </Kap>
  );
}

// ---------------------------------------------------------------- ELMAS C — Damla kesim
export function ElmasC({ boyut = 48, hareketli = false, etiket }) {
  const k = kucukMu(boyut);
  const w = konturW(boyut);
  const dis = "M32 5C40 14 53 26 53 38C53 50 43 59 32 59C21 59 11 50 11 38C11 26 24 14 32 5Z";
  const tab = "M32 22C36 27 42 32 42 38C42 44 37 48 32 48C27 48 22 44 22 38C22 32 28 27 32 22Z";
  return (
    <Kap boyut={boyut} hareketli={hareketli} etiket={etiket} isilti={[[54, 12, 6, 0], [9, 22, 4, 1.3]]}>
      <path d={dis} fill={R.ana} />
      <path d="M32 5C24 14 11 26 11 38L22 38C22 32 28 27 32 22Z" fill={R.acik} />
      <path d="M32 5C40 14 53 26 53 38L42 38C42 32 36 27 32 22Z" fill={R.orta} />
      <path d="M11 38C11 50 21 59 32 59L32 48C27 48 22 44 22 38Z" fill={R.yan} />
      <path d="M53 38C53 50 43 59 32 59L32 48C37 48 42 44 42 38Z" fill={R.koyu} />
      <path d={tab} fill={R.en} />
      {!k && <path d="M42 38C42 44 37 48 32 48L35 43C38 42 40 40 42 38Z" fill={R.pembe} />}
      <path d={k ? tab : `${tab}M32 5V22M11 38H22M42 38H53M32 48V59`} fill="none" stroke={R.derin} strokeWidth={k ? 1.8 : 1.1} strokeLinejoin="round" />
      <Parlama d="M26.6 30.4L29.6 27" w={k ? 3.4 : 2.6} />
      <path d={dis} fill="none" {...cz(w)} />
    </Kap>
  );
}

// ---------------------------------------------------------------- ELMAS D — Kristal kümesi
function Kristal({ x, y, g, h, don = 0, w }) {
  // altıgen prizma (üstten sivri): sol yüz açık, sağ yüz koyu, uç tabla
  const u = h * 0.28;
  return (
    <g transform={`translate(${x} ${y}) rotate(${don})`}>
      <path d={cokgen([[-g, 0], [-g, -h + u], [0, -h], [0, 0]])} fill={R.acik} />
      <path d={cokgen([[g, 0], [g, -h + u], [0, -h], [0, 0]])} fill={R.orta} />
      <path d={cokgen([[-g, -h + u], [0, -h], [-g * 0.2, -h + u * 1.2]])} fill={R.en} />
      <path d={`M0 -${h}V0`} stroke={R.derin} strokeWidth="1.1" />
      <path d={`M${-g + 2.2} ${-h + u + 2}V-3`} stroke={BEYAZ} strokeWidth="2.2" strokeLinecap="round" />
      <path d={cokgen([[-g, 0], [-g, -h + u], [0, -h], [g, -h + u], [g, 0]])} fill="none" {...cz(w)} />
    </g>
  );
}
export function ElmasD({ boyut = 48, hareketli = false, etiket }) {
  const w = konturW(boyut);
  return (
    <Kap boyut={boyut} hareketli={hareketli} etiket={etiket} isilti={[[54, 10, 6, 0], [8, 26, 4, 1.3]]}>
      <path d="M8 56Q32 48 56 56L52 60H12Z" fill={R.derin} {...cz(w)} />
      <Kristal x={19} y={56} g={7} h={30} don={-22} w={w} />
      <Kristal x={45} y={56} g={7} h={28} don={22} w={w} />
      <Kristal x={32} y={56} g={9.5} h={48} w={w} />
    </Kap>
  );
}

export const COIN_ADAYLARI = { a: CoinA, b: CoinB, c: CoinC, d: CoinD };
export const ELMAS_ADAYLARI = { a: ElmasA, b: ElmasB, c: ElmasC, d: ElmasD };
