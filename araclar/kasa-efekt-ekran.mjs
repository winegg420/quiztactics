// KASA efekt anları — TAKLİT VERİYLE zamanlı ekran görüntüsü (sunucuya YAZMAZ; kasa_* RPC'leri tarayıcıda taklit).
// Her an iki durumla oynatılır: önceki faz açılır, sonra kasa_durum yanıtı değiştirilip sayfa tazelenir ("online"
// olayı → yukle) ve efektin belirli milisaniyelerinde görüntü alınır. Ölçer: yatay taşma, tek ekran, konsol hatası.
// Kullanım: npm run dev -- --port 5188 (başka kabukta) · node araclar/kasa-efekt-ekran.mjs [--adres=…] [--en=360|390] [--azalt]
// Çıktı: tasarim/kasa-efekt/*.png (git'e girmez). Oturum: .arayuz-denetim-oturum.json (araclar/arayuz-denetim.mjs).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/kasa-efekt");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }

const KASA_ID = "0b6f6800-0000-4000-8000-00000000c0de";
const RAKIP = "0b6f6800-0000-4000-8000-0000000000aa";
const AYARLAR = { kasa_modu_acik: 1, kasa_odul_acik: 1, kasa_odul_carpani: 1, kasa_artis: 2, kasa_ikisi_dogru_artis: 6,
  kasa_hedef_puan: 50, kasa_max_tur: 36, kasa_soru_sn: 15, kasa_karar_sn: 8, kasa_sonuc_sn: 3, kasa_acma_min: 10 };
const SORU = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], kategori: "cografya" };
// 951: zamanı kritik anlar (giriş sahnesi, final) senaryo başına SABİT bir çapaya bağlanır — yoklamalar kaydırmasın
let capa = Date.now();
const BOS_JOKER = { turler: [], kapali: [], elenen: null, ikinci_sans: false, kisaltildi: false };

