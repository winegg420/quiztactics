// Bölüm 4 — Tek oyuncu kartı (A5.9): avatar + çerçeve + arka plan + isim + unvan + vitrin rozetleri + lig amblemi + level,
// her yerde aynı kart. Gerçek bileşenler: CerceveliAvatar (premium Kraliyet 2. tur + Yıldızlı Gece arka planı; rakipte Sakura),
// AltinIsim (Işık Şeritli altın isim), VitrinRozetleri (bugünkü rozetler — yeni rozet sistemi Bölüm 10'da), lig amblemi
// Ajan A'nın Bölüm 9 Set A çizimi (a/cizim/lig.jsx). En uzun durum: 19 harfli ad + "Afyonkarahisar Şampiyonu" unvanı.
import CerceveliAvatar from "../../../components/CerceveliAvatar.jsx";
import { AltinIsim } from "../../../components/IsimEfekti.jsx";
import VitrinRozetleri from "../../../components/VitrinRozetleri.jsx";
import { LigAmblemiA } from "../a/cizim/lig.jsx";
import { GrBolum, GrAday } from "../secim.jsx";
import { Unvan } from "./cizim/unvan.jsx";
import { AVATARLAR, Alt, useIc } from "./ortak.jsx";
import "../../../pages/lig-a.css";

const LIG_AD = { bronz: "Bronz", gumus: "Gümüş", altin: "Altın", elmas: "Elmas", efsane: "Efsane" };

export const BEN = {
  id: "grb-ben", gorunen_ad: "KaraKartalAfyonlu34", gorunen_avatar: AVATARLAR[0],
  unvan: { tur: "sehir", metin: "Afyonkarahisar Şampiyonu" }, lig: "altin", lv: 64, pc: "pc_kraliyet2", pa: "pa_gece", altin: true,
  vitrin: [
    { anahtar: "r1", grup: "duello", kademe: "altin", ikon: "sword", ad: "Düello Ustası" },
    { anahtar: "r2", grup: "kategori", kademe: "elmas", ikon: "kategori:tarih", ad: "Tarih Ustası" },
    { anahtar: "r3", grup: "seri", kademe: "gumus", ikon: "fire", ad: "30 Gün Seri" },
  ],
};
export const RAKIP = {
  id: "grb-rakip", gorunen_ad: "Zeynep", gorunen_avatar: AVATARLAR[4],
  unvan: { tur: "basari", metin: "Tarih Ustası" }, lig: "elmas", lv: 58, pc: "pc_sakura", pa: null, altin: false,
  vitrin: [
    { anahtar: "q1", grup: "turnuva", kademe: "altin", ikon: "crown", ad: "Turnuva Şampiyonu" },
    { anahtar: "q2", grup: "klasik", kademe: "gumus", ikon: "trophy", ad: "100 Galibiyet" },
  ],
};
const KOMSULAR = [
  { id: "grb-k1", gorunen_ad: "Elif", gorunen_avatar: AVATARLAR[2], unvan: { tur: "sezon", metin: "Sezon 1 Efsanesi" }, lig: "altin", lv: 71, pc: null, pa: null },
  { id: "grb-k2", gorunen_ad: "Kaan", gorunen_avatar: AVATARLAR[5], unvan: { tur: "lig", metin: "Altın Lig Fatihi" }, lig: "altin", lv: 49, pc: null, pa: "pa_kuzey" },
];

function OyuncuAvatari({ o, boyut, hareketli }) {
  return <CerceveliAvatar profile={o} boyut={boyut} hareketli={hareketli} cerceve={null} aura={null} premiumCerceve={o.pc} premiumAura={o.pa} />;
}
function Ad({ o, hareketli, koyu }) {
  return o.altin ? <AltinIsim hareketli={hareketli} koyu={koyu}>{o.gorunen_ad}</AltinIsim> : <span className="grb-ok-duzad">{o.gorunen_ad}</span>;
}
function LigBilgi({ o, boyut = 22, yazi = true }) {
  return <span className="grb-ok-lig"><LigAmblemiA lig={o.lig} boyut={boyut} />{yazi && <span>{LIG_AD[o.lig]} Lig</span>}</span>;
}
const Lv = ({ o }) => <span className="grb-ok-lv">Lv {o.lv}</span>;

