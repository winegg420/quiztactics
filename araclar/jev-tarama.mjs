// Jev tam havuz taraması — veritabanına YAZMA YOK, canlıya dokunmaz.
//
// jev-test.mjs'nin tam havuz sürümü: tüm AKTİF TR soruları Jev'e tek
// çağrıda sorar — doğru şık · kategori · zorluk · eskiyebilir mi · her
// şık için "bu da doğru sayılabilir mi" · hassas içerik mi. Doğru cevap
// ve kategori Jev'e VERİLMEZ; şıklar her soruda karıştırılır.
//
// Kaldığı yerden devam eder: her sonuç anında jev-tarama/ham.jsonl'a
// eklenir (git'e girmez); yeniden başlatınca oradaki id'ler atlanır.
// Bitince (ya da --ozet ile) ozet.csv + ozet.md üretir.
//
// Kullanım:  node araclar/jev-tarama.mjs [--ozet] [--dene]

import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import { jevSor, choice, score, noul, maliyetUsd } from './jev.mjs';

const KLASOR = new URL('./jev-tarama/', import.meta.url);
const HAM = new URL('./ham.jsonl', KLASOR);
const CSV = new URL('./ozet.csv', KLASOR);
const MD = new URL('./ozet.md', KLASOR);
const TOHUM = 20260922;
const BUTCE_USD = 2.0;
const ESZAMANLI = 5;

// jev-test.mjs ile aynı liste ve ölçek.
const KATEGORILER = {
  genel_kultur: 'Genel kültür: gündelik bilgi, kurumlar, semboller, karışık konular',
  bilim: 'Bilim: fizik, kimya, biyoloji, matematik, astronomi, tıp',
  tarih: 'Tarih: dönemler, savaşlar, devletler, tarihî kişiler',
  cografya: 'Coğrafya: ülkeler, başkentler, dağlar, nehirler, iklim',
  edebiyat: 'Edebiyat: yazarlar, şairler, romanlar, şiirler, akımlar',
  spor: 'Spor: futbol, olimpiyatlar, sporcular, kurallar, takımlar',
  sanat: 'Sanat: resim, heykel, mimari, ressamlar, akımlar',
  sinema: 'Sinema: filmler, yönetmenler, oyuncular, ödüller',
  muzik: 'Müzik: besteciler, şarkıcılar, çalgılar, türler, albümler',
  teknoloji: 'Teknoloji: bilgisayar, yazılım, internet, mühendislik, şirketler',
};

const ZORLUK_OLCEGI = [
  'Çok kolay: ilkokul seviyesi, neredeyse herkesin bildiği bilgi',
  'Kolay: ortaokul seviyesi, ortalama bir yetişkinin bildiği bilgi',
  'Orta: genel kültürü iyi olan birinin bilebileceği bilgi',
  'Zor: konuyla özel olarak ilgilenenlerin bildiği bilgi',
  'Çok zor: uzmanlık gerektiren, çoğu kişinin bilemeyeceği bilgi',
];

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

/** Tüm aktif TR soruları SALT OKUMA olarak çeker. */
async function sorulariGetir() {
  const dizgi = await baglantiDizgisi();
  if (!dizgi) throw new Error('Veritabanı bağlantısı yok (SUPABASE_DB_URL ya da .env.local).');
  const db = await new PgIstemci(dizgi).baglan();
  try {
    return await db.sorgu(
      `select id::text, soru, secenekler::text, dogru_cevap, kategori
         from public.questions
        where dil='tr' and aktif
        order by id`,
    );
  } finally {
    await db.kapat();
  }
}

/** noul cevabı bir olasılıktır (0–1): {type:'noul', noul:0.87}. */
const olasilik = (c) => Number(c?.noul ?? 0);
const evetMi = (p) => p > 0.5;

async function soruyuSor(s) {
  const secenekKriter = {};
  for (const secenek of s.karisik) secenekKriter[secenek] = null;

  const sorular = {
    dogru_sik: choice(
      'Bu çoktan seçmeli bilgi yarışması sorusunun doğru cevabı `siklar` içindeki hangi seçenektir?',
      secenekKriter,
    ),
    kategori: choice('Bu soru hangi bilgi alanına girer?', KATEGORILER),
    zorluk: score(
      'Ortalama bir yetişkin için bu sorunun doğru cevabını bilmek ne kadar zordur?',
      ZORLUK_OLCEGI,
    ),
    eskiyebilir: noul('Bu sorunun doğru cevabı zamanla değişebilir mi (rekor, güncel unvan, nüfus, sıralama, görevdeki kişi gibi)?'),
    hassas: noul('Bu soru siyaset, din ya da toplumda tartışmalı bir konu içeriyor mu?'),
  };
  s.karisik.forEach((secenek, i) => {
    sorular[`sik_${i}`] = noul(`Soruya "${secenek}" cevabı verilirse bu da doğru sayılabilir mi?`);
  });

  const y = await jevSor({ soru: s.soru, siklar: s.karisik }, sorular);
  const a = y.answers;
  return {
    id: s.id,
    soru: s.soru,
    bizimKategori: s.kategori,
    bizimCevap: s.dogruMetin,
    siklar: s.karisik,
    jevCevap: a.dogru_sik.choice,
    jevCevapGuven: a.dogru_sik.confidence,
    jevKategori: a.kategori.choice,
    jevZorluk: a.zorluk.score + 1, // 0 tabanlı sürekli puan → 1–5
    eskiyebilir: olasilik(a.eskiyebilir),
    hassas: olasilik(a.hassas),
    siklarDogru: s.karisik.map((_, i) => olasilik(a[`sik_${i}`])),
    girdiJetonu: y.usage?.input_tokens ?? 0,
    sureMs: y.sureMs,
  };
}

