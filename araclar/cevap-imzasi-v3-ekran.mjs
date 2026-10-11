// Cevap İmzası v3 (11 Eki 2026) ekran doğrulaması — TAKLİT VERİYLE (sunucuya yazmaz; yazma RPC'leri tarayıcıda kesilir).
// Yıldız Patlaması v3 + Bilgi Ampulü v3: Klasik (gerçek QuestionCard sahnesi), Ortak Hazine (gerçek KasaPage, en üst şık) ve
// Dükkân demosunda 0/150/400/700/1000 ms kareleri + aynı anlarda maket (docs/cevap-imzasi-v3-maket.html) kareleri.
// Kare anı kesin: imza canvas'ı DOM'a girince sayfa saati dondurulur, rAF elle ilerletilir (maket de aynı yolla).
// Ölçer: kırpan ata (overflow) · şık kayması · yatay taşma · Neon Tik'te normal tik gizli / rakip avatarı yerinde ·
// imzasızda normal tik görünür · Yanan Kart oynamaz + Dükkân'da yok · konsol hatası · 4× CPU kare süresi (--yalniz=kare).
// Kullanım: npm run dev -- --port 5189 · node araclar/arayuz-denetim.mjs --adres=http://localhost:5189 --sadece-oturum
//           node araclar/cevap-imzasi-v3-ekran.mjs --adres=http://localhost:5189 [--yalniz=maket,klasik,hazine,dukkan,neon,yanan,kare] [--etiket=once]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5189";
const YALNIZ = typeof ARG.yalniz === "string" ? new Set(ARG.yalniz.split(",")) : null;
const calis = (ad) => !YALNIZ || YALNIZ.has(ad);
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/cevap-imzasi-v3");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs --sadece-oturum"); process.exit(1); }

const KARELER = [0, 150, 400, 700, 1000];
const EKRANLAR = [{ w: 390, h: 844, dil: "tr" }, { w: 360, h: 780, dil: "en" }];
const V3 = { imza_yildiz: "yildiz", imza_ampul: "ampul" };
const KATALOG = [
  ["imza_neon_tik", "Neon Tik", "nadir", "coin", 750, 701], ["imza_yildiz", "Yıldız Patlaması", "nadir", "coin", 750, 702],
  ["imza_ampul", "Bilgi Ampulü", "epik", "elmas", 150, 703], ["imza_elektrik", "Elektrik Akımı", "epik", "elmas", 150, 704],
  // eski önbellekli katalog taklidi: istemci dondurulmuş kalemi yine göstermemeli
  ["imza_yanan_kart", "Yanan Kart", "efsanevi", "elmas", 300, 705],
].map(([anahtar, ad, n, para, fiyat, sira]) => ({ anahtar, tur: "cevap_imzasi", ad, ad_tr: ad, ad_en: ad, fiyat, icerik: { para, nadirlik: n }, sira,
  satilik: true, sahip: false, takili: false, kapali: false, onay: null }));

