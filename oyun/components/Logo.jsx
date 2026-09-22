/**
 * Quiz Tactics resmi logosu — Q Logo Lab 03 Forward Pulse.
 * Q ve TACTICS ana ağırlığı taşır; UIZ küçük ama okunur kalır.
 */
export default function Logo({ boyut = 38, className = "", koyu = false, sadeceIkon = false }) {
  const genislik = sadeceIkon ? boyut : Math.round(boyut * 3.26);
  const ana = koyu ? "#ffffff" : "#17213c";
  const ikincil = koyu ? "#c8d2e7" : "#657493";
  const kontur = koyu ? "#0a1330" : "#17213c";
  const filtre = sadeceIkon ? "bd-logo-golge-ikon" : "bd-logo-golge";
  const q = <g transform={sadeceIkon ? "translate(7 -1) skewX(-7)" : "translate(28 22) scale(1.4) translate(7 -1) skewX(-7)"}>
    <path d="M56 10C28 10 10 29 10 58s18 48 46 48c10 0 19-2 27-7l12 11h21L94 88c7-8 10-18 10-30 0-29-19-48-48-48Zm0 23c15 0 25 10 25 25S71 83 56 83 33 73 33 58s8-25 23-25Z"
      fill={ana} fillRule="evenodd" />
    <path d="m73 78 21 10 15 15H94L69 85Z" fill="#ff6b2c" />
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
