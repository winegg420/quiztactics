// Altın isim ADAYLARI (Ajan A, 24 Eyl 2026) — /tasarim-onizleme bölümü. Oyunda hiçbir şeyi değiştirmez:
// oyundaki isim_altin (IsimEfekti + kozmetik.css) aynen durur; burada yalnız "Şimdiki" kıyas için çizilir.
// Sözleşme: ADAYLAR = [{ kod, baslik }] (kopyalama listesi), varsayılan dışa aktarım bölüm bileşeni ({ secimler, onSec }).
// Sorun (Ida, canlı lig tablosu): açık zeminde okunsun diye koyulaştırılan altın bronz/kahverengi görünüyor.
// Dört adayın ortak ilkesi: altın PARLAK SARI kalır, okunurluğu KOYU LACİVERT KONTUR sağlar. Teknik ve
// ölçüm: altin-isim.css başı. Sahneler gerçek oyun sınıflarıyla (lig tablosu, maç şeridi, VS, maç sonu, profil).
import Avatar from "../../../../src/components/Avatar.jsx";
import IsimEfekti from "../../../components/IsimEfekti.jsx";
import OyuncuLigAmblemi from "../../../components/OyuncuLigAmblemi.jsx";
import { SeviyeEtiketi } from "../../../components/MacUstSerit.jsx";
import { QtCan, QtIkon, QtKart, QtMacUst, QtRozet } from "../../index.js";
import { yumusakHareketKur } from "../../yumusakHareket.js";
import { tt } from "../../../lib/dil.js";
import { SecimDugmeleri } from "../secim.jsx";
import "../../../pages/lig-a.css";
import "../../ekranlar/a-arama-sahnesi.css";
import "../../ekranlar/mac-sonu-kutlama.css";
import "../../ekranlar/dukkan-profil.css";
import "./altin-isim.css";

yumusakHareketKur();   // hareketi azalt → durmaz, 0,4 hızda (data-yumusak kapsamı)

const TARIF = {
  parlak: "Parlak sarı altın harf, kalın lacivert kontur ve alttan ince derinlik. Büyük yerlerde hafif altın ışıma ve harflerin üstünden geçen parıltı; listede durağan.",
  tac: "Parlak'ın aynısı + ismin önünde küçük altın taç (lacivert konturlu, ortada turuncu taş). Büyük yerlerde tacın ucunda pırıltı.",
  serit: "Parlak altın harf + ismin arkasında uçlarda kaybolan yarı saydam altın ışık şeridi (kenarı yok, plaka değil). Büyük yerlerde şerit ismin iki yanına saç teli inceliğinde ışık olarak uzar ve üstünden ışık süzülür; listede yalnız yumuşak şerit.",
  yildiz: "Önerim: daha kalın kontur ve belirgin 3B derinlik, iki tonlu parlak metal bant (üst açık, alt doygun altın) ve son harfin köşesinde küçük dört köşeli yıldız. Oyun başlığı gibi 'çıkartma' etkisi; büyük yerlerde yıldız döner, parıltı geçer.",
};

export const ADAYLAR = [
  { kod: "altin-isim:parlak", baslik: "Parlak Altın (kontur + ışıma)", tur: "parlak" },
  { kod: "altin-isim:tac", baslik: "Taçlı Altın", tur: "tac" },
  { kod: "altin-isim:serit", baslik: "Işık Şeritli Altın", tur: "serit" },
  { kod: "altin-isim:yildiz", baslik: "Yıldızlı 3B Altın", tur: "yildiz" },
];

/** Küçük altın taç (SVG, kendi çizimimiz): lacivert kontur, parlak altın, turuncu taş. */
function Tac() {
  return (
    <svg className="ai-tac" viewBox="0 0 26 22" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ai-tac-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff7c2" />
          <stop offset="0.55" stopColor="#ffd83a" />
          <stop offset="1" stopColor="#ffb700" />
        </linearGradient>
      </defs>
      <path d="M3.2 17.6 L2 6.6 L8 11 L13 3.2 L18 11 L24 6.6 L22.8 17.6 Z" fill="url(#ai-tac-g)" stroke="#1d2152" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="3.2" y="16.2" width="19.6" height="4" rx="1.6" fill="url(#ai-tac-g)" stroke="#1d2152" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="2" cy="6.2" r="1.9" fill="#ffd83a" stroke="#1d2152" strokeWidth="1.6" />
      <circle cx="13" cy="2.8" r="2" fill="#ffd83a" stroke="#1d2152" strokeWidth="1.6" />
      <circle cx="24" cy="6.2" r="1.9" fill="#ffd83a" stroke="#1d2152" strokeWidth="1.6" />
      <path d="M13 9.6 L15.2 12.4 L13 15.2 L10.8 12.4 Z" fill="#ff7a2e" stroke="#1d2152" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M5.2 8.8 L6.1 14.6" stroke="#fffbe6" strokeWidth="1.1" strokeLinecap="round" opacity="0.9" />
      <path className="ai-tac-pirilti" d="M20.5 -1.5 L21.3 1 L23.8 1.8 L21.3 2.6 L20.5 5.1 L19.7 2.6 L17.2 1.8 L19.7 1 Z" fill="#fff" stroke="#ffd83a" strokeWidth="0.5" />
    </svg>
  );
}

