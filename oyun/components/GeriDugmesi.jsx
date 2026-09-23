// Paket 41 M.9 — sayfanın üstünde "geldiği yere" dönen geri düğmesi (yasal sayfalar).
// Geçmiş yoksa (bağlantı yeni sekmede açıldıysa) ana sayfaya gider.
import { useNavigate } from "react-router-dom";
import { QtDugme } from "../tasarim/index.js";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";

export default function GeriDugmesi() {
  const navigate = useNavigate();
  const geri = () => {
    // Aynı siteden gelindiyse (uygulama içi gezinme ya da giriş sayfasındaki bağlantı) oraya dön;
    // dışarıdan / yeni sekmede açıldıysa ana sayfaya git.
    let icerden = false;
    try {
      icerden = window.history.state?.idx > 0
        || (document.referrer && new URL(document.referrer).origin === window.location.origin);
    } catch { icerden = false; }
    if (icerden) window.history.back();
    else navigate(y(), { replace: true });
  };
  return (
    // Yön A: QtDugme (ikincil, 44 px). `bd-geri-dugmesi` EK sınıfı: yasal sayfalar konumlandırıyor.
    <QtDugme tur="ikincil" boyut="k" ikon="geri" className="bd-geri-dugmesi" onClick={geri}>
      {tt("Geri")}
    </QtDugme>
  );
}
