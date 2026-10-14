import { useEffect, useState } from "react";
import { QtMarka, QtCip, QtKart, QtDugme } from "../../oyun/tasarim/index.js";
import "../../oyun/tasarim/ekranlar/g-ortak.css";
import "../../oyun/tasarim/ekranlar/g-giris.css";
import "../../oyun/tasarim/ekranlar/g-ekle.css";
import "../../oyun/tasarim/ekranlar/g-kurulum.css";
import { PaylasIkonu, ArtiKutuIkonu } from "../../oyun/components/AnaEkranaEkle.jsx";
import {
  iosMu, iosSafariMi, androidMu, uygulamaIciTarayici, macSafariMi, masaustuChromiumMu,
  kurulumDurumu, kurulumDinle, kurulumuBaslat, cihazTipi,
} from "../lib/uygulamaKipi.js";
import { supabase } from "../lib/supabase.js";
import { ModFiguru } from "../../oyun/components/ModFiguru.jsx";
import { useDil } from "../../oyun/lib/dilKanca.js";
import { DILLER } from "../../oyun/lib/dil.js";

// ============================================================
// KURULUM SAYFASI — quiztactics.com tarayıcıda yalnız tanıtım + kurulum.
//
// Oyun yalnız kurulu uygulamada açılır (src/lib/uygulamaKipi.js › oyunAcilabilir).
// Tarayıcı sekmesinde oyun rotalarından herhangi biri bu sayfayı gösterir.
// Düzen giriş ekranıyla aynı (g-giris): solda vitrin, sağda kurulum kartı.
// ============================================================

const MODLAR = [
  { tur: "klasik", ad: "Klasik", vaat: "Hızlı sorular, en çok bilen kazanır" },
  { tur: "duello", ad: "Düello", vaat: "Kontrolü al, 3/3 yap" },
  { tur: "kasa", ad: "Ortak Hazine", vaat: "Doğru anda aç" },
];

/** Bu tarayıcıda hangi kurulum yolu var? */
function senaryo() {
  if (androidMu() && uygulamaIciTarayici()) return "android-uygulama-ici";   // Instagram/WhatsApp/Facebook…
  if (iosMu() && !iosSafariMi()) return "ios-safari-degil";                 // iOS Chrome/Firefox, uygulama içi
  if (iosMu()) return "ios-safari";
  if (androidMu()) return "android";
  if (macSafariMi()) return "mac-safari";
  if (masaustuChromiumMu()) return "masaustu-chromium";
  return "masaustu-diger";                                                  // Firefox vb.: kurulum yok → QR
}

