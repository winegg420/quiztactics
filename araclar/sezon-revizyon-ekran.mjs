// Sezon Yolu revizyonu ekran ölçümü (30 Eyl): üst çubuk (tam logo + dişli kesilmiyor), ana sayfa profil kartı rozeti,
// dişli menüde "Sezon Yolu" satırı, /sezon-yolu iki kolun ilk ekranda görünmesi. Sunucuya YAZMAZ: sezon_ozetim ve
// sezon_yolu_durumum cevapları tarayıcıda taklit edilir (sahip = gorunur true, sahip değil = gorunur false).
// Kullanım: npm run dev -- --port 5191 (başka kabukta) · node araclar/sezon-revizyon-ekran.mjs [--adres=http://localhost:5191]
// Oturum: .sezon-a-oturum.json (sezon-yolu-ekran.mjs açar; git'e girmez). Çıktı: tasarim/sezon-yolu/r-*.png
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ADRES = (process.argv.find((a) => a.startsWith("--adres=")) ?? "--adres=http://localhost:5191").slice(8);
const OTURUM = path.resolve(".sezon-a-oturum.json");
const CIKTI = path.resolve("tasarim/sezon-yolu");
fs.mkdirSync(CIKTI, { recursive: true });
const origin = new URL(ADRES).origin;
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const ADRES_ = ADRES;
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


if (!fs.existsSync(OTURUM)) await misafirOturumuAc(tarayici);
const oturum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const kaynak = oturum.origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token")));
const lsDil = (dil) => [...kaynak.localStorage.filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }];

const sql = fs.readFileSync(path.resolve("supabase/migrations/20260612000721_sezon_yolu_oduller.sql"), "utf8");
const SATIR = /\(\s*(\d+),'(\w+)',\s*'(\w+)',\s*'(\{.*?\})',\s*(true|false),\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(null|'\w+')\)/g;
const TABLO = [...sql.matchAll(SATIR)].map((m) => ({
  seviye: Number(m[1]), kol: m[2], tur: m[3], veri: JSON.parse(m[4]), placeholder: m[5] === "true",
  ad_tr: m[6].replace(/''/g, "'"), ad_en: m[7].replace(/''/g, "'"), nadirlik: m[8] === "null" ? null : m[8].slice(1, -1),
}));
if (TABLO.length !== 56) { console.error("Ödül tablosu 56 satır olmalı:", TABLO.length); process.exit(1); }

const SP = 720;   // seviye 7
function durum(gorunur, bp) {
  const seviye = Math.floor(SP / 100);
  return {
    gorunur, acik: true, test: false, sahip: gorunur,
    sezon: { id: 2, no: 2, baslangic: "2026-10-01", bitis: "2026-10-29", kalan_gun: 21 },
    sp: SP, seviye, seviye_sayisi: 28, esikler: Array.from({ length: 28 }, (_, i) => (i + 1) * 100), onceki_esik: seviye * 100, sonraki_esik: (seviye + 1) * 100,
    bp: { aktif: bp, satin_alma_at: null, fiyat: 500, sp_carpan: 1.25 }, elmas: 1200,
    oduller: TABLO.map((o) => ({ ...o, alindi: false, alinabilir: o.seviye <= seviye && (o.kol === "ucretsiz" || bp) })),
    bonus_gorev: { hedef: 3, ilerleme: 1, sp: 40, alindi: false },
    final_unvan: { anahtar: "sezon_final", ad_tr: "Sezon 2 Ustası", ad_en: "Season 2 Master", kazanildi: false },
    bugun_mac_sp: 60, gunluk_mac_tavan: 150,
  };
}

let hata = 0;
const ok = (ad, k, ek = "") => { if (k) console.log("  ✓", ad); else { hata++; console.log("  ✗", ad, ek); } };
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };

