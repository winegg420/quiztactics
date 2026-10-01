// Ana sayfa ölçümü (kozmetik düzeltmeler + Sezon Yolu şeridi). SUNUCUYA YAZMAZ: sezon_ozetim / sezon_yolu_durumum cevapları
// tarayıcıda taklit edilir (page.route). Ölçer: kartlar arası boşluk, turnuva halkasının komşuya taşması, OYNA/DÜELLO yüksekliği,
// ilk ekranda kalma, hero çerçeve taşması, gri nokta, yatay taşma, konsol hatası. TR/EN, 390×664 · 360×640 · 390×844.
// Kullanım: npm run dev · node araclar/ana-sayfa-olcum.mjs --adres=http://localhost:5230 [--etiket=once] [--sezon=sahip|degil|odul|kapali|yok]
// Oturum: .arayuz-denetim-oturum.json (arayuz-denetim.mjs yazar; git'e girmez). Çıktı: tasarim/ana-sayfa-serit/<etiket>-*.png + -olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5230";
const ETIKET = ARG.etiket || "olcum";
const SEZON = ARG.sezon || "yok";   // yok: taklit yok (gerçek RPC) · sahip · degil · odul · kapali
const CIKTI = path.resolve("tasarim/ana-sayfa-serit");
fs.mkdirSync(CIKTI, { recursive: true });
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const KOK = new URL(ADRES).origin;

const durumYap = (bp, alinabilir, seviye = 9) => {
  const oduller = [];
  for (let n = 1; n <= 28; n++) for (const kol of ["ucretsiz", "ucretli"]) {
    oduller.push({ seviye: n, kol, tur: "coin", veri: { miktar: 50 }, miktar: 50, placeholder: n === 10 && kol === "ucretli",
      ad_tr: "50 coin", ad_en: "50 coins", nadirlik: null, alindi: n < seviye - alinabilir + 1, alinabilir: n <= seviye && n >= seviye - alinabilir + 1 && (kol === "ucretsiz" || bp) });
  }
  return {
    gorunur: true, acik: true, test: false, sahip: false, sezon: { id: 1, no: 1, baslangic: "2026-10-01T00:00:00Z", bitis: "2026-10-29T00:00:00Z", kalan_gun: 21 },
    sp: seviye * 100 + 40, seviye, seviye_sayisi: 28, esikler: [], onceki_esik: seviye * 100, sonraki_esik: (seviye + 1) * 100,
    bp: { aktif: bp, fiyat: 600, sp_carpan: 1.25 }, elmas: 0, oduller, bonus_gorev: null, final_unvan: null, bugun_mac_sp: 0, gunluk_mac_tavan: 200,
    tasma: { acik: false, azami: 10, kazanilan: 0, alinan_ucretsiz: 0, alinan_ucretli: 0, alinabilir_ucretsiz: 0, alinabilir_ucretli: 0, sonraki_icin_sp: 100, odul: {} },
  };
};
const SENARYO = { sahip: { bp: true, alinabilir: 0 }, degil: { bp: false, alinabilir: 0 }, odul: { bp: false, alinabilir: 3 }, kapali: null };

