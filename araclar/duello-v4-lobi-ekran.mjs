// Düello v4 · LOBİ ekran ölçümü — joker seti geçersiz (Baskın/Kalkan) kayıtla açılır; RPC'ler tarayıcıda taklit (yazma yok).
// Kullanım: npm run dev -- --port 5188 · node araclar/duello-v4-lobi-ekran.mjs --adres=http://localhost:5188
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/duello-v4-lobi");
fs.mkdirSync(CIKTI, { recursive: true });
const SKILLER = [
  { tur: "elli", adet: 2, acik: true }, { tur: "sure", adet: 5, acik: true }, { tur: "soru_degistir", adet: 1, acik: true },
  { tur: "zaman_baskisi", adet: 3, acik: true }, { tur: "ikinci_sans", adet: 0, acik: true },
  { tur: "baskin", adet: 9, acik: true }, { tur: "kalkan", adet: 9, acik: true },
];
let gecti = 0, kaldi = 0;
const ok = (ad, k, ek = "") => { if (k) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
for (const dil of (ARG.dil ? [ARG.dil] : ["tr", "en"])) for (const w of (ARG.en ? [Number(ARG.en)] : [390, 360])) {
  const h = w === 390 ? 844 : 640;
  const d = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  d.origins = (d.origins || []).map((o) => ({ ...o, origin: new URL(ADRES).origin,
    localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim", "quiztactics:skill-seti:v1:duello"].includes(x.name)),
      { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" }, { name: "bildim_duello_tanitim_v14", value: "1" },
      { name: "quiztactics:skill-seti:v1:duello", value: JSON.stringify(["elli", "baskin", "kalkan"]) }] }));
  const b = await tarayici.newContext({ storageState: d, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block" });
  const s = await b.newPage();
  const konsol = [];
  s.on("console", (m) => { if (m.type() === "error" && !/status of 4\d\d/.test(m.text())) konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  let kayit = null;
  await s.route(/\/rest\/v1\/(oyun_ayarlari|rpc\/)/, async (r) => {
    const req = r.request(); const u = req.url();
    const json = (v) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(v) });
    try {
      if (u.includes("/rpc/duello_acilis_benim")) return json({ acik: true, gereken: 5, oynanan: 5, kalan: 0 });
      if (u.includes("/rpc/skill_dukkani")) return json({ yuva: 3, loadout_acik: true, level: 10, skiller: SKILLER });
      if (u.endsWith("/rpc/skill_setim")) return json(["elli", "baskin", "kalkan"]);
      if (u.includes("/rpc/skill_setimi_kaydet")) { kayit = JSON.parse(req.postData() || "{}").p_skiller; return json(kayit); }
      const y = await r.fetch();
      let m = (await y.text()).replace(/"dil":\s*"(tr|en)"/g, `"dil":"${dil}"`);
      if (u.includes("/rest/v1/oyun_ayarlari")) {
        const liste = JSON.parse(m).filter((x) => x.anahtar !== "duello_v4_acik");
        liste.push({ anahtar: "duello_v4_acik", deger: "acik" });
        m = JSON.stringify(liste);
      }
      await r.fulfill({ response: y, body: m });
    } catch { try { await r.continue(); } catch { /* kapandı */ } }
  });
  const e = `${w}-${dil}`;
  console.log(`\n== ${w}×${h} ${dil}`);
  try {
    await s.goto(`${ADRES}/duello`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.waitForSelector(".qt-dk-seti-yuvalar", { timeout: 30000 });
    await s.waitForTimeout(1500);
    const metin = await s.locator("body").innerText();
    const dolu = await s.locator(".qt-dk-seti-yuva--dolu").count();
    ok("lobi: 3 yuva dolu", dolu === 3, String(dolu));
    ok("lobi: Baskın/Kalkan yok", !/Baskın|Kalkan|Ambush|Shield/.test(metin));
    ok("lobi: v4 kuralı", (dil === "tr" ? /üst üste 3 doğru/ : /3 in a row/).test(metin));
    ok("lobi: eski kural yok", !/12 puan|12 points/.test(metin));
    ok("kayıt: stoka göre sıralı, geçerli", Array.isArray(kayit) && kayit.join() === "elli,sure,zaman_baskisi", String(kayit));
    ok("yatay taşma yok", await s.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await s.screenshot({ path: path.join(CIKTI, `lobi-${e}.png`) });
  } catch (err) { ok("lobi açıldı", false, String(err).slice(0, 120)); try { await s.screenshot({ path: path.join(CIKTI, `hata-${e}.png`) }); console.log((await s.locator("body").innerText()).slice(0, 400)); } catch {} }
  ok("konsol hatası yok", konsol.length === 0, konsol.join(" | "));
  await b.close();
}
await tarayici.close();
console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
