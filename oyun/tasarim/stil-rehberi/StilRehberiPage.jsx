// /stil-rehberi — KALICI stil rehberi (Ida onayı 25 Eyl 2026, tasarim/SECIMLER_GORSEL_REVIZYON.md › 0 ve B9).
// Menüde yok; giriş yapmış herkese açık; tembel parça. Her yeni çizim bu sayfaya bakılarak yapılır.
// Kaynak: tasarim/BRIEF_GORSEL_REVIZYON.md › A6–A10. Örnekler OYUNDAKİ GERÇEK bileşenlerle çizilir (önizleme değil):
// çerçeve (CerceveliAvatar), lig amblemi, Madalyon rozet, unvan, coin/elmas, tek oyuncu kartı, maç şeridi.
import { useEffect } from "react";
import CerceveliAvatar from "../../components/CerceveliAvatar.jsx";
import RozetMadalyonu from "../../components/RozetMadalyonu.jsx";
import UnvanYazisi from "../../components/UnvanYazisi.jsx";
import OyuncuVitrinKarti from "../../components/OyuncuVitrinKarti.jsx";
import { SeviyeEtiketi } from "../../components/MacUstSerit.jsx";
import { CoinIkon, ElmasIkon } from "../../components/ParaIkonlari.jsx";
import { LigAmblemi } from "../premium/ligAmblemi.jsx";
import { KONTUR, KREM, MARKA, METAL, NADIRLIK, SAHNE, TAS, LEVEL } from "../gorsel-revizyon/palet.js";
import { QtKart, QtMacUst } from "../index.js";
import "./stil-rehberi.css";

const AV = [
  "/avatars/pro2/samuray-y15.svg", "/avatars/pro2/kristal-uzayli-y28.svg", "/avatars/pro2/kedili-kiz-y37.svg",
  "/avatars/pro/tilki-k04.svg", "/avatars/pro2/basortulu-y04.svg", "/avatars/pro2/savas-robotu-y30.svg",
];
const p = (i, ad = "Deniz") => ({ id: `stil-${i}`, gorunen_ad: ad, gorunen_avatar: AV[i % AV.length] });

const KURALLAR = [
  ["Referans", "Profil avatarlarının çizim dili. Her yeni çizim onların yanına konunca aynı elden çıkmış gibi durur."],
  ["Kontur", "Kalın koyu lacivert #0b1220 — avatarlarla aynı oran. 28 px ve altında kalınlaşır, iç ayrıntı azalır."],
  ["Dolgu", "Düz renk + 2–3 ton hücre gölgesi (açık · orta · koyu). Fotogerçekçi degrade ve 3B plastik parlaklık yok."],
  ["Işık", "Hep sol üstten: açık yüzler sol üstte, koyu yüzler sağ altta. Tek beyaz parlama vuruşu (sol üst)."],
  ["Metal", "Her metal kendi 3 tonuyla + kenar tonu. Altın = canlı sarı (altın isim tonu), soluk hardal değil."],
  ["Kademe", "Kademe renkle değil ŞEKİL ve SÜSLE ayrışır; siyah siluette ve gri tonda bile okunur. Renk yardımcıdır."],
  ["Nadirlik", "Renk eşyaya değil kartın kenarına ve etiketine konur: Sıradan gri · Nadir yeşil · Epik keskin mor · Efsanevi altın."],
  ["Hareket", "Yalnız transform/opacity (en gösterişlilerde WebGL); ekran dışında durur; listelerde durağan. 'Hareketi azalt'ta durmaz, 2,5× yavaşlar; flaş, şimşek, konfeti kapanır."],
  ["Boylar", "Avatar+çerçeve: ana sayfa 64 · maç şeridi 48 · lig tablosu 40 · maç sonu 76 · profil 88. Rozet/amblem 20–24 (isim yanı) ve 64 (vitrin). Coin/elmas 16–20 ve 48."],
  ["Kalite kapısı", "Siluet · küçük boy · gri ton · set · 6 avatar yanında · hedef kalite (avatarlar, premium çerçeveler) · mobilde hareket. Biri geçmezse çizim girmez."],
];

