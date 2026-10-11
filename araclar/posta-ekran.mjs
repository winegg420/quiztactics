// Posta kutusu (1060) — TAKLİT VERİYLE ölçüm + ekran görüntüsü.
// CANLIYA HİÇ İSTEK GİTMEZ: oturum taklit (sahte JWT), /auth/v1 ve /rest/v1 tarayıcıda (page.route) yanıtlanır;
// taklidi olmayan RPC null, tablo okuması [] döner, yazmalar kesilir. Realtime ve ses dosyaları kapalı.
// Taklit: posta_kutusu · posta_kutusu_oku · posta_odul_al · sahip_mi · posta_gonderilenler · posta_oyuncu_ara ·
//         avatar_katalogu_oyun (+ profilim).
//
// Anlar (her boyut × dil): panel-bos · zil-altin · panel-dolu · detay-odullu · detay-alindi · detay-duyuru ·
//                          gonder-sayfa · gonder-onizleme · gonder-herkes-onay
// Kullanım:
//   npx vite --port 5188 --strictPort            # ayrı kabukta (5173/5187/5188'den boş olanı)
//   node araclar/posta-ekran.mjs --adres=http://localhost:5188 [--dil=tr] [--boyut=390x844]
// Çıktı: tasarim/posta-kutusu/<an>-<g>x<y>-<dil>.png + olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5188");
const DILLER = ARG.dil ? [String(ARG.dil)] : ["tr", "en"];
const BOYUTLAR = ARG.boyut ? [String(ARG.boyut).split("x").map(Number)] : [[390, 844], [360, 780]];
const CIKTI = path.resolve("tasarim/posta-kutusu");
fs.mkdirSync(CIKTI, { recursive: true });

const env = fs.readFileSync(".env", "utf8");
const SUPA = (env.match(/VITE_SUPABASE_URL=\s*"?([^"\s]+)/) || [])[1];
if (!SUPA) { console.error(".env › VITE_SUPABASE_URL yok"); process.exit(2); }
const DEPO = `sb-${new URL(SUPA).hostname.split(".")[0]}-auth-token`;

