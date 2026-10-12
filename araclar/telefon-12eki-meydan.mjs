// Telefon denetimi 12 Eki 2026 — Meydan Oku / Modlar / Düello lobisi / Ortak Hazine lobisi / Bitenler ölçümü.
// Yerel dev sunucusuna karşı, taklit veriyle (arkadaş listesi + mac_gecmisim yanıtı route ile değiştirilir; sunucuya YAZMAZ).
// Kullanım: npx vite --port 5182 --strictPort (başka kabukta)
//           node araclar/telefon-12eki-meydan.mjs --oturum=<storageState.json> [--adres=http://localhost:5182]
//   Oturum: node araclar/arayuz-denetim.mjs --sadece-oturum --oturum=<dosya> --adres=... ile açılan misafir hesabı
//   (iş bitince: node araclar/arayuz-denetim.mjs --hesap-sil --oturum=<dosya>).
// Çıktı: tasarim/telefon-denetimi-12eki/meydan-*.png
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5182").replace(/\/$/, "");
const OTURUM = path.resolve(String(ARG.oturum || ".arayuz-denetim-oturum.json"));
const CIKTI = path.resolve("tasarim/telefon-denetimi-12eki");
fs.mkdirSync(CIKTI, { recursive: true });
const kayit = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const depoHam = kayit.origins.flatMap((o) => o.localStorage ?? []).filter((k) => /auth-token|bd_cihaz_id/.test(k.name));
const ben = JSON.parse(depoHam.find((k) => /auth-token/.test(k.name)).value).user.id;

const F1 = "11111111-1111-4111-8111-111111111111", F2 = "22222222-2222-4222-8222-222222222222";
const ARKADASLAR = [
  { id: F1, gorunen_ad: "yukii", gorunen_avatar: "/avatars/pro/mumya-k28.svg", puan: 1200 },
  { id: F2, gorunen_ad: "ege55", gorunen_avatar: null, puan: 900 },
];
const gun = (n) => new Date(Date.now() - n * 864e5).toISOString();
const GECMIS = [
  { mod: "klasik", id: "a1", tarih: gun(0), dereceli: true, rakip: ARKADASLAR[0], ben_skor: 130, rakip_skor: 100, sonuc: "kazandi", terk: null, duello: null },
  { mod: "duello", id: "a2", tarih: gun(1), dereceli: true, rakip: ARKADASLAR[1], ben_skor: null, rakip_skor: null, sonuc: "kaybetti", terk: null, duello: { surum: 4, bitis: "seri", seri: 3, seri_hedef: 3, tur: 9, eski: null } },
  { mod: "duello", id: "a3", tarih: gun(2), dereceli: false, rakip: ARKADASLAR[0], ben_skor: null, rakip_skor: null, sonuc: "kazandi", terk: null, duello: { surum: 4, bitis: "son_duello", seri: 0, seri_hedef: 3, tur: 20, eski: null } },
  { mod: "saf", id: "a4", tarih: gun(3), dereceli: true, rakip: ARKADASLAR[0], ben_skor: 20, rakip_skor: 10, sonuc: "kaybetti", terk: "ben", duello: null },
  { mod: "kasa", id: "a5", tarih: gun(4), dereceli: true, rakip: ARKADASLAR[1], ben_skor: 80, rakip_skor: 42, sonuc: "kazandi", terk: null, duello: null },
];

const sonuc = { hatalar: [] };
const tarayici = await chromium.launch({ channel: "chrome", headless: true });

