import { useEffect, useState } from "react";
import Ikon from "./Ikon.jsx";
import { sesRutbeAtladi } from "../lib/ses.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { RUTBELER, rutbeBul } from "../lib/ranks.js";
import { tt } from "../lib/dil.js";

/**
 * Rütbe atlanınca tam ekran kutlama gösterir.
 * P2A: rütbe LEVEL'e bağlı (profiles.level). Son görülen rütbe localStorage'da rütbe
 * id'siyle tutulur (dilden bağımsız); level yeni rütbeye geçtiyse 3,5 sn'lik animasyon oynar.
 * Anahtar yeni (`bildim_rutbe_lvl_`): eski puan-rütbesi kaydı sahte kutlama tetiklemesin.
 */
export default function RankUpOverlay() {
  const { user, profile } = useAuth();
  const [goster, setGoster] = useState(null); // rütbe objesi

  useEffect(() => {
    if (!user || !profile || profile.level == null) return;
    const anahtar = `bildim_rutbe_lvl_${user.id}`;
    const yeni = rutbeBul(profile.level);
    let eskiId = null;
    try { eskiId = localStorage.getItem(anahtar); } catch { /* özel mod */ }
    if (eskiId && eskiId !== yeni.id) {
      const eskiIdx = RUTBELER.findIndex((r) => r.id === eskiId);
      const yeniIdx = RUTBELER.findIndex((r) => r.id === yeni.id);
      if (eskiIdx >= 0 && yeniIdx > eskiIdx) {
        setGoster(yeni);
        try { sesRutbeAtladi(); } catch { /* ses kapalı olabilir */ }
      }
    }
    try { localStorage.setItem(anahtar, yeni.id); } catch { /* özel mod */ }
  }, [user, profile?.level]);

  // Kapanma zamanlayıcısı YALNIZ kutlamaya bağlı. Eskiden [user, profile?.puan] efektinin
  // temizleyicisindeydi: 3,5 sn içinde profil tazelenince zamanlayıcı iptal olur, kutlama
  // ekranda asılı kalırdı.
  useEffect(() => {
    if (!goster) return undefined;
    const id = setTimeout(() => setGoster(null), 3500);
    return () => clearTimeout(id);
  }, [goster]);

  if (!goster) return null;

  return (
    <div className="rutbe-kutlama" onClick={() => setGoster(null)}>
      <div className="icerik">
        <div className="isiltilar">
          {[...Array(8)].map((_, i) => (
            <span key={i} className="isilti" style={{ "--i": i }} />
          ))}
        </div>
        <div className="buyuk-ikon"><Ikon ad={goster.ikon} boyut={46} /></div>
        <div className="etiket">{tt("RÜTBE ATLADIN!")}</div>
        <div className="rutbe-adi" style={{ color: goster.metinRenk }}>
          {goster.ad}
        </div>
      </div>
    </div>
  );
}
