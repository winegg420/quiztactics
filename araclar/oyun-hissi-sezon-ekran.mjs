// ============================================================
// SAHNE — Battle Pass (Sezon Yolu) tam ekran sahnesinin ekran görüntüsü + ölçümü (1 Eki 2026).
// SUNUCUYA YAZMAZ: sezon_yolu_durumum / sezon_ozetim / bp_* cevapları tarayıcıda taklit edilir (page.route).
// Ödül tablosu: araclar/sahne-ekran-sezon.veri.json (canlı bp_seviye_odulleri'nin 1 Eki 2026 kopyası, 56 yuva).
//
// Ölçer (her durum × boyut × dil): sayfa gövdesi kaymıyor mu · yatay taşma · alt düğme ekranda mı · < 44 px dokunma hedefi ·
//   kesilen metin · mevcut seviye satırı ortada mı · uygulama üst çubuğu / alt menü gizli mi · lejant/açıklama kalmış mı ·
//   sabit öğede transform · konsol hatası. Ayrıca: hareketi azalt açıkken dönen animasyon sayısı, alma akışı (başarı → coin uçuşu,
//   hata → uçuş YOK + uyarı), toplu alma, Battle Pass satın alma penceresi.
//
// Kullanım:  npm run dev -- --port 5199   (başka kabukta)
//            node araclar/sahne-ekran-sezon.mjs [--adres=http://localhost:5199] [--hizli]
// Oturum: .arayuz-denetim-oturum.json (arayuz-denetim.mjs açar; git'e girmez). Çıktı: docs/sahne-ekranlari/sezon-*.png
// ============================================================
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ADRES = (process.argv.find((a) => a.startsWith("--adres=")) ?? "--adres=http://localhost:5199").slice(8);
const HIZLI = false;   // yalnız TR · 390×844 (yineleme için)
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve((process.argv.find((a) => a.startsWith("--cikti=")) ?? "--cikti=tasarim/oyun-hissi-bp-gorevler").slice(8));
fs.mkdirSync(CIKTI, { recursive: true });
const origin = new URL(ADRES).origin;
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce `node araclar/arayuz-denetim.mjs --sadece-oturum` çalıştır."); process.exit(1); }

const TABLO = JSON.parse(fs.readFileSync(path.resolve("araclar/sahne-ekran-sezon.veri.json"), "utf8"));
const ESIK = (i) => i * 100;
const TASMA_SP = 100, TASMA_AZAMI = 10;

function hesapla(d) {
  let seviye = 0;
  for (let i = 1; i <= 28; i++) if (ESIK(i) <= d.sp) seviye = i;
  d.seviye = seviye;
  d.onceki_esik = seviye ? ESIK(seviye) : 0;
  d.sonraki_esik = seviye >= 28 ? null : ESIK(seviye + 1);
  for (const o of d.oduller) o.alinabilir = !o.alindi && o.seviye <= seviye && (o.kol === "ucretsiz" || d.bp.aktif);
  const esik28 = ESIK(28);
  const kaz = d.sp < esik28 ? 0 : Math.min(TASMA_AZAMI, Math.floor((d.sp - esik28) / TASMA_SP));
  const al = d.tasmaAlinan;
  d.tasma = {
    acik: d.sp >= esik28, azami: TASMA_AZAMI, kazanilan: kaz, alinan_ucretsiz: al.ucretsiz.length, alinan_ucretli: al.ucretli.length,
    alinabilir_ucretsiz: kaz - al.ucretsiz.length, alinabilir_ucretli: d.bp.aktif ? kaz - al.ucretli.length : 0,
    sonraki_icin_sp: kaz >= TASMA_AZAMI ? null : Math.max(0, esik28 + (kaz + 1) * TASMA_SP - d.sp),
    odul: { ucretsiz: { tur: "coin", miktar: 25 }, ucretli: { tur: "coin", miktar: 40 } },
  };
  return d;
}
/** alinan: "hepsi" (ulaşılan her şey alınmış) | "ucretsiz" (ulaşılan ücretsizler alınmış) | n (ilk n seviyenin hepsi alınmış) */
function yeniDurum({ sp, bp = false, alinan = 0, bonus = { ilerleme: 1, alindi: false }, kazanildi = false }) {
  const d = {
    gorunur: true, acik: true, test: false, sahip: false,
    sezon: { id: 46, no: 1, baslangic: "2026-10-01", bitis: "2026-10-29", kalan_gun: 27 },
    sp, seviye_sayisi: 28, esikler: Array.from({ length: 28 }, (_, i) => ESIK(i + 1)),
    bp: { aktif: bp, satin_alma_at: bp ? "2026-10-02T10:00:00Z" : null, fiyat: 500, sp_carpan: 1.25 },
    elmas: 1200,
    oduller: TABLO.map((o) => ({ ...o, alindi: false, alinabilir: false })),
    bonus_gorev: { hedef: 2, sp: 20, ...bonus },
    final_unvan: { anahtar: "sezon_1_final", ad_tr: "Sezon 1 Ustası", ad_en: "Season 1 Master", kazanildi },
    bugun_mac_sp: 60, gunluk_mac_tavan: 150,
    tasmaAlinan: { ucretsiz: [], ucretli: [] },
  };
  hesapla(d);
  for (const o of d.oduller) {
    if (o.seviye > d.seviye) continue;
    if (alinan === "hepsi") o.alindi = o.kol === "ucretsiz" || bp;
    else if (alinan === "ucretsiz") o.alindi = o.kol === "ucretsiz";
    else if (typeof alinan === "number") o.alindi = o.seviye <= alinan && (o.kol === "ucretsiz" || bp);
  }
  return hesapla(d);
}

