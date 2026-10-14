// ============================================================
// SENKRON TESTİ — maç başı 3-2-1 ve soru sayaçları yavaş telefonda doğru mu? (14 Eki 2026)
//
// Her mod için (Klasik, Saf Bilgi, Düello, Grup, Ortak Hazine) bota karşı TEK maç açar, ilk 3 soruyu izler ve
// maçı bırakır. Yavaş telefon taklidi (varsayılan): CPU 6x yavaş · 400 ms ağ gecikmesi · maç sayfası 5 sn geç açılır
// (maç adresine geçildikten sonraki ilk 5 sn'nin bütün Supabase istekleri 5. saniyeye kadar bekletilir) · istemci
// saati modlar arasında sırayla +2 / −2 sn kaydırılır (Date sınıfı sayfada değiştirilir).
//
// Denetimler (mod × denetim, GEÇTİ / KALDI):
//   (a) ilk görünen sayım rakamı 3
//   (b) sayım her rakamda ~1 sn ("3" en çok gösterim payı + 1,3 sn), geri sıçrama yok, bitince yeniden görünmez
//   (c) ilk sorunun sayacı tam süreden başlıyor (sayım katmanı kalktıktan sonra ilk görünen değer)
//   (d) sonraki 2 soruda sayım yok, sayaç tam süreden başlıyor
//   (e) botun ilk cevabı sayım bitmeden yok (sayım bitiş anında tek salt okuma + cevap zamanı)
//   (f) sayfa geç açıldığında (--gec ≥ 5) (a)–(c) geçiyor
//
// Kullanım:
//   npm run dev -- --port 5188        (başka kabukta; canlı Supabase'e bağlanır)
//   node araclar/senkron-testi.mjs [--adres=http://localhost:5188] [--mod=klasik,saf,duello,grup,hazine]
//        [--cpu=6] [--ag=400] [--gec=5] [--saat=2000] [--hizli] (taklitsiz) [--etiket=x] [--hesap-sakla]
//   --hizli : yavaşlatma/kaydırma/gecikme yok (karşılaştırma için)
//
// CLAUDE.md: canlıda simülasyon/yük testi yok — her mod TEK maç, döngüyle sunucu yoklanmaz (durum ekrandan ve
// sayfanın kendi yanıtlarından okunur). Veritabanına yazılan yalnız test hesabı satırları: Düello kilidi için
// bitmiş maç (yoksa) ve test maçlarının 'iptal' kapanışı. Test hesabı (SenkronA###) işin sonunda SİLİNİR.
// Çıktı: .tmp/senkron-testi-<etiket>.json · çıkış kodu 0 = hepsi geçti.
// Her senkron değişikliğinden sonra koşulur (PROGRESS.md › Senkron testi).
// ============================================================
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "http://localhost:5188").replace(/\/$/, "");
const HIZLI = Boolean(ARG.hizli);
const CPU = HIZLI ? 1 : Number(ARG.cpu ?? 6);
const AG_MS = HIZLI ? 0 : Number(ARG.ag ?? 400);
const GEC_SN = HIZLI ? 0 : Number(ARG.gec ?? 5);
const SAAT_MS = HIZLI ? 0 : Number(ARG.saat ?? 2000);
const MODLAR = String(ARG.mod || "klasik,saf,duello,grup,hazine").split(",").map((x) => x.trim()).filter(Boolean);
const ETIKET = String(ARG.etiket || new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-"));
const HESAP_SAKLA = Boolean(ARG["hesap-sakla"]);
const CIKTI = path.resolve(".tmp");
fs.mkdirSync(CIKTI, { recursive: true });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- Turnuva TAKLİDİ (canlıda istenince başlatılamaz)
// Gerçek istemci kodu sahte saatle sürülür: lib/sunucuSaati.js (ortak saat + 3-2-1 çekirdeği sayimKalani — useGeriSayim'in
// kendisi) ve lib/zaman.js › kalanSure (QuestionCard sayacı). Sunucu (1092 turnuva_baslangic_sayim): ilk soru = geçiş anı +
// 3 sn + 2 sn pay; sonraki sorular = an + soru_gosterim_payi (2 sn). İstemci: durum değişikliğini Realtime ile ağ gecikmesi
// kadar geç öğrenir, ilk soruyu çeker (bu yanıt ilk saat örneğidir), 100 ms'de bir çizer.
async function turnuvaTaklit() {
  const { pathToFileURL } = await import("node:url");
  const SS = await import(pathToFileURL(path.resolve("oyun/lib/sunucuSaati.js")).href);
  const Z = await import(pathToFileURL(path.resolve("oyun/lib/zaman.js")).href);
  const L = AG_MS || 400;                     // tek yön gecikme
  const PAY = 2000;
  const senaryolar = [
    { ad: "saat +2 sn", kayma: 2000 },
    { ad: "saat −2 sn", kayma: -2000 },
    { ad: "ilk örnek yavaş (gidiş-dönüş 2,3 sn)", kayma: 2000, ilkEk: 1500 },
    { ad: "5 sn geç açılış", kayma: 0, gec: 5000 },
  ];
  const asilNow = Date.now;
  const sonuc = [];
  for (const sn of senaryolar) {
    SS._saatOrnekleriniSifirla();
    const T = 1_800_000_000_000;               // sunucu: lobi → aktif geçişi
    const S = T + 3000 + PAY;                  // ilk soru başlangıcı
    let r = T + L + (sn.gec ?? 0);             // istemci geçişi öğrenir (gerçek saat)
    const ornekler = [];                       // [alındığı gerçek an, gönderim, alım, sunucu saati]
    const gonder = r;
    const ilkRtt = 2 * L + (sn.ilkEk ?? 0);
    ornekler.push([gonder + ilkRtt, gonder, gonder + ilkRtt, gonder + L + (sn.ilkEk ?? 0) / 2]);
    ornekler.push([gonder + ilkRtt + 1500, gonder + ilkRtt + 1500 - 2 * L, gonder + ilkRtt + 1500, gonder + ilkRtt + 1500 - L]);
    const durum = { kilit: null };
    const iz = [];
    let son = undefined, bitti = false, sayimBitisR = null;
    for (; r < S + 4000; r += 100) {
      for (const o of ornekler.filter((x) => x[0] <= r && !x.eklendi)) { o.eklendi = true; SS.saatOrnegiEkle(o[1] + sn.kayma, o[2] + sn.kayma, o[3]); }
      let goster = null;
      if (!bitti && SS.saatFarkiMs() != null) {
        const k = SS.sayimKalani(durum, S, r, r + sn.kayma, null);
        if (k > 0.05) goster = String(Math.ceil(Math.min(k, 3)));
        else { bitti = true; sayimBitisR = r; }
      } else if (!bitti && r >= S + 3000) { bitti = true; sayimBitisR = r; }
      if (goster !== son) { iz.push({ t: r, sayim: goster }); son = goster; }
    }
    // ilk sorunun sayacı: sayım katmanı kalktığı an QuestionCard'ın gösterdiği değer (kalanSure, ortak fark)
    Date.now = () => (sayimBitisR ?? S) + sn.kayma;
    const s1 = Math.ceil(Z.kalanSure(new Date(S).toISOString(), SS.saatFarkiMs() ?? 0, 15, 15));
    // 2. soru: sunucu S2 = an + pay kurar; istemci Realtime + soru çekme ile 3L sonra görür
    const S2 = S + 20000;
    Date.now = () => S2 - PAY + 3 * L + sn.kayma;
    const s2 = Math.ceil(Z.kalanSure(new Date(S2).toISOString(), SS.saatFarkiMs() ?? 0, 15, 15));
    Date.now = asilNow;
    const rakamlar = [];
    for (let i = 0; i < iz.length; i++) if (iz[i].sayim) rakamlar.push({ r: iz[i].sayim, ms: (iz[i + 1]?.t ?? r) - iz[i].t });
    sonuc.push({ ...sn, rakamlar, s1, s2, sayimBitisFarkMs: sayimBitisR != null ? sayimBitisR - S : null });
  }
  const normal = sonuc.filter((x) => !x.gec);
  const gec = sonuc.find((x) => x.gec);
  const a = normal.every((x) => x.rakamlar[0]?.r === "3");
  const b = normal.every((x) => x.rakamlar.every((y, i) => i === 0 || Number(y.r) === Number(x.rakamlar[i - 1].r) - 1)
    && x.rakamlar.filter((y) => y.r !== "3").every((y) => y.ms >= 900 && y.ms <= 1100)   // 100 ms tik çözünürlüğü
    && (x.rakamlar.find((y) => y.r === "3")?.ms ?? 0) <= (PAY / 1000 + 1.35) * 1000);
  const c = normal.every((x) => x.s1 === 15);
  const d = sonuc.every((x) => x.s2 === 15);
  return {
    mod: "turnuva", kayma: null, taklit: true,
    deger: {
      a, b, c, d, e: null, f: null,
      olcum: {
        senaryolar: sonuc.map((x) => `${x.ad}: ${x.rakamlar.map((y) => `${y.r}:${y.ms}ms`).join(" ") || "sayım yok"} · S1 ${x.s1} · S2 ${x.s2} · bitiş ${x.sayimBitisFarkMs} ms`),
        not: `geç açılış (${gec ? gec.ad : "-"}): sabit saatli etkinlik — sayım beklenmez, soru kalan süreyle görünür (S1 ${gec?.s1}). (e) bot: bot_oyna gecikmesi soru_baslangic'tan sayılır (sunucu), taklitte ölçülmez.`,
      },
    },
  };
}
if (ARG.taklit) {
  const r = await turnuvaTaklit();
  console.log("Turnuva taklidi:", JSON.stringify(r.deger.olcum, null, 1));
  const g = (v) => (v === null || v === undefined ? "—" : v ? "GEÇTİ" : "KALDI");
  console.log("Turnuva*     | " + ["a", "b", "c", "d", "e", "f"].map((k) => g(r.deger[k]).padEnd(9)).join(" | "));
  process.exit(["a", "b", "c", "d"].every((k) => r.deger[k]) ? 0 : 1);
}

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
await db.sorgu("set application_name = 'senkron-testi'");
const sorgu = async (sql) => { const r = await db.sorgu(sql); return r.rows ?? r; };

// Bu makinenin saati ile veritabanı saati arasındaki fark (gidiş-dönüş orta noktası; en kısa 3 örnekten).
let DB_FARK = 0;
{
  let en = null;
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    const [r] = await sorgu("select (extract(epoch from clock_timestamp()) * 1000)::float8 as ms");
    const t1 = Date.now();
    const o = { rtt: t1 - t0, fark: Number(r.ms) - (t0 + t1) / 2 };
    if (!en || o.rtt < en.rtt) en = o;
  }
  DB_FARK = en.fark;
}
const sunucuMs = (iso) => new Date(iso).getTime() - DB_FARK;   // sunucu zaman damgası → bu makinenin saati

