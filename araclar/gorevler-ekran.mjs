// Görevler (/gorevler) + ana sayfa şeridi ekran ölçümü. Sunucuya YAZMAZ: gorevlerim / gorev_al / haftalik_sandik_al /
// sezon_ozetim cevapları tarayıcıda taklit edilir (tüm durumlar: alınabilir, devam eden, alınmış, sandık kilitli/açık/alınmış,
// kategori görevi, sezon açık/kapalı, hata). Ölçer: yatay taşma · dokunma hedefi (≥44) · konsol hatası · KONTRAST (piksellerden:
// elementin kırpılmış görüntüsünde zemin = en sık renk, yazı = zeminden en uzak renk) · OYNA/DÜELLO konumu (ana sayfa).
// Kullanım: npm run dev -- --port 5193 (başka kabukta) · node araclar/gorevler-ekran.mjs [--adres=http://localhost:5193]
// Oturum: .sezon-gorev-oturum.json (git'e girmez) yoksa "Misafir olarak dene" ile kendi misafir hesabı açılır.
// Çıktılar: oyun/tasarim/gorevler/*.png ve olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ADRES = (process.argv.find((a) => a.startsWith("--adres=")) ?? "--adres=http://localhost:5193").slice(8);
const OTURUM = path.resolve(".sezon-gorev-oturum.json");
const CIKTI = path.resolve("oyun/tasarim/gorevler");
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
const MAC3 = () => G("gun_mac_oyna_3", "3 maç oyna", "Play 3 matches", "kolay", "mac_oyna", 3, 3);
const HAZIR = {
  // alınabilir + devam eden + alınmış; haftalık karışık; sandık kilitli 1/3 (ana sayfa: günlük 2/3, haftalık 1/3 → "alınabilir" nokta)
  karma: () => veriYap({
    gun: [MAC3(),
      G("gun_mac_kazan_2", "2 maç kazan", "Win 2 matches", "orta", "mac_kazan", 2, 1),
      G("gun_dogru_50", "50 soruyu doğru cevapla", "Answer 50 questions correctly", "zor", "dogru_soru", 50, 50, { alindi: true })],
    hft: [H("hft_mac_oyna_15", "Bu hafta 15 maç oyna", "Play 15 matches this week", "mac_oyna", 15, 11),
      H("hft_duello_galibiyet_3", "Düello'da 3 galibiyet", "Win 3 Duel matches", "duello_galibiyet", 3, 3, { alindi: true }),
      H("hft_farkli_kategori_5", "5 farklı kategoride doğru cevap", "Answer correctly in 5 different categories", "farkli_kategori_dogru", 5, 2)],
  }),
  kategori: () => veriYap({
    gun: [G("gun_dogru_10", "10 soruyu doğru cevapla", "Answer 10 questions correctly", "kolay", "dogru_soru", 10, 0),
      G("gun_duello_mac_1", "Düello'da 1 maç oyna", "Play 1 Duel match", "orta", "duello_mac", 1, 0),
      G("gun_kategori_dogru_10", "Bugünün kategorisinde 10 soruyu doğru cevapla", "Answer 10 questions correctly in today's category", "zor", "kategori_dogru", 10, 4, { parametre: { kategori: "spor" } })],
    hft: [H("hft_mac_kazan_7", "Bu hafta 7 maç kazan", "Win 7 matches this week", "mac_kazan", 7, 0),
      H("hft_dogru_100", "100 soruyu doğru cevapla", "Answer 100 questions correctly", "dogru_soru", 100, 37),
      H("hft_duello_mac_5", "Düello'da 5 maç oyna", "Play 5 Duel matches", "duello_mac", 5, 1)],
  }),
  sandikAcik: () => veriYap({
    gun: [G("gun_mac_oyna_2", "2 maç oyna", "Play 2 matches", "kolay", "mac_oyna", 2, 2, { alindi: true }),
      G("gun_duello_galibiyet_1", "Düello'da 1 galibiyet al", "Win 1 Duel match", "orta", "duello_galibiyet", 1, 1),
      G("gun_mac_kazan_5", "5 maç kazan", "Win 5 matches", "zor", "mac_kazan", 5, 2)],
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
  sakin: () => veriYap({
    gun: [G("gun_mac_oyna_3", "3 maç oyna", "Play 3 matches", "kolay", "mac_oyna", 3, 1),
      G("gun_mac_kazan_2", "2 maç kazan", "Win 2 matches", "orta", "mac_kazan", 2, 0),
      G("gun_dogru_50", "50 soruyu doğru cevapla", "Answer 50 questions correctly", "zor", "dogru_soru", 50, 12)],
    hft: [H("hft_mac_oyna_15", "Bu hafta 15 maç oyna", "Play 15 matches this week", "mac_oyna", 15, 4),
      H("hft_duello_galibiyet_3", "Düello'da 3 galibiyet", "Win 3 Duel matches", "duello_galibiyet", 3, 0),
      H("hft_dogru_100", "100 soruyu doğru cevapla", "Answer 100 questions correctly", "dogru_soru", 100, 20)],
  }),
};

// ---------- Taklit ----------
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
async function taklitKur(sayfa, durum) {
  const cevap = (r, govde, status = 200) => r.fulfill({ status, contentType: "application/json", headers: CORS, body: JSON.stringify(govde) });
  const rpc = (ad, fn) => sayfa.route(new RegExp(`/rest/v1/rpc/${ad}(\\?|$)`), async (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: CORS });
    let arg = {};
    try { arg = JSON.parse(r.request().postData() ?? "{}"); } catch { /* boş */ }
    return fn(r, arg);
  });
  await rpc("gorevlerim", (r) => {
    if (durum.hata) return cevap(r, { message: "Sunucuda geçici bir sorun var" }, 500);
    return cevap(r, durum.d);
  });
  await rpc("gorev_al", (r, a) => {
    const liste = a.p_kapsam === "gunluk" ? durum.d.gunluk.gorevler : durum.d.haftalik.gorevler;
    const g = liste.find((x) => x.quest_id === a.p_quest_id);
    if (durum.alHata) return cevap(r, { message: "Çok hızlı işlem yapıyorsun, biraz bekle." }, 400);
    if (!g) return cevap(r, { message: "Görev bulunamadı" }, 400);
    if (g.alindi) return cevap(r, { alindi: false, zaten: true, kapsam: a.p_kapsam, quest_id: g.quest_id, coin: 0, sp: null });
    if (!g.alinabilir) return cevap(r, { message: "Görev henüz tamamlanmadı" }, 400);
    g.alindi = true; g.alinabilir = false;
    Object.assign(durum.d, veriYap({ gun: durum.d.gunluk.gorevler, hft: durum.d.haftalik.gorevler, sandikAlindi: durum.d.haftalik.sandik.alindi }));
    return cevap(r, { alindi: true, zaten: false, kapsam: a.p_kapsam, quest_id: g.quest_id, coin: durum.coinTavan ?? g.odul.coin, sp: durum.sezon ? g.odul.sp : null });
  });
  await rpc("haftalik_sandik_al", (r) => {
    const s = durum.d.haftalik.sandik;
    if (!s.alinabilir) return cevap(r, { message: "Haftalık görevlerin hepsini almadan sandık açılmaz" }, 400);
    Object.assign(durum.d, veriYap({ gun: durum.d.gunluk.gorevler, hft: durum.d.haftalik.gorevler, sandikAlindi: true }));
    return cevap(r, { alindi: true, zaten: false, sp: durum.sezon ? 75 : null, joker: { tur: "soru_degistir", adet: 1 } });
  });
  await rpc("sezon_ozetim", (r) => cevap(r, durum.sezon
    ? { gorunur: true, sezon: 1, seviye: 3, seviye_sayisi: 28, sp: 340, onceki_esik: 300, sonraki_esik: 400, bp: false, alinabilir: 0 }
    : { gorunur: false }));
}

