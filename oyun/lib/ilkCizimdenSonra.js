// İLK ÇİZİMDEN SONRA, BOŞTA (Paket A/2, 14 Eki 2026).
// Ekranda hemen görünmeyen veri (rozet sayıları, yanlış bankası, gönderilen davetler, ses seçimleri) ilk çizimle
// bant genişliği ve ana iş parçacığı için yarışmasın: iki animasyon karesi (çizim bitti) + requestIdleCallback
// (en çok 2 sn bekler; yoksa 300 ms). Gizli sekmede rAF durur → sekme görünür olunca çalışır.
export function ilkCizimdenSonra(is) {
  let iptal = false;
  let bostaKimlik = null;
  let zaman = null;
  const calis = () => { if (!iptal) is(); };
  const bosta = () => {
    if (iptal) return;
    if (typeof window.requestIdleCallback === "function") bostaKimlik = window.requestIdleCallback(calis, { timeout: 2000 });
    else zaman = setTimeout(calis, 300);
  };
  const kare = typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => requestAnimationFrame(bosta)) : null;
  if (kare === null) zaman = setTimeout(bosta, 0);
  return () => {
    iptal = true;
    if (kare !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(kare);
    if (bostaKimlik !== null && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(bostaKimlik);
    clearTimeout(zaman);
  };
}

/** Söz biçimi: `await ilkCizimdenSonraBekle()` */
export const ilkCizimdenSonraBekle = () => new Promise((coz) => { ilkCizimdenSonra(coz); });
