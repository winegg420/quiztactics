// Bölüm 2 — Elmas ikonu (tasarim/BRIEF_GORSEL_REVIZYON.md › B1.2). Çizim: cizim/para.jsx. Coin A ile çift gösterilir.
import { GrAday, GrBolum } from "../secim.jsx";
import { CoinA, ElmasA, ElmasB } from "./cizim/para.jsx";
import { AvatarSirasi, Baslikcik, Boylar, KozmetikFiyatOrnek, MacSonuOrnek, PaketYaninda, TestSeridi, UstCubukOrnek } from "./yerinde.jsx";
import CerceveliAvatar from "../../../components/CerceveliAvatar.jsx";

function Aday({ E }) {
  return (
    <div className="ga-kutu">
      <Boylar C={E} />
      <TestSeridi><E boyut={48} /><E boyut={20} /></TestSeridi>
      <Baslikcik>Üst çubuk — coin ile çift (20 px)</Baslikcik>
      <UstCubukOrnek Coin={CoinA} Elmas={E} />
      <Baslikcik>Dükkân fiyatı (16 px, gerçek çerçeve kartı)</Baslikcik>
      <KozmetikFiyatOrnek Elmas={E}>
        <span className="qt-kz-premium-simge" style={{ width: 84, height: 84 }} aria-hidden="true">
          <CerceveliAvatar profile={{ avatar_url: "/avatars/pro/kedi-k01.svg" }} boyut={60} cerceve={null} aura={null} premiumCerceve="pc_sakura" premiumAura={null} />
        </span>
      </KozmetikFiyatOrnek>
      <Baslikcik>Maç sonu ödülü (48 px, hareketli)</Baslikcik>
      <MacSonuOrnek Coin={CoinA} Elmas={E} />
      <Baslikcik>6 avatar ve elmas paketi yanında</Baslikcik>
      <AvatarSirasi boyut={44}><E boyut={48} /></AvatarSirasi>
      <PaketYaninda><CoinA boyut={64} /><E boyut={64} /></PaketYaninda>
    </div>
  );
}

export default function B2Elmas() {
  return (
    <GrBolum no={2} baslik="Elmas ikonu" tur="sec"
      aciklama="Elmas paketi görsellerindeki pırlantanın ailesi (aynı faset tonları, pembe faset, beyaz vuruş). Coin ile yan yana üst çubukta ve ödülde bir çift gibi durmalı. 28 px ve altında iç fasetler azalır, pembe faset kalkar."
      ic={4} gosterilen={2}
      elenen="Damla kesim (su damlası gibi okundu) · kristal kümesi (buz/kristal çağrışımı, 'Elmas' değil; Buz Kristali yasak listede)"
      zayif="B (Sekizgen) 16–20 px'te yuvarlak siluetiyle coin'e yaklaşıyor; üst çubukta ikisi 'iki düğme' gibi durabiliyor. Önerim A.">
      <GrAday kod="elmas-pirlanta" baslik="A — Pırlanta (paket ailesi)" fikir="Elmas paketindeki pırlantanın tek başına hâli: düz tabla, sivri alt, 6 ton faset + pembe faset. Siluet coin'den tamamen ayrı."
        testler={{ siluet: true, kucuk: true, gri: true, set: true, avatar: true, hedef: true, mobil: true }}>
        <Aday E={ElmasA} />
      </GrAday>
      <GrAday kod="elmas-sekizgen" baslik="B — Sekizgen (üstten kesim)" fikir="Pırlantaya üstten bakış: sekizgen tabla, yıldız fasetler; ışık sol üstten fasetlere düşer."
        testler={{ siluet: true, kucuk: "16 px'te coin'e yakın", gri: true, set: true, avatar: true, hedef: true, mobil: true }}>
        <Aday E={ElmasB} />
      </GrAday>
    </GrBolum>
  );
}
