// ============================================================
// YENİLEME SİGORTASI — otomatik sayfa yenilemelerinin ortak kapısı (14 Eki 2026).
//
// Neden: dil eşitlemesindeki bir hata (profil dili ≠ tarayıcı dili) sayfayı sonsuz yeniletti; her
// yenileme ~15 RPC demek, nano veritabanı 5 dakikada ~1.000 istekle düştü. Kodun kendi kendine
// yaptığı her `location.reload()` buradan geçer: son YENILEME_PENCERE_MS içinde EN_COK_YENILEME
// otomatik yenileme olduysa yenileme YAPILMAZ (sessionStorage sayacı; sekme başına).
// Depolama okunamazsa (gizli mod) da yenilenmez: döngü riski alınmaz.
// Kullanıcının elle bastığı "Yenile" düğmeleri bu sigortadan geçmez (bilinçli tek yenileme).
// ============================================================

const ANAHTAR = "qt_oto_yenileme";
export const YENILEME_PENCERE_MS = 30000;
export const EN_COK_YENILEME = 2;

/** Son pencere içindeki otomatik yenileme anları. */
function anlar(simdi) {
  try {
    const liste = JSON.parse(sessionStorage.getItem(ANAHTAR) || "[]");
    return Array.isArray(liste) ? liste.filter((a) => Number.isFinite(a) && simdi - a >= 0 && simdi - a < YENILEME_PENCERE_MS) : [];
  } catch {
    return null;
  }
}

/**
 * Otomatik yenileme ister. true = yenileme başlatıldı; false = sigorta attı ya da depolama yok.
 * @param {string} kaynak günlük için kısa ad ("dil", "parca" …)
 */
export function otomatikYenile(kaynak) {
  try {
    const simdi = Date.now();
    const liste = anlar(simdi);
    if (!liste) return false;
    if (liste.length >= EN_COK_YENILEME) {
      console.warn(`[Bildim] otomatik yenileme durduruldu (${kaynak}): ${YENILEME_PENCERE_MS / 1000} sn içinde ${liste.length} yenileme oldu`);
      return false;
    }
    liste.push(simdi);
    sessionStorage.setItem(ANAHTAR, JSON.stringify(liste));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}
