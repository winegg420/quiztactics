// Mod kartı sahne figürü — ana sayfa mod şeritleri ve /modlar ana mod kartları AYNI bileşeni kullanır
// (11 Eki 2026; eskiden yalnız anasayfa/parcalar.jsx içindeydi). Yalnız mevcut varlıklar: rozet amblemleri
// (soru, kılıçlar) ve dükkân/kozmetik görselleri (sandık, şimşek, parıltı; Noto Emoji 3D, Apache 2.0).
// Süs; düğmenin etiketi metinde/aria-label'da. Hareket yok (durağan) → hareketi azaltta değişen bir şey yok.
import { AMBLEMLER } from "../tasarim/rozet/amblemler.jsx";
import "./mod-figur.css";

/** Amblem sembolü (rozet setinin kalın konturlu çizimi) tek başına, ±17 birimlik tuvalde. */
export function AmblemSembolu({ ad, className }) {
  const Sembol = AMBLEMLER[ad]?.Sembol;
  if (!Sembol) return null;
  return <svg className={className} viewBox="-17 -17 34 34" aria-hidden="true" focusable="false"><Sembol /></svg>;
}

export function ModFiguru({ tur, className }) {
  const ek = className ? ` ${className}` : "";
  if (tur === "klasik") {
    return (
      <span className={`as-figur as-figur--klasik${ek}`} aria-hidden="true">
        <AmblemSembolu ad="soru" className="as-figur-ana" />
        <img className="as-figur-yan" src="/dukkan/parilti.webp" alt="" width="40" height="40" decoding="async" />
      </span>
    );
  }
  if (tur === "duello") {
    return (
      <span className={`as-figur as-figur--duello${ek}`} aria-hidden="true">
        <img className="as-figur-arka" src="/kozmetik/simsek.webp" alt="" width="48" height="48" decoding="async" />
        <AmblemSembolu ad="kiliclar" className="as-figur-ana" />
      </span>
    );
  }
  return (
    <span className={`as-figur as-figur--kasa${ek}`} aria-hidden="true">
      <img className="as-figur-ana" src="/dukkan/sandik.webp" alt="" width="64" height="64" decoding="async" />
    </span>
  );
}

export default ModFiguru;
