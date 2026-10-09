// Ortak sayfa başlığı — başlık + (varsa) geri düğmesi + (varsa) alt yazı TEK bileşende.
//   tur="afis"  (varsayılan): sayfa afişi (QtAfis); alt yazı = afişin altındaki özet şeridi.
//   tur="sahne": tam ekran sahne üst şeridi (QtSahne); alt yazı = başlığın altındaki küçük satır.
// geri: true → geri düğmesi gösterilir (sahne'de her zaman vardır). onGeri verilmezse
//   geçmişte bir adım geri, geçmiş yoksa ana sayfa.
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { QtAfis, QtIkonDugme } from "./temel.jsx";
import CoinHapi from "../components/CoinHapi.jsx";
import { tt } from "../lib/dil.js";
import { y } from "../lib/yol.js";

export function useSayfaGeri(onGeri) {
  const navigate = useNavigate();
  return useCallback(() => {
    if (onGeri) { onGeri(); return; }
    try {
      if (window.history.length > 1) { navigate(-1); return; }
    } catch { /* geçmiş okunamadı */ }
    navigate(y("/"));
  }, [navigate, onGeri]);
}

export default function SayfaBasligi({ tur = "afis", baslik, altYazi, geri, onGeri, sag, ikon, ton, className, children, ...rest }) {
  const geriGit = useSayfaGeri(onGeri);
  if (tur === "sahne") {
    return (
      <header className="qt-sahne-ust">
        <QtIkonDugme ikon="geri" etiket={tt("Geri")} tur="yuzey" className="qt-sahne-geri" onClick={geriGit} />
        <div className="qt-sahne-baslik">
          <h1>{baslik}</h1>
          {altYazi != null && altYazi !== false && <span className="qt-sahne-altbaslik">{altYazi}</span>}
        </div>
        <div className="qt-sahne-coin">{sag ?? <CoinHapi />}</div>
      </header>
    );
  }
  const bas = geri ? <QtIkonDugme ikon="geri" etiket={tt("Geri")} tur="yuzey" onClick={geriGit} /> : undefined;
  return (
    <QtAfis ikon={ikon} baslik={baslik} ton={ton} bas={bas} sag={sag} className={className} {...rest}>
      {altYazi ?? children}
    </QtAfis>
  );
}
