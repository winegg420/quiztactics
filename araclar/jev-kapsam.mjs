// Jev kapsam etiketlemesi — her aktif TR soru "evrensel" mi "yerel" mi?
//
// PROVA varsayılandır: veritabanına YAZMAZ. Sonuçlar jev-tarama/kapsam-ham.jsonl'a
// anında eklenir (git'e girmez), yeniden başlatınca kaldığı yerden devam eder.
// Bitince (ya da --ozet ile) jev-tarama/kapsam-ozet.md + kapsam-belirsiz.csv üretir.
//
// Ölçüt (generate-questions prompt'uyla aynı):
//   yerel     = Türkiye tarihi/coğrafyası/siyaseti ya da yalnız Türkiye'de bilinen kültürel öğe
//   evrensel  = dünya geneli bilgi
// Jev'in güveni ESIK'in altındaysa soru "belirsiz" listesine düşer (sahibine sorulur).
//
// Kullanım:  node araclar/jev-kapsam.mjs [--dene] [--ozet]
// Gerçek yazım bu betikte YOK; onaydan sonra kapsam-ham.jsonl'dan migration üretilir:
//   node araclar/jev-kapsam.mjs --migration <dosya.sql> --belirsiz=yerel|evrensel|mevcut
// Yalnız etiketi DEĞİŞEN sorular yazılır (DB'deki global/yerel ile karşılaştırılır); kısıt gereği
// global → ulke null, yerel → ulke 'TR'. Dosya sonunda soru_kapsam_filtresi_acik = 1.

import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import { jevSor, choice, maliyetUsd } from './jev.mjs';

const KLASOR = new URL('./jev-tarama/', import.meta.url);
const HAM = new URL('./kapsam-ham.jsonl', KLASOR);
const MD = new URL('./kapsam-ozet.md', KLASOR);
const BELIRSIZ = new URL('./kapsam-belirsiz.csv', KLASOR);
const BUTCE_USD = 2.0;
const ESZAMANLI = 5;
const ESIK = 0.75;

export const KAPSAM_SINIFLARI = {
  yerel:
    "Türkiye'ye özgü: Türkiye ya da Osmanlı tarihi, Türkiye coğrafyası (il, ilçe, bölge, Türkiye'deki dağ/göl/nehir/yapı), "
    + 'Türk siyaseti ve kurumları, Türk edebiyatı/sineması/dizisi/müziği/sporu (Türk kişi, eser, kulüp, lig) ya da yalnız '
    + "Türkiye'de bilinen kültürel öğe (yemek, gelenek, deyim). Türkiye dışında yaşayan ortalama bir yetişkinin bilmesi beklenemez.",
  evrensel:
    'Dünya geneli bilgi: bilim, dünya tarihi, dünya coğrafyası, uluslararası tanınmış kişi/eser/olay/marka/spor. '
    + "Türkiye dışında yaşayan bir yetişkin de bilebilir.",
};

