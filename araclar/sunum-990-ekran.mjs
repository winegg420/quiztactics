// 990 · Ortak Hazine + Düello SUNUM paketi — TAKLİT VERİYLE ekran ölçümü (sunucuya YAZMAZ; RPC'ler tarayıcıda taklit).
// Koşular: 360×640 ve 390×640, TR + EN, ayrıca 360×640 hareket azaltma.
// Ortak Hazine:
//   · lobi: 3 maddelik özet + "Rakip ara" İLK EKRANDA (dikey kaydırmasız görünür), "Tüm kurallar" kapalı açılır alan
//   · başlık: çok uzun rakip adı tur göstergesine taşmaz (dikdörtgenler kesişmez, ad üç noktayla kısalır)
//   · soru sırasında hazine şeridin ORTASINDA (merkez ±24 px), şerit yüksekliği ≤ 56 px (soru alanı sıkışmaz)
//   · AÇ anı geç veride (gösterim payı geçmiş) ATLANMAZ: görünür süre ≥ 0,9 sn; an sürerken sayaç gizli, sonra görünür
//   · rakibin kararı: önce kapalı kart (karar görünmez), sonra AÇTI / DEVAM ETTİ; dokunarak geçilir; aynı olay yeniden
//     okununca (Realtime tekrarı) TEKRAR OYNAMAZ
// Düello:
//   · kategori çalma anı: kart eski sahibin tarafından yeni sahibe kayar (sağ → sol), ≥ 1,5 sn görünür; puan artışı kart
//     inmeden görünmez, inişten sonra görünür; bantta "X rakipten sana geçti!"; dokunarak geçilir; tekrar okumada yeniden oynamaz
//   · ban kapalı: kategori fazında ban izi yok (banlı kart / "Ban kullanılmadı" / ban sahnesi), tanıtımda "ban" adımı yok
// Her ekranda: yatay taşma yok · konsol hatası yok. Çıktı: tasarim/sunum-990/*.png
// Kullanım: npm run dev -- --port 5188 (başka kabukta) · node araclar/sunum-990-ekran.mjs [--adres=…] [--dil=tr] [--en=360]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/sunum-990");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }

// ---------------------------------------------------------------- Ortak Hazine taklidi
const KASA_ID = "0b6f6800-0000-4000-8000-0000000990aa";
const KR = "0b6f6800-0000-4000-8000-0000000990bb";
const UZUN_AD = "Muhammed Abdurrahman Karadenizlioğlu";
const KASA_AYAR = { kasa_modu_acik: 1, kasa_odul_acik: 1, kasa_odul_carpani: 1, kasa_artis: 2, kasa_ikisi_dogru_artis: 6,
  kasa_hedef_puan: 80, kasa_max_tur: 36, kasa_soru_sn: 15, kasa_karar_sn: 5, kasa_sonuc_sn: 3, kasa_acma_min: 0,
  kasa_devam_joker_acik: 1, kasa_devam_birakir: 1, kasa_tavan: 80, kasa_devam_carpan: 2 };
