// COIN ve ELMAS — TEK ikon seti (görsel revizyon entegrasyonu, Ida seçimi 25 Eyl 2026).
// Kaynak: tasarim/BRIEF_GORSEL_REVIZYON.md + tasarim/SECIMLER_GORSEL_REVIZYON.md (seçim 1 "Q Sikke, önden" — önce
// "Dönen Sikke" idi, 26 Eyl 2026'da değişti; seçim 2 "Pırlanta"), aday çizimi oyun/tasarim/gorsel-revizyon/a/cizim/para.jsx (CoinA/ElmasA) — burada
// oyunun HER YERİNDE kullanılan hafif, animasyonsuz üretim sürümü olarak yeniden çizildi (küçük inline
// simge; büyük "hareketli" gösterim elmas paketi görsellerinde zaten var, ona dokunulmadı).
// Eskiden coin/elmas için İKİ FARKLI çizim vardı: bu dosyadan önce QtIkon'un tek renkli "coin"/"elmas"
// çizgi ikonu (fiyat etiketleri, üst çubuk) ile CoinGorseli/ElmasPaketGorseli'nin (paket kartları) renkli
// çizimi birbirine benzemiyordu. Artık tek renkli/inline gösterim burada; paket kartları (adet gösteren
// yığın/sandık, elmas paketi SVG'leri) kendi çizimlerinde kalır — DOKUNULMADI.
// Kural: kalın #0b1220 kontur, düz dolgu + hücre gölgesi, ışık sol üstten, tek beyaz parlama vuruşu.
import { METAL, ELMAS_FASET as R } from "./gorsel-paleti.js";

const K = "#0b1220";
const BEYAZ = "#fff";
const A = METAL.altin;
const f = (n) => Math.round(n * 100) / 100;
const cz = (w) => ({ stroke: K, strokeWidth: w, strokeLinejoin: "round", strokeLinecap: "round" });

// Marka amblemi (30 Eyl 2026): halka + L şeklinde at hamlesi oku — tasarim/marka/coin-uretici.js ile aynı geometri.
// Amblem 100'lük koordinatta çizilir (merkez ≈ 56,56); sikke yüzüne (r=25) EMBLEM_OLCEK ile oturur.
const EMBLEM_KOYU = "#5C3A00", EMBLEM_ACIK = "#FFF3B0", EMBLEM_KUCUK = "#1f2a44";
const EMBLEM_OLCEK = 25 / 42;

/** Halka (45,45 · r 14.5) + L ok (M58 58 V74 H72, uçta üçgen başı). */
function Amblem({ renk, sw }) {
  return (
    <>
      <circle cx="45" cy="45" r="14.5" fill="none" stroke={renk} strokeWidth={sw} />
      <path d="M58 58V74H72" fill="none" stroke={renk} strokeWidth={f(sw * 0.72)} strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="82,74 71,66.5 71,81.5" fill={renk} stroke={renk} strokeWidth="1.4" strokeLinejoin="round" />
    </>
  );
}

/** Hücre gölgesi: şekil içinde sağ-alta düşen koyu ton, sol üstten aynı şeklin açık kopyası. */
function HucreGolge({ id, d, acik, koyu, dx = -2.2, dy = -2.6 }) {
  return (
    <>
      <clipPath id={id}><path d={d} /></clipPath>
      <g clipPath={`url(#${id})`}>
        <path d={d} fill={koyu} />
        <path d={d} fill={acik} transform={`translate(${dx} ${dy})`} />
      </g>
    </>
  );
}

let sayac = 0;
function kimlikUret(on) { sayac += 1; return `${on}${sayac}`; }

/**
 * Coin ikonu — "Q Sikke" (önden; Ida seçimi 26 Eyl 2026, önceki "Dönen Sikke" yerine). Aday çizimi CoinA ile aynı mantık:
 * kalınlık (yan yüz) + yüz + kabarık kenar ışığı + çukur alan + amblem kabartma; hareketsiz üretim sürümü.
 * ≤ 28 px (boy kuralı A9): iç ayrıntı azalır, kontur kalınlaşır, amblem kalın lacivert olur.
 */
