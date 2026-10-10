// Düello v4 · CANLI tek maç (Serbest, bota karşı) — 10 Eki 2026 maç düzeltmelerinin canlı doğrulaması.
// Tek seferlik: test hesabı lobiden "Rakip ara" der, bot eşleşir, maç sonuna kadar oynanır. Döngüyle sunucu yoklamaz:
// durum EKRANDAN okunur; veritabanına yalnız soru başına doğru şık okuması (tek SELECT) ve Düello açılış eşiğinin arama
// süresince geçici 0 yapılıp maç kurulunca geri alınması (test hesabında 5 Klasik maç yok).
// Ölçer: her faz geçişinde "Bağlantı yeniden kuruluyor" bandı · sayaç 0'da bekleme süresi · cevaptan sonra sayaç durdu mu +
// "Cevabın gitti" metni · kart 1→2 adımda kart konumu · maç sonunda boş sayfa anı · ilk tıkta arama başladı mı.
// Kullanım: IZIN_CANLI_TEST=1 node araclar/duello-bant-canli-testi.mjs [--adres=https://quiztactics.com]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "https://quiztactics.com").replace(/\/$/, "");
const CIKTI = path.resolve("tasarim/mac-duzeltme-10eki");
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const q = async (s) => { const r = await db.sorgu(s); return r.rows ?? r; };
const t0 = Date.now();
const sn = () => ((Date.now() - t0) / 1000).toFixed(1);
const log = (m) => console.log(`+${sn()}s ${m}`);

const ham = JSON.parse(fs.readFileSync(".arayuz-denetim-oturum.json", "utf8"));
const kok = new URL(ADRES).origin;
ham.origins = ham.origins.slice(0, 1).map((o) => ({ ...o, origin: kok,
  localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dereceli", "bildim_duello_tanitim_v14"].includes(x.name)),
    { name: "bildim_dereceli", value: "0" }, { name: "bildim_tanitim", value: "1" }] }));

