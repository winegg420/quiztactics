// Süre ölçümü İZCİSİ — mevcut TAKLİT VERİLİ ekran araçlarına (sunucuya yazmayan) önyükleme olarak takılır:
//   node --import ./araclar/sure-olcum-izci.mjs araclar/kasa-efekt-ekran.mjs --en=390
// playwright-core chromium.launch'u sarar: her bağlama (1) her karede hedef seçicilerin DOM'da kalma aralığını ölçen
// betik, (2) ekran kaydı (tasarim/sure-olcum/video/) ekler; aracın ekran görüntüleri tasarim/sure-olcum/ss/ altına yönlenir
// (aracın kendi tasarim/<ad>/ klasörüne dokunulmaz). Ölçümler SURE_OLCUM_CIKTI (vars. tasarim/sure-olcum/olcum-<etiket>.json).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

// Araçların ortak oturum dosyası (.arayuz-denetim-oturum.json) yerine SURE_OLCUM_OTURUM okunur (ortak dosyaya dokunulmaz).
if (process.env.SURE_OLCUM_OTURUM) {
  const yonlen = (p) => (typeof p === "string" && p.endsWith(".arayuz-denetim-oturum.json") ? path.resolve(process.env.SURE_OLCUM_OTURUM) : p);
  const asilOku = fs.readFileSync, asilVar = fs.existsSync;
  fs.readFileSync = (p, ...a) => asilOku(yonlen(p), ...a);
  fs.existsSync = (p) => asilVar(yonlen(p));
}
const ETIKET =process.env.SURE_OLCUM_ETIKET || "olcum";
const KOK = path.resolve("tasarim/sure-olcum");
const CIKTI = process.env.SURE_OLCUM_CIKTI || path.join(KOK, `olcum-${ETIKET}.json`);
const VIDEO = path.join(KOK, "video", ETIKET);
const SS = path.join(KOK, "ss", ETIKET);
fs.mkdirSync(VIDEO, { recursive: true });
fs.mkdirSync(SS, { recursive: true });

// Seçici → ölçüm adı (DOM'da göründüğü süre)
export const HEDEFLER = {
  ".ks-giris-an": "kasa · giriş sahnesi (sandık + 3-2-1)",
  ".ks-ac-an": "kasa · AÇ anı",
  ".ks-carpan-etiket": "kasa · DEVAM çarpanı (×2)",
  ".ks-ucan": "kasa · sonuç altın uçuşu (parça)",
  ".ks-final--kazandi": "kasa · maç sonu kazanan sahnesi",
  ".ks-final--kaybetti": "kasa · maç sonu kaybeden sahnesi",
  ".ks-cifte": "kasa · ÇİFTE bandı",
  ".ks-savunma-an": "kasa · Savunma Hakkı anı",
  ".ks-rk--kapali": "kasa · rakip kararı kapalı kart",
  ".ks-rk--acik": "kasa · rakip kararı vuruş (DEVAM ETTİ / AÇTI)",
  ".ks-devam-an": "kasa · DEVAM ödülü bandı",
  ".ks-rakip-joker-an": "kasa · rakip joker anı",
  ".hk-banan--giris": "düello · ban sırası girişi",
  ".hk-banan--acik": "düello · ban açıklaması (saldıran)",
  ".hk-banan--onay": "düello · BANLADIN onayı",
  ".hk-banan--bilgi": "düello · BAN KULLANILMADI",
  ".hk-bansira": "düello · SIRA SENDE şeridi",
  ".dsc-basla": "düello · HÂKİMİYET BAŞLIYOR",
  ".dsc-konsol--oto": "düello · otomatik seçim uyarısı",
  ".hk-calma": "düello · kategori çalma anı",
  ".hk-vurus": "düello · puan vuruşu",
  ".d4-acilis": "düello v4 · saldırı sorusu açılış paneli",
  ".d4-sahne--sarsinti": "düello v4 · kontrol el değişti sarsıntısı",
  ".m1-sayim, .d4-giris": "düello · giriş 3-2-1",
};

const kayitlar = [];
function yaz() {
  try { fs.writeFileSync(CIKTI, JSON.stringify({ etiket: ETIKET, kayitlar }, null, 1)); } catch { /* ölçüm yan iş */ }
}
process.on("exit", yaz);

const izciBetigi = (hedefler) => {
  const acik = new Map();
  const bildir = (sec, bas, son, kesik) => { try { window.__sureBildir?.({ sec, sure: Math.round(son - bas), kesik, yol: location.pathname }); } catch { /* yok */ } };
  const tur = () => {
    const t = performance.now();
    for (const sec of hedefler) {
      const var_ = Boolean(document.querySelector(sec));
      if (var_ && !acik.has(sec)) acik.set(sec, t);
      else if (!var_ && acik.has(sec)) { bildir(sec, acik.get(sec), t, false); acik.delete(sec); }
    }
    requestAnimationFrame(tur);
  };
  requestAnimationFrame(tur);
  window.addEventListener("pagehide", () => { const t = performance.now(); acik.forEach((b, sec) => bildir(sec, b, t, true)); acik.clear(); });
};

const asilLaunch = chromium.launch.bind(chromium);
chromium.launch = async (...a) => {
  const tarayici = await asilLaunch(...a);
  const asilBaglam = tarayici.newContext.bind(tarayici);
  tarayici.newContext = async (opt = {}) => {
    const b = await asilBaglam({ ...opt, recordVideo: { dir: VIDEO, size: opt.viewport ?? { width: 390, height: 844 } } });
    await b.exposeBinding("__sureBildir", (_k, v) => { kayitlar.push({ ...v, ad: HEDEFLER[v.sec] ?? v.sec }); if (kayitlar.length % 10 === 0) yaz(); });
    await b.addInitScript(izciBetigi, Object.keys(HEDEFLER));
    // SURE_OLCUM_AYAR='{"kasa_cifte":2500}' → oyun bu tarayıcıda /sure-ayar seçimiyle açılır (değişikliğin etkisini ölçmek için)
    if (process.env.SURE_OLCUM_AYAR) await b.addInitScript((v) => { try { localStorage.setItem("qt-sure-ayar-v1", v); } catch { /* yok */ } }, process.env.SURE_OLCUM_AYAR);
    b.on("page", (s) => {
      const asilSs = s.screenshot.bind(s);
      s.screenshot = (o = {}) => asilSs({ ...o, path: o.path ? path.join(SS, path.basename(o.path)) : undefined });
    });
    return b;
  };
  return tarayici;
};
