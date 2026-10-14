// ============================================================
// UYGULAMA KİPİ — oyun yalnız kurulu uygulamada (ana ekran / Dock / masaüstü PWA) oynanır.
//
// Tarayıcı sekmesinde oyun sayfaları yerine kurulum sayfası açılır (src/BildimApp.jsx › kapı).
// Bu bir GÜVENLİK kapısı değil, deneyim kapısıdır: sunucu tarayıcıyla uygulamayı ayırt etmez.
//
// "Uygulama içinde mi" ölçümü TEK yerde durur; AnaEkranaEkle, push ve BildirimIzniSor da
// buradan okur.
//   · iOS ana ekran uygulaması      → navigator.standalone === true
//   · Android/masaüstü kurulu PWA   → display-mode: standalone | fullscreen | minimal-ui
//                                     | window-controls-overlay
//   · Play Store TWA (ileride)      → ilk açılışta document.referrer "android-app://<paket>"
//                                     gelir; sonraki gezinmelerde kaybolduğu için oturum boyunca
//                                     sessionStorage'da hatırlanır. TWA da display-mode
//                                     standalone verir; referrer yalnız ek güvencedir.
//
// Geliştirici geçişi (kapı açılır, kurulum istenmez):
//   · localhost / 127.0.0.1 / ::1   → yerel geliştirme ve araclar/arayuz-denetim.mjs
//   · adreste ?dev=1                → canlıda test (araclar/oyuncu-testi.mjs). Oturum boyunca
//                                     (sekme kapanana kadar) hatırlanır, adresten silinir.
//                                     Hiçbir arayüz metninde geçmez.
// ============================================================

const DEV_ANAHTAR = "qt_dev_gecis";
const TWA_ANAHTAR = "qt_twa";

function oturumOku(anahtar) {
  try { return window.sessionStorage.getItem(anahtar); } catch { return null; }
}
function oturumYaz(anahtar, deger) {
  try { window.sessionStorage.setItem(anahtar, deger); } catch { /* özel mod: yalnız bu sayfada geçerli */ }
}

// Sayfa ilk yüklendiğinde bir kez: ?dev=1 ve TWA referrer'ı yakala.
let devBuSayfada = false;
(function ilkOlcum() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("dev") === "1") {
      devBuSayfada = true;
      oturumYaz(DEV_ANAHTAR, "1");
      params.delete("dev");
      const yeniUrl = window.location.pathname + (params.size ? `?${params}` : "") + window.location.hash;
      window.history.replaceState(window.history.state, "", yeniUrl);
    }
    if (typeof document !== "undefined" && String(document.referrer || "").startsWith("android-app://")) {
      oturumYaz(TWA_ANAHTAR, "1");
    }
  } catch { /* adres okunamazsa geçiş yok — kapı normal çalışır */ }
})();

/** Kurulu uygulama içinden mi açıldı? (iOS ana ekran, Android/masaüstü PWA, Play Store TWA) */
export function uygulamaIcindeMi() {
  try {
    if (navigator.standalone === true) return true;
    const mq = (s) => window.matchMedia?.(`(display-mode: ${s})`)?.matches === true;
    if (mq("standalone") || mq("fullscreen") || mq("minimal-ui") || mq("window-controls-overlay")) return true;
    if (String(document.referrer || "").startsWith("android-app://")) return true;
    return oturumOku(TWA_ANAHTAR) === "1";
  } catch {
    return false;
  }
}

/** Yerel geliştirme ya da ?dev=1 ile açılmış oturum. */
export function gelistiriciGecisi() {
  try {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1") return true;
    return devBuSayfada || oturumOku(DEV_ANAHTAR) === "1";
  } catch {
    return false;
  }
}

// Tarayıcıda da açık kalan sayfalar: yasal metinler (Play Store + reklam ağları giriş duvarı
// önünde ister) ve yalnız sahibin açtığı geliştirici/tasarım sayfaları (SahipKapisi korur).
const SERBEST_ONEK = [
  "/gizlilik", "/kosullar", "/hesap-sil",
  "/preview/", "/insan-prototip", "/tasarim-yonleri", "/tasarim-sistemi", "/kozmetik-onizleme",
  "/mac-sonu-onizleme", "/ekran-revizyon-onizleme", "/ses-secim", "/sure-ayar", "/avatar-onizleme",
  "/avatar-nadirlik", "/cerceve-onizleme", "/arka-plan-onizleme", "/premium-onizleme", "/ikon-onizleme",
  "/tasarim-onizleme", "/gorsel-revizyon", "/stil-rehberi", "/lig-sahne-onizleme", "/duello-onizleme",
  "/yonetim/posta",
];

/** Bu yol tarayıcı sekmesinde de açılabilir mi? */
export function tarayicidaSerbest(yol) {
  if (typeof yol !== "string") return false;
  return SERBEST_ONEK.some((o) => yol === o.replace(/\/$/, "") || yol.startsWith(o.endsWith("/") ? o : o + "/"));
}

