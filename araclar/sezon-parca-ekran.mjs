// Sezon Yolu ön yüz parçaları (ajan B) ekran/ölçüm betiği. Dev sunucusu: npm run dev -- --port 5192
// Kullanım: node araclar/sezon-parca-ekran.mjs [--adres=http://localhost:5192]
// Canlıda sistem kapalı ve test hesabı sahip değil → sezon_ozetim / sahip_mi cevapları tarayıcıda taklit edilir; DB'ye yazılmaz.
// Oturum: .sezon-b-oturum.json (kendi misafir hesabı; git'e girmez).
// Çerçeve "önceki hâliyle aynı" kanıtı: tasarim/sezon-yolu/_baz1.html  (değişiklikten ÖNCE alınan DOM/piksel).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ADRES = (process.argv.find((a) => a.startsWith("--adres=")) ?? "--adres=http://localhost:5192").slice(8);
const OTURUM = path.resolve(".sezon-b-oturum.json");
const CIKTI = path.resolve("tasarim/sezon-yolu");
fs.mkdirSync(CIKTI, { recursive: true });
let hata = 0;
const ok = (ad, k, ek = "") => { if (k) console.log("  ✓", ad); else { hata++; console.log("  ✗", ad, ek); } };
const SEZON = 3;
const ozetTaklit = (o = {}) => ({ gorunur: true, sezon: SEZON, seviye: 7, seviye_sayisi: 28, sp: 650, onceki_esik: 600, sonraki_esik: 800, bp: false, alinabilir: 2, ...o });
const json = (b) => ({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
const sha = (b) => crypto.createHash("sha1").update(b).digest("hex").slice(0, 12);

const tarayici = await chromium.launch({ channel: "chrome", headless: true });

// ---- oturum (kendi misafir hesabı)
async function tanitimiKapat(s) {
  for (let i = 0; i < 8; i++) {
    const a = s.getByRole("button", { name: /^Atla$/ }); if (await a.count()) { await a.first().click(); await s.waitForTimeout(500); return; }
    const b = s.getByRole("button", { name: /Hadi başlayalım/i }); if (await b.count()) { await b.first().click(); await s.waitForTimeout(500); return; }
    await s.waitForTimeout(300);
  }
}
async function kurulum(s) {
  await tanitimiKapat(s);
  const alan = s.locator(".bd-modal-katman input").first();
  if (await alan.count()) { await alan.fill("SezonB" + Math.floor(Math.random() * 900 + 100)); await s.getByRole("button", { name: /^Devam$/ }).first().click(); await s.waitForTimeout(1800); }
  const ikon = s.locator(".bd-modal-katman .bd-avatar-secenek, .bd-modal-katman img[src*='/avatars/']").first();
  if (await ikon.count()) { await ikon.click(); await s.waitForTimeout(400); }
  const kullan = s.getByRole("button", { name: /Bu avatarı kullan/i }); const avatarsiz = s.getByRole("button", { name: /Avatarsız devam et/i });
  if (await kullan.count()) { await kullan.first().click(); await s.waitForTimeout(1800); } else if (await avatarsiz.count()) { await avatarsiz.first().click(); await s.waitForTimeout(1800); }
  const sehir = s.locator(".bd-modal-katman [role=combobox]").first();
  if (await sehir.count()) {
    await sehir.click(); await s.locator(".bd-modal-katman [role=option]").first().waitFor({ timeout: 8000 }).catch(() => {});
    const o = s.locator(".bd-modal-katman [role=option]").first(); if (await o.count()) await o.click();
    await s.getByRole("button", { name: /Oyuna başla/i }).first().click(); await s.waitForTimeout(2500);
  }
  await tanitimiKapat(s);
}
if (!fs.existsSync(OTURUM)) {
  const c = await tarayici.newContext(); const s = await c.newPage();
  await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  const d = s.getByRole("button", { name: /Misafir olarak dene/i }); await d.waitFor({ timeout: 20000 }); await d.click();
  await s.waitForTimeout(2500); await kurulum(s);
  await c.storageState({ path: OTURUM }); await c.close(); console.log("· misafir oturumu kaydedildi");
}
const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const origin = new URL(ADRES).origin;
const kaynak = durum.origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token")));
const jeton = JSON.parse(kaynak.localStorage.find((x) => x.name.includes("auth-token")).value);
const KULLANICI = jeton?.user?.id ?? jeton?.currentSession?.user?.id;
console.log("Misafir hesap id:", KULLANICI);
const ls = (dil, ek = []) => [...kaynak.localStorage.filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }, ...ek];

async function sayfaAc(w, h, dil, { ozet, ek = [], azalt = false, sahip = false, yol = "/" } = {}) {
  const baglam = await tarayici.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: azalt ? "reduce" : "no-preference",
    storageState: { cookies: [], origins: [{ origin, localStorage: ls(dil, ek) }] },
  });
  const s = await baglam.newPage(); const konsol = [];
  s.on("console", (m) => { if (m.type() === "error") konsol.push(m.text()); }); s.on("pageerror", (e) => konsol.push("pageerror " + e.message));
  if (ozet !== undefined) await s.route("**/rest/v1/rpc/sezon_ozetim*", (r) => r.fulfill(json(ozet)));
  if (sahip) await s.route("**/rest/v1/rpc/sahip_mi*", (r) => r.fulfill(json(true)));
  if (dil === "en") {   // profil dili ('tr') tarayıcı dilini ezmesin: profiles cevabında dil='en'
    await s.route("**/rest/v1/rpc/profilim*", async (r) => {
      try {
        const yanit = await r.fetch(); const g = await yanit.json();
        const yama = (o) => (o && typeof o === "object" && "dil" in o ? { ...o, dil: "en" } : o);
        await r.fulfill({ response: yanit, body: JSON.stringify(Array.isArray(g) ? g.map(yama) : yama(g)) });
      } catch { await r.continue(); }
    });
  }
  await s.goto(ADRES + yol, { waitUntil: "domcontentloaded" });
  return { s, baglam, konsol };
}
const temizKonsol = (k) => k.filter((x) => !/favicon|manifest|realtime|websocket|Failed to load resource|sezon_yolu_durumum/i.test(x));

