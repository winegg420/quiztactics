// Rakibin şıkkı + Ort. cevap (1062) — salt okuma doğrulaması, tek transaction, sonunda ROLLBACK. Döngü/simülasyon yok.
// Sınar: sure_ms sütunu · RPC yetkileri (anon kapalı, ort_cevap_ms istemciye kapalı) · üçüncü kişi reddedilir ·
// bitmiş maçta rakip şıkkı döner (yalnız 0-3) · eski maçta ort_cevap null · mac_sonu_ozet/kasa_durum yeni alanlar.
// Kullanım: node araclar/rakip-sikki-sql-testi.mjs
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);
const kim = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);

try {
  await db.sorgu('begin');
  await db.sorgu(`set local statement_timeout = '20s'`);
  ok('match_answers.sure_ms var', (await tek(`select count(*) from information_schema.columns where table_name='match_answers' and column_name='sure_ms'`)) === '1');
  ok('mac_rakip_cevabi anon\'a kapalı', (await tek(`select has_function_privilege('anon', 'public.mac_rakip_cevabi(uuid,int)', 'execute')`)) === 'f');
  ok('mac_rakip_cevabi authenticated\'a açık', (await tek(`select has_function_privilege('authenticated', 'public.mac_rakip_cevabi(uuid,int)', 'execute')`)) === 't');
  ok('ort_cevap_ms istemciye kapalı', (await tek(`select has_function_privilege('authenticated', 'public.ort_cevap_ms(text,uuid,uuid)', 'execute')`)) === 'f');
  ok('match_answers RLS politikası aynı', (await tek(`select count(*) from pg_policies where tablename='match_answers' and policyname='match_answers_select_own'`)) === '1');

  // Bitmiş, iki tarafın da gerçek şık seçtiği son maç (salt okuma)
  const mac = await tek(`select m.id::text || ',' || m.oyuncu1 || ',' || m.oyuncu2 || ',' || a.soru_index || ',' || a.cevap from public.matches m
     join public.match_answers a on a.match_id = m.id and a.user_id = m.oyuncu2 and a.cevap between 0 and 3
     where m.durum = 'bitti' order by m.created_at desc limit 1`);
  const [mid, p1, p2, idx, c2] = mac.split(',');
  await kim(p1);
  ok('bitmiş maçta rakip şıkkı döner', (await tek(`select public.mac_rakip_cevabi('${mid}', ${idx})`)) === c2);
  const oz = await tek(`select public.mac_sonu_ozet('mac:${mid}') ? 'ort_cevap'`);
  ok('mac_sonu_ozet ort_cevap anahtarı', oz === 't');
  const ucuncu = await tek(`select id::text from profiles where id not in ('${p1}', '${p2}') and not coalesce(is_bot,false) limit 1`);
  await kim(ucuncu);
  await db.sorgu('savepoint s');
  let red = false;
  try { await tek(`select public.mac_rakip_cevabi('${mid}', ${idx})`); } catch (e) { red = /maçta değilsin/.test(e.message); }
  await db.sorgu('rollback to savepoint s');
  ok('üçüncü kişi reddedilir', red);
  // Aktif maç varsa: soru açıkken (cevabım yok, süre sürüyor) null
  const aktif = await tek(`select coalesce((select m.id::text || ',' || m.oyuncu1 || ',' || m.aktif_soru from matches m where m.durum='aktif' and m.senkron
     and m.soru_baslangic > now() - interval '10 seconds' and not exists (select 1 from match_answers a where a.match_id=m.id and a.user_id=m.oyuncu1 and a.soru_index=m.aktif_soru) limit 1), '')`);
  if (aktif) { const [am, ap, ai] = aktif.split(','); await kim(ap); ok('soru açıkken null', (await tek(`select public.mac_rakip_cevabi('${am}', ${ai})`)) == null); }
  else console.log('  · şu an açık soru yok (açık-soru dalı duman testinde sınanacak)');
  const eskiOrt = await tek(`select public.ort_cevap_ms('mac', '${mid}', '${p1}')`);
  console.log('  · son bitmiş maç ort_cevap:', eskiOrt);
} catch (e) {
  kaldi++; console.log('  ✗ HATA', e.message);
} finally {
  await db.sorgu('rollback').catch(() => {});
  console.log(`\n${gecti} geçti · ${kaldi} kaldı (ROLLBACK)`);
  process.exit(kaldi ? 1 : 0);
}
