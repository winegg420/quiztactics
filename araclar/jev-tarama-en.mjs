// Jev İngilizce çeviri taraması — veritabanına YAZMA YOK, canlıya dokunmaz.
//
// jev-tarama.mjs'nin dar kapsamlı İngilizce eşi: İngilizce çevirisi olan
// (question_translations, dil='en', eskidi değil) AKTİF soruları Jev'e
// sorar — yalnız doğru şık + güven. Doğru cevap VERİLMEZ; şıklar
// karıştırılır. Çeviri şıkları TR ile aynı sıradadır (dogru_cevap indeksi
// ortak), bu yüzden doğru İngilizce şık aynı indeksten okunur.
//
// Kaldığı yerden devam eder: jev-tarama/ham-en.jsonl (git'e girmez).
// Bitince (ya da --ozet ile) ozet.csv'deki TR sonucuyla eşleştirip
// ozet-en.csv + ozet-en.md üretir.
//
// Kullanım:  node araclar/jev-tarama-en.mjs [--ozet] [--dene]

import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import { jevSor, choice, maliyetUsd } from './jev.mjs';

const KLASOR = new URL('./jev-tarama/', import.meta.url);
const HAM = new URL('./ham-en.jsonl', KLASOR);
const TR_CSV = new URL('./ozet.csv', KLASOR);
const CSV = new URL('./ozet-en.csv', KLASOR);
const MD = new URL('./ozet-en.md', KLASOR);
const TOHUM = 20260922;
const BUTCE_USD = 1.5;
const ESZAMANLI = 5;

