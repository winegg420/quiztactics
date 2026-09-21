import { useEffect } from "react";
import LogoWordmarkV5, { LOGO_V5_ADAYLAR } from "../components/LogoWordmarkV5.jsx";
import "../styles/logo-exploration-v5.css";

export default function LogoExplorationV5Page() {
  useEffect(() => {
    const onceki = document.title;
    document.title = "Logo Finalists V5 | Quiz Tactics";
    return () => { document.title = onceki; };
  }, []);

  return <main className="logo-v5">
    <header className="logo-v5__hero">
      <span>FINAL REFINEMENT · V5</span>
      <h1>Altı güçlü aday.</h1>
      <p>18 Super Quiz temeli; 08’in enerjisi ve 05’in okunaklılığıyla sadeleştirildi. Yeni keşif değil, final seçimi.</p>
    </header>

    <section className="logo-v5__grid" aria-label="Altı final logo adayı">
      {LOGO_V5_ADAYLAR.map((aday, i) => <article className="logo-v5__kart" key={aday.no}>
        <header><span>{aday.no}</span><div><small>{aday.eksen}</small><h2>{aday.ad}</h2><p>{aday.aciklama}</p></div></header>
        <div className="logo-v5__buyuk"><LogoWordmarkV5 tip={i + 1}/></div>
        <div className="logo-v5__varyantlar">
          <div className="logo-v5__ikon"><LogoWordmarkV5 tip={i + 1} ikon/><small>APP ICON</small></div>
          <div className="logo-v5__zemin acik"><LogoWordmarkV5 tip={i + 1}/><small>AÇIK</small></div>
          <div className="logo-v5__zemin koyu"><LogoWordmarkV5 tip={i + 1} koyu/><small>KOYU</small></div>
        </div>
      </article>)}
    </section>

    <section className="logo-v5__finalistler">
      <span>ÖNERİLEN İLK 2 FİNALİST</span>
      <div><b><i>02</i> Bold Balance</b><b><i>06</i> Final Hybrid</b></div>
      <p>02 en güvenli ve çok yönlü marka çözümü. 06 ise splash ve kampanya görsellerinde en güçlü oyun başlığı.</p>
    </section>
    <footer>Preview çalışmasıdır · Production logosu, header, metadata ve app icon değiştirilmemiştir.</footer>
  </main>;
}
