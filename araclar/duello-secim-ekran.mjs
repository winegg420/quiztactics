// Düello 960 · SEÇİM FAZI ekran ölçümü — TAKLİT VERİYLE (sunucuya yazmaz).
// duello_* RPC'leri tarayıcıda taklit edilir (page.route); seçim isteği taklit durumda işlenir (yılan sırası).
// Ölçer (360 ve 390 × 640, TR + EN, hareket azaltma): 10 kart tek ekranda (dikey kaydırma yok), yatay taşma yok,
// dokunma hedefi ≥ 44 px, sıra göstergesi / sayaç halkası / "Sen x/5 · Rakip y/5", son 2 sn gerilim, dokununca kart
// seçenin yuvasına UÇAR (mavi) ve yerinde "Aldın" kalır, rakibin seçimi canlı (kırmızı) uçar, "Otomatik seçildi",
// "Yeni" (verisiz) kartlar, HÂKİMİYET BAŞLIYOR geçişi, 7 yuvalı tahta kategori ve soru ekranında tek ekrana sığar,
// hareketi azaltmada uçuş yok, konsol hatası yok. Çıktı: tasarim/duello-secim/*.png + olcum.json
// Kullanım: npm run dev -- --port 5188 (başka kabukta) · node araclar/duello-secim-ekran.mjs --adres=http://localhost:5188 [--dil=tr] [--en=360]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/duello-secim");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }

const ID = "0d0e1100-0000-4000-8000-0000000960aa";
const RAKIP = "0d0e1100-0000-4000-8000-0000000000bb";
const K = ["bilim", "cografya", "edebiyat", "genel_kultur", "muzik", "sanat", "sinema", "spor", "tarih", "teknoloji"];
const SORU = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], kategori: "cografya" };
const AYAR = { duello_secim_modu: true, duello_hakimiyet_esik: 7, duello_max_tur: 20, duello_secim_sn: 5, duello_bos_mod_esik: 5, duello_bos_mod_max_tur: 16 };
const SIRA = (i) => Math.floor((i + 1) / 2) % 2;

