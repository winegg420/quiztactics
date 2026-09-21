/**
 * Quiz Tactics resmi logosu — vNext 08 Master Balance.
 * Q ve TACTICS ana ağırlığı taşır; UIZ küçük ama okunur kalır.
 */
export default function Logo({ boyut = 38, className = "", koyu = false, sadeceIkon = false }) {
  const genislik = sadeceIkon ? boyut : Math.round(boyut * 3.26);
  const ana = koyu ? "#ffffff" : "#17213c";
  const ikincil = koyu ? "#c8d2e7" : "#657493";
  const kontur = koyu ? "#0a1330" : "#17213c";
  const filtre = sadeceIkon ? "bd-logo-golge-ikon" : "bd-logo-golge";
  const q = <g transform={sadeceIkon ? "translate(10 10)" : "translate(18 22) scale(1.4)"}>
    <path d="M18 16Q30 6 52 7q40 2 40 41T51 90Q9 89 8 49 8 29 18 16Zm21 15q-11 5-11 18 0 20 22 20t22-20q0-20-22-21-6 0-11 3Z"
      fill={ana} stroke={kontur} strokeWidth="7" strokeLinejoin="round" fillRule="evenodd" />
    <path d="m51 61 18 8 24-4-14 14 12 12-24-5-29-18Z"
      fill="#ff6b2c" stroke={kontur} strokeWidth="7" strokeLinejoin="round" />
  </g>;

  return <svg className={`bd-logo ${className}`} width={genislik} height={boyut}
    viewBox={sadeceIkon ? "0 0 120 120" : "0 0 620 190"} role="img"
    aria-label="Quiz Tactics" focusable="false">
    <defs><filter id={filtre} x="-20%" y="-20%" width="150%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="1.2" floodColor="#0a1330" floodOpacity=".22" />
    </filter></defs>
    <g filter={`url(#${filtre})`}>
      {q}
      {!sadeceIkon && <>
        <text x="154" y="91" fill={ikincil} fontFamily="'Baloo 2', system-ui, sans-serif"
          fontSize="48" fontWeight="900" letterSpacing="-1">UIZ</text>
        <text x="164" y="168" fill="#ff6b2c" stroke={kontur} strokeWidth="6" paintOrder="stroke fill"
          fontFamily="'Baloo 2', system-ui, sans-serif" fontSize="92" fontWeight="900" letterSpacing="-2">TACTICS</text>
      </>}
    </g>
  </svg>;
}
