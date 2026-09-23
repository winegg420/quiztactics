import { useEffect, useState } from "react";
import { QtDugme, QtIkon, QtKart } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-sonuc.css";
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
    <div className="m1-rutbe" role="status" aria-live="polite" onClick={() => setGoster(null)}>
      <QtKart className="m1-rutbe-kart" dolgu="b">
        <span className="m1-rutbe-ikon" aria-hidden="true"><QtIkon ad={goster.ikon} boyut={46} /></span>
        <span className="m1-rutbe-etiket">{tt("Rütbe atladın!")}</span>
        <span className="m1-rutbe-ad">{goster.ad}</span>
        <QtDugme tur="ikincil" boyut="k" onClick={() => setGoster(null)}>{tt("Tamam")}</QtDugme>
      </QtKart>
    </div>
  );
}
