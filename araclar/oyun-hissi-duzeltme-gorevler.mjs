// Görevler (/gorevler) OYUN EKRANI ölçümü + ekran görüntüleri. Sunucuya YAZMAZ: gorevlerim / gorev_al / haftalik_sandik_al /
// sezon_ozetim cevapları tarayıcıda taklit edilir (araclar/gorevler-ekran.mjs ile aynı yöntem).
// Ölçer: yatay taşma · body kayması · <44 px dokunma hedefi · kart metni 2 satırı aşıyor mu · 3'lü düzen korunuyor mu · konsol hatası ·
// azaltılmış harekette sonsuz animasyon yok + flip anında · AL → flip + yıldız + RPC · sandık perdesi (gerçek ödüller, tek sefer, Topla) ·
// önbellekten anında açılış (iskelet yok).
// Kullanım: npm run dev -- --port 5180 (başka kabukta) · node araclar/sahne-ekran-gorevler.mjs [--adres=http://localhost:5212]
// Oturum: .arayuz-denetim-oturum.json (TR) ve .arayuz-denetim-oturum-en.json (EN) — yalnız auth-token'ı alınır, origin'e uyarlanır.
// Çıktı: tasarim/oyun-hissi-duzeltme/gorevler-<durum>-<genişlik>-<dil>.png
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ADRES = (process.argv.find((a) => a.startsWith("--adres=")) ?? "--adres=http://localhost:5212").slice(8);
const CIKTI = path.resolve("tasarim/oyun-hissi-duzeltme");
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
const GUN_NORMAL = () => [G("gun_mac_oyna_3", "3 maç oyna", "Play 3 matches", "kolay", "mac_oyna", 3, 1),
  G("gun_mac_kazan_2", "2 maç kazan", "Win 2 matches", "orta", "mac_kazan", 2, 0),
  G("gun_dogru_50", "50 soruyu doğru cevapla", "Answer 50 questions correctly", "zor", "dogru_soru", 50, 12)];
const HFT_NORMAL = () => [H("hft_mac_oyna_15", "Bu hafta 15 maç oyna", "Play 15 matches this week", "mac_oyna", 15, 4),
  H("hft_duello_galibiyet_3", "Düello'da 3 galibiyet", "Win 3 Duel matches", "duello_galibiyet", 3, 0),
  H("hft_farkli_kategori_5", "5 farklı kategoride doğru cevap", "Answer correctly in 5 different categories", "farkli_kategori_dogru", 5, 2)];
