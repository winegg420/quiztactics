// 1107 prova: migration'ı tek transaction'da uygular, sahip kimliğiyle fonksiyonu çağırır (7 ve 30 gün), sahip
// değilken reddini, anon/PUBLIC yetkisini ve EXPLAIN ANALYZE süresini ölçer; ROLLBACK eder (canlıya yazmaz).
// Kullanım: node araclar/izleme-funnel-1107-prova.mjs
import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const satir = (r) => r.satirlar ?? r.rows ?? r;
let kaldi = 0;
const ok = (ad, k, ek = '') => { console.log(k ? '  ✓' : '  ✗', ad, ek); if (!k) kaldi++; };
try {
  await db.sorgu('begin');
  await db.sorgu(`set local statement_timeout = '20s'`);
  await db.sorgu(fs.readFileSync('supabase/migrations/20260612001107_izleme_funnel.sql', 'utf8'));
  const sahip = satir(await db.sorgu(`select deger->>0 as u from oyun_ayarlari where anahtar='sahip_kullanicilar'`))[0].u;
  const kimlik = (u) => db.sorgu(`select set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true), set_config('request.jwt.claim.sub', '${u}', true)`);
  // yetkiler (fonksiyon tanımı üzerinden; rol değiştirmeden)
  const y = satir(await db.sorgu(`select has_function_privilege('anon','public.izleme_funnel(int)','execute') as anon, has_function_privilege('authenticated','public.izleme_funnel(int)','execute') as auth`))[0];
  ok('anon çağıramaz', y.anon === 'f' || y.anon === false);
  ok('authenticated execute (içeride sahip kapısı)', y.auth === 't' || y.auth === true);
  // sahip değil → 42501
  await db.sorgu('savepoint a');
  await kimlik('00000000-0000-4000-8000-000000000001');
  let red = false;
  try { await db.sorgu(`select public.izleme_funnel(7)`); } catch (e) { red = /yalnız sahibe/.test(e.message); }
  ok('sahip olmayan reddedildi', red);
  await db.sorgu('rollback to savepoint a');
  // sahip
  await kimlik(sahip);
  for (const g of [7, 30]) {
    const r = JSON.parse(satir(await db.sorgu(`select public.izleme_funnel(${g}) as j`))[0].j);
    console.log(`  gün=${g}`, JSON.stringify({ kohort: r.kohort, haric: r.haric, adimlar: r.adimlar.map((a) => `${a.k}:${a.n}${a.taban != null ? '/' + a.taban : ''}`), mac_oynayan: r.mac_oynayan, ilk_mod: r.ilk_mod, ilk_terk: r.ilk_terk, terk_toplam: r.terk_toplam, sunucu_ms: r.sunucu_ms }));
    ok(`gün ${g}: adım 2 = kohort, 3 ≥ 4`, r.adimlar[1].n === r.kohort && r.adimlar[2].n >= r.adimlar[3].n && r.adimlar[2].n <= r.kohort);
    ok(`gün ${g}: sunucu < 300 ms`, r.sunucu_ms < 300, `${r.sunucu_ms} ms`);
  }
  const ea = satir(await db.sorgu(`explain (analyze) select public.izleme_funnel(30)`)).map((x) => Object.values(x)[0]);
  console.log('  EXPLAIN ANALYZE:', ea.filter((s) => /Execution Time|Planning Time/.test(s)).join(' · '));
  await db.sorgu('rollback');
  console.log('ROLLBACK edildi.');
  process.exit(kaldi ? 1 : 0);
} catch (e) { console.error('HATA:', e.message); try { await db.sorgu('rollback'); } catch {} process.exit(1); }
