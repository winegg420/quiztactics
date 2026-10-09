/**
 * BP VARYANT ÇİZİMLERİ (9 Eki 2026, /lig-sahne-onizleme V1/V2/V3 — yalnız önizleme; canlıda hiçbir yer `varyant` vermez).
 * - <BpHalka varyant boyut />      : avatarın ARKASINDA Battle Pass halkası. Lig çerçevesinin dışında (iç yarıçap 82 birim >
 *                                    çerçeve 74), çerçevenin altında (z -1) → avatarı bölmez, çerçeveyle çakışmaz. 5 ligde aynı.
 * - <LigCerceveVaryant lig varyant />: Elmas / Efsane lig çerçevesinin yeni yorumu (LigCerceveSvg `varyant` ile çağırır).
 * Birim düzeni lig çerçeveleriyle aynı: viewBox "-140 -140 280 280", avatar deliği r56 (boş), halka dışı r74.
 * Dil: kalın #1f2a44 kontur, 3 ton (koyu/orta/açık), ışık sol-üstten, TEK beyaz vurgu. Hareket yok.
 */
const K = "#1f2a44";
const ALTIN = { koyu: "#C58F0E", orta: "#F5C542", acik: "#FFE27A" };
const ELMAS = { koyu: "#1E7FB0", orta: "#4FC3E8", acik: "#B6F0FF" };
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

/** 3 tonlu yuvarlak bant: kontur + orta + sağ-alt gölge + sol-üst açık yay (+ isteğe bağlı tek beyaz vurgu) */
function Bant({ ro, ri, t, beyaz = false, kontur = 3 }) {
  const ort = (ro + ri) / 2, gen = ro - ri;
  return (
    <g>
      <path d={halkaYolu(ro + kontur / 2, ri - kontur / 2)} fill={K} fillRule="evenodd" />
      <path d={halkaYolu(ro - kontur / 2, ri + kontur / 2)} fill={t.orta} fillRule="evenodd" />
      <path d={dilim(ro - kontur / 2, ort, 20, 200)} fill={t.koyu} />
      <path d={yay(ort, 205, 255)} fill="none" stroke={t.acik} strokeWidth={Math.max(2.5, gen * 0.32)} strokeLinecap="round" />
      {beyaz && <path d={yay(ort, 222, 238)} fill="none" stroke="#fff" strokeWidth={Math.max(1.6, gen * 0.14)} strokeLinecap="round" />}
    </g>
  );
}

/** Taş (önden pırlanta): üst taç + alt sivri; sol açık, orta orta, sağ koyu */
function Tas({ x = 0, y = 0, w = 30, h = 26, t, beyaz = false }) {
  const u = h * 0.36, a = w / 2, b = w * 0.3;
  return (
    <g transform={`translate(${x} ${y})`}>
      <polygon points={cokgen([[-b, -u], [b, -u], [a, 0], [0, h - u], [-a, 0]])} fill={t.orta} stroke={K} strokeWidth="3" strokeLinejoin="round" />
      <polygon points={cokgen([[-b, -u], [-b * 0.35, 0], [-a, 0]])} fill={t.acik} />
      <polygon points={cokgen([[b, -u], [a, 0], [b * 0.35, 0]])} fill={t.koyu} />
      <polygon points={cokgen([[b * 0.35, 0], [a, 0], [0, h - u]])} fill={t.koyu} />
      <polygon points={cokgen([[-a, 0], [-b * 0.35, 0], [0, h - u]])} fill={t.acik} opacity=".55" />
      <polyline points={cokgen([[-a, 0], [a, 0]])} stroke={K} strokeWidth="1.6" />
      <polyline points={cokgen([[-b, -u], [-b * 0.35, 0], [0, h - u], [b * 0.35, 0], [b, -u]])} fill="none" stroke={K} strokeWidth="1.4" strokeLinejoin="round" />
      <polygon points={cokgen([[-b, -u], [b, -u], [a, 0], [0, h - u], [-a, 0]])} fill="none" stroke={K} strokeWidth="3" strokeLinejoin="round" />
      {beyaz && <line x1={-b * 0.75} y1={-u * 0.45} x2={-b * 0.2} y2={-u * 0.45} stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />}
    </g>
  );
}

