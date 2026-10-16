// 1113 + 1114 provası (canlı, TEK işlem + ROLLBACK; yük yok — birkaç satır). Kullanım: node araclar/izleme-1113-prova.mjs [--canli]
// --canli: migration'lar uygulanmışken yalnız salt okuma (yetkiler, gövdeler, cron) — yazma yok.
// Prova: iki migration işlem içinde uygulanır; Ida kimliğiyle istemci_kayit_yaz'a örnek akış kayıtları (geçerli/geçersiz/sınır)
// gönderilir, izleme_ozeti'nin akış bölümü ve günlük e-postanın KUYRUĞA giren gövdesi okunur; ROLLBACK → e-posta gitmez.
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";
const IDA = "e4f6006f-d6bb-4ca8-be67-3bdf9efc9708";
const CANLI = process.argv.includes("--canli");
const satir = (r) => r.satirlar ?? r.rows ?? r;
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let hata = 0;
const kontrol = (ad, k, ek = "") => { console.log(`${k ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); if (!k) hata++; };
const tek = async (q) => satir(await db.sorgu(q))[0];
const YETKI = (f) => `select has_function_privilege('anon','${f}','execute') a, has_function_privilege('authenticated','${f}','execute') u,
  has_function_privilege('service_role','${f}','execute') s, (select prosecdef from pg_proc where oid='${f}'::regprocedure) d`;
const b = (v) => v === true || v === "t";
const yetki = async (f) => { const r = await tek(YETKI(f)); return `${b(r.a) ? "A" : "-"}${b(r.u) ? "U" : "-"}${b(r.s) ? "S" : "-"}${b(r.d) ? "D" : "-"}`; };
try {
  await db.sorgu("begin");
  const once = { yaz: await yetki("public.istemci_kayit_yaz(uuid,text,text,jsonb,jsonb)"), ozet: await yetki("public.izleme_ozeti()"),
                 kasa: await yetki("public.kasa_cevap(uuid,smallint)"), d4: await yetki("public.duello4_cevap(uuid,smallint)"),
                 kart: await yetki("public.duello4_kart(uuid,text)"), bud: await yetki("public.kayit_budama()"),
                 grup: await yetki("public.submit_group_match_answer(uuid,smallint,integer)"), tur: await yetki("public.submit_tournament_answer(uuid,smallint,integer)") };
  if (!CANLI) {
    await db.sorgu(fs.readFileSync("supabase/migrations/20260612001113_akis_izleme_gunluk_ozet.sql", "utf8"));
    await db.sorgu(fs.readFileSync("supabase/migrations/20260612001114_sure_doldu_bildirimi.sql", "utf8"));
  }
  const sonra = { yaz: await yetki("public.istemci_kayit_yaz(uuid,text,text,jsonb,jsonb)"), ozet: await yetki("public.izleme_ozeti()"),
                  kasa: await yetki("public.kasa_cevap(uuid,smallint)"), d4: await yetki("public.duello4_cevap(uuid,smallint)"),
                  kart: await yetki("public.duello4_kart(uuid,text)"), bud: await yetki("public.kayit_budama()"),
                  grup: await yetki("public.submit_group_match_answer(uuid,smallint,integer)"), tur: await yetki("public.submit_tournament_answer(uuid,smallint,integer)") };
  kontrol("mevcut fonksiyonların yetkisi aynı", JSON.stringify(once) === JSON.stringify(sonra), JSON.stringify(sonra));
  kontrol("izleme_gunluk_ozet_gonder yalnız service_role", (await yetki("public.izleme_gunluk_ozet_gonder(boolean)")) === "--SD");
  kontrol("izleme_gunluk_ozet_elle authenticated (sahip kapılı)", (await yetki("public.izleme_gunluk_ozet_elle()")) === "-USD");
  kontrol("izleme_akis_ozet kimseye açık değil", (await yetki("public.izleme_akis_ozet(interval)")).startsWith("--"));
  const t = await tek(`select c.relrowsecurity r, has_table_privilege('authenticated','public.akis_bozulma','select') s,
    has_table_privilege('anon','public.akis_bozulma','select') a, (select count(*) from pg_policies where tablename='akis_bozulma') p from pg_class c where c.oid = 'public.akis_bozulma'::regclass`);
  kontrol("akis_bozulma: RLS açık, politika yok, okuma izni yok", b(t.r) && !b(t.s) && !b(t.a) && Number(t.p) === 0, JSON.stringify(t));
  const cron = await tek(`select schedule, command from cron.job where jobname='bildim-izleme-gunluk'`);
  kontrol("cron 05:00 UTC (08:00 TSİ)", cron?.schedule === "0 5 * * *", JSON.stringify(cron));
  const g = (await tek(`select pg_get_functiondef('public.kasa_cevap(uuid,smallint)'::regprocedure) f`)).f;
  kontrol("kasa_cevap: -1 dalı + 'Süre dolmadı'", /p_cevap = -1/.test(g) && /Süre dolmadı/.test(g));
  const g4 = (await tek(`select pg_get_functiondef('public.duello4_cevap(uuid,smallint)'::regprocedure) f`)).f;
  const gk = (await tek(`select pg_get_functiondef('public.duello4_kart(uuid,text)'::regprocedure) f`)).f;
  kontrol("duello4_cevap -1 + duello4_kart null dalı", /p_cevap = -1/.test(g4) && /p_kategori is null and d.faz = 'kart'/.test(gk));
  const gg = (await tek(`select pg_get_functiondef('public.submit_group_match_answer(uuid,smallint,integer)'::regprocedure) f`)).f;
  const gt = (await tek(`select pg_get_functiondef('public.submit_tournament_answer(uuid,smallint,integer)'::regprocedure) f`)).f;
  kontrol("Grup/Turnuva -1 dalı (istatistiksiz, Süre dolmadı)", [gg, gt].every((x) => /p_cevap = -1/.test(x) && /Süre dolmadı/.test(x)));

  if (!CANLI) {
    // Ida kimliğiyle örnek akış kayıtları — aynı maçta aynı tür 3 sınırı, geçersiz mod/ms atılır
    const MAC = "11111111-2222-4333-8444-555555555555", OT = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const ak = (tur, ms, ek = {}) => ({ olay: "akis", tur, mod: "hazine", an: "cevap", ms, mac: MAC, kip: "twa", ag: "wifi/4g", ...ek });
    const liste = [ak("sayac_sifir", 5400), ak("sayac_sifir", 5100), ak("sayac_sifir", 6000), ak("sayac_sifir", 5900),
      ak("faz_gec", 5200), ak("donma", 820, { an: "sonuc idagureli@gmail.com" }), ak("ses_yok", 400, { mod: "bilinmeyen" }),
      ak("ses_gec", "abc"), { olay: "giris", anahtar: "" }];
    await db.sorgu(`set local role authenticated`);
    await db.sorgu(`select set_config('request.jwt.claims', '${JSON.stringify({ sub: IDA, role: "authenticated" })}', true)`);
    await db.sorgu(`select public.istemci_kayit_yaz('${OT}', 'prova', 'android', '[]'::jsonb, '${JSON.stringify(liste)}'::jsonb)`);
    await db.sorgu(`reset role`);
    const yaz = satir(await db.sorgu(`select olay, gecikme_ms, an, kip, ag from akis_bozulma where oturum_id='${OT}' order by id`));
    kontrol("yazılan: 3 sayac_sifir (4. sınırda) + faz_gec + donma; geçersiz mod/ms atıldı", yaz.length === 5, JSON.stringify(yaz));
    kontrol("an alanında e-posta temizlendi", yaz.some((r) => /\[e-posta\]/.test(r.an)));
    await db.sorgu(`set local role authenticated`);
    await db.sorgu(`select set_config('request.jwt.claims', '${JSON.stringify({ sub: IDA, role: "authenticated" })}', true)`);
    const js = (v) => (typeof v === "string" ? JSON.parse(v) : v);
    const oz = js((await tek(`select public.izleme_ozeti() o`)).o);
    await db.sorgu(`reset role`);
    kontrol("izleme_ozeti.akis s24 + g7", oz?.akis?.s24?.toplam >= 5 && Array.isArray(oz.akis.g7.en_kotu), `24s ${oz?.akis?.s24?.toplam}, mod_olay ${JSON.stringify(oz?.akis?.s24?.mod_olay?.slice(0, 3))}, sunucu ${oz?.sunucu_ms} ms`);
    // günlük e-posta: işlem içinde kuyruğa giren gövde (ROLLBACK → gönderilmez)
    const r = js((await tek(`select public.izleme_gunluk_ozet_gonder(true) r`)).r);
    const q = await tek(`select body::text b from net.http_request_queue where id = ${Number(r?.istek)}`);
    const govde = q ? JSON.parse(Buffer.from(q.b.replace(/^\\x/, ""), "hex").toString("utf8") || "{}") : null;
    kontrol("günlük e-posta kuyruğa girdi (ROLLBACK ile gitmeyecek)", Boolean(govde?.subject), govde?.subject);
    if (govde) console.log("---- e-posta metni ----\n" + govde.text + "\n---- alıcılar " + JSON.stringify(govde.to));
  }
} catch (e) { console.log("HATA", e.message); hata++; }
finally { await db.sorgu("rollback").catch(() => {}); await db.kapat?.(); }
console.log(hata ? `${hata} başarısız` : "hepsi ✓"); process.exit(hata ? 1 : 0);
