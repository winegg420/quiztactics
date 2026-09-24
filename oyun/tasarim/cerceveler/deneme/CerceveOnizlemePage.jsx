// /cerceve-onizleme — çerçeve TARZI seçimi (Ajan B, 24 Eyl 2026). Altın Lig çerçevesi üç tarzda
// (A Çizgi · B Mücevher · C Çizgi + Işık) + bugünkü çerçeve, oyundaki gerçek yerlerinde, gerçek boyutlarla.
// Menüde yok; yalnız sahip hesabıyla açılır (sunucu: sahip_mi(), migration 380). Seçim sunucuda
// (sahip_tasarim_secimleri, migration 530): tek seçim, yalnız sahip yazar, yenileyince durur.
//
// Ölçülen gerçek boyutlar (dış çap, kaynak koddaki `boyut`):
//   ana sayfa oyuncu kartı 64 (anasayfa/parcalar.jsx › KompaktOyuncu) · maç şeridi 48 (MatchPage, DuelloPage, DuelloV2)
//   lig tablosu satırı 40 (LeaderboardPage) · ana sayfa lig kartı 28 (parcalar.jsx) · maç sonu VS 76
//   (MacSonuKutlama; kazanan ×1,15 ölçekli) · profil 88 (ProfilePage).
// Yerler gerçek bileşenlerin sınıflarıyla (as-ko, qt-mac-ust, lg-satir, as-lk-satir, msk-karsilasma, qt-pf-kimlik) çizilir.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../../src/lib/supabase.js";
import Avatar from "../../../../src/components/Avatar.jsx";
import CerceveGorseli, { icBoyut } from "../CerceveGorseli.jsx";
import DenemeCerceve, { denemeIcBoyut } from "./DenemeCerceve.jsx";
import { QtBosDurum, QtCan, QtDugme, QtIkon, QtIlerleme, QtIskelet, QtKart, QtLigRozeti, QtMacUst, QtRozet } from "../../index.js";
import { SeviyeEtiketi } from "../../../components/MacUstSerit.jsx";
import { aktifDil, tt } from "../../../lib/dil.js";
import "../../../pages/anasayfa/anasayfa.css";
import "../../../pages/lig-a.css";
import "../../ekranlar/dukkan-profil.css";
import "../../ekranlar/mac-sonu-kutlama.css";
import "./cerceve-onizleme.css";

const KONU = "cerceve_tarzi";

