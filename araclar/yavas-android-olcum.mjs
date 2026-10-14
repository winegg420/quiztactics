// Ucuz Android açılış ölçümü — yerel ÜRETİM derlemesi (vite preview) + canlı Supabase, normal oyuncu kadar istek.
// Taklit: CPU 6x yavaş · yavaş 4G (150 ms RTT, 1,6 Mbit/s iniş, 750 kbit/s çıkış) · 390×844 · Android Chrome UA.
// Her ekran: soğuk (boş HTTP önbelleği, yeni bağlam) + sıcak (aynı bağlamda ikinci açılış). SW kapalı (iki koşu karşılaştırılabilir).
// Ölçer: ilk boyama (FCP), en büyük boyama (LCP), içerik hazır (yükleniyor göstergesi yok + ertelenmeyen Supabase istekleri bitmiş,
// 300 ms sabit), tam hazır (bütün istekler dahil),
// etkileşime hazır (son uzun görevden sonra 2 sn sessizlik), en uzun görev, toplam engelleme (TBT), Supabase istek sayısı/şelalesi, indirilen bayt.
// Maç açılışı (--mac): Klasik, Düello, Ortak Hazine — bota karşı TEK maç; maç adresine geçişten ilk oynanabilir kareye kadar.
// Kullanım: npm run build && npx vite preview --port 5199 --strictPort
//           node araclar/test-oturumu.mjs --ac --adres=http://localhost:5199 --oturum=<dosya>
//           node araclar/yavas-android-olcum.mjs --adres=http://localhost:5199 --oturum=<dosya> [--mac] [--cikti=...json]
//           node araclar/test-oturumu.mjs --sil --oturum=<dosya>
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
  const ps = history.pushState;
  history.pushState = function (...a) { const r = ps.apply(this, a); if (/\/(mac|duello|kasa)\/[0-9a-f-]{36}/.test(location.pathname) && o.macAdres == null) o.macAdres = performance.now(); return r; };
  const YUKLENIYOR = "#qt-ilk-yukleme, [aria-busy=true], [class*=iskelet], [class*=yukleniyor], [class*=skeleton], .qt-durum--yukleniyor";
  const gorunur = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; };
  let aday = null, adayI = null;
  const bak = () => {
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

async function baglamAc(tarayici) {
  const oturum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  const hedef = new URL(ADRES).origin;
  oturum.origins = (oturum.origins ?? []).map((x) => ({ ...x, origin: hedef }));
  const b = await tarayici.newContext({ storageState: oturum, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: UA, locale: "tr-TR", serviceWorkers: "block" });
  await b.addInitScript(IZCI);
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
  return { s, bayt };
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

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const sonuc = { tarih: new Date().toISOString(), adres: ADRES, ag: AG, cpu: 6, ekranlar: {}, maclar: {} };
try {
  for (const e of ARG.yalniz_mac ? [] : EKRANLAR) {
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
    const oturum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
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
    for (const [kod, m] of Object.entries(MAC)) {
      let id = null;
      const b = await baglamAc(tarayici);
      try {
        await m.hazirla?.();
        const { s, bayt } = await sayfaAc(b);
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
      } catch (e) { console.log(`Maç ${kod}: ${e.message}`); sonuc.maclar[kod] = { hata: e.message }; }
      finally {
        if (id) await sorgu(`update ${m.tablo} set durum = 'iptal', bitis = now() where id = ${alintila(id)} and durum = 'aktif'`).catch((e) => console.log("  kapatılamadı:", e.message));
        await b.close();
      }
    }
    await db.kapat?.();
  }
} finally {
  await tarayici.close();
  fs.writeFileSync(CIKTI, JSON.stringify(sonuc, null, 2));
  console.log("→", CIKTI);
}
