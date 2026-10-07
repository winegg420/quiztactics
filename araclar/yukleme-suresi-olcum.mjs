// Canlı site açılış ölçümü — salt okunur. Dört sayfa × normal/yavaş 4G × soğuk/sıcak ziyaret.
// Mevcut .arayuz-denetim-oturum.json oturumunu hedef origin'e kopyalar; yeni hesap/veri oluşturmaz.
// Kullanım: node araclar/yukleme-suresi-olcum.mjs [--adres=https://quiztactics.vercel.app] [--cikti=...json]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const ADRES = String(ARG.adres || "https://quiztactics.vercel.app").replace(/\/$/, "");
const CIKTI = path.resolve(String(ARG.cikti || "tasarim/yukleme-suresi/olcum-once.json"));
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
if (!fs.existsSync(OTURUM)) throw new Error("Oturum yok: .arayuz-denetim-oturum.json");

const hamOturum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const kaynak = (hamOturum.origins ?? []).find((o) => (o.localStorage ?? []).some((x) => x.name.includes("-auth-token")));
if (!kaynak) throw new Error("Mevcut test hesabı oturumu bulunamadı");
const hedefOrigin = new URL(ADRES).origin;
const oturum = {
  cookies: (hamOturum.cookies ?? []).filter((c) => !c.domain || hedefOrigin.includes(c.domain.replace(/^\./, ""))),
  origins: [{ ...kaynak, origin: hedefOrigin }],
};

const SAYFALAR = [
  { kod: "ana", ad: "Ana sayfa", yol: "/", ilk: "#qt-ilk-yukleme, .as-sayfa", sayfa: ".as-sayfa", yukleniyor: ".as-yukleniyor", hazir: ".as-sayfa.as-a2" },
  { kod: "lig", ad: "Lig", yol: "/siralama", ilk: "#qt-ilk-yukleme, .lg-sayfa", sayfa: ".lg-sayfa", yukleniyor: ".lg-iskelet", hazir: ".lg-sayfa" },
  { kod: "arkadas", ad: "Arkadaşlar", yol: "/arkadaslar", ilk: "#qt-ilk-yukleme, .ls-sayfa", sayfa: ".ls-sayfa", yukleniyor: ".ls-iskelet", hazir: ".ls-sayfa" },
  { kod: "dukkan", ad: "Dükkân", yol: "/joker", ilk: "#qt-ilk-yukleme, .qt-dk", sayfa: ".qt-dk", yukleniyor: ".qt-dk-panel [aria-busy=true], .qt-durum--yukleniyor", hazir: ".qt-dk" },
];
const AGLAR = [
  { kod: "normal", ad: "Normal", kosul: null },
  { kod: "yavas4g", ad: "Yavaş 4G", kosul: { offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8, connectionType: "cellular4g" } },
];

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const sonuclar = [];

