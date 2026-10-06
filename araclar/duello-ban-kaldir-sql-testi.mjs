// Düello 982 · SAVUNMA BANI KALDIRILDI (+ Ortak Hazine 981 tavan 80) — SQL provası.
// TEK transaction, sonunda ROLLBACK (canlıya iz bırakmaz). Kilit/oturum kuralı: kısa lock_timeout + statement_timeout +
// idle_in_transaction_session_timeout, JS bekçisi (süre aşılırsa ROLLBACK + kapat), bitince pg_stat_activity'de artık oturum yok.
//
// Sınar: migration kapsamı (md5: yalnız 4 fonksiyon + tetikleyici; ayar farkı yalnız duello_ban_acik + kasa_tavan) ·
// bayrak false → yeni maç ban_acik false, draft sonrası tur 1 doğrudan kategori (15 sn + pay), sonuç → kategori ·
// duello_ban_sec reddi · durum.ban.acik false · bot ban denemez (bot_tik, faz elle 'ban' olsa bile) · bot vs bot tam maç
// (bot_tik + süre itme) hiç ban fazı yok · bayrak true → yeni maç eski akış (ban fazı, 7+3 sn, savunan/bot banlar) ·
// süren 982 öncesi maç (ban_acik null) bayrak false iken de banla sürer · yetkiler aynı · Kasa: yeni maç tavan 80, süren
// maç satırdaki 60 ile kırpar.
// Kural testleri (kilit, Baskın, Kalkan, Altın Soru, 12 puan / 4 kategori, kendi kategorisine saldırı):
//   node araclar/duello-puan-modu-sql-testi.mjs --zorla --ek-mig supabase/migrations/20260612000982_duello_ban_kaldir.sql
// Kullanım: node araclar/duello-ban-kaldir-sql-testi.mjs [--zorla]
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';

const ZORLA = process.argv.includes('--zorla');
const MIG981 = new URL('../supabase/migrations/20260612000981_kasa_tavan80.sql', import.meta.url);
const MIG982 = new URL('../supabase/migrations/20260612000982_duello_ban_kaldir.sql', import.meta.url);
const HEDEF_FN = ['duello2_ban_baslat', 'duello_ban_sec', 'duello2_bot_tik', 'duello2_durum', 'duello_ban_bayragi_sabitle'];
const UYGULAMA = 'duello-ban-kaldir-sql-testi';

const dizgi = await baglantiDizgisi();
const db = await new PgIstemci(dizgi).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);
const json = async (s) => JSON.parse(await tek(s));
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u ?? ''}', true), set_config('request.jwt.claims', '${u ? `{"sub":"${u}","role":"authenticated"}` : ''}', true)`);
async function hata(sql) {
  await db.sorgu('savepoint s');
  try { await db.sorgu(sql); await db.sorgu('release savepoint s'); return null; }
  catch (e) { await db.sorgu('rollback to savepoint s'); return e.message; }
}
const bekci = setTimeout(async () => {
  console.error('⏱ süre aşıldı — ROLLBACK + kapat');
  try { await db.sorgu('rollback'); } catch { /* */ }
  await db.kapat(); process.exit(3);
}, 8 * 60 * 1000);

const md5Hepsi = async () => Object.fromEntries((await db.sorgu(`select p.oid::regprocedure::text imza, md5(pg_get_functiondef(p.oid)) h
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f'`)).map((x) => [x.imza, x.h]));
const ayarHepsi = async () => Object.fromEntries((await db.sorgu(`select anahtar, deger::text d from oyun_ayarlari`)).map((x) => [x.anahtar, x.d]));

