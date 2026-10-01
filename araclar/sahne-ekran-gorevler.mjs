// Görevler (/gorevler) TAM EKRAN SAHNE ölçümü + ekran görüntüleri. Sunucuya YAZMAZ: gorevlerim / gorev_al / haftalik_sandik_al /
// sezon_ozetim cevapları tarayıcıda taklit edilir (araclar/gorevler-ekran.mjs ile aynı yöntem).
// Ölçer: yatay taşma · body kayması (document.scrollingElement.scrollHeight ≤ innerHeight) · <44 px dokunma hedefi ·
// alt düğme görünürlüğü · konsol hatası · azaltılmış harekette sonsuz animasyon · alma akışı (başarı/hata/toplu).
// Kullanım: npm run dev -- --port 5199 (başka kabukta) · node araclar/sahne-ekran-gorevler.mjs [--adres=http://localhost:5199]
// Oturum: .arayuz-denetim-oturum.json (TR) ve .arayuz-denetim-oturum-en.json (EN) — yalnız auth-token'ı alınır, origin'e uyarlanır.
// Çıktı: docs/sahne-ekranlari/gorevler-<durum>-<genişlik>-<dil>.png
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ADRES = (process.argv.find((a) => a.startsWith("--adres=")) ?? "--adres=http://localhost:5199").slice(8);
const CIKTI = path.resolve("docs/sahne-ekranlari");
fs.mkdirSync(CIKTI, { recursive: true });
const adresOrigin = new URL(ADRES).origin;

