import { useEffect } from "react";
import LogoFinalistVNext, { LOGO_VNEXT_ADAYLAR } from "../components/LogoFinalistsVNext.jsx";
import "../styles/logo-finalists-vnext.css";

export default function LogoFinalistsVNextPage() {
  useEffect(() => {
    const onceki = document.title;
    document.title = "Logo Finalists vNext | Quiz Tactics";
    return () => { document.title = onceki; };
  }, []);

  return <main className="logo-vnext">
    <header className="logo-vnext__hero">
      <span>QUIZ TACTICS · FINALIST FAMILY</span>
      <h1><i>Q</i> + <b>TACTICS</b></h1>
      <p>Q markanın kahramanı. UIZ okunur ama destekleyici. TACTICS ise ana oyun vaadi kadar güçlü.</p>
    </header>

    <section className="logo-vnext__grid" aria-label="Sekiz yeni logo finalisti">
      {LOGO_VNEXT_ADAYLAR.map((aday, i) => <article className={`logo-vnext__kart ${aday.duzen === "arena" ? "arena" : ""}`} key={aday.no}>
        <header><span>{aday.no}</span><div><small>{aday.tur}</small><h2>{aday.ad}</h2><p>{aday.aciklama}</p></div></header>
        <div className="logo-vnext__ana"><LogoFinalistVNext tip={i + 1} koyu={aday.duzen === "arena"}/></div>
        <div className="logo-vnext__testler">
          <div className="logo-vnext__ikon"><LogoFinalistVNext tip={i + 1} ikon/><small>APP ICON</small></div>
          <div className="logo-vnext__zemin acik"><LogoFinalistVNext tip={i + 1}/><small>AÇIK ZEMİN</small></div>
          <div className="logo-vnext__zemin koyu"><LogoFinalistVNext tip={i + 1} koyu/><small>KOYU ZEMİN</small></div>
        </div>
        <div className="logo-vnext__kucuk"><LogoFinalistVNext tip={i + 1}/><span>MAĞAZA / HEADER TESTİ</span></div>
      </article>)}
    </section>

    <section className="logo-vnext__sonuc">
      <span>EN GÜÇLÜ 3 ADAY</span>
      <div className="logo-vnext__uc">
        <article><b>01 Hero Q</b><small>App icon odaklı</small></article>
        <article><b>04 Tactics Stack</b><small>Wordmark odaklı</small></article>
        <article><b>08 Master Balance</b><small>En dengeli finalist</small></article>
      </div>
      <p>Önerim: ana marka için 08, uygulama ikonu için 01’in Q formu.</p>
    </section>
    <footer>Preview çalışmasıdır · Production logosu ve mevcut marka uygulamaları değiştirilmemiştir.</footer>
  </main>;
}
