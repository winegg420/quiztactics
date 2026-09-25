// Veritabanından oyuncuya görünen ÇEVRİLMEMİŞ Türkçe metinleri bulur (Arayüz İngilizce, Ida 25 Eyl 2026):
//  1) `raise exception '…'` hata mesajları → EN sözlüğünde (ya da "%" kalıbında) yok mu (ttSunucu ile çevrilir)
//  2) Oyuncuya görünen katalog tablolarındaki Türkçe-yalnız metin sütunları (ad_en / *_en karşılığı boş ya da TR ile aynı)
// Kullanım: node araclar/ceviri/db-tara.mjs [--json cikti.json]    (önce `node araclar/ceviri/tara.mjs` en az bir kez çalışmış olmalı: sözlük paketi)
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { PgIstemci, baglantiDizgisi } from "../pg-mini.mjs";

const kok = path.resolve(import.meta.dirname, "..", "..");
process.chdir(kok);
const gecici = path.join(os.tmpdir(), "ceviri-sozluk-db.mjs");
await build({
  entryPoints: [path.join(kok, "oyun/lib/dil.js")], bundle: true, platform: "node", format: "esm", outfile: gecici, logLevel: "error",
  plugins: [{ name: "sozluk-aktar", setup(b) {
    b.onLoad({ filter: /oyun[\\/]lib[\\/]dil\.js$/ }, (a) => ({ contents: fs.readFileSync(a.path, "utf8").replace("const SOZLUK = {", "export const SOZLUK = {"), loader: "js" }));
  } }],
});
const { SOZLUK } = await import(pathToFileURL(gecici).href);
const EN = SOZLUK.en;
const kacis = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const kaliplar = Object.keys(EN).filter((k) => k.includes("%")).map((k) => new RegExp("^" + k.split("%").map(kacis).join("(.+?)") + "$"));
const enVar = (m) => Object.prototype.hasOwnProperty.call(EN, m) || Object.prototype.hasOwnProperty.call(EN, m.split("|")[0]) || kaliplar.some((r) => r.test(m));

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const sonuc = { hata_mesajlari: [], katalog: [] };
try {
  const fonksiyonlar = await db.sorgu("select p.proname, p.prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and p.prokind='f'");
  const eksik = new Map();
  for (const { proname, prosrc } of fonksiyonlar) {
    for (const m of prosrc.matchAll(/raise\s+exception\s+'((?:[^']|'')*)'/gi)) {
      const ham = m[1].replace(/''/g, "'");
      if (!/\p{L}{3,}/u.test(ham) || enVar(ham)) continue;
      if (!eksik.has(ham)) eksik.set(ham, new Set());
      eksik.get(ham).add(proname);
    }
  }
  sonuc.hata_mesajlari = [...eksik].map(([metin, f]) => ({ metin, fonksiyonlar: [...f].slice(0, 4) }));
  console.log(`fonksiyon: ${fonksiyonlar.length} · çevrilmemiş hata mesajı: ${sonuc.hata_mesajlari.length}`);
  // 2) Katalog tabloları: oyuncuya tt(değer) ile gösterilen Türkçe-yalnız sütunlar sözlükte var mı
  const KATALOG = [["coin_paketleri", "ad"], ["elmas_paketleri", "ad"], ["esyalar", "ad"], ["joker_paketleri", "ad"], ["joker_paketleri", "aciklama"], ["skill_katalogu", "aciklama"],
    ["badges", "ad"], ["badges", "aciklama"], ["turnuva_giysi_odulu", "aciklama"], ["push_metinleri", "govde"]];
  for (const [tablo, sutun] of KATALOG) {
    try {
      const satirlar = await db.sorgu(`select distinct ${sutun} v from public.${tablo} where ${sutun} is not null${tablo === "push_metinleri" ? " and dil = 'tr'" : ""}`);
      for (const { v } of satirlar) if (/\p{L}{3,}/u.test(v) && !enVar(v)) sonuc.katalog.push({ tablo, sutun, metin: v });
    } catch (e) { sonuc.katalog.push({ tablo, sutun, hata: String(e.message).slice(0, 60) }); }
  }
  console.log(`katalog: çevrilmemiş ${sonuc.katalog.length}`);
} finally { await db.kapat(); }
if (args_json()) fs.writeFileSync(args_json(), JSON.stringify(sonuc, null, 1));
function args_json() { const i = process.argv.indexOf("--json"); return i >= 0 ? process.argv[i + 1] : null; }
for (const x of sonuc.katalog) console.log(" *", x.tablo + "." + x.sutun, JSON.stringify(x.metin ?? x.hata).slice(0, 110));
for (const x of sonuc.hata_mesajlari) console.log(" -", JSON.stringify(x.metin).slice(0, 130), "<-", x.fonksiyonlar.join(","));
