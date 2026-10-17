// Ses çıkış ölçümü RAPOR TABLOSU (17 Eki 2026) — araclar/ses-cikis-olcum.mjs çıktılarını (tasarim/ses-cikis/*.json) birleştirir:
// her mod × an × rol için sürüm başına (ekim10 · once · yeni) dosya, doğal süre, en dar pencere (bütün senaryolarda), "ses bitmeden
// ekran geçti" sayısı / en kötü kalan ms, binme sayısı / en kötü ms, kesilme sayısı / en kötü ms, çalmayan.
// Kullanım: node araclar/ses-cikis-rapor.mjs tasarim/ses-cikis/a.json [b.json …] > tablo.md
import fs from "node:fs";

const kosular = process.argv.slice(2).flatMap((f) => JSON.parse(fs.readFileSync(f, "utf8")));
const SURUM = ["ekim10", "once", "yeni"];
const top = new Map();   // mod|an|rol → sürüm → toplam
for (const k of kosular) {
  if (k.hata) continue;
  for (const s of k.sesler ?? []) {
    const anahtar = `${k.mod}|${s.an ?? "?"}|${s.rol}`;
    const g = top.get(anahtar) ?? {}; top.set(anahtar, g);
    const t = (g[k.surum] ||= { n: 0, dosya: new Set(), dogal: 0, pencere: Infinity, ekran: 0, ekranMs: 0, binme: 0, binmeMs: 0, kesik: 0, kesikMs: 0 });
    t.n++; if (s.dosya) t.dosya.add(s.dosya.replace(/-[0-9a-f]{10}(\.\w+)$/, "$1")); t.dogal = Math.max(t.dogal, s.dogalMs ?? 0);
    if (s.pencereMs != null) t.pencere = Math.min(t.pencere, s.pencereMs);
    if (s.ekranGecti) { t.ekran++; t.ekranMs = Math.max(t.ekranMs, s.ekranGecti.kalanMs); }
    if (s.binme?.length) { t.binme++; t.binmeMs = Math.max(t.binmeMs, ...s.binme.map((b) => b.ms)); }
    if (s.kesildi) { t.kesik++; t.kesikMs = Math.max(t.kesikMs, s.kesilenMs); }
  }
}
const hucre = (t) => !t ? "—" : `${[...t.dosya].join(", ")} · doğal ${t.dogal} · pencere ≥ ${Number.isFinite(t.pencere) ? t.pencere : "—"} · ekran geçti ${t.ekran}${t.ekran ? ` (≤ ${t.ekranMs} ms)` : ""} · binme ${t.binme}${t.binme ? ` (≤ ${t.binmeMs} ms)` : ""} · kesildi ${t.kesik}${t.kesik ? ` (≤ ${t.kesikMs} ms)` : ""}`;
const satir = ["| mod | an | rol | 10 Eki (efd76df3) | önce (908c2619) | sonra |", "|---|---|---|---|---|---|"];
for (const [a, g] of [...top.entries()].sort()) {
  const [mod, an, rol] = a.split("|");
  satir.push(`| ${mod} | ${an} | ${rol} | ${hucre(g.ekim10)} | ${hucre(g.once)} | ${hucre(g.yeni)} |`);
}
// sürüm × senaryo toplamı
const ozet = ["| sürüm | koşu | anlamlı ses | ses bitmeden ekran geçti | binme > 50 ms | kesildi | çalmayan (kurala göre) |", "|---|---|---|---|---|---|---|"];
for (const s of SURUM) {
  const k = kosular.filter((x) => x.surum === s && !x.hata);
  if (!k.length) continue;
  const t = (f) => k.reduce((n, x) => n + (x.sayac?.[f] ?? 0), 0);
  ozet.push(`| ${s} | ${k.length} | ${t("calan")} | ${t("ekranGecti")} | ${t("binme")} | ${t("kesildi")} | ${t("calmayan")} |`);
}
const sen = ["| sürüm | mod | senaryo | boyut | dil | anlamlı | ekran geçti | binme | kesildi |", "|---|---|---|---|---|---|---|---|---|"];
for (const k of kosular) sen.push(k.hata ? `| ${k.surum} | ${k.mod} | ${k.sen} | ${k.boyut} | ${k.dil} | HATA ${k.hata} ||||` : `| ${k.surum} | ${k.mod} | ${k.sen} | ${k.boyut} | ${k.dil} | ${k.sayac.calan} | ${k.sayac.ekranGecti} | ${k.sayac.binme} | ${k.sayac.kesildi} |`);
console.log(["## Toplam", "", ...ozet, "", "## An tablosu (bütün senaryolar birleşik)", "", ...satir, "", "## Koşular", "", ...sen].join("\n"));
