// magaza-metinleri.md içindeki kod bloklarının karakter sayısını Play sınırlarıyla karşılaştırır.
// Kullanım (depo kökünden): node docs/play-store/metin-say.mjs
import fs from "node:fs";
const md = fs.readFileSync(new URL("./magaza-metinleri.md", import.meta.url), "utf8");
const bloklar = [...md.matchAll(/```\r?\n([\s\S]*?)\r?\n```/g)].map((m) => m[1]);
const adlar = ["TR ad", "TR kısa", "TR uzun", "EN ad", "EN kısa", "EN uzun"];
const sinir = [30, 80, 4000, 30, 80, 4000];
let hata = 0;
bloklar.slice(0, 6).forEach((b, i) => {
  const n = [...b].length;
  const ok = n <= sinir[i];
  if (!ok) hata += 1;
  console.log(`${ok ? "✓" : "✗"} ${adlar[i]}: ${n} / ${sinir[i]}`);
});
process.exit(hata ? 1 : 0);
