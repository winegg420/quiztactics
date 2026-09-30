// Sezon Yolu (/sezon-yolu) ekran ölçümü: 390×844 ve 360×800, TR/EN, BP yok/var, alt sayfalar, satın alma kutlaması,
// hareketi azalt, sahip test modu, sistem kapalı yönlendirmesi. Sunucuya YAZMAZ: sezon_yolu_durumum / sezon_ozetim /
// bp_satin_al / bp_odul_al / bp_toplu_al / bp_bonus_gorev_al / sezon_sahip_* cevapları tarayıcıda taklit edilir
// (56 yuvalı gerçekçi veri; ödül tablosu 20260612000721_sezon_yolu_oduller.sql'den okunur).
// Kullanım: npm run dev -- --port 5191 (başka kabukta) · node araclar/sezon-yolu-ekran.mjs [--adres=http://localhost:5191]
// Oturum: .sezon-a-oturum.json yoksa "Misafir olarak dene" ile kendi misafir hesabı açılır (git'e girmez).
// Çıktılar: tasarim/sezon-yolu/a-*.png ve a-olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ADRES = (process.argv.find((a) => a.startsWith("--adres=")) ?? "--adres=http://localhost:5191").slice(8);
const OTURUM = path.resolve(".sezon-a-oturum.json");
const CIKTI = path.resolve("tasarim/sezon-yolu");
fs.mkdirSync(CIKTI, { recursive: true });
const adresOrigin = new URL(ADRES).origin;

// ---------- Ödül tablosu (migration 721'den) ----------
const sql = fs.readFileSync(path.resolve("supabase/migrations/20260612000721_sezon_yolu_oduller.sql"), "utf8");
const SATIR = /\(\s*(\d+),'(\w+)',\s*'(\w+)',\s*'(\{.*?\})',\s*(true|false),\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(null|'\w+')\)/g;
const TABLO = [...sql.matchAll(SATIR)].map((m) => ({
  seviye: Number(m[1]), kol: m[2], tur: m[3], veri: JSON.parse(m[4]), placeholder: m[5] === "true",
  ad_tr: m[6].replace(/''/g, "'"), ad_en: m[7].replace(/''/g, "'"), nadirlik: m[8] === "null" ? null : m[8].slice(1, -1),
}));
if (TABLO.length !== 56) { console.error("Ödül tablosu 56 satır olmalı, okunan:", TABLO.length); process.exit(1); }

const ESIK = (i) => i * 100;   // taban 100, artış 0 (migration 720 varsayılanı)
function yeniDurum({ sp, bp = false, test = false, sahip = false, gorunur = true, alinan = [] }) {
  const d = {
    gorunur, acik: !test, test, sahip,
    sezon: { id: 1, no: 1, baslangic: "2026-10-01", bitis: "2026-10-29", kalan_gun: 21 },
    sp, seviye_sayisi: 28, esikler: Array.from({ length: 28 }, (_, i) => ESIK(i + 1)),
    bp: { aktif: bp, satin_alma_at: bp ? "2026-10-02T10:00:00Z" : null, fiyat: 500, sp_carpan: 1.25 },
    elmas: 1200,
    oduller: TABLO.map((o) => ({ ...o, alindi: alinan.includes(`${o.seviye}:${o.kol}`), alinabilir: false })),
    bonus_gorev: { hedef: 3, ilerleme: 3, sp: 40, alindi: false },
    final_unvan: { anahtar: "sezon_final", ad_tr: "Sezon Şampiyonu", ad_en: "Season Champion", kazanildi: false },
    bugun_mac_sp: 60, gunluk_mac_tavan: 200,
  };
  return hesapla(d);
}
function hesapla(d) {
  let seviye = 0;
  for (let i = 1; i <= 28; i++) if (ESIK(i) <= d.sp) seviye = i;
  d.seviye = seviye;
  d.onceki_esik = seviye ? ESIK(seviye) : 0;
  d.sonraki_esik = seviye >= 28 ? null : ESIK(seviye + 1);
  for (const o of d.oduller) o.alinabilir = !o.alindi && o.seviye <= seviye && (o.kol === "ucretsiz" || d.bp.aktif);
  return d;
}