// ================================================================== A — Vitrin kartı (dikey)
export function KartA({ o, boyut = 88, hareketli = false, kompakt = false }) {
  return (
    <div className={`grb-ok grb-ok--a${kompakt ? " grb-ok--kompakt" : ""}`}>
      <div className="grb-ok-avatar"><OyuncuAvatari o={o} boyut={boyut} hareketli={hareketli} /></div>
      <div className="grb-ok-ad"><Ad o={o} hareketli={hareketli} koyu /></div>
      <Unvan tur={o.unvan.tur} stil="kurdele" boy={kompakt ? "k" : "o"}>{o.unvan.metin}</Unvan>
      <div className="grb-ok-satir"><LigBilgi o={o} boyut={kompakt ? 20 : 24} yazi={!kompakt} /><Lv o={o} /></div>
      <VitrinRozetleri vitrin={o.vitrin} boyut={kompakt ? 26 : 34} />
    </div>
  );
}
// ================================================================== B — Yatay plaka
export function KartB({ o, boyut = 76, hareketli = false, ters = false, koyu = false }) {
  return (
    <div className={`grb-ok grb-ok--b${ters ? " grb-ok--ters" : ""}${koyu ? " grb-ok--bkoyu" : ""}`}>
      <div className="grb-ok-avatar"><OyuncuAvatari o={o} boyut={boyut} hareketli={hareketli} /></div>
      <div className="grb-ok-govde">
        <div className="grb-ok-adsatir"><Ad o={o} hareketli={hareketli} koyu={koyu} /><LigAmblemiA lig={o.lig} boyut={20} /></div>
        <Unvan tur={o.unvan.tur} stil="isik" koyu={koyu} boy="k">{o.unvan.metin}</Unvan>
        <div className="grb-ok-satir"><Lv o={o} /><VitrinRozetleri vitrin={o.vitrin} boyut={24} /></div>
      </div>
    </div>
  );
}

// İç (elenen) adaylar — yalnız ?ic=1
function KartC({ o }) {
  return (
    <div className="grb-ok grb-ok--c">
      <div className="grb-ok-bant" />
      <div className="grb-ok-avatar"><OyuncuAvatari o={o} boyut={76} /></div>
      <div className="grb-ok-govde"><Ad o={o} koyu /><Unvan tur={o.unvan.tur} stil="kurdele" boy="k">{o.unvan.metin}</Unvan>
        <div className="grb-ok-satir"><LigBilgi o={o} /><Lv o={o} /><VitrinRozetleri vitrin={o.vitrin} boyut={24} /></div></div>
    </div>
  );
}
function KartD({ o }) {
  return <span className="grb-ok grb-ok--d"><OyuncuAvatari o={o} boyut={40} /><Ad o={o} /><LigAmblemiA lig={o.lig} boyut={18} /><Lv o={o} /></span>;
}

const VsDisk = () => <span className="grb-vs" aria-hidden="true">VS</span>;

