// Avatar nitelikleri + kademeli açılış (700/701) SQL provası — tek transaction, sonunda ROLLBACK.
// Sınar: 70 satır/dağılım · bayrak kapalıyken renk listesi boş, açıkken dolu · kilitli avatar (hazır + katalog)
// listede yok, avatar_onayla reddeder, takılı olan kaydedilebilir · geçmiş tarih açık · sahip olmayan
// yönetici RPC'sini çağıramaz · yetkiler (anon yok, authenticated var).
// Kullanım: node araclar/avatar-nitelik-sql-testi.mjs [migration.sql ...]  (verilenler önce uygulanır)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIGLER = process.argv.slice(2);
const A = '5b555bd3-9371-4f35-90a5-39289111335e';   // insan test hesabı (sahip değil)
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
async function hata(sql) { await db.sorgu('savepoint s'); try { await db.sorgu(sql); await db.sorgu('release savepoint s'); return null; } catch (e) { await db.sorgu('rollback to savepoint s'); return e.message; } }
const tek = (s) => db.tek(s);
try {
  await db.sorgu('begin');
  for (const m of MIGLER) await db.sorgu(fs.readFileSync(m, 'utf8'));
  await ben(A);
  ok('70 satır', await tek('select count(*) from avatar_nitelikleri') === '70');
  ok('dağılım: hepsi dört değerden biri', await tek(`select count(*) from avatar_nitelikleri where nadirlik not in ('yaygin','nadir','epik','efsanevi')`) === '0');
  ok('hepsi ücretsiz, hiçbiri kilitli değil', await tek(`select count(*) from avatar_nitelikleri where edinme <> 'ucretsiz' or acilis_zamani is not null`) === '0');
  ok('başlangıçta kilitli liste boş', await tek('select cardinality(avatar_kilitli_urller())') === '0');
  ok('bayrak kapalı → renk listesi boş', await tek('select count(*) from avatar_nadirlik_renkleri()') === '0');
  await db.sorgu(`update oyun_ayarlari set deger = to_jsonb(true) where anahtar = 'avatar_nadirlik_renk'`);
  ok('bayrak açık → 70 satır', await tek('select count(*) from avatar_nadirlik_renkleri()') === '70');
  await db.sorgu(`update oyun_ayarlari set deger = to_jsonb(false) where anahtar = 'avatar_nadirlik_renk'`);

  // aktif katalog avatarı ve hazır avatar
  const HAZIR = '/avatars/pro/kedi-k01.svg';
  const KAT = await tek(`select url from avatar_katalogu where aktif order by sira limit 1`);
  const onceKat = await tek('select count(*) from avatar_katalogu_oyun()');
  await db.sorgu(`update profiles set avatar_url = null where id='${A}'`);
  await db.sorgu(`update avatar_nitelikleri set acilis_zamani = now() + interval '1 day' where url in ('${HAZIR}','${KAT}')`);
  ok('gelecek tarih → kilitli liste 2', await tek('select cardinality(avatar_kilitli_urller())') === '2');
  ok('katalog kilitliyi saklar (−1)', Number(await tek('select count(*) from avatar_katalogu_oyun()')) === Number(onceKat) - 1);
  ok('katalog listesinde kilitli yok', await tek(`select count(*) from avatar_katalogu_oyun() where url='${KAT}'`) === '0');
  ok('hazır avatar seçilemez', /henüz kullanılamıyor/.test(await hata(`select avatar_onayla('${HAZIR}')`) ?? ''));
  ok('katalog avatarı seçilemez', /henüz kullanılamıyor/.test(await hata(`select avatar_onayla('${KAT}')`) ?? ''));
  ok('kilitsiz avatar seçilebilir', await hata(`select avatar_onayla('/avatars/pro/kopek-k02.svg')`) === null);
  // takılı avatar kilitlenirse yeniden kaydedilebilir (mevcut avatar bozulmaz)
  await db.sorgu(`update profiles set avatar_url='${HAZIR}' where id='${A}'`);
  ok('takılı avatar yeniden kaydedilir', await hata(`select avatar_onayla('${HAZIR}')`) === null);
  await db.sorgu(`update avatar_nitelikleri set acilis_zamani = now() - interval '1 day' where url in ('${HAZIR}','${KAT}')`);
  ok('geçmiş tarih → açık', await tek('select cardinality(avatar_kilitli_urller())') === '0' && await hata(`select avatar_onayla('${KAT}')`) === null);

  ok('sahip olmayan yönetici RPC\'sini çağıramaz', /Yalnız sahip/.test(await hata('select * from avatar_nitelik_yonetici()') ?? ''));
  await db.sorgu(`update oyun_ayarlari set deger = deger || to_jsonb('${A}'::text) where anahtar='sahip_kullanicilar' and jsonb_typeof(deger)='array'`);
  ok('sahip 70 satır görür', await tek('select count(*) from avatar_nitelik_yonetici()') === '70');
  const yetki = async (f, rol) => (await tek(`select has_function_privilege('${rol}', '${f}', 'execute')`)) === 't';
  for (const f of ['avatar_kilitli_urller()', 'avatar_nadirlik_renkleri()', 'avatar_nitelik_yonetici()']) {
    ok(`${f}: anon yok, authenticated var`, !(await yetki(`public.${f}`, 'anon')) && (await yetki(`public.${f}`, 'authenticated')));
  }
  ok('avatar_acilmis_mi: istemciye kapalı', !(await yetki('public.avatar_acilmis_mi(text)', 'authenticated')));
  ok('tablo: istemciye doğrudan erişim yok', (await tek(`select has_table_privilege('authenticated','public.avatar_nitelikleri','select')`)) === 'f');
} finally {
  try { await db.sorgu('rollback'); } finally { await db.kapat(); }
}
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
