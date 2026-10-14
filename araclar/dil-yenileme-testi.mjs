// Dil eşitlemesi + yenileme sigortası testi (14 Eki 2026) — taklit Supabase; canlıya istek gitmez.
//
//   npm run build
//   __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=qt.test npx vite preview --host 127.0.0.1 --port 4173   # başka kabukta
//   node araclar/dil-yenileme-testi.mjs [--port=4173]
//
// Olay: tarayıcı dili ≠ profil dili iken uygulama sayfayı sonsuz yeniledi (5 dk'da ~1.000 istek, DB düştü).
// Kural: açılışta profil dili tarayıcıya yazılır ve YENİLEMEDEN uygulanır; elle değişim tek yenileme;
// otomatik yenilemeler 30 sn'de en çok 2 (src/lib/yenilemeSigortasi.js). Her senaryoda yenileme ≤ 1.
import { chromium } from "playwright-core";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const KOK = `http://qt.test:${Number(ARG.port || 4173)}`;
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const KULLANICI = { id: "00000000-0000-4000-8000-000000000009", aud: "authenticated", role: "authenticated", email: "d@ornek.com",
  app_metadata: { provider: "email" }, user_metadata: {}, is_anonymous: false, created_at: "2026-09-01T00:00:00Z" };

let hata = 0;
const sonuc = (ad, tamam, ek = "") => { if (!tamam) hata++; console.log(`${tamam ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); };
const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--host-resolver-rules=MAP qt.test 127.0.0.1"] });

/**
 * @param {object} o
 * @param {"tr"|"en"|null} o.profilDili  null = oturum yok
 * @param {"tr"|"en"|null} o.tarayiciDili ilk açılışta localStorage'daki dil
 * @param {boolean} o.herYuklemede  true = tarayıcı dili HER yüklemede yeniden yazılır (olaydaki dış etken)
 */
async function kur({ profilDili, tarayiciDili, herYuklemede = false, tarayiciNavDili = "tr-TR" }) {
  const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, userAgent: ANDROID, locale: tarayiciNavDili });
  const durum = { profilDili, profilIstegi: 0, yazma: [] };
  await baglam.addInitScript(([u, oturum, dil, herSefer]) => {
    Object.defineProperty(navigator, "standalone", { get: () => true });   // kurulu uygulama: kapı açık
    try {
      const ilk = !sessionStorage.getItem("__dilTestiKuruldu");
      if (ilk) {
        sessionStorage.setItem("__dilTestiKuruldu", "1");
        localStorage.setItem("bildim_tanitim", "1");
        if (oturum) localStorage.setItem("sb-etezccrifaetzrgfvawl-auth-token", JSON.stringify({ access_token: "sahte.jwt", token_type: "bearer",
          expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: u }));
      }
      if (dil && (ilk || herSefer)) localStorage.setItem("bildim_dil", dil);
    } catch { /* yok */ }
  }, [KULLANICI, profilDili !== null, tarayiciDili, herYuklemede]);
  await baglam.route(/challenges\.cloudflare\.com/, (r) => r.abort());
  await baglam.route(/supabase\.co/, async (r) => {
    const istek = r.request();
    const yol = new URL(istek.url()).pathname;
    const json = (v, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(v) });
    if (yol.endsWith("/rpc/profilim")) {
      durum.profilIstegi++;
      return json({ id: KULLANICI.id, username: "D", gorunen_ad: "D", takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", coin: 0, xp: 0,
        dil: durum.profilDili, created_at: "2026-09-01T00:00:00Z" });
    }
    if (yol.endsWith("/rest/v1/profiles") && istek.method() === "PATCH") {
      try { const g = JSON.parse(istek.postData() || "{}"); if (g.dil) { durum.profilDili = g.dil; durum.yazma.push(g.dil); } } catch { /* yok */ }
      return r.fulfill({ status: 204, body: "" });
    }
    if (yol.endsWith("/auth/v1/user")) return json(KULLANICI);
    if (yol.includes("/rest/v1/rpc/")) return json(null);
    if (yol.includes("/rest/v1/")) return json([]);
    return r.abort();
  });
  const sayfa = await baglam.newPage();
  const konsol = [];
  sayfa.on("pageerror", (e) => konsol.push(e.message));
  let yukleme = 0;
  sayfa.on("load", () => { yukleme++; });
  return { baglam, sayfa, konsol, durum, yenileme: () => Math.max(0, yukleme - 1) };
}

const dilOku = (sayfa) => sayfa.evaluate(() => ({
  lang: document.documentElement.lang,
  kayit: localStorage.getItem("bildim_dil"),
  sekme: [...document.querySelectorAll("nav a, nav button")].map((x) => x.textContent.trim()).find((t) => /^(Ana Sayfa|Home)$/.test(t)) ?? null,
}));

// 1) Açılış eşitlemesi: profil ≠ tarayıcı → yenilemeden profil dili
for (const [ad, profil, tarayiciD, beklenenSekme, herSefer] of [
  ["profil tr · tarayıcı en", "tr", "en", "Ana Sayfa", false],
  ["profil en · tarayıcı tr", "en", "tr", "Home", false],
  ["profil en · tarayıcı en", "en", "en", "Home", false],
  ["OLAY: profil tr · tarayıcı her yüklemede en", "tr", "en", "Ana Sayfa", true],
  ["OLAY tersi: profil en · tarayıcı her yüklemede tr", "en", "tr", "Home", true],
]) {
  const { baglam, sayfa, konsol, durum, yenileme } = await kur({ profilDili: profil, tarayiciDili: tarayiciD, herYuklemede: herSefer });
  await sayfa.goto(`${KOK}/`, { waitUntil: "domcontentloaded" });
  await sayfa.waitForSelector(".a-kabuk", { timeout: 15000 }).catch(() => {});
  await sayfa.waitForTimeout(6000);   // döngü olsaydı bu sürede onlarca yükleme olurdu
  const d = await dilOku(sayfa);
  sonuc(`${ad}: yenileme 0`, yenileme() === 0, `yenileme=${yenileme()} profilim=${durum.profilIstegi}`);
  sonuc(`${ad}: arayüz profil dilinde (${profil})`, d.lang === profil && d.kayit === profil && d.sekme === beklenenSekme,
    `lang=${d.lang} kayıt=${d.kayit} sekme=${d.sekme}`);
  sonuc(`${ad}: profil üzerine yazılmadı`, durum.yazma.length === 0, durum.yazma.join(","));
  sonuc(`${ad}: konsol temiz`, !konsol.length, konsol.join(" | "));
  await baglam.close();
}

// 2) Oturumsuz: tarayıcı dili geçerli, yenileme yok
{
  const { baglam, sayfa, yenileme } = await kur({ profilDili: null, tarayiciDili: "en" });
  await sayfa.goto(`${KOK}/`, { waitUntil: "domcontentloaded" });
  await sayfa.waitForTimeout(4000);
  const d = await dilOku(sayfa);
  sonuc("oturumsuz · tarayıcı en: yenileme 0, dil en", yenileme() === 0 && d.lang === "en", `yenileme=${yenileme()} lang=${d.lang}`);
  await baglam.close();
}

// 3) Elle değişim (Profil › Ayarlar): önce profil yazılır, sonra TEK yenileme; sonra yeni dil kalıcı
{
  const { baglam, sayfa, durum, yenileme, konsol } = await kur({ profilDili: "tr", tarayiciDili: "tr" });
  await sayfa.goto(`${KOK}/profil?sekme=ayarlar`, { waitUntil: "domcontentloaded" });
  const en = sayfa.locator(".qt-pf-dil button", { hasText: /^EN$/ }).first();
  await en.waitFor({ timeout: 15000 }).catch(() => {});
  await en.click().catch(() => {});
  await sayfa.waitForTimeout(6000);
  const d = await dilOku(sayfa);
  sonuc("elle EN: profil 'en' yazıldı", durum.yazma.join(",") === "en", durum.yazma.join(","));
  sonuc("elle EN: tam 1 yenileme", yenileme() === 1, `yenileme=${yenileme()}`);
  sonuc("elle EN: arayüz en", d.lang === "en" && d.kayit === "en", `lang=${d.lang} kayıt=${d.kayit}`);
  sonuc("elle EN: konsol temiz", !konsol.length, konsol.join(" | "));
  await baglam.close();
}

// 4) Elle değişim, profil YAZILAMAZSA: dil değişmez, yenileme yok
{
  const { baglam, sayfa, durum, yenileme } = await kur({ profilDili: "tr", tarayiciDili: "tr" });
  await baglam.route(/\/rest\/v1\/profiles/, (r) => r.request().method() === "PATCH"
    ? r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "taklit hata" }) }) : r.fallback());
  await sayfa.goto(`${KOK}/profil?sekme=ayarlar`, { waitUntil: "domcontentloaded" });
  const en = sayfa.locator(".qt-pf-dil button", { hasText: /^EN$/ }).first();
  await en.waitFor({ timeout: 15000 }).catch(() => {});
  await en.click().catch(() => {});
  await sayfa.waitForTimeout(4000);
  const d = await dilOku(sayfa);
  const uyari = await sayfa.locator("#qt-dil-uyari").textContent().catch(() => "");
  sonuc("profil yazılamadı: yenileme 0, dil tr kaldı", yenileme() === 0 && d.lang === "tr" && d.kayit === "tr" && durum.profilDili === "tr",
    `yenileme=${yenileme()} lang=${d.lang} kayıt=${d.kayit}`);
  sonuc("profil yazılamadı: 'Dil kaydedilemedi' uyarısı", /Dil kaydedilemedi/.test(uyari ?? ""), uyari ?? "");
  await baglam.close();
}

// 5) Sigorta: 30 sn içinde 2 otomatik yenileme olduysa üçüncüsü yapılmaz (parça hatası yolu)
for (const [ad, onceki, beklenen] of [["sigorta boş → parça hatası 1 yenileme", 0, 1], ["sigorta dolu (2) → parça hatası yenilemez", 2, 0]]) {
  const { baglam, sayfa, yenileme } = await kur({ profilDili: "tr", tarayiciDili: "tr" });
  await sayfa.goto(`${KOK}/`, { waitUntil: "domcontentloaded" });
  await sayfa.waitForSelector(".a-kabuk", { timeout: 15000 }).catch(() => {});
  await sayfa.waitForTimeout(1500);
  await sayfa.evaluate((n) => {
    sessionStorage.removeItem("qt_parca_yenile");
    sessionStorage.setItem("qt_oto_yenileme", JSON.stringify(Array.from({ length: n }, () => Date.now() - 1000)));
    window.dispatchEvent(new Event("vite:preloadError", { cancelable: true }));
  }, onceki);
  await sayfa.waitForTimeout(3000);
  sonuc(ad, yenileme() === beklenen, `yenileme=${yenileme()}`);
  await baglam.close();
}

await tarayici.close();
console.log(hata ? `\n${hata} HATA` : "\nTÜMÜ GEÇTİ");
process.exit(hata ? 1 : 0);
