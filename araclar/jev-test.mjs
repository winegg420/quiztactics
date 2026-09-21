// Jev deneme testi — oyuna entegrasyon YOK, veritabanına YAZMA YOK.
//
// Ne yapar: canlı `questions` tablosundan salt-okuma 100 soru örnekler
// (80 normal + 20 "aşırı basit" çapa), her soruyu Jev'e tek çağrıda üç
// tipli soruyla sorar (doğru şık · kategori · zorluk) ve ham sonuçları
// JSON olarak yazar. Raporu `jev-test-rapor.mjs` üretir.
//
// Doğru cevap ve kategori Jev'e VERİLMEZ; şıklar her soruda karıştırılır.
//
// Kullanım:  node araclar/jev-test.mjs [--adet 100]

import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import { jevSor, choice, score, maliyetUsd } from './jev.mjs';

const CIKTI = new URL('./jev-test-ham.json', import.meta.url);
const TOHUM = 20260921; // sabit tohum → örneklem tekrarlanabilir
const BUTCE_USD = 1.0;
const ESZAMANLI = 4;

// Gerçek kategori listesi: oyun/lib/kategoriler.js içindeki anahtarlardan
// `questions` tablosunda fiilen kullanılanlar. 'genel' ve 'karisik' birer
// oyun kipi anahtarıdır, soru kategorisi değildir — listeye girmez.
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

/** Tohumlu sözde-rastgele üreteç (mulberry32) — örneklem tekrarlanabilir olsun. */
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

/** Soruları canlı veritabanından SALT OKUMA olarak çeker. */
async function sorulariGetir() {
  const dizgi = await baglantiDizgisi();
  if (!dizgi) throw new Error('Veritabanı bağlantısı yok (SUPABASE_DB_URL ya da .env.local).');
  const db = await new PgIstemci(dizgi).baglan();
  try {
    // Çapa: 9 Eylül 2026'da "aşırı basit" diye işaretlenen 53 soru.
    // (20260612000265 bunları pasife almıştı; 20260612000147 zorluk=1
    // verip yeniden aktif etti — bugünkü işaretleri zorluk=1.)
    const capa = await db.sorgu(
      `select id::text, soru, secenekler::text, dogru_cevap, kategori
         from public.questions
        where dil='tr' and zorluk = 1
        order by id`,
    );
    const normal = await db.sorgu(
      `select id::text, soru, secenekler::text, dogru_cevap, kategori
         from public.questions
        where dil='tr' and aktif and (zorluk is null or zorluk <> 1)
        order by id`,
    );
    return { capa, normal };
  } finally {
    await db.kapat();
  }
}

function coz(satir) {
  const secenekler = JSON.parse(satir.secenekler);
  const dogruIndeks = Number(satir.dogru_cevap);
  return {
    id: satir.id,
    soru: satir.soru,
    secenekler,
    dogruMetin: secenekler[dogruIndeks],
    kategori: satir.kategori,
  };
}

/** 80 normal (10 kategoriye dengeli) + 20 çapa seçer. */
function orneklemSec(normal, capa, rnd, adet) {
  const normalAdet = Math.round(adet * 0.8);
  const capaAdet = adet - normalAdet;
  const anahtarlar = Object.keys(KATEGORILER);
  const kova = new Map(anahtarlar.map((k) => [k, []]));
  for (const s of normal) if (kova.has(s.kategori)) kova.get(s.kategori).push(s);

  const secilen = [];
  const perKategori = Math.floor(normalAdet / anahtarlar.length);
  for (const k of anahtarlar) {
    secilen.push(...karistir(kova.get(k), rnd).slice(0, perKategori));
  }
  // Artan kontenjan: kalan havuzdan rastgele tamamla.
  const secilenId = new Set(secilen.map((s) => s.id));
  const kalan = karistir(normal.filter((s) => !secilenId.has(s.id) && kova.has(s.kategori)), rnd);
  while (secilen.length < normalAdet && kalan.length) secilen.push(kalan.pop());

  return {
    normal: secilen.map(coz),
    capa: karistir(capa, rnd).slice(0, capaAdet).map(coz),
  };
}

