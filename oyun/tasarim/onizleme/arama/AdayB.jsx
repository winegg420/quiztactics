// ADAY B — "Güneş Halkası": ortada büyük dönen halka; halkanın içinde slot makarası, çevresinde yörüngede
// dönen oyuncu avatarları. Üstte kendi küçük profilin. Bulununca yörünge söner, makara rakipte durur;
// VS anında halka kapanır, iki büyük avatar soldan/sağdan gelir ve ortaya VS çarpar.
import { BEN, BilgiKarti, IptalDugmesi, LigRozet, Makara, Radar, Rozetler, Sure, Zemin, m } from "./ortak.jsx";

export default function AdayB({ mod, dereceli, dongu, durdu, onIptal, iptalRef }) {
  const { asama, gecen, tur, yumusak } = dongu;
  const ariyor = asama === "ariyor";
  const vsGoster = asama === "vs" || asama === "basliyor";
  const baslik = ariyor ? m("ariyor") : asama === "basliyor" ? m("hazir") : m("bulundu");
  return (
    <div className={`ra ra--b ra--${asama}`} data-yumusak="" data-durdu={durdu ? "1" : undefined}
         data-yavas={yumusak ? "1" : undefined} role="group" aria-label={baslik}>
      <Zemin />
      <header className="ra-ust ra-b-ust">
        <span className="ra-b-ben">
          <span className="ra-av ra-av--kucuk"><img src={BEN.avatar} alt="" width="120" height="120" /></span>
          <span className="ra-b-ben-yazi">
            <b className="ra-ad">{BEN.ad}</b>
            <span className="ra-a-alt"><span className="ra-lv">{m("lv", { 0: BEN.level })}</span><LigRozet /></span>
          </span>
        </span>
        <Sure gecen={gecen} />
      </header>
      <div className="ra-b-rozet-satir">
        <Rozetler mod={mod} dereceli={dereceli} />
        <span className="ra-b-kat">{mod === "duello" ? m("duelloAlt") : m("karisik")}</span>
      </div>

      <main className="ra-b-sahne">
        <div className="ra-b-alan">
        <div className={`ra-b-halka${vsGoster ? " ra-b-halka--kapan" : ""}`} key={vsGoster ? `k${tur.no}` : "h"}>
          <Radar className="ra-b-radar" />
          <span className="ra-b-yorunge" aria-hidden="true">
            {tur.yorunge.map((src, i) => (
              <span key={`${tur.no}-${i}`} className="ra-b-uydu" style={{ "--i": i }}>
                <span className="ra-b-uydu-ic"><img src={src} alt="" width="120" height="120" decoding="async" /></span>
              </span>
            ))}
          </span>
          <span className="ra-av ra-av--merkez"><Makara liste={tur.makara} rakip={tur.rakip.avatar} durdu={!ariyor} /></span>
        </div>

        {vsGoster && (
          <div className="ra-b-vs" key={`vs${tur.no}`}>
            <span className="ra-b-vs-kart ra-b-vs-kart--ben">
              <span className="ra-av ra-av--vs"><img src={BEN.avatar} alt="" width="120" height="120" /></span>
              <b className="ra-ad">{BEN.ad}</b>
              <span className="ra-lv">{m("lv", { 0: BEN.level })}</span>
            </span>
            <span className="ra-vs ra-b-vs-yazi" aria-hidden="true"><span>VS</span></span>
            <span className="ra-b-vs-kart ra-b-vs-kart--rakip">
              <span className="ra-av ra-av--vs"><img src={tur.rakip.avatar} alt="" width="120" height="120" /></span>
              <b className="ra-ad">{tur.rakip.ad}</b>
              <span className="ra-lv">{m("lv", { 0: tur.rakip.level })}</span>
            </span>
          </div>
        )}
        </div>

        <div className="ra-b-durum" key={asama}>
          <h1 className="ra-b-baslik" aria-live="polite">{baslik}</h1>
          <p className="ra-b-alt">
            {ariyor ? m("seviye") : asama === "basliyor" ? m("basliyorAlt") : m("eslesti")}
          </p>
        </div>
      </main>

      <footer className="ra-alt">
        <BilgiKarti bilgi={tur.bilgi} turNo={tur.no} />
        {asama === "basliyor" ? (
          <span className="ra-baslat" key={`b${tur.no}`}><span className="ra-baslat-dolgu" /><b>{m("hazir")}</b></span>
        ) : (
          <IptalDugmesi ariyor={ariyor} onIptal={onIptal} iptalRef={iptalRef} />
        )}
      </footer>
    </div>
  );
}
