// Telefon denetimi (12 Eki 2026) — "lig" ajanı: Görevler · Lig/Sıralamalar · Turnuva lobisi · Sezon Yolu.
// TAKLİT VERİYLE (canlıya istek GİTMEZ): sahte oturum, /auth/v1 ve /rest/v1 tarayıcıda yanıtlanır; yazmalar kesilir. Misafir hesap AÇILMAZ.
// Desen: araclar/kucuk-ekranlar.mjs + bp-parlama-ekran.mjs (Sezon Yolu ödül tablosu migration 721'den).
// Kullanım: npx vite --port 5184 --strictPort (ayrı kabukta) · node araclar/telefon-12eki-lig.mjs [--adres=http://localhost:5184] [--yalniz=gorevler,lig,turnuva,sezon]
// Çıktı: tasarim/telefon-denetimi-12eki/lig-<ne>-390-tr.png / -360-en.png
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5184");
const YALNIZ = typeof ARG.yalniz === "string" ? new Set(ARG.yalniz.split(",")) : null;
const CIKTI = path.resolve("tasarim/telefon-denetimi-12eki");
fs.mkdirSync(CIKTI, { recursive: true });
const env = fs.readFileSync(".env", "utf8");
const SUPA = (env.match(/VITE_SUPABASE_URL=\s*"?([^"\s]+)/) || [])[1];
const DEPO = `sb-${new URL(SUPA).hostname.split(".")[0]}-auth-token`;

