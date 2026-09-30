// Görev sistemi yarış testi — İKİ AYRI bağlantı aynı anda: günlük görev alımı, haftalık sandık alımı.
// Canlıda, insan test hesabı (sahip DEĞİL) üzerinde kalıcı fixture yazar ve sonunda HEPSİNİ siler/geri alır
// (maçlar, cevaplar, alım kayıtları, coin/joker). Sahip hesaba ve başka oyuncuya dokunmaz.
// Kullanım: node araclar/gorevler-yaris-testi.mjs
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
const A = '5b555bd3-9371-4f35-90a5-39289111335e';
const dizgi = await baglantiDizgisi();
const [d1, d2] = [await new PgIstemci(dizgi).baglan(), await new PgIstemci(dizgi).baglan()];
let gecti = 0, kaldi = 0;
const ok = (ad, k, ek = '') => { if (k) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const kimlik = (d) => d.sorgu(`select set_config('request.jwt.claim.sub','${A}',false), set_config('request.jwt.claims','{"sub":"${A}","role":"authenticated"}',false)`);
const dene = async (d, sql) => { try { await d.sorgu('begin'); const r = await d.tek(sql); await d.sorgu('commit'); return { ok: r }; } catch (e) { try { await d.sorgu('rollback'); } catch {} return { hata: e.message }; } };
const gunSql = `(now() at time zone 'Europe/Istanbul')::date`;
let macIds = [];
let once = null;
try {
  await kimlik(d1); await kimlik(d2);
  const bot = await d1.tek(`select id from profiles where is_bot and coalesce(bot_turu,'')<>'acik' and not coalesce(acik_bot,false) limit 1`);
  once = {
    coin: Number(await d1.tek(`select coin from profiles where id='${A}'`)),
    joker: Number(await d1.tek(`select coalesce((select adet from joker_envanter where user_id='${A}' and tur='soru_degistir'),0)`)),
    qp: await d1.tek(`select count(*) from quest_progress where user_id='${A}'`),
    hga: await d1.tek(`select count(*) from haftalik_gorev_alimi where user_id='${A}'`),
    coinhar: Number(await d1.tek(`select max(id) from coin_hareketleri`)),
    jislem: Number(await d1.tek(`select coalesce(max(id),0) from joker_islemleri`)),
  };
  // fixture: 3 gizli-bot maçı, hepsi kazanılmış, 10 doğru cevap (10 farklı kategori)
  for (let i = 0; i < 3; i++) {
    const id = await d1.tek(`insert into matches (oyuncu1, oyuncu2, durum, dereceli, soru_ids) values ('${A}', '${bot}', 'aktif', true,
      (select array_agg(q.id order by q.kategori) from (select distinct on (kategori) id, kategori from questions where aktif and kategori not in ('genel','karisik') order by kategori, id) q)) returning id`);
    macIds.push(id);
    for (let s = 0; s < 10; s++) await d1.sorgu(`insert into match_answers (match_id, user_id, soru_index, cevap, dogru) values ('${id}', '${A}', ${s}, 0, true)`);
    await d1.sorgu(`update matches set durum='bitti', kazanan='${A}', bitis=now() where id='${id}'`);
  }
  const g = JSON.parse((await dene(d1, 'select gorevlerim()::text')).ok);
  const hedef = g.gunluk.gorevler.find((x) => x.alinabilir && !x.alindi);
  ok('fixture ile en az bir günlük görev alınabilir', Boolean(hedef), JSON.stringify(g.gunluk.gorevler.map((x) => [x.quest_id, x.ilerleme, x.hedef])));
  if (hedef) {
    const [a, b] = await Promise.all([dene(d1, `select gorev_al('gunluk','${hedef.quest_id}')::text`), dene(d2, `select gorev_al('gunluk','${hedef.quest_id}')::text`)]);
    const ja = a.ok ? JSON.parse(a.ok) : null, jb = b.ok ? JSON.parse(b.ok) : null;
    ok('aynı anda iki günlük alım: ikisi de hatasız döner', Boolean(ja && jb), JSON.stringify([a, b]).slice(0, 300));
    ok('tam biri alindi:true, diğeri zaten:true', [ja, jb].filter((x) => x?.alindi === true).length === 1 && [ja, jb].filter((x) => x?.zaten === true).length === 1);
    ok('quest_progress tek satır', await d1.tek(`select count(*) from quest_progress where user_id='${A}' and tarih=${gunSql} and quest_id='${hedef.quest_id}'`) === '1');
    ok('coin hareketi tek satır', await d1.tek(`select count(*) from coin_hareketleri where user_id='${A}' and tur='gorev' and referans='gorev:gunluk:'||${gunSql}::text||':${hedef.quest_id}'`) === '1');
  }
  // sandık: bu haftanın 3 görevini "alınmış" diye doğrudan yaz (fixture), sonra yarış
  const hq = g.haftalik.gorevler.map((x) => x.quest_id);
  for (const q of hq) await d1.sorgu(`insert into haftalik_gorev_alimi (user_id, hafta, quest_id) values ('${A}', gorev_hafta_basi(now()), '${q}') on conflict do nothing`);
  const [c, e] = await Promise.all([dene(d1, 'select haftalik_sandik_al()::text'), dene(d2, 'select haftalik_sandik_al()::text')]);
  const jc = c.ok ? JSON.parse(c.ok) : null, je = e.ok ? JSON.parse(e.ok) : null;
  ok('aynı anda iki sandık alımı: ikisi de hatasız döner', Boolean(jc && je), JSON.stringify([c, e]).slice(0, 300));
  ok('tam biri alindi:true, diğeri zaten:true', [jc, je].filter((x) => x?.alindi === true).length === 1 && [jc, je].filter((x) => x?.zaten === true).length === 1);
  ok('joker yalnız bir kez (+1)', Number(await d1.tek(`select adet from joker_envanter where user_id='${A}' and tur='soru_degistir'`)) === once.joker + 1
     && await d1.tek(`select count(*) from joker_islemleri where user_id='${A}' and ref like 'gorev:haftalik_sandik:%'`) === '1');
} finally {
  // temizlik: fixture + test izleri
  try {
    await d1.sorgu('begin');
    await d1.sorgu(`delete from match_answers where match_id = any(array[${macIds.map((x) => `'${x}'::uuid`).join(',') || 'null::uuid'}])`);
    await d1.sorgu(`delete from matches where id = any(array[${macIds.map((x) => `'${x}'::uuid`).join(',') || 'null::uuid'}])`);
    await d1.sorgu(`delete from quest_progress where user_id='${A}' and quest_id like 'gun\\_%' and tarih=${gunSql}`);
    await d1.sorgu(`delete from haftalik_gorev_alimi where user_id='${A}' and hafta = gorev_hafta_basi(now())`);
    if (once) {
      await d1.sorgu(`delete from coin_hareketleri where user_id='${A}' and id > ${once.coinhar} and tur='gorev'`);
      await d1.sorgu(`delete from joker_islemleri where user_id='${A}' and id > ${once.jislem} and ref like 'gorev:haftalik_sandik:%'`);
      await d1.sorgu(`update joker_envanter set adet = ${once.joker} where user_id='${A}' and tur='soru_degistir'`);
      await d1.sorgu(`select set_config('app.coin_izin','1',true)`);
      await d1.sorgu(`update profiles set coin = ${once.coin} where id='${A}'`);
    }
    await d1.sorgu('commit');
    const son = {
      coin: Number(await d1.tek(`select coin from profiles where id='${A}'`)),
      joker: Number(await d1.tek(`select coalesce((select adet from joker_envanter where user_id='${A}' and tur='soru_degistir'),0)`)),
      qp: await d1.tek(`select count(*) from quest_progress where user_id='${A}'`),
      hga: await d1.tek(`select count(*) from haftalik_gorev_alimi where user_id='${A}'`),
    };
    ok('temizlik: A coin/joker/alım kayıtları başlangıçla aynı', once && son.coin === once.coin && son.joker === once.joker && son.qp === once.qp && son.hga === once.hga, JSON.stringify({ once, son }));
  } catch (e) { try { await d1.sorgu('rollback'); } catch {} kaldi++; console.log('  ✗ TEMİZLİK HATASI', e.message); }
  await d1.kapat(); await d2.kapat();
}
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
