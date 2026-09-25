// COIN ve ELMAS — TEK ikon seti (görsel revizyon entegrasyonu, Ida seçimi 25 Eyl 2026).
// Kaynak: tasarim/BRIEF_GORSEL_REVIZYON.md + tasarim/SECIMLER_GORSEL_REVIZYON.md (seçim 1 "Dönen Sikke",
// seçim 2 "Pırlanta"), aday çizimi oyun/tasarim/gorsel-revizyon/a/cizim/para.jsx (CoinC/ElmasA) — burada
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

// Şeker Q — public/quiztactics-sekerq-favicon.svg ile aynı yol (küçük ölçek).
const Q_YOL = "M56 10C28 10 10 29 10 58s18 48 46 48c10 0 19-2 27-7l12 11h21L94 88c7-8 10-18 10-30 0-29-19-48-48-48Zm0 23c15 0 25 10 25 25S71 83 56 83 33 73 33 58s8-25 23-25Z";
const Q_KUYRUK = "m73 78 21 10 15 15H94L69 85Z";

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
 * Coin ikonu — "Dönen Sikke" (Ida seçimi). Eğik elips gövde + Q kabartma.
 * ≤ 22 px: eğim azaltılır (düzeltme 5 — ince çizgiye dönmesin), iç ayrıntı sadeleşir.
 */
export function CoinIkon({ boyut = 20, className, etiket }) {
  const id = kimlikUret("ci");
  const kucuk = boyut <= 22;
  const w = kucuk ? 4.6 : 3.2;
  const cx = 28, cy = 32, ry = 25;
  // Küçük boyda daha az eğik (rx büyür) → ince çizgi yerine okunur oval.
  const rx = kucuk ? 15.5 : 19.5;
  const t = kucuk ? 5.5 : 7;
  const yuz = elips(cx, cy, rx, ry);
  const ic = elips(cx, cy, rx - 5, ry - 6.6);
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 64 64" className={className} role={etiket ? "img" : undefined}
         aria-label={etiket} aria-hidden={etiket ? undefined : "true"} focusable="false">
      <path d={`M${cx} ${cy - ry}H${cx + t}A${rx} ${ry} 0 0 1 ${cx + t} ${cy + ry}H${cx}Z`} fill={A.koyu} {...cz(w)} />
      <path d={elips(cx + t, cy, rx, ry)} fill={A.koyu} {...cz(w)} />
      <HucreGolge id={`${id}y`} d={yuz} acik={A.orta} koyu={A.koyu} dx={-2} dy={-2.4} />
      {!kucuk && (
        <>
          <HucreGolge id={`${id}a`} d={ic} acik={A.orta} koyu={A.koyu} dx={1.6} dy={2} />
          <path d={ic} fill="none" stroke={A.kenar} strokeWidth="1.4" />
        </>
      )}
      <g transform={`translate(${f(cx + 0.4)} ${f(cy + 0.4)}) scale(${kucuk ? 0.27 : 0.19}) translate(-60 -60) skewX(-7) translate(7 0)`}>
        {kucuk ? (
          <>
            <path d={Q_YOL} fillRule="evenodd" fill={A.kenar} />
            <path d={Q_KUYRUK} fill={BEYAZ} stroke={A.kenar} strokeWidth="7.4" />
          </>
        ) : (
          <>
            <g transform="translate(1.5 1.5)" fill={A.kenar}><path d={Q_YOL} fillRule="evenodd" /><path d={Q_KUYRUK} /></g>
            <path d={Q_YOL} fillRule="evenodd" fill={A.acik} stroke={A.kenar} strokeWidth="7.9" strokeLinejoin="round" />
            <path d={Q_KUYRUK} fill={BEYAZ} stroke={A.kenar} strokeWidth="7.9" strokeLinejoin="round" />
          </>
        )}
      </g>
      <path d={`M${f(cx - rx + 4.2)} ${f(cy - 5)}Q${f(cx - rx + 5)} ${f(cy - ry + 7)} ${f(cx - 4)} ${f(cy - ry + 3.6)}`} fill="none" stroke={BEYAZ} strokeWidth={kucuk ? 3.4 : 2.6} strokeLinecap="round" />
      <path d={yuz} fill="none" {...cz(w)} />
    </svg>
  );
}
function elips(cx, cy, rx, ry) { return `M${f(cx - rx)} ${cy}a${rx} ${ry} 0 1 0 ${f(2 * rx)} 0a${rx} ${ry} 0 1 0 ${f(-2 * rx)} 0Z`; }

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
