// Cevap İmzası (1040) ekran doğrulaması — TAKLİT VERİYLE (sunucuya yazmaz: satın al / tak / maç RPC'leri tarayıcıda taklit).
// Her imza × 360/390 px × 4 bağlam (Dükkân demosu · Klasik · Ortak Hazine · Düello v4) için 3 kare (başlangıç / orta / son).
// Kare zamanı kesin: imza DOM'a girdiği anda sayfa içi saat dondurulur (CSS animasyonları duraklatılır, canvas imzalarda
// requestAnimationFrame + performance.now denetlenir) ve istenen ana ilerletilir.
// Ayrıca: rakip ekranında imza ASLA görünmez (iki istemci: A imzalı + doğru, B imzasız; B'nin ağ yanıtlarında imza yok) ·
// soru/faz değişince efekt anında temizlenir · tıklamayı engellemez · Yanan Kart / Elektrik Akımı kare süresi (4× CPU) ·
// yatay taşma · 44 px altı dokunma hedefi (Dükkân) · konsol hatası.
// Kullanım: npm run dev -- --port 5189 (başka kabukta) · node araclar/cevap-imzasi-ekran.mjs --adres=http://localhost:5189 [--yalniz=dukkan,klasik,hazine,duello,rakip,kare]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5189";
const YALNIZ = typeof ARG.yalniz === "string" ? new Set(ARG.yalniz.split(",")) : null;
const calis = (ad) => !YALNIZ || YALNIZ.has(ad);
const OTURUM = path.resolve(typeof ARG.oturum === "string" ? ARG.oturum : ".arayuz-denetim-oturum.json");   // --oturum=dosya
const CIKTI = path.resolve("tasarim/cevap-imzasi");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }

const IMZALAR = ARG.imza ? [ARG.imza] : ["imza_neon_tik", "imza_yildiz", "imza_ampul", "imza_elektrik", "imza_yanan_kart"];
const KISA = { imza_neon_tik: "neon", imza_yildiz: "yildiz", imza_ampul: "ampul", imza_elektrik: "elektrik", imza_yanan_kart: "yanan" };
// Kare anları (ms, imza başından): başlangıç / orta / son — maketteki sürelere göre
const KARELER = { neon: [90, 380, 720], yildiz: [90, 380, 700], ampul: [120, 450, 820], elektrik: [100, 450, 900], yanan: [150, 620, 1150] };
const EKRANLAR = [[360, 640], [390, 844]];
const KATALOG = [
  ["imza_neon_tik", "Neon Tik", "nadir", "coin", 750, 701], ["imza_yildiz", "Yıldız Patlaması", "nadir", "coin", 750, 702],
  ["imza_ampul", "Bilgi Ampulü", "epik", "elmas", 150, 703], ["imza_elektrik", "Elektrik Akımı", "epik", "elmas", 150, 704],
  ["imza_yanan_kart", "Yanan Kart", "efsanevi", "elmas", 300, 705],
].map(([anahtar, ad, n, para, fiyat, sira]) => ({ anahtar, tur: "cevap_imzasi", ad, ad_tr: ad, ad_en: ad, fiyat, icerik: { para, nadirlik: n }, sira,
  satilik: true, sahip: false, takili: false, kapali: false, onay: null }));

