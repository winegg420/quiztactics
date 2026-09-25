/**
 * LİG AMBLEMİ — isim yanında duran küçük lig işareti (Bronz · Gümüş · Altın · Elmas · Efsane); çerçeveden bağımsız.
 * Görsel revizyon (Ida seçimi 25 Eyl 2026, tasarim/SECIMLER_GORSEL_REVIZYON.md › 9): "B — Fasetli Yıldız".
 * Kol sayısı kademeyi söyler: Bronz 4 · Gümüş 5 · Altın 6 · Elmas 8 + pırlanta göbek · Efsane 8 + arkada mor hâle.
 * Çizim /gorsel-revizyon önizlemesiyle AYNI kaynaktan (gorsel-revizyon/a/cizim/lig.jsx › LigAmblemiB); eski "kalkan"
 * çizimi kalktı. ≤ 28 px küçük çizim (kalın kontur, iç çizgi yok); 48 px ve üstünde `hareketli` verilirse üst ligler
 * ışıldar (ekrandayken; hareketi azalt → yavaş). Dışa verilen adlar (LigAmblemi, LIGLER, LIG_ADI) aynı kaldı.
 */
import { tt } from "../../lib/dil.js";
import { LigAmblemiB } from "../gorsel-revizyon/a/cizim/lig.jsx";

export const LIGLER = ["bronz", "gumus", "altin", "elmas", "efsane"];
export const LIG_ADI = { bronz: "Bronz", gumus: "Gümüş", altin: "Altın", elmas: "Elmas", efsane: "Efsane" };

/** Lig amblemi. boyut px. */
export function LigAmblemi({ lig = "bronz", boyut = 20, hareketli = false, className = "" }) {
  const l = LIGLER.includes(lig) ? lig : "bronz";
  return (
    <span className={`pp-amblem ${className}`.trim()} style={{ width: boyut, height: boyut }} role="img"
          aria-label={tt("{lig} Lig", { lig: tt(LIG_ADI[l]) })}>
      <span aria-hidden="true" className="pp-amblem-ic"><LigAmblemiB lig={l} boyut={boyut} hareketli={hareketli} /></span>
    </span>
  );
}
