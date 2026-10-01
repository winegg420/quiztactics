// Avatar nadirlik verisi + bayrak (770) provası — tek transaction, sonunda ROLLBACK.
// Kullanım: node araclar/avatar-770-sql-testi.mjs [supabase/migrations/...770....sql]  (verilirse önce uygulanır)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIGLER = process.argv.slice(2);
const A = '5b555bd3-9371-4f35-90a5-39289111335e';   // insan test hesabı (sahip değil)
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);
const PASIFLER = ['sakalli-y07', 'sporcu-y09', 'ogrenci-y10', 'veteriner-y13', 'android-y32', 'kasli-sampiyon-y33', 'demir-pazi-y34', 'fitness-kralicesi-y35'];
try {
  await db.sorgu('begin');
  const once = await db.sorgu(`select anahtar, nadirlik, seri, edinme, acilis_zamani from avatar_nitelikleri order by anahtar`);
  const katOnce = await tek(`select md5(string_agg(anahtar || coalesce(nadirlik,''), ',' order by anahtar)) from avatar_katalogu`);
  for (const m of MIGLER) await db.sorgu(fs.readFileSync(m, 'utf8'));
  const dag = async (aktif) => (await tek(`select string_agg(nadirlik || ' ' || n, ' · ' order by nadirlik) from (select n.nadirlik, count(*) n from avatar_nitelikleri n left join avatar_katalogu k on k.url=n.url where ${aktif ? 'coalesce(k.aktif,true)' : 'not coalesce(k.aktif,true)'} group by n.nadirlik) t`));
  ok('aktif 62: Yaygın 21 · Nadir 15 · Epik 18 · Efsanevi 8', await dag(true) === 'efsanevi 8 · epik 18 · nadir 15 · yaygin 21', await dag(true));
  const sonra = await db.sorgu(`select anahtar, nadirlik, seri, edinme, acilis_zamani from avatar_nitelikleri order by anahtar`);
  const eski = new Map((once.rows ?? once).map((r) => [r.anahtar, r]));
  ok('70 satır', (sonra.rows ?? sonra).length === 70);
  ok('pasif 8 satır değişmedi', (sonra.rows ?? sonra).filter((r) => PASIFLER.includes(r.anahtar)).every((r) => r.nadirlik === eski.get(r.anahtar).nadirlik) && PASIFLER.length === 8);
  ok('seri / edinme / acilis_zamani değişmedi', (sonra.rows ?? sonra).every((r) => { const e = eski.get(r.anahtar); return r.seri === e.seri && r.edinme === e.edinme && String(r.acilis_zamani) === String(e.acilis_zamani); }));
  ok('katalog nadirlik kolonu (Koleksiyon Puanı) değişmedi', await tek(`select md5(string_agg(anahtar || coalesce(nadirlik,''), ',' order by anahtar)) from avatar_katalogu`) === katOnce);
  ok('bayrak açık', (await tek(`select deger #>> '{}' from oyun_ayarlari where anahtar='avatar_nadirlik_renk'`)) === 'true');
  await db.sorgu(`select set_config('request.jwt.claim.sub', '${A}', true), set_config('request.jwt.claims', '{"sub":"${A}","role":"authenticated"}', true)`);
  ok('renk RPC 70 satır döner', await tek('select count(*) from avatar_nadirlik_renkleri()') === '70');
  const ornekSatir = await db.sorgu(`select anahtar, nadirlik from avatar_nitelikleri where anahtar in ('kedi-k01','profesor-k24','uzayli-k16','kral-k31','pilot-y38','kedili-genc-y36')`);
  const ornek = Object.fromEntries((ornekSatir.rows ?? ornekSatir).map((r) => [r.anahtar, r.nadirlik]));
  ok('örnekler: Kedi yaygın · Kral nadir · Kedili Genç nadir · Pilot epik · Profesör ve Uzaylı efsanevi',
    ornek['kedi-k01'] === 'yaygin' && ornek['kral-k31'] === 'nadir' && ornek['kedili-genc-y36'] === 'nadir' && ornek['pilot-y38'] === 'epik' && ornek['profesor-k24'] === 'efsanevi' && ornek['uzayli-k16'] === 'efsanevi');
  // ikinci uygulama aynı sonucu verir (tekrar çalıştırılabilir)
  for (const m of MIGLER) await db.sorgu(fs.readFileSync(m, 'utf8'));
  ok('tekrar çalıştırılınca aynı dağılım', await dag(true) === 'efsanevi 8 · epik 18 · nadir 15 · yaygin 21');
} finally {
  try { await db.sorgu('rollback'); } finally { await db.kapat(); }
}
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
