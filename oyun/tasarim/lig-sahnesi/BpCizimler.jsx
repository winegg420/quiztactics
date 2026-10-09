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

/** ONAYLI (9 Eki 2026, Ida): Elmas = ElmasV2, Efsane = EfsaneV2. Önizlemenin "Yeni" sekmesi `varyant="onayli"` ile bunları çizer.
 *  Canlıya henüz bağlı DEĞİL (ayrı adım). */
export const ONAYLI_LIG_CERCEVE = { elmas: ElmasV2, efsane: EfsaneV2 };
const CERCEVE = { elmas: { v1: ElmasV1, v2: ElmasV2, v3: ElmasV3, onayli: ONAYLI_LIG_CERCEVE.elmas },
  efsane: { v1: EfsaneV1, v2: EfsaneV2, v3: EfsaneV3, onayli: ONAYLI_LIG_CERCEVE.efsane } };
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

/* 9 Eki (4. tur): önceki üç BP çerçevesi beğenilmedi → üçü SIFIRDAN. Dört köşe düz 90° (pah/kesik/yuvarlak yok). */

/** Dik açılı (ortogonal) çokgen kabartma: her kenara içe pah; üst/sol bakan kenar açık, alt/sağ bakan kenar koyu.
 *  Ayna çapalarda yön değişince alan işaretinden içe normal yeniden bulunur → ışık her köşede sol-üstten kalır. */
function KabaraCokgen({ n, t = ALTIN, b = 3.5, k = 3 }) {
  const alan = n.reduce((s, [x, y], i) => { const [x2, y2] = n[(i + 1) % n.length]; return s + x * y2 - x2 * y; }, 0);
  const yon = alan > 0 ? 1 : -1;
  return (
    <g>
      <polygon points={cokgen(n)} fill={t.orta} />
      {n.map(([x, y], i) => {
        const [x2, y2] = n[(i + 1) % n.length], L = Math.hypot(x2 - x, y2 - y) || 1;
        const nx = (-(y2 - y) / L) * yon, ny = ((x2 - x) / L) * yon;
        const renk = ny > 0.5 || nx > 0.5 ? t.acik : t.koyu;
        return <polygon key={i} points={cokgen([[x, y], [x2, y2], [r1(x2 + nx * b), r1(y2 + ny * b)], [r1(x + nx * b), r1(y + ny * b)]])} fill={renk} />;
      })}
      <polygon points={cokgen(n)} fill="none" stroke={K} strokeWidth={k} strokeLinejoin="miter" />
    </g>
  );
}
/** Basamak kesim kare taş: dış kare + iç tabla, dört pah tonlu (sol/üst açık, sağ/alt koyu) */
function KareTas({ x, y, s, t = AL, i = 0.28 }) {
  const d = r1(s * i), A = [x, y], B = [x + s, y], C = [x + s, y + s], D = [x, y + s];
  const a = [x + d, y + d], b = [x + s - d, y + d], c = [x + s - d, y + s - d], e = [x + d, y + s - d];
  return (
    <g>
      <polygon points={cokgen([A, B, b, a])} fill={t.acik} />
      <polygon points={cokgen([A, a, e, D])} fill={t.acik} />
      <polygon points={cokgen([B, C, c, b])} fill={t.koyu} />
      <polygon points={cokgen([D, e, c, C])} fill={t.koyu} />
      <rect x={a[0]} y={a[1]} width={r1(s - 2 * d)} height={r1(s - 2 * d)} fill={t.orta} stroke={K} strokeWidth="1.2" />
      <path d={`M${A.join(" ")}L${a.join(" ")}M${B.join(" ")}L${b.join(" ")}M${C.join(" ")}L${c.join(" ")}M${D.join(" ")}L${e.join(" ")}`} stroke={K} strokeWidth="1.2" />
      <rect x={x} y={y} width={s} height={s} fill="none" stroke={K} strokeWidth="2.2" />
    </g>
  );
}
/** Sol/sağ kenarın ortası (y = %50) */
const Yan = ({ sag = false, children }) => <svg x={sag ? "100%" : 0} y="50%" overflow="visible">{children}</svg>;
const MAVI = { koyu: "#1B3C8F", orta: "#2F5FD0", acik: "#7FA6F5" };
const kare = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

