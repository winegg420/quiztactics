export const LOGO_V4_KONSEPTLER = [
  { no: "01", ad: "Quiz Rush", aciklama: "Turuncu darbe katmanı ve öne eğilen harflerle hızlı, net bir mobil oyun başlığı.", aile: "rush", q: 1, ana: "#ff6b2c", ikinci: "#32d9e2", koyu: "#17213c" },
  { no: "02", ad: "Tactic Pop", aciklama: "Kalın lacivert kontur ve mor-sarı renk ayrımıyla enerjik, koleksiyonluk oyun kimliği.", aile: "pop", q: 2, ana: "#7c55ec", ikinci: "#ffca45", koyu: "#17213c" },
  { no: "03", ad: "Brainwave", aciklama: "Cyan kenar ışığı ve sıkı kelime ritmiyle modern, merak uyandıran arena yönü.", aile: "neon", q: 3, ana: "#35dbe3", ikinci: "#ff7a38", koyu: "#111b38" },
  { no: "04", ad: "Big Move", aciklama: "QUIZ üstte, TACTICS altta; mağaza görselinde uzaktan okunan güçlü iki katlı siluet.", aile: "stack", q: 4, ana: "#ff6b2c", ikinci: "#7c55ec", koyu: "#18264d" },
  { no: "05", ad: "Golden Play", aciklama: "Sıcak sarı hacim ve koyu dış çizgiyle premium ama steril olmayan title-logo.", aile: "gold", q: 5, ana: "#ffca45", ikinci: "#ff6b2c", koyu: "#17213c" },
  { no: "06", ad: "Arcade Snap", aciklama: "Basamaklı gölge ve kesik taban çizgisi klasik arcade enerjisini güncel bir dille taşır.", aile: "arcade", q: 6, ana: "#ffffff", ikinci: "#37dce5", koyu: "#17213c" },
  { no: "07", ad: "Purple Charge", aciklama: "Mor ana kütle ve sıcak kuyruk vurgusuyla app icon’da da güçlü kalan kompakt yön.", aile: "charge", q: 7, ana: "#8a55ee", ikinci: "#ffb62e", koyu: "#17213c" },
  { no: "08", ad: "Quiz Knockout", aciklama: "Sert olmayan yumruk etkili harf ağırlığı ve cyan karşı gölgeyle rekabetçi oyun hissi.", aile: "knockout", q: 8, ana: "#ff6433", ikinci: "#35dbe3", koyu: "#142044" },
  { no: "09", ad: "Ice Tactics", aciklama: "Buz mavisi üst katman, lacivert taban ve turuncu mikro vurgu ile temiz oyun mağazası görünümü.", aile: "ice", q: 9, ana: "#c8fbff", ikinci: "#39dbe4", koyu: "#142044" },
  { no: "10", ad: "Hot Streak", aciklama: "Sıcak renk geçişi ve yükselen taban çizgisiyle seri kazanma enerjisi taşıyan başlık.", aile: "hot", q: 10, ana: "#ffca45", ikinci: "#ff5e35", koyu: "#391a38" },
  { no: "11", ad: "Pocket Battle", aciklama: "Kısa, tok ve küçük ekran öncelikli oranlarıyla mobil header kullanımına odaklanan çözüm.", aile: "pocket", q: 1, ana: "#3ee0e5", ikinci: "#7c55ec", koyu: "#17213c" },
  { no: "12", ad: "Quiz Jam", aciklama: "Hafif sıçrayan harf tabanı ve turuncu-mor çarpışmasıyla sosyal oyun havası.", aile: "jam", q: 2, ana: "#ff743b", ikinci: "#8b5cf6", koyu: "#17213c" },
  { no: "13", ad: "Tactical Tilt", aciklama: "Tek parça ileri eğim, alt gölge ve TACTICS vurgusuyla kontrollü hız hissi.", aile: "tilt", q: 3, ana: "#ffffff", ikinci: "#ff6b2c", koyu: "#17213c" },
  { no: "14", ad: "Level Up", aciklama: "Yukarı çıkan iki satırlı düzen ve cyan yükselti katmanı ilerleme hissini doğrudan verir.", aile: "level", q: 4, ana: "#ffffff", ikinci: "#37dce5", koyu: "#24305d" },
  { no: "15", ad: "Orange Combo", aciklama: "Kalın turuncu iç yüzey, krem ışık ve mor gölgeyle sıcak, yüksek görünürlüklü oyun logosu.", aile: "combo", q: 5, ana: "#ff6b2c", ikinci: "#ffe59a", koyu: "#42265f" },
  { no: "16", ad: "Night Match", aciklama: "Koyu arena zemininde cyan ve sarı katmanlarla canlı yayın maçı hissi veren yön.", aile: "night", q: 6, ana: "#37dce5", ikinci: "#ffca45", koyu: "#101a36" },
  { no: "17", ad: "Split Score", aciklama: "QUIZ ve TACTICS’i iki güçlü renk bloğuna ayırırken tek başlık siluetini korur.", aile: "split", q: 7, ana: "#ffca45", ikinci: "#7c55ec", koyu: "#17213c" },
  { no: "18", ad: "Super Quiz", aciklama: "Geniş üst kontur ve iri TACTICS tabanıyla ana ekran kahraman alanına uygun çözüm.", aile: "super", q: 8, ana: "#ffffff", ikinci: "#ff6b2c", koyu: "#17213c" },
  { no: "19", ad: "Turbo Mind", aciklama: "Cyan hız izleri, sıkıştırılmış harfler ve sarı vurgu; yarış değil hızlı düşünme hissi.", aile: "turbo", q: 9, ana: "#37dce5", ikinci: "#ffca45", koyu: "#17213c" },
  { no: "20", ad: "Signature Play", aciklama: "Asimetrik Q, çift katman ve dengeli renk ayrımıyla turun en özgün ana marka adayı.", aile: "signature", q: 10, ana: "#ff6b2c", ikinci: "#7c55ec", koyu: "#17213c" },
];

