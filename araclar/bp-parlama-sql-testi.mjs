// BP parlaması (1061) — tek transaction, sonunda ROLLBACK (canlıya HİÇBİR ŞEY yazılmaz). Tek prova, döngü yok.
// Sınar: prestij tablosu/RPC/ayarları yok · oyuncu_kartlari.bp_parlama var, avatar_prestij yok · bp_parlama = sezon_bp
// (aktif sezonun BP sahibi) · gizli botta false · lig_grubum_ozet satırında bp_parlama.
// Kullanım: node araclar/bp-parlama-sql-testi.mjs  (migration canlıdaysa --canli: yalnız okur, yeniden uygulamaz)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIG = 'supabase/migrations/20260612001061_bp_parlama_prestij_kaldir.sql';
const CANLI = process.argv.includes('--canli');

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);

try {
  await db.sorgu('begin');
  await db.sorgu(`set local lock_timeout = '5s'`);
  await db.sorgu(`set local statement_timeout = '60s'`);
  if (!CANLI) await db.sorgu(fs.readFileSync(MIG, 'utf8'));
  ok('oyuncu_avatar_prestij tablosu yok', (await tek(`select to_regclass('public.oyuncu_avatar_prestij') is null`)) === 't');
  ok('avatar_prestij_al RPC yok', (await tek(`select count(*) from pg_proc where proname = 'avatar_prestij_al'`)) === '0');
  ok('prestij ayarları yok', (await tek(`select count(*) from oyun_ayarlari where anahtar like 'avatar_prestij%'`)) === '0');
  ok('canlı fonksiyonlarda "prestij" yok', (await tek(`select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and pg_get_functiondef(p.oid) ilike '%prestij%' and p.prokind = 'f'`)) === '0');
  const donus = await tek(`select pg_get_function_result('public.oyuncu_kartlari(uuid[])'::regprocedure)`);
  ok('oyuncu_kartlari: bp_parlama var, avatar_prestij yok', donus.includes('bp_parlama boolean') && !donus.includes('prestij'));
  ok('oyuncu_kartlari anon\'a kapalı', (await tek(`select has_function_privilege('anon', 'public.oyuncu_kartlari(uuid[])', 'execute')`)) === 'f');
  // Okuma: kart = sahip olduğu için auth.uid() gerekir → bir oyuncu adına (yalnız bu transaction'da)
  const ben = await tek(`select id::text from profiles where not coalesce(is_bot, false) order by created_at limit 1`);
  await db.sorgu(`select set_config('request.jwt.claim.sub', '${ben}', true), set_config('request.jwt.claims', '{"sub":"${ben}","role":"authenticated"}', true)`);
  const fark = await tek(`select count(*) from oyuncu_kartlari((select array_agg(id) from (select id from profiles where not coalesce(is_bot,false)
      order by (exists (select 1 from oyuncu_bp_sahipligi b where b.user_id = profiles.id)) desc, created_at desc limit 200) x)) k
      where k.bp_parlama is distinct from k.sezon_bp`);
  ok('insanlarda bp_parlama = aktif sezon BP sahipliği (sezon_bp)', fark === '0', fark);
  const sahip = await tek(`select count(*) from oyuncu_kartlari((select array_agg(b.user_id) from (select distinct b.user_id from oyuncu_bp_sahipligi b
      join sezonlar s on s.id = b.sezon where b.aktif and s.kapandi_at is null and not s.test limit 200) b)) k where k.bp_parlama`);
  console.log('  · aktif sezon BP sahibi (parlayan):', sahip);
  const bot = await tek(`select count(*) from oyuncu_kartlari((select array_agg(id) from (select id from profiles where is_bot limit 200) x)) k where k.bp_parlama`);
  ok('gizli/açık botlarda bp_parlama false', bot === '0', bot);
  const lig = await tek(`select coalesce((select bool_and(s ? 'bp_parlama') and bool_and(not s ? 'avatar_prestij') from jsonb_array_elements(lig_grubum_ozet()->'satirlar') s), true)`);
  ok('lig_grubum_ozet satırlarında bp_parlama', lig === 't');
} catch (e) {
  kaldi++; console.log('  ✗ HATA', e.message);
} finally {
  await db.sorgu('rollback').catch(() => {});
  console.log(`\n${gecti} geçti · ${kaldi} kaldı (ROLLBACK)`);
  process.exit(kaldi ? 1 : 0);
}
