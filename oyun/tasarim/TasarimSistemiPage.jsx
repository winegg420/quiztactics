// /tasarim-sistemi — Quiz Tactics tasarım sisteminin canlı örnek sayfası.
// Menüde yok; giriş + yalnız sahip (BildimApp › SahipKapisi). Sunucuya bağlanmaz;
// bütün veriler sahtedir. Token değerleri ve kontrast oranları CSS'ten canlı okunur.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  QtIkon,
  QT_IKON_ADLARI,
  QtDugme,
  QtIkonDugme,
  QtKart,
  QtRozet,
  QtLigRozeti,
  QtCip,
  QtSekmeler,
  QtAnahtar,
  QtIlerleme,
  QtAvatar,
  QtCoinHapi,
  QtListe,
  QtListeSatiri,
  QtBosDurum,
  QtIskelet,
  QtMarka,
  QtUstCubuk,
  QtAltMenu,
  QtModal,
  QtToast,
  QtToastYuvasi,
  QtModKart,
  QtSik,
  QtSikler,
  QtSayac,
  QtCan,
  QtSkill,
  QtSkillCubugu,
  QtSoruKarti,
  QtMacUst,
  QtEtki,
  QtSonucBandi,
  QT_KIRILMA_MS,
  QT_KART_CIKIS_MS,
  titresim,
} from "./index.js";
import { KONTRAST_CIFTLERI, kontrastOrani } from "./kontrast.js";
import { tt } from "../lib/dil.js";
import "./ornek.css";
import SkillRozeti from "../components/SkillRozeti.jsx";
import CoinPaketGorseli from "../components/CoinPaketGorseli.jsx";

const AVATAR_SEN = "/avatars/pro/tilki-k04.svg";
const AVATAR_RAKIP = "/avatars/pro/baykus-k03.svg";

// ——— Renk grupları (değer CSS'ten okunur) ———
const RENK_GRUPLARI = [
  ["Zemin ve yüzey", ["--qt-zemin", "--qt-zemin-2", "--qt-zemin-metin", "--qt-zemin-soluk", "--qt-yuzey", "--qt-yuzey-2", "--qt-yuzey-3", "--qt-metin", "--qt-metin-soluk", "--qt-cizgi", "--qt-cizgi-guclu"]],
  ["Vurgu", ["--qt-vurgu", "--qt-vurgu-dudak", "--qt-vurgu-acik", "--qt-ikinci", "--qt-ikinci-dudak", "--qt-ikinci-acik", "--qt-ikinci-koyu"]],
  ["Durum", ["--qt-dogru", "--qt-dogru-koyu", "--qt-dogru-acik", "--qt-yanlis", "--qt-yanlis-koyu", "--qt-yanlis-acik", "--qt-uyari", "--qt-uyari-koyu", "--qt-uyari-acik", "--qt-bilgi", "--qt-bilgi-koyu", "--qt-bilgi-acik"]],
  ["Coin", ["--qt-coin", "--qt-coin-dudak", "--qt-coin-yazi", "--qt-coin-acik"]],
  ["Modlar", ["--qt-mod-klasik", "--qt-mod-duello", "--qt-mod-turnuva", "--qt-mod-grup", "--qt-mod-saf"]],
  ["Ligler", ["--qt-lig-bronz", "--qt-lig-gumus", "--qt-lig-altin", "--qt-lig-elmas", "--qt-lig-efsane"]],
  ["Maç sahnesi", ["--qt-mac-zemin", "--qt-mac-zemin-2", "--qt-mac-metin", "--qt-mac-soluk"]],
];

const YAZI_OLCEGI = [
  ["--qt-y-4xl", "baslik", "44 · 3:2"],
  ["--qt-y-3xl", "baslik", "Maç sonu"],
  ["--qt-y-2xl", "baslik", "Arkadaşlar"],
  ["--qt-y-xl", "baslik", "Güneş'e en yakın gezegen hangisidir?"],
  ["--qt-y-l", "govde", "Merkür · Düğme · Şık"],
  ["--qt-y-m", "govde", "Gövde yazısı: kısa, net, oyuncunun dilinde."],
  ["--qt-y-s", "govde", "İkincil bilgi · 2g 14s kaldı"],
  ["--qt-y-xs", "govde", "ROZET · ALT MENÜ"],
];

const BOSLUKLAR = ["--qt-b-1", "--qt-b-2", "--qt-b-3", "--qt-b-4", "--qt-b-5", "--qt-b-6", "--qt-b-8", "--qt-b-10", "--qt-b-12", "--qt-b-16"];
const KOSELER = ["--qt-r-s", "--qt-r-m", "--qt-r-l", "--qt-r-xl", "--qt-r-hap"];

const BOLUMLER = [
  ["renkler", "Renkler"],
  ["kontrast", "Kontrast"],
  ["yazi", "Yazı"],
  ["olcu", "Ölçüler"],
  ["ikonlar", "İkonlar"],
  ["rozetler", "Skill ve paket"],
  ["dugmeler", "Düğmeler"],
  ["kartlar", "Kartlar"],
  ["parcalar", "Küçük parçalar"],
  ["liste", "Liste ve durumlar"],
  ["katmanlar", "Modal ve bildirim"],
  ["mac", "Maç"],
  ["kabuk", "Üst çubuk ve menü"],
];

function cssDegeri(ad) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(ad).trim();
  } catch {
    return "";
  }
}

