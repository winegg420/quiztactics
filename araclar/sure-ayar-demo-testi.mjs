// /sure-ayar oynatıcı testi (yerel, girişsiz, Supabase istekleri ENGELLİ — canlıya yük yok).
// Her sahne: "Oynat" → telefon çerçevesinde başlangıç/orta/son ekran görüntüsü + sahne öğesinin ekranda kaldığı süre (rAF).
// Kaydırıcı: 3 sahnede oynatıcıdaki kaydırıcı en kısa / en uzun → ölçülen süre değişiyor mu. 390 px taşma + 44 px hedef.
// Kullanım: npx vite --port 5188 (başka kabukta) · node araclar/sure-ayar-demo-testi.mjs [--adres=http://localhost:5188] [--yol=/sure-ayar]
// /sure-ayar girişli kabuktadır; girişsiz koşu için geçici kabuk (SureAyarPage'i BrowserRouter + AuthProvider içinde çizen
// _sa-kabuk/index.html, commit edilmez) açılıp --yol=/_sa-kabuk/index.html verilir (Git Bash: MSYS_NO_PATHCONV=1).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const CIKTI = path.resolve("tasarim/sure-ayar-demo");
fs.mkdirSync(CIKTI, { recursive: true });

const DUELLO = ["ortak_arama_gecis", "duello_ban_giris", "duello_ban_aciklama", "duello_ban_onay", "duello_ban_bilgi", "duello_ban_sira", "duello_ban_sira_bilgi",
  "duello_secim_oto", "duello_kart_ucus", "duello_hakimiyet_gecis", "duello_calma", "duello_vurus", "duello_skill_efekt", "duello4_acilis", "duello4_sarsinti"];
const KASA = ["kasa_ac_an", "kasa_devam_an", "kasa_an_taban", "kasa_kapali_karar", "kasa_devam_vurus", "kasa_sonuc_ucus", "kasa_final_sahne", "kasa_final_kapanis",
  "kasa_cifte", "kasa_savunma", "kasa_joker_bilgi", "kasa_devam_odul", "kasa_rakip_joker", "kasa_giris"];

const t = await chromium.launch({ channel: "chrome", headless: true });
const b = await t.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block", deviceScaleFactor: 1 });
await b.route(/supabase\.co/, (r) => r.abort());
const s = await b.newPage();
const hatalar = [];
s.on("pageerror", (e) => hatalar.push(String(e).slice(0, 240)));
let simdiki = "sayfa";
s.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_FAILED|supabase/i.test(m.text())) hatalar.push(`[${simdiki}] ${m.text().slice(0, 200)}`); });

// Sahne öğesinin görünür kaldığı aralık (oynatma başından ms) + toplam
const OLC = () => new Promise((coz) => {
  const tel = document.querySelector(".sa-telefon");
  const secici = tel?.dataset.olcu;
  const p0 = performance.now();
  let ilk = null, son = null;
  const gorunur = (el) => {
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    for (let e = el; e && e !== document.body; e = e.parentElement) { const st = getComputedStyle(e); if (st.display === "none" || st.visibility === "hidden" || +st.opacity < 0.04) return false; }
    return true;
  };
  const tur = () => {
    const t2 = document.querySelector(".sa-telefon");
    const x = performance.now() - p0;
    const var_ = secici && [...(t2?.querySelectorAll(secici) ?? [])].some(gorunur);
    if (var_) { if (ilk === null) ilk = x; son = x; }
    if (!t2 || t2.dataset.durum === "bitti" || x > 15000) coz({ ilk, son, gorunen: ilk === null ? 0 : Math.round(son - ilk), on: +t2?.dataset.on || 0, sure: +t2?.dataset.sure || 0, secici });
    else requestAnimationFrame(tur);
  };
  requestAnimationFrame(tur);
});

