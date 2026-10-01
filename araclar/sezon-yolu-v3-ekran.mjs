// Sezon Yolu v3 (1 Eki 2026, sezon finali = Ejderha çerçevesi) ekran ölçümü — SUNUCUYA YAZMAZ: sezon_yolu_durumum / sezon_ozetim / bp_* cevapları tarayıcıda taklit edilir
// (page.route; sahip test sezonu görünümü). Ölçer: iki kol + "Hepsini al" alt menünün ÜSTÜNDE mi (390×700, 360×640, 390×844),
// yatay taşma, dokunma hedefi, GERÇEK piksel kontrastı (metin saydam yapılıp arka plan pikselleri örneklenir), konsol,
// önizleme alt sayfası her tür için, TR/EN, hareketi azalt açık/kapalı.
// Kullanım: npm run dev (başka kabukta; port yazdığı gibi) · node araclar/sezon-yolu-v2-ekran.mjs --adres=http://localhost:5192
//   --gercek : (sahip verisi) önceden alınmış araclar/.sezon-v2-gercek.json yanıtıyla GERÇEK sayfayı çeker (yalnız okuma).
// Oturum: .sezon-b-oturum.json (yoksa kendi misafir hesabını açar; git'e girmez). Çıktı: tasarim/sezon-yolu/v2/*.png + v2-olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ADRES = (process.argv.find((a) => a.startsWith("--adres=")) ?? "--adres=http://localhost:5192").slice(8);
const GERCEK = process.argv.includes("--gercek");
const SADECE_GERCEK = process.argv.includes("--sadece-gercek");
const ATLA_SENARYO = process.argv.includes("--atla-senaryo");   // yalnız önizleme + akışlar (+ --gercek)
const HIZLI = process.argv.includes("--hizli");   // yalnız seviye 5 · 390×700 TR: ekran görüntüsü + yükseklik (yineleme için)
const OTURUM = path.resolve(".sezon-b-oturum.json");   // yoksa kendi misafir hesabını açar (işi bitince silinir)
const CIKTI = path.resolve("tasarim/sezon-yolu/v3");
fs.mkdirSync(CIKTI, { recursive: true });
const origin = new URL(ADRES).origin;

// ---------- Ödül tablosu (migration 721) ----------
const sql = fs.readFileSync(path.resolve("supabase/migrations/20260612000721_sezon_yolu_oduller.sql"), "utf8");
const SATIR = /\(\s*(\d+),'(\w+)',\s*'(\w+)',\s*'(\{.*?\})',\s*(true|false),\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(null|'\w+')\)/g;
const TABLO = [...sql.matchAll(SATIR)].map((m) => ({
  seviye: Number(m[1]), kol: m[2], tur: m[3], veri: JSON.parse(m[4]), placeholder: m[5] === "true",
  ad_tr: m[6].replace(/''/g, "'"), ad_en: m[7].replace(/''/g, "'"), nadirlik: m[8] === "null" ? null : m[8].slice(1, -1),
}));
const FIN = TABLO.find((o) => o.seviye === 28 && o.kol === "ucretli");
Object.assign(FIN, { placeholder: false, veri: { anahtar: "pc_ejderha2" }, ad_tr: "Ejderha çerçevesi", ad_en: "Dragon frame", nadirlik: "efsanevi" });   // migration 780
if (TABLO.length !== 56) { console.error("Ödül tablosu 56 satır olmalı, okunan:", TABLO.length); process.exit(1); }

