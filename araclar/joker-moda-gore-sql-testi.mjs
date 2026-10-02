// Joker paketleri moda göre + Seri Koruma kaldırma (910) SQL provası — tek transaction, sonunda ROLLBACK
// (canlıya iz bırakmaz). Sınar: dört paketin toplamı (30/100) ve fiyatı (Σ tek fiyat × 10'lu oran, tek tek
// alımdan ucuz) · eski paketler pasif ama duruyor · satın alma her anahtarı doğru envanter satırına yazar ve
// coin'i paket fiyatı kadar düşürür · seri kaçırılan günde sıfırlanır, seri koruma HARCANMAZ · envanterim /
// seri_durumum / başlangıç stoğu seri koruma içermez · işlev yetkileri (ACL) değişmedi.
// Kullanım: node araclar/joker-moda-gore-sql-testi.mjs [migration.sql ...]  (verilenler önce uygulanır)
import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi, alintila as a } from './pg-mini.mjs';

const MIGLER = process.argv.slice(2);
const PAKETLER = ['klasik_30', 'klasik_100', 'duello_30', 'duello_100'];
const ESKI = ['joker_10', 'joker_30', 'joker_100', 'seri_koruma_3'];
const ISLEVLER = ['seri_kontrol()', 'seri_durumum()', 'envanterim()', 'baslangic_jokerleri_ver(uuid)',
  'baslangic_jokerleri_toplu_ver()', 'joker_coin_ile_al(text)'];
const SIRA = ['elli', 'sure', 'soru_degistir', 'zaman_baskisi', 'sigorta', 'cifte_puan', 'ikinci_sans', 'baskin', 'kalkan'];

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);
const json = async (s) => JSON.parse(await tek(s));
const acl = () => tek(`select md5(string_agg(p.oid::regprocedure::text || coalesce(p.proacl::text, '-') || p.prosecdef::text, '|' order by p.oid::regprocedure::text))
  from pg_proc p where p.oid = any (array[${ISLEVLER.map((f) => `'public.${f}'::regprocedure`).join(',')}])`);
/** İfade hata vermeli; işlem bozulmasın diye savepoint içinde. Hata metnini döndürür (vermediyse null). */
const hata = async (s) => {
  await db.sorgu('savepoint h');
  try { await db.sorgu(s); await db.sorgu('release savepoint h'); return null; }
  catch (e) { await db.sorgu('rollback to savepoint h'); return String(e.message ?? e); }
};

