// Sabit zamanlı gizli anahtar karşılaştırması (güvenlik denetimi 10 Eki 2026, madde 5):
// `!==` ilk farklı baytta durur; süre farkından anahtar tahmin edilemesin diye bütün baytlar gezilir.
export function gizliEsitMi(gelen: string | null, beklenen: string | undefined): boolean {
  if (!gelen || !beklenen) return false;
  const a = new TextEncoder().encode(gelen);
  const b = new TextEncoder().encode(beklenen);
  let fark = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) fark |= (a[i] ?? 0) ^ b[i];
  return fark === 0;
}
