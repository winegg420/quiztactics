// Ödül alınca kazanılan coin'in üst çubuktaki coin çipine (.bd-coin-hap) kısa uçuşu. Çip bakiyeyi kendisi sayarak günceller
// (coinTazele → CoinHapi › useSayanDeger); burada yalnız uçuş çizilir. Hedef çip yoksa HİÇ çizilmez (uydurma hedefe uçulmaz).
// iOS: dış kap position:fixed ve hareketsiz (yalnız left/top); hareket içteki iki öğede. Hareketi azalt: tek coin, yavaş, sade (CSS).
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CoinIkon } from "../../components/ParaIkonlari.jsx";
import { QT_SAHNE_COIN_HAPI } from "../sahne/QtSahne.jsx";

const ARA_MS = 110;

/** kaynak: DOM öğesi (ya da null → ekranın ortası); bitince onBitti. */
export default function SezonUcus({ kaynak, onBitti }) {
  const [yol, setYol] = useState(null);
  const bitti = useRef(onBitti);
  bitti.current = onBitti;
  const biten = useRef(0);
  let azalt = false;
  try { azalt = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* matchMedia yok */ }
  const coinBitti = (e) => { if (e.target !== e.currentTarget) return; biten.current += 1; if (biten.current >= (azalt ? 1 : 3)) bitti.current?.(); };

  useLayoutEffect(() => {
    let b = null;
    // Sahnede uygulama üst çubuğu gizli: hedef sahnenin coin hapı (yoksa üst çubuktaki)
    try { b = (document.querySelector(QT_SAHNE_COIN_HAPI) ?? document.querySelector(".bd-coin-hap"))?.getBoundingClientRect(); } catch { /* yok */ }
    const a = kaynak?.getBoundingClientRect?.();
    if (!b || !b.width) { bitti.current?.(); return; }
    const x0 = a ? a.left + a.width / 2 - 8 : window.innerWidth / 2 - 8;
    const y0 = a ? a.top + a.height / 2 - 8 : window.innerHeight / 2;
    setYol({ x: x0, y: y0, dx: b.left + b.width / 2 - x0 - 8, dy: b.top + b.height / 2 - y0 - 8 });
  }, [kaynak]);

  if (!yol) return null;
  return createPortal(
    <div className="sy-ucus" aria-hidden="true" data-yumusak="" style={{ left: yol.x, top: yol.y, "--dx": `${yol.dx}px`, "--dy": `${yol.dy}px` }}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="sy-ucus-x" style={{ animationDelay: `${i * ARA_MS}ms` }}
              onAnimationEnd={coinBitti}>
          <span className="sy-ucus-y" style={{ animationDelay: `${i * ARA_MS}ms` }}><CoinIkon boyut={16} /></span>
        </span>
      ))}
    </div>,
    document.body,
  );
}
