import { useEffect } from "react";

/**
 * Soru ekranı açıkken gövdeye `bd-oyun-modu` sınıfı ekler.
 * CSS bu sınıfla alt sekme çubuğunu gizler ve joker çubuğunu ekranın altına
 * sabitler — oyuncunun dikkati soruda kalsın diye.
 *
 * Kullanım: useOyunModu(soru != null)
 */
export function useOyunModu(aktif) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!aktif) return;
    document.body.classList.add("bd-oyun-modu");
    // D-104/D-309: maça önceki sayfanın kaydırma konumuyla girilmesin. React Router gezinmede
    // pencere kaydırmasını sıfırlamıyor; aşağı kaydırılmış bir sayfadan (modlar, profil,
    // meydan) gelince maç/Hazır kapısı ilk sorudan itibaren kaymış açılıyordu. Maç ekranı
    // tek ekran olduğundan en üst doğru konumdur.
    try {
      if (window.scrollY || document.documentElement.scrollTop) window.scrollTo(0, 0);
    } catch {
      /* eski tarayıcı: kaydırma sıfırlanamadıysa ekran yine çalışır */
    }
    return () => document.body.classList.remove("bd-oyun-modu");
  }, [aktif]);
}
