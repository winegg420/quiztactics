// Posta kutusu (1060) — tek transaction, sonunda ROLLBACK (canlıya HİÇBİR ŞEY yazılmaz). Tek prova, döngü yok.
// Sınar: sahip olmayan gönderemez · tek oyunculuk ödüllü posta yalnız hedefe görünür · ödül bir kez (ikinci çağrı reddedilir) ·
// coin/joker/avatar (zaten sende) · bitmiş posta alınamaz · herkese posta tek satır, okuyunca satır açılır · bot göremez.
// Kullanım: node araclar/posta-sql-testi.mjs  (migration canlıdaysa --canli: yeniden uygulamaz)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIG = 'supabase/migrations/20260612001060_posta_kutusu.sql';
const CANLI = process.argv.includes('--canli');

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const ben = (id) => db.sorgu(`select set_config('request.jwt.claim.sub', '${id}', true), set_config('request.jwt.claims', '{"sub":"${id}","role":"authenticated"}', true)`);
const tek = (s) => db.tek(s);
const dene = async (s) => {
  await db.sorgu('savepoint d');
  try { const r = await db.tek(s); await db.sorgu('release savepoint d'); return { r }; }
  catch (e) { await db.sorgu('rollback to savepoint d'); return { hata: e.message }; }
};

