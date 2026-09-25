/**
 * LİG AMBLEMİ — isim yanında duran küçük lig işareti (Bronz · Gümüş · Altın · Elmas · Efsane); çerçeveden bağımsız.
 * Görsel revizyon (Ida seçimi 25 Eyl 2026, tasarim/SECIMLER_GORSEL_REVIZYON.md › 9): "B — Fasetli Yıldız".
 * Kol sayısı kademeyi söyler: Bronz 4 · Gümüş 5 · Altın 6 · Elmas 8 + pırlanta göbek · Efsane 8 + arkada mor hâle.
 *
 * ANA PAKETTE ÇİZİM KODU YOK (Ida, 25 Eyl: paket boyutu): amblem statik SVG dosyasıdır — public/lig-amblem/<lig>-<k|b>.svg
 * (k = ≤ 28 px küçük çizim, b = normal; araclar/lig-amblem/uret.mjs LigAmblemiB çiziminden üretir), <img> ile gerekince
 * yüklenir ve tarayıcı önbelleğinde kalır. Yalnız `hareketli` + ≥ 48 px'te (üst ligler ışıldar) çizim kodu ayrı parçada
 * (LigAmblemiHareketli, React.lazy) iner; inerken statik dosya görünür. Dışa verilen adlar (LigAmblemi, LIGLER, LIG_ADI) aynı.
 */
import { lazy, Suspense } from "react";
import { tt } from "../../lib/dil.js";

export const LIGLER = ["bronz", "gumus", "altin", "elmas", "efsane"];
export const LIG_ADI = { bronz: "Bronz", gumus: "Gümüş", altin: "Altın", elmas: "Elmas", efsane: "Efsane" };

const Hareketli = lazy(() => import("./LigAmblemiHareketli.jsx"));

function Statik({ lig, boyut }) {
  return <img className="pp-amblem-ic" src={`/lig-amblem/${lig}-${boyut <= 28 ? "k" : "b"}.svg`} width={boyut} height={boyut}
              alt="" aria-hidden="true" draggable="false" decoding="async" />;
}

/** Lig amblemi. boyut px. */
export function LigAmblemi({ lig = "bronz", boyut = 20, hareketli = false, className = "" }) {
  const l = LIGLER.includes(lig) ? lig : "bronz";
  const oynar = hareketli && boyut >= 48 && l !== "bronz" && l !== "gumus";
  return (
    <span className={`pp-amblem ${className}`.trim()} style={{ width: boyut, height: boyut }} role="img"
          aria-label={tt("{lig} Lig", { lig: tt(LIG_ADI[l]) })}>
      {oynar ? (
        <Suspense fallback={<Statik lig={l} boyut={boyut} />}><Hareketli lig={l} boyut={boyut} /></Suspense>
      ) : <Statik lig={l} boyut={boyut} />}
    </span>
  );
}
