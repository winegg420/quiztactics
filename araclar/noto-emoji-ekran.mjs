// Tepki görselleri — Chromium mobil ölçümü. Sunucuya yazmaz.
// Kullanım: npm run dev -- --port 5187 (başka kabukta)
//          node araclar/noto-emoji-ekran.mjs --adres=http://localhost:5187
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const ADRES = ARG.adres || "http://localhost:5187";
const CIKTI = path.resolve("tasarim/noto-emoji");
fs.mkdirSync(CIKTI, { recursive: true });

const tepkiDosyalari = fs.readdirSync(path.resolve("public/kozmetik/tepki"))
  .filter((ad) => /\.(png|webp)$/.test(ad));
const toplamBayt = tepkiDosyalari.reduce((n, ad) => n + fs.statSync(path.resolve("public/kozmetik/tepki", ad)).size, 0);
const matchKaynak = fs.readFileSync(path.resolve("oyun/pages/MatchPage.jsx"), "utf8");
const grupKaynak = fs.readFileSync(path.resolve("oyun/pages/GroupMatchPage.jsx"), "utf8");
const yeniKaynak = fs.readFileSync(path.resolve("oyun/components/Tepki.jsx"), "utf8");

let gecti = 0;
let kaldi = 0;
const ok = (ad, kosul, ek = "") => {
  if (kosul) { gecti++; console.log("  ✓", ad); }
  else { kaldi++; console.log("  ✗", ad, ek); }
};

