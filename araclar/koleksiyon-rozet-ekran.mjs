// Koleksiyon rozetleri (1065) — Profil › Rozetler'de "Koleksiyon" grubu, madalyon çizimi ve TR/EN adlar.
// TAM TAKLİT (11 Eki 2026): sahte JWT + /auth, /rest tarayıcıda taklit → canlı Supabase'e HİÇ istek gitmez.
// Kullanım:
//   npx vite --port 5187 --strictPort                 # ayrı kabukta
//   node araclar/koleksiyon-rozet-ekran.mjs [--adres=http://localhost:5187]
// Çıktı: tasarim/koleksiyon-rozet/rozetler-<g>x<y>-<dil>.png + olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5187");
const CIKTI = path.resolve("tasarim/koleksiyon-rozet");
fs.mkdirSync(CIKTI, { recursive: true });

const REF = (fs.readFileSync(".env", "utf8").match(/VITE_SUPABASE_URL=https:\/\/([a-z0-9]+)\./) || [])[1];
const BEN = "0c1a5100-0000-4000-8000-000000000001";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: BEN, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 86400 })}.imza`;
const KULLANICI = { id: BEN, aud: "authenticated", role: "authenticated", email: "", is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
const OTURUM = { access_token: JWT, refresh_token: "taklit", token_type: "bearer", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, user: KULLANICI };
const durumDosya = { cookies: [], origins: [{ origin: new URL(ADRES).origin, localStorage: [{ name: `sb-${REF}-auth-token`, value: JSON.stringify(OTURUM) }] }] };
const profilim = (dil) => ({ id: BEN, gorunen_ad: "Sen", takma_ad: "Sen", takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", sehir: "İstanbul", dil,
  coin: 120, elmas: 10, puan: 100, seviye: 5, xp: 0, gorunen_avatar: null, kurulum_tamam: true, toplam_mac: 20, koleksiyon_puani: 64 });

// Sunucu (rozetlerim) adları dile göre döndürür (rozet_dil_en); taklit aynısını yapar.
const KOL = [
  ["koleksiyon_25", "bronz", 25, 10, "Koleksiyoncu I", "Collector I", "Koleksiyon Puanın 25'e ulaşsın.", "Reach 25 Collection Points."],
  ["koleksiyon_50", "gumus", 50, 25, "Koleksiyoncu II", "Collector II", "Koleksiyon Puanın 50'ye ulaşsın.", "Reach 50 Collection Points."],
  ["koleksiyon_100", "altin", 100, 50, "Koleksiyoncu III", "Collector III", "Koleksiyon Puanın 100'e ulaşsın.", "Reach 100 Collection Points."],
  ["koleksiyon_200", "elmas", 200, 100, "Büyük Koleksiyoncu", "Grand Collector", "Koleksiyon Puanın 200'e ulaşsın.", "Reach 200 Collection Points."],
];
const rozetVeri = (dil) => {
  const en = dil === "en";
  const rozetler = KOL.map(([anahtar, kademe, esik, coin, tr, enAd, atr, aen], i) => {
    const kaz = esik <= 64;
    return { anahtar, grup: "koleksiyon", kademe, esik, coin, gizli: false, sira: 951 + i, ikon: "diamonds-four", cerceve: null,
      ad: en ? enAd : tr, aciklama: en ? aen : atr, kazanildi: kaz, kazanildi_at: kaz ? new Date().toISOString() : null,
      deger: Math.min(64, esik), hedef: esik };
  });
  rozetler.unshift({ anahtar: "level_5", grup: "level", kademe: "bronz", esik: 5, coin: 10, gizli: false, sira: 101, ikon: "star", cerceve: null,
    ad: "Level 5", aciklama: en ? "Reach level 5." : "5. level'a ulaş.", kazanildi: true, kazanildi_at: new Date().toISOString(), deger: 5, hedef: 5 });
  return { gruplar: [{ anahtar: "level", sira: 1, ikon: "star", ad: "Level" }, { anahtar: "koleksiyon", sira: 10, ikon: "diamonds-four", ad: en ? "Collection" : "Koleksiyon" }],
    rozetler, vitrin: [], vitrin_max: 3, ozet: { kazanilan: 3, toplam: 5 } };
};

const json = (r, v, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(v) });
async function yonlendir(r, dil) {
  const req = r.request();
  const yol = req.url().split("/rest/v1/")[1].split("?")[0];
  const nesne = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
  try {
    if (yol.startsWith("rpc/")) {
      const fn = yol.slice(4);
      if (fn === "profilim") return json(r, profilim(dil));
      if (fn === "rozetlerim") return json(r, rozetVeri(dil));
      if (fn === "sezon_ozetim") return json(r, { gorunur: false });
      return json(r, null);
    }
    return json(r, nesne ? null : []);
  } catch { try { await r.abort(); } catch { /* kapandı */ } }
}

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({ storageState: durumDosya, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: "block" });
const sonuc = [];
try {
  for (const [g, h, dil] of [[390, 844, "tr"], [360, 780, "en"]]) {
    const sayfa = await baglam.newPage();
    const hatalar = [];
    sayfa.on("pageerror", (e) => hatalar.push(String(e).slice(0, 140)));
    await sayfa.setViewportSize({ width: g, height: h });
    await sayfa.addInitScript((d) => { try { localStorage.setItem("bildim_dil", d); localStorage.setItem("bildim_tanitim", "1"); } catch { /* yok */ } }, dil);
    await sayfa.route(/\/rest\/v1\//, (r) => yonlendir(r, dil));
    await sayfa.route(/\/auth\/v1\//, (r) => json(r, /\/user/.test(r.request().url()) ? KULLANICI : OTURUM));
    await sayfa.route(/\/functions\/v1\//, (r) => json(r, {}));
    await sayfa.route(/\/realtime\/|\.(mp3|ogg|wav|m4a)(\?|$)/, (r) => r.abort());
    const kayit = { boyut: `${g}x${h}`, dil };
    try {
      await sayfa.goto(`${ADRES}/profil?sekme=rozet`, { waitUntil: "domcontentloaded" });
      await sayfa.getByText(dil === "en" ? "Collection" : "Koleksiyon", { exact: true }).first().waitFor({ timeout: 30000 });
      await sayfa.waitForTimeout(1200);
      const baslik = sayfa.getByText(dil === "en" ? "Collection" : "Koleksiyon", { exact: true }).first();
      await baslik.scrollIntoViewIfNeeded();
      await sayfa.waitForTimeout(400);
      const metin = await sayfa.evaluate(() => document.body.innerText);
      const adlar = dil === "en" ? ["Collector I", "Collector II", "Collector III", "Grand Collector"] : ["Koleksiyoncu I", "Koleksiyoncu II", "Koleksiyoncu III", "Büyük Koleksiyoncu"];
      kayit.adlar_gorunur = adlar.filter((a) => metin.includes(a));
      kayit.madalyon_svg = await sayfa.locator("svg").count();
      kayit.yatay_tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      kayit.hata = hatalar;
      await sayfa.screenshot({ path: path.join(CIKTI, `rozetler-${g}x${h}-${dil}.png`) });
    } catch (e) { kayit.hata = [...hatalar, String(e).slice(0, 160)]; }
    sonuc.push(kayit);
    console.log(JSON.stringify(kayit));
    await sayfa.close();
  }
} finally {
  await tarayici.close();
}
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(sonuc, null, 2));
