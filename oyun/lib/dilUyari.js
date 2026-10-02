// DİL UYARISI — İngilizce sözlük inemediğinde (ağ hatası) gösterilen kısa şerit.
// React'tan bağımsız düz DOM: uygulama daha kurulmamışken (src/baslat.js) de çalışır.
// Sözlük yokken yazıldığı için metin iki dilde sabittir. iOS: fixed + transform birlikte kullanılmaz.
const KIMLIK = "qt-dil-uyari";

export function dilUyarisiGoster() {
  try {
    if (typeof document === "undefined" || document.getElementById(KIMLIK)) return;
    const kutu = document.createElement("div");
    kutu.id = KIMLIK;
    kutu.setAttribute("role", "status");
    kutu.textContent = "English couldn't be loaded — check your connection. · İngilizce yüklenemedi, Türkçe gösteriliyor.";
    kutu.style.cssText =
      "position:fixed;left:12px;right:12px;top:calc(12px + env(safe-area-inset-top, 0px));z-index:2147483000;" +
      "margin:0 auto;max-width:520px;padding:12px 16px;border-radius:12px;" +
      "background:var(--qt-yanlis-dudak, #b3261e);color:#fff;font:600 14px/1.35 system-ui,sans-serif;" +
      "text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25)";
    document.body.appendChild(kutu);
    setTimeout(() => kutu.remove(), 6000);
  } catch {
    /* DOM yok: uyarı gösterilemez, uygulama Türkçe sürer */
  }
}