/** Kristal sivri (altıgen prizma), uç yukarı; dönüş a derece (0 = yukarı) */
function Kristal({ x, y, w, h, a = 0, t }) {
  const p = [[0, -h], [w / 2, -h + w * 0.6], [w / 2, 0], [-w / 2, 0], [-w / 2, -h + w * 0.6]];
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <polygon points={cokgen(p)} fill={t.orta} stroke={K} strokeWidth="3" strokeLinejoin="round" />
      <polygon points={cokgen([[0, -h], [0, 0], [-w / 2, 0], [-w / 2, -h + w * 0.6]])} fill={t.acik} />
      <polygon points={cokgen([[0, -h], [w / 2, -h + w * 0.6], [w / 2, 0], [w * 0.18, 0], [w * 0.18, -h + w * 0.7]])} fill={t.koyu} />
      <line x1="0" y1={-h + 2} x2="0" y2="-2" stroke={K} strokeWidth="1.4" opacity=".6" />
      <polygon points={cokgen(p)} fill="none" stroke={K} strokeWidth="3" strokeLinejoin="round" />
    </g>
  );
}

/** Tüy / yaprak (uç yukarı, sol yarı açık, sağ yarı koyu) */
function Tuy({ x, y, w, h, a, t }) {
  const d = `M0 0Q${w} ${-h * 0.45} 0 ${-h}Q${-w} ${-h * 0.45} 0 0Z`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <path d={d} fill={t.orta} />
      <path d={`M0 0Q${-w} ${-h * 0.45} 0 ${-h}Q${-w * 0.25} ${-h * 0.45} 0 0Z`} fill={t.acik} />
      <path d={`M0 0Q${w} ${-h * 0.45} 0 ${-h}Q${w * 0.35} ${-h * 0.45} 0 0Z`} fill={t.koyu} />
      <path d={d} fill="none" stroke={K} strokeWidth="2.8" strokeLinejoin="round" />
    </g>
  );
}

