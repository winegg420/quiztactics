// 1059 — bağlantı kopması toplam 60 sn: SQL provası. TEK transaction, sonunda ROLLBACK (canlıya kalıcı yazmaz).
// Simülasyon/yük YOK: her mod için birkaç tek adımlı senaryo. İşlem içinde now() sabittir; "zaman geçti" satırdaki
// bitiş/nabız sütunları geriye çekilerek taklit edilir. Test hesapları işlem içinde yaratılır (auth.users + profiles).
//
// Sınar: Düello v4 (süre dolumu kapısı → donma kopma anından · dönüşte aynı faz + kalan süre · 50 sn'de sürer · 61 sn'de terk ·
// bağlı oyuncu kapıya takılmaz) · Ortak Hazine (cevap + karar kapısı, dönüş, terk) · Klasik (kapı, mac_nabiz duraklama kopma
// anından, dönüşte soru süresi geri, 61 sn terk, bot maçı 61 sn terk) · yardımcılar istemciye kapalı · yetkiler değişmedi.
// Kullanım: node araclar/kopuk-60-sql-testi.mjs
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
import crypto from 'node:crypto';

const MIG = fs.readFileSync(new URL('../supabase/migrations/20260612001059_kopuk_toplam_60sn.sql', import.meta.url), 'utf8');
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);
const satir = async (s) => (await db.sorgu(s))[0];
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u ?? ''}', true), set_config('request.jwt.claims', '${u ? `{"sub":"${u}","role":"authenticated"}` : ''}', true)`);
const nabiz = (u, sn) => db.sorgu(`insert into oyuncu_nabiz (user_id, son_gorulme) values ('${u}', now() - make_interval(secs => ${sn}))
  on conflict (user_id) do update set son_gorulme = excluded.son_gorulme; update profiles set last_seen = now() - make_interval(secs => ${sn}) where id = '${u}'`);
const bekci = setTimeout(async () => { console.error('⏱ süre aşıldı — ROLLBACK'); try { await db.sorgu('rollback'); } catch { /* */ } await db.kapat(); process.exit(3); }, 4 * 60 * 1000);
const HEDEF = ['duello4_ilerlet', 'duello2_ilerlet', 'kasa_ilerlet', 'mac_nabiz', 'advance_match', 'duello_durum', 'kasa_durum', 'duello_baglanti', 'duello_bitir', 'kasa_bitir'];
const ACL = `select string_agg(p.oid::regprocedure::text || '=' || coalesce(p.proacl::text, '-'), ',' order by p.oid::regprocedure::text)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = any(array[${HEDEF.map((x) => `'${x}'`).join(',')}])`;

let A, B, BOT;
async function hesap(ad) {
  const id = crypto.randomUUID();
  await db.sorgu(`insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values ('${id}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '${ad}@kopuk-testi.invalid', '{}'::jsonb, now(), now())`);
  const var_ = await tek(`select count(*)::text from profiles where id = '${id}'`);
  if (var_ === '0') await db.sorgu(`insert into profiles (id, username) values ('${id}', '${ad}')`);
  return id;
}

