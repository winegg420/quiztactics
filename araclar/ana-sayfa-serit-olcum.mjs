// Ana sayfa MOD KARTLARI ölçümü (6 Eki 2026; 7 Eki 2026 Sekme B: Klasik büyük + Düello/Ortak Hazine yan yana). SUNUCUYA YAZMAZ: oyun_ayarlari (kasa_modu_acik) ve sezon_ozetim taklit edilir.
// Ölçer: her bölümün y konumu, ilk ekranda tam görünme, şerit yükseklik eşitliği, yatay taşma, metin kırpılması, kontrast, dokunma hedefi,
// konsol hatası, tıklama akışı (Klasik → mod penceresi, Düello → /duello, Ortak Hazine → /kasa), "En son oynadığın" ipucu.
// Kullanım: npm run dev -- --port 5230 · node araclar/ana-sayfa-serit-olcum.mjs [--adres=http://localhost:5230] [--akis]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5230";
const KOK = new URL(ADRES).origin;
const CIKTI = path.resolve("tasarim/ana-sayfa-serit");
fs.mkdirSync(CIKTI, { recursive: true });
const durum = JSON.parse(fs.readFileSync(path.resolve(ARG.oturum || ".arayuz-denetim-oturum.json"), "utf8"));
durum.origins = (durum.origins || []).map((o) => ({ ...o, origin: KOK }));

