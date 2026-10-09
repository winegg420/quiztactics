// Düello v4 · TEK ARENA ekran ölçümü — TAKLİT VERİYLE (sunucuya yazmaz; duello_* RPC'leri tarayıcıda taklit edilir).
// Anlar: giriş (3-2-1) · nötr soru · KONTROL SENDE · kart 1/2 RAKİBE GÖNDER (dokun → damga → istek) · kart 2/2 KENDİNE SEÇ
// · bekleyen (RAKİP SEÇİYOR, rakip avatarı aktif) · açılış (sana gönderdi / kendine aldı, otomatik) · saldırı sorusu (joker
// şeridi) · SON BASKI (2/3) · kontrol el değişti (çekirdek uçar) · DÜELLO KAZANILDI (3/3) · SON DÜELLO (joker yok).
// Ölçer: yatay taşma · tek ekran (kaydırma yok) · dokunma hedefi ≥ 44 px · kesik metin · konsol hatası · EN'de Türkçe kalmadı.
// Boyutlar: 390×844 ve 360×640, TR + EN (+ 360 TR hareket azaltma). Çıktı: tasarim/duello-v4/*.png + olcum.json
// Kullanım: npm run dev -- --port 5188 (başka kabukta) · node araclar/duello-v4-ekran.mjs --adres=http://localhost:5188 [--dil=tr]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { ceviriToplayici } from "./ceviri-dom.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const OTURUM = path.resolve(typeof ARG.oturum === "string" ? ARG.oturum : ".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/duello-v4");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }

const ID = "0d0e1100-0000-4000-8000-000000000004";
const RAKIP = "0d0e1100-0000-4000-8000-0000000000bb";
const K = ["bilim", "cografya", "edebiyat", "genel_kultur", "muzik", "sanat", "sinema", "spor", "tarih", "teknoloji"];
const SORU = { soru: "Hangi gezegen Güneş Sistemi'nin en büyüğüdür?", secenekler: ["Satürn", "Jüpiter", "Neptün", "Uranüs"], kategori: "bilim" };
const ORAN_BEN = { tarih: 74, sinema: 38, muzik: 66, bilim: null, sanat: 52, spor: 61 };
const ORAN_RAKIP = { tarih: 28, sinema: 72, muzik: 40, bilim: 55, sanat: null, spor: 47 };

