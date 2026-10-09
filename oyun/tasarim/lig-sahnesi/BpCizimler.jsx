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

/* 9 Eki (5. tur): çerçeveler "kalın ve ucuz" bulundu → üçü İNCE (toplam 6,6 px ≈ kart genişliğinin %2–3'ü, üçünde aynı).
   Katmanlar: dış lacivert kontur 1,2 · metalik altın bant (5 duraklı geçiş: koyu bronz → zengin altın → krem → altın → bronz)
   · üst/sol kenarda ince krem parlama · içte ince koyu gölge. Köşeler düz 90°; süsler bant içinde/kenarında küçük kalır. */
const METAL = [["0", "#7A4E0E"], [".3", "#C98F1A"], [".52", "#FFE7A3"], [".74", "#E2AA2C"], ["1", "#8A5A12"]];
const KREM = "#FFF4CC";
const KALIN = 6.6;
function Metal({ id }) {
  return (
    <>
      {[["y", 0, 1], ["x", 1, 0]].map(([ad, x2, y2]) => (
        <linearGradient key={ad} id={`${id}${ad}`} x1="0" y1="0" x2={x2} y2={y2}>
          {METAL.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
        </linearGradient>
      ))}
    </>
  );
}
/** Metalik bant: ic kenardan derinlik, d kalınlık; üst/alt dikey, sol/sağ yatay geçiş */
function MetalBant({ id, ic, d }) {
  return DORT.map((k) => <Serit key={k} k={k} ic={ic} d={d} f={`url(#${id}${k === "u" || k === "a" ? "y" : "x"})`} />);
}
/** Ortak ince gövde. `iki` = çift çizgi (dış orta-kalın bant + iç çok ince çizgi) */
function InceGovde({ id, iki = false }) {
  return (
    <g>
      <Cizgi4 ic={0} d={1.2} f={K} />
      <MetalBant id={id} ic={1.2} d={iki ? 3.2 : 4.4} />
      {iki && <><Cizgi4 ic={4.4} d={0.6} f={K} /><Cizgi4 ic={5} d={0.6} f="#F2C64E" /></>}
      <Serit k="u" ic={1.2} d={0.7} f={KREM} /><Serit k="s" ic={1.2} d={0.7} f={KREM} />
      <Cizgi4 ic={5.6} d={1} f="rgba(31,42,68,.55)" />
    </g>
  );
}
const KREM_VURGU = ({ ikincil }) => (!ikincil ? <line x1="18" y1="1.9" x2="30" y2="1.9" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" /> : null);

function KartV1() {   // Sade ince altın: çift çizgi + dört köşede küçük L vurgu
  const id = useId().replace(/:/g, "");
  return (
    <g>
      <defs><Metal id={id} /></defs>
      <InceGovde id={id} iki />
      <Koseler ciz={(kutu, nokta, ikincil) => {
        const L = [[0, 0], [15, 0], [15, 4.4], [4.4, 4.4], [4.4, 15], [0, 15]].map(([x, y]) => nokta(x, y));
        const c = kutu(1.6, 1.6, 2.2, 2.2);
        return (
          <g>
            <polygon points={cokgen(L)} fill={ALTIN.orta} stroke={K} strokeWidth="1" strokeLinejoin="miter" />
            <rect x={c.x} y={c.y} width="2.2" height="2.2" fill={KREM} />
            <KREM_VURGU ikincil={ikincil} />
          </g>
        );
      }} />
    </g>
  );
}

function KartV2() {   // İnce altın + bant boyunca minik baklava dizisi + köşede küçük kare mücevher
  const id = useId().replace(/:/g, "");
  const desen = (ad, x, y, dikey) => {
    const w = dikey ? 4.4 : 7, h = dikey ? 7 : 4.4, cx = w / 2, cy = h / 2, a = dikey ? 1.3 : 1.7, b = dikey ? 1.7 : 1.3;
    return (
      <pattern key={ad} id={`${id}${ad}`} patternUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}>
        <polygon points={cokgen([[cx, cy - b], [cx + a, cy], [cx, cy + b], [cx - a, cy]])} fill={KREM} stroke="#6B430C" strokeWidth=".45" />
      </pattern>
    );
  };
  return (
    <g>
      <defs><Metal id={id} />{desen("u", 0, 1.2, false)}{desen("a", 0, -5.6, false)}{desen("s", 1.2, 0, true)}{desen("g", -5.6, 0, true)}</defs>
      <InceGovde id={id} />
      <rect x="0" y="1.2" width="100%" height="4.4" fill={`url(#${id}u)`} />
      <svg y="100%" overflow="visible"><rect x="0" y="-5.6" width="100%" height="4.4" fill={`url(#${id}a)`} /></svg>
      <rect x="1.2" y="0" width="4.4" height="100%" fill={`url(#${id}s)`} />
      <svg x="100%" overflow="visible"><rect x="-5.6" y="0" width="4.4" height="100%" fill={`url(#${id}g)`} /></svg>
      <Koseler ciz={(kutu, nokta, ikincil) => {
        const d = kutu(0, 0, 9, 9), y = kutu(1.6, 1.6, 5.8, 5.8), t = kutu(2.6, 2.6, 3.8, 3.8), p = kutu(3, 3, 1.3, 1.3);
        return (
          <g>
            <rect x={d.x} y={d.y} width="9" height="9" fill={`url(#${id}y)`} stroke={K} strokeWidth="1.2" />
            <rect x={y.x} y={y.y} width="5.8" height="5.8" fill={AL.koyu} stroke={K} strokeWidth=".7" />
            <rect x={t.x} y={t.y} width="3.8" height="3.8" fill={AL.orta} />
            <rect x={p.x} y={p.y} width="1.3" height="1.3" fill="#fff" opacity=".85" />
            <KREM_VURGU ikincil={ikincil} />
          </g>
        );
      }} />
    </g>
  );
}

function KartV3() {   // İnce altın + köşede küçük oymalı kıvrım süsü + üst ortada minik taç/elmas
  const id = useId().replace(/:/g, "");
  return (
    <g>
      <defs><Metal id={id} /></defs>
      <InceGovde id={id} />
      <Koseler ciz={(kutu, nokta, ikincil) => {
        const P = (pts) => pts.map(([x, y]) => nokta(x, y).join(" "));
        const [a, b, c, d] = P([[6.6, 13.5], [10.6, 13.2], [11.2, 8.2], [8.6, 8.6]]);
        const [e, f, g, h] = P([[13.5, 6.6], [13.2, 10.6], [8.2, 11.2], [8.6, 8.6]]);
        const kivrim = `M${a}C${b} ${c} ${d}M${e}C${f} ${g} ${h}`;
        const [mx, my] = nokta(3.3, 3.3);
        return (
          <g>
            <path d={kivrim} fill="none" stroke={K} strokeWidth="2.4" strokeLinecap="round" />
            <path d={kivrim} fill="none" stroke={ALTIN.orta} strokeWidth="1.2" strokeLinecap="round" />
            <rect x={mx - 2.3} y={my - 2.3} width="4.6" height="4.6" fill={ALTIN.acik} stroke={K} strokeWidth=".9" transform={`rotate(45 ${mx} ${my})`} />
            <KREM_VURGU ikincil={ikincil} />
          </g>
        );
      }} />
      <Orta>
        <polygon points="-7,6 -7,-1 -3.5,2.4 0,-3 3.5,2.4 7,-1 7,6" fill={ALTIN.orta} stroke={K} strokeWidth="1" strokeLinejoin="round" />
        <polygon points="-7,6 -7,-1 -3.5,2.4 0,-3 0,6" fill={ALTIN.acik} />
        <polygon points="-7,6 -7,-1 -3.5,2.4 0,-3 3.5,2.4 7,-1 7,6" fill="none" stroke={K} strokeWidth="1" strokeLinejoin="round" />
        <Gem y={3.4} s={2.2} t={AL} sw={0.7} sw2={0.4} />
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