const ESIK = (i) => i * 100;
const TASMA_SP = 100, TASMA_AZAMI = 10;
function tasmaHesapla(d) {
  const esik28 = ESIK(28);
  const kaz = d.sp < esik28 ? 0 : Math.min(TASMA_AZAMI, Math.floor((d.sp - esik28) / TASMA_SP));
  const al = d.tasmaAlinan;
  const au = al.ucretsiz.filter((n) => n <= kaz).length, al2 = al.ucretli.filter((n) => n <= kaz).length;
  d.tasma = {
    acik: d.sp >= esik28, azami: TASMA_AZAMI, kazanilan: kaz, alinan_ucretsiz: au, alinan_ucretli: al2,
    alinabilir_ucretsiz: kaz - au, alinabilir_ucretli: d.bp.aktif ? kaz - al2 : 0,
    sonraki_icin_sp: kaz >= TASMA_AZAMI ? null : Math.max(0, esik28 + (kaz + 1) * TASMA_SP - d.sp),
    odul: { ucretsiz: { tur: "coin", miktar: 25 }, ucretli: { tur: "coin", miktar: 40 } },
  };
}
function hesapla(d) {
  let seviye = 0;
  for (let i = 1; i <= 28; i++) if (ESIK(i) <= d.sp) seviye = i;
  d.seviye = seviye;
  d.onceki_esik = seviye ? ESIK(seviye) : 0;
  d.sonraki_esik = seviye >= 28 ? null : ESIK(seviye + 1);
  for (const o of d.oduller) o.alinabilir = !o.alindi && o.seviye <= seviye && (o.kol === "ucretsiz" || d.bp.aktif);
  tasmaHesapla(d);
  return d;
}
// Önizleme turları için gerçek veriye yakın ödüller: çerçeve (normal + premium), avatar, tepki paketi, unvan, joker
function onizlemeOduller(tablo) {
  return tablo.map((o) => {
    const k = { ...o, veri: { ...o.veri } };
    if (k.seviye === 8 && k.kol === "ucretli") { k.placeholder = false; k.veri = { anahtar: "dukkan_nane" }; k.ad_tr = "Çiçek Bahçesi çerçevesi"; k.ad_en = "Flower Garden frame"; k.nadirlik = "nadir"; }
    if (k.seviye === 17 && k.kol === "ucretli") { k.placeholder = false; k.veri = { anahtar: "pc_galaksi" }; k.ad_tr = "Galaksi çerçevesi"; k.ad_en = "Galaxy frame"; k.nadirlik = "epik"; }
    if (k.seviye === 5 && k.kol === "ucretli") { k.placeholder = false; k.veri = { anahtar: "ari-k14" }; k.ad_tr = "Arı avatarı"; k.ad_en = "Bee avatar"; k.nadirlik = "epik"; }
    return k;
  });
}
function yeniDurum({ sp, bp = false, test = true, sahip = true, gorunur = true, alinan = [], tasmaAlinan, gercekOdul = false, finalGercek = false }) {
  let oduller = TABLO.map((o) => ({ ...o }));
  if (gercekOdul) oduller = onizlemeOduller(oduller);
  if (finalGercek) oduller = oduller.map((o) => (o.seviye === 28 && o.kol === "ucretli" ? { ...o, placeholder: false, veri: { anahtar: "pc_ejderha2" }, ad_tr: "Ejderha çerçevesi", ad_en: "Dragon frame", nadirlik: "efsanevi" } : o));
  const d = {
    gorunur, acik: !test, test, sahip,
    sezon: { id: 5, no: test ? 0 : 1, baslangic: "2026-10-01", bitis: "2026-10-29", kalan_gun: 27 },
    sp, seviye_sayisi: 28, esikler: Array.from({ length: 28 }, (_, i) => ESIK(i + 1)),
    bp: { aktif: bp, satin_alma_at: bp ? "2026-10-02T10:00:00Z" : null, fiyat: 500, sp_carpan: 1.25 },
    elmas: 1200,
    oduller: oduller.map((o) => ({ ...o, alindi: alinan.includes(`${o.seviye}:${o.kol}`), alinabilir: false })),
    bonus_gorev: { hedef: 2, ilerleme: 1, sp: 20, alindi: false },
    final_unvan: { anahtar: "sezon_final", ad_tr: "Sezon Ustası", ad_en: "Season Master", kazanildi: false },
    bugun_mac_sp: 60, gunluk_mac_tavan: 150,
    tasmaAlinan: tasmaAlinan ?? { ucretsiz: [], ucretli: [] },
  };
  return hesapla(d);
}
const herSeviyeAlinmis = (n) => Array.from({ length: n }, (_, i) => `${i + 1}:ucretsiz`);

