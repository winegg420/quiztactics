// 703 ekran testi: profil avatar ızgarası + Dükkân avatar ızgarası (390/360, TR/EN), Sahne boyama (8 dosya), kırpma.
// Kullanım: npm run dev -- --port 5181 (başka kabukta) · node araclar/avatar-703-ekran.mjs
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
const ADRES = "http://localhost:5181";
const CIKTI = path.resolve("tasarim/avatar-703");
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const kaynak = durum.origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token")));
const SEKIZ = ["pro/ari-k14", "pro/mumya-k28", "pro/buyucu-k21", "pro/penguen-k06", "pro/ahtapot-k13", "pro/sovalye-k20", "pro2/kizil-y03", "pro2/kedili-genc-y36"];
let gecti = 0, kaldi = 0;
const ok = (ad, k, ek = "") => { if (k) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const [w, dil] of [[390, "tr"], [360, "en"], [390, "en"]]) {
    console.log(`\n== ${w}px ${dil}`);
    const ls = [...kaynak.localStorage.filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }];
    const baglam = await tarayici.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
      storageState: { cookies: [], origins: [{ origin: new URL(ADRES).origin, localStorage: ls }] } });
    const s = await baglam.newPage();
    const hatalar = []; s.on("pageerror", (e) => hatalar.push(e.message)); s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text()); });
    await s.goto(ADRES + "/profil", { waitUntil: "load" });
    await s.waitForTimeout(2500);
    await s.getByRole("tab", { name: /^(Ayarlar|Settings)$/ }).or(s.locator("button", { hasText: /^(Ayarlar|Settings)$/ })).first().click().catch(() => {});
    await s.waitForTimeout(800);
    if (!(await s.locator(".qt-pf-avatar-izgara").count())) {
      await s.locator('section[aria-labelledby="qt-pf-avatar-baslik"] button').first().click();
    }
    await s.locator(".qt-pf-avatar-izgara").waitFor({ timeout: 8000 });
    await s.waitForTimeout(1500);
    const dugmeler = s.locator(".qt-pf-avatar-sec");
    const n = await dugmeler.count();
    const adlar = await dugmeler.evaluateAll((l) => l.map((b) => b.getAttribute("title")));
    ok(`profil ızgarası ${n} avatar (62)`, n === 62);
    ok("Kedili Genç / Cat Buddy var", adlar.some((a) => /Kedili Genç|Cat Buddy/.test(a ?? "")));
    ok("Sporcu / Athlete yok", !adlar.some((a) => /^(Sporcu|Athlete)$/.test(a ?? "")));
    for (const b of await dugmeler.all()) await b.scrollIntoViewIfNeeded().catch(() => {});
    await s.waitForTimeout(800);
    const kirik = await s.locator(".qt-pf-avatar-izgara img").evaluateAll((l) => l.filter((i) => !i.complete || !i.naturalWidth).length);
    ok("ızgarada kırık görsel yok", kirik === 0, String(kirik));
    const tasma = await s.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok("profil: yatay taşma yok", tasma <= 0, String(tasma));
    await s.locator(".qt-pf-avatar-izgara").first().scrollIntoViewIfNeeded();
    await s.screenshot({ path: `${CIKTI}/profil-izgara-${w}-${dil}.png` });
    const kedili = s.locator('.qt-pf-avatar-sec[title="Kedili Genç"], .qt-pf-avatar-sec[title="Cat Buddy"]').first();
    await kedili.scrollIntoViewIfNeeded();
    await kedili.screenshot({ path: `${CIKTI}/kedili-genc-secim-${w}-${dil}.png` });

    await s.goto(ADRES + "/joker", { waitUntil: "load" }); await s.waitForTimeout(2000);
    await s.locator("button, [role=tab]", { hasText: /^\s*Avatar/ }).first().click().catch(() => {});
    await s.waitForTimeout(2500);
    const dImg = await s.locator('img[src*="/avatars/pro"]').count();
    ok(`Dükkân ızgarası avatar görseli (${dImg})`, dImg >= 62);
    const dKirik = await s.locator('img[src*="/avatars/pro"]').evaluateAll((l) => l.filter((i) => i.loading !== "lazy" && (!i.complete || !i.naturalWidth)).length);
    ok("Dükkân: kırık görsel yok", dKirik === 0, String(dKirik));
    ok("Dükkân: Kedili var, Sporcu yok", (await s.locator('img[src*="kedili-genc-y36"]').count()) >= 1 && (await s.locator('img[src*="sporcu-y09"]').count()) === 0);
    const dTasma = await s.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok("Dükkân: yatay taşma yok", dTasma <= 0, String(dTasma));
    await s.locator('img[src*="kedili-genc-y36"]').first().scrollIntoViewIfNeeded(); await s.waitForTimeout(600);
    await s.screenshot({ path: `${CIKTI}/dukkan-izgara-${w}-${dil}.png` });
    ok("konsol/sayfa hatası yok", hatalar.filter((h) => !/favicon|Failed to load resource/.test(h)).length === 0, hatalar.slice(0, 2).join(" | "));
    await baglam.close();
  }

  console.log("\n== Sahne boyama (8 dosya) ve kırpma");
  const baglam = await tarayici.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
  const s = await baglam.newPage();
  await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  const r = await s.evaluate(async (liste) => {
    const { sahneyiBoya } = await import("/src/lib/avatarNadirlik.js");
    const cikti = [];
    for (const f of liste) {
      const t = await (await fetch(`/avatars/${f}.svg`)).text();
      const ilk = t.match(/<rect[^>]*fill="(#[0-9a-f]+)"/i)?.[1];
      const renkler = ["yaygin", "nadir", "epik", "efsanevi"].map((n) => sahneyiBoya(t, n).match(/<rect[^>]*fill="(#[0-9a-f]+)"/i)?.[1]);
      cikti.push({ f, ilk, renkler, degisti: renkler.every((x) => x && x !== ilk) || renkler.some((x) => x !== ilk) });
    }
    return cikti;
  }, SEKIZ);
  for (const x of r) ok(`Sahne boyanıyor: ${x.f} ${x.ilk} → ${x.renkler.join(",")}`, new Set(x.renkler).size === 4);
  await s.setContent(`<body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px">${SEKIZ.map((f) => `<img src="${ADRES}/avatars/${f}.svg" style="width:100%">`).join("")}</body>`);
  await s.waitForTimeout(1200);
  await s.screenshot({ path: `${CIKTI}/sekiz-cizim.png` });
  await baglam.close();
} finally { await tarayici.close(); }
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
