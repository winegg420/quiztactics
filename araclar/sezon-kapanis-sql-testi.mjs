// Sezon kapanışında hak edilip alınmamış ödüller (Sezon Yolu, 720) — tek transaction, sonunda ROLLBACK (canlıya yazılmaz).
// Sınar: BP'li oyuncu (ücretsiz + ücretli, bir kısmı önceden alınmış) · BP'siz oyuncu (yalnız ücretsiz) · ulaşılmamış seviye
// verilmez · önceden alınan ödül ikinci kez verilmez (defterde çift referans yok) · "?" placeholder yuva kayıt olarak durur
// (verildi=false) ve gerçek ödül tanımlanınca hak sahibine verilir · sezon_kapat / sezon_tik ikinci çalıştırmada hiçbir şey vermez.
// Kullanım: node araclar/sezon-kapanis-sql-testi.mjs [migration.sql ...]  (verilenler önce uygulanır)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIGLER = process.argv.slice(2);
const A = '5b555bd3-9371-4f35-90a5-39289111335e';   // insan test hesabı (sahip değil) — BP'li oyuncu
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
const tek = (s) => db.tek(s);
const js = async (s) => JSON.parse(await tek(s));
const ayar = (k, v) => db.sorgu(`update oyun_ayarlari set deger = '${v}'::jsonb where anahtar = '${k}'`);
try {
  await db.sorgu('begin');
  for (const m of MIGLER) await db.sorgu(fs.readFileSync(m, 'utf8'));
  await db.sorgu(`update sezonlar set kapandi_at = now() where kapandi_at is null`);
  const B = await tek(`select id from profiles where id <> '${A}' and not coalesce(is_bot, false) order by created_at limit 1`);
  ok('ikinci insan test hesabı bulundu', Boolean(B));
  await ayar('sezon_yolu_acik', 'true');
  const s = await js(`select row_to_json(x)::text from (select id from sezonlar where kapandi_at is null and not test) x`);
  ok('gerçek sezon açıldı', Boolean(s?.id));

  console.log("— hazırlık: A (BP'li, seviye 10, L1 ücretsiz önceden alınmış), B (BP'siz, seviye 6, L2 ücretsiz önceden alınmış)");
  for (const u of [A, B]) await tek(`select sezon_puani_ekle('${u}', 'turnuva', 'kapanis:ilk:${u}', 1)`);
  await db.sorgu(`update profiles set elmas = 1000 where id='${A}'`);
  await db.sorgu(`update oyuncu_sezon_puani set sp = 300, seviye = sezon_seviye(300) where user_id='${A}' and sezon=${s.id}`);
  await ben(A);
  await tek('select bp_satin_al()');                                   // L1..3 ücretli geriye dönük verilir
  await db.sorgu(`update oyuncu_sezon_puani set sp = 1000, seviye = sezon_seviye(1000) where user_id='${A}' and sezon=${s.id}`);
  await tek(`select bp_odul_al(1, 'ucretsiz')`);
  await db.sorgu(`update oyuncu_sezon_puani set sp = 600, seviye = sezon_seviye(600) where user_id='${B}' and sezon=${s.id}`);
  await ben(B);
  await tek(`select bp_odul_al(2, 'ucretsiz')`);
  ok('A seviye 10, B seviye 6', await tek(`select seviye from oyuncu_sezon_puani where user_id='${A}' and sezon=${s.id}`) === '10'
     && await tek(`select seviye from oyuncu_sezon_puani where user_id='${B}' and sezon=${s.id}`) === '6');
  ok('kapanıştan önce A: 1 ücretsiz + 3 ücretli alınmış', await tek(`select count(*) from oyuncu_bp_odul_alimi where user_id='${A}' and sezon=${s.id}`) === '4');
  ok('kapanıştan önce B: 1 ücretsiz alınmış', await tek(`select count(*) from oyuncu_bp_odul_alimi where user_id='${B}' and sezon=${s.id}`) === '1');

  const tum = `select coalesce(sum(miktar),0) from coin_hareketleri where user_id=`;
  const coinA0 = Number(await tek(`${tum}'${A}'`));
  const coinB0 = Number(await tek(`${tum}'${B}'`));

  console.log('— sezon kapanışı');
  await db.sorgu(`update sezonlar set bitis = now() - interval '1 minute', baslangic = now() - interval '28 days' where id=${s.id}`);
  await tek('select sezon_tik()');
  ok('sezon kapandı', await tek(`select kapandi_at is not null from sezonlar where id=${s.id}`) === 't');
  const alim = (u, kol) => tek(`select count(*) from oyuncu_bp_odul_alimi where user_id='${u}' and sezon=${s.id} and kol='${kol}'`);
  ok('A: seviye 10\'a kadar 10 ücretsiz ödül (alınmamışlar verildi)', await alim(A, 'ucretsiz') === '10');
  ok('A (BP\'li): 10 ücretli ödül', await alim(A, 'ucretli') === '10');
  ok('A: ulaşılmamış seviye (11+) verilmedi', await tek(`select count(*) from oyuncu_bp_odul_alimi where user_id='${A}' and sezon=${s.id} and seviye > 10`) === '0');
  ok('B: seviye 6\'ya kadar 6 ücretsiz ödül', await alim(B, 'ucretsiz') === '6');
  ok('B (BP\'siz): ücretli ödül YOK', await alim(B, 'ucretli') === '0');
  ok('B: ulaşılmamış seviye (7+) verilmedi', await tek(`select count(*) from oyuncu_bp_odul_alimi where user_id='${B}' and sezon=${s.id} and seviye > 6`) === '0');

  // Beklenen coin: alınmamış (kapanışta verilen) coin yuvalarının toplamı — önceden alınanlar yeniden sayılmaz
  const beklenenB = Number(await tek(`select coalesce(sum((veri->>'miktar')::bigint),0) from bp_seviye_odulleri where kol='ucretsiz' and tur='coin' and not placeholder and seviye between 1 and 6 and seviye <> 2`));
  ok('B: kapanışta yalnız alınmamış coin yuvaları verildi (L2 çift değil)', Number(await tek(`${tum}'${B}'`)) - coinB0 === beklenenB, `${Number(await tek(`${tum}'${B}'`)) - coinB0} ≠ ${beklenenB}`);
  const beklenenA = Number(await tek(`select coalesce(sum((veri->>'miktar')::bigint),0) from bp_seviye_odulleri where tur='coin' and not placeholder and seviye between 4 and 10 and kol='ucretli'`))
    + Number(await tek(`select coalesce(sum((veri->>'miktar')::bigint),0) from bp_seviye_odulleri where tur='coin' and not placeholder and seviye between 2 and 10 and kol='ucretsiz'`));
  ok('A: kapanışta yalnız alınmamış coin yuvaları verildi (L1 ücretsiz ve L1-3 ücretli çift değil)', Number(await tek(`${tum}'${A}'`)) - coinA0 === beklenenA, `${Number(await tek(`${tum}'${A}'`)) - coinA0} ≠ ${beklenenA}`);
  ok('defterlerde çift referans yok (coin)', await tek(`select count(*) from (select referans from coin_hareketleri where tur='sezon_yolu' and referans like 'sezon:${s.id}:%' group by user_id, referans having count(*) > 1) x`) === '0');
  ok('defterlerde çift referans yok (elmas)', await tek(`select count(*) from (select referans from elmas_hareketleri where tur='sezon_yolu' and referans like 'sezon:${s.id}:%' group by user_id, referans having count(*) > 1) x`) === '0');

  console.log('— placeholder ("?") yuvalar');
  const ph = await tek(`select string_agg(seviye||':'||kol, ',' order by seviye, kol) from oyuncu_bp_odul_alimi where user_id='${A}' and sezon=${s.id} and not verildi`);
  ok('A: placeholder yuvalar kayıt olarak duruyor, verildi=false', Boolean(ph), String(ph));
  ok('A: placeholder olmayan hiçbir kayıt verildi=false değil', await tek(`select count(*) from oyuncu_bp_odul_alimi a join bp_seviye_odulleri o on o.seviye=a.seviye and o.kol=a.kol where a.user_id='${A}' and a.sezon=${s.id} and not a.verildi and not o.placeholder`) === '0');
  ok('B: placeholder olmayan hiçbir kayıt verildi=false değil', await tek(`select count(*) from oyuncu_bp_odul_alimi a join bp_seviye_odulleri o on o.seviye=a.seviye and o.kol=a.kol where a.user_id='${B}' and a.sezon=${s.id} and not a.verildi and not o.placeholder`) === '0');

  console.log('— çift çalıştırma');
  const imza = async () => await tek(`select count(*)||':'||coalesce(sum(case when verildi then 1 else 0 end),0) from oyuncu_bp_odul_alimi where sezon=${s.id}`)
    + '|' + await tek(`${tum}'${A}'`) + '|' + await tek(`${tum}'${B}'`) + '|' + await tek(`select coalesce(sum(elmas),0) from profiles where id in ('${A}','${B}')`);
  const once = await imza();
  ok('sezon_kapat ikinci çağrıda false döner', await tek(`select sezon_kapat(${s.id})`) === 'f');
  await tek('select sezon_tik()');
  await tek('select sezon_tik()');
  ok('ikinci/üçüncü çalıştırma hiçbir şey vermedi (kayıt, coin, elmas aynı)', (await imza()) === once, `${once} → ${await imza()}`);

  console.log('— placeholder gerçek ödüle çevrilince hak sahibine verilir');
  const cerceveSatiri = await tek(`select seviye from oyuncu_bp_odul_alimi a where a.user_id='${A}' and a.sezon=${s.id} and not a.verildi and a.kol='ucretli' and exists (select 1 from bp_seviye_odulleri o where o.seviye=a.seviye and o.kol=a.kol and o.tur='cerceve') order by seviye limit 1`);
  if (cerceveSatiri) {
    const cerceve = await tek(`select anahtar from cerceveler where kaynak <> 'dukkan' and aktif and anahtar not in (select cerceve from oyuncu_cerceveleri where user_id='${A}') limit 1`);
    await db.sorgu(`update bp_seviye_odulleri set placeholder=false, veri='{"anahtar":"${cerceve}"}' where seviye=${cerceveSatiri} and kol='ucretli'`);
    ok('A: gerçek çerçeve sonradan verildi ve kayıt verildi=true oldu', await tek(`select count(*) from oyuncu_cerceveleri where user_id='${A}' and cerceve='${cerceve}'`) === '1'
       && await tek(`select verildi from oyuncu_bp_odul_alimi where user_id='${A}' and sezon=${s.id} and seviye=${cerceveSatiri} and kol='ucretli'`) === 't');
    const sonra = await tek(`select count(*) from oyuncu_bp_odul_alimi where sezon=${s.id}`);
    await tek(`select sezon_kapat(${s.id})`);
    ok('tekrar kapatma gerçek ödülü ikinci kez vermez', await tek(`select count(*) from oyuncu_cerceveleri where user_id='${A}' and cerceve='${cerceve}'`) === '1' && sonra === await tek(`select count(*) from oyuncu_bp_odul_alimi where sezon=${s.id}`));
  } else {
    ok('A\'nın seviye 1–10 aralığında ücretli çerçeve placeholder\'ı yok; gerçek ödül sınaması atlandı', true);
  }
} finally {
  try { await db.sorgu('rollback'); } finally { await db.kapat(); }
}
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
