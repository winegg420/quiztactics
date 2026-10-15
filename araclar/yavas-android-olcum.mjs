// Ucuz Android açılış ölçümü — yerel ÜRETİM derlemesi (vite preview) + canlı Supabase, normal oyuncu kadar istek.
// Taklit: CPU 6x yavaş · yavaş 4G (150 ms RTT, 1,6 Mbit/s iniş, 750 kbit/s çıkış) · 390×844 · Android Chrome UA.
// Her ekran: soğuk (boş HTTP önbelleği, yeni bağlam) + sıcak (aynı bağlamda ikinci açılış). SW kapalı (iki koşu karşılaştırılabilir).
// Ölçer: ilk boyama (FCP), en büyük boyama (LCP), içerik hazır (yükleniyor göstergesi yok + ertelenmeyen Supabase istekleri bitmiş,
// 300 ms sabit), tam hazır (bütün istekler dahil),
// etkileşime hazır (son uzun görevden sonra 2 sn sessizlik), en uzun görev, toplam engelleme (TBT), Supabase istek sayısı/şelalesi, indirilen bayt.
// Maç (--mac): Klasik, Düello, Ortak Hazine — bota karşı TEK maç, MAÇIN TAMAMI (15 Eki 2026): bekleme ekranı + 3-2-1 + sorular
// (oto oyuncu: rastgele şık, Hazine'de AÇ) + maç sonu (sonuç/XP sesleri için 10 sn). Kaydedilen: ekran videosu (.tmp/yavas-mac/),
// saniyelik kare hızı (rAF) + uzun görevler, ekran durumu çizelgesi ("bekle · Rakip bekleniyor…" / "sayım 3" / "soru" …),
// ses çizelgesi (bd_ses_tani=1: istenen ses → çalındı mı, AudioContext durumu, atlama nedeni; tarayıcı sessiz — hoparlöre
// ses gitmez), konsol hataları. Maç açılışı ölçümü (maç adresi → ilk oynanabilir kare) aynen durur.
// Kullanım: npm run build && npx vite preview --port 5199 --strictPort
//           node araclar/test-oturumu.mjs --ac --adres=http://localhost:5199 --oturum=<dosya>
//           node araclar/yavas-android-olcum.mjs --adres=http://localhost:5199 --oturum=<dosya> [--mac] [--cikti=...json]
//           node araclar/test-oturumu.mjs --sil --oturum=<dosya>
//   --ida            : test hesabı yerine Ida'nın hesabıyla (idaGG) — oturum bellekte kurulur (admin magic link), diske yazılmaz,
//                      hesap SİLİNMEZ. test-oturumu.mjs --sil ile birlikte KULLANILMAZ.
//   --mod=hazine,klasik : yalnız bu maçlar · --etiket=once : çıktı/video adı · --yalniz_mac : ekran ölçümü yok
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "http://localhost:5199").replace(/\/$/, "");
const OTURUM = path.resolve(String(ARG.oturum || ".arayuz-denetim-oturum.json"));
const CIKTI = path.resolve(String(ARG.cikti || "tasarim/yavas-android/olcum.json"));
fs.mkdirSync(path.dirname(CIKTI), { recursive: true });

const AG = { offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8, connectionType: "cellular4g" };
const UA = "Mozilla/5.0 (Linux; Android 11; SM-A125F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const EKRANLAR = [
  { kod: "ana", ad: "Ana sayfa", yol: "/" },
  { kod: "modlar", ad: "Modlar", yol: "/modlar" },
  { kod: "lig", ad: "Lig", yol: "/siralama" },
  { kod: "dukkan", ad: "Dükkân", yol: "/joker" },
  { kod: "profil", ad: "Profil", yol: "/profil" },
];

