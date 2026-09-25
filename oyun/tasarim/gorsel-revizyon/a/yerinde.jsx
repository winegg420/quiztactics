// Adayları oyundaki GERÇEK yerlerinde gösteren sahneler — gerçek sınıflar/bileşenler (üst çubuk, dükkân joker
// satırı ve fiyatı, kozmetik ızgara kartı, maç sonu ödülü), gerçek profil avatarları. Oyuna dokunmaz; yalnız import.
import { QtDugme, QtKart, QtUstCubuk, QtMarka, sayiBicim } from "../../index.js";
import SkillRozeti from "../../../components/SkillRozeti.jsx";
import ElmasPaketGorseli from "../../premium/elmas/ElmasPaketGorseli.jsx";
import "../../ekranlar/satin-al-onay.css";
import "../../ekranlar/dukkan-magaza.css";
import "../../ekranlar/dukkan-cerceve.css";
import "../../ekranlar/mac-sonu-kutlama.css";
import "../../ekranlar/m1-sonuc.css";
import "./yerinde.css";

/** 6 gerçek profil avatarı (farklı set, farklı zemin rengi) — "avatar yanında" testi. */
export const ALTI_AVATAR = [
  { src: "/avatars/pro/kedi-k01.svg", ad: "Kedi" },
  { src: "/avatars/pro/robot-k15.svg", ad: "Robot" },
  { src: "/avatars/pro/korsan-k19.svg", ad: "Korsan" },
  { src: "/avatars/pro2/kristal-uzayli-y28.svg", ad: "Kristal Uzaylı" },
  { src: "/avatars/pro2/pilot-y38.svg", ad: "Pilot" },
  { src: "/avatars/pro/ejderha-k11.svg", ad: "Ejderha" },
];

export function AvatarSirasi({ boyut = 48, children }) {
  return (
    <div className="ga-avsira">
      {ALTI_AVATAR.map((a) => <img key={a.src} src={a.src} alt={a.ad} width={boyut} height={boyut} loading="lazy" decoding="async" />)}
      {children}
    </div>
  );
}

/** Gerçek üst çubuk (QtUstCubuk): marka + coin hapı + elmas hapı + avatar. */
export function UstCubukOrnek({ Coin, Elmas, marka, coin = 12450, elmas = 320 }) {
  return (
    <div className="ga-cubuk">
      <QtUstCubuk
        marka={marka ?? <QtMarka />}
        sag={(
          <>
            {Coin && <span className="qt-coin" role="img" aria-label={`${sayiBicim(coin)} coin`}><Coin boyut={20} /><b>{sayiBicim(coin)}</b></span>}
            {Elmas && <span className="qt-coin qt-sat-elmas" role="img" aria-label={`${sayiBicim(elmas)} elmas`}><Elmas boyut={20} /><b>{sayiBicim(elmas)}</b></span>}
          </>
        )}
      />
    </div>
  );
}

/** Dükkân › Jokerler satırı (gerçek qt-dk-skill kartı) — coin fiyatı 18 px. */
export function JokerFiyatOrnek({ Coin }) {
  return (
    <QtKart dolgu="k" className="qt-dk-skill">
      <span className="qt-dk-skill-ikon qt-dk-skill-ikon--rozet" aria-hidden="true"><SkillRozeti tur="elli" boyut={52} /></span>
      <div className="qt-dk-skill-metin">
        <h3 className="qt-baslik-3">50:50</h3>
        <p className="qt-kucuk qt-soluk">İki yanlış şıkkı eler.</p>
      </div>
      <div className="qt-dk-skill-al">
        <QtDugme boyut="k"><span className="qt-dk-fiyat"><span className="qt-dk-fiyat-adet">1×</span><Coin boyut={18} /><span className="qt-sayi">60</span></span></QtDugme>
      </div>
    </QtKart>
  );
}

/** Dükkân › Çerçeve ızgara kartı (gerçek qt-dc-oge) — elmas fiyatı 16 px. */
export function KozmetikFiyatOrnek({ Elmas, ad = "Sakura", fiyat = 500, children }) {
  return (
    <ul className="qt-dc-izgara ga-izgara-tek">
      <li>
        <div className="qt-dc-oge">
          {children}
          <span className="qt-dc-ad">{ad}</span>
          <span className="qt-dc-durum"><span className="qt-dc-fiyat qt-dc-fiyat--elmas"><Elmas boyut={16} /><span className="qt-sayi">{sayiBicim(fiyat)}</span></span></span>
        </div>
      </li>
    </ul>
  );
}

/** Maç sonu ödülü: büyük coin satırı (gerçek msk-coin, 48 px hareketli) + ödül hapları (m1-ss-odul). */
export function MacSonuOrnek({ Coin, Elmas }) {
  return (
    <div className="ga-macsonu">
      <section className="msk-kart" style={{ "--t-coin": "0ms", animation: "none" }} aria-label="Maç ödülleri">
        <div className="msk-coin" style={{ animation: "none" }}>
          <span className="ga-msk-ikon"><Coin boyut={48} hareketli /></span>
          <span className="msk-coin-sayi qt-sayi">+30</span>
          <span className="msk-coin-etiket">coin</span>
        </div>
        {Elmas && (
          <div className="msk-coin ga-msk-elmas" style={{ animation: "none" }}>
            <span className="ga-msk-ikon"><Elmas boyut={48} hareketli /></span>
            <span className="msk-coin-sayi qt-sayi">+5</span>
            <span className="msk-coin-etiket">elmas</span>
          </div>
        )}
      </section>
      <div className="m1-ss-oduller">
        <span className="m1-ss-odul m1-ss-odul--coin"><Coin boyut={20} /><b>+30</b><span className="m1-ss-odul-etiket">coin</span></span>
        {Elmas && <span className="m1-ss-odul"><Elmas boyut={20} /><b>+5</b><span className="m1-ss-odul-etiket">elmas</span></span>}
      </div>
    </div>
  );
}

/** Boy dizisi (A9): verilen bileşeni birkaç boyda yan yana; `hareketli` yalnız büyükte. */
export function Boylar({ C, boylar = [16, 20, 24, 48], buyuk = 96, hareketli = true }) {
  return (
    <div className="ga-boylar">
      <span className="ga-buyuk"><C boyut={buyuk} hareketli={hareketli} /></span>
      <span className="ga-boy-dizi">{boylar.map((b) => <span key={b} className="ga-boy"><C boyut={b} /><small>{b}</small></span>)}</span>
    </div>
  );
}

/** Kalite kapısı şeridi: siluet (brightness 0) ve gri ton (grayscale 1) kopyaları. */
export function TestSeridi({ children, etiket = true }) {
  return (
    <div className="ga-test">
      <span className="ga-test-kutu ga-test--siluet">{children}{etiket && <small>siluet</small>}</span>
      <span className="ga-test-kutu ga-test--gri">{children}{etiket && <small>gri</small>}</span>
    </div>
  );
}

/** Hedef kalite: elmas paketi görselleri (Avuç, Sandık) yanında. */
export function PaketYaninda({ children }) {
  return (
    <div className="ga-paket">
      <span className="ga-paket-kutu"><ElmasPaketGorseli seviye={1} hareketli={false} /></span>
      {children}
      <span className="ga-paket-kutu"><ElmasPaketGorseli seviye={3} hareketli={false} /></span>
    </div>
  );
}

export const Baslikcik = ({ children }) => <p className="ga-baslikcik">{children}</p>;
