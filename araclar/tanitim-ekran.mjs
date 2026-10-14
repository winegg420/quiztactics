// ============================================================
// TANITIM EKRAN GÖRÜNTÜLERİ — kurulum/tanıtım sayfası (src/pages/TanitimSayfasi.jsx) ve
// manifest "screenshots" için canlı oyundan 390 px görüntü alır (14 Eki 2026).
//
// Kişisel veri görünmesin: test hesabının adı "Sen", rakip/diğer oyuncu adları nötr adlarla
// değiştirilir (yalnız ekrandaki metin; veriye dokunulmaz). Maçlar bota karşı, her mod bir kez.
//
// Kullanım:
//   node araclar/test-oturumu.mjs --ac --adres=https://quiztactics.com --oturum=.arayuz-denetim-oturum-tanitim.json
//   node araclar/tanitim-ekran.mjs [--adres=https://quiztactics.com] [--sadece=klasik,duello,kasa,turnuva,lig,...]
//   node araclar/test-oturumu.mjs --sil --oturum=.arayuz-denetim-oturum-tanitim.json
// Çıktı: tanitim-ham/<ad>.png (git'e girmez) → araclar/tanitim-webp.mjs public/tanitim/*.webp üretir.
// ============================================================
import { chromium, devices } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "https://quiztactics.com").replace(/\/$/, "");
const OTURUM = path.resolve(typeof ARG.oturum === "string" ? ARG.oturum : ".arayuz-denetim-oturum-tanitim.json");
const CIKTI = path.resolve("tanitim-ham");
const SADECE = typeof ARG.sadece === "string" ? ARG.sadece.split(",") : null;
const DIL = ARG.dil === "en" ? "en" : "tr";
fs.mkdirSync(CIKTI, { recursive: true });

const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const yerel = (durum.origins ?? []).flatMap((o) => o.localStorage ?? []);
const BENIM_AD = (() => { try { return JSON.parse(fs.readFileSync(OTURUM.replace(/\.json$/, ".hesap.json"), "utf8")).ad; } catch { return null; } })();

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({ ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: "block" });
await baglam.addInitScript(([kayitlar, dil]) => {
  try {
    if (!sessionStorage.getItem("__tanitimYuklendi")) {
      for (const k of kayitlar) localStorage.setItem(k.name, k.value);
      sessionStorage.setItem("__tanitimYuklendi", "1");
    }
    sessionStorage.setItem("qt_dev_gecis", "1");
    localStorage.setItem("bildim_dil", dil);
  } catch { /* yok */ }
}, [yerel, DIL]);
const s = await baglam.newPage();
s.on("pageerror", (e) => console.log("  pageerror:", String(e).slice(0, 160)));

const bekle = (ms) => s.waitForTimeout(ms);
// Dil sözlüğü inince sayfa kendini yeniden yükleyebilir (src/baslat.js): kesilen gezinme bir kez daha denenir.
async function git(adres) {
  try { await s.goto(adres, { waitUntil: "domcontentloaded" }); }
  catch { await s.waitForTimeout(1500); await s.goto(adres, { waitUntil: "domcontentloaded" }); }
}
async function tanitimlariGec() {
  for (let i = 0; i < 6; i++) {
    const b = s.getByRole("button", { name: /^(Geç|Atla|Anladım|Tamam|Kapat|Skip|Got it|OK|Close)$/ });
    if (!(await b.count())) return;
    await b.last().tap({ timeout: 1500 }).catch(() => {});
    await bekle(500);
  }
}

// Ekrandaki oyuncu adları: yaprak metinlerden profiles.username/gorunen_ad/takma_ad ile eşleşenler
// (tek salt-okuma sorgusu) nötr adlarla değiştirilir; test hesabı → "Sen".
const NOTR = DIL === "en" ? ["Alex", "Sam", "Jordan", "Robin", "Kai", "Noa", "Ari", "Max", "Lee", "Rio", "Mia", "Leo", "Ivy", "Theo", "Zoe", "Finn", "Nora", "Eli", "Ruby", "Owen", "Luca", "Isla", "Milo", "Ava", "Jude", "Cleo", "Ezra", "Lena", "Remy", "Tess"]
  : ["Deniz", "Ege", "Arda", "Ada", "Kaan", "Elif", "Mert", "Zeynep", "Can", "Ece", "Defne", "Emir", "Nehir", "Alp", "Duru", "Kuzey", "Asya", "Bora", "Lara", "Efe", "Mira", "Aras", "Ela", "Doruk", "Selin", "Toprak", "İpek", "Atlas", "Yaren", "Oğuz"];