// Sayfa içi ölçüm: uzun görevler, boyamalar, Supabase fetch sayacı, "hazır" anı.
const IZCI = () => {
  const o = (window.__olc = { uzun: [], fcp: null, lcp: null, hazir: null, icerik: null, ilkMac: null, macAdres: null, ucus: 0, ucusAna: 0, istek: [] });
  // Ertelenen (ilk çizimden sonra, boşta) istekler "içerik hazır"ı bekletmez — Paket A/2 ile ertelenenlerin listesi
  const ERTELENEN = /rpc\/(yanlis_bankam|gonderdigim_davetler|ses_secimleri_oyun)|durum=eq\.bekliyor/;
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) o.uzun.push([e.startTime, e.duration]); }).observe({ type: "longtask", buffered: true }); } catch { /* yok */ }
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") o.fcp = e.startTime; }).observe({ type: "paint", buffered: true }); } catch { /* yok */ }
  try { new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) o.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); } catch { /* yok */ }
  const f0 = window.fetch;
  window.fetch = function (...a) {
    const url = String(a[0]?.url ?? a[0]);
    if (!/supabase\.co/.test(url)) return f0.apply(this, a);
    const k = { yol: url.replace(/^https:\/\/[^/]+/, "").split("?")[0], bas: performance.now(), bit: null };
    const ana = !ERTELENEN.test(url);
    o.istek.push(k); o.ucus++; if (ana) o.ucusAna++;
    return f0.apply(this, a).finally(() => { o.ucus--; if (ana) o.ucusAna--; k.bit = performance.now(); });
  };
  // 15 Eki 2026 şık geri bildirimi: dokunuş (click) → şıkta "qt-sik--secili" sınıfı (DOM) → sonraki boyama (rAF). Sunucu yanıtı beklenmez.
  o.sik = [];
  try {
    let bekleyen = null;
    document.addEventListener("click", (e) => { if (e.target?.closest?.(".qt-sik")) bekleyen = { t0: e.timeStamp, dom: null }; }, true);
    new MutationObserver((ms) => {
      if (!bekleyen || bekleyen.dom != null) return;
      for (const m of ms) if (m.type === "attributes" && m.target.classList?.contains("qt-sik--secili")) {
        bekleyen.dom = performance.now(); const b = bekleyen; bekleyen = null;
        requestAnimationFrame(() => requestAnimationFrame(() => o.sik.push([Math.round(b.dom - b.t0), Math.round(performance.now() - b.t0)])));
        return;
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["class"] });
  } catch { /* yok */ }
  const ps = history.pushState;
  history.pushState = function (...a) { const r = ps.apply(this, a); if (/\/(mac|duello|kasa)\/[0-9a-f-]{36}/.test(location.pathname) && o.macAdres == null) o.macAdres = performance.now(); return r; };
  const YUKLENIYOR = "#qt-ilk-yukleme, [aria-busy=true], [class*=iskelet], [class*=yukleniyor], [class*=skeleton], .qt-durum--yukleniyor";
  const gorunur = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; };
  let aday = null, adayI = null;
  const bak = () => {
    // ölçülecek bir şey kalmadıysa sayfaya dokunma (innerText her 50 ms'de yerleşim zorlar — maç ölçümünü bozardı)
    if (o.icerik != null && o.hazir != null && (o.macAdres == null || o.ilkMac != null)) return;
    const kok = document.getElementById("root");
    const icerik = kok && kok.innerText.trim().length > 20;
    const yuk = [...document.querySelectorAll(YUKLENIYOR)].some(gorunur);
    if (o.icerik == null) {
      if (icerik && !yuk && o.ucusAna === 0) { adayI ??= performance.now(); if (performance.now() - adayI >= 300) o.icerik = adayI; } else adayI = null;
    }
    if (o.hazir == null) {
      if (icerik && !yuk && o.ucus === 0) { aday ??= performance.now(); if (performance.now() - aday >= 300) o.hazir = aday; } else aday = null;
    }
    if (o.macAdres != null && o.ilkMac == null) {
      const el = document.querySelector(".qt-soru-metin, .m1-sayim-sayi, .ks-giris-sayi, .d4-arena, .ks-sahne, [class*=hazir-kapi]");
      const hazirim = [...document.querySelectorAll("button")].some((b) => /Hazırım|Ready/i.test(b.textContent) && gorunur(b));
      if ((el && gorunur(el)) || hazirim) o.ilkMac = performance.now();
    }
  };
  setInterval(bak, 50);
  // --mac (maçın tamamı): saniyelik kare hızı (rAF; [saniye başı, kare, en uzun kare arası ms]) + ekran durumu çizelgesi
  // (yalnız değişimler: [t, durum]) — "3"te takılma / donan bekleme ekranı burada görünür.
  o.kare = []; o.durum = [];
  let kb = performance.now(), kn = 0, kmax = 0, kson = kb;
  const raf = (t) => {
    kn++; kmax = Math.max(kmax, t - kson); kson = t;
    if (t - kb >= 1000) { o.kare.push([Math.round(kb), kn, Math.round(kmax)]); kb = t; kn = 0; kmax = 0; }
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  const ilk = (sel) => { for (const e of document.querySelectorAll(sel)) if (gorunur(e)) return e; return null; };
  const BEKLE = /Rakip bekleniyor|Rakip bağlanıyor|Hazır mısın\?|Maç başlıyor|Hazırsın — diğerleri bekleniyor|Rakip aranıyor|Rakip bulundu/;
  const durumOku = () => {
    if (o.macAdres == null) return null;
    const say = ilk(".m1-sayim-sayi, .ks-giris-sayi");
    if (say) return "sayım " + say.textContent.trim();
    if (ilk(".msk-icerik")) return "maç sonu";
    const bekle = [...document.querySelectorAll("[role=status], h1, .m1-bekle, .m2-bant")].filter(gorunur)
      .map((e) => e.textContent.match(BEKLE)?.[0]).find(Boolean);
    if (ilk(".ks-giris-an")) return "giriş sahnesi" + (bekle ? " · " + bekle : ilk(".ks-giris-hazir") ? " · Hazır ol!" : "");
    if (bekle) return "bekle · " + bekle;
    if (ilk(".m1-sayim")) return "sayım katmanı (rakamsız)";
    if (ilk(".qt-soru-metin")) return "soru";
    return "diğer";
  };
  // Durum yalnız DOM değişince okunur (MutationObserver; CSS animasyonu tetiklemez) + 1 sn'lik yedek — sürekli yoklama
  // stil/yerleşim zorlayıp ölçülen kare hızını düşürüyordu.
  let bekleyen = false;
  const yaz = () => { bekleyen = false; const d = durumOku(); if (d != null && o.durum.at(-1)?.[1] !== d) o.durum.push([Math.round(performance.now()), d]); };
  const planla = () => { if (!bekleyen) { bekleyen = true; setTimeout(yaz, 30); } };
  const izle = () => new MutationObserver(planla).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  if (document.documentElement) izle(); else addEventListener("DOMContentLoaded", izle);
  setInterval(planla, 1000);
};