// Taklit maç: ben ilk seçen (A). Oranlar: bende 3 kategori "Yeni" (verisiz), rakipte 2.
function yeniDurum(ben, { yeniOyuncu = false } = {}) {
  const oranBen = Object.fromEntries(K.map((k, i) => [k, yeniOyuncu || [2, 5, 9].includes(i) ? null : 35 + ((i * 17) % 50)]));
  const oranRakip = Object.fromEntries(K.map((k, i) => [k, [0, 6].includes(i) ? null : 30 + ((i * 23) % 55)]));
  return { ben, oranBen, oranRakip, faz: "secim", secimler: [], sahiplik: {}, bitisMs: 4800, tur: 1, kategori: null, saldiran: ben, ban: null };
}
function sirasi(st) { return Array.from({ length: 10 }, (_, i) => (SIRA(i) === 0 ? st.ben : RAKIP)); }
function sec(st, k, u, oto = false) {
  if (st.sahiplik[k]) return false;
  st.sahiplik[k] = u;
  st.secimler.push({ k, u, oto, sira: st.secimler.length + 1 });
  const n = st.secimler.length;
  if (n >= 10) { st.faz = "ban"; st.saldiran = RAKIP; st.tur = 1; }   // ilk saldıran = ilk seçmeyen (rakip); ben savunurum → ban
  else st.saldiran = sirasi(st)[n];
  st.yeniAn = Date.now();
  return true;
}
function durum(st) {
  const simdi = Date.now();
  const iso = (ms) => new Date(simdi + ms).toISOString();
  const bitis = new Date((st.yeniAn ?? simdi) + st.bitisMs).toISOString();
  const say = (u) => Object.values(st.sahiplik).filter((x) => x === u).length;
  const oyuncu = (id, ad, oranlar) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/basortulu-y04.svg" : null, gorunum: null, puan: 0, dogru: 0, profil: { oranlar }, unvan: null });
  return {
    surum: 2, id: ID, durum: "aktif", dereceli: true, tur: st.tur, max_tur: 20, saldiri_sirasi: 0, uzatma: false,
    faz: st.faz, faz_bitis: bitis, sunucu_zamani: new Date(simdi).toISOString(), ben: st.ben, saldiran: st.saldiran,
    savunan: st.saldiran === st.ben ? RAKIP : st.ben,
    hakimiyet: { acik: true, esik: 7, kilit_tur: 2, sahiplik: st.sahiplik, kilitler: {}, yuvalar: { [st.ben]: say(st.ben), [RAKIP]: say(RAKIP) },
      rol_joker: st.faz === "cevap" ? "kalkan" : null, rol_joker_hak: 1, avantaj_esik: 10 },
    oyuncular: [oyuncu(st.ben, "Sen", st.oranBen), oyuncu(RAKIP, "Deniz Yıldırımoğlu", st.oranRakip)],
    kategoriler: K, kategori: st.kategori,
    uygun_kategoriler: st.faz === "kategori" ? K : null,
    soru: st.faz === "cevap" ? SORU : null,
    cevap: st.faz === "cevap" ? { benim_bitis: bitis, rakip_bitis: bitis, ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false, elli_kapali: null, ikinci_sans_ilk_cevap: null } : null,
    son_hamle: null, kategori_sayim: {}, puan_degerleri: {}, tur_carpani: 1, carpanli_turlar: [],
    skill: { set: ["elli", "sure", "kalkan"], izinli: ["elli", "sure", "zaman_baskisi", "ikinci_sans", "soru_degistir", "baskin", "kalkan"], toplam_hak: 4, tur_basi_hak: 2, soru_basi_hak: 1,
      kullanilan: 0, sayilar: {}, bu_soruda: 0, rakip_bu_soruda: false, soru_degistir_kilit: null, envanter: { elli: 3, sure: 2, kalkan: 1 }, fiyatlar: {}, coin: 120 },
    sureler: { kategori: 15, ban: 7, secim: 5, cevap: 15, ek_sure: 5, zaman_baskisi_eksi: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 1500,
      gosterim_bas: new Date(new Date(bitis).getTime() - (st.faz === "secim" ? 5000 : st.faz === "ban" ? 7000 : 15000)).toISOString() },
    kazanan: null, odul: null, ezeli: null, gecmis: null, rovans: { isteyen: null, id: null, gecerli: false },
    kalkan: { acik: false, oyuncular: {}, aktif: null },
    ban: { acik: true, sure: 7, kategori: st.faz === "kategori" ? st.ban : null, onceki: null,
      uygun: st.faz === "ban" ? K.filter((k) => st.sahiplik[k] === st.ben ? false : true) : null },
    secim: { acik: true, sira: st.secimler.length, toplam: 10, ilk_secen: st.ben, sure: 5, sirasi: sirasi(st), secimler: st.secimler,
      kalan: st.faz === "secim" ? K.filter((k) => !st.sahiplik[k]) : null },
  };
}

