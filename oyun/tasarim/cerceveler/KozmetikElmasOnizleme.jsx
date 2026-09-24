// /kozmetik-onizleme › ELMAS KOZMETİKLERİ (540–542) — her tür GERÇEK YERİNDE: aura (maç şeridi + lig satırı),
// VS kartı (arama/VS ekranı), isim efekti (lig satırı + maç şeridi + maç sonu), zafer efekti (maç sonu + rakibin
// zaferi), tepki (maç şeridinde avatar balonu).
// Her kalemde "Satışa girsin / Girmesin" — YALNIZ sahip hesabı görür ve yazar (kozmetik_onay_kaydet sunucuda
// sahip_mi() ile korunur; normal kullanıcıda düğmeler çizilmez, RPC de reddeder). Seçim sunucuda: yenileyince durur.
// Satış bayrağı (kozmetik_satis_acik) açılsa bile yalnız "girsin" işaretliler satılır. Aura seçimi aura SATIŞINI
// değiştirmez (aura zaten satışta); yalnız gizli botların aura takmasını belirler.
import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "../../../src/context/AuthContext.jsx";
import CerceveliAvatar from "../../components/CerceveliAvatar.jsx";
import IsimEfekti from "../../components/IsimEfekti.jsx";
import { VsKarti } from "../../components/AramaSahnesi.jsx";
import { TepkiAvatar } from "../../components/Tepki.jsx";
import { AURA_TANIMLARI, NADIRLIK_ADI } from "./tanimlar.js";
import {
  KOZMETIK_TANIMLARI, TEPKI_BEDAVA, TEPKI_TANIMLARI, kozmetikOnayKaydet, kozmetikOnayListesi, kozmetikTurdekiler,
  sahipMi, tepkiGorseli,
} from "../../lib/kozmetik.js";
import { QtKart } from "../index.js";
import { tt } from "../../lib/dil.js";
import "./kozmetik-elmas-onizleme.css";

const ZaferEfekti = lazy(() => import("../../components/ZaferEfekti.jsx"));

const BEN = { id: "onizleme-ben", gorunen_ad: "Deniz", gorunen_avatar: "/avatars/pro/kedi-k01.svg" };
const RAKIP = { id: "onizleme-rakip", gorunen_ad: "Ece", gorunen_avatar: "/avatars/pro/tilki-k04.svg" };

function SatisSecimi({ anahtar, onay, sahip, onKaydet, yaziliyor }) {
  if (!sahip) return null;
  return (
    <div className="kze-secim" role="group" aria-label={tt("Satış seçimi")}>
      <button type="button" className="kze-secim-dugme kze-secim-dugme--evet" aria-pressed={onay === "girsin"}
              disabled={yaziliyor} onClick={() => onKaydet(anahtar, "girsin")}>{tt("Satışa girsin")}</button>
      <button type="button" className="kze-secim-dugme kze-secim-dugme--hayir" aria-pressed={onay === "girmesin"}
              disabled={yaziliyor} onClick={() => onKaydet(anahtar, "girmesin")}>{tt("Girmesin")}</button>
    </div>
  );
}

function Kalem({ baslik, alt, anahtar, secim, children }) {
  return (
    <li className="kze-kalem">
      <div className="kze-kalem-bas">
        <strong className="ko-ad">{baslik}</strong>
        {alt && <span className="kze-alt">{alt}</span>}
        {anahtar && <code className="ko-anahtar">{anahtar}</code>}
      </div>
      <div className="kze-yerler">{children}</div>
      {secim}
    </li>
  );
}

/** Lig tablosu satırı taklidi (açık zemin, gerçek sınıflara yakın). */
function LigSatiri({ ad, ef, aura, sira = 7, ben = false }) {
  return (
    <div className={`kze-lig${ben ? " kze-lig--ben" : ""}`}>
      <span className="kze-lig-sira qt-sayi">{sira}</span>
      <CerceveliAvatar profile={BEN} cerceve={null} aura={aura ?? null} boyut={40} />
      <span className="kze-lig-ad"><IsimEfekti ef={ef ?? null}>{ad}</IsimEfekti></span>
      <span className="kze-lig-puan qt-sayi">1.240</span>
    </div>
  );
}

