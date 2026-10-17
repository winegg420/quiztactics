// Maç içi tepki seçicisi ekran ölçümü — TAKLİT VERİYLE, SESSİZ, canlıya HİÇ İSTEK GİTMEZ (sahte JWT; bütün Supabase
// istekleri tarayıcıda taklit, Realtime kapalı, ses dosyaları iptal). Başsız Chrome → bilgisayardan ses çıkmaz.
// Sayfalar: Düello (v4) · Klasik · Hazine · Grup. Boyutlar 360×640 ve 390×844, TR + EN; seçici 12 ve 4 tepkiyle.
// Ölçer: her emoji ekranda mı (kesik yok) · seçici oyuncu şeridini kapatıyor mu · 3 sn / 10 sınırı · balon avatarda.
// Çıktı: tasarim/tepki-duzelt/<etiket>/*.png + olcum.json
// Kullanım: npx vite --port 5197 --strictPort (başka kabukta) · node araclar/tepki-duzelt-ekran.mjs --adres=http://localhost:5197 --etiket=once [--sayfa=duello]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5197";
const ETIKET = typeof ARG.etiket === "string" ? ARG.etiket : "sonra";
const SAYFALAR = typeof ARG.sayfa === "string" ? ARG.sayfa.split(",") : ["duello", "klasik", "kasa", "grup"];
const CIKTI = path.resolve("tasarim/tepki-duzelt", ETIKET);
fs.mkdirSync(CIKTI, { recursive: true });