function yeniDurum(ben) {
  return { ben, faz: "notr", kontrol: null, seri: 0, tur: 0, soruNo: 1, son: false, soruVar: true, kartlar: ["tarih", "sinema", "muzik", "bilim"],
    adim: 0, gonderilen: null, secilen: null, oto: false, benimKat: "bilim", rakipKat: "bilim", sonHamle: null, cevapladim: false,
    rakipCevapladi: false, gosterimFark: -500, bitisMs: 14000, yeniAn: Date.now(), ilk: true };
}
function durum(st) {
  const simdi = Date.now();
  const an = st.yeniAn ?? simdi;
  const bitis = new Date(an + st.bitisMs).toISOString();
  const gb = new Date(simdi + st.gosterimFark).toISOString();
  const soruFazi = ["notr", "cevap", "son"].includes(st.faz);
  const oyuncu = (id, ad, dogru) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/samuray-y15.svg" : "/avatars/pro/tilki-k04.svg", gorunum: null, dogru, unvan: null });
  return {
    surum: 4, id: ID, durum: "aktif", dereceli: true, faz: st.faz, faz_bitis: bitis, sunucu_zamani: new Date(simdi).toISOString(),
    ben: st.ben, rakip: RAKIP,
    oyuncular: [oyuncu(st.ben, "Sen", 3), oyuncu(RAKIP, "Deniz Yıldırımoğlu", 2)],
    v4: {
      kontrol: st.kontrol, seri: st.seri, seri_hedef: 3, tur: st.tur, max_tur: 20, notr_seri: 0, notr_max: 5, son: st.son, soru_no: st.soruNo,
      kullanilan: [], ilk_mac: st.ilk,
      kart: st.faz === "kart" ? { kartlar: st.kartlar.map((k) => ({ k, ben: ORAN_BEN[k] ?? null, rakip: ORAN_RAKIP[k] ?? null })), adim: st.adim,
        gonderilen: st.kontrol === st.ben ? st.gonderilen : null, secilen: null, varsayilan: 50 } : null,
      benim_kategori: st.faz !== "kart" ? st.benimKat : null, rakip_kategori: st.faz !== "kart" ? st.rakipKat : null, oto: st.faz !== "kart" ? st.oto : null,
    },
    soru: soruFazi && st.soruVar ? { ...SORU, kategori: st.benimKat } : null,
    cevap: soruFazi ? { benim_bitis: bitis, rakip_bitis: bitis, ben_cevapladim: st.cevapladim, benim_cevabim: st.cevapladim ? 1 : null,
      rakip_cevapladi: st.rakipCevapladi, elli_kapali: null, ikinci_sans_ilk_cevap: null } : null,
    son_hamle: st.sonHamle,
    skill: { kapali: st.son, set: ["elli", "sure", "zaman_baskisi"], izinli: ["elli", "sure", "soru_degistir", "zaman_baskisi", "ikinci_sans"], toplam_hak: 4, tur_basi_hak: 2,
      soru_basi_hak: 1, kullanilan: 0, sayilar: {}, bu_soruda: 0, rakip_bu_soruda: false, soru_degistir_kilit: null, envanter: { elli: 3, sure: 2, zaman_baskisi: 1 }, fiyatlar: {}, coin: 120 },
    sureler: { kart: 7, cevap: 15, sonuc: 3, ek_sure: 5, zaman_baskisi_eksi: 5, nabiz: 10, kopuk: 25, gosterim_payi_ms: 2000, gosterim_bas: gb },
    kazanan: null, terk_eden: null, odul: null, ezeli: null, gecmis: null, rovans: { isteyen: null, id: null, gecerli: false },
  };
}
const hamle = (st, o) => ({ surum: 4, tip: "saldiri", no: st.soruNo, tur: st.tur, kazanan: null, seri_hedef: 3, notr_seri: 0, gonderilen: "tarih", secilen: "muzik", oto: false,
  oyuncular: { [st.ben]: { soru_id: "a", kategori: "muzik", cevap: 1, dogru: true, yanitsiz: false, dogru_cevap: 1 },
               [RAKIP]: { soru_id: "b", kategori: "tarih", cevap: 0, dogru: false, yanitsiz: false, dogru_cevap: 2 } }, ...o });

