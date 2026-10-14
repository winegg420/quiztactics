import { DILLER } from "../lib/dil.js";
import { useDil } from "../lib/dilKanca.js";
import { QtCip } from "../tasarim/index.js";

// Yasal sayfalar (Gizlilik, Hesap silme) giriş yapmadan açılır; dil TR/EN buradan da değişir.
// Seçim localStorage'a yazılır, sayfa bir kez yenilenir (useDil › dilDegistir).
export default function YasalDilSecici() {
  const { dil, ceviri, dilDegistir } = useDil();
  return (
    <div className="g-yasal-dil" role="group" aria-label={ceviri("Dil")}>
      {DILLER.map((d) => (
        <QtCip key={d} secili={dil === d} onClick={() => dil !== d && dilDegistir(d)}>
          {d.toUpperCase()}
        </QtCip>
      ))}
    </div>
  );
}
