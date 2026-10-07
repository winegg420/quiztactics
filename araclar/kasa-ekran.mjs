// KASA (deneysel, 950) ekran ölçümü — TAKLİT VERİYLE (migration canlıda olmadığı için gerçek hesap testi DEĞİL).
// SUNUCUYA YAZMAZ: kasa_* RPC'leri ve oyun_ayarlari'nın kasa satırları tarayıcıda taklit edilir (page.route);
// diğer istekler (profil, ana sayfa verisi) gerçek oturumla okunur.
// Ölçer: yatay taşma · maç ekranı tek ekrana sığıyor mu (dikey kaydırma yok) · 44 px altı dokunma hedefi ·
// kontrast (hesaplanan renklerden) · konsol hatası · beklenen metinler. Çıktı: tasarim/kasa/*.png + olcum.json
// Kullanım: npm run dev -- --port 5188 (başka kabukta) · node araclar/kasa-ekran.mjs --adres=http://localhost:5188 [--dil=tr|en] [--en=360]
// Oturum: araclar/arayuz-denetim.mjs'in yazdığı .arayuz-denetim-oturum.json (git'e girmez).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const OTURUM = path.resolve(typeof ARG.oturum === "string" ? ARG.oturum : ".arayuz-denetim-oturum.json");   // --oturum=dosya: kendi test hesabın
const CIKTI = path.resolve("tasarim/kasa");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }

const KASA_ID = "0b6f6800-0000-4000-8000-00000000c0de";
const RAKIP = "0b6f6800-0000-4000-8000-0000000000aa";
const AYARLAR = { kasa_modu_acik: 1, kasa_odul_acik: 1, kasa_odul_carpani: 1, kasa_artis: 2, kasa_ikisi_dogru_artis: 6,
  kasa_hedef_puan: 80, kasa_max_tur: 36, kasa_soru_sn: 15, kasa_karar_sn: 5, kasa_sonuc_sn: 3, kasa_tavan: 60, kasa_devam_carpan: 2, kasa_acma_min: 0 };   // 958 (956: hedef 60, acma_min 10; 955: 30 / 1.25)
const SORU = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], kategori: "cografya" };
const SORU_UZUN = { soru: "Osmanlı İmparatorluğu'nda Lale Devri olarak anılan dönem hangi padişahın saltanatı sırasında yaşanmış ve hangi antlaşmayla başlamıştır?",
  secenekler: ["III. Ahmed · Pasarofça Antlaşması", "II. Mahmud · Edirne Antlaşması", "IV. Murad · Kasr-ı Şirin Antlaşması", "I. Mahmud · Belgrad Antlaşması"], kategori: "tarih" };

