// Sezon Yolu açılış/kapanış geçişi ölçümü. SUNUCUYA YAZMAZ: sezon_ozetim / sezon_yolu_durumum cevapları taklit edilir (page.route).
// Ölçer: ilk açılışta perde (süre, dokununca atlama, localStorage kaydı) · ikinci açılışta perde YOK · sayfa kayışı süresi (CSS animasyon süresi)
// · yolun seviyeye kayışı (scrollLeft zaman çizgisi) · durak parlaması · kapanışta hayalet (250 ms) · "hareketi azalt" (animasyon yok) · konsol hatası.
// Kullanım: npm run dev · node araclar/sezon-acilis-olcum.mjs --adres=http://localhost:5230
// Oturum: .arayuz-denetim-oturum.json. Çıktı: tasarim/ana-sayfa-serit/acilis-*.png + acilis-olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5230";
const CIKTI = path.resolve("tasarim/ana-sayfa-serit");
fs.mkdirSync(CIKTI, { recursive: true });
const KOK = new URL(ADRES).origin;
const durum0 = JSON.parse(fs.readFileSync(path.resolve(".arayuz-denetim-oturum.json"), "utf8"));
durum0.origins = (durum0.origins || []).map((o) => ({ ...o, origin: KOK }));

const durumYap = (seviye = 19) => {
  const oduller = [];
  for (let n = 1; n <= 28; n++) for (const kol of ["ucretsiz", "ucretli"]) {
    const final = n === 28 && kol === "ucretli";
    oduller.push({ seviye: n, kol, tur: final ? "cerceve" : "coin", veri: final ? { anahtar: "pc_ejderha2" } : { miktar: 50 }, miktar: 50, placeholder: false,
      ad_tr: final ? "Ejderha çerçevesi" : "50 coin", ad_en: final ? "Dragon frame" : "50 coins", nadirlik: final ? "efsanevi" : null,
      alindi: n < seviye - 1, alinabilir: n <= seviye && n >= seviye - 1 && kol === "ucretsiz" });
  }
  return {
    gorunur: true, acik: true, test: false, sahip: false, sezon: { id: 1, no: 1, baslangic: "2026-10-01T00:00:00Z", bitis: "2026-10-29T00:00:00Z", kalan_gun: 21 },
    sp: seviye * 100 + 40, seviye, seviye_sayisi: 28, esikler: [], onceki_esik: seviye * 100, sonraki_esik: (seviye + 1) * 100,
    bp: { aktif: false, fiyat: 600, sp_carpan: 1.25 }, elmas: 0, oduller, bonus_gorev: null, final_unvan: null, bugun_mac_sp: 0, gunluk_mac_tavan: 200,
    tasma: { acik: false, azami: 10, kazanilan: 0, alinan_ucretsiz: 0, alinan_ucretli: 0, alinabilir_ucretsiz: 0, alinabilir_ucretli: 0, sonraki_icin_sp: 100, odul: {} },
  };
};

