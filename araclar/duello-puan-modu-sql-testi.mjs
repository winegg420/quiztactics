// Düello 970 · YENİ PUAN VE KAZANMA KURALI — SQL provası.
// TEK transaction, sonunda ROLLBACK (canlıya iz bırakmaz). Kilit/oturum kuralı (Kasa 958 dersi):
//   · kısa lock_timeout + statement_timeout + idle_in_transaction_session_timeout, JS bekçisi (süre aşılırsa ROLLBACK + kapat),
//   · bitince pg_stat_activity'de bu betiğin artık oturumu kalmadığı ölçülür, testler SIRAYLA koşar.
//
// Sınar: kendi kategorisine saldırı reddi (RPC + iç yol + ban) · 4 puan senaryosu (puan + sahiplik + neden) · Baskın / Kalkan ·
// kilit (+ hepsi kilitliyse kilit yok sayılır) · 12 puanla bitiş · 4 kategoriyle bitiş · aynı turda ikisi → Altın Soru ·
// son tur (eşit → Altın Soru, fark → kazanan) · Altın Soru çözümü · geri alınan kategori sayımdan düşer · durum() şekli ·
// bot saldırı/ban yalnız rakibin / kendi kategorisi · bot vs insan tam maç · bayrak "eski" → 960 hâkimiyet aynen ·
// yetkiler (yeni iç fonksiyonlar kapalı) · migration kapsamı (md5: yalnız hedef fonksiyonlar).
// --sim N (970 canlıyken): bot-bot N maç, maç başına ayrı kısa işlem + ROLLBACK.
// --yaris (970 canlıyken): GERÇEK eşzamanlılık — iki bağlantı aynı anda cevap verir, tur tek kez çözülür (kayıtlı test maçı, sonunda iptal).
//
// Kullanım: node araclar/duello-puan-modu-sql-testi.mjs [--zorla] [--sim 40] [--yaris]
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';

const ZORLA = process.argv.includes('--zorla');
const YARIS = process.argv.includes('--yaris');
const simI = process.argv.indexOf('--sim');
const SIM = simI > 0 ? Number(process.argv[simI + 1] || 40) : 0;
const MIG = new URL('../supabase/migrations/20260612000970_duello_puan_modu.sql', import.meta.url);
const GERI = new URL('../docs/duello-geri-alma-puan.sql', import.meta.url);
const HEDEF_FN = ['duello_olustur', 'duello2_kategori_uygun_mu', 'duello2_otomatik_kategori', 'duello2_cozumle', 'duello2_sonraki',
  'duello2_bot_kategori', 'duello2_bot_ban_kategori', 'duello2_durum'];
const YENI_FN = ['duello_puan_modu_acik', 'duello2_puan_alinan', 'duello2_puan_hedefler'];
const UYGULAMA = 'duello-puan-modu-sql-testi';
// --ek-mig <dosya>: 970'ten sonraki bir migration'ı (ör. 982 ban kaldırma) işlem içinde uygular; tur 2 kontrolleri
// maç satırındaki ban_acik'a göre (ban açık / kapalı iki akış da sınanır).
const ekI = process.argv.indexOf('--ek-mig');
const EK_MIG = ekI > 0 ? process.argv[ekI + 1] : null;

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
}, (SIM ? 25 : 8) * 60 * 1000);

const md5Hepsi = async () => Object.fromEntries((await db.sorgu(`select p.oid::regprocedure::text imza, md5(pg_get_functiondef(p.oid)) h
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f'`)).map((x) => [x.imza, x.h]));
const ayarHepsi = async () => Object.fromEntries((await db.sorgu(`select anahtar, deger::text d from oyun_ayarlari`)).map((x) => [x.anahtar, x.d]));

