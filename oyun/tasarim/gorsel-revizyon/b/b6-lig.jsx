// Bölüm 6 — Lig çerçeveleri: 2 TAM SET (Bronz → Gümüş → Altın → Elmas → Efsane).
// Set A: onaylı WebGL'li Altın Lig'in dilinden (Altın = oyundaki Altın Lig'in kendisi). Set B: farklı yorum.
import { useState } from "react";
import Avatar from "../../../../src/components/Avatar.jsx";
import Cerceve2 from "../../premium/tur2/Cerceve2.jsx";
import { LigAmblemi } from "../../premium/ligAmblemi.jsx";
import { GrBolum, GrAday } from "../secim.jsx";
import GrCerceve from "./GrCerceve.jsx";
import { LIG_A, LIG_A_EFEKT } from "./cizim/ligSetA.js";
import { LIG_B, LIG_B_EFEKT } from "./cizim/ligSetB.js";
import { LIG_C, LIG_D } from "./cizim/ligIc.js";
import { profil, LIG_SIRA, LIG_AD, Sahne, Boy, Cipler, Alt, useIc } from "./ortak.jsx";
import "../../../pages/lig-a.css";

/** Set tanımı → tek çerçeve çizen bileşen. */
function setCerceve(uretici, efektler, ad, altinGercek = false) {
  return function SetCerceve({ lig, boyut, hareketli = false, i = 0 }) {
    const p = profil(i);
    if (altinGercek && lig === "altin") {
      return <Cerceve2 tur="altinlig" boyut={boyut} hareketli={hareketli} etiket={`${ad} · Altın Lig`}><Avatar profile={p} boyut={boyut} /></Cerceve2>;
    }
    return (
      <GrCerceve cizim={(k) => uretici[lig](k)} anahtar={`${ad}:${lig}`} efekt={efektler?.[lig] ?? null} boyut={boyut} hareketli={hareketli}
                 etiket={`${LIG_AD[lig]} Lig çerçevesi`}>
        <Avatar profile={p} boyut={boyut} />
      </GrCerceve>
    );
  };
}
const SetA = setCerceve(LIG_A, LIG_A_EFEKT, "ligA", true);
const SetB = setCerceve(LIG_B, LIG_B_EFEKT, "ligB");
const SetC = setCerceve(LIG_C, null, "ligC");
const SetD = setCerceve(LIG_D, null, "ligD");

