// İkinci geçiş: ilk taramada (jev-zorluk-dondurma.mjs) düşük tespit oranı çıkan kategorilerde
// (edebiyat/sinema/coğrafya/genel_kültür/tarih/spor) "zor_bilinebilir" sınıfına düşmüş soruları,
// çok alanlı çapa örnekli daha keskin bir ölçütle yeniden dener. DB'ye YAZMAZ.
//
// Neden: ilk geçişte teknoloji %5,6 işaretlenirken bu 6 kategori %0-1,2 arası kaldı; elle
// örneklem (Nabokov "Kinbote" gibi) bu kategorilerde de benzer derecede ansiklopedik soru
// olduğunu ama ölçütün STEM örneklerine kaydığı için kaçırdığını gösterdi.
//
// Kullanım: node araclar/jev-zorluk-dondurma-ikinci-gecis.mjs [--ozet]
// Gerçek yazım YOK; onaydan sonra:
//   node araclar/jev-zorluk-dondurma-ikinci-gecis.mjs --migration <dosya.sql>

import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import { jevSor, choice, maliyetUsd } from './jev.mjs';

const ILK_HAM = new URL('./jev-tarama/zorluk-dondurma-ham.jsonl', import.meta.url);
const HAM = new URL('./jev-tarama/zorluk-dondurma-ikinci-ham.jsonl', import.meta.url);
const MD = new URL('./jev-tarama/zorluk-dondurma-ikinci-ozet.md', import.meta.url);
const ADAYLAR = new URL('./jev-tarama/zorluk-dondurma-ikinci-adaylar.csv', import.meta.url);
const KATEGORILER = new Set(['edebiyat', 'sinema', 'cografya', 'genel_kultur', 'tarih', 'spor']);
const BUTCE_USD = 2.0;
const ESZAMANLI = 5;

const ZORLUK_SINIFLARI_2 = {
  normal:
    'Zorluk etiketine rağmen ortalama eğitimli bir Türkiye yetişkininin makul bir ihtimalle bildiği ya da '
    + 'kolayca tahmin edebildiği sıradan genel kültür sorusu.',
  zor_bilinebilir:
    'Gerçekten zor: ortalama bir yetişkin doğrudan bilmeyebilir ama konu genel kültürün sınırları içindedir '
    + '(tanınmış ama az bilinen bir kişi/eser/olay) ve mantık/tahminle yaklaşılabilir.',
  asiri_uzmanlik:
    'Sıradan bir oyuncunun bilme ihtimali neredeyse sıfır: dar bir uzmanlık/hayran-seviyesi ayrıntı, ortalama '
    + 'eğitimli biri tarafından bilinmesi makul biçimde beklenemez. Alan farketmez — örnekler: '
    + '"Vesti la giubba" aryasının hangi operadan olduğu (müzik), bir romanın içindeki ikincil bir karakterin adı '
    + 'ya da bir şiir biçiminin teknik kuralı (edebiyat), bir filmin bir sahnesindeki dekor ayrıntısı ya da az '
    + 'bilinen bir yönetmenin ilk filmi (sinema), bir şehrin nüfusunun onlarca yıl önceki tam rakamı ya da bir '
    + 'dağın ikincil zirvesinin adı (coğrafya), bir tarihi olayın tam tarihi/yer adı gibi ansiklopedik bir ayrıntı '
    + '(tarih), az bilinen bir sporcunun kariyer istatistiği ya da bir kuralın çok spesifik bir istisnası (spor). '
    + 'Ölçüt "ünlü mü" değil "ortalama biri bilir mi"dir: çok ünlü bir eserin/kişinin İÇİNDEKİ dar bir ayrıntısı '
    + 'da (ör. ünlü bir romandaki yan karakter) bu sınıfa girer.',
};