const OLC = () => {
  const gorunur = (el) => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const s = getComputedStyle(el); if (s.visibility === "hidden" || s.display === "none") return false; for (let e = el; e; e = e.parentElement) if (+getComputedStyle(e).opacity < 0.05) return false; return true; };
  const yol = (el) => { const c = (el.className && el.className.baseVal === undefined ? String(el.className) : "").trim().split(/\s+/).slice(0, 2).join("."); return el.tagName.toLowerCase() + (c ? "." + c : ""); };
  const tasan = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > window.innerWidth + 1; }).slice(0, 5).map(yol);
  const hedefler = [...document.querySelectorAll(".d4-kart:not(:disabled), .d4-arena .qt-sik:not(:disabled), .d4-dugme, .d4-arena .qt-skill:not(:disabled)")].filter(gorunur);
  const kucuk = hedefler.filter((e) => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map((e) => `${yol(e)} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
  const kesik = [...document.querySelectorAll(".d4-kart-ad, .d4-baslik h2, .d4-sonuc-baslik, .d4-tur, .d4-bilet-et, .d4-bilet-kap > b, .d4-dev, .d4-baski b, .d4-damga, .d4-oran b")]
    .filter((e) => gorunur(e) && e.scrollWidth > e.clientWidth + 1).map((e) => `${yol(e)}: ${e.textContent.trim().slice(0, 30)}`);
  const kok = document.querySelector(".d4-arena");
  const altKenar = kok ? Math.max(...[...kok.querySelectorAll("*")].filter((e) => gorunur(e) && !e.closest(".d4-konfeti")).map((e) => e.getBoundingClientRect().bottom)) : 0;
  return {
    yatayTasma: document.documentElement.scrollWidth - window.innerWidth, tasan,
    dikeyTasma: Math.round(document.documentElement.scrollHeight - window.innerHeight), altKenar: Math.round(altKenar), ekran: window.innerHeight,
    kucuk, kesik, metin: (kok?.innerText ?? "").replace(/\s+/g, " ").slice(0, 400),
    cekirdek: document.querySelector(".d4-hat")?.className ?? "",
    kartH: Math.round(document.querySelector(".d4-kart")?.getBoundingClientRect().height ?? 0),
    kartMin: document.querySelector(".d4-kart") ? getComputedStyle(document.querySelector(".d4-kart")).minHeight : null,
  };
};

const CEVIRI = await ceviriToplayici();
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
const sonuc = {};
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const DILLER = ARG.dil ? [ARG.dil] : ["tr", "en"];
const KOSULAR = [];
for (const dil of DILLER) for (const [w, h] of [[390, 844], [360, 640]]) KOSULAR.push({ dil, w, h, azalt: false });
if (!ARG.dil || ARG.dil === "tr") KOSULAR.push({ dil: "tr", w: 360, h: 640, azalt: true });

for (const { dil, w, h, azalt } of KOSULAR) {
  const durumDosya = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  durumDosya.origins = (durumDosya.origins || []).map((o) => ({ ...o, origin: kok,
    localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim", "qt_profil_onbellek"].includes(x.name)),
      { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" }] }));
  const b = await tarayici.newContext({ storageState: durumDosya, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block",
    reducedMotion: azalt ? "reduce" : "no-preference" });
  const s = await b.newPage();
  const konsol = [];
  s.on("console", (m) => { if (m.type() === "error" && !/status of 400/.test(m.text())) konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };
  let st = null;
  const istekler = [];
  await s.route(/\/rest\/v1\/rpc\//, async (r) => {
    const req = r.request(); const u = req.url();
    const json = (veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
    try {
      if (u.includes("/rpc/duello_durum")) { if (!st) st = yeniDurum(jwtSub(req)); return json(durum(st)); }
      if (u.includes("/rpc/duello_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
      if (u.includes("/rpc/duello_baglanti")) return json({ kopuk: false });
      if (u.includes("/rpc/duello_kategori_sec")) { istekler.push(JSON.parse(req.postData() || "{}").p_kategori); return json(null); }
      if (u.includes("/rpc/duello_cevap")) { st.cevapladim = true; return json({ tekrar_hakki: false, cevaplandi: true }); }
      if (/\/rpc\/duello_(terk|ara|savunma_jokeri|saldiri_jokeri)|kalp_at/.test(u)) return json(null);
      const y = await r.fetch();
      await r.fulfill({ response: y, body: (await y.text()).replace(/"dil":\s*"(tr|en)"/g, `"dil":"${dil}"`) });
    } catch { try { await r.continue(); } catch { /* sayfa kapandı */ } }
  });
  const etiket = `${w}x${h}-${dil}${azalt ? "-azalt" : ""}`;
  const kaydet = async (ad) => { await s.screenshot({ path: path.join(CIKTI, `${ad}-${etiket}.png`), fullPage: false }); if (dil === "en") await CEVIRI.tara(s, `${ad}-${etiket}`); };
  const olc = async (ad) => { const o = await s.evaluate(OLC); sonuc[`${ad}-${etiket}`] = o; return o; };
  const ortak = (ad, o) => {
    ok(`${ad}: yatay taşma yok`, o.yatayTasma <= 0, JSON.stringify(o.tasan));
    ok(`${ad}: tek ekran (kaydırma yok, alt ${o.altKenar}/${o.ekran})`, o.dikeyTasma <= 1 && o.altKenar <= o.ekran + 1, `kaydırma ${o.dikeyTasma}`);
    ok(`${ad}: dokunma hedefi ≥ 44 px`, o.kucuk.length === 0, o.kucuk.slice(0, 4).join(" | "));
    ok(`${ad}: kesik metin yok`, o.kesik.length === 0, o.kesik.slice(0, 4).join(" | "));
  };
  const yenile = async (ms = 900) => { await s.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await s.waitForTimeout(ms); };
  const an = async (ad, kontrol, ms = 900) => { await yenile(ms); const o = await olc(ad); ortak(ad, o); if (kontrol) kontrol(o); await kaydet(ad); return o; };
  const TR = dil === "tr";
  console.log(`\n== ${w}×${h} ${dil}${azalt ? " · hareket azaltma" : ""}`);
  try {
    await s.goto(`${ADRES}/duello/${ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.waitForSelector(".d4-arena", { timeout: 30000 });
    // 00 giriş (soru henüz gizli, 3-2-1)
    st.soruVar = false; st.gosterimFark = 4500;
    await an("00-giris", (o) => ok("giriş: sayaç + DÜELLO, kontrol çekirdeği ortada", /d4-hat--orta/.test(o.cekirdek) && (TR ? /DÜELLO/ : /DUEL/).test(o.metin), o.metin));
    // 01 nötr soru
    st.soruVar = true; st.gosterimFark = -500; st.yeniAn = Date.now(); st.bitisMs = 14000;
    await an("01-notr", (o) => ok("nötr: 4 şık, NÖTR, aynı soru", (TR ? /NÖTR/ : /NEUTRAL/).test(o.metin)));
    // 02 sonuç: kontrol bende
    st.faz = "sonuc"; st.kontrol = st.ben; st.yeniAn = Date.now(); st.bitisMs = 3000;
    st.sonHamle = hamle(st, { tip: "notr", sonuc: "kontrol_aldi", kontrol_once: null, kontrol_sonra: st.ben, seri_once: 0, seri_sonra: 0 });
    await an("02-kontrol-sende", (o) => ok("sonuç: KONTROL SENDE + çekirdek bende", (TR ? /KONTROL SENDE/ : /YOU HAVE CONTROL/).test(o.metin) && /d4-hat--ben/.test(o.cekirdek), o.cekirdek));
    // 03 kart 1/2
    st.faz = "kart"; st.tur = 1; st.adim = 0; st.yeniAn = Date.now(); st.bitisMs = 9000; st.gosterimFark = -500; st.sonHamle = null; st.cevapladim = false;
    await an("03-kart-gonder", (o) => ok("kart 1/2: 4 kart + 'Rakibe gönderilecek kategoriyi seç', '?' veri yok", (TR ? /Rakibe gönderilecek kategoriyi seç/ : /Pick a category to send your opponent/).test(o.metin) && /\?/.test(o.metin), o.metin));
    ok("1034: onay düğmesi yok", await s.locator(".d4-dugme").count() === 0);
    const istekOnce = istekler.length;
    await s.locator(".d4-kart").first().dblclick();
    await s.waitForTimeout(250);
    ok("karta dokun → RAKİBE damgası", await s.locator(".d4-kart--rakibe .d4-damga").count() === 1);
    await kaydet("03b-kart-damga");
    await s.waitForTimeout(400);
    ok("tek dokunuş → istek tarih (çift tıklamada tek istek)", istekler.at(-1) === "tarih" && istekler.length - istekOnce === 1, String(istekler.slice(istekOnce)));
    // 04 kart 2/2
    st.adim = 1; st.gonderilen = "tarih";
    await an("04-kart-sec", (o) => ok("kart 2/2: 'Kendi kategorini seç', gönderilen kart kırmızı + pasif", (TR ? /Kendi kategorini seç/ : /Pick your own category/).test(o.metin)));
    ok("gönderilen kart pasif", await s.locator(".d4-kart--rakibe:disabled").count() === 1);
    await s.locator(".d4-kart:not(:disabled)").nth(1).click();
    await s.waitForTimeout(250);
    ok("karta dokun → SANA damgası (mavi)", await s.locator(".d4-kart--sana .d4-damga").count() === 1);
    await kaydet("04b-kart-sana");
    // 05 bekleyen
    st.kontrol = RAKIP; st.adim = 1; st.gonderilen = null; st.seri = 1;
    await an("05-bekleyen", (o) => ok("bekleyen: RAKİP SEÇİYOR, rakip avatarı aktif, kartlar izleme", (TR ? /RAKİP SEÇİYOR/ : /OPPONENT IS PICKING/).test(o.metin)));
    ok("rakip avatarı aktif + kartlar dokunulamaz", await s.locator(".d4-oy--rakip.d4-oy--aktif").count() === 1 && await s.locator(".d4-kart:not(:disabled)").count() === 0);
    // 06 açılış (otomatik seçim)
    st.faz = "cevap"; st.benimKat = "tarih"; st.rakipKat = "muzik"; st.oto = true; st.gosterimFark = 30000; st.yeniAn = Date.now(); st.bitisMs = 47000;
    await an("06-acilis", (o) => ok("açılış: SANA GÖNDERDİ / KENDİNE ALDI + otomatik", (TR ? /SANA GÖNDERDİ.*KENDİNE ALDI.*otomatik/ : /SENT TO YOU.*THEY TOOK.*auto-picked/).test(o.metin), o.metin));
    // 07 saldırı sorusu (rakip kontrolde, benim sorum rakibin gönderdiği) + joker şeridi
    st.gosterimFark = -500; st.oto = false; st.yeniAn = Date.now(); st.bitisMs = 14000;
    await an("07-soru", (o) => ok("soru: 4 şık + joker şeridi + rakip kategorisi", (TR ? /Rakibin sorusu: Müzik/ : /Opponent's question: Music/).test(o.metin), o.metin));
    ok("joker şeridi görünür", await s.locator(".d4-arena .m2-skill").count() === 1 && await s.locator(".d4-arena .qt-sik").count() === 4);
    await s.locator(".d4-arena .qt-sik").nth(1).click();
    await s.waitForTimeout(500);
    ok("cevap → kilit (avatarda onay)", await s.locator(".d4-oy--ben .d4-oy-onay").count() === 1);
    // 08 SON BASKI (ben 2/3)
    st.faz = "sonuc"; st.kontrol = st.ben; st.seri = 2; st.yeniAn = Date.now(); st.bitisMs = 3000;
    st.sonHamle = hamle(st, { sonuc: "basarili", kontrol_once: st.ben, kontrol_sonra: st.ben, seri_once: 1, seri_sonra: 2 });
    await an("08-son-baski", (o) => ok("2/3: BAŞARILI SALDIRI + SON BASKI", (TR ? /BAŞARILI SALDIRI.*SON BASKI/ : /SUCCESSFUL ATTACK.*FINAL PUSH/).test(o.metin), o.metin), 1600);
    ok("avatar tepkisi: ben doğru, rakip yanlış", await s.locator(".d4-oy--ben.d4-oy--dogru").count() === 1 && await s.locator(".d4-oy--rakip.d4-oy--yanlis").count() === 1);
    // 09 el değişti (çekirdek rakibe uçar)
    st.soruNo++; st.kontrol = RAKIP; st.seri = 1; st.yeniAn = Date.now();
    st.sonHamle = hamle(st, { sonuc: "el_degisti", kontrol_once: st.ben, kontrol_sonra: RAKIP, seri_once: 2, seri_sonra: 1,
      oyuncular: { [st.ben]: { kategori: "muzik", dogru: false, yanitsiz: false }, [RAKIP]: { kategori: "tarih", dogru: true, yanitsiz: false } } });
    await an("09-el-degisti", (o) => ok("el değişti: KONTROL RAKİBE GEÇTİ, çekirdek rakipte", (TR ? /KONTROL RAKİBE GEÇTİ/ : /CONTROL LOST/).test(o.metin) && /d4-hat--rakip/.test(o.cekirdek), o.cekirdek), 300);
    ok("el değişince sarsıntı (tek sefer)", azalt || await s.locator(".d4-sahne--sarsinti, .d4-cekirdek--ucus").count() >= 1);
    await s.waitForTimeout(700);
    // 10 kazanıldı (3/3)
    st.soruNo++; st.kontrol = st.ben; st.seri = 3; st.yeniAn = Date.now();
    st.sonHamle = hamle(st, { sonuc: "basarili", kontrol_once: st.ben, kontrol_sonra: st.ben, seri_once: 2, seri_sonra: 3 });
    await an("10-kazanildi", (o) => ok("3/3: DÜELLO KAZANILDI", (TR ? /DÜELLO KAZANILDI/ : /DUEL WON/).test(o.metin), o.metin), 1200);
    // 11 Son Düello
    st.soruNo++; st.faz = "son"; st.son = true; st.kontrol = null; st.seri = 0; st.tur = 20; st.benimKat = "cografya"; st.cevapladim = false;
    st.yeniAn = Date.now(); st.bitisMs = 14000; st.gosterimFark = -500; st.sonHamle = null;
    await an("11-son-duello", (o) => ok("SON DÜELLO: aynı soru, joker şeridi yok", (TR ? /SON DÜELLO/ : /LAST DUEL/).test(o.metin), o.metin));
    ok("Son Düello'da joker şeridi yok", await s.locator(".d4-arena .m2-skill").count() === 0);
    ok("konsol hatası yok", konsol.length === 0, konsol.slice(0, 3).join(" | "));
  } catch (e) { kaldi++; console.log("  ✗ HATA", e.message.slice(0, 300)); await kaydet("hata").catch(() => {}); }
  await b.close();
}
await tarayici.close();
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(sonuc, null, 1));
console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
if (CEVIRI.ozet()) { kaldi++; console.log("  ✗ İngilizce koşuda ekranda Türkçe metin kaldı"); }
process.exit(kaldi ? 1 : 0);