// ---------- Oturum ----------
// Kurulum adımlarını yürütür; bitince true, avatar adımı takılırsa false (çağıran oturumla yeni bağlam açar: takılma yalnız
// ilk bağlamda oluyor, kayıtlı oturumla açılınca adım geçiyor).
async function kurulumAdimlari(s) {
  for (let i = 0; i < 14; i++) {
    if (await s.locator(".as-buyuk-dugme--oyna").isVisible().catch(() => false) && !(await s.locator(".bd-modal-katman").count())) return true;
    const tm = s.getByRole("button", { name: /^(Tamam|OK|Atla|Hadi başlayalım)$/ });
    if (await tm.count()) { await tm.first().click(); await s.waitForTimeout(2000); continue; }
    const kullan = s.getByRole("button", { name: /Bu avatarı kullan/i });
    if (await kullan.count()) {
      await s.locator(".bd-modal-katman img[src*='/avatars/']").first().click(); await s.waitForTimeout(700);
      await kullan.first().click(); await s.waitForTimeout(3500); if (await kullan.count()) return false; continue;
    }
    const sehir = s.locator(".bd-modal-katman [role=combobox]").first();
    if (await sehir.count()) {
      await sehir.click();
      await s.locator(".bd-modal-katman [role=option]").first().waitFor({ timeout: 8000 });
      await s.locator(".bd-modal-katman [role=option]").first().click();
      await s.getByRole("button", { name: /Oyuna başla/i }).first().click({ timeout: 5000 });
      await s.waitForTimeout(3000); continue;
    }
    const alan = s.locator(".bd-modal-katman input").first();
    if (await alan.count()) { await alan.fill("GorevB" + Math.floor(Math.random() * 900 + 100)); await s.getByRole("button", { name: /^Devam$/ }).first().click(); await s.waitForTimeout(3000); continue; }
    await s.waitForTimeout(1800);
  }
  return false;
}
async function misafirOturumuAc(tarayici) {
  console.log("· Oturum yok — kendi misafir hesabım açılıyor…");
  let durum = null;
  for (let tur = 0; tur < 4; tur++) {
    const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, ...(durum ? { storageState: durum } : {}) });
    const s = await baglam.newPage();
    await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
    if (!durum) { await s.getByRole("button", { name: /Misafir olarak dene/i }).click(); await s.waitForTimeout(6000); } else await s.waitForTimeout(5000);
    const bitti = await kurulumAdimlari(s);
    durum = await baglam.storageState();
    await baglam.close();
    if (bitti) { fs.writeFileSync(OTURUM, JSON.stringify(durum)); return; }
  }
  throw new Error("Misafir kurulumu bitmedi");
}

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
if (!fs.existsSync(OTURUM)) await misafirOturumuAc(tarayici);
const oturum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const kaynak = oturum.origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token")));
const lsDil = (dil) => [...kaynak.localStorage.filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }];

