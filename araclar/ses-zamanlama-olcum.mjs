// Ses ↔ görsel zamanlama ölçümü — TAKLİT VERİYLE (sunucuya yazmaz; duello_* RPC'leri tarayıcıda taklit edilir).
// Düello v4 saldırı sorusu açılışı: faz olayı cihaza L ms geç gelir (L = 0 / 300 / 800 / 3000).
// Ölçer: "kim neyi aldı" panelinin kalktığı an (.d4-acilis DOM'dan çıkar) ile sesSoruGeldi çağrı anı
// (ses.js tanı kaydı, window.__sesKayit) arasındaki fark (ms). Nötr soru: soru kartının çıktığı an ↔ soru_geldi.
// Kullanım: npm run dev -- --port 5188 (başka kabukta) · node araclar/ses-zamanlama-olcum.mjs --adres=http://localhost:5188
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const OTURUM = path.resolve(typeof ARG.oturum === "string" ? ARG.oturum : ".arayuz-denetim-oturum.json");
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }
const ID = "0d0e1100-0000-4000-8000-000000000004";
const RAKIP = "0d0e1100-0000-4000-8000-0000000000bb";
const PAY = 2000;
const SORU = { soru: "Hangi gezegen Güneş Sistemi'nin en büyüğüdür?", secenekler: ["Satürn", "Jüpiter", "Neptün", "Uranüs"], kategori: "bilim" };

