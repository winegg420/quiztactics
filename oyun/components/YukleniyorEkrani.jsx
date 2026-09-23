// Tam ekran "Yükleniyor…" yedeği (Tasarım Adım 2, Yön A).
// Kullanıldığı yerler: src/main.jsx Suspense yedeği, src/BildimApp.jsx oturum
// beklerken ve tembel sayfa inerken. Durumsuz; yalnız görünüm.
import { QtMarka } from "../tasarim/index.js";
import { tt } from "../lib/dil.js";
import "../tasarim/ekranlar/g-sayfalar.css";

export default function YukleniyorEkrani() {
  return (
    <div className="qt-sayfa g-yedek" role="status" aria-busy="true" aria-live="polite">
      <QtMarka boyut="b" />
      <span className="g-yedek-yukleniyor">
        <span className="qt-donen" aria-hidden="true" />
        {tt("Yükleniyor…")}
      </span>
    </div>
  );
}