let hata = 0;
const rapor = { olcumler: [], kontrast: [], ana: [] };
const ok = (ad, k, ek = "") => { rapor.olcumler.push({ ad, gecti: Boolean(k), ek }); if (k) console.log("  ✓", ad); else { hata++; console.log("  ✗", ad, ek); } };

async function sayfaAc(w, h, dil, durum, yolu, { azalt = false } = {}) {
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
  await sayfa.goto(`${ADRES}${yolu}`, { waitUntil: "domcontentloaded" });
  return { baglam, sayfa, konsol };
}
const konsolTemiz = (k) => k.filter((x) => !/favicon|manifest|realtime|websocket|ERR_FAILED|Failed to load resource|net::|statement timeout|57014|status of [45]\d\d/i.test(x));
const bekle = (s, ms) => s.waitForTimeout(ms);
const yol = (ad) => path.join(CIKTI, ad);

async function genelOlcum(sayfa, konsol, etiket, kok) {
  const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(`${etiket}: sayfa yatay taşma yok`, tasma <= 0, `taşma=${tasma}`);
  const kucuk = await sayfa.evaluate((k) => [...document.querySelectorAll(`${k} button, ${k} a`)]
    .filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && cs.visibility !== "hidden" && (r.height < 43.5 || r.width < 43.5); })
    .map((e) => `${e.className.toString().slice(0, 30)}|${e.textContent.trim().slice(0, 14)}|${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`), kok);
  ok(`${etiket}: dokunma hedefleri ≥ 44 px`, kucuk.length === 0, kucuk.slice(0, 5).join(" ; "));
  const ic = await sayfa.evaluate((k) => [...document.querySelectorAll(`${k} *`)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > window.innerWidth + 0.5; }).length, kok);
  ok(`${etiket}: hiçbir öğe ekran dışına taşmıyor`, ic === 0, `taşan=${ic}`);
  const temiz = konsolTemiz(konsol);
  ok(`${etiket}: konsol hatası yok`, temiz.length === 0, temiz.slice(0, 3).join(" | "));
}

