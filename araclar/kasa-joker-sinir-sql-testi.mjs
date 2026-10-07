// ORTAK HAZİNE 985 (joker sınırları yalnız Hazine'ye özel) SQL provası — TEK transaction, sonunda ROLLBACK.
// 985 migration'ını transaction İÇİNDE uygular, kuralları sınar, geri alır (canlıya iz bırakmaz).
//   · Tür sınırları: İkinci Şans 1 · 50:50 2 · Ek Süre 2 · Zaman Baskısı 3 · toplam 4 · soru başı 1
//   · DEVAM ücretsiz 50:50 sınırlara sayılmaz (tür sınırı ve toplam dolu iken de çalışır)
//   · Rakip cevapladıysa Zaman Baskısı reddi, Altın Soru'da joker yok
//   · kasa_joker_durumu: sinir 4, tur_sinirlari, kalan_haklar
//   · klasik_skill_* ayarları ve Klasik joker fonksiyonları değişmez
// Kullanım: node araclar/kasa-joker-sinir-sql-testi.mjs
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';

const MIG = fs.readFileSync(new URL('../supabase/migrations/20260612000985_kasa_joker_sinirlari.sql', import.meta.url), 'utf8');
const KLASIK = ['joker_kullan', 'joker_hak_kontrol', 'joker_mac_siniri', 'joker_mac_durumu', 'skill_kullanim_kapisi'];

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
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
const md5 = () => tek(`select string_agg(md5(pg_get_functiondef(p.oid)), ',' order by p.oid::regprocedure::text)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = any(array[${KLASIK.map((x) => `'${x}'`).join(',')}])`);

