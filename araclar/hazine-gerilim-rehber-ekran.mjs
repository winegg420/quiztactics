// Ortak Hazine · karar gerilimi + ilk Hazine rehberi (1094) ekran ölçümü — TAKLİT VERİYLE (sunucuya yazmaz; kasa_* RPC'leri
// tarayıcıda taklit edilir, kasa_durum yanıtında rehber: true). Kalıp araclar/kasa-ekran.mjs ile aynı.
// Ölçer:
//   · rehber: ilk sonuçta "hazine", ilk kendi kararımda "karar", AÇ'tan sonra "ac" balonu — metin (TR/EN), ekranda (taşma yok),
//     Geç ≥ 44 px; Geç → balon kapanır ve rehberin kalanı (başka maçta da değil, aynı maçta) bir daha çıkmaz
//   · gerilim: karar sahnesinin seviye sınıfı (az/orta/dolu/tavan), yakınlaşma (transform ölçeği) ve ışık opaklığı; kalp atışı
//     (Web Audio osilatörü sayılır: 3 sn'de kaç atış) ve karar başı titreşim deseni (navigator.vibrate taklit edilir)
//   · hareket azaltma: yakınlaşma/titreşim yok, ışık durağan
//   · 6× yavaş CPU: karar fazına geçişte stil/düzen/boyama süreleri (Chrome izi) — ÖNCE (yeni efektler CSS ile kapalı) / SONRA
// Kullanım: npm run dev -- --port 5188 · node araclar/arayuz-denetim.mjs --adres=http://localhost:5188 --sadece-oturum
//           node araclar/hazine-gerilim-rehber-ekran.mjs [--adres=http://localhost:5188] [--dil=tr] [--en=390] [--perf-yok]
// Çıktı: tasarim/hazine-gerilim/*.png + olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const OTURUM = path.resolve(typeof ARG.oturum === "string" ? ARG.oturum : ".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/hazine-gerilim");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs --sadece-oturum"); process.exit(1); }

const ID_A = "0b6f6800-0000-4000-8000-0000000a1094";
const ID_B = "0b6f6800-0000-4000-8000-0000000b1094";
const RAKIP = "0b6f6800-0000-4000-8000-0000000000aa";
const AYARLAR = { kasa_modu_acik: 1, kasa_odul_acik: 1, kasa_odul_carpani: 1, kasa_artis: 2, kasa_ikisi_dogru_artis: 6,
  kasa_hedef_puan: 80, kasa_max_tur: 36, kasa_soru_sn: 15, kasa_karar_sn: 5, kasa_sonuc_sn: 3, kasa_tavan: 60, kasa_devam_carpan: 2, kasa_acma_min: 0 };
const SORU = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], kategori: "cografya" };
const SEVIYE_KASA = { az: 8, orta: 30, dolu: 50, tavan: 60 };   // tavan 60 → az < 20 ≤ orta < 40 ≤ dolu < 60 = tavan