// Kontrast: elementin ekran görüntüsünden (zemin = en sık renk, yazı = zeminden en uzak renk) WCAG oranı.
async function kontrastOlc(sayfa, etiket, secici, { buyuk = false } = {}) {
  const liste = await sayfa.$$(secici);
  let en = 99; let ornek = "";
  for (const el of liste.slice(0, 6)) {
    if (!(await el.isVisible())) continue;
    let buf;
    try { await el.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" })); await sayfa.waitForTimeout(500); buf = await el.screenshot({ type: "png" }); } catch { continue; }
    const r = await sayfa.evaluate(async (b64) => {
      const bmp = await createImageBitmap(await (await fetch("data:image/png;base64," + b64)).blob());
      const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
      const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(bmp, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      const sayim = new Map();
      for (let i = 0; i < d.length; i += 4) { const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; sayim.set(k, (sayim.get(k) ?? 0) + 1); }
      let zemin = 0, say = -1; for (const [k, n] of sayim) if (n > say) { say = n; zemin = k; }
      const zr = [(zemin >> 16) & 255, (zemin >> 8) & 255, zemin & 255];
      const lum = (rgb) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]); };
      const fark = (p) => Math.abs(p[0] - zr[0]) + Math.abs(p[1] - zr[1]) + Math.abs(p[2] - zr[2]);
      const px = []; for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
      px.sort((a, b) => fark(b) - fark(a));
      const n = Math.max(1, Math.floor(px.length * 0.02)); const ort = [0, 1, 2].map((j) => Math.round(px.slice(0, n).reduce((t, p) => t + p[j], 0) / n));
      const L1 = lum(zr), L2 = lum(ort); const oran = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      return { oran, zemin: zr.join(","), yazi: ort.join(",") };
    }, buf.toString("base64"));
    if (r.oran < en) { en = r.oran; ornek = `zemin ${r.zemin} yazı ${r.yazi}`; }
  }
  const esik = buyuk ? 3 : 4.5;
  rapor.kontrast.push({ etiket, oran: en === 99 ? null : Number(en.toFixed(2)), esik, ornek });
  ok(`${etiket}: kontrast ${en === 99 ? "—" : en.toFixed(2)} ≥ ${esik}`, en === 99 || en >= esik, ornek);
}

const SEC = {
  baslik: ".gv-h2", ad: ".gv-ad", sayi: ".gv-sayi", cip: ".gv-cip", kolay: ".gv-zor--kolay", orta: ".gv-zor--orta", zor: ".gv-zor--zor",
  kat: ".gv-kat", alDugme: ".gv-kart:not(.gv-sandik) .gv-al", alt: ".gv-alt", not: ".gv-not",
};
async function kontrastHepsi(sayfa, etiket) {
  for (const [ad, s] of Object.entries(SEC)) {
    if (await sayfa.$(s)) await kontrastOlc(sayfa, `${etiket} ${ad}`, s);
  }
}

const gorunenMetin = (s) => s.evaluate(() => document.body.innerText);
const ALDUGME = /ödülünü al|Claim reward/;

// ================= 1) /gorevler — karma durum, 3 ekran boyutu, TR =================
for (const [w, h] of [[390, 844], [390, 700], [360, 640]]) {
  console.log(`\n== /gorevler ${w}×${h} TR — karma, sezon açık`);
  const durum = { d: HAZIR.karma(), sezon: true };
  const { baglam, sayfa, konsol } = await sayfaAc(w, h, "tr", durum, "/gorevler");
  await sayfa.waitForSelector(".gv-kart", { timeout: 40000 });
  await bekle(sayfa, 900);
  await sayfa.screenshot({ path: yol(`gorevler-karma-${w}x${h}.png`) });
  if (h < 800) await sayfa.screenshot({ path: yol(`gorevler-karma-${w}x${h}-tam.png`), fullPage: true });
  await genelOlcum(sayfa, konsol, `${w}×${h} karma`, ".gv-sayfa");
  const ilk = await sayfa.evaluate(() => {
    const kartlar = [...document.querySelector("#gv-gunluk").closest("section").querySelectorAll(".gv-kart")];
    const nav = document.querySelector(".qt-altmenu"); const limit = nav ? nav.getBoundingClientRect().top : window.innerHeight;
    return { adet: kartlar.length, altlar: kartlar.map((k) => Math.round(k.getBoundingClientRect().bottom)), limit: Math.round(limit) };
  });
  ok(`${w}×${h}: ilk ekranda günlük 3 görev görünür`, ilk.adet === 3 && ilk.altlar.every((a) => a <= ilk.limit), JSON.stringify(ilk));
  if (w === 390 && h === 844) await kontrastHepsi(sayfa, "karma TR");
  await baglam.close();
}

