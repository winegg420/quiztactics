// Ortak Hazine lobisi "Rakip ara" İLK TIK ölçümü (11 Eki 2026) — TAKLİT: arama RPC'leri tarayıcıda yakalanır, sunucuya maç/arama yazılmaz.
// Düello'da (10 Eki) düğme Skill seti gelince ~220 px kayıyor, ilk dokunuş boşa düşüyordu. Burada ölçülür:
//   1) düğme ilk göründüğü andan 3 sn sonrasına kadar kaç px kayıyor (100 ms aralık),
//   2) düğme görünür görünmez TEK dokunuş aramayı açıyor mu (kasa_ara çağrısı + arama sahnesi).
// Yavaş ağ taklidi: lobi RPC'leri (kasa_aktif_benim, ayar okuması) 600–1200 ms gecikmeli.
// Kullanım: npm run dev -- --port 5188 · node araclar/kasa-ilk-tik-olcum.mjs --adres=http://localhost:5188
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
let kaldi = 0;
for (const [w, h, yavas] of [[390, 844, false], [390, 844, true], [360, 640, true]]) {
  const b = await tarayici.newContext({ storageState: OTURUM, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block" });
  const s = await b.newPage();
  let araCagri = 0;
  await s.route(/\/rest\/v1\/rpc\//, async (r) => {
    const u = r.request().url();
    if (/\/rpc\/kasa_ara\b/.test(u)) { araCagri++; return r.fulfill({ status: 200, contentType: "application/json", body: "null" }); }
    if (/\/rpc\/kasa_(arama_iptal|aramam|arama_durum)/.test(u)) return r.fulfill({ status: 200, contentType: "application/json", body: "null" });
    if (yavas && /kasa_aktif_benim|skill|dereceli/.test(u)) await bekle(600 + Math.random() * 600);
    try { await r.continue(); } catch { /* */ }
  });
  await s.goto(`${ADRES}/kasa`, { waitUntil: "domcontentloaded" });
  const dugme = s.locator(".ks-giris .m2-giris-eylem .qt-dugme").first();
  await dugme.waitFor({ state: "visible", timeout: 20000 });
  const ilk = await dugme.boundingBox();
  const konumlar = [];
  for (let i = 0; i < 30; i++) { await bekle(100); const k = await dugme.boundingBox(); konumlar.push(Math.round(k.y - ilk.y)); }
  const kayma = Math.max(...konumlar.map(Math.abs));
  // ilk tık: yeni sayfa, düğme görünür görünmez dokun
  await s.goto(`${ADRES}/kasa`, { waitUntil: "domcontentloaded" });
  await dugme.waitFor({ state: "visible", timeout: 20000 });
  await dugme.tap();
  await bekle(1200);
  const aramaAcik = await s.locator(".gh-sahne, .arama-sahnesi, [class*='arama']").count();
  const sonuc = { boyut: `${w}x${h}`, yavas, kayma_px: kayma, kasa_ara: araCagri, arama_ekrani: aramaAcik > 0 };
  console.log(JSON.stringify(sonuc));
  if (kayma > 2 || araCagri < 1) kaldi++;
  await b.close();
}
await tarayici.close();
console.log(kaldi ? `✗ ${kaldi} koşuda ilk tık sorunlu` : "✓ ilk tık her koşuda aramayı açtı, düğme kaymadı");
process.exit(kaldi ? 1 : 0);