async function ac(w, h, dil, yolAdres, { gorunur = true, bp = false } = {}) {
  const baglam = await tarayici.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
    storageState: { cookies: [], origins: [{ origin, localStorage: lsDil(dil) }] },
  });
  const s = await baglam.newPage();
  const konsol = [];
  s.on("console", (m) => { if (m.type() === "error") konsol.push(m.text()); });
  s.on("pageerror", (e) => konsol.push("pageerror: " + String(e).slice(0, 200)));
  const d = durum(gorunur, bp);
  const rpc = (ad, govde) => s.route(new RegExp(`/rest/v1/rpc/${ad}(\\?|$)`), (r) =>
    r.request().method() === "OPTIONS" ? r.fulfill({ status: 204, headers: CORS })
      : r.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: JSON.stringify(govde) }));
  await rpc("sezon_yolu_durumum", d);
  await rpc("sezon_ozetim", { gorunur, sezon: d.sezon, seviye: d.seviye, seviye_sayisi: 28, sp: d.sp, onceki_esik: d.onceki_esik, sonraki_esik: d.sonraki_esik, bp: d.bp, alinabilir: d.oduller.filter((o) => o.alinabilir).length });
  await s.route(new RegExp("/rest/v1/rpc/profilim(\\?|$)"), async (r) => {
    try { const y = await r.fetch(); const j = await y.json(); if (j && typeof j === "object") j.dil = dil; await r.fulfill({ response: y, body: JSON.stringify(j), contentType: "application/json" }); }
    catch { await r.continue(); }
  });
  await s.goto(ADRES + yolAdres, { waitUntil: "domcontentloaded" });
  await s.locator(".a-menu-dugme").first().waitFor({ timeout: 20000 }).catch(() => {});
  await s.waitForTimeout(3000);
  return { baglam, s, konsol };
}
const temiz = (k) => k.filter((x) => !/favicon|manifest|realtime|websocket|ERR_FAILED|Failed to load resource|net::|401|nadirlik/i.test(x));

async function ustCubuk(s, etiket) {
  const r = await s.evaluate(() => {
    const vis = (e) => e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0;
    const tam = document.querySelector(".brand .brand-logo--tam"); const ikon = document.querySelector(".brand .brand-logo--ikon");
    const dis = document.querySelector(".a-menu-dugme");
    const tr = tam?.getBoundingClientRect(); const dr = dis?.getBoundingClientRect();
    return { tam: vis(tam), ikon: vis(ikon), tamW: Math.round(tr?.width ?? 0), disSag: Math.round(dr?.right ?? 0), disSol: Math.round(dr?.left ?? 0), vw: window.innerWidth,
      rozetUst: Boolean(document.querySelector(".qt-ustcubuk .sz-rozet, .qt-ustcubuk-ic .sz-rozet")), logoSag: Math.round(tr?.right ?? 0),
      tasma: document.documentElement.scrollWidth - window.innerWidth };
  });
  ok(`${etiket}: üst çubukta tam logo görünür, Q ikonu yok`, r.tam && !r.ikon && r.tamW >= 100, JSON.stringify(r));
  ok(`${etiket}: dişli menü kenardan kesilmiyor`, r.disSag <= r.vw && r.disSol >= r.logoSag, JSON.stringify(r));
  ok(`${etiket}: üst çubukta Sezon rozeti yok`, !r.rozetUst);
  ok(`${etiket}: yatay taşma yok`, r.tasma <= 0, `taşma=${r.tasma}`);
  return r;
}

async function anaSayfa(w, h, dil, gorunur, onek) {
  const { baglam, s, konsol } = await ac(w, h, dil, "/", { gorunur });
  const et = `${w}×${h} ${dil.toUpperCase()}${gorunur ? "" : " (sahip değil)"}`;
  await ustCubuk(s, `ana sayfa ${et}`);
  const r = await s.evaluate(() => {
    const kart = document.querySelector(".as-ko"); const mini = document.querySelector(".as-ko .sz-mini");
    const oyna = document.querySelector(".as-buyuk-dugme"); const duello = document.querySelector(".as-buyuk-dugme--duello");
    const kr = kart?.getBoundingClientRect(); const mr = mini?.getBoundingClientRect();
    const altSinir = Math.min(window.innerHeight, document.querySelector(".qt-altmenu, .mobile-nav")?.getBoundingClientRect().top ?? window.innerHeight);
    const b = (e) => e?.getBoundingClientRect();
    return { kartH: Math.round(kr?.height ?? 0), mini: Boolean(mini), miniBox: mr ? `${Math.round(mr.width)}x${Math.round(mr.height)}` : "-", miniIc: mr ? mr.left >= kr.left && mr.right <= kr.right && mr.top >= kr.top - 12 && mr.bottom <= kr.bottom + 12 : false,
      oynaAlt: Math.round(b(oyna)?.bottom ?? 0), duelloAlt: Math.round(b(duello)?.bottom ?? 0), altSinir: Math.round(altSinir), vh: window.innerHeight,
      tasma: document.documentElement.scrollWidth - window.innerWidth, kaydirma: document.documentElement.scrollHeight - window.innerHeight,
      etiket: mini?.getAttribute("aria-label") ?? "" };
  });
  console.log("   ", JSON.stringify(r));
  if (gorunur) {
    ok(`ana sayfa ${et}: rozet profil kartı içinde`, r.mini && r.miniIc, JSON.stringify(r));
    ok(`ana sayfa ${et}: OYNA ve DÜELLO ilk ekranda (alt menüye girmiyor)`, r.oynaAlt <= r.altSinir && r.duelloAlt <= r.altSinir, JSON.stringify(r));
  } else ok(`ana sayfa ${et}: rozet görünmez`, !r.mini);
  ok(`ana sayfa ${et}: yatay taşma yok`, r.tasma <= 0);
  await s.screenshot({ path: path.join(CIKTI, `${onek}.png`) });
  if (gorunur) {
    await s.locator(".as-ko .sz-mini").click();
    await s.waitForTimeout(1500);
    ok(`ana sayfa ${et}: rozete dokununca /sezon-yolu açılır`, new URL(s.url()).pathname.endsWith("/sezon-yolu"), s.url());
  }
  const t = temiz(konsol); ok(`ana sayfa ${et}: konsol hatası yok`, t.length === 0, t.slice(0, 3).join(" | "));
  await baglam.close();
  return r;
}

async function menu(w, h, dil, gorunur, onek) {
  const { baglam, s } = await ac(w, h, dil, "/modlar", { gorunur });
  const et = `${w}×${h} ${dil.toUpperCase()}${gorunur ? "" : " (sahip değil)"}`;
  await ustCubuk(s, `başka sayfa (modlar) ${et}`);
  await s.locator(".a-menu-dugme").click();
  await s.waitForTimeout(500);
  const satir = await s.locator(".a-avatar-menu [role=menuitem]", { hasText: /Sezon Yolu|Season Path/ }).count();
  ok(`dişli menü ${et}: "Sezon Yolu" satırı ${gorunur ? "var" : "yok"}`, gorunur ? satir === 1 : satir === 0);
  if (gorunur) {
    await s.screenshot({ path: path.join(CIKTI, `${onek}.png`) });
    await s.locator(".a-avatar-menu [role=menuitem]", { hasText: /Sezon Yolu|Season Path/ }).click();
    await s.waitForTimeout(1500);
    ok(`dişli menü ${et}: satır /sezon-yolu'na götürür`, new URL(s.url()).pathname.endsWith("/sezon-yolu"), s.url());
  }
  await baglam.close();
}

