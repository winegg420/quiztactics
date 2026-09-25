// ============================================================
// GECİKME TESTİ — iki gerçek oyunculu Klasik maçta yüksek gecikmede senkron ölçümü (25 Eyl 2026)
//
// İki taze misafir hesabı açar; birinin (A) bütün Supabase trafiği (REST + Realtime WebSocket)
// her yönde --gecikme ms yavaşlatılır (Türkiye–Filipinler ≈ 250–350 ms tek yön). Aynı makinede iki sayfa
// AYNI saati kullanır, bu yüzden iki tarafın ekranındaki olaylar doğrudan karşılaştırılabilir.
// Her sayfa ekran olaylarını (3-2-1 rakamı, soru metni, sayaç rakamı) ms damgasıyla kaydeder.
//
// Kullanım:
//   node araclar/gecikme-testi.mjs [--adres=https://quiztactics.vercel.app] [--gecikme=300]
//        [--hazir-fark=2000]  (B, A'dan kaç ms sonra "Hazırım"a basar)  [--soru=5] [--sessiz=2,4] [--sil]
//   --sil : test hesaplarını (hesabimi_sil) sonunda siler.
// Çıktı: geri sayımın her sayfada hangi rakamdan başladığı, her sorunun iki ekranda görünme farkı,
// sayaç 0 anı farkı. Ham kayıt: .tmp/gecikme-testi.json
// ============================================================
import { chromium, devices } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const ADRES = String(ARG.adres || "http://127.0.0.1:5173").replace(/\/$/, "");
const GECIKME = Number(ARG.gecikme ?? 300);
const HAZIR_FARK = Number(ARG["hazir-fark"] ?? 2000);
const SORU_SAYISI = Number(ARG.soru ?? 5);
const SIL = Boolean(ARG.sil);
// --gorunum=390x664 : iPhone Safari (araç çubuklarıyla) görünür alanı; her soruda soru metninin gerçekten görünür olup olmadığı ölçülür
const [GEN, YUK] = String(ARG.gorunum ?? "390x800").split("x").map(Number);
const GORUNUM_OLC = Boolean(ARG.gorunum);
const SESSIZ = String(ARG.sessiz ?? "2,4").split(",").filter(Boolean).map(Number);   // bu numaralı sorularda iki taraf da cevap vermez (süre dolar)
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const KAYIT_KODU = () => {
  window.__kayit = [];
  const son = {};
  const yaz = (k, v) => { if (son[k] !== v) { son[k] = v; window.__kayit.push({ t: Date.now(), k, v }); } };
  for (const t of ["warn", "error"]) {
    const asil = console[t].bind(console);
    console[t] = (...a) => { try { window.__kayit.push({ t: Date.now(), k: "konsol", v: a.map((x) => (x && x.message) || String(x)).join(" ").slice(0, 110) }); } catch { /* yok */ } asil(...a); };
  }
  const tik = () => {
    const s = document.querySelector(".m1-sayim-sayi");
    yaz("sayim", s ? s.textContent.trim() : "");
    const q = document.querySelector(".qt-soru-metin");
    yaz("soru", q ? q.textContent.trim().slice(0, 40) : "");
    const c = document.querySelector(".qt-soru .qt-sayac-sayi");
    yaz("sayac", c ? c.textContent.trim() : "");
    requestAnimationFrame(tik);
  };
  requestAnimationFrame(tik);
};

async function tanitimiKapat(sayfa) {
  for (let i = 0; i < 8; i++) {
    const atla = sayfa.getByRole("button", { name: /^Atla$/ });
    if (await atla.count()) { await atla.first().click(); await sayfa.waitForTimeout(500); return; }
    const basla = sayfa.getByRole("button", { name: /Hadi başlayalım/i });
    if (await basla.count()) { await basla.first().click(); await sayfa.waitForTimeout(500); return; }
    await sayfa.waitForTimeout(300);
  }
}

async function modalTemizle(sayfa, ad = "Gecikme" + Math.floor(Math.random() * 900 + 100)) {
  // Kurulum sihirbazı + tanıtım perdeleri: hiçbiri kalmayana dek adım adım ilerle.
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
  }
}

async function misafirGiris(sayfa, ad) {
  await sayfa.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  await sayfa.getByRole("button", { name: /Misafir olarak dene/i }).click({ timeout: 15000 });
  await sayfa.locator(".as-buyuk-dugme--oyna").first().waitFor({ state: "attached", timeout: 30000 });
  await sayfa.waitForTimeout(1500);
  await modalTemizle(sayfa, ad);
}

