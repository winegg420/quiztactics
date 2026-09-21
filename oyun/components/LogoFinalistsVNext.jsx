export const LOGO_VNEXT_ADAYLAR = [
  { no: "01", ad: "Hero Q", tur: "APP ICON ODAKLI", q: 1, duzen: "hero", aciklama: "En güçlü Q silueti ile TACTICS’i aynı ağırlıkta buluşturan ana ikon adayı." },
  { no: "02", ad: "Tactical Core", tur: "DENGELİ", q: 2, duzen: "core", aciklama: "Kompakt Q, geri çekilmiş UIZ ve tok TACTICS ile en güvenli yatay sistem." },
  { no: "03", ad: "Forward T", tur: "WORDMARK ODAKLI", q: 1, duzen: "forward", aciklama: "TACTICS tarafındaki kontrollü eğim, yarış estetiğine kaçmadan hamle hissi verir." },
  { no: "04", ad: "Tactics Stack", tur: "WORDMARK ODAKLI", q: 3, duzen: "stack", aciklama: "Q tüm yüksekliği taşırken küçük UIZ ve güçlü TACTICS iki katlı oyun başlığı kurar." },
  { no: "05", ad: "Pocket Hero", tur: "APP ICON ODAKLI", q: 2, duzen: "pocket", aciklama: "Küçük header ve mağaza kartında Q kimliğini kaybetmeden en hızlı okunan finalist." },
  { no: "06", ad: "Arena Type", tur: "WORDMARK ODAKLI", q: 3, duzen: "arena", aciklama: "Gece mavisi sahnede beyaz Q ve turuncu TACTICS ile canlı maç enerjisi taşır." },
  { no: "07", ad: "Smart Move", tur: "DENGELİ", q: 1, duzen: "smart", aciklama: "Sınırlı cyan dokunuşuyla modernleşen, ana lacivert-turuncu eksenini bozmayan yön." },
  { no: "08", ad: "Master Balance", tur: "EN DENGELİ FİNALİST", q: 3, duzen: "master", aciklama: "Q, küçük UIZ ve TACTICS hiyerarşisini en net marka sisteminde birleştirir." },
];

function KahramanQ({ tip = 1, x = 0, y = 0, boyut = 100, ana = "#17213c", vurgu = "#ff6b2c", kontur = "#0c1633" }) {
  const t = `translate(${x} ${y}) scale(${boyut / 100})`;
  if (tip === 2) return <g transform={t}>
    <path d="M50 7Q8 7 8 49t42 42q42 0 42-42T50 7Zm0 23q20 0 20 19T50 68Q29 68 29 49t21-19Z" fill={ana} stroke={kontur} strokeWidth="7" strokeLinejoin="round" fillRule="evenodd"/>
    <path d="m53 61 17 7 23 18-22 3-31-21Z" fill={vurgu} stroke={kontur} strokeWidth="7" strokeLinejoin="round"/>
  </g>;
  if (tip === 3) return <g transform={t}>
    <path d="M18 16Q30 6 52 7q40 2 40 41T51 90Q9 89 8 49 8 29 18 16Zm21 15q-11 5-11 18 0 20 22 20t22-20q0-20-22-21-6 0-11 3Z" fill={ana} stroke={kontur} strokeWidth="7" strokeLinejoin="round" fillRule="evenodd"/>
    <path d="m51 61 18 8 24-4-14 14 12 12-24-5-29-18Z" fill={vurgu} stroke={kontur} strokeWidth="7" strokeLinejoin="round"/>
  </g>;
  return <g transform={t}>
    <path d="M17 16Q29 6 51 7q41 1 41 41T51 90Q8 90 8 49 8 29 17 16Zm22 15q-11 5-11 18 0 20 22 20t22-20q0-20-22-21-6 0-11 3Z" fill={ana} stroke={kontur} strokeWidth="7" strokeLinejoin="round" fillRule="evenodd"/>
    <path d="m52 61 40 28-25-2-29-19Z" fill={vurgu} stroke={kontur} strokeWidth="7" strokeLinejoin="round"/>
  </g>;
}