const OLC = () => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { ust: Math.round(b.top * 10) / 10, alt: Math.round(b.bottom * 10) / 10, y: Math.round(b.height * 10) / 10, g: Math.round(b.width * 10) / 10 }; };
  const parcalar = { oyuncu: ".as-a2-kart", lig: ".as-a2-lig", turnuva: ".as-a2-turnuva", eylem: ".as-a-eylem", kisayol: ".as-a-kisayol", sezon: ".as-a2-sezon", gorev: ".as-a2-gorev" };
  const k = {}; for (const [ad, s] of Object.entries(parcalar)) k[ad] = r(s);
  const sirali = Object.entries(k).filter(([, v]) => v && v.y > 0).sort((a, b) => a[1].ust - b[1].ust);
  const bosluk = {}; for (let i = 1; i < sirali.length; i++) bosluk[`${sirali[i - 1][0]}→${sirali[i][0]}`] = Math.round((sirali[i][1].ust - sirali[i - 1][1].alt) * 10) / 10;
  const ko = document.querySelector(".as-ko"), kb = ko?.getBoundingClientRect();
  const tasan = [];
  if (ko) for (const e of ko.querySelectorAll("*")) { const b = e.getBoundingClientRect(); if (b.width && (b.left < kb.left - 0.5 || b.top < kb.top - 0.5 || b.right > kb.right + 0.5 || b.bottom > kb.bottom + 0.5)) tasan.push({ e: (e.className?.baseVal ?? e.className ?? "").toString().slice(0, 40) || e.tagName, sol: Math.round(b.left - kb.left), ust: Math.round(b.top - kb.top), sag: Math.round(b.right - kb.right), alt: Math.round(b.bottom - kb.bottom) }); }
  const nokta = [...document.querySelectorAll(".as-rozet-nokta, .as-gs-nokta, .sz-mini-nokta")].map((e) => ({ sinif: String(e.className), ust: String(e.parentElement?.className ?? "").slice(0, 40), renk: getComputedStyle(e).backgroundColor }));
  const alt = document.querySelector(".mobile-nav")?.getBoundingClientRect();
  const sar = document.querySelector(".as-a2-lig"), lk = document.querySelector(".as-lk");
  const ligKes = sar && lk ? Math.round((lk.getBoundingClientRect().height - sar.clientHeight) * 10) / 10 : null;   // >0: lig kartı kesiliyor
  const ligSatir = document.querySelectorAll(".as-lk-satir").length - [...document.querySelectorAll(".as-lk-satir")].filter((e) => getComputedStyle(e).display === "none").length;
  return { ligKes, ligSatir, parcalar: k, bosluk, kartTasan: tasan.slice(0, 8), nokta, yatayTasma: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    pencere: { g: innerWidth, y: innerHeight }, altMenuUst: alt ? Math.round(alt.top) : null,
    sezonMetin: document.querySelector(".as-a2-sezon")?.innerText?.replace(/\n/g, " | ") ?? null, lig8: document.querySelector(".as-lk-sira")?.innerText ?? null };
};

const t = await chromium.launch({ channel: "chrome", headless: true });
const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
durum.origins = (durum.origins || []).map((o) => ({ ...o, origin: KOK }));
const sonuc = {};
for (const dil of ["tr", "en"]) for (const [g, y] of (ARG.boyut ? ARG.boyut.split(",").map((b) => b.split("x").map(Number)) : [[390, 664], [360, 640], [390, 844], [412, 915]])) {
  const d2 = JSON.parse(JSON.stringify(durum));
  for (const o of d2.origins) o.localStorage = [...(o.localStorage || []).filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }];
  const b = await t.newContext({ storageState: d2, viewport: { width: g, height: y }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const s = await b.newPage();
  const hatalar = [];
  s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text().slice(0, 160)); });
  s.on("pageerror", (e) => hatalar.push("pageerror: " + String(e).slice(0, 160)));
  if (SEZON !== "yok") {
    const sen = SENARYO[SEZON];
    await s.route("**/rest/v1/rpc/sezon_ozetim*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sen ? { gorunur: true, sezon: 1, seviye: 9, seviye_sayisi: 28, sp: 940, onceki_esik: 900, sonraki_esik: 1000, bp: sen.bp, alinabilir: sen.alinabilir } : { gorunur: false }) }));
    await s.route("**/rest/v1/rpc/sezon_yolu_durumum*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sen ? durumYap(sen.bp, sen.alinabilir) : { gorunur: false }) }));
  }
  await s.route(new RegExp("/rest/v1/rpc/profilim(\\?|$)"), async (r) => {
    try { const yanit = await r.fetch(); const j = await yanit.json(); if (j && typeof j === "object") j.dil = dil; await r.fulfill({ response: yanit, body: JSON.stringify(j), contentType: "application/json" }); } catch { await r.continue(); }
  });
  await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  await s.waitForSelector(".as-a2-kart", { timeout: 20000 }).catch(() => {});
  await s.waitForTimeout(2500);
  const o = await s.evaluate(OLC);
  o.konsol = hatalar;
  const ad = `${g}x${y}-${dil}`;
  sonuc[ad] = o;
  await s.screenshot({ path: path.join(CIKTI, `${ETIKET}-${SEZON}-${ad}.png`) });
  await b.close();
}
await t.close();
fs.writeFileSync(path.join(CIKTI, `${ETIKET}-${SEZON}-olcum.json`), JSON.stringify(sonuc, null, 1));
for (const [ad, o] of Object.entries(sonuc)) console.log(ad, JSON.stringify({ bosluk: o.bosluk, eylemY: o.parcalar.eylem?.y, eylemAlt: o.parcalar.eylem?.alt, pencereY: o.pencere.y, altMenuUst: o.altMenuUst, ligKes: o.ligKes, ligSatir: o.ligSatir, tasma: o.yatayTasma, lig8: o.lig8, nokta: o.nokta, kartTasan: o.kartTasan.length, sezon: o.sezonMetin, konsol: o.konsol.length }));
