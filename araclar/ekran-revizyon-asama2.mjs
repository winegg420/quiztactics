// Ekran revizyonu Aşama 2 — önce/sonra görüntüleri (360×640 · 390×844 × TR/EN).
// Sunucuya YAZMAZ; misafir oturumu (.arayuz-denetim-oturum.json, arayuz-denetim açar) kullanılır. Her ekran BİR kez açılır.
// Hatalarım "dolu" hâli taklit veriyle: yanlis_bankam yanıtı page.route ile değiştirilir (canlı veriye dokunmaz).
// Kullanım: node araclar/ekran-revizyon-asama2.mjs --etiket=once|sonra [--adres=http://localhost:5173] [--yalniz=calisma-dolu,profil]
// Çıktı: tasarim/ekran-revizyon/asama2/<etiket>-<ekran>-<genişlik>-<dil>.png ; özet satırı: yatay taşma · sayfa hatası · konsol hatası.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5173").replace(/\/$/, "");
const ETIKET = ARG.etiket || "once";
const YALNIZ = ARG.yalniz ? String(ARG.yalniz).split(",") : null;
const CIKTI = path.resolve("tasarim/ekran-revizyon/asama2");
fs.mkdirSync(CIKTI, { recursive: true });
const kayit = JSON.parse(fs.readFileSync(".arayuz-denetim-oturum.json", "utf8"));
const depo = (kayit.origins ?? []).flatMap((o) => o.localStorage ?? []).filter((k) => /auth-token|bd_cihaz_id/.test(k.name));
if (!depo.length) { console.error("Oturumda auth-token yok"); process.exit(1); }

const BANKA_DOLU = [
  { kategori: "tarih", kategori_adet: 9, toplam: 31, ogrenilen: 7, bekleyen: 24 },
  { kategori: "bilim", kategori_adet: 6, toplam: 31, ogrenilen: 7, bekleyen: 24 },
  { kategori: "cografya", kategori_adet: 5, toplam: 31, ogrenilen: 7, bekleyen: 24 },
  { kategori: "spor", kategori_adet: 3, toplam: 31, ogrenilen: 7, bekleyen: 24 },
  { kategori: "sanat", kategori_adet: 1, toplam: 31, ogrenilen: 7, bekleyen: 24 },
];
const BANKA_BOS = [{ kategori: null, kategori_adet: 0, toplam: 0, ogrenilen: 0, bekleyen: 0 }];

// [ad, yol, banka?, eylem?]
const EKRANLAR = [
  ["calisma-dolu", "/calisma", BANKA_DOLU],
  ["calisma-bos", "/calisma", BANKA_BOS],
  ["profil", "/profil"],
  ["profil-ayarlar-tik", "/profil", null, async (s) => { await s.click("#profil-sekmeler [role=tab][data-kod=ayarlar]"); }],
  ["profil-ayarlar", "/profil?sekme=ayarlar"],
  ["profil-davet", "/profil?sekme=davet"],
  ["mesajlar", "/mesajlar"],
  ["arkadaslar", "/arkadaslar"],
  ["lig-arkadas", "/siralama", null, async (s) => { await s.click("[role=tab][data-kod=arkadas]"); }],
  ["bildirimler", "/", null, async (s) => { await s.click("button[aria-label='Bildirimler'], button[aria-label='Notifications']"); }],
  ["404", "/bu-adres-yok-er"],
];
const BOYUTLAR = [[360, 640], [390, 844]];
const DILLER = ["tr", "en"];

const tarayici = await chromium.launch({ channel: "chrome" });
const ozet = [];
try {
  for (const dil of DILLER) {
    for (const [g, h] of BOYUTLAR) {
      const baglam = await tarayici.newContext({ viewport: { width: g, height: h }, reducedMotion: "reduce" });
      await baglam.addInitScript(([depo, dil]) => {
        try {
          for (const k of depo) localStorage.setItem(k.name, k.value);
          localStorage.setItem("bildim_dil", dil); localStorage.setItem("bildim_tanitim", "1");
        } catch { /* yut */ }
      }, [depo, dil]);
      // Profil dili: misafir TR doğar; EN için yalnız yanıt değiştirilir (sunucuya yazılmaz) — yoksa dil düzeltme yeniden yüklemesi döner
      await baglam.route("**/rest/v1/rpc/profilim*", async (r) => {
        try {
          const y = await r.fetch();
          const j = await y.json();
          const p = Array.isArray(j) ? j[0] : j;
          if (p) p.dil = dil;
          await r.fulfill({ response: y, json: j });
        } catch { await r.continue().catch(() => {}); }
      });
      let banka = null;
      await baglam.route("**/rest/v1/rpc/yanlis_bankam*", (r) => (banka
        ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(banka) })
        : r.continue()));
      const s = await baglam.newPage();
      for (const [ad, yol, b, eylem] of EKRANLAR) {
        if (YALNIZ && !YALNIZ.includes(ad)) continue;
        banka = b ?? null;
        const hatalar = [];
        const sayfaHata = (e) => hatalar.push("sayfa: " + String(e).slice(0, 140));
        const konsol = (m) => { if (m.type() === "error") hatalar.push("konsol: " + m.text().slice(0, 140)); };
        s.on("pageerror", sayfaHata); s.on("console", konsol);
        try {
          await s.goto(ADRES + yol, { waitUntil: "load", timeout: 45000 });
          await s.waitForTimeout(3500);
          if (eylem) { await eylem(s); await s.waitForTimeout(1500); }
        } catch (e) { hatalar.push("goto/eylem: " + e.message.slice(0, 120)); }
        await s.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" }).catch(() => {});
        const tasma = await s.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth).catch(() => -1);
        const dosya = path.join(CIKTI, `${ETIKET}-${ad}-${g}-${dil}.png`);
        await s.screenshot({ path: dosya, fullPage: true });
        s.off("pageerror", sayfaHata); s.off("console", konsol);
        const satir = `${ad.padEnd(20)} ${g} ${dil} taşma:${tasma} hata:${hatalar.length}${hatalar.length ? " · " + hatalar.join(" | ") : ""}`;
        ozet.push(satir); console.log(satir);
      }
      await baglam.close();
    }
  }
} finally {
  await tarayici.close();
}
const sorun = ozet.filter((x) => !/taşma:0 hata:0$/.test(x));
console.log(sorun.length ? `\nSORUN: ${sorun.length} ekran` : "\nTEMİZ — taşma 0, hata 0");
