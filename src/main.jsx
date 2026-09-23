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
import { hataIzlemeKur } from "./lib/hataIzleme.js";
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
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("[Bildim] /sw.js başarısız:", e?.message ?? e));
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="yukleniyor">Yükleniyor…</div>}>
          <KokUygulama />
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
