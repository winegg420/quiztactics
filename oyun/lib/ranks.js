import { tt } from "./dil.js";
// Rütbe renkleri rozet/dolgu için seçilmiş açık tonlar; YAZI olarak açık
// zeminde okunmuyorlardı (ölçüm: Üstat #4A9DD9 → 2.95, Bilge #2FBF71 → 2.38).
// Rütbe kimliği korunsun diye renk aynı kalır; metin için rengin metin
// rengiyle yarı yarıya karışımı kullanılır. Açık temada koyulaşır (≥ 4.6),
// koyu temada açılır (≥ 8.0) — tek tanım iki temada da doğru.
// Paket 42 T: %50 karışım rütbe etiketinin tint zemininde Efsane için 3,59:1 kalıyordu → %35 (≥ 4,5).
const metinRengi = (renk) => `color-mix(in srgb, ${renk} 35%, var(--bd-metin))`;

// P2A (23 Eyl 2026): RÜTBE ARTIK LEVEL'E BAĞLI — lig puanına değil.
// Eşikler SQL'deki public.level_rutbe_sira() ile aynı: Çaylak L1 · Bilge L10 ·
// Üstat L25 · Kahin L50 · Dâhi L100. "Efsane" rütbesinin adı "Dâhi" oldu (Efsane
// Lig ile çakışmasın). `id` dilden bağımsız anahtardır (rozet biçimi, kutlama kaydı).
// Lig (Bronz → Efsane) ayrı sistemdir, burada yok.
export const RUTBELER = [
  // Arayüz Yenileme (20 Eyl 2026): renkler token üzerinden gelir
  // (oyun/styles/yeni.css › RÜTBE VE USTALIK RENKLERİ). Dâhi eski Efsane rengini kullanır.
  { id: "caylak", ad: tt("Çaylak"), min: 1, renk: "var(--rutbe-caylak, #8496B2)", ikon: "kisi" },
  { id: "bilge", ad: tt("Bilge"), min: 10, renk: "var(--rutbe-bilge, #2FBF71)", ikon: "kalkan" },
  { id: "ustat", ad: tt("Üstat"), min: 25, renk: "var(--rutbe-ustat, #4A9DD9)", ikon: "kilic" },
  { id: "kahin", ad: tt("Kahin"), min: 50, renk: "var(--rutbe-kahin, #3FA9A0)", ikon: "yildiz" },
  { id: "dahi", ad: tt("Dâhi"), min: 100, renk: "var(--rutbe-efsane, #F2B23C)", ikon: "kupa" },
].map((r) => ({ ...r, metinRenk: metinRengi(r.renk) }));

// KULLANIM DIŞI (P2A): eski lig-puanı rütbe eşikleri — SQL'de public.rutbe(int) hâlâ durur.
// Geçmiş kayıtları yorumlamak için bırakıldı; hiçbir ekran bunları okumaz.
// export const ESKI_PUAN_ESIKLERI = { Çaylak: 0, Bilge: 100, Üstat: 500, Kahin: 1500, Efsane: 5000 };

/** Level → rütbe. */
export function rutbeBul(level) {
  const l = Number(level) || 1;
  let r = RUTBELER[0];
  for (const rt of RUTBELER) {
    if (l >= rt.min) r = rt;
  }
  return r;
}

/** Level → bir sonraki rütbe (en üstteyse null). */
export function sonrakiRutbe(level) {
  const l = Number(level) || 1;
  return RUTBELER.find((r) => r.min > l) ?? null;
}
