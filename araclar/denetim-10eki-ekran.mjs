// 10 Eki 2026 canlı denetim (ChatGPT) düzeltmeleri — önce/sonra ekran ölçümü, 390 px, TR + EN.
// Sunucuya YAZMAZ: profil dili ve "takma ad seçilmedi" durumu yalnız tarayıcıda taklit edilir (profilim yanıtı değiştirilir).
// "önce" = canlı site (eski kod), "sonra" = yerel dev. Aynı misafir oturumu (.arayuz-denetim-oturum.json) iki adrese de yazılır.
// Kullanım: npm run dev (başka kabukta) · node araclar/denetim-10eki-ekran.mjs --etiket=once --adres=https://quiztactics.com
//           node araclar/denetim-10eki-ekran.mjs --etiket=sonra --adres=http://localhost:5173
// Çıktı: tasarim/denetim-10-eki/<etiket>-*.png ve olcum-<etiket>.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5173").replace(/\/$/, "");
const ETIKET = ARG.etiket || "sonra";
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/denetim-10-eki");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok — önce: node araclar/arayuz-denetim.mjs"); process.exit(1); }

// Oturumun localStorage'ı (hangi kökene yazılmış olursa olsun) hedef adrese taşınır
const kayit = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const depo = (kayit.origins ?? []).flatMap((o) => o.localStorage ?? []).filter((k) => /auth-token|bd_cihaz_id/.test(k.name));
if (!depo.length) { console.error("Oturumda auth-token yok"); process.exit(1); }

const sonuc = {};
const bekle = (s, ms) => s.waitForTimeout(ms);

async function sayfaAc(baglam, dil, { kurulumsuz = false } = {}) {
  const s = await baglam.newPage();
  const hatalar = [];
  s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => hatalar.push("pageerror: " + String(e).slice(0, 200)));
  await s.addInitScript(([depo, dil]) => {
    try {
      for (const k of depo) localStorage.setItem(k.name, k.value);
      localStorage.setItem("bildim_dil", dil);
      localStorage.setItem("bildim_tanitim", "1");
      localStorage.removeItem("qt_profil_onbellek");
    } catch { /* yut */ }
  }, [depo, dil]);
  // Profil dili + (istenirse) kurulum eksik: yalnız yanıt değiştirilir, sunucuya yazılmaz
  await s.route("**/rest/v1/rpc/profilim*", async (r) => {
    try {
      const y = await r.fetch();
      const j = await y.json();
      const p = Array.isArray(j) ? j[0] : j;
      if (p) { p.dil = dil; if (kurulumsuz) { p.takma_ad_secildi = false; p.gorunen_ad = "Oyuncu"; } }
      await r.fulfill({ response: y, json: j });
    } catch { await r.continue().catch(() => {}); }
  });
  return { s, hatalar };
}

async function git(s, yol, ms = 3500) {
  await s.goto(ADRES + yol, { waitUntil: "domcontentloaded" });
  await bekle(s, ms);
}

const kare = (s, ad) => s.screenshot({ path: path.join(CIKTI, `${ETIKET}-${ad}.png`) });
const metin = (s) => s.evaluate(() => document.body.innerText);

