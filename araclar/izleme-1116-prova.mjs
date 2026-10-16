// 1116 provası (canlı, tek işlem + ROLLBACK; yük yok): 'ses_kesildi' olay türü.
//   node araclar/izleme-1116-prova.mjs            → begin · migration · doğrulama · ROLLBACK
//   node araclar/izleme-1116-prova.mjs --uygula   → aynı doğrulamayla COMMIT + schema_migrations satırı
//   node araclar/izleme-1116-prova.mjs --canli    → uygulanmış durumu salt okuma ölçer
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";
const UYGULA = process.argv.includes("--uygula"), CANLI = process.argv.includes("--canli");
const SQL = fs.readFileSync("supabase/migrations/20260612001116_izleme_ses_kesildi.sql", "utf8");
const satir = (r) => r.satirlar ?? r.rows ?? r;
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let hata = 0;
const kontrol = (ad, k, ek = "") => { console.log(`${k ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); if (!k) hata++; };
const tek = async (q) => satir(await db.sorgu(q))[0];
const YETKI = `select array_to_string(proacl, ',') a, prosecdef d from pg_proc where oid = 'public.istemci_kayit_yaz(uuid,text,text,jsonb,jsonb)'::regprocedure`;
try {
  const yetkiOnce = JSON.stringify(await tek(YETKI));
  if (!CANLI) { await db.sorgu("begin"); await db.sorgu(SQL); }
  const k = await tek(`select pg_get_constraintdef(oid) d from pg_constraint where conname = 'akis_bozulma_olay_check'`);
  kontrol("kısıt ses_kesildi'yi içeriyor", /ses_kesildi/.test(k?.d ?? ""), k?.d);
  const g = await tek(`select prosrc s from pg_proc where oid = 'public.istemci_kayit_yaz(uuid,text,text,jsonb,jsonb)'::regprocedure`);
  kontrol("istemci_kayit_yaz tür listesinde ses_kesildi", /'ses_yok', 'ses_kesildi'/.test(g.s));
  const e = await tek(`select prosrc s from pg_proc where oid = 'public.izleme_gunluk_ozet_gonder(boolean)'::regprocedure`);
  kontrol("günlük e-posta açıklamasında ses_kesildi", /ses_kesildi = anlamlı ses/.test(e.s));
  kontrol("yetki aynı (istemci_kayit_yaz)", JSON.stringify(await tek(YETKI)) === yetkiOnce, yetkiOnce);
  if (!CANLI) {
    // RPC'yi gerçek yoldan dene: bir bot hesabının kimliğiyle (işlem içinde, ROLLBACK edilir) bir ses_kesildi + geçersiz tür
    await db.sorgu(`set local role authenticated`);
    await db.sorgu(`select set_config('request.jwt.claims', '{"sub":"781e7089-20ed-437f-8fd9-321c3e370752","role":"authenticated"}', true)`);
    await db.sorgu(`select public.istemci_kayit_yaz('00000000-0000-4000-8000-0000000a1116'::uuid, 'prova', 'android', '[]'::jsonb,
      '[{"olay":"akis","tur":"ses_kesildi","mod":"hazine","an":"joker|sonuc|ekran","ms":640,"mac":"00000000-0000-4000-8000-0000000b1116","kip":"twa"},
        {"olay":"akis","tur":"ses_bilinmez","mod":"hazine","an":"x","ms":1}]'::jsonb)`);
    await db.sorgu(`reset role`);
    const y = satir(await db.sorgu(`select olay, an, gecikme_ms, cihaz, kip from public.akis_bozulma where oturum_id = '00000000-0000-4000-8000-0000000a1116'`));
    kontrol("ses_kesildi yazıldı, bilinmeyen tür atıldı", y.length === 1 && y[0].olay === "ses_kesildi" && Number(y[0].gecikme_ms) === 640, JSON.stringify(y));
    if (UYGULA && !hata) {
      await db.sorgu(`delete from public.akis_bozulma where oturum_id = '00000000-0000-4000-8000-0000000a1116'`);
      await db.sorgu(`insert into supabase_migrations.schema_migrations (version, name) values ('20260612001116', 'izleme_ses_kesildi') on conflict do nothing`);
      await db.sorgu("commit");
      console.log("→ UYGULANDI (commit)");
    } else { await db.sorgu("rollback"); console.log("→ ROLLBACK"); }
  }
} catch (e) {
  hata++; console.log("✗ HATA", e.message);
  try { await db.sorgu("rollback"); } catch { /* yok */ }
} finally { await db.kapat?.(); }
process.exit(hata ? 1 : 0);
