// Düello · Plan A (maç ekranı) + draft revizesi — ekran ölçümü, TAKLİT VERİYLE (sunucuya yazmaz).
// duello_* RPC'leri tarayıcıda taklit edilir (page.route); canlı DB'ye yazma yok.
// Ekranlar: draft (sıra bende / rakip seçiyor), saldırı (seçimsiz / seçili), savunan bekler, soru, tur sonu (+1, çalma anı,
// kaybettin), maç sonu. Boyutlar 390×844 · 390×664 · 360×640 × TR/EN (+ 360×640 hareket azaltma).
// Ölçer: yatay taşma 0 · dikey kaydırma 0 (tek ekran) · ≥ 44 px dokunma hedefi · kesik metin · konsol hatası ·
//        şerit: iki tarafta 5'er kategori ikonu (draft sonrası dolu), çalınca ikon karşıya geçer + soluk iz ·
//        yüzde kartın ÜZERİNDE · Saldır düğmesi kartların altında, ekranın dibinde değil · tur sonu tek cümle ·
//        vuruş efekti hamle anahtarıyla TEK SEFER (yeniden okumada yeniden oynamaz) · ses/titreşim tek sefer.
// Çıktı: <cikti>/*.png + olcum.json
// Kullanım: npm run dev -- --port 5188 · node araclar/duello-plan-a-ekran.mjs [--adres=http://localhost:5188] [--cikti=tasarim/duello-plan-a]
//           [--dil=tr] [--boy=390x664] [--yalniz-goruntu]   (--yalniz-goruntu: Plan A denetimlerini atla — eski ekranın görüntüsü)
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { ceviriToplayici } from "./ceviri-dom.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const OTURUM = path.resolve(typeof ARG.oturum === "string" ? ARG.oturum : ".arayuz-denetim-oturum.json");   // --oturum=dosya: kendi test hesabın
const CIKTI = path.resolve(ARG.cikti || "tasarim/duello-plan-a");
const YALNIZ_GORUNTU = Boolean(ARG["yalniz-goruntu"]);
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }

const ID = "0d0e1100-0000-4000-8000-00000000a1aa";
const RAKIP = "0d0e1100-0000-4000-8000-0000000000bb";
const K = ["bilim", "cografya", "edebiyat", "genel_kultur", "muzik", "sanat", "sinema", "spor", "tarih", "teknoloji"];
const BEN_K = ["bilim", "edebiyat", "muzik", "sinema", "tarih"];
const SORU = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], kategori: "cografya" };
const AYAR = { duello_secim_modu: true, duello_hakimiyet_esik: 7, duello_max_tur: 20, duello_secim_sn: 5, duello_puan_modu: "yeni",
  duello_puan_hedef: 12, duello_puan_kategori_yolu: 4, duello_puan_max_tur: 20, duello_ban_acik: false };