function OyunQ({ tip, x = 0, y = 0, boyut = 100, dolgu, vurgu, kontur = "#17213c", stroke = 8 }) {
  const t = `translate(${x} ${y}) scale(${boyut / 100})`;
  const ortak = { fill: dolgu, stroke: kontur, strokeWidth: stroke, strokeLinejoin: "round" };
  if (tip === 1) return <g transform={t}><path d="M15 18Q26 7 50 7q40 0 40 40T50 87Q9 87 9 47q0-18 6-29Zm22 12q-10 5-10 18 0 19 22 19 20 0 22-19 0-20-22-20-7 0-12 2Z" fillRule="evenodd" {...ortak}/><path d="m52 61 39 31-28-5-22-18Z" fill={vurgu} stroke={kontur} strokeWidth={stroke} strokeLinejoin="round"/></g>;
  if (tip === 2) return <g transform={t}><path d="M18 18Q31 5 53 7q37 3 38 40 1 39-39 41Q10 88 8 48 7 29 18 18Zm20 13q-11 5-11 18 1 19 22 20 21 0 23-20-1-20-22-21-7 0-12 3Z" fillRule="evenodd" {...ortak}/><path d="m55 62 16 7 20 18-23 1-25-19Z" fill={vurgu} stroke={kontur} strokeWidth={stroke} strokeLinejoin="round"/></g>;
  if (tip === 3) return <g transform={`${t} skewX(-8)`}><path d="m20 11 57 0 14 16-6 43-15 17H23L8 72l6-46Zm20 20-7 7-3 22 7 7h20l8-8 3-21-7-7Z" fillRule="evenodd" {...ortak}/><path d="m53 58 35 26-16 11-33-27Z" fill={vurgu} stroke={kontur} strokeWidth={stroke}/></g>;
  if (tip === 4) return <g transform={t}><path d="M17 14Q31 5 51 6q42 1 42 41T51 88Q8 88 8 47q0-21 9-33Zm22 15q-12 5-12 19 0 20 22 20t23-20q0-21-22-21-6 0-11 2Z" fillRule="evenodd" {...ortak}/><path d="m50 62 22 4 20 25-24-5-27-18Z" fill={vurgu} stroke={kontur} strokeWidth={stroke}/></g>;
  if (tip === 5) return <g transform={t}><path d="M17 17Q30 6 51 7q40 1 41 40 0 41-41 42Q9 89 8 48 8 29 17 17Zm21 14q-11 5-11 18 0 20 22 20t23-20q0-21-22-21-7 0-12 3Z" fillRule="evenodd" {...ortak}/><path d="m54 60 38 30-25-2-27-20Z" fill={vurgu} stroke={kontur} strokeWidth={stroke}/><path d="M28 20q22-13 45 1" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".55"/></g>;
  if (tip === 6) return <g transform={t}><path d="M15 22 27 9h51l14 15-5 49-13 15H22L8 73l4-39Zm24 8-8 8-3 22 7 8h20l9-8 3-22-7-8Z" fillRule="evenodd" {...ortak}/><path d="m51 58 39 24-14 13-38-27Z" fill={vurgu} stroke={kontur} strokeWidth={stroke}/></g>;
  if (tip === 7) return <g transform={t}><path d="M50 6Q8 6 8 48t42 42q41 0 42-42Q91 6 50 6Zm0 22q21 0 21 20T50 68Q29 68 29 48t21-20Z" fillRule="evenodd" {...ortak}/><path d="m53 59 17 9 25 2-15 12 10 13-23-8-29-20Z" fill={vurgu} stroke={kontur} strokeWidth={stroke}/></g>;
  if (tip === 8) return <g transform={`${t} skewX(-6)`}><path d="M18 15Q31 5 53 7q39 3 39 41 0 40-41 41Q8 88 8 48q0-21 10-33Zm21 15q-11 5-11 19 0 20 22 20 21 0 22-20 0-21-22-21-6 0-11 2Z" fillRule="evenodd" {...ortak}/><path d="m54 60 37 26-18 10-35-28Z" fill={vurgu} stroke={kontur} strokeWidth={stroke}/></g>;
  if (tip === 9) return <g transform={t}><path d="M15 17Q28 6 51 7q42 1 42 41T51 89Q8 89 8 48q0-19 7-31Zm24 13q-12 5-12 19 0 20 22 20t23-20q0-21-22-21-6 0-11 2Z" fillRule="evenodd" {...ortak}/><path d="m52 61 39 30-25-3-27-20Z" fill={vurgu} stroke={kontur} strokeWidth={stroke}/><path d="M17 30h14M12 43h12" stroke={vurgu} strokeWidth="7" strokeLinecap="round"/></g>;
  return <g transform={t}><path d="M20 14Q33 5 54 8q37 5 38 40 1 38-39 41Q10 88 8 50 7 29 20 14Zm19 17q-11 5-11 19 1 20 22 20t22-21q-1-20-22-21-6 0-11 3Z" fillRule="evenodd" {...ortak}/><path d="m50 61 17 8 28-5-16 17 13 13-27-7-28-19Z" fill={vurgu} stroke={kontur} strokeWidth={stroke}/></g>;
}