async function baglamAc({ en, dil, asili = false }) {
  const depo = depoHam.map((k) => {
    if (!asili || !/auth-token/.test(k.name)) return k;
    const j = JSON.parse(k.value); j.expires_at = Math.floor(Date.now() / 1000) - 10;   // belirteç eskimiş → ön yükleme yeniler
    return { name: k.name, value: JSON.stringify(j) };
  });
  const c = await tarayici.newContext({ viewport: { width: en, height: en === 390 ? 844 : 780 }, deviceScaleFactor: 1 });
  const s = await c.newPage();
  const hatalar = [];
  s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text().slice(0, 300)); });
  s.on("pageerror", (e) => hatalar.push("pageerror: " + String(e).slice(0, 300)));
  await s.addInitScript(([d, dil]) => {
    try { for (const k of d) localStorage.setItem(k.name, k.value); localStorage.setItem("bildim_dil", dil); localStorage.setItem("bildim_tanitim", "1"); } catch { /* yut */ }
  }, [depo, dil]);
  await s.route("**/rest/v1/rpc/profilim*", async (r) => {
    try { const y = await r.fetch(); const j = await y.json(); const p = Array.isArray(j) ? j[0] : j; if (p) p.dil = dil; await r.fulfill({ response: y, json: j }); }
    catch { await r.continue().catch(() => {}); }
  });
  await s.route("**/rest/v1/friendships*", (r) => (r.request().method() === "GET"
    ? r.fulfill({ json: ARKADASLAR.map((a) => ({ requester: ben, addressee: a.id })) }) : r.continue()));
  await s.route(/\/rest\/v1\/profiles\?.*id=in\./, (r) => r.fulfill({ json: ARKADASLAR }));
  await s.route("**/rest/v1/rpc/mac_gecmisim*", (r) => r.fulfill({ json: GECMIS }));
  if (asili) await s.route("**/auth/v1/token**", () => { /* ağ askıda: yanıt yok */ });
  return { c, s, hatalar };
}
const kare = (s, ad) => s.screenshot({ path: path.join(CIKTI, `meydan-${ad}.png`) });
const tasma = (s) => s.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const ust = (s) => s.evaluate(() => ({ coin: Boolean(document.querySelector(".a-ust-blok .a-coin-hap")), zil: Boolean(document.querySelector(".a-ust-blok .bz-sarmal")) }));

