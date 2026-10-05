// KASA 957 (ortak özellikler: arkadaş daveti, rövanş, tepki, ustalık, gizli bot nabzı) SQL provası —
// TEK transaction, sonunda ROLLBACK (canlıya iz bırakmaz).
//
// Sıra: 1) BEGIN · 2) migration 957 (canlıdaysa yeniden derlenir, idempotent) · 3) davet zinciri (davet → bant/gönderdiklerim
// → çakışma → geri çek → kabul → aktif maç sınırı → engelleme) · 4) rövanş (iste / reddet / vazgeç / kabul / yeni maç,
// ezeli, engelli çift, 24 saat, bot hemen kabul) · 5) tepki kanalı · 6) kategori ustalığı + soru sayacı · 7) gizli bot nabzı
// · 8) yetkiler · 9) Düello daveti hâlâ bantta (regresyon) · ROLLBACK + kasa_* / ortak fonksiyonların md5'i eski mi.
//
// Kullanım: node araclar/kasa-ortak-sql-testi.mjs
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';

const MIG = new URL('../supabase/migrations/20260612000957_kasa_ortak_ozellikler.sql', import.meta.url);
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);
const json = async (s) => JSON.parse(await tek(s));
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
async function hata(sql) {
  await db.sorgu('savepoint s');
  try { await db.sorgu(sql); await db.sorgu('release savepoint s'); return null; }
  catch (e) { await db.sorgu('rollback to savepoint s'); return e.message; }
}
const ORTAK = ['bekleyen_davetlerim', 'gonderdigim_davetler', 'davet_geri_cek', 'davet_cakismasi', 'oyuncu_engelle',
  'bildirim_yaz', 'tepki_kanal_uyesi_mi', 'tepki_mac_modu', 'tepki_durumu', 'gizli_bot_nabiz'];
const md5Sorgu = `select coalesce(string_agg(p.oid::regprocedure::text || '=' || md5(pg_get_functiondef(p.oid)), ',' order by p.oid::regprocedure::text), '')
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and (p.proname like 'kasa\\_%' or p.proname = any(array[${ORTAK.map((x) => `'${x}'`).join(',')}]))`;

