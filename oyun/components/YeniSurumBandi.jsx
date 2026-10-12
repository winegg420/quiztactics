// "Yeni sürüm hazır · Yenile" bandı. Otomatik yenileme YOK; maçta (body.bd-oyun-modu) CSS ile gizli,
// maç bitince görünür (hata-kurtarma.css › .qt-yeni-surum). Akışta durur: alt menüyü örtmez.
import { useEffect, useState } from "react";
import { surumKontrolBaslat } from "../lib/surumKontrol.js";
import { tt } from "../lib/dil.js";

export default function YeniSurumBandi() {
  const [hazir, setHazir] = useState(false);
  useEffect(() => surumKontrolBaslat(() => setHazir(true)), []);
  if (!hazir) return null;
  return (
    <div className="qt-yeni-surum" role="status" aria-live="polite">
      <span className="qt-yeni-surum-metin">{tt("Yeni sürüm hazır.")}</span>
      <button
        type="button"
        className="qt-yeni-surum-dugme"
        onClick={() => {
          try {
            window.location.reload();
          } catch (e) {
            console.warn("[Bildim] sayfa yenilenemedi:", e?.message ?? e);
          }
        }}
      >
        {tt("Yenile")}
      </button>
    </div>
  );
}
