// Soru havuzu temizliği (23 Eyl 2026) — migration üretici. Soru SİLMEZ, yeniden yazmaz.
// Her değişiklik degisiklikler.csv'ye eklenir (id, alan, eski, yeni, sebep, jev_guven, migration)
// → geri almak için eski değeri yazan bir UPDATE yeter.
//
// Kullanım (sırayla, her biri ayrı migration):
//   node araclar/soru-temizlik/uret-migration.mjs pasif    <NNN>   (2b hassas · 2c itiraz · 2d çeviri)
//   node araclar/soru-temizlik/uret-migration.mjs kategori <NNN>   (2e kategori taşıma)
//   node araclar/soru-temizlik/uret-migration.mjs zorluk   <NNN>   (2a sıralamaya göre zorluk, SON)
// Eski değerler üretim anında veritabanından okunur; bu yüzden bir önceki migration
// uygulanmadan sonrakini üretme.
import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from '../pg-mini.mjs';
import { esikleriHesapla, seviye, PAYLAR } from '../soru-parti-1000/zorluk.mjs';

const [tur, no] = process.argv.slice(2);
if (!['pasif', 'kategori', 'zorluk'].includes(tur) || !/^\d{3}$/.test(no || '')) {
  throw new Error('Kullanım: uret-migration.mjs pasif|kategori|zorluk <NNN>');
}
const KLASOR = new URL('./', import.meta.url);
const CSV = new URL('./degisiklikler.csv', KLASOR);
const JEV2 = new URL('./jev-ikinci-gecis.jsonl', KLASOR);
const PUAN = new URL('./zorluk-puanlari.csv', KLASOR);
const ADLAR = { pasif: 'soru_temizlik_pasif', kategori: 'soru_temizlik_kategori', zorluk: 'soru_zorluk_yeniden_sirala' };
const MIG = `20260612000${no}_${ADLAR[tur]}`;
const HEDEF = new URL(`../../supabase/migrations/${MIG}.sql`, import.meta.url);

