export const WORDMARK_V2_KONSEPTLER = [
  { no: "01", ad: "Vector Cut", aciklama: "Kareye yaklaşan geometrik Q ve kesik uçlu ağır harflerle güçlü, doğrudan bir oyun markası." },
  { no: "02", ad: "Round Shift", aciklama: "Yuvarlatılmış Q ve akıcı harf ritmi; enerjik fakat çocuklaşmayan modern mobil oyun yönü." },
  { no: "03", ad: "Competitive Slice", aciklama: "Öne eğilen harfler ve kontrollü köşe kesikleri daha rekabetçi, hızlı bir karakter kuruyor." },
  { no: "04", ad: "Quiet Premium", aciklama: "İnce çift çizgili Q, geniş harf aralıkları ve sıcak metalik vurgu ile premium minimal yön." },
  { no: "05", ad: "Tactics First", aciklama: "QUIZ sağlam bir giriş; daha ağır ve sıcak TACTICS ise markanın asıl merak kancasını oluşturuyor." },
  { no: "06", ad: "Pivot Tail", aciklama: "Q kuyruğundaki tek kırılma, bariz bir ok olmadan yön değiştiren hamle duygusu veriyor." },
  { no: "07", ad: "Linked Move", aciklama: "Q kuyruğu kelime ritmine bağlanıyor; harfler arasında devam eden bir oyun planı hissi var." },
  { no: "08", ad: "Rush Type", aciklama: "Yatay sıkıştırılmış ve eğimli wordmark, mobil oyuna daha yüksek tempo ve canlılık katıyor." },
  { no: "09", ad: "Pocket Q", aciklama: "Önce 32 px app icon için tasarlanan kompakt Q; wordmark aynı sağlam geometriden türetiliyor." },
  { no: "10", ad: "Tactical Signature", aciklama: "Asimetrik Q, özel kesikler ve dengeli renk geçişiyle bu turun en özgün marka adayı." },
];

const HARFLER = {
  U: "M2 2v18q0 10 10 10t10-10V2",
  I: "M3 2h18M12 2v28M3 30h18",
  Z: "M2 2h20L2 30h20",
  T: "M1 2h22M12 2v28",
  A: "M2 30 12 2l10 28M6 20h12",
  C: "M22 6q-4-4-10-4Q2 2 2 16t10 14q6 0 10-4",
  S: "M21 6q-4-4-10-4Q2 2 2 10q0 6 10 6t10 6q0 8-11 8-6 0-10-4",
};

function HarfDizisi({ kelime, x, y, olcek = 1, renk, kalinlik = 5, aralik = 5,
  yuvarlak = false, egim = 0, kesik = false, opacity = 1 }) {
  const adim = (24 + aralik) * olcek;
  return <g transform={`translate(${x} ${y}) skewX(${egim})`} opacity={opacity}>
    {[...kelime].map((harf, i) => <g key={`${harf}-${i}`} transform={`translate(${i * adim} 0) scale(${olcek})`}>
      <path d={HARFLER[harf]} fill="none" stroke={renk} strokeWidth={kalinlik}
        strokeLinecap={yuvarlak ? "round" : "square"} strokeLinejoin={yuvarlak ? "round" : "miter"} />
      {kesik && <path d="M18 -1 24 5" stroke={renk} strokeWidth={kalinlik + 2} />}
    </g>)}
  </g>;
}

const qTransform = (x, y, boyut) => `translate(${x} ${y}) scale(${boyut / 100})`;

