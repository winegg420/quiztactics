// Bildirim metinlerinin EN karşılığı: (1) push_metinleri şablonları, (2) bildirimler tablosundaki gerçek metinler
// istemcide ttSunucu() ile çevriliyor; bu betik çevrilmeyenleri listeler. Kullanım: node araclar/ceviri/bildirim-tara.mjs
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { PgIstemci, baglantiDizgisi } from "../pg-mini.mjs";
const kok = path.resolve(import.meta.dirname, "..", "..");
process.chdir(kok);
const gecici = path.join(os.tmpdir(), "ceviri-sozluk-bildirim.mjs");
await build({ entryPoints: [path.join(kok, "oyun/lib/dil.js")], bundle: true, platform: "node", format: "esm", outfile: gecici, logLevel: "error",
  plugins: [{ name: "a", setup(b) { b.onLoad({ filter: /oyun[\/]lib[\/]dil\.js$/ }, (a) => ({ contents: fs.readFileSync(a.path, "utf8"), loader: "js" })); } }] });
const dil = await import(pathToFileURL(gecici).href);
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
try {
  localStorage_kur();
  const sablon = await db.sorgu("select anahtar, govde, baslik from push_metinleri where dil='tr' and anahtar not like 'terim:%' order by 1");
  const gercek = await db.sorgu("select distinct tip, metin from bildirimler order by 1");
  const cevrilmedi = (m) => dil.ttSunucu(m) === m;
  console.log("== şablonlar (TR govde → EN ttSunucu)");
  for (const r of sablon) { const ornek = r.govde.replace(/%\d?/g, "7"); if (cevrilmedi(r.govde) && cevrilmedi(ornek)) console.log("  ÇEVRİLMEDİ:", r.anahtar, "|", r.govde.slice(0, 90)); }
  for (const o of ["Ayşe davetinle katıldı! Level 5 ulaşınca +300 coin kazanacaksın.", "Ayşe Level 5 ulaştı! +300 coin", "Kaan sana mesaj attı.", "🏆 Balıkesir Şampiyonu oldun! Unvanın bu hafta profilinde ve maçlarda görünecek."]) console.log("  örnek:", dil.ttSunucu(o));
  console.log("== gerçek bildirim metinleri");
  for (const r of gercek) if (cevrilmedi(r.metin)) console.log("  ÇEVRİLMEDİ:", r.tip, "|", r.metin.slice(0, 100));
} finally { await db.kapat(); }
function localStorage_kur() { globalThis.localStorage = { getItem: () => "en", setItem() {}, removeItem() {} }; globalThis.document = { documentElement: {} }; }
