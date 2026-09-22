// Soru taslağı ön denetimi — veritabanına dokunmaz.
//
// Kullanım:
//   node araclar/soru-parti-1000/denetle.mjs <taslak-klasoru> --mevcut <tum.json> [--dosya ad.json] [--sessiz]
//
// Taslak biçimi (her dosya bir DİZİ):
//   { "k": "sinema", "yerel": false, "s": "Soru?", "d": "Doğru", "y": ["Y1","Y2","Y3"], "z": 4,
//     "en": { "s": "Question?", "d": "Right", "y": ["W1","W2","W3"] } | null,
//     "en_neden": "çevrilmeme sebebi (en null ise zorunlu)", "benzerOk": true? }
// --mevcut: [{soru, dogru, k}] dizisi (canlı havuzun salt-okuma dökümü).
//
// Kontroller: biçim · 4 farklı şık · şık denge kuralları (kural.mjs, TR ve EN) ·
// soru işareti · cevabı ele veren parantez · parti içi ve havuzla birebir tekrar ·
// havuzla anlamca benzerlik (kök-kelime Jaccard) · EN'de TR soru metni kalmış mı.
import fs from 'node:fs';
import path from 'node:path';
import { kuralIsaretleri, agirIsaretler, normalize, kelimeler } from './kural.mjs';

export const KATEGORILER = ['sinema', 'teknoloji', 'muzik', 'sanat', 'spor', 'edebiyat', 'bilim', 'tarih', 'genel_kultur'];

const DURAK = new Set(('ve ile bir bu şu o hangi hangisi hangisidir nedir kimdir kim ne kaç kaçta nerede neresi ' +
  'hangi yılda yılında için olarak olan olan adı adıyla adlı ilk en de da mi mı mu mü ' +
  'tarafından yapılmıştır yazmıştır yazarı yönetmeni filmi eseri eserin eseridir ' +
  'the of a an in on at to is was which who what what\'s by for').split(' '));

/** Anlamca benzerlik için kök-kelime kümesi: durak kelimeler atılır, kelimenin ilk 5 harfi alınır. */
export function kokler(metin) {
  return new Set(kelimeler(metin).split(' ').filter((w) => w.length >= 3 && !DURAK.has(w)).map((w) => w.slice(0, 5)));
}
export function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let k = 0;
  for (const x of a) if (b.has(x)) k++;
  return k / (a.size + b.size - k);
}

/** Tek taslak kaydı için hata ve uyarı listesi. */
export function kayitDenetle(t) {
  const hata = [];
  const uyari = [];
  if (!KATEGORILER.includes(t.k)) hata.push(`kategori geçersiz: ${t.k}`);
  if (typeof t.s !== 'string' || t.s.trim().length < 10) hata.push('soru metni yok/kısa');
  if (typeof t.d !== 'string' || !t.d.trim()) hata.push('doğru şık yok');
  if (!Array.isArray(t.y) || t.y.length !== 3 || t.y.some((x) => typeof x !== 'string' || !x.trim())) hata.push('3 yanlış şık gerekli');
  if (!(Number.isInteger(t.z) && t.z >= 1 && t.z <= 5)) hata.push('z (yazar zorluğu) 1-5 tam sayı olmalı');
  if (hata.length) return { hata, uyari };

  const tr = [t.d, ...t.y];
  if (!/\?\s*$/.test(t.s)) uyari.push('soru "?" ile bitmiyor');
  if (t.s.length > 160) uyari.push(`soru uzun (${t.s.length})`);
  if (tr.some((x) => x.length > 45)) uyari.push('45 karakteri aşan şık');
  const agirTr = agirIsaretler(kuralIsaretleri(t.s, tr, 0));
  if (agirTr.length) hata.push(`TR kural: ${agirTr.join(',')}`);
  if (kuralIsaretleri(t.s, tr, 0).includes('sayisal_uc')) uyari.push('TR sayisal_uc (doğru sayı uçta)');

  if (t.en === null || t.en === undefined) {
    if (!t.en_neden) hata.push('en yok ama en_neden yazılmamış');
  } else {
    const e = t.en;
    if (typeof e.s !== 'string' || typeof e.d !== 'string' || !Array.isArray(e.y) || e.y.length !== 3) {
      hata.push('en biçimi bozuk');
    } else {
      const en = [e.d, ...e.y];
      if (new Set(en.map((x) => x.trim().toLowerCase())).size < 4) hata.push('EN şıklar aynı');
      const agirEn = agirIsaretler(kuralIsaretleri(e.s, en, 0));
      if (agirEn.length) uyari.push(`EN kural: ${agirEn.join(',')}`);
      if (/[çğışöüÇĞİŞÖÜ]/.test(e.s + en.join(''))) uyari.push('EN metinde Türkçe harf (özel isim değilse düzelt)');
      if (/\([^)]*\)/.test(e.s) && !/\([^)]*\)/.test(t.s)) uyari.push('EN soruda TR\'de olmayan parantez (cevabı ele veriyor mu?)');
      if (!/\?\s*$/.test(e.s)) uyari.push('EN soru "?" ile bitmiyor');
    }
  }
  return { hata, uyari };
}

