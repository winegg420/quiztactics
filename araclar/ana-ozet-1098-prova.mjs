// 1098 provası: migration + karşılaştırma TEK transaction'da, sonunda ROLLBACK (canlıya kalıcı hiçbir şey yazılmaz).
// Her anahtar, aynı kullanıcı olarak tek tek çağrılan mevcut fonksiyonun sonucuyla birebir karşılaştırılır.
//   node araclar/ana-ozet-1098-prova.mjs
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let hata = 0;
const sonuc = (ad, tamam, ek = "") => { if (!tamam) hata++; console.log(`${tamam ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); };
const q = async (s) => { const r = await db.sorgu(s); return r.rows ?? r; };
const hataMi = async (s) => {
  await q("savepoint s");
  try { await q(s); await q("release savepoint s"); return null; } catch (e) { await q("rollback to savepoint s"); return String(e?.message ?? e); }
};
const TEK = ["dm_okunmamis_sayim", "posta_kutusu", "sezon_ozetim", "bekleyen_sayim", "sezon_yolu_durumum", "gorevlerim", "lig_grubum_ozet"];
const TABLO = ["coin_bakiyem", "bekleyen_davetlerim", "avatar_nadirlik_renkleri", "seri_durumum"];

try {
  await q("set statement_timeout = '15s'");
  await q("begin");
  await q(fs.readFileSync("supabase/migrations/20260612001098_ana_sayfa_ozet.sql", "utf8"));
  sonuc("migration çalıştı", true);
  const [kisi] = await q("select id from public.profiles where not coalesce(is_bot,false) order by last_seen desc nulls last limit 1");

  await q(`select set_config('request.jwt.claims', '{"role":"anon"}', true), set_config('role', 'anon', true)`);
  sonuc("anon çağıramaz", /permission denied/.test((await hataMi("select public.ana_sayfa_ozet('kabuk')")) ?? ""));

  await q(`select set_config('request.jwt.claims', '{"sub":"${kisi.id}","role":"authenticated"}', true), set_config('role', 'authenticated', true)`);
  const t0 = Date.now();
  const [k] = await q("select public.ana_sayfa_ozet('kabuk') as v");
  const t1 = Date.now();
  const [a] = await q("select public.ana_sayfa_ozet('ana') as v");
  const t2 = Date.now();
  const ozet = { ...(typeof k.v === "string" ? JSON.parse(k.v) : k.v), ...(typeof a.v === "string" ? JSON.parse(a.v) : a.v) };
  console.log(`  süre: kabuk ${t1 - t0} ms · ana ${t2 - t1} ms`);
  sonuc("bilinmeyen kapsam boş", ["{}", "\"{}\""].includes(JSON.stringify((await q("select public.ana_sayfa_ozet('x')::text as v"))[0].v).replace(/ /g, "")));
  sonuc("kalp_at / rozet_bildirimlerim / cihaz_bildir yok", !("rozet_bildirimlerim" in ozet) && !("kalp_at" in ozet) && !("cihaz_bildir" in ozet));
  for (const ad of [...TEK, ...TABLO]) {
    const sql = TEK.includes(ad) ? `select to_jsonb(public.${ad}()) as v` : `select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as v from public.${ad}() t`;
    const [d] = await q(sql);
    const tek = typeof d.v === "string" ? JSON.parse(d.v) : d.v;
    // gorevlerim / sezon_yolu_durumum anlık zaman alanı taşıyabilir → zaman damgaları ayıklanarak karşılaştırılır
    const temiz = (x) => JSON.stringify(x ?? null).replace(/"\d{4}-\d\d-\d\dT[\d:.+Z-]+"/g, '"t"');
    sonuc(`${ad} aynı`, ad in ozet && temiz(ozet[ad]) === temiz(tek), ad in ozet ? "" : "anahtar yok");
  }
} catch (e) {
  hata++;
  console.log("✗ beklenmeyen hata:", e.message);
} finally {
  try { await q("rollback"); } finally { await db.kapat?.(); }
  console.log(hata ? `\n${hata} HATA` : "\nPROVA TEMİZ (ROLLBACK)");
  process.exit(hata ? 1 : 0);
}