/** Lig tablosu satırı (gerçek lg- sınıfları, 40 px). */
export function LigTablosu({ Cerceve, satirlar }) {
  return (
    <div className="qt-liste lg-liste grb-lig" role="list">
      {satirlar.map(({ lig, ad, sira, puan, i, ben }) => (
        <div key={sira} role="listitem" className={`qt-satir-kap lg-satir-kap${ben ? " qt-satir-kap--vurgulu lg-ben" : ""}`}>
          <div className="lg-satir">
            <div className="lg-satir-ac">
              <span className="lg-sira qt-sayi">{sira}</span>
              <Cerceve lig={lig} boyut={40} i={i} />
              <span className="lg-bilgi">
                <span className="lg-ad"><span className="lg-ad-metin">{ad} <LigAmblemi lig={lig} boyut={16} /></span></span>
                <span className="lg-detay">{LIG_AD[lig]} Lig · Lv {40 - sira}</span>
              </span>
              <span className="lg-puan"><span className="qt-sayi">{puan.toLocaleString("tr-TR")}</span><span className="lg-puan-birim">puan</span></span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
const SATIRLAR = [
  { lig: "efsane", ad: "Elif", sira: 1, puan: 3120, i: 2 },
  { lig: "elmas", ad: "Kaan", sira: 2, puan: 2480, i: 5 },
  { lig: "altin", ad: "Deniz", sira: 3, puan: 1790, i: 0, ben: true },
  { lig: "gumus", ad: "Zeynep", sira: 4, puan: 1210, i: 4 },
  { lig: "bronz", ad: "Mert", sira: 5, puan: 640, i: 3 },
];

/** Bir setin bütün gösterimi: vitrin (hareketli), set yan yana, A9 boyları, lig tablosu, siluet + gri. */
export function SetGoster({ Cerceve, varsayilan = "efsane", ic = false }) {
  const [lig, setLig] = useState(varsayilan);
  return (
    <div className="grb-kart-yer">
      <Sahne className="grb-sahne--vitrin">
        <Cerceve lig={lig} boyut={132} hareketli i={0} />
      </Sahne>
      <Cipler liste={LIG_SIRA} ad={LIG_AD} secili={lig} onSec={setLig} etiket="Vitrindeki lig" />
      <Alt baslik="Set yan yana — 76 px (maç sonu), durağan">
        <Sahne className="grb-sahne--sikisik">
          {LIG_SIRA.map((l, j) => <Boy key={l} etiket={LIG_AD[l]}><Cerceve lig={l} boyut={76} i={j} /></Boy>)}
        </Sahne>
      </Alt>
      {!ic && (
        <>
          <Alt baslik="Gerçek boylar — 88 profil · 64 ana sayfa · 48 maç şeridi · 40 lig tablosu">
            <div className="grb-izgara grb-izgara--koyu" style={{ "--grb-sutun": 5 }}>
              {[88, 64, 48, 40].map((b) => [
                <span key={`e${b}`} className="grb-izgara-e">{b}</span>,
                ...LIG_SIRA.map((l, j) => <Cerceve key={`${l}${b}`} lig={l} boyut={b} i={j} />),
              ])}
            </div>
          </Alt>
          <Alt baslik="Lig tablosu satırı — 40 px, durağan">
            <LigTablosu Cerceve={Cerceve} satirlar={SATIRLAR} />
          </Alt>
          <Alt baslik="Siluet ve gri ton — 48 px">
            <Sahne koyu={false} className="grb-sahne--sikisik grb-siluet">
              {LIG_SIRA.map((l, j) => <Cerceve key={l} lig={l} boyut={48} i={j} />)}
            </Sahne>
            <Sahne className="grb-sahne--sikisik grb-gri">
              {LIG_SIRA.map((l, j) => <Cerceve key={l} lig={l} boyut={48} i={j} />)}
            </Sahne>
          </Alt>
        </>
      )}
    </div>
  );
}

export default function B6Lig() {
  const ic = useIc();
  return (
    <GrBolum no={6} baslik="Lig çerçeveleri" tur="sec"
             aciklama="İki tam set. Ligler renkle değil ŞEKİL ve SÜSLE ayrışır; siluet daireyi taşar. Bronz ve Gümüş durağan (Gümüş'te yalnız yansıma), Altın–Elmas–Efsane hareketli. Vitrinde bir lig seçip büyük boyda hareketini gör; listelerde (40 px) her şey durağan."
             ic={4} gosterilen={2}
             elenen="C Yıldız Madalyon (uç sayısı 1→5 artan halka: 40 px'te Gümüş/Altın ayrışmadı, clip-art yıldız hissi) · D Arma Kalkanı (avatarın arkasında kalkan: A4'teki 'antivirüs kalkanı' çağrışımı, üst ligler Ejderha/Kraliyet yanında sönük)"
             zayif="40 px'te (lig tablosu) kademeyi renk + küçük tepelik (taş, taç, kristal, boynuz) taşıyor; siluet testinde Bronz ile Gümüş birbirine yakın. Set A'nın Altın'ı oyundaki Altın Lig olduğu için A setinde bantlı (degradeli) metal dili korunuyor; Set B tamamen düz hücre gölgeli.">
      <GrAday kod="set-a" baslik="Set A — Defne ve Taç (Altın Lig ailesi)" genis
              fikir="Onaylı Altın Lig'in yapı taşları: bantlı metal halka, oyma, boncuk kenar, defne dalı, plaka. Bronz kısa dal + düz plaka · Gümüş yarım dal + tepe taşı + kurdele · Altın oyundaki Altın Lig · Elmas kristal yapraklar + beş kristalli taç + yan kristaller · Efsane açık kanatlar + büyük taç + arkada yanan mor alev."
              testler={{ siluet: true, kucuk: true, gri: true, set: true, avatar: true, hedef: true, mobil: true }}>
        <SetGoster Cerceve={SetA} />
      </GrAday>
      <GrAday kod="set-b" baslik="Set B — Yükselen Kanat" genis
              fikir="Farklı yorum: düz hücre gölgeli (degradesiz) halka, kademe kanatla büyür. Bronz perçinli halka + küçük kalkan kulak · Gümüş üç tüylü kanat · Altın beş tüylü kanat + yıldız tepelik · Elmas kristal kanat + taş tepelik · Efsane alev uçlu altı tüylü kanat + boynuzlu taç + arkada alev."
              testler={{ siluet: true, kucuk: true, gri: true, set: true, avatar: true, hedef: true, mobil: true }}>
        <SetGoster Cerceve={SetB} />
      </GrAday>
      {ic && (
        <>
          <GrAday kod="ic-c" baslik="(iç) Set C — Yıldız Madalyon" genis><SetGoster Cerceve={SetC} ic /></GrAday>
          <GrAday kod="ic-d" baslik="(iç) Set D — Arma Kalkanı" genis><SetGoster Cerceve={SetD} ic /></GrAday>
        </>
      )}
    </GrBolum>
  );
}
