// ============================================================
// YENİLEME ÖLÇÜMÜ (7 Eki 2026) — "sayfayı yenileyince ekran geri gelmiyor" tanısı
//
// Oturum açıkken bir sayfayı (varsayılan /joker = Dükkân) açar ve N kez yeniler; her yüklemede
// içeriğin (açılış + tembel sayfa yükleyicisi gidip sayfa çizilince) kaç ms'de geldiğini,
// konsol hatalarını, başarısız ve askıda kalan istekleri yazar.
//   --adres=https://quiztactics.com   --sayfa=/joker   --tekrar=4
//   --eski       : her yenilemeden önce erişim belirtecinin süresi dolmuş sayılır (expires_at geçmiş)
//   --ag=yavas   : yavaş 4G taklidi (400 ms gecikme, ~1,6 Mbit)
//   --takil=auth : belirteç yenileme isteği 25 sn yanıtsız kalır (askıda istek taklidi)
// Oturum: .arayuz-denetim-oturum.json (localStorage yalnız ilk yüklemede yazılır).
// ============================================================
import { chromium, devices } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const ADRES = String(ARG.adres || "https://quiztactics.com").replace(/\/$/, "");
const SAYFA = String(ARG.sayfa || "/joker");
const TEKRAR = Number(ARG.tekrar || 4);
const SINIR_MS = 25000;

const durum = JSON.parse(fs.readFileSync(path.resolve(String(ARG.oturum || ".arayuz-denetim-oturum-yenileme.json")), "utf8"));
const yerel = durum.origins?.[0]?.localStorage ?? [];

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({ ...devices["Pixel 7"] });
await baglam.addInitScript((kayitlar) => {
  if (sessionStorage.getItem("__yenilemeOlcum")) return;
  for (const k of kayitlar) localStorage.setItem(k.name, k.value);
  sessionStorage.setItem("__yenilemeOlcum", "1");
}, yerel);
const s = await baglam.newPage();

if (ARG.ag === "yavas") {
  const cdp = await baglam.newCDPSession(s);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 200000, uploadThroughput: 90000 });
}
if (ARG.takil === "auth") {
  await s.route("**/auth/v1/token**", async (r) => { await new Promise((z) => setTimeout(z, 25000)); await r.continue().catch(() => {}); });
}

const kayit = { konsol: [], basarisiz: [], askida: new Map() };
s.on("console", (m) => { if (["error", "warning"].includes(m.type())) kayit.konsol.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
s.on("pageerror", (e) => kayit.konsol.push(`pageerror: ${e.message.slice(0, 200)}`));
s.on("request", (r) => kayit.askida.set(r, Date.now()));
s.on("requestfinished", (r) => kayit.askida.delete(r));
s.on("requestfailed", (r) => { kayit.askida.delete(r); kayit.basarisiz.push(`${r.failure()?.errorText} ${r.url().slice(0, 120)}`); });

// İçerik geldi = açılış yükleyicisi ve tembel sayfa yükleyicisi yok, sayfada metin var
async function icerikBekle(t0) {
  try {
    await s.waitForFunction(() => !document.querySelector("#qt-ilk-yukleme, .qt-sayfa-yukleniyor")
      && (document.querySelector("#root")?.innerText ?? "").trim().length > 40, null, { timeout: SINIR_MS, polling: 50 });
    return Date.now() - t0;
  } catch {
    return null;
  }
}

function rapor(etiket, ms) {
  const askida = [...kayit.askida.entries()].filter(([, an]) => Date.now() - an > 3000)
    .map(([r, an]) => `${Math.round((Date.now() - an) / 1000)} sn ${r.method()} ${r.url().slice(0, 110)}`);
  console.log(`${ms === null ? "✗" : "✓"} ${etiket}: ${ms === null ? `içerik ${SINIR_MS / 1000} sn'de gelmedi` : `${ms} ms`}`);
  for (const x of kayit.konsol) console.log("   konsol", x);
  for (const x of kayit.basarisiz) console.log("   başarısız", x);
  for (const x of askida) console.log("   askıda", x);
  kayit.konsol = []; kayit.basarisiz = [];
}

let hata = 0;
let t0 = Date.now();
await s.goto(ADRES + SAYFA, { waitUntil: "commit" });
let ms = await icerikBekle(t0);
rapor("ilk açılış", ms);
if (ms === null) hata++;
for (let i = 1; i <= TEKRAR; i++) {
  if (ARG.eski) {
    await s.evaluate(() => {
      const ad = Object.keys(localStorage).find((k) => k.endsWith("-auth-token"));
      const o = JSON.parse(localStorage.getItem(ad));
      o.expires_at = Math.round(Date.now() / 1000) - 120;
      localStorage.setItem(ad, JSON.stringify(o));
    });
  }
  t0 = Date.now();
  await s.reload({ waitUntil: "commit" });
  ms = await icerikBekle(t0);
  rapor(`yenileme ${i}`, ms);
  if (ms === null) {
    hata++;
    console.log("   ekran metni:", JSON.stringify((await s.locator("#root").innerText().catch(() => "")).slice(0, 200)));
  }
}
// Oturum sonunda geçerli mi? (belirteç zinciri kopmadı mı)
const oturum = await s.evaluate(() => {
  const ad = Object.keys(localStorage).find((k) => k.endsWith("-auth-token"));
  const o = ad ? JSON.parse(localStorage.getItem(ad)) : null;
  return o ? { kalanSn: o.expires_at - Math.round(Date.now() / 1000) } : null;
});
console.log("oturum:", JSON.stringify(oturum));
await tarayici.close();
console.log(hata ? `BAŞARISIZ (${hata})` : "GEÇTİ");
process.exit(hata ? 1 : 0);
