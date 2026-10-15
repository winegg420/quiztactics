// 1106 ekran testi — YEREL, tümüyle taklit (canlıya hiç istek gitmez: /rest, /auth ve /functions tarayıcıda karşılanır).
// Sahte oturum localStorage'a yazılır. Kapsam: Arkadaşlar (son görülme satırları), Profil › Ayarlar (anahtar), Giriş ekranı.
//   npx vite --port 5186 --strictPort      (başka kabukta)
//   node araclar/son-gorulme-1106-ekran.mjs [--adres=http://localhost:5186]
import { chromium } from "playwright-core";
import fs from "node:fs";
import { OLC } from "./_taklit-kur.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5186";
const CIKTI = "tasarim/son-gorulme-1106";
fs.mkdirSync(CIKTI, { recursive: true });
const REF = "etezccrifaetzrgfvawl";
const BEN = "00000000-0000-4000-8000-0000000000ff";
const dk = (n) => new Date(Date.now() - n * 60000).toISOString();
const ARK = [
  ["a1", "Zeynep", 900, 2], ["a2", "Mert", 800, 25], ["a3", "Elif", 700, 6 * 60], ["a4", "Can", 600, 30 * 60],
  ["a5", "Deniz", 500, 3 * 24 * 60], ["a6", "Ayşe", 400, 20 * 24 * 60], ["a7", "Gizli Kişi", 300, null],
].map(([k, ad, puan, gecen]) => ({ id: `00000000-0000-4000-8000-0000000000${k}`, ad, puan, gecen }));

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: BEN, role: "authenticated", aud: "authenticated", exp: 4102444800 })}.x`;
const kullanici = { id: BEN, aud: "authenticated", role: "authenticated", email: "test@example.com", app_metadata: { provider: "email" }, user_metadata: {}, created_at: dk(1000) };
const oturum = { access_token: jwt, refresh_token: "x", token_type: "bearer", expires_in: 3600, expires_at: 4102444800, user: kullanici };
const PROFIL = { id: BEN, gorunen_ad: "Test Oyuncu", takma_ad: "testoyuncu", takma_ad_secildi: true, avatar_onayli: true, dil: "tr", puan: 100, level: 5, coin: 10, ulke: "TR", sehir: "İstanbul", son_gorulme_gizli: false, is_bot: false };

let hata = 0;
const sonuc = [];
const kontrol = (ad, k, ek = "") => { sonuc.push(`${k ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); if (!k) hata++; };