async function baglam(tarayici) {
  const b = await tarayici.newContext({ ...devices["Pixel 7"], viewport: { width: GEN, height: YUK } });
  await b.addInitScript(KAYIT_KODU);
  if (ARG.uzun) {
    // --uzun : en kötü durum — depodaki en uzun soru (154 harf) + en uzun şıklar (51 harf) her soruda; gerçek çizim yolundan geçer
    await b.route("**/rpc/get_match_question*", async (route) => {
      try {
        const r = await route.fetch(); const j = await r.json();
        if (Array.isArray(j) && j[0]) {
          j[0].soru = "1912 Stockholm Olimpiyatları'nda pentatlon ve dekatlonu kazanıp daha önce yarı profesyonel beyzbol oynadığı için madalyaları elinden alınan sporcu kimdir?";
          j[0].secenekler = ["Sahnenin oyuncularla gerçek zamanlı canlandırmasını", "Olayların uzmanlarca yorumlanmasını", "Konunun anlatıcı sesle özetlenmesini", "Tüm dillerin karakterlerini tek standartta toplamak"];
        }
        await route.fulfill({ response: r, json: j });
      } catch { await route.continue().catch(() => {}); }
    });
  }
  return b;
}

/** Hesap kurulumu bittikten SONRA uygulanır (sihirbaz yavaşlamasın). */
async function gecikmeUygula(b, gecikmeMs) {
  if (gecikmeMs > 0) {
    // REST: istek + yanıt yolu; Realtime WebSocket: her iki yönde mesaj gecikmesi.
    await b.route(/supabase\.co\/(rest|auth|functions)\//, async (route) => {
      try {
        await bekle(gecikmeMs);
        const r = await route.fetch();
        await bekle(gecikmeMs);
        await route.fulfill({ response: r });
      } catch { await route.abort().catch(() => {}); }
    });
    await b.routeWebSocket(/supabase\.co\/realtime/, (ws) => {
      const sunucu = ws.connectToServer();
      ws.onMessage((m) => setTimeout(() => sunucu.send(m), gecikmeMs));
      sunucu.onMessage((m) => setTimeout(() => ws.send(m), gecikmeMs));
      ws.onClose((k, r) => setTimeout(() => sunucu.close({ code: k, reason: r }), gecikmeMs));
    });
  }
}

async function klasigeGir(sayfa) {
  await sayfa.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  await sayfa.waitForTimeout(2000);
  for (let i = 0; i < 8; i++) {
    await modalTemizle(sayfa);
    try { await sayfa.locator(".as-buyuk-dugme--oyna, .mobile-core-mode.klasik").first().tap({ timeout: 3000 }); break; }
    catch (e) { if (i === 7) throw e; }
  }
  await sayfa.waitForTimeout(900);
  await sayfa.getByRole("button", { name: /^Klasik/ }).last().tap({ timeout: 8000 });
}

const OLCUMLER = [];
async function metinOlc(sayfa, ad, q) {
  await sayfa.waitForFunction(() => !document.querySelector(".m1-sayim"), null, { timeout: 9000 }).catch(() => {});   // 3-2-1 perdesi kalkınca ölç
  await sayfa.waitForTimeout(900);
  const o = await sayfa.evaluate(() => {
    const m = document.querySelector(".qt-soru-metin");
    if (!m) return null;
    const r = m.getBoundingClientRect(); const cs = getComputedStyle(m);
    const k = document.querySelector(".qt-soru-kart")?.getBoundingClientRect();
    const ust = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 12));
    return { h: Math.round(r.height), w: Math.round(r.width), scrollH: m.scrollHeight, clientH: m.clientHeight, font: cs.fontSize, renk: cs.color, opak: cs.opacity, gor: cs.visibility,
      kartH: k ? Math.round(k.height) : null, ustte: ust ? (ust === m || m.contains(ust) || ust.contains(m) ? "metin" : ust.className.toString().slice(0, 40)) : "yok", vh: innerHeight };
  });
  if (ARG.dokum && OLCUMLER.length < 1) {
    console.log("  blok dökümü:", JSON.stringify(await sayfa.evaluate(() => {
      const mac = document.querySelector(".m1-mac"); const soru = mac?.querySelector(":scope > .m1-soru");
      const d = (e) => { const r = e.getBoundingClientRect(); return `${(e.className || e.tagName).toString().split(" ")[0]}:${Math.round(r.top)}-${Math.round(r.bottom)}(${Math.round(r.height)})`; };
      return { mac: mac ? d(mac) : null, macCocuk: [...(mac?.children ?? [])].map(d), soruCocuk: [...(soru?.children ?? [])].map(d), kartCocuk: [...(soru?.querySelector(".qt-soru")?.children ?? [])].map(d) };
    })));
  }
  OLCUMLER.push({ ad, q: q.length, ...o });
  if (OLCUMLER.length <= 2) await sayfa.screenshot({ path: `.tmp/soru-${GEN}x${YUK}-${ad}${OLCUMLER.length}.png` }).catch(() => {});
  if (o && (o.h < 30 || o.scrollH > o.clientH + 2 || o.ustte !== "metin")) {
    console.log(`  ! ${ad} soru (${q.length} harf) metin kutusu ${o.h}px, scroll ${o.scrollH}>${o.clientH}, üstte: ${o.ustte}`);
    await sayfa.screenshot({ path: `.tmp/soru-${GEN}x${YUK}-${OLCUMLER.length}.png` }).catch(() => {});
  }
}

