// 1099 provası: TEK transaction — önce eski fonksiyonların çıktısı alınır, migration uygulanır, aynı çağrılar
// önbellekli yeni gövdeyle tekrarlanır ve birebir karşılaştırılır; geri alma dosyası da denenir. Sonda ROLLBACK.
//   node araclar/kategori-havuz-1099-prova.mjs
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let hata = 0;
const sonuc = (ad, tamam, ek = "") => { if (!tamam) hata++; console.log(`${tamam ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); };
const q = async (s) => { const r = await db.sorgu(s); return r.rows ?? r; };
const ben = (id) => q(`select set_config('request.jwt.claims', '{"sub":"${id}","role":"authenticated"}', true), set_config('role', 'authenticated', true)`);
const yonetici = () => q(`select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true)`);
// Süre SUNUCUDA ölçülür (EXPLAIN ANALYZE "Execution Time"); ağ gidiş-dönüşü (~80 ms) karışmasın.
const sunucuMs = async (s) => {
  const r = await q(`explain (analyze, timing off) ${s}`);
  const m = r.map((x) => Object.values(x)[0]).join(" ").match(/Execution Time: ([\d.]+)/);
  return m ? Number(m[1]) : NaN;
};
const sure = async (s) => [await q(s), await sunucuMs(s)];

async function topla(kisiler, katlar) {
  const o = { liste: {}, uygun: {}, havuz: {}, evrensel: {}, ms: { liste: 0, uygun: 0, havuz: 0 } };
  for (const [ad, id] of Object.entries(kisiler)) {
    await ben(id);
    const [l, t1] = await sure("select * from public.get_categories()");
    const [u, t2] = await sure("select public.kategori_mac_uygunlar()::text as v");
    o.liste[ad] = JSON.stringify(l); o.uygun[ad] = u[0].v; o.ms.liste += t1; o.ms.uygun += t2;
  }
  await yonetici();
  const takimlar = { tr: [kisiler.tr], en: [kisiler.en], ikisi: [kisiler.tr, kisiler.en] };
  for (const serbest of ["", "serbest"]) {
    await q(`select set_config('app.soru_havuzu', '${serbest}', true)`);
    for (const k of katlar) for (const [ta, ids] of Object.entries(takimlar)) {
      const [r, t] = await sure(`select public.kategori_mac_havuzu('${k}', array[${ids.map((x) => `'${x}'`).join(",")}]::uuid[]) as v`);
      o.havuz[`${serbest}|${k}|${ta}`] = r[0].v; o.ms.havuz += t;
    }
  }
  await q("select set_config('app.soru_havuzu', '', true)");
  for (const k of [...katlar, "genel", "yok_kategori"]) o.evrensel[k] = (await q(`select public.kategori_evrensel_yeterli('${k}') as v`))[0].v;
  return o;
}

try {
  await q("set statement_timeout = '60s'");
  await q("begin");
  const katlar = (await q("select distinct kategori from public.questions where aktif and kategori not in ('genel','karisik') order by 1")).map((r) => r.kategori);
  const [tr] = await q("select id from public.profiles where not coalesce(is_bot,false) and coalesce(dil,'tr')='tr' and coalesce(upper(ulke),'TR')='TR' order by last_seen desc nulls last limit 1");
  const [en] = await q("select id from public.profiles where not coalesce(is_bot,false) and dil='en' order by last_seen desc nulls last limit 1");
  const kisiler = { tr: tr.id, en: en.id };

  const once = await topla(kisiler, katlar);
  await q(fs.readFileSync("supabase/migrations/20260612001099_kategori_havuz_onbellek.sql", "utf8"));
  sonuc("migration çalıştı", true);
  const [s] = await q("select count(*)::int n, count(distinct tur)::int t from public.kategori_havuz_onbellek");
  sonuc("önbellek doldu", Number(s.n) > 0 && Number(s.t) === 3, `${s.n} satır`);
  const [y, ty] = await sure("select public.kategori_havuz_yenile() as v");
  console.log(`  yenileme süresi: ${ty} ms (${y[0].v} satır)`);
  const sonra = await topla(kisiler, katlar);

  for (const ad of Object.keys(kisiler)) {
    sonuc(`get_categories aynı (${ad})`, once.liste[ad] === sonra.liste[ad]);
    sonuc(`kategori_mac_uygunlar aynı (${ad})`, once.uygun[ad] === sonra.uygun[ad], sonra.uygun[ad]);
  }
  const farkH = Object.keys(once.havuz).filter((k) => once.havuz[k] !== sonra.havuz[k]);
  sonuc(`kategori_mac_havuzu aynı (${Object.keys(once.havuz).length} durum)`, farkH.length === 0, farkH.slice(0, 5).join(", "));
  const farkE = Object.keys(once.evrensel).filter((k) => once.evrensel[k] !== sonra.evrensel[k]);
  sonuc("kategori_evrensel_yeterli aynı", farkE.length === 0, farkE.join(", "));
  console.log(`  süre önce → sonra (toplam): get_categories ${once.ms.liste} → ${sonra.ms.liste} ms · uygunlar ${once.ms.uygun} → ${sonra.ms.uygun} ms · havuz ×${Object.keys(once.havuz).length} ${once.ms.havuz} → ${sonra.ms.havuz} ms`);

  // İstemci önbellek tablosunu göremez
  await ben(kisiler.tr);
  await q("savepoint s");
  let red = null;
  try { await q("select * from public.kategori_havuz_onbellek"); } catch (e) { red = e.message; }
  await q("rollback to savepoint s");
  sonuc("oyuncu önbellek tablosunu okuyamaz", /permission denied/.test(red ?? ""), red ?? "okudu!");
  await yonetici();

  // Önbellek eskiyince canlı sayıma düşer (aynı sonuç)
  await q("update public.kategori_havuz_onbellek set guncellendi = now() - interval '1 hour'");
  const eski = await topla(kisiler, katlar);
  sonuc("eski önbellekte canlı sayım aynı", JSON.stringify(eski.havuz) === JSON.stringify(once.havuz) && eski.liste.tr === once.liste.tr && eski.liste.en === once.liste.en);

  // Geri alma dosyası
  await q(fs.readFileSync("docs/kategori-havuz-1099-geri-al.sql", "utf8"));
  const geri = await topla(kisiler, katlar);
  sonuc("geri alma sonrası aynı", JSON.stringify(geri.havuz) === JSON.stringify(once.havuz) && geri.uygun.tr === once.uygun.tr);
  sonuc("geri almada tablo kalktı", (await q("select to_regclass('public.kategori_havuz_onbellek') as v"))[0].v === null);
} catch (e) {
  hata++;
  console.log("✗ beklenmeyen hata:", e.message);
} finally {
  try { await q("rollback"); } finally { await db.kapat?.(); }
  console.log(hata ? `\n${hata} HATA` : "\nPROVA TEMİZ (ROLLBACK)");
  process.exit(hata ? 1 : 0);
}
