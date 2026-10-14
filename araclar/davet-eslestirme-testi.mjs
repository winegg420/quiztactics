// Bekleyen davet istemci testi (Aşama 4 · 1096) — taklit Supabase, canlıya HİÇ istek gitmez.
//
//   npm run build
//   __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=qt.test npx vite preview --host 127.0.0.1 --port 4173   # başka kabukta
//   node araclar/davet-eslestirme-testi.mjs [--port=4173]
//
// Kurulum sayfası "qt.test" adıyla açılır (localhost kapıdan serbest olduğu için). Uygulama tarafı
// navigator.standalone taklidiyle. Her durum bir kez.
import { chromium } from "playwright-core";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const KOK = `http://qt.test:${Number(ARG.port || 4173)}`;
const UA = {
  ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
};
const DAVET_EDEN = "11111111-2222-4333-8444-555555555555";
const KULLANICI = (yasSaat) => ({ id: "00000000-0000-4000-8000-000000000009", aud: "authenticated", role: "authenticated", email: "yeni@ornek.com",
  app_metadata: { provider: "email" }, user_metadata: {}, is_anonymous: false, created_at: new Date(Date.now() - yasSaat * 3600e3).toISOString() });

let hata = 0;
const sonuc = (ad, tamam, ek = "") => { if (!tamam) hata++; console.log(`${tamam ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); };
const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--host-resolver-rules=MAP qt.test 127.0.0.1"] });

async function kur({ ua = UA.ios, istekler, kullanici, standalone = false, yerel, bulCevap = [] } = {}) {
  const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, userAgent: ua });
  if (standalone) await baglam.addInitScript(() => { Object.defineProperty(navigator, "standalone", { get: () => true }); });
  if (kullanici) {
    await baglam.addInitScript(([u, y]) => {
      const s = { access_token: "sahte.jwt", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: u };
      try {
        localStorage.setItem("sb-etezccrifaetzrgfvawl-auth-token", JSON.stringify(s));
        localStorage.setItem("bildim_tanitim", "1");
        if (y) localStorage.setItem("bildim_davet_kodu", y);
      } catch { /* yok */ }
    }, [kullanici, yerel ?? null]);
  }
  await baglam.route(/challenges\.cloudflare\.com/, (r) => r.abort());
  await baglam.route(/supabase\.co/, async (r) => {
    const yol = new URL(r.request().url()).pathname;
    let govde = null;
    try { govde = r.request().postDataJSON(); } catch { /* yok */ }
    istekler?.push({ yol, govde });
    const json = (status, v) => (v === undefined ? r.fulfill({ status: 204, body: "" }) : r.fulfill({ status, contentType: "application/json", body: JSON.stringify(v) }));
    if (yol.endsWith("/rpc/davet_bekle_kaydet")) return json(204);
    if (yol.endsWith("/rpc/davet_bekleyen_bul")) return json(200, bulCevap);
    if (yol.endsWith("/rpc/davet_bekleyen_cevapla")) return json(200, [{ durum: govde?.p_kabul ? "arkadas_oldu" : "reddedildi", gorunen_ad: "Ayşe" }]);
    if (yol.endsWith("/rpc/profilim")) return json(200, { id: kullanici?.id, username: "Yeni", gorunen_ad: "Yeni", takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", coin: 0, xp: 0, dil: "tr" });
    if (yol.endsWith("/auth/v1/user")) return json(200, kullanici);
    if (yol.includes("/rest/v1/rpc/")) return json(200, null);
    if (yol.includes("/rest/v1/")) return json(200, []);
    return r.abort();
  });
  const sayfa = await baglam.newPage();
  const konsol = [];
  sayfa.on("pageerror", (e) => konsol.push(e.message));
  return { baglam, sayfa, konsol };
}
const bekle = (s, ms = 1500) => s.waitForTimeout(ms);
const cagri = (ist, ad) => ist.filter((i) => i.yol.endsWith(`/rpc/${ad}`));

// --- Kurulum sayfası (tarayıcı) ---
{
  const ist = [];
  const { baglam, sayfa, konsol } = await kur({ istekler: ist });
  await sayfa.goto(KOK + "/davet/abcd1234", { waitUntil: "domcontentloaded" });
  await sayfa.waitForSelector(".g-kurulum-davet-kod", { timeout: 15000 }).catch(() => {});
  await bekle(sayfa);
  const k = cagri(ist, "davet_bekle_kaydet");
  sonuc("iOS /davet/:kod → kaydet (arkadas, ios)", k.length === 1 && k[0].govde?.p_tur === "arkadas" && k[0].govde?.p_deger === "ABCD1234" && k[0].govde?.p_cihaz === "ios", JSON.stringify(k[0]?.govde));
  sonuc("davet kodu kartı görünür", (await sayfa.locator(".g-kurulum-davet-kod").textContent().catch(() => ""))?.trim() === "ABCD1234");
  await sayfa.reload({ waitUntil: "domcontentloaded" });
  await bekle(sayfa);
  sonuc("aynı sekmede yenileme → ikinci kayıt yok", cagri(ist, "davet_bekle_kaydet").length === 1);
  sonuc("konsol temiz", !konsol.length, konsol.join(" | "));
  await baglam.close();
}
{
  const ist = [];
  const { baglam, sayfa } = await kur({ istekler: ist });
  await sayfa.goto(KOK + `/?davet=${DAVET_EDEN}`, { waitUntil: "domcontentloaded" });
  await sayfa.waitForSelector(".g-kurulum-icerik", { timeout: 15000 }).catch(() => {});
  await bekle(sayfa);
  const k = cagri(ist, "davet_bekle_kaydet");
  sonuc("iOS ?davet=uuid → kaydet (referans)", k.length === 1 && k[0].govde?.p_tur === "referans" && k[0].govde?.p_deger === DAVET_EDEN);
  sonuc("referans davette kod kartı yok", (await sayfa.locator(".g-kurulum-davet").count()) === 0);
  await baglam.close();
}
{
  const ist = [];
  const { baglam, sayfa } = await kur({ ua: UA.android, istekler: ist });
  await sayfa.goto(KOK + "/davet/abcd1234", { waitUntil: "domcontentloaded" });
  await sayfa.waitForSelector(".g-kurulum-icerik", { timeout: 15000 }).catch(() => {});
  await bekle(sayfa);
  sonuc("Android Chrome → sunucuya yazılmaz (ortak depo)", cagri(ist, "davet_bekle_kaydet").length === 0);
  sonuc("Android: kod yine yerelde saklandı", (await sayfa.evaluate(() => localStorage.getItem("bildim_davet_kodu"))) === "ABCD1234");
  await baglam.close();
}

// --- Uygulama (girişli) ---
const BIR = [{ id: "99999999-0000-4000-8000-000000000001", tur: "arkadas", gorunen_ad: "Ayşe", avatar_url: "/avatars/pro/kedi-k01.svg" }];
for (const [ad, kabul] of [["Evet", true], ["Hayır", false]]) {
  const ist = [];
  const { baglam, sayfa, konsol } = await kur({ istekler: ist, kullanici: KULLANICI(1), standalone: true, bulCevap: BIR });
  await sayfa.goto(KOK + "/", { waitUntil: "domcontentloaded" });
  const soru = sayfa.getByText("Ayşe seni davet etti, doğru mu?");
  const goruldu = await soru.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  const b = cagri(ist, "davet_bekleyen_bul");
  sonuc(`[${ad}] yeni hesap + uygulama → bul(ios) → soru göründü`, goruldu && b[0]?.govde?.p_cihaz === "ios");
  if (goruldu) {
    const dugme = sayfa.getByRole("button", { name: ad, exact: true });
    const kutu = await dugme.boundingBox();
    sonuc(`[${ad}] düğme ≥44 px`, kutu?.height >= 44, `h=${kutu?.height}`);
    await dugme.click();
    await bekle(sayfa, 800);
    const c = cagri(ist, "davet_bekleyen_cevapla");
    sonuc(`[${ad}] cevapla(p_kabul=${kabul})`, c.length === 1 && c[0].govde?.p_kabul === kabul && c[0].govde?.p_id === BIR[0].id);
    sonuc(`[${ad}] soru kapandı`, (await soru.count()) === 0);
    if (kabul) sonuc("[Evet] 'artık arkadaşsınız' bildirimi", await sayfa.getByText("Ayşe ile artık arkadaşsınız.").count() > 0);
  }
  sonuc(`[${ad}] konsol temiz`, !konsol.length, konsol.join(" | "));
  await baglam.close();
}
for (const [ad, ayar] of [
  ["eski hesap (72 sa)", { kullanici: KULLANICI(72), standalone: true }],
  ["tarayıcıdan taşınan yerel kod var", { kullanici: KULLANICI(1), standalone: true, yerel: "ABCD1234" }],
  ["tek bekleyen yok (paylaşılan ağ / yok)", { kullanici: KULLANICI(1), standalone: true, bulCevap: [] }],
]) {
  const ist = [];
  const { baglam, sayfa } = await kur({ istekler: ist, bulCevap: BIR, ...ayar });
  await sayfa.goto(KOK + "/", { waitUntil: "domcontentloaded" });
  await sayfa.waitForSelector(".a-kabuk", { timeout: 15000 }).catch(() => {});
  await bekle(sayfa, 2500);
  const soru = await sayfa.getByText("seni davet etti").count();
  const b = cagri(ist, "davet_bekleyen_bul").length;
  const beklenen = ad.startsWith("tek") ? b === 1 && soru === 0 : b === 0 && soru === 0;
  sonuc(`${ad} → soru yok`, beklenen, `bul=${b} soru=${soru}`);
  await baglam.close();
}

await tarayici.close();
console.log(hata ? `\n${hata} HATA` : "\nTÜMÜ GEÇTİ");
process.exit(hata ? 1 : 0);