const HAZIR = {
  normal: () => veriYap({ gun: GUN_NORMAL(), hft: HFT_NORMAL() }),
  // 1 günlük hazır + 1 alınmış günlük + kategori görevi; haftalıkta bir alınmış, bir hazır
  hazir: () => veriYap({
    gun: [G("gun_mac_oyna_3", "3 maç oyna", "Play 3 matches", "kolay", "mac_oyna", 3, 3),
      G("gun_duello_mac_2", "2 Düello oyna", "Play 2 Duel matches", "orta", "duello_mac", 2, 2, { alindi: true }),
      G("gun_kategori_dogru_10", "Bugünün kategorisinde 10 soruyu doğru cevapla", "Answer 10 questions correctly in today's category", "zor", "kategori_dogru", 10, 4, { parametre: { kategori: "spor" } })],
    hft: [H("hft_mac_oyna_15", "Bu hafta 15 maç oyna", "Play 15 matches this week", "mac_oyna", 15, 15),
      H("hft_duello_galibiyet_3", "Düello'da 3 galibiyet", "Win 3 Duel matches", "duello_galibiyet", 3, 3, { alindi: true }),
      H("hft_farkli_kategori_5", "5 farklı kategoride doğru cevap", "Answer correctly in 5 different categories", "farkli_kategori_dogru", 5, 2)],
    gunSn: 2700,
  }),
  // 2 günlük hazır + 1 haftalık hazır; haftalıkların son alınanı sandığı açılabilir yapar
  coklu: () => veriYap({
    gun: [G("gun_mac_oyna_3", "3 maç oyna", "Play 3 matches", "kolay", "mac_oyna", 3, 3),
      G("gun_mac_kazan_2", "2 maç kazan", "Win 2 matches", "orta", "mac_kazan", 2, 2),
      G("gun_dogru_50", "50 soruyu doğru cevapla", "Answer 50 questions correctly", "zor", "dogru_soru", 50, 12)],
    hft: [H("hft_mac_oyna_15", "Bu hafta 15 maç oyna", "Play 15 matches this week", "mac_oyna", 15, 15),
      H("hft_duello_galibiyet_3", "Düello'da 3 galibiyet", "Win 3 Duel matches", "duello_galibiyet", 3, 3, { alindi: true }),
      H("hft_dogru_100", "100 soruyu doğru cevapla", "Answer 100 questions correctly", "dogru_soru", 100, 100, { alindi: true })],
  }),
  // haftalık 3'ü de alınmış, sandık hazır (açılmamış)
  sandikHazir: () => veriYap({
    gun: GUN_NORMAL(),
    hft: [H("hft_mac_oyna_15", "Bu hafta 15 maç oyna", "Play 15 matches this week", "mac_oyna", 15, 15, { alindi: true }),
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
  durum.cagrilar = durum.cagrilar ?? [];
  const cevap = (r, govde, status = 200) => r.fulfill({ status, contentType: "application/json", headers: CORS, body: JSON.stringify(govde) });
  const rpc = (ad, fn) => sayfa.route(new RegExp(`/rest/v1/rpc/${ad}(\\?|$)`), async (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: CORS });
    let arg = {};
    try { arg = JSON.parse(r.request().postData() ?? "{}"); } catch { /* boş */ }
    return fn(r, arg);
  });
  await rpc("gorevlerim", async (r) => {
    if (durum.gecikmeMs) await new Promise((x) => setTimeout(x, durum.gecikmeMs));
    return durum.hata ? cevap(r, { message: "Sunucuda geçici bir sorun var" }, 500) : cevap(r, durum.d);
  });
  await rpc("gorev_al", (r, a) => {
    durum.cagrilar.push(`gorev_al:${a.p_quest_id}`);
    const liste = a.p_kapsam === "gunluk" ? durum.d.gunluk.gorevler : durum.d.haftalik.gorevler;
    const g = liste.find((x) => x.quest_id === a.p_quest_id);
    if (durum.alHata) return cevap(r, { message: "Sunucuda geçici bir sorun var" }, 500);
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
  try {
    const j = JSON.parse(fs.readFileSync(path.resolve(dosya), "utf8"));
    const k = j.origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token")));
    return k?.localStorage ?? null;
  } catch { return null; }
};
// EN oturumu geçerli değilse (auth-token yok): aynı hesap, dil "en" (sezon ekran betiğiyle aynı yöntem). Eski görev önbelleği temizlenir.
const trLs = oturumOku(".arayuz-denetim-oturum.json");
if (!trLs) { console.error("Oturum yok: önce `node araclar/arayuz-denetim.mjs --sadece-oturum` çalıştır."); process.exit(1); }
const LS = { tr: trLs.filter((x) => !x.name.startsWith("bildim_gorevler:") && x.name !== "qt_profil_onbellek"), en: (oturumOku(".arayuz-denetim-oturum-en.json") ?? trLs).filter((x) => !x.name.startsWith("bildim_gorevler:") && x.name !== "qt_profil_onbellek") };
const lsDil = (dil) => [...LS[dil].filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }];

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
let hata = 0;
const rapor = [];
const ok = (ad, k, ek = "") => { rapor.push({ ad, gecti: Boolean(k), ek }); if (k) console.log("  ✓", ad); else { hata++; console.log("  ✗", ad, ek); } };
const bekle = (s, ms) => s.waitForTimeout(ms);
const masaustu = (w) => w >= 1000;

async function baglamAc(w, h, dil, { azalt = false } = {}) {
  return tarayici.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: masaustu(w) ? 1 : 2, hasTouch: !masaustu(w), isMobile: !masaustu(w),
    reducedMotion: azalt ? "reduce" : "no-preference",
    storageState: { cookies: [], origins: [{ origin: adresOrigin, localStorage: lsDil(dil) }] },
  });
}
async function sayfaAc(w, h, dil, durum, { azalt = false, baglam = null, bekleKart = true } = {}) {
  const b = baglam ?? await baglamAc(w, h, dil, { azalt });
  const sayfa = await b.newPage();
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
  if (bekleKart) {
    await sayfa.waitForSelector(".gk-kart", { timeout: 40000 });
    await bekle(sayfa, azalt ? 300 : 1500);   // kart girişi + çizgi dolumu bitsin
  }
  return { baglam: b, sayfa, konsol };
}
const konsolTemiz = (k) => k.filter((x) => !/favicon|manifest|realtime|websocket|ERR_FAILED|Failed to load resource|net::|statement timeout|57014|status of [45]\d\d|\[Bildim\] görevler alınamadı/i.test(x));