function ozet(o, bayt) {
  const bas = o.hazir ?? 0;
  const uzun = o.uzun.map(([s, d]) => ({ s, e: s + d, d })).sort((a, b) => a.s - b.s);
  let tti = Math.max(bas, o.fcp ?? 0);
  for (const t of uzun) if (t.s < tti + 2000 && t.e > tti) tti = t.e;
  const tbt = uzun.filter((t) => t.s >= (o.fcp ?? 0) && t.s < tti).reduce((a, t) => a + Math.max(0, t.d - 50), 0);
  const ist = o.istek.filter((k) => k.bas <= (o.hazir ?? Infinity) + 50);
  // Şelale derinliği: bir istek, öncekilerden biri bittikten SONRA başladıysa bir tur daha.
  let tur = 0, sinir = -1;
  for (const k of [...ist].sort((a, b) => a.bas - b.bas)) if (k.bas > sinir) { tur++; sinir = Math.max(...ist.filter((x) => x.bas <= k.bas && x.bit).map((x) => x.bit), k.bit ?? k.bas); }
  return {
    fcp: Math.round(o.fcp ?? -1), icerik: Math.round(o.icerik ?? -1), lcp: Math.round(o.lcp ?? -1), hazir: Math.round(o.hazir ?? -1), etkilesim: Math.round(tti),
    en_uzun_gorev: Math.round(Math.max(0, ...uzun.map((t) => t.d))), tbt: Math.round(tbt), uzun_gorev_sayisi: uzun.length,
    supabase_istek: ist.length, sira_turu: tur, ilk_supabase: Math.round(ist[0]?.bas ?? -1),
    son_supabase_bitis: Math.round(Math.max(-1, ...ist.map((k) => k.bit ?? -1))),
    istekler: ist.map((k) => `${Math.round(k.bas)}-${Math.round(k.bit ?? -1)} ${k.yol.replace("/rest/v1/rpc/", "rpc:").replace("/rest/v1/", "tab:")}`),
    bayt,
  };
}