function durum(ad, ben) {
  const simdi = Date.now();
  const iso = (ms) => new Date(simdi + ms).toISOString();
  const isoC = (ms) => new Date(capa + ms).toISOString();
  const oyuncu = (id, ad, puan, acma) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/basortulu-y04.svg" : null, gorunum: null, unvan: null, puan, acma });
  const temel = {
    id: KASA_ID, durum: "aktif", dereceli: true, faz: "cevap", faz_bitis: iso(12000), sunucu_zamani: new Date(simdi).toISOString(),
    ben, tur: 7, max_tur: 36, hedef: 50, altin: false, artis: 2, ikisi_artis: 6, kasa: 8, sahip: RAKIP, acma_min: 10, jokerli: true,
    oyuncular: [oyuncu(ben, "Sen", 8, 1), oyuncu(RAKIP, "Deniz Yıldırımoğlu", 12, 2)],
    karar: null, son_karar: null, soru: SORU, cevap: { ben_cevapladim: true, benim_cevabim: 1, rakip_cevapladi: true }, sonuc: null,
    joker: BOS_JOKER, rakip_joker: [],
    sureler: { soru: 15, karar: 8, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 1500, gosterim_bas: iso(-2000), benim_bitis: iso(12000), faz_son: iso(12000) },
    kopuk: null, kazanan: null, sonuc_neden: null, terk: null, baglanmayan: null, gecmis: null,
  };
  const acikSoru = (ek = {}) => ({ ...temel, tur: 8, cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false },
    faz_bitis: iso(14000), sureler: { ...temel.sureler, gosterim_bas: iso(-1000), benim_bitis: iso(14000), faz_son: iso(14000) }, ...ek });
  const bittiFinal = (kazanan, deger, puanBen, puanRakip) => ({ ...temel, durum: "bitti", faz: "sonuc", kazanan, sonuc_neden: "hedef",
    kasa: 0, sahip: null, son_karar: { veren: kazanan, ac: true, deger }, joker: null, rakip_joker: null,
    oyuncular: [oyuncu(ben, "Sen", puanBen, 3), oyuncu(RAKIP, "Deniz Yıldırımoğlu", puanRakip, 2)], terk: { ben: false, rakip: false },
    gecmis: [1, 2].map((t) => ({ tur: t, altin: false, kategori: "cografya", soru: SORU.soru, secenekler: SORU.secenekler, dogru_cevap: 1, benim_cevabim: 1, ben_dogru: true, rakip_dogru: false, karar: "devam", karar_ben: true, acilan_deger: 0, kasa_sonra: t * 2 })) });
  const sonuc = (ek) => ({ ...temel, faz: "sonuc", faz_bitis: iso(2900), cevap: null,
    sonuc: { tur: 7, altin: false, dogru_cevap: 1, benim_cevabim: 1, kazanan: null, ...ek } });
  switch (ad) {
    case "cevap": return temel;
    // +2, sahiplik rakipten bana
    case "sonuc2": return { ...sonuc({ artis: 2, kasa_once: 8, kasa_sonra: 10, sahip_once: RAKIP, sahip_sonra: ben, ben_dogru: true, rakip_dogru: false }), kasa: 10, sahip: ben };
    // +6, ikisi doğru, sahip değişmez
    case "sonuc6": return { ...sonuc({ artis: 6, kasa_once: 8, kasa_sonra: 14, sahip_once: RAKIP, sahip_sonra: RAKIP, ben_dogru: true, rakip_dogru: true }), kasa: 14 };
    // yanlış: rakip tek bildi (+2, rakipte kalır)
    case "sonuc-yanlis": return { ...sonuc({ artis: 2, kasa_once: 8, kasa_sonra: 10, sahip_once: RAKIP, sahip_sonra: RAKIP, benim_cevabim: 0, ben_dogru: false, rakip_dogru: true }), kasa: 10 };
    case "karar-ben": return { ...temel, faz: "karar", sahip: ben, kasa: 12, soru: null, cevap: null, faz_bitis: iso(7000), karar: { veren: ben, deger: 12 }, sureler: { ...temel.sureler, gosterim_bas: iso(-1000) } };
    case "karar-ben-son": return { ...durum("karar-ben", ben), faz_bitis: iso(2600) };
    case "karar-rakip": return { ...temel, faz: "karar", sahip: RAKIP, kasa: 14, soru: null, cevap: null, faz_bitis: iso(6000), karar: { veren: RAKIP, deger: 14 }, sureler: { ...temel.sureler, gosterim_bas: iso(-1000) } };
    case "karar-rakip-son": return { ...durum("karar-rakip", ben), faz_bitis: iso(2600) };
    case "cevap-ac": return { ...temel, tur: 7, kasa: 0, sahip: null, son_karar: { veren: ben, ac: true, deger: 12 },
      oyuncular: [oyuncu(ben, "Sen", 20 - 2, 2), oyuncu(RAKIP, "Deniz Yıldırımoğlu", 12, 2)].map((o) => (o.id === ben ? { ...o, puan: 8 + 12 } : o)),
      cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false }, faz_bitis: iso(16000), sureler: { ...temel.sureler, gosterim_bas: iso(1500) } };
    case "cevap-ac-rakip": return { ...temel, kasa: 0, sahip: null, son_karar: { veren: RAKIP, ac: true, deger: 14 },
      oyuncular: [oyuncu(ben, "Sen", 8, 1), oyuncu(RAKIP, "Deniz Yıldırımoğlu", 12 + 14 - 10, 3)],
      cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false }, faz_bitis: iso(16000), sureler: { ...temel.sureler, gosterim_bas: iso(1500) } };
    case "cevap-yeni-tur": return { ...temel, tur: 8, sahip: null, kasa: 10, cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false }, faz_bitis: iso(16000), sureler: { ...temel.sureler, gosterim_bas: iso(1500) } };
    // ---------- 951 ----------
    // maç başı: 3-2-1 (0–3 sn) → giriş sahnesi (3–6 sn); ilk soru 4,5. sn'de açılır, sayaç 6. sn'de başlar
    case "giris": return { ...temel, faz: "baslangic", tur: 0, kasa: 0, sahip: null, soru: null, cevap: null, joker: null, rakip_joker: null,
      oyuncular: [oyuncu(ben, "Sen", 0, 0), oyuncu(RAKIP, "Deniz Yıldırımoğlu", 0, 0)],
      faz_bitis: isoC(4500), sureler: { ...temel.sureler, gosterim_bas: null, benim_bitis: null, faz_son: isoC(4500) } };
    case "giris-soru": return { ...durum("giris", ben), faz: "cevap", tur: 1, soru: SORU, joker: BOS_JOKER, rakip_joker: [],
      cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false }, faz_bitis: isoC(21000),
      sureler: { ...temel.sureler, gosterim_bas: isoC(6000), benim_bitis: isoC(21000), faz_son: isoC(21000) } };
    // maç sonu: AÇ ile hedef (kazanan ben / rakip)
    case "bitti-final-ben": return bittiFinal(ben, 14, 54, 31);
    case "bitti-final-rakip": return bittiFinal(RAKIP, 14, 31, 54);
    // joker: kasa bende ama 10'un altında (kilitli AÇ), rakip henüz joker kullanmadı
    case "cevap-joker": return acikSoru({ sahip: ben, kasa: 6 });
    // rakip Zaman Baskısı kullandı: benim bitişim 5 sn kısaldı
    case "cevap-joker-rakip": return acikSoru({ sahip: ben, kasa: 6, rakip_joker: ["zaman_baskisi"], joker: { ...BOS_JOKER, kisaltildi: true },
      sureler: { ...temel.sureler, gosterim_bas: iso(-1000), benim_bitis: iso(9000), faz_son: iso(14000) } });
    // 50:50 kullandım: iki yanlış şık bende kapalı
    case "cevap-joker-elli": return acikSoru({ sahip: ben, kasa: 6, joker: { ...BOS_JOKER, turler: ["elli"], kapali: [0, 3] } });
    // kasa büyüdü: ≥ 40 alev (mini kasa) / karar ekranında büyük kasa
    case "cevap-alev": return acikSoru({ sahip: RAKIP, kasa: 44 });
    case "cevap-isik": return acikSoru({ sahip: ben, kasa: 24 });
    case "karar-alev": return { ...durum("karar-ben", ben), kasa: 42, karar: { veren: ben, deger: 42 } };
    case "bitti": return { ...temel, durum: "bitti", faz: "sonuc", kazanan: ben, sonuc_neden: "hedef", kasa: 0, sahip: null,
      oyuncular: [oyuncu(ben, "Sen", 21, 3), oyuncu(RAKIP, "Deniz Yıldırımoğlu", 14, 2)], terk: { ben: false, rakip: false },
      gecmis: [1, 2].map((t) => ({ tur: t, altin: false, kategori: "cografya", soru: SORU.soru, secenekler: SORU.secenekler, dogru_cevap: 1, benim_cevabim: 1, ben_dogru: true, rakip_dogru: false, karar: "devam", karar_ben: true, acilan_deger: 0, kasa_sonra: t * 2 })) };
    default: return temel;
  }
}
const OZET = (ben) => ({ kaynak: `kasa:${KASA_ID}`, hazir: true, bitti: true, kazanan: ben, terk: { ben: false, rakip: false, edenler: [] },
  dokum: { hazir: true, kalemler: [{ kalem: "galibiyet", lig: 25, coin: 30, detay: {} }], rozetler: [], toplam: { lig: 25, coin: 30 }, gorevler: [] },
  level: { hazir: true, xp: 30, level_once: 3, level_sonra: 3, level: 3, level_xp: 40, level_gereken: 65, indirim: null, oynamadi: false, level_coin: 0, rutbe_coin: 0, skiller: [] },
  lig: { puan: 25 }, rozetler: [], gorevler: [], haftalik_gorevler: [] });

