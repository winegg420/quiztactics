// Ortak Hazine maç başı giriş sahnesi (sandık düşüşü + 3-2-1) KARE ölçümü — gerçek KasaPage akışı, bota karşı TEK maç.
// Taklit: CPU 6x · 390×844 · Android UA (ağ kısıtı yok: ölçülen şey çizim). Sahne (.ks-giris-an) ekrandayken her
// requestAnimationFrame aralığı, uzun görevler ve Chrome izi (Layout / Paint / Raster / Script / Style) toplanır.
// Maç sonda SQL ile iptal edilir. Kullanım (vite preview + test-oturumu.mjs ile):
//   node araclar/hazine-giris-kare-olcum.mjs --adres=http://localhost:5199 --oturum=<dosya> [--etiket=once] [--cikti=…json]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "http://localhost:5199").replace(/\/$/, "");
const OTURUM = path.resolve(String(ARG.oturum || ".arayuz-denetim-oturum.json"));
const ETIKET = String(ARG.etiket || "olcum");
const CIKTI = path.resolve(String(ARG.cikti || `tasarim/hazine-giris/${ETIKET}.json`));
fs.mkdirSync(path.dirname(CIKTI), { recursive: true });

const IZCI = () => {
  const o = (window.__kare = { kareler: [], uzun: [], bas: null, bit: null, takilma: [], anlar: [] });
  let sonAn = null;
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) o.uzun.push([e.startTime, e.duration]); }).observe({ type: "longtask", buffered: true }); } catch { /* yok */ }
  let onceki = null;
  const dongu = (t) => {
    const sahne = document.querySelector(".ks-giris-an");
    if (sahne) {
      if (o.bas == null) o.bas = t;
      if (onceki != null) { o.kareler.push(t - onceki); if (t - onceki > 50) o.takilma.push([Math.round(onceki - o.bas), Math.round(t - onceki)]); }
      const an = (sahne.querySelector(".ks-giris-sayi")?.textContent ?? (sahne.querySelector(".ks-giris-hazir") ? "hazir" : "?"));
      if (an !== sonAn) { o.anlar.push([Math.round(t - o.bas), an]); sonAn = an; }
      onceki = t;
    } else if (o.bas != null && o.bit == null) o.bit = t;
    if (!sahne) onceki = null;
    requestAnimationFrame(dongu);
  };
  requestAnimationFrame(dongu);
};

