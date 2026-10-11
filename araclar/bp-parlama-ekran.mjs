// Battle Pass avatar parlaması (1061) ekran turu (11 Eki 2026) — TAKLİT VERİYLE ekran görüntüsü + ölçüm. CANLIYA HİÇ İSTEK GİTMEZ:
// oturum taklit (sahte JWT), /auth/v1 /rest/v1 /functions/v1 /storage/v1 tarayıcıda (page.route) yanıtlanır; taklidi olmayan RPC null,
// tablo okuması [] döner, yazmalar kesilir. Realtime ve ses dosyaları kapalı. Misafir hesap AÇILMAZ. r.fetch()/r.continue() YOK.
// Kalıp: araclar/kucuk-ekranlar.mjs. Taklit veri: klasik-mac-ekran (maç), mac-sonu-sp-ekran (maç sonu), sezon-yolu-v3-ekran (sezon),
// ana-lig-karti-ekran (lig_grubum_ozet).
//
// Senaryolar: bp (benim kartımda bp_parlama:true, sezon BP sahibi) · bpsiz (false). Başkaları karışık:
//   adı "P" ile başlayan oyuncular bp_parlama:true, "N" ile başlayanlar false; ben "Ömer" (harf avatarı "Ö") → DOM'da kim olduğu harften okunur.
// Ölçüm: kendi avatarımda .av-parla, P/N avatarlarında .av-parla, yatay taşma, konsol hatası, /prestij|prestige/i metni.
// Ayrıca 100 satırlık lig tablosu (hepsi bp_parlama:true): .av-parla toplamı / .av-parla--acik (kaydırma öncesi-sonrası) + kaba kare/sn.
//
// Kullanım:
//   npx vite --port 5188 --strictPort            # ayrı kabukta
//   node araclar/bp-parlama-ekran.mjs --adres=http://localhost:5188 [--dil=tr] [--boyut=390x844] [--yalniz=ana,profil] [--senaryo=bp]
// Çıktı: tasarim/bp-parlama/<senaryo>-<ekran>-<g>x<y>-<dil>.png + olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5188");
const DILLER = ARG.dil ? [String(ARG.dil)] : ["tr", "en"];
const BOYUTLAR = ARG.boyut ? [String(ARG.boyut).split("x").map(Number)] : [[390, 844], [360, 780]];
const YALNIZ = typeof ARG.yalniz === "string" ? new Set(ARG.yalniz.split(",")) : null;
const SENARYOLAR = ARG.senaryo ? [String(ARG.senaryo)] : ["bp", "bpsiz"];
const CIKTI = path.resolve("tasarim/bp-parlama");
fs.mkdirSync(CIKTI, { recursive: true });

const env = fs.readFileSync(".env", "utf8");
const SUPA = (env.match(/VITE_SUPABASE_URL=\s*"?([^"\s]+)/) || [])[1];
if (!SUPA) { console.error(".env › VITE_SUPABASE_URL yok"); process.exit(2); }
const DEPO = `sb-${new URL(SUPA).hostname.split(".")[0]}-auth-token`;

