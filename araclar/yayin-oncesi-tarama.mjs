// Yayın öncesi canlı tarama düzeltmeleri (11 Eki 2026) — TAKLİT VERİYLE ölçüm + ekran görüntüsü.
// CANLIYA HİÇ İSTEK GİTMEZ: oturum taklittir (sahte JWT), /auth/v1 ve /rest/v1 tarayıcıda (page.route) yanıtlanır;
// taklidi olmayan RPC null, tablo okuması [] döner, yazmalar kesilir. Realtime ve ses kapalı. Misafir hesap AÇILMAZ.
//
// Maddeler (her biri tek sayfa açar, döngüyle yoklama yok):
//   m1  Ortak Hazine karar sayacı: sayacın 5'te bekleme süresi, 0'a indiği an − sunucu faz_bitis, düğmelerin
//       pasifleştiği an, 0'dan sonra panelin kapanma süresi (ms) · sunucu: faz_bitis + 3 sn pay sonra tembel DEVAM
//   m2  Hatalarım: banka 2,5 sn geç gelirken "Bankan temiz" yazısı / Başla düğmesi
//   m3  Seviye: Hazine maçı biter (sunucuda Lv 29 → 30), aynı oturumda yeni maçın şeridindeki "Lv"
//   m6  Düello özeti: "Rakip/Opponent" etiketi hapın altında kesiliyor mu
//   m7  Mesajlar: EN arayüzde (tarayıcı tr-TR) tarih biçimi
//   m9  Maç sonu geçişi: Klasik "Maç bitti!" ara ekranı ve Hazine final sahnesi sırasında üst çubuk / alt menü
//   m10 Klasik: rakip zaten cevaplamışken "X cevaplayınca soru geçecek…"
//   m11 Sayfa geçişi: aşağı kaydırılmış sayfadan Arkadaşlar / Lig / Meydan Okuma'ya geçince kaydırma konumu
//   m12 Modlar › Grup Maçı kartı nereye gidiyor
//   m13 Ana sayfa "En son oynadığın": Klasik maça girince kayıt
//   m14 Ortak Hazine maç ekranı joker çubuğu alt yazıları ekrana sığıyor mu (502×794 · 390×844 · 360×780)
//   m15 Turnuva: her REST isteği 300 ms gecikmeyle iskeletin kalkma süresi + sıralı istek zinciri
//
// Kullanım:
//   npx vite --port 5191 --strictPort            # ayrı kabukta
//   node araclar/yayin-oncesi-tarama.mjs --adres=http://localhost:5191 --etiket=once|sonra [--yalniz=m1,m2]
// Çıktı: tasarim/yayin-oncesi-tarama/<etiket>-<madde>-<boyut>-<dil>.png + <etiket>.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5191");
const ETIKET = String(ARG.etiket || "sonra");
const YALNIZ = ARG.yalniz ? String(ARG.yalniz).split(",") : null;
const CIKTI = path.resolve("tasarim/yayin-oncesi-tarama");
fs.mkdirSync(CIKTI, { recursive: true });
const GORUNUMLER = [{ w: 390, h: 844, dil: "tr" }, { w: 360, h: 780, dil: "en" }];

const env = fs.readFileSync(".env", "utf8");
const SUPA = (env.match(/VITE_SUPABASE_URL=\s*"?([^"\s]+)/) || [])[1];
if (!SUPA) { console.error(".env › VITE_SUPABASE_URL yok"); process.exit(2); }
const DEPO = `sb-${new URL(SUPA).hostname.split(".")[0]}-auth-token`;

// ---------------------------------------------------------------- taklit oturum
const BEN = "0c1a5100-0000-4000-8000-00000000be00";
const RAKIP = "0c1a5100-0000-4000-8000-00000000aa00";
const U = (n) => `0c1a5100-0000-4000-8000-${String(n).padStart(12, "0")}`;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const EXP = Math.floor(Date.now() / 1000) + 7 * 86400;
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: BEN, role: "authenticated", aud: "authenticated", exp: EXP, is_anonymous: true })}.taklit`;
const KULLANICI = { id: BEN, aud: "authenticated", role: "authenticated", email: "", is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" };
const OTURUM = { access_token: JWT, token_type: "bearer", expires_in: 7 * 86400, expires_at: EXP, refresh_token: "taklit-yenileme", user: KULLANICI };
const PROFIL = (dil, ek = {}) => ({ id: BEN, gorunen_ad: "Deneme", username: "deneme", takma_ad: "Deneme", takma_ad_secildi: true, avatar_onayli: true, ulke: "TR",
  sehir: "İstanbul", dil, puan: 100, coin: 50, xp: 0, level: 29, misafir: true, gorunen_avatar: null, gorunum: null, created_at: "2026-09-01T00:00:00Z", ...ek });
const KART = (id, level, ad = "Deneme") => ({ id, ad, avatar: null, level, lig: "bronz", cerceve: null, cerceve_nadirlik: null, vitrin: [] });

const iso = (ms = 0) => new Date(Date.now() + ms).toISOString();
const json = (r, veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
const bekle = (ms) => new Promise((x) => setTimeout(x, ms));

// ---------------------------------------------------------------- taklit maçlar
const SORU = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], kategori: "cografya" };
const KASA_ID = U(501), KASA2_ID = U(502), MAC_ID = U(601);
const KASA_AYAR = { kasa_modu_acik: 1, kasa_karar_sn: 5, kasa_soru_sn: 15, kasa_sonuc_sn: 3, kasa_hedef_puan: 80, kasa_gosterim_payi_ms: 2000, secim_gec_varis_sn: 3 };
function kasa(o = {}) {
  const oy = (id, ad, puan) => ({ id, gorunen_ad: ad, gorunen_avatar: null, gorunum: null, unvan: null, puan, acma: 0 });
  return { id: KASA_ID, durum: "aktif", dereceli: true, faz: "cevap", faz_bitis: iso(12000), sunucu_zamani: iso(0),
    ben: BEN, tur: 7, max_tur: 36, hedef: 80, altin: false, artis: 2, ikisi_artis: 6, kasa: 24, sahip: null, acma_min: 0, jokerli: true,
    oyuncular: [oy(BEN, "Sen", 18), oy(RAKIP, "Bot Deniz", 22)], karar: null, son_karar: null, soru: SORU,
    cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false }, sonuc: null,
    joker: { turler: [], kapali: [], elenen: null, ikinci_sans: false, kisaltildi: false }, rakip_joker: [], devam_sans: 0, devam_elli: false, devam_birakir: true,
    bedava_joker: null, devam_odul: null,
    sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 15, gosterim_payi_ms: 2000, gosterim_bas: iso(-3000), benim_bitis: iso(12000), faz_son: iso(12000) },
    kopuk: null, kazanan: null, sonuc_neden: null, terk: null, baglanmayan: null, gecmis: null,
    tavan: 80, devam_carpan: 2, savunma_acik: false, savunma_hak: [], savunma: null, rovans: { isteyen: null, id: null, gecerli: false }, ezeli: null, ...o };
}
const OZET = (kaynak, o = {}) => ({ kaynak, hazir: true, bitti: true, kazanan: BEN, terk: { ben: false, rakip: false, edenler: [] },
  dokum: { hazir: true, kalemler: [{ kalem: "galibiyet", lig: 10, coin: 15, detay: {} }], rozetler: [], toplam: { lig: 10, coin: 15 }, gorevler: [] },
  level: { hazir: true, xp: 30, level_once: 29, level_sonra: 30, level: 30, level_xp: 5, level_gereken: 900, indirim: null, oynamadi: false, level_coin: 0, rutbe_coin: 0, skiller: [] },
  lig: { puan: 10 }, rozetler: [], gorevler: [], haftalik_gorevler: [], ...o });
function macSatiri(o = {}) {
  const p = (id, ad, bot = false) => ({ id, gorunen_ad: ad, gorunen_avatar: null, gorunum: null, acik_bot: bot });
  return { id: MAC_ID, durum: "aktif", senkron: true, basladi: true, aktif_soru: 0, soru_ids: [U(21), U(22), U(23), U(24), U(25)], oyuncu1: BEN, oyuncu2: RAKIP,
    oyuncu1_skor: 0, oyuncu2_skor: 0, oyuncu1_soru: 0, oyuncu2_soru: 0, jokersiz: false, dereceli: true, kategori: null, kabul_at: null,
    created_at: iso(-90000), joker_surum: 0, kazanan: null, terk_eden: null, baglanmayan: null, duraklatildi_at: null,
    p1: p(BEN, "Sen"), p2: p(RAKIP, "Deniz"), ...o };
}

// ---------------------------------------------------------------- sayfa açıcı
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const rapor = {};
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) gecti++; else kaldi++; console.log(`  ${kosul ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); };
const kayit = (madde, anahtar, veri) => { (rapor[madde] ??= {})[anahtar] = veri; };