function hamOku() {
  if (!fs.existsSync(HAM)) return [];
  return fs.readFileSync(HAM, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

const csvAlan = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

function ozetUret(toplamHavuz, duvarMs) {
  const sonuc = hamOku();
  const satirlar = ['id,bizim_dogru_mu,jev_guven,bizim_kategori,jev_kategori,zorluk,eskiyebilir,coklu_dogru,hassas'];
  const itiraz = [];
  const zorluk = [0, 0, 0, 0, 0];
  const uyusmazlik = new Map();
  let eski = 0, coklu = 0, hassas = 0, jeton = 0, sure = 0;

  for (const r of sonuc) {
    const bizimDogru = r.jevCevap === r.bizimCevap;
    // Bizim doğru dışında "doğru sayılabilir" denen şık sayısı.
    const cokluSay = r.siklar.filter((sk, i) => sk !== r.bizimCevap && evetMi(r.siklarDogru[i])).length;
    satirlar.push([r.id, bizimDogru ? 1 : 0, Number(r.jevCevapGuven).toFixed(3), r.bizimKategori, r.jevKategori,
      Number(r.jevZorluk).toFixed(2), evetMi(r.eskiyebilir) ? 1 : 0, cokluSay, evetMi(r.hassas) ? 1 : 0].map(csvAlan).join(','));
    if (!bizimDogru && r.jevCevapGuven > 0.8) itiraz.push(r);
    zorluk[Math.min(4, Math.max(0, Math.round(r.jevZorluk) - 1))]++;
    if (r.bizimKategori !== r.jevKategori) {
      const k = `${r.bizimKategori} → ${r.jevKategori}`;
      uyusmazlik.set(k, (uyusmazlik.get(k) || 0) + 1);
    }
    if (evetMi(r.eskiyebilir)) eski++;
    if (cokluSay > 0) coklu++;
    if (evetMi(r.hassas)) hassas++;
    jeton += r.girdiJetonu || 0;
    sure += r.sureMs || 0;
  }
  fs.writeFileSync(CSV, satirlar.join('\n') + '\n', 'utf8');

  const kisa = (t) => String(t).replace(/\s+/g, ' ').replace(/\|/g, '/').slice(0, 90);
  const md = [
    '# Jev tam havuz taraması — özet',
    '',
    `- Tarih: ${new Date().toISOString().slice(0, 10)}`,
    `- İşlenen: ${sonuc.length}${toplamHavuz ? ` / ${toplamHavuz} aktif TR soru` : ''}`,
    `- Maliyet: $${maliyetUsd(jeton).toFixed(4)} (${jeton} girdi jetonu)`,
    `- Süre: ${duvarMs ? `bu tur duvar saati ${Math.round(duvarMs / 60000)} dk · ` : ''}toplam çağrı süresi ${Math.round(sure / 60000)} dk (eşzamanlı ${ESZAMANLI})`,
    '',
    `## Jev'in >0,8 güvenle itiraz ettiği: **${itiraz.length}**`,
    '',
    '| id | bizim | Jev | güven | soru |',
    '|---|---|---|---|---|',
    ...itiraz.slice(0, 30).map((r) => `| ${r.id} | ${kisa(r.bizimCevap)} | ${kisa(r.jevCevap)} | ${r.jevCevapGuven.toFixed(2)} | ${kisa(r.soru)} |`),
    '',
    '## Zorluk dağılımı (Jev, en yakın tam sayıya yuvarlanmış)',
    '',
    '| 1 | 2 | 3 | 4 | 5 |',
    '|---|---|---|---|---|',
    `| ${zorluk.join(' | ')} |`,
    '',
    '## Kategori uyuşmazlığı (bizim → Jev)',
    '',
    '| geçiş | adet |',
    '|---|---|',
    ...[...uyusmazlik].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`),
    '',
    '## Bayraklar (Jev olasılığı > 0,5)',
    '',
    `- Eskiyebilir: ${eski}`,
    `- Çoklu doğru (≥1 başka şık da doğru sayılabilir): ${coklu}`,
    `- Hassas (siyaset/din/tartışmalı): ${hassas}`,
    '',
  ];
  fs.writeFileSync(MD, md.join('\n'), 'utf8');
  console.log(`Özet yazıldı: ${sonuc.length} kayıt, ${itiraz.length} itiraz.`);
}

async function main() {
  fs.mkdirSync(KLASOR, { recursive: true });
  const satirlar = await sorulariGetir();
  if (process.argv.includes('--ozet')) return ozetUret(satirlar.length);

  const rnd = uretec(TOHUM);
  // Karıştırma tüm havuz üzerinden id sırasıyla yapılır → devamda aynı kalır.
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
    console.log(JSON.stringify(await soruyuSor(hepsi[0])));
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
