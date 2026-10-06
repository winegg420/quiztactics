// Düello 970 · PUAN MODU ekran ölçümü — TAKLİT VERİYLE (sunucuya yazmaz).
// duello_* RPC'leri tarayıcıda taklit edilir (page.route). Ölçer (360 ve 390 × 640, TR + EN, hareket azaltma):
//   · seçim fazında tahta 5'erli yuva şeridi (uçuş hedefi), seçimden sonra PUAN tahtası (Sen x/12 · Çalınan y/4)
//   · saldırıda yalnız rakibin kartları seçilebilir, kendi kartların pasif (disabled); "Rakibin kategorileri · saldır"
//   · ban fazında savunan yalnız kendi kartlarını banlar (rakibinkiler pasif)
//   · seçim özeti "tutarsa kategori senin · a→b", düğme "Saldır"; hedefe yakınken "Kazanırsın!"
//   · soru ekranında ince puan tahtası, 4 şık, tek ekran
//   · sonuç fazı: kim kaç puan aldı + kategori el değiştirdi mi (mesaj satırı); "+2" rozeti BİR KEZ oynar (yeniden
//     okumada animasyon baştan başlamaz), çalınan kategorinin ikonu "Çalınan" yuvasına oturur
//   · bitişe yakınlık uyarısı · yatay taşma yok · tek ekran · dokunma hedefi ≥ 44 px · kontrast · kesik metin · konsol hatası
// Çıktı: tasarim/duello-puan/*.png + olcum.json
// Kullanım: npm run dev -- --port 5188 (başka kabukta) · node araclar/duello-puan-ekran.mjs --adres=http://localhost:5188 [--dil=tr] [--en=360]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/duello-puan");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }

const ID = "0d0e1100-0000-4000-8000-0000000970aa";
const RAKIP = "0d0e1100-0000-4000-8000-0000000000bb";
const K = ["bilim", "cografya", "edebiyat", "genel_kultur", "muzik", "sanat", "sinema", "spor", "tarih", "teknoloji"];
const BEN_K = ["bilim", "edebiyat", "muzik", "sinema", "tarih"];
const SORU = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], kategori: "cografya" };
const AYAR = { duello_secim_modu: true, duello_hakimiyet_esik: 7, duello_max_tur: 20, duello_secim_sn: 5, duello_puan_modu: "yeni",
  duello_puan_hedef: 12, duello_puan_kategori_yolu: 4, duello_puan_max_tur: 20 };

