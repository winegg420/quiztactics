// Telefon denetimi 2 (12 Eki 2026) — madde 3–6 ekran ölçümü. Yerel dev sunucusu + misafir ARAÇ oturumu.
// Profil dili yanıtta test diline çevrilir (kayıtlı dil TR kalır → madde 3'ün "EN arayüz, TR hesap" durumu).
// Arkadaş listesi / maç geçmişi taklit (route); diğer okumalar canlı (her sayfa BİR kez açılır, yoklama yok).
// Kullanım: npx vite --port 5182 --strictPort (başka kabukta)
//           node araclar/telefon-12eki-2-ekran.mjs --oturum=<storageState.json> [--adres=http://localhost:5182]
// Çıktı: tasarim/telefon-denetimi-12eki-2/*.png + olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5182").replace(/\/$/, "");
const OTURUM = path.resolve(String(ARG.oturum || ".arayuz-denetim-oturum.json"));
const CIKTI = path.resolve("tasarim/telefon-denetimi-12eki-2");
fs.mkdirSync(CIKTI, { recursive: true });
const kayit = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const depo = kayit.origins.flatMap((o) => o.localStorage ?? []).filter((k) => /auth-token|bd_cihaz_id/.test(k.name));
const ben = JSON.parse(depo.find((k) => /auth-token/.test(k.name)).value).user.id;

const F1 = "11111111-1111-4111-8111-111111111111", F2 = "22222222-2222-4222-8222-222222222222";
const ARKADASLAR = [
  { id: F1, gorunen_ad: "yukii", gorunen_avatar: "/avatars/pro/mumya-k28.svg", puan: 1200 },
  { id: F2, gorunen_ad: "ege55", gorunen_avatar: null, puan: 900 },
];
// EN ekranda görünmemesi gereken Türkçe kozmetik/unvan/rozet adları (cerceveler.ad_tr + sık geçen unvan/rozet adları)
const TR_ADLAR = ["Bronz Lig", "Gümüş Lig", "Altın Lig", "Elmas Lig", "Efsane Lig", "Turnuva Şampiyonu", "Çerçevesi", "Kanatları",
  "Çiçek Bahçesi", "Neon Çizgi", "Okyanus Dalgası", "Yıldız Tozu", "Buz Kristali", "Ejder Pulu", "Gezegen Halkası", "Kraliyet",
  "Koleksiyoncu", "Çaylak", "Şampiyonu"];

const olcum = { hatalar: [] };
const tarayici = await chromium.launch({ channel: "chrome", headless: true });