// st.fazBas: fazın SUNUCUDA başladığı an (ms). gosterim_bas = fazBas + PAY.
function durum(st) {
  const simdi = Date.now();
  const soruFazi = ["notr", "cevap", "son"].includes(st.faz);
  const bitis = new Date(st.fazBas + PAY + 15000).toISOString();
  const oyuncu = (id, ad) => ({ id, gorunen_ad: ad, gorunen_avatar: "/avatars/pro/tilki-k04.svg", gorunum: null, dogru: 0, unvan: null });
  return {
    surum: 4, id: ID, durum: "aktif", dereceli: true, faz: st.faz, faz_bitis: bitis, sunucu_zamani: new Date(simdi).toISOString(),
    ben: st.ben, rakip: RAKIP, oyuncular: [oyuncu(st.ben, "Sen"), oyuncu(RAKIP, "Deniz")],
    v4: { kontrol: st.kontrol, seri: 0, seri_hedef: 3, tur: st.tur, max_tur: 20, notr_seri: 0, notr_max: 5, son: false, soru_no: st.soruNo,
      kullanilan: [], ilk_mac: false, kart: null, benim_kategori: "tarih", rakip_kategori: "muzik", oto: false },
    soru: soruFazi ? { ...SORU, soru: `${SORU.soru} #${st.soruNo}` } : null,
    cevap: soruFazi ? { benim_bitis: bitis, rakip_bitis: bitis, ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false, elli_kapali: null, ikinci_sans_ilk_cevap: null } : null,
    son_hamle: null,
    skill: { kapali: false, set: [], izinli: [], toplam_hak: 4, tur_basi_hak: 2, soru_basi_hak: 1, kullanilan: 0, sayilar: {}, bu_soruda: 0, rakip_bu_soruda: false, soru_degistir_kilit: null, envanter: {}, fiyatlar: {}, coin: 0 },
    sureler: { kart: 10, cevap: 15, sonuc: 3, ek_sure: 5, zaman_baskisi_eksi: 5, nabiz: 10, kopuk: 25, gosterim_payi_ms: PAY, gosterim_bas: new Date(st.fazBas + PAY).toISOString() },
    kazanan: null, terk_eden: null, odul: null, ezeli: null, gecmis: null, rovans: { isteyen: null, id: null, gecerli: false },
  };
}

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
const satirlar = [];
const konsol = [];
try {
  const durumDosya = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  durumDosya.origins = (durumDosya.origins || []).map((o) => ({ ...o, origin: kok,
    localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim"].includes(x.name)), { name: "bildim_dil", value: "tr" }, { name: "bildim_tanitim", value: "1" }] }));
  const b = await tarayici.newContext({ storageState: durumDosya, viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
  await b.addInitScript(() => { try { sessionStorage.setItem("bd_ses_tani", "1"); } catch { /* yok */ } });
  const s = await b.newPage();
  s.on("console", (m) => { if (m.type() === "error" && !/status of 400/.test(m.text())) konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };
  let st = null;
  await s.route(/\/rest\/v1\/rpc\//, async (r) => {
    const req = r.request(); const u = req.url();
    const json = (veri) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(veri) });
    try {
      if (u.includes("/rpc/duello_durum")) { if (!st) st = { ben: jwtSub(req), faz: "kart", kontrol: null, tur: 1, soruNo: 1, fazBas: Date.now() - 500 }; return json(durum(st)); }
      if (u.includes("/rpc/duello_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
      if (u.includes("/rpc/duello_baglanti")) return json({ kopuk: false });
      if (/\/rpc\/duello_|kalp_at/.test(u)) return json(null);
      return r.continue();
    } catch { try { await r.continue(); } catch { /* kapandı */ } }
  });
  await s.goto(`${ADRES}/duello/${ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  try { await s.waitForSelector(".d4-arena", { timeout: 20000 }); } catch (e) { console.log(konsol, (await s.evaluate(() => document.body.innerText)).slice(0, 400)); throw e; }
  await s.waitForTimeout(1500);
  const tazele = () => s.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));

  // --- Saldırı sorusu açılışı: kart → cevap, faz cihaza L ms geç gelir
  for (const L of [0, 300, 800, 3000]) {
    st.faz = "kart"; st.kontrol = RAKIP; st.tur += 1; st.fazBas = Date.now() - 500;
    await tazele(); await s.waitForTimeout(700);
    await s.evaluate(() => {
      window.__sesKayit = [];
      window.__panelKalkti = null; window.__panelGeldi = null;
      const o = new MutationObserver(() => {
        const var_ = Boolean(document.querySelector(".d4-acilis"));
        if (var_ && window.__panelGeldi == null) window.__panelGeldi = performance.now();
        if (!var_ && window.__panelGeldi != null && window.__panelKalkti == null) window.__panelKalkti = performance.now();
      });
      o.observe(document.body, { childList: true, subtree: true });
      window.__gozlem = o;
    });
    st.soruNo += 1; st.faz = "cevap"; st.fazBas = Date.now() - L;   // sunucuda L ms önce başladı
    const hedefPerf = await s.evaluate((gecikme) => performance.now() - gecikme + 2000, L);   // panelin kalkması gereken an (duello4_acilis 2000)
    await tazele();
    await s.waitForTimeout(Math.max(0, 2000 - L) + 1200);
    const o = await s.evaluate(() => { window.__gozlem.disconnect(); return { geldi: window.__panelGeldi, kalkti: window.__panelKalkti, ses: (window.__sesKayit || []).filter((x) => x.rol === "soru_geldi").map((x) => x.t), kat: (window.__sesKayit || []).filter((x) => x.rol === "kategori_secildi").map((x) => x.t) }; });
    const ses = o.ses[0] ?? null;
    satirlar.push({ an: "v4 açılış → soru", gecikme: L, panelGeldi: o.geldi && Math.round(o.geldi - (hedefPerf - 2000 + L)), panelKalkti: o.kalkti && Math.round(o.kalkti - hedefPerf),
      sesSoru: ses && Math.round(ses - hedefPerf), fark: o.kalkti && ses ? Math.round(ses - o.kalkti) : null, sesSayisi: o.ses.length,
      kategoriSes: o.kat.length ? Math.round(o.kat[0] - (hedefPerf - 2000 + L)) : null });
  }
  // --- Nötr soru: faz cihaza L ms geç gelir; soru kartı ↔ soru_geldi
  for (const L of [0, 300, 800]) {
    st.faz = "sonuc"; st.fazBas = Date.now(); await tazele(); await s.waitForTimeout(700);
    await s.evaluate(() => {
      window.__sesKayit = []; window.__soruGeldi = null;
      const o = new MutationObserver(() => { if (window.__soruGeldi == null && document.querySelector(".d4-arena .qt-sik")) window.__soruGeldi = performance.now(); });
      o.observe(document.body, { childList: true, subtree: true }); window.__gozlem = o;
    });
    st.soruNo += 1; st.faz = "notr"; st.kontrol = null; st.fazBas = Date.now() - L;
    await tazele(); await s.waitForTimeout(1200);
    const o = await s.evaluate(() => { window.__gozlem.disconnect(); return { soru: window.__soruGeldi, ses: (window.__sesKayit || []).filter((x) => x.rol === "soru_geldi").map((x) => x.t) }; });
    satirlar.push({ an: "nötr soru", gecikme: L, fark: o.soru && o.ses[0] ? Math.round(o.ses[0] - o.soru) : null, sesSayisi: o.ses.length });
  }
} finally { await tarayici.close(); }
console.table(satirlar);
console.log("konsol hatası:", konsol.length ? konsol : "yok");
