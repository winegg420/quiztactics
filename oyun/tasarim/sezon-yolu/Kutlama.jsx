// Satın alma kutlaması: isim altın olur, avatara altın halka biner (CerceveliAvatar sezonBp), geriye dönük ödüller sırayla düşer.
import { useEffect, useState } from "react";
import { QtDugme, QtModal } from "../index.js";
import { tt } from "../../lib/dil.js";
import CerceveliAvatar from "../../components/CerceveliAvatar.jsx";
import { AltinIsim } from "../../components/IsimEfekti.jsx";
import { OdulGorsel, kisaYazi } from "./OdulGorsel.jsx";

const azaltMi = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

export default function Kutlama({ verilen, profile, userId, onKapat }) {
  const [altin, setAltin] = useState(false);
  const azalt = azaltMi();
  useEffect(() => {
    const t = setTimeout(() => setAltin(true), azalt ? 200 : 650);
    return () => clearTimeout(t);
  }, [azalt]);
  const ad = profile?.gorunen_ad ?? "";
  const liste = (Array.isArray(verilen) ? verilen : []).slice(0, 12);
  const fazla = Math.max(0, (Array.isArray(verilen) ? verilen.length : 0) - liste.length);
  return (
    <QtModal acik baslik={tt("Battle Pass aktif!")} aciklama={tt("Altın isim ve altın halka artık sende.")} onKapat={onKapat}
      altlik={<QtDugme tamGenislik onClick={onKapat} data-qt-ilk-odak>{tt("Harika")}</QtDugme>}>
      <div className="sy-kutlama" data-yumusak>
        <div className="sy-kutlama-sahne">
          <span className="sy-dalga" aria-hidden="true" />
          <CerceveliAvatar profile={profile} userId={userId} boyut={96} hareketli sezonBp />
        </div>
        <div className="sy-kutlama-isim">
          {altin ? <AltinIsim hareketli>{ad}</AltinIsim> : <span>{ad}</span>}
        </div>
        {liste.length > 0 && (
          <>
            <p className="sy-not">{tt("Geriye dönük ödüllerin:")}</p>
            <ul className="sy-dusen" aria-label={tt("Verilen ödüller")}>
              {liste.map((o, i) => (
                <li key={`${o.seviye}:${o.kol}:${i}`} className="sy-dus" style={{ animationDelay: `${i * 110}ms` }}>
                  <OdulGorsel odul={o} boyut={30} />
                  <span>{kisaYazi(o)}</span>
                </li>
              ))}
              {fazla > 0 && <li className="sy-dus sy-dus--fazla" style={{ animationDelay: `${liste.length * 110}ms` }}>+{fazla}</li>}
            </ul>
          </>
        )}
      </div>
    </QtModal>
  );
}