async function ilkGecisZorBilinebilir() {
  const ham = fs.readFileSync(ILK_HAM, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  return ham.filter((k) => k.sinif === 'zor_bilinebilir' && KATEGORILER.has(k.kategori));
}

async function sorulariGetir(db, ids) {
  if (!ids.length) return [];
  return db.sorgu(
    `select id::text, soru, secenekler::text, dogru_cevap, kategori, zorluk
       from public.questions
      where aktif and id = any('{${ids.join(',')}}'::uuid[])`,
  );
}

async function soruyuSor(s) {
  const y = await jevSor(
    { soru: s.soru, siklar: s.siklar, dogru_cevap: s.dogru, kategori: s.kategori, zorluk: s.zorluk },
    {
      sinif: choice(
        'Türkiye\'de ortalama eğitimli bir yetişkin bu bilgi yarışması sorusunu makul bir ihtimalle bilir mi?',
        ZORLUK_SINIFLARI_2,
      ),
    },
  );
  const a = y.answers.sinif;
  return {
    id: s.id, soru: s.soru, dogru: s.dogru, kategori: s.kategori, zorluk: s.zorluk,
    sinif: a.choice, guven: a.confidence, girdiJetonu: y.usage?.input_tokens ?? 0,
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

async function ozetUret(havuz, duvarMs) {
  const sonuc = hamOku().filter((k) => !havuz || havuz.has(k.id));
  const say = { normal: 0, zor_bilinebilir: 0, asiri_uzmanlik: 0 };
  const kat = new Map();
  let jeton = 0;
  const donacak = [];
  for (const k of sonuc) {
    say[k.sinif]++;
    if (!kat.has(k.kategori)) kat.set(k.kategori, { normal: 0, zor_bilinebilir: 0, asiri_uzmanlik: 0 });
    kat.get(k.kategori)[k.sinif]++;
    if (k.sinif === 'asiri_uzmanlik') donacak.push(k);
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
  const md = [
    '# Jev zorluk dondurma — İKİNCİ GEÇİŞ PROVA (veritabanına yazılmadı)',
    '',
    `- Tarih: ${new Date().toISOString().slice(0, 10)} · kategoriler: ${[...KATEGORILER].join(', ')}`,
    `- İşlenen: ${sonuc.length}${havuz ? ` / ${havuz.size} (ilk geçişte zor_bilinebilir çıkan bu kategoriler)` : ''}`,
    `- Maliyet: $${maliyetUsd(jeton).toFixed(4)}${duvarMs ? ` · duvar saati ${Math.round(duvarMs / 60000)} dk` : ''}`,
    '',
    `**normal ${say.normal} (ilk geçişteki karar bozuldu, aslında sıradan) · zor_bilinebilir ${say.zor_bilinebilir} (aynı karar korundu) · aşırı uzmanlık (YENİ dondurma adayı) ${say.asiri_uzmanlik}**`,
    '',
    '| kategori | tekrar taranan | normal | zor_bilinebilir | asiri_uzmanlik (yeni aday) |',
    '|---|---|---|---|---|',
    ...[...kat].sort((a, b) => a[0].localeCompare(b[0])).map(([ad, v]) =>
      `| ${ad} | ${v.normal + v.zor_bilinebilir + v.asiri_uzmanlik} | ${v.normal} | ${v.zor_bilinebilir} | ${v.asiri_uzmanlik} |`),
    '',
    `## Tüm "aşırı uzmanlık" (yeni dondurma adayı, ${donacak.length}) — tam liste zorluk-dondurma-ikinci-adaylar.csv`,
    '',
    ...donacak.map((k) => `- [${k.kategori} · z${k.zorluk} · ${k.guven.toFixed(2)}] ${kisa(k.soru)} → ${kisa(k.dogru, 40)}`),
    '',
  ];
  fs.writeFileSync(MD, md.join('\n'), 'utf8');
  console.log(`Özet: normal ${say.normal} · zor_bilinebilir ${say.zor_bilinebilir} · asiri_uzmanlik (yeni) ${say.asiri_uzmanlik}`);
  console.log(`Rapor: ${MD.pathname.replace(/^\//, '')}`);
}

async function migrationUret(dosya, havuz) {
  if (!dosya) throw new Error('Kullanım: --migration <dosya.sql>');
  const sonuc = hamOku().filter((k) => havuz.has(k.id));
  if (sonuc.length !== havuz.size) throw new Error(`Tarama eksik: ${sonuc.length}/${havuz.size}`);
  const donacak = sonuc.filter((k) => k.sinif === 'asiri_uzmanlik').map((k) => k.id);
  const liste = donacak.map((i) => `  '${i}'`).join(',\n');
  const sql = [
    '-- Jev zorluk dondurma — ikinci geçiş (araclar/jev-zorluk-dondurma-ikinci-gecis.mjs).',
    '-- İlk geçişte edebiyat/sinema/coğrafya/genel_kültür/tarih/spor kategorilerinde "zor_bilinebilir"',
    `-- kalan sorular çok alanlı çapa örnekli ölçütle yeniden dendi; ${donacak.length} soru "aşırı uzmanlık" çıktı.`,
    '-- Silme yok; geri açmak için aktif = true yeterli. Idempotent.',
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
  const adaylar = await ilkGecisZorBilinebilir();
  const db = await new PgIstemci(await baglantiDizgisi()).baglan();
  let satirlar;
  try {
    satirlar = await sorulariGetir(db, adaylar.map((a) => a.id));
  } finally {
    await db.kapat();
  }
  const secenekMap = new Map(satirlar.map((r) => [r.id, r]));
  const hepsi = adaylar.filter((a) => secenekMap.has(a.id)).map((a) => {
    const r = secenekMap.get(a.id);
    const sec = JSON.parse(r.secenekler);
    return { id: r.id, soru: r.soru, siklar: sec, dogru: sec[Number(r.dogru_cevap)], kategori: r.kategori, zorluk: r.zorluk };
  });
  const havuz = new Set(hepsi.map((s) => s.id));
  console.log(`İlk geçişte "zor_bilinebilir" + hedef kategori: ${adaylar.length} · hâlâ aktif: ${hepsi.length}`);

  if (process.argv.includes('--ozet')) return ozetUret(havuz);
  const mi = process.argv.indexOf('--migration');
  if (mi > 0) return migrationUret(process.argv[mi + 1], havuz);

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
  await ozetUret(havuz, Date.now() - basla);
}

main().catch((e) => {
  console.error('HATA:', e.message);
  process.exit(1);
});