const BEN = "0d0e1100-0000-4000-8000-0000000000aa";
const R1 = "0d0e1100-0000-4000-8000-0000000000bb";
const R2 = "0d0e1100-0000-4000-8000-0000000000cc";
const ID = "0d0e1100-0000-4000-8000-0000000000d1";
const REF = "etezccrifaetzrgfvawl";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: BEN, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 36000, is_anonymous: true })}.sahte`;
const KULLANICI = { id: BEN, aud: "authenticated", role: "authenticated", email: "", phone: "", is_anonymous: true,
  app_metadata: { provider: "anonymous", providers: [] }, user_metadata: {}, created_at: "2026-10-01T10:00:00Z" };
const OTURUM = { access_token: JWT, token_type: "bearer", expires_in: 36000, expires_at: Math.floor(Date.now() / 1000) + 36000, refresh_token: "sahte", user: KULLANICI };
const profil = (dil) => ({ id: BEN, xp: 1240, dil, lig: "gumus", coin: 1480, puan: 320, seri: 3, ulke: "TR", elmas: 40, level: 7, askida: false, is_bot: false,
  gorunum: null, acik_bot: false, level_xp: 140, seri_gun: 3, takma_ad: "Deniz", username: "oyuncu_test", lig_gizli: false,
  avatar_url: "/avatars/pro/tilki-k04.svg", gorunen_avatar: "/avatars/pro/tilki-k04.svg", gorunen_ad: "Deniz", created_at: "2026-10-01T10:00:00Z",
  davet_kodu: "QT7K2M", toplam_mac: 42, arac_hesabi: true, hile_yetkisi: false, mesaj_kapali: false, avatar_onayli: true, rahatsiz_etme: false,
  dereceli_tercih: true, takma_ad_secildi: true, vitrin_rozetleri: [], kosullar_kabul_at: "2026-10-01T10:00:00Z", level_gereken: 400,
  hazine_rehber_mac: ID, duello_rehber_mac: ID });
const KASA_AYAR = { kasa_modu_acik: 1, kasa_odul_acik: 1, kasa_odul_carpani: 1, kasa_artis: 2, kasa_ikisi_dogru_artis: 6,
  kasa_hedef_puan: 80, kasa_max_tur: 36, kasa_soru_sn: 15, kasa_karar_sn: 5, kasa_sonuc_sn: 3, kasa_tavan: 60, kasa_devam_carpan: 2, kasa_acma_min: 0,
  kasa_giris_sahne_ms: 0 };
const TUM12 = ["alkis", "havali", "terli", "dusunen", "gulen", "ates", "hedef", "tac", "kas", "korku", "selam", "rica"];
const BEDAVA4 = TUM12.slice(0, 4);
const iso = (ms) => new Date(Date.now() + ms).toISOString();
const SORU = { soru: "Hangi gezegen Güneş Sistemi'nin en büyüğüdür?", secenekler: ["Satürn", "Jüpiter", "Neptün", "Uranüs"], kategori: "bilim" };

// ---------- sayfa taklitleri ----------
function duelloDurum() {
  const oyuncu = (id, ad, dogru) => ({ id, gorunen_ad: ad, gorunen_avatar: id === R1 ? "/avatars/pro2/samuray-y15.svg" : "/avatars/pro/tilki-k04.svg", gorunum: null, dogru, unvan: null });
  return {
    surum: 4, id: ID, durum: "aktif", dereceli: true, faz: "notr", faz_bitis: iso(14000), sunucu_zamani: iso(0), ben: BEN, rakip: R1,
    oyuncular: [oyuncu(BEN, "Sen", 3), oyuncu(R1, "Deniz Yıldırımoğlu", 2)],
    v4: { kontrol: null, seri: 0, seri_hedef: 3, tur: 0, max_tur: 20, notr_seri: 0, notr_max: 5, son: false, soru_no: 1, max_soru: 20, rehber: false,
      kullanilan: [], ilk_mac: false, kart: null, benim_kategori: "bilim", rakip_kategori: "bilim", oto: false },
    soru: SORU,
    cevap: { benim_bitis: iso(14000), rakip_bitis: iso(14000), ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false, elli_kapali: null, ikinci_sans_ilk_cevap: null },
    son_hamle: null,
    skill: { kapali: false, set: ["elli", "sure", "zaman_baskisi"], izinli: ["elli", "sure", "soru_degistir", "zaman_baskisi", "ikinci_sans"], toplam_hak: 4, tur_basi_hak: 2,
      soru_basi_hak: 1, kullanilan: 0, sayilar: {}, bu_soruda: 0, rakip_bu_soruda: false, soru_degistir_kilit: null, envanter: { elli: 3, sure: 2, zaman_baskisi: 1 }, fiyatlar: {}, coin: 120 },
    sureler: { kart: 7, cevap: 15, sonuc: 3, ek_sure: 5, zaman_baskisi_eksi: 5, nabiz: 10, kopuk: 25, gosterim_payi_ms: 2000, gosterim_bas: iso(-500) },
    kazanan: null, terk_eden: null, odul: null, ezeli: null, gecmis: null, rovans: { isteyen: null, id: null, gecerli: false },
  };
}
function kasaDurum() {
  const oyuncu = (id, ad, puan) => ({ id, gorunen_ad: ad, gorunen_avatar: null, gorunum: null, unvan: null, puan, acma: 0 });
  return { id: ID, durum: "aktif", dereceli: true, faz: "cevap", faz_bitis: iso(12000), sunucu_zamani: iso(0), ben: BEN, max_tur: 36, hedef: 80,
    altin: false, artis: 2, ikisi_artis: 6, tavan: 60, karar: null, son_karar: null, soru: { ...SORU, kategori: "cografya" },
    cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false }, sonuc: null, rakip_joker: [], devam_odul: null, savunma: null,
    sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 1500, gosterim_bas: iso(-500) },
    kopuk: null, kazanan: null, sonuc_neden: null, terk: null, baglanmayan: null, gecmis: null, tur: 1, kasa: 0, sahip: null,
    oyuncular: [oyuncu(BEN, "Sen", 0), oyuncu(R1, "Ayşe", 0)] };
}

const nabiz = () => ({ durum: "aktif", basladi: true, baslangic: iso(-5000), sunucu_zamani: iso(0), duraklatildi: false, duraklama_sn: 0,
  ben_hazir: true, rakip_hazir: true, lobi_saniye: 0, hazir_sayisi: 3, toplam_oyuncu: 3, bekleyenler: [] });
const soruSatiri = () => ({ question_id: "0d0e1100-0000-4000-8000-0000000000e1", soru: SORU.soru, secenekler: SORU.secenekler, soru_index: 0, baslangic: iso(-300), sunucu_zamani: iso(0) });
const prof = (id, ad) => ({ id, gorunen_ad: ad, gorunen_avatar: null, gorunum: null, acik_bot: false });
const ortakMacRpc = (u) => {
  if (u.includes("/rpc/mac_nabiz") || u.includes("/rpc/grup_mac_nabiz")) return nabiz();
  if (u.includes("/rpc/get_match_question") || u.includes("/rpc/get_group_match_question")) return [soruSatiri()];
  if (u.includes("/rpc/soru_kategorisi")) return "cografya";
  if (u.includes("/rpc/cift_mac_durumu")) return [{ carpan: 1, sira: 1 }];
  if (u.includes("/rpc/envanterim")) return [{ tur: "elli", adet: 2 }];
  if (u.includes("/rpc/joker_mac_durumu")) return [{ sinir: null, kullanilan: 0, ucretsiz_elli_kaldi: true, kisaltildi: false, kilitli: false, soruda_kullanildi: false,
    kullanim_sayilari: {}, tur_basi_sinir: 1, sunucu_zamani: iso(0), sis_bitis: null }];
  if (u.includes("/rpc/joker_fiyatlari")) return { elli: 10, sure: 20, soru_degistir: 30, zaman_baskisi: 25, sigorta: 15, cifte_puan: 15, ikinci_sans: 20 };
  if (u.includes("/rpc/coin_bakiyem")) return [{ bakiye: 120 }];
  return undefined;
};
const klasikSatir = () => ({ id: ID, durum: "aktif", senkron: true, basladi: true, aktif_soru: 0, soru_ids: ["0d0e1100-0000-4000-8000-0000000000e1"], oyuncu1: BEN, oyuncu2: R1,
  oyuncu1_skor: 0, oyuncu2_skor: 0, oyuncu1_soru: 0, oyuncu2_soru: 0, jokersiz: false, dereceli: false, kategori: "cografya", kabul_at: iso(-60000),
  created_at: iso(-90000), joker_surum: 0, kazanan: null, terk_eden: null, baglanmayan: null, duraklatildi_at: null, p1: prof(BEN, "Sen"), p2: prof(R1, "Deniz") });
const grupSatir = () => {
  const k = (id, ad) => ({ group_match_id: ID, user_id: id, davet_durumu: "kabul", skor: 0, joined_at: iso(-90000), hazir: true, terk_at: null, profil: prof(id, ad) });
  return { id: ID, durum: "aktif", basladi: true, aktif_soru: 0, soru_ids: ["0d0e1100-0000-4000-8000-0000000000e1"], kategori: "cografya", duraklatildi_at: null,
    soru_baslangic: iso(-300), katilimcilar: [k(BEN, "Sen"), k(R1, "Deniz"), k(R2, "Ayşe")] };
};
const liste = (satir, nesne) => (nesne ? satir : [satir]);

const SAYFA = {
  klasik: { yol: `/mac/${ID}`, bekle: ".m1-soru .qt-sik", dugme: ".m1-alt .qt-tepki .qt-tepki-dugme", macTur: "klasik", kanal: `tepki-mac-${ID}`,
    sert: (u, _r, nesne) => (u.includes("/rest/v1/matches") ? liste(klasikSatir(), nesne) : u.includes("/rest/v1/match_") ? [] : ortakMacRpc(u)),
    serit: ".qt-mac-ust, .m1-ust" },
  grup: { yol: `/grup-mac/${ID}`, bekle: ".m1-soru .qt-sik", dugme: ".m1-alt .qt-tepki .qt-tepki-dugme", macTur: "grup", kanal: null,
    sert: (u, _r, nesne) => (u.includes("/rest/v1/group_matches") ? liste(grupSatir(), nesne) : u.includes("/rest/v1/group_match_") ? [] : ortakMacRpc(u)),
    serit: ".qt-mac-ust, .m1-ust" },
  // eski Grup arayüzü (6 emoji şeridi) — yalnız "önce" görüntüsü için (--sayfa=grupEski, eski kodla koşulur)
  grupEski: { eski: true, yol: `/grup-mac/${ID}`, dugme: ".m1-alt .m1-tepki", macTur: "grup", kanal: null,
    sert: (u, _r, nesne) => (u.includes("/rest/v1/group_matches") ? liste(grupSatir(), nesne) : u.includes("/rest/v1/group_match_") ? [] : ortakMacRpc(u)), serit: "" },
  duello: { yol: `/duello/${ID}`, bekle: ".d4-arena", dugme: ".d4-tepki .qt-tepki-dugme", macTur: "duello", kanal: `tepki-duello-${ID}`,
    sert: (u) => (u.includes("/rpc/duello_durum") ? duelloDurum() : u.includes("/rpc/duello_giris") ? { durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null } : u.includes("/rpc/duello_baglanti") ? { kopuk: false } : undefined),
    serit: ".d4-oyuncular, .d4-oy" },
  kasa: { yol: `/kasa/${ID}`, bekle: ".ks-tepki, .m1-mac", dugme: ".ks-tepki .qt-tepki-dugme", macTur: "kasa", kanal: `tepki-kasa-${ID}`,
    sert: (u) => (u.includes("/rpc/kasa_durum") ? kasaDurum() : u.includes("/rpc/kasa_giris") ? { durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null } : undefined),
    serit: ".ks-ust, .qt-mac-ust" },
};

/** Realtime soketini yerelde taklit eder: join'lere "ok" döner, rakip yayınını içeri iter. Canlı sunucuya BAĞLANILMAZ. */
async function soketTaklidi(sayfa) {
  const konular = new Map();
  const gonderilen = [];
  await sayfa.routeWebSocket(/realtime\/v1\/websocket/, (ws) => {
    ws.onMessage((ham) => {
      // v2 serileştirici: istemcinin kullanıcı yayını ikili çerçevede gider; JSON gövdesinden k/u okunur
      if (typeof ham !== "string") {
        const t = Buffer.from(ham).toString("latin1");
        const k = /"k":"([a-z_]+)"/.exec(t)?.[1];
        if (k && /tepki/.test(t)) gonderilen.push({ k, u: /"u":"([^"]+)"/.exec(t)?.[1] });
        return;
      }
      let m; try { m = JSON.parse(ham); } catch { return; }
      if (!Array.isArray(m)) return;
      const [jr, ref, topic, olay, yuk] = m;
      if (olay === "phx_join") {
        konular.set(topic, ws);
        const pc = (yuk?.config?.postgres_changes ?? []).map((c, i) => ({ ...c, id: i + 1 }));
        ws.send(JSON.stringify([jr, ref, topic, "phx_reply", { status: "ok", response: { postgres_changes: pc } }]));
      } else if (olay === "heartbeat") ws.send(JSON.stringify([null, ref, "phoenix", "phx_reply", { status: "ok", response: {} }]));
      else if (olay === "phx_leave") ws.send(JSON.stringify([jr, ref, topic, "phx_reply", { status: "ok", response: {} }]));
      else if (olay === "broadcast" && yuk?.event === "tepki") gonderilen.push(yuk.payload);
    });
  });
  return {
    konular, gonderilen,
    bas: (topic, payload) => { const ws = konular.get(topic); if (!ws) return false; ws.send(JSON.stringify([null, null, topic, "broadcast", { type: "broadcast", event: "tepki", payload }])); return true; },
  };
}
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio"] });
const kok = new URL(ADRES).origin;
const sonuc = {};
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };

const OLC = ({ dugme, serit }) => {
  const d = document.querySelector(dugme);
  const panel = document.querySelector(".qt-tepki-panel");
  const W = window.innerWidth, H = window.innerHeight;
  const r = (e) => { const b = e.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom) }; };
  const secimler = panel ? [...panel.querySelectorAll(".qt-tepki-sec")].map((e) => r(e)) : [];
  const kesik = secimler.filter((x) => x.l < 0 || x.r > W || x.t < 0 || x.b > H).length;
  const serits = serit ? [...document.querySelectorAll(serit)].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 4 && b.height > 4; }) : [];
  const pr = panel ? panel.getBoundingClientRect() : null;
  const ortusen = pr ? serits.filter((e) => { const b = e.getBoundingClientRect(); return Math.min(b.bottom, pr.bottom) - Math.max(b.top, pr.top) > 1 && Math.min(b.right, pr.right) - Math.max(b.left, pr.left) > 1; })
    .map((e) => (e.className && String(e.className).split(" ")[0]) || e.tagName) : [];
  return { dugme: d ? r(d) : null, panel: panel ? r(panel) : null, secim: secimler.length, kesik, ortusen, W, H, yatayTasma: document.documentElement.scrollWidth - W };
};

async function etkilesim({ s, S, ad, w, h, dil, etiket, soket, hatalar }) {
  const kanalTopic = `realtime:${S.kanal ?? `grup-mac-${ID}`}`;
  const balonSay = () => s.locator(".qt-tepki-balon").count();
  const balonKimlik = async (yan) => s.locator(`.qt-tepki-balon--${yan} img`).first().getAttribute("src", { timeout: 500 }).catch(() => null);
  const sec = async (i) => { await s.locator(S.dugme).click(); await s.waitForSelector(".qt-tepki-panel", { timeout: 3000 }); await s.locator(".qt-tepki-sec").nth(i).click(); };
  const topicHazir = async () => { for (let i = 0; i < 40 && !soket.konular.has(kanalTopic); i++) await bekle(100); return soket.konular.has(kanalTopic); };
  // panel şu an açık (acik ölçümünden); kapat
  await s.locator(S.dugme).click();
  ok("tepki kanalı bağlandı (taklit soket)", await topicHazir(), [...soket.konular.keys()].join(","));
  // 1) gönder: panel kapanır, balon KENDİ avatarında, yayın gitti
  await s.waitForTimeout(3300);   // maç açılışı: ilk gönderim sınırını etkilemesin
  await sec(0);
  await s.waitForTimeout(350);
  ok("gönderince panel kapandı", (await s.locator(".qt-tepki-panel").count()) === 0);
  ok("balon çıktı (kendi avatarında)", (await balonSay()) >= 1 && String(await balonKimlik("sen")).includes("alkis"), String(await balonKimlik("sen")));
  const balonKutu = await s.locator(".qt-tepki-balon--sen").first().boundingBox();
  ok("balon ekranda (kesik değil)", !!balonKutu && balonKutu.x >= -1 && balonKutu.y >= -1 && balonKutu.x + balonKutu.width <= w + 1 && balonKutu.y + balonKutu.height <= h + 1, JSON.stringify(balonKutu));
  await s.screenshot({ path: path.join(CIKTI, `${etiket}-balon-ben.png`) });
  ok("yayın gönderildi (1)", soket.gonderilen.length === 1, String(soket.gonderilen.length));
  // 2) 3 sn sınırı: hemen ikinci → seçenekler kilitli
  await s.locator(S.dugme).click();
  await s.waitForSelector(".qt-tepki-panel", { timeout: 3000 });
  const kilitli = await s.locator(".qt-tepki-sec:disabled").count();
  ok("3 sn dolmadan seçenekler kilitli", kilitli === 4, String(kilitli));
  await s.locator(".qt-tepki-sec").first().click({ force: true, timeout: 800 }).catch(() => {});
  await s.waitForTimeout(150);
  ok("kilitliyken ikinci yayın gitmedi", soket.gonderilen.length === 1, String(soket.gonderilen.length));
  await s.screenshot({ path: path.join(CIKTI, `${etiket}-kilit.png`) });
  await s.waitForTimeout(3100);
  ok("3 sn sonra seçenekler açıldı", (await s.locator(".qt-tepki-sec:disabled").count()) === 0);
  await s.locator(".qt-tepki-sec").nth(1).click();
  await s.waitForTimeout(200);
  ok("ikinci tepki gitti (havali)", soket.gonderilen.length === 2 && soket.gonderilen[1].k === "havali", JSON.stringify(soket.gonderilen[1]));
  // 3) rakip tepkisi alınır: balon rakibin avatarında; sınır / sahte kimlik / bilinmeyen tepki yok sayılır
  await s.waitForTimeout(2300);   // kendi balonu sönsün
  const rakipYay = (k, u = R1) => soket.bas(kanalTopic, { id: "x" + Math.random(), k, u });
  rakipYay("ates");
  await s.waitForTimeout(400);
  ok("rakip tepkisi balonda (avatarında)", String(await balonKimlik("rakip")).includes("ates"), String(await balonKimlik("rakip")));
  const rakipKutu = await s.locator(".qt-tepki-balon--rakip").first().boundingBox();
  ok("rakip balonu ekranda", !!rakipKutu && rakipKutu.x >= -1 && rakipKutu.x + rakipKutu.width <= w + 1 && rakipKutu.y >= -1, JSON.stringify(rakipKutu));
  await s.screenshot({ path: path.join(CIKTI, `${etiket}-balon-rakip.png`) });
  rakipYay("kas");
  await s.waitForTimeout(300);
  ok("rakipten 3 sn içinde ikinci tepki yok sayıldı", String(await balonKimlik("rakip")).includes("ates"), String(await balonKimlik("rakip")));
  await s.waitForTimeout(3000);
  rakipYay("alkis", BEN);
  rakipYay("yok_boyle_tepki");
  await s.waitForTimeout(300);
  const sonRakip = String(await balonKimlik("rakip"));
  ok("sahte kimlik / bilinmeyen tepki çizilmedi", sonRakip === "null" || sonRakip.includes("ates"), sonRakip);
  // 4) "Rakip tepkilerini gizle": rakip balonu çizilmez
  await s.waitForTimeout(2200);
  await s.evaluate(() => { localStorage.setItem("bildim_tepki_gizle", "1"); window.dispatchEvent(new Event("bildim-tepki-gizle")); });
  await s.waitForTimeout(1500);
  rakipYay("havali");
  await s.waitForTimeout(500);
  ok("gizle açıkken rakip balonu çıkmadı", (await s.locator(".qt-tepki-balon--rakip").count()) === 0, String(await s.locator(".qt-tepki-balon--rakip").count()));
  await s.evaluate(() => { localStorage.setItem("bildim_tepki_gizle", "0"); window.dispatchEvent(new Event("bildim-tepki-gizle")); });
  // 5) maçta en çok 10 (yalnız --uzun ve 360×640 EN koşulunda)
  if (ARG.uzun && w === 360 && dil === "en") {
    for (let n = soket.gonderilen.length; n < 10; n++) {
      await s.waitForTimeout(3100);
      await sec(n % 4);
    }
    await s.waitForTimeout(400);
    ok("10. tepki de gitti (toplam 10)", soket.gonderilen.length === 10, String(soket.gonderilen.length));
    const dugme = s.locator(S.dugme);
    ok("10'dan sonra düğme kilitli", await dugme.isDisabled(), "");
    await s.waitForTimeout(3300);
    await dugme.click({ force: true, timeout: 800 }).catch(() => {});
    await s.waitForTimeout(200);
    ok("11. tepki gitmedi", soket.gonderilen.length === 10 && (await s.locator(".qt-tepki-panel").count()) === 0, String(soket.gonderilen.length));
    await s.screenshot({ path: path.join(CIKTI, `${etiket}-limit10.png`) });
  }
  ok("etkileşimde hata yok", hatalar.length === 0, hatalar.join(" | "));
}

for (const ad of SAYFALAR) {
  const S = SAYFA[ad];
  if (!S) continue;
  for (const dil of (ARG.dil ? [ARG.dil] : ["tr", "en"])) for (const [w, h] of (ARG.boyut ? [ARG.boyut.split("x").map(Number)] : [[390, 844], [360, 640]])) for (const sayi of (ARG.sayi ? [Number(ARG.sayi)] : [12, 4])) {
    const etiket = `${ad}-${w}x${h}-${dil}-${sayi}`;
    const b = await tarayici.newContext({ storageState: { cookies: [], origins: [{ origin: kok, localStorage: [
      { name: `sb-${REF}-auth-token`, value: JSON.stringify(OTURUM) }, { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" }] }] },
      viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block" });
    const s = await b.newPage();
    const hatalar = [];
    s.on("pageerror", (e) => hatalar.push(String(e).slice(0, 200)));
    const gonderilenIstek = [];
    await s.route(/\.(mp3|ogg|wav|m4a)(\?|$)/, (r) => r.abort());
    await s.route(/\/realtime\//, (r) => r.abort());
    const soket = await soketTaklidi(s);
    await s.route(/supabase\.co\//, (r) => {
      const req = r.request(); const u = req.url();
      const json = (veri) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(veri) });
      const nesne = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
      if (u.includes("/auth/v1/user")) return json(KULLANICI);
      if (u.includes("/auth/v1/token")) return json(OTURUM);
      if (u.includes("/auth/v1/")) return json({});
      if (u.includes("/rpc/profilim")) return json(profil(dil));
      if (u.includes("/rpc/tepki_durumu")) return json({ acik: true, mod: S.macTur, ...(S.kanal ? { kanal: S.kanal } : {}), tepkiler: TUM12.slice(0, sayi), aralik_sn: 3, mac_max: 10, balon_ms: 2000 });
      const v = S.sert(u, req, nesne);
      if (v !== undefined) return json(v);
      if (u.includes("/rest/v1/oyun_ayarlari")) return json(Object.entries(KASA_AYAR).map(([anahtar, deger]) => ({ anahtar, deger })));
      if (u.includes("/rest/v1/rpc/")) return json(null);
      if (u.includes("/rest/v1/")) return json(nesne ? null : []);
      return json({});
    });
    console.log(`\n== ${ad} ${w}×${h} ${dil} · ${sayi} tepki`);
    try {
      await s.goto(`${ADRES}${S.yol}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await s.waitForSelector(S.dugme, { timeout: 20000 });
      await s.waitForTimeout(700);
      const kapaliOnce = await s.evaluate(OLC, { dugme: S.dugme, serit: S.serit });
      await s.screenshot({ path: path.join(CIKTI, `${etiket}-kapali.png`) });
      if (ARG.dump) console.log(JSON.stringify(await s.evaluate(() => { const a = document.querySelector('.m1-alt'); const cs = getComputedStyle(a); return { sinif: a.className, fd: cs.flexDirection, fw: cs.flexWrap, jc: cs.justifyContent, w: Math.round(a.getBoundingClientRect().width), cocuk: [...a.children].map((c) => ({ c: String(c.className), r: c.getBoundingClientRect().toJSON(), fl: getComputedStyle(c).flex })) }; })));
      if (S.eski) { ok("eski arayüz görüntüsü alındı", true); await b.close(); continue; }
      await s.locator(S.dugme).click();
      await s.waitForSelector(".qt-tepki-panel", { timeout: 5000 });
      await s.waitForTimeout(250);
      const acik = await s.evaluate(OLC, { dugme: S.dugme, serit: S.serit });
      await s.screenshot({ path: path.join(CIKTI, `${etiket}-acik.png`) });
      sonuc[etiket] = { kapali: kapaliOnce, acik };
      const beklenen = ad === "grup" ? Math.min(sayi, 4) : sayi;   // Grup yalnız 4 bedava tepki
      ok(`${beklenen} emoji çizildi (${acik.secim})`, acik.secim === beklenen);
      ok("hiçbir emoji ekran dışında/kesik değil", acik.kesik === 0, JSON.stringify(acik.panel));
      ok("yatay taşma yok", acik.yatayTasma <= 0);
      ok(`seçici oyuncu şeridini kapatmıyor`, acik.ortusen.length === 0, acik.ortusen.join(","));
      ok("hata yok", hatalar.length === 0, hatalar.join(" | "));
      if (ARG.etkilesim && sayi === 4) await etkilesim({ s, S, ad, w, h, dil, etiket, soket, hatalar });
    } catch (e) {
      kaldi++; console.log("  ✗ senaryo koşamadı:", String(e).slice(0, 200));
      try { await s.screenshot({ path: path.join(CIKTI, `${etiket}-HATA.png`) }); } catch { /* */ }
    }
    await b.close();
  }
}
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(sonuc, null, 1));
await tarayici.close();
console.log(`\nGEÇTİ ${gecti} · KALDI ${kaldi}`);
process.exit(kaldi ? 1 : 0);
