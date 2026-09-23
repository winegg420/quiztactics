/**
 * Aynı ekranda en çok 3 animasyonlu çerçeve oynar. Hareket isteyen her çerçeve sıraya girer;
 * ilk 3'ü oynar, gerisi durağan çizilir. Çerçeve kalkınca sıradaki devralır.
 * (Listelerde çerçeve zaten `hareketli` istemez.)
 */
import { useEffect, useState, useSyncExternalStore } from "react";

export const EN_COK_HAREKETLI = 3;

let sira = [];            // hak isteyen kimlikler, geliş sırasıyla
const dinleyiciler = new Set();
let sayac = 0;

function yay() { for (const f of dinleyiciler) f(); }
function abone(f) { dinleyiciler.add(f); return () => dinleyiciler.delete(f); }
function anlik() { return sira; }

/** @param {boolean} istek hareket isteniyor mu  @returns {boolean} oynayabilir mi */
export function useHareketHakki(istek) {
  const [kimlik] = useState(() => ++sayac);
  useEffect(() => {
    if (!istek) return undefined;
    sira = [...sira, kimlik];
    yay();
    return () => { sira = sira.filter((x) => x !== kimlik); yay(); };
  }, [istek, kimlik]);
  const liste = useSyncExternalStore(abone, anlik, anlik);
  if (!istek) return false;
  const i = liste.indexOf(kimlik);
  return i > -1 && i < EN_COK_HAREKETLI;
}
