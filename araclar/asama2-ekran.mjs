// AŞAMA 2 EKRAN TARAMASI (7 Eki 2026) — sunucuya yazmaz, misafir oturumuyla gezer.
// Ana navigasyondaki ekranların tam sayfa görüntüsünü alır ve ölçer: yatay taşma, konsol hatası,
// taşan/kesilen metin (ellipsis olmadan genişlikten taşan), 44 px altı dokunma hedefi, mor dolgu (izinli roller dışı).
// Kullanım: npm run dev (başka kabukta) → node araclar/asama2-ekran.mjs [--cikti=tasarim/asama2/sonra] [--sadece=meydan,arkadaslar]
//   [--genislik=390] [--azalt] [--dil=tr|en|hepsi]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5173";
const CIKTI = path.resolve(ARG.cikti || "tasarim/asama2/sonra");
const OTURUM = ARG.oturum || ".arayuz-denetim-oturum.json";   // EN hesabı: --oturum=.arayuz-denetim-oturum-en.json
const SAYFALAR = [
  ["meydan", "/meydan"], ["arkadaslar", "/arkadaslar"], ["joker", "/joker?sekme=joker"], ["dukkan-elmas", "/joker?sekme=elmas"],
  ["dukkan-cerceve", "/joker?sekme=cerceve"], ["dukkan-avatar", "/joker?sekme=avatar"], ["modlar", "/modlar"], ["lig", "/siralama"],
  ["profil", "/profil"], ["koleksiyon", "/profil?sekme=koleksiyon"], ["rozet", "/profil?sekme=rozet"], ["ayarlar", "/profil?sekme=ayarlar"],
  ["davet", "/profil?sekme=davet"], ["gorevler", "/gorevler"], ["sezon", "/sezon-yolu"], ["mesajlar", "/mesajlar"], ["turnuva", "/turnuva"],
];
const sadece = ARG.sadece ? String(ARG.sadece).split(",") : null;
const W = Number(ARG.genislik || 390), H = 844;
const DILLER = ARG.dil === "hepsi" ? ["tr", "en"] : [ARG.dil || "tr"];
const MOR_IZINLI = /qt-srozet|sy-|qt-kp-|qt-av-bolum|nadir|epik|lg-|lig|elli/;
fs.mkdirSync(CIKTI, { recursive: true });
const st = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const origin = st.origins.find((o) => o.origin === new URL(ADRES).origin) || st.origins[0];
// --dolu: Meydan Okumalar + Arkadaşlar + Turnuva lobisi için sahte satırlar (yalnız GET okumaları taklit edilir; sunucuya yazılmaz).
// Uzun ad, gelen davet, sıra sende / rakip oynuyor, gönderilen (bekliyor) davet, gelen/giden arkadaşlık isteği.
const benId = (() => {
  for (const x of origin.localStorage) if (/auth-token/.test(x.name)) { try { return JSON.parse(x.value).user.id; } catch { /* yok */ } }
  return null;
})();
const sahte = (n) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, "0")}`;
const KISI = [
  { id: sahte(1), gorunen_ad: "Çokuzunisimlioyuncu_Abdurrahmangazi1923", gorunen_avatar: null, gorunum: null, puan: 1840, acik_bot: false },
  { id: sahte(2), gorunen_ad: "Zeynep", gorunen_avatar: null, gorunum: null, puan: 960, acik_bot: false },
  { id: sahte(3), gorunen_ad: "Mehmet Can Yıldırımoğlu", gorunen_avatar: null, gorunum: null, puan: 1210, acik_bot: false },
  { id: sahte(4), gorunen_ad: "UzunİstekGönderenOyuncuAdıBurada", gorunen_avatar: null, gorunum: null, puan: 420, acik_bot: false },
  { id: sahte(5), gorunen_ad: "Ayşe", gorunen_avatar: null, gorunum: null, puan: 300, acik_bot: false },
];
async function doluTaklit(s) {
  const json = (r, veri) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(veri) });
  const simdi = new Date().toISOString();
  const mac = (o) => ({ soru_ids: Array(20).fill(0), oyuncu1_soru: 0, oyuncu2_soru: 0, oyuncu1_skor: 0, oyuncu2_skor: 0, kategori: null, dereceli: true, jokersiz: false, created_at: simdi, ...o });
  // Turnuva lobisi: 40 kişilik uzun liste (uzun adlar + 7. sırada "Sen"); yalnız lobi listesi sorgusu (profil gömülü).
  await s.route(/\/rest\/v1\/tournament_players\?.*profil/, async (r) => {
    if (r.request().method() !== "GET" || !benId) return r.fallback();
    const tid = (decodeURIComponent(r.request().url()).match(/tournament_id=eq\.([0-9a-f-]+)/) || [])[1] ?? null;
    const satir = (i) => {
      const k = i === 6 ? { id: benId, gorunen_ad: "ArayuzDenetim" } : { ...KISI[i % KISI.length], id: sahte(200 + i) };
      return { tournament_id: tid, user_id: k.id, puan: 0, joined_at: simdi, profil: { gorunen_ad: i === 6 ? k.gorunen_ad : `${k.gorunen_ad}${i}`, gorunen_avatar: null, gorunum: null, puan: 100 + i } };
    };
    return json(r, Array.from({ length: 40 }, (_, i) => satir(i)));
  });
  await s.route(/\/rest\/v1\/(matches|duello_davetleri|kasa_davetleri|friendships|profiles)\?/, async (r) => {
    if (r.request().method() !== "GET" || !benId) return r.fallback();
    const u = decodeURIComponent(r.request().url());
    const tablo = u.match(/rest\/v1\/(\w+)\?/)[1];
    if (tablo === "profiles") {
      if (!u.includes("aaaaaaaa-")) return r.fallback();
      return json(r, KISI.filter((k) => u.includes(k.id)));
    }
    if (tablo === "matches") {
      if (u.includes("durum=in.(bitti")) return json(r, []);
      if (u.includes("durum=eq.bekliyor")) return json(r, [{ id: sahte(91), oyuncu2: KISI[1].id }]);
      if (u.includes("durum=eq.aktif")) return json(r, [{ id: sahte(92), oyuncu1: benId, oyuncu2: KISI[2].id }]);
      return json(r, [
        mac({ id: sahte(81), durum: "bekliyor", oyuncu1: KISI[0].id, oyuncu2: benId, p1: KISI[0], p2: null }),
        mac({ id: sahte(82), durum: "aktif", oyuncu1: benId, oyuncu2: KISI[2].id, p1: null, p2: KISI[2], oyuncu1_soru: 4, oyuncu1_skor: 120, oyuncu2_skor: 90 }),
        mac({ id: sahte(83), durum: "aktif", oyuncu1: KISI[0].id, oyuncu2: benId, p1: KISI[0], p2: null, oyuncu2_soru: 20, oyuncu1_skor: 60, oyuncu2_skor: 200 }),
        mac({ id: sahte(84), durum: "bekliyor", oyuncu1: benId, oyuncu2: KISI[1].id, p1: null, p2: KISI[1], jokersiz: true }),
      ]);
    }
    if (tablo === "duello_davetleri") {
      if (u.includes("kuran=eq.")) return json(r, []);
      return json(r, [
        { id: sahte(71), kuran: KISI[2].id, rakip: benId, dereceli: true, durum: "bekliyor", duello_id: null, created_at: simdi },
        { id: sahte(72), kuran: benId, rakip: KISI[0].id, dereceli: false, durum: "bekliyor", duello_id: null, created_at: simdi },
      ]);
    }
    if (tablo === "kasa_davetleri") return json(r, []);
    // friendships
    const satirlar = [
      { id: sahte(61), requester: benId, addressee: KISI[0].id, durum: "arkadas", req: null, add: KISI[0] },
      { id: sahte(62), requester: KISI[1].id, addressee: benId, durum: "arkadas", req: KISI[1], add: null },
      { id: sahte(63), requester: benId, addressee: KISI[2].id, durum: "arkadas", req: null, add: KISI[2] },
      { id: sahte(64), requester: KISI[3].id, addressee: benId, durum: "bekliyor", req: KISI[3], add: null },
      { id: sahte(65), requester: benId, addressee: KISI[4].id, durum: "bekliyor", req: null, add: KISI[4] },
    ].map((x) => ({ ...x, created_at: simdi }));
    return json(r, u.includes("durum=eq.arkadas") ? satirlar.filter((x) => x.durum === "arkadas") : satirlar);
  });
}
const t = await chromium.launch({ channel: "chrome", headless: true });
let top = 0, hata = 0; const rapor = [];
for (const dil of DILLER) {
  const yerel = [...origin.localStorage.filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }];
  const b = await t.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: ARG.azalt ? "reduce" : "no-preference",
    storageState: { cookies: st.cookies, origins: [{ origin: new URL(ADRES).origin, localStorage: yerel }] } });
  for (const [ad, yol] of SAYFALAR) {
    if (sadece && !sadece.includes(ad)) continue;
    const s = await b.newPage(); const konsol = [];
    if (ARG.dolu) await doluTaklit(s);
    // Dil profilden gelir (profiles.dil önce gelir): EN taramada kendi profil satırı yalnız istemcide "en" yapılır.
    if (dil !== "tr") await s.route(/\/rest\/v1\/profiles\?/, async (r) => {
      if (r.request().url().includes("aaaaaaaa-")) return r.fallback();   // --dolu sahte kişileri
      try {
        const yanit = await r.fetch(); const govde = await yanit.text();
        let veri = JSON.parse(govde); const duzelt = (x) => (x && typeof x === "object" && "dil" in x ? { ...x, dil } : x);
        veri = Array.isArray(veri) ? veri.map(duzelt) : duzelt(veri);
        await r.fulfill({ response: yanit, body: JSON.stringify(veri) });
      } catch { await r.fallback(); }
    });
    s.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource|net::ERR|WebSocket/i.test(m.text())) konsol.push(m.text().slice(0, 120)); });
    s.on("pageerror", (e) => konsol.push("pageerror " + e.message.slice(0, 120)));
    try {
      await s.goto(ADRES + yol, { waitUntil: "domcontentloaded" });
      // yükleyici / iskelet / "Yükleniyor" kalkana dek bekle (en çok 15 sn)
      await s.waitForFunction(() => document.querySelector("nav, .tabbar") && !/Yükleniyor|Loading/.test(document.body.innerText) && !document.querySelector(".qt-iskelet, .qt-sayfa-yukleniyor"), null, { timeout: 15000 }).catch(() => {});
      await s.waitForTimeout(1200);
      const o = await s.evaluate((izin) => {
        const de = document.documentElement; const mor = [], tasan = [], kucuk = []; const re = new RegExp(izin);
        // yatay kaydırmalı / kırpan bir ata varsa sağa taşma sayfa taşması değildir
        const kaydirmaliAta = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { if (/auto|scroll|hidden|clip/.test(getComputedStyle(a).overflowX)) return true; } return false; };
        for (const e of document.querySelectorAll("main *, .qt-sayfa *, #root *")) {
          const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
          const cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.display === "none") continue;
          const cls = typeof e.className === "string" ? e.className.split(" ")[0] : e.tagName;
          // taşan metin: yalnız metin taşıyan yaprak öğe, ellipsis yoksa
          if (e.children.length === 0 && e.textContent.trim() && e.scrollWidth > e.clientWidth + 1 && cs.textOverflow !== "ellipsis" && cs.overflowX !== "visible") tasan.push(cls + ":" + e.textContent.trim().slice(0, 24));
          if (r.right > innerWidth + 1 && cs.position !== "fixed" && !kaydirmaliAta(e)) tasan.push("SAĞ " + (cls || e.tagName));
          if ((e.matches("button, a[href], [role=button], input, select") && !e.disabled) && (r.height < 44 && r.width < 44)) kucuk.push(cls + ":" + Math.round(r.width) + "x" + Math.round(r.height));
          const m = cs.backgroundColor.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?/); if (!m || (m[4] !== undefined && +m[4] < 0.6)) continue;
          const [R, G, B] = [m[1], m[2], m[3]].map((x) => x / 255); const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn; if (d < 0.15 || mx < 0.2) continue;
          let hh = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; hh = (hh * 60 + 360) % 360;
          const ata = e.closest("[class]")?.className || "";
          if (hh >= 262 && hh <= 320 && !re.test(String(e.className)) && !re.test(String(ata))) mor.push(cls);
        }
        return { tasma: de.scrollWidth - de.clientWidth, mor: [...new Set(mor)].slice(0, 6), tasan: [...new Set(tasan)].slice(0, 8), kucuk: [...new Set(kucuk)].slice(0, 8) };
      }, MOR_IZINLI.source);
      await s.screenshot({ path: path.join(CIKTI, `${ad}-${W}-${dil}${ARG.azalt ? "-azalt" : ""}.png`), fullPage: true });
      top++; rapor.push({ ad, dil, ...o, konsol });
      const kotu = o.tasma > 1 || konsol.length || o.mor.length || o.tasan.length;
      if (kotu) hata++;
      console.log(kotu ? "✗" : "✓", ad, dil, JSON.stringify({ ...o, konsol }));
    } catch (e) { hata++; console.log("✗ HATA", ad, e.message.slice(0, 100)); }
    await s.close();
  }
  await b.close();
}
await t.close();
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(rapor, null, 1));
console.log(`${top - hata}/${top} temiz`); process.exit(hata ? 1 : 0);