/**
 * s: { rpc(fn, govde, ctx) → değer | undefined (null döner), tablo(ad, ctx) → satırlar | undefined ([]), gecikme: ms (her REST yanıtı) }
 */
async function sayfa({ w, h, dil, locale = "tr-TR" }, s = {}) {
  const ctx = await tarayici.newContext({ viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block", locale });
  const p = await ctx.newPage();
  const durum = { istekler: [], konsol: [], dil };
  p.on("console", (m) => { if (m.type() === "error") durum.konsol.push(m.text().slice(0, 160)); });
  p.on("pageerror", (e) => durum.konsol.push(`pageerror: ${String(e).slice(0, 160)}`));
  await p.addInitScript(({ d, depo, oturum, ek }) => {
    try {
      localStorage.setItem("bildim_dil", d); localStorage.setItem("bildim_tanitim", "1");
      localStorage.setItem(depo, JSON.stringify(oturum));
      for (const [k, v] of Object.entries(ek || {})) if (localStorage.getItem(k) == null) localStorage.setItem(k, v);
    } catch { /* depolama kapalı */ }
  }, { d: dil, depo: DEPO, oturum: OTURUM, ek: s.yerel });
  await p.route(/\/auth\/v1\//, (r) => (/\/user/.test(r.request().url()) ? json(r, KULLANICI) : json(r, OTURUM)));
  await p.route(/\/rest\/v1\//, async (r) => {
    const req = r.request();
    const yol = req.url().split("/rest/v1/")[1].split("?")[0];
    const nesne = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
    const t0 = Date.now();
    durum.istekler.push({ yol, t: t0 });
    try {
      if (s.gecikme) await bekle(s.gecikme);
      if (yol.startsWith("rpc/")) {
        const fn = yol.slice(4);
        let govde = {};
        try { govde = JSON.parse(req.postData() || "{}"); } catch { /* boş */ }
        let v = s.rpc ? await s.rpc(fn, govde, durum) : undefined;
        if (v === undefined) {
          if (fn === "profilim") v = PROFIL(dil);
          else if (fn === "oyuncu_kartlari") v = (govde.p_idler ?? []).map((id) => KART(id, 29, id === BEN ? "Deneme" : "Deniz"));
        }
        if (v && v.__hata) return json(r, { message: v.__hata }, 400);
        return json(r, v === undefined ? null : v);
      }
      if (req.method() !== "GET" && req.method() !== "HEAD") return json(r, nesne ? null : []);
      let satirlar = s.tablo ? await s.tablo(yol, durum, req.url()) : undefined;
      if (satirlar === undefined && yol === "oyun_ayarlari") satirlar = Object.entries({ ...KASA_AYAR, ...(s.ayar || {}) }).map(([anahtar, deger]) => ({ anahtar, deger }));
      satirlar ??= [];
      return json(r, nesne ? (satirlar[0] ?? null) : satirlar);
    } catch { try { await r.abort(); } catch { /* kapandı */ } }
  });
  await p.route(/\/functions\/v1\//, (r) => json(r, {}));
  await p.route(/\/storage\/v1\//, (r) => r.fulfill({ status: 404, body: "" }));
  await p.route(/\/realtime\/|\.(mp3|ogg|wav|m4a)(\?|$)/, (r) => r.abort());
  return { p, ctx, durum };
}
const foto = (p, madde, g, ek = "") => p.screenshot({ path: path.join(CIKTI, `${ETIKET}-${madde}${ek ? "-" + ek : ""}-${g.w}x${g.h}-${g.dil}.png`) });
// SPA içi geçiş (React Router popstate dinler; tam sayfa yüklemesi yok → modül önbellekleri korunur)
const spaGit = (p, yol) => p.evaluate((y) => { history.pushState({}, "", y); dispatchEvent(new PopStateEvent("popstate", { state: {} })); }, yol);
const calis = (madde) => !YALNIZ || YALNIZ.includes(madde);

// ================================================================ m1 · Hazine karar sayacı
if (calis("m1")) for (const g of GORUNUMLER) {
  console.log(`\n== m1 ${g.w}x${g.h} ${g.dil}`);
  const S = { faz: "karar", kararBas: null, gecis: null, kabul: null, sureDolduCagri: null };
  const PAY = 2000, KARAR = 5000, GEC = 3000;
  const kararDurum = () => {
    const bitis = S.kararBas + PAY + KARAR;
    return kasa({ faz: "karar", sahip: BEN, soru: null, cevap: null, faz_bitis: new Date(bitis).toISOString(), karar: { veren: BEN, deger: 24 },
      sureler: { ...kasa().sureler, gosterim_bas: new Date(S.kararBas + PAY).toISOString(), benim_bitis: null, faz_son: new Date(bitis).toISOString() } });
  };
  const sonrakiTur = () => {
    const gb = S.gecis + PAY;
    return kasa({ tur: 8, kasa: 48, sahip: null, faz_bitis: new Date(gb + 15000).toISOString(),
      son_karar: { veren: BEN, ac: false, deger: 24, sure_doldu: true, birakti: true, carpan: 2, yeni: 48, tavan: false },
      sureler: { ...kasa().sureler, gosterim_bas: new Date(gb).toISOString(), benim_bitis: new Date(gb + 15000).toISOString(), faz_son: new Date(gb + 15000).toISOString() } });
  };
  const ilerlet = () => { if (S.faz === "karar" && Date.now() >= S.kararBas + PAY + KARAR + GEC) { S.faz = "cevap"; S.gecis = Date.now(); } };
  const { p, ctx } = await sayfa(g, {
    rpc: async (fn, b) => {
      if (fn === "kasa_durum") { S.kararBas ??= Date.now(); ilerlet(); return { ...(S.faz === "karar" ? kararDurum() : sonrakiTur()), sunucu_zamani: iso(0) }; }
      if (fn === "kasa_karar" && b.p_ac == null) {   // 1063: süre doldu bildirimi (yalnız faz_bitis geçtiyse)
        S.sureDolduCagri = Date.now(); ilerlet();
        if (S.faz !== "karar") return null;
        if (Date.now() < S.kararBas + PAY + KARAR) return { __hata: "Süre dolmadı" };
        S.faz = "cevap"; S.gecis = Date.now(); return null;
      }
      if (fn === "kasa_karar") { ilerlet(); if (S.faz !== "karar") return { __hata: "Şu an karar verilemez" }; S.kabul = Date.now(); S.faz = "cevap"; S.gecis = Date.now(); return null; }
      if (fn === "kasa_karar_sure_doldu") {   // (yeni RPC, 1063) — faz_bitis geçtiyse süre dolumu hemen uygulanır
        S.sureDolduCagri = Date.now();
        if (S.faz === "karar" && Date.now() >= S.kararBas + PAY + KARAR) { S.faz = "cevap"; S.gecis = Date.now(); return true; }
        return false;
      }
      if (fn === "kasa_giris") return { durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null };
      if (fn === "kasa_aktif_benim") return [];
      if (/^kasa_|^kalp_at|^tepki|^mac_sonu_ozet/.test(fn)) return null;
    },
  });
  try {
    await p.goto(`${ADRES}/kasa/${KASA_ID}`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".ks-karar", { timeout: 25000 });
    // Panel görünür olduğu andan itibaren 50 ms aralıkla örnek: sayaç metni, düğme pasif mi, panel var mı (sayfa içi tek döngü)
    const o = await p.evaluate(async () => {
      const t0 = performance.now(), cikti = [];
      while (performance.now() - t0 < 14000) {
        const panel = document.querySelector(".ks-karar");
        const sayi = document.querySelector(".qt-sayac-sayi")?.textContent ?? null;
        const ac = document.querySelector(".ks-karar-dugme");
        const not = document.querySelector(".ks-karar-sure-doldu")?.textContent ?? null;
        cikti.push({ t: Date.now(), panel: Boolean(panel), sayi, pasif: ac ? ac.disabled : null, not });
        if (!panel && cikti.length > 5) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      return cikti;
    });
    await foto(p, "m1", g, "karar-ilk");
    const bitis = S.kararBas + PAY + KARAR;
    const ilk = o[0];
    const ilkDegisim = o.find((x) => x.sayi !== ilk.sayi);
    const sifir = o.find((x) => x.sayi === "0" || (x.sayi == null && x.panel));
    const pasif = o.find((x) => x.pasif === true);
    const kapandi = o.find((x) => !x.panel);
    const r = {
      panelAcilisi_ms_kararBasindan: ilk.t - S.kararBas,
      ilkSayi: ilk.sayi, ilkDegisim_ms: ilkDegisim ? ilkDegisim.t - ilk.t : null,
      sifir_ms_fazBitiseGore: sifir ? sifir.t - bitis : null,
      pasif_ms_fazBitiseGore: pasif ? pasif.t - bitis : null,
      sureDolduNotu: o.find((x) => x.not)?.not ?? null,
      panelKapanis_ms_sifirdan: kapandi && sifir ? kapandi.t - sifir.t : null,
      panelKapanis_ms_fazBitiseGore: kapandi ? kapandi.t - bitis : null,
      sureDolduRpc_ms_fazBitiseGore: S.sureDolduCagri ? S.sureDolduCagri - bitis : null,
    };
    console.log("  ", JSON.stringify(r));
    kayit("m1", `${g.w}-${g.dil}`, r);
    ok("m1 sayaç 0'a faz_bitis ±250 ms içinde iner", r.sifir_ms_fazBitiseGore != null && Math.abs(r.sifir_ms_fazBitiseGore) <= 250, `${r.sifir_ms_fazBitiseGore} ms`);
    ok("m1 0'da düğmeler pasif (≤ 250 ms)", r.pasif_ms_fazBitiseGore != null && r.pasif_ms_fazBitiseGore <= 250, `${r.pasif_ms_fazBitiseGore} ms`);
    ok("m1 0'dan sonra panel ≤ 1200 ms içinde kapanır", r.panelKapanis_ms_sifirdan != null && r.panelKapanis_ms_sifirdan <= 1200, `${r.panelKapanis_ms_sifirdan} ms`);
    ok("m1 sayaç açılışta ilk rakamda ≤ 1100 ms kalır (donmaz)", r.ilkDegisim_ms != null && r.ilkDegisim_ms <= 1100, `ilk ${r.ilkSayi}, ${r.ilkDegisim_ms} ms`);
    ok("m1 süre doldu bildirimi faz_bitis'ten sonra (oyuncu aleyhine erken değil)", r.sureDolduRpc_ms_fazBitiseGore == null || r.sureDolduRpc_ms_fazBitiseGore >= 0, `${r.sureDolduRpc_ms_fazBitiseGore} ms`);
  } catch (e) { ok("m1 koştu", false, String(e).slice(0, 200)); }
  await ctx.close();
}

// ---- m1b · Sıfıra yakın AÇ: sayaç 1 iken basılan AÇ kabul edilir (oyuncu aleyhine kısaltma yok)
if (calis("m1")) {
  const g = GORUNUMLER[0];
  console.log(`\n== m1b ${g.w}x${g.h} ${g.dil}`);
  const S = { faz: "karar", kararBas: null, kabul: null, karar: null };
  const PAY = 2000, KARAR = 5000;
  const { p, ctx } = await sayfa(g, {
    rpc: async (fn, b) => {
      if (fn === "kasa_durum") {
        S.kararBas ??= Date.now();
        const bitis = S.kararBas + PAY + KARAR;
        if (S.faz === "karar") return kasa({ faz: "karar", sahip: BEN, soru: null, cevap: null, faz_bitis: new Date(bitis).toISOString(), karar: { veren: BEN, deger: 24 },
          sureler: { ...kasa().sureler, gosterim_bas: new Date(S.kararBas + PAY).toISOString(), benim_bitis: null, faz_son: new Date(bitis).toISOString() } });
        return kasa({ tur: 8, kasa: 0, sahip: null, son_karar: { veren: BEN, ac: true, deger: 24 }, faz_bitis: iso(16000), sureler: { ...kasa().sureler, gosterim_bas: iso(1500) } });
      }
      if (fn === "kasa_karar") { if (S.faz !== "karar") return { __hata: "Şu an karar verilemez" }; S.kabul = Date.now(); S.karar = b.p_ac; S.faz = "cevap"; return null; }
      if (fn === "kasa_karar_sure_doldu") return false;
      if (fn === "kasa_giris") return { durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null };
      if (/^kasa_|^kalp_at|^tepki|^mac_sonu_ozet/.test(fn)) return null;
    },
  });
  try {
    await p.goto(`${ADRES}/kasa/${KASA_ID}`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".ks-karar", { timeout: 25000 });
    await p.waitForFunction(() => document.querySelector(".qt-sayac-sayi")?.textContent === "1", null, { timeout: 12000 });
    await p.locator(".ks-karar-dugme").first().click({ timeout: 3000 });
    await p.waitForTimeout(800);
    const bitis = S.kararBas + PAY + KARAR;
    const r = { kabul: S.kabul != null, karar: S.karar, kabul_ms_fazBitiseGore: S.kabul ? S.kabul - bitis : null };
    console.log("  ", JSON.stringify(r));
    kayit("m1", "ac-1de", r);
    ok("m1b sayaç 1'de AÇ sunucuya gider ve kabul edilir", r.kabul && r.karar === true);
  } catch (e) { ok("m1b koştu", false, String(e).slice(0, 200)); }
  await ctx.close();
}

// ================================================================ m2 · Hatalarım yükleniyor
if (calis("m2")) for (const g of GORUNUMLER) {
  console.log(`\n== m2 ${g.w}x${g.h} ${g.dil}`);
  const { p, ctx } = await sayfa(g, {
    rpc: async (fn) => {
      if (fn === "yanlis_bankam") { await bekle(2500); return [{ toplam: 900, ogrenilen: 88, bekleyen: 812, kategori: null, kategori_adet: 0 }, { toplam: 900, ogrenilen: 88, bekleyen: 812, kategori: "tarih", kategori_adet: 300 }]; }
      if (fn === "get_categories") return ["genel_kultur", "tarih", "cografya", "bilim"].map((k) => ({ kategori: k, adet: 500 }));
    },
  });
  try {
    await p.goto(`${ADRES}/calisma`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".m1-cal-eylem button", { timeout: 20000 });
    await p.waitForTimeout(300);
    const oku = () => p.evaluate(() => ({ not: document.querySelector(".m1-cal-not")?.textContent ?? null,
      dugme: document.querySelector(".m1-cal-eylem button")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      pasif: document.querySelector(".m1-cal-eylem button")?.disabled ?? null }));
    const yuklenirken = await oku();
    await foto(p, "m2", g, "yuklenirken");
    await p.waitForFunction(() => /812/.test(document.body.innerText), null, { timeout: 8000 });
    const sonra = await oku();
    await foto(p, "m2", g, "geldi");
    const r = { yuklenirken, sonra };
    console.log("  ", JSON.stringify(r));
    kayit("m2", `${g.w}-${g.dil}`, r);
    ok("m2 yüklenirken pratik turu yazısı yok", !/temiz|clear/i.test(yuklenirken.not ?? ""), yuklenirken.not);
    ok("m2 yüklenirken Başla pasif", yuklenirken.pasif === true, yuklenirken.dugme);
    ok("m2 veri gelince Başla etkin", sonra.pasif === false, sonra.dugme);
  } catch (e) { ok("m2 koştu", false, String(e).slice(0, 200)); }
  await ctx.close();
}

// ================================================================ m3 · eski seviye (kart önbelleği)
if (calis("m3")) for (const g of GORUNUMLER) {
  console.log(`\n== m3 ${g.w}x${g.h} ${g.dil}`);
  const S = { seviye: 29, bitti: false };
  const { p, ctx } = await sayfa(g, {
    rpc: async (fn, b) => {
      if (fn === "profilim") return PROFIL(g.dil, { level: S.seviye });
      if (fn === "oyuncu_kartlari") return (b.p_idler ?? []).map((id) => KART(id, id === BEN ? S.seviye : 12));
      if (fn === "kasa_durum") {
        if (b.p_id === KASA2_ID) return kasa({ id: KASA2_ID, tur: 1 });
        if (S.bitti) return kasa({ durum: "bitti", kazanan: BEN, sonuc_neden: "hedef", faz: "sonuc", oyuncular: kasa().oyuncular.map((x) => ({ ...x, puan: x.id === BEN ? 80 : 22 })), gecmis: [] });
        return kasa();
      }
      if (fn === "mac_sonu_ozet") return OZET(`kasa:${KASA_ID}`);
      if (fn === "kasa_giris") return { durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null };
      if (/^kasa_|^kalp_at|^tepki/.test(fn)) return null;
    },
  });
  try {
    await p.goto(`${ADRES}/kasa/${KASA_ID}`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".ks-mac .mo-lv", { timeout: 25000 });
    const lvOnce = await p.evaluate(() => [...document.querySelectorAll(".mo-lv")].map((e) => e.textContent));
    S.seviye = 30; S.bitti = true;   // sunucu: maç bitti, ödüller işlendi
    await p.waitForSelector(".msk, .ks-bitti--final", { timeout: 15000 });
    await p.waitForTimeout(2500);
    await spaGit(p, `/kasa/${KASA2_ID}`);
    await p.waitForSelector(".ks-mac .mo-lv", { timeout: 20000 });
    await p.waitForTimeout(1200);
    const lvSonra = await p.evaluate(() => [...document.querySelectorAll(".mo-lv")].map((e) => e.textContent));
    await foto(p, "m3", g, "yeni-mac");
    const r = { lvOnce, lvSonra };
    console.log("  ", JSON.stringify(r));
    kayit("m3", `${g.w}-${g.dil}`, r);
    ok("m3 yeni maç şeridinde güncel seviye (30)", lvSonra.some((x) => /30/.test(x)), lvSonra.join(" | "));
  } catch (e) { ok("m3 koştu", false, String(e).slice(0, 200)); }
  await ctx.close();
}

// ================================================================ m5 · Düello arama ipuçları (v4 açık)
if (calis("m5")) for (const g of GORUNUMLER) {
  console.log(`\n== m5 ${g.w}x${g.h} ${g.dil}`);
  const { p, ctx } = await sayfa(g, {
    ayar: { duello_v4_acik: "acik", duello_secim_modu: 1, duello_puan_modu: "yeni", duello_secim_sn: 5, duello4_kart_sn: 10 },
    yerel: { bildim_duello_tanitim_v14: "1", qt_duello_durum_ipucu: "[{\"m\":\"a\",\"t\":[1]},{\"m\":\"b\",\"t\":[1]},{\"m\":\"c\",\"t\":[1]}]" },
    // duello_ara null = henüz rakip yok (dolu dönüş eşleşme kimliği sayılır)
    rpc: async (fn) => { if (fn === "duello_ara") return null; if (fn === "duello_aktif_benim") return []; },
  });
  try {
    await p.goto(`${ADRES}/duello`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".m2-giris-eylem button", { timeout: 20000 });
    await p.waitForTimeout(1500);
    await p.locator(".m2-giris-eylem button").first().click();
    const ipuclari = new Set();
    for (let i = 0; i < 11; i++) {
      await p.waitForTimeout(1500);
      const m = await p.evaluate(() => [...document.querySelectorAll("p.qt-h-gir[aria-live]")].map((e) => e.textContent.trim()).filter(Boolean));
      m.forEach((x) => ipuclari.add(x));
      if (i === 1) await foto(p, "m5", g);
    }
    const liste = [...ipuclari];
    console.log("  ", JSON.stringify(liste));
    kayit("m5", `${g.w}-${g.dil}`, liste);
    const eski = liste.filter((x) => /sn; süre dolarsa|s per pick|rakibin kategorisine saldır|attack your opponent|yuvayı|slots/i.test(x));
    ok("m5 eski kural ipucu yok (seçim süresi / yalnız saldırı)", liste.length > 0 && eski.length === 0, eski.join(" | ") || `${liste.length} ipucu`);
  } catch (e) { ok("m5 koştu", false, String(e).slice(0, 200)); }
  await ctx.close();
}

// ================================================================ m6 · Düello özeti etiketi
if (calis("m6")) for (const g of GORUNUMLER) {
  console.log(`\n== m6 ${g.w}x${g.h} ${g.dil}`);
  const { p, ctx } = await sayfa(g, {});
  try {
    await p.goto(`${ADRES}/duello`, { waitUntil: "domcontentloaded" });   // duello4.css + duello-tahta.css yüklenir
    await p.waitForTimeout(2500);
    const tr = g.dil === "tr";
    // D4Ozet çıktısının birebir işaretlemesi (Duello4Arena.jsx › D4Ozet), maç sonu mod özeti yuvası genişliğinde
    const r = await p.evaluate((tr) => {
      const satir = (taraf, ad, k, s) => `<div class="hk-ele-satir hk-ele-satir--${taraf} d4-ozet-satir"><span class="hk-ele-ad">${ad}</span><span class="hk-ele-liste">
        <span class="hk-ele-k d4-ozet-hap">${tr ? `Kontrol ${k} tur` : `Control ${k} rounds`}</span>
        <span class="hk-ele-k d4-ozet-hap">${tr ? "En uzun seri" : "Longest streak"} <span class="d4-ozet-nokta">●●○</span> ${s}/3</span></span></div>`;
      const kap = document.createElement("div");
      kap.className = "msk-mod-ozet"; kap.id = "olcum-ozet";
      kap.style.cssText = "position:fixed;left:16px;right:16px;top:120px;z-index:99999;background:#fff";
      kap.innerHTML = `<section class="hk-ele d4-ozet"><h3 class="hk-ele-baslik">${tr ? "DÜELLO ÖZETİ" : "DUEL SUMMARY"}</h3>
        ${satir("ben", tr ? "Sen" : "You", 6, 2)}${satir("rakip", tr ? "Rakip" : "Opponent", 11, 3)}
        <p class="hk-ele-not">${tr ? "Kontrol 4 kez el değiştirdi · 14. turda bitti" : "Control changed hands 4 times · Ended in round 14"}</p></section>`;
      document.body.appendChild(kap);
      return [...kap.querySelectorAll(".hk-ele-satir")].map((s) => {
        const ad = s.querySelector(".hk-ele-ad"), hap = s.querySelector(".hk-ele-k");
        const a = ad.getBoundingClientRect(), h = hap.getBoundingClientRect();
        const rg = document.createRange(); rg.selectNodeContents(ad); const metin = rg.getBoundingClientRect();
        return { ad: ad.textContent, metinSag: +metin.right.toFixed(1), hapSol: +h.left.toFixed(1), binme: +(metin.right - h.left).toFixed(1), tasma: ad.scrollWidth > ad.clientWidth + 1 };
      });
    }, tr);
    await (await p.$("#olcum-ozet")).screenshot({ path: path.join(CIKTI, `${ETIKET}-m6-${g.w}x${g.h}-${g.dil}.png`) });
    console.log("  ", JSON.stringify(r));
    kayit("m6", `${g.w}-${g.dil}`, r);
    ok("m6 etiket hapın altına girmez", r.every((x) => x.binme <= 0), r.map((x) => `${x.ad}:${x.binme}`).join(" "));
  } catch (e) { ok("m6 koştu", false, String(e).slice(0, 200)); }
  await ctx.close();
}

// ================================================================ m7 · Mesajlar tarih dili
if (calis("m7")) for (const g of GORUNUMLER) {
  console.log(`\n== m7 ${g.w}x${g.h} ${g.dil}`);
  const { p, ctx } = await sayfa(g, {
    rpc: async (fn) => {
      if (fn === "dm_sohbetlerim") return [
        { kisi_id: U(901), gorunen_ad: "Ayşe", gorunen_avatar: null, son_metin: "Selam", son_zaman: "2026-09-24T18:10:00Z", son_benden: false, okunmamis: 0 },
        { kisi_id: U(902), gorunen_ad: "Mert", gorunen_avatar: null, son_metin: "Maça gel", son_zaman: "2026-09-20T09:00:00Z", son_benden: true, okunmamis: 1 }];
    },
  });
  try {
    await p.goto(`${ADRES}/mesajlar`, { waitUntil: "domcontentloaded" });
    await p.waitForFunction(() => /Ayşe/.test(document.body.innerText), null, { timeout: 20000 });
    await p.waitForTimeout(500);
    const metin = await p.evaluate(() => document.querySelector("main")?.innerText ?? document.body.innerText);
    const tarihler = (metin.match(/\b\d{1,2} [A-Za-zÇŞĞÜÖİçşğüöı]{3,5}\.?\b/g) || []);
    await foto(p, "m7", g);
    console.log("  ", JSON.stringify(tarihler));
    kayit("m7", `${g.w}-${g.dil}`, tarihler);
    const beklenen = g.dil === "en" ? /^(24 Sept?|20 Sept?)$/ : /^(24 Eyl|20 Eyl)$/;
    ok(`m7 tarihler ${g.dil} dilinde`, tarihler.length >= 2 && tarihler.every((x) => beklenen.test(x)), tarihler.join(", "));
  } catch (e) { ok("m7 koştu", false, String(e).slice(0, 200)); }
  await ctx.close();
}

// ================================================================ m9 · maç sonu geçişinde kabuk
const kabukOrnek = () => {
  const gor = (q) => { const e = document.querySelector(q); if (!e) return false; const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.height > 0 && c.display !== "none" && c.visibility !== "hidden"; };
  return { t: Date.now(), oyunModu: document.body.classList.contains("bd-oyun-modu"), msk: document.documentElement.classList.contains("msk-acik"),
    altmenu: gor(".a-altmenu"), ustBlok: gor(".bd-ust-blok, .a-ust-blok"), aradaEkran: Boolean(document.querySelector(".m1-sure-doldu, .qt-sure-doldu, [class*='sure-doldu']")),
    final: Boolean(document.querySelector(".ks-bitti--final")), kutlama: Boolean(document.querySelector(".msk")) };
};
async function kabukOlc(p, ms) {
  return p.evaluate(async ([ms, fn]) => {
    const f = new Function(`return (${fn})()`);
    const t0 = performance.now(), o = [];
    while (performance.now() - t0 < ms) { o.push(f()); await new Promise((r) => setTimeout(r, 50)); }
    return o;
  }, [ms, kabukOrnek.toString()]);
}
if (calis("m9")) for (const g of GORUNUMLER) {
  // --- Klasik
  console.log(`\n== m9 klasik ${g.w}x${g.h} ${g.dil}`);
  {
    const S = { bitti: false };
    const { p, ctx } = await sayfa(g, {
      rpc: async (fn) => {
        if (fn === "mac_sonu_ozet") { await bekle(600); return OZET(`mac:${MAC_ID}`); }
        if (fn === "mac_nabiz") return { durum: S.bitti ? "bitti" : "aktif", basladi: true, baslangic: iso(-5000), sunucu_zamani: iso(0), duraklatildi: false, duraklama_sn: 0, ben_hazir: true, rakip_hazir: true };
        if (fn === "get_match_question") return [{ question_id: U(21), soru: SORU.soru, secenekler: SORU.secenekler, soru_index: 0, baslangic: iso(-300), sunucu_zamani: iso(0) }];
        if (fn === "joker_mac_durumu") return [{ sinir: null, kullanilan: 0, ucretsiz_elli_kaldi: false, kisaltildi: false, kilitli: false, soruda_kullanildi: false, kullanim_sayilari: {}, tur_basi_sinir: 1, sunucu_zamani: iso(0), sis_bitis: null }];
      },
      tablo: async (yol) => {
        if (yol === "matches") return [S.bitti ? macSatiri({ durum: "bitti", kazanan: BEN, oyuncu1_skor: 130, oyuncu2_skor: 60, oyuncu1_soru: 10, oyuncu2_soru: 10 }) : macSatiri()];
      },
    });
    try {
      await p.goto(`${ADRES}/mac/${MAC_ID}`, { waitUntil: "domcontentloaded" });
      await p.waitForSelector(".m1-soru .qt-sik", { timeout: 25000 });
      await p.waitForTimeout(800);
      S.bitti = true;
      const o = await kabukOlc(p, 7000);
      await foto(p, "m9", g, "klasik-son");
      const ilkBitti = o.findIndex((x) => !x.oyunModu || x.kutlama || x.aradaEkran);
      const acik = o.slice(Math.max(0, ilkBitti)).filter((x) => !x.kutlama && (x.altmenu || x.ustBlok) && !x.msk);
      const r = { ornek: o.length, kabukGorunenOrnek: acik.length, kabukGorunenMs: acik.length * 50, kutlamaAcildi: o.some((x) => x.kutlama) };
      console.log("  ", JSON.stringify(r));
      kayit("m9", `klasik-${g.w}-${g.dil}`, r);
      ok("m9 Klasik: maç bitince kutlamaya dek üst çubuk/alt menü görünmez", r.kabukGorunenOrnek === 0 && r.kutlamaAcildi, `${r.kabukGorunenMs} ms görünür`);
    } catch (e) { ok("m9 klasik koştu", false, String(e).slice(0, 200)); }
    await ctx.close();
  }
  // --- Ortak Hazine
  console.log(`\n== m9 hazine ${g.w}x${g.h} ${g.dil}`);
  {
    const S = { bitti: false };
    const { p, ctx } = await sayfa(g, {
      rpc: async (fn) => {
        if (fn === "kasa_durum") {
          if (!S.bitti) return kasa();
          return kasa({ durum: "bitti", kazanan: BEN, sonuc_neden: "hedef", faz: "karar", son_karar: { veren: BEN, ac: true, deger: 62, son: true },
            oyuncular: kasa().oyuncular.map((x) => ({ ...x, puan: x.id === BEN ? 80 : 22, acma: x.id === BEN ? 2 : 1 })),
            gecmis: [{ tur: 5, karar: "ac", karar_ben: true, acilan_deger: 62, kasa_sonra: 0 }] });
        }
        if (fn === "mac_sonu_ozet") return OZET(`kasa:${KASA_ID}`);
        if (fn === "kasa_giris") return { durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null };
        if (/^kasa_|^kalp_at|^tepki/.test(fn)) return null;
      },
    });
    try {
      await p.goto(`${ADRES}/kasa/${KASA_ID}`, { waitUntil: "domcontentloaded" });
      await p.waitForSelector(".ks-mac .qt-sik", { timeout: 25000 });
      await p.waitForTimeout(1500);
      S.bitti = true;
      const o = await kabukOlc(p, 9000);
      await foto(p, "m9", g, "hazine-son");
      const ilk = o.findIndex((x) => x.final || x.kutlama || !x.oyunModu);
      const acik = o.slice(Math.max(0, ilk)).filter((x) => !x.kutlama && (x.altmenu || x.ustBlok) && !x.msk);
      const r = { ornek: o.length, finalGoruldu: o.some((x) => x.final), kabukGorunenOrnek: acik.length, kabukGorunenMs: acik.length * 50, kutlamaAcildi: o.some((x) => x.kutlama) };
      console.log("  ", JSON.stringify(r));
      kayit("m9", `hazine-${g.w}-${g.dil}`, r);
      ok("m9 Hazine: final sahnesinde üst çubuk/alt menü görünmez", r.kabukGorunenOrnek === 0, `${r.kabukGorunenMs} ms görünür`);
    } catch (e) { ok("m9 hazine koştu", false, String(e).slice(0, 200)); }
    await ctx.close();
  }
}

// ================================================================ m10 · Klasik bekleme yazısı
if (calis("m10")) for (const g of GORUNUMLER) {
  console.log(`\n== m10 ${g.w}x${g.h} ${g.dil}`);
  const S = { rakipSoru: 0 };
  const { p, ctx } = await sayfa(g, {
    rpc: async (fn) => {
      if (fn === "mac_nabiz") return { durum: "aktif", basladi: true, baslangic: iso(-5000), sunucu_zamani: iso(0), duraklatildi: false, duraklama_sn: 0, ben_hazir: true, rakip_hazir: true };
      if (fn === "get_match_question") return [{ question_id: U(21), soru: SORU.soru, secenekler: SORU.secenekler, soru_index: 0, baslangic: iso(-300), sunucu_zamani: iso(0) }];
      if (fn === "submit_match_answer") { await bekle(200); return [{ dogru: true, dogru_cevap: 1, puan: 10, benim_skor: 10, rakip_skor: 10, tekrar_hakki: false }]; }
      if (fn === "joker_mac_durumu") return [{ sinir: null, kullanilan: 0, ucretsiz_elli_kaldi: false, kisaltildi: false, kilitli: false, soruda_kullanildi: false, kullanim_sayilari: {}, tur_basi_sinir: 1, sunucu_zamani: iso(0), sis_bitis: null }];
    },
    // Rakip bu soruyu çoktan cevapladı (oyuncu2_soru = 1); sunucu soruyu benim cevabımla geçirecek ama satır henüz gelmedi
    tablo: async (yol) => { if (yol === "matches") return [macSatiri({ oyuncu2_soru: 1, oyuncu2_skor: 10 })]; },
  });
  try {
    await p.goto(`${ADRES}/mac/${MAC_ID}`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".m1-soru .qt-sik", { timeout: 25000 });
    await p.waitForTimeout(1200);
    await p.locator(".m1-soru .qt-sik").nth(1).click();
    await p.waitForSelector(".m1-bekleme", { timeout: 6000 });
    const metin = await p.evaluate(() => document.querySelector(".m1-bekleme")?.textContent ?? null);
    await foto(p, "m10", g);
    console.log("  ", metin);
    kayit("m10", `${g.w}-${g.dil}`, metin);
    ok("m10 rakip cevaplamışken 'X cevaplayınca' yazmaz", !/cevaplayınca|moves on when/i.test(metin ?? ""), metin);
  } catch (e) { ok("m10 koştu", false, String(e).slice(0, 200)); }
  await ctx.close();
}

// ================================================================ m11 · sayfa geçişinde kaydırma
if (calis("m11")) for (const g of GORUNUMLER) {
  console.log(`\n== m11 ${g.w}x${g.h} ${g.dil}`);
  const { p, ctx } = await sayfa(g, {});
  const sonuc = {};
  try {
    for (const hedef of ["/arkadaslar", "/siralama", "/meydan"]) {
      await p.goto(`${ADRES}/modlar`, { waitUntil: "domcontentloaded" });
      await p.waitForSelector(".a-modlar-bolum", { timeout: 20000 });
      await p.waitForTimeout(800);
      // Uzun ve kaydırılabilir bir sayfa olsun: içeriğe boşluk ekle (yalnız ölçüm), sonra aşağı kaydır
      // Hedef sayfa da uzun olsun (gerçek veride listeler uzun): gövdeye kalıcı en az yükseklik — yoksa kısa sayfa kaydırmayı kendiliğinden 0'a kırpar
      await p.evaluate(() => { document.body.style.minHeight = "6000px"; window.scrollTo(0, 900); });
      await p.waitForTimeout(200);
      const once = await p.evaluate(() => window.scrollY);
      // Gerçek gezinme (PUSH): alt menü / sayfa bağlantısı tıklanır (popstate = geri tuşu sayılır, ölçüme uymaz)
      const baglanti = p.locator(`a[href$="${hedef}"]:visible`).first();
      if (await baglanti.count()) await baglanti.click({ force: true });
      else await p.getByText(/^(Meydan Oku|Challenge)$/).locator("visible=true").first().click();
      await p.waitForTimeout(1500);
      const [sonra, yol] = await p.evaluate(() => [window.scrollY, location.pathname]);
      sonuc[hedef] = { once, sonra, yol };
      // geri tuşu: önceki sayfaya dönünce konum korunabilir (ölçüm, koşul değil)
    }
    await foto(p, "m11", g, "meydan");
    console.log("  ", JSON.stringify(sonuc));
    kayit("m11", `${g.w}-${g.dil}`, sonuc);
    for (const [hedef, x] of Object.entries(sonuc)) ok(`m11 ${hedef} en üstten açılır`, x.sonra === 0, `kaydırma ${x.once} → ${x.sonra}`);
  } catch (e) { ok("m11 koştu", false, String(e).slice(0, 200)); }
  await ctx.close();
}

// ================================================================ m12 · Modlar › Grup Maçı
if (calis("m12")) for (const g of GORUNUMLER) {
  console.log(`\n== m12 ${g.w}x${g.h} ${g.dil}`);
  const { p, ctx } = await sayfa(g, {});
  try {
    await p.goto(`${ADRES}/modlar`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".a-mod-kucuk", { timeout: 20000 });
    await p.waitForTimeout(800);
    await p.locator(".a-mod-kucuk").nth(2).click();
    await p.waitForTimeout(2000);
    const r = await p.evaluate(() => ({ url: location.pathname + location.search,
      grupPanelUstte: (() => { const e = [...document.querySelectorAll("details, section, div")].find((x) => x.open === true && /grup|group/i.test(x.className + " " + (x.querySelector("summary")?.textContent ?? ""))); return e ? Math.round(e.getBoundingClientRect().top) : null; })() }));
    await foto(p, "m12", g);
    console.log("  ", JSON.stringify(r));
    kayit("m12", `${g.w}-${g.dil}`, r);
    ok("m12 Grup Maçı kartı grup kurulumunu açar", /bolum=grup/.test(r.url), r.url);
  } catch (e) { ok("m12 koştu", false, String(e).slice(0, 200)); }
  await ctx.close();
}

// ================================================================ m13 · son oynanan mod
if (calis("m13")) {
  const g = GORUNUMLER[0];
  console.log(`\n== m13 ${g.w}x${g.h} ${g.dil}`);
  const { p, ctx } = await sayfa(g, {
    yerel: { "qt:v1:ana-son-mod": "kasa" },
    rpc: async (fn) => {
      if (fn === "mac_nabiz") return { durum: "aktif", basladi: true, baslangic: iso(-5000), sunucu_zamani: iso(0), duraklatildi: false, duraklama_sn: 0, ben_hazir: true, rakip_hazir: true };
      if (fn === "get_match_question") return [{ question_id: U(21), soru: SORU.soru, secenekler: SORU.secenekler, soru_index: 0, baslangic: iso(-300), sunucu_zamani: iso(0) }];
    },
    tablo: async (yol) => { if (yol === "matches") return [macSatiri()]; },
  });
  try {
    await p.goto(`${ADRES}/mac/${MAC_ID}`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".m1-soru .qt-sik", { timeout: 25000 });
    await p.waitForTimeout(800);
    const son = await p.evaluate(() => localStorage.getItem("qt:v1:ana-son-mod"));
    console.log("  ", son);
    kayit("m13", "klasik-sonrasi", son);
    ok("m13 Klasik maça girince son oynanan 'klasik'", son === "klasik", son);
  } catch (e) { ok("m13 koştu", false, String(e).slice(0, 200)); }
  await ctx.close();
}

// ================================================================ m14 · Hazine joker çubuğu sığma
const UZUN_SORU = { soru: "Osmanlı İmparatorluğu'nun son dönemlerinde başlayan ve Cumhuriyet'in ilk yıllarında da süren köklü yenilik hareketleri içinde, alfabenin Latin harflerine çevrilmesini sağlayan kurumun adı hangisidir?",
  secenekler: ["Millet Mektepleri ve Dil Encümeni heyeti", "Türk Tarih Kurumu ve Halkevleri birliği", "Maarif Vekâleti ile Darülfünun kurulu", "Türk Dil Kurumu ve Millet Mektepleri"], kategori: "tarih" };
if (calis("m14")) for (const [g, uzun] of [[{ w: 502, h: 794, dil: "en" }, false], [{ w: 502, h: 794, dil: "en" }, true], [{ w: 390, h: 844, dil: "tr" }, true], [{ w: 360, h: 780, dil: "en" }, true], [{ w: 360, h: 640, dil: "tr" }, false]]) {
  console.log(`\n== m14 ${g.w}x${g.h} ${g.dil}${uzun ? " uzun soru + hazine bende" : ""}`);
  const { p, ctx } = await sayfa(g, {
    rpc: async (fn) => {
      if (fn === "kasa_durum") return kasa({ ...(uzun ? { soru: UZUN_SORU, sahip: BEN, kasa: 36 } : {}), faz_bitis: iso(14000), sureler: { ...kasa().sureler, gosterim_bas: iso(-500), benim_bitis: iso(14000), faz_son: iso(14000) } });
      if (fn === "kasa_joker_durumu") return { sinir: 6, kullanilan: 0, ucretsiz_elli_kaldi: false, kilitli: false, kisaltildi: false, sis_bitis: null, sunucu_zamani: iso(0),
        kullanilan_turler: [], kullanim_sayilari: {}, tur_basi_sinir: 2, soru_basi_sinir: 1, soruda_kullanildi: false };
      if (fn === "envanterim") return [{ tur: "elli", adet: 2 }, { tur: "sure", adet: 1 }, { tur: "zaman_baskisi", adet: 1 }, { tur: "ikinci_sans", adet: 1 }];
      if (fn === "joker_fiyatlari") return { elli: 10, sure: 20, soru_degistir: 30, zaman_baskisi: 25, sigorta: 15, cifte_puan: 15, ikinci_sans: 20 };
      if (fn === "coin_bakiyem") return [{ bakiye: 120 }];
      if (fn === "kasa_giris") return { durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null };
      if (/^kasa_|^kalp_at|^tepki|^mac_sonu_ozet/.test(fn)) return null;
    },
  });
  try {
    await p.goto(`${ADRES}/kasa/${KASA_ID}`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".ks-mac .qt-sik", { timeout: 25000 });
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const vh = innerHeight;
      const ogeler = [...document.querySelectorAll(".qt-skill, .qt-skill *")].filter((e) => e.children.length === 0 && e.textContent.trim());
      const disari = ogeler.map((e) => ({ m: e.textContent.trim().slice(0, 16), alt: +e.getBoundingClientRect().bottom.toFixed(1) })).filter((x) => x.alt > vh + 0.5);
      const cubuk = document.querySelector(".qt-skill")?.closest("[class*='joker'], [class*='skill']");
      return { vh, cubukAlt: cubuk ? +cubuk.getBoundingClientRect().bottom.toFixed(1) : null, enAltYazi: Math.max(0, ...ogeler.map((e) => e.getBoundingClientRect().bottom)), disari,
        yatay: document.documentElement.scrollWidth - innerWidth };
    });
    await foto(p, "m14", g, uzun ? "uzun" : "");
    console.log("  ", JSON.stringify(r));
    kayit("m14", `${g.w}x${g.h}-${g.dil}${uzun ? "-uzun" : ""}`, r);
    ok(`m14 ${g.w}x${g.h} joker alt yazıları ekranda`, r.disari.length === 0 && r.enAltYazi <= r.vh, `en alt ${r.enAltYazi.toFixed?.(1) ?? r.enAltYazi} / ${r.vh}`);
  } catch (e) { ok("m14 koştu", false, String(e).slice(0, 200)); }
  await ctx.close();
}

// ================================================================ m15 · Turnuva yükleme
if (calis("m15")) {
  const g = GORUNUMLER[0];
  for (const durumTur of ["lobi", "yok"]) {
    console.log(`\n== m15 ${durumTur} ${g.w}x${g.h} ${g.dil}`);
    const { p, ctx, durum } = await sayfa(g, {
      gecikme: 300,
      tablo: async (yol, d, url) => {
        if (yol === "tournaments") {
          if (durumTur === "yok") return /bitti/.test(decodeURIComponent(url)) ? [{ id: U(701), durum: "bitti", tarih: "2026-10-11", saat: "20:00", bitis: iso(-3600000), kazanan: null }] : [];
          return /aktif/.test(decodeURIComponent(url)) ? [{ id: U(701), durum: "lobi", tarih: "2026-10-11", saat: "22:00", baslangic: iso(3600000), bitis: null, kazanan: null }] : [];
        }
      },
    });
    try {
      const t0 = Date.now();
      await p.goto(`${ADRES}/turnuva`, { waitUntil: "domcontentloaded" });
      await p.waitForSelector(".qt-iskelet, .qt-iskelet-satir", { timeout: 20000 }).catch(() => {});
      const tIskelet = Date.now();
      await p.waitForFunction(() => !document.querySelector("main .qt-iskelet, main .qt-iskelet-satir, main [aria-busy='true']"), null, { timeout: 20000 });
      const tBitti = Date.now();
      await foto(p, "m15", g, durumTur);
      const ilgili = durum.istekler.filter((x) => /^(tournaments|tournament_players)/.test(x.yol)).map((x) => ({ yol: x.yol, t: x.t - t0 }));
      const r = { iskeletSure_ms: tBitti - tIskelet, toplam_ms: tBitti - t0, turnuvaIstekleri: ilgili };
      console.log("  ", JSON.stringify(r));
      kayit("m15", durumTur, r);
    } catch (e) { ok("m15 koştu", false, String(e).slice(0, 200)); }
    await ctx.close();
  }
}

await tarayici.close();
// --yalniz koşuları aynı dosyada birleşir (önceki maddeler silinmez)
const dosya = path.join(CIKTI, `${ETIKET}.json`);
let eski = {};
try { eski = JSON.parse(fs.readFileSync(dosya, "utf8")); } catch { /* ilk koşu */ }
fs.writeFileSync(dosya, JSON.stringify({ ...eski, ...rapor }, null, 1));
console.log(`\n${gecti} geçti, ${kaldi} kaldı → ${path.join(CIKTI, ETIKET + ".json")}`);
