// PAYLAŞ düğmesi + 1080×1920 paylaşım kartları — ekran görüntüsü ve ölçüm (14 Eki 2026).
// · Düello maç sonu (Son Düello BERABERE, 1102) TAKLİT VERİYLE: duello_* ve mac_sonu_ozet tarayıcıda taklit edilir
//   (sunucuya yazmaz). Detay açılır, Paylaş düğmesi görünür; dokununca (navigator.share yoksa) "Bağlantı kopyalandı".
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
    await s.locator(".msk-detay-dugme").click();
    const dugme = s.locator(".qt-paylas .qt-dugme").first();
    await dugme.waitFor({ timeout: 8000 });
    await dugme.scrollIntoViewIfNeeded();
    await s.waitForTimeout(500);
    const kutu = await dugme.boundingBox();
    ok("maç sonu Paylaş görünür, ≥ 44 px", kutu && kutu.height >= 44 && kutu.width >= 44, JSON.stringify(kutu));
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
      const boyut = async (blob) => { const g = await createImageBitmap(blob); return [g.width, g.height]; };
      return { sonuc: await veri(sonuc), davet: await veri(davet), sonucB: await boyut(sonuc), davetB: await boyut(davet), tip: [sonuc.type, davet.type] };
    });
    for (const tur of ["sonuc", "davet"]) {
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