const esikOnce = (await q(`select deger::text d from oyun_ayarlari where anahtar = 'duello_acilis_mac_esigi'`))[0]?.d ?? "5";
let esikAcik = false;
const esikGeriAl = async () => {
  if (!esikAcik) return;
  await q(`update oyun_ayarlari set deger = ${alintila(esikOnce)}::jsonb where anahtar = 'duello_acilis_mac_esigi'`);
  esikAcik = false;
  log(`Düello açılış eşiği geri alındı (${esikOnce})`);
};
const rapor = { adres: ADRES, tarih: new Date().toISOString(), gecisler: [], bant: [], sifirBekleme: [], cevapSonrasi: [], kart: [], macSonuBosMs: null, ilkTik: null, mac: null };

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
try {
  const b = await tarayici.newContext({ storageState: ham, viewport: { width: 390, height: 844 }, hasTouch: true, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await b.addInitScript(() => { try { localStorage.setItem("bildim_duello_tanitim_v14", "1"); } catch { /* yok */ } });
  const s = await b.newPage();
  s.on("pageerror", (e) => log("sayfa hatası: " + String(e).slice(0, 150)));

  await q(`update oyun_ayarlari set deger = '0'::jsonb where anahtar = 'duello_acilis_mac_esigi'`);
  esikAcik = true;
  log(`Düello açılış eşiği geçici 0 (önce ${esikOnce})`);
  await s.goto(ADRES + "/duello", { waitUntil: "domcontentloaded" });
  const ara = s.getByRole("button", { name: /Rakip ara/ });
  await ara.waitFor({ timeout: 30000 });
  await s.waitForTimeout(400);
  const kutu = await ara.boundingBox();
  await s.mouse.click(kutu.x + kutu.width / 2, kutu.y + kutu.height / 2);
  await s.waitForTimeout(1500);
  rapor.ilkTik = await s.evaluate(() => /aranıyor|Searching/i.test(document.body.innerText));
  log(`ilk tık → arama ${rapor.ilkTik ? "başladı" : "BAŞLAMADI"}`);
  await s.waitForURL(/\/duello\/[0-9a-f-]{36}/, { timeout: 120000 });
  const macId = s.url().match(/duello\/([0-9a-f-]{36})/)[1];
  rapor.mac = macId;
  log(`maç: ${macId}`);
  await esikGeriAl();

  // ---------------- maç döngüsü (ekrandan okur)
  let oncekiFaz = null, sifirAn = null, cevaplananSoru = null, kartDokunulan = null, bitti = false, arenaGoruldu = false;
  const bosOrnek = [];
  const dogruCache = new Map();
  const bitis = Date.now() + 15 * 60 * 1000;
  while (Date.now() < bitis) {
    const o = await s.evaluate(() => {
      const ar = document.querySelector(".d4-arena");
      const faz = ar ? ([...ar.classList].find((c) => /^d4-arena--/.test(c)) ?? "").replace("d4-arena--", "") : null;
      const bant = [...document.querySelectorAll(".m2-bant")].some((e) => /yeniden kuruluyor/i.test(e.textContent));
      const sayac = document.querySelector(".d4-sayac .qt-sayac-sayi")?.textContent ?? null;
      const soru = document.querySelector(".d4-arena .qt-soru-metin")?.textContent?.trim() || null;
      const sikler = [...document.querySelectorAll(".d4-arena .qt-sik")].map((e) => ({ m: e.innerText.replace(/^[A-D]\s*/, "").trim(), k: /kilitli|secili/.test(e.className) }));
      const kartlar = [...document.querySelectorAll(".d4-kart")].map((e) => ({ y: Math.round(e.getBoundingClientRect().top), d: e.disabled, r: /rakibe|sana/.test(e.className) }));
      const adim = document.querySelector(".d4-adim")?.textContent ?? null;
      const ipucu = document.querySelector(".m2-skill-ipucu")?.textContent ?? null;
      const sonuc = Boolean(document.querySelector("[class*='msk-']:not(.msk-bekle)"));
      return { faz, bant, sayac, soru, sikler, kartlar, adim, ipucu, sonuc, url: location.pathname, bos: !ar && !document.querySelector("[class*='msk-']:not(.msk-bekle)") };
    });
    const an = Date.now();
    if (o.sonuc) { bitti = true; break; }
    if (o.faz) arenaGoruldu = true;
    if (o.bos && arenaGoruldu) bosOrnek.push(an);
    if (o.faz !== oncekiFaz) {
      rapor.gecisler.push({ t: +sn(), faz: o.faz });
      if (sifirAn) { rapor.sifirBekleme.push({ faz: oncekiFaz, ms: an - sifirAn }); sifirAn = null; }
      oncekiFaz = o.faz;
    }
    if (o.bant) rapor.bant.push({ t: +sn(), faz: o.faz });
    if (o.sayac === "0" && !sifirAn) sifirAn = an;
    if (o.sayac !== "0" && sifirAn && o.faz === oncekiFaz) sifirAn = null;

    // soru: doğru şıkka bir kez dokun (sayaç 1 sn'den büyükken), sonra 2 sn sayaç izlenir
    if (o.soru && o.sikler.length === 4 && cevaplananSoru !== o.soru && !o.sikler.some((x) => x.k) && Number(o.sayac) > 1) {
      if (!dogruCache.has(o.soru)) {
        const r = await q(`select q.dogru_cevap::int dc, q.secenekler::text s from questions q where q.soru = ${alintila(o.soru)} limit 1`);
        dogruCache.set(o.soru, r[0] ? JSON.parse(r[0].s)[r[0].dc] : null);
      }
      const dogru = dogruCache.get(o.soru);
      const i = Math.max(0, o.sikler.findIndex((x) => x.m === dogru));
      cevaplananSoru = o.soru;
      await s.locator(".d4-arena .qt-sik").nth(i).click({ timeout: 3000 }).catch(() => {});
      await s.waitForTimeout(500);
      const a1 = await s.evaluate(() => [document.querySelector(".d4-sayac .qt-sayac-sayi")?.textContent, document.querySelector(".m2-skill-ipucu")?.textContent]);
      await s.waitForTimeout(2000);
      const a2 = await s.evaluate(() => [document.querySelector(".d4-sayac .qt-sayac-sayi")?.textContent, document.querySelector(".m2-skill-ipucu")?.textContent, document.querySelector(".d4-arena")?.className]);
      if (/cevap|notr|son/.test(a2[2] ?? "")) rapor.cevapSonrasi.push({ t: +sn(), sayac: [a1[0], a2[0]], durdu: a1[0] === a2[0], metin: a2[1] });
      continue;
    }
    // kart: sıra bende (kartlar etkin) → 1. adım, sonra 2. adım
    if (o.faz === "kart" && o.kartlar.length && o.kartlar.some((x) => !x.d)) {
      const anahtar = `${o.adim}`;
      if (kartDokunulan !== anahtar + rapor.gecisler.length) {
        kartDokunulan = anahtar + rapor.gecisler.length;
        const i = o.kartlar.findIndex((x) => !x.d && !x.r);
        const y1 = o.kartlar.map((x) => x.y);
        await s.locator(".d4-kart").nth(i).click({ timeout: 3000 }).catch(() => {});
        await s.waitForTimeout(1600);
        const y2 = await s.evaluate(() => [...document.querySelectorAll(".d4-kart")].map((e) => Math.round(e.getBoundingClientRect().top)));
        if (o.adim?.startsWith("1")) rapor.kart.push({ t: +sn(), once: y1, sonra: y2, ayni: y2.length === y1.length && y2.every((y, k) => y === y1[k]) });
        if (rapor.kart.length === 1) await s.screenshot({ path: path.join(CIKTI, "canli-duello-kart2.png") });
        continue;
      }
    }
    await s.waitForTimeout(250);
  }
  // maç sonu: sonuç ekranı gelene dek boş sayfa örnekleri
  rapor.macSonuBosMs = bosOrnek.length ? (bosOrnek.at(-1) - bosOrnek[0] + 250) : 0;
  await s.waitForTimeout(1500);
  await s.screenshot({ path: path.join(CIKTI, "canli-duello-mac-sonu.png") });
  rapor.bitti = bitti;
  log(`maç ${bitti ? "bitti (sonuç ekranı)" : "15 dk içinde bitmedi"}`);
  const m = (await q(`select durum, kazanan::text k, v4_tur tur, v4_soru_no soru from duellolar where id = ${alintila(rapor.mac)}`))[0];
  rapor.sunucu = m;
} finally {
  await esikGeriAl().catch((e) => console.error("EŞİK GERİ ALINAMADI:", e.message));
  await tarayici.close();
  fs.writeFileSync(path.join(CIKTI, "canli-duello.json"), JSON.stringify(rapor, null, 1));
  await db.kapat?.();
}
const ozet = { gecis: rapor.gecisler.length, bantOrnek: rapor.bant.length, sifirBeklemeMaksMs: Math.max(0, ...rapor.sifirBekleme.map((x) => x.ms)),
  cevapSonrasiDurdu: `${rapor.cevapSonrasi.filter((x) => x.durdu).length}/${rapor.cevapSonrasi.length}`,
  kartSabit: `${rapor.kart.filter((x) => x.ayni).length}/${rapor.kart.length}`, macSonuBosMs: rapor.macSonuBosMs, ilkTik: rapor.ilkTik, sunucu: rapor.sunucu };
console.log(JSON.stringify(ozet, null, 1));
process.exit(0);
