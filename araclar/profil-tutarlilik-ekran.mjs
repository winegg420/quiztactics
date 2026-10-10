// Profil tutarlılık turu — önce/sonra tam sayfa görüntüleri: 5 sekme × 360/390 × TR/EN × açık/koyu.
// Sunucuya YAZMAZ. Misafir oturumu (.arayuz-denetim-oturum-*.json) kullanılır; canlı yük en az:
// dil × senaryo başına sayfa BİR kez açılır, genişlik/tema/sekme aynı sayfada değiştirilir (yeniden yükleme yok).
// Senaryolar: "dolu" → profilim / oyuncu_kartlari / oyuncu_kategori_profili yanıtları taklit veriyle zenginleşir
// (vitrin 3 rozet, kupa 2, seri 6, Lv 27 47/130 XP, 242/195 maç); "bos" → misafirin gerçek boş hâli (vitrin yok, kupa 0, seri 0).
// Kullanım: node araclar/profil-tutarlilik-ekran.mjs --etiket=once|sonra [--adres=http://localhost:5173] [--oturum=.arayuz-denetim-oturum.json]
// Çıktı: tasarim/profil-tutarlilik/<etiket>-<senaryo>-<sekme>-<genişlik>-<dil>-<tema>.png ; özet: taşma · hata · ölçüm.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5173").replace(/\/$/, "");
const ETIKET = ARG.etiket || "once";
const CIKTI = path.resolve("tasarim/profil-tutarlilik");
fs.mkdirSync(CIKTI, { recursive: true });
const kayit = JSON.parse(fs.readFileSync(ARG.oturum || ".arayuz-denetim-oturum.json", "utf8"));
const depo = (kayit.origins ?? []).flatMap((o) => o.localStorage ?? []).filter((k) => /auth-token|bd_cihaz_id/.test(k.name));
if (!depo.length) { console.error("Oturumda auth-token yok"); process.exit(1); }

const VITRIN = [
  { anahtar: "galibiyet_altin", grup: "galibiyet", kademe: "altin", ikon: "kupa", ad: "Galibiyet" },
  { anahtar: "seri_gumus", grup: "seri", kademe: "gumus", ikon: "ates", ad: "Seri" },
  { anahtar: "dogru_bronz", grup: "dogru", kademe: "bronz", ikon: "onay", ad: "Doğru" },
];
const KATEGORI = {
  toplam_mac: 242, istatistikli_mac: 195, unvan: "teknoloji", min_ornek: 10,
  kategoriler: [
    { kategori: "teknoloji", toplam: 210, yuzde: 81 }, { kategori: "tarih", toplam: 180, yuzde: 64 },
    { kategori: "bilim", toplam: 150, yuzde: 58 }, { kategori: "cografya", toplam: 120, yuzde: 47 },
    { kategori: "spor", toplam: 90, yuzde: 0 }, { kategori: "sanat", toplam: 6, yuzde: null },
  ],
};
const SEKMELER = ["istatistik", "rozet", "koleksiyon", "davet", "ayarlar"];
const BOYUTLAR = [[360, 640], [390, 844]];
const TEMALAR = ["acik", "koyu"];

async function json(r) { const y = await r.fetch(); return { y, j: await y.json() }; }