(async () => {
  const tarayici = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const dil of ["tr", "en"]) {
      const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
      const { s, hatalar } = await sayfaAc(baglam, dil);
      const o = (sonuc[dil] = {});

      if (ARG.yalniz === "kosullar") {   // yalnız Koşullar karesi (--yalniz=kosullar)
        await git(s, "/kosullar", 2500);
        await s.getByRole("heading", { name: /2. (Hesap|Account)/ }).first().evaluate((e) => { e.scrollIntoView({ block: "start" }); window.scrollBy(0, -90); }).catch(() => {});
        await bekle(s, 300);
        o.kosullar_misafir = /misafir olarak da oynayabilirsin|play as a guest/i.test(await metin(s));
        await kare(s, `kosullar-390-${dil}`);
        await baglam.close();
        console.log(dil, JSON.stringify(o));
        continue;
      }
      // 1) Profil: ad + kart taşması
      await git(s, "/profil");
      o.profil_ad = await s.locator(".qt-pf-ok .qt-ok-ad, .qt-ok-ad").first().innerText().catch(() => null);
      o.profil_baslik = await s.title();
      o.canonical = await s.evaluate(() => document.querySelector('link[rel="canonical"]')?.href ?? null);
      await kare(s, `profil-390-${dil}`);

      // 2) Oyuncu kartı penceresi: ana sayfadaki ilk "kartını aç" düğmesi; pencerede yatay taşma ölçümü
      await git(s, "/");
      o.ana_ad = await s.locator(".a-ana-oyuncu-ad").first().innerText().catch(() => null);
      const kartDugme = s.getByRole("button", { name: /kartını aç|open (their|the|your)? ?card|card/i }).first();
      if (await kartDugme.count()) {
        await kartDugme.click().catch(() => {});
        await bekle(s, 2500);
        o.kart_tasma = await s.evaluate(() => {
          const kok = document.querySelector('[role="dialog"]');
          if (!kok) return { pencere: false };
          const tasan = [];
          for (const e of [kok, ...kok.querySelectorAll("*")]) {
            const st = getComputedStyle(e);
            if (/(auto|scroll)/.test(st.overflowX) && e.scrollWidth > e.clientWidth) {
              const sinir = e.getBoundingClientRect().right;
              const suclu = [...e.querySelectorAll("*")].filter((c) => c.getBoundingClientRect().right > sinir + 0.5)
                .map((c) => `${c.tagName.toLowerCase()}.${[...c.classList].join(".")} sağ=${Math.round(c.getBoundingClientRect().right)}`).slice(0, 6);
              tasan.push({ oge: `${e.tagName.toLowerCase()}.${[...e.classList].join(".")}`, ic: e.clientWidth, kaydir: e.scrollWidth, suclu });
            }
          }
          return { pencere: true, tasan };
        });
        await kare(s, `oyuncu-karti-390-${dil}`);
        await s.keyboard.press("Escape").catch(() => {});
      } else o.kart_tasma = { pencere: false, not: "kart düğmesi bulunamadı" };

      // 3) Görevler: gizli coin birimi
      await git(s, "/gorevler", 4500);
      o.gorev_odul = await s.locator(".gv-odul").evaluateAll((l) => l.slice(0, 3).map((e) => e.textContent.trim())).catch(() => []);
      o.gorevler_baslik = await s.title();

      // 4) Sezon Yolu: joker adı
      await git(s, "/sezon-yolu", 4500);
      const sy = await metin(s);
      o.sezon_swap = /Swap Question/.test(sy); o.sezon_change = /Change Question/.test(sy);

      // 5) Koşullar + Gizlilik
      await git(s, "/kosullar", 2500);
      await s.getByRole("heading", { name: /2\. (Hesap|Account)/ }).first().scrollIntoViewIfNeeded().catch(() => {});
      o.kosullar_misafir = /misafir olarak da oynayabilirsin|play as a guest/i.test(await metin(s));
      o.kosullar_baslik = await s.title();
      await kare(s, `kosullar-390-${dil}`);
      await git(s, "/gizlilik", 2500);
      const gz = await metin(s);
      o.gizlilik_yarim = /You can also\s*\S+@/.test(gz) || /You can also\s*$/m.test(gz);
      o.gizlilik_diamond = /diamonds/i.test(gz);

      // 6) Turnuva yardım penceresi
      await git(s, "/turnuva", 4000);
      const yardim = s.getByRole("button", { name: /nasıl işler|how does the tournament work|kurallar|rules/i }).first();
      if (await yardim.count()) {
        await yardim.click().catch(() => {});
        await bekle(s, 1200);
        o.turnuva_yardim = (await s.locator('[role="dialog"]').first().innerText().catch(() => "")).slice(0, 400);
        await kare(s, `turnuva-yardim-390-${dil}`);
        await s.keyboard.press("Escape").catch(() => {});
      }

      // 7) Meydan › Grup maçı kurulum paneli: bot adları
      await git(s, "/meydan?bolum=grup", 4500);
      const govde = s.locator("#a-meydan-grup-govde");
      await govde.scrollIntoViewIfNeeded().catch(() => {});
      await bekle(s, 600);
      const md = await govde.innerText().catch(() => "");
      o.meydan_grup_panel = Boolean(md);
      o.meydan_tr_bot = /ÇaylakBot|ÜstatBot|EfsaneBot/.test(md);
      o.meydan_en_bot = /RookieBot|MasterBot|LegendBot/.test(md);
      await kare(s, `meydan-grup-390-${dil}`);

      // 8) Koleksiyon dükkân bağlantıları
      await git(s, "/profil?sekme=koleksiyon", 3500);
      o.koleksiyon_linkler = [...new Set(await s.locator('a[href*="/joker?sekme="]').evaluateAll((l) => l.map((a) => a.getAttribute("href"))))];

      // 9) Başlıklar (yalnız ölç)
      o.basliklar = {};
      for (const yol of ["/siralama", "/joker", "/arkadaslar"]) { await git(s, yol, 1500); o.basliklar[yol] = await s.title(); }
      o.konsol = hatalar;
      await baglam.close();

      // 10) 404 — kurulum eksik misafir (taklit): takma ad penceresi çıkmamalı
      const b2 = await tarayici.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
      const { s: s2, hatalar: h2 } = await sayfaAc(b2, dil, { kurulumsuz: true });
      await git(s2, "/olmayan-sayfa", 4500);
      o.bulunamadi_pencere = await s2.locator(".bd-modal-katman, .bd-tanitim-katman").count();
      o.bulunamadi_metin = (await metin(s2)).slice(0, 120).replace(/\n/g, " | ");
      await kare(s2, `bulunamadi-390-${dil}`);
      await git(s2, "/siralama", 3000);   // başka sayfada pencere yine çıkmalı (davranış aynı)
      o.lig_kurulum_pencere = await s2.locator(".bd-modal-katman, .bd-tanitim-katman").count();
      o.konsol_404 = h2;
      await b2.close();
      console.log(dil, JSON.stringify(o, null, 1));
    }
  } finally {
    await tarayici.close();
  }
  if (!ARG.yalniz) fs.writeFileSync(path.join(CIKTI, `olcum-${ETIKET}.json`), JSON.stringify(sonuc, null, 2));
})();
