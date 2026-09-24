// ADAY A — "Gök Yolu": dikey iki kart (üstte sen, altta rakip), ortada dönen radar + VS diski.
// Rakip kartındaki avatar yuvası slot makarası gibi akar; bulununca rakip oturur, kart sağdan kayarak
// adını gösterir, VS diski çarpar, "Maç başlıyor" şeridi dolar.
import { BEN, BilgiKarti, IptalDugmesi, LigRozet, Makara, Radar, Rozetler, Sure, Zemin, m } from "./ortak.jsx";

export default function AdayA({ mod, dereceli, dongu, durdu, onIptal, iptalRef }) {
  const { asama, gecen, tur, yumusak } = dongu;
  const ariyor = asama === "ariyor";
  const baslik = ariyor ? m("ariyor") : asama === "basliyor" ? m("hazir") : m("bulundu");
  return (
    <div className={`ra ra--a ra--${asama}`} data-yumusak="" data-durdu={durdu ? "1" : undefined}
         data-yavas={yumusak ? "1" : undefined} role="group" aria-label={baslik}>
      <Zemin />
      <header className="ra-ust">
        <Rozetler mod={mod} dereceli={dereceli} />
        <Sure gecen={gecen} />
      </header>
      <p className="ra-kat">
        <span className="ra-kat-ikon" aria-hidden="true" />
        <b>{mod === "duello" ? m("duello") : m("karisik")}</b>
        <span>{mod === "duello" ? m("duelloAlt") : m("klasikAlt")}</span>
      </p>

      <main className="ra-a-govde">
        <section className="ra-a-kart ra-a-kart--ben">
          <span className="ra-av ra-av--ben"><img src={BEN.avatar} alt="" width="120" height="120" /></span>
          <span className="ra-a-kimlik">
            <b className="ra-ad">{BEN.ad}</b>
            <span className="ra-a-alt"><span className="ra-lv">{m("lv", { 0: BEN.level })}</span><LigRozet /></span>
          </span>
          <span className="ra-a-etiket">{m("sen")}</span>
        </section>

        <div className="ra-a-orta">
          <Radar className="ra-a-radar" />
          <span className="ra-vs" aria-hidden="true"><span>VS</span></span>
          <span className="ra-patla" aria-hidden="true" />
        </div>

        <section className={`ra-a-kart ra-a-kart--rakip${ariyor ? " ra-a-kart--bos" : ""}`} key={ariyor ? "bos" : `r${tur.no}`}>
          <span className="ra-av ra-av--rakip"><Makara liste={tur.makara} rakip={tur.rakip.avatar} durdu={!ariyor} /></span>
          <span className="ra-a-kimlik">
            {ariyor ? (
              <>
                <b className="ra-ad ra-ad--soluk">{m("rakipYeri")}</b>
                <span className="ra-a-alt ra-noktalar" aria-hidden="true"><i /><i /><i /></span>
              </>
            ) : (
              <>
                <b className="ra-ad">{tur.rakip.ad}</b>
                <span className="ra-a-alt"><span className="ra-lv">{m("lv", { 0: tur.rakip.level })}</span><LigRozet /></span>
              </>
            )}
          </span>
        </section>
      </main>

      <h1 className="ra-a-durum" aria-live="polite" key={asama}>{baslik}</h1>

      <footer className="ra-alt">
        <BilgiKarti bilgi={tur.bilgi} turNo={tur.no} />
        {asama === "basliyor" ? (
          <span className="ra-baslat" key={`b${tur.no}`}><span className="ra-baslat-dolgu" /><b>{m("basliyorAlt")}</b></span>
        ) : (
          <IptalDugmesi ariyor={ariyor} onIptal={onIptal} iptalRef={iptalRef} />
        )}
      </footer>
    </div>
  );
}
