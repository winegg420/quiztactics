/**
 * Paket 41 M.7: uzun soru/şıkta yazı kademeli küçülür ki şıklar ve joker çubuğu
 * telefonda ekrana sığsın (390×844'te ölçüldü). Eşikler karakter sayısı.
 * Klasik/Grup/Turnuva (QuestionCard), Çalışma ve Düello aynı eşikleri kullanır.
 * @param {{ soru?: string, secenekler?: string[] | string }} soru
 * @returns {"" | "m1-soru--uzun" | "m1-soru--cok-uzun"}
 */
export function soruUzunlukSinifi(soru) {
  const s = String(soru?.soru ?? "").length;
  let siklar = soru?.secenekler ?? [];
  if (typeof siklar === "string") {
    try { siklar = JSON.parse(siklar); } catch { siklar = []; }
  }
  if (!Array.isArray(siklar)) siklar = [];
  const enUzunSik = Math.max(0, ...siklar.map((x) => String(x ?? "").length));
  if (s > 170 || enUzunSik > 48) return "m1-soru--cok-uzun";
  if (s > 100 || enUzunSik > 30) return "m1-soru--uzun";
  return "";
}
