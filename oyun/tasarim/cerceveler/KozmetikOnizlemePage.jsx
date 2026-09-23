// /kozmetik-onizleme — bütün çerçeveler ve rozet madalyonları 24 / 40 / 64 / 120 px'te yan yana.
// Menüde yok, girişsiz açılır (BildimApp › bagimsizModul). Sunucuya bağlanmaz; avatarlar sabit.
// Bu sayfa kalite kontrolü içindir: ekranda-en-çok-3-hareket sınırı burada bilerek atlanır (sinirsiz).
import { useEffect, useState } from "react";
import Avatar from "../../../src/components/Avatar.jsx";
import CerceveGorseli, { icBoyut } from "./CerceveGorseli.jsx";
import { CERCEVE_TANIMLARI, NADIRLIK_ADI } from "./tanimlar.js";
import RozetMadalyonu, { KADEMELER } from "../../components/RozetMadalyonu.jsx";
import { QtAnahtar, QtKart } from "../index.js";
import { tt } from "../../lib/dil.js";
import "./onizleme.css";

const BOYUTLAR = [24, 40, 64, 120];
const AVATARLAR = ["kedi-k01", "tilki-k04", "robot-k15", "ninja-k18", "ejderha-k11", "kral-k31", "astronot-k17", "penguen-k06"];
const avatarProfili = (i) => ({ gorunen_ad: "Deniz", gorunen_avatar: `/avatars/pro/${AVATARLAR[i % AVATARLAR.length]}.svg` });

const KADEME_ADI = { bronz: "Bronz", gumus: "Gümüş", altin: "Altın", elmas: "Elmas" };
const ROZET_GRUPLARI = [
  ["level", "Level"], ["klasik", "Klasik galibiyet"], ["duello", "Düello galibiyet"], ["seri", "Günlük seri"],
  ["kategori", "Kategori ustalığı"], ["turnuva", "Turnuva"], ["lig", "Lig"], ["ozel", "Özel an"], ["sosyal", "Sosyal"],
];

const BOLUMLER = [
  { baslik: "Dükkân · Sıradan", aciklama: "Sade ama temiz, durağan: Bulut · Çiçek Bahçesi · Neon Çizgi.", filtre: (t) => t.tur === "nadirlik" && t.malzeme === "siradan" },
  { baslik: "Dükkân · Nadir", aciklama: "Hafif parıltı: Buz Kristali · Okyanus Dalgası · Yıldız Tozu.", filtre: (t) => t.tur === "nadirlik" && t.malzeme === "nadir" },
  { baslik: "Dükkân · Epik", aciklama: "Belirgin süs, 7 sn'de bir parıltı: Ejder Pulu · Şimşek · Gezegen Halkası.", filtre: (t) => t.tur === "nadirlik" && t.malzeme === "epik" },
  { baslik: "Dükkân · Efsanevi", aciklama: "Sürekli canlı efekt + seyrek kıvılcım: Alev Kanatları · Kraliyet · Kozmik.", filtre: (t) => t.tur === "nadirlik" && t.malzeme === "efsanevi" },
  { baslik: "Lig çerçeveleri", aciklama: "Lig atlayınca kazanılır, satılmaz. Gümüş: kalkan + defne · Altın: defne + taç · Elmas: kristal uçlar + ışık kırılması · Efsane: alev aurası + taç.", filtre: (t) => t.tur === "lig" },
  { baslik: "Level çerçeveleri", aciklama: "Level 25 · 50 · 75 · 100 rozetiyle gelir. Alt plakada level, yıldız sayısı artar; 100'de altın kanatlar.", filtre: (t) => t.tur === "level" },
];

function CerceveSatiri({ anahtar, tanim, i, hareket }) {
  return (
    <li className="ko-satir">
      <div className="ko-satir-bas">
        <strong className="ko-ad">{tanim ? tt(tanim.ad) : tt("Çerçevesiz")}</strong>
        {tanim?.tur === "nadirlik" && (
          <span className="ko-nadirlik" data-nadirlik={tanim.malzeme}>{tt(NADIRLIK_ADI[tanim.malzeme])}</span>
        )}
        {tanim && <code className="ko-anahtar">{anahtar}</code>}
      </div>
      <div className="ko-boyutlar">
        {BOYUTLAR.map((b) => (
          <div key={b} className="ko-hucre" style={{ "--ko-b": `${b}px` }}>
            <CerceveGorseli anahtar={anahtar} boyut={b} hareketli={hareket} sinirsiz>
              <Avatar profile={avatarProfili(i)} boyut={icBoyut(b, !!tanim)} />
            </CerceveGorseli>
            <span className="ko-px">{b}</span>
          </div>
        ))}
      </div>
    </li>
  );
}

