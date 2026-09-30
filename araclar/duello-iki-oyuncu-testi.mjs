// ============================================================
// DÜELLO İKİ OYUNCU TESTİ — iki gerçek tarayıcı bağlamıyla tam Hâkimiyet maçı (1 Eki 2026)
//
// Neden: 30 Eyl gece Ida (Samsung Android Chrome) + arkadaşı (iPhone Safari) maçında geri sayım
// sıfırda takıldı, sonra ~20–30 kez "3"ten başlayıp sıfıra indi. Kök: rakip kopuk sayılınca sunucu
// (duello2_ilerlet) her çağrıda faz bitişini "şimdi + 3 sn"ye itiyordu; ekran bunu yeni geri sayım
// diye çiziyordu. Bu araç senaryoyu iki bağlamla yeniden üretir ve ölçer.
//
// A = "Samsung" (Galaxy S24, Chromium), B = "iPhone" (iPhone 13 görünümü + UA, Chromium — WebKit bu
// makinede çalışmıyor). B'nin bütün Supabase trafiği --gecikme ms yavaşlatılır. Bozulmalar (B'de):
//   tur 3  : 5 sn ağ kopması (context.setOffline)
//   tur 5  : 8 sn arka plan (visibilityState=hidden + sayfa DONDURULUR: CDP Page.setWebLifecycleState)
//   tur 7  : --uzun-kopma sn (vars. 32) arka plan → sunucu B'yi kopuk sayar (eşik 25 sn), sonra döner
// Her sayfa her karede faz / tur / sayaç rakamı / bant metnini kaydeder. Ölçülen:
//   · aynı fazda sayacın yeniden yükselmesi (özellikle yeniden "3"ten başlama) — 0 olmalı
//   · sayacın "0"da kaldığı en uzun süre (kopukluk bandı yokken) — takılma
//   · maç sonuna varıldı mı, kaç tur, yuvalar
//
// Kullanım (önce `npm run dev`):
//   node araclar/duello-iki-oyuncu-testi.mjs [--adres=http://127.0.0.1:5173] [--gecikme=150]
//        [--bozulma=offline,arka,kopuk] [--uzun-kopma=32] [--ss=tasarim/duello/16tur] [--sil] [--etiket=once]
// Gerekirse yeni oyuncu kilidini (duello_acilis_mac_esigi) test süresince 0'a çeker ve eski değere geri koyar.
// Ham kayıt: .tmp/duello-iki-oyuncu-<etiket>.json
// ============================================================
import { chromium, devices } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const ADRES = String(ARG.adres || "http://127.0.0.1:5173").replace(/\/$/, "");
const GECIKME = Number(ARG.gecikme ?? 150);
const BOZULMA = new Set(String(ARG.bozulma ?? "offline,arka,kopuk").split(",").filter(Boolean));
const UZUN_KOPMA_SN = Number(ARG["uzun-kopma"] ?? 32);
const SS = ARG.ss ? String(ARG.ss) : null;
const ETIKET = String(ARG.etiket ?? "test");
const SIL = Boolean(ARG.sil);
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const sorgu = async (sql) => { const r = await db.sorgu(sql); return Array.isArray(r) ? r : (r?.rows ?? []); };

// Sayfada her karede: faz, tur, sayaç, bant. Görünürlük gerçek tarayıcıda değişmediği için test,
// iOS arka planını window.__gorunurluk ile taklit eder (document.visibilityState bunu okur).
const KAYIT_KODU = () => {
  window.__kayit = [];
  window.__gorunurluk = "visible";
  try { localStorage.setItem("bildim_duello_tanitim_v9", "1"); } catch { /* yok */ }   // tanıtım aramayı geciktirmesin
  try {
    Object.defineProperty(Document.prototype, "visibilityState", { configurable: true, get: () => window.__gorunurluk });
    Object.defineProperty(Document.prototype, "hidden", { configurable: true, get: () => window.__gorunurluk !== "visible" });
  } catch { /* yok */ }
  let son = "";
  const tik = () => {
    try {
      const mac = document.querySelector(".hk-mac");
      const faz = mac ? (mac.className.match(/hk-mac--(\w+)/) || [])[1] || "?" : (document.querySelector(".msk, .bd-duello") ? "bitti" : "");
      const tur = (document.querySelector(".hk-tur")?.textContent || "").replace(/\s+/g, " ").trim();
      const sayac = (document.querySelector(".hk-sayac .qt-sayac-sayi")?.textContent || "").trim();
      const bant = [...document.querySelectorAll(".m2-bant")].map((e) => e.textContent.replace(/\s+/g, " ").trim()).join(" / ").slice(0, 80);
      const soru = (document.querySelector(".qt-soru-metin")?.textContent || "").trim().slice(0, 30);
      const imza = `${faz}|${tur}|${sayac}|${bant}|${soru}`;
      if (imza !== son) { son = imza; window.__kayit.push({ t: Date.now(), faz, tur, sayac, bant, soru }); }
    } catch { /* yok */ }
    requestAnimationFrame(tik);
  };
  requestAnimationFrame(tik);
  // Dondurulmuş sayfada rAF durur; kayıt dönüşte kaldığı yerden sürer.
};

