// 6 yeni avatar (1009) provası — tek transaction, sonunda ROLLBACK. lock_timeout 3 sn, statement_timeout 15 sn.
// Kullanım: node araclar/avatar-1009-sql-testi.mjs supabase/migrations/20260612001009_avatar_6_yeni.sql
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIG = process.argv[2];
const A = '5b555bd3-9371-4f35-90a5-39289111335e';   // insan test hesabı (sahip değil)
const YENI = ['kovboy-y40', 'korkuluk-y41', 'kurt-adam-y42', 'balkabagi-adam-y43', 'gunes-kral-y44', 'ay-tanricasi-y45'];
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);
const satirlar = async (s) => { const r = await db.sorgu(s); return r.rows ?? r; };
try {
  await db.sorgu('begin');
  await db.sorgu(`set local lock_timeout = '3s'`);
  await db.sorgu(`set local statement_timeout = '15s'`);
  const once = await satirlar(`select anahtar, nadirlik, edinme, grup from avatar_nitelikleri order by anahtar`);
  const katOnce = await tek(`select md5(string_agg(anahtar || coalesce(nadirlik,'') || aktif::text || onay, ',' order by anahtar)) from avatar_katalogu`);
  const sahipOnce = await tek(`select count(*) from oyuncu_avatarlari`);
  await db.sorgu(fs.readFileSync(MIG, 'utf8'));
  const n = await satirlar(`select anahtar, nadirlik, edinme, grup, acilis_zamani from avatar_nitelikleri where anahtar = any('{${YENI.join(',')}}') order by sira`);
  ok('6 nitelik satırı', n.length === 6);
  const bekle = { 'kovboy-y40': ['nadir', 'ucretsiz'], 'korkuluk-y41': ['nadir', 'ucretsiz'], 'kurt-adam-y42': ['epik', 'elmas'],
    'balkabagi-adam-y43': ['epik', 'elmas'], 'gunes-kral-y44': ['efsanevi', 'elmas'], 'ay-tanricasi-y45': ['efsanevi', 'elmas'] };
  ok('nadirlik + edinme doğru, acilis_zamani null', n.every((r) => bekle[r.anahtar][0] === r.nadirlik && bekle[r.anahtar][1] === r.edinme && r.acilis_zamani == null));
  ok('katalog 6 satır aktif + girsin', await tek(`select count(*) from avatar_katalogu where anahtar = any('{${YENI.join(',')}}') and aktif and onay='girsin'`) === '6');
  ok('katalog nadirlik (Koleksiyon Puanı) boş kaldı', await tek(`select count(*) from avatar_katalogu where anahtar = any('{${YENI.join(',')}}') and nadirlik is not null`) === '0');
  const sonra = await satirlar(`select anahtar, nadirlik, edinme, grup from avatar_nitelikleri order by anahtar`);
  const eski = new Map(once.map((r) => [r.anahtar, r]));
  ok('mevcut 70 satır değişmedi', once.length === 70 && sonra.filter((r) => eski.has(r.anahtar)).every((r) => { const e = eski.get(r.anahtar); return e.nadirlik === r.nadirlik && e.edinme === r.edinme && e.grup === r.grup; }) && sonra.length === 76);
  ok('mevcut katalog satırları (aktif/onay/nadirlik) değişmedi',
    await tek(`select md5(string_agg(anahtar || coalesce(nadirlik,'') || aktif::text || onay, ',' order by anahtar)) from avatar_katalogu where anahtar <> all('{${YENI.join(',')}}')`) === katOnce);
  ok('sahiplik tablosu etkilenmedi', await tek(`select count(*) from oyuncu_avatarlari`) === sahipOnce);
  await db.sorgu(`select set_config('request.jwt.claim.sub', '${A}', true), set_config('request.jwt.claims', '{"sub":"${A}","role":"authenticated"}', true)`);
  ok('renk RPC 76 satır', await tek('select count(*) from avatar_nadirlik_renkleri()') === '76');
  const kat = await satirlar(`select url, kullanabilir from avatar_katalogu_oyun() where url like '%y4%' or url like '%siborg-y31%'`);
  ok('katalog RPC: 6 yeni avatar listede (ücretli kullanılabilirliği arayüzde avatar_sahiplik_durumu belirler; Siborg ile aynı davranış)', kat.filter((r) => r.url.includes('y4')).length === 6 && kat.find((r) => r.url.includes('siborg'))?.kullanabilir === kat.find((r) => r.url.includes('kurt-adam'))?.kullanabilir, JSON.stringify(kat));
  const sd = await satirlar(`select anahtar, fiyat, sahibim, satilik from avatar_sahiplik_durumu() where anahtar = any('{${YENI.join(',')}}')`);
  ok('sahiplik durumu: 4 elmaslı (epik 150 · efsanevi 300)', sd.length === 4 && sd.every((r) => Number(r.fiyat) === (r.anahtar.startsWith('kurt') || r.anahtar.startsWith('balka') ? 150 : 300)), JSON.stringify(sd));
  await db.sorgu('savepoint s');
  await db.sorgu(`select avatar_onayla('/avatars/pro2/kovboy-y40.svg')`);
  ok('ücretsiz Kovboy seçilebilir', (await tek(`select avatar_url from profiles where id='${A}'`)) === '/avatars/pro2/kovboy-y40.svg');
  let red = false;
  try { await db.sorgu(`select avatar_onayla('/avatars/pro2/kurt-adam-y42.svg')`); } catch { red = true; }
  ok('sahipsiz elmaslı Kurt Adam seçilemez', red);
  await db.sorgu('rollback to savepoint s');
  await db.sorgu(fs.readFileSync(MIG, 'utf8'));
  ok('tekrar çalıştırılınca 76 satır', await tek('select count(*) from avatar_nitelikleri') === '76');
} finally {
  try { await db.sorgu('rollback'); } finally { await db.kapat(); }
}
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