// ---------- Taklit veri ----------
const G = (id, ad_tr, ad_en, zorluk, sayac, hedef, ilerleme, { alindi = false, parametre = {}, coin = 15, sp = 10 } = {}) => ({
  quest_id: id, ad_tr, ad_en, zorluk, sayac, hedef, parametre, ilerleme: Math.min(ilerleme, hedef), alindi,
  alinabilir: ilerleme >= hedef && !alindi, odul: { coin, sp },
});
const H = (id, ad_tr, ad_en, sayac, hedef, ilerleme, o = {}) => G(id, ad_tr, ad_en, null, sayac, hedef, ilerleme, { coin: 50, sp: 25, ...o });
const veriYap = ({ gun, hft, sandikAlindi = false, gunSn = 22320, hftSn = 367200 }) => {
  const tamam = hft.filter((g) => g.alindi).length;
  const alinabilir = gun.filter((g) => g.alinabilir).length + hft.filter((g) => g.alinabilir).length + (tamam >= 3 && !sandikAlindi ? 1 : 0);
  return {
    gunluk: { yenilenme_sn: gunSn, gorevler: gun },
    haftalik: {
      yenilenme_sn: hftSn, gorevler: hft,
      sandik: { tamam, hedef: 3, alindi: sandikAlindi, alinabilir: tamam >= 3 && !sandikAlindi, sp: 75, joker: { tur: "soru_degistir", adet: 1 } },
    },
    alinabilir_sayi: alinabilir,
  };
};
const HAZIR = {
  // devam eden (alınabilir yok, ödül yok)
  normal: () => veriYap({
    gun: [G("gun_mac_oyna_3", "3 maç oyna", "Play 3 matches", "kolay", "mac_oyna", 3, 1),
      G("gun_mac_kazan_2", "2 maç kazan", "Win 2 matches", "orta", "mac_kazan", 2, 0),
      G("gun_dogru_50", "50 soruyu doğru cevapla", "Answer 50 questions correctly", "zor", "dogru_soru", 50, 12)],
    hft: [H("hft_mac_oyna_15", "Bu hafta 15 maç oyna", "Play 15 matches this week", "mac_oyna", 15, 4),
      H("hft_duello_galibiyet_3", "Düello'da 3 galibiyet", "Win 3 Duel matches", "duello_galibiyet", 3, 0),
      H("hft_dogru_100", "100 soruyu doğru cevapla", "Answer 100 questions correctly", "dogru_soru", 100, 20)],
  }),
  // alınabilir ödül var (1 günlük) + devam eden + alınmış; kategori görevi; günlük süre < 1 saat (kehribar)
  alinabilir: () => veriYap({
    gun: [G("gun_mac_oyna_3", "3 maç oyna", "Play 3 matches", "kolay", "mac_oyna", 3, 3),
      G("gun_mac_kazan_2", "2 maç kazan", "Win 2 matches", "orta", "mac_kazan", 2, 1),
      G("gun_kategori_dogru_10", "Bugünün kategorisinde 10 soruyu doğru cevapla", "Answer 10 questions correctly in today's category", "zor", "kategori_dogru", 10, 4, { parametre: { kategori: "spor" } })],
    hft: [H("hft_mac_oyna_15", "Bu hafta 15 maç oyna", "Play 15 matches this week", "mac_oyna", 15, 11),
      H("hft_duello_galibiyet_3", "Düello'da 3 galibiyet", "Win 3 Duel matches", "duello_galibiyet", 3, 3, { alindi: true }),
      H("hft_farkli_kategori_5", "5 farklı kategoride doğru cevap", "Answer correctly in 5 different categories", "farkli_kategori_dogru", 5, 2)],
    gunSn: 2700,
  }),
  // toplu alma: 2 günlük + 1 haftalık alınabilir; haftalıkların son alınanı sandığı açılabilir yapar
  coklu: () => veriYap({
    gun: [G("gun_mac_oyna_3", "3 maç oyna", "Play 3 matches", "kolay", "mac_oyna", 3, 3),
      G("gun_mac_kazan_2", "2 maç kazan", "Win 2 matches", "orta", "mac_kazan", 2, 2),
      G("gun_dogru_50", "50 soruyu doğru cevapla", "Answer 50 questions correctly", "zor", "dogru_soru", 50, 12)],
    hft: [H("hft_mac_oyna_15", "Bu hafta 15 maç oyna", "Play 15 matches this week", "mac_oyna", 15, 15),
      H("hft_duello_galibiyet_3", "Düello'da 3 galibiyet", "Win 3 Duel matches", "duello_galibiyet", 3, 3, { alindi: true }),
      H("hft_dogru_100", "100 soruyu doğru cevapla", "Answer 100 questions correctly", "dogru_soru", 100, 100, { alindi: true })],
  }),
  hepsiAlindi: () => veriYap({
    gun: [G("gun_mac_oyna_3", "3 maç oyna", "Play 3 matches", "kolay", "mac_oyna", 3, 3, { alindi: true }),
      G("gun_mac_kazan_2", "2 maç kazan", "Win 2 matches", "orta", "mac_kazan", 2, 2, { alindi: true }),
      G("gun_dogru_50", "50 soruyu doğru cevapla", "Answer 50 questions correctly", "zor", "dogru_soru", 50, 50, { alindi: true })],
    hft: [H("hft_mac_oyna_15", "Bu hafta 15 maç oyna", "Play 15 matches this week", "mac_oyna", 15, 15, { alindi: true }),
      H("hft_duello_galibiyet_3", "Düello'da 3 galibiyet", "Win 3 Duel matches", "duello_galibiyet", 3, 3, { alindi: true }),
      H("hft_dogru_100", "100 soruyu doğru cevapla", "Answer 100 questions correctly", "dogru_soru", 100, 100, { alindi: true })],
    sandikAlindi: true, gunSn: 3300, hftSn: 40000,
  }),
};