async function sorulariGetir() {
  const db = await new PgIstemci(await baglantiDizgisi()).baglan();
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

async function soruyuSor(s) {
  const y = await jevSor(
    { soru: s.soru, siklar: s.siklar, dogru_cevap: s.dogru, kategori: s.kategori },
    { kapsam: choice('Bu bilgi yarışması sorusu Türkiye\'ye özgü (yerel) mi, dünya genelinde bilinir (evrensel) mi?', KAPSAM_SINIFLARI) },
  );
  const a = y.answers.kapsam;
  return {
    id: s.id,
    soru: s.soru,
    dogru: s.dogru,
    kategori: s.kategori,
    kapsam: a.choice,
    guven: a.confidence,
    girdiJetonu: y.usage?.input_tokens ?? 0,
    sureMs: y.sureMs,
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

/** Karar: güven ESIK altı → belirsiz; değilse Jev'in seçimi. */
export function karar(k) {
  return k.guven < ESIK ? 'belirsiz' : k.kapsam;
}

function ozetUret(havuz, duvarMs) {
  const sonuc = hamOku().filter((k) => !havuz || havuz.has(k.id));
  const say = { evrensel: 0, yerel: 0, belirsiz: 0 };
  const kat = new Map();
  let jeton = 0;
  const belirsiz = [];
  for (const k of sonuc) {
    const d = karar(k);
    say[d]++;
    if (!kat.has(k.kategori)) kat.set(k.kategori, { evrensel: 0, yerel: 0, belirsiz: 0 });
    kat.get(k.kategori)[d]++;
    if (d === 'belirsiz') belirsiz.push(k);
    jeton += k.girdiJetonu || 0;
  }
  belirsiz.sort((a, b) => a.kategori.localeCompare(b.kategori) || a.guven - b.guven);
  fs.writeFileSync(
    BELIRSIZ,
    ['id,kategori,jev_egilim,guven,soru,dogru']
      .concat(belirsiz.map((k) => [k.id, k.kategori, k.kapsam, k.guven.toFixed(2), k.soru, k.dogru].map(csvAlan).join(',')))
      .join('\n') + '\n',
    'utf8',
  );
  const ornek = (tur, n) => sonuc.filter((k) => karar(k) === tur).sort(() => Math.random() - 0.5).slice(0, n);
  const md = [
    '# Jev kapsam etiketlemesi — PROVA (veritabanına yazılmadı)',
    '',
    `- Tarih: ${new Date().toISOString().slice(0, 10)} · eşik ${ESIK}`,
    `- İşlenen: ${sonuc.length}${havuz ? ` / ${havuz.size} aktif TR soru` : ''}`,
    `- Maliyet: $${maliyetUsd(jeton).toFixed(4)}${duvarMs ? ` · duvar saati ${Math.round(duvarMs / 60000)} dk` : ''}`,
    '',
    `**evrensel ${say.evrensel} · yerel ${say.yerel} · belirsiz ${say.belirsiz}**`,
    '',
    '| kategori | evrensel | yerel | belirsiz | yerel % |',
    '|---|---|---|---|---|',
    ...[...kat].sort((a, b) => a[0].localeCompare(b[0])).map(([ad, v]) =>
      `| ${ad} | ${v.evrensel} | ${v.yerel} | ${v.belirsiz} | ${Math.round((100 * v.yerel) / (v.evrensel + v.yerel + v.belirsiz))} |`),
    '',
    '## Rastgele 25 yerel', '', ...ornek('yerel', 25).map((k) => `- [${k.kategori}] ${kisa(k.soru)} → ${kisa(k.dogru, 40)} (${k.guven.toFixed(2)})`),
    '', '## Rastgele 25 evrensel', '', ...ornek('evrensel', 25).map((k) => `- [${k.kategori}] ${kisa(k.soru)} → ${kisa(k.dogru, 40)} (${k.guven.toFixed(2)})`),
    '', `## Belirsiz (${belirsiz.length}) — tam liste kapsam-belirsiz.csv`, '',
    ...belirsiz.slice(0, 60).map((k) => `- [${k.kategori}] Jev: ${k.kapsam} ${k.guven.toFixed(2)} — ${kisa(k.soru)} → ${kisa(k.dogru, 40)}`),
    '',
  ];
  fs.writeFileSync(MD, md.join('\n'), 'utf8');
  console.log(`Özet: evrensel ${say.evrensel} · yerel ${say.yerel} · belirsiz ${say.belirsiz}`);
}

/** Onaylı kurala göre etiket migration'ı üretir (DB'ye yazmaz). */
async function migrationUret(dosya, havuz) {
  const belirsiz = (process.argv.find((a) => a.startsWith('--belirsiz=')) || '').split('=')[1];
  if (!dosya || !['yerel', 'evrensel', 'mevcut'].includes(belirsiz)) {
    throw new Error('Kullanım: --migration <dosya.sql> --belirsiz=yerel|evrensel|mevcut');
  }
  const db = await new PgIstemci(await baglantiDizgisi()).baglan();
  let mevcut;
  try {
    mevcut = new Map((await db.sorgu(`select id::text, kapsam from public.questions where dil='tr' and aktif`)).map((r) => [r.id, r.kapsam]));
  } finally {
    await db.kapat();
  }
  const sonuc = hamOku().filter((k) => havuz.has(k.id));
  if (sonuc.length !== havuz.size) throw new Error(`Tarama eksik: ${sonuc.length}/${havuz.size}`);
  const yeniYerel = [], yeniGlobal = [];
  const say = { evrensel: 0, yerel: 0 };
  for (const k of sonuc) {
    let d = karar(k);
    if (d === 'belirsiz') d = belirsiz === 'mevcut' ? (mevcut.get(k.id) === 'global' ? 'evrensel' : 'yerel') : belirsiz;
    say[d]++;
    const hedef = d === 'evrensel' ? 'global' : 'yerel';
    if (mevcut.get(k.id) !== hedef) (hedef === 'yerel' ? yeniYerel : yeniGlobal).push(k.id);
  }
  const liste = (ids) => ids.map((i) => `  '${i}'`).join(',\n');
  const sql = [
    `-- Jev kapsam etiketlemesi (araclar/jev-kapsam.mjs, eşik ${ESIK}, belirsiz → ${belirsiz}).`,
    `-- Aktif TR havuz sonrası: evrensel (global) ${say.evrensel} · yerel ${say.yerel}.`,
    `-- Yalnız etiketi değişenler: → yerel ${yeniYerel.length} · → global ${yeniGlobal.length}. Idempotent.`,
    '',
    yeniYerel.length ? `update public.questions set kapsam = 'yerel', ulke = 'TR' where kapsam <> 'yerel' and id in (\n${liste(yeniYerel)}\n);` : '',
    '',
    yeniGlobal.length ? `update public.questions set kapsam = 'global', ulke = null where kapsam <> 'global' and id in (\n${liste(yeniGlobal)}\n);` : '',
    '',
    '-- 652 kuralı etiketler yazıldıktan sonra açılır.',
    "update public.oyun_ayarlari set deger = '1'::jsonb where anahtar = 'soru_kapsam_filtresi_acik';",
    '',
  ].join('\n');
  fs.writeFileSync(dosya, sql, 'utf8');
  console.log(`Migration: ${dosya} · evrensel ${say.evrensel} · yerel ${say.yerel} · değişen → yerel ${yeniYerel.length}, → global ${yeniGlobal.length}`);
}

async function main() {
  fs.mkdirSync(KLASOR, { recursive: true });
  const satirlar = await sorulariGetir();
  const hepsi = satirlar.map((r) => {
    const sec = JSON.parse(r.secenekler);
    return { id: r.id, soru: r.soru, siklar: sec, dogru: sec[Number(r.dogru_cevap)], kategori: r.kategori };
  });
  const havuz = new Set(hepsi.map((s) => s.id));
  if (process.argv.includes('--ozet')) return ozetUret(havuz);
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
  ozetUret(havuz, Date.now() - basla);
}

main().catch((e) => {
  console.error('HATA:', e.message);
  process.exit(1);
});