async function baglamAc(en, dil) {
  const c = await tarayici.newContext({ viewport: { width: en, height: en === 390 ? 844 : 780 }, deviceScaleFactor: 1 });
  const s = await c.newPage();
  const hatalar = [];
  s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text().slice(0, 300)); });
  s.on("response", (y) => { if (y.status() >= 400) hatalar.push("yanıt " + y.status() + " " + y.url().split("?")[0].slice(-60)); });
  s.on("pageerror", (e) => hatalar.push("pageerror: " + String(e).slice(0, 300)));
  await s.addInitScript(([d, dil]) => {
    try { for (const k of d) localStorage.setItem(k.name, k.value); localStorage.setItem("bildim_dil", dil); localStorage.setItem("bildim_tanitim", "1"); } catch { /* yut */ }
  }, [depo, dil]);
  await s.route("**/rest/v1/rpc/profilim*", async (r) => {
    try { const y = await r.fetch(); const j = await y.json(); const p = Array.isArray(j) ? j[0] : j; if (p) p.dil = dil; await r.fulfill({ response: y, json: j }); }
    catch { await r.continue().catch(() => {}); }
  });
  await s.route("**/rest/v1/rpc/sahip_mi*", (r) => r.fulfill({ json: true }));   // /yonetim/posta yerelde açılsın (sunucuya yazmaz)
  await s.route("**/rest/v1/friendships*", (r) => (r.request().method() === "GET"
    ? r.fulfill({ json: ARKADASLAR.map((a) => ({ id: "f-" + a.id.slice(0, 4), requester: ben, addressee: a.id, durum: "arkadas" })) }) : r.continue()));
  await s.route(/\/rest\/v1\/profiles\?.*id=in\./, (r) => r.fulfill({ json: ARKADASLAR }));
  // Başlık doğrulaması: istemci her RPC'ye x-arayuz-dil koyuyor mu
  s.on("request", (q) => { if (q.url().includes("/rest/v1/rpc/cerceve_katalogu")) olcum[`baslik_${dil}`] = q.headers()["x-arayuz-dil"] ?? null; });
  return { c, s, hatalar };
}
const kare = (s, ad) => s.screenshot({ path: path.join(CIKTI, `${ad}.png`) });
const tasma = (s) => s.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const git = async (s, yol, bekle = 4000) => { console.log("→", yol); await s.goto(`${ADRES}${yol}`, { waitUntil: "domcontentloaded" }); await s.waitForTimeout(bekle); };
// Sabit düğmenin (yalnız düğmenin kendisi) örttüğü kart sayısı + şeridin örttüğü (kartın şerit arkasında kalan kısmı)
const ortme = (s, kartSec, eylemSec) => s.evaluate(([ks, es]) => {
  const serit = document.querySelector(es); const d = serit?.querySelector(".qt-dugme");
  if (!serit || !d) return { dugme: "yok" };
  const dr = d.getBoundingClientRect(), sr = serit.getBoundingClientRect();
  const kartlar = [...document.querySelectorAll(ks)].map((k) => ({ ad: k.innerText.split("\n")[0], r: k.getBoundingClientRect() })).filter((k) => k.r.height > 0);
  const kes = (a, b) => a.bottom > b.top + 1 && a.top < b.bottom - 1;
  // Düğmenin üstünde kart pikseli görünüyor mu: şerit opaksa kart düğmenin altında ÇİZİLMEZ (elementFromPoint)
  const gorunur = kartlar.filter((k) => kes(k.r, dr)).filter((k) => {
    const x = Math.min(Math.max(k.r.left + 8, dr.left + 2), dr.right - 2);
    const el = document.elementFromPoint(x, Math.max(dr.top + 2, sr.top + 2));
    return el && !serit.contains(el);
  });
  return { dugmeUst: Math.round(dr.top), seritUst: Math.round(sr.top), seritZemin: getComputedStyle(serit).backgroundColor,
    dugmeyleKesisen: kartlar.filter((k) => kes(k.r, dr)).map((k) => k.ad), dugmeArkasindaGorunen: gorunur.map((k) => k.ad),
    seritArkasinda: kartlar.filter((k) => kes(k.r, sr)).map((k) => k.ad) };
}, [kartSec, eylemSec]);
const kesik = (s, metin) => s.evaluate((m) => [...document.querySelectorAll("p, span, div")].filter((e) => e.children.length === 0 && e.textContent.trim() === m)
  .map((e) => ({ yukseklik: e.clientHeight, tasma: e.scrollHeight - e.clientHeight, yatay: e.scrollWidth - e.clientWidth, kirpma: getComputedStyle(e).webkitLineClamp })), metin);
const trAdlar = (s) => s.evaluate((liste) => { const t = document.body.innerText; return liste.filter((a) => t.includes(a)); }, TR_ADLAR);

