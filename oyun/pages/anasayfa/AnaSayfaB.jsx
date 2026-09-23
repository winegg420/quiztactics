// Ana sayfa seçeneği B — BÖLÜMLÜ KAYDIRMALI. Üstte oyuncu vitrini, altında yatay
// kaydırmalı mod kartları, sonra etkinlik şeridi (davetler, turnuva, görevler, lig).
// Masaüstü: solda yapışkan oyuncu paneli, sağda geniş mod ızgarası + iki sütunlu akış.
import { QtIkon } from "../../tasarim/index.js";
import { tt } from "../../lib/dil.js";
import { LIG_ADLARI } from "../../lib/lig.js";
import { useAnaSayfaVerisi, useOyunBaslat } from "./veri.jsx";
import {
  OyuncuAvatari, XpSatiri, LigCipi, CoinCipi, RutbeCipi, SeriCipi, modListesi, etkinlikler,
  EtkinlikSatiri, TurnuvaKarti, GorevListesi, Susleme,
} from "./parcalar.jsx";
import "./anasayfa.css";

export default function AnaSayfaB() {
  const v = useAnaSayfaVerisi();
  const b = useOyunBaslat();
  if (!v.profile) return <div className="as-yukleniyor" aria-busy="true" />;
  const olaylar = etkinlikler(v);
  // Yatay şeritte iki ana mod önde, diğerleri arkasında — hepsi aynı kart dili.
  const kartlar = [
    { anahtar: "klasik", ad: tt("Klasik"), ikon: "klasik", alt: tt("20 soru · canlı rakip"), git: b.oyna, buyuk: true },
    { anahtar: "duello", ad: tt("Düello"), ikon: "duello", alt: tt("3 can · aynı soru, aynı anda"), git: () => b.git("/duello"), buyuk: true },
    ...modListesi(v, b),
  ];
  const lig = v.lig?.lig ?? "bronz";

  return (
    <div className="as-sayfa as-b">
      <h1 className="qt-gizli">{tt("Ana sayfa")}</h1>
      {b.katmanlar}

      <section className="as-b-vitrin" aria-label={tt("Oyuncu")}>
        <Susleme tur="vitrin" />
        <div className="as-b-vitrin-kimlik">
          <OyuncuAvatari v={v} boyut={120} />
          <div className="as-b-vitrin-metin">
            <p className="as-b-ad">{v.oyuncu.ad}</p>
            <div className="as-b-ciplar"><RutbeCipi v={v} /><SeriCipi /></div>
            <XpSatiri v={v} />
          </div>
        </div>
        <div className="as-b-istatistik">
          <LigCipi v={v} />
          <CoinCipi v={v} />
        </div>
      </section>

      <div className="as-b-govde">
        <section className="as-b-modlar" aria-label={tt("Modlar")}>
          <h2 className="as-bolum-baslik">{tt("Oyna")}</h2>
          <div className="as-b-serit" role="list">
            {kartlar.map((k) => (
              <button key={k.anahtar} type="button" role="listitem" onClick={k.git}
                      className={`as-b-kart as-renk--${k.anahtar} ${k.buyuk ? "as-b-kart--buyuk" : ""}`}>
                <span className="as-b-kart-desen" aria-hidden="true" />
                <span className="as-b-kart-ikon"><QtIkon ad={k.ikon} boyut={k.buyuk ? 44 : 32} /></span>
                <span className="as-b-kart-metin"><b>{k.ad}</b><small>{k.alt}</small></span>
                {k.rozet && <span className="as-rozet-nokta">{k.rozet}</span>}
                <span className="as-b-kart-ok" aria-hidden="true"><QtIkon ad="oyna" boyut={18} /></span>
              </button>
            ))}
          </div>
        </section>

        <section className="as-b-akis" aria-label={tt("Etkinlikler")}>
          <h2 className="as-bolum-baslik">{tt("Bugün")}</h2>
          <div className="as-b-akis-izgara">
            {olaylar.length > 0 && (
              <div className="as-panel as-panel--genis">
                <h3 className="as-panel-baslik"><QtIkon ad="zil" boyut={20} />{tt("Seni bekleyenler")}</h3>
                {olaylar.slice(0, 4).map((e) => <EtkinlikSatiri key={e.id} e={e} />)}
              </div>
            )}
            <TurnuvaKarti v={v} />
            <div className="as-panel">
              <h3 className="as-panel-baslik"><QtIkon ad="hediye" boyut={20} />{tt("Günlük görevler")}</h3>
              <GorevListesi v={v} sinir={4} />
            </div>
            <a href="/siralama" className={`as-b-lig as-lig-kart--${lig}`} onClick={(e) => { e.preventDefault(); b.git("/siralama"); }}>
              <span className="as-b-lig-kalkan" aria-hidden="true"><QtIkon ad="kalkan" boyut={40} /></span>
              <span className="as-b-lig-metin">
                <small>{tt("Bu haftaki lig")}</small>
                <b>{LIG_ADLARI[lig] ?? lig}</b>
                <span>{v.lig?.sira ? tt("Grupta {n}. sıradasın", { n: v.lig.sira }) : tt("Maç oyna, sıralamaya gir")}</span>
              </span>
              <QtIkon ad="ileri" boyut={22} />
            </a>
          </div>
          {v.mesaj && <p className="as-hata" role="alert">{v.mesaj}</p>}
        </section>
      </div>
    </div>
  );
}