function argDeger(ad) {
  const i = process.argv.indexOf(ad);
  return i > 0 ? process.argv[i + 1] : null;
}

async function main() {
  const klasor = process.argv[2];
  if (!klasor || !fs.existsSync(klasor)) throw new Error('Kullanım: denetle.mjs <taslak-klasoru> --mevcut <tum.json>');
  const mevcutYol = argDeger('--mevcut');
  const tekDosya = argDeger('--dosya');
  const sessiz = process.argv.includes('--sessiz');

  const mevcut = mevcutYol ? JSON.parse(fs.readFileSync(mevcutYol, 'utf8')) : [];
  const mevcutNorm = new Map(mevcut.map((m) => [normalize(m.soru), m]));
  const mevcutKok = mevcut.map((m) => ({ ...m, kok: kokler(m.soru), dn: normalize(m.dogru) }));

  const dosyalar = fs.readdirSync(klasor).filter((f) => f.endsWith('.json')).sort();
  const hepsi = [];
  for (const f of dosyalar) {
    let dizi;
    try {
      dizi = JSON.parse(fs.readFileSync(path.join(klasor, f), 'utf8'));
    } catch (e) {
      console.log(`${f}: JSON OKUNAMADI — ${e.message}`);
      process.exitCode = 1;
      continue;
    }
    dizi.forEach((t, i) => hepsi.push({ ...t, _dosya: f, _i: i }));
  }

  const partiNorm = new Map();
  let hataSay = 0, uyariSay = 0;
  const sayim = {};
  for (const t of hepsi) {
    const { hata, uyari } = kayitDenetle(t);
    const n = normalize(t.s);
    if (mevcutNorm.has(n)) hata.push('havuzda BİREBİR var');
    if (partiNorm.has(n)) hata.push(`partide tekrar (${partiNorm.get(n)})`);
    partiNorm.set(n, `${t._dosya}#${t._i}`);

    if (!t.benzerOk && hata.length === 0) {
      const kok = kokler(t.s);
      const dn = normalize(t.d);
      let enIyi = null;
      for (const m of mevcutKok) {
        const j = jaccard(kok, m.kok);
        const esik = m.dn === dn ? 0.34 : 0.6;
        if (j >= esik && (!enIyi || j > enIyi.j)) enIyi = { j, m };
      }
      if (enIyi) uyari.push(`havuzda BENZER (${enIyi.j.toFixed(2)}): "${enIyi.m.soru}" => ${enIyi.m.dogru}`);
    }

    if (!tekDosya || t._dosya === tekDosya) {
      if (hata.length || (!sessiz && uyari.length)) {
        console.log(`${t._dosya}#${t._i} ${t.s}`);
        for (const h of hata) console.log(`   HATA  ${h}`);
        if (!sessiz) for (const u of uyari) console.log(`   uyarı ${u}`);
      }
    }
    hataSay += hata.length ? 1 : 0;
    uyariSay += uyari.length ? 1 : 0;
    const anahtar = t.yerel ? `${t.k}(yerel)` : t.k;
    sayim[anahtar] ??= { adet: 0, zor: 0 };
    sayim[anahtar].adet++;
    if (t.z >= 4) sayim[anahtar].zor++;
  }
  console.log(`\nToplam ${hepsi.length} taslak · hatalı ${hataSay} · uyarılı ${uyariSay}`);
  for (const [k, v] of Object.entries(sayim).sort()) console.log(`  ${k}: ${v.adet} (z>=4: ${v.zor}, %${Math.round((100 * v.zor) / v.adet)})`);
  if (hataSay) process.exitCode = 1;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('denetle.mjs')) {
  main().catch((e) => {
    console.error('HATA:', e.message);
    process.exit(1);
  });
}