export function CoinIkon({ boyut = 20, className, etiket }) {
  const id = kimlikUret("ci");
  const kucuk = boyut <= 28;
  const w = kucuk ? 4.8 : 3.2;
  const t = kucuk ? 3.6 : 4;
  const cx = 32, cy = 30, r = 25;
  const ic = r - (kucuk ? 5.5 : 7);
  const yuz = daire(cx, cy, r);
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 64 64" className={className} role={etiket ? "img" : undefined}
         aria-label={etiket} aria-hidden={etiket ? undefined : "true"} focusable="false">
      <path d={daire(cx, cy + t, r)} fill={A.koyu} {...cz(w)} />
      {!kucuk && Array.from({ length: 9 }, (_, i) => {
        const [x0, y0] = kutup(r, 112 + i * 17, cx, cy);
        return <path key={i} d={`M${x0} ${f(y0 + 0.6)}V${f(y0 + t - 0.4)}`} stroke={A.kenar} strokeWidth="1.1" strokeLinecap="round" />;
      })}
      <HucreGolge id={`${id}y`} d={yuz} acik={A.orta} koyu={A.koyu} />
      <path d={dilim(r - 1, ic + 1.2, 262, 352, cx, cy)} fill={A.acik} />
      {!kucuk && (
        <>
          <HucreGolge id={`${id}a`} d={daire(cx, cy, ic)} acik={A.orta} koyu={A.koyu} dx={1.8} dy={2.2} />
          <circle cx={cx} cy={cy} r={ic} fill="none" stroke={A.kenar} strokeWidth="1.4" />
        </>
      )}
      {kucuk ? (
        <g transform={`translate(${cx} ${cy}) scale(${f(EMBLEM_OLCEK)}) translate(-56 -56)`}>
          <Amblem renk={EMBLEM_KUCUK} sw={11.5} />
        </g>
      ) : (
        <g transform={`translate(${cx} ${cy}) scale(${f(EMBLEM_OLCEK * 0.82)}) translate(-56 -56)`}>
          <g transform="translate(-1.8 -1.8)"><Amblem renk={EMBLEM_ACIK} sw={9} /></g>
          <Amblem renk={EMBLEM_KOYU} sw={9} />
        </g>
      )}
      <path d={yay(r - 3.4, 292, 334, cx, cy)} fill="none" stroke={BEYAZ} strokeWidth={kucuk ? 3.2 : 2.6} strokeLinecap="round" />
      <path d={yuz} fill="none" {...cz(w)} />
    </svg>
  );
}
function daire(cx, cy, r) { return `M${f(cx - r)} ${cy}a${r} ${r} 0 1 0 ${f(2 * r)} 0a${r} ${r} 0 1 0 ${f(-2 * r)} 0Z`; }
const RAD = Math.PI / 180;
/** Kutupsal nokta: a derece, 0 = tepe, saat yönünde. */
function kutup(r, a, cx, cy) { return [f(cx + r * Math.sin(a * RAD)), f(cy - r * Math.cos(a * RAD))]; }
function yay(r, a0, a1, cx, cy) {
  const [x0, y0] = kutup(r, a0, cx, cy);
  const [x1, y1] = kutup(r, a1, cx, cy);
  return `M${x0} ${y0}A${r} ${r} 0 0 1 ${x1} ${y1}`;
}
/** Halka dilimi (r1 dış, r2 iç) — kabarık kenarın ışık aldığı sol üst yay. */
function dilim(r1, r2, a0, a1, cx, cy) {
  const [x0, y0] = kutup(r1, a0, cx, cy);
  const [x1, y1] = kutup(r1, a1, cx, cy);
  const [x2, y2] = kutup(r2, a1, cx, cy);
  const [x3, y3] = kutup(r2, a0, cx, cy);
  return `M${x0} ${y0}A${r1} ${r1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r2} ${r2} 0 0 0 ${x3} ${y3}Z`;
}

/**
 * Elmas ikonu — "Pırlanta" (Ida seçimi), elmas paketi görselleriyle aynı aile.
 * ≤ 22 px: pembe faset ve iç çizgi sadeleşir (kalabalık olmasın).
 */
export function ElmasIkon({ boyut = 20, className, etiket }) {
  const kucuk = boyut <= 22;
  const w = kucuk ? 4.6 : 3.2;
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 64 64" className={className} role={etiket ? "img" : undefined}
         aria-label={etiket} aria-hidden={etiket ? undefined : "true"} focusable="false">
      <g transform="translate(32 30) scale(1.3)">
        <path d="M-9 -13H9L20 -4L0 22L-20 -4Z" fill={R.ana} />
        <path d="M-20 -4L-9 -13L-5 -4Z" fill={R.acik} />
        <path d="M-9 -13H9L5 -4H-5Z" fill={R.en} />
        <path d="M9 -13L20 -4H5Z" fill={R.orta} />
        <path d="M-20 -4H-5L0 22Z" fill={R.yan} />
        <path d="M5 -4H20L0 22Z" fill={R.koyu} />
        {!kucuk && <path d="M8 -4H13.6L5.4 6.4Z" fill={R.pembe} />}
        <path d={kucuk ? "M-20 -4H20M-5 -4L0 22M5 -4L0 22" : "M-20 -4H20M-5 -4L-9 -13M5 -4L9 -13M-5 -4L0 22M5 -4L0 22"}
              fill="none" stroke={R.derin} strokeWidth={f((kucuk ? 1.8 : 1.15) * 1.3)} strokeLinejoin="round" strokeLinecap="round" />
        <path d={kucuk ? "M-6 -9.6L-12 -4.8" : "M-6.4 -10.4L-3.4 -6.6"} stroke={BEYAZ} strokeWidth={f((kucuk ? 3.4 : 2.6) * 1.3 * 0.8)} strokeLinecap="round" />
        <path d="M-9 -13H9L20 -4L0 22L-20 -4Z" fill="none" stroke={K} strokeWidth={f(w / 1.3)} strokeLinejoin="round" />
      </g>
    </svg>
  );
}
