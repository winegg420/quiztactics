// ============================================================
// AVATAR DÜĞMESİ (Paket 41 D) — maç sonu ekranlarında başka bir oyuncunun
// avatarına dokununca profil kartı (OyuncuKarti) açılır. Yalnız AVATAR dokunulabilir;
// ad ve skor değil. Kendi avatarın için `kendi` verilir ve düz çizilir.
// ============================================================
import { useState } from "react";
import OyuncuKarti from "./OyuncuKarti.jsx";
import { tt } from "../lib/dil.js";

export default function AvatarDugmesi({ userId, profil, kendi = false, children }) {
  const [acik, setAcik] = useState(false);
  if (kendi || !userId) return children;
  return (
    <>
      <button type="button" className="bd-avatar-dugmesi"
              aria-label={tt("{0} — kartını aç", { 0: profil?.gorunen_ad ?? tt("Oyuncu") })}
              onClick={(e) => { e.stopPropagation(); setAcik(true); }}>
        {children}
      </button>
      {acik && (
        <OyuncuKarti userId={userId} onIzleme={profil ?? null} onKapat={() => setAcik(false)} />
      )}
    </>
  );
}