try {
  await db.sorgu("set application_name = 'kopuk-60-sql-testi'");
  const aktif = await satir(`select (select count(*) from duellolar where durum = 'aktif')::int d, (select count(*) from kasa_maclari where durum = 'aktif')::int k,
    (select count(*) from matches where durum = 'aktif')::int m`);
  console.log('0) aktif maçlar', JSON.stringify(aktif));
  await db.sorgu('begin');
  await db.sorgu("set local lock_timeout = '3s'");
  await db.sorgu("set local statement_timeout = '60s'");
  await db.sorgu("set local idle_in_transaction_session_timeout = '60s'");
  const aclOnce = await tek(ACL);
  await db.sorgu(MIG); await db.sorgu(MIG);
  console.log('1) 1059 işlem içinde iki kez uygulandı');
  ok('10 hedef fonksiyonun yetkisi (proacl) birebir aynı', aclOnce === await tek(ACL));
  ok('yardımcılar anon/authenticated için kapalı', (await tek(`select bool_and(not has_function_privilege('authenticated', p.oid, 'execute')
      and not has_function_privilege('anon', p.oid, 'execute'))::text from pg_proc p where p.proname in ('mac_sure_kopugu', 'mac_hala_kopuk')`)) === 'true');
  ok('ayarlar: toplam 60, kopuk 15/15', (await tek(`select string_agg(anahtar || '=' || (deger #>> '{}'), ',' order by anahtar) from oyun_ayarlari
      where anahtar in ('mac_kopuk_toplam_sn', 'duello_kopuk_sn', 'kasa_kopuk_sn')`)) === 'duello_kopuk_sn=15,kasa_kopuk_sn=15,mac_kopuk_toplam_sn=60');

  A = await hesap('kopuktest_a'); B = await hesap('kopuktest_b');
  BOT = await tek(`select id from profiles where is_bot order by created_at limit 1`);
  await db.sorgu(`update profiles set dil = 'tr', ulke = 'TR' where id in ('${A}', '${B}')`).catch(() => {});
  await nabiz(A, 0); await nabiz(B, 0);

  // ---------------- Düello v4 ----------------
  console.log('\n2) Düello v4');
  await db.sorgu(`update oyun_ayarlari set deger = '"acik"'::jsonb where anahtar = 'duello_v4_acik'`);
  await ben(A);
  const d = await tek(`select duello_olustur('${A}', '${B}', false, null)`);
  const ds = (k = '*') => satir(`select ${k} from duellolar where id = '${d}'`);
  ok('maç surum 4', (await ds('surum::text s')).s === '4');
  // nötr soruya kadar ilerlet (giriş fazları)
  for (let i = 0; i < 6 && !['notr', 'cevap'].includes((await ds('faz')).faz); i++) {
    await db.sorgu(`update duellolar set faz_bitis = now() - interval '10 seconds', soru_baslangic = now() - interval '10 seconds' where id = '${d}'`);
    await db.sorgu(`select duello4_ilerlet('${d}')`);
  }
  ok('nötr soru fazı', ['notr', 'cevap'].includes((await ds('faz')).faz), (await ds('faz')).faz);
  const faz0 = (await ds('faz, v4_soru_no::text n'));
  // A cevapladı (cevaplar'a yaz), B süre bitiminden önce koptu: bitiş 6 sn önce (+5 pay doldu), B'nin son nabzı 8 sn önce
  await db.sorgu(`update duellolar set cevaplar = jsonb_build_object('${A}', jsonb_build_object('cevap', 0, 'at', now())),
    bitis1 = now() - interval '6 seconds', bitis2 = now() - interval '6 seconds', faz_bitis = now() - interval '6 seconds',
    soru_baslangic = now() - interval '25 seconds' where id = '${d}'`);
  await nabiz(B, 8);
  await db.sorgu(`select duello4_ilerlet('${d}')`);
  let r = await ds(`faz, durum, extract(epoch from now() - kopuk_at)::int::text gecen, extract(epoch from bitis2 - now())::numeric(5,1)::text b2`);
  ok('kapı: B bitişten sonra görünmedi → süre dolumu sayılmadı, faz aynı', r.faz === faz0.faz && r.durum === 'aktif', JSON.stringify(r));
  ok('donma kopma anından (son nabız, 8 sn önce)', r.gecen === '8', JSON.stringify(r));
  ok('B\'ye kalan süre geri verildi (en az taban 3 sn)', Number(r.b2) >= 3, JSON.stringify(r));
  await ben(A);
  const durA = JSON.parse(await tek(`select duello_durum('${d}')::text`));
  const kalanBant = Number(await tek(`select round(extract(epoch from (timestamptz '${durA.kopuk?.bitis}' - now())))::int::text`));
  ok('rakibe kopuk bilgisi + bitiş = kopma + 60 sn', durA.kopuk && durA.kopuk.ben_mi === false && Math.abs(kalanBant - 52) <= 1, JSON.stringify(durA.kopuk) + ' kalan=' + kalanBant);
  // eşik altına düşünce (8 sn < 15) erken çözülme yok
  await db.sorgu(`select duello4_ilerlet('${d}')`);
  ok('donukken B nabız atmadıkça çözülmez', (await ds('(kopuk_at is not null)::text k')).k === 'true');
  // 50 sn: sürüyor
  await db.sorgu(`update duellolar set kopuk_at = now() - interval '50 seconds' where id = '${d}'`); await nabiz(B, 50);
  await db.sorgu(`select duello4_ilerlet('${d}')`);
  ok('kopmadan 50 sn sonra maç sürüyor', (await ds('durum')).durum === 'aktif');
  // dönüş
  await nabiz(B, 0);
  await db.sorgu(`select duello4_ilerlet('${d}')`);
  r = await ds(`faz, durum, (kopuk_at is null)::text cozuldu, extract(epoch from bitis2 - now())::numeric(5,1)::text b2, v4_soru_no::text n`);
  ok('B döndü → aynı faz, aynı soru, kalan süreyle sürer', r.cozuldu === 'true' && r.faz === faz0.faz && r.n === faz0.n && Number(r.b2) >= 3, JSON.stringify(r));
  // bağlı oyuncu kapıya takılmaz: B bitişten sonra görüldü (nabız şimdi) ama cevap vermedi → süre dolumu çözülür
  await db.sorgu(`update duellolar set bitis1 = now() - interval '6 seconds', bitis2 = now() - interval '6 seconds', faz_bitis = now() - interval '6 seconds' where id = '${d}'`);
  await db.sorgu(`select duello4_ilerlet('${d}')`);
  r = await ds('faz, (kopuk_at is null)::text cozuk');
  ok('bağlı (bitişten sonra görünen) oyuncuda süre dolumu normal işler', r.faz !== faz0.faz && r.cozuk === 'true', JSON.stringify(r));
  // terk: 61 sn
  await nabiz(B, 70);
  await db.sorgu(`update duellolar set kopuk_at = null, faz_bitis = now() + interval '5 seconds' where id = '${d}'`);
  await db.sorgu(`select duello4_ilerlet('${d}')`);   // 70 sn nabızsız → kopuk (kopma anı en çok 30 sn geri)
  await db.sorgu(`update duellolar set kopuk_at = now() - interval '61 seconds' where id = '${d}'`);
  await db.sorgu(`select duello4_ilerlet('${d}')`);
  r = await ds(`durum, (kazanan = '${A}')::text a`);
  ok('kopmadan 61 sn sonra terk → kalan oyuncu kazanır', r.durum === 'bitti' && r.a === 'true', JSON.stringify(r));

  // ---------------- Ortak Hazine ----------------
  console.log('\n3) Ortak Hazine');
  await nabiz(A, 0); await nabiz(B, 0);
  await ben(A);
  const k = await tek(`select kasa_olustur('${A}', '${B}', false, false)`);
  const ks = (x = '*') => satir(`select ${x} from kasa_maclari where id = '${k}'`);
  for (let i = 0; i < 4 && (await ks('faz')).faz !== 'cevap'; i++) {
    await db.sorgu(`update kasa_maclari set faz_bitis = now() - interval '10 seconds' where id = '${k}'`);
    await db.sorgu(`select kasa_ilerlet('${k}')`);
  }
  const kt = (await ks('faz, tur::text t'));
  ok('cevap fazı', kt.faz === 'cevap', JSON.stringify(kt));
  await db.sorgu(`update kasa_maclari set cevaplar = jsonb_build_object('${A}', jsonb_build_object('cevap', 0, 'at', now())),
    faz_bitis = now() - interval '6 seconds', soru_baslangic = now() - interval '25 seconds' where id = '${k}'`);
  await nabiz(B, 9);
  await db.sorgu(`select kasa_ilerlet('${k}')`);
  r = await ks(`faz, tur::text t, extract(epoch from now() - kopuk_at)::int::text gecen`);
  ok('kapı: cevaplamayan B bitişten sonra görünmedi → faz aynı, donma kopma anından (9 sn)', r.faz === 'cevap' && r.t === kt.t && r.gecen === '9', JSON.stringify(r));
  await nabiz(B, 0);
  await db.sorgu(`select kasa_ilerlet('${k}')`);
  r = await ks(`faz, (kopuk_at is null)::text c, extract(epoch from faz_bitis - now())::numeric(5,1)::text kalan`);
  ok('B döndü → aynı soru, kalan süre ≥ 3 sn', r.faz === 'cevap' && r.c === 'true' && Number(r.kalan) >= 3, JSON.stringify(r));
  // karar kapısı
  await db.sorgu(`update kasa_maclari set faz = 'karar', sahip = '${B}', kasa = 10, faz_bitis = now() - interval '4 seconds', cevaplar = '{}' where id = '${k}'`);
  await nabiz(B, 7);
  await db.sorgu(`select kasa_ilerlet('${k}')`);
  r = await ks(`faz, (kopuk_at is not null)::text kop, kasa::text kasa`);
  ok('karar kapısı: sahip bitişten sonra görünmedi → otomatik DEVAM yok, donar', r.faz === 'karar' && r.kop === 'true' && r.kasa === '10', JSON.stringify(r));
  await db.sorgu(`update kasa_maclari set kopuk_at = now() - interval '61 seconds' where id = '${k}'`); await nabiz(B, 61);
  await db.sorgu(`select kasa_ilerlet('${k}')`);
  r = await ks(`durum, (kazanan = '${A}')::text a, sonuc_neden`);
  ok('61 sn → terk, kalan oyuncu kazanır', r.durum === 'bitti' && r.a === 'true', JSON.stringify(r));

  // ---------------- Klasik ----------------
  console.log('\n4) Klasik / Saf Bilgi');
  await nabiz(A, 0); await nabiz(B, 0);
  const sorular = (await db.sorgu(`select id from questions where aktif order by created_at limit 5`)).map((x) => `'${x.id}'::uuid`).join(',');
  const yeniMac = (o2) => tek(`insert into matches (oyuncu1, oyuncu2, durum, soru_ids, aktif_soru, soru_baslangic, senkron, basladi, dereceli, kabul_at,
      oyuncu1_hazir_at, oyuncu2_hazir_at, oyuncu1_hazir, oyuncu2_hazir)
    values ('${A}', '${o2}', 'aktif', array[${sorular}], 0, now() - interval '22 seconds', true, true, false, now(), now(), now() - interval '8 seconds', true, true) returning id`);
  const m = await yeniMac(B);
  const ms = (x) => satir(`select ${x} from matches where id = '${m}'`);
  await ben(null);
  await db.sorgu(`select advance_match('${m}')`);
  r = await ms(`aktif_soru::text s, extract(epoch from now() - duraklatildi_at)::int::text gecen`);
  ok('kapı: B soru bitişinden (7 sn önce) sonra görünmedi → soru geçmedi, duraklama kopma anından (8 sn)', r.s === '0' && r.gecen === '8', JSON.stringify(r));
  await ben(A);
  let n = await satir(`select duraklatildi::text d, duraklama_sn::text sn from mac_nabiz('${m}', true)`);
  ok('A\'nın nabzı: duraklatıldı, geçen 8 sn (perde 52 sn gösterir)', n.d === 'true' && n.sn === '8', JSON.stringify(n));
  await db.sorgu(`update matches set duraklatildi_at = now() - interval '50 seconds', oyuncu2_hazir_at = now() - interval '50 seconds', soru_baslangic = now() - interval '55 seconds' where id = '${m}'`);
  n = await satir(`select durum, duraklatildi::text d from mac_nabiz('${m}', true)`);
  ok('50 sn: maç sürüyor (duraklı)', n.durum === 'aktif' && n.d === 'true', JSON.stringify(n));
  // B döner
  await ben(B);
  const once = await ms(`soru_baslangic::text sb`);
  n = await satir(`select durum, duraklatildi::text d from mac_nabiz('${m}', true)`);
  r = await ms(`aktif_soru::text s, extract(epoch from soru_baslangic - (timestamptz '${once.sb}'))::int::text kayma`);
  ok('B döndü → duraklama biter, aynı soru, soru süresi kopma anından geri verilir (+50 sn)', n.d === 'false' && r.s === '0' && r.kayma === '50', JSON.stringify({ n, r }));
  // terk 61 sn (insan-insan)
  const m2 = await yeniMac(B);
  await db.sorgu(`update matches set duraklatildi_at = now() - interval '61 seconds', oyuncu2_hazir_at = now() - interval '61 seconds' where id = '${m2}'`);
  await ben(A);
  n = await satir(`select durum, (terk_eden = '${B}')::text t from mac_nabiz('${m2}', true)`);
  ok('61 sn → B terk, maç bitti', n.durum === 'bitti' && n.t === 'true', JSON.stringify(n));
  // bot maçı: 50 sn nabızsız sürer, 61 sn terk
  const m3 = await yeniMac(BOT);
  await db.sorgu(`update matches set oyuncu2_hazir_at = now(), oyuncu1_hazir_at = now() - interval '50 seconds', soru_baslangic = now() - interval '5 seconds' where id = '${m3}'`);
  await ben(null);
  await db.sorgu(`select advance_match('${m3}')`);
  ok('bot maçı: insan 50 sn nabızsız → sürüyor', (await satir(`select durum from matches where id = '${m3}'`)).durum === 'aktif');
  await db.sorgu(`update matches set oyuncu1_hazir_at = now() - interval '61 seconds' where id = '${m3}'`);
  await db.sorgu(`select advance_match('${m3}')`);
  r = await satir(`select durum, (terk_eden = '${A}')::text t from matches where id = '${m3}'`);
  ok('bot maçı: 61 sn → terk', r.durum === 'bitti' && r.t === 'true', JSON.stringify(r));
} catch (e) {
  kaldi++; console.error('HATA', e.message);
} finally {
  clearTimeout(bekci);
  try { await db.sorgu('rollback'); } catch { /* */ }
  await db.kapat();
  console.log(`\n${gecti} geçti, ${kaldi} kaldı (ROLLBACK)`);
  process.exit(kaldi ? 1 : 0);
}