function SvgYazi({ x, y, children, fill, stroke, strokeWidth = 0, size, anchor, transform, spacing = -2 }) {
  return <text x={x} y={y} fill={fill} stroke={stroke} strokeWidth={strokeWidth} paintOrder="stroke fill"
    fontFamily="'Baloo 2', 'Arial Rounded MT Bold', sans-serif" fontSize={size} fontWeight="900"
    letterSpacing={spacing} textAnchor={anchor} transform={transform}>{children}</text>;
}

function Yatay({ aday, koyu }) {
  const gece = koyu ? "#fff" : "#17213c";
  const kontur = koyu ? "#0a1330" : "#17213c";
  const turuncu = "#ff6b2c";
  const cyan = "#39dbe4";
  const hero = aday.duzen === "hero";
  const pocket = aday.duzen === "pocket";
  const forward = aday.duzen === "forward";
  const smart = aday.duzen === "smart";
  const qBoy = hero ? 134 : pocket ? 105 : 122;
  const qX = hero ? 28 : pocket ? 48 : 34;
  const qY = hero ? 35 : pocket ? 51 : 41;
  const uizX = qX + qBoy - (hero ? 1 : 5);
  const uizY = pocket ? 117 : 112;
  const tacticsX = hero ? 308 : pocket ? 285 : forward ? 275 : 292;
  const tacticsY = pocket ? 145 : 151;
  return <g>
    <KahramanQ tip={aday.q} x={qX} y={qY} boyut={qBoy} ana={gece} vurgu={smart ? cyan : turuncu} kontur={kontur}/>
    <SvgYazi x={uizX} y={uizY} fill={koyu ? "#c8d2e7" : "#657493"} size={hero ? 47 : pocket ? 43 : 49} spacing="-1">UIZ</SvgYazi>
    <SvgYazi x={tacticsX} y={tacticsY} fill={turuncu} stroke={kontur} strokeWidth={forward ? 7 : 5} size={hero ? 87 : pocket ? 77 : 84} transform={forward ? "skewX(-5)" : undefined}>TACTICS</SvgYazi>
  </g>;
}

function Katli({ aday, koyu }) {
  const gece = koyu ? "#fff" : "#17213c";
  const kontur = koyu ? "#0a1330" : "#17213c";
  const master = aday.duzen === "master";
  const arena = aday.duzen === "arena";
  return <g>
    <KahramanQ tip={aday.q} x={master ? 100 : 112} y="32" boyut={master ? 136 : 128} ana={gece} vurgu="#ff6b2c" kontur={kontur}/>
    <SvgYazi x={master ? 234 : 236} y="102" fill={koyu ? "#c8d2e7" : "#657493"} size={master ? 49 : 46} spacing="-1">UIZ</SvgYazi>
    <SvgYazi x={master ? 252 : 262} y="181" fill="#ff6b2c" stroke={kontur} strokeWidth={arena ? 7 : 6} size={master ? 100 : 94}>TACTICS</SvgYazi>
  </g>;
}

export default function LogoFinalistVNext({ tip, ikon = false, koyu = false }) {
  const aday = LOGO_VNEXT_ADAYLAR[tip - 1];
  if (!aday) return null;
  const katli = ["stack", "arena", "master"].includes(aday.duzen);
  const qAna = koyu ? "#fff" : "#17213c";
  const qVurgu = aday.duzen === "smart" ? "#39dbe4" : "#ff6b2c";
  return <svg viewBox={ikon ? "0 0 120 120" : "0 0 760 225"} role="img" aria-label={`QUIZ TACTICS logo finalisti ${tip}`}>
    <defs><filter id={`vnext-shadow-${tip}`} x="-20%" y="-20%" width="150%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="1.2" floodColor="#0a1330" floodOpacity=".22"/></filter></defs>
    <g filter={`url(#vnext-shadow-${tip})`}>
      {ikon
        ? <KahramanQ tip={aday.q} x="10" y="10" boyut="100" ana={qAna} vurgu={qVurgu} kontur="#0a1330"/>
        : katli ? <Katli aday={aday} koyu={koyu}/> : <Yatay aday={aday} koyu={koyu}/>
      }
    </g>
  </svg>;
}