const tarayici = await chromium.launch({ channel: "chrome" });
const ozet = [];
try {
  for (const dil of ["tr", "en"]) {
    for (const senaryo of ["dolu", "bos"]) {
      const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
      await baglam.addInitScript(([depo, dil]) => {
        try {
          for (const k of depo) localStorage.setItem(k.name, k.value);
          localStorage.setItem("bildim_dil", dil); localStorage.setItem("bildim_tanitim", "1");
        } catch { /* yut */ }
      }, [depo, dil]);
      let benimId = null;
      await baglam.route("**/rest/v1/rpc/profilim*", async (r) => {
        try {
          const { y, j } = await json(r);
          const p = Array.isArray(j) ? j[0] : j;
          if (p) {
            p.dil = dil; benimId = p.id ?? benimId;
            if (senaryo === "dolu") Object.assign(p, { level: 27, level_xp: 47, level_gereken: 130, sampiyonluk: 2, seri: 6, puan: 1840 });
            else Object.assign(p, { sampiyonluk: 0, seri: 0 });
          }
          await r.fulfill({ response: y, json: j });
        } catch { await r.continue().catch(() => {}); }
      });
      await baglam.route("**/rest/v1/rpc/oyuncu_kartlari*", async (r) => {
        try {
          const { y, j } = await json(r);
          for (const k of Array.isArray(j) ? j : []) {
            if (benimId && k.id !== benimId) continue;
            if (senaryo === "dolu") Object.assign(k, { vitrin: VITRIN, level: 27 }); else k.vitrin = [];
          }
          await r.fulfill({ response: y, json: j });
        } catch { await r.continue().catch(() => {}); }
      });
      if (senaryo === "dolu") {
        await baglam.route("**/rest/v1/rpc/oyuncu_kategori_profili*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(KATEGORI) }));
      }
      const s = await baglam.newPage();
      const hatalar = [];
      s.on("pageerror", (e) => hatalar.push("sayfa: " + String(e).slice(0, 140)));
      s.on("console", (m) => { if (m.type() === "error") hatalar.push("konsol: " + m.text().slice(0, 140)); });
      try {
        await s.goto(ADRES + "/profil", { waitUntil: "load", timeout: 45000 });
        await s.waitForTimeout(5000);
      } catch (e) { hatalar.push("goto: " + e.message.slice(0, 120)); }
      await s.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} .qt-altmenu--sabit{visibility:hidden!important}" }).catch(() => {});   // sabit alt menü tam sayfa görüntüde içeriği örtmesin
      const sekmeler = senaryo === "dolu" ? SEKMELER : ["istatistik", "ayarlar"];
      for (const sekme of sekmeler) {
        try { await s.click(`#profil-sekmeler [role=tab][data-kod=${sekme}]`); await s.waitForTimeout(2200); } catch (e) { hatalar.push("sekme: " + e.message.slice(0, 80)); }
        for (const [g, h] of BOYUTLAR) {
          await s.setViewportSize({ width: g, height: h });
          for (const tema of TEMALAR) {
            await s.evaluate((t) => { document.documentElement.setAttribute("data-tema", t); window.scrollTo(0, 0); }, tema);
            await s.waitForTimeout(250);
            const olcum = await s.evaluate(() => {
              const d = document.documentElement;
              const sek = [...document.querySelectorAll("#profil-sekmeler [role=tab]")];
              const kirpik = sek.filter((e) => [...e.querySelectorAll("span")].some((x) => x.scrollWidth > x.clientWidth + 1)).length;
              return { tasma: d.scrollWidth - d.clientWidth, kirpik };
            }).catch(() => ({ tasma: -1, kirpik: -1 }));
            const dosya = path.join(CIKTI, `${ETIKET}-${senaryo}-${sekme}-${g}-${dil}-${tema}.png`);
            await s.screenshot({ path: dosya, fullPage: true });
            const satir = `${senaryo.padEnd(4)} ${sekme.padEnd(10)} ${g} ${dil} ${tema.padEnd(4)} taşma:${olcum.tasma} sekme-kırpık:${olcum.kirpik}`;
            ozet.push(satir); console.log(satir);
          }
        }
        await s.evaluate(() => document.documentElement.setAttribute("data-tema", "acik"));
        await s.setViewportSize({ width: 390, height: 844 });
      }
      console.log(`  ${dil}/${senaryo} hata:${hatalar.length}${hatalar.length ? " · " + hatalar.join(" | ") : ""}`);
      ozet.push(`hata ${dil}/${senaryo}: ${hatalar.length}`);
      await baglam.close();
    }
  }
} finally {
  await tarayici.close();
}
const sorun = ozet.filter((x) => /taşma:(?!0 )|sekme-kırpık:(?!0$)|hata [a-z/]+: [1-9]/.test(x));
console.log(sorun.length ? `\nSORUN: ${sorun.length}\n${sorun.join("\n")}` : "\nTEMİZ — taşma 0, sekme kırpığı 0, hata 0");
