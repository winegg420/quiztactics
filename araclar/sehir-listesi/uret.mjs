// Şehir listesi migration'ının veri bölümünü üretir (Şehir Şampiyonu, 25 Eyl 2026).
//
// Kaynak: GeoNames (https://www.geonames.org) — Creative Commons Attribution 4.0.
//   cities15000.txt      → Türkiye dışındaki ülkelerin nüfusu 100.000+ şehirleri
//   admin1CodesASCII.txt → aynı ülkede aynı adlı iki şehir varsa ayırt etmek için eyalet adı
//   TR.txt (ADM1)        → 81 ilin nüfusu (il adları depodaki resmi listeden gelir, GeoNames'ten değil)
// Atıf: Hakkında / Lisanslar sayfası (oyun/pages/YasalPage.jsx) ve docs/VARLIK_LISANSLARI.md.
//
// Kullanım:
//   node araclar/sehir-listesi/uret.mjs <geonames-klasörü> <ülke-kodları-virgüllü> > cikti.sql
// Klasörde cities15000.txt, admin1CodesASCII.txt, TR.txt bulunmalı
// (https://download.geonames.org/export/dump/ adresinden; zip'leri açın).
import fs from "node:fs";
import path from "node:path";

const [klasor, kodlarArg] = process.argv.slice(2);
if (!klasor || !kodlarArg) throw new Error("Kullanım: node uret.mjs <geonames-klasörü> <TR,DE,...>");
const ulkeler = new Set(kodlarArg.split(",").map((k) => k.trim().toUpperCase()).filter(Boolean));

const NUFUS_ESIK = 100000;      // brif: nüfusu 100.000+ şehirler
const YEDEK_ADET = 3;           // 100.000+ şehri olmayan ülkede en kalabalık 3 şehir
const ATLANAN_KOD = new Set(["PPLX", "PPLH", "PPLQ", "PPLW", "PPLCH"]); // mahalle, tarihî, terk edilmiş

const satirlar = (dosya) =>
  fs.readFileSync(path.join(klasor, dosya), "utf8").split("\n").filter(Boolean).map((s) => s.split("\t"));

const eyaletAdi = new Map(satirlar("admin1CodesASCII.txt").map((c) => [c[0], c[1]]));

// ülke → [{ad, nufus, eyalet}]
const ulkeSehirleri = new Map();
for (const c of satirlar("cities15000.txt")) {
  const [, ad, , , , , sinif, kod, ulke, , admin1] = c;
  const nufus = Number(c[14]) || 0;
  if (ulke === "TR" || !ulkeler.has(ulke) || sinif !== "P" || ATLANAN_KOD.has(kod)) continue;
  if (!ulkeSehirleri.has(ulke)) ulkeSehirleri.set(ulke, []);
  ulkeSehirleri.get(ulke).push({ ad: ad.trim(), nufus, eyalet: eyaletAdi.get(`${ulke}.${admin1}`) ?? null });
}

const kayitlar = [];
const yedekUlkeler = [];
for (const ulke of [...ulkeler].sort()) {
  if (ulke === "TR") continue;
  const hepsi = (ulkeSehirleri.get(ulke) ?? []).sort((a, b) => b.nufus - a.nufus);
  let secilen = hepsi.filter((s) => s.nufus >= NUFUS_ESIK);
  if (secilen.length === 0) {
    secilen = hepsi.slice(0, YEDEK_ADET);
    yedekUlkeler.push(`${ulke}:${secilen.length}`);
  }
  // Aynı ülkede aynı ad → "(Eyalet)" eki; yine çakışırsa en kalabalık kalır.
  const adSayisi = new Map();
  for (const s of secilen) adSayisi.set(s.ad, (adSayisi.get(s.ad) ?? 0) + 1);
  const gorulen = new Set();
  for (const s of secilen) {
    const ad = adSayisi.get(s.ad) > 1 && s.eyalet ? `${s.ad} (${s.eyalet})` : s.ad;
    if (gorulen.has(ad)) continue;
    gorulen.add(ad);
    kayitlar.push({ ulke, ad, nufus: s.nufus });
  }
}

// 81 il nüfusu (GeoNames ADM1). Ad eşlemesi SQL tarafında sehir_anahtar() ile yapılır.
const ilNufus = satirlar("TR.txt")
  .filter((c) => c[7] === "ADM1")
  .map((c) => ({ ad: c[1].trim(), nufus: Number(c[14]) || 0 }));

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const blok = (dizi, fn, boy = 400) => {
  const parca = [];
  for (let i = 0; i < dizi.length; i += boy) parca.push(dizi.slice(i, i + boy).map(fn).join(",\n"));
  return parca;
};

let cikti = `-- ÜRETİLDİ: araclar/sehir-listesi/uret.mjs — elle düzenleme yapma.\n`;
cikti += `-- Kaynak: GeoNames (CC BY 4.0). ${kayitlar.length} yabancı şehir; 81 il nüfusu.\n`;
if (yedekUlkeler.length) cikti += `-- 100.000+ şehri olmayan ülkeler (en kalabalık ${YEDEK_ADET}): ${yedekUlkeler.join(", ")}\n`;
cikti += `\ncreate temp table _il_nufus (ad text, nufus int) on commit drop;\n`;
cikti += `insert into _il_nufus (ad, nufus) values\n${ilNufus.map((r) => `(${q(r.ad)}, ${r.nufus})`).join(",\n")};\n\n`;
for (const parca of blok(kayitlar, (r) => `(${q(r.ulke)}, ${q(r.ad)}, ${r.nufus}, 'geonames')`)) {
  cikti += `insert into public.sehirler (ulke, ad, nufus, kaynak) values\n${parca}\non conflict (ulke, ad) do update set nufus = excluded.nufus, kaynak = excluded.kaynak;\n\n`;
}
process.stdout.write(cikti);
process.stderr.write(`yabancı şehir: ${kayitlar.length}, ülke: ${new Set(kayitlar.map((k) => k.ulke)).size}, yedek: ${yedekUlkeler.join(" ") || "yok"}\n`);