// Sayfa-içi İngilizce (paylaşımlı sözlüğe dokunmaz; sayfa yalnız sahibe açık).
const EN = {
  "Çerçeve tarzı": "Frame style",
  "Altın Lig çerçevesi üç tarzda, oyundaki gerçek yerlerinde ve gerçek boyutlarında. Beğendiğini seç; bütün çerçeveler sonra o tarzda yeniden çizilecek.":
    "The Gold League frame in three styles, in its real places and real sizes in the game. Pick one; every frame will then be redrawn in that style.",
  "A Çizgi: avatarlarla aynı kalın kontur, düz renk · B Mücevher: degrade metal, kabartma, yüzeyli taşlar · C Çizgi + Işık: A'nın üstüne sıcak hale ve arada geçen ışık.":
    "A Line: same thick outline and flat colour as the avatars · B Jewel: gradient metal, bevel, faceted gems · C Line + Light: A plus a warm halo and an occasional light sweep.",
  "Şimdiki": "Current", "A · Çizgi": "A · Line", "B · Mücevher": "B · Jewel", "C · Çizgi + Işık": "C · Line + Light",
  "Bunu seç": "Choose this", "Seçildi": "Chosen", "Seçim: {ad}": "Chosen: {ad}", "Henüz seçim yok": "Nothing chosen yet",
  "Seçim kaydedilemedi": "Could not save the choice",
  "Bu sayfa yalnız sahibe açık": "This page is open to the owner only",
  "Çerçeve tarzını yalnız oyunun sahibi seçebilir.": "Only the game's owner can choose the frame style.",
  "Seçim yüklenemedi": "Could not load the choice", "Tekrar dene": "Try again", "Ana sayfaya dön": "Back to home",
  "Ana sayfa oyuncu kartı": "Home player card", "Maç şeridi": "Match bar", "Lig tablosu satırı": "League table row",
  "Ana sayfa lig kartı": "Home league card", "Maç sonu": "Match end", "Profil": "Profile",
  "Yan yana": "Side by side", "Tarzlar": "Styles",
  "Oyundaki bugünkü Altın Lig çerçevesi (Noto 3D süs + CSS halka).": "Today's Gold League frame in the game (Noto 3D ornaments + CSS ring).",
  "Avatarlarla aynı çizim dili: lacivert kontur, düz altın, tek kademe gölge. Her boyutta keskin (SVG).":
    "Same drawing language as the avatars: navy outline, flat gold, one shadow step. Sharp at every size (SVG).",
  "Gerçekçiye yakın: degrade metal, kabartma kenar, boncuk dizisi, yüzeyli yakut ve safir, yumuşak gölge.":
    "Near-realistic: gradient metal, bevelled edges, a bead row, faceted ruby and sapphire, soft shadow.",
  "A'nın aynısı + sıcak hale; 6 sn'de bir ışık şeridi geçer, taçta kıvılcım. Azaltılmış harekette durağan.":
    "Same as A + a warm halo; a light sweep every 6 s and a sparkle on the crown. Still with reduced motion.",
  "Sen": "You", "puan": "points", "doğru": "correct", "Seviye ilerlemesi": "Level progress", "Usta": "Master",
  "Kazanan tarafta maç sonunun kendi tacı ve halkası da çıkar (bugünkü davranış).": "The winner side also shows the match end's own crown and halo (current behaviour).",
};
function ts(anahtar, degerler) {
  const metin = aktifDil() === "en" && EN[anahtar] ? EN[anahtar] : tt(anahtar);
  if (!degerler) return metin;
  return metin.replace(/\{(\w+)\}/g, (tam, ad) => (ad in degerler ? String(degerler[ad] ?? "") : tam));
}

const SEN = { id: "onizleme-sen", gorunen_ad: "Deniz", gorunen_avatar: "/avatars/pro/kedi-k01.svg" };
const RAKIP = { id: "onizleme-rakip", gorunen_ad: "Mert", gorunen_avatar: "/avatars/pro/tilki-k04.svg" };
const KOMSULAR = [
  { gorunen_ad: "Elif", gorunen_avatar: "/avatars/pro/baykus-k03.svg" },
  { gorunen_ad: "Kaan", gorunen_avatar: "/avatars/pro/robot-k15.svg" },
];

/** Tarz tanımları; `ciz(boyut, profil, hareketli)` çerçeveli avatarı döndürür. */
const TARZLAR = [
  {
    kod: "simdiki", ad: "Şimdiki", aciklama: "Oyundaki bugünkü Altın Lig çerçevesi (Noto 3D süs + CSS halka).",
    ciz: (b, p, h) => (
      <CerceveGorseli anahtar="lig_altin" boyut={b} hareketli={h} sinirsiz>
        <Avatar profile={p} boyut={icBoyut(b, true)} />
      </CerceveGorseli>
    ),
  },
  ...[
    ["cizgi", "A · Çizgi", "Avatarlarla aynı çizim dili: lacivert kontur, düz altın, tek kademe gölge. Her boyutta keskin (SVG)."],
    ["mucevher", "B · Mücevher", "Gerçekçiye yakın: degrade metal, kabartma kenar, boncuk dizisi, yüzeyli yakut ve safir, yumuşak gölge."],
    ["isik", "C · Çizgi + Işık", "A'nın aynısı + sıcak hale; 6 sn'de bir ışık şeridi geçer, taçta kıvılcım. Azaltılmış harekette durağan."],
  ].map(([kod, ad, aciklama]) => ({
    kod, ad, aciklama, secilir: true,
    ciz: (b, p, h) => (
      <DenemeCerceve tarz={kod} boyut={b} hareketli={h}>
        <Avatar profile={p} boyut={denemeIcBoyut(b)} />
      </DenemeCerceve>
    ),
  })),
];

