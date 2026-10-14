// Ortak Hazine · ilk Hazine rehberi (1094) + karar gerilimi — CANLI tek bot maçı DUMAN TESTİ. Tek seferlik; maç başına bir kez.
// Hesap: araclar/test-oturumu.mjs --ac ile açılan geçici test hesabı (hiç Hazine maçı oynamamış). İş bitince --sil ile silinir.
// Akış: /kasa › Rakip ara → bot maçı → (DB) profiles.hazine_rehber_mac = maç · 3-2-1 → her soruda doğru cevap (soru_id'den
// tek okuma) → ilk sonuçta "hazine" balonu · ilk kendi kararımda "karar" balonu + gerilim sahnesi (seviye sınıfı) → AÇ →
// sonraki soruda "ac" balonu. Üç an görülünce (ya da 4 dk) maçtan çıkılır (terk) ve maçın bittiği doğrulanır.
// Kural/süre ölçümü yapılmaz (değişmedi); yalnız rehber + gerilim canlıda görünüyor mu. Sorgu döngüsü yok: tur başına tek okuma.
// Kullanım: node araclar/hazine-rehber-canli-testi.mjs [--adres=http://localhost:5188] [--oturum=.arayuz-denetim-oturum.json]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const OTURUM = path.resolve(typeof ARG.oturum === "string" ? ARG.oturum : ".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/hazine-gerilim");
const SURE_MS = 4 * 60 * 1000;
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/test-oturumu.mjs --ac"); process.exit(1); }

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
await db.sorgu("set application_name = 'hazine-rehber-canli-testi'");
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
// Uygulama kapısı (src/lib/uygulamaKipi.js): tarayıcıda oyun yerine kurulum sayfası açılır. Her bağlam ?dev=1 ile
// aynı geliştirici geçişini alır (oturum işareti; localhost zaten serbest).
{ const yeni = tarayici.newContext.bind(tarayici); tarayici.newContext = async (...a) => { const c = await yeni(...a); await c.addInitScript(() => { try { sessionStorage.setItem("qt_dev_gecis", "1"); } catch { /* yok */ } }); return c; }; }
const baglam = await tarayici.newContext({ storageState: OTURUM, viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block", locale: "tr-TR" });
await baglam.addInitScript(() => { try { localStorage.setItem("bildim_tanitim", "1"); localStorage.setItem("bildim_dil", "tr"); } catch { /* yok */ } });
const s = await baglam.newPage();
const konsol = [];
s.on("console", (m) => { if (m.type() === "error" && !/status of 4\d\d|Failed to load resource/.test(m.text())) konsol.push(m.text().slice(0, 200)); });
s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
s.on("response", async (r) => { if (/\/rpc\/kasa_/.test(r.url()) && r.status() >= 400) console.log("  · RPC", r.status(), r.url().split("/rpc/")[1], (await r.text().catch(() => "")).slice(0, 160)); });
const goruntu = (ad) => s.screenshot({ path: path.join(CIKTI, `canli-${ad}-390x844-tr.png`) }).catch(() => {});

let macId = null;
const gorulen = new Set();
try {
  await s.goto(ADRES + "/kasa", { waitUntil: "domcontentloaded" });
  const ara = s.getByRole("button", { name: /Rakip ara/i }).first();
  await ara.waitFor({ timeout: 30000 });
  await s.waitForTimeout(1500);   // sayfa ayarları (kasa_modu_acik) gelsin
  await ara.click();
  await s.waitForTimeout(3000);
  // 14 Eki 2026: arama ekranı lobi düğmesinin ÜSTÜNE biner (düğme DOM'da kalır) → düğme sayısı arama başladı mı ölçmez; ekran metnine bakılır.
  if (!(await s.getByText(/Rakip aranıyor|Rakip bulundu/i).count())) { console.log("  · arama başlamadı, yeniden dokunuluyor"); await s.getByRole("button", { name: /Rakip ara/i }).first().click().catch(() => {}); }
  await s.waitForURL(/\/kasa\/[0-9a-f-]{36}/, { timeout: 90000 });
  macId = s.url().match(/\/kasa\/([0-9a-f-]{36})/)[1];
  console.log("maç", macId);
  await s.locator(".ks-giris-an, .ks-mac").first().waitFor({ timeout: 30000 }).catch(() => {});
  await s.waitForTimeout(1500);
  const [m] = await db.sorgu(`select k.bot is not null botlu, (select p.hazine_rehber_mac::text from profiles p join kasa_maclari x on x.id = k.id
     where p.id = case when k.bot = k.oyuncu1 then k.oyuncu2 else k.oyuncu1 end) rehber from kasa_maclari k where k.id = ${alintila(macId)}`);
  ok("bot maçı açıldı", m?.botlu === "t", JSON.stringify(m));
  ok("profiles.hazine_rehber_mac = bu maç (tetikleyici)", m?.rehber === macId, JSON.stringify(m));

  const bas = Date.now();
  let sonTur = null, acBasildi = false;
  while (Date.now() - bas < SURE_MS && !(gorulen.has("hazine") && gorulen.has("karar") && gorulen.has("ac"))) {
    const o = await s.evaluate(() => {
      const kok = document.querySelector(".ks-mac");
      const faz = kok ? ([...kok.classList].find((c) => /^ks-mac--(cevap|sonuc|karar|baslangic)$/.test(c)) ?? "").replace("ks-mac--", "") : null;
      return { faz, balon: [...document.querySelectorAll(".qt-rehber")].map((e) => ({ sinif: e.className, metin: e.innerText.replace(/\s+/g, " ") })),
        sahne: document.querySelector(".ks-karar-sahne")?.className ?? null, ac: !!document.querySelector(".ks-karar-eylem .ks-karar-dugme:not([disabled])"),
        sik: document.querySelectorAll(".ks-mac .qt-sik:not([disabled]):not([aria-disabled=true])").length, bitti: !kok && !!document.querySelector(".msk, .ks-final"),
        tur: document.querySelector(".ks-mac")?.dataset?.kat ?? null };
    }).catch(() => ({}));
    if (o.bitti) break;
    for (const b of o.balon ?? []) {
      const an = (b.sinif.match(/ks-rehber--(\w+)/) ?? [])[1];
      if (an && !gorulen.has(an)) { gorulen.add(an); console.log(`  · balon: ${an} — ${b.metin}`); await goruntu(`rehber-${an}`); }
    }
    if (o.faz === "karar" && o.sahne && !gorulen.has("sahne")) { gorulen.add("sahne"); console.log("  · gerilim sahnesi:", o.sahne); await goruntu("karar-gerilim"); }
    if (o.faz === "karar" && o.ac && gorulen.has("karar") && !acBasildi) {
      await s.waitForTimeout(600);
      await s.locator(".ks-karar-eylem .ks-karar-dugme").first().click({ timeout: 2000 }).catch(() => {});
      acBasildi = true;
      console.log("  · AÇ basıldı");
    }
    if (o.faz === "cevap" && o.sik > 0) {
      const [r] = await db.sorgu(`select k.tur::text tur, q.dogru_cevap::text dc from kasa_maclari k join questions q on q.id = k.soru_id where k.id = ${alintila(macId)}`);
      const anahtar = r ? `${r.tur}` : null;
      if (r && anahtar !== sonTur) {
        sonTur = anahtar;
        await s.waitForTimeout(700);
        await s.locator(".ks-mac .qt-sik").nth(Number(r.dc)).click({ timeout: 3000 }).catch(() => {});
      }
    }
    await s.waitForTimeout(350);
  }
  ok("rehber 'hazine' balonu canlıda göründü", gorulen.has("hazine"));
  ok("rehber 'karar' balonu canlıda göründü", gorulen.has("karar"));
  ok("rehber 'ac' balonu canlıda göründü", gorulen.has("ac"));
  ok("karar gerilim sahnesi çizildi", gorulen.has("sahne"));
} catch (e) {
  ok("akış", false, String(e?.message ?? e).slice(0, 200));
  await goruntu("hata");
} finally {
  // maçtan çık (terk) → maç biter; aktif maç bırakılmaz
  try {
    if (macId) {
      const [d] = await db.sorgu(`select durum from kasa_maclari where id = ${alintila(macId)}`);
      if (d?.durum === "aktif") {
        await s.getByRole("button", { name: /Maçtan çık/i }).first().click({ timeout: 3000 }).catch(() => {});
        await s.getByRole("button", { name: /^Çık$/ }).first().click({ timeout: 3000 }).catch(() => {});
        await s.waitForTimeout(3000);
      }
      const [d2] = await db.sorgu(`select durum from kasa_maclari where id = ${alintila(macId)}`);
      ok(`maç kapandı (durum ${d2?.durum})`, d2?.durum !== "aktif");
    }
  } catch (e) { ok("maçtan çıkış", false, String(e?.message ?? e).slice(0, 160)); }
  ok("konsol hatası yok", konsol.length === 0, konsol.slice(0, 3).join(" | "));
  await tarayici.close();
  await db.kapat?.();
}
console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
