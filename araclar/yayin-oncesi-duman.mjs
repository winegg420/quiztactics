// Yayın öncesi tarama (11 Eki 2026) — CANLI TEK MAÇLIK DUMAN TESTİ: Ortak Hazine, bota karşı, misafir test hesabı.
// Ölçer (madde 1, 1063): kendi karar fazımda HİÇ dokunmadan sayaç 0'a inince "Süre doldu" + düğmeler pasif; panelin 0'dan
// sonra kapanma süresi; sunucuda o turun kaydı (karar 'devam', son_karar.sure_doldu, karar_ms ≈ karar_sn × 1000 + ~150).
// Yük: tek maç, tek sayfa; soru başına bir doğru-şık OKUMASI (pg, salt okuma). Simülasyon/toplu deneme YOK.
// Kullanım: npx vite --port 5191 (ayrı kabukta; .env canlı Supabase) · IZIN_CANLI_TEST=1 node araclar/yayin-oncesi-duman.mjs [--adres=…]
// Bitince: maç kopuklukla kapanana dek bekler; test hesabını `node araclar/test-hesap-temizle.mjs --uygula` siler.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5191");
const CIKTI = path.resolve("tasarim/yayin-oncesi-tarama");
fs.mkdirSync(CIKTI, { recursive: true });
if (process.env.IZIN_CANLI_TEST !== "1") { console.error("Canlı test: IZIN_CANLI_TEST=1 gerekli"); process.exit(2); }

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await tarayici.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: "tr-TR", serviceWorkers: "block" });
const p = await ctx.newPage();
const konsol = [];
p.on("pageerror", (e) => konsol.push(String(e).slice(0, 200)));
const rapor = { adres: ADRES, basla: new Date().toISOString() };

async function tanitimiKapat() {
  for (let i = 0; i < 8; i++) {
    const atla = p.getByRole("button", { name: /^(Atla|Skip)$/ });
    if (await atla.count()) { await atla.first().click(); await p.waitForTimeout(500); return; }
    const basla = p.getByRole("button", { name: /Hadi başlayalım/i });
    if (await basla.count()) { await basla.first().click(); await p.waitForTimeout(500); return; }
    await p.waitForTimeout(300);
  }
}
async function kurulum() {
  await tanitimiKapat();
  const alan = p.locator(".bd-modal-katman input").first();
  await alan.waitFor({ timeout: 10000 }).catch(() => {});
  if (await alan.count()) {
    rapor.ad = "testduman" + Math.floor(Math.random() * 900 + 100);   // test-hesap-temizle deseni: test[a-z]*[0-9]*
    await alan.fill(rapor.ad);
    await p.getByRole("button", { name: /^(Devam|Continue)$/ }).first().click();
    await p.waitForTimeout(1800);
  }
  const ikon = p.locator(".bd-modal-katman .g-avatar-sec:not(.qt-av-kilitli)").first();
  if (await ikon.count()) { await ikon.click(); await p.waitForTimeout(400); }
  const kullan = p.getByRole("button", { name: /Bu avatarı kullan|Use this avatar/i });
  const avatarsiz = p.getByRole("button", { name: /Avatarsız devam et|Continue without an avatar/i });
  if (await kullan.count() && await kullan.first().isEnabled()) { await kullan.first().click(); await p.waitForTimeout(1800); }
  else if (await avatarsiz.count()) { await avatarsiz.first().click(); await p.waitForTimeout(1800); }
  const sehir = p.locator(".bd-modal-katman [role=combobox]").first();
  if (await sehir.count()) {
    await sehir.click();
    await p.locator(".bd-modal-katman [role=option]").first().waitFor({ timeout: 8000 }).catch(() => {});
    const secenek = p.locator(".bd-modal-katman [role=option]").first();
    if (await secenek.count()) await secenek.click();
    await p.getByRole("button", { name: /Oyuna başla|Start playing/i }).first().click();
    await p.waitForTimeout(2500);
  }
  await tanitimiKapat();
}

