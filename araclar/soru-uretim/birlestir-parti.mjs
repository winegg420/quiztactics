// Paket 3 — bir partinin taslaklarını + Jev kapısı sonuçlarını birleştirip son listeyi üretir.
// araclar/soru-parti-1000/birlestir.mjs'in parametreli karşılığıdır (o dosya DEĞİŞTİRİLMEZ;
// Jev okuma yardımcıları oradan import edilir).
//
// Farklar (Paket 3 kararları, araclar/soru-uretim/OKU.md):
//   - Kota partiye göre: durum.json › hedef − sayac, kalan parti sayısına bölünür
//     (küsurat en büyük olana; eşitlikte hedef listesindeki sıra). --kota ile elle verilebilir.
//   - Zorluk etiketi YAZARIN etiketidir (z); Jev puanı yalnız açık çelişkide düzeltir:
//       a) |z − jevSeviye| ≥ 2  → etiket Jev'e doğru 1 adım kayar
//       b) z = 4, Jev yanlış şık seçti ve jevSeviye = 5 → 5
//     (jevSeviye = Jev puanı + zorluk-esikler.json, havuz taramasıyla aynı ölçek)
//   - Seçim: kova kotaları TAM tutulur; kova içinde zorluk dağılımı hedefe en yakın olacak
//     şekilde takas yapılır (hedef: --zorluk ya da durum.json'dan hesap).
//
// Eleme: Jev bizim cevabımızdan FARKLI şıkkı >0,9 güvenle seçtiyse 'jev_itiraz';
// kararlar.json {anahtar|soru: {karar:'ele'|'tut'|'en_yok', sebep|neden}}.
//
// Kullanım:
//   node araclar/soru-uretim/birlestir-parti.mjs --taslak <klasor> --jev <jev.jsonl> --parti 1
//        [--kararlar <json>] [--kota '{"sinema":33,...}'] [--zorluk '{"1-2":38,"3":75,"4":87,"5":50}'] [--rapor]
//   --rapor: dosya yazmaz, yalnız dağılımı basar.
import fs from 'node:fs';
import { sonuclariOku, taslaklariOku, icerikAnahtari } from '../soru-parti-1000/jev-kapi.mjs';
import { seviye } from '../soru-parti-1000/zorluk.mjs';
import { maliyetUsd } from '../jev.mjs';

const ITIRAZ_GUVEN = 0.9;
const arg = (ad) => { const i = process.argv.indexOf(ad); return i > 0 ? process.argv[i + 1] : null; };
const taslakKlasor = arg('--taslak');
const jevYol = arg('--jev');
const parti = Number(arg('--parti'));
const rapor = process.argv.includes('--rapor');
if (!taslakKlasor || !jevYol || !Number.isInteger(parti) || parti < 1) {
  console.error('Kullanım: birlestir-parti.mjs --taslak <klasor> --jev <jev.jsonl> --parti N [--kararlar f] [--kota j] [--zorluk j] [--rapor]');
  process.exit(1);
}

const durum = JSON.parse(fs.readFileSync(new URL('./durum.json', import.meta.url), 'utf8'));
const esikDosya = JSON.parse(fs.readFileSync(new URL('../soru-parti-1000/zorluk-esikler.json', import.meta.url), 'utf8'));
const esikler = [2, 3, 4, 5].map((s) => esikDosya.esikler[s]);
const kararYol = arg('--kararlar');
const kararlar = kararYol && fs.existsSync(kararYol) ? JSON.parse(fs.readFileSync(kararYol, 'utf8')) : {};

/** Kalan hedefi kalan parti sayısına böler; küsurat en büyük olana, eşitlikte liste sırası. */
function payBol(hedef, sayac, adet) {
  const kalanParti = Math.max(1, Math.round((durum.hedef.toplam - durum.sayac.soru) / durum.hedef.parti_boyu));
  const satir = Object.keys(hedef).map((k, sira) => {
    const kalan = Math.max(0, hedef[k] - (sayac[k] || 0));
    const pay = kalan / kalanParti;
    return { k, sira, taban: Math.floor(pay), kusur: pay - Math.floor(pay) };
  });
  let artan = adet - satir.reduce((t, x) => t + x.taban, 0);
  for (const x of satir.slice().sort((a, b) => b.kusur - a.kusur || a.sira - b.sira)) {
    if (artan <= 0) break;
    x.taban++;
    artan--;
  }
  return Object.fromEntries(satir.map((x) => [x.k, x.taban]));
}

