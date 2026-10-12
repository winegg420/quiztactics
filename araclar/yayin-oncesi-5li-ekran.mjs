// Yayın öncesi 5'li paket — madde 2 (Görevler "Ödülü al" AL'ı örtüyor mu) + madde 5 (Grup "Hazır mısın?" boşluğu) ölçümü.
// TAM TAKLİT (11 Eki 2026): sahte JWT + /auth, /rest, /functions tarayıcıda taklit → canlı Supabase'e HİÇ istek gitmez.
// Kullanım:
//   npx vite --port 5187 --strictPort                       # ayrı kabukta
//   node araclar/yayin-oncesi-5li-ekran.mjs --etiket=once   # (ya da sonra) [--adres=http://localhost:5187]
// Çıktı: tasarim/yayin-oncesi-5li/<etiket>-<ekran>-<g>x<y>-<dil>.png + <etiket>.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5187");
const ETIKET = String(ARG.etiket || "olcum");
const CIKTI = path.resolve("tasarim/yayin-oncesi-5li");
fs.mkdirSync(CIKTI, { recursive: true });

const REF = (fs.readFileSync(".env", "utf8").match(/VITE_SUPABASE_URL=https:\/\/([a-z0-9]+)\./) || [])[1];
const U = (n) => `0c1a5100-0000-4000-8000-${String(n).padStart(12, "0")}`;
const BEN = U(1), GRUP_ID = U(2), MAC_ID = U(3), R1 = U(10), R2 = U(11), R3 = U(12);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: BEN, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 86400 })}.imza`;
const KULLANICI = { id: BEN, aud: "authenticated", role: "authenticated", email: "", is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
const OTURUM = { access_token: JWT, refresh_token: "taklit", token_type: "bearer", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, user: KULLANICI };
const durumDosya = { cookies: [], origins: [{ origin: new URL(ADRES).origin, localStorage: [{ name: `sb-${REF}-auth-token`, value: JSON.stringify(OTURUM) }] }] };
const iso = (ms = 0) => new Date(Date.now() + ms).toISOString();
const profilim = (dil) => ({ id: BEN, gorunen_ad: "Sen", takma_ad: "Sen", takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", sehir: "İstanbul", dil,
  coin: 120, elmas: 10, puan: 100, seviye: 5, xp: 0, gorunen_avatar: null, kurulum_tamam: true, toplam_mac: 20 });
const profil = (id, ad) => ({ id, gorunen_ad: ad, gorunen_avatar: null, gorunum: null, acik_bot: false });

// ---------- Görevler verisi: günlük üçü de alınabilir (AL düğmeleri listenin altına kadar iner) ----------
const G = (id, ad_tr, ad_en, zorluk, hedef, ilerleme, alindi = false) => ({ quest_id: id, ad_tr, ad_en, zorluk, sayac: "mac_oyna", hedef, parametre: {},
  ilerleme: Math.min(ilerleme, hedef), alindi, alinabilir: ilerleme >= hedef && !alindi, odul: { coin: 15, sp: 10 } });
const gorevVeri = (sekme) => {
  const gun = [G("g1", "3 maç oyna", "Play 3 matches", "kolay", 3, 3), G("g2", "2 maç kazan", "Win 2 matches", "orta", 2, 2),
    G("g3", "50 soruyu doğru cevapla", "Answer 50 questions correctly", "zor", 50, 50)];
  const hft = [G("h1", "Bu hafta 15 maç oyna", "Play 15 matches this week", null, 15, 15), G("h2", "Düello'da 3 galibiyet", "Win 3 Duel matches", null, 3, 3),
    G("h3", "100 soruyu doğru cevapla", "Answer 100 questions correctly", null, 100, 100)];
  void sekme;
  return { gunluk: { yenilenme_sn: 22320, gorevler: gun }, haftalik: { yenilenme_sn: 367200, gorevler: hft,
    sandik: { tamam: 0, hedef: 3, alindi: false, alinabilir: false, sp: 75, joker: { tur: "soru_degistir", adet: 1 } } }, alinabilir_sayi: 6 };
};

function grupSatiri(ekran) {
  const lobi = ekran === "grup-lobi";
  const k = (id, ad, davet) => ({ group_match_id: GRUP_ID, user_id: id, davet_durumu: davet, skor: 0, joined_at: iso(-90000), hazir: false, terk_at: null, profil: profil(id, ad) });
  return { id: GRUP_ID, durum: lobi ? "bekliyor" : "aktif", basladi: false, aktif_soru: 0, soru_ids: [U(21), U(22), U(23), U(24), U(25)],
    kategori: "cografya", duraklatildi_at: null, soru_baslangic: null,
    katilimcilar: [k(BEN, "Sen", lobi ? "bekliyor" : "kabul"), k(R1, "Deniz", "kabul"), k(R2, "Ayşe Yılmazoğlu", lobi ? "bekliyor" : "kabul"), k(R3, "Mert", "kabul")] };
}
const klasikSatiri = () => ({ id: MAC_ID, durum: "aktif", senkron: true, basladi: false, oyuncu1: BEN, oyuncu2: R1, jokersiz: true, dereceli: true,
  soru_ids: Array.from({ length: 10 }, (_, i) => U(30 + i)), aktif_soru: 0, oyuncu1_soru: 0, oyuncu2_soru: 0, oyuncu1_puan: 0, oyuncu2_puan: 0,
  created_at: iso(-60000), kategori: "karisik", oyuncu1_profil: profil(BEN, "Sen"), oyuncu2_profil: profil(R1, "Deniz") });

const json = (r, v, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(v) });
const taklitsiz = new Set();
async function yonlendir(r, b) {
  const req = r.request();
  const yol = req.url().split("/rest/v1/")[1].split("?")[0];
  const nesne = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
  const liste = (s) => json(r, nesne ? (s[0] ?? null) : s);
  try {
    if (yol.startsWith("rpc/")) {
      const fn = yol.slice(4);
      if (fn === "profilim") return json(r, profilim(b.dil));
      if (fn === "gorevlerim") return json(r, gorevVeri());
      if (fn === "sezon_ozetim") return json(r, { gorunur: false });
      if (fn === "grup_mac_nabiz") return json(r, { durum: "aktif", basladi: false, baslangic: null, sunucu_zamani: iso(0), duraklatildi: false, duraklama_sn: 0,
        ben_hazir: false, hazir_sayisi: 2, toplam_oyuncu: 4, bekleyenler: ["Sen", "Ayşe Yılmazoğlu"], lobi_saniye: 12 });
      if (fn === "mac_nabiz") return json(r, { durum: "aktif", basladi: false, sunucu_zamani: iso(0), ben_hazir: false, rakip_hazir: true, lobi_saniye: 6 });
      if (fn === "profil_ozetleri" || fn === "oyuncu_kartlari") return json(r, []);
      taklitsiz.add(fn);
      return json(r, null);
    }
    if (!["GET", "HEAD"].includes(req.method())) return json(r, nesne ? null : []);
    if (yol === "group_matches") return liste([grupSatiri(b.ekran)]);
    if (yol === "matches") return liste([klasikSatiri()]);
    if (yol === "profiles") return liste([profil(BEN, "Sen"), profil(R1, "Deniz")]);
    taklitsiz.add(`GET ${yol}`);
    return liste([]);
  } catch { try { await r.abort(); } catch { /* kapandı */ } }
}

// ---------- Ölçümler ----------
const OLC_GOREV = () => {
  const r = (e) => e.getBoundingClientRect();
  const toplu = document.querySelector(".gv-toplu");
  const govde = [...document.querySelectorAll("*")].find((e) => e.contains(document.querySelector(".gk-kart")) && e.scrollHeight > e.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(e).overflowY));
  const olc = () => {
    const tr = toplu ? r(toplu) : null;
    return [...document.querySelectorAll(".gk-kart .gk-al")].map((al) => {
      const a = r(al);
      const kesisim = tr ? Math.max(0, Math.min(a.bottom, tr.bottom) - Math.max(a.top, tr.top)) * Math.max(0, Math.min(a.right, tr.right) - Math.max(a.left, tr.left)) : 0;
      const gorunur = a.bottom > 0 && a.top < innerHeight;
      const x = a.left + a.width / 2, y = a.top + a.height / 2;
      const ust = gorunur && y < innerHeight ? document.elementFromPoint(x, y) : null;
      return { top: Math.round(a.top), bottom: Math.round(a.bottom), kesisimPx2: Math.round(kesisim), gorunur, tiklanir: ust ? al.contains(ust) : null };
    });
  };
  const ilk = olc();
  if (govde) govde.scrollTop = govde.scrollHeight; else scrollTo(0, document.documentElement.scrollHeight);
  const sonda = olc();
  const de = document.documentElement;
  return { vh: innerHeight, toplu: toplu ? { top: Math.round(r(toplu).top), bottom: Math.round(r(toplu).bottom) } : null, kaydirici: govde ? govde.className : "sayfa",
    ilk, sonda, yatayTasma: de.scrollWidth - de.clientWidth };
};
const OLC_HAZIR = () => {
  const kok = document.querySelector(".m1-hazir") || document.querySelector(".m1-grup-lobi");
  const de = document.documentElement;
  if (!kok) return null;
  const parcalar = [...kok.children].filter((e) => getComputedStyle(e).display !== "none" && e.getBoundingClientRect().height > 0).map((e) => {
    const b = e.getBoundingClientRect();
    return { sinif: (e.className || e.tagName).toString().split(" ").slice(0, 2).join(" "), top: Math.round(b.top), bottom: Math.round(b.bottom) };
  });
  const bosluklar = parcalar.slice(1).map((p, i) => p.top - parcalar[i].bottom);
  const dug = kok.querySelector(":scope > .m1-dugmeler");
  return { vh: innerHeight, parcalar, bosluklar, enBuyukBosluk: Math.max(0, ...bosluklar), dugmeAlt: dug ? Math.round(innerHeight - dug.getBoundingClientRect().bottom) : null,
    dikeyKaydirma: de.scrollHeight - de.clientHeight, yatayTasma: de.scrollWidth - de.clientWidth,
    fixed: [...kok.querySelectorAll("*")].filter((e) => getComputedStyle(e).position === "fixed").length };
};

const DURUMLAR_TUM = [
  ["gorevler", [360, 640], "tr"], ["gorevler", [360, 780], "tr"], ["gorevler", [390, 844], "tr"], ["gorevler", [360, 780], "en"],
  ["grup-hazir", [390, 844], "tr"], ["grup-hazir", [360, 780], "en"],
  ["grup-lobi", [390, 844], "tr"], ["grup-lobi", [360, 780], "en"],
  ["klasik-hazir", [390, 844], "tr"], ["klasik-hazir", [360, 780], "en"],
];
const DURUMLAR = ARG.yalniz ? DURUMLAR_TUM.filter(([e]) => e.startsWith(ARG.yalniz)) : DURUMLAR_TUM;
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({ storageState: durumDosya, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: "block" });
const sonuc = [];
try {
  for (const [ekran, [g, h], dil] of DURUMLAR) {
    const sayfa = await baglam.newPage();
    const b = { ekran, dil }; const konsol = [];
    sayfa.on("pageerror", (e) => konsol.push(String(e).slice(0, 140)));
    await sayfa.setViewportSize({ width: g, height: h });
    await sayfa.addInitScript((d) => { try { localStorage.setItem("bildim_dil", d); localStorage.setItem("bildim_tanitim", "1"); } catch { /* yok */ } }, dil);
    await sayfa.route(/\/rest\/v1\//, (r) => yonlendir(r, b));
    await sayfa.route(/\/auth\/v1\//, (r) => json(r, /\/user/.test(r.request().url()) ? KULLANICI : OTURUM));
    await sayfa.route(/\/functions\/v1\//, (r) => json(r, {}));
    await sayfa.route(/\/realtime\/|\.(mp3|ogg|wav|m4a)(\?|$)/, (r) => r.abort());
    const kayit = { ekran, boyut: `${g}x${h}`, dil };
    try {
      const yol = { gorevler: "/gorevler", "grup-hazir": `/grup-mac/${GRUP_ID}`, "grup-lobi": `/grup-mac/${GRUP_ID}`, "klasik-hazir": `/mac/${MAC_ID}` }[ekran];
      await sayfa.goto(ADRES + yol, { waitUntil: "domcontentloaded" });
      const bekle = { gorevler: ".gk-kart .gk-al", "grup-hazir": ".m1-hazir .m1-grup-liste", "grup-lobi": ".m1-grup-lobi .m1-grup-liste", "klasik-hazir": ".m1-hazir" }[ekran];
      await sayfa.waitForSelector(bekle, { timeout: 30000 });
      await sayfa.waitForTimeout(1500);
      const ad = path.join(CIKTI, `${ETIKET}-${ekran}-${g}x${h}-${dil}.png`);
      if (ekran === "gorevler") {
        await sayfa.screenshot({ path: ad });
        kayit.olcum = await sayfa.evaluate(OLC_GOREV);
        await sayfa.waitForTimeout(300);
        await sayfa.screenshot({ path: ad.replace(/\.png$/, "-sonda.png") });
      } else {
        kayit.olcum = await sayfa.evaluate(OLC_HAZIR);
        await sayfa.screenshot({ path: ad });
      }
    } catch (e) {
      kayit.hata = String(e.message || e).split("\n")[0].slice(0, 160);
      await sayfa.screenshot({ path: path.join(CIKTI, `${ETIKET}-${ekran}-${g}x${h}-${dil}-HATA.png`) }).catch(() => {});
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
fs.writeFileSync(path.join(CIKTI, `${ETIKET}.json`), JSON.stringify({ uretim: iso(0), taklitsiz: [...taklitsiz], sonuc }, null, 1));
console.log("taklitsiz:", [...taklitsiz].join(", ") || "-");
