// Son oynanan mod (6 Eki 2026): ana sayfadaki üç mod şeridinin altındaki "En son oynadığın" ipucu.
// 11 Eki 2026: kayıt yalnız ana sayfa kısayolunda değil, maç ekranı açılınca da yazılır (Modlar / davet / rövanş
// yoluyla girilen maç da sayılır). Maç sayfaları bu küçük modülü yükler — ana sayfa verisi (anasayfa/veri.jsx) değil.
const SON_MOD_ANAHTAR = "qt:v1:ana-son-mod";
const SON_MOD_GECERLI = ["klasik", "duello", "kasa"];
export function sonModuYaz(mod) {
  try { if (SON_MOD_GECERLI.includes(mod)) localStorage.setItem(SON_MOD_ANAHTAR, mod); } catch { /* depolama kapalı: ipucu yalnız çizilmez */ }
}
export function sonModuOku() {
  try {
    const m = localStorage.getItem(SON_MOD_ANAHTAR);
    return SON_MOD_GECERLI.includes(m) ? m : null;   // bozuk/eski değer: yok say
  } catch { return null; }
}