// ---------------------------------------------------------------- taklit oturum
const BEN = "0c1a5100-0000-4000-8000-0000000051a1";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const EXP = Math.floor(Date.now() / 1000) + 7 * 86400;
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: BEN, role: "authenticated", aud: "authenticated", exp: EXP, is_anonymous: true })}.taklit`;
const KULLANICI = { id: BEN, aud: "authenticated", role: "authenticated", email: "", is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" };
const OTURUM = { access_token: JWT, token_type: "bearer", expires_in: 7 * 86400, expires_at: EXP, refresh_token: "taklit-yenileme", user: KULLANICI };
const PROFIL = (dil) => ({ id: BEN, gorunen_ad: "Deneme", username: "deneme", takma_ad: "Deneme", takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", sehir: "İstanbul",
  dil, puan: 100, coin: 50, xp: 0, level: 1, misafir: true, gorunen_avatar: null, gorunum: null, lig: "bronz" });

// ---------------------------------------------------------------- taklit veri
const iso = (ms = 0) => new Date(Date.now() + ms).toISOString();
const U = (n) => `0c1a5100-0000-4000-8000-${String(n).padStart(12, "0")}`;
const AVATAR = { tur: "avatar", anahtar: "ates-buyucu-y20", miktar: 1, url: "/avatars/pro2/ates-buyucu-y20.svg", ad_tr: "Ateş Büyücüsü", ad_en: "Fire Mage", nadirlik: "epik" };
const ODULLU = {
  id: U(1), tur: "odullu", okundu: false, alindi: null, verilen: null, bekleyen: true, bitis: iso(6 * 86400000), olusturuldu: iso(-3600000),
  baslik_tr: "Hoş geldin hediyesi!", baslik_en: "Welcome gift!",
  metin_tr: "Quiz Tactics ailesine katıldığın için teşekkürler. Küçük bir hediye hazırladık — iyi maçlar!",
  metin_en: "Thanks for joining the Quiz Tactics family. We prepared a small gift — have great matches!",
  oduller: [{ tur: "coin", miktar: 500 }, { tur: "elmas", miktar: 20 }, { tur: "joker", anahtar: "elli", miktar: 2 }, AVATAR],
};
const DUYURU = {
  id: U(2), tur: "duyuru", okundu: false, alindi: null, verilen: null, bekleyen: false, bitis: iso(2 * 86400000), olusturuldu: iso(-7200000),
  baslik_tr: "Hafta sonu çifte XP etkinliği", baslik_en: "",   // EN boş → TR gösterilir
  metin_tr: "Cumartesi ve pazar bütün modlarda kazandığın XP iki katı. Arkadaşlarını davet etmeyi unutma!", metin_en: "",
  oduller: [],
};
const ALINMIS = {
  id: U(3), tur: "odullu", okundu: true, alindi: iso(-86400000), verilen: [{ tur: "coin", miktar: 100, zaten_sende: false }], bekleyen: false,
  bitis: iso(3 * 86400000), olusturuldu: iso(-2 * 86400000), baslik_tr: "Sezon başlangıç ödülü", baslik_en: "Season start reward",
  metin_tr: "Yeni sezon başladı!", metin_en: "The new season has started!", oduller: [{ tur: "coin", miktar: 100 }],
};
const BILDIRIMLER = [
  { id: U(10), tip: "arkadas_istek", metin: "Ayşe sana arkadaşlık isteği gönderdi", yol: "/arkadaslar", okundu: false, created_at: iso(-600000) },
  { id: U(11), tip: "hafta_sonuc", metin: "Haftayı ligde 3. bitirdin!", yol: "/siralama", okundu: true, created_at: iso(-86400000) },
];
const GONDERILEN = [
  { id: U(20), tur: "odullu", hedef: "oyuncu", hedef_lig: null, hedef_ad: "Ayşe", baslik_tr: "Hoş geldin hediyesi!", oduller: ODULLU.oduller, bitis: iso(6 * 86400000), bitirildi: null, olusturuldu: iso(-3600000), okuyan: 1, alan: 0 },
  { id: U(21), tur: "duyuru", hedef: "herkes", hedef_lig: null, hedef_ad: null, baslik_tr: "Hafta sonu çifte XP etkinliği", oduller: [], bitis: iso(2 * 86400000), bitirildi: null, olusturuldu: iso(-7200000), okuyan: 37, alan: 0 },
  { id: U(22), tur: "duyuru", hedef: "lig", hedef_lig: "altin", hedef_ad: null, baslik_tr: "Altın lig bonusu", oduller: [{ tur: "elmas", miktar: 5 }], bitis: iso(-86400000), bitirildi: null, olusturuldu: iso(-8 * 86400000), okuyan: 4, alan: 3 },
];
const KATALOG = [
  { anahtar: "ates-buyucu-y20", url: "/avatars/pro2/ates-buyucu-y20.svg", ad_tr: "Ateş Büyücüsü", ad_en: "Fire Mage", tur: "kostumlu", kullanabilir: true, kapali: false },
  { anahtar: "android-y32", url: "/avatars/pro2/android-y32.svg", ad_tr: "Android", ad_en: "Android", tur: "kostumlu", kullanabilir: true, kapali: false },
];

const json = (r, veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
const kesilenler = new Set(), taklitsiz = new Set(), cagrilar = [];

async function rest(r, s, dil) {
  const req = r.request();
  const yol = req.url().split("/rest/v1/")[1].split("?")[0];
  const nesne = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
  if (yol.startsWith("rpc/")) {
    const fn = yol.slice(4);
    if (fn.startsWith("posta")) cagrilar.push(fn);
    switch (fn) {
      case "profilim": return json(r, PROFIL(dil));
      case "sahip_mi": return json(r, true);
      case "posta_kutusu": return json(r, { bildirimler: s.dolu ? BILDIRIMLER : [], postalar: s.dolu ? s.postalar : [] });
      case "posta_kutusu_oku": s.postalar = s.postalar.map((p) => ({ ...p, okundu: true })); return json(r, null);
      case "posta_odul_al": {
        const id = JSON.parse(req.postData() || "{}").p_posta;
        const p = s.postalar.find((x) => x.id === id);
        if (!p || p.alindi) return json(r, { message: "Bu ödülü zaten aldın", code: "P0001" }, 400);
        await new Promise((x) => setTimeout(x, 400));
        const verilen = p.oduller.map((k) => ({ ...k, zaten_sende: k.tur === "avatar" }));
        s.postalar = s.postalar.map((x) => (x.id === id ? { ...x, alindi: iso(0), verilen, bekleyen: false } : x));
        s.alimSayisi += 1;
        return json(r, { verilen });
      }
      case "posta_gonderilenler": return json(r, GONDERILEN);
      case "posta_oyuncu_ara": return json(r, [{ id: U(30), ad: "Ayşe", kullanici_adi: "ayse", lig: "gumus", avatar_url: "/avatars/pro2/android-y32.svg" }]);
      case "avatar_katalogu_oyun": return json(r, KATALOG);
      default: taklitsiz.add(fn); return json(r, null);
    }
  }
  if (req.method() !== "GET" && req.method() !== "HEAD") { kesilenler.add(`${req.method()} ${yol}`); return json(r, nesne ? null : []); }
  return json(r, nesne ? null : []);
}

// ---------------------------------------------------------------- sayfa içi ölçüm
const OLC = () => {
  const vh = window.innerHeight, vw = window.innerWidth;
  const gor = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none"; };
  // Kesik metin: yatay taşan (… ile kesilen) ya da kapsayıcısından taşan metin öğeleri
  const adaylar = [".bz-panel .qt-satir-baslik", ".bz-panel .qt-satir-alt", ".bz-posta-cip", ".bz-baslik h2", ".bz-tumu",
    ".pd-kalem-ad", ".pd-kalem-not", ".pd-gonderen > *", ".pd-durum", ".qt-modal h2", ".qt-modal .qt-dugme",
    ".yp-secenek", ".yp-etiket", ".yp-gonderilen-baslik", ".yp-gonderilen-alt", ".yp-sayi", ".yp-durum", ".yp-cubuk .qt-dugme", ".yp-oyuncu-ad"];
  const kesik = [];
  for (const sec of adaylar) for (const e of document.querySelectorAll(sec)) {
    if (!gor(e) || !e.textContent.trim()) continue;
    if (e.scrollWidth > e.clientWidth + 1) kesik.push(`${sec}: "${e.textContent.trim().slice(0, 40)}" ${e.scrollWidth}>${e.clientWidth}`);
  }
  // Ekrandan taşan görünür öğe (sağ/sol)
  const disari = [];
  for (const e of document.querySelectorAll(".bz-panel *, .qt-modal *, .yp *")) {
    if (!gor(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) disari.push(`${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]} ${Math.round(r.left)}..${Math.round(r.right)}`);
  }
  const modal = document.querySelector(".qt-modal");
  const m = modal?.getBoundingClientRect();
  const kucukHedef = [...document.querySelectorAll(".bz-panel button, .qt-modal button, .yp button, .yp input, .yp select")]
    .filter((e) => gor(e) && !e.disabled && !e.closest("[aria-hidden='true']")).map((e) => e.getBoundingClientRect()).filter((r) => r.height < 43.5).length;
  return {
    vh, vw, yatayTasma: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rozet: document.querySelector(".bz-sarmal .qt-sayi-rozeti")?.textContent ?? null,
    rozetAltin: Boolean(document.querySelector(".bz-sarmal--altin")),
    panelSatir: [...document.querySelectorAll(".bz-panel .qt-satir-baslik")].map((e) => e.textContent.trim()),
    modalBaslik: modal?.querySelector("h2")?.textContent ?? null,
    modal: m ? { top: Math.round(m.top), bottom: Math.round(m.bottom), sigiyor: m.top >= -1 && m.bottom <= vh + 1 } : null,
    alDugme: document.querySelector(".qt-modal .qt-dugme--dogru")?.textContent ?? null,
    kalemler: [...document.querySelectorAll(".pd-kalem")].map((e) => e.innerText.replace(/\s+/g, " ").trim()),
    konfeti: document.querySelectorAll(".qt-modal .qt-konfeti *").length,
    kesik, disari: disari.slice(0, 6), kucukHedef,
  };
};

async function calistir(ctx, [g, h], dil) {
  const s = { dolu: false, postalar: [ODULLU, DUYURU, ALINMIS].map((p) => ({ ...p })), alimSayisi: 0 };
  const sayfa = await ctx.newPage();
  const konsol = [];
  sayfa.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 160)); });
  sayfa.on("pageerror", (e) => konsol.push(`pageerror: ${String(e).slice(0, 160)}`));
  await sayfa.setViewportSize({ width: g, height: h });
  await sayfa.addInitScript(({ d, depo, oturum }) => {
    try { localStorage.setItem("bildim_dil", d); localStorage.setItem("bildim_tanitim", "1"); localStorage.setItem(depo, JSON.stringify(oturum)); } catch { /* kapalı */ }
  }, { d: dil, depo: DEPO, oturum: OTURUM });
  await sayfa.route(/\/auth\/v1\//, (r) => (/\/user/.test(r.request().url()) ? json(r, KULLANICI) : json(r, OTURUM)));
  await sayfa.route(/\/rest\/v1\//, (r) => rest(r, s, dil).catch(() => r.abort().catch(() => {})));
  await sayfa.route(/\/functions\/v1\//, (r) => json(r, {}));
  await sayfa.route(/\/storage\/v1\//, (r) => r.fulfill({ status: 404, body: "" }));
  await sayfa.route(/\/realtime\/|\.(mp3|ogg|wav|m4a)(\?|$)/, (r) => r.abort());
  const kayit = { boyut: `${g}x${h}`, dil, anlar: {} };
  const ad = (an) => path.join(CIKTI, `${an}-${g}x${h}-${dil}.png`);
  const olc = async (an, tam = false) => { kayit.anlar[an] = await sayfa.evaluate(OLC); await sayfa.screenshot({ path: ad(an), fullPage: tam }); return kayit.anlar[an]; };
  const zil = () => sayfa.locator(".bz-sarmal > button").first();
  try {
    // 1) Boş posta kutusu
    await sayfa.goto(ADRES + "/calisma", { waitUntil: "domcontentloaded" });
    await zil().waitFor({ timeout: 30000 });
    await sayfa.waitForTimeout(800);
    await zil().click();
    await sayfa.waitForSelector(".bz-panel", { timeout: 5000 });
    await sayfa.waitForTimeout(400);
    await olc("panel-bos");
    // 2) Dolu: yeniden yükle (panel açılışında tek posta_kutusu çağrısı)
    s.dolu = true;
    await sayfa.reload({ waitUntil: "domcontentloaded" });
    await zil().waitFor({ timeout: 30000 });
    await sayfa.waitForFunction(() => document.querySelector(".bz-sarmal--altin"), null, { timeout: 10000 });
    await sayfa.waitForTimeout(500);
    await olc("zil-altin");
    const once = cagrilar.length;
    await zil().click();
    await sayfa.waitForSelector(".bz-posta-satir", { timeout: 5000 });
    await sayfa.waitForTimeout(500);
    await olc("panel-dolu");
    kayit.panelCagrilari = cagrilar.slice(once);
    // 3) Ödüllü detay → AL → alındı (+ ikinci basış yok)
    await sayfa.locator(".bz-posta-satir button").first().click();
    await sayfa.waitForSelector(".qt-modal .pd", { timeout: 5000 });
    await sayfa.waitForTimeout(500);
    await olc("detay-odullu");
    await sayfa.locator(".qt-modal .qt-dugme--dogru").click();
    await sayfa.waitForFunction(() => !document.querySelector(".qt-modal .qt-dugme--dogru"), null, { timeout: 5000 });
    await sayfa.waitForTimeout(150);
    kayit.kutlamaKonfeti = await sayfa.evaluate(() => document.querySelectorAll(".qt-modal .qt-konfeti *").length);
    await sayfa.waitForTimeout(1200);
    await olc("detay-alindi");
    kayit.alimSayisi = s.alimSayisi;
    // Kapat → yeniden aç: kutlama tekrar etmemeli
    await sayfa.keyboard.press("Escape");
    await sayfa.waitForTimeout(300);
    if (!(await sayfa.locator(".bz-panel").count())) await zil().click();
    await sayfa.waitForSelector(".bz-posta-satir", { timeout: 5000 });
    await sayfa.locator(".bz-posta-satir button").first().click();
    await sayfa.waitForSelector(".qt-modal .pd", { timeout: 5000 });
    await sayfa.waitForTimeout(200);
    kayit.tekrarKonfeti = await sayfa.evaluate(() => document.querySelectorAll(".qt-modal .qt-konfeti *").length);
    kayit.tekrarAlDugmesi = await sayfa.locator(".qt-modal .qt-dugme--dogru").count();
    await sayfa.keyboard.press("Escape");
    await sayfa.waitForTimeout(300);
    // 4) Duyuru detayı (EN boş → TR)
    if (!(await sayfa.locator(".bz-panel").count())) await zil().click();
    await sayfa.waitForSelector(".bz-posta-satir", { timeout: 5000 });
    await sayfa.locator(".bz-posta-satir button", { hasText: "Hafta sonu" }).first().click();
    await sayfa.waitForSelector(".qt-modal .pd", { timeout: 5000 });
    await sayfa.waitForTimeout(400);
    await olc("detay-duyuru");
    await sayfa.keyboard.press("Escape");
    // 5) Gönderim sayfası
    await sayfa.goto(ADRES + "/yonetim/posta", { waitUntil: "domcontentloaded" });
    await sayfa.waitForSelector(".yp-gonderilen", { timeout: 30000 });
    await sayfa.waitForTimeout(500);
    await sayfa.locator(".yp input[type=search]").fill("ay");
    await sayfa.waitForSelector(".yp-oyuncu", { timeout: 5000 });
    await sayfa.locator(".yp-oyuncu").first().click();
    const girdiler = sayfa.locator(".yp-iki .yp-girdi");
    await girdiler.nth(0).fill("Hoş geldin hediyesi!");
    await girdiler.nth(1).fill("Welcome gift!");
    await girdiler.nth(2).fill("Quiz Tactics ailesine katıldığın için teşekkürler. Küçük bir hediye hazırladık — iyi maçlar!");
    await girdiler.nth(3).fill("Thanks for joining the Quiz Tactics family. We prepared a small gift — have great matches!");
    await sayfa.locator(".yp-secenekler .yp-secenek", { hasText: /\+ (Joker)/ }).click();
    await sayfa.locator(".yp-secenekler .yp-secenek", { hasText: /\+ Avatar/ }).click();
    await sayfa.waitForTimeout(300);
    await olc("gonder-sayfa", true);
    await sayfa.locator(".yp-cubuk .qt-dugme").click();
    await sayfa.waitForSelector(".qt-modal .pd", { timeout: 5000 });
    await sayfa.waitForTimeout(400);
    await olc("gonder-onizleme");
    await sayfa.keyboard.press("Escape");
    await sayfa.locator(".yp-secenek", { hasText: dil === "en" ? "Everyone" : "Herkes" }).first().click();
    await sayfa.locator(".yp-cubuk .qt-dugme").click();
    await sayfa.waitForSelector(".qt-modal .pd", { timeout: 5000 });
    await sayfa.locator(".qt-modal .qt-dugme--birincil").last().click();
    await sayfa.waitForFunction(() => !document.querySelector(".qt-modal .pd") && document.querySelector(".qt-modal"), null, { timeout: 5000 });
    await sayfa.waitForTimeout(300);
    await olc("gonder-herkes-onay");
  } catch (e) {
    kayit.hata = String(e.message || e).split("\n")[0].slice(0, 200);
    try { await sayfa.screenshot({ path: ad("HATA") }); } catch { /* kapalı */ }
  }
  kayit.konsolHata = [...new Set(konsol)].filter((m) => !/Failed to load resource|ERR_FAILED|net::/.test(m)).slice(0, 6);
  await sayfa.close();
  return kayit;
}

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: "block" });
const sonuclar = [];
let cikis = 0;
try {
  for (const boyut of BOYUTLAR) for (const dil of DILLER) {
    const k = await calistir(baglam, boyut, dil);
    sonuclar.push(k);
    console.log(`  ${k.boyut} ${dil}: ${k.hata ? "HATA " + k.hata : "tamam"}`);
  }
} catch (e) { console.error("Betik hatası:", e); cikis = 1; }
finally { await baglam.close().catch(() => {}); await tarayici.close().catch(() => {}); }

fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify({ uretim: iso(0), adres: ADRES, kesilenYazmalar: [...kesilenler], taklitsizRpc: [...taklitsiz], sonuclar }, null, 1));
for (const k of sonuclar) {
  console.log(`\n${k.boyut} ${k.dil}${k.hata ? " HATA " + k.hata : ""}`);
  console.log(`   panel açılışı çağrıları: ${JSON.stringify(k.panelCagrilari)} · alım: ${k.alimSayisi} · kutlama konfeti: ${k.kutlamaKonfeti} · tekrar konfeti: ${k.tekrarKonfeti} · tekrar AL: ${k.tekrarAlDugmesi}`);
  for (const [an, o] of Object.entries(k.anlar)) {
    console.log(`   ${an.padEnd(20)} taşma ${o.yatayTasma} · rozet ${o.rozet ?? "-"}${o.rozetAltin ? " (altın)" : ""} · modal ${o.modal ? (o.modal.sigiyor ? "sığıyor" : `TAŞIYOR ${o.modal.top}..${o.modal.bottom}`) : "-"} · <44px ${o.kucukHedef}`
      + (o.kalemler.length ? ` · kalemler: ${o.kalemler.join(" | ")}` : ""));
    if (o.kesik.length) console.log("      KESİK:", o.kesik.slice(0, 5).join(" | "));
    if (o.disari.length) console.log("      DIŞARI:", o.disari.join(" | "));
  }
  if (k.konsolHata?.length) console.log("   konsol:", k.konsolHata.join(" | "));
}
if (taklitsiz.size) console.log("\nTaklidi olmayan (null dönen) RPC'ler:", [...taklitsiz].join(", "));
if (kesilenler.size) console.log("Kesilen yazmalar:", [...kesilenler].join(", "));
process.exit(cikis);
