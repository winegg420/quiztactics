// Sezonun İLK açılışında tam perde (1,5 sn, dokununca atlanır): "Sezon N" başlığı + sezon sonu ödülü vitrini (ör. Ejderha çerçevesi).
// Gösterilip gösterilmeyeceğine sayfa karar verir (acilis.js › perdeGerekliMi); burada yalnız çizim + süre. Gösterilince "gördü" yazılır.
// Portal ile body'ye çizilir: sayfa kökü açılışta transform'lu animasyon taşır, fixed katman onun içinde olmamalı (iOS). Dış kap hareketsiz,
// hareket içteki öğede. Yalnız opacity/transform; hareketi azaltta animasyon yok (hareketsiz görünür, süre aynı).
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { tt } from "../../lib/dil.js";
import { odulAdi } from "../../lib/sezonYolu.js";
import { OdulGorsel } from "./OdulGorsel.jsx";
import { odulCerceveSanati } from "./CerceveOdulGorsel.jsx";
import { PERDE_MS, PERDE_SOLMA_MS, perdeGorduYaz } from "./acilis.js";

export default function SezonAcilisPerdesi({ sezonNo, finalOdul, tema, dil, userId, onKapat }) {
  const [kapaniyor, setKapaniyor] = useState(false);
  const bitti = useRef(false);
  const zamanlar = useRef([]);
  const kapat = useRef(onKapat);
  kapat.current = onKapat;

  const bitir = () => {
    if (bitti.current) return;
    bitti.current = true;
    zamanlar.current.forEach(clearTimeout);
    kapat.current?.();
  };
  // Dokunma: kısa solmayla hemen atla
  const atla = () => {
    if (bitti.current || kapaniyor) return;
    setKapaniyor(true);
    zamanlar.current.push(setTimeout(bitir, 120));
  };

  useEffect(() => {
    perdeGorduYaz(userId, sezonNo);
    zamanlar.current.push(setTimeout(() => setKapaniyor(true), PERDE_MS - PERDE_SOLMA_MS));
    zamanlar.current.push(setTimeout(bitir, PERDE_MS));
    return () => { zamanlar.current.forEach(clearTimeout); };
  }, [userId, sezonNo]);

  const r = tema?.renkler ?? {};
  const cerceveMi = Boolean(odulCerceveSanati(finalOdul));
  const ad = finalOdul ? (finalOdul.placeholder ? tt("Yakında") : odulAdi(finalOdul, dil)) : "";
  return createPortal(
    <div className={`sy-perde${kapaniyor ? " sy-perde--kapan" : ""}`} role="dialog" aria-modal="true"
         aria-label={tt("Sezon {n}", { n: sezonNo })} onClick={atla}
         style={{ "--sy-t-zemin": r.zemin, "--sy-t-zemin2": r.zemin2, "--sy-t-yazi": r.yazi }}>
      <div className="sy-perde-ic">
        <h2 className="sy-perde-baslik">{tt("Sezon {n}", { n: sezonNo })}</h2>
        {finalOdul && (
          <div className="sy-perde-vitrin">
            <span className={`sy-perde-gorsel${cerceveMi ? " sy-perde-gorsel--cerceve" : ""}`} data-nadirlik={finalOdul.nadirlik ?? undefined}>
              <OdulGorsel odul={finalOdul} boyut={cerceveMi ? 132 : 84} hareketli={cerceveMi} />
            </span>
            <span className="sy-perde-etiket">{tt("Sezon sonu ödülü")}</span>
            <b className="sy-perde-ad">{ad}</b>
          </div>
        )}
        <small className="sy-perde-atla">{tt("Geçmek için dokun")}</small>
      </div>
    </div>,
    document.body,
  );
}
