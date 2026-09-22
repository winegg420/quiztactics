export const Q_LOGO_ADAYLARI = [
  {
    no: "01",
    ad: "Round Power",
    tur: "YUVARLAK OYUN Q’SU",
    aciklama: "Tok dairesel gövde ve kısa, içe bağlı kuyruk küçük ölçekte güçlü bir oyun işareti kurar.",
  },
  {
    no: "02",
    ad: "Tactical Cut",
    tur: "GEOMETRİK Q",
    aciklama: "Sekizgen ritim ve kontrollü köşe kesimi, Q’yu sertleştirmeden taktik hissi verir.",
  },
  {
    no: "03",
    ad: "Forward Pulse",
    tur: "ENERJİK Q",
    aciklama: "Hafif öne yatık oval yapı hareket taşır; kısa kuyruk gövdenin doğal devamıdır.",
  },
  {
    no: "04",
    ad: "Pocket Q",
    tur: "APP ICON ODAKLI",
    aciklama: "Tam daire gövde ve sınırı aşmayan iç kuyruk, bildirim çubuğu ile 32 px kullanımını sadeleştirir.",
  },
  {
    no: "05",
    ad: "Open Move",
    tur: "ÖZGÜN TASARIMCI SEÇİMİ",
    aciklama: "Açık halka ile turuncu köprüyü tek harekette birleştiren, sade fakat sahiplenilebilir işaret.",
  },
];

function QSekli({ tip, ana, vurgu }) {
  if (tip === 2) return <>
    <path d="M34 9h50l27 27v40L90 97l17 14H78L64 99H34L9 74V36L34 9Zm12 25L34 46v19l12 11h27l12-12V47L73 34H46Z"
      fill={ana} fillRule="evenodd" />
    <path d="m66 78 24 19 17 14H78L58 94Z" fill={vurgu} />
  </>;

  if (tip === 3) return <g transform="translate(7 -1) skewX(-7)">
    <path d="M56 10C28 10 10 29 10 58s18 48 46 48c10 0 19-2 27-7l12 11h21L94 88c7-8 10-18 10-30 0-29-19-48-48-48Zm0 23c15 0 25 10 25 25S71 83 56 83 33 73 33 58s8-25 23-25Z"
      fill={ana} fillRule="evenodd" />
    <path d="m73 78 21 10 15 15H94L69 85Z" fill={vurgu} />
  </g>;

  if (tip === 4) return <>
    <path d="M60 8C29 8 9 28 9 59s20 51 51 51 51-20 51-51S91 8 60 8Zm0 27c15 0 24 9 24 24s-9 24-24 24-24-9-24-24 9-24 24-24Z"
      fill={ana} fillRule="evenodd" />
    <path d="m66 69 17 3 18 18-13 13-20-22Z" fill={vurgu} />
  </>;

  if (tip === 5) return <>
    <path d="M91 82c-9 16-28 25-47 19C20 94 7 69 14 44S46 7 71 14c25 8 38 33 30 57"
      fill="none" stroke={ana} strokeWidth="23" strokeLinecap="round" />
    <path d="m69 72 13-4 21 23-14 16-21-25Z" fill={vurgu} />
  </>;

  return <>
    <path d="M60 9C29 9 9 29 9 59s20 50 51 50c11 0 21-3 29-8l10 9h16L96 90c9-8 15-19 15-31C111 29 91 9 60 9Zm0 24c16 0 27 10 27 26S76 85 60 85 33 75 33 59s11-26 27-26Z"
      fill={ana} fillRule="evenodd" />
    <path d="m73 78 23 12 15 16H96L68 87Z" fill={vurgu} />
  </>;
}

export function QIsareti({ tip = 1, koyu = false, className = "" }) {
  const ana = koyu ? "#ffffff" : "#17213c";
  return <svg className={className} viewBox="0 0 120 120" role="img" aria-label={`${tip}. Q logo işareti`}>
    <QSekli tip={tip} ana={ana} vurgu="#ff6b2c" />
  </svg>;
}

export function QWordmarkOrnegi({ tip = 1, koyu = false }) {
  const ana = koyu ? "#ffffff" : "#17213c";
  const ikincil = koyu ? "#c8d2e7" : "#657493";
  return <svg viewBox="0 0 620 190" role="img" aria-label={`${tip}. Q ile Quiz Tactics wordmark örneği`}>
    <g transform="translate(18 22) scale(1.4)">
      <QSekli tip={tip} ana={ana} vurgu="#ff6b2c" />
    </g>
    <text x="154" y="91" fill={ikincil} fontFamily="'Baloo 2', system-ui, sans-serif"
      fontSize="48" fontWeight="900" letterSpacing="-1">UIZ</text>
    <text x="164" y="168" fill="#ff6b2c" stroke={ana} strokeWidth="6" paintOrder="stroke fill"
      fontFamily="'Baloo 2', system-ui, sans-serif" fontSize="92" fontWeight="900" letterSpacing="-2">TACTICS</text>
  </svg>;
}
