// Profil tutarlılık turu 2 — İstatistik sekmesi alt yarısı (Seri ve jokerler, birleşik Kategori başarın, Sıradaki ödül).
// Önce/sonra tam sayfa: 360/390 × TR/EN × 3 taklit senaryo. Sunucuya YAZMAZ; misafir oturumu (.arayuz-denetim-oturum.json).
// Senaryolar (yanıtlar page.route ile değiştirilir):
//   bos → hiç maç yok (kategori profili 0 maç, ustalık hepsi 0, seri 0, envanter 0)
//   bir → tek kategoride veri (Tarih: 40 doğru, Çırak, %62)
//   on  → 10 kategori; Teknoloji Usta, Tarih "299 doğru · Usta için 1 kaldı", Üstat ve Efsane de var
// Dil × senaryo başına sayfa BİR kez açılır; genişlik aynı sayfada değişir (canlı yük en az).
// Kullanım: node araclar/profil-tutarlilik-2-ekran.mjs --etiket=once|sonra [--adres=http://localhost:5173]
// Çıktı: tasarim/profil-tutarlilik-2/<etiket>-<senaryo>-<genişlik>-<dil>.png
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5173").replace(/\/$/, "");
const ETIKET = ARG.etiket || "once";
const CIKTI = path.resolve("tasarim/profil-tutarlilik-2");
fs.mkdirSync(CIKTI, { recursive: true });
// Oturum her bağlamdan sonra geri yazılır: Supabase yenileme belirteci tek kullanımlık, eski kopya ikinci bağlamda 400 alır.
const OTURUM = ARG.oturum || ".arayuz-denetim-oturum.json";
let kayit = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const depoOku = () => (kayit.origins ?? []).flatMap((o) => o.localStorage ?? []).filter((k) => /auth-token|bd_cihaz_id/.test(k.name));
let depo = depoOku();
if (!depo.length) { console.error("Oturumda auth-token yok"); process.exit(1); }

const KATLAR = ["teknoloji", "tarih", "bilim", "cografya", "genel_kultur", "spor", "sanat", "edebiyat", "muzik", "sinema"];
const ESIK = [["Çırak", 25], ["Kalfa", 100], ["Usta", 300], ["Üstat", 750], ["Efsane", 2000]];
function ustalik(kategori, adet) {
  const sev = [...ESIK].reverse().find(([, e]) => adet >= e)?.[0] ?? null;
  const son = ESIK.find(([, e]) => e > adet);
  return { kategori, dogru_sayisi: adet, seviye: sev, sonraki_seviye: son?.[0] ?? null, sonraki_esik: son?.[1] ?? null, ilerleme: son ? Math.floor((100 * adet) / son[1]) : 100 };
}
const ADET_ON = { teknoloji: 420, tarih: 299, bilim: 180, cografya: 96, genel_kultur: 64, spor: 30, sanat: 12, edebiyat: 2100, muzik: 760, sinema: 0 };
const YUZDE_ON = { teknoloji: 81, tarih: 64, bilim: 58, cografya: 47, genel_kultur: 52, spor: 0, sanat: null, edebiyat: 77, muzik: 69, sinema: null };
const SENARYO = {
  bos: {
    kat: { toplam_mac: 0, istatistikli_mac: 0, unvan: null, min_ornek: 10, kategoriler: [] },
    ust: KATLAR.map((k) => ustalik(k, 0)),
    seri: { seri_gun: 0, seri_en_uzun: 0 },
    env: [],
  },
  bir: {
    kat: { toplam_mac: 6, istatistikli_mac: 6, unvan: null, min_ornek: 10, kategoriler: [{ kategori: "tarih", toplam: 60, yuzde: 62 }] },
    ust: [ustalik("tarih", 40), ...KATLAR.filter((k) => k !== "tarih").map((k) => ustalik(k, 0))],
    seri: { seri_gun: 1, seri_en_uzun: 3 },
    env: [{ tur: "elli", adet: 2 }, { tur: "sure", adet: 1 }],
  },
  on: {
    kat: { toplam_mac: 242, istatistikli_mac: 199, unvan: "teknoloji", min_ornek: 10, kategoriler: KATLAR.map((k) => ({ kategori: k, toplam: 100, yuzde: YUZDE_ON[k] })) },
    ust: KATLAR.map((k) => ustalik(k, ADET_ON[k])).sort((a, b) => b.dogru_sayisi - a.dogru_sayisi),
    seri: { seri_gun: 6, seri_en_uzun: 14 },
    env: [{ tur: "elli", adet: 19 }, { tur: "sure", adet: 4 }, { tur: "soru_degistir", adet: 2 }, { tur: "zaman_baskisi", adet: 0 },
      { tur: "sigorta", adet: 7 }, { tur: "cifte_puan", adet: 1 }, { tur: "ikinci_sans", adet: 3 }, { tur: "baskin", adet: 0 }, { tur: "kalkan", adet: 5 }],
  },
};
const json = (r, v) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(v) });

