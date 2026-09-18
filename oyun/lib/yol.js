// ============================================================
// YOL KÖKÜ
//
// Quiz Tactics artık KENDİ DEPOSUNDA ve kendi sitesinde yayınlanıyor;
// bütün rotalar KÖKTE (`/turnuva`, `/profil`, `/duello/…`).
//
// Eskiden bu oyun aynı depodan iki siteye çıkıyordu (hub'da `/bildim/*`,
// kendi sitesinde kökte) ve fark `VITE_MOD` ile yapılıyordu. Hub ayrıldı,
// `VITE_MOD` kalktı — geriye tek kök kaldı.
//
// `y()` KASITLI OLARAK DURUYOR. Bugün kimlik işlevi görüyor ama 200'den
// fazla çağrı yeri var; onları tek tek elle yola çevirmek koca bir fark
// üretir ve hiçbir şey kazandırmaz. Ayrıca oyun ileride bir alt yola
// taşınırsa (ör. bir portal içine) tek satır burada değişir.
//
// Kullanım:
//   y()             → "/"
//   y("/meydan")    → "/meydan"
//   y(`/mac/${id}`) → "/mac/123"
// ============================================================

// Rotaların önüne eklenecek önek. Kökte yayın = boş.
export const KOK = "";

export function y(alt = "") {
  if (!alt) return KOK || "/";
  const parca = alt.startsWith("/") ? alt : "/" + alt;
  return KOK + parca;
}
