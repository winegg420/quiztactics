// Lobi kural özeti — 3 kısa numaralı madde (Telefon denetimi 12 Eki 2026).
// Ortak Hazine lobisindeki (KasaPage › KasaGiris) düzen ortak bileşene çıkarıldı; Düello lobisi de aynısını kullanır.
// Maddeler lib/modAciklamalari.js › modKurallari'ndan gelir (tek kaynak). Görünüm: styles/lobi-kurallari.css.
// `ks-ozet` sınıfı Hazine'nin mevcut stilleri için korunur.
import "../styles/lobi-kurallari.css";

/** @param {{ maddeler: string[], mod: "duello" | "kasa", className?: string }} o */
export default function LobiKurallari({ maddeler, mod, className = "" }) {
  if (!maddeler?.length) return null;
  return (
    <ol className={`lobi-kurallar lobi-kurallar--${mod} ${className}`.trim()}>
      {maddeler.map((m, i) => (
        <li key={i}><b className="qt-sayi">{i + 1}</b><span>{m}</span></li>
      ))}
    </ol>
  );
}
