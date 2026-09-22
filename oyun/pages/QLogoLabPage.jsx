import { useEffect } from "react";
import { QIsareti, QWordmarkOrnegi, Q_LOGO_ADAYLARI } from "../components/QLogoLab.jsx";
import "../styles/q-logo-lab.css";

export default function QLogoLabPage() {
  useEffect(() => {
    const onceki = document.title;
    document.title = "Q Logo Lab | Quiz Tactics";
    return () => { document.title = onceki; };
  }, []);

  return <main className="q-lab">
    <header className="q-lab__hero">
      <span>QUIZ TACTICS · MARKA İŞARETİ LAB</span>
      <h1>Doğru <b>Q</b>’yu buluyoruz.</h1>
      <p>Beş ayrı vektör yaklaşımı; gerçek kullanım boyutlarında, açık ve koyu zeminde sınanıyor.</p>
    </header>

    <section className="q-lab__grid" aria-label="Beş Q logo tasarımı">
      {Q_LOGO_ADAYLARI.map((aday, i) => {
        const tip = i + 1;
        return <article className="q-lab__kart" key={aday.no}>
          <header className="q-lab__kart-baslik">
            <span>{aday.no}</span>
            <div><small>{aday.tur}</small><h2>{aday.ad}</h2><p>{aday.aciklama}</p></div>
          </header>

          <div className="q-lab__ana"><QIsareti tip={tip} /></div>

          <div className="q-lab__olcekler">
            <div><QIsareti tip={tip} className="q64" /><small>64 PX</small></div>
            <div><QIsareti tip={tip} className="q32" /><small>32 PX</small></div>
            <div className="q-lab__app"><QIsareti tip={tip} /><small>APP ICON</small></div>
          </div>

          <div className="q-lab__zeminler">
            <div className="acik"><QIsareti tip={tip} /><small>AÇIK ZEMİN</small></div>
            <div className="koyu"><QIsareti tip={tip} koyu /><small>KOYU ZEMİN</small></div>
          </div>

          <div className="q-lab__wordmark">
            <QWordmarkOrnegi tip={tip} />
            <small>MEVCUT UIZ + TACTICS İÇİNDE</small>
          </div>
        </article>;
      })}
    </section>

    <footer>
      Yalnız seçim ön izlemesidir · Mevcut production logosu, app icon ve mobil header değiştirilmemiştir.
    </footer>
  </main>;
}

