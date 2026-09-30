// Sezon 1 geçici teması "Yıldızlı Gece" — hero bandının arka sanatı.
// KAYNAK: tasarim/arka-plan/YildizliGeceArkaPlan.jsx'in yıldız katmanı (nokta + dört köşeli parıltı + hilal).
// Oyuncunun takılı kart arka planıyla HİÇ ilgisi yok; o dosyadan import edilmez, yalnız çizim dili alındı.
// Yazı okunurluğu için yıldız tepe opaklığı ≤ 0,30 (beyaz yazı ≥ 4,5:1; gerçek pikselle ölçülür). Yalnız opacity animasyonu; sabit tohum (her çizimde aynı yıldız dizilimi). Hareketi azalt: data-yumusak ile yavaşlar,
// CSS yarısını gizler.
import { useMemo } from "react";

function rng(tohum) {
  let t = tohum >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const ara = (r, a, b) => a + r() * (b - a);
const PARILTI_YOL = "M0 -5L1.1 -1.1L5 0L1.1 1.1L0 5L-1.1 1.1L-5 0L-1.1 -1.1Z";

function uret() {
  const r = rng(8123);
  const liste = [];
  for (let i = 0; i < 26; i++) {
    liste.push({ tip: "nokta", x: r() * 97, y: r() * 94, s: ara(r, 1.5, 2.6), sure: ara(r, 2.4, 5), faz: r() * 5, renk: r() < 0.7 ? "#FFFFFF" : "#FFF1B8", op: ara(r, 0.18, 0.3) });
  }
  for (let i = 0; i < 7; i++) {
    liste.push({ tip: "parilti", x: 3 + r() * 90, y: 6 + r() * 80, s: ara(r, 7, 12), sure: ara(r, 3, 5.5), faz: r() * 5, renk: r() < 0.5 ? "#FFFFFF" : "#FFF1B8", op: ara(r, 0.22, 0.3) });
  }
  return liste;
}

export default function YildizliGeceSanat() {
  const yildizlar = useMemo(uret, []);
  return (
    <div className="sy-sanat sy-sanat--gece" aria-hidden="true" data-yumusak>
      <svg className="sy-gece-ay" viewBox="0 0 20 20" focusable="false">
        <path d="M11 1.5a8.6 8.6 0 1 0 7.5 12.6a6.7 6.7 0 1 1 -7.5 -12.6Z" fill="#FFF4C8" />
      </svg>
      <svg className="sy-gece-tepe" viewBox="0 0 100 40" preserveAspectRatio="none" focusable="false">
        <path d="M0 22Q20 8 40 20T76 14T100 18V40H0Z" fill="#232C7A" opacity=".95" />
        <path d="M0 32Q28 22 56 31T100 27V40H0Z" fill="#0A0F30" />
      </svg>
      {yildizlar.map((y, i) => (y.tip === "nokta" ? (
        <i key={i} className="sy-yildiz" style={{ left: `${y.x}%`, top: `${y.y}%`, width: y.s, height: y.s, background: y.renk, "--sy-op": y.op, animationDuration: `${y.sure}s`, animationDelay: `-${y.faz}s` }} />
      ) : (
        <svg key={i} className="sy-yildiz sy-yildiz--parilti" viewBox="-6 -6 12 12" focusable="false"
             style={{ left: `${y.x}%`, top: `${y.y}%`, width: y.s, height: y.s, "--sy-op": y.op, animationDuration: `${y.sure}s`, animationDelay: `-${y.faz}s` }}>
          <path d={PARILTI_YOL} fill={y.renk} />
        </svg>
      )))}
    </div>
  );
}