// ---------- Durumlar (ekran görüntüsü alınanlar) ----------
const DURUMLAR = {
  "normal": () => yeniDurum({ sp: 520, bp: true, alinan: "hepsi", bonus: { ilerleme: 1, alindi: false } }),            // BP aktif, alınacak yok → alt düğme YOK
  "alinabilir": () => yeniDurum({ sp: 760, bp: true, alinan: 4, bonus: { ilerleme: 2, alindi: false } }),              // BP aktif, 6 ödül + bonus hazır → "Ödülleri al (6)"
  "odul-yok": () => yeniDurum({ sp: 760, bp: true, alinan: "hepsi", bonus: { ilerleme: 2, alindi: true } }),           // her şey alınmış
  "bp-yok": () => yeniDurum({ sp: 760, bp: false, alinan: 5 }),                                                        // BP yok, 2 ücretsiz hazır → "Battle Pass al"
  "bp-yok-odul-yok": () => yeniDurum({ sp: 520, bp: false, alinan: "ucretsiz" }),
  "final": () => yeniDurum({ sp: 3050, bp: true, alinan: 26, bonus: { ilerleme: 2, alindi: true }, kazanildi: true }), // 28/28 + taşma
  "baslangic": () => yeniDurum({ sp: 20, bp: false }),                                                                 // seviye 0
};
const BOYUTLAR = HIZLI ? [[390, 844]] : [[390, 844], [360, 740], [390, 664]];
const DILLER = HIZLI ? ["tr"] : ["tr", "en"];   // "en" yalnız EN oturumu varsa (aşağıda süzülür)

