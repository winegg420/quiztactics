// Güncel TR/EN alanlarını kontrol eder; eski sürüm arşivi ölçüme katılmaz.
// Kullanım: node docs/play-store/metin-say.mjs
import fs from "node:fs";
const md = fs.readFileSync(new URL("./magaza-metinleri.md", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const aktif = md.split("\n## Karakter sayıları")[0];
const bloklar = [...aktif.matchAll(/```\n([\s\S]*?)\n```/g)].map((m) => m[1]);
const adlar = ["TR ad", "TR kısa", "TR uzun", "TR yenilikler", "EN ad", "EN kısa", "EN uzun", "EN yenilikler"];
const sinir = [30, 80, 4000, 500, 30, 80, 4000, 500];
let hata = 0;
if (bloklar.length !== adlar.length) { console.error(`✗ Beklenen 8 alan, bulunan ${bloklar.length}`); hata++; }
adlar.forEach((ad, i) => {
  const b = bloklar[i];
  if (b === undefined) { console.error(`✗ ${ad}: eksik`); hata++; return; }
  const n = [...b].length;
  const ok = n > 0 && n <= sinir[i];
  if (!ok) hata++;
  console.log(`${ok ? "✓" : "✗"} ${ad}: ${n} / ${sinir[i]}`);
});
process.exitCode = hata ? 1 : 0;
