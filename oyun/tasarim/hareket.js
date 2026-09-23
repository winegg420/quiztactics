// Quiz Tactics tasarım sistemi — HAREKET YARDIMCILARI.
// CSS tarafı: oyun/tasarim/hareket.css (qt-h-* sınıfları). Buradaki süreler
// CSS'teki animasyonlarla eşleşir; zamanlayıcı kuran ekranlar bunları kullanır.

/** 50:50 kırılma animasyonunun toplam süresi (ms). Bu süre sonunda şıkkı "elendi"ye çevir. */
export const QT_KIRILMA_MS = 760;
/** Doğru/yanlış anı animasyonu (ms). */
export const QT_AN_MS = 420;
/** Soru kartı çıkışı (Soru Değiştir) — yeni soruyu bu süreden sonra koy. */
export const QT_KART_CIKIS_MS = 200;

/** Kullanıcı azaltılmış hareket istiyor mu? (JS ile hareket eden yerler için) */
export function hareketAzaltildiMi() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Aynı CSS animasyonunu yeniden oynatır (sınıfı kaldır → yeniden hesaplat → ekle).
 * React'te çoğu zaman `key` değiştirmek yeterlidir; bu, DOM'a doğrudan erişilen yerler içindir.
 */
export function animasyonuYenidenOynat(el, sinifAdi) {
  if (!el) return;
  el.classList.remove(sinifAdi);
  void el.offsetWidth; // yeniden yerleşimi zorla
  el.classList.add(sinifAdi);
}

const TITRESIM = {
  dokunus: [8],
  dogru: [14, 50, 22],
  yanlis: [45],
  sayac: [12],
  skill: [10, 30, 10],
  kirilma: [18, 40, 18],
};

/**
 * Haptik geri bildirim (Android / TWA). iOS Safari desteklemez; sessizce geçer.
 * tur: dokunus · dogru · yanlis · sayac (son 5 sn, saniyede bir) · skill · kirilma
 * Oyuncunun ses/titreşim ayarı kapalıysa çağırmayın.
 */
export function titresim(tur = "dokunus") {
  try {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
    return navigator.vibrate(TITRESIM[tur] ?? TITRESIM.dokunus);
  } catch {
    return false;
  }
}
