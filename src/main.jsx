import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
// KÖK UYGULAMA — tek site, tek giriş.
//
// Eskiden bu depo iki siteyi besliyordu (hub + Quiz Tactics) ve seçimi
// VITE_MOD yapıyordu. Quiz Tactics kendi deposuna taşındı; hub yönlendirmesi
// ve VITE_MOD kalktı. lazy de gereksiz — seçilecek ikinci bir taraf yok.
import KokUygulama from "./BildimApp.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import HataSiniri from "./components/HataSiniri.jsx";
import { DilKoku } from "../oyun/lib/dilKanca.js";
import YukleniyorEkrani from "../oyun/components/YukleniyorEkrani.jsx";
import { hataIzlemeKur } from "./lib/hataIzleme.js";
import { izlemeKur } from "./lib/izlemeKaydi.js";
import { parcaYenilemeKur } from "./lib/tembelYukle.js";
import "./styles.css";
// Bildim görsel dili (tema tokenları) — global stillerden SONRA yüklenir
import "../oyun/styles/tema.css";
// Koyu tema tema.css'ten SONRA: kaskadda sonra gelip acik temayi ezer.
import "../oyun/styles/koyu.css";
// Arayuz Yenileme (20 Eyl 2026): prototip temasi EN SONDA - palet ve iskelet
// kurallari eskisini ezer. Eski token/sinif adlari silinmedi, yeni palete baglandi.
import "../oyun/styles/yeni.css";
// Mobil oyun katmanı: yalnız dar ekranlarda çalışır, masaüstü düzenini değiştirmez.
import "../oyun/styles/mobile-game.css";
// Tasarım sistemi (Tasarım Adım 2): yalnız --qt-* değişkenleri ve qt- sınıfları; mevcut görünümü değiştirmez.
import "../oyun/tasarim/tasarim.css";
import { temaBaslat } from "../oyun/lib/tema.js";
import { cubukBaslat } from "../oyun/lib/kaydirmaCubugu.js";

// Tema ilk boyadan ONCE uygulanir: koyu tema secen oyuncu bir kare beyaz
// ekran gormesin.
temaBaslat();

// Kaydirma cubugu genisligi --bd-cubuk olarak yazilir; 50vw ile tam genislige
// tasan bloklar cubuk kadar fazla tasmasin (yatay kaydirma).
cubukBaslat();

// Hata izleme: YALNIZ VITE_SENTRY_DSN tanımlıysa kurulur. Boşsa Sentry paketi
// hiç yüklenmez ve konsola uyarı basılmaz — DSN'siz çalışmak normal durumdur.
hataIzlemeKur();
// İzleme kaydı (1097): yakalanmamış hatalar + kurulum olayı → istemci_kayit_yaz (toplu, oturumlu).
izlemeKur();

// D-103/D-201: yeni sürümden sonra eski sayfa parçası inemezse sayfa BİR KEZ sessizce yenilenir
// (oturum başına bayrak; çevrimdışıyken yenilenmez — hata sayfa içi karta gider).
parcaYenilemeKur();

// Davet linkiyle gelindiyse sakla (girişten sonra ödül talep edilir)
const params = new URLSearchParams(window.location.search);
const davet = params.get("davet");
if (davet) {
  localStorage.setItem("bildim_davet", davet);
  params.delete("davet");
  const yeniUrl =
    window.location.pathname + (params.size ? `?${params}` : "") + window.location.hash;
  window.history.replaceState({}, "", yeniUrl);
}

// PWA service worker
// 15 Eki 2026 HATA: 2 Eki'den beri main.jsx baslat.js'ten DİNAMİK yükleniyor; "load" çoğu zaman bu dosya çalışmadan
// bitiyordu → yeni cihazda SW HİÇ kaydolmuyordu (çevrimdışı kabuk, push, Android kurulum önerisi). Sayfa zaten
// yüklendiyse hemen kaydedilir.
if ("serviceWorker" in navigator) {
  const swKaydet = () => {
    navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("[Bildim] /sw.js başarısız:", e?.message ?? e));
  };
  if (document.readyState === "complete") swKaydet();
  else window.addEventListener("load", swKaydet, { once: true });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* Son savunma: kabuğun dışında bir hata olursa beyaz ekran yerine kart */}
        <HataSiniri>
          {/* Dil yenilemesiz değişince (açılışta profil dili) ağaç yeniden kurulur — oyun/lib/dilKanca.js */}
          <DilKoku>
            <Suspense fallback={<YukleniyorEkrani />}>
              <KokUygulama />
            </Suspense>
          </DilKoku>
        </HataSiniri>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