// Senaryo → kasa_durum yanıtı (ben = oturumdaki kullanıcı)
function durum(ad, ben) {
  const simdi = Date.now();
  const iso = (ms) => new Date(simdi + ms).toISOString();
  const oyuncu = (id, ad, puan, acma) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/basortulu-y04.svg" : null, gorunum: null, unvan: null, puan, acma });
  const temel = {
    id: KASA_ID, durum: "aktif", dereceli: true, faz: "cevap", faz_bitis: iso(12000), sunucu_zamani: new Date(simdi).toISOString(),
    ben, tur: 7, max_tur: 24, hedef: 20, altin: false, artis: 2, ikisi_artis: 6, kasa: 8, sahip: ben,
    oyuncular: [oyuncu(ben, "Sen", 8, 1), oyuncu(RAKIP, "Deniz Yıldırımoğlu", 12, 2)],
    karar: null, son_karar: null, soru: null, cevap: null, sonuc: null,
    sureler: { soru: 15, karar: 8, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 1500, gosterim_bas: null },
    kopuk: null, kazanan: null, sonuc_neden: null, terk: null, baglanmayan: null, gecmis: null,
  };
  switch (ad) {
    case "baslangic": return { ...temel, faz: "baslangic", tur: 0, kasa: 0, sahip: null, faz_bitis: iso(2600), oyuncular: [oyuncu(ben, "Sen", 0, 0), oyuncu(RAKIP, "Deniz Yıldırımoğlu", 0, 0)] };
    case "karar-ben": return { ...temel, faz: "karar", faz_bitis: iso(7000), karar: { veren: ben, deger: 8 }, sureler: { ...temel.sureler, gosterim_bas: iso(-1000) } };
    case "karar-rakip": return { ...temel, faz: "karar", sahip: RAKIP, kasa: 14, faz_bitis: iso(6000), karar: { veren: RAKIP, deger: 14 }, sureler: { ...temel.sureler, gosterim_bas: iso(-1000) } };
    case "cevap": return { ...temel, soru: SORU, son_karar: { veren: ben, ac: false, deger: 8 }, cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: true }, sureler: { ...temel.sureler, gosterim_bas: iso(-2000) } };
    case "cevap-uzun": return { ...temel, soru: SORU_UZUN, sahip: RAKIP, son_karar: { veren: RAKIP, ac: true, deger: 10 }, kasa: 0, cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false }, sureler: { ...temel.sureler, gosterim_bas: iso(-2000) } };
    case "sonuc": return { ...temel, faz: "sonuc", faz_bitis: iso(2500), soru: SORU, kasa: 10, sahip: ben,
      sonuc: { tur: 7, altin: false, dogru_cevap: 1, artis: 2, kasa_once: 8, kasa_sonra: 10, sahip_once: RAKIP, sahip_sonra: ben, kazanan: null, benim_cevabim: 1, ben_dogru: true, rakip_dogru: false } };
    case "altin": return { ...temel, altin: true, tur: 25, kasa: 0, sahip: null, soru: SORU, oyuncular: [oyuncu(ben, "Sen", 16, 3), oyuncu(RAKIP, "Deniz Yıldırımoğlu", 16, 2)], cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false }, sureler: { ...temel.sureler, gosterim_bas: iso(-2000) } };
    case "bitti": return { ...temel, durum: "bitti", faz: "sonuc", kazanan: ben, sonuc_neden: "hedef", kasa: 0, sahip: null, soru: SORU,
      oyuncular: [oyuncu(ben, "Sen", 21, 3), oyuncu(RAKIP, "Deniz Yıldırımoğlu", 14, 2)], terk: { ben: false, rakip: false },
      gecmis: [1, 2, 3].map((t) => ({ tur: t, altin: false, kategori: "cografya", soru: SORU.soru, secenekler: SORU.secenekler, dogru_cevap: 1, benim_cevabim: t === 2 ? 0 : 1, ben_dogru: t !== 2, rakip_dogru: t === 3, karar: t === 3 ? "ac" : "devam", karar_ben: true, acilan_deger: 12, kasa_sonra: t * 2 })) };
    default: return temel;
  }
}
const OZET = (ben) => ({ kaynak: `kasa:${KASA_ID}`, hazir: true, bitti: true, kazanan: ben, terk: { ben: false, rakip: false, edenler: [] },
  dokum: { hazir: true, kalemler: [{ kalem: "galibiyet", lig: 25, coin: 30, detay: {} }], rozetler: [], toplam: { lig: 25, coin: 30 }, gorevler: [] },
  level: { hazir: true, xp: 30, level_once: 3, level_sonra: 3, level: 3, level_xp: 40, level_gereken: 65, indirim: null, oynamadi: false, level_coin: 0, rutbe_coin: 0, skiller: [] },
  lig: { puan: 25 }, rozetler: [], gorevler: [], haftalik_gorevler: [] });

