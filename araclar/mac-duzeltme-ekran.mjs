// Maç düzeltmeleri (10 Eki 2026) — TAKLİT VERİYLE ekran testi. Maç RPC'leri (kasa_*, duello_*, mac_sonu_ozet, kalp_at)
// tarayıcıda taklit edilir; canlıya maç/cevap yazılmaz. Her senaryo tek sayfa açar (toplu deneme yok).
// Senaryolar:
//   K1 Hazine tur geçişi beklemesi: faz bitti ama sunucu yeni turu 9 sn vermiyor (yanıtlar 200) → bant ÇIKMAMALI
//   K2 Hazine bağlantı kopması: kasa_durum 16 sn yanıtsız → bant yalnız ≥ 10 sn sonra; soru metni/şıklar yerinde, kayma yok
//   K3 Hazine arka plan → ön plan: gizli sekmede nabız yok; görünür olunca hemen kasa_durum + kalp_at (toparlanma)
//   K4 Hazine maç sonu: özet 2,5 sn gecikmeli → boş sayfa anı olmamalı
//   D1 Düello cevap: cevaptan sonra sayaç durur, joker şeridi "Cevabın gitti · rakip bekleniyor"
//   D2 Düello kart: 1. adım → 2. adım kartların yeri değişmez (EN 360: başlık 2 satır → 1 satır); süre doldu notu kartları itmez
//   D3 Düello tur geçişi beklemesi: bant çıkmamalı
//   D4 Düello maç sonu: özet 2,5 sn gecikmeli → boş sayfa anı olmamalı
// Kullanım: node araclar/mac-duzeltme-ekran.mjs --adres=http://localhost:5231 --etiket=sonra [--dil=tr] [--yalniz=K1,D2]
//   "önce" için eski kodun yayında olduğu adres: --adres=https://quiztactics.com --etiket=once
// Oturum: .arayuz-denetim-oturum.json (arayuz-denetim.mjs yazar). Çıktı: tasarim/mac-duzeltme-10eki/<etiket>-*.png + <etiket>.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5231";
const ETIKET = ARG.etiket || "sonra";
const DIL = ARG.dil || "tr";
const YALNIZ = ARG.yalniz ? String(ARG.yalniz).split(",") : null;
const CIKTI = path.resolve("tasarim/mac-duzeltme-10eki");
fs.mkdirSync(CIKTI, { recursive: true });
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const KASA_ID = "0b6f6800-0000-4000-8000-00000000c0de";
const DUELLO_ID = "0d4e1100-0000-4000-8000-00000000d4d4";
const RAKIP = "0b6f6800-0000-4000-8000-0000000000aa";
const SORU = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], kategori: "cografya" };
const iso = (ms) => new Date(Date.now() + ms).toISOString();
const json = (r, veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };

// ---------------------------------------------------------------- taklit durumlar
function kasa(ben, o = {}) {
  const oy = (id, ad, puan) => ({ id, gorunen_ad: ad, gorunen_avatar: null, gorunum: null, unvan: null, puan, acma: 0 });
  return { id: KASA_ID, durum: "aktif", dereceli: false, faz: "cevap", faz_bitis: iso(12000), sunucu_zamani: new Date().toISOString(),
    ben, tur: 7, max_tur: 36, hedef: 80, altin: false, artis: 2, ikisi_artis: 6, kasa: 46, sahip: null,
    oyuncular: [oy(ben, "Sen", 0), oy(RAKIP, "Bot Deniz", 0)], karar: null, son_karar: null, soru: SORU,
    cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: true },
    sonuc: null, sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 2000, gosterim_bas: iso(-3000), benim_bitis: null, faz_son: null },
    kopuk: null, kazanan: null, sonuc_neden: null, terk: null, baglanmayan: null, gecmis: null, joker: {}, rakip_joker: [],
    tavan: 80, devam_carpan: 2, savunma_acik: false, savunma_hak: [], savunma: null, rovans: { isteyen: null, id: null, gecerli: false }, ezeli: null, ...o };
}
function duello(ben, o = {}, v4 = {}) {
  const oy = (id, ad, dogru) => ({ id, gorunen_ad: ad, gorunen_avatar: null, gorunum: null, dogru, unvan: null });
  const faz = o.faz ?? "cevap";
  const soruFazi = ["notr", "cevap", "son"].includes(faz);
  const bitis = o._bitis ?? iso(12000);
  return { surum: 4, id: DUELLO_ID, durum: "aktif", dereceli: false, faz, faz_bitis: bitis, sunucu_zamani: new Date().toISOString(), ben, rakip: RAKIP,
    oyuncular: [oy(ben, "Sen", 2), oy(RAKIP, "Bot Deniz", 2)],
    v4: { kontrol: ben, seri: 1, seri_hedef: 3, tur: 4, max_tur: 20, notr_seri: 0, notr_max: 5, son: false, soru_no: 6, kullanilan: [], ilk_mac: false,
      kart: null, benim_kategori: faz !== "kart" ? "tarih" : null, rakip_kategori: faz !== "kart" ? "sinema" : null, oto: faz !== "kart" ? false : null, ...v4 },
    soru: soruFazi ? { ...SORU, kategori: "tarih" } : null,
    cevap: soruFazi ? { benim_bitis: bitis, rakip_bitis: bitis, ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false, elli_kapali: null, ikinci_sans_ilk_cevap: null } : null,
    son_hamle: null,
    skill: { kapali: false, set: ["elli", "sure", "zaman_baskisi"], izinli: ["elli", "sure", "soru_degistir", "zaman_baskisi", "ikinci_sans"], toplam_hak: 4, tur_basi_hak: 2,
      soru_basi_hak: 1, kullanilan: 0, sayilar: {}, bu_soruda: 0, rakip_bu_soruda: false, soru_degistir_kilit: null, envanter: { elli: 3, sure: 2, zaman_baskisi: 1 }, fiyatlar: {}, coin: 120 },
    sureler: { kart: 10, kart_duyuru_ms: 900, cevap: 15, sonuc: 3, ek_sure: 5, zaman_baskisi_eksi: 5, nabiz: 10, kopuk: 25, gosterim_payi_ms: 2000, gosterim_bas: o._gb ?? iso(-4000) },
    kazanan: null, terk_eden: null, odul: null, ezeli: null, gecmis: null, rovans: { isteyen: null, id: null, gecerli: false }, ...o };
}
const OZET = (ben, kaynak) => ({ kaynak, hazir: true, bitti: true, kazanan: ben, terk: { ben: false, rakip: false, edenler: [] },
  dokum: { hazir: true, kalemler: [{ kalem: "galibiyet", lig: 0, coin: 15, detay: {} }], rozetler: [], toplam: { lig: 0, coin: 15 }, gorevler: [] },
  level: { hazir: true, xp: 30, level_once: 3, level_sonra: 3, level: 3, level_xp: 40, level_gereken: 65, indirim: null, oynamadi: false, level_coin: 0, rutbe_coin: 0, skiller: [] },
  lig: { puan: 0 }, rozetler: [], gorevler: [], haftalik_gorevler: [] });

