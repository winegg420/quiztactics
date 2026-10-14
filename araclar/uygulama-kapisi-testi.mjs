// Uygulama kapısı testi — oyun yalnız kurulu uygulamada, tarayıcıda kurulum sayfası.
//
//   npm run build && npm run preview      # başka bir kabukta (4173)
//   node araclar/uygulama-kapisi-testi.mjs [--port=4173]
//
// localhost kapıdan serbest olduğu için sayfa "qt.test" adıyla açılır (Chrome adres eşlemesi
// 127.0.0.1'e yönlendirir). Supabase'e giden her istek kesilir: canlıya yük gitmez.
// Her durum bir kez açılır; döngü/yoklama yok.
import { chromium } from "playwright-core";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const PORT = Number(ARG.port || 4173);
const KOK = `http://qt.test:${PORT}`;
const KURULUM = "#g-kurulum-baslik";

const tarayici = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: [`--host-resolver-rules=MAP qt.test 127.0.0.1`],
});

let hata = 0;
const sonuc = (ad, tamam, ek = "") => {
  if (!tamam) hata++;
  console.log(`${tamam ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`);
};

/** Yeni bağlam: Supabase kesik; `kur` ilk yüklemeden önce çalışır (ortam taklidi). */
async function yeniSayfa({ kur, ua, viewport } = {}) {
  const baglam = await tarayici.newContext({ userAgent: ua, viewport: viewport ?? { width: 390, height: 844 } });
  await baglam.route(/supabase\.co/, (r) => r.abort());
  await baglam.route(/challenges\.cloudflare\.com/, (r) => r.abort());
  if (kur) await baglam.addInitScript(kur);
  const sayfa = await baglam.newPage();
  const konsol = [];
  sayfa.on("pageerror", (e) => konsol.push(e.message));
  return { baglam, sayfa, konsol };
}

async function kurulumVarMi(sayfa) {
  try {
    await sayfa.waitForSelector(`${KURULUM}, .g-giris-kart, .qt-sayfa`, { timeout: 15000 });
    await sayfa.waitForTimeout(300);
    return (await sayfa.locator(KURULUM).count()) > 0;
  } catch {
    return null;
  }
}

// 1) Tarayıcı sekmesi: kök ve oyun rotaları → kurulum
for (const yol of ["/", "/turnuva", "/duello", "/mac/abc", "/profil"]) {
  const { baglam, sayfa, konsol } = await yeniSayfa();
  await sayfa.goto(KOK + yol, { waitUntil: "domcontentloaded" });
  sonuc(`tarayıcı ${yol} → kurulum`, (await kurulumVarMi(sayfa)) === true, konsol.join(" | "));
  await baglam.close();
}

// 2) Serbest sayfalar tarayıcıda açılır
for (const yol of ["/gizlilik", "/kosullar", "/hesap-sil"]) {
  const { baglam, sayfa } = await yeniSayfa();
  await sayfa.goto(KOK + yol, { waitUntil: "domcontentloaded" });
  sonuc(`tarayıcı ${yol} → serbest`, (await kurulumVarMi(sayfa)) === false);
  await baglam.close();
}

// 3) ?dev=1: kapı açılır, adresten silinir, oturum boyunca kalır
{
  const { baglam, sayfa } = await yeniSayfa();
  await sayfa.goto(KOK + "/?dev=1", { waitUntil: "domcontentloaded" });
  sonuc("?dev=1 → kapı açık", (await kurulumVarMi(sayfa)) === false);
  sonuc("?dev=1 adresten silindi", !sayfa.url().includes("dev="), sayfa.url());
  await sayfa.goto(KOK + "/turnuva", { waitUntil: "domcontentloaded" });
  sonuc("?dev oturumda kalır (/turnuva)", (await kurulumVarMi(sayfa)) === false);
  await baglam.close();
}

// 4) Kurulu uygulama taklidi
const standalone = () => {
  const asil = window.matchMedia.bind(window);
  window.matchMedia = (q) => (/display-mode:\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : asil(q));
};
const iosStandalone = () => { Object.defineProperty(navigator, "standalone", { get: () => true }); };
for (const [ad, kur] of [["display-mode standalone", standalone], ["iOS navigator.standalone", iosStandalone]]) {
  const { baglam, sayfa } = await yeniSayfa({ kur });
  await sayfa.goto(KOK + "/turnuva", { waitUntil: "domcontentloaded" });
  sonuc(`${ad} → oyun açılır`, (await kurulumVarMi(sayfa)) === false);
  await baglam.close();
}

