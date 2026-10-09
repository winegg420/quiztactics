/**
 * BP VARYANT ÇİZİMLERİ (9 Eki 2026, /lig-sahne-onizleme V1/V2/V3 — yalnız önizleme; canlıda hiçbir yer `varyant` vermez).
 * - <BpKartCerceve varyant />     : köşeli (90°) Battle Pass KART çerçevesi, kartın üstüne tam boy SVG. Avatar arkasında
 *                                    BP halkası YOK (9 Eki, 3. tur: BP'yi yalnız kart çerçevesi temsil eder).
 * - <LigCerceveVaryant lig varyant />: Elmas / Efsane lig çerçevesinin yeni yorumu (LigCerceveSvg `varyant` ile çağırır).
 * Birim düzeni lig çerçeveleriyle aynı: viewBox "-140 -140 280 280", avatar deliği r56 (boş), halka dışı r74.
 * Dil: kalın #1f2a44 kontur, 3 ton (koyu/orta/açık), ışık sol-üstten, TEK beyaz vurgu. Hareket yok.
 */
import { useId } from "react";

const K = "#1f2a44";
const ALTIN = { koyu: "#C58F0E", orta: "#F5C542", acik: "#FFE27A" };
const EFSANE = { koyu: "#5B2A9E", orta: "#9B5CF0", acik: "#D3B3FF" };
const AL = { koyu: "#A3243B", orta: "#E8455F", acik: "#FF9DAD" };

const r1 = (x) => Math.round(x * 10) / 10;
const nok = (r, a) => [r1(r * Math.cos((a * Math.PI) / 180)), r1(r * Math.sin((a * Math.PI) / 180))];
const daire = (r) => `M${r} 0A${r} ${r} 0 1 0 ${-r} 0A${r} ${r} 0 1 0 ${r} 0Z`;
const halkaYolu = (ro, ri) => `${daire(ro)}${daire(ri)}`;
/** Halka dilimi a0→a1 (derece, saat yönü; 0 = sağ, 90 = alt) */
function dilim(ro, ri, a0, a1) {
  const b = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = nok(ro, a0), [x1, y1] = nok(ro, a1), [x2, y2] = nok(ri, a1), [x3, y3] = nok(ri, a0);
  return `M${x0} ${y0}A${ro} ${ro} 0 ${b} 1 ${x1} ${y1}L${x2} ${y2}A${ri} ${ri} 0 ${b} 0 ${x3} ${y3}Z`;
}
function yay(r, a0, a1) {
  const [x0, y0] = nok(r, a0), [x1, y1] = nok(r, a1);
  return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}
const cokgen = (n) => n.map((p) => p.join(",")).join(" ");


/* ===================== ELMAS / EFSANE — Bronz·Gümüş·Altın AİLESİ (9 Eki 2026, 3. tur) =====================
   Aile kuralı (tasarim/lig-cerceveleri/uretici.js ile aynı ölçü): gövde r56–74, sağ-alt koyu dilim (20°→200°),
   sol-üstte açık yay, iç çizgi r60, 8 perçin (r65.5, 22.5° + 45k), tepelik y −70 üstünde, ayak plakası y 72–94.
   Fark yalnız renk + tepelik/ayak motifi. V1 sade · V2 işlemeli · V3 en zengin. Avatar deliği (r56) hep boş. */
const BUZ = { koyu: "#3B97C9", orta: "#8ED8F5", acik: "#E2F7FF" };
const TAS_MAVI = { koyu: "#1E7DB0", orta: "#4DBDEB", acik: "#C4F1FF" };
const SEKIZ = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];