// ---------------------------------------------------------------- sayfa ölçümleri
const ORNEK = () => {
  const bant = [...document.querySelectorAll(".m2-bant")].find((e) => /yeniden kuruluyor|Reconnecting|reconnect/i.test(e.textContent));
  const soru = document.querySelector(".qt-soru-karti, .m2-soru, .d4-soru-kart");
  const sik = document.querySelector(".qt-sik");
  const sahne = document.querySelector(".ks-sahne, .d4-sahne");
  const sayac = document.querySelector(".qt-sayac-sayi");
  const kart = document.querySelector(".d4-kart");
  const mac = document.querySelector(".ks-mac, .d4-arena");
  const sonucEkrani = document.querySelector(".msk-sahne, .msk, [class*='msk-']:not(.msk-bekle), .ks-bitti--final");
  const icerik = (document.querySelector("main, #root")?.innerText ?? "").trim().length;
  return { t: Date.now(), bant: Boolean(bant), soruMetni: (soru?.innerText ?? "").trim().length, sikY: sik ? Math.round(sik.getBoundingClientRect().top) : null,
    sikSinif: sik?.className ?? "", sahneY: sahne ? Math.round(sahne.getBoundingClientRect().top) : null, sayac: sayac?.textContent ?? null,
    kartY: kart ? Math.round(kart.getBoundingClientRect().top) : null, mac: Boolean(mac), sonuc: Boolean(sonucEkrani),
    bos: !mac && !sonucEkrani, icerik, metin: (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 300) };
};

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
const durumDosya = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
durumDosya.origins = (durumDosya.origins || []).slice(0, 1).map((o) => ({ ...o, origin: kok,
  localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil"].includes(x.name)), { name: "bildim_dil", value: DIL }, { name: "bildim_tanitim", value: "1" }] }));
const rapor = {};
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) gecti++; else kaldi++; console.log(`  ${kosul ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); };

async function senaryo(ad, { genislik = 390, yukseklik = 844, rpc, yol, adimlar }) {
  if (YALNIZ && !YALNIZ.includes(ad)) return;
  console.log(`\n== ${ad} (${ETIKET})`);
  const b = await tarayici.newContext({ storageState: durumDosya, viewport: { width: genislik, height: yukseklik }, hasTouch: true, serviceWorkers: "block" });
  const s = await b.newPage();
  const ctx = { ben: null, istekler: [], s };
  s.on("pageerror", (e) => console.log("  sayfa hatası:", String(e).slice(0, 160)));
  await s.route(/\/rest\/v1\/rpc\//, async (r) => {
    const req = r.request(); const u = req.url(); const fn = u.split("/rpc/")[1].split("?")[0];
    ctx.ben ??= jwtSub(req);
    ctx.istekler.push({ fn, t: Date.now() });
    try {
      const sonuc = await rpc(fn, r, ctx);
      if (sonuc === undefined) { const y = await r.fetch(); await r.fulfill({ response: y }); }
    } catch { try { await r.abort(); } catch { /* kapandı */ } }
  });
  await s.goto(ADRES + yol, { waitUntil: "domcontentloaded" });
  const sonuclar = await adimlar(s, ctx);
  rapor[ad] = sonuclar ?? true;
  await b.close();
}
const ornekle = async (s, ms, aralik = 200) => { const o = []; const bit = Date.now() + ms; while (Date.now() < bit) { o.push(await s.evaluate(ORNEK)); await s.waitForTimeout(aralik); } return o; };
const foto = (s, ad) => s.screenshot({ path: path.join(CIKTI, `${ETIKET}-${ad}.png` ) });

// K1 — tur geçişi beklemesi
await senaryo("K1", { yol: `/kasa/${KASA_ID}`,
  rpc: async (fn, r, c) => {
    if (fn === "kasa_durum") {
      c.d ??= kasa(c.ben, { faz_bitis: iso(2500) });
      if (c.yeniTur && Date.now() >= c.yeniTur) return json(r, kasa(c.ben, { tur: 8, faz_bitis: iso(14000), sureler: { ...c.d.sureler, gosterim_bas: iso(-100) } }));
      return json(r, { ...c.d, sunucu_zamani: new Date().toISOString() });
    }
    if (/^kasa_|^kalp_at|^mac_sonu_ozet|^tepki/.test(fn)) return json(r, fn === "kasa_giris" ? { durum: "aktif", rakip_geldi: true } : null);
  },
  adimlar: async (s, c) => {
    await s.waitForSelector(".ks-mac", { timeout: 20000 });
    c.yeniTur = Date.now() + 2500 + 1100 + 9000;   // faz bitişi + tolerans + 9 sn sunucu beklemesi
    const o = await ornekle(s, 14000, 250);
    const bant = o.filter((x) => x.bant);
    await foto(s, "K1-tur-gecisi");
    ok("K1 tur geçişi beklemesinde bant yok", bant.length === 0, `${bant.length} örnekte bant (ilk ${bant[0] ? Math.round((bant[0].t - o[0].t) / 1000) + " sn" : "-"})`);
    return { bantOrnek: bant.length, toplam: o.length };
  } });

// K2 — 16 sn yanıtsızlık
await senaryo("K2", { yol: `/kasa/${KASA_ID}`,
  rpc: async (fn, r, c) => {
    if (fn === "kasa_durum") {
      // kesinti: yanıt ağ dönene dek gelmez (istemci 10 sn'de keser ve yeniden dener)
      if (c.askida && Date.now() < c.askida) await new Promise((x) => setTimeout(x, c.askida - Date.now()));
      return json(r, kasa(c.ben, { faz_bitis: iso(30000) }));
    }
    if (/^kasa_|^kalp_at|^mac_sonu_ozet|^tepki/.test(fn)) return json(r, fn === "kasa_giris" ? { durum: "aktif", rakip_geldi: true } : null);
  },
  adimlar: async (s, c) => {
    await s.waitForSelector(".ks-mac .qt-sik", { timeout: 20000 });
    await s.waitForTimeout(1500);
    const bas = Date.now();
    c.askida = bas + 16000;
    const o = await ornekle(s, 13500, 250);
    await foto(s, "K2-bant");
    o.push(...await ornekle(s, 12500, 250));
    const ilkBant = o.find((x) => x.bant);
    const bantliler = o.filter((x) => x.bant);
    // karşılaştırma: bant çıkmadan HEMEN önceki örnek (açılışta geç yerleşen öğeler kaymayı karıştırmasın)
    const temel = ilkBant ? o[Math.max(0, o.indexOf(ilkBant) - 1)] : o[0];
    if (ilkBant) { await s.evaluate(() => 0); }
    const fotoAn = o.find((x) => x.bant);
    await foto(s, "K2-sonrasi");
    ok("K2 bant en erken 10 sn'de", !ilkBant || ilkBant.t - bas >= 9800, ilkBant ? `${((ilkBant.t - bas) / 1000).toFixed(1)} sn` : "bant hiç çıkmadı");
    ok("K2 bant gerçek kopmada çıkar", Boolean(ilkBant), "");
    ok("K2 bant varken soru metni yerinde", bantliler.every((x) => x.soruMetni > 5));
    ok("K2 bant şıkları/sahneyi kaydırmaz", bantliler.every((x) => x.sahneY === temel.sahneY && x.sikY === temel.sikY), `önce ${temel.sahneY}/${temel.sikY} · bantlı ${fotoAn?.sahneY}/${fotoAn?.sikY}`);
    ok("K2 bant varken şıklar kilitlenmez", bantliler.every((x) => !/kilitli/.test(x.sikSinif)), fotoAn?.sikSinif);
    ok("K2 yanıt dönünce bant kalkar", !o.at(-1).bant);
    return { ilkBantSn: ilkBant ? (ilkBant.t - bas) / 1000 : null, temel: { sahneY: temel.sahneY, sikY: temel.sikY }, bantli: fotoAn ? { sahneY: fotoAn.sahneY, sikY: fotoAn.sikY } : null };
  } });

// K3 — arka plan → ön plan toparlanma
await senaryo("K3", { yol: `/kasa/${KASA_ID}`,
  rpc: async (fn, r, c) => {
    if (fn === "kasa_durum") return json(r, kasa(c.ben, { faz_bitis: iso(30000) }));
    if (/^kasa_|^kalp_at|^mac_sonu_ozet|^tepki/.test(fn)) return json(r, fn === "kasa_giris" ? { durum: "aktif", rakip_geldi: true } : null);
  },
  adimlar: async (s, c) => {
    await s.waitForSelector(".ks-mac", { timeout: 20000 });
    await s.waitForTimeout(1000);
    await s.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
    const gizliBas = Date.now();
    await s.waitForTimeout(12000);
    const gizliIstek = c.istekler.filter((x) => x.t > gizliBas + 500 && /kasa_durum|kalp_at/.test(x.fn)).length;
    const donus = Date.now();
    await s.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" }); document.dispatchEvent(new Event("visibilitychange")); });
    await s.waitForTimeout(1500);
    const sonra = c.istekler.filter((x) => x.t >= donus);
    const kd = sonra.find((x) => x.fn === "kasa_durum"); const ka = sonra.find((x) => x.fn === "kalp_at");
    ok("K3 gizli sekmede yoklama/nabız yok (sunucu bunu kopukluk sayar)", gizliIstek === 0, `${gizliIstek} istek`);
    ok("K3 görünür olunca hemen kasa_durum + kalp_at", Boolean(kd && ka && kd.t - donus < 1000 && ka.t - donus < 1000),
      `kasa_durum ${kd ? kd.t - donus : "-"} ms · kalp_at ${ka ? ka.t - donus : "-"} ms`);
    return { gizliIstek, kasaDurumMs: kd ? kd.t - donus : null, kalpAtMs: ka ? ka.t - donus : null };
  } });

// K4 — maç sonu (özet gecikmeli)
await senaryo("K4", { yol: `/kasa/${KASA_ID}`,
  rpc: async (fn, r, c) => {
    if (fn === "kasa_durum") {
      if (c.bitti) return json(r, kasa(c.ben, { durum: "bitti", faz: "sonuc", kazanan: c.ben, sonuc_neden: "tur_siniri", soru: SORU, gecmis: [], terk: { ben: false, rakip: false },
        sonuc: { tur: 36, altin: false, dogru_cevap: 1, artis: 2, kasa_once: 10, kasa_sonra: 12, sahip_once: null, sahip_sonra: null, benim_cevabim: 1, ben_dogru: true, rakip_dogru: false } }));
      return json(r, kasa(c.ben, { faz: "sonuc", faz_bitis: iso(2000), sonuc: { tur: 36, altin: false, dogru_cevap: 1, artis: 2, kasa_once: 10, kasa_sonra: 12, sahip_once: null, sahip_sonra: null, benim_cevabim: 1, ben_dogru: true, rakip_dogru: false } }));
    }
    if (fn === "mac_sonu_ozet") { await new Promise((x) => setTimeout(x, 2500)); return json(r, OZET(c.ben, `kasa:${KASA_ID}`)); }
    if (/^kasa_|^kalp_at|^tepki/.test(fn)) return json(r, fn === "kasa_giris" ? { durum: "aktif", rakip_geldi: true } : null);
  },
  adimlar: async (s, c) => {
    await s.waitForSelector(".ks-mac", { timeout: 20000 });
    await s.waitForTimeout(800);
    c.bitti = true;
    await s.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    const o = await ornekle(s, 5000, 100);
    const bos = o.filter((x) => x.bos && !x.sonuc);
    const ilkBos = bos[0];
    if (ilkBos) await s.waitForTimeout(0);
    await foto(s, "K4-mac-sonu");
    ok("K4 maç sonunda boş sayfa anı yok", bos.length === 0, `${bos.length} örnek (~${bos.length * 100} ms) boş`);
    ok("K4 sonuç ekranı geldi", o.some((x) => x.sonuc || /Kazandın|kazandın|You won/i.test(x.metin)));
    return { bosMs: bos.length * 100 };
  } });

// D ortak RPC
const duelloRpc = (uret) => async (fn, r, c) => {
  if (fn === "duello_durum") return json(r, uret(c));
  if (fn === "duello_giris") return json(r, { durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
  if (fn === "duello_baglanti") return json(r, { kopuk: false });
  if (fn === "duello_cevap") { c.cevapladim = true; return json(r, { tekrar_hakki: false, cevaplandi: true }); }
  if (fn === "duello_kategori_sec") { c.kartAdim = (c.kartAdim ?? 0) + 1; return json(r, null); }
  if (fn === "mac_sonu_ozet") { await new Promise((x) => setTimeout(x, 2500)); return json(r, OZET(c.ben, `duello:${DUELLO_ID}`)); }
  if (/^duello_|^kalp_at|^tepki/.test(fn)) return json(r, null);
};

// D1 — cevap sonrası sayaç + metin
await senaryo("D1", { yol: `/duello/${DUELLO_ID}`,
  rpc: duelloRpc((c) => { c.bitis ??= iso(12000); const d = duello(c.ben, { _bitis: c.bitis });
    if (c.cevapladim) d.cevap = { ...d.cevap, ben_cevapladim: true, benim_cevabim: 1 }; return d; }),
  adimlar: async (s, c) => {
    await s.waitForSelector(".d4-arena .qt-sik", { timeout: 20000 });
    await s.waitForTimeout(1200);
    await s.locator(".d4-arena .qt-sik").nth(1).click();
    await s.waitForTimeout(600);
    const a = await s.evaluate(ORNEK);
    await s.waitForTimeout(3000);
    const b = await s.evaluate(ORNEK);
    const metin = await s.evaluate(() => document.querySelector(".m2-skill-ipucu")?.textContent ?? "");
    await foto(s, "D1-cevap-sonrasi");
    ok("D1 cevaptan sonra sayaç durur", a.sayac === b.sayac, `${a.sayac} → ${b.sayac}`);
    ok("D1 metin: Cevabın gitti · rakip bekleniyor", /Cevabın gitti · rakip bekleniyor|Answer sent · waiting/.test(metin), metin);
    return { sayac: [a.sayac, b.sayac], metin };
  } });

// D2 — kart adımları yerleşimi (EN 360: başlık 2 satır → 1 satır) + süre doldu notu
for (const [g, h] of [[360, 640], [390, 844]]) {
  await senaryo(`D2-${g}`, { genislik: g, yukseklik: h, yol: `/duello/${DUELLO_ID}`,
    rpc: duelloRpc((c) => {
      const adim = c.kartAdim ?? 0;
      c.bitis1 ??= iso(10900);
      const bitis = adim === 0 ? c.bitis1 : (c.bitis2 ??= iso(1500));   // 2. adım: (eski kodda) paylaşılan sürenin azı kaldı
      const kartlar = ["tarih", "sinema", "muzik", "bilim"].map((k) => ({ k, ben: 60, rakip: 40 }));
      return duello(c.ben, { faz: "kart", _bitis: bitis, _gb: iso(-200) }, { kart: { kartlar, adim, gonderilen: adim ? "tarih" : null, secilen: null, varsayilan: 50 } });
    }),
    adimlar: async (s, c) => {
      await s.waitForSelector(".d4-kart", { timeout: 20000 });
      await s.waitForTimeout(1500);
      const a = await s.evaluate(ORNEK);
      await foto(s, `D2-${g}-adim1`);
      await s.locator(".d4-kart").nth(0).click();
      await s.waitForTimeout(800);
      await s.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
      await s.waitForTimeout(800);
      const b = await s.evaluate(ORNEK);
      await s.waitForTimeout(2500);   // 2. adımın kısa süresi dolar → "Süre doldu · otomatik seçiliyor"
      const gorunenBaslik = await s.evaluate(() => [...document.querySelectorAll(".d4-baslik h2 span")].filter((e) => getComputedStyle(e).visibility !== "hidden").map((e) => e.textContent));
      ok(`D2 ${g}: başlıkta yalnız 2. adım yazısı görünür`, gorunenBaslik.length === 1, JSON.stringify(gorunenBaslik));
      const c2 = await s.evaluate(ORNEK);
      await foto(s, `D2-${g}-adim2`);
      ok(`D2 ${g}: 2. adımda kartlar yerinde`, a.kartY === b.kartY, `${a.kartY} → ${b.kartY}`);
      ok(`D2 ${g}: süre doldu notu kartları itmez`, b.kartY === c2.kartY, `${b.kartY} → ${c2.kartY}`);
      return { adim1: a.kartY, adim2: b.kartY, sureDoldu: c2.kartY };
    } });
}

// D3 — Düello tur geçişi beklemesi
await senaryo("D3", { yol: `/duello/${DUELLO_ID}`,
  rpc: duelloRpc((c) => { c.bitis ??= iso(2500); c.cevapladim = false; return duello(c.ben, { _bitis: c.bitis }); }),
  adimlar: async (s) => {
    await s.waitForSelector(".d4-arena", { timeout: 20000 });
    const o = await ornekle(s, 13000, 250);
    const bant = o.filter((x) => x.bant);
    await foto(s, "D3-tur-gecisi");
    ok("D3 tur geçişi beklemesinde bant yok", bant.length === 0, `${bant.length} örnekte bant`);
    return { bantOrnek: bant.length };
  } });

// D4 — Düello maç sonu
await senaryo("D4", { yol: `/duello/${DUELLO_ID}`,
  rpc: duelloRpc((c) => {
    const h = { surum: 4, tip: "saldiri", no: 9, tur: 6, kazanan: c.ben, seri_hedef: 3, notr_seri: 0, gonderilen: "tarih", secilen: "muzik", oto: false, sonuc: "basarili",
      seri_once: 2, seri_sonra: 3, kontrol_once: c.ben, kontrol_sonra: c.ben,
      oyuncular: { [c.ben]: { soru_id: "a", kategori: "muzik", cevap: 1, dogru: true, yanitsiz: false, dogru_cevap: 1 }, [RAKIP]: { soru_id: "b", kategori: "tarih", cevap: 0, dogru: false, yanitsiz: false, dogru_cevap: 2 } } };
    if (c.bitti) return duello(c.ben, { durum: "bitti", faz: "sonuc", kazanan: c.ben, son_hamle: h, _bitis: iso(-1000) }, { seri: 3 });
    return duello(c.ben, { faz: "sonuc", son_hamle: h, _bitis: iso(3000) }, { seri: 3 });
  }),
  adimlar: async (s, c) => {
    await s.waitForSelector(".d4-arena", { timeout: 20000 });
    await s.waitForTimeout(800);
    c.bitti = true;
    await s.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    const o = await ornekle(s, 5000, 100);
    const bos = o.filter((x) => x.bos && !x.sonuc);
    await foto(s, "D4-mac-sonu");
    ok("D4 maç sonunda boş sayfa anı yok", bos.length === 0, `${bos.length} örnek (~${bos.length * 100} ms) boş`);
    return { bosMs: bos.length * 100 };
  } });

await tarayici.close();
const raporDosya = path.join(CIKTI, `${ETIKET}.json`);
let eski = {}; try { eski = YALNIZ ? JSON.parse(fs.readFileSync(raporDosya, "utf8")) : {}; } catch { /* ilk koşu */ }
fs.writeFileSync(raporDosya, JSON.stringify({ ...eski, ...rapor }, null, 1));
console.log(`\n${ETIKET}: ${gecti} geçti · ${kaldi} kaldı`);