// 5) TWA: ilk açılış android-app:// referrer → oturum boyunca uygulama
{
  const twa = () => {
    if (!sessionStorage.getItem("twa-test")) {
      sessionStorage.setItem("twa-test", "1");
      Object.defineProperty(document, "referrer", { get: () => "android-app://com.quiztactics.twa/" });
    }
  };
  const { baglam, sayfa } = await yeniSayfa({ kur: twa });
  await sayfa.goto(KOK + "/", { waitUntil: "domcontentloaded" });
  sonuc("TWA referrer → oyun açılır", (await kurulumVarMi(sayfa)) === false);
  await sayfa.goto(KOK + "/turnuva", { waitUntil: "domcontentloaded" });
  sonuc("TWA oturumda kalır", (await kurulumVarMi(sayfa)) === false);
  await baglam.close();
}

// 6) /davet/:kod tarayıcıda: kurulum + kod saklanır
{
  const { baglam, sayfa } = await yeniSayfa();
  await sayfa.goto(KOK + "/davet/abcd1234", { waitUntil: "domcontentloaded" });
  const kurulum = await kurulumVarMi(sayfa);
  const kod = await sayfa.evaluate(() => localStorage.getItem("bildim_davet_kodu"));
  sonuc("/davet/:kod → kurulum + kod saklandı", kurulum === true && kod === "ABCD1234", `kod=${kod}`);
  await baglam.close();
}

// 7) ?dev metni sayfada görünmez
{
  const { baglam, sayfa } = await yeniSayfa();
  await sayfa.goto(KOK + "/", { waitUntil: "domcontentloaded" });
  await kurulumVarMi(sayfa);
  const metin = await sayfa.evaluate(() => document.body.innerText);
  sonuc("kurulum metninde 'dev' geçmez", !/\?dev|dev=1/i.test(metin));
  await baglam.close();
}

// ---------- Aşama 2: platforma göre kurulum yolu ----------
const UA = {
  iosSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  iosChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1",
  iosInstagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 340.0.0.22.109",
  androidChrome: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  androidInstagram: "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 Instagram 340.0.0.22.109",
  androidFacebook: "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/470.0.0.0;]",
  macSafari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  masaustuChrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  masaustuEdge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
  firefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
};
const MASA = { width: 1440, height: 900 };

/** Taklit beforeinstallprompt: uygulama modülleri inmeden (DOMContentLoaded) gönderilir — erken yakalama da sınanır. */
const sahteKurulum = () => {
  document.addEventListener("DOMContentLoaded", () => {
    const e = new Event("beforeinstallprompt", { cancelable: true });
    e.prompt = async () => { window.__istemAcildi = true; };
    e.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(e);
  });
};

async function senaryoOku(sayfa) {
  try {
    await sayfa.waitForSelector(".g-kurulum-icerik", { timeout: 15000 });
    return await sayfa.getAttribute(".g-kurulum-icerik", "data-senaryo");
  } catch {
    return null;
  }
}

for (const [ad, ua, beklenen, viewport] of [
  ["iOS Safari", UA.iosSafari, "ios-safari"],
  ["iOS Chrome", UA.iosChrome, "ios-safari-degil"],
  ["iOS Instagram", UA.iosInstagram, "ios-safari-degil"],
  ["Android Chrome (öneri yok)", UA.androidChrome, "android"],
  ["Android Instagram", UA.androidInstagram, "android-uygulama-ici"],
  ["Android Facebook", UA.androidFacebook, "android-uygulama-ici"],
  ["macOS Safari", UA.macSafari, "mac-safari", MASA],
  ["masaüstü Chrome", UA.masaustuChrome, "masaustu-chromium", MASA],
  ["masaüstü Edge", UA.masaustuEdge, "masaustu-chromium", MASA],
  ["masaüstü Firefox", UA.firefox, "masaustu-diger", MASA],
]) {
  const { baglam, sayfa, konsol } = await yeniSayfa({ ua, viewport });
  await sayfa.goto(KOK + "/turnuva", { waitUntil: "domcontentloaded" });
  const s = await senaryoOku(sayfa);
  sonuc(`${ad} → ${beklenen}`, s === beklenen, `bulunan=${s}${konsol.length ? " · " + konsol.join(" | ") : ""}`);
  if (beklenen === "android-uygulama-ici") {
    // intent:// gezinmesi headless tarayıcıda açılamaz; yalnız düğmenin varlığı ölçülür (gerçek cihaz: kontrol listesi).
    const href = (await sayfa.getByRole("button", { name: "Chrome'da aç" }).count()) === 1 ? "var" : null;
    sonuc(`${ad}: "Chrome'da aç" düğmesi var`, href !== null);
  }
  if (["masaustu-chromium", "mac-safari", "masaustu-diger"].includes(beklenen)) {
    const qr = await sayfa.locator(".g-kurulum-qr img").count();
    sonuc(`${ad}: QR görünür`, qr === 1);
  }
  await baglam.close();
}