function Yazi({ x, y, metin, fill, stroke, strokeWidth = 0, size = 80, anchor, transform, opacity = 1 }) {
  return <text x={x} y={y} fill={fill} stroke={stroke} strokeWidth={strokeWidth} paintOrder="stroke fill"
    fontFamily="'Baloo 2', 'Arial Rounded MT Bold', sans-serif" fontSize={size} fontWeight="900"
    letterSpacing="-2" textAnchor={anchor} transform={transform} opacity={opacity}>{metin}</text>;
}

function YatayLogo({ c, koyu }) {
  const zeminKoyu = koyu;
  const kontur = zeminKoyu ? "#0b1430" : c.koyu;
  const beyaz = "#fffdf7";
  const quiz = ["arcade", "tilt", "super"].includes(c.aile) ? beyaz : c.ana;
  const tactics = c.ikinci;
  const egim = ["rush", "knockout", "tilt", "turbo"].includes(c.aile) ? "skewX(-7)" : undefined;
  const y = 132;
  const offset = c.aile === "pocket" ? 4 : 8;
  return <>
    {c.aile === "neon" && <path d="M25 166H720" stroke={c.ana} strokeWidth="5" opacity=".35"/>}
    {c.aile === "rush" && <><path d="M24 43h65M10 60h48" stroke={c.ikinci} strokeWidth="10" strokeLinecap="round"/><path d="M32 171h665" stroke={c.ana} strokeWidth="12"/><path d="m641 171 42-18h45l-28 18Z" fill={c.ikinci}/></>}
    {c.aile === "turbo" && <><path d="M8 54h68M20 73h42" stroke={c.ana} strokeWidth="8"/><path d="M48 173h620l32-15" fill="none" stroke={c.ikinci} strokeWidth="8"/></>}
    {c.aile === "signature" && <path d="M30 174H710" stroke={c.ikinci} strokeWidth="9" strokeLinecap="round"/>}
    <g transform={egim}>
      <OyunQ tip={c.q} x={28} y={48 + offset} boyut={108} dolgu={quiz} vurgu={tactics} kontur={kontur} stroke={9}/>
      <Yazi x="136" y={y + offset} metin="UIZ" fill={quiz} stroke={kontur} strokeWidth={c.aile === "neon" ? 11 : 9} size={88}/>
      <Yazi x="294" y={y + offset + 7} metin="TACTICS" fill={tactics} stroke={kontur} strokeWidth={c.aile === "gold" ? 12 : 9} size={76}/>
      {!["pocket", "neon"].includes(c.aile) && <Yazi x="294" y={y + offset + 13} metin="TACTICS" fill={c.aile === "gold" ? "#ef8f23" : kontur} size={76} opacity=".22"/>}
    </g>
  </>;
}