async function olc(sayfa, tanim, ziyaret, agKod, agKosul) {
  const konsol = [];
  const agHatasi = [];
  const etkinVeri = new Set();
  let sonVeriBitti = Date.now();
  const veriMi = (r) => ["fetch", "xhr"].includes(r.resourceType()) && /\/rest\/v1\//.test(r.url());
  const basladi = (r) => { if (veriMi(r)) etkinVeri.add(r); };
  const bitti = (r) => { if (etkinVeri.delete(r)) sonVeriBitti = Date.now(); };
  sayfa.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 300)); });
  sayfa.on("pageerror", (e) => konsol.push(`SAYFA: ${String(e).slice(0, 300)}`));
  sayfa.on("requestfailed", (r) => { if (r.url().startsWith("http")) agHatasi.push(`${r.url()} · ${r.failure()?.errorText ?? "hata"}`); });
  sayfa.on("request", basladi);
  sayfa.on("requestfinished", bitti);
  sayfa.on("requestfailed", bitti);

  await sayfa.addInitScript(({ ilk, sayfa, yukleniyor, hazir }) => {
    window.__qtAcilis = { ilkMs: null, sayfaMs: null, iskeletMs: null, domHazirMs: null };
    try {
      new PerformanceObserver((liste) => {
        for (const e of liste.getEntries()) if (e.name === "first-contentful-paint") window.__qtFcp = e.startTime;
      }).observe({ type: "paint", buffered: true });
    } catch { /* eski tarayıcıda FCP ayrıca performans girdilerinden okunur */ }
    const gorunur = (secici) => [...document.querySelectorAll(secici)].some((e) => {
      const r = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      return r.width > 1 && r.height > 1 && s.display !== "none" && s.visibility !== "hidden";
    });
    const bak = () => {
      const o = window.__qtAcilis;
      if (o.iskeletMs === null && yukleniyor && gorunur(yukleniyor)) o.iskeletMs = performance.now();
      if (o.ilkMs === null && gorunur(ilk)) o.ilkMs = performance.now();
      if (o.sayfaMs === null && gorunur(sayfa)) o.sayfaMs = performance.now();
      if (o.sayfaMs !== null && o.domHazirMs === null && gorunur(hazir) && (!yukleniyor || !gorunur(yukleniyor))) o.domHazirMs = performance.now();
      if (o.domHazirMs === null) requestAnimationFrame(bak);
    };
    addEventListener("DOMContentLoaded", () => requestAnimationFrame(bak), { once: true });
  }, tanim);

  const bas = Date.now();
  const yanit = await sayfa.goto(ADRES + tanim.yol, { waitUntil: "domcontentloaded", timeout: 45000 });
  await sayfa.waitForFunction(() => window.__qtAcilis?.ilkMs !== null, null, { timeout: 30000 });
  await sayfa.waitForFunction(() => window.__qtAcilis?.domHazirMs !== null, null, { timeout: 30000 });
  // Son veri isteği bittikten sonra 500 ms sessizlik: ekrandaki ikincil kartların da yerleştiği an.
  const sessizlikSonu = Date.now() + 30000;
  while (Date.now() < sessizlikSonu && (etkinVeri.size > 0 || Date.now() - sonVeriBitti < 500)) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const perf = await sayfa.evaluate(() => {
    const fcp = window.__qtFcp ?? performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null;
    return {
      ...window.__qtAcilis,
      fcpMs: fcp,
      nowMs: performance.now(),
      yatayTasma: document.documentElement.scrollWidth - innerWidth,
      yol: location.pathname,
      baslik: document.title,
    };
  });
  const kayit = {
    ekran: tanim.ad, ekranKodu: tanim.kod, ag: agKod, ziyaret,
    http: yanit?.status() ?? null,
    fcpMs: perf.fcpMs == null ? null : Math.round(perf.fcpMs),
    ilkIcerikMs: Math.round(perf.ilkMs),
    sayfaIcerigiMs: Math.round(perf.sayfaMs),
    iskeletMs: perf.iskeletMs == null ? null : Math.round(perf.iskeletMs),
    domVeriHazirMs: Math.round(perf.domHazirMs),
    tamVeriMs: Math.round(perf.nowMs),
    duvarMs: Date.now() - bas,
    yatayTasma: perf.yatayTasma,
    konsolHatasi: [...konsol],
    agHatasi: [...agHatasi],
    sonYol: perf.yol,
  };
  console.log(`${tanim.ad.padEnd(11)} ${agKod.padEnd(8)} ${ziyaret.padEnd(5)} · ilk ${kayit.ilkIcerikMs} ms · sayfa ${kayit.sayfaIcerigiMs} ms · tam ${kayit.tamVeriMs} ms · FCP ${kayit.fcpMs} ms · HTTP ${kayit.http}`);
  return kayit;
}

for (const ag of AGLAR) {
  for (const tanim of SAYFALAR) {
    const baglam = await tarayici.newContext({ storageState: oturum, viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
    const sayfa = await baglam.newPage();
    const cdp = await baglam.newCDPSession(sayfa);
    await cdp.send("Network.enable");
    await cdp.send("Network.clearBrowserCache");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
    if (ag.kosul) await cdp.send("Network.emulateNetworkConditions", ag.kosul);
    sonuclar.push(await olc(sayfa, tanim, "soğuk", ag.kod, ag.kosul));
    await sayfa.goto("about:blank");
    sonuclar.push(await olc(sayfa, tanim, "sıcak", ag.kod, ag.kosul));
    await baglam.close();
  }
}
await tarayici.close();
fs.mkdirSync(path.dirname(CIKTI), { recursive: true });
fs.writeFileSync(CIKTI, JSON.stringify({ adres: ADRES, tarih: new Date().toISOString(), viewport: "390x844", sonuclar }, null, 2) + "\n");

const sorun = sonuclar.filter((x) => x.ilkIcerikMs > 1000);
const hata = sonuclar.filter((x) => x.http !== 200 || x.yatayTasma > 0 || x.konsolHatasi.length || x.agHatasi.length);
console.log(`\nİlk içerik >1 sn: ${sorun.length}/${sonuclar.length}; teknik hata: ${hata.length}/${sonuclar.length}; çıktı: ${CIKTI}`);
if (hata.length) process.exitCode = 2;
