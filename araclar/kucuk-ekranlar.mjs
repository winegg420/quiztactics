// Kalan küçük ekranlar turu (11 Eki 2026) — TAKLİT VERİYLE ekran görüntüsü + ölçüm. CANLIYA HİÇ İSTEK GİTMEZ:
// oturum taklit (sahte JWT), /auth/v1 ve /rest/v1 tarayıcıda (page.route) yanıtlanır; taklidi olmayan RPC null,
// tablo okuması [] döner, yazmalar kesilir. Realtime ve ses dosyaları kapalı. Misafir hesap AÇILMAZ.
// Ekranlar: avatar menüsü · 404 · Dükkân Elmas · Dükkân Efekt · Profil Ayarlar · Profil Davet (davetli + boş) · Görevler Haftalık
//
// Kullanım:
//   npx vite --port 5188 --strictPort            # ayrı kabukta (5173/5187/5188'den boş olanı)
//   node araclar/kucuk-ekranlar.mjs --adres=http://localhost:5188 --asama=once|sonra [--dil=tr] [--boyut=390x844] [--yalniz=menu,404]
// Çıktı: tasarim/kucuk-ekranlar/<asama>/<ekran>-<g>x<y>-<dil>.png (+ -tam.png) ve <asama>/olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5188");
const ASAMA = String(ARG.asama || "sonra");
const DILLER = ARG.dil ? [String(ARG.dil)] : ["tr", "en"];
const BOYUTLAR = ARG.boyut ? [String(ARG.boyut).split("x").map(Number)] : [[390, 844], [360, 780]];
const YALNIZ = typeof ARG.yalniz === "string" ? new Set(ARG.yalniz.split(",")) : null;
const CIKTI = path.resolve("tasarim/kucuk-ekranlar", ASAMA);
fs.mkdirSync(CIKTI, { recursive: true });

const env = fs.readFileSync(".env", "utf8");
const SUPA = (env.match(/VITE_SUPABASE_URL=\s*"?([^"\s]+)/) || [])[1];
if (!SUPA) { console.error(".env › VITE_SUPABASE_URL yok"); process.exit(2); }
const DEPO = `sb-${new URL(SUPA).hostname.split(".")[0]}-auth-token`;

