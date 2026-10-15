// 1110 + 1111 provası (canlı, tek işlem + ROLLBACK; yük yok). Kullanım: node araclar/duzeltme-1110-1111-prova.mjs
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";
const satir = (r) => r.satirlar ?? r.rows ?? r;
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let hata = 0;
const kontrol = (ad, k) => { console.log(`${k ? "✓" : "✗"} ${ad}`); if (!k) hata++; };
try {
  await db.sorgu("begin");
  const yetki = async () => JSON.stringify(satir(await db.sorgu(`select has_function_privilege('anon','public.kasa_cozumle(uuid)','execute') a, has_function_privilege('authenticated','public.kasa_cozumle(uuid)','execute') u, p.prosecdef d from pg_proc p where p.oid='public.kasa_cozumle(uuid)'::regprocedure`))[0]);
  const once = await yetki();
  await db.sorgu(fs.readFileSync("supabase/migrations/20260612001110_bin_galibiyet_aciklama.sql", "utf8"));
  await db.sorgu(fs.readFileSync("supabase/migrations/20260612001111_hazine_ort_cevap_sure.sql", "utf8"));
  const u = satir(await db.sorgu(`select aciklama_tr, aciklama_en from unvan_tanimlari where anahtar='bin_galibiyet'`))[0];
  kontrol("unvan TR/EN metninde Antrenman/Practice yok", !/Antrenman|Practice/.test(u.aciklama_tr + u.aciklama_en));
  const g = satir(await db.sorgu(`select pg_get_functiondef('public.kasa_cozumle(uuid)'::regprocedure) f`))[0].f;
  kontrol("kasa_cozumle payı düşmüyor", !/kasa_gosterim_payi\(\)/.test(g) && /\(v_at - k\.soru_baslangic\)/.test(g));
  kontrol("yetki/security definer aynı", once === (await yetki()));
} catch (e) { console.log("HATA", e.message); hata++; }
finally { await db.sorgu("rollback").catch(() => {}); await db.kapat?.(); }
console.log(hata ? `${hata} başarısız` : "hepsi ✓"); process.exit(hata ? 1 : 0);