// Açılış: seçim fazı, 4 seçim yapılmış (rakip 2 · ben 2), sıra bende — puan modunda tahta 5'erli yuva şeridi.
function yeniDurum(ben) {
  const ilk = [["spor", RAKIP], ["bilim", ben], ["edebiyat", ben], ["sanat", RAKIP]];
  const sahiplik = Object.fromEntries(ilk);
  const secimler = ilk.map(([k, u], i) => ({ k, u, oto: false, sira: i + 1 }));
  return { ben, sahiplik, secimler, faz: "secim", saldiran: ben, tur: 3, kategori: null, puan: { [ben]: 3, [RAKIP]: 2 },
    kilitler: {}, ban: "cografya", sonHamle: null, bitisMs: 12000, yeniAn: Date.now() };
}
function durum(st) {
  const simdi = Date.now();
  const bitis = new Date((st.yeniAn ?? simdi) + st.bitisMs).toISOString();
  const say = (u) => Object.values(st.sahiplik).filter((x) => x === u).length;
  const alinan = (u) => st.secimler.filter((s) => s.u !== u && st.sahiplik[s.k] === u).length;
  const sav = st.saldiran === st.ben ? RAKIP : st.ben;
  const hedefler = K.filter((k) => st.sahiplik[k] === sav && k !== st.ban && !(Number(st.kilitler[k] ?? 0) > 0));
  const oyuncu = (id, ad, i) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/basortulu-y04.svg" : null, gorunum: null,
    puan: st.puan[id], dogru: 0, profil: { oranlar: Object.fromEntries(K.map((k, j) => [k, 30 + ((j * (i ? 23 : 17)) % 55)])) }, unvan: null });
  return {
    surum: 2, id: ID, durum: "aktif", dereceli: true, tur: st.tur, max_tur: 20, saldiri_sirasi: 0, uzatma: false,
    faz: st.faz, faz_bitis: bitis, sunucu_zamani: new Date(simdi).toISOString(), ben: st.ben, saldiran: st.saldiran, savunan: sav,
    hakimiyet: { acik: true, esik: 7, kilit_tur: 2, sahiplik: st.sahiplik, kilitler: st.kilitler, yuvalar: { [st.ben]: say(st.ben), [RAKIP]: say(RAKIP) },
      rol_joker: st.faz === "cevap" ? (st.saldiran === st.ben ? "baskin" : "kalkan") : null, rol_joker_hak: 1, avantaj_esik: 10 },
    puan: { acik: true, hedef: 12, kategori_yolu: 4, puanlar: st.puan, alinan: { [st.ben]: alinan(st.ben), [RAKIP]: alinan(RAKIP) },
      baslangic: Object.fromEntries(st.secimler.map((s) => [s.k, s.u])) },
    oyuncular: [oyuncu(st.ben, "Sen", 0), oyuncu(RAKIP, "Deniz Yıldırımoğlu", 1)],
    kategoriler: K, kategori: st.kategori,
    uygun_kategoriler: st.faz === "kategori" ? hedefler : null,
    soru: ["cevap", "sonuc"].includes(st.faz) ? SORU : null,
    cevap: st.faz === "cevap" ? { benim_bitis: bitis, rakip_bitis: bitis, ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false, elli_kapali: null, ikinci_sans_ilk_cevap: null } : null,
    son_hamle: st.sonHamle, kategori_sayim: {}, puan_degerleri: {}, tur_carpani: 1, carpanli_turlar: [],
    skill: { set: ["elli", "sure", "kalkan"], izinli: ["elli", "sure", "zaman_baskisi", "ikinci_sans", "soru_degistir", "baskin", "kalkan"], toplam_hak: 4, tur_basi_hak: 2, soru_basi_hak: 1,
      kullanilan: 0, sayilar: {}, bu_soruda: 0, rakip_bu_soruda: false, soru_degistir_kilit: null, envanter: { elli: 3, sure: 2, kalkan: 1 }, fiyatlar: {}, coin: 120 },
    sureler: { kategori: 15, ban: 7, secim: 5, cevap: 15, ek_sure: 5, zaman_baskisi_eksi: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 1500,
      gosterim_bas: new Date(new Date(bitis).getTime() - (st.faz === "ban" ? 7000 : 15000)).toISOString() },
    kazanan: null, odul: null, ezeli: null, gecmis: null, rovans: { isteyen: null, id: null, gecerli: false },
    kalkan: { acik: false, oyuncular: {}, aktif: null },
    ban: { acik: true, sure: 7, kategori: st.faz === "kategori" ? st.ban : null, onceki: null,
      uygun: st.faz === "ban" ? K.filter((k) => st.sahiplik[k] === sav) : null },
    secim: st.faz === "secim"
      ? { acik: true, sira: st.secimler.length, toplam: 10, ilk_secen: RAKIP, sure: 5, secimler: st.secimler, kalan: K.filter((k) => !st.sahiplik[k]),
          sirasi: Array.from({ length: 10 }, (_, i) => (Math.floor((i + 1) / 2) % 2 === 0 ? RAKIP : st.ben)) }
      : { acik: true, sira: 10, toplam: 10, ilk_secen: RAKIP, sure: 5, sirasi: [], secimler: st.secimler, kalan: null },
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
    if (!el.closest(".hk-tahta, .hk-mesaj, .hk-cubuk, .hk-grup-baslik")) continue;
    if (el.closest(".hk-puan-arti")) continue;   // artış rozeti kısa süre görünür (kendi zemini koyu)
    gor.add(el);
    const s = getComputedStyle(el); const on = ayril(s.color); if (!on) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    const arka = zemin(el); if (!arka) continue;
    const k = kar({ ...on, a: on.a * op }, arka);
    const oran = (Math.max(lum(k), lum(arka)) + 0.05) / (Math.min(lum(k), lum(arka)) + 0.05);
    const px = parseFloat(s.fontSize); const buyuk = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700);
    if (oran < (buyuk ? 3 : 4.5)) kontrast.push({ el: yol(el), metin: t.slice(0, 40), oran: +oran.toFixed(2), px });
  }
  const tasan = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > window.innerWidth + 1; }).slice(0, 5).map(yol);
  const hedefler = [...document.querySelectorAll(".hk-kart:not(:disabled), .hk-mac .qt-sik")].filter(gorunur);
  const kucuk = hedefler.filter((e) => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map((e) => `${yol(e)} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
  const kesik = [...document.querySelectorAll(".hk-puan, .hk-alinan, .hk-grup-baslik, .hk-cubuk-yazi b, .hk-cubuk-yazi span, .hk-mesaj-yazi b, .hk-mesaj-yazi span")]
    .filter((e) => gorunur(e) && e.scrollWidth > e.clientWidth + 1).map((e) => `${yol(e)}: ${e.textContent.trim().slice(0, 30)}`);
  const tahta = document.querySelector(".hk-tahta");
  const ust = tahta ? [...tahta.querySelectorAll(".hk-ptaraf")].map((e) => e.getBoundingClientRect()) : [];
  const mac = document.querySelector(".hk-mac");
  const altKenar = mac ? Math.max(...[...mac.querySelectorAll("*")].filter((e) => gorunur(e) && !e.closest(".dsc-basla, .qt-tepki-panel")).map((e) => e.getBoundingClientRect().bottom)) : 0;
  return {
    yatayTasma: document.documentElement.scrollWidth - window.innerWidth, tasan,
    dikeyTasma: Math.round(document.documentElement.scrollHeight - window.innerHeight),
    altKenar: Math.round(altKenar), ekran: window.innerHeight, kucuk, kontrast, kesik,
    tahtaYukseklik: tahta ? Math.round(tahta.getBoundingClientRect().height) : 0, satir: ust.length,
    mesaj: (document.querySelector(".hk-mesaj-yazi")?.innerText ?? "").replace(/\s+/g, " "),
    cubuk: (document.querySelector(".hk-cubuk")?.innerText ?? "").replace(/\s+/g, " "),
    tahtaMetin: (tahta?.innerText ?? "").replace(/\s+/g, " "),
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
    localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim", "qt_duello_durum_ipucu"].includes(x.name)),
      { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" }, { name: "qt_duello_durum_ipucu", value: "[{\"m\":\"a\",\"t\":[1]},{\"m\":\"b\",\"t\":[1]},{\"m\":\"c\",\"t\":[1]}]" }] }));
  const b = await tarayici.newContext({ storageState: durumDosya, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block",
    reducedMotion: azalt ? "reduce" : "no-preference" });
  const s = await b.newPage();
  const konsol = [];
  s.on("console", (m) => { if (m.type() === "error" && !/status of 400/.test(m.text())) konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };
  let st = null;
  let saldiriIstegi = null;
  await s.route(/\/rest\/v1\/(oyun_ayarlari|rpc\/)/, async (r) => {
    const req = r.request(); const u = req.url();
    const json = (veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
    try {
      if (u.includes("/rpc/duello_durum")) { if (!st) st = yeniDurum(jwtSub(req)); return json(durum(st)); }
      if (u.includes("/rpc/duello_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
      if (u.includes("/rpc/duello_baglanti")) return json({ kopuk: false });
      if (u.includes("/rpc/duello_kategori_sec")) { saldiriIstegi = JSON.parse(req.postData() || "{}").p_kategori; return json({ message: "Ölçüm aracı: yazma kapalı" }, 400); }
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
  const yenile = async (ms = 900) => { await s.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await s.waitForTimeout(ms); };
  const TR = dil === "tr";
  console.log(`\n== ${w}×${h} ${dil}${azalt ? " · hareket azaltma" : ""}`);
  try {
    // 0) Seçim fazı (puan modu): tahta 5+5 yuva (uçuş hedefi), puan tahtası yok, kritik nabız yok
    await s.goto(`${ADRES}/duello/${ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.waitForSelector(".dsc-kart", { timeout: 30000 });
    await s.waitForTimeout(900);
    ok("seçim fazı: 5+5 yuva şeridi, 4 dolu, puan tahtası yok, kritik yok", await s.locator(".hk-yuva").count() === 10 && await s.locator(".hk-yuva--dolu").count() === 4
      && await s.locator(".hk-tahta--puan").count() === 0 && await s.locator(".hk-taraf--kritik").count() === 0);
    await kaydet("00-secim");
    // seçim bitti → kategori (puan tahtası)
    for (const k of K) if (!st.sahiplik[k]) st.sahiplik[k] = BEN_K.includes(k) ? st.ben : RAKIP;
    st.sahiplik.spor = RAKIP; st.sahiplik.sanat = RAKIP; st.sahiplik.bilim = st.ben; st.sahiplik.edebiyat = st.ben;
    st.secimler = K.map((k, i) => ({ k, u: st.sahiplik[k], oto: false, sira: i + 1 }));
    st.faz = "kategori"; st.yeniAn = Date.now(); st.bitisMs = 12000;
    await s.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));

    // 1) Kategori fazı, ben saldırıyorum
    await s.waitForSelector(".hk-kart", { timeout: 30000 });
    await s.waitForTimeout(900);
    let o = await olc("01-saldiri");
    ok("puan tahtası: iki satır, Sen 3/12 · Rakip 2/12 · Çalınan 0/4", o.satir === 2 && /3\s*\/12/.test(o.tahtaMetin) && /2\s*\/12/.test(o.tahtaMetin) && /0\/4/.test(o.tahtaMetin)
      && (TR ? /Çalınan/ : /Stolen/).test(o.tahtaMetin), o.tahtaMetin);
    ok("eski yuva şeridi yok (7 yuva kalktı)", await s.locator(".hk-yuva").count() === 0);
    ok("gruplar: Rakibin kategorileri · saldır / Senin kategorilerin · savun",
      (await s.locator(".hk-grup-baslik").allInnerTexts()).join("|").match(TR ? /saldır.*savun/i : /attack.*defend/i) !== null);
    const kendiPasif = await s.locator(".hk-kart--ben.hk-kart--pasif:disabled").count();
    const rakipAcik = await s.locator(".hk-kart--rakip:not(:disabled):not(.hk-kart--banli)").count();
    ok("kendi 5 kartın pasif (disabled), rakibin banlı olmayan 4 kartı seçilebilir", kendiPasif === 5 && rakipAcik === 4, `${kendiPasif} / ${rakipAcik}`);
    ok("kural satırı: 12 puan ya da 4 kategori", (TR ? /12 puan ya da 4 kategori/ : /12 points or 4 categories/).test(o.mesaj), o.mesaj);
    ortak("01-saldiri", o);
    await kaydet("01-saldiri");
    await s.locator('.hk-kart--ben[data-kategori="bilim"]').click({ force: true, timeout: 2000 }).catch(() => {});
    ok("kendi kartına dokunmak seçmez", !(await s.locator(".hk-kart--secili").count()));
    await s.locator('.hk-kart--rakip[data-kategori="spor"]').click();
    await s.waitForTimeout(300);
    o = await olc("02-secili");
    ok("alt çubuk: tutarsa kategori senin · 3→5, düğme Saldır", (TR ? /tutarsa kategori senin · 3→5/ : /it.s yours · 3→5/).test(o.cubuk) && (TR ? /Saldır/ : /Attack/).test(o.cubuk), o.cubuk);
    await s.locator(".hk-cubuk-dugme").click();
    await s.waitForTimeout(400);
    ok("Saldır → istek rakibin kategorisiyle gider", saldiriIstegi === "spor", String(saldiriIstegi));
    ortak("02-secili", o);
    await kaydet("02-secili");

    // 2) Hedefe yakın: "Kazanırsın!" + uyarı
    st.puan[st.ben] = 10; st.puan[RAKIP] = 11; await yenile();
    await s.locator('.hk-kart--rakip[data-kategori="spor"]').click();
    await s.waitForTimeout(300);
    o = await olc("03-kritik");
    ok("hedefe yakın: Kazanırsın!", (TR ? /Kazanırsın/ : /win/i).test(o.cubuk), o.cubuk);
    ok("rakip bitişe yakın: tahta kritik", await s.locator(".hk-taraf--rakip.hk-taraf--kritik").count() === 1);
    await kaydet("03-kritik");
    st.puan[st.ben] = 3; st.puan[RAKIP] = 2;

    // 3) Ban: ben savunuyorum → yalnız kendi kartlarım banlanabilir
    st.faz = "ban"; st.saldiran = RAKIP; st.tur = 4; st.ban = null; st.yeniAn = Date.now(); st.bitisMs = 7000; await yenile(1400);
    o = await olc("04-ban");
    ok("ban: kendi 5 kartın seçilebilir, rakibin kartları pasif", await s.locator(".hk-kart--ben:not(:disabled)").count() === 5 && await s.locator(".hk-kart--rakip.hk-kart--pasif").count() === 5);
    ortak("04-ban", o);
    await kaydet("04-ban");

    // 4) Soru (cevap) fazı — ben saldırıyorum, rakibin kategorisi
    st.faz = "cevap"; st.saldiran = st.ben; st.tur = 5; st.kategori = "cografya"; st.yeniAn = Date.now(); st.bitisMs = 15000; await yenile(1200);
    o = await olc("05-soru");
    ok("soru ekranı: ince puan tahtası + 4 şık", await s.locator(".hk-tahta--puan.hk-tahta--kucuk").count() === 1 && await s.locator(".hk-mac .qt-sik").count() === 4);
    ortak("05-soru", o);
    await kaydet("05-soru");

    // 5) Sonuç: ben aldım (+2), kategori el değiştirdi
    const hamle = (tur, kat, sal, dSal, dSav, tuttu, neden, kaz) => ({ surum: 2, tur, saldiri_sirasi: 0, uzatma: false, saldiran: sal, savunan: sal === st.ben ? RAKIP : st.ben,
      kategori: kat, soru_id: `s${tur}`, dogru_cevap: 1, altin_kazanan: null,
      cevaplar: { [sal]: { cevap: dSal ? 1 : 0, dogru: dSal, yanitsiz: false }, [sal === st.ben ? RAKIP : st.ben]: { cevap: dSav ? 1 : 0, dogru: dSav, yanitsiz: false } },
      hakimiyet: { eylem: "elinden_al", tuttu, neden, sahip_once: sal === st.ben ? RAKIP : st.ben, sahip_sonra: tuttu ? sal : (sal === st.ben ? RAKIP : st.ben), kilit: tuttu ? 2 : 0,
        baskin: false, kalkan: false, cakisma: false, puan_modu: true, hedef: 12, kategori_yolu: 4, kazanilan: kaz } });
    st.faz = "sonuc"; st.sahiplik.cografya = st.ben; st.kilitler = { cografya: 2 }; st.puan[st.ben] = 5;
    st.sonHamle = hamle(5, "cografya", st.ben, true, false, true, "tuttu", { [st.ben]: 2, [RAKIP]: 0 }); st.yeniAn = Date.now(); st.bitisMs = 3000;
    await yenile(500);
    // 990: kategori çalma anı (~1,8 sn) — puan/ikon/+2 kart inince gelir; ölçüm an bittikten sonra
    await s.waitForSelector(".hk-calma", { state: "detached", timeout: 4000 }).catch(() => {});
    o = await olc("06-sonuc-aldin");
    ok("sonuç: 'rakipten sana geçti!' + 'Sen +2 · Rakip +0 · … el değiştirdi'", (TR ? /Coğrafya rakipten sana geçti!/ : /Geography moved from your opponent to you!/).test(o.mesaj) && (TR ? /Sen \+2 · Rakip \+0 · Coğrafya el değiştirdi/ : /You \+2 · Opponent \+0 · Geography changed hands/).test(o.mesaj), o.mesaj);
    ok("çalınan kategori ikonu Çalınan yuvasına oturdu (1/4)", await s.locator(".hk-taraf--ben .hk-alinan-yuva--dolu").count() === 1 && /1\/4/.test(o.tahtaMetin), o.tahtaMetin);
    ok("+2 rozeti bende, rakipte rozet yok", await s.locator(".hk-taraf--ben .hk-puan-arti").count() === 1 && await s.locator(".hk-taraf--rakip .hk-puan-arti").count() === 0);
    const animOnce = await s.evaluate(() => { const e = document.querySelector(".hk-puan-arti"); window.__arti = e; const a = e?.getAnimations?.()[0]; return { t: a ? a.startTime : null, ad: e ? getComputedStyle(e).animationName : null }; });
    await yenile(700);
    const animSonra = await s.evaluate(() => { const e = document.querySelector(".hk-puan-arti"); const a = e?.getAnimations?.()[0]; return { ayni: e === window.__arti, t: a ? a.startTime : null }; });
    ok("senkron: yeniden okumada +2 rozeti yeniden oynamaz (aynı öğe, aynı animasyon başlangıcı)",
      azalt ? animSonra.ayni : (animSonra.ayni && animOnce.t !== null && animSonra.t === animOnce.t), JSON.stringify([animOnce, animSonra]));
    ortak("06-sonuc-aldin", o);
    await kaydet("06-sonuc-aldin");

    // 6) Sonuç: ikisi doğru (+1/+1), el değişmez · rakip saldırdı, ben savundum (+1)
    st.puan[st.ben] = 6; st.puan[RAKIP] = 3; st.saldiran = RAKIP;
    st.sonHamle = hamle(6, "muzik", RAKIP, true, true, false, "ikisi_dogru", { [st.ben]: 1, [RAKIP]: 1 }); await yenile(600);
    o = await olc("07-ikisi-dogru");
    ok("sonuç: İkiniz de bildiniz · Sen +1 · Rakip +1 · kategori el değiştirmedi", (TR ? /İkiniz de bildiniz.*Sen \+1 · Rakip \+1 · kategori el değiştirmedi/ : /both got it.*You \+1 · Opponent \+1 · category stays/i).test(o.mesaj), o.mesaj);
    await kaydet("07-ikisi-dogru");
    st.puan[st.ben] = 7;
    st.sonHamle = hamle(7, "muzik", RAKIP, false, true, false, "saldiran_yanlis", { [st.ben]: 1, [RAKIP]: 0 }); await yenile(600);
    o = await olc("08-savundun");
    ok("sonuç: Savundun! +1", (TR ? /Savundun! \+1/ : /You defended! \+1/).test(o.mesaj), o.mesaj);
    ortak("08-savundun", o);
    await kaydet("08-savundun");

    ok("konsol hatası yok", konsol.length === 0, konsol.slice(0, 3).join(" | "));
  } catch (e) { kaldi++; console.log("  ✗ HATA", e.message.slice(0, 300)); await kaydet("hata").catch(() => {}); }
  await b.close();
}
await tarayici.close();
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(sonuc, null, 1));
console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