// ---------- Sayfa içi saat (oyun): imza belirince dondur, istenen ana ilerlet ----------
const SAAT = () => {
  const gercekRaf = window.requestAnimationFrame.bind(window);
  const gercekNow = performance.now.bind(performance);
  const gercekSil = Element.prototype.remove;
  let dondu = false, sanal = 0, kuyruk = [], bas = 0, animler = [], oge = null;
  window.__ci = { hazir: true, sayi: 0 };
  // Dondurmadan hemen önce (aynı görevde) kurulan rAF da yakalansın: gerçek kare gelince saat donmuşsa kuyruğa girer
  window.requestAnimationFrame = (f) => gercekRaf((t) => { if (dondu) kuyruk.push(f); else f(t); });
  const dondur = (n) => {
    dondu = true; oge = n; window.__ci.sayi++; sanal = gercekNow(); bas = sanal;
    window.requestAnimationFrame = (f) => { kuyruk.push(f); return kuyruk.length; };
    performance.now = () => sanal;
    animler = document.getAnimations().filter((a) => a.effect?.target && n.contains(a.effect.target));
    animler.forEach((a) => a.pause());
    n.remove = function () { if (dondu) this.__bekleyen = true; else gercekSil.call(this); };
  };
  new MutationObserver((ml) => {
    if (!window.__ci.hazir || dondu) return;
    for (const m of ml) for (const n of m.addedNodes) {
      if (n.nodeType === 1 && n.isConnected && (n.classList.contains("ci-katman") || n.classList.contains("ci-tuval"))) { dondur(n); return; }
    }
  }).observe(document, { subtree: true, childList: true });
  // t: imza başından ms. Canvas'ın ilk karesi bas + 16,7'de (g = 0) → g = t için t + 16,7'ye ilerlet.
  window.__ciZaman = (t) => {
    animler.forEach((a) => { a.currentTime = t; });
    const hedef = bas + t + 16.7;
    while (sanal < hedef - 0.01) { sanal = Math.min(sanal + 16.7, hedef); const q = kuyruk; kuyruk = []; q.forEach((f) => f(sanal)); }
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
  // Kırpma / kayma / taşma ölçümü: imza canvas'ını kesen ata (overflow ≠ visible ve canvas'ı içermeyen)
  window.__ciDenetim = () => {
    const c = document.querySelector(".ci-tuval");
    const kirpan = [];
    if (c) {
      const r = c.getBoundingClientRect();
      for (let e = c.parentElement; e && e !== document.documentElement; e = e.parentElement) {
        const s = getComputedStyle(e);
        if ([s.overflowX, s.overflowY].some((o) => o !== "visible")) {
          const a = e.getBoundingClientRect();
          const kes = { ust: Math.max(0, a.top - r.top), alt: Math.max(0, r.bottom - a.bottom), sol: Math.max(0, a.left - r.left), sag: Math.max(0, r.right - a.right) };
          if (Object.values(kes).some((v) => v > 0.5) && !(e === document.body)) kirpan.push({ oge: e.tagName.toLowerCase() + "." + String(e.className).split(/\s+/).slice(0, 2).join("."), overflow: s.overflow, ...kes });
        }
      }
    }
    const r = c?.getBoundingClientRect();
    return { kirpan, tuval: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      yatayTasma: document.documentElement.scrollWidth - window.innerWidth,
      siklar: [...document.querySelectorAll(".qt-sik-yuva")].map((y) => { const b = y.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)].join(","); }) };
  };
};

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const olcum = { kareler: {}, denetim: {}, kareSuresi: {} };
const ONBELLEK = new Map();
const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };

// ---------- Ortak Hazine taklidi (sonuç fazı; doğru şık = sira, ben + rakip doğru → rakip avatarı doğru şıkta) ----------
const KASA_ID = "0b6f6800-0000-4000-8000-00000000c1de";
const RAKIP = "0b6f6800-0000-4000-8000-0000000000aa";
const SORU = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["Ankara", "İstanbul", "İzmir", "Bursa"], kategori: "cografya" };
const KASA_AYAR = { kasa_modu_acik: 1, kasa_odul_acik: 1, kasa_odul_carpani: 1, kasa_artis: 2, kasa_ikisi_dogru_artis: 6, kasa_hedef_puan: 80, kasa_max_tur: 36,
  kasa_soru_sn: 15, kasa_karar_sn: 5, kasa_sonuc_sn: 3, kasa_tavan: 80, kasa_devam_carpan: 2, kasa_acma_min: 0 };