// Senaryo → kasa_durum (ben = oturumdaki kullanıcı). st: { ad, id, tur, kasa, bitisMs }
function durum(st, ben) {
  const simdi = Date.now();
  const iso = (ms) => new Date(simdi + ms).toISOString();
  const oyuncu = (id, ad, puan) => ({ id, gorunen_ad: ad, gorunen_avatar: null, gorunum: null, unvan: null, puan, acma: 0 });
  const temel = {
    id: st.id, durum: "aktif", dereceli: true, faz: "cevap", faz_bitis: iso(st.bitisMs ?? 12000), sunucu_zamani: new Date(simdi).toISOString(),
    ben, tur: st.tur, max_tur: 36, hedef: 80, altin: false, artis: 2, ikisi_artis: 6, kasa: st.kasa ?? 8, sahip: ben, acma_min: 0, jokerli: false,
    devam_birakir: true, tavan: 60, devam_carpan: 2, savunma_acik: false, savunma_hak: [], savunma: null, rehber: true,
    oyuncular: [oyuncu(ben, "Sen", 12), oyuncu(RAKIP, "Deniz Yıldırımoğlu", 18)],
    karar: null, son_karar: null, soru: SORU, cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false }, sonuc: null,
    sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 1500, gosterim_bas: iso(-2000) },
    kopuk: null, kazanan: null, sonuc_neden: null, terk: null, baglanmayan: null, gecmis: null,
  };
  switch (st.ad) {
    case "sonuc": return { ...temel, faz: "sonuc", kasa: 10, cevap: null,
      sonuc: { tur: st.tur, altin: false, dogru_cevap: 1, artis: 2, kasa_once: 8, kasa_sonra: 10, sahip_once: null, sahip_sonra: ben, kazanan: null, benim_cevabim: 1, ben_dogru: true, rakip_dogru: false } };
    case "karar": return { ...temel, faz: "karar", soru: null, cevap: null, karar: { veren: ben, deger: st.kasa }, kasa: st.kasa };
    case "karar-rakip": return { ...temel, faz: "karar", soru: null, cevap: null, sahip: RAKIP, karar: { veren: RAKIP, deger: st.kasa }, kasa: st.kasa };
    case "cevap-ac": return { ...temel, kasa: 0, sahip: null, son_karar: { veren: RAKIP, ac: true, deger: 14 },
      oyuncular: [oyuncu(ben, "Sen", 12), oyuncu(RAKIP, "Deniz Yıldırımoğlu", 32)] };
    default: return temel;
  }
}

const OLC = () => {
  const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { sol: Math.round(b.left), sag: Math.round(b.right), ust: Math.round(b.top), alt: Math.round(b.bottom) }; };
  const balon = [...document.querySelectorAll(".qt-rehber")].map((e) => ({ sinif: e.className, metin: e.innerText.replace(/\s+/g, " ").trim(), kutu: r(e),
    gecH: Math.round(e.querySelector(".qt-rehber-gec")?.getBoundingClientRect().height ?? 0), gecW: Math.round(e.querySelector(".qt-rehber-gec")?.getBoundingClientRect().width ?? 0) }));
  const sahne = document.querySelector(".ks-karar-sahne");
  let olcek = null, isik = null, anim = null;
  if (sahne) {
    const t = getComputedStyle(sahne).transform; const m = t.match(/matrix\(([^,]+)/); olcek = t === "none" ? 1 : m ? Math.round(Number(m[1]) * 1000) / 1000 : t;
    isik = Math.round(Number(getComputedStyle(sahne, "::before").opacity) * 100) / 100;
    anim = getComputedStyle(sahne).animationName;
  }
  return { balon, sahne: sahne?.className ?? null, olcek, isik, anim, yatayTasma: document.documentElement.scrollWidth - window.innerWidth, w: innerWidth, h: innerHeight,
    kalp: window.__kalp?.length ?? 0, titresim: window.__titresim ?? [] };
};

// Kalp atışı (üçgen dalga < 200 Hz osilatör başlangıcı) ve titreşim sayacı — yalnız bu ölçüm sayfasında
const IZLE = () => {
  window.__kalp = []; window.__titresim = [];
  try {
    const bas = OscillatorNode.prototype.start;
    // frequency.value zamanlanmış değeri hemen göstermez (440 okunur) → setValueAtTime ile verilen son değer saklanır
    const kur = AudioParam.prototype.setValueAtTime;
    AudioParam.prototype.setValueAtTime = function (v, t) { this.__son = v; return kur.call(this, v, t); };
    OscillatorNode.prototype.start = function (...a) { try { if (this.type === "triangle" && (this.frequency.__son ?? this.frequency.value) < 200) window.__kalp.push(performance.now()); } catch { /* yok */ } return bas.apply(this, a); };
  } catch { /* Web Audio yok */ }
  try { Object.defineProperty(Navigator.prototype, "vibrate", { configurable: true, value: function (d) { window.__titresim.push(d); return true; } }); } catch { /* yok */ }
};