/** Alev dili (uç dışa) */
function Alev({ a, r, h, w, t }) {
  const [x, y] = nok(r, a);
  const d = `M${-w} 0C${-w} ${-h * 0.45} ${-w * 0.2} ${-h * 0.6} 0 ${-h}C${w * 0.1} ${-h * 0.62} ${w} ${-h * 0.5} ${w} 0Z`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${a + 90})`}>
      <path d={d} fill={t.orta} stroke={K} strokeWidth="3" strokeLinejoin="round" />
      <path d={`M${-w * 0.45} 0C${-w * 0.5} ${-h * 0.3} ${-w * 0.1} ${-h * 0.45} 0 ${-h * 0.72}C${w * 0.05} ${-h * 0.4} ${w * 0.45} ${-h * 0.3} ${w * 0.45} 0Z`} fill={t.acik} />
      <path d={`M${w * 0.55} 0C${w * 0.8} ${-h * 0.3} ${w * 0.4} ${-h * 0.5} ${w * 0.15} ${-h * 0.8}C${w * 0.9} ${-h * 0.5} ${w} ${-h * 0.25} ${w} 0Z`} fill={t.koyu} />
      <path d={d} fill="none" stroke={K} strokeWidth="3" strokeLinejoin="round" />
    </g>
  );
}

/** Taç (altın, 3 uçlu ya da 5 uçlu); taban y = 0, ortalı */
function Tac({ y, w, h, uc = 3, tas = null }) {
  const a = w / 2, adim = w / (uc - 1);
  const p = [[-a, 0]];
  for (let i = 0; i < uc; i += 1) {
    const x = -a + i * adim;
    const yuk = i === (uc - 1) / 2 ? h : h * 0.72;
    if (i > 0) p.push([x - adim / 2, -h * 0.3]);
    p.push([x, -yuk]);
  }
  p.push([a, 0]);
  return (
    <g transform={`translate(0 ${y})`}>
      <polygon points={cokgen(p)} fill={ALTIN.orta} stroke={K} strokeWidth="3" strokeLinejoin="round" />
      <polygon points={cokgen(p.filter(([x]) => x <= 0).concat([[0, 0]]))} fill={ALTIN.acik} opacity=".7" />
      <polygon points={cokgen(p.filter(([x]) => x >= 0).concat([[0, 0]]))} fill={ALTIN.koyu} opacity=".75" />
      <polygon points={cokgen(p)} fill="none" stroke={K} strokeWidth="3" strokeLinejoin="round" />
      <rect x={-a - 2} y="-3" width={w + 4} height="9" rx="2" fill={ALTIN.orta} stroke={K} strokeWidth="3" />
      <rect x={-a + 1} y="1.5" width={w - 2} height="3" fill={ALTIN.koyu} />
      {Array.from({ length: uc }, (_, i) => {
        const x = -a + i * adim, yuk = i === (uc - 1) / 2 ? h : h * 0.72;
        return <circle key={i} cx={x} cy={-yuk} r="3.6" fill={i === (uc - 1) / 2 && tas ? tas.orta : ALTIN.acik} stroke={K} strokeWidth="2.2" />;
      })}
    </g>
  );
}

/** Alt plaka (köşeli kısa levha + ortada taş) — Bronz/Gümüş/Altın'daki alt plakanın dili */
function AltPlaka({ y = 72, w = 46, t, tas }) {
  return (
    <g>
      <rect x={-w / 2} y={y} width={w} height="20" rx="6" fill={t.orta} stroke={K} strokeWidth="3.5" />
      <path d={`M${-w / 2} ${y + 11}H${w / 2}V${y + 14}Q${w / 2} ${y + 20} ${w / 2 - 6} ${y + 20}H${-w / 2 + 6}Q${-w / 2} ${y + 20} ${-w / 2} ${y + 14}Z`} fill={t.koyu} />
      <rect x={-w / 2} y={y} width={w} height="20" rx="6" fill="none" stroke={K} strokeWidth="3.5" />
      <Tas y={y + 9} w={14} h={12} t={tas} />
    </g>
  );
}

const Delik = () => <circle r="56" fill="none" stroke={K} strokeWidth="3.5" />;
const IcCizgi = () => <circle r="60" fill="none" stroke={K} strokeWidth="3" />;

/* ---------------------------- ELMAS ---------------------------- */
function ElmasV1() {   // Kesme taş: 12 yüzlü faset halka + büyük pırlanta tepe + alt plaka
  const n = 12, ro = 76, ri = 58;
  const yuzler = Array.from({ length: n }, (_, i) => {
    const a0 = (360 / n) * i - 90, a1 = a0 + 360 / n, am = a0 + 180 / n;
    const isik = Math.cos(((am - 225) * Math.PI) / 180);   // sol-üst = 1, sağ-alt = -1
    const renk = isik > 0.35 ? ELMAS.acik : isik < -0.35 ? ELMAS.koyu : ELMAS.orta;
    return <polygon key={i} points={cokgen([nok(ro, a0), nok(ro, a1), nok(ri, a1), nok(ri, a0)])} fill={renk} stroke={K} strokeWidth="1.6" strokeLinejoin="round" />;
  });
  const dis = Array.from({ length: n }, (_, i) => nok(ro, (360 / n) * i - 90));
  return (
    <g>
      <polygon points={cokgen(dis)} fill="none" stroke={K} strokeWidth="6" strokeLinejoin="round" />
      <path d={halkaYolu(60, 55)} fill={K} fillRule="evenodd" />
      {yuzler}
      <polygon points={cokgen(dis)} fill="none" stroke={K} strokeWidth="3.5" strokeLinejoin="round" />
      <AltPlaka t={ELMAS} tas={ELMAS} />
      <Tas y={-86} w={40} h={34} t={ELMAS} beyaz />
      <IcCizgi /><Delik />
    </g>
  );
}
function ElmasV2() {   // Kristal taç: yuvarlak bant + tepede 5 kristal yelpaze + yanlarda kristal
  return (
    <g>
      <Kristal x={-26} y={-60} w={15} h={34} a={-32} t={ELMAS} />
      <Kristal x={26} y={-60} w={15} h={34} a={32} t={ELMAS} />
      <Kristal x={-13} y={-68} w={17} h={42} a={-14} t={ELMAS} />
      <Kristal x={13} y={-68} w={17} h={42} a={14} t={ELMAS} />
      <Kristal x={0} y={-70} w={20} h={52} t={ELMAS} />
      <Kristal x={-70} y={4} w={14} h={30} a={-100} t={ELMAS} />
      <Kristal x={70} y={4} w={14} h={30} a={100} t={ELMAS} />
      <Bant ro={74} ri={58} t={ELMAS} beyaz />
      {[45, 135].map((a) => { const [x, y] = nok(66, a); return <Tas key={a} x={x} y={y - 2} w={13} h={11} t={ELMAS} />; })}
      <AltPlaka t={ELMAS} tas={ELMAS} />
      <IcCizgi /><Delik />
    </g>
  );
}
function ElmasV3() {   // Buz kalkanı: yan eşkenar dörtgen kanatlar + çapraz taş çiviler + tepe taşı
  const kanat = (s) => (
    <g transform={`scale(${s} 1)`}>
      <polygon points="66,-30 116,0 66,30" fill={ELMAS.orta} stroke={K} strokeWidth="3.5" strokeLinejoin="round" />
      <polygon points="66,-30 116,0 88,0" fill={s > 0 ? ELMAS.acik : ELMAS.koyu} />
      <polygon points="66,30 116,0 88,0" fill={s > 0 ? ELMAS.koyu : ELMAS.acik} opacity=".85" />
      <path d="M66 -30L88 0L66 30M88 0H116" fill="none" stroke={K} strokeWidth="1.6" />
      <polygon points="66,-30 116,0 66,30" fill="none" stroke={K} strokeWidth="3.5" strokeLinejoin="round" />
    </g>
  );
  return (
    <g>
      {kanat(1)}{kanat(-1)}
      <Bant ro={74} ri={58} t={ELMAS} beyaz />
      <circle r="66" fill="none" stroke={ELMAS.koyu} strokeWidth="2" strokeDasharray="3 7" />
      {[225, 315, 45, 135].map((a) => { const [x, y] = nok(70, a); return <Tas key={a} x={x} y={y - 3} w={16} h={14} t={ELMAS} />; })}
      <Tas y={-84} w={28} h={24} t={ELMAS} />
      <AltPlaka t={ELMAS} tas={ELMAS} />
      <IcCizgi /><Delik />
    </g>
  );
}

/* ---------------------------- EFSANE ---------------------------- */
function EfsaneV1() {  // Ejder kanadı: iki yanda 3 katlı mor tüy kanat + altın taç
  const kanat = (s) => (
    <g transform={`scale(${s} 1)`}>
      {[[62, -16, 72, 74, 10], [66, 6, 64, 88, 10], [62, 28, 52, 108, 9]].map(([x, y, h, a, w], i) => (
        <Tuy key={i} x={x} y={y} w={w * 2.3} h={h} a={a} t={EFSANE} />
      ))}
      {[[60, -32, 44, 52], [56, -50, 34, 34]].map(([x, y, h, a], i) => <Tuy key={`u${i}`} x={x} y={y} w={15} h={h} a={a} t={EFSANE} />)}
    </g>
  );
  return (
    <g>
      {kanat(1)}{kanat(-1)}
      <Bant ro={74} ri={58} t={EFSANE} beyaz />
      <Tac y={-70} w={46} h={28} uc={3} tas={AL} />
      <AltPlaka t={EFSANE} tas={AL} />
      <IcCizgi /><Delik />
    </g>
  );
}
function EfsaneV2() {  // Yıldız taç: halkanın arkasında 5 kollu altın yıldız + 5 uçlu taç + yan taşlar
  const y = Array.from({ length: 10 }, (_, i) => nok(i % 2 ? 70 : 112, i * 36 - 90));
  return (
    <g>
            {Array.from({ length: 5 }, (_, i) => {
        const a = i * 72 - 90, uc = nok(112, a), sol = nok(70, a - 36), sag = nok(70, a + 36);
        const isik = Math.cos(((a - 225) * Math.PI) / 180);
        return (
          <g key={i}>
            <polygon points={cokgen([uc, sol, nok(62, a)])} fill={isik > -0.3 ? EFSANE.acik : EFSANE.orta} />
            <polygon points={cokgen([uc, sag, nok(62, a)])} fill={isik > 0.3 ? EFSANE.orta : EFSANE.koyu} />
            <line x1={uc[0]} y1={uc[1]} x2={nok(62, a)[0]} y2={nok(62, a)[1]} stroke={K} strokeWidth="1.6" />
          </g>
        );
      })}
      <polygon points={cokgen(y)} fill="none" stroke={K} strokeWidth="3.5" strokeLinejoin="round" />
      <Bant ro={74} ri={58} t={EFSANE} beyaz />
      <Tac y={-70} w={62} h={30} uc={5} tas={AL} />
      {[180, 0].map((a) => { const [x, yy] = nok(66, a); return <Tas key={a} x={x} y={yy - 3} w={15} h={13} t={AL} />; })}
      <AltPlaka t={EFSANE} tas={AL} />
      <IcCizgi /><Delik />
    </g>
  );
}
function EfsaneV3() {  // Alev hale: üst yarıda mor alev dilleri + çift bant + alt plaka
  const alevler = [-90, -62, -118, -36, -144, -10, -170].map((a, i) => (
    <Alev key={a} a={a} r={70} h={i === 0 ? 64 : i < 3 ? 54 : i < 5 ? 44 : 32} w={i === 0 ? 17 : 14} t={EFSANE} />
  ));
  return (
    <g>
      {alevler}
      <Bant ro={74} ri={58} t={EFSANE} beyaz />
      <path d={halkaYolu(80, 76)} fill={ALTIN.orta} stroke={K} strokeWidth="2.5" fillRule="evenodd" />
      <path d={dilim(80, 76, 20, 200)} fill={ALTIN.koyu} />
      <Tas y={-80} w={22} h={19} t={AL} />
      <AltPlaka t={EFSANE} tas={AL} />
      <IcCizgi /><Delik />
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
    <svg viewBox="-140 -140 280 280" aria-hidden="true" focusable="false" style={style}><C /></svg>
  );
}

/* ---------------------------- BP HALKASI ---------------------------- */
function HalkaV1() {   // Kalın tek altın halka + 12 kesik
  return (
    <g>
      <Bant ro={97} ri={82} t={ALTIN} beyaz kontur={3.5} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = i * 30 + 15, [x0, y0] = nok(82, a), [x1, y1] = nok(97, a);
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={K} strokeWidth="3.5" />;
      })}
    </g>
  );
}
function HalkaV2() {   // Üç tonlu kabartma (bevel) + 8 perçin
  return (
    <g>
      <path d={halkaYolu(97, 81)} fill={K} fillRule="evenodd" />
      <path d={halkaYolu(95, 83)} fill={ALTIN.orta} fillRule="evenodd" />
      <path d={dilim(95, 89, 200, 380)} fill={ALTIN.acik} />
      <path d={dilim(95, 89, 20, 200)} fill={ALTIN.koyu} />
      <path d={dilim(89, 83, 20, 200)} fill={ALTIN.acik} />
      <path d={dilim(89, 83, 200, 380)} fill={ALTIN.koyu} />
      <circle r="89" fill="none" stroke={K} strokeWidth="1.2" opacity=".55" />
      <path d={yay(93, 222, 238)} fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      {Array.from({ length: 8 }, (_, i) => {
        const [x, y] = nok(89, i * 45 + 22.5);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="5" fill={ALTIN.orta} stroke={K} strokeWidth="2.4" />
            <path d={`M${x - 2.6} ${y + 1.6}A3 3 0 0 1 ${x + 1.6} ${y - 2.6}`} fill="none" stroke={ALTIN.acik} strokeWidth="1.8" strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
}
function HalkaV3() {   // Işın / taç uçlu: üst yarıda altın ışınlar, tepede 3 taç ucu
  const isinlar = [];
  for (let a = -180; a <= 0; a += 15) {
    const tac = a === -90 || a === -60 || a === -120;
    const uzun = tac ? 122 : (a / 15) % 2 ? 104 : 112;
    const g = tac ? 9 : 6;
    const uc = nok(uzun, a), sol = nok(88, a - g), sag = nok(88, a + g);
    isinlar.push(
      <g key={a}>
        <polygon points={cokgen([sol, uc, sag])} fill={ALTIN.orta} stroke={K} strokeWidth="2.8" strokeLinejoin="round" />
        <polygon points={cokgen([sol, uc, nok(88, a)])} fill={a < -90 ? ALTIN.acik : ALTIN.orta} />
        <polygon points={cokgen([nok(88, a), uc, sag])} fill={a < -90 ? ALTIN.orta : ALTIN.koyu} />
        <polygon points={cokgen([sol, uc, sag])} fill="none" stroke={K} strokeWidth="2.8" strokeLinejoin="round" />
        {tac && <circle cx={uc[0]} cy={uc[1]} r="4.2" fill={ALTIN.acik} stroke={K} strokeWidth="2.2" />}
      </g>,
    );
  }
  return (
    <g>
      {isinlar}
      <Bant ro={92} ri={82} t={ALTIN} beyaz kontur={3} />
    </g>
  );
}
const HALKA = { v1: HalkaV1, v2: HalkaV2, v3: HalkaV3 };

/** `boyut` = avatarın dış çapı (çerçeve kutusu, 148 birim). Avatar kutusunun ortasına oturur. */
export function BpHalka({ varyant, boyut = 88 }) {
  const H = HALKA[varyant];
  if (!H) return null;
  const w = (boyut * 280) / 148;
  return (
    <svg className="qt-ok-bp-halka" viewBox="-140 -140 280 280" width={w} height={w} aria-hidden="true" focusable="false"
         style={{ marginLeft: -w / 2, marginTop: -w / 2 }}>
      <H />
    </svg>
  );
}
