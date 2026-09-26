// Soru kapsamı (652) SQL provası — tek transaction, sonunda ROLLBACK (canlıya iz bırakmaz).
// Kullanım: node araclar/kapsam-sql-testi.mjs [migration.sql …]
//   (migration verilirse önce onlar uygulanır — ör. etiket migration'ını yazmadan sınamak için)
// Sınananlar: rastgele 20 maç (biri Türkiye dışı) → hepsi global · dil 'en' de yabancı sayılır ·
// bot sayılmaz · Türkiye-Türkiye maçında yerel hâlâ çıkar · Düello soru/uygunluk/uzatma ·
// Turnuva · kategori tükenmesi (kategori düşer, boş dönmez) · get_categories.
import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad, ek); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
/** soru id dizisindeki yerel soru sayısı */
const yerelSay = async (dizi) => Number(await tek(`select count(*) from unnest(${dizi}) x join questions q on q.id = x where q.kapsam <> 'global'`));

try {
  await db.sorgu('begin');
  for (const m of process.argv.slice(2)) await db.sorgu(fs.readFileSync(m, 'utf8'));
  await db.sorgu(`update oyun_ayarlari set deger='1' where anahtar='soru_kapsam_filtresi_acik'`);

  // İki gerçek (bot olmayan) Türk oyuncu + bir gizli bot.
  const [A, B] = (await db.sorgu(`select id::text from profiles where not coalesce(is_bot,false) and ulke='TR' and dil='tr'
                                   order by last_seen desc nulls last limit 2`)).map((r) => r.id);
  const BOT = await tek(`select id::text from profiles where is_bot limit 1`);
  const kats = (await tek(`select array_to_string(duello_kategorileri(),',')`)).split(',');
  console.log(`oyuncular A=${A} B=${B} bot=${BOT}`);

  console.log('1) Yardımcı: kim yabancı sayılır');
  ok('TR + TR → hayır', (await tek(`select soru_kapsam_evrensel_mi(array['${A}','${B}']::uuid[])`)) === 'f');
  await db.sorgu(`update profiles set ulke='DE' where id='${B}'`);
  ok('TR + DE → evet', (await tek(`select soru_kapsam_evrensel_mi(array['${A}','${B}']::uuid[])`)) === 't');
  await db.sorgu(`update profiles set ulke='TR', dil='en' where id='${B}'`);
  ok('TR + (TR, dil en) → evet', (await tek(`select soru_kapsam_evrensel_mi(array['${A}','${B}']::uuid[])`)) === 't');
  await db.sorgu(`update profiles set ulke=null, dil='tr' where id='${B}'`);
  ok('TR + (ülke yok, dil tr) → hayır', (await tek(`select soru_kapsam_evrensel_mi(array['${A}','${B}']::uuid[])`)) === 'f');
  await db.sorgu(`update profiles set ulke='BR' where id='${BOT}'`);
  ok('TR + yabancı gizli bot → hayır (bot sayılmaz)', (await tek(`select soru_kapsam_evrensel_mi(array['${A}','${BOT}']::uuid[])`)) === 'f');
  await db.sorgu(`update oyun_ayarlari set deger='0' where anahtar='soru_kapsam_filtresi_acik'`);
  await db.sorgu(`update profiles set ulke='DE' where id='${B}'`);
  ok('filtre kapalıyken TR + DE → hayır', (await tek(`select soru_kapsam_evrensel_mi(array['${A}','${B}']::uuid[])`)) === 'f');
  await db.sorgu(`update oyun_ayarlari set deger='1' where anahtar='soru_kapsam_filtresi_acik'`);

  console.log('2) Rastgele 20 maç, B Türkiye dışı (DE) → çekilen bütün sorular global');
  let toplam = 0, yerel = 0;
  for (let i = 0; i < 20; i++) {
    const kat = i % 3 === 0 ? 'null' : `'${kats[i % kats.length]}'`;
    const dizi = `soru_sec(${kat}, 20, array['${A}','${B}']::uuid[])`;
    toplam += Number(await tek(`select coalesce(array_length(${dizi},1),0)`));
    yerel += await yerelSay(dizi);
  }
  ok('20 maç × 20 soru, yerel 0', yerel === 0 && toplam === 400, `toplam ${toplam}, yerel ${yerel}`);
  // Antrenman / Hatalarım: tek yabancı oyuncu
  ok('tek başına yabancı (Antrenman/çalışma) → yerel 0', (await yerelSay(`soru_sec('tarih', 20, array['${B}']::uuid[])`)) === 0);

  console.log('3) Türkiye-Türkiye: davranış değişmedi (yerel hâlâ çıkar)');
  await db.sorgu(`update profiles set ulke='TR' where id='${B}'`);
  let yerelTT = 0, toplamTT = 0;
  for (let i = 0; i < 20; i++) {
    const dizi = `soru_sec('${i % 2 ? 'tarih' : 'cografya'}', 20, array['${A}','${B}']::uuid[])`;
    toplamTT += 20; yerelTT += await yerelSay(dizi);
  }
  ok('TR-TR tarih/coğrafya maçlarında yerel soru var', yerelTT > 0, `${yerelTT}/${toplamTT}`);
  ok('TR + yabancı bot maçında yerel soru var', (await yerelSay(`soru_sec('tarih', 40, array['${A}','${BOT}']::uuid[])`)) > 0);

  console.log('4) Düello');
  await db.sorgu(`update profiles set ulke='GB' where id='${B}'`);
  await db.sorgu(`update duellolar set durum='iptal' where durum='aktif' and (oyuncu1 in ('${A}','${B}') or oyuncu2 in ('${A}','${B}'))`);
  const did = await tek(`select duello_olustur('${A}','${B}',false,null)`);
  await db.sorgu(`update duellolar set surum=2, saldiran=oyuncu1, faz='kategori', tur=1, saldiri_sirasi=0, uzatma=false,
                  faz_bitis=clock_timestamp()+interval '15 seconds' where id='${did}'`);
  let dYerel = 0;
  for (let i = 0; i < 20; i++) {
    const s = await tek(`select duello_soru_bul('${did}', '${kats[i % kats.length]}', array['${A}','${B}']::uuid[], '{}')`);
    if ((await tek(`select kapsam from questions where id='${s}'`)) !== 'global') dYerel++;
  }
  ok('duello_soru_bul 20 çekiş → yerel 0', dYerel === 0);
  await db.sorgu(`select duello2_soru_ac('${did}', 'tarih')`);
  ok('duello2_soru_ac tarih → global', (await tek(`select q.kapsam from duellolar d join questions q on q.id=d.soru_id where d.id='${did}'`)) === 'global');

  console.log('5) Kategori tükenmesi (tarih global havuzu asgari altına indirilir)');
  const esik = Number(await tek(`select ayar_sayi('soru_kapsam_min_havuz', 60)`));
  // tarih'in global sorularından esik-1 dışındakiler geçici olarak yerel yapılır (ROLLBACK).
  await db.sorgu(`update questions set kapsam='yerel', ulke='TR' where id in (
                    select id from questions where aktif and kategori='tarih' and kapsam='global' offset ${esik - 1})`);
  ok('tarih global sayısı eşiğin altında', Number(await tek(`select count(*) from questions where aktif and kategori='tarih' and kapsam='global'`)) === esik - 1);
  const tDizi = `soru_sec('tarih', 20, array['${A}','${B}']::uuid[])`;
  await db.sorgu(`create temp table t_tukenme on commit drop as select unnest(${tDizi}) id`);
  const tSay = Number(await tek(`select count(*) from t_tukenme`));
  const tYerel = Number(await tek(`select count(*) from t_tukenme t join questions q on q.id=t.id where q.kapsam<>'global'`));
  const tTarihDisi = Number(await tek(`select count(*) from t_tukenme t join questions q on q.id=t.id where q.kategori<>'tarih'`));
  ok('Klasik tarih (yabancı) → boş değil, 20 soru, yerel 0', tSay === 20 && tYerel === 0, `${tSay} soru, yerel ${tYerel}`);
  ok('kategori yok sayıldı → karışık havuz', tTarihDisi > 0, `tarih dışı ${tTarihDisi}`);
  ok('Düello: tarih bu maçta seçilemez', (await tek(`select duello2_kategori_uygun_mu('${did}','tarih')`)) === 'f');
  ok('Düello: bilim seçilebilir', (await tek(`select duello2_kategori_uygun_mu('${did}','bilim')`)) === 't');
  // duello2_durum'un 'uygun' listesiyle aynı ifade (durum'u çağırmak canlı cron'la kilitleşiyor)
  const uygunlar = JSON.parse(await tek(`select coalesce(json_agg(k), '[]')::text from unnest(duello_kategorileri()) k where duello2_kategori_uygun_mu('${did}', k)`));
  ok('Düello uygun listesinde tarih yok, liste boş değil', !uygunlar.includes('tarih') && uygunlar.length > 0, JSON.stringify(uygunlar));
  // uzatma: tarih dışı kategori seçilmeli
  let uzTarih = 0;
  for (let i = 0; i < 10; i++) {
    const k = await tek(`select k from unnest(duello_kategorileri()) k order by duello_kategori_kapsam_uygun('${did}', k) desc, random() limit 1`);
    if (k === 'tarih') uzTarih++;
  }
  ok('uzatma sıralaması tarih seçmez', uzTarih === 0);
  await ben(A);
  const katB = JSON.parse(await tek(`select coalesce(json_agg(kategori), '[]')::text from get_categories()`));
  await ben(B);
  const katYab = JSON.parse(await tek(`select coalesce(json_agg(kategori), '[]')::text from get_categories()`));
  ok('get_categories (TR oyuncu) tarih var', katB.includes('tarih'), `${katB.length} kategori`);
  ok('get_categories (yabancı) tarih yok, liste boş değil', !katYab.includes('tarih') && katYab.length > 0, `${katYab.length} kategori`);
  await db.sorgu(`update profiles set ulke='TR', dil='en' where id='${B}'`);
  const katEn = JSON.parse(await tek(`select coalesce(json_agg(kategori), '[]')::text from get_categories()`));
  ok('get_categories (dil en) boş değil', katEn.length > 0, `${katEn.length} kategori`);
  // Türkiye-Türkiye maçında tükenen kategori hâlâ seçilebilir
  await db.sorgu(`update profiles set ulke='TR', dil='tr' where id='${B}'`);
  ok('TR-TR Düello: tarih seçilebilir', (await tek(`select duello2_kategori_uygun_mu('${did}','tarih')`)) === 't');
  ok('TR-TR Klasik tarih: tarih sorusu', Number(await tek(`select count(*) from unnest(${tDizi}) x join questions q on q.id=x where q.kategori='tarih'`)) === 20);

  console.log('6) Turnuva');
  await db.sorgu(`select set_config('app.soru_kapsam', 'evrensel', true)`);
  ok('yabancılı turnuva 30 soru → yerel 0', (await yerelSay(`turnuva_soru_sec(30, 'tr')`)) === 0);
  await db.sorgu(`select set_config('app.soru_kapsam', '', true)`);
  ok('TR turnuvası 3×30 soru → yerel var', (await yerelSay(`turnuva_soru_sec(30, 'tr') || turnuva_soru_sec(30, 'tr') || turnuva_soru_sec(30, 'tr')`)) > 0);
  const tid = await tek(`select id from tournaments order by created_at desc limit 1`);
  if (tid) {
    await db.sorgu(`insert into tournament_players(tournament_id, user_id) values ('${tid}', '${B}') on conflict do nothing`);
    await db.sorgu(`update profiles set ulke='DE' where id='${B}'`);
    await db.sorgu(`select turnuva_kapsam_ayarla('${tid}')`);
    ok('turnuva_kapsam_ayarla: yabancı katılımcı → evrensel', (await tek(`select current_setting('app.soru_kapsam', true)`)) === 'evrensel');
  }

  console.log('7) Hız');
  await db.sorgu(`update profiles set ulke='DE' where id='${B}'`);
  const t0 = Date.now();
  for (let i = 0; i < 5; i++) await tek(`select array_length(soru_sec(null, 20, array['${A}','${B}']::uuid[]),1)`);
  const t1 = Date.now();
  for (let i = 0; i < 5; i++) await tek(`select array_length(soru_sec(null, 20, array['${A}','${A}']::uuid[]),1)`);
  const t2 = Date.now();
  console.log(`    soru_sec ort.: yabancılı ${Math.round((t1 - t0) / 5)} ms · TR-TR ${Math.round((t2 - t1) / 5)} ms`);
} finally {
  try { await db.sorgu('rollback'); } finally { await db.kapat(); }
}
console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı (ROLLBACK)`);
process.exit(kaldi ? 1 : 0);