function kasaDurum(ben, { sira = 0, rakipDogru = true } = {}) {
  const simdi = Date.now(); const iso = (ms) => new Date(simdi + ms).toISOString();
  const oy = (id, ad, puan) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/basortulu-y04.svg" : null, gorunum: null, unvan: null, puan, acma: 1 });
  return { id: KASA_ID, durum: "aktif", dereceli: true, faz: "sonuc", faz_bitis: iso(30000), sunucu_zamani: new Date(simdi).toISOString(),
    ben, tur: 7, max_tur: 36, hedef: 80, altin: false, artis: 2, ikisi_artis: 6, kasa: 10, sahip: ben,
    oyuncular: [oy(ben, "Sen", 8), oy(RAKIP, "Deniz Yıldırımoğlu", 12)], karar: null, son_karar: { veren: ben, ac: false, deger: 8 }, soru: SORU,
    cevap: null, sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 2000, gosterim_bas: iso(-3000) },
    sonuc: { tur: 7, altin: false, dogru_cevap: sira, artis: 6, kasa_once: 8, kasa_sonra: 14, sahip_once: RAKIP, sahip_sonra: RAKIP, kazanan: null,
      benim_cevabim: sira, ben_dogru: true, rakip_dogru: rakipDogru, rakip_cevabi: rakipDogru ? sira : (sira + 1) % 4 },
    kopuk: null, kazanan: null, sonuc_neden: null, terk: null, baglanmayan: null, gecmis: null };
}