// ================= 2) Durumlar (390×844) =================
const DURUMLAR = [
  ["kategori", "kategori görevi + taze gün", HAZIR.kategori, true],
  ["sandik-acik", "sandık açılabilir", HAZIR.sandikAcik, true],
  ["hepsi-alindi", "hepsi alınmış + sandık alınmış", HAZIR.hepsiAlindi, true],
  ["sezon-kapali", "sezon kapalı (SP çipi ve not yok)", HAZIR.karma, false],
];
for (const [ad, tanim, fab, sezon] of DURUMLAR) {
  console.log(`\n== /gorevler 390×844 TR — ${tanim}`);
  const durum = { d: fab(), sezon };
  const { baglam, sayfa, konsol } = await sayfaAc(390, 844, "tr", durum, "/gorevler");
  await sayfa.waitForSelector(".gv-kart", { timeout: 40000 });
  await bekle(sayfa, 700);
  await sayfa.screenshot({ path: yol(`gorevler-${ad}-390x844.png`), fullPage: true });
  await genelOlcum(sayfa, konsol, `390 ${ad}`, ".gv-sayfa");
  const metin = await gorunenMetin(sayfa);
  if (ad === "sezon-kapali") {
    ok("sezon kapalı: alt not gizli", !/sezon yoluna işler/.test(metin));
    ok("sezon kapalı: SP çipi yok", !/\d\s*SP\b/.test(metin), metin.match(/.{0,20}\bSP\b.{0,10}/)?.[0] ?? "");
  } else {
    ok(`${ad}: alt not görünür`, /sezon yoluna işler/.test(metin));
  }
  if (ad === "kategori") {
    ok("kategori görevi: günün kategorisi ('Spor') çip olarak görünür", (await sayfa.locator(".gv-kat").first().innerText()) === "Spor");
    await kontrastHepsi(sayfa, "kategori");
  }
  if (ad === "sandik-acik") {
    await kontrastOlc(sayfa, "sandık açık: Sandığı aç düğmesi", ".gv-sandik .gv-al");
    await kontrastOlc(sayfa, "sandık: çip", ".gv-sandik .gv-cip");
  }
  if (ad === "hepsi-alindi") {
    const tik = await sayfa.locator(".gv-tik").count();
    ok("hepsi alınmış: 7 yeşil tik (3+3+sandık)", tik === 7, `tik=${tik}`);
  }
  await baglam.close();
}