const BEN = "0c1a5100-0000-4000-8000-0000000c0c0c";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const EXP = Math.floor(Date.now() / 1000) + 7 * 86400;
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: BEN, role: "authenticated", aud: "authenticated", exp: EXP, is_anonymous: false })}.taklit`;
const KULLANICI = { id: BEN, aud: "authenticated", role: "authenticated", email: "deneme@ornek.com", is_anonymous: false, app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-09-01T00:00:00Z" };
const OTURUM = { access_token: JWT, token_type: "bearer", expires_in: 7 * 86400, expires_at: EXP, refresh_token: "taklit-yenileme", user: KULLANICI };
const PROFIL = (dil) => ({ id: BEN, gorunen_ad: "Deneme", username: "deneme", takma_ad: "Deneme", takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", sehir: "İstanbul",
  dil, puan: 1240, coin: 850, xp: 340, level: 7, misafir: false, gorunen_avatar: null, gorunum: null });
const U = (n) => `0c1a5100-0000-4000-8000-${String(n).padStart(12, "0")}`;
const iso = (ms = 0) => new Date(Date.now() + ms).toISOString();

// Görevler: günlükte hazır ödül YOK, haftalıkta 1 hazır (yönlendirme denenir); günlükte 15/50, 15/100 doğru cevap (tik çıkmamalı)
const G = (id, ad_tr, ad_en, zorluk, sayac, hedef, ilerleme, alindi = false) => ({ quest_id: id, ad_tr, ad_en, zorluk, sayac, hedef, parametre: {},
  ilerleme: Math.min(ilerleme, hedef), alindi, alinabilir: ilerleme >= hedef && !alindi, odul: { coin: zorluk ? 15 : 50, sp: zorluk ? 10 : 25 } });
const GOREVLER = { gunluk: { yenilenme_sn: 22320, gorevler: [G("g1", "3 maç oyna", "Play 3 matches", "kolay", "mac_oyna", 3, 1),
  G("g2", "50 soruyu doğru cevapla", "Answer 50 questions correctly", "orta", "dogru_soru", 50, 15),
  G("g3", "100 soruyu doğru cevapla", "Answer 100 questions correctly", "zor", "dogru_soru", 100, 15)] },
  haftalik: { yenilenme_sn: 367200, gorevler: [G("h1", "Bu hafta 15 maç oyna", "Play 15 matches this week", null, "mac_oyna", 15, 15),
    G("h2", "Düello'da 3 galibiyet", "Win 3 Duel matches", null, "duello_galibiyet", 3, 1),
    G("h3", "5 farklı kategoride doğru cevap", "Answer correctly in 5 categories", null, "farkli_kategori_dogru", 5, 2)],
  sandik: { tamam: 0, hedef: 3, alindi: false, alinabilir: false, sp: 75, joker: { tur: "soru_degistir", adet: 1 } } }, alinabilir_sayi: 1 };

// Sıralama: uzun adlar + uzun şehirler (eskiden "Ser…", "An…" kesiliyordu)
const ADLAR = ["Abdurrahmangazi_1923", "Çokuzunisimlioyuncu", "Mehmet Can Yıldırımoğlu", "Zeynep", "Ayşe", "Deneme", "Kerem", "Selin", "Burak", "Elif"];
const SEHIR = ["Kahramanmaraş", "Afyonkarahisar", "Şanlıurfa", "Ankara", "Eskişehir", "İstanbul", "Serik", "Antalya", "İzmir", "Bursa"];
const LIGLER = ["efsane", "elmas", "altin", "gumus", "bronz"];
const siralama = (lig) => Array.from({ length: 10 }, (_, i) => ({ sira: i + 1, user_id: i === 5 ? BEN : U(200 + i), gorunen_ad: ADLAR[i], gorunen_avatar: null, gorunum: null,
  puan: 3000 - i * 137, lig: lig ? "gumus" : LIGLER[i % 5], level: 3 + i * 4, ulke: "TR", sehir: SEHIR[i], ben: i === 5, bot: i === 8, grup_boyu: 25, yukselen: 5, dusen: 5,
  sezon_bitis: iso(3 * 86400e3) }));
const kart = (id) => { const i = Math.max(0, Number(id.slice(-3)) - 200); return { id, level: 3 + (i % 10) * 4, lig: LIGLER[i % 5], cerceve: i < 3 ? ["lig_efsane", "lig_elmas", "lig_altin"][i] : null, unvan: i % 2 ? "Serseri Bilgin" : null,
  koleksiyon_puani: 120, sezon_bp: i === 1, bp_parlama: false }; };

// Turnuva lobisi
const TURNUVA = { id: U(700), durum: "lobi", tarih: new Date().toISOString().slice(0, 10), seans: "20:00", aktif_soru: 0, soru_ids: [] };
const LOBI = Array.from({ length: 8 }, (_, i) => ({ tournament_id: TURNUVA.id, user_id: i === 2 ? BEN : U(200 + i), puan: 0, joined_at: iso(-i * 1000), terk_at: null,
  profil: { gorunen_ad: i === 2 ? "Deneme" : ADLAR[i], gorunen_avatar: null, gorunum: null, puan: 100 + i, level: 2 + i * 5 } }));

// Sezon Yolu
const sql = fs.readFileSync(path.resolve("supabase/migrations/20260612000721_sezon_yolu_oduller.sql"), "utf8");
const SATIR = /\(\s*(\d+),'(\w+)',\s*'(\w+)',\s*'(\{.*?\})',\s*(true|false),\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(null|'\w+')\)/g;
const TABLO = [...sql.matchAll(SATIR)].map((m) => ({ seviye: Number(m[1]), kol: m[2], tur: m[3], veri: JSON.parse(m[4]), placeholder: m[5] === "true",
  ad_tr: m[6].replace(/''/g, "'"), ad_en: m[7].replace(/''/g, "'"), nadirlik: m[8] === "null" ? null : m[8].slice(1, -1) }));
const ESIK = (i) => i * 100;
const sezon = () => {
  const seviye = 5;
  const oduller = TABLO.map((o) => ({ ...o, alindi: o.seviye <= 3, alinabilir: false }));
  for (const o of oduller) o.alinabilir = !o.alindi && o.seviye <= seviye;
  return { gorunur: true, acik: true, test: false, sahip: false, sezon: { id: 5, no: 1, baslangic: "2026-10-01", bitis: "2026-10-29", kalan_gun: 18 },
    sp: 540, seviye, seviye_sayisi: 28, esikler: Array.from({ length: 28 }, (_, i) => ESIK(i + 1)), onceki_esik: ESIK(5), sonraki_esik: ESIK(6),
    bp: { aktif: true, fiyat: 500, sp_carpan: 1.25 }, elmas: 1200, oduller, bonus_gorev: { hedef: 2, ilerleme: 1, sp: 20, alindi: false },
    final_unvan: { anahtar: "sezon_final", ad_tr: "Sezon Ustası", ad_en: "Season Master", kazanildi: false }, bugun_mac_sp: 60, gunluk_mac_tavan: 150,
    tasma: { acik: false, azami: 10, kazanilan: 0, alinan_ucretsiz: 0, alinan_ucretli: 0, alinabilir_ucretsiz: 0, alinabilir_ucretli: 0, sonraki_icin_sp: null,
      odul: { ucretsiz: { tur: "coin", miktar: 25 }, ucretli: { tur: "coin", miktar: 40 } } } };
};

const json = (r, veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
async function rest(r, dil) {
  const req = r.request();
  const url = decodeURIComponent(req.url());
  const yol = url.split("/rest/v1/")[1].split("?")[0];
  const nesne = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
  if (yol.startsWith("rpc/")) {
    let govde = {};
    try { govde = JSON.parse(req.postData() || "{}"); } catch { /* boş */ }
    const d = sezon();
    switch (yol.slice(4)) {
      case "profilim": return json(r, PROFIL(dil));
      case "oyuncu_kartlari": return json(r, (govde.p_idler ?? []).map(kart));
      case "sahip_mi": return json(r, false);
      case "gorevlerim": return json(r, GOREVLER);
      case "lig_grubum": return json(r, siralama(true));
      case "lig_siralama": case "koleksiyon_siralama": return json(r, siralama(false));
      case "sehir_lig_sirasi": return json(r, []);
      case "sezon_yolu_durumum": return json(r, d);
      case "sezon_ozetim": return json(r, { gorunur: true, sezon: d.sezon, seviye: d.seviye, seviye_sayisi: 28, sp: d.sp, onceki_esik: d.onceki_esik, sonraki_esik: d.sonraki_esik, bp: d.bp, alinabilir: 2 });
      case "bp_tanitim_gosterilsin_mi": return json(r, { goster: false });
      case "elmas_durumum": return json(r, { bakiye: 120, reklam: null, hareketler: [] });
      case "envanterim": case "yanlis_bankam": case "kozmetik_katalogu": return json(r, []);
      default: return json(r, null);
    }
  }
  if (req.method() !== "GET" && req.method() !== "HEAD") return json(r, nesne ? null : []);
  if (yol === "tournaments") return json(r, url.includes("durum=in.(aktif,lobi)") ? [TURNUVA] : []);
  if (yol === "tournament_players") return json(r, LOBI);
  return json(r, nesne ? null : []);
}

const OLC = () => {
  const gor = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none"; };
  const ad = (e) => `${e.tagName.toLowerCase()}.${String(e.className).split(/\s+/).filter(Boolean).slice(0, 2).join(".")}`;
  const kesik = [];
  for (const e of document.querySelectorAll("#root span, #root b")) {
    if (!gor(e) || e.children.length > 2 || !e.textContent.trim()) continue;
    const c = getComputedStyle(e);
    if (c.textOverflow === "ellipsis" && e.scrollWidth > e.clientWidth + 1) kesik.push(`${ad(e)}: "${e.textContent.trim().slice(0, 30)}"`);
  }
  const disari = [...document.querySelectorAll("#root [role=tab], #root .qt-cip")].filter(gor).filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 0.5 || r.left < -0.5; }).map(ad);
  return { yatayTasma: document.documentElement.scrollWidth - document.documentElement.clientWidth, kesik: [...new Set(kesik)].slice(0, 10), ekranDisi: disari };
};

const EKRANLAR = [
  { ad: "gorevler", yol: "/gorevler", hazir: ".gk-kart", adimlar: async (p, k, o) => {
    await p.waitForTimeout(900);
    o.noktaHaftalik = await p.locator("#gk-sekme-haftalik .gk-sekme-nokta").count();
    await k("gorevler-gunluk");
    await p.locator(".gv-toplu").click();
    await p.waitForTimeout(700);
    o.sekmeSonra = await p.locator(".gk-sekme--aktif").getAttribute("id");
    o.vurgulu = await p.locator(".gk-vurgu").count();
    await k("gorevler-yonlendirme");
    // en alta kaydır: "Yeni görevler … sonra" satırı alt düğmenin altında kalmasın (alt alanın üstü ile satırın altı arası, px)
    o.altBosluk = await p.evaluate(() => { const g = document.querySelector(".qt-sahne-govde"); g.scrollTop = g.scrollHeight;
      const y = document.querySelector(".gk-yenilenme").getBoundingClientRect(); const a = document.querySelector(".qt-sahne-alt").getBoundingClientRect(); return Math.round(a.top - y.bottom); });
    await p.waitForTimeout(300);
    await k("gorevler-alt");
  } },
  { ad: "lig", yol: "/siralama", hazir: ".lg-sekmeler", adimlar: async (p, k, o) => {
    await p.waitForTimeout(1200);
    await k("lig-ligim");
    await p.locator(".lg-sekmeler [role=tab]").nth(1).click();
    await p.waitForSelector(".lg-podyum");
    await p.waitForTimeout(1200);
    Object.assign(o, await p.evaluate(OLC));
    o.yongaSayisi = await p.locator(".lg-yongalar .qt-cip").count();
    // Podyum: çerçeve çiziminin (bütün alt öğeler) altı ile ad satırının üstü arası (negatif = biniyor)
    o.podyumBinme = await p.evaluate(() => [...document.querySelectorAll(".lg-podyum-dugme")].map((d) => {
      const ad = d.querySelector(".lg-podyum-ad").getBoundingClientRect().top;
      const madalya = d.querySelector(".lg-madalya");
      const av = madalya.nextElementSibling;
      const alt = Math.max(...[av, ...av.querySelectorAll("*")].map((e) => e.getBoundingClientRect().bottom));
      return Math.round(ad - alt);
    }));
    await k("lig-dunya");
  } },
  { ad: "turnuva", yol: "/turnuva", hazir: ".m1-tv-lobi-liste", adimlar: async (p, k, o) => {
    await p.waitForTimeout(1200);
    o.siraNo = await p.locator(".m1-tv-sira").count();
    o.etiket = await p.locator(".m1-tv-lobi-etiket").count();
    o.amblem = await p.locator(".m1-tv-lobi-etiket .qt-lig-amblem").count();
    await p.evaluate(() => document.querySelector(".m1-tv-lobi-liste").scrollIntoView({ block: "start" }));
    await p.waitForTimeout(300);
    await k("turnuva-lobi");
  } },
  { ad: "sezon", yol: "/sezon-yolu", hazir: ".sy-seviye2", adimlar: async (p, k, o) => {
    await p.waitForTimeout(2500);
    await p.evaluate(() => { document.querySelector(".qt-sahne-govde").scrollTop = 0; });
    await p.waitForTimeout(400);
    o.ustYukseklik = await p.evaluate(() => Math.round(document.querySelector(".qt-sahne-sabit").getBoundingClientRect().height));
    o.yolOnce = await p.evaluate(() => Math.round(document.querySelector(".qt-sahne-govde").getBoundingClientRect().height));
    await k("sezon-ust");
    await p.evaluate(() => { document.querySelector(".qt-sahne-govde").scrollTop = 400; });
    await p.waitForTimeout(500);
    o.ustKucuk = await p.evaluate(() => Math.round(document.querySelector(".qt-sahne-sabit").getBoundingClientRect().height));
    o.altYukseklik = await p.evaluate(() => Math.round(document.querySelector(".qt-sahne-alt").getBoundingClientRect().height));
    o.yolSonra = await p.evaluate(() => Math.round(document.querySelector(".qt-sahne-govde").getBoundingClientRect().height));
    await k("sezon-kaydirinca");
  } },
];

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({ hasTouch: true, deviceScaleFactor: 1, serviceWorkers: "block" });
let cikis = 0;
try {
  for (const e of EKRANLAR.filter((x) => !YALNIZ || YALNIZ.has(x.ad))) for (const [g, h, dil] of [[390, 844, "tr"], [360, 780, "en"]]) {
    const p = await baglam.newPage();
    const konsol = [];
    p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::/.test(m.text())) konsol.push(m.text().slice(0, 160)); });
    p.on("pageerror", (x) => konsol.push(`pageerror: ${String(x).slice(0, 160)}`));
    await p.setViewportSize({ width: g, height: h });
    await p.addInitScript(({ d, depo, oturum }) => { try { localStorage.setItem("bildim_dil", d); localStorage.setItem("bildim_tanitim", "1"); localStorage.setItem(depo, JSON.stringify(oturum)); } catch { /* */ } },
      { d: dil, depo: DEPO, oturum: OTURUM });
    await p.route(/\/auth\/v1\//, (r) => (/\/user/.test(r.request().url()) ? json(r, KULLANICI) : json(r, OTURUM)));
    await p.route(/\/rest\/v1\//, (r) => rest(r, dil).catch(() => r.abort().catch(() => {})));
    await p.route(/\/functions\/v1\//, (r) => json(r, {}));
    await p.route(/\/storage\/v1\//, (r) => r.fulfill({ status: 404, body: "" }));
    await p.route(/\/realtime\/|\.(mp3|ogg|wav|m4a)(\?|$)/, (r) => r.abort());
    const o = {};
    const k = (ne) => p.screenshot({ path: path.join(CIKTI, `lig-${ne.replace(/^lig-/, "")}-${g}-${dil}.png`) });
    try {
      await p.goto(ADRES + e.yol, { waitUntil: "domcontentloaded" });
      await p.waitForSelector(e.hazir, { timeout: 30000 });
      await e.adimlar(p, k, o);
      if (o.yatayTasma == null) Object.assign(o, await p.evaluate(OLC));
    } catch (x) { o.hata = String(x.message || x).split("\n")[0].slice(0, 200); cikis = 1; await k(`${e.ad}-HATA`).catch(() => {}); }
    o.konsol = [...new Set(konsol)].slice(0, 4);
    console.log(`${e.ad} ${g} ${dil}:`, JSON.stringify(o));
    await p.close();
  }
} finally { await tarayici.close(); }
process.exit(cikis);