/** Tek soruyu Jev'e sorar: doğru şık + kategori + zorluk, tek çağrıda. */
async function soruyuSor(s) {
  const karisik = s.karisikSiklar;
  const secenekKriter = {};
  for (const secenek of karisik) secenekKriter[secenek] = null;

  const state = {
    soru: s.soru,
    siklar: karisik,
  };

  const yanit = await jevSor(state, {
    dogru_sik: choice(
      'Bu çoktan seçmeli bilgi yarışması sorusunun doğru cevabı `siklar` içindeki hangi seçenektir?',
      secenekKriter,
    ),
    kategori: choice(
      'Bu soru hangi bilgi alanına girer?',
      KATEGORILER,
    ),
    zorluk: score(
      'Ortalama bir yetişkin için bu sorunun doğru cevabını bilmek ne kadar zordur?',
      ZORLUK_OLCEGI,
    ),
  });

  return {
    id: s.id,
    soru: s.soru,
    bizimKategori: s.kategori,
    bizimCevap: s.dogruMetin,
    gonderilenSiklar: karisik,
    jevCevap: yanit.answers.dogru_sik.choice,
    jevCevapGuven: yanit.answers.dogru_sik.confidence,
    jevCevapOlasiliklar: yanit.answers.dogru_sik.probabilities,
    jevKategori: yanit.answers.kategori.choice,
    jevKategoriGuven: yanit.answers.kategori.confidence,
    jevZorluk: yanit.answers.zorluk.score + 1, // 0 tabanlı → 1–5
    jevZorlukGuven: yanit.answers.zorluk.confidence,
    model: yanit.model,
    girdiJetonu: yanit.usage?.input_tokens ?? 0,
    sureMs: yanit.sureMs,
  };
}

async function main() {
  const adetArg = process.argv.indexOf('--adet');
  const adet = adetArg > -1 ? Number(process.argv[adetArg + 1]) : 100;

  const rnd = uretec(TOHUM);
  const { capa, normal } = await sorulariGetir();
  const orneklem = orneklemSec(normal, capa, rnd, adet);
  // Şık karıştırması da tohumdan türer — çağrı sırası değişse de aynı kalır.
  const hepsi = [
    ...orneklem.normal.map((s) => ({ ...s, kume: 'normal' })),
    ...orneklem.capa.map((s) => ({ ...s, kume: 'capa' })),
  ].map((s) => ({ ...s, karisikSiklar: karistir(s.secenekler, rnd) }));
  console.log(`Örneklem: ${orneklem.normal.length} normal + ${orneklem.capa.length} çapa = ${hepsi.length}`);

  const sonuclar = [];
  const hatalar = [];
  let toplamJeton = 0;
  let sira = 0;
  let durduruldu = false;

  async function isci() {
    while (sira < hepsi.length && !durduruldu) {
      const s = hepsi[sira++];
      try {
        const r = await soruyuSor(s);
        toplamJeton += r.girdiJetonu;
        if (maliyetUsd(toplamJeton) > BUTCE_USD) {
          durduruldu = true;
          console.error('DURDURULDU: bütçe sınırı (1 USD) aşıldı.');
        }
        sonuclar.push({ ...r, kume: s.kume });
        if (sonuclar.length % 10 === 0) process.stdout.write(`  ${sonuclar.length}/${hepsi.length}\n`);
      } catch (hata) {
        hatalar.push({ id: s.id, hata: String(hata.message || hata) });
      }
    }
  }

  const basla = Date.now();
  await Promise.all(Array.from({ length: ESZAMANLI }, isci));
  const gecen = Date.now() - basla;

  const ciktilar = {
    tarih: new Date().toISOString(),
    model: sonuclar[0]?.model ?? null,
    tohum: TOHUM,
    toplamJeton,
    maliyetUsd: maliyetUsd(toplamJeton),
    ortSureMs: sonuclar.length ? Math.round(sonuclar.reduce((t, r) => t + r.sureMs, 0) / sonuclar.length) : 0,
    duvarSaatiMs: gecen,
    hatalar,
    sonuclar,
  };
  fs.writeFileSync(CIKTI, JSON.stringify(ciktilar, null, 2), 'utf8');
  console.log(`Bitti: ${sonuclar.length} sonuç, ${hatalar.length} hata.`);
  console.log(`Jeton: ${toplamJeton} · Maliyet: $${ciktilar.maliyetUsd.toFixed(5)} · Ort. çağrı: ${ciktilar.ortSureMs} ms`);
}

main().catch((hata) => {
  console.error('HATA:', hata.message);
  process.exit(1);
});