try {
  const md5Once = await tek(md5Sorgu);
  const kolonOnce = await tek(`select string_agg(column_name, ',' order by column_name) from information_schema.columns where table_name = 'kasa_maclari'`);
  const yayinOnce = await tek(`select count(*)::text from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'kasa_davetleri'`);

  await db.sorgu('begin');
  await db.sorgu("set local lock_timeout = '3s'");
  await db.sorgu("set local statement_timeout = '60s'");
  const H = await db.sorgu(`select id, takma_ad from profiles where takma_ad in ('ArayuzDenetim890', 'ArayuzDenetim648', 'ArayuzDenetim327') order by takma_ad`);
  const A = H.find((x) => x.takma_ad === 'ArayuzDenetim890')?.id;
  const B = H.find((x) => x.takma_ad === 'ArayuzDenetim648')?.id;
  const C = H.find((x) => x.takma_ad === 'ArayuzDenetim327')?.id;
  if (!A || !B || !C) throw new Error('test hesapları bulunamadı');
  const BOT = await tek(`select id from profiles where is_bot and bot_turu = 'gizli' and coalesce(bot_aktif, true) order by id limit 1`);
  const ACIK = await tek(`select id from profiles where is_bot and coalesce(acik_bot, false) and coalesce(bot_aktif, true) order by id limit 1`);
  console.log(`  A=${A} B=${B} C=${C} gizliBot=${BOT} açıkBot=${ACIK}`);

  console.log('1) Migration 957');
  await db.sorgu(fs.readFileSync(MIG, 'utf8'));
  ok('migration 957 hatasız derlendi', true);
  ok('kasa_davetleri Realtime yayınında', (await tek(`select count(*)::text from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'kasa_davetleri'`)) === '1');

  // Temiz başlangıç: A-B arkadaş, ikisinin de aktif Kasa maçı / bekleyen Kasa daveti yok, engel yok
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where durum = 'aktif' and (oyuncu1 in ('${A}', '${B}', '${C}') or oyuncu2 in ('${A}', '${B}', '${C}'))`);
  await db.sorgu(`update kasa_davetleri set durum = 'iptal' where durum = 'bekliyor' and (kuran in ('${A}', '${B}') or rakip in ('${A}', '${B}'))`);
  await db.sorgu(`delete from engellemeler where (engelleyen = '${A}' and engellenen = '${B}') or (engelleyen = '${B}' and engellenen = '${A}')`);
  await db.sorgu(`delete from friendships where (requester = '${A}' and addressee = '${B}') or (requester = '${B}' and addressee = '${A}')`);
  await db.sorgu(`insert into friendships (requester, addressee, durum) values ('${A}', '${B}', 'arkadas')`);
  await db.sorgu(`delete from rpc_sayac where user_id in ('${A}', '${B}', '${C}')`);   // hız sınırı sayaçları (yalnız bu işlemde)
  await db.sorgu(`update profiles set last_seen = now() where id in ('${A}', '${B}')`);

  // ---------------------------------------------------------------- 2) davet zinciri
  console.log('2) Arkadaşa Kasa daveti');
  await ben(A);
  let r = await json(`select kasa_davet_et('${B}', true)::text`);
  ok('A → B Kasa daveti (insan: maç kurulmaz, davet bekliyor)', r.davet_id && !r.kasa_id, JSON.stringify(r));
  const d1 = r.davet_id;
  await ben(B);
  let bant = await db.sorgu(`select tur, kayit_id::text, davet_eden::text from bekleyen_davetlerim()`);
  ok("B: bekleyen_davetlerim 'kasa' satırı (kayit_id = davet, davet eden A)", bant.some((x) => x.tur === 'kasa' && x.kayit_id === d1 && x.davet_eden === A), JSON.stringify(bant));
  ok("B: bildirim 'kasa_daveti' (yol /bildim/kasa)", (await tek(`select count(*)::text from bildirimler where user_id = '${B}' and tip = 'kasa_daveti' and yol = '/bildim/kasa' and not okundu`)) !== '0');
  await ben(A);
  const gon = await db.sorgu(`select tur, kayit_id::text, rakip::text from gonderdigim_davetler()`);
  ok("A: gonderdigim_davetler 'kasa' satırı (rakip B)", gon.some((x) => x.tur === 'kasa' && x.kayit_id === d1 && x.rakip === B), JSON.stringify(gon));
  const cak = await json(`select davet_cakismasi('${A}', '${B}')::text`);
  ok("davet_cakismasi: bekleyen ≥ 1, modlar 'kasa'", cak.bekleyen >= 1 && (cak.modlar || []).includes('kasa'), JSON.stringify(cak));
  ok('aynı çifte ikinci Kasa daveti reddedilir', /bekleyen bir Kasa davetin/.test(await hata(`select kasa_davet_et('${B}', true)`) || ''));
  ok('A daveti geri çeker (davet_geri_cek kasa) → true', (await tek(`select davet_geri_cek('kasa', '${d1}')::text`)) === 'true');
  ok('davet iptal, B\'nin okunmamış bildirimi silindi', (await tek(`select durum from kasa_davetleri where id = '${d1}'`)) === 'iptal'
    && (await tek(`select count(*)::text from bildirimler where user_id = '${B}' and tip = 'kasa_daveti' and not okundu`)) === '0');
  ok('B iptal edilmiş daveti kabul edemez', /zaten yanıtlanmış/.test((await ben(B), await hata(`select kasa_davet_cevap('${d1}', true)`)) || ''));
  await ben(B);
  ok('davet_geri_cek: başkasının davetini geri çekemez', /beklemede değil/.test(await hata(`select davet_geri_cek('kasa', '${d1}')`) || ''));

  await ben(A);
  const d2 = (await json(`select kasa_davet_et('${B}', false)::text`)).davet_id;
  await ben(B);
  const kid = await tek(`select kasa_davet_cevap('${d2}', true)::text`);
  let k = await json(`select row_to_json(x)::text from kasa_maclari x where id = '${kid}'`);
  ok('B kabul eder → Kasa maçı kuruldu (davetli, Serbest, iki oyuncu A-B)', k && k.durum === 'aktif' && k.davetli === true && k.dereceli === false
    && [k.oyuncu1, k.oyuncu2].sort().join() === [A, B].sort().join(), JSON.stringify(k && [k.durum, k.davetli, k.dereceli]));
  ok("A: bildirim 'kasa_kabul' maç yoluyla", (await tek(`select count(*)::text from bildirimler where user_id = '${A}' and tip = 'kasa_kabul' and yol = '/bildim/kasa/${kid}'`)) === '1');
  ok('kabul edilen davet bantta görünmez', !(await db.sorgu(`select tur from bekleyen_davetlerim()`)).some((x) => x.tur === 'kasa'));
  const cak2 = await json(`select davet_cakismasi('${A}', '${B}')::text`);
  ok("davet_cakismasi: aktif Kasa maçı → aktif true, aktif_mod 'kasa'", cak2.aktif === true && cak2.aktif_mod === 'kasa', JSON.stringify(cak2));
  ok('aktif Kasa maçı varken öteki mod davetini kabul etmek engellenir (davet_kabul_kontrol)', /devam eden bir oyunun var/.test(await hata(`select davet_kabul_kontrol('${A}')`) || ''));
  await ben(A);
  ok('aktif Kasa maçı varken yeni Kasa daveti reddedilir', /Devam eden bir Kasa maçı/.test(await hata(`select kasa_davet_et('${B}', true)`) || ''));

  // Engelleme: bekleyen Kasa davetini iptal eder
  await db.sorgu('savepoint eng');
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where id = '${kid}'`);
  const d3 = (await json(`select kasa_davet_et('${B}', true)::text`)).davet_id;
  await db.sorgu(`select oyuncu_engelle('${B}')`);
  ok('oyuncu_engelle: bekleyen Kasa daveti iptal', (await tek(`select durum from kasa_davetleri where id = '${d3}'`)) === 'iptal');
  ok('engelli çifte Kasa daveti gönderilemez', (await hata(`select kasa_davet_et('${B}', true)`)) !== null);
  await db.sorgu('rollback to savepoint eng');

  // ---------------------------------------------------------------- 3) rövanş
  console.log('3) Rövanş');
  await ben(A);
  ok('aktif maçta rövanş istenemez', /henüz bitmedi/.test(await hata(`select kasa_rovans_iste('${kid}')`) || ''));
  await db.sorgu(`update kasa_maclari set durum = 'bitti', kazanan = '${A}', sonuc_neden = 'hedef', bitis = now() where id = '${kid}'`);
  ok('A rövanş ister (insan rakip → null)', (await tek(`select coalesce(kasa_rovans_iste('${kid}')::text, 'null')`)) === 'null');
  await ben(B);
  let du = await json(`select kasa_durum('${kid}')::text`);
  ok('B: durumda rovans {isteyen A, gecerli, sure_sn 60}, ezeli (arkadaş) A önde', du.rovans?.isteyen === A && du.rovans?.gecerli === true && du.rovans?.sure_sn === 60
    && du.ezeli && Number(du.ezeli.rakip) >= 1, JSON.stringify([du.rovans, du.ezeli]));
  await ben(A);
  ok('isteyen kendi isteğini yanıtlayamaz', /Yanıtlanacak rövanş yok/.test(await hata(`select kasa_rovans_yanitla('${kid}', true)`) || ''));
  await ben(B);
  ok('B reddeder → null, istek temizlendi', (await tek(`select coalesce(kasa_rovans_yanitla('${kid}', false)::text, 'null')`)) === 'null'
    && (await tek(`select coalesce(rovans_isteyen::text, 'yok') from kasa_maclari where id = '${kid}'`)) === 'yok');
  await ben(A);
  await tek(`select coalesce(kasa_rovans_iste('${kid}')::text, 'null')`);
  await db.sorgu(`select kasa_rovans_iptal('${kid}')`);
  ok('A isteği geri çeker (Vazgeç)', (await tek(`select coalesce(rovans_isteyen::text, 'yok') from kasa_maclari where id = '${kid}'`)) === 'yok');
  await ben(B);
  ok('B geri çekilecek isteği olmadan iptal edemez', /Geri çekilecek/.test(await hata(`select kasa_rovans_iptal('${kid}')`) || ''));
  await ben(A);
  await tek(`select coalesce(kasa_rovans_iste('${kid}')::text, 'null')`);
  await db.sorgu(`update kasa_maclari set rovans_at = now() - interval '61 seconds' where id = '${kid}'`);
  await ben(B);
  ok('süresi geçen istek (61 sn) kabul edilemez', /süresi doldu/.test(await hata(`select kasa_rovans_yanitla('${kid}', true)`) || ''));
  await db.sorgu(`update kasa_maclari set rovans_at = now() where id = '${kid}'`);
  const yeni = await tek(`select kasa_rovans_yanitla('${kid}', true)::text`);
  const ky = await json(`select row_to_json(x)::text from kasa_maclari x where id = '${yeni}'`);
  const ke = await json(`select row_to_json(x)::text from kasa_maclari x where id = '${kid}'`);
  ok('B kabul eder → yeni maç: aynı iki oyuncu, aynı dereceli/serbest, davetli, onceki_id; eski satırda rovans_id', ky.durum === 'aktif'
    && [ky.oyuncu1, ky.oyuncu2].sort().join() === [A, B].sort().join() && ky.dereceli === ke.dereceli && ky.davetli === true
    && ky.onceki_id === kid && ke.rovans_id === yeni && Number(ky.kasa_tavan) === 60 && Number(ky.devam_carpan) === 2,
    JSON.stringify([ky.durum, ky.davetli, ky.onceki_id, ke.rovans_id, ky.kasa_tavan, ky.devam_carpan]));
  await ben(A);
  ok('kabulden sonra isteğe tekrar basmak aynı rövanş maçını döndürür', (await tek(`select kasa_rovans_iste('${kid}')::text`)) === yeni);
  du = await json(`select kasa_durum('${kid}')::text`);
  ok("A: eski maç durumunda rovans.id = yeni maç", du.rovans?.id === yeni, JSON.stringify(du.rovans));
  // Engelli çift / 24 saat
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where id = '${yeni}'`);
  const kid2 = await tek(`select kasa_olustur('${A}', '${B}', true, true)::text`);
  await db.sorgu(`update kasa_maclari set durum = 'bitti', kazanan = '${B}', bitis = now() where id = '${kid2}'`);
  await db.sorgu('savepoint eng2');
  await db.sorgu(`insert into engellemeler (engelleyen, engellenen) values ('${B}', '${A}') on conflict do nothing`);
  ok('engelli çift rövanş isteyemez', /oynayamazsın/.test(await hata(`select kasa_rovans_iste('${kid2}')`) || ''));
  await db.sorgu('rollback to savepoint eng2');
  await db.sorgu(`update kasa_maclari set bitis = now() - interval '25 hours' where id = '${kid2}'`);
  ok('maç bitişinden 24 saat sonra rövanş istenemez', /Rövanş süresi doldu/.test(await hata(`select kasa_rovans_iste('${kid2}')`) || ''));
  ok('üçüncü kişi rövanş isteyemez', /Bu maçta değilsin/.test((await ben(C), await hata(`select kasa_rovans_iste('${kid2}')`)) || ''));
  // Bot rövanşı: hemen kabul
  await ben(A);
  const kb = await tek(`select kasa_olustur('${A}', '${BOT}', true, false)::text`);
  await db.sorgu(`update kasa_maclari set durum = 'bitti', kazanan = '${A}', bitis = now() where id = '${kb}'`);
  const kbYeni = await tek(`select coalesce(kasa_rovans_iste('${kb}')::text, 'null')`);
  const kbr = kbYeni !== 'null' ? await json(`select row_to_json(x)::text from kasa_maclari x where id = '${kbYeni}'`) : null;
  ok('gizli bota rövanş isteği hemen kabul: yeni maç A-bot, onceki_id', !!kbr && kbr.durum === 'aktif' && [kbr.oyuncu1, kbr.oyuncu2].includes(BOT) && kbr.onceki_id === kb,
    JSON.stringify(kbr && [kbr.durum, kbr.onceki_id]));

  // ---------------------------------------------------------------- 4) tepki
  console.log('4) Tepki (emoji) kanalı');
  const kanal = `tepki-kasa-${kbYeni}`;
  ok('A: tepki-kasa kanal üyesi', (await tek(`select tepki_kanal_uyesi_mi('${kanal}')::text`)) === 'true');
  await ben(C);
  ok('C (maçta değil): üye değil', (await tek(`select tepki_kanal_uyesi_mi('${kanal}')::text`)) === 'false');
  ok('bozuk kanal adı reddedilir', (await tek(`select tepki_kanal_uyesi_mi('tepki-kasa-x')::text`)) === 'false');
  await ben(A);
  let tdu = await json(`select tepki_durumu('kasa', '${kbYeni}')::text`);
  ok("tepki_durumu('kasa'): kanal tepki-kasa-<id>, mod kasa, açık modlar listesine bağlı (kasa listede yok → kapalı)", tdu.kanal === kanal && tdu.mod === 'kasa' && tdu.acik === false, JSON.stringify(tdu));
  if (ACIK) {
    await db.sorgu(`update kasa_maclari set durum = 'iptal' where id = '${kbYeni}'`);
    const ka = await tek(`select kasa_olustur('${A}', '${ACIK}', false, true)::text`);
    tdu = await json(`select tepki_durumu('kasa', '${ka}')::text`);
    ok("açık botla Kasa antrenmanı: mod 'antrenman', tepki açık (ayar tepki_acik_modlar)", tdu.mod === 'antrenman' && tdu.acik === true && tdu.kanal === `tepki-kasa-${ka}`, JSON.stringify(tdu));
    await db.sorgu(`update kasa_maclari set durum = 'iptal' where id = '${ka}'`);
  }
  const kd = await tek(`select id::text from duellolar where durum = 'bitti' order by bitis desc nulls last limit 1`);
  if (kd) {
    const [o1] = await db.sorgu(`select oyuncu1::text o from duellolar where id = '${kd}'`);
    await ben(o1.o);
    ok('Düello tepki kanalı hâlâ çalışır (regresyon)', (await tek(`select tepki_kanal_uyesi_mi('tepki-duello-${kd}')::text`)) === 'true');
    await ben(A);
  }

  // ---------------------------------------------------------------- 5) kategori ustalığı + soru sayacı
  console.log('5) Kategori ustalığı + soru sayacı');
  const kc = await tek(`select kasa_olustur('${A}', '${B}', true, true)::text`);
  await db.sorgu(`update kasa_maclari set faz_bitis = now() - interval '1 second' where id = '${kc}'`);
  await db.sorgu(`select kasa_ilerlet('${kc}')`);
  const [s] = await db.sorgu(`select q.id::text, q.kategori, q.dogru_cevap::int dc, q.cevap_sayisi::int cs, q.dogru_sayisi::int ds
     from kasa_maclari k join questions q on q.id = k.soru_id where k.id = '${kc}'`);
  const katOnce = Number(await tek(`select coalesce((select dogru_sayisi from kategori_dogru where user_id = '${A}' and kategori = '${s.kategori}'), 0)::text`));
  await db.sorgu(`update kasa_maclari set cevaplar = jsonb_build_object('${A}', jsonb_build_object('cevap', ${s.dc}, 'at', now()),
     '${B}', jsonb_build_object('cevap', ${(Number(s.dc) + 1) % 4}, 'at', now())) where id = '${kc}'`);
  await db.sorgu(`select kasa_cozumle('${kc}')`);
  const katSonra = Number(await tek(`select coalesce((select dogru_sayisi from kategori_dogru where user_id = '${A}' and kategori = '${s.kategori}'), 0)::text`));
  const [s2] = await db.sorgu(`select cevap_sayisi::int cs, dogru_sayisi::int ds from questions where id = '${s.id}'`);
  k = await json(`select row_to_json(x)::text from kasa_maclari x where id = '${kc}'`);
  ok(`A doğru → kategori_dogru +1 (${katOnce} → ${katSonra}); kural aynı: kasa 2, sahip A`, katSonra === katOnce + 1 && k.kasa === 2 && k.sahip === A, JSON.stringify([katOnce, katSonra, k.kasa, k.sahip === A]));
  ok(`soru sayacı: cevap +2, doğru +1 (${s.cs}/${s.ds} → ${s2.cs}/${s2.ds})`, Number(s2.cs) === Number(s.cs) + 2 && Number(s2.ds) === Number(s.ds) + 1);
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where id = '${kc}'`);

  // ---------------------------------------------------------------- 6) gizli bot nabzı
  console.log('6) Gizli bot nabzı');
  const kn = await tek(`select kasa_olustur('${A}', '${BOT}', true, false)::text`);
  await db.sorgu(`update profiles set last_seen = now() - interval '1 hour' where id = '${BOT}'`);
  await db.sorgu(`select gizli_bot_nabiz()`);
  ok('aktif Kasa maçındaki gizli bot çevrimiçi (last_seen = şimdi)', (await tek(`select (last_seen >= now() - interval '1 second')::text from profiles where id = '${BOT}'`)) === 'true');
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where id = '${kn}'`);

  // ---------------------------------------------------------------- 7) yetkiler
  console.log('7) Yetkiler');
  await db.sorgu('savepoint r');
  await db.sorgu('set local role authenticated');
  const y1 = await hata(`select kasa_rovans_baslat('${kid}')`);
  const y2 = await hata(`select kasa_rovans_iste('00000000-0000-0000-0000-000000000000')`);
  await db.sorgu('rollback to savepoint r');
  await db.sorgu('savepoint r');
  await db.sorgu('set local role anon');
  const y3 = await hata(`select kasa_rovans_iste('${kid}')`);
  const y4 = await hata(`select kasa_rovans_yanitla('${kid}', true)`);
  await db.sorgu('rollback to savepoint r');
  ok('authenticated: kasa_rovans_baslat (iç) çağrılamaz', /permission denied/.test(y1 || ''), y1);
  ok('authenticated: kasa_rovans_iste çağrılır (izin hatası yok)', !/permission denied/.test(y2 || ''), y2);
  ok('anon: kasa_rovans_iste / yanitla çağrılamaz', /permission denied/.test(y3 || '') && /permission denied/.test(y4 || ''), [y3, y4].join(' | '));

  // ---------------------------------------------------------------- 8) regresyon: Düello daveti bantta
  console.log('8) Regresyon: Düello daveti');
  await db.sorgu('savepoint dd');
  await db.sorgu(`update duellolar set durum = 'iptal' where durum = 'aktif' and (oyuncu1 in ('${A}', '${B}') or oyuncu2 in ('${A}', '${B}'))`);
  await db.sorgu(`update duello_davetleri set durum = 'iptal' where durum = 'bekliyor' and (kuran in ('${A}', '${B}') or rakip in ('${A}', '${B}'))`);
  // duello_davet_et B'nin Düello kilidine takılabilir: bekleyen satır doğrudan yazılır (bant sorgusu sınanır)
  const ddh = await hata(`insert into duello_davetleri (kuran, rakip, dereceli) values ('${A}', '${B}', true)`);
  await ben(B);
  const bant2 = await db.sorgu(`select tur from bekleyen_davetlerim()`);
  ok("Düello daveti hâlâ bantta ('duello')", ddh === null && bant2.some((x) => x.tur === 'duello'), ddh || JSON.stringify(bant2));
  await db.sorgu('rollback to savepoint dd');

  await db.sorgu('rollback');
  console.log('9) ROLLBACK sonrası');
  ok('kasa_* + ortak fonksiyonlar (imza + md5) eski tanımda', (await tek(md5Sorgu)) === md5Once);
  ok('kasa_maclari kolonları eski', (await tek(`select string_agg(column_name, ',' order by column_name) from information_schema.columns where table_name = 'kasa_maclari'`)) === kolonOnce);
  ok('Realtime yayını eski', (await tek(`select count(*)::text from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'kasa_davetleri'`)) === yayinOnce);
} catch (e) {
  kaldi++; console.log('  ✗ HATA:', e.message);
  try { await db.sorgu('rollback'); } catch { /* işlem yok */ }
} finally {
  console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı`);
  await db.kapat();
  if (kaldi) process.exitCode = 1;
}
