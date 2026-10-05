// Düello 960 · SIRAYLA KATEGORİ SEÇİMİ (draft) + 7 yuva + 20 tur — SQL provası.
// TEK transaction, sonunda ROLLBACK (canlıya iz bırakmaz). Kasa 958 dersi (test oturumu kilit tutup oyunu dondurdu):
//   · kısa lock_timeout + statement_timeout + idle_in_transaction_session_timeout (istemci ölürse sunucu işlemi keser),
//   · JS bekçisi: toplam süre aşılırsa ROLLBACK + bağlantıyı kapat,
//   · bitince pg_stat_activity'de bu betiğin artık oturumu kalmadığı ölçülür.
//   · Simülasyon (--sim N) maç başına SAVEPOINT → ROLLBACK TO: her maçın satır kilitleri (soru sayacı, bot istatistiği)
//     maç biter bitmez bırakılır. Simülasyon yalnız 960 canlıdayken koşar (ALTER kilidi uzun süre tutulmasın).
//
// Sınar: yılan sırası (A-B-B-A-A-B-B-A-A-B) · sıra dışı / çift / geçersiz seçim reddi · süre dolunca otomatik seçim
// (en yüksek kendi yüzdesi; yüzdesiz "Yeni" kartlar sonra) · yeni oyuncu (verisiz) · bot seçimi (gecikme + en iyi isabet,
// B-B ardışık) · seçim bitince tur 1 ban fazı, ilk saldıran = ilk seçmeyen, 5-5, boş yok · eşik 7 nakavt · 20 tur sonu
// Altın Soru · bayrak kapalıyken eski akış (boş, 5, 16) · süren (960 öncesi) maç eski kuralla biter · durum() şekli ·
// yetkiler (yeni iç fonksiyonlar istemciye kapalı, yeni GRANT yok) · migration'ın değiştirdiği fonksiyonlar yalnız
// hedef liste (Klasik / Kasa / ortak joker md5 aynı) · Kasa 958 ve öteki ayarlar aynı.
// --yaris (960 canlıyken): GERÇEK eşzamanlılık — iki bağlantı aynı seçimi yarıştırır (kayıtlı test maçı, sonunda iptal).
//
// Kullanım: node araclar/duello-secim-sql-testi.mjs [--zorla] [--sim 60] [--yaris]
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';

const ZORLA = process.argv.includes('--zorla');
const YARIS = process.argv.includes('--yaris');
const simI = process.argv.indexOf('--sim');
const SIM = simI > 0 ? Number(process.argv[simI + 1] || 60) : 0;
const MIG = new URL('../supabase/migrations/20260612000960_duello_secim_fazi.sql', import.meta.url);
const GERI = new URL('../docs/duello-geri-alma-secim.sql', import.meta.url);
const HEDEF_FN = ['duello_olustur', 'duello2_kategori_sec', 'duello2_sonraki', 'duello2_ilerlet', 'duello2_bot_tik', 'duello2_durum'];
const YENI_FN = ['duello_secim_modu_acik', 'duello2_secim_havuzu', 'duello2_secim_sirasi', 'duello2_secim_uygula',
  'duello2_bot_secim_kategori', 'duello2_secim_oto'];
const UYGULAMA = 'duello-secim-sql-testi';

const dizgi = await baglantiDizgisi();
const db = await new PgIstemci(dizgi).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);
const json = async (s) => JSON.parse(await tek(s));
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
async function hata(sql) {
  await db.sorgu('savepoint s');
  try { await db.sorgu(sql); await db.sorgu('release savepoint s'); return null; }
  catch (e) { await db.sorgu('rollback to savepoint s'); return e.message; }
}
// Bekçi: işlem 8 dk'yı (simülasyonla 25 dk) aşarsa geri al ve kapat — oturum açık kalıp kilit tutmasın.
const bekci = setTimeout(async () => {
  console.error('⏱ süre aşıldı — ROLLBACK + kapat');
  try { await db.sorgu('rollback'); } catch { /* */ }
  await db.kapat(); process.exit(3);
}, (SIM ? 25 : 8) * 60 * 1000);

const md5Hepsi = async () => Object.fromEntries((await db.sorgu(`select p.oid::regprocedure::text imza, md5(pg_get_functiondef(p.oid)) h
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f'`)).map((x) => [x.imza, x.h]));
const ayarHepsi = async () => Object.fromEntries((await db.sorgu(`select anahtar, deger::text d from oyun_ayarlari`)).map((x) => [x.anahtar, x.d]));

