// AÇILIŞ — önce dil, sonra uygulama.
//
// İngilizce sözlük (oyun/lib/dil-en.js, ~93 kB gzip) ayrı tembel parçadır: Türkçe oyuncuda hiç inmez.
// `tt()` modül yüklenirken de çağrıldığı için (sekme adları, katalog metinleri) sözlük, uygulamanın
// modülleri ÇALIŞMADAN önce bellekte olmalı; bu yüzden uygulama (main.jsx) buradan dinamik yüklenir.
// Üst düzey `await` kullanılamaz: derleme hedefi safari12 (vite.config.js).
import { aktifDil, sozlukYukle, turkceyeDus } from "../oyun/lib/dil.js";
import { dilUyarisiGoster } from "../oyun/lib/dilUyari.js";

const BEKLEME_KIMLIK = "qt-acilis-bekleme";
const ORTA = "display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;min-height:100dvh;margin:0;padding:24px;text-align:center;font:600 16px/1.4 system-ui,sans-serif;color:#1b2a4a";

function beklemeGoster(kok) {
  if (!kok || kok.firstChild) return;
  const p = document.createElement("p");
  p.id = BEKLEME_KIMLIK;
  p.setAttribute("role", "status");
  p.style.cssText = ORTA;
  p.textContent = "Loading…";
  kok.appendChild(p);
}

function acilisHatasiGoster(kok) {
  if (!kok) return;
  const tr = aktifDil() === "tr";
  kok.textContent = "";
  const kutu = document.createElement("div");
  kutu.setAttribute("role", "alert");
  kutu.style.cssText = ORTA;
  const yazi = document.createElement("p");
  yazi.style.margin = "0";
  yazi.textContent = tr ? "Oyun yüklenemedi. Bağlantını kontrol edip yeniden dene." : "The game couldn't load. Check your connection and try again.";
  const dugme = document.createElement("button");
  dugme.type = "button";
  dugme.textContent = tr ? "Yeniden dene" : "Try again";
  dugme.style.cssText = "min-height:44px;padding:0 20px;border:0;border-radius:12px;background:#2a73cc;color:#fff;font:inherit;cursor:pointer";
  dugme.addEventListener("click", () => window.location.reload());
  kutu.appendChild(yazi);
  kutu.appendChild(dugme);
  kok.appendChild(kutu);
}

async function baslat() {
  const kok = document.getElementById("root");
  let sozlukInemedi = false;
  const dil = aktifDil();
  if (dil !== "tr") {
    beklemeGoster(kok);
    try {
      await sozlukYukle(dil);
    } catch (e) {
      console.error("[Dil] sözlük yüklenemedi, Türkçe sürüyor:", e?.message ?? e);
      turkceyeDus();
      sozlukInemedi = true;
    }
    document.getElementById(BEKLEME_KIMLIK)?.remove();
  }
  try {
    await import("./main.jsx");
  } catch (e) {
    console.error("[Bildim] uygulama yüklenemedi:", e?.message ?? e);
    acilisHatasiGoster(kok);
    return;
  }
  if (sozlukInemedi) dilUyarisiGoster();
}

baslat();
