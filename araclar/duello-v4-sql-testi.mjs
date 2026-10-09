// Düello v4 (1013–1015) — SQL provası. TEK transaction, sonunda ROLLBACK (canlıya iz bırakmaz).
// Migration'lar canlıda değilse işlem içinde uygulanır. Kilit/oturum kuralı (Kasa 958 dersi): kısa lock_timeout +
// statement_timeout + idle_in_transaction_session_timeout, JS bekçisi; testler SIRAYLA koşar.
// İşlem içinde now() sabittir → "zaman geçti" satırdaki süreler geriye çekilerek taklit edilir (gec / ac).
//
// Sınar: bayrak (kapali / test / acik; test listesi; bot rakip) · nötr soru (ikisi doğru / tek bilen kontrolü alır)
// · 4 kart + sıra (önce rakibe gönder, sonra kendine seç; yetkisiz / tekrar / geçersiz ret) · iki farklı soru, aynı zorluk
// · başarılı saldırı (seri +1) · el değişimi (yeni sahip 1/3, kullanım listesi sıfır) · ikisi doğru / ikisi yanlış (değişmez)
// · kart süresi dolumu (sunucu iki farklı kart seçer) · kategori tekrar kuralı + havuz yeniden açılması · seri 3/3 → bitti
// (ödül, geçmiş, rozet ölçütleri hatasız ve v4'ü saymaz) · 15 tur → Son Düello (aynı soru, jokersiz, tek bilen kazanır,
// ikisi aynıysa yeni soru) · art arda 5 nötr → Son Düello · jokerler (50:50 kendi sorusu, Zaman Baskısı rakip süresi,
// Soru Değiştir aynı kategori+zorluk yalnız kendi sorusu, soruda 1, Baskın/Kalkan ret) · durum() şekli (gizli gönderim)
// · kopukluk dondurma + dönüş + terk (45 sn) · duello_terk · rövanş (v4 açılır) · bot-insan tam maç · eski (surum 2) maç
// akışı · yetkiler (yeni fonksiyonlar istemciye kapalı) · migration kapsamı (md5: yalnız 9 hedef fonksiyon değişti).
//
// Kullanım: node araclar/duello-v4-sql-testi.mjs [--zorla]
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';

const ZORLA = process.argv.includes('--zorla');
const MIG = ['20260612001013_duello_v4_sema.sql', '20260612001014_duello_v4_sunucu.sql', '20260612001015_duello_v4_baglanti.sql']
  .map((f) => new URL(`../supabase/migrations/${f}`, import.meta.url));
const HEDEF_FN = ['duello_olustur', 'duello_kilitle', 'duello_tik_hepsi', 'duello_durum', 'duello_cevap', 'duello_kategori_sec',
  'duello_saldiri_jokeri', 'duello_savunma_jokeri', 'joker_hak_kontrol'];
const UYGULAMA = 'duello-v4-sql-testi';

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

let A, B, C, BOT;
const satir = async (id) => {
  const r = (await db.sorgu(`select *, v4_kartlar::text kartlar_t, v4_kullanilan::text kullanilan_t, extract(epoch from bitis1)::text b1, extract(epoch from bitis2)::text b2
    from duellolar where id = '${id}'`))[0];
  if (r && typeof r.son_hamle === 'string') r.son_hamle = JSON.parse(r.son_hamle);
  return r;
};
const temizSayac = () => db.sorgu(`delete from rpc_sayac where user_id in ('${A}','${B}')`);
// Süre doldu: faz + kişisel süreler geçmişte (geç varış payı da geçmiş).
const gec = (id) => db.sorgu(`update duellolar set faz_bitis = now() - interval '20 seconds', bitis1 = now() - interval '20 seconds',
  bitis2 = now() - interval '20 seconds', soru_baslangic = least(soru_baslangic, now() - interval '40 seconds') where id = '${id}'`);
