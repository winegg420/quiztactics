// 1101 provası: TEK transaction, sonda ROLLBACK. soru_sayac kuyruğa yazar mı, questions'a dokunmuyor mu, boşaltma soru başına
// doğru toplamı yazıyor mu, istemci kuyruğu göremiyor mu, geri alma eski davranışa dönüyor mu.
//   node araclar/soru-sayac-1101-prova.mjs
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let hata = 0;
const sonuc = (ad, tamam, ek = "") => { if (!tamam) hata++; console.log(`${tamam ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); };
const q = async (s) => { const r = await db.sorgu(s); return r.rows ?? r; };
const sayac = async (id) => { const r = (await q(`select cevap_sayisi::int c, dogru_sayisi::int d from public.questions where id = '${id}'`))[0]; return { c: Number(r.c), d: Number(r.d) }; };
try {
  await q("set statement_timeout = '20s'");
  await q("begin");
  const [s1, s2] = (await q("select id from public.questions where aktif order by id limit 2")).map((r) => r.id);
  const once1 = await sayac(s1), once2 = await sayac(s2);
  await q(fs.readFileSync("supabase/migrations/20260612001101_soru_sayac_kuyruk.sql", "utf8"));
  sonuc("migration çalıştı", true);
  for (const [id, dogru] of [[s1, true], [s1, false], [s1, true], [s2, false], [null, true]]) await q(`select public.soru_sayac(${id ? `'${id}'` : "null"}, ${dogru})`);
  const ara1 = await sayac(s1);
  sonuc("cevap anında questions değişmedi", ara1.c === once1.c && ara1.d === once1.d);
  sonuc("kuyrukta 4 satır (null soru atlandı)", Number((await q("select count(*) n from public.soru_sayac_kuyruk"))[0].n) === 4);
  const [b] = await q("select public.soru_sayac_bosalt() as n");
  sonuc("boşaltma 2 soruyu güncelledi", Number(b.n) === 2);
  const son1 = await sayac(s1), son2 = await sayac(s2);
  sonuc("s1: +3 cevap, +2 doğru", son1.c === once1.c + 3 && son1.d === once1.d + 2, JSON.stringify([once1, son1]));
  sonuc("s2: +1 cevap, +0 doğru", son2.c === once2.c + 1 && son2.d === once2.d, JSON.stringify([once2, son2]));
  sonuc("kuyruk boşaldı", Number((await q("select count(*) n from public.soru_sayac_kuyruk"))[0].n) === 0);
  sonuc("cron kaydı", Number((await q("select count(*) n from cron.job where jobname = 'bildim-soru-sayac'"))[0].n) === 1);
  await q("savepoint y");
  await q(`select set_config('role', 'authenticated', true)`);
  let red = null; try { await q("select * from public.soru_sayac_kuyruk"); } catch (e) { red = e.message; }
  await q("rollback to savepoint y");
  sonuc("oyuncu kuyruğu okuyamaz", /permission denied/.test(red ?? ""), red ?? "okudu!");
  await q("select set_config('role', 'postgres', true)");
  await q(`select public.soru_sayac('${s1}', true)`);
  await q(fs.readFileSync("docs/soru-sayac-1101-geri-al.sql", "utf8"));
  const geri1 = await sayac(s1);
  sonuc("geri alma: kuyruktaki sayım yazıldı", geri1.c === son1.c + 1 && geri1.d === son1.d + 1);
  await q(`select public.soru_sayac('${s1}', false)`);
  const geri2 = await sayac(s1);
  sonuc("geri alma: eski doğrudan UPDATE", geri2.c === geri1.c + 1 && geri2.d === geri1.d);
  sonuc("geri alma: tablo kalktı", (await q("select to_regclass('public.soru_sayac_kuyruk') v"))[0].v === null);
} catch (e) { hata++; console.log("✗ beklenmeyen hata:", e.message); }
finally {
  try { await q("rollback"); } finally { await db.kapat?.(); }
  console.log(hata ? `\n${hata} HATA` : "\nPROVA TEMİZ (ROLLBACK)");
  process.exit(hata ? 1 : 0);
}
