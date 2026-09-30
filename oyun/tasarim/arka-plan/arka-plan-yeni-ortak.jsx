/**
 * YENİ ÜÇ ARKA PLAN İÇİN ORTAK İSKELE (Yükselen Köz · Yıldızlı Gece · Kuzey Işıkları) — ÖNİZLEME.
 * KartArkaPlan ile aynı DOM (.abp · abp--<tur> · abp--sabit|oynar|yumusak · .abp-zemin · .abp-parca · .abp-okuma · .abp-icerik).
 * Hareket koşulları KartArkaPlan'daki useHareket'ten gelir (sekme gizli, ekranda değil, pil düşük, hareketi azalt, en çok 3 kart).
 * KartArkaPlan.jsx ve arka-plan.css'e dokunulmaz.
 */
import { useEffect, useRef, useState } from "react";
import { useHareketAyrinti, sabitYer } from "./KartArkaPlan.jsx";
import SabitTasarim, { SABIT_TURLER } from "./sabit-tasarim.jsx";
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
  // katman (oyun içi kart): yükseklik kartınkidir, ölçülür (KartArkaPlan ile aynı; yukseklik = ilk tahmin) → lig satırı (~56 px) küçük düzene geçer
  const [olcu, setOlcu] = useState(yukseklik);
  useEffect(() => {
    if (!katman || !kok.current || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => { const h = kok.current?.clientHeight; if (h > 0) setOlcu((o) => (Math.abs(o - h) > 2 ? h : o)); });
    ro.observe(kok.current);
    return () => ro.disconnect();
  }, [katman]);
  const yuk = katman ? olcu : yukseklik;
  const k = yuk < 60;
  const { mod, statik } = useHareketAyrinti(hareketli, kok);
  // yeni mod + kalıcı durgunluk (hareketi azalt · pil · 3 kart sınırı · hareketsiz kart) → ayrı çizilmiş özel sabit kompozisyon (sabit-tasarim.jsx)
  const sabitTam = tamGorunur && mod === "sabit" && statik && SABIT_TURLER.includes(tur);   // zemin/parcalar işlev olabilir: (sabitTam, tamHareketli, k, yuk) => düğüm
  const al = (d) => (typeof d === "function" ? d(sabitTam, tamGorunur && !sabitTam, k, yuk) : d);
  return (
    <div ref={kok} className={`abp abp--${tur} abp--${mod}${k ? " abp--kucuk" : ""}${katman ? " abp--katman" : ""}${duzen === "dikey" ? " abp--dikey" : ""}${tamGorunur ? " abp--tam" : ""} ${className}`.trim()}
         style={{ "--abp-taban": taban, ...(katman ? {} : { height: yukseklik }) }} data-yumusak="" data-arka-plan={tur}>
      <span className="abp-zemin" aria-hidden="true">{sabitTam ? null : al(zemin)}</span>
      <span className="abp-parca" aria-hidden="true">{sabitTam ? <SabitTasarim tur={tur} k={k} duzen={duzen} katman={katman} /> : al(parcalar)}</span>
      {!tamGorunur && <span className="abp-okuma" aria-hidden="true" />}
      {!katman && <div className="abp-icerik">{children}</div>}
    </div>
  );
}