/** Lig tablosu satırı (gerçek lg- sınıfları, 40 px, durağan): stil "a" kurdele unvan, "b" ışık yazısı unvan. */
function LigSatirlari({ stil }) {
  const liste = [[KOMSULAR[0], 3, 1840], [BEN, 4, 1790], [KOMSULAR[1], 5, 1715]];
  return (
    <div className="qt-liste lg-liste grb-lig" role="list">
      {liste.map(([o, sira, puan]) => (
        <div key={sira} role="listitem" className={`qt-satir-kap lg-satir-kap${o === BEN ? " qt-satir-kap--vurgulu lg-ben" : ""}`}>
          <div className="lg-satir">
            <div className="lg-satir-ac">
              <span className="lg-sira qt-sayi">{sira}</span>
              <OyuncuAvatari o={o} boyut={40} hareketli={false} />
              <span className="lg-bilgi grb-ok-lgbilgi">
                <span className="lg-ad"><span className="lg-ad-metin grb-ok-lgad">
                  {o.altin ? <AltinIsim>{o.gorunen_ad}</AltinIsim> : o.gorunen_ad}
                  <LigAmblemiA lig={o.lig} boyut={18} />
                </span></span>
                <Unvan tur={o.unvan.tur} stil={stil === "a" ? "kurdele" : "isik"} boy="k">{o.unvan.metin}</Unvan>
              </span>
              <span className="lg-puan"><span className="qt-sayi">{puan.toLocaleString("tr-TR")}</span><span className="lg-puan-birim">Lv {o.lv}</span></span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Yerler({ stil }) {
  const A = stil === "a";
  return (
    <div className="grb-kart-yer">
      <Alt baslik="Profil kartı — 88 px, hareketli">
        <div className="grb-ok-profil">{A ? <KartA o={BEN} boyut={88} hareketli /> : <KartB o={BEN} boyut={88} hareketli />}</div>
      </Alt>
      <Alt baslik="VS ekranı — koyu sahne">
        <div className={`qt-sahne-mac grb-ok-vs grb-ok-vs--${stil}`}>
          {A ? (<><KartA o={BEN} boyut={76} kompakt /><VsDisk /><KartA o={RAKIP} boyut={76} kompakt /></>)
            : (<><KartB o={BEN} boyut={64} koyu /><VsDisk /><KartB o={RAKIP} boyut={64} koyu ters /></>)}
        </div>
      </Alt>
      <Alt baslik="Lig tablosu satırı — 40 px, durağan">
        <LigSatirlari stil={stil} />
      </Alt>
    </div>
  );
}

export default function B4Kart() {
  const ic = useIc();
  return (
    <GrBolum no={4} baslik="Tek oyuncu kartı" tur="sec"
             aciklama="Avatar, premium çerçeve (Kraliyet), arka plan (Yıldızlı Gece), Işık Şeritli altın isim, unvan, vitrin rozetleri, lig amblemi ve level tek kartta. En zor durum: 19 harfli ad + 'Afyonkarahisar Şampiyonu'. Profil kartında, VS ekranında ve lig tablosu satırında aynı kart; 360 px'te taşma yok (sığmayan ad/unvan '…' ile kısalır)."
             ic={4} gosterilen={2}
             elenen="C Afiş (geniş lig renkli bant + avatar kenardan taşan: VS'de iki afiş 360 px'e sığmadı, bant rengi lig çerçevesiyle yarıştı) · D Çip (tek satır hap: unvan ve rozetler sığmadı, 'her yerde aynı kart' olamadı)"
             zayif="Vitrin rozetleri bugünkü (eski) rozet çizimi — yeni rozet sistemi Bölüm 10'da seçilince kart onu kullanır. Lig amblemi Ajan A'nın Bölüm 9 Set A adayı. 360 px'te uzun ad VS'de (A) ve profil plakasında (B) '…' ile kısalıyor; unvan profilde iki satıra iniyor.">
      <GrAday kod="kart-a" baslik="A — Vitrin kartı (dikey)" genis
              fikir="Her şey ortada, yukarıdan aşağı: çerçeveli avatar → altın isim → kurdele unvan → lig + level → 3 vitrin rozeti. VS'de iki kart yan yana, aralarında VS diski."
              testler={{ avatar: true, hedef: true, mobil: true }}>
        <Yerler stil="a" />
      </GrAday>
      <GrAday kod="kart-b" baslik="B — Yatay plaka" genis
              fikir="Avatar solda, bilgiler sağda üç satır: altın isim + lig amblemi · ışık yazısı unvan · level + rozetler. VS'de iki plaka üst üste (rakip aynalı) — telefonda adlar tam genişlik alır, kısalma daha az."
              testler={{ avatar: true, hedef: true, mobil: true }}>
        <Yerler stil="b" />
      </GrAday>
      {ic && (
        <GrAday kod="ic-c" baslik="(iç) C — Afiş / D — Çip" genis>
          <div className="qt-sahne-mac grb-ok-vs grb-ok-vs--b"><KartC o={BEN} /><VsDisk /><KartC o={RAKIP} /></div>
          <div className="grb-sahne"><KartD o={BEN} /><KartD o={RAKIP} /></div>
        </GrAday>
      )}
    </GrBolum>
  );
}