// ================= 3) EN + hareketi azalt =================
console.log("\n== /gorevler 390×844 EN — karma");
{
  const durum = { d: HAZIR.karma(), sezon: true };
  const { baglam, sayfa, konsol } = await sayfaAc(390, 844, "en", durum, "/gorevler");
  await sayfa.waitForSelector(".gv-kart", { timeout: 40000 });
  await bekle(sayfa, 900);
  await sayfa.screenshot({ path: yol("gorevler-karma-390x844-en.png"), fullPage: true });
  await genelOlcum(sayfa, konsol, "390 EN karma", ".gv-sayfa");
  const m = await gorunenMetin(sayfa);
  ok("EN: başlıklar ve düğme İngilizce", /Daily quests/.test(m) && /Weekly quests/.test(m) && /Claim/.test(m) && /Weekly chest/.test(m) && /Finish 3 weekly quests/.test(m), m.slice(0, 200).replace(/\n/g, " | "));
  ok("EN: Türkçe kalıntı yok", !/Görev|görev|Günlük|Haftalık|Kolay|Orta\b|Zor\b|Sandığı/.test(m), (m.match(/.{0,15}(Görev|görev|Günlük|Haftalık|Kolay|Orta\b|Zor\b|Sandığı).{0,15}/) ?? [""])[0]);
  await kontrastHepsi(sayfa, "karma EN");
  await baglam.close();
}
console.log("\n== /gorevler 390×844 TR — hareketi azalt + alma");
{
  const durum = { d: HAZIR.karma(), sezon: true };
  const { baglam, sayfa, konsol } = await sayfaAc(390, 844, "tr", durum, "/gorevler", { azalt: true });
  await sayfa.waitForSelector(".gv-kart", { timeout: 40000 });
  await bekle(sayfa, 600);
  await sayfa.getByRole("button", { name: ALDUGME }).first().tap();
  await bekle(sayfa, 500);
  await sayfa.screenshot({ path: yol("gorevler-alindi-azalt-390x844.png") });
  const ucan = await sayfa.evaluate(() => { const e = document.querySelector(".gv-ucan"); if (!e) return null; const cs = getComputedStyle(e); return { anim: cs.animationName, metin: e.innerText.replace(/\n/g, " ") }; });
  ok("hareketi azalt: uçan çip yerinde-soluk animasyonu (gv-uc-y)", ucan?.anim === "gv-uc-y", JSON.stringify(ucan));
  await genelOlcum(sayfa, konsol, "390 azalt", ".gv-sayfa");
  await baglam.close();
}

// ================= 4) Alma akışı (normal hareket) =================
console.log("\n== Alma akışı: günlük Al → çip + tik; sandık");
{
  const durum = { d: HAZIR.sandikAcik(), sezon: true };
  const { baglam, sayfa, konsol } = await sayfaAc(390, 844, "tr", durum, "/gorevler");
  await sayfa.waitForSelector(".gv-kart", { timeout: 40000 });
  await bekle(sayfa, 500);
  await sayfa.screenshot({ path: yol("gorevler-alinabilir-once-390x844.png") });
  const tikOnce = await sayfa.locator(".gv-kart--alindi").count();
  await sayfa.getByRole("button", { name: ALDUGME }).first().tap();
  await bekle(sayfa, 450);
  await sayfa.screenshot({ path: yol("gorevler-alinca-cip-390x844.png") });
  const cipMetni = await sayfa.locator(".gv-ucan").first().innerText().catch(() => "");
  ok("alınca uçan çip: +15 ve +10 SP", /\+15/.test(cipMetni) && /\+10\s*SP/.test(cipMetni), cipMetni.replace(/\n/g, " "));
  await bekle(sayfa, 500);
  ok("alınca kart yeşil tikli (alınmış kart sayısı +1)", (await sayfa.locator(".gv-kart--alindi").count()) === tikOnce + 1);
  await bekle(sayfa, 2200);
  ok("çip süre sonunda kalkar", (await sayfa.locator(".gv-ucan").count()) === 0);
  await sayfa.getByRole("button", { name: /Sandığı aç/ }).tap();
  await bekle(sayfa, 450);
  await sayfa.screenshot({ path: yol("gorevler-sandik-acilinca-390x844.png") });
  const sm = await sayfa.locator(".gv-sandik .gv-ucan").first().innerText().catch(() => "");
  ok("sandık açılınca çip: +75 SP ve Soru Değiştir ×1", /\+75\s*SP/.test(sm) && /Soru Değiştir ×1/.test(sm), sm.replace(/\n/g, " "));
  await bekle(sayfa, 600);
  ok("sandık alınmış (yeşil tik)", (await sayfa.locator(".gv-sandik--alindi").count()) === 1);
  await genelOlcum(sayfa, konsol, "alma akışı", ".gv-sayfa");
  await baglam.close();
}
console.log("\n== Coin tavanı: sunucu 5 coin döndü → çip +5");
{
  const durum = { d: HAZIR.karma(), sezon: true, coinTavan: 5 };
  const { baglam, sayfa } = await sayfaAc(390, 844, "tr", durum, "/gorevler");
  await sayfa.waitForSelector(".gv-kart", { timeout: 40000 });
  await sayfa.getByRole("button", { name: ALDUGME }).first().tap();
  await bekle(sayfa, 450);
  const c = await sayfa.locator(".gv-ucan").first().innerText().catch(() => "");
  ok("çip sunucunun GERÇEK coin'ini gösterir (+5, +15 değil)", /\+5\b/.test(c) && !/\+15/.test(c), c.replace(/\n/g, " "));
  await baglam.close();
}
console.log("\n== Hata: alma hızı sınırı, yükleme hatası");
{
  const durum = { d: HAZIR.karma(), sezon: true, alHata: true };
  const { baglam, sayfa } = await sayfaAc(390, 844, "tr", durum, "/gorevler");
  await sayfa.waitForSelector(".gv-kart", { timeout: 40000 });
  await sayfa.getByRole("button", { name: ALDUGME }).first().tap();
  await bekle(sayfa, 600);
  await sayfa.screenshot({ path: yol("gorevler-hata-alma-390x844.png") });
  const m = await sayfa.locator(".gv-mesaj").innerText().catch(() => "");
  ok("alma hatası sade mesaj (role=alert)", m.length > 5 && !/pgrst|violates|function/i.test(m), m);
  ok("hata sonrası Al düğmesi yeniden basılabilir", await sayfa.getByRole("button", { name: ALDUGME }).first().isEnabled());
  await kontrastOlc(sayfa, "hata mesajı", ".gv-mesaj");
  await baglam.close();
}
{
  const durum = { d: HAZIR.karma(), sezon: true, hata: true };
  const { baglam, sayfa } = await sayfaAc(390, 844, "tr", durum, "/gorevler");
  await sayfa.waitForSelector("[role=alert]", { timeout: 40000 });
  await bekle(sayfa, 500);
  await sayfa.screenshot({ path: yol("gorevler-yukleme-hatasi-390x844.png") });
  const m = await gorunenMetin(sayfa);
  ok("yükleme hatası: 'Yüklenemedi' + Tekrar dene, sahte veri yok", /Yüklenemedi/.test(m) && /Tekrar dene/.test(m) && !/Günlük görevler/.test(m), m.slice(0, 160).replace(/\n/g, " | "));
  durum.hata = false;
  await sayfa.getByRole("button", { name: /Tekrar dene/ }).tap();
  await sayfa.waitForSelector(".gv-kart", { timeout: 15000 });
  ok("Tekrar dene → görevler geldi (6 görev + sandık)", (await sayfa.locator(".gv-kart").count()) === 7);
  await baglam.close();
}

