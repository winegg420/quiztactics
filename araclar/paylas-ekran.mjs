// PAYLAŞ düğmesi + 1080×1920 paylaşım kartları — ekran görüntüsü ve ölçüm (14 Eki 2026).
// · Düello maç sonu (Son Düello BERABERE, 1102) TAKLİT VERİYLE: duello_* ve mac_sonu_ozet tarayıcıda taklit edilir
//   (sunucuya yazmaz). Paylaş Detay açılmadan sahnede görünür (14 Eki: Düello + Ortak Hazine + Klasik + Saf Bilgi + Grup + Turnuva); dokununca (navigator.share yoksa) "Bağlantı kopyalandı".
// · Arkadaşlar › Arkadaş davet et: Facebook + Paylaş yan yana (gerçek sayfa; yalnız okuma).
// · İki kart (sonuç + davet) TR ve EN: lib/paylasKarti.js tarayıcıda çizilir, PNG olarak kaydedilir.
// Genişlikler: 390 ve 1440. Çıktı: tasarim/paylas/*.png + olcum.json
// Oturum ve bütün Supabase istekleri TAKLİT edilir (sahte JWT + profilim/davet/düello yanıtları): canlıya hiç istek gitmez,
// hesap açılmaz (otomasyonda misafir girişi Turnstile'a takılır).
// Kullanım: npm run dev -- --port 5188 · node araclar/paylas-ekran.mjs --adres=http://localhost:5188
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const CIKTI = path.resolve("tasarim/paylas");
fs.mkdirSync(CIKTI, { recursive: true });