// [ad, önceki senaryo, sonraki senaryo, beklenen seçici, görüntü anları (ms)]
const ANLAR = [
  ["a-sonuc-2-sahiplik", "cevap", "sonuc2", ".ks-bant", [350, 800, 1150, 1500, 2050]],
  ["b-sonuc-6", "cevap", "sonuc6", ".ks-bant", [350, 800, 1150, 1500]],
  ["c-sonuc-yanlis", "cevap", "sonuc-yanlis", ".ks-bant", [300, 1150]],
  ["d-ac-ben", "karar-ben", "cevap-ac", ".ks-ac-an", [150, 480, 700, 1000, 1350, 1800]],
  ["e-ac-rakip", "karar-rakip", "cevap-ac-rakip", ".ks-ac-an", [480, 1000, 1350]],
  ["f-yeni-tur", "sonuc2", "cevap-yeni-tur", ".m2-gecis", [200]],
  // 951
  ["n-final-kazandi", "karar-ben", "bitti-final-ben", ".ks-final", [300, 1000, 1600, 2100, 2450, 2800, 3400, 4100]],
  ["o-final-kaybetti", "karar-rakip", "bitti-final-rakip", ".ks-final", [300, 900, 1450, 2000, 2900]],
  ["p-rakip-joker", "cevap-joker", "cevap-joker-rakip", ".ks-rakip-joker-an", [150, 600, 1500]],
];
const DURAGAN = [
  // 951
  ["r-joker-cubugu", "cevap-joker", ".ks-joker-yuva .qt-skill", [600]],
  ["s-alev-mini", "cevap-alev", ".ks-alev", [500]],
  ["t-isik-mini", "cevap-isik", ".ks-kadran--isikli", [500]],
  ["u-karar-alev", "karar-alev", ".ks-alev", [500]],
  ["g-karar-ben", "karar-ben", ".ks-karar-eylem", [300, 800]],
  ["h-karar-ben-son", "karar-ben-son", ".ks-karar-eylem", [400]],
  ["i-karar-rakip", "karar-rakip", ".ks-karar--bekle", [300]],
  ["j-karar-rakip-son", "karar-rakip-son", ".ks-karar--bekle", [400]],
  ["k-cevap", "cevap-yeni-tur", ".qt-sik", [1200]],
];

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const EKRANLAR = ARG.en ? [[Number(ARG.en), Number(ARG.en) === 360 ? 640 : 844]] : [[360, 640], [390, 844]];

