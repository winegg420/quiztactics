// İzleme kaydı istemci testi (Paket 4 · 1097) — taklit Supabase, canlıya HİÇ istek gitmez.
//
//   npm run build
//   __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=qt.test npx vite preview --host 127.0.0.1 --port 4173   # başka kabukta
//   node araclar/izleme-istemci-testi.mjs [--port=4173]
//
// Senaryolar (her biri bir kez): girişli uygulamada JS hatası (iki kez → bir kayıt), başarısız RPC,
// giris + kurulum olayları, toplu tek çağrı; girişsiz sekmede kayıt çağrısı yok; sahip sayfası 390 px.
import { chromium } from "playwright-core";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const KOK = `http://qt.test:${Number(ARG.port || 4173)}`;
const UA_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const KULLANICI = { id: "00000000-0000-4000-8000-000000000009", aud: "authenticated", role: "authenticated", email: "yeni@ornek.com",
  app_metadata: { provider: "email" }, user_metadata: {}, is_anonymous: false, created_at: new Date(Date.now() - 48 * 3600e3).toISOString() };
const OZET = {
  hata_24s: 12, hata_10dk: 3, hata_kisi_24s: 4, esik: 50, aktif_kullanici: 7, sunucu_ms: 21.4, db_boyut_mb: 180, baglanti: 14,
  en_sik: [{ tur: "rpc", sayfa: "/duello/[kimlik]", mesaj: "duello_hamle 400 P0001: Sıra sende değil — çok uzun bir mesaj ".repeat(3), sayi: 5, kisi: 2, son: new Date().toISOString(), surum: "abc123" }],
  olaylar: { giris: 9, kayit: 2 }, maclar: [{ mod: "klasik", basladi: 3, bitti: 2 }, { mod: "duello", basladi: 1, bitti: 1 }],
  son_kontrol: new Date().toISOString(), son_uyari: null, son_uyari_sayi: null, son_uyari_kod: null,
};