function Yer({ ad, px, children, not }) {
  return (
    <figure className="co-yer">
      <figcaption className="co-yer-ad">{ts(ad)} <span className="co-px">{px} px</span></figcaption>
      {children}
      {not && <p className="co-not">{not}</p>}
    </figure>
  );
}

function Yerler({ t }) {
  return (
    <div className="co-yerler">
      <Yer ad="Ana sayfa oyuncu kartı" px={64}>
        <div className="as-ko co-as-ko">
          {t.ciz(64, SEN, true)}
          <span className="as-ko-govde">
            <span className="as-ko-ust">
              <b className="as-ko-ad">{SEN.gorunen_ad}</b>
              <QtLigRozeti lig="altin" boyut="k" />
            </span>
            <span className="as-ko-alt">
              <b className="as-ko-lv">{tt("Lv {n}", { n: 24 })}</b>
              <span className="as-ko-rutbe">{ts("Usta")}</span>
            </span>
            <QtIlerleme deger={62} en={100} etiket={ts("Seviye ilerlemesi")} />
          </span>
        </div>
      </Yer>

      <Yer ad="Maç şeridi" px={48}>
        <div className="qt-sahne-mac co-mac">
          <QtMacUst
            sen={{ ad: ts("Sen"), avatarDugum: t.ciz(48, SEN, true), alt: <SeviyeEtiketi level={24} lig="altin" /> }}
            rakip={{ ad: RAKIP.gorunen_ad, avatarDugum: t.ciz(48, RAKIP, true), alt: <SeviyeEtiketi level={22} lig="altin" /> }}
            skor={[3, 2]}
          />
        </div>
      </Yer>

      <Yer ad="Lig tablosu satırı" px={40}>
        <div className="qt-liste lg-liste co-lig" role="list">
          {[[KOMSULAR[0], 3, 1310], [SEN, 4, 1240], [RAKIP, 5, 1185]].map(([p, sira, puan]) => (
            <div key={sira} role="listitem" className={`qt-satir-kap lg-satir-kap${p === SEN ? " qt-satir-kap--vurgulu lg-ben" : ""}`}>
              <div className="lg-satir">
                <div className="lg-satir-ac">
                  <span className="lg-sira qt-sayi">{sira}</span>
                  {t.ciz(40, p, false)}
                  <span className="lg-bilgi">
                    <span className="lg-ad"><span className="lg-ad-metin">{p.gorunen_ad}</span></span>
                    <span className="lg-detay">{tt("Lv {n}", { n: 30 - sira })}</span>
                  </span>
                  <span className="lg-puan">
                    <span className="qt-sayi">{puan.toLocaleString("tr-TR")}</span>
                    <span className="lg-puan-birim">{ts("puan")}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Yer>

      <Yer ad="Ana sayfa lig kartı" px={28}>
        <div className="as-lk co-lk">
          <ol className="as-lk-liste">
            {[[KOMSULAR[1], 3, 1310], [SEN, 4, 1240], [RAKIP, 5, 1185]].map(([p, sira, puan]) => (
              <li key={sira} className={`as-lk-satir${p === SEN ? " as-lk-satir--ben" : ""}`}>
                <span className="as-lk-no qt-sayi">{sira}</span>
                {t.ciz(28, p, false)}
                <span className="as-lk-ad">{p === SEN ? ts("Sen") : p.gorunen_ad}</span>
                <span className="as-lk-puan qt-sayi">{puan.toLocaleString("tr-TR")}</span>
              </li>
            ))}
          </ol>
        </div>
      </Yer>

      <Yer ad="Maç sonu" px={76} not={ts("Kazanan tarafta maç sonunun kendi tacı ve halkası da çıkar (bugünkü davranış).")}>
        <div className="co-msk">
          <div className="msk-karsilasma co-msk-karsilasma">
            {[[SEN, "kazanan", "sol", 2], [RAKIP, "kaybeden", "sag", 0]].map(([p, rol, yan, can], i) => (
              <div key={yan} className={`msk-taraf msk-taraf--${yan} msk-taraf--${rol}`} style={{ order: i * 2 }}>
                <div className="msk-avatar">
                  {rol === "kazanan" && <span className="msk-halka" aria-hidden="true" />}
                  {rol === "kazanan" && <img className="msk-tac" src="/dukkan/tac.webp" alt="" aria-hidden="true" />}
                  {t.ciz(76, p, rol === "kazanan")}
                </div>
                <div className="msk-isim">
                  <span className="msk-isim-metin">{p.gorunen_ad}</span>
                  {p === SEN && <span className="msk-sen">{ts("Sen")}</span>}
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

      <Yer ad="Profil" px={88}>
        <QtKart className="qt-pf-kimlik co-pf">
          <span className="qt-pf-avatar">{t.ciz(88, SEN, true)}</span>
          <div className="qt-pf-kimlik-metin">
            <p className="qt-baslik-2 qt-pf-ad">{SEN.gorunen_ad}</p>
            <div className="qt-pf-rozetler"><QtRozet ton="mor">{ts("Usta")}</QtRozet><QtLigRozeti lig="altin" /></div>
          </div>
        </QtKart>
      </Yer>
    </div>
  );
}

export default function CerceveOnizlemePage() {
  const [durum, setDurum] = useState("yukleniyor");   // yukleniyor · sahip-degil · hata · hazir
  const [secim, setSecim] = useState(null);
  const [kaydedilen, setKaydedilen] = useState(null);   // kaydedilmekte olan tarz
  const [uyari, setUyari] = useState("");

  useEffect(() => { document.title = "Quiz Tactics — " + ts("Çerçeve tarzı"); }, []);

  const yukle = useCallback(async () => {
    setDurum("yukleniyor");
    try {
      const { data: sahip, error: e1 } = await supabase.rpc("sahip_mi");
      if (e1) throw e1;
      if (!sahip) { setDurum("sahip-degil"); return; }
      const { data, error: e2 } = await supabase.rpc("tasarim_secimi", { p_konu: KONU });
      if (e2) throw e2;
      setSecim(typeof data === "string" ? data : null);
      setDurum("hazir");
    } catch (e) {
      console.error("cerceve-onizleme yükleme:", e);
      setDurum("hata");
    }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  const sec = useCallback(async (kod) => {
    const onceki = secim;
    setSecim(kod);            // iyimser; hatada geri alınır
    setKaydedilen(kod);
    setUyari("");
    try {
      const { data, error } = await supabase.rpc("tasarim_secimi_kaydet", { p_konu: KONU, p_secim: kod });
      if (error) throw error;
      setSecim(typeof data === "string" ? data : kod);
    } catch (e) {
      console.error("cerceve-onizleme kayıt:", e);
      setSecim(onceki);
      setUyari(ts("Seçim kaydedilemedi"));
    } finally {
      setKaydedilen(null);
    }
  }, [secim]);

  if (durum === "yukleniyor") {
    return (
      <div className="qt-sayfa co-sayfa">
        <div className="qt-sayfa-ic co-ic" aria-busy="true">
          <QtIskelet tur="metin" adet={2} />
          <QtIskelet tur="kart" adet={2} />
        </div>
      </div>
    );
  }
  if (durum === "sahip-degil" || durum === "hata") {
    const sahipDegil = durum === "sahip-degil";
    return (
      <div className="qt-sayfa co-sayfa">
        <div className="qt-sayfa-ic co-ic">
          <QtKart>
            <QtBosDurum
              ikon={sahipDegil ? "kilit" : "uyari"}
              ton={sahipDegil ? "mor" : "yanlis"}
              baslik={sahipDegil ? ts("Bu sayfa yalnız sahibe açık") : ts("Seçim yüklenemedi")}
              metin={sahipDegil ? ts("Çerçeve tarzını yalnız oyunun sahibi seçebilir.") : undefined}
              eylem={sahipDegil
                ? <QtDugme as={Link} to="/" tur="ikincil" ikon="ev">{ts("Ana sayfaya dön")}</QtDugme>
                : <QtDugme tur="ikincil" ikon="yenile" onClick={yukle}>{ts("Tekrar dene")}</QtDugme>}
            />
          </QtKart>
        </div>
      </div>
    );
  }

  const seciliTarz = TARZLAR.find((t) => t.kod === secim);

  return (
    <div className="qt-sayfa co-sayfa">
      <main className="qt-sayfa-ic co-ic">
        <header className="co-giris">
          <h1 className="qt-baslik-1">{ts("Çerçeve tarzı")}</h1>
          <p className="qt-govde co-ozet">
            {ts("A Çizgi: avatarlarla aynı kalın kontur, düz renk · B Mücevher: degrade metal, kabartma, yüzeyli taşlar · C Çizgi + Işık: A'nın üstüne sıcak hale ve arada geçen ışık.")}
          </p>
          <p className="qt-kucuk co-alt">
            {ts("Altın Lig çerçevesi üç tarzda, oyundaki gerçek yerlerinde ve gerçek boyutlarında. Beğendiğini seç; bütün çerçeveler sonra o tarzda yeniden çizilecek.")}
          </p>
          <p className="co-durum" role="status" aria-live="polite">
            {seciliTarz ? <QtRozet ton="dogru" ikon="tik">{ts("Seçim: {ad}", { ad: ts(seciliTarz.ad) })}</QtRozet>
              : <QtRozet ton="notr">{ts("Henüz seçim yok")}</QtRozet>}
            {uyari && <QtRozet ton="yanlis" ikon="uyari">{uyari}</QtRozet>}
          </p>
        </header>

        <section className="co-bolum" aria-labelledby="co-yanyana">
          <h2 id="co-yanyana" className="qt-baslik-2">{ts("Yan yana")}</h2>
          <div className="co-yanyana">
            {TARZLAR.map((t) => (
              <a key={t.kod} href={`#co-${t.kod}`} className={`co-yy${secim === t.kod ? " co-yy--secili" : ""}`}>
                <span className="co-yy-buyuk">{t.ciz(96, SEN, true)}</span>
                <span className="co-yy-kucukler">
                  {t.ciz(48, RAKIP, false)}
                  {t.ciz(40, KOMSULAR[0], false)}
                  {t.ciz(28, KOMSULAR[1], false)}
                </span>
                <b className="co-yy-ad">{ts(t.ad)}</b>
              </a>
            ))}
          </div>
        </section>

        <section className="co-bolum" aria-labelledby="co-tarzlar">
          <h2 id="co-tarzlar" className="qt-baslik-2">{ts("Tarzlar")}</h2>
          <div className="co-sutunlar">
            {TARZLAR.map((t) => (
              <QtKart key={t.kod} dolgu="o" className={`co-sutun${secim === t.kod ? " co-sutun--secili" : ""}`} id={`co-${t.kod}`}>
                <div className="co-sutun-bas">
                  <h3 className="qt-baslik-3">{ts(t.ad)}</h3>
                  <p className="qt-kucuk qt-soluk">{ts(t.aciklama)}</p>
                </div>
                <Yerler t={t} />
                {t.secilir && (
                  secim === t.kod ? (
                    <QtDugme tur="ikincil" ikon="tik" tamGenislik devreDisi aria-pressed="true">{ts("Seçildi")}</QtDugme>
                  ) : (
                    <QtDugme tur="birincil" tamGenislik yukleniyor={kaydedilen === t.kod}
                             devreDisi={kaydedilen != null} onClick={() => sec(t.kod)}>
                      {ts("Bunu seç")}
                    </QtDugme>
                  )
                )}
              </QtKart>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
