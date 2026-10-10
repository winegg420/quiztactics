// Sandık açılış perdesi (tam ekran, koyu). Akış: sandık büyür ve sallanır (sunucu cevabı beklenirken) → kapak açılır →
// sunucunun döndüğü GERÇEK ödüller tek tek zıplayarak çıkar → turuncu "Topla" → ödüller bakiyeye uçar, perde kapanır.
// Tek sefer çalar (üst bileşen yalnız kullanıcı dokunuşunda açar). Perde body'ye portalla basılır: ataları transform'suzdur (iOS fixed kuralı);
// perdenin kendisi transform taşımaz, hareket içteki öğelerde (yalnız transform/opacity). Hareketi azalt: ödüller ve düğme anında görünür.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QtIkon, QtDugme, sinif } from "../../tasarim/index.js";
import { hareketAzaltildi } from "../../tasarim/sahne/OdulPatlamasi.jsx";
import { tt } from "../../lib/dil.js";
import Sandik from "./Sandik.jsx";

const ODUL_ARALIK_MS = 650;   // ödüller arası
const ILK_BEKLEME_MS = 750;   // kapak açıldıktan sonra ilk ödüle kadar

function OdulIkonu({ tur }) {
  if (tur === "sp") return <span className="gk-ac-sp" aria-hidden="true">SP</span>;
  return <span className="gk-ac-joker" aria-hidden="true"><QtIkon ad="degistir" boyut={26} /></span>;
}

export default function SandikAcilis({ faz, oduller, onTopla, onKapan }) {
  const [topla, setTopla] = useState(false);       // Topla düğmesi görünür/basılabilir
  const [isleniyor, setIsleniyor] = useState(false);
  const [kapaniyor, setKapaniyor] = useState(false);
  const dugmeRef = useRef(null);
  const azalt = hareketAzaltildi();

  useEffect(() => {
    if (faz !== "ac") return undefined;
    const t = setTimeout(() => setTopla(true), azalt ? 0 : ILK_BEKLEME_MS + oduller.length * ODUL_ARALIK_MS + 250);
    return () => clearTimeout(t);
  }, [faz, oduller.length, azalt]);

  useEffect(() => { if (topla) { try { dugmeRef.current?.focus({ preventScroll: true }); } catch { /* odak şart değil */ } } }, [topla]);

  const bas = async () => {
    if (isleniyor) return;
    setIsleniyor(true);
    try { await onTopla?.(); } catch { /* ödül zaten alındı: perde yine kapanır */ }
    setKapaniyor(true);
    setTimeout(() => onKapan?.(), azalt ? 0 : 240);
  };

  const acik = faz === "ac";
  return createPortal(
    <div className={sinif("gk-ac", acik && "gk-ac--acik", kapaniyor && "gk-ac--kapan")} role="dialog" aria-modal="true" aria-label={tt("Haftalık sandık")}>
      <div className="gk-ac-ic">
        <div className="gk-ac-sahne">
          <span className="gk-isin gk-isin--ac" aria-hidden="true" />
          <div className={sinif("gk-ac-sd", acik ? "gk-ac-sd--buyu" : "gk-ac-sd--sallan")}>
            <Sandik acik={acik} />
          </div>
        </div>
        <ul className="gk-ac-oduller" aria-live="polite">
          {acik && oduller.map((o, i) => (
            <li key={o.anahtar} className="gk-ac-odul" style={{ "--gk-i": i }}>
              <OdulIkonu tur={o.tur} />
              <b>{o.metin}</b>
            </li>
          ))}
        </ul>
        <div className="gk-ac-alt">
          {topla && !kapaniyor && (
            <QtDugme tur="birincil" boyut="o" tamGenislik className="gk-ac-topla" ref={dugmeRef} yukleniyor={isleniyor} onClick={bas}>{tt("Topla")}</QtDugme>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