const SIRASI = (ben) => Array.from({ length: 10 }, (_, i) => (Math.floor((i + 1) / 2) % 2 === 0 ? RAKIP : ben));
// Açılış: seçim fazı, 5 seçim yapılmış (rakip 3 · ben 2), sıra bende.
function yeniDurum(ben) {
  const ilk = [["spor", RAKIP], ["bilim", ben], ["edebiyat", ben], ["sanat", RAKIP], ["sinema", RAKIP]];   // yılan: R B B R R → sıra 5 bende (×2)
  const sahiplik = Object.fromEntries(ilk);
  const secimler = ilk.map(([k, u], i) => ({ k, u, oto: false, sira: i + 1 }));
  return { ben, sahiplik, secimler, faz: "secim", saldiran: ben, tur: 3, kategori: null, puan: { [ben]: 3, [RAKIP]: 2 },
    kilitler: {}, sonHamle: null, bitisMs: 12000, yeniAn: Date.now(), durum: "aktif", kazanan: null };
}
function durum(st) {
  const simdi = Date.now();
  const bitis = new Date((st.yeniAn ?? simdi) + st.bitisMs).toISOString();
  const say = (u) => Object.values(st.sahiplik).filter((x) => x === u).length;
  const alinan = (u) => st.secimler.filter((s) => s.u !== u && st.sahiplik[s.k] === u).length;
  const sav = st.saldiran === st.ben ? RAKIP : st.ben;
  const hedefler = K.filter((k) => st.sahiplik[k] === sav && !(Number(st.kilitler[k] ?? 0) > 0));
  const oyuncu = (id, ad, i) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/basortulu-y04.svg" : null, gorunum: null,
    puan: st.puan[id], dogru: 0, profil: { oranlar: Object.fromEntries(K.map((k, j) => [k, j === 2 && i ? null : 30 + ((j * (i ? 23 : 17)) % 55)])) }, unvan: null });
  return {
    surum: 2, id: ID, durum: st.durum, dereceli: true, tur: st.tur, max_tur: 20, saldiri_sirasi: 0, uzatma: false,
    faz: st.faz, faz_bitis: bitis, sunucu_zamani: new Date(simdi).toISOString(), ben: st.ben,
    saldiran: st.faz === "secim" ? SIRASI(st.ben)[st.secimler.length] : st.saldiran, savunan: sav,
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
    sureler: { kategori: 15, ban: 7, secim: 5, cevap: 15, ek_sure: 5, zaman_baskisi_eksi: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 2000,
      gosterim_bas: new Date(new Date(bitis).getTime() - 15000).toISOString() },
    kazanan: st.kazanan, odul: null, ezeli: null, gecmis: st.durum === "bitti" ? [] : null, rovans: { isteyen: null, id: null, gecerli: false },
    kalkan: { acik: false, oyuncular: {}, aktif: null },
    ban: { acik: false, sure: 7, kategori: null, onceki: null, uygun: null },
    secim: st.faz === "secim"
      ? { acik: true, sira: st.secimler.length, toplam: 10, ilk_secen: RAKIP, sure: 5, secimler: st.secimler, kalan: K.filter((k) => !st.sahiplik[k]),
          sirasi: SIRASI(st.ben) }
      : { acik: true, sira: 10, toplam: 10, ilk_secen: RAKIP, sure: 5, sirasi: [], secimler: st.secimler, kalan: null },
  };
}

