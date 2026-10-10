// AVATAR PRESTİJ (1049) — canlı, TEK SEFERLİK uçtan uca test. Döngü/yük yok; ~12 istek.
// Geçici misafir hesap açar (signInAnonymously), RPC'yi gerçek oturumla çağırır, sonunda hesabı SİLER
// (test-hesap-temizle.mjs --id=… --uygula ile aynı kural: sahip/bot/gerçek oyuncu asla).
// Kullanım: IZIN_CANLI_TEST=1 node araclar/avatar-prestij-canli-testi.mjs
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";

const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split(/\r?\n/)
  .map((s) => s.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]));
const URL_ = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY;
const AV = "baykus-k03", AV_URL = "/avatars/pro/baykus-k03.svg", SAHIPSIZ = "hayalet-k26";

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const sb = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
let uid = null, hata = 0;
const kontrol = (ad, kosul, ayrinti = "") => { console.log(`${kosul ? "✓" : "✗"} ${ad}${ayrinti ? " — " + ayrinti : ""}`); if (!kosul) hata++; };
const coinYaz = (n) => db.sorguCoklu(`begin; select set_config('app.coin_izin','1',true); update public.profiles set coin = ${Number(n)} where id = '${uid}'; commit;`);
const tek = async (sql) => (await db.sorgu(sql))[0];
const al = async () => { const { data, error } = await sb.rpc("avatar_prestij_al", { p_avatar: AV }); return error ? "HATA:" + error.message : data; };

try {
  const { data: oturum, error: e0 } = await sb.auth.signInAnonymously();
  if (e0) throw e0;
  uid = oturum.user.id;
  console.log("test hesabı:", uid);
  await new Promise((r) => setTimeout(r, 1500));   // profil tetikleyicisi
  const kp0 = Number((await tek(`select koleksiyon_puani from public.profiles where id = '${uid}'`))?.koleksiyon_puani ?? 0);

  let r = await sb.rpc("avatar_prestij_al", { p_avatar: SAHIPSIZ });
  kontrol("sahip olmadığı avatar reddedilir", String(r.error?.message).includes("sahip_degil"), r.error?.message);

  await coinYaz(100);
  kontrol("coin yetersiz reddedilir", String(await al()).includes("coin_yetersiz"));

  await coinYaz(3000);
  const [a, b] = await Promise.all([al(), al()]);   // aynı anda iki çağrı
  const basari = [a, b].filter((x) => x?.alindi === true).length;
  kontrol("aynı anda iki çağrı: biri alır, öteki zaten_alindi", basari === 1 && [a, b].some((x) => String(x).includes("zaten_alindi")),
    JSON.stringify([a, b]));
  const c1 = await tek(`select coin, koleksiyon_puani from public.profiles where id = '${uid}'`);
  kontrol("çifte düşüm yok (3000 → 500)", Number(c1.coin) === 500, `coin ${c1.coin}`);
  const defter = await tek(`select count(*) n, sum(miktar) t from public.coin_hareketleri where user_id = '${uid}' and tur = 'avatar_prestij'`);
  kontrol("defterde tek hareket (-2500)", Number(defter.n) === 1 && Number(defter.t) === -2500, JSON.stringify(defter));
  kontrol("Koleksiyon Puanı +3 (nadir)", Number(c1.koleksiyon_puani) === kp0 + 3, `${kp0} → ${c1.koleksiyon_puani}`);
  kontrol("ikinci alım reddedilir", String(await al()).includes("zaten_alindi"));

  r = await sb.rpc("oyuncu_kartlari", { p_idler: [uid] });
  kontrol("kart: takılı avatar prestijsizken false + Bronz çerçeve", r.data?.[0]?.avatar_prestij === false && r.data?.[0]?.cerceve === "lig_bronz",
    JSON.stringify(r.data?.[0] && { p: r.data[0].avatar_prestij, c: r.data[0].cerceve }) + (r.error ? r.error.message : ""));
  r = await sb.rpc("avatar_onayla", { p_url: AV_URL });
  if (r.error) console.log("  avatar_onayla:", r.error.message);
  r = await sb.rpc("oyuncu_kartlari", { p_idler: [uid] });
  kontrol("kart: prestijli avatar takılınca avatar_prestij true", r.data?.[0]?.avatar_prestij === true, JSON.stringify(r.data?.[0]?.avatar));

  r = await sb.from("oyuncu_avatar_prestij").select("user_id, avatar");
  kontrol("RLS: yalnız kendi satırı okunur", !r.error && r.data.length === 1 && r.data[0].user_id === uid, r.error?.message ?? JSON.stringify(r.data));
  r = await sb.from("oyuncu_avatar_prestij").insert({ user_id: uid, avatar: "ayi-k08" });
  kontrol("doğrudan yazma reddedilir", Boolean(r.error), r.error?.message);
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  r = await anon.rpc("avatar_prestij_al", { p_avatar: AV });
  kontrol("anon çağıramaz", Boolean(r.error), r.error?.message);
} catch (e) {
  console.error("TEST HATASI:", e?.message ?? e);
  hata++;
} finally {
  await db.kapat();
  if (uid) {
    try {
      execFileSync(process.execPath, ["araclar/test-hesap-temizle.mjs", "--uygula", `--id=${uid}`], { stdio: "inherit", env: { ...process.env, IZIN_CANLI_TEST: "1" } });
    } catch (e) { console.error("Temizlik başarısız — elle sil:", uid, e?.message ?? e); hata++; }
  }
}
console.log(hata ? `\n${hata} kontrol BAŞARISIZ` : "\nHepsi geçti.");
process.exit(hata ? 1 : 0);
