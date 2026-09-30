// 703 (Kedili Genç geri, Sporcu çıkar) SQL provası — tek transaction, sonunda ROLLBACK.
// Kullanım: node araclar/avatar-703-sql-testi.mjs [--uygula]   (--uygula yoksa migration'ı da transaction içinde dener)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const A = '5b555bd3-9371-4f35-90a5-39289111335e';   // insan test hesabı (sahip değil)
const KEDILI = '/avatars/pro2/kedili-genc-y36.svg', SPOR = '/avatars/pro2/sporcu-y09.svg';
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, k, ek = '') => { if (k) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
async function hata(sql) { await db.sorgu('savepoint s'); try { await db.sorgu(sql); await db.sorgu('release savepoint s'); return null; } catch (e) { await db.sorgu('rollback to savepoint s'); return e.message; } }
const tek = (s) => db.tek(s);
try {
  await db.sorgu('begin');
  const onceBot = await tek(`select count(*) from profiles where coalesce(is_bot,false) and avatar_url='${SPOR}'`);
  // Takılı senaryo: test hesabı Sporcu'yu takılı kullanıyor
  await db.sorgu(`update profiles set avatar_url='${SPOR}' where id='${A}'`);
  await db.sorgu(fs.readFileSync('supabase/migrations/20260612000703_avatar_kedili_genc_geri_sporcu_cikar.sql', 'utf8'));
  await ben(A);
  ok('aktif+girsin katalog = 31', await tek(`select count(*) from avatar_katalogu where aktif and onay='girsin'`) === '31');
  ok('Kedili Genç katalogda', await tek(`select count(*) from avatar_katalogu_oyun() where url='${KEDILI}'`) === '1');
  ok('Sporcu katalogda yok', await tek(`select count(*) from avatar_katalogu_oyun() where url='${SPOR}'`) === '0');
  ok('katalog 31 satır', await tek(`select count(*) from avatar_katalogu_oyun()`) === '31');
  ok('Sporcu seçilemez', /kullanılamıyor/.test(await hata(`select avatar_onayla('${SPOR}')`) ?? ''));
  ok('takılı Sporcu BOZULMADI (avatar_url aynı)', await tek(`select avatar_url from profiles where id='${A}'`) === SPOR);
  ok('Kedili Genç seçilebilir', await hata(`select avatar_onayla('${KEDILI}')`) === null);
  ok('seçim yazıldı', await tek(`select avatar_url from profiles where id='${A}'`) === KEDILI);
  ok('Kedili fiyat/edinme/açılış değişmedi', await tek(`select edinme||'|'||coalesce(acilis_zamani::text,'-') from avatar_nitelikleri where url='${KEDILI}'`) === 'ucretsiz|-');
  ok('Sporcu nitelik satırı duruyor', await tek(`select count(*) from avatar_nitelikleri where url='${SPOR}'`) === '1');
  ok('kapalı avatarlı bot yok', await tek(`select count(*) from profiles p join avatar_katalogu k on k.url=p.avatar_url where coalesce(p.is_bot,false) and not k.aktif`) === '0');
  console.log('  (bilgi) önceki Sporcu botu:', onceBot);
  ok('yetkiler değişmedi: avatar_onayla anon yok', (await tek(`select has_function_privilege('anon','public.avatar_onayla(text)','execute')`)) === 'f');
} finally {
  try { await db.sorgu('rollback'); } finally { await db.kapat(); }
}
console.log(`\n${gecti} geçti, ${kaldi} kaldı (ROLLBACK yapıldı)`);
process.exit(kaldi ? 1 : 0);