const SORU = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], kategori: "cografya" };
const BOS_JOKER = { turler: [], kapali: [], elenen: null, ikinci_sans: false, kisaltildi: false };
function kasaDurum(ad, ben, t0) {
  const simdi = Date.now();
  const iso = (ms) => new Date(simdi + ms).toISOString();
  const isoT = (ms) => new Date(t0 + ms).toISOString();   // senaryo çapası (yeniden okumada kaymasın)
  const oyuncu = (id, ad, puan) => ({ id, gorunen_ad: ad, gorunen_avatar: id === KR ? "/avatars/pro2/basortulu-y04.svg" : null, gorunum: null, unvan: null, puan, acma: 1 });
  const temel = {
    id: KASA_ID, durum: "aktif", dereceli: true, faz: "cevap", faz_bitis: iso(12000), sunucu_zamani: new Date(simdi).toISOString(),
    ben, tur: 9, max_tur: 36, hedef: 80, tavan: 80, devam_carpan: 2, altin: false, artis: 2, ikisi_artis: 6, kasa: 24, sahip: KR, acma_min: 0, jokerli: true,
    oyuncular: [oyuncu(ben, "Sen", 18), oyuncu(KR, UZUN_AD, 22)],
    karar: null, son_karar: null, soru: SORU, cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false }, sonuc: null,
    joker: BOS_JOKER, rakip_joker: [], devam_sans: 0, devam_elli: true, devam_birakir: true, bedava_joker: null, devam_odul: null,
    sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 1500, gosterim_bas: iso(-2000), benim_bitis: iso(12000), faz_son: iso(12000) },
    kopuk: null, kazanan: null, sonuc_neden: null, terk: null, baglanmayan: null, gecmis: null,
  };
  // karar → soru: sunucu gösterim payı 1,5 sn (gb = soru sayacının başlangıcı). gec: veri bu kadar GEÇ geldi (pay yenmiş).
  const kararSonrasi = (gec, ek) => ({ ...temel, ...ek, faz_bitis: isoT(1500 - gec + 15000),
    sureler: { ...temel.sureler, gosterim_bas: isoT(1500 - gec), benim_bitis: isoT(1500 - gec + 15000), faz_son: isoT(1500 - gec + 15000) } });
  switch (ad) {
    case "cevap": return temel;
    case "karar-rakip": return { ...temel, faz: "karar", soru: null, cevap: null, faz_bitis: iso(4000), karar: { veren: KR, deger: 24 } };
    case "karar-ben": return { ...temel, faz: "karar", sahip: ben, soru: null, cevap: null, faz_bitis: iso(4000), karar: { veren: ben, deger: 24 } };
    // rakip AÇ (zamanında / 1,7 sn geç: pay tamamen yenmiş)
    case "ac-rakip": return kararSonrasi(0, { kasa: 0, sahip: null, son_karar: { veren: KR, ac: true, deger: 24 }, oyuncular: [oyuncu(ben, "Sen", 18), oyuncu(KR, UZUN_AD, 46)] });
    case "ac-rakip-gec": return kararSonrasi(1700, { kasa: 0, sahip: null, son_karar: { veren: KR, ac: true, deger: 24 }, oyuncular: [oyuncu(ben, "Sen", 18), oyuncu(KR, UZUN_AD, 46)] });
    case "ac-ben-gec": return kararSonrasi(1700, { kasa: 0, sahip: null, son_karar: { veren: ben, ac: true, deger: 24 }, oyuncular: [oyuncu(ben, "Sen", 42), oyuncu(KR, UZUN_AD, 22)] });
    // rakip DEVAM ×2 (24 → 48), sahipsiz kalır
    case "devam-rakip": return kararSonrasi(0, { kasa: 48, sahip: null, son_karar: { veren: KR, ac: false, deger: 24, sure_doldu: false, birakti: true, carpan: 2, yeni: 48, tavan: false } });
    default: return temel;
  }
}

// ---------------------------------------------------------------- Düello taklidi (970 puan modu, 982 ban kapalı)
const D_ID = "0d0e1100-0000-4000-8000-0000000990cc";
const DR = "0d0e1100-0000-4000-8000-0000000990dd";
const K = ["bilim", "cografya", "edebiyat", "genel_kultur", "muzik", "sanat", "sinema", "spor", "tarih", "teknoloji"];
const BEN_K = ["bilim", "edebiyat", "muzik", "sinema", "tarih"];
const D_AYAR = { duello_secim_modu: true, duello_hakimiyet_esik: 7, duello_max_tur: 20, duello_secim_sn: 5, duello_puan_modu: "yeni",
  duello_puan_hedef: 12, duello_puan_kategori_yolu: 4, duello_puan_max_tur: 20, duello_ban_acik: false };