async function cevapla(sayfa, sik = 0) {
  const l = sayfa.locator(".qt-sik:not([disabled])");
  if (await l.count() > sik) await l.nth(sik).tap({ timeout: 2000 }).catch(() => {});
}

async function tokenVeSil(sayfa) {
  return sayfa.evaluate(async () => {
    const anahtar = Object.keys(localStorage).find((k) => k.includes("auth-token"));
    if (!anahtar) return "oturum yok";
    const t = JSON.parse(localStorage.getItem(anahtar));
    const url = (Object.keys(localStorage).find((k) => k.startsWith("sb-")) || "").replace(/^sb-/, "").replace(/-auth-token$/, "");
    const r = await fetch(`https://${url}.supabase.co/rest/v1/rpc/hesabimi_sil`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t.access_token}`, apikey: window.__anahtar || "" },
      body: "{}",
    });
    return r.status + " " + (await r.text()).slice(0, 120);
  });
}

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const ctxA = await baglam(tarayici);   // gecikmeli (giriş sonrası)
const ctxB = await baglam(tarayici);   // normal
const A = await ctxA.newPage();
const B = await ctxB.newPage();
for (const [ad, p] of [["A", A], ["B", B]]) {
  p.on("console", (m) => { if (m.type() === "error") console.log(`[${ad}] konsol:`, m.text().slice(0, 140)); });
  p.on("pageerror", (e) => console.log(`[${ad}] pageerror:`, String(e).slice(0, 140)));
}
// Supabase anahtarı: istekten yakala (hesap silme için)
let anahtar = "";
B.on("request", (r) => { const k = r.headers()["apikey"]; if (k) anahtar = k; });

try {
  console.log(`Gecikme testi — ${ADRES} · A tek yön +${GECIKME} ms · hazır farkı ${HAZIR_FARK} ms`);
  await Promise.all([misafirGiris(A, "GecikmeA" + Math.floor(Math.random() * 900 + 100)),
                     misafirGiris(B, "GecikmeB" + Math.floor(Math.random() * 900 + 100))]);
  console.log("· iki misafir hesabı hazır");
  await gecikmeUygula(ctxA, GECIKME);
  await Promise.all([klasigeGir(A), klasigeGir(B)]);
  await Promise.all([A, B].map((p) => p.waitForURL(/\/mac\/[0-9a-f-]{36}/, { timeout: 45000 })));
  const idA = A.url().match(/mac\/([0-9a-f-]{36})/)[1];
  const idB = B.url().match(/mac\/([0-9a-f-]{36})/)[1];
  console.log(`· maç A=${idA.slice(0, 8)} B=${idB.slice(0, 8)} ${idA === idB ? "(aynı maç — gerçek eşleşme)" : "(FARKLI maç — bot eşleşti, test geçersiz)"}`);
  if (idA !== idB) throw new Error("iki hesap aynı maça düşmedi");

  await A.waitForTimeout(1500);
  await A.getByRole("button", { name: /Hazırım/ }).first().tap({ timeout: 8000 });
  const tA = Date.now();
  await bekle(HAZIR_FARK);
  await B.getByRole("button", { name: /Hazırım/ }).first().tap({ timeout: 8000 });
  const tB = Date.now();
  console.log(`· Hazırım: A t0, B +${tB - tA} ms`);

  // Soru döngüsü: A hep hemen cevaplar; B bazı sorularda geç cevaplar, 3. soruda hiç cevaplamaz (süre dolsun).
  const gorulen = new Set();
  const bas = Date.now();
  while (Date.now() - bas < 150000 && [...gorulen].filter((x) => x.startsWith("A")).length < SORU_SAYISI) {
    for (const [ad, p] of [["A", A], ["B", B]]) {
      const q = await p.locator(".qt-soru-metin").first().textContent({ timeout: 300 }).catch(() => null);
      if (!q) continue;
      const anahtarSoru = ad + q.slice(0, 40);
      if (gorulen.has(anahtarSoru)) continue;
      gorulen.add(anahtarSoru);
      if (GORUNUM_OLC) await metinOlc(p, ad, q);
      const no = [...gorulen].filter((x) => x.startsWith(ad)).length;
      const gec = ad === "B" ? (no % 2 === 0 ? 6000 : 1500) : 1000;
      if (SESSIZ.includes(no)) continue;
      setTimeout(() => cevapla(p, no % 4).catch(() => {}), gec);
    }
    await bekle(250);
    if ([A, B].some((p) => /\/mac\//.test(p.url()) === false)) break;
  }
  await bekle(3000);

  if (GORUNUM_OLC) {
    console.log(`
--- soru metni ölçümü ${GEN}x${YUK} (innerHeight ${OLCUMLER[0]?.vh}) ---`);
    for (const o of OLCUMLER) console.log(JSON.stringify(o));
  }
  const kA = await A.evaluate(() => window.__kayit);
  const kB = await B.evaluate(() => window.__kayit);
  fs.mkdirSync(".tmp", { recursive: true });
  fs.writeFileSync(path.join(".tmp", "gecikme-testi.json"), JSON.stringify({ tA, tB, kA, kB }, null, 1));

  const zaman = (k) => k.map((o) => ({ ...o, s: ((o.t - tA) / 1000).toFixed(2) }));
  for (const [ad, k] of [["A (gecikmeli)", kA], ["B (normal)", kB]]) {
    console.log(`\n--- ${ad}: geri sayım rakamları (Hazırım A'dan itibaren s) ---`);
    console.log(zaman(k).filter((o) => o.k === "sayim").map((o) => `${o.s}s:${o.v || "·"}`).join("  ") || "(hiç görünmedi)");
    console.log(`--- ${ad}: soru ekrana gelişi ---`);
    console.log(zaman(k).filter((o) => o.k === "soru" && o.v).map((o) => `${o.s}s`).join("  "));
  }
  // Soru başına iki ekran farkı
  const qA = kA.filter((o) => o.k === "soru" && o.v), qB = kB.filter((o) => o.k === "soru" && o.v);
  console.log("\n--- soru başına ekrana geliş farkı (B − A, ms; + = A önce) ---");
  for (let i = 0; i < Math.min(qA.length, qB.length); i++) console.log(`soru ${i + 1}: ${qB[i].t - qA[i].t} ms`);
  // Soru ekrana geldiğinde sayaç kaç gösteriyor (15 = tam süre; 14/13 = sayaç geç başladı)
  for (const [ad, k] of [["A", kA], ["B", kB]]) {
    const ilk = k.map((o, i) => (o.k === "soru" && o.v ? (k.slice(i, i + 6).find((x) => x.k === "sayac" && x.v)?.v ?? "?") : null)).filter((x) => x !== null);
    console.log(`--- ${ad}: soru geldiğinde ilk sayaç rakamı: ${ilk.join(" ")}`);
  }
  // Sayaç sıfır anı
  const sA = kA.filter((o) => o.k === "sayac" && o.v === "0"), sB = kB.filter((o) => o.k === "sayac" && o.v === "0");
  console.log("--- sayaç '0' anı (B − A, ms) ---");
  for (let i = 0; i < Math.min(sA.length, sB.length); i++) console.log(`#${i + 1}: ${sB[i].t - sA[i].t} ms`);
} catch (e) {
  console.log("HATA:", e?.message ?? e);
  await A.screenshot({ path: ".tmp/gecikme-A.png" }).catch(() => {}); await B.screenshot({ path: ".tmp/gecikme-B.png" }).catch(() => {});
  process.exitCode = 1;
} finally {
  if (SIL) {
    for (const [ad, p] of [["A", A], ["B", B]]) {
      try {
        await p.evaluate((k) => { window.__anahtar = k; }, anahtar);
        console.log(`· hesap silme ${ad}:`, await tokenVeSil(p));
      } catch (e) { console.log(`· hesap silme ${ad} başarısız:`, e.message); }
    }
  }
  await tarayici.close();
}