async function olc(sayfa, konsol, etiket, { altBeklenir, kesikSay = true }) {
  const o = await sayfa.evaluate(() => {
    const kok = document.querySelector(".qt-sahne-kok");
    const govde = document.querySelector(".qt-sahne-govde");
    const alt = document.querySelector(".qt-sahne-alt");
    const goruluyor = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && cs.visibility !== "hidden"; };
    const kucuk = [...kok.querySelectorAll("button, a")].filter((e) => goruluyor(e) && !e.closest("[inert]") && (e.getBoundingClientRect().height < 43.5 || e.getBoundingClientRect().width < 43.5))
      .map((e) => `${(e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 20)}|${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
    const tasanOge = [...kok.querySelectorAll("*")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 0.5 && !e.closest(".gk-isin") && !e.classList.contains("gk-isin"); }).length;
    const kartlar = [...document.querySelectorAll(".gk-kart")];
    const x = kartlar.map((k) => Math.round(k.getBoundingClientRect().left));
    const yuk = kartlar.map((k) => Math.round(k.getBoundingClientRect().top));
    const kesik = [...document.querySelectorAll(".gk-ad, .gk-arka-ad")].filter((e) => goruluyor(e) && e.scrollHeight > e.clientHeight + 1).map((e) => e.textContent.trim());
    const tasanKart = [...document.querySelectorAll(".gk-yuz")].filter((k) => k.scrollWidth > k.clientWidth + 1).length;
    const dugme = document.querySelector(".gv-toplu");
    const db = dugme?.getBoundingClientRect();
    return {
      bodyKay: document.scrollingElement.scrollHeight - innerHeight,
      yatayTasma: document.documentElement.scrollWidth - innerWidth,
      kucuk, tasanOge, kesik, tasanKart,
      ucYanyana: kartlar.length === 3 && new Set(yuk).size === 1 && new Set(x).size === 3,
      govdeYatay: govde.scrollWidth - govde.clientWidth,
      altYukseklik: alt ? Math.round(alt.getBoundingClientRect().height) : 0,
      dugmeGorunur: db ? db.top >= 0 && db.bottom <= innerHeight : null,
    };
  });
  ok(`${etiket}: body kaymıyor`, o.bodyKay <= 0, `fark=${o.bodyKay}`);
  ok(`${etiket}: yatay taşma yok`, o.yatayTasma <= 0 && o.tasanOge === 0 && o.govdeYatay <= 0 && o.tasanKart === 0, `sayfa=${o.yatayTasma} öğe=${o.tasanOge} govde=${o.govdeYatay} kart=${o.tasanKart}`);
  ok(`${etiket}: 3 kart yan yana`, o.ucYanyana);
  ok(`${etiket}: dokunma hedefleri ≥ 44 px`, o.kucuk.length === 0, o.kucuk.slice(0, 4).join(" ; "));
  if (kesikSay) ok(`${etiket}: kart metni 2 satıra sığıyor (kırpılma yok)`, o.kesik.length === 0, o.kesik.join(" | "));
  if (altBeklenir) ok(`${etiket}: alt düğme ekranda görünür`, o.dugmeGorunur === true, JSON.stringify({ g: o.dugmeGorunur, alt: o.altYukseklik }));
  const t = konsolTemiz(konsol);
  ok(`${etiket}: konsol hatası yok`, t.length === 0, t.slice(0, 3).join(" | "));
  return o;
}
const tikla = (sayfa, konum) => sayfa.locator(konum).first().click();
const haftalikSekme = (sayfa) => sayfa.getByRole("tab").nth(1).click();

const ETIKET = process.env.ETIKET || "once";
for (const [w, h, dil, ad] of [[390,844,"tr","coklu"],[390,700,"tr","coklu"],[390,700,"en","coklu"],[390,844,"en","coklu"]]) {
  for (const hft of [false, true]) {
    const { baglam, sayfa, konsol } = await sayfaAc(w, h, dil, { d: HAZIR[ad](), sezon: true });
    if (hft) { await haftalikSekme(sayfa); await bekle(sayfa, 1400); }
    await sayfa.evaluate(() => { const g = document.querySelector(".qt-sahne-govde"); g.scrollTop = g.scrollHeight; });
    await bekle(sayfa, 400);
    const o = await sayfa.evaluate(() => {
      const r = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; };
      const alt = document.querySelector(".qt-sahne-alt"); const govde = document.querySelector(".qt-sahne-govde");
      const kartlar = [...document.querySelectorAll(".gk-kart")];
      const son = kartlar[kartlar.length - 1];
      const al = [...document.querySelectorAll(".gk-kart button")].filter((b) => /^\s*al\s*$/i.test(b.textContent));
      return { alt: alt ? r(alt) : null, govde: r(govde), sonKart: son ? r(son) : null, alBtn: al.map(r), scrollTop: govde.scrollTop, max: govde.scrollHeight - govde.clientHeight, pb: getComputedStyle(govde).paddingBottom, sayfaPb: getComputedStyle(document.querySelector(".gk-sayfa")).paddingBottom };
    });
    console.log(w, h, dil, ad, hft ? "haftalik" : "gunluk", JSON.stringify(o), "konsol", konsolTemiz(konsol).length);
    await sayfa.screenshot({ path: path.join(CIKTI, `gorevler-${ETIKET}-${w}x${h}-${dil}-${hft ? "hft" : "gun"}.png`) });
    await baglam.close();
  }
}
await tarayici.close();