// Android Chrome + kurulum önerisi: düğme → istem → "kuruldu"
{
  const { baglam, sayfa } = await yeniSayfa({ ua: UA.androidChrome, kur: sahteKurulum });
  await sayfa.goto(KOK + "/", { waitUntil: "domcontentloaded" });
  await senaryoOku(sayfa);
  const dugme = sayfa.getByRole("button", { name: "Uygulamayı yükle" });
  const var_ = (await dugme.count()) === 1;
  sonuc("Android + beforeinstallprompt → 'Uygulamayı yükle' düğmesi", var_);
  if (var_) {
    const kutu = await dugme.boundingBox();
    sonuc("kur düğmesi ≥44 px", kutu && kutu.height >= 44, `h=${kutu?.height}`);
    await dugme.click();
    await sayfa.waitForSelector('[data-senaryo="kuruldu"]', { timeout: 5000 }).catch(() => {});
    const acildi = await sayfa.evaluate(() => window.__istemAcildi === true);
    const kuruldu = (await sayfa.locator('[data-senaryo="kuruldu"]').count()) === 1;
    sonuc("istem açıldı + 'Uygulama kuruldu' gösterildi", acildi && kuruldu);
  }
  await baglam.close();
}

// İngilizce + görsel ölçüm (yatay taşma, ekran görüntüsü)
const GORSEL = ARG.gorsel ? String(ARG.gorsel) : null;
for (const [ad, ua, viewport, dil] of [
  ["390 iOS TR", UA.iosSafari, { width: 390, height: 844 }, "tr"],
  ["390 iOS EN", UA.iosSafari, { width: 390, height: 844 }, "en"],
  ["360 Android-uygulama-içi TR", UA.androidInstagram, { width: 360, height: 640 }, "tr"],
  ["1440 masaüstü Chrome EN", UA.masaustuChrome, MASA, "en"],
  ["1440 Firefox TR", UA.firefox, MASA, "tr"],
]) {
  const kur = dil === "en" ? () => { try { localStorage.setItem("bildim_dil", "en"); } catch { /* yok */ } } : undefined;
  const { baglam, sayfa, konsol } = await yeniSayfa({ ua, viewport, kur });
  await sayfa.goto(KOK + "/", { waitUntil: "domcontentloaded" });
  await senaryoOku(sayfa);
  await sayfa.waitForTimeout(400);
  const olc = await sayfa.evaluate(() => ({
    tasma: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    baslik: document.querySelector("#g-kurulum-baslik")?.textContent ?? "",
    kucukHedef: [...document.querySelectorAll(".g-kurulum-icerik button, .g-giris-dil button")]
      .map((b) => b.getBoundingClientRect()).filter((r) => r.height > 0 && r.height < 44).length,
  }));
  const dilTamam = dil === "en" ? olc.baslik === "Quiz Tactics is an app" : olc.baslik === "Quiz Tactics bir uygulama";
  sonuc(`${ad}: dil doğru, taşma yok, hedefler ≥44`, dilTamam && olc.tasma <= 0 && olc.kucukHedef === 0 && !konsol.length,
    `başlık="${olc.baslik}" taşma=${olc.tasma} küçük=${olc.kucukHedef}${konsol.length ? " · " + konsol.join(" | ") : ""}`);
  if (GORSEL) await sayfa.screenshot({ path: `${GORSEL}/kurulum-${ad.replace(/\s+/g, "-")}.png`, fullPage: true });
  await baglam.close();
}

await tarayici.close();
console.log(hata ? `\n${hata} HATA` : "\nTÜMÜ GEÇTİ");
process.exit(hata ? 1 : 0);