// --ida: Ida'nın hesabı için oturum (Auth admin magic link → verify; test-oturumu.mjs ile aynı yol, hesap açılmaz/silinmez)
async function idaOturumu() {
  const E = {};
  for (const d of [".env.local", ".env"]) {
    try { for (const m of fs.readFileSync(d, "utf8").matchAll(/^([A-Z_]+)=(.*)$/gm)) if (!(m[1] in E)) E[m[1]] = m[2].trim(); } catch { /* yok */ }
  }
  const URL_ = E.SUPABASE_YENI_URL || E.VITE_SUPABASE_URL, SERVIS = E.SUPABASE_YENI_SERVICE_ROLE_KEY, ANON = E.VITE_SUPABASE_ANON_KEY;
  if (!URL_ || !SERVIS || !ANON) throw new Error(".env.local: SUPABASE_YENI_URL / SUPABASE_YENI_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY gerekli");
  const istek = async (yol, govde, anahtar) => {
    const r = await fetch(URL_ + yol, { method: "POST", headers: { apikey: anahtar, Authorization: `Bearer ${anahtar}`, "Content-Type": "application/json" }, body: JSON.stringify(govde) });
    const m = await r.text();
    if (!r.ok) throw new Error(`${yol} → ${r.status} ${m.slice(0, 120)}`);
    return JSON.parse(m);
  };
  const link = await istek("/auth/v1/admin/generate_link", { type: "magiclink", email: String(ARG.eposta || "idagureli@gmail.com") }, SERVIS);
  const o = await istek("/auth/v1/verify", { type: "magiclink", token_hash: link?.properties?.hashed_token ?? link?.hashed_token }, ANON);
  if (!o?.access_token) throw new Error("verify oturum döndürmedi");
  const kayit = { access_token: o.access_token, refresh_token: o.refresh_token, expires_in: o.expires_in,
    expires_at: o.expires_at ?? Math.floor(Date.now() / 1000) + Number(o.expires_in ?? 3600), token_type: "bearer", user: o.user };
  const ref = new URL(URL_).hostname.split(".")[0];
  return { cookies: [], origins: [{ origin: new URL(ADRES).origin, localStorage: [{ name: `sb-${ref}-auth-token`, value: JSON.stringify(kayit) }, { name: "bildim_tanitim", value: "1" }] }] };
}
let IDA_OTURUM = null;
const oturumOku = () => IDA_OTURUM ? structuredClone(IDA_OTURUM) : JSON.parse(fs.readFileSync(OTURUM, "utf8"));

async function baglamAc(tarayici, { video = null } = {}) {
  const oturum = oturumOku();
  const hedef = new URL(ADRES).origin;
  oturum.origins = (oturum.origins ?? []).map((x) => ({ ...x, origin: hedef }));
  const b = await tarayici.newContext({ storageState: oturum, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: UA, locale: "tr-TR", serviceWorkers: "block", ...(video ? { recordVideo: { dir: video, size: { width: 390, height: 844 } } } : {}) });
  await b.addInitScript(IZCI);
  // ses çizelgesi (ses.js tanısı) + uygulama kapısı geçişi (canlı adreste kurulum sayfası yerine oyun)
  await b.addInitScript(() => { try { sessionStorage.setItem("bd_ses_tani", "1"); sessionStorage.setItem("qt_dev_gecis", "1"); } catch { /* yok */ } });
  return b;
}

async function sayfaAc(b) {
  const s = await b.newPage();
  const cdp = await b.newCDPSession(s);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", AG);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  const bayt = { js: 0, css: 0, font: 0, gorsel: 0, diger: 0 };
  cdp.on("Network.loadingFinished", (e) => { const t = turlar.get(e.requestId); if (t) bayt[t] += e.encodedDataLength; });
  const turlar = new Map();
  cdp.on("Network.responseReceived", (e) => {
    const m = e.response.mimeType || "";
    turlar.set(e.requestId, /javascript/.test(m) ? "js" : /css/.test(m) ? "css" : /font|woff/.test(m) ? "font" : /image|svg/.test(m) ? "gorsel" : "diger");
  });
  return { s, bayt, cdp };
}

async function olc(s, bayt, yol) {
  for (const k of Object.keys(bayt)) bayt[k] = 0;
  await s.goto(ADRES + yol, { waitUntil: "commit", timeout: 60000 });
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    const h = await s.evaluate(() => window.__olc?.hazir).catch(() => null);
    if (h != null) break;
    await s.waitForTimeout(250);
  }
  await s.waitForTimeout(3000);   // hazırdan sonraki uzun görevler
  const o = await s.evaluate(() => window.__olc);
  const kb = Object.fromEntries(Object.entries(bayt).map(([k, v]) => [k, Math.round(v / 1024)]));
  return ozet(o, kb);
}