const tarayici = await chromium.launch({ channel: "chrome" });
const ozet = [];
try {
  for (const dil of ["tr", "en"]) {
    for (const [ad, v] of Object.entries(SENARYO)) {
      const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
      await baglam.addInitScript(([depo, dil]) => {
        try { for (const k of depo) localStorage.setItem(k.name, k.value); localStorage.setItem("bildim_dil", dil); localStorage.setItem("bildim_tanitim", "1"); } catch { /* yut */ }
      }, [depo, dil]);
      await baglam.route("**/rest/v1/rpc/profilim*", async (r) => {
        try {
          const y = await r.fetch(); const j = await y.json(); const p = Array.isArray(j) ? j[0] : j;
          if (p) Object.assign(p, { dil, level: 27, level_xp: 47, level_gereken: 130, seri: v.seri.seri_gun, sampiyonluk: ad === "on" ? 2 : 0 });
          await r.fulfill({ response: y, json: j });
        } catch { await r.continue().catch(() => {}); }
      });
      await baglam.route("**/rest/v1/rpc/oyuncu_kategori_profili*", (r) => json(r, v.kat));
      await baglam.route("**/rest/v1/rpc/ustalik_seviyelerim*", (r) => json(r, v.ust));
      await baglam.route("**/rest/v1/rpc/seri_durumum*", (r) => json(r, [v.seri]));
      await baglam.route("**/rest/v1/rpc/envanterim*", (r) => json(r, v.env));
      const s = await baglam.newPage();
      const hatalar = [];
      s.on("pageerror", (e) => hatalar.push("sayfa: " + String(e).slice(0, 140)));
      s.on("console", (m) => { if (m.type() === "error") hatalar.push("konsol: " + m.text().slice(0, 140)); });
      try { await s.goto(ADRES + "/profil?sekme=istatistik", { waitUntil: "load", timeout: 45000 }); await s.waitForSelector("#profil-sekmeler", { timeout: 40000 }); await s.waitForTimeout(5000); } catch (e) { hatalar.push("goto: " + e.message.slice(0, 120)); }
      await s.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important} .qt-altmenu--sabit{visibility:hidden!important}" }).catch(() => {});
      for (const [g, h] of [[360, 640], [390, 844]]) {
        await s.setViewportSize({ width: g, height: h });
        await s.evaluate(() => window.scrollTo(0, 0)); await s.waitForTimeout(300);
        const tasma = await s.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth).catch(() => -1);
        await s.screenshot({ path: path.join(CIKTI, `${ETIKET}-${ad}-${g}-${dil}.png`), fullPage: true });
        const satir = `${ad.padEnd(4)} ${g} ${dil} taşma:${tasma}`; ozet.push(satir); console.log(satir);
      }
      ozet.push(`hata ${dil}/${ad}: ${hatalar.length}`); console.log(`  hata:${hatalar.length}${hatalar.length ? " · " + hatalar.join(" | ") : ""}`);
      try {
        const st = await baglam.storageState();
        if (st.origins?.some((o) => (o.localStorage ?? []).some((k) => /auth-token/.test(k.name)))) {
          kayit = st; fs.writeFileSync(OTURUM, JSON.stringify(st)); depo = depoOku();
        }
      } catch (e) { console.warn("oturum yazılamadı:", e.message); }
      await baglam.close();
    }
  }
} finally { await tarayici.close(); }
const sorun = ozet.filter((x) => /taşma:(?!0$)|hata [a-z/]+: [1-9]/.test(x));
console.log(sorun.length ? `\nSORUN: ${sorun.length}\n${sorun.join("\n")}` : "\nTEMİZ — taşma 0, hata 0");
