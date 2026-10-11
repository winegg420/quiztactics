// Grup lobisi · Hazır kapısı (grup) · Davet sayfası (başarılı / hata) — TAKLİT VERİYLE ekran görüntüsü + ölçüm (11 Eki 2026).
// CANLIYA YAZMAZ: grup maçı tablosu, nabız ve davet RPC'si tarayıcıda (page.route) taklit edilir; tablo yazmaları ve
// taklidi olmayan RPC'ler / okumalar boş döner. Oturum da taklit: Supabase'e hiçbir istek gitmez.
// Kullanım:
//   npx vite --port 5187 --strictPort            # ayrı kabukta
//   node araclar/grup-lobi-davet-ekran.mjs [--adres=http://localhost:5187]
// Çıktı: tasarim/grup-lobi-davet/<ekran>-<g>x<y>-<dil>.png + olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5187");
const CIKTI = path.resolve("tasarim/grup-lobi-davet");
fs.mkdirSync(CIKTI, { recursive: true });
const DURUMLAR = [[[390, 844], "tr"], [[360, 780], "en"]];
const EKRANLAR = ["lobi", "hazir", "davet-basarili", "davet-hata"];

// Oturum TAMAMEN taklit (11 Eki 2026): sahte JWT + sahte profil; auth uç noktası da taklit edilir → canlıya hiç istek gitmez.
const REF = (fs.readFileSync(".env", "utf8").match(/VITE_SUPABASE_URL=https:\/\/([a-z0-9]+)\./) || [])[1];
const SAHTE_ID = "0c1a5100-0000-4000-8000-000000000001";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: SAHTE_ID, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 86400 })}.imza`;
const SAHTE_KULLANICI = { id: SAHTE_ID, aud: "authenticated", role: "authenticated", email: "", is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
const OTURUM_DEGER = { access_token: JWT, refresh_token: "taklit", token_type: "bearer", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, user: SAHTE_KULLANICI };
const durumDosya = { cookies: [], origins: [{ origin: new URL(ADRES).origin, localStorage: [{ name: `sb-${REF}-auth-token`, value: JSON.stringify(OTURUM_DEGER) }] }] };
const sahteProfil = (dil) => ({ id: SAHTE_ID, gorunen_ad: "Sen", takma_ad: "Sen", takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", sehir: "İstanbul", dil, coin: 120, puan: 100, seviye: 5, xp: 0, gorunen_avatar: null, gorunum: null });

const U = (n) => `0c1a5100-0000-4000-8000-${String(n).padStart(12, "0")}`;
const GRUP_ID = U(2), R1 = U(10), R2 = U(11), R3 = U(12);
const iso = (ms = 0) => new Date(Date.now() + ms).toISOString();
const profil = (id, ad) => ({ id, gorunen_ad: ad, gorunen_avatar: null, gorunum: null, acik_bot: false });
let ben = SAHTE_ID;

function grupSatiri(ekran) {
  const lobi = ekran === "lobi";
  const k = (id, ad, davet) => ({ group_match_id: GRUP_ID, user_id: id, davet_durumu: davet, skor: 0, joined_at: iso(-90000), hazir: false, terk_at: null, profil: profil(id, ad) });
  return { id: GRUP_ID, durum: lobi ? "bekliyor" : "aktif", basladi: false, aktif_soru: 0, soru_ids: [U(21), U(22), U(23), U(24), U(25)],
    kategori: "cografya", duraklatildi_at: null, soru_baslangic: null,
    katilimcilar: [k(ben, "Sen", lobi ? "bekliyor" : "kabul"), k(R1, "Deniz", "kabul"), k(R2, "Ayşe Yılmazoğlu", lobi ? "bekliyor" : "kabul"), k(R3, "Mert", "kabul")] };
}
const json = (r, v, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(v) });
const kesilen = new Set(), taklitsiz = new Set();

async function yonlendir(r, b) {
  const req = r.request();
  const yol = req.url().split("/rest/v1/")[1].split("?")[0];
  const nesne = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
  const liste = (s) => json(r, nesne ? (s[0] ?? null) : s);
  try {
    // ben: sahte oturumun kimliği (SAHTE_ID)
    if (yol.startsWith("rpc/")) {
      const fn = yol.slice(4);
      if (fn === "profilim") {
        return json(r, sahteProfil(b.dil));
      }
      if (fn === "grup_mac_nabiz") return json(r, { durum: "aktif", basladi: false, baslangic: null, sunucu_zamani: iso(0), duraklatildi: false, duraklama_sn: 0,
        ben_hazir: false, hazir_sayisi: 2, toplam_oyuncu: 4, bekleyenler: ["Sen", "Ayşe Yılmazoğlu"], lobi_saniye: 12 });
      if (fn === "arkadas_davet_kodu_ile_ekle") {
        if (b.ekran === "davet-hata") return json(r, { code: "P0001", message: "Bu davet kodu bulunamadı.", details: null, hint: null }, 400);
        return json(r, [{ durum: "arkadas_oldu", gorunen_ad: "Deniz" }]);
      }
      if (["skill_setim", "envanterim", "coin_bakiyem"].includes(fn)) return json(r, null);
      taklitsiz.add(fn);
      return json(r, null);
    }
    if (!["GET", "HEAD"].includes(req.method())) { kesilen.add(`${req.method()} ${yol}`); return json(r, nesne ? null : []); }
    if (yol === "group_matches") return liste([grupSatiri(b.ekran)]);
    if (yol === "group_match_jokers" || yol === "group_match_messages") return liste([]);
    if (yol === "oyun_ayarlari") { return json(r, []); }
    taklitsiz.add(`GET ${yol}`);
    return liste([]);
  } catch { try { await r.abort(); } catch { /* kapandı */ } }
}

const OLC = () => {
  const vh = innerHeight, de = document.documentElement;
  const q = (s) => document.querySelector(s);
  const r = (e) => (e ? e.getBoundingClientRect() : null);
  const orta = (e) => (e ? Math.round(r(e).top + r(e).height / 2) : null);
  const satirlar = [...document.querySelectorAll(".m1-grup-liste .qt-satir")].map((s) => {
    const roz = s.querySelector(".m1-grup-durum");
    return { ad: s.querySelector(".qt-satir-baslik")?.innerText.replace(/\s+/g, " ").trim(), avatar: orta(s.querySelector(".m1-grup-bas")),
      baslik: orta(s.querySelector(".qt-satir-baslik")), rozet: orta(roz), rozetSag: roz ? Math.round(r(roz).right) : null, rozetGen: roz ? Math.round(r(roz).width) : null };
  });
  const dug = q(".m1-dugmeler"), kart = q(".dv-kart");
  const tumDugmeler = [...document.querySelectorAll(".m1-dugmeler .qt-dugme")].map((d) => ({ yazi: d.innerText.trim(), bg: getComputedStyle(d).backgroundColor }));
  return {
    vh, yatayTasma: de.scrollWidth - de.clientWidth, dikeyKaydirma: de.scrollHeight - de.clientHeight,
    satirlar, senListede: satirlar.some((s) => /\bsen\b|\byou\b/i.test(s.ad || "")),
    beklenenSatiri: /Beklenen:|Waiting for:/.test(document.body.innerText),
    dugmeler: dug ? { top: Math.round(r(dug).top), bottom: Math.round(r(dug).bottom), altBosluk: Math.round(vh - r(dug).bottom) } : null, tumDugmeler,
    davet: kart ? { yukseklik: Math.round(r(kart).height), baslik: q(".qt-bos-baslik")?.innerText, metin: q(".qt-bos-metin")?.innerText,
      ikonBg: getComputedStyle(q(".qt-bos-ikon")).backgroundColor, dugmeBg: q(".qt-bos-eylem .qt-dugme") ? getComputedStyle(q(".qt-bos-eylem .qt-dugme")).backgroundColor : null } : null,
  };
};

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({ storageState: durumDosya, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: "block" });
const sonuc = [];
try {
  for (const [[g, h], dil] of DURUMLAR) for (const ekran of EKRANLAR) {
    const sayfa = await baglam.newPage();
    const b = { ekran, dil }; const konsol = [];
    sayfa.on("pageerror", (e) => konsol.push(String(e).slice(0, 140)));
    await sayfa.setViewportSize({ width: g, height: h });
    await sayfa.addInitScript((d) => { try { localStorage.setItem("bildim_dil", d); localStorage.setItem("bildim_tanitim", "1"); } catch { /* yok */ } }, dil);
    await sayfa.route(/\/rest\/v1\//, (r) => yonlendir(r, b));
    await sayfa.route(/\/auth\/v1\//, (r) => json(r, /\/user/.test(r.request().url()) ? SAHTE_KULLANICI : OTURUM_DEGER));
    await sayfa.route(/\/functions\/v1\//, (r) => json(r, {}));
    await sayfa.route(/\/realtime\/|\.(mp3|ogg|wav|m4a)(\?|$)/, (r) => r.abort());
    const kayit = { ekran, boyut: `${g}x${h}`, dil };
    try {
      const yol = ekran.startsWith("davet") ? "/davet/ABCD1234" : `/grup-mac/${GRUP_ID}`;
      await sayfa.goto(ADRES + yol, { waitUntil: "domcontentloaded" });
      const bekle = { lobi: ".m1-grup-lobi .m1-grup-liste", hazir: ".m1-hazir .m1-grup-liste", "davet-basarili": ".dv-kart--basarili", "davet-hata": ".dv-kart--hata" }[ekran];
      await sayfa.waitForSelector(bekle, { timeout: 30000 });
      await sayfa.waitForTimeout(1200);
      kayit.olcum = await sayfa.evaluate(OLC);
      await sayfa.screenshot({ path: path.join(CIKTI, `${ekran}-${g}x${h}-${dil}.png`) });
    } catch (e) {
      kayit.hata = String(e.message || e).split("\n")[0].slice(0, 160);
      await sayfa.screenshot({ path: path.join(CIKTI, `${ekran}-${g}x${h}-${dil}-HATA.png`) }).catch(() => {});
    }
    kayit.konsol = konsol;
    await sayfa.close();
    sonuc.push(kayit);
    console.log(JSON.stringify(kayit));
  }
} finally {
  await baglam.close().catch(() => {});
  await tarayici.close().catch(() => {});
}
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify({ uretim: iso(0), kesilen: [...kesilen], taklitsiz: [...taklitsiz], sonuc }, null, 1));
console.log("kesilen:", [...kesilen].join(", ") || "-", "| taklitsiz:", [...taklitsiz].join(", ") || "-");
