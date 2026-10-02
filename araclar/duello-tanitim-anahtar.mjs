// Düello tanıtım localStorage anahtarının TEK KAYNAĞI: oyun/components/DuelloTanitim.jsx › DEPO.
// Ürün sürümü değişince testler bozulmasın diye anahtar elle yazılmaz, dosyadan okunur.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DOSYA = fileURLToPath(new URL("../oyun/components/DuelloTanitim.jsx", import.meta.url));

export function duelloTanitimAnahtari() {
  try {
    const m = /const\s+DEPO\s*=\s*["'`]([^"'`]+)["'`]/.exec(readFileSync(DOSYA, "utf8"));
    if (m) return m[1];
  } catch (e) { console.warn("[duello-tanitim-anahtar] okunamadı:", e?.message ?? e); }
  throw new Error("DuelloTanitim.jsx içinde DEPO sabiti bulunamadı");
}