const ayar = async (anahtar, vars) => {
  const [r] = await sorgu(`select deger::text d from oyun_ayarlari where anahtar = ${alintila(anahtar)}`).catch(() => []);
  const n = Number(String(r?.d ?? "").replace(/"/g, ""));
  return Number.isFinite(n) ? n : vars;
};
const SURE = {
  klasik: 15, saf: 15, grup: 15,
  duello: await ayar("duello4_cevap_sn", 15),
  hazine: await ayar("kasa_soru_sn", 15),
};
const PAY_SN = (await ayar("mac_geri_sayim_payi_ms", 2000)) / 1000;
const MAC_YOLU = { klasik: /\/mac\/[0-9a-f-]{36}/, saf: /\/mac\/[0-9a-f-]{36}/, duello: /\/duello\/[0-9a-f-]{36}/,
  grup: /\/grup-mac\/[0-9a-f-]{36}/, hazine: /\/kasa\/[0-9a-f-]{36}/ };
const MOD_ADI = { klasik: "Klasik", saf: "Saf Bilgi", duello: "Düello", grup: "Grup", hazine: "Ortak Hazine", turnuva: "Turnuva*" };

// ---------------------------------------------------------------- sayfa içi izleyici
// Sayım rakamı (.m1-sayim-sayi | .ks-giris-sayi), soru sayacı (.qt-sayac-sayi) ve soru metni 40 ms'de bir okunur;
// yalnız DEĞİŞİMLER gerçek saatle (performance.timeOrigin + now — Date kaydırmasından etkilenmez) kaydedilir.
const SAYFA_IZ = ({ kayma }) => {
  if (kayma) {
    const AsilDate = Date;
    const asilNow = AsilDate.now.bind(AsilDate);
    class KaymisDate extends AsilDate {
      constructor(...a) { if (a.length === 0) super(asilNow() + kayma); else super(...a); }
      static now() { return asilNow() + kayma; }
    }
    window.Date = KaymisDate;
  }
  try { sessionStorage.setItem("bd_ses_kapali", "1"); } catch { /* yok */ }
  const iz = [];
  window.__senkronIz = iz;
  let son = "";
  const gercek = () => performance.timeOrigin + performance.now();
  const oku = () => {
    const sayimEl = document.querySelector(".m1-sayim-sayi, .ks-giris-sayi");
    const sayim = sayimEl ? sayimEl.textContent.trim() : null;
    const sayac = document.querySelector(".qt-sayac-sayi")?.textContent?.trim() ?? null;
    const soru = document.querySelector(".qt-soru-metin")?.textContent?.trim()?.slice(0, 80) ?? null;
    const arena = document.querySelector(".d4-arena");
    const faz = arena ? ([...arena.classList].find((c) => /^d4-arena--(notr|cevap|kart|sonuc|son)$/.test(c)) ?? "").replace("d4-arena--", "") : null;
    const k = `${sayim}|${sayac}|${soru}|${faz}`;
    if (k !== son) { son = k; iz.push({ t: gercek(), sayim, sayac, soru, faz, yol: location.pathname }); }
  };
  setInterval(oku, 40);
  // DOM değişimi anında (çizim işlendiği an) da okunur: yavaş işlemcide zamanlayıcı gecikse de rakam geçiş anı doğru kaydedilir.
  const izle = () => new MutationObserver(oku).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  if (document.documentElement) izle(); else document.addEventListener("DOMContentLoaded", izle);
};

// ---------------------------------------------------------------- tarayıcı + test hesabı
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
  deviceScaleFactor: 2, serviceWorkers: "block", locale: "tr-TR" });
