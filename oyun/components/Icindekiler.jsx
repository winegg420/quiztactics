// Paket 42 R.2 — uzun metin sayfaları (Gizlilik, Koşullar) için içindekiler.
// Bulunduğu kabın doğrudan <h2> başlıklarını okur, her birine kimlik verir
// ve başlığa kaydıran bağlantılar çizer. Metin sayfalarında başlık listesi
// elle ikinci kez yazılmasın diye kaynak başlıkların kendisidir.
import { useLayoutEffect, useRef, useState } from "react";
import { tt } from "../lib/dil.js";

export default function Icindekiler() {
  const ref = useRef(null);
  const [basliklar, setBasliklar] = useState([]);

  useLayoutEffect(() => {
    const kap = ref.current?.parentElement;
    if (!kap) return;
    const h2ler = [...kap.children].filter((e) => e.tagName === "H2");
    h2ler.forEach((e, i) => { if (!e.id) e.id = `bolum-${i + 1}`; });
    setBasliklar(h2ler.map((e) => ({ id: e.id, ad: e.textContent })));
  }, []);

  const git = (e, id) => {
    e.preventDefault();
    const hedef = document.getElementById(id);
    if (!hedef) return;
    const azalt = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    hedef.scrollIntoView({ behavior: azalt ? "auto" : "smooth", block: "start" });
    try { window.history.replaceState(window.history.state, "", `#${id}`); } catch { /* önemli değil */ }
  };

  return (
    <nav ref={ref} className="g-icindekiler" aria-label={tt("İçindekiler")}>
      {basliklar.length > 0 && (
        // D-228: kapalı başlar — telefonda ilk ekranı liste değil asıl metin ("Kısaca") doldursun
        <details className="g-icindekiler-kap">
          <summary className="qt-baslik-3 g-icindekiler-baslik">{tt("İçindekiler")}</summary>
          <ol className="g-icindekiler-liste">
            {basliklar.map((b) => (
              <li key={b.id}><a href={`#${b.id}`} onClick={(e) => git(e, b.id)}>{b.ad}</a></li>
            ))}
          </ol>
        </details>
      )}
    </nav>
  );
}