// ================= 5) Ana sayfa şeridi =================
const ANA = [[390, 664], [390, 700], [390, 760], [390, 844], [360, 640], [360, 700], [360, 800]];
for (const [w, h] of ANA) {
  for (const [ad, fab, dil] of [["alinabilir", HAZIR.karma, "tr"], ["sakin", HAZIR.sakin, "tr"], ...(w === 390 && h === 844 ? [["alinabilir", HAZIR.karma, "en"]] : [])]) {
    console.log(`\n== Ana sayfa ${w}×${h} ${dil.toUpperCase()} — şerit (${ad})`);
    const durum = { d: fab(), sezon: false };
    const { baglam, sayfa, konsol } = await sayfaAc(w, h, dil, durum, "/");
    await sayfa.waitForSelector(".as-buyuk-dugme--oyna", { timeout: 40000 });
    await sayfa.waitForSelector(".as-lk-satir--ben", { timeout: 30000, state: "attached" }).catch(() => {});
    await bekle(sayfa, 1800);
    const o = await sayfa.evaluate(() => {
      const r = (q) => { const e = document.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; };
      const g = document.querySelector(".as-gs"); const gv = g && g.offsetParent !== null;
      const nav = document.querySelector(".qt-altmenu");
      return {
        oyna: r(".as-buyuk-dugme--oyna"), duello: r(".as-buyuk-dugme--duello"), serit: gv ? r(".as-gs") : null, nav: nav ? Math.round(nav.getBoundingClientRect().top) : null,
        nokta: Boolean(document.querySelector(".as-gs-nokta")), metin: g ? g.innerText.replace(/\n/g, " ") : null, aria: g?.getAttribute("aria-label") ?? null,
        docKay: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      };
    });
    rapor.ana.push({ w, h, dil, ad, ...o });
    console.log("   ", JSON.stringify(o));
    const tag = `${w}x${h}${dil === "en" ? "-en" : ""}-${ad}`;
    if (ad === "alinabilir" || (w === 390 && h === 664)) await sayfa.screenshot({ path: yol(`ana-${tag}.png`) });
    ok(`ana ${tag}: OYNA ve DÜELLO ilk ekranda (alt menünün üstünde)`, o.oyna && o.duello && o.oyna[1] <= o.nav && o.duello[1] <= o.nav, JSON.stringify(o));
    ok(`ana ${tag}: sayfa dikey kaymıyor (kaydırmasız lobi)`, o.docKay <= 0, `docKay=${o.docKay}`);
    if (h >= 700) {
      ok(`ana ${tag}: şerit görünür ve alt menüye binmiyor`, o.serit && o.serit[1] <= o.nav, JSON.stringify(o.serit));
      ok(`ana ${tag}: şerit nokta durumu doğru (alınabilir=${ad === "alinabilir"})`, o.nokta === (ad === "alinabilir"));
      const beklenen = ad === "alinabilir" ? /2\/3.*1\/3/ : /0\/3.*0\/3/;
      ok(`ana ${tag}: şerit metni (${ad === "alinabilir" ? "2/3 · 1/3" : "0/3 · 0/3"})`, beklenen.test(o.metin ?? ""), o.metin ?? "");
      await genelOlcum(sayfa, konsol, `ana ${tag}`, ".as-gs");
      if (ad === "alinabilir") {
        await kontrastOlc(sayfa, `ana ${tag} şerit başlık`, ".as-gs-metin b");
        await kontrastOlc(sayfa, `ana ${tag} şerit alt yazı`, ".as-gs-metin small");
      }
    } else {
      ok(`ana ${tag}: <700 px şerit gizli (sığmaz), OYNA/DÜELLO yerinde`, o.serit === null);
      const ge = konsolTemiz(konsol);
      ok(`ana ${tag}: konsol hatası yok`, ge.length === 0, ge.slice(0, 3).join(" | "));
    }
    if (w === 390 && h === 844 && ad === "alinabilir" && dil === "tr") {
      await sayfa.locator(".as-gs").tap();
      await sayfa.waitForURL(/\/gorevler/, { timeout: 15000 }).catch(() => {});
      ok("şeride dokununca /gorevler açılır", /\/gorevler/.test(sayfa.url()), sayfa.url());
      await sayfa.waitForSelector(".gv-kart", { timeout: 20000 }).catch(() => {});
      await sayfa.getByRole("button", { name: "Geri" }).tap();
      await bekle(sayfa, 900);
      ok("geri düğmesi ana sayfaya döner", new URL(sayfa.url()).pathname === "/", sayfa.url());
    }
    await baglam.close();
  }
}
console.log("\n== Avatar menüsü › Görevler (390×664: şerit gizli, buradan ulaşılır)");
{
  const durum = { d: HAZIR.karma(), sezon: false };
  const { baglam, sayfa } = await sayfaAc(390, 664, "tr", durum, "/");
  await sayfa.waitForSelector(".a-menu-dugme", { timeout: 40000 });
  await sayfa.locator(".a-menu-dugme").tap();
  await bekle(sayfa, 500);
  await sayfa.screenshot({ path: yol("ana-avatar-menu-390x664.png") });
  const oge = sayfa.getByRole("menuitem", { name: "Görevler" });
  ok("avatar menüsünde Görevler satırı var", (await oge.count()) === 1);
  await oge.tap();
  await sayfa.waitForURL(/\/gorevler/, { timeout: 15000 }).catch(() => {});
  ok("Görevler satırı /gorevler'e götürür", /\/gorevler/.test(sayfa.url()), sayfa.url());
  await baglam.close();
}

await tarayici.close();
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(rapor, null, 2));
console.log(`\n${hata ? "✗ " + hata + " ölçüm başarısız" : "✓ tüm ölçümler geçti"} — çıktı: oyun/tasarim/gorevler/`);
process.exit(hata ? 1 : 0);