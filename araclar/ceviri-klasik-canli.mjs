// KLASİK MAÇ İÇİ + MAÇ SONU İNGİLİZCE TARAMASI (7 Eki 2026) — gerçek maç, İngilizce test hesabıyla.
// Meydan Okumalar › Antrenman › Klasik: açık bota karşı, SERBEST maç (lig puanı yok). Her soruda, sonuç anında ve
// maç sonunda (Detay dahil) ekranda kalan Türkçe metni tarar (ceviri-dom.mjs). Her soruda ilk şıkka basar.
// Veritabanına YAZMAZ ama maç oynandığı için matches/match_answers satırı oluşur: bittiğinde maç kimliği yazılır;
// temizlik ayrı yapılır (yalnız bu hesabın test maçı).
//   node araclar/ceviri-klasik-canli.mjs --oturum=<İngilizce hesap oturumu> [--adres=http://localhost:5173] [--genislik=390]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { ceviriToplayici } from "./ceviri-dom.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5173";
const OTURUM = path.resolve(typeof ARG.oturum === "string" ? ARG.oturum : ".arayuz-denetim-oturum-en.json");
const W = Number(ARG.genislik || 390);
const CIKTI = path.resolve(typeof ARG.cikti === "string" ? ARG.cikti : "arayuz-denetim-gorseller/en-klasik");
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok:", OTURUM); process.exit(1); }
fs.mkdirSync(CIKTI, { recursive: true });

const CEVIRI = await ceviriToplayici();
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const b = await tarayici.newContext({ storageState: OTURUM, viewport: { width: W, height: 844 } });
const s = await b.newPage();
const konsol = [];
s.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 160)); });
const tara = async (ad) => { await CEVIRI.tara(s, ad); await s.screenshot({ path: path.join(CIKTI, `${ad}.png`) }).catch(() => {}); };
let macId = null;
try {
  await s.goto(ADRES + "/meydan", { waitUntil: "domcontentloaded" });
  const kart = s.locator(".a-meydan-antrenman-kart").first();
  await kart.waitFor({ state: "visible", timeout: 30000 });
  // İlk açılış tanıtımı: her adımı tara, "Continue/Got it" ile geç
  for (let i = 0; i < 8; i++) {
    const dlg = s.locator("[role=dialog]:visible, [aria-modal=true]:visible").first();
    if (!(await dlg.count())) break;
    await tara(`tanitim-${i}`);
    const ileri = dlg.getByRole("button", { name: /^(Continue|Next|Got it|Let's go|Start|OK|Done)/i }).first();
    if (await ileri.count()) await ileri.click().catch(() => {});
    else { await s.keyboard.press("Escape"); }
    await s.waitForTimeout(500);
  }
  await kart.scrollIntoViewIfNeeded(); await kart.click();
  const mod = s.locator(".a-meydan-antrenman-modlar button").first();
  await mod.waitFor({ state: "visible", timeout: 8000 });
  await tara("00-antrenman-pencere");
  await mod.click();
  await s.waitForURL(/\/mac\//, { timeout: 30000 });
  macId = s.url().split("/mac/")[1]?.split(/[?#/]/)[0] ?? null;
  console.log("maç:", macId);
  let soru = 0, t0 = Date.now();
  while (Date.now() - t0 < 8 * 60 * 1000) {
    if (await s.locator(".msk").count()) break;
    const sik = s.locator(".qt-sik:not([disabled])").first();
    if (await sik.count() && await sik.isVisible().catch(() => false)) {
      soru++;
      await tara(`soru-${soru}`);
      await sik.click({ timeout: 2000 }).catch(() => {});
      await s.waitForTimeout(1200);
      await tara(`soru-${soru}-cevap`);
    } else {
      // Hazır mısın / loadout kapısı: tehlikesiz "hazır/başla" düğmesi
      const hazir = s.getByRole("button", { name: /^(Ready|I'm ready|Start|Play|Go)/i }).first();
      if (await hazir.count() && await hazir.isVisible().catch(() => false)) { await tara("hazir-kapisi"); await hazir.click().catch(() => {}); }
      await s.waitForTimeout(700);
    }
  }
  await s.waitForTimeout(6000);   // maç sonu sahnesi tamamlansın
  await tara("mac-sonu");
  const detay = s.getByRole("button", { name: /Detail/i }).first();
  if (await detay.count()) { await detay.click().catch(() => {}); await s.waitForTimeout(800); await tara("mac-sonu-detay"); }
  console.log(`soru: ${soru}`);
} catch (e) { console.log("HATA:", String(e).slice(0, 200)); await tara("hata"); }
await tarayici.close();
const kalan = CEVIRI.ozet();
const ilgili = konsol.filter((k) => !/favicon|ERR_ABORTED/i.test(k));
if (ilgili.length) console.log("konsol:", ilgili.slice(0, 4).join(" | "));
console.log(`MAC_ID=${macId ?? ""}`);
process.exit(kalan ? 1 : 0);