const boy = durum.hedef.parti_boyu;
const kotaHam = arg('--kota') ? JSON.parse(arg('--kota')) : payBol(durum.hedef.kategori, durum.sayac.kategori, boy);
const KOTA = Object.fromEntries(Object.entries(kotaHam).map(([k, v]) => [k === 'yerel_tr' ? 'yerel' : k, v]));
const ZHEDEF = arg('--zorluk') ? JSON.parse(arg('--zorluk')) : payBol(durum.hedef.zorluk, durum.sayac.zorluk, boy);
const zKova = (z) => (z <= 2 ? '1-2' : String(z));

const jev = sonuclariOku(jevYol);
const taslaklar = taslaklariOku(taslakKlasor);
const elenen = [];
const duzeltme = [];
const kovalar = {};
let eksikJev = 0;
for (const t of taslaklar) {
  const anahtar = icerikAnahtari(t);
  const j = jev.get(anahtar);
  if (!j) { eksikJev++; continue; }
  const kova = t.yerel ? 'yerel' : t.k;
  const karar = kararlar[anahtar] || kararlar[t.s];
  if (j.jevCevap !== t.d && j.jevGuven > ITIRAZ_GUVEN && karar?.karar !== 'tut') {
    elenen.push({ sebep: 'jev_itiraz', kova, s: t.s, d: t.d, jev: j.jevCevap, guven: j.jevGuven });
    continue;
  }
  if (karar?.karar === 'ele') {
    elenen.push({ sebep: karar.sebep || 'elle', kova, s: t.s, d: t.d, not: karar.not });
    continue;
  }
  const js = seviye(j.jevZorluk, esikler);
  let z = t.z;
  let neden = null;
  if (Math.abs(z - js) >= 2) { z += Math.sign(js - z); neden = `yazar ${t.z}, Jev seviye ${js} (puan ${j.jevZorluk.toFixed(2)})`; }
  else if (z === 4 && js === 5 && j.jevCevap !== t.d) { z = 5; neden = `yazar 4, Jev yanlış şık (${j.jevCevap}, ${j.jevGuven.toFixed(2)}) ve seviye 5`; }
  if (neden) duzeltme.push({ s: t.s, d: t.d, eski: t.z, yeni: z, neden });
  const enYok = karar?.karar === 'en_yok' || !t.en;
  const kayit = {
    k: t.k, yerel: !!t.yerel, s: t.s, d: t.d, y: t.y, zorluk: z,
    en: enYok ? null : t.en,
    ...(enYok ? { en_neden: karar?.neden || t.en_neden } : {}),
  };
  const oncelik = (j.jevKategori === t.k ? 0 : 1) + Math.max(...j.digerDogru) + (j.eskiyebilir > 0.5 ? 1 : 0);
  (kovalar[kova] ??= []).push({ kayit, oncelik, anahtar });
}
if (eksikJev) {
  console.error(`${eksikJev} taslağın Jev sonucu yok — önce jev-kapi.mjs çalıştır.`);
  process.exit(1);
}

