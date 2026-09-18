// ============================================================
// SİS JOKERİ — görsel katman (Paket 32 A.2 – A.5)
//
// SisPerdesi: sis YİYEN tarafın ekranı. Bütün ekranı kaplayan, iki katmanlı
//   (arkada koyu mor-lacivert, önde açık) bulut perdesi İNER (~400 ms), sunucunun
//   sis süresi boyunca kalır, sonra KALKAR (~500 ms). Perde gerçekten kapatır:
//   soru ve şıklar okunamaz, tıklama kilitli (katman olayları yutar; QuestionCard
//   da ayrıca cevabı engeller; sunucu da reddeder). Geri sayım sisin ÜSTÜNDE görünür.
// SisKenar: sis GÖNDEREN tarafın ekranı. Yalnız yan kenarlardan gelip geçen hafif
//   efekt; pointer-events: none — oynamayı hiç etkilemez.
//
// iOS: katman `position: fixed`; kendisinde transform YOK. İniş/kalkış ve kayma
// animasyonları İÇ katmanlarda (transform + opacity; top/left/width animasyonu yok).
// prefers-reduced-motion: hareket yok, anında görünür/kalkar — kapatma işlevi aynen durur.
// ============================================================
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Ikon from "./Ikon.jsx";
import { sesSis } from "../lib/ses.js";
import { tt } from "../lib/dil.js";

const KALKIS_MS = 500;

/**
 * @param {object} o
 * @param {number} o.bitis   sisin kalkacağı an (istemci saatine çevrilmiş ms)
 * @param {number} o.kalan   sorunun kalan saniyesi (sisin üstünde gösterilir)
 */
export function SisPerdesi({ bitis, kalan }) {
  const [evre, setEvre] = useState("iniyor");   // iniyor → duruyor → kalkiyor → bitti

  useEffect(() => {
    sesSis(false);
    const t1 = setTimeout(() => setEvre("duruyor"), 400);
    const t2 = setTimeout(() => { setEvre("kalkiyor"); sesSis(true); }, Math.max(0, bitis - Date.now()));
    const t3 = setTimeout(() => setEvre("bitti"), Math.max(0, bitis - Date.now()) + KALKIS_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [bitis]);

  if (evre === "bitti" || typeof document === "undefined") return null;
  return createPortal(
    <div className={`bd-sis-perde ${evre}`} role="alert" aria-live="assertive"
         onPointerDown={(e) => e.preventDefault()} onClick={(e) => e.stopPropagation()}>
      <div className="bd-sis-katmanlar" aria-hidden="true">
        <div className="bd-sis-katman arka" />
        <div className="bd-sis-katman on" />
        <div className="bd-sis-vinyet" />
      </div>
      <div className="bd-sis-bilgi">
        <Ikon ad="sis" boyut={34} />
        <div className="bd-sis-metin">{tt("Rakibin sis gönderdi")}</div>
        <div className="bd-sis-sayac" aria-label={tt("{0} saniye kaldı", { 0: Math.max(0, Math.ceil(kalan)) })}>
          {Math.max(0, Math.ceil(kalan))}
          <small>{tt("sn")}</small>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * @param {object} o
 * @param {number} o.bitis  kenar efektinin biteceği an (ms)
 */
export function SisKenar({ bitis }) {
  const [gorunur, setGorunur] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setGorunur(false), Math.max(0, bitis - Date.now()) + KALKIS_MS);
    return () => clearTimeout(t);
  }, [bitis]);
  if (!gorunur || typeof document === "undefined") return null;
  return createPortal(
    <div className="bd-sis-kenar" aria-hidden="true"
         style={{ "--bd-sis-sure": `${Math.max(800, bitis - Date.now() + KALKIS_MS)}ms` }}>
      <div className="bd-sis-kenar-yan sol" />
      <div className="bd-sis-kenar-yan sag" />
    </div>,
    document.body
  );
}