function OzelQ({ tip, x = 0, y = 0, boyut = 100, ana = "#17213c", vurgu = "#ff6b2c" }) {
  const donusum = qTransform(x, y, boyut);
  if (tip === 1) return <g transform={donusum}><path d="M16 8h50q25 0 25 25v30q0 25-25 25H41Q9 88 9 57V39Q9 8 40 8Zm25 18Q28 26 28 41v15q0 14 14 14h21q10 0 10-11V39q0-13-13-13Z" fill={ana} fillRule="evenodd" /><path d="m57 59 35 34H68L47 72Z" fill={vurgu} /></g>;
  if (tip === 2) return <g transform={donusum}><path d="M50 9C23 9 9 25 9 49s14 41 41 41 41-17 41-41S77 9 50 9Zm0 19c15 0 22 8 22 21s-7 22-22 22-22-9-22-22 7-21 22-21Z" fill={ana} /><path d="M54 63q14 5 35 29l-20 2Q58 76 48 73Z" fill={vurgu} /></g>;
  if (tip === 3) return <g transform={`${donusum} skewX(-10)`}><path d="m27 7 57 0 10 14-8 59-14 12H17L6 77l8-57Zm12 20-7 8-4 31 6 7h25l7-7 4-31-6-8Z" fill={ana} fillRule="evenodd" /><path d="m53 58 38 29-7 12-39-27Z" fill={vurgu} /></g>;
  if (tip === 4) return <g transform={donusum}><path d="M50 8C23 8 9 24 9 50s14 42 41 42 41-16 41-42S77 8 50 8Zm0 9c21 0 31 12 31 33S71 83 50 83 19 71 19 50s10-33 31-33Z" fill={ana} /><path d="M31 50q0-20 19-20t19 20q0 20-19 20T31 50Z" fill="none" stroke={ana} strokeWidth="4" /><path d="m56 66 30 29" fill="none" stroke={vurgu} strokeWidth="7" strokeLinecap="square" /></g>;
  if (tip === 5) return <g transform={donusum}><rect x="7" y="7" width="86" height="86" rx="28" fill={ana} /><path d="M28 49q0-22 22-22t22 22-22 22-22-22Z" fill="none" stroke="#fff" strokeWidth="13" /><path d="m54 63 28 28" stroke={vurgu} strokeWidth="13" strokeLinecap="round" /></g>;
  if (tip === 6) return <g transform={donusum}><path d="M50 9Q10 9 10 50t40 41q18 0 29-9" fill="none" stroke={ana} strokeWidth="18" strokeLinecap="round" /><path d="M50 28q21 0 21 22 0 15-10 20" fill="none" stroke={ana} strokeWidth="18" strokeLinecap="round" /><path d="m53 63 18 15 19-7" fill="none" stroke={vurgu} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" /></g>;
  if (tip === 7) return <g transform={donusum}><path d="M50 10Q10 10 10 50t40 40q40 0 40-40T50 10Zm0 20q20 0 20 20T50 70Q30 70 30 50t20-20Z" fill={ana} fillRule="evenodd" /><path d="M53 61q18 8 23 25h24" fill="none" stroke={vurgu} strokeWidth="10" strokeLinecap="round" /></g>;
  if (tip === 8) return <g transform={`${donusum} skewX(-13)`}><path d="M50 9Q10 9 10 50t40 41q40 0 40-41T50 9Zm0 20q21 0 21 21T50 71Q29 71 29 50t21-21Z" fill={ana} fillRule="evenodd" /><path d="m54 62 36 24-9 14-38-25Z" fill={vurgu} /><path d="M5 21h17M1 34h13" stroke={vurgu} strokeWidth="6" /></g>;
  if (tip === 9) return <g transform={donusum}><rect x="8" y="8" width="84" height="84" rx="22" fill={ana} /><path d="M29 50q0-21 21-21t21 21-21 21-21-21Z" fill="none" stroke="#fff" strokeWidth="12" /><path d="m53 62 20 19 15-2-28-27Z" fill={vurgu} /></g>;
  return <g transform={donusum}><path d="M18 18Q31 6 54 8q36 3 38 39 1 24-14 36-13 10-36 8Q8 87 7 52 6 32 18 18Zm18 14q-9 7-9 20 1 18 18 20 14 2 22-5 7-6 6-19-1-18-19-20-11-1-18 4Z" fill={ana} fillRule="evenodd" /><path d="m49 61 18 10 29-4-17 17 15 13-28-8-27-21Z" fill={vurgu} /></g>;
}

const genislik = (kelime, olcek, aralik) => kelime.length * (24 + aralik) * olcek;