// ---------- Taklit ----------
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
const temiz = (d) => { const { tasmaAlinan, ...r } = d; return r; };
async function taklitKur(sayfa, kap, { hataAd = null } = {}) {
  const cevap = (r, govde, status = 200) => r.fulfill({ status, contentType: "application/json", headers: CORS, body: JSON.stringify(govde) });
  const rpc = (ad, fn) => sayfa.route(new RegExp(`/rest/v1/rpc/${ad}(\\?|$)`), async (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: CORS });
    let arg = {};
    try { arg = JSON.parse(r.request().postData() ?? "{}"); } catch { /* boş */ }
    kap.cagri.push(ad);
    if (hataAd === ad) return cevap(r, { message: "taklit sunucu hatası", code: "XX000" }, 500);
    return fn(r, arg);
  });
  const d = () => kap.d;
  await rpc("sezon_yolu_durumum", (r) => cevap(r, temiz(d())));
  await rpc("sezon_ozetim", (r) => cevap(r, { gorunur: true, sezon: d().sezon, seviye: d().seviye, seviye_sayisi: 28, sp: d().sp,
    onceki_esik: d().onceki_esik, sonraki_esik: d().sonraki_esik, bp: d().bp, alinabilir: d().oduller.filter((o) => o.alinabilir).length }));
  await rpc("bp_odul_al", (r, a) => {
    const o = d().oduller.find((x) => x.seviye === a.p_seviye && x.kol === a.p_kol);
    if (!o || !o.alinabilir) return cevap(r, { message: "Bu ödülü zaten aldın" }, 400);
    o.alindi = true; hesapla(d());
    return cevap(r, { ok: true, odul: o });
  });
  await rpc("bp_toplu_al", (r) => {
    const v = d().oduller.filter((o) => o.alinabilir);
    v.forEach((o) => { o.alindi = true; });
    const t = [];
    for (const kol of ["ucretsiz", "ucretli"]) {
      if (kol === "ucretli" && !d().bp.aktif) continue;
      for (let n = 1; n <= d().tasma.kazanilan; n++) if (!d().tasmaAlinan[kol].includes(n)) { d().tasmaAlinan[kol].push(n); t.push({ n, kol, tur: "coin", miktar: kol === "ucretli" ? 40 : 25 }); }
    }
    hesapla(d());
    return cevap(r, { ok: true, verilen: v, tasma_verilen: t });
  });
  await rpc("bp_tasma_al", (r, a) => {
    const kol = a.p_kol;
    let n = null;
    for (let i = 1; i <= d().tasma.kazanilan; i++) if (!d().tasmaAlinan[kol].includes(i)) { n = i; break; }
    if (n == null) return cevap(r, { message: "Bu ödülü zaten aldın" }, 400);
    d().tasmaAlinan[kol].push(n); hesapla(d());
    return cevap(r, { ok: true, n, kol, odul: { tur: "coin", miktar: kol === "ucretli" ? 40 : 25 }, tasma: d().tasma });
  });
  await rpc("bp_bonus_gorev_al", (r) => { d().bonus_gorev.alindi = true; d().sp += 20; hesapla(d()); return cevap(r, { ok: true, sp: 20 }); });
  await rpc("bp_satin_al", (r) => {
    d().bp.aktif = true; d().elmas -= d().bp.fiyat;
    const verilen = d().oduller.filter((o) => o.kol === "ucretli" && o.seviye <= d().seviye);
    verilen.forEach((o) => { o.alindi = true; });
    hesapla(d());
    return cevap(r, { ok: true, elmas_bakiye: d().elmas, verilen });
  });
}

// ---------- Tarayıcı ----------
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
// Dil profildeki tercihten gelir: İngilizce ölçüm için dili EN olan ikinci hesap (.arayuz-denetim-oturum-en.json) kullanılır.
const OTURUM_EN = path.resolve(".arayuz-denetim-oturum-en.json");
const oturumOku = (dosya, zorunlu = true) => {
  const k = JSON.parse(fs.readFileSync(dosya, "utf8")).origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token")));
  if (!k && !zorunlu) return null;
  if (!k) { console.error("Oturum dosyasında giriş bilgisi yok:", dosya); process.exit(1); }
  return k.localStorage;
};
const KAYNAK = { tr: oturumOku(OTURUM), en: (fs.existsSync(OTURUM_EN) && oturumOku(OTURUM_EN, false)) || oturumOku(OTURUM) };   // EN oturumu yoksa: aynı hesap, dil "en"
if (!KAYNAK.en) console.log("· İngilizce oturum yok (.arayuz-denetim-oturum-en.json) — EN ölçümü atlanıyor");
const ls = (dil) => [
  ...KAYNAK[dil].filter((x) => x.name !== "bildim_dil" && !x.name.startsWith("bildim_sezon_perde")),
  { name: "bildim_dil", value: dil },
];

let hata = 0;
const rapor = [];
const ok = (ad, kosul, ek = "") => { rapor.push({ ad, gecti: Boolean(kosul), ek }); if (!kosul) { hata++; console.log("  ✗", ad, ek); } };