async function sezonSayfasi(w, h, dil, bp, onek) {
  const { baglam, s, konsol } = await ac(w, h, dil, "/sezon-yolu", { bp });
  const et = `${w}×${h} ${dil.toUpperCase()}${bp ? " BP" : ""}`;
  const r = await s.evaluate(() => {
    const alt = document.querySelector(".qt-altmenu, .mobile-nav");
    const altTop = alt ? alt.getBoundingClientRect().top : window.innerHeight;
    const bant = (k) => document.querySelector(`.sy-bant--${k}`)?.getBoundingClientRect();
    const yuvalar = [...document.querySelectorAll(".sy-yuva")].map((e) => e.getBoundingClientRect());
    const kay = document.querySelector(".sy-yol-kaydirma");
    return { altTop: Math.round(altTop), ucretsiz: [Math.round(bant("ucretsiz").top), Math.round(bant("ucretsiz").bottom)], ucretli: [Math.round(bant("ucretli").top), Math.round(bant("ucretli").bottom)],
      kaydirmaDikeyTasma: kay.scrollHeight - kay.clientHeight, tasma: document.documentElement.scrollWidth - window.innerWidth, sayfaKaydirma: document.documentElement.scrollHeight - window.innerHeight,
      ilkYuva: Math.round(Math.min(...yuvalar.map((y) => y.top))) };
  });
  console.log("   ", et, JSON.stringify(r));
  // Kısa ekranda (≤ 700 px) iki kol ilk ekrana sığmaz (yalnız kol yüksekliği 2×147 px); sayfa kaydırılır, aşağıdaki "sayfa sonunda" ölçümü hiçbir yuvanın örtülmediğini doğrular.
  if (h > 700) ok(`/sezon-yolu ${et}: iki kol (ücretsiz + ücretli) ilk ekranda, alt menünün üstünde`, r.ucretli[1] <= r.altTop, JSON.stringify(r));
  else ok(`/sezon-yolu ${et}: kısa ekran — ücretsiz kol ilk ekranda`, r.ucretsiz[1] <= r.altTop, JSON.stringify(r));
  ok(`/sezon-yolu ${et}: yol şeridinde dikey taşma yok`, r.kaydirmaDikeyTasma <= 0, `${r.kaydirmaDikeyTasma}`);
  ok(`/sezon-yolu ${et}: sayfa yatay taşma yok`, r.tasma <= 0, `${r.tasma}`);
  await s.screenshot({ path: path.join(CIKTI, `${onek}.png`) });
  // sayfa sonuna kaydır: hiçbir yuva alt menünün altında kalmasın
  await s.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await s.waitForTimeout(400);
  const son = await s.evaluate(() => {
    const alt = document.querySelector(".qt-altmenu, .mobile-nav"); const altTop = alt ? alt.getBoundingClientRect().top : window.innerHeight;
    const son = [...document.querySelectorAll(".sy-sayfa > *:last-child, .sy-notlar")].pop()?.getBoundingClientRect().bottom ?? 0;
    return { altTop: Math.round(altTop), sonAlt: Math.round(son) };
  });
  ok(`/sezon-yolu ${et}: sayfa sonunda içerik alt menünün üstünde (örtme yok)`, son.sonAlt <= son.altTop, JSON.stringify(son));
  const t = temiz(konsol); ok(`/sezon-yolu ${et}: konsol hatası yok`, t.length === 0, t.slice(0, 3).join(" | "));
  await baglam.close();
}

for (const [w, h] of [[390, 844], [390, 664], [360, 640]]) {
  for (const dil of ["tr", "en"]) {
    if (dil === "en" && h === 664) continue;
    console.log(`\n== ${w}×${h} ${dil}`);
    await anaSayfa(w, h, dil, true, `r-ana-${w}x${h}-${dil}`);
    await menu(w, h, dil, true, `r-menu-${w}x${h}-${dil}`);
    await sezonSayfasi(w, h, dil, false, `r-sezon-${w}x${h}-${dil}`);
  }
}
console.log("\n== sahip olmayan hesap");
await anaSayfa(390, 844, "tr", false, "r-ana-sahipdegil-390x844");
await menu(390, 844, "tr", false, "r-menu-sahipdegil");
console.log("\n== BP sahibi");
await sezonSayfasi(390, 844, "tr", true, "r-sezon-bp-390x844-tr");
await tarayici.close();
console.log(hata ? `\n${hata} ölçüm BAŞARISIZ` : "\nTüm ölçümler geçti");
process.exit(hata ? 1 : 0);