const OLC = () => {
  const ayril = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const kar = (ust, alt) => ({ r: ust.r * ust.a + alt.r * (1 - ust.a), g: ust.g * ust.a + alt.g * (1 - ust.a), b: ust.b * ust.a + alt.b * (1 - ust.a), a: 1 });
  const zemin = (el) => { const z = []; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.backgroundImage && s.backgroundImage !== "none") return null; const c = ayril(s.backgroundColor); if (c && c.a > 0) { z.push(c); if (c.a >= 1) break; } } let t = { r: 255, g: 255, b: 255, a: 1 }; for (const c of z.reverse()) t = kar(c, t); return t; };
  const gorunur = (el) => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const s = getComputedStyle(el); if (s.visibility === "hidden" || s.display === "none") return false; for (let e = el; e; e = e.parentElement) if (+getComputedStyle(e).opacity < 0.05) return false; return true; };
  const yol = (el) => { const c = (el.className && el.className.baseVal === undefined ? String(el.className) : "").trim().split(/\s+/).slice(0, 2).join("."); return el.tagName.toLowerCase() + (c ? "." + c : ""); };
  const kontrast = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const gor = new Set();
  for (let n; (n = w.nextNode()); ) {
    const t = n.nodeValue.trim(); const el = n.parentElement;
    if (!t || !el || gor.has(el) || !gorunur(el)) continue;
    if (!el.closest(".dsc-kok, .dsc-konsol, .dsc-basla, .hk-tahta")) continue;
    if (el.closest(".dsc-kart--alindi")) continue;   // alınan kart bilerek soluk ("alındı")
    gor.add(el);
    const s = getComputedStyle(el); const on = ayril(s.color); if (!on) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    const arka = zemin(el); if (!arka) continue;
    const k = kar({ ...on, a: on.a * op }, arka);
    const oran = (Math.max(lum(k), lum(arka)) + 0.05) / (Math.min(lum(k), lum(arka)) + 0.05);
    const px = parseFloat(s.fontSize); const buyuk = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700);
    if (oran < (buyuk ? 3 : 4.5)) kontrast.push({ el: yol(el), metin: t.slice(0, 40), oran: +oran.toFixed(2), px });
  }
  const tasan = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > window.innerWidth + 1 && !e.closest(".dsc-ucan"); }).slice(0, 5).map(yol);
  const hedefler = [...document.querySelectorAll(".dsc-kart, .hk-kart, .hk-mac .qt-sik")].filter(gorunur);
  const kucuk = hedefler.filter((e) => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map((e) => `${yol(e)} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
  const kesik = [...document.querySelectorAll(".dsc-kart-ad, .dsc-yuzde, .dsc-kart-damga, .dsc-konsol b, .hk-say b")]
    .filter((e) => gorunur(e) && e.scrollWidth > e.clientWidth + 1).map((e) => `${yol(e)}: ${e.textContent.trim().slice(0, 30)}`);
  // üst üste binme: kartlar birbirine binmesin
  const kartlar = [...document.querySelectorAll(".dsc-kart")].map((e) => e.getBoundingClientRect());
  let binme = 0;
  for (let i = 0; i < kartlar.length; i++) for (let j = i + 1; j < kartlar.length; j++) {
    const a = kartlar[i], b = kartlar[j];
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) binme++;
  }
  const mac = document.querySelector(".hk-mac");
  const altKenar = mac ? Math.max(...[...mac.querySelectorAll("*")].filter((e) => gorunur(e) && !e.closest(".dsc-ucan, .dsc-basla, .qt-tepki-panel")).map((e) => e.getBoundingClientRect().bottom)) : 0;
  return {
    yatayTasma: document.documentElement.scrollWidth - window.innerWidth, tasan,
    dikeyTasma: Math.round(document.documentElement.scrollHeight - window.innerHeight),
    altKenar: Math.round(altKenar), ekran: window.innerHeight, kucuk, kontrast, kesik, binme,
    kart: document.querySelectorAll(".dsc-kart").length,
    metin: (document.querySelector(".hk-mac") ?? document.body).innerText.replace(/\s+/g, " ").slice(0, 500),
  };
};

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
const sonuc = {};
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const DILLER = ARG.dil ? [ARG.dil] : ["tr", "en"];
const GENISLIK = ARG.en ? [Number(ARG.en)] : [360, 390];
const KOSULAR = [];
for (const dil of DILLER) for (const w of GENISLIK) KOSULAR.push({ dil, w, azalt: false });
KOSULAR.push({ dil: "tr", w: 360, azalt: true });

for (const { dil, w, azalt } of KOSULAR) {
  const h = 640;
  const durumDosya = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  durumDosya.origins = (durumDosya.origins || []).map((o) => ({ ...o, origin: kok,
    localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim", "qt_duello_secim_ipucu"].includes(x.name)),
      { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" }] }));
  const b = await tarayici.newContext({ storageState: durumDosya, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block",
    reducedMotion: azalt ? "reduce" : "no-preference" });
  const s = await b.newPage();
  const konsol = [];
  s.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };
  let st = null;
  let secimIstegi = 0;
  await s.route(/\/rest\/v1\/(oyun_ayarlari|rpc\/)/, async (r) => {
    const req = r.request(); const u = req.url();
    const json = (veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
    try {
      if (u.includes("/rpc/duello_durum")) { if (!st) st = yeniDurum(jwtSub(req)); return json(durum(st)); }
      if (u.includes("/rpc/duello_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
      if (u.includes("/rpc/duello_baglanti")) return json({ kopuk: false });
      if (u.includes("/rpc/duello_kategori_sec")) {
        secimIstegi++;
        const k = JSON.parse(req.postData() || "{}").p_kategori;
        if (st.faz !== "secim" || st.saldiran !== st.ben) return json({ message: "Şu an seçim sırası sende değil" }, 400);
        if (!sec(st, k, st.ben)) return json({ message: "Bu kategori zaten alındı" }, 400);
        return r.fulfill({ status: 204, body: "" });
      }
      if (/\/rpc\/duello_(ban_sec|cevap|terk|ara|savunma_jokeri|saldiri_jokeri)/.test(u)) return json({ message: "Ölçüm aracı: yazma kapalı" }, 400);
      const y = await r.fetch();
      let m = (await y.text()).replace(/"dil":\s*"(tr|en)"/g, `"dil":"${dil}"`);
      if (u.includes("/rest/v1/oyun_ayarlari")) {
        const liste = JSON.parse(m).filter((x) => !(x.anahtar in AYAR));
        for (const [anahtar, deger] of Object.entries(AYAR)) liste.push({ anahtar, deger });
        m = JSON.stringify(liste);
      }
      await r.fulfill({ response: y, body: m });
    } catch { try { await r.continue(); } catch { /* sayfa kapandı */ } }
  });
  const etiket = `${w}-${dil}${azalt ? "-azalt" : ""}`;
  const kaydet = async (ad) => s.screenshot({ path: path.join(CIKTI, `${ad}-${etiket}.png`), fullPage: false });
  const olc = async (ad) => { const o = await s.evaluate(OLC); sonuc[`${ad}-${etiket}`] = o; return o; };
  const ortak = (ad, o) => {
    ok(`${ad}: yatay taşma yok`, o.yatayTasma <= 0, JSON.stringify(o.tasan));
    ok(`${ad}: tek ekran (kaydırma yok, alt ${o.altKenar}/${o.ekran})`, o.dikeyTasma <= 1 && o.altKenar <= o.ekran + 1, `kaydırma ${o.dikeyTasma}`);
    ok(`${ad}: dokunma hedefi ≥ 44 px`, o.kucuk.length === 0, o.kucuk.slice(0, 4).join(" | "));
    ok(`${ad}: kontrast`, o.kontrast.length === 0, JSON.stringify(o.kontrast.slice(0, 3)));
    ok(`${ad}: kesik metin yok`, o.kesik.length === 0, o.kesik.slice(0, 4).join(" | "));
  };
  const yenile = async () => { await s.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); };
  const TR = dil === "tr";
  console.log(`\n== ${w}×${h} ${dil}${azalt ? " · hareket azaltma" : ""}`);
  try {
    // 1) Seçim: sıra bende, ilk açılış
    await s.goto(`${ADRES}/duello/${ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.waitForSelector(".dsc-kart", { timeout: 30000 });
    await s.waitForTimeout(900);
    let o = await olc("01-sira-bende");
    ok("10 kart çizildi, birbirine binmiyor", o.kart === 10 && o.binme === 0, `${o.kart} kart · binme ${o.binme}`);
    ok("SENİN SIRAN + Sen 0/5 · Rakip 0/5 + SEÇİM başlığı", (TR ? /SENİN SIRAN/ : /YOUR PICK/).test(o.metin) && (TR ? /SEÇİM/ : /DRAFT/).test(o.metin), o.metin.slice(0, 200));
    ok("sayaç halkası + 10 seçim noktası + 7+7 yuva", await s.locator(".dsc-halka svg").count() === 1 && await s.locator(".dsc-pip").count() === 10 && await s.locator(".hk-yuva").count() === 14);
    ok("yüzdeler kartın üstünde (Sen %X / Rakip %Y), verisiz kart \"Yeni\"", await s.locator(".dsc-yuzde--ben").count() === 10 && (TR ? /Yeni/ : /New/).test(o.metin) && /%\d+|\d+%/.test(o.metin));
    ok("ilk Düello ipucu görünür", await s.locator(".dsc-ipucu").count() === 1);
    ortak("01-sira-bende", o);
    await kaydet("01-sira-bende");

    // 2) Dokun → kart yuvama uçar (mavi), yerinde "Aldın"
    const hedef = "tarih";
    await s.locator(`.dsc-kart[data-kategori="${hedef}"]`).click();
    let ucus = false;
    for (let i = 0; i < 25 && !ucus; i++) { ucus = await s.locator(".dsc-ucan--ben").count() > 0; if (!ucus) await s.waitForTimeout(40); }
    if (!azalt) {
      await s.waitForTimeout(150);
      await kaydet("02-ucus-ben");
      ok("seçim anı: kart seçenin (mavi) yuvasına uçuyor", ucus);
    } else ok("hareket azaltma: uçan kopya YOK", !ucus);
    await s.waitForTimeout(900);
    const benYuva = await s.locator(`.hk-taraf--ben .hk-yuva[data-kategori="${hedef}"]`).count();
    const alindi = await s.locator(`.dsc-kart--ben[data-kategori="${hedef}"]`).innerText().catch(() => "");
    ok("kart benim yuvama oturdu, ızgarada \"Aldın\"", benYuva === 1 && /ALDIN|Aldın|YOURS|Yours/.test(alindi) && await s.locator(".dsc-ucan").count() === 0, `${benYuva} · ${alindi}`);
    o = await olc("03-rakip-seciyor");
    ok("sıra rakipte: RAKİP SEÇİYOR + Sen 1/5", (TR ? /RAKİP SEÇİYOR/ : /OPPONENT PICKING/).test(o.metin) && /1\/5/.test(o.metin), o.metin.slice(0, 200));
    ok("rakip sırasında kartlar dokunulmaz", await s.locator(".dsc-kart:not([disabled])").count() === 0);
    ortak("03-rakip-seciyor", o);
    await kaydet("03-rakip-seciyor");

    // 3) Rakibin seçimi canlı uçar (kırmızı) — ikinci seçimi süre dolumuyla (otomatik)
    sec(st, "spor", RAKIP);
    await yenile();
    let rucus = false;
    for (let i = 0; i < 150 && !rucus; i++) { rucus = await s.locator(".dsc-ucan--rakip").count() > 0; if (!rucus) await s.waitForTimeout(40); }
    if (!azalt) { await s.waitForTimeout(120); await kaydet("04-ucus-rakip"); ok("rakibin seçimi canlı: kırmızı uçuş", rucus); }
    await s.waitForTimeout(1000);
    ok("rakip kartı rakip yuvasında, ızgarada \"Rakip aldı\"", await s.locator('.hk-taraf--rakip .hk-yuva[data-kategori="spor"]').count() === 1
      && /RAKİP ALDI|Rakip aldı|TAKEN|Taken/.test(await s.locator('.dsc-kart[data-kategori="spor"]').innerText()));
    sec(st, "bilim", RAKIP, true);
    await yenile();
    await s.waitForSelector(".dsc-konsol--oto", { timeout: 8000 }).catch(() => {});
    o = await olc("05-oto");
    ok("otomatik seçim geri bildirimi (\"Rakibin süresi doldu · Otomatik seçildi: Bilim\")", (TR ? /Otomatik seçildi: Bilim/ : /Auto-picked: Science/).test(o.metin), o.metin.slice(0, 200));
    await kaydet("05-oto");
    await s.waitForTimeout(1900);
    o = await olc("06-yine-ben");
    ok("A-B-B-A: sıra yine bende, Sen 1/5 · Rakip 2/5, sonra yine sen", (TR ? /SENİN SIRAN/ : /YOUR PICK/).test(o.metin) && /1\/5/.test(o.metin) && /2\/5/.test(o.metin) && (TR ? /sonra yine sen/ : /then you again/).test(o.metin), o.metin.slice(0, 200));

    // 4) Son 2 sn gerilim
    st.yeniAn = Date.now(); st.bitisMs = 1600;
    await yenile();
    await s.waitForTimeout(700);
    ok("son 2 sn: konsol + halka gerilim", await s.locator(".dsc-konsol--son").count() === 1 && await s.locator(".dsc-halka--son").count() === 1);
    await kaydet("07-son-2sn");
    st.bitisMs = 4800; st.yeniAn = Date.now();
    await yenile(); await s.waitForTimeout(400);

    // 5) Kalan seçimleri doldur → HÂKİMİYET BAŞLIYOR → ban (7 yuvalı tahta, 5-5)
    const kalan = () => K.filter((k) => !st.sahiplik[k]);
    while (st.secimler.length < 9) sec(st, kalan()[0], st.saldiran);
    await yenile(); await s.waitForTimeout(1500);
    ok("dokuzuncu seçimden sonra son seçim bende (10. = B? yılan: A-B-B-A-A-B-B-A-A-B)", st.saldiran === RAKIP);
    sec(st, kalan()[0], RAKIP);
    await yenile();
    await s.waitForSelector(".dsc-basla", { timeout: 8000 }).catch(() => {});
    await s.waitForTimeout(400);
    const baslaMetin = await s.locator(".dsc-basla").innerText().catch(() => "");
    await kaydet("08-hakimiyet-basliyor");
    ok("HÂKİMİYET BAŞLIYOR geçişi (5-5, 7'ye ulaşan kazanır)", (TR ? /HÂKİMİYET BAŞLIYOR/ : /BATTLE FOR CONTROL/).test(baslaMetin) && /5/.test(baslaMetin) && /7/.test(baslaMetin), baslaMetin);
    ok("geçiş sırasında savunanın ban girişi bekler (katmanlar üst üste binmez)", await s.locator(".hk-banan--giris").count() === 0);
    await s.waitForTimeout(2400);
    o = await olc("09-ban");
    ok("geçiş bitti → ban ekranı, tahta 5/7 · 5/7", await s.locator(".dsc-basla").count() === 0 && await s.locator(".hk-yuva--dolu").count() === 10 && /5\/7/.test(o.metin), o.metin.slice(0, 160));
    ortak("09-ban", o);
    await kaydet("09-ban");

    // 6) Kategori fazı (sıra bende, 7 yuvalı tahta + 10 kart iki grupta) ve soru ekranı tek ekran
    st.faz = "kategori"; st.saldiran = st.ben; st.tur = 2; st.ban = kalan()[0] ?? null; st.yeniAn = Date.now(); st.bitisMs = 12000;
    await yenile(); await s.waitForSelector(".hk-kart", { timeout: 8000 }); await s.waitForTimeout(1600);
    o = await olc("10-kategori");
    ok("kategori fazı: boş grup yok (rakibin 5 · senin 5)", await s.locator(".hk-grup").count() === 2 && await s.locator(".hk-kart").count() === 10);
    ortak("10-kategori", o);
    await kaydet("10-kategori");
    st.faz = "cevap"; st.kategori = Object.keys(st.sahiplik).find((k) => st.sahiplik[k] === RAKIP); st.saldiran = st.ben; st.yeniAn = Date.now();
    await yenile(); await s.waitForSelector(".qt-sik", { timeout: 8000 }); await s.waitForTimeout(1200);
    o = await olc("11-soru");
    ok("soru ekranı: küçük tahta 7+7, 4 şık", await s.locator(".hk-tahta--kucuk .hk-yuva").count() === 14 && await s.locator(".hk-mac .qt-sik").count() === 4);
    ortak("11-soru", o);
    await kaydet("11-soru");
  } catch (e) {
    kaldi++; console.log("  ✗ HATA:", e.message);
  }
  ok(`seçim isteği gerçekten gönderildi (${secimIstegi})`, secimIstegi >= 1);
  const ilgili = konsol.filter((k) => !/favicon|ERR_ABORTED|net::ERR_FAILED.*(avatars|ses)|realtime|websocket/i.test(k));
  sonuc[`konsol-${etiket}`] = ilgili;
  ok(`konsol hatası yok (${etiket})`, ilgili.length === 0, ilgili.slice(0, 4).join(" | "));
  await b.close();
}

// 7) Yeni oyuncu (verisiz): bütün kartlar "Yeni", boş görünüm yok
{
  const durumDosya = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  durumDosya.origins = (durumDosya.origins || []).map((o) => ({ ...o, origin: kok, localStorage: [...(o.localStorage || []), { name: "bildim_tanitim", value: "1" }] }));
  const b = await tarayici.newContext({ storageState: durumDosya, viewport: { width: 360, height: 640 }, hasTouch: true, serviceWorkers: "block" });
  const s = await b.newPage();
  let st = null;
  const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };
  await s.route(/\/rest\/v1\/rpc\/duello_(durum|giris|baglanti)/, async (r) => {
    const u = r.request().url();
    if (u.includes("durum")) { if (!st) { st = yeniDurum(jwtSub(r.request()), { yeniOyuncu: true }); st.saldiran = RAKIP; } return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(durum(st)) }); }
    if (u.includes("giris")) return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ durum: "aktif", rakip_geldi: true, kalan_sn: 0 }) });
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ kopuk: false }) });
  });
  console.log("\n== yeni oyuncu (verisiz) 360×640");
  await s.goto(`${ADRES}/duello/${ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await s.waitForSelector(".dsc-kart", { timeout: 30000 }).catch(() => {});
  await s.waitForTimeout(900);
  const yeni = await s.locator(".dsc-yuzde--ben.dsc-yuzde--yeni").count();
  ok("yeni oyuncu: 10 kartın hepsinde nötr \"Yeni\" (boş görünüm yok)", yeni === 10 && await s.locator(".dsc-kart").count() === 10, String(yeni));
  await s.screenshot({ path: path.join(CIKTI, "12-yeni-oyuncu-360.png") });
  await b.close();
}

await tarayici.close();
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(sonuc, null, 2));
console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı — görüntüler: tasarim/duello-secim/`);
if (kaldi) process.exitCode = 1;
