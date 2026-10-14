// Geçici TEST HESABI — captcha'lı Auth'ta ("Misafir olarak dene" headless tarayıcıda captcha_failed verir) ekran/duman
// testleri için oturum dosyası üretir ve iş bitince hesabı SİLER. Yetki/güvenlik ayarına dokunmaz: hesap Auth admin API ile
// (.env.local › SUPABASE_YENI_SERVICE_ROLE_KEY) e-postası onaylı açılır, magic link belirteci /verify ile oturuma çevrilir,
// tarayıcıda kurulum (ad · avatar · şehir) tamamlanır, Playwright storageState yazılır (git'e girmez).
// Kullanım:
//   node araclar/test-oturumu.mjs --ac  [--adres=http://localhost:5188] [--oturum=.arayuz-denetim-oturum.json] [--ad=HazineTest]
//   node araclar/test-oturumu.mjs --sil [--oturum=…]     → hesabimi_sil (uygulama temizliği) + admin silme + dosyalar kaldırılır
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const OTURUM = path.resolve(typeof ARG.oturum === "string" ? ARG.oturum : ".arayuz-denetim-oturum.json");
const META = OTURUM.replace(/\.json$/, "") + ".hesap.json";

function ortam() {
  const o = {};
  for (const d of [".env.local", ".env"]) {
    try { for (const m of fs.readFileSync(d, "utf8").matchAll(/^([A-Z_]+)=(.*)$/gm)) if (!(m[1] in o)) o[m[1]] = m[2].trim(); } catch { /* yok */ }
  }
  return o;
}
const E = ortam();
const URL_ = E.SUPABASE_YENI_URL || E.VITE_SUPABASE_URL;
const SERVIS = E.SUPABASE_YENI_SERVICE_ROLE_KEY;
const ANON = E.VITE_SUPABASE_ANON_KEY;
if (!URL_ || !SERVIS || !ANON) { console.error("! .env.local: SUPABASE_YENI_URL / SUPABASE_YENI_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY gerekli"); process.exit(1); }
const REF = new URL(URL_).hostname.split(".")[0];

async function istek(yol, { yontem = "GET", govde, anahtar = SERVIS, belirtec = SERVIS } = {}) {
  const r = await fetch(`${URL_}${yol}`, { method: yontem, headers: { apikey: anahtar, Authorization: `Bearer ${belirtec}`, "Content-Type": "application/json" },
    body: govde ? JSON.stringify(govde) : undefined });
  const metin = await r.text();
  let veri = null; try { veri = metin ? JSON.parse(metin) : null; } catch { veri = metin; }
  if (!r.ok) throw new Error(`${yontem} ${yol} → ${r.status} ${String(metin).slice(0, 160)}`);
  return veri;
}

