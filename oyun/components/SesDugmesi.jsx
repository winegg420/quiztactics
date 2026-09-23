import { useEffect, useState } from "react";
import { QtIkonDugme, sinif } from "../tasarim/index.js";
import { sesAcikMi, sesAyarla, sesDinle, sesDokunus, sesKilidiAc } from "../lib/ses.js";
import { tt } from "../lib/dil.js";

/**
 * Üst çubuktaki ses aç/kapa düğmesi.
 * Tercih localStorage'da (bildim_ses), varsayılan AÇIK.
 * Açarken kısa bir dokunuş sesi çalar — düğmenin çalıştığı duyulsun.
 */
export default function SesDugmesi({ className = "" }) {
  const [acik, setAcik] = useState(() => sesAcikMi());
  // Başka yerden (Profil › Ayarlar, avatar menüsü) değişirse bu düğme de güncellensin
  useEffect(() => sesDinle(setAcik), []);

  const degistir = () => {
    try {
      const yeni = !acik;
      sesAyarla(yeni);
      setAcik(yeni);
      if (yeni) {
        sesKilidiAc();
        sesDokunus();
      }
    } catch {
      /* ses motoru yoksa arayüz yine çalışsın */
    }
  };

  return (
    // Yön A: QtIkonDugme (saydam — maç şeridinin rengini alır). className dışarıdan gelir.
    <QtIkonDugme
      tur="saydam"
      ikon={acik ? "sesAcik" : "sesKapali"}
      etiket={acik ? tt("Sesi kapat") : tt("Sesi aç")}
      aria-pressed={acik}
      className={sinif("a-ses-dugme", !acik && "a-ses-dugme--kapali", className)}
      onClick={degistir}
    />
  );
}