// ---------- Taklit ----------
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
async function taklitKur(sayfa, durum) {
  durum.cagrilar = [];
  const cevap = (r, govde, status = 200) => r.fulfill({ status, contentType: "application/json", headers: CORS, body: JSON.stringify(govde) });
  const rpc = (ad, fn) => sayfa.route(new RegExp(`/rest/v1/rpc/${ad}(\\?|$)`), async (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: CORS });
    let arg = {};
    try { arg = JSON.parse(r.request().postData() ?? "{}"); } catch { /* boş */ }
    return fn(r, arg);
  });
  await rpc("gorevlerim", (r) => (durum.hata ? cevap(r, { message: "Sunucuda geçici bir sorun var" }, 500) : cevap(r, durum.d)));
  await rpc("gorev_al", (r, a) => {
    durum.cagrilar.push(`gorev_al:${a.p_quest_id}`);
    const liste = a.p_kapsam === "gunluk" ? durum.d.gunluk.gorevler : durum.d.haftalik.gorevler;
    const g = liste.find((x) => x.quest_id === a.p_quest_id);
    if (durum.alHata || durum.alHataNo === durum.cagrilar.filter((c) => c.startsWith("gorev_al")).length) return cevap(r, { message: "Sunucuda geçici bir sorun var" }, 500);
    if (!g || !g.alinabilir) return cevap(r, { message: "Görev bulunamadı" }, 400);
    g.alindi = true; g.alinabilir = false;
    Object.assign(durum.d, veriYap({ gun: durum.d.gunluk.gorevler, hft: durum.d.haftalik.gorevler, sandikAlindi: durum.d.haftalik.sandik.alindi, gunSn: durum.d.gunluk.yenilenme_sn }));
    return cevap(r, { alindi: true, zaten: false, kapsam: a.p_kapsam, quest_id: g.quest_id, coin: g.odul.coin, sp: durum.sezon ? g.odul.sp : null });
  });
  await rpc("haftalik_sandik_al", (r) => {
    durum.cagrilar.push("sandik");
    const s = durum.d.haftalik.sandik;
    if (!s.alinabilir) return cevap(r, { message: "Haftalık görevlerin hepsini almadan sandık açılmaz" }, 400);
    Object.assign(durum.d, veriYap({ gun: durum.d.gunluk.gorevler, hft: durum.d.haftalik.gorevler, sandikAlindi: true, gunSn: durum.d.gunluk.yenilenme_sn }));
    return cevap(r, { alindi: true, zaten: false, sp: durum.sezon ? 75 : null, joker: { tur: "soru_degistir", adet: 1 } });
  });
  await rpc("sezon_ozetim", (r) => cevap(r, durum.sezon
    ? { gorunur: true, sezon: 1, seviye: 3, seviye_sayisi: 28, sp: 340, onceki_esik: 300, sonraki_esik: 400, bp: false, alinabilir: 0 }
    : { gorunur: false }));
}

// ---------- Oturum ----------
const oturumOku = (dosya) => {
  const j = JSON.parse(fs.readFileSync(path.resolve(dosya), "utf8"));
  const k = j.origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token")));
  return k.localStorage;
};
const LS = { tr: oturumOku(".arayuz-denetim-oturum.json"), en: oturumOku(".arayuz-denetim-oturum-en.json") };
const lsDil = (dil) => [...LS[dil].filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }];

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
let hata = 0;
const rapor = [];
const ok = (ad, k, ek = "") => { rapor.push({ ad, gecti: Boolean(k), ek }); if (k) console.log("  ✓", ad); else { hata++; console.log("  ✗", ad, ek); } };
const bekle = (s, ms) => s.waitForTimeout(ms);

async function sayfaAc(w, h, dil, durum, { azalt = false } = {}) {
  const baglam = await tarayici.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
    reducedMotion: azalt ? "reduce" : "no-preference",
    storageState: { cookies: [], origins: [{ origin: adresOrigin, localStorage: lsDil(dil) }] },
  });
  const sayfa = await baglam.newPage();
  const konsol = [];
  sayfa.on("console", (m) => { if (m.type() === "error") konsol.push(m.text()); });
  sayfa.on("pageerror", (e) => konsol.push("pageerror: " + String(e).slice(0, 200)));
  await taklitKur(sayfa, durum);
  await sayfa.route(new RegExp("/rest/v1/rpc/profilim(\\?|$)"), async (r) => {
    try {
      const yanit = await r.fetch();
      const j = await yanit.json();
      if (j && typeof j === "object") j.dil = dil;
      await r.fulfill({ response: yanit, body: JSON.stringify(j), contentType: "application/json" });
    } catch { await r.continue(); }
  });
  await sayfa.goto(`${ADRES}/gorevler`, { waitUntil: "domcontentloaded" });
  await sayfa.waitForSelector(".gv-kart", { timeout: 40000 });
  await bekle(sayfa, 1300);   // sıralı giriş + çubuk dolumu bitsin
  return { baglam, sayfa, konsol };
}
const konsolTemiz = (k) => k.filter((x) => !/favicon|manifest|realtime|websocket|ERR_FAILED|Failed to load resource|net::|statement timeout|57014|status of [45]\d\d|\[Bildim\] görevler alınamadı/i.test(x));

