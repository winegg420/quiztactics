// Basılı tut (1052) tarayıcı denemesi — TAKLİT VERİYLE (cevap RPC'leri tarayıcıda yakalanır, canlıya yazmaz).
// Modlar: Klasik kartı (gerçek QuestionCard, sahne) · Ortak Hazine (KasaPage) · Düello v4 (Duello4Arena) · Çalışma (CalismaPage).
// Her modda yetkili (dogru_cevap gelir) ve yetkisiz (gelmez) iki bağlam:
//   · yetkili: yanlış şıkta 1 sn basılı tut + parmağı kaydır → cevap YOK · 3 sn → cevap = DOĞRU şık, tek kez
//              basılı anda ilerleme çizgisi görünür (ekran görüntüsü: ~1,5 sn) · hareket azaltmada sade dolgu (ekran görüntüsü)
//   · yetkisiz: şıklarda basılı tut sınıfı yok, 3,5 sn basılı tutunca bırakmadan cevap gitmez
//   · Düello: cevap verilmişken (sıra bende değil) basılı tut tetiklenmez
// Çıktı: tasarim/basili-tut/*.png + olcum.json
// Kullanım: npm run dev -- --port 5191 (başka kabukta) · node araclar/basili-tut-ekran.mjs --adres=http://localhost:5191 [--yalniz=klasik,kasa,duello,calisma]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5191";
const YALNIZ = typeof ARG.yalniz === "string" ? new Set(ARG.yalniz.split(",")) : null;
const calis = (ad) => !YALNIZ || YALNIZ.has(ad);
const OTURUM = path.resolve(typeof ARG.oturum === "string" ? ARG.oturum : ".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/basili-tut");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }

const W = 390, H = 844;
const DOGRU = 1;
const KASA_ID = "0b6f6800-0000-4000-8000-00000000b7a1";
const D4_ID = "0d0e1100-0000-4000-8000-0000000000b7";
const RAKIP = "0b6f6800-0000-4000-8000-0000000000aa";
const SORU = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], kategori: "cografya" };
const KASA_AYAR = { kasa_modu_acik: 1, kasa_odul_acik: 1, kasa_odul_carpani: 1, kasa_artis: 2, kasa_ikisi_dogru_artis: 6, kasa_hedef_puan: 80, kasa_max_tur: 36,
  kasa_soru_sn: 15, kasa_karar_sn: 5, kasa_sonuc_sn: 3, kasa_tavan: 80, kasa_devam_carpan: 2, kasa_acma_min: 0 };

