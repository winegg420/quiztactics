// /avatar-nadirlik ekran testi: 390 ve 360 px, TR/EN. Sayfa sahip ister; test hesabı sahip OLMADIĞI için
// (yetki değişikliği yapılmaz) iki RPC'nin cevabı tarayıcıda taklit edilir: sahip_mi → true ve
// avatar_nitelik_yonetici → veritabanındaki gerçek satırlar (aynı sorgu). Veritabanına yazmaz.
// Kullanım: npm run dev -- --port 5181 (başka kabukta) · node araclar/avatar-nadirlik-ekran.mjs [--adres=http://localhost:5181]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";

const ADRES = (process.argv.find((a) => a.startsWith("--adres=")) ?? "--adres=http://localhost:5181").slice(8);
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/avatar-nadirlik");
fs.mkdirSync(CIKTI, { recursive: true });

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const satirlar = JSON.parse(await db.tek(`select coalesce(json_agg(t order by t.sira, t.anahtar), '[]'::json)::text from (
  select n.url, n.anahtar, n.ad_tr, n.ad_en, n.grup, n.nadirlik, n.seri, n.edinme, n.acilis_zamani, n.sira, coalesce(k.aktif, true) as aktif
    from avatar_nitelikleri n left join avatar_katalogu k on k.url = n.url) t`));
await db.kapat();
const aktif = satirlar.filter((a) => a.aktif).length;
console.log(`Sunucu satırı: ${satirlar.length}, aktif: ${aktif}`);

const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const kaynak = durum.origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token")));
const adresOrigin = new URL(ADRES).origin;
const ls = (dil) => [
  ...kaynak.localStorage.filter((x) => x.name !== "bildim_dil"),
  { name: "bildim_dil", value: dil },
];

let hata = 0;
const ok = (ad, k, ek = "") => { if (k) console.log("  ✓", ad); else { hata++; console.log("  ✗", ad, ek); } };

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
for (const [w, h, dil] of [[390, 844, "tr"], [360, 800, "tr"], [390, 844, "en"]]) {
  console.log(`\n== ${w}×${h} ${dil}`);
  const baglam = await tarayici.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
    storageState: { cookies: [], origins: [{ origin: adresOrigin, localStorage: ls(dil) }] },
  });
  await baglam.grantPermissions(["clipboard-read", "clipboard-write"], { origin: adresOrigin }).catch(() => {});
  const sayfa = await baglam.newPage();
  const konsol = [];
  sayfa.on("console", (m) => { if (m.type() === "error") konsol.push(m.text()); });
  await sayfa.route("**/rest/v1/rpc/sahip_mi*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "true" }));
  await sayfa.route("**/rest/v1/rpc/avatar_nitelik_yonetici*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(satirlar) }));
  await sayfa.goto(`${ADRES}/avatar-nadirlik`, { waitUntil: "domcontentloaded" });
  await sayfa.waitForSelector(".an-kart", { timeout: 20000 });
  await sayfa.waitForFunction((n) => document.querySelectorAll('.an-avatar[src^="data:"]').length >= n, aktif, { timeout: 20000 }).catch(() => {});
  await sayfa.waitForTimeout(500);

  const kartSayisi = await sayfa.locator(".an-kart").count();
  ok(`${aktif} aktif avatar çizildi`, kartSayisi === aktif, `kart=${kartSayisi}`);
  const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok("yatay taşma yok", tasma <= 0, `taşma=${tasma}`);
  const kucuk = await sayfa.evaluate(() => [...document.querySelectorAll(".an-nadirlik, .an-seri, .an-dugme-genis, .an-dugme-ikincil")]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).length);
  ok("dokunma hedefleri ≥ 44 px", kucuk === 0, `küçük=${kucuk}`);
  const taskin = await sayfa.evaluate(() => [...document.querySelectorAll(".an-kart, .an-sayac, .an-alt")]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 0.5 || r.left < -0.5; }).length);
  ok("hiçbir kart/çubuk ekrandan taşmıyor", taskin === 0, `taşan=${taskin}`);

  // Ön işaret sayacı ve dokununca anında renk
  const sayac0 = await sayfa.locator(".an-sayac").innerText();
  console.log("  sayaç:", sayac0.replace(/\s+/g, " "));
  const ilk = sayfa.locator(".an-kart").first();
  const once = await ilk.locator(".an-avatar").getAttribute("src");
  await ilk.locator(".an-nadirlik").nth(3).tap();   // Efsanevi
  await sayfa.waitForTimeout(150);
  const sonra = await ilk.locator(".an-avatar").getAttribute("src");
  ok("düğme Sahne rengini anında değiştirir", once !== sonra && decodeURIComponent(sonra).includes("#f5c431"));
  ok("seçili düğme işaretli", (await ilk.locator(".an-nadirlik").nth(3).getAttribute("aria-pressed")) === "true");
  const sayac1 = await sayfa.locator(".an-sayac").innerText();
  ok("sayaç güncellendi", sayac0 !== sayac1);
  await ilk.locator(".an-seri").fill("Deneme Serisi");

  // Kopyala
  await sayfa.locator(".an-dugme-genis").tap();
  await sayfa.waitForSelector(".an-kopya-metin", { timeout: 5000 });
  const metin = await sayfa.locator(".an-kopya-metin").inputValue();
  ok("kopya metni 'ad → nadirlik (seri)' satırları içeriyor", /→ (Efsanevi|Legendary) \(Deneme Serisi\)/.test(metin), metin.split("\n").slice(0, 6).join(" | "));
  ok("sayaç satırı ve grup başlıkları var", /#/.test(metin) && metin.split("\n").length > aktif);
  console.log("  not:", (await sayfa.locator(".an-kopya-not").innerText()).trim());

  if (dil === "tr" && w === 390) {
    // Esas ekran görüntüleri: üst kısım (ön işaretli) + tam sayfa
    await sayfa.evaluate(() => window.scrollTo(0, 0));
    await sayfa.locator(".an-kopya-metin").evaluate((e) => e.remove());
    await ilk.locator(".an-nadirlik").nth(0).tap();   // ilk avatarı ön işarete geri
    await ilk.locator(".an-seri").fill("");
    await sayfa.waitForTimeout(200);
    await sayfa.evaluate(() => document.activeElement?.blur?.());
    await sayfa.locator(".an-kopya-not").evaluate((e) => { e.textContent = ""; });
    await sayfa.screenshot({ path: path.join(CIKTI, "ekran-390.png") });
    await sayfa.screenshot({ path: path.join(CIKTI, "ekran-390-tam.png"), fullPage: true });
    console.log("  ekran görüntüleri yazıldı:", CIKTI);
  }
  ok("konsol hatası yok", konsol.filter((k) => !/favicon|manifest|realtime|websocket/i.test(k)).length === 0, konsol.slice(0, 3).join(" | "));
  await baglam.close();
}
await tarayici.close();
console.log(hata ? `\n${hata} KALDI` : "\nHEPSİ GEÇTİ");
process.exit(hata ? 1 : 0);