async function ac() {
  if (fs.existsSync(OTURUM)) { console.log("· Oturum zaten var:", OTURUM); return; }
  const ad = (typeof ARG.ad === "string" ? ARG.ad : "QtTest") + Math.floor(Math.random() * 900 + 100);
  const eposta = `qt-test-${crypto.randomBytes(5).toString("hex")}@example.com`;
  const kul = await istek("/auth/v1/admin/users", { yontem: "POST", govde: { email: eposta, email_confirm: true, user_metadata: { test_hesabi: true } } });
  fs.writeFileSync(META, JSON.stringify({ id: kul.id, eposta, ad }, null, 2));
  try {
    const link = await istek("/auth/v1/admin/generate_link", { yontem: "POST", govde: { type: "magiclink", email: eposta } });
    const hash = link?.properties?.hashed_token ?? link?.hashed_token;
    const oturum = await istek("/auth/v1/verify", { yontem: "POST", anahtar: ANON, belirtec: ANON, govde: { type: "magiclink", token_hash: hash } });
    if (!oturum?.access_token) throw new Error("verify oturum döndürmedi");
    const kayit = { access_token: oturum.access_token, refresh_token: oturum.refresh_token, expires_in: oturum.expires_in,
      expires_at: oturum.expires_at ?? Math.floor(Date.now() / 1000) + Number(oturum.expires_in ?? 3600), token_type: "bearer", user: oturum.user };
    // Tarayıcıda kurulum (ad · avatar · şehir) — gerçek akış; sonra storageState
    const t = await chromium.launch({ channel: "chrome", headless: true });
    const b = await t.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    await b.addInitScript(([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); localStorage.setItem("bildim_tanitim", "1"); } catch { /* yok */ } },
      [`sb-${REF}-auth-token`, JSON.stringify(kayit)]);
    // Uygulama kapısı (src/lib/uygulamaKipi.js): canlı adreste kurulum sayfası yerine oyun açılsın (?dev=1 ile aynı geçiş)
    await b.addInitScript(() => { try { sessionStorage.setItem("qt_dev_gecis", "1"); } catch { /* yok */ } });
    const s = await b.newPage();
    await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
    await s.waitForTimeout(4000);
    const gec = async () => { for (let i = 0; i < 4; i++) { const d = s.getByRole("button", { name: /^(Geç|Atla|Anladım|Tamam|Kapat|İleri|Başla|Skip|Got it|Close)$/ }); if (!(await d.count())) return; await d.last().click({ timeout: 1500 }).catch(() => {}); await s.waitForTimeout(400); } };
    await gec();
    const alan = s.locator(".bd-modal-katman input").first();
    await alan.waitFor({ timeout: 15000 }).catch(() => {});
    if (await alan.count()) {
      await alan.fill(ad);
      await s.getByRole("button", { name: /^(Devam|Continue)$/ }).first().click().catch(() => {});
      await s.waitForTimeout(1800);
    }
    const ikon = s.locator(".bd-modal-katman .g-avatar-sec:not(.qt-av-kilitli)").first();
    if (await ikon.count()) { await ikon.click(); await s.waitForTimeout(400); }
    const kullan = s.getByRole("button", { name: /Bu avatarı kullan|Use this avatar/i });
    const avatarsiz = s.getByRole("button", { name: /Avatarsız devam et|Continue without an avatar/i });
    if (await kullan.count() && await kullan.first().isEnabled()) { await kullan.first().click(); await s.waitForTimeout(1800); }
    else if (await avatarsiz.count()) { await avatarsiz.first().click(); await s.waitForTimeout(1800); }
    const sehir = s.locator(".bd-modal-katman [role=combobox]").first();
    if (await sehir.count()) {
      await sehir.click();
      await s.locator(".bd-modal-katman [role=option]").first().waitFor({ timeout: 8000 }).catch(() => {});
      const sec = s.locator(".bd-modal-katman [role=option]").first();
      if (await sec.count()) await sec.click();
      await s.getByRole("button", { name: /Oyuna başla|Start playing/i }).first().click().catch(() => {});
      await s.waitForTimeout(2500);
    }
    await gec();
    const kurulumKaldi = await s.locator(".bd-modal-katman input").count();
    await b.storageState({ path: OTURUM });
    await t.close();
    console.log(`· Test hesabı açıldı: ${ad} (${kul.id})${kurulumKaldi ? " — kurulum penceresi hâlâ açık!" : ""} → ${OTURUM}`);
  } catch (e) {
    console.error("! Oturum kurulamadı:", e?.message ?? e, "— hesap siliniyor");
    await sil();
    process.exit(1);
  }
}

async function sil() {
  let meta = null;
  try { meta = JSON.parse(fs.readFileSync(META, "utf8")); } catch { /* yok */ }
  let belirtec = null;
  try {
    const st = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
    const k = (st.origins ?? []).flatMap((o) => o.localStorage ?? []).find((x) => /^sb-.+-auth-token$/.test(x.name));
    belirtec = k ? JSON.parse(k.value) : null;
  } catch { /* yok */ }
  const id = meta?.id ?? belirtec?.user?.id;
  if (!id) { console.log("· Silinecek test hesabı yok."); return; }
  // 1) Uygulamanın kendi silme yolu (profil + oyun verisi temizliği): taze belirteçle hesabimi_sil
  let uygulama = "atlandı";
  try {
    let erisim = belirtec?.access_token;
    if (belirtec?.refresh_token) {
      const y = await istek("/auth/v1/token?grant_type=refresh_token", { yontem: "POST", anahtar: ANON, belirtec: ANON, govde: { refresh_token: belirtec.refresh_token } }).catch(() => null);
      if (y?.access_token) erisim = y.access_token;
    }
    if (erisim) { await istek("/rest/v1/rpc/hesabimi_sil", { yontem: "POST", anahtar: ANON, belirtec: erisim, govde: {} }); uygulama = "hesabimi_sil tamam"; }
  } catch (e) { uygulama = "hesabimi_sil hata: " + String(e?.message ?? e).slice(0, 120); }
  // 2) Auth kaydı hâlâ duruyorsa admin ile sil
  let auth = "yok";
  try { await istek(`/auth/v1/admin/users/${id}`); try { await istek(`/auth/v1/admin/users/${id}`, { yontem: "DELETE" }); auth = "admin ile silindi"; } catch (e) { auth = "SİLİNEMEDİ: " + String(e?.message ?? e).slice(0, 120); } }
  catch { auth = "zaten silinmiş"; }
  for (const f of [OTURUM, META]) { try { fs.unlinkSync(f); } catch { /* yok */ } }
  console.log(`· Test hesabı ${id}: ${uygulama} · auth ${auth} · oturum dosyaları kaldırıldı`);
}

if (ARG.ac) await ac();
else if (ARG.sil) await sil();
else console.log("Kullanım: --ac | --sil");
