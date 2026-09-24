// /premium-onizleme — premium kozmetik ÖNİZLEMESİ (yalnız sahip; menüde yok, yalnız adresle).
// Sahip kontrolü mevcut önizlemelerle aynı: sunucu sahip_mi() (migration 380). Oyunda hiçbir şeyi
// değiştirmez: katalog, satış, aura/çerçeve verisi aynen; seçimler yalnız bu tarayıcıda (localStorage)
// ve "Seçimlerimi kopyala" düz liste verir — migration yok.
// İçerik: 8 hareketli çerçeve · 6 iç arka plan aurası · altın isim plakası · lig amblemi; üstte deneme
// alanı, altında gerçek yerler (profil, ana sayfa lobisi, VS/arama, maç şeridi, maç sonu, lig tablosu)
// gerçek sınıflar ve gerçek boyutlarla. Hareket yalnız büyük yerlerde; listelerde durağan.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, supabaseHazir } from "../../../src/lib/supabase.js";
import Avatar from "../../../src/components/Avatar.jsx";
import PremiumCerceve, { useSeffafAvatar } from "./PremiumCerceve.jsx";
import { CERCEVELER, CERCEVE_SIRASI } from "./sanatCerceveler.jsx";
import { AURALAR, AURA_SIRASI } from "./sanatAuralar.jsx";
import { AltinIsimPlakasi, LIGLER, LIG_ADI, LigAmblemi } from "./ekler.jsx";
import IsimEfekti from "../../components/IsimEfekti.jsx";
import { QtBosDurum, QtCan, QtDugme, QtIkon, QtIlerleme, QtIskelet, QtKart, QtMacUst, QtRozet } from "../index.js";
import { SeviyeEtiketi } from "../../components/MacUstSerit.jsx";
import { tt } from "../../lib/dil.js";
import "../../pages/anasayfa/anasayfa.css";
import "../../pages/lig-a.css";
import "../ekranlar/dukkan-profil.css";
import "../ekranlar/mac-sonu-kutlama.css";
import "../ekranlar/a-arama-sahnesi.css";
import "./premium-onizleme.css";

// Yerel geliştirme (npm run dev, .env yok): sahip kontrolü atlanır ki sayfa ölçülebilsin.
// Üretim derlemesinde import.meta.env.DEV false → bu dal derlemeye girmez.
const YEREL = import.meta.env.DEV && !supabaseHazir;
const SAKLA = "qt_premium_onizleme_secimler";

const HAZIR = ["kedi-k01", "kopek-k02", "baykus-k03", "tilki-k04", "panda-k05", "penguen-k06", "kurbaga-k07", "ayi-k08",
  "maymun-k09", "dinozor-k10", "ejderha-k11", "kopekbaligi-k12", "ahtapot-k13", "ari-k14", "robot-k15", "uzayli-k16",
  "astronot-k17", "ninja-k18", "korsan-k19", "sovalye-k20", "buyucu-k21", "dedektif-k22", "asci-k23", "profesor-k24",
  "viking-k25", "hayalet-k26", "zombi-k27", "mumya-k28", "kahraman-k29", "palyaco-k30", "kral-k31"].map((a) => `/avatars/pro/${a}.svg`);
const YENI = ["sarisin-y01", "kivircik-y02", "kizil-y03", "basortulu-y04", "gozluklu-y05", "kel-y06", "sakalli-y07", "dede-y08",
  "sporcu-y09", "ogrenci-y10", "bilim-y11", "doktor-y12", "veteriner-y13", "golge-ninja-y14", "samuray-y15", "noel-baba-y16",
  "kaptan-y17", "uzay-kasifi-y18", "vampir-y19", "ates-buyucu-y20", "mekanik-y21", "pelerinli-y22", "gece-y23",
  "uzay-sovalye-y24", "canavar-y25", "yuce-kral-y26", "kralice-y27"].map((a) => `/avatars/pro2/${a}.svg`);
const AVATARLAR = [...HAZIR, ...YENI];

const RAKIP = { id: "pp-rakip", gorunen_ad: "Mert", gorunen_avatar: "/avatars/pro/tilki-k04.svg" };
const KOMSU = [
  { id: "pp-k1", gorunen_ad: "Elif", gorunen_avatar: "/avatars/pro/baykus-k03.svg", lig: "elmas" },
  { id: "pp-k2", gorunen_ad: "Kaan", gorunen_avatar: "/avatars/pro/robot-k15.svg", lig: "gumus" },
];