// ---------- Taklit ----------
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
const temiz = (d) => { const { tasmaAlinan, ...r } = d; return r; };
async function taklitKur(sayfa, durum) {
  const cevap = (r, govde, status = 200) => r.fulfill({ status, contentType: "application/json", headers: CORS, body: JSON.stringify(govde) });
  const rpc = (ad, fn) => sayfa.route(new RegExp(`/rest/v1/rpc/${ad}(\\?|$)`), async (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: CORS });
    let arg = {};
    try { arg = JSON.parse(r.request().postData() ?? "{}"); } catch { /* boş */ }
    return fn(r, arg);
  });
  if (durum.gercek) {
    await rpc("sezon_yolu_durumum", (r) => cevap(r, durum.gercek));
    await rpc("sezon_ozetim", (r) => cevap(r, { gorunur: true, sezon: durum.gercek.sezon, seviye: durum.gercek.seviye, seviye_sayisi: 28, sp: durum.gercek.sp,
      onceki_esik: durum.gercek.onceki_esik, sonraki_esik: durum.gercek.sonraki_esik, bp: durum.gercek.bp, alinabilir: 0 }));
    return;
  }
  await rpc("sezon_yolu_durumum", (r) => cevap(r, temiz(durum.d)));
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
    v.forEach((o) => { o.alindi = true; });
    const t = [];
    for (const kol of ["ucretsiz", "ucretli"]) {
      if (kol === "ucretli" && !durum.d.bp.aktif) continue;
      for (let n = 1; n <= durum.d.tasma.kazanilan; n++) if (!durum.d.tasmaAlinan[kol].includes(n)) { durum.d.tasmaAlinan[kol].push(n); t.push({ n, kol, tur: "coin", miktar: kol === "ucretli" ? 40 : 25 }); }
    }
    hesapla(durum.d);
    return cevap(r, { ok: true, verilen: v, tasma_verilen: t });
  });
  await rpc("bp_tasma_al", (r, a) => {
    const kol = a.p_kol;
    if (kol === "ucretli" && !durum.d.bp.aktif) return cevap(r, { message: "Bu ödül Battle Pass'li" }, 400);
    if (durum.d.tasma.kazanilan < 1) return cevap(r, { message: "Henüz taşma ödülü kazanmadın" }, 400);
    let n = null;
    for (let i = 1; i <= durum.d.tasma.kazanilan; i++) if (!durum.d.tasmaAlinan[kol].includes(i)) { n = i; break; }
    if (n == null) return cevap(r, { message: "Bu ödülü zaten aldın" }, 400);
    durum.d.tasmaAlinan[kol].push(n); hesapla(durum.d);
    return cevap(r, { ok: true, n, kol, odul: { tur: "coin", miktar: kol === "ucretli" ? 40 : 25 }, tasma: durum.d.tasma });
  });
  await rpc("bp_bonus_gorev_al", (r) => { durum.d.bonus_gorev.alindi = true; durum.d.sp += 20; hesapla(durum.d); return cevap(r, { ok: true, sp: 20 }); });
  await rpc("sezon_sahip_sp_ekle", (r, a) => { durum.d.sp += Number(a.p_miktar ?? 0); hesapla(durum.d); return cevap(r, { ok: true, sp: durum.d.sp }); });
  await rpc("sezon_sahip_test_sifirla", (r) => { Object.assign(durum.d, yeniDurum({ sp: 0 })); return cevap(r, { ok: true }); });
}

// ---------- Oturum ----------
async function misafirOturumuAc(tarayici) {
  console.log("· Oturum yok — kendi misafir hesabım açılıyor…");
  const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 } });
  const s = await baglam.newPage();
  await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  await s.getByRole("button", { name: /Misafir olarak dene/i }).click();
  await s.waitForTimeout(9000);
  for (let i = 0; i < 6; i++) {
    const atla = s.getByRole("button", { name: /^Atla$|Hadi başlayalım/i });
    if (await atla.count()) { await atla.first().click(); await s.waitForTimeout(500); }
    await s.waitForTimeout(250);
  }
  const alan = s.locator(".bd-modal-katman input").first();
  if (await alan.count()) {
    await alan.fill("SezonV" + Math.floor(Math.random() * 900 + 100));
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
let oturum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
let kaynak = oturum.origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token")));
const lsDil = (dil) => [...kaynak.localStorage.filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }];

let hata = 0;
const rapor = { olcumler: [], sayilar: {} };
const ok = (ad, k, ek = "") => { rapor.olcumler.push({ ad, gecti: Boolean(k), ek }); if (k) console.log("  ✓", ad); else { hata++; console.log("  ✗", ad, ek); } };