/** Kapı: oyun bu yolda açılabilir mi? false → kurulum sayfası. */
export function oyunAcilabilir(yol) {
  return uygulamaIcindeMi() || gelistiriciGecisi() || tarayicidaSerbest(yol);
}

// ---------- cihaz / tarayıcı tanıma (kurulum sayfası yönlendirmeleri) ----------

function ua() {
  try { return navigator.userAgent || ""; } catch { return ""; }
}

/** iPhone/iPad? iPadOS 13+ kendini "MacIntel" diye tanıtır; dokunmatik nokta sayısı ayırır. */
export function iosMu() {
  try {
    if (/iphone|ipad|ipod/i.test(ua())) return true;
    return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  } catch {
    return false;
  }
}

export function androidMu() {
  return /android/i.test(ua());
}

/** Instagram / Facebook / WhatsApp / X / LinkedIn / TikTok vb. uygulama içi tarayıcı. */
export function uygulamaIciTarayici() {
  return /fban|fbav|fb_iab|fbios|instagram|whatsapp|line\/|twitter|linkedinapp|micromessenger|tiktok|bytedancewebview|snapchat|pinterest|; wv\)/i.test(ua());
}

/** iOS'ta gerçek Safari mi? (Chrome/Firefox/Edge/Opera ve uygulama içi tarayıcılar hariç) */
export function iosSafariMi() {
  const u = ua();
  if (!iosMu()) return false;
  if (/crios|fxios|edgios|opios|yabrowser|duckduckgo|gsa\//i.test(u)) return false;
  if (uygulamaIciTarayici()) return false;
  return /safari/i.test(u);
}

/** macOS Safari (17+ "Dock'a Ekle" destekler). iPad hariç. */
export function macSafariMi() {
  const u = ua();
  if (iosMu() || !/macintosh/i.test(u)) return false;
  if (/chrome|chromium|crios|edg\/|firefox|fxios|opr\//i.test(u)) return false;
  return /safari/i.test(u);
}

/** Masaüstü (dokunmatik telefon/tablet değil). */
export function masaustuMu() {
  if (iosMu() || androidMu()) return false;
  return !/mobile/i.test(ua());
}

// ---------- kurulum önerisi (beforeinstallprompt: Android Chrome, masaüstü Chrome/Edge) ----------
// Olay sayfa açılır açılmaz gelebilir (kurulum sayfası tembel yüklenmeden önce); bu yüzden modül
// yüklenince dinlenir ve saklanır. preventDefault Chrome'un kendi mini bandını bastırır — düğmeyi
// kurulum sayfası gösterir. iOS/Safari/Firefox bu olayı hiç göndermez.
let kurulumOlayi = (typeof window !== "undefined" && window.__qtKurulumOlayi) || null;   // baslat.js erken yakaladıysa
let kurulumBitti = false;
const kurulumDinleyiciler = new Set();
const kurulumBildir = () => kurulumDinleyiciler.forEach((f) => { try { f(); } catch { /* dinleyici hatası kapıyı bozmasın */ } });

if (typeof window !== "undefined") {
  try {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      kurulumOlayi = e;
      kurulumBildir();
    });
    window.addEventListener("appinstalled", () => {
      kurulumOlayi = null;
      kurulumBitti = true;
      kurulumBildir();
    });
  } catch { /* olay desteklenmiyor: menüden kurulum anlatılır */ }
}

/** { hazir: kur düğmesi gösterilebilir mi, kuruldu: bu sekmede kurulum tamamlandı mı } */
export function kurulumDurumu() {
  return { hazir: Boolean(kurulumOlayi), kuruldu: kurulumBitti };
}

/** Durum değişince çağrılır; dönen işlev aboneliği kaldırır. */
export function kurulumDinle(fn) {
  kurulumDinleyiciler.add(fn);
  return () => kurulumDinleyiciler.delete(fn);
}

/** Tarayıcının kurulum penceresini açar. Dönüş: "accepted" | "dismissed" | "yok". */
export async function kurulumuBaslat() {
  const olay = kurulumOlayi;
  if (!olay) return "yok";
  kurulumOlayi = null;   // olay tek kullanımlık
  try { window.__qtKurulumOlayi = null; } catch { /* yok */ }
  try {
    await olay.prompt();
    const { outcome } = await olay.userChoice;
    if (outcome === "accepted") kurulumBitti = true;
    return outcome;
  } catch (e) {
    console.warn("[Kurulum] kurulum penceresi açılamadı:", e?.message ?? e);
    return "yok";
  } finally {
    kurulumBildir();
  }
}

/** Masaüstü Chromium (Chrome/Edge/Opera/Brave) — kurulum destekler. */
export function masaustuChromiumMu() {
  return masaustuMu() && /chrome|chromium|edg\//i.test(ua()) && !/firefox/i.test(ua());
}
