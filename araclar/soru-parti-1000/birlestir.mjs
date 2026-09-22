// Taslakları + Jev kapısı sonuçlarını + elle kararları birleştirip son listeyi üretir:
// araclar/soru-parti-1000/sorular.json (uret-migration.mjs'in girdisi) ve ozet.json (rapor).
//
// Eleme kuralları (sırayla):
//   1) Jev, bizim cevabımızdan FARKLI bir şıkkı >0,9 güvenle seçtiyse → 'jev_itiraz' (otomatik)
//   2) kararlar.json'da {anahtar: {karar:'ele', sebep}} → sebebiyle elenir
//   3) Kota: kategori başına hedef aşıldıysa fazlası 'kota_fazlasi' (önce Jev kategorisi bizimle
//      uyuşmayan ve Jev'in yüksek olasılıkla "başka şık da doğru" dediği sorular düşer)
// kararlar.json'da {karar:'en_yok', neden} → İngilizce çevrilmez, ceviri_atlanan'a gider.
// Zorluk: Jev puanı → zorluk-esikler.json eşikleri (migration 274 ile aynı).
//
// Kullanım: node araclar/soru-parti-1000/birlestir.mjs <taslak-klasoru> <jev.jsonl>
import fs from 'node:fs';
import { sonuclariOku, taslaklariOku, icerikAnahtari } from './jev-kapi.mjs';
import { seviye } from './zorluk.mjs';
import { maliyetUsd } from '../jev.mjs';

export const HEDEF = {
  sinema: 130, teknoloji: 130, muzik: 120, sanat: 120, spor: 110,
  edebiyat: 100, bilim: 100, tarih: 90, yerel: 60, genel_kultur: 40,
};
const ITIRAZ_GUVEN = 0.9;

const [klasor, jevYol] = process.argv.slice(2);
if (!klasor || !jevYol) {
  console.error('Kullanım: birlestir.mjs <taslak-klasoru> <jev.jsonl>');
  process.exit(1);
}
const esikDosya = JSON.parse(fs.readFileSync(new URL('./zorluk-esikler.json', import.meta.url), 'utf8'));
const esikler = [2, 3, 4, 5].map((s) => esikDosya.esikler[s]);
const kararYol = new URL('./kararlar.json', import.meta.url);
const kararlar = fs.existsSync(kararYol) ? JSON.parse(fs.readFileSync(kararYol, 'utf8')) : {};
const jev = sonuclariOku(jevYol);
const taslaklar = taslaklariOku(klasor);

const elenen = [];
const kovalar = {};
let eksikJev = 0;
for (const t of taslaklar) {
  const anahtar = icerikAnahtari(t);
  const j = jev.get(anahtar);
  if (!j) { eksikJev++; continue; }
  const kova = t.yerel ? 'yerel' : t.k;
  const karar = kararlar[anahtar];
  if (j.jevCevap !== t.d && j.jevGuven > ITIRAZ_GUVEN && karar?.karar !== 'tut') {
    elenen.push({ sebep: 'jev_itiraz', kova, s: t.s, d: t.d, jev: j.jevCevap, guven: j.jevGuven });
    continue;
  }
  if (karar?.karar === 'ele') {
    elenen.push({ sebep: karar.sebep || 'elle', kova, s: t.s, d: t.d, not: karar.not });
    continue;
  }
  const enYok = karar?.karar === 'en_yok' || !t.en;
  const kayit = {
    k: t.k, yerel: !!t.yerel, s: t.s, d: t.d, y: t.y,
    zorluk: seviye(j.jevZorluk, esikler),
    jev_puan: j.jevZorluk,
    en: enYok ? null : t.en,
    ...(enYok ? { en_neden: karar?.neden || t.en_neden } : {}),
  };
  // Kota elemesinde düşük öncelik puanı: kategori uyuşmazlığı + "başka şık da doğru" olasılığı
  const oncelik = (j.jevKategori === t.k ? 0 : 1) + Math.max(...j.digerDogru);
  (kovalar[kova] ??= []).push({ kayit, oncelik, anahtar });
}
if (eksikJev) {
  console.error(`${eksikJev} taslağın Jev sonucu yok — önce jev-kapi.mjs çalıştır.`);
  process.exit(1);
}

const son = [];
const eksik = {};
for (const [kova, hedef] of Object.entries(HEDEF)) {
  const liste = (kovalar[kova] ?? []).sort((a, b) => a.oncelik - b.oncelik || a.anahtar.localeCompare(b.anahtar));
  for (const x of liste.slice(hedef)) elenen.push({ sebep: 'kota_fazlasi', kova, s: x.kayit.s });
  son.push(...liste.slice(0, hedef).map((x) => x.kayit));
  if (liste.length < hedef) eksik[kova] = hedef - liste.length;
}

const sayim = (dizi, f) => dizi.reduce((m, x) => ((m[f(x)] = (m[f(x)] || 0) + 1), m), {});
const tumJev = [...jev.values()];
const ozet = {
  tarih: new Date().toISOString().slice(0, 10),
  taslak: taslaklar.length,
  net: son.length,
  eksik,
  elenen_sebep: sayim(elenen, (x) => x.sebep),
  kova: sayim(son, (x) => (x.yerel ? `yerel/${x.k}` : x.k)),
  zorluk: [1, 2, 3, 4, 5].map((z) => son.filter((x) => x.zorluk === z).length),
  zor_orani: +(son.filter((x) => x.zorluk >= 4).length / Math.max(1, son.length)).toFixed(3),
  cevrilmeyen: son.filter((x) => !x.en).length,
  jev: {
    cagri: tumJev.reduce((t, r) => t + (r.cagri || 0), 0),
    girdi_jetonu: tumJev.reduce((t, r) => t + (r.jeton || 0), 0),
    usd: +maliyetUsd(tumJev.reduce((t, r) => t + (r.jeton || 0), 0)).toFixed(4),
    not: 'jev.jsonl içindeki tüm denemeler dahil (düzeltilip yeniden sorulanlar da)',
  },
  elenenler: elenen.filter((x) => x.sebep !== 'kota_fazlasi'),
};
fs.writeFileSync(new URL('./sorular.json', import.meta.url), JSON.stringify(son.map(({ jev_puan, ...x }) => x), null, 1) + '\n');
fs.writeFileSync(new URL('./ozet.json', import.meta.url), JSON.stringify(ozet, null, 2) + '\n');
console.log(JSON.stringify({ ...ozet, elenenler: ozet.elenenler.length }, null, 2));
