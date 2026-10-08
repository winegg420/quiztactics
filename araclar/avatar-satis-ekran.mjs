// Avatar satışı (arka plan satışı kapalı) ve Sezon Yolu avatar yuvaları + elmasa çevrilen 8/17 yuvaları (820–822, 849) ekran ölçümü — 360×640 ve 390×844, TR/EN.
// SUNUCUYA YAZMAZ: migration'lar canlıda olmadığı için yeni yanıtlar tarayıcıda taklit edilir (page.route):
//   avatar_sahiplik_durumu (tamamı taklit) · kozmetik_katalogu ve sezon_yolu_durumum (gerçek yanıt + 821/822 alanları).
// Ölçer: yatay taşma, kilitli / etiketli öğe sayıları, bölüm başlıkları, yuva yazısı kırpılması, kontrast (hesaplanan
// renklerden; resim/gradyan üstü yazı için güvenilmez), konsol hatası. Çıktı: tasarim/avatar-satis/*.png + olcum.json
// Kullanım: npm run dev -- --port 5187 (başka kabukta) · node araclar/avatar-satis-ekran.mjs --adres=http://localhost:5187 [--dil=tr] [--en=360]
// Oturum: araclar/arayuz-denetim.mjs'in yazdığı .arayuz-denetim-oturum.json (git'e girmez).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5187";
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/avatar-satis");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }

// ---- Taklit veri: ücretli avatarlar migration 770'in Epik / Efsanevi listesinden ----
const sql770 = fs.readFileSync(path.resolve("supabase/migrations/20260612000770_avatar_nadirlik_yaz_ve_ac.sql"), "utf8");
const adres = (a) => `/avatars/${/-k\d+$/.test(a) ? "pro" : "pro2"}/${a}.svg`;
const SAHIP_OLUNAN = new Set(["korsan-k19", "kristal-uzayli-y28"]);
const UCRETLI = [...sql770.matchAll(/\('([a-z0-9-]+)','(epik|efsanevi)'\)/g)].map((m, i) => ({
  url: adres(m[1]), anahtar: m[1], nadirlik: m[2], fiyat: m[2] === "epik" ? 150 : 300, sahibim: SAHIP_OLUNAN.has(m[1]), satilik: true, sira: i,
}));
if (UCRETLI.length !== 26) { console.error("26 ücretli avatar bekleniyordu, okunan:", UCRETLI.length); process.exit(1); }
// Arka plan dükkânda satılmıyor (dondurulmuş) ve Battle Pass'te 8/17. seviye ücretli yuvalar ELMAS (migration 849: 25 / 30).
const YUVA = {
  5: { tur: "avatar", veri: { anahtar: "korsan-k19", url: adres("korsan-k19") }, ad_tr: "Korsan avatarı", ad_en: "Pirate avatar", nadirlik: "epik", sahip: true },
  8: { tur: "elmas", veri: { miktar: 25 }, ad_tr: "25 elmas", ad_en: "25 gems", nadirlik: null },
  14: { tur: "avatar", veri: { anahtar: "samuray-y15", url: adres("samuray-y15") }, ad_tr: "Samuray avatarı", ad_en: "Samurai avatar", nadirlik: "epik" },
  17: { tur: "elmas", veri: { miktar: 30 }, ad_tr: "30 elmas", ad_en: "30 gems", nadirlik: null },
  21: { tur: "avatar", veri: { anahtar: "kristal-uzayli-y28", url: adres("kristal-uzayli-y28") }, ad_tr: "Kristal Uzaylı avatarı", ad_en: "Crystal Alien avatar", nadirlik: "efsanevi", sahip: true },
  27: { tur: "avatar", veri: { anahtar: "savas-robotu-y30", url: adres("savas-robotu-y30") }, ad_tr: "Savaş Robotu avatarı", ad_en: "Battle Robot avatar", nadirlik: "efsanevi" },
};