// ---------- Taklit ----------
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
async function taklitKur(sayfa, durum) {
  const cevap = (r, govde, status = 200) => r.fulfill({ status, contentType: "application/json", headers: CORS, body: JSON.stringify(govde) });
  const rpc = (ad, fn) => sayfa.route(new RegExp(`/rest/v1/rpc/${ad}(\\?|$)`), async (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: CORS });
    let arg = {};
    try { arg = JSON.parse(r.request().postData() ?? "{}"); } catch { /* boş */ }
    return fn(r, arg);
  });
  await rpc("sezon_yolu_durumum", (r) => cevap(r, durum.d));
  await rpc("sezon_ozetim", (r) => cevap(r, { gorunur: durum.d.gorunur, sezon: durum.d.sezon, seviye: durum.d.seviye, seviye_sayisi: 28, sp: durum.d.sp,
    onceki_esik: durum.d.onceki_esik, sonraki_esik: durum.d.sonraki_esik, bp: durum.d.bp, alinabilir: durum.d.oduller.filter((o) => o.alinabilir).length }));
  await rpc("bp_satin_al", (r) => {
    if (durum.d.bp.aktif) return cevap(r, { message: "Battle Pass zaten sende" }, 400);
    durum.d.bp.aktif = true; durum.d.elmas -= durum.d.bp.fiyat;
    const verilen = durum.d.oduller.filter((o) => o.kol === "ucretli" && o.seviye <= durum.d.seviye);
    verilen.forEach((o) => { o.alindi = true; });
    hesapla(durum.d);
    return cevap(r, { ok: true, elmas_bakiye: durum.d.elmas, verilen });
  });
  await rpc("bp_odul_al", (r, a) => {
    const o = durum.d.oduller.find((x) => x.seviye === a.p_seviye && x.kol === a.p_kol);
    if (!o || !o.alinabilir) return cevap(r, { message: "Bu ödülü zaten aldın" }, 400);
    o.alindi = true; hesapla(durum.d);
    return cevap(r, { ok: true, odul: o });
  });
  await rpc("bp_toplu_al", (r) => {
    const v = durum.d.oduller.filter((o) => o.alinabilir);
    v.forEach((o) => { o.alindi = true; }); hesapla(durum.d);
    return cevap(r, { ok: true, verilen: v });
  });
  await rpc("bp_bonus_gorev_al", (r) => { durum.d.bonus_gorev.alindi = true; durum.d.sp += 40; hesapla(durum.d); return cevap(r, { ok: true, sp: 40 }); });
  await rpc("sezon_sahip_sp_ekle", (r, a) => { durum.d.sp += Number(a.p_miktar ?? 0); hesapla(durum.d); return cevap(r, { ok: true, sp: durum.d.sp }); });
  await rpc("sezon_sahip_test_sifirla", (r) => {
    Object.assign(durum.d, yeniDurum({ sp: 0, bp: false, test: true, sahip: true })); return cevap(r, { ok: true });
  });
}

// ---------- Oturum ----------
async function misafirOturumuAc(tarayici) {
  console.log("· Oturum yok — kendi misafir hesabım açılıyor…");
  const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 } });
  const s = await baglam.newPage();
  await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  await s.getByRole("button", { name: /Misafir olarak dene/i }).click();
  await s.waitForTimeout(2500);
  for (let i = 0; i < 6; i++) {
    const atla = s.getByRole("button", { name: /^Atla$|Hadi başlayalım/i });
    if (await atla.count()) { await atla.first().click(); await s.waitForTimeout(500); }
    await s.waitForTimeout(250);
  }
  const alan = s.locator(".bd-modal-katman input").first();
  if (await alan.count()) {
    await alan.fill("SezonA" + Math.floor(Math.random() * 900 + 100));
    await s.getByRole("button", { name: /^Devam$/ }).first().click();
    await s.waitForTimeout(1800);
  }
  const ikon = s.locator(".bd-modal-katman .bd-avatar-secenek, .bd-modal-katman img[src*='/avatars/']").first();
  if (await ikon.count()) { await ikon.click(); await s.waitForTimeout(400); }
  const kullan = s.getByRole("button", { name: /Bu avatarı kullan/i });
  const avatarsiz = s.getByRole("button", { name: /Avatarsız devam et/i });
  if (await kullan.count()) { await kullan.first().click(); await s.waitForTimeout(1800); }
  else if (await avatarsiz.count()) { await avatarsiz.first().click(); await s.waitForTimeout(1800); }
  const sehir = s.locator(".bd-modal-katman [role=combobox]").first();
  if (await sehir.count()) {
    await sehir.click();
    await s.locator(".bd-modal-katman [role=option]").first().waitFor({ timeout: 8000 }).catch(() => {});
    const sec = s.locator(".bd-modal-katman [role=option]").first();
    if (await sec.count()) await sec.click();
    await s.getByRole("button", { name: /Oyuna başla/i }).first().click();
    await s.waitForTimeout(2500);
  }
  await baglam.storageState({ path: OTURUM });
  await baglam.close();
}

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
if (!fs.existsSync(OTURUM)) await misafirOturumuAc(tarayici);
const oturum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const kaynak = oturum.origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token")));
let misafirId = null;
try { misafirId = JSON.parse(kaynak.localStorage.find((x) => x.name.includes("auth-token")).value)?.user?.id ?? null; } catch { /* yok */ }
console.log("Misafir hesap id:", misafirId);
const lsDil = (dil) => [...kaynak.localStorage.filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }];