/** Pırlanta (önden): taç + kuşak + sivri alt; sol açık, sağ koyu (uretici.js › gem ile aynı kesim) */
function Gem({ x = 0, y = 0, s, t, sw = 3.6, sw2 = 1.8 }) {
  const GL = [-s, 0], GR = [s, 0], TL = [-0.55 * s, -0.62 * s], TR = [0.55 * s, -0.62 * s], B = [0, s], ML = [-0.4 * s, 0], MR = [0.4 * s, 0];
  const p = (a) => a.map(([px, py]) => `${r1(x + px)},${r1(y + py)}`).join(" ");
  return (
    <g>
      <polygon points={p([GL, GR, B])} fill={t.orta} />
      <polygon points={p([GL, ML, B])} fill={t.acik} />
      <polygon points={p([MR, GR, B])} fill={t.koyu} />
      <polygon points={p([GL, TL, ML])} fill={t.orta} />
      <polygon points={p([TL, TR, MR, ML])} fill={t.acik} />
      <polygon points={p([TR, GR, MR])} fill={t.koyu} />
      <polyline points={p([TL, ML, B, MR, TR])} fill="none" stroke={K} strokeWidth={sw2} strokeLinejoin="round" />
      <polygon points={p([GL, TL, TR, GR, B])} fill="none" stroke={K} strokeWidth={sw} strokeLinejoin="round" />
    </g>
  );
}

/** Yıldız: n kollu, iç yarıçap oranı i; sol yarı açık, sağ yarı orta */
function Yildiz({ x = 0, y = 0, r, n = 5, i = 0.48, t, sw = 2.4 }) {
  const p = Array.from({ length: n * 2 }, (_, k) => {
    const rr = k % 2 ? r * i : r, a = (Math.PI / n) * k - Math.PI / 2;
    return [r1(x + rr * Math.cos(a)), r1(y + rr * Math.sin(a))];
  });
  const sag = p.filter(([px]) => px >= x - 0.01);
  return (
    <g>
      <polygon points={cokgen(p)} fill={t.acik} />
      <polygon points={cokgen([[x, y + r * i], ...sag])} fill={t.orta} />
      <polygon points={cokgen(p)} fill="none" stroke={K} strokeWidth={sw} strokeLinejoin="round" />
    </g>
  );
}

