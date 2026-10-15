// 1108 prova + canlı sonrası kontrol. Kullanım:
//   node araclar/huni-yan-oyun-1108-prova.mjs          → migration'ı tek transaction'da uygular, ölçer, ROLLBACK eder
//   node araclar/huni-yan-oyun-1108-prova.mjs --canli  → migration'ı UYGULAMADAN, canlı durumu aynı kontrollerle ölçer
//                                                         (yazma denemeleri rollback içinde)
import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
const CANLI = process.argv.includes('--canli');
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const satir = (r) => r.satirlar ?? r.rows ?? r;
let kaldi = 0;
const ok = (ad, k, ek = '') => { console.log(k ? '  ✓' : '  ✗', ad, ek); if (!k) kaldi++; };
const ozet = (r) => ({ kohort: r.kohort, adimlar: Object.fromEntries(r.adimlar.map((a) => [a.k, a.taban != null ? `${a.n}/${a.taban}` : a.n])), mac_oynayan: r.mac_oynayan, ilk_terk: r.ilk_terk, terk_toplam: r.terk_toplam, ms: r.sunucu_ms });
try {
  await db.sorgu('begin');
  await db.sorgu(`set local statement_timeout = '20s'`);
  const sahip = satir(await db.sorgu(`select deger->>0 as u from oyun_ayarlari where anahtar='sahip_kullanicilar'`))[0].u;
  const kimlik = (u) => db.sorgu(`select set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true), set_config('request.jwt.claim.sub', '${u}', true)`);
  const funnel = async (g) => JSON.parse(satir(await db.sorgu(`select public.izleme_funnel(${g}) as j`))[0].j);
  await kimlik(sahip);
  if (!CANLI) {
    console.log('ÖNCE (1107):');
    for (const g of [7, 30]) console.log(`  gün=${g}`, JSON.stringify(ozet(await funnel(g))));
    await db.sorgu(fs.readFileSync('supabase/migrations/20260612001108_huni_rakip_terk_yan_oyun_yazma.sql', 'utf8'));
  } else console.log('CANLI (uygulanmış durum):');
  for (const g of [7, 30]) {
    const r = await funnel(g);
    console.log(`  gün=${g}`, JSON.stringify(ozet(r)));
    ok(`gün ${g}: adım 2 = kohort, 3 ≥ 4, sunucu < 300 ms`, r.adimlar[1].n === r.kohort && r.adimlar[2].n >= r.adimlar[3].n && r.sunucu_ms < 300, `${r.sunucu_ms} ms`);
  }
  const ea = satir(await db.sorgu(`explain (analyze) select public.izleme_funnel(30)`)).map((x) => Object.values(x)[0]);
  console.log('  EXPLAIN ANALYZE:', ea.filter((s) => /Execution Time|Planning Time/.test(s)).join(' · '));
  // yetkiler
  const y = satir(await db.sorgu(`select has_function_privilege('anon','public.izleme_funnel(int)','execute') as anon, has_function_privilege('authenticated','public.izleme_funnel(int)','execute') as auth, (select prosecdef from pg_proc where oid='public.izleme_funnel(int)'::regprocedure) as def`))[0];
  ok('anon izleme_funnel çalıştıramaz', y.anon === 'f' || y.anon === false);
  ok('security definer', y.def === 't' || y.def === true);
  await db.sorgu('savepoint a');
  await kimlik('00000000-0000-4000-8000-000000000001');
  let red = false;
  try { await db.sorgu(`select public.izleme_funnel(7)`); } catch (e) { red = /yalnız sahibe/.test(e.message); }
  ok('sahip olmayan 42501 (yalnız sahibe açık)', red);
  await db.sorgu('rollback to savepoint a');
  // yan oyun yazma: authenticated rolüyle
  await kimlik(sahip);
  const kalan = satir(await db.sorgu(`select tablename, policyname from pg_policies where schemaname='public' and policyname in ('races_insert_auth','races_update_auth','error_logs_insert_auth','ghosts_insert_auth','ghosts_update_auth')`));
  ok('beş gevşek politika', kalan.length === 0, kalan.length ? JSON.stringify(kalan) : 'yok');
  const rls = satir(await db.sorgu(`select relname, relrowsecurity as r from pg_class where relnamespace='public'::regnamespace and relname in ('pr_races','pr_error_logs','dg_ghosts')`));
  ok('RLS üç tabloda açık', rls.length === 3 && rls.every((x) => x.r === 't' || x.r === true));
  const oku = satir(await db.sorgu(`select count(*) filter (where cmd='SELECT') as okuma from pg_policies where schemaname='public' and tablename in ('pr_races','dg_ghosts')`))[0];
  ok('okuma politikaları duruyor', Number(oku.okuma) >= 2, `${oku.okuma} SELECT politikası`);
  const sutun = async (t) => satir(await db.sorgu(`select column_name as c from information_schema.columns where table_schema='public' and table_name='${t}' and is_identity='NO' and is_generated='NEVER' order by ordinal_position desc limit 1`))[0].c;
  const cR = await sutun('pr_races'), cG = await sutun('dg_ghosts');
  await db.sorgu('set local role authenticated');
  const dene = async (ad, sql, beklenen) => {
    await db.sorgu('savepoint w');
    let sonuc;
    try { const r = satir(await db.sorgu(sql)); sonuc = { hata: null, n: Number(r[0]?.n ?? 0) }; }
    catch (e) { sonuc = { hata: e.message }; }
    await db.sorgu('rollback to savepoint w');
    ok(ad, beklenen(sonuc), JSON.stringify(sonuc).slice(0, 110));
  };
  const reddi = (s) => !!s.hata && /row-level security|permission denied/i.test(s.hata);
  const sifir = (s) => (!s.hata && Number(s.n ?? 0) === 0) || reddi(s);
  await dene('pr_races insert reddedilir', `with i as (insert into public.pr_races default values returning 1) select count(*) as n from i`, reddi);
  await dene('pr_races update etkilemez', `with u as (update public.pr_races set ${cR} = ${cR} returning 1) select count(*) as n from u`, sifir);
  await dene('pr_error_logs insert reddedilir', `with i as (insert into public.pr_error_logs default values returning 1) select count(*) as n from i`, reddi);
  await dene('dg_ghosts insert reddedilir', `with i as (insert into public.dg_ghosts default values returning 1) select count(*) as n from i`, reddi);
  await dene('dg_ghosts update etkilemez', `with u as (update public.dg_ghosts set ${cG} = ${cG} returning 1) select count(*) as n from u`, sifir);
  await db.sorgu('reset role');
  await db.sorgu('rollback');
  console.log('ROLLBACK edildi.');
  process.exit(kaldi ? 1 : 0);
} catch (e) { console.error('HATA:', e.message); try { await db.sorgu('rollback'); } catch {} process.exit(1); }