function Bolum({ id, baslik, aciklama, children }) {
  return (
    <section id={id} className="qt-ornek-bolum" aria-labelledby={`${id}-b`}>
      <h2 id={`${id}-b`} className="qt-baslik-1">{tt(baslik)}</h2>
      {aciklama && <p className="qt-govde qt-soluk-zemin qt-ornek-aciklama">{tt(aciklama)}</p>}
      {children}
    </section>
  );
}

// ——————————————— Renkler ve kontrast ———————————————
function Renkler() {
  const [degerler, setDegerler] = useState({});
  useEffect(() => {
    const d = {};
    RENK_GRUPLARI.forEach(([, liste]) => liste.forEach((ad) => (d[ad] = cssDegeri(ad))));
    setDegerler(d);
  }, []);
  return (
    <div className="qt-ornek-renk-gruplari">
      {RENK_GRUPLARI.map(([grup, liste]) => (
        <div key={grup}>
          <h3 className="qt-baslik-3 qt-ornek-alt-baslik">{tt(grup)}</h3>
          <ul className="qt-ornek-renkler">
            {liste.map((ad) => (
              <li key={ad}>
                <span className="qt-ornek-renk" style={{ background: `var(${ad})` }} />
                <code>{ad.replace("--qt-", "")}</code>
                <span className="qt-ornek-hex">{degerler[ad]}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Kontrast() {
  const [satirlar, setSatirlar] = useState([]);
  useEffect(() => {
    setSatirlar(
      KONTRAST_CIFTLERI.map(([ad, y, z, buyuk]) => {
        const a = cssDegeri(y);
        const b = cssDegeri(z);
        const oran = /^#[0-9a-f]{6}$/i.test(a) && /^#[0-9a-f]{6}$/i.test(b) ? kontrastOrani(a, b) : 0;
        return { ad, y, z, esik: buyuk ? 3 : 4.5, oran };
      }),
    );
  }, []);
  return (
    <QtKart dolgu="yok" className="qt-ornek-tablo-kap">
      <table className="qt-ornek-tablo">
        <thead>
          <tr>
            <th scope="col">{tt("Çift")}</th>
            <th scope="col">{tt("Örnek")}</th>
            <th scope="col">{tt("Oran")}</th>
          </tr>
        </thead>
        <tbody>
          {satirlar.map((s) => (
            <tr key={s.ad}>
              <td>{tt(s.ad)}</td>
              <td>
                <span className="qt-ornek-kontrast" style={{ color: `var(${s.y})`, background: `var(${s.z})` }}>Aa</span>
              </td>
              <td className={s.oran >= s.esik ? "qt-ornek-gecer" : "qt-ornek-kalir"}>
                {s.oran.toFixed(2)} <QtIkon ad={s.oran >= s.esik ? "onay" : "carpi"} boyut={16} etiket={s.oran >= s.esik ? tt("geçer") : tt("kalır")} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </QtKart>
  );
}

// ——————————————— Maç demosu ———————————————
const SORULAR = [
  { kategori: "Bilim", metin: "Güneş'e en yakın gezegen hangisidir?", siklar: ["Venüs", "Merkür", "Mars", "Dünya"], dogru: 1 },
  { kategori: "Coğrafya", metin: "Türkiye'nin en yüksek dağı hangisidir?", siklar: ["Erciyes", "Uludağ", "Ağrı Dağı", "Süphan Dağı"], dogru: 2 },
];
const HARFLER = ["A", "B", "C", "D"];
const SURE_UST = 20;
const SKILLER = [
  { kod: "yariyari", ikon: "yariyari", ad: "50:50", adet: 2 },
  { kod: "ekSure", ikon: "ekSure", ad: "+10 sn", adet: 1 },
  { kod: "degistir", ikon: "degistir", ad: "Değiştir", adet: 0, fiyat: 40 },
  { kod: "baski", ikon: "baski", ad: "Baskı", kilitli: "Lv 10" },
  { kod: "sigorta", ikon: "sigorta", ad: "Sigorta", adet: 3 },
  { kod: "ikiKat", ikon: "ikiKat", ad: "2 Kat", adet: 1 },
  { kod: "ikinciSans", ikon: "ikinciSans", ad: "2. Şans", adet: 1 },
];

function ilkDurum() {
  return {
    soruNo: 0,
    secim: null,
    sonuc: null,
    denenen: [],
    kirilan: [],
    elenen: [],
    sure: 14,
    geri: false,
    skorSen: 3,
    skorRakip: 2,
    skorAnahtar: null,
    canSen: 3,
    canRakip: 2,
    kayipAnahtar: 0,
    kullanilan: {},
    bilgi: null,
    ekSure: null,
    cikiyor: false,
    baski: null,
  };
}

function MacDemosu({ toastEkle }) {
  const [d, setD] = useState(ilkDurum);
  const zamanlayicilar = useRef([]);
  const sonra = useCallback((ms, fn) => {
    zamanlayicilar.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => zamanlayicilar.current.forEach((id) => window.clearTimeout(id)), []);
  const sifirla = () => {
    zamanlayicilar.current.forEach((id) => window.clearTimeout(id));
    zamanlayicilar.current = [];
    setD(ilkDurum());
  };

  // Son 5 saniye geri sayımı
  useEffect(() => {
    if (!d.geri) return undefined;
    const id = window.setInterval(() => {
      setD((o) => {
        if (!o.geri) return o;
        if (o.sure <= 1) return { ...o, sure: 0, geri: false, sonuc: o.sonuc ?? "sure" };
        titresim("sayac");
        return { ...o, sure: o.sure - 1 };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [d.geri]);

  const soru = SORULAR[d.soruNo];

  const cevapla = (i) => {
    setD((o) => {
      if (o.sonuc || o.elenen.includes(i) || o.denenen.includes(i)) return o;
      const s = SORULAR[o.soruNo];
      if (i === s.dogru) {
        titresim("dogru");
        return { ...o, secim: i, sonuc: "dogru", geri: false, skorSen: o.skorSen + (o.kullanilan.ikiKat ? 2 : 1), skorAnahtar: Date.now() };
      }
      if (o.kullanilan.ikinciSans && !o.kullanilan.ikinciSansHarcandi) {
        titresim("yanlis");
        return {
          ...o,
          denenen: [...o.denenen, i],
          kullanilan: { ...o.kullanilan, ikinciSansHarcandi: true },
          bilgi: { metin: tt("İkinci Şans: bir hakkın daha var!"), anahtar: Date.now() },
        };
      }
      titresim("yanlis");
      const korundu = o.kullanilan.sigorta;
      return {
        ...o,
        secim: i,
        sonuc: "yanlis",
        geri: false,
        canSen: korundu ? o.canSen : Math.max(0, o.canSen - 1),
        kayipAnahtar: korundu ? o.kayipAnahtar : Date.now(),
        bilgi: korundu ? { metin: tt("Sigorta canını korudu."), anahtar: Date.now() } : o.bilgi,
      };
    });
  };

  const skillKullan = (s) => {
    if (s.kilitli) {
      toastEkle({ ton: "uyari", ikon: "kilit", baslik: tt("{ad} kilitli", { ad: s.ad }), metin: tt("Seviye 10'da açılır.") });
      return;
    }
    if (d.kullanilan[s.kod] || d.sonuc) return;
    titresim("skill");
    const bilgi = { metin: tt("{ad} kullanıldı", { ad: s.ad }), anahtar: Date.now() };
    if (s.kod === "yariyari") {
      const yanlislar = [0, 1, 2, 3].filter((i) => i !== soru.dogru && !d.denenen.includes(i));
      const kir = [yanlislar[0], yanlislar[yanlislar.length - 1]];
      titresim("kirilma");
      setD((o) => ({ ...o, kirilan: kir, kullanilan: { ...o.kullanilan, yariyari: true }, bilgi }));
      sonra(QT_KIRILMA_MS, () => setD((o) => ({ ...o, elenen: o.kirilan, kirilan: [] })));
      return;
    }
    if (s.kod === "ekSure") {
      setD((o) => ({ ...o, sure: Math.min(SURE_UST, o.sure + 10), ekSure: Date.now(), kullanilan: { ...o.kullanilan, ekSure: true }, bilgi }));
      return;
    }
    if (s.kod === "degistir") {
      setD((o) => ({ ...o, cikiyor: true, kullanilan: { ...o.kullanilan, degistir: true }, bilgi }));
      sonra(QT_KART_CIKIS_MS, () =>
        setD((o) => ({ ...o, soruNo: 1 - o.soruNo, secim: null, elenen: [], kirilan: [], denenen: [], cikiyor: false })),
      );
      return;
    }
    setD((o) => ({ ...o, kullanilan: { ...o.kullanilan, [s.kod]: true }, bilgi }));
  };

  const dogruOynat = () => !d.sonuc && cevapla(soru.dogru);
  const yanlisOynat = () => {
    if (d.sonuc) return;
    const y = [0, 1, 2, 3].find((i) => i !== soru.dogru && !d.elenen.includes(i) && !d.denenen.includes(i));
    if (y != null) cevapla(y);
  };
  const son5 = () => setD((o) => (o.sonuc ? o : { ...o, sure: 5, geri: true }));
  const baskiOynat = () => setD((o) => ({ ...o, baski: Date.now(), bilgi: { metin: tt("Rakibin süresi 5 saniye kısaldı."), anahtar: Date.now() } }));

  const gerilim = d.geri && d.sure <= 5 && !d.sonuc;
  const sikDurumu = (i) => {
    if (d.elenen.includes(i)) return "elendi";
    if (d.sonuc) {
      if (i === soru.dogru) return d.secim === i ? "dogru" : "dogrusu";
      if (d.sonuc === "yanlis" && d.secim === i) return "yanlis";
      return "solgun";
    }
    if (d.denenen.includes(i)) return "yanlis";
    return "normal";
  };

  let bant = null;
  if (d.sonuc === "dogru") bant = { ton: "dogru", metin: tt("Doğru! +{n} puan", { n: d.kullanilan.ikiKat ? 2 : 1 }) };
  else if (d.sonuc === "yanlis") bant = { ton: "yanlis", metin: tt("Yanlış — doğrusu {c}", { c: soru.siklar[soru.dogru] }) };
  else if (d.sonuc === "sure") bant = { ton: "yanlis", metin: tt("Süre doldu") };
  else if (d.bilgi) bant = { ton: "notr", metin: d.bilgi.metin, anahtar: d.bilgi.anahtar };

  return (
    <div className="qt-ornek-mac">
      <div className="qt-ornek-demo" role="group" aria-label={tt("Hareket örnekleri")}>
        <QtDugme tur="ikincil" boyut="k" ikon="onay" onClick={dogruOynat}>{tt("Doğru cevap")}</QtDugme>
        <QtDugme tur="ikincil" boyut="k" ikon="carpi" onClick={yanlisOynat}>{tt("Yanlış cevap")}</QtDugme>
        <QtDugme tur="ikincil" boyut="k" ikon="saat" onClick={son5}>{tt("Son 5 saniye")}</QtDugme>
        <QtDugme tur="ikincil" boyut="k" ikon="yariyari" onClick={() => skillKullan(SKILLER[0])}>{tt("50:50 kullan")}</QtDugme>
        <QtDugme tur="ikincil" boyut="k" ikon="baski" onClick={baskiOynat}>{tt("Rakibe baskı")}</QtDugme>
        <QtDugme tur="mor" boyut="k" ikon="yenile" onClick={sifirla}>{tt("Sıfırla")}</QtDugme>
      </div>

      <div className="qt-ornek-telefon">
        <div className={`qt-sahne-mac qt-ornek-mac-ekran ${gerilim ? "qt-h-gerilim" : ""}`}>
          <QtMacUst
            sen={{
              ad: tt("Sen"),
              avatar: AVATAR_SEN,
              can: d.canSen,
              kayip: d.kayipAnahtar || null,
              etkiler:
                d.kullanilan.sigorta || d.kullanilan.ikiKat || (d.kullanilan.ikinciSans && !d.kullanilan.ikinciSansHarcandi) ? (
                  <>
                    {d.kullanilan.sigorta && <QtEtki ikon="sigorta" etiket={tt("Sigorta etkin")} />}
                    {d.kullanilan.ikiKat && <QtEtki etiket={tt("2 Kat etkin")}>2X</QtEtki>}
                    {d.kullanilan.ikinciSans && !d.kullanilan.ikinciSansHarcandi && <QtEtki ikon="ikinciSans" etiket={tt("İkinci Şans etkin")} />}
                  </>
                ) : null,
            }}
            rakip={{ ad: "Mert", avatar: AVATAR_RAKIP, can: d.canRakip }}
            skor={[d.skorSen, d.skorRakip]}
            skorAnahtar={d.skorAnahtar}
            rakipBaski={d.baski}
          />

          <QtSoruKarti
            key={`q${d.soruNo}`}
            kategori={tt(soru.kategori)}
            sira={tt("Soru {n} / {t}", { n: 4, t: 10 })}
            metin={tt(soru.metin)}
            cikiyor={d.cikiyor}
            sevinc={d.sonuc === "dogru"}
            sayac={
              <QtSayac
                kalan={d.sure}
                toplam={SURE_UST}
                durdu={Boolean(d.sonuc)}
                ekBalon={d.ekSure ? { anahtar: d.ekSure, metin: "+10" } : null}
              />
            }
          />

          <QtSikler>
            {soru.siklar.map((s, i) => (
              <QtSik
                key={`${d.soruNo}-${i}`}
                harf={HARFLER[i]}
                metin={tt(s)}
                durum={sikDurumu(i)}
                kiriliyor={d.kirilan.includes(i)}
                onClick={() => cevapla(i)}
              />
            ))}
          </QtSikler>

          <QtSonucBandi ton={bant?.ton} metin={bant?.metin} anahtar={bant?.anahtar ?? d.sonuc} />

          <QtSkillCubugu>
            {SKILLER.map((s) => (
              <QtSkill
                key={s.kod}
                ikon={s.ikon}
                ad={s.ad}
                adet={s.adet}
                fiyat={s.fiyat}
                durum={s.kilitli ? "kilitli" : d.kullanilan[s.kod] ? (["sigorta", "ikiKat", "ikinciSans"].includes(s.kod) && !d.sonuc ? "aktif" : "kullanildi") : "hazir"}
                kilitMetni={s.kilitli}
                onClick={() => skillKullan(s)}
              />
            ))}
          </QtSkillCubugu>
        </div>
      </div>
    </div>
  );
}

// ——————————————— Sayfa ———————————————
export default function TasarimSistemiPage() {
  const [toastlar, setToastlar] = useState([]);
  const [modal, setModal] = useState(null);
  const [sekme, setSekme] = useState("skill");
  const [dereceli, setDereceli] = useState(true);
  const [cipler, setCipler] = useState(["bilim"]);
  const [menu, setMenu] = useState("ana");
  const [secilenMod, setSecilenMod] = useState("klasik");
  const toastSayac = useRef(0);

  useEffect(() => {
    document.title = "Quiz Tactics — " + tt("Tasarım Sistemi");
  }, []);

  const toastEkle = useCallback((t) => {
    const id = ++toastSayac.current;
    setToastlar((l) => [...l.slice(-2), { ...t, id }]);
    window.setTimeout(() => setToastlar((l) => l.filter((x) => x.id !== id)), 3200);
  }, []);
  const toastKapat = (id) => setToastlar((l) => l.filter((x) => x.id !== id));

  return (
    <div className="qt-sayfa qt-ornek">
      <QtUstCubuk
        yapiskan
        marka={<QtMarka as="a" href="#ust" aria-label={tt("Quiz Tactics ana sayfa")} />}
        coin={12450}
        onCoin={() => toastEkle({ ton: "coin", baslik: tt("Dükkân › Coin"), metin: tt("Coin hapı Dükkân'a götürür.") })}
        bildirim={3}
        onBildirim={() => toastEkle({ ton: "bilgi", baslik: tt("3 yeni bildirim") })}
        avatar={{ src: AVATAR_SEN, ad: "Deniz", seviye: 23 }}
        onAvatar={() => setModal("altSayfa")}
      />

      <main id="ust" className="qt-sayfa-ic qt-ornek-ic">
        <header className="qt-ornek-giris">
          <h1 className="qt-baslik-1">{tt("Tasarım Sistemi")}</h1>
          <p className="qt-govde qt-soluk-zemin">
            {tt("Yön A “Şeker Kutusu”: parlak, yuvarlak, kabartmalı. Bütün ekranlar bu sayfadaki token'lar ve bileşenlerle kurulur. Kılavuz: oyun/tasarim/OKU.md")}
          </p>
          <nav className="qt-ornek-icindekiler" aria-label={tt("Bölümler")}>
            {BOLUMLER.map(([id, ad]) => (
              <a key={id} className="qt-cip" href={`#${id}`}>{tt(ad)}</a>
            ))}
          </nav>
        </header>

        <Bolum id="renkler" baslik="Renkler" aciklama="Her renk bir rol taşır. Altın yalnız coin ve ödül içindir; mod ve lig renkleri her yerde aynı anlama gelir.">
          <Renkler />
        </Bolum>

        <Bolum id="kontrast" baslik="Kontrast" aciklama="WCAG AA: küçük yazı ≥ 4,5 · büyük yazı ≥ 3. Değerler bu sayfanın CSS'inden canlı hesaplanır.">
          <Kontrast />
        </Bolum>

        <Bolum id="yazi" baslik="Yazı" aciklama="Baloo 2 başlık ve sayılar, Nunito gövde. Rakamlar eş genişlikli; en küçük yazı 12 px.">
          <QtKart className="qt-ornek-yazi">
            {YAZI_OLCEGI.map(([t, f, ornek]) => (
              <div key={t} className="qt-ornek-yazi-satir">
                <code>{t.replace("--qt-", "")}</code>
                <span style={{ fontSize: `var(${t})`, fontFamily: `var(--qt-f-${f})`, fontWeight: 800, lineHeight: 1.15 }}>{tt(ornek)}</span>
              </div>
            ))}
            <p className="qt-kucuk qt-soluk">ğüşıöç İĞÜŞÖÇ · 0123456789 · ₺ € $</p>
          </QtKart>
        </Bolum>

        <Bolum id="olcu" baslik="Ölçüler" aciklama="4 px ızgara. Kabartma: düğme ve kartların altındaki renkli dudak; basınca o kadar aşağı iner.">
          <div className="qt-ornek-olcu">
            <QtKart>
              <h3 className="qt-baslik-3">{tt("Boşluk")}</h3>
              <ul className="qt-ornek-bosluk">
                {BOSLUKLAR.map((b) => (
                  <li key={b}>
                    <code>{b.replace("--qt-", "")}</code>
                    <span style={{ width: `var(${b})` }} />
                  </li>
                ))}
              </ul>
            </QtKart>
            <QtKart>
              <h3 className="qt-baslik-3">{tt("Köşe ve kabartma")}</h3>
              <div className="qt-ornek-koseler">
                {KOSELER.map((r) => (
                  <span key={r} className="qt-ornek-kose" style={{ borderRadius: `var(${r})` }}>
                    {r.replace("--qt-r-", "")}
                  </span>
                ))}
              </div>
              <div className="qt-ornek-dudaklar">
                <span style={{ boxShadow: "0 var(--qt-dudak-s) 0 var(--qt-cizgi-guclu)" }}>dudak-s 3</span>
                <span style={{ boxShadow: "0 var(--qt-dudak) 0 var(--qt-cizgi-guclu)" }}>dudak 5</span>
                <span style={{ boxShadow: "0 var(--qt-dudak-b) 0 var(--qt-cizgi-guclu)" }}>dudak-b 6</span>
                <span style={{ boxShadow: "var(--qt-golge-yuzen)" }}>{tt("yüzen")}</span>
              </div>
            </QtKart>
          </div>
        </Bolum>

        <Bolum id="ikonlar" baslik="İkonlar" aciklama="Tek set: 24 px ızgara, 2,4 px yuvarlak çizgi, yarı saydam dolgu. Eski Ikon.jsx'teki bütün adlar aynen var.">
          <ul className="qt-ornek-ikonlar">
            {QT_IKON_ADLARI.map((ad) => (
              <li key={ad}>
                <span className="qt-ornek-ikon"><QtIkon ad={ad} boyut={26} /></span>
                <code>{ad}</code>
              </li>
            ))}
          </ul>
        </Bolum>

        <Bolum id="rozetler" baslik="Skill ve paket" aciklama="Skill rozeti her yerde aynı (dükkân, loadout, maç, level ödülü); renk skill'in kimliği. Coin paketi görseli adına göre büyür. Kaynak ve lisans: docs/VARLIK_LISANSLARI.md">
          {[false, true].map((koyu) => (
            <div key={String(koyu)} className={koyu ? "qt-ornek-rozetler qt-sahne-mac" : "qt-ornek-rozetler"}>
              {[64, 40, 32].map((b) => (
                <div key={b} className="qt-ornek-rozet-satir">
                  {["elli", "sure", "soru_degistir", "zaman_baskisi", "ikinci_sans", "sigorta", "cifte_puan"].map((t) => (
                    <SkillRozeti key={t} tur={t} boyut={b} />
                  ))}
                  <code>{b} px</code>
                </div>
              ))}
            </div>
          ))}
          <div className="qt-ornek-rozet-satir qt-ornek-paketler">
            {[1, 2, 3, 4, 5].map((s) => <CoinPaketGorseli key={s} seviye={s} />)}
          </div>
        </Bolum>

        <Bolum id="dugmeler" baslik="Düğmeler" aciklama="Ekranda tek birincil (turuncu) eylem. Basınca dudak kadar aşağı iner (120 ms).">
          <div className="qt-ornek-sira">
            <QtDugme ikon="oyna">{tt("Oyna")}</QtDugme>
            <QtDugme tur="mor">{tt("Meydan oku")}</QtDugme>
            <QtDugme tur="ikincil">{tt("Vazgeç")}</QtDugme>
            <QtDugme tur="tehlike" ikon="cop">{tt("Sil")}</QtDugme>
            <QtDugme tur="hayalet">{tt("Daha sonra")}</QtDugme>
          </div>
          <div className="qt-ornek-sira">
            <QtDugme boyut="k">{tt("Küçük")}</QtDugme>
            <QtDugme boyut="o">{tt("Orta")}</QtDugme>
            <QtDugme boyut="b" ikonSag="ok">{tt("Büyük")}</QtDugme>
          </div>
          <div className="qt-ornek-sira">
            <QtDugme devreDisi>{tt("Devre dışı")}</QtDugme>
            <QtDugme yukleniyor tur="mor">{tt("Yükleniyor")}</QtDugme>
            <QtIkonDugme ikon="zil" etiket={tt("Bildirimler")} rozet={5} />
            <QtIkonDugme ikon="ayar" etiket={tt("Ayarlar")} />
            <QtIkonDugme ikon="paylas" etiket={tt("Paylaş")} tur="mor" />
            <QtIkonDugme ikon="carpi" etiket={tt("Kapat")} tur="saydam" />
          </div>
          <QtDugme tamGenislik boyut="b" ikon="oyna">{tt("Hemen oyna")}</QtDugme>
        </Bolum>

        <Bolum id="kartlar" baslik="Kartlar" aciklama="Kart iç içe konmaz. Mod kartının rengi o modun her yerdeki rengidir.">
          <div className="qt-ornek-modlar">
            {[
              ["klasik", "Klasik", "1'e 1 · 10 soru"],
              ["duello", "Düello", "Can savaşı · skill'li"],
              ["turnuva", "Turnuva", "Sıradaki 20:00"],
              ["grup", "Grup", "3-5 kişi · davetle"],
            ].map(([m, ad, alt]) => (
              <QtModKart
                key={m}
                mod={m}
                ad={tt(ad)}
                alt={tt(alt)}
                secili={secilenMod === m}
                rozet={m === "turnuva" ? tt("Canlı") : null}
                onClick={() => setSecilenMod(m)}
              />
            ))}
          </div>
          <QtModKart mod="saf" genis ad={tt("Saf Bilgi")} alt={tt("Skillsiz · yalnız bilgi")} rozet={tt("Yeni")} onClick={() => setSecilenMod("saf")} secili={secilenMod === "saf"} />
          <QtModKart mod="klasik" genis kilitli ad={tt("Hızlı Mod")} kilitMetni={tt("Şu an kapalı")} />
          <div className="qt-ornek-kartlar">
            <QtKart>
              <h3 className="qt-baslik-3">{tt("Kart")}</h3>
              <p className="qt-kucuk qt-soluk">{tt("Beyaz levha, 5 px alt dudak.")}</p>
            </QtKart>
            <QtKart ton="mor">
              <h3 className="qt-baslik-3">{tt("Mor kart")}</h3>
              <p className="qt-kucuk">{tt("Davet, öne çıkan bilgi.")}</p>
            </QtKart>
            <QtKart onClick={() => toastEkle({ ton: "notr", baslik: tt("Kart dokunuldu") })}>
              <h3 className="qt-baslik-3">{tt("Dokunulur kart")}</h3>
              <p className="qt-kucuk qt-soluk">{tt("onClick verince düğme olur.")}</p>
            </QtKart>
          </div>
        </Bolum>

        <Bolum id="parcalar" baslik="Küçük parçalar">
          <div className="qt-ornek-parcalar">
            <QtKart>
              <h3 className="qt-baslik-3">{tt("Rozet")}</h3>
              <div className="qt-ornek-sira qt-ornek-sira--sik">
                <QtRozet>{tt("Nötr")}</QtRozet>
                <QtRozet ton="mor">{tt("Level 7")}</QtRozet>
                <QtRozet ton="vurgu" ikon="ates">{tt("6 gün seri")}</QtRozet>
                <QtRozet ton="dogru" ikon="onay">{tt("Kazandın")}</QtRozet>
                <QtRozet ton="yanlis">{tt("Kaybettin")}</QtRozet>
                <QtRozet ton="uyari" ikon="uyari">{tt("Son 1 saat")}</QtRozet>
                <QtRozet ton="bilgi">{tt("Serbest")}</QtRozet>
                <QtRozet ton="coin" ikon="coin">+200</QtRozet>
                <QtRozet ton="koyu" boyut="k">{tt("YENİ")}</QtRozet>
              </div>
              <div className="qt-ornek-sira qt-ornek-sira--sik">
                {["bronz", "gumus", "altin", "elmas", "efsane"].map((l) => <QtLigRozeti key={l} lig={l} />)}
              </div>
            </QtKart>
            <QtKart>
              <h3 className="qt-baslik-3">{tt("Çip ve sekme")}</h3>
              <div className="qt-ornek-sira qt-ornek-sira--sik">
                {[["bilim", "Bilim"], ["tarih", "Tarih"], ["spor", "Spor"], ["sanat", "Sanat"]].map(([k, ad]) => (
                  <QtCip
                    key={k}
                    secili={cipler.includes(k)}
                    onClick={() => setCipler((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]))}
                  >
                    {tt(ad)}
                  </QtCip>
                ))}
              </div>
              <QtSekmeler
                etiket={tt("Dükkân")}
                aktif={sekme}
                onSec={setSekme}
                sekmeler={[
                  { kod: "skill", ad: tt("Skill"), ikon: "hizli" },
                  { kod: "coin", ad: tt("Coin"), ikon: "coin" },
                  { kod: "kiyafet", ad: tt("Kıyafet"), ikon: "tisort", sayi: 2 },
                ]}
              />
            </QtKart>
            <QtKart>
              <h3 className="qt-baslik-3">{tt("Anahtar ve ilerleme")}</h3>
              <QtAnahtar acik={dereceli} onDegis={setDereceli} etiket={tt("Dereceli")} aciklama={dereceli ? tt("Lig puanı + tam coin") : tt("Lig puanı yok · coin %50")} />
              <div className="qt-ornek-ilerleme">
                <span className="qt-kucuk">{tt("Seviye 24 için 320 XP")}</span>
                <QtIlerleme deger={680} en={1000} etiket={tt("Seviye ilerlemesi")} />
                <span className="qt-kucuk">{tt("Altın Lig · yükselme hattı")}</span>
                <QtIlerleme deger={72} ton="lig-altin" isaret={84} etiket={tt("Lig ilerlemesi")} boyut="b" />
              </div>
            </QtKart>
            <QtKart>
              <h3 className="qt-baslik-3">{tt("Avatar ve coin")}</h3>
              <div className="qt-ornek-sira qt-ornek-sira--orta">
                <QtAvatar src={AVATAR_SEN} ad="Deniz" boyut="xl" seviye={23} />
                <QtAvatar src={AVATAR_RAKIP} ad="Mert" boyut="l" halka="yanlis" cevrimici />
                <QtAvatar ad="Zeynep" boyut="m" halka="dogru" />
                <QtAvatar src={AVATAR_SEN} ad="Deniz" boyut="s" halka="coin" />
                <QtCoinHapi miktar={12450} />
              </div>
            </QtKart>
          </div>
        </Bolum>

        <Bolum id="liste" baslik="Liste ve durumlar">
          <div className="qt-ornek-parcalar">
            <QtListe etiket={tt("Arkadaşlar")}>
              <QtListeSatiri
                bas={<QtAvatar src={AVATAR_RAKIP} ad="Mert" cevrimici />}
                baslik="Mert"
                alt={tt("Altın Lig · 1.240 puan")}
                sag={<QtDugme boyut="k" tur="mor" onClick={() => toastEkle({ ton: "mor", baslik: tt("Meydan okuma gönderildi") })}>{tt("Oyna")}</QtDugme>}
              />
              <QtListeSatiri vurgulu bas={<QtAvatar src={AVATAR_SEN} ad="Deniz" halka="vurgu" />} baslik={tt("Sen")} alt={tt("4. sıra")} sag={<QtLigRozeti lig="altin" boyut="k" />} />
              <QtListeSatiri ikon="hediye" ikonTon="coin" baslik={tt("Günlük ödül")} alt={tt("Yarın yine gel")} ok onClick={() => toastEkle({ ton: "coin", baslik: "+50 coin" })} />
              <QtListeSatiri ikon="ayar" baslik={tt("Ayarlar")} ok onClick={() => {}} />
            </QtListe>
            <QtKart dolgu="yok">
              <QtBosDurum
                ikon="kisiler"
                baslik={tt("Henüz arkadaşın yok")}
                metin={tt("Davet kodunu paylaş; ikiniz de 200 coin kazanın.")}
                eylem={<QtDugme ikon="paylas" boyut="k">{tt("Davet et")}</QtDugme>}
              />
            </QtKart>
            <QtKart dolgu="yok">
              <QtBosDurum ikon="uyari" ton="yanlis" baslik={tt("Yüklenemedi")} metin={tt("Bağlantını kontrol edip yeniden dene.")} eylem={<QtDugme tur="ikincil" boyut="k" ikon="yenile">{tt("Yeniden dene")}</QtDugme>} />
            </QtKart>
            <QtKart aria-busy="true">
              <h3 className="qt-baslik-3">{tt("Yükleniyor iskeleti")}</h3>
              <QtIskelet tur="satir" adet={3} />
              <QtIskelet tur="metin" adet={2} />
            </QtKart>
          </div>
        </Bolum>

        <Bolum id="katmanlar" baslik="Modal ve bildirim" aciklama="Modal ve alt sayfa body'ye çizilir; Esc ve örtü kapatır. Bildirim üstte belirir, 3 sn sonra kendiliğinden kalkar.">
          <div className="qt-ornek-sira">
            <QtDugme tur="mor" onClick={() => setModal("modal")}>{tt("Modal aç")}</QtDugme>
            <QtDugme tur="ikincil" onClick={() => setModal("altSayfa")}>{tt("Alt sayfa aç")}</QtDugme>
            <QtDugme tur="ikincil" boyut="k" onClick={() => toastEkle({ ton: "dogru", baslik: tt("Kazandın!"), metin: tt("+120 coin · +40 lig puanı") })}>{tt("Başarı")}</QtDugme>
            <QtDugme tur="ikincil" boyut="k" onClick={() => toastEkle({ ton: "yanlis", baslik: tt("Bağlantı koptu"), metin: tt("Yeniden bağlanıyor…") })}>{tt("Hata")}</QtDugme>
            <QtDugme tur="ikincil" boyut="k" onClick={() => toastEkle({ ton: "coin", baslik: "+200 coin", metin: tt("Arkadaş davetin kabul edildi") })}>{tt("Coin")}</QtDugme>
          </div>
          <div className="qt-ornek-toastlar">
            <QtToastYuvasi gomulu>
              <QtToast ton="mor" baslik={tt("Mert seni Düello'ya çağırıyor")} metin={tt("2 dk içinde yanıtla")} eylem={<QtDugme boyut="k" tur="mor">{tt("Kabul")}</QtDugme>} />
              <QtToast ton="uyari" baslik={tt("Turnuva 5 dk sonra başlıyor")} onKapat={() => {}} />
            </QtToastYuvasi>
          </div>
        </Bolum>

        <Bolum id="mac" baslik="Maç" aciklama="Koyu mor sahne (.qt-sahne-mac). Düğmelerle anları dene: doğru, yanlış, son 5 sn, 50:50, skill'ler.">
          <MacDemosu toastEkle={toastEkle} />
          <h3 className="qt-baslik-3 qt-ornek-alt-baslik">{tt("Şık durumları")}</h3>
          <div className="qt-sahne-mac qt-ornek-sik-durumlari">
            <QtSikler>
              {[
                ["normal", "Normal"],
                ["secili", "Seçili"],
                ["dogru", "Doğru"],
                ["dogrusu", "Doğrusu buydu"],
                ["yanlis", "Yanlış"],
                ["elendi", "Elendi"],
                ["kilitli", "Kilitli"],
                ["solgun", "Solgun"],
              ].map(([durum, ad], i) => (
                <QtSik key={durum} harf={HARFLER[i % 4]} metin={tt(ad)} durum={durum} onClick={() => {}} />
              ))}
            </QtSikler>
            <div className="qt-ornek-sira qt-ornek-sira--orta">
              <QtSayac kalan={14} toplam={20} boyut="k" />
              <QtSayac kalan={14} toplam={20} />
              <QtSayac kalan={4} toplam={20} boyut="b" />
              <QtCan dolu={2} toplam={3} etiket={tt("Can")} boyut={22} />
            </div>
            <QtSkillCubugu>
              <QtSkill ikon="yariyari" ad="50:50" adet={2} />
              <QtSkill ikon="ekSure" ad="+10 sn" adet={0} fiyat={40} />
              <QtSkill ikon="sigorta" ad={tt("Sigorta")} durum="aktif" adet={1} />
              <QtSkill ikon="ikiKat" ad={tt("2 Kat")} durum="kullanildi" />
              <QtSkill ikon="baski" ad={tt("Baskı")} durum="kilitli" kilitMetni="Lv 10" />
            </QtSkillCubugu>
          </div>
        </Bolum>

        <Bolum id="kabuk" baslik="Üst çubuk ve menü" aciklama="Üst çubuk bu sayfanın en üstünde canlı. Alt menü telefonda ekranın altına sabitlenir (sabit); burada yerinde gösteriliyor.">
          <div className="qt-ornek-altmenu">
            <QtAltMenu
              aktif={menu}
              onSec={setMenu}
              etiket={tt("Alt menü örneği")}
              sekmeler={[
                { kod: "ana", ad: tt("Ana Sayfa"), ikon: "ev" },
                { kod: "arkadas", ad: tt("Arkadaşlar"), ikon: "kisiler", rozet: true, rozetEtiketi: tt("bekleyen istek var") },
                { kod: "lig", ad: tt("Lig"), ikon: "lig" },
                { kod: "dukkan", ad: tt("Dükkân"), ikon: "dukkan" },
                { kod: "profil", ad: tt("Profil"), ikon: "kisi" },
              ]}
            />
          </div>
        </Bolum>
      </main>

      <QtToastYuvasi>
        {toastlar.map((t) => (
          <QtToast key={t.id} {...t} onKapat={() => toastKapat(t.id)} />
        ))}
      </QtToastYuvasi>

      <QtModal
        acik={modal === "modal"}
        onKapat={() => setModal(null)}
        baslik={tt("50:50 satın al")}
        aciklama={tt("İki yanlış şıkkı kırıp atar. Bu maçta 1 kez daha kullanabilirsin.")}
        altlik={
          <>
            <QtDugme tur="ikincil" onClick={() => setModal(null)}>{tt("Vazgeç")}</QtDugme>
            <QtDugme ikon="coin" onClick={() => { setModal(null); toastEkle({ ton: "dogru", baslik: tt("50:50 alındı"), metin: "-40 coin" }); }} data-qt-ilk-odak>
              {tt("40 coin")}
            </QtDugme>
          </>
        }
      >
        <QtListe>
          <QtListeSatiri ikon="yariyari" baslik={tt("Tek adet")} alt={tt("Hemen kullan")} sag={<QtRozet ton="coin" ikon="coin">40</QtRozet>} />
          <QtListeSatiri ikon="yariyari" ikonTon="vurgu" baslik={tt("10'lu paket")} alt={tt("%20 indirim")} sag={<QtRozet ton="coin" ikon="coin">320</QtRozet>} />
        </QtListe>
      </QtModal>

      <QtModal acik={modal === "altSayfa"} onKapat={() => setModal(null)} tur="altSayfa" baslik={tt("Profil menüsü")}>
        <QtListe>
          <QtListeSatiri ikon="kisi" baslik={tt("Profilim")} ok onClick={() => setModal(null)} />
          <QtListeSatiri ikon="ayar" baslik={tt("Ayarlar")} ok onClick={() => setModal(null)} />
          <QtListeSatiri ikon="dunya" ikonTon="bilgi" baslik={tt("Dil")} alt="Türkçe" ok onClick={() => setModal(null)} />
          <QtListeSatiri ikon="cikis" ikonTon="yanlis" baslik={tt("Çıkış yap")} onClick={() => setModal(null)} />
        </QtListe>
      </QtModal>
    </div>
  );
}
