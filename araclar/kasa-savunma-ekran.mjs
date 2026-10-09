// 987 · Ortak Hazine Savunma Hakkı — TAKLİT VERİYLE ekran ölçümü (sunucuya YAZMAZ; RPC'ler tarayıcıda taklit).
// Koşular: 360×640, 390×664 ve 390×844, TR + EN, ayrıca 360×640 hareket azaltma. Çıktı: tasarim/kasa-savunma/*.png
//   · lobi: tam kurallarda Savunma Hakkı satırı var, 954 "ücretsiz 50:50" satırı yok
//   · karar (8 Eki 2026): AÇ "→ +24 · Skor 42/80", DEVAM "→ Hazine 48" + kalkan + "sahipsiz kalır"; hak varsa kalkan yok;
//     hazine 80'de yalnız AÇ (DEVAM düğmesi yok)
//   · hak simgesi: iki oyuncunun avatarında (kimde varsa) görünür
//   · tetik anı (sonuç bandı + kalkan anı ~1,5 sn), yeniden okumada TEKRAR OYNAMAZ, dokunarak geçilir
//   · Savunma Sorusu: savunan şık seçebilir, Zaman Baskısı pasif; izleyen (8 Eki 2026): kalkanlı seyir bandı + büyük sayaç,
//     şıklar soluk, şık seçemez, joker çubuğu pasif
//   · savundu / düştü anı + bant metni
// Her ekranda: yatay taşma yok · konsol hatası yok.
// Kullanım: npm run dev -- --port 5188 (başka kabukta) · node araclar/kasa-savunma-ekran.mjs [--adres=…] [--dil=tr] [--en=360]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { ceviriToplayici } from "./ceviri-dom.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const OTURUM = path.resolve(typeof ARG.oturum === "string" ? ARG.oturum : ".arayuz-denetim-oturum.json");   // --oturum=dosya: kendi test hesabın
const CIKTI = path.resolve("tasarim/kasa-savunma");
fs.mkdirSync(CIKTI, { recursive: true });
// --taklit-profil=dosya.json (8 Eki 2026): misafir oturumu süresi dolduğunda — sahte oturum + BÜTÜN REST/Auth taklit,
// canlıya hiç istek gitmez. Dosya: bir profilim() çıktısı (ör. test hesabının).
const TAKLIT = typeof ARG["taklit-profil"] === "string" ? JSON.parse(fs.readFileSync(ARG["taklit-profil"], "utf8")) : null;
if (!TAKLIT && !fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }

const KASA_ID = "0b6f6800-0000-4000-8000-0000000987aa";
const KR = "0b6f6800-0000-4000-8000-0000000987bb";
const KASA_AYAR = { kasa_modu_acik: 1, kasa_odul_acik: 1, kasa_odul_carpani: 1, kasa_artis: 2, kasa_ikisi_dogru_artis: 6,
  kasa_hedef_puan: 80, kasa_max_tur: 36, kasa_soru_sn: 15, kasa_karar_sn: 5, kasa_sonuc_sn: 3, kasa_acma_min: 0,
  kasa_devam_joker_acik: 1, kasa_devam_birakir: 1, kasa_tavan: 80, kasa_devam_carpan: 2, kasa_savunma_acik: 1 };
const SORU = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], kategori: "cografya" };
const SORU2 = { soru: "Suyun kaynama noktası deniz seviyesinde kaç derecedir?", secenekler: ["90", "100", "110", "120"], kategori: "bilim" };
const BOS_JOKER = { turler: [], kapali: [], elenen: null, ikinci_sans: false, kisaltildi: false };

