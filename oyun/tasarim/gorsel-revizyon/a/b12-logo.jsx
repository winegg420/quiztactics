// Bölüm 12 — Logo (tasarim/BRIEF_GORSEL_REVIZYON.md › B1.12). Şeker Q ailesinde; giriş ekranında ve üst çubukta.
import { GrAday, GrBolum } from "../secim.jsx";
import { QtDugme } from "../../index.js";
import { LogoA, LogoB } from "./cizim/logo.jsx";
import { CoinA } from "./cizim/para.jsx";
import { Baslikcik, TestSeridi, UstCubukOrnek } from "./yerinde.jsx";

function Giris({ Logo }) {
  return (
    <div className="ga-giris">
      <Logo yukseklik={84} className="ga-giris-logo" />
      <p className="ga-giris-alt">Türkçe bilgi yarışması</p>
      <div className="ga-giris-uclu">
        {["/avatars/pro/tilki-k04.svg", "/avatars/pro/kedi-k01.svg", "/avatars/pro/robot-k15.svg"].map((s) => <img key={s} src={s} alt="" width="72" height="72" />)}
      </div>
      <QtDugme tamGenislik>Misafir olarak dene</QtDugme>
      <QtDugme tamGenislik tur="ikincil">Google ile giriş yap</QtDugme>
    </div>
  );
}

function Aday({ Logo }) {
  return (
    <div className="ga-kutu">
      <Baslikcik>Giriş ekranı</Baslikcik>
      <Giris Logo={Logo} />
      <Baslikcik>Üst çubuk (yükseklik 36 px) — yeni coin ile</Baslikcik>
      <UstCubukOrnek marka={<Logo yukseklik={36} />} Coin={CoinA} />
      <Baslikcik>Uygulama ikonu (Şeker Q) yanında · gri ton</Baslikcik>
      <div className="ga-yan ga-beyaz">
        <img src="/quiztactics-sekerq-favicon.svg" alt="Şeker Q uygulama ikonu" width="56" height="56" />
        <Logo yukseklik={48} />
      </div>
      <TestSeridi etiket={false}><Logo yukseklik={32} /></TestSeridi>
    </div>
  );
}

export default function B12Logo() {
  return (
    <GrBolum no={12} baslik="Logo" tur="sec"
      aciklama="Şeker Q uygulama ikonunun ailesinde: beyaz Q, lacivert kontur, sarı kuyruk, turuncu şeker, kabarık Baloo 2 harfler. Q işareti QUIZ'in Q'sunun yerine geçer; yan yana 'Q QUIZ' okunmaz."
      ic={4} gosterilen={2}
      zayif="B üst çubukta 132 px genişliğinde; 360 px ekranda coin + elmas + avatar ile birlikte sığmak için yazı küçülmeli ya da elmas hapı gizlenmeli. A daha dar (106 px)."
      elenen="Dikey amblem + kurdele yazı (üst çubukta 36 px'te 'QUIZ TACTICS' okunmadı) · soru balonu içinde Q (sohbet uygulaması gibi okundu)">
      <GrAday kod="logo-seker-harf" baslik="A — Şeker Q harfli yazı" fikir="Uygulama ikonunun Q'su büyük; üstte 'UIZ', altta turuncu şeker harflerle 'TACTICS'. Bugünkü logonun yerleşimi, Şeker Q'nun dokusu."
        testler={{ siluet: true, kucuk: true, gri: true, set: true, avatar: true, hedef: true }}>
        <Aday Logo={LogoA} />
      </GrAday>
      <GrAday kod="logo-seker-hap" baslik="B — Şeker hap" fikir="Turuncu kabarık hap (Şeker Kutusu düğmesi) içinde tek satır beyaz şeker harfler; Q sarı kuyruklu. Her zeminde kendi kutusunu taşır."
        testler={{ siluet: "siluette düz hap, yazı kaybolur", kucuk: true, gri: true, set: true, avatar: true, hedef: true }}>
        <Aday Logo={LogoB} />
      </GrAday>
    </GrBolum>
  );
}
