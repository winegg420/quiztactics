// ============================================================
// "BAĞLANTI YOK" ŞERİDİ (D-206) — çevrimdışıyken ekranın en üstünde ince şerit.
// navigator.onLine + online/offline olayları; bağlantı gelince kaybolur.
// iOS: şerit body'ye portal ile çizilir (transform'lu bir atanın içinde kalmasın);
// kendisinde transform yok, çentik için safe-area-inset-top payı var. Görünüm:
// oyun/tasarim/ekranlar/hata-kurtarma.css
// ============================================================
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { tt } from "../lib/dil.js";

function cevrimiciMi() {
  try {
    return typeof navigator === "undefined" || navigator.onLine !== false;
  } catch {
    return true;
  }
}

export default function BaglantiSeridi() {
  const [cevrimici, setCevrimici] = useState(cevrimiciMi);
  useEffect(() => {
    const guncelle = () => setCevrimici(cevrimiciMi());
    window.addEventListener("online", guncelle);
    window.addEventListener("offline", guncelle);
    return () => {
      window.removeEventListener("online", guncelle);
      window.removeEventListener("offline", guncelle);
    };
  }, []);
  if (cevrimici || typeof document === "undefined") return null;
  return createPortal(
    <div className="qt-baglanti-yok" role="status" aria-live="polite">
      <span className="qt-baglanti-yok-nokta" aria-hidden="true" />
      {tt("Bağlantı yok")}
    </div>,
    document.body,
  );
}