// ---------- Sayfa içi saat: imza belirince dondur, istenen ana ilerlet ----------
const SAAT = () => {
  const gercekRaf = window.requestAnimationFrame.bind(window);
  const gercekNow = performance.now.bind(performance);
  const gercekSil = Element.prototype.remove;
  let dondu = false, sanal = 0, kuyruk = [], bas = 0, animler = [], oge = null;
  window.__ci = { hazir: true, sayi: 0, son: null };
  const dondur = (n) => {
    dondu = true; oge = n; window.__ci.sayi++; window.__ci.son = n.className; window.__ci.bagli = n.isConnected; window.__ci.ebeveyn = n.parentElement?.className ?? null;
    sanal = gercekNow(); bas = n.classList.contains("ci-tuval") ? sanal - 0 : sanal;
    window.requestAnimationFrame = (f) => { kuyruk.push(f); return kuyruk.length; };
    performance.now = () => sanal;
    animler = document.getAnimations().filter((a) => a.effect?.target && n.contains(a.effect.target));
    animler.forEach((a) => a.pause());
    n.remove = function () { if (dondu) this.__bekleyen = true; else gercekSil.call(this); };
  };
  new MutationObserver((ml) => {
    if (!window.__ci.hazir || dondu) return;
    for (const m of ml) for (const n of m.addedNodes) {
      // StrictMode (geliştirme) efekti iki kez çalıştırır: ilk katman aynı görevde temizlenir → yalnız BAĞLI olanı dondur
      if (n.nodeType === 1 && n.isConnected && (n.classList.contains("ci-katman") || n.classList.contains("ci-tuval"))) { dondur(n); return; }
    }
  }).observe(document, { subtree: true, childList: true });
  window.__ciZaman = (t) => {
    animler.forEach((a) => { a.currentTime = t; });
    while (sanal < bas + t) { sanal = Math.min(sanal + 16.7, bas + t); const q = kuyruk; kuyruk = []; q.forEach((f) => f(sanal)); }
    const r = oge?.parentElement?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, w: r.width, h: r.height, bagli: oge.isConnected } : null;
  };
  window.__ciCoz = () => {
    dondu = false; performance.now = gercekNow; window.requestAnimationFrame = gercekRaf;
    const q = kuyruk; kuyruk = []; q.forEach((f) => gercekRaf(f));
    animler.forEach((a) => a.play());
    if (oge?.__bekleyen) gercekSil.call(oge);
    oge = null; animler = [];
  };
  window.__ciVar = () => document.querySelectorAll(".ci-katman, .ci-tuval").length;
};

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const olcum = { kareler: {}, kareSuresi: {}, denetim: {} };
const ONBELLEK = new Map();   // canlıya her GET en çok BİR kez
const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };

// ---------- Taklit veriler ----------
const KASA_ID = "0b6f6800-0000-4000-8000-00000000c1de";
const D4_ID = "0d0e1100-0000-4000-8000-0000000000c4";
const RAKIP = "0b6f6800-0000-4000-8000-0000000000aa";
const SORU = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], kategori: "cografya" };
const KASA_AYAR = { kasa_modu_acik: 1, kasa_odul_acik: 1, kasa_odul_carpani: 1, kasa_artis: 2, kasa_ikisi_dogru_artis: 6, kasa_hedef_puan: 80, kasa_max_tur: 36,
  kasa_soru_sn: 15, kasa_karar_sn: 5, kasa_sonuc_sn: 3, kasa_tavan: 80, kasa_devam_carpan: 2, kasa_acma_min: 0 };
function kasaDurum(ben, { faz = "sonuc", benDogru = true, rakipDogru = false } = {}) {
  const simdi = Date.now(); const iso = (ms) => new Date(simdi + ms).toISOString();
  const oy = (id, ad, puan) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/basortulu-y04.svg" : null, gorunum: null, unvan: null, puan, acma: 1 });
  const t = { id: KASA_ID, durum: "aktif", dereceli: true, faz, faz_bitis: iso(faz === "sonuc" ? 30000 : 12000), sunucu_zamani: new Date(simdi).toISOString(),
    ben, tur: 7, max_tur: 36, hedef: 80, altin: false, artis: 2, ikisi_artis: 6, kasa: 10, sahip: ben,
    oyuncular: [oy(ben, "Sen", 8), oy(RAKIP, "Deniz Yıldırımoğlu", 12)], karar: null, son_karar: { veren: ben, ac: false, deger: 8 }, soru: SORU,
    cevap: faz === "cevap" ? { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: true } : null, sonuc: null,
    sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 2000, gosterim_bas: iso(-3000) },
    kopuk: null, kazanan: null, sonuc_neden: null, terk: null, baglanmayan: null, gecmis: null };
  if (faz === "sonuc") t.sonuc = { tur: 7, altin: false, dogru_cevap: 1, artis: 2, kasa_once: 8, kasa_sonra: 10, sahip_once: RAKIP, sahip_sonra: benDogru && !rakipDogru ? ben : RAKIP,
    kazanan: null, benim_cevabim: benDogru ? 1 : 0, ben_dogru: benDogru, rakip_dogru: rakipDogru };
  return t;
}
function d4Durum(ben, { benDogru = true, rakipDogru = false, faz = "sonuc" } = {}) {
  const simdi = Date.now(); const iso = (ms) => new Date(simdi + ms).toISOString();
  const oy = (id, ad) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/samuray-y15.svg" : "/avatars/pro/tilki-k04.svg", gorunum: null, dogru: 2, unvan: null });
  const soruFazi = faz === "notr";
  return {
    surum: 4, id: D4_ID, durum: "aktif", dereceli: true, faz, faz_bitis: iso(30000), sunucu_zamani: new Date(simdi).toISOString(), ben, rakip: RAKIP,
    oyuncular: [oy(ben, "Sen"), oy(RAKIP, "Deniz Yıldırımoğlu")],
    v4: { kontrol: null, seri: 0, seri_hedef: 3, tur: 0, max_tur: 20, notr_seri: 1, notr_max: 5, son: false, soru_no: 2, kullanilan: [], ilk_mac: false, kart: null,
      benim_kategori: "cografya", rakip_kategori: "cografya", oto: false },
    soru: soruFazi ? { ...SORU } : null,
    cevap: soruFazi ? { benim_bitis: iso(12000), rakip_bitis: iso(12000), ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false, elli_kapali: null, ikinci_sans_ilk_cevap: null } : null,
    son_hamle: faz === "sonuc" ? { surum: 4, tip: "notr", no: 2, tur: 0, kazanan: null, seri_hedef: 3, notr_seri: 1, sonuc: benDogru && !rakipDogru ? "kontrol_aldi" : "ayni",
      kontrol_sonra: benDogru && !rakipDogru ? ben : rakipDogru && !benDogru ? RAKIP : null,
      oyuncular: { [ben]: { soru_id: "a", kategori: "cografya", cevap: benDogru ? 1 : 0, dogru: benDogru, yanitsiz: false, dogru_cevap: 1 },
                   [RAKIP]: { soru_id: "a", kategori: "cografya", cevap: rakipDogru ? 1 : 2, dogru: rakipDogru, yanitsiz: false, dogru_cevap: 1 } } } : null,
    skill: { kapali: false, set: ["elli", "sure", "zaman_baskisi"], izinli: ["elli", "sure"], toplam_hak: 4, tur_basi_hak: 2, soru_basi_hak: 1, kullanilan: 0, sayilar: {}, bu_soruda: 0,
      rakip_bu_soruda: false, soru_degistir_kilit: null, envanter: {}, fiyatlar: {}, coin: 120 },
    sureler: { kart: 10, cevap: 15, sonuc: 3, ek_sure: 5, zaman_baskisi_eksi: 5, nabiz: 10, kopuk: 25, gosterim_payi_ms: 2000, gosterim_bas: iso(-4000) },
    kazanan: null, terk_eden: null, odul: null, ezeli: null, gecmis: null, rovans: { isteyen: null, id: null, gecerli: false },
  };
}