// ---------------------------------------------------------------- taklit oturum
const BEN = "0c1a5100-0000-4000-8000-0000000c0c0c";
const BEN_AD = "Ömer";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const EXP = Math.floor(Date.now() / 1000) + 7 * 86400;
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: BEN, role: "authenticated", aud: "authenticated", exp: EXP, is_anonymous: false })}.taklit`;
const KULLANICI = { id: BEN, aud: "authenticated", role: "authenticated", email: "deneme@ornek.com", is_anonymous: false, app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-09-01T00:00:00Z" };
const OTURUM = { access_token: JWT, token_type: "bearer", expires_in: 7 * 86400, expires_at: EXP, refresh_token: "taklit-yenileme", user: KULLANICI };
const PROFIL = (dil) => ({ id: BEN, gorunen_ad: BEN_AD, username: "omer", takma_ad: BEN_AD, takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", sehir: "İstanbul",
  dil, puan: 1240, coin: 850, xp: 340, level: 7, misafir: false, gorunen_avatar: null, gorunum: null });

// ---------------------------------------------------------------- taklit veri
const U = (n) => `0c1a5100-0000-4000-8000-${String(n).padStart(12, "0")}`;
const iso = (ms = 0) => new Date(Date.now() + ms).toISOString();
// Başkaları: tek sayılı kimlik → bp_parlama true (ad "P…"), çift → false (ad "N…")
const P_ADLAR = ["Pelin", "Pınar", "Polat", "Perihan", "Pamir", "Petek", "Poyraz", "Pakize"];
const N_ADLAR = ["Nil", "Nazlı", "Necati", "Nevzat", "Nur", "Nehir", "Nail", "Nermin"];
const kimAd = (n, hepsiP = false) => (hepsiP || n % 2 === 1 ? P_ADLAR : N_ADLAR)[Math.floor(n / 2) % 8] + (n > 16 ? ` ${n}` : "");
const ADLAR = new Map();   // user_id → ad (oyuncu_kartlari parla değerini addan türetir)
const ad = (id, a) => { ADLAR.set(id, a); return a; };
const parlaMi = (s, id) => (id === BEN ? s.bp : /^P/.test(ADLAR.get(id) ?? "") || (s.yuz && id !== BEN));

const kart = (s, id) => ({ id, level: 7, lig: "gumus", cerceve: null, cerceve_nadirlik: null, vs_karti: null, isim_efekti: null, zafer_efekti: null,
  unvan: null, koleksiyon_puani: 120, sezon_bp: parlaMi(s, id), bp_parlama: parlaMi(s, id) });

// Ana sayfa lig kartı (ana-lig-karti-ekran biçimi); satırlar bp_parlama taşır
const ligOzet = () => {
  const satirlar = Array.from({ length: 5 }, (_, i) => {
    const ben = i === 2, id = ben ? BEN : U(100 + i), a = ben ? BEN_AD : ad(id, kimAd(i + 1));
    return { sira: 6 + i, user_id: id, ad: a, avatar: null, puan: 640 - i * 61, ben, bp_parlama: ben ? null : /^P/.test(a) };
  });
  return { lig: "gumus", sira: 8, grup_boyu: 25, hafta_bitis: iso((2 * 24 + 1) * 3600e3), bolge: "orta", ust_lig: true,
    yukselme_cizgisine_fark: 75, ust_siraya_fark: 12, yukselme_sirasi: 5, dusme_sirasi: 21, satirlar };
};
// Lig tablosu (lig_grubum): 10 satır karışık, ya da 100 satır hepsi parlak
const ligGrubum = (s) => {
  const n = s.yuz ? 100 : 10;
  return Array.from({ length: n }, (_, i) => {
    const ben = i === 4, id = ben ? BEN : U(200 + i);
    const a = ben ? BEN_AD : ad(id, kimAd(i + 1, s.yuz));
    return { sira: i + 1, user_id: id, gorunen_ad: a, gorunen_avatar: null, gorunum: null, puan: 2000 - i * 17, lig: "gumus", ben,
      grup_boyu: n, sezon_bitis: iso(3 * 86400e3), bot: false };
  });
};

// Klasik maç (klasik-mac-ekran biçimi)
const MAC_ID = U(1), RAKIP = U(10);
const SORU_IDLERI = [U(21), U(22), U(23), U(24), U(25)];
const profil = (id, a, bot = false) => ({ id, gorunen_ad: ad(id, a), gorunen_avatar: null, gorunum: null, acik_bot: bot });
const macSatiri = () => ({ id: MAC_ID, durum: "aktif", senkron: true, basladi: true, aktif_soru: 0, soru_ids: SORU_IDLERI, oyuncu1: BEN, oyuncu2: RAKIP,
  oyuncu1_skor: 0, oyuncu2_skor: 0, oyuncu1_soru: 0, oyuncu2_soru: 0, jokersiz: false, dereceli: false, kategori: "cografya", kabul_at: iso(-60000),
  created_at: iso(-90000), joker_surum: 0, kazanan: null, terk_eden: null, baglanmayan: null, duraklatildi_at: null,
  p1: profil(BEN, BEN_AD), p2: profil(RAKIP, "Pelin") });
const nabiz = () => ({ durum: "aktif", basladi: true, baslangic: iso(-5000), sunucu_zamani: iso(0), duraklatildi: false, duraklama_sn: 0,
  ben_hazir: true, rakip_hazir: true, lobi_saniye: 0, hazir_sayisi: 2, toplam_oyuncu: 2, bekleyenler: [] });

// Sezon Yolu (sezon-yolu-v3-ekran biçimi; ödül tablosu migration 721'den)
const sql = fs.readFileSync(path.resolve("supabase/migrations/20260612000721_sezon_yolu_oduller.sql"), "utf8");
const SATIR = /\(\s*(\d+),'(\w+)',\s*'(\w+)',\s*'(\{.*?\})',\s*(true|false),\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(null|'\w+')\)/g;
const TABLO = [...sql.matchAll(SATIR)].map((m) => ({ seviye: Number(m[1]), kol: m[2], tur: m[3], veri: JSON.parse(m[4]), placeholder: m[5] === "true",
  ad_tr: m[6].replace(/''/g, "'"), ad_en: m[7].replace(/''/g, "'"), nadirlik: m[8] === "null" ? null : m[8].slice(1, -1) }));
const ESIK = (i) => i * 100;
function sezonDurum(bp) {
  const sp = 540, seviye = 5;
  const oduller = TABLO.map((o) => ({ ...o, alindi: o.seviye <= 4 && (o.kol === "ucretsiz" || bp), alinabilir: false }));
  for (const o of oduller) o.alinabilir = !o.alindi && o.seviye <= seviye && (o.kol === "ucretsiz" || bp);
  return { gorunur: true, acik: true, test: false, sahip: false, sezon: { id: 5, no: 1, baslangic: "2026-10-01", bitis: "2026-10-29", kalan_gun: 18 },
    sp, seviye, seviye_sayisi: 28, esikler: Array.from({ length: 28 }, (_, i) => ESIK(i + 1)), onceki_esik: ESIK(5), sonraki_esik: ESIK(6),
    bp: { aktif: bp, satin_alma_at: bp ? "2026-10-02T10:00:00Z" : null, fiyat: 500, sp_carpan: 1.25 }, elmas: 1200, oduller,
    bonus_gorev: { hedef: 2, ilerleme: 1, sp: 20, alindi: false },
    final_unvan: { anahtar: "sezon_final", ad_tr: "Sezon Ustası", ad_en: "Season Master", kazanildi: false },
    bugun_mac_sp: 60, gunluk_mac_tavan: 150,
    tasma: { acik: false, azami: 10, kazanilan: 0, alinan_ucretsiz: 0, alinan_ucretli: 0, alinabilir_ucretsiz: 0, alinabilir_ucretli: 0, sonraki_icin_sp: null,
      odul: { ucretsiz: { tur: "coin", miktar: 25 }, ucretli: { tur: "coin", miktar: 40 } } } };
}
const SP_YAKIN = { gorunur: true, kazanilan: 20, sp_once: 1141, sp_sonra: 1161, seviye_once: 11, seviye_sonra: 11, seviye_sayisi: 28,
  once_alt: 1100, once_ust: 1200, sonra_alt: 1100, sonra_ust: 1200, kalan: 39, atlandi: false, oduller: [] };

// Dükkân › Avatar: 7 ücretli avatar (son satır eksik kalsın → ızgara sonu denetlenir)
const AV = [["ahtapot-k13", "Ahtapot", "Octopus", "epik", "elmas", 150], ["ari-k14", "Arı", "Bee", "epik", "elmas", 150],
  ["asci-k23", "Aşçı", "Chef", "nadir", "coin", 750], ["astronot-k17", "Astronot", "Astronaut", "efsanevi", "elmas", 300],
  ["ayi-k08", "Ayı", "Bear", "nadir", "coin", 750], ["buyucu-k21", "Büyücü", "Wizard", "efsanevi", "elmas", 300],
  ["dedektif-k22", "Dedektif", "Detective", "epik", "elmas", 150, true]];
const AV_KATALOG = AV.map(([a, tr, en], i) => ({ url: `/avatars/pro/${a}.svg`, anahtar: a, ad_tr: tr, ad_en: en, tur: "pro", kullanabilir: true, sira: i + 1 }));
const AV_SAHIPLIK = AV.map(([a, , , nadirlik, edinme, fiyat, sahibim = false]) => ({ url: `/avatars/pro/${a}.svg`, anahtar: a, nadirlik, fiyat, edinme,
  sahibim, satilik: true }));
const GOREVLER = { gunluk: { yenilenme_sn: 22320, gorevler: [{ quest_id: "gun_mac_oyna_3", ad_tr: "3 maç oyna", ad_en: "Play 3 matches", zorluk: "kolay",
  sayac: "mac_oyna", hedef: 3, parametre: {}, ilerleme: 1, alindi: false, alinabilir: false, odul: { coin: 15, sp: 10 } }] },
  haftalik: { yenilenme_sn: 367200, gorevler: [], sandik: { tamam: 0, hedef: 3, alindi: false, alinabilir: false, sp: 75, joker: { tur: "soru_degistir", adet: 1 } } },
  alinabilir_sayi: 0 };

const json = (r, veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
const kesilenler = new Set(), taklitsiz = new Set(), okumalar = new Set();

async function rest(r, s, dil) {
  const req = r.request();
  const yol = req.url().split("/rest/v1/")[1].split("?")[0];
  const nesne = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
  const liste = (x) => json(r, nesne ? (x[0] ?? null) : x);
  if (yol.startsWith("rpc/")) {
    const fn = yol.slice(4);
    let govde = {};
    try { govde = JSON.parse(req.postData() || "{}"); } catch { /* boş */ }
    const d = sezonDurum(s.bp);
    switch (fn) {
      case "profilim": return json(r, PROFIL(dil));
      case "oyuncu_kartlari": return json(r, (govde.p_idler ?? []).map((id) => kart(s, id)));
      case "sahip_mi": return json(r, !!s.sahip);
      case "lig_grubum_ozet": return json(r, ligOzet());
      case "lig_grubum": return json(r, ligGrubum(s));
      case "lig_siralama": case "koleksiyon_siralama": return json(r, ligGrubum(s));
      case "sezon_yolu_durumum": return json(r, d);
      case "sezon_ozetim": return json(r, { gorunur: true, sezon: d.sezon, seviye: d.seviye, seviye_sayisi: 28, sp: d.sp, onceki_esik: d.onceki_esik,
        sonraki_esik: d.sonraki_esik, bp: d.bp, alinabilir: d.oduller.filter((o) => o.alinabilir).length });
      case "sezon_mac_sp_ozetim": return json(r, SP_YAKIN);
      case "bp_tanitim_gosterilsin_mi": return json(r, { goster: !!s.tanitim, sezon_no: 1, ucretli_odul_sayisi: 28, fiyat: 500, sp_carpan: 1.25 });
      case "elmas_durumum": return json(r, { bakiye: 120, reklam: null, hareketler: [] });
      case "kozmetik_katalogu": return json(r, []);
      case "envanterim": return json(r, [{ tur: "elli", adet: 2 }, { tur: "sure", adet: 1 }]);
      case "reklam_durumum": return json(r, [{ bugun: 0, tavan: 5 }]);
      case "yanlis_bankam": return json(r, []);
      case "avatar_katalogu_oyun": return json(r, AV_KATALOG);
      case "avatar_sahiplik_durumu": return json(r, AV_SAHIPLIK);
      case "avatar_kilitli_urller": return json(r, []);
      case "gorevlerim": return json(r, GOREVLER);
      case "mac_nabiz": return json(r, nabiz());
      case "get_match_question": return json(r, [{ question_id: U(900), soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"],
        soru_index: 0, baslangic: iso(-300), sunucu_zamani: iso(0) }]);
      case "soru_kategorisi": return json(r, "cografya");
      case "cift_mac_durumu": return json(r, [{ carpan: 1, sira: 1 }]);
      case "joker_mac_durumu": return json(r, [{ sinir: null, kullanilan: 0, ucretsiz_elli_kaldi: true, kisaltildi: false, kilitli: false, soruda_kullanildi: false,
        kullanim_sayilari: {}, tur_basi_sinir: 1, sunucu_zamani: iso(0), sis_bitis: null }]);
      case "joker_fiyatlari": return json(r, { elli: 10, sure: 20, soru_degistir: 30, zaman_baskisi: 25, sigorta: 15, cifte_puan: 15, ikinci_sans: 20 });
      case "coin_bakiyem": return json(r, [{ bakiye: 120 }]);
      case "skill_setim": return json(r, null);
      default: taklitsiz.add(fn); return json(r, null);
    }
  }
  if (req.method() !== "GET" && req.method() !== "HEAD") { kesilenler.add(`${req.method()} ${yol}`); return json(r, nesne ? null : []); }
  okumalar.add(yol);
  switch (yol) {
    case "matches": return s.mac ? liste([macSatiri()]) : liste([]);
    case "match_jokers": case "match_messages": return liste([]);
    case "oyun_ayarlari": return json(r, []);
    default: return liste([]);
  }
}

// ---------------------------------------------------------------- sayfa içi ölçüm
const OLC = () => {
  const harf = (e) => (e.classList.contains("avatar--harf") ? (e.firstChild?.nodeValue ?? "").trim().charAt(0) : (e.querySelector("img")?.alt ?? "").charAt(0).toUpperCase());
  const avatarlar = [...document.querySelectorAll("#root .avatar")];
  const grup = (h) => { const a = avatarlar.filter((e) => harf(e) === h); return { toplam: a.length, parla: a.filter((e) => e.querySelector(":scope > .av-parla")).length }; };
  const metin = document.body.innerText;
  const izgara = document.querySelector(".qt-dc-izgara");
  let izgaraBilgi = null;
  if (izgara) {
    const kolon = getComputedStyle(izgara).gridTemplateColumns.split(" ").filter(Boolean).length;
    const oge = izgara.children.length;
    const son = izgara.lastElementChild?.getBoundingClientRect();
    izgaraBilgi = { kolon, oge, sonSatirOge: kolon ? (oge % kolon || kolon) : null, sonAlt: son ? Math.round(son.bottom + scrollY) : null,
      sayfaAlt: Math.round(document.documentElement.scrollHeight) };
  }
  return {
    vw: innerWidth, yatayTasma: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ben: grup("Ö"), parlakBaskasi: grup("P"), sonukBaskasi: grup("N"),
    avParlaToplam: document.querySelectorAll(".av-parla").length, avParlaAcik: document.querySelectorAll(".av-parla--acik").length,
    prestijMetni: (metin.match(/[^\n]{0,30}(prestij|prestige)[^\n]{0,30}/i) || [null])[0],
    qtDcPrestij: document.querySelectorAll(".qt-dc-prestij").length,
    parlarSatiri: /Avatarın sezon boyunca parlar|Your avatar shines all season/.test(metin),
    izgara: izgaraBilgi,
  };
};

// ---------------------------------------------------------------- ekranlar
const EKRANLAR = [
  { ad: "ana", yol: "/", hazir: "a.as-lk" },
  { ad: "profil", yol: "/profil", hazir: "#root .avatar" },
  { ad: "siralama", yol: "/siralama", hazir: ".lg-satir" },
  { ad: "mac", yol: `/mac/${MAC_ID}`, hazir: ".m1-soru .qt-sik", mac: true },
  { ad: "mac-sonu", yol: "/mac-sonu-onizleme?arac=0", hazir: ".msk", sahip: true },
  { ad: "dukkan-avatar", yol: "/joker?sekme=avatar", hazir: ".qt-dc-izgara .qt-dc-oge" },
  { ad: "koleksiyon", yol: "/profil?sekme=koleksiyon", hazir: "#qt-panel-koleksiyon section, #qt-panel-koleksiyon button" },
  { ad: "sezon-satinal", yol: "/sezon-yolu", hazir: ".sy-bp-dugme, .sy-bp-aktif", yalnizSenaryo: "bpsiz",
    eylem: async (p) => { await p.locator(".sy-bp-dugme").first().click(); await p.waitForTimeout(400); } },
  { ad: "sezon", yol: "/sezon-yolu", hazir: ".sy-ust-kol-bp", yalnizSenaryo: "bp" },
  { ad: "bp-tanitim", yol: "/", hazir: ".bpt-kart", tanitim: true, yalnizSenaryo: "bpsiz" },
];

async function sayfaAc(ctx, s, [g, h], dil) {
  const sayfa = await ctx.newPage();
  const konsol = [];
  sayfa.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 160)); });
  sayfa.on("pageerror", (x) => konsol.push(`pageerror: ${String(x).slice(0, 160)}`));
  await sayfa.setViewportSize({ width: g, height: h });
  await sayfa.addInitScript(({ d, depo, oturum }) => {
    try { localStorage.setItem("bildim_dil", d); localStorage.setItem("bildim_tanitim", "1"); localStorage.setItem(depo, JSON.stringify(oturum)); } catch { /* kapalı */ }
  }, { d: dil, depo: DEPO, oturum: OTURUM });
  // Supabase alanına giden HER istek burada biter; hiçbiri sunucuya gitmez.
  await sayfa.route((u) => u.href.startsWith(SUPA), (r) => {
    const url = r.request().url();
    if (/\/auth\/v1\//.test(url)) return /\/user/.test(url) ? json(r, KULLANICI) : json(r, OTURUM);
    if (/\/rest\/v1\//.test(url)) return rest(r, s, dil).catch(() => r.abort().catch(() => {}));
    if (/\/functions\/v1\//.test(url)) return json(r, {});
    if (/\/storage\/v1\//.test(url)) return r.fulfill({ status: 404, body: "" });
    return r.abort();
  });
  await sayfa.route(/\.(mp3|ogg|wav|m4a)(\?|$)/, (r) => r.abort());
  // Realtime WebSocket'i de sunucuya bağlanmadan kapat (page.route WebSocket'i yakalamaz)
  if (typeof sayfa.routeWebSocket === "function") await sayfa.routeWebSocket(/realtime/, (ws) => ws.close());
  return { sayfa, konsol };
}
const temizKonsol = (k) => [...new Set(k)].filter((m) => !/Failed to load resource|ERR_FAILED|net::|WebSocket/.test(m)).slice(0, 6);

async function ekranCek(ctx, sen, e, boyut, dil) {
  const [g, h] = boyut;
  const s = { bp: sen === "bp", sahip: !!e.sahip, mac: !!e.mac, tanitim: !!e.tanitim };
  const { sayfa, konsol } = await sayfaAc(ctx, s, boyut, dil);
  const dosya = path.join(CIKTI, `${sen}-${e.ad}-${g}x${h}-${dil}.png`);
  const kayit = { senaryo: sen, ekran: e.ad, boyut: `${g}x${h}`, dil };
  try {
    await sayfa.goto(ADRES + e.yol, { waitUntil: "domcontentloaded" });
    await sayfa.waitForSelector(e.hazir, { timeout: 30000 });
    await sayfa.waitForTimeout(1200);
    if (e.eylem) { await e.eylem(sayfa); await sayfa.waitForTimeout(900); }
    Object.assign(kayit, await sayfa.evaluate(OLC));
    await sayfa.screenshot({ path: dosya });
  } catch (x) {
    kayit.hata = String(x.message || x).split("\n")[0].slice(0, 200);
    try { await sayfa.screenshot({ path: dosya.replace(/\.png$/, "-HATA.png") }); } catch { /* kapalı */ }
  }
  kayit.konsolHata = temizKonsol(konsol);
  await sayfa.close();
  // Değerlendirme
  const sorun = [];
  if (!kayit.hata) {
    if (kayit.ben.toplam && (kayit.ben.parla > 0) !== s.bp) sorun.push(`benim parlama ${kayit.ben.parla}/${kayit.ben.toplam} (beklenen ${s.bp ? "var" : "yok"})`);
    if (kayit.sonukBaskasi.parla) sorun.push(`bp_parlama:false olan ${kayit.sonukBaskasi.parla} avatar parlıyor`);
    if (kayit.parlakBaskasi.toplam && kayit.parlakBaskasi.parla < kayit.parlakBaskasi.toplam) sorun.push(`bp_parlama:true ${kayit.parlakBaskasi.parla}/${kayit.parlakBaskasi.toplam}`);
    if (kayit.yatayTasma > 0) sorun.push(`taşma ${kayit.yatayTasma}`);
    if (kayit.prestijMetni) sorun.push(`prestij metni: "${kayit.prestijMetni}"`);
    if (kayit.qtDcPrestij) sorun.push(`.qt-dc-prestij ${kayit.qtDcPrestij}`);
    if (/sezon-satinal|bp-tanitim/.test(e.ad) && !kayit.parlarSatiri) sorun.push("'parlar' satırı yok");
  } else sorun.push("HATA " + kayit.hata);
  if (kayit.konsolHata.length) sorun.push(`konsol ${kayit.konsolHata.length}`);
  kayit.sorun = sorun;
  kayit.gecti = sorun.length === 0;
  return kayit;
}

// 100 satır kaydırma ölçümü (hepsi bp_parlama:true)
async function yuzSatir(ctx, boyut, dil) {
  const [g, h] = boyut;
  const s = { bp: true, yuz: true };
  const { sayfa, konsol } = await sayfaAc(ctx, s, boyut, dil);
  const kayit = { ekran: "siralama-100", boyut: `${g}x${h}`, dil };
  try {
    await sayfa.goto(ADRES + "/siralama", { waitUntil: "domcontentloaded" });
    await sayfa.waitForFunction(() => document.querySelectorAll(".lg-satir").length >= 100, null, { timeout: 30000 });
    await sayfa.waitForTimeout(1500);
    const say = () => ({ satir: document.querySelectorAll(".lg-satir").length, toplam: document.querySelectorAll(".av-parla").length,
      acik: document.querySelectorAll(".av-parla--acik").length });
    kayit.once = await sayfa.evaluate(say);
    await sayfa.screenshot({ path: path.join(CIKTI, `bp-siralama100-${g}x${h}-${dil}.png`) });
    // Kaydır: 3 sn boyunca her karede sabit adım; rAF sayısı = kaba kare/sn
    kayit.kaydirma = await sayfa.evaluate(() => new Promise((coz) => {
      const sure = 3000, bas = performance.now(), hedef = document.documentElement.scrollHeight - innerHeight;
      let kare = 0, enUzun = 0, onceki = bas;
      const adim = (t) => {
        kare++; enUzun = Math.max(enUzun, t - onceki); onceki = t;
        const o = Math.min(1, (t - bas) / sure);
        window.scrollTo(0, hedef * (o < 0.5 ? o * 2 : 2 - o * 2));   // aşağı, sonra yarı yola geri
        if (t - bas < sure) requestAnimationFrame(adim);
        else coz({ kareSn: +(kare / ((t - bas) / 1000)).toFixed(1), enUzunKareMs: +enUzun.toFixed(1), kaydirilabilir: hedef });
      };
      requestAnimationFrame(adim);
    }));
    await sayfa.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.6));
    await sayfa.waitForTimeout(500);
    kayit.sonra = await sayfa.evaluate(say);
    await sayfa.screenshot({ path: path.join(CIKTI, `bp-siralama100-kaydirilmis-${g}x${h}-${dil}.png`) });
    kayit.gecti = kayit.once.toplam >= 100 && kayit.once.acik < 30 && kayit.sonra.acik < 30 && kayit.sonra.acik > 0;
  } catch (x) {
    kayit.hata = String(x.message || x).split("\n")[0].slice(0, 200);
    kayit.gecti = false;
  }
  kayit.konsolHata = temizKonsol(konsol);
  await sayfa.close();
  return kayit;
}

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: "block" });
const sonuclar = [], yuz = [];
let cikis = 0;
try {
  for (const sen of SENARYOLAR) for (const e of EKRANLAR.filter((x) => (!YALNIZ || YALNIZ.has(x.ad)) && (!x.yalnizSenaryo || x.yalnizSenaryo === sen)))
    for (const b of BOYUTLAR) for (const d of DILLER) {
      const k = await ekranCek(baglam, sen, e, b, d);
      sonuclar.push(k);
      const p = k.ben ? ` ben ${k.ben.parla}/${k.ben.toplam} · P ${k.parlakBaskasi.parla}/${k.parlakBaskasi.toplam} · N ${k.sonukBaskasi.parla}/${k.sonukBaskasi.toplam}` : "";
      console.log(`  ${sen.padEnd(5)} ${e.ad.padEnd(14)} ${k.boyut} ${d}:${p} → ${k.gecti ? "GEÇTİ" : k.sorun.join(" · ")}`);
    }
  if (!YALNIZ || YALNIZ.has("siralama-100")) for (const b of BOYUTLAR) {
    const k = await yuzSatir(baglam, b, "tr");
    yuz.push(k);
    console.log(`  100 satır ${k.boyut}: ${k.hata ? "HATA " + k.hata : `önce ${k.once.acik}/${k.once.toplam} açık · sonra ${k.sonra.acik}/${k.sonra.toplam} · ${k.kaydirma.kareSn} kare/sn (en uzun ${k.kaydirma.enUzunKareMs} ms)`} → ${k.gecti ? "GEÇTİ" : "KALDI"}`);
  }
} catch (x) { console.error("Betik hatası:", x); cikis = 1; }
finally { await baglam.close().catch(() => {}); await tarayici.close().catch(() => {}); }

fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify({ uretim: new Date().toISOString(), adres: ADRES,
  kesilenYazmalar: [...kesilenler], taklitsizRpc: [...taklitsiz], tabloOkumalari: [...okumalar], ekranlar: sonuclar, yuzSatir: yuz }, null, 1));
if (taklitsiz.size) console.log("\nTaklidi olmayan (null dönen) RPC'ler:", [...taklitsiz].join(", "));
console.log(`Geçen: ${sonuclar.filter((k) => k.gecti).length}/${sonuclar.length} · Ölçüm: tasarim/bp-parlama/olcum.json`);
process.exit(cikis);
