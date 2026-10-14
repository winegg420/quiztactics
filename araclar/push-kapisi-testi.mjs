// Push yalnız uygulamada (Aşama 5) — taklit Supabase + taklit Notification/PushManager; canlıya istek gitmez.
//
//   npm run build
//   __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=qt.test npx vite preview --host 127.0.0.1 --port 4173   # başka kabukta
//   node araclar/push-kapisi-testi.mjs [--port=4173]
//
// Tarayıcı sekmesi: ?dev=1 geliştirici geçişiyle oyun açılır ama bildirim izni İSTENMEMELİ.
// Uygulama: navigator.standalone taklidi → izin kartı/anahtar çalışır, requestPermission çağrılır.
import { chromium } from "playwright-core";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const KOK = `http://qt.test:${Number(ARG.port || 4173)}`;
const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const KULLANICI = { id: "00000000-0000-4000-8000-000000000007", aud: "authenticated", role: "authenticated", email: "p@ornek.com",
  app_metadata: { provider: "email" }, user_metadata: {}, is_anonymous: false, created_at: "2026-09-01T00:00:00Z" };

let hata = 0;
const sonuc = (ad, tamam, ek = "") => { if (!tamam) hata++; console.log(`${tamam ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); };
const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--host-resolver-rules=MAP qt.test 127.0.0.1", `--unsafely-treat-insecure-origin-as-secure=${KOK}`] });

async function kur({ ua, standalone }) {
  const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, userAgent: ua });
  await baglam.addInitScript(([u, st]) => {
    if (st) Object.defineProperty(navigator, "standalone", { get: () => true });
    // Taklit bildirim API'si: izin "default", istek sayılır ve "denied" döner (abonelik denenmez).
    window.__izinIstendi = 0;
    class SahteBildirim { static permission = "default"; static async requestPermission() { window.__izinIstendi++; SahteBildirim.permission = "denied"; return "denied"; } }
    window.Notification = SahteBildirim;
    if (!("PushManager" in window)) window.PushManager = function PushManager() {};
    try {
      localStorage.setItem("sb-etezccrifaetzrgfvawl-auth-token", JSON.stringify({ access_token: "sahte.jwt", token_type: "bearer", expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: u }));
      localStorage.setItem("bildim_tanitim", "1");
      sessionStorage.setItem("bildim_bildirim_mac_sonrasi", "1");   // ana sayfa izin şeridini tetikler (maç sonrası)
    } catch { /* yok */ }
  }, [KULLANICI, standalone]);
  await baglam.route(/challenges\.cloudflare\.com/, (r) => r.abort());
  await baglam.route(/supabase\.co/, (r) => {
    const yol = new URL(r.request().url()).pathname;
    const json = (v) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(v) });
    if (yol.endsWith("/rpc/profilim")) return json({ id: KULLANICI.id, username: "P", gorunen_ad: "P", takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", coin: 0, xp: 0, dil: "tr" });
    if (yol.endsWith("/auth/v1/user")) return json(KULLANICI);
    if (yol.includes("/rest/v1/rpc/")) return json(null);
    if (yol.includes("/rest/v1/")) return json([]);
    return r.abort();
  });
  const sayfa = await baglam.newPage();
  const konsol = [];
  sayfa.on("pageerror", (e) => konsol.push(e.message));
  return { baglam, sayfa, konsol };
}

for (const [ad, ua, standalone] of [["tarayıcı (Android, ?dev)", ANDROID, false], ["uygulama (Android)", ANDROID, true], ["uygulama (iOS 16.4+)", IOS, true]]) {
  const { baglam, sayfa, konsol } = await kur({ ua, standalone });
  const ek = standalone ? "" : "?dev=1";
  await sayfa.goto(`${KOK}/${ek}`, { waitUntil: "domcontentloaded" });
  await sayfa.waitForSelector(".a-kabuk", { timeout: 15000 }).catch(() => {});
  await sayfa.waitForTimeout(2500);
  const serit = await sayfa.locator(".as-a2-bildirim .qt-dugme, .as-a2-bildirim button").count();
  sonuc(`${ad}: ana sayfa izin şeridi ${standalone ? "VAR" : "YOK"}`, standalone ? serit > 0 : serit === 0, `düğme=${serit}`);

  await sayfa.goto(`${KOK}/profil?sekme=ayarlar`, { waitUntil: "domcontentloaded" });
  const metin = sayfa.getByText(/Bildirimler yalnız uygulamada açılır|Açınca tarayıcı izin isteyecek/).first();
  await metin.waitFor({ timeout: 15000 }).catch(() => {});
  const yazi = (await metin.textContent().catch(() => "")) ?? "";
  sonuc(`${ad}: Profil açıklaması`, standalone ? /izin isteyecek/.test(yazi) : /yalnız uygulamada/.test(yazi), yazi.trim());
  const satir = sayfa.getByRole("switch", { name: /Bildirimler/ }).first();
  if (standalone) {
    await satir.click().catch(() => {});
    await sayfa.waitForTimeout(500);
  } else {
    sonuc(`${ad}: anahtar pasif`, await satir.isDisabled().catch(() => false));
    await satir.click({ force: true }).catch(() => {});
    await sayfa.waitForTimeout(500);
  }
  const istendi = await sayfa.evaluate(() => window.__izinIstendi);
  sonuc(`${ad}: requestPermission ${standalone ? "çağrıldı" : "HİÇ çağrılmadı"}`, standalone ? istendi >= 1 : istendi === 0, `sayı=${istendi}`);
  sonuc(`${ad}: konsol temiz`, !konsol.length, konsol.join(" | "));
  await baglam.close();
}

await tarayici.close();
console.log(hata ? `\n${hata} HATA` : "\nTÜMÜ GEÇTİ");
process.exit(hata ? 1 : 0);
