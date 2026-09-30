/**
 * YENİ ÜÇ ARKA PLAN İÇİN ORTAK İSKELE (Yükselen Köz · Yıldızlı Gece · Kuzey Işıkları) — ÖNİZLEME.
 * KartArkaPlan ile aynı DOM (.abp · abp--<tur> · abp--sabit|oynar|yumusak · .abp-zemin · .abp-parca · .abp-okuma · .abp-icerik).
 * Hareket koşulları KartArkaPlan'daki useHareket'ten gelir (sekme gizli, ekranda değil, pil düşük, hareketi azalt, en çok 3 kart).
 * KartArkaPlan.jsx ve arka-plan.css'e dokunulmaz.
 */
import { useRef } from "react";
import { useHareket, sabitYer } from "./KartArkaPlan.jsx";
import "./arka-plan.css";
import "./arka-plan-yeni.css";

export function rng(tohum) {
  let a = tohum | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export { sabitYer };
export const ara = (r, a, b) => a + r() * (b - a);
/** ease-in-out'a yakın yumuşak eğri: sabit hâlin, animasyonun ilk karesiyle aynı değeri vermesi için. */
export const yumusakEgri = (f) => f * f * (3 - 2 * f);

export default function YeniSahne({ tur, taban, hareketli, yukseklik, className = "", zemin, parcalar, children, katman = false, duzen = "yatay", tamGorunur = false }) {
  const kok = useRef(null);
  const k = yukseklik < 60;
  const mod = useHareket(hareketli, kok);
  const sabitTam = tamGorunur && mod === "sabit";   // zemin/parcalar işlev olabilir: (sabitTam, tamHareketli) => düğüm
  const al = (d) => (typeof d === "function" ? d(sabitTam, tamGorunur && mod !== "sabit") : d);
  return (
    <div ref={kok} className={`abp abp--${tur} abp--${mod}${k ? " abp--kucuk" : ""}${katman ? " abp--katman" : ""}${duzen === "dikey" ? " abp--dikey" : ""}${tamGorunur ? " abp--tam" : ""} ${className}`.trim()}
         style={{ "--abp-taban": taban, ...(katman ? {} : { height: yukseklik }) }} data-yumusak="" data-arka-plan={tur}>
      <span className="abp-zemin" aria-hidden="true">{al(zemin)}</span>
      <span className="abp-parca" aria-hidden="true">{al(parcalar)}</span>
      {!tamGorunur && <span className="abp-okuma" aria-hidden="true" />}
      {!katman && <div className="abp-icerik">{children}</div>}
    </div>
  );
}
