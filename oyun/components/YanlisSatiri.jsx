import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { QtListe, QtListeSatiri } from "../tasarim/index.js";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";

/**
 * Maç sonucu ekranlarında görünen küçük satır:
 *   "3 soruyu yanlış bildin — Hatalarım'a eklendi"
 * Yanlış yoksa hiçbir şey çizilmez.
 * Tasarım A (Şerit M1): QtListeSatiri (bağlantı, ok).
 *
 * macTur: '1v1' | 'grup' | 'turnuva' | 'hizli'
 */
export default function YanlisSatiri({ macTur, macId, onAdet }) {
  const [adet, setAdet] = useState(0);

  useEffect(() => {
    if (!macTur || !macId) return;
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("mac_yanlis_sayim", {
          p_mac_tur: macTur,
          p_mac_id: macId,
        });
        if (error) throw error;
        const n = typeof data === "number" ? data : 0;
        if (aktif) { setAdet(n); onAdet?.(n); }   // onAdet (Paket 36): sonuç sahnesinin "Detay (n)" rozeti
      } catch (e) {
        // migration bekliyor olabilir — satır gizli kalır
        console.warn("[Bildim] mac_yanlis_sayim başarısız:", e?.message ?? e);
      }
    })();
    return () => {
      aktif = false;
    };
  }, [macTur, macId]);

  if (adet <= 0) return null;

  return (
    <QtListe>
      <QtListeSatiri
        as={Link}
        to={y("/calisma")}
        ikon="kitap"
        ikonTon="yanlis"
        baslik={tt("{n} soruyu yanlış bildin", { n: adet })}
        alt={tt("Hatalarım'a eklendi — tekrar çalış")}
        ok
      />
    </QtListe>
  );
}