async function olc(sayfa, konsol, etiket, { altBeklenir }) {
  const o = await sayfa.evaluate(() => {
    const kok = document.querySelector(".qt-sahne-kok");
    const govde = document.querySelector(".qt-sahne-govde");
    const alt = document.querySelector(".qt-sahne-alt");
    const kucuk = [...kok.querySelectorAll("button, a")].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && cs.visibility !== "hidden" && (r.height < 43.5 || r.width < 43.5); })
      .map((e) => `${(e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 20)}|${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
    const tasanOge = [...kok.querySelectorAll("*")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && !e.closest(".qt-sahne-govde") ? r.right > innerWidth + 0.5 : (r.width > 0 && r.right > innerWidth + 0.5 && !e.closest(".qt-konfeti")); }).length;
    const dugme = document.querySelector(".gv-toplu");
    const db = dugme?.getBoundingClientRect();
    return {
      bodyKay: document.scrollingElement.scrollHeight - innerHeight,
      yatayTasma: document.documentElement.scrollWidth - innerWidth,
      kucuk, tasanOge,
      govdeKayar: govde.scrollHeight > govde.clientHeight, govdeYatay: govde.scrollWidth - govde.clientWidth,
      altYukseklik: alt ? Math.round(alt.getBoundingClientRect().height) : 0,
      dugmeGorunur: db ? db.top >= 0 && db.bottom <= innerHeight : null,
      acilMi: Boolean(document.querySelector(".gv-yenilenme--acil")),
      ustBar: Boolean(document.querySelector(".app .shell > header, .qt-ustcubuk")) && getComputedStyle(document.querySelector(".qt-ustcubuk") ?? document.body).display !== "none",
      kesik: [...document.querySelectorAll(".gv-ad, .gv-ozet-ana, .gv-h2")].filter((e) => e.scrollWidth > e.clientWidth + 1).length,
      renkliKalinti: document.querySelectorAll(".qt-oyk--ton-dogru, .qt-oyk--ton-uyari, .qt-oyk--ton-mor, .qt-oyk--ton-coin, .gv-zor .qt-oyk-etiket").length,
    };
  });
  ok(`${etiket}: body kaymıyor`, o.bodyKay <= 0, `fark=${o.bodyKay}`);
  ok(`${etiket}: yatay taşma yok`, o.yatayTasma <= 0 && o.tasanOge === 0 && o.govdeYatay <= 0, `sayfa=${o.yatayTasma} öğe=${o.tasanOge} govde=${o.govdeYatay}`);
  ok(`${etiket}: dokunma hedefleri ≥ 44 px`, o.kucuk.length === 0, o.kucuk.slice(0, 4).join(" ; "));
  ok(`${etiket}: metin kesilmesi yok`, o.kesik === 0, `kesik=${o.kesik}`);
  ok(`${etiket}: renkli ton sınıfı kalıntısı yok`, o.renkliKalinti === 0);
  if (altBeklenir) ok(`${etiket}: alt düğme ekranda görünür`, o.dugmeGorunur === true, JSON.stringify({ g: o.dugmeGorunur, alt: o.altYukseklik }));
  else ok(`${etiket}: alt alan çöker (düğme yok)`, o.dugmeGorunur === null && o.altYukseklik === 0, `alt=${o.altYukseklik}`);
  const t = konsolTemiz(konsol);
  ok(`${etiket}: konsol hatası yok`, t.length === 0, t.slice(0, 3).join(" | "));
  return o;
}

// ================= 1) Durumlar × boyut × dil =================
const DURUMLAR = [
  ["normal", HAZIR.normal, false],
  ["alinabilir", HAZIR.alinabilir, true],
  ["hepsi-alindi", HAZIR.hepsiAlindi, false],
  ["coklu", HAZIR.coklu, true],
];
const BOYUTLAR = [[390, 844], [360, 740], [390, 664]];
for (const dil of ["tr", "en"]) {
  for (const [ad, fab, altBeklenir] of DURUMLAR) {
    for (const [w, h] of BOYUTLAR) {
      if (dil === "en" && !(ad === "alinabilir" || ad === "hepsi-alindi" || h !== 664) && ad !== "normal") continue;
      console.log(`\n== ${ad} ${w}×${h} ${dil.toUpperCase()}`);
      const durum = { d: fab(), sezon: true };
      const { baglam, sayfa, konsol } = await sayfaAc(w, h, dil, durum);
      const etiket = `${ad} ${w}×${h} ${dil}`;
      const tag = `${ad}-${w}x${h}-${dil}`;
      await sayfa.screenshot({ path: path.join(CIKTI, `gorevler-${tag}.png`) });
      await olc(sayfa, konsol, etiket, { altBeklenir });
      // listenin sonu (haftalık + sandık)
      await sayfa.evaluate(() => { const g = document.querySelector(".qt-sahne-govde"); g.scrollTop = g.scrollHeight; });
      await bekle(sayfa, 400);
      await sayfa.screenshot({ path: path.join(CIKTI, `gorevler-${ad}-${w}x${h}-${dil}-son.png`) });
      if (ad === "alinabilir" && w === 390 && h === 844 && dil === "tr") {
        const m = await sayfa.evaluate(() => document.body.innerText);
        ok("özet: kehribar yenilenme (süre < 1 saat)", await sayfa.locator(".gv-yenilenme--acil").count() === 1);
        ok("TR metin: Günlük / Haftalık, ... / Ödülü al (1)", /Günlük/.test(m) && /Haftalık, \d+ gün/.test(m) && /Ödülü al \(1\)/.test(m), m.slice(0, 200).replace(/\n/g, " | "));
        ok("Kolay/Orta/Zor yazı etiketi yok", !/\b(Kolay|Orta|Zor)\b/.test(m));
        ok("açıklama notu (Görev SP'leri…) yok", !/sezon yoluna işler/.test(m));
        ok("zorluk noktaları: 3 satırda role=img aria-label", await sayfa.locator(".gv-zor[role=img]").count() === 3);
      }
      if (ad === "hepsi-alindi" && dil === "tr" && w === 390 && h === 844) {
        ok("hepsi alınmış: 'Bugünlük tamam' görünür", /Bugünlük tamam/.test(await sayfa.evaluate(() => document.body.innerText)));
      }
      if (dil === "en") {
        const m = await sayfa.evaluate(() => document.body.innerText);
        ok(`${etiket}: Türkçe kalıntı yok`, !/Görev|görev|Günlük|Haftalık|Kolay|Orta\b|Zor\b|Sandığı|Bugün|yenilenir|Ödül/.test(m), (m.match(/.{0,15}(Görev|görev|Günlük|Haftalık|Kolay|Orta\b|Zor\b|Sandığı|Bugün|yenilenir|Ödül).{0,15}/) ?? [""])[0]);
      }
      await baglam.close();
    }
  }
}

// ================= 2) Azaltılmış hareket =================
console.log("\n== Azaltılmış hareket");
for (const [ad, fab] of [["alinabilir", HAZIR.alinabilir], ["coklu", HAZIR.coklu]]) {
  const { baglam, sayfa, konsol } = await sayfaAc(390, 844, "tr", { d: fab(), sezon: true }, { azalt: true });
  const say = await sayfa.evaluate(() => {
    const a = document.getAnimations();
    const sonsuz = a.filter((x) => { try { return x.effect.getComputedTiming().iterations === Infinity; } catch { return false; } });
    return { toplam: a.length, sonsuz: sonsuz.length, ad: sonsuz.map((x) => x.animationName || x.constructor.name) };
  });
  ok(`azaltılmış hareket (${ad}): sonsuz animasyon 0`, say.sonsuz === 0, JSON.stringify(say));
  await sayfa.screenshot({ path: path.join(CIKTI, `gorevler-azaltilmis-${ad}-390x844-tr.png`) });
  // azaltılmış hareketle alma: uçan çip yerinde-soluk
  await sayfa.getByRole("button", { name: /ödülünü al/ }).first().tap();
  await bekle(sayfa, 450);
  const u = await sayfa.evaluate(() => { const e = document.querySelector(".gv-ucan"); return e ? getComputedStyle(e).animationName : null; });
  ok(`azaltılmış hareket (${ad}): uçan çip gv-uc-y (yerinde solar)`, u === "gv-uc-y", String(u));
  await baglam.close();
}
{
  // normal harekette sonsuz animasyon sayısı (bilgi): en çok 1 nabız
  const { baglam, sayfa } = await sayfaAc(390, 844, "tr", { d: HAZIR.coklu(), sezon: true });
  const say = await sayfa.evaluate(() => document.getAnimations().filter((x) => { try { return x.effect.getComputedTiming().iterations === Infinity; } catch { return false; } }).length);
  ok("normal hareket: sonsuz animasyon ≤ 1 (tek nabız)", say <= 1, `sayı=${say}`);
  await baglam.close();
}

// ================= 3) Alma akışı =================
const ALDUGME = /ödülünü al|Claim reward:/;
const TOPLU = /Ödülü al \(\d+\)|Claim reward \(\d+\)/;
console.log("\n== Alma: başarı (tek satır)");
{
  const durum = { d: HAZIR.alinabilir(), sezon: true };
  const { baglam, sayfa, konsol } = await sayfaAc(390, 844, "tr", durum);
  await sayfa.getByRole("button", { name: ALDUGME }).first().tap();
  await bekle(sayfa, 450);
  await sayfa.screenshot({ path: path.join(CIKTI, "gorevler-alma-basari-390x844-tr.png") });
  const cip = await sayfa.locator(".gv-ucan").first().innerText().catch(() => "");
  ok("başarı: uçan çip +15 ve +10 SP", /\+15/.test(cip) && /\+10\s*SP/.test(cip), cip.replace(/\n/g, " "));
  await bekle(sayfa, 500);
  ok("başarı: satır alınmış (tik)", (await sayfa.locator(".gv-kart--alindi").count()) === 2);
  ok("başarı: alt düğme kayboldu (alınabilir kalmadı)", (await sayfa.locator(".gv-toplu").count()) === 0);
  const t = konsolTemiz(konsol);
  ok("başarı: konsol hatası yok", t.length === 0, t.join(" | "));
  await baglam.close();
}
console.log("\n== Alma: hata (500)");
{
  const durum = { d: HAZIR.alinabilir(), sezon: true, alHata: true };
  const { baglam, sayfa } = await sayfaAc(390, 844, "tr", durum);
  await sayfa.getByRole("button", { name: ALDUGME }).first().tap();
  await bekle(sayfa, 700);
  await sayfa.screenshot({ path: path.join(CIKTI, "gorevler-alma-hata-390x844-tr.png") });
  ok("hata: kutlama YOK (uçan çip yok)", (await sayfa.locator(".gv-ucan").count()) === 0);
  const m = await sayfa.locator(".gv-mesaj").innerText().catch(() => "");
  ok("hata: mesaj görünür (role=alert)", m.length > 5 && await sayfa.locator(".gv-mesaj").isVisible(), m);
  ok("hata: satır alınmamış kaldı", (await sayfa.locator(".gv-kart--alinabilir").count()) === 1);
  await baglam.close();
}
console.log("\n== Ödülü al (n): başarı — sıralı (2 günlük + 1 haftalık + sandık)");
{
  const durum = { d: HAZIR.coklu(), sezon: true };
  const { baglam, sayfa, konsol } = await sayfaAc(390, 844, "tr", durum);
  const dugme = sayfa.getByRole("button", { name: TOPLU });
  const ad0 = await dugme.innerText();
  ok("toplu: düğme 'Ödülü al (3)' (2 günlük + 1 haftalık; sandık henüz kilitli)", /\(3\)/.test(ad0), ad0);
  await dugme.tap();
  await bekle(sayfa, 500);
  const cip1 = await sayfa.locator(".gv-ucan").count();
  await sayfa.screenshot({ path: path.join(CIKTI, "gorevler-toplu-ilk-390x844-tr.png") });
  ok("toplu: ilk alınca kutlama (uçan çip) görünür", cip1 >= 1);
  await bekle(sayfa, 4500);
  await sayfa.screenshot({ path: path.join(CIKTI, "gorevler-toplu-sandik-390x844-tr.png") });
  await bekle(sayfa, 2500);
  ok("toplu: RPC sırası günlük → haftalık → sandık", JSON.stringify(durum.cagrilar) === JSON.stringify(["gorev_al:gun_mac_oyna_3", "gorev_al:gun_mac_kazan_2", "gorev_al:hft_mac_oyna_15", "sandik"]), JSON.stringify(durum.cagrilar));
  ok("toplu: sonunda sandık alınmış, alt alan çöktü", (await sayfa.locator(".gv-sandik--alindi").count()) === 1 && (await sayfa.locator(".gv-toplu").count()) === 0);
  const t = konsolTemiz(konsol);
  ok("toplu: konsol hatası yok", t.length === 0, t.join(" | "));
  await baglam.close();
}
console.log("\n== Ödülü al (n): ikinci alma HATA verir → durur");
{
  const durum = { d: HAZIR.coklu(), sezon: true, alHataNo: 2 };
  const { baglam, sayfa } = await sayfaAc(390, 844, "tr", durum);
  await sayfa.getByRole("button", { name: TOPLU }).tap();
  await bekle(sayfa, 3500);
  await sayfa.screenshot({ path: path.join(CIKTI, "gorevler-toplu-hata-390x844-tr.png") });
  ok("toplu hata: 2. çağrıdan sonra durdu (3. gorev_al ve sandık çağrılmadı)", JSON.stringify(durum.cagrilar) === JSON.stringify(["gorev_al:gun_mac_oyna_3", "gorev_al:gun_mac_kazan_2"]), JSON.stringify(durum.cagrilar));
  ok("toplu hata: hata mesajı görünür", await sayfa.locator(".gv-mesaj").isVisible());
  ok("toplu hata: alt düğme hâlâ görünür (kalanları yeniden dene)", (await sayfa.locator(".gv-toplu").count()) === 1 && /\(2\)/.test(await sayfa.locator(".gv-toplu").innerText()));
  const ucan = await sayfa.locator(".gv-ucan").count();
  ok("toplu hata: başarısız satır için kutlama yok (yalnız 1. başarıdan kalan olabilir)", ucan <= 1, `ucan=${ucan}`);
  await baglam.close();
}
console.log("\n== Sandık düğmesi (tek) başarı");
{
  const durum = { d: veriYap({
    gun: HAZIR.hepsiAlindi().gunluk.gorevler,
    hft: [H("hft_mac_oyna_15", "Bu hafta 15 maç oyna", "Play 15 matches this week", "mac_oyna", 15, 15, { alindi: true }),
      H("hft_duello_galibiyet_3", "Düello'da 3 galibiyet", "Win 3 Duel matches", "duello_galibiyet", 3, 3, { alindi: true }),
      H("hft_dogru_100", "100 soruyu doğru cevapla", "Answer 100 questions correctly", "dogru_soru", 100, 100, { alindi: true })],
  }), sezon: true };
  const { baglam, sayfa } = await sayfaAc(390, 844, "tr", durum);
  await sayfa.screenshot({ path: path.join(CIKTI, "gorevler-sandik-acik-390x844-tr.png") });
  await sayfa.getByRole("button", { name: /Sandığı aç/ }).tap();
  await bekle(sayfa, 500);
  const sm = await sayfa.locator(".gv-sandik .gv-ucan").first().innerText().catch(() => "");
  await sayfa.screenshot({ path: path.join(CIKTI, "gorevler-sandik-acilinca-390x844-tr.png") });
  ok("sandık: çip +75 SP ve Soru Değiştir ×1 (konfeti anı)", /\+75\s*SP/.test(sm) && /Soru Değiştir ×1/.test(sm), sm.replace(/\n/g, " "));
  await baglam.close();
}

await tarayici.close();
fs.writeFileSync(path.join(CIKTI, "gorevler-olcum.json"), JSON.stringify(rapor, null, 2));
console.log(`\n${hata ? "✗ " + hata + " ölçüm başarısız" : "✓ tüm ölçümler geçti"} — çıktı: docs/sahne-ekranlari/`);
process.exit(hata ? 1 : 0);
