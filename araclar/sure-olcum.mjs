// Düello + Ortak Hazine SÜRE ÖLÇÜMÜ — mevcut TAKLİT VERİLİ ekran araçlarını (sunucuya yazmaz) izciyle koşar,
// her sahnenin DOM'da göründüğü süreyi toplar. Canlı DB'ye yazma yok; yalnız oturum/profil okuması canlıya gider.
// Kullanım: npm run dev -- --port 5188 (başka kabukta)
//   node araclar/sure-olcum.mjs --etiket=once [--oturum=.arayuz-denetim-oturum-sure.json] [--yalniz=kasa-efekt,duello-v4]
//   node araclar/sure-olcum.mjs --etiket=ayarli --ayar='{"kasa_cifte":2500}'   (seçimle oynat)
//   node araclar/sure-olcum.mjs --karsilastir=once,sonra
// Çıktı: tasarim/sure-olcum/ozet-<etiket>.json (+ video/, ss/) — git'e girmez.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const KOK = path.resolve("tasarim/sure-olcum");
fs.mkdirSync(KOK, { recursive: true });

const KOSULAR = [
  ["kasa-efekt", ["--en=390"]],
  ["kasa-savunma", ["--en=390", "--boy=844", "--dil=tr"]],
  ["sunum-990", ["--en=390", "--dil=tr"]],
  ["duello-secim", ["--en=390", "--dil=tr"]],
  ["duello-puan", ["--en=390", "--dil=tr"]],
  ["duello-plan-a", ["--boy=390x844", "--dil=tr"]],
  ["duello-v4", ["--dil=tr"]],
];

const ozetle = (kayitlar) => {
  const g = {};
  for (const k of kayitlar) if (!k.kesik) (g[k.ad] ??= []).push(k.sure);
  return Object.fromEntries(Object.entries(g).map(([ad, v]) => {
    const s = [...v].sort((a, b) => a - b);
    return [ad, { n: s.length, medyan: s[Math.floor(s.length / 2)], min: s[0], max: s[s.length - 1] }];
  }));
};

if (ARG.karsilastir) {
  const [a, b] = String(ARG.karsilastir).split(",");
  const A = JSON.parse(fs.readFileSync(path.join(KOK, `ozet-${a}.json`), "utf8"));
  const B = JSON.parse(fs.readFileSync(path.join(KOK, `ozet-${b}.json`), "utf8"));
  let fark = 0;
  for (const ad of [...new Set([...Object.keys(A), ...Object.keys(B)])].sort()) {
    const x = A[ad]?.medyan, y = B[ad]?.medyan;
    const sapma = x != null && y != null ? y - x : null;
    const kotu = sapma == null || Math.abs(sapma) > Math.max(60, x * 0.06);
    if (kotu) fark++;
    console.log(`${kotu ? "✗" : "✓"} ${ad.padEnd(50)} ${String(x ?? "—").padStart(6)} → ${String(y ?? "—").padStart(6)} ms`);
  }
  console.log(fark ? `\n${fark} sahne farklı` : "\nTüm sahneler aynı (±6 % / 60 ms)");
  process.exit(fark ? 1 : 0);
}

const etiket = ARG.etiket || "olcum";
const tum = [];
for (const [arac, argv] of KOSULAR) {
  if (ARG.yalniz && !String(ARG.yalniz).split(",").includes(arac)) continue;
  const et = `${etiket}-${arac}`;
  console.log(`\n▶ ${arac}`);
  const r = spawnSync(process.execPath, ["--import", "./araclar/sure-olcum-izci.mjs", `araclar/${arac}-ekran.mjs`, ...argv, `--adres=${ARG.adres || "http://localhost:5188"}`],
    { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", timeout: 15 * 60 * 1000,
      env: { ...process.env, SURE_OLCUM_ETIKET: et, ...(ARG.oturum ? { SURE_OLCUM_OTURUM: ARG.oturum } : {}), ...(ARG.ayar ? { SURE_OLCUM_AYAR: String(ARG.ayar) } : {}) } });
  const satir = `${r.stdout || ""}`.trim().split("\n").filter((x) => /Sonuç|geçti/.test(x)).pop();
  console.log(`  ${satir || "(çıktı yok)"} ${r.status ? `· çıkış ${r.status}` : ""}`);
  try { tum.push(...JSON.parse(fs.readFileSync(path.join(KOK, `olcum-${et}.json`), "utf8")).kayitlar.map((k) => ({ ...k, arac }))); }
  catch { console.log("  ölçüm dosyası yok"); }
}
const ozet = ozetle(tum);
fs.writeFileSync(path.join(KOK, `ozet-${etiket}.json`), JSON.stringify(ozet, null, 1));
for (const [ad, o] of Object.entries(ozet).sort()) console.log(`${ad.padEnd(50)} medyan ${o.medyan} ms (n=${o.n}, ${o.min}–${o.max})`);