function kasaDurum(ben, yetkili) {
  const simdi = Date.now(); const iso = (ms) => new Date(simdi + ms).toISOString();
  const oy = (id, ad, puan) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/basortulu-y04.svg" : null, gorunum: null, unvan: null, puan, acma: 1 });
  return { id: KASA_ID, durum: "aktif", dereceli: true, faz: "cevap", faz_bitis: iso(14000), sunucu_zamani: new Date(simdi).toISOString(),
    ben, tur: 7, max_tur: 36, hedef: 80, altin: false, artis: 2, ikisi_artis: 6, kasa: 10, sahip: ben,
    oyuncular: [oy(ben, "Sen", 8), oy(RAKIP, "Deniz Yıldırımoğlu", 12)], karar: null, son_karar: null,
    soru: yetkili ? { ...SORU, dogru_cevap: DOGRU } : { ...SORU },
    cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false }, sonuc: null,
    sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 25, gosterim_payi_ms: 2000, gosterim_bas: iso(-3000), benim_bitis: iso(14000), faz_son: iso(14000) },
    kopuk: null, kazanan: null, sonuc_neden: null, terk: null, baglanmayan: null, gecmis: null };
}
function d4Durum(ben, yetkili, { cevapladim = false } = {}) {
  const simdi = Date.now(); const iso = (ms) => new Date(simdi + ms).toISOString();
  const oy = (id, ad) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/samuray-y15.svg" : "/avatars/pro/tilki-k04.svg", gorunum: null, dogru: 2, unvan: null });
  return {
    surum: 4, id: D4_ID, durum: "aktif", dereceli: true, faz: "notr", faz_bitis: iso(14000), sunucu_zamani: new Date(simdi).toISOString(), ben, rakip: RAKIP,
    oyuncular: [oy(ben, "Sen"), oy(RAKIP, "Deniz Yıldırımoğlu")],
    v4: { kontrol: null, seri: 0, seri_hedef: 3, tur: 0, max_tur: 20, notr_seri: 1, notr_max: 5, son: false, soru_no: 2, kullanilan: [], ilk_mac: false, kart: null,
      benim_kategori: "cografya", rakip_kategori: "cografya", oto: false },
    // Sunucu (1052) cevap verdikten sonra dogru_cevap göndermez
    soru: yetkili && !cevapladim ? { ...SORU, dogru_cevap: DOGRU } : { ...SORU },
    cevap: { benim_bitis: iso(14000), rakip_bitis: iso(14000), ben_cevapladim: cevapladim, benim_cevabim: cevapladim ? 0 : null, rakip_cevapladi: false, elli_kapali: null, ikinci_sans_ilk_cevap: null },
    son_hamle: null,
    skill: { kapali: false, set: ["elli", "sure", "zaman_baskisi"], izinli: ["elli", "sure"], toplam_hak: 4, tur_basi_hak: 2, soru_basi_hak: 1, kullanilan: 0, sayilar: {}, bu_soruda: 0,
      rakip_bu_soruda: false, soru_degistir_kilit: null, envanter: {}, fiyatlar: {}, coin: 120 },
    sureler: { kart: 10, cevap: 15, sonuc: 3, ek_sure: 5, zaman_baskisi_eksi: 5, nabiz: 10, kopuk: 25, gosterim_payi_ms: 2000, gosterim_bas: iso(-4000) },
    kazanan: null, terk_eden: null, odul: null, ezeli: null, gecmis: null, rovans: { isteyen: null, id: null, gecerli: false },
  };
}
const calismaSoru = (yetkili) => [{ question_id: "bt-cal-1", soru: SORU.soru, secenekler: SORU.secenekler, kategori: "cografya", soru_index: 0, toplam: 5,
  bankadan: false, onceki_yanlis: 0, dogru_serisi: 0, baslangic: new Date().toISOString(), sunucu_zamani: new Date().toISOString(), dogru_cevap: yetkili ? DOGRU : null }];

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const olcum = {};
const ONBELLEK = new Map();   // canlıya her GET en çok BİR kez
const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };

async function baglam({ yetkili, azalt = false, sahne = {} }) {
  const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  durum.origins = (durum.origins || []).map((o) => ({ ...o, origin: kok,
    localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim"].includes(x.name)),
      { name: "bildim_dil", value: "tr" }, { name: "bildim_tanitim", value: "1" }] }));
  const b = await tarayici.newContext({ storageState: durum, viewport: { width: W, height: H }, hasTouch: true, serviceWorkers: "block",
    reducedMotion: azalt ? "reduce" : "no-preference" });
  const s = await b.newPage();
  const konsol = [];
  const cevaplar = [];   // { rpc, p_cevap }
  s.on("console", (m) => { if (m.type() === "error" && !/status of 4\d\d|Failed to load resource/.test(m.text())) konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  await s.route(/\/rest\/v1\//, async (r) => {
    const req = r.request(); const u = req.url();
    const json = (veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
    try {
      const cv = /\/rpc\/(kasa_cevap|duello_cevap|calisma_cevap)/.exec(u);
      if (cv) {
        let govde = {}; try { govde = JSON.parse(req.postData() ?? "{}"); } catch { /* boş */ }
        cevaplar.push({ rpc: cv[1], p_cevap: govde.p_cevap, an: Date.now() });
        if (cv[1] === "calisma_cevap") return json([{ dogru: govde.p_cevap === DOGRU, dogru_cevap: DOGRU, ogrenildi: false }]);
        return json({ message: "Ölçüm aracı: yazma kapalı" }, 400);
      }
      if (/\/rpc\/(kasa_karar|kasa_joker|duello_kategori_sec|calisma_bitir)/.test(u)) return json({ message: "Ölçüm aracı: yazma kapalı" }, 400);
      if (u.includes("/rpc/kasa_durum")) return json(kasaDurum(jwtSub(req), yetkili));
      if (u.includes("/rpc/kasa_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
      if (u.includes("/rpc/kasa_aktif_benim")) return json([]);
      if (u.includes("/rpc/kasa_joker_durumu")) return json(null);
      if (u.includes("/rpc/duello_durum")) return json(d4Durum(jwtSub(req), yetkili, sahne.d4));
      if (u.includes("/rpc/duello_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
      if (u.includes("/rpc/duello_baglanti")) return json({ kopuk: false });
      if (u.includes("/rpc/calisma_baslat")) return json([{ oturum_id: "bt-oturum", toplam: 5, bankadan: 0, havuzdan: 5 }]);
      if (u.includes("/rpc/calisma_soru")) return json(calismaSoru(yetkili));
      if (u.includes("/rpc/yanlis_bankam")) return json([]);
      const anahtar = req.method() + " " + u + " " + (req.postData() ?? "");
      let y = ONBELLEK.get(anahtar);
      if (!y) {
        const g = await r.fetch({ timeout: 20000 });
        y = { status: g.status(), headers: g.headers(), body: await g.text() };
        if (g.status() < 500) ONBELLEK.set(anahtar, y);
      }
      let govde = y.body;
      if (u.includes("/rpc/profilim")) { const p = JSON.parse(govde); Object.assign(p, { dil: "tr", takma_ad_secildi: true, avatar_onayli: true, ulke: p.ulke ?? "TR", gorunen_ad: "Deneme", avatar_url: p.avatar_url ?? "/avatars/pro/tilki-k04.svg", kosullar_kabul_at: p.kosullar_kabul_at ?? new Date().toISOString() }); govde = JSON.stringify(p); }
      if (u.includes("/rest/v1/oyun_ayarlari")) {
        try { const l = JSON.parse(govde).filter((x) => !String(x.anahtar).startsWith("kasa_")); for (const [anahtar, deger] of Object.entries(KASA_AYAR)) l.push({ anahtar, deger }); govde = JSON.stringify(l); } catch { /* liste değil */ }
      }
      await r.fulfill({ status: y.status, headers: y.headers, body: govde });
    } catch { try { await r.continue(); } catch { /* sayfa kapandı */ } }
  });
  return { b, s, konsol, cevaplar };
}

const sikMerkez = async (s, i) => { const r = await s.locator(".qt-sik").nth(i).boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
/** Şık i'de ms boyunca basılı tutar; kaydir=true ise bırakmadan önce parmağı şıktan dışarı kaydırır (iptal). */
async function basiliTut(s, i, ms, { kaydir = false, goruntu = null, goruntuMs = 1500 } = {}) {
  const m = await sikMerkez(s, i);
  await s.mouse.move(m.x, m.y);
  await s.mouse.down();
  if (goruntu && ms > goruntuMs) { await s.waitForTimeout(goruntuMs); await s.screenshot({ path: path.join(CIKTI, goruntu) }); await s.waitForTimeout(ms - goruntuMs); }
  else await s.waitForTimeout(ms);
  const basiliVar = await s.locator(".qt-sik--basili").count();
  if (kaydir) await s.mouse.move(m.x, m.y + 400, { steps: 4 });
  await s.mouse.up();
  return basiliVar;
}

async function senaryo(ad, ac, { cevapRpc, d4CevapladimDe = false }) {
  // ---------- yetkili ----------
  {
    const { b, s, konsol, cevaplar } = await baglam({ yetkili: true });
    await ac(s);
    const tutulur = await s.locator(".qt-sik.qt-sik--tutulur").count();
    ok(`${ad} yetkili: şıklarda basılı tut sınıfı var (4)`, tutulur === 4, `sayı ${tutulur}`);
    const stil = await s.locator(".qt-sik").first().evaluate((e) => { const c = getComputedStyle(e); return { us: c.userSelect || c.webkitUserSelect, ta: c.touchAction, co: c.webkitTouchCallout ?? null }; });
    ok(`${ad} yetkili: mobil menü/seçim engeli (user-select none, touch-action manipulation)`, stil.us === "none" && /manipulation/.test(stil.ta), JSON.stringify(stil));
    const menuEngel = await s.locator(".qt-sik").first().evaluate((e) => { const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true }); e.dispatchEvent(ev); return ev.defaultPrevented; });
    ok(`${ad} yetkili: uzun basış menüsü (contextmenu) engelli`, menuEngel);
    // 1 sn + kaydır → cevap yok
    await basiliTut(s, 0, 1000, { kaydir: true });
    await s.waitForTimeout(2600);   // 3 sn dolsaydı tetiklenecekti
    ok(`${ad} yetkili: 1 sn basılı + kaydırma → cevap gitmedi`, cevaplar.length === 0, JSON.stringify(cevaplar));
    // 3 sn → doğru şık (yanlış şık 0'a basılıyken). Taklit cevap RPC'si 400 döner (yazma kapalı): parmak kalkınca
    // gelen tıklama tutulan yanlış şıkkı yine de göndermemeli (useBasiliTut tıklamayı yutar).
    const basiliVar = await basiliTut(s, 0, 3300, { goruntu: `${ad}-yetkili-basili-1500ms.png` });
    await s.waitForTimeout(700);
    const giden = cevaplar.filter((c) => c.rpc === cevapRpc || cevapRpc === "kart");
    ok(`${ad} yetkili: 3 sn → cevap tek kez ve DOĞRU şık (${DOGRU})`, giden.length === 1 && Number(giden[0].p_cevap) === DOGRU, JSON.stringify(cevaplar));
    olcum[`${ad}-yetkili`] = { cevaplar, basiliVar, konsol };
    await s.screenshot({ path: path.join(CIKTI, `${ad}-yetkili-3sn-sonra.png`) });
    ok(`${ad} yetkili: konsol hatası yok`, konsol.length === 0, konsol.slice(0, 2).join(" | "));
    await b.close();
  }
  // ---------- yetkili + hareket azaltma: sade dolgu ----------
  {
    const { b, s } = await baglam({ yetkili: true, azalt: true });
    await ac(s);
    const m = await sikMerkez(s, 2);
    await s.mouse.move(m.x, m.y); await s.mouse.down(); await s.waitForTimeout(600);
    const dolgu = await s.locator(".qt-sik--basili").first().evaluate((e) => { const c = getComputedStyle(e, "::before"); return { anim: c.animationName, tr: c.transform, op: c.opacity }; }).catch(() => null);
    ok(`${ad} hareket azaltma: animasyonsuz sade dolgu`, dolgu && dolgu.anim === "none" && Number(dolgu.op) < 0.5, JSON.stringify(dolgu));
    await s.screenshot({ path: path.join(CIKTI, `${ad}-yetkili-azalt.png`) });
    await s.mouse.move(m.x, m.y + 400); await s.mouse.up();
    await b.close();
  }
  // ---------- yetkisiz ----------
  {
    const { b, s, cevaplar } = await baglam({ yetkili: false });
    await ac(s);
    const tutulur = await s.locator(".qt-sik--tutulur").count();
    ok(`${ad} yetkisiz: basılı tut sınıfı YOK`, tutulur === 0, `sayı ${tutulur}`);
    const m = await sikMerkez(s, 0);
    await s.mouse.move(m.x, m.y); await s.mouse.down(); await s.waitForTimeout(3500);
    const once = cevaplar.length;
    const basili = await s.locator(".qt-sik--basili").count();
    await s.screenshot({ path: path.join(CIKTI, `${ad}-yetkisiz-3500ms.png`) });
    await s.mouse.move(m.x, m.y + 400); await s.mouse.up();
    ok(`${ad} yetkisiz: 3,5 sn basılı → cevap gitmedi, çizgi yok`, once === 0 && basili === 0, JSON.stringify(cevaplar));
    await b.close();
  }
  // ---------- Düello: cevap verilmiş (sıra bende değil) ----------
  if (d4CevapladimDe) {
    const { b, s, cevaplar } = await baglam({ yetkili: true, sahne: { d4: { cevapladim: true } } });
    await ac(s, { kilitli: true });
    const m = await sikMerkez(s, 2);
    await s.mouse.move(m.x, m.y, { steps: 1 }); await s.mouse.down(); await s.waitForTimeout(3400); await s.mouse.up();
    ok(`${ad}: cevap verilmişken basılı tut tetiklenmez`, cevaplar.length === 0 && await s.locator(".qt-sik--tutulur").count() === 0, JSON.stringify(cevaplar));
    await s.screenshot({ path: path.join(CIKTI, `${ad}-cevapladim-tetik-yok.png`) });
    await b.close();
  }
}

const hazirSik = async (s, kilitli = false) => {
  await s.waitForSelector(".qt-sik", { timeout: 30000 });
  if (!kilitli) await s.waitForFunction(() => document.querySelectorAll(".qt-sik:not(:disabled)").length === 4, null, { timeout: 12000 }).catch(() => {});
  await s.waitForTimeout(900);
};

if (calis("klasik")) {
  console.log("— Klasik kartı (QuestionCard: Klasik · Turnuva · Grup · Hızlı Maç)");
  // Klasik kartında cevap ağdan değil onCevapla'dan geçer: sahne window.__cevaplar'a yazar.
  for (const yetkili of [true, false]) {
    const { b, s, konsol } = await baglam({ yetkili });
    await s.goto(`${ADRES}/araclar/basili-tut-sahne/index.html${yetkili ? "?yetkili=1" : ""}`, { waitUntil: "domcontentloaded" });
    await hazirSik(s);
    const cev = () => s.evaluate(() => window.__cevaplar.slice());
    if (yetkili) {
      ok("klasik yetkili: basılı tut sınıfı var (4)", await s.locator(".qt-sik--tutulur").count() === 4);
      await basiliTut(s, 0, 1000, { kaydir: true }); await s.waitForTimeout(2600);
      ok("klasik yetkili: 1 sn + kaydırma → cevap gitmedi", (await cev()).length === 0, JSON.stringify(await cev()));
      await basiliTut(s, 0, 3300, { goruntu: "klasik-yetkili-basili-1500ms.png" }); await s.waitForTimeout(600);
      const c = await cev();
      ok("klasik yetkili: 3 sn → tek cevap, DOĞRU şık", c.length === 1 && c[0] === DOGRU, JSON.stringify(c));
      await s.screenshot({ path: path.join(CIKTI, "klasik-yetkili-3sn-sonra.png") });
    } else {
      ok("klasik yetkisiz: basılı tut sınıfı YOK", await s.locator(".qt-sik--tutulur").count() === 0);
      const m = await sikMerkez(s, 0); await s.mouse.move(m.x, m.y); await s.mouse.down(); await s.waitForTimeout(3500);
      ok("klasik yetkisiz: 3,5 sn basılı → cevap gitmedi", (await cev()).length === 0);
      await s.mouse.move(m.x, m.y + 400); await s.mouse.up();
    }
    ok(`klasik ${yetkili ? "yetkili" : "yetkisiz"}: konsol hatası yok`, konsol.length === 0, konsol.slice(0, 2).join(" | "));
    await b.close();
  }
}
if (calis("kasa")) {
  console.log("— Ortak Hazine (KasaPage)");
  await senaryo("kasa", async (s) => { await s.goto(`${ADRES}/kasa/${KASA_ID}`, { waitUntil: "domcontentloaded" }); await hazirSik(s); }, { cevapRpc: "kasa_cevap" });
}
if (calis("duello")) {
  console.log("— Düello v4 (Duello4Arena)");
  await senaryo("duello", async (s, o = {}) => { await s.goto(`${ADRES}/duello/${D4_ID}`, { waitUntil: "domcontentloaded" }); await hazirSik(s, o.kilitli); },
    { cevapRpc: "duello_cevap", d4CevapladimDe: true });
}
if (calis("calisma")) {
  console.log("— Çalışma (CalismaPage)");
  await senaryo("calisma", async (s) => {
    await s.goto(`${ADRES}/calisma`, { waitUntil: "domcontentloaded" });
    await s.getByRole("button", { name: /başla/i }).first().click({ timeout: 30000 });
    await hazirSik(s);
  }, { cevapRpc: "calisma_cevap" });
}

fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify({ tarih: new Date().toISOString(), gecti, kaldi, olcum }, null, 2));
await tarayici.close();
console.log(`\nSONUÇ: ${gecti} geçti · ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
