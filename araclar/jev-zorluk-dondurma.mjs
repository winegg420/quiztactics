// Jev ile aşırı zor/ansiklopedik soru tespiti — zorluk 4-5, aktif sorular.
//
// PROVA varsayılandır: veritabanına YAZMAZ. Sonuçlar jev-tarama/zorluk-dondurma-ham.jsonl'a
// anında eklenir (git'e girmez), yeniden başlatınca kaldığı yerden devam eder.
// Bitince (ya da --ozet ile) jev-tarama/zorluk-dondurma-ozet.md + zorluk-dondurma-adaylar.csv üretir.
//
// Ölçüt: "Türkiye'de ortalama eğitimli bir yetişkin bu soruyu makul bir ihtimalle bilir mi?"
//   normal          = evet, sıradan genel kültür (zorluk etiketine rağmen)
//   zor_bilinebilir = hayır ama tahmin/mantıkla yaklaşılabilir, genel kültür sınırları içinde
//   asiri_uzmanlik  = hayır, dar bir uzmanlık/ansiklopedik alana özgü — dondurulmalı
// Jev'in güveni ESIK'in altındaysa soru "belirsiz" listesine düşer (dondurulmaz, elle bakılır).
//
// Kullanım:  node araclar/jev-zorluk-dondurma.mjs [--dene] [--ozet]
// Gerçek yazım bu betikte YOK; onaydan sonra ham veriden migration üretilir:
//   node araclar/jev-zorluk-dondurma.mjs --migration <dosya.sql>
// Yalnız "asiri_uzmanlik" sınıfına düşenler aktif=false yapılır (silme yok, geri açılabilir).

import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import { jevSor, choice, maliyetUsd } from './jev.mjs';

const KLASOR = new URL('./jev-tarama/', import.meta.url);
const HAM = new URL('./zorluk-dondurma-ham.jsonl', KLASOR);
const MD = new URL('./zorluk-dondurma-ozet.md', KLASOR);
const ADAYLAR = new URL('./zorluk-dondurma-adaylar.csv', KLASOR);
const BUTCE_USD = 2.0;
const ESZAMANLI = 5;
// 3'lü sınıflandırmada güven değerleri kapsam betiğindeki (2'li) kadar yüksek çıkmıyor:
// tam taramada asiri_uzmanlik ortalama güveni 0,39 (bkz. jev-tarama/zorluk-dondurma-ozet.md).
// 0,7 gibi bir eşik 73 gerçek adaydan yalnız 1'ini bırakıyordu — elle örneklem (73 örneğin
// tamamı) düşük güvende bile isabetliydi, bu yüzden eşik devre dışı (0).
const ESIK = 0;
const KATEGORI_MIN_HAVUZ = 60; // soru_kapsam_min_havuz ile aynı eşik — tutarlılık için

export const ZORLUK_SINIFLARI = {
  normal:
    'Zorluk etiketine rağmen ortalama eğitimli bir Türkiye yetişkininin makul bir ihtimalle bildiği ya da '
    + 'kolayca tahmin edebildiği sıradan genel kültür sorusu.',
  zor_bilinebilir:
    'Gerçekten zor: ortalama bir yetişkin doğrudan bilmeyebilir ama konu genel kültürün sınırları içindedir '
    + '(tanınmış ama az bilinen bir kişi/eser/olay) ve mantık/tahminle yaklaşılabilir. Zorluk 5te kalabilir.',
  asiri_uzmanlik:
    'Sıradan bir oyuncunun bilme ihtimali neredeyse sıfır: dar bir uzmanlık alanına özgü ansiklopedik bilgi '
    + '(örn. belirli bir opera aryasının adı, dar bir akademik terim, çok spesifik bir tarihsel/bilimsel ayrıntı). '
    + 'Ortalama eğitimli biri tarafından bilinmesi makul biçimde beklenemez.',
};

async function sorulariGetir(db) {
  return db.sorgu(
    `select id::text, soru, secenekler::text, dogru_cevap, kategori, zorluk
       from public.questions
      where dil='tr' and aktif and zorluk in (4,5)
      order by id`,
  );
}

async function kategoriAktifSayilari(db) {
  const satirlar = await db.sorgu(
    `select kategori, count(*)::int as adet from public.questions where dil='tr' and aktif group by kategori`,
  );
  return new Map(satirlar.map((r) => [r.kategori, Number(r.adet)]));
}