const ID = "0d0e1100-0000-4000-8000-0000000000c1";
const RAKIP = "0d0e1100-0000-4000-8000-0000000000bb";
const BEN = "0d0e1100-0000-4000-8000-0000000000aa";
const REF = "etezccrifaetzrgfvawl";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: BEN, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 36000, is_anonymous: true })}.sahte`;
const KULLANICI = { id: BEN, aud: "authenticated", role: "authenticated", email: "", phone: "", is_anonymous: true,
  app_metadata: { provider: "anonymous", providers: [] }, user_metadata: {}, created_at: "2026-10-01T10:00:00Z" };
const OTURUM_DEGER = JSON.stringify({ access_token: JWT, token_type: "bearer", expires_in: 36000, expires_at: Math.floor(Date.now() / 1000) + 36000,
  refresh_token: "sahte", user: KULLANICI });
const PROFIL = { id: BEN, xp: 1240, dil: "tr", lig: "gumus", coin: 1480, puan: 320, seri: 3, ulke: "TR", elmas: 40, level: 7, sehir: "İzmir", askida: false,
  is_bot: false, gorunum: null, acik_bot: false, bot_turu: null, cinsiyet: null, level_xp: 140, provider: null, seri_gun: 3, takma_ad: "Deniz Yıldırımoğlu",
  username: "oyuncu_paylas", bot_aktif: true, last_seen: new Date().toISOString(), lig_gizli: false, avatar_url: "/avatars/pro/tilki-k04.svg", created_at: "2026-10-01T10:00:00Z",
  davet_eden: null, davet_kodu: "QT7K2M", gorunen_ad: "Deniz Yıldırımoğlu", puan_hafta: 120, toplam_mac: 42, arac_hesabi: true, facebook_id: null, sampiyonluk: 0,
  davet_sayisi: 0, hile_yetkisi: false, mesaj_kapali: false, seri_en_uzun: 5, avatar_onayli: true, rahatsiz_etme: false, gorunen_avatar: "/avatars/pro/tilki-k04.svg",
  dereceli_tercih: true, koleksiyon_puani: 10, takma_ad_secildi: true, vitrin_rozetleri: [], duello_rehber_mac: ID, hazine_rehber_mac: null,
  kosullar_kabul_at: "2026-10-01T10:00:00Z", level_gereken: 400 };
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const olcum = {};

function bitmisDuello(ben) {
  const oyuncu = (id, ad, dogru) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/samuray-y15.svg" : "/avatars/pro/tilki-k04.svg", gorunum: null, dogru, unvan: null });
  const son = (no, d) => ({ tip: "son", tur: 0, sonuc: d ? "ikisi_dogru" : "ikisi_yanlis", kontrol_sonra: null, seri_sonra: 0, kategori: "tarih", rakip_kategori: "tarih",
    soru: "Örnek soru " + no, secenekler: ["A", "B", "C", "D"], dogru_cevap: 1, benim_cevabim: d ? 1 : 0, ben_dogru: d, ben_yanitsiz: false, rakip_dogru: d, rakip_yanitsiz: false });
  const gecmis = Array.from({ length: 29 }, (_, i) => (i >= 19 ? son(i + 1, i % 2 === 0)
    : { ...son(i + 1, true), tip: "notr" }));
  return {
    surum: 4, id: ID, durum: "bitti", dereceli: true, faz: "son", faz_bitis: new Date().toISOString(), sunucu_zamani: new Date().toISOString(),
    ben, rakip: RAKIP, oyuncular: [oyuncu(ben, "Sen", 15), oyuncu(RAKIP, "Deniz Yıldırımoğlu", 15)],
    v4: { kontrol: null, seri: 0, seri_hedef: 3, tur: 0, max_tur: 15, notr_seri: 29, notr_max: 5, son: true, soru_no: 29, max_soru: 20, son_max: 10, berabere: true,
      rehber: false, giris_bekle: false, kullanilan: [], kart: null, benim_kategori: "tarih", rakip_kategori: "tarih" },
    soru: null, cevap: null,
    son_hamle: { surum: 4, tip: "son", no: 29, sonuc: "ikisi_dogru", kazanan: null, seri_hedef: 3 },
    skill: { kapali: true, set: [], izinli: [], toplam_hak: 4, tur_basi_hak: 2, soru_basi_hak: 1, kullanilan: 0, sayilar: {}, bu_soruda: 0, rakip_bu_soruda: false, envanter: {}, fiyatlar: {}, coin: 120 },
    sureler: { kart: 7, cevap: 15, sonuc: 3, gosterim_payi_ms: 2000 },
    kazanan: null, terk_eden: null, odul: { lig_puan: 12, coin: 22 }, ezeli: null, gecmis, rovans: { isteyen: null, id: null, gecerli: false },
  };
}
const OZET = {
  hazir: true, kazanan: null, terk: { ben: false, rakip: false },
  dokum: { hazir: true, toplam: { coin: 22, lig: 12 }, kalemler: [{ kalem: "beraberlik", coin: 22, lig: 0, detay: {} }, { kalem: "beraberlik", coin: 0, lig: 12, detay: {} }], rozetler: [], gorevler: [] },
  lig: { puan: 12 }, level: null, gorevler: [], rozetler: [],
};

const KASA_AYAR = { kasa_modu_acik: 1, kasa_odul_acik: 1, kasa_odul_carpani: 1, kasa_artis: 2, kasa_ikisi_dogru_artis: 6,
  kasa_hedef_puan: 80, kasa_max_tur: 36, kasa_soru_sn: 15, kasa_karar_sn: 5, kasa_sonuc_sn: 3, kasa_tavan: 60, kasa_devam_carpan: 2, kasa_acma_min: 0 };
function bitmisKasa(ben) {
  const oyuncu = (id, ad, puan, acma) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/samuray-y15.svg" : "/avatars/pro/tilki-k04.svg", gorunum: null, unvan: null, puan, acma });
  const soru = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], kategori: "cografya" };
  return { id: ID, durum: "bitti", dereceli: true, faz: "sonuc", faz_bitis: new Date().toISOString(), sunucu_zamani: new Date().toISOString(),
    ben, tur: 9, max_tur: 36, hedef: 80, altin: false, artis: 2, ikisi_artis: 6, kasa: 0, sahip: null, soru,
    oyuncular: [oyuncu(ben, "Sen", 82, 3), oyuncu(RAKIP, "Deniz Yıldırımoğlu", 54, 2)],
    karar: null, son_karar: null, cevap: null, sonuc: null, kopuk: null, baglanmayan: null,
    sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 1500, gosterim_bas: null },
    kazanan: ben, sonuc_neden: "hedef", terk: { ben: false, rakip: false }, rovans: { isteyen: null, id: null, gecerli: false },
    gecmis: [1, 2, 3].map((t) => ({ tur: t, altin: false, kategori: "cografya", soru: soru.soru, secenekler: soru.secenekler, dogru_cevap: 1, benim_cevabim: 1,
      ben_dogru: true, rakip_dogru: t === 3, karar: t === 3 ? "ac" : "devam", karar_ben: true, acilan_deger: 12, kasa_sonra: t * 2 })) };
}
// 14 Eki 2026: Grup (3 kişi, ben 2.) ve Turnuva (6 kişi, ben 3.) maç sonu — Paylaş aynı yerleşimle sahnede
const DIGER = ["0d0e1100-0000-4000-8000-0000000000cc", "0d0e1100-0000-4000-8000-0000000000dd", "0d0e1100-0000-4000-8000-0000000000ee", "0d0e1100-0000-4000-8000-0000000000ff"];
function bitmisGrup(ben) {
  const k = (id, ad, skor) => ({ group_match_id: ID, user_id: id, davet_durumu: "kabul", skor, joined_at: "2026-10-14T10:00:00Z", hazir: true, terk_at: null,
    profil: { id, gorunen_ad: ad, gorunen_avatar: id === ben ? "/avatars/pro/tilki-k04.svg" : null, gorunum: null } });
  return { id: ID, durum: "bitti", basladi: true, aktif_soru: 10, soru_ids: [], kategori: null, kazanan: RAKIP, olusturan: RAKIP, duraklatildi_at: null,
    soru_baslangic: "2026-10-14T10:05:00Z", created_at: "2026-10-14T10:00:00Z",
    katilimcilar: [k(ben, "Sen", 80), k(RAKIP, "Deniz Yıldırımoğlu", 110), k(DIGER[0], "Mert", 40)] };
}
const TURNUVA = { id: ID, durum: "bitti", tarih: new Date().toISOString().slice(0, 10), saat: "20:00", kazanan: RAKIP, aktif_soru: 12, soru_ids: [],
  baslangic: "2026-10-14T17:00:00Z", bitis: "2026-10-14T17:10:00Z", altin_soru: false };
function turnuvaOyunculari(ben) {
  const o = (id, ad, dogru, elendi, soru) => ({ tournament_id: ID, user_id: id, elendi, elenme_sorusu: soru, dogru_sayisi: dogru, terk_at: null, joined_at: "2026-10-14T16:59:00Z",
    profil: { gorunen_ad: ad, gorunen_avatar: id === ben ? "/avatars/pro/tilki-k04.svg" : null, gorunum: null, puan: 100, level: 5 } });
  return [o(RAKIP, "Deniz Yıldırımoğlu", 12, false, null), o(DIGER[0], "Mert", 11, true, 12), o(ben, "Sen", 9, true, 10),
    o(DIGER[1], "Ayşe", 6, true, 7), o(DIGER[2], "Ali", 4, true, 5), o(DIGER[3], "Ece", 2, true, 3)];
}
function bitmisMac(ben, jokersiz = false) {
  const p = (id, ad, av) => ({ id, gorunen_ad: ad, gorunen_avatar: av, gorunum: null, acik_bot: false });
  return { id: ID, durum: "bitti", jokersiz, oyuncu1: ben, oyuncu2: RAKIP, oyuncu1_skor: 120, oyuncu2_skor: 90, kazanan: ben, terk_eden: null, senkron: true,
    oyuncu1_soru: 10, oyuncu2_soru: 10, soru_sayisi: 10, mevcut_soru: 10, created_at: "2026-10-14T10:00:00Z", kabul_at: "2026-10-14T10:00:05Z",
    p1: p(ben, "Sen", "/avatars/pro/tilki-k04.svg"), p2: p(RAKIP, "Deniz Yıldırımoğlu", "/avatars/pro2/samuray-y15.svg") };
}
const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };
// Paylaş: Detay açılmadan ilk ekranda tam görünür, ≥ 44 px, başka öğeyle çakışmıyor (üstüne binen yok)
async function paylasOlc(s, ad) {
  const dugme = s.locator(".msk-detay .qt-paylas .qt-dugme").first();
  await dugme.waitFor({ timeout: 8000 });
  const o = await s.evaluate(() => {
    const d = document.querySelector(".msk-detay .qt-paylas .qt-dugme");
    const r = d.getBoundingClientRect();
    const ust = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const kesisen = [...document.querySelectorAll(".msk-detay-dugme, .msk-eylem .qt-dugme, .msk-eylem .qt-ikon-dugme, .msk-gorevler, .msk-lig, .msk-kart, .msk-mod-ozet, .msk-karsilasma, .qt-altmenu")]
      .filter((e) => { const k = e.getBoundingClientRect(); return k.width && k.height && !(k.right <= r.left || k.left >= r.right || k.bottom <= r.top || k.top >= r.bottom); })
      .map((e) => e.className.toString().slice(0, 40));
    const eylem = document.querySelector(".msk-eylem")?.getBoundingClientRect();
    const cs = getComputedStyle(d);
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), vh: innerHeight, minH: cs.minHeight, boxSizing: cs.boxSizing, zoom: cs.zoom, kok: getComputedStyle(document.documentElement).fontSize,
      gorunur: r.top >= 0 && r.bottom <= (eylem ? eylem.top : innerHeight) && r.left >= 0 && r.right <= innerWidth,
      ustteki: ust && d.contains(ust), kesisen, panelKapali: Boolean(document.querySelector(".msk-panel[hidden]") || !document.querySelector(".msk-panel")) };
  });
  olcum[`paylas-${ad}`] = o;
  ok(`${ad}: Paylaş Detay kapalıyken ilk ekranda tam görünür`, o.gorunur && o.panelKapali, JSON.stringify(o));
  ok(`${ad}: Paylaş ≥ 44 px`, o.h >= 44 && o.w >= 44, JSON.stringify(o));
  ok(`${ad}: Paylaş başka öğeye binmiyor`, o.ustteki && o.kesisen.length === 0, JSON.stringify(o));
  return { x: o.x, y: o.y, width: o.w, height: o.h };
}

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
const baglamAc = async (dil, w, h) => {
  const durumDosya = { cookies: [], origins: [{ origin: kok, localStorage: [
    { name: `sb-${REF}-auth-token`, value: OTURUM_DEGER }, { name: "bildim_dil", value: dil }, { name: "bildim_giris_dili", value: dil },
    { name: "bildim_tanitim", value: "1" }] }] };
  const b = await tarayici.newContext({ storageState: durumDosya, viewport: { width: w, height: h }, hasTouch: w < 800, serviceWorkers: "block",
    permissions: ["clipboard-read", "clipboard-write"] });
  // Paylaşım menüsü otomasyonda açılamaz → pano yolu sınanır (navigator.share yok)
  await b.addInitScript(() => { try { Object.defineProperty(Navigator.prototype, "share", { value: undefined, configurable: true }); } catch { /* */ } });
  // Supabase taklidi: sayfa özel yanıtlarını kendisi verir (s.route), geri kalan her şey burada — canlıya istek gitmez.
  await b.route(/supabase\.co\//, async (r) => {
    const u = r.request().url();
    const json = (veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
    if (u.includes("/auth/v1/user")) return json(KULLANICI);
    if (u.includes("/auth/v1/token")) return json(JSON.parse(OTURUM_DEGER));
    if (u.includes("/auth/v1/")) return json({});
    if (u.includes("/rpc/profilim")) return json({ ...PROFIL, dil });
    if (u.includes("/rpc/davet_kodum")) return json({ kod: "QT7K2M", yol: "/davet/QT7K2M", odul_davet_eden: 300, odul_davet_edilen: 100, gereken_level: 5, aylik_sinir: 10, bu_ay_odullenen: 0 });
    if (u.includes("/rpc/davet_durumum")) return json({ davetlerim: [], davet_eden: null, ozet: { toplam: 0 }, baglanabilir: false });
    if (u.includes("/rest/v1/rpc/")) return json(null);
    if (u.includes("/rest/v1/")) return json([]);
    return json({});
  });
  return b;
};

try {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    console.log(`\n== ${w}×${h}`);
    // ---------- Düello maç sonu: berabere + Paylaş ----------
    const b = await baglamAc("tr", w, h);
    const s = await b.newPage();
    const konsol = [];
    s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
    const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };
    await s.route(/\/rest\/v1\/rpc\//, async (r) => {
      const req = r.request(); const u = req.url();
      const json = (veri) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(veri) });
      try {
        if (u.includes("/rpc/duello_durum")) return json(bitmisDuello(jwtSub(req)));
        if (u.includes("/rpc/mac_sonu_ozet")) return json(OZET);
        if (u.includes("/rpc/sezon_mac_sp_ozetim")) return json(null);
        if (/\/rpc\/duello_(giris|baglanti|terk|rovans)|kalp_at/.test(u)) return json(null);
        return r.fallback();   // context taklidine
      } catch { try { await r.fallback(); } catch { /* */ } }
    });
    await s.goto(`${ADRES}/duello/${ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.waitForSelector(".msk-baslik", { timeout: 30000 }).catch(async (e) => { await s.screenshot({ path: path.join(CIKTI, "_hata.png") }); console.log("URL", s.url(), (await s.locator("body").innerText()).slice(0, 600)); throw e; });
    await s.waitForTimeout(3500);   // sahne aşamaları
    const baslik = (await s.locator(".msk-baslik").innerText()).trim();
    const alt = await s.locator(".msk-kok, body").first().innerText();
    ok("başlık BERABERE", /BERABERE/i.test(baslik), baslik);
    ok("alt yazı: ödülün yarısı ikinize", alt.includes("Son Düello'da kazanan çıkmadı"), "");
    await s.screenshot({ path: path.join(CIKTI, `duello-berabere-${w}.png`) });
    // 14 Eki 2026: Paylaş Detay'ın İÇİNDE DEĞİL — sahnede, Detay'ı açmadan ilk ekranda
    const kutu = await paylasOlc(s, `duello-${w}`);
    const dugme = s.locator(".msk-detay .qt-paylas .qt-dugme").first();
    await s.screenshot({ path: path.join(CIKTI, `mac-sonu-paylas-${w}.png`) });
    await dugme.click();
    await s.locator(".qt-paylas-bilgi").waitFor({ timeout: 8000 }).catch(() => {});
    const bilgi = await s.locator(".qt-paylas-bilgi").innerText().catch(() => "");
    const pano = await s.evaluate(() => navigator.clipboard.readText()).catch(() => "");
    ok("navigator.share yok → \"Bağlantı kopyalandı\" + panoda davet bağlantısı", bilgi === "Bağlantı kopyalandı" && /\/davet\//.test(pano), `${bilgi} | ${pano}`);
    await s.screenshot({ path: path.join(CIKTI, `mac-sonu-kopyalandi-${w}.png`) });
    olcum[`mac-sonu-${w}`] = { baslik, kutu, bilgi, pano, yatayTasma: await s.evaluate(() => document.documentElement.scrollWidth - innerWidth) };
    ok("maç sonu yatay taşma yok", olcum[`mac-sonu-${w}`].yatayTasma <= 0);
    ok("maç sonu sayfa hatası yok", konsol.length === 0, konsol.join(" | "));
    await b.close();

    // ---------- Ortak Hazine, Klasik, Saf Bilgi, Grup, Turnuva maç sonu: Paylaş sahnede ----------
    for (const mod of ["kasa", "klasik", "saf", "grup", "turnuva"]) {
      const bm = await baglamAc("tr", w, h);
      const sm = await bm.newPage();
      const hatalar = [];
      sm.on("pageerror", (e) => hatalar.push("SAYFA: " + String(e).slice(0, 200)));
      sm.on("console", (m) => { if (m.type() === "error" && /TypeError|ReferenceError|undefined/.test(m.text())) hatalar.push("KONSOL: " + m.text().slice(0, 300)); });
      await sm.route(/\/rest\/v1\/(rpc\/|oyun_ayarlari|matches|group_matches|tournaments|tournament_players)/, async (r) => {
        const req = r.request(); const u = req.url();
        const json = (veri) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(veri) });
        try {
          if (u.includes("/rest/v1/oyun_ayarlari")) return json(Object.entries(KASA_AYAR).map(([anahtar, deger]) => ({ anahtar, deger })));
          if (u.includes("/rpc/kasa_durum")) return json(bitmisKasa(jwtSub(req)));
          if (u.includes("/rpc/kasa_giris")) return json({ durum: "bitti", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
          if (u.includes("/rest/v1/matches")) return json(bitmisMac(jwtSub(req), mod === "saf"));
          if (u.includes("/rest/v1/group_matches")) { const g = bitmisGrup(jwtSub(req)); return json(/vnd\.pgrst\.object/.test(req.headers()["accept"] || "") ? g : [g]); }
          // Turnuva: açık turnuva yok, son biten bu turnuva
          if (u.includes("/rest/v1/tournaments")) return json(/bitti/.test(decodeURIComponent(u)) ? [TURNUVA] : []);
          if (u.includes("/rest/v1/tournament_players")) return json(turnuvaOyunculari(jwtSub(req)));
          if (u.includes("/rpc/mac_sonu_ozet")) return json(OZET);
          return r.fallback();
        } catch { try { await r.fallback(); } catch { /* */ } }
      });
      const yol = { kasa: `/kasa/${ID}`, klasik: `/mac/${ID}`, saf: `/mac/${ID}`, grup: `/grup-mac/${ID}`, turnuva: "/turnuva" }[mod];
      await sm.goto(`${ADRES}${yol}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await sm.waitForSelector(".msk-baslik", { timeout: 30000 }).catch(async (e) => { await sm.screenshot({ path: path.join(CIKTI, `_hata-${mod}.png`) }); console.log("URL", sm.url(), hatalar.join(" | ")); throw e; });
      await sm.waitForTimeout(3500);
      await paylasOlc(sm, `${mod}-${w}`);
      await sm.screenshot({ path: path.join(CIKTI, `mac-sonu-paylas-${mod}-${w}.png`) });
      ok(`${mod}: sayfa hatası yok`, hatalar.length === 0, hatalar.join(" | "));
      await bm.close();
    }

    // ---------- Arkadaşlar › davet: Facebook + Paylaş ----------
    const b2 = await baglamAc("tr", w, h);
    const s2 = await b2.newPage();
    await s2.goto(`${ADRES}/arkadaslar`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const ikili = s2.locator(".qt-paylas-ikili");
    await ikili.waitFor({ timeout: 30000 });
    await ikili.scrollIntoViewIfNeeded();
    await s2.waitForTimeout(800);
    const fb = await ikili.locator(".qt-dugme").nth(0).boundingBox();
    const pd = await ikili.locator(".qt-dugme").nth(1).boundingBox();
    ok("davet: Facebook ve Paylaş yan yana, aynı yükseklik", fb && pd && Math.abs(fb.y - pd.y) < 2 && pd.x > fb.x && Math.abs(fb.height - pd.height) < 2, JSON.stringify({ fb, pd }));
    await s2.locator("#ar-davet").scrollIntoViewIfNeeded().catch(() => {});
    await s2.screenshot({ path: path.join(CIKTI, `davet-paylas-${w}.png`) });
    olcum[`davet-${w}`] = { fb, pd };
    await b2.close();
  }

  // ---------- Kartlar (TR + EN) ----------
  for (const dil of ["tr", "en"]) {
    const b = await baglamAc(dil, 390, 844);
    const s = await b.newPage();
    await s.goto(`${ADRES}/arkadaslar`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.locator(".qt-paylas-ikili").waitFor({ timeout: 30000 });
    const kartlar = await s.evaluate(async () => {
      const m = await import("/oyun/lib/paylasKarti.js");
      const veri = async (blob) => {
        const okuyucu = new FileReader();
        return new Promise((coz) => { okuyucu.onload = () => coz(okuyucu.result); okuyucu.readAsDataURL(blob); });
      };
      const ortak = { kod: "QT7K2M", baglanti: `${location.origin}/davet/QT7K2M` };
      const sonuc = await m.paylasKartiCiz({ tur: "sonuc", ad: "Deniz Yıldırımoğlu", avatar: "/avatars/pro/tilki-k04.svg", benSkor: 15, rakipSkor: 12, durum: "kazandi", rakipAd: "Ayşe K.", ...ortak });
      const davet = await m.paylasKartiCiz({ tur: "davet", ad: "Deniz Yıldırımoğlu", ...ortak });
      // 14 Eki 2026: çok oyunculu modlar (Grup, Turnuva) — skor yerine derece
      const derece = await m.paylasKartiCiz({ tur: "sonuc", ad: "Deniz Yıldırımoğlu", avatar: "/avatars/pro/tilki-k04.svg", durum: "kaybetti", derece: 2, skorEtiket: "3 oyuncu arasında · 80 puan", ...ortak });
      const boyut = async (blob) => { const g = await createImageBitmap(blob); return [g.width, g.height]; };
      return { sonuc: await veri(sonuc), davet: await veri(davet), derece: await veri(derece), sonucB: await boyut(sonuc), davetB: await boyut(davet), dereceB: await boyut(derece), tip: [sonuc.type, davet.type, derece.type] };
    });
    for (const tur of ["sonuc", "davet", "derece"]) {
      fs.writeFileSync(path.join(CIKTI, `kart-${tur}-${dil}.png`), Buffer.from(kartlar[tur].split(",")[1], "base64"));
      ok(`kart ${tur} ${dil}: PNG 1080×1920`, kartlar[`${tur}B`][0] === 1080 && kartlar[`${tur}B`][1] === 1920 && kartlar.tip.every((t) => t === "image/png"), JSON.stringify(kartlar[`${tur}B`]));
    }
    await b.close();
  }
} catch (e) {
  kaldi++; console.error("HATA:", e.message);
} finally {
  await tarayici.close();
  fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(olcum, null, 1));
  console.log(`\n${gecti} geçti, ${kaldi} kaldı · çıktı: ${path.relative(process.cwd(), CIKTI)}`);
  process.exitCode = kaldi ? 1 : 0;
}
