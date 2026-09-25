/**
 * Quiz Tactics resmi logosu — "Şeker Q harfli yazı" (Ida seçimi, 25 Eyl 2026;
 * tasarim/SECIMLER_GORSEL_REVIZYON.md madde 12; aday `oyun/tasarim/gorsel-revizyon/a/cizim/logo.jsx › LogoA`).
 * Q harfi uygulama ikonuyla (public/quiztactics-sekerq-favicon.svg) aynı çizim: beyaz dolgu, kalın lacivert
 * kontur, sarı kuyruk, ince gök mavisi parlama. "UIZ" üstte beyaz, "TACTICS" altta turuncu — ikisi de kabarık
 * (lacivert derinlik kopyası + kontur) Baloo 2. Q, "QUIZ"in Q'sunun YERİNE geçer (yan yana "QQUIZ" okunmasın).
 */
const LACIVERT = "#1d2152";
const TURUNCU = "#ff7a2e";
const SARI = "#ffd23a";
const GOK = "#dff0ff";
const Q_YOL = "M56 10C28 10 10 29 10 58s18 48 46 48c10 0 19-2 27-7l12 11h21L94 88c7-8 10-18 10-30 0-29-19-48-48-48Zm0 23c15 0 25 10 25 25S71 83 56 83 33 73 33 58s8-25 23-25Z";
const Q_KUYRUK = "m73 78 21 10 15 15H94L69 85Z";
const YAZI = { fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 800 };

/** Şeker Q harfi: lacivert gölge kopyası + beyaz dolgu + lacivert kontur + sarı kuyruk + tek parlama vuruşu. */
function SekerQ({ x = 0, y = 0, s = 1, kontur = LACIVERT, dolgu = "#fff" }) {
  const t = (dy) => `translate(${x} ${y + dy}) scale(${s}) translate(7 -1) skewX(-7)`;
  return (
    <>
      <g transform={t(6)} fill={kontur} stroke={kontur} strokeWidth="7" strokeLinejoin="round">
        <path d={Q_YOL} fillRule="evenodd" /><path d={Q_KUYRUK} />
      </g>
      <g transform={t(0)} strokeLinejoin="round">
        <path d={Q_YOL} fillRule="evenodd" fill={dolgu} stroke={kontur} strokeWidth="7" paintOrder="stroke fill" />
        <path d={Q_KUYRUK} fill={SARI} stroke={kontur} strokeWidth="7" paintOrder="stroke fill" />
        <path d="M30 40c6-10 16-17 28-19" fill="none" stroke={GOK} strokeWidth="6" strokeLinecap="round" />
      </g>
    </>
  );
}

/** Kabarık yazı: lacivert derinlik kopyası + konturlu dolgu (LogoA ile aynı teknik). */
function Yazi({ x, y, boy, dolgu, kontur = LACIVERT, w = 8, derin = 6, ls = -2, children }) {
  return (
    <>
      <text x={x} y={y + derin} fontSize={boy} letterSpacing={ls} fill={kontur} stroke={kontur} strokeWidth={w} strokeLinejoin="round" {...YAZI}>{children}</text>
      <text x={x} y={y} fontSize={boy} letterSpacing={ls} fill={dolgu} stroke={kontur} strokeWidth={w} strokeLinejoin="round" paintOrder="stroke fill" {...YAZI}>{children}</text>
    </>
  );
}

export default function Logo({ boyut = 38, className = "", koyu = false, sadeceIkon = false }) {
  const kontur = koyu ? "#0a1330" : LACIVERT;
  if (sadeceIkon) {
    return (
      <svg className={`bd-logo ${className}`} width={boyut} height={boyut} viewBox="0 0 120 120"
           role="img" aria-label="Quiz Tactics" focusable="false">
        <SekerQ x={7} y={-1} s={1} kontur={kontur} />
      </svg>
    );
  }
  const genislik = Math.round(boyut * 2.95);
  return (
    <svg className={`bd-logo ${className}`} width={genislik} height={boyut} viewBox="0 0 590 200"
         role="img" aria-label="Quiz Tactics" focusable="false">
      <SekerQ x={2} y={4} s={1.62} kontur={kontur} />
      <Yazi x={196} y={84} boy={62} dolgu={koyu ? "#dfe6f7" : "#fff"} kontur={kontur} w={9} derin={5}>UIZ</Yazi>
      <Yazi x={178} y={178} boy={104} dolgu={TURUNCU} kontur={kontur} w={10} derin={8}>TACTICS</Yazi>
    </svg>
  );
}