// Oto oyuncu: yalnız sayfaya bakar (sunucu yoklaması yok). Maç sonu görülünce 10 sn daha (sonuç + XP sesleri) kayıt sürer.
async function otoOyna(s, sinirMs, profil = null) {
  const bas = Date.now();
  let son = null;
  let pDurum = 0;   // --profil: 0 bekliyor · 1 kayıtta (giriş sahnesi / sayım) · 2 bitti
  // Sayfaya tek, hafif bakış (Playwright rol sorguları sayfanın ana iş parçacığını yorup ölçümü bozuyordu — 3-2-1 profilinde
  // getAriaRole/innerText): dokunulacak hedefin merkezi döner, dokunuş koordinatla yapılır.
  const bak = () => s.evaluate(() => {
    const gor = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight ? r : null; };
    const merkez = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const d = window.__olc.durum.at(-1)?.[1] ?? null;
    if (d === "maç sonu") return { d };
    for (const b of document.querySelectorAll("button:not([disabled])")) {
      if (/^(Hazırım|Geç|Anladım|Tamam)$/.test(b.textContent.trim())) { const r = gor(b); if (r) return { d, hedef: merkez(r), tur: "dugme" }; }
    }
    const siklar = [...document.querySelectorAll(".qt-sik:not([disabled]):not(.qt-sik--elendi)")].map(gor).filter(Boolean);
    if (siklar.length >= 2) return { d, hedef: merkez(siklar[Math.floor(Math.random() * siklar.length)]), tur: "sik" };
    const k = document.querySelector(".ks-karar-dugme:not([disabled])"); const r = k && gor(k);
    return r ? { d, hedef: merkez(r), tur: "karar" } : { d };
  }).catch(() => null);
  let sonSik = 0;
  while (Date.now() - bas < sinirMs) {
    const b = await bak();
    const d = b?.d ?? null;
    if (profil && pDurum === 0 && /^sayım|^giriş sahnesi|^bekle · Rakip bekleniyor/.test(d ?? "")) { pDurum = 1; await profil.bas(); }
    if (profil && pDurum === 1 && d === "soru") { pDurum = 2; await profil.bitir(); }
    if (d === "maç sonu") { son ??= Date.now(); if (Date.now() - son > 10000) return true; await s.waitForTimeout(500); continue; }
    if (b?.hedef) {
      // şık: insan gibi 0,7–1,9 sn düşün (aynı soruda ikinci dokunuş 1,5 sn sonra)
      if (b.tur === "sik") { if (Date.now() - sonSik < 1500) { await s.waitForTimeout(300); continue; } await s.waitForTimeout(700 + Math.random() * 1200); sonSik = Date.now(); }
      await s.touchscreen.tap(b.hedef.x, b.hedef.y).catch(() => {});
    }
    await s.waitForTimeout(400);
  }
  return false;
}

// Maç özeti: saniyelik kare hızı, durum çizelgesi (maç adresinden itibaren ms), sayım ve bekleme süreleri, ses çizelgesi
function macOzeti({ o, ses, olay, ctx }, bitti) {
  const t0 = o.macAdres ?? 0;
  const g = (t) => Math.round(t - t0);
  const kare = o.kare.filter(([t]) => t >= t0).map(([t, n, m]) => [g(t), n, m]);
  const durum = o.durum.map(([t, d]) => [g(t), d]);
  const sure = (desen) => { let top = 0; durum.forEach(([t, d], i) => { if (desen.test(d)) top += (durum[i + 1]?.[0] ?? t) - t; }); return top; };
  // 3-2-1 penceresi: ilk "sayım"/"giriş sahnesi" → ilk "soru"
  const sayBas = durum.find(([, d]) => /^sayım|^giriş sahnesi/.test(d))?.[0] ?? null;
  const soruBas = durum.find(([, d]) => d === "soru")?.[0] ?? null;
  const pencere = (a, b) => kare.filter(([t]) => a != null && b != null && t >= a - 1000 && t < b);
  const fpsOzet = (k) => k.length ? { ort: Math.round(k.reduce((x, y) => x + y[1], 0) / k.length), en_dusuk: Math.min(...k.map((x) => x[1])), en_uzun_kare: Math.max(...k.map((x) => x[2])) } : null;
  const uzun = o.uzun.filter(([st]) => st >= t0).map(([st, d]) => [g(st), Math.round(d)]);
  return {
    bitti, durum, kare, sik_secili_ms: o.sik ?? [],
    fps: { mac: fpsOzet(kare), sayim: fpsOzet(pencere(sayBas, soruBas)), bekleme: fpsOzet(kare.filter(([t]) => durum.some(([a, d], i) => /^bekle/.test(d) && t >= a && t < (durum[i + 1]?.[0] ?? a)))) },
    sure_ms: { bekle: sure(/^bekle/), sayim_3: sure(/^sayım 3$/), sayim_2: sure(/^sayım 2$/), sayim_1: sure(/^sayım 1$/), giris_hazir_ol: sure(/^giriş sahnesi · Hazır ol!$/) },
    uzun_gorev: uzun, uzun_gorev_sayim: uzun.filter(([st]) => sayBas != null && soruBas != null && st >= sayBas - 1000 && st < soruBas),
    ses: ses.map((x) => ({ t: g(x.t), rol: x.rol, sonuc: x.sonuc ?? "?", ...(x.basladi != null ? { gecikme: x.basladi - x.t, ctx: x.ctx } : {}), dosya: String(x.dosya ?? "").split("/").at(-1) })),
    ses_olay: olay.map((x) => ({ t: g(x.t), rol: x.rol, sonuc: x.sonuc })),
    audio_ctx: ctx.map(([t, d]) => [g(t), d]),
  };
}