const OLC = () => {
  const gorunur = (el) => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const s = getComputedStyle(el); if (s.visibility === "hidden" || s.display === "none") return false; for (let e = el; e; e = e.parentElement) if (+getComputedStyle(e).opacity < 0.05) return false; return true; };
  const yol = (el) => { const c = (el.className && el.className.baseVal === undefined ? String(el.className) : "").trim().split(/\s+/).slice(0, 2).join("."); return el.tagName.toLowerCase() + (c ? "." + c : ""); };
  const tasan = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > window.innerWidth + 1; }).slice(0, 5).map(yol);
  const hedefler = [...document.querySelectorAll(".hk-kart:not(:disabled), .dsc-kart:not(:disabled), .hk-mac .qt-sik, .hk-cubuk-dugme")].filter(gorunur);
  const kucuk = hedefler.filter((e) => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map((e) => `${yol(e)} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
  const kesik = [...document.querySelectorAll(".hk-serit-ad, .hk-serit-puan, .hk-serit-hedef, .hk-grup-baslik, .hk-cubuk-yazi b, .hk-cubuk-yazi span, .hk-mesaj-yazi b, .hk-mesaj-yazi span, .hk-kart-ad, .hk-kart-yuzde, .dsc-kart-ad, .dsc-yuzde, .dsc-kart-damga, .hk-tur-sonu")]
    .filter((e) => gorunur(e) && e.scrollWidth > e.clientWidth + 1).map((e) => `${yol(e)}: ${e.textContent.trim().slice(0, 30)}`);
  const mac = document.querySelector(".hk-mac");
  const altKenar = mac ? Math.max(...[...mac.querySelectorAll("*")].filter((e) => gorunur(e) && !e.closest(".dsc-basla, .qt-tepki-panel, .hk-calma, .hk-vurus")).map((e) => e.getBoundingClientRect().bottom)) : 0;
  const kartlar = [...document.querySelectorAll(".hk-kart, .dsc-kart")].filter(gorunur).map((e) => e.getBoundingClientRect());
  const dugme = document.querySelector(".hk-cubuk-dugme");
  const dR = dugme && gorunur(dugme) ? dugme.getBoundingClientRect() : null;
  const kartAlt = kartlar.length ? Math.max(...kartlar.map((r) => r.bottom)) : 0;
  return {
    yatayTasma: document.documentElement.scrollWidth - window.innerWidth, tasan,
    dikeyTasma: Math.round(document.documentElement.scrollHeight - window.innerHeight),
    altKenar: Math.round(altKenar), ekran: window.innerHeight, kucuk, kesik,
    kartH: kartlar.length ? Math.round(Math.min(...kartlar.map((r) => r.height))) : 0,
    kartAlt: Math.round(kartAlt), dugmeUst: dR ? Math.round(dR.top) : null, dugmeAlt: dR ? Math.round(dR.bottom) : null,
    olu: Math.round(window.innerHeight - altKenar),
    mesaj: (document.querySelector(".hk-mesaj-yazi")?.innerText ?? "").replace(/\s+/g, " "),
    cubuk: (document.querySelector(".hk-cubuk")?.innerText ?? "").replace(/\s+/g, " "),
    serit: (document.querySelector(".hk-tahta")?.innerText ?? "").replace(/\s+/g, " "),
    benIkon: document.querySelectorAll(".hk-serit--ben .hk-serit-k:not(.hk-serit-k--iz)").length,
    rakipIkon: document.querySelectorAll(".hk-serit--rakip .hk-serit-k:not(.hk-serit-k--iz)").length,
    benIz: document.querySelectorAll(".hk-serit--ben .hk-serit-k--iz").length,
    rakipIz: document.querySelectorAll(".hk-serit--rakip .hk-serit-k--iz").length,
    bosKutu: document.querySelectorAll(".hk-alinan-yuva:not(.hk-alinan-yuva--dolu)").length,
    kartTasma: [...document.querySelectorAll(".hk-kart, .dsc-kart")].filter(gorunur).filter((k) => { const r = k.getBoundingClientRect(); return [...k.querySelectorAll("span, b")].some((e) => { const q = e.getBoundingClientRect(); return q.height > 0 && (q.bottom > r.bottom + 1 || q.top < r.top - 1) && !e.closest(".dsc-kart-damga, .hk-kart-ban"); }); }).map((k) => k.dataset.kategori),
  };
};

const CEVIRI = await ceviriToplayici();   // 7 Eki 2026: İngilizce koşuda maç içi/maç sonu Türkçe metin taraması
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
const sonuc = {};
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const DILLER = ARG.dil ? [ARG.dil] : ["tr", "en"];
const BOYLAR = ARG.boy ? [ARG.boy] : ["390x844", "390x664", "360x640"];
const KOSULAR = [];
for (const dil of DILLER) for (const boy of BOYLAR) KOSULAR.push({ dil, boy, azalt: false });
if (!ARG.dil && !ARG.boy) KOSULAR.push({ dil: "tr", boy: "360x640", azalt: true });

for (const { dil, boy, azalt } of KOSULAR) {
  const [w, h] = boy.split("x").map(Number);
  const durumDosya = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  durumDosya.origins = (durumDosya.origins || []).map((o) => ({ ...o, origin: kok,
    localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim", "qt_duello_durum_ipucu", "qt_duello_secim_ipucu", "qt_profil_onbellek"].includes(x.name)),
      { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" },
      { name: "qt_duello_durum_ipucu", value: "[{\"m\":\"a\",\"t\":[1,2,3]},{\"m\":\"b\",\"t\":[1,2,3]},{\"m\":\"c\",\"t\":[1,2,3]}]" },
      { name: "qt_duello_secim_ipucu", value: "[\"a\",\"b\",\"c\"]" }] }));
  const b = await tarayici.newContext({ storageState: durumDosya, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block",
    reducedMotion: azalt ? "reduce" : "no-preference" });
  // Ses ve titreşim çağrılarını say (gerçek çalma yok): titreşim navigator.vibrate, ses AudioBufferSourceNode.start / osilatör.
  await b.addInitScript(() => {
    window.__titresim = []; window.__ses = 0;
    try { Object.defineProperty(navigator, "vibrate", { configurable: true, value: (d) => { window.__titresim.push([Date.now(), JSON.stringify(d)]); return true; } }); } catch { /* yok */ }
    try { Object.defineProperty(navigator, "userActivation", { configurable: true, value: { hasBeenActive: true, isActive: true } }); } catch { /* yok */ }
    for (const C of [window.AudioBufferSourceNode, window.OscillatorNode]) {
      if (!C) continue; const asil = C.prototype.start;
      C.prototype.start = function (...a) { window.__ses++; return asil.apply(this, a); };
    }
  });
  const s = await b.newPage();
  const konsol = [];
  s.on("console", (m) => { if (m.type() === "error" && !/status of 400/.test(m.text())) konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };
  let st = null;
  await s.route(/\/rest\/v1\/(oyun_ayarlari|rpc\/)/, async (r) => {
    const req = r.request(); const u = req.url();
    const json = (veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
    try {
      if (u.includes("/rpc/duello_durum")) { if (!st) st = yeniDurum(jwtSub(req)); return json(durum(st)); }
      if (u.includes("/rpc/duello_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
      if (u.includes("/rpc/duello_baglanti")) return json({ kopuk: false });
      if (u.includes("/rpc/mac_sonu_ozet")) return json({ hazir: true, dokum: { toplam: { coin: 0 }, kalemler: [] }, gorevler: [], rozetler: [], terk: {} });
      if (/\/rpc\/duello_(kategori_sec|ban_sec|cevap|terk|ara|savunma_jokeri|saldiri_jokeri)/.test(u)) return json({ message: "Ölçüm aracı: yazma kapalı" }, 400);
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
  const etiket = `${w}x${h}-${dil}${azalt ? "-azalt" : ""}`;
  const kaydet = async (ad) => { await s.screenshot({ path: path.join(CIKTI, `${ad}-${etiket}.png`), fullPage: false }); if (dil === "en") await CEVIRI.tara(s, `${ad}-${etiket}`); };   // EN koşu: ekranda kalan Türkçe (ceviri-dom.mjs)
  const olc = async (ad) => { const o = await s.evaluate(OLC); sonuc[`${ad}-${etiket}`] = o; return o; };
  const ortak = (ad, o) => {
    ok(`${ad}: yatay taşma yok`, o.yatayTasma <= 0, JSON.stringify(o.tasan));
    ok(`${ad}: tek ekran (kaydırma yok, alt ${o.altKenar}/${o.ekran})`, o.dikeyTasma <= 1 && o.altKenar <= o.ekran + 1, `kaydırma ${o.dikeyTasma}`);
    ok(`${ad}: dokunma hedefi ≥ 44 px`, o.kucuk.length === 0, o.kucuk.slice(0, 4).join(" | "));
    ok(`${ad}: kesik metin yok`, o.kesik.length === 0, o.kesik.slice(0, 4).join(" | "));
    ok(`${ad}: kart içeriği kartın içinde`, o.kartTasma.length === 0, o.kartTasma.join(","));
  };
  const plan = (ad, kosul, ek) => { if (!YALNIZ_GORUNTU) ok(ad, kosul, ek); };
  const yenile = async (ms = 900) => { await s.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await s.waitForTimeout(ms); };
  const TR = dil === "tr";
  console.log(`\n== ${w}×${h} ${dil}${azalt ? " · hareket azaltma" : ""}`);
  try {
    // 1) Draft — sıra bende
    await s.goto(`${ADRES}/duello/${ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.waitForSelector(".dsc-kart", { timeout: 30000 });
    await s.waitForTimeout(1000);
    let o = await olc("01-draft-sira-bende");
    ortak("01-draft", o);
    // c481d3f3 (draft revizesi): kartta iki sayı ("Sen 81" · "Rakip 44"), % işareti yok
    plan("draft: yüzdeler kartın üzerinde, etiketli (Sen X · Rakip Y)", await s.locator(".dsc-kart:not(.dsc-kart--alindi) .dsc-yuzde--ben").count() === 10
      && (TR ? /Sen %?\d+/ : /You %?\d+%?/).test(await s.locator(".dsc-kart:not(.dsc-kart--alindi)").first().innerText()));
    plan("draft: konsol sıra bende ×2", /×2/.test(await s.locator(".dsc-konsol").innerText()) && await s.locator(".dsc-konsol--ben").count() === 1);
    await kaydet("01-draft-sira-bende");
    // draft — ben 2 seçim yaptım → rakip seçiyor (×2)
    st.secimler.push({ k: "cografya", u: st.ben, oto: false, sira: 6 }); st.sahiplik.cografya = st.ben;
    st.yeniAn = Date.now(); await yenile(1400);
    st.secimler.push({ k: "genel_kultur", u: st.ben, oto: false, sira: 7 }); st.sahiplik.genel_kultur = st.ben;
    st.yeniAn = Date.now(); await yenile(1400);
    o = await olc("03-draft-rakip");
    ortak("03-draft-rakip", o);
    plan("draft: konsol rakip seçiyor (kırmızı)", await s.locator(".dsc-konsol--rakip").count() === 1);
    await kaydet("03-draft-rakip");
    const dOnce = await s.evaluate(() => ({ t: window.__titresim.length, ses: window.__ses }));
    st.secimler.push({ k: "teknoloji", u: RAKIP, oto: false, sira: 8 }); st.sahiplik.teknoloji = RAKIP; st.yeniAn = Date.now();
    await s.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await s.waitForTimeout(250);
    await kaydet("02-draft-ucus");
    await s.waitForTimeout(1200);
    await yenile(600); await yenile(600);
    plan("draft: rakip seçimi damgası tek sefer (yeniden okumada yok)", await s.locator(".dsc-kart--damga-an").count() === 0);
    const dSonra = await s.evaluate(() => ({ t: window.__titresim.length, ses: window.__ses }));
    plan("draft: seçim sesi yeniden okumada tekrar çalmaz", dSonra.ses - dOnce.ses <= 2, JSON.stringify([dOnce, dSonra]));

    // seçim bitti → kategori fazı (saldıran ben)
    st.sahiplik = {}; for (const k of K) st.sahiplik[k] = BEN_K.includes(k) ? st.ben : RAKIP;
    st.secimler = K.map((k, i) => ({ k, u: st.sahiplik[k], oto: false, sira: i + 1 }));
    st.faz = "kategori"; st.tur = 3; st.saldiran = st.ben; st.yeniAn = Date.now(); st.bitisMs = 14000;
    await s.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await s.waitForSelector(".hk-kart", { timeout: 30000 });
    await s.waitForTimeout(2600);   // HÂKİMİYET BAŞLIYOR geçişi biter
    o = await olc("04-saldiri");
    ortak("04-saldiri", o);
    plan("şerit: boş 'Çalınan' kutuları yok", o.bosKutu === 0, String(o.bosKutu));
    plan("şerit: iki tarafta 5'er kategori ikonu (draft sonrası dolu)", o.benIkon === 5 && o.rakipIkon === 5, `${o.benIkon}/${o.rakipIkon}`);
    plan("şerit: 12 puan ve 4 kategori hedefi okunur", /12/.test(o.serit) && /4/.test(o.serit), o.serit);
    plan(`kart yüksekliği büyüdü (≥ ${h >= 800 ? 64 : 48} px; eski 44)`, o.kartH >= (h >= 800 ? 64 : 48), String(o.kartH));
    plan("kartlarda tek yüzde (benim) + ↑=↓", await s.locator(".hk-kart .hk-kart-yuzde").count() === 10);
    await kaydet("04-saldiri");
    await s.locator('.hk-kart--rakip[data-kategori="spor"]').click();
    await s.waitForTimeout(400);
    o = await olc("05-secili");
    ortak("05-secili", o);
    plan("Saldır düğmesi kartların hemen altında (≤ 24 px)", o.dugmeUst !== null && o.dugmeUst - o.kartAlt <= 24 && o.dugmeUst >= o.kartAlt - 1, `kart alt ${o.kartAlt}, düğme üst ${o.dugmeUst}`);
    plan("Saldır düğmesi ekranın dibine yapışık değil ya da ölü alan yok (alt boşluk ≤ 40 px)", o.olu <= 40, `ölü ${o.olu}`);
    await kaydet("05-secili");

    // 2) Savunan bekler
    st.saldiran = RAKIP; st.tur = 4; st.yeniAn = Date.now(); await yenile(1200);
    o = await olc("06-savunan");
    ortak("06-savunan", o);
    await kaydet("06-savunan");

    // 3) Soru (cevap) — ben saldırıyorum, rakibin kategorisi
    st.faz = "cevap"; st.saldiran = st.ben; st.tur = 5; st.kategori = "cografya"; st.yeniAn = Date.now(); st.bitisMs = 15000; await yenile(1400);
    o = await olc("07-soru");
    ortak("07-soru", o);
    await kaydet("07-soru");

    // 4) Tur sonu: ikisi doğru (+1 / +1)
    const hamle = (tur, kat, sal, dSal, dSav, tuttu, neden, kaz) => ({ surum: 2, tur, saldiri_sirasi: 0, uzatma: false, saldiran: sal, savunan: sal === st.ben ? RAKIP : st.ben,
      kategori: kat, soru_id: `s${tur}`, dogru_cevap: 1, altin_kazanan: null,
      cevaplar: { [sal]: { cevap: dSal ? 1 : 0, dogru: dSal, yanitsiz: false }, [sal === st.ben ? RAKIP : st.ben]: { cevap: dSav ? 1 : 0, dogru: dSav, yanitsiz: false } },
      hakimiyet: { eylem: "elinden_al", tuttu, neden, sahip_once: sal === st.ben ? RAKIP : st.ben, sahip_sonra: tuttu ? sal : (sal === st.ben ? RAKIP : st.ben), kilit: 0,
        baskin: false, kalkan: false, cakisma: false, puan_modu: true, hedef: 12, kategori_yolu: 4, kazanilan: kaz } });
    const titresimOnce = async () => s.evaluate(() => ({ t: window.__titresim.length, ses: window.__ses }));
    st.faz = "sonuc"; st.puan[st.ben] = 4; st.puan[RAKIP] = 3;
    st.sonHamle = hamle(5, "cografya", st.ben, true, true, false, "ikisi_dogru", { [st.ben]: 1, [RAKIP]: 1 }); st.yeniAn = Date.now(); st.bitisMs = 3000;
    await yenile(350);
    await kaydet("08-sonuc-ikisi-dogru-an");
    await s.waitForTimeout(700);
    o = await olc("08-sonuc-ikisi-dogru");
    ortak("08-sonuc-ikisi-dogru", o);
    plan("tur sonu tek cümle (ikisi doğru)", (TR ? /İkiniz de bildiniz/ : /both got it/i).test(o.mesaj), o.mesaj);
    const v1 = await titresimOnce();
    await yenile(700); await yenile(700);
    const v2 = await titresimOnce();
    plan("senkron: yeniden okumada vuruş/ses/titreşim tekrar etmez", v2.t === v1.t && v2.ses === v1.ses && await s.locator(".hk-vurus").count() <= 1, JSON.stringify([v1, v2]));
    await kaydet("08-sonuc-ikisi-dogru");

    // 5) Tur sonu: ben aldım (+2), çalma anı
    st.puan[st.ben] = 6; st.sahiplik.cografya = st.ben; st.kilitler = {};
    st.sonHamle = hamle(6, "cografya", st.ben, true, false, true, "tuttu", { [st.ben]: 2, [RAKIP]: 0 }); st.tur = 6; st.yeniAn = Date.now();
    await yenile(400);
    await kaydet("09-calma-an");
    await s.waitForSelector(".hk-calma", { state: "detached", timeout: 4000 }).catch(() => {});
    await s.waitForTimeout(300);
    o = await olc("09-calma-sonra");
    ortak("09-calma-sonra", o);
    plan("tur sonu tek cümle: 'Coğrafya'yı çaldın!'", (TR ? /Coğrafya'yı çaldın!/ : /You stole Geography!/).test(o.mesaj), o.mesaj);
    plan("çalınan ikon karşı şeride geçti (ben 6, rakip 4) + rakipte soluk iz", o.benIkon === 6 && o.rakipIkon === 4 && o.rakipIz === 1, `${o.benIkon}/${o.rakipIkon} iz ${o.rakipIz}`);
    await kaydet("09-calma-sonra");

    // 6) Tur sonu: kaybettin (rakip Tarih'i aldı)
    st.puan[RAKIP] = 5; st.sahiplik.tarih = RAKIP; st.saldiran = RAKIP;
    st.sonHamle = hamle(7, "tarih", RAKIP, true, false, true, "tuttu", { [st.ben]: 0, [RAKIP]: 2 }); st.tur = 7; st.yeniAn = Date.now();
    await yenile(400);
    await s.waitForSelector(".hk-calma", { state: "detached", timeout: 4000 }).catch(() => {});
    await s.waitForTimeout(300);
    o = await olc("10-kaybettin");
    ortak("10-kaybettin", o);
    plan("tur sonu tek cümle: 'Tarih'i kaybettin'", (TR ? /Tarih'i kaybettin/ : /You lost History/).test(o.mesaj), o.mesaj);
    plan("iki tarafta da soluk iz (ben: Tarih, rakip: Coğrafya)", o.benIz === 1 && o.rakipIz === 1, `${o.benIz}/${o.rakipIz}`);
    await kaydet("10-kaybettin");

    // 7) Maç sonu (ben kazandım, 12 puan)
    st.durum = "bitti"; st.faz = "bitti"; st.kazanan = st.ben; st.puan[st.ben] = 12; await yenile(5000);
    // 7 Eki 2026: Düello'ya özel maç sonu özeti — ele geçirilen kategoriler (sahnede, Detay açılmadan)
    await s.locator(".hk-ele").first().waitFor({ timeout: 6000 }).catch(() => {});
    const ele = {
      var: await s.locator(".msk-mod-ozet .hk-ele").count(),
      ben: await s.locator(".hk-ele-satir--ben").innerText().catch(() => ""),
      rakip: await s.locator(".hk-ele-satir--rakip").innerText().catch(() => ""),
    };
    ok("maç sonu: ele geçirilen kategoriler (Sen: Coğrafya 1/4 · Rakip: Tarih 1/4)", ele.var === 1
      && (TR ? /Coğrafya/ : /Geography/).test(ele.ben) && /1\/4/.test(ele.ben) && (TR ? /Tarih/ : /History/).test(ele.rakip) && /1\/4/.test(ele.rakip), JSON.stringify(ele));
    const eleO = await s.evaluate(() => { const e = document.querySelector(".hk-ele"); if (!e) return null; const r = e.getBoundingClientRect();
      const kesik = [...e.querySelectorAll(".hk-ele-k, .hk-ele-baslik")].filter((x) => x.scrollWidth > x.clientWidth + 1).length;
      return { sag: r.right, w: window.innerWidth, kesik, zemin: getComputedStyle(e).backgroundColor }; });
    ok("maç sonu özeti: taşma / kesik metin yok, açık zemin", eleO && eleO.sag <= eleO.w + 1 && eleO.kesik === 0 && !/rgb\((\d|[1-5]\d), /.test(eleO.zemin), JSON.stringify(eleO));
    await kaydet("11-mac-sonu-ozet");
    await s.getByRole("button", { name: TR ? /Detay/ : /Detail/ }).first().click({ timeout: 3000 }).catch(() => {});
    await s.waitForTimeout(500);
    await s.locator(".hk-son").scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
    await s.waitForTimeout(600);
    ok("maç sonu: son tahta puan şeridiyle (5+5 kategori)", await s.locator(".hk-son .hk-serit").count() === 2, String(await s.locator(".hk-son .hk-serit").count()));
    o = await olc("11-mac-sonu");
    ok("maç sonu: yatay taşma yok", o.yatayTasma <= 0, JSON.stringify(o.tasan));
    await kaydet("11-mac-sonu");

    ok("konsol hatası yok", konsol.length === 0, konsol.slice(0, 3).join(" | "));
  } catch (e) { kaldi++; console.log("  ✗ HATA", e.message.slice(0, 300)); await kaydet("hata").catch(() => {}); }
  await b.close();
}
await tarayici.close();
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(sonuc, null, 1));
console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
if (CEVIRI.ozet()) { kaldi++; console.log("  ✗ İngilizce koşuda ekranda Türkçe metin kaldı"); }
process.exit(kaldi ? 1 : 0);
