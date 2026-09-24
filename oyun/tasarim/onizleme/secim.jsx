// /tasarim-onizleme ortak parçası: aday başına "Girsin / Girmesin" düğmeleri (ikon önizlemesiyle aynı düzen).
// Bölüm dosyaları (altin/, arama/) bunu kullanır; seçim durumu sayfada tutulur.
import { QtDugme } from "../index.js";
import { tt } from "../../lib/dil.js";

export function SecimDugmeleri({ kod, secimler, onSec }) {
  const d = secimler[kod];
  return (
    <div className="to-karar" role="group" aria-label={tt("Karar")}>
      <QtDugme boyut="k" tur={d === "girsin" ? "birincil" : "ikincil"} ikon={d === "girsin" ? "tik" : undefined}
               aria-pressed={d === "girsin"} onClick={() => onSec(kod, d === "girsin" ? null : "girsin")}>{tt("Girsin")}</QtDugme>
      <QtDugme boyut="k" tur={d === "girmesin" ? "tehlike" : "ikincil"} aria-pressed={d === "girmesin"}
               onClick={() => onSec(kod, d === "girmesin" ? null : "girmesin")}>{tt("Girmesin")}</QtDugme>
    </div>
  );
}