/** Kalemler (seçim listesi). */
const KALEMLER = [
  ...CERCEVE_SIRASI.map((k) => ({ kod: `cerceve:${k}`, ad: CERCEVELER[k].ad, tur: "Çerçeve" })),
  ...AURA_SIRASI.map((k) => ({ kod: `aura:${k}`, ad: AURALAR[k].ad, tur: "Aura" })),
  { kod: "plaka:altin", ad: "Altın isim plakası", tur: "İsim" },
  { kod: "rozet:lig", ad: "Lig amblemi (isim yanında)", tur: "Rozet" },
];

function secimOku() {
  try { return JSON.parse(localStorage.getItem(SAKLA) || "{}") || {}; } catch { return {}; }
}
function secimYaz(v) {
  try { localStorage.setItem(SAKLA, JSON.stringify(v)); } catch { /* özel mod: yalnız bu oturum */ }
}

/** Seçili çerçeve/aura ile gerçek Avatar bileşeni (aura varken avatarın düz zemini ayıklanır). */
function PremiumAvatar({ profil, boyut, hareketli = false, cerceve, aura }) {
  const url = profil?.gorunen_avatar ?? null;
  const seffaf = useSeffafAvatar(url, Boolean(aura));
  return (
    <PremiumCerceve cerceve={cerceve} aura={aura} boyut={boyut} hareketli={hareketli}
                    etiket={[cerceve && CERCEVELER[cerceve]?.ad, aura && AURALAR[aura]?.ad].filter(Boolean).join(" · ") || undefined}>
      <Avatar profile={{ ...profil, gorunen_avatar: seffaf }} boyut={boyut} />
    </PremiumCerceve>
  );
}

/** Ad + (seçiliyse) altın plaka + lig amblemi. */
function Ad({ ad, lig, plaka, amblem = true, boyut = "o", hareketli = true, amblemBoyut = 20 }) {
  return (
    <span className="pp-ad">
      {plaka ? <AltinIsimPlakasi boyut={boyut} hareketli={hareketli}>{ad}</AltinIsimPlakasi> : <span className="pp-ad-metin">{ad}</span>}
      {amblem && <LigAmblemi lig={lig} boyut={amblemBoyut} />}
    </span>
  );
}

function Yer({ ad, px, not, children, koyu = false }) {
  return (
    <figure className={`pp-yer${koyu ? " pp-yer--koyu" : ""}`}>
      <figcaption className="pp-yer-ad">{tt(ad)} <span className="pp-px">{px} px</span></figcaption>
      <div className="pp-yer-govde">{children}</div>
      {not && <p className="pp-not">{tt(not)}</p>}
    </figure>
  );
}

