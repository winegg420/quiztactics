// Düello puan sistemi (666) SQL provası — tek transaction, sonunda ROLLBACK (canlıya iz bırakmaz).
// Sınar: maç başına 3/4/3 yıldız hesabı, simetrik puan, 10 tur sonu, Altın Soru (eşitlik, jokersiz, sınırsız), kalkan 2 hak +
// biriktirme, kaldırılan kurallar, yeni oyuncu kilidi, bot kategori/kalkan, durum() şekli.
// Kullanım: node araclar/duello-puan-sql-testi.mjs [migration.sql]  (verilirse önce onu uygular — uygulanmamış hâli sınar)
import { PgIstemci, baglantiDizgisi, alintila } from './pg-mini.mjs';
import fs from 'node:fs';
const MIG = process.argv[2];
const A = '5b555bd3-9371-4f35-90a5-39289111335e';   // insan test hesabı (ArayuzDenetim890)
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let B;   // etkin gizli bot
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad, ek); } else { kaldi++; console.log('  ✗', ad, ek); } };
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
async function hata(sql) { await db.sorgu('savepoint s'); try { await db.sorgu(sql); await db.sorgu('release savepoint s'); return null; } catch (e) { await db.sorgu('rollback to savepoint s'); return e.message; } }
const tek = (s) => db.tek(s);
const json = async (s) => JSON.parse(await tek(s));
try {
  await db.sorgu('begin');
  await db.sorgu("set local statement_timeout = '30s'");
  const aktifOzetOnce = MIG ? await tek(`select md5(coalesce(string_agg(id::text||':'||coalesce(yildiz1::text,'')||':'||coalesce(yildiz2::text,''), '|' order by id), '')) from duellolar where durum='aktif'`) : null;
  if (MIG) await db.sorgu(fs.readFileSync(MIG, 'utf8'));
  if (MIG) {
    const aktifOzetSonra = await tek(`select md5(coalesce(string_agg(id::text||':'||coalesce(yildiz1::text,'')||':'||coalesce(yildiz2::text,''), '|' order by id), '')) from duellolar where durum='aktif'`);
    ok('migration devam eden maçların yıldızlarına dokunmaz', aktifOzetSonra === aktifOzetOnce);
  }
  B = await tek(`select p.id from profiles p where p.is_bot and p.bot_turu = 'gizli' and coalesce(p.bot_aktif, true)
    order by p.bot_seviye_puan nulls last, p.id limit 1`);
  if (!B) throw new Error('Etkin gizli bot bulunamadı.');
  await db.sorgu(`update duellolar set durum='iptal' where durum='aktif' and (oyuncu1 in ('${A}','${B}') or oyuncu2 in ('${A}','${B}'))`);
  await db.sorgu(`update profiles set last_seen=now() where id='${A}'`);

  const kategoriler = (await db.sorgu(`select k from unnest(public.duello_kategorileri()) k order by k`)).map((r) => r.k);
  const yildizSenaryosu = async (oranlar) => json(`select public.duello_yildizlar_ic(${alintila(JSON.stringify(oranlar))}::jsonb)::text`);
  const dagilim = (y) => [1, 2, 3].map((n) => Object.values(y).filter((v) => Number(v) === n).length);

  console.log('A) Göreli yıldız dağılımı: yüksek/düşük/karışık/verisiz/eşit');
  for (const [ad, degerler] of [
    ['hepsi yüksek', [99,98,97,96,95,94,93,92,91,90]],
    ['hepsi düşük', [10,9,8,7,6,5,4,3,2,1]],
    ['karışık', [88,12,64,37,91,55,23,76,44,69]],
  ]) {
    const y = await yildizSenaryosu(Object.fromEntries(kategoriler.map((k, i) => [k, degerler[i]])));
    ok(`${ad}: ★/★★/★★★ = 3/4/3`, JSON.stringify(dagilim(y)) === '[3,4,3]', JSON.stringify(y));
  }
  const verisizOranlar = Object.fromEntries(kategoriler.map((k, i) => [k, i < 4 ? null : 20 + i * 5]));
  const verisizY = await yildizSenaryosu(verisizOranlar);
  ok('4 verisiz kategori doğrudan ★★', kategoriler.slice(0, 4).every((k) => verisizY[k] === 2), JSON.stringify(verisizY));
  ok('kalan 6 sayısal kategori oranla 2/2/2 dağılır', JSON.stringify(dagilim(verisizY)) === '[2,6,2]', JSON.stringify(dagilim(verisizY)));
  const esitY = await yildizSenaryosu(Object.fromEntries(kategoriler.map((k) => [k, 50])));
  ok('eşit oranlarda kategori adı sabit sıra: ilk 3 ★★★, son 3 ★',
    kategoriler.slice(0, 3).every((k) => esitY[k] === 3)
      && kategoriler.slice(-3).every((k) => esitY[k] === 1)
      && kategoriler.slice(3, -3).every((k) => esitY[k] === 2), JSON.stringify(esitY));

  // A'nın 5 sayısal kategorisi kendi içinde sıralanır: en yüksek 2 ★★★, orta 1 ★★, en düşük 2 ★.
  // cografya 4 cevap ve kalanlar veri yok → doğrudan ★★.
  await db.sorgu(`delete from kategori_istatistik where user_id='${A}'`);
  await db.sorgu(`insert into kategori_istatistik(user_id,kategori,toplam,dogru) values
    ('${A}','bilim',20,9),('${A}','tarih',50,23),('${A}','spor',10,7),('${A}','sanat',100,71),('${A}','muzik',5,5),('${A}','cografya',4,4)`);

  const yeniMac = async () => {
    const id = await tek(`select duello_olustur('${A}','${B}',false,null)`);
    // A hep oyuncu1 olsun (kurulum rastgele sıralar)
    await db.sorgu(`update duellolar set oyuncu1=oyuncu2, oyuncu2=oyuncu1, profil1=profil2, profil2=profil1,
      yildiz1=yildiz2, yildiz2=yildiz1, puan1=puan2, puan2=puan1 where id='${id}' and oyuncu1<>'${A}'`);
    await db.sorgu(`update duellolar set saldiran=oyuncu1, faz='kategori', tur=1, saldiri_sirasi=0, uzatma=false,
      faz_bitis=clock_timestamp()+interval '15 seconds' where id='${id}'`);
    return id;
  };
  // Hamleyi doğrudan kurar: saldıran kategori seçer, cevaplar yazılır, çözümlenir.
  const hamle = async (id, kat, salDogru, savDogru) => {
    const d = await json(`select row_to_json(x)::text from duellolar x where id='${id}'`);
    const q = await json(`select json_build_object('id',id,'dc',dogru_cevap)::text from questions where aktif and kategori='${kat}' limit 1`);
    const sav = d.saldiran === d.oyuncu1 ? d.oyuncu2 : d.oyuncu1;
    const c = (dg) => dg === null ? null : dg ? q.dc : (q.dc + 1) % 4;
    const cev = {};
    if (c(salDogru) !== null) cev[d.saldiran] = { cevap: c(salDogru) };
    if (c(savDogru) !== null) cev[sav] = { cevap: c(savDogru) };
    await db.sorgu(`update duellolar set faz='cevap', kategori='${kat}', soru_id='${q.id}', cevaplar='${JSON.stringify(cev)}'::jsonb where id='${id}'`);
    await db.sorgu(`select duello2_cozumle('${id}')`);
    return await json(`select json_build_object('p1',puan1,'p2',puan2,'sh',son_hamle)::text from duellolar where id='${id}'`);
  };

  console.log('0) Bot: kalkan 2 hak kuralına uyar; bot kategori seçer (önce — kalkan süresi gerçek saatle ölçülür)');
  await db.sorgu(`update oyun_ayarlari set deger='100' where anahtar in ('duello2_bot_kalkan_yuzde','duello2_bot_kalkan_kritik_yuzde')`);
  let id = await yeniMac();
  await db.sorgu(`update duellolar set faz_bitis=now()+interval '10.5 seconds' where id='${id}'`);
  await db.sorgu(`update profiles set last_seen=clock_timestamp() where id='${A}'`);   // uzun transaction'da A kopuk sayılmasın
  await db.sorgu(`select duello2_bot_tik('${id}')`);
  ok('bot Tur 1 savunmada kalkan kullandı', (await tek(`select jsonb_array_length(kalkanlar2) from duellolar where id='${id}'`)) === '1');
  await db.sorgu(`update duellolar set tur=2, faz='kategori', faz_bitis=now()+interval '10.5 seconds' where id='${id}'`);
  await db.sorgu(`update profiles set last_seen=clock_timestamp() where id='${A}'`);   // uzun transaction'da A kopuk sayılmasın
  await db.sorgu(`select duello2_bot_tik('${id}')`);
  ok('bot Tur 2: 1. pencerede ikinci kalkan yok', (await tek(`select jsonb_array_length(kalkanlar2) from duellolar where id='${id}'`)) === '1');
  await db.sorgu(`update duellolar set tur=6, faz='kategori', faz_bitis=now()+interval '10.5 seconds' where id='${id}'`);
  await db.sorgu(`update profiles set last_seen=clock_timestamp() where id='${A}'`);   // uzun transaction'da A kopuk sayılmasın
  await db.sorgu(`select duello2_bot_tik('${id}')`);
  ok('bot Tur 6: 2. hak', (await tek(`select jsonb_array_length(kalkanlar2) from duellolar where id='${id}'`)) === '2');
  await db.sorgu(`update duellolar set tur=7, faz='kategori', faz_bitis=now()+interval '10.5 seconds' where id='${id}'`);
  await db.sorgu(`update profiles set last_seen=clock_timestamp() where id='${A}'`);   // uzun transaction'da A kopuk sayılmasın
  await db.sorgu(`select duello2_bot_tik('${id}')`);
  ok('bot Tur 7: üçüncü yok', (await tek(`select jsonb_array_length(kalkanlar2) from duellolar where id='${id}'`)) === '2');
  // Bot saldıran: kategori seçer ve soruyu açar
  await db.sorgu(`update duellolar set saldiran=oyuncu2, saldiri_sirasi=1, faz='kategori', faz_bitis=now()+interval '5 seconds' where id='${id}'`);
  await db.sorgu(`update profiles set last_seen=clock_timestamp() where id='${A}'`);   // uzun transaction'da A kopuk sayılmasın
  await db.sorgu(`select duello2_bot_tik('${id}')`);
  ok('bot saldıran kategori seçti, soru açıldı', (await tek(`select faz from duellolar where id='${id}'`)) === 'cevap');

  await db.sorgu(`update oyun_ayarlari set deger='12' where anahtar='duello2_bot_kalkan_yuzde'`);
  await db.sorgu(`update oyun_ayarlari set deger='45' where anahtar='duello2_bot_kalkan_kritik_yuzde'`);

  console.log('1) Yıldızlar maç başında göreli dağıtılır (rakibin oranından; <5 cevap = ★★)');
  id = await yeniMac();
  const y1 = await json(`select yildiz1::text from duellolar where id='${id}'`);
  ok('bilim %45 → ★', y1.bilim === 1, JSON.stringify(y1));
  ok('tarih %46 → ★', y1.tarih === 1);
  ok('spor %70 → ★★', y1.spor === 2);
  ok('sanat %71 → ★★★', y1.sanat === 3);
  ok('muzik %100 → ★★★; sayısal dağılım 2/1/2', y1.muzik === 3
    && [y1.bilim, y1.tarih, y1.spor, y1.sanat, y1.muzik].filter((v) => v === 1).length === 2
    && [y1.bilim, y1.tarih, y1.spor, y1.sanat, y1.muzik].filter((v) => v === 2).length === 1
    && [y1.bilim, y1.tarih, y1.spor, y1.sanat, y1.muzik].filter((v) => v === 3).length === 2);
  ok('cografya 4 cevap → ★★ (veri yok)', y1.cografya === 2);
  ok('teknoloji hiç veri yok → ★★', y1.teknoloji === 2);
  ok('puan değerleri 1/3/6', (await tek(`select puan_degerleri::text from duellolar where id='${id}'`)) === '{"1": 1, "2": 3, "3": 6}');
  ok('başlangıç puanı 0-0, can yok', (await tek(`select puan1||'-'||puan2||'-'||coalesce(can1::text,'yok') from duellolar where id='${id}'`)) === '0-0-yok');

  console.log('2) Simetrik puan (667: saldıranın cezası taban sifirda durur bağımsızca izlenir)');
  // A saldırıyor → değer B'nin (rakibin) yıldızı. B saldırırken değer A'nın yıldızı (A'nın yıldızları 1) adımdan bilinir).
  const yB = await json(`select yildiz2::text from duellolar where id='${id}'`);
  const deger = { 1: 1, 2: 3, 3: 6 };
  const vB = deger[yB.bilim];
  let p1 = 0, p2 = 0;
  let r = await hamle(id, 'bilim', true, true);
  p1 += vB; p2 += vB;
  ok('ikisi doğru → ikisi alır', r.p1 === p1 && r.p2 === p2, `${r.p1}-${r.p2} (B bilim ★${yB.bilim})`);
  await db.sorgu(`update duellolar set saldiran=oyuncu2, saldiri_sirasi=1 where id='${id}'`);
  r = await hamle(id, 'sanat', false, true);   // B saldırdı(yanlış), A (savunan) doğru — değer A'nın sanat ★★★ = 6
  p1 += 6; p2 = Math.max(0, p2 - 6);           // 667: B (saldıran) o kadar kaybeder, taban 0
  ok('yalnız savunan doğru → savunan alır (6), saldıranın cezası taban sifirda durur (667)', r.p1 === p1 && r.p2 === p2, `${r.p1}-${r.p2}`);
  r = await hamle(id, 'bilim', true, false);    // B saldırdı doğru, A yanlış; değer A'nın bilim ★ = 1
  p2 += 1;
  ok('yalnız saldıran doğru → saldıran alır (1)', r.p1 === p1 && r.p2 === p2, `${r.p1}-${r.p2}`);
  r = await hamle(id, 'spor', false, null);     // B(saldıran) yanlış, A(savunan) yanıtsız — değer A'nın spor ★★ = 3
  p2 = Math.max(0, p2 - 3);                     // 667: B eksi, A (savunan) kayıpsız
  ok('saldıran (B) yanlış → eksi puan, savunan (A) kayıpsız (667)', r.p1 === p1 && r.p2 === p2, `${r.p1}-${r.p2}`);
  ok('son_hamle yıldız/değer/puanlar', r.sh.yildiz === 2 && r.sh.deger === 3 && r.sh.puanlar[A] === 0, JSON.stringify({ y: r.sh.yildiz, d: r.sh.deger }));
  const hm = await json(`select json_agg(json_build_object('y',yildiz,'d',deger,'ps',puan_saldiran,'pv',puan_savunan,'ck',can_kaybeden) order by id)::text from duello_hamleler where duello_id='${id}'`);
  ok('hamle kaydı puanları taşır, can_kaybeden boş', hm.length === 4 && hm.every((h) => h.ck === null) && hm[1].pv === 6 && hm[2].ps === 1, JSON.stringify(hm));

  console.log('3) Kaldırılan kurallar: kullanım sınırı, üst üste, zayıf nokta');
  for (let i = 0; i < 5; i++) await hamle(id, 'bilim', false, false);
  ok('5 kez gelen + son seçilen bilim yine uygun', (await tek(`select duello2_kategori_uygun_mu('${id}','bilim')`)) === 't');
  ok('10 kategorinin hepsi uygun', (await tek(`select count(*) from unnest(duello_kategorileri()) k where duello2_kategori_uygun_mu('${id}',k)`)) === '10');
  const sh = await json(`select son_hamle::text from duellolar where id='${id}'`);
  ok('son_hamle zayıf nokta/can taşımaz', !('zayif_saldiri' in sh) && !('can_kaybeden' in sh));

  console.log('4) Sabit 10 tur, puanı yüksek kazanır');
  await db.sorgu(`update duellolar set tur=5, saldiri_sirasi=1, faz='sonuc', puan1=0, puan2=0 where id='${id}'`);
  await db.sorgu(`select duello2_sonraki('${id}')`);
  ok('tur 5 sonunda (0-0) maç sürer → tur 6', (await tek(`select durum||':'||tur from duellolar where id='${id}'`)) === 'aktif:6');
  await db.sorgu(`update duellolar set tur=10, saldiri_sirasi=1, faz='sonuc', puan1=7, puan2=12 where id='${id}'`);
  await db.sorgu(`select duello2_sonraki('${id}')`);
  ok('10. tur sonu 7-12 → B kazanır', (await tek(`select durum||':'||(kazanan='${B}') from duellolar where id='${id}'`)) === 'bitti:true');

  console.log('5) Eşitlik → Altın Soru (sınırsız, jokersiz, zor, kullanılmamış)');
  id = await yeniMac();
  await db.sorgu(`update duellolar set tur=10, saldiri_sirasi=1, faz='sonuc', puan1=9, puan2=9 where id='${id}'`);
  await db.sorgu(`select duello2_sonraki('${id}')`);
  let a = await json(`select json_build_object('u',uzatma,'f',faz,'d',durum,'z',(select zorluk from questions where id=soru_id),'kul',array_length(kullanilan_sorular,1),'kat',kategori)::text from duellolar where id='${id}'`);
  ok('9-9 → Altın Soru açıldı', a.u === true && a.f === 'cevap' && a.d === 'aktif', JSON.stringify(a));
  ok('Altın Soru zor (4–5)', a.z >= 4, `zorluk ${a.z}`);
  await ben(A);
  let h = await hata(`select duello2_skill('${id}','elli')`);
  ok('Altın Soru\'da joker red', h && /Altın Soru/.test(h), h);
  h = await hata(`select duello2_kalkan('${id}','bilim')`);
  ok('Altın Soru\'da kalkan red', h !== null, h);
  const ilkSoru = await tek(`select soru_id from duellolar where id='${id}'`);
  const alt = async (sal, sav) => {
    const d = await json(`select json_build_object('s',saldiran,'o1',oyuncu1,'o2',oyuncu2,'dc',(select dogru_cevap from questions where id=soru_id))::text from duellolar where id='${id}'`);
    const sv = d.s === d.o1 ? d.o2 : d.o1;
    const cev = { [d.s]: { cevap: sal ? d.dc : (d.dc + 1) % 4 }, [sv]: { cevap: sav ? d.dc : (d.dc + 1) % 4 } };
    await db.sorgu(`update duellolar set cevaplar='${JSON.stringify(cev)}'::jsonb where id='${id}'`);
    await db.sorgu(`select duello2_cozumle('${id}')`);
    await db.sorgu(`select duello2_sonraki('${id}')`);
    return json(`select json_build_object('d',durum,'k',kazanan,'p1',puan1,'p2',puan2,'soru',soru_id,'s',saldiran)::text from duellolar where id='${id}'`);
  };
  a = await alt(true, true);
  ok('ikisi doğru → yeni Altın Soru, puan değişmez', a.d === 'aktif' && a.soru !== ilkSoru && a.p1 === 9 && a.p2 === 9, JSON.stringify(a));
  a = await alt(false, false);
  ok('ikisi yanlış → yine Altın Soru', a.d === 'aktif');
  const kazanacak = a.s;   // bu turda saldıran tek doğru bilsin
  a = await alt(true, false);
  ok('tek doğru bilen kazanır', a.d === 'bitti' && a.k === kazanacak, JSON.stringify(a));
  ok('kullanılan soru tekrarlanmadı', (await tek(`select count(*) = count(distinct x) from duellolar, unnest(kullanilan_sorular) x where id='${id}'`)) === 't');

  console.log('6) Kategori Kalkanı: 2 hak, pencereler, biriktirme');
  id = await yeniMac();                       // A saldırır → B savunur
  const kalkanDene = async (tur, sira, kat, kim = B) => {
    await db.sorgu(`update duellolar set tur=${tur}, saldiri_sirasi=${sira}, saldiran=case when ${sira}=0 then oyuncu1 else oyuncu2 end,
      faz='kategori', uzatma=false, faz_bitis=clock_timestamp()+interval '12 seconds' where id='${id}'`);
    await ben(kim);
    return hata(`select duello2_kalkan('${id}','${kat}')`);
  };
  h = await kalkanDene(1, 0, 'bilim');
  ok('Tur 1: 1. hak kullanılır', h === null, h ?? '');
  h = await hata(`select duello2_kalkan('${id}','tarih')`);
  ok('aynı seçimde ikinci kalkan red', h && /zaten bir kategoriyi koruyorsun/.test(h), h);
  h = await kalkanDene(3, 0, 'tarih');
  ok('Tur 3: 1. pencere hakkı bitti → red (2. hak Tur 6)', h && /Tur 6/.test(h), h);
  h = await kalkanDene(6, 0, 'tarih');
  ok('Tur 6: 2. hak kullanılır', h === null, h ?? '');
  h = await kalkanDene(8, 0, 'spor');
  ok('Tur 8: haklar bitti → red', h && /hakların bitti/.test(h), h);
  await ben(A);
  let du = await json(`select duello2_durum('${id}')::text`);
  ok('durum: B kalan 0, 2 kullanım listesi', du.kalkan.oyuncular[B].kalan === 0 && du.kalkan.oyuncular[B].kullanilan.length === 2);
  // Biriktirme: 1. pencerede hiç kullanmadan Tur 6'da iki hak — art arda iki savunmada
  id = await yeniMac();
  await db.sorgu(`update duellolar set tur=5 where id='${id}'`);
  await ben(A);
  du = await json(`select duello2_durum('${id}')::text`);
  ok('Tur 5: kullanılmamış → kalan 1', du.kalkan.oyuncular[B].kalan === 1, JSON.stringify(du.kalkan.oyuncular[B]));
  await db.sorgu(`update duellolar set tur=6 where id='${id}'`);
  du = await json(`select duello2_durum('${id}')::text`);
  ok('Tur 6: 1. hak kaybolmadı → kalan 2', du.kalkan.oyuncular[B].kalan === 2);
  h = await kalkanDene(6, 0, 'bilim');
  ok('Tur 6 savunma: 1. kullanım', h === null, h ?? '');
  h = await kalkanDene(7, 0, 'tarih');
  ok('Tur 7 savunma (art arda): 2. kullanım', h === null, h ?? '');
  h = await kalkanDene(9, 0, 'spor');
  ok('Tur 9: üçüncü red', h && /hakların bitti/.test(h), h);
  // A da (oyuncu1) savunurken kendi 2 hakkını ayrı kullanır
  h = await kalkanDene(2, 1, 'muzik', A);
  ok('A Tur 2 savunmada kendi 1. hakkı', h === null, h ?? '');
  ok('aktif kalkan = muzik, saldıran seçemez', (await tek(`select duello2_aktif_kalkan('${id}')`)) === 'muzik'
     && (await tek(`select duello2_kategori_uygun_mu('${id}','muzik')`)) === 'f');
  await ben(B);
  h = await hata(`select duello2_kategori_sec('${id}','muzik')`);
  ok('saldıran kalkanlı kategoriyi seçemez', h && /seçilemez/.test(h), h);
  let sayac = 0;
  for (let i = 0; i < 30; i++) {
    if ((await tek(`select duello2_otomatik_kategori('${id}')`)) === 'muzik') sayac++;
    if ((await tek(`select duello2_bot_kategori('${id}','${B}')`)) === 'muzik') sayac++;
  }
  ok('30 otomatik + 30 bot seçiminde korunan yok', sayac === 0);
  await db.sorgu(`select duello2_kategori_sec('${id}','tarih')`);
  r = await hamle(id, 'tarih', true, false);
  ok('hamle kaydı: kalkan = muzik', (await tek(`select kalkan from duello_hamleler where duello_id='${id}' order by id desc limit 1`)) === 'muzik');

  console.log('8) Yeni oyuncu kilidi');
  const oynanan = Number(await tek(`select count(*) from matches where durum='bitti' and '${A}' in (oyuncu1,oyuncu2) and terk_eden is distinct from '${A}'`));
  await db.sorgu(`update oyun_ayarlari set deger='${oynanan + 3}' where anahtar='duello_acilis_mac_esigi'`);
  await ben(A);
  let ac = await json(`select duello_acilis_benim()::text`);
  ok('eşik altı: kilitli, 3 maç kaldı', ac.acik === false && ac.kalan === 3, JSON.stringify(ac));
  await db.sorgu(`update duellolar set durum='iptal' where durum='aktif' and '${A}' in (oyuncu1,oyuncu2)`);
  h = await hata(`select duello_ara(false)`);
  ok('kilitliyken arama red', h && /3 maç daha oyna/.test(h), h);
  const acikBot = await tek(`select id from profiles where is_bot and bot_turu = 'acik' limit 1`);
  h = await hata(`select duello_davet_et('${acikBot}', false)`);
  ok('kilitliyken davet red', h && /maç daha oyna/.test(h), h);
  ok('bot kilitten muaf', (await tek(`select (duello_acilis_durumu('${B}')->>'acik')`)) === 'true');
  await db.sorgu(`update oyun_ayarlari set deger='${oynanan}' where anahtar='duello_acilis_mac_esigi'`);
  ac = await json(`select duello_acilis_benim()::text`);
  ok('eşik tam: açık', ac.acik === true && ac.kalan === 0, JSON.stringify(ac));
  h = await hata(`select duello_ara(false)`);
  ok('açıkken arama kabul (kuyruk)', h === null, h ?? '');

  console.log('9) durum() şekli');
  id = await yeniMac();
  await ben(A);
  du = await json(`select duello2_durum('${id}')::text`);
  const oA = du.oyuncular.find((o) => o.id === A);
  ok('oyuncu: puan + yıldızlar, can yok', oA.puan === 0 && oA.yildizlar?.bilim === 1 && !('can' in oA));
  ok('puan_degerleri var, kategori_max yok', du.puan_degerleri?.['3'] === 6 && !('kategori_max' in du));
  ok('kalkan: toplam 2, pencere 5/10, A kalan 1', du.kalkan.toplam_hak === 2 && du.kalkan.pencere1_son === 5 && du.kalkan.pencere2_son === 10 && du.kalkan.oyuncular[A].kalan === 1);

  console.log('10) Saldırana eksi puan + taban 0 (667)');
  // B'nin oranları da bilinir hale getirilir: bilim %90 → ★★★ (6) · tarih %10 → ★ (1) · diğerleri veri yok → ★★ (3).
  await db.sorgu(`delete from kategori_istatistik where user_id='${B}'`);
  await db.sorgu(`insert into kategori_istatistik(user_id,kategori,toplam,dogru) values ('${B}','bilim',20,18),('${B}','tarih',20,2)`);
  id = await yeniMac();   // A saldırır (tur 1, saldiri_sirasi 0)
  r = await hamle(id, 'tarih', true, false);   // ısınma: A doğru → +1 (B tarih ★), B savunan yanlış → 0
  ok('ısınma: saldıran doğru kazanır (★1)', r.p1 === 1 && r.p2 === 0, `${r.p1}/${r.p2}`);
  r = await hamle(id, 'bilim', false, false);  // A(saldıran) yanlış (ceza ★★★=6, elde yalnız 1) — B(savunan) da yanlış
  ok('saldıran yanlış → eksi puan, taban 0da durur', r.p1 === 0, `p1=${r.p1}`);
  ok('savunan yanlış → puan kaybetmez (0)', r.p2 === 0, `p2=${r.p2}`);
  ok('gösterilen ceza gerçekte UYGULANAN miktar (-1, nominal -6 değil)', r.sh.puanlar[A] === -1, JSON.stringify(r.sh.puanlar));
  r = await hamle(id, 'bilim', null, false);   // saldıran yanıtsız, puan zaten 0 → delta 0
  ok('saldıran yanıtsız → aynı ceza kuralı (delta 0, zaten tabanda)', r.p1 === 0 && r.sh.puanlar[A] === 0, JSON.stringify(r.sh.puanlar));
  r = await hamle(id, 'spor', true, false);    // headroom: spor veri yok → ★★ (3)
  r = await hamle(id, 'spor', true, false);    // p1 = 6
  r = await hamle(id, 'bilim', false, false);  // yeterli puanla TAM ceza (-6) uygulanır
  ok('yeterli puanla tam ceza uygulanır (-6)', r.p1 === 0 && r.sh.puanlar[A] === -6, JSON.stringify(r.sh.puanlar));

  console.log('11) Son 2 tur (9-10) puanlar ×2 — kazanç ve ceza (667)');
  id = await yeniMac();
  await db.sorgu(`update duellolar set tur=9, saldiri_sirasi=0, saldiran=oyuncu1 where id='${id}'`);
  r = await hamle(id, 'tarih', true, false);
  ok('Tur 9 doğru: değer ×2 (★1 → 2)', r.sh.deger === 2 && Number(r.sh.carpan) === 2 && r.p1 === 2, JSON.stringify(r.sh));
  r = await hamle(id, 'bilim', false, false);
  ok('Tur 9 yanlış: ceza ×2 (★★★6 → 12), taban 0da durur', r.p1 === 0 && r.sh.deger === 12 && Number(r.sh.carpan) === 2 && r.sh.puanlar[A] === -2, JSON.stringify(r.sh));
  await db.sorgu(`update duellolar set tur=8, saldiri_sirasi=0, saldiran=oyuncu1, puan1=0 where id='${id}'`);
  r = await hamle(id, 'tarih', true, false);
  ok('Tur 8: çarpan yok (×1)', Number(r.sh.carpan) === 1 && r.sh.deger === 1 && r.p1 === 1, JSON.stringify(r.sh));
  await db.sorgu(`update duellolar set tur=10, saldiri_sirasi=0, saldiran=oyuncu1 where id='${id}'`);
  r = await hamle(id, 'tarih', true, false);
  ok('Tur 10: çarpan ×2', Number(r.sh.carpan) === 2 && r.sh.deger === 2, JSON.stringify(r.sh));

  console.log('12) Altın Soru: çarpansız ve cezasız, tur numarası fark etmez (667)');
  id = await yeniMac();
  await db.sorgu(`update duellolar set tur=10, saldiri_sirasi=1, faz='sonuc', puan1=9, puan2=9 where id='${id}'`);
  await db.sorgu(`select duello2_sonraki('${id}')`);
  a = await alt(true, true);   // ikisi doğru → yeni Altın Soru (puan değişmez)
  const shGold = await json(`select son_hamle::text from duellolar where id='${id}'`);
  const golPuanlar = Object.values(shGold.puanlar ?? {});
  ok('Altın Soru: puan/çarpan/ceza yok', shGold.deger === null && Number(shGold.carpan) === 1
     && golPuanlar.every((p) => p === 0), JSON.stringify(shGold));

  console.log('13) Bot kategori seçimi: maç sonu risk (667) — A nin yıldızları biliniyor (y1)');
  id = await yeniMac();   // A=oyuncu1, B=oyuncu2
  const botRakipYildiz = await json(`select yildiz1::text from duellolar where id='${id}'`);
  await db.sorgu(`update duellolar set tur=9, saldiri_sirasi=1, saldiran=oyuncu2, puan1=20, puan2=10 where id='${id}'`);
  let secimler = new Set();
  for (let i = 0; i < 20; i++) secimler.add(await tek(`select duello2_bot_kategori('${id}','${B}')`));
  ok('bot 10 puan geride, Tur 9: yalnız en yüksek yıldızlı (★★★) seçildi', [...secimler].every((k) => botRakipYildiz[k] === 3), JSON.stringify([...secimler]));

  await db.sorgu(`update duellolar set puan1=10, puan2=20 where id='${id}'`);   // şimdi B önde
  secimler = new Set();
  for (let i = 0; i < 20; i++) secimler.add(await tek(`select duello2_bot_kategori('${id}','${B}')`));
  ok('bot 10 puan önde, Tur 9: yalnız en düşük yıldızlı (★) seçildi', [...secimler].every((k) => botRakipYildiz[k] === 1), JSON.stringify([...secimler]));

  await db.sorgu(`update duellolar set tur=8, puan1=20, puan2=10 where id='${id}'`);   // eşik altı (Tur 8) → risk yok
  secimler = new Set();
  for (let i = 0; i < 30; i++) secimler.add(await tek(`select duello2_bot_kategori('${id}','${B}')`));
  ok('Tur 8 (eşik altı): risk modu devrede değil, birden çok kategori mümkün', secimler.size > 1, JSON.stringify([...secimler]));
} catch (e) { kaldi++; console.log('BEKLENMEYEN HATA:', e.message); }
finally { await db.sorgu('rollback'); await db.kapat(); }
console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı (transaction geri alındı)`);
process.exitCode = kaldi ? 1 : 0;