/** Maç üst şeridi taklidi (koyu maç sahnesi). */
function MacSeridi({ ef, aura, balon }) {
  return (
    <div className="kze-serit qt-sahne-mac">
      <span className="qt-oyuncu">
        <TepkiAvatar balon={balon} yan="sen">
          <CerceveliAvatar profile={BEN} cerceve={null} aura={aura ?? null} boyut={48} />
        </TepkiAvatar>
        <span className="qt-oyuncu-yazi"><span className="qt-oyuncu-ad"><IsimEfekti ef={ef ?? null}>{BEN.gorunen_ad}</IsimEfekti></span></span>
      </span>
      <span className="kze-serit-skor qt-sayi">40 : 30</span>
      <span className="qt-oyuncu qt-oyuncu--rakip">
        <CerceveliAvatar profile={RAKIP} cerceve={null} aura={null} boyut={48} />
        <span className="qt-oyuncu-yazi"><span className="qt-oyuncu-ad">{RAKIP.gorunen_ad}</span></span>
      </span>
    </div>
  );
}

function ZaferKutusu({ ef }) {
  const [tekrar, setTekrar] = useState(0);
  return (
    <div className="kze-zafer-ikili">
      <button type="button" className="kze-zafer" onClick={() => setTekrar((n) => n + 1)} aria-label={tt("Efekti yeniden oynat")}>
        <Suspense fallback={null}><ZaferEfekti key={tekrar} ef={ef} yol={260} en={260} /></Suspense>
        <span className="kze-zafer-baslik">{tt("ZAFER!")}</span>
        <CerceveliAvatar profile={BEN} cerceve={null} aura={null} boyut={64} />
        <span className="kze-zafer-ad"><IsimEfekti ef={null}>{BEN.gorunen_ad}</IsimEfekti></span>
        <small className="kze-tekrar">{tt("Dokun: tekrar")}</small>
      </button>
      <div className="kze-kaybeden" aria-label={tt("Kaybedenin ekranı")}>
        <span className="kze-kaybeden-baslik">{tt("Bu sefer olmadı")}</span>
        <span className="kze-kaybeden-avatar">
          <Suspense fallback={null}><ZaferEfekti key={`k${tekrar}`} ef={ef} boyut="kucuk" etiket /></Suspense>
          <CerceveliAvatar profile={RAKIP} cerceve={null} aura={null} boyut={56} />
        </span>
      </div>
    </div>
  );
}