async function modalTemizle(sayfa, ad) {
  for (let tur = 0; tur < 25; tur++) {
    await sayfa.waitForTimeout(700);
    if (!(await sayfa.locator(".bd-modal-katman, .bd-tanitim-katman").count())) return;
    const tikla = async (l) => { if (await l.count()) { await l.first().click({ timeout: 3000 }).catch(() => {}); return true; } return false; };
    if (await tikla(sayfa.getByRole("button", { name: /^Atla$/ }))) continue;
    if (await tikla(sayfa.getByRole("button", { name: /Hadi başlayalım/i }))) continue;
    const alan = sayfa.locator(".bd-modal-katman input.g-girdi").first();
    if ((await alan.count()) && !(await sayfa.locator(".bd-modal-katman [role=combobox]").count())) {
      await alan.fill(ad).catch(() => {});
      await tikla(sayfa.getByRole("button", { name: /^Devam$/ }));
      continue;
    }
    const ikon = sayfa.locator(".bd-modal-katman .bd-avatar-secenek, .bd-modal-katman img[src*='/avatars/']").first();
    if (await ikon.count()) { await ikon.click({ timeout: 3000 }).catch(() => {}); await sayfa.waitForTimeout(300); }
    if (await tikla(sayfa.getByRole("button", { name: /Bu avatarı kullan/i }))) continue;
    if (await tikla(sayfa.getByRole("button", { name: /Avatarsız devam et/i }))) continue;
    const sehir = sayfa.locator(".bd-modal-katman [role=combobox]").first();
    if (await sehir.count()) {
      await sehir.click({ timeout: 3000 }).catch(() => {});
      await sayfa.locator(".bd-modal-katman [role=option]").first().waitFor({ timeout: 8000 }).catch(() => {});
      await tikla(sayfa.locator(".bd-modal-katman [role=option]"));
      await tikla(sayfa.getByRole("button", { name: /Oyuna başla/i }));
      continue;
    }
    if (await tikla(sayfa.getByRole("button", { name: /^Devam/ }))) continue;
    // Sihirbaz bittikten sonra: iOS "Ana Ekrana Ekle" ve tanıtım pencereleri
    if (await tikla(sayfa.getByRole("button", { name: /^(Anladım|Geç)$/ }))) continue;
  }
}

async function misafirGiris(sayfa, ad) {
  await sayfa.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  await sayfa.getByRole("button", { name: /Misafir olarak dene/i }).click({ timeout: 20000 });
  await sayfa.locator(".as-buyuk-dugme--oyna").first().waitFor({ state: "attached", timeout: 30000 });
  await sayfa.waitForTimeout(1500);
  await modalTemizle(sayfa, ad);
}

async function baglam(tarayici, cihaz) {
  const { defaultBrowserType: _yok, ...ayar } = devices[cihaz];
  const b = await tarayici.newContext({ ...ayar });
  await b.addInitScript(KAYIT_KODU);
  return b;
}

