// ORTAK HAZİNE 988 (Savunma Hakkı hazine 80'deyken de) SQL provası — TEK transaction, sonunda ROLLBACK.
// 988 migration'ını transaction İÇİNDE uygular (canlıda zaten varsa yeniden uygular), senaryoları sınar, geri alır.
//   · 78 + 2 = 80, hak sahibi yanlış + rakip tek doğru → Savunma Sorusu açılır, hazine 80 kalır
//   · başarılı → 80'de sahipsiz, maç sürer; sonra tek bilen sahip → karar → AÇ maçı bitirir
//   · başarısız → rakip sahip, karar → AÇ maçı bitirir
//   · zaten 80 (+2 kırpılır) → yine açılır · ikisi bilirse açılmaz · son tur açılmaz · Altın Soru açılmaz
//   · bot savunan · bot rakip (başarısız savunmadan sonra tavanda AÇ)
// Kullanım: node araclar/kasa-savunma-80-sql-testi.mjs
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';

const MIG = fs.readFileSync(new URL('../supabase/migrations/20260612000988_kasa_savunma_80de.sql', import.meta.url), 'utf8');
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
const KASA_MD5 = `select string_agg(md5(pg_get_functiondef(p.oid)), ',' order by p.proname)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'kasa%'`;

let md5Once = null;
try {
  md5Once = await tek(KASA_MD5);
  await db.sorgu('begin');
  await db.sorgu("set local lock_timeout = '3s'");
  await db.sorgu("set local statement_timeout = '15s'");

  console.log('1) Migration 988 (transaction içinde)');
  await db.sorgu(MIG);
  const tanim = await tek(`select pg_get_functiondef('public.kasa_cozumle(uuid)'::regprocedure)`);
  ok('kasa_cozumle: hedef/tavan koşulu kalktı, son tur koşulu duruyor',
     !/v_kasa < k\.hedef/.test(tanim) && /k\.tur < k\.max_tur then/.test(tanim));
  ok('kasa_cozumle yetkisi değişmedi (authenticated yok — iç fonksiyon)',
     (await tek(`select has_function_privilege('anon', 'public.kasa_cozumle(uuid)', 'execute')::text`)) === 'false');

  const H = await db.sorgu(`select id, takma_ad from profiles where takma_ad in ('ArayuzDenetim890', 'ArayuzDenetim648')`);
  const A = H.find((x) => x.takma_ad === 'ArayuzDenetim890')?.id, B = H.find((x) => x.takma_ad === 'ArayuzDenetim648')?.id;
  const BOT = await tek(`select id from profiles where is_bot order by created_at limit 1`);
  if (!A || !B || !BOT) throw new Error('test hesapları / bot yok');
  await db.sorgu(`update profiles set last_seen = now() where id in ('${A}', '${B}')`);

  let id;
  const m = () => json(`select row_to_json(k)::text from kasa_maclari k where id = '${id}'`);
  const dogru = async () => Number(await tek(`select q.dogru_cevap::text from kasa_maclari k join questions q on q.id = k.soru_id where k.id = '${id}'`));
  const cevap = async (u, c) => { await ben(u); return hata(`select kasa_cevap('${id}', ${c}::smallint)`); };
  const ilerlet = async () => { await db.sorgu(`update kasa_maclari set faz_bitis = now() - interval '5 seconds' where id = '${id}' and faz <> 'cevap'`); await db.sorgu(`select kasa_ilerlet('${id}')`); };
  // Normal soru öncesi durum: hazine k, hak sahibi h, sahipsiz, cevap fazı
  const hazirla = (kasa, hak, ek = '') => db.sorgu(`update kasa_maclari set kasa = ${kasa}, sahip = null, savunma = null,
      savunma_hak = array['${hak}']::uuid[], puan1 = 20, puan2 = 30, cevaplar = '{}'::jsonb, faz = 'cevap',
      soru_baslangic = now(), faz_bitis = now() + interval '20 seconds'${ek} where id = '${id}'`);
  const tetikle = async (h, r) => { const dg = await dogru(); await cevap(h, (dg + 1) % 4); await cevap(r, dg); };

  id = await tek(`select kasa_olustur('${A}', '${B}', true, false)`);
  let k = await m();
  const [P, Q] = [k.oyuncu1, k.oyuncu2];
  ok('yeni maç: hedef 80, tavan 80, savunma açık', k.hedef === 80 && k.kasa_tavan === 80 && k.savunma_acik === true,
     `${k.hedef}/${k.kasa_tavan}/${k.savunma_acik}`);
  await ilerlet();

  console.log('2) 78 + 2 = 80 → Savunma Sorusu → BAŞARILI');
  await hazirla(78, P);
  const tur0 = (await m()).tur;
  await tetikle(P, Q);
  k = await m();
  ok('tetik: sonuç fazı, savunma bekliyor, sahipsiz', k.faz === 'sonuc' && k.savunma?.durum === 'bekliyor' && k.sahip === null);
  ok('hazine 80, tavan_kirpti false', k.kasa === 80 && k.son_tur?.tavan_kirpti === false && k.son_tur?.kasa_sonra === 80);
  await ilerlet();
  k = await m();
  ok('Savunma Sorusu açıldı, hazine 80, tur aynı', k.faz === 'cevap' && k.savunma?.durum === 'soru' && k.kasa === 80 && k.tur === tur0);
  await cevap(P, await dogru());
  k = await m();
  ok('başarılı: sahipsiz, hazine 80, artis 0, tavan_kirpti false',
     k.savunma?.durum === 'basarili' && k.sahip === null && k.kasa === 80 && k.son_tur?.artis === 0 && k.son_tur?.tavan_kirpti === false);
  await ilerlet();
  k = await m();
  ok('maç sürüyor: yeni tur, karar YOK (sahipsiz), hazine 80', k.durum === 'aktif' && k.tur === tur0 + 1 && k.faz === 'cevap' && k.kasa === 80);
  // Sonraki soruda Q tek başına bilir → sahip → karar → AÇ maçı bitirir
  const dg2 = await dogru();
  await cevap(P, (dg2 + 1) % 4); await cevap(Q, dg2);
  k = await m();
  ok('P hakkı yok → bu kez savunma açılmaz, Q sahip, hazine 80', k.savunma === null && k.sahip === Q && k.kasa === 80);
  await ilerlet();
  k = await m();
  ok('Q karar fazında (80)', k.faz === 'karar' && k.sahip === Q);
  await db.sorgu(`select kasa_karar_uygula('${id}', true, false)`);
  k = await m();
  ok('AÇ → maç bitti, kazanan Q (hedef)', k.durum === 'bitti' && k.kazanan === Q && k.sonuc_neden === 'hedef', `${k.durum}/${k.sonuc_neden}`);

  console.log('3) 78 + 2 = 80 → Savunma Sorusu → BAŞARISIZ');
  id = await tek(`select kasa_olustur('${A}', '${B}', true, false)`);
  k = await m();
  const [P2, Q2] = [k.oyuncu1, k.oyuncu2];
  await ilerlet();
  await hazirla(78, P2);
  await tetikle(P2, Q2); await ilerlet();
  ok('savunma açık, hazine 80', (await m()).savunma?.durum === 'soru' && (await m()).kasa === 80);
  await cevap(P2, ((await dogru()) + 1) % 4);
  k = await m();
  ok('başarısız: rakip sahip, hazine 80, tavan_kirpti false', k.savunma?.durum === 'basarisiz' && k.sahip === Q2 && k.kasa === 80 && k.son_tur?.tavan_kirpti === false);
  await ilerlet();
  k = await m();
  ok('rakip karar fazında (80)', k.faz === 'karar' && k.sahip === Q2 && k.savunma === null);
  await db.sorgu(`select kasa_karar_uygula('${id}', true, false)`);
  k = await m();
  ok('AÇ → maç bitti, kazanan rakip', k.durum === 'bitti' && k.kazanan === Q2);

  console.log('4) Açılmayan / açılan sınır durumları');
  id = await tek(`select kasa_olustur('${A}', '${B}', true, false)`);
  k = await m();
  const [P3, Q3] = [k.oyuncu1, k.oyuncu2];
  await ilerlet();
  await hazirla(80, P3);
  await tetikle(P3, Q3);
  k = await m();
  ok('zaten 80 (+2 kırpılır) → yine açılır, tavan_kirpti true', k.savunma?.durum === 'bekliyor' && k.kasa === 80 && k.son_tur?.tavan_kirpti === true);
  await hazirla(74, P3);
  { const dg = await dogru(); await cevap(P3, dg); await cevap(Q3, dg); }
  k = await m();
  ok('ikisi bilirse (74 + 6 = 80) → açılmaz, sahipsiz, hak duruyor', k.savunma === null && k.sahip === null && k.kasa === 80 && k.savunma_hak.includes(P3));
  await hazirla(78, P3, ', tur = max_tur');
  await tetikle(P3, Q3);
  k = await m();
  ok('son tur → açılmaz, rakip sahip, hak duruyor', k.savunma === null && k.sahip === Q3 && k.kasa === 80 && k.savunma_hak.includes(P3));
  await hazirla(80, P3, ', altin = true, tur = max_tur + 1');
  await tetikle(P3, Q3);
  k = await m();
  ok('Altın Soru → açılmaz', k.savunma === null && k.faz === 'sonuc');

  console.log('5) Bot savunan (80)');
  id = await tek(`select kasa_olustur('${A}', '${BOT}', true, false)`);
  k = await m();
  const insan = k.oyuncu1 === BOT ? k.oyuncu2 : k.oyuncu1;
  await ilerlet();
  await hazirla(78, BOT);
  let dg = await dogru();
  await db.sorgu(`update kasa_maclari set bot_cevap = ${(dg + 1) % 4}, bot_cevap_at = now() - interval '1 second' where id = '${id}'`);
  await cevap(insan, dg);
  k = await m();
  ok('bot yanlış + insan doğru (80) → tetik', k.savunma?.sahip === BOT && k.faz === 'sonuc' && k.kasa === 80);
  await ilerlet();
  k = await m();
  ok('bot savunmada cevap zamanlandı', k.savunma?.durum === 'soru' && k.bot_cevap !== null);
  await db.sorgu(`update kasa_maclari set bot_cevap_at = now() - interval '1 second' where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await m();
  ok('bot cevapladı → çözüldü, hazine 80', ['basarili', 'basarisiz'].includes(k.savunma?.durum) && k.kasa === 80);

  console.log('6) Bot rakip: insan savunur, düşer → bot tavanda AÇ');
  await db.sorgu(`update kasa_maclari set savunma = null, faz = 'sonuc', faz_bitis = now() - interval '5 seconds' where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  await hazirla(78, insan, ', bot_cevap = null, bot_cevap_at = null');
  dg = await dogru();
  await db.sorgu(`update kasa_maclari set bot_cevap = ${dg}, bot_cevap_at = now() - interval '1 second' where id = '${id}'`);
  await cevap(insan, (dg + 1) % 4);
  k = await m();
  ok('insan yanlış + bot doğru (80) → insan savunuyor', k.savunma?.sahip === insan && k.savunma?.rakip === BOT);
  await ilerlet();
  await cevap(insan, ((await dogru()) + 1) % 4);
  k = await m();
  ok('savunma düştü → bot sahip, hazine 80', k.savunma?.durum === 'basarisiz' && k.sahip === BOT && k.kasa === 80);
  await ilerlet();
  k = await m();
  ok('bot karar: tavanda AÇ', k.faz === 'karar' && k.bot_karar === true);
  await db.sorgu(`update kasa_maclari set bot_karar_at = now() - interval '1 second' where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await m();
  ok('maç bitti, kazanan bot', k.durum === 'bitti' && k.kazanan === BOT);
} catch (e) {
  kaldi++;
  console.log('  ✗ HATA', e.message);
} finally {
  try { await db.sorgu('rollback'); } catch { /* bağlantı düşmüş olabilir */ }
  try {
    const sonra = await tek(KASA_MD5);
    ok("ROLLBACK sonrası canlı kasa_* fonksiyonları değişmedi (md5)", sonra === md5Once);
  } catch { /* yok */ }
  await db.kapat?.();
  console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
  process.exit(kaldi ? 1 : 0);
}