// ---------------------------------------------------------------- taklit oturum
const BEN = "0c1a5100-0000-4000-8000-0000000c0c0c";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const EXP = Math.floor(Date.now() / 1000) + 7 * 86400;
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: BEN, role: "authenticated", aud: "authenticated", exp: EXP, is_anonymous: false })}.taklit`;
const KULLANICI = { id: BEN, aud: "authenticated", role: "authenticated", email: "deneme@ornek.com", is_anonymous: false, app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-09-01T00:00:00Z" };
const OTURUM = { access_token: JWT, token_type: "bearer", expires_in: 7 * 86400, expires_at: EXP, refresh_token: "taklit-yenileme", user: KULLANICI };
const PROFIL = (dil) => ({ id: BEN, gorunen_ad: "Deneme", username: "deneme", takma_ad: "Deneme", takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", sehir: "İstanbul",
  dil, puan: 1240, coin: 850, xp: 340, level: 7, misafir: false, gorunen_avatar: null, gorunum: null });

// ---------------------------------------------------------------- taklit veri
const U = (n) => `0c1a5100-0000-4000-8000-${String(n).padStart(12, "0")}`;
const AYARLAR = { elmas_lig_1: 30, elmas_lig_2: 20, elmas_lig_3: 10, elmas_turnuva_1: 25, elmas_level: 10, elmas_level_aralik: 5, elmas_seri: 15, elmas_seri_gun: 7,
  coin_reklam: 25, klasik_skill_toplam_hak: 3 };
const ELMAS_PAKETLERI = [["elmas_avuc", "Avuç", 80, 0], ["elmas_kese", "Kese", 200, 20], ["elmas_sandik", "Sandık", 450, 70], ["elmas_hazine", "Hazine", 1000, 200], ["elmas_define", "Define", 2400, 600]]
  .map(([urun_id, ad, elmas, bonus], i) => ({ urun_id, ad, elmas, bonus, sira: i + 1, satista: false }));
const IMZA = (anahtar, ad_tr, ad_en, n, para, fiyat, sira, o = {}) => ({ anahtar, tur: "cevap_imzasi", ad: ad_tr, ad_tr, ad_en, fiyat, icerik: { para, nadirlik: n }, sira,
  satilik: true, sahip: false, takili: false, kapali: false, onay: null, ...o });
const KATALOG = [
  IMZA("imza_neon_tik", "Neon Tik", "Neon Tick", "nadir", "coin", 750, 701, { sahip: true, takili: true }),
  IMZA("imza_yildiz", "Yıldız Patlaması", "Star Burst", "nadir", "coin", 750, 702),
  IMZA("imza_ampul", "Bilgi Ampulü", "Idea Bulb", "epik", "elmas", 150, 703),
  IMZA("imza_elektrik", "Elektrik Akımı", "Electric Current", "epik", "elmas", 150, 704),
  IMZA("imza_yanan_kart", "Yanan Kart", "Burning Card", "efsanevi", "elmas", 300, 705),
];
const DAVET_KOD = { kod: "DENEME7", yol: "/davet/DENEME7", odul_davet_eden: 300, odul_davet_edilen: 100, gereken_level: 5, aylik_sinir: 10, bu_ay_odullenen: 2 };
const DAVET_DOLU = { baglanabilir: false, davet_eden: null, ozet: { toplam: 3 }, davetlerim: [
  { user_id: U(901), ad: "Ayşe", avatar: null, cerceve: null, durum: "odullendi", level: 6, gereken_level: 5 },
  { user_id: U(902), ad: "Mert", avatar: null, cerceve: null, durum: "bekliyor", level: 3, gereken_level: 5 },
  { user_id: U(903), ad: "Zeynep Kaya Yılmazoğlu", avatar: null, cerceve: null, durum: "bekliyor", level: 1, gereken_level: 5 },
] };
const DAVET_BOS = { baglanabilir: false, davet_eden: null, ozet: { toplam: 0 }, davetlerim: [] };

// Görevler (araclar/sahne-ekran-gorevler.mjs ile aynı biçim)
const G = (id, ad_tr, ad_en, zorluk, sayac, hedef, ilerleme, { alindi = false, parametre = {}, coin = 15, sp = 10 } = {}) => ({
  quest_id: id, ad_tr, ad_en, zorluk, sayac, hedef, parametre, ilerleme: Math.min(ilerleme, hedef), alindi, alinabilir: ilerleme >= hedef && !alindi, odul: { coin, sp } });
const H = (id, ad_tr, ad_en, sayac, hedef, ilerleme, o = {}) => G(id, ad_tr, ad_en, null, sayac, hedef, ilerleme, { coin: 50, sp: 25, ...o });
const GOREVLER = () => {
  const gun = [G("gun_mac_oyna_3", "3 maç oyna", "Play 3 matches", "kolay", "mac_oyna", 3, 1),
    G("gun_mac_kazan_2", "2 maç kazan", "Win 2 matches", "orta", "mac_kazan", 2, 0),
    G("gun_dogru_50", "50 soruyu doğru cevapla", "Answer 50 questions correctly", "zor", "dogru_soru", 50, 12)];
  const hft = [H("hft_mac_oyna_15", "Bu hafta 15 maç oyna", "Play 15 matches this week", "mac_oyna", 15, 15),
    H("hft_duello_galibiyet_3", "Düello'da 3 galibiyet", "Win 3 Duel matches", "duello_galibiyet", 3, 3, { alindi: true }),
    H("hft_farkli_kategori_5", "5 farklı kategoride doğru cevap", "Answer correctly in 5 different categories", "farkli_kategori_dogru", 5, 2)];
  return { gunluk: { yenilenme_sn: 22320, gorevler: gun },
    haftalik: { yenilenme_sn: 367200, gorevler: hft, sandik: { tamam: 1, hedef: 3, alindi: false, alinabilir: false, sp: 75, joker: { tur: "soru_degistir", adet: 1 } } },
    alinabilir_sayi: 1 };
};

const json = (r, veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
const kesilenler = new Set(), taklitsiz = new Set(), okumalar = new Set();

async function rest(r, s, dil) {
  const req = r.request();
  const yol = req.url().split("/rest/v1/")[1].split("?")[0];
  const nesne = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
  if (yol.startsWith("rpc/")) {
    const fn = yol.slice(4);
    switch (fn) {
      case "profilim": return json(r, PROFIL(dil));
      case "elmas_durumum": return json(r, { bakiye: 120, reklam: null, hareketler: [] });
      case "elmas_paketleri": return json(r, ELMAS_PAKETLERI);
      case "kozmetik_katalogu": return json(r, KATALOG);
      case "envanterim": return json(r, []);
      case "reklam_durumum": return json(r, [{ bugun: 0, tavan: 5 }]);
      case "skill_dukkani": return json(r, { level: 7, skiller: [] });
      case "davet_kodum": return json(r, DAVET_KOD);
      case "davet_durumum": return json(r, s.davetBos ? DAVET_BOS : DAVET_DOLU);
      case "gorevlerim": return json(r, GOREVLER());
      case "sahip_mi": return json(r, false);
      case "yanlis_bankam": return json(r, []);
      default: taklitsiz.add(fn); return json(r, null);
    }
  }
  if (req.method() !== "GET" && req.method() !== "HEAD") { kesilenler.add(`${req.method()} ${yol}`); return json(r, nesne ? null : []); }
  okumalar.add(yol);
  if (yol === "oyun_ayarlari") return json(r, Object.entries(AYARLAR).map(([anahtar, deger]) => ({ anahtar, deger })));
  return json(r, nesne ? null : []);
}

// ---------------------------------------------------------------- sayfa içi ölçüm
const OLC = () => {
  const gor = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none" && +c.opacity > 0; };
  const ad = (e) => `${e.tagName.toLowerCase()}.${String(e.className).split(/\s+/).filter(Boolean).slice(0, 2).join(".")}`;
  const kok = document.querySelector("#root");
  // Kesik metin: … ile biten görünür metin ya da yatay taşan tek satırlık öğe
  const kesik = [];
  for (const e of kok.querySelectorAll("span, b, small, p, h1, h2, h3, button, a, strong, label")) {
    if (!gor(e) || e.children.length > 2) continue;
    const t = e.textContent.trim();
    if (!t) continue;
    const c = getComputedStyle(e);
    if (/…$|\.\.\.$/.test(t) && e.children.length === 0) kesik.push(`… ${ad(e)}: "${t.slice(0, 40)}"`);
    else if (c.textOverflow === "ellipsis" && e.scrollWidth > e.clientWidth + 1) kesik.push(`taşma ${ad(e)}: "${t.slice(0, 40)}"`);
  }
  const dugmeler = [...kok.querySelectorAll("button, a[href], [role=menuitem], [role=menuitemcheckbox], [role=tab]")].filter(gor);
  const binen = [];
  for (let i = 0; i < dugmeler.length; i++) for (let j = i + 1; j < dugmeler.length; j++) {
    const A = dugmeler[i], B = dugmeler[j];
    if (A.contains(B) || B.contains(A)) continue;
    const a = A.getBoundingClientRect(), b = B.getBoundingClientRect();
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w > 1 && h > 1) binen.push(`${ad(A)} × ${ad(B)}`);
  }
  const kucuk = dugmeler.filter((e) => { const r = e.getBoundingClientRect(); return r.height < 43.5 || r.width < 43.5; })
    .map((e) => `${ad(e)} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
  const sabit = [...document.querySelectorAll("#root *")].filter((e) => getComputedStyle(e).position === "fixed" && gor(e)).map(ad);
  // Panel zeminleri (renk rolü denetimi): ekranın ana panelinin hesaplanan zemin rengi
  const zemin = Object.fromEntries([".qt-dv", ".g-bulunamadi-kart", ".qt-dk-elmas-hero", ".a-avatar-menu", ".qt-dv-ust"]
    .map((s) => [s, document.querySelector(s)]).filter(([, e]) => e).map(([s, e]) => [s, getComputedStyle(e).backgroundColor]));
  return { vw: innerWidth, zemin, vh: innerHeight, yatayTasma: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    kesik: [...new Set(kesik)].slice(0, 12), binen: [...new Set(binen)].slice(0, 8), kucukHedef: [...new Set(kucuk)].slice(0, 10), sabit: [...new Set(sabit)] };
};