const oturum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
oturum.origins = (oturum.origins ?? []).map((x) => ({ ...x, origin: new URL(ADRES).origin }));
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let id = null;
try {
  const b = await tarayici.newContext({ storageState: oturum, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: "Mozilla/5.0 (Linux; Android 11; SM-A125F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36", locale: "tr-TR", serviceWorkers: "block" });
  await b.addInitScript(IZCI);
  const s = await b.newPage();
  const cdp = await b.newCDPSession(s);
  await s.goto(ADRES + "/kasa", { waitUntil: "domcontentloaded" });
  await s.waitForTimeout(3000);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  const gec = async () => { for (let i = 0; i < 3; i++) { const g = s.getByRole("button", { name: /^(Geç|Atla|Anladım|Tamam|Kapat)$/ }); if (!(await g.count())) break; await g.first().click({ timeout: 1500 }).catch(() => {}); await s.waitForTimeout(300); } };
  for (let i = 0; i < 150 && !/\/kasa\/[0-9a-f-]{36}/.test(s.url()); i++) {
    if (i % 8 === 0) { await gec(); const a = s.getByRole("button", { name: /Rakip ara/i }); if (await a.count()) await a.first().click({ timeout: 2000 }).catch(() => {}); }
    await s.waitForTimeout(500);
  }
  id = s.url().match(/\/kasa\/([0-9a-f-]{36})/)?.[1] ?? null;
  if (!id) throw new Error("Hazine maçına girilemedi");
  if (typeof ARG.profil === "string") { await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 500 }); await cdp.send("Profiler.start"); }   // --profil=dosya: JS örnekleme profili
  await tarayici.startTracing(s, { categories: ["devtools.timeline", "disabled-by-default-devtools.timeline.frame", "v8.execute", "disabled-by-default-devtools.timeline.stack"] });
  for (let i = 0; i < 120; i++) { const v = await s.evaluate(() => window.__kare.bit).catch(() => null); if (v != null) break; await s.waitForTimeout(250); }
  const iz = JSON.parse((await tarayici.stopTracing()).toString());
  if (typeof ARG.profil === "string") fs.writeFileSync(ARG.profil, JSON.stringify((await cdp.send("Profiler.stop")).profile));
  if (typeof ARG.iz === "string") fs.writeFileSync(ARG.iz, JSON.stringify(iz));   // --iz=dosya: ham Chrome izi (ayrıntılı inceleme)
  const o = await s.evaluate(() => window.__kare);
  // Sahne kalkınca ilk soru görünmeli (sahnenin altı çizilmiyor — 14 Eki): bitişten soru metnine geçen süre
  const soruT = Date.now();
  const soruVar = await s.locator(".qt-soru-metin").first().waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false);
  const soruGecikme = soruVar ? Date.now() - soruT : null;
  if (o.bas == null) throw new Error("giriş sahnesi görülmedi");

  // İz özeti: sahne penceresindeki ana iş parçacığı olayları (ms)
  const olaylar = (iz.traceEvents ?? iz).filter((e) => e.ph === "X" && e.dur);
  const ana = olaylar.filter((e) => e.name === "RunTask");
  const t0 = Math.min(...ana.map((e) => e.ts));
  const kume = {};
  for (const e of olaylar) {
    const k = { FunctionCall: "betik", EvaluateScript: "betik", TimerFire: "zamanlayici", FireAnimationFrame: "raf", UpdateLayoutTree: "stil", Layout: "yerlesim",
      Paint: "boyama", PaintImage: "boyama", RasterTask: "raster", "Decode Image": "raster", CompositeLayers: "birlestirme", MinorGC: "gc", MajorGC: "gc" }[e.name];
    if (k) kume[k] = (kume[k] ?? 0) + e.dur / 1000;
  }
  const k = [...o.kareler].sort((a, b) => a - b);
  const yuzde = (p) => Math.round(k[Math.min(k.length - 1, Math.floor(k.length * p))] ?? NaN);
  const pencere = o.uzun.filter(([st]) => st >= o.bas && st <= (o.bit ?? Infinity));
  const sonuc = {
    etiket: ETIKET, mac: id, sahne_ms: Math.round((o.bit ?? NaN) - o.bas), kare: k.length,
    fps: Math.round((k.length / (((o.bit ?? o.bas) - o.bas) / 1000)) * 10) / 10,
    kare_p50: yuzde(0.5), kare_p95: yuzde(0.95), kare_maks: Math.round(k.at(-1) ?? NaN),
    takilma_50ms: k.filter((x) => x > 50).length, takilma_100ms: k.filter((x) => x > 100).length,
    soru_gorundu: soruVar, soru_sahne_sonrasi_ms: soruGecikme,
    takilmalar: o.takilma, anlar: o.anlar, uzun_gorevler: pencere.map(([st, d]) => [Math.round(st - o.bas), Math.round(d)]),
    uzun_gorev: pencere.length, uzun_gorev_maks: Math.round(Math.max(0, ...pencere.map((x) => x[1]))),
    iz_ms: Object.fromEntries(Object.entries(kume).map(([a, v]) => [a, Math.round(v)])), iz_baslangic: t0,
  };
  console.log(JSON.stringify(sonuc, null, 1));
  fs.writeFileSync(CIKTI, JSON.stringify(sonuc, null, 2));
  await b.close();
} finally {
  if (id) await db.sorgu(`update kasa_maclari set durum = 'iptal', bitis = now() where id = ${alintila(id)} and durum = 'aktif'`).catch((e) => console.log("kapatılamadı:", e.message));
  await db.kapat?.();
  await tarayici.close();
}