try {
  await db.sorgu(`set application_name = '${UYGULAMA}'`);
  // ---------------------------------------------------------------- 0) ön kontrol
  console.log('0) Ön kontrol (salt okunur)');
  const on = (await db.sorgu(`select (select count(*) from matches where durum = 'aktif')::text mac,
      (select count(*) from duellolar where durum = 'aktif')::text duello,
      (select count(*) from kasa_maclari where durum = 'aktif')::text kasa,
      (now() at time zone 'Europe/Istanbul')::text tsi`))[0];
  console.log('  ', JSON.stringify(on));
  if ((Number(on.mac) + Number(on.duello) + Number(on.kasa) > 0) && !ZORLA) {
    console.log('  ⏸ BEKLE: aktif oyun var (--zorla ile atlanır)'); process.exitCode = 2; throw new Error('ön kontrol: bekle');
  }
  const canli = (await tek(`select count(*)::text from information_schema.columns where table_name = 'duellolar' and column_name = 'secim_modu'`)) === '1';
  console.log(`  960 canlıda: ${canli ? 'EVET' : 'hayır (işlem içinde uygulanacak)'}`);

  // ---------------------------------------------------------------- 1) işlem
  await db.sorgu('begin');
  await db.sorgu("set local lock_timeout = '3s'");
  await db.sorgu("set local statement_timeout = '30s'");
  await db.sorgu("set local idle_in_transaction_session_timeout = '60s'");

  const H = await db.sorgu(`select id, takma_ad from profiles where takma_ad in ('ArayuzDenetim890', 'ArayuzDenetim648')`);
  const A = H.find((x) => x.takma_ad === 'ArayuzDenetim890')?.id;
  const B = H.find((x) => x.takma_ad === 'ArayuzDenetim648')?.id;
  const BOT = await tek(`select id from profiles where is_bot and bot_turu = 'gizli' and coalesce(bot_aktif, true) order by bot_seviye_puan nulls last, id limit 1`);
  if (!A || !B || !BOT) throw new Error('test hesapları bulunamadı');
  console.log(`  A=${A} B=${B} bot=${BOT}`);
  await db.sorgu(`update duellolar set durum = 'iptal' where durum = 'aktif' and (oyuncu1 in ('${A}','${B}','${BOT}') or oyuncu2 in ('${A}','${B}','${BOT}'))`);
  await db.sorgu(`update profiles set last_seen = now() where id in ('${A}','${B}')`);

  // Süren (960 öncesi) maç: migration'dan ÖNCE açılır (yalnız 960 canlı değilken mümkün).
  let eskiId = null;
  if (!canli) {
    eskiId = await tek(`select duello_olustur('${A}','${B}',false,null)`);
    await db.sorgu(`update duellolar set durum = 'aktif' where id = '${eskiId}'`);
  }

  const md5Once = await md5Hepsi();
  const ayarOnce = await ayarHepsi();
  if (!canli) {
    await db.sorgu(fs.readFileSync(MIG, 'utf8'));
    console.log('  migration 960 işlem içinde uygulandı');
    await db.sorgu("set local lock_timeout = '3s'");
    await db.sorgu("set local statement_timeout = '30s'");
  }

  // ---------------------------------------------------------------- 2) kapsam: yalnız hedef fonksiyonlar değişti
  console.log('1) Migration kapsamı (md5 + ayarlar)');
  if (!canli) {
    const md5Sonra = await md5Hepsi();
    const degisen = Object.keys(md5Sonra).filter((k) => md5Once[k] !== md5Sonra[k]).map((k) => k.replace(/\(.*/, '')).sort();
    const bekl = [...HEDEF_FN, ...YENI_FN].sort();
    ok('değişen/yeni fonksiyonlar yalnız hedef liste (Klasik, Kasa, ortak joker md5 aynı)', JSON.stringify(degisen) === JSON.stringify(bekl), JSON.stringify(degisen));
    const silinen = Object.keys(md5Once).filter((k) => !(k in md5Sonra));
    ok('hiçbir fonksiyon silinmedi', silinen.length === 0, silinen.join(','));
    const ayarSonra = await ayarHepsi();
    const ayarFark = Object.keys({ ...ayarOnce, ...ayarSonra }).filter((k) => ayarOnce[k] !== ayarSonra[k]).sort();
    ok('değişen ayarlar yalnız düello listesi', JSON.stringify(ayarFark) === JSON.stringify(['duello_bos_mod_esik', 'duello_bos_mod_max_tur',
      'duello_bot_secim_max_sn', 'duello_bot_secim_min_sn', 'duello_hakimiyet_esik', 'duello_max_tur', 'duello_secim_ilk_ek_sn',
      'duello_secim_modu', 'duello_secim_sn']), JSON.stringify(ayarFark));
    ok('Kasa ayarları aynı (958: acma_min 0, hedef 80, tavan 60, çarpan 2)', Object.keys(ayarOnce).filter((k) => k.startsWith('kasa_')).every((k) => ayarOnce[k] === ayarSonra[k])
      && ayarSonra.kasa_acma_min === '0' && ayarSonra.kasa_hedef_puan === '80');
  } else {
    console.log('  (960 canlıda — kapsam karşılaştırması önceki koşuda yapıldı)');
  }
  const ay = await ayarHepsi();
  ok('ayarlar: secim_modu true · secim 5 sn · eşik 7 · tur 20 · eski mod 5/16', ay.duello_secim_modu === 'true' && ay.duello_secim_sn === '5'
    && ay.duello_hakimiyet_esik === '7' && ay.duello_max_tur === '20' && ay.duello_bos_mod_esik === '5' && ay.duello_bos_mod_max_tur === '16', JSON.stringify([ay.duello_secim_modu, ay.duello_hakimiyet_esik, ay.duello_max_tur]));

  console.log('2) Yetkiler');
  const acl = await db.sorgu(`select p.proname, coalesce(p.proacl::text, '') a from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = any(array[${[...YENI_FN, 'duello_kategori_sec', 'duello2_kategori_sec'].map((x) => `'${x}'`).join(',')}])`);
  const aclOf = (n) => acl.find((x) => x.proname === n)?.a ?? '';
  ok('yeni iç fonksiyonlar anon/authenticated/public\'e kapalı', YENI_FN.every((n) => aclOf(n) && !/(^|[{,])(anon|authenticated)?=X/.test(aclOf(n))), JSON.stringify(acl));
  ok('istemci seçimi mevcut duello_kategori_sec ile (authenticated izni değişmedi), duello2_kategori_sec kapalı',
    /authenticated=X/.test(aclOf('duello_kategori_sec')) && !/authenticated=X/.test(aclOf('duello2_kategori_sec')));

  const K = await json(`select to_json(duello_kategorileri())::text`);
  const satir = (id) => json(`select row_to_json(x)::text from duellolar x where id = '${id}'`);
  const kalanSn = (id) => tek(`select round(extract(epoch from (faz_bitis - now())), 1)::text from duellolar where id = '${id}'`).then(Number);
  const sureDoldur = async (id) => { await db.sorgu(`update duellolar set faz_bitis = now() - interval '1 second' where id = '${id}'`); await db.sorgu(`select duello2_ilerlet('${id}')`); return satir(id); };
  // Yeni maç; oyuncu1 = p1, oyuncu2 = p2, ilk seçen = ilk (yalnız sıra normalize edilir; ayarlar sunucudan).
  const yeniMac = async (p1, p2, ilk = p2) => {
    const id = await tek(`select duello_olustur('${p1}','${p2}',false,null)`);
    await db.sorgu(`update duellolar set oyuncu1 = oyuncu2, oyuncu2 = oyuncu1, profil1 = profil2, profil2 = profil1, saldiran = case when secim_modu then saldiran else oyuncu2 end where id = '${id}' and oyuncu1 <> '${p1}'`);
    await db.sorgu(`update duellolar set ilk_secen = '${ilk}', saldiran = '${ilk}' where id = '${id}' and secim_modu`);
    return id;
  };
  const SIRA = (i) => Math.floor((i + 1) / 2) % 2;   // 0 = ilk seçen

  // ---------------------------------------------------------------- 3) yeni maç: seçim fazı
  console.log('3) Yeni maç seçim fazıyla açılır');
  let ham = await tek(`select duello_olustur('${A}','${B}',false,null)`);
  let d = await satir(ham);
  ok('faz secim · secim_modu · eşik 7 · max_tur 20 · sahiplik boş · 0-0', d.faz === 'secim' && d.secim_modu === true && d.hakimiyet_esik === 7
    && d.max_tur === 20 && JSON.stringify(d.sahiplik) === '{}' && d.yuva1 === 0 && d.yuva2 === 0 && d.secim_sira === 0, JSON.stringify([d.faz, d.hakimiyet_esik, d.max_tur]));
  ok('ilk seçen = oyuncu2 = saldıran (sıra rastgele: duello_olustur oyuncuları karıştırır)', d.ilk_secen === d.oyuncu2 && d.saldiran === d.oyuncu2);
  let sn = await kalanSn(ham);
  ok('ilk seçim süresi = 5 + 3 (açılış payı) + gösterim payı 1,5', sn >= 9 && sn <= 9.6, String(sn));
  let ilkler = new Set();
  for (let i = 0; i < 16; i++) { const x = await tek(`select duello_olustur('${A}','${B}',false,null)`); ilkler.add(await tek(`select ilk_secen::text from duellolar where id = '${x}'`)); await db.sorgu(`update duellolar set durum = 'iptal' where id = '${x}'`); }
  ok('ilk seçen rastgele (16 maçta iki oyuncu da ilk seçti)', ilkler.size === 2, [...ilkler].join(','));
  await db.sorgu(`update duellolar set durum = 'iptal' where id = '${ham}'`);

  // ---------------------------------------------------------------- 4) yılan sırası + reddler
  console.log('4) Yılan sırası A-B-B-A-A-B-B-A-A-B (A ilk seçen) + sıra dışı / çift / geçersiz seçim reddi');
  let id = await yeniMac(B, A, A);   // oyuncu1 = B, oyuncu2 = A = ilk seçen → ilk saldıran B (ilk seçmeyen)
  await ben(A);
  let dur = await json(`select duello_durum('${id}')::text`);
  const beklSira = Array.from({ length: 10 }, (_, i) => (SIRA(i) === 0 ? A : B));
  ok('durum.secim: acik, sira 0, toplam 10, sirasi yılan, kalan 10, sure 5', dur.secim?.acik === true && dur.secim.sira === 0 && dur.secim.toplam === 10
    && JSON.stringify(dur.secim.sirasi) === JSON.stringify(beklSira) && dur.secim.kalan.length === 10 && Number(dur.secim.sure) === 5, JSON.stringify(dur.secim));
  ok('durum: faz secim, max_tur 20, sureler.secim 5, gosterim_bas = bitiş − 5 sn, hakimiyet.esik 7',
    dur.faz === 'secim' && dur.max_tur === 20 && Number(dur.sureler.secim) === 5 && Boolean(dur.sureler.gosterim_bas)
    && Math.abs(new Date(dur.faz_bitis) - new Date(dur.sureler.gosterim_bas) - 5000) < 50 && dur.hakimiyet.esik === 7, JSON.stringify([dur.sureler.gosterim_bas, dur.faz_bitis]));
  await ben(B);
  let h = await hata(`select duello_kategori_sec('${id}','${K[0]}')`);
  ok('sıra A\'dayken B seçemez', h && /seçim sırası sende değil/.test(h), h);
  await ben(A);
  h = await hata(`select duello_kategori_sec('${id}','yok_boyle')`);
  ok('geçersiz kategori reddedilir', h && /seçilemez/.test(h), h);
  h = await hata(`select duello_ban_sec('${id}','${K[0]}')`);
  ok('seçim fazında ban reddedilir', h && /ban sırası sende değil/.test(h), h);
  const secimSirasi = [];
  for (let i = 0; i < 10; i++) {
    const kim = SIRA(i) === 0 ? A : B;
    await ben(kim);
    const kat = K[(i * 3) % 10] && !secimSirasi.includes(K[(i * 3) % 10]) ? K[(i * 3) % 10] : K.find((k) => !secimSirasi.includes(k));
    h = await hata(`select duello_kategori_sec('${id}','${kat}')`);
    if (h) { ok(`seçim ${i + 1} (${kim === A ? 'A' : 'B'})`, false, h); break; }
    secimSirasi.push(kat);
    if (i === 0) {
      h = await hata(`select duello_kategori_sec('${id}','${kat}')`);
      ok('çift seçim: A\'nın ikinci isteği reddedilir (sıra B\'de)', h && /seçim sırası sende değil/.test(h), h);
      await ben(B);
      h = await hata(`select duello_kategori_sec('${id}','${kat}')`);
      ok('alınmış kategori ikinci kez seçilemez', h && /zaten alındı/.test(h), h);
      sn = await kalanSn(id);
      ok('sonraki seçim süresi = 5 + gösterim payı (ilk seçim payı yok)', sn >= 6 && sn <= 6.6, String(sn));
    }
    if (i === 1) {
      await ben(B);
      dur = await json(`select duello_durum('${id}')::text`);
      ok('B-B: B\'nin ilk seçiminden sonra sıra yine B\'de (saldıran B)', dur.saldiran === B && dur.secim.sira === 2, JSON.stringify([dur.saldiran === B, dur.secim.sira]));
    }
  }
  d = await satir(id);
  const sahipA = Object.values(d.sahiplik).filter((v) => v === A).length;
  ok('10 seçim yılan sırasıyla kaydedildi (secimler.u = beklenen sıra)', d.secimler.length === 10 && d.secimler.every((s, i) => s.u === beklSira[i] && s.k === secimSirasi[i] && s.oto === false && s.sira === i + 1), JSON.stringify(d.secimler.map((s) => s.u === A ? 'A' : 'B')));
  ok('seçim bitti → tur 1, faz ban (savunma banı), saldıran oyuncu1 = B = ilk SEÇMEYEN', d.tur === 1 && d.faz === 'ban' && d.saldiran === B && d.oyuncu1 === B, JSON.stringify([d.tur, d.faz]));
  ok('5-5 · 10 kategorinin hepsi sahipli (boş yok) · kilit yok', sahipA === 5 && Object.keys(d.sahiplik).length === 10 && d.yuva1 === 5 && d.yuva2 === 5 && JSON.stringify(d.kilitler) === '{}');
  sn = await kalanSn(id);
  ok('tur 1 ban süresi 7 + 3 + pay (HÂKİMİYET BAŞLIYOR geçişi bu payın içinde)', sn >= 11 && sn <= 11.6, String(sn));
  h = await hata(`select duello_kategori_sec('${id}','${K[0]}')`);
  ok('seçim bitince seçim RPC\'si eski kurala döner (ban fazında kategori seçilemez)', h && /sırası sende değil/.test(h), h);
  await ben(A);
  dur = await json(`select duello_durum('${id}')::text`);
  ok('durum: secim.kalan yok (faz geçti), secimler 10, ban.uygun dolu', dur.secim.kalan === null && dur.secim.secimler.length === 10 && Array.isArray(dur.ban.uygun) && dur.ban.uygun.length > 0, JSON.stringify(dur.ban));
  // Tutma kuralları aynen: ban → kategori → B saldırır A'nın kategorisine
  await db.sorgu(`select duello2_ban_bitir('${id}', null)`);
  const aKat = Object.keys(d.sahiplik).find((k) => d.sahiplik[k] === A);
  await ben(B);
  h = await hata(`select duello_kategori_sec('${id}','${aKat}')`);
  d = await satir(id);
  ok('tur 1: B rakibin (A) kategorisine saldırabilir → cevap fazı', h === null && d.faz === 'cevap' && d.kategori === aKat, h);
  const dc = Number(await tek(`select dogru_cevap::text from questions where id = '${d.soru_id}'`));
  await db.sorgu(`select duello_cevap('${id}', ${dc}::smallint)`);
  await ben(A);
  await db.sorgu(`select duello_cevap('${id}', ${(dc + 1) % 4}::smallint)`);
  await db.sorgu(`select duello2_ilerlet('${id}')`);
  d = await satir(id);
  ok('saldıran doğru + savunan yanlış → el değiştirir (B 6, A 4), kilit 2 tur', d.faz === 'sonuc' && d.sahiplik[aKat] === B && d.yuva1 === 6 && d.yuva2 === 4
    && Number(d.kilitler[aKat]) === 3 && d.son_hamle.hakimiyet.eylem === 'elinden_al' && d.son_hamle.hakimiyet.tuttu === true, JSON.stringify([d.yuva1, d.yuva2, d.son_hamle?.hakimiyet]));
  d = await sureDoldur(id);
  ok('tur 2: saldıran oyuncu2 (A), ban fazı', d.tur === 2 && d.saldiran === A && d.faz === 'ban', JSON.stringify([d.tur, d.faz]));

  // ---------------------------------------------------------------- 5) süre dolunca otomatik seçim
  console.log('5) Süre dolunca otomatik seçim');
  id = await yeniMac(A, B, A);
  // A'nın kart yüzdeleri (maç başında sabit): k3 en yüksek, k7 ikinci, gerisi "Yeni" (null)
  const oran = Object.fromEntries(K.map((k) => [k, null]));
  oran[K[3]] = 81; oran[K[7]] = 64; oran[K[1]] = 12;
  await db.sorgu(`update duellolar set profil1 = coalesce(profil1, '{}'::jsonb) || jsonb_build_object('oranlar', '${JSON.stringify(oran)}'::jsonb),
                                      profil2 = coalesce(profil2, '{}'::jsonb) || jsonb_build_object('oranlar', '{}'::jsonb) where id = '${id}'`);
  d = await sureDoldur(id);
  ok('A süre doldu → en yüksek kendi yüzdesi (%81) seçildi, oto işaretli', d.sahiplik[K[3]] === A && d.secimler[0].oto === true && d.secim_sira === 1 && d.saldiran === B, JSON.stringify(d.secimler));
  d = await sureDoldur(id);   // B (verisiz "Yeni"): rastgele geçerli
  ok('B verisiz ("Yeni") → kalanlardan geçerli bir kategori, oto', d.secim_sira === 2 && d.secimler[1].u === B && d.secimler[1].oto === true && K.includes(d.secimler[1].k) && d.secimler[1].k !== K[3]);
  // B iki kez daha (B-B): ikinci seçimini B kendisi yapar
  await ben(B);
  const bKendi = K.find((k) => !d.sahiplik[k] && k !== K[7]);
  h = await hata(`select duello_kategori_sec('${id}','${bKendi}')`);
  d = await satir(id);
  ok('B ikinci seçimini kendisi yaptı (oto değil), sıra A\'ya geçti', h === null && d.secimler[2].oto === false && d.saldiran === A, h);
  // B'nin rastgele (verisiz) seçimi A'nın yüzdeli kartlarından birini almış olabilir: beklenen = kalanların en yükseği.
  const aSira = [K[3], K[7], K[1]];
  let bekl = aSira.find((k) => !d.sahiplik[k]);
  d = await sureDoldur(id);
  ok('A ikinci otomatik: kalan yüzdelilerin en yükseği', d.secimler[3].k === bekl && d.secimler[3].oto === true, `${bekl} · ${JSON.stringify(d.secimler[3])}`);
  bekl = aSira.find((k) => !d.sahiplik[k]);
  d = await sureDoldur(id);
  ok('A üçüncü otomatik: yüzdeli kartlar (%12 dahil) yüzdesiz "Yeni"lerden ÖNCE', !bekl || d.secimler[4].k === bekl, `${bekl} · ${JSON.stringify(d.secimler[4])}`);
  for (let i = 0; i < 5; i++) d = await sureDoldur(id);
  ok('hepsi otomatik dolar → tur 1 ban fazı, 5-5', d.faz === 'ban' && d.tur === 1 && d.yuva1 === 5 && d.yuva2 === 5 && d.secimler.length === 10, JSON.stringify([d.faz, d.yuva1, d.yuva2]));
  // 12 adımlık ilerletme döngüsü aynı anda birden çok dolmuş seçimi işleyebilir (kopuk dönüşü vb.)
  id = await yeniMac(A, B, A);
  await db.sorgu(`update duellolar set profil1 = profil1 || '{"oranlar":{}}'::jsonb, profil2 = profil2 || '{"oranlar":{}}'::jsonb where id = '${id}'`);
  await db.sorgu(`update duellolar set faz_bitis = now() - interval '1 second' where id = '${id}'`);
  await db.sorgu(`select duello2_ilerlet('${id}')`);
  d = await satir(id);
  ok('tek ilerletmede yalnız süresi dolan seçim işlenir (sonraki 5 sn sürer)', d.secim_sira === 1 && d.faz === 'secim', String(d.secim_sira));

  // ---------------------------------------------------------------- 6) bot seçimi
  console.log('6) Bot seçimi');
  id = await yeniMac(A, BOT, BOT);
  await db.sorgu(`select duello2_bot_tik('${id}')`);
  d = await satir(id);
  ok('bot gecikmeden önce seçmez (en az 1 sn)', d.secim_sira === 0);
  const botEnIyi = await tek(`select duello2_bot_secim_kategori('${id}','${BOT}')`);
  const botSirali = await json(`select json_agg(k order by bot_kategori_isabet('${BOT}', k) desc, k)::text from unnest(duello_kategorileri()) k`);
  ok('bot seçimi = kendi isabeti en yüksek kategori', botEnIyi === botSirali[0], `${botEnIyi} vs ${botSirali[0]}`);
  await db.sorgu(`update duellolar set faz_bitis = now() + interval '1.9 seconds' where id = '${id}'`);   // sayaç 3,1 sn önce başladı → gecikme (≤ 3) geçti
  await db.sorgu(`select duello2_bot_tik('${id}')`);
  d = await satir(id);
  ok('gecikme geçince bot seçti (oto değil), sıra insana', d.secim_sira === 1 && d.secimler[0].u === BOT && d.secimler[0].k === botSirali[0] && d.secimler[0].oto === false && d.saldiran === A, JSON.stringify(d.secimler));
  await ben(A);
  await db.sorgu(`select duello_kategori_sec('${id}','${botSirali[1]}')`);   // A botun ikinci en iyisini kapar
  await ben(A);
  await db.sorgu(`select duello_kategori_sec('${id}','${botSirali[2]}')`);
  d = await satir(id);
  ok('A-A sonrası sıra botta (B-B: bot iki kez)', d.saldiran === BOT && d.secim_sira === 3);
  await db.sorgu(`update duellolar set faz_bitis = now() + interval '1.9 seconds' where id = '${id}'`);
  await db.sorgu(`select duello2_bot_tik('${id}')`);
  d = await satir(id);
  ok('bot alınmışları atlar → kalanların en iyisi', d.secimler[3]?.u === BOT && d.secimler[3]?.k === botSirali[3], JSON.stringify(d.secimler[3]));
  ok('B-B: bot hemen ikinci kez seçmez (yeni gecikme)', d.secim_sira === 4 && d.saldiran === BOT);
  d = await sureDoldur(id);
  ok('bot geç kalırsa süre dolumu da bot seçimini yapar (oto sayılmaz)', d.secimler[4]?.u === BOT && d.secimler[4]?.k === botSirali[4] && d.secimler[4]?.oto === false, JSON.stringify(d.secimler[4]));
  for (let i = 0; i < 5; i++) {
    d = await satir(id);
    if (d.saldiran === A) { await ben(A); await db.sorgu(`select duello_kategori_sec('${id}','${K.find((k) => !d.sahiplik[k])}')`); }
    else { await db.sorgu(`update duellolar set faz_bitis = now() + interval '1.9 seconds' where id = '${id}'`); await db.sorgu(`select duello2_bot_tik('${id}')`); }
  }
  d = await satir(id);
  ok('botla seçim tamamlanır → tur 1, saldıran insan A (ilk seçmeyen), bot savunur', d.faz === 'ban' && d.tur === 1 && d.saldiran === A && d.yuva1 === 5 && d.yuva2 === 5, JSON.stringify([d.faz, d.tur, d.yuva1, d.yuva2]));
  await db.sorgu(`update duellolar set faz_bitis = now() + interval '2 seconds' where id = '${id}'`);
  await db.sorgu(`select duello2_bot_tik('${id}')`);
  d = await satir(id);
  ok('890 bot mantığı yeni dağılımla çalışır: bot banladı → kategori fazı', d.faz === 'kategori' && K.includes(d.ban_kategori), JSON.stringify([d.faz, d.ban_kategori]));
  await ben(A);
  const botKat = Object.keys(d.sahiplik).find((k) => d.sahiplik[k] === BOT && k !== d.ban_kategori);
  await db.sorgu(`select duello_kategori_sec('${id}','${botKat}')`);
  // bot saldırısı: tur 2'de bot kategori seçer (boş yok → rakip ya da kendi)
  await db.sorgu(`update duellolar set faz = 'sonuc', faz_bitis = now() - interval '1 second' where id = '${id}'`);
  await db.sorgu(`select duello2_ilerlet('${id}')`);
  await db.sorgu(`select duello2_ban_bitir('${id}', null)`);
  const botSaldiri = new Set();
  for (let i = 0; i < 30; i++) botSaldiri.add(await tek(`select duello2_bot_kategori('${id}','${BOT}')`));
  d = await satir(id);
  ok('bot saldırı seçimi: boş kategori yok, seçtikleri sahipli + kilitsiz', [...botSaldiri].every((k) => d.sahiplik[k] && !(Number(d.kilitler[k] ?? 0) >= d.tur)), [...botSaldiri].join(','));

  // ---------------------------------------------------------------- 7) eşik 7 nakavt
  console.log('7) Eşik 7: 7. yuvayı alan nakavtla kazanır');
  id = await yeniMac(A, B, B);
  const s6 = Object.fromEntries(K.map((k, i) => [k, i < 6 ? A : B]));
  await db.sorgu(`update duellolar set faz = 'kategori', tur = 5, saldiran = '${A}', saldiri_sirasi = 0, sahiplik = '${JSON.stringify(s6)}'::jsonb, yuva1 = 6, yuva2 = 4,
                   secim_sira = 10, faz_bitis = now() + interval '15 seconds' where id = '${id}'`);
  await ben(A);
  await db.sorgu(`select duello_kategori_sec('${id}','${K[8]}')`);
  d = await satir(id);
  const dc7 = Number(await tek(`select dogru_cevap::text from questions where id = '${d.soru_id}'`));
  await db.sorgu(`select duello_cevap('${id}', ${dc7}::smallint)`);
  await ben(B);
  await db.sorgu(`select duello_cevap('${id}', ${(dc7 + 2) % 4}::smallint)`);
  await db.sorgu(`select duello2_ilerlet('${id}')`);
  d = await satir(id);
  ok('6 → 7: hamle tuttu, sonuç fazı (maç sonuçtan sonra biter)', d.faz === 'sonuc' && d.yuva1 === 7 && d.durum === 'aktif', JSON.stringify([d.faz, d.yuva1, d.durum]));
  d = await sureDoldur(id);
  ok('7 yuva → nakavt: maç bitti, kazanan A', d.durum === 'bitti' && d.kazanan === A, JSON.stringify([d.durum, d.kazanan === A]));
  id = await yeniMac(A, B, B);
  const s5 = Object.fromEntries(K.map((k, i) => [k, i < 6 ? A : B]));
  await db.sorgu(`update duellolar set faz = 'sonuc', tur = 6, sahiplik = '${JSON.stringify(s5)}'::jsonb, yuva1 = 6, yuva2 = 4, secim_sira = 10, faz_bitis = now() - interval '1 second' where id = '${id}'`);
  await db.sorgu(`select duello2_ilerlet('${id}')`);
  d = await satir(id);
  ok('6 yuva (eşik 5 artık yetmez): maç sürer, tur 7', d.durum === 'aktif' && d.tur === 7, JSON.stringify([d.durum, d.tur]));

  // ---------------------------------------------------------------- 8) 20 tur sonu
  console.log('8) 20 tur sonu: eşitse Altın Soru, değilse yuvası çok olan');
  const s55 = Object.fromEntries(K.map((k, i) => [k, i % 2 ? A : B]));
  await db.sorgu(`update duellolar set faz = 'sonuc', tur = 19, sahiplik = '${JSON.stringify(s55)}'::jsonb, yuva1 = 5, yuva2 = 5, faz_bitis = now() - interval '1 second' where id = '${id}'`);
  d = await (async () => { await db.sorgu(`select duello2_ilerlet('${id}')`); return satir(id); })();
  ok('tur 19 → 20 (16\'da bitmez)', d.durum === 'aktif' && d.tur === 20 && !d.uzatma, JSON.stringify([d.tur, d.uzatma]));
  await db.sorgu(`update duellolar set faz = 'sonuc', faz_bitis = now() - interval '1 second' where id = '${id}'`);
  await db.sorgu(`select duello2_ilerlet('${id}')`);
  d = await satir(id);
  ok('20. tur sonu 5-5 → Altın Soru (uzatma, cevap fazı)', d.uzatma === true && d.durum === 'aktif' && d.faz === 'cevap', JSON.stringify([d.uzatma, d.faz]));
  id = await yeniMac(A, B, B);
  const s64 = Object.fromEntries(K.map((k, i) => [k, i < 6 ? B : A]));
  await db.sorgu(`update duellolar set faz = 'sonuc', tur = 20, secim_sira = 10, sahiplik = '${JSON.stringify(s64)}'::jsonb, yuva1 = 4, yuva2 = 6, faz_bitis = now() - interval '1 second' where id = '${id}'`);
  await db.sorgu(`select duello2_ilerlet('${id}')`);
  d = await satir(id);
  ok('20. tur sonu 4-6 → yuvası çok olan (B) kazanır', d.durum === 'bitti' && d.kazanan === B && !d.uzatma);

  // ---------------------------------------------------------------- 9) bayrak kapalı: eski akış
  console.log('9) duello_secim_modu = false → eski akış (boş kategori, eşik 5, 16 tur)');
  await db.sorgu(`update oyun_ayarlari set deger = 'false' where anahtar = 'duello_secim_modu'`);
  id = await yeniMac(A, B);
  d = await satir(id);
  ok('faz ban (tur 1), secim_modu false, eşik 5, max_tur 16, sahiplik boş, saldıran oyuncu1', d.faz === 'ban' && d.secim_modu === false && d.hakimiyet_esik === 5
    && d.max_tur === 16 && JSON.stringify(d.sahiplik) === '{}' && d.saldiran === A && d.ilk_secen === null, JSON.stringify([d.faz, d.hakimiyet_esik, d.max_tur]));
  await ben(A);
  dur = await json(`select duello_durum('${id}')::text`);
  ok('durum: secim.acik false, max_tur 16', dur.secim?.acik === false && dur.max_tur === 16);
  await db.sorgu(`select duello2_ban_bitir('${id}', null)`);
  await db.sorgu(`select duello_kategori_sec('${id}','${K[2]}')`);
  d = await satir(id);
  const dc9 = Number(await tek(`select dogru_cevap::text from questions where id = '${d.soru_id}'`));
  await db.sorgu(`select duello_cevap('${id}', ${dc9}::smallint)`);
  await ben(B);
  await db.sorgu(`select duello_cevap('${id}', ${dc9}::smallint)`);
  await db.sorgu(`select duello2_ilerlet('${id}')`);
  d = await satir(id);
  ok('870 boş kategori kuralı eski akışta işler (ikisi doğru → saldıran alır)', d.sahiplik[K[2]] === A && d.son_hamle.hakimiyet.neden === 'bos_ikisi_dogru', JSON.stringify(d.son_hamle?.hakimiyet));
  await db.sorgu(`update duellolar set faz = 'sonuc', tur = 15, faz_bitis = now() - interval '1 second' where id = '${id}'`);
  await db.sorgu(`select duello2_ilerlet('${id}')`);
  d = await satir(id);
  ok('eski akış: tur 15 → 16', d.tur === 16 && d.durum === 'aktif');
  await db.sorgu(`update duellolar set faz = 'sonuc', sahiplik = '{}'::jsonb, yuva1 = 0, yuva2 = 0, faz_bitis = now() - interval '1 second' where id = '${id}'`);
  await db.sorgu(`select duello2_ilerlet('${id}')`);
  d = await satir(id);
  ok('eski akış: 16. tur sonu 0-0 → Altın Soru', d.uzatma === true, JSON.stringify([d.tur, d.uzatma]));
  await db.sorgu(`update duellolar set faz = 'sonuc', uzatma = false, tur = 4, sahiplik = '{"a":"${A}","b":"${A}","c":"${A}","d":"${A}","e":"${A}"}'::jsonb, yuva1 = 5, faz_bitis = now() - interval '1 second' where id = '${id}'`);
  await db.sorgu(`select duello2_ilerlet('${id}')`);
  d = await satir(id);
  ok('eski akış: 5 yuva nakavt', d.durum === 'bitti' && d.kazanan === A);
  // Açıkken açılmış maç, bayrak kapanınca da seçim moduyla biter (satıra sabit)
  await db.sorgu(`update oyun_ayarlari set deger = 'true' where anahtar = 'duello_secim_modu'`);
  id = await yeniMac(A, B, A);
  await db.sorgu(`update oyun_ayarlari set deger = 'false' where anahtar = 'duello_secim_modu'`);
  await ben(A);
  h = await hata(`select duello_kategori_sec('${id}','${K[0]}')`);
  d = await satir(id);
  ok('bayrak sonradan kapansa da süren seçim maçı seçimle sürer (satıra sabit)', h === null && d.faz === 'secim' && d.sahiplik[K[0]] === A, h);
  await db.sorgu(`update oyun_ayarlari set deger = 'true' where anahtar = 'duello_secim_modu'`);

  // ---------------------------------------------------------------- 10) süren 960 öncesi maç
  console.log('10) Süren (960 öncesi) maç eski kuralla biter');
  if (eskiId) {
    d = await satir(eskiId);
    ok('backfill: max_tur 16, eşik 5, secim_modu false, faz ban (eski akış)', d.max_tur === 16 && d.hakimiyet_esik === 5 && d.secim_modu === false && d.faz === 'ban', JSON.stringify([d.max_tur, d.hakimiyet_esik, d.faz]));
    await db.sorgu(`update duellolar set faz = 'sonuc', tur = 16, sahiplik = '{"a":"${A}","b":"${B}"}'::jsonb, yuva1 = 1, yuva2 = 1, faz_bitis = now() - interval '1 second' where id = '${eskiId}'`);
    await db.sorgu(`select duello2_ilerlet('${eskiId}')`);
    d = await satir(eskiId);
    ok('960 öncesi maç 16. tur sonunda biter (ayar 20 olsa da) → eşit, Altın Soru', d.uzatma === true, JSON.stringify([d.tur, d.uzatma]));
  } else {
    // 960 canlı: max_tur boş (çok eski) satır ayarı okur; satıra yazılmış 16 ise 16'da biter
    id = await yeniMac(A, B);
    await db.sorgu(`update duellolar set secim_modu = false, max_tur = 16, hakimiyet_esik = 5, faz = 'sonuc', tur = 16, secim_sira = 0,
                     sahiplik = '{"a":"${A}","b":"${B}"}'::jsonb, yuva1 = 1, yuva2 = 1, faz_bitis = now() - interval '1 second' where id = '${id}'`);
    await db.sorgu(`select duello2_ilerlet('${id}')`);
    d = await satir(id);
    ok('max_tur 16 yazılı maç 16. turda biter → Altın Soru', d.uzatma === true);
  }

  // ---------------------------------------------------------------- 11) kopukluk: seçim fazı da donar
  console.log('11) Kopukluk: seçim fazında da faz donar');
  id = await yeniMac(A, B, A);
  await db.sorgu(`update profiles set last_seen = now() - interval '5 minutes' where id = '${B}'`);
  await db.sorgu(`update duellolar set faz_bitis = now() - interval '1 second' where id = '${id}'`);
  await db.sorgu(`select duello2_ilerlet('${id}')`);
  d = await satir(id);
  ok('rakip kopukken seçim süresi dolsa da seçim yapılmaz (dondurma)', d.secim_sira === 0 && d.kopuk_at !== null, JSON.stringify([d.secim_sira, d.kopuk_at]));
  await db.sorgu(`update profiles set last_seen = now() where id = '${B}'`);

  // ---------------------------------------------------------------- 12) geri alma dosyası
  console.log('12) Geri alma dosyası (işlem içinde)');
  if (fs.existsSync(GERI)) {
    await db.sorgu('savepoint geri');
    await db.sorgu(fs.readFileSync(GERI, 'utf8'));
    id = await yeniMac(A, B);
    d = await satir(id);
    ok('geri alma → yeni maç eski akış (ban, eşik 5, 16 tur)', d.secim_modu === false && d.faz === 'ban' && d.hakimiyet_esik === 5 && d.max_tur === 16, JSON.stringify([d.faz, d.hakimiyet_esik, d.max_tur]));
    const ga = await ayarHepsi();
    ok('geri alma → ayarlar: secim_modu false, eşik 5, tur 16', ga.duello_secim_modu === 'false' && ga.duello_hakimiyet_esik === '5' && ga.duello_max_tur === '16');
    await db.sorgu('rollback to savepoint geri');
  } else ok('geri alma dosyası var', false);

  // ---------------------------------------------------------------- 13) simülasyon (yalnız 960 canlıyken)
  if (SIM > 0) {
    if (!canli) console.log('13) Simülasyon atlandı: 960 canlı değil (ALTER kilidi uzun süre tutulmasın)');
    else await simulasyon();
  }
} catch (e) {
  if (e.message !== 'ön kontrol: bekle') { kaldi++; console.error('HATA:', e.message); }
} finally {
  clearTimeout(bekci);
  await db.sorgu('rollback').catch(() => {});
  await db.kapat();
  if (YARIS && kaldi === 0) await yaris();
  // Artık oturum kalmadı mı? (ayrı bağlantıdan)
  try {
    const k = await new PgIstemci(dizgi).baglan();
    await new Promise((r) => setTimeout(r, 500));
    const artik = await k.tek(`select count(*)::text from pg_stat_activity where application_name = '${UYGULAMA}' and pid <> pg_backend_pid()`);
    await k.kapat();
    ok('pg_stat_activity: bu betiğin artık oturumu yok', artik === '0', artik);
  } catch (e) { console.log('  (oturum kontrolü yapılamadı:', e.message, ')'); }
  console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
  process.exit(kaldi ? 1 : process.exitCode ?? 0);
}

// ================================================================ simülasyon
// Gizli botlar birbirine karşı: seçim (bot seçimi) → her tur ban (bot) → kategori (890 bot) → iki cevap (bot isabeti)
// → çözüm → sonraki. Zaman beklenmez (fazlar doğrudan ilerletilir); jokerler kullanılmaz. Her maç SAVEPOINT içinde,
// sonunda ROLLBACK TO → kilitler maç başına bırakılır.
async function simulasyon() {
  console.log(`13) Simülasyon: ${SIM} bot-bot maçı (960 kuralı)`);
  const botlar = (await db.sorgu(`select id from profiles where is_bot and bot_turu = 'gizli' and coalesce(bot_aktif, true) order by md5(id::text) limit 40`)).map((x) => x.id);
  const m = { tur: [], nakavt: 0, altin: 0, ilkKazandi: 0, calma: [], bitti: 0, hata: 0 };
  const bas = Date.now();
  for (let i = 0; i < SIM; i++) {
    const a = botlar[(i * 2) % botlar.length], b = botlar[(i * 2 + 1) % botlar.length];
    await db.sorgu('savepoint m');
    try {
      const id = await tek(`select duello_olustur('${a}','${b}',false,null)`);
      for (let adim = 0; adim < 400; adim++) {
        const d = (await db.sorgu(`select faz, durum, saldiran, oyuncu1, oyuncu2, kategori, soru_id from duellolar where id = '${id}'`))[0];
        if (d.durum !== 'aktif') break;
        const savunan = d.saldiran === d.oyuncu1 ? d.oyuncu2 : d.oyuncu1;
        if (d.faz === 'secim') await db.sorgu(`select duello2_secim_uygula('${id}', duello2_bot_secim_kategori('${id}','${d.saldiran}'), false)`);
        else if (d.faz === 'ban') await db.sorgu(`select duello2_ban_bitir('${id}', duello2_bot_ban_kategori('${id}','${savunan}'))`);
        else if (d.faz === 'kategori') await db.sorgu(`select duello2_soru_ac('${id}', duello2_bot_kategori('${id}','${d.saldiran}'))`);
        else if (d.faz === 'cevap') {
          await db.sorgu(`select duello2_bot_cevap('${id}', o, (case when random() < bot_soru_isabet(o, x.kategori, x.soru_id) then q.dogru_cevap
                            else ((q.dogru_cevap + 1 + floor(random() * 3))::int % 4) end)::smallint)
                            from duellolar x join questions q on q.id = x.soru_id, unnest(array[x.oyuncu1, x.oyuncu2]) o where x.id = '${id}'`);
          await db.sorgu(`select duello2_cozumle('${id}')`);
        } else if (d.faz === 'sonuc') await db.sorgu(`select duello2_sonraki('${id}')`);
        else break;
      }
      const s = (await db.sorgu(`select durum, tur, uzatma, kazanan, ilk_secen, greatest(yuva1, yuva2) ust, hakimiyet_esik esik,
          (select count(*) from duello_hamleler h where h.duello_id = d.id and h.hakimiyet ->> 'eylem' = 'elinden_al' and (h.hakimiyet ->> 'tuttu')::boolean) calma
          from duellolar d where id = '${id}'`))[0];
      if (s.durum === 'bitti') {
        m.bitti++; m.tur.push(Number(s.tur)); m.calma.push(Number(s.calma));
        if (s.uzatma === 't') m.altin++; else if (Number(s.ust) >= Number(s.esik)) m.nakavt++;
        if (s.kazanan === s.ilk_secen) m.ilkKazandi++;
      }
    } catch (e) { m.hata++; if (m.hata < 3) console.log('   sim hata:', e.message); }
    await db.sorgu('rollback to savepoint m');
  }
  const ort = (x) => (x.length ? x.reduce((p, c) => p + c, 0) / x.length : 0);
  const yuzde = (n) => `%${Math.round((100 * n) / Math.max(1, m.bitti))}`;
  console.log(`   ${m.bitti}/${SIM} maç bitti (${Math.round((Date.now() - bas) / 1000)} sn, hata ${m.hata})`);
  console.log(`   ort tur ${ort(m.tur).toFixed(1)} (beklenen ~14) · nakavt ${yuzde(m.nakavt)} (~%60) · Altın Soru ${yuzde(m.altin)} (~%17)`);
  console.log(`   ilk seçen kazandı ${yuzde(m.ilkKazandi)} (~%51) · rakipten çalma ort ${ort(m.calma).toFixed(1)}/maç (~3)`);
  ok('simülasyon: maçlar hatasız bitti', m.bitti === SIM && m.hata === 0, `${m.bitti}/${SIM}, hata ${m.hata}`);
  ok('simülasyon: rakipten çalma > 0 (eski kuralda %100 maç 0)', ort(m.calma) > 0, String(ort(m.calma)));
}

// ================================================================ gerçek eşzamanlılık (960 canlıyken)
// Kayıtlı (commit) bir test maçı açılır; iki ayrı bağlantı AYNI anda seçim yapar. Biri satır kilidini tutarken öteki
// bekler; kilit bırakılınca ikinci istek güncel satırı görür ve reddedilir. Sonunda maç iptal edilir (takılı maç kalmaz).
async function yaris() {
  console.log('14) Gerçek eşzamanlılık (iki bağlantı)');
  const k0 = await new PgIstemci(dizgi).baglan();
  const k1 = await new PgIstemci(dizgi).baglan();
  const k2 = await new PgIstemci(dizgi).baglan();
  let id = null;
  const kur = async (k) => { await k.sorgu(`set application_name = '${UYGULAMA}'`); await k.sorgu("set statement_timeout = '20s'"); await k.sorgu("set lock_timeout = '10s'"); await k.sorgu("set idle_in_transaction_session_timeout = '30s'"); };
  try {
    for (const k of [k0, k1, k2]) await kur(k);
    const H = await k0.sorgu(`select id, takma_ad from profiles where takma_ad in ('ArayuzDenetim890', 'ArayuzDenetim648')`);
    const A = H.find((x) => x.takma_ad === 'ArayuzDenetim890').id;
    const B = H.find((x) => x.takma_ad === 'ArayuzDenetim648').id;
    if (Number(await k0.tek(`select count(*)::text from duellolar where durum = 'aktif' and (oyuncu1 in ('${A}','${B}') or oyuncu2 in ('${A}','${B}'))`))) throw new Error('test hesaplarının aktif düellosu var');
    await k0.sorgu(`update profiles set last_seen = now() where id in ('${A}','${B}')`);
    id = await k0.tek(`select duello_olustur('${A}','${B}',false,null)`);
    await k0.sorgu(`update duellolar set ilk_secen = '${A}', saldiran = '${A}', faz_bitis = now() + interval '30 seconds' where id = '${id}'`);
    const kat = (await k0.tek(`select (duello_kategorileri())[1]`));
    const ben2 = (k, u) => k.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
    // (a) aynı oyuncu aynı kategoriyi iki bağlantıdan aynı anda
    await k1.sorgu('begin'); await ben2(k1, A);
    await k2.sorgu('begin'); await ben2(k2, A);
    await k1.sorgu(`select duello_kategori_sec('${id}','${kat}')`);   // kilit k1'de
    const ikinci = k2.sorgu(`select duello_kategori_sec('${id}','${kat}')`).then(() => null, (e) => e.message);
    await new Promise((r) => setTimeout(r, 700));
    await k1.sorgu('commit');
    const h2 = await ikinci;
    await k2.sorgu('rollback');
    const s = (await k0.sorgu(`select secim_sira, jsonb_array_length(secimler) n, saldiran from duellolar where id = '${id}'`))[0];
    ok('yarış (a): ikinci eşzamanlı seçim kilidi bekleyip reddedildi, tek seçim yazıldı', h2 && /sırası sende değil|zaten alındı/.test(h2) && s.secim_sira === '1' && s.n === '1', `${h2} · ${JSON.stringify(s)}`);
    // (b) oyuncu seçimi ile süre dolumu (otomatik seçim) yarışı
    await k0.sorgu(`update duellolar set faz_bitis = now() + interval '1 second' where id = '${id}'`);
    await k1.sorgu('begin'); await ben2(k1, B);
    await k1.sorgu(`select duello_kategori_sec('${id}', (duello_kategorileri())[2])`);   // B seçti, kilit k1'de
    await new Promise((r) => setTimeout(r, 1200));                                         // süre doldu
    const oto = k2.sorgu(`select duello2_ilerlet('${id}')`).then(() => null, (e) => e.message);
    await new Promise((r) => setTimeout(r, 500));
    await k1.sorgu('commit');
    await oto;
    const s2 = (await k0.sorgu(`select secim_sira, secimler from duellolar where id = '${id}'`))[0];
    const sec = JSON.parse(s2.secimler);
    ok('yarış (b): B\'nin seçimi + bekleyen süre dolumu → çift kayıt yok, sıra tutarlı', sec.length === Number(s2.secim_sira) && sec[1]?.u === B && sec[1]?.oto === false
      && new Set(sec.map((x) => x.k)).size === sec.length, JSON.stringify(sec));
  } catch (e) { kaldi++; console.error('  yarış HATA:', e.message); }
  finally {
    for (const k of [k1, k2]) { try { await k.sorgu('rollback'); } catch { /* */ } }
    if (id) { try { await k0.sorgu(`update duellolar set durum = 'iptal', bitis = now() where id = '${id}' and durum = 'aktif'`); console.log('  test maçı iptal edildi'); } catch (e) { console.error('  iptal HATA', e.message); } }
    for (const k of [k0, k1, k2]) await k.kapat();
  }
}
