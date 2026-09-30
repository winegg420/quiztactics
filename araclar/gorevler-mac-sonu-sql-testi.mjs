// mac_sonu_ozet günlük görev "onceki" (744) — tek transaction, sonunda ROLLBACK.
// Sınar: yeni havuz görevlerinde onceki = bu maç hariç ölçüm (maç oyna/kazan −1, doğru cevap −n, kategori, Düello) ·
// Antrenman (açık bot) maçı onceki'yi oynatmaz · haftalık görev listesi (haftalik_gorevler) · eski anahtarlar duruyor ·
// 5 argümanlı gorev_olcum eski davranışta (hariç tutma yok) · yetkiler.
// Kullanım: node araclar/gorevler-mac-sonu-sql-testi.mjs [migration.sql ...]
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIGLER = process.argv.slice(2);
const A = '5b555bd3-9371-4f35-90a5-39289111335e';
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, k, ek = '') => { if (k) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);
const js = async (s) => JSON.parse(await tek(s));
try {
  await db.sorgu('begin');
  for (const m of MIGLER) await db.sorgu(fs.readFileSync(m, 'utf8'));
  await db.sorgu(`select set_config('request.jwt.claim.sub','${A}',true), set_config('request.jwt.claims','{"sub":"${A}","role":"authenticated"}',true)`);
  const KATLAR = (await db.sorgu(`select distinct kategori from questions where aktif and kategori not in ('genel','karisik') order by 1`)).map((x) => x.kategori);
  // bilinen seçim + büyük hedefler (üst sınır kırpması olmasın)
  await db.sorgu(`update gorev_havuzu set hedef = 500`);
  await db.sorgu(`delete from gunluk_gorev_secimi where tarih = (now() at time zone 'Europe/Istanbul')::date`);
  await db.sorgu(`insert into gunluk_gorev_secimi (tarih, zorluk, quest_id, parametre) values
    ((now() at time zone 'Europe/Istanbul')::date, 'kolay', 'gun_mac_oyna_2', '{}'),
    ((now() at time zone 'Europe/Istanbul')::date, 'orta', 'gun_dogru_25', '{}'),
    ((now() at time zone 'Europe/Istanbul')::date, 'zor', 'gun_kategori_dogru_10', '{"kategori":"${KATLAR[0]}"}')`);
  await db.sorgu(`delete from haftalik_gorev_secimi where hafta = gorev_hafta_basi(now())`);
  await db.sorgu(`insert into haftalik_gorev_secimi (hafta, slot, quest_id) values
    (gorev_hafta_basi(now()), 1, 'hft_mac_oyna_15'), (gorev_hafta_basi(now()), 2, 'hft_dogru_100'), (gorev_hafta_basi(now()), 3, 'hft_farkli_kategori_5')`);
  const gizli = await tek(`select id from profiles where is_bot and coalesce(bot_turu,'')<>'acik' and not coalesce(acik_bot,false) limit 1`);
  const acik = await tek(`select id from profiles where is_bot and (coalesce(bot_turu,'acik')='acik' or coalesce(acik_bot,false)) limit 1`);
  const SORULAR = `(select array_agg(q.id order by q.kategori) from (select distinct on (kategori) id, kategori from questions where aktif and kategori not in ('genel','karisik') order by kategori, id) q)`;
  async function mac(rakip, dogru) {
    const id = await tek(`insert into matches (oyuncu1, oyuncu2, durum, dereceli, soru_ids) values ('${A}','${rakip}','aktif',true,${SORULAR}) returning id`);
    for (let i = 0; i < dogru; i++) await db.sorgu(`insert into match_answers (match_id, user_id, soru_index, cevap, dogru) values ('${id}','${A}',${i},0,true)`);
    await db.sorgu(`update matches set durum='bitti', kazanan='${A}', bitis=now() where id='${id}'`);
    return id;
  }
  const oz = async (id) => js(`select mac_sonu_ozet('mac:${id}')::text`);
  const bul = (liste, id) => liste.find((g) => g.id === id);

  console.log('— gizli bot maçı (sayılır)');
  await mac(gizli, 3);                         // önceki maç: 3 doğru (kategori 0,1,2)
  const m2 = await mac(gizli, 4);              // bu maç: 4 doğru (kategori 0..3)
  const r = await oz(m2);
  const g = r.gorevler;
  ok('dönüş biçimi korunur (gorevler: id ad ilerleme hedef alindi onceki)', g.length === 3 && g.every((x) => x.id && x.ad && x.ilerleme !== undefined && x.hedef && x.alindi !== undefined && x.onceki !== undefined));
  ok('maç oyna: ilerleme 2, onceki 1', bul(g, 'gun_mac_oyna_2').ilerleme === 2 && bul(g, 'gun_mac_oyna_2').onceki === 1, JSON.stringify(bul(g, 'gun_mac_oyna_2')));
  ok('doğru cevap: +4 (7 → 3)', bul(g, 'gun_dogru_25').ilerleme === 7 && bul(g, 'gun_dogru_25').onceki === 3, JSON.stringify(bul(g, 'gun_dogru_25')));
  ok('kategori görevi: bu maçta +1, onceki 1', bul(g, 'gun_kategori_dogru_10').ilerleme === 2 && bul(g, 'gun_kategori_dogru_10').onceki === 1, JSON.stringify(bul(g, 'gun_kategori_dogru_10')));
  ok('haftalik_gorevler: 3 görev, biçim aynı', Array.isArray(r.haftalik_gorevler) && r.haftalik_gorevler.length === 3 && r.haftalik_gorevler.every((x) => x.id && x.ad && x.hedef && x.ilerleme !== undefined && x.onceki !== undefined && x.alindi !== undefined));
  ok('haftalık maç oyna: onceki = ilerleme − 1', bul(r.haftalik_gorevler, 'hft_mac_oyna_15').onceki === bul(r.haftalik_gorevler, 'hft_mac_oyna_15').ilerleme - 1);
  ok('haftalık doğru: onceki = ilerleme − 4', bul(r.haftalik_gorevler, 'hft_dogru_100').onceki === bul(r.haftalik_gorevler, 'hft_dogru_100').ilerleme - 4);
  ok('haftalık farklı kategori: yeni kategori yok (önceki maç 0–2, bu maç 0–3 → +1)', bul(r.haftalik_gorevler, 'hft_farkli_kategori_5').onceki === bul(r.haftalik_gorevler, 'hft_farkli_kategori_5').ilerleme - 1);
  ok('eski üst anahtarlar duruyor', ['kaynak', 'hazir', 'bitti', 'kazanan', 'terk', 'dokum', 'level', 'lig', 'rozetler', 'gorevler'].every((k) => k in r));

  console.log('— Antrenman (açık bot) maçı');
  const m3 = await mac(acik, 5);
  const r3 = await oz(m3);
  const g3 = r3.gorevler;
  ok('Antrenman görevlere katkı vermez: onceki = ilerleme (hepsi)', g3.every((x) => x.onceki === x.ilerleme), JSON.stringify(g3));
  ok('haftalık da aynı', r3.haftalik_gorevler.every((x) => x.onceki === x.ilerleme));

  console.log('— eski imzalar ve yetkiler');
  const bas = `gorev_gun_bas((now() at time zone 'Europe/Istanbul')::date)`;
  ok('5 argümanlı gorev_olcum hariç tutmaz (7 argümanlı null ile aynı)', await tek(`select gorev_olcum('${A}','mac_oyna','{}'::jsonb,${bas},${bas}+interval '1 day')`) === await tek(`select gorev_olcum('${A}','mac_oyna','{}'::jsonb,${bas},${bas}+interval '1 day',null::text,null::uuid)`));
  ok('bu maç hariç tutulunca 1 eksik', Number(await tek(`select gorev_olcum('${A}','mac_oyna','{}'::jsonb,${bas},${bas}+interval '1 day')`)) - Number(await tek(`select gorev_olcum('${A}','mac_oyna','{}'::jsonb,${bas},${bas}+interval '1 day','mac','${m2}'::uuid)`)) === 1);
  ok('iç fonksiyonlar istemciye kapalı', await tek(`select count(*) from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ('gorev_olcum','gorev_dogru_satirlari') and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'))`) === '0');
  ok('mac_sonu_ozet: authenticated evet, anon hayır', await tek(`select has_function_privilege('authenticated','public.mac_sonu_ozet(text)','execute')::text||has_function_privilege('anon','public.mac_sonu_ozet(text)','execute')::text`) === 'truefalse');
} catch (e) {
  kaldi++; console.log('  ✗ BEKLENMEDİK HATA:', e.message);
} finally {
  try { await db.sorgu('rollback'); } catch { /* yoksay */ }
  await db.kapat();
}
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