async function sayfaAc(w, h, dil, kap, { azalt = false, hataAd = null, perdeGordu = true } = {}) {
  const yerel = ls(dil);
  const baglam = await tarayici.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
    reducedMotion: azalt ? "reduce" : "no-preference",
    storageState: { cookies: [], origins: [{ origin, localStorage: yerel }] },
  });
  const sayfa = await baglam.newPage();
  const konsol = [];
  sayfa.on("console", (m) => { if (m.type() === "error") konsol.push(m.text()); });
  sayfa.on("pageerror", (e) => konsol.push(String(e)));
  if (perdeGordu) {
    // Sezonun ilk açılış perdesi ölçümü örtmesin: her kullanıcı için "gördü" yaz (anahtar kullanıcı kimliğiyle; tümünü kapsayacak şekilde getItem taklidi)
    await sayfa.addInitScript(() => {
      const asil = Storage.prototype.getItem;
      Storage.prototype.getItem = function (k) { return String(k).startsWith("bildim_sezon_perde:") ? "1" : asil.call(this, k); };
    });
  }
  await taklitKur(sayfa, kap, { hataAd });
  await sayfa.addInitScript(() => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = ".g-modal{display:none!important}"; document.head.appendChild(s); }); });
  await sayfa.goto(ADRES + "/sezon-yolu", { waitUntil: "domcontentloaded" });
  await sayfa.waitForSelector(".sy-dikey", { timeout: 20000 });
  await sayfa.waitForTimeout(azalt ? 500 : 1400);   // giriş + mevcut seviyeye kayma + parlama
  return { baglam, sayfa, konsol };
}
const sonuc = [];
const durumlar = ["alinabilir", "normal", "bp-yok", "bp-yok-odul-yok", "odul-yok", "baslangic"];
for (const [w, h] of [[390, 844], [390, 664], [360, 640], [1440, 900]]) {
  for (const dil of ["tr", "en"]) {
    for (const ad of durumlar) {
      if ((w === 1440 || dil === "en") && !["alinabilir", "bp-yok"].includes(ad)) continue;
      const kap = { d: DURUMLAR[ad](), cagri: [] };
      const { baglam, sayfa, konsol } = await sayfaAc(w, h, dil, kap);
      const o = await sayfa.evaluate(() => {
        const alt = document.querySelector(".qt-sahne-alt"); const ar = alt?.getBoundingClientRect();
        const kesik = [...document.querySelectorAll(".sy-hero2 *, .sy-sonraki-bilgi, .sy-sirada-hap-metin")].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).textOverflow === "ellipsis").map((e) => e.textContent.slice(0, 40));
        return { tasma: document.documentElement.scrollWidth > innerWidth, altIcinde: !ar || ar.bottom <= innerHeight + 1, altY: ar ? Math.round(ar.height) : 0, yolY: Math.round(document.querySelector(".qt-sahne-govde").getBoundingClientRect().height), kesik };
      });
      await sayfa.screenshot({ path: path.join(CIKTI, `sezon-${ad}-${w}x${h}-${dil}.png`) });
      sonuc.push({ ad, w, h, dil, ...o, konsol: konsol.filter((k) => !/favicon|401|403|Failed to load/i.test(k)).length });
      if (ad === "alinabilir" && w === 390 && h === 844 && dil === "tr") {
        await sayfa.locator(".sy-kutu--alinabilir").first().tap();
        await sayfa.waitForTimeout(260);
        await sayfa.screenshot({ path: path.join(CIKTI, `sezon-odul-ucus-${w}x${h}-${dil}.png`) });
        await sayfa.waitForTimeout(1500);
        await sayfa.screenshot({ path: path.join(CIKTI, `sezon-odul-alindi-${w}x${h}-${dil}.png`) });
        await sayfa.locator(".sy-hepsini").tap({ force: true });
        await sayfa.waitForTimeout(400);
        await sayfa.screenshot({ path: path.join(CIKTI, `sezon-toplu-al-${w}x${h}-${dil}.png`) });
        await sayfa.waitForTimeout(4000);
        await sayfa.screenshot({ path: path.join(CIKTI, `sezon-toplu-sonra-${w}x${h}-${dil}.png`) });
      }
      await baglam.close();
    }
  }
}
// hareketi azalt
{
  const kap = { d: DURUMLAR.alinabilir(), cagri: [] };
  const { baglam, sayfa } = await sayfaAc(390, 844, "tr", kap, { azalt: true });
  const donen = await sayfa.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && a.effect?.getTiming?.().iterations === Infinity).length);
  await sayfa.screenshot({ path: path.join(CIKTI, `sezon-alinabilir-azalt-390x844-tr.png`) });
  sonuc.push({ ad: "azalt", donenAnimasyon: donen });
  await baglam.close();
}
console.log(JSON.stringify(sonuc, null, 1));
await tarayici.close();