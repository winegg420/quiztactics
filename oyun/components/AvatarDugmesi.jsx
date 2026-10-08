// ============================================================
// AVATAR DÜĞMESİ (Paket 41 D) — maç sonu ekranlarında başka bir oyuncunun
// avatarına dokununca profil kartı (OyuncuKarti) açılır. Yalnız AVATAR dokunulabilir;
// ad ve skor değil. Kendi avatarın için `kendi` verilir ve düz çizilir.
// ============================================================
import { Suspense, useState } from "react";
import { tembelYukle } from "../../src/lib/tembelYukle.js";
// Tembel OyuncuKarti'nın stilleri ana CSS'te, eski sırasıyla kalır (tembel parçada global stilleri ezerlerdi).
import "../tasarim/gorsel-revizyon/a/cizim/ortak.css";
import "../tasarim/rozet/madalyon.css";
import "../tasarim/ekranlar/rozet-panel.css";
import "../tasarim/ekranlar/unvan.css";
import "../tasarim/arka-plan/arka-plan.css";
import "../tasarim/arka-plan/arka-plan-tam.css";
import "../tasarim/arka-plan/arka-plan-yeni.css";
import "../tasarim/ekranlar/oyuncu-vitrin-karti.css";
import "../tasarim/ekranlar/koleksiyon-puani.css";
import "../tasarim/ekranlar/lig-amblemi.css";
import "../tasarim/ekranlar/dukkan-bilesen.css";
import "../tasarim/ekranlar/sikayet.css";
import { tt } from "../lib/dil.js";
import "../tasarim/ekranlar/l-kart.css";

// Profil kartı dokununca açılır: ilk yük paketinde taşınmaz (8 Eki 2026, soğuk açılış).
const OyuncuKarti = tembelYukle(() => import("./OyuncuKarti.jsx"));

export default function AvatarDugmesi({ userId, profil, kendi = false, children }) {
  const [acik, setAcik] = useState(false);
  if (kendi || !userId) return children;
  return (
    <>
      <button type="button" className="ls-avatar-dugme"
              aria-label={tt("{0} — kartını aç", { 0: profil?.gorunen_ad ?? tt("Oyuncu") })}
              onClick={(e) => { e.stopPropagation(); setAcik(true); }}>
        {children}
      </button>
      {acik && (
        <Suspense fallback={null}>
          <OyuncuKarti userId={userId} onIzleme={profil ?? null} onKapat={() => setAcik(false)} />
        </Suspense>
      )}
    </>
  );
}