async function baglam(t, g, y, { azalt = false } = {}) {
  const d2 = JSON.parse(JSON.stringify(durum0));
  for (const o of d2.origins) o.localStorage = (o.localStorage || []).filter((x) => !String(x.name).startsWith("bildim_sezon_perde"));
  const b = await t.newContext({ storageState: d2, viewport: { width: g, height: y }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: azalt ? "reduce" : "no-preference" });
  const s = await b.newPage();
  const konsol = [];
  s.on("console", (m) => { if (m.type() === "error" && !/favicon|manifest|realtime|websocket|ERR_FAILED|Failed to load resource|net::/i.test(m.text())) konsol.push(m.text().slice(0, 160)); });
  s.on("pageerror", (e) => konsol.push("pageerror: " + String(e).slice(0, 160)));
  await s.route("**/rest/v1/rpc/sezon_ozetim*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ gorunur: true, sezon: 1, seviye: 19, seviye_sayisi: 28, sp: 1940, onceki_esik: 1900, sonraki_esik: 2000, bp: false, alinabilir: 2 }) }));
  await s.route("**/rest/v1/rpc/sezon_yolu_durumum*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(durumYap()) }));
  return { b, s, konsol };
}

// Sayfada 50 ms'de bir durum örnekler (setInterval) → zaman çizgisi
const IZ = `(() => {
  clearInterval(window.__izId); window.__iz = []; const t0 = performance.now();
  const id = window.__izId = setInterval(() => {
    const k = document.querySelector(".sy-sayfa"); const p = document.querySelector(".sy-perde"); const y = document.querySelector(".sy-yol-kaydirma");
    window.__iz.push({ t: Math.round(performance.now() - t0), perde: p ? Math.round(+getComputedStyle(p).opacity * 100) / 100 : null, kabuk: k ? k.className.replace("sy-sayfa", "").trim() : null,
      kabukOp: k ? Math.round(+getComputedStyle(k).opacity * 100) / 100 : null, kay: y ? Math.round(y.scrollLeft) : null, parla: !!document.querySelector(".sy-durak--parla"), hayalet: !!document.querySelector(".sy-hayalet") });
  }, 50);
  setTimeout(() => clearInterval(id), 3200);
})()`;

const ozetle = (iz) => {
  const ilk = (f) => iz.find(f)?.t ?? null;
  const son = (f) => [...iz].reverse().find(f)?.t ?? null;
  const kayDizi = iz.filter((x) => x.kay != null);
  return {
    perdeVar: iz.some((x) => x.perde != null), perdeIlk: ilk((x) => x.perde != null), perdeSon: son((x) => x.perde != null),
    acilisBasladi: ilk((x) => x.kabuk?.includes("sy-sayfa--ac")),
    kayisBasladi: kayDizi.length ? (kayDizi.find((x) => x.kay !== kayDizi[0].kay)?.t ?? null) : null,
    kayisBitti: kayDizi.length ? (kayDizi.find((x) => x.kay === kayDizi.at(-1).kay)?.t ?? null) : null,
    kaydirmaSon: kayDizi.at(-1)?.kay ?? null, parlaIlk: ilk((x) => x.parla), parlaSon: son((x) => x.parla),
  };
};

const sonuc = {};
const t = await chromium.launch({ channel: "chrome", headless: true });
for (const [g, y] of [[390, 844], [360, 740]]) {
  // --- 1) İlk açılış: ana sayfadaki şeride dokun → perde → sayfa ---
  {
    const { b, s, konsol } = await baglam(t, g, y);
    await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
    await s.waitForSelector(".sz-ser", { timeout: 20000 });
    await s.evaluate(IZ);
    await s.click(".sz-ser");
    await s.waitForTimeout(450);
    await s.screenshot({ path: path.join(CIKTI, `acilis-perde-${g}x${y}.png`) });
    await s.waitForTimeout(1250);
    await s.screenshot({ path: path.join(CIKTI, `acilis-sayfa-${g}x${y}.png`) });
    await s.waitForTimeout(1500);
    const iz = await s.evaluate(() => window.__iz);
    const kayit = await s.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("bildim_sezon_perde")));
    sonuc[`ilk-${g}x${y}`] = { ...ozetle(iz), perdeOpakDizisi: iz.filter((x) => x.perde != null).map((x) => x.perde).join(","), kayit, url: s.url().replace(KOK, ""), konsol };
    // --- 2) Kapanış: geri → hayalet ---
    await s.evaluate(IZ);
    await s.goBack({ waitUntil: "domcontentloaded" });
    await s.waitForTimeout(1200);
    const iz2 = await s.evaluate(() => window.__iz);
    const h = iz2.filter((x) => x.hayalet);
    sonuc[`kapanis-${g}x${y}`] = { hayaletIlk: h[0]?.t ?? null, hayaletSon: h.at(-1)?.t ?? null, hayaletOrnek: h.length };
    // --- 3) İkinci açılış: perde YOK ---
    await s.evaluate(IZ);
    await s.click(".sz-ser");
    await s.waitForTimeout(2000);
    const iz3 = await s.evaluate(() => window.__iz);
    sonuc[`ikinci-${g}x${y}`] = ozetle(iz3);
    await s.screenshot({ path: path.join(CIKTI, `acilis-ikinci-${g}x${y}.png`) });
    await b.close();
  }
  // --- 4) Dokununca atla ---
  {
    const { b, s, konsol } = await baglam(t, g, y);
    await s.goto(ADRES + "/sezon-yolu", { waitUntil: "domcontentloaded" });
    await s.waitForSelector(".sy-perde", { timeout: 20000 });
    const t0 = Date.now();
    await s.waitForTimeout(500);
    await s.mouse.click(g / 2, y / 2);
    await s.waitForSelector(".sy-perde", { state: "detached", timeout: 3000 });
    sonuc[`atla-${g}x${y}`] = { perdeKapanmaMs: Date.now() - t0, konsol };
    await b.close();
  }
  // --- 5) Hareketi azalt ---
  {
    const { b, s, konsol } = await baglam(t, g, y, { azalt: true });
    await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
    await s.waitForSelector(".sz-ser", { timeout: 20000 });
    await s.click(".sz-ser");
    await s.waitForTimeout(400);
    const perde1 = await s.evaluate(() => ({ perde: !!document.querySelector(".sy-perde"), anim: document.getAnimations().map((a) => a.animationName).filter((a) => /^sy-/.test(a ?? "")) }));
    await s.waitForTimeout(1500);
    await s.evaluate(IZ);
    await s.waitForTimeout(600);
    const iz = await s.evaluate(() => window.__iz);
    const son = await s.evaluate(() => ({ anim: document.getAnimations().map((a) => a.animationName).filter((a) => /^sy-/.test(a ?? "")), kabukOp: +getComputedStyle(document.querySelector(".sy-sayfa")).opacity, kay: document.querySelector(".sy-yol-kaydirma")?.scrollLeft }));
    await s.evaluate(() => history.back());
    await s.waitForTimeout(150);
    const hayalet = await s.evaluate(() => !!document.querySelector(".sy-hayalet"));
    sonuc[`azalt-${g}x${y}`] = { perdeIlk400ms: perde1, sonra: son, parla: iz.some((x) => x.parla), hayalet, konsol };
    await b.close();
  }
}
await t.close();
fs.writeFileSync(path.join(CIKTI, "acilis-olcum.json"), JSON.stringify(sonuc, null, 1));
console.log(JSON.stringify(sonuc, null, 1));
