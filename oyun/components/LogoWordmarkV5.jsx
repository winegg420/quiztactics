export const LOGO_V5_ADAYLAR = [
  { no: "01", ad: "Core Q", eksen: "Q ODAKLI", q: 1, duzen: "q-guclu", aciklama: "Super Quiz oranlarını koruyan, tek başına da net okunan kontrollü Q sistemi." },
  { no: "02", ad: "Bold Balance", eksen: "HİBRİT", q: 2, duzen: "denge", aciklama: "Golden Play okunaklılığını, Knockout enerjisiyle en ölçülü noktada birleştirir." },
  { no: "03", ad: "Tactics Lead", eksen: "WORDMARK ODAKLI", q: 1, duzen: "tactics", aciklama: "TACTICS kelimesini ağırlık ve turuncuyla öne çıkarırken QUIZ bütünlüğünü korur." },
  { no: "04", ad: "Compact Play", eksen: "HİBRİT", q: 3, duzen: "kompakt", aciklama: "Header ve mağaza kartında küçük ölçekte en hızlı okunan sıkı yatay çözüm." },
  { no: "05", ad: "Stacked Title", eksen: "WORDMARK ODAKLI", q: 2, duzen: "katli", aciklama: "Splash ve kampanya görselleri için iki satırlı, güçlü fakat dekorsuz oyun başlığı." },
  { no: "06", ad: "Final Hybrid", eksen: "Q ODAKLI + WORDMARK", q: 3, duzen: "final", aciklama: "Özel Q, temiz harf ritmi ve dengeli TACTICS vurgusuyla önerilen ana marka yönü." },
];

function FinalQ({ varyant = 1, x = 0, y = 0, boyut = 100, dolgu = "#fff", vurgu = "#ff6b2c", kontur = "#17213c" }) {
  const t = `translate(${x} ${y}) scale(${boyut / 100})`;
  if (varyant === 2) return <g transform={t}>
    <path d="M50 7C23 7 8 22 8 48s15 42 42 42 42-16 42-42S77 7 50 7Zm0 22c14 0 21 7 21 19s-7 20-21 20-21-8-21-20 7-19 21-19Z" fill={dolgu} stroke={kontur} strokeWidth="8" strokeLinejoin="round" fillRule="evenodd"/>
    <path d="m52 60 16 8 24 17-21 4-31-21Z" fill={vurgu} stroke={kontur} strokeWidth="8" strokeLinejoin="round"/>
  </g>;
  if (varyant === 3) return <g transform={t}>
    <path d="M19 15Q32 6 52 7q39 2 40 40 0 41-41 42Q9 89 8 48 8 28 19 15Zm20 15q-11 5-11 19 0 20 22 20 21 0 22-20 0-21-22-21-6 0-11 2Z" fill={dolgu} stroke={kontur} strokeWidth="8" strokeLinejoin="round" fillRule="evenodd"/>
    <path d="m52 61 18 8 22-3-13 13 11 12-22-5-30-18Z" fill={vurgu} stroke={kontur} strokeWidth="8" strokeLinejoin="round"/>
  </g>;
  return <g transform={t}>
    <path d="M18 15Q31 6 52 7q40 2 40 40T51 89Q9 89 8 48 8 28 18 15Zm21 15q-11 5-11 19 0 20 22 20t22-20q0-21-22-21-6 0-11 2Z" fill={dolgu} stroke={kontur} strokeWidth="8" strokeLinejoin="round" fillRule="evenodd"/>
    <path d="m52 61 39 28-24-2-29-19Z" fill={vurgu} stroke={kontur} strokeWidth="8" strokeLinejoin="round"/>
  </g>;
}

