// Giriş · Tanıtım · Kurulum turu (11 Eki 2026) — ekran ölçümü. CANLIYA HİÇ İSTEK GİTMEZ:
// Supabase'e giden her istek tarayıcıda kesilir; oturum sahte (yerel JWT), profil/ülke/şehir taklit.
//   npm run dev  (başka kabukta)   →   node araclar/giris-kurulum-ekran.mjs [--adres=http://localhost:5173]
// Çıktı: tasarim/giris-kurulum/*.png + konsola ölçüm (yatay taşma, kesik metin, üst üste binme).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const adres = (process.argv.find((a) => a.startsWith("--adres=")) ?? "--adres=http://localhost:5173").slice(8);
const KLASOR = path.resolve("tasarim/giris-kurulum");
fs.mkdirSync(KLASOR, { recursive: true });
const env = fs.readFileSync(".env", "utf8");
const REF = env.match(/VITE_SUPABASE_URL=https:\/\/([a-z0-9]+)\./)[1];
const UID = "00000000-0000-4000-8000-0000000000aa";

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: UID, role: "authenticated", exp: 4102444800, aud: "authenticated" })}.imza`;
const kullanici = { id: UID, aud: "authenticated", role: "authenticated", is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: "2026-10-11T00:00:00Z" };
const oturum = { access_token: jwt, refresh_token: "yerel", token_type: "bearer", expires_in: 3600, expires_at: 4102444800, user: kullanici };

const ULKELER = [{ kod: "TR", ad: "Türkiye" }, { kod: "DE", ad: "Almanya" }, { kod: "US", ad: "ABD" }];
const SEHIRLER = [{ ad: "İstanbul", nufus: 15 }, { ad: "Ankara", nufus: 5 }, { ad: "İzmir", nufus: 4 }];

function profilYap(d, dil) {
  return {
    id: UID, user_id: UID, username: "oyuncu_7f3a", takma_ad: d.ad ?? null, takma_ad_secildi: Boolean(d.ad),
    gorunen_ad: d.ad ?? "oyuncu_7f3a", avatar_url: d.avatar ?? null, gorunen_avatar: d.avatar ?? null,
    avatar_onayli: Boolean(d.avatarOnay), ulke: d.ulke ?? null, sehir: d.sehir ?? null, dil,
    coin: 0, elmas: 0, xp: 0, level: 1, kosullar_kabul: true,
  };
}

const sonuclar = [];
const tarayici = await chromium.launch({ channel: "chrome" });

async function baglamAc(dil, vp, oturumlu, durum) {
  const baglam = await tarayici.newContext({ viewport: vp, deviceScaleFactor: 1, locale: dil === "en" ? "en-US" : "tr-TR" });
  const disari = [];
  await baglam.route(/\.(mp3|ogg|wav|m4a)(\?|$)/, (r) => r.abort());
  await baglam.route(new RegExp(`${REF}\\.supabase\\.co`), async (r) => {
    const u = r.request().url();
    const json = (v) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(v) });
    if (/\/realtime\//.test(u)) return r.abort();
    if (/\/auth\/v1\/user/.test(u)) return oturumlu ? json(kullanici) : r.fulfill({ status: 401, body: "{}" });
    if (/\/auth\/v1\/settings/.test(u)) return json({ external: { google: true, anonymous_users: true }, disable_signup: false });
    if (/\/auth\/v1\//.test(u)) { disari.push(u); return r.fulfill({ status: 400, body: "{}" }); }
    if (/\/rpc\/profilim/.test(u)) return json(profilYap(durum.p, dil));
    // Kilitli avatar taklidi: dört avatar ücretli + sahipsiz (1039 edinme kartı yolu)
    if (/\/rpc\/avatar_sahiplik_durumu/.test(u)) return json(["ahtapot-k13", "ari-k14", "asci-k23", "tilki-k04"].map((a, i) => ({ url: `/avatars/pro/${a}.svg`, anahtar: a, nadirlik: i < 2 ? "epik" : "nadir", fiyat: 40, sahibim: false, satilik: true })));
    if (/\/rest\/v1\/ulkeler/.test(u)) return json(ULKELER);
    if (/\/rest\/v1\/sehirler/.test(u)) return json(SEHIRLER);
    if (/\/rest\/v1\/profiles/.test(u)) return json([profilYap(durum.p, dil)]);
    // Diğer her şey: boş yanıt (yazma yok, canlıya gitmez)
    return json(/\/rpc\//.test(u) ? null : []);
  });
  await baglam.addInitScript(([anahtar, deger, dil, tanitimGordu]) => {
    try {
      if (deger) localStorage.setItem(anahtar, deger);
      localStorage.setItem("qt_dil", dil); localStorage.setItem("bildim_dil", dil);
      if (tanitimGordu) localStorage.setItem("bildim_tanitim", "1");
    } catch { /* yok */ }
  }, [`sb-${REF}-auth-token`, oturumlu ? JSON.stringify(oturum) : null, dil, durum.tanitimGordu]);
  return { baglam, disari };
}

const OLC = () => {
  const de = document.documentElement;
  const gor = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none" && !e.closest(".qt-gizli"); };
  // Düğme yazısı: büyük düğmede satır yüksekliği dikey "kesik" sayılıyordu — yalnız yatay kesilme ölçülür
  const kesik = [...document.querySelectorAll(".g-giris *, .qt-modal *")].filter((e) => gor(e) && e.children.length === 0 && e.textContent.trim()
    && !(e.classList.contains("qt-dugme-yazi") && e.scrollWidth <= e.clientWidth + 1)
    && ((e.scrollWidth > e.clientWidth + 1 && ["hidden", "clip"].includes(getComputedStyle(e).overflowX)) || (e.scrollHeight > e.clientHeight + 4 && getComputedStyle(e).overflowY === "hidden")))
    .map((e) => `${String(e.className).slice(0, 40)}:${e.textContent.trim().slice(0, 30)}`);
  // Üst üste binme: aynı kaptaki metin bloklarının kutuları kesişiyor mu (giriş modları, tanıtım, kurulum kartı)
  const kutular = [...document.querySelectorAll(".g-giris-mod-metin, .g-giris-mod-figur, .g-tanitim-baslik, .g-tanitim-metin, .g-tanitim-gorsel, .g-sihirbaz-kart-metin, .g-sihirbaz-kart-avatar, .g-sihirbaz-adimlar")].filter(gor);
  const bin = [];
  for (let i = 0; i < kutular.length; i++) for (let j = i + 1; j < kutular.length; j++) {
    const a = kutular[i].getBoundingClientRect(), b = kutular[j].getBoundingClientRect();
    if (kutular[i].contains(kutular[j]) || kutular[j].contains(kutular[i])) continue;
    const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (x > 1 && y > 1) bin.push(`${kutular[i].className.split(" ")[0]}×${kutular[j].className.split(" ")[0]}`);
  }
  const yatayTasan = [...document.querySelectorAll(".g-giris *, .qt-modal *")].filter(gor).filter((e) => e.getBoundingClientRect().right > innerWidth + 1).map((e) => String(e.className).slice(0, 30)).slice(0, 4);
  const modal = document.querySelector(".qt-modal");
  return { yatay: de.scrollWidth - de.clientWidth, kesik, bin, yatayTasan, modalTasar: modal ? modal.scrollHeight > modal.clientHeight + 1 : false };
};

async function kaydet(sayfa, ad, ek = {}) {
  await sayfa.waitForTimeout(450);
  const o = await sayfa.evaluate(OLC);
  await sayfa.screenshot({ path: path.join(KLASOR, `${ad}.png`), fullPage: ek.tam ?? false });
  const ok = o.yatay <= 0 && o.kesik.length === 0 && o.bin.length === 0 && o.yatayTasan.length === 0;
  sonuclar.push({ ad, ok, ...o, ...ek.bilgi });
  console.log(`${ok ? "✓" : "✗"} ${ad}`, ok ? "" : JSON.stringify(o), ek.bilgi ? JSON.stringify(ek.bilgi) : "");
}

for (const dil of ["tr", "en"]) {
  for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 780 }]) {
    const e = `${vp.width}x${vp.height}-${dil}`;
    // 1) Giriş (oturumsuz)
    {
      const durum = { p: {}, tanitimGordu: false };
      const { baglam, disari } = await baglamAc(dil, vp, false, durum);
      const s = await baglam.newPage();
      await s.goto(`${adres}/`, { waitUntil: "networkidle" });
      await s.waitForSelector(".g-giris-modlar", { timeout: 15000 });
      const bilgi = await s.evaluate(() => {
        const alt = (q) => Math.round(document.querySelector(q)?.getBoundingClientRect().bottom ?? -1);
        const ust = (q) => Math.round(document.querySelector(q)?.getBoundingClientRect().top ?? -1);
        const dugmeler = [...document.querySelectorAll(".g-giris-kart .qt-dugme")];
        return { sonDugmeAlt: Math.round(dugmeler.at(-1).getBoundingClientRect().bottom), modlarUst: ust(".g-giris-modlar"), modlarAlt: alt(".g-giris-modlar"), ekran: innerHeight };
      });
      bilgi.dugmelerIlkEkranda = bilgi.sonDugmeAlt <= bilgi.ekran;
      bilgi.modlarGorunur = bilgi.modlarUst < bilgi.ekran;
      await kaydet(s, `giris-${e}`, { bilgi });
      await kaydet(s, `giris-tam-${e}`, { tam: true });
      if (disari.length) console.log("  auth isteği kesildi:", disari.length);
      await baglam.close();
    }
    // 2) Tanıtım 4 kart + kurulum 3 adım (boş + dolu)
    {
      const durum = { p: {}, tanitimGordu: false };
      const { baglam } = await baglamAc(dil, vp, true, durum);
      const s = await baglam.newPage();
      await s.goto(`${adres}/`, { waitUntil: "networkidle" });
      await s.waitForSelector(".g-tanitim", { timeout: 15000 });
      for (let k = 1; k <= 4; k++) {
        await kaydet(s, `tanitim-${k}-${e}`);
        await s.locator(".g-tanitim > .qt-dugme").last().click();
      }
      await s.waitForSelector(".g-sihirbaz", { timeout: 10000 });
      await s.locator(".g-sihirbaz input").first().fill("");
      await kaydet(s, `kurulum-1-bos-${e}`);
      await s.locator(".g-sihirbaz input").first().fill("BilgeKartal");
      await kaydet(s, `kurulum-1-dolu-${e}`);
      durum.p = { ad: "BilgeKartal" };
      await s.locator(".g-sihirbaz-adim .qt-dugme").last().click();
      await s.waitForSelector(".g-avatar-izgara", { timeout: 10000 });
      await kaydet(s, `kurulum-2-bos-${e}`);
      await s.locator(".g-avatar-sec:not(.qt-av-kilitli)").first().click();
      const avatar = await s.locator(".g-avatar-sec--secili img").getAttribute("src");
      const sira = await s.evaluate(() => {
        const ogeler = [...document.querySelectorAll(".g-avatar-izgara > *")];
        const ilkKilit = ogeler.findIndex((x) => x.classList.contains("qt-av-kilitli"));
        const sonAcik = ogeler.map((x) => x.matches(".g-avatar-sec:not(.qt-av-kilitli)")).lastIndexOf(true);
        return { ilkKilit, sonAcik, baslik: Boolean(document.querySelector(".g-avatar-kilit-baslik")), dogruSira: ilkKilit === -1 || sonAcik < ilkKilit };
      });
      await kaydet(s, `kurulum-2-dolu-${e}`, { bilgi: sira });
      durum.p = { ad: "BilgeKartal", avatar: avatar?.split("?")[0], avatarOnay: true };
      await s.getByRole("button", { name: dil === "en" ? /Use this avatar/ : /Bu avatarı kullan/ }).click();
      await s.waitForSelector(".g-sihirbaz select", { timeout: 10000 });
      await kaydet(s, `kurulum-3-bos-${e}`);
      const sehirGirdi = s.locator(".g-sihirbaz input").first();
      await sehirGirdi.click(); await sehirGirdi.fill("Ank");
      await s.waitForTimeout(300);
      await s.getByRole("option", { name: /Ankara/ }).first().click().catch(async () => { await s.getByText("Ankara", { exact: true }).first().click(); });
      const kartKonum = await s.locator(".g-sihirbaz-kart-konum").innerText();
      await kaydet(s, `kurulum-3-dolu-${e}`, { bilgi: { kartKonum, sonDugme: await s.locator(".g-sihirbaz-adim > .qt-dugme").last().innerText() } });
      await baglam.close();
    }
  }
}
await tarayici.close();
const hatali = sonuclar.filter((x) => !x.ok);
console.log(`\n${sonuclar.length - hatali.length}/${sonuclar.length} ekran temiz`);
fs.writeFileSync(path.join(KLASOR, "olcum.json"), JSON.stringify(sonuclar, null, 2));
process.exit(hatali.length ? 1 : 0);