// Tanıtım pencereleri ölçümü örtmesin (duello-v4-canli-bot-testi ile aynı anahtar).
await baglam.addInitScript(() => { try { localStorage.setItem("bildim_tanitim", "1"); } catch { /* yok */ } });
let BEN = null;
let jeton = null;

async function tanitimlariGec(s) {
  for (let i = 0; i < 4; i++) {
    const b = s.getByRole("button", { name: /^(Geç|Atla|Anladım|Tamam|Kapat|İleri|Başla)$/ });
    if (!(await b.count())) return;
    await b.last().click({ timeout: 1500 }).catch(() => {});
    await s.waitForTimeout(500);
  }
}

async function hesapAc() {
  const s = await baglam.newPage();
  await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  const dugme = s.getByRole("button", { name: /Misafir olarak dene/i });
  await dugme.waitFor({ timeout: 20000 });
  await dugme.click();
  await s.waitForFunction(() => !/Giriş yapılıyor/.test(document.body.innerText) && !document.body.innerText.includes("Misafir olarak dene"), null, { timeout: 60000 }).catch(() => {});
  await s.waitForTimeout(2500);
  await tanitimlariGec(s);
  const alan = s.locator(".bd-modal-katman input").first();
  await alan.waitFor({ timeout: 10000 }).catch(() => {});
  if (await alan.count()) {
    await alan.fill("SenkronA" + Math.floor(Math.random() * 900 + 100));
    await s.getByRole("button", { name: /^(Devam|Continue)$/ }).first().click();
    await s.waitForTimeout(1800);
  }
  const ikon = s.locator(".bd-modal-katman .g-avatar-sec:not(.qt-av-kilitli)").first();
  if (await ikon.count()) { await ikon.click(); await s.waitForTimeout(400); }
  const kullan = s.getByRole("button", { name: /Bu avatarı kullan/i });
  const avatarsiz = s.getByRole("button", { name: /Avatarsız devam et/i });
  if (await kullan.count() && await kullan.first().isEnabled()) { await kullan.first().click(); await s.waitForTimeout(1800); }
  else if (await avatarsiz.count()) { await avatarsiz.first().click(); await s.waitForTimeout(1800); }
  const sehir = s.locator(".bd-modal-katman [role=combobox]").first();
  if (await sehir.count()) {
    await sehir.click();
    await s.locator(".bd-modal-katman [role=option]").first().waitFor({ timeout: 8000 }).catch(() => {});
    const secenek = s.locator(".bd-modal-katman [role=option]").first();
    if (await secenek.count()) await secenek.click();
    await s.getByRole("button", { name: /Oyuna başla/i }).first().click().catch(() => {});
    await s.waitForTimeout(2500);
  }
  await tanitimlariGec(s);
  const kayit = await s.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (/^sb-.+-auth-token$/.test(k)) return { ad: k, deger: localStorage.getItem(k) };
    }
    return null;
  });
  if (!kayit) throw new Error("misafir oturumu açılmadı");
  jeton = { ref: kayit.ad.replace(/^sb-/, "").replace(/-auth-token$/, ""), access: JSON.parse(kayit.deger).access_token };
  BEN = JSON.parse(Buffer.from(jeton.access.split(".")[1], "base64url").toString()).sub;
  await s.close();
}