async function sayfaAc(w, h, dil, durum, { azalt = false, ek = null } = {}) {
  const baglam = await tarayici.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
    reducedMotion: azalt ? "reduce" : "no-preference",
    storageState: { cookies: [], origins: [{ origin, localStorage: lsDil(dil) }] },
  });
  const sayfa = await baglam.newPage();
  const konsol = [];
  sayfa.on("console", (m) => { if (m.type() === "error") konsol.push(m.text()); });
  sayfa.on("pageerror", (e) => konsol.push("pageerror: " + String(e).slice(0, 200)));
  await taklitKur(sayfa, durum);
  if (ek) await ek(sayfa);
  await sayfa.route(new RegExp("/rest/v1/rpc/profilim(\\?|$)"), async (r) => {
    try {
      const yanit = await r.fetch();
      const j = await yanit.json();
      if (j && typeof j === "object") { j.dil = dil; if (!j.gorunen_avatar) j.gorunen_avatar = "/avatars/pro/kedi-k01.svg"; }
      await r.fulfill({ response: yanit, body: JSON.stringify(j), contentType: "application/json" });
    } catch { await r.continue(); }
  });
  await sayfa.goto(`${ADRES}/sezon-yolu`, { waitUntil: "domcontentloaded" });
  await sayfa.waitForSelector(".sy-yol", { timeout: 30000 });
  await sayfa.waitForSelector(".bd-coin-hap", { timeout: 20000 }).catch(() => {});   // üst çubuk coin çipi (uçuşun hedefi) yüklensin
  await sayfa.waitForTimeout(1200);
  return { baglam, sayfa, konsol };
}
const konsolTemiz = (k) => k.filter((x) => !/favicon|manifest|realtime|websocket|ERR_FAILED|Failed to load resource|net::/i.test(x));
const yol = (ad) => path.join(CIKTI, ad);

// ---------- Ölçümler ----------
/** İki kol + Hepsini al (yoksa Seviyem) alt menünün üstünde mi? Dönüş: sayılar. */
async function yukseklik(sayfa) {
  return sayfa.evaluate(() => {
    let nav = null;
    for (const e of document.querySelectorAll("nav, footer, div")) {
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      if (cs.position === "fixed" && r.bottom >= window.innerHeight - 1 && r.width >= window.innerWidth * 0.9 && r.height > 40 && r.height < 140) { nav = e; break; }
    }
    const navUst = nav ? nav.getBoundingClientRect().top : window.innerHeight;
    const kutu = document.querySelector(".sy-yol-kutu").getBoundingClientRect();
    const arac = document.querySelector(".sy-yol-arac").getBoundingClientRect();
    const hepsini = document.querySelector(".sy-hepsini")?.getBoundingClientRect();
    const hero = document.querySelector(".sy-hero").getBoundingClientRect();
    return { navUst: Math.round(navUst), yolAlt: Math.round(kutu.bottom), aracAlt: Math.round(arac.bottom), hepsiniAlt: hepsini ? Math.round(hepsini.bottom) : null,
             heroAlt: Math.round(hero.bottom), yolUst: Math.round(kutu.top), vh: window.innerHeight };
  });
}
async function genel(sayfa, konsol, etiket) {
  const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(`${etiket}: sayfa yatay taşma yok`, tasma <= 0, `taşma=${tasma}`);
  const kucuk = await sayfa.evaluate(() => [...document.querySelectorAll(".sy-sayfa button, .sy-sayfa a, [role=dialog] button")]
    .filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && cs.visibility !== "hidden" && (r.height < 43.5 || r.width < 43.5); })
    .map((e) => `${e.className.toString().slice(0, 30)}|${e.textContent.trim().slice(0, 14)}|${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
  ok(`${etiket}: dokunma hedefleri ≥ 44 px (yuva ≥ 52)`, kucuk.length === 0, kucuk.slice(0, 5).join(" ; "));
  const k = konsolTemiz(konsol);
  ok(`${etiket}: konsol hatası yok`, k.length === 0, k.slice(0, 3).join(" | "));
}
// Gerçek piksel kontrastı: görünür metinleri saydam yap, sayfayı çek, metin kutularındaki ARKA PLAN piksellerini örnekle.
async function kontrast(sayfa, etiket, kapsam = ".sy-sayfa, [role=dialog]") {
  const liste = await sayfa.evaluate((kap) => {
    const sonuc = [];
    const govdeler = document.querySelectorAll(kap);
    const vw = window.innerWidth, vh = window.innerHeight;
    const gor = (e) => { const cs = getComputedStyle(e); return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05; };
    for (const kok of govdeler) {
      const w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const t = n.nodeValue.trim();
        if (!t) continue;
        const e = n.parentElement;
        if (!e || !gor(e) || e.closest("[aria-hidden=true]") && !e.closest(".sy-yuva-yazi")) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        const r = rg.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || r.right <= 0 || r.left >= vw || r.bottom <= 0 || r.top >= vh) continue;
        const cs = getComputedStyle(e);
        // başka bir öğenin (sabit üst çubuk, alt menü, alt sayfa katmanı) altında kalan metin ölçülmez
        { const ust = document.elementFromPoint(Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), Math.min(vh - 1, Math.max(0, r.top + r.height / 2))); if (!ust || !(e.contains(ust) || ust.contains(e))) continue; }
        // görünür alandaki kısım
        if (r.left < 0 || r.right > vw) continue;
        // yatay kaydırıcı dışına taşan (kırpılan) metin
        const kap2 = e.closest(".sy-yol-kaydirma");
        if (kap2) { const kr = kap2.getBoundingClientRect(); if (r.left < kr.left || r.right > kr.right) continue; }
        // Range kutusu yazı tipinin tüm satır yüksekliğini (Baloo 2'de taşan) kapsar; gerçek harf bölgesi ≈ ortadaki %56
        sonuc.push({ t: t.slice(0, 24), x: r.left, y: r.top + r.height * 0.22, w: r.width, h: r.height * 0.56, renk: cs.color, boyut: parseFloat(cs.fontSize), kalin: Number(cs.fontWeight) >= 700 });
      }
    }
    return sonuc;
  }, kapsam);
  if (!liste.length) return { min: null, n: 0 };
  await sayfa.addStyleTag({ content: "*{color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:transparent!important} .sy-yildiz,.sy-sanat *{animation:none!important}" });
  await sayfa.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await sayfa.waitForTimeout(350);
  const png = await sayfa.screenshot({ type: "png", scale: "css" });
  await sayfa.evaluate(() => { document.querySelectorAll("style").forEach((s) => { if (s.textContent.startsWith("*{color:transparent")) s.remove(); }); });
  if (process.env.KONTRAST_DBG) fs.writeFileSync(yol("_kontrast-dbg.png"), png);
  const b64 = png.toString("base64");
  const sonuc = await sayfa.evaluate(async ({ b64, liste }) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = "data:image/png;base64," + b64; });
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const lum = (r, gg, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b); };
    const cr = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const out = [];
    for (const o of liste) {
      const m = o.renk.match(/[\d.]+/g).map(Number);
      const a = m[3] ?? 1;
      const x = Math.max(0, Math.floor(o.x)), y = Math.max(0, Math.floor(o.y));
      const w = Math.min(c.width - x, Math.ceil(o.w)), h = Math.min(c.height - y, Math.ceil(o.h));
      if (w < 1 || h < 1) continue;
      const d = g.getImageData(x, y, w, h).data;
      let enDusuk = 99, toplam = 0, say = 0;
      for (let i = 0; i < d.length; i += 4) {
        const br = d[i], bg = d[i + 1], bb = d[i + 2];
        const r = m[0] * a + br * (1 - a), gg = m[1] * a + bg * (1 - a), b = m[2] * a + bb * (1 - a);
        const k = cr(lum(r, gg, b), lum(br, bg, bb));
        if (k < enDusuk) enDusuk = k;
        toplam += k; say++;
      }
      out.push({ t: o.t, min: +enDusuk.toFixed(2), ort: +(toplam / say).toFixed(2), boyut: o.boyut, kalin: o.kalin });
    }
    return out;
  }, { b64, liste });
  const buyuk = (o) => o.boyut >= 24 || (o.boyut >= 18.66 && o.kalin);
  const kotu = sonuc.filter((o) => o.min < (buyuk(o) ? 3 : 4.5));
  const enDusuk = sonuc.length ? Math.min(...sonuc.map((o) => o.min)) : null;
  // Piksel bazında kırpma gürültüsü (kenar yumuşatma/kenarlık) için ORTALAMA kontrastı da raporla; kabul: en düşük ≥ eşik
  ok(`${etiket}: yazı kontrastı (gerçek piksel, ${sonuc.length} metin) en düşük ${enDusuk}`, kotu.length === 0, kotu.slice(0, 6).map((o) => `${o.t}=${o.min}/${o.ort}`).join(" ; "));
  rapor.sayilar[`kontrast:${etiket}`] = enDusuk;
  return { min: enDusuk, n: sonuc.length };
}
const kaydir = (sayfa, n) => sayfa.evaluate((n) => {
  const y = document.querySelector(".sy-yol-kaydirma"); const e = y.querySelector(`[data-durak="${n}"]`);
  y.scrollTo({ left: Math.max(0, e.offsetLeft - (y.clientWidth - e.offsetWidth) / 2), behavior: "auto" });
}, n);

// ================= v3: sezon finali = Ejderha çerçevesi =================
const SN = {
  s5: { ad: "seviye 5, BP yok", d: () => yeniDurum({ sp: 530, alinan: herSeviyeAlinmis(4) }) },
  s12bp: { ad: "seviye 12, BP var", d: () => yeniDurum({ sp: 1290, bp: true, alinan: herSeviyeAlinmis(12) }) },
  s28: { ad: "seviye 28 (BP yok, 28 ücretsiz alınmış)", d: () => yeniDurum({ sp: 2850, alinan: herSeviyeAlinmis(28) }) },
};
const GOR = [[390, 700], [360, 640], [390, 844]];
const cerceveHazir = (sayfa, kap) => sayfa.waitForFunction((k) => {
  const e = document.querySelector(k); return e && e.querySelector(".sy-cerceve-odul") && !e.querySelector(".sy-cerceve-iskelet") && !e.querySelector(".sy-cerceve-yedek");
}, kap, { timeout: 20000 }).then(() => true).catch(() => false);
const BEKLENEN_SORU = ["14:ucretli", "17:ucretli", "19:ucretli", "21:ucretli", "22:ucretli", "23:ucretli", "27:ucretli", "5:ucretli", "8:ucretli"];

for (const [ad, sn] of Object.entries(SN)) {
  for (const [w, h] of GOR) {
    for (const dil of ["tr", "en"]) {
      if (dil === "en" && h === 844) continue;
      const etiket = `${ad} ${w}×${h} ${dil}`;
      console.log(`\n== ${etiket} — ${sn.ad}`);
      const { baglam, sayfa, konsol } = await sayfaAc(w, h, dil, { d: sn.d() });
      ok(`${etiket}: hero final kartında Ejderha çerçevesi çizildi (iskelet/yedek yok)`, await cerceveHazir(sayfa, ".sy-final-kart"));
      await sayfa.waitForTimeout(800);
      const hero = await sayfa.evaluate(() => {
        const k = document.querySelector(".sy-final-kart");
        const r = k.getBoundingClientRect(); const g = k.querySelector(".sy-final-gorsel").getBoundingClientRect();
        return { soru: k.querySelectorAll(".sy-soru").length, yazi: k.innerText.replace(/\n/g, " | "), kartW: Math.round(r.width), kartH: Math.round(r.height), gorselW: Math.round(g.width),
                 sag: Math.round(r.right), vw: window.innerWidth, etiket: Boolean(k.querySelector(".sy-final-etiket")) };
      });
      ok(`${etiket}: hero kartında "?" yok, "Sezon sonu ödülü" / "Season-end reward" etiketi var, kart ekrana sığıyor`,
        hero.soru === 0 && hero.etiket && /Sezon sonu ödülü|Season-end reward/.test(hero.yazi) && hero.sag <= hero.vw - 8, JSON.stringify(hero));
      rapor.sayilar[`hero:${etiket}`] = hero;
      await kaydir(sayfa, 28); await sayfa.waitForTimeout(1200);
      const yuva = await sayfa.evaluate(() => {
        const y = document.querySelector('[data-yuva="28:ucretli"]');
        return { var: Boolean(y), cerceve: y?.querySelectorAll(".sy-cerceve-odul").length ?? 0, soru: y?.querySelectorAll(".sy-soru").length ?? 0, yazi: y?.parentElement?.innerText.replace(/\n/g, "|") };
      });
      ok(`${etiket}: 28. seviye ücretli yuvada Ejderha çerçevesi (? ve "Yakında" yok)`, yuva.var && yuva.cerceve === 1 && yuva.soru === 0 && !/Yakında|Soon/.test(yuva.yazi ?? ""), JSON.stringify(yuva));
      ok(`${etiket}: yuva çerçevesi yüklendi`, await cerceveHazir(sayfa, '[data-yuva="28:ucretli"]'));
      const kalan = await sayfa.evaluate(() => [...document.querySelectorAll(".sy-yol .sy-soru")].map((e) => e.closest("[data-yuva]")?.getAttribute("data-yuva")));
      rapor.sayilar[`kalan-soru:${etiket}`] = kalan;
      ok(`${etiket}: kalan "?" yuvaları yalnız beklenen 9`, JSON.stringify([...kalan].sort()) === JSON.stringify(BEKLENEN_SORU), kalan.join(","));
      const y = await yukseklik(sayfa);
      const alt = y.hepsiniAlt ?? y.aracAlt;
      ok(`${etiket}: iki kol + araç satırı alt menünün üstünde (${alt} ≤ ${y.navUst})`, alt <= y.navUst, JSON.stringify(y));
      await sayfa.screenshot({ path: yol(`sayfa-${ad}-${w}x${h}-${dil}.png`) });
      await sayfa.screenshot({ path: yol(`sayfa-${ad}-${w}x${h}-${dil}-tam.png`), fullPage: true });
      await genel(sayfa, konsol, etiket);
      await kontrast(sayfa, `${etiket} yol sonu`);
      await kaydir(sayfa, 1); await sayfa.waitForTimeout(300);
      await kontrast(sayfa, `${etiket} hero`);
      await baglam.close();
    }
  }
}

// Önizleme: 28. seviye yuvasına dokun → kendi avatarında, kilitliyse "Battle Pass Al"
const ONIZ = [["bp-yok", SN.s5], ["bp-var-kilitli", SN.s12bp], ["alinabilir", { d: () => yeniDurum({ sp: 2850, bp: true, alinan: herSeviyeAlinmis(28) }) }]];
for (const [ad, sn] of ONIZ) {
  for (const [w, h] of [[390, 700], [360, 640]]) for (const dil of ["tr", "en"]) {
    const etiket = `önizleme ${ad} ${w}×${h} ${dil}`;
    const { baglam, sayfa, konsol } = await sayfaAc(w, h, dil, { d: sn.d() });
    await kaydir(sayfa, 28); await sayfa.waitForTimeout(600);
    await sayfa.locator('[data-yuva="28:ucretli"]').tap();
    await sayfa.waitForSelector("[role=dialog] .sy-onizleme", { timeout: 8000 });
    await sayfa.waitForTimeout(2200);
    const d = await sayfa.evaluate(() => { const m = document.querySelector("[role=dialog]"); return { yazi: m.innerText.replace(/\n/g, " | "), soru: m.querySelectorAll(".sy-soru").length, tip: m.querySelector(".sy-onizleme")?.getAttribute("data-onizleme"),
      buyuk: Boolean(m.querySelector(".sy-once-sonra")) }; });
    ok(`${etiket}: Ejderha önizlemesi kendi avatarında (önce → sonra), "?" yok`, d.tip === "cerceve" && d.buyuk && d.soru === 0 && /Ejderha|Dragon/.test(d.yazi) && /Avatarında böyle görünür|on your avatar/i.test(d.yazi), d.yazi.slice(0, 200));
    ok(`${etiket}: "Sezon sonu ödülü" rozeti + efsanevi etiketi`, /Sezon sonu ödülü|Season-end reward/.test(d.yazi) && /Efsanevi|Legendary/.test(d.yazi), d.yazi.slice(0, 220));
    if (ad === "bp-yok") ok(`${etiket}: kilitliyse "Battle Pass al" düğmesi`, /Battle Pass Al|Get Battle Pass/i.test(d.yazi), d.yazi.slice(-120));
    if (ad === "alinabilir") ok(`${etiket}: alınabilirse "Ödülü al"`, /Ödülü al|Claim/i.test(d.yazi), d.yazi.slice(-120));
    await sayfa.screenshot({ path: yol(`onizleme-${ad}-${w}x${h}-${dil}.png`) });
    await genel(sayfa, konsol, etiket);
    if (dil === "tr") await kontrast(sayfa, etiket, "[role=dialog]");
    await baglam.close();
  }
}

// BP satın alma sayfası: resimsiz/boş yer kalmadı — sezon sonu ödülü vitrini
for (const [w, h] of [[390, 700], [360, 640], [390, 844]]) for (const dil of ["tr", "en"]) {
  const etiket = `satın alma ${w}×${h} ${dil}`;
  const { baglam, sayfa, konsol } = await sayfaAc(w, h, dil, { d: SN.s5.d() });
  await sayfa.getByRole("button", { name: /Battle Pass al|Get Battle Pass/i }).first().tap();
  await sayfa.waitForSelector("[role=dialog] .sy-final-vitrin", { timeout: 8000 });
  ok(`${etiket}: vitrinde Ejderha çerçevesi çizildi`, await cerceveHazir(sayfa, ".sy-final-vitrin"));
  await sayfa.waitForTimeout(1000);
  const v = await sayfa.evaluate(() => { const m = document.querySelector("[role=dialog]"); const k = m.querySelector(".sy-final-vitrin").getBoundingClientRect(); return { yazi: m.querySelector(".sy-final-vitrin").innerText.replace(/\n/g, " | "), soru: m.querySelectorAll(".sy-soru").length, kW: Math.round(k.width), vw: window.innerWidth, sag: Math.round(k.right) }; });
  ok(`${etiket}: vitrin metni (etiket + ad + açıklama), "?" yok, ekrana sığıyor`, /Sezon sonu ödülü|Season-end reward/.test(v.yazi) && /Ejderha|Dragon/.test(v.yazi) && v.soru === 0 && v.sag <= v.vw, JSON.stringify(v));
  await sayfa.screenshot({ path: yol(`satin-alma-${w}x${h}-${dil}.png`) });
  await genel(sayfa, konsol, etiket);
  if (dil === "tr") await kontrast(sayfa, etiket, "[role=dialog]");
  await baglam.close();
}

// Yük sırasında iskelet, hata olursa çerçeve ikonu, hareketi azalt açık
{
  const { baglam, sayfa } = await sayfaAc(390, 700, "tr", { d: SN.s5.d() }, { ek: (p) => p.route(/PremiumAvatarCizim/, async (r) => { await new Promise((x) => setTimeout(x, 7000)); await r.continue(); }) });
  const isk = await sayfa.evaluate(() => ({ iskelet: document.querySelectorAll(".sy-final-gorsel .sy-cerceve-iskelet").length, soru: document.querySelectorAll(".sy-final-gorsel .sy-soru").length }));
  await sayfa.screenshot({ path: yol("iskelet-hero-390x700.png") });
  ok("yük sırasında hero'da iskelet var, '?' yok", isk.iskelet === 1 && isk.soru === 0, JSON.stringify(isk));
  await baglam.close();
}
{
  const { baglam, sayfa } = await sayfaAc(390, 700, "tr", { d: SN.s5.d() }, { ek: (p) => p.route(/PremiumAvatarCizim/, (r) => r.abort()) });
  await sayfa.waitForTimeout(2500);
  const ye = await sayfa.evaluate(() => ({ yedek: document.querySelectorAll(".sy-final-gorsel .sy-cerceve-yedek").length, soru: document.querySelectorAll(".sy-final-gorsel .sy-soru").length, sayfa: Boolean(document.querySelector(".sy-yol")) }));
  await sayfa.screenshot({ path: yol("hata-yedek-hero-390x700.png") });
  ok("çizim yüklenemezse hero'da çerçeve ikonu (yedek), sayfa çalışır", ye.yedek === 1 && ye.soru === 0 && ye.sayfa, JSON.stringify(ye));
  await baglam.close();
}
{
  const { baglam, sayfa, konsol } = await sayfaAc(390, 700, "tr", { d: SN.s5.d() }, { azalt: true });
  await cerceveHazir(sayfa, ".sy-final-kart");
  await sayfa.waitForTimeout(800);
  await sayfa.screenshot({ path: yol("hareketi-azalt-390x700.png") });
  const a = await sayfa.evaluate(() => [...document.querySelectorAll(".sy-final-kart *, .sy-yuva *")].filter((e) => { const c = getComputedStyle(e); return c.animationName !== "none" && c.animationIterationCount === "infinite" && Number.parseFloat(c.animationDuration) < 1.5; }).length);
  await genel(sayfa, konsol, "hareketi azalt 390×700");
  ok(`hareketi azalt açık: hero/yuvalarda hızlı sonsuz animasyon yok (${a})`, a === 0);
  await baglam.close();
}

await tarayici.close();
fs.writeFileSync(yol("v3-olcum.json"), JSON.stringify(rapor, null, 2));
console.log(hata ? `\n${hata} KALDI` : "\nHEPSİ GEÇTİ");
process.exit(hata ? 1 : 0);