function GercekYerler({ s }) {
  const ben = { id: "pp-ben", gorunen_ad: "Deniz", gorunen_avatar: s.avatar };
  const pa = (p, b, h) => <PremiumAvatar profil={p} boyut={b} hareketli={h} cerceve={p === ben ? s.cerceve : null} aura={p === ben ? s.aura : null} />;
  return (
    <div className="pp-yerler">
      <Yer ad="Profil" px={88}>
        <QtKart className="qt-pf-kimlik pp-pf">
          <span className="qt-pf-avatar">{pa(ben, 88, true)}</span>
          <div className="qt-pf-kimlik-metin">
            <p className="qt-baslik-2 qt-pf-ad"><Ad ad={ben.gorunen_ad} lig={s.lig} plaka={s.plaka} boyut="b" amblemBoyut={24} /></p>
            <div className="qt-pf-rozetler"><QtRozet ton="mor">{tt("Usta")}</QtRozet><QtRozet ton="koyu">{tt("Lv {n}", { n: 24 })}</QtRozet></div>
          </div>
        </QtKart>
      </Yer>

      <Yer ad="Ana sayfa lobisi" px={64}>
        <div className="as-ko pp-as-ko">
          {pa(ben, 64, true)}
          <span className="as-ko-govde">
            <span className="as-ko-ust"><b className="as-ko-ad"><Ad ad={ben.gorunen_ad} lig={s.lig} plaka={s.plaka} boyut="k" /></b></span>
            <span className="as-ko-alt">
              <b className="as-ko-lv">{tt("Lv {n}", { n: 24 })}</b>
              <span className="as-ko-rutbe">{tt("Usta")}</span>
            </span>
            <QtIlerleme deger={62} en={100} etiket={tt("Seviye ilerlemesi")} />
          </span>
        </div>
      </Yer>

      <Yer ad="VS / rakip arama" px={92} koyu>
        <div className="qt-sahne-mac pp-vs">
          <div className="ara-vs">
            <div className="ara-kart ara-kart--ben">
              {pa(ben, 92, true)}
              <span className="ara-kart-ad"><Ad ad={ben.gorunen_ad} lig={s.lig} plaka={s.plaka} amblem={false} /></span>
              <span className="ara-kart-rozetler"><QtRozet boyut="k" ton="koyu">{tt("Lv {0}", { 0: 24 })}</QtRozet><LigAmblemi lig={s.lig} boyut={24} /></span>
            </div>
            <span className="ara-vs-rozet" aria-hidden="true"><span>VS</span></span>
            <div className="ara-kart">
              {pa(RAKIP, 92, false)}
              <span className="ara-kart-ad">{RAKIP.gorunen_ad}</span>
              <span className="ara-kart-rozetler"><QtRozet boyut="k" ton="koyu">{tt("Lv {0}", { 0: 22 })}</QtRozet><LigAmblemi lig="gumus" boyut={24} /></span>
            </div>
          </div>
        </div>
      </Yer>

      <Yer ad="Maç şeridi" px={48} not="Listeler ve şerit durağan; 48 px ve altında taşan süsler sadeleşir. Şeritte lig adının yerini amblem alır (telefonda da okunur).">
        <div className="qt-sahne-mac pp-mac">
          <QtMacUst
            sen={{ ad: tt("Sen"), avatarDugum: pa(ben, 48, false), alt: <span className="pp-serit-alt"><SeviyeEtiketi level={24} /><LigAmblemi lig={s.lig} boyut={18} /></span> }}
            rakip={{ ad: RAKIP.gorunen_ad, avatarDugum: pa(RAKIP, 48, false), alt: <span className="pp-serit-alt"><SeviyeEtiketi level={22} /><LigAmblemi lig="gumus" boyut={18} /></span> }}
            skor={[3, 2]}
          />
        </div>
      </Yer>

      <Yer ad="Maç sonu" px={76} koyu not="Çerçevenin tepesinde süs varsa sahnenin taç emojisi gizlenir (oyundaki kural).">
        <div className="pp-msk">
          <div className="msk-karsilasma pp-msk-karsilasma">
            {[[ben, "kazanan", "sol", 2], [RAKIP, "kaybeden", "sag", 0]].map(([p, rol, yan, can], i) => (
              <div key={yan} className={`msk-taraf msk-taraf--${yan} msk-taraf--${rol}`} style={{ order: i * 2 }}>
                <div className="msk-avatar">
                  {rol === "kazanan" && <span className="msk-halka" aria-hidden="true" />}
                  {rol === "kazanan" && <img className="msk-tac" src="/dukkan/tac.webp" alt="" aria-hidden="true" />}
                  {pa(p, 76, rol === "kazanan")}
                </div>
                <div className="msk-isim">
                  <span className="msk-isim-metin">{p === ben ? <Ad ad={p.gorunen_ad} lig={s.lig} plaka={s.plaka} boyut="k" /> : p.gorunen_ad}</span>
                  {p === ben && <span className="msk-sen">{tt("Sen")}</span>}
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

      <Yer ad="Lig tablosu satırı" px={40} not="Lig amblemi herkeste: lig çerçevesi takmayan oyuncunun da ligi okunur.">
        <div className="qt-liste lg-liste pp-lig" role="list">
          {[[KOMSU[0], 3, 1310], [ben, 4, 1240], [{ ...KOMSU[1] }, 5, 1185]].map(([p, sira, puan]) => (
            <div key={sira} role="listitem" className={`qt-satir-kap lg-satir-kap${p === ben ? " qt-satir-kap--vurgulu lg-ben" : ""}`}>
              <div className="lg-satir">
                <div className="lg-satir-ac">
                  <span className="lg-sira qt-sayi">{sira}</span>
                  {pa(p, 40, false)}
                  <span className="lg-bilgi">
                    <span className="lg-ad"><span className="lg-ad-metin">
                      {p === ben ? <Ad ad={p.gorunen_ad} lig={s.lig} plaka={s.plaka} boyut="k" hareketli={false} amblemBoyut={16} />
                        : <Ad ad={p.gorunen_ad} lig={p.lig} amblemBoyut={16} />}
                    </span></span>
                    <span className="lg-detay">{tt("Lv {n}", { n: 30 - sira })}</span>
                  </span>
                  <span className="lg-puan">
                    <span className="qt-sayi">{puan.toLocaleString("tr-TR")}</span>
                    <span className="lg-puan-birim">{tt("puan")}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Yer>
    </div>
  );
}

function SecimDugmeleri({ kod, secimler, onSec }) {
  const d = secimler[kod];
  return (
    <div className="pp-karar" role="group" aria-label={tt("Karar")}>
      <QtDugme boyut="k" tur={d === "girsin" ? "birincil" : "ikincil"} ikon={d === "girsin" ? "tik" : undefined}
               aria-pressed={d === "girsin"} onClick={() => onSec(kod, d === "girsin" ? null : "girsin")}>{tt("Girsin")}</QtDugme>
      <QtDugme boyut="k" tur={d === "girmesin" ? "tehlike" : "ikincil"} aria-pressed={d === "girmesin"}
               onClick={() => onSec(kod, d === "girmesin" ? null : "girmesin")}>{tt("Girmesin")}</QtDugme>
    </div>
  );
}

function Cip({ secili, onClick, children }) {
  return <button type="button" className={`pp-cip${secili ? " pp-cip--secili" : ""}`} aria-pressed={secili} onClick={onClick}>{children}</button>;
}

export default function PremiumOnizlemePage() {
  const [durum, setDurum] = useState(YEREL ? "hazir" : "yukleniyor");
  const [s, setS] = useState({ cerceve: "ejderha", aura: "gece", avatar: "/avatars/pro2/samuray-y15.svg", lig: "altin", plaka: true });
  const [secimler, setSecimler] = useState(secimOku);
  const [kopyaNot, setKopyaNot] = useState("");
  const [kopyaMetni, setKopyaMetni] = useState("");

  useEffect(() => { document.title = "Quiz Tactics — " + tt("Premium önizleme"); }, []);

  const yukle = useCallback(async () => {
    if (YEREL) { setDurum("hazir"); return; }
    setDurum("yukleniyor");
    try {
      const { data, error } = await supabase.rpc("sahip_mi");
      if (error) throw error;
      setDurum(data ? "hazir" : "sahip-degil");
    } catch (e) {
      console.error("premium-onizleme sahip kontrolü:", e?.message ?? e);
      setDurum("hata");
    }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);

  const sec = useCallback((kod, deger) => {
    setSecimler((eski) => {
      const yeni = { ...eski };
      if (deger) yeni[kod] = deger; else delete yeni[kod];
      secimYaz(yeni);
      return yeni;
    });
  }, []);

  const liste = useMemo(() => {
    const grup = (d) => KALEMLER.filter((k) => (secimler[k.kod] ?? null) === d).map((k) => `${k.ad} (${k.tur.toLowerCase()})`);
    return { girsin: grup("girsin"), girmesin: grup("girmesin"), bekliyor: grup(null) };
  }, [secimler]);

  const kopyala = async () => {
    const tarih = new Date().toLocaleString("tr-TR");
    const metin = [
      `Quiz Tactics — Premium önizleme seçimlerim (${tarih})`,
      `GİRSİN (${liste.girsin.length}): ${liste.girsin.join(", ") || "—"}`,
      `GİRMESİN (${liste.girmesin.length}): ${liste.girmesin.join(", ") || "—"}`,
      `KARAR VERİLMEDİ (${liste.bekliyor.length}): ${liste.bekliyor.join(", ") || "—"}`,
    ].join("\n");
    setKopyaMetni(metin);
    try {
      await navigator.clipboard.writeText(metin);
      setKopyaNot(tt("Kopyalandı — bana yapıştırabilirsin."));
    } catch (e) {
      console.warn("[Bildim] pano yazılamadı:", e?.message ?? e);
      setKopyaNot(tt("Pano izin vermedi — aşağıdaki metni seçip kopyala."));
    }
  };

  if (durum === "yukleniyor") {
    return <div className="qt-sayfa pp-sayfa"><div className="qt-sayfa-ic pp-ic" aria-busy="true"><QtIskelet tur="metin" adet={2} /><QtIskelet tur="kart" adet={2} /></div></div>;
  }
  if (durum !== "hazir") {
    const sahipDegil = durum === "sahip-degil";
    return (
      <div className="qt-sayfa pp-sayfa"><div className="qt-sayfa-ic pp-ic"><QtKart>
        <QtBosDurum ikon={sahipDegil ? "kilit" : "uyari"} ton={sahipDegil ? "mor" : "yanlis"}
                    baslik={sahipDegil ? tt("Bu sayfa yalnız sahibe açık") : tt("Sayfa yüklenemedi")}
                    eylem={sahipDegil ? <QtDugme as={Link} to="/" tur="ikincil" ikon="ev">{tt("Ana sayfaya dön")}</QtDugme>
                      : <QtDugme tur="ikincil" ikon="yenile" onClick={yukle}>{tt("Tekrar dene")}</QtDugme>} />
      </QtKart></div></div>
    );
  }

  const benDeneme = { id: "pp-ben", gorunen_ad: "Deniz", gorunen_avatar: s.avatar };

  return (
    <div className="qt-sayfa pp-sayfa">
      <main className="qt-sayfa-ic pp-ic">
        <header className="pp-giris">
          <h1 className="qt-baslik-1">{tt("Premium önizleme")}</h1>
          <p className="qt-govde pp-ozet">{tt("8 hareketli çerçeve, 6 iç arka plan aurası, altın isim plakası ve lig amblemi — gerçek avatarlar ve oyunun gerçek ekranlarıyla. Oyunda hiçbir şey değişmedi; seçimlerin yalnız bu tarayıcıda durur.")}</p>
        </header>

        {/* ---------------- Deneme alanı ---------------- */}
        <section className="pp-bolum" aria-labelledby="pp-deneme">
          <h2 id="pp-deneme" className="qt-baslik-2">{tt("Deneme alanı")}</h2>
          <QtKart className="pp-deneme">
            <div className="pp-sahne">
              <div className="pp-sahne-buyuk">
                <PremiumAvatar profil={benDeneme} boyut={160} hareketli cerceve={s.cerceve} aura={s.aura} />
              </div>
              <div className="pp-sahne-ad"><Ad ad="Deniz" lig={s.lig} plaka={s.plaka} boyut="b" amblemBoyut={26} /></div>
              <div className="pp-boylar">
                {[96, 64, 48, 40, 28].map((b) => (
                  <span key={b} className="pp-boy">
                    <PremiumAvatar profil={benDeneme} boyut={b} hareketli={b >= 64} cerceve={s.cerceve} aura={s.aura} />
                    <span className="pp-px">{b}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="pp-kontrol">
              <div className="pp-kontrol-sira">
                <span className="pp-etiket">{tt("Çerçeve")}</span>
                <div className="pp-cipler">
                  <Cip secili={!s.cerceve} onClick={() => setS({ ...s, cerceve: null })}>{tt("Yok")}</Cip>
                  {CERCEVE_SIRASI.map((k) => <Cip key={k} secili={s.cerceve === k} onClick={() => setS({ ...s, cerceve: k })}>{tt(CERCEVELER[k].ad)}</Cip>)}
                </div>
              </div>
              <div className="pp-kontrol-sira">
                <span className="pp-etiket">{tt("Aura")}</span>
                <div className="pp-cipler">
                  <Cip secili={!s.aura} onClick={() => setS({ ...s, aura: null })}>{tt("Yok")}</Cip>
                  {AURA_SIRASI.map((k) => <Cip key={k} secili={s.aura === k} onClick={() => setS({ ...s, aura: k })}>{tt(AURALAR[k].ad)}</Cip>)}
                </div>
              </div>
              <div className="pp-kontrol-sira">
                <span className="pp-etiket">{tt("Lig")}</span>
                <div className="pp-cipler">
                  {LIGLER.map((l) => <Cip key={l} secili={s.lig === l} onClick={() => setS({ ...s, lig: l })}><LigAmblemi lig={l} boyut={18} /> {tt(LIG_ADI[l])}</Cip>)}
                  <Cip secili={s.plaka} onClick={() => setS({ ...s, plaka: !s.plaka })}>{tt("Altın plaka")}</Cip>
                </div>
              </div>
              <div className="pp-kontrol-sira">
                <span className="pp-etiket">{tt("Avatar")} <span className="pp-px">31 + 27</span></span>
                <div className="pp-avatarlar" role="group" aria-label={tt("Avatar seç")}>
                  {AVATARLAR.map((a) => (
                    <button key={a} type="button" className={`pp-avatar-sec${s.avatar === a ? " pp-avatar-sec--secili" : ""}`}
                            aria-pressed={s.avatar === a} onClick={() => setS({ ...s, avatar: a })}>
                      <img src={a} alt="" width="40" height="40" loading="lazy" decoding="async" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </QtKart>
        </section>

        {/* ---------------- Gerçek yerler ---------------- */}
        <section className="pp-bolum" aria-labelledby="pp-yerler">
          <h2 id="pp-yerler" className="qt-baslik-2">{tt("Gerçek yerlerinde")}</h2>
          <p className="qt-kucuk qt-soluk">{tt("Deneme alanındaki seçim, oyunun gerçek bileşen sınıflarıyla ve gerçek boyutlarla. Hareket yalnız profil, lobi, VS ve maç sonunda.")}</p>
          <GercekYerler s={s} />
        </section>

        {/* ---------------- Katalog ---------------- */}
        <section className="pp-bolum" aria-labelledby="pp-cerceveler">
          <h2 id="pp-cerceveler" className="qt-baslik-2">{tt("Çerçeveler")} <span className="pp-px">8</span></h2>
          <div className="pp-katalog">
            {CERCEVE_SIRASI.map((k) => (
              <QtKart key={k} className="pp-kalem">
                <div className="pp-kalem-sahne">
                  <PremiumAvatar profil={{ id: `pp-c-${k}`, gorunen_ad: "Deniz", gorunen_avatar: s.avatar }} boyut={120} hareketli cerceve={k} aura={s.aura} />
                </div>
                <div className="pp-kalem-kucukler">
                  {[48, 40, 28].map((b) => <span key={b} className="pp-boy"><PremiumAvatar profil={benDeneme} boyut={b} cerceve={k} aura={null} /><span className="pp-px">{b}</span></span>)}
                </div>
                <h3 className="qt-baslik-3">{tt(CERCEVELER[k].ad)}</h3>
                <p className="qt-kucuk qt-soluk">{tt(CERCEVELER[k].aciklama)}</p>
                <div className="pp-kalem-alt">
                  <QtDugme boyut="k" tur="hayalet" onClick={() => { setS({ ...s, cerceve: k }); document.getElementById("pp-deneme")?.scrollIntoView({ behavior: "smooth" }); }}>{tt("Denemede gör")}</QtDugme>
                  <SecimDugmeleri kod={`cerceve:${k}`} secimler={secimler} onSec={sec} />
                </div>
              </QtKart>
            ))}
          </div>
        </section>

        <section className="pp-bolum" aria-labelledby="pp-auralar">
          <h2 id="pp-auralar" className="qt-baslik-2">{tt("Arka plan auraları")} <span className="pp-px">6</span></h2>
          <p className="qt-kucuk qt-soluk">{tt("Çerçevenin içindeki düz duvarın yerine hareketli sahne; dairenin dışına taşmaz, avatar önde.")}</p>
          <div className="pp-katalog">
            {AURA_SIRASI.map((k) => (
              <QtKart key={k} className="pp-kalem">
                <div className="pp-kalem-sahne pp-kalem-sahne--aura">
                  <PremiumAvatar profil={{ id: `pp-a-${k}`, gorunen_ad: "Deniz", gorunen_avatar: s.avatar }} boyut={140} hareketli cerceve={null} aura={k} />
                </div>
                <div className="pp-kalem-kucukler">
                  {[64, 48, 40].map((b) => <span key={b} className="pp-boy"><PremiumAvatar profil={benDeneme} boyut={b} cerceve={null} aura={k} /><span className="pp-px">{b}</span></span>)}
                </div>
                <h3 className="qt-baslik-3">{tt(AURALAR[k].ad)}</h3>
                <p className="qt-kucuk qt-soluk">{tt(AURALAR[k].aciklama)}</p>
                <div className="pp-kalem-alt">
                  <QtDugme boyut="k" tur="hayalet" onClick={() => { setS({ ...s, aura: k }); document.getElementById("pp-deneme")?.scrollIntoView({ behavior: "smooth" }); }}>{tt("Denemede gör")}</QtDugme>
                  <SecimDugmeleri kod={`aura:${k}`} secimler={secimler} onSec={sec} />
                </div>
              </QtKart>
            ))}
          </div>
        </section>

        <section className="pp-bolum" aria-labelledby="pp-isim">
          <h2 id="pp-isim" className="qt-baslik-2">{tt("İsim ve lig")}</h2>
          <div className="pp-katalog pp-katalog--iki">
            <QtKart className="pp-kalem">
              <h3 className="qt-baslik-3">{tt("Altın isim plakası")}</h3>
              <div className="pp-karsilastir">
                <div className="pp-karsilastir-kutu pp-acik">
                  <span className="pp-karsilastir-etiket">{tt("Yeni")}</span>
                  <AltinIsimPlakasi boyut="b">Deniz</AltinIsimPlakasi>
                  <AltinIsimPlakasi boyut="k">Kıvılcım_42</AltinIsimPlakasi>
                </div>
                <div className="pp-karsilastir-kutu qt-sahne-mac">
                  <span className="pp-karsilastir-etiket">{tt("Yeni · koyu zemin")}</span>
                  <AltinIsimPlakasi boyut="b">Deniz</AltinIsimPlakasi>
                </div>
                <div className="pp-karsilastir-kutu pp-acik">
                  <span className="pp-karsilastir-etiket">{tt("Şimdiki altın isim")}</span>
                  <span className="pp-simdiki"><IsimEfekti ef="isim_altin" hareketli>Deniz</IsimEfekti></span>
                </div>
                <div className="pp-karsilastir-kutu qt-sahne-mac">
                  <span className="pp-karsilastir-etiket">{tt("Şimdiki · koyu zemin")}</span>
                  <span className="pp-simdiki"><IsimEfekti ef="isim_altin" hareketli>Deniz</IsimEfekti></span>
                </div>
              </div>
              <p className="qt-kucuk qt-soluk">{tt("Koyudan parlağa metal altın, ince koyu kenar, arada üstünden geçen parıltı; altın çerçeveli koyu plaka.")}</p>
              <SecimDugmeleri kod="plaka:altin" secimler={secimler} onSec={sec} />
            </QtKart>
            <QtKart className="pp-kalem">
              <h3 className="qt-baslik-3">{tt("Lig amblemi")}</h3>
              <div className="pp-amblemler">
                {LIGLER.map((l) => (
                  <span key={l} className="pp-amblem-kutu">
                    <LigAmblemi lig={l} boyut={36} />
                    <span className="pp-amblem-boylar"><LigAmblemi lig={l} boyut={20} /><LigAmblemi lig={l} boyut={16} /></span>
                    <span className="qt-kucuk">{tt(LIG_ADI[l])}</span>
                  </span>
                ))}
              </div>
              <p className="qt-kucuk qt-soluk">{tt("İsmin yanında her yerde; çerçeveden bağımsız. Lig çerçevesi takmayan oyuncunun da ligi okunur.")}</p>
              <SecimDugmeleri kod="rozet:lig" secimler={secimler} onSec={sec} />
            </QtKart>
          </div>
        </section>

        {/* ---------------- Seçimler ---------------- */}
        <section className="pp-bolum" aria-labelledby="pp-secimler">
          <h2 id="pp-secimler" className="qt-baslik-2">{tt("Seçimlerim")}</h2>
          <QtKart className="pp-ozet-kart">
            <p><b>{tt("Girsin")} ({liste.girsin.length}):</b> {liste.girsin.join(", ") || "—"}</p>
            <p><b>{tt("Girmesin")} ({liste.girmesin.length}):</b> {liste.girmesin.join(", ") || "—"}</p>
            <p className="qt-soluk"><b>{tt("Karar verilmedi")} ({liste.bekliyor.length}):</b> {liste.bekliyor.join(", ") || "—"}</p>
            <QtDugme tamGenislik ikon="kopyala" onClick={kopyala}>{tt("Seçimlerimi kopyala")}</QtDugme>
            <p className="pp-kopya-not" role="status" aria-live="polite">{kopyaNot}</p>
            {kopyaMetni && <textarea className="pp-kopya-metin" readOnly value={kopyaMetni} rows={5} onFocus={(e) => e.target.select()} aria-label={tt("Kopyalanacak metin")} />}
          </QtKart>
        </section>
      </main>
    </div>
  );
}
