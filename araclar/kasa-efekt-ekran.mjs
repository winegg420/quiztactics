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
  kasa_hedef_puan: 20, kasa_max_tur: 24, kasa_soru_sn: 15, kasa_karar_sn: 8, kasa_sonuc_sn: 3 };
const SORU = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], kategori: "cografya" };

function durum(ad, ben) {
  const simdi = Date.now();
  const iso = (ms) => new Date(simdi + ms).toISOString();
  const oyuncu = (id, ad, puan, acma) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/basortulu-y04.svg" : null, gorunum: null, unvan: null, puan, acma });
  const temel = {
    id: KASA_ID, durum: "aktif", dereceli: true, faz: "cevap", faz_bitis: iso(12000), sunucu_zamani: new Date(simdi).toISOString(),
    ben, tur: 7, max_tur: 24, hedef: 20, altin: false, artis: 2, ikisi_artis: 6, kasa: 8, sahip: RAKIP,
    oyuncular: [oyuncu(ben, "Sen", 8, 1), oyuncu(RAKIP, "Deniz Yıldırımoğlu", 12, 2)],
    karar: null, son_karar: null, soru: SORU, cevap: { ben_cevapladim: true, benim_cevabim: 1, rakip_cevapladi: true }, sonuc: null,
    sureler: { soru: 15, karar: 8, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 1500, gosterim_bas: iso(-2000) },
    kopuk: null, kazanan: null, sonuc_neden: null, terk: null, baglanmayan: null, gecmis: null,
  };
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
];
const DURAGAN = [
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