/** Dört köşeli yıldız (aday 4): beyaz çekirdek, altın kenar, lacivert kontur. */
function Yildiz() {
  return (
    <svg className="ai-yildiz" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M10 0.8 L12.2 7.8 L19.2 10 L12.2 12.2 L10 19.2 L7.8 12.2 L0.8 10 L7.8 7.8 Z" fill="none" stroke="#1d2152" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M10 0.8 L12.2 7.8 L19.2 10 L12.2 12.2 L10 19.2 L7.8 12.2 L0.8 10 L7.8 7.8 Z" fill="#ffd83a" />
      <path d="M10 5.2 L11 9 L14.8 10 L11 11 L10 14.8 L9 11 L5.2 10 L9 9 Z" fill="#fffbe6" />
    </svg>
  );
}

/** Aday altın isim. Metin iki kez çizilir: arkada kontur katmanı (aria-hidden), önde degrade dolgu. */
export function AltinIsim({ tur, hareketli = false, koyu = false, children }) {
  const ad = String(children ?? "");
  const s = ["ai", `ai--${tur}`, hareketli && "ai--hareketli", koyu && "ai--koyu"].filter(Boolean).join(" ");
  return (
    <span className={s} data-yumusak="">
      {tur === "tac" && <Tac />}
      <span className="ai-yazi">
        {tur === "serit" && <span className="ai-serit" aria-hidden="true" />}
        <span className="ai-kontur" aria-hidden="true">{ad}</span>
        <span className="ai-dolgu">{ad}</span>
      </span>
      {tur === "yildiz" && <Yildiz />}
    </span>
  );
}

/** Oyundaki şimdiki hâl (kıyas için; IsimEfekti olduğu gibi, oyundaki bağlam bayraklarıyla). */
const simdiki = (ad, o = {}) => (
  <IsimEfekti ef="isim_altin" koyu={Boolean(o.koyu)} acik={Boolean(o.acik)} hareketli={Boolean(o.hareketli)}>{ad}</IsimEfekti>
);
const adayIle = (tur) => (ad, o = {}) => <AltinIsim tur={tur} hareketli={Boolean(o.hareketli)} koyu={Boolean(o.koyu)}>{ad}</AltinIsim>;

const AV = (a) => `/avatars/pro/${a}.svg`;
const ALTIN_AD = "Kağan Şahin";
const LIG_SATIRLARI = [
  { sira: 1, ad: "Elif", avatar: AV("baykus-k03"), lig: "elmas", lv: 31, puan: 1480 },
  { sira: 2, ad: "Mert Yılmaz", avatar: AV("tilki-k04"), lig: "altin", lv: 28, puan: 1415 },
  { sira: 3, ad: ALTIN_AD, avatar: AV("kral-k31"), lig: "altin", lv: 27, puan: 1390, altin: true },
  { sira: 4, ad: "Zeynep", avatar: AV("panda-k05"), lig: "altin", lv: 25, puan: 1312 },
  { sira: 5, ad: "Deniz Arslan", avatar: AV("robot-k15"), lig: "gumus", lv: 24, puan: 1240 },
  { sira: 6, ad: "Ayşe Nur", avatar: AV("kedi-k01"), lig: "gumus", lv: 22, puan: 1188 },
];
const BEN = { gorunen_ad: ALTIN_AD, gorunen_avatar: AV("kral-k31") };
const RAKIP = { gorunen_ad: "Mert Yılmaz", gorunen_avatar: AV("tilki-k04") };

function Yer({ ad, not, genis = false, children }) {
  return (
    <figure className={`aio-yer${genis ? " aio-yer--genis" : ""}`}>
      <figcaption className="aio-yer-ad">{tt(ad)}{not && <> <span>· {tt(not)}</span></>}</figcaption>
      <div className="aio-yer-govde">{children}</div>
    </figure>
  );
}

