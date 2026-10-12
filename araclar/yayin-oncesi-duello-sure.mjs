// Yayın öncesi tarama · madde 8 — Düello v4: kart seçimi geç yapılınca / süre dolunca saldırı sorusu ekranda
// göründüğü anda sayaç kaç gösteriyor? (11 Eki 2026) — TAM ÇEVRİMDIŞI ölçüm.
// CANLIYA HİÇ İSTEK GİTMEZ: oturum taklit (sahte JWT), /auth/v1 · /rest/v1 · Realtime WebSocket tarayıcıda yanıtlanır;
// *.supabase.co'ya giden başka her istek kesilir ve sayılır (raporda "canlı istek" 0 olmalı).
// Sunucu: duello4_durum'u (1058) ve kart/soru akışını (1058 kart_ac/kart_uygula/kart_oto, 1014 soru_ac, 1059 ilerlet)
// taklit eden küçük JS durum makinesi; zaman alanları gerçek sunucudaki formüllerle üretilir:
//   kart adımı : v4_duyuru_bitis = now + 900 ms, faz_bitis = now + 900 ms + duello4_kart_sn (10 sn)
//   süre dolumu: ilerlet, now ≥ faz_bitis + secim_gec_varis_sn (3 sn) → kart_oto (adım adım) — okuma ya da 2 sn'lik cron
//   soru_ac    : soru_baslangic = now, faz_bitis = bitis1 = bitis2 = now + 15 sn + duello_gosterim_payi_ms (1500)
//   durum      : gosterim_bas = kart → v4_duyuru_bitis · cevap → soru_baslangic + 1500; gosterim_payi_ms = 1500
// Senaryolar (izleyen = kontrol sahibi; ikinci adım da aynı saniyede):
//   a) kart her adımın 1. sn'sinde seçilir (Realtime sinyali var)
//   b) kart her adımın 8. sn'sinde seçilir (Realtime sinyali var)
//   c) hiç seçilmez → iki adım da süre dolumu (+3 sn pay, cron 2 sn) ile otomatik (Realtime sinyali var)
//   d) c gibi, ama Realtime kanalı bağlı ve SİNYAL GELMİYOR → yalnız yoklama (DuelloPage: 4 sn yedek, bitişe yakın
//      500 ms, kart bitişi + 3,1 sn tek okuma)
// Ölçüm (390×844 TR): sunucunun soruyu açtığı an → "kim neyi aldı" paneli görünür → soru metni/şıklar görünür (opaklık ≥ 0,95)
// ve o anda sayaçta yazan rakam + sunucu faz_bitis'e gerçek kalan ms.
// Kullanım: npm run dev (5191) · node araclar/yayin-oncesi-duello-sure.mjs [--adres=http://localhost:5191] [--yalniz=a,b]
// Çıktı: tasarim/yayin-oncesi-tarama/madde8-<senaryo>-{acilis,soru}.png + madde8-olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { duelloTanitimAnahtari } from "./duello-tanitim-anahtar.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5191");
const YALNIZ = ARG.yalniz ? String(ARG.yalniz).split(",") : ["a", "b", "c", "d"];
const CIKTI = path.resolve("tasarim/yayin-oncesi-tarama");
fs.mkdirSync(CIKTI, { recursive: true });

const env = fs.readFileSync(".env", "utf8");
const SUPA = (env.match(/VITE_SUPABASE_URL=\s*"?([^"\s]+)/) || [])[1];
if (!SUPA) { console.error(".env › VITE_SUPABASE_URL yok"); process.exit(2); }
const HOST = new URL(SUPA).hostname;
const DEPO = `sb-${HOST.split(".")[0]}-auth-token`;

// ---------------------------------------------------------------- sunucu ayarları (canlı oyun_ayarlari değerleri)
const KART_SN = 10, DUYURU_MS = 900, CEVAP_SN = 15, PAYI_MS = 1500, SECIM_PAY_MS = 3000, CRON_MS = 2000;