// ---- (a)(b) çerçeve/halka ızgarası
console.log("\n== halka ızgarası");
{
  const baz = fs.readFileSync(path.join(CIKTI, "_baz1.html"), "utf8").replace(/blob:[^"]+/g, "blob:X");
  const eskiPiksel = fs.readFileSync(path.join(CIKTI, "_baz1.png"));
  const c = await tarayici.newContext({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const p = await c.newPage();
  const git = async (sorgu, adi) => {
    await p.goto(`${ADRES}/oyun/components/sezon/olcum/halka.html${sorgu}`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector("#izgara [data-boyut]"); await p.waitForTimeout(3500);
    await p.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
    await p.waitForTimeout(300);
    const html = (await p.evaluate(() => document.getElementById("izgara").innerHTML)).replace(/blob:[^"]+/g, "blob:X");
    const png = await p.locator("#izgara").screenshot(); if (adi) fs.writeFileSync(path.join(CIKTI, adi), png);
    return { html, png };
  };
  for (const [sorgu, ad] of [["", "prop yok"], ["?bp=0", "sezonBp={false}"], ["?kart=0", "kart.sezon_bp yok"]]) {
    const r = await git(sorgu, null);
    ok(`${ad}: DOM öncekiyle aynı (${sha(r.html)})`, r.html === baz);
    ok(`${ad}: piksel öncekiyle aynı (${sha(r.png)})`, sha(r.png) === sha(eskiPiksel));
  }
  const bp = await git("?bp=1&av=1", "b-halka-izgara.png");
  const kb = await git("?kart=1&av=1", null);
  const satirlar = (h) => h.slice(0, h.indexOf("data-isim"));
  ok("kart.sezon_bp=true yolu, sezonBp prop'uyla aynı avatar DOM'u", satirlar(bp.html) === satirlar(kb.html));
  const sayilar = await p.evaluate(() => [...document.querySelectorAll("[data-boyut]")].map((e) => [e.dataset.boyut, e.querySelector(".sz-halka") ? 1 : 0, (e.querySelector(".sz-halka-kap") || {}).offsetWidth]));
  ok("25 avatarın hepsinde halka var, kap genişliği = boyut", sayilar.every(([b, v, w]) => v === 1 && Number(w) === Number(b)), JSON.stringify(sayilar.slice(0, 5)));
  ok("halka pointer-events: none", await p.evaluate(() => getComputedStyle(document.querySelector(".sz-halka")).pointerEvents === "none"));
  const isim = await p.evaluate(() => [...document.querySelectorAll("[data-isim] > span")].map((e) => e.dataset.ef ?? "-"));
  ok("IsimEfekti: kart.sezon_bp → altın; ef=null → düz; ef=isim_altin → altın", isim.join(",") === "altin,-,altin" || isim.join(",") === "altin,altin,altin", isim.join(","));
  console.log("   isim (kart.sezon_bp · ef=null · ef=isim_altin), ?kart=1:", isim.join(","));
  {
    const k = await p.evaluate(() => 0); void k;
    await p.goto(`${ADRES}/oyun/components/sezon/olcum/halka.html?bp=1&av=1`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector("#izgara [data-boyut]"); await p.waitForTimeout(3000);
    const isim2 = await p.evaluate(() => [...document.querySelectorAll("[data-isim] > span")].map((e) => e.dataset.ef ?? "-"));
    console.log("   isim, ?bp=1 (sezonBp prop):", isim2.join(","));
    ok("sezonBp prop: ef=null olan isim de altın", isim2.join(",") === "altin,altin,altin", isim2.join(","));
  }
  const c2 = await tarayici.newContext({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2 });
  const p2 = await c2.newPage();
  await p2.goto(`${ADRES}/oyun/components/sezon/olcum/halka.html?bp=1&hareketli=1&av=1`, { waitUntil: "domcontentloaded" });
  await p2.waitForSelector("#izgara [data-boyut]"); await p2.waitForTimeout(3500);
  const par = await p2.evaluate(() => [...document.querySelectorAll("[data-boyut]")].map((e) => [e.dataset.boyut, e.querySelectorAll(".sz-halka-parilti").length]));
  ok("parıltı yalnız > 48 px'te", par.every(([b, n]) => (Number(b) > 48 ? n === 1 : n === 0)), JSON.stringify(par.slice(0, 5)));
  const don = await p2.evaluate(() => document.getAnimations().filter((a) => a.animationName === "sz-don").length);
  ok("yavaş dönen parıltı animasyonları çalışıyor", don > 0, `don=${don}`);
  await p2.locator("#izgara").screenshot({ path: path.join(CIKTI, "b-halka-hareketli.png") });
  await c.close(); await c2.close();
}

// ---- (c) üst çubuk rozeti
for (const [w, h, dil, bp] of [[390, 844, "tr", false], [360, 800, "tr", true], [390, 844, "en", true], [360, 800, "en", false]]) {
  console.log(`\n== üst çubuk ${w}×${h} ${dil} bp=${bp}`);
  const { s, baglam, konsol } = await sayfaAc(w, h, dil, { ozet: ozetTaklit({ bp }) });
  await s.waitForSelector(".sz-rozet", { timeout: 25000 });
  await s.waitForTimeout(800);
  const o = await s.evaluate(() => {
    const r = document.querySelector(".sz-rozet"); const b = r.getBoundingClientRect(); const g = r.querySelector(".sz-rozet-gorsel").getBoundingClientRect();
    const sag = Math.max(...[...document.querySelectorAll(".qt-ustcubuk-sag > *")].map((e) => e.getBoundingClientRect().right));
    const marka = document.querySelector(".qt-ustcubuk-marka").getBoundingClientRect();
    const sagKap = document.querySelector(".qt-ustcubuk-sag").getBoundingClientRect();
    return { w: b.width, h: b.height, gw: g.width, etiket: r.getAttribute("aria-label"), sayi: r.querySelector(".sz-rozet-sayi").textContent,
      nokta: !!r.querySelector(".sz-rozet-nokta"), tasma: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sagKenar: Math.round(sag), ic: innerWidth, markaSag: Math.round(marka.right), sagSol: Math.round(sagKap.left),
      altin: getComputedStyle(r.querySelector(".sz-rozet-doluluk")).stroke };
  });
  console.log("  ", JSON.stringify(o));
  ok("dokunma alanı ≥ 44 px", o.w >= 44 && o.h >= 44, `${o.w}x${o.h}`);
  ok("görsel 36 px", o.gw === 36);
  ok("yatay taşma yok", o.tasma <= 0, `tasma=${o.tasma}`);
  ok("sağ eylemler ekrana sığıyor", o.sagKenar <= o.ic, `${o.sagKenar}>${o.ic}`);
  ok("logo ile sağ grup çakışmıyor", o.markaSag <= o.sagSol + 1, `${o.markaSag} > ${o.sagSol}`);
  ok("aria-label dilde", dil === "tr" ? /Sezon Yolu, seviye 7/.test(o.etiket) : /Season Path, level 7/.test(o.etiket), o.etiket);
  ok("bekleyen ödül noktası + etikette", o.nokta && /ödül hazır|reward ready/.test(o.etiket));
  ok("BP'de halka altın", bp ? /255, 201, 51/.test(o.altin) : !/255, 201, 51/.test(o.altin), o.altin);
  await s.locator(".a-ust-blok").screenshot({ path: path.join(CIKTI, `b-ustcubuk-${w}-${dil}${bp ? "-bp" : ""}.png`) });
  if (w === 390 && dil === "tr" && !bp) {
    await s.locator(".sz-rozet").tap(); await s.waitForURL(/sezon-yolu/, { timeout: 8000 }).catch(() => {});
    ok("dokununca /sezon-yolu", /sezon-yolu/.test(s.url()), s.url());
  }
  ok("konsol hatası 0", temizKonsol(konsol).length === 0, temizKonsol(konsol).slice(0, 3).join(" | "));
  await baglam.close();
}
{
  console.log("\n== sistem kapalı (gorunur:false) → rozet yok");
  const { s, baglam, konsol } = await sayfaAc(390, 844, "tr", { ozet: ozetTaklit({ gorunur: false }) });
  await s.waitForSelector(".qt-ustcubuk-sag .bd-coin-hap", { timeout: 25000 }); await s.waitForTimeout(800);
  ok("rozet çizilmedi", (await s.locator(".sz-rozet").count()) === 0);
  for (const w of [390, 360]) {
    await s.setViewportSize({ width: w, height: 800 }); await s.waitForTimeout(400);
    console.log("   taban (rozetsiz)", w, "sağ kenar:", await s.evaluate(() => Math.round(Math.max(...[...document.querySelectorAll(".qt-ustcubuk-sag > *")].map((e) => e.getBoundingClientRect().right)))));
  }
  ok("konsol hatası 0", temizKonsol(konsol).length === 0, temizKonsol(konsol).join(" | "));
  await baglam.close();
}

// ---- (d) seviye atlama bildirimi
for (const dil of ["tr", "en"]) {
  console.log(`\n== seviye bildirimi ${dil}`);
  const anahtar = `bildim_sezon_seviye:${KULLANICI}:${SEZON}`;
  {
    const { s, baglam } = await sayfaAc(390, 844, dil, { ozet: ozetTaklit() });   // kayıt yok → ilk açılış
    await s.waitForSelector(".sz-rozet", { timeout: 25000 }); await s.waitForTimeout(1500);
    ok("ilk açılışta (kayıt yok) bildirim yok", (await s.locator(".sz-seviye-toast").count()) === 0);
    ok("seviye kaydedildi (7)", (await s.evaluate((k) => localStorage.getItem(k), anahtar)) === "7");
    await baglam.close();
  }
  const { s, baglam, konsol } = await sayfaAc(390, 844, dil, { ozet: ozetTaklit(), ek: [{ name: anahtar, value: "6" }] });
  await s.waitForSelector(".sz-seviye-toast", { timeout: 25000 }); await s.waitForTimeout(700);
  const t = (await s.locator(".sz-seviye-toast").innerText()).replace(/\s+/g, " ");
  console.log("  metin:", t);
  ok("başlık + 'Ödülün hazır'", dil === "tr" ? /Sezon Yolu · Seviye 7!/.test(t) && /Ödülün hazır/.test(t) : /Season Path · Level 7!/.test(t) && /Your reward is ready/.test(t));
  ok("seviye kaydı güncellendi", (await s.evaluate((k) => localStorage.getItem(k), anahtar)) === "7");
  await s.screenshot({ path: path.join(CIKTI, `b-bildirim-390-${dil}.png`) });
  await s.locator(".sz-seviye-toast").tap(); await s.waitForURL(/sezon-yolu/, { timeout: 8000 }).catch(() => {});
  ok("dokununca /sezon-yolu", /sezon-yolu/.test(s.url()), s.url());
  ok("konsol hatası 0", temizKonsol(konsol).length === 0, temizKonsol(konsol).slice(0, 3).join(" | "));
  await baglam.close();
}

// ---- (e) maç sonu zafer şeridi
for (const [azalt, bp, ad] of [[false, true, "bp"], [true, true, "bp-azalt"], [false, false, "bp-yok"]]) {
  console.log(`\n== maç sonu (${ad})`);
  const { s, baglam, konsol } = await sayfaAc(390, 844, "tr", { ozet: ozetTaklit({ bp }), azalt, sahip: true, yol: "/mac-sonu-onizleme" });
  await s.waitForSelector(".msk", { timeout: 25000 });
  await s.waitForSelector("[data-sezon-zafer], .msk-baslik", { state: "attached", timeout: 25000 });
  await s.waitForTimeout(azalt ? 1500 : 650);
  const var_ = await s.locator("[data-sezon-zafer]").count();
  if (bp) {
    ok("zafer şeridi takıldı (kazandı + BP)", var_ === 1);
    const d = await s.evaluate(() => {
      const z = document.querySelector("[data-sezon-zafer]"); const baslik = document.querySelector(".msk-baslik");
      const b = baslik.getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      const dugme = document.querySelector(".msk-eylem-rovans"); const r = dugme.getBoundingClientRect();
      const ust = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { pe: getComputedStyle(z).pointerEvents, baslikUstte: Boolean(e?.closest(".msk-afis")), dugmeUstte: dugme.contains(ust),
        halka: getComputedStyle(z.querySelector(".sz-zafer-halka")).display };
    });
    console.log("  ", JSON.stringify(d));
    ok("pointer-events none", d.pe === "none");
    ok("sonuç metni şeridin önünde", d.baslikUstte);
    ok("Rövanş düğmesi dokunulabilir", d.dugmeUstte);
    ok(azalt ? "hareketi azalt: halka kapalı" : "halka açık", azalt ? d.halka === "none" : d.halka !== "none");
    await s.screenshot({ path: path.join(CIKTI, `b-macsonu-${ad}-1.png`) });
    await s.waitForTimeout(azalt ? 900 : 500); await s.screenshot({ path: path.join(CIKTI, `b-macsonu-${ad}-2.png`) });
    await s.waitForTimeout(3800);
    const hala = await s.evaluate(() => { const e = document.querySelector(".sz-zafer-serit"); return e ? getComputedStyle(e).opacity : "yok"; });
    ok("animasyon bitince şerit görünmez (opacity 0)", hala === "0" || hala === "yok", hala);
  } else ok("BP yokken zafer şeridi yok", var_ === 0);
  ok("konsol hatası 0", temizKonsol(konsol).length === 0, temizKonsol(konsol).slice(0, 3).join(" | "));
  await baglam.close();
}
await tarayici.close();
console.log(hata ? `\n${hata} KALDI` : "\nHEPSİ GEÇTİ");
process.exit(hata ? 1 : 0);
