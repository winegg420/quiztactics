import { useEffect } from "react";
import LogoWordmarkV4, { LOGO_V4_KONSEPTLER } from "../components/LogoWordmarkV4.jsx";
import "../styles/logo-exploration-v4.css";

export default function LogoExplorationV4Page() {
  useEffect(() => {
    const onceki = document.title;
    document.title = "Logo Exploration V4 | Quiz Tactics";
    return () => { document.title = onceki; };
  }, []);

  return <main className="logo-v4">
    <header className="logo-v4__hero">
      <span>LOGO EXPLORATION · ROUND 04</span>
      <h1>Artık bir oyun gibi.</h1>
      <p>Tek parça <b>QUIZ TACTICS</b> title-logo sistemi. Ayrı ikon tekrarı yok; özel Q doğrudan QUIZ kelimesinin içinde.</p>
      <div><i>20</i> radikal yön <em>·</em> kalın siluet <em>·</em> mobil mağaza okunurluğu</div>
    </header>

    <section className="logo-v4__grid" aria-label="Yirmi oyun logosu konsepti">
      {LOGO_V4_KONSEPTLER.map((konsept, i) => <article className={`logo-v4__kart logo-v4__kart--${konsept.aile}`} key={konsept.no}>
        <header><span>{konsept.no}</span><div><h2>{konsept.ad}</h2><p>{konsept.aciklama}</p></div></header>
        <div className="logo-v4__sahne"><LogoWordmarkV4 tip={i + 1}/></div>
        <div className="logo-v4__testler">
          <div className="logo-v4__ikon"><LogoWordmarkV4 tip={i + 1} ikon/><small>APP ICON</small></div>
          <div className="logo-v4__mini logo-v4__mini--acik"><LogoWordmarkV4 tip={i + 1}/><small>AÇIK ZEMİN</small></div>
          <div className="logo-v4__mini logo-v4__mini--koyu"><LogoWordmarkV4 tip={i + 1} koyu/><small>KOYU ZEMİN</small></div>
        </div>
        <div className="logo-v4__header-mock"><LogoWordmarkV4 tip={i + 1}/><span>OYNA</span></div>
      </article>)}
    </section>

    <section className="logo-v4__final">
      <span>İLK TUR FİNALİSTLERİ</span>
      <div><b>01 Quiz Rush</b><b>10 Hot Streak</b><b>20 Signature Play</b></div>
      <p>01 en okunaklı hareket yönü · 10 en sıcak mobil oyun yönü · 20 en özgün ana marka sistemi</p>
    </section>
    <footer>Yalnızca logo keşfidir · Production logosu ve mevcut marka dosyaları değiştirilmemiştir.</footer>
  </main>;
}