const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const sonuc = {};
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const kok = new URL(ADRES).origin;
const DILLER = ARG.dil ? [ARG.dil] : ["tr", "en"];
const EKRANLAR = ARG.en ? [[Number(ARG.en), Number(ARG.en) === 360 ? 640 : 844]] : [[390, 844], [360, 640]];
const KOSULAR = [];
for (const dil of DILLER) for (const [w, h] of EKRANLAR) KOSULAR.push({ dil, w, h, azalt: false });
if (!ARG.dil || ARG.dil === "tr") KOSULAR.push({ dil: "tr", w: 360, h: 640, azalt: true });

for (const { dil, w, h, azalt } of KOSULAR) {
  const durumDosya = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  durumDosya.origins = (durumDosya.origins || []).map((o) => ({ ...o, origin: kok,
    localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim", "qt_profil_onbellek"].includes(x.name) && !/^ks_rehber:/.test(x.name)),
      { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" }] }));
  const b = await tarayici.newContext({ storageState: durumDosya, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block",
    reducedMotion: azalt ? "reduce" : "no-preference" });
  await b.addInitScript(IZLE);
  const s = await b.newPage();
  const konsol = [];
  s.on("console", (m) => { if (m.type() === "error" && !/status of 4\d\d|Failed to load resource/.test(m.text())) konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  const st = { ad: "cevap", id: ID_A, tur: 3, kasa: 8, bitisMs: 12000 };
  const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };
  await s.route(/\/rest\/v1\/(oyun_ayarlari|rpc\/|profiles)/, async (r) => {
    const req = r.request(); const u = req.url();
    const json = (veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
    try {
      if (u.includes("/rpc/kasa_durum")) return json(durum(st, jwtSub(req)));
      if (u.includes("/rpc/kasa_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
      if (u.includes("/rpc/kasa_aktif_benim")) return json([]);
      if (/\/rpc\/kasa_(cevap|karar|terk|ara|davet|aramadan|nabiz|tepki)/.test(u)) return json({ message: "Ölçüm aracı: yazma kapalı" }, 400);
      if (u.includes("/rest/v1/oyun_ayarlari")) {
        const y = await r.fetch({ timeout: 20000 }).catch(() => null);
        const liste = y && y.ok() ? JSON.parse(await y.text()).filter((x) => !String(x.anahtar).startsWith("kasa_")) : [];
        for (const [anahtar, deger] of Object.entries(AYARLAR)) liste.push({ anahtar, deger });
        return json(liste);
      }
      // profil dili ölçüm diline çevrilir (yoksa sunucudaki profil dili arayüzü TR'ye döndürür) — kasa-ekran.mjs ile aynı
      const y = await r.fetch({ timeout: 20000 });
      await r.fulfill({ response: y, body: (await y.text()).replace(/"dil":\s*"(tr|en)"/g, `"dil":"${dil}"`) });
    } catch { try { await r.continue(); } catch { /* sayfa kapandı */ } }
  });
  const etiket = `${w}x${h}-${dil}${azalt ? "-azalt" : ""}`;
  const TR = dil === "tr";
  const ac = async (ad, ek = {}) => { Object.assign(st, { ad, ...ek }); await s.goto(`${ADRES}/kasa/${st.id}`, { waitUntil: "domcontentloaded", timeout: 30000 }); };
  const bekle = async (q, sure = 20000) => { try { await s.waitForSelector(q, { timeout: sure }); return true; } catch { return false; } };
  const kaydet = (ad) => s.screenshot({ path: path.join(CIKTI, `${ad}-${etiket}.png`) });
  // gezinme anında (yeniden yükleme) değerlendirme birkaç kez yeniden denenir
  const guvenli = async (f, a) => { for (let i = 0; ; i++) { try { return await s.evaluate(f, a); } catch (e) { if (i >= 3 || !/context was destroyed|navigation/i.test(String(e))) throw e; await s.waitForTimeout(800); } } };
  const olc = async (ad) => { const o = await guvenli(OLC); sonuc[`${ad}-${etiket}`] = o; return o; };
  const balonOk = (ad, o, anahtar, desen) => {
    const x = o.balon.find((q) => q.sinif.includes(`ks-rehber--${anahtar}`));
    ok(`${ad}: '${anahtar}' balonu + metin`, x && desen.test(x.metin), JSON.stringify(o.balon));
    ok(`${ad}: balon ekranda, taşma yok`, x && x.kutu.sol >= 0 && x.kutu.sag <= w && x.kutu.alt <= h && o.yatayTasma <= 0, JSON.stringify(x?.kutu) + " taşma " + o.yatayTasma);
    ok(`${ad}: Geç ≥ 44 px`, x && x.gecH >= 44 && x.gecW >= 44, `${x?.gecW}×${x?.gecH}`);
  };
  console.log(`\n== ${etiket}`);
  try {
    // 1) ilk sonuç → "hazine" balonu
    await ac("sonuc", { tur: 3, bitisMs: 30000 });
    await bekle(".ks-bant");
    await bekle(".ks-rehber--hazine", 6000);
    await s.waitForTimeout(azalt ? 200 : 450);
    let o = await olc("01-rehber-hazine");
    balonOk("hazine", o, "hazine", TR ? /Hazine her soruda büyür\. Tek başına bilen alır\. Geç/ : /The treasure grows every question\. Answer alone to take it\. Skip/);
    await kaydet("01-rehber-hazine");
    // kullanıcı etkinliği (ses + titreşim tarayıcı kuralı): şerit üstüne dokun (düğme değil)
    await s.locator(".ks-serit").first().click({ position: { x: 4, y: 4 }, force: true }).catch(() => {});

    // 2) ilk kendi kararım → "karar" balonu + gerilim (az)
    Object.assign(st, { ad: "karar", tur: 4, kasa: SEVIYE_KASA.az, bitisMs: 30000 });
    await guvenli(() => { window.__kalp = []; window.__titresim = []; });
    await s.goto(`${ADRES}/kasa/${st.id}`, { waitUntil: "domcontentloaded" });   // yeni sayfa: etkinlik için tekrar dokun
    await bekle(".ks-karar-eylem");
    await s.locator(".ks-serit").first().click({ position: { x: 4, y: 4 }, force: true }).catch(() => {});
    await s.waitForTimeout(900);
    o = await olc("02-rehber-karar");
    balonOk("karar", o, "karar", TR ? /AÇ: puanına yaz\. DEVAM: hazine büyür, sahipsiz kalır\. Geç/ : /OPEN: add it to your score\. KEEP: it grows and is up for grabs\. Skip/);
    await kaydet("02-rehber-karar");

    // 3) gerilim seviyeleri (her seviye yeni tur; balon artık çıkmaz — karar anı görüldü)
    const kalpler = {};
    for (const sev of ["az", "orta", "dolu", "tavan"]) {
      Object.assign(st, { ad: "karar", tur: 10 + Object.keys(kalpler).length, kasa: SEVIYE_KASA[sev], bitisMs: 30000 });
      await s.goto(`${ADRES}/kasa/${st.id}`, { waitUntil: "domcontentloaded" });
      await bekle(".ks-karar-eylem");
      await s.locator(".ks-serit").first().click({ position: { x: 4, y: 4 }, force: true }).catch(() => {});
      await guvenli(() => { window.__kalp = []; window.__titresim = []; });
      await s.waitForTimeout(3000);
      o = await olc(`03-gerilim-${sev}`);
      kalpler[sev] = o.kalp;
      ok(`gerilim ${sev}: sahne sınıfı ks-karar-sahne--${sev}`, String(o.sahne).includes(`ks-karar-sahne--${sev}`), o.sahne);
      if (azalt) ok(`gerilim ${sev} (hareket azaltma): yakınlaşma yok, animasyon yok`, o.olcek === 1 && o.anim === "none", `${o.olcek} ${o.anim}`);
      else ok(`gerilim ${sev}: yakınlaşma > 1`, Number(o.olcek) > 1, String(o.olcek));
      ok(`gerilim ${sev}: balon yok (karar anı bir kez)`, o.balon.length === 0, JSON.stringify(o.balon));
      if (sev === "tavan" || sev === "az") await kaydet(`03-gerilim-${sev}`);
    }
    sonuc[`kalp-${etiket}`] = kalpler;
    // 3 sn'de osilatör başlangıcı (atış başına 2): az 1000 ms → ~3–4 atış · tavan 500 ms → ~6–7 atış
    const atis = Object.fromEntries(Object.entries(kalpler).map(([k, v]) => [k, v / 2]));
    ok(`kalp atışı seviyeyle hızlanıyor (3 sn'de ${JSON.stringify(atis)})`, atis.az >= 2 && atis.tavan > atis.orta && atis.orta >= atis.az && atis.tavan >= 5, JSON.stringify(atis));
    // titreşim yalnız karar başında ve sayfaya dokunulduktan sonra (tarayıcı kuralı): dokunulmuş sayfada yeni tur karar fazı
    // (yedek yoklamayla gelir, ≤ 4 sn) → dolu seviyesinin deseni
    await guvenli(() => { window.__titresim = []; });
    Object.assign(st, { ad: "karar", tur: 30, kasa: SEVIYE_KASA.dolu, bitisMs: 30000 });
    await s.waitForFunction(() => document.querySelector(".ks-karar-sahne--dolu"), null, { timeout: 12000 }).catch(() => {});
    await s.waitForTimeout(400);
    const tit = await guvenli(() => window.__titresim);
    sonuc[`titresim-${etiket}`] = tit;
    if (azalt) ok("hareket azaltma: titreşim yok", tit.length === 0, JSON.stringify(tit));
    else ok(`karar başı titreşim (dolu): ${JSON.stringify(tit)}`, tit.length === 1 && JSON.stringify(tit[0]) === "[24,50,24]", JSON.stringify(tit));
    const isikAz = sonuc[`03-gerilim-az-${etiket}`]?.isik, isikTavan = sonuc[`03-gerilim-tavan-${etiket}`]?.isik;
    ok(`ışık seviyeyle artıyor (az ${isikAz} → tavan ${isikTavan})`, isikTavan > isikAz, `${isikAz} ${isikTavan}`);

    // 3b) rakip karar verirken: gerilim var, balon yok
    Object.assign(st, { ad: "karar-rakip", tur: 20, kasa: SEVIYE_KASA.dolu, bitisMs: 30000 });
    await s.goto(`${ADRES}/kasa/${st.id}`, { waitUntil: "domcontentloaded" });
    await bekle(".ks-karar--bekle");
    await s.waitForTimeout(800);
    o = await olc("04-rakip-karar");
    ok("rakip karar: sahne dolu, balon yok", String(o.sahne).includes("ks-karar-sahne--dolu") && o.balon.length === 0, JSON.stringify([o.sahne, o.balon]));

    // 4) AÇ'tan sonra → "ac" balonu
    await ac("cevap-ac", { tur: 21, bitisMs: 30000 });
    await bekle(".qt-sik");
    await bekle(".ks-rehber--ac", 6000);
    await s.waitForTimeout(450);
    o = await olc("05-rehber-ac");
    balonOk("ac", o, "ac", TR ? /AÇ hazineyi puana ekler, hazine sıfırlanır\. Geç/ : /OPEN adds the treasure to the score and resets it\. Skip/);
    await kaydet("05-rehber-ac");
    // balon kendiliğinden kalkar (5 sn)
    await s.waitForTimeout(5300);
    ok("balon 5 sn sonra kalktı", await s.locator(".qt-rehber").count() === 0);

    // 5) Geç: B maçında ilk balon (hazine) → Geç → karar ve ac balonu çıkmaz
    await ac("sonuc", { id: ID_B, tur: 2, bitisMs: 30000 });
    await bekle(".ks-rehber--hazine", 8000);
    await s.locator(".ks-rehber--hazine .qt-rehber-gec").click({ timeout: 3000 }).catch(() => {});
    await s.waitForTimeout(300);
    ok("Geç → balon kapandı", await s.locator(".qt-rehber").count() === 0);
    await ac("karar", { tur: 3, kasa: SEVIYE_KASA.orta, bitisMs: 30000 });
    await bekle(".ks-karar-eylem"); await s.waitForTimeout(900);
    ok("Geç sonrası karar balonu çıkmadı", await s.locator(".qt-rehber").count() === 0);
    await ac("cevap-ac", { tur: 4, bitisMs: 30000 });
    await bekle(".qt-sik"); await s.waitForTimeout(1200);
    ok("Geç sonrası AÇ balonu çıkmadı", await s.locator(".qt-rehber").count() === 0);
    ok("konsol hatası yok", konsol.length === 0, konsol.slice(0, 3).join(" | "));
  } catch (e) {
    ok(`${etiket}: akış hatası`, false, String(e?.message ?? e).slice(0, 200));
  }

  // 6) 6× yavaş CPU: karar fazına geçişte stil/düzen/boyama (yalnız 390 TR, hareket azaltmasız)
  if (!ARG["perf-yok"] && !azalt && w === 390 && dil === "tr") {
    const cdp = await b.newCDPSession(s);
    const olcPerf = async (once) => {
      const sonuclar = [];
      for (let i = 0; i < 3; i++) {
        Object.assign(st, { ad: "karar", id: ID_A, tur: 40 + i + (once ? 10 : 0), kasa: SEVIYE_KASA.tavan, bitisMs: 30000 });
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
        await s.goto(`${ADRES}/kasa/${st.id}`, { waitUntil: "domcontentloaded" });
        await bekle(".ks-karar-eylem");
        if (once) await s.addStyleTag({ content: ".ks-karar-sahne{animation:none!important}.ks-karar-sahne::before{display:none!important}" });
        // aynı karar ekranı yeniden çizilsin: kadran sahnesini söküp takıyoruz (ölçüm anı = gerilim girişinin oynadığı 1,2 sn)
        await s.waitForTimeout(1500);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
        await tarayici.startTracing(s, { categories: ["devtools.timeline", "disabled-by-default-devtools.timeline"] });
        await s.evaluate(() => { const e = document.querySelector(".ks-karar-sahne"); if (!e) return; const p = e.parentNode, n = e.nextSibling; p.removeChild(e); void p.offsetHeight; p.insertBefore(e, n); });
        await s.waitForTimeout(1200);
        const iz = JSON.parse((await tarayici.stopTracing()).toString());
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
        const top = { stil: 0, duzen: 0, boyama: 0, birlestir: 0 };
        for (const ev of iz.traceEvents ?? []) {
          if (ev.ph !== "X" || !ev.dur) continue;
          if (ev.name === "UpdateLayoutTree" || ev.name === "RecalculateStyles") top.stil += ev.dur;
          else if (ev.name === "Layout") top.duzen += ev.dur;
          else if (ev.name === "Paint" || ev.name === "PrePaint" || ev.name === "PaintImage" || ev.name === "RasterTask") top.boyama += ev.dur;
          else if (ev.name === "CompositeLayers" || ev.name === "Commit") top.birlestir += ev.dur;
        }
        sonuclar.push(Object.fromEntries(Object.entries(top).map(([k, v]) => [k, Math.round(v / 100) / 10])));
      }
      const ort = {}; for (const k of Object.keys(sonuclar[0])) ort[k] = Math.round(sonuclar.reduce((a, x) => a + x[k], 0) / sonuclar.length * 10) / 10;
      return { ort, sonuclar };
    };
    try {
      const once = await olcPerf(true);
      const sonra = await olcPerf(false);
      sonuc.perf6x = { once, sonra, birim: "ms (1,2 sn pencere, 3 koşu ortalaması, 6× yavaş CPU)" };
      console.log("  6× CPU ÖNCE (efekt kapalı):", JSON.stringify(once.ort), " SONRA:", JSON.stringify(sonra.ort));
      ok("6× CPU: düzen süresi artmadı (sonra ≤ önce + 2 ms)", sonra.ort.duzen <= once.ort.duzen + 2, JSON.stringify([once.ort, sonra.ort]));
    } catch (e) { ok("6× CPU ölçümü", false, String(e?.message ?? e).slice(0, 200)); }
  }
  await b.close();
}

await tarayici.close();
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(sonuc, null, 2));
console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı → tasarim/hazine-gerilim/`);
process.exit(kaldi ? 1 : 0);