function dDurum(ad, ben, t0) {
  const simdi = Date.now();
  const iso = (ms) => new Date(t0 + ms).toISOString();
  const baslangic = Object.fromEntries(K.map((k) => [k, BEN_K.includes(k) ? ben : DR]));
  const calindi = ad === "sonuc-calma" || ad === "kategori-sonra";
  const sahiplik = { ...baslangic, ...(calindi ? { cografya: ben } : {}) };
  const puan = calindi ? { [ben]: 5, [DR]: 3 } : { [ben]: 3, [DR]: 3 };
  const faz = ad === "sonuc-calma" ? "sonuc" : ad === "cevap" ? "cevap" : "kategori";
  const saldiran = ad === "kategori-sonra" ? DR : ben;
  const say = (u) => Object.values(sahiplik).filter((x) => x === u).length;
  const alinan = (u) => K.filter((k) => baslangic[k] !== u && sahiplik[k] === u).length;
  const bitis = iso(faz === "sonuc" ? 3000 : 16500);
  const oyuncu = (id, a, i) => ({ id, gorunen_ad: a, gorunen_avatar: id === DR ? "/avatars/pro2/basortulu-y04.svg" : null, gorunum: null,
    puan: puan[id], dogru: 0, profil: { oranlar: Object.fromEntries(K.map((k, j) => [k, 30 + ((j * (i ? 23 : 17)) % 55)])) }, unvan: null });
  const sonHamle = ad === "sonuc-calma" ? { tur: 6, saldiri_sirasi: 0, saldiran: ben, kategori: "cografya", soru_id: 990, uzatma: false, dogru_cevap: 1,
    cevaplar: { [ben]: { cevap: 1, dogru: true }, [DR]: { cevap: 0, dogru: false } },
    hakimiyet: { puan_modu: true, tuttu: true, eylem: "elinden_al", neden: "tuttu", sahip_once: DR, sahip_sonra: ben, kilit: 2,
      kazanilan: { [ben]: 2, [DR]: 0 }, puanlar: puan, alinan: { [ben]: 1, [DR]: 0 } } } : null;
  return {
    surum: 2, id: D_ID, durum: "aktif", dereceli: true, tur: ad === "kategori-sonra" ? 7 : 6, max_tur: 20, saldiri_sirasi: 0, uzatma: false,
    faz, faz_bitis: bitis, sunucu_zamani: new Date(simdi).toISOString(), ben, saldiran, savunan: saldiran === ben ? DR : ben,
    hakimiyet: { acik: true, esik: 7, kilit_tur: 2, sahiplik, kilitler: calindi ? { cografya: 8 } : {}, yuvalar: { [ben]: say(ben), [DR]: say(DR) },
      rol_joker: null, rol_joker_hak: 1, avantaj_esik: 10 },
    puan: { acik: true, hedef: 12, kategori_yolu: 4, puanlar: puan, alinan: { [ben]: alinan(ben), [DR]: alinan(DR) }, baslangic },
    oyuncular: [oyuncu(ben, "Sen", 0), oyuncu(DR, "Deniz Yıldırımoğlu", 1)],
    kategoriler: K, kategori: faz === "kategori" ? null : "cografya",
    uygun_kategoriler: faz === "kategori" ? K.filter((k) => sahiplik[k] && sahiplik[k] !== saldiran && !(calindi && k === "cografya")) : null,
    soru: ["cevap", "sonuc"].includes(faz) ? SORU : null,
    cevap: faz === "cevap" ? { benim_bitis: bitis, rakip_bitis: bitis, ben_cevapladim: true, benim_cevabim: 1, rakip_cevapladi: true, elli_kapali: null, ikinci_sans_ilk_cevap: null } : null,
    son_hamle: sonHamle, kategori_sayim: {}, puan_degerleri: {}, tur_carpani: 1, carpanli_turlar: [],
    skill: { set: ["elli", "sure", "kalkan"], izinli: ["elli", "sure", "zaman_baskisi", "ikinci_sans", "soru_degistir", "baskin", "kalkan"], toplam_hak: 4, tur_basi_hak: 2, soru_basi_hak: 1,
      kullanilan: 0, sayilar: {}, bu_soruda: 0, rakip_bu_soruda: false, soru_degistir_kilit: null, envanter: { elli: 3, sure: 2, kalkan: 1 }, fiyatlar: {}, coin: 120 },
    sureler: { kategori: 15, ban: 7, secim: 5, cevap: 15, ek_sure: 5, zaman_baskisi_eksi: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 1500,
      gosterim_bas: iso(1500) },
    kazanan: null, odul: null, ezeli: null, gecmis: null, rovans: { isteyen: null, id: null, gecerli: false },
    kalkan: { acik: false, oyuncular: {}, aktif: null },
    ban: { acik: false, sure: 7, kategori: null, onceki: null, uygun: null },
    secim: { acik: true, sira: 10, toplam: 10, ilk_secen: DR, sure: 5, sirasi: [], secimler: K.map((k, i) => ({ k, u: baslangic[k], oto: false, sira: i + 1 })), kalan: null },
  };
}

