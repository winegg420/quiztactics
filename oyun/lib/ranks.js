import { tt } from "./dil.js";
// Rütbe renkleri rozet/dolgu için seçilmiş açık tonlar; YAZI olarak açık
// zeminde okunmuyorlardı (ölçüm: Üstat #4A9DD9 → 2.95, Bilge #2FBF71 → 2.38).
// Rütbe kimliği korunsun diye renk aynı kalır; metin için rengin metin
// rengiyle yarı yarıya karışımı kullanılır. Açık temada koyulaşır (≥ 4.6),
// koyu temada açılır (≥ 8.0) — tek tanım iki temada da doğru.
// Paket 42 T: %50 karışım rütbe etiketinin tint zemininde Efsane için 3,59:1 kalıyordu → %35 (≥ 4,5).
const metinRengi = (renk) => `color-mix(in srgb, ${renk} 35%, var(--bd-metin))`;

// SQL tarafındaki public.rutbe() ile aynı eşikler
export const RUTBELER = [
  // Arayüz Yenileme (20 Eyl 2026): renkler artık token üzerinden gelir
  // (oyun/styles/yeni.css › RÜTBE VE USTALIK RENKLERİ). Değerler aynı.
  { ad: tt("Çaylak"), min: 0, renk: "var(--rutbe-caylak)", ikon: "kisi" },
  { ad: tt("Bilge"), min: 100, renk: "var(--rutbe-bilge)", ikon: "kalkan" },
  { ad: tt("Üstat"), min: 500, renk: "var(--rutbe-ustat)", ikon: "kilic" },
  { ad: tt("Kahin"), min: 1500, renk: "var(--rutbe-kahin)", ikon: "yildiz" },
  { ad: tt("Efsane"), min: 5000, renk: "var(--rutbe-efsane)", ikon: "kupa" },
].map((r) => ({ ...r, metinRenk: metinRengi(r.renk) }));

export function rutbeBul(puan) {
  let r = RUTBELER[0];
  for (const rt of RUTBELER) {
    if (puan >= rt.min) r = rt;
  }
  return r;
}

export function sonrakiRutbe(puan) {
  return RUTBELER.find((r) => r.min > puan) ?? null;
}
