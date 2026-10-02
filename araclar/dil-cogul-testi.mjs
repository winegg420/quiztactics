// İngilizce tekil/çoğul denetimi: t() sözlüğü çoğul bilmediği için "1 questions" çıkmasın.
//   node araclar/dil-cogul-testi.mjs [--tum]    (--tum: n=1'de değişen bütün satırları da yazar)
// (a) n=1'de çoğul kalmış metin  (b) n=0/2/5 çıktısı eskiyle aynı  (c) TR çıktısı eskiyle birebir aynı.
import { SOZLUK, t, jokerAdi, sozlukYukle } from "../oyun/lib/dil.js";
await sozlukYukle("en");   // İngilizce sözlük tembel yüklenir

// Düzeltmeden ÖNCEKİ t() — karşılaştırma tabanı.
function eskiT(dil, anahtar, degerler) {
  const metin = jokerAdi((dil !== "tr" && SOZLUK[dil]?.[anahtar]) || anahtar.split("|")[0]);
  if (!degerler) return metin;
  return metin.replace(/\{(\w+)\}/g, (tam, ad) =>
    Object.prototype.hasOwnProperty.call(degerler, ad)
      ? (degerler[ad] === undefined || degerler[ad] === null ? "" : String(degerler[ad]))
      : tam);
}

const TUM = process.argv.includes("--tum");
const anahtarlar = Object.keys(SOZLUK.en);
const yerTutucuAdlari = (m) => [...new Set([...m.matchAll(/\{(\w+)\}/g)].map((x) => x[1]))];
const hepsi = (m, d) => Object.fromEntries(yerTutucuAdlari(m).map((a) => [a, d]));

const nli = anahtarlar.filter((k) => /\{n\}/.test(SOZLUK.en[k]));
let degisen = 0, cogulKalan = [], yanlisTekil = [], digerBozuk = [];
const SUSPHELI = /\b1 (?:[A-Za-z]+ )?[A-Za-z]+s\b(?!\()/;   // n=1 çıktısında hâlâ "1 xxxs" gibi duruyor mu

for (const k of nli) {
  const en = SOZLUK.en[k];
  for (const n of [0, 2, 5]) {
    const a = eskiT("en", k, hepsi(en, n)), b = t("en", k, hepsi(en, n));
    if (a !== b) digerBozuk.push({ k, n, a, b });
  }
  const once = eskiT("en", k, hepsi(en, 1)), sonra = t("en", k, hepsi(en, 1));
  const sayiyla = t("en", k, hepsi(en, "1"));
  if (sayiyla !== sonra) digerBozuk.push({ k, n: '"1"', a: sonra, b: sayiyla });
  if (once !== sonra) { degisen++; if (TUM) console.log(`  ${once}  →  ${sonra}`); }
  // Yalnız {n}'den hemen sonraki kelimeye bak (diğer yer tutucular 1 alsa da kural n içindir).
  const m = sonra.match(/\b1 ([A-Za-z]+)/);
  if (m && /s$/i.test(m[1]) && !/(ss|us|is)$/i.test(m[1]) && m[1] === m[1].toLowerCase() && m[1].length > 3 && !/^(news|series|species|this|does|always|plus|status)$/i.test(m[1])) cogulKalan.push(sonra);
}

// Yanlış tekile çevrilen kelimeleri görmek için: değişen kelime çiftlerini topla.
const ciftler = new Map();
for (const k of nli) {
  const o = eskiT("en", k, hepsi(SOZLUK.en[k], 1)), s = t("en", k, hepsi(SOZLUK.en[k], 1));
  const ow = o.match(/\b1 ([A-Za-z]+)/)?.[1], sw = s.match(/\b1 ([A-Za-z]+)/)?.[1];
  if (ow && sw && ow !== sw) ciftler.set(`${ow} → ${sw}`, (ciftler.get(`${ow} → ${sw}`) || 0) + 1);
}

// (c) TR: bütün anahtarlar, yer tutucusuz ve n=0/1/2/5 ile birebir aynı mı?
let trFark = 0, trSay = 0;
for (const k of anahtarlar) {
  for (const d of [undefined, 0, 1, 2, 5, "1"]) {
    const dg = d === undefined ? undefined : hepsi(k, d);
    trSay++;
    if (eskiT("tr", k, dg) !== t("tr", k, dg)) { trFark++; console.log("TR FARK:", k); }
  }
}

console.log("\n┌ Çoğul testi ─────────────────────────────────────");
console.log(`│ {n} içeren EN metin          : ${nli.length}`);
console.log(`│ n=1'de tekile çevrilen       : ${degisen}`);
console.log(`│ (a) n=1'de çoğul kalan       : ${cogulKalan.length}`);
console.log(`│ (b) n=0/2/5 ve "1" metni fark: ${digerBozuk.length}`);
console.log(`│ (c) TR çıktı farkı           : ${trFark} / ${trSay} çağrı`);
console.log("└──────────────────────────────────────────────────");
console.log("Değişen kelimeler (kontrol et — yanlış tekil var mı?):");
for (const [c, s] of [...ciftler].sort()) console.log(`  ${c}  (${s})`);
if (cogulKalan.length) { console.log("Çoğul kalanlar:"); cogulKalan.forEach((x) => console.log("  " + x)); }
if (digerBozuk.length) { console.log("Bozulanlar:"); digerBozuk.slice(0, 20).forEach((x) => console.log("  ", JSON.stringify(x))); }
// Örnek önce/sonra
console.log("\nÖrnek (n=0,1,2,5):");
for (const k of nli.filter((k) => /\{n\} (?:[a-z]+ )?[a-z]+s\b/i.test(SOZLUK.en[k])).slice(0, 8)) {
  console.log("  " + [0, 1, 2, 5].map((n) => t("en", k, { n })).join(" | "));
}
process.exit(cogulKalan.length || digerBozuk.length || trFark ? 1 : 0);