function Metin({ x, y, children, fill, stroke, strokeWidth = 0, size = 84, anchor, spacing = -2 }) {
  return <text x={x} y={y} fill={fill} stroke={stroke} strokeWidth={strokeWidth} paintOrder="stroke fill"
    fontFamily="'Baloo 2', 'Arial Rounded MT Bold', sans-serif" fontWeight="900" fontSize={size}
    letterSpacing={spacing} textAnchor={anchor}>{children}</text>;
}

function Yatay({ aday, koyu }) {
  const lacivert = koyu ? "#f8fbff" : "#17213c";
  const kontur = koyu ? "#0b1430" : "#17213c";
  const turuncu = "#ff6b2c";
  const qBoyut = aday.duzen === "q-guclu" ? 132 : aday.duzen === "kompakt" ? 94 : 104;
  const qX = aday.duzen === "kompakt" ? 42 : 28;
  const qY = aday.duzen === "q-guclu" ? 35 : 54;
  const uizX = qX + qBoyut - 4;
  const uizSize = aday.duzen === "q-guclu" ? 80 : aday.duzen === "kompakt" ? 78 : 88;
  const tacticsX = aday.duzen === "tactics" ? 284 : aday.duzen === "q-guclu" ? 318 : aday.duzen === "kompakt" ? 286 : 305;
  const tacticsSize = aday.duzen === "tactics" ? 92 : aday.duzen === "q-guclu" ? 70 : aday.duzen === "kompakt" ? 72 : 78;
  const taban = aday.duzen === "kompakt" ? 138 : 145;
  return <g>
    <FinalQ varyant={aday.q} x={qX} y={qY} boyut={qBoyut} dolgu={aday.duzen === "denge" ? "#fff" : lacivert} vurgu={turuncu} kontur={kontur}/>
    <Metin x={uizX} y={taban} fill={lacivert} stroke={kontur} strokeWidth={aday.duzen === "denge" ? 7 : 0} size={uizSize}>UIZ</Metin>
    <Metin x={tacticsX} y={taban} fill={turuncu} stroke={kontur} strokeWidth={aday.duzen === "tactics" ? 7 : 5} size={tacticsSize}>TACTICS</Metin>
  </g>;
}

function Katli({ aday, koyu }) {
  const lacivert = koyu ? "#f8fbff" : "#17213c";
  const kontur = koyu ? "#0b1430" : "#17213c";
  const turuncu = "#ff6b2c";
  const final = aday.duzen === "final";
  return <g>
    <FinalQ varyant={aday.q} x={final ? 124 : 142} y="26" boyut={final ? 101 : 94} dolgu={lacivert} vurgu={turuncu} kontur={kontur}/>
    <Metin x={final ? 223 : 236} y="111" fill={lacivert} stroke={kontur} strokeWidth="2" size={final ? 91 : 82}>UIZ</Metin>
    <Metin x="380" y="195" fill={turuncu} stroke={kontur} strokeWidth={final ? 8 : 7} size={final ? 92 : 88} anchor="middle">TACTICS</Metin>
  </g>;
}

export default function LogoWordmarkV5({ tip, ikon = false, koyu = false }) {
  const aday = LOGO_V5_ADAYLAR[tip - 1];
  if (!aday) return null;
  const katli = ["katli", "final"].includes(aday.duzen);
  return <svg viewBox={ikon ? "0 0 120 120" : "0 0 760 230"} role="img" aria-label={`QUIZ TACTICS final logo adayı ${tip}`}>
    <defs><filter id={`v5-golge-${tip}`} x="-20%" y="-20%" width="150%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="1.2" floodColor="#0b1430" floodOpacity=".24"/></filter></defs>
    <g filter={`url(#v5-golge-${tip})`}>
      {ikon
        ? <FinalQ varyant={aday.q} x="10" y="10" boyut="100" dolgu={koyu ? "#fff" : "#17213c"} vurgu="#ff6b2c" kontur="#0b1430"/>
        : katli ? <Katli aday={aday} koyu={koyu}/> : <Yatay aday={aday} koyu={koyu}/>
      }
    </g>
  </svg>;
}
