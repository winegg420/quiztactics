// Rakip arama ekranı ADAYLARI (/tasarim-onizleme › "Rakip arama ekranı"). Sözleşme: ADAYLAR = [{ kod, baslik }]
// (kopyalama listesi için), varsayılan dışa aktarım bölüm bileşeni ({ secimler, onSec }).
//
// Oyunda HİÇBİR ŞEY değişmez: RakipAra / AramaSahnesi olduğu gibi durur. Burada iki aday + şimdiki ekran,
// sahte zamanlayıcıyla aynı akışı oynar: arama (4–6 sn) → rakip bulundu → VS (~2 sn) → maç başlıyor → döngü.
// Her sahne telefon oranlı kutuda (390×844 / 360×640); "Tam ekran aç" gerçek tam ekran katmanı açar
// (iOS kuralı: katman position:fixed, kendisinde ve atalarında transform YOK; yükseklik 100dvh).
// Ekran dışındaki sahne durur (IntersectionObserver); "Hareketi azalt"ta yavaşlar, durmaz.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QtCip, QtDugme, QtKart } from "../../index.js";
import { aktifDil } from "../../../lib/dil.js";
import { SecimDugmeleri } from "../secim.jsx";
import AdayA from "./AdayA.jsx";
import AdayB from "./AdayB.jsx";
import Simdiki from "./Simdiki.jsx";
import { useAramaDongusu, useGorunur } from "./ortak.jsx";
import "./arama-aday.css";

export const ADAYLAR = [
  { kod: "arama-a", baslik: "A — Gök Yolu (dikey iki kart)" },
  { kod: "arama-b", baslik: "B — Güneş Halkası (ortada dönen halka)" },
];

const TR = aktifDil() === "tr";
const Y = (tr, en) => (TR ? tr : en);

const SAHNELER = [
  {
    kod: "simdiki", Bilesen: Simdiki, sadeceArama: true,
    baslik: Y("Şimdiki ekran", "Current screen"),
    tarif: Y("Karşılaştırma için: oyundaki mor arama sahnesi, aynı sınıflarla. Üst yarı boş, rakip yeri soru işareti.",
      "For comparison: the purple search scene in the game, same classes. Empty top half, a question mark for the rival."),
  },
  {
    kod: "arama-a", Bilesen: AdayA,
    baslik: Y("A — Gök Yolu", "A — Sky Lane"),
    tarif: Y("Dikey iki kart: üstte sen, altta rakip. Arada dönen radar ve VS diski; rakip yuvasında avatarlar slot makinesi gibi akar, bulununca kart sağdan kayar.",
      "Two stacked cards: you on top, the rival below. A spinning radar and VS disc between; avatars roll like a slot machine in the rival slot, then the card slides in."),
  },
  {
    kod: "arama-b", Bilesen: AdayB,
    baslik: Y("B — Güneş Halkası", "B — Sun Ring"),
    tarif: Y("Ortada büyük dönen halka: içinde slot makarası, çevresinde yörüngede oyuncular. Bulununca halka kapanır, iki avatar yanlardan gelip VS olur.",
      "A big spinning ring in the middle: a slot reel inside, players orbiting around it. On a match the ring closes and both avatars slide in for the VS."),
  },
];

const BOYUTLAR = [
  { kod: "390", g: 390, y: 844 },
  { kod: "360", g: 360, y: 640 },
];

/** Telefon oranlı kutuda oynayan sahne + Tekrar oynat / Tam ekran aç. */
function SahneKutusu({ sahne, mod, dereceli, boyut, onTam }) {
  const kutu = useRef(null);
  const gorunur = useGorunur(kutu);
  const dongu = useAramaDongusu({ gorunur, sadeceArama: sahne.sadeceArama });
  const { Bilesen } = sahne;
  return (
    <>
      <div ref={kutu} className="ra-telefon" style={{ "--ra-g": boyut.g, "--ra-y": boyut.y }}
           data-sahne={sahne.kod} data-boyut={boyut.kod}>
        <Bilesen mod={mod} dereceli={dereceli} dongu={dongu} durdu={!gorunur} />
      </div>
      <div className="ra-eylem">
        <QtDugme boyut="k" tur="ikincil" ikon="yenile" onClick={dongu.yeniden}>{Y("Tekrar oynat", "Replay")}</QtDugme>
        <QtDugme boyut="k" tur="ikincil" ikon="oyna" onClick={onTam}>{Y("Tam ekran aç", "Open full screen")}</QtDugme>
      </div>
    </>
  );
}

