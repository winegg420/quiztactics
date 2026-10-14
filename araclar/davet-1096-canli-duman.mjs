// 1096 canlı duman testi — TEK seferlik: yetkiler (salt okuma) + gerçek HTTP ile cf-connecting-ip veritabanına ulaşıyor mu.
//   IZIN_CANLI_TEST=1 node araclar/davet-1096-canli-duman.mjs
// Anon olarak bir bekleyen kayıt yazar (cihaz 'diger'), satırın oluştuğunu ve ham IP içermediğini doğrular, SİLER.
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";

if (process.env.IZIN_CANLI_TEST !== "1") { console.error("IZIN_CANLI_TEST=1 gerekli"); process.exit(1); }
const E = {};
for (const d of [".env.local", ".env"]) {
  try { for (const m of fs.readFileSync(d, "utf8").matchAll(/^([A-Z_]+)=(.*)$/gm)) if (!(m[1] in E)) E[m[1]] = m[2].trim(); } catch { /* yok */ }
}
const URL_ = E.VITE_SUPABASE_URL, ANON = E.VITE_SUPABASE_ANON_KEY;
let hata = 0;
const sonuc = (ad, tamam, ek = "") => { if (!tamam) hata++; console.log(`${tamam ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); };
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let kod = null;
try {
  const yetki = await db.sorgu(`select routine_name r, string_agg(grantee, ',' order by grantee) g from information_schema.routine_privileges
    where routine_schema='public' and routine_name in ('davet_bekle_kaydet','davet_bekleyen_bul','davet_bekleyen_cevapla','davet_ip_ozet_ic') group by 1 order by 1`);
  const g = Object.fromEntries(yetki.map((x) => [x.r, x.g]));
  console.log(JSON.stringify(g));
  sonuc("kaydet: anon + authenticated", /anon/.test(g.davet_bekle_kaydet) && /authenticated/.test(g.davet_bekle_kaydet));
  sonuc("bul/cevapla: anon YOK, authenticated var", !/anon/.test(g.davet_bekleyen_bul) && !/anon/.test(g.davet_bekleyen_cevapla) && /authenticated/.test(g.davet_bekleyen_bul));
  sonuc("iç yardımcı: anon/authenticated YOK", !/anon|authenticated/.test(g.davet_ip_ozet_ic ?? ""));
  const [t] = await db.sorgu(`select c.relrowsecurity rls, (select count(*) from pg_policies where tablename='bekleyen_davet') pol,
    has_table_privilege('anon','public.bekleyen_davet','select') anon_sec, has_table_privilege('authenticated','public.bekleyen_davet','select') auth_sec
    from pg_class c where c.oid='public.bekleyen_davet'::regclass`);
  sonuc("RLS açık, policy 0, anon/authenticated tablo yetkisi yok", t.rls === "t" && t.pol === "0" && t.anon_sec === "f" && t.auth_sec === "f", JSON.stringify(t));
  const [v] = await db.sorgu(`select count(*) n from vault.secrets where name='davet_ip_tuzu'`);
  sonuc("Vault tuzu var", v.n === "1");

  [{ davet_kodu: kod }] = await db.sorgu(`select davet_kodu from public.profiles where davet_kodu ~ '^[A-Z0-9]{8}$' and not coalesce(is_bot,false) order by created_at limit 1`);
  const once = Number((await db.sorgu(`select count(*) n from public.bekleyen_davet where cihaz='diger'`))[0].n);
  const r = await fetch(`${URL_}/rest/v1/rpc/davet_bekle_kaydet`, { method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.77" },
    body: JSON.stringify({ p_tur: "arkadas", p_deger: kod, p_cihaz: "diger" }) });
  sonuc("anon HTTP çağrısı", r.status === 204 || r.status === 200, `HTTP ${r.status}`);
  const satirlar = await db.sorgu(`select ip_ozet from public.bekleyen_davet where cihaz='diger' and olusturma > now() - interval '2 minutes'`);
  sonuc("cf-connecting-ip veritabanına ulaştı (satır yazıldı)", satirlar.length === once + 1 || satirlar.length >= 1, `satır=${satirlar.length}`);
  sonuc("satırda ham IP / sahte XFF yok", satirlar.every((s) => /^[0-9a-f]{64}$/.test(s.ip_ozet)));
  const hdr = await fetch(`${URL_}/rest/v1/bekleyen_davet?select=id`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  sonuc("anon tabloyu REST'ten okuyamaz", hdr.status === 401 || hdr.status === 403 || hdr.status === 404, `HTTP ${hdr.status}`);
} catch (e) {
  hata++; console.error("✗ beklenmeyen:", e?.message ?? e);
} finally {
  try {
    const sil = await db.sorgu(`delete from public.bekleyen_davet where cihaz='diger' and olusturma > now() - interval '10 minutes' returning id`);
    console.log(`· temizlik: ${sil.length} test satırı silindi`);
  } finally { await db.kapat(); }
}
console.log(hata ? `\n${hata} HATA` : "\nTÜMÜ GEÇTİ");
process.exit(hata ? 1 : 0);