// ---------------------------------------------------------------- ekranlar
const EKRANLAR = [
  { ad: "menu", yol: "/", hazir: ".a-menu-dugme", eylem: async (p) => { await p.locator(".a-menu-dugme").first().click(); await p.waitForSelector("[role=menu]"); }, tam: false },
  { ad: "404", yol: "/boyle-bir-sayfa-yok", hazir: "h1, [role=heading]" },
  { ad: "dukkan-elmas", yol: "/joker?sekme=elmas", hazir: "#qt-panel-elmas section" },
  { ad: "dukkan-efekt", yol: "/joker?sekme=efekt", hazir: "#qt-panel-efekt li, #qt-panel-efekt button" },
  { ad: "profil-ayarlar", yol: "/profil?sekme=ayarlar", hazir: "#qt-panel-ayarlar section" },
  { ad: "profil-davet", yol: "/profil?sekme=davet", hazir: "#qt-dv-baslik, .qt-dv h2" },
  { ad: "profil-davet-bos", yol: "/profil?sekme=davet", hazir: "#qt-dv-baslik, .qt-dv h2", davetBos: true },
  { ad: "gorevler-haftalik", yol: "/gorevler", hazir: "#gk-sekme-haftalik", eylem: async (p) => { await p.locator("#gk-sekme-haftalik").click(); } },
];