ok("tepki varlıklarının toplamı 200 KB altında", toplamBayt < 200 * 1024, `${toplamBayt} bayt`);
ok("Klasik gönderim değeri değişmedi", (matchKaynak.match(/mesajGonder\(t\.deger\)/g) ?? []).length >= 2);
ok("Grup gönderim değeri değişmedi", /mesajGonder\(t\.deger\)/.test(grupKaynak));
ok("yeni tepki anahtarı değişmeden gönderiliyor", /tepki\.gonder\(k\)/.test(yeniKaynak));

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const sonuc = { toplamBayt, dosyaSayisi: tepkiDosyalari.length, ekranlar: {} };
for (const dil of ["tr", "en"]) {
  for (const [width, height] of [[360, 640], [390, 844]]) {
    const baglam = await tarayici.newContext({ viewport: { width, height }, hasTouch: true, serviceWorkers: "block" });
    const sayfa = await baglam.newPage();
    const konsol = [];
    const ag = [];
    sayfa.on("console", (m) => { if (m.type() === "error") konsol.push(m.text()); });
    sayfa.on("pageerror", (e) => konsol.push(String(e)));
    sayfa.on("requestfailed", (r) => ag.push(`${r.url()} · ${r.failure()?.errorText ?? "hata"}`));
    await sayfa.addInitScript((d) => {
      localStorage.setItem("bildim_dil", d);
      localStorage.setItem("bildim_tanitim", "1");
    }, dil);
    await sayfa.goto(ADRES, { waitUntil: "load", timeout: 30000 });
    // İlk Vite derlemesi ve uygulama kabuğu tamamen yerleşsin; gövdeyi test
    // sahnesiyle değiştirdikten sonra geç kalan React başlangıcı çalışmasın.
    await sayfa.waitForSelector("#root", { timeout: 10000 });
    await sayfa.waitForTimeout(2500);
    konsol.length = 0;
    ag.length = 0;

    const veri = await sayfa.evaluate(async ({ dil }) => {
      const [{ TEPKILER }, { TEPKI_TANIMLARI, tepkiGorseli }] = await Promise.all([
        import("/oyun/lib/tepkiler.js"),
        import("/oyun/lib/kozmetik.js"),
      ]);
      const baslik = dil === "en" ? "Reaction picker" : "Tepki seçici";
      const balon = dil === "en" ? "Reaction bubbles" : "Tepki balonları";
      const paket = dil === "en" ? "Reaction list" : "Tepki listesi";
      document.body.innerHTML = `
        <main class="noto-test">
          <h1>${baslik}</h1>
          <section class="noto-kart"><h2>Klasik · Grup</h2><div class="m1-tepki noto-eski" role="group"></div></section>
          <section class="noto-kart"><h2>${paket}</h2><div class="qt-tepki-panel noto-yeni" role="group"></div></section>
          <section class="noto-kart"><h2>${balon}</h2><div class="noto-balonlar"></div></section>
          <output class="noto-cikti" aria-live="polite"></output>
        </main>`;
      const stil = document.createElement("style");
      stil.textContent = `
        body{margin:0;background:#f4f5fb}.noto-test{box-sizing:border-box;min-height:100vh;padding:18px 14px;display:grid;align-content:start;gap:14px;font-family:Nunito,system-ui,sans-serif;color:#1d2152}
        .noto-test h1{font-size:24px;margin:0}.noto-test h2{font-size:15px;margin:0 0 10px}.noto-kart{box-sizing:border-box;width:100%;padding:14px;border:2px solid #d9dbea;border-radius:18px;background:#fff}
        .noto-eski{justify-content:flex-start}.noto-yeni{justify-content:flex-start}.noto-balonlar{display:flex;align-items:center;justify-content:space-around;min-height:72px}
        .noto-avatar{position:relative;display:grid;place-items:center;width:52px;height:52px;border-radius:50%;background:#e8eaf4;font-weight:900}.noto-avatar .qt-tepki-balon{animation:none;opacity:1}
        .qt-noto-emoji{display:block;object-fit:contain}.noto-cikti{font-size:12px;color:#575b78}
      `;
      document.head.append(stil);
      const eski = document.querySelector(".noto-eski");
      window.__giden = [];
      for (const t of TEPKILER) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "qt-ikon-dugme qt-ikon-dugme--yuzey qt-ikon-dugme--o";
        b.setAttribute("aria-label", t.etiket);
        b.innerHTML = `<img class="qt-noto-emoji" src="${t.ad.slice(5)}" alt="" width="22" height="22" loading="eager" decoding="async">`;
        b.addEventListener("click", () => window.__giden.push(t.deger));
        eski.append(b);
      }
      const yeni = document.querySelector(".noto-yeni");
      for (const [k, t] of Object.entries(TEPKI_TANIMLARI)) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "qt-tepki-sec";
        b.setAttribute("aria-label", t.ad);
        b.innerHTML = `<img src="${tepkiGorseli(k)}" alt="" width="32" height="32" loading="eager" decoding="async">`;
        b.addEventListener("click", () => window.__giden.push(k));
        yeni.append(b);
      }
      document.querySelector(".noto-balonlar").innerHTML = `
        <span class="noto-avatar">A<span class="qt-tepki-balon qt-tepki-balon--sen" role="img" aria-label="${TEPKILER[0].etiket}"><img src="${TEPKILER[0].ad.slice(5)}" alt="" width="30" height="30"></span></span>
        <span class="noto-avatar">B<span class="qt-tepki-balon qt-tepki-balon--rakip" role="img" aria-label="${TEPKI_TANIMLARI.korku.ad}"><img src="${tepkiGorseli("korku")}" alt="" width="30" height="30"></span></span>`;
      for (const b of document.querySelectorAll("button")) b.click();
      document.querySelector(".noto-cikti").textContent = `${window.__giden.length} ${dil === "en" ? "unchanged values sent" : "değişmeyen değer gönderildi"}`;
      await Promise.all([...document.images].map((img) => img.complete && img.naturalWidth ? null : new Promise((resolve) => { img.addEventListener("load", resolve, { once: true }); img.addEventListener("error", resolve, { once: true }); })));
      return {
        eskiDegerler: TEPKILER.map((t) => t.deger),
        yeniDegerler: Object.keys(TEPKI_TANIMLARI),
        giden: window.__giden,
      };
    }, { dil });

    const olcum = await sayfa.evaluate(() => ({
      yatayTasma: document.documentElement.scrollWidth - innerWidth,
      bozukGorsel: [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src),
      sabitOlmayan: [...document.images].filter((img) => !img.getAttribute("width") || !img.getAttribute("height")).length,
      kucukHedef: [...document.querySelectorAll("button")].filter((b) => { const r = b.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length,
      ariaEksik: [...document.querySelectorAll("button, [role=img]")].filter((e) => !e.getAttribute("aria-label")).length,
    }));
    const etiket = `${width}x${height}-${dil}`;
    sonuc.ekranlar[etiket] = { ...olcum, konsol, ag, eskiDegerler: veri.eskiDegerler, yeniDegerler: veri.yeniDegerler };
    ok(`${etiket}: 18 tepki görseli yüklendi`, olcum.bozukGorsel.length === 0 && await sayfa.locator("img").count() === 20, JSON.stringify(olcum.bozukGorsel));
    ok(`${etiket}: yatay taşma yok`, olcum.yatayTasma <= 0, String(olcum.yatayTasma));
    ok(`${etiket}: sabit görsel ölçüsü ve 44 px dokunma alanı`, olcum.sabitOlmayan === 0 && olcum.kucukHedef === 0, JSON.stringify(olcum));
    ok(`${etiket}: erişilebilir ad eksik değil`, olcum.ariaEksik === 0, String(olcum.ariaEksik));
    ok(`${etiket}: gönderilen 6 Unicode + 12 anahtar aynı`, JSON.stringify(veri.giden) === JSON.stringify([...veri.eskiDegerler, ...veri.yeniDegerler]));
    ok(`${etiket}: konsol ve ağ hatası yok`, konsol.length === 0 && ag.length === 0, JSON.stringify({ konsol, ag }));
    await sayfa.screenshot({ path: path.join(CIKTI, `tepki-${etiket}.png`), fullPage: true });
    await baglam.close();
  }
}
await tarayici.close();
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(sonuc, null, 2) + "\n");
console.log(`\n${gecti}/${gecti + kaldi} kontrol geçti. Varlık toplamı: ${toplamBayt} bayt.`);
if (kaldi) process.exitCode = 1;
