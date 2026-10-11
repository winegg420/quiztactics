import { useEffect, useLayoutEffect } from "react";

// 11 Eki 2026: sınıf SAYAÇLI — birden çok kanca (soru ekranı + maç sonu geçişi) aynı anda tutabilir; son bırakan kaldırır.
// Eskiden useOyunModu'nun temizliği sınıfı koşulsuz siliyordu (maç bitince üst çubuk/alt menü kutlamadan önce dönüyordu).
let tutan = 0;
function tut() {
  tutan += 1;
  document.body.classList.add("bd-oyun-modu");
}
function birak() {
  tutan = Math.max(0, tutan - 1);
  if (!tutan) document.body.classList.remove("bd-oyun-modu");
}

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
    tut();
    // D-104/D-309: maça önceki sayfanın kaydırma konumuyla girilmesin. React Router gezinmede
    // pencere kaydırmasını sıfırlamıyor; aşağı kaydırılmış bir sayfadan (modlar, profil,
    // meydan) gelince maç/Hazır kapısı ilk sorudan itibaren kaymış açılıyordu. Maç ekranı
    // tek ekran olduğundan en üst doğru konumdur.
    try {
      if (window.scrollY || document.documentElement.scrollTop) window.scrollTo(0, 0);
    } catch {
      /* eski tarayıcı: kaydırma sıfırlanamadıysa ekran yine çalışır */
    }
    return birak;
  }, [aktif]);
}

/**
 * Maç sonu geçişi (Yayın öncesi tarama, 11 Eki 2026): maç bitince oyun modu, kutlama sahnesi
 * (MacSonuKutlama → <html>.msk-acik) açılana dek sürer — "Maç bitti!" ara ekranı, Hazine final sahnesi,
 * özet beklemesi oyunun parçası gibi görünür (üst çubuk + alt menü erken dönmez; Sezon Yolu bildirimi de
 * kutlamanın üstüne binmez, sahne kapanınca gelir — SezonRozeti › sahneAcikMi).
 * Sahne açılınca sınıf bırakılır (üst çubuk coin uçuşunun hedefidir; alt menüyü msk-acik gizler).
 * Emniyet: sahne hiç açılmazsa (özet hatası, terk) 20 sn sonra kabuk geri gelir.
 * Layout etkisi: useOyunModu'nun (pasif) temizliğinden ÖNCE tutar → arada bir kare bile kabuk görünmez.
 */
export function useMacSonuGecisi(bitti) {
  useLayoutEffect(() => {
    if (typeof document === "undefined" || !bitti) return undefined;
    const html = document.documentElement;
    if (html.classList.contains("msk-acik")) return undefined;
    tut();
    let birakildi = false;
    let gozcu = null;
    let emniyet = null;
    const son = () => {
      if (birakildi) return;
      birakildi = true;
      gozcu?.disconnect();
      clearTimeout(emniyet);
      birak();
    };
    try {
      gozcu = new MutationObserver(() => { if (html.classList.contains("msk-acik")) son(); });
      gozcu.observe(html, { attributes: true, attributeFilter: ["class"] });
    } catch { /* MutationObserver yok: emniyet süresi bırakır */ }
    emniyet = setTimeout(son, 20000);
    return son;
  }, [bitti]);
}