function yazdir(kod, r) {
  const f = (x) => x ? `ort ${x.ort} · en düşük ${x.en_dusuk} fps · en uzun kare ${x.en_uzun_kare} ms` : "—";
  console.log(`  ${kod}: maç ${r.bitti ? "bitti" : "BİTMEDİ (süre sınırı)"} · fps maç ${f(r.fps.mac)}`);
  console.log(`    3-2-1 penceresi: ${f(r.fps.sayim)} · uzun görev ${r.uzun_gorev_sayim.length} (en uzun ${Math.max(0, ...r.uzun_gorev_sayim.map((x) => x[1]))} ms)`);
  console.log(`    bekleme: ${r.sure_ms.bekle} ms (${f(r.fps.bekleme)}) · "3" ${r.sure_ms.sayim_3} · "2" ${r.sure_ms.sayim_2} · "1" ${r.sure_ms.sayim_1} ms · Hazır ol! ${r.sure_ms.giris_hazir_ol} ms`);
  console.log(`    durum: ${r.durum.slice(0, 14).map(([t, d]) => `${t} ${d}`).join(" → ")}`);
  if (r.sik_secili_ms?.length) { const d = r.sik_secili_ms.map((x) => x[0]).sort((a, b) => a - b), b = r.sik_secili_ms.map((x) => x[1]).sort((a, b) => a - b); console.log(`    şık basış → seçildi: ${d.length} dokunuş · DOM ort ${Math.round(d.reduce((x, y) => x + y, 0) / d.length)} ms (en kötü ${d.at(-1)}) · boyama ort ${Math.round(b.reduce((x, y) => x + y, 0) / b.length)} ms (en kötü ${b.at(-1)})`); }
  const atlanan = r.ses.filter((x) => x.sonuc !== "calindi");
  console.log(`    ses: ${r.ses.length} istek · çalındı ${r.ses.length - atlanan.length} · çalınmadı ${atlanan.length}${atlanan.length ? ": " + atlanan.map((x) => `${x.rol}@${x.t} (${x.sonuc})`).join(", ") : ""}`);
  if (r.ses_olay.length) console.log(`    ses olayları: ${r.ses_olay.map((x) => `${x.rol}@${x.t} ${x.sonuc}`).join(", ")}`);
  console.log(`    AudioContext: ${r.audio_ctx.map(([t, d]) => `${t} ${d}`).join(" → ") || "—"} · konsol hatası ${r.konsol.length}`);
}

