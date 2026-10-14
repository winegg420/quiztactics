// Hazine ve Grup maçı SES KAYDI (14 Eki 2026) — TAKLİT VERİYLE, sessionStorage.bd_ses_tani=1 → window.__sesKayit.
// Canlıya hiç istek gitmez (sahte JWT; bütün Supabase istekleri tarayıcıda taklit). Gerçek ses dosyaları yerel sunucudan.
//
// Hazine: kasa_durum her ~1 sn yoklanır (Realtime kapalı) → betik zaman çizelgesiyle durumu değiştirir:
//   (karar fazı, ardından gelen sorunun turundadır: karar N → cevap N → sonuç N)
//   tur1 cevap → tur1 sonuç (ben doğru, +2, sandık bana geçer) → tur2 karar (ben) → DEVAM (tur2 cevap, ×2)
//   → tur2 sonuç (ikisi doğru, +6) → tur3 karar (rakip) → rakip AÇ (tur3 cevap) → tur3 sonuç → tur4 karar (ben, AÇ'a basılır)
//   → tur4 cevap (benim AÇ'ım) → maç biter (kazandım) → maç sonu sahnesi.
//   Hiçbir oyuncu joker KULLANMAZ. Beklenen: "joker" 0 · maç içinde "coin" yalnız benim AÇ'ımda 1.
// Grup: 3 kişilik bitmiş maç, sırasıyla 1. · 2. · 3. olarak açılır. Beklenen: kazandin · beraberlik (nötr) · kaybettin.
//
// Kullanım: npx vite --port 5187 --strictPort · node araclar/ses-hazine-grup-taklit.mjs --adres=http://localhost:5187
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5187";
const ETIKET = typeof ARG.etiket === "string" ? ARG.etiket : "sonra";
const CIKTI = path.resolve("tasarim/ses-tani");
fs.mkdirSync(CIKTI, { recursive: true });