const Renk = ({ r, ad }) => <span className="sr-renk"><i style={{ background: r }} /><small>{ad}</small></span>;
const Grup = ({ baslik, renkler }) => (
  <div className="sr-palet-grup"><b>{baslik}</b><div>{renkler.map(([ad, r]) => <Renk key={ad + r} r={r} ad={ad} />)}</div></div>
);
const Bolum = ({ baslik, children, not }) => (
  <QtKart as="section" className="sr-bolum">
    <h2 className="qt-baslik-3">{baslik}</h2>
    {not && <p className="qt-kucuk qt-soluk">{not}</p>}
    {children}
  </QtKart>
);
const Cer = ({ anahtar, i, boyut = 76, hareketli = false }) => (
  <CerceveliAvatar profile={p(i)} cerceve={anahtar} aura={null} premiumCerceve={null} premiumAura={null} boyut={boyut} hareketli={hareketli} />
);

const ORNEK_KART = {
  id: "stil-kart", ad: "KaraKartalAfyonlu34", avatar: AV[0], level: 64, lig: "altin", cerceve: "lig_altin", cerceve_nadirlik: "nadir",
  vitrin: [
    { anahtar: "duello_250", grup: "duello", kademe: "altin", ikon: "sword" },
    { anahtar: "ustalik_tarih_750", grup: "ustalik", kademe: "elmas", ikon: "kategori:tarih" },
    { anahtar: "seri_30", grup: "seri", kademe: "gumus", ikon: "fire" },
  ],
  aura: null, isim_efekti: "isim_altin", premium_cerceve: null, premium_aura: null,
  unvan: { tur: "sehir", sehir: "Afyonkarahisar", ulke: "TR" },
};