async function baglam({ w, h, dil = "tr", imza = null, kasa = {}, cpu = 1 }) {
  const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  durum.origins = (durum.origins || []).map((o) => ({ ...o, origin: kok,
    localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim", "qt_profil_onbellek"].includes(x.name)),
      { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" }] }));
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
      if (/\/rpc\/(kozmetik_satin_al|kozmetik_tak|avatar_satin_al|kasa_cevap|kasa_karar|kasa_nabiz|duello_cevap)/.test(u)) return json({ message: "Ölçüm aracı: yazma kapalı" }, 400);
      if (u.includes("/rpc/kozmetik_katalogu")) return json(KATALOG);
      if (u.includes("/rpc/sahip_mi")) return json(false);
      if (u.includes("/rpc/avatar_katalogu_oyun")) return json([]);
      if (u.includes("/rpc/kasa_durum")) return json(kasaDurum(jwtSub(req), kasa));
      if (u.includes("/rpc/kasa_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
      if (u.includes("/rpc/kasa_aktif_benim")) return json([]);
      if (u.includes("/rpc/kasa_joker_durumu")) return json(null);
      const anahtar = req.method() + " " + u + " " + (req.postData() ?? "");
      let y = ONBELLEK.get(anahtar);
      if (!y) {
        const g = await r.fetch({ timeout: 20000 });
        y = { status: g.status(), headers: g.headers(), body: await g.text() };
        if (g.status() < 500) ONBELLEK.set(anahtar, y);
      }
      let govde = y.body;
      if (u.includes("/rpc/profilim")) { const p = JSON.parse(govde); p.takili_cevap_imzasi = imza; p.dil = dil; Object.assign(p, { takma_ad_secildi: true, avatar_onayli: true, ulke: p.ulke ?? "TR", gorunen_ad: "Deneme", avatar_url: p.avatar_url ?? "/avatars/pro/tilki-k04.svg", kosullar_kabul_at: p.kosullar_kabul_at ?? new Date().toISOString() }); govde = JSON.stringify(p); }
      if (u.includes("/rest/v1/oyun_ayarlari")) {
        try { const l = JSON.parse(govde).filter((x) => !String(x.anahtar).startsWith("kasa_")); for (const [k, v] of Object.entries(KASA_AYAR)) l.push({ anahtar: k, deger: v }); govde = JSON.stringify(l); } catch { /* liste değil */ }
      }
      await r.fulfill({ status: y.status, headers: y.headers, body: govde });
    } catch { try { await r.continue(); } catch { /* sayfa kapandı */ } }
  });
  if (cpu > 1) { const c = await b.newCDPSession(s); await c.send("Emulation.setCPUThrottlingRate", { rate: cpu }); }
  return { b, s, konsol };
}
const bekleImza = async (s, ms = 9000) => { try { await s.waitForFunction(() => window.__ci?.sayi > 0, null, { timeout: ms, polling: 16 }); return true; } catch { return false; } };
async function sahneAc(s) {
  await s.goto(`${ADRES}/araclar/cevap-imzasi-sahne/index.html`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await s.waitForSelector(".qt-sik", { timeout: 20000 });
  await s.waitForFunction(() => document.querySelectorAll(".qt-sik:not(:disabled)").length === 4, null, { timeout: 8000 }).catch(() => {});
  await s.waitForTimeout(1200);   // profilim (takılı imza) okunsun
}
/** Donmuş imzanın 5 karesi; her karede kırpma / kayma / taşma ölçülür. */
async function kareler(s, ad, tur, { w, h }) {
  const dosyalar = [], denetimler = [];
  const once = await s.evaluate(() => window.__ciDenetim().siklar);
  for (const t of KARELER) {
    const r = await s.evaluate((t) => window.__ciZaman(t), t);
    if (!r) break;
    const y0 = Math.max(0, Math.round(r.y - 175)), y1 = Math.min(h, Math.round(r.y + r.h + 145));
    const dosya = `${ad}-${tur}-${w}-${String(t).padStart(4, "0")}.png`;
    await s.screenshot({ path: path.join(CIKTI, dosya), clip: { x: 0, y: y0, width: w, height: Math.max(40, y1 - y0) }, animations: "allow" });
    dosyalar.push(dosya);
    denetimler.push(await s.evaluate(() => window.__ciDenetim()));
  }
  await s.evaluate(() => window.__ciCoz());
  const kirpan = denetimler.flatMap((d) => d.kirpan);
  const kayma = denetimler.some((d) => d.siklar.join("|") !== once.join("|"));
  const tasma = Math.max(...denetimler.map((d) => d.yatayTasma));
  olcum.denetim[`${ad}-${tur}-${w}`] = { kirpan: kirpan.slice(0, 3), kayma, tasma, tuval: denetimler[0]?.tuval };
  return { dosyalar, kirpan, kayma, tasma };
}

// ================= 0) MAKET kareleri (aynı anlar) =================
if (calis("maket")) for (const { w, h } of EKRANLAR) {
  console.log(`— Maket ${w}`);
  const b = await tarayici.newContext({ viewport: { width: w, height: h } });
  await b.addInitScript(() => {
    let kuyruk = [], sanal = 0;
    window.requestAnimationFrame = (f) => { kuyruk.push(f); return kuyruk.length; };
    window.cancelAnimationFrame = () => {};
    window.__adim = (n) => { for (let i = 0; i < n; i++) { sanal += 16.7; const q = kuyruk; kuyruk = []; q.forEach((f) => f(sanal)); } };
  });
  const s = await b.newPage();
  await s.goto(pathToFileURL(path.resolve("docs/cevap-imzasi-v3-maket.html")).href);
  await s.waitForTimeout(2600);   // açılış oynatmaları kurulur (rAF elle → donuk)
  for (const tur of ["yildiz", "ampul"]) {
    const kart = s.locator(`.kart[data-imza="${tur}"]`);
    await kart.scrollIntoViewIfNeeded();
    await kart.locator(".yeni").click();
    await s.waitForTimeout(400);   // maket 260 ms sonra başlatır
    let g = -16.7;
    for (const t of KARELER) {
      const adim = Math.round((t - g) / 16.7); await s.evaluate((n) => window.__adim(n), adim); g += adim * 16.7;
      await kart.locator(".sahne").screenshot({ path: path.join(CIKTI, `maket-${tur}-${w}-${String(t).padStart(4, "0")}.png`) });
    }
  }
  await b.close();
}

// ================= 1) KLASİK (gerçek QuestionCard) =================
if (calis("klasik")) for (const E of EKRANLAR) {
  console.log(`— Klasik ${E.w} ${E.dil}`);
  for (const [imza, tur] of Object.entries(V3)) {
    const { b, s, konsol } = await baglam({ ...E, imza });
    await sahneAc(s);
    await s.locator(".qt-sik").nth(1).click();
    const oynadi = await bekleImza(s);
    ok(`${E.w}: Klasik ${tur} oynadı (canvas)`, oynadi && (await s.evaluate(() => Boolean(document.querySelector(".ci-tuval")))));
    if (oynadi) {
      const k = await kareler(s, "klasik", tur, E);
      ok(`${E.w}: Klasik ${tur} kırpan ata yok`, k.kirpan.length === 0, JSON.stringify(k.kirpan.slice(0, 2)));
      ok(`${E.w}: Klasik ${tur} şıklar kaymadı`, !k.kayma);
      ok(`${E.w}: Klasik ${tur} yatay taşma 0`, k.tasma <= 0, String(k.tasma));
    }
    await s.waitForTimeout(1700);
    ok(`${E.w}: Klasik ${tur} bitince canvas kalktı`, (await s.evaluate(() => document.querySelectorAll(".ci-tuval, .ci-katman").length)) === 0);
    ok(`${E.w}: Klasik ${tur} konsol temiz`, konsol.length === 0, konsol.join(" | "));
    await b.close();
  }
}

// ================= 2) ORTAK HAZİNE (gerçek KasaPage) — doğru şık EN ÜSTTE (soru kartının hemen altı) =================
if (calis("hazine")) for (const E of EKRANLAR) {
  console.log(`— Ortak Hazine ${E.w} ${E.dil}`);
  for (const [imza, tur] of Object.entries(V3)) {
    const { b, s, konsol } = await baglam({ ...E, imza, kasa: { sira: 0 } });
    await s.goto(`${ADRES}/kasa/${KASA_ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const oynadi = await bekleImza(s, 15000);
    ok(`${E.w}: Hazine ${tur} oynadı`, oynadi);
    if (oynadi) {
      const k = await kareler(s, "hazine", tur, E);
      ok(`${E.w}: Hazine ${tur} kırpan ata yok`, k.kirpan.length === 0, JSON.stringify(k.kirpan.slice(0, 2)));
      ok(`${E.w}: Hazine ${tur} şıklar kaymadı`, !k.kayma);
      ok(`${E.w}: Hazine ${tur} yatay taşma 0`, k.tasma <= 0, String(k.tasma));
    }
    ok(`${E.w}: Hazine ${tur} konsol temiz`, konsol.length === 0, konsol.join(" | "));
    await b.close();
  }
}

// ================= 3) DÜKKÂN DEMOSU =================
if (calis("dukkan")) for (const E of EKRANLAR) {
  console.log(`— Dükkân ${E.w} ${E.dil}`);
  const { b, s, konsol } = await baglam(E);
  await s.goto(`${ADRES}/joker?sekme=efekt`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await s.waitForSelector(".ci-dk-kart", { timeout: 20000 });
  await s.waitForTimeout(900);
  const kartlar = await s.locator(".ci-dk-kart").count();
  ok(`${E.w}: Dükkân › Efekt 4 kart (Yanan Kart yok — önbellekli katalogda olsa bile)`, kartlar === 4, String(kartlar));
  ok(`${E.w}: Dükkân'da "Yanan Kart"/"Burning Card" yazmıyor`, !/Yanan Kart|Burning Card/.test(await s.locator(".ci-dk").innerText()));
  await s.screenshot({ path: path.join(CIKTI, `dukkan-liste-${E.w}.png`), fullPage: true });
  for (const [imza, tur] of Object.entries(V3)) {
    const kart = s.locator(".ci-dk-kart").nth(Object.keys(V3).indexOf(imza) + 1);
    await s.evaluate(() => { window.__ci.sayi = 0; });
    await kart.locator(".ci-dk-ust").click();
    const oynadi = await bekleImza(s);
    ok(`${E.w}: Dükkân ${tur} demo oynadı`, oynadi);
    if (oynadi) {
      await kart.scrollIntoViewIfNeeded();
      const k = await kareler(s, "dukkan", tur, E);
      ok(`${E.w}: Dükkân ${tur} yatay taşma 0`, k.tasma <= 0, String(k.tasma));
      olcum.denetim[`dukkan-${tur}-${E.w}-kirpan`] = k.kirpan.slice(0, 3);
    }
    await s.evaluate(() => { window.__ci.sayi = 0; });
    await kart.getByRole("button", { name: /Tekrar oynat|Play again|Replay/i }).click();
    ok(`${E.w}: Dükkân ${tur} tekrar oynat`, await bekleImza(s, 4000));
    await s.evaluate(() => window.__ciCoz());
    await kart.locator(".ci-dk-ust").click();
    await s.waitForTimeout(50);
    ok(`${E.w}: Dükkân ${tur} kapatınca efekt temizlendi`, (await s.evaluate(() => document.querySelectorAll(".ci-tuval, .ci-katman").length)) === 0);
  }
  ok(`${E.w}: Dükkân konsol temiz`, konsol.length === 0, konsol.join(" | "));
  await b.close();
}

// ================= 4) NEON TİK ↔ normal tik =================
const tikDurum = (s, sira) => s.evaluate((sira) => {
  const y = document.querySelectorAll(".qt-sik-yuva")[sira];
  const i = y?.querySelector(".qt-sik-isaret"), ek = y?.querySelector(".qt-sik-ek");
  const r = i?.getBoundingClientRect(), e = ek?.getBoundingClientRect();
  return { gorunur: i ? getComputedStyle(i).visibility : null, svg: Boolean(i?.querySelector("svg")), isaret: r ? [Math.round(r.x), Math.round(r.width)].join(",") : null,
    avatar: e ? [Math.round(e.x), Math.round(e.y), Math.round(e.width)].join(",") : null, metinSag: Math.round(y?.querySelector(".qt-sik-metin")?.getBoundingClientRect().right ?? 0) };
}, sira);
if (calis("neon")) for (const E of EKRANLAR) {
  console.log(`— Neon Tik ↔ normal tik ${E.w} ${E.dil}`);
  // Klasik: Neon Tik → tik gizli (oynarken ve sonrasında); imzasız → görünür; Yıldız → görünür
  const sonuclar = {};
  for (const imza of ["imza_neon_tik", null, "imza_yildiz"]) {
    const { b, s } = await baglam({ ...E, imza });
    await sahneAc(s);
    await s.evaluate(() => { window.__ci.hazir = false; });
    await s.locator(".qt-sik").nth(1).click();
    await s.waitForSelector(".qt-sik--dogru", { timeout: 8000 });
    await s.waitForTimeout(250);
    const oynarken = await tikDurum(s, 1);
    await s.waitForTimeout(1400);
    const sonra = await tikDurum(s, 1);
    sonuclar[imza ?? "imzasiz"] = { oynarken, sonra };
    if (imza === "imza_neon_tik") await s.screenshot({ path: path.join(CIKTI, `neon-klasik-${E.w}.png`) });
    if (imza === null) await s.screenshot({ path: path.join(CIKTI, `imzasiz-klasik-${E.w}.png`) });
    await b.close();
  }
  ok(`${E.w}: Klasik Neon Tik → normal tik gizli (oynarken + sonra)`, sonuclar.imza_neon_tik.oynarken.gorunur === "hidden" && sonuclar.imza_neon_tik.sonra.gorunur === "hidden" && sonuclar.imza_neon_tik.oynarken.svg, JSON.stringify(sonuclar.imza_neon_tik));
  ok(`${E.w}: Klasik imzasız → normal tik görünür`, sonuclar.imzasiz.sonra.gorunur === "visible" && sonuclar.imzasiz.sonra.svg, JSON.stringify(sonuclar.imzasiz));
  ok(`${E.w}: Klasik Yıldız → normal tik görünür`, sonuclar.imza_yildiz.sonra.gorunur === "visible", JSON.stringify(sonuclar.imza_yildiz));
  ok(`${E.w}: tik yeri korundu (işaret kutusu aynı konum/genişlik)`, sonuclar.imza_neon_tik.sonra.isaret === sonuclar.imzasiz.sonra.isaret && sonuclar.imza_neon_tik.sonra.metinSag === sonuclar.imzasiz.sonra.metinSag);
  // Ortak Hazine: rakip de doğru → rakip avatarı doğru şıkta; Neon Tik'te avatar yerinde, tik gizli
  const hz = {};
  for (const imza of ["imza_neon_tik", null]) {
    const { b, s } = await baglam({ ...E, imza, kasa: { sira: 1 } });
    await s.evaluate(() => {}).catch(() => {});
    await s.goto(`${ADRES}/kasa/${KASA_ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.waitForSelector(".qt-sik--dogru .qt-sik-isaret svg", { timeout: 15000 }).catch(() => {});
    await s.waitForSelector(".qt-sik-ek", { timeout: 5000 }).catch(() => {});
    if (imza) await bekleImza(s, 5000).then(() => s.evaluate(() => window.__ciCoz()));
    await s.waitForTimeout(1500);
    hz[imza ?? "imzasiz"] = await tikDurum(s, 1);
    await s.screenshot({ path: path.join(CIKTI, `${imza ? "neon" : "imzasiz"}-hazine-${E.w}.png`) });
    await b.close();
  }
  ok(`${E.w}: Hazine Neon Tik → tik gizli`, hz.imza_neon_tik.gorunur === "hidden", JSON.stringify(hz.imza_neon_tik));
  ok(`${E.w}: Hazine imzasız → tik görünür`, hz.imzasiz.gorunur === "visible", JSON.stringify(hz.imzasiz));
  ok(`${E.w}: Hazine rakip avatarı yerinde (Neon = imzasız)`, hz.imza_neon_tik.avatar && hz.imza_neon_tik.avatar === hz.imzasiz.avatar, `${hz.imza_neon_tik.avatar} / ${hz.imzasiz.avatar}`);
  olcum.denetim[`neon-${E.w}`] = { klasik: sonuclar, hazine: hz };
}

// ================= 5) YANAN KART dondurulmuş: takılı görünse bile oynamaz =================
if (calis("yanan")) {
  console.log("— Yanan Kart (dondurulmuş)");
  const { b, s } = await baglam({ ...EKRANLAR[0], imza: "imza_yanan_kart" });
  await sahneAc(s);
  await s.locator(".qt-sik").nth(1).click();
  ok("Yanan Kart takılı (taklit) → doğru cevapta imza OYNAMAZ", !(await bekleImza(s, 2500)));
  await b.close();
}

// ================= 6) KARE SÜRESİ (4× CPU, 390 px, Klasik) =================
if (calis("kare")) {
  const etiket = typeof ARG.etiket === "string" ? ARG.etiket : "olcum";
  console.log(`— Kare süresi 4× CPU (${etiket})`);
  const SURE = { taban: 1400, imza_yildiz: 1150, imza_ampul: 1400 };
  const TEKRAR = Number(ARG.tekrar ?? 3);
  const ist = (d) => { const so = [...d].sort((a, c) => a - c); const p = (q) => so.length ? +so[Math.min(so.length - 1, Math.floor(q * so.length))].toFixed(1) : null; return { kare: so.length, p50: p(0.5), p95: p(0.95), en: p(1) }; };
  const medyan = (l) => { const so = l.filter((v) => v != null).sort((a, c) => a - c); return so.length ? so[Math.floor(so.length / 2)] : null; };
  for (const imza of ["taban", "imza_yildiz", "imza_ampul"]) {
    const kosular = [];
    for (let n = 0; n < TEKRAR; n++) {
      const { b, s } = await baglam({ w: 390, h: 844, imza: imza === "taban" ? null : imza, cpu: 4 });
      await s.goto(`${ADRES}/araclar/cevap-imzasi-sahne/index.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await s.waitForSelector(".qt-sik", { timeout: 30000 }); await s.waitForTimeout(2500);
      await s.evaluate((ms) => {
        window.__ci.hazir = false;
        window.__kare = []; window.__cizim = []; window.__olc = false;
        const raf = window.requestAnimationFrame.bind(window);
        let kareIs = 0;
        window.requestAnimationFrame = (f) => raf((t) => { const a = performance.now(); f(t); kareIs += performance.now() - a; });
        let son = null;
        const dongu = (t) => { if (window.__olc) { if (son != null) { window.__kare.push([t - son, Boolean(document.querySelector(".ci-tuval")), t - (window.__tik ?? 1e12)]); window.__cizim.push(kareIs); } son = t; } kareIs = 0; raf(dongu); };
        raf(dongu);
        window.__olcBasla = () => { window.__olc = true; setTimeout(() => { window.__olc = false; }, ms + 600); };   // imza tıklamadan biraz sonra başlar: kuyruğu da kapsa
      }, SURE[imza]);
      await s.evaluate(() => { window.__olcBasla(); window.__tik = performance.now(); });
      await s.locator(".qt-sik").nth(1).click();
      await s.waitForTimeout(SURE[imza] + 2100);
      const { kk, c } = await s.evaluate(() => ({ kk: window.__kare.slice(), c: window.__cizim.slice() }));
      // akış: imza canvas'ı ekrandayken, ilk kare (canvas kurulumu) hariç; taban: tıklamadan 50 ms sonrası
      const akis = imza === "taban" ? kk.filter((x) => x[2] > 50).map((x) => x[0]).slice(0, 80) : kk.filter((x) => x[1]).map((x) => x[0]).slice(1);
      // kaçan karelerin anı (tıklamadan ms) ve süresi — hangi evre pahalı
      const kacanlar = (imza === "taban" ? kk.filter((x) => x[2] > 50) : kk.filter((x) => x[1]).slice(1)).filter((x) => x[0] > 20).map((x) => `${Math.round(x[2])}:${Math.round(x[0])}`);
      kosular.push({ akis: ist(akis), kacan: akis.filter((v) => v > 20).length, toplam: akis.length, cizim: ist(c), kacanlar });
      await b.close();
    }
    const ad = imza === "taban" ? "taban" : V3[imza];
    olcum.kareSuresi[`${ad}-${etiket}`] = { kosular, medyan: { akisP50: medyan(kosular.map((x) => x.akis.p50)), akisP95: medyan(kosular.map((x) => x.akis.p95)),
      kacanOran: medyan(kosular.map((x) => +(100 * x.kacan / Math.max(1, x.toplam)).toFixed(1))), cizimP95: medyan(kosular.map((x) => x.cizim.p95)) } };
    console.log("   ", ad, JSON.stringify(olcum.kareSuresi[`${ad}-${etiket}`].medyan), kosular.map((k) => `${k.kacan}/${k.toplam}`).join(" "), ARG.ayrinti ? kosular.map((k) => k.kacanlar.join(",")).join(" | ") : "");
  }
}

await tarayici.close();
const dosya = path.join(CIKTI, "olcum.json");
const eski = fs.existsSync(dosya) ? JSON.parse(fs.readFileSync(dosya, "utf8")) : {};
for (const k of Object.keys(olcum)) eski[k] = { ...(eski[k] ?? {}), ...olcum[k] };
fs.writeFileSync(dosya, JSON.stringify(eski, null, 2));
console.log(`\n${gecti} geçti · ${kaldi} kaldı · çıktı ${path.relative(process.cwd(), CIKTI)}`);
process.exit(kaldi ? 1 : 0);