let hata = 0;
const sonuc = (ad, tamam, ek = "") => { if (!tamam) hata++; console.log(`${tamam ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); };
const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--host-resolver-rules=MAP qt.test 127.0.0.1"] });

async function kur({ girisli = true, standalone = true, istekler }) {
  const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, userAgent: UA_IOS });
  if (standalone) await baglam.addInitScript(() => { Object.defineProperty(navigator, "standalone", { get: () => true }); });
  if (girisli) {
    await baglam.addInitScript((u) => {
      const s = { access_token: "sahte.jwt", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: u };
      try { localStorage.setItem("sb-etezccrifaetzrgfvawl-auth-token", JSON.stringify(s)); localStorage.setItem("bildim_tanitim", "1"); } catch { /* yok */ }
    }, KULLANICI);
  }
  await baglam.route(/challenges\.cloudflare\.com/, (r) => r.abort());
  await baglam.route(/supabase\.co/, async (r) => {
    const yol = new URL(r.request().url()).pathname;
    let govde = null;
    try { govde = r.request().postDataJSON(); } catch { /* yok */ }
    istekler.push({ yol, govde });
    const json = (status, v) => (v === undefined ? r.fulfill({ status: 204, body: "" }) : r.fulfill({ status, contentType: "application/json", body: JSON.stringify(v) }));
    if (yol.endsWith("/rpc/istemci_kayit_yaz")) return json(204);
    if (yol.endsWith("/rpc/kalp_at")) return json(400, { code: "P0001", message: "Deneme hatası a@b.com" });
    if (yol.endsWith("/rpc/sahip_mi")) return json(200, true);
    if (yol.endsWith("/rpc/saglik_ping")) return json(200, 1);
    if (yol.endsWith("/rpc/izleme_ozeti")) return json(200, OZET);
    if (yol.endsWith("/rpc/profilim")) return json(200, { id: KULLANICI.id, username: "Yeni", gorunen_ad: "Yeni", takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", coin: 0, xp: 0, dil: "tr" });
    if (yol.endsWith("/auth/v1/user")) return json(200, KULLANICI);
    if (yol.includes("/rest/v1/rpc/")) return json(200, null);
    if (yol.includes("/rest/v1/")) return json(200, []);
    return r.abort();
  });
  const sayfa = await baglam.newPage();
  return { baglam, sayfa };
}
const gizle = (s) => s.evaluate(() => {
  Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
});
const kayitlar = (ist) => ist.filter((i) => i.yol.endsWith("/rpc/istemci_kayit_yaz"));

try {
  // 1) Girişli uygulama: hata + başarısız RPC + olaylar → tek toplu çağrı
  {
    const istekler = [];
    const { baglam, sayfa } = await kur({ istekler });
    await sayfa.goto(`${KOK}/`, { waitUntil: "domcontentloaded" });
    await sayfa.waitForTimeout(3000);
    await sayfa.evaluate(() => {
      setTimeout(() => { throw new TypeError("deneme patladı ?davet=ABCD1234"); }, 0);
      setTimeout(() => { throw new TypeError("deneme patladı ?davet=ABCD1234"); }, 10);
    });
    await sayfa.waitForTimeout(500);
    sonuc("15 sn dolmadan kayıt çağrısı yok", kayitlar(istekler).length === 0, `çağrı=${kayitlar(istekler).length}`);
    await gizle(sayfa);
    await sayfa.waitForTimeout(1500);
    const k = kayitlar(istekler);
    sonuc("sayfa gizlenince tek toplu çağrı", k.length === 1, `çağrı=${k.length}`);
    const g = k[0]?.govde ?? {};
    const js = (g.p_hatalar ?? []).filter((h) => h.tur === "js");
    sonuc("aynı JS hatası bir kez", js.length === 1, JSON.stringify(js));
    sonuc("davet kodu temizlendi", js[0] && !/ABCD1234/.test(js[0].mesaj));
    sonuc("oturum/sürüm/cihaz gönderildi", /^[0-9a-f-]{36}$/.test(g.p_oturum ?? "") && Boolean(g.p_surum) && g.p_cihaz === "ios", `${g.p_surum} ${g.p_cihaz}`);
    const olaylar = (g.p_olaylar ?? []).map((o) => o.olay).sort().join(",");
    sonuc("giris + kurulum olayı", olaylar === "giris,kurulum", olaylar);
    await baglam.close();
  }

  // 2) Başarısız RPC (supabase-js üzerinden) kaydı — kalp_at uygulamanın kendi çağrısı; ayrı sayfa açılışı
  {
    const istekler = [];
    const { baglam, sayfa } = await kur({ istekler });
    await sayfa.goto(`${KOK}/`, { waitUntil: "domcontentloaded" });
    await sayfa.waitForTimeout(4000);
    await gizle(sayfa);
    await sayfa.waitForTimeout(1500);
    const g = kayitlar(istekler)[0]?.govde ?? {};
    const rpc = (g.p_hatalar ?? []).filter((h) => h.tur === "rpc");
    const kalpCagrildi = istekler.some((i) => i.yol.endsWith("/rpc/kalp_at"));
    sonuc("başarısız RPC kaydedildi (e-posta temiz)", !kalpCagrildi || (rpc.some((h) => /^kalp_at 400 P0001/.test(h.mesaj)) && rpc.every((h) => !/a@b\.com/.test(h.mesaj))),
      kalpCagrildi ? JSON.stringify(rpc) : "kalp_at bu açılışta çağrılmadı");
    await baglam.close();
  }

  // 3) Girişsiz sekme: kayıt çağrısı yok
  {
    const istekler = [];
    const { baglam, sayfa } = await kur({ girisli: false, standalone: false, istekler });
    await sayfa.goto(`${KOK}/`, { waitUntil: "domcontentloaded" });
    await sayfa.waitForTimeout(1500);
    await sayfa.evaluate(() => { setTimeout(() => { throw new Error("girişsiz hata"); }, 0); });
    await sayfa.waitForTimeout(300);
    await gizle(sayfa);
    await sayfa.waitForTimeout(1000);
    sonuc("girişsiz: kayıt çağrısı yok", kayitlar(istekler).length === 0, `çağrı=${kayitlar(istekler).length}`);
    await baglam.close();
  }

  // 4) Sahip sayfası 390 px
  {
    const istekler = [];
    const { baglam, sayfa } = await kur({ istekler });
    await sayfa.goto(`${KOK}/yonetim/izleme`, { waitUntil: "domcontentloaded" });
    await sayfa.getByText("Son başarılı uyarı kontrolü").waitFor({ timeout: 10000 });
    const metin = await sayfa.locator(".yi").innerText();
    sonuc("sahip sayfası çizildi", /En sık 10 hata/.test(metin) && /Aktif kullanıcı/.test(metin) && /ms/.test(metin));
    const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    sonuc("390 px yatay taşma yok", tasma <= 0, `taşma=${tasma}`);
    if (ARG.gorsel) await sayfa.screenshot({ path: ARG.gorsel, fullPage: true });
    await baglam.close();
  }
} catch (e) {
  hata++;
  console.error("✗ test durdu:", e?.message ?? e);
} finally {
  await tarayici.close();
}
console.log(hata ? `\n${hata} başarısız` : "\nHepsi geçti");
process.exit(hata ? 1 : 0);