const db = new PgIstemci(await baglantiDizgisi());
await db.baglan();
// Uygulama profildeki dili tarayıcıya yazıp sayfayı yeniler (dilKanca.js): test hesabının profil dili çekim diline eşitlenir.
{
  const benId = (() => { try { return JSON.parse(fs.readFileSync(OTURUM.replace(/\.json$/, ".hesap.json"), "utf8")).id; } catch { return null; } })();
  if (benId) await db.sorgu(`update profiles set dil = ${alintila(DIL)} where id = ${alintila(benId)}`).catch((e) => console.log("  ! profil dili:", e.message));
}
const adHaritasi = new Map();
// Döner: [ekrandaki metin, profildeki ad] çiftleri. Ekranda "…" ile kısaltılmış adlar önekle eşleşir.
async function oyuncuAdlari() {
  const metinler = await s.evaluate(() => [...new Set([...document.querySelectorAll("body *")]
    .filter((e) => !e.children.length).map((e) => e.textContent.trim()).filter((t) => t && t.length <= 30))]).catch(() => []);
  if (!metinler.length) return [];
  const KISA = /(…|\.\.\.)$/;
  const tam = metinler.filter((m) => !KISA.test(m));
  const kisa = metinler.filter((m) => KISA.test(m)).map((m) => [m, m.replace(KISA, "")]).filter(([, o]) => o.length >= 3);
  const kosul = [tam.length ? `x in (${tam.map(alintila).join(",")})` : null,
    ...kisa.map(([, o]) => `left(x, ${o.length}) = ${alintila(o)}`)].filter(Boolean).join(" or ");
  try {
    const r = await db.sorgu(`select distinct x from profiles, lateral (values (username), (gorunen_ad), (takma_ad)) v(x) where x is not null and (${kosul})`);
    const adlar = (Array.isArray(r) ? r : r?.rows ?? []).map((k) => k.x);
    const cift = adlar.filter((x) => tam.includes(x)).map((x) => [x, x]);
    for (const [m, o] of kisa) { const x = adlar.find((y) => y.startsWith(o)); if (x) cift.push([m, x]); }
    return cift.sort((a, b) => metinler.indexOf(a[0]) - metinler.indexOf(b[0]));   // ekran sırası: üstteki adlar havuzun başından
  } catch (e) { console.log("  ! ad sorgusu:", e.message); return []; }
}
// Metinleri TEK GEÇİŞTE değiştirir (zincirleme yok: "Ayla"→"Deniz" sonra gerçek "Deniz"→"Ege" çakışmaz).
async function metinDegistir(esle) {
  await s.evaluate((esle) => {
    if (!esle.length) return;
    const harita = new Map(esle);
    const desen = new RegExp(esle.map(([e]) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
    const degistir = (t) => t.replace(desen, (m) => harita.get(m) ?? m);
    const yuru = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const dugumler = [];
    while (yuru.nextNode()) dugumler.push(yuru.currentNode);
    for (const d of dugumler) {
      const t = degistir(d.nodeValue);
      if (t !== d.nodeValue) d.nodeValue = t;
    }
    // data-ad: altın isim konturu (altin-isim.css › content: attr(data-ad))
    for (const el of document.querySelectorAll("[aria-label], [title], img[alt], [data-ad]")) {
      for (const at of ["aria-label", "title", "alt", "data-ad"]) {
        const v = el.getAttribute(at);
        if (!v) continue;
        const t = degistir(v);
        if (t !== v) el.setAttribute(at, t);
      }
    }
  }, esle);
}
async function cek(ad) {
  adHaritasi.clear();   // her ekran havuzun başından: görünen adlar sırayla, ek numarasız
  const esle = [];
  if (BENIM_AD) esle.push([BENIM_AD, DIL === "en" ? "You" : "Sen"]);
  for (const [metin, gercek] of await oyuncuAdlari()) {
    if (gercek === BENIM_AD) { esle.push([metin, DIL === "en" ? "You" : "Sen"]); continue; }
    if (!adHaritasi.has(gercek)) adHaritasi.set(gercek, NOTR[adHaritasi.size % NOTR.length] + (adHaritasi.size >= NOTR.length ? " " + (Math.floor(adHaritasi.size / NOTR.length) + 1) : ""));
    esle.push([metin, adHaritasi.get(gercek)]);
  }
  esle.sort((x, y) => y[0].length - x[0].length);
  if (ARG.iz) console.log("  ad eşleşmeleri:", JSON.stringify(esle));
  await metinDegistir(esle);
  await bekle(150);
  const yol = path.join(CIKTI, `${ad}${DIL === "en" ? "-en" : ""}.png`);
  await s.screenshot({ path: yol });
  // Ekrandaki ad benzeri metinler rapora yazılır (elle gözden geçirmek için)
  const metinler = await s.evaluate(() => [...new Set([...document.querySelectorAll("body *")].filter((e) => !e.children.length && e.offsetParent)
    .map((e) => e.textContent.trim()).filter((t) => t && t.length < 30))].slice(0, 120)).catch(() => []);
  fs.writeFileSync(yol.replace(/\.png$/, ".txt"), metinler.join("\n"));
  console.log("  ✓", path.relative(process.cwd(), yol));
}
const ister = (ad) => !SADECE || SADECE.includes(ad);

async function sayfa(yol, ad, hazirSecici, beklemeMs = 2500) {
  await git(ADRES + yol);
  if (hazirSecici) await s.locator(hazirSecici).first().waitFor({ timeout: 15000 }).catch(() => console.log("  ! bekleme:", hazirSecici));
  await bekle(beklemeMs);
  await tanitimlariGec();
  await bekle(600);
  await cek(ad);
}

// Maç: bot rakiple; görüntü alınınca maçtan çıkılır (test hesabı iş bitince silinir).
async function mactanCik() {
  const cik = s.getByRole("button", { name: /Maçtan çık|Düellodan çık|Leave match|Leave the match|Leave duel|Çık|Pes et/i }).first();
  if (await cik.count()) {
    await cik.tap({ timeout: 2000 }).catch(() => {});
    await bekle(600);
    const onay = s.getByRole("dialog").getByRole("button", { name: /^(Çık|Leave|Exit|Evet|Yes|Pes et)$/i }).first();
    if (await onay.count()) await onay.tap({ timeout: 2000 }).catch(() => {});
    await bekle(1000);
  }
}
async function soruBekle(ms = 40000) {
  return s.locator(".qt-sik:not([disabled])").first().waitFor({ timeout: ms }).then(() => true).catch(() => false);
}
async function rakipAra(yol, desen) {
  await git(ADRES + yol);
  await bekle(2500);
  await tanitimlariGec();
  for (let i = 0; i < 80 && !desen.test(s.url()); i++) {
    const gec = s.getByRole("button", { name: /^(Geç|İleri|Skip|Next)$/ });
    if (await gec.count()) { await gec.last().tap({ timeout: 1500 }).catch(() => {}); await bekle(600); continue; }
    if (i % 6 === 0) {
      const ara = s.getByRole("button", { name: /Rakip ara|Find opponent|Find an opponent/i });
      if (await ara.count()) await ara.first().tap({ timeout: 1500 }).catch(() => {});
    }
    await bekle(500);
  }
  return desen.test(s.url());
}
async function klasik() {
  await git(ADRES + "/");
  await bekle(2500);
  await tanitimlariGec();
  await s.locator(".as-mod-serit--klasik").first().waitFor({ timeout: 45000 }).catch(() => {});   // dil yüklemesi + yenileme bitsin
  await s.locator(".as-mod-serit--klasik").first().tap({ timeout: 4000 }).catch(() => {});
  await bekle(900);
  const k = s.getByRole("button", { name: /^Klasik|^Classic/ }).last();
  if (await k.count()) await k.tap({ timeout: 4000 }).catch(() => {});
  await bekle(1500);
  const yeni = s.getByRole("button", { name: /^(Yeni maç|New match)$/ });
  if (await yeni.count()) { await yeni.first().tap().catch(() => {}); await bekle(1500); }
  for (let i = 0; i < 20 && !/\/mac\/[0-9a-f-]{36}/.test(s.url()); i++) {
    const bot = s.getByRole("button", { name: /Beklemeden bot|bot ile oyna|Play a bot|without waiting/i });
    if (await bot.count()) { await bot.first().tap().catch(() => {}); await bekle(1200); }
    await bekle(1500);
  }
  if (!/\/mac\//.test(s.url())) {
    console.log("  ! Klasik: maça girilemedi —", s.url());
    await s.screenshot({ path: path.join(CIKTI, "klasik-hata.png") }).catch(() => {});
    return;
  }
  await bekle(1500);
  const hazir = s.getByRole("button", { name: /Hazırım|I'm ready|Ready/i });
  if (await hazir.count()) await hazir.first().tap({ timeout: 4000 }).catch(() => {});
  if (!(await soruBekle())) { console.log("  ! Klasik: soru gelmedi"); return; }
  await bekle(2200);
  await cek("klasik-soru");
  await s.locator(".qt-sik:not([disabled])").first().tap({ timeout: 2000 }).catch(() => {});
  await bekle(2500);
  await cek("klasik-cevap");
  await mactanCik();
}
async function duello() {
  if (!(await rakipAra("/duello", /\/duello\/[0-9a-f-]{36}/))) { console.log("  ! Düello: maça girilemedi"); return; }
  await bekle(3500);
  await cek("duello-acilis");
  // Kategori seçimi (saldıransa) — görüntü, sonra ilk kategoriye dokun
  for (let i = 0; i < 30; i++) {
    if (await s.locator(".qt-sik:not([disabled])").count()) break;
    const kat = s.locator(".m2-kat:not([disabled]), [class*='kategori'] button:not([disabled])");
    if (await kat.count()) { await cek("duello-kategori"); await kat.first().tap({ timeout: 1500 }).catch(() => {}); await bekle(1500); break; }
    await bekle(700);
  }
  if (await soruBekle(30000)) { await bekle(1500); await cek("duello-soru"); }
  await mactanCik();
}
async function kasa() {
  if (!(await rakipAra("/kasa", /\/kasa\/[0-9a-f-]{36}/))) { console.log("  ! Hazine: maça girilemedi"); return; }
  await bekle(3000);
  await cek("kasa-acilis");
  if (await soruBekle(30000)) { await bekle(1500); await cek("kasa-soru"); }
  for (let i = 0; i < 90; i++) {
    if (await s.locator(".ks-karar button").count()) { await bekle(800); await cek("kasa-karar"); break; }
    if (await s.locator(".qt-sik:not([disabled])").count()) await s.locator(".qt-sik:not([disabled])").first().tap({ timeout: 1500 }).catch(() => {});
    await bekle(1000);
  }
  await mactanCik();
}

try {
  if (ister("ana")) await sayfa("/", "ana");
  if (ister("modlar")) await sayfa("/modlar", "modlar");
  if (ister("turnuva")) await sayfa("/turnuva", "turnuva");
  if (ister("lig")) await sayfa("/siralama", "lig");
  if (ister("profil")) await sayfa("/profil", "profil");
  if (ister("arkadaslar")) await sayfa("/arkadaslar", "arkadaslar");
  if (ister("duello-lobi")) await sayfa("/duello", "duello-lobi");
  if (ister("kasa-lobi")) await sayfa("/kasa", "kasa-lobi");
  if (ister("lig-siralama")) {
    await sayfa("/siralama", "lig-tmp");
    await s.getByRole("tab", { name: /Sıralamalar|Rankings/i }).first().tap({ timeout: 3000 }).catch(() =>
      s.getByRole("button", { name: /Sıralamalar|Rankings/i }).first().tap({ timeout: 3000 }).catch(() => {}));
    await bekle(2500);
    await cek("lig-siralama");
  }
  if (ister("klasik")) await klasik();
  if (ister("duello")) await duello();
  if (ister("kasa")) await kasa();
} catch (e) {
  console.error("! hata:", e?.message ?? e);
} finally {
  await tarayici.close();
  await db.kapat?.();
  process.exit(0);
}