async function soruyuSor(s) {
  const y = await jevSor(
    { soru: s.soru, siklar: s.siklar, dogru_cevap: s.dogru, kategori: s.kategori, zorluk: s.zorluk },
    {
      sinif: choice(
        'Türkiye\'de ortalama eğitimli bir yetişkin bu bilgi yarışması sorusunu makul bir ihtimalle bilir mi?',
        ZORLUK_SINIFLARI,
      ),
    },
  );
  const a = y.answers.sinif;
  return {
    id: s.id,
    soru: s.soru,
    dogru: s.dogru,
    kategori: s.kategori,
    zorluk: s.zorluk,
    sinif: a.choice,
    guven: a.confidence,
    girdiJetonu: y.usage?.input_tokens ?? 0,
  };
}

function hamOku() {
  if (!fs.existsSync(HAM)) return [];
  const son = new Map();
  for (const l of fs.readFileSync(HAM, 'utf8').split('\n').filter(Boolean)) {
    const k = JSON.parse(l);
    son.set(k.id, k);
  }
  return [...son.values()];
}

const csvAlan = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const kisa = (t, n = 110) => String(t).replace(/\s+/g, ' ').replace(/\|/g, '/').slice(0, n);

/** Karar: güven ESIK altı → belirsiz (dondurulmaz); değilse Jev'in sınıfı. */
export function karar(k) {
  return k.guven < ESIK ? 'belirsiz' : k.sinif;
}

async function ozetUret(havuz, kategoriToplam, duvarMs) {
  const sonuc = hamOku().filter((k) => !havuz || havuz.has(k.id));
  const say = { normal: 0, zor_bilinebilir: 0, asiri_uzmanlik: 0, belirsiz: 0 };
  const kat = new Map();
  let jeton = 0;
  const donacak = [];
  for (const k of sonuc) {
    const d = karar(k);
    say[d]++;
    if (!kat.has(k.kategori)) kat.set(k.kategori, { normal: 0, zor_bilinebilir: 0, asiri_uzmanlik: 0, belirsiz: 0 });
    kat.get(k.kategori)[d]++;
    if (d === 'asiri_uzmanlik') donacak.push(k);
    jeton += k.girdiJetonu || 0;
  }
  donacak.sort((a, b) => a.kategori.localeCompare(b.kategori));
  fs.writeFileSync(
    ADAYLAR,
    ['id,kategori,zorluk,guven,soru,dogru_cevap']
      .concat(donacak.map((k) => [k.id, k.kategori, k.zorluk, k.guven.toFixed(2), k.soru, k.dogru].map(csvAlan).join(',')))
      .join('\n') + '\n',
    'utf8',
  );
  const ornek = (tur, n) => sonuc.filter((k) => karar(k) === tur).sort(() => Math.random() - 0.5).slice(0, n);
  const katSatirlari = [...kat].sort((a, b) => a[0].localeCompare(b[0])).map(([ad, v]) => {
    const toplamOnce = kategoriToplam.get(ad) ?? 0;
    const kalan = toplamOnce - v.asiri_uzmanlik;
    const uyari = kalan < KATEGORI_MIN_HAVUZ ? ' ⚠' : '';
    return `| ${ad} | ${toplamOnce} | ${v.normal} | ${v.zor_bilinebilir} | ${v.asiri_uzmanlik} | ${v.belirsiz} | ${kalan}${uyari} |`;
  });
  const md = [
    '# Jev zorluk dondurma — PROVA (veritabanına yazılmadı)',
    '',
    `- Tarih: ${new Date().toISOString().slice(0, 10)} · güven eşiği ${ESIK} · kategori asgari havuz ${KATEGORI_MIN_HAVUZ}`,
    `- İşlenen: ${sonuc.length}${havuz ? ` / ${havuz.size} aktif TR zorluk 4-5 soru` : ''}`,
    `- Maliyet: $${maliyetUsd(jeton).toFixed(4)}${duvarMs ? ` · duvar saati ${Math.round(duvarMs / 60000)} dk` : ''}`,
    '',
    `**normal ${say.normal} · zor ama bilinebilir ${say.zor_bilinebilir} · aşırı uzmanlık (dondurulacak) ${say.asiri_uzmanlik} · belirsiz ${say.belirsiz}**`,
    '',
    '| kategori | kategori toplam aktif | normal | zor_bilinebilir | asiri_uzmanlik | belirsiz | dondurma sonrası kalan |',
    '|---|---|---|---|---|---|---|',
    ...katSatirlari,
    '',
    `## Rastgele ${Math.min(30, say.asiri_uzmanlik)} "aşırı uzmanlık" (dondurulacak aday) — tam liste zorluk-dondurma-adaylar.csv`,
    '',
    ...ornek('asiri_uzmanlik', 30).map((k) => `- [${k.kategori} · z${k.zorluk} · ${k.guven.toFixed(2)}] ${kisa(k.soru)} → ${kisa(k.dogru, 40)}`),
    '',
    '## Karşılaştırma için 10 "zor ama bilinebilir" (kalacak)',
    '',
    ...ornek('zor_bilinebilir', 10).map((k) => `- [${k.kategori} · z${k.zorluk} · ${k.guven.toFixed(2)}] ${kisa(k.soru)} → ${kisa(k.dogru, 40)}`),
    '',
    '## Karşılaştırma için 10 "normal" (kalacak)',
    '',
    ...ornek('normal', 10).map((k) => `- [${k.kategori} · z${k.zorluk} · ${k.guven.toFixed(2)}] ${kisa(k.soru)} → ${kisa(k.dogru, 40)}`),
    '',
  ];
  fs.writeFileSync(MD, md.join('\n'), 'utf8');
  console.log(`Özet: normal ${say.normal} · zor_bilinebilir ${say.zor_bilinebilir} · asiri_uzmanlik ${say.asiri_uzmanlik} · belirsiz ${say.belirsiz}`);
  console.log(`Rapor: ${MD.pathname.replace(/^\//, '')}`);
}