let hata = 0;
const rapor = { misafirId, olcumler: [] };
const ok = (ad, k, ek = "") => { rapor.olcumler.push({ ad, gecti: Boolean(k), ek }); if (k) console.log("  ✓", ad); else { hata++; console.log("  ✗", ad, ek); } };

async function sayfaAc(w, h, dil, durum, { azalt = false } = {}) {
  const baglam = await tarayici.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
    reducedMotion: azalt ? "reduce" : "no-preference",
    storageState: { cookies: [], origins: [{ origin: adresOrigin, localStorage: lsDil(dil) }] },
  });
  const sayfa = await baglam.newPage();
  const konsol = [];
  sayfa.on("console", (m) => { if (m.type() === "error") konsol.push(m.text()); });
  sayfa.on("pageerror", (e) => konsol.push("pageerror: " + String(e).slice(0, 200)));
  await taklitKur(sayfa, durum);
  // Misafir profilinin dili 'tr': useDil onu sayfa diline çevirip yenilemesin diye profilim cevabındaki dil ezilir.
  await sayfa.route(new RegExp("/rest/v1/rpc/profilim(\\?|$)"), async (r) => {
    try {
      const yanit = await r.fetch();
      const j = await yanit.json();
      if (j && typeof j === "object") j.dil = dil;
      await r.fulfill({ response: yanit, body: JSON.stringify(j), contentType: "application/json" });
    } catch { await r.continue(); }
  });
  await sayfa.goto(`${ADRES}/sezon-yolu`, { waitUntil: "domcontentloaded" });
  return { baglam, sayfa, konsol };
}
const konsolTemiz = (k) => k.filter((x) => !/favicon|manifest|realtime|websocket|ERR_FAILED|Failed to load resource|net::/i.test(x));
const bekle = (s, ms) => s.waitForTimeout(ms);