try {
  await db.sorgu('begin');
  await db.sorgu("set local statement_timeout = '120s'");
  const aclOnce = await acl();
  for (const m of MIGLER) await db.sorgu(fs.readFileSync(m, 'utf8'));
  await db.sorgu(`update public.oyun_ayarlari set deger = '0'::jsonb where anahtar = 'jokerler_ucretsiz'`);

  console.log('Paketler');
  const fiyat = await json(`select json_object_agg(k.tur, public.joker_fiyati(k.tur))::text from public.skill_katalogu k where k.aktif`);
  const oran = Number(await tek(`select public.ayar_sayi('coin_joker_elli_10', null)::numeric / (10 * public.ayar_sayi('coin_joker_elli', null))`));
  const paket = await json(`select json_object_agg(urun_id, json_build_object('icerik', icerik, 'fiyat', coin_fiyat, 'aktif', aktif,
    'anahtar', fiyat_anahtari, 'ad', ad))::text from public.joker_paketleri where urun_id = any (${a(`{${[...PAKETLER, ...ESKI].join(',')}}`)}::text[])`);
  ok("10'lu paket oranı %15 indirim (0,85)", Math.abs(oran - 0.85) < 1e-9, oran);
  const tablo = [];
  for (const id of PAKETLER) {
    const p = paket[id];
    if (!p) { ok(`${id} var`, false); continue; }
    const adet = Object.values(p.icerik).reduce((t, n) => t + Number(n), 0);
    const tekTek = Object.entries(p.icerik).reduce((t, [k, n]) => t + Number(fiyat[k]) * Number(n), 0);
    const beklenen = Math.floor(tekTek * oran / 5) * 5;
    ok(`${id}: toplam ${id.endsWith('_100') ? 100 : 30} joker`, adet === (id.endsWith('_100') ? 100 : 30), adet);
    ok(`${id}: fiyat ${p.fiyat} = ⌊${tekTek} × ${oran}⌋₅`, Number(p.fiyat) === beklenen, beklenen);
    ok(`${id}: tek tek alımdan ucuz (${p.fiyat} < ${tekTek})`, Number(p.fiyat) < tekTek);
    ok(`${id}: aktif, sabit fiyatlı, bütün anahtarlar aktif joker`, p.aktif === true && p.anahtar === null && Object.keys(p.icerik).every((k) => Number(fiyat[k]) > 0));
    const yalniz = id.startsWith('klasik') ? ['baskin', 'kalkan'] : ['sigorta', 'cifte_puan'];
    ok(`${id}: öbür modun jokeri yok`, yalniz.every((k) => !(k in p.icerik)));
    tablo.push({ paket: p.ad, ...Object.fromEntries(SIRA.map((k) => [k, p.icerik[k] ?? '—'])), toplam: adet, tek_tek: tekTek, fiyat: Number(p.fiyat) });
  }
  console.table(tablo);
  for (const id of ESKI) ok(`${id}: satır duruyor, pasif`, paket[id] && paket[id].aktif === false);

  console.log('Satın alma');
  const U = await tek('select gen_random_uuid()');
  await db.sorgu(`insert into auth.users (id) values (${a(U)})`);
  await db.sorgu(`update public.profiles set username = ${a(`test_910_${U.slice(0, 8)}`)} where id = ${a(U)}`);
  const env = async () => json(`select coalesce(json_object_agg(tur, adet), '{}')::text from public.joker_envanter where user_id = ${a(U)}`);
  const coin = async () => Number(await tek(`select coin from public.profiles where id = ${a(U)}`));
  ok('yeni hesaba seri koruma verilmez', !('seri_koruma' in await env()));
  await db.sorgu(`select set_config('app.coin_izin', '1', true)`);
  await db.sorgu(`update public.profiles set coin = 50000 where id = ${a(U)}`);
  await db.sorgu(`select set_config('request.jwt.claims', ${a(JSON.stringify({ sub: U, role: 'authenticated' }))}, true)`);
  for (const id of PAKETLER) {
    const p = paket[id];
    const e0 = await env(); const c0 = await coin();
    await db.sorgu(`select * from public.joker_coin_ile_al(${a(id)})`);
    const e1 = await env(); const c1 = await coin();
    const artis = Object.fromEntries(Object.keys(e1).map((k) => [k, (e1[k] ?? 0) - (e0[k] ?? 0)]).filter(([, n]) => n !== 0));
    ok(`${id}: envanter tam içerik kadar arttı`, JSON.stringify(Object.entries(artis).sort()) === JSON.stringify(Object.entries(p.icerik).map(([k, n]) => [k, Number(n)]).sort()), JSON.stringify(artis));
    ok(`${id}: coin ${p.fiyat} düştü`, c0 - c1 === Number(p.fiyat), c0 - c1);
  }
  for (const id of ESKI) ok(`${id}: satın alınamaz`, /Paket bulunamadı/.test(await hata(`select * from public.joker_coin_ile_al(${a(id)})`) ?? ''));
  const tekOnce = await env();
  for (const t of ['baskin', 'kalkan', 'zaman_baskisi', 'sigorta', 'cifte_puan', 'ikinci_sans']) await db.sorgu(`select * from public.joker_tek_al(${a(t)})`);
  const tekSonra = await env();
  ok('tek alım: baskin, kalkan, zaman_baskisi, sigorta, cifte_puan, ikinci_sans kendi satırına +1',
    ['baskin', 'kalkan', 'zaman_baskisi', 'sigorta', 'cifte_puan', 'ikinci_sans'].every((t) => tekSonra[t] - tekOnce[t] === 1));

  console.log('Seri koruma');
  const e = await json(`select json_agg(tur)::text from public.envanterim()`);
  ok('envanterim seri_koruma döndürmez, aktif jokerlerin hepsini döndürür', !e.includes('seri_koruma') && SIRA.every((k) => e.includes(k)), e.join(','));
  await db.sorgu(`insert into public.joker_envanter (user_id, tur, adet) values (${a(U)}, 'seri_koruma', 5)
    on conflict (user_id, tur) do update set adet = 5`);
  const islemOnce = await tek(`select count(*) from public.joker_islemleri where tur = 'seri_koruma'`);
  ok('seri_durumum koruma = 0 (envanterde 5 varken)', (await tek(`select koruma from public.seri_durumum()`)) === '0');
  await db.sorgu(`update public.profiles set seri_gun = 7, seri = 7,
      seri_son_gun = (now() at time zone 'Europe/Istanbul')::date - 2, son_seri_tarihi = (now() at time zone 'Europe/Istanbul')::date - 2
    where id = ${a(U)}`);
  await db.sorgu(`select set_config('request.jwt.claims', '', true)`);
  await db.sorgu('select public.seri_kontrol()');
  ok('1 gün kaçırıldı + koruma var → seri yine de sıfırlanır', (await tek(`select seri_gun from public.profiles where id = ${a(U)}`)) === '0');
  ok('seri koruma harcanmadı (envanter 5)', (await env()).seri_koruma === 5);
  ok('seri koruma için hiç işlem kaydı yazılmadı', (await tek(`select count(*) from public.joker_islemleri where tur = 'seri_koruma'`)) === islemOnce);
  ok('hiçbir işlev gövdesi seri korumayı okumuyor/harcamıyor',
    (await tek(`select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
      and p.proname in ('seri_kontrol', 'seri_durumum', 'envanterim', 'baslangic_jokerleri_ver', 'baslangic_jokerleri_toplu_ver')
      and strpos(p.prosrc, 'seri_koruma') > 0`)) === '0');
  ok('mevcut envanter satırları silinmedi', Number(await tek(`select count(*) from public.joker_envanter where tur = 'seri_koruma'`)) > 1);

  console.log('Yetkiler');
  ok('işlev yetkileri (ACL / security definer) değişmedi', (await acl()) === aclOnce);
} catch (e) {
  kaldi++;
  console.log('HATA', e.message);
} finally {
  try { await db.sorgu('rollback'); } finally { await db.kapat(); }
}
console.log(`\n${gecti} geçti, ${kaldi} kaldı — ROLLBACK edildi.`);
process.exit(kaldi ? 1 : 0);