// ---------- Bağlam ----------
async function baglam({ w, h, imza = null, sahne = {}, cpu = 1, ag = null }) {
  const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  durum.origins = (durum.origins || []).map((o) => ({ ...o, origin: kok,
    localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim", "qt_profil_onbellek"].includes(x.name)),
      { name: "bildim_dil", value: "tr" }, { name: "bildim_tanitim", value: "1" }] }));
  const b = await tarayici.newContext({ storageState: durum, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block" });
  await b.addInitScript(SAAT);
  const s = await b.newPage();
  const konsol = [];
  s.on("console", (m) => { if (m.type() === "error" && !/status of 400|Failed to load resource/.test(m.text())) konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  await s.route(/\/rest\/v1\//, async (r) => {
    const req = r.request(); const u = req.url();
    const json = (veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
    try {
      if (/\/rpc\/(kozmetik_satin_al|kozmetik_tak|avatar_satin_al|kasa_cevap|kasa_karar|duello_cevap|duello_kategori_sec)/.test(u)) return json({ message: "Ölçüm aracı: yazma kapalı" }, 400);
      if (u.includes("/rpc/kozmetik_katalogu")) return json(sahne.katalog ?? KATALOG);
      if (u.includes("/rpc/sahip_mi")) return json(false);
      if (u.includes("/rpc/avatar_katalogu_oyun")) return json([]);
      if (u.includes("/rpc/kasa_durum")) return json(kasaDurum(jwtSub(req), sahne.kasa));
      if (u.includes("/rpc/kasa_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
      if (u.includes("/rpc/kasa_aktif_benim")) return json([]);
      if (u.includes("/rpc/kasa_joker_durumu")) return json(null);
      if (u.includes("/rpc/duello_durum")) return json(d4Durum(jwtSub(req), sahne.d4));
      if (u.includes("/rpc/duello_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
      if (u.includes("/rpc/duello_baglanti")) return json({ kopuk: false });
      const anahtar = req.method() + " " + u + " " + (req.postData() ?? "");
      let y = ONBELLEK.get(anahtar);
      if (!y) {
        const g = await r.fetch({ timeout: 20000 });
        y = { status: g.status(), headers: g.headers(), body: await g.text() };
        if (g.status() < 500) ONBELLEK.set(anahtar, y);
      }
      let govde = y.body;
      if (u.includes("/rpc/profilim")) { const p = JSON.parse(govde); p.takili_cevap_imzasi = imza; p.dil = "tr"; Object.assign(p, { takma_ad_secildi: true, avatar_onayli: true, ulke: p.ulke ?? "TR", gorunen_ad: "Deneme", avatar_url: p.avatar_url ?? "/avatars/pro/tilki-k04.svg", kosullar_kabul_at: p.kosullar_kabul_at ?? new Date().toISOString() }); govde = JSON.stringify(p); }
      if (u.includes("/rest/v1/oyun_ayarlari")) {
        try { const l = JSON.parse(govde).filter((x) => !String(x.anahtar).startsWith("kasa_")); for (const [anahtar, deger] of Object.entries(KASA_AYAR)) l.push({ anahtar, deger }); govde = JSON.stringify(l); } catch { /* yanıt liste değil */ }
      }
      ag?.push({ u, govde });
      await r.fulfill({ status: y.status, headers: y.headers, body: govde });
    } catch { try { await r.continue(); } catch { /* sayfa kapandı */ } }
  });
  if (cpu > 1) { const c = await b.newCDPSession(s); await c.send("Emulation.setCPUThrottlingRate", { rate: cpu }); }
  return { b, s, konsol };
}

const bekleImza = async (s, ms = 9000) => { try { await s.waitForFunction(() => window.__ci?.sayi > 0, null, { timeout: ms, polling: 16 }); return true; } catch { return false; } };
/** Donmuş imzanın 3 karesini alır (kırpılmış: imzanın hedefi + çevresi). */
async function kareler(s, ad, imza, w, h) {
  const k = KISA[imza];
  const dosyalar = [];
  for (const [i, t] of KARELER[k].entries()) {
    const r = await s.evaluate((t) => window.__ciZaman(t), t);
    if (!r) break;
    const y0 = Math.max(0, Math.round(r.y - 80)), y1 = Math.min(h, Math.round(r.y + r.h + 70));
    const dosya = `${ad}-${k}-${w}-${["bas", "orta", "son"][i]}.png`;
    await s.screenshot({ path: path.join(CIKTI, dosya), clip: { x: 0, y: y0, width: w, height: Math.max(40, y1 - y0) }, animations: "allow" });
    dosyalar.push(dosya);
  }
  await s.evaluate(() => window.__ciCoz());
  return dosyalar;
}
const denetim = (s) => s.evaluate(() => {
  const yol = (el) => el.tagName.toLowerCase() + "." + String(el.className || "").split(/\s+/).slice(0, 2).join(".");
  const kucuk = [...document.querySelectorAll(".ci-dk button, .ci-dk a[href]")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44); }).map((e) => `${yol(e)} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
  return { yatayTasma: document.documentElement.scrollWidth - window.innerWidth, kucuk };
});

// ================= 1) DÜKKÂN DEMOSU =================
if (calis("dukkan")) for (const [w, h] of EKRANLAR) {
  console.log(`— Dükkân › Efekt ${w}`);
  const { b, s, konsol } = await baglam({ w, h });
  await s.goto(`${ADRES}/joker?sekme=efekt`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await s.waitForSelector(".ci-dk-kart", { timeout: 20000 });
  await s.waitForTimeout(900);
  const sekmeVar = await s.locator(".qt-dk-sekmeler", { hasText: "Efekt" }).count();
  ok(`${w}: Efekt sekmesi görünür (katalogda imza var)`, sekmeVar > 0);
  ok(`${w}: kural şeridi "Nadir avatar ve imzalar"`, (await s.locator(".qt-dk-kural").innerText()).includes("imzalar"));
  ok(`${w}: 5 kart`, (await s.locator(".ci-dk-kart").count()) === 5);
  await s.screenshot({ path: path.join(CIKTI, `dukkan-liste-${w}.png`), fullPage: true });
  olcum.denetim[`dukkan-${w}`] = await denetim(s);
  for (const [j, imza] of IMZALAR.entries()) {
    const kart = s.locator(".ci-dk-kart").nth(j);
    await s.evaluate(() => { window.__ci.sayi = 0; });
    await kart.locator(".ci-dk-ust").click();
    const oynadi = await bekleImza(s);
    ok(`${w}: ${KISA[imza]} demo oynadı`, oynadi);
    if (oynadi) {
      await kart.scrollIntoViewIfNeeded();
      olcum.kareler[`dukkan-${KISA[imza]}-${w}`] = await kareler(s, "dukkan", imza, w, h);
      if (j === 0) { olcum.denetim[`dukkan-demo-${w}`] = await denetim(s); await s.screenshot({ path: path.join(CIKTI, `dukkan-demo-acik-${w}.png`) }); }
    }
    // Tekrar oynat
    await s.evaluate(() => { window.__ci.sayi = 0; });
    await kart.getByRole("button", { name: /Tekrar oynat/ }).click();
    ok(`${w}: ${KISA[imza]} tekrar oynat`, await bekleImza(s, 4000));
    await s.evaluate(() => window.__ciCoz());
    await kart.locator(".ci-dk-ust").click();   // kapat → demo + efekt anında kalkar
    await s.waitForTimeout(50);
    ok(`${w}: ${KISA[imza]} kapatınca efekt temizlendi`, (await s.evaluate(() => window.__ciVar())) === 0);
  }
  // Satın alma onayı (taklit: yazma kapalı) — coin ve elmas pencereleri açılır
  await s.locator(".ci-dk-kart").nth(0).getByRole("button", { name: /al —/ }).click();
  await s.waitForSelector("[role=dialog]", { timeout: 5000 });
  await s.waitForTimeout(450);
  const onayMetni = await s.locator("[role=dialog]").innerText();
  ok(`${w}: Nadir → coin onay penceresi (10.000 → 9.250)`, onayMetni.includes("Neon Tik") && onayMetni.includes("9.250"), onayMetni.slice(0, 160));
  await s.screenshot({ path: path.join(CIKTI, `dukkan-onay-coin-${w}.png`) });
  olcum.denetim[`dukkan-onay-${w}`] = await denetim(s);
  await s.keyboard.press("Escape"); await s.waitForTimeout(300);
  ok(`${w}: konsol hatası yok`, konsol.length === 0, konsol.join(" | "));
  await b.close();
}

// ================= 1b) KOLEKSİYON (Profil › Koleksiyon › Cevap İmzası) =================
if (calis("koleksiyon")) for (const [w, h] of EKRANLAR) {
  console.log(`— Koleksiyon ${w}`);
  const katalog = KATALOG.map((x) => ({ ...x, sahip: ["imza_neon_tik", "imza_ampul"].includes(x.anahtar), takili: x.anahtar === "imza_ampul" }));
  const { b, s, konsol } = await baglam({ w, h, imza: "imza_ampul", sahne: { katalog } });
  await s.goto(`${ADRES}/profil?sekme=koleksiyon`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const bolum = s.locator("section", { has: s.locator("h2", { hasText: "Cevap İmzası" }) });
  await bolum.waitFor({ timeout: 20000 }).catch(() => {});
  ok(`${w}: Koleksiyon'da "Cevap İmzası" grubu`, (await bolum.count()) === 1);
  if (await bolum.count()) {
    await bolum.scrollIntoViewIfNeeded(); await s.waitForTimeout(400);
    const metin = await bolum.innerText();
    ok(`${w}: takılı işaretli (Bilgi Ampulü · Takılı)`, /Bilgi Ampulü\s*Takılı/.test(metin), metin.replace(/\s+/g, " ").slice(0, 200));
    ok(`${w}: kilitliler "Dükkân'da · fiyat"`, (metin.match(/Dükkân'da/g) ?? []).length === 3, metin.replace(/\s+/g, " ").slice(0, 200));
    ok(`${w}: Nadir kilitli coin'le (750), Epik/Efsanevi elmasla`, await bolum.locator(".qt-dc-fiyat--coin").count() === 1 && await bolum.locator(".qt-dc-fiyat--elmas").count() === 2);
    ok(`${w}: kilitli → /joker?sekme=efekt`, (await bolum.locator('a[href*="sekme=efekt"]').count()) === 3);
    await bolum.screenshot({ path: path.join(CIKTI, `koleksiyon-${w}.png`) });
  }
  olcum.denetim[`koleksiyon-${w}`] = await s.evaluate(() => ({ yatayTasma: document.documentElement.scrollWidth - window.innerWidth }));
  ok(`${w}: Koleksiyon yatay taşma yok`, olcum.denetim[`koleksiyon-${w}`].yatayTasma <= 0);
  ok(`${w}: Koleksiyon konsol temiz`, konsol.length === 0, konsol.join(" | "));
  await b.close();
}

// ================= 2) KLASİK (gerçek QuestionCard) =================
if (calis("klasik")) for (const [w, h] of EKRANLAR) {
  console.log(`— Klasik ${w}`);
  for (const imza of IMZALAR) {
    const { b, s, konsol } = await baglam({ w, h, imza });
    await s.goto(`${ADRES}/araclar/cevap-imzasi-sahne/index.html`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.waitForSelector(".qt-sik", { timeout: 20000 });
    await s.waitForFunction(() => document.querySelectorAll(".qt-sik:not(:disabled)").length === 4, null, { timeout: 8000 }).catch(() => {});
    await s.waitForTimeout(1200);   // profilim (takılı imza) okunsun
    await s.locator(".qt-sik").nth(1).click();
    const oynadi = await bekleImza(s);
    ok(`${w}: Klasik ${KISA[imza]} doğru şıkta oynadı`, oynadi);
    if (oynadi) {
      const hedefDogru = await s.evaluate(() => { const n = document.querySelector(".ci-katman, .ci-tuval"); return n?.parentElement?.querySelector(".qt-sik")?.className ?? ""; });
      ok(`${w}: Klasik ${KISA[imza]} hedef = doğru şık`, hedefDogru.includes("qt-sik--dogru"), hedefDogru);
      olcum.kareler[`klasik-${KISA[imza]}-${w}`] = await kareler(s, "klasik", imza, w, h);
    }
    if (imza === "imza_neon_tik") {
      const pe = await s.evaluate(() => getComputedStyle(document.querySelector(".ci-katman") ?? document.body).pointerEvents);
      olcum.denetim[`klasik-pe-${w}`] = pe;
    }
    ok(`${w}: Klasik ${KISA[imza]} konsol temiz`, konsol.length === 0, konsol.join(" | "));
    await b.close();
  }
  // Yanlış cevapta oynamaz + imza takılı değilse hiçbir şey değişmez
  for (const [ad, imza, sik] of [["yanlis", "imza_yildiz", 0], ["imzasiz", null, 1]]) {
    const { b, s } = await baglam({ w, h, imza });
    await s.goto(`${ADRES}/araclar/cevap-imzasi-sahne/index.html`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.waitForSelector(".qt-sik", { timeout: 20000 }); await s.waitForTimeout(1200);
    await s.locator(".qt-sik").nth(sik).click();
    ok(`${w}: Klasik ${ad} → imza yok`, !(await bekleImza(s, 1800)));
    await b.close();
  }
}

// ================= 3) ORTAK HAZİNE (gerçek KasaPage) =================
if (calis("hazine")) for (const [w, h] of EKRANLAR) {
  console.log(`— Ortak Hazine ${w}`);
  for (const imza of IMZALAR) {
    const { b, s, konsol } = await baglam({ w, h, imza, sahne: { kasa: { faz: "sonuc", benDogru: true } } });
    await s.goto(`${ADRES}/kasa/${KASA_ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const oynadi = await bekleImza(s, 15000);
    ok(`${w}: Hazine ${KISA[imza]} doğru şıkta oynadı`, oynadi);
    if (oynadi) {
      const hedef = await s.evaluate(() => document.querySelector(".ci-katman, .ci-tuval")?.parentElement?.querySelector(".qt-sik")?.className ?? "");
      ok(`${w}: Hazine ${KISA[imza]} hedef = doğru şık`, hedef.includes("qt-sik--dogru"), hedef);
      olcum.kareler[`hazine-${KISA[imza]}-${w}`] = await kareler(s, "hazine", imza, w, h);
    }
    ok(`${w}: Hazine ${KISA[imza]} konsol temiz`, konsol.length === 0, konsol.join(" | "));
    await b.close();
  }
}

// ================= 4) DÜELLO v4 (gerçek DuelloPage › Duello4Arena) =================
if (calis("duello")) for (const [w, h] of EKRANLAR) {
  console.log(`— Düello v4 ${w}`);
  for (const imza of IMZALAR) {
    const { b, s, konsol } = await baglam({ w, h, imza, sahne: { d4: { benDogru: true } } });
    await s.goto(`${ADRES}/duello/${D4_ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const oynadi = await bekleImza(s, 15000);
    ok(`${w}: Düello ${KISA[imza]} "Sen · Doğru" satırında oynadı`, oynadi);
    if (oynadi) {
      const hedef = await s.evaluate(() => document.querySelector(".ci-katman, .ci-tuval")?.parentElement?.className ?? "");
      ok(`${w}: Düello ${KISA[imza]} hedef = benim doğru satırım`, /d4-cevap--ben/.test(hedef) && /d4-cevap--dogru/.test(hedef), hedef);
      olcum.kareler[`duello-${KISA[imza]}-${w}`] = await kareler(s, "duello", imza, w, h);
    }
    ok(`${w}: Düello ${KISA[imza]} konsol temiz`, konsol.length === 0, konsol.join(" | "));
    await b.close();
  }
}

// ================= 5) RAKİP ASLA GÖRMEZ (iki istemci) =================
if (calis("rakip")) {
  console.log("— Rakip ekranı");
  const [w, h] = [390, 844];
  // A: imza takılı + doğru · B: imzasız, aynı maçta (A doğru, B yanlış) — B'de imza ÇİZİLMEZ, ağında imza geçmez
  for (const mod of ["hazine", "duello"]) {
    const agB = [];
    const A = await baglam({ w, h, imza: "imza_yanan_kart", sahne: { kasa: { benDogru: true }, d4: { benDogru: true } } });
    const B = await baglam({ w, h, imza: null, ag: agB, sahne: { kasa: { benDogru: false, rakipDogru: true }, d4: { benDogru: false, rakipDogru: true } } });
    const yol = mod === "hazine" ? `/kasa/${KASA_ID}` : `/duello/${D4_ID}`;
    await Promise.all([A.s.goto(ADRES + yol, { waitUntil: "domcontentloaded" }), B.s.goto(ADRES + yol, { waitUntil: "domcontentloaded" })]);
    const aOynadi = await bekleImza(A.s, 15000);
    await B.s.waitForSelector(mod === "hazine" ? ".qt-sik--dogrusu, .qt-sik--dogru" : ".d4-cevap--rakip.d4-cevap--dogru", { timeout: 15000 }).catch(() => {});
    await B.s.waitForTimeout(1600);
    ok(`${mod}: A (imzalı, doğru) imzayı görür`, aOynadi);
    ok(`${mod}: B (rakip) ekranında imza YOK`, (await B.s.evaluate(() => window.__ci.sayi)) === 0);
    ok(`${mod}: B'nin ağ yanıtlarında A'nın imzası yok`, !agB.some((x) => /imza_yanan_kart|imza_[a-z_]+/.test(x.govde)), agB.filter((x) => /imza_/.test(x.govde)).map((x) => x.u).join(","));
    await B.s.screenshot({ path: path.join(CIKTI, `rakip-${mod}-B.png`) });
    await A.b.close(); await B.b.close();
  }
  // B'nin KENDİ imzası takılı ama B yanlış, A doğru → B'de yine yok
  const B2 = await baglam({ w, h, imza: "imza_neon_tik", sahne: { d4: { benDogru: false, rakipDogru: true } } });
  await B2.s.goto(`${ADRES}/duello/${D4_ID}`, { waitUntil: "domcontentloaded" });
  await B2.s.waitForSelector(".d4-cevap--rakip.d4-cevap--dogru", { timeout: 15000 }).catch(() => {});
  await B2.s.waitForTimeout(1600);
  ok("duello: imzası takılı ama yanlış cevaplayan → rakibin doğru satırında imza oynamaz", (await B2.s.evaluate(() => window.__ci.sayi)) === 0);
  await B2.b.close();
}

// ================= 6) FAZ DEĞİŞİNCE ANINDA TEMİZLİK + KARE SÜRESİ (4× CPU) =================
if (calis("kare")) {
  console.log("— Temizlik + kare süresi (4× CPU)");
  const [w, h] = [390, 844];
  // Ölçüm penceresi: tıklamadan sonra imza süresi kadar. "aralik" = ardışık kareler arası (ekranda görülen akıcılık);
  // "cizim" = karedeki requestAnimationFrame işlerinin toplam süresi (imzanın canvas çizimi burada). Taban = aynı tıklama, imzasız
  // (doğru cevap konfetisi + sonuç anı + ses yine oynar) → imzanın payı ayrılır.
  const SURE_MS = { imza_yanan_kart: 1350, imza_elektrik: 1000, taban: 1350 };
  const TEKRAR = Number(ARG.tekrar ?? 3);
  const ist = (dizi) => { const so = [...dizi].sort((a, d) => a - d); const p = (q) => so.length ? +so[Math.min(so.length - 1, Math.floor(q * so.length))].toFixed(1) : null;
    return { kare: so.length, ort: so.length ? +(so.reduce((a, d) => a + d, 0) / so.length).toFixed(1) : null, p50: p(0.5), p95: p(0.95), en: p(1) }; };
  const medyan = (l) => { const so = l.filter((v) => v != null).sort((a, d) => a - d); return so.length ? so[Math.floor(so.length / 2)] : null; };
  for (const imza of ["taban", "imza_yanan_kart", "imza_elektrik"]) {
    const ad = imza === "taban" ? "taban" : KISA[imza];
    const kosular = [];
    for (let n = 0; n < TEKRAR; n++) {
      const { b, s } = await baglam({ w, h, imza: imza === "taban" ? null : imza, cpu: 4 });
      await s.goto(`${ADRES}/araclar/cevap-imzasi-sahne/index.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await s.waitForSelector(".qt-sik", { timeout: 30000 }); await s.waitForTimeout(2500);
      await s.evaluate((ms) => {
        window.__ci.hazir = false;   // dondurma yok: gerçek zaman
        window.__kare = []; window.__cizim = []; window.__olc = false;
        const raf = window.requestAnimationFrame.bind(window);
        let kareIs = 0;
        window.requestAnimationFrame = (f) => raf((t) => { const a = performance.now(); f(t); kareIs += performance.now() - a; });
        let son = null;
        const dongu = (t) => { if (window.__olc) { if (son != null) { window.__kare.push([t - son, Boolean(document.querySelector(".ci-tuval")), t - (window.__tik ?? 1e12)]); window.__cizim.push(kareIs); } son = t; } kareIs = 0; raf(dongu); };
        raf(dongu);
        window.__olcBasla = () => { window.__olc = true; setTimeout(() => { window.__olc = false; }, ms); };
      }, SURE_MS[imza]);
      await s.evaluate(() => { window.__olcBasla(); window.__tik = performance.now(); });
      await s.locator(".qt-sik").nth(1).click();
      await s.waitForTimeout(SURE_MS[imza] + 1200);
      const { kk, c } = await s.evaluate(() => ({ kk: window.__kare.slice(), c: window.__cizim.slice() }));
      const k = kk.map((x) => x[0]);
      // "akis": imzanın KENDİ süresi — canvas ekrandayken, ilk 2 kare (tıklama anı + canvas kurulumu: gürültü/eşik dizileri) hariç.
      // Tabanda aynı pencere: tıklamadan 50 ms sonrası (tıklama anı tabanda da 100–170 ms'lik tek kare üretir).
      const akis = imza === "taban" ? kk.filter((x) => x[2] > 50).map((x) => x[0]).slice(0, 70) : kk.filter((x) => x[1]).map((x) => x[0]).slice(2);
      const kurulum = imza === "taban" ? null : kk.filter((x) => x[1]).slice(0, 2).map((x) => +x[0].toFixed(1));
      kosular.push({ aralik: ist(k), akis: ist(akis), kurulum, kacan: akis.filter((v) => v > 20).length, cizim: ist(c) });
      await b.close();
    }
    olcum.kareSuresi[ad] = { adim: imza === "imza_yanan_kart" ? "IZGARA_ADIMI (kodda)" : null, tekrar: TEKRAR, kosular,
      medyan: { aralikP95: medyan(kosular.map((x) => x.aralik.p95)), akisP95: medyan(kosular.map((x) => x.akis.p95)), akisP50: medyan(kosular.map((x) => x.akis.p50)), cizimP95: medyan(kosular.map((x) => x.cizim.p95)) } };
    console.log("   ", ad, JSON.stringify(olcum.kareSuresi[ad].medyan));
    if (imza !== "taban") ok(`${ad}: 4× CPU kare aralığı p95 < 33 ms (${TEKRAR} koşu medyanı, tıklama anı hariç)`, (olcum.kareSuresi[ad].medyan.akisP95 ?? 999) < 33, JSON.stringify(olcum.kareSuresi[ad].medyan));
  }
  // Temizlik: imza sürerken bileşen kalkarsa (yeni soru/faz) canvas + katman ANINDA kalkar
  const { b, s } = await baglam({ w, h, imza: "imza_yanan_kart" });
  await s.goto(`${ADRES}/araclar/cevap-imzasi-sahne/index.html`, { waitUntil: "domcontentloaded" });
  await s.waitForSelector(".qt-sik"); await s.waitForTimeout(1200);
  await s.evaluate(() => { window.__ci.hazir = false; });
  await s.locator(".qt-sik").nth(1).click();
  await s.waitForSelector(".ci-tuval", { state: "attached", timeout: 5000 });
  // tıklamayı engellemez: imza sürerken "Adil" düğmesi tıklanabilir
  const tik = await s.locator(".m1-oylama button").first().click({ timeout: 1500, trial: true }).then(() => true).catch(() => false);
  ok("imza sürerken alttaki düğme tıklanabilir (pointer-events: none)", tik);
  await s.evaluate(() => { document.getElementById("root").innerHTML = ""; });   // yeni faz taklidi: soru kartı kalkar
  await s.waitForTimeout(50);
  ok("soru kalkınca canvas anında kalktı", (await s.evaluate(() => document.querySelectorAll(".ci-tuval, .ci-katman").length)) === 0);
  await b.close();
}

await tarayici.close();
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(olcum, null, 2));
console.log(`\n${gecti} geçti · ${kaldi} kaldı · çıktı ${path.relative(process.cwd(), CIKTI)}`);
process.exit(kaldi ? 1 : 0);