// Seçim: her kova önceliğe göre sıralanır, ilk 'kota' kadarı seçilir; sonra kova içi takasla
// zorluk dağılımı hedefe yaklaştırılır (sapma = Σ|sayı − hedef|).
const secili = {};
const yedek = {};
const eksik = {};
for (const [kova, hedef] of Object.entries(KOTA)) {
  const liste = (kovalar[kova] ?? []).sort((a, b) => a.oncelik - b.oncelik || a.anahtar.localeCompare(b.anahtar));
  secili[kova] = liste.slice(0, hedef);
  yedek[kova] = liste.slice(hedef);
  if (liste.length < hedef) eksik[kova] = hedef - liste.length;
}
const sayZ = () => {
  const m = { '1-2': 0, 3: 0, 4: 0, 5: 0 };
  for (const l of Object.values(secili)) for (const x of l) m[zKova(x.kayit.zorluk)]++;
  return m;
};
const sapma = (m) => Object.keys(ZHEDEF).reduce((t, k) => t + Math.abs((m[k] || 0) - ZHEDEF[k]), 0);
for (let tur = 0; tur < 1000; tur++) {
  const m = sayZ();
  const s0 = sapma(m);
  let enIyi = null;
  for (const kova of Object.keys(secili)) {
    for (let i = 0; i < secili[kova].length; i++) {
      for (let j = 0; j < yedek[kova].length; j++) {
        const a = zKova(secili[kova][i].kayit.zorluk);
        const b = zKova(yedek[kova][j].kayit.zorluk);
        if (a === b) continue;
        const m2 = { ...m, [a]: m[a] - 1, [b]: m[b] + 1 };
        const kazanc = s0 - sapma(m2);
        const ceza = yedek[kova][j].oncelik - secili[kova][i].oncelik;
        if (kazanc > 0 && (!enIyi || kazanc > enIyi.kazanc || (kazanc === enIyi.kazanc && ceza < enIyi.ceza))) enIyi = { kova, i, j, kazanc, ceza };
      }
    }
  }
  if (!enIyi) break;
  const { kova, i, j } = enIyi;
  [secili[kova][i], yedek[kova][j]] = [yedek[kova][j], secili[kova][i]];
}

const son = Object.values(secili).flat().map((x) => x.kayit);
for (const [kova, l] of Object.entries(yedek)) for (const x of l) elenen.push({ sebep: 'kota_fazlasi', kova, s: x.kayit.s, zorluk: x.kayit.zorluk });
const secilenSorular = new Set(son.map((x) => x.s));
const sayim = (dizi, f) => dizi.reduce((m, x) => ((m[f(x)] = (m[f(x)] || 0) + 1), m), {});
const tumJev = [...jev.values()];
const jeton = tumJev.reduce((t, r) => t + (r.jeton || 0), 0);
const ozet = {
  parti,
  tarih: new Date().toISOString().slice(0, 10),
  taslak: taslaklar.length,
  net: son.length,
  kota: KOTA,
  zorluk_hedef: ZHEDEF,
  eksik,
  elenen_sebep: sayim(elenen, (x) => x.sebep),
  kova: sayim(son, (x) => (x.yerel ? 'yerel_tr' : x.k)),
  kategori: sayim(son, (x) => x.k),
  zorluk: [1, 2, 3, 4, 5].map((z) => son.filter((x) => x.zorluk === z).length),
  zorluk_kova: sayZ(),
  cevrilmeyen: son.filter((x) => !x.en).length,
  jev: {
    cagri: tumJev.reduce((t, r) => t + (r.cagri || 0), 0),
    girdi_jetonu: jeton,
    usd: +maliyetUsd(jeton).toFixed(4),
    not: 'jev.jsonl içindeki tüm denemeler dahil (düzeltilip yeniden sorulanlar da)',
  },
  zorluk_etiket_duzeltme: duzeltme.filter((x) => secilenSorular.has(x.s)),
  elenenler: elenen.filter((x) => x.sebep !== 'kota_fazlasi'),
};
if (rapor) {
  console.log(JSON.stringify({ ...ozet, zorluk_etiket_duzeltme: ozet.zorluk_etiket_duzeltme.length, elenenler: ozet.elenenler }, null, 2));
  process.exit(0);
}
const klasor = new URL(`./parti-${String(parti).padStart(2, '0')}/`, import.meta.url);
fs.mkdirSync(klasor, { recursive: true });
fs.writeFileSync(new URL('sorular.json', klasor), JSON.stringify(son, null, 1) + '\n');
fs.writeFileSync(new URL('ozet.json', klasor), JSON.stringify(ozet, null, 2) + '\n');
console.log(JSON.stringify({ ...ozet, zorluk_etiket_duzeltme: ozet.zorluk_etiket_duzeltme.length, elenenler: ozet.elenenler.length }, null, 2));