try {
  await db.sorgu('begin');
  await db.sorgu(`set local lock_timeout = '5s'`);
  await db.sorgu(`set local statement_timeout = '60s'`);
  if (!CANLI) await db.sorgu(fs.readFileSync(MIG, 'utf8'));
  const SAHIP = JSON.parse(await tek(`select deger::text from oyun_ayarlari where anahtar='sahip_kullanicilar'`))[0];
  const A = await tek('select gen_random_uuid()::text');
  const B = await tek('select gen_random_uuid()::text');
  for (const [u, ad] of [[A, 'a'], [B, 'b']]) {
    await db.sorgu(`insert into auth.users (id) values ('${u}')`);
    await db.sorgu(`update profiles set username = 'posta_${ad}_${u.slice(0, 6)}' where id = '${u}'`);
  }
  const BOT = await tek(`select id::text from profiles where is_bot limit 1`);
  const avatar = await tek(`select anahtar from avatar_katalogu where aktif order by sira limit 1`);
  await db.sorgu(`insert into oyuncu_avatarlari (user_id, avatar, kaynak) values ('${A}', '${avatar}', 'dukkan') on conflict do nothing`);

  const gonder = (tur, hedef, oyuncu, lig, oduller) => `select posta_gonder('${tur}', '${hedef}', ${oyuncu ? `'${oyuncu}'` : 'null'}, ${lig ? `'${lig}'` : 'null'},
    'Deneme', 'Test', 'Merhaba', '', '${JSON.stringify(oduller)}'::jsonb, now() + interval '7 days')::text`;

  await ben(A);
  ok('sahip olmayan gönderemez', /Yetkin yok/.test((await dene(gonder('odullu', 'oyuncu', A, null, [{ tur: 'coin', miktar: 1 }]))).hata ?? ''));
  ok('sahip olmayan arayamaz', /Yetkin yok/.test((await dene(`select count(*) from posta_oyuncu_ara('posta')`)).hata ?? ''));

  await ben(SAHIP);
  const odul = [{ tur: 'coin', miktar: 1 }, { tur: 'joker', anahtar: 'elli', miktar: 1 }, { tur: 'avatar', anahtar: avatar }];
  const P = (await dene(gonder('odullu', 'oyuncu', A, null, odul))).r;
  ok('sahip ödüllü posta gönderir', !!P, P);
  ok('bota gönderilemez', /Oyuncu bulunamadı/.test((await dene(gonder('odullu', 'oyuncu', BOT, null, [{ tur: 'coin', miktar: 1 }]))).hata ?? ''));
  ok('aynı kalem iki kez reddedilir', /iki kez/.test((await dene(gonder('odullu', 'oyuncu', A, null, [{ tur: 'coin', miktar: 1 }, { tur: 'coin', miktar: 2 }]))).hata ?? ''));
  ok('ödülsüz ödüllü posta reddedilir', /en az bir/.test((await dene(gonder('odullu', 'oyuncu', A, null, []))).hata ?? ''));
  ok('arama oyuncuyu bulur', Number(await tek(`select count(*) from posta_oyuncu_ara('posta_a_${A.slice(0, 6)}')`)) === 1);
  const H = (await dene(gonder('duyuru', 'herkes', null, null, []))).r;
  ok('herkese duyuru tek satır', !!H && Number(await tek(`select count(*) from posta where id='${H}'`)) === 1 && Number(await tek(`select count(*) from posta_durum where posta_id='${H}'`)) === 0);

  await ben(B);
  const kutuB = JSON.parse(await tek(`select posta_kutusu()::text`));
  ok('B tek oyunculuk postayı görmez, duyuruyu görür', !kutuB.postalar.some((p) => p.id === P) && kutuB.postalar.some((p) => p.id === H));
  ok('B başkasının ödülünü alamaz', /bulunamadı/.test((await dene(`select posta_odul_al('${P}')::text`)).hata ?? ''));

  await ben(A);
  const kutuA = JSON.parse(await tek(`select posta_kutusu()::text`));
  const pA = kutuA.postalar.find((p) => p.id === P);
  ok('A ödüllü postayı en üstte görür', kutuA.postalar[0]?.id === P && pA?.okundu === false);
  await tek(`select posta_kutusu_oku()::text`);
  ok('okuyunca satır açılır (duyuru dahil)', Number(await tek(`select count(*) from posta_durum where user_id='${A}' and okundu is not null`)) === 2);
  const coin0 = Number(await tek(`select coin from profiles where id='${A}'`));
  const j0 = Number(await tek(`select coalesce(sum(adet),0) from joker_envanter where user_id='${A}' and tur='elli'`));
  const al1 = await dene(`select posta_odul_al('${P}')::text`);
  ok('ödül alınır', !!al1.r, al1.hata);
  const ver = JSON.parse(al1.r ?? '{"verilen":[]}').verilen;
  ok('avatar zaten sende işaretlenir', ver.find((v) => v.tur === 'avatar')?.zaten_sende === true);
  ok('coin +1', Number(await tek(`select coin from profiles where id='${A}'`)) === coin0 + 1);
  ok('joker +1', Number(await tek(`select coalesce(sum(adet),0) from joker_envanter where user_id='${A}' and tur='elli'`)) === j0 + 1);
  ok('ikinci basış reddedilir', /zaten aldın/.test((await dene(`select posta_odul_al('${P}')::text`)).hata ?? ''));
  ok('coin ikinci kez artmaz', Number(await tek(`select coin from profiles where id='${A}'`)) === coin0 + 1);

  await ben(SAHIP);
  const P2 = (await dene(gonder('odullu', 'oyuncu', A, null, [{ tur: 'elmas', miktar: 1 }]))).r;
  const say = JSON.parse(await tek(`select posta_gonderilenler()::text`)).find((p) => p.id === P);
  ok('gönderilenler: okuyan 1, alan 1', say && Number(say.okuyan) === 1 && Number(say.alan) === 1);
  await tek(`select posta_bitir('${P2}')::text`);
  await ben(A);
  ok('bitmiş postanın ödülü alınamaz', /süresi doldu/.test((await dene(`select posta_odul_al('${P2}')::text`)).hata ?? ''));
  ok('bitmiş posta listeden kalkar', !JSON.parse(await tek(`select posta_kutusu()::text`)).postalar.some((p) => p.id === P2));

  await ben(BOT);
  ok('bot posta görmez', JSON.parse(await tek(`select posta_kutusu()::text`)).postalar.length === 0);
  ok('anon yetkisi yok', (await tek(`select has_function_privilege('anon', 'public.posta_kutusu()', 'execute')::text`)) === 'false');
  ok('istemci tabloyu okuyamaz', (await tek(`select has_table_privilege('authenticated', 'public.posta', 'select')::text`)) === 'false');
} catch (e) {
  kaldi++; console.log('  ✗ beklenmeyen hata:', e.message);
} finally {
  await db.sorgu('rollback');
  console.log(`\n${gecti} geçti · ${kaldi} kaldı (ROLLBACK)`);
  process.exit(kaldi ? 1 : 0);
}
