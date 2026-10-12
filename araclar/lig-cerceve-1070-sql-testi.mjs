// Lig çerçevesi lige bağlı (1070) — tek transaction, sonunda ROLLBACK. Tek prova, döngü yok.
// Kullanım: node araclar/lig-cerceve-1070-sql-testi.mjs  (migration canlıdaysa --canli: yeniden uygulamaz)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIG = 'supabase/migrations/20260612001070_lig_cercevesi_lige_bagli.sql';
const CANLI = process.argv.includes('--canli');
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, k, ek = '') => { if (k) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);
const hata = async (s) => { await db.sorgu('savepoint s'); try { await db.sorgu(s); await db.sorgu('release savepoint s'); return null; } catch (e) { await db.sorgu('rollback to savepoint s'); return e.message; } };
try {
  await db.sorgu('begin');
  await db.sorgu(`set local lock_timeout = '5s'`);
  await db.sorgu(`set local statement_timeout = '60s'`);
  if (!CANLI) await db.sorgu(fs.readFileSync(MIG, 'utf8'));
  const sahip = await tek(`select id::text from profiles where gorunen_ad = 'idagg'`);
  const kim = (id) => db.sorgu(`select set_config('request.jwt.claim.sub', '${id}', true), set_config('request.jwt.claims', '{"sub":"${id}","role":"authenticated"}', true)`);
  await kim(sahip);
  ok('(a) idagg kartı: lig_altin', (await tek(`select cerceve from oyuncu_kartlari(array['${sahip}'::uuid])`)) === 'lig_altin');
  ok('ligiyle uyuşmayan lig çerçevesi kalmadı', (await tek(`select count(*) from profiles where takili_cerceve like 'lig\_%' and takili_cerceve <> 'lig_' || coalesce(lig,'bronz')`)) === '0');
  // (b) Bronz → Gümüş → Altın → düşüş (bir test oyuncusunda, rollback)
  const t = await tek(`select id::text from profiles where not coalesce(is_bot,false) and id <> '${sahip}' order by created_at desc limit 1`);
  await db.sorgu(`update profiles set lig = 'bronz', takili_cerceve = 'lig_bronz' where id = '${t}'`);
  const kart = async () => { await kim(t); return tek(`select cerceve from oyuncu_kartlari(array['${t}'::uuid])`); };
  ok('(b) bronz → lig_bronz', (await kart()) === 'lig_bronz');
  await db.sorgu(`update profiles set lig = 'gumus' where id = '${t}'`); ok('(b) gümüş → lig_gumus', (await kart()) === 'lig_gumus');
  await db.sorgu(`update profiles set lig = 'altin' where id = '${t}'`); ok('(b) altın → lig_altin', (await kart()) === 'lig_altin');
  await db.sorgu(`update profiles set lig = 'gumus' where id = '${t}'`); ok('(b) düşüş → lig_gumus', (await kart()) === 'lig_gumus');
  // (c) Altın ligde gümüş çerçeve takma reddi
  await db.sorgu(`update profiles set lig = 'altin' where id = '${t}'`);
  await db.sorgu(`insert into oyuncu_cerceveleri (user_id, cerceve, kaynak) values ('${t}','lig_gumus','lig_yukselme'),('${t}','lig_altin','lig_yukselme') on conflict do nothing`);
  await kim(t);
  const h = await hata(`select cerceve_tak('lig_gumus')`);
  ok('(c) cerceve_tak(lig_gumus) reddedildi', /bulunduğun ligin/.test(h ?? ''), h);
  ok('(c) cerceve_tak(lig_altin) kabul', (await hata(`select cerceve_tak('lig_altin')`)) === null);
  await db.sorgu(`insert into lig_cerceveleri (user_id, lig, kaynak) values ('${t}','gumus','lig_yukselme') on conflict do nothing`);
  ok('(c) lig_cerceve_sec(gumus) reddedildi', /bulunduğun ligin/.test((await hata(`select lig_cerceve_sec('gumus')`)) ?? ''));
  // (d) lig dışı çerçeve takılıyken lig değişince dokunulmaz
  const ozel = await tek(`select anahtar from cerceveler where aktif and anahtar not like 'lig\_%' order by sira limit 1`);
  await db.sorgu(`update profiles set takili_cerceve = '${ozel}' where id = '${t}'`);
  await db.sorgu(`update profiles set lig = 'elmas' where id = '${t}'`);
  ok(`(d) özel çerçeve (${ozel}) lig değişince aynı`, (await kart()) === ozel);
} catch (e) { kaldi++; console.log('  ✗ HATA', e.message); }
finally { await db.sorgu('rollback').catch(() => {}); }
console.log(`\n${gecti} geçti, ${kaldi} kaldı`); process.exit(kaldi ? 1 : 0);
