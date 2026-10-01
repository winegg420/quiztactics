// Sezon Yolu TAŞMA ÖDÜLÜ (730) SQL provası — tek transaction, sonunda ROLLBACK (canlıya hiçbir şey yazılmaz).
// Sınar: eşik sınırları (2799/2800/2899/2900/3799/3800/azami üstü) · sezon_puani_ekle SP'yi kırpmaz · BP yok/var ·
// geriye dönük BP · çift alma reddi · bp_toplu_al taşmayı alır (yuva yapısı bozulmaz) · sezon_ozetim alinabilir ·
// kapanışta otomatik verme · sahip test sıfırlama · bot kuralı · günlük coin tavanı dışı · yetkiler · eski alanlar aynı.
// Yarış testi ayrı: araclar/sezon-tasma-yaris-testi.mjs (iki bağlantı, commit gerekir).
// Kullanım: node araclar/sezon-tasma-sql-testi.mjs [migration.sql ...]  (verilenler önce uygulanır)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIGLER = process.argv.slice(2);
const A = '5b555bd3-9371-4f35-90a5-39289111335e';   // insan test hesabı (sahip değil) — BP'li
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
async function hata(sql) { await db.sorgu('savepoint s'); try { await db.sorgu(sql); await db.sorgu('release savepoint s'); return null; } catch (e) { await db.sorgu('rollback to savepoint s'); return e.message; } }
const tek = (s) => db.tek(s);
const js = async (s) => JSON.parse(await tek(s));
const ayar = (k, v) => db.sorgu(`update oyun_ayarlari set deger = '${v}'::jsonb where anahtar = '${k}'`);
try {
  await db.sorgu('begin');
  // Canlıda bayrak açık ve Sezon 1 sürüyor (1 Eki 2026): test, bayrak öncesi duruma (kapalı, gerçek sezon yok) transaction içinde döner; sonunda ROLLBACK
  await db.sorgu(`update oyun_ayarlari set deger = 'false'::jsonb where anahtar = 'sezon_yolu_acik'`);
  await db.sorgu(`delete from sezonlar where not test`);
  for (const m of MIGLER) await db.sorgu(fs.readFileSync(m, 'utf8'));
  await db.sorgu(`update sezonlar set kapandi_at = now() where kapandi_at is null`);
  const [B, C] = (await tek(`select string_agg(id::text, ',') from (select id from profiles where id <> '${A}' and not coalesce(is_bot, false) order by created_at limit 2) x`)).split(',');
  ok('üç insan test hesabı bulundu', Boolean(B && C));
  const durum = async (u) => { await ben(u); return js('select sezon_yolu_durumum()::text'); };
  const tasma = async (u) => (await durum(u)).tasma;
  const coinSay = (u, like) => tek(`select coalesce(sum(miktar),0) from coin_hareketleri where user_id='${u}' and tur='sezon_yolu' and referans like '${like}'`).then(Number);

  console.log('— ayarlar ve şema');
  ok('ayarlar: 100 / 25 / 40 / 10', await tek(`select string_agg(deger::text, '/' order by anahtar) from oyun_ayarlari where anahtar in ('sezon_tasma_sp','sezon_tasma_ucretsiz_coin','sezon_tasma_ucretli_coin','sezon_tasma_azami')`) === '100/10/25/40'
     || await tek(`select string_agg(anahtar||'='||deger::text, ',' order by anahtar) from oyun_ayarlari where anahtar like 'sezon_tasma%'`) === 'sezon_tasma_azami=10,sezon_tasma_sp=100,sezon_tasma_ucretli_coin=40,sezon_tasma_ucretsiz_coin=25');
  ok('mevcut ayarlar aynı: 28 seviye, 500 elmas, eşik 100+0', await tek(`select string_agg(anahtar||'='||deger::text, ',' order by anahtar) from oyun_ayarlari where anahtar in ('sezon_seviye_sayisi','bp_fiyat_elmas','sezon_sp_esik_taban','sezon_sp_esik_artis')`) === 'bp_fiyat_elmas=500,sezon_seviye_sayisi=28,sezon_sp_esik_artis=0,sezon_sp_esik_taban=100');
  ok('ödül tablosu hâlâ 56 yuva', await tek('select count(*) from bp_seviye_odulleri') === '56');
  ok('bayrak kapalı', await tek(`select deger::text from oyun_ayarlari where anahtar='sezon_yolu_acik'`) === 'false');

  console.log('— sahip test sıfırlama taşma kayıtlarını siler (bayrak kapalı, test sezonu)');
  await db.sorgu(`update oyun_ayarlari set deger = deger || to_jsonb('${A}'::text) where anahtar='sahip_kullanicilar'`);
  await ben(A);
  await tek('select sezon_sahip_sp_ekle(3000)');                       // 2800 + 200 → kazanilan 2
  ok('sahip test sezonunda taşma 2 kazanıldı', (await js('select sezon_yolu_durumum()::text')).tasma.kazanilan === 2);
  ok('sahip: bp_tasma_al çalışır (test sezonu)', (await js(`select bp_tasma_al('ucretsiz')::text`)).n === 1);
  const testSezon = await tek('select id from sezonlar where test and kapandi_at is null');
  ok('test sezonunda taşma kaydı var', await tek(`select count(*) from oyuncu_bp_tasma_alimi where sezon=${testSezon} and user_id='${A}'`) === '1');
  await tek('select sezon_sahip_test_sifirla()');
  ok('sıfırla: taşma kayıtları silindi, SP 0', await tek(`select count(*) from oyuncu_bp_tasma_alimi where sezon=${testSezon} and user_id='${A}'`) === '0'
     && (await js('select sezon_ozetim()::text')).sp === 0);
  await db.sorgu(`update oyun_ayarlari set deger = deger - '${A}' where anahtar='sahip_kullanicilar'`);
  await db.sorgu(`update sezonlar set kapandi_at = now() where kapandi_at is null`);

  console.log('— bayrak açılır, eşik sınırları');
  await ayar('sezon_yolu_acik', 'true');
  const s = await js(`select row_to_json(x)::text from (select id from sezonlar where kapandi_at is null and not test) x`);
  for (const u of [A, B, C]) await tek(`select sezon_puani_ekle('${u}', 'turnuva', 'tasma:ilk:${u}', 1)`);
  const spYaz = (u, sp) => db.sorgu(`update oyuncu_sezon_puani set sp=${sp}, seviye=sezon_seviye(${sp}) where user_id='${u}' and sezon=${s.id}`);
  const sinir = async (sp, kaz, acik, sonraki) => {
    await spYaz(A, sp); const t = await tasma(A);
    ok(`sp ${sp}: kazanılan ${kaz}, açık ${acik}, sonraki_icin_sp ${sonraki}`, t.kazanilan === kaz && t.acik === acik && t.sonraki_icin_sp === sonraki, JSON.stringify(t));
  };
  await sinir(0, 0, false, 2900);
  await sinir(2700, 0, false, 200);                                   // 27. seviye
  await sinir(2799, 0, false, 101);
  await sinir(2800, 0, true, 100);                                    // 28. seviye eşiği
  await sinir(2899, 0, true, 1);                                      // esik28 + 99
  await sinir(2900, 1, true, 100);                                    // esik28 + 100
  await sinir(3799, 9, true, 1);
  await sinir(3800, 10, true, null);                                  // azami
  await sinir(9999, 10, true, null);                                  // azami üstü
  await spYaz(A, 2799); ok('27/28 durumunda seviye 27', (await js('select sezon_ozetim()::text')).seviye === 27);
  await spYaz(A, 9999); ok('azami üstünde seviye hâlâ 28 (28/28 bozulmaz)', (await js('select sezon_ozetim()::text')).seviye === 28);

  console.log('— sezon_puani_ekle SP\'yi 28. eşikte kırpmaz');
  await spYaz(A, 2790);
  await tek(`select sezon_puani_ekle('${A}', 'turnuva', 'kirpma:1', 15)`);
  ok('2790 + 15 = 2805 (kırpılmadı), seviye 28, taşma 0', await tek(`select sp||':'||seviye from oyuncu_sezon_puani where user_id='${A}' and sezon=${s.id}`) === '2805:28' && (await tasma(A)).kazanilan === 0);
  await tek(`select sezon_puani_ekle('${A}', 'turnuva', 'kirpma:2', 100)`);
  ok('2805 + 100 = 2905 → 1 taşma ödülü', await tek(`select sp from oyuncu_sezon_puani where user_id='${A}' and sezon=${s.id}`) === '2905' && (await tasma(A)).kazanilan === 1);

  console.log('— BP yok: ücretsiz kol');
  await spYaz(A, 3000);                                               // kazanılan 2
  let t = await tasma(A);
  ok('BP yok: alınabilir ücretsiz 2, ücretli 0', t.alinabilir_ucretsiz === 2 && t.alinabilir_ucretli === 0 && t.alinan_ucretsiz === 0 && t.alinan_ucretli === 0, JSON.stringify(t));
  ok('ödül bilgisi coin 25 / 40', t.odul.ucretsiz.tur === 'coin' && t.odul.ucretsiz.miktar === 25 && t.odul.ucretli.tur === 'coin' && t.odul.ucretli.miktar === 40);
  ok('ücretli kol BP olmadan reddedilir', /Battle Pass/.test(await hata(`select bp_tasma_al('ucretli')`) ?? ''));
  ok('geçersiz kol reddedilir', /Geçersiz kol/.test(await hata(`select bp_tasma_al('x')`) ?? ''));
  const c0 = Number(await tek(`select coin from profiles where id='${A}'`));
  const r1 = await js(`select bp_tasma_al('ucretsiz')::text`);
  ok('ilk alım n=1, coin 25', r1.ok === true && r1.n === 1 && r1.kol === 'ucretsiz' && r1.odul.tur === 'coin' && r1.odul.miktar === 25 && Number(await tek(`select coin from profiles where id='${A}'`)) === c0 + 25, JSON.stringify(r1));
  ok('defter referansı sezon:<id>:tasma:1:ucretsiz', await coinSay(A, `sezon:${s.id}:tasma:1:ucretsiz`) === 25);
  ok('alım dönüşünde güncel tasma bilgisi', r1.tasma.alinan_ucretsiz === 1 && r1.tasma.alinabilir_ucretsiz === 1);
  const r2 = await js(`select bp_tasma_al('ucretsiz')::text`);
  ok('ikinci alım n=2', r2.n === 2);
  ok('üçüncü alım (çift alma) reddedilir', /zaten aldın/.test(await hata(`select bp_tasma_al('ucretsiz')`) ?? ''));
  ok('coin yalnız 2 kez eklendi (+50), kayıt 2', Number(await tek(`select coin from profiles where id='${A}'`)) === c0 + 50 && await tek(`select count(*) from oyuncu_bp_tasma_alimi where user_id='${A}' and kol='ucretsiz'`) === '2');
  ok('yuva alım tablosuna taşma yazılmadı', await tek(`select count(*) from oyuncu_bp_odul_alimi where user_id='${A}' and seviye > 28`) === '0');

  console.log('— kazanılan yokken');
  await ben(B);
  ok('B: taşma yok → hata', /Henüz taşma ödülü/.test(await hata(`select bp_tasma_al('ucretsiz')`) ?? ''));

  console.log('— geriye dönük BP');
  await ben(A);
  await db.sorgu(`update profiles set elmas = 2000 where id='${A}'`);
  await tek('select bp_satin_al()');
  t = await tasma(A);
  ok('BP sonrası ücretli 2 alınabilir (geriye dönük), ücretsiz 0', t.alinabilir_ucretli === 2 && t.alinabilir_ucretsiz === 0 && t.alinan_ucretli === 0, JSON.stringify(t));
  const d = await durum(A);
  ok('ozet.alinabilir = yuva kalanı + taşma kalanı', (await js('select sezon_ozetim()::text')).alinabilir
     === Number(await tek(`select count(*) from bp_seviye_odulleri o where o.seviye <= 28 and not exists (select 1 from oyuncu_bp_odul_alimi a where a.sezon=${s.id} and a.user_id='${A}' and a.seviye=o.seviye and a.kol=o.kol)`)) + 2);
  const u1 = await js(`select bp_tasma_al('ucretli')::text`);
  ok('ücretli n=1, coin 40', u1.n === 1 && u1.odul.miktar === 40 && await coinSay(A, `sezon:${s.id}:tasma:1:ucretli`) === 40);
  ok('ücretli çift alma reddedilir (1 kaldı → al → 2. kez reddi)', (await js(`select bp_tasma_al('ucretli')::text`)).n === 2 && /zaten aldın/.test(await hata(`select bp_tasma_al('ucretli')`) ?? ''));
  ok('kayıt tek: ücretli 2 satır, ücretsiz 2 satır', await tek(`select count(*) from oyuncu_bp_tasma_alimi where user_id='${A}'`) === '4');

  console.log('— bp_toplu_al taşmayı alır, yapı bozulmaz');
  await spYaz(A, 3300);                                               // kazanılan 5 → 3 ücretsiz + 3 ücretli yeni
  const ozetOnce = (await js('select sezon_ozetim()::text')).alinabilir;
  const slotKalan = Number(await tek(`select count(*) from bp_seviye_odulleri o where o.seviye <= 28 and not exists (select 1 from oyuncu_bp_odul_alimi a where a.sezon=${s.id} and a.user_id='${A}' and a.seviye=o.seviye and a.kol=o.kol)`));
  ok('ozet.alinabilir yuva + 6 taşma', ozetOnce === slotKalan + 6, `${ozetOnce} vs ${slotKalan}`);
  const coinOnce = Number(await tek(`select coin from profiles where id='${A}'`));
  const tp = await js('select bp_toplu_al()::text');
  ok('toplu: ok + verilen dizisi (yuvalar) + tasma_verilen (6)', tp.ok === true && Array.isArray(tp.verilen) && tp.verilen.length === slotKalan && Array.isArray(tp.tasma_verilen) && tp.tasma_verilen.length === 6, JSON.stringify(tp).slice(0, 200));
  ok('tasma_verilen öğeleri {n, kol, tur, miktar}', tp.tasma_verilen.every((x) => x.n >= 3 && x.n <= 5 && ['ucretsiz', 'ucretli'].includes(x.kol) && x.tur === 'coin' && x.miktar > 0));
  ok('toplu sonrası taşma 5/5 (her iki kol), alınabilir 0', (t = await tasma(A)).alinan_ucretsiz === 5 && t.alinan_ucretli === 5 && t.alinabilir_ucretsiz === 0 && t.alinabilir_ucretli === 0 && (await js('select sezon_ozetim()::text')).alinabilir === 0, JSON.stringify(t));
  ok('toplu ikinci kez taşma vermez', (await js('select bp_toplu_al()::text')).tasma_verilen.length === 0);
  ok('taşma coin toplamı 5×25 + 5×40', await coinSay(A, `sezon:${s.id}:tasma:%`) === 325);
  ok('toplu: yuva ödülü coin + taşma coin (defterde tekrar yok)', Number(await tek(`select count(*) from (select referans from coin_hareketleri where user_id='${A}' and tur='sezon_yolu' group by referans having count(*) > 1) x`)) === 0);
  void coinOnce;

  console.log('— günlük coin tavanı: normal sezon ödülleriyle aynı (tavana takılmaz, tavanı yemez)');
  await spYaz(A, 3400);                                               // kazanılan 6
  await tek(`select coin_ekle('${A}', 100000, 'klasik', 'tasma:tavan:doldur')`);
  ok('günlük tavan doldu', Number(await tek(`select coin_gunluk_kalan('${A}')`)) === 0);
  const cT = Number(await tek(`select coin from profiles where id='${A}'`));
  ok('tavan doluyken taşma ödülü yine verilir (+25)', (await js(`select bp_tasma_al('ucretsiz')::text`)).n === 6 && Number(await tek(`select coin from profiles where id='${A}'`)) === cT + 25);
  await db.sorgu(`delete from coin_hareketleri where user_id='${A}' and referans='tasma:tavan:doldur'`);
  const kalan0 = Number(await tek(`select coin_gunluk_kalan('${A}')`));
  await spYaz(A, 3500);
  await tek(`select bp_tasma_al('ucretsiz')`);
  ok('taşma coini günlük tavan hesabına girmez', Number(await tek(`select coin_gunluk_kalan('${A}')`)) === kalan0);

  console.log('— azami');
  await spYaz(B, 6000); await ben(B);
  t = await tasma(B);
  ok('B (BP yok) sp 6000: kazanılan 10 = azami, sonraki null', t.kazanilan === 10 && t.azami === 10 && t.sonraki_icin_sp === null);
  let n = 0; for (let i = 0; i < 10; i++) { n = (await js(`select bp_tasma_al('ucretsiz')::text`)).n; }
  ok('10. ücretsiz alındı (n=10)', n === 10);
  ok('11. alım reddedilir (azami)', /zaten aldın/.test(await hata(`select bp_tasma_al('ucretsiz')`) ?? ''));
  ok('B: 10 kayıt, coin 250', await tek(`select count(*) from oyuncu_bp_tasma_alimi where user_id='${B}'`) === '10' && await coinSay(B, `sezon:${s.id}:tasma:%`) === 250);
  ok('B: ücretli kol hâlâ BP ister, alinabilir_ucretli 0', /Battle Pass/.test(await hata(`select bp_tasma_al('ucretli')`) ?? '') && (await tasma(B)).alinabilir_ucretli === 0);
  ok('azami 3 yapılırsa kazanılan üst sınırı 3', (await ayar('sezon_tasma_azami', '3'), (await tasma(B)).kazanilan) === 3);
  await ayar('sezon_tasma_azami', '10');

  console.log('— durum alanları: eski alanlar aynı, tasma eklendi');
  const dd = await durum(A);
  const eski = ['gorunur', 'acik', 'test', 'sahip', 'sezon', 'sp', 'seviye', 'seviye_sayisi', 'esikler', 'sonraki_esik', 'onceki_esik', 'bp', 'elmas', 'oduller', 'bonus_gorev', 'final_unvan', 'bugun_mac_sp', 'gunluk_mac_tavan'];
  ok('eski 18 alan durur', eski.every((k) => k in dd));
  ok('oduller 56 yuva, tasma nesnesi tam', dd.oduller.length === 56 && ['acik', 'azami', 'kazanilan', 'alinan_ucretsiz', 'alinan_ucretli', 'alinabilir_ucretsiz', 'alinabilir_ucretli', 'sonraki_icin_sp', 'odul'].every((k) => k in dd.tasma));
  ok('sezon_ozetim tasma yokken (yeni oyuncu) alinabilir sayı', typeof (await js('select sezon_ozetim()::text')).alinabilir === 'number');

  console.log('— bot kuralı');
  const bot = await tek(`select id from profiles where is_bot limit 1`);
  await ben(bot);
  ok('bot SP almaz', await tek(`select sezon_puani_ekle('${bot}', 'turnuva', 'tasma:bot', 15)`) === null);
  ok('bot: taşma kazanılmadı → hata', /Henüz taşma ödülü/.test(await hata(`select bp_tasma_al('ucretsiz')`) ?? ''));
  await db.sorgu(`insert into oyuncu_sezon_puani (sezon, user_id, sp, seviye) values (${s.id}, '${bot}', 3000, 28) on conflict (sezon, user_id) do update set sp = 3000`);
  const cBot = Number(await tek(`select coin from profiles where id='${bot}'`));
  await hata(`select bp_tasma_al('ucretsiz')`);
  ok('bota coin verilmez (coin_ekle bot kuralı, bp_odul_al ile aynı)', Number(await tek(`select coin from profiles where id='${bot}'`)) === cBot);

  console.log('— sezon kapanışı: alınmamış taşma ödülleri otomatik');
  // A (BP'li): 3500 sp → 7 kazanılan; ücretsiz 7 alınmış, ücretli 5 alınmış → kapanışta 2 ücretli eksik. Sonra sp 3700 → 9 kazanılan: ikisi de eksik
  await spYaz(A, 3700);
  // C (BP'siz): sp 3100 → 3 kazanılan, 1 ücretsiz alınmış
  await spYaz(C, 3100); await ben(C);
  await tek(`select bp_tasma_al('ucretsiz')`);
  const aUc0 = await tek(`select count(*) from oyuncu_bp_tasma_alimi where user_id='${A}' and kol='ucretsiz'`);
  const aUl0 = await tek(`select count(*) from oyuncu_bp_tasma_alimi where user_id='${A}' and kol='ucretli'`);
  ok('kapanış öncesi: A ücretsiz 7 · ücretli 5; C ücretsiz 1', aUc0 === '7' && aUl0 === '5' && await tek(`select count(*) from oyuncu_bp_tasma_alimi where user_id='${C}'`) === '1', `${aUc0}/${aUl0}`);
  await db.sorgu(`update sezonlar set bitis = now() - interval '1 minute', baslangic = now() - interval '28 days' where id=${s.id}`);
  await tek('select sezon_tik()');
  ok('sezon kapandı', await tek(`select kapandi_at is not null from sezonlar where id=${s.id}`) === 't');
  ok('A (BP): 9 ücretsiz + 9 ücretli taşma verildi', await tek(`select count(*) filter (where kol='ucretsiz')||'/'||count(*) filter (where kol='ucretli') from oyuncu_bp_tasma_alimi where user_id='${A}' and sezon=${s.id}`) === '9/9');
  ok('C (BP yok): 3 ücretsiz, 0 ücretli', await tek(`select count(*) filter (where kol='ucretsiz')||'/'||count(*) filter (where kol='ucretli') from oyuncu_bp_tasma_alimi where user_id='${C}' and sezon=${s.id}`) === '3/0');
  ok('kapanış coini yalnız eksikler kadar (A 9×25+9×40=585, C 75)', await coinSay(A, `sezon:${s.id}:tasma:%`) === 585 && await coinSay(C, `sezon:${s.id}:tasma:%`) === 75);
  ok('defterde çift referans yok', Number(await tek(`select count(*) from (select user_id, referans from coin_hareketleri where tur='sezon_yolu' group by 1,2 having count(*) > 1) x`)) === 0);
  const imza = async () => await tek(`select count(*) from oyuncu_bp_tasma_alimi where sezon=${s.id}`) + '|' + await tek(`select coalesce(sum(coin),0) from profiles where id in ('${A}','${C}')`);
  const once = await imza();
  await tek(`select sezon_kapat(${s.id})`); await tek('select sezon_tik()');
  ok('ikinci kapanış/tik taşma vermez', (await imza()) === once);
  ok('placeholder yuva kapanışı bozulmadı: A 56 yuva kaydı', await tek(`select count(*) from oyuncu_bp_odul_alimi where user_id='${A}' and sezon=${s.id}`) === '56');
  ok('yeni sezonda taşma sıfır', (await tasma(A)).kazanilan === 0 && (await tasma(A)).alinan_ucretsiz === 0);
  ok('bayrak açıkken kapatılan sezon sonrası yeni sezon açıldı', await tek(`select count(*) from sezonlar where kapandi_at is null and not test`) === '1');

  console.log('— yetkiler');
  const yetki = async (f, rol) => (await tek(`select has_function_privilege('${rol}', 'public.${f}', 'execute')`)) === 't';
  ok('bp_tasma_al(text): anon yok, authenticated var', !(await yetki('bp_tasma_al(text)', 'anon')) && (await yetki('bp_tasma_al(text)', 'authenticated')));
  ok('bp_tasma_al: public (PUBLIC) yürütme yok', (await tek(`select coalesce(bool_or(a.grantee = 0), false) from pg_proc p, aclexplode(p.proacl) a where p.oid = 'public.bp_tasma_al(text)'::regprocedure`)) === 'f');
  for (const f of ['sezon_tasma_kazanilan(bigint,uuid)', 'sezon_tasma_bilgi(bigint,uuid)', 'bp_tasma_ver_ic(uuid,bigint,int,text)'])
    ok(`${f}: istemciye kapalı`, !(await yetki(f, 'authenticated')) && !(await yetki(f, 'anon')));
  ok('oyuncu_bp_tasma_alimi: istemciye doğrudan erişim yok, RLS açık', (await tek(`select has_table_privilege('authenticated','public.oyuncu_bp_tasma_alimi','select')`)) === 'f'
     && (await tek(`select has_table_privilege('anon','public.oyuncu_bp_tasma_alimi','select')`)) === 'f'
     && (await tek(`select relrowsecurity from pg_class where oid='public.oyuncu_bp_tasma_alimi'::regclass`)) === 't');
  // gerçek rol denemesi: anon çağıramaz
  await db.sorgu('savepoint r');
  await db.sorgu('set local role anon');
  const anonHata = await hata(`select bp_tasma_al('ucretsiz')`);
  await db.sorgu('rollback to savepoint r');
  ok('anon rolüyle çağrı reddedilir (permission denied)', /permission denied|izin/i.test(anonHata ?? ''), String(anonHata));
  await db.sorgu('savepoint r2');
  await db.sorgu('set local role authenticated');
  await ben(A);
  const authHata = await hata(`select bp_tasma_al('ucretsiz')`);
  await db.sorgu('rollback to savepoint r2');
  ok('authenticated rolü çağırabilir (yetki hatası yok; Sezon/Hak hatası olabilir)', !/permission denied/i.test(authHata ?? ''), String(authHata));
} finally {
  try { await db.sorgu('rollback'); } finally { await db.kapat(); }
}
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
