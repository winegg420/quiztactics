// Bölüm 0 — Stil rehberi (tasarim/BRIEF_GORSEL_REVIZYON.md › A6, B1.0). Kurallar + ortak palet + 6 gerçek avatar
// yanında yeni dilde coin, elmas, bir lig çerçevesi (Ajan B'nin Set B "Yükselen Kanat" Altın'ı), bir rozet, lig amblemi.
import { GrAday, GrBolum } from "../secim.jsx";
import { ELMAS_FASET, KONTUR, MARKA, METAL, NADIRLIK, SAHNE, TAS } from "../palet.js";
import Avatar from "../../../../src/components/Avatar.jsx";
import GrCerceve from "../b/GrCerceve.jsx";
import { LIG_B, LIG_B_EFEKT } from "../b/cizim/ligSetB.js";
import { LigAmblemi } from "../../premium/ligAmblemi.jsx";
import RozetMadalyonu from "../../../components/RozetMadalyonu.jsx";
import { CoinA, ElmasA } from "./cizim/para.jsx";
import { LigAmblemiB } from "./cizim/lig.jsx";
import { Rozet } from "./cizim/rozet.jsx";
import { ALTI_AVATAR, Baslikcik } from "./yerinde.jsx";

const KURALLAR = [
  ["Kontur", "Kalın koyu lacivert #0b1220 — avatarlarla aynı oran. 28 px ve altında kalınlaşır, iç ayrıntı azalır."],
  ["Dolgu", "Düz renk + 2–3 ton hücre gölgesi (açık · orta · koyu). Fotogerçekçi degrade ve 3B plastik parlaklık yok."],
  ["Işık", "Hep sol üstten: açık yüzler sol üstte, koyu yüzler sağ altta."],
  ["Parlama", "Tek beyaz parlama vuruşu (sol üst). Cam hilali / yumuşak parıltı yok."],
  ["Metal", "Her metal kendi 3 tonuyla + kenar tonu. Altın = canlı sarı (altın isim tonu), soluk hardal değil."],
  ["Kademe", "Kademe renkle değil ŞEKİL ve SÜSLE ayrışır; siyah siluette bile okunur. Renk yardımcıdır."],
  ["Nadirlik", "Renk eşyaya değil kartın kenarına ve etiketine konur (Sıradan gri · Nadir mavi · Epik mor · Efsanevi altın)."],
  ["Hareket", "Yalnız transform/opacity; ekran dışında durur; 'hareketi azalt'ta durmaz, 2,5× yavaşlar; flaş kapanır."],
];

const Renk = ({ r, ad }) => <span className="ga-renk"><i style={{ background: r }} /><small>{ad}</small></span>;
function PaletGrubu({ baslik, renkler }) {
  return (
    <div className="ga-palet-grup">
      <b>{baslik}</b>
      <div>{renkler.map(([ad, r]) => <Renk key={ad + r} r={r} ad={ad} />)}</div>
    </div>
  );
}

function YeniCerceve({ boyut = 88 }) {
  return (
    <GrCerceve cizim={(k) => LIG_B.altin(k)} anahtar="ligB:altin" efekt={LIG_B_EFEKT.altin} boyut={boyut} hareketli etiket="Altın Lig çerçevesi (örnek)">
      <Avatar profile={{ gorunen_ad: "Kedili Kız", gorunen_avatar: "/avatars/pro2/kedili-kiz-y37.svg" }} boyut={boyut} />
    </GrCerceve>
  );
}

export default function B0Stil() {
  return (
    <GrBolum no={0} baslik="Stil rehberi" tur="dil"
      aciklama="Bütün yeni çizimlerin tek dili; referans profil avatarları ve elmas paketi görselleri. Bu dil onaylanmazsa aşağıdaki bütün adaylar da değişir — önce buna bak.">
      <GrAday kod="dil" baslik="Tek görsel dil" genis>
        <div className="ga-kutu">
          <Baslikcik>Aynı elden: 6 gerçek avatar + yeni coin, elmas, lig çerçevesi, rozet, lig amblemi</Baslikcik>
          <div className="ga-stil-sahne">
            {ALTI_AVATAR.map((a) => <img key={a.src} src={a.src} alt={a.ad} width="64" height="64" loading="lazy" decoding="async" />)}
            <YeniCerceve />
            <CoinA boyut={64} hareketli etiket="Coin" />
            <ElmasA boyut={64} hareketli etiket="Elmas" />
            <Rozet amblem="galibiyet" seviye={3} boyut={64} />
            <LigAmblemiB lig="altin" boyut={64} hareketli />
          </div>

          <Baslikcik>Kurallar</Baslikcik>
          <ul className="ga-kurallar">{KURALLAR.map(([b, m]) => <li key={b}><b>{b}</b><span>{m}</span></li>)}</ul>

          <Baslikcik>Ortak palet (palet.js · palet.css)</Baslikcik>
          <div className="ga-palet">
            <PaletGrubu baslik="Kontur · parlama" renkler={[["kontur", KONTUR], ["parlama", "#ffffff"], ["krem", "#fff8ec"]]} />
            {Object.entries(METAL).map(([ad, m]) => <PaletGrubu key={ad} baslik={ad} renkler={[["açık", m.acik], ["orta", m.orta], ["koyu", m.koyu], ["kenar", m.kenar]]} />)}
            <PaletGrubu baslik="pırlanta faseti" renkler={Object.entries(ELMAS_FASET)} />
            <PaletGrubu baslik="taşlar" renkler={Object.entries(TAS)} />
            <PaletGrubu baslik="sahne zeminleri" renkler={Object.entries(SAHNE)} />
            <PaletGrubu baslik="marka" renkler={Object.entries(MARKA)} />
            <PaletGrubu baslik="nadirlik" renkler={Object.entries(NADIRLIK).map(([k, n]) => [k, n.renk])} />
          </div>

          <Baslikcik>Boy kuralı: aynı çizim 64 px ve 20 px (küçükte iç ayrıntı azalır, kontur kalınlaşır)</Baslikcik>
          <div className="ga-yan ga-beyaz">
            <CoinA boyut={64} /><CoinA boyut={20} /><ElmasA boyut={64} /><ElmasA boyut={20} />
            <Rozet amblem="seri" seviye={4} boyut={64} /><Rozet amblem="seri" seviye={4} boyut={20} />
            <LigAmblemiB lig="efsane" boyut={64} /><LigAmblemiB lig="efsane" boyut={20} />
          </div>

          <Baslikcik>Eski → yeni (eskiler yasak örnek, A4)</Baslikcik>
          <div className="ga-eski-yeni">
            <span><img src="/dukkan/coin.webp" alt="eski coin" width="48" height="48" /><i>→</i><CoinA boyut={48} /></span>
            <span><LigAmblemi lig="altin" boyut={48} /><i>→</i><LigAmblemiB lig="altin" boyut={48} /></span>
            <span><RozetMadalyonu grup="seri" kademe="altin" boyut={48} /><i>→</i><Rozet amblem="seri" seviye={3} boyut={48} /></span>
          </div>
        </div>
      </GrAday>
    </GrBolum>
  );
}