try {
  // ---------- 1) TR 390: ana sayfa → Meydan Oku uygulama içi geçiş ×5 ----------
  {
    const { c, s, hatalar } = await baglamAc({ en: 390, dil: "tr" });
    await s.goto(`${ADRES}/`, { waitUntil: "domcontentloaded" });
    await s.waitForTimeout(5000);
    await kare(s, "ana-390-tr");
    sonuc.gecis = [];
    for (let i = 0; i < 5; i++) {
      await s.getByText("Meydan Okumalar").first().click();
      await s.waitForSelector(".a-meydan-kisi, .a-meydan-kime-bos", { timeout: 15000 }).catch(() => {});
      await s.waitForTimeout(800);
      const kisi = await s.locator(".a-meydan-kime .a-meydan-kisi:not(.a-meydan-kisi--ekle)").count();
      const iskelet = await s.locator(".a-meydan-kime .qt-iskelet").count();
      const eskiMetin = /sıra sende|7 joker türü/.test(await s.evaluate(() => document.querySelector(".a-meydan-modlar")?.innerText ?? ""));
      sonuc.gecis.push({ i, kisi, iskelet, ...(await ust(s)), eskiMetin });
      if (i < 4) { await s.goBack(); await s.waitForTimeout(1500); }
    }
    await kare(s, "ust-390-tr");
    // Mod kartları + sabit düğme: en alta kaydırınca düğme mod kartlarını örtmesin
    await s.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await s.waitForTimeout(400);
    sonuc.ortme = await s.evaluate(() => {
      const e = document.querySelector(".a-meydan-eylem")?.getBoundingClientRect();
      if (!e) return "düğme yok";
      const kartlar = [...document.querySelectorAll(".a-meydan-modlar .qt-mod, .a-meydan-katlanir summary")].map((k) => k.getBoundingClientRect());
      return kartlar.filter((k) => k.bottom > e.top + 1 && k.top < e.bottom - 1 && k.height > 0).length;
    });
    // Mod kartlarını düğmenin hemen üstüne getir (kaydırma ortası) — örtüşme ölç
    await s.evaluate(() => { const m = document.querySelector(".a-meydan-modlar"); m?.scrollIntoView({ block: "end" }); });
    await s.waitForTimeout(300);
    sonuc.ortmeOrta = await s.evaluate(() => {
      const e = document.querySelector(".a-meydan-eylem")?.getBoundingClientRect();
      if (!e) return "düğme yok";
      return [...document.querySelectorAll(".a-meydan-modlar .qt-mod")].map((k) => k.getBoundingClientRect())
        .filter((k) => k.bottom > e.top + 1 && k.top < e.bottom - 1).length;
    });
    await kare(s, "modkartlari-390-tr");
    // Örtülen 2. sıradaki karta (Saf Bilgi) dokununca kart düğmenin üstüne gelmeli
    const ortu = (sec) => s.evaluate((sec) => {
      const e = document.querySelector(".a-meydan-eylem")?.getBoundingClientRect(); const k = document.querySelector(sec)?.getBoundingClientRect();
      return e && k ? Math.max(0, Math.round(k.bottom - e.top)) : -1;
    }, sec);
    await s.locator(".a-meydan-modlar .qt-mod--saf").click();
    await s.waitForTimeout(500);
    sonuc.safSecinceOrtme = await ortu(".a-meydan-modlar .qt-mod--saf");
    // Düello seçiliyken (kategori bölümü yok) en alta kaydır: düğme hiçbir kartı örtmesin
    await s.locator(".a-meydan-modlar .qt-mod--duello").click();
    await s.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await s.waitForTimeout(400);
    sonuc.duelloAltOrtme = await ortu(".a-meydan-modlar .qt-mod--kasa");
    await s.locator(".a-meydan-modlar .qt-mod--klasik").click();
    // Bitenler
    await s.locator(".a-meydan-katlanir summary", { hasText: "Bitenler" }).click();
    await s.waitForTimeout(600);
    await s.locator(".a-meydan-katlanir[open]").last().scrollIntoViewIfNeeded();
    sonuc.bitenler = await s.evaluate(() => [...document.querySelectorAll(".a-meydan-katlanir[open] .qt-satir-kap")].map((x) => x.innerText.replace(/\n/g, " | ")));
    await kare(s, "bitenler-390-tr");
    // Grup paneli açık → Serbest/Dereceli gizli
    await s.evaluate(() => window.scrollTo(0, 0));
    await s.locator(".a-meydan-panel-bas").first().click();
    await s.waitForTimeout(500);
    sonuc.grupDereceliGorunur = await s.locator(".qt-dereceli, [class*=dereceli]").filter({ hasText: /Serbest/ }).count();
    await s.locator(".a-meydan-panel").first().scrollIntoViewIfNeeded();
    await kare(s, "grup-390-tr");
    sonuc.tasmaMeydan = await tasma(s);
    // Modlar
    await s.goto(`${ADRES}/modlar`, { waitUntil: "domcontentloaded" });
    await s.waitForTimeout(3500);
    sonuc.modlar = await s.evaluate(() => [...document.querySelectorAll(".a-modlar-ana .qt-mod")].map((x) => x.innerText.replace(/\n/g, " | ")));
    sonuc.tasmaModlar = await tasma(s);
    await kare(s, "modlar-390-tr");
    sonuc.hatalar.push(...hatalar.map((h) => "tr1: " + h));
    await c.close();
  }
  // ---------- 2) Düello lobisi: iskelet anı + yerleşmiş hâl (TR 390) ----------
  {
    const { c, s, hatalar } = await baglamAc({ en: 390, dil: "tr" });
    await s.route("**/rest/v1/rpc/duello_acilis_benim*", async (r) => { await new Promise((z) => setTimeout(z, 2500)); await r.continue().catch(() => {}); });
    await s.goto(`${ADRES}/duello`, { waitUntil: "domcontentloaded" });
    await s.waitForSelector(".m2-giris-kafa", { timeout: 15000 });
    await s.waitForTimeout(600);
    sonuc.duelloIskelet = await s.locator(".m2-giris-iskelet .qt-iskelet").count();
    await kare(s, "duello-iskelet-390-tr");
    await s.waitForTimeout(5000);
    sonuc.duelloKurallar = await s.evaluate(() => [...document.querySelectorAll(".lobi-kurallar li")].map((x) => x.innerText.replace(/\n/g, " ")));
    sonuc.duelloBaslik = await s.evaluate(() => document.querySelector(".m2-giris-yazi p")?.innerText);
    sonuc.tasmaDuello = await tasma(s);
    await kare(s, "duello-lobi-390-tr");
    await s.goto(`${ADRES}/kasa`, { waitUntil: "domcontentloaded" });
    await s.waitForTimeout(4000);
    sonuc.kasaKurallar = await s.evaluate(() => [...document.querySelectorAll(".lobi-kurallar li")].map((x) => x.innerText.replace(/\n/g, " ")));
    await kare(s, "kasa-lobi-390-tr");
    sonuc.hatalar.push(...hatalar.map((h) => "tr2: " + h));
    await c.close();
  }
  // ---------- 3) Ağ askıda (ön yükleme yenilemesi yanıtsız): sonsuz iskelet yerine "Tekrar dene" ----------
  {
    const { c, s, hatalar } = await baglamAc({ en: 390, dil: "tr", asili: true });
    await s.goto(`${ADRES}/`, { waitUntil: "domcontentloaded" });
    await s.waitForTimeout(3000);
    await s.getByText("Meydan Okumalar").first().click();
    await s.waitForTimeout(16000);
    sonuc.asili = {
      iskelet: await s.locator(".a-meydan-kime .qt-iskelet").count(),
      tekrarDene: await s.getByRole("button", { name: /Tekrar dene/i }).count(),
    };
    await s.locator("#a-meydan-kime-b").scrollIntoViewIfNeeded().catch(() => {});
    await kare(s, "asili-390-tr");
    sonuc.hatalarAsili = hatalar.length;   // ağ askıda: zaman aşımı uyarıları beklenir, sayılmaz
    await c.close();
  }
  // ---------- 4) EN 360×780 ----------
  {
    const { c, s, hatalar } = await baglamAc({ en: 360, dil: "en" });
    await s.goto(`${ADRES}/`, { waitUntil: "domcontentloaded" });
    await s.waitForTimeout(5000);
    await kare(s, "ana-360-en");
    await s.locator(".as-a2 a, .as-a2 button").filter({ hasText: /^Challenges/ }).first().click().catch(async () => { await s.goto(`${ADRES}/meydan`); });
    await s.waitForSelector(".a-meydan-kisi", { timeout: 15000 }).catch(() => {});
    await s.waitForTimeout(800);
    sonuc.enUst = await ust(s);
    await kare(s, "ust-360-en");
    await s.evaluate(() => document.querySelector(".a-meydan-modlar")?.scrollIntoView({ block: "end" }));
    await s.waitForTimeout(300);
    await kare(s, "modkartlari-360-en");
    await s.locator(".a-meydan-katlanir summary", { hasText: /Finished|Bitenler/ }).first().click().catch(() => {});
    await s.waitForTimeout(500);
    await s.locator(".a-meydan-katlanir[open]").last().scrollIntoViewIfNeeded().catch(() => {});
    sonuc.enBitenler = await s.evaluate(() => [...document.querySelectorAll(".a-meydan-katlanir[open] .qt-satir-kap")].map((x) => x.innerText.replace(/\n/g, " | ")));
    await kare(s, "bitenler-360-en");
    sonuc.tasmaEnMeydan = await tasma(s);
    await s.evaluate(() => window.scrollTo(0, 0));
    await s.locator(".a-meydan-panel-bas").first().click();
    await s.waitForTimeout(400);
    await s.locator(".a-meydan-panel").first().scrollIntoViewIfNeeded();
    await kare(s, "grup-360-en");
    await s.goto(`${ADRES}/modlar`, { waitUntil: "domcontentloaded" });
    await s.waitForTimeout(3500);
    sonuc.enModlar = await s.evaluate(() => [...document.querySelectorAll(".a-modlar-ana .qt-mod")].map((x) => x.innerText.replace(/\n/g, " | ")));
    sonuc.tasmaEnModlar = await tasma(s);
    await kare(s, "modlar-360-en");
    await s.goto(`${ADRES}/duello`, { waitUntil: "domcontentloaded" });
    await s.waitForTimeout(5000);
    sonuc.enDuelloKurallar = await s.evaluate(() => [...document.querySelectorAll(".lobi-kurallar li")].map((x) => x.innerText.replace(/\n/g, " ")));
    sonuc.tasmaEnDuello = await tasma(s);
    await kare(s, "duello-lobi-360-en");
    await s.goto(`${ADRES}/kasa`, { waitUntil: "domcontentloaded" });
    await s.waitForTimeout(4000);
    await kare(s, "kasa-lobi-360-en");
    sonuc.hatalar.push(...hatalar.map((h) => "en: " + h));
    await c.close();
  }
} finally {
  await tarayici.close();
}
console.log(JSON.stringify(sonuc, null, 1));
