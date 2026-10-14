// İNGİLİZCE SÖZLÜK BÖLME (Paket B/12, 15 Eki 2026) — vite.config.js › sozlukBolme eklentisi bunu kullanır.
// Birleşik sözlük (oyun/lib/dil-en.js, son değerler) iki parçaya ayrılır:
//   çekirdek = ilk açılış paketinin (src/main.jsx'ten STATİK içe aktarmayla ulaşılan dosyalar) kaynak kodunda metin
//              olarak geçen anahtarlar + hiçbir kaynak dosyada metin olarak geçmeyen anahtarlar (sunucu mesajı, DB adı,
//              dinamik anahtar — nereden geleceği bilinemez → güvenli taraf);
//   ek       = yalnız tembel parçalarda geçen anahtarlar (sayfalar, pencereler) — açılıştan hemen sonra arka planda iner,
//              tembel sayfalar onu bekler (src/lib/tembelYukle.js).
// Değerler birleşik sözlükten alınır: dosya sırası/ezme kuralı aynen korunur.
//   node araclar/sozluk-bolme.mjs   → özet (anahtar sayısı, boyut)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const KOK = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const UZANTILAR = ["", ".js", ".jsx", ".mjs", "/index.js", "/index.jsx"];
const STATIK = /(?:^|[\s;])(?:import\s+(?:[\w*{}\s,]+\s+from\s+)?|export\s+[\w*{}\s,]+\s+from\s+)["']([^"']+)["']/g;
const METIN = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\$]|\\.|\$(?!\{))*)`/g;
const CEVIRI = /[\\/]oyun[\\/]lib[\\/](ceviri[\\/]|dil-en)/;

function coz(kimden, hedef) {
  if (!hedef.startsWith(".")) return null;   // paket (node_modules) — sözlük anahtarı taşımaz
  const taban = path.resolve(path.dirname(kimden), hedef);
  for (const u of UZANTILAR) { const d = taban + u; if (fs.existsSync(d) && fs.statSync(d).isFile()) return d; }
  return null;
}
function metinler(dosya, kume) {
  const k = fs.readFileSync(dosya, "utf8");
  for (const m of k.matchAll(METIN)) { const v = m[1] ?? m[2] ?? m[3]; if (v && v.length > 1) kume.add(v.replace(/\\(["'`\\])/g, "$1").replace(/\\n/g, "\n")); }
}
function tumKaynaklar(dizin, liste = []) {
  for (const ad of fs.readdirSync(dizin, { withFileTypes: true })) {
    if (["node_modules", "_test", "dist", ".git"].includes(ad.name)) continue;
    const yol = path.join(dizin, ad.name);
    if (ad.isDirectory()) tumKaynaklar(yol, liste);
    else if (/\.(jsx?|mjs)$/.test(ad.name) && !CEVIRI.test(yol)) liste.push(yol);
  }
  return liste;
}

export async function sozlukBol() {
  const birlesik = (await import(pathToFileURL(path.join(KOK, "oyun/lib/dil-en.js")).href + `?t=${Date.now()}`)).default;
  // 1) ilk açılış paketi: main.jsx + baslat.js'ten statik kapanış
  const gorulen = new Set();
  const kuyruk = [path.join(KOK, "src/baslat.js"), path.join(KOK, "src/main.jsx")];
  while (kuyruk.length) {
    const d = kuyruk.pop();
    if (gorulen.has(d)) continue;
    gorulen.add(d);
    const k = fs.readFileSync(d, "utf8");
    for (const m of k.matchAll(STATIK)) { const h = coz(d, m[1]); if (h && /\.(jsx?|mjs)$/.test(h) && !gorulen.has(h)) kuyruk.push(h); }
  }
  const ana = new Set();
  for (const d of gorulen) if (!CEVIRI.test(d)) metinler(d, ana);
  // 2) bütün kaynaklar (oyun/, src/)
  const hepsi = new Set();
  for (const d of [...tumKaynaklar(path.join(KOK, "oyun")), ...tumKaynaklar(path.join(KOK, "src"))]) metinler(d, hepsi);
  const cekirdek = {}, ek = {};
  for (const [a, v] of Object.entries(birlesik)) {
    const taban = a.split("|")[0];
    if (ana.has(a) || ana.has(taban) || (!hepsi.has(a) && !hepsi.has(taban))) cekirdek[a] = v; else ek[a] = v;
  }
  return { cekirdek, ek, anaDosya: gorulen.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
  const { cekirdek, ek, anaDosya } = await sozlukBol();
  const kb = (o) => Math.round(JSON.stringify(o).length / 1024);
  console.log(`ilk açılış dosyası ${anaDosya} · çekirdek ${Object.keys(cekirdek).length} anahtar ${kb(cekirdek)} KB · ek ${Object.keys(ek).length} anahtar ${kb(ek)} KB`);
}
