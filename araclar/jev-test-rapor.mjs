// jev-test-ham.json → A–F ölçümleri. Ekrana markdown basar.
// Kullanım: node araclar/jev-test-rapor.mjs > araclar/jev-test-sonuc.md

import fs from 'node:fs';

const ham = JSON.parse(fs.readFileSync(new URL('./jev-test-ham.json', import.meta.url), 'utf8'));
const hepsi = ham.sonuclar;
const normal = hepsi.filter((r) => r.kume === 'normal');
const capa = hepsi.filter((r) => r.kume === 'capa');
const dogruMu = (r) => r.jevCevap === r.bizimCevap;
const yuzde = (a, b) => (b ? ((100 * a) / b).toFixed(1) + '%' : '—');
const ort = (d) => (d.length ? d.reduce((t, x) => t + x, 0) / d.length : 0);

const satir = (h) => '| ' + h.join(' | ') + ' |';
function tablo(basliklar, satirlar) {
  return [satir(basliklar), satir(basliklar.map(() => '---')), ...satirlar.map(satir)].join('\n');
}

const c = [];
c.push('### A. Doğruluk\n');
c.push(tablo(['Küme', 'Soru', 'Doğru', 'Oran'], [
  ['Tümü', hepsi.length, hepsi.filter(dogruMu).length, yuzde(hepsi.filter(dogruMu).length, hepsi.length)],
  ['Normal (80)', normal.length, normal.filter(dogruMu).length, yuzde(normal.filter(dogruMu).length, normal.length)],
  ['Çapa (20)', capa.length, capa.filter(dogruMu).length, yuzde(capa.filter(dogruMu).length, capa.length)],
]));

c.push('\n**Kategori bazında (bizim etiketimize göre):**\n');
const katlar = [...new Set(hepsi.map((r) => r.bizimKategori))].sort();
c.push(tablo(['Kategori', 'Soru', 'Doğru', 'Oran'], katlar.map((k) => {
  const g = hepsi.filter((r) => r.bizimKategori === k);
  return [k, g.length, g.filter(dogruMu).length, yuzde(g.filter(dogruMu).length, g.length)];
})));

c.push('\n### B. Kalibrasyon\n');
const kovalar = [
  ['< 0,6', (g) => g < 0.6],
  ['0,6 – 0,8', (g) => g >= 0.6 && g < 0.8],
  ['0,8 – 0,9', (g) => g >= 0.8 && g < 0.9],
  ['> 0,9', (g) => g >= 0.9],
];
c.push(tablo(['Güven kovası', 'Soru', 'Doğru', 'Doğruluk'], kovalar.map(([ad, sec]) => {
  const g = hepsi.filter((r) => sec(r.jevCevapGuven));
  return [ad, g.length, g.filter(dogruMu).length, yuzde(g.filter(dogruMu).length, g.length)];
})));
const yanlislar = hepsi.filter((r) => !dogruMu(r));
c.push(`\nOrtalama güven — doğrularda **${ort(hepsi.filter(dogruMu).map((r) => r.jevCevapGuven)).toFixed(3)}**, `
  + `yanlışlarda **${ort(yanlislar.map((r) => r.jevCevapGuven)).toFixed(3)}** (${yanlislar.length} yanlış).`);

c.push('\n### C. Kategori uyumu\n');
const katUyum = hepsi.filter((r) => r.jevKategori === r.bizimKategori);
c.push(`Uyum: **${katUyum.length}/${hepsi.length}** (${yuzde(katUyum.length, hepsi.length)}).\n`);
const katFark = hepsi.filter((r) => r.jevKategori !== r.bizimKategori);
c.push(tablo(['Soru', 'Bizim', 'Jev', 'Güven'], katFark.map((r) => [
  r.soru.replace(/\|/g, '\\|'), r.bizimKategori, r.jevKategori, r.jevKategoriGuven.toFixed(2),
])));

c.push('\n### D. Zorluk\n');
const dagilim = (grup) => {
  const kovalar2 = [1, 2, 3, 4, 5];
  return kovalar2.map((k) => grup.filter((r) => Math.round(r.jevZorluk) === k).length);
};
c.push(tablo(['Küme', '1', '2', '3', '4', '5', 'Ortalama'], [
  ['Normal', ...dagilim(normal), ort(normal.map((r) => r.jevZorluk)).toFixed(2)],
  ['Çapa ("aşırı basit")', ...dagilim(capa), ort(capa.map((r) => r.jevZorluk)).toFixed(2)],
]));
c.push(`\nFark: **${(ort(normal.map((r) => r.jevZorluk)) - ort(capa.map((r) => r.jevZorluk))).toFixed(2)}** puan.`);

c.push('\n### E. Yüksek güvenli uyuşmazlıklar (güven > 0,8)\n');
const catisma = yanlislar.filter((r) => r.jevCevapGuven > 0.8);
c.push(`${catisma.length} soruda Jev bizim cevabımıza yüksek güvenle karşı çıktı.\n`);
c.push(tablo(['Soru', 'Bizim cevabımız', 'Jev', 'Güven'], catisma.map((r) => [
  r.soru.replace(/\|/g, '\\|'), r.bizimCevap, r.jevCevap, r.jevCevapGuven.toFixed(2),
])));

c.push('\n**Düşük güvenli yanlışlar (≤ 0,8):**\n');
c.push(tablo(['Soru', 'Bizim cevabımız', 'Jev', 'Güven'],
  yanlislar.filter((r) => r.jevCevapGuven <= 0.8).map((r) => [
    r.soru.replace(/\|/g, '\\|'), r.bizimCevap, r.jevCevap, r.jevCevapGuven.toFixed(2),
  ])));

c.push('\n### F. Maliyet ve süre\n');
c.push(tablo(['Ölçüt', 'Değer'], [
  ['Model', ham.model],
  ['Toplam girdi jetonu', ham.toplamJeton],
  ['Toplam maliyet', '$' + ham.maliyetUsd.toFixed(5)],
  ['Ortalama çağrı süresi', ham.ortSureMs + ' ms'],
  ['Duvar saati (4 eşzamanlı)', (ham.duvarSaatiMs / 1000).toFixed(1) + ' sn'],
  ['Başarısız çağrı', ham.hatalar.length],
]));

c.push('\n### Örneklem id listesi\n');
c.push('Normal (80):\n```\n' + normal.map((r) => r.id).sort().join('\n') + '\n```\n');
c.push('Çapa (20):\n```\n' + capa.map((r) => r.id).sort().join('\n') + '\n```');

console.log(c.join('\n'));
