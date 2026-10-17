// /ses-secim › Hazine DEVAM anı provası (17 Eki 2026, Ida telefonda dinlesin). Maçtaki DEVAM anının SES YOLU ve zamanlaması:
// ses.js sesFazDegisti → sesPencere(anın süresi) → m(60)'ta DEVAM sesi → m(DEVAM_AN_MS)'te soru sesi. Süreler sureler.js'ten,
// KasaPage › DEVAM anıyla aynı formül; ölçek en dar normal pencere (rakibin DEVAM'ı geç geldiğinde an tabanı — ölçümde en sık).
// "Eski hâl": bugüne kadarki rozet sesi aynı pencereyle (ses.js onu pencereye kısaltıp söndürür). Sunucuya hiçbir şey yazmaz.
import { useEffect, useRef, useState } from "react";
import { sesAcikMi, sesFazDegisti, sesKasaDevam, sesOnYukle, sesPencere, sesRozet, sesSoruGeldi } from "../../lib/ses.js";
import { sure, sureOlcek, varsayilanSure } from "../../lib/sureler.js";
import { QtDugme, QtKart } from "../index.js";

const DEVAM_AN_MS = varsayilanSure("kasa_devam_an");   // KasaPage › DEVAM_AN_MS ile aynı

export default function DevamProva({ ts }) {
  const [an, setAn] = useState(null);   // null · { eski, asama: "kapali" | "acik" | "soru" }
  const zaman = useRef([]);
  useEffect(() => {
    sesOnYukle(["kasa_devam", "rozet", "soru_geldi"]);
    return () => zaman.current.forEach(clearTimeout);
  }, []);
  // KasaPage: payO = max(an tabanı / DEVAM süresi, kalan pay oranı) → en dar normal hâl = taban
  const payO = Math.min(1, sure("kasa_an_taban") / sure("kasa_devam_an"));
  const olcek = payO * sureOlcek("kasa_devam_an");
  const m = (ms) => Math.round(ms * olcek);
  const kapaliMs = sure("kasa_kapali_karar");

  const oynat = (eski) => {
    zaman.current.forEach(clearTimeout);
    zaman.current = [];
    const z = (f, ms) => zaman.current.push(setTimeout(f, ms));
    sesFazDegisti("cevap");   // maçta faz gelişi (yeni soru fazı; rakibin kartı önce kapalı)
    setAn({ eski, asama: "kapali" });
    z(() => {
      setAn({ eski, asama: "acik" });
      sesPencere(m(DEVAM_AN_MS), "an:devam");   // anBaslat ile aynı: anın sesleri anın içinde biter
      z(() => (eski ? sesRozet() : sesKasaDevam()), m(60));
      z(() => { setAn({ eski, asama: "soru" }); sesSoruGeldi(); }, m(DEVAM_AN_MS));
      z(() => setAn(null), m(DEVAM_AN_MS) + 1500);
    }, kapaliMs);
  };

  return (
    <QtKart as="section" className="ss-kart ss-prova" aria-labelledby="ss-prova-baslik">
      <header className="ss-kart-metin">
        <h3 id="ss-prova-baslik" className="ss-kart-ad">{ts("Hazine DEVAM anı")}</h3>
        <p className="ss-kart-yer">
          {ts("Maçtaki gibi: rakibin kartı {k} ms kapalı, sonra ×2 yazısı ve DEVAM sesi, {a} ms sonra yeni sorunun sesi. Sunucuya hiçbir şey yazmaz.",
            { k: kapaliMs, a: m(DEVAM_AN_MS) })}
        </p>
        <p className="ss-kart-yer qt-sayi">
          {ts("Ses penceresi {p} ms · yeni ses 880 ms (tam sığar) · eski ses 1800 ms (pencereye kısaltılıp söndürülür)", { p: m(DEVAM_AN_MS) - m(60) - 40 })}
        </p>
        {!sesAcikMi() && <p className="ss-uyari">{ts("Efektler kapalı — duymak için Ayarlar › Efektler'i aç.")}</p>}
      </header>
      <div className="ss-prova-sahne" aria-live="polite">
        {an?.asama === "kapali" && <span className="ss-prova-kart">{ts("Rakip karar veriyor…")}</span>}
        {an?.asama === "acik" && <span className="ss-prova-kart ss-prova-kart--acik">{ts("Rakip devam etti")} <b className="ss-prova-carpan">×2</b></span>}
        {an?.asama === "soru" && <span className="ss-prova-kart">{ts("Yeni soru")}</span>}
        {!an && <span className="ss-prova-bos">{ts("Düğmeye bas, dinle")}</span>}
      </div>
      <div className="ss-prova-dugmeler">
        <QtDugme tur="birincil" ikon="oyna" onClick={() => oynat(false)}>{ts("Hazine DEVAM anı")}</QtDugme>
        <QtDugme tur="ikincil" ikon="oyna" onClick={() => oynat(true)}>{ts("Eski hâl")}</QtDugme>
      </div>
    </QtKart>
  );
}
