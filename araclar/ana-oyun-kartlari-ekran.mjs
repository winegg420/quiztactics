// Ana sayfa Sezon + Görevler OYUN KARTLARI ölçümü (10 Eki 2026). SUNUCUYA YAZMAZ: sezon_ozetim, sezon_yolu_durumum, gorevlerim taklit edilir.
// Her sayfa yalnız bir kez açılır. Kullanım: npm run dev -- --port 5181 · node araclar/ana-oyun-kartlari-ekran.mjs [--adres=http://localhost:5181]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5181";
const CIKTI = path.resolve("tasarim/oyun-hissi-bp-gorevler");
fs.mkdirSync(CIKTI, { recursive: true });
const durum = JSON.parse(fs.readFileSync(path.resolve(".arayuz-denetim-oturum.json"), "utf8"));
durum.origins = (durum.origins || []).map((o) => ({ ...o, origin: new URL(ADRES).origin }));

const ozet = (hazir) => ({ gorunur: true, sezon: 1, seviye: 12, seviye_sayisi: 28, sp: 1340, onceki_esik: 1300, sonraki_esik: 1500, bp: false, alinabilir: hazir ? 2 : 0 });
const sezonDurum = { gorunur: true, acik: true, test: false, sahip: false, sezon: { id: 1, no: 1, kalan_gun: 20 }, oduller: [{ seviye: 13, kol: "ucretsiz", tur: "coin", veri: {}, ad_tr: "300 coin", ad_en: "300 coins" }] };
const gorev = (id, ilerleme, alinabilir) => ({ quest_id: id, ad_tr: "Görev " + id, ad_en: "Quest " + id, zorluk: "kolay", sayac: "x", hedef: 3, ilerleme, alindi: false, alinabilir, odul: { coin: 20, sp: 10 } });
const gorevler = (hazir) => ({ gunluk: { yenilenme_sn: 6 * 3600 + 720, gorevler: [gorev("a", hazir ? 3 : 3, hazir), gorev("b", 1, false), gorev("c", 0, false)].map((g, i) => (!hazir && i === 0 ? { ...g, alindi: true, alinabilir: false } : g)) },
  haftalik: { yenilenme_sn: 400000, gorevler: [gorev("h", 0, false)], sandik: { tamam: 0, hedef: 3, alindi: false, alinabilir: false, sp: 0, joker: null } }, alinabilir_sayi: hazir ? 1 : 0 });

const OLC = () => {
  const q = (s) => document.querySelector(s);
  const kutu = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.left), g: Math.round(b.width), ust: Math.round(b.top), alt: Math.round(b.bottom), y: Math.round(b.height) }; };
  const nav = q(".mobile-nav")?.getBoundingClientRect();
  const sez = q(".oc--sezon"), gor = q(".oc--gorev");
  const tasan = [sez, gor].filter(Boolean).flatMap((k) => [...k.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(), kb = k.getBoundingClientRect(); return b.width > 0 && (b.right > kb.right + 1 || b.left < kb.left - 1); }).map((e) => e.className));
  const kirpilan = [...document.querySelectorAll(".oc-baslik, .oc-durum > span")].filter((t) => t.scrollWidth > t.clientWidth + 0.5).map((t) => t.innerText);
  const gorsel = [...document.querySelectorAll(".oc-gorsel")].map((g) => ({ anim: getComputedStyle(g).animationName, kutu: kutu(g), canvasVeyaSvgVar: !!g.querySelector("svg,canvas,img") }));
  return { sezon: kutu(sez), gorev: kutu(gor), altMenu: nav ? Math.round(nav.top) : innerHeight, yatayTasma: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    kirpilan, tasan, gorsel, nokta: document.querySelectorAll(".oc-nokta").length, nabiz: [...document.querySelectorAll(".oc--hazir")].map((e) => getComputedStyle(e, "::after").animationName),
    metin: [...document.querySelectorAll(".oc")].map((e) => e.innerText.replace(/\s+/g, " ")), kucuk: [...document.querySelectorAll(".oc")].filter((e) => e.getBoundingClientRect().height < 44).length, pencere: [innerWidth, innerHeight] };
};