try {
  await p.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  const misafir = p.getByRole("button", { name: /Misafir olarak dene/i });
  await misafir.waitFor({ timeout: 20000 });
  await misafir.click();
  await p.waitForFunction(() => !document.body.innerText.includes("Misafir olarak dene"), null, { timeout: 60000 });
  await p.waitForTimeout(2500);
  await kurulum();
  rapor.kullanici = await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (/-auth-token$/.test(k)) { try { return JSON.parse(localStorage.getItem(k)).user.id; } catch { /* */ } } return null; });
  console.log("hesap", rapor.ad, rapor.kullanici);

  await p.goto(ADRES + "/kasa", { waitUntil: "domcontentloaded" });
  await p.waitForSelector(".m2-giris-eylem button", { timeout: 20000 });
  await p.waitForTimeout(1000);
  await p.locator(".m2-giris-eylem button").first().click();
  await p.waitForURL(/\/kasa\/[0-9a-f-]{36}/, { timeout: 60000 });
  rapor.kasaId = p.url().match(/\/kasa\/([0-9a-f-]{36})/)[1];
  console.log("maç", rapor.kasaId);

  const bitis = Date.now() + 6 * 60 * 1000;
  let sonSoru = null;
  while (Date.now() < bitis && !rapor.karar) {
    const durum = await p.evaluate(() => ({
      karar: Boolean(document.querySelector(".ks-karar .ks-karar-dugme")),
      soru: document.querySelector(".ks-mac .qt-soru-metin")?.textContent?.trim() ?? null,
      sikAcik: [...document.querySelectorAll(".ks-mac .qt-sik")].some((e) => !e.disabled),
      bitti: Boolean(document.querySelector(".msk, .ks-bitti--final")),
    }));
    if (durum.bitti) { rapor.not = "maç karar fazı gelmeden bitti"; break; }
    if (durum.karar) {
      // Kendi karar fazım: HİÇ dokunma; 0 → "Süre doldu" → panel kapanışı (sayfa içi tek ölçüm döngüsü)
      await p.screenshot({ path: path.join(CIKTI, "duman-karar-acik-390x844-tr.png") });
      const o = await p.evaluate(async () => {
        const t0 = performance.now(); let sifir = null, not = null, pasif = null, kapandi = null, ilk = null, ilkDegisim = null;
        while (performance.now() - t0 < 15000) {
          const panel = document.querySelector(".ks-karar");
          const sayi = document.querySelector(".qt-sayac-sayi")?.textContent ?? null;
          if (ilk == null) ilk = sayi;
          if (ilkDegisim == null && sayi !== ilk) ilkDegisim = Math.round(performance.now() - t0);
          if (sifir == null && (sayi === "0" || document.querySelector(".ks-karar-sure-doldu"))) sifir = performance.now();
          if (not == null && document.querySelector(".ks-karar-sure-doldu")) not = document.querySelector(".ks-karar-sure-doldu").textContent;
          if (pasif == null && document.querySelector(".ks-karar-dugme")?.disabled && sifir != null) pasif = Math.round(performance.now() - sifir);
          if (!panel && sifir != null) { kapandi = Math.round(performance.now() - sifir); break; }
          await new Promise((r) => setTimeout(r, 50));
        }
        return { ilkSayi: ilk, ilkDegisim_ms: ilkDegisim, sureDolduNotu: not, pasif_ms_sifirdan: pasif, panelKapanis_ms_sifirdan: kapandi };
      });
      rapor.karar = o;
      console.log("karar", JSON.stringify(o));
      await p.screenshot({ path: path.join(CIKTI, "duman-karar-sonra-390x844-tr.png") });
      break;
    }
    if (durum.soru && durum.sikAcik && durum.soru !== sonSoru) {
      sonSoru = durum.soru;
      // Doğru şık (salt okuma) — kasa sahibi olmak için doğru cevap
      const r = await db.sorgu(`select dogru_cevap from public.questions where soru = ${alintila(durum.soru)} limit 1`).catch(() => []);
      const i = r[0] ? Number(r[0].dogru_cevap) : 0;
      await p.waitForTimeout(700);
      await p.locator(".ks-mac .qt-sik").nth(Number.isInteger(i) ? i : 0).click({ timeout: 3000 }).catch(() => {});
    }
    await p.waitForTimeout(400);
  }

  // Sunucu kaydı (salt okuma): son DEVAM satırı ve son_karar
  if (rapor.kasaId) {
    const h = await db.sorgu(`select tur, karar, karar_ms from public.kasa_hamleler where kasa_id = ${alintila(rapor.kasaId)} and karar is not null order by tur desc limit 1`);
    const k = await db.sorgu(`select son_karar::text, karar_sn, durum from public.kasa_maclari where id = ${alintila(rapor.kasaId)}`);
    rapor.sunucu = { hamle: h[0] ?? null, maç: k[0] ?? null };
    console.log("sunucu", JSON.stringify(rapor.sunucu));
  }
} catch (e) {
  rapor.hata = String(e).slice(0, 300);
  console.log("HATA", rapor.hata);
  await p.screenshot({ path: path.join(CIKTI, "duman-hata-390x844-tr.png") }).catch(() => {});
} finally {
  rapor.konsol = konsol;
  await tarayici.close();
  // Maç, sayfa kapandığı için kopuklukla kapanır (1059: 60 sn); hesap silinmeden önce beklenir
  if (rapor.kasaId) {
    for (let i = 0; i < 18; i++) {
      const d = await db.sorgu(`select durum from public.kasa_maclari where id = ${alintila(rapor.kasaId)}`);
      rapor.macSonDurum = d[0]?.durum;
      if (rapor.macSonDurum !== "aktif") break;
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
  await db.kapat();
  fs.writeFileSync(path.join(CIKTI, "duman.json"), JSON.stringify(rapor, null, 1));
  console.log("bitti", JSON.stringify({ macSonDurum: rapor.macSonDurum, hata: rapor.hata ?? null }));
}
