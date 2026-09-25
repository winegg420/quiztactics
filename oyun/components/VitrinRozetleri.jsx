/**
 * VİTRİN ROZETLERİ — oyuncunun seçtiği en çok 3 rozet (profil kartı, oyuncu kartı).
 * Veri oyuncu kartından (oyuncu_kartlari, toplu + önbellekli); `vitrin` verilirse sorgu yok.
 */
import { useEffect, useState } from "react";
import RozetMadalyonu from "./RozetMadalyonu.jsx";
import { oyuncuKarti, oyuncuKartiDinle } from "../lib/cerceve.js";
import { tt } from "../lib/dil.js";
import "../tasarim/ekranlar/rozet-panel.css";

export default function VitrinRozetleri({ userId, vitrin, boyut = 32, className = "" }) {
  const [okunan, setOkunan] = useState([]);
  const [tazele, setTazele] = useState(0);
  const verildi = Array.isArray(vitrin);

  useEffect(() => {
    if (verildi || !userId) return undefined;
    return oyuncuKartiDinle((id) => { if (!id || id === userId) setTazele((x) => x + 1); });
  }, [verildi, userId]);

  useEffect(() => {
    if (verildi || !userId) return undefined;
    let aktif = true;
    oyuncuKarti(userId)
      .then((k) => { if (aktif) setOkunan(Array.isArray(k?.vitrin) ? k.vitrin : []); })
      .catch((e) => { console.error("[Bildim] vitrin okunamadı:", e?.message ?? e); if (aktif) setOkunan([]); });
    return () => { aktif = false; };
  }, [verildi, userId, tazele]);

  const liste = (verildi ? vitrin : okunan).slice(0, 3);
  if (!liste.length) return null;
  return (
    <span className={`qt-vitrin ${className}`.trim()} role="list" aria-label={tt("Vitrin rozetleri")}>
      {liste.map((r) => (
        <span key={r.anahtar} role="listitem">
          <RozetMadalyonu grup={r.grup} kademe={r.kademe} boyut={boyut} anahtar={r.anahtar} ikon={r.ikon}
                          etiket={r.ad ?? tt("Rozet")} />
        </span>
      ))}
    </span>
  );
}
