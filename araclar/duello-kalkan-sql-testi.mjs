// Düello Kategori Kalkanı (650) SQL provası — tek transaction, sonunda ROLLBACK (canlıya iz bırakmaz).
// Kullanım: node araclar/duello-kalkan-sql-testi.mjs [migration.sql]  (migration verilirse önce onu uygular, uygulanmamış hâli sınamak için)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIG = process.argv[2];
const A = '5b555bd3-9371-4f35-90a5-39289111335e';   // insan (ArayuzDenetim890) — saldıran
const B = 'b17b0000-0000-4000-8000-000000000041';   // gizli bot — savunan
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad, ek); } else { kaldi++; console.log('  ✗', ad, ek); } };
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
async function hata(sql) { await db.sorgu('savepoint s'); try { await db.sorgu(sql); await db.sorgu('release savepoint s'); return null; } catch (e) { await db.sorgu('rollback to savepoint s'); return e.message; } }
const tek = (s) => db.tek(s);
try {
  await db.sorgu('begin');
  if (MIG) await db.sorgu(fs.readFileSync(MIG, 'utf8'));
  await db.sorgu(`update duellolar set durum='iptal' where durum='aktif' and (oyuncu1 in ('${A}','${B}') or oyuncu2 in ('${A}','${B}'))`);
  const yeniMac = async () => {
    const id = await tek(`select duello_olustur('${A}','${B}',false,null)`);
    await db.sorgu(`update duellolar set oyuncu1=oyuncu2, oyuncu2=oyuncu1, profil1=profil2, profil2=profil1, zayif1=zayif2, zayif2=zayif1 where id='${id}' and oyuncu1<>'${A}'`);
    await db.sorgu(`update duellolar set surum=2, saldiran=oyuncu1, faz='kategori', tur=1, saldiri_sirasi=0, uzatma=false, faz_bitis=clock_timestamp()+interval '15 seconds' where id='${id}'`);
    return id;
  };
  const kats = (await tek(`select array_to_string(duello_kategorileri(),',')`)).split(',');
  const tuket = async (id, haric) => {   // haric dışındaki bütün kategoriler 3 kez "gelmiş"
    for (const k of kats.filter((x) => !haric.includes(x)))
      for (let i = 0; i < 3; i++)
        await db.sorgu(`insert into duello_hamleler(duello_id,tur,saldiran,savunan,kategori,soru_id,dogru,riskli,surum,uzatma)
          select '${id}',1,'${A}','${B}','${k}',(select id from questions where aktif limit 1),false,false,2,false`);
  };

  console.log('7) Bot kalkanı (savunan bot, canı 1)');
  await db.sorgu(`update profiles set last_seen=now() where id='${A}'`);
  await db.sorgu(`update oyun_ayarlari set deger='100' where anahtar='duello2_bot_kalkan_kritik_yuzde'`);
  const id5 = await yeniMac();
  await db.sorgu(`update duellolar set can2=1, faz_bitis=now()+interval '10.5 seconds' where id='${id5}'`);
  const beklenen = await tek(`select duello2_bot_kalkan_kategori('${id5}','${B}')`);
  const prof = JSON.parse(await tek(`select profil2::text from duellolar where id='${id5}'`));
  const sirali = Object.entries(prof.oranlar ?? {}).filter(([, v]) => typeof v === 'number').sort((a, b) => a[1] - b[1]);
  console.log('    bot zayıf:', prof.zayif, '· oranlar:', sirali.map(([k, v]) => `${k}:${v}`).join(' '), '· seçilen:', beklenen);
  await db.sorgu(`select duello2_bot_tik('${id5}')`);
  const k5 = await tek(`select kalkan2->>'kategori' from duellolar where id='${id5}'`);
  ok('bot kalkanı kullandı', k5 !== null, k5);
  ok('bot zayıf noktasını korumadı', k5 !== prof.zayif);
  await db.sorgu(`update oyun_ayarlari set deger='0' where anahtar='duello2_bot_kalkan_kritik_yuzde'`);
  const id6 = await yeniMac();
  await db.sorgu(`update duellolar set can2=1, faz_bitis=now()+interval '10.5 seconds' where id='${id6}'`);
  await db.sorgu(`select duello2_bot_tik('${id6}')`);
  ok('%0 iken bot kullanmaz', (await tek(`select kalkan2 is null from duellolar where id='${id6}'`)) === 't');
  await db.sorgu(`update oyun_ayarlari set deger='100' where anahtar='duello2_bot_kalkan_kritik_yuzde'`);
  const id7 = await yeniMac();
  await db.sorgu(`update duellolar set can2=1, faz_bitis=now()+interval '15.8 seconds' where id='${id7}'`);
  await db.sorgu(`select duello2_bot_tik('${id7}')`);
  ok('fazın ilk 1 sn içinde bot kullanmaz', (await tek(`select kalkan2 is null from duellolar where id='${id7}'`)) === 't');
  console.log('1) Kurallar');
  let id = await yeniMac();
  const sal = await tek(`select oyuncu1 from duellolar where id='${id}'`);
  ok('oyuncu1 insan (saldıran)', sal === A, `sal=${sal}`);
  await ben(A);
  let h = await hata(`select duello2_kalkan('${id}','bilim')`);
  ok('saldıran kullanamaz', h && /yalnız rakip kategori seçerken/.test(h), h);
  await ben(B);
  h = await hata(`select duello2_kalkan('${id}','yok_kategori')`);
  ok('uygun olmayan kategori red', h && /korumaya gerek yok/.test(h), h);
  h = await hata(`select duello2_kalkan('${id}','bilim')`);
  ok('savunan kullanır', h === null, h ?? '');
  ok('kalkan2 yazıldı', (await tek(`select kalkan2->>'kategori' from duellolar where id='${id}'`)) === 'bilim');
  ok('aktif kalkan = bilim', (await tek(`select duello2_aktif_kalkan('${id}')`)) === 'bilim');
  ok('uygun_mu(bilim) = false', (await tek(`select duello2_kategori_uygun_mu('${id}','bilim')`)) === 'f');
  await ben(A);
  const durumA = JSON.parse(await tek(`select duello2_durum('${id}')::text`));
  ok('durum: uygun_kategoriler bilim içermez', !durumA.uygun_kategoriler.includes('bilim'), durumA.uygun_kategoriler.length + ' uygun');
  ok('durum: kalkan.aktif = bilim', durumA.kalkan?.aktif === 'bilim');
  ok('durum: B kalkanı kullanıldı, A hazır', durumA.kalkan.oyuncular[B]?.kategori === 'bilim' && durumA.kalkan.oyuncular[A] === null);
  h = await hata(`select duello_kategori_sec('${id}','bilim')`);
  ok('saldıran kalkanlı kategoriyi seçemez', h && /şu an seçilemez/.test(h), h);
  await ben(B);
  h = await hata(`select duello2_kalkan('${id}','tarih')`);
  ok('ikinci kez red', h && /zaten kullandın/.test(h), h);

  console.log('2) 40 otomatik + 40 bot seçimi');
  let sayac = { oto: 0, bot: 0 };
  for (let i = 0; i < 40; i++) {
    if ((await tek(`select duello2_otomatik_kategori('${id}')`)) === 'bilim') sayac.oto++;
    if ((await tek(`select duello2_bot_kategori('${id}','${B}')`)) === 'bilim') sayac.bot++;
  }
  ok('40 otomatik seçimde bilim yok', sayac.oto === 0, JSON.stringify(sayac));
  ok('40 bot seçiminde bilim yok', sayac.bot === 0);
  let dolum = 0;
  for (let i = 0; i < 30; i++) {
    await db.sorgu(`savepoint z`);
    await db.sorgu(`update duellolar set faz_bitis=now()-interval '1 second' where id='${id}'`);
    await db.sorgu(`select duello2_ilerlet('${id}')`);
    const secilen = await tek(`select kategori from duellolar where id='${id}'`);
    if (!secilen || secilen === 'bilim') dolum++;
    await db.sorgu(`rollback to savepoint z`);
  }
  ok('30 gerçek süre dolumunda (ilerlet) bilim yok', dolum === 0, `hatalı=${dolum}`);

  console.log('3) Yedek dallar (hiç uygun kategori yok, kalkan zorla)');
  const id2 = await yeniMac();
  await tuket(id2, []);
  await db.sorgu(`update duellolar set kalkan2 = jsonb_build_object('kategori','tarih','idx',tur*2+saldiri_sirasi,'tur',tur) where id='${id2}'`);
  ok('uygun kategori yok', (await tek(`select count(*) from unnest(duello_kategorileri()) k where duello2_kategori_uygun_mu('${id2}',k)`)) === '0');
  sayac = { oto: 0, bot: 0, bos: 0 };
  for (let i = 0; i < 40; i++) {
    const o = await tek(`select duello2_otomatik_kategori('${id2}')`), b = await tek(`select duello2_bot_kategori('${id2}','${B}')`);
    if (o === 'tarih') sayac.oto++; if (b === 'tarih') sayac.bot++; if (!o || !b) sayac.bos++;
  }
  ok('otomatik yedek dal 40 seçimde tarih yok', sayac.oto === 0 && sayac.bos === 0, JSON.stringify(sayac));
  ok('bot yedek dal 40 seçimde tarih yok', sayac.bot === 0);

  console.log('4) Güvenlik: saldırana ≥1 uygun kategori');
  const id3 = await yeniMac();
  await tuket(id3, ['sanat']);
  await ben(B);
  h = await hata(`select duello2_kalkan('${id3}','sanat')`);
  ok('son uygun kategori korunamaz', h && /seçebileceği kategori kalmaz/.test(h), h);
  ok('hak harcanmadı', (await tek(`select kalkan2 is null from duellolar where id='${id3}'`)) === 't');
  const id3b = await yeniMac();
  await tuket(id3b, ['sanat', 'spor']);
  h = await hata(`select duello2_kalkan('${id3b}','sanat')`);
  ok('iki uygun varken biri korunur', h === null, h ?? '');

  console.log('5) Zaman, faz, uzatma');
  const id4 = await yeniMac();
  await db.sorgu(`update duellolar set faz_bitis=clock_timestamp()+interval '4.5 seconds' where id='${id4}'`);
  h = await hata(`select duello2_kalkan('${id4}','muzik')`);
  ok('son 5 sn red', h && /süre çok az/.test(h), h);
  await db.sorgu(`update duellolar set faz_bitis=clock_timestamp()+interval '5.6 seconds' where id='${id4}'`);
  await db.sorgu(`savepoint t`);
  h = await hata(`select duello2_kalkan('${id4}','muzik')`);
  ok('5,6 sn kala kabul', h === null, h ?? '');
  await db.sorgu(`rollback to savepoint t`);
  await db.sorgu(`update duellolar set faz='cevap', faz_bitis=clock_timestamp()+interval '15 seconds' where id='${id4}'`);
  h = await hata(`select duello2_kalkan('${id4}','muzik')`);
  ok('faz ilerlediyse red', h && /rakip kategori seçerken/.test(h), h);
  ok('hak harcanmadı', (await tek(`select kalkan2 is null from duellolar where id='${id4}'`)) === 't');
  await db.sorgu(`update duellolar set faz='kategori', uzatma=true where id='${id4}'`);
  h = await hata(`select duello2_kalkan('${id4}','muzik')`);
  ok('uzatmada red', h && /Uzatmada/.test(h), h);

  console.log('6) Hamle kaydı + sonraki seçimde kalkan biter');
  await ben(A);
  await db.sorgu(`select duello_kategori_sec('${id}','tarih')`);
  await db.sorgu(`update duellolar set cevaplar = jsonb_build_object('${A}', jsonb_build_object('cevap',0), '${B}', jsonb_build_object('cevap',1)) where id='${id}'`);
  await db.sorgu(`select duello2_cozumle('${id}')`);
  ok('hamle.kalkan = bilim', (await tek(`select kalkan from duello_hamleler where duello_id='${id}' order by id desc limit 1`)) === 'bilim');
  ok('son_hamle.kalkan = bilim', (await tek(`select son_hamle->>'kalkan' from duellolar where id='${id}'`)) === 'bilim');
  await db.sorgu(`update duellolar set faz_bitis=now()-interval '1 second' where id='${id}'`);
  await db.sorgu(`select duello2_sonraki('${id}')`);
  ok('sonraki seçimde aktif kalkan yok', (await tek(`select duello2_aktif_kalkan('${id}')`)) === null);
  ok('bilim yeniden uygun', (await tek(`select duello2_kategori_uygun_mu('${id}','bilim')`)) === 't');

} catch (e) { kaldi++; console.log('BEKLENMEYEN HATA:', e.message); }
finally { await db.sorgu('rollback'); await db.kapat(); }
console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı (transaction geri alındı)`);
