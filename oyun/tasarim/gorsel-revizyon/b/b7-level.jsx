// Bölüm 7 — Level çerçeveleri: 2 tam set (Lv25 · 50 · 75 · 100). Kalın, köşeli, faset gövde + büyük rakam plakası;
// lig çerçevelerinin yuvarlak halka + süs dilinden ayrı (yan yana karşılaştırma bölümün içinde).
import { useState } from "react";
import Avatar from "../../../../src/components/Avatar.jsx";
import Cerceve2 from "../../premium/tur2/Cerceve2.jsx";
import { GrBolum, GrAday } from "../secim.jsx";
import GrCerceve from "./GrCerceve.jsx";
import { LEVEL_SIRA, LEVEL_A, LEVEL_B, LEVEL_C, LEVEL_D, LEVEL_EFEKT } from "./cizim/level.js";
import { LIG_B } from "./cizim/ligSetB.js";
import { profil, Sahne, Boy, Cipler, Alt, useIc } from "./ortak.jsx";

const AD = { 25: "Lv 25", 50: "Lv 50", 75: "Lv 75", 100: "Lv 100" };

function setCerceve(set, uretici) {
  return function LevelCerceve({ lv, boyut, hareketli = false, i = 0 }) {
    return (
      <GrCerceve cizim={(k) => uretici[lv](k)} anahtar={`lv${set}:${lv}`} efekt={LEVEL_EFEKT[set]?.[lv] ?? null} boyut={boyut}
                 hareketli={hareketli} etiket={`Level ${lv} çerçevesi`}>
        <Avatar profile={profil(i)} boyut={boyut} />
      </GrCerceve>
    );
  };
}
const SetA = setCerceve("A", LEVEL_A);
const SetB = setCerceve("B", LEVEL_B);
const SetC = setCerceve("C", LEVEL_C);
const SetD = setCerceve("D", LEVEL_D);

function LevelSetGoster({ Cerceve, ic = false }) {
  const [lv, setLv] = useState("100");
  return (
    <div className="grb-kart-yer">
      <Sahne className="grb-sahne--vitrin"><Cerceve lv={lv} boyut={132} hareketli i={1} /></Sahne>
      <Cipler liste={LEVEL_SIRA} ad={AD} secili={lv} onSec={setLv} etiket="Vitrindeki level" />
      <Alt baslik="Set yan yana — 76 px, durağan">
        <Sahne className="grb-sahne--sikisik">
          {LEVEL_SIRA.map((l, j) => <Boy key={l} etiket={AD[l]}><Cerceve lv={l} boyut={76} i={j + 1} /></Boy>)}
        </Sahne>
      </Alt>
      {!ic && (
        <>
          <Alt baslik="Gerçek boylar — 88 · 64 · 48 · 40">
            <div className="grb-izgara grb-izgara--koyu" style={{ "--grb-sutun": 4 }}>
              {[88, 64, 48, 40].map((b) => [
                <span key={`e${b}`} className="grb-izgara-e">{b}</span>,
                ...LEVEL_SIRA.map((l, j) => <Cerceve key={`${l}${b}`} lv={l} boyut={b} i={j + 1} />),
              ])}
            </div>
          </Alt>
          <Alt baslik="Lig çerçevesiyle karışıyor mu? — solda level, sağda lig (64 px)">
            <Sahne className="grb-sahne--sikisik">
              <Boy etiket="Lv 75"><Cerceve lv="75" boyut={64} i={2} /></Boy>
              <Boy etiket="Altın Lig"><Cerceve2 tur="altinlig" boyut={64}><Avatar profile={profil(2)} boyut={64} /></Cerceve2></Boy>
              <Boy etiket="Lv 100"><Cerceve lv="100" boyut={64} i={3} /></Boy>
              <Boy etiket="Elmas Lig (Set B)">
                <GrCerceve cizim={(k) => LIG_B.elmas(k)} anahtar="ligB:elmas" boyut={64}><Avatar profile={profil(3)} boyut={64} /></GrCerceve>
              </Boy>
            </Sahne>
          </Alt>
          <Alt baslik="Siluet ve gri ton — 48 px">
            <Sahne koyu={false} className="grb-sahne--sikisik grb-siluet">{LEVEL_SIRA.map((l, j) => <Cerceve key={l} lv={l} boyut={48} i={j} />)}</Sahne>
            <Sahne className="grb-sahne--sikisik grb-gri">{LEVEL_SIRA.map((l, j) => <Cerceve key={l} lv={l} boyut={48} i={j} />)}</Sahne>
          </Alt>
        </>
      )}
    </div>
  );
}

export default function B7Level() {
  const ic = useIc();
  return (
    <GrBolum no={7} baslik="Level çerçeveleri" tur="sec"
             aciklama="İki tam set (Lv25 → Lv100). Lig çerçeveleri yuvarlak halka + süs; level çerçeveleri KÖŞELİ ve KALIN faset gövde + büyük rakam plakası, renkleri de metal değil (turkuaz → safir → mor → kızıl + altın). Lv25–50 durağan, Lv75 yansır, Lv100 arkasında dönen hüzme ve parıltı."
             ic={4} gosterilen={2}
             elenen="C Dişli (12 dişli halka: ayarlar/çark simgesi gibi okundu, 40 px'te tırtıklı daireye döndü) · D Tırtıklı Mühür (rozet mührü gibi: Bölüm 10 rozetleriyle ve 'onay mührü' ikonuyla karıştı)"
             zayif="Rakam plakası 48 px ve altında çizilmiyor (okunmuyor). 48 px ve altında Lv25/50/75 silueti aynı (siluet testinden yalnız Lv100 geçiyor); orada kademeyi renk, perçin, yıldız ve altın bilezik taşıyor. Altıgen Lv100'ün uçları 40 px'te kutudan ~2 px taşıyor.">
      <GrAday kod="set-a" baslik="Set A — Altıgen Madalya" genis
              fikir="Pahlı altıgen gövde (her yüz tek ton). Lv25 yalın · Lv50 köşe perçinleri · Lv75 yan bıçaklar + tepe yıldızı · Lv100 kızıl gövde, altın bilezik, köşelerden altın ışın uçları, üç yıldız."
              testler={{ siluet: "88–64 px'te geçti; 48 px'te yalnız Lv100 ayrışıyor", kucuk: true, gri: true, set: true, avatar: true, hedef: true, mobil: true }}>
        <LevelSetGoster Cerceve={SetA} />
      </GrAday>
      <GrAday kod="set-b" baslik="Set B — Pahlı Kare" genis
              fikir="Köşeleri pahlı kalın kare. Lv25 yalın · Lv50 köşe perçinleri · Lv75 köşe taşları + çift şevron tepelik · Lv100 arkasında 45° dönük altın kare (sekiz köşeli yıldız siluet), altın bilezik."
              testler={{ siluet: "88–64 px'te geçti; 48 px'te yalnız Lv100 ayrışıyor", kucuk: true, gri: true, set: true, avatar: true, hedef: true, mobil: true }}>
        <LevelSetGoster Cerceve={SetB} />
      </GrAday>
      {ic && (
        <>
          <GrAday kod="ic-c" baslik="(iç) C — Dişli" genis><LevelSetGoster Cerceve={SetC} ic /></GrAday>
          <GrAday kod="ic-d" baslik="(iç) D — Tırtıklı Mühür" genis><LevelSetGoster Cerceve={SetD} ic /></GrAday>
        </>
      )}
    </GrBolum>
  );
}