export default function StilRehberiPage() {
  useEffect(() => { document.title = "Quiz Tactics — Stil rehberi"; }, []);
  return (
    <div className="qt-sayfa sr-sayfa">
      <main className="qt-sayfa-ic sr-ic">
        <header className="sr-giris">
          <h1 className="qt-baslik-1">Stil rehberi</h1>
          <p className="qt-govde">Oyundaki bütün çizimlerin tek dili. Yeni bir çizim bu kurallara ve aşağıdaki örneklere bakılarak yapılır; uymayan eski çizim yeniden çizilir ya da hizalanır.</p>
        </header>

        <Bolum baslik="Aynı elden" not="6 gerçek avatar + oyundaki yeni coin, elmas, lig çerçevesi, rozet, lig amblemi.">
          <div className="sr-sahne">
            {AV.map((src) => <img key={src} src={src} alt="" width="64" height="64" loading="lazy" decoding="async" />)}
            <Cer anahtar="lig_altin" i={2} boyut={88} hareketli />
            <CoinIkon boyut={48} etiket="Coin" />
            <ElmasIkon boyut={48} etiket="Elmas" />
            <RozetMadalyonu anahtar="klasik_500" grup="klasik" kademe="altin" ikon="trophy" boyut={64} />
            <LigAmblemi lig="altin" boyut={64} hareketli />
          </div>
        </Bolum>

        <Bolum baslik="Kurallar">
          <ul className="sr-kurallar">{KURALLAR.map(([b, m]) => <li key={b}><b>{b}</b><span>{m}</span></li>)}</ul>
        </Bolum>

        <Bolum baslik="Ortak palet" not="Kaynak: oyun/tasarim/gorsel-revizyon/palet.js — her yeni çizim YALNIZ bu renklerden.">
          <div className="sr-palet">
            <Grup baslik="Kontur · parlama · krem" renkler={[["kontur", KONTUR], ["parlama", "#ffffff"], ["krem", KREM]]} />
            {Object.entries(METAL).map(([ad, m]) => <Grup key={ad} baslik={ad} renkler={[["açık", m.acik], ["orta", m.orta], ["koyu", m.koyu], ["kenar", m.kenar]]} />)}
            {Object.entries(LEVEL).map(([ad, m]) => <Grup key={ad} baslik={`level ${ad}`} renkler={[["açık", m.acik], ["orta", m.orta], ["koyu", m.koyu], ["kenar", m.kenar]]} />)}
            <Grup baslik="taşlar" renkler={Object.entries(TAS)} />
            <Grup baslik="sahne zeminleri" renkler={Object.entries(SAHNE)} />
            <Grup baslik="marka" renkler={Object.entries(MARKA)} />
            <Grup baslik="nadirlik" renkler={Object.entries(NADIRLIK).map(([k, n]) => [k, n.renk])} />
          </div>
        </Bolum>

        <Bolum baslik="Kazanılan çerçeveler" not="Lig: Defne ve Taç · Level: Altıgen Madalya · Turnuva Şampiyonu: Kupa Tepesi. Kademe şekille büyür.">
          <div className="sr-sira sr-koyu">
            {["lig_gumus", "lig_altin", "lig_elmas", "lig_efsane"].map((k, i) => <Cer key={k} anahtar={k} i={i} />)}
          </div>
          <div className="sr-sira sr-koyu">
            {["level_25", "level_50", "level_75", "level_100", "turnuva_sampiyon"].map((k, i) => <Cer key={k} anahtar={k} i={i + 1} boyut={64} />)}
          </div>
        </Bolum>

        <Bolum baslik="Boy kuralı" not="Aynı çizim büyük ve küçük boyda; küçükte iç ayrıntı azalır, kontur kalınlaşır, kademe siluetle okunur.">
          <div className="sr-sira sr-koyu">
            {["lig_gumus", "lig_altin", "lig_elmas", "lig_efsane"].map((k, i) => <Cer key={k} anahtar={k} i={i} boyut={40} />)}
            {["level_25", "level_50", "level_75", "level_100"].map((k, i) => <Cer key={k} anahtar={k} i={i} boyut={40} />)}
          </div>
          <div className="sr-sira">
            {["bronz", "gumus", "altin", "elmas", "efsane"].map((l) => <LigAmblemi key={l} lig={l} boyut={20} />)}
            {["bronz", "gumus", "altin", "elmas"].map((k) => <RozetMadalyonu key={k} anahtar="seri_30" grup="seri" kademe={k} ikon="fire" boyut={24} />)}
            <CoinIkon boyut={16} /><ElmasIkon boyut={16} />
          </div>
          <div className="sr-sira sr-siluet">
            {["bronz", "gumus", "altin", "elmas", "efsane"].map((l) => <LigAmblemi key={l} lig={l} boyut={24} />)}
          </div>
        </Bolum>

        <Bolum baslik="Rozet: amblem × seviye" not="Seviye 1 yalın · 2 kurdele · 3 defne · 4 taç + taş + ışıltı. Aynı gruptaki kardeşler eşik rakamıyla ayrışır.">
          <div className="sr-sira">
            {[["bronz", 5], ["gumus", 20], ["altin", 40], ["elmas", 75]].map(([k, n]) => (
              <RozetMadalyonu key={k} anahtar={`level_${n}`} grup="level" kademe={k} ikon="star" boyut={64} hareketli />
            ))}
          </div>
        </Bolum>

        <Bolum baslik="Unvan (Kurdele) ve tek oyuncu kartı" not="Kart her yerde aynı: avatar + çerçeve + isim + unvan + lig + level + 3 vitrin rozeti. Uzun ad ve unvan sığmazsa '…'.">
          <div className="sr-sira">
            <UnvanYazisi unvan={{ tur: "sehir", sehir: "Balıkesir" }} />
            <UnvanYazisi tur="lig" metin="Efsane Lig Şampiyonu" />
            <UnvanYazisi tur="basari" metin="Tarih Ustası" />
          </div>
          <OyuncuVitrinKarti kart={ORNEK_KART} profile={{ id: "stil-kart", gorunen_ad: ORNEK_KART.ad, gorunen_avatar: ORNEK_KART.avatar }} boyut={88} hareketli />
          <div className="qt-sahne-mac sr-mac">
            <QtMacUst
              sen={{ ad: "Sen", avatarDugum: <Cer anahtar="level_75" i={3} boyut={48} />, alt: <SeviyeEtiketi level={42} lig="elmas" unvan={{ tur: "basari", tr: "Tarih Ustası", en: "History Master" }} /> }}
              rakip={{ ad: "KaraKartalAfyonlu34", avatarDugum: <Cer anahtar="lig_altin" i={0} boyut={48} />, alt: <SeviyeEtiketi level={64} lig="altin" unvan={{ tur: "sehir", sehir: "Afyonkarahisar" }} /> }}
              skor={[3, 2]}
            />
          </div>
        </Bolum>
      </main>
    </div>
  );
}
