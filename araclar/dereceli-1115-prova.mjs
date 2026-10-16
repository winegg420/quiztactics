// 1115 provası (canlı, tek işlem + ROLLBACK; döngü/yük yok). Kullanım: node araclar/dereceli-1115-prova.mjs [--canli]
// Bütün maçlar dereceli — açık bot (Antrenman) hariç. Çağrılar yalnız BOT hesaplarıyla (Ida/insan hesabı kullanılmaz).
// --canli: migration uygulanmışken yalnız salt okuma (gövde işaretleri + yetki + saf fonksiyonlar), yazan çağrı YOK.
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";
const CANLI = process.argv.includes("--canli");
const satir = (r) => r.satirlar ?? r.rows ?? r;
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let hata = 0;
const kontrol = (ad, k, ek = "") => { console.log(`${k ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); if (!k) hata++; };
const tek = async (q) => satir(await db.sorgu(q))[0];
const B = (v) => v === true || v === "t";   // pg-mini boolean metin döndürür
// Maç kuran fonksiyon TEK KEZ çağrılır (WHERE içinde çağırmak her satırda yeniden çalıştırır), sonra kayıt okunur.
const kur = async (tablo, cagri) => { const id = (await tek(`select ${cagri} id`)).id; return B((await tek(`select dereceli from ${tablo} where id = '${id}'`))?.dereceli); };
const FONKS = ["kuyruga_gir", "quick_match", "hizli_mod_baslat", "duello_ara", "kasa_ara", "duello_olustur", "kasa_olustur",
  "create_challenge", "duello_davet_et", "kasa_davet_et", "rovans_iste", "joker_ucretsiz_elli_hakki", "odul_carpani", "odul_indirim_sebebi"];
const YETKI = `select string_agg(p.proname || ':' || coalesce(p.proacl::text, '-') || ':' || p.prosecdef || ':' || pg_get_function_identity_arguments(p.oid), ' | ' order by p.proname)
  y from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = any(array['${FONKS.join("','")}'])`;
const govde = async (ad) => (await tek(`select string_agg(prosrc, ' ') g from pg_proc where proname = '${ad}' and pronamespace = 'public'::regnamespace`)).g || "";
try {
  await db.sorgu("begin");
  const yetkiOnce = (await tek(YETKI)).y;
  if (!CANLI) await db.sorgu(fs.readFileSync("supabase/migrations/20260612001115_dereceli_kalkti.sql", "utf8"));
  kontrol("imza / yetki (proacl) / security definer aynı", yetkiOnce === (await tek(YETKI)).y);
  for (const ad of FONKS) kontrol(`${ad} gövdesinde 1115`, /1115/.test(await govde(ad)));
  kontrol("açık bot istisnası *_olustur + create_challenge gövdesinde",
    (await Promise.all(["duello_olustur", "kasa_olustur", "create_challenge"].map(govde))).every((g) => /acik_bot_mu\(b\.is_bot, b\.bot_turu\)/.test(g)));
  kontrol("hemen_bot_mac / hemen_bot_mac_sec dokunulmadı (açık bot serbest — 440)",
    (await Promise.all(["hemen_bot_mac", "hemen_bot_mac_sec"].map(govde))).every((g) => /p_dereceli := false/.test(g) && !/1115/.test(g)));
  const o = await tek(`select odul_carpani(1, true, false) s, odul_carpani(1, true, true) b, odul_carpani(1, false, false) d,
    odul_indirim_sebebi(1, true, true) sb, odul_indirim_sebebi(1, true, false) ss,
    joker_ucretsiz_elli_hakki('1v1', (select id from matches where dereceli = false order by created_at desc limit 1)) j`);
  kontrol("serbest coin indirimi yok (odul_carpani(1,serbest,−) = 1)", Number(o.s) === 1 && Number(o.d) === 1, JSON.stringify(o));
  kontrol("açık bot yarım ödül korunur (= coin_bot_carpani)", Number(o.b) === Number((await tek(`select ayar_ondalik('coin_bot_carpani', 0.5) v`)).v));
  kontrol("indirim sebebi: açık bot → 'acik_bot', serbest → yok", o.sb === "acik_bot" && o.ss == null);
  kontrol("ücretsiz 50:50 hakkı yok (eski serbest maçta bile)", !B(o.j));
  if (!CANLI) {
    // Bot hesaplarıyla tek tük çağrı (ROLLBACK). gizli1/gizli2 = gizli bot, acik = açık bot.
    const b = await tek(`select (select id from profiles where is_bot and bot_turu = 'gizli' order by id limit 1) g1,
      (select id from profiles where is_bot and bot_turu = 'gizli' order by id offset 1 limit 1) g2,
      (select id from profiles where is_bot and acik_bot_mu(is_bot, bot_turu) order by id limit 1) a`);
    const d1 = await kur("duellolar", `duello_olustur('${b.g1}', '${b.g2}', false)`);
    const d2 = await kur("duellolar", `duello_olustur('${b.g1}', '${b.a}', true)`);
    kontrol("duello_olustur(false) insan/gizli → dereceli", d1);
    kontrol("duello_olustur(true) açık bot → serbest", !d2);
    const k1 = await kur("kasa_maclari", `kasa_olustur('${b.g1}', '${b.g2}', false, true)`);
    const k2 = await kur("kasa_maclari", `kasa_olustur('${b.g2}', '${b.a}', true, true)`);
    kontrol("kasa_olustur(false) → dereceli", k1);
    kontrol("kasa_olustur(true) açık bot → serbest", !k2);
    // create_challenge oturumlu çağrı (gizli bot hesabı adına; gizli bota meydan okunamadığından yalnız açık bot yolu) (authenticated + jwt claims), sonra rol geri.
    await db.sorgu(`set local role authenticated`);
    await db.sorgu(`select set_config('request.jwt.claims', '${JSON.stringify({ sub: b.g1, role: "authenticated" })}', true)`);
    const c2 = (await tek(`select create_challenge('${b.a}', null, true, false) id`)).id;
    await db.sorgu(`reset role`);
    const cc = await tek(`select (select dereceli from matches where id = '${c2}') b`);
    kontrol("create_challenge(true) açık bota → serbest", !B(cc.b) && cc.b != null);
  }
} catch (e) { console.log("HATA", e.message); hata++; }
finally { await db.sorgu("rollback").catch(() => {}); await db.kapat?.(); }
console.log(hata ? `${hata} başarısız` : "hepsi ✓"); process.exit(hata ? 1 : 0);