const BEN = "0d0e1100-0000-4000-8000-0000000000aa";
const R1 = "0d0e1100-0000-4000-8000-0000000000bb";
const R2 = "0d0e1100-0000-4000-8000-0000000000cc";
const ID = "0d0e1100-0000-4000-8000-0000000000c1";
const REF = "etezccrifaetzrgfvawl";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: BEN, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 36000, is_anonymous: true })}.sahte`;
const KULLANICI = { id: BEN, aud: "authenticated", role: "authenticated", email: "", phone: "", is_anonymous: true,
  app_metadata: { provider: "anonymous", providers: [] }, user_metadata: {}, created_at: "2026-10-01T10:00:00Z" };
const OTURUM = { access_token: JWT, token_type: "bearer", expires_in: 36000, expires_at: Math.floor(Date.now() / 1000) + 36000, refresh_token: "sahte", user: KULLANICI };
const PROFIL = { id: BEN, xp: 1240, dil: "tr", lig: "gumus", coin: 1480, puan: 320, seri: 3, ulke: "TR", elmas: 40, level: 7, askida: false, is_bot: false,
  gorunum: null, acik_bot: false, level_xp: 140, seri_gun: 3, takma_ad: "Deniz", username: "oyuncu_test", lig_gizli: false,
  avatar_url: "/avatars/pro/tilki-k04.svg", gorunen_avatar: "/avatars/pro/tilki-k04.svg", gorunen_ad: "Deniz", created_at: "2026-10-01T10:00:00Z",
  davet_kodu: "QT7K2M", toplam_mac: 42, arac_hesabi: true, hile_yetkisi: false, mesaj_kapali: false, avatar_onayli: true, rahatsiz_etme: false,
  dereceli_tercih: true, takma_ad_secildi: true, vitrin_rozetleri: [], kosullar_kabul_at: "2026-10-01T10:00:00Z", level_gereken: 400,
  hazine_rehber_mac: ID, duello_rehber_mac: ID };
const KASA_AYAR = { kasa_modu_acik: 1, kasa_odul_acik: 1, kasa_odul_carpani: 1, kasa_artis: 2, kasa_ikisi_dogru_artis: 6,
  kasa_hedef_puan: 80, kasa_max_tur: 36, kasa_soru_sn: 15, kasa_karar_sn: 5, kasa_sonuc_sn: 3, kasa_tavan: 60, kasa_devam_carpan: 2, kasa_acma_min: 0,
  kasa_giris_sahne_ms: 0 };
const OZET = { hazir: true, kazanan: BEN, terk: { ben: false, rakip: false },
  dokum: { hazir: true, toplam: { coin: 30, lig: 25 }, kalemler: [{ kalem: "galibiyet", coin: 30, lig: 25, detay: {} }], rozetler: [], gorevler: [] },
  lig: { puan: 25 }, level: null, gorevler: [], rozetler: [] };

const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const kok = new URL(ADRES).origin;
const baglamAc = async () => {
  const b = await tarayici.newContext({ storageState: { cookies: [], origins: [{ origin: kok, localStorage: [
    { name: `sb-${REF}-auth-token`, value: JSON.stringify(OTURUM) }, { name: "bildim_dil", value: "tr" }, { name: "bildim_tanitim", value: "1" }] }] },
    viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
  await b.addInitScript(() => { try { sessionStorage.setItem("bd_ses_tani", "1"); } catch { /* */ } });
  return b;
};
const ortakTaklit = (r, ek) => {
  const req = r.request(); const u = req.url();
  const json = (veri) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(veri) });
  const nesne = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
  if (u.includes("/auth/v1/user")) return json(KULLANICI);
  if (u.includes("/auth/v1/token")) return json(OTURUM);
  if (u.includes("/auth/v1/")) return json({});
  if (u.includes("/rpc/profilim")) return json(PROFIL);
  if (u.includes("/rpc/mac_sonu_ozet")) return json(OZET);
  const v = ek?.(u, req);
  if (v !== undefined) return json(v);
  if (u.includes("/rest/v1/oyun_ayarlari")) return json(Object.entries(KASA_AYAR).map(([anahtar, deger]) => ({ anahtar, deger })));
  if (u.includes("/rest/v1/rpc/")) return json(null);
  if (u.includes("/rest/v1/")) return json(nesne ? null : []);
  return json({});
};
const sayac = (kayit) => kayit.reduce((m, k) => ((m[k.rol] = (m[k.rol] ?? 0) + 1), m), {});
const sonuc = { etiket: ETIKET };
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };

try {
  // ======================= HAZİNE =======================
  {
    const b = await baglamAc();
    const s = await b.newPage();
    const hatalar = [];
    s.on("pageerror", (e) => hatalar.push(String(e).slice(0, 200)));
    let durum = null;
    const t0 = Date.now();
    const iso = (ms) => new Date(Date.now() + ms).toISOString();
    const soru = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], kategori: "cografya" };
    const oyuncu = (id, ad, puan, acma) => ({ id, gorunen_ad: ad, gorunen_avatar: null, gorunum: null, unvan: null, puan, acma });
    const temel = (ek) => ({ id: ID, durum: "aktif", dereceli: true, faz: "cevap", faz_bitis: iso(12000), sunucu_zamani: iso(0), ben: BEN, max_tur: 36, hedef: 80,
      altin: false, artis: 2, ikisi_artis: 6, tavan: 60, karar: null, son_karar: null, soru, cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false },
      sonuc: null, rakip_joker: [], devam_odul: null, savunma: null,
      sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 1500, gosterim_bas: iso(-500) },
      kopuk: null, kazanan: null, sonuc_neden: null, terk: null, baglanmayan: null, gecmis: null, ...ek });
    const P = (ben, rakip, bAc = 0, rAc = 0) => ({ oyuncular: [oyuncu(BEN, "Sen", ben, bAc), oyuncu(R1, "Ayşe", rakip, rAc)] });
    const adimlar = [
      ["tur1 cevap", 2500, () => temel({ tur: 1, kasa: 0, sahip: null, ...P(0, 0) })],
      ["tur1 sonuç", 3200, () => temel({ tur: 1, faz: "sonuc", faz_bitis: iso(3000), kasa: 2, sahip: BEN, ...P(0, 0),
        sonuc: { tur: 1, altin: false, dogru_cevap: 1, artis: 2, kasa_once: 0, kasa_sonra: 2, sahip_once: null, sahip_sonra: BEN, benim_cevabim: 1, ben_dogru: true, rakip_dogru: false } })],
      ["tur2 karar (ben)", 1800, () => temel({ tur: 2, faz: "karar", faz_bitis: iso(5000), kasa: 2, sahip: BEN, karar: { veren: BEN, deger: 2 }, ...P(0, 0) })],
      ["tur2 cevap (DEVAM ×2)", 3000, () => temel({ tur: 2, kasa: 4, sahip: BEN, ...P(0, 0), son_karar: { veren: BEN, ac: false, deger: 2, yeni: 4, carpan: 2 },
        sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 1500, gosterim_bas: iso(2500) } })],
      ["tur2 sonuç (ikisi doğru +6)", 3200, () => temel({ tur: 2, faz: "sonuc", faz_bitis: iso(3000), kasa: 10, sahip: R1, ...P(0, 0),
        sonuc: { tur: 2, altin: false, dogru_cevap: 1, artis: 6, kasa_once: 4, kasa_sonra: 10, sahip_once: BEN, sahip_sonra: R1, benim_cevabim: 1, ben_dogru: true, rakip_dogru: true } })],
      ["tur3 karar (rakip)", 1800, () => temel({ tur: 3, faz: "karar", faz_bitis: iso(5000), kasa: 10, sahip: R1, karar: { veren: R1, deger: 10 }, ...P(0, 0) })],
      ["tur3 cevap (rakip AÇ)", 4000, () => temel({ tur: 3, kasa: 0, sahip: null, ...P(0, 10, 0, 1), son_karar: { veren: R1, ac: true, deger: 10 },
        sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 1500, gosterim_bas: iso(3500) } })],
      ["tur3 sonuç", 3200, () => temel({ tur: 3, faz: "sonuc", faz_bitis: iso(3000), kasa: 2, sahip: BEN, ...P(0, 10, 0, 1),
        sonuc: { tur: 3, altin: false, dogru_cevap: 1, artis: 2, kasa_once: 0, kasa_sonra: 2, sahip_once: null, sahip_sonra: BEN, benim_cevabim: 1, ben_dogru: true, rakip_dogru: false } })],
      ["tur4 karar (ben → AÇ)", 2500, () => temel({ tur: 4, faz: "karar", faz_bitis: iso(5000), kasa: 2, sahip: BEN, karar: { veren: BEN, deger: 2 }, ...P(0, 10, 0, 1) }), "ac"],
      ["tur4 cevap (benim AÇ)", 4000, () => temel({ tur: 4, kasa: 0, sahip: null, ...P(2, 10, 1, 1), son_karar: { veren: BEN, ac: true, deger: 2 },
        sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 1500, gosterim_bas: iso(3500) } })],
      ["bitti (kazandım)", 9000, () => temel({ durum: "bitti", faz: "sonuc", tur: 4, kasa: 0, sahip: null, kazanan: BEN, sonuc_neden: "hedef", ...P(82, 10, 2, 1),
        terk: { ben: false, rakip: false }, rovans: { isteyen: null, id: null, gecerli: false },
        gecmis: [1, 2, 3].map((t) => ({ tur: t, altin: false, kategori: "cografya", soru: soru.soru, secenekler: soru.secenekler, dogru_cevap: 1, benim_cevabim: 1,
          ben_dogru: true, rakip_dogru: t === 2, karar: t === 2 ? "ac" : "devam", karar_ben: t !== 2, acilan_deger: 10, kasa_sonra: t * 2 })) })],
    ];
    durum = adimlar[0][2]();
    await s.route(/supabase\.co\//, (r) => ortakTaklit(r, (u) => {
      if (u.includes("/rpc/kasa_durum")) return durum;
      if (u.includes("/rpc/kasa_giris")) return { durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null };
      if (u.includes("/rpc/kasa_karar") || u.includes("/rpc/kasa_cevap") || u.includes("/rpc/kalp_at")) return null;
      if (u.includes("/rpc/kasa_joker_durumu")) return [{ sinir: null, kullanilan: 0, ucretsiz_elli_kaldi: false, kilitli: false, soruda_kullanildi: false, kullanim_sayilari: {}, tur_basi_sinir: 1 }];
      if (u.includes("/rpc/envanterim")) return [];
      return undefined;
    }));
    await s.route(/\/realtime\//, (r) => r.abort());
    await s.goto(`${ADRES}/kasa/${ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.waitForSelector(".ks-mac", { timeout: 30000 });
    await s.waitForTimeout(1500);
    const zamanlar = [];
    for (const [ad, sure, f, eylem] of adimlar) {
      durum = f();
      zamanlar.push({ ad, t: await s.evaluate(() => Math.round(performance.now())) });
      if (eylem === "ac") {
        await s.waitForTimeout(1400);
        const dugme = s.locator(".ks-karar-dugme").filter({ hasText: /AÇ/ }).first();
        const tiklandi = await dugme.click({ timeout: 3000 }).then(() => true).catch(() => false);
        zamanlar[zamanlar.length - 1].tiklandi = tiklandi;
        await s.waitForTimeout(Math.max(0, sure - 1400));
      } else await s.waitForTimeout(sure);
    }
    const kayit = await s.evaluate(() => window.__sesKayit ?? []);
    const bitisT = zamanlar.find((z) => z.ad.startsWith("bitti")).t;
    const mac = kayit.filter((k) => k.t < bitisT), macSonu = kayit.filter((k) => k.t >= bitisT);
    sonuc.hazine = { zamanlar, macIci: sayac(mac), macSonu: sayac(macSonu), kayit, hatalar };
    console.log(`\nHAZİNE (${ETIKET}) maç içi:`, JSON.stringify(sayac(mac)), "\n  maç sonu:", JSON.stringify(sayac(macSonu)),
      "\n  AÇ düğmesine basıldı:", zamanlar.find((z) => z.ad.startsWith("tur4 karar"))?.tiklandi);
    ok("Hazine: joker kullanılmadı → joker sesi 0", !kayit.some((k) => k.rol === "joker"), JSON.stringify(sayac(kayit)));
    ok("Hazine: maç içinde coin yalnız benim AÇ'ımda (1)", (sayac(mac).coin ?? 0) === 1, JSON.stringify(sayac(mac)));
    ok("Hazine: sayfa hatası yok", hatalar.length === 0, hatalar.join(" | "));
    await s.screenshot({ path: path.join(CIKTI, `hazine-son-${ETIKET}.png`) });
    await b.close();
  }

  // ======================= GRUP =======================
  for (const [sira, skorlar, beklenen] of [[1, [90, 60, 30], "kazandin"], [2, [60, 90, 30], "beraberlik"], [3, [30, 90, 60], "kaybettin"]]) {
    const b = await baglamAc();
    const s = await b.newPage();
    const hatalar = [];
    s.on("pageerror", (e) => hatalar.push(String(e).slice(0, 200)));
    const k = (id, ad, skor) => ({ group_match_id: ID, user_id: id, davet_durumu: "kabul", skor, joined_at: "2026-10-14T10:00:00Z", hazir: true, terk_at: null,
      profil: { id, gorunen_ad: ad, gorunen_avatar: null, gorunum: null } });
    const kazanan = [BEN, R1, R2][skorlar.indexOf(Math.max(...skorlar))];
    const satir = { id: ID, durum: "bitti", basladi: true, aktif_soru: 10, soru_ids: [], kategori: null, kazanan, olusturan: R1, duraklatildi_at: null,
      soru_baslangic: "2026-10-14T10:05:00Z", created_at: "2026-10-14T10:00:00Z",
      katilimcilar: [k(BEN, "Sen", skorlar[0]), k(R1, "Ayşe", skorlar[1]), k(R2, "Mert", skorlar[2])] };
    await s.route(/supabase\.co\//, (r) => ortakTaklit(r, (u, req) => {
      if (u.includes("/rest/v1/group_matches")) return /vnd\.pgrst\.object/.test(req.headers()["accept"] || "") ? satir : [satir];
      if (u.includes("/rpc/grup_mac_nabiz")) return { durum: "bitti", basladi: true, duraklatildi: false, bekleyenler: [] };
      return undefined;
    }));
    await s.route(/\/realtime\//, (r) => r.abort());
    await s.goto(`${ADRES}/grup-mac/${ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.waitForSelector(".msk-baslik", { timeout: 30000 }).catch(() => {});
    await s.waitForTimeout(4500);
    const kayit = await s.evaluate(() => window.__sesKayit ?? []);
    const sonucSesi = kayit.filter((x) => ["kazandin", "kaybettin", "beraberlik"].includes(x.rol)).map((x) => x.rol);
    sonuc[`grup-${sira}`] = { sonucSesi, tum: sayac(kayit), hatalar };
    ok(`Grup ${sira}. → "${beklenen}" sesi`, sonucSesi.length === 1 && sonucSesi[0] === beklenen, JSON.stringify(sonucSesi));
    await s.screenshot({ path: path.join(CIKTI, `grup-${sira}-${ETIKET}.png`) });
    await b.close();
  }
} catch (e) {
  kaldi++; console.error("HATA:", e.message);
} finally {
  await tarayici.close();
  fs.writeFileSync(path.join(CIKTI, `olcum-${ETIKET}.json`), JSON.stringify(sonuc, null, 1));
  console.log(`\n${gecti} geçti, ${kaldi} kaldı · çıktı: ${path.relative(process.cwd(), CIKTI)}`);
  process.exitCode = kaldi ? 1 : 0;
}
