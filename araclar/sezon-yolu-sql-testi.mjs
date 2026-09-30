// Sezon Yolu (720–722) SQL provası — tek transaction, sonunda ROLLBACK (canlıya hiçbir şey yazılmaz).
// Sınar: bayrak kapısı · sahip test sezonu · ilk sezon bayrakla başlar (bitiş 00:00 TSİ) · seviye eşik sınırları ·
// SP çift sayma yok · maç tetikleyicisi (terk eden almaz) · günlük maç tavanı · görev SP'si · elmas yetersizse hata ve
// bakiye aynı · BP satın alma (elmas düşer, defter, geriye dönük ücretli ödüller) · çift satın alma · BP çarpanı ·
// ödül alma kuralları · coin tavan dışı · placeholder → gerçek ödül tetikleyicisi · 28/28 unvanı · kart altın isim/halka ·
// sezon kapanışı (BP ve altın isim kapanır, kalıcılar kalır, alınmamışlar verilir, yeni sezon açılır) · pay-to-win yok ·
// yetkiler.
// Kullanım: node araclar/sezon-yolu-sql-testi.mjs [migration.sql ...]  (verilenler önce uygulanır)
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
try {
  await db.sorgu('begin');
  for (const m of MIGLER) await db.sorgu(fs.readFileSync(m, 'utf8'));
  // canlıda başka açık sezon varsa (uygulanmışsa) testi temiz başlat
  await db.sorgu(`update sezonlar set kapandi_at = now() where kapandi_at is null`);
  await ben(A);

  console.log('— bayrak kapalı');
  ok('ödül tablosu 56 yuva', await tek('select count(*) from bp_seviye_odulleri') === '56');
  ok('placeholder yuvalar: 4 avatar + 5 çerçeve + 1 tepki', await tek(`select string_agg(tur||':'||n, ',' order by tur) from (select tur, count(*) n from bp_seviye_odulleri where placeholder group by tur) x`) === 'avatar:4,cerceve:5,tepki_paketi:1');
  ok('ücretli kol elmas toplamı < BP fiyatı', Number(await tek(`select sum((veri->>'miktar')::int) from bp_seviye_odulleri where kol='ucretli' and tur='elmas'`)) < 500);
  ok('kapalıyken oyuncuya görünmez', (await js('select sezon_yolu_durumum()::text')).gorunur === false);
  ok('kapalıyken özet görünmez', (await js('select sezon_ozetim()::text')).gorunur === false);
  ok('kapalıyken SP verilmez', await tek(`select sezon_puani_ekle('${A}', 'mac', 'x:1', 10)`) === null);
  ok('sahip test aracı sahip dışına kapalı', /Yalnız sahip/.test(await hata('select sezon_sahip_sp_ekle(100)') ?? ''));

  console.log('— sahip test modu (bayrak kapalı)');
  await db.sorgu(`update oyun_ayarlari set deger = deger || to_jsonb('${A}'::text) where anahtar='sahip_kullanicilar'`);
  const t = await js('select sezon_yolu_durumum()::text');
  ok('sahip test sezonunu görür', t.gorunur === true && t.test === true && t.sezon.no === 0);
  await tek('select sezon_sahip_sp_ekle(250)');
  ok('test SP işlendi (seviye 2)', (await js('select sezon_ozetim()::text')).seviye === 2);
  await tek('select bp_satin_al()');
  ok('test sezonunda kart altın isim yalnız kendine', await tek(`select isim_efekti from oyuncu_kartlari(array['${A}'::uuid])`) === 'isim_altin');
  const elmasOnce = Number(await tek(`select elmas from profiles where id='${A}'`));
  await tek('select sezon_sahip_test_sifirla()');
  ok('sıfırla: BP elması iade, SP 0', Number(await tek(`select elmas from profiles where id='${A}'`)) === elmasOnce + 500 && (await js('select sezon_ozetim()::text')).sp === 0);
  await db.sorgu(`update oyun_ayarlari set deger = deger - '${A}' where anahtar='sahip_kullanicilar'`);

  console.log('— bayrak açılır');
  await ayar('sezon_yolu_acik', 'true');
  const s = await js(`select row_to_json(x)::text from (select id, no, test, baslangic, bitis,
      (bitis at time zone 'Europe/Istanbul')::time::text as saat, ((bitis at time zone 'Europe/Istanbul')::date - (now() at time zone 'Europe/Istanbul')::date) as gun
      from sezonlar where kapandi_at is null and not test) x`);
  ok('bayrakla gerçek sezon açıldı', s && s.test === false && s.no >= 1);
  ok('bitiş 00:00 TSİ, 28 gün', s.saat === '00:00:00' && s.gun === 28, JSON.stringify(s));
  ok('test sezonu kapandı', await tek(`select count(*) from sezonlar where test and kapandi_at is null`) === '0');
  ok('final unvanı tanımlandı', await tek(`select count(*) from unvan_tanimlari t join sezonlar z on z.final_unvan = t.anahtar where z.id=${s.id} and t.aktif and t.nadirlik='efsanevi'`) === '1');
  ok('sezon_tik idempotent (ikinci çağrı yeni sezon açmaz)', (await tek('select sezon_tik()'), await tek(`select count(*) from sezonlar where kapandi_at is null`)) === '1');

  console.log('— seviye eşikleri');
  const esik = async (sp) => Number(await tek(`select sezon_seviye(${sp})`));
  ok('0/99/100/199/200', (await esik(0)) === 0 && (await esik(99)) === 0 && (await esik(100)) === 1 && (await esik(199)) === 1 && (await esik(200)) === 2);
  ok('2799 → 27, 2800 → 28, 9999 → 28', (await esik(2799)) === 27 && (await esik(2800)) === 28 && (await esik(9999)) === 28);
  await ayar('sezon_sp_esik_artis', '10');
  ok('artan eşik ayarı: seviye 3 = 330', await tek('select sezon_esik(3)') === '330');
  await ayar('sezon_sp_esik_artis', '0');

  console.log('— SP kaynakları');
  ok('SP verilir', await tek(`select sezon_puani_ekle('${A}', 'turnuva', 'ref:1', 15)`) === '15');
  ok('aynı kaynak ikinci kez sayılmaz', await tek(`select sezon_puani_ekle('${A}', 'turnuva', 'ref:1', 15)`) === null);
  // gerçek maç tetikleyicisi: A kazanır, rakip (gizli bot) terk etmiş → yalnız A alır
  const bot = await tek(`select id from profiles where is_bot and coalesce(bot_turu,'')<>'acik' and not coalesce(acik_bot,false) limit 1`);
  const mac = await tek(`insert into matches (oyuncu1, oyuncu2, durum, dereceli) values ('${A}', '${bot}', 'aktif', true) returning id`);
  const spOnce = Number(await tek(`select sp from oyuncu_sezon_puani where user_id='${A}' and sezon=${s.id}`));
  await db.sorgu(`update matches set durum='bitti', kazanan='${A}', terk_eden='${bot}', bitis=now() where id='${mac}'`);
  const spSonra = Number(await tek(`select sp from oyuncu_sezon_puani where user_id='${A}' and sezon=${s.id}`));
  ok('maç bitince kazanan SP alır (oyna+galibiyet × çarpan)', spSonra - spOnce === Math.round(20 * Number(await tek(`select odul_carpan from matches where id='${mac}'`))), `${spOnce}→${spSonra}`);
  ok('bot SP almaz', await tek(`select count(*) from sezon_puan_hareketleri where user_id='${bot}'`) === '0');
  // terk eden almaz
  const mac2 = await tek(`insert into matches (oyuncu1, oyuncu2, durum, dereceli) values ('${A}', '${bot}', 'aktif', true) returning id`);
  await db.sorgu(`update matches set durum='bitti', kazanan='${bot}', terk_eden='${A}', bitis=now() where id='${mac2}'`);
  ok('terk eden SP almaz', await tek(`select count(*) from sezon_puan_hareketleri where referans='mac:${mac2}'`) === '0');
  // günlük maç tavanı (taban 150)
  for (let i = 0; i < 12; i++) await tek(`select sezon_puani_ekle('${A}', 'duello', 'tavan:${i}', 20)`);
  ok('günlük maç SP tavanı 150', await tek(`select sum(taban) from sezon_puan_hareketleri where user_id='${A}' and sezon=${s.id} and kaynak in ('mac','duello')`) === '150');
  // görev tetikleyicisi
  await db.sorgu(`insert into quest_progress (user_id, tarih, quest_id, odul) values ('${A}', current_date - 400, 'mac_oyna_3', 0)`);
  ok('günlük görev alınınca SP', await tek(`select miktar from sezon_puan_hareketleri where user_id='${A}' and kaynak='gorev'`) === '10');

  console.log('— Battle Pass satın alma');
  await db.sorgu(`update oyuncu_sezon_puani set sp = 1250, seviye = sezon_seviye(1250) where user_id='${A}' and sezon=${s.id}`);   // seviye 12
  await tek(`select bp_odul_al(1, 'ucretsiz')`);                     // bir ücretsiz ödülü önceden al
  await db.sorgu(`update profiles set elmas = 499 where id='${A}'`);
  ok('elmas yetersiz → hata', /Yetersiz elmas/.test(await hata('select bp_satin_al()') ?? ''));
  ok('bakiye değişmedi, sahiplik yok', await tek(`select elmas from profiles where id='${A}'`) === '499' && await tek(`select count(*) from oyuncu_bp_sahipligi where user_id='${A}'`) === '0');
  await db.sorgu(`update profiles set elmas = 1000 where id='${A}'`);
  const coinOnce = Number(await tek(`select coin from profiles where id='${A}'`));
  const al = await js('select bp_satin_al()::text');
  ok('satın alındı, elmas 500 düştü', al.ok && await tek(`select elmas from profiles where id='${A}'`) === String(1000 - 500 + Number(await tek(`select coalesce(sum(miktar),0) from elmas_hareketleri where user_id='${A}' and tur='sezon_yolu' and referans like 'sezon:${s.id}:%'`))));
  ok('elmas defterinde -500', await tek(`select count(*) from elmas_hareketleri where user_id='${A}' and tur='battle_pass' and miktar=-500 and referans='sezon:${s.id}'`) === '1');
  ok('geriye dönük: 12 ücretli yuva alındı', al.verilen.length === 12 && await tek(`select count(*) from oyuncu_bp_odul_alimi where user_id='${A}' and sezon=${s.id} and kol='ucretli'`) === '12');
  ok('placeholder yuvalar verildi=false (5 avatar, 8 çerçeve)', await tek(`select string_agg(seviye::text, ',' order by seviye) from oyuncu_bp_odul_alimi where user_id='${A}' and sezon=${s.id} and not verildi`) === '5,8');
  ok('ücretli coin tavandan bağımsız verildi (150+200+250)', Number(await tek(`select coalesce(sum(miktar),0) from coin_hareketleri where user_id='${A}' and tur='sezon_yolu' and referans like 'sezon:${s.id}:%:ucretli'`)) === 600);
  ok('tepki paketi envantere girdi', await tek(`select count(*) from oyuncu_kozmetikleri where user_id='${A}' and kozmetik in ('tepki_eglence','tepki_rekabet')`) === '2');
  ok('çift satın alma → hata', /zaten sende/.test(await hata('select bp_satin_al()') ?? ''));
  ok('kart: altın isim + halka', await tek(`select isim_efekti||':'||sezon_bp from oyuncu_kartlari(array['${A}'::uuid])`) === 'isim_altin:true');
  ok('BP çarpanı: turnuva 15 → 19', await tek(`select miktar from sezon_puan_hareketleri where sezon=${s.id} and user_id='${A}' and referans='carpan:1' union all select null limit 0`) === null && (await tek(`select sezon_puani_ekle('${A}', 'turnuva', 'carpan:1', 15)`), await tek(`select miktar from sezon_puan_hareketleri where referans='carpan:1'`)) === '19');

  console.log('— ödül alma kuralları');
  ok('ulaşılmamış seviye → hata', /henüz ulaşmadın/.test(await hata('select bp_odul_al(20, \'ucretsiz\')') ?? ''));
  ok('ücretsiz yuva alınır', (await js(`select bp_odul_al(2, 'ucretsiz')::text`)).ok === true);
  ok('aynı yuva ikinci kez → hata', /zaten aldın/.test(await hata('select bp_odul_al(2, \'ucretsiz\')') ?? ''));
  ok('joker hakkı envantere (+2 Ek Süre)', await tek(`select delta from joker_islemleri where user_id='${A}' and ref='sezon:${s.id}:2:ucretsiz'`) === '2');
  const toplu = await js('select bp_toplu_al()::text');
  ok('toplu al: kalan ücretsizler (3..12 = 10)', toplu.verilen.length === 10);
  ok('özet: bekleyen 0', (await js('select sezon_ozetim()::text')).alinabilir === 0);

  console.log('— placeholder → gerçek ödül (tek satır)');
  const cerceve = await tek(`select anahtar from cerceveler where kaynak <> 'dukkan' and aktif and anahtar not in (select cerceve from oyuncu_cerceveleri where user_id='${A}') limit 1`);
  await db.sorgu(`update bp_seviye_odulleri set placeholder=false, veri='{"anahtar":"${cerceve}"}' where seviye=8 and kol='ucretli'`);
  ok('daha önce alana gerçek çerçeve verildi', await tek(`select count(*) from oyuncu_cerceveleri where user_id='${A}' and cerceve='${cerceve}'`) === '1'
     && await tek(`select verildi from oyuncu_bp_odul_alimi where user_id='${A}' and sezon=${s.id} and seviye=8 and kol='ucretli'`) === 't');

  console.log('— 28/28 ve sezon kapanışı');
  const unvan = await tek(`select final_unvan from sezonlar where id=${s.id}`);
  await tek(`select sezon_puani_ekle('${A}', 'turnuva', 'final:1', 3000)`);
  ok('28/28 + BP → sezona özel unvan', await tek(`select count(*) from oyuncu_unvanlari where user_id='${A}' and unvan='${unvan}'`) === '1');
  const koleksiyonOnce = Number(await tek(`select koleksiyon_puani from profiles where id='${A}'`));
  await db.sorgu(`update sezonlar set bitis = now() - interval '1 minute', baslangic = now() - interval '28 days' where id=${s.id}`);
  await tek('select sezon_tik()');
  ok('sezon kapandı', await tek(`select kapandi_at is not null from sezonlar where id=${s.id}`) === 't');
  ok('alınmamış ödüller kapanışta verildi (56 yuva)', await tek(`select count(*) from oyuncu_bp_odul_alimi where user_id='${A}' and sezon=${s.id}`) === '56');
  ok('BP sahipliği kapandı', await tek(`select aktif from oyuncu_bp_sahipligi where user_id='${A}' and sezon=${s.id}`) === 'f');
  ok('kart: altın isim ve halka kapandı', await tek(`select coalesce(isim_efekti,'-')||':'||sezon_bp from oyuncu_kartlari(array['${A}'::uuid])`) !== 'isim_altin:true'
     && await tek(`select sezon_bp from oyuncu_kartlari(array['${A}'::uuid])`) === 'f');
  ok('kalıcılar kaldı (unvan, tepki, çerçeve)', await tek(`select count(*) from oyuncu_unvanlari where user_id='${A}' and unvan in ('${unvan}','sezon_yolcu','sezon_kasif','sezon_yol_ustasi')`) === '4'
     && await tek(`select count(*) from oyuncu_cerceveleri where user_id='${A}' and cerceve='${cerceve}'`) === '1');
  ok('koleksiyon puanı arttı', Number(await tek(`select koleksiyon_puani from profiles where id='${A}'`)) >= koleksiyonOnce);
  const s2 = await js(`select row_to_json(x)::text from (select id, no, baslangic from sezonlar where kapandi_at is null and not test) x`);
  ok('yeni sezon kendiliğinden açıldı (no+1)', s2 && s2.no === s.no + 1);
  ok('yeni sezonda SP sıfır, BP yok', (await js('select sezon_ozetim()::text')).sp === 0 && (await js('select sezon_ozetim()::text')).bp === false);
  ok('final unvanı yeni sezonda tekrar verilmez (anahtar farklı)', await tek(`select final_unvan from sezonlar where id=${s2.id}`) !== unvan);
  ok('kapalı sezona satın alma/ödül yok (yeni sezonda BP yok)', await tek(`select count(*) from oyuncu_bp_sahipligi where user_id='${A}' and sezon=${s2.id}`) === '0');

  console.log('— BP bonus görevi');
  ok('BP yokken bonus görev → hata', /Battle Pass/.test(await hata('select bp_bonus_gorev_al()') ?? ''));

  console.log('— pay-to-win yok');
  ok('maç/soru/lig/eşleşme fonksiyonları BP okumuyor', await tek(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and (prosrc ~ 'oyuncu_bp_sahipligi|bp_aktif_mi|sezon_bp_gorunur')
        and proname not in ('bp_aktif_mi','sezon_bp_gorunur','sezon_puani_ekle','sezon_kapat','sezon_final_kontrol','sezon_yolu_durumum','sezon_ozetim',
                            'bp_satin_al','bp_odul_al','bp_toplu_al','bp_bonus_gorev_al','sezon_sahip_test_sifirla','oyuncu_kartlari')`) === '0');
  ok('ödüller yalnız kozmetik/para/küçük joker (≤3)', await tek(`select count(*) from bp_seviye_odulleri where tur='joker' and (veri->>'adet')::int > 3`) === '0');

  console.log('— yetkiler');
  const yetki = async (f, rol) => (await tek(`select has_function_privilege('${rol}', 'public.${f}', 'execute')`)) === 't';
  for (const f of ['sezon_yolu_durumum()', 'sezon_ozetim()', 'bp_satin_al()', 'bp_odul_al(int,text)', 'bp_toplu_al()', 'bp_bonus_gorev_al()'])
    ok(`${f}: anon yok, authenticated var`, !(await yetki(f, 'anon')) && (await yetki(f, 'authenticated')));
  for (const f of ['sezon_puani_ekle(uuid,text,text,int)', 'sezon_kapat(bigint)', 'sezon_tik()', 'bp_odul_ver_ic(uuid,bigint,int,text)', 'sezon_ac(boolean,timestamptz)'])
    ok(`${f}: istemciye kapalı`, !(await yetki(f, 'authenticated')) && !(await yetki(f, 'anon')));
  ok('oyuncu_kartlari: anon yok, authenticated var', !(await yetki('oyuncu_kartlari(uuid[])', 'anon')) && (await yetki('oyuncu_kartlari(uuid[])', 'authenticated')));
  for (const t of ['sezonlar', 'oyuncu_sezon_puani', 'oyuncu_bp_sahipligi', 'bp_seviye_odulleri', 'oyuncu_bp_odul_alimi'])
    ok(`${t}: istemciye doğrudan erişim yok`, (await tek(`select has_table_privilege('authenticated','public.${t}','select')`)) === 'f');
  ok('cron işi kayıtlı', await tek(`select count(*) from cron.job where jobname='bildim-sezon-tik'`) === '1');
} finally {
  try { await db.sorgu('rollback'); } finally { await db.kapat(); }
}
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