function anonAnahtar() {
  for (const d of [".env.local", ".env"]) {
    try { const m = fs.readFileSync(d, "utf8").match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m); if (m) return m[1].trim(); } catch { /* yok */ }
  }
  return null;
}

async function hesabiSil() {
  if (!jeton) return "hesap yok";
  try {
    const apikey = anonAnahtar();
    // Belirteç süresi dolmuş olabilir: en güncel belirteç bağlamdan okunur.
    const durum = await baglam.storageState().catch(() => null);
    const kayit = (durum?.origins ?? []).flatMap((o) => o.localStorage ?? []).find((x) => /^sb-.+-auth-token$/.test(x.name));
    const access = kayit ? JSON.parse(kayit.value).access_token : jeton.access;
    const r = await fetch(`https://${jeton.ref}.supabase.co/rest/v1/rpc/hesabimi_sil`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}`, apikey }, body: "{}" });
    return r.ok ? "silindi" : `SİLİNEMEDİ (${r.status} ${(await r.text()).slice(0, 100)})`;
  } catch (e) { return "SİLİNEMEDİ: " + String(e?.message ?? e).slice(0, 100); }
}

// ---------------------------------------------------------------- mod başlatıcıları
async function aramaBekle(s, mod, tetik) {
  const yol = MAC_YOLU[mod];
  for (let i = 0; i < 150 && !yol.test(s.url()); i++) {
    if (i % 8 === 0) await tetik().catch(() => {});
    await s.waitForTimeout(600);
  }
  if (!yol.test(s.url())) throw new Error(`${MOD_ADI[mod]}: maça girilemedi (${s.url()})`);
  return s.url().match(/([0-9a-f-]{36})/)[1];
}

const BASLAT = {
  async klasik(s, jokersiz = false) {
    await s.goto(ADRES + "/modlar", { waitUntil: "domcontentloaded" });
    await s.waitForTimeout(2500);
    await tanitimlariGec(s);
    const kart = s.locator(jokersiz ? ".qt-mod--saf" : ".qt-mod--klasik").first();
    return aramaBekle(s, jokersiz ? "saf" : "klasik", async () => {
      if (await s.locator(".bd-rakip-ara, [class*=arama-sahne], [class*=rakip-ara]").count()) return;
      await kart.click({ timeout: 3000 });
      await s.waitForTimeout(800);
      const ara = s.getByRole("button", { name: /Rakip ara|Maç ara|Oyna$/ });
      if (await ara.count()) await ara.last().click({ timeout: 2000 }).catch(() => {});
    });
  },
  async saf(s) { return BASLAT.klasik(s, true); },
  async duello(s) {
    // Düello yeni hesapta 5 bitmiş Klasik/Saf Bilgi maçıyla açılır (oyuncu-testi ile aynı hazırlık; hesap sonda silinir).
    const [k] = await sorgu(`select count(*)::int n from matches where ${alintila(BEN)} in (oyuncu1, oyuncu2) and durum = 'bitti' and basladi`);
    const eksik = 5 - Number(k?.n ?? 0);
    if (eksik > 0) {
      const [b] = await sorgu(`select id from profiles where is_bot and bot_turu = 'gizli' limit 1`);
      for (let i = 0; i < eksik && b; i++) {
        await sorgu(`insert into matches (oyuncu1, oyuncu2, durum, kazanan, bitis, basladi, dereceli)
          values (${alintila(BEN)}, ${alintila(b.id)}, 'bitti', ${alintila(b.id)}, now(), true, false)`);
      }
    }
    await s.goto(ADRES + "/duello", { waitUntil: "domcontentloaded" });
    await s.waitForTimeout(3000);
    return aramaBekle(s, "duello", async () => {
      await tanitimlariGec(s);
      const ara = s.getByRole("button", { name: /Rakip ara/i });
      if (await ara.count()) await ara.first().click({ timeout: 2000 });
    });
  },
  async grup(s) {
    await s.goto(ADRES + "/meydan", { waitUntil: "domcontentloaded" });
    await s.waitForTimeout(3000);
    await tanitimlariGec(s);
    return aramaBekle(s, "grup", async () => {
      const panel = s.locator(".a-meydan-panel-bas").filter({ hasText: /Grup Maçı Kur/ }).first();
      await panel.scrollIntoViewIfNeeded().catch(() => {});
      if ((await panel.getAttribute("aria-expanded").catch(() => "false")) !== "true") await panel.click({ timeout: 4000 });
      await s.waitForTimeout(600);
      const r = s.getByRole("button", { name: /Rastgele oyna/ }).first();
      await r.scrollIntoViewIfNeeded().catch(() => {});
      await r.click({ timeout: 4000 });
    });
  },
  async hazine(s) {
    await s.goto(ADRES + "/kasa", { waitUntil: "domcontentloaded" });
    await s.waitForTimeout(3000);
    return aramaBekle(s, "hazine", async () => {
      await tanitimlariGec(s);
      const ara = s.getByRole("button", { name: /Rakip ara/i });
      if (await ara.count()) await ara.first().click({ timeout: 2000 });
    });
  },
};

// ---------------------------------------------------------------- sunucudaki ilk soru anı (sayfanın kendi yanıtlarından)
// Sayım bitişi = oyuncunun soruyu görmesi gereken an: Klasik nabız `baslangic` · Grup `soru_baslangic` (aktif_soru 0) ·
// Düello `gosterim_bas − pay` (nötr, soru no 1) · Hazine `gosterim_bas` (tur 1 cevap fazı).
function ilkSoruAni(mod, url, govde) {
  try {
    const v = Array.isArray(govde) ? govde[0] : govde;
    if (!v || typeof v !== "object") return null;
    if ((mod === "klasik" || mod === "saf") && /rpc\/mac_nabiz/.test(url) && v.basladi && v.baslangic && v.durum === "aktif") return v.baslangic;
    if (mod === "grup" && /group_matches/.test(url) && v.basladi && Number(v.aktif_soru) === 0 && v.soru_baslangic) return v.soru_baslangic;
    if (mod === "duello" && /rpc\/duello_durum/.test(url) && v.faz === "notr" && Number(v.v4?.soru_no) === 1 && v.sureler?.gosterim_bas)
      return new Date(new Date(v.sureler.gosterim_bas).getTime() - Number(v.sureler.gosterim_payi_ms ?? 0)).toISOString();
    if (mod === "hazine" && /rpc\/kasa_durum/.test(url) && v.faz === "cevap" && Number(v.tur) === 1 && v.sureler?.gosterim_bas) return v.sureler.gosterim_bas;
  } catch { /* yok say */ }
  return null;
}

async function botCevapVarMi(mod, id) {
  if (mod === "klasik" || mod === "saf") {
    const [r] = await sorgu(`select count(*)::int n from match_answers where match_id = ${alintila(id)} and user_id <> ${alintila(BEN)} and soru_index = 0`);
    return Number(r.n) > 0;
  }
  if (mod === "grup") {
    const [r] = await sorgu(`select count(*)::int n from group_match_answers where group_match_id = ${alintila(id)} and user_id <> ${alintila(BEN)} and soru_index = 0`);
    return Number(r.n) > 0;
  }
  if (mod === "duello") {
    const [r] = await sorgu(`select (select count(*) from jsonb_object_keys(coalesce(cevaplar, '{}'::jsonb)) k where k <> ${alintila(BEN)})::int n,
      v4_soru_no::int no from duellolar where id = ${alintila(id)}`);
    return Number(r.no) > 1 || Number(r.n) > 0;
  }
  const [r] = await sorgu(`select count(*)::int n from kasa_cevaplari where kasa_id = ${alintila(id)} and user_id <> ${alintila(BEN)} and tur = 1`);
  return Number(r.n) > 0;
}

async function botIlkCevapAni(mod, id) {
  const tablo = { klasik: ["match_answers", "match_id", "soru_index = 0"], saf: ["match_answers", "match_id", "soru_index = 0"],
    grup: ["group_match_answers", "group_match_id", "soru_index = 0"], hazine: ["kasa_cevaplari", "kasa_id", "tur = 1"] }[mod];
  if (!tablo) return null;   // Düello: cevap anı maç satırında yalnız soru sürerken durur — sayım bitişindeki okuma yeter
  const [r] = await sorgu(`select min(created_at)::text t from ${tablo[0]} where ${tablo[1]} = ${alintila(id)} and user_id <> ${alintila(BEN)} and ${tablo[2]}`);
  return r?.t ?? null;
}

async function maciKapat(mod, id) {
  const t = { klasik: "matches", saf: "matches", duello: "duellolar", hazine: "kasa_maclari" }[mod];
  try {
    if (t) await sorgu(`update ${t} set durum = 'iptal', bitis = now() where id = ${alintila(id)} and durum = 'aktif'`);
    else await sorgu(`update group_matches set durum = 'iptal' where id = ${alintila(id)} and durum = 'aktif'`);
  } catch (e) { console.log(`  · maç kapatılamadı: ${e.message}`); }
}

// ---------------------------------------------------------------- tek mod
async function modKos(mod, kayma) {
  const s = await baglam.newPage();
  await s.addInitScript(SAYFA_IZ, { kayma });
  const cdp = await baglam.newCDPSession(s);
  if (CPU > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  if (AG_MS > 0) { await cdp.send("Network.enable"); await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: AG_MS, downloadThroughput: -1, uploadThroughput: -1 }); }

  // Geç açılış: maç adresine geçildikten sonraki ilk GEC_SN saniyenin Supabase istekleri o ana kadar bekletilir.
  let macaGecis = null;
  await s.route(/supabase\.co\/(rest|auth)\/v1\//, async (route) => {
    if (!macaGecis && MAC_YOLU[mod].test(s.url())) macaGecis = Date.now();
    const kalan = macaGecis && GEC_SN > 0 ? macaGecis + GEC_SN * 1000 - Date.now() : 0;
    if (kalan > 0) await bekle(kalan);
    await route.continue().catch(() => {});
  });

  let ilkAnIso = null;
  let ilkAnAlindi = null;   // başlangıcı taşıyan ilk yanıtın bu makineye geldiği an
  s.on("response", async (r) => {
    const u = r.url();
    if (r.status() >= 400 && /rest\/v1\/rpc\//.test(u)) {
      konsol.push(`RPC ${r.status()} ${u.split("/rpc/")[1]?.split("?")[0]}: ${(await r.text().catch(() => "")).slice(0, 140)}`);
    }
    if (ilkAnIso) return;
    if (!/rpc\/(mac_nabiz|duello_durum|kasa_durum)|group_matches/.test(u)) return;
    try { const an = ilkSoruAni(mod, u, await r.json()); if (an && !ilkAnIso) { ilkAnIso = an; ilkAnAlindi = Date.now(); } } catch { /* gövdesiz */ }
  });
  const konsol = [];
  s.on("pageerror", (e) => konsol.push(String(e).slice(0, 160)));

  const sonuc = { mod, kayma, hata: null };
  let id = null;
  try {
    id = await BASLAT[mod](s);
    sonuc.id = id;
    const t0 = Date.now();
    let eKontrol = null;
    // Soru döngüsü: Hazırım'a dokun, kart/karar fazlarını geç, her yeni soruda bir kez cevapla; 3 soru görülünce dur.
    const gorulen = [];
    while (Date.now() - t0 < 4 * 60 * 1000) {
      const hazir = s.getByRole("button", { name: /Hazırım/ });
      if (await hazir.count() && await hazir.first().isEnabled().catch(() => false)) await hazir.first().click({ timeout: 1500 }).catch(() => {});
      if (ilkAnIso && !eKontrol) {
        // (e): sayım bitiş anında (sunucu) TEK salt okuma — botun cevabı var mı?
        const hedef = sunucuMs(ilkAnIso) - 150;
        eKontrol = (async () => { await bekle(Math.max(0, hedef - Date.now())); return { okunduMs: Date.now() - sunucuMs(ilkAnIso), botVar: await botCevapVarMi(mod, id) }; })();
      }
      const soru = await s.locator(".qt-soru-metin").first().textContent({ timeout: 300 }).catch(() => null);
      const sayimVar = await s.locator(".m1-sayim-sayi, .ks-giris-sayi").count();
      if (soru && !sayimVar && !gorulen.includes(soru.trim().slice(0, 80))) {
        gorulen.push(soru.trim().slice(0, 80));
        if (gorulen.length > 3) break;
        await s.waitForTimeout(1800);
        await s.locator(".qt-sik:not([disabled]):not(.qt-sik--elendi)").first().click({ timeout: 2500 }).catch(() => {});
      }
      if (mod === "duello") {
        const kart = s.locator(".d4-kart:not(:disabled)");
        if (await kart.count()) { await kart.first().click({ timeout: 1500 }).catch(() => {}); await s.waitForTimeout(700); }
      }
      if (mod === "hazine") {
        const devam = s.getByRole("button", { name: /DEVAM/ });
        if (await devam.count() && await devam.first().isEnabled().catch(() => false)) await devam.first().click({ timeout: 1500 }).catch(() => {});
      }
      if (gorulen.length >= 3) {
        // 3. sorunun sayacı kaydedildiyse yeter.
        const iz = await s.evaluate(() => window.__senkronIz.length);
        if (iz && Date.now() - t0 > 5000) { await s.waitForTimeout(2500); break; }
      }
      await s.waitForTimeout(250);
    }
    sonuc.iz = await s.evaluate(() => window.__senkronIz);
    sonuc.ilkAnIso = ilkAnIso;
    sonuc.ilkAnAlindi = ilkAnAlindi;
    sonuc.e = eKontrol ? await eKontrol : null;
    sonuc.botIlkCevap = await botIlkCevapAni(mod, id);
    sonuc.macaGecis = macaGecis;
  } catch (e) {
    sonuc.hata = String(e?.message ?? e).split("\n")[0];
    sonuc.iz = await s.evaluate(() => window.__senkronIz).catch(() => []);
    await s.screenshot({ path: path.join(CIKTI, `senkron-${mod}-hata.png`) }).catch(() => {});
    sonuc.ekranMetni = (await s.evaluate(() => document.body.innerText).catch(() => "")).replace(/\s+/g, " ").slice(0, 400);
  } finally {
    // Tanı: 3 soruya ulaşılmadıysa maç satırı kapatılmadan önce bir kez okunur (takılma kök sebebi için).
    if (id && new Set((sonuc.iz ?? []).map((x) => x.soru).filter(Boolean)).size < 3) {
      const t = { klasik: "matches", saf: "matches", duello: "duellolar", hazine: "kasa_maclari", grup: "group_matches" }[mod];
      sonuc.tani = await sorgu(`select to_jsonb(x) - 'soru_ids' - 'kullanilan_sorular' - 'profil1' - 'profil2' j, now()::text simdi from ${t} x where id = ${alintila(id)}`).catch((e) => e.message);
    }
    if (id) await maciKapat(mod, id);
    sonuc.konsol = konsol.slice(0, 5);
    await s.close().catch(() => {});
  }
  return sonuc;
}

// ---------------------------------------------------------------- değerlendirme
function degerlendir(r) {
  const iz = (r.iz ?? []).map((x) => ({ ...x, t: x.t }));
  const ilkAn = r.ilkAnIso ? sunucuMs(r.ilkAnIso) : null;
  const tam = SURE[r.mod];
  // Sayım rakamları ve süreleri
  const rakamlar = [];
  for (let i = 0; i < iz.length; i++) {
    const s = iz[i].sayim;
    if (s && (!rakamlar.length || rakamlar.at(-1).r !== s || rakamlar.at(-1).bitti)) {
      if (rakamlar.length && !rakamlar.at(-1).bitti) rakamlar.at(-1).son = iz[i].t;
      rakamlar.push({ r: s, bas: iz[i].t });
    } else if (!s && rakamlar.length && !rakamlar.at(-1).bitti) { rakamlar.at(-1).son = iz[i].t; rakamlar.at(-1).bitti = true; }
  }
  for (const x of rakamlar) x.ms = x.son ? Math.round(x.son - x.bas) : null;
  // Sorular: her yeni soru metninde, sayım katmanı yokken ilk görünen sayaç değeri
  const sorular = [];
  for (const x of iz) {
    if (!x.soru || x.sayim) continue;
    let q = sorular.find((o) => o.soru === x.soru);
    if (!q) { q = { soru: x.soru, ilk: null, t: x.t }; sorular.push(q); }
    if (q.ilk == null && x.sayac != null) { q.ilk = Number(x.sayac); q.tIlk = x.t; }
  }
  const sayimSonrasi = (t) => rakamlar.some((x) => x.bas > t);
  const ilkGorulen = rakamlar[0]?.r ?? null;
  const geriSicrama = rakamlar.some((x, i) => i > 0 && Number(x.r) >= Number(rakamlar[i - 1].r));
  const ucRakam = rakamlar.filter((x) => x.r === "3")[0];
  const digerleri = rakamlar.filter((x) => x.r === "2" || x.r === "1");
  const b = rakamlar.length >= 3 && !geriSicrama
    && digerleri.every((x) => x.ms == null || (x.ms >= 750 && x.ms <= 1350))
    && (!ucRakam || ucRakam.ms == null || ucRakam.ms <= (PAY_SN + 1.35) * 1000);
  const q1 = sorular[0];
  const d = sorular.length >= 3 && sorular.slice(1, 3).every((q) => q.ilk === tam) && !(q1 && sayimSonrasi(q1.t + 500));
  const e = r.e ? !r.e.botVar && (r.botIlkCevap == null || !ilkAn || sunucuMs(r.botIlkCevap) >= ilkAn - 50) : null;
  const a = ilkGorulen === "3";
  const c = q1?.ilk === tam;
  // Düello kart sayacı: aynı adımda bir rakam atlanırsa (10 → 8) say (adım başı 10'a dönüş atlama değildir).
  let kartAtlama = 0;
  const kartDizi = [];
  for (let i = 1; i < iz.length; i++) {
    if (iz[i].faz !== "kart" || iz[i - 1].faz !== "kart" || iz[i].sayac == null || iz[i - 1].sayac == null) continue;
    const once = Number(iz[i - 1].sayac), simdi = Number(iz[i].sayac);
    kartDizi.push(simdi);
    if (simdi < once - 1) kartAtlama++;
  }
  return {
    a, b, c, d, e, f: GEC_SN >= 5 ? a && b && c : null,
    olcum: {
      ilkRakam: ilkGorulen,
      rakamlar: rakamlar.map((x) => `${x.r}:${x.ms ?? "?"}ms`).join(" "),
      sayimBitisFarkMs: rakamlar.length && ilkAn ? Math.round((rakamlar.at(-1).son ?? 0) - ilkAn) : null,
      // başlangıç yanıtı sorudan kaç sn önce geldi · ilk rakam kaç sn önce çizildi (fark = çizim gecikmesi)
      yanitOnceSn: r.ilkAnAlindi && ilkAn ? +((ilkAn - r.ilkAnAlindi) / 1000).toFixed(2) : null,
      ilkRakamOnceSn: rakamlar.length && ilkAn ? +((ilkAn - rakamlar[0].bas) / 1000).toFixed(2) : null,
      sayaclar: sorular.slice(0, 3).map((q) => q.ilk),
      soru1GecikmeMs: q1?.tIlk && ilkAn ? Math.round(q1.tIlk - ilkAn) : null,
      botIlkCevapSn: r.botIlkCevap && ilkAn ? +((sunucuMs(r.botIlkCevap) - ilkAn) / 1000).toFixed(2) : null,
      eOkuma: r.e,
      ...(r.mod === "duello" ? { kartAtlama, kartRakamlari: kartDizi.join(",") } : {}),
    },
  };
}

// ---------------------------------------------------------------- akış
const sonuclar = [];
let hesapDurumu = "açılmadı";
console.log(`Senkron testi — ${ADRES} · modlar: ${MODLAR.join(", ")} · ${HIZLI ? "taklitsiz" : `CPU ${CPU}x · ağ ${AG_MS} ms · geç açılış ${GEC_SN} sn · saat ±${SAAT_MS} ms`} · db saat farkı ${Math.round(DB_FARK)} ms`);
try {
  await hesapAc();
  hesapDurumu = "açık";
  console.log(`Test hesabı ${BEN}`);
  for (const [i, mod] of MODLAR.entries()) {
    const kayma = SAAT_MS ? (i % 2 === 0 ? SAAT_MS : -SAAT_MS) : 0;
    console.log(`\n▶ ${MOD_ADI[mod] ?? mod} (saat ${kayma >= 0 ? "+" : ""}${kayma} ms)`);
    if (!BASLAT[mod]) { console.log("  bilinmeyen mod"); continue; }
    const r = await modKos(mod, kayma);
    r.deger = r.hata ? null : degerlendir(r);
    sonuclar.push(r);
    if (r.hata) console.log("  HATA:", r.hata);
    else console.log("  ölçüm:", JSON.stringify(r.deger.olcum));
  }
} catch (e) {
  console.log("Beklenmeyen hata:", e?.message ?? e);
} finally {
  if (!HESAP_SAKLA && BEN) hesapDurumu = await hesabiSil();
  await tarayici.close().catch(() => {});
  await db.kapat?.().catch?.(() => {});
}

// Turnuva canlıda istenince başlatılamaz: aynı istemci koduyla taklit (* = taklit)
try {
  const t = await turnuvaTaklit();
  sonuclar.push(t);
  console.log("\n▶ Turnuva* (taklit)\n  ölçüm:", JSON.stringify(t.deger.olcum));
} catch (e) { console.log("Turnuva taklidi koşamadı:", e?.message ?? e); }

const g = (v) => (v === null || v === undefined ? "—" : v ? "GEÇTİ" : "KALDI");
console.log("\n==== SONUÇ ====");
console.log("mod          | (a) 3'ten | (b) ~1sn | (c) S1 tam | (d) S2-3 | (e) bot | (f) geç açılış");
let hepsi = true;
for (const r of sonuclar) {
  const d = r.deger;
  if (!d) { console.log(`${(MOD_ADI[r.mod] ?? r.mod).padEnd(12)} | HATA: ${r.hata}`); hepsi = false; continue; }
  const satir = ["a", "b", "c", "d", "e", "f"].map((k) => g(d[k]).padEnd(9));
  if (["a", "b", "c", "d", "e", "f"].some((k) => d[k] === false)) hepsi = false;
  console.log(`${(MOD_ADI[r.mod] ?? r.mod).padEnd(12)} | ${satir.join(" | ")}`);
}
console.log("* Turnuva taklitle (canlıda istenince başlatılamaz); (e)/(f) sabit saatli etkinlikte uygulanmaz.");
console.log(`Test hesabı: ${hesapDurumu}`);
fs.writeFileSync(path.join(CIKTI, `senkron-testi-${ETIKET}.json`), JSON.stringify({ ADRES, CPU, AG_MS, GEC_SN, SAAT_MS, DB_FARK, sonuclar }, null, 2));
console.log(`Ayrıntı: .tmp/senkron-testi-${ETIKET}.json`);
process.exit(hepsi ? 0 : 1);