function uretec(tohum) {
  let a = tohum >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function karistir(dizi, rnd) {
  const d = dizi.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** İngilizce çevirisi olan aktif TR soruları SALT OKUMA olarak çeker. */
async function sorulariGetir() {
  const dizgi = await baglantiDizgisi();
  if (!dizgi) throw new Error('Veritabanı bağlantısı yok (SUPABASE_DB_URL ya da .env.local).');
  const db = await new PgIstemci(dizgi).baglan();
  try {
    return await db.sorgu(
      `select q.id::text, t.soru, t.secenekler::text, q.dogru_cevap, q.kategori
         from public.questions q
         join public.question_translations t on t.question_id = q.id and t.dil = 'en'
        where q.dil='tr' and q.aktif and not t.eskidi
        order by q.id`,
    );
  } finally {
    await db.kapat();
  }
}

async function soruyuSor(s) {
  const secenekKriter = {};
  for (const secenek of s.karisik) secenekKriter[secenek] = null;
  const y = await jevSor({ question: s.soru, options: s.karisik }, {
    dogru_sik: choice(
      'Which option in `options` is the correct answer to this multiple-choice trivia question?',
      secenekKriter,
    ),
  });
  const a = y.answers.dogru_sik;
  return {
    id: s.id,
    soru: s.soru,
    kategori: s.kategori,
    bizimCevap: s.dogruMetin,
    jevCevap: a.choice,
    jevCevapGuven: a.confidence,
    girdiJetonu: y.usage?.input_tokens ?? 0,
    sureMs: y.sureMs,
  };
}

function hamOku() {
  if (!fs.existsSync(HAM)) return [];
  return fs.readFileSync(HAM, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

/** ozet.csv → id → {dogru, guven}. */
function trOku() {
  const m = new Map();
  if (!fs.existsSync(TR_CSV)) return m;
  for (const l of fs.readFileSync(TR_CSV, 'utf8').split('\n').slice(1).filter(Boolean)) {
    const [id, dogru, guven] = l.split(',');
    m.set(id, { dogru: dogru === '1', guven: Number(guven) });
  }
  return m;
}

function ozetUret(toplamHavuz, duvarMs) {
  const sonuc = hamOku();
  const tr = trOku();
  const satirlar = ['id,tr_dogru_mu,tr_guven,en_dogru_mu,en_guven,ceviri_supheli'];
  const supheli = [];
  const kategori = new Map();
  let enDogru = 0, esli = 0, esliTrDogru = 0, esliEnDogru = 0, jeton = 0, sure = 0;

  for (const r of sonuc) {
    const en = r.jevCevap === r.bizimCevap;
    const t = tr.get(r.id);
    const sup = !!(t?.dogru && !en && r.jevCevapGuven > 0.8);
    if (en) enDogru++;
    if (t) { esli++; if (t.dogru) esliTrDogru++; if (en) esliEnDogru++; }
    if (sup) { supheli.push(r); kategori.set(r.kategori, (kategori.get(r.kategori) || 0) + 1); }
    satirlar.push([r.id, t ? (t.dogru ? 1 : 0) : '', t ? t.guven.toFixed(3) : '', en ? 1 : 0,
      Number(r.jevCevapGuven).toFixed(3), sup ? 1 : 0].join(','));
    jeton += r.girdiJetonu || 0;
    sure += r.sureMs || 0;
  }
  fs.writeFileSync(CSV, satirlar.join('\n') + '\n', 'utf8');

  const yuzde = (a, b) => (b ? `%${((100 * a) / b).toFixed(1)}` : '—');
  const kisa = (t) => String(t).replace(/\s+/g, ' ').replace(/\|/g, '/').slice(0, 90);
  const md = [
    '# Jev İngilizce çeviri taraması — özet',
    '',
    `- Tarih: ${new Date().toISOString().slice(0, 10)}`,
    `- Taranan: ${sonuc.length}${toplamHavuz ? ` / ${toplamHavuz} EN çevirili aktif soru` : ''}`,
    `- Maliyet: $${maliyetUsd(jeton).toFixed(4)} (${jeton} girdi jetonu)`,
    `- Süre: ${duvarMs ? `bu tur duvar saati ${Math.round(duvarMs / 60000)} dk · ` : ''}toplam çağrı süresi ${Math.round(sure / 60000)} dk (eşzamanlı ${ESZAMANLI})`,
    '',
    '## Doğruluk',
    '',
    `- İngilizce genel: ${yuzde(enDogru, sonuc.length)} (${enDogru}/${sonuc.length})`,
    `- TR taramasıyla eşleşen ${esli} soruda: TR ${yuzde(esliTrDogru, esli)} · EN ${yuzde(esliEnDogru, esli)}`,
    '',
    `## Çeviri şüpheli (TR doğru, EN yanlış, EN güven > 0,8): **${supheli.length}**`,
    '',
    '| id | Jev (EN) | güven | soru (EN) |',
    '|---|---|---|---|',
    ...supheli.slice(0, 30).map((r) => `| ${r.id} | ${kisa(r.jevCevap)} | ${r.jevCevapGuven.toFixed(2)} | ${kisa(r.soru)} |`),
    '',
    '## Kategori bazında şüpheli',
    '',
    '| kategori | adet |',
    '|---|---|',
    ...[...kategori].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`),
    '',
  ];
  fs.writeFileSync(MD, md.join('\n'), 'utf8');
  console.log(`Özet yazıldı: ${sonuc.length} kayıt, ${supheli.length} şüpheli.`);
}

async function main() {
  fs.mkdirSync(KLASOR, { recursive: true });
  const satirlar = await sorulariGetir();
  if (process.argv.includes('--ozet')) return ozetUret(satirlar.length);

  const rnd = uretec(TOHUM);
  const hepsi = satirlar.map((satir) => {
    const secenekler = JSON.parse(satir.secenekler);
    return {
      id: satir.id,
      soru: satir.soru,
      kategori: satir.kategori,
      dogruMetin: secenekler[Number(satir.dogru_cevap)],
      karisik: karistir(secenekler, rnd),
    };
  });

  if (process.argv.includes('--dene')) {
    console.log(`Havuz: ${hepsi.length}`);
    const r = await soruyuSor(hepsi[0]);
    console.log(`dogru=${r.jevCevap === r.bizimCevap} guven=${r.jevCevapGuven} jeton=${r.girdiJetonu} ms=${r.sureMs}`);
    return;
  }

  const onceki = hamOku();
  const bitti = new Set(onceki.map((k) => k.id));
  let toplamJeton = onceki.reduce((t, k) => t + (k.girdiJetonu || 0), 0);
  const kuyruk = hepsi.filter((s) => !bitti.has(s.id));
  console.log(`Havuz: ${hepsi.length} · önceden: ${bitti.size} · kalan: ${kuyruk.length}`);

  let sira = 0, islenen = bitti.size, hata = 0, durdu = maliyetUsd(toplamJeton) > BUTCE_USD;
  async function isci() {
    while (sira < kuyruk.length && !durdu) {
      const s = kuyruk[sira++];
      try {
        const r = await soruyuSor(s);
        toplamJeton += r.girdiJetonu;
        fs.appendFileSync(HAM, JSON.stringify(r) + '\n', 'utf8');
        islenen++;
        if (maliyetUsd(toplamJeton + r.girdiJetonu) > BUTCE_USD) { // sonraki çağrı sınırı aşacaksa
          durdu = true;
          console.error(`DURDURULDU: bütçe sınırı (${BUTCE_USD} USD) aşıldı.`);
        }
        if (islenen % 50 === 0) console.log(`${islenen}/${hepsi.length} $${maliyetUsd(toplamJeton).toFixed(3)}`);
      } catch (e) {
        hata++;
        console.error(`hata ${s.id}: ${String(e.message || e).slice(0, 200)}`);
      }
    }
  }
  const basla = Date.now();
  await Promise.all(Array.from({ length: ESZAMANLI }, isci));
  console.log(`Bitti: ${islenen}/${hepsi.length}, bu turda hata ${hata}, $${maliyetUsd(toplamJeton).toFixed(4)}`);
  ozetUret(hepsi.length, Date.now() - basla);
}

main().catch((e) => {
  console.error('HATA:', e.message);
  process.exit(1);
});
