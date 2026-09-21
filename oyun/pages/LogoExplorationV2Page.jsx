import { useEffect } from "react";
import LogoWordmarkV2, { WORDMARK_V2_KONSEPTLER } from "../components/LogoWordmarkV2.jsx";
import "../styles/logo-exploration-v2.css";

export default function LogoExplorationV2Page() {
  useEffect(() => {
    const onceki = document.title;
    document.title = "Custom Wordmark V2 | Quiz Tactics";
    return () => { document.title = onceki; };
  }, []);

  return <main className="wordmark-lab">
    <header className="wordmark-lab__hero">
      <span>LOGO EXPLORATION · ROUND 02</span>
      <h1>Custom Wordmark System</h1>
      <p>İkon eklenmiş hazır yazılar değil. Özel çizilmiş Q, özel harf ritmi ve TACTICS vurgusu üzerine on yeni marka yönü.</p>
    </header>

    <section className="wordmark-lab__grid" aria-label="On custom wordmark konsepti">
      {WORDMARK_V2_KONSEPTLER.map((konsept, i) => <article className="wordmark-lab__kart" key={konsept.no}>
        <header><span>{konsept.no}</span><div><h2>{konsept.ad}</h2><p>{konsept.aciklama}</p></div></header>
        <div className="wordmark-lab__ana"><LogoWordmarkV2 tip={i + 1} /></div>
        <div className="wordmark-lab__varyantlar">
          <div className="wordmark-lab__ikon"><LogoWordmarkV2 tip={i + 1} ikon /><small>ÖZEL Q · APP ICON</small></div>
          <div className="wordmark-lab__zemin acik"><LogoWordmarkV2 tip={i + 1} /><small>AÇIK ZEMİN</small></div>
          <div className="wordmark-lab__zemin koyu"><LogoWordmarkV2 tip={i + 1} koyu /><small>KOYU ZEMİN</small></div>
        </div>
      </article>)}
    </section>

    <section className="wordmark-lab__not">
      <div><span>APP ICON ODAKLI</span><b>01 Vector Cut · 09 Pocket Q · 10 Tactical Signature</b></div>
      <div><span>WORDMARK ODAKLI</span><b>03 Competitive Slice · 05 Tactics First · 10 Tactical Signature</b></div>
    </section>
    <footer>Yalnızca marka yönü keşfidir · Production logosu değiştirilmemiştir.</footer>
  </main>;
}