async function ekranCek(ctx, e, [g, h], dil) {
  const s = { davetBos: !!e.davetBos };
  const sayfa = await ctx.newPage();
  const konsol = [];
  sayfa.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 160)); });
  sayfa.on("pageerror", (x) => konsol.push(`pageerror: ${String(x).slice(0, 160)}`));
  await sayfa.setViewportSize({ width: g, height: h });
  await sayfa.addInitScript(({ d, depo, oturum }) => {
    try { localStorage.setItem("bildim_dil", d); localStorage.setItem("bildim_tanitim", "1"); localStorage.setItem(depo, JSON.stringify(oturum)); } catch { /* kapalı */ }
  }, { d: dil, depo: DEPO, oturum: OTURUM });
  await sayfa.route(/\/auth\/v1\//, (r) => (/\/user/.test(r.request().url()) ? json(r, KULLANICI) : json(r, OTURUM)));
  await sayfa.route(/\/rest\/v1\//, (r) => rest(r, s, dil).catch(() => r.abort().catch(() => {})));
  await sayfa.route(/\/functions\/v1\//, (r) => json(r, {}));
  await sayfa.route(/\/storage\/v1\//, (r) => r.fulfill({ status: 404, body: "" }));
  await sayfa.route(/\/realtime\/|\.(mp3|ogg|wav|m4a)(\?|$)/, (r) => r.abort());
  const dosya = (ek = "") => path.join(CIKTI, `${e.ad}-${g}x${h}-${dil}${ek}.png`);
  const kayit = { ekran: e.ad, boyut: `${g}x${h}`, dil };
  try {
    await sayfa.goto(ADRES + e.yol, { waitUntil: "domcontentloaded" });
    await sayfa.waitForSelector(e.hazir, { timeout: 30000 });
    await sayfa.waitForTimeout(900);
    if (e.eylem) { await e.eylem(sayfa); await sayfa.waitForTimeout(900); }
    Object.assign(kayit, await sayfa.evaluate(OLC));
    await sayfa.screenshot({ path: dosya() });
    if (e.tam !== false) await sayfa.screenshot({ path: dosya("-tam"), fullPage: true });
  } catch (x) {
    kayit.hata = String(x.message || x).split("\n")[0].slice(0, 200);
    try { await sayfa.screenshot({ path: dosya("-HATA") }); } catch { /* kapalı */ }
  }
  kayit.konsolHata = [...new Set(konsol)].filter((m) => !/Failed to load resource|ERR_FAILED|net::/.test(m)).slice(0, 5);
  await sayfa.close();
  return kayit;
}

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: "block" });
const sonuclar = [];
let cikis = 0;
try {
  for (const e of EKRANLAR.filter((x) => !YALNIZ || YALNIZ.has(x.ad))) for (const b of BOYUTLAR) for (const d of DILLER) {
    const k = await ekranCek(baglam, e, b, d);
    sonuclar.push(k);
    const sorun = [k.yatayTasma > 0 && `taşma ${k.yatayTasma}`, k.kesik?.length && `kesik ${k.kesik.length}`, k.binen?.length && `örtüşme ${k.binen.length}`,
      k.kucukHedef?.length && `<44 ${k.kucukHedef.length}`, k.sabit?.length && `fixed ${k.sabit.length}`, k.konsolHata?.length && `konsol ${k.konsolHata.length}`].filter(Boolean);
    console.log(`  ${e.ad.padEnd(18)} ${k.boyut} ${d}: ${k.hata ? "HATA " + k.hata : sorun.length ? sorun.join(" · ") : "temiz"}`);
  }
} catch (x) { console.error("Betik hatası:", x); cikis = 1; }
finally { await baglam.close().catch(() => {}); await tarayici.close().catch(() => {}); }

fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify({ uretim: new Date().toISOString(), adres: ADRES, asama: ASAMA,
  kesilenYazmalar: [...kesilenler], taklitsizRpc: [...taklitsiz], tabloOkumalari: [...okumalar], ekranlar: sonuclar }, null, 1));
if (taklitsiz.size) console.log("\nTaklidi olmayan (null dönen) RPC'ler:", [...taklitsiz].join(", "));
console.log(`Ölçüm: tasarim/kucuk-ekranlar/${ASAMA}/olcum.json`);
process.exit(cikis);
