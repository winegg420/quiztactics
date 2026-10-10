import { useRef } from "react";

/**
 * Cevap verilince sayaç o anki değerinde DURUR (10 Eki 2026, Ida: Düello'da cevaptan sonra süre akmaya devam edip
 * "Süren doldu" yazıyordu). Soru anahtarı değişince ya da `donsun` false olunca (ör. cevap gitmedi, geri alındı)
 * yeniden gerçek kalanı gösterir. Yalnız gösterim: süre mantığı (kilit, sunucu payı) gerçek kalanda kalır.
 *
 * @param {number} kalan   gösterilecek kalan saniye (akan)
 * @param {boolean} donsun cevap verildi mi
 * @param {string} anahtar soru kimliği (soru değişince donuk değer sıfırlanır)
 */
export function useDonukSayac(kalan, donsun, anahtar) {
  const ref = useRef({ anahtar: null, kalan: 0 });
  if (!donsun) {
    ref.current = { anahtar: null, kalan: 0 };
    return kalan;
  }
  if (ref.current.anahtar !== anahtar) ref.current = { anahtar, kalan };
  return ref.current.kalan;
}
