// 404 sayfası açık mı? (10 Eki 2026 denetimi) — Layout'taki zorunlu kurulum (Tanıtım + "Takma ad seç")
// 404 sayfasının üstüne çıkmasın diye. BulunamadiPage takılınca işaretler, ayrılınca kaldırır.
import { useSyncExternalStore } from "react";

let acikSayisi = 0;
const dinleyiciler = new Set();
const yay = () => { for (const f of dinleyiciler) f(); };

/** 404 sayfası takıldı. Dönüş: kaldırma fonksiyonu (useEffect temizliği). */
export function bulunamadiIsaretle() {
  acikSayisi += 1;
  yay();
  return () => { acikSayisi = Math.max(0, acikSayisi - 1); yay(); };
}

/** Ekranda 404 sayfası varsa true. */
export function useBulunamadiAcik() {
  return useSyncExternalStore(
    (f) => { dinleyiciler.add(f); return () => dinleyiciler.delete(f); },
    () => acikSayisi > 0,
    () => false,
  );
}