async function sekme(ad) { await s.getByRole("tab", { name: ad }).click(); await s.waitForTimeout(150); }
async function oynat(anahtar) {
  await s.locator(`[data-anahtar="${anahtar}"]`).getByRole("button", { name: "Oynat", exact: true }).click();
  await s.waitForSelector(".sa-telefon", { timeout: 4000 });
}
async function kapat() { await s.getByRole("button", { name: "Kapat", exact: true }).click(); await s.waitForSelector(".sa-sahne", { state: "detached" }); }
async function kaydir(deger) {
  await s.evaluate((v) => {
    const el = document.querySelector(".sa-sahne-alt .sa-kaydirici");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, deger);
  await s.waitForFunction((v) => document.querySelector(".sa-telefon")?.dataset.deger === String(v), deger, { timeout: 3000 });
}

const sonuc = [];
try {
  await s.goto(`${ADRES}${ARG.yol || "/sure-ayar"}`, { waitUntil: "domcontentloaded" });
  await s.waitForSelector(".sa-kart", { timeout: 20000 });
  await s.waitForTimeout(800);
  // 390 px: taşma + hedefler
  const sayfa = await s.evaluate(() => ({
    tasma: document.documentElement.scrollWidth - innerWidth,
    kucuk: [...document.querySelectorAll(".sa-sayfa button, .sa-sayfa input")].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.height < 44 || r.width < 44); }).map((e) => `${e.className} ${Math.round(e.getBoundingClientRect().height)}`).slice(0, 6),
  }));
  await s.screenshot({ path: path.join(CIKTI, "00-sayfa-390.png"), fullPage: false });

  for (const [ad, liste] of [["Düello", DUELLO], ["Ortak Hazine", KASA]]) {
    await sekme(ad);
    for (const k of liste) {
      simdiki = k;
      await oynat(k);
      const olcum = s.evaluate(OLC);
      const { on, sure } = await s.evaluate(() => ({ on: +document.querySelector(".sa-telefon").dataset.on, sure: +document.querySelector(".sa-telefon").dataset.sure }));
      const t0 = Date.now();
      for (const [ek, oran] of [["1-bas", 0.12], ["2-orta", 0.5], ["3-son", 0.88]]) {
        const hedef = on + sure * oran - (Date.now() - t0);
        if (hedef > 0) await s.waitForTimeout(hedef);
        await s.locator(".sa-telefon").screenshot({ path: path.join(CIKTI, `${k}-${ek}.png`) });
      }
      const o = await olcum;
      if (["ortak_arama_gecis", "kasa_sonuc_ucus", "duello_kart_ucus"].includes(k)) await s.screenshot({ path: path.join(CIKTI, `${k}-oynatici-390.png`) });
      const ust = await s.evaluate(() => { const r = document.querySelector(".sa-sahne-alt").getBoundingClientRect(); return { tasma: document.documentElement.scrollWidth - innerWidth, alt: Math.round(r.bottom) }; });
      sonuc.push({ anahtar: k, ...o, oynadi: o.gorunen > 0, ust });
      console.log(`${o.gorunen > 0 ? "✓" : "✗"} ${k.padEnd(24)} süre ${String(sure).padStart(5)} · öğe ${String(o.gorunen).padStart(5)} ms (${o.secici})`);
      await kapat();
    }
  }

  // Kaydırıcı: 3 sahne, en kısa / en uzun
  console.log("== kaydırıcı → süre");
  const kaydirici = [];
  for (const [ad, k, a, z] of [["Ortak Hazine", "kasa_joker_bilgi", 1000, 3000], ["Düello", "duello_vurus", 700, 2500], ["Düello", "duello4_acilis", 800, 2500]]) {
    await sekme(ad);
    await oynat(k);
    await s.waitForFunction(() => document.querySelector(".sa-telefon")?.dataset.durum === "bitti", null, { timeout: 15000 });
    const olc = [];
    for (const v of [a, z]) { await kaydir(v); olc.push({ deger: v, ...(await s.evaluate(OLC)) }); }
    await kapat();
    const satir = { anahtar: k, kisa: olc[0].gorunen, uzun: olc[1].gorunen, hedef: [a, z] };
    kaydirici.push(satir);
    // sahne öğesi CSS solmasıyla seçilen sürenin ~%80–100'ünde görünür kalır: oran (uzun/kısa) seçimlerin oranına uymalı
    const oran = olc[1].gorunen / Math.max(1, olc[0].gorunen);
    const iyi = olc[0].gorunen > 0 && Math.abs(oran / (z / a) - 1) < 0.25 && olc[1].gorunen <= z + 120;
    console.log(`${iyi ? "✓" : "✗"} ${k}: ${a} → ${olc[0].gorunen} ms · ${z} → ${olc[1].gorunen} ms (oran ${oran.toFixed(2)} / beklenen ${(z / a).toFixed(2)})`);
  }
  // Oynatıcı paneli 390 px: taşma + 44 px hedef; "Tam ekran"
  await sekme("Ortak Hazine");
  await oynat("kasa_cifte");
  const panel = await s.evaluate(() => ({
    tasma: document.documentElement.scrollWidth - innerWidth,
    telefon: Math.round(document.querySelector(".sa-telefon").getBoundingClientRect().height),
    kucuk: [...document.querySelectorAll(".sa-sahne-alt button, .sa-sahne-alt input")].filter((e) => { const r = e.getBoundingClientRect(); return r.height < 40 || r.width < 44; }).map((e) => e.textContent || e.className),
  }));
  console.log(`== oynatıcı: taşma ${panel.tasma} · telefon yüksekliği ${panel.telefon} px · küçük hedef ${panel.kucuk.length ? panel.kucuk.join(", ") : "yok"}`);
  await s.waitForTimeout(500);
  await s.screenshot({ path: path.join(CIKTI, "01-oynatici-390.png") });
  await s.getByRole("button", { name: "Tam ekran", exact: true }).click();
  await s.waitForTimeout(500);
  await s.screenshot({ path: path.join(CIKTI, "02-tam-ekran-390.png") });
  await s.getByRole("button", { name: "Paneli göster" }).click();
  await kapat();
  // "Hepsini sırayla oynat": ilk iki sahne art arda
  await sekme("Düello");
  await s.getByRole("button", { name: "Hepsini sırayla oynat" }).click();
  await s.waitForFunction(() => document.querySelector(".sa-telefon")?.dataset.sahne === "duello_ban_giris", null, { timeout: 12000 });
  const sira = await s.locator(".sa-sahne-alt h2").innerText();
  console.log(`✓ sırayla oynat: 2. sahneye geçti (${sira.replace(/\s+/g, " ")})`);
  await kapat();
  // sıfırla (testin yazdığı seçimler)
  await s.evaluate(() => { try { localStorage.removeItem("qt-sure-ayar-v1"); } catch { /* yok */ } });

  fs.writeFileSync(path.join(CIKTI, "sonuc.json"), JSON.stringify({ sayfa, panel, sonuc, kaydirici, hatalar }, null, 1));
  console.log(`== sayfa taşma ${sayfa.tasma} · küçük hedef ${sayfa.kucuk.length ? sayfa.kucuk.join(", ") : "yok"} · konsol hatası ${hatalar.length}`);
  hatalar.slice(0, 20).forEach((h) => console.log("  !", h));
  console.log(`== oynadı ${sonuc.filter((x) => x.oynadi).length}/${sonuc.length}`);
} finally {
  await b.close();
  await t.close();
}
