import { useEffect, useState } from "react";
import { QtIkonDugme } from "../tasarim/index.js";
import { etkinTema, temaDegistir, temayaAbone } from "../lib/tema.js";
import { tt } from "../lib/dil.js";

/**
 * Üst çubuktaki açık/koyu tema düğmesi.
 * Açık temadayken ay (koyuya geç), koyu temadayken güneş (açığa dön) gösterir.
 * Tercih localStorage'da; ilk açılışta cihazın teması izlenir (bkz. lib/tema.js).
 */
export default function TemaDugmesi() {
  const [tema, setTema] = useState(() => etkinTema());

  // Cihaz teması değişirse (oyuncu telefonun gece modunu açarsa) ikon da dönsün
  useEffect(() => temayaAbone(setTema), []);

  const koyu = tema === "koyu";
  return (
    // Yön A: QtIkonDugme (44 px, etiket zorunlu)
    <QtIkonDugme
      ikon={koyu ? "gunes" : "ay"}
      etiket={koyu ? tt("Açık temaya geç") : tt("Koyu temaya geç")}
      onClick={() => setTema(temaDegistir())}
    />
  );
}
