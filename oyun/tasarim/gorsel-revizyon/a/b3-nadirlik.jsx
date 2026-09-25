// Bölüm 3 — Nadirlik kart kenarı (tasarim/BRIEF_GORSEL_REVIZYON.md › A7, B1.3). 2 stil × 4 nadirlik; GERÇEK dükkân
// (qt-dc-oge) ve koleksiyon (qt-cs-oge) kartlarında, gerçek premium çerçeveli CerceveliAvatar ile. Çizim: cizim/nadirlik.
import { GrAday, GrBolum } from "../secim.jsx";
import { QtIkon } from "../../index.js";
import CerceveliAvatar from "../../../components/CerceveliAvatar.jsx";
import { NADIRLIK_SIRA, NadirlikSusu, nadirlikSinifi, nadirlikStili } from "./cizim/nadirlik.jsx";
import { ElmasA } from "./cizim/para.jsx";
import { Hareket } from "./cizim/ortak.jsx";
import { Baslikcik } from "./yerinde.jsx";
import "../../ekranlar/dukkan-cerceve.css";
import "../../ekranlar/dukkan-kozmetik.css";
import "../../ekranlar/cerceve-secici.css";

// Örnek eşleme (A7: Sakura = Nadir, Ejderha = Efsanevi)
const KALEMLER = {
  siradan: { ad: "Sonbahar", pc: "pc_sonbahar", fiyat: 300, av: "/avatars/pro/tilki-k04.svg" },
  nadir: { ad: "Sakura", pc: "pc_sakura", fiyat: 500, av: "/avatars/pro2/kedili-kiz-y37.svg" },
  epik: { ad: "Galaksi", pc: "pc_galaksi", fiyat: 800, av: "/avatars/pro2/kristal-uzayli-y28.svg" },
  efsanevi: { ad: "Ejderha", pc: "pc_ejderha2", fiyat: 1200, av: "/avatars/pro/ejderha-k11.svg" },
};

function Simge({ k, boyut = 60 }) {
  return (
    <span className="qt-kz-premium-simge" style={{ width: boyut + 24, height: boyut + 24 }} aria-hidden="true">
      <CerceveliAvatar profile={{ avatar_url: k.av }} boyut={boyut} cerceve={null} aura={null} premiumCerceve={k.pc} premiumAura={null} />
    </span>
  );
}

function Dukkan({ stil }) {
  return (
    <Hareket as="div" className="ga-nd-kap">
      <ul className="qt-dc-izgara ga-nd-izgara">
        {NADIRLIK_SIRA.map((n) => {
          const k = KALEMLER[n];
          return (
            <li key={n}>
              <div className={`qt-dc-oge ${nadirlikSinifi(n, stil)}`} style={nadirlikStili(n)}>
                <NadirlikSusu nadirlik={n} stil={stil} />
                <Simge k={k} />
                <span className="qt-dc-ad">{k.ad}</span>
                <span className="qt-dc-durum"><span className="qt-dc-fiyat qt-dc-fiyat--elmas"><ElmasA boyut={16} /><span className="qt-sayi">{k.fiyat.toLocaleString("tr-TR")}</span></span></span>
              </div>
            </li>
          );
        })}
      </ul>
    </Hareket>
  );
}

function Koleksiyon({ stil }) {
  return (
    <Hareket as="div" className="ga-nd-kap">
      <ul className="qt-cs-izgara ga-nd-izgara">
        {NADIRLIK_SIRA.map((n, i) => {
          const k = KALEMLER[n];
          return (
            <li key={n}>
              <div className={`qt-cs-oge ${nadirlikSinifi(n, stil)}`} style={nadirlikStili(n)} aria-pressed={i === 3 ? "true" : undefined}>
                <NadirlikSusu nadirlik={n} stil={stil} />
                <Simge k={k} boyut={56} />
                <span className="qt-cs-ad">{k.ad}</span>
                <span className="qt-cs-durum">{i === 3 ? "Takılı" : "Sende var"}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </Hareket>
  );
}

function Aday({ stil }) {
  return (
    <div className="ga-kutu">
      <Baslikcik>Dükkân › Çerçeve ızgarası</Baslikcik>
      <Dukkan stil={stil} />
      <Baslikcik>Profil › Koleksiyon</Baslikcik>
      <Koleksiyon stil={stil} />
      <p className="ga-not"><QtIkon ad="bilgi" boyut={14} /> Satın alma penceresi ve maç sonu ödülü aynı kenar + etiketle (kart sınıfına tek ek sınıf).</p>
    </div>
  );
}

export default function B3Nadirlik() {
  return (
    <GrBolum no={3} baslik="Nadirlik kart kenarı" tur="sec"
      aciklama="Renk eşyanın kendisine değil kartın kenarına ve etiketine. Sıradan gri · Nadir mavi + NADİR · Epik mor + ara ara geçen parıltı + EPİK · Efsanevi altın + kenarda dolaşan ışık + EFSANEVİ. Gerçek dükkân ve koleksiyon kartları, gerçek premium çerçeveler (Sakura = Nadir, Ejderha = Efsanevi)."
      ic={4} gosterilen={2}
      elenen="Üst şerit başlık (etiket çerçevenin taç/boynuz süsüyle çakıştı) · yalnız dış ışıma (A4'teki 'süs ışıma'; 20 px'lik kartta nadirlik okunmadı, gri tonda kayboldu)">
      <GrAday kod="nadir-kose" baslik="1 — Köşe etiketi + kalın kenar" fikir="Kartın bütün kenarı nadirlik renginde kalın çerçeve; görselin arkası o rengin açık tonu; etiket sol üst köşede." genis
        testler={{ siluet: true, kucuk: true, gri: "gri tonda Nadir/Epik kenarı yakın; etiket yazısı ayırıyor", set: true, avatar: true, hedef: true, mobil: true }}>
        <Aday stil="kose" />
      </GrAday>
      <GrAday kod="nadir-bant" baslik="2 — Alt bant" fikir="İnce renkli kenar; kartın alt yarısı (ad + fiyat) nadirlik renginde bant, etiket bandın tepesinde ortada. Görsel beyaz zeminde temiz kalır." genis
        testler={{ siluet: true, kucuk: true, gri: "gri tonda Nadir/Epik bandı yakın; etiket yazısı ayırıyor", set: true, avatar: true, hedef: true, mobil: true }}>
        <Aday stil="bant" />
      </GrAday>
    </GrBolum>
  );
}
