// 1112 provası (canlı, tek işlem + ROLLBACK; yük yok). Kullanım: node araclar/bin-galibiyet-1112-prova.mjs [--canli]
// --canli: migration uygulanmışken yalnız salt okuma ölçümü (yeni gövde + yetki + beklenen sayı).
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";
const IDA = "e4f6006f-d6bb-4ca8-be67-3bdf9efc9708";
const CANLI = process.argv.includes("--canli");
const satir = (r) => r.satirlar ?? r.rows ?? r;
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let hata = 0;
const kontrol = (ad, k, ek = "") => { console.log(`${k ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); if (!k) hata++; };
const tek = async (q) => satir(await db.sorgu(q))[0];
// Hazine galibiyeti (açık bot hariç / dahil) — beklenen farkı fonksiyondan bağımsız hesaplar
const KASA = (kul, acikDahil) => `select count(*)::int n from kasa_maclari k where k.durum='bitti' and k.kazanan='${kul}'
  ${acikDahil ? "" : `and not exists (select 1 from profiles o where o.id = case when k.oyuncu1='${kul}' then k.oyuncu2 else k.oyuncu1 end and acik_bot_mu(o.is_bot,o.bot_turu))`}`;
const YETKI = `select has_function_privilege('anon','public.toplam_galibiyet(uuid)','execute') a,
  has_function_privilege('authenticated','public.toplam_galibiyet(uuid)','execute') u,
  has_function_privilege('service_role','public.toplam_galibiyet(uuid)','execute') s,
  (select prosecdef from pg_proc where oid='public.toplam_galibiyet(uuid)'::regprocedure) d`;
try {
  await db.sorgu("begin");
  const yetkiOnce = JSON.stringify(await tek(YETKI));
  // Açık bota karşı Hazine kazanmış bir insan (varsa) — hariç tutma ölçüsü
  const acikKazanan = (await tek(`select k.kazanan u from kasa_maclari k join profiles o on o.id = case when k.oyuncu1=k.kazanan then k.oyuncu2 else k.oyuncu1 end
    join profiles w on w.id=k.kazanan where k.durum='bitti' and acik_bot_mu(o.is_bot,o.bot_turu) and not coalesce(w.is_bot,false) limit 1`))?.u;
  const hesaplar = [...new Set([IDA, acikKazanan].filter(Boolean))];
  const once = {};
  for (const h of hesaplar) once[h] = Number((await tek(`select toplam_galibiyet('${h}') n`)).n);
  const unvanOnce = Number((await tek(`select count(*) n from oyuncu_unvanlari where unvan='bin_galibiyet'`)).n);
  if (!CANLI) await db.sorgu(fs.readFileSync("supabase/migrations/20260612001112_bin_galibiyet_hazine.sql", "utf8"));
  for (const h of hesaplar) {
    const yeni = Number((await tek(`select toplam_galibiyet('${h}') n`)).n);
    const kasa = Number((await tek(KASA(h, false))).n), kasaHepsi = Number((await tek(KASA(h, true))).n);
    const beklenen = CANLI ? yeni : once[h] + kasa;
    kontrol(`toplam_galibiyet ${h === IDA ? "Ida" : "açık-bot kazananı"}`, yeni === beklenen,
      `${CANLI ? "" : `eski ${once[h]} → `}yeni ${yeni} (Hazine sayılan ${kasa}, açık bot dahil olsaydı ${kasaHepsi})`);
    if (h === acikKazanan) kontrol("açık bota karşı Hazine galibiyeti sayılmıyor", kasaHepsi > kasa);
  }
  const g = (await tek(`select pg_get_functiondef('public.toplam_galibiyet(uuid)'::regprocedure) f`)).f;
  kontrol("gövdede kasa_maclari + acik_bot_mu", /kasa_maclari k/.test(g) && (g.match(/acik_bot_mu/g) || []).length === 3);
  kontrol("berabere (kazanan NULL) sayılmaz: gövde kazanan = p_user", /k\.kazanan = p_user/.test(g));
  kontrol("yetki/security definer aynı (yalnız service_role)", yetkiOnce === JSON.stringify(await tek(YETKI)), JSON.stringify(await tek(YETKI)));
  const u = await tek(`select aciklama_tr, aciklama_en from unvan_tanimlari where anahtar='bin_galibiyet'`);
  kontrol("açıklama TR/EN Hazine + Saf Bilgi", /Hazine/.test(u.aciklama_tr) && /Saf Bilgi/.test(u.aciklama_tr) && /Treasure/.test(u.aciklama_en) && /Pure Knowledge/.test(u.aciklama_en), `${u.aciklama_tr} | ${u.aciklama_en}`);
  const unvanSonra = Number((await tek(`select count(*) n from oyuncu_unvanlari where unvan='bin_galibiyet'`)).n);
  console.log(`  bin_galibiyet unvanı sahibi: ${unvanOnce} → ${unvanSonra}`);
} catch (e) { console.log("HATA", e.message); hata++; }
finally { await db.sorgu("rollback").catch(() => {}); await db.kapat?.(); }
console.log(hata ? `${hata} başarısız` : "hepsi ✓"); process.exit(hata ? 1 : 0);
