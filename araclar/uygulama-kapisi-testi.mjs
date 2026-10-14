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

await tarayici.close();
console.log(hata ? `\n${hata} HATA` : "\nTÜMÜ GEÇTİ");
process.exit(hata ? 1 : 0);
