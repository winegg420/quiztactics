// İlk maç rehberi balonu (Düello 1093 + Hazine 1094 ortak). Gerçek öğenin yanında kısa metin + "Geç" (≥ 44 px).
// Konum/ok yönü modülün CSS'inde (`<önek>-rehber--<an>`); taban görünüm styles/rehber-balonu.css (:where → sıfır özgüllük).
import { sinif } from "../tasarim/index.js";
import "../styles/rehber-balonu.css";

export default function RehberBalonu({ onek, metin, onGec, className, c }) {
  return (
    <div className={sinif("qt-rehber", `${onek}-rehber`, className)} role="status">
      <span className={sinif("qt-rehber-yazi", `${onek}-rehber-yazi`)}>{metin}</span>
      <button type="button" className={sinif("qt-rehber-gec", `${onek}-rehber-gec`)} onClick={onGec}>{c("Geç")}</button>
    </div>
  );
}
