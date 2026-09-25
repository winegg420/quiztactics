// Bölüm 1 — Coin ikonu (tasarim/BRIEF_GORSEL_REVIZYON.md › B1.1). Çizim: cizim/para.jsx.
import { GrAday, GrBolum } from "../secim.jsx";
import { CoinA, CoinC, ElmasA } from "./cizim/para.jsx";
import { AvatarSirasi, Baslikcik, Boylar, JokerFiyatOrnek, MacSonuOrnek, PaketYaninda, TestSeridi, UstCubukOrnek } from "./yerinde.jsx";

function Aday({ C }) {
  return (
    <div className="ga-kutu">
      <Boylar C={C} />
      <TestSeridi><C boyut={48} /><C boyut={20} /></TestSeridi>
      <Baslikcik>Üst çubuk (20 px)</Baslikcik>
      <UstCubukOrnek Coin={C} Elmas={ElmasA} />
      <Baslikcik>Dükkân fiyatı (18 px)</Baslikcik>
      <JokerFiyatOrnek Coin={C} />
      <Baslikcik>Maç sonu ödülü (48 px, hareketli)</Baslikcik>
      <MacSonuOrnek Coin={C} />
      <Baslikcik>6 avatar ve elmas paketi yanında</Baslikcik>
      <AvatarSirasi boyut={44}><C boyut={48} /></AvatarSirasi>
      <PaketYaninda><C boyut={64} /><ElmasA boyut={64} /></PaketYaninda>
    </div>
  );
}

export default function B1Coin() {
  return (
    <GrBolum no={1} baslik="Coin ikonu" tur="sec"
      aciklama="Tek coin çizimi (bugünkü iki farklı coin'in yerine). Elmas paketi görselleriyle aynı aile: kalın lacivert kontur, canlı sarı altın 3 ton, sol üstten ışık, tek beyaz parlama. 28 px ve altında iç kenar kalkar, Q koyu oyma harfe döner."
      ic={4} gosterilen={2}
      elenen="Tırtıklı yıldız sikke (şişe kapağı / mühür gibi okundu, para değil) · iki sikke yığını (16–20 px'te çamurlaştı, arkadaki sikke boş leke)">
      <GrAday kod="coin-q" baslik="A — Q Sikke (önden)" fikir="Önden duran kalın sikke; ortada Şeker Q'dan kabartma Q, altta tırtıklı kalınlık. Logo ve uygulama ikonuyla bağ kurar."
        testler={{ siluet: true, kucuk: true, gri: true, set: true, avatar: true, hedef: true, mobil: true }}>
        <Aday C={CoinA} />
      </GrAday>
      <GrAday kod="coin-egik" baslik="C — Dönen Sikke (yandan)" fikir="Sikke hafif dönmüş; yan yüzü ve tırtıkları görünür. Daha hareketli, 'oyun parası' duygusu; Q yatayda daralır."
        testler={{ siluet: true, kucuk: true, gri: true, set: true, avatar: true, hedef: true, mobil: true }}>
        <Aday C={CoinC} />
      </GrAday>
    </GrBolum>
  );
}