function KatliLogo({ c, koyu }) {
  const kontur = koyu ? "#0a1330" : c.koyu;
  const quiz = c.aile === "combo" ? c.ana : "#fffdf7";
  return <>
    {c.aile === "level" && <><path d="M88 46h520" stroke={c.ikinci} strokeWidth="11" strokeLinecap="round"/><path d="M118 199h520" stroke={c.ana} strokeWidth="9" strokeLinecap="round"/></>}
    {c.aile === "split" && <><rect x="40" y="40" width="320" height="82" rx="24" fill={c.koyu}/><rect x="250" y="111" width="460" height="78" rx="24" fill={c.ikinci}/></>}
    <g transform={c.aile === "jam" ? "rotate(-2 380 110)" : undefined}>
      <OyunQ tip={c.q} x={c.aile === "split" ? 60 : 100} y="32" boyut="92" dolgu={c.aile === "split" ? c.ana : quiz} vurgu={c.ikinci} kontur={kontur} stroke="9"/>
      <Yazi x={c.aile === "split" ? 155 : 195} y="111" metin="UIZ" fill={c.aile === "split" ? c.ana : quiz} stroke={kontur} strokeWidth="9" size="82"/>
      <Yazi x="380" y="184" metin="TACTICS" fill={c.aile === "split" ? "#fff" : c.ikinci} stroke={kontur} strokeWidth="10" size="83" anchor="middle"/>
    </g>
    {c.aile === "stack" && <path d="M138 194h485" stroke={c.ana} strokeWidth="8" strokeLinecap="round"/>}
    {c.aile === "jam" && <><circle cx="73" cy="61" r="8" fill={c.ikinci}/><circle cx="682" cy="151" r="7" fill={c.ana}/></>}
    {c.aile === "combo" && <path d="M165 197h428" stroke={c.ikinci} strokeWidth="7" strokeLinecap="round"/>}
  </>;
}

export default function LogoWordmarkV4({ tip, ikon = false, koyu = false }) {
  const c = LOGO_V4_KONSEPTLER[tip - 1];
  if (!c) return null;
  const katli = ["stack", "jam", "level", "combo", "split"].includes(c.aile);
  return <svg viewBox={ikon ? "0 0 120 120" : "0 0 760 220"} role="img" aria-label={`QUIZ TACTICS oyun logosu konsepti ${tip}`}>
    <defs>
      <filter id={`v4-shadow-${tip}`} x="-20%" y="-20%" width="150%" height="160%">
        <feDropShadow dx="0" dy="9" stdDeviation="1.5" floodColor={c.koyu} floodOpacity=".3"/>
      </filter>
    </defs>
    <g filter={`url(#v4-shadow-${tip})`}>
      {ikon
        ? <OyunQ tip={c.q} x="10" y="10" boyut="100" dolgu={c.ana} vurgu={c.ikinci} kontur={koyu ? "#0b1430" : c.koyu} stroke="8"/>
        : katli ? <KatliLogo c={c} koyu={koyu}/> : <YatayLogo c={c} koyu={koyu}/>
      }
    </g>
  </svg>;
}