// ---------------------------------------------------------------- koşu
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const DILLER = ARG.dil ? [ARG.dil] : ["tr", "en"];
const GENISLIK = ARG.en ? [Number(ARG.en)] : [360, 390];
const KOSULAR = [];
for (const dil of DILLER) for (const w of GENISLIK) KOSULAR.push({ dil, w, azalt: false });
if (!ARG.dil || ARG.dil === "tr") KOSULAR.push({ dil: "tr", w: 360, azalt: true });
const olcum = [];

for (const { dil, w, azalt } of KOSULAR) {
  const h = 640;
  const etiket = `${dil}-${w}${azalt ? "-azalt" : ""}`;
  const durumDosya = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  durumDosya.origins = (durumDosya.origins || []).map((o) => ({ ...o, origin: kok,
    localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim", "qt_duello_durum_ipucu", "bildim_duello_tanitim_v14"].includes(x.name)),
      { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" },
      { name: "qt_duello_durum_ipucu", value: "[{\"m\":\"a\",\"t\":[1]},{\"m\":\"b\",\"t\":[1]},{\"m\":\"c\",\"t\":[1]}]" }] }));
  const b = await tarayici.newContext({ storageState: durumDosya, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block",
    reducedMotion: azalt ? "reduce" : "no-preference" });
  const s = await b.newPage();
  const konsol = [];
  s.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  let ks = "cevap", ksT0 = Date.now(), ds = "kategori", dsT0 = Date.now();
  const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };
  await s.route(/\/rest\/v1\/(oyun_ayarlari|rpc\/|profiles)/, async (r) => {
    const req = r.request(); const u = req.url();
    const json = (veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
    try {
      if (u.includes("/rpc/kasa_durum")) return json(kasaDurum(ks, jwtSub(req), ksT0));
      if (u.includes("/rpc/kasa_joker_durumu")) return json({ sinir: 6, kullanilan: 0, ucretsiz_elli_kaldi: false, kilitli: false, kisaltildi: false, sis_bitis: null,
        sunucu_zamani: new Date().toISOString(), kullanilan_turler: [], kullanim_sayilari: {}, tur_basi_sinir: 2, soru_basi_sinir: 1, soruda_kullanildi: false });
      if (u.includes("/rpc/kasa_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
      if (u.includes("/rpc/kasa_aktif_benim")) return json([]);
      if (u.includes("/rpc/duello_durum")) return json(dDurum(ds, jwtSub(req), dsT0));
      if (/\/rpc\/(kasa|duello)_(cevap|karar|terk|ara|davet|aramadan|kategori_sec|ban_sec|nabiz|giris)/.test(u)) return json({ message: "Ölçüm aracı: yazma kapalı" }, 400);
      const y = await r.fetch();
      let m = await y.text();
      // Test hesabının profil dili (profiles.dil) localStorage'ı ezip sayfayı yeniden yükler — koşunun diline çevrilir
      if (u.includes("/rest/v1/profiles") || u.includes("/rpc/profilim")) {
        try { const v = JSON.parse(m); const cevir = (o) => (o && typeof o === "object" && "dil" in o ? { ...o, dil } : o);
          m = JSON.stringify(Array.isArray(v) ? v.map(cevir) : cevir(v)); } catch { /* json değil */ }
      }
      if (u.includes("/rest/v1/oyun_ayarlari")) {
        const liste = JSON.parse(m).filter((x) => !String(x.anahtar).startsWith("kasa_") && !(x.anahtar in D_AYAR));
        for (const [anahtar, deger] of Object.entries({ ...KASA_AYAR, ...D_AYAR })) liste.push({ anahtar, deger });
        m = JSON.stringify(liste);
      }
      await r.fulfill({ response: y, body: m });
    } catch { try { await r.continue(); } catch { /* sayfa kapandı */ } }
  });
  const kaydet = (ad) => s.screenshot({ path: path.join(CIKTI, `${ad}-${etiket}.png`) });
  const tasma = async (ad) => { const x = await s.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(`${ad}: yatay taşma yok (${x})`, x <= 0); };
  // seçici var olduğu sürece ölç (ilk görülme → kayboluş), en çok sinirMs
  const sureOlc = async (q, sinirMs = 4000) => s.evaluate(async ([q, sinirMs]) => {
    const t0 = performance.now(); let ilk = null, son = null;
    while (performance.now() - t0 < sinirMs) {
      const var_ = document.querySelector(q) != null;
      if (var_ && ilk == null) ilk = performance.now();
      if (!var_ && ilk != null) { son = performance.now(); break; }
      await new Promise((r) => requestAnimationFrame(r));
    }
    return { ilk: ilk == null ? null : Math.round(ilk - t0), sure: ilk == null ? 0 : Math.round((son ?? performance.now()) - ilk) };
  }, [q, sinirMs]);
  console.log(`\n== ${etiket}`);
  try {
    await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" }); await s.waitForTimeout(2000);
    await s.mouse.click(5, 5);

    // ================= Ortak Hazine · lobi =================
    await s.goto(`${ADRES}/kasa`, { waitUntil: "domcontentloaded" });
    await s.waitForSelector(".ks-ozet", { timeout: 20000 });
    await s.waitForTimeout(600);
    await kaydet("k1-lobi");
    const lobi = await s.evaluate(() => {
      const d = [...document.querySelectorAll(".m2-giris-eylem button")][0]?.getBoundingClientRect();
      const det = document.querySelector(".ks-kurallar-tum");
      return { dugmeAlt: d ? Math.round(d.bottom) : 9999, ozet: document.querySelectorAll(".ks-ozet li").length, acik: det?.open ?? null, h: innerHeight };
    });
    ok(`lobi: 3 maddelik özet, "Tüm kurallar" kapalı`, lobi.ozet === 3 && lobi.acik === false, JSON.stringify(lobi));
    ok(`lobi: "Rakip ara" ilk ekranda (alt ${lobi.dugmeAlt} ≤ ${lobi.h})`, lobi.dugmeAlt <= lobi.h);
    await s.locator(".ks-kurallar-tum > summary").click();
    await s.waitForTimeout(250);
    ok("lobi: açılır alan tam kuralları gösterir", (await s.locator(".ks-kurallar-tum .ks-kurallar li").count()) >= 5);
    await kaydet("k1-lobi-acik");
    await tasma("lobi");

    // ================= Ortak Hazine · maç =================
    const kasaAc = async (sen, q) => {
      ks = sen; ksT0 = Date.now();
      await s.goto(`${ADRES}/kasa/${KASA_ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await s.waitForSelector(q, { timeout: 25000 });
      await s.waitForTimeout(700);
    };
    const gec = async (sen) => { ks = sen; ksT0 = Date.now(); await s.evaluate(() => window.dispatchEvent(new Event("online"))); };
    await kasaAc("cevap", ".qt-sik");
    await kaydet("k2-cevap");
    const yer = await s.evaluate(() => {
      const r = (q) => document.querySelector(q)?.getBoundingClientRect();
      const orta = r(".ks-ust-orta"); const ad = r(".ks-ust .qt-oyuncu--rakip .qt-oyuncu-yazi"); const benAd = r(".ks-ust .qt-oyuncu:not(.qt-oyuncu--rakip) .qt-oyuncu-yazi");
      const m = r(".ks-skor-merkez .ks-kadran--kucuk"); const serit = r(".ks-serit");
      const adEl = document.querySelector(".ks-ust .qt-oyuncu--rakip .qt-oyuncu-ad");
      return { ortaSol: orta?.left, ortaSag: orta?.right, adSol: ad?.left, benSag: benAd?.right,
        kasaMerkez: m ? Math.round(m.left + m.width / 2) : null, ekranMerkez: Math.round(innerWidth / 2), seritH: serit ? Math.round(serit.height) : null,
        etiketKesik: [...document.querySelectorAll(".ks-skor--orta .ks-skor-ad, .ks-skor--orta .ks-skor-sayi")].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
        kesik: adEl ?adEl.scrollWidth > adEl.clientWidth || [...adEl.querySelectorAll("*")].some((e) => e.scrollWidth > e.clientWidth + 1) : null };
    });
    ok(`başlık: uzun rakip adı tur göstergesine taşmıyor (ad sol ${Math.round(yer.adSol)} ≥ orta sağ ${Math.round(yer.ortaSag)})`, yer.adSol >= yer.ortaSag - 0.5 && yer.benSag <= yer.ortaSol + 0.5, JSON.stringify(yer));
    ok("başlık: uzun ad kısaltıldı (üç nokta)", yer.kesik === true);
    ok(`şerit: hazine ortada (merkez ${yer.kasaMerkez} ~ ${yer.ekranMerkez} ±24)`, yer.kasaMerkez != null && Math.abs(yer.kasaMerkez - yer.ekranMerkez) <= 24, JSON.stringify(yer));
    ok(`şerit: yükseklik ${yer.seritH} ≤ 56 (soru alanı sıkışmaz)`, yer.seritH != null && yer.seritH <= 56);
    ok("şerit: SEN / RAKİP etiketi ve puan kesilmiyor", yer.etiketKesik.length === 0, JSON.stringify(yer.etiketKesik));
    await tasma("hazine cevap");
    const dikey = await s.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    ok(`hazine cevap: tek ekran (dikey ${dikey})`, dikey <= 1);

    // ---- rakibin AÇ'ı: kapalı kart → AÇ anı (zamanında) ----
    await kasaAc("karar-rakip", ".ks-karar--bekle");
    const rkAc = sureOlc(".ks-rk", 3000);
    const anAcOlc = sureOlc(".ks-ac-an", 3500);   // aynı anda başlar: AÇ anı kart kalkınca gelir
    await gec("ac-rakip");
    const rk1 = await rkAc;
    await kaydet("k3-rakip-ac-kapali");
    const anAc = await anAcOlc;
    if (!azalt) {
      await kaydet("k3-rakip-ac-an");
      ok(`rakip AÇ: önce kapalı kart (${rk1.sure} ms, 200–500)`, rk1.ilk != null && rk1.sure >= 200 && rk1.sure <= 500, JSON.stringify(rk1));
      ok(`rakip AÇ: kart kalkınca AÇ anı (${anAc.sure} ms ≥ 900)`, anAc.sure >= 900, JSON.stringify(anAc));
    } else {
      ok(`rakip AÇ (hareket azaltma): kapalı → AÇTI kartı görünür (${rk1.sure} ms ≥ 900)`, rk1.sure >= 900, JSON.stringify(rk1));
    }
    await s.waitForTimeout(300);
    ok("rakip AÇ: an bitince sayaç görünür", (await s.locator(".ks-ust .qt-sayac").count()) === 1 && (await s.locator(".ks-sayac--bekle").count()) === 0);
    // aynı olay yeniden okunur (Realtime tekrarı) → tekrar oynamaz
    await s.evaluate(() => window.dispatchEvent(new Event("online")));
    const tekrar = await sureOlc(".ks-rk, .ks-ac-an", 1200);
    ok("rakip AÇ: yeniden okumada an TEKRAR OYNAMAZ", tekrar.ilk == null, JSON.stringify(tekrar));

    // ---- geç veri: pay tamamen yenmiş → AÇ anı ATLANMAZ, en az 0,9 sn ----
    for (const [ad, once, sonra, q] of [["rakip-gec", "karar-rakip", "ac-rakip-gec", ".ks-karar--bekle"], ["ben-gec", "karar-ben", "ac-ben-gec", ".ks-karar-eylem"]]) {
      await kasaAc(once, q);
      const olc = sureOlc(azalt ? ".ks-rk, .ks-sayac--bekle" : ".ks-ac-an", 3500);
      const sayacOlc = sureOlc(".ks-sayac--bekle", 3500);
      await gec(sonra);
      const [a, sb] = await Promise.all([olc, sayacOlc]);
      await kaydet(`k4-${ad}`);
      if (!azalt) ok(`${ad}: AÇ anı atlanmadı, görünür ${a.sure} ms (≥ 900)`, a.sure >= 900, JSON.stringify(a));
      ok(`${ad}: an sürerken sayaç gizli (${sb.sure} ms), sonra gerçek kalanla görünür`, (azalt ? true : sb.sure >= 900) && (await s.locator(".ks-ust .qt-sayac").count()) === 1, JSON.stringify(sb));
      const kalan = Number((await s.locator(".ks-ust .qt-sayac").innerText().catch(() => "0")).replace(/\D/g, ""));
      ok(`${ad}: sayaç sunucunun kalanını gösterir (${kalan} ≤ 14)`, kalan > 0 && kalan <= 14);
    }

    // ---- rakibin DEVAM'ı: kapalı → DEVAM ETTİ; dokunarak geçilir ----
    await kasaAc("karar-rakip", ".ks-karar--bekle");
    const rkD = sureOlc(".ks-rk", 3000);
    const rkAcik = sureOlc(".ks-rk--acik", 3000);
    await gec("devam-rakip");
    await s.waitForTimeout(420);
    await kaydet("k5-rakip-devam-vurus");
    const vurusMetin = await s.locator(".ks-rk").innerText().catch(() => "");
    const [d1, d2] = await Promise.all([rkD, rkAcik]);
    ok(`rakip DEVAM: kapalı kart + vuruş toplam ${d1.sure} ms (800–1300), vuruş ${d2.sure} ms`, d1.sure >= 800 && d1.sure <= 1300 && d2.sure >= 450, JSON.stringify([d1, d2]));
    ok(`rakip DEVAM: vuruş metni (${vurusMetin.replace(/\s+/g, " ").slice(0, 40)})`, dil === "en" ? /KEPT/.test(vurusMetin) : /DEVAM ETTİ/.test(vurusMetin));
    await kasaAc("karar-rakip", ".ks-karar--bekle");
    await gec("devam-rakip");
    await s.waitForSelector(".ks-rk", { timeout: 4000 });
    await s.locator(".ks-mac").dispatchEvent("pointerdown");
    await s.waitForTimeout(80);
    ok("rakip DEVAM: dokununca an geçilir", (await s.locator(".ks-rk").count()) === 0);
    await tasma("hazine anlar");

    // ================= Düello · ban yok + çalma anı =================
    const dAc = async (sen, q) => {
      ds = sen; dsT0 = Date.now();
      await s.goto(`${ADRES}/duello/${D_ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await s.waitForSelector(q, { timeout: 25000 });
      await s.waitForTimeout(700);
    };
    await dAc("kategori", ".hk-kart");
    await kaydet("d1-kategori-ban-yok");
    const banIz = await s.evaluate(() => ({ sahne: document.querySelectorAll(".hk-sahne--ban, .hk-sahne--bangecis, .hk-kart--banli, .hk-cubuk--ban, .hk-kart-ban").length,
      metin: /ban/i.test(document.querySelector(".hk-mac")?.innerText ?? "") }));
    ok("Düello kategori: ban izi yok (banlı kart / ban sahnesi / 'ban' metni)", banIz.sahne === 0 && !banIz.metin, JSON.stringify(banIz));
    await tasma("düello kategori");

    // çalma: cevap → sonuç (coğrafya rakipten bana; sağ → sol)
    await dAc("cevap", ".hk-tahta");
    const yerOlc = s.evaluate(async (azaltMi) => {
      const t0 = performance.now(); const kayit = [];
      while (performance.now() - t0 < 3500) {
        const k = document.querySelector(".hk-calma-kart");
        const benPuan = document.querySelector(".hk-taraf--ben .hk-puan-sayi")?.textContent ?? "";
        const arti = document.querySelector(".hk-taraf--ben .hk-puan-arti") != null;
        if (k) { const r = k.getBoundingClientRect(); kayit.push({ t: Math.round(performance.now() - t0), x: Math.round(r.left + r.width / 2), benPuan, arti }); }
        else if (kayit.length) break;
        await new Promise((r) => requestAnimationFrame(r));
      }
      return kayit;
    }, azalt);
    ds = "sonuc-calma"; dsT0 = Date.now();
    await s.evaluate(() => window.dispatchEvent(new Event("online")));
    await s.waitForTimeout(250); await kaydet("d2-calma-0250");
    await s.waitForTimeout(500); await kaydet("d2-calma-0750");
    await s.waitForTimeout(400); await kaydet("d2-calma-1150");
    const kayit = await yerOlc;
    const sure = kayit.length ? kayit[kayit.length - 1].t - kayit[0].t : 0;
    const ilk = kayit[0], son = kayit[kayit.length - 1];
    const erken = kayit.filter((k) => k.t - (ilk?.t ?? 0) < (azalt ? 220 : 600));   // azaltmada iniş 300 ms
    const gec_ = kayit.filter((k) => k.t - (ilk?.t ?? 0) > 1100);
    ok(`çalma: an ≥ 1,5 sn görünür (${sure} ms)`, sure >= 1500, String(sure));
    if (!azalt) ok(`çalma: kart rakip tarafından (sağ, x ${ilk?.x}) oyuncuya (sol, x ${son?.x}) kaydı`, ilk && son && ilk.x - son.x >= w * 0.3, JSON.stringify([ilk, son]));
    else ok(`çalma (hareket azaltma): kart kaymıyor (x ${ilk?.x} → ${son?.x})`, ilk && son && Math.abs(ilk.x - son.x) <= 2);
    ok(`çalma: iniş öncesi (${azalt ? 220 : 600} ms) puan eski (3), +N yok`, erken.length > 0 && erken.every((k) => /^3$/.test(k.benPuan.trim()) && !k.arti), JSON.stringify(erken.slice(-2)));
    ok(`çalma: inişten sonra puan 5 ve +2 rozeti`, gec_.length > 0 && gec_.some((k) => /^5$/.test(k.benPuan.trim()) && k.arti), JSON.stringify(gec_.slice(0, 2)));
    const bant = (await s.locator(".hk-mesaj-yazi b").innerText().catch(() => "")).trim();
    ok(`çalma: bantta tek güçlü cümle ("${bant}")`, dil === "en" ? /moved from your opponent to you/i.test(bant) : /rakipten sana geçti/.test(bant));
    await s.evaluate(() => window.dispatchEvent(new Event("online")));
    const tekrarC = await sureOlc(".hk-calma", 1000);
    ok("çalma: yeniden okumada TEKRAR OYNAMAZ", tekrarC.ilk == null, JSON.stringify(tekrarC));
    // dokunarak geçme
    await dAc("cevap", ".hk-tahta");
    ds = "sonuc-calma"; dsT0 = Date.now();
    await s.evaluate(() => window.dispatchEvent(new Event("online")));
    await s.waitForSelector(".hk-calma", { timeout: 4000 });
    await s.locator(".hk-mac").dispatchEvent("pointerdown");
    await s.waitForTimeout(80);
    ok("çalma: dokununca geçilir, puan hemen gerçek (5)", (await s.locator(".hk-calma").count()) === 0
      && /^5$/.test((await s.locator(".hk-taraf--ben .hk-puan-sayi").innerText()).trim()));
    await tasma("düello çalma");
    // sonuç → doğrudan kategori (ban fazı yok)
    ds = "kategori-sonra"; dsT0 = Date.now();
    await s.evaluate(() => window.dispatchEvent(new Event("online")));
    await s.waitForSelector(".hk-kart", { timeout: 6000 });
    await s.waitForTimeout(500);
    await kaydet("d3-sonra-kategori");
    ok("sonuç → kategori: ban izi yok", (await s.locator(".hk-sahne--ban, .hk-kart--banli, .hk-cubuk--ban").count()) === 0
      && !/ban/i.test(await s.locator(".hk-mesaj").innerText()));

    // tanıtım: ban adımı yok (v14)
    if (!azalt && w === GENISLIK[0]) {
      await s.goto(`${ADRES}/duello`, { waitUntil: "domcontentloaded" });
      const kural = s.locator(".m2-giris button", { hasText: dil === "en" ? /rules/i : /Kurallar/ }).first();
      try {
        await kural.waitFor({ timeout: 15000 });
        await kural.click();
        await s.waitForSelector(".m2-tanitim", { timeout: 5000 });
        const basliklar = [];
        for (let i = 0; i < 14; i++) {
          basliklar.push((await s.locator(".m2-tanitim h3").innerText()).trim());
          const ileri = s.locator(".m2-tanitim-eylem button").first();
          if (/Anladım|Got it|başla|start/i.test(await ileri.innerText())) break;
          await ileri.click(); await s.waitForTimeout(120);
        }
        ok(`tanıtım: ${basliklar.length} adım, "ban" adımı yok`, basliklar.length >= 5 && !basliklar.some((x) => /ban/i.test(x)), basliklar.join(" | "));
      } catch (e) { ok("tanıtım açıldı", false, e.message); }
    }
  } catch (e) {
    kaldi++; console.log("  ✗ HATA:", e.message);
  }
  const ilgili = konsol.filter((k) => !/favicon|ERR_ABORTED|net::ERR_FAILED.*(avatars|ses)|Ölçüm aracı|400 \(Bad Request\)/i.test(k));
  ok(`konsol hatası yok (${etiket})`, ilgili.length === 0, ilgili.slice(0, 4).join(" | "));
  olcum.push({ etiket });
  await b.close();
}
await tarayici.close();
console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı — görüntüler: tasarim/sunum-990/`);
if (kaldi) process.exitCode = 1;
