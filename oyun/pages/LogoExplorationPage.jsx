import { useEffect } from "react";
import LogoExploration, { LOGO_KONSEPTLERI } from "../components/LogoExploration.jsx";
import "../styles/logo-exploration.css";

export default function LogoExplorationPage() {
  useEffect(() => {
    const onceki = document.title;
    document.title = "Logo Exploration Pack | Quiz Tactics";
    return () => { document.title = onceki; };
  }, []);

  return <main className="logo-lab">
    <header className="logo-lab__hero">
      <span>QUIZ TACTICS · MARKA KEŞFİ</span>
      <h1>10 farklı logo yönü</h1>
      <p>Aynı logonun renk varyasyonları değil; karakteri, ritmi ve marka vaadi farklı on ayrı yaklaşım.</p>
    </header>

    <section className="logo-lab__grid" aria-label="Logo konseptleri">
      {LOGO_KONSEPTLERI.map((konsept, i) => <article className="logo-lab__kart" key={konsept.no}>
        <header>
          <span>{konsept.no}</span>
          <div><h2>{konsept.ad}</h2><p>{konsept.aciklama}</p></div>
        </header>

        <div className="logo-lab__ana"><LogoExploration tip={i + 1} /></div>

        <div className="logo-lab__varyantlar">
          <div className="logo-lab__ikon"><LogoExploration tip={i + 1} ikon /><small>APP ICON</small></div>
          <div className="logo-lab__zemin acik"><LogoExploration tip={i + 1} /><small>AÇIK ZEMİN</small></div>
          <div className="logo-lab__zemin koyu"><LogoExploration tip={i + 1} koyu /><small>KOYU ZEMİN</small></div>
        </div>
      </article>)}
    </section>

    <section className="logo-lab__sonuc">
      <div><span>APP ICON İÇİN GÜÇLÜ</span><b>01 Orbit Q · 03 QT Merge · 06 Q Check</b><p>Tek renk ve 32 px ölçekte kimliklerini en iyi koruyan üç işaret.</p></div>
      <div><span>FİNAL İÇİN İLK 3</span><b>01 Orbit Q · 06 Q Check · 10 Curious Route</b><p>Hatırlanabilirlik, oyun hissi ve “Ne taktiği?” merakı arasında en dengeli üç yön.</p></div>
    </section>

    <footer>Keşif çalışmasıdır · Mevcut canlı logo değiştirilmemiştir.</footer>
  </main>;
}