// ---------------------------------------------------------------- taklit oturum
const BEN = "0d0e1100-0000-4000-8000-0000000000aa";
const RAKIP = "0d0e1100-0000-4000-8000-0000000000bb";
const ID = "0d0e1100-0000-4000-8000-000000000008";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const EXP = Math.floor(Date.now() / 1000) + 7 * 86400;
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: BEN, role: "authenticated", aud: "authenticated", exp: EXP, is_anonymous: true })}.taklit`;
const KULLANICI = { id: BEN, aud: "authenticated", role: "authenticated", email: "", is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" };
const OTURUM = { access_token: JWT, token_type: "bearer", expires_in: 7 * 86400, expires_at: EXP, refresh_token: "taklit-yenileme", user: KULLANICI };
const PROFIL = { id: BEN, gorunen_ad: "Deneme", username: "deneme", takma_ad: "Deneme", takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", sehir: "İstanbul",
  dil: "tr", puan: 100, coin: 50, xp: 0, level: 1, misafir: true, gorunen_avatar: null, gorunum: null };
const KARTLAR = ["tarih", "sinema", "muzik", "bilim"];
const SORU = { soru: "Hangi gezegen Güneş Sistemi'nin en büyüğüdür?", secenekler: ["Satürn", "Jüpiter", "Neptün", "Uranüs"] };
const iso = (ms) => new Date(ms).toISOString();

// ---------------------------------------------------------------- sunucu durum makinesi
function yeniSunucu() {
  const s = { faz: "kart", tur: 1, soruNo: 4, gonderilen: null, secilen: null, otoG: false, otoS: false, duyuruBitis: null, fazBitis: null,
    soruBas: null, olay: [], sinyal: () => {}, bas: 0 };
  s.kartAc = (an) => { s.bas = an; s.duyuruBitis = an + DUYURU_MS; s.fazBitis = an + DUYURU_MS + KART_SN * 1000; s.olay.push({ an, olay: "kart_ac" }); };
  s.soruAc = (an) => {
    s.faz = "cevap"; s.soruNo += 1; s.soruBas = an; s.fazBitis = an + CEVAP_SN * 1000 + PAYI_MS;
    s.olay.push({ an, olay: "soru_ac", faz_bitis: s.fazBitis });
  };
  s.kartUygula = (an, gonder, sec, oto) => {          // 1058 › duello4_kart_uygula
    if (s.faz !== "kart") return false;
    if (gonder && !s.gonderilen) {
      s.gonderilen = gonder; s.otoG = oto;
      s.olay.push({ an, olay: `gonder${oto ? "_oto" : ""}`, adimSn: +((an - s.duyuruBitis) / 1000).toFixed(2) });
      if (!sec) { s.duyuruBitis = an + DUYURU_MS; s.fazBitis = an + DUYURU_MS + KART_SN * 1000; }
      return true;
    }
    if (sec && s.gonderilen && !s.secilen) {
      s.secilen = sec; s.otoS = oto;
      s.olay.push({ an, olay: `sec${oto ? "_oto" : ""}`, adimSn: +((an - s.duyuruBitis) / 1000).toFixed(2) });
      s.soruAc(an);
      return true;
    }
    return false;
  };
  s.ilerlet = (an, kaynak) => {                        // 1059 › duello4_ilerlet (kart dalı)
    let degisti = false;
    for (let i = 0; i < 12 && s.faz === "kart" && an >= s.fazBitis + SECIM_PAY_MS; i++) {
      if (!s.gonderilen) degisti = s.kartUygula(an, KARTLAR[3], null, true) || degisti;
      else degisti = s.kartUygula(an, null, KARTLAR.find((k) => k !== s.gonderilen), true) || degisti;
      s.olay.at(-1).kaynak = kaynak;
    }
    if (degisti) s.sinyal();
    return degisti;
  };
  s.durum = (an) => {                                  // 1058 › duello4_durum (istemcinin okuduğu alanlar)
    s.ilerlet(an, "okuma");
    const kart = s.faz === "kart";
    const soruFazi = s.faz === "cevap";
    const benim = BEN, kontrol = BEN;
    const adim = (s.gonderilen ? 1 : 0) + (s.secilen ? 1 : 0);
    const oyuncu = (id, ad) => ({ id, gorunen_ad: ad, gorunen_avatar: null, gorunum: null, dogru: 2, unvan: null });
    return {
      surum: 4, id: ID, durum: "aktif", dereceli: true, faz: s.faz, faz_bitis: iso(s.fazBitis), sunucu_zamani: iso(Date.now()),
      ben: benim, rakip: RAKIP, oyuncular: [oyuncu(BEN, "Sen"), oyuncu(RAKIP, "Deniz")],
      v4: { kontrol, seri: 1, seri_hedef: 3, tur: s.tur, max_tur: 20, notr_seri: 0, notr_max: 5, son: false, soru_no: s.soruNo, kullanilan: [],
        kart: kart ? { kartlar: KARTLAR.map((k) => ({ k, ben: 60, rakip: 40 })), adim, gonderilen: s.gonderilen, secilen: s.secilen, varsayilan: 50 } : null,
        benim_kategori: kart ? null : s.secilen, rakip_kategori: kart ? null : s.gonderilen,
        oto: kart ? null : s.otoG || s.otoS, oto_gonder: kart ? null : s.otoG, oto_sec: kart ? null : s.otoS, ilk_mac: false },
      soru: soruFazi && an >= s.soruBas ? { ...SORU, kategori: s.secilen } : null,
      cevap: soruFazi ? { benim_bitis: iso(s.fazBitis), rakip_bitis: iso(s.fazBitis), ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false,
        elli_kapali: null, ikinci_sans_ilk_cevap: null } : null,
      son_hamle: null,
      skill: { kapali: false, set: ["elli", "sure", "zaman_baskisi"], izinli: ["elli", "sure", "soru_degistir", "zaman_baskisi", "ikinci_sans"], toplam_hak: 4,
        tur_basi_hak: 2, soru_basi_hak: 1, kullanilan: 0, sayilar: {}, bu_soruda: 0, rakip_bu_soruda: false, soru_degistir_kilit: null,
        envanter: {}, fiyatlar: {}, coin: 50 },
      sureler: { kart: KART_SN, kart_duyuru_ms: DUYURU_MS, cevap: CEVAP_SN, sonuc: 3, ek_sure: 5, zaman_baskisi_eksi: 5, nabiz: 10, kopuk: 25,
        gosterim_payi_ms: PAYI_MS, gosterim_bas: kart ? iso(s.duyuruBitis) : iso(s.soruBas + PAYI_MS) },
      kazanan: null, terk_eden: null, odul: null, ezeli: null, gecmis: null, rovans: { isteyen: null, id: null, gecerli: false },
    };
  };
  s.kartAc(Date.now());   // sayfa yüklenirken de geçerli bir kart adımı (hazır olunca yeniden açılır)
  return s;
}

// ---------------------------------------------------------------- sayfa içi ölçüm (her karede)
const OLCUM_KODU = ({ depo, oturum, tanitim }) => {
  try {
    localStorage.setItem("bildim_dil", "tr"); localStorage.setItem("bildim_tanitim", "1");
    localStorage.setItem(tanitim, "1"); localStorage.setItem(depo, JSON.stringify(oturum));
  } catch { /* depolama kapalı */ }
  const o = window.__olcum = { acilis: null, soruDom: null, soru: null, iz: [] };
  const opak = (e) => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false;
    let a = 1; for (let x = e; x; x = x.parentElement) { const c = getComputedStyle(x); if (c.visibility === "hidden" || c.display === "none") return false; a *= +c.opacity; } return a >= 0.95; };
  const sayac = () => document.querySelector(".d4-sayac .qt-sayac-sayi")?.textContent ?? null;
  const kare = () => {
    const t = Date.now();
    if (!o.acilis && document.querySelector(".d4-acilis")) o.acilis = { t, sayac: sayac() };
    const m = document.querySelector(".d4-soru .qt-soru-metin");
    const sik = document.querySelector(".d4-soru .qt-sik");
    if (m && !o.soruDom) o.soruDom = { t, sayac: sayac() };
    if (m && sik && !o.soru && opak(m) && opak(sik)) o.soru = { t, sayac: sayac() };
    if (o.soru && t - o.soru.t < 2600) { const s = sayac(); if (o.iz.at(-1)?.s !== s) o.iz.push({ t, s }); }
    requestAnimationFrame(kare);
  };
  requestAnimationFrame(kare);
};

// ---------------------------------------------------------------- tek senaryo
const json = (r, veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
const bekle = (ms) => new Promise((x) => setTimeout(x, ms));
let canliIstek = 0;

async function senaryoKos(tarayici, ad, { secimSn, sinyal }) {
  const s = yeniSunucu();
  const okumalar = [];
  const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: "block", locale: "tr-TR" });
  // Realtime: sahte Phoenix sunucusu (vsn 2.0.0 dizi biçimi). Kanal SUBSCRIBED olur; sinyal yalnız `sinyal` açıksa gider.
  const soketler = [];
  await baglam.routeWebSocket(/realtime/, (ws) => {
    const kanallar = new Map();   // topic → { joinRef, ids }
    soketler.push({ ws, kanallar });
    ws.onMessage((m) => {
      if (typeof m !== "string") return;
      let dz; try { dz = JSON.parse(m); } catch { return; }
      const [joinRef, ref, topic, olay, yuk] = dz;
      if (olay === "phx_join") {
        const pc = (yuk?.config?.postgres_changes ?? []).map((f, i) => ({ ...f, id: 7000 + i }));
        kanallar.set(topic, { joinRef, ids: pc.map((x) => x.id) });
        ws.send(JSON.stringify([joinRef, ref, topic, "phx_reply", { status: "ok", response: { postgres_changes: pc } }]));
      } else if (ref != null) ws.send(JSON.stringify([joinRef, ref, topic, "phx_reply", { status: "ok", response: {} }]));
    });
  });
  s.sinyal = () => {
    if (!sinyal) return;
    for (const { ws, kanallar } of soketler) for (const [topic, k] of kanallar) {
      if (!topic.includes(`duello-${ID}`) || !k.ids.length) continue;
      try {
        ws.send(JSON.stringify([k.joinRef, null, topic, "postgres_changes", { ids: k.ids, data: { type: "UPDATE", schema: "public", table: "duello_sinyal",
          commit_timestamp: iso(Date.now()), columns: [], record: { duello_id: ID }, old_record: {}, errors: null } }]));
      } catch { /* kapalı */ }
    }
  };
  await baglam.addInitScript(OLCUM_KODU, { depo: DEPO, oturum: OTURUM, tanitim: duelloTanitimAnahtari() });
  const sayfa = await baglam.newPage();
  const konsol = [];
  sayfa.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 160)); });
  sayfa.on("pageerror", (e) => konsol.push(`pageerror: ${String(e).slice(0, 160)}`));
  await sayfa.route((u) => u.hostname === HOST, async (r) => {
    const u = new URL(r.request().url());
    try {
      if (u.pathname.startsWith("/auth/v1/")) return json(r, /\/user/.test(u.pathname) ? KULLANICI : OTURUM);
      if (u.pathname.startsWith("/rest/v1/rpc/")) {
        const fn = u.pathname.slice("/rest/v1/rpc/".length);
        const an = Date.now();
        switch (fn) {
          case "duello_durum": { const d = s.durum(an); okumalar.push({ an, faz: d.faz }); return json(r, d); }
          case "duello_giris": return json(r, { durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
          case "duello_baglanti": return json(r, { kopuk: false });
          case "profilim": return json(r, PROFIL);
          case "duello_kategori_sec": {
            const k = JSON.parse(r.request().postData() || "{}").p_kategori;
            s.ilerlet(an, "okuma");
            if (s.faz !== "kart" || an > s.fazBitis + SECIM_PAY_MS) return json(r, { message: "Bu kategori şu an seçilemez" }, 400);
            const ok = s.gonderilen ? s.kartUygula(an, null, k, false) : s.kartUygula(an, k, null, false);
            if (ok) s.sinyal();
            return json(r, null);
          }
          default: return json(r, null);
        }
      }
      if (u.pathname.startsWith("/rest/v1/")) return json(r, /vnd\.pgrst\.object/.test(r.request().headers().accept || "") ? null : []);
      if (u.pathname.startsWith("/storage/v1/")) return r.fulfill({ status: 404, body: "" });
      if (u.pathname.startsWith("/functions/v1/")) return json(r, {});
      canliIstek++; return r.abort();
    } catch { canliIstek++; return r.abort().catch(() => {}); }
  });
  await sayfa.route(/\.(mp3|ogg|wav|m4a)(\?|$)/, (r) => r.abort());

  const kayit = { senaryo: ad, secimSn, sinyal };
  const cron = setInterval(() => s.ilerlet(Date.now(), "cron"), CRON_MS);
  try {
    await sayfa.goto(`${ADRES}/duello/${ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sayfa.waitForSelector(".d4-kart", { timeout: 30000 });
    // Kart fazı sayfa hazır olunca başlar (tam 10 sn ekranda).
    s.kartAc(Date.now());
    s.sinyal();
    if (!sinyal) await sayfa.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));   // ilk kart durumunu okusun
    const tiklandi = new Set();
    const son = Date.now() + 60000;
    while (Date.now() < son) {
      const o = await sayfa.evaluate(() => window.__olcum);
      if (o.soru) break;
      if (secimSn != null && s.faz === "kart") {
        const adim = s.gonderilen ? 1 : 0;
        if (!tiklandi.has(adim) && Date.now() >= s.duyuruBitis + secimSn * 1000) {
          tiklandi.add(adim);
          // Adım 2'de rakibe giden kart pasif → ilk etkin kart
          await sayfa.locator(".d4-kart:not(:disabled)").first().click({ timeout: 4000 }).catch((e) => { kayit.tikHata = String(e.message).split("\n")[0]; });
        }
      }
      if (s.faz === "cevap" && !kayit.acilisFoto) {
        const ac = await sayfa.locator(".d4-acilis").count();
        if (ac) { kayit.acilisFoto = true; await sayfa.screenshot({ path: path.join(CIKTI, `madde8-${ad}-acilis.png`) }); }
      }
      await bekle(40);
    }
    await sayfa.screenshot({ path: path.join(CIKTI, `madde8-${ad}-soru.png`) });
    await bekle(2700);
    const o = await sayfa.evaluate(() => window.__olcum);
    const ac = s.olay.find((x) => x.olay === "soru_ac");
    if (!ac || !o.soru) throw new Error("soru açılmadı / görünmedi");
    const ilkCevapOkuma = okumalar.find((x) => x.faz === "cevap");
    kayit.olaylar = s.olay.filter((x) => x.an >= s.bas).map((x) => ({ ...x, an: x.an - s.bas }));
    kayit.sunucuSoruAc_ms = ac.an - s.bas;                   // kart fazı başından
    kayit.ilkCevapOkumasi_ms = ilkCevapOkuma ? ilkCevapOkuma.an - ac.an : null;   // soru_ac → istemcinin cevap fazını okuduğu an
    kayit.panelGorundu_ms = o.acilis ? o.acilis.t - ac.an : null;   // soru_ac → "kim neyi aldı" paneli
    kayit.soruDom_ms = o.soruDom ? o.soruDom.t - ac.an : null;
    kayit.soruGorundu_ms = o.soru.t - ac.an;                         // soru_ac → soru metni + şıklar görünür
    kayit.sayac = Number(o.soru.sayac);                              // o karede sayaçta yazan
    kayit.gercekKalan_ms = ac.faz_bitis - o.soru.t;                  // sunucu faz_bitis'e gerçek kalan
    kayit.oyuncuyaKalan_ms = ac.faz_bitis - o.soru.t;                // (bitis1 = faz_bitis; geç varış payı hariç)
    kayit.soruSuresindenYenen_ms = CEVAP_SN * 1000 - kayit.gercekKalan_ms;
    kayit.sayacIzi = o.iz.map((x) => ({ ms: x.t - o.soru.t, s: x.s }));
  } catch (e) {
    kayit.hata = String(e.message || e).split("\n")[0].slice(0, 200);
    await sayfa.screenshot({ path: path.join(CIKTI, `madde8-${ad}-HATA.png`) }).catch(() => {});
  } finally {
    clearInterval(cron);
    kayit.konsolHata = [...new Set(konsol)].filter((m) => !/Failed to load resource|net::|WebSocket/.test(m)).slice(0, 5);
    await baglam.close().catch(() => {});
  }
  return kayit;
}