function WordmarkSatiri({ tip, koyu }) {
  const ink = koyu ? "#f8faff" : "#17213c";
  const soluk = koyu ? "#b7c5df" : "#5f6f8d";
  const palet = ["#ff6b2c", "#7c55ec", "#3de1e7", "#d9a72e", "#ff6b2c", "#ffca45", "#7c55ec", "#ff6b2c", "#3de1e7", "#ff6b2c"];
  const vurgu = palet[tip - 1];
  const o = tip === 4 ? .9 : tip === 8 ? 1.13 : tip === 9 ? 1.02 : 1.08;
  const aralik = tip === 4 ? 9 : tip === 8 ? 2 : tip === 7 ? 1 : 4;
  const kalin = tip === 4 ? 3 : tip === 3 || tip === 8 ? 6.5 : 5.5;
  const yuvarlak = [2, 5, 6, 7, 9, 10].includes(tip);
  const egim = tip === 3 ? -9 : tip === 8 ? -13 : 0;
  const qBoy = 40 * o;
  const basla = tip === 4 ? 150 : 142;
  const y = tip === 4 ? 66 : 62;
  const uizX = basla + qBoy + 8;
  const quizBitis = uizX + genislik("UIZ", o, aralik);
  const tacticsX = quizBitis + (tip === 7 ? 4 : 17);
  const tacticsRenk = [1, 4, 6, 9].includes(tip) ? ink : vurgu;
  return <>
    <OzelQ tip={tip} x={18} y={31} boyut={102} ana={ink} vurgu={vurgu} />
    <OzelQ tip={tip} x={basla} y={y - 6} boyut={qBoy} ana={ink} vurgu={vurgu} />
    <HarfDizisi kelime="UIZ" x={uizX} y={y} olcek={o} renk={ink} kalinlik={kalin} aralik={aralik} yuvarlak={yuvarlak} egim={egim} kesik={tip === 3} />
    <HarfDizisi kelime="TACTICS" x={tacticsX} y={y} olcek={o} renk={tacticsRenk} kalinlik={tip === 5 ? 7 : kalin} aralik={aralik} yuvarlak={yuvarlak} egim={egim} kesik={tip === 3} />
    {tip === 1 && <path d={`M${basla} 115H570`} stroke={vurgu} strokeWidth="6" />}
    {tip === 2 && <path d={`M${tacticsX} 111q75 15 215 0`} fill="none" stroke={vurgu} strokeWidth="7" strokeLinecap="round" />}
    {tip === 4 && <><path d="M148 116h420" stroke={koyu ? "#445371" : "#dbe4f3"} strokeWidth="2" /><circle cx="568" cy="116" r="4" fill={vurgu} /></>}
    {tip === 5 && <path d={`M${tacticsX - 5} 110h255`} stroke={vurgu} strokeWidth="9" strokeLinecap="square" />}
    {tip === 6 && <path d="M75 111q52 14 104 0" fill="none" stroke={vurgu} strokeWidth="6" strokeLinecap="round" />}
    {tip === 7 && <path d="M88 101q43 17 88 0h380" fill="none" stroke={vurgu} strokeWidth="5" strokeLinecap="round" />}
    {tip === 8 && <><path d="M139 111h390l-20 13H139Z" fill={vurgu} /><path d="M530 111h51l-20 13h-51Z" fill="#3de1e7" /></>}
    {tip === 9 && <text x="143" y="129" fill={soluk} fontFamily="Nunito, sans-serif" fontSize="11" fontWeight="900" letterSpacing="4">PLAY SMARTER</text>}
    {tip === 10 && <><path d="M143 112h142" stroke={ink} strokeWidth="5" /><path d="M285 112h276" stroke={vurgu} strokeWidth="5" /><path d="m443 105 11 7-11 7" fill="none" stroke="#ffca45" strokeWidth="5" strokeLinejoin="round" /></>}
  </>;
}

export default function LogoWordmarkV2({ tip, ikon = false, koyu = false }) {
  const palet = ["#ff6b2c", "#7c55ec", "#3de1e7", "#d9a72e", "#ff6b2c", "#ffca45", "#7c55ec", "#ff6b2c", "#3de1e7", "#ff6b2c"];
  const ana = koyu ? "#f8faff" : "#17213c";
  return <svg viewBox={ikon ? "0 0 120 120" : "0 0 620 150"} role="img" aria-label={`Quiz Tactics özel wordmark konsepti ${tip}`}>
    {ikon ? <OzelQ tip={tip} x={10} y={10} boyut={100} ana={ana} vurgu={palet[tip - 1]} /> : <WordmarkSatiri tip={tip} koyu={koyu} />}
  </svg>;
}