const t = await chromium.launch({ channel: "chrome", headless: true });
const sonuc = {}; const sorun = [];
const boyutlar = [[390, 844], [390, 664], [360, 640], [1440, 900]];
const plan = [];
for (const dil of ["tr", "en"]) for (const b of boyutlar) plan.push({ dil, b, hazir: true, sezon: true });
plan.push({ dil: "tr", b: [390, 844], hazir: false, sezon: true, ek: "hazirdegil" }, { dil: "en", b: [390, 844], hazir: false, sezon: true, ek: "hazirdegil" },
  { dil: "tr", b: [390, 844], hazir: true, sezon: false, ek: "sezonkapali" }, { dil: "tr", b: [390, 844], hazir: true, sezon: true, azalt: true, ek: "azalt" });
for (const { dil, b: [g, y], hazir, sezon, ek, azalt } of plan) {
  const d2 = JSON.parse(JSON.stringify(durum));
  for (const o of d2.origins) o.localStorage = [...(o.localStorage || []).filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }];
  const mobil = g < 1000;
  const c = await t.newContext({ storageState: d2, viewport: { width: g, height: y }, deviceScaleFactor: 2, hasTouch: mobil, isMobile: mobil, reducedMotion: azalt ? "reduce" : "no-preference" });
  const s = await c.newPage(); const hatalar = [];
  s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text().slice(0, 160)); });
  s.on("pageerror", (e) => hatalar.push("pageerror: " + String(e).slice(0, 160)));
  const js = (body) => (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  await s.route("**/rest/v1/rpc/sezon_ozetim*", js(sezon ? ozet(hazir) : { gorunur: false }));
  await s.route("**/rest/v1/rpc/sezon_yolu_durumum*", js(sezon ? sezonDurum : { gorunur: false, acik: false }));
  await s.route("**/rest/v1/rpc/gorevlerim*", js(gorevler(hazir)));
  await s.route(/\/rest\/v1\/rpc\/profilim(\?|$)/, async (r) => { try { const yn = await r.fetch(); const j = await yn.json(); if (j && typeof j === "object") j.dil = dil; await r.fulfill({ response: yn, body: JSON.stringify(j), contentType: "application/json" }); } catch { await r.continue(); } });
  await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  await s.waitForSelector(".oc--gorev", { timeout: 25000 }).catch(() => {});
  if (sezon) await s.waitForSelector(".oc--sezon", { timeout: 8000 }).catch(() => {});
  await s.waitForTimeout(2500);   // Ejderha çerçevesi tembel iner
  const o = await s.evaluate(OLC); o.konsol = hatalar;
  const ad = `${g}x${y}-${dil}${ek ? "-" + ek : ""}`;
  sonuc[ad] = o;
  await s.screenshot({ path: path.join(CIKTI, `ana-${ad}.png`) });
  const h = [];
  if (o.yatayTasma) h.push(`yatay taşma ${o.yatayTasma}`);
  if (!o.gorev) h.push("görev kartı yok"); else if (o.gorev.alt > o.altMenu + 0.5 && mobil) h.push(`görev kartı ilk ekranda tam değil (alt ${o.gorev.alt} > menü ${o.altMenu})`);
  if (sezon && !o.sezon) h.push("sezon kartı yok"); else if (sezon && o.sezon.alt > o.altMenu + 0.5 && mobil) h.push(`sezon kartı ilk ekranda tam değil (alt ${o.sezon.alt} > menü ${o.altMenu})`);
  if (!sezon && o.gorev && o.gorev.g < g * 0.8 && mobil) h.push("görev tam genişlik değil");
  if (o.kirpilan.length) h.push(`kırpılan ${o.kirpilan}`);
  if (o.tasan.length) h.push(`kart dışına taşan ${o.tasan}`);
  if (o.kucuk) h.push("44 px altı kart");
  if (hazir && o.nokta !== (sezon ? 2 : 1)) h.push(`nokta sayısı ${o.nokta}`);
  if (!hazir && o.nokta) h.push("hazır değilken nokta var");
  if (azalt && (o.gorsel.some((x) => x.anim !== "none") || o.nabiz.some((a) => a !== "none"))) h.push("hareketi azalt'ta animasyon sürüyor");
  if (o.konsol.length) h.push(`konsol ${o.konsol}`);
  if (h.length) sorun.push(`${ad}: ${h.join(" · ")}`);
  console.log(ad, JSON.stringify({ sezon: o.sezon, gorev: o.gorev, menu: o.altMenu, metin: o.metin }), h.length ? "SORUN" : "ok");
  await c.close();
}
await t.close();
fs.writeFileSync(path.join(CIKTI, "ana-olcum.json"), JSON.stringify(sonuc, null, 1));
console.log(sorun.length ? "\nSORUNLAR:\n" + sorun.join("\n") : "\nTEMİZ");