export default function KozmetikOnizlemePage() {
  const [hareket, setHareket] = useState(true);
  const [koyu, setKoyu] = useState(false);

  useEffect(() => { document.title = "Quiz Tactics — " + tt("Kozmetik Önizleme"); }, []);

  const girdiler = Object.entries(CERCEVE_TANIMLARI);

  return (
    <div className={`qt-sayfa ko-sayfa${koyu ? " qt-sahne-mac ko-koyu" : ""}`}>
      <main className="qt-sayfa-ic ko-ic">
        <header className="ko-giris">
          <h1 className="qt-baslik-1">{tt("Kozmetik Önizleme")}</h1>
          <p className="qt-govde qt-soluk-zemin">
            {tt("Bütün çerçeveler ve rozet madalyonları 24 / 40 / 64 / 120 px'te. 40–55 px'te yalnız ana süsler çizilir; 40 px altında süs ve hareket kapanır, yalnız renkli halka kalır.")}
          </p>
          <div className="ko-ayarlar">
            <QtAnahtar acik={hareket} onDegis={setHareket} etiket={tt("Hareket")}
              aciklama={tt("Oyunda ekranda en çok 3 çerçeve oynar; bu sayfada sınır yok.")} />
            <QtAnahtar acik={koyu} onDegis={setKoyu} etiket={tt("Maç zemini")}
              aciklama={tt("Çerçeveleri koyu maç sahnesinde gör.")} />
          </div>
        </header>

        <section className="ko-bolum" aria-labelledby="ko-cerceveler">
          <h2 id="ko-cerceveler" className="qt-baslik-2">{tt("Çerçeveler")}</h2>
          {BOLUMLER.map((bl) => (
            <QtKart key={bl.baslik} dolgu="o" className="ko-kart">
              <h3 className="qt-baslik-3">{tt(bl.baslik)}</h3>
              <p className="qt-kucuk qt-soluk">{tt(bl.aciklama)}</p>
              <ul className="ko-liste">
                {girdiler.filter(([, t]) => bl.filtre(t)).map(([k, t], i) => (
                  <CerceveSatiri key={k} anahtar={k} tanim={t} i={i + bl.baslik.length} hareket={hareket} />
                ))}
              </ul>
            </QtKart>
          ))}
          <QtKart dolgu="o" className="ko-kart">
            <h3 className="qt-baslik-3">{tt("Çerçevesiz")}</h3>
            <p className="qt-kucuk qt-soluk">{tt("Takılı çerçevesi olmayan oyuncu: ince beyaz halka.")}</p>
            <ul className="ko-liste"><CerceveSatiri anahtar={null} tanim={null} i={2} hareket={false} /></ul>
          </QtKart>
        </section>

        <section className="ko-bolum" aria-labelledby="ko-rozetler">
          <h2 id="ko-rozetler" className="qt-baslik-2">{tt("Rozetler")}</h2>
          <p className="qt-govde qt-soluk-zemin">
            {tt("Kademe yalnız renkle değil, alt kenardaki nokta sayısıyla da okunur: bronz 1 · gümüş 2 · altın 3 · elmas 4.")}
          </p>
          {ROZET_GRUPLARI.map(([grup, ad]) => (
            <QtKart key={grup} dolgu="o" className="ko-kart">
              <h3 className="qt-baslik-3">{tt(ad)}</h3>
              <ul className="ko-liste">
                {KADEMELER.map((k) => (
                  <li key={k} className="ko-satir">
                    <div className="ko-satir-bas"><strong className="ko-ad">{tt(KADEME_ADI[k])}</strong></div>
                    <div className="ko-boyutlar">
                      {BOYUTLAR.map((b) => (
                        <div key={b} className="ko-hucre" style={{ "--ko-b": `${b}px` }}>
                          <RozetMadalyonu grup={grup} kademe={k} boyut={b} etiket={`${tt(ad)} · ${tt(KADEME_ADI[k])}`} />
                          <span className="ko-px">{b}</span>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </QtKart>
          ))}
          <QtKart dolgu="o" className="ko-kart">
            <h3 className="qt-baslik-3">{tt("Gizli ve kilitli")}</h3>
            <ul className="ko-liste">
              <li className="ko-satir">
                <div className="ko-satir-bas"><strong className="ko-ad">{tt("Gizli (kazanılmadı)")}</strong></div>
                <div className="ko-boyutlar">
                  {BOYUTLAR.map((b) => (
                    <div key={b} className="ko-hucre" style={{ "--ko-b": `${b}px` }}>
                      <RozetMadalyonu grup="gizli" gizli boyut={b} etiket={tt("Gizli rozet")} />
                      <span className="ko-px">{b}</span>
                    </div>
                  ))}
                </div>
              </li>
              <li className="ko-satir">
                <div className="ko-satir-bas"><strong className="ko-ad">{tt("Kilitli (soluk)")}</strong></div>
                <div className="ko-boyutlar">
                  {BOYUTLAR.map((b, i) => (
                    <div key={b} className="ko-hucre" style={{ "--ko-b": `${b}px` }}>
                      <RozetMadalyonu grup="duello" kademe={KADEMELER[i]} kilitli boyut={b} etiket={tt("Kilitli rozet")} />
                      <span className="ko-px">{b}</span>
                    </div>
                  ))}
                </div>
              </li>
            </ul>
          </QtKart>
        </section>
      </main>
    </div>
  );
}