async function gecikmeUygula(b, ms) {
  if (!(ms > 0)) return;
  await b.route(/supabase\.co\/(rest|auth|functions)\//, async (route) => {
    try { await bekle(ms); const r = await route.fetch(); await bekle(ms); await route.fulfill({ response: r }); }
    catch { await route.abort().catch(() => {}); }
  });
  await b.routeWebSocket(/supabase\.co\/realtime/, (ws) => {
    const sunucu = ws.connectToServer();
    ws.onMessage((m) => setTimeout(() => { try { sunucu.send(m); } catch { /* kapalı */ } }, ms));
    sunucu.onMessage((m) => setTimeout(() => { try { ws.send(m); } catch { /* kapalı */ } }, ms));
    ws.onClose((k, r) => setTimeout(() => sunucu.close({ code: k, reason: r }), ms));
  });
}

async function tokenVeSil(sayfa, anahtar) {
  return sayfa.evaluate(async (apikey) => {
    const k = Object.keys(localStorage).find((x) => x.includes("auth-token"));
    if (!k) return "oturum yok";
    const t = JSON.parse(localStorage.getItem(k));
    const ref = k.replace(/^sb-/, "").replace(/-auth-token$/, "");
    const r = await fetch(`https://${ref}.supabase.co/rest/v1/rpc/hesabimi_sil`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t.access_token}`, apikey }, body: "{}",
    });
    return r.status + " " + (await r.text()).slice(0, 80);
  }, anahtar);
}

// ---- arka plan taklidi: görünürlük gizli + sayfa dondurulur (iOS Safari arka planda JS'i askıya alır)
// agKes: iOS askıya alınmış sekme hiç istek atmaz (30 Eyl olayında arkadaşın cihazı 19:20:08'den sonra sustu).
// Başsız Chromium'da dondurma JS'i her zaman durdurmadığı için uzun kopmada ağ da kesilir.
async function arkaPlan(sayfa, cdp, sn, not, agKes = false) {
  console.log(`  · B arka plana alındı (${sn} sn${agKes ? ", ağ kesik" : ""}) — ${not}`);
  if (agKes) await sayfa.context().setOffline(true);
  await sayfa.evaluate(() => { window.__gorunurluk = "hidden"; document.dispatchEvent(new Event("visibilitychange")); }).catch(() => {});
  await cdp.send("Page.setWebLifecycleState", { state: "frozen" }).catch((e) => console.log("   dondurma yok:", e.message));
  await bekle(sn * 1000);
  await cdp.send("Page.setWebLifecycleState", { state: "active" }).catch(() => {});
  if (agKes) await sayfa.context().setOffline(false);
  await sayfa.evaluate(() => {
    window.__gorunurluk = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  }).catch(() => {});
  console.log("  · B öne döndü");
}

// ---- tek oyuncu adımı: saldıransa kart + onay, cevap fazında şık
const sonAdim = { A: "", B: "" };
async function oyna(ad, s) {
  const tani = await s.evaluate(() => window.__bdTani ?? null).catch(() => null);
  if (!tani) return;
  const tur = await s.locator(".hk-tur").first().innerText({ timeout: 300 }).catch(() => "");
  if (tani.faz === "kategori") {
    const dugme = s.locator(".hk-cubuk-dugme:not([disabled])");
    const kartlar = s.locator("button.hk-kart:not([disabled])");
    const n = await kartlar.count().catch(() => 0);
    if (!n) return;
    const anahtar = `k|${tur}`;
    if (sonAdim[ad] === anahtar) return;
    // Saldıran mı? Alt çubukta eylem düğmesi yalnız saldırana çıkar (kart seçilince).
    if (!(await s.locator(".hk-kart--secili").count())) await kartlar.nth(Math.floor(Math.random() * n)).tap({ timeout: 1500 }).catch(() => {});
    await s.waitForTimeout(250);
    if (await dugme.count()) {
      await bekle(1000 + Math.random() * 3000);
      await dugme.first().tap({ timeout: 2000 }).catch(() => {});
      sonAdim[ad] = anahtar;
    } else sonAdim[ad] = anahtar;   // savunan: "Hazır" işareti yeter
  } else if (tani.faz === "cevap" && !tani.kilitli && !tani.sureBitti) {
    const anahtar = `c|${tur}|${tani.benimBitis}`;
    if (sonAdim[ad] === anahtar) return;
    sonAdim[ad] = anahtar;
    await bekle(1500 + Math.random() * 5000);
    const siklar = s.locator(".qt-sik:not([disabled])");
    const n = await siklar.count().catch(() => 0);
    if (n) await siklar.nth(Math.floor(Math.random() * n)).tap({ timeout: 2000 }).catch(() => {});
  }
}

// ---- tur noktaları ölçümü (16 tur): nokta sayısı, satır taşması, görünür alan dışı
async function noktaOlc(sayfa) {
  return sayfa.evaluate(() => {
    const ol = document.querySelector(".hk-noktalar");
    if (!ol) return null;
    const li = [...ol.querySelectorAll(".hk-nokta")].map((e) => e.getBoundingClientRect());
    const r = ol.getBoundingClientRect();
    return { n: li.length, vw: innerWidth, vh: innerHeight, sol: Math.round(Math.min(...li.map((x) => x.left))), sag: Math.round(Math.max(...li.map((x) => x.right))),
      satir: new Set(li.map((x) => Math.round(x.top))).size, tasma: ol.scrollWidth > ol.clientWidth + 1 || li.some((x) => x.right > innerWidth || x.left < 0),
      sayfaTasma: document.documentElement.scrollWidth > innerWidth + 1, genislik: Math.round(r.width),
      tur: (document.querySelector(".hk-tur")?.textContent || "").replace(/s+/g, " ").trim() };
  }).catch(() => null);
}

// ---- kayıt analizi
function analiz(kayit, basT) {
  const sonuc = { yenidenBaslama: [], ucDongu: 0, sifirdaKalma: [], enUzunSifirMs: 0, bantSn: 0 };
  let onceki = null;
  let sifirBas = null;
  const enDusuk = new Map();   // faz anahtarı → görülen en düşük sayaç
  for (const o of kayit) {
    const anahtar = `${o.tur}|${o.faz}${o.faz === "cevap" ? "|" + (o.soru || "") : ""}`;   // Altın Soru: her yeni soru yeni faz
    const n = o.sayac === "" ? null : Number(o.sayac);
    if (n != null && Number.isFinite(n) && ["kategori", "cevap"].includes(o.faz)) {
      const dusuk = enDusuk.get(anahtar);
      if (dusuk != null && n >= dusuk + 2) {
        sonuc.yenidenBaslama.push({ s: ((o.t - basT) / 1000).toFixed(1), anahtar, dusuk, n, bant: o.bant });
        if (n === 3) sonuc.ucDongu++;
      }
      enDusuk.set(anahtar, dusuk == null ? n : Math.min(dusuk, n));
    }
    // Sıfırda kalma: sayaç 0 ve faz değişmeden bekleme (bant yokken takılma sayılır)
    const sifir = n === 0 && ["kategori", "cevap"].includes(o.faz);
    if (sifir && !sifirBas) sifirBas = { t: o.t, anahtar, bant: o.bant };
    if (!sifir && sifirBas) {
      const ms = o.t - sifirBas.t;
      if (ms > 3000) sonuc.sifirdaKalma.push({ s: ((sifirBas.t - basT) / 1000).toFixed(1), ms, anahtar: sifirBas.anahtar, bant: sifirBas.bant });
      if (!sifirBas.bant) sonuc.enUzunSifirMs = Math.max(sonuc.enUzunSifirMs, ms);
      sifirBas = null;
    }
    onceki = o;
  }
  void onceki;
  return sonuc;
}

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const ctxA = await baglam(tarayici, "Galaxy S24");
const ctxB = await baglam(tarayici, "iPhone 13");
const A = await ctxA.newPage();
const B = await ctxB.newPage();
const cdpB = await ctxB.newCDPSession(B);
const konsol = { A: [], B: [] };
for (const [ad, p] of [["A", A], ["B", B]]) {
  p.on("console", (m) => { if (["error", "warning"].includes(m.type())) konsol[ad].push({ t: Date.now(), m: m.text().slice(0, 160) }); });
  p.on("pageerror", (e) => konsol[ad].push({ t: Date.now(), m: "pageerror " + String(e).slice(0, 140) }));
}
let apikey = "";
A.on("request", (r) => { const k = r.headers()["apikey"]; if (k) apikey = k; });

const [esikSatir] = await sorgu("select deger from oyun_ayarlari where anahtar = 'duello_acilis_mac_esigi'");
const eskiEsik = esikSatir?.deger ?? "5";
let esikDegisti = false;
let macId = null;
const rapor = { etiket: ETIKET, adres: ADRES, gecikme: GECIKME, bozulma: [...BOZULMA], uzunKopmaSn: UZUN_KOPMA_SN };
try {
  console.log(`Düello iki oyuncu testi [${ETIKET}] — ${ADRES} · B +${GECIKME} ms · bozulma: ${[...BOZULMA].join(",") || "yok"}`);
  await Promise.all([misafirGiris(A, "DuelA" + Math.floor(Math.random() * 900 + 100)),
                     misafirGiris(B, "DuelB" + Math.floor(Math.random() * 900 + 100))]);
  console.log("· iki misafir hazır");
  if (Number(eskiEsik) > 0) {
    await sorgu("update oyun_ayarlari set deger = '0' where anahtar = 'duello_acilis_mac_esigi'");
    esikDegisti = true;
    console.log(`· yeni oyuncu kilidi test için 0 (eski ${eskiEsik})`);
  }
  await gecikmeUygula(ctxB, GECIKME);
  for (const p of [A, B]) { await p.goto(ADRES + "/duello", { waitUntil: "domcontentloaded" }); }
  await bekle(2500);
  for (const p of [A, B]) await modalTemizle(p, "Duel");
  const macMi = (p) => /\/duello\/[0-9a-f-]{36}/.test(p.url());
  // İki taraf da lobide ve pencere yokken aramayı AYNI ANDA başlat (biri önde kalırsa gizli bota düşer: 3–15 sn)
  for (const p of [A, B]) {
    await p.getByRole("button", { name: /Rakip ara|Find opponent/i }).first().waitFor({ timeout: 20000 });
    await modalTemizle(p, "Duel");
  }
  await Promise.all([A, B].map((p) => p.getByRole("button", { name: /Rakip ara|Find opponent/i }).first().tap({ timeout: 3000 }).catch(() => {})));
  for (let i = 0; i < 90 && !(macMi(A) && macMi(B)); i++) await bekle(500);
  if (!(macMi(A) && macMi(B))) throw new Error("iki sayfa maça giremedi");
  const idA = A.url().match(/duello\/([0-9a-f-]{36})/)[1];
  const idB = B.url().match(/duello\/([0-9a-f-]{36})/)[1];
  if (idA !== idB) throw new Error(`iki hesap farklı düelloya düştü (${idA.slice(0, 8)} / ${idB.slice(0, 8)}) — bot eşleşmesi, test geçersiz`);
  macId = idA;
  console.log(`· düello ${macId} (gerçek eşleşme)`);
  const basT = Date.now();
  rapor.macId = macId;

  const yapilan = new Set();
  const noktalar = [];
  // Ölçü: A 390×700, B 360×640 (Ida'nın istediği iki kısa ekran)
  await A.setViewportSize({ width: 390, height: 700 });
  await B.setViewportSize({ width: 360, height: 640 });
  const bozulmalar = [];
  let bitti = false;
  let ssAlindi = 0;
  while (Date.now() - basT < 20 * 60 * 1000) {
    const [d] = await sorgu(`select durum, tur, faz, yuva1, yuva2, kopuk_at from duellolar where id = ${alintila(macId)}`);
    if (!d) throw new Error("düello satırı yok");
    if (d.durum !== "aktif") { bitti = true; rapor.son = d; break; }
    if (d.kopuk_at && !rapor.kopukAt) { rapor.kopukAt = ((Date.now() - basT) / 1000).toFixed(1); console.log(`  · sunucu B'yi kopuk saydı (+${rapor.kopukAt} sn)`); }
    const tur = Number(d.tur);
    // Bozulmalar (B = iPhone)
    if (BOZULMA.has("offline") && tur === 3 && !yapilan.has("offline")) {
      yapilan.add("offline");
      const t0 = Date.now();
      console.log("  · B ağ bağlantısı 5 sn koptu (tur 3)");
      await ctxB.setOffline(true); await bekle(5000); await ctxB.setOffline(false);
      bozulmalar.push({ tur: "offline", s: ((t0 - basT) / 1000).toFixed(1), sn: 5 });
    }
    if (BOZULMA.has("arka") && tur === 5 && !yapilan.has("arka")) {
      yapilan.add("arka");
      const t0 = Date.now();
      await arkaPlan(B, cdpB, 8, "tur 5");
      bozulmalar.push({ tur: "arka", s: ((t0 - basT) / 1000).toFixed(1), sn: 8 });
    }
    if (BOZULMA.has("kopuk") && tur === 7 && !yapilan.has("kopuk")) {
      yapilan.add("kopuk");
      const t0 = Date.now();
      // B arka plandayken A oynamayı sürdürür (döngü B'yi dondurduğu için A'yı ayrı sürer)
      const aSur = (async () => { while (Date.now() - t0 < UZUN_KOPMA_SN * 1000) { await oyna("A", A).catch(() => {}); await bekle(300); } })();
      await Promise.all([arkaPlan(B, cdpB, UZUN_KOPMA_SN, "tur 7, kopukluk eşiğini aşar", true), aSur]);
      bozulmalar.push({ tur: "kopuk", s: ((t0 - basT) / 1000).toFixed(1), sn: UZUN_KOPMA_SN });
      if (SS) { fs.mkdirSync(SS, { recursive: true }); await A.screenshot({ path: path.join(SS, `kopuk-donus-A-${ETIKET}.png`) }).catch(() => {}); }
    }
    await Promise.all([oyna("A", A).catch(() => {}), oyna("B", B).catch(() => {})]);
    if ([2, 9, 16].includes(tur) && !yapilan.has("olc" + tur)) {
      yapilan.add("olc" + tur);
      for (const [ad, p] of [["A 390×700", A], ["B 360×640", B]]) {
        const o = await noktaOlc(p);
        if (o) { noktalar.push({ ad, ...o }); console.log(`  · tur noktaları ${ad}: ${o.n} nokta, ${o.satir} satır, x ${o.sol}–${o.sag} / ${o.vw}${o.tasma || o.sayfaTasma ? " TAŞMA" : " (taşma yok)"} — ${o.tur}`); }
        if (SS) { fs.mkdirSync(SS, { recursive: true }); await p.screenshot({ path: path.join(SS, `tur${tur}-${ad.split(" ")[1]}-${ETIKET}.png`) }).catch(() => {}); }
      }
    }
    if (SS && ssAlindi < 3 && tur >= 2 + ssAlindi * 5) {
      fs.mkdirSync(SS, { recursive: true });
      await A.screenshot({ path: path.join(SS, `iki-oyuncu-${ETIKET}-tur${tur}-A.png`) }).catch(() => {});
      await B.screenshot({ path: path.join(SS, `iki-oyuncu-${ETIKET}-tur${tur}-B.png`) }).catch(() => {});
      ssAlindi++;
    }
    await bekle(250);
  }
  await bekle(4000);
  if (SS) {
    await A.screenshot({ path: path.join(SS, `iki-oyuncu-${ETIKET}-son-A.png`) }).catch(() => {});
    await B.screenshot({ path: path.join(SS, `iki-oyuncu-${ETIKET}-son-B.png`) }).catch(() => {});
  }
  const kA = await A.evaluate(() => window.__kayit).catch(() => []);
  const kB = await B.evaluate(() => window.__kayit).catch(() => []);
  const [son] = await sorgu(`select durum, tur, faz, yuva1, yuva2, terk_eden, kazanan, uzatma,
      (select count(*) from duello_hamleler h where h.duello_id = d.id) hamle,
      (select max(extract(epoch from (h2.created_at - h1.created_at))) from duello_hamleler h1
         join duello_hamleler h2 on h2.duello_id = h1.duello_id and h2.id = (select min(id) from duello_hamleler h3 where h3.duello_id = h1.duello_id and h3.id > h1.id)
        where h1.duello_id = d.id) en_uzun_hamle_arasi
      from duellolar d where id = ${alintila(macId)}`);
  rapor.son = son; rapor.bitti = bitti; rapor.bozulmalar = bozulmalar; rapor.noktalar = noktalar;
  rapor.A = analiz(kA, basT); rapor.B = analiz(kB, basT);
  rapor.konsol = { A: konsol.A.filter((k) => k.t >= basT).slice(0, 40), B: konsol.B.filter((k) => k.t >= basT).slice(0, 40) };
  fs.mkdirSync(".tmp", { recursive: true });
  fs.writeFileSync(path.join(".tmp", `duello-iki-oyuncu-${ETIKET}.json`), JSON.stringify({ ...rapor, kA, kB, basT }, null, 1));

  console.log(`\n=== SONUÇ [${ETIKET}] ===`);
  console.log(`maç: ${bitti ? "BİTTİ" : "BİTMEDİ (20 dk)"} · durum ${son?.durum} · tur ${son?.tur} · hamle ${son?.hamle} · yuva ${son?.yuva1}-${son?.yuva2}${son?.terk_eden ? " · TERK " + String(son.terk_eden).slice(0, 8) : ""}${son?.uzatma ? " · Altın Soru" : ""} · en uzun hamle arası ${Number(son?.en_uzun_hamle_arasi ?? 0).toFixed(1)} sn`);
  console.log(`bozulmalar: ${bozulmalar.map((b) => `${b.tur}@${b.s}s(${b.sn}sn)`).join(" · ") || "yok"}`);
  for (const [ad, r] of [["A (Samsung)", rapor.A], ["B (iPhone)", rapor.B]]) {
    console.log(`${ad}: aynı fazda sayaç yeniden yükseldi ${r.yenidenBaslama.length} kez (yeniden "3" ${r.ucDongu}) · 0'da >3 sn kalma ${r.sifirdaKalma.length} (bantsız en uzun ${(r.enUzunSifirMs / 1000).toFixed(1)} sn)`);
    for (const x of r.yenidenBaslama.slice(0, 6)) console.log(`   ↺ ${x.s}s ${x.anahtar} ${x.dusuk}→${x.n}${x.bant ? " [bant: " + x.bant + "]" : ""}`);
    for (const x of r.sifirdaKalma.slice(0, 6)) console.log(`   ⏸ ${x.s}s ${x.anahtar} ${(x.ms / 1000).toFixed(1)} sn${x.bant ? " [bant: " + x.bant + "]" : ""}`);
  }
  const hatalar = [...rapor.konsol.A.map((k) => "A " + k.m), ...rapor.konsol.B.map((k) => "B " + k.m)].filter((m) => /yüklenemedi|57014|timeout|Error/i.test(m));
  console.log(`konsol hata/uyarı (maç içi): A ${rapor.konsol.A.length} · B ${rapor.konsol.B.length}${hatalar.length ? " — " + hatalar.slice(0, 4).join(" | ") : ""}`);
  const gecti = bitti && son?.durum === "bitti" && !son?.terk_eden && rapor.A.yenidenBaslama.length === 0 && rapor.B.yenidenBaslama.length === 0 && rapor.A.enUzunSifirMs < 5000 && rapor.B.enUzunSifirMs < 5000;
  console.log(gecti ? "KABUL: GEÇTİ" : "KABUL: GEÇMEDİ");
  if (!gecti) process.exitCode = 2;
} catch (e) {
  console.log("HATA:", e?.message ?? e);
  await A.screenshot({ path: ".tmp/duello-iki-A.png" }).catch(() => {}); await B.screenshot({ path: ".tmp/duello-iki-B.png" }).catch(() => {});
  process.exitCode = 1;
} finally {
  if (esikDegisti) {
    await sorgu(`update oyun_ayarlari set deger = ${alintila(String(eskiEsik))} where anahtar = 'duello_acilis_mac_esigi'`).catch((e) => console.log("! eşik geri alınamadı:", e.message));
    console.log(`· yeni oyuncu kilidi geri alındı (${eskiEsik})`);
  }
  if (macId) {
    // Test maçı yarıda kaldıysa asılı bırakma
    await sorgu(`update duellolar set durum = 'iptal', bitis = now() where id = ${alintila(macId)} and durum = 'aktif'`).catch(() => {});
  }
  if (SIL) {
    for (const [ad, p] of [["A", A], ["B", B]]) {
      try { console.log(`· hesap silme ${ad}:`, await tokenVeSil(p, apikey)); }
      catch (e) { console.log(`· hesap silme ${ad} başarısız:`, e.message); }
    }
  }
  await tarayici.close();
  process.exit();
}