// Soru cevaplanabilir: giriş bitti, süre sürüyor.
const ac = (id) => db.sorgu(`update duellolar set soru_baslangic = now() - interval '1 second' where id = '${id}' and soru_baslangic > now() - interval '1 second'`);
const durum = async (u, id) => { await ben(u); await temizSayac(); return json(`select duello_durum('${id}')::text`); };
async function cevapla(u, id, dogru) {
  if (dogru === null) return null;
  const s = await satir(id);
  const q = u === s.oyuncu1 ? s.soru_id1 : s.soru_id2;
  const dc = Number(await tek(`select dogru_cevap from questions where id = '${q}'`));
  const c = dogru ? dc : (dc + 1) % 4;
  await ben(u); await temizSayac();
  return hata(`select duello_cevap('${id}', ${c}::smallint)`);
}
async function kartSec(u, id, kat) { await ben(u); await temizSayac(); return hata(`select duello_kategori_sec('${id}', '${kat}')`); }
const ilerle = async (id) => { await gec(id); return durum(A, id); };   // A'nın yoklaması tembel ilerletmeyi tetikler
async function olustur(a, b) {
  await ben(null);
  return tek(`select duello_olustur('${a}', '${b}', false)`);
}
const kartlar = (s) => (s.kartlar_t || '{}').replace(/[{}"]/g, '').split(',').filter(Boolean);
const kullanilan = (s) => (s.kullanilan_t || '{}').replace(/[{}"]/g, '').split(',').filter(Boolean);
// Bir saldırı turunu oynat: kontrol sahibi karttan rakibe [0], kendine [1]; cevaplar dogruK / dogruR.
async function tur(id, dogruK, dogruR) {
  let s = await satir(id);
  const kk = kartlar(s);
  await kartSec(s.v4_kontrol, id, kk[0]);
  await kartSec(s.v4_kontrol, id, kk[1]);
  await ac(id);
  s = await satir(id);
  const r = s.v4_kontrol === s.oyuncu1 ? s.oyuncu2 : s.oyuncu1;
  await cevapla(s.v4_kontrol, id, dogruK);
  await cevapla(r, id, dogruR);
  if ((await satir(id)).faz === 'cevap') { await gec(id); await durum(A, id); }   // cevaplamayan varsa süre dolumu → sonuç
  return satir(id);
}

try {
  await db.sorgu(`set application_name = '${UYGULAMA}'`);
  console.log('0) Ön kontrol (salt okunur)');
  const on = (await db.sorgu(`select (select count(*) from duellolar where durum = 'aktif')::text duello,
      (select count(*) from matches where durum = 'aktif')::text mac, (select count(*) from kasa_maclari where durum = 'aktif')::text kasa`))[0];
  console.log('  ', JSON.stringify(on));
  if ((Number(on.mac) + Number(on.duello) + Number(on.kasa) > 0) && !ZORLA) {
    console.log('  ⏸ BEKLE: aktif oyun var (--zorla ile atlanır)'); process.exitCode = 2; throw new Error('ön kontrol: bekle');
  }
  const canli = (await tek(`select count(*)::text from pg_proc where proname = 'duello4_durum'`)) === '1';
  console.log(`  1013–1015 canlıda: ${canli ? 'EVET' : 'hayır (işlem içinde uygulanacak)'}`);
  const once = canli ? null : await md5Hepsi();

  await db.sorgu('begin');
  await db.sorgu("set local lock_timeout = '3s'");
  await db.sorgu("set local statement_timeout = '60s'");
  await db.sorgu("set local idle_in_transaction_session_timeout = '60s'");
  if (!canli) for (const m of MIG) await db.sorgu(fs.readFileSync(m, 'utf8'));
  await db.sorgu("set local statement_timeout = '30s'");

  const H = await db.sorgu(`select id, takma_ad from profiles where takma_ad in ('ArayuzDenetim890', 'ArayuzDenetim648', 'ArayuzDenetim609')`);
  A = H.find((x) => x.takma_ad === 'ArayuzDenetim890')?.id;
  B = H.find((x) => x.takma_ad === 'ArayuzDenetim648')?.id;
  C = H.find((x) => x.takma_ad === 'ArayuzDenetim609')?.id;
  BOT = await tek(`select id from profiles where is_bot and bot_turu = 'gizli' and coalesce(bot_aktif, true) order by bot_seviye_puan nulls last, id limit 1`);
  if (!A || !B || !C || !BOT) throw new Error('test hesapları bulunamadı');
  console.log(`  A=${A} B=${B} C=${C} bot=${BOT}`);
  await db.sorgu(`update duellolar set durum = 'iptal' where durum = 'aktif' and (oyuncu1 in ('${A}','${B}','${C}','${BOT}') or oyuncu2 in ('${A}','${B}','${C}','${BOT}'))`);
  await db.sorgu(`select nabiz_yaz('${A}'), nabiz_yaz('${B}'), nabiz_yaz('${C}')`);   // now() sabit → işlem boyunca bağlı
  // Jokerler: envanter + Düello seti (işlem içinde; ROLLBACK ile gider)
  for (const u of [A, B]) {
    for (const t of ['elli', 'sure', 'soru_degistir', 'zaman_baskisi', 'ikinci_sans', 'baskin']) {
      await db.sorgu(`insert into joker_envanter (user_id, tur, adet) values ('${u}', '${t}', 5) on conflict (user_id, tur) do update set adet = 5`);
    }
    await db.sorgu(`insert into oyuncu_skill_setleri (user_id, skiller, skiller_duello) values ('${u}', array['elli','sure','soru_degistir'], array['elli','zaman_baskisi','soru_degistir'])
      on conflict (user_id) do update set skiller_duello = array['elli','zaman_baskisi','soru_degistir']`);
  }

  console.log('1) Bayrak');
  await db.sorgu(`update oyun_ayarlari set deger = '"kapali"' where anahtar = 'duello_v4_acik'`);
  let m = await olustur(A, B);
  ok('kapalı → surum 2', (await satir(m)).surum === '2');
  await db.sorgu(`update oyun_ayarlari set deger = '"test"' where anahtar = 'duello_v4_acik'`);
  await db.sorgu(`update oyun_ayarlari set deger = (select jsonb_agg(e) from jsonb_array_elements(deger) e where e #>> '{}' <> '${B}') where anahtar = 'duello_v2_test_kullanicilari'`);
  m = await olustur(A, B);
  ok('test, B listede değil → surum 2', (await satir(m)).surum === '2');
  await db.sorgu(`update oyun_ayarlari set deger = deger || '["${B}"]'::jsonb where anahtar = 'duello_v2_test_kullanicilari'`);
  m = await olustur(A, C);
  ok('test, C listede değil → surum 2', (await satir(m)).surum === '2');
  m = await olustur(A, BOT);
  ok('test, A + bot → surum 4', (await satir(m)).surum === '4');
  await db.sorgu(`update duellolar set durum = 'iptal' where durum = 'aktif' and (oyuncu1 in ('${A}','${B}','${C}','${BOT}') or oyuncu2 in ('${A}','${B}','${C}','${BOT}'))`);
  m = await olustur(A, B);
  let s = await satir(m);
  ok('test, A + B → surum 4, nötr faz', s.surum === '4' && s.faz === 'notr', `${s.surum}/${s.faz}`);
  ok('nötr: iki oyuncuya aynı soru', s.soru_id1 && s.soru_id1 === s.soru_id2 && s.soru_id === s.soru_id1);
  ok('maça sabit: 15 tur / seri 3 / 5 nötr / 4 kart', s.v4_max_tur === '15' && s.v4_seri_hedef === '3' && s.v4_notr_max === '5' && s.v4_kart_sayisi === '4');
  ok('eski modlar kapalı (hakimiyet/puan/seçim/ban)', s.hakimiyet === 'f' && s.puan_modu === 'f' && s.secim_modu === 'f' && s.ban_acik === 'f');
  ok('giriş payı: soru henüz açılmadı', (await tek(`select (soru_baslangic > now())::text from duellolar where id = '${m}'`)) === 'true');
  const e0 = await cevapla(A, m, true);
  ok('giriş bitmeden cevap reddedilir', e0 && /cevap verilemez/.test(e0), e0);
  let dA = await durum(A, m);
  ok('durum: surum 4, soru gizli, kontrol yok', dA.surum === 4 && dA.soru === null && dA.v4.kontrol === null && dA.v4.ilk_mac === true);

  console.log('2) Nötr soru');
  await ac(m);
  await cevapla(A, m, true); await cevapla(B, m, true);
  s = await satir(m);
  ok('ikisi doğru → sonuç, kontrol yok, nötr seri 1', s.faz === 'sonuc' && s.v4_kontrol === null && s.v4_notr_seri === '1' && s.son_hamle.sonuc === 'ikisi_dogru');
  await ilerle(m); s = await satir(m);
  ok('yeni nötr soru (soru_no 2)', s.faz === 'notr' && s.v4_soru_no === '2');
  await ac(m);
  await cevapla(A, m, true); await cevapla(B, m, false);
  s = await satir(m);
  ok('yalnız A doğru → kontrol A, seri 0', s.v4_kontrol === A && s.v4_seri === '0' && s.son_hamle.sonuc === 'kontrol_aldi' && s.v4_notr_seri === '0');
  await ilerle(m); s = await satir(m);
  const kk = kartlar(s);
  ok('kart fazı: 4 farklı kart, tur 1', s.faz === 'kart' && kk.length === 4 && new Set(kk).size === 4 && s.v4_tur === '1');

  console.log('3) Kart seçimi');
  let dB = await durum(B, m);
  ok('bekleyen: kartları görür, gönderim gizli, adım 0', dB.v4.kart?.kartlar?.length === 4 && dB.v4.kart.gonderilen === null && dB.v4.kart.adim === 0);
  dA = await durum(A, m);
  ok('kart oranları ben/rakip alanlarıyla', dA.v4.kart.kartlar.every((x) => 'ben' in x && 'rakip' in x));
  let e = await kartSec(B, m, kk[0]);
  ok('kontrol sahibi olmayan seçemez', e && /sırası sende değil/.test(e), e);
  e = await kartSec(A, m, 'olmayan_kategori');
  ok('kart dışı kategori reddedilir', e && /seçilemez/.test(e), e);
  e = await kartSec(A, m, kk[0]);
  ok('ilk dokunuş: rakibe gönder', e === null && (await satir(m)).v4_gonderilen === kk[0], e);
  dB = await durum(B, m);
  ok('bekleyen: adım 1, hangi kart olduğu gizli', dB.v4.kart.adim === 1 && dB.v4.kart.gonderilen === null);
  e = await kartSec(A, m, kk[0]);
  ok('gönderilen kart kendine seçilemez', e && /rakibe gönderdin/.test(e), e);
  e = await kartSec(A, m, kk[1]);
  s = await satir(m);
  ok('ikinci dokunuş: kendine seç → soru fazı', e === null && s.faz === 'cevap' && s.v4_secilen === kk[1], e);
  const kA = (x) => (A === x.oyuncu1 ? 1 : 2), kB = (x) => (B === x.oyuncu1 ? 1 : 2);
  ok('A kendi seçtiğinden, B gönderilenden soru alır', s['kategori' + kA(s)] === kk[1] && s['kategori' + kB(s)] === kk[0]);
  ok('iki farklı soru', s.soru_id1 && s.soru_id2 && s.soru_id1 !== s.soru_id2);
  const z = await db.sorgu(`select (select zorluk from questions where id = '${s.soru_id1}')::text z1, (select zorluk from questions where id = '${s.soru_id2}')::text z2`);
  ok('aynı zorluk', z[0].z1 === z[0].z2, JSON.stringify(z[0]));
  ok('kullanılan: iki kategori', kullanilan(s).sort().join() === [kk[0], kk[1]].sort().join());
  dB = await durum(B, m);
  ok('soru açılınca kategoriler iki tarafa görünür', dB.v4.benim_kategori === kk[0] && dB.v4.rakip_kategori === kk[1]);

  console.log('4) Jokerler');
  await ac(m);
  const elliOnce = await satir(m);
  await ben(A); await temizSayac();
  e = await hata(`select duello_savunma_jokeri('${m}', 'elli')`);
  s = await satir(m);
  const dcA = Number(await tek(`select dogru_cevap from questions where id = '${s['soru_id' + kA(s)]}'`));
  const elli = (s['elli' + kA(s)] || '').replace(/[{}]/g, '').split(',').filter(Boolean).map(Number);
  ok('50:50 A\'nın KENDİ sorusunda iki yanlışı kapatır', e === null && elli.length === 2 && !elli.includes(dcA) && !s['elli' + kB(s)], e);
  e = await hata(`select duello_saldiri_jokeri('${m}', 'zaman_baskisi')`);
  ok('aynı soruda ikinci joker reddedilir', e && /skill hakkını/.test(e), e);
  await ben(B); await temizSayac();
  e = await hata(`select duello_saldiri_jokeri('${m}', 'zaman_baskisi')`);
  s = await satir(m);
  ok('Zaman Baskısı rakibin (A) süresini kısaltır', e === null && Number(s['b' + kA(s)]) < Number(elliOnce['b' + kA(s)]) && s['b' + kB(s)] === elliOnce['b' + kB(s)], e);
  await ben(A); await temizSayac();
  e = await hata(`select duello_savunma_jokeri('${m}', 'baskin')`);
  ok('Baskın v4\'te yok', e && /kullanılamaz/.test(e), e);
  const ru = await tek(`select (select count(*) from joker_kullanimlari where mac_id = '${m}')::text`);
  ok('joker kaydı soru numarasıyla (2 kayıt)', ru === '2');

  console.log('5) Saldırı sonuçları');
  await cevapla(A, m, true); await cevapla(B, m, false);
  s = await satir(m);
  ok('A doğru + B yanlış → başarılı, seri 1', s.faz === 'sonuc' && s.v4_seri === '1' && s.v4_kontrol === A && s.son_hamle.sonuc === 'basarili');
  const h1 = (await db.sorgu(`select * from duello_hamleler where duello_id = '${m}' order by id desc limit 1`))[0];
  ok('hamle kaydı: v4 ayrıntısı, puan kolonları boş', JSON.parse(h1.v4 || 'null')?.surum === 4 && h1.saldiran === A && h1.puan_saldiran === null && h1.surum === '4');
  await ilerle(m); s = await satir(m);
  const kk2 = kartlar(s);
  ok('yeni turda kullanılan kategoriler kartlarda yok', !kk2.includes(kk[0]) && !kk2.includes(kk[1]) && s.v4_tur === '2', kk2.join());
  // süre dolumu
  await gec(m); await durum(A, m); s = await satir(m);
  ok('kart süresi doldu → sunucu iki FARKLI kart seçer', s.faz === 'cevap' && s.v4_kart_oto === 't' && s.v4_gonderilen && s.v4_secilen
     && s.v4_gonderilen !== s.v4_secilen && kk2.includes(s.v4_gonderilen) && kk2.includes(s.v4_secilen));
  // Soru Değiştir: B kendi sorusunu (aynı kategori, aynı zorluk)
  await ac(m);
  const sdOnce = await satir(m);
  await ben(B); await temizSayac();
  e = await hata(`select duello_savunma_jokeri('${m}', 'soru_degistir')`);
  s = await satir(m);
  const qB = 'soru_id' + kB(s), qA = 'soru_id' + kA(s);
  const zz = await db.sorgu(`select (select zorluk from questions where id = '${sdOnce[qB]}')::text a, (select zorluk from questions where id = '${s[qB]}')::text b,
    (select kategori from questions where id = '${s[qB]}') k`);
  ok('Soru Değiştir yalnız B\'nin sorusu, aynı kategori + zorluk', e === null && s[qB] !== sdOnce[qB] && s[qA] === sdOnce[qA]
     && zz[0].a === zz[0].b && zz[0].k === s['kategori' + kB(s)], `${e} ${JSON.stringify(zz[0])}`);
  await cevapla(A, m, false); await cevapla(B, m, true);
  s = await satir(m);
  ok('A yanlış + B doğru → kontrol B, seri 1/3, liste sıfır', s.v4_kontrol === B && s.v4_seri === '1' && kullanilan(s).length === 0 && s.son_hamle.sonuc === 'el_degisti');
  await ilerle(m);
  s = await tur(m, false, false);
  ok('ikisi yanlış → kontrol ve seri aynı', s.v4_kontrol === B && s.v4_seri === '1' && s.son_hamle.sonuc === 'ikisi_yanlis');
  await ilerle(m);
  s = await tur(m, true, true);
  ok('ikisi doğru → kontrol ve seri aynı', s.v4_kontrol === B && s.v4_seri === '1' && s.son_hamle.sonuc === 'ikisi_dogru');
  await ilerle(m);
  s = await tur(m, true, null);   // A cevaplamadı (süre doldu = yanlış)
  ok('süre dolması yanlış sayılır → B seri 2', s.v4_seri === '2' && s.son_hamle.sonuc === 'basarili');
  // havuz: B'nin dönemi 3 turda 6 kategori kullandı → kalan 4: yeniden açılmaz, kartlar tam kalan
  await ilerle(m); s = await satir(m);
  const kalan4 = kartlar(s);
  ok('kalan tam 4 → havuz açılmaz, kartlar = kalan', kullanilan(s).length === 6 && kalan4.every((k) => !kullanilan(s).includes(k)), `${kullanilan(s).join()} | ${kalan4.join()}`);
  const rozetOnce = await db.sorgu(`select rozet_olcut('${B}', 'duello_son_can')::text a, rozet_olcut('${B}', 'duello_geri_donus')::text b, rozet_olcut('${B}', 'duello_galibiyet')::text c`);
  s = await tur(m, true, false);
  ok('B seri 3/3 → sonuç (kazanma sonuç fazından sonra)', s.v4_seri === '3' && s.faz === 'sonuc' && s.durum === 'aktif');
  await ilerle(m); s = await satir(m);
  ok('maç bitti, kazanan B', s.durum === 'bitti' && s.kazanan === B);
  dB = await durum(B, m);
  ok('durum: ödül + geçmiş (her soru)', dB.odul && Array.isArray(dB.gecmis) && dB.gecmis.length === Number(await tek(`select count(*)::text from duello_hamleler where duello_id = '${m}'`)));
  const rozetSonra = await db.sorgu(`select rozet_olcut('${B}', 'duello_son_can')::text a, rozet_olcut('${B}', 'duello_geri_donus')::text b, rozet_olcut('${B}', 'duello_galibiyet')::text c`);
  ok('rozet: Son Nefes / Büyük Geri Dönüş v4\'ü saymaz, galibiyet sayar', rozetSonra[0].a === rozetOnce[0].a && rozetSonra[0].b === rozetOnce[0].b && Number(rozetSonra[0].c) === Number(rozetOnce[0].c) + 1,
    `${JSON.stringify(rozetOnce[0])} → ${JSON.stringify(rozetSonra[0])}`);

  console.log('6) Rövanş');
  await ben(A); await temizSayac();
  e = await hata(`select duello_rovans_iste('${m}')`);
  await ben(B); await temizSayac();
  const e2 = await hata(`select duello_rovans_yanitla('${m}', true)`);
  const rov = await tek(`select rovans_id::text from duellolar where id = '${m}'`);
  ok('rövanş v4 açılır', e === null && e2 === null && rov && (await satir(rov)).surum === '4', `${e} ${e2}`);
  if (rov) await db.sorgu(`update duellolar set durum = 'iptal' where id = '${rov}'`);

  console.log('7) Havuz yeniden açılır (kalan < 4)');
  m = await olustur(A, B);
  await db.sorgu(`update duellolar set v4_kontrol = '${A}', faz = 'sonuc', faz_bitis = now() - interval '1 second', soru_baslangic = now() - interval '30 seconds',
    v4_kullanilan = (select array_agg(k) from (select k from unnest(duello_kategorileri()) k order by k limit 7) x) where id = '${m}'`);
  await durum(A, m); s = await satir(m);
  ok('3 kalan → liste sıfır, 4 yeni kart, kontrol/seri aynı', s.faz === 'kart' && kullanilan(s).length === 0 && kartlar(s).length === 4 && s.v4_kontrol === A);

  console.log('8) 15 tur → Son Düello');
  await db.sorgu(`update duellolar set v4_tur = 15 where id = '${m}'`);
  await gec(m); await durum(A, m);   // kart süresi → tur 15'in sorusu
  s = await satir(m);
  ok('tur 15', s.v4_tur === '15' && s.faz === 'cevap');
  await ac(m); await cevapla(A, m, true); await cevapla(B, m, true);
  await ilerle(m); s = await satir(m);
  ok('15 tur bitti → SON DÜELLO: aynı soru, uzatma', s.faz === 'son' && s.v4_son === 't' && s.uzatma === 't' && s.soru_id1 === s.soru_id2);
  await ac(m); await ben(A); await temizSayac();
  e = await hata(`select duello_savunma_jokeri('${m}', 'elli')`);
  ok('Son Düello\'da joker yok', e && /Son Düello/.test(e), e);
  dA = await durum(A, m);
  ok('durum: skill.kapali', dA.skill.kapali === true && dA.v4.son === true);
  await cevapla(A, m, false); await cevapla(B, m, false);
  const no1 = (await satir(m)).v4_soru_no;
  await ilerle(m); s = await satir(m);
  ok('ikisi yanlış → yeni Son Düello sorusu', s.faz === 'son' && Number(s.v4_soru_no) === Number(no1) + 1);
  const altinOnce = await tek(`select rozet_olcut('${A}', 'uzatma_galibiyet')::text`);
  await ac(m); await cevapla(A, m, true); await cevapla(B, m, false);
  s = await satir(m);
  ok('tek bilen → son_kazandi', s.son_hamle.sonuc === 'son_kazandi' && s.son_hamle.kazanan === A);
  await ilerle(m); s = await satir(m);
  ok('Son Düello kazananı A', s.durum === 'bitti' && s.kazanan === A);
  ok('Altın Dokunuş ölçütü Son Düello galibiyetini sayar', Number(await tek(`select rozet_olcut('${A}', 'uzatma_galibiyet')::text`)) === Number(altinOnce) + 1);

  console.log('9) Art arda 5 nötr → Son Düello');
  m = await olustur(A, B);
  for (let i = 0; i < 5; i++) {
    await ac(m); await cevapla(A, m, i % 2 === 0); await cevapla(B, m, i % 2 === 0);
    await ilerle(m);
  }
  s = await satir(m);
  ok('5. nötrden sonra Son Düello', s.faz === 'son' && s.v4_notr_seri === '5' && s.v4_kontrol === null, `${s.faz} ${s.v4_notr_seri}`);
  await db.sorgu(`update duellolar set durum = 'iptal' where id = '${m}'`);

  console.log('10) Kopukluk / dönüş / terk');
  m = await olustur(A, B);
  await ac(m);
  await db.sorgu(`update oyuncu_nabiz set son_gorulme = now() - interval '60 seconds' where user_id = '${B}'`);
  await db.sorgu(`update profiles set last_seen = now() - interval '60 seconds' where id = '${B}'`);
  dA = await durum(A, m); s = await satir(m);
  ok('B kopuk → faz donar, durum.kopuk', s.kopuk_at !== null && dA.kopuk && dA.kopuk.ben_mi === false);
  await db.sorgu(`select nabiz_yaz('${B}')`);
  await db.sorgu(`update profiles set last_seen = now() where id = '${B}'`);
  await durum(B, m); s = await satir(m);
  ok('B döndü → dondurma kalkar, maç sürer', s.kopuk_at === null && s.durum === 'aktif' && s.faz === 'notr');
  await db.sorgu(`update oyuncu_nabiz set son_gorulme = now() - interval '60 seconds' where user_id = '${B}'`);
  await db.sorgu(`update profiles set last_seen = now() - interval '60 seconds' where id = '${B}'`);
  await durum(A, m);
  await db.sorgu(`update duellolar set kopuk_at = now() - interval '50 seconds' where id = '${m}'`);
  await durum(A, m); s = await satir(m);
  ok('45 sn dönmedi → A kazanır, B terk', s.durum === 'bitti' && s.kazanan === A && s.terk_eden === B);
  await db.sorgu(`select nabiz_yaz('${B}')`);
  await db.sorgu(`update profiles set last_seen = now() where id = '${B}'`);
  m = await olustur(A, B);
  await ben(A); await temizSayac(); await db.sorgu(`select duello_terk('${m}')`);
  s = await satir(m);
  ok('duello_terk: B kazanır, A terk', s.durum === 'bitti' && s.kazanan === B && s.terk_eden === A);

  console.log('11) Bot – insan tam maç');
  m = await olustur(A, BOT);
  let adim = 0, botKart = 0, botCevap = 0;
  for (; adim < 150; adim++) {
    s = await satir(m);
    if (s.durum !== 'aktif') break;
    if (s.faz === 'kart') {
      if (s.v4_kontrol === A) { const k = kartlar(s); await kartSec(A, m, k[3]); await kartSec(A, m, k[2]); }
      else { await db.sorgu(`update duellolar set faz_bitis = now() + interval '0.3 seconds' where id = '${m}'`); await ben(null); await db.sorgu(`select duello4_bot_tik('${m}')`);
        const s2 = await satir(m); if (s2.faz === 'cevap' && s2.v4_kart_oto === 'f') botKart++; }
    } else if (['notr', 'cevap', 'son'].includes(s.faz)) {
      await db.sorgu(`update duellolar set soru_baslangic = now() - interval '40 seconds' where id = '${m}'`);
      await cevapla(A, m, Math.random() < 0.6);
      await ben(null); await db.sorgu(`select duello4_bot_tik('${m}')`);
      if ((await satir(m)).faz === 'sonuc') botCevap++;
    } else if (s.faz === 'sonuc') {
      await db.sorgu(`update duellolar set faz_bitis = now() - interval '1 second' where id = '${m}'`);
      await ben(null); await db.sorgu(`select duello4_bot_tik('${m}')`);
    }
  }
  s = await satir(m);
  ok(`bot maçı bitti (${adim} adım, bot kart ${botKart}, bot cevap ${botCevap})`, s.durum === 'bitti' && s.kazanan && botCevap > 0);
  const bk = await db.sorgu(`select v4 from duello_hamleler where duello_id = '${m}' and v4 ->> 'tip' = 'saldiri' and v4 ->> 'kontrol_once' = '${BOT}'`);
  const bkv = bk.map((x) => JSON.parse(x.v4));
  ok(`bot kontrol sahibiyken kendi seçti (${bkv.length} tur, süre dolumu değil)`, bkv.every((x) => x.oto === false), JSON.stringify(bkv.map((x) => x.oto)));

  console.log('12) Eski maç (surum 2) aynen');
  await db.sorgu(`update oyun_ayarlari set deger = '"kapali"' where anahtar = 'duello_v4_acik'`);
  m = await olustur(A, B);
  dA = await durum(A, m);
  ok('surum 2 durum() eski şekil', dA.surum === 2 && dA.faz === 'secim');
  s = await satir(m);
  const sira = s.saldiran;
  const havuz = await tek(`select (duello2_secim_havuzu('${m}'))[1]`);
  e = await kartSec(sira, m, havuz);
  ok('surum 2 seçim fazı eski RPC ile çalışır', e === null && Number((await satir(m)).secim_sira) === 1, e);
  await ben(null);
  const tik = await hata(`select duello_tik_hepsi()`);
  ok('duello_tik_hepsi hatasız (v2 + v4 maçlar)', tik === null, tik);

  console.log('13) Yetkiler + kapsam');
  const yetki = await db.sorgu(`select p.proname, has_function_privilege('authenticated', p.oid, 'execute') au, has_function_privilege('anon', p.oid, 'execute') an
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'duello4\\_%'`);
  ok(`yeni ${yetki.length} fonksiyon istemciye kapalı`, yetki.length >= 20 && yetki.every((x) => x.au === 'f' && x.an === 'f'), JSON.stringify(yetki.filter((x) => x.au === 't' || x.an === 't')));
  if (once) {
    const sonra = await md5Hepsi();
    const degisen = Object.keys(once).filter((k) => sonra[k] !== once[k]).map((k) => k.split('(')[0]);
    const beklenmeyen = degisen.filter((x) => !HEDEF_FN.includes(x));
    ok(`yalnız 9 hedef fonksiyon değişti (${degisen.length})`, beklenmeyen.length === 0 && degisen.length === HEDEF_FN.length, beklenmeyen.join());
  }
} catch (err) {
  if (!/ön kontrol/.test(err.message)) { kaldi++; console.error('HATA:', err.message); }
} finally {
  try { await db.sorgu('rollback'); } catch { /* */ }
  clearTimeout(bekci);
  const artik = await db.sorgu(`select count(*)::text n from pg_stat_activity where application_name = '${UYGULAMA}' and pid <> pg_backend_pid()`).catch(() => [{ n: '?' }]);
  await db.kapat();
  console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı · ROLLBACK · artık oturum: ${artik[0].n}`);
  if (kaldi) process.exitCode = 1;
}