/** Ailenin gövdesi: kontur + orta + sağ-alt koyu dilim + sol-üst açık yay + iç çizgi (+ tek beyaz vurgu) */
function Govde({ t, ro = 74, beyaz = true }) {
  return (
    <g>
      <path d={halkaYolu(ro, 54.5)} fill={K} fillRule="evenodd" />
      <path d={halkaYolu(ro - 3, 56)} fill={t.orta} fillRule="evenodd" />
      <path d={dilim(ro - 3, 59, 20, 200)} fill={t.koyu} />
      <path d={yay(65, 208, 252)} fill="none" stroke={t.acik} strokeWidth="5" strokeLinecap="round" />
      {beyaz && <path d={yay(65, 222, 232)} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />}
      <circle r="60" fill="none" stroke={K} strokeWidth="3" />
    </g>
  );
}
/** 16 dilimli faset gövde: her dilimin tonu ışığa (sol-üst) göre; kontur dilimler arasında */
function FasetGovde({ t, ro = 74, n = 16 }) {
  const st = 360 / n;
  return (
    <g>
      <path d={halkaYolu(ro, 54.5)} fill={K} fillRule="evenodd" />
      {Array.from({ length: n }, (_, k) => {
        const a0 = k * st - 90, m = ((a0 + st / 2) * Math.PI) / 180, v = Math.sin(m) + Math.cos(m);
        const renk = v > 0.6 ? t.koyu : v > -0.6 ? t.orta : t.acik;
        return <path key={k} d={dilim(ro - 3, 59, a0, a0 + st)} fill={renk} stroke={K} strokeWidth="1.6" strokeLinejoin="round" />;
      })}
      <path d={yay(66, 222, 232)} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d={halkaYolu(59, 56)} fill={t.orta} fillRule="evenodd" />
      <circle r="60" fill="none" stroke={K} strokeWidth="3" />
    </g>
  );
}
const Percinler = ({ renk, cizgi = 2, r = 3.8 }) => SEKIZ.map((a) => {
  const [x, y] = nok(65.5, a);
  return <circle key={a} cx={x} cy={y} r={r} fill={renk} stroke={K} strokeWidth={cizgi} />;
});
/** Ayak plakası (uretici.js › plate): 48×22, alt yarı koyu; isteğe bağlı yan kuyruklar */
function Plaka({ t, kuyruk = null, children }) {
  return (
    <g>
      {kuyruk && <>
        <polygon points="-22,74 -42,72 -35,83 -42,94 -22,90" fill={kuyruk} stroke={K} strokeWidth="3" strokeLinejoin="round" />
        <polygon points="22,74 42,72 35,83 42,94 22,90" fill={kuyruk} stroke={K} strokeWidth="3" strokeLinejoin="round" />
      </>}
      <rect x="-24" y="72" width="48" height="22" rx="7" fill={t.orta} />
      <path d="M-24 83H24V87Q24 94 17 94H-17Q-24 94 -24 87Z" fill={t.koyu} />
      <rect x="-24" y="72" width="48" height="22" rx="7" fill="none" stroke={K} strokeWidth="3.5" />
      {children}
    </g>
  );
}
/** Düz, dik taç (uretici.js › crown): taban gövdenin üstünde, ölçek sc taban çevresinde */
function DikTac({ sc = 1.2, uc = "#fff", taslar = ["#4C8DF0", "#E24B4A", "#4C8DF0"] }) {
  return (
    <g transform={`translate(0 -66) scale(${sc}) translate(0 66)`}>
      <polygon points="-22,-68 -22,-84 -11,-76 0,-91 11,-76 22,-84 22,-68" fill={ALTIN.acik} stroke={K} strokeWidth="3.5" strokeLinejoin="round" />
      <polygon points="0,-68 0,-91 11,-76 22,-84 22,-68" fill={ALTIN.orta} />
      <polygon points="-22,-68 -22,-84 -11,-76 0,-91 11,-76 22,-84 22,-68" fill="none" stroke={K} strokeWidth="3.5" strokeLinejoin="round" />
      <rect x="-23" y="-73" width="46" height="9" rx="3" fill={ALTIN.orta} stroke={K} strokeWidth="3" />
      <rect x="-20.5" y="-68" width="41" height="2.5" fill={ALTIN.koyu} />
      {[-11, 0, 11].map((x, k) => <circle key={x} cx={x} cy="-68.5" r={k === 1 ? 3 : 2.6} fill={taslar[k]} stroke={K} strokeWidth="1.5" />)}
      {[[-22, -86], [0, -93], [22, -86]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3" fill={uc} stroke={K} strokeWidth="2" />)}
    </g>
  );
}

function ElmasV1() {   // Sade: buz gövde + hafif faset çizgileri + 8 perçin + pırlanta tepelik + elmaslı plaka
  return (
    <g>
      <Govde t={BUZ} />
      {Array.from({ length: 16 }, (_, k) => {
        const a = k * 22.5 + 11.25, [x0, y0] = nok(60, a), [x1, y1] = nok(71, a);
        return <line key={k} x1={x0} y1={y0} x2={x1} y2={y1} stroke={K} strokeWidth="1.3" opacity=".3" />;
      })}
      <Percinler renk={BUZ.acik} />
      <Gem y={-84} s={16} t={TAS_MAVI} />
      <Plaka t={BUZ}><Gem y={81} s={8} t={TAS_MAVI} sw={2.4} sw2={1.2} /></Plaka>
    </g>
  );
}
function ElmasV2() {   // İşlemeli: gövdede zikzak faset oyma + elmas perçinler + yuvalı pırlanta + kuyruklu plaka
  const zik = Array.from({ length: 49 }, (_, k) => nok(k % 2 ? 69 : 62, k * 7.5 - 90));
  return (
    <g>
      <Govde t={BUZ} />
      <polyline points={cokgen(zik)} fill="none" stroke={BUZ.koyu} strokeWidth="1.6" strokeLinejoin="round" />
      {SEKIZ.map((a) => {
        const [x, y] = nok(65.5, a);
        const kare = cokgen([[x, y - 5.5], [x + 5.5, y], [x, y + 5.5], [x - 5.5, y]]);
        return (
          <g key={a}>
            <polygon points={kare} fill={TAS_MAVI.orta} />
            <polygon points={cokgen([[x, y - 5.5], [x, y], [x - 5.5, y]])} fill={TAS_MAVI.acik} />
            <polygon points={cokgen([[x + 5.5, y], [x, y + 5.5], [x, y]])} fill={TAS_MAVI.koyu} />
            <polygon points={kare} fill="none" stroke={K} strokeWidth="2" strokeLinejoin="round" />
          </g>
        );
      })}
      <rect x="-15" y="-81" width="30" height="10" rx="3" fill={BUZ.orta} stroke={K} strokeWidth="3" />
      <rect x="-12.5" y="-75" width="25" height="2.5" fill={BUZ.koyu} />
      <Gem y={-90} s={17} t={TAS_MAVI} />
      <Plaka t={BUZ} kuyruk={BUZ.koyu}><Gem y={81} s={8.5} t={TAS_MAVI} sw={2.4} sw2={1.2} /></Plaka>
    </g>
  );
}
function ElmasV3() {   // Zengin: 16 faset dilimli gövde + taş perçinler + üçlü pırlanta tepelik + kuyruklu taşlı plaka
  return (
    <g>
      <FasetGovde t={BUZ} />
      {SEKIZ.map((a) => { const [x, y] = nok(65.5, a); return <Gem key={a} x={x} y={y - 1.2} s={5} t={TAS_MAVI} sw={1.8} sw2={0.9} />; })}
      <rect x="-30" y="-81" width="60" height="10" rx="3" fill={BUZ.orta} stroke={K} strokeWidth="3" />
      <rect x="-27.5" y="-75" width="55" height="2.5" fill={BUZ.koyu} />
      <Gem x={-21} y={-85} s={8.5} t={TAS_MAVI} sw={2.6} sw2={1.3} />
      <Gem x={21} y={-85} s={8.5} t={TAS_MAVI} sw={2.6} sw2={1.3} />
      <Gem y={-92} s={18} t={TAS_MAVI} />
      <Plaka t={BUZ} kuyruk={TAS_MAVI.koyu}>
        <Gem y={81} s={9} t={TAS_MAVI} sw={2.4} sw2={1.2} />
        <circle cx="-15" cy="83" r="2.6" fill={BUZ.acik} stroke={K} strokeWidth="1.6" />
        <circle cx="15" cy="83" r="2.6" fill={BUZ.acik} stroke={K} strokeWidth="1.6" />
      </Plaka>
    </g>
  );
}

function EfsaneV1() {  // Sade: mor gövde + altın perçin + dik altın taç + yıldızlı mor plaka
  return (
    <g>
      <Govde t={EFSANE} />
      <Percinler renk={ALTIN.orta} />
      <DikTac sc={1.15} />
      <Plaka t={EFSANE}><Yildiz y={83} r={9.5} t={ALTIN} sw={2.2} /></Plaka>
    </g>
  );
}
function EfsaneV2() {  // İşlemeli: mor gövde + altın iç şerit + altın perçin + büyük dik taç + kuyruklu yıldız plaka
  return (
    <g>
      <Govde t={EFSANE} />
      <path d={halkaYolu(63.5, 59)} fill={ALTIN.orta} fillRule="evenodd" />
      <path d={dilim(63.5, 61.2, 20, 200)} fill={ALTIN.koyu} />
      <circle r="63.5" fill="none" stroke={K} strokeWidth="1.8" />
      <circle r="60" fill="none" stroke={K} strokeWidth="3" />
      {SEKIZ.map((a) => {
        const [x, y] = nok(68.5, a);
        return <circle key={a} cx={x} cy={y} r="3.6" fill={ALTIN.orta} stroke={K} strokeWidth="2" />;
      })}
      <DikTac sc={1.28} />
      <Plaka t={EFSANE} kuyruk={ALTIN.orta}><Yildiz y={83} r={10} t={ALTIN} sw={2.2} /></Plaka>
    </g>
  );
}
function EfsaneV3() {  // Zengin: altın dış kasnak + faset mor gövde + yıldız perçin + taşlı büyük taç + altın plaka, 3 yıldız
  return (
    <g>
      <path d={halkaYolu(79.5, 70)} fill={K} fillRule="evenodd" />
      <path d={halkaYolu(77, 72)} fill={ALTIN.orta} fillRule="evenodd" />
      <path d={dilim(77, 74.5, 20, 200)} fill={ALTIN.koyu} />
      <path d={yay(75.5, 205, 255)} fill="none" stroke={ALTIN.acik} strokeWidth="2.2" strokeLinecap="round" />
      <FasetGovde t={EFSANE} ro={72.5} />
      {SEKIZ.map((a) => { const [x, y] = nok(65.5, a); return <Yildiz key={a} x={x} y={y} r={5.6} t={ALTIN} sw={1.6} />; })}
      <DikTac sc={1.38} taslar={[EFSANE.orta, "#E24B4A", EFSANE.orta]} />
      <Plaka t={ALTIN} kuyruk={EFSANE.orta}>
        <Yildiz y={83.5} r={9.5} t={EFSANE} sw={2.2} />
        <Yildiz x={-15} y={83} r={4.6} t={EFSANE} sw={1.5} />
        <Yildiz x={15} y={83} r={4.6} t={EFSANE} sw={1.5} />
      </Plaka>
    </g>
  );
}

const CERCEVE = { elmas: { v1: ElmasV1, v2: ElmasV2, v3: ElmasV3 }, efsane: { v1: EfsaneV1, v2: EfsaneV2, v3: EfsaneV3 } };
/** Yalnız Elmas/Efsane'nin varyantı var; diğerleri null → LigCerceveSvg bugünkü dosyayı çizer. */
export const ligCerceveVaryantVar = (lig, varyant) => Boolean(CERCEVE[lig]?.[varyant]);

export function LigCerceveVaryant({ lig, varyant, style }) {
  const C = CERCEVE[lig]?.[varyant];
  if (!C) return null;
  return (
    <svg viewBox="-140 -140 280 280" aria-hidden="true" focusable="false" style={style}>
      <C />
      <circle r="56" fill="none" stroke={K} strokeWidth="3.5" />
    </svg>
  );
}

/* ===================== BP KART ÇERÇEVESİ (köşeli, 90°) — V1 / V2 / V3 =====================
   Kartın üstüne tek SVG (inset 0, ölçeksiz px). Kenarlar yüzde ölçülü şeritler; sağ/alt kenar ve köşeler iç içe
   <svg x="100%"> çapalarıyla çizilir → kart hangi boyda olursa olsun köşeler keskin 90°. Işık sol-üstten: her çubuğun
   üst/sol kenarı açık, alt/sağ kenarı koyu. Tek beyaz vurgu sol-üst köşede. Avatar arkasında halka YOK. */

/** Bir kenara şerit: k = "u" üst · "a" alt · "s" sol · "g" sağ; ic = kenardan içeri derinlik, d = kalınlık */
function Serit({ k, ic, d, f }) {
  if (k === "u") return <rect x="0" y={ic} width="100%" height={d} fill={f} />;
  if (k === "s") return <rect x={ic} y="0" width={d} height="100%" fill={f} />;
  if (k === "a") return <svg y="100%" overflow="visible"><rect x="0" y={-ic - d} width="100%" height={d} fill={f} /></svg>;
  return <svg x="100%" overflow="visible"><rect x={-ic - d} y="0" width={d} height="100%" fill={f} /></svg>;
}
const DORT = ["u", "a", "s", "g"];
const Cizgi4 = ({ ic, d, f }) => DORT.map((k) => <Serit key={k} k={k} ic={ic} d={d} f={f} />);
/** Kabartma çubuk çerçeve: orta dolgu, üst/sol kenar açık, alt/sağ kenar koyu */
function Cubuk({ ic, d, t, b = 3 }) {
  return (
    <g>
      <Cizgi4 ic={ic} d={d} f={t.orta} />
      <Serit k="u" ic={ic} d={b} f={t.acik} /><Serit k="u" ic={ic + d - b} d={b} f={t.koyu} />
      <Serit k="s" ic={ic} d={b} f={t.acik} /><Serit k="s" ic={ic + d - b} d={b} f={t.koyu} />
      <Serit k="a" ic={ic + d - b} d={b} f={t.acik} /><Serit k="a" ic={ic} d={b} f={t.koyu} />
      <Serit k="g" ic={ic + d - b} d={b} f={t.acik} /><Serit k="g" ic={ic} d={b} f={t.koyu} />
    </g>
  );
}
/** Kabartma dikdörtgen (mutlak koordinat): orta + sol-üst açık pah + sağ-alt koyu pah + kontur */
function Kabara({ x, y, w, h, t = ALTIN, b = 3, k = 3 }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={t.orta} />
      <polygon points={cokgen([[x, y], [x + w, y], [x + w - b, y + b], [x + b, y + b], [x + b, y + h - b], [x, y + h]])} fill={t.acik} />
      <polygon points={cokgen([[x + w, y], [x + w, y + h], [x, y + h], [x + b, y + h - b], [x + w - b, y + h - b], [x + w - b, y + b]])} fill={t.koyu} />
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={K} strokeWidth={k} />
    </g>
  );
}
/** Köşe çapası: sx/sy = +1 sol/üst, −1 sağ/alt. `ciz(kutu, nokta, ikincil)`: içeri doğru ölçüyü mutlak kutuya çevirir
 *  (ışık yönü her köşede aynı kalsın diye ayna/transform yok). */
function Kose({ sx, sy, ciz }) {
  const kutu = (x, y, w, h) => ({ x: sx > 0 ? x : -x - w, y: sy > 0 ? y : -y - h, w, h });
  const nokta = (x, y) => [sx * x, sy * y];
  return <svg x={sx > 0 ? 0 : "100%"} y={sy > 0 ? 0 : "100%"} overflow="visible">{ciz(kutu, nokta, sx < 0 || sy < 0)}</svg>;
}
const KOSELER = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
const Koseler = ({ ciz }) => KOSELER.map(([sx, sy]) => <Kose key={`${sx}${sy}`} sx={sx} sy={sy} ciz={ciz} />);
const Orta = ({ alt = false, children }) => <svg x="50%" y={alt ? "100%" : 0} overflow="visible">{children}</svg>;

/** Yuvarlak kaboşon taş (mutlak merkez) */
function Kabason({ x, y, r, t = AL }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={t.orta} />
      <path d={`M${r1(x - r * 0.55)} ${r1(y + r * 0.1)}A${r * 0.6} ${r * 0.6} 0 0 1 ${r1(x + r * 0.1)} ${r1(y - r * 0.55)}`} fill="none" stroke={t.acik} strokeWidth={r1(r * 0.36)} strokeLinecap="round" />
      <path d={`M${r1(x + r * 0.6)} ${r1(y - r * 0.05)}A${r * 0.62} ${r * 0.62} 0 0 1 ${r1(x - r * 0.05)} ${r1(y + r * 0.62)}`} fill="none" stroke={t.koyu} strokeWidth={r1(r * 0.32)} strokeLinecap="round" />
      <circle cx={x} cy={y} r={r} fill="none" stroke={K} strokeWidth="2.4" />
    </g>
  );
}