async function baglamKur(tarayici, viewport, oturumlu) {
  const baglam = await tarayici.newContext({ viewport, deviceScaleFactor: 1 });
  if (oturumlu) await baglam.addInitScript(([anahtar, deger]) => { try { localStorage.setItem(anahtar, deger); } catch { /* yut */ } }, [`sb-${REF}-auth-token`, JSON.stringify(oturum)]);
  await baglam.route(/\.(mp3|ogg|wav|m4a|aac)(\?|$)/, (r) => r.abort());
  await baglam.route(/\/realtime\//, (r) => r.abort());
  await baglam.route(/\/auth\/v1\//, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(/settings/.test(r.request().url()) ? { external: { google: true, facebook: false }, disable_signup: false } : kullanici) }));
  await baglam.route(/\/functions\/v1\//, (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await baglam.route(/\/rest\/v1\//, (r) => {
    const u = r.request().url();
    const yanit = (j) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(j) });
    if (/\/rpc\/profilim/.test(u)) return yanit(PROFIL);
    if (/\/rpc\/arkadas_son_gorulme/.test(u)) return yanit(ARK.filter((a) => a.gecen != null).map((a) => ({ id: a.id, son_gorulme: dk(a.gecen) })));
    if (/\/rest\/v1\/friendships/.test(u)) {
      return yanit(ARK.map((a, i) => ({ id: `f${i}`, requester: BEN, addressee: a.id, durum: "arkadas", created_at: dk(1000),
        req: { id: BEN, gorunen_ad: "Test Oyuncu", gorunen_avatar: null, puan: 100 }, add: { id: a.id, gorunen_ad: a.ad, gorunen_avatar: null, puan: a.puan } })));
    }
    if (r.request().method() !== "GET" && !/\/rpc\//.test(u)) return yanit([]);
    return yanit(/\/rpc\//.test(u) ? null : []);
  });
  return baglam;
}

const tarayici = await chromium.launch({ channel: "chrome" });
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const ek = String(viewport.width);
    // ---- Arkadaşlar
    let baglam = await baglamKur(tarayici, viewport, true);
    let p = await baglam.newPage();
    const konsol = [];
    p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_FAILED/.test(m.text())) konsol.push(m.text()); });
    await p.goto(`${ADRES}/oyun/arkadaslar?dev=1`);
    await p.waitForSelector(".ar-satir", { timeout: 20000 });
    await p.waitForSelector(".ar-son-gorulme", { timeout: 8000 }).catch(() => {});
    const metinler = await p.locator(".ar-son-gorulme").allInnerTexts();
    console.log(`[${ek}] son görülme metinleri:`, JSON.stringify(metinler));
    kontrol(`[${ek}] 6 çevrimdışı arkadaşta son görülme`, metinler.length === 6, String(metinler.length));
    const beklenen = ["Az önce", "25 dk önce", "6 sa önce", "Dün", "3 gün önce", "1 haftadan uzun"];
    kontrol(`[${ek}] metinler beklenen sırada`, beklenen.every((b, i) => (metinler[i] ?? "").includes(b)));
    kontrol(`[${ek}] gizleyen arkadaşta metin yok`, (await p.locator(".ar-satir").count()) === 7);
    const o = await p.evaluate(OLC);
    kontrol(`[${ek}] arkadaşlar yatay taşma 0`, o.yatay <= 0, `${o.yatay}px`);
    await p.getByText("Atla", { exact: true }).first().click({ timeout: 1500 }).catch(() => {});
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${CIKTI}/arkadaslar-${ek}.png`, fullPage: true });
    kontrol(`[${ek}] arkadaşlar konsol hatası 0`, konsol.length === 0, konsol.slice(0, 2).join(" | "));
    await p.close();

    // ---- Ayarlar
    p = await baglam.newPage();
    const konsol2 = [];
    p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_FAILED/.test(m.text())) konsol2.push(m.text()); });
    await p.goto(`${ADRES}/oyun/profil?sekme=ayarlar&dev=1`);
    await p.getByText("Son görülmemi gizle").first().waitFor({ timeout: 20000 });
    kontrol(`[${ek}] Ayarlar › "Son görülmemi gizle" görünür`, true);
    await p.getByText("Atla", { exact: true }).first().click({ timeout: 1500 }).catch(() => {});
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${CIKTI}/ayarlar-${ek}.png`, fullPage: true });
    const o2 = await p.evaluate(OLC);
    kontrol(`[${ek}] ayarlar yatay taşma 0`, o2.yatay <= 0, `${o2.yatay}px`);
    kontrol(`[${ek}] ayarlar konsol hatası 0`, konsol2.length === 0, konsol2.slice(0, 2).join(" | "));
    await p.close();
    await baglam.close();

    // ---- Giriş (oturumsuz)
    baglam = await baglamKur(tarayici, viewport, false);
    p = await baglam.newPage();
    await p.goto(`${ADRES}/?dev=1`);
    await p.waitForSelector(".g-giris-kart", { timeout: 20000 });
    const fb = await p.getByText(/Facebook/i).count();
    kontrol(`[${ek}] giriş ekranında Facebook yok`, fb === 0, `${fb} eşleşme`);
    kontrol(`[${ek}] Google düğmesi var`, (await p.getByText("Google ile devam et").count()) >= 1);
    await p.screenshot({ path: `${CIKTI}/giris-${ek}.png`, fullPage: true });
    await p.close();
    await baglam.close();
  }
} finally {
  await tarayici.close();
}
console.log(sonuc.join("\n"));
console.log(hata ? `\n${hata} kontrol başarısız` : "\nHepsi geçti");
process.exitCode = hata ? 1 : 0;