const OLC = () => {
  const lum = (rgb) => { const c = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const oran = (a, b) => { const x = lum(a), y = lum(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
  const kutu = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { ust: Math.round(b.top), alt: Math.round(b.bottom), y: Math.round(b.height * 10) / 10, g: Math.round(b.width * 10) / 10 }; };
  const q = (s) => document.querySelector(s);
  const bolumler = { oyuncu: ".as-a2-kart", turnuva: ".as-a2-turnuva", serit_klasik: ".as-mod-serit--klasik", serit_duello: ".as-mod-serit--duello", serit_kasa: ".as-mod-serit--kasa",
    sonIpucu: ".as-mod-son", lig: ".as-a2-lig", sezon: ".as-a2-sezon", gorev: ".as-a2-gorev", kisayol: ".as-a-kisayol" };
  const k = {}; for (const [ad, s] of Object.entries(bolumler)) k[ad] = kutu(q(s));
  const seritler = [...document.querySelectorAll(".as-mod-serit")];
  const kontrast = seritler.map((e) => { const cs = getComputedStyle(e); return { mod: e.className.split("--")[1], oran: oran(cs.color, cs.backgroundColor) }; });
  const kirpilan = [...document.querySelectorAll(".as-mod-serit b, .as-mod-serit small, .as-mod-son")].filter((t) => t.scrollWidth > t.clientWidth + 0.5).map((t) => t.innerText);
  const usteBinen = seritler.some((e, i) => seritler.some((f, j) => j < i && (() => { const a = e.getBoundingClientRect(), b = f.getBoundingClientRect(); return a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1; })()));
  const nav = q(".mobile-nav")?.getBoundingClientRect();
  const alt = nav ? nav.top : innerHeight;
  const gorunmez = Object.entries(k).filter(([ad, v]) => v && v.y > 0 && ad !== "sonIpucu" && v.alt > alt + 0.5).map(([ad]) => ad);
  const kucukHedef = [...document.querySelectorAll(".as-mod-serit, .as-kisayol, .as-gs, .sz-ser")].filter((e) => { const b = e.getBoundingClientRect(); return b.height > 0 && (b.height < 43.5 || b.width < 43.5); }).map((e) => e.className.split(" ")[0]);
  return { k, serit: seritler.map((e) => ({ mod: e.className.split("--")[1], y: kutu(e).y, g: kutu(e).g, ad: e.getAttribute("aria-label") })), kontrast, kirpilan, usteBinen, gorunmez, kucukHedef,
    yatayTasma: document.documentElement.scrollWidth - document.documentElement.clientWidth, altMenuUst: Math.round(alt), pencere: [innerWidth, innerHeight],
    ipucu: q(".as-mod-son")?.innerText ?? null, kisayolSayisi: document.querySelectorAll(".as-kisayol").length };
};

const sezonOzet = (acik) => (acik ? { gorunur: true, sezon: 1, seviye: 9, seviye_sayisi: 28, sp: 940, onceki_esik: 900, sonraki_esik: 1000, bp: false, alinabilir: 0 } : { gorunur: false });
const t = await chromium.launch({ channel: "chrome", headless: true });
const sonuc = {}; const sorun = [];
const boyutlar = ARG.boyut ? ARG.boyut.split(",").map((b) => b.split("x").map(Number)) : [[390, 844], [360, 740], [390, 664], [360, 640], [412, 915]];
for (const dil of ["tr", "en"]) for (const [g, y] of boyutlar) for (const kasa of [1, 0]) for (const sezon of [true, false]) for (const azalt of [false, true]) {
  if (azalt && !(g === 390 && sezon && kasa)) continue;   // hareketi azalt: tek temsilci kombinasyon
  const d2 = JSON.parse(JSON.stringify(durum));
  for (const o of d2.origins) o.localStorage = [...(o.localStorage || []).filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }];
  const b = await t.newContext({ storageState: d2, viewport: { width: g, height: y }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: azalt ? "reduce" : "no-preference" });
  const s = await b.newPage();
  const hatalar = [];
  s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text().slice(0, 160)); });
  s.on("pageerror", (e) => hatalar.push("pageerror: " + String(e).slice(0, 160)));
  await s.route("**/rest/v1/rpc/sezon_ozetim*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sezonOzet(sezon)) }));
  await s.route(new RegExp("/rest/v1/rpc/profilim(\\?|$)"), async (r) => {
    try { const yanit = await r.fetch(); const j = await yanit.json(); if (j && typeof j === "object") j.dil = dil; await r.fulfill({ response: yanit, body: JSON.stringify(j), contentType: "application/json" }); } catch { await r.continue(); }
  });
  await s.route("**/rest/v1/oyun_ayarlari*", async (r) => {
    try { const yanit = await r.fetch(); const l = (await yanit.json()).filter((x) => x.anahtar !== "kasa_modu_acik"); l.push({ anahtar: "kasa_modu_acik", deger: kasa }); await r.fulfill({ response: yanit, body: JSON.stringify(l), contentType: "application/json" }); } catch { await r.continue(); }
  });
  await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  await s.waitForSelector(".as-mod-serit", { timeout: 25000 }).catch(() => {});
  // Veri gelene kadar bekle (lig kartı, görev şeridi, sezon kartı, Ortak Hazine ayarı); gelmezse ölçüm sorun olarak işaretlenir
  const hazir = [".as-lk", ".as-gs-parca", ...(sezon ? [".sz-ser"] : []), ...(kasa ? [".as-mod-serit--kasa"] : [])];
  for (const h of hazir) await s.waitForSelector(h, { timeout: 15000 }).catch(() => {});
  await s.waitForTimeout(1200);
  const o = await s.evaluate(OLC); o.konsol = hatalar;
  const ad = `${g}x${y}-${dil}-kasa${kasa}-sezon${sezon ? 1 : 0}${azalt ? "-azalt" : ""}`;
  sonuc[ad] = o;
  await s.screenshot({ path: path.join(CIKTI, `serit-${ad}.png`) });
  const bekSerit = kasa ? 3 : 2;
  const ys = new Set(o.serit.map((e) => e.y)), gs = new Set(o.serit.map((e) => e.g));
  const hata = [];
  if (o.serit.length !== bekSerit) hata.push(`şerit sayısı ${o.serit.length}≠${bekSerit}`);
  const sk = o.serit.find((e) => e.mod === "klasik"), ikili = o.serit.filter((e) => e.mod !== "klasik");
  if (!sk || sk.y !== (y <= 700 ? 96 : 120)) hata.push(`Klasik yükseklik ${sk?.y}`);
  if (ikili.some((e) => e.y !== 64)) hata.push(`ikili yükseklik ${ikili.map((e) => e.y)}`);
  if (kasa && (new Set(ikili.map((e) => e.g)).size !== 1 || o.k.serit_duello?.ust !== o.k.serit_kasa?.ust)) hata.push("Düello/Ortak Hazine yan yana değil");
  if (!kasa && gs.size !== 1) hata.push(`genişlik ${[...gs]}`);   // Ortak Hazine kapalı: Düello tam genişlik
  if (o.yatayTasma) hata.push(`yatay taşma ${o.yatayTasma}`);
  if (o.kirpilan.length) hata.push(`kırpılan ${o.kirpilan}`);
  if (o.usteBinen) hata.push("üst üste");
  if (o.kontrast.some((c) => c.oran < 4.5)) hata.push(`kontrast ${JSON.stringify(o.kontrast)}`);
  if (o.kucukHedef.length) hata.push(`küçük hedef ${o.kucukHedef}`);
  if (o.konsol.length) hata.push(`konsol ${o.konsol}`);
  if (o.kisayolSayisi !== 4) hata.push(`kısayol ${o.kisayolSayisi}`);
  if (o.gorunmez.length) hata.push(`ilk ekranda tam değil: ${o.gorunmez}`);
  if (sezon && !o.k.sezon?.y) hata.push("sezon kartı yok");
  if (!o.k.gorev?.y) hata.push("görev kartı yok");
  if (hata.length) sorun.push(`${ad}: ${hata.join(" · ")}`);
  console.log(ad, JSON.stringify({ y: Object.fromEntries(Object.entries(o.k).filter(([, v]) => v).map(([n, v]) => [n, `${v.ust}-${v.alt}`])), nav: o.altMenuUst, kontrast: o.kontrast.map((c) => c.oran).join("/") }), hata.length ? "SORUN" : "ok");
  if (ARG.akis && !azalt && sezon && g === 390 && dil === "tr") {
    const ipucuOnce = await s.evaluate(() => document.querySelector(".as-mod-son")?.innerText ?? null);
    const akis = { ipucuIlk: ipucuOnce };
    const adm = () => s.evaluate(() => !!document.querySelector("[role=dialog]"));
    const don = async () => { await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" }); await s.waitForSelector(".as-mod-serit"); await s.waitForTimeout(1000); };
    await s.click(".as-mod-serit--klasik"); await s.waitForTimeout(800);
    akis.klasik = { modal: await adm(), yol: new URL(s.url()).pathname };
    await don();
    await s.click(".as-mod-serit--duello"); await s.waitForTimeout(1200);
    akis.duello = { yol: new URL(s.url()).pathname };
    await don();
    akis.ipucuDuello = await s.evaluate(() => document.querySelector(".as-mod-son")?.innerText ?? null);
    await s.waitForSelector(".as-gs-parca", { timeout: 15000 }).catch(() => {});
    await s.waitForTimeout(1000);
    akis.ipucuIleOlcum = await s.evaluate(OLC);   // ipucu satırı görünürken de ilk ekrana sığmalı
    akis.ipucuIleSigdi = akis.ipucuIleOlcum.gorunmez.length === 0 && akis.ipucuIleOlcum.k.sonIpucu?.alt <= akis.ipucuIleOlcum.altMenuUst;
    delete akis.ipucuIleOlcum.k.oyuncu;
    if (kasa) {
      await s.click(".as-mod-serit--kasa"); await s.waitForTimeout(1200);
      akis.kasa = { yol: new URL(s.url()).pathname };
      await don();
      akis.ipucuKasa = await s.evaluate(() => document.querySelector(".as-mod-son")?.innerText ?? null);
    }
    await s.evaluate(() => localStorage.setItem("qt:v1:ana-son-mod", "{bozuk"));
    await don();
    akis.ipucuBozuk = await s.evaluate(() => document.querySelector(".as-mod-son")?.innerText ?? null);
    console.log("AKIŞ", ad, JSON.stringify(akis));
    sonuc[ad].akis = akis;
  }
  await b.close();
}
await t.close();
fs.writeFileSync(path.join(CIKTI, "serit-olcum.json"), JSON.stringify(sonuc, null, 1));
console.log(sorun.length ? "\nSORUNLAR:\n" + sorun.join("\n") : "\nTEMİZ");
