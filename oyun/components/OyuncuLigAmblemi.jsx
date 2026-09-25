/**
 * OYUNCU LİG AMBLEMİ (560; 25 Eyl Fasetli Yıldız) — oyuncu adının yanında küçük lig amblemi (Bronz · Gümüş · Altın · Elmas · Efsane).
 * Çizim önizlemedekiyle aynı: oyun/tasarim/premium/ligAmblemi.jsx (ekler.jsx da dışa verir) (küçük, durağan SVG; ana pakette).
 * Çerçeveden bağımsız: lig çerçevesi takmayan oyuncunun da ligi okunur.
 *
 * <OyuncuLigAmblemi lig="altin" />           — lig elde (satır, kart)
 * <OyuncuLigAmblemi userId={id} />          — yoksa oyuncu kartından (oyuncu_kartlari; toplu + önbellekli)
 * Lig bilinmiyorsa hiçbir şey çizmez (yer kaplamaz).
 */
import { useEffect, useState } from "react";
import { LIGLER, LigAmblemi } from "../tasarim/premium/ligAmblemi.jsx";
import { oyuncuKarti, oyuncuKartiDinle } from "../lib/cerceve.js";
import "../tasarim/ekranlar/lig-amblemi.css";

export default function OyuncuLigAmblemi({ lig, userId, boyut = 20, className = "" }) {
  const [okunan, setOkunan] = useState(null);
  const [tazele, setTazele] = useState(0);
  const oku = !lig && Boolean(userId);

  useEffect(() => {
    if (!oku) return undefined;
    return oyuncuKartiDinle((id) => { if (!id || id === userId) setTazele((x) => x + 1); });
  }, [oku, userId]);

  useEffect(() => {
    if (!oku) { setOkunan(null); return undefined; }
    let aktif = true;
    oyuncuKarti(userId)
      .then((k) => { if (aktif) setOkunan(k?.lig ?? null); })
      .catch((e) => { console.warn("[Bildim] lig amblemi okunamadı:", e?.message ?? e); if (aktif) setOkunan(null); });
    return () => { aktif = false; };
  }, [oku, userId, tazele]);

  const l = lig ?? okunan;
  if (!LIGLER.includes(l)) return null;
  return <LigAmblemi lig={l} boyut={boyut} className={`qt-lig-amblem ${className}`.trim()} />;
}
