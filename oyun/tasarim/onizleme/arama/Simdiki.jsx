// ŞİMDİKİ arama ekranı — karşılaştırma için. AramaSahnesi.jsx ile AYNI işaretleme ve sınıflar (ara-, qt-sahne-mac),
// oyuncu kartı olarak gerçek `VsKarti` (sahte profil + elde verilen kart: sunucuya gitmez). Gerçek bileşen
// body'ye portal + position:fixed açtığı için çerçeveye sığmaz; bu yüzden gövdesi burada aynen kuruldu.
// Oyunun dosyalarına dokunulmaz; yalnız import edilir.
import { VsKarti } from "../../../components/AramaSahnesi.jsx";
import { tt } from "../../../lib/dil.js";
import { QtDugme, QtIkon, QtRozet } from "../../index.js";
import { BEN, sureYaz } from "./ortak.jsx";

const MOD_AD = { klasik: "Klasik", duello: "Düello" };
const MOD_IKON = { klasik: "klasik", duello: "duello" };
const KART = (level) => ({ level, lig: "altin", cerceve: null, cerceve_nadirlik: null, aura: null, premium_cerceve: null, premium_aura: null });
const BEN_PROFIL = { id: "onizleme-ben", gorunen_ad: BEN.ad, gorunen_avatar: BEN.avatar };

function RakipYeri({ etiket }) {
  return (
    <div className="ara-kart ara-kart--bos" aria-hidden="true">
      <span className="ara-siluet">
        <span className="ara-siluet-serit">
          {[0, 1, 2, 0].map((v, i) => (
            <svg key={i} className={`ara-siluet-sekil ara-siluet-sekil--${v}`} viewBox="0 0 64 64">
              {v === 1 && <path d="M18 27c0-10 6-17 14-17s14 7 14 17v8H18z" className="sac" />}
              <circle cx="32" cy="25" r="11" />
              {v === 2 && <path d="M19 21c2-8 8-12 13-12s11 4 13 12l4 1H15z" className="sac" />}
              <path d="M12 60c1-12 9-20 20-20s19 8 20 20z" />
            </svg>
          ))}
        </span>
        <span className="ara-siluet-soru"><QtIkon ad="soru" boyut={30} /></span>
      </span>
      <span className="ara-kart-ad ara-kart-ad--soluk">{etiket}</span>
    </div>
  );
}

export default function Simdiki({ mod, dereceli, dongu, durdu, onIptal, iptalRef }) {
  const { asama, gecen, tur } = dongu;
  const bulundu = asama !== "ariyor";
  const rakip = { id: `onizleme-rakip-${tur.no}`, gorunen_ad: tur.rakip.ad, gorunen_avatar: tur.rakip.avatar };
  return (
    <div className={`ara qt-sahne-mac ra-simdiki${bulundu ? " ara--bulundu" : ""}`} data-durdu={durdu ? "1" : undefined}
         role="group" aria-label={tt("Rakip aranıyor…")}>
      <div className="ara-isik" aria-hidden="true"><span /><span /></div>
      <header className="ara-ust">
        <span className="ara-ust-rozetler">
          <QtRozet ton="koyu" ikon={MOD_IKON[mod]}>{tt(MOD_AD[mod])}</QtRozet>
          <QtRozet ton={dereceli ? "coin" : "notr"} ikon={dereceli ? "lig" : undefined}>{dereceli ? tt("Dereceli") : tt("Serbest")}</QtRozet>
        </span>
        <span className="ara-sure qt-sayi"><QtIkon ad="saat" boyut={18} /> {sureYaz(gecen)}</span>
      </header>
      <main className="ara-govde">
        <h1 className="ara-baslik">{bulundu ? tt("Rakip bulundu!") : tt("Rakip aranıyor…")}</h1>
        <div className="ara-vs">
          <VsKarti profil={BEN_PROFIL} kart={KART(BEN.level)} taraf="ben" vsKarti={null} isimEfekti={null} adDokunur={false} />
          <span className="ara-vs-rozet" aria-hidden="true"><span>VS</span></span>
          {bulundu
            ? <VsKarti key={tur.no} profil={rakip} kart={KART(tur.rakip.level)} taraf="rakip" vsKarti={null} isimEfekti={null} adDokunur={false} />
            : <RakipYeri etiket={tt("Aranıyor")} />}
        </div>
        {!bulundu && (
          <div className="ara-alt-satir"><p>{tt("Karışık")} {tt("kategorisinde")}{tt(" seninle aynı seviyede birini arıyoruz.")}</p></div>
        )}
      </main>
      <footer className="ara-alt">
        {!bulundu && (onIptal
          ? <QtDugme ref={iptalRef} tur="ikincil" tamGenislik onClick={onIptal}>{tt("İptal")}</QtDugme>
          : <QtDugme as="span" tur="ikincil" tamGenislik>{tt("İptal")}</QtDugme>)}
      </footer>
    </div>
  );
}
