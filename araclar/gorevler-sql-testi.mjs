// Görev sistemi (740–743) SQL provası — tek transaction, sonunda ROLLBACK (canlıya hiçbir şey yazılmaz).
// Sınar: yetkiler (anon yok, tablolar kapalı) · günlük seçim (herkese aynı, deterministik, 1 kolay + 1 orta + 1 zor, ardışık
// gün tekrarı yok, kategori) · gün/hafta sınırı (TSİ, pazartesi 00:00) · haftalık seçim · yazılan gün havuz değişse bozulmaz ·
// sayaçlar (Antrenman hariç, gizli bot dahil, terk eden hariç, Düello, kategori, farklı kategori) · hedef altında alma reddi ·
// çift alma · haftalık alma · sandık 2/3 reddi ve 3/3 alma (SP + joker) · geriye uyum (get_daily_quests / claim_quest) ·
// coin tavanı · sezon kapalıyken coin verilir SP verilmez · sezon açıkken SP, BP çarpanı.
// Kullanım: node araclar/gorevler-sql-testi.mjs [migration.sql ...]  (verilenler önce uygulanır)
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
const js = async (s) => JSON.parse(await tek(s));
const ayar = (k, v) => db.sorgu(`update oyun_ayarlari set deger = '${v}'::jsonb where anahtar = '${k}'`);
const satirlar = (s) => db.sorgu(s);
try {
  await db.sorgu('begin');
  for (const m of MIGLER) await db.sorgu(fs.readFileSync(m, 'utf8'));
  await db.sorgu(`update sezonlar set kapandi_at = now() where kapandi_at is null`);   // sezon durumunu temiz başlat (yalnız bu işlemde)
  await ben(A);

  console.log('— yetkiler');
  for (const f of ['gorevlerim()', 'gorev_al(text,text)', 'haftalik_sandik_al()'])
    ok(`${f}: authenticated evet, anon/public hayır`, await tek(`select has_function_privilege('authenticated','public.${f}','execute')::text||has_function_privilege('anon','public.${f}','execute')::text||has_function_privilege('public','public.${f}','execute')::text`) === 'truefalsefalse');
  ok('eski get_daily_quests/claim_quest anon’a kapalı', await tek(`select has_function_privilege('anon','public.get_daily_quests()','execute')::text||has_function_privilege('anon','public.claim_quest(text)','execute')::text`) === 'falsefalse');
  ok('iç yardımcılar istemciye kapalı', await tek(`select count(*) from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ('gorev_olcum','gorev_al_ic','gorev_iclem_ozet','gunluk_secim_yap','haftalik_secim_yap','gorev_gunluk_hesapla','gorev_haftalik_hesapla','gorev_havuz_sayaci','gorev_dogru_satirlari','gorev_acik_bot_mu') and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'))`) === '0');
  for (const t of ['gorev_havuzu', 'gunluk_gorev_secimi', 'haftalik_gorev_secimi', 'haftalik_gorev_alimi']) {
    ok(`${t}: RLS açık, politika yok, anon/authenticated yetkisiz`, await tek(`select (select relrowsecurity from pg_class where oid='public.${t}'::regclass)::text || (select count(*) from pg_policies where tablename='${t}')::text || has_table_privilege('anon','public.${t}','select')::text || has_table_privilege('authenticated','public.${t}','select')::text`) === 'true0falsefalse');
  }
  ok('anon gorevlerim çağıramaz (yetki hatası)', /permission denied|yetki/i.test(await hata(`set local role anon; select gorevlerim(); reset role`) ?? ''));
  await db.sorgu('reset role');
  await ben(A);

  console.log('— havuz ve ayarlar');
  ok('havuz: 10 günlük (3 kolay, 4 orta, 3 zor) + 6 haftalık', await tek(`select string_agg(k||n, ',' order by k) from (select coalesce(zorluk,'hft') k, count(*) n from gorev_havuzu where aktif group by 1) x`) === 'hft6,kolay3,orta4,zor3');
  ok('ayarlar: 50 / 25 / 75 / 1 / soru_degistir', await tek(`select string_agg(anahtar||'='||(deger #>> '{}'), ',' order by anahtar) from oyun_ayarlari where anahtar in ('gorev_haftalik_coin','sp_haftalik_gorev','gorev_haftalik_sandik_sp','gorev_haftalik_sandik_joker_adet','gorev_haftalik_sandik_joker_tur')`) === 'gorev_haftalik_coin=50,gorev_haftalik_sandik_joker_adet=1,gorev_haftalik_sandik_joker_tur=soru_degistir,gorev_haftalik_sandik_sp=75,sp_haftalik_gorev=25');

  console.log('— günlük seçim (saf)');
  const gunler = [];
  for (let i = 0; i < 60; i++) {
    const r = await satirlar(`select zorluk, quest_id, parametre::text p from gorev_gunluk_hesapla(current_date + ${i}) order by case zorluk when 'kolay' then 1 when 'orta' then 2 else 3 end`);
    gunler.push(r);
  }
  ok('her gün 3 görev: kolay + orta + zor', gunler.every((g) => g.map((x) => x.zorluk).join() === 'kolay,orta,zor'));
  const tekrar = await satirlar(`select count(*) from (select current_date + g d from generate_series(0,58) g) x
      where exists (select 1 from gorev_gunluk_hesapla(d) a join gorev_gunluk_hesapla(d+1) b on a.zorluk=b.zorluk and a.quest_id=b.quest_id)`);
  ok('aynı zorlukta ardışık gün tekrarı yok', tekrar[0].count === '0');
  ok('deterministik (iki çağrı aynı)', JSON.stringify(gunler[3]) === JSON.stringify(await satirlar(`select zorluk, quest_id, parametre::text p from gorev_gunluk_hesapla(current_date + 3) order by case zorluk when 'kolay' then 1 when 'orta' then 2 else 3 end`)));
  ok('günler birbirinden farklı (60 günde ≥ 20 farklı üçlü)', new Set(gunler.map((g) => g.map((x) => x.quest_id).join())).size >= 20);
  const kategoriler = new Set((await satirlar(`select distinct kategori from questions where aktif and kategori not in ('genel','karisik')`)).map((x) => x.kategori));
  const katGunleri = gunler.filter((g) => g.find((x) => x.quest_id === 'gun_kategori_dogru_10'));
  ok('kategori görevinde günün kategorisi geçerli', katGunleri.length > 0 && katGunleri.every((g) => kategoriler.has(JSON.parse(g.find((x) => x.quest_id === 'gun_kategori_dogru_10').p).kategori)));
  ok('kategori görevi olmayan günde parametre boş', gunler.every((g) => g.every((x) => x.quest_id === 'gun_kategori_dogru_10' || x.p === '{}')));
  const dagilim = {};
  for (const g of gunler) for (const x of g) dagilim[x.quest_id] = (dagilim[x.quest_id] ?? 0) + 1;
  ok('60 günde her havuz görevi en az bir kez çıktı', Object.keys(dagilim).length === 10, JSON.stringify(dagilim));

  console.log('— gün / hafta sınırı (TSİ)');
  const hb = (an) => tek(`select gorev_hafta_basi('${an}'::timestamptz)::text`);
  ok('pazar 23:59:59 TSİ → önceki pazartesi', (await hb('2026-10-04 23:59:59+03')) === '2026-09-28');
  ok('pazartesi 00:00:00 TSİ → yeni hafta', (await hb('2026-10-05 00:00:00+03')) === '2026-10-05');
  ok('UTC 20:59:59 pazar (= 23:59:59 TSİ) hâlâ eski hafta', (await hb('2026-10-04 20:59:59+00')) === '2026-09-28');
  ok('UTC 21:00:00 pazar (= 00:00 TSİ pazartesi) yeni hafta', (await hb('2026-10-04 21:00:00+00')) === '2026-10-05');
  ok('gün başı TSİ = UTC 21:00 (önceki gün)', await tek(`select (gorev_gun_bas('2026-10-05') at time zone 'UTC')::text`) === '2026-10-04 21:00:00');
  ok('lig haftasıyla aynı (hafta_basi)', await tek(`select (gorev_hafta_basi(now()) = hafta_basi())::text`) === 'true');

  console.log('— haftalık seçim (saf)');
  const haftalar = [];
  for (let i = 0; i < 12; i++) haftalar.push((await satirlar(`select quest_id from gorev_haftalik_hesapla(gorev_hafta_basi(now()) + ${7 * i}) order by slot`)).map((x) => x.quest_id));
  ok('her hafta 3 farklı görev', haftalar.every((h) => h.length === 3 && new Set(h).size === 3));
  ok('deterministik', JSON.stringify(haftalar[2]) === JSON.stringify((await satirlar(`select quest_id from gorev_haftalik_hesapla(gorev_hafta_basi(now()) + 14) order by slot`)).map((x) => x.quest_id)));
  ok('haftalar birbirinden farklı (12 haftada ≥ 4 farklı üçlü)', new Set(haftalar.map((h) => h.slice().sort().join())).size >= 4);
  ok('hepsi haftalık havuzdan', haftalar.flat().every((q) => q.startsWith('hft_')));

  console.log('— gorevlerim: biçim, tembel yazım, herkese aynı');
  const B = await tek(`select id from profiles where id <> '${A}' and not coalesce(is_bot, false) order by created_at limit 1`);
  const g1 = await js('select gorevlerim()::text');
  ok('günlük 3 görev, sırayla kolay/orta/zor', g1.gunluk.gorevler.map((x) => x.zorluk).join() === 'kolay,orta,zor');
  ok('haftalık 3 görev, zorluk null', g1.haftalik.gorevler.length === 3 && g1.haftalik.gorevler.every((x) => x.zorluk === null));
  ok('alanlar: quest_id ad_tr ad_en hedef ilerleme alindi alinabilir odul{coin,sp}', [...g1.gunluk.gorevler, ...g1.haftalik.gorevler].every((x) => x.quest_id && x.ad_tr && x.ad_en && x.hedef > 0 && x.ilerleme === 0 && x.alindi === false && x.alinabilir === false && typeof x.odul.coin === 'number' && typeof x.odul.sp === 'number'));
  ok('ödül rakamları ayardan: günlük 15/10, haftalık 50/25', g1.gunluk.gorevler.every((x) => x.odul.coin === 15 && x.odul.sp === 10) && g1.haftalik.gorevler.every((x) => x.odul.coin === 50 && x.odul.sp === 25));
  ok('yenilenme_sn makul (günlük ≤ 86400, haftalık ≤ 604800, haftalık ≥ günlük)', g1.gunluk.yenilenme_sn > 0 && g1.gunluk.yenilenme_sn <= 86400 && g1.haftalik.yenilenme_sn >= g1.gunluk.yenilenme_sn && g1.haftalik.yenilenme_sn <= 604800);
  ok('sandık: 0/3, kilitli, 75 SP + soru_degistir x1', (({ tamam, hedef, alindi, alinabilir, sp, joker }) => tamam === 0 && hedef === 3 && alindi === false && alinabilir === false && sp === 75 && joker.tur === 'soru_degistir' && joker.adet === 1)(g1.haftalik.sandik), JSON.stringify(g1.haftalik.sandik));
  ok('alinabilir_sayi 0', g1.alinabilir_sayi === 0);
  ok('kategori görevinde parametre.kategori var', g1.gunluk.gorevler.filter((x) => x.sayac === 'kategori_dogru').every((x) => kategoriler.has(x.parametre.kategori)));
  await ben(B);
  const gB = await js('select gorevlerim()::text');
  ok('başka oyuncuya AYNI görevler', JSON.stringify(gB.gunluk.gorevler.map((x) => [x.quest_id, x.parametre])) === JSON.stringify(g1.gunluk.gorevler.map((x) => [x.quest_id, x.parametre])) && JSON.stringify(gB.haftalik.gorevler.map((x) => x.quest_id)) === JSON.stringify(g1.haftalik.gorevler.map((x) => x.quest_id)));
  await ben(A);
  ok('gün seçimi yazıldı (3 satır) ve hafta seçimi yazıldı (3 satır)', await tek(`select count(*) from gunluk_gorev_secimi where tarih = (now() at time zone 'Europe/Istanbul')::date`) === '3' && await tek(`select count(*) from haftalik_gorev_secimi where hafta = gorev_hafta_basi(now())`) === '3');
  // havuz sonradan değişse de yazılmış gün bozulmaz
  const gunIds = g1.gunluk.gorevler.map((x) => x.quest_id);
  await db.sorgu(`update gorev_havuzu set aktif = false where quest_id in ('${gunIds.join("','")}')`);
  await db.sorgu(`insert into gorev_havuzu (quest_id, kapsam, zorluk, sayac, hedef, ad_tr, ad_en) values ('gun_test_yeni','gunluk','kolay','mac_oyna',1,'Yeni','New')`);
  const g1b = await js('select gorevlerim()::text');
  ok('havuz değişince yazılmış günün görevleri aynı kaldı', JSON.stringify(g1b.gunluk.gorevler.map((x) => x.quest_id)) === JSON.stringify(gunIds));
  ok('ama havuzdaki yeni yarının hesabına girer (saf)', (await satirlar(`select quest_id from gorev_gunluk_hesapla(current_date + 30)`)).length === 3);
  await db.sorgu(`update gorev_havuzu set aktif = true where quest_id in ('${gunIds.join("','")}')`);
  await db.sorgu(`delete from gorev_havuzu where quest_id = 'gun_test_yeni'`);

  console.log('— sayaçlar (fixture: Antrenman, gizli bot, terk eden, Düello)');
  const acikBot = await tek(`select id from profiles where is_bot and (coalesce(bot_turu,'acik')='acik' or coalesce(acik_bot,false)) limit 1`);
  const gizliBot = await tek(`select id from profiles where is_bot and coalesce(bot_turu,'')<>'acik' and not coalesce(acik_bot,false) limit 1`);
  ok('açık ve gizli bot bulundu', Boolean(acikBot) && Boolean(gizliBot) && acikBot !== gizliBot);
  const SORULAR = `(select array_agg(q.id order by q.kategori) from (select distinct on (kategori) id, kategori from questions where aktif and kategori not in ('genel','karisik') order by kategori, id) q)`;
  const KATLAR = (await satirlar(`select kategori from (select distinct on (kategori) id, kategori from questions where aktif and kategori not in ('genel','karisik') order by kategori, id) q order by kategori`)).map((x) => x.kategori);
  // match: rakip, kazanan, terk, doğru cevap sayısı (soru 0..n-1 = alfabetik kategori)
  async function mac({ rakip, kazanan = A, terk = null, dogru = 0, durum = 'bitti' }) {
    const id = await tek(`insert into matches (oyuncu1, oyuncu2, durum, dereceli, soru_ids) values ('${A}', '${rakip}', 'aktif', true, ${SORULAR}) returning id`);
    for (let i = 0; i < dogru; i++) await db.sorgu(`insert into match_answers (match_id, user_id, soru_index, cevap, dogru) values ('${id}', '${A}', ${i}, 0, true)`);
    await db.sorgu(`update matches set durum='${durum}', kazanan=${kazanan ? `'${kazanan}'` : 'null'}, terk_eden=${terk ? `'${terk}'` : 'null'}, bitis=now() where id='${id}'`);
    return id;
  }
  async function duello({ rakip, kazanan = A, terk = null, dogruBen = 0, dogruRakip = 0, benSaldiran = false }) {
    const id = await tek(`insert into duellolar (oyuncu1, oyuncu2, durum) values ('${A}', '${rakip}', 'aktif') returning id`);
    const soru = await tek(`select id from questions where aktif and kategori='${KATLAR[0]}' limit 1`);
    for (let i = 0; i < dogruBen + dogruRakip; i++) {
      // ben savunan (dogru) ya da saldıran (dogru_saldiran)
      const benDogru = i < dogruBen;
      if (benSaldiran) await db.sorgu(`insert into duello_hamleler (duello_id, tur, saldiran, savunan, kategori, soru_id, dogru, dogru_saldiran) values ('${id}', ${i + 1}, '${A}', '${rakip}', '${KATLAR[0]}', '${soru}', ${!benDogru}, ${benDogru})`);
      else await db.sorgu(`insert into duello_hamleler (duello_id, tur, saldiran, savunan, kategori, soru_id, dogru, dogru_saldiran) values ('${id}', ${i + 1}, '${rakip}', '${A}', '${KATLAR[0]}', '${soru}', ${benDogru}, ${!benDogru})`);
    }
    await db.sorgu(`update duellolar set durum='bitti', kazanan=${kazanan ? `'${kazanan}'` : 'null'}, terk_eden=${terk ? `'${terk}'` : 'null'}, bitis=now() where id='${id}'`);
    return id;
  }
  const olcum = async (sayac, param = '{}') => Number(await tek(`select gorev_olcum('${A}', '${sayac}', '${param}'::jsonb, gorev_gun_bas((now() at time zone 'Europe/Istanbul')::date), gorev_gun_bas((now() at time zone 'Europe/Istanbul')::date + 1))`));
  const hftOlcum = async (sayac, param = '{}') => Number(await tek(`select gorev_olcum('${A}', '${sayac}', '${param}'::jsonb, gorev_gun_bas(gorev_hafta_basi(now())), gorev_gun_bas(gorev_hafta_basi(now()) + 7))`));
  const bas = { oyna: await olcum('mac_oyna'), kazan: await olcum('mac_kazan'), dogru: await olcum('dogru_soru'), dm: await olcum('duello_mac'), dg: await olcum('duello_galibiyet'), fk: await olcum('farkli_kategori_dogru'), kd: await olcum('kategori_dogru', JSON.stringify({ kategori: KATLAR[0] })) };
  // 1) Antrenman (açık bot) maçı: kazanılmış, 10 doğru → HİÇBİRİ sayılmaz
  await mac({ rakip: acikBot, kazanan: A, dogru: 10 });
  await duello({ rakip: acikBot, kazanan: A, dogruBen: 3 });
  ok('Antrenman (açık bot) maçı/düellosu hiçbir sayaca girmez', await olcum('mac_oyna') === bas.oyna && await olcum('mac_kazan') === bas.kazan && await olcum('dogru_soru') === bas.dogru && await olcum('duello_mac') === bas.dm && await olcum('duello_galibiyet') === bas.dg && await olcum('farkli_kategori_dogru') === bas.fk);
  // 2) Gizli bot: normal oyuncu → sayılır (10 doğru: 10 farklı kategori)
  await mac({ rakip: gizliBot, kazanan: A, dogru: 10 });
  ok('gizli bot maçı: mac_oyna +1, mac_kazan +1, dogru_soru +10', await olcum('mac_oyna') === bas.oyna + 1 && await olcum('mac_kazan') === bas.kazan + 1 && await olcum('dogru_soru') === bas.dogru + 10);
  ok('farklı kategori: 10 doğru → 10 farklı kategori', await olcum('farkli_kategori_dogru') === KATLAR.length);
  ok('kategori_dogru (alfabetik ilk kategori): +1', await olcum('kategori_dogru', JSON.stringify({ kategori: KATLAR[0] })) === bas.kd + 1);
  ok('kategori_dogru olmayan kategoride 0', await olcum('kategori_dogru', JSON.stringify({ kategori: 'yok_boyle_kategori' })) === 0);
  // 3) terk eden (ben) → sayılmaz; rakip terk etti, ben kazandım → sayılır
  const o1 = await olcum('mac_oyna'), d1 = await olcum('dogru_soru');
  await mac({ rakip: gizliBot, kazanan: gizliBot, terk: A, dogru: 4 });
  ok('terk eden maç sayılmaz (maç + doğru cevaplar)', await olcum('mac_oyna') === o1 && await olcum('dogru_soru') === d1 && await olcum('mac_kazan') === bas.kazan + 1);
  await mac({ rakip: gizliBot, kazanan: A, terk: gizliBot, dogru: 0 });
  ok('rakip terk etti, ben kazandım → sayılır', await olcum('mac_oyna') === o1 + 1 && await olcum('mac_kazan') === bas.kazan + 2);
  ok('iptal (durum iptal) maç sayılmaz', (await mac({ rakip: gizliBot, kazanan: null, durum: 'iptal', dogru: 0 }), await olcum('mac_oyna')) === o1 + 1);
  // 4) Düello sayaçları (gizli bot): oynanan/galibiyet; doğru: savunan (dogru) + saldıran (dogru_saldiran)
  await duello({ rakip: gizliBot, kazanan: A, dogruBen: 2, dogruRakip: 1, benSaldiran: false });
  await duello({ rakip: gizliBot, kazanan: gizliBot, dogruBen: 1, dogruRakip: 1, benSaldiran: true });
  ok('duello_mac +2 · duello_galibiyet +1', await olcum('duello_mac') === bas.dm + 2 && await olcum('duello_galibiyet') === bas.dg + 1);
  ok('mac_oyna Düello’yu da sayar (+2), mac_kazan galibiyeti (+1)', await olcum('mac_oyna') === o1 + 1 + 2 && await olcum('mac_kazan') === bas.kazan + 2 + 1);
  ok('Düello doğruları: savunan + saldıran (2 + 1 = 3)', await olcum('dogru_soru') === d1 + 3);
  await duello({ rakip: gizliBot, kazanan: gizliBot, terk: A, dogruBen: 5 });
  ok('terk eden Düello sayılmaz', await olcum('duello_mac') === bas.dm + 2 && await olcum('dogru_soru') === d1 + 3);
  ok('haftalık pencere bugünü içerir (≥ günlük)', await hftOlcum('mac_oyna') >= await olcum('mac_oyna') && await hftOlcum('dogru_soru') >= await olcum('dogru_soru'));
  // pencere dışı: dünkü maç bugüne sayılmaz, haftaya (aynı hafta ise) sayılır
  const dun = await mac({ rakip: gizliBot, kazanan: A, dogru: 0 });
  await db.sorgu(`update matches set bitis = gorev_gun_bas((now() at time zone 'Europe/Istanbul')::date) - interval '1 second' where id='${dun}'`);
  ok('dünün (23:59:59 TSİ) maçı bugüne sayılmaz', await olcum('mac_oyna') === o1 + 1 + 2);
  const gecen = await mac({ rakip: gizliBot, kazanan: A, dogru: 0 });
  await db.sorgu(`update matches set bitis = gorev_gun_bas(gorev_hafta_basi(now())) - interval '1 second' where id='${gecen}'`);
  const hOnce = await hftOlcum('mac_oyna');
  await db.sorgu(`update matches set bitis = gorev_gun_bas(gorev_hafta_basi(now())) where id='${gecen}'`);
  ok('pazartesi 00:00:00 TSİ maçı yeni haftaya girer, 23:59:59 önceki haftaya', await hftOlcum('mac_oyna') === hOnce + 1);

  console.log('— hedef altında alma, çift alma, coin');
  // fixture şimdi: bugün A için mac_oyna ≥ 4, mac_kazan ≥ 3 … hedefleri kontrollü: tüm havuz hedefini yüksek yap, sonra düşür
  await db.sorgu(`update gorev_havuzu set hedef = 9999`);
  const gh = await js('select gorevlerim()::text');
  const ilkG = gh.gunluk.gorevler[0];
  ok('hedef altında alma reddedilir (günlük)', /henüz tamamlanmadı/.test(await hata(`select gorev_al('gunluk', '${ilkG.quest_id}')`) ?? ''));
  ok('hedef altında alma reddedilir (haftalık)', /henüz tamamlanmadı/.test(await hata(`select gorev_al('haftalik', '${gh.haftalik.gorevler[0].quest_id}')`) ?? ''));
  ok('olmayan görev: Görev bulunamadı', /Görev bulunamadı/.test(await hata(`select gorev_al('gunluk', 'yok_boyle_gorev')`) ?? ''));
  ok('başka günün/kapsamın görevi: bulunamadı (günlük id haftalıktan)', /Görev bulunamadı/.test(await hata(`select gorev_al('haftalik', '${ilkG.quest_id}')`) ?? ''));
  ok('geçersiz kapsam', /Geçersiz kapsam/.test(await hata(`select gorev_al('aylik', '${ilkG.quest_id}')`) ?? ''));
  ok('reddedilen alımlarda alım kaydı yok', await tek(`select count(*) from quest_progress where user_id='${A}' and tarih = (now() at time zone 'Europe/Istanbul')::date`) === '0' && await tek(`select count(*) from haftalik_gorev_alimi where user_id='${A}'`) === '0');
  // hedefleri 1'e indir → hepsi tamamlanabilir (fixture: maç, kazanma, düello, doğru cevap, kategori hepsi var)
  await db.sorgu(`update gorev_havuzu set hedef = 1`);
  const coin0 = Number(await tek(`select coin from profiles where id='${A}'`));
  const gk = await js('select gorevlerim()::text');
  ok('hedef 1: bugünkü günlük görevlerin hepsi alınabilir (kategori görevi de)', gk.gunluk.gorevler.every((x) => x.alinabilir) , JSON.stringify(gk.gunluk.gorevler.map((x) => [x.quest_id, x.ilerleme, x.hedef])));
  ok('alinabilir_sayi = 3 günlük + 3 haftalık (sandık hariç)', gk.alinabilir_sayi === 6 || gk.alinabilir_sayi === gk.gunluk.gorevler.length + gk.haftalik.gorevler.filter((x) => x.alinabilir).length);
  const a1 = await js(`select gorev_al('gunluk', '${gk.gunluk.gorevler[0].quest_id}')::text`);
  ok('günlük alım: alindi true, coin 15, SP null (sezon kapalı)', a1.alindi === true && a1.zaten === false && a1.coin === 15 && a1.sp === null, JSON.stringify(a1));
  ok('coin +15, hareket tür gorev', Number(await tek(`select coin from profiles where id='${A}'`)) === coin0 + 15 && await tek(`select count(*) from coin_hareketleri where user_id='${A}' and tur='gorev' and referans like 'gorev:gunluk:%'`) === '1');
  const a1b = await js(`select gorev_al('gunluk', '${gk.gunluk.gorevler[0].quest_id}')::text`);
  ok('çift alma: zaten true, coin/SP verilmez', a1b.alindi === false && a1b.zaten === true && Number(await tek(`select coin from profiles where id='${A}'`)) === coin0 + 15);
  ok('quest_progress tek satır', await tek(`select count(*) from quest_progress where user_id='${A}' and quest_id='${gk.gunluk.gorevler[0].quest_id}'`) === '1');
  ok('gorevlerim: alindi true, alinabilir false', (await js('select gorevlerim()::text')).gunluk.gorevler[0].alindi === true);

  console.log('— geriye uyum (get_daily_quests / claim_quest)');
  const eski = await satirlar(`select quest_id, ad, hedef, odul, ilerleme, alindi from get_daily_quests()`);
  ok('get_daily_quests: 3 satır, aynı kolonlar, aynı görevler', eski.length === 3 && eski.map((x) => x.quest_id).join() === gk.gunluk.gorevler.map((x) => x.quest_id).join() && eski[0].alindi === 't' && eski[1].alindi === 'f');
  ok('get_daily_quests: ad Türkçe, odul coin (15), ilerleme ≤ hedef', eski.every((x) => x.ad && x.odul === '15' && Number(x.ilerleme) <= Number(x.hedef)));
  ok('claim_quest yeni günlük görevi alır (true)', await tek(`select claim_quest('${gk.gunluk.gorevler[1].quest_id}')`) === 't');
  ok('claim_quest ikinci kez false', await tek(`select claim_quest('${gk.gunluk.gorevler[1].quest_id}')`) === 'f');
  ok('claim_quest: gorev_al ile alınan görev false (ortak kayıt)', await tek(`select claim_quest('${gk.gunluk.gorevler[0].quest_id}')`) === 'f');
  ok('claim_quest eski kimlik (mac_oyna_3) bugün seçimde değil → Görev bulunamadı', /Görev bulunamadı/.test(await hata(`select claim_quest('mac_oyna_3')`) ?? ''));
  ok('gorev_sayaci eski kimlik hâlâ çalışır (BP bonus görevi)', Number(await tek(`select gorev_sayaci('mac_oyna_3', '${A}', (now() at time zone 'Europe/Istanbul')::date)`)) >= 3);
  ok('gorev_sayaci yeni kimlik havuzdan (mac_oyna_2 benzeri)', Number(await tek(`select gorev_sayaci('hft_mac_oyna_15', '${A}', (now() at time zone 'Europe/Istanbul')::date)`)) >= 3 && await tek(`select gorev_sayaci('olmayan', '${A}', current_date)`) === '0');
  ok('eski bugün-alınmış kayıt bozulmaz (mac_oyna_3 satırı eklenebilir, yeni görevi etkilemez)', (await db.sorgu(`insert into quest_progress (user_id, tarih, quest_id, odul) values ('${A}', (now() at time zone 'Europe/Istanbul')::date, 'mac_oyna_3', 20)`), (await js('select gorevlerim()::text')).gunluk.gorevler.length === 3));

  console.log('— haftalık alma + sandık');
  const gw = await js('select gorevlerim()::text');
  ok('sandık kilitli (0/3) alınamaz', /hepsini almadan/.test(await hata('select haftalik_sandik_al()') ?? ''));
  const hq = gw.haftalik.gorevler.map((x) => x.quest_id);
  const coinH0 = Number(await tek(`select coin from profiles where id='${A}'`));
  await db.sorgu(`update oyun_ayarlari set deger='1000'::jsonb where anahtar='coin_gunluk_tavan'`);
  const w1 = await js(`select gorev_al('haftalik', '${hq[0]}')::text`);
  ok('haftalık alım: coin 50, SP null (sezon kapalı)', w1.alindi === true && w1.coin === 50 && w1.sp === null, JSON.stringify(w1));
  ok('haftalık çift alma: zaten', (await js(`select gorev_al('haftalik', '${hq[0]}')::text`)).zaten === true);
  await tek(`select gorev_al('haftalik', '${hq[1]}')`);
  ok('2/3 alındı: sandık hâlâ reddedilir', /hepsini almadan/.test(await hata('select haftalik_sandik_al()') ?? ''));
  const gw2 = await js('select gorevlerim()::text');
  ok('3. görev tamamlanmış ama ALINMAMIŞ: sandık alinabilir false, tamam 2', gw2.haftalik.gorevler[2].alinabilir === true && gw2.haftalik.sandik.tamam === 2 && gw2.haftalik.sandik.alinabilir === false);
  const envOnce = Number(await tek(`select coalesce((select adet from joker_envanter where user_id='${A}' and tur='soru_degistir'),0)`));
  await tek(`select gorev_al('haftalik', '${hq[2]}')`);
  const gw3 = await js('select gorevlerim()::text');
  ok('3/3 alındı: sandık alinabilir, alinabilir_sayi sandığı içerir', gw3.haftalik.sandik.alinabilir === true && gw3.haftalik.sandik.tamam === 3 && gw3.alinabilir_sayi >= 1);
  const s1 = await js('select haftalik_sandik_al()::text');
  ok('sandık: alindi true, SP null (sezon kapalı), joker soru_degistir x1', s1.alindi === true && s1.zaten === false && s1.sp === null && s1.joker.tur === 'soru_degistir' && s1.joker.adet === 1, JSON.stringify(s1));
  ok('joker envantere +1 ve işlem kaydı (kaynak hediye)', Number(await tek(`select adet from joker_envanter where user_id='${A}' and tur='soru_degistir'`)) === envOnce + 1 && await tek(`select count(*) from joker_islemleri where user_id='${A}' and kaynak='hediye' and ref like 'gorev:haftalik_sandik:%'`) === '1');
  const s2 = await js('select haftalik_sandik_al()::text');
  ok('sandık çift alma: zaten, joker ikinci kez verilmez', s2.alindi === false && s2.zaten === true && Number(await tek(`select adet from joker_envanter where user_id='${A}' and tur='soru_degistir'`)) === envOnce + 1);
  ok('coin: 3 haftalık görev × 50', Number(await tek(`select coin from profiles where id='${A}'`)) - coinH0 === 150);
  ok('gorevlerim: sandık alindi true', (await js('select gorevlerim()::text')).haftalik.sandik.alindi === true);
  ok('haftalik_gorev_alimi: 3 görev + sandık', await tek(`select count(*) from haftalik_gorev_alimi where user_id='${A}'`) === '4');

  console.log('— coin tavanı (eski günlük görevle aynı kural)');
  await db.sorgu(`update oyun_ayarlari set deger='400'::jsonb where anahtar='coin_gunluk_tavan'`);
  const kalan = Number(await tek(`select coin_gunluk_kalan('${A}')`));
  ok('tavan doldu → kalan ≥ 0', kalan >= 0);
  // yeni gün penceresi simülasyonu yerine: tavanı bugünkü harcamaya eşitle → alınan görev coin vermez ama alındı sayılır
  await db.sorgu(`update oyun_ayarlari set deger = to_jsonb(${Number(await tek(`select coalesce(sum(miktar),0) from coin_hareketleri where user_id='${A}' and miktar>0 and tur not in ('satin_alma','baslangic','ikram_iade','ekonomi_esitleme','seviye','sezon_yolu') and (olusturuldu at time zone 'Europe/Istanbul')::date = (now() at time zone 'Europe/Istanbul')::date`)) + 7}::int) where anahtar='coin_gunluk_tavan'`);
  const coinT0 = Number(await tek(`select coin from profiles where id='${A}'`));
  const tv = await js(`select gorev_al('gunluk', '${gk.gunluk.gorevler[2].quest_id}')::text`);
  ok('tavanda 7 coin kaldı: yalnız 7 verilir (15 değil)', tv.alindi === true && tv.coin === 7 && Number(await tek(`select coin from profiles where id='${A}'`)) === coinT0 + 7, JSON.stringify(tv));
  await db.sorgu(`update oyun_ayarlari set deger='400'::jsonb where anahtar='coin_gunluk_tavan'`);

  console.log('— SP: sezon açık, BP çarpanı');
  await ayar('sezon_yolu_acik', 'true');
  await tek('select sezon_tik()');
  const sezon = await tek(`select id from sezonlar where kapandi_at is null and not test`);
  ok('gerçek sezon açıldı', Boolean(sezon));
  // yeni bir gün/hafta görevi almak için alım kayıtlarını temizle (yalnız bu işlemde)
  await db.sorgu(`delete from quest_progress where user_id='${A}' and tarih=(now() at time zone 'Europe/Istanbul')::date`);
  await db.sorgu(`delete from haftalik_gorev_alimi where user_id='${A}'`);
  await db.sorgu(`delete from coin_hareketleri where user_id='${A}' and tur='gorev'`);
  const sp = async () => Number(await tek(`select coalesce((select sp from oyuncu_sezon_puani where sezon=${sezon} and user_id='${A}'),0)`));
  const sp0 = await sp();
  const c1 = await js(`select gorev_al('gunluk', '${gk.gunluk.gorevler[0].quest_id}')::text`);
  ok('günlük: SP 10 (BP yok)', c1.sp === 10 && (await sp()) === sp0 + 10, JSON.stringify(c1));
  const w = await js(`select gorev_al('haftalik', '${hq[0]}')::text`);
  ok('haftalık: SP 25', w.sp === 25 && w.coin === 50 && (await sp()) === sp0 + 35, JSON.stringify(w));
  ok('SP kaynak gorev, referans biçimi', await tek(`select count(*) from sezon_puan_hareketleri where user_id='${A}' and sezon=${sezon} and kaynak='gorev' and referans like 'gorev:haftalik:%:${hq[0]}'`) === '1');
  await db.sorgu(`insert into oyuncu_bp_sahipligi (sezon, user_id, fiyat_elmas) values (${sezon}, '${A}', 500)`);
  const wb = await js(`select gorev_al('haftalik', '${hq[1]}')::text`);
  ok('BP sahibi: haftalık SP 25 × 1,25 = 31', wb.sp === 31, JSON.stringify(wb));
  const cb = await js(`select gorev_al('gunluk', '${gk.gunluk.gorevler[1].quest_id}')::text`);
  ok('BP sahibi: günlük SP 10 × 1,25 = 13', cb.sp === 13, JSON.stringify(cb));
  await tek(`select gorev_al('haftalik', '${hq[2]}')`);
  const sb = await js('select haftalik_sandik_al()::text');
  ok('BP sahibi: sandık SP 75 × 1,25 = 94, joker verilir', sb.sp === 94 && sb.joker.adet === 1, JSON.stringify(sb));
  ok('sandık SP çift sayılmaz (tek hareket)', await tek(`select count(*) from sezon_puan_hareketleri where user_id='${A}' and referans like 'gorev:haftalik_sandik:%'`) === '1');
  ok('Sezon Yolu kapalı kalmadı bu işlemde ama canlıda etkisi yok (rollback)', true);
} catch (e) {
  kaldi++;
  console.log('  ✗ BEKLENMEDİK HATA:', e.message);
} finally {
  try { await db.sorgu('rollback'); } catch { /* yoksay */ }
  const canli = await db.tek(`select deger::text from oyun_ayarlari where anahtar='sezon_yolu_acik'`);
  console.log(`\ncanlıda sezon_yolu_acik = ${canli} (rollback sonrası)`);
  await db.kapat();
}
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
