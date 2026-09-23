import { useCallback, useEffect, useState } from "react";
import { QtIkon as Ikon } from "../tasarim/index.js";
import { supabase } from "../../src/lib/supabase.js";
import { tt } from "../lib/dil.js";

/**
 * Günlük seri sayacı + koruma durumu.
 * `bicim="serit"` (Arayüz Yenileme, 20 Eyl 2026): oyuncu şeridindeki
 * istatistik hücresi. Veri kaynağı aynı RPC — ikinci bir sorgu açılmadı.
 */
export default function SeriRozeti({ bicim = "rozet" }) {
  const [durum, setDurum] = useState(null);

  const yukle = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("seri_durumum");
      if (error) throw error;
      setDurum(Array.isArray(data) ? (data[0] ?? null) : (data ?? null));
    } catch {
      setDurum(null); // migration henüz uygulanmadıysa sessiz geç
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  if (!durum) return null;

  const gun = durum.seri_gun ?? 0;
  const bugunOynadi = Boolean(durum.bugun_oynadi);
  const koruma = durum.koruma ?? 0;

  // Alev, serinin uzunluğuna göre ısınır. Seri oyuncunun kaybetmek
  // istemeyeceği tek şey — görsel olarak da öyle dursun.
  const isi = gun >= 7 ? "sicak" : gun >= 3 ? "orta" : gun >= 1 ? "sonuk" : "yok";

  if (bicim === "serit") {
    return (
      <div className={`bd-seri-serit isi-${isi}`}>
        <b><Ikon ad="ates" boyut={14} /> {gun}</b>
        <span>{bugunOynadi || gun === 0 ? tt("Günlük seri") : tt("Bugün oynamadın")}</span>
      </div>
    );
  }

  return (
    <div className={`bd-seri isi-${isi} ${bugunOynadi ? "aktif" : "bekliyor"}`}>
      <span className="bd-seri-alev" aria-hidden="true"><Ikon ad="ates" boyut={15} /></span>
      <span className="bd-seri-govde">
        <span className="bd-seri-sayi">{gun}</span>
        <span className="bd-seri-etiket">
          {gun === 0
            ? tt("seri yok")
            : bugunOynadi
              ? tt("günlük seri")
              : tt("gün — bugün oynamadın!")}
        </span>
      </span>
      {koruma > 0 && (
        <span className="bd-seri-kalkan" title={tt("{0} adet seri koruma", { 0: koruma })}>
          <Ikon ad="kalkan" boyut={14} /> {koruma}
        </span>
      )}
      {durum.seri_en_uzun > gun && (
        <span className="bd-seri-rekor" title={tt("En uzun serin")}>
          {tt("rekor")} {durum.seri_en_uzun}
        </span>
      )}
    </div>
  );
}