/** Lig tablosu: 6 satır, 3. sırada altın isim — LeaderboardPage satırının sınıfları (düğme yerine div). */
function LigTablosu({ isim }) {
  return (
    <div className="qt-liste lg-liste aio-lig" role="list">
      {LIG_SATIRLARI.map((s) => (
        <div key={s.sira} role="listitem" className="qt-satir-kap lg-satir-kap">
          <div className="lg-satir">
            <div className="lg-satir-ac">
              <span className={`lg-sira qt-sayi${s.sira <= 3 ? ` lg-sira-${s.sira}` : ""}`}>{s.sira}</span>
              <Avatar profile={{ gorunen_ad: s.ad, gorunen_avatar: s.avatar }} boyut={40} />
              <span className="lg-bilgi">
                <span className="lg-ad">
                  <span className="lg-ad-metin">{s.altin ? isim(s.ad) : s.ad}</span>
                  <OyuncuLigAmblemi lig={s.lig} boyut={16} />
                </span>
                <span className="lg-detay">{tt("Lv {n}", { n: s.lv })}</span>
              </span>
              <span className="lg-puan">
                <span className="qt-sayi">{s.puan.toLocaleString("tr-TR")}</span>
                <span className="lg-puan-birim">{tt("puan")}</span>
              </span>
            </div>
            <span className="lg-meydan-bos" aria-hidden="true" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Sahneler({ isim }) {
  return (
    <div className="aio-yerler">
      <Yer ad="Lig tablosu" not="açık zemin · 16 px · durağan" genis>
        <LigTablosu isim={isim} />
      </Yer>

      <Yer ad="Maç şeridi" not="koyu zemin · 48 px avatar · durağan">
        <div className="qt-sahne-mac aio-mac">
          <QtMacUst
            sen={{ ad: tt("Sen"), avatarDugum: <Avatar profile={{ gorunen_ad: "Deniz", gorunen_avatar: AV("robot-k15") }} boyut={48} />, alt: <SeviyeEtiketi level={24} /> }}
            rakip={{ ad: isim(ALTIN_AD, { koyu: true }), avatarDugum: <Avatar profile={BEN} boyut={48} />, alt: <SeviyeEtiketi level={27} /> }}
            skor={[3, 2]}
          />
        </div>
      </Yer>

      <Yer ad="VS kartı" not="koyu zemin · hareketli">
        <div className="qt-sahne-mac aio-vs">
          <div className="ara-vs">
            <div className="ara-kart ara-kart--ben">
              <Avatar profile={BEN} boyut={92} />
              <span className="ara-kart-ad">{isim(ALTIN_AD, { koyu: true, hareketli: true })}</span>
              <span className="ara-kart-rozetler"><QtRozet boyut="k" ton="koyu">{tt("Lv {0}", { 0: 27 })}</QtRozet><OyuncuLigAmblemi lig="altin" boyut={24} /></span>
            </div>
            <span className="ara-vs-rozet" aria-hidden="true"><span>VS</span></span>
            <div className="ara-kart">
              <Avatar profile={RAKIP} boyut={92} />
              <span className="ara-kart-ad">{RAKIP.gorunen_ad}</span>
              <span className="ara-kart-rozetler"><QtRozet boyut="k" ton="koyu">{tt("Lv {0}", { 0: 28 })}</QtRozet><OyuncuLigAmblemi lig="altin" boyut={24} /></span>
            </div>
          </div>
        </div>
      </Yer>

      <Yer ad="Maç sonu" not="beyaz ad hapı · kazanan hareketli">
        <div className="aio-msk">
          <div className="msk-karsilasma">
            {[[BEN, "kazanan", "sol", 2], [RAKIP, "kaybeden", "sag", 0]].map(([p, rol, yan, can], i) => (
              <div key={yan} className={`msk-taraf msk-taraf--${yan} msk-taraf--${rol}`} style={{ order: i * 2 }}>
                <div className="msk-avatar">
                  {rol === "kazanan" && <span className="msk-halka" aria-hidden="true" />}
                  {rol === "kazanan" && <img className="msk-tac" src="/dukkan/tac.webp" alt="" aria-hidden="true" />}
                  <Avatar profile={p} boyut={76} />
                </div>
                <div className="msk-isim">
                  <span className="msk-isim-metin">{p === BEN ? isim(p.gorunen_ad, { acik: true, hareketli: true }) : p.gorunen_ad}</span>
                </div>
                <div className="msk-can"><QtCan dolu={can} toplam={3} etiket={p.gorunen_ad} boyut={18} /></div>
              </div>
            ))}
            <div className="msk-skor" style={{ order: 1 }}>
              <QtIkon ad="kalp" boyut={18} />
              <span className="msk-skor-sayi"><b>2</b><i>–</i><b>0</b></span>
              <span className="msk-skor-etiket">{tt("kalan can")}</span>
            </div>
          </div>
        </div>
      </Yer>

      <Yer ad="Profil başı" not="açık kart · hareketli">
        <QtKart className="qt-pf-kimlik aio-pf">
          <span className="qt-pf-avatar"><Avatar profile={BEN} boyut={88} /></span>
          <div className="qt-pf-kimlik-metin">
            <p className="qt-baslik-2 qt-pf-ad">{isim(ALTIN_AD, { hareketli: true })}</p>
            <div className="qt-pf-rozetler"><QtRozet ton="mor">{tt("Usta")}</QtRozet><QtRozet ton="koyu">{tt("Lv {n}", { n: 27 })}</QtRozet></div>
          </div>
        </QtKart>
      </Yer>
    </div>
  );
}

// Zemin şeridi: aynı isim dört zeminde; kontrast (WCAG) kontur ↔ zemin ve dolgu ↔ kontur (ölçüm: rapor).
const ZEMINLER = [
  { ad: "Kart (beyaz)", renk: "#ffffff", yazi: "#1d2152", kz: "15,1", koyu: false },
  { ad: "Gök mavisi zemin", renk: "#dff0ff", yazi: "#1d2152", kz: "13,0", koyu: false },
  { ad: "Maç sahnesi", renk: "#3b2a93", yazi: "#ffffff", dz: "5,8", koyu: true },
  { ad: "VS lacivert", renk: "#1c1454", yazi: "#ffffff", dz: "8,9", koyu: true },
];
function Zeminler({ tur }) {
  return (
    <div className="aio-zeminler">
      {ZEMINLER.map((z) => (
        <div key={z.renk} className="aio-zemin" style={{ background: z.renk, color: z.yazi }}>
          <AltinIsim tur={tur} koyu={z.koyu}>Kağan</AltinIsim>
          <small>{tt(z.ad)} · {z.kz ? tt("kontur/zemin {0}:1", { 0: z.kz }) : tt("sarı/zemin {0}:1", { 0: z.dz })}</small>
        </div>
      ))}
    </div>
  );
}

function AdayKarti({ aday, secimler, onSec }) {
  const isim = adayIle(aday.tur);
  return (
    <QtKart className="aio-kart" id={`aio-${aday.tur}`}>
      <div className="aio-kart-bas">
        <div>
          <h3 className="qt-baslik-3">{tt(aday.baslik)} <span className="aio-rozet">{aday.kod}</span></h3>
          <p className="qt-govde">{tt(TARIF[aday.tur])}</p>
        </div>
        <SecimDugmeleri kod={aday.kod} secimler={secimler} onSec={onSec} />
      </div>
      <div className="aio-kiyas">
        <div className="aio-kiyas-hucre"><small>{tt("Şimdiki (oyunda)")}</small><span>{simdiki(ALTIN_AD)}</span></div>
        <div className="aio-kiyas-hucre"><small>{tt("Bu aday")}</small><span>{isim(ALTIN_AD)}</span></div>
      </div>
      <Sahneler isim={isim} />
      <Zeminler tur={aday.tur} />
    </QtKart>
  );
}

export default function AltinIsimAdaylari({ secimler, onSec }) {
  return (
    <div className="aio">
      <header className="aio-giris">
        <h2 className="qt-baslik-2">{tt("Altın isim adayları")}</h2>
        <p className="qt-govde">{tt("Şimdiki altın isim açık zeminde koyulaştırıldığı için bronz görünüyor. Dört adayda da altın parlak sarı kalıyor; okunurluğu kalın lacivert kontur sağlıyor. Listelerde durağan, büyük yerlerde (VS, maç sonu, profil) hareketli; \"hareketi azalt\" açıksa yavaş oynar.")}</p>
      </header>

      <QtKart className="aio-kart aio-simdiki">
        <div className="aio-kart-bas">
          <div>
            <h3 className="qt-baslik-3">{tt("Şimdiki (oyunda)")} <span className="aio-rozet">isim_altin</span></h3>
            <p className="qt-govde">{tt("Karşılaştırma için: oyundaki hâli olduğu gibi (IsimEfekti). Bu bölüm oyunda hiçbir şeyi değiştirmez.")}</p>
          </div>
        </div>
        <Sahneler isim={simdiki} />
      </QtKart>

      {ADAYLAR.map((a) => <AdayKarti key={a.kod} aday={a} secimler={secimler} onSec={onSec} />)}
      <p className="aio-not">{tt("Kontrast: kontur (#1d2152) ile açık zemin arasında ≥ 13,0:1 (beyaz kartta 15,1:1); sarı dolgunun her durağı ile kontur arasında ≥ 8,1:1; koyu zeminde sarı dolgu ile zemin arasında ≥ 5,8:1 (maç sahnesi) / 8,9:1 (VS). Şimdiki koyu altın gök zemininde 3,2:1 ve normal lacivert isimle yalnız 2,6:1 fark — bu yüzden ayrışmıyordu.")}</p>
    </div>
  );
}