try {
  const aktif = await tek(`select count(*)::text from kasa_maclari where durum = 'aktif'`);
  console.log(`Aktif Ortak Hazine maçı: ${aktif} (test kendi maçını açar, onlara dokunmaz)`);
  await db.sorgu('begin');
  await db.sorgu("set local lock_timeout = '3s'");
  await db.sorgu("set local statement_timeout = '30s'");

  const klasikOnce = await tek(`select string_agg(anahtar || '=' || deger::text, ',' order by anahtar) from oyun_ayarlari where anahtar like 'klasik_skill%'`);
  const md5Once = await md5();
  console.log('1) Migration 985 (transaction içinde)');
  await db.sorgu(MIG);
  ok('klasik_skill_* ayarları aynı', klasikOnce === await tek(`select string_agg(anahtar || '=' || deger::text, ',' order by anahtar) from oyun_ayarlari where anahtar like 'klasik_skill%'`), klasikOnce);
  ok('Klasik joker fonksiyonları birebir (md5)', md5Once === await md5());
  ok('6 yeni ayar', (await tek(`select string_agg(anahtar || '=' || deger::text, ',' order by anahtar) from oyun_ayarlari where anahtar like 'kasa_joker_%'`))
    === 'kasa_joker_hak_elli=2,kasa_joker_hak_ikinci_sans=1,kasa_joker_hak_sure=2,kasa_joker_hak_zaman_baskisi=3,kasa_joker_soru_basi_hak=1,kasa_joker_toplam_hak=4');
  ok('kasa_joker imzası ve yetkisi aynı (anon yok, authenticated var)',
    (await tek(`select (has_function_privilege('authenticated', 'public.kasa_joker(uuid,text,boolean,boolean)', 'execute')
       and not has_function_privilege('anon', 'public.kasa_joker(uuid,text,boolean,boolean)', 'execute'))::text`)) === 'true');

  const H = await db.sorgu(`select id, takma_ad from profiles where takma_ad in ('ArayuzDenetim890', 'ArayuzDenetim648')`);
  const A = H.find((x) => x.takma_ad === 'ArayuzDenetim890')?.id;
  const B = H.find((x) => x.takma_ad === 'ArayuzDenetim648')?.id;
  if (!A || !B) throw new Error('test hesapları yok');
  await db.sorgu(`update profiles set last_seen = now() where id in ('${A}', '${B}')`);
  await db.sorgu(`update oyun_ayarlari set deger = '0' where anahtar = 'jokerler_ucretsiz'`);
  for (const u of [A, B]) for (const t of ['elli', 'sure', 'zaman_baskisi', 'ikinci_sans']) {
    await db.sorgu(`insert into joker_envanter (user_id, tur, adet) values ('${u}', '${t}', 9) on conflict (user_id, tur) do update set adet = 9`);
  }
  const id = await tek(`select kasa_olustur('${A}', '${B}', true, false)`);
  await db.sorgu(`update kasa_maclari set faz_bitis = now() - interval '2 seconds' where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  ok('maç soru fazında', (await tek(`select faz from kasa_maclari where id = '${id}'`)) === 'cevap');
  // Yeni soru taklidi: tur +1, soru başı joker durumu ve cevaplar sıfır, süre taze
  const yeniSoru = () => db.sorgu(`update kasa_maclari set tur = tur + 1, joker = '{}'::jsonb, cevaplar = '{}'::jsonb,
     faz_bitis = now() + interval '15 seconds' where id = '${id}'`);
  const kullan = async (u, t, bedava = false) => { await ben(u); return hata(`select kasa_joker('${id}', '${t}', false, ${bedava})`); };
  const sayi = (u, t) => tek(`select count(*)::text from joker_kullanimlari where user_id = '${u}' and mac_tur = 'kasa' and mac_id = '${id}'${t ? ` and tur = '${t}'` : ''}`).then(Number);

  console.log('2) Sınırlar (A)');
  ok('S1: 50:50 kabul', (await kullan(A, 'elli')) === null);
  ok('S1: aynı soruda Ek Süre → soru başı 1 reddi', /Bu soruda/.test(await kullan(A, 'sure') || ''));
  await yeniSoru();
  ok('S2: 50:50 kabul (2/2)', (await kullan(A, 'elli')) === null);
  await yeniSoru();
  ok('S3: 50:50 üçüncü → maç hakkı doldu', /maç hakkın doldu/.test(await kullan(A, 'elli') || ''));
  await db.sorgu(`update kasa_maclari set joker = jsonb_build_object('${A}', jsonb_build_object('bedava', 'elli')) where id = '${id}'`);
  ok('S3: DEVAM ücretsiz 50:50 tür sınırı doluyken kabul', (await kullan(A, 'elli', true)) === null);
  ok('ücretsiz 50:50 joker_kullanimlari\'na yazılmadı (elli 2)', (await sayi(A, 'elli')) === 2);
  ok('S3: ücretsiz sonrası aynı soruda İkinci Şans kabul (ücretsiz soru başına sayılmaz)', (await kullan(A, 'ikinci_sans')) === null);
  await yeniSoru();
  ok('S4: İkinci Şans ikinci → maç hakkı doldu (1)', /maç hakkın doldu/.test(await kullan(A, 'ikinci_sans') || ''));
  ok('S4: Ek Süre kabul (toplam 4/4)', (await kullan(A, 'sure')) === null);
  await yeniSoru();
  ok('S5: Zaman Baskısı → toplam 4 reddi', /en fazla 4/.test(await kullan(A, 'zaman_baskisi') || ''));
  await db.sorgu(`update kasa_maclari set joker = jsonb_build_object('${A}', jsonb_build_object('bedava', 'elli')) where id = '${id}'`);
  ok('S5: toplam doluyken ücretsiz 50:50 kabul', (await kullan(A, 'elli', true)) === null);
  ok('A toplam kayıt 4', (await sayi(A)) === 4);
  await ben(A);
  const jd = await json(`select kasa_joker_durumu('${id}')::text`);
  ok('kasa_joker_durumu: sinir 4, kullanilan 4, soru_basi 1', jd.sinir === 4 && jd.kullanilan === 4 && jd.soru_basi_sinir === 1, JSON.stringify(jd));
  ok('tur_sinirlari {elli 2, sure 2, zaman_baskisi 3, ikinci_sans 1}',
    jd.tur_sinirlari?.elli === 2 && jd.tur_sinirlari?.sure === 2 && jd.tur_sinirlari?.zaman_baskisi === 3 && jd.tur_sinirlari?.ikinci_sans === 1, JSON.stringify(jd.tur_sinirlari));
  ok('kalan_haklar {elli 0, sure 1, zaman_baskisi 3, ikinci_sans 0}',
    jd.kalan_haklar?.elli === 0 && jd.kalan_haklar?.sure === 1 && jd.kalan_haklar?.zaman_baskisi === 3 && jd.kalan_haklar?.ikinci_sans === 0, JSON.stringify(jd.kalan_haklar));

  console.log('3) Zaman Baskısı (B) + Altın Soru');
  await yeniSoru();
  const dc = Number(await tek(`select q.dogru_cevap::text from kasa_maclari k join questions q on q.id = k.soru_id where k.id = '${id}'`));
  await ben(A);
  await db.sorgu(`select kasa_cevap('${id}', ${dc}::smallint)`);
  ok('rakip cevapladıysa Zaman Baskısı reddi', /Rakibin bu soruyu zaten cevapladı/.test(await kullan(B, 'zaman_baskisi') || ''));
  for (let i = 1; i <= 3; i++) {
    await yeniSoru();
    ok(`Zaman Baskısı ${i}/3 kabul`, (await kullan(B, 'zaman_baskisi')) === null);
  }
  await yeniSoru();
  ok('Zaman Baskısı 4. → maç hakkı doldu', /maç hakkın doldu/.test(await kullan(B, 'zaman_baskisi') || ''));
  await db.sorgu(`update kasa_maclari set altin = true where id = '${id}'`);
  ok('Altın Soru\'da joker reddi', /Altın Soru/.test(await kullan(B, 'elli') || ''));
} catch (e) {
  kaldi++;
  console.log('  ✗ HATA', e.message);
} finally {
  try { await db.sorgu('rollback'); } catch { /* bağlantı düştüyse transaction zaten geri alındı */ }
  const kalan = await tek(`select count(*)::text from oyun_ayarlari where anahtar like 'kasa_joker_%'`).catch(() => '?');
  console.log(`ROLLBACK — canlıda kasa_joker_* ayarı: ${kalan} (0 olmalı)`);
  console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
  await db.kapat?.();
  process.exit(kaldi ? 1 : 0);
}
