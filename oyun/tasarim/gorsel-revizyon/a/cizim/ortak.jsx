// Ajan A çizimlerinin ortak yardımcıları (görsel revizyon — tasarim/BRIEF_GORSEL_REVIZYON.md › A6, A8).
// Renkler YALNIZ ortak paletten (../../palet.js). Kural: kalın #0b1220 kontur · düz dolgu + 2–3 ton hücre
// gölgesi · ışık SOL ÜSTTEN · tek beyaz parlama vuruşu · degrade / plastik parlaklık YOK.
import { useEffect, useId, useRef, useState } from "react";
import { KONTUR, PARLAMA } from "../../palet.js";
import { yumusakHareketKur } from "../../../yumusakHareket.js";
import "./ortak.css";

yumusakHareketKur();   // "hareketi azalt" → durmaz, 0,4 hızda oynar ([data-yumusak] kapsamı)

export const K = KONTUR;
export const BEYAZ = PARLAMA;
export const RAD = Math.PI / 180;
export const f = (n) => Math.round(n * 100) / 100;
/** Kutupsal nokta (merkez cx,cy): a derece, 0 = tepe, saat yönünde. */
export const kutup = (r, a, cx = 0, cy = 0) => [f(cx + r * Math.sin(a * RAD)), f(cy - r * Math.cos(a * RAD))];
/** Yay yolu (saat yönünde a0 → a1). */
export function yay(r, a0, a1, cx = 0, cy = 0) {
  const [x0, y0] = kutup(r, a0, cx, cy);
  const [x1, y1] = kutup(r, a1, cx, cy);
  const buyuk = ((((a1 - a0) % 360) + 360) % 360) > 180 ? 1 : 0;
  return `M${x0} ${y0}A${r} ${r} 0 ${buyuk} 1 ${x1} ${y1}`;
}
/** Halka dilimi (r1 dış, r2 iç) — kenar ışığı / kenar gölgesi için. */
export function dilim(r1, r2, a0, a1, cx = 0, cy = 0) {
  const [x0, y0] = kutup(r1, a0, cx, cy);
  const [x1, y1] = kutup(r1, a1, cx, cy);
  const [x2, y2] = kutup(r2, a1, cx, cy);
  const [x3, y3] = kutup(r2, a0, cx, cy);
  const b = ((((a1 - a0) % 360) + 360) % 360) > 180 ? 1 : 0;
  return `M${x0} ${y0}A${r1} ${r1} 0 ${b} 1 ${x1} ${y1}L${x2} ${y2}A${r2} ${r2} 0 ${b} 0 ${x3} ${y3}Z`;
}
/** Kapalı çokgen yolu. */
export const cokgen = (noktalar) => `M${noktalar.map(([x, y]) => `${f(x)} ${f(y)}`).join("L")}Z`;
/** n köşeli yıldız (iç/dış yarıçap). */
export function yildizYolu(n, r1, r2, cx = 0, cy = 0, don = 0) {
  const p = [];
  for (let i = 0; i < n * 2; i += 1) p.push(kutup(i % 2 ? r2 : r1, don + (i * 180) / n, cx, cy));
  return cokgen(p);
}
/** 4 kollu ışıltı (elmas paketi Parilti ile aynı biçim). */
export function isiltiYolu(r, cx = 0, cy = 0) {
  const i = r * 0.24;
  return `M${cx} ${cy - r}L${cx + i} ${cy - i}L${cx + r} ${cy}L${cx + i} ${cy + i}L${cx} ${cy + r}L${cx - i} ${cy + i}L${cx - r} ${cy}L${cx - i} ${cy - i}Z`;
}

/** Kontur özellikleri (w birim). */
export const cz = (w) => ({ stroke: K, strokeWidth: w, strokeLinejoin: "round", strokeLinecap: "round" });
/** Tek beyaz parlama vuruşu. */
export const Parlama = ({ d, w = 2.4, op = 1 }) => <path d={d} fill="none" stroke={BEYAZ} strokeWidth={w} strokeLinecap="round" opacity={op} />;

/** SVG içi benzersiz kimlik (clipPath vb.). */
export function useKimlik(on = "g") {
  const ham = useId();
  return `${on}${ham.replace(/[^a-zA-Z0-9]/g, "")}`;
}

/**
 * Hücre gölgesi: `sekil` (yol) içinde, ışığın tersine (sağ alt) düşen koyu hilal. Işık sol üstten.
 * Yöntem: şekil kırpma alanı; içinde koyu dolgu, üstüne (dx,dy) kadar sola-yukarı kaydırılmış aynı şekil açık tonla.
 */
export function HucreGolge({ id, d, acik, koyu, dx = -2.4, dy = -2.4 }) {
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

/**
 * Hareket kabı: ekrandayken `data-gorunur="1"` (animasyonlar yalnız o zaman adlanır → ekran dışında durur),
 * `data-yumusak` (hareketi azalt → 0,4 hız, yumusakHareket.js). Yalnız transform/opacity animasyonları.
 */
export function Hareket({ as: Oge = "span", className = "", style, children, ...rest }) {
  const ref = useRef(null);
  const [gorunur, setGorunur] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === "undefined") { setGorunur(true); return undefined; }
    const g = new IntersectionObserver((k) => { for (const e of k) setGorunur(e.isIntersecting); }, { rootMargin: "80px" });
    g.observe(el);
    return () => g.disconnect();
  }, []);
  return (
    <Oge ref={ref} className={`gra-hareket ${className}`.trim()} data-yumusak="" data-gorunur={gorunur ? "1" : "0"} style={style} {...rest}>
      {children}
    </Oge>
  );
}

/**
 * Işıltı katmanı: SVG'nin üstünde ayrı HTML (SVG her karede yeniden boyanmaz), yalnız transform/opacity.
 * noktalar: [[x, y, r, gecikme]] — birim viewBox (varsayılan 64) içinde.
 */
export function Isiltilar({ noktalar, kutu = 64 }) {
  return noktalar.map(([x, y, r, g], i) => (
    <span key={i} className="gra-isilti" style={{ left: `${(x / kutu) * 100}%`, top: `${(y / kutu) * 100}%`, width: `${((r * 2 + 2) / kutu) * 100}%` }}>
      <svg viewBox={`${-r - 1} ${-r - 1} ${r * 2 + 2} ${r * 2 + 2}`} style={{ animationDelay: `${g}s` }} aria-hidden="true" focusable="false">
        <path d={isiltiYolu(r)} fill={BEYAZ} stroke={K} strokeWidth={Math.max(0.8, r * 0.16)} strokeLinejoin="round" />
      </svg>
    </span>
  ));
}