async function genelOlcum(sayfa, konsol, etiket) {
  const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(`${etiket}: sayfa yatay taşma yok`, tasma <= 0, `taşma=${tasma}`);
  const kucuk = await sayfa.evaluate(() => [...document.querySelectorAll(".sy-sayfa button, .sy-sayfa a, [role=dialog] button")]
    .filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && cs.visibility !== "hidden" && (r.height < 43.5 || r.width < 43.5); })
    .map((e) => `${e.className.toString().slice(0, 30)}|${e.textContent.trim().slice(0, 14)}|${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
  ok(`${etiket}: dokunma hedefleri ≥ 44 px`, kucuk.length === 0, kucuk.slice(0, 5).join(" ; "));
  const temiz = konsolTemiz(konsol);
  ok(`${etiket}: konsol hatası yok`, temiz.length === 0, temiz.slice(0, 3).join(" | "));
}

async function yolOlcum(sayfa, seviye, etiket) {
  const r = await sayfa.evaluate((n) => {
    const yol = document.querySelector(".sy-yol-kaydirma");
    const dur = document.querySelector(`[data-durak="${n}"] .sy-daire`);
    const son = document.querySelector('[data-durak="28"] .sy-daire');
    const bir = document.querySelector('[data-durak="1"] .sy-daire');
    const yr = yol.getBoundingClientRect(); const dr = dur.getBoundingClientRect();
    const merkez = dr.left + dr.width / 2;
    return { scrollLeft: Math.round(yol.scrollLeft), gorunur: merkez > yr.left && merkez < yr.right, son: son.getBoundingClientRect().width, bir: bir.getBoundingClientRect().width,
      yolTasar: yol.scrollWidth > yol.clientWidth, panelSigar: document.querySelector(".sy-yol-kutu").getBoundingClientRect().right <= window.innerWidth + 0.5 };
  }, seviye);
  ok(`${etiket}: mevcut seviye (${seviye}) otomatik görünür alana kaydı`, r.gorunur && (seviye < 3 || r.scrollLeft > 0), JSON.stringify(r));
  ok(`${etiket}: 28. durak büyük`, r.son > r.bir + 10, `son=${r.son} ilk=${r.bir}`);
  ok(`${etiket}: yatay kaydırma yalnız yol şeridinde`, r.yolTasar && r.panelSigar, JSON.stringify(r));
}

const yol = (ad) => path.join(CIKTI, ad);
const AL = /Ödülü al|Claim reward/;

// ================= 1) 390 TR — BP yok =================
console.log("\n== 390×844 TR — BP yok, seviye 7");
{
  const durum = { d: yeniDurum({ sp: 740, bp: false, alinan: ["1:ucretsiz", "2:ucretsiz"] }) };
  const { baglam, sayfa, konsol } = await sayfaAc(390, 844, "tr", durum);
  await sayfa.waitForSelector(".sy-yol", { timeout: 25000 });
  await bekle(sayfa, 900);
  await sayfa.screenshot({ path: yol("a-sayfa-bp-yok-390.png") });
  await sayfa.screenshot({ path: yol("a-sayfa-bp-yok-390-tam.png"), fullPage: true });
  await genelOlcum(sayfa, konsol, "390 BP yok");
  await yolOlcum(sayfa, 7, "390 BP yok");
  const dogru = await sayfa.evaluate(() => ({
    acikSayi: document.querySelectorAll(".sy-durak--acik").length,
    kilitli: document.querySelectorAll(".sy-yuva--ucretli.sy-yuva--bp-kilit").length,
    placeholder: document.querySelectorAll(".sy-soru").length,
  }));
  ok("açık durak sayısı = 7", dogru.acikSayi === 7, JSON.stringify(dogru));
  ok("ücretli kol 28 yuva kilit ikonlu (BP yok)", dogru.kilitli === 28, JSON.stringify(dogru));
  ok("placeholder yuvalar '?' çiziyor (10)", dogru.placeholder === 10, JSON.stringify(dogru));

  // Alt sayfa: alınabilir ödül (3. seviye ücretsiz)
  await sayfa.locator('[data-durak="3"]').evaluate((e) => e.scrollIntoView({ inline: "center", block: "nearest" }));
  await sayfa.locator(".sy-hucre--ucretsiz .sy-yuva--alinabilir").first().tap();
  await bekle(sayfa, 600);
  await sayfa.screenshot({ path: yol("a-alt-sayfa-al-390.png") });
  await genelOlcum(sayfa, konsol, "390 alt sayfa (Al)");
  await sayfa.getByRole("button", { name: AL }).tap();
  await bekle(sayfa, 500);
  const alindi = await sayfa.evaluate(() => document.querySelectorAll(".sy-hucre--ucretsiz .sy-yuva--alindi").length);
  ok("Al → yuva doldu (alındı sayısı 2 → 3)", alindi === 3, `alindi=${alindi}`);
  ok("Al sonrası alt sayfa kapandı", (await sayfa.locator("[role=dialog]").count()) === 0);

  // Kilit nedeni: ücretli, seviye 7, BP yok
  await sayfa.locator(".sy-hucre--ucretli .sy-yuva").nth(6).tap();
  await bekle(sayfa, 600);
  await sayfa.screenshot({ path: yol("a-alt-sayfa-kilit-390.png") });
  const kilitYazi = await sayfa.locator("[role=dialog]").innerText();
  ok("kilit nedeni 'Battle Pass gerekir' yazıyor", /Battle Pass gerekir/.test(kilitYazi), kilitYazi.slice(0, 120));
  await sayfa.keyboard.press("Escape");
  await bekle(sayfa, 400);
  // Kilit nedeni: seviye yetmiyor (20. seviye ücretsiz)
  await sayfa.locator('[data-durak="20"]').evaluate((e) => e.scrollIntoView({ inline: "center", block: "nearest" }));
  await sayfa.locator(".sy-hucre--ucretsiz .sy-yuva").nth(19).tap();
  await bekle(sayfa, 600);
  const kilit2 = await sayfa.locator("[role=dialog]").innerText();
  ok("seviye kilidi 'Kalan: N SP' yazıyor", /Kalan: [\d.,]+ SP/.test(kilit2), kilit2.slice(0, 160));
  await sayfa.keyboard.press("Escape");
  await bekle(sayfa, 400);
  // Placeholder: 5. seviye ücretli "Yeni avatar"
  await sayfa.locator('[data-durak="5"]').evaluate((e) => e.scrollIntoView({ inline: "center", block: "nearest" }));
  await sayfa.locator(".sy-hucre--ucretli .sy-yuva").nth(4).tap();
  await bekle(sayfa, 600);
  await sayfa.screenshot({ path: yol("a-alt-sayfa-yakinda-390.png") });
  const pl = await sayfa.locator("[role=dialog]").innerText();
  ok("placeholder alt sayfası 'Yakında' gösteriyor", /Yakında/.test(pl), pl.slice(0, 120));
  await sayfa.keyboard.press("Escape");
  await bekle(sayfa, 400);

  // Satın alma penceresi + kutlama
  await sayfa.evaluate(() => window.scrollTo(0, 0));
  await sayfa.getByRole("button", { name: /Battle Pass Al/ }).first().tap();
  await bekle(sayfa, 600);
  await sayfa.screenshot({ path: yol("a-satin-alma-390.png") });
  await genelOlcum(sayfa, konsol, "390 satın alma penceresi");
  await sayfa.getByRole("button", { name: /^Satın al$/ }).tap();
  await bekle(sayfa, 1800);
  await sayfa.screenshot({ path: yol("a-kutlama-390.png") });
  const kut = await sayfa.evaluate(() => ({ dus: document.querySelectorAll(".sy-dus").length, altin: document.querySelectorAll(".sy-kutlama .qt-ia").length, dalga: document.querySelectorAll(".sy-dalga").length }));
  ok("kutlama: geriye dönük ödüller düşüyor, isim altın", kut.dus >= 7 && kut.altin === 1 && kut.dalga === 1, JSON.stringify(kut));
  await genelOlcum(sayfa, konsol, "390 kutlama");
  await sayfa.getByRole("button", { name: /Harika/ }).tap();
  await bekle(sayfa, 1000);
  await sayfa.screenshot({ path: yol("a-sayfa-bp-var-390.png") });
  await sayfa.screenshot({ path: yol("a-sayfa-bp-var-390-tam.png"), fullPage: true });
  const bp = await sayfa.evaluate(() => ({ aktif: Boolean(document.querySelector(".sy-bp--aktif")), altin: Boolean(document.querySelector(".sy-bp--aktif .qt-ia")), kilit: document.querySelectorAll(".sy-yuva--ucretli.sy-yuva--bp-kilit").length }));
  ok("BP sonrası: Aktif kutusu + altın isim, kilitler kalktı", bp.aktif && bp.altin && bp.kilit === 0, JSON.stringify(bp));
  await genelOlcum(sayfa, konsol, "390 BP var");
  await baglam.close();
}

// ================= 2) 360 TR — BP var, günlük görev, seviye 12 =================
console.log("\n== 360×800 TR — BP var, seviye 12");
{
  const durum = { d: yeniDurum({ sp: 1250, bp: true, alinan: ["1:ucretsiz", "1:ucretli", "2:ucretsiz"] }) };
  const { baglam, sayfa, konsol } = await sayfaAc(360, 800, "tr", durum);
  await sayfa.waitForSelector(".sy-yol", { timeout: 25000 });
  await bekle(sayfa, 900);
  await sayfa.locator(".qt-ustcubuk-ic .sz-rozet").waitFor({ timeout: 10000 }).catch(() => {}); await sayfa.waitForTimeout(1500);
  await sayfa.screenshot({ path: yol("a-sayfa-bp-var-360.png") });
  await sayfa.screenshot({ path: yol("a-sayfa-bp-var-360-tam.png"), fullPage: true });
  await genelOlcum(sayfa, konsol, "360 BP var");
  await yolOlcum(sayfa, 12, "360 BP var");
  // Günlük görev al
  await sayfa.getByRole("button", { name: /Görevi al/ }).tap();
  await bekle(sayfa, 700);
  ok("günlük görev alındı rozeti", (await sayfa.locator(".sy-bonus").innerText()).includes("Alındı"));
  // Toplu al
  const once = await sayfa.locator(".sy-yuva--alinabilir").count();
  await sayfa.getByRole("button", { name: /Hepsini al/ }).tap();
  await bekle(sayfa, 800);
  const sonra = await sayfa.locator(".sy-yuva--alinabilir").count();
  ok(`Hepsini al: alınabilir ${once} → ${sonra}`, once > 1 && sonra === 0);
  await baglam.close();
}

// ================= 3) 390 EN — BP yok =================
console.log("\n== 390×844 EN — BP yok");
{
  const durum = { d: yeniDurum({ sp: 740, bp: false, alinan: ["1:ucretsiz"] }) };
  const { baglam, sayfa, konsol } = await sayfaAc(390, 844, "en", durum);
  await sayfa.waitForSelector(".sy-yol", { timeout: 25000 });
  await bekle(sayfa, 900);
  await sayfa.screenshot({ path: yol("a-sayfa-en-390.png") });
  const metin = await sayfa.locator(".sy-sayfa").innerText();
  ok("EN: Türkçe kalıntı yok", !/(Battle Pass Al|kaldı|Seviye \d|Neler içerir|Mevcut seviyem|Hepsini al|Sezon Yolu)/.test(metin), metin.slice(0, 200).replace(/\n/g, " | "));
  ok("EN: başlık 'Season Path'", /Season Path/.test(metin));
  await genelOlcum(sayfa, konsol, "390 EN");
  await sayfa.locator(".sy-hucre--ucretli .sy-yuva").nth(2).tap();
  await bekle(sayfa, 600);
  await sayfa.screenshot({ path: yol("a-alt-sayfa-en-390.png") });
  const a = await sayfa.locator("[role=dialog]").innerText();
  ok("EN alt sayfa: Türkçe kalıntı yok", !/(gerekir|açılır|Kalan|Ödül|kolu)/.test(a), a.slice(0, 200).replace(/\n/g, " | "));
  await sayfa.keyboard.press("Escape");
  await bekle(sayfa, 400);
  await sayfa.getByRole("button", { name: /Get Battle Pass/ }).first().tap();
  await bekle(sayfa, 600);
  const s2 = await sayfa.locator("[role=dialog]").innerText();
  ok("EN satın alma: Türkçe kalıntı yok", !/(Geriye|boyunca|Altın|Fiyat|Bakiyen|Satın)/.test(s2), s2.slice(0, 250).replace(/\n/g, " | "));
  await sayfa.screenshot({ path: yol("a-satin-alma-en-390.png") });
  await baglam.close();
}

// ================= 4) Hareketi azalt =================
console.log("\n== 390×844 TR — hareketi azalt (reduce)");
{
  const durum = { d: yeniDurum({ sp: 740, bp: false }) };
  const { baglam, sayfa, konsol } = await sayfaAc(390, 844, "tr", durum, { azalt: true });
  await sayfa.waitForSelector(".sy-yol", { timeout: 25000 });
  await bekle(sayfa, 700);
  const nabiz = await sayfa.evaluate(() => { const e = document.querySelector(".sy-yuva--alinabilir"); return e ? getComputedStyle(e).animationName : "yok"; });
  ok("hareketi azalt: nabız animasyonu kapalı", nabiz === "none", `animationName=${nabiz}`);
  await sayfa.getByRole("button", { name: /Battle Pass Al/ }).first().tap();
  await bekle(sayfa, 600);
  await sayfa.getByRole("button", { name: /^Satın al$/ }).tap();
  await bekle(sayfa, 1500);
  await sayfa.screenshot({ path: yol("a-kutlama-hareket-azalt-390.png") });
  const k = await sayfa.evaluate(() => ({ dalga: getComputedStyle(document.querySelector(".sy-dalga")).display, dus: getComputedStyle(document.querySelector(".sy-dus")).animationName }));
  ok("hareketi azalt: dalga yok, düşüş sadeleşti", k.dalga === "none" && k.dus === "sy-yumusak-gir", JSON.stringify(k));
  await genelOlcum(sayfa, konsol, "390 hareketi azalt");
  await baglam.close();
}

// ================= 5) Sahip test modu + seviye atlama =================
console.log("\n== 390×844 TR — test modu (sahip), seviye atlama");
{
  const durum = { d: yeniDurum({ sp: 80, bp: false, test: true, sahip: true }) };
  const { baglam, sayfa, konsol } = await sayfaAc(390, 844, "tr", durum);
  await sayfa.waitForSelector(".sy-yol", { timeout: 25000 });
  await bekle(sayfa, 800);
  ok("test kutusu görünür (test+sahip)", (await sayfa.locator(".sy-testkutu").count()) === 1);
  await sayfa.getByRole("button", { name: "+100 SP" }).tap();
  await bekle(sayfa, 300);
  const acildi = await sayfa.evaluate(() => document.querySelectorAll(".sy-durak--acildi").length);
  ok("+100 SP → durak kilidi açıldı animasyonu (sy-durak--acildi)", acildi >= 1, `acildi=${acildi}`);
  await sayfa.screenshot({ path: yol("a-seviye-atlama-390.png") });
  await sayfa.getByRole("button", { name: "+500 SP" }).tap();
  await bekle(sayfa, 1800);
  const sv = await sayfa.locator(".sy-seviye-daire").innerText();
  ok("+500 SP sonrası seviye 6", sv.trim() === "6", sv);
  await sayfa.locator(".sy-testkutu").scrollIntoViewIfNeeded();
  await sayfa.screenshot({ path: yol("a-test-modu-390.png") });
  await genelOlcum(sayfa, konsol, "390 test modu");
  await baglam.close();
  // Test olmayan hesapta kutu yok
  const d2 = { d: yeniDurum({ sp: 80, bp: false, test: false, sahip: false }) };
  const o2 = await sayfaAc(390, 844, "tr", d2);
  await o2.sayfa.waitForSelector(".sy-yol", { timeout: 25000 });
  ok("sahip değilken test kutusu yok", (await o2.sayfa.locator(".sy-testkutu").count()) === 0);
  await o2.baglam.close();
}

// ================= 6) Sistem kapalı (gorunur=false) =================
console.log("\n== 390×844 TR — sistem kapalı");
{
  const durum = { d: yeniDurum({ sp: 0, gorunur: false }) };
  const { baglam, sayfa, konsol } = await sayfaAc(390, 844, "tr", durum);
  await sayfa.getByText("Bu bölüm şu an kapalı.").waitFor({ timeout: 25000 }).catch(() => {});
  ok("kapalıyken 'Bu bölüm şu an kapalı.' görünür", (await sayfa.getByText("Bu bölüm şu an kapalı.").count()) === 1);
  await sayfa.waitForURL((u) => !u.pathname.includes("sezon-yolu"), { timeout: 8000 }).catch(() => {});
  ok("ana sayfaya replace ile döndü", !new URL(sayfa.url()).pathname.includes("sezon-yolu"), sayfa.url());
  ok("geri gidince /sezon-yolu'na düşmüyor (replace)", await sayfa.goBack().then(() => !new URL(sayfa.url()).pathname.includes("sezon-yolu"), () => true));
  const temiz = konsolTemiz(konsol);
  ok("kapalı: konsol hatası yok", temiz.length === 0, temiz.slice(0, 3).join(" | "));
  await baglam.close();
}

await tarayici.close();
fs.writeFileSync(yol("a-olcum.json"), JSON.stringify(rapor, null, 2));
console.log(hata ? `\n${hata} KALDI` : "\nHEPSİ GEÇTİ");
process.exit(hata ? 1 : 0);