/** Gerçek tam ekran katmanı: body'ye portal, kökte position:fixed (transform yok), 100dvh.
 *  Sahnenin kendi İptal düğmesi (bulunduktan sonra "Kapat") ve Esc kapatır. */
function TamEkran({ sahne, mod, dereceli, onKapat }) {
  const dongu = useAramaDongusu({ gorunur: true, sadeceArama: sahne.sadeceArama });
  const kapatRef = useRef(null);
  const { Bilesen } = sahne;
  useEffect(() => {
    const kok = document.documentElement;
    const onceki = kok.style.overflow;
    const kaydirma = window.scrollY;
    kok.style.overflow = "hidden";
    // Arkadaki sayfa gizlenir (display:none): altındaki önizlemeler boşuna oynamasın, kutudaki sahneler de
    // IntersectionObserver ile durur. Kapanınca kaydırma yeri geri gelir.
    kok.classList.add("ra-tam-acik");
    kapatRef.current?.focus?.();
    const tus = (e) => { if (e.key === "Escape") onKapat(); };
    window.addEventListener("keydown", tus);
    return () => {
      kok.style.overflow = onceki;
      kok.classList.remove("ra-tam-acik");
      window.scrollTo(0, kaydirma);
      requestAnimationFrame(() => window.scrollTo(0, kaydirma));   // geç oturan içerik (resimler) için bir kez daha
      window.removeEventListener("keydown", tus);
    };
  }, [onKapat]);
  return createPortal(
    <div className="ra-tam" role="dialog" aria-modal="true" aria-label={sahne.baslik}>
      <Bilesen mod={mod} dereceli={dereceli} dongu={dongu} durdu={false} onIptal={onKapat} iptalRef={kapatRef} />
    </div>,
    document.body,
  );
}

export default function AramaAdaylari({ secimler, onSec }) {
  const [mod, setMod] = useState("klasik");
  const [dereceli, setDereceli] = useState(true);
  const [boyutKod, setBoyutKod] = useState("390");
  const [tam, setTam] = useState(null);
  const boyut = BOYUTLAR.find((b) => b.kod === boyutKod) ?? BOYUTLAR[0];
  const tamSahne = SAHNELER.find((s) => s.kod === tam);

  return (
    <div className="ra-bolum">
      <header className="ra-bolum-bas">
        <h2 className="qt-baslik-2">{Y("Rakip arama ekranı", "Opponent search screen")}</h2>
        <p className="qt-govde">
          {Y("İki aday, şimdiki ekranın yanında. Hepsi aynı sahte akışı oynar: arama → rakip bulundu → VS → maç başlıyor. Oyunda bir şey değişmedi.",
            "Two candidates next to the current screen. All play the same fake flow: search → opponent found → VS → match starts. Nothing changed in the game.")}
        </p>
        <div className="ra-ayar" role="group" aria-label={Y("Önizleme ayarları", "Preview settings")}>
          <span className="ra-ayar-grup">
            <QtCip secili={mod === "klasik"} onClick={() => setMod("klasik")}>{Y("Klasik", "Classic")}</QtCip>
            <QtCip secili={mod === "duello"} onClick={() => setMod("duello")}>{Y("Düello", "Duel")}</QtCip>
          </span>
          <span className="ra-ayar-grup">
            <QtCip secili={!dereceli} onClick={() => setDereceli(false)}>{Y("Serbest", "Casual")}</QtCip>
            <QtCip secili={dereceli} onClick={() => setDereceli(true)}>{Y("Dereceli", "Ranked")}</QtCip>
          </span>
          <span className="ra-ayar-grup">
            {BOYUTLAR.map((b) => (
              <QtCip key={b.kod} secili={boyutKod === b.kod} onClick={() => setBoyutKod(b.kod)}>{`${b.g}×${b.y}`}</QtCip>
            ))}
          </span>
        </div>
      </header>

      <div className="ra-izgara">
        {SAHNELER.map((s) => (
          <QtKart key={s.kod} className={`ra-kart${s.kod === "simdiki" ? " ra-kart--simdiki" : ""}`}>
            <h3 className="qt-baslik-3">{s.baslik}</h3>
            <p className="ra-tarif">{s.tarif}</p>
            <SahneKutusu sahne={s} mod={mod} dereceli={dereceli} boyut={boyut} onTam={() => setTam(s.kod)} />
            {s.kod !== "simdiki" && <SecimDugmeleri kod={s.kod} secimler={secimler} onSec={onSec} />}
          </QtKart>
        ))}
      </div>

      {tamSahne && <TamEkran sahne={tamSahne} mod={mod} dereceli={dereceli} onKapat={() => setTam(null)} />}
    </div>
  );
}
