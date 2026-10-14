// Paket B/3 testi — yeni sürümü arka planda önceden indirme. İki yerel derleme (QT_SURUM=surumA / surumB) aynı adreste
// sırayla sunulur: A açıkken B yayına girer → sekme görünür olunca sürüm denetimi B'yi fark eder → on_yukle dosyaları
// SW önbelleğine iner (zorla yenileme olmadığı da denetlenir) → sonra B'nin açılışı CPU 6x + yavaş 4G'de ölçülür ve
// önbelleksiz (yeni cihaz) B açılışıyla karşılaştırılır. Canlı Supabase'e yalnız normal oyuncu kadar okuma gider.
//   QT_SURUM=surumA npx vite build --outDir <A> ; QT_SURUM=surumB npx vite build --outDir <B>
//   node araclar/onyukleme-testi.mjs --a=<A> --b=<B> --oturum=<dosya> [--port=5196]
import { chromium } from "playwright-core";
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const PORT = Number(ARG.port || 5196);
const ADRES = `http://localhost:${PORT}`;
const ham = JSON.parse(fs.readFileSync(path.resolve(String(ARG.oturum)), "utf8"));
const oturum = { ...ham, origins: ham.origins.map((x) => ({ ...x, origin: ADRES })) };
const AG = { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 };
let sunucu = null;
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
async function sun(dizin) {
  if (sunucu) { try { execSync(`taskkill /PID ${sunucu.pid} /T /F`, { stdio: "ignore" }); } catch { /* kapandı */ } await bekle(1500); }
  sunucu = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort", "--outDir", dizin], { shell: true, stdio: "ignore" });
  for (let i = 0; i < 40; i++) { try { if ((await fetch(ADRES + "/version.json")).ok) return; } catch { /* henüz */ } await bekle(500); }
  throw new Error("sunucu açılmadı");
}
const sonuc = {};
async function olc(s, cdp) {
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", AG);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  let agBayt = 0, swDosya = 0;
  const izle = (e) => { if (/\/assets\//.test(e.response.url)) { if (e.response.fromServiceWorker) swDosya++; } };
  const bayt = (e) => { agBayt += e.encodedDataLength; };
  cdp.on("Network.responseReceived", izle); cdp.on("Network.loadingFinished", bayt);
  const t0 = Date.now();
  await s.goto(ADRES + "/", { waitUntil: "commit" });
  await s.waitForSelector(".as-sayfa", { timeout: 40000 });
  const sure = Date.now() - t0;
  await bekle(1500);
  cdp.off("Network.responseReceived", izle); cdp.off("Network.loadingFinished", bayt);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  return { ana_sayfa_ms: sure, ag_kb: Math.round(agBayt / 1024), sw_dosya: swDosya };
}

const t = await chromium.launch({ channel: "chrome", headless: true });
try {
  const vB = JSON.parse(fs.readFileSync(path.join(String(ARG.b), "version.json"), "utf8"));
  // 1) A sürümü açık, SW kurulu
  await sun(String(ARG.a));
  const b = await t.newContext({ storageState: oturum, viewport: { width: 390, height: 844 }, locale: "tr-TR" });
  const s = await b.newPage();
  await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  await s.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 30000 }).catch(() => null);
  if (!(await s.evaluate(() => Boolean(navigator.serviceWorker?.controller)))) { await s.reload(); await s.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 30000 }); }
  await s.waitForSelector(".as-sayfa", { timeout: 30000 });
  let yenilendi = false;
  s.on("framenavigated", (f) => { if (f === s.mainFrame()) yenilendi = true; });
  await bekle(16000);   // EN_AZ_ARA_MS (15 sn) dolsun
  // 2) B yayında; sekme görünür olur → denetim
  await sun(String(ARG.b));
  await s.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await s.waitForSelector(".qt-yeni-surum", { timeout: 20000 }).catch(() => null);
  sonuc.bant = await s.locator(".qt-yeni-surum").count();
  const hedef = vB.on_yukle.filter((a) => !/three\.module-/.test(a));
  let onbellekte = 0;
  for (let i = 0; i < 60; i++) {
    onbellekte = await s.evaluate(async (liste) => { const c = await caches.open((await caches.keys()).find((k) => k.startsWith("qt-varlik")) ?? "yok"); let n = 0; for (const a of liste) if (await c.match(a)) n++; return n; }, hedef);
    if (onbellekte >= hedef.length) break;
    await bekle(1000);
  }
  sonuc.onbellek = `${onbellekte}/${hedef.length}`;
  sonuc.zorla_yenileme = yenilendi;
  // 3) B açılışı: önceden inmiş (aynı bağlam, SW önbelleği) vs. yeni cihaz (boş bağlam)
  sonuc.onceden_inmis = await olc(s, await b.newCDPSession(s));
  const b2 = await t.newContext({ storageState: oturum, viewport: { width: 390, height: 844 }, locale: "tr-TR" });
  const s2 = await b2.newPage();
  sonuc.onbelleksiz = await olc(s2, await b2.newCDPSession(s2));
  console.log(JSON.stringify(sonuc, null, 1));
  await b.close(); await b2.close();
} finally {
  await t.close();
  if (sunucu) { try { execSync(`taskkill /PID ${sunucu.pid} /T /F`, { stdio: "ignore" }); } catch { /* kapandı */ } }
}