let canli = false;
try {
  await db.sorgu(`set application_name = '${UYGULAMA}'`);
  console.log('0) Ön kontrol (salt okunur)');
  const on = (await db.sorgu(`select (select count(*) from duellolar where durum = 'aktif')::text duello,
      (select count(*) from matches where durum = 'aktif')::text mac, (select count(*) from kasa_maclari where durum = 'aktif')::text kasa`))[0];
  console.log('  ', JSON.stringify(on));
  if ((Number(on.mac) + Number(on.duello) + Number(on.kasa) > 0) && !ZORLA) {
    console.log('  ⏸ BEKLE: aktif oyun var (--zorla ile atlanır)'); process.exitCode = 2; throw new Error('ön kontrol: bekle');
  }
  canli = (await tek(`select count(*)::text from information_schema.columns where table_name = 'duellolar' and column_name = 'puan_modu'`)) === '1';
  console.log(`  970 canlıda: ${canli ? 'EVET' : 'hayır (işlem içinde uygulanacak)'}`);

  await db.sorgu('begin');
  await db.sorgu("set local lock_timeout = '3s'");
  await db.sorgu("set local statement_timeout = '30s'");
  await db.sorgu("set local idle_in_transaction_session_timeout = '60s'");

  const H = await db.sorgu(`select id, takma_ad from profiles where takma_ad in ('ArayuzDenetim890', 'ArayuzDenetim648')`);
  const A = H.find((x) => x.takma_ad === 'ArayuzDenetim890')?.id;
  const B = H.find((x) => x.takma_ad === 'ArayuzDenetim648')?.id;
  const BOTS = (await db.sorgu(`select id from profiles where is_bot and bot_turu = 'gizli' and coalesce(bot_aktif, true) order by bot_seviye_puan nulls last, id limit 2`)).map((x) => x.id);
  const BOT = BOTS[0];
  if (!A || !B || !BOT) throw new Error('test hesapları bulunamadı');
  console.log(`  A=${A} B=${B} bot=${BOT}`);
  await db.sorgu(`update duellolar set durum = 'iptal' where durum = 'aktif' and (oyuncu1 in ('${A}','${B}','${BOT}') or oyuncu2 in ('${A}','${B}','${BOT}'))`);
  await db.sorgu(`update profiles set last_seen = now() where id in ('${A}','${B}')`);
  const hizSifirla = () => db.sorgu(`delete from rpc_sayac where user_id in ('${A}','${B}')`);   // işlem içinde now() sabit; sayaç birikmesin

  const md5Once = await md5Hepsi();
  const ayarOnce = await ayarHepsi();
  if (!canli) {
    await db.sorgu(fs.readFileSync(MIG, 'utf8'));
    console.log('  migration 970 işlem içinde uygulandı');
    await db.sorgu("set local lock_timeout = '3s'");
    await db.sorgu("set local statement_timeout = '30s'");
  }

  if (EK_MIG) {
    await db.sorgu(fs.readFileSync(EK_MIG, 'utf8'));
    console.log(`  ek migration işlem içinde uygulandı: ${EK_MIG}`);
    await db.sorgu("set local lock_timeout = '3s'");
    await db.sorgu("set local statement_timeout = '30s'");
  }

  console.log('1) Migration kapsamı + ayarlar');
  if (!canli) {
    const md5Sonra = await md5Hepsi();
    const degisen = Object.keys(md5Sonra).filter((k) => md5Once[k] !== md5Sonra[k]).map((k) => k.replace(/\(.*/, '')).sort();
    ok('değişen/yeni fonksiyonlar yalnız hedef liste', JSON.stringify(degisen) === JSON.stringify([...HEDEF_FN, ...YENI_FN].sort()), JSON.stringify(degisen));
    ok('hiçbir fonksiyon silinmedi', Object.keys(md5Once).every((k) => k in md5Sonra));
    const ayarSonra = await ayarHepsi();
    const fark = Object.keys({ ...ayarOnce, ...ayarSonra }).filter((k) => ayarOnce[k] !== ayarSonra[k]).sort();
    ok('yeni ayarlar yalnız 4 puan ayarı, mevcutlar aynı', JSON.stringify(fark) === JSON.stringify(['duello_puan_hedef', 'duello_puan_kategori_yolu', 'duello_puan_max_tur', 'duello_puan_modu']), JSON.stringify(fark));
  } else console.log('  (970 canlıda — kapsam karşılaştırması uygulama öncesi koşuda yapıldı)');
  const ay = await ayarHepsi();
  ok('ayarlar: puan_modu "yeni" · hedef 12 · kategori yolu 4 · tur 20', ay.duello_puan_modu === '"yeni"' && ay.duello_puan_hedef === '12'
    && ay.duello_puan_kategori_yolu === '4' && ay.duello_puan_max_tur === '20', JSON.stringify([ay.duello_puan_modu, ay.duello_puan_hedef]));

  console.log('2) Yetkiler');
  const acl = await db.sorgu(`select p.proname, coalesce(p.proacl::text, '') a from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = any(array[${[...YENI_FN, 'duello_kategori_sec', 'duello2_kategori_uygun_mu', 'duello2_cozumle'].map((x) => `'${x}'`).join(',')}])`);
  const aclOf = (n) => acl.find((x) => x.proname === n)?.a ?? '';
  ok('yeni iç fonksiyonlar anon/authenticated/public\'e kapalı', YENI_FN.every((n) => aclOf(n) && !/(^|[{,])(anon|authenticated)?=X/.test(aclOf(n))), JSON.stringify(acl));
  ok('istemci yolu değişmedi: duello_kategori_sec authenticated, cozumle istemciye kapalı',
    /authenticated=X/.test(aclOf('duello_kategori_sec')) && !/authenticated=X/.test(aclOf('duello2_cozumle')));

  // ---------------------------------------------------------------- yardımcılar
  const K = await json(`select to_json(duello_kategorileri())::text`);
  const satir = (id) => json(`select row_to_json(x)::text from duellolar x where id = '${id}'`);
  const sureDoldur = async (id) => { await db.sorgu(`update duellolar set faz_bitis = now() - interval '1 second' where id = '${id}'`); await db.sorgu(`select duello2_ilerlet('${id}')`); return satir(id); };
  // Sonuç fazından sonraki tura: ban fazı açıldıysa (982 öncesi maç / bayrak açık) süresi dolsun → kategori.
  const sonrakiTur = async (id) => { let d = await sureDoldur(id); if (d.faz === 'ban') d = await sureDoldur(id); return d; };
  // Maç: oyuncu1 = p1 (ilk saldıran), ilk seçen p2; seçim: p1 → K[0..4], p2 → K[5..9]; tur 1 banı boş geçer → faz kategori.
  const kur = async (p1, p2) => {
    const id = await tek(`select duello_olustur('${p1}','${p2}',false,null)`);
    await db.sorgu(`update duellolar set oyuncu1 = oyuncu2, oyuncu2 = oyuncu1, profil1 = profil2, profil2 = profil1 where id = '${id}' and oyuncu1 <> '${p1}'`);
    await db.sorgu(`update duellolar set ilk_secen = '${p2}', saldiran = '${p2}' where id = '${id}'`);
    const liste = { [p1]: K.slice(0, 5), [p2]: K.slice(5, 10) };
    for (let i = 0; i < 10; i++) {
      const s = await tek(`select saldiran::text from duellolar where id = '${id}'`);
      await db.sorgu(`select duello2_secim_uygula('${id}', '${liste[s].shift()}', false)`);
    }
    await db.sorgu(`select duello2_ban_bitir('${id}', null)`);
    return id;
  };
  const dc = (id) => tek(`select q.dogru_cevap::text from duellolar d join questions q on q.id = d.soru_id where d.id = '${id}'`).then(Number);
  const cevapla = async (id, u, dogru) => { const c = await dc(id); await ben(u); await db.sorgu(`select duello_cevap('${id}', ${dogru ? c : (c + 1) % 4}::smallint)`); };
  const saldir = async (id, u, k) => { await ben(u); return hata(`select duello_kategori_sec('${id}', '${k}')`); };
  const tur = async (id, sal, sav, k, dSal, dSav) => {
    const h = await saldir(id, sal, k);
    if (h) return h;
    await cevapla(id, sal, dSal); await cevapla(id, sav, dSav);
    return null;
  };
  const sonHk = async (id) => (await satir(id)).son_hamle?.hakimiyet ?? {};

  // ---------------------------------------------------------------- 3) açılış + kendi kategorisine saldırı reddi
  console.log('3) Açılış + saldırı kısıtı');
  await hizSifirla();
  let id = await kur(A, B);
  let d = await satir(id);
  ok('maç satırı: puan_modu true · hedef 12 · yol 4 · max_tur 20 · 5-5 · 0-0 · faz kategori · saldıran A',
    d.puan_modu === true && d.puan_hedef === 12 && d.kategori_yolu === 4 && d.max_tur === 20 && d.yuva1 === 5 && d.yuva2 === 5
    && d.puan1 === 0 && d.puan2 === 0 && d.faz === 'kategori' && d.saldiran === A, JSON.stringify([d.puan_modu, d.puan_hedef, d.faz, d.yuva1]));
  await ben(A);
  let dur = await json(`select duello_durum('${id}')::text`);
  ok('durum.uygun_kategoriler = yalnız rakibin 5 kategorisi', JSON.stringify(dur.uygun_kategoriler) === JSON.stringify(K.slice(5, 10)), JSON.stringify(dur.uygun_kategoriler));
  ok('durum.puan: acik · hedef 12 · yol 4 · 0-0 · alinan 0-0 · baslangic 10', dur.puan?.acik === true && dur.puan.hedef === 12 && dur.puan.kategori_yolu === 4
    && dur.puan.puanlar[A] === 0 && dur.puan.alinan[B] === 0 && Object.keys(dur.puan.baslangic).length === 10 && dur.puan.baslangic[K[0]] === A, JSON.stringify(dur.puan));
  let h = await saldir(id, A, K[0]);
  ok('kendi kategorisine saldırı RPC\'de reddedilir', h && /seçilemez/.test(h), h);
  ok('iç kapı: duello2_kategori_uygun_mu(kendi) false, (rakip) true',
    (await tek(`select duello2_kategori_uygun_mu('${id}', '${K[1]}')::text`)) === 'false' && (await tek(`select duello2_kategori_uygun_mu('${id}', '${K[6]}')::text`)) === 'true');
  let oto = new Set();
  for (let i = 0; i < 12; i++) oto.add(await tek(`select duello2_otomatik_kategori('${id}')`));
  ok('süre dolumu (otomatik) yalnız rakibin kategorisini seçer', [...oto].every((k) => K.slice(5).includes(k)), [...oto].join(','));

  // ---------------------------------------------------------------- 4) dört senaryo + Baskın/Kalkan + kilit
  console.log('4) Dört puan senaryosu');
  h = await tur(id, A, B, K[5], true, false);
  d = await satir(id); let x = d.son_hamle.hakimiyet;
  ok('S1 saldıran doğru + savunan yanlış → A +2 ve kategoriyi alır (2-0)', !h && d.faz === 'sonuc' && d.puan1 === 2 && d.puan2 === 0 && d.sahiplik[K[5]] === A
    && x.tuttu === true && x.kazanilan[A] === 2 && x.kazanilan[B] === 0 && x.alinan[A] === 1 && x.puanlar[A] === 2, h || JSON.stringify([d.puan1, d.puan2, x]));
  ok('S1 kilit: alınan kategori 2 tur kilitli', Number(d.kilitler[K[5]]) === d.tur + 2, JSON.stringify(d.kilitler));
  ok('sonuç fazında maç sürüyor (hedefe uzak)', d.durum === 'aktif');
  d = await sureDoldur(id);
  const banAcik = d.ban_acik !== false;   // 982: maç satırına sabit (kolon yok / null = eski kural, açık)
  console.log(`   (bu maçta ban ${banAcik ? 'AÇIK' : 'KAPALI'})`);
  ok(`tur 2: B saldırır, ${banAcik ? 'ban' : 'kategori'} fazı`, d.tur === 2 && d.saldiran === B && d.faz === (banAcik ? 'ban' : 'kategori'), JSON.stringify([d.tur, d.faz]));
  await ben(A);
  dur = await json(`select duello_durum('${id}')::text`);
  if (!banAcik) {
    ok('ban kapalı: durum.ban.acik false, uygun liste yok', dur.ban?.acik === false && !dur.ban?.uygun, JSON.stringify(dur.ban));
    h = await hata(`select duello_ban_sec('${id}', '${K[4]}')`);
    ok('ban kapalı: duello_ban_sec reddeder', h && /ban yok/.test(h), h);
  } else {
  ok('ban.uygun (savunan A) yalnız A\'nın kilitsiz kategorileri', JSON.stringify(dur.ban.uygun) === JSON.stringify(K.slice(0, 5)), JSON.stringify(dur.ban.uygun));
  h = await hata(`select duello_ban_sec('${id}', '${K[6]}')`);
  ok('savunan saldıranın kategorisini banlayamaz', h && /banlanamaz/.test(h), h);
  h = await hata(`select duello_ban_sec('${id}', '${K[4]}')`);
  ok('savunan kendi kategorisini banlar → faz kategori', !h && (await satir(id)).faz === 'kategori', h);
  }
  h = await saldir(id, B, K[6]);
  ok('B kendi kategorisine saldıramaz', h && /seçilemez/.test(h), h);
  h = await saldir(id, B, K[5]);
  ok('B kilitli (yeni alınan) kategoriye saldıramaz', h && /seçilemez/.test(h), h);
  if (banAcik) {
    h = await saldir(id, B, K[4]);
    ok('B banlı kategoriye saldıramaz', h && /seçilemez/.test(h), h);
  }
  h = await tur(id, B, A, K[0], true, true);
  d = await satir(id); x = d.son_hamle.hakimiyet;
  ok('S2 ikisi doğru → +1/+1, el değişmez (3-1)', !h && d.puan1 === 3 && d.puan2 === 1 && d.sahiplik[K[0]] === A && x.neden === 'ikisi_dogru'
    && x.kazanilan[A] === 1 && x.kazanilan[B] === 1, h || JSON.stringify([d.puan1, d.puan2, x.neden]));
  await sonrakiTur(id);   // tur 3 ban boş → kategori
  h = await tur(id, A, B, K[6], false, true);
  d = await satir(id); x = d.son_hamle.hakimiyet;
  ok('S3 saldıran yanlış + savunan doğru → B +1, el değişmez (3-2)', !h && d.puan1 === 3 && d.puan2 === 2 && d.sahiplik[K[6]] === B && x.neden === 'saldiran_yanlis'
    && x.kazanilan[B] === 1 && x.kazanilan[A] === 0, h || JSON.stringify([d.puan1, d.puan2, x.neden]));
  ok('S3 el değişmeyen hamlede kilit yok', !(K[6] in (d.kilitler ?? {})) || Number(d.kilitler[K[6]]) < d.tur, JSON.stringify(d.kilitler));
  await sonrakiTur(id);
  await hizSifirla();
  h = await tur(id, B, A, K[1], false, false);
  d = await satir(id); x = d.son_hamle.hakimiyet;
  ok('S4 ikisi yanlış → kimse puan almaz (3-2), el değişmez', !h && d.puan1 === 3 && d.puan2 === 2 && d.sahiplik[K[1]] === A && x.neden === 'ikisi_yanlis', h || JSON.stringify([d.puan1, d.puan2]));

  console.log('5) Baskın / Kalkan');
  // Rol jokerleri sette olmalı (joker kaydı tetikleyicisi seti denetler) — işlem içinde, ROLLBACK ile geri döner.
  await db.sorgu(`insert into oyuncu_skill_setleri (user_id, skiller, skiller_duello) values ('${A}', '{}', '{baskin,kalkan,elli}')
    on conflict (user_id) do update set skiller_duello = '{baskin,kalkan,elli}'`);
  await db.sorgu(`insert into oyuncu_skill_setleri (user_id, skiller, skiller_duello) values ('${A}', '{}', '{baskin,kalkan,elli}') on conflict (user_id) do update set skiller_duello = '{baskin,kalkan,elli}'`);   // işlem içinde (ROLLBACK)
  await sonrakiTur(id);   // tur 5, A saldırır
  h = await saldir(id, A, K[7]);
  d = await satir(id);
  await db.sorgu(`insert into joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz) values ('${A}', 'duello', '${id}', ${d.tur * 2 + d.saldiri_sirasi}, 'baskin', true)`);
  await cevapla(id, A, true); await cevapla(id, B, true);
  d = await satir(id); x = d.son_hamle.hakimiyet;
  ok('Baskın: ikisi doğru ama savunanın cevabı sayılmaz → A +2 alır, B 0 (5-2)', !h && d.puan1 === 5 && d.puan2 === 2 && d.sahiplik[K[7]] === A && x.neden === 'baskin'
    && x.kazanilan[B] === 0, h || JSON.stringify([d.puan1, d.puan2, x.neden]));
  await sonrakiTur(id);   // tur 6, B saldırır
  h = await saldir(id, B, K[2]);
  d = await satir(id);
  await db.sorgu(`insert into joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz) values ('${A}', 'duello', '${id}', ${d.tur * 2 + d.saldiri_sirasi}, 'kalkan', true)`);
  await cevapla(id, B, true); await cevapla(id, A, false);
  d = await satir(id); x = d.son_hamle.hakimiyet;
  ok('Kalkan: saldıran doğru + savunan yanlış ama kategori el değiştirmez, B yalnız +1 (5-3)', !h && d.puan1 === 5 && d.puan2 === 3 && d.sahiplik[K[2]] === A
    && x.neden === 'kalkan' && x.kazanilan[B] === 1, h || JSON.stringify([d.puan1, d.puan2, x.neden]));
  const hamleSay = Number(await tek(`select count(*)::text from duello_hamleler where duello_id = '${id}'`));
  ok('her tur tek hamle kaydı (6 tur → 6 kayıt)', hamleSay === 6, String(hamleSay));
  ok('hiçbir hamle saldıranın kendi kategorisine değil', (await tek(`select count(*)::text from duello_hamleler where duello_id = '${id}' and hakimiyet ->> 'sahip_once' = saldiran::text`)) === '0');

  console.log('6) Hepsi kilitliyse kilit yok sayılır');
  await sonrakiTur(id);   // tur 7, A saldırır
  d = await satir(id);
  await db.sorgu(`update duellolar set kilitler = kilitler || (select jsonb_object_agg(e.key, ${d.tur + 2}) from jsonb_each_text(sahiplik) e where e.value = '${B}') where id = '${id}'`);
  const hedef = await json(`select to_json(duello2_puan_hedefler('${id}'))::text`);
  ok('savunanın bütün kategorileri kilitli → hedefler yine savunanın kategorileri', hedef.length > 0 && hedef.every((k) => d.sahiplik[k] === B), JSON.stringify(hedef));
  h = await saldir(id, A, K[0]);
  ok('…ve kendi kategorisi yine reddedilir', h && /seçilemez/.test(h), h);
  await db.sorgu(`update duellolar set durum = 'iptal' where id = '${id}'`);

  // ---------------------------------------------------------------- 7) bitişler
  console.log('7) Kazanma');
  await hizSifirla();
  id = await kur(A, B);
  await db.sorgu(`update duellolar set puan1 = 11, puan2 = 4 where id = '${id}'`);
  await tur(id, A, B, K[5], true, false);
  d = await satir(id);
  ok('12 puan: 11 + 2 = 13 → sonuç fazı gösterilir, maç henüz bitmedi', d.puan1 === 13 && d.faz === 'sonuc' && d.durum === 'aktif');
  d = await sureDoldur(id);
  ok('12 puan: sonuç fazından sonra A kazanır', d.durum === 'bitti' && d.kazanan === A && !d.uzatma, JSON.stringify([d.durum, d.kazanan === A]));
  await ben(A);
  dur = await json(`select duello_durum('${id}')::text`);
  ok('bitti: durum.puan 13 · gecmis hamlede hakimiyet.kazanilan', dur.puan.puanlar[A] === 13 && dur.gecmis?.at(-1)?.hakimiyet?.kazanilan?.[A] === 2, JSON.stringify(dur.puan));

  await hizSifirla();
  id = await kur(A, B);
  await db.sorgu(`update duellolar set sahiplik = sahiplik || '{"${K[5]}":"${A}","${K[6]}":"${A}","${K[7]}":"${A}"}'::jsonb, yuva1 = 8, yuva2 = 2, puan1 = 6, puan2 = 6 where id = '${id}'`);
  ok('alinan sayımı: A 3 (B\'nin başlangıcından)', (await tek(`select duello2_puan_alinan(secimler, sahiplik, '${A}')::text from duellolar where id = '${id}'`)) === '3');
  await tur(id, A, B, K[8], true, false);
  d = await sureDoldur(id);
  ok('4 kategori: B\'nin başlangıçtaki 4 kategorisini tutan A kazanır (puan 8 < 12)', d.durum === 'bitti' && d.kazanan === A && d.puan1 === 8, JSON.stringify([d.durum, d.puan1]));

  await hizSifirla();
  id = await kur(A, B);
  await db.sorgu(`update duellolar set sahiplik = sahiplik || '{"${K[5]}":"${A}","${K[6]}":"${A}","${K[7]}":"${A}"}'::jsonb, puan1 = 3, puan2 = 3 where id = '${id}'`);
  ok('geri alınan kategori sayımdan düşer (A 3 → B geri alınca 2)', (await tek(`select duello2_puan_alinan(secimler, sahiplik || '{"${K[7]}":"${B}"}'::jsonb, '${A}')::text from duellolar where id = '${id}'`)) === '2');
  ok('A\'nın kendi kategorisini geri alması A\'nın sayımına girmez', (await tek(`select duello2_puan_alinan(secimler, sahiplik || '{"${K[0]}":"${A}"}'::jsonb, '${A}')::text from duellolar where id = '${id}'`)) === '3');
  await db.sorgu(`update duellolar set durum = 'iptal' where id = '${id}'`);

  await hizSifirla();
  id = await kur(A, B);
  await db.sorgu(`update duellolar set puan1 = 11, puan2 = 11 where id = '${id}'`);
  await tur(id, A, B, K[5], true, true);
  d = await sureDoldur(id);
  ok('aynı turda ikisi 12 → Altın Soru (uzatma, faz cevap)', d.durum === 'aktif' && d.uzatma === true && d.faz === 'cevap' && d.puan1 === 12 && d.puan2 === 12, JSON.stringify([d.durum, d.uzatma, d.faz]));
  await ben(A);
  h = await hata(`select duello2_skill_hak_kontrol('${id}', '${A}', 'elli')`);
  ok('Altın Soru jokersiz', h && /Altın Soru/.test(h), h);
  const sal = d.saldiran, sav = sal === A ? B : A;
  await cevapla(id, sal, false); await cevapla(id, sav, true);
  d = await sureDoldur(id);
  ok('Altın Soru: yalnız bilen kazanır', d.durum === 'bitti' && d.kazanan === sav, JSON.stringify([d.durum, d.kazanan === sav]));

  await hizSifirla();
  id = await kur(A, B);
  await db.sorgu(`update duellolar set puan1 = 11, puan2 = 10, sahiplik = sahiplik || '{"${K[5]}":"${A}","${K[6]}":"${A}","${K[7]}":"${A}"}'::jsonb where id = '${id}'`);
  await tur(id, A, B, K[8], true, false);   // A: 13 puan + 4. kategori → yalnız A
  d = await sureDoldur(id);
  ok('aynı oyuncu iki yolu birden → o kazanır (Altın Soru yok)', d.durum === 'bitti' && d.kazanan === A && !d.uzatma);

  await hizSifirla();
  id = await kur(A, B);
  await db.sorgu(`update duellolar set tur = 20, saldiran = oyuncu2, saldiri_sirasi = 1, puan1 = 5, puan2 = 5 where id = '${id}'`);
  await tur(id, B, A, K[0], false, false);
  d = await sureDoldur(id);
  ok('son tur (20) puan eşit → Altın Soru', d.durum === 'aktif' && d.uzatma === true, JSON.stringify([d.durum, d.uzatma]));
  await db.sorgu(`update duellolar set durum = 'iptal' where id = '${id}'`);
  await hizSifirla();
  id = await kur(A, B);
  await db.sorgu(`update duellolar set tur = 20, saldiran = oyuncu2, saldiri_sirasi = 1, puan1 = 7, puan2 = 6 where id = '${id}'`);
  await tur(id, B, A, K[0], false, false);
  d = await sureDoldur(id);
  ok('son tur (20) puanı çok olan kazanır (7-6)', d.durum === 'bitti' && d.kazanan === A, JSON.stringify([d.durum, d.kazanan === A]));
  await hizSifirla();
  id = await kur(A, B);
  await db.sorgu(`update duellolar set sahiplik = sahiplik || '{"${K[5]}":"${A}"}'::jsonb, puan1 = 2 where id = '${id}'`);
  await tur(id, A, B, K[6], true, false);   // A 7 yuvaya çıkar (yuva sahiplikten sayılır) ama puan modunda yuva eşiği yok
  d = await sureDoldur(id);
  ok('puan modunda "7 yuva" eşiği yok (yuva 8, maç sürer)', d.durum === 'aktif' && d.yuva1 >= 7, JSON.stringify([d.durum, d.yuva1]));
  await db.sorgu(`update duellolar set durum = 'iptal' where id = '${id}'`);

  // ---------------------------------------------------------------- 8) bot
  console.log('8) Bot');
  id = await kur(BOT, A);   // bot saldırır
  const botSecim = new Set();
  for (let i = 0; i < 30; i++) botSecim.add(await tek(`select duello2_bot_kategori('${id}', '${BOT}')`));
  ok('bot saldırısı 30/30 yalnız rakibin kategorisi', [...botSecim].every((k) => K.slice(5).includes(k)), [...botSecim].join(','));
  await db.sorgu(`update duellolar set puan2 = 11 where id = '${id}'`);   // rakip hedefe yakın → en değerli hamle (rastgelelik yok)
  const kritik = new Set();
  for (let i = 0; i < 10; i++) kritik.add(await tek(`select duello2_bot_kategori('${id}', '${BOT}')`));
  ok('rakip bitişe yakınken bot hep en değerli hamleyi seçer (tek seçim)', kritik.size === 1, [...kritik].join(','));
  await db.sorgu(`update duellolar set saldiran = oyuncu2, saldiri_sirasi = 1, tur = 2, faz = 'ban' where id = '${id}'`);   // A saldırır, bot banlar
  const banlar = new Set();
  for (let i = 0; i < 20; i++) banlar.add(await tek(`select duello2_bot_ban_kategori('${id}', '${BOT}')`));
  ok('bot banı yalnız kendi (saldırıya açık) kategorisi', [...banlar].every((k) => K.slice(0, 5).includes(k)), [...banlar].join(','));
  await db.sorgu(`update duellolar set durum = 'iptal' where id = '${id}'`);

  console.log('9) Bot vs insan tam maç (insan RPC ile, bot iç yolla)');
  await hizSifirla();
  id = await kur(A, BOT);
  let adim = 0, kendine = 0, hataSay = 0, banFaz = 0;
  while (adim++ < 400) {
    d = await satir(id);
    if (d.durum !== 'aktif') break;
    const sav = d.saldiran === A ? BOT : A;
    if (adim % 25 === 0) await hizSifirla();
    if (d.faz === 'ban') {
      banFaz++;
      if (sav === BOT) await db.sorgu(`select duello2_ban_bitir('${id}', duello2_bot_ban_kategori('${id}', '${BOT}'))`);
      else { await sureDoldur(id); }
    } else if (d.faz === 'kategori') {
      if (d.saldiran === BOT) await db.sorgu(`select duello2_soru_ac('${id}', duello2_bot_kategori('${id}', '${BOT}'))`);
      else {
        const rk = Object.entries(d.sahiplik).filter(([, u]) => u === BOT).map(([k]) => k);
        const uy = await json(`select to_json(duello2_puan_hedefler('${id}'))::text`);
        const k = uy[adim % uy.length];
        if (await saldir(id, A, k)) hataSay++;
        if (!rk.includes(k)) kendine++;
      }
    } else if (d.faz === 'cevap') {
      const c = await dc(id);
      if (!(d.cevaplar && d.cevaplar[A])) { await ben(A); await db.sorgu(`select duello_cevap('${id}', ${Math.random() < 0.6 ? c : (c + 1) % 4}::smallint)`); }
      d = await satir(id);
      if (d.faz === 'cevap' && !(d.cevaplar && d.cevaplar[BOT])) {
        await db.sorgu(`select duello2_bot_cevap('${id}', '${BOT}', (case when random() < bot_soru_isabet('${BOT}', kategori, soru_id) then ${c} else ${(c + 2) % 4} end)::smallint) from duellolar where id = '${id}'`);
      }
      await db.sorgu(`select duello2_ilerlet('${id}')`);
    } else if (d.faz === 'sonuc') await sureDoldur(id);
    else break;
  }
  d = await satir(id);
  const top = (await db.sorgu(`select coalesce(sum(case when saldiran = '${A}' then puan_saldiran else puan_savunan end) filter (where not uzatma), 0)::int a,
      coalesce(sum(case when saldiran = '${BOT}' then puan_saldiran else puan_savunan end) filter (where not uzatma), 0)::int b,
      count(*) filter (where hakimiyet ->> 'sahip_once' = saldiran::text)::int kendi from duello_hamleler where duello_id = '${id}'`))[0];
  const neden = d.uzatma ? 'altın' : (d.puan1 >= 12 || d.puan2 >= 12) ? 'puan' : 'kategori/tur';
  console.log(`   bitiş: tur ${d.tur} · ${d.puan1}-${d.puan2} · ${neden}`);
  ok('bot vs insan maçı bitti, insan hep rakip kategorisine saldırdı, hata yok', d.durum === 'bitti' && kendine === 0 && hataSay === 0, JSON.stringify([d.durum, kendine, hataSay]));
  ok(`bot vs insan: ban fazı ${banAcik ? 'açılabilir' : 'HİÇ açılmadı'} (maç satırı ban_acik)`, banAcik || banFaz === 0, String(banFaz));
  ok('hamle puanları toplamı = satır puanı, kendi kategorisine hamle 0', Number(top.a) === d.puan1 && Number(top.b) === d.puan2 && Number(top.kendi) === 0, JSON.stringify(top));

  // ---------------------------------------------------------------- 10) bayrak eski
  console.log('10) Bayrak "eski" → 960 hâkimiyet');
  await db.sorgu(`update oyun_ayarlari set deger = '"eski"'::jsonb where anahtar = 'duello_puan_modu'`);
  await hizSifirla();
  id = await kur(A, B);
  d = await satir(id);
  ok('eski: puan_modu false · eşik 7 · tur 20', d.puan_modu === false && d.hakimiyet_esik === 7 && d.max_tur === 20, JSON.stringify([d.puan_modu, d.hakimiyet_esik]));
  await ben(A);
  dur = await json(`select duello_durum('${id}')::text`);
  ok('eski: durum.puan kapalı, uygun kategoriler 10 (kendi dahil)', dur.puan?.acik === false && dur.uygun_kategoriler.length === 10, JSON.stringify([dur.puan, dur.uygun_kategoriler.length]));
  h = await tur(id, A, B, K[0], true, false);
  d = await satir(id); x = d.son_hamle.hakimiyet;
  ok('eski: kendi kategorisi pekiştirilir, puan yok', !h && x.eylem === 'pekistir' && x.tuttu === true && d.puan1 === 0 && d.puan2 === 0 && x.puan_modu === undefined, h || JSON.stringify(x));
  await sonrakiTur(id);
  await db.sorgu(`update duellolar set yuva1 = 6, yuva2 = 4, sahiplik = sahiplik || '{"${K[5]}":"${A}"}'::jsonb where id = '${id}'`);
  await db.sorgu(`update duellolar set tur = 3, saldiran = oyuncu1, saldiri_sirasi = 0 where id = '${id}'`);
  h = await tur(id, A, B, K[6], true, false);
  d = await sureDoldur(id);
  ok('eski: 7 yuvaya ulaşan kazanır', !h && d.durum === 'bitti' && d.kazanan === A && d.yuva1 === 7, h || JSON.stringify([d.durum, d.yuva1]));
  await db.sorgu(`update oyun_ayarlari set deger = '"yeni"'::jsonb where anahtar = 'duello_puan_modu'`);
  id = await kur(A, B);
  ok('bayrak "yeni"ye dönünce yeni maç yine puan modunda', (await satir(id)).puan_modu === true);
  await db.sorgu(`update duellolar set durum = 'iptal' where id = '${id}'`);

  ok('geri alma dosyası var', fs.existsSync(GERI));
} catch (e) {
  if (e.message !== 'ön kontrol: bekle') { kaldi++; console.error('HATA:', e.message); }
} finally {
  clearTimeout(bekci);
  await db.sorgu('rollback').catch(() => {});
  if (SIM > 0 && canli && kaldi === 0) await simulasyon().catch((e) => { kaldi++; console.error('sim HATA', e.message); });
  else if (SIM > 0) console.log('11) Simülasyon atlandı (970 canlı değil ya da hata var)');
  await db.kapat();
  if (YARIS && canli && kaldi === 0) await yaris();
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

// ================================================================ simülasyon (bot vs bot)
function simFn() {
  return [
    'create or replace function pg_temp.duello_sim_mac(p_a uuid, p_b uuid) returns jsonb language plpgsql as $f$',
    'declare d public.duellolar%rowtype; v_id uuid; v_sav uuid; v_dc smallint; v_o uuid; i int := 0;',
    'begin',
    '  v_id := public.duello_olustur(p_a, p_b, false, null);',
    '  loop',
    '    i := i + 1; exit when i > 600;',
    '    select * into d from public.duellolar where id = v_id;',
    "    exit when d.durum <> 'aktif';",
    '    v_sav := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;',
    "    if d.faz = 'secim' then perform public.duello2_secim_uygula(v_id, public.duello2_bot_secim_kategori(v_id, d.saldiran), false);",
    "    elsif d.faz = 'ban' then perform public.duello2_ban_bitir(v_id, public.duello2_bot_ban_kategori(v_id, v_sav));",
    "    elsif d.faz = 'kategori' then perform public.duello2_soru_ac(v_id, public.duello2_bot_kategori(v_id, d.saldiran));",
    "    elsif d.faz = 'cevap' then",
    '      select q.dogru_cevap into v_dc from public.questions q where q.id = d.soru_id;',
    '      foreach v_o in array array[d.oyuncu1, d.oyuncu2] loop',
    '        perform public.duello2_bot_cevap(v_id, v_o, (case when random() < public.bot_soru_isabet(v_o, d.kategori, d.soru_id) then v_dc',
    '                 else ((v_dc + 1 + floor(random() * 3))::int % 4) end)::smallint);',
    '      end loop;',
    '      perform public.duello2_cozumle(v_id);',
    "    elsif d.faz = 'sonuc' then perform public.duello2_sonraki(v_id);",
    '    else exit; end if;',
    '  end loop;',
    '  select * into d from public.duellolar where id = v_id;',
    "  return jsonb_build_object('durum', d.durum, 'tur', d.tur, 'uzatma', d.uzatma, 'p1', d.puan1, 'p2', d.puan2, 'mod', d.puan_modu,",
    "    'yol', greatest(public.duello2_puan_alinan(d.secimler, d.sahiplik, d.oyuncu1), public.duello2_puan_alinan(d.secimler, d.sahiplik, d.oyuncu2)),",
    "    'kendi', (select count(*) from public.duello_hamleler h where h.duello_id = v_id and h.hakimiyet ->> 'sahip_once' = h.saldiran::text),",
    "    'tutarli', (select coalesce(sum(case when h.saldiran = d.oyuncu1 then h.puan_saldiran else h.puan_savunan end), 0) = d.puan1",
    "                  from public.duello_hamleler h where h.duello_id = v_id and not h.uzatma),",
    "    'calma', (select count(*) from public.duello_hamleler h where h.duello_id = v_id and (h.hakimiyet ->> 'tuttu')::boolean));",
    'end $f$',
  ].join('\n');
}
async function simulasyon() {
  console.log(`11) Simülasyon: ${SIM} bot-bot maçı (maç başına ayrı işlem + ROLLBACK)`);
  await db.sorgu(simFn());
  const botlar = (await db.sorgu(`select id from profiles where is_bot and bot_turu = 'gizli' and coalesce(bot_aktif, true) order by md5(id::text) limit 40`)).map((x) => x.id);
  const m = { tur: [], puanBitis: 0, katBitis: 0, turBitis: 0, altin: 0, calma: [], bitti: 0, hata: 0, kendi: 0, tutarsiz: 0 };
  const bas = Date.now();
  for (let i = 0; i < SIM; i++) {
    const a = botlar[(i * 2) % botlar.length], b = botlar[(i * 2 + 1) % botlar.length];
    await db.sorgu('begin');
    try {
      await db.sorgu("set local statement_timeout = '30s'");
      await db.sorgu("set local lock_timeout = '2s'");
      const s = JSON.parse(await tek(`select pg_temp.duello_sim_mac('${a}','${b}')::text`));
      if (s.durum === 'bitti' && s.mod) {
        m.bitti++; m.tur.push(Number(s.tur)); m.calma.push(Number(s.calma)); m.kendi += Number(s.kendi); if (!s.tutarli) m.tutarsiz++;
        if (s.uzatma) m.altin++; else if (Math.max(s.p1, s.p2) >= 12) m.puanBitis++; else if (s.yol >= 4) m.katBitis++; else m.turBitis++;
      }
    } catch (e) { m.hata++; if (m.hata < 3) console.log('   sim hata:', e.message); }
    await db.sorgu('rollback');
  }
  const ort = (x) => (x.length ? x.reduce((p, c) => p + c, 0) / x.length : 0);
  const yuzde = (n) => `%${Math.round((100 * n) / Math.max(1, m.bitti))}`;
  console.log(`   ${m.bitti}/${SIM} maç bitti (${Math.round((Date.now() - bas) / 1000)} sn, hata ${m.hata})`);
  console.log(`   ort tur ${ort(m.tur).toFixed(1)} · 12 puan ${yuzde(m.puanBitis)} · 4 kategori ${yuzde(m.katBitis)} · tur sonu ${yuzde(m.turBitis)} · Altın Soru ${yuzde(m.altin)} · alma ort ${ort(m.calma).toFixed(1)}/maç`);
  ok('simülasyon: bütün maçlar puan modunda hatasız bitti', m.bitti === SIM && m.hata === 0, `${m.bitti}/${SIM}, hata ${m.hata}`);
  ok('simülasyon: kendi kategorisine hamle 0, puan toplamları tutarlı', m.kendi === 0 && m.tutarsiz === 0, JSON.stringify([m.kendi, m.tutarsiz]));
}

// ================================================================ gerçek eşzamanlılık (970 canlıyken)
// Kayıtlı bir test maçı (seçim + tur 1 kategori hazır) açılır; iki ayrı bağlantı AYNI anda cevap verir. Biri satır kilidini
// tutarken öteki bekler; tur TEK kez çözülür (tek hamle kaydı, puan bir kez). Sonunda maç iptal edilir.
async function yaris() {
  console.log('12) Gerçek eşzamanlılık (iki bağlantı aynı anda cevap)');
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
    for (let deneme = 0; deneme < 3; deneme++) {
      id = await k0.tek(`select duello_olustur('${A}','${B}',false,null)`);
      for (let i = 0; i < 10; i++) {
        const s = await k0.tek(`select saldiran::text from duellolar where id = '${id}'`);
        await k0.sorgu(`select duello2_secim_uygula('${id}', duello2_bot_secim_kategori('${id}', '${s}'), false)`);
      }
      await k0.sorgu(`select duello2_ban_bitir('${id}', null)`);
      await k0.sorgu(`select duello2_soru_ac('${id}', (duello2_puan_hedefler('${id}'))[1])`);
      const ben2 = (k, u) => k.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
      const dcv = Number(await k0.tek(`select q.dogru_cevap::text from duellolar d join questions q on q.id = d.soru_id where d.id = '${id}'`));
      await k1.sorgu('begin'); await ben2(k1, A);
      await k2.sorgu('begin'); await ben2(k2, B);
      await k1.sorgu(`select duello_cevap('${id}', ${dcv}::smallint)`);          // A doğru, kilit k1'de
      const ikinci = k2.sorgu(`select duello_cevap('${id}', ${dcv}::smallint)`).then(() => null, (e) => e.message);   // B doğru, bekler
      await new Promise((r) => setTimeout(r, 700));
      await k1.sorgu('commit');
      const h2 = await ikinci;
      await k2.sorgu('commit');
      const s = (await k0.sorgu(`select faz, puan1, puan2, (select count(*) from duello_hamleler h where h.duello_id = '${id}')::int n from duellolar where id = '${id}'`))[0];
      ok(`yarış ${deneme + 1}: iki eşzamanlı cevap → tur tek kez çözüldü (1 hamle, ikisi de +1)`, !h2 && s.faz === 'sonuc' && Number(s.n) === 1
        && Number(s.puan1) === 1 && Number(s.puan2) === 1, `${h2} · ${JSON.stringify(s)}`);
      // ilerletmeyi iki bağlantıdan aynı anda tetikle: sonraki tura tek geçiş
      await k0.sorgu(`update duellolar set faz_bitis = now() - interval '1 second' where id = '${id}'`);
      await Promise.all([k1.sorgu(`select duello2_ilerlet('${id}')`), k2.sorgu(`select duello2_ilerlet('${id}')`)]);
      const s2 = (await k0.sorgu(`select tur, faz from duellolar where id = '${id}'`))[0];
      ok(`yarış ${deneme + 1}: eşzamanlı ilerletme → tek tur geçişi (tur 2)`, Number(s2.tur) === 2 && ['ban', 'kategori'].includes(s2.faz), JSON.stringify(s2));
      await k0.sorgu(`update duellolar set durum = 'iptal', bitis = now() where id = '${id}' and durum = 'aktif'`);
      id = null;
    }
  } catch (e) { kaldi++; console.error('  yarış HATA:', e.message); }
  finally {
    for (const k of [k1, k2]) { try { await k.sorgu('rollback'); } catch { /* */ } }
    if (id) { try { await k0.sorgu(`update duellolar set durum = 'iptal', bitis = now() where id = '${id}' and durum = 'aktif'`); console.log('  test maçı iptal edildi'); } catch (e) { console.error('  iptal HATA', e.message); } }
    for (const k of [k0, k1, k2]) await k.kapat();
  }
}
