// Jev kalite kapısı — yeni soru taslakları için. Veritabanına dokunmaz.
//
// Her taslak Jev'e doğru cevap VERİLMEDEN, şıklar karıştırılarak sorulur (jev-tarama.mjs
// ile aynı soru kalıbı ve zorluk ölçeği → puanlar havuz taramasıyla karşılaştırılabilir):
//   TR: doğru şık · kategori · zorluk (1–5) · eskiyebilir · hassas · her şık "bu da doğru mu"
//   EN: doğru şık · İngilizce oyuncu için anlamlı mı · soru metni cevabı ele veriyor mu
// Sonuçlar <cikti.jsonl>'a anında eklenir; aynı içerik (soru+şıklar+çeviri) tekrar sorulmaz,
// değişen taslak yeniden sorulur.
//
// Kullanım: node araclar/soru-parti-1000/jev-kapi.mjs <taslak-klasoru> <cikti.jsonl> [--butce 1.5]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { jevSor, choice, score, noul, maliyetUsd } from '../jev.mjs';

const ESZAMANLI = 5;

// jev-tarama.mjs ile aynı liste ve ölçek (karşılaştırılabilirlik için DEĞİŞTİRME).
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

export function icerikAnahtari(t) {
  return crypto.createHash('sha1').update(JSON.stringify([t.s, t.d, t.y, t.en ?? null])).digest('hex').slice(0, 16);
}

function karistir(dizi, tohum) {
  let a = parseInt(tohum.slice(0, 8), 16) >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const d = dizi.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

const olasilik = (c) => Number(c?.noul ?? 0);

async function trSor(t, anahtar) {
  const karisik = karistir([t.d, ...t.y], anahtar);
  const kriter = Object.fromEntries(karisik.map((s) => [s, null]));
  const sorular = {
    dogru_sik: choice('Bu çoktan seçmeli bilgi yarışması sorusunun doğru cevabı `siklar` içindeki hangi seçenektir?', kriter),
    kategori: choice('Bu soru hangi bilgi alanına girer?', KATEGORILER),
    zorluk: score('Ortalama bir yetişkin için bu sorunun doğru cevabını bilmek ne kadar zordur?', ZORLUK_OLCEGI),
    eskiyebilir: noul('Bu sorunun doğru cevabı zamanla değişebilir mi (rekor, güncel unvan, nüfus, sıralama, görevdeki kişi gibi)?'),
    hassas: noul('Bu soru siyaset, din ya da toplumda tartışmalı bir konu içeriyor mu?'),
  };
  karisik.forEach((s, i) => { sorular[`sik_${i}`] = noul(`Soruya "${s}" cevabı verilirse bu da doğru sayılabilir mi?`); });
  const y = await jevSor({ soru: t.s, siklar: karisik }, sorular);
  const a = y.answers;
  return {
    jevCevap: a.dogru_sik.choice,
    jevGuven: a.dogru_sik.confidence,
    jevKategori: a.kategori.choice,
    jevZorluk: a.zorluk.score + 1,
    eskiyebilir: olasilik(a.eskiyebilir),
    hassas: olasilik(a.hassas),
    // yalnız doğru dışındaki şıkların "bu da doğru" olasılıkları, taslaktaki y sırasıyla
    digerDogru: t.y.map((s) => olasilik(a[`sik_${karisik.indexOf(s)}`])),
    jeton: y.usage?.input_tokens ?? 0,
  };
}

async function enSor(t, anahtar) {
  const e = t.en;
  const karisik = karistir([e.d, ...e.y], anahtar + 'en');
  const kriter = Object.fromEntries(karisik.map((s) => [s, null]));
  const y = await jevSor({ question: e.s, options: karisik }, {
    dogru_sik: choice('Which option in `options` is the correct answer to this multiple-choice trivia question?', kriter),
    anlamli: noul('Is this trivia question clear, natural and answerable for an English-speaking player (it does not depend on knowing the Turkish language or on a Turkish word play)?'),
    ele_veriyor: noul('Does the wording of `question` itself reveal or strongly hint at the correct option (for example via a parenthetical translation or explanation)?'),
  });
  const a = y.answers;
  return {
    enJevCevap: a.dogru_sik.choice,
    enJevGuven: a.dogru_sik.confidence,
    enAnlamli: olasilik(a.anlamli),
    enEleVeriyor: olasilik(a.ele_veriyor),
    jeton: y.usage?.input_tokens ?? 0,
  };
}

export function sonuclariOku(dosya) {
  if (!fs.existsSync(dosya)) return new Map();
  const m = new Map();
  for (const l of fs.readFileSync(dosya, 'utf8').split('\n')) if (l.trim()) { const r = JSON.parse(l); m.set(r.anahtar, r); }
  return m;
}

export function taslaklariOku(klasor) {
  const hepsi = [];
  for (const f of fs.readdirSync(klasor).filter((x) => x.endsWith('.json')).sort()) {
    JSON.parse(fs.readFileSync(path.join(klasor, f), 'utf8')).forEach((t, i) => hepsi.push({ ...t, _dosya: f, _i: i }));
  }
  return hepsi;
}

async function main() {
  const [klasor, cikti] = process.argv.slice(2);
  if (!klasor || !cikti) throw new Error('Kullanım: jev-kapi.mjs <taslak-klasoru> <cikti.jsonl> [--butce 1.5]');
  const bi = process.argv.indexOf('--butce');
  const butce = bi > 0 ? Number(process.argv[bi + 1]) : 1.5;
  const onceki = sonuclariOku(cikti);
  let toplamJeton = [...onceki.values()].reduce((t, r) => t + (r.jeton || 0), 0);
  let cagri = [...onceki.values()].reduce((t, r) => t + (r.cagri || 0), 0);
  const kuyruk = taslaklariOku(klasor).map((t) => ({ t, anahtar: icerikAnahtari(t) })).filter((x) => !onceki.has(x.anahtar));
  console.log(`Taslak kuyruğu: ${kuyruk.length} · önceki sonuç: ${onceki.size} · harcanan $${maliyetUsd(toplamJeton).toFixed(4)}`);

  let sira = 0, hata = 0, durdu = false;
  async function isci() {
    while (sira < kuyruk.length && !durdu) {
      const { t, anahtar } = kuyruk[sira++];
      try {
        const tr = await trSor(t, anahtar);
        const en = t.en ? await enSor(t, anahtar) : null;
        const jeton = tr.jeton + (en?.jeton ?? 0);
        const kayit = { anahtar, s: t.s, d: t.d, ...tr, ...(en ?? {}), jeton, cagri: en ? 2 : 1, tarih: new Date().toISOString() };
        fs.appendFileSync(cikti, JSON.stringify(kayit) + '\n', 'utf8');
        toplamJeton += jeton;
        cagri += kayit.cagri;
        if (maliyetUsd(toplamJeton) > butce) { durdu = true; console.error(`DURDU: bütçe ${butce} $`); }
      } catch (e) {
        hata++;
        console.error(`hata: ${t.s.slice(0, 60)} — ${String(e.message || e).slice(0, 160)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: ESZAMANLI }, isci));
  console.log(`Bitti · hata ${hata} · toplam çağrı ${cagri} · ${toplamJeton} girdi jetonu · $${maliyetUsd(toplamJeton).toFixed(4)}`);
}

if (process.argv[1]?.endsWith('jev-kapi.mjs')) {
  main().catch((e) => { console.error('HATA:', e.message); process.exit(1); });
}