const YUKSEK = 0.8; // "yüksek güven" eşiği (ilk taramadaki itiraz eşiğiyle aynı)
const jev2 = () => fs.readFileSync(JEV2, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const alinti = (s) => `'${String(s).replace(/'/g, "''")}'`;
const csvAlan = (v) => (/[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));
const dizi = (ids) => `'{${ids.map((id, i) => (i % 4 === 0 ? '\n  ' : '') + id).join(',')}\n}'::uuid[]`;

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const sorgu = async (sql) => { const r = await db.sorgu(sql); return r.rows ?? r; };
const csvSatir = [];
const kayit = (id, alan, eski, yeni, sebep, guven) =>
  csvSatir.push([id, alan, eski, yeni, sebep, guven ?? '', MIG].map(csvAlan).join(','));
let sql;

try {
  if (tur === 'pasif') {
    // 2c — ilk taramadaki 21 yüksek güvenli itiraz elle okundu; yalnız gerçekten tartışmalı 4'ü.
    const itiraz = {
      '06a589ca-dacf-4200-92e3-18015337151b': ['2c itiraz: "en değerli taş" Şah (vazgeçilmez) mı Vezir (en güçlü/en yüksek puan) mı — iki şık da savunulabilir', 0.81],
      '5c895c72-cdfa-4ba6-acd5-318da35c5ca0': ['2c itiraz: soru "tam ses aralığı" soruyor, şıklar nota sayısı; oktavda 6 tam ses / 12 yarım ses / 8 nota — doğru cevap net değil', 0.85],
      '7ab45305-86df-4ba6-b46a-1421f5ef459f': ['2c itiraz: Hatşepsut da Kleopatra da Mısır\'ı yöneten kadın firavun — çoklu doğru', 0.90],
      '92466ab9-81c6-4538-8189-9c397bfe32f4': ['2c itiraz: Çin Seddi uzunluğu tanıma bağlı (Ming hattı ~8.850 km, tüm kollar 21.196 km); "ana hat" belirsiz', 0.90],
    };
    // 2d — iki şüpheli çeviri: 053a7fb7'de sorun TR'de de var (1921 ve 1924 anayasalarının ikisinin de
    // resmi adı Teşkilat-ı Esasiye Kanunu) → pasif. 8b64cc47 yalnız EN metni düzeltilir.
    itiraz['053a7fb7-080f-465e-8984-12160f2ec4d9'] = ['2d çeviri: 1921 ve 1924 anayasalarının ikisi de "Teşkilat-ı Esasiye Kanunu" — TR ve EN çoklu doğru', 1.0];
    // 2b — ikinci geçişte (odaklı tek soru) yüksek güvenle sorunlu çıkanlar.
    const b = jev2().filter((o) => (o.coklu ?? 0) >= YUKSEK || (o.eski ?? 0) >= YUKSEK || (o.hassas ?? 0) >= YUKSEK);
    for (const o of b) {
      const neden = [(o.coklu ?? 0) >= YUKSEK && 'çoklu doğru', (o.eski ?? 0) >= YUKSEK && 'eskiyebilir', (o.hassas ?? 0) >= YUKSEK && 'hassas'].filter(Boolean).join(' + ');
      itiraz[o.id] = [`2b Jev ikinci geçiş: ${neden}`, Math.max(o.coklu ?? 0, o.eski ?? 0, o.hassas ?? 0)];
    }
    const ids = Object.keys(itiraz).sort();
    const mevcut = new Map((await sorgu(`select id::text, aktif from public.questions where id = any(${dizi(ids)})`)).map((r) => [r.id, r.aktif]));
    for (const id of ids) kayit(id, 'questions.aktif', mevcut.get(id) === 't', false, itiraz[id][0], itiraz[id][1]);

    const EN_ID = '8b64cc47-d5ab-4638-8aea-0ae2418739cc';
    const EN_YENI = 'Who edits a manuscript and prepares it for publication?';
    const [en] = await sorgu(`select soru from public.question_translations where question_id='${EN_ID}' and dil='en'`);
    kayit(EN_ID, 'question_translations(en).soru', en?.soru, EN_YENI, '2d çeviri: "prepares a book for printing" Typesetter\'ı da doğru kılıyordu; editör işi açıkça yazıldı', 0.99);

    sql = `-- ============================================================
-- ${no} — Soru temizliği: pasife alma + 1 çeviri düzeltmesi (23 Eyl 2026)
--
-- Soru SİLİNMEZ, yeniden yazılmaz; yalnız aktif=false. Geri alma ve her satırın sebebi:
-- araclar/soru-temizlik/degisiklikler.csv (migration = ${MIG}).
--   2c · ilk Jev taramasındaki 21 yüksek güvenli itiraz elle okundu → 4 gerçekten tartışmalı
--   2d · iki şüpheli çeviri: 053a7fb7 TR'de de çoklu doğru → pasif; 8b64cc47 EN metni düzeltildi
--   2b · Jev ikinci geçiş (çoklu doğru 115 · eskiyebilir 103 · hassas 77, odaklı tek soru):
--        >= ${YUKSEK} güvenle sorunlu ${b.length} soru (${b.map((o) => o.id.slice(0, 8)).join(', ')})
-- Toplam pasif: ${ids.length}
-- Üretici: node araclar/soru-temizlik/uret-migration.mjs pasif ${no}
-- ============================================================

update public.questions set aktif = false
 where id = any(${dizi(ids)})
   and aktif;

update public.question_translations
   set soru = ${alinti(EN_YENI)}
 where question_id = '${EN_ID}' and dil = 'en';
`;
  } else if (tur === 'kategori') {
    // 2e — Jev ikinci geçişte >0,8 güvenle farklı kategori. Coğrafya → bilim'e DOKUNULMAZ (ilk listede
    // de yoktu). Örnekler elle okundu; açıkça yanlış olan 7 taşıma dışarıda:
    const HARIC = new Set(['79c8deb1', 'bc933c87', '3a5037db', '420c8f6e', '9556dbdc', '87ff93c3', '5baebfe6']);
    // yelken tramola/orsa + yoga → spor kalır · senaryo opsiyon sözleşmesi → sinema · TUE (doping) → spor ·
    // büst, bienal → sanat
    const tasi = jev2().filter((o) => o.jevKat && o.jevKat !== o.kategori && o.katGuven > YUKSEK
      && !(o.kategori === 'cografya' && o.jevKat === 'bilim') && !HARIC.has(o.id.slice(0, 8)));
    const mevcut = new Map((await sorgu(`select id::text, kategori, aktif from public.questions where id = any(${dizi(tasi.map((o) => o.id))})`)).map((r) => [r.id, r]));
    const gecerli = tasi.filter((o) => mevcut.get(o.id)?.aktif === 't' && mevcut.get(o.id).kategori === o.kategori);
    const gruplar = {};
    for (const o of gecerli) {
      (gruplar[o.jevKat] ??= []).push(o.id);
      kayit(o.id, 'questions.kategori', o.kategori, o.jevKat, '2e Jev ikinci geçiş: kategori', o.katGuven.toFixed(2));
    }
    const gecis = {};
    for (const o of gecerli) gecis[`${o.kategori} → ${o.jevKat}`] = (gecis[`${o.kategori} → ${o.jevKat}`] || 0) + 1;
    sql = `-- ============================================================
-- ${no} — Soru temizliği: kategori taşıma (23 Eyl 2026)
--
-- Kaynak: Jev ikinci geçiş (araclar/soru-temizlik/jev-ikinci-gecis.jsonl) — ilk taramadaki
-- kategori uyuşmazlıkları (coğrafya → bilim hariç) doğru cevapla birlikte yeniden soruldu;
-- > ${YUKSEK} güvenle farklı kategori diyenler taşınır. Örnekler elle okundu, açıkça yanlış 7 taşıma
-- dışarıda (yelken/yoga → spor, TUE → spor, senaryo sözleşmesi → sinema, büst/bienal → sanat).
-- Geri alma: araclar/soru-temizlik/degisiklikler.csv (migration = ${MIG}).
-- Toplam: ${gecerli.length}
${Object.entries(gecis).sort((a, b) => b[1] - a[1]).map(([k, v]) => `--   ${k}: ${v}`).join('\n')}
-- Üretici: node araclar/soru-temizlik/uret-migration.mjs kategori ${no}
-- ============================================================

${Object.entries(gruplar).sort().map(([k, ids]) => `update public.questions set kategori = '${k}'
 where id = any(${dizi(ids.sort())})
   and aktif;`).join('\n\n')}
`;
  } else {
    // 2a — tüm AKTİF TR havuzda migration 290 mantığı: Jev puanına göre sıralama, %10/20/40/20/10,
    // eşitlik blokları bölünmez. Puan: ilk tarama (ozet.csv, id) + Paket 3 kalite kapısı (zorluk-puanlari.csv).
    const puan = new Map();
    for (const l of fs.readFileSync(PUAN, 'utf8').trim().split(/\r?\n/).slice(1)) {
      const [id, p] = l.split(',');
      puan.set(id, Number(p));
    }
    const aktif = await sorgu(`select id::text, zorluk from public.questions where aktif and dil='tr'`);
    const eksik = aktif.filter((r) => !puan.has(r.id));
    if (eksik.length) throw new Error(`Puanı olmayan ${eksik.length} aktif soru var (ör. ${eksik[0].id})`);
    const puanlar = aktif.map((r) => ({ id: r.id, puan: puan.get(r.id) }));
    const esikler = esikleriHesapla(puanlar);
    const gruplar = [[], [], [], [], []];
    const once = [0, 0, 0, 0, 0];
    const eski = new Map(aktif.map((r) => [r.id, Number(r.zorluk)]));
    for (const p of puanlar) {
      const s = seviye(p.puan, esikler);
      gruplar[s - 1].push(p.id);
      once[eski.get(p.id) - 1]++;
      if (eski.get(p.id) !== s) kayit(p.id, 'questions.zorluk', eski.get(p.id), s, '2a sıralamaya göre yeniden (290 mantığı)', p.puan);
    }
    for (const g of gruplar) g.sort();
    fs.writeFileSync(new URL('./zorluk-esikler.json', KLASOR), JSON.stringify({
      kaynak: 'zorluk-puanlari.csv (ilk Jev taraması + Paket 3 kalite kapısı), 23 Eyl 2026',
      paylar: PAYLAR, esikler: { 2: esikler[0], 3: esikler[1], 4: esikler[2], 5: esikler[3] },
      once, dagilim: gruplar.map((g) => g.length),
    }, null, 2) + '\n');
    sql = `-- ============================================================
-- ${no} — Soru zorluğu: büyüyen havuzda SIRALAMAYA göre yeniden (23 Eyl 2026)
--
-- Migration 290'ın mantığı, bir kez, bütün aktif TR havuzda (${puanlar.length} soru):
--   en kolay %10 → 1 · sonraki %20 → 2 · orta %40 → 3 · sonraki %20 → 4 · en zor %10 → 5
-- Jev ÇAĞRISI YOK — puanlar araclar/soru-temizlik/zorluk-puanlari.csv (ilk tarama +
-- Paket 3 kalite kapısının jevZorluk puanı). Eşitlik blokları bölünmez.
-- Eşik puanları: 2 ≥ ${esikler[0]} · 3 ≥ ${esikler[1]} · 4 ≥ ${esikler[2]} · 5 ≥ ${esikler[3]}
-- Önce:  ${once.map((n, i) => `${i + 1}=${n}`).join(' · ')}
-- Sonra: ${gruplar.map((g, i) => `${i + 1}=${g.length}`).join(' · ')}
-- ≥30 cevaplı soru yok; soru_zorluk_kalibre() gerçek veri geldikçe bunun üzerine yazar (bilinçli).
-- Sonda bot_zorluk_ofset_hesapla() (migration 302) rekabetçi havuza göre yeniden hesaplanır.
-- Geri alma: araclar/soru-temizlik/degisiklikler.csv (migration = ${MIG}).
-- Üretici: node araclar/soru-temizlik/uret-migration.mjs zorluk ${no}
-- ============================================================

${gruplar.map((g, i) => `update public.questions set zorluk = ${i + 1}
 where id = any(${dizi(g)})
   and aktif and zorluk is distinct from ${i + 1};`).join('\n\n')}

select public.bot_zorluk_ofset_hesapla();
`;
  }
} finally {
  await db.kapat();
}

fs.writeFileSync(HEDEF, sql);
if (!fs.existsSync(CSV)) fs.writeFileSync(CSV, 'id,alan,eski,yeni,sebep,jev_guven,migration\n');
if (csvSatir.length) fs.appendFileSync(CSV, csvSatir.join('\n') + '\n');
console.log(`Yazıldı: ${MIG}.sql · ${csvSatir.length} CSV satırı`);