if (ARG.ida) IDA_OTURUM = await idaOturumu();
const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio"] });
const sonuc = { tarih: new Date().toISOString(), adres: ADRES, ag: AG, cpu: 6, ekranlar: {}, maclar: {} };
try {
  const SECILI = typeof ARG.sayfa === "string" ? ARG.sayfa.split(",") : null;   // --sayfa=ana,modlar
  for (const e of ARG.yalniz_mac ? [] : EKRANLAR.filter((x) => !SECILI || SECILI.includes(x.kod))) {
    const b = await baglamAc(tarayici);
    const { s, bayt } = await sayfaAc(b);
    const soguk = await olc(s, bayt, e.yol);
    const sicak = await olc(s, bayt, e.yol);
    sonuc.ekranlar[e.kod] = { ad: e.ad, soguk, sicak };
    console.log(`${e.ad.padEnd(10)} soğuk FCP ${soguk.fcp} · içerik ${soguk.icerik} · hazır ${soguk.hazir} · etkileşim ${soguk.etkilesim} · en uzun ${soguk.en_uzun_gorev} · TBT ${soguk.tbt} · SB ${soguk.supabase_istek}/${soguk.sira_turu} tur · JS ${soguk.bayt.js} KB`);
    console.log(`${"".padEnd(10)} sıcak FCP ${sicak.fcp} · içerik ${sicak.icerik} · hazır ${sicak.hazir} · etkileşim ${sicak.etkilesim} · en uzun ${sicak.en_uzun_gorev} · TBT ${sicak.tbt} · SB ${sicak.supabase_istek}/${sicak.sira_turu} tur`);
    await b.close();
  }

  if (ARG.mac) {
    const db = await new PgIstemci(await baglantiDizgisi()).baglan();
    const sorgu = async (q) => { const r = await db.sorgu(q); return r.rows ?? r; };
    const oturum = oturumOku();
    const jeton = (oturum.origins ?? []).flatMap((x) => x.localStorage ?? []).find((x) => x.name.includes("-auth-token"));
    const BEN = JSON.parse(Buffer.from(JSON.parse(jeton.value).access_token.split(".")[1], "base64url").toString()).sub;
    const gec = async (s) => { for (let i = 0; i < 3; i++) { const g = s.getByRole("button", { name: /^(Geç|Atla|Anladım|Tamam|Kapat)$/ }); if (!(await g.count())) break; await g.first().click({ timeout: 1500 }).catch(() => {}); await s.waitForTimeout(400); } };
    const MAC = {
      klasik: { yol: "/modlar", desen: /\/mac\/([0-9a-f-]{36})/, tablo: "matches", async tetik(s) {
        if (await s.locator(".bd-rakip-ara, [class*=arama-sahne], [class*=rakip-ara]").count()) return;
        await s.locator(".qt-mod--klasik").first().click({ timeout: 3000 }); await s.waitForTimeout(800);
        const ara = s.getByRole("button", { name: /Rakip ara|Maç ara|Oyna$/ }); if (await ara.count()) await ara.last().click({ timeout: 2000 }).catch(() => {}); } },
      duello: { yol: "/duello", desen: /\/duello\/([0-9a-f-]{36})/, tablo: "duellolar", async hazirla() {
        const [k] = await sorgu(`select count(*)::int n from matches where ${alintila(BEN)} in (oyuncu1, oyuncu2) and durum = 'bitti' and basladi`);
        const [bot] = await sorgu(`select id from profiles where is_bot and bot_turu = 'gizli' limit 1`);
        for (let i = Number(k?.n ?? 0); i < 5 && bot; i++) await sorgu(`insert into matches (oyuncu1, oyuncu2, durum, kazanan, bitis, basladi, dereceli) values (${alintila(BEN)}, ${alintila(bot.id)}, 'bitti', ${alintila(bot.id)}, now(), true, false)`);
      }, async tetik(s) { await gec(s); const a = s.getByRole("button", { name: /Rakip ara/i }); if (await a.count()) await a.first().click({ timeout: 2000 }); } },
      hazine: { yol: "/kasa", desen: /\/kasa\/([0-9a-f-]{36})/, tablo: "kasa_maclari", async tetik(s) { await gec(s); const a = s.getByRole("button", { name: /Rakip ara/i }); if (await a.count()) await a.first().click({ timeout: 2000 }); } },
    };
    const MODSEC = typeof ARG.mod === "string" ? ARG.mod.split(",") : null;
    const ETIKET = typeof ARG.etiket === "string" ? ARG.etiket : "olcum";
    const VIDEO = path.resolve(".tmp/yavas-mac", ETIKET);
    fs.mkdirSync(VIDEO, { recursive: true });
    for (const [kod, m] of Object.entries(MAC).filter(([k]) => !MODSEC || MODSEC.includes(k))) {
      let id = null;
      const b = await baglamAc(tarayici, { video: VIDEO });
      const konsol = [];
      try {
        if (!IDA_OTURUM) await m.hazirla?.();
        const { s, bayt, cdp } = await sayfaAc(b);
        s.on("console", (x) => { if (x.type() === "error") konsol.push(x.text().slice(0, 200)); });
        s.on("pageerror", (e) => konsol.push("pageerror: " + String(e.message).slice(0, 200)));
        const lobi = await olc(s, bayt, m.yol);
        await gec(s);
        for (let i = 0; i < 120 && !m.desen.test(s.url()); i++) { if (i % 8 === 0) await m.tetik(s).catch(() => {}); await s.waitForTimeout(600); }
        id = s.url().match(m.desen)?.[1] ?? null;
        if (!id) throw new Error("maça girilemedi");
        for (let i = 0; i < 80; i++) { const v = await s.evaluate(() => window.__olc.ilkMac).catch(() => null); if (v != null) break; await s.waitForTimeout(250); }
        await s.waitForTimeout(2500);
        const o = await s.evaluate(() => window.__olc);
        const pencere = o.uzun.filter(([st]) => st >= (o.macAdres ?? Infinity) && st <= (o.ilkMac ?? Infinity) + 2000);
        const ist = o.istek.filter((k) => k.bas >= (o.macAdres ?? Infinity) && k.bas <= (o.ilkMac ?? Infinity));
        sonuc.maclar[kod] = { lobi, mac_acilis: Math.round((o.ilkMac ?? NaN) - (o.macAdres ?? NaN)), en_uzun_gorev: Math.round(Math.max(0, ...pencere.map((x) => x[1]))),
          tbt: Math.round(pencere.reduce((a, x) => a + Math.max(0, x[1] - 50), 0)), supabase_istek: ist.length,
          istekler: ist.map((k) => `${Math.round(k.bas - o.macAdres)}-${Math.round((k.bit ?? 0) - o.macAdres)} ${k.yol.replace("/rest/v1/rpc/", "rpc:")}`) };
        const r = sonuc.maclar[kod];
        console.log(`Maç ${kod.padEnd(7)} lobi hazır ${lobi.hazir} (etkileşim ${lobi.etkilesim}) · maç adresi → ilk kare ${r.mac_acilis} ms · en uzun ${r.en_uzun_gorev} · TBT ${r.tbt} · SB ${r.supabase_istek}`);
        // ---- maçın tamamı: oto oyuncu (rastgele şık · Hazine'de etkin ilk karar düğmesi = AÇ) → maç sonu + 10 sn
        // --profil: 3-2-1 penceresinin JS profili (CDP, 1 ms örnek) → .tmp/yavas-mac/<etiket>/<mod>-sayim.cpuprofile
        const profil = ARG.profil ? {
          // JS profili + Chrome izi (stil/yerleşim/boyama ana iş parçacığında ne kadar — profilde "(program)" görünen kısım)
          bas: async () => {
            await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 1000 }); await cdp.send("Profiler.start");
            await tarayici.startTracing(s, { categories: ["devtools.timeline", "disabled-by-default-devtools.timeline"] }).catch(() => {});
          },
          bitir: async () => {
            const { profile } = await cdp.send("Profiler.stop"); fs.writeFileSync(path.join(VIDEO, `${kod}-sayim.cpuprofile`), JSON.stringify(profile));
            const iz = await tarayici.stopTracing().catch(() => null); if (iz) fs.writeFileSync(path.join(VIDEO, `${kod}-sayim.trace.json`), iz);
          },
        } : null;
        const bitti = await otoOyna(s, Number(ARG.sinir_sn ?? 480) * 1000, profil);
        const t = await s.evaluate(() => ({ o: window.__olc, ses: window.__sesKayit ?? [], olay: window.__sesOlay ?? [], ctx: window.__sesCtx ?? [], akis: window.__akis ?? [] }));
        Object.assign(r, macOzeti(t, bitti), { konsol, akis: t.akis });
        r.video = path.relative(process.cwd(), await s.video()?.path().catch(() => null) ?? "") || null;
        yazdir(kod, r);
      } catch (e) { console.log(`Maç ${kod}: ${e.message}`); sonuc.maclar[kod] = { hata: e.message, konsol }; }
      finally {
        if (id) await sorgu(`update ${m.tablo} set durum = 'iptal', bitis = now() where id = ${alintila(id)} and durum = 'aktif'`).catch((e) => console.log("  kapatılamadı:", e.message));
        await b.close();
        // video bağlam kapanınca yazılır → okunur adla
        const v = sonuc.maclar[kod]?.video;
        if (v && fs.existsSync(v)) { const yeni = path.join(VIDEO, `${kod}.webm`); fs.renameSync(v, yeni); sonuc.maclar[kod].video = path.relative(process.cwd(), yeni); }
      }
    }
    await db.kapat?.();
  }
} finally {
  await tarayici.close();
  fs.mkdirSync(path.dirname(CIKTI), { recursive: true });
  fs.writeFileSync(CIKTI, JSON.stringify(sonuc, null, 2));
  console.log("→", CIKTI);
}