for (const [w, h] of EKRANLAR) {
  const durumDosya = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  durumDosya.origins = (durumDosya.origins || []).map((o) => ({ ...o, origin: kok,
    localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim"].includes(x.name)), { name: "bildim_dil", value: "tr" }, { name: "bildim_tanitim", value: "1" }] }));
  const b = await tarayici.newContext({ storageState: durumDosya, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block",
    reducedMotion: ARG.azalt ? "reduce" : "no-preference" });
  const s = await b.newPage();
  const konsol = [];
  s.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  let senaryo = "cevap";
  const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };
  await s.route(/\/rest\/v1\/(oyun_ayarlari|rpc\/|profiles)/, async (r) => {
    const req = r.request(); const u = req.url();
    const json = (veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
    try {
      if (u.includes("/rpc/kasa_durum")) return json(durum(senaryo, jwtSub(req)));
      // 951 joker taklitleri (çubuk Klasik bileşeni; envanter/durum burada sabit)
      if (u.includes("/rpc/kasa_joker_durumu")) {
        const elli = senaryo === "cevap-joker-elli";
        return json({ sinir: 6, kullanilan: elli ? 1 : 0, ucretsiz_elli_kaldi: false, kilitli: false, kisaltildi: senaryo === "cevap-joker-rakip",
          sis_bitis: null, sunucu_zamani: new Date().toISOString(), kullanilan_turler: elli ? ["elli"] : [], kullanim_sayilari: elli ? { elli: 1 } : {},
          tur_basi_sinir: 2, soru_basi_sinir: 1, soruda_kullanildi: elli });
      }
      if (u.includes("/rpc/kasa_joker")) { senaryo = "cevap-joker-elli"; return json({ tur: "elli", kapali: [0, 3], satin_alindi: false, odenen: 0, coin: 9999 }); }
      if (u.includes("/rpc/envanterim")) return json([{ tur: "elli", adet: 3 }, { tur: "sure", adet: 2 }, { tur: "zaman_baskisi", adet: 1 }, { tur: "ikinci_sans", adet: 1 }]);
      if (u.includes("/rpc/kasa_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
      if (u.includes("/rpc/kasa_aktif_benim")) return json([]);
      if (/\/rpc\/kasa_(cevap|karar|terk|ara|davet|aramadan)/.test(u)) return json({ message: "Ölçüm aracı: yazma kapalı" }, 400);
      if (u.includes("/rpc/mac_sonu_ozet") && req.postData()?.includes("kasa:")) return json(OZET(jwtSub(req)));
      const y = await r.fetch();
      let m = await y.text();
      if (u.includes("/rest/v1/oyun_ayarlari")) {
        const liste = JSON.parse(m).filter((x) => !String(x.anahtar).startsWith("kasa_"));
        for (const [anahtar, deger] of Object.entries(AYARLAR)) liste.push({ anahtar, deger });
        m = JSON.stringify(liste);
      }
      await r.fulfill({ response: y, body: m });
    } catch { try { await r.continue(); } catch { /* sayfa kapandı */ } }
  });
  const etiket = `${w}${ARG.azalt ? "-azalt" : ""}`;
  const kaydet = async (ad) => s.screenshot({ path: path.join(CIKTI, `${ad}-${etiket}.png`), fullPage: false });
  const ac = async (sen, q) => {
    senaryo = sen;
    capa = Date.now();
    await s.goto(`${ADRES}/kasa/${KASA_ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.waitForSelector(q, { timeout: 25000 });
    await s.waitForTimeout(700);
  };
  const tekEkran = async (ad) => {
    const o = await s.evaluate(() => ({ yatay: document.documentElement.scrollWidth - innerWidth, dikey: document.documentElement.scrollHeight - innerHeight }));
    ok(`${ad}: taşma yok (yatay ${o.yatay}, dikey ${o.dikey})`, o.yatay <= 0 && o.dikey <= 1);
  };
  console.log(`\n== ${w}×${h}${ARG.azalt ? " (azaltılmış hareket)" : ""}`);
  try {
    // ilk açılış (oturum ısınsın)
    await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" }); await s.waitForTimeout(2500);
    // gerçek bir dokunuş: userActivation açılsın (ses/titreşim yolu çalışsın, konsol temiz kalmalı)
    await s.mouse.click(5, 5);
    for (const [ad, once, sonra, q0, anlar] of ANLAR) {
      const q = ARG.azalt && q0 === ".ks-ac-an" ? ".ks-karar-satir" : q0;   // azaltılmış harekette AÇ katmanı yok, satır var
      await ac(once, once.startsWith("karar") ? ".ks-karar" : once.startsWith("sonuc") ? ".ks-bant" : ".qt-sik");
      senaryo = sonra;
      await s.evaluate(() => window.dispatchEvent(new Event("online")));
      let t0;
      try { await s.waitForSelector(q, { timeout: 8000, state: "attached" }); t0 = Date.now(); } catch { ok(`${ad}: ${q} çizildi`, false); continue; }
      ok(`${ad}: ${q} çizildi`, true);
      for (const ms of anlar) {
        const bekle = t0 + ms - Date.now();
        if (bekle > 0) await s.waitForTimeout(bekle);
        await kaydet(`${ad}-${String(ms).padStart(4, "0")}`);
        if (ad.startsWith("b-") && ms === anlar[0] && !ARG.azalt) ok(`${ad}: ÇİFTE bandı çizildi`, await s.locator(".ks-cifte").count() === 1);
      }
      await tekEkran(ad);
      if (ad.startsWith("d-ac") && !ARG.azalt) {
        await s.waitForTimeout(400);
        ok(`${ad}: AÇ katmanı bitince kalktı`, await s.locator(".ks-ac-an").count() === 0);
        ok(`${ad}: skor 20/20`, /20/.test(await s.locator(".ks-skor-satir--ben .ks-skor-sayi").innerText()));
      }
      if (ad.startsWith("a-")) {
        ok(`${ad}: mini kasa 10, sahip ben`, await s.locator(".ks-kadran--kucuk.ks-kadran--ben").count() === 1 && /10/.test(await s.locator(".ks-kadran--kucuk").innerText()));
      }
      if (ad.startsWith("n-") || ad.startsWith("o-")) {
        await s.waitForTimeout(ARG.azalt ? 800 : ad.startsWith("n-") ? 900 : 900);
        await s.waitForSelector(".msk, [class*=msk]", { timeout: 8000 }).catch(() => {});
        await kaydet(`${ad}-kutlama`);
        ok(`${ad}: sahne bitti → MacSonuKutlama`, await s.locator(".ks-final").count() === 0 && await s.locator("[class*=msk]").count() > 0);
      }
    }
    // 951 maç başı: 3-2-1 → giriş sahnesi → ilk soru (sunucu saatine bağlı; soru 4,5. sn'de açılır)
    {
      capa = Date.now() + 1500;   // sayfa yüklenirken 3-2-1'in başı kaçmasın
      senaryo = "giris";
      await s.goto(`${ADRES}/kasa/${KASA_ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      const bekleAn = async (ms) => { const b = capa + ms - Date.now(); if (b > 0) await s.waitForTimeout(b); };
      await bekleAn(1200); await kaydet("m-giris-0-geri-sayim");
      ok("m-giris: 3-2-1 görünür", await s.locator(".m1-sayim").count() === 1);
      for (const ms of [3250, 3700, 4250, 4700]) { await bekleAn(ms); await kaydet(`m-giris-${ms}`); }
      ok("m-giris: giriş sahnesi çizildi (KASA + hedef 50)", await s.locator(".ks-giris-an").count() === 1 && /50/.test(await s.locator(".ks-giris-hedef").innerText()));
      senaryo = "giris-soru";
      await s.evaluate(() => window.dispatchEvent(new Event("online")));
      await bekleAn(5300); await kaydet("m-giris-5300-soru-altta");
      ok("m-giris: soru açıldı ama sahne sürüyor (şıklar tıklanamaz)", await s.locator(".ks-giris-an").count() === 1);
      await bekleAn(6400); await kaydet("m-giris-6400-ilk-soru");
      ok("m-giris: sahne bitince ilk soru, sayaç dolu", await s.locator(".ks-giris-an").count() === 0 && await s.locator(".qt-sik").count() === 4);
      await tekEkran("m-giris");
    }
    // 951 joker: 50:50 dokunuşu (taklit kasa_joker) → kırılma → iki şık elendi
    {
      await ac("cevap-joker", ".ks-joker-yuva .qt-skill");
      ok("r-joker: kilitli AÇ rozeti (kasa 6 < 10)", await s.locator(".ks-ac-kilit").count() === 1 && /10/.test(await s.locator(".ks-ac-kilit").innerText()));
      const elliDugme = s.locator(".ks-joker-yuva .qt-skill", { hasText: "50:50" }).first();
      await elliDugme.click();
      const t0 = Date.now();
      for (const ms of [120, 450, 1000]) { const b = t0 + ms - Date.now(); if (b > 0) await s.waitForTimeout(b); await kaydet(`q-joker-elli-${String(ms).padStart(4, "0")}`); }
      ok("q-joker-elli: iki şık elendi", await s.locator(".qt-sik--elendi").count() === 2);
      await tekEkran("q-joker-elli");
    }
    for (const [ad, sen, q, anlar] of DURAGAN) {
      await ac(sen, q);
      for (const ms of anlar) { await s.waitForTimeout(ms); await kaydet(`${ad}-${String(ms).padStart(4, "0")}`); }
      await tekEkran(ad);
      if (ad.endsWith("-son")) ok(`${ad}: gerilim (kızarma) açık`, await s.locator(".ks-kadran--gergin").count() === 1);
      const kucuk = await s.evaluate(() => [...document.querySelectorAll(".ks-mac button, .ks-mac .qt-sik")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && !e.closest(".qt-oyuncu") && (r.width < 44 || r.height < 44); }).length);
      ok(`${ad}: dokunma hedefi ≥ 44`, kucuk === 0);
    }
    senaryo = "bitti";
    await s.goto(`${ADRES}/kasa/${KASA_ID}`, { waitUntil: "domcontentloaded" });
    await s.waitForSelector(".msk, [class*=msk]", { timeout: 20000 });
    for (const ms of [900, 1500, 2600]) { await s.waitForTimeout(ms === 900 ? 900 : ms - (ms === 1500 ? 900 : 1500)); await kaydet(`l-bitti-${ms}`); }
    ok("maç sonu: altın yağmuru katmanı", ARG.azalt ? await s.locator(".ks-yagmur").count() === 0 : await s.locator(".ks-yagmur").count() === 1);
  } catch (e) {
    kaldi++; console.log("  ✗ HATA:", e.message);
  }
  const ilgili = konsol.filter((k) => !/favicon|ERR_ABORTED|net::ERR_FAILED.*(avatars|ses)|Ölçüm aracı/i.test(k));
  ok(`konsol hatası yok (${etiket})`, ilgili.length === 0, ilgili.slice(0, 4).join(" | "));
  await b.close();
}
await tarayici.close();
console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı — görüntüler: tasarim/kasa-efekt/`);
if (kaldi) process.exitCode = 1;
