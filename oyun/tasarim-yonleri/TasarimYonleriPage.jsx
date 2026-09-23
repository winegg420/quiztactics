// /tasarim-yonleri — Tasarım Adım 1: üç görsel yön, iki örnek ekran.
// Menüden bağlantı yok; yalnız adresle açılır, giriş gerektirmez.
// Sunucuya bağlanmaz, oyun mantığına dokunmaz. Bütün CSS `.ty-kok` altında.
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import "./yazitipleri.css";
import "./tasarim-yonleri.css";
import { YONLER, SERGI, KONTRAST_CIFTLERI, cssDegiskenleri } from "./yonler.js";
import { kontrastOrani } from "./kontrast.js";
import Ikon from "./ikonlar.jsx";
import { AnaEkran, MacEkrani } from "./Ekranlar.jsx";

const IKON_ORNEK = ["ev", "arkadas", "lig", "dukkan", "profil", "coin", "turnuva", "duello"];

function Sergi({ yon }) {
  const r = yon.renk;
  return (
    <div className="ty-sergi">
      <section className="ty-sergi-kutu ty-sergi-palet" aria-labelledby={`palet-${yon.kod}`}>
        <h3 id={`palet-${yon.kod}`}>Renk paleti</h3>
        <ul className="ty-renkler">
          {SERGI.map(([k, ad]) => (
            <li key={k}>
              <span className="ty-renk-ornek" style={{ background: r[k] }} />
              <span className="ty-renk-ad">{ad}</span>
              <code>{r[k]}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className="ty-sergi-kutu" aria-labelledby={`yazi-${yon.kod}`}>
        <h3 id={`yazi-${yon.kod}`}>Yazı tipleri</h3>
        <p className="ty-yazi-baslik-ornek">Bildin mi, kazandın!</p>
        <p className="ty-yazi-govde-ornek">Ğ Ü Ş İ Ö Ç — ğüşıöç · 0123456789</p>
        <p className="ty-kucuk">
          <b>{yon.yazi.baslik}</b> başlık · <b>{yon.yazi.govde}</b> gövde. {yon.yazi.not}.
        </p>
      </section>

      <section className="ty-sergi-kutu" aria-labelledby={`ikon-${yon.kod}`}>
        <h3 id={`ikon-${yon.kod}`}>İkon ve düğme</h3>
        <div className="ty-ikon-sira">
          {IKON_ORNEK.map((ad) => (
            <span key={ad} className="ty-ikon-ornek"><Ikon ad={ad} boyut={26} /></span>
          ))}
        </div>
        <p className="ty-kucuk">{yon.ikon}</p>
        <div className="ty-dugme-sira">
          <button type="button" className="ty-dugme ty-dugme-ana">
            <Ikon ad="oyna" boyut={20} /> Oyna
          </button>
          <button type="button" className="ty-dugme ty-dugme-ikinci">Arkadaşla</button>
        </div>
        <p className="ty-kucuk">{yon.dugme} Basılı tutup bırak.</p>
      </section>

      <section className="ty-sergi-kutu" aria-labelledby={`ses-${yon.kod}`}>
        <h3 id={`ses-${yon.kod}`}>Ses fikri</h3>
        <ul className="ty-ses">
          {yon.ses.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </section>

      <details className="ty-sergi-kutu ty-kontrast">
        <summary>Kontrast ölçümü (WCAG)</summary>
        <table>
          <thead>
            <tr><th scope="col">Çift</th><th scope="col">Oran</th><th scope="col">AA</th></tr>
          </thead>
          <tbody>
            {KONTRAST_CIFTLERI.map(([ad, yazi, zemin]) => {
              const o = kontrastOrani(r[yazi], r[zemin]);
              return (
                <tr key={ad}>
                  <td>
                    <span className="ty-kontrast-ornek" style={{ color: r[yazi], background: r[zemin] }}>Aa</span>
                    {ad}
                  </td>
                  <td>{o.toFixed(2)}</td>
                  <td>{o >= 4.5 ? "Geçer" : o >= 3 ? "Büyük yazı" : "Kalır"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export default function TasarimYonleriPage() {
  const [params, setParams] = useSearchParams();
  const kod = YONLER.some((y) => y.kod === params.get("yon")) ? params.get("yon") : "a";
  const yon = YONLER.find((y) => y.kod === kod);

  useEffect(() => {
    const onceki = document.title;
    document.title = "Tasarım yönleri — Quiz Tactics";
    return () => { document.title = onceki; };
  }, []);

  const sec = (k) => setParams({ yon: k }, { replace: true });

  const klavye = (e) => {
    const i = YONLER.findIndex((y) => y.kod === kod);
    let yeni = null;
    if (e.key === "ArrowRight") yeni = YONLER[(i + 1) % YONLER.length];
    if (e.key === "ArrowLeft") yeni = YONLER[(i - 1 + YONLER.length) % YONLER.length];
    if (yeni) {
      e.preventDefault();
      sec(yeni.kod);
      document.getElementById(`ty-sekme-${yeni.kod}`)?.focus();
    }
  };

  return (
    <div className={`ty-kok ty-yon-${kod}`} style={cssDegiskenleri(yon.renk)}>
      <header className="ty-sayfa-ust">
        <div className="ty-sayfa-baslik">
          <span className="ty-sayfa-marka">QUIZ TACTICS</span>
          <span className="ty-sayfa-alt">Tasarım yönleri · Adım 1</span>
        </div>
        <div className="ty-sekmeler" role="tablist" aria-label="Görsel yönler" onKeyDown={klavye}>
          {YONLER.map((y) => (
            <button
              key={y.kod}
              id={`ty-sekme-${y.kod}`}
              type="button"
              role="tab"
              aria-selected={y.kod === kod}
              aria-controls="ty-panel"
              tabIndex={y.kod === kod ? 0 : -1}
              className={`ty-sekme ${y.kod === kod ? "secili" : ""}`}
              onClick={() => sec(y.kod)}
            >
              <span className="ty-sekme-etiket">{y.etiket}</span>
              <span className="ty-sekme-ad">{y.ad}</span>
            </button>
          ))}
        </div>
      </header>

      <main id="ty-panel" role="tabpanel" aria-labelledby={`ty-sekme-${kod}`} className="ty-panel" key={kod}>
        <section className="ty-giris">
          <h1>{yon.etiket} — {yon.ad}</h1>
          <p>{yon.ozet}</p>
        </section>

        <Sergi yon={yon} />

        <section className="ty-ekran-bolum" aria-labelledby="ty-ana-baslik">
          <h2 id="ty-ana-baslik">Ana sayfa</h2>
          <div className="ty-telefon">
            <AnaEkran />
          </div>
        </section>

        <section className="ty-ekran-bolum" aria-labelledby="ty-mac-baslik">
          <h2 id="ty-mac-baslik">Maç ekranı</h2>
          <p className="ty-ekran-not">
            Şıklara ve skill'lere dokun: doğru/yanlış anı, 50:50'de iki şıkkın kırılıp düşmesi,
            Ek Süre, Soru Değiştir… Sayaç gerilimi için "Son 5 saniye".
          </p>
          <MacEkrani />
        </section>
      </main>
    </div>
  );
}
