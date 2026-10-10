// Maç sonu SP özeti (sezon_mac_sp_ozetim) + BP tanıtım (bp_tanitim_gosterilsin_mi) SQL provası — tek transaction, sonunda ROLLBACK.
// Kullanım: node araclar/mac-sonu-sp-sql-testi.mjs [supabase/migrations/...1050....sql]  (verilirse önce uygulanır)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIGLER = process.argv.slice(2);
const A = 'a01300be-dd94-42d7-814d-197b8555a7d5';
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
const tek = (s) => db.tek(s);
const js = async (s) => JSON.parse(await tek(s));
const ayar = (k, v) => db.sorgu(`update oyun_ayarlari set deger = '${v}'::jsonb where anahtar = '${k}'`);
try {
  await db.sorgu('begin');
  for (const m of MIGLER) await db.sorgu(fs.readFileSync(m, 'utf8'));
  await ayar('sezon_yolu_acik', 'true');
  await db.sorgu(`select sezon_tik()`);
  await db.sorgu(`delete from oyuncu_bp_sahipligi where user_id = '${A}'`);
  await db.sorgu(`delete from bp_tanitim_gosterimleri where user_id = '${A}'`);
  await ben(A);
  const sezon = await tek(`select id from sezonlar where kapandi_at is null and not test limit 1`);
  await db.sorgu(`update oyuncu_sezon_puani set sp = 0, seviye = 0 where sezon = ${sezon} and user_id = '${A}'`);
  await db.sorgu(`delete from sezon_puan_hareketleri where sezon = ${sezon} and user_id = '${A}'`);

  console.log('— maç sonu SP özeti');
  ok('SP yokken kazanilan 0', (await js(`select sezon_mac_sp_ozetim('m-yok')::text`)).kazanilan === 0);
  await tek(`select sezon_puani_ekle('${A}', 'mac', 'mac:m-1', 20)`);
  let o = await js(`select sezon_mac_sp_ozetim('m-1')::text`);
  ok('+20 SP, öncesi 0 sonrası 20, seviye atlama yok', o.kazanilan === 20 && o.sp_once === 0 && o.sp_sonra === 20 && o.seviye_sonra === o.seviye_once && o.atlandi === false, JSON.stringify(o));
  ok('kalan = sonraki eşik - SP', o.kalan === o.sonra_ust - 20, JSON.stringify(o));
  await db.sorgu(`update oyuncu_sezon_puani set sp = 90 where sezon = ${sezon} and user_id = '${A}'`);
  await tek(`select sezon_puani_ekle('${A}', 'duello', 'duello:d-1', 20)`);
  o = await js(`select sezon_mac_sp_ozetim('d-1')::text`);
  ok('düello referansı: seviye atladı (0→1), ücretsiz ödül listesi', o.atlandi === true && o.seviye_once === 0 && o.seviye_sonra === 1 && o.oduller.length === 1 && o.oduller[0].kol === 'ucretsiz' && o.oduller[0].seviye === 1, JSON.stringify(o));
  await tek(`select sezon_puani_ekle('${A}', 'mac', 'kasa:k-1', 10)`);
  ok('kasa referansı bulunur', (await js(`select sezon_mac_sp_ozetim('k-1')::text`)).kazanilan === 10);
  await tek(`select sezon_puani_ekle('${A}', 'turnuva', 'turnuva:t-1', 15)`);
  ok('turnuva referansı bulunur', (await js(`select sezon_mac_sp_ozetim('t-1')::text`)).kazanilan === 15);
  ok('başkasının/uydurma referans 0', (await js(`select sezon_mac_sp_ozetim('baska')::text`)).kazanilan === 0);
  await ayar('sezon_yolu_acik', 'false');
  ok('sezon kapalıyken görünmez', (await js(`select sezon_mac_sp_ozetim('m-1')::text`)).gorunur === false);
  await ayar('sezon_yolu_acik', 'true');

  console.log('— BP tanıtım');
  let t = await js(`select bp_tanitim_gosterilsin_mi()::text`);
  ok('ilk çağrı: göster + gerçek veri', t.goster === true && t.fiyat === 500 && t.ucretli_odul_sayisi > 0 && Number(t.sp_carpan) > 1, JSON.stringify(t));
  ok('aynı gün ikinci çağrı: gösterme', (await js(`select bp_tanitim_gosterilsin_mi()::text`)).goster === false);
  await db.sorgu(`update bp_tanitim_gosterimleri set son_tarih = son_tarih - 1 where user_id = '${A}'`);
  ok('ertesi gün tekrar gösterilir', (await js(`select bp_tanitim_gosterilsin_mi()::text`)).goster === true);
  await db.sorgu(`update bp_tanitim_gosterimleri set son_tarih = son_tarih - 1 where user_id = '${A}'`);
  await db.sorgu(`insert into oyuncu_bp_sahipligi (sezon, user_id, aktif, fiyat_elmas) values (${sezon}, '${A}', true, 500)`);
  ok('BP sahibine gösterilmez', (await js(`select bp_tanitim_gosterilsin_mi()::text`)).goster === false);
  await db.sorgu(`delete from oyuncu_bp_sahipligi where user_id = '${A}'`);
  await ayar('sezon_yolu_acik', 'false');
  await db.sorgu(`update bp_tanitim_gosterimleri set son_tarih = son_tarih - 1 where user_id = '${A}'`);
  ok('sezon sistemi kapalıyken gösterilmez', (await js(`select bp_tanitim_gosterilsin_mi()::text`)).goster === false);

  console.log('— yetkiler');
  const yet = await js(`select json_build_object(
    'anon_o', has_function_privilege('anon', 'public.sezon_mac_sp_ozetim(text)', 'execute'),
    'auth_o', has_function_privilege('authenticated', 'public.sezon_mac_sp_ozetim(text)', 'execute'),
    'anon_t', has_function_privilege('anon', 'public.bp_tanitim_gosterilsin_mi()', 'execute'),
    'auth_t', has_function_privilege('authenticated', 'public.bp_tanitim_gosterilsin_mi()', 'execute'),
    'tablo', has_table_privilege('authenticated', 'public.bp_tanitim_gosterimleri', 'select'),
    'rls', (select relrowsecurity from pg_class where oid = 'public.bp_tanitim_gosterimleri'::regclass))::text`);
  ok('anon çağıramaz, authenticated çağırır', !yet.anon_o && yet.auth_o && !yet.anon_t && yet.auth_t, JSON.stringify(yet));
  ok('tablo RLS açık, istemci okuyamaz', yet.rls === true && yet.tablo === false);
} catch (e) { kaldi++; console.log('  ✗ HATA', e.message); }
finally { try { await db.sorgu('rollback'); } catch {} await db.kapat?.(); }
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