function KartV1() {   // Kabartmalı altın levha: kalın pahlı bant + ince iç çizgi + dört köşede kalın L parça + üst/alt yakut levha
  return (
    <g>
      <Cubuk ic={0} d={14} t={ALTIN} b={3.5} />
      <Cizgi4 ic={14} d={2.5} f={K} />
      <Cizgi4 ic={16.5} d={2} f={ALTIN.acik} />
      <Cizgi4 ic={18.5} d={1.5} f={K} />
      <Koseler ciz={(kutu, nokta, ikincil) => {
        const L = [[0, 0], [46, 0], [46, 22], [22, 22], [22, 46], [0, 46]].map(([x, y]) => nokta(x, y));
        const [cx, cy] = nokta(11, 11), [ax, ay] = nokta(35, 11), [bx, by] = nokta(11, 35);
        return (
          <g>
            <KabaraCokgen n={L} b={4} />
            <circle cx={cx} cy={cy} r="5.2" fill={ALTIN.orta} stroke={K} strokeWidth="2.2" />
            <path d={`M${cx - 3} ${cy + 0.5}A3 3 0 0 1 ${cx + 0.5} ${cy - 3}`} fill="none" stroke={ALTIN.acik} strokeWidth="1.8" strokeLinecap="round" />
            {[[ax, ay], [bx, by]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.6" fill={ALTIN.acik} stroke={K} strokeWidth="1.6" />)}
            {!ikincil && <line x1="26" y1="5" x2="38" y2="5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />}
          </g>
        );
      }} />
      <Orta>
        <KabaraCokgen n={kare(-26, 0, 52, 24)} b={3.5} />
        <rect x="-15" y="4" width="30" height="16" fill={K} />
        <Gem y={11} s={10} t={AL} sw={2.4} sw2={1.2} />
      </Orta>
      <Orta alt>
        <KabaraCokgen n={kare(-26, -24, 52, 24)} b={3.5} />
        <rect x="-15" y="-20" width="30" height="16" fill={K} />
        <Gem y={-13} s={10} t={AL} sw={2.4} sw2={1.2} />
      </Orta>
    </g>
  );
}

function KartV2() {   // Çift şeritli kraliyet: dış kalın altın + lacivert mineli kanalda altın baklava dizisi + iç ince şerit; köşede kare taş yuvası
  const id = useId().replace(/:/g, "");
  const desen = (ad, x, y, dikey) => {
    const w = dikey ? 10 : 14, h = dikey ? 14 : 10, cx = w / 2, cy = h / 2, a = dikey ? 3.6 : 5, b = dikey ? 5 : 3.6;
    const kenar = cokgen([[cx, cy - b], [cx + a, cy], [cx, cy + b], [cx - a, cy]]);
    return (
      <pattern id={`${id}${ad}`} patternUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}>
        <rect width={w} height={h} fill={MAVI.orta} />
        <rect width={dikey ? 2 : w} height={dikey ? h : 2} fill={MAVI.koyu} />
        <polygon points={kenar} fill={ALTIN.orta} />
        <polygon points={cokgen([[cx, cy - b], [cx, cy], [cx - a, cy]])} fill={ALTIN.acik} />
        <polygon points={cokgen([[cx + a, cy], [cx, cy + b], [cx, cy]])} fill={ALTIN.koyu} />
        <polygon points={kenar} fill="none" stroke={K} strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx={dikey ? cx : 0} cy={dikey ? 0 : cy} r="1.3" fill={ALTIN.acik} />
      </pattern>
    );
  };
  return (
    <g>
      <defs>{desen("u", 0, 9.5, false)}{desen("a", 0, -19.5, false)}{desen("s", 9.5, 0, true)}{desen("g", -19.5, 0, true)}</defs>
      <Cubuk ic={0} d={8} t={ALTIN} b={2.5} />
      <Cizgi4 ic={8} d={1.5} f={K} />
      <rect x="0" y="9.5" width="100%" height="10" fill={`url(#${id}u)`} />
      <svg y="100%" overflow="visible"><rect x="0" y="-19.5" width="100%" height="10" fill={`url(#${id}a)`} /></svg>
      <rect x="9.5" y="0" width="10" height="100%" fill={`url(#${id}s)`} />
      <svg x="100%" overflow="visible"><rect x="-19.5" y="0" width="10" height="100%" fill={`url(#${id}g)`} /></svg>
      <Cizgi4 ic={19.5} d={1.5} f={K} />
      <Cubuk ic={21} d={4} t={ALTIN} b={1.3} />
      <Cizgi4 ic={25} d={1.5} f={K} />
      <Koseler ciz={(kutu, nokta, ikincil) => {
        const dis = kutu(0, 0, 36, 36), yuva = kutu(7, 7, 22, 22), tas = kutu(9.5, 9.5, 17, 17);
        return (
          <g>
            <KabaraCokgen n={kare(dis.x, dis.y, 36, 36)} b={4} />
            <rect x={yuva.x} y={yuva.y} width="22" height="22" fill={K} />
            <KareTas x={tas.x} y={tas.y} s={17} t={AL} />
            {!ikincil && <line x1="6" y1="4" x2="16" y2="4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />}
          </g>
        );
      }} />
      {[false, true].map((alt) => (
        <Orta key={String(alt)} alt={alt}>
          <g transform={alt ? "translate(0 -14.5)" : "translate(0 14.5)"}>
            <polygon points="-22,0 0,-11 22,0 0,11" fill={ALTIN.orta} />
            <polygon points="-22,0 0,-11 0,0" fill={ALTIN.acik} />
            <polygon points="22,0 0,11 0,0" fill={ALTIN.koyu} />
            <polygon points="-22,0 0,-11 22,0 0,11" fill="none" stroke={K} strokeWidth="2.6" strokeLinejoin="round" />
            <KareTas x={-5.5} y={-5.5} s={11} t={MAVI} i={0.3} />
          </g>
        </Orta>
      ))}
      {[false, true].map((sag) => (
        <Yan key={String(sag)} sag={sag}>
          <g transform={sag ? "translate(-14.5 0)" : "translate(14.5 0)"}>
            <polygon points="0,-18 9,0 0,18 -9,0" fill={ALTIN.orta} />
            <polygon points="0,-18 0,0 -9,0" fill={ALTIN.acik} />
            <polygon points="9,0 0,18 0,0" fill={ALTIN.koyu} />
            <polygon points="0,-18 9,0 0,18 -9,0" fill="none" stroke={K} strokeWidth="2.4" strokeLinejoin="round" />
          </g>
        </Yan>
      ))}
    </g>
  );
}

function KartV3() {   // Oyma altın rölyef: kıvrımlı sarmaşık kabartma bant + kare madalyon köşe (gül oyma) + üstte taç tepelik
  const id = useId().replace(/:/g, "");
  const sarmasik = (ad, x, y, dikey) => {
    const ic = (
      <g>
        <path d="M0 9C5 2 8 2 13 9S21 16 26 9" fill="none" stroke={ALTIN.koyu} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M6.5 5.2C4 1 8 -0.5 10.5 1.5C10 4 8.5 5.5 6.5 5.2Z" fill={ALTIN.acik} stroke={K} strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M19.5 12.8C22 17 18 18.5 15.5 16.5C16 14 17.5 12.5 19.5 12.8Z" fill={ALTIN.koyu} stroke={K} strokeWidth="1.1" strokeLinejoin="round" />
        <circle cx="13" cy="9" r="1.9" fill={ALTIN.acik} stroke={K} strokeWidth="1" />
        <circle cx="2.5" cy="14" r="1.1" fill={ALTIN.koyu} /><circle cx="23.5" cy="4" r="1.1" fill={ALTIN.acik} />
      </g>
    );
    return (
      <pattern id={`${id}${ad}`} patternUnits="userSpaceOnUse" x={x} y={y} width={dikey ? 18 : 26} height={dikey ? 26 : 18}>
        {dikey ? <g transform="translate(18 0) rotate(90)">{ic}</g> : ic}
      </pattern>
    );
  };
  return (
    <g>
      <defs>{sarmasik("u", 0, 0, false)}{sarmasik("a", 0, -18, false)}{sarmasik("s", 0, 0, true)}{sarmasik("g", -18, 0, true)}</defs>
      <Cubuk ic={0} d={18} t={ALTIN} b={2.5} />
      <rect x="0" y="0" width="100%" height="18" fill={`url(#${id}u)`} />
      <svg y="100%" overflow="visible"><rect x="0" y="-18" width="100%" height="18" fill={`url(#${id}a)`} /></svg>
      <rect x="0" y="0" width="18" height="100%" fill={`url(#${id}s)`} />
      <svg x="100%" overflow="visible"><rect x="-18" y="0" width="18" height="100%" fill={`url(#${id}g)`} /></svg>
      <Cizgi4 ic={18} d={2.5} f={K} />
      <Cizgi4 ic={20.5} d={2} f={ALTIN.acik} />
      <Cizgi4 ic={22.5} d={1.5} f={K} />
      <Koseler ciz={(kutu, nokta, ikincil) => {
        const d = kutu(0, 0, 40, 40), ic = kutu(6, 6, 28, 28), [cx, cy] = nokta(20, 20);
        return (
          <g>
            <KabaraCokgen n={kare(d.x, d.y, 40, 40)} b={4} />
            <rect x={ic.x} y={ic.y} width="28" height="28" fill={ALTIN.koyu} stroke={K} strokeWidth="1.8" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <ellipse key={a} cx={cx} cy={cy - 7} rx="3.3" ry="6.2" transform={`rotate(${a} ${cx} ${cy})`}
                       fill={a >= 225 || a === 0 ? ALTIN.acik : ALTIN.orta} stroke={K} strokeWidth="1.4" />
            ))}
            <Kabason x={cx} y={cy} r={4.6} />
            {!ikincil && <line x1="6" y1="4.2" x2="18" y2="4.2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />}
          </g>
        );
      }} />
      <Orta>
        <KabaraCokgen n={kare(-36, 0, 72, 24)} b={3} />
        <path d="M-32 12C-28 5 -22 5 -19 12M32 12C28 5 22 5 19 12" fill="none" stroke={ALTIN.koyu} strokeWidth="2" strokeLinecap="round" />
        <g transform="translate(0 66) scale(0.6)">
          <polygon points="-22,-68 -22,-84 -11,-76 0,-91 11,-76 22,-84 22,-68" fill={ALTIN.acik} />
          <polygon points="0,-68 0,-91 11,-76 22,-84 22,-68" fill={ALTIN.orta} />
          <polygon points="-22,-68 -22,-84 -11,-76 0,-91 11,-76 22,-84 22,-68" fill="none" stroke={K} strokeWidth="3.6" strokeLinejoin="round" />
          <rect x="-23" y="-72" width="46" height="8" fill={ALTIN.koyu} stroke={K} strokeWidth="3" />
          {[[-22, -86], [0, -93], [22, -86]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3.6" fill={AL.orta} stroke={K} strokeWidth="2" />)}
        </g>
      </Orta>
      <Orta alt>
        <KabaraCokgen n={kare(-24, -22, 48, 22)} b={3} />
        <Yildiz y={-11} r={8} t={ALTIN} sw={2} />
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
