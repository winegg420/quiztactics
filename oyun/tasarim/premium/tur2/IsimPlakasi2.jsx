/**
 * ALTIN İSİM PLAKASI — 2. tur (yalnız /premium-onizleme). Görünüm: tur2.css › p2-plaka.
 *   tur="yakut" — parlak altın çerçeve, derin yakut kadife zemin, altın yazı
 *   tur="kulce" — cilalı altın külçe, isim kazınmış
 * boyut: "k" | "o" | "b" (önceki AltinIsimPlakasi ile aynı ölçüler).
 */
import "./tur2.css";

export const PLAKA2 = {
  yakut: { ad: "Altın plaka — yakut zemin", aciklama: "Parlak sarı altın çerçeve ve yazı, derin yakut kadife zemin (ince şam deseni), altın elmas uçlar. Üstünden ışık geçer." },
  kulce: { ad: "Altın plaka — külçe", aciklama: "Plakanın kendisi cilalı altın külçe; isim kazınmış (kabartma ışıklı), yakut uçlar. Üstünden ışık geçer." },
};

export default function IsimPlakasi2({ tur = "yakut", boyut = "o", hareketli = true, className = "", children }) {
  return (
    <span className={`p2-plaka p2-plaka--${tur} p2-plaka--${boyut}${hareketli ? " p2-plaka--oynar" : ""} ${className}`.trim()}>
      <span className="p2-plaka-uc" aria-hidden="true" />
      <span className="p2-altin">{children}</span>
      <span className="p2-plaka-uc" aria-hidden="true" />
    </span>
  );
}
