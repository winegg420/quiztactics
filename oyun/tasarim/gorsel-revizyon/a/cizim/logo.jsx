// LOGO adayları — görsel revizyon Bölüm 12. Şeker Q ailesi (public/quiztactics-sekerq-favicon.svg): beyaz Q +
// lacivert kontur + sarı kuyruk + turuncu şeker zemin, Baloo 2 kalın yazı. Q işareti "QUIZ"in Q'sunun YERİNE geçer
// (yan yana "Q QUIZ" okunmasın — 23 Eyl'de eski logo bu yüzden bırakılmıştı).
import { MARKA, METAL } from "../../palet.js";

const Q_YOL = "M56 10C28 10 10 29 10 58s18 48 46 48c10 0 19-2 27-7l12 11h21L94 88c7-8 10-18 10-30 0-29-19-48-48-48Zm0 23c15 0 25 10 25 25S71 83 56 83 33 73 33 58s8-25 23-25Z";
const Q_KUYRUK = "m73 78 21 10 15 15H94L69 85Z";
const L = MARKA.lacivert;
const YAZI = { fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 800 };

/** Şeker Q harfi: lacivert gölge kopyası + beyaz dolgu + lacivert kontur + sarı kuyruk + tek parlama. */
export function SekerQ({ x = 0, y = 0, s = 1, golge = 6 }) {
  const t = (dy) => `translate(${x} ${y + dy}) scale(${s}) translate(7 -1) skewX(-7)`;
  const w = 7;
  return (
    <>
      <g transform={t(golge)} fill={L} stroke={L} strokeWidth={w} strokeLinejoin="round"><path d={Q_YOL} fillRule="evenodd" /><path d={Q_KUYRUK} /></g>
      <g transform={t(0)} strokeLinejoin="round">
        <path d={Q_YOL} fillRule="evenodd" fill="#fff" stroke={L} strokeWidth={w} paintOrder="stroke fill" />
        <path d={Q_KUYRUK} fill={METAL.altin.orta} stroke={L} strokeWidth={w} paintOrder="stroke fill" />
        <path d="M30 40c6-10 16-17 28-19" fill="none" stroke={MARKA.gok} strokeWidth="6" strokeLinecap="round" />
      </g>
    </>
  );
}
/** Kabarık yazı: lacivert derinlik kopyası + konturlu dolgu. */
function Yazi({ x, y, boy, dolgu, kontur = L, w = 8, derin = 6, children, ls = -2 }) {
  return (
    <>
      <text x={x} y={y + derin} fontSize={boy} letterSpacing={ls} fill={kontur} stroke={kontur} strokeWidth={w} strokeLinejoin="round" {...YAZI}>{children}</text>
      <text x={x} y={y} fontSize={boy} letterSpacing={ls} fill={dolgu} stroke={kontur} strokeWidth={w} strokeLinejoin="round" paintOrder="stroke fill" {...YAZI}>{children}</text>
    </>
  );
}

// A — Şeker Q harfli yazı: Q = uygulama ikonunun Q'su; "UIZ" üstte, "TACTICS" altta turuncu şeker harf.
export function LogoA({ yukseklik = 48, className = "" }) {
  return (
    <svg className={`ga-logo ${className}`} viewBox="0 0 590 200" height={yukseklik} width={yukseklik * 2.95} role="img" aria-label="Quiz Tactics">
      <SekerQ x={2} y={4} s={1.62} golge={7} />
      <Yazi x={196} y={84} boy={62} dolgu="#fff" w={9} derin={5}>UIZ</Yazi>
      <Yazi x={178} y={178} boy={104} dolgu={MARKA.turuncu} w={10} derin={8}>TACTICS</Yazi>
    </svg>
  );
}

// B — Şeker hap: turuncu kabarık hap (Şeker Kutusu düğmesi) içinde beyaz şeker harfler, Q sarı kuyruklu.
export function LogoB({ yukseklik = 48, className = "" }) {
  return (
    <svg className={`ga-logo ${className}`} viewBox="0 0 700 190" height={yukseklik} width={yukseklik * 3.68} role="img" aria-label="Quiz Tactics">
      <rect x="6" y="24" width="688" height="150" rx="75" fill={MARKA.turuncuKoyu} stroke={L} strokeWidth="8" />
      <rect x="6" y="10" width="688" height="150" rx="75" fill={MARKA.turuncu} stroke={L} strokeWidth="8" />
      <path d="M62 38Q90 26 150 26" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" opacity=".9" />
      <SekerQ x={30} y={30} s={1.0} golge={5} />
      <Yazi x={150} y={124} boy={86} dolgu="#fff" w={9} derin={6} ls={0}>UIZ TACTICS</Yazi>
    </svg>
  );
}

// C — Dikey amblem (içeride elendi: üst çubukta kurdele yazısı okunmadı)
export function LogoC({ yukseklik = 48, className = "" }) {
  return (
    <svg className={`ga-logo ${className}`} viewBox="0 0 240 240" height={yukseklik} width={yukseklik} role="img" aria-label="Quiz Tactics">
      <rect x="20" y="8" width="200" height="200" rx="46" fill={MARKA.turuncu} stroke={L} strokeWidth="8" />
      <SekerQ x={52} y={24} s={1.25} golge={6} />
      <path d="M4 168H236L224 192L236 216H4L16 192Z" fill={L} />
      <text x="120" y="204" textAnchor="middle" fontSize="36" fill="#fff" {...YAZI}>QUIZ TACTICS</text>
    </svg>
  );
}

// D — Soru balonu Q (içeride elendi: konuşma balonu + Q, sohbet uygulaması gibi okundu)
export function LogoD({ yukseklik = 48, className = "" }) {
  return (
    <svg className={`ga-logo ${className}`} viewBox="0 0 560 200" height={yukseklik} width={yukseklik * 2.8} role="img" aria-label="Quiz Tactics">
      <path d="M20 20H180Q196 20 196 36V140Q196 156 180 156H90L50 190V156H36Q20 156 20 140V36Q20 20 36 20Z" fill={MARKA.turuncu} stroke={L} strokeWidth="8" strokeLinejoin="round" />
      <SekerQ x={40} y={22} s={1.1} golge={5} />
      <Yazi x={214} y={96} boy={70} dolgu={L} w={0} derin={0}>QUIZ</Yazi>
      <Yazi x={214} y={170} boy={70} dolgu={MARKA.turuncu} w={8} derin={5}>TACTICS</Yazi>
    </svg>
  );
}
