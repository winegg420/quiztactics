// Bölüm 9 — Lig amblemleri (tasarim/BRIEF_GORSEL_REVIZYON.md › B1.9). Çizim: cizim/lig.jsx.
import { GrAday, GrBolum } from "../secim.jsx";
import { QtListe, QtListeSatiri, QtAvatar } from "../../index.js";
import { LIG_AD, LIG_SIRA, LigAmblemiA, LigAmblemiB } from "./cizim/lig.jsx";
import { ALTI_AVATAR, AvatarSirasi, Baslikcik } from "./yerinde.jsx";

const OYUNCULAR = ["Mert", "Zeynep_Karahisarlı", "Ayşe", "Kaan", "Deniz"];

function Set({ L }) {
  return (
    <div className="ga-kutu">
      <Baslikcik>Vitrin (64 px) — üst ligler hareketli</Baslikcik>
      <div className="ga-lig-vitrin">
        {LIG_SIRA.map((l) => <span key={l} className="ga-lig-kalem"><L lig={l} boyut={64} hareketli /><small>{LIG_AD[l]}</small></span>)}
      </div>
      <Baslikcik>İsim yanında (20 px) — lig tablosu satırı</Baslikcik>
      <QtListe etiket="Lig tablosu örneği">
        {LIG_SIRA.map((l, i) => (
          <QtListeSatiri key={l} bas={<QtAvatar src={ALTI_AVATAR[i].src} ad={OYUNCULAR[i]} boyut="m" />}
            baslik={<span className="ga-isim-amblem"><span className="ga-isim">{OYUNCULAR[i]}</span><L lig={l} boyut={20} /></span>}
            alt={`${LIG_AD[l]} Lig · ${(2400 - i * 310).toLocaleString("tr-TR")}`} vurgulu={i === 2} />
        ))}
      </QtListe>
      <Baslikcik>Boylar: 20 · 24 · siluet · gri ton</Baslikcik>
      <div className="ga-lig-test">
        <span>{LIG_SIRA.map((l) => <L key={l} lig={l} boyut={20} />)}</span>
        <span>{LIG_SIRA.map((l) => <L key={l} lig={l} boyut={24} />)}</span>
        <span className="ga-test--siluet">{LIG_SIRA.map((l) => <L key={l} lig={l} boyut={24} />)}</span>
        <span className="ga-test--gri">{LIG_SIRA.map((l) => <L key={l} lig={l} boyut={24} />)}</span>
      </div>
      <Baslikcik>6 avatar yanında</Baslikcik>
      <AvatarSirasi boyut={44}><L lig="altin" boyut={48} /><L lig="efsane" boyut={48} /></AvatarSirasi>
    </div>
  );
}

export default function B9LigAmblem() {
  return (
    <GrBolum no={9} baslik="Lig amblemleri" tur="sec"
      aciklama="Bugünkü 'antivirüs kalkanı' yerine iki tam set. Kademe renkle değil ŞEKİL ve SÜSLE ayrışır; 20 px'te siyah siluetten bile hangi lig olduğu okunur. Fasetler ışığa göre metalin 3 tonunu alır."
      ic={4} gosterilen={2}
      elenen="Flama seti (Gümüş→Efsane siluetleri aynı, yalnız renk ayırıyor — A4 yasağı) · Kristal seti (okunuyor ama 'Elmas' ligi elmas para birimi ve buz kristaliyle karışıyor, Bronz 'kaba taş' ucuz duruyor)"
      zayif="A setinde Bronz yalın baklava; elmas para ikonunun pırlantasına benzeyebilir, Efsane 20 px'te kalabalık. Önerim B (Fasetli Yıldız).">
      <GrAday kod="lig-yildiz" baslik="B — Fasetli Yıldız" fikir="Kol sayısı kademeyi söyler: Bronz 4 · Gümüş 5 · Altın 6 · Elmas 8 + pırlanta göbek · Efsane 8 + arkada dönen mor hâle yıldızı. Her kol ışık ve gölge yüzüne ayrılır."
        testler={{ siluet: true, kucuk: true, gri: true, set: true, avatar: true, hedef: true, mobil: true }}>
        <Set L={LigAmblemiB} />
      </GrAday>
      <GrAday kod="lig-kanat" baslik="A — Kanatlı Arma" fikir="Fasetli baklava arma; kademe arttıkça süs eklenir: Gümüş tek tüy kanat → Altın iki tüy + taç → Elmas üç tüy → Efsane dört tüy + dönen ışın hâlesi. Siluet her kademede genişler."
        testler={{ siluet: true, kucuk: "Efsane 20 px'te kalabalık", gri: true, set: true, avatar: true, hedef: true, mobil: true }}>
        <Set L={LigAmblemiA} />
      </GrAday>
    </GrBolum>
  );
}
