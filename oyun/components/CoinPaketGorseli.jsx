/**
 * COIN PAKETİ GÖRSELİ — paket adına göre büyür (23 Eyl 2026):
 * 1 Avuç (bir avuç altın) → 2 Kese (dolu kese) → 3 Sandık → 4 Hazine (taşan hazine) → 5 Define (dev define).
 * Parçalar Google Noto Emoji 3D görselleridir (Apache 2.0) — public/dukkan/*.webp, lisans
 * docs/VARLIK_LISANSLARI.md. Burada yalnız dizilir; çizim eklenmez.
 * <CoinPaketGorseli seviye={3} />
 */
import "../tasarim/ekranlar/coin-paket.css";

const P = (ad) => `/dukkan/${ad}.webp`;
// [görsel, sol %, üst %, genişlik %, katman]
const DIZILIM = {
  1: [["coin", 6, 34, 52, 1], ["coin", 40, 40, 52, 2], ["coin", 22, 8, 52, 3]],
  2: [["kese", 4, 2, 76, 1], ["coin", 52, 52, 42, 2], ["coin", 66, 36, 34, 3]],
  3: [["sandik", 2, 4, 94, 1], ["parilti", 70, 0, 26, 2]],
  4: [["kese", 0, 14, 48, 1], ["sandik", 16, 6, 78, 2], ["mucevher", 64, 56, 34, 3], ["coin", 2, 60, 34, 4], ["parilti", 74, -4, 26, 5]],
  5: [["kese", -4, 26, 44, 1], ["kese", 60, 26, 44, 1], ["sandik", 14, 18, 74, 2], ["tac", 28, -8, 44, 3],
      ["mucevher", 64, 62, 32, 4], ["coin", 2, 64, 32, 4], ["coin", 36, 72, 28, 5], ["parilti", 78, -6, 24, 6]],
};

export default function CoinPaketGorseli({ seviye = 1, className = "" }) {
  const s = Math.min(5, Math.max(1, Math.round(seviye)));
  return (
    <span className={`qt-coin-paket qt-coin-paket--${s} ${className}`.trim()} aria-hidden="true">
      {DIZILIM[s].map(([ad, x, y, w, z], i) => (
        <img key={i} src={P(ad)} alt="" draggable="false" decoding="async"
             style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, zIndex: z }} />
      ))}
    </span>
  );
}