for (const [en, dil] of [[390, "tr"], [360, "en"]]) {
  const e = `${en}-${dil}`;
  const { c, s, hatalar } = await baglamAc(en, dil);
  const o = (olcum[e] = {});
  try {
    // Madde 4: Meydan Oku ilk açılış (hiç kaydırmadan) + en alt
    await git(s, "/meydan", 6000);
    o.meydanIlk = await ortme(s, ".a-meydan-modlar .qt-mod, .a-meydan-kisi, .a-meydan-katlanir summary", ".a-meydan-eylem");
    await kare(s, `meydan-ilk-${e}`);
    await s.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await s.waitForTimeout(400);
    o.meydanAlt = await ortme(s, ".a-meydan-modlar .qt-mod, .a-meydan-katlanir summary, .a-meydan-bolum", ".a-meydan-eylem");
    o.tasmaMeydan = await tasma(s);
    await kare(s, `meydan-alt-${e}`);
    // Madde 5: Ortak Hazine kısa açıklaması — Meydan mod kartı
    const kasaMetin = dil === "en" ? "Answer alone, grab the treasure." : "Tek bilen hazineyi alır, doğru anda aç.";
    await s.evaluate(() => document.querySelector(".a-meydan-modlar .qt-mod--kasa")?.scrollIntoView({ block: "center" })); await s.waitForTimeout(300);
    o.kasaMeydan = await kesik(s, kasaMetin);
    await kare(s, `meydan-kasa-kart-${e}`);
    // Ana sayfa kartı
    await git(s, "/", 5000);
    o.kasaAna = await kesik(s, kasaMetin);
    o.tasmaAna = await tasma(s);
    await kare(s, `ana-${e}`);
    // Modlar
    await git(s, "/modlar", 3500);
    o.kasaModlar = await kesik(s, kasaMetin);
    await kare(s, `modlar-${e}`);
    // Mod seçim penceresi: Arkadaşlar → arkadaş kartı (taklit arkadaş) → Oyna. Arama başlatan düğmelere DOKUNULMAZ.
    await git(s, "/arkadaslar", 4500);
    try {
      await s.locator("button.qt-dugme", { hasText: dil === "en" ? /^Play$/ : /^Oyna$/ }).first().click({ timeout: 8000 });
      await s.waitForTimeout(1200);
      o.kasaPencere = await s.evaluate((m) => { const e = [...document.querySelectorAll("[role=dialog] *")].find((x) => x.textContent.trim() === m && x.children.length === 0);
        return e ? { tasma: e.scrollHeight - e.clientHeight, yatay: e.scrollWidth - e.clientWidth } : "metin yok"; }, kasaMetin);
      await kare(s, `mod-penceresi-${e}`);
    } catch (x) { o.kasaPencere = "açılamadı: " + String(x.message).slice(0, 80); }
    // Madde 3: Koleksiyon, Profil, Lig + oyuncu kartı — EN'de TR ad yok
    await git(s, "/profil?sekme=koleksiyon", 5000);
    o.koleksiyonTr = await trAdlar(s);
    await kare(s, `koleksiyon-${e}`);
    await git(s, "/profil", 4500);
    o.profilTr = await trAdlar(s);
    await kare(s, `profil-${e}`);
    await git(s, "/profil?sekme=rozet", 4500);
    o.rozetTr = await trAdlar(s);
    await kare(s, `rozetler-${e}`);
    // Kendi oyuncu kartım (ana sayfa ad düğmesi): çerçeve/unvan/rozet adları
    await git(s, "/", 4500);
    try { await s.getByText(/^ArayuzDen/).first().click({ timeout: 8000 }); await s.waitForTimeout(2500); o.oyuncuKartiTr = await trAdlar(s); await kare(s, `oyuncu-karti-${e}`); }
    catch (x) { o.oyuncuKartiTr = "açılamadı: " + String(x.message).slice(0, 80); }
    await git(s, "/siralama", 5000);
    o.ligTr = await trAdlar(s);
    await kare(s, `lig-${e}`);
    // Madde 4 (aynı desen): Hatalarım
    await git(s, "/calisma", 5000);
    o.calismaIlk = await ortme(s, ".qt-kart, .m1-cal-kart, section", ".m1-cal-eylem");
    await kare(s, `calisma-ilk-${e}`);
    // Madde 6: Yönetim › Posta — avatar ödülü (yerelde SahipKapisi açık)
    await git(s, "/yonetim/posta", 4500);
    await s.getByRole("button", { name: /\+ ?Avatar/ }).first().click().catch(() => {});
    await s.waitForTimeout(1500);
    o.posta = await s.evaluate(() => {
      const iz = document.querySelector(".yp-avatar-izgara");
      return { izgara: Boolean(iz), resim: iz?.querySelectorAll("img").length ?? 0, secili: iz?.querySelectorAll(".yp-avatar-sec--secili").length ?? 0,
        select: document.querySelectorAll(".yp-odul-satir select").length };
    });
    const katalog = await s.evaluate(async () => {
      try { const m = await import("/src/lib/supabase.js"); const { data } = await m.supabase.rpc("avatar_katalogu_oyun"); return (data ?? []).flatMap((a) => [a.ad_tr, a.ad_en]).filter((x) => x && x.length > 3); }
      catch { return []; }
    });
    o.postaAvatarAdi = await s.evaluate((adlar) => { const t = document.body.innerText; return adlar.filter((a) => t.includes(a)); }, katalog);
    o.postaKatalogAdSayisi = katalog.length;
    await s.locator(".yp-avatar-sec").nth(2).click().catch(() => {});
    await s.waitForTimeout(300);
    o.postaSecimSonra = await s.evaluate(() => [...document.querySelectorAll(".yp-avatar-sec")].findIndex((b) => b.classList.contains("yp-avatar-sec--secili")));
    await s.locator(".yp-avatar-izgara").scrollIntoViewIfNeeded().catch(() => {});
    await kare(s, `yonetim-posta-${e}`);
    o.tasmaPosta = await tasma(s);
  } catch (x) {
    o.hata = String(x?.message ?? x).slice(0, 200);
  }
  olcum.hatalar.push(...hatalar.map((h) => `${e}: ${h}`));
  await c.close();
}
await tarayici.close();
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(olcum, null, 2));
console.log(JSON.stringify(olcum, null, 1));