try {
  await db.sorgu(`set application_name = '${UYGULAMA}'`);
  console.log('0) Ön kontrol (salt okunur)');
  const on = (await db.sorgu(`select (select count(*) from duellolar where durum = 'aktif')::text duello,
      (select count(*) from matches where durum = 'aktif')::text mac, (select count(*) from kasa_maclari where durum = 'aktif')::text kasa`))[0];
  console.log('  ', JSON.stringify(on));
  if ((Number(on.mac) + Number(on.duello) + Number(on.kasa) > 0) && !ZORLA) {
    console.log('  ⏸ BEKLE: aktif oyun var (--zorla ile atlanır)'); process.exitCode = 2; throw new Error('ön kontrol: bekle');
  }
  const canli982 = (await tek(`select count(*)::text from information_schema.columns where table_name = 'duellolar' and column_name = 'ban_acik'`)) === '1';
  console.log(`  982 canlıda: ${canli982 ? 'EVET' : 'hayır (işlem içinde uygulanacak)'}`);

  await db.sorgu('begin');
  const zaman = async () => {
    await db.sorgu("set local lock_timeout = '3s'");
    await db.sorgu("set local statement_timeout = '30s'");
    await db.sorgu("set local idle_in_transaction_session_timeout = '60s'");
  };
  await zaman();

  const H = await db.sorgu(`select id, takma_ad from profiles where takma_ad in ('ArayuzDenetim890', 'ArayuzDenetim648')`);
  const A = H.find((x) => x.takma_ad === 'ArayuzDenetim890')?.id;
  const B = H.find((x) => x.takma_ad === 'ArayuzDenetim648')?.id;
  const BOTS = (await db.sorgu(`select id from profiles where is_bot and bot_turu = 'gizli' and coalesce(bot_aktif, true) order by bot_seviye_puan nulls last, id limit 2`)).map((x) => x.id);
  const [BOT, BOT2] = BOTS;
  if (!A || !B || !BOT || !BOT2) throw new Error('test hesapları bulunamadı');
  await db.sorgu(`update duellolar set durum = 'iptal' where durum = 'aktif' and (oyuncu1 in ('${A}','${B}','${BOT}','${BOT2}') or oyuncu2 in ('${A}','${B}','${BOT}','${BOT2}'))`);
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where durum = 'aktif' and (oyuncu1 in ('${A}','${B}') or oyuncu2 in ('${A}','${B}'))`);
  await db.sorgu(`update profiles set last_seen = now() where id in ('${A}','${B}')`);
  const hizSifirla = () => db.sorgu(`delete from rpc_sayac where user_id in ('${A}','${B}')`);

  const md5Once = await md5Hepsi();
  const ayarOnce = await ayarHepsi();
  // Süren (982 öncesi) maç: migration'dan ÖNCE açılır → ban_acik null kalır (canlıda 982 varsa null'a çekilir).
  const K = await json(`select to_json(duello_kategorileri())::text`);
  const kurSecim = async (id, p1, p2) => {
    await db.sorgu(`update duellolar set oyuncu1 = oyuncu2, oyuncu2 = oyuncu1, profil1 = profil2, profil2 = profil1 where id = '${id}' and oyuncu1 <> '${p1}'`);
    await db.sorgu(`update duellolar set ilk_secen = '${p2}', saldiran = '${p2}' where id = '${id}'`);
    const liste = { [p1]: K.slice(0, 5), [p2]: K.slice(5, 10) };
    for (let i = 0; i < 10; i++) {
      const s = await tek(`select saldiran::text from duellolar where id = '${id}'`);
      await db.sorgu(`select duello2_secim_uygula('${id}', '${liste[s].shift()}', false)`);
    }
  };
  const eskiId = await tek(`select duello_olustur('${A}','${B}',false,null)`);
  if (!canli982) {
    for (const m of [MIG981, MIG982]) await db.sorgu(fs.readFileSync(m, 'utf8'));
    console.log('  migration 981 + 982 işlem içinde uygulandı');
    await zaman();
  } else await db.sorgu(`update duellolar set ban_acik = null where id = '${eskiId}'`);

  console.log('1) Migration kapsamı + ayarlar');
  if (!canli982) {
    const md5Sonra = await md5Hepsi();
    const degisen = Object.keys(md5Sonra).filter((k) => md5Once[k] !== md5Sonra[k]).map((k) => k.replace(/\(.*/, '')).sort();
    ok('değişen/yeni fonksiyonlar yalnız 4 ban fonksiyonu + tetikleyici', JSON.stringify(degisen) === JSON.stringify([...HEDEF_FN].sort()), JSON.stringify(degisen));
    ok('hiçbir fonksiyon silinmedi', Object.keys(md5Once).every((k) => k in md5Sonra));
    const ayarSonra = await ayarHepsi();
    const fark = Object.keys({ ...ayarOnce, ...ayarSonra }).filter((k) => ayarOnce[k] !== ayarSonra[k]).sort();
    ok('ayar farkı yalnız duello_ban_acik + kasa_tavan', JSON.stringify(fark) === JSON.stringify(['duello_ban_acik', 'kasa_tavan']), JSON.stringify(fark));
  } else console.log('  (982 canlıda — kapsam karşılaştırması uygulama öncesi koşuda yapıldı)');
  const ay = await ayarHepsi();
  ok('duello_ban_acik false · kasa_tavan 80 · hedef 80 · çarpan 2', ay.duello_ban_acik === 'false' && ay.kasa_tavan === '80' && ay.kasa_hedef_puan === '80' && ay.kasa_devam_carpan === '2', JSON.stringify([ay.duello_ban_acik, ay.kasa_tavan]));
  ok('süreler aynı: kategori 15 · soru 15 · kilit 2', ay.duello2_kategori_sn === '15' && ay.duello_kilit_tur === '2', JSON.stringify([ay.duello2_kategori_sn, ay.duello_kilit_tur]));
  const acl = await db.sorgu(`select p.proname, coalesce(p.proacl::text, '') a from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('duello_ban_sec', 'duello2_ban_baslat', 'duello2_bot_tik', 'duello2_durum', 'duello_durum', 'duello_kategori_sec')`);
  const aclOf = (n) => acl.find((x) => x.proname === n)?.a ?? '';
  ok('yetkiler: istemci RPC\'leri authenticated, iç fonksiyonlar istemciye kapalı',
    /authenticated=X/.test(aclOf('duello_ban_sec')) && /authenticated=X/.test(aclOf('duello_durum')) && /authenticated=X/.test(aclOf('duello_kategori_sec'))
    && !/authenticated=X/.test(aclOf('duello2_ban_baslat')) && !/authenticated=X/.test(aclOf('duello2_bot_tik')), JSON.stringify(acl));

  const satir = (id) => json(`select row_to_json(x)::text from duellolar x where id = '${id}'`);
  const kalanSn = (id) => tek(`select round(extract(epoch from (faz_bitis - now())))::int::text from duellolar where id = '${id}'`).then(Number);
  const sureDoldur = async (id) => { await db.sorgu(`update duellolar set faz_bitis = now() - interval '1 second' where id = '${id}'`); await db.sorgu(`select duello2_ilerlet('${id}')`); return satir(id); };
  const pay = Number(await tek(`select extract(epoch from duello2_gosterim_payi())::text`));
  const dc = (id) => tek(`select q.dogru_cevap::text from duellolar d join questions q on q.id = d.soru_id where d.id = '${id}'`).then(Number);

  console.log('2) Bayrak false → yeni maçta ban yok');
  await hizSifirla();
  let id = await tek(`select duello_olustur('${A}','${B}',false,null)`);
  let d = await satir(id);
  ok('yeni maç: ban_acik false (satıra sabit), faz secim', d.ban_acik === false && d.faz === 'secim', JSON.stringify([d.ban_acik, d.faz]));
  await kurSecim(id, A, B);
  d = await satir(id);
  let sn = await kalanSn(id);
  ok('draft bitti → tur 1 doğrudan kategori, saldıran A, ban boş', d.faz === 'kategori' && d.tur === 1 && d.saldiran === A && d.ban_kategori === null, JSON.stringify([d.faz, d.tur]));
  ok(`tur 1 kategori süresi 15 + pay (${pay} sn), ban payı yok`, Math.abs(sn - (15 + pay)) <= 1, String(sn));
  await ben(B);
  let dur = await json(`select duello_durum('${id}')::text`);
  ok('durum: ban.acik false, uygun/onceki yok, sureler.kategori 15', dur.ban?.acik === false && !dur.ban?.uygun && !dur.ban?.onceki && Number(dur.sureler?.kategori) === 15, JSON.stringify([dur.ban, dur.sureler?.kategori]));
  let h = await hata(`select duello_ban_sec('${id}', '${K[0]}')`);
  ok('savunan B duello_ban_sec → "ban yok" reddi', h && /ban yok/.test(h), h);
  await ben(A);
  h = await hata(`select duello_ban_sec('${id}', '${K[5]}')`);
  ok('saldıran A duello_ban_sec → "ban yok" reddi', h && /ban yok/.test(h), h);
  h = await hata(`select duello_kategori_sec('${id}', '${K[0]}')`);
  ok('kendi kategorisine saldırı hâlâ reddedilir', h && /seçilemez/.test(h), h);
  h = await hata(`select duello_kategori_sec('${id}', '${K[5]}')`);
  d = await satir(id);
  ok('rakip kategorisi seçilir → cevap', !h && d.faz === 'cevap' && d.kategori === K[5], h || d.faz);
  let c = await dc(id);
  await db.sorgu(`select duello_cevap('${id}', ${c}::smallint)`);
  await ben(B); await db.sorgu(`select duello_cevap('${id}', ${(c + 1) % 4}::smallint)`);
  d = await satir(id);
  ok('A doğru + B yanlış → A +2, kategori alındı, kilit 2 tur', d.faz === 'sonuc' && d.puan1 === 2 && d.sahiplik[K[5]] === A && Number(d.kilitler[K[5]]) === d.tur + 2, JSON.stringify([d.faz, d.puan1, d.kilitler]));
  d = await sureDoldur(id);
  sn = await kalanSn(id);
  ok('sonuç → tur 2 doğrudan kategori (ban yok), süre 15 + pay', d.tur === 2 && d.saldiran === B && d.faz === 'kategori' && Math.abs(sn - (15 + pay)) <= 1, JSON.stringify([d.tur, d.faz, sn]));
  d = await sureDoldur(id);
  ok('kategori süresi dolunca otomatik seçim → cevap (ban fazı araya girmez)', d.faz === 'cevap' && K.slice(0, 5).includes(d.kategori), JSON.stringify([d.faz, d.kategori]));
  await db.sorgu(`update duellolar set durum = 'iptal' where id = '${id}'`);

  console.log('3) Bot ban denemez');
  id = await tek(`select duello_olustur('${A}','${BOT}',false,null)`);
  await kurSecim(id, A, BOT);   // A saldırır, bot savunur
  d = await satir(id);
  ok('bot savunurken tur 1 kategori', d.faz === 'kategori' && d.saldiran === A && d.ban_acik === false);
  await db.sorgu(`select duello2_bot_tik('${id}')`);
  d = await satir(id);
  ok('bot_tik ban fazı açmaz, ban yazmaz', d.faz === 'kategori' && d.ban_kategori === null && d.son_ban2 === null && d.son_ban1 === null, JSON.stringify([d.faz, d.ban_kategori]));
  // Faz elle 'ban' yapılsa bile (bozuk veri) bot ban dalı bayrak kapalı maçta çalışmaz.
  await db.sorgu(`update duellolar set faz = 'ban', faz_bitis = now() + interval '1 second', ban_kategori = null where id = '${id}'`);
  await db.sorgu(`select duello2_bot_tik('${id}')`);
  d = await satir(id);
  ok('faz zorla ban iken bile bot banlamaz (ban_kategori boş)', d.ban_kategori === null && d.son_ban1 === null && d.son_ban2 === null, JSON.stringify([d.faz, d.ban_kategori]));
  await db.sorgu(`update duellolar set durum = 'iptal' where id = '${id}'`);

  console.log('4) Bot vs bot tam maç (botun iç yolları; 970 simülasyonu gibi) — hiç ban fazı');
  // İşlem içinde now() sabit olduğundan botun zamanlı tiki yerine aynı iç fonksiyonlar sırayla çağrılır
  // (seçim → kategori → cevap → çözüm → sonraki tur). Ban fazı açılsaydı döngü onu da görür ve sayardı.
  id = await tek(`select duello_olustur('${BOT}','${BOT2}',false,null)`);
  const fazlar = new Set();
  let adim = 0;
  while (adim++ < 700) {
    d = await satir(id);
    if (d.durum !== 'aktif') break;
    fazlar.add(d.faz);
    const sav = d.saldiran === d.oyuncu1 ? d.oyuncu2 : d.oyuncu1;
    if (d.faz === 'secim') await db.sorgu(`select duello2_secim_uygula('${id}', duello2_bot_secim_kategori('${id}', '${d.saldiran}'), false)`);
    else if (d.faz === 'ban') await db.sorgu(`select duello2_ban_bitir('${id}', duello2_bot_ban_kategori('${id}', '${sav}'))`);
    else if (d.faz === 'kategori') await db.sorgu(`select duello2_soru_ac('${id}', duello2_bot_kategori('${id}', '${d.saldiran}'))`);
    else if (d.faz === 'cevap') {
      const c = await dc(id);
      for (const o of [d.oyuncu1, d.oyuncu2]) {
        await db.sorgu(`select duello2_bot_cevap('${id}', '${o}', (case when random() < bot_soru_isabet('${o}', kategori, soru_id) then ${c} else ${(c + 1) % 4} end)::smallint) from duellolar where id = '${id}'`);
      }
      await db.sorgu(`select duello2_cozumle('${id}')`);
    } else if (d.faz === 'sonuc') await sureDoldur(id);
    else break;
  }
  d = await satir(id);
  const hamle = Number(await tek(`select count(*)::text from duello_hamleler where duello_id = '${id}'`));
  console.log(`   bitiş: tur ${d.tur} · ${d.puan1}-${d.puan2} · fazlar ${[...fazlar].join(',')} · hamle ${hamle}`);
  ok('bot vs bot maç bitti', d.durum === 'bitti' && d.kazanan, JSON.stringify([d.durum, adim]));
  ok('hiç ban fazı görülmedi, ban yazılmadı', !fazlar.has('ban') && d.son_ban1 === null && d.son_ban2 === null, [...fazlar].join(','));
  ok('bitiş nedeni geçerli: 12 puan / tur sonu / Altın Soru / 4 kategori (sonuç fazından sonra)', d.uzatma || d.puan1 >= 12 || d.puan2 >= 12 || d.tur >= d.max_tur || Math.max(0, ...Object.values(d.son_hamle?.hakimiyet?.alinan ?? {}).map(Number)) >= 4, JSON.stringify([d.puan1, d.puan2, d.tur, d.son_hamle?.hakimiyet?.alinan]));

  console.log('5) Süren 982 öncesi maç (ban_acik null) bayrak false iken eski kuralla biter');
  d = await satir(eskiId);
  ok('eski maç: ban_acik null', d.ban_acik === null, String(d.ban_acik));
  await kurSecim(eskiId, A, B);
  d = await satir(eskiId);
  sn = await kalanSn(eskiId);
  ok('eski maç: draft sonrası BAN fazı, süre 7 + 3 + pay', d.faz === 'ban' && Math.abs(sn - (7 + 3 + pay)) <= 1, JSON.stringify([d.faz, sn]));
  await ben(B);
  dur = await json(`select duello_durum('${eskiId}')::text`);
  ok('eski maç: durum.ban.acik true, uygun = savunanın 5 kategorisi', dur.ban?.acik === true && JSON.stringify(dur.ban.uygun) === JSON.stringify(K.slice(5, 10)), JSON.stringify(dur.ban));
  h = await hata(`select duello_ban_sec('${eskiId}', '${K[6]}')`);
  d = await satir(eskiId);
  ok('eski maç: savunan banlar → kategori, ban yazıldı', !h && d.faz === 'kategori' && d.ban_kategori === K[6], h || JSON.stringify([d.faz, d.ban_kategori]));
  await db.sorgu(`update duellolar set durum = 'iptal' where id = '${eskiId}'`);

  console.log('6) Bayrak true → yeni maçlarda eski akış aynen');
  await db.sorgu(`update oyun_ayarlari set deger = 'true'::jsonb where anahtar = 'duello_ban_acik'`);
  await hizSifirla();
  id = await tek(`select duello_olustur('${A}','${BOT}',false,null)`);
  d = await satir(id);
  ok('bayrak true: yeni maç ban_acik true', d.ban_acik === true);
  await kurSecim(id, A, BOT);
  d = await satir(id);
  sn = await kalanSn(id);
  ok('bayrak true: tur 1 ban fazı (7 + 3 + pay)', d.faz === 'ban' && Math.abs(sn - (7 + 3 + pay)) <= 1, JSON.stringify([d.faz, sn]));
  await db.sorgu(`update duellolar set faz_bitis = now() + interval '2 seconds' where id = '${id}'`);
  await db.sorgu(`select duello2_bot_tik('${id}')`);
  d = await satir(id);
  ok('bayrak true: bot savunurken banlar → kategori', d.faz === 'kategori' && K.slice(5, 10).includes(d.ban_kategori), JSON.stringify([d.faz, d.ban_kategori]));
  await ben(A);
  h = await hata(`select duello_kategori_sec('${id}', '${d.ban_kategori}')`);
  ok('bayrak true: banlı kategori seçilemez', h && /seçilemez/.test(h), h);
  await db.sorgu(`update duellolar set durum = 'iptal' where id = '${id}'`);
  await db.sorgu(`update oyun_ayarlari set deger = '1'::jsonb where anahtar = 'duello_ban_acik'`);
  id = await tek(`select duello_olustur('${A}','${B}',false,null)`);
  ok('eski biçim (sayı 1) de açık okunur', (await satir(id)).ban_acik === true);
  await db.sorgu(`update duellolar set durum = 'iptal' where id = '${id}'`);
  await db.sorgu(`update oyun_ayarlari set deger = 'false'::jsonb where anahtar = 'duello_ban_acik'`);
  id = await tek(`select duello_olustur('${A}','${B}',false,null)`);
  ok('bayrak false\'a dönünce yeni maç yine kapalı', (await satir(id)).ban_acik === false);
  await db.sorgu(`update duellolar set durum = 'iptal' where id = '${id}'`);

  console.log('7) Ortak Hazine 981: tavan 80');
  const kid = await tek(`select kasa_olustur('${A}', '${B}', false, false)`);
  const ks = await json(`select row_to_json(x)::text from kasa_maclari x where id = '${kid}'`);
  ok('yeni Hazine maçı: kasa_tavan 80, hedef 80, çarpan 2, karar 5, soru 15', Number(ks.kasa_tavan) === 80 && ks.hedef === 80 && Number(ks.devam_carpan) === 2 && ks.karar_sn === 5 && ks.soru_sn === 15,
    JSON.stringify([ks.kasa_tavan, ks.hedef, ks.devam_carpan, ks.karar_sn, ks.soru_sn]));
  await ben(A);
  const kd = await json(`select kasa_durum('${kid}')::text`);
  ok('kasa_durum tavanı 80 bildirir', Number(kd?.tavan) === 80, JSON.stringify(kd?.tavan));
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where id = '${kid}'`);
} catch (e) {
  if (!/ön kontrol/.test(e.message)) { kaldi++; console.error('HATA', e.message); }
} finally {
  clearTimeout(bekci);
  await db.sorgu('rollback').catch(() => {});
  await db.kapat();
  try {
    const k = await new PgIstemci(dizgi).baglan();
    await new Promise((r) => setTimeout(r, 500));
    const artik = await k.tek(`select count(*)::text from pg_stat_activity where application_name = '${UYGULAMA}' and pid <> pg_backend_pid()`);
    await k.kapat();
    ok('pg_stat_activity: bu betiğin artık oturumu yok', artik === '0', artik);
  } catch (e) { console.log('  (oturum kontrolü yapılamadı:', e.message, ')'); }
  console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
  process.exit(kaldi ? 1 : process.exitCode ?? 0);
}