function TepkiDeneme({ tepkiler }) {
  const [balon, setBalon] = useState(null);
  const goster = (k) => setBalon((b) => ({ k, n: (b?.n ?? 0) + 1 }));
  return (
    <div className="kze-tepki">
      <MacSeridi balon={balon} />
      <div className="kze-tepki-dugmeler">
        {tepkiler.map((k) => (
          <button key={k} type="button" className="qt-tepki-sec" onClick={() => goster(k)} aria-label={tt(TEPKI_TANIMLARI[k].ad)}>
            <img src={tepkiGorseli(k)} alt="" width="32" height="32" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function KozmetikElmasOnizleme() {
  const { user } = useAuth();
  const [sahip, setSahip] = useState(false);
  const [onaylar, setOnaylar] = useState({});
  const [yaziliyor, setYaziliyor] = useState(null);
  const [hata, setHata] = useState(null);

  useEffect(() => {
    let aktif = true;
    (async () => {
      if (!user?.id) { setSahip(false); return; }
      const s = await sahipMi();
      if (!aktif) return;
      setSahip(s);
      if (!s) return;
      try {
        const liste = await kozmetikOnayListesi();
        if (aktif) setOnaylar(Object.fromEntries(liste.map((x) => [x.anahtar, x.onay])));
      } catch (e) {
        if (aktif) setHata(String(e?.message ?? e));
      }
    })();
    return () => { aktif = false; };
  }, [user?.id]);

  const kaydet = async (anahtar, onay) => {
    const onceki = onaylar[anahtar];
    setYaziliyor(anahtar);
    setHata(null);
    setOnaylar((o) => ({ ...o, [anahtar]: onay }));   // iyimser; hata olursa geri alınır
    try {
      await kozmetikOnayKaydet(anahtar, onay);
    } catch (e) {
      setOnaylar((o) => ({ ...o, [anahtar]: onceki }));
      setHata(String(e?.message ?? e));
    } finally {
      setYaziliyor(null);
    }
  };
  const secim = (anahtar) => (
    <SatisSecimi anahtar={anahtar} onay={onaylar[anahtar]} sahip={sahip} onKaydet={kaydet} yaziliyor={yaziliyor === anahtar} />
  );
  const ad = (k) => tt(KOZMETIK_TANIMLARI[k]?.ad ?? k);

  return (
    <section className="ko-bolum kze" aria-labelledby="kze-baslik">
      <h2 id="kze-baslik" className="qt-baslik-2">{tt("Elmas kozmetikleri")}</h2>
      <p className="qt-govde qt-soluk-zemin">
        {sahip
          ? tt("Her kalemde seçimini yap. Satış bayrağı açılınca yalnız \"Satışa girsin\" dediklerin satılır; botlar da yalnız onları takar. Seçimler sunucuda, yenileyince durur.")
          : tt("Her kozmetik gerçek yerinde. Satış seçimi yalnız sahip hesabıyla görünür.")}
      </p>
      {hata && <p className="kze-hata" role="alert">{hata}</p>}

      <QtKart dolgu="o" className="ko-kart">
        <h3 className="qt-baslik-3">{tt("Aura")}</h3>
        <p className="qt-kucuk qt-soluk">{tt("Aura zaten satışta; buradaki seçim satışı değiştirmez, yalnız gizli botların takmasını belirler. Yerleri: maç şeridi, lig tablosu.")}</p>
        <ul className="kze-liste">
          {Object.entries(AURA_TANIMLARI).map(([k, t]) => (
            <Kalem key={k} baslik={tt(t.ad ?? k)} alt={t.malzeme ? tt(NADIRLIK_ADI[t.malzeme] ?? "") : null} anahtar={k} secim={secim(k)}>
              <MacSeridi aura={k} />
              <LigSatiri ad={BEN.gorunen_ad} aura={k} />
            </Kalem>
          ))}
        </ul>
      </QtKart>

      <QtKart dolgu="o" className="ko-kart">
        <h3 className="qt-baslik-3">{tt("VS Kartı")}</h3>
        <p className="qt-kucuk qt-soluk">{tt("Rakip aranırken, VS anında ve profil başlığında kartının arka planı. Varsayılan düz kart bedava.")}</p>
        <ul className="kze-liste">
          {kozmetikTurdekiler("vs_karti").map((k) => (
            <Kalem key={k} baslik={ad(k)} anahtar={k} secim={secim(k)}>
              <div className="kze-vs qt-sahne-mac">
                <VsKarti profil={BEN} kart={{ level: 24, lig: "altin", aura: null, cerceve: null }} taraf="ben" vsKarti={k} isimEfekti={null} />
                <span className="ara-vs-rozet" aria-hidden="true"><span>VS</span></span>
                <VsKarti profil={RAKIP} kart={{ level: 22, lig: "gumus", aura: null, cerceve: null }} taraf="rakip" vsKarti={null} isimEfekti={null} />
              </div>
            </Kalem>
          ))}
        </ul>
      </QtKart>

      <QtKart dolgu="o" className="ko-kart">
        <h3 className="qt-baslik-3">{tt("İsim Efekti")}</h3>
        <p className="qt-kucuk qt-soluk">{tt("Lig tablosu, maç şeridi, maç sonu ve profil. Kontrast her zeminde en az 4,5:1.")}</p>
        <ul className="kze-liste">
          {kozmetikTurdekiler("isim_efekti").map((k) => (
            <Kalem key={k} baslik={ad(k)} anahtar={k} secim={secim(k)}>
              <LigSatiri ad={BEN.gorunen_ad} ef={k} ben />
              <MacSeridi ef={k} />
              <span className="kze-mac-sonu-ad"><IsimEfekti ef={k} acik hareketli>{BEN.gorunen_ad}</IsimEfekti></span>
            </Kalem>
          ))}
        </ul>
      </QtKart>

      <QtKart dolgu="o" className="ko-kart">
        <h3 className="qt-baslik-3">{tt("Zafer Efekti")}</h3>
        <p className="qt-kucuk qt-soluk">{tt("Kazanınca maç sonu sahnesine eklenir; kaybeden rakip de küçük boyutta görür. Sahne sesleri değişmez.")}</p>
        <ul className="kze-liste">
          {kozmetikTurdekiler("zafer_efekti").map((k) => (
            <Kalem key={k} baslik={ad(k)} anahtar={k} secim={secim(k)}>
              <ZaferKutusu ef={k} />
            </Kalem>
          ))}
        </ul>
      </QtKart>

      <QtKart dolgu="o" className="ko-kart">
        <h3 className="qt-baslik-3">{tt("Tepki")}</h3>
        <p className="qt-kucuk qt-soluk">{tt("Maç içinde gönderenin avatarının yanında ~2 sn balon. Dokun, dene.")}</p>
        <ul className="kze-liste">
          <Kalem baslik={tt("Bedava 4")} alt={tt("herkeste")}>
            <TepkiDeneme tepkiler={TEPKI_BEDAVA} />
          </Kalem>
          {kozmetikTurdekiler("tepki_paketi").map((k) => (
            <Kalem key={k} baslik={ad(k)} anahtar={k} secim={secim(k)}>
              <TepkiDeneme tepkiler={KOZMETIK_TANIMLARI[k].tepkiler} />
            </Kalem>
          ))}
        </ul>
      </QtKart>
    </section>
  );
}
