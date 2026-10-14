// canvas-confetti tembel yükleyici — MacSonuLottie.jsx'ten ayrıldı (Paket B/6, 15 Eki 2026): ana sayfadaki
// OdulPatlamasi yalnız bunu istiyordu ve maç sonu Lottie bileşenini ilk açılış paketine çekiyordu.
let konfetiSozu = null;
export function konfetiYukle() {
  if (!konfetiSozu) {
    konfetiSozu = import("canvas-confetti").then((m) => m.default ?? m).catch((e) => { konfetiSozu = null; throw e; });
  }
  return konfetiSozu;
}