const OLC = () => {
  const ayril = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const kar = (ust, alt) => ({ r: ust.r * ust.a + alt.r * (1 - ust.a), g: ust.g * ust.a + alt.g * (1 - ust.a), b: ust.b * ust.a + alt.b * (1 - ust.a), a: 1 });
  const zemin = (el) => { const z = []; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.backgroundImage && s.backgroundImage !== "none") return null; const c = ayril(s.backgroundColor); if (c && c.a > 0) { z.push(c); if (c.a >= 1) break; } } let t = { r: 255, g: 255, b: 255, a: 1 }; for (const c of z.reverse()) t = kar(c, t); return t; };
  const gorunur = (el) => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const s = getComputedStyle(el); if (s.visibility === "hidden" || s.display === "none") return false; for (let e = el; e; e = e.parentElement) if (+getComputedStyle(e).opacity < 0.05) return false; return true; };
  const yol = (el) => { const c = (el.className && el.className.baseVal === undefined ? String(el.className) : "").trim().split(/\s+/).slice(0, 2).join("."); return el.tagName.toLowerCase() + (c ? "." + c : ""); };
  const kok = document.querySelector(".ks-mac, .ks-giris, .a-modlar-izgara, .as-a-kisayol, .ks-bitti") ? document.body : document.body;
  const kontrast = [];
  const w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT);
  const gor = new Set();
  for (let n; (n = w.nextNode()); ) {
    const t = n.nodeValue.trim(); const el = n.parentElement;
    if (!t || !el || gor.has(el) || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName) || !gorunur(el)) continue;
    if (!el.closest(".ks-mac, .ks-giris, .qt-mod--kasa, .as-renk--kasa, .as-mod-serit--kasa, .ks-bitti")) continue;   // yalnız Kasa'nın kendi öğeleri
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
  const hedefler = [...document.querySelectorAll(".ks-mac button, .ks-mac .qt-sik, .ks-giris button, .as-renk--kasa, .as-mod-serit--kasa, .qt-mod--kasa")]
    .filter((e) => gorunur(e) && !e.closest(".qt-oyuncu-ad, .qt-oyuncu"));
  const kucuk = hedefler.filter((e) => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map((e) => `${yol(e)} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
  // kesik metin: Kasa öğelerinde yazı kutusuna sığmıyor (ad kısaltması … bilerek; yalnız skor/kadran/bant/düğme)
  const kesik = [...document.querySelectorAll(".ks-skor-ad, .ks-skor-sayi, .ks-kadran-sahip, .ks-bant b, .ks-karar-baslik, .ks-mac .qt-dugme, .ks-deneysel, .as-kisayol-etiket, .ks-tur")]
    .filter((e) => gorunur(e) && (e.scrollWidth > e.clientWidth + 1)).map((e) => `${yol(e)}: ${e.textContent.trim().slice(0, 30)}`);
  const mac = document.querySelector(".ks-mac");
  // 955: giriş sahnesi overflow:hidden — içindeki ışık halkası / düşen sandık kırpılır, ölçüme girmez (sahnenin kendisi girer)
  const altKenar = mac ? Math.max(...[...mac.querySelectorAll("*")].filter((e) => gorunur(e) && !e.parentElement?.closest(".ks-giris-an")).map((e) => e.getBoundingClientRect().bottom)) : 0;
  return {
    yatayTasma: document.documentElement.scrollWidth - window.innerWidth, tasan,
    dikeyTasma: Math.round(document.documentElement.scrollHeight - window.innerHeight),
    macAltKenar: Math.round(altKenar), ekran: window.innerHeight,
    kucukHedef: kucuk, kontrast, kesik,
    metin: (document.querySelector(".ks-mac, .ks-giris, .ks-bitti, .a-modlar-izgara, main") ?? document.body).innerText.replace(/\s+/g, " ").slice(0, 400),
  };
};

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
const sonuc = {};
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const DILLER = ARG.dil ? [ARG.dil] : ["tr", "en"];
const EKRANLAR = ARG.en ? [[Number(ARG.en), Number(ARG.en) === 360 ? 640 : 844]] : [[360, 640], [390, 844]];

for (const dil of DILLER) {
  for (const [w, h] of EKRANLAR) {
    const durumDosya = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
    durumDosya.origins = (durumDosya.origins || []).map((o) => ({ ...o, origin: kok,
      localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim"].includes(x.name)), { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" }] }));
    const b = await tarayici.newContext({ storageState: durumDosya, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block" });
    const s = await b.newPage();
    const konsol = [];
    s.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 200)); });
    s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
    let senaryo = "cevap";
    let modAcik = 1;
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
        // Yavaş/düşen Supabase'de ayar okuması boş kalırsa uygulama Ortak Hazine'yi KAPALI sayar → ölçüm yanlış alarm verir.
        // Ayar isteği gerçek yanıt alamazsa yalnız taklit kasa ayarlarıyla yanıtlanır (öteki ayarlar varsayılana düşer).
        const y = await r.fetch({ timeout: 20000 }).catch((e) => { if (u.includes("/rest/v1/oyun_ayarlari")) return null; throw e; });
        if (!y || (u.includes("/rest/v1/oyun_ayarlari") && !y.ok())) {
          return json(Object.entries({ ...AYARLAR, kasa_modu_acik: modAcik }).map(([anahtar, deger]) => ({ anahtar, deger })));
        }
        let m = (await y.text()).replace(/"dil":\s*"(tr|en)"/g, `"dil":"${dil}"`);
        if (u.includes("/rest/v1/oyun_ayarlari")) {
          const liste = JSON.parse(m).filter((x) => !String(x.anahtar).startsWith("kasa_"));
          for (const [anahtar, deger] of Object.entries({ ...AYARLAR, kasa_modu_acik: modAcik })) liste.push({ anahtar, deger });
          m = JSON.stringify(liste);
        }
        await r.fulfill({ response: y, body: m });
      } catch { try { await r.continue(); } catch { /* sayfa kapandı */ } }
    });
    const etiket = `${w}-${dil}`;
    const ac = async (yol, bekle = 2500) => { await s.goto(ADRES + yol, { waitUntil: "domcontentloaded", timeout: 30000 }); await s.waitForTimeout(bekle); };
    const bekle = async (q, sure = 25000) => { try { await s.waitForSelector(q, { timeout: sure }); await s.waitForTimeout(500); return true; } catch { return false; } };
    const kaydet = async (ad) => s.screenshot({ path: path.join(CIKTI, `${ad}-${etiket}.png`), fullPage: false });
    const olc = async (ad) => { const o = await s.evaluate(OLC); sonuc[`${ad}-${etiket}`] = o; return o; };
    const ortak = (ad, o, macEkrani = false) => {
      ok(`${ad}: yatay taşma yok`, o.yatayTasma <= 0, JSON.stringify(o.tasan));
      ok(`${ad}: dokunma hedefi ≥ 44 px`, o.kucukHedef.length === 0, o.kucukHedef.join(" | "));
      ok(`${ad}: kontrast ≥ 4,5 (büyük ≥ 3)`, o.kontrast.length === 0, JSON.stringify(o.kontrast.slice(0, 4)));
      ok(`${ad}: kesik metin yok`, o.kesik.length === 0, o.kesik.join(" | "));
      if (macEkrani) ok(`${ad}: tek ekranda (dikey kaydırma yok, içerik ${o.macAltKenar}/${o.ekran} px)`, o.dikeyTasma <= 1 && o.macAltKenar <= o.ekran + 1, `kaydırma ${o.dikeyTasma}`);
    };
    console.log(`\n== ${w}×${h} ${dil}`);
    try {
      await ac("/", 1500);
      await bekle(".as-sayfa, .a-icerik", 40000);
      // 1) Ana sayfa: Kasa kısayolu (Deneysel), 5'li satır, sayfa kaydırılmıyor
      await ac("/", 800);
      // 6 Eki 2026: ana sayfada Kasa kısayolu yerine "Ortak Hazine" mod şeridi (Klasik · Düello · Ortak Hazine)
      const varAna = await bekle(".as-mod-serit--kasa", 30000);   // yavaş Supabase: ana sayfa verisi 15 sn+ sürebiliyor
      let o = await olc("ana");
      if (w < 1024) {
        ok("ana sayfa: Ortak Hazine şeridi (Kasa adı yok)", varAna && /Ortak Hazine|Shared Treasure/.test(await s.locator(".as-mod-serit--kasa").innerText()) && !/Kasa|Vault/.test(await s.locator(".as-mod-serit--kasa").innerText()));
        ok("ana sayfa: üç eşit mod şeridi", await s.locator(".as-mod-serit").count() === 3);
        ok("ana sayfa: yatay taşma yok", o.yatayTasma <= 0, JSON.stringify(o.tasan));
        ok("ana sayfa: Kasa kısayolu ≥ 44 px ve kontrast", o.kucukHedef.length === 0 && o.kontrast.length === 0, JSON.stringify([o.kucukHedef, o.kontrast]));
        const kisayolAlt = await s.evaluate(() => document.querySelector(".as-a-kisayol")?.getBoundingClientRect().bottom ?? 0);
        ok(`ana sayfa: kısayollar ekranda (alt ${Math.round(kisayolAlt)}/${h}), sayfa kaydırılmıyor`, kisayolAlt <= h && o.dikeyTasma <= 1, `kaydırma ${o.dikeyTasma}`);
      }
      await kaydet("01-ana");

      // 2) Modlar: Kasa kartı (7 Eki 2026: "Deneysel" rozeti kalktı — kart adı Ortak Hazine)
      await ac("/modlar", 800); await bekle(".qt-mod--kasa");
      await s.locator(".qt-mod--kasa").scrollIntoViewIfNeeded();
      o = await olc("modlar");
      { const kart = await s.locator(".qt-mod--kasa").innerText(); ok("Modlar: Ortak Hazine kartı (Deneysel rozeti yok)", /Ortak Hazine|Shared Treasure/.test(kart) && !/Deneysel|Experimental/.test(kart), kart.slice(0, 80)); }
      ortak("Modlar", o);
      await kaydet("02-modlar");

      // 3) Giriş
      await ac("/kasa", 800); await bekle(".ks-giris");
      o = await olc("giris");
      ok("Giriş: başlık + 3 maddelik özet + Tüm kurallar + Rakip ara", await s.locator(".ks-deneysel").count() === 0 && await s.locator(".ks-ozet li").count() === 3 && await s.locator(".ks-kurallar-tum .ks-kurallar li").count() >= 7 && await s.getByRole("button", { name: /Rakip ara|Find opponent/ }).count() === 1);   // 990: özet + açılır tam liste (987 Savunma Hakkı satırı ayara bağlı)   // 951: + jokerler · 955: + tavan + karar süresi · 958: AÇ alt sınırı satırı yok (acma_min 0)
      ok("Giriş (958): hedef 80 puan, 'en az' satırı yok", /80 (puana|points)/.test(o.metin) && !/en az|at least/i.test(await s.locator(".ks-kurallar").innerText()), o.metin.slice(0, 200));
      ortak("Giriş", o);
      await kaydet("03-giris");

      // 4–10) Maç fazları
      const fazlar = [
        ["baslangic", ".ks-giris-an", "04-baslangic", null],   // 955: tek katman giriş sahnesi
        ["karar-ben", ".ks-karar-eylem", "05-karar-ben", /AÇ|OPEN/],
        ["karar-rakip", ".ks-karar--bekle", "06-karar-rakip", /Rakip karar veriyor|Opponent is deciding/],
        ["cevap", ".qt-sik", "07-cevap", /Devam ettin|You kept it/],
        ["cevap-uzun", ".qt-sik", "08-cevap-uzun", /Rakip hazineyi açtı|Rakip kasayı açtı|Opponent opened/],
        ["sonuc", ".ks-bant", "09-sonuc", /Tek başına bildin|Only you got it/],
        ["altin", ".qt-sik", "10-altin", /ALTIN SORU|GOLDEN QUESTION/],
      ];
      for (const [sen, q, ad, beklenen] of fazlar) {
        senaryo = sen;
        await ac(`/kasa/${KASA_ID}`, 500);
        const geldi = await bekle(q, 15000);
        await s.waitForTimeout(sen === "baslangic" ? 300 : 900);
        o = await olc(ad);
        ok(`${ad}: faz çizildi (${q})`, geldi);
        if (beklenen) ok(`${ad}: beklenen metin`, beklenen.test(o.metin), o.metin.slice(0, 160));
        ortak(ad, o, true);
        await kaydet(ad);
      }
      // kadran: karar ekranında büyük, cevapta küçük; sızıntı yok (taklit veri zaten içermez — çizimde "bot" yok)
      // 11) Maç sonu
      senaryo = "bitti";
      await ac(`/kasa/${KASA_ID}`, 800);
      const sonVar = await bekle(".msk, .mss, [class*=msk]", 20000);
      await s.waitForTimeout(1800);
      o = await olc("bitti");
      const sonMetin = await s.locator("body").innerText();
      ok("Maç sonu sahnesi çizildi (21-14, Kasa alt yazısı)", sonVar && /21/.test(sonMetin) && /14/.test(sonMetin) && /Hazineyi açtın|Kasayı açtın|opened the vault|opened the treasure/.test(sonMetin), sonMetin.replace(/s+/g, " ").slice(0, 120));
      // 957: Kasa'da da rövanş var (Düello ile aynı akış)
      ok("Maç sonu: Rövanş düğmesi ve Yeni maç var", /Rövanş|Rematch/.test(sonMetin) && /Yeni maç|New match/.test(sonMetin));
      ok("Maç sonu: yatay taşma yok", o.yatayTasma <= 0, JSON.stringify(o.tasan));
      // 7 Eki 2026: Ortak Hazine'ye özel özet — açılan hazineler + en büyük hazine (taklit: 3. turda ben 12 açtım)
      const acl = await s.evaluate(() => { const e = document.querySelector(".msk-mod-ozet .ks-acilan"); if (!e) return null; const r = e.getBoundingClientRect();
        const kesik = [...e.querySelectorAll(".ks-acilan-taraf small, .ks-acilan-baslik, .ks-acilan-en")].filter((x) => x.scrollWidth > x.clientWidth + 1).length;
        return { metin: e.innerText.replace(/\s+/g, " "), sag: r.right, w: window.innerWidth, kesik,
          ben: e.querySelector(".ks-acilan-taraf--ben .ks-acilan-sayi")?.textContent, rakip: e.querySelector(".ks-acilan-taraf--rakip .ks-acilan-sayi")?.textContent }; });
      ok("Maç sonu: açılan hazineler (Sen 1 · +12, Rakip 0) + en büyük hazine 12", acl && acl.ben === "1" && acl.rakip === "0" && /\+12/.test(acl.metin)
        && (/En büyük hazine: 12 · sen açtın/.test(acl.metin) || /Biggest treasure: 12 · you opened it/.test(acl.metin)), JSON.stringify(acl));
      ok("Maç sonu özeti: taşma / kesik metin yok", acl && acl.sag <= acl.w + 1 && acl.kesik === 0, JSON.stringify(acl));
      await kaydet("11-bitti");

      // 12) Mod kapalı: kasa_modu_acik = 0
      modAcik = 0;
      await ac("/kasa", 2500);
      const kapaliMetin = await s.locator("body").innerText();
      ok("kapalı: /kasa kapalı-mod notu", /şu an kapalı|currently closed|closed/i.test(kapaliMetin), kapaliMetin.slice(0, 120));
      await kaydet("12-kapali");
      await ac("/modlar", 800); await bekle(".qt-mod--kasa");
      ok("kapalı: Modlar'da Kasa kartı kilitli", await s.locator(".qt-mod--kasa.qt-mod--kilitli").count() === 1);
      await ac("/", 2000);
      ok("kapalı: ana sayfada Ortak Hazine şeridi yok", await s.locator(".as-renk--kasa, .as-mod-serit--kasa").count() === 0);
    } catch (e) {
      kaldi++; console.log("  ✗ HATA:", e.message);
    }
    const ilgili = konsol.filter((k) => !/favicon|ERR_ABORTED|net::ERR_FAILED.*(avatars|ses)/i.test(k));
    sonuc[`konsol-${etiket}`] = ilgili;
    ok(`konsol hatası yok (${etiket})`, ilgili.length === 0, ilgili.slice(0, 4).join(" | "));
    await b.close();
  }
}
await tarayici.close();
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(sonuc, null, 2));
console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı — görüntüler: tasarim/kasa/`);
if (kaldi) process.exitCode = 1;