function kasaDurum(ad, ben, t0) {
  const simdi = Date.now();
  const isoT = (ms) => new Date(t0 + ms).toISOString();
  const oyuncu = (id, a, puan) => ({ id, gorunen_ad: a, gorunen_avatar: id === KR ? "/avatars/pro2/basortulu-y04.svg" : null, gorunum: null, unvan: null, puan, acma: 1 });
  const sav = (sahip, durum, ek = {}) => ({ sahip, rakip: sahip === ben ? KR : ben, tur: 9, kategori: "cografya", durum, ...ek });
  const temel = {
    id: KASA_ID, durum: "aktif", dereceli: true, faz: "cevap", faz_bitis: isoT(16500), sunucu_zamani: new Date(simdi).toISOString(),
    ben, tur: 9, max_tur: 36, hedef: 80, tavan: 80, devam_carpan: 2, altin: false, artis: 2, ikisi_artis: 6, kasa: 24, sahip: null, acma_min: 0, jokerli: true,
    oyuncular: [oyuncu(ben, "Sen", 18), oyuncu(KR, "Deniz Yıldırımoğlu", 22)],
    karar: null, son_karar: null, soru: SORU, cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false }, sonuc: null,
    joker: BOS_JOKER, rakip_joker: [], devam_sans: 0, devam_elli: false, devam_birakir: true, bedava_joker: null, devam_odul: null,
    savunma_acik: true, savunma_hak: [], savunma: null,
    sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 2000, gosterim_bas: isoT(1500), benim_bitis: isoT(16500), faz_son: isoT(16500) },
    kopuk: null, kazanan: null, sonuc_neden: null, terk: null, baglanmayan: null, gecmis: null,
  };
  const sonuc = (st, benDogru, rakipDogru, ekD = {}) => ({ ...temel, ...ekD, faz: "sonuc", faz_bitis: isoT(3000), cevap: null,
    sonuc: { tur: 9, altin: false, dogru_cevap: 1, artis: 2, kasa_once: 24, kasa_sonra: 26, tavan_kirpti: false, sahip_once: null, sahip_sonra: null, kazanan: null,
      ...st, benim_cevabim: benDogru ? 1 : 0, ben_dogru: benDogru, rakip_dogru: rakipDogru } });
  switch (ad) {
    case "karar-ben": return { ...temel, faz: "karar", sahip: ben, soru: null, cevap: null, faz_bitis: isoT(6500), karar: { veren: ben, deger: 24 },
      sureler: { ...temel.sureler, gosterim_bas: isoT(1500) } };
    case "karar-hakvar": return { ...kasaDurum("karar-ben", ben, t0), savunma_hak: [ben] };
    case "karar-dolu": return { ...kasaDurum("karar-ben", ben, t0), kasa: 80, karar: { veren: ben, deger: 80 } };
    case "cevap-hak-ben": return { ...temel, savunma_hak: [ben] };
    case "cevap-hak-rakip": return { ...temel, savunma_hak: [KR] };
    // tetik: savunan yanlış, rakip tek doğru (normal tur sonucu; kasa +2)
    case "tetik-ben": { const s = sav(ben, "bekliyor"); return sonuc({ savunma: s }, false, true, { savunma: s, kasa: 26, savunma_hak: [ben] }); }
    case "tetik-rakip": { const s = sav(KR, "bekliyor"); return sonuc({ savunma: s }, true, false, { savunma: s, kasa: 26, savunma_hak: [KR] }); }
    // Savunma Sorusu (tur aynı, farklı kategori)
    case "savunma-ben": return { ...temel, kasa: 26, soru: SORU2, savunma: sav(ben, "soru") };
    case "savunma-izle": return { ...temel, kasa: 26, soru: SORU2, savunma: sav(KR, "soru") };
    case "savundu-ben": { const s = sav(ben, "basarili", { neden: "dogru" }); return sonuc({ savunma: s, artis: 0, kasa_once: 26, kasa_sonra: 26 }, true, false, { savunma: s, kasa: 26, soru: SORU2 }); }
    case "dustu-izle": { const s = sav(KR, "basarisiz", { neden: "sure" }); return sonuc({ savunma: s, artis: 0, kasa_once: 26, kasa_sonra: 26, sahip_sonra: ben }, false, false, { savunma: s, kasa: 26, sahip: ben, soru: SORU2 }); }
    default: return temel;
  }
}
const jokerDurum = (ks) => ({ sinir: 4, kullanilan: 0, ucretsiz_elli_kaldi: false, kisaltildi: false, sis_bitis: null,
  kilitli: ks === "savunma-izle", savunma: ks.startsWith("savunma"), yasak_turler: ks.startsWith("savunma") ? ["zaman_baskisi"] : [],
  sunucu_zamani: new Date().toISOString(), kullanilan_turler: [], kullanim_sayilari: {}, tur_basi_sinir: 3, soru_basi_sinir: 1, soruda_kullanildi: false,
  tur_sinirlari: { elli: 2, sure: 2, zaman_baskisi: 3, ikinci_sans: 1 }, kalan_haklar: { elli: 2, sure: 2, zaman_baskisi: 3, ikinci_sans: 1 },
  bedava: null, soru_turleri: [] });

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const TAKLIT_KULLANICI = TAKLIT && { id: TAKLIT.id, aud: "authenticated", role: "authenticated", email: "", is_anonymous: true,
  app_metadata: { provider: "anonymous" }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
function taklitOturum() {
  const ref = new URL(fs.readFileSync(".env", "utf8").match(/VITE_SUPABASE_URL=(\S+)/)[1]).hostname.split(".")[0];
  const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: TAKLIT.id, role: "authenticated", aud: "authenticated", exp: 4102444800 })}.taklit`;
  const oturum = { access_token: jwt, refresh_token: "taklit", token_type: "bearer", expires_in: 3600, expires_at: 4102444800, user: TAKLIT_KULLANICI };
  return { cookies: [], origins: [{ origin: kok, localStorage: [{ name: `sb-${ref}-auth-token`, value: JSON.stringify(oturum) }] }] };
}
const CEVIRI = await ceviriToplayici();   // 7 Eki 2026: İngilizce koşuda maç içi/maç sonu Türkçe metin taraması
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const DILLER = ARG.dil ? [ARG.dil] : ["tr", "en"];
const BOYUT = ARG.en ? [[Number(ARG.en), Number(ARG.boy) || 640]] : [[360, 640], [390, 664], [390, 844]];
const KOSULAR = [];
for (const dil of DILLER) for (const [w, h] of BOYUT) KOSULAR.push({ dil, w, h, azalt: false });
if (!ARG.dil || ARG.dil === "tr") KOSULAR.push({ dil: "tr", w: 360, h: 640, azalt: true });

for (const { dil, w, h, azalt } of KOSULAR) {
  const etiket = `${dil}-${w}x${h}${azalt ? "-azalt" : ""}`;
  const durumDosya = TAKLIT ? taklitOturum() : JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  durumDosya.origins = (durumDosya.origins || []).map((o) => ({ ...o, origin: kok,
    localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim", "qt_profil_onbellek"].includes(x.name)),
      { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" }] }));
  const b = await tarayici.newContext({ storageState: durumDosya, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block",
    reducedMotion: azalt ? "reduce" : "no-preference" });
  const s = await b.newPage();
  const konsol = [];
  s.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  let ks = "cevap", ksT0 = Date.now();
  const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };
  if (TAKLIT) await s.route(/\/(rest|auth|storage|functions)\/v1\//, (r) => {
    const u = r.request().url();
    const json = (veri) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(veri) });
    if (u.includes("/auth/v1/")) return json(TAKLIT_KULLANICI);
    if (u.includes("/rpc/profilim")) return json({ ...TAKLIT, dil });
    if (u.includes("/rest/v1/oyun_ayarlari")) return json(Object.entries(KASA_AYAR).map(([anahtar, deger]) => ({ anahtar, deger })));
    if (u.includes("/rest/v1/profiles")) return json([{ ...TAKLIT, dil }]);
    return json(u.includes("/rpc/") ? null : []);
  });
  await s.route(/\/rest\/v1\/(oyun_ayarlari|rpc\/|profiles)/, async (r) => {
    const req = r.request(); const u = req.url();
    const json = (veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
    try {
      if (u.includes("/rpc/kasa_durum")) return json(kasaDurum(ks, jwtSub(req), ksT0));
      if (u.includes("/rpc/kasa_joker_durumu")) return json(jokerDurum(ks));
      if (u.includes("/rpc/kasa_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
      if (u.includes("/rpc/kasa_aktif_benim")) return json([]);
      if (/\/rpc\/kasa_(cevap|karar|terk|ara|davet|aramadan|joker\b)/.test(u)) return json({ message: "Ölçüm aracı: yazma kapalı" }, 400);
      if (TAKLIT) return r.fallback();
      const y = await r.fetch();
      let m = await y.text();
      if (u.includes("/rest/v1/profiles") || u.includes("/rpc/profilim")) {
        try { const v = JSON.parse(m); const cevir = (o) => (o && typeof o === "object" && "dil" in o ? { ...o, dil } : o);
          m = JSON.stringify(Array.isArray(v) ? v.map(cevir) : cevir(v)); } catch { /* json değil */ }
      }
      if (u.includes("/rest/v1/oyun_ayarlari")) {
        const liste = JSON.parse(m).filter((x) => !String(x.anahtar).startsWith("kasa_"));
        for (const [anahtar, deger] of Object.entries(KASA_AYAR)) liste.push({ anahtar, deger });
        m = JSON.stringify(liste);
      }
      await r.fulfill({ response: y, body: m });
    } catch { try { await r.continue(); } catch { /* sayfa kapandı */ } }
  });
  const kaydet = async (ad) => { await s.screenshot({ path: path.join(CIKTI, `${ad}-${etiket}.png`) }); if (dil === "en") await CEVIRI.tara(s, `${ad}-${etiket}`); };   // EN koşu: ekranda kalan Türkçe (ceviri-dom.mjs)
  const tasma = async (ad) => { const x = await s.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(`${ad}: yatay taşma yok (${x})`, x <= 0); };
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
  const metin = (q) => s.locator(q).first().innerText().catch(() => "");
  const kasaAc = async (sen, q) => {
    ks = sen; ksT0 = Date.now();
    await s.goto(`${ADRES}/kasa/${KASA_ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.waitForSelector(q, { timeout: 25000 });
    await s.waitForTimeout(700);
  };
  const gec = async (sen) => { ks = sen; ksT0 = Date.now(); await s.evaluate(() => window.dispatchEvent(new Event("online"))); };
  console.log(`\n== ${etiket}`);
  try {
    await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" }); await s.waitForTimeout(2000);
    await s.mouse.click(5, 5);

    // ---- lobi ----
    await s.goto(`${ADRES}/kasa`, { waitUntil: "domcontentloaded" });
    await s.waitForSelector(".ks-ozet", { timeout: 20000 });
    await s.locator(".ks-kurallar-tum > summary").click({ force: true, timeout: 8000 });
    await s.waitForTimeout(300);
    const kurallar = await metin(".ks-kurallar-tum");
    ok("lobi: Savunma Hakkı kuralı var", dil === "en" ? /Defense Right/.test(kurallar) && /Defense Question/.test(kurallar) : /Savunma Hakkı/.test(kurallar) && /Savunma Sorusu/.test(kurallar));
    ok("lobi: 954 ücretsiz 50:50 satırı yok", !/50:50 on every|her soruda ücretsiz 50:50/i.test(kurallar));
    await kaydet("s1-lobi");
    await tasma("lobi");

    // ---- karar (ben): DEVAM düğmesi + hak satırı ----
    await kasaAc("karar-ben", ".ks-karar-eylem");
    const karar = await metin(".ks-karar");
    ok("karar: ÜCRETSİZ 50:50 yok", !/ÜCRETSİZ|FREE 50/.test(karar));
    ok("karar: ayrı hak satırı ve başlık yok (bilgi DEVAM alt yazısında)", (await s.locator(".ks-karar-hak, .ks-karar-baslik").count()) === 0);
    ok("karar: 'Süre dolarsa DEVAM sayılır' yazısı yok", !/Süre dolarsa DEVAM|counts as KEEP/.test(karar), karar);
    const dugmeler = await s.locator(".ks-karar-eylem button").allInnerTexts();
    const tek = (x) => x.replace(/\s+/g, " ").trim();
    ok("karar: AÇ → +24 (Skor alt yazısı yok)", (dil === "en" ? /OPEN → \+24/i : /AÇ → \+24/i).test(tek(dugmeler[0] ?? "")) && !/Skor|Score/.test(dugmeler[0] ?? ""), dugmeler[0]);
    ok("karar: DEVAM → Hazine 48 · Sahipsiz kalır · Savunma Hakkı", dil === "en" ? /KEEP → Treasure 48.*Unclaimed · Defense Right/i.test(tek(dugmeler[1] ?? "")) : /DEVAM → Hazine 48.*Sahipsiz kalır · Savunma Hakkı/i.test(tek(dugmeler[1] ?? "")), dugmeler[1]);
    ok("karar: DEVAM düğmesinde kalkan (hak kazanılacak)", (await s.locator(".ks-karar-eylem button:nth-child(2) .ks-hak").count()) === 1);
    const kararOlc = () => s.evaluate(() => ({
      tasan: [...document.querySelectorAll(".ks-karar-eylem button, .ks-karar-eylem button *, .ks-karar-hak, .ks-karar-not")]
        .filter((e) => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > innerWidth + 0.5 || e.getBoundingClientRect().left < -0.5).length,
      alt: Math.max(...[...document.querySelectorAll(".ks-karar-eylem button, .ks-karar-not")].map((e) => e.getBoundingClientRect().bottom)),
      kirik: [...document.querySelectorAll(".ks-karar-dugme-ic b")].filter((e) => e.getClientRects().length > 1 || e.getBoundingClientRect().height > 40).length,
    }));
    const ko = await kararOlc();
    ok("karar: düğme/satır metni taşmıyor", ko.tasan === 0, JSON.stringify(ko));
    ok("karar: düğme başlığı tek satır", ko.kirik === 0, JSON.stringify(ko));
    ok(`karar: eylemler ekranda (alt ${Math.round(ko.alt)} ≤ ${h})`, ko.alt <= h, JSON.stringify(ko));
    await kaydet("s2-karar");
    await tasma("karar");
    await kasaAc("karar-hakvar", ".ks-karar-eylem");
    ok("karar (hak var): DEVAM'da kalkan yok, alt yazı 'sende'", (await s.locator(".ks-karar-eylem .ks-hak").count()) === 0
      && (dil === "en" ? /You hold/.test(await metin(".ks-karar-eylem button:nth-child(2)")) : /sende/.test(await metin(".ks-karar-eylem button:nth-child(2)"))));
    await kasaAc("karar-dolu", ".ks-karar-eylem");
    const dolu = await s.locator(".ks-karar-eylem button").allInnerTexts();
    ok("karar (80): yalnız AÇ — DEVAM yok", dolu.length === 1 && (dil === "en" ? /OPEN → \+80/.test(tek(dolu[0])) : /AÇ → \+80/.test(tek(dolu[0]))), JSON.stringify(dolu));
    ok("karar (80): 'yalnız AÇ' notu", dil === "en" ? /OPEN only/.test(await metin(".ks-karar-not")) : /yalnız AÇ/.test(await metin(".ks-karar-not")));
    ok("karar (80): süre dolumu = otomatik AÇ notu (988)", dil === "en" ? /opens automatically/.test(await metin(".ks-karar-not")) : /otomatik AÇ/.test(await metin(".ks-karar-not")));
    ok("karar (80): taşma yok", (await kararOlc()).tasan === 0);
    await kaydet("s2b-karar-80");
    await tasma("karar 80");

    // ---- hak simgesi iki oyuncuya ----
    await kasaAc("cevap-hak-ben", ".qt-sik");
    ok("hak simgesi: benim avatarımda", (await s.locator(".ks-ust .qt-oyuncu:not(.qt-oyuncu--rakip) .ks-hak").count()) === 1 && (await s.locator(".ks-ust .qt-oyuncu--rakip .ks-hak").count()) === 0);
    await kaydet("s3-hak-ben");
    await gec("cevap-hak-rakip");
    await s.waitForTimeout(900);
    ok("hak simgesi: rakibin avatarında", (await s.locator(".ks-ust .qt-oyuncu--rakip .ks-hak").count()) === 1 && (await s.locator(".ks-ust .qt-oyuncu:not(.qt-oyuncu--rakip) .ks-hak").count()) === 0);
    await tasma("hak simgesi");

    // ---- tetik anı (ben savunuyorum) ----
    const anOlc = sureOlc(".ks-savunma-an", 3500);
    await gec("tetik-ben");
    await s.waitForSelector(".ks-bant--savunma", { timeout: 5000 });
    await s.waitForTimeout(350);
    await kaydet("s4-tetik-ben");
    const an1 = await anOlc;
    ok(`tetik: kalkan anı ${an1.sure} ms (1200–1900)`, an1.sure >= 1200 && an1.sure <= 1900, JSON.stringify(an1));
    ok("tetik: bant metni", dil === "en" ? /Defense Right activated/i.test(await metin(".ks-bant")) : /Savunma Hakkı devrede/i.test(await metin(".ks-bant")));
    await s.evaluate(() => window.dispatchEvent(new Event("online")));
    const tekrar = await sureOlc(".ks-savunma-an", 1200);
    ok("tetik: yeniden okumada an TEKRAR OYNAMAZ", tekrar.ilk == null, JSON.stringify(tekrar));
    await tasma("tetik");

    // ---- Savunma Sorusu (ben) ----
    await gec("savunma-ben");
    await s.waitForSelector(".ks-savunma-satir", { timeout: 5000 });
    await s.waitForTimeout(1900);
    await kaydet("s5-savunma-ben");
    const sv = await s.evaluate(() => ({
      tik: [...document.querySelectorAll(".qt-sik")].filter((e) => !e.disabled && e.getAttribute("aria-disabled") !== "true").length,
      sayac: document.querySelectorAll(".ks-ust .qt-sayac").length,
      zb: document.querySelector('.ks-joker-yuva [data-tur="zaman_baskisi"], .ks-joker-yuva [aria-label*="Zaman"], .ks-joker-yuva [aria-label*="Time Pressure"]')?.outerHTML.slice(0, 160) ?? null,
      kat: document.querySelector(".ks-savunma-satir")?.innerText ?? "",
      tasan: [...document.querySelectorAll(".ks-savunma-satir, .ks-savunma-satir *")].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5).length,
      yuvaPasif: document.querySelector(".ks-joker-yuva")?.classList.contains("m1-joker-yuva--pasif") ?? null,
    }));
    ok(`savunan: şıklar seçilebilir (${sv.tik})`, sv.tik >= 4);
    ok("savunan: geri sayım görünür", sv.sayac === 1);
    ok("savunan: joker çubuğu açık", sv.yuvaPasif === false);
    ok("savunan: Savunma Sorusu satırı", dil === "en" ? /Defense Question/i.test(sv.kat) : /SAVUNMA SORUSU|Savunma Sorusu/i.test(sv.kat), sv.kat);
    ok("savunan: satır ekrana sığıyor", sv.tasan === 0);
    const zbNeden = await s.evaluate(() => [...document.querySelectorAll(".ks-joker-yuva *")].map((e) => e.getAttribute("aria-label") || e.getAttribute("title") || "").find((x) => /Savunma Sorusunda|Defense Question/.test(x)) ?? null);
    ok("savunan: Zaman Baskısı pasif (Savunma Sorusunda kullanılamaz)", Boolean(zbNeden), String(zbNeden));
    ok("savunan: hak simgesi parlıyor (aktif)", (await s.locator(".ks-ust .qt-oyuncu:not(.qt-oyuncu--rakip) .ks-hak--aktif").count()) === 1);
    await tasma("savunma ben");

    // ---- savundu ----
    const an2 = sureOlc(".ks-savunma-an--basarili", 3500);
    await gec("savundu-ben");
    await s.waitForSelector(".ks-bant", { timeout: 5000 });
    await s.waitForTimeout(300);
    await kaydet("s6-savundu-ben");
    ok(`savundu: an ${(await an2).sure} ms`, (await an2).sure >= 1000);
    ok("savundu: bant", dil === "en" ? /Defended/.test(await metin(".ks-bant")) : /Savundun/.test(await metin(".ks-bant")));

    // ---- izleyen: tetik (rakip) → Savunma Sorusu izle → düştü ----
    await kasaAc("cevap-hak-rakip", ".qt-sik");
    await gec("tetik-rakip");
    await s.waitForSelector(".ks-bant--savunma", { timeout: 5000 });
    await s.waitForTimeout(300);
    await kaydet("s7-tetik-rakip");
    ok("tetik (rakip): bant metni", dil === "en" ? /Opponent is using a Defense Right/.test(await metin(".ks-bant")) : /Rakip Savunma Hakkı kullanıyor/.test(await metin(".ks-bant")));
    await s.locator(".ks-mac").dispatchEvent("pointerdown");
    await s.waitForTimeout(80);
    ok("tetik: dokununca an geçilir", (await s.locator(".ks-savunma-an").count()) === 0);
    await gec("savunma-izle");
    await s.waitForSelector(".ks-izle-bant", { timeout: 5000 });
    await s.waitForTimeout(1900);
    await kaydet("s8-savunma-izle");
    const iz = await s.evaluate(() => ({
      tik: [...document.querySelectorAll(".qt-sik")].filter((e) => e.tagName === "BUTTON" && !e.disabled && e.getAttribute("aria-disabled") !== "true" && !/kilitli/.test(e.className)).length,
      yuvaPasif: document.querySelector(".ks-joker-yuva")?.classList.contains("m1-joker-yuva--pasif") ?? null,
      sayac: document.querySelectorAll(".ks-ust .qt-sayac").length,
      bant: document.querySelector(".ks-izle-bant")?.innerText ?? "",
      buyukSayac: Number(document.querySelector(".ks-izle-sayac")?.childNodes[0]?.textContent ?? NaN),
      kalkan: document.querySelectorAll(".ks-izle-kalkan .qt-ikon, .ks-izle-kalkan svg").length,
      soluk: Math.max(...[...document.querySelectorAll(".qt-sik")].map((e) => Number(getComputedStyle(e).opacity))),
      tasan: [...document.querySelectorAll(".ks-izle-bant, .ks-izle-bant *")].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5 || e.getBoundingClientRect().left < -0.5).length,
      sikAlt: Math.max(...[...document.querySelectorAll(".qt-sik")].map((e) => e.getBoundingClientRect().bottom)),
    }));
    ok("izleyen: kalkan + 'Rakip hazinesini savunuyor'", iz.kalkan >= 1 && (dil === "en" ? /Opponent is defending the treasure/.test(iz.bant) : /Rakip hazinesini savunuyor/.test(iz.bant)), iz.bant);
    ok(`izleyen: büyük sayaç (${iz.buyukSayac})`, iz.buyukSayac >= 1 && iz.buyukSayac <= 15);
    ok(`izleyen: şıklar soluk (opaklık ${iz.soluk})`, iz.soluk <= 0.6);
    ok("izleyen: bant ekrana sığıyor", iz.tasan === 0);
    ok(`izleyen: şıklar ekranda (alt ${Math.round(iz.sikAlt)} ≤ ${h})`, iz.sikAlt <= h);
    ok(`izleyen: şık seçemez (${iz.tik})`, iz.tik === 0, JSON.stringify(iz));
    ok("izleyen: joker çubuğu pasif", iz.yuvaPasif === true);
    ok("izleyen: geri sayım görünür", iz.sayac === 1);
    await s.locator(".qt-sik").first().click({ force: true }).catch(() => {});
    await s.waitForTimeout(300);
    ok("izleyen: dokunuş cevap göndermez (hata yok)", (await s.locator(".ks-hata").count()) === 0);
    await tasma("savunma izle");
    await gec("dustu-izle");
    await s.waitForSelector(".ks-bant--iyi", { timeout: 5000 });
    await s.waitForTimeout(300);
    await kaydet("s9-dustu-izle");
    ok("düştü (izleyen): bant iyi + 'karar sende'", dil === "en" ? /you decide/.test(await metin(".ks-bant")) : /karar sende/.test(await metin(".ks-bant")));
    await tasma("düştü");
  } catch (e) {
    kaldi++; console.log("  ✗ HATA", String(e).slice(0, 300));
    await kaydet("hata").catch(() => {});
  }
  const gercekHata = konsol.filter((x) => !/Ölçüm aracı|400 \(\)|status of 400|Failed to load resource/.test(x)
    && !(TAKLIT && /Görev verisi boş geldi/.test(x)));   // taklit: görev RPC'si boş döner (yalnız ortam)
  ok(`konsol hatası yok (${gercekHata.length})`, gercekHata.length === 0, gercekHata.slice(0, 3).join(" | "));
  await b.close();
}
await tarayici.close();
console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
if (CEVIRI.ozet()) { kaldi++; console.log("  ✗ İngilizce koşuda ekranda Türkçe metin kaldı"); }
process.exit(kaldi ? 1 : 0);
