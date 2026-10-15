// 1106 provası: migration + kurallar TEK transaction'da, sonunda ROLLBACK (canlıya kalıcı hiçbir şey yazılmaz).
//   node araclar/son-gorulme-1106-prova.mjs
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
const kim = (id) => q(`select set_config('request.jwt.claims', '{"sub":"${id}","role":"authenticated"}', true), set_config('role', 'authenticated', true)`);
const sahip = () => q(`select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true)`);

try {
  await q("set statement_timeout = '15s'");
  await q("begin");
  await q(fs.readFileSync("supabase/migrations/20260612001106_son_gorulme.sql", "utf8"));
  sonuc("migration çalıştı", true);

  const [cift] = await q(`select f.requester as a, f.addressee as b from public.friendships f
      join public.profiles pa on pa.id = f.requester join public.profiles pb on pb.id = f.addressee
     where f.durum = 'arkadas' and not coalesce(pa.is_bot,false) and not coalesce(pb.is_bot,false)
       and not exists (select 1 from public.engellemeler e where (e.engelleyen=f.requester and e.engellenen=f.addressee) or (e.engelleyen=f.addressee and e.engellenen=f.requester))
     limit 1`);
  if (!cift) throw new Error("denemeye uygun arkadaş çifti yok");
  const [yabanci] = await q(`select p.id from public.profiles p where p.id not in ('${cift.a}','${cift.b}') and not coalesce(p.is_bot,false)
      and not exists (select 1 from public.friendships f where (f.requester=p.id and f.addressee='${cift.a}') or (f.addressee=p.id and f.requester='${cift.a}')) limit 1`);
  const A = cift.a, B = cift.b;
  const say = async (me, ids) => (await q(`select * from public.arkadas_son_gorulme(array[${ids.map((i) => `'${i}'::uuid`).join(",")}])`));

  await kim(A);
  let r = await say(A, [B]);
  sonuc("arkadaş görünür", r.length === 1 && r[0].id === B && r[0].son_gorulme);
  r = await say(A, [yabanci.id]);
  sonuc("yabancı dönmez", r.length === 0);
  r = await say(A, [A]);
  sonuc("kendisi dönmez", r.length === 0);
  const [c] = await q(`select public.profil_cevrimici('${B}') as v`);
  sonuc("profil_cevrimici boolean", c.v === true || c.v === false || c.v === "t" || c.v === "f", String(c.v));

  await q(`select public.son_gorulme_gizli_ayarla(true)`);   // A gizler
  r = await say(A, [B]);
  sonuc("gizleyen başkasınınkini görmez", r.length === 0);
  await kim(B);
  r = await say(B, [A]);
  sonuc("gizleyenin last_seen'i arkadaşa gitmez", r.length === 0);
  const [ca] = await q(`select public.profil_cevrimici('${A}') as v`);
  sonuc("gizleyen kartta çevrimiçi görünmez", ca.v === false || ca.v === "f");

  await kim(A);
  await q(`select public.son_gorulme_gizli_ayarla(false)`);
  r = await say(A, [B]);
  sonuc("gizleme kalkınca yeniden görünür", r.length === 1);

  const e1 = (await hataMi("select last_seen from public.profiles limit 1")) ?? "";
  sonuc("last_seen sütunu istemciye kapalı", /permission denied/.test(e1), e1.slice(0, 60));
  const e2 = (await hataMi("select son_gorulme_gizli from public.profiles limit 1")) ?? "";
  sonuc("son_gorulme_gizli sütunu istemciye kapalı", /permission denied/.test(e2));
  const e3 = (await hataMi("select id, gorunen_ad, puan from public.profiles limit 1")) ?? "";
  sonuc("öteki sütunlar okunur", e3 === "");
  const e4 = (await hataMi("select to_jsonb(p) ->> 'son_gorulme_gizli' from public.profiles p where id = auth.uid()")) ?? "";
  sonuc("(bilgi) tablo sütunuyla kendi değeri okunamaz → profilim() kullanılır", true, e4 ? "izin yok" : "okundu");
  const [pm] = await q("select (public.profilim() ->> 'son_gorulme_gizli') as v");
  sonuc("profilim() kendi ayarını verir", pm.v === "false", String(pm.v));

  await q(`select set_config('request.jwt.claims', '{"role":"anon"}', true), set_config('role', 'anon', true)`);
  sonuc("anon çağıramaz", /permission denied/.test((await hataMi(`select * from public.arkadas_son_gorulme(array['${B}'::uuid])`)) ?? ""));
  await sahip();
} catch (e) {
  hata++;
  console.error("✗ prova hatası:", e?.message ?? e);
} finally {
  try { await db.sorgu("rollback"); } catch { /* bağlantı kapanmış olabilir */ }
  console.log("ROLLBACK yapıldı — canlıda değişiklik yok");
  try { await db.kapat?.(); } catch { /* yut */ }
}
process.exit(hata ? 1 : 0);