function KartV1() {   // Kabartmalı altın levha: kalın kabartma bant + iç ince çizgi + kalın L köşe + üst/alt mücevher
  return (
    <g>
      <Cubuk ic={0} d={12} t={ALTIN} />
      <Cizgi4 ic={12} d={2.5} f={K} />
      <Cizgi4 ic={14.5} d={2} f={ALTIN.orta} />
      <Cizgi4 ic={16.5} d={1.5} f={K} />
      <Koseler ciz={(kutu, nokta, ikincil) => {
        const [cx, cy] = nokta(12, 12);
        return (
          <g>
            <Kabara {...kutu(18, 0, 28, 18)} /><Kabara {...kutu(0, 18, 18, 28)} /><Kabara {...kutu(0, 0, 24, 24)} b={4} />
            <circle cx={cx} cy={cy} r="4.6" fill={ALTIN.acik} stroke={K} strokeWidth="2" />
            <path d={`M${cx - 0.5} ${cy + 3}A3 3 0 0 0 ${cx + 3} ${cy - 0.5}`} fill="none" stroke={ALTIN.koyu} strokeWidth="1.6" />
            {!ikincil && <line x1="6" y1="5.5" x2="12" y2="5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />}
          </g>
        );
      }} />
      <Orta><Kabara x={-17} y={0} w={34} h={19} /><Kabason x={0} y={9.5} r={5.6} /></Orta>
      <Orta alt><Kabara x={-17} y={-19} w={34} h={19} /><Kabason x={0} y={-9.5} r={5.6} /></Orta>
    </g>
  );
}

function KartV2() {   // Çift kenarlı kraliyet: dış kalın bant + koyu kanal içinde baklava dizisi + iç ince şerit + kare mücevher yuvası
  const id = useId().replace(/:/g, "");
  const KANAL = "#141a46";
  const desen = (ad, x, y, dikey) => {
    const w = dikey ? 7 : 12, h = dikey ? 12 : 7, cx = w / 2, cy = h / 2, a = dikey ? 2.9 : 4, b = dikey ? 4 : 2.9;
    const kenar = cokgen([[cx, cy - b], [cx + a, cy], [cx, cy + b], [cx - a, cy]]);
    return (
      <pattern id={`${id}${ad}`} patternUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}>
        <polygon points={kenar} fill={ALTIN.orta} />
        <polygon points={cokgen([[cx, cy - b], [cx, cy], [cx - a, cy]])} fill={ALTIN.acik} />
        <polygon points={cokgen([[cx + a, cy], [cx, cy + b], [cx, cy]])} fill={ALTIN.koyu} />
        <polygon points={kenar} fill="none" stroke={K} strokeWidth="1" strokeLinejoin="round" />
      </pattern>
    );
  };
  return (
    <g>
      <defs>{desen("u", 0, 11.5, false)}{desen("a", 0, -18.5, false)}{desen("s", 11.5, 0, true)}{desen("g", -18.5, 0, true)}</defs>
      <Cubuk ic={0} d={10} t={ALTIN} />
      <Cizgi4 ic={10} d={1.5} f={K} />
      <Cizgi4 ic={11.5} d={7} f={KANAL} />
      <rect x="0" y="11.5" width="100%" height="7" fill={`url(#${id}u)`} />
      <svg y="100%" overflow="visible"><rect x="0" y="-18.5" width="100%" height="7" fill={`url(#${id}a)`} /></svg>
      <rect x="11.5" y="0" width="7" height="100%" fill={`url(#${id}s)`} />
      <svg x="100%" overflow="visible"><rect x="-18.5" y="0" width="7" height="100%" fill={`url(#${id}g)`} /></svg>
      <Cizgi4 ic={18.5} d={1.5} f={K} />
      <Cubuk ic={20} d={4} t={ALTIN} b={1.3} />
      <Cizgi4 ic={24} d={1.5} f={K} />
      <Koseler ciz={(kutu, nokta, ikincil) => {
        const yuva = kutu(8, 8, 16, 16);
        return (
          <g>
            <Kabara {...kutu(0, 0, 32, 32)} b={4} />
            <rect x={yuva.x} y={yuva.y} width="16" height="16" fill={KANAL} stroke={K} strokeWidth="2" />
            <Kabara {...kutu(10.5, 10.5, 11, 11)} t={AL} b={3} k={2} />
            {!ikincil && <line x1="5" y1="4.5" x2="11" y2="4.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />}
          </g>
        );
      }} />
    </g>
  );
}

function KartV3() {   // Oyma altın rölyef: yaprak/kıvrım kabartmalı bant + kare madalyon köşe + üstte yıldızlı tepelik
  const id = useId().replace(/:/g, "");
  const yaprak = (ad, x, y, dikey) => {
    const icerik = (
      <g>
        <path d="M11 7.5C8 2.5 3.5 2.5 1.5 6C3 8.5 7 10 11 7.5Z" fill={ALTIN.acik} stroke={ALTIN.koyu} strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M11 7.5C14 12.5 18.5 12.5 20.5 9C19 6.5 15 5 11 7.5Z" fill={ALTIN.orta} stroke={ALTIN.koyu} strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M2 11.5Q6 13 9 10.5M20 3.5Q16 2 13 4.5" fill="none" stroke={ALTIN.koyu} strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="11" cy="7.5" r="1.7" fill={K} />
      </g>
    );
    return (
      <pattern id={`${id}${ad}`} patternUnits="userSpaceOnUse" x={x} y={y} width={dikey ? 15 : 22} height={dikey ? 22 : 15}>
        {dikey ? <g transform="translate(15 0) rotate(90)">{icerik}</g> : icerik}
      </pattern>
    );
  };
  return (
    <g>
      <defs>{yaprak("u", 0, 0.5, false)}{yaprak("a", 0, -15.5, false)}{yaprak("s", 0.5, 0, true)}{yaprak("g", -15.5, 0, true)}</defs>
      <Cubuk ic={0} d={16} t={ALTIN} b={2.5} />
      <rect x="0" y="0.5" width="100%" height="15" fill={`url(#${id}u)`} />
      <svg y="100%" overflow="visible"><rect x="0" y="-15.5" width="100%" height="15" fill={`url(#${id}a)`} /></svg>
      <rect x="0.5" y="0" width="15" height="100%" fill={`url(#${id}s)`} />
      <svg x="100%" overflow="visible"><rect x="-15.5" y="0" width="15" height="100%" fill={`url(#${id}g)`} /></svg>
      <Cizgi4 ic={16} d={2.5} f={K} />
      <Cizgi4 ic={18.5} d={2} f={ALTIN.acik} />
      <Cizgi4 ic={20.5} d={1.5} f={K} />
      <Koseler ciz={(kutu, nokta, ikincil) => {
        const [cx, cy] = nokta(17, 17), ic = kutu(6, 6, 22, 22);
        return (
          <g>
            <Kabara {...kutu(0, 0, 34, 34)} b={4} />
            <rect x={ic.x} y={ic.y} width="22" height="22" fill="none" stroke={ALTIN.koyu} strokeWidth="1.5" />
            {[0, 90, 180, 270].map((a) => (
              <ellipse key={a} cx={cx} cy={cy - 5.5} rx="3.4" ry="5.5" transform={`rotate(${a} ${cx} ${cy})`}
                       fill={a === 0 || a === 270 ? ALTIN.acik : ALTIN.koyu} stroke={K} strokeWidth="1.6" />
            ))}
            <circle cx={cx} cy={cy} r="3.4" fill={AL.orta} stroke={K} strokeWidth="1.8" />
            {!ikincil && <line x1="5" y1="4.5" x2="11" y2="4.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />}
          </g>
        );
      }} />
      <Orta>
        <polygon points="-30,0 30,0 24,20 -24,20" fill={ALTIN.orta} />
        <polygon points="-30,0 30,0 27,3 -27,3" fill={ALTIN.acik} />
        <polygon points="24,20 -24,20 -25,17 25,17" fill={ALTIN.koyu} />
        <polygon points="-30,0 30,0 24,20 -24,20" fill="none" stroke={K} strokeWidth="3" strokeLinejoin="round" />
        <path d="M-22 6Q-16 14 -9 9M22 6Q16 14 9 9" fill="none" stroke={ALTIN.koyu} strokeWidth="1.6" strokeLinecap="round" />
        <Yildiz y={10} r={9} t={ALTIN} sw={2.2} />
      </Orta>
      <Orta alt>
        <Kabara x={-16} y={-17} w={32} h={17} />
        <circle cx="0" cy="-8.5" r="4" fill={AL.orta} stroke={K} strokeWidth="1.8" />
        <path d="M-12 -8.5Q-8 -13 -5 -8.5M12 -8.5Q8 -13 5 -8.5" fill="none" stroke={ALTIN.koyu} strokeWidth="1.5" strokeLinecap="round" />
      </Orta>
    </g>
  );
}

const KART = { v1: KartV1, v2: KartV2, v3: KartV3 };
/** Köşeli BP kart çerçevesi — yalnız /lig-sahne-onizleme (`varyant`). Kartın üstüne tam boy, tıklamayı geçirir. */
export function BpKartCerceve({ varyant }) {
  const C = KART[varyant];
  if (!C) return null;
  return (
    <svg className="qt-ok-bpk-cerceve" width="100%" height="100%" aria-hidden="true" focusable="false"><C /></svg>
  );
}
