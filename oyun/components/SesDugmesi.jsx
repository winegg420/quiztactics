import { useEffect, useState } from "react";
import Ikon from "./Ikon.jsx";
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
    <button
      type="button"
      className={`bd-ses-dugme ${acik ? "" : "kapali"} ${className}`}
      onClick={degistir}
      aria-pressed={acik}
      aria-label={acik ? tt("Sesi kapat") : tt("Sesi aç")}
      title={acik ? tt("Sesi kapat") : tt("Sesi aç")}
    >
      <Ikon ad={acik ? "sesAcik" : "sesKapali"} boyut={18} />
    </button>
  );
}