/** Android: bu adresi Chrome'da açan intent bağlantısı (Chrome yoksa aynı adres tarayıcıda açılır). */
function chromeIntent() {
  const { host, pathname, search, href } = window.location;
  return `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
}

/** Bağlantıyı kopyala — davet yolu dahil o anki adres kopyalanır. */
function BaglantiKopyala({ ceviri }) {
  const [durum, setDurum] = useState(null);   // null | "tamam" | "hata"
  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setDurum("tamam");
    } catch (e) {
      console.warn("[Kurulum] pano yazılamadı:", e?.message ?? e);
      setDurum("hata");
    }
  };
  return (
    <>
      <QtDugme tur="ikincil" tamGenislik onClick={kopyala}>
        {durum === "tamam" ? ceviri("Bağlantı kopyalandı") : ceviri("Bağlantıyı kopyala")}
      </QtDugme>
      {/* Pano izni yoksa adres elle kopyalansın diye yazılır */}
      {durum === "hata" && <p className="qt-kucuk g-kurulum-adres">{window.location.href}</p>}
    </>
  );
}

/** Telefona geçiş QR kodu (masaüstü). Kod sabit: https://quiztactics.com */
function TelefonQr({ ceviri }) {
  return (
    <div className="g-kurulum-qr">
      <img src="/quiztactics-qr.svg" alt={ceviri("quiztactics.com için QR kodu")} width="132" height="132" />
      <p className="qt-kucuk qt-soluk">{ceviri("Telefonunun kamerasıyla okut, açılan sayfadan uygulamayı kur.")}</p>
    </div>
  );
}

export function KurulumKarti({ ceviri }) {
  const [yol] = useState(senaryo);
  const [kurulum, setKurulum] = useState(kurulumDurumu);
  const [bekliyor, setBekliyor] = useState(false);
  useEffect(() => kurulumDinle(() => setKurulum(kurulumDurumu())), []);

  const kur = async () => {
    setBekliyor(true);
    try { await kurulumuBaslat(); } finally { setBekliyor(false); }
  };

  if (kurulum.kuruldu) {
    return (
      <div className="g-kurulum-icerik" data-senaryo="kuruldu">
        <p className="g-kurulum-tamam">{ceviri("Uygulama kuruldu.")}</p>
        <p className="qt-kucuk qt-soluk">
          {ceviri(yol.startsWith("masaustu") ? "Quiz Tactics'i uygulamalar listenden aç." : "Ana ekranındaki Quiz Tactics simgesine dokun.")}
        </p>
      </div>
    );
  }

  if (yol === "android-uygulama-ici") {
    return (
      <div className="g-kurulum-icerik" data-senaryo={yol}>
        <p className="qt-kucuk">{ceviri("Bu sayfa bir uygulamanın içinde açıldı. Kurmak için Chrome'da aç.")}</p>
        <QtDugme tur="birincil" tamGenislik onClick={() => { window.location.href = chromeIntent(); }}>
          {ceviri("Chrome'da aç")}
        </QtDugme>
        <BaglantiKopyala ceviri={ceviri} />
      </div>
    );
  }

  if (yol === "ios-safari-degil") {
    return (
      <div className="g-kurulum-icerik" data-senaryo={yol}>
        <p className="qt-kucuk">{ceviri("iPhone'da uygulama Safari'den kurulur.")}</p>
        <ol className="g-ekle-adimlar">
          <li><span>{ceviri("Menüden")} <b>{ceviri("Safari'de aç")}</b>{ceviri("'ı seç ya da bağlantıyı kopyalayıp Safari'ye yapıştır")}</span></li>
          <li><span>{ceviri("Safari'de")} <PaylasIkonu /> <b>{ceviri("Paylaş")}</b> → <ArtiKutuIkonu /> <b>{ceviri("Ana Ekrana Ekle")}</b></span></li>
        </ol>
        <BaglantiKopyala ceviri={ceviri} />
      </div>
    );
  }

  if (yol === "ios-safari") {
    return (
      <div className="g-kurulum-icerik" data-senaryo={yol}>
        <ol className="g-ekle-adimlar">
          <li><span>{ceviri("Safari'nin")} <PaylasIkonu /> <b>{ceviri("Paylaş")}</b> {ceviri("düğmesine dokun")}</span></li>
          <li><span>{ceviri("Listeden")} <ArtiKutuIkonu /> <b>{ceviri("Ana Ekrana Ekle")}</b>{ceviri("'yi seç")}</span></li>
          <li><span>{ceviri("Sağ üstten")} <b>{ceviri("Ekle")}</b>{ceviri("'ye bas — kısayol ana ekranında")}</span></li>
          <li><span>{ceviri("Ana ekrandaki Quiz Tactics simgesinden aç")}</span></li>
        </ol>
      </div>
    );
  }

  if (yol === "mac-safari") {
    return (
      <div className="g-kurulum-icerik" data-senaryo={yol}>
        <ol className="g-ekle-adimlar">
          <li><span>{ceviri("Safari menüsünden")} <b>{ceviri("Dosya")}</b> → <b>{ceviri("Dock'a Ekle")}</b>{ceviri("'yi seç")}</span></li>
          <li><span>{ceviri("Quiz Tactics'i Dock'tan aç")}</span></li>
        </ol>
        <p className="qt-kucuk qt-soluk">{ceviri("Dock'a Ekle macOS Sonoma (Safari 17) ve sonrasında var.")}</p>
        <TelefonQr ceviri={ceviri} />
      </div>
    );
  }

  if (yol === "masaustu-diger") {
    return (
      <div className="g-kurulum-icerik" data-senaryo={yol}>
        <p className="qt-kucuk">{ceviri("Bu tarayıcı uygulama kuramıyor. Chrome ya da Edge ile aç veya telefonuna kur.")}</p>
        <TelefonQr ceviri={ceviri} />
      </div>
    );
  }

  // android · masaustu-chromium: tarayıcının kurulum penceresi (olay geldiyse), yoksa menüden.
  return (
    <div className="g-kurulum-icerik" data-senaryo={yol}>
      {kurulum.hazir ? (
        <QtDugme tur="birincil" tamGenislik yukleniyor={bekliyor} onClick={kur}>
          {ceviri("Uygulamayı yükle")}
        </QtDugme>
      ) : (
        <ol className="g-ekle-adimlar">
          {yol === "android" ? (
            <li><span>{ceviri("Tarayıcı menüsünden (⋮)")} <b>{ceviri("Uygulamayı yükle")}</b> {ceviri("ya da")} <b>{ceviri("Ana ekrana ekle")}</b>{ceviri("'yi seç")}</span></li>
          ) : (
            <li><span>{ceviri("Adres çubuğundaki yükle simgesine ya da menüden")} <b>{ceviri("Uygulamayı yükle")}</b>{ceviri("'ye tıkla")}</span></li>
          )}
          <li><span>{ceviri("Zaten kuruluysa Quiz Tactics'i uygulamadan aç")}</span></li>
        </ol>
      )}
      {yol === "masaustu-chromium" && <TelefonQr ceviri={ceviri} />}
    </div>
  );
}

/**
 * Bekleyen davet (migration 1096): uygulama tarayıcının deposunu GÖRMEDİĞİ yerlerde (iOS Safari ↔ ana ekran,
 * macOS Safari ↔ Dock, uygulama içi tarayıcılar) davet sunucuya bırakılır; uygulamada giriş yapan yeni hesaba
 * aynı ağ + cihaz tipinden "X seni davet etti, doğru mu?" diye sorulur (DavetEslestirme.jsx).
 * Android Chrome ve masaüstü Chromium'da kurulan uygulama aynı depoyu paylaştığı için gerekmez.
 * Sunucu ham IP saklamaz; oturumsuz çağrılır (yalnız bu RPC anon'a açık). Sekme başına bir kez.
 */
function davetiSunucuyaBirak(kod, referans) {
  const yol = senaryo();
  if (yol === "android" || yol === "masaustu-chromium") return;
  const tur = kod ? "arkadas" : referans ? "referans" : null;
  const deger = kod || referans;
  if (!tur) return;
  const anahtar = `qt_davet_birakildi_${deger}`;
  try {
    if (window.sessionStorage.getItem(anahtar)) return;
    window.sessionStorage.setItem(anahtar, "1");
  } catch { /* özel mod: yine de bir kez dene */ }
  supabase
    .rpc("davet_bekle_kaydet", { p_tur: tur, p_deger: deger, p_cihaz: cihazTipi() })
    .then(({ error }) => { if (error) console.warn("[Kurulum] davet sunucuya bırakılamadı:", error.message); })
    .catch((e) => console.warn("[Kurulum] davet sunucuya bırakılamadı:", e?.message ?? e));
}

/** Davet kodu kartı: eşleştirme olmazsa (paylaşılan ağ) oyuncu kodu uygulamada elle girer. */
export function DavetKoduKarti({ kod, ceviri }) {
  const [kopyalandi, setKopyalandi] = useState(false);
  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(kod);
      setKopyalandi(true);
    } catch (e) {
      console.warn("[Kurulum] kod kopyalanamadı:", e?.message ?? e);
    }
  };
  return (
    <div className="g-kurulum-davet">
      <p className="qt-kucuk"><b>{ceviri("Davet kodun")}</b></p>
      <p className="g-kurulum-davet-kod">{kod}</p>
      <QtDugme tur="ikincil" tamGenislik onClick={kopyala}>
        {kopyalandi ? ceviri("Kod kopyalandı") : ceviri("Kodu kopyala")}
      </QtDugme>
      <p className="qt-kucuk qt-soluk">{ceviri("Uygulamada davet otomatik gelmezse Arkadaşlar › Davet koduyla ekle'ye yapıştır.")}</p>
    </div>
  );
}

const DAVET_KODU_ANAHTAR = "bildim_davet_kodu";   // DavetPage + AuthContext ile aynı anahtar

/** /davet/:kod ile gelindiyse kodu döndürür ve davet yollarını kurar (tanıtım sayfası da kullanır). */
export function useDavetKodu() {
  // /davet/:kod ile gelindiyse kodu sakla: uygulama aynı depoyu paylaşıyorsa (Android, masaüstü)
  // girişten sonra arkadaşlık isteği kendiliğinden gider (AuthContext › davetKoduUygula).
  const [davetKodu] = useState(() => {
    try {
      const m = /^\/davet\/([A-Za-z0-9]{8})\/?$/.exec(window.location.pathname);
      return m ? m[1].toUpperCase() : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    let referans = null;
    try {
      if (davetKodu) window.localStorage.setItem(DAVET_KODU_ANAHTAR, davetKodu);
      referans = window.localStorage.getItem("bildim_davet");   // ?davet=<uuid> (main.jsx saklar)
    } catch { /* özel mod: kod elle girilir */ }
    davetiSunucuyaBirak(davetKodu, referans);
  }, [davetKodu]);
  return davetKodu;
}

// 14 Eki 2026: kapı artık TanitimSayfasi.jsx'i çizer (bu sayfa rotada değil); bileşenler oradan kullanılır.
export default function KurulumSayfasi() {
  const { dil, ceviri, dilDegistir } = useDil();
  const davetKodu = useDavetKodu();

  return (
    <div className="qt-sayfa g-giris g-kurulum">
      <div className="g-giris-ic">
        <header className="g-giris-ust">
          <QtMarka boyut="b" />
          <div className="g-giris-dil" role="group" aria-label={ceviri("Dil")}>
            {DILLER.map((d) => (
              <QtCip key={d} secili={dil === d} onClick={() => dilDegistir(d)}>
                {d.toUpperCase()}
              </QtCip>
            ))}
          </div>
        </header>

        <main className="g-giris-izgara">
          <section className="g-giris-vitrin">
            <span className="g-giris-avatarlar" aria-hidden="true">
              {["/avatars/pro/tilki-k04.svg", "/avatars/pro/kedi-k01.svg", "/avatars/pro/robot-k15.svg"].map((src) => (
                <img key={src} src={src} alt="" width="64" height="64" decoding="async" draggable="false" />
              ))}
            </span>
            <h1 className="g-giris-baslik">
              {ceviri("Bilgini oyuna")} <span className="g-giris-baslik-vurgu">{ceviri("dönüştür.")}</span>
            </h1>
          </section>

          <section className="g-giris-panel" aria-labelledby="g-kurulum-baslik">
            <QtKart dolgu="b" className="g-giris-kart g-kurulum-kart">
              <h2 id="g-kurulum-baslik" className="qt-baslik-2">{ceviri("Quiz Tactics bir uygulama")}</h2>
              <p className="qt-kucuk qt-soluk g-giris-alt">
                {ceviri("Oyun yalnız ana ekrana eklenen uygulamada açılır. Kurulum ücretsiz, birkaç saniye sürer.")}
              </p>
              <KurulumKarti ceviri={ceviri} />
              {davetKodu && <DavetKoduKarti kod={davetKodu} ceviri={ceviri} />}
            </QtKart>

            <section className="g-giris-modlar" aria-labelledby="g-kurulum-modlar-baslik">
              <h2 id="g-kurulum-modlar-baslik" className="g-giris-modlar-baslik">{ceviri("Seni neler bekliyor")}</h2>
              <ul className="g-giris-mod-liste">
                {MODLAR.map((m) => (
                  <li key={m.tur} className={`g-giris-mod g-giris-mod--${m.tur} qt-isin-sahne`}>
                    <span className="g-giris-mod-metin"><b>{ceviri(m.ad)}</b><small>{ceviri(m.vaat)}</small></span>
                    <ModFiguru tur={m.tur} className="g-giris-mod-figur" />
                  </li>
                ))}
              </ul>
            </section>

            <nav className="g-giris-yasal" aria-label={ceviri("Yasal metinler")}>
              <a href="/gizlilik">{ceviri("Gizlilik politikası")}</a>
              <span aria-hidden="true">·</span>
              <a href="/kosullar">{ceviri("Kullanım koşulları")}</a>
              <span aria-hidden="true">·</span>
              <a href="/hesap-sil">{ceviri("Hesap silme")}</a>
            </nav>
          </section>
        </main>
      </div>
    </div>
  );
}