// ---- Sayfa içi ölçüm ----
const OLC = () => {
  const ayril = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const kar = (ust, alt) => ({ r: ust.r * ust.a + alt.r * (1 - ust.a), g: ust.g * ust.a + alt.g * (1 - ust.a), b: ust.b * ust.a + alt.b * (1 - ust.a), a: 1 });
  const zemin = (el) => { const zincir = []; for (let e = el; e; e = e.parentElement) { const c = ayril(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { zincir.push(c); if (c.a >= 1) break; } } let t = { r: 255, g: 255, b: 255, a: 1 }; for (const c of zincir.reverse()) t = kar(c, t); return t; };
  const gorunur = (el) => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const s = getComputedStyle(el); if (s.visibility === "hidden" || s.display === "none") return false; for (let e = el; e; e = e.parentElement) if (+getComputedStyle(e).opacity < 0.05) return false; return true; };
  const yol = (el) => { const c = (el.className && el.className.baseVal === undefined ? String(el.className) : "").trim().split(/\s+/).slice(0, 2).join("."); return el.tagName.toLowerCase() + (c ? "." + c : ""); };
  const kontrast = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const gor = new Set();
  for (let n; (n = w.nextNode()); ) {
    const t = n.nodeValue.trim(); const el = n.parentElement;
    if (!t || !el || gor.has(el) || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName) || !gorunur(el)) continue;
    gor.add(el);
    const s = getComputedStyle(el); const on = ayril(s.color); if (!on) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    const arka = zemin(el); const k = kar({ ...on, a: on.a * op }, arka);
    const oran = (Math.max(lum(k), lum(arka)) + 0.05) / (Math.min(lum(k), lum(arka)) + 0.05);
    const px = parseFloat(s.fontSize); const buyuk = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700);
    if (oran < (buyuk ? 3 : 4.5)) kontrast.push({ el: yol(el), metin: t.slice(0, 40), oran: +oran.toFixed(2), px });
  }
  const say = (s) => document.querySelectorAll(s).length;
  const tasan = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > window.innerWidth + 1 && !e.closest(".sy-yol-kaydirma, .qt-sekmeler, [data-kaydir]"); }).slice(0, 5).map(yol);
  return {
    yatayTasma: document.documentElement.scrollWidth - window.innerWidth,
    tasan,
    kilitli: say(".qt-av-kilitli"), kilitRozeti: say(".qt-av-kilit"),
    etiket: [...document.querySelectorAll(".qt-dc-oge > .qt-dc-nadirlik, .qt-kz-nadirlik-satir > .qt-dc-nadirlik")].map((e) => e.textContent).reduce((a, t) => ((a[t] = (a[t] ?? 0) + 1), a), {}),
    bolumler: [...document.querySelectorAll(".qt-av-bolum")].map((e) => e.textContent.trim()),
    durumlar: [...document.querySelectorAll(".qt-dc-durum")].map((e) => e.textContent.trim()).reduce((a, t) => ((a[t] = (a[t] ?? 0) + 1), a), {}),
    kucukHedef: [...document.querySelectorAll(".qt-av-kilitli, .qt-dc-oge, .g-avatar-sec, .qt-pf-avatar-sec, .qt-ks-avatar")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).length,
    kontrast,
  };
};
const OLC_YOL = () => [...document.querySelectorAll(".sy-hucre--ucretli .sy-yuva")].map((b) => {
  const yazi = b.parentElement.querySelector(".sy-yuva-yazi");
  return {
    yuva: b.dataset.yuva, nadirlik: b.dataset.nadirlik,
    gorsel: b.querySelector(".sy-odul-avatar") ? "avatar" : b.querySelector(".sy-odul-abp .abp") ? "arka_plan" : (b.querySelector("svg") && /^d+$/.test((yazi?.textContent ?? "").trim())) ? "elmas" : b.querySelector(".sy-soru") ? "?" : "diger",
    yazi: yazi?.textContent ?? "", kirpik: yazi ? yazi.scrollWidth > yazi.clientWidth + 1 : false,
    tasiyor: (() => { const g = b.querySelector(".sy-odul-avatar, .sy-odul-abp"); if (!g) return false; const r = g.getBoundingClientRect(), k = b.getBoundingClientRect(); return r.left < k.left - 0.5 || r.right > k.right + 0.5 || r.top < k.top - 0.5 || r.bottom > k.bottom + 0.5; })(),
  };
}).filter((x) => ["5:ucretli", "8:ucretli", "14:ucretli", "17:ucretli", "19:ucretli", "21:ucretli", "22:ucretli", "23:ucretli", "27:ucretli", "28:ucretli"].includes(x.yuva));

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
const sonuc = {};
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };

const DILLER = ARG.dil ? [ARG.dil] : ["tr", "en"];
const EKRANLAR = ARG.en ? [[Number(ARG.en), Number(ARG.en) === 360 ? 640 : 844]] : [[360, 640], [390, 844]];
for (const dil of DILLER) {
  for (const [w, h] of EKRANLAR) {
    const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
    durum.origins = (durum.origins || []).map((o) => ({ ...o, origin: kok,
      localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim"].includes(x.name)), { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" }] }));
    const b = await tarayici.newContext({ storageState: durum, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block" });
    const s = await b.newPage();
    const konsol = [];
    s.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 200)); });
    s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
    let kurulumModu = false;
    // Dil profilden gelir; kurulum adımı için avatar_onayli taklit edilir — hiçbiri sunucuya yazılmaz.
    await s.route(/\/rest\/v1\/(profiles|rpc)/, async (r) => {
      const u = r.request().url();
      try {
        if (u.includes("/rpc/avatar_sahiplik_durumu")) return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(UCRETLI) });
        if (r.request().method() !== "GET" && /\/rpc\/(avatar_onayla|avatar_satin_al|kozmetik_satin_al|kozmetik_tak|bp_)/.test(u)) return r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "Ölçüm aracı: yazma kapalı" }) });
        const y = await r.fetch();
        let m = (await y.text()).replace(/"dil":\s*"(tr|en)"/g, `"dil":"${dil}"`);
        if (kurulumModu && (u.includes("/rest/v1/profiles") || u.includes("/rpc/profilim"))) m = m.replace(/"avatar_onayli":\s*true/g, '"avatar_onayli":false');
        if (u.includes("/rpc/sezon_yolu_durumum")) {
          const d = JSON.parse(m);
          if (Array.isArray(d?.oduller)) d.oduller = d.oduller.map((o) => (o.kol === "ucretli" && YUVA[o.seviye] ? { ...o, placeholder: false, sahip: false, ...YUVA[o.seviye] } : { sahip: false, ...o }));
          m = JSON.stringify(d);
        }
        await r.fulfill({ response: y, body: m });
      } catch { try { await r.continue(); } catch { /* sayfa kapandı */ } }
    });
    const etiket = `${w}-${dil}`;
    const ac = async (yol, bekle = 3500) => { await s.goto(ADRES + yol, { waitUntil: "domcontentloaded", timeout: 30000 }); await s.waitForTimeout(bekle); };
    // Sabit bekleme yetmez (ilk derleme, tembel parçalar): öğe sayısı eşiğe ulaşana dek bekle
    const bekle = async (secici, enAz = 1, sure = 25000) => {
      try { await s.waitForFunction(([q, n]) => document.querySelectorAll(q).length >= n, [secici, enAz], { timeout: sure }); await s.waitForTimeout(600); return true; }
      catch { return false; }
    };
    const kaydet = async (ad, tam = true) => s.screenshot({ path: path.join(CIKTI, `${ad}-${etiket}.png`), fullPage: tam });
    console.log(`\n== ${w}×${h} ${dil}`);
    try {
      await ac("/", 1500);   // dil değişimi bir kez yeniden yükleyebilir: ısıt
      await bekle(".as-sayfa, .a-icerik", 1, 40000);

      // 1) Dükkân › Avatar
      await ac("/joker?sekme=avatar", 800);
      await bekle(".qt-dc-oge", 60); await bekle(".qt-av-kilit", 24); await bekle(".qt-av-bolum", 4);
      let o = await s.evaluate(OLC); sonuc[`dukkan-avatar-${etiket}`] = o;
      ok("Dükkân › Avatar: yatay taşma yok", o.yatayTasma <= 0, JSON.stringify(o.tasan));
      ok("Dükkân › Avatar: 24 kilitli (26 ücretli − 2 sahip olunan), her birinde kilit rozeti", o.kilitli === 24 && o.kilitRozeti === 24, `${o.kilitli}/${o.kilitRozeti}`);
      ok("Dükkân › Avatar: yalnız Epik · 18 ve Efsanevi · 8 bölümleri (Yaygın / Nadir bölümü YOK)", o.bolumler.length === 2 && /18$/.test(o.bolumler[0]) && /8$/.test(o.bolumler[1]), JSON.stringify(o.bolumler));
      const sekmeler = await s.locator("[role=tab]").allInnerTexts();
      const trAd = ["Elmas", "Joker", "Çerçeve", "Avatar"];   // TR sözleşmesi; EN'de yalnız sayı + yasak adlar ölçülür
      ok("Dükkân: 4 sekme; Kıyafet / Arka Plan / VS Kartı / Zafer Efekti / Tepki sekmesi YOK",
        sekmeler.length === 4 && (dil === "en" || trAd.every((x, i) => sekmeler[i].includes(x))) && !/Kıyafet|Arka Plan|VS|Zafer|Tepki|Outfit|Background|Victory|Reaction/i.test(sekmeler.join("|")), JSON.stringify(sekmeler));
      ok("Dükkân › Avatar: dokunma hedefi ≥ 44 px", o.kucukHedef === 0, String(o.kucukHedef));
      await kaydet("dukkan-avatar");
      // kilitli karolar yakından (tembel yüklenen resimler görünsün): Epik başlığına kaydır
      await s.evaluate(() => document.querySelectorAll(".qt-av-bolum")[0]?.scrollIntoView({ block: "start" }));
      await s.waitForTimeout(1200);
      await kaydet("dukkan-avatar-epik", false);
      await s.evaluate(() => window.scrollTo(0, 0));
      // kilitli Epik avatarı seç → sahnede fiyatlı "Satın al", onay penceresi
      await s.locator(".qt-dc-oge.qt-av-kilitli").first().click();
      await s.waitForTimeout(400);
      const sahne = await s.locator(".qt-dc-sahne").innerText();
      ok("kilitli avatar seçilince sahnede elmas fiyatıyla Satın al (Tak yok)", /150/.test(sahne) && !/^(Tak|Equip)$/m.test(sahne), sahne.replace(/\s+/g, " ").slice(0, 120));
      await s.locator(".qt-dc-sahne-eylem button").first().click();
      await s.waitForTimeout(700);
      const pencere = s.locator("[role=dialog]").last();
      ok("satın alma onay penceresi açılır (fiyat + nadirlik etiketi)", await pencere.count() > 0 && /150/.test(await pencere.innerText()) && await pencere.locator(".qt-dc-nadirlik").count() > 0);
      o = await s.evaluate(OLC); sonuc[`dukkan-avatar-onay-${etiket}`] = o;
      ok("onay penceresi: yatay taşma yok", o.yatayTasma <= 0, JSON.stringify(o.tasan));
      await kaydet("dukkan-avatar-onay", false);

      // 2) Dükkân › Arka Plan artık satılmıyor: eski bağlantı (?sekme=paura) bilinmeyen sekme → Joker'e düşer, avatar bölümü yok
      await ac("/joker?sekme=paura", 800);
      await bekle("[role=tab]", 4);
      o = await s.evaluate(OLC); sonuc[`dukkan-arkaplan-${etiket}`] = o;
      ok("Dükkân › eski ?sekme=paura: yatay taşma yok", o.yatayTasma <= 0, JSON.stringify(o.tasan));
      ok("Dükkân › eski ?sekme=paura: arka plan satışı yok (avatar bölümü ve Nadir/Epik başlığı çıkmaz)", o.bolumler.length === 0 && await s.locator(".qt-dc-oge").count() === 0, JSON.stringify(o.bolumler));
      ok("Dükkân › eski ?sekme=paura: Joker sekmesi seçili", /true/.test(await s.locator("[role=tab]").nth(1).getAttribute("aria-selected") ?? ""));
      await kaydet("dukkan-arkaplan");

      // 3) Profil › Ayarlar › avatar seçici
      await ac("/profil?sekme=ayarlar", 800);
      await bekle("section[aria-labelledby=qt-pf-avatar-baslik] button");
      await s.locator("section[aria-labelledby=qt-pf-avatar-baslik] button").first().click();
      await bekle(".qt-pf-avatar-sec", 60); await bekle(".qt-av-kilit", 24);
      o = await s.evaluate(OLC); sonuc[`profil-${etiket}`] = o;
      ok("Profil avatar seçici: yatay taşma yok", o.yatayTasma <= 0, JSON.stringify(o.tasan));
      ok("Profil avatar seçici: kilitli avatarlar kilit rozetiyle (≥ 24)", o.kilitli >= 24 && o.kilitRozeti === o.kilitli, `${o.kilitli}/${o.kilitRozeti}`);
      ok("Profil avatar seçici: dokunma hedefi ≥ 44 px", o.kucukHedef === 0, String(o.kucukHedef));
      await s.locator(".qt-pf-avatar-sec.qt-av-kilitli").first().click({ force: true });   // aria-disabled: Playwright beklemesin
      await s.waitForTimeout(400);
      ok("kilitli avatara dokununca seçilmez, kilit açıklaması çıkar", await s.locator(".qt-pf-hata").count() > 0);
      await kaydet("profil-avatar");

      // 4) Profil › Koleksiyon
      await ac("/profil?sekme=koleksiyon", 800);
      await bekle(".qt-ks-avatar", 60); await bekle(".qt-av-kilit", 24);
      o = await s.evaluate(OLC); sonuc[`koleksiyon-${etiket}`] = o;
      ok("Koleksiyon: yatay taşma yok", o.yatayTasma <= 0, JSON.stringify(o.tasan));
      ok("Koleksiyon: kilitli avatarlar kilit rozetiyle (≥ 24)", o.kilitli >= 24 && o.kilitRozeti === o.kilitli, `${o.kilitli}/${o.kilitRozeti}`);
      await s.locator(".qt-ks-avatarlar").scrollIntoViewIfNeeded();
      await kaydet("koleksiyon");

      // 5) Kurulum sihirbazı (avatar adımı; profil yanıtı yalnız tarayıcıda değiştirilir)
      kurulumModu = true;
      await ac("/", 800);
      await bekle(".g-avatar-sec", 60); await bekle(".qt-av-kilit", 24, 8000);
      const kurulumVar = await s.locator(".g-avatar-izgara").count() > 0;
      ok("Kurulum: avatar adımı açıldı", kurulumVar);
      if (kurulumVar) {
        o = await s.evaluate(OLC); sonuc[`kurulum-${etiket}`] = o;
        ok("Kurulum: yatay taşma yok", o.yatayTasma <= 0, JSON.stringify(o.tasan));
        ok("Kurulum: kilitli avatarlar kilit rozetiyle (≥ 24)", o.kilitli >= 24 && o.kilitRozeti === o.kilitli, `${o.kilitli}/${o.kilitRozeti}`);
        await s.locator(".g-avatar-sec.qt-av-kilitli").first().click({ force: true });   // aria-disabled: Playwright beklemesin
        await s.waitForTimeout(300);
        ok("Kurulum: kilitli avatar seçilemez (seçili işareti yok)", await s.locator(".g-avatar-sec--secili").count() === 0);
        await kaydet("kurulum", false);
      }
      kurulumModu = false;

      // 6) Sezon Yolu yuvaları
      await ac("/sezon-yolu", 800);
      await bekle('[data-yuva="27:ucretli"]'); await bekle(".sy-odul-avatar", 4, 10000);
      const yuvalar = await s.evaluate(OLC_YOL); sonuc[`sezon-yuvalar-${etiket}`] = yuvalar;
      const y = Object.fromEntries(yuvalar.map((x) => [x.yuva.split(":")[0], x]));
      ok("yuva 5 / 14 / 21 / 27: gerçek avatar görseli", [5, 14, 21, 27].every((n) => y[n]?.gorsel === "avatar"), JSON.stringify(yuvalar.map((x) => `${x.yuva}=${x.gorsel}`)));
      ok("yuva 8 / 17: elmas yuvası (849; arka plan görseli YOK)", [8, 17].every((n) => y[n]?.gorsel === "elmas"), JSON.stringify(yuvalar.map((x) => `${x.yuva}=${x.gorsel}`)));
      ok('yuva 19 / 22 / 23 hâlâ "?"', [19, 22, 23].every((n) => y[n]?.gorsel === "?"));
      const ad = dil === "en" ? { epik: "Epic", efsanevi: "Legendary" } : { epik: "Epik", efsanevi: "Efsanevi" };
      ok("yuva yazısı: 5 Epik · 8 = 25 · 14 Epik · 17 = 30 · 21 Efsanevi · 27 Efsanevi",
        y[5]?.yazi === ad.epik && y[8]?.yazi === "25" && y[14]?.yazi === ad.epik && y[17]?.yazi === "30" && y[21]?.yazi === ad.efsanevi && y[27]?.yazi === ad.efsanevi, JSON.stringify(yuvalar.map((x) => `${x.yuva}=${x.yazi}`)));
      ok("yuva yazıları kırpılmıyor, görsel yuvadan taşmıyor", yuvalar.every((x) => !x.kirpik && !x.tasiyor), JSON.stringify(yuvalar.filter((x) => x.kirpik || x.tasiyor)));
      o = await s.evaluate(OLC); sonuc[`sezon-${etiket}`] = o;
      ok("Sezon Yolu: sayfada yatay taşma yok", o.yatayTasma <= 0, JSON.stringify(o.tasan));
      for (const n of [5, 14, 21]) {
        await s.evaluate((k) => document.querySelector(`[data-yuva="${k}:ucretli"]`)?.scrollIntoView({ inline: "center", block: "nearest" }), n);
        await s.waitForTimeout(500);
        await kaydet(`sezon-yol-${n}`, false);
      }
      for (const [n, tur] of [[5, "avatar"], [8, "elmas"], [21, "avatar"]]) {
        await s.evaluate((k) => document.querySelector(`[data-yuva="${k}:ucretli"]`)?.click(), n);
        await bekle(".sy-sayfa-ic", 1, 8000);
        const sayfa = s.locator(".sy-sayfa-ic").last();
        ok(`ödül sayfası ${n} (${tur}): büyük önizleme` + (tur === "elmas" ? " (nadirlik etiketi yok)" : " + nadirlik etiketi"), await sayfa.locator(`[data-onizleme="${tur}"]`).count() > 0 && (tur === "elmas" || await sayfa.locator(".qt-dc-nadirlik").count() > 0));
        if (n !== 8) ok(`ödül sayfası ${n}: "Zaten sahipsin" gösterilir`, new RegExp(dil === "en" ? "Already owned" : "Zaten sahipsin").test(await sayfa.innerText()));
        else ok('ödül sayfası 8: sahip değil → "Zaten sahipsin" yok', !/(Already owned|Zaten sahipsin)/.test(await sayfa.innerText()));
        o = await s.evaluate(OLC); sonuc[`sezon-odul-${n}-${etiket}`] = o;
        ok(`ödül sayfası ${n}: yatay taşma yok`, o.yatayTasma <= 0, JSON.stringify(o.tasan));
        await kaydet(`sezon-odul-${n}`, false);
        await s.keyboard.press("Escape");
        await s.waitForTimeout(600);
      }
    } catch (e) {
      kaldi++;
      console.log("  ✗ BEKLENMEYEN HATA:", String(e).slice(0, 300));
      try { await kaydet("hata", false); } catch { /* yok */ }
    }
    const gercekKonsol = konsol.filter((k) => !/Ölçüm aracı|favicon|net::ERR_|Failed to load resource/.test(k));
    ok("konsol hatası yok", gercekKonsol.length === 0, JSON.stringify(gercekKonsol.slice(0, 4)));
    sonuc[`konsol-${etiket}`] = konsol;
    await b.close();
  }
}
await tarayici.close();

// ---- Kontrast özeti (sayfa başına tekilleştirilmiş) ----
console.log("\n== Eşik altı kontrast (hesaplanan renk; resim/gradyan üstü yazı ölçüm artefaktı olabilir)");
for (const [k, v] of Object.entries(sonuc)) {
  if (!v?.kontrast?.length) continue;
  const g = new Map(); for (const x of v.kontrast) { const a = x.el + "|" + x.oran; if (!g.has(a)) g.set(a, x); }
  console.log(`## ${k}`);
  for (const x of g.values()) console.log(`  ${x.oran}\t${x.px}px\t${x.el}\t"${x.metin}"`);
}
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(sonuc, null, 1));
console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı — sunucuya yazılmadı. Görüntüler: tasarim/avatar-satis/`);
process.exit(kaldi ? 1 : 0);
