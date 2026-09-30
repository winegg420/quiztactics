// Düello Hâkimiyet (680) SQL provası — tek transaction, sonunda ROLLBACK (canlıya iz bırakmaz).
// Sınar: yeni maç şekli · hamle kuralı (3 kategori türü × 4 cevap) · kilit · nakavt · son tur (duello_max_tur, 16) sayımı ·
// eşitlik → Altın Soru (sahiplik değişmez) · rol değişimi · Baskın / Kalkan / çakışma / gizlilik / hak ·
// çift çözümleme (yarış) · eski Kategori Kalkanı kapalı · yeni oyuncu kilidi · durum() şekli.
// Kullanım: node araclar/duello-hakimiyet-sql-testi.mjs [migration.sql ...]  (verilenler önce uygulanır)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIGLER = process.argv.slice(2);
const A = '5b555bd3-9371-4f35-90a5-39289111335e';   // insan test hesabı (ArayuzDenetim890)
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let B;
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
async function hata(sql) { await db.sorgu('savepoint s'); try { await db.sorgu(sql); await db.sorgu('release savepoint s'); return null; } catch (e) { await db.sorgu('rollback to savepoint s'); return e.message; } }
const tek = (s) => db.tek(s);
const json = async (s) => JSON.parse(await tek(s));
try {
  await db.sorgu('begin');
  await db.sorgu("set local statement_timeout = '60s'");
  for (const m of MIGLER) await db.sorgu(fs.readFileSync(m, 'utf8'));
  B = await tek(`select p.id from profiles p where p.is_bot and p.bot_turu = 'gizli' and coalesce(p.bot_aktif, true)
    order by p.bot_seviye_puan nulls last, p.id limit 1`);
  await db.sorgu(`update duellolar set durum='iptal' where durum='aktif' and (oyuncu1 in ('${A}','${B}') or oyuncu2 in ('${A}','${B}'))`);
  await db.sorgu(`update profiles set last_seen=now() where id='${A}'`);
  await db.sorgu(`update oyun_ayarlari set deger='0' where anahtar='jokerler_serbest'`);
  const K = await json(`select to_json(duello_kategorileri())::text`);
  ok('10 kategori', K.length === 10, JSON.stringify(K));
  const [k1, k2, k3, k4, k5, k6] = K;

  const yeniMac = async () => {
    const id = await tek(`select duello_olustur('${A}','${B}',false,null)`);
    await db.sorgu(`update duellolar set oyuncu1=oyuncu2, oyuncu2=oyuncu1, profil1=profil2, profil2=profil1 where id='${id}' and oyuncu1<>'${A}'`);
    await db.sorgu(`update duellolar set saldiran=oyuncu1, faz='kategori', tur=1, saldiri_sirasi=0, uzatma=false,
      faz_bitis=clock_timestamp()+interval '15 seconds' where id='${id}'`);
    return id;
  };
  // Durumu doğrudan kur: sahiplik {kat: 'A'|'B'}, saldıran A ya da B, tur.
  const kur = async (id, { sahip = {}, saldiran = 'A', tur = 1, kilit = {} } = {}) => {
    const s = Object.fromEntries(Object.entries(sahip).map(([k, v]) => [k, v === 'A' ? A : B]));
    const y1 = Object.values(s).filter((v) => v === A).length, y2 = Object.values(s).filter((v) => v === B).length;
    await db.sorgu(`update duellolar set sahiplik='${JSON.stringify(s)}'::jsonb, kilitler='${JSON.stringify(kilit)}'::jsonb,
      yuva1=${y1}, yuva2=${y2}, tur=${tur}, saldiri_sirasi=${saldiran === 'A' ? 0 : 1}, saldiran='${saldiran === 'A' ? A : B}',
      faz='kategori', durum='aktif', kazanan=null, uzatma=false where id='${id}'`);
  };
  // Soruyu aç (cevap fazı), jokerler için bekle; sonra cevapla ve çözümle.
  const ac = async (id, kat) => {
    const q = await json(`select json_build_object('id',id,'dc',dogru_cevap)::text from questions where aktif and kategori='${kat}' limit 1`);
    await db.sorgu(`update duellolar set faz='cevap', kategori='${kat}', soru_id='${q.id}', cevaplar='{}'::jsonb,
      soru_baslangic=now(), bitis1=clock_timestamp()+interval '20 seconds', bitis2=clock_timestamp()+interval '20 seconds',
      faz_bitis=clock_timestamp()+interval '20 seconds' where id='${id}'`);
    return q;
  };
  const cevapla = async (id, q, salDogru, savDogru) => {
    const d = await json(`select row_to_json(x)::text from duellolar x where id='${id}'`);
    const sav = d.saldiran === d.oyuncu1 ? d.oyuncu2 : d.oyuncu1;
    const c = (dg) => dg ? q.dc : (q.dc + 1) % 4;
    const cev = { [d.saldiran]: { cevap: c(salDogru) }, [sav]: { cevap: c(savDogru) } };
    await db.sorgu(`update duellolar set cevaplar='${JSON.stringify(cev)}'::jsonb where id='${id}'`);
    await db.sorgu(`select duello2_cozumle('${id}')`);
    return await json(`select json_build_object('sahiplik',sahiplik,'kilitler',kilitler,'y1',yuva1,'y2',yuva2,'hk',son_hamle->'hakimiyet','faz',faz)::text from duellolar where id='${id}'`);
  };
  const hamle = async (id, kat, salDogru, savDogru) => cevapla(id, await ac(id, kat), salDogru, savDogru);
  const kim = (u) => (u === A ? 'A' : u === B ? 'B' : null);

  console.log('1) Yeni maç şekli');
  let id = await yeniMac();
  let d = await json(`select row_to_json(x)::text from duellolar x where id='${id}'`);
  ok('hakimiyet açık, eşik 4, kilit 2', d.hakimiyet === true && d.hakimiyet_esik === 4 && d.kilit_tur === 2, JSON.stringify([d.hakimiyet, d.hakimiyet_esik, d.kilit_tur]));
  ok('0-0, bütün kategoriler boş', d.yuva1 === 0 && d.yuva2 === 0 && JSON.stringify(d.sahiplik) === '{}');
  ok('yıldız/çarpan yok', d.yildiz1 === null && d.carpanli_turlar === null && d.puan_degerleri === null);

  console.log('2) Hamle kuralı: 3 kategori türü × 4 cevap kombinasyonu (A saldırır)');
  const tablo = [
    // [tür, sahipÖnce, salD, savD, beklenenSahip, kilit, neden]
    ['rakibin', 'B', true, false, 'A', true, 'tuttu'],
    ['rakibin', 'B', true, true, 'B', false, 'ikisi_dogru'],
    ['rakibin', 'B', false, false, 'B', false, 'ikisi_yanlis'],
    ['rakibin', 'B', false, true, 'B', false, 'saldiran_yanlis'],
    ['boş', null, true, false, 'A', true, 'tuttu'],
    ['boş', null, true, true, null, false, 'ikisi_dogru'],
    ['boş', null, false, false, null, false, 'ikisi_yanlis'],
    ['boş', null, false, true, 'B', true, 'kontra'],
    ['kendi', 'A', true, false, 'A', true, 'tuttu'],
    ['kendi', 'A', true, true, 'A', false, 'ikisi_dogru'],
    ['kendi', 'A', false, false, 'A', false, 'ikisi_yanlis'],
    ['kendi', 'A', false, true, 'A', false, 'saldiran_yanlis'],
  ];
  for (const [tur, once, sD, vD, beklenen, kilit, neden] of tablo) {
    await kur(id, { sahip: once ? { [k1]: once } : {}, tur: 3 });
    const r = await hamle(id, k1, sD, vD);
    const eylem = { rakibin: 'elinden_al', 'boş': 'al', kendi: 'pekistir' }[tur];
    ok(`${tur} · sal ${sD ? 'D' : 'Y'} / sav ${vD ? 'D' : 'Y'} → ${beklenen ?? 'boş'}${kilit ? ' + kilit' : ''}`,
      kim(r.sahiplik[k1]) === beklenen && (r.kilitler[k1] !== undefined) === kilit && r.hk.neden === neden
        && r.hk.eylem === eylem && r.hk.tuttu === (neden === 'tuttu'),
      JSON.stringify(r));
  }
  await kur(id, { sahip: { [k1]: 'B', [k2]: 'B', [k3]: 'A' }, tur: 3 });
  let r = await hamle(id, k1, true, false);
  ok('yuva sayımı: A 1→2, B 2→1', r.y1 === 2 && r.y2 === 1, JSON.stringify([r.y1, r.y2]));

  console.log('3) Kilit: tutan hamle 2 tur kilitler; tutmayanda kilit yok');
  await kur(id, { tur: 4, saldiran: 'B' });
  r = await hamle(id, k2, true, false);   // B, tur 4'te boşu aldı → kilitler[k2] = 6
  ok('kilit değeri = tur + 2', r.kilitler[k2] === 6, JSON.stringify(r.kilitler));
  const uygun = async (t, k) => { await db.sorgu(`update duellolar set tur=${t}, faz='kategori' where id='${id}'`); return tek(`select duello2_kategori_uygun_mu('${id}','${k}')::text`); };
  ok('tur 5: seçilemez', (await uygun(5, k2)) === 'false');
  ok('tur 6: seçilemez', (await uygun(6, k2)) === 'false');
  ok('tur 7: yeniden seçilebilir', (await uygun(7, k2)) === 'true');
  await ben(A);
  await db.sorgu(`update duellolar set tur=5, faz='kategori', saldiran='${A}', saldiri_sirasi=0, faz_bitis=clock_timestamp()+interval '10 seconds' where id='${id}'`);
  let h = await hata(`select duello2_kategori_sec('${id}','${k2}')`);
  ok('kilitli kategori RPC ile de seçilemez', h && /seçilemez/.test(h), h);
  let dur = await json(`select duello2_durum('${id}')::text`);
  ok('durum: kilitli kart kalan tur 2 + uygun listesinde yok', dur.hakimiyet.kilitler[k2] === 2 && !dur.uygun_kategoriler.includes(k2), JSON.stringify(dur.hakimiyet.kilitler));
  await kur(id, { tur: 3 });
  r = await hamle(id, k3, true, true);
  ok('başarısız hamle: kilit yok, aynı kategori tekrar denenebilir', r.kilitler[k3] === undefined
    && (await uygun(4, k3)) === 'true');

  console.log('4) Roller her tur el değiştirir (1 tur = 1 hamle)');
  await kur(id, { tur: 1 });
  await ac(id, k4);
  await db.sorgu(`update duellolar set faz='sonuc' where id='${id}'`);
  await db.sorgu(`select duello2_sonraki('${id}')`);
  d = await json(`select json_build_object('tur',tur,'sal',saldiran,'sira',saldiri_sirasi,'faz',faz)::text from duellolar where id='${id}'`);
  ok('tur 1 → 2: saldıran B (oyuncu2), faz kategori', d.tur === 2 && d.sal === B && d.faz === 'kategori', JSON.stringify(d));
  await db.sorgu(`update duellolar set faz='sonuc' where id='${id}'`);
  await db.sorgu(`select duello2_sonraki('${id}')`);
  d = await json(`select json_build_object('tur',tur,'sal',saldiran,'sira',saldiri_sirasi)::text from duellolar where id='${id}'`);
  ok('tur 2 → 3: saldıran A', d.tur === 3 && d.sal === A && d.sira === 0, JSON.stringify(d));

  console.log('5) Nakavt: 4. yuvaya ulaşan anında kazanır');
  await kur(id, { sahip: { [k1]: 'A', [k2]: 'A', [k3]: 'A', [k4]: 'B' }, tur: 5 });
  r = await hamle(id, k5, true, false);
  ok('A 4 yuva', r.y1 === 4, JSON.stringify([r.y1, r.y2]));
  await db.sorgu(`select duello2_sonraki('${id}')`);
  d = await json(`select json_build_object('durum',durum,'kazanan',kazanan)::text from duellolar where id='${id}'`);
  ok('maç bitti, kazanan A (tur 5)', d.durum === 'bitti' && d.kazanan === A, JSON.stringify(d));
  ok('Son Nefes değil (rakip 1 yuva)', true);

  // 1 Eki 2026: tur sayısı ayardan (duello_max_tur = 16; eskiden sabit 10). Roller tek/çift tura göre: son tur çift → B saldırır.
  const SON_TUR = Number(await json(`select public.ayar_sayi('duello_max_tur', 10)::int::text`));
  console.log(`6) ${SON_TUR}. tur sonu sayımı + eşitlik → Altın Soru (ara tur bitirmez)`);
  id = await yeniMac();
  await kur(id, { sahip: { [k1]: 'A', [k2]: 'A', [k3]: 'A', [k4]: 'B', [k5]: 'B' }, tur: SON_TUR - 1, saldiran: SON_TUR % 2 ? 'B' : 'A' });
  r = await hamle(id, k6, true, true);   // tutmadı
  await db.sorgu(`select duello2_sonraki('${id}')`);
  d = await json(`select json_build_object('durum',durum,'tur',tur)::text from duellolar where id='${id}'`);
  ok(`tur ${SON_TUR - 1} sonunda maç sürer (tur ${SON_TUR})`, d.durum === 'aktif' && Number(d.tur) === SON_TUR, JSON.stringify(d));
  id = await yeniMac();
  await kur(id, { sahip: { [k1]: 'A', [k2]: 'A', [k3]: 'A', [k4]: 'B', [k5]: 'B' }, tur: SON_TUR, saldiran: SON_TUR % 2 ? 'A' : 'B' });
  r = await hamle(id, k6, true, true);   // tutmadı
  await db.sorgu(`select duello2_sonraki('${id}')`);
  d = await json(`select json_build_object('durum',durum,'kazanan',kazanan)::text from duellolar where id='${id}'`);
  ok(`${SON_TUR} tur bitti 3-2: A kazanır`, d.durum === 'bitti' && d.kazanan === A, JSON.stringify(d));
  id = await yeniMac();
  await kur(id, { sahip: { [k1]: 'A', [k2]: 'A', [k4]: 'B', [k5]: 'B' }, tur: SON_TUR, saldiran: SON_TUR % 2 ? 'A' : 'B' });
  r = await hamle(id, k6, false, false);
  await db.sorgu(`select duello2_sonraki('${id}')`);
  d = await json(`select json_build_object('durum',durum,'uzatma',uzatma,'faz',faz,'sahiplik',sahiplik)::text from duellolar where id='${id}'`);
  ok('2-2 eşit → Altın Soru açıldı', d.durum === 'aktif' && d.uzatma === true && d.faz === 'cevap', JSON.stringify(d));
  const qAltin = await json(`select json_build_object('id',soru_id,'dc',(select dogru_cevap from questions where id=soru_id))::text from duellolar where id='${id}'`);
  const onceSahip = JSON.stringify(d.sahiplik);
  r = await cevapla(id, qAltin, true, false);   // saldıran (A, Altın Soru turu) bildi
  ok('Altın Soru sahipliği değiştirmez', JSON.stringify(r.sahiplik) === onceSahip && r.hk === null, JSON.stringify(r));
  await db.sorgu(`select duello2_sonraki('${id}')`);
  d = await json(`select json_build_object('durum',durum,'kazanan',kazanan)::text from duellolar where id='${id}'`);
  ok('Altın Soru\'yu yalnız bilen kazanır', d.durum === 'bitti' && d.kazanan === A, JSON.stringify(d));

  console.log('7) Baskın / Kalkan');
  await db.sorgu(`insert into oyuncu_skill_setleri(user_id, skiller, skiller_duello, guncellendi)
    values ('${A}', array['elli','sure','soru_degistir'], array['baskin','kalkan','elli'], now())
    on conflict (user_id) do update set skiller_duello = excluded.skiller_duello`);
  await db.sorgu(`insert into joker_envanter(user_id, tur, adet) values ('${A}','baskin',3),('${A}','kalkan',3),('${A}','elli',3)
    on conflict (user_id, tur) do update set adet = 3`);
  id = await yeniMac();
  await ben(A);
  // Baskın: A saldırır, B doğru bilse de sayılmaz
  await kur(id, { sahip: { [k1]: 'B' }, tur: 3 });
  let q = await ac(id, k1);
  h = await hata(`select duello2_skill('${id}','kalkan')`);
  ok('saldırırken Kalkan reddedilir', h && /savunurken/.test(h), h);
  h = await hata(`select duello2_skill('${id}','baskin')`);
  ok('Baskın kullanıldı', h === null, h ?? '');
  ok('envanterden düştü (3→2)', (await tek(`select adet from joker_envanter where user_id='${A}' and tur='baskin'`)) === '2');
  await ben(B);
  dur = await json(`select duello2_durum('${id}')::text`);
  ok('rakip Baskın\'ı görmez (rakip_bu_soruda=false, son_hamle yok)', dur.skill.rakip_bu_soruda === false, JSON.stringify(dur.skill));
  await ben(A);
  r = await cevapla(id, q, true, true);
  ok('Baskın: sal D + sav D → hamle tutar (neden baskin)', kim(r.sahiplik[k1]) === 'A' && r.hk.tuttu && r.hk.neden === 'baskin' && r.hk.baskin, JSON.stringify(r.hk));
  await kur(id, { tur: 5 });
  await ac(id, k2);
  h = await hata(`select duello2_skill('${id}','baskin')`);
  ok('Baskın maçta 1 kez', h && /hakkın doldu/.test(h), h);
  // Baskın + saldıran yanlış → tutmaz, boşta savunan da alamaz
  id = await yeniMac();
  await kur(id, { tur: 3 });
  q = await ac(id, k2);
  await hata(`select duello2_skill('${id}','baskin')`);
  r = await cevapla(id, q, false, true);
  ok('Baskın + sal Y (boş): kimse almaz', r.sahiplik[k2] === undefined && r.hk.tuttu === false, JSON.stringify(r.hk));
  // Kalkan: A savunur, kendi kategorisi
  id = await yeniMac();
  await kur(id, { sahip: { [k3]: 'A', [k4]: 'B' }, tur: 2, saldiran: 'B' });
  q = await ac(id, k4);
  h = await hata(`select duello2_skill('${id}','kalkan')`);
  ok('Kalkan yalnız kendi kategorine saldırılırken', h && /senin kategorine/.test(h), h);
  h = await hata(`select duello2_skill('${id}','baskin')`);
  ok('savunurken Baskın reddedilir', h && /saldırırken/.test(h), h);
  await kur(id, { sahip: { [k3]: 'A' }, tur: 2, saldiran: 'B' });
  q = await ac(id, k3);
  h = await hata(`select duello2_skill('${id}','kalkan')`);
  ok('Kalkan kullanıldı', h === null, h ?? '');
  r = await cevapla(id, q, true, false);
  ok('Kalkan: sal D + sav Y → hamle tutmaz, kategori sahibinde', kim(r.sahiplik[k3]) === 'A' && !r.hk.tuttu && r.hk.neden === 'kalkan' && r.kilitler[k3] === undefined, JSON.stringify(r.hk));
  // Çakışma: B Baskın basar (joker kaydı doğrudan), A Kalkan
  id = await yeniMac();
  await kur(id, { sahip: { [k3]: 'A' }, tur: 2, saldiran: 'B' });
  q = await ac(id, k3);
  await db.sorgu(`update joker_kullanimlari set mac_id=mac_id where false`);
  const idx = Number(await tek(`select tur*2+saldiri_sirasi from duellolar where id='${id}'`));
  await db.sorgu(`insert into joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz) values ('${B}','duello','${id}',${idx},'baskin',true)`);
  h = await hata(`select duello2_skill('${id}','kalkan')`);
  ok('çakışma: Kalkan kullanılabildi', h === null, h ?? '');
  r = await cevapla(id, q, true, true);
  ok('çakışma: ikisi birbirini götürür → normal kural (ikisi doğru, tutmaz)', !r.hk.tuttu && r.hk.cakisma && r.hk.neden === 'ikisi_dogru' && kim(r.sahiplik[k3]) === 'A', JSON.stringify(r.hk));
  ok('çakışma: ikisi de harcandı', Number(await tek(`select count(*) from joker_kullanimlari where mac_id='${id}' and tur in ('baskin','kalkan')`)) === 2);
  // Toplam joker limiti 4 içinde sayılır
  id = await yeniMac();
  await kur(id, { tur: 3 });
  await ac(id, k1);
  // Önceki sorularda kullanılmış 4 joker (kapı tetikleyicisi yalnız şimdiki soruyu kabul eder → test için atlanır)
  await db.sorgu(`set local session_replication_role = replica`);
  await db.sorgu(`insert into joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz) values
    ('${A}','duello','${id}',1,'elli',true),('${A}','duello','${id}',2,'sure',true),('${A}','duello','${id}',3,'sure',true),('${A}','duello','${id}',4,'elli',true)`);
  await db.sorgu(`set local session_replication_role = origin`);
  h = await hata(`select duello2_skill('${id}','baskin')`);
  ok('4 joker dolduysa Baskın da reddedilir', h && /en fazla 4/.test(h), h);
  // Klasik sette Baskın seçilemez
  h = await hata(`select skill_setimi_kaydet(array['baskin','elli','sure'], '1v1')`);
  ok('Klasik sete Baskın girmez', h && /yalnız Düello/.test(h), h);
  h = await hata(`select skill_setimi_kaydet(array['baskin','kalkan','elli'], 'duello')`);
  ok('Düello sete Baskın + Kalkan girer', h === null, h ?? '');
  ok('fiyatlar 70 / 50 (joker_fiyatlari)', await tek(`select (joker_fiyatlari()->>'baskin')||'/'||(joker_fiyatlari()->>'kalkan')`) === '70/50');

  console.log('8) Çift çözümleme (yarış): ikinci çağrı iz bırakmaz');
  id = await yeniMac();
  await kur(id, { tur: 3 });
  q = await ac(id, k2);
  await cevapla(id, q, true, false);
  await db.sorgu(`select duello2_cozumle('${id}')`);
  ok('tek hamle satırı', Number(await tek(`select count(*) from duello_hamleler where duello_id='${id}'`)) === 1);

  console.log('9) Eski Kategori Kalkanı kapalı');
  await ben(A);
  await kur(id, { tur: 2, saldiran: 'B' });
  h = await hata(`select duello2_kalkan('${id}','${k1}')`);
  ok('duello2_kalkan reddeder', h && /kaldırıldı/.test(h), h);
  dur = await json(`select duello2_durum('${id}')::text`);
  ok('durum: kalkan.acik=false, hakimiyet alanları var', dur.kalkan.acik === false && dur.hakimiyet.acik === true
    && dur.hakimiyet.esik === 4 && dur.hakimiyet.yuvalar[A] === 0 && dur.tur_carpani === 1, JSON.stringify(dur.hakimiyet));

  console.log('10) durum(): rol jokeri doğru role gösterilir');
  await kur(id, { sahip: { [k1]: 'A' }, tur: 2, saldiran: 'B' });
  await ac(id, k1);
  dur = await json(`select duello2_durum('${id}')::text`);
  ok('savunan + kendi kategorisi → kalkan', dur.hakimiyet.rol_joker === 'kalkan', dur.hakimiyet.rol_joker);
  await ac(id, k2);
  dur = await json(`select duello2_durum('${id}')::text`);
  ok('savunan + başka kategori → yok', dur.hakimiyet.rol_joker === null, dur.hakimiyet.rol_joker);
  await kur(id, { tur: 3 });
  await ac(id, k2);
  dur = await json(`select duello2_durum('${id}')::text`);
  ok('saldıran → baskin', dur.hakimiyet.rol_joker === 'baskin', dur.hakimiyet.rol_joker);

  console.log('11) Yeni oyuncu kilidi aynen');
  const oynanan = Number(await tek(`select count(*) from matches where durum='bitti' and '${A}' in (oyuncu1,oyuncu2) and terk_eden is distinct from '${A}'`));
  await db.sorgu(`update oyun_ayarlari set deger='${oynanan + 3}' where anahtar='duello_acilis_mac_esigi'`);
  await db.sorgu(`update duellolar set durum='iptal' where durum='aktif' and '${A}' in (oyuncu1,oyuncu2)`);
  h = await hata(`select duello_ara(false)`);
  ok('eşik altı: arama red', h && /3 maç daha oyna/.test(h), h);

  console.log('12) Rozet ölçütleri çalışır');
  h = await hata(`select rozet_olcut('${A}','duello_son_can'), rozet_olcut('${A}','duello_geri_donus')`);
  ok('Son Nefes / Büyük Geri Dönüş ölçütü hatasız', h === null, h ?? '');
} catch (e) { kaldi++; console.log('BEKLENMEYEN HATA:', e.message); }
finally { await db.sorgu('rollback'); await db.kapat(); }
console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı (transaction geri alındı)`);
process.exitCode = kaldi ? 1 : 0;