/** Onaylı ölçüte göre dondurma migration'ı üretir (DB'ye yazmaz). */
async function migrationUret(dosya, havuz) {
  if (!dosya) throw new Error('Kullanım: --migration <dosya.sql>');
  const sonuc = hamOku().filter((k) => havuz.has(k.id));
  if (sonuc.length !== havuz.size) throw new Error(`Tarama eksik: ${sonuc.length}/${havuz.size}`);
  const donacak = sonuc.filter((k) => karar(k) === 'asiri_uzmanlik').map((k) => k.id);
  const liste = donacak.map((i) => `  '${i}'`).join(',\n');
  const sql = [
    `-- Jev zorluk dondurma (araclar/jev-zorluk-dondurma.mjs, güven eşiği ${ESIK}).`,
    `-- Yalnız "aşırı uzmanlık/ansiklopedik" sınıfına düşen ${donacak.length} zorluk 4-5 soru pasife alınır.`,
    '-- Silme yok; geri açmak için aktif = true yeterli. Idempotent (yalnız hâlâ aktif olanları etkiler).',
    '',
    donacak.length
      ? `update public.questions set aktif = false where aktif and id in (\n${liste}\n);`
      : '-- Dondurulacak soru yok.',
    '',
  ].join('\n');
  fs.writeFileSync(dosya, sql, 'utf8');
  console.log(`Migration: ${dosya} · dondurulacak ${donacak.length} soru`);
}

async function main() {
  fs.mkdirSync(KLASOR, { recursive: true });
  const db = await new PgIstemci(await baglantiDizgisi()).baglan();
  let satirlar, kategoriToplam;
  try {
    satirlar = await sorulariGetir(db);
    kategoriToplam = await kategoriAktifSayilari(db);
  } finally {
    await db.kapat();
  }
  const hepsi = satirlar.map((r) => {
    const sec = JSON.parse(r.secenekler);
    return { id: r.id, soru: r.soru, siklar: sec, dogru: sec[Number(r.dogru_cevap)], kategori: r.kategori, zorluk: r.zorluk };
  });
  const havuz = new Set(hepsi.map((s) => s.id));

  if (process.argv.includes('--ozet')) return ozetUret(havuz, kategoriToplam);
  const mi = process.argv.indexOf('--migration');
  if (mi > 0) return migrationUret(process.argv[mi + 1], havuz);
  if (process.argv.includes('--dene')) {
    for (const s of hepsi.slice(0, 5)) console.log(JSON.stringify(await soruyuSor(s)));
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
        if (maliyetUsd(toplamJeton + r.girdiJetonu) > BUTCE_USD) {
          durdu = true;
          console.error(`DURDURULDU: bütçe sınırı (${BUTCE_USD} USD).`);
        }
        if (islenen % 200 === 0) console.log(`${islenen}/${hepsi.length} $${maliyetUsd(toplamJeton).toFixed(3)}`);
      } catch (e) {
        hata++;
        console.error(`hata ${s.id}: ${String(e.message || e).slice(0, 200)}`);
      }
    }
  }
  const basla = Date.now();
  await Promise.all(Array.from({ length: ESZAMANLI }, isci));
  console.log(`Bitti: ${islenen}/${hepsi.length}, hata ${hata}, $${maliyetUsd(toplamJeton).toFixed(4)}`);
  await ozetUret(havuz, kategoriToplam, Date.now() - basla);
}

main().catch((e) => {
  console.error('HATA:', e.message);
  process.exit(1);
});