const SENARYOLAR = {
  a: { secimSn: 1, sinyal: true },
  b: { secimSn: 8, sinyal: true },
  c: { secimSn: null, sinyal: true },
  d: { secimSn: null, sinyal: false },
};

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const sonuclar = [];
let cikis = 0;
try {
  for (const ad of YALNIZ) {
    const k = await senaryoKos(tarayici, ad, SENARYOLAR[ad]);
    sonuclar.push(k);
    console.log(`  ${ad}: ${k.hata ? "HATA " + k.hata : "tamam"}`);
  }
} catch (e) { console.error("Betik hatası:", e); cikis = 1; }
finally { await tarayici.close().catch(() => {}); }

fs.writeFileSync(path.join(CIKTI, "madde8-olcum.json"), JSON.stringify({ uretim: new Date().toISOString(), adres: ADRES, canliIstek,
  ayarlar: { KART_SN, DUYURU_MS, CEVAP_SN, PAYI_MS, SECIM_PAY_MS, CRON_MS }, senaryolar: sonuclar }, null, 1));
console.log("\nsen  soru_ac(kart başından)  ilk okuma  panel  soru görünür  sayaç  gerçek kalan  yenen");
for (const k of sonuclar) {
  if (k.hata) { console.log(`${k.senaryo}  HATA ${k.hata}`); continue; }
  console.log(`${k.senaryo}    ${String(k.sunucuSoruAc_ms).padStart(6)} ms             ${String(k.ilkCevapOkumasi_ms).padStart(5)}  ${String(k.panelGorundu_ms).padStart(5)}  ${String(k.soruGorundu_ms).padStart(8)} ms  ${String(k.sayac).padStart(4)}   ${String(k.gercekKalan_ms).padStart(7)} ms  ${k.soruSuresindenYenen_ms} ms`);
  if (k.konsolHata.length) console.log("    konsol:", k.konsolHata.join(" | "));
}
console.log(`canlı istek (kesilen): ${canliIstek}`);
process.exit(cikis || (canliIstek ? 1 : 0));
