// Klasik · Saf Bilgi · Grup · Turnuva soru ekranı turu (11 Eki 2026) — TAKLİT VERİYLE ölçüm + ekran görüntüsü.
// CANLIYA YAZMAZ: maç/cevap/joker/nabız RPC'leri tarayıcıda (page.route) taklit edilir; PATCH/DELETE/tabloya POST ve
// taklidi olmayan her RPC kesilir (sahte boş yanıt). Yalnız oturum yenileme (auth) + tek seferlik `profilim` ve
// `oyun_ayarlari` okuması gerçek gider (ikisi de betik belleğinde önbelleğe alınır). Realtime kapalı.
// Tek tarayıcı bağlamı, sayfalar SIRAYLA: oturum yenilemesi bir kez olur (token dönüşümü oturumu bozmasın).
//
// Her mod × boyut × dil için bir sayfa; üç an aynı sayfada:
//   (a) soru açık · (b) ilk şıka dokunuldu (cevap yanıtı ~1,5 sn geciktirilir → "seçili" yakalanır) · (c) sonuç
// Modlar: klasik · saf (Saf Bilgi: mac.jokersiz) · uzun (Klasik + ~260 karakter soru/~40 karakter şık) · grup · turnuva
//
// Kullanım:
//   npx vite --port 5187 --strictPort            # ayrı kabukta (yalnız 5173/5187/5188 Supabase CORS'ta izinli)
//   node araclar/klasik-mac-ekran.mjs --adres=http://localhost:5187 [--yalniz=klasik,grup] [--dil=tr] [--boyut=390x844]
//        [--oturum=.arayuz-denetim-oturum.json]
// Oturum: --oturum, yoksa .arayuz-denetim-oturum.json, o da yoksa en yeni .arayuz-denetim-oturum-*.json.
// --taklit-oturum (ya da hiç oturum dosyası yoksa): sahte JWT + taklit profil/ayar — canlıya HİÇ istek gitmez (14 Eki 2026).
// Çıktı: tasarim/klasik-mac-turu/<mod>-<an>-<g>x<y>-<dil>.png (an: acik · secili · sonuc) + olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const GRUP_KISI = Number(ARG["grup-kisi"]) || 4;   // --grup-kisi=3: grup şeridi 3 oyunculu ölçüm
const ADRES = String(ARG.adres || "http://localhost:5187");
const TUM_MODLAR = ["klasik", "saf", "uzun", "grup", "turnuva"];
const MODLAR = ARG.yalniz ? String(ARG.yalniz).split(",").filter((m) => TUM_MODLAR.includes(m)) : TUM_MODLAR;
const DILLER = ARG.dil ? [String(ARG.dil)] : ["tr", "en"];
const BOYUTLAR = ARG.boyut ? [String(ARG.boyut).split("x").map(Number)] : [[390, 844], [360, 780]];
const CIKTI = path.resolve("tasarim/klasik-mac-turu");
fs.mkdirSync(CIKTI, { recursive: true });

const REF = "etezccrifaetzrgfvawl";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const TAKLIT_BEN = "0c1a5100-0000-4000-8000-0000000000aa";
const TAKLIT_JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: TAKLIT_BEN, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 36000, is_anonymous: true })}.sahte`;
const TAKLIT_KULLANICI = { id: TAKLIT_BEN, aud: "authenticated", role: "authenticated", email: "", phone: "", is_anonymous: true,
  app_metadata: { provider: "anonymous", providers: [] }, user_metadata: {}, created_at: "2026-10-01T10:00:00Z" };
const TAKLIT_OTURUM = { access_token: TAKLIT_JWT, token_type: "bearer", expires_in: 36000, expires_at: Math.floor(Date.now() / 1000) + 36000,
  refresh_token: "sahte", user: TAKLIT_KULLANICI };
const TAKLIT_PROFIL = { id: TAKLIT_BEN, xp: 1240, dil: "tr", lig: "gumus", coin: 1480, puan: 320, seri: 3, ulke: "TR", elmas: 40, level: 7, askida: false,
  is_bot: false, gorunum: null, acik_bot: false, level_xp: 140, seri_gun: 3, takma_ad: "Deniz", username: "oyuncu_taklit", lig_gizli: false,
  avatar_url: "/avatars/pro/tilki-k04.svg", gorunen_avatar: "/avatars/pro/tilki-k04.svg", gorunen_ad: "Deniz", created_at: "2026-10-01T10:00:00Z",
  davet_kodu: "QT7K2M", toplam_mac: 42, arac_hesabi: true, hile_yetkisi: false, mesaj_kapali: false, avatar_onayli: true, rahatsiz_etme: false,
  dereceli_tercih: true, takma_ad_secildi: true, vitrin_rozetleri: [], kosullar_kabul_at: "2026-10-01T10:00:00Z", level_gereken: 400 };
const TAKLIT = Boolean(ARG["taklit-oturum"]);
function oturumDosyasi() {
  if (TAKLIT) return null;
  if (ARG.oturum) return path.resolve(String(ARG.oturum));
  const varsayilan = path.resolve(".arayuz-denetim-oturum.json");
  if (fs.existsSync(varsayilan)) return varsayilan;
  const adaylar = fs.readdirSync(".").filter((f) => /^\.arayuz-denetim-oturum-.+\.json$/.test(f))
    .map((f) => ({ f, t: fs.statSync(f).mtimeMs })).sort((a, b) => b.t - a.t);
  if (!adaylar.length) { console.error("Oturum dosyası yok (.arayuz-denetim-oturum*.json) — taklit oturumla devam (--taklit-oturum)."); return null; }
  return path.resolve(adaylar[0].f);
}
const OTURUM = oturumDosyasi();
const TAKLIT_MOD = !OTURUM;
const kok = new URL(ADRES).origin;
const durumDosya = TAKLIT_MOD
  ? { cookies: [], origins: [{ origin: kok, localStorage: [{ name: `sb-${REF}-auth-token`, value: JSON.stringify(TAKLIT_OTURUM) }] }] }
  : JSON.parse(fs.readFileSync(OTURUM, "utf8"));
durumDosya.origins = (durumDosya.origins || []).slice(0, 1).map((o) => ({ ...o, origin: kok }));
const oturumKullanici = (() => {
  try {
    const kayit = durumDosya.origins[0].localStorage.find((x) => /^sb-.*-auth-token$/.test(x.name));
    return JSON.parse(kayit.value)?.user?.id ?? null;
  } catch { return null; }
})();

// ---------------------------------------------------------------- taklit veri
const U = (n) => `0c1a5100-0000-4000-8000-${String(n).padStart(12, "0")}`;
const MAC_ID = U(1), GRUP_ID = U(2), TURNUVA_ID = U(3), RAKIP = U(10), RAKIP2 = U(11), RAKIP3 = U(12);
const SORU_IDLERI = [U(21), U(22), U(23), U(24), U(25)];
const SORULAR = {
  normal: { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"] },
  // ~260 karakter soru, ~40 karakter şıklar (soruUzunlukSinifi: s > 170 → m1-soru--cok-uzun)
  uzun: {
    soru: "Osmanlı İmparatorluğu'nun son dönemlerinde başlayan ve Cumhuriyet'in ilk yıllarında da süren köklü yenilik hareketleri içinde, alfabenin Latin harflerine çevrilmesini ve bu değişikliğin halka öğretilmesini sağlayan kurumun adı aşağıdakilerden hangisidir?",
    secenekler: ["Millet Mektepleri ve Dil Encümeni heyeti", "Türk Tarih Kurumu ve Halkevleri birliği", "Maarif Vekâleti ile Darülfünun kurulu", "Türk Dil Kurumu ve Millet Mektepleri"],
  },
};
const iso = (ms = 0) => new Date(Date.now() + ms).toISOString();
const profil = (id, ad, bot = false) => ({ id, gorunen_ad: ad, gorunen_avatar: null, gorunum: null, acik_bot: bot });

function macSatiri(ben, jokersiz) {
  return { id: MAC_ID, durum: "aktif", senkron: true, basladi: true, aktif_soru: 0, soru_ids: SORU_IDLERI, oyuncu1: ben, oyuncu2: RAKIP,
    oyuncu1_skor: 0, oyuncu2_skor: 0, oyuncu1_soru: 0, oyuncu2_soru: 0, jokersiz, dereceli: false, kategori: "cografya", kabul_at: iso(-60000),
    created_at: iso(-90000), joker_surum: 0, kazanan: null, terk_eden: null, baglanmayan: null, duraklatildi_at: null,
    p1: profil(ben, "Sen"), p2: profil(RAKIP, "Bot Deniz", true) };
}
function grupSatiri(ben) {
  const k = (id, ad, skor) => ({ group_match_id: GRUP_ID, user_id: id, davet_durumu: "kabul", skor, joined_at: iso(-90000), hazir: true, terk_at: null, profil: profil(id, ad) });
  return { id: GRUP_ID, durum: "aktif", basladi: true, aktif_soru: 0, soru_ids: SORU_IDLERI, kategori: "cografya", duraklatildi_at: null, soru_baslangic: iso(-300),
    katilimcilar: [k(ben, "Sen", 0), k(RAKIP, "Deniz", 0), k(RAKIP2, "Ayşe", 0), k(RAKIP3, "Mert", 0)].slice(0, GRUP_KISI) };
}
const turnuvaSatiri = () => ({ id: TURNUVA_ID, durum: "aktif", aktif_soru: 0, soru_ids: SORU_IDLERI, tarih: new Date().toISOString().slice(0, 10), saat: "20:00",
  bitis: null, kazanan: null, baslangic: iso(-60000) });
function turnuvaOyunculari(ben) {
  const o = (id, ad, dogru) => ({ tournament_id: TURNUVA_ID, user_id: id, elendi: false, dogru_sayisi: dogru, joined_at: iso(-120000), profil: { gorunen_ad: ad, gorunen_avatar: null, gorunum: null, puan: 100 } });
  return [o(ben, "Sen", 0), o(RAKIP, "Deniz", 0), o(RAKIP2, "Ayşe", 0), o(RAKIP3, "Mert", 0)].slice(0, GRUP_KISI);
}

// ---------------------------------------------------------------- sayfa içi ölçüm
const OLC = () => {
  const vh = window.innerHeight, vw = window.innerWidth;
  const de = document.documentElement;
  const dikd = (r) => ({ top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), height: +r.height.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1), width: +r.width.toFixed(1) });
  const gor = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none" && +c.opacity > 0; };
  // Atalardaki overflow kırpmasıyla kesişen görünür dikdörtgen (kırpılmışsa küçülür)
  const kirpik = (e) => {
    const r = e.getBoundingClientRect();
    let t = r.top, b = r.bottom, l = r.left, ri = r.right;
    for (let p = e.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const c = getComputedStyle(p);
      if (c.overflowX === "visible" && c.overflowY === "visible") continue;
      const pr = p.getBoundingClientRect();
      if (c.overflowY !== "visible") { t = Math.max(t, pr.top); b = Math.min(b, pr.bottom); }
      if (c.overflowX !== "visible") { l = Math.max(l, pr.left); ri = Math.min(ri, pr.right); }
    }
    return { top: t, bottom: b, left: l, right: ri, bos: b <= t || ri <= l };
  };
  const kayanAta = (e) => { for (let p = e.parentElement; p && p !== document.documentElement; p = p.parentElement) { const c = getComputedStyle(p); if (/(auto|scroll)/.test(c.overflowX) && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
  const ad = (e) => `${e.tagName.toLowerCase()}.${String(e.className).split(/\s+/).filter(Boolean).slice(0, 2).join(".")}`;
  const q = (s) => document.querySelector(s);
  const kart = q(".m1-soru .qt-soru-kart") || q(".qt-soru-kart");
  const siklar = [...document.querySelectorAll(".m1-soru .qt-sik")];
  const sonucYuva = q(".m1-sonuc-yuva"), jokerYuva = q(".m1-joker-yuva"), alt = q(".m1-alt"), soru = q(".m1-soru"), metin = q(".qt-soru-metin");
  const harf = q(".m1-soru .qt-sik-harf");
  const altDugmeler = alt ? [...alt.querySelectorAll("button, a[href], [role=button]")].filter(gor).map((e) => +e.getBoundingClientRect().top.toFixed(1)) : [];
  const altTek = altDugmeler.length ? Math.max(...altDugmeler) - Math.min(...altDugmeler) < 4 : null;

  // Ekrana sığma: önemli kutular + görünür düğmeler
  const onemli = [["soru-kart", kart], ["sonuc-yuva", sonucYuva], ["joker-yuva", jokerYuva], ["alt", alt],
    ...siklar.map((e, i) => [`sik${i + 1}`, e])].filter(([, e]) => e);
  const dugmeler = [...document.querySelectorAll("#root button, #root a[href], #root [role=button]")].filter(gor)
    .filter((e) => !e.closest("[inert]") || true);
  const tumu = [...onemli.map(([a, e]) => [a, e]), ...dugmeler.map((e) => [ad(e), e])];
  let enAlt = 0, enAltAd = "";
  const disari = [];
  for (const [a, e] of tumu) {
    const r = e.getBoundingClientRect();
    const k = kirpik(e);
    if (r.bottom > enAlt) { enAlt = r.bottom; enAltAd = a; }
    if (r.bottom > vh + 0.5) disari.push(`${a} alt=${r.bottom.toFixed(0)}>${vh}`);
    else if (!k.bos && (k.bottom < r.bottom - 1 || k.top > r.top + 1) && r.height > 0) disari.push(`${a} kırpık ${(r.height - (k.bottom - k.top)).toFixed(0)}px`);
    // 16 Eki 2026: yatay kayan şeritteki (overflow-x auto/scroll) görünmeyen öğe kaydırınca görünür — kırpık değil, ayrı yazılır
    else if (k.bos && kayanAta(e)) disari.push(`${a}[${(e.textContent || "").trim().slice(0, 12)}] kaydırmalı şeritte (ekran dışı)`);
    else if (k.bos) disari.push(`${a}[${(e.textContent || "").trim().slice(0, 12)}] tümüyle kırpık`);
  }
  // Üst üste binme: görünür düğmeler (çocuk-ebeveyn hariç), kırpılmış dikdörtgenle
  const kut = dugmeler.map((e) => ({ e, k: kirpik(e) })).filter((x) => !x.k.bos);
  const binen = [];
  for (let i = 0; i < kut.length; i++) for (let j = i + 1; j < kut.length; j++) {
    const A = kut[i], B = kut[j];
    if (A.e.contains(B.e) || B.e.contains(A.e)) continue;
    const w = Math.min(A.k.right, B.k.right) - Math.max(A.k.left, B.k.left);
    const h = Math.min(A.k.bottom, B.k.bottom) - Math.max(A.k.top, B.k.top);
    if (w > 1 && h > 1) binen.push(`${ad(A.e)} × ${ad(B.e)} (${w.toFixed(0)}×${h.toFixed(0)})`);
  }
  return {
    vw, vh,
    kart: kart ? dikd(kart.getBoundingClientRect()) : null,
    siklar: siklar.map((e) => dikd(e.getBoundingClientRect())),
    yuvalar: [...document.querySelectorAll(".m1-soru .qt-sikler > *")].map((e) => e.className + ":" + Math.round(e.getBoundingClientRect().top) + "/" + Math.round(e.getBoundingClientRect().height)),
    sikFont: siklar[0] ? parseFloat(getComputedStyle(siklar[0]).fontSize) : null,
    harfGenislik: harf ? +harf.getBoundingClientRect().width.toFixed(1) : null,
    sonucYuva: sonucYuva ? { top: +sonucYuva.getBoundingClientRect().top.toFixed(1), height: +sonucYuva.getBoundingClientRect().height.toFixed(1) } : null,
    jokerYuva: jokerYuva ? { top: +jokerYuva.getBoundingClientRect().top.toFixed(1), bottom: +jokerYuva.getBoundingClientRect().bottom.toFixed(1) } : null,
    alt: alt ? { top: +alt.getBoundingClientRect().top.toFixed(1), bottom: +alt.getBoundingClientRect().bottom.toFixed(1), dugmeTop: altDugmeler, tekSatir: altTek } : null,
    soruKaydirma: soru ? { scrollHeight: soru.scrollHeight, clientHeight: soru.clientHeight, scrollTop: soru.scrollTop, tasar: soru.scrollHeight > soru.clientHeight + 1 } : null,
    soruSinif: soru ? [...soru.classList].filter((c) => /^m1-soru--/.test(c)).join(" ") : null,
    metin: metin ? { tasar: metin.scrollHeight > metin.clientHeight + 1, dataTasar: metin.hasAttribute("data-tasar"), scrollHeight: metin.scrollHeight, clientHeight: metin.clientHeight } : null,
    yatayTasma: de.scrollWidth - de.clientWidth,
    // 16 Eki 2026: dikey bütçe — maç kökünün ve soru bölümünün çocuk yükseklikleri (sığmayan yerin sorumlusu)
    butce: [".m1-mac", ".m1-soru"].map((s) => { const k = q(s); return k ? `${s}: ` + [...k.children].filter(gor).map((c) => `${String(c.className?.baseVal ?? c.className).split(" ")[0] || c.tagName}=${Math.round(c.getBoundingClientRect().height)}`).join(" ") : null; }).filter(Boolean),
    enAlt: +enAlt.toFixed(1), enAltOge: enAltAd, sigiyor: disari.filter((x) => !/kaydırmalı şeritte/.test(x)).length === 0 && enAlt <= vh + 0.5, disari,
    binen,
    jokerVar: Boolean(document.querySelector(".m1-joker-yuva .qt-skill")),
    tepkiVar: Boolean(document.querySelector(".m1-alt .m1-tepki, .m1-alt .qt-ikon-dugme")),
    sikDurumlari: siklar.map((e) => (String(e.className).match(/qt-sik--([a-z]+)/) || [])[1] || "?"),
    bant: (q(".m1-sonuc-yuva")?.innerText || "").trim().slice(0, 60),
    // 14 Eki: "… bekleniyor" satırı, sonuç bandı ve joker hak satırı birbirine binmemeli
    bekleme: (() => {
      const bk = q(".m1-bekleme"); if (!bk || !gor(bk)) return null;
      const r = bk.getBoundingClientRect();
      const kes = (e) => { if (!e || !gor(e)) return false; const k = e.getBoundingClientRect();
        return Math.min(r.right, k.right) - Math.max(r.left, k.left) > 1 && Math.min(r.bottom, k.bottom) - Math.max(r.top, k.top) > 1; };
      const bandMetin = [...document.querySelectorAll(".m1-sonuc-yuva *")].filter((e) => e.children.length === 0 && (e.textContent || "").trim() && gor(e));
      return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), bantaBiniyor: bandMetin.some(kes), hakSatiriBiniyor: kes(q(".m1-skill-hak")),
        jokerBiniyor: [...document.querySelectorAll(".m1-joker-yuva .qt-skill")].some(kes), sikBiniyor: siklar.some(kes) };
    })(),
  };
};

// ---------------------------------------------------------------- taklit yönlendirme
const json = (r, veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
const kesilenler = new Set();
const taklitsizRpc = new Set();
const gecenOkuma = new Set();
const onbellek = { ayarlar: null, profilim: null };
let ben = oturumKullanici;

async function rpcTaklidi(fn, req, b) {
  const soruNesne = b.soru;
  const soruSatiri = (extra = {}) => ({ question_id: U(900 + b.mod.length), soru: soruNesne.soru, secenekler: soruNesne.secenekler, soru_index: 0,
    baslangic: iso(-300), sunucu_zamani: iso(0), ...extra });
  const nabiz = (ek = {}) => ({ durum: "aktif", basladi: true, baslangic: iso(-5000), sunucu_zamani: iso(0), duraklatildi: false, duraklama_sn: 0,
    ben_hazir: true, rakip_hazir: true, lobi_saniye: 0, hazir_sayisi: 4, toplam_oyuncu: 4, bekleyenler: [], ...ek });
  switch (fn) {
    // --- maç durumu / soru / nabız
    case "mac_nabiz": case "grup_mac_nabiz": return nabiz();
    case "get_match_question": case "get_group_match_question": return [soruSatiri()];
    case "get_tournament_question": return [soruSatiri({ altin: false })];
    case "soru_kategorisi": return "cografya";
    case "cift_mac_durumu": return [{ carpan: 1, sira: 1 }];
    // --- cevap (gecikmeli: "seçili" anı yakalansın)
    case "submit_match_answer": case "submit_group_match_answer": case "submit_tournament_answer":
      await new Promise((x) => setTimeout(x, 1500));
      return [{ dogru: false, dogru_cevap: 1, puan: 0, benim_skor: 0, rakip_skor: 1, tekrar_hakki: false }];
    // --- joker çubuğu
    case "envanterim": return [{ tur: "elli", adet: 2 }, { tur: "sure", adet: 1 }];
    case "joker_mac_durumu": return [{ sinir: null, kullanilan: 0, ucretsiz_elli_kaldi: true, kisaltildi: false, kilitli: false, soruda_kullanildi: false,
      kullanim_sayilari: {}, tur_basi_sinir: 1, sunucu_zamani: iso(0), sis_bitis: null }];
    case "joker_fiyatlari": return { elli: 10, sure: 20, soru_degistir: 30, zaman_baskisi: 25, sigorta: 15, cifte_puan: 15, ikinci_sans: 20 };
    case "coin_bakiyem": return [{ bakiye: 120 }];
    case "skill_setim": return null;
    default: return undefined;
  }
}

async function yonlendir(r, b) {
  const req = r.request();
  const url = req.url();
  const yontem = req.method();
  const yol = url.split("/rest/v1/")[1].split("?")[0];
  const nesneIstek = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
  const liste = (satirlar) => json(r, nesneIstek ? (satirlar[0] ?? null) : satirlar);
  try {
    if (!ben) { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; ben = JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { /* oturumsuz istek */ } }
    // ---- RPC
    if (yol.startsWith("rpc/")) {
      const fn = yol.slice(4);
      if (fn === "profilim" && TAKLIT_MOD) return json(r, { ...TAKLIT_PROFIL, dil: b.dil });
      if (fn === "profilim") {
        // Gerçek profil bir kez okunur; dil tarayıcıda taklit edilir (veritabanı değişmez)
        if (!onbellek.profilim) { const y = await r.fetch(); onbellek.profilim = await y.json(); }
        const kopya = JSON.parse(JSON.stringify(onbellek.profilim));
        const p = Array.isArray(kopya) ? kopya[0] : kopya;
        if (p && typeof p === "object") p.dil = b.dil;
        return json(r, kopya);
      }
      const v = await rpcTaklidi(fn, req, b);
      if (v !== undefined) return json(r, v);
      taklitsizRpc.add(fn);
      return json(r, null);
    }
    // ---- tablo yazmaları: kes
    if (yontem !== "GET" && yontem !== "HEAD") { kesilenler.add(`${yontem} ${yol}`); return json(r, nesneIstek ? null : []); }
    // ---- tablo okumaları
    switch (yol) {
      case "matches": return liste([macSatiri(ben, b.jokersiz)]);
      case "group_matches": return liste([grupSatiri(ben)]);
      case "tournaments": return liste([turnuvaSatiri()]);
      case "tournament_players": return liste(turnuvaOyunculari(ben));
      case "match_jokers": case "group_match_jokers": case "match_messages": case "group_match_messages": return liste([]);
      case "oyun_ayarlari": {
        if (TAKLIT_MOD) return json(r, []);   // taklit: varsayılan ayarlar
        if (!onbellek.ayarlar) { const y = await r.fetch(); onbellek.ayarlar = await y.json(); }
        gecenOkuma.add("oyun_ayarlari (önbellek)");
        return json(r, onbellek.ayarlar);
      }
      default:
        if (TAKLIT_MOD) return json(r, nesneIstek ? null : []);
        gecenOkuma.add(`GET ${yol}`);
        return r.continue();
    }
  } catch (e) {
    try { await r.abort(); } catch { /* sayfa kapandı */ }
  }
}

// ---------------------------------------------------------------- senaryo
const MOD_YOLU = { klasik: `/mac/${MAC_ID}`, saf: `/mac/${MAC_ID}`, uzun: `/mac/${MAC_ID}`, grup: `/grup-mac/${GRUP_ID}`, turnuva: "/turnuva" };
const maksFark = (a, b) => (a == null || b == null ? null : Math.abs(a - b));

function kayma(an) {
  // an: { a, b, c } ölçümleri → kart ve şıkların üst/alt farklarının mutlak en büyüğü (tüm ikililer)
  const cift = [["a", "b"], ["b", "c"], ["a", "c"]];
  let en = 0, nerede = "", sayiUyumsuz = false;
  for (const [x, y] of cift) {
    const A = an[x], B = an[y];
    if (!A?.kart || !B?.kart) continue;
    for (const k of ["top", "bottom"]) {
      const d = maksFark(A.kart[k], B.kart[k]);
      if (d > en) { en = d; nerede = `kart.${k} ${x}→${y}`; }
    }
    if (A.siklar.length !== B.siklar.length) { sayiUyumsuz = true; continue; }
    A.siklar.forEach((s, i) => ["top", "bottom"].forEach((k) => {
      const d = maksFark(s[k], B.siklar[i][k]);
      if (d > en) { en = d; nerede = `sik${i + 1}.${k} ${x}→${y}`; }
    }));
  }
  return { px: +en.toFixed(1), nerede, sayiUyumsuz };
}

const sonuclar = [];
async function sayfaCalistir(ctx, mod, [g, h], dil) {
  const etiket = `${mod} ${g}x${h} ${dil}`;
  const sayfa = await ctx.newPage();
  const bag = { mod, dil, jokersiz: mod === "saf", soru: mod === "uzun" ? SORULAR.uzun : SORULAR.normal };
  const konsol = [];
  sayfa.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 140)); });
  sayfa.on("pageerror", (e) => konsol.push(`pageerror: ${String(e).slice(0, 140)}`));
  await sayfa.setViewportSize({ width: g, height: h });
  await sayfa.addInitScript((d) => { try { localStorage.setItem("bildim_dil", d); localStorage.setItem("bildim_tanitim", "1"); } catch { /* depolama kapalı */ } }, dil);
  await sayfa.route(/\/rest\/v1\//, (r) => yonlendir(r, bag));
  await sayfa.route(/\/functions\/v1\//, (r) => json(r, {}));
  if (TAKLIT_MOD) await sayfa.route(/\/auth\/v1\//, (r) => { const u = r.request().url();
    return json(r, u.includes("/user") ? TAKLIT_KULLANICI : u.includes("/token") ? TAKLIT_OTURUM : {}); });
  await sayfa.route(/\/realtime\/|\.(mp3|ogg|wav|m4a)(\?|$)/, (r) => r.abort());
  const kayit = { mod, boyut: `${g}x${h}`, dil, not: [] };
  const ad = (an) => path.join(CIKTI, `${mod}-${an}-${g}x${h}-${dil}.png`);
  try {
    await sayfa.goto(ADRES + MOD_YOLU[mod], { waitUntil: "domcontentloaded" });
    const girisEkrani = sayfa.getByText(/Misafir olarak dene|Try as guest|Play as guest/i).first();
    const sonuc = await Promise.race([
      sayfa.waitForSelector(".m1-soru .qt-sik", { timeout: 30000 }).then(() => "soru"),
      girisEkrani.waitFor({ timeout: 30000 }).then(() => "giris"),
    ]);
    if (sonuc === "giris") throw new Error("OTURUM GEÇERSİZ: giriş ekranı açıldı (yenileme jetonu ölü). Yeni misafir hesap AÇILMAZ; önce node araclar/arayuz-denetim.mjs ile oturum dosyası yenilenmeli.");
    if (mod !== "saf") await sayfa.waitForSelector(".m1-joker-yuva .qt-skill", { timeout: 6000 }).catch(() => kayit.not.push("joker çubuğu 6 sn içinde gelmedi"));
    await sayfa.waitForTimeout(1300);   // giriş animasyonları otursun
    kayit.a = await sayfa.evaluate(OLC);
    await sayfa.screenshot({ path: ad("acik") });
    // 16 Eki 2026: dokunuştan sonuca kadar düzen kayması (CLS) — yalnız kullanıcı girdisinden bağımsız kaymalar sayılır
    await sayfa.evaluate(() => { try { window.__clsSonuc = 0; window.__clsListe = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__clsSonuc += e.value;
        window.__clsListe.push(`${Math.round(e.startTime)}ms ${e.value.toFixed(4)} ${(e.sources || []).map((x) => x.node?.className?.toString?.().split(" ")[0] || "?").join("+")}`); } })
        .observe({ type: "layout-shift" }); } catch { /* destek yok */ } });
    // (b) ilk şıka dokun
    try { await sayfa.locator(".m1-soru .qt-sik").first().click({ timeout: 4000 }); }
    catch (e) { kayit.not.push(`şık tıklanamadı: ${String(e.message).split("\n")[0].slice(0, 100)}`); await sayfa.evaluate(() => document.querySelector(".m1-soru .qt-sik")?.click()); }
    await sayfa.waitForTimeout(350);
    kayit.b = await sayfa.evaluate(OLC);
    await sayfa.screenshot({ path: ad("secili") });
    // (c) yanıt gelsin (1,5 sn) + geri bildirim yerleşsin
    await sayfa.waitForTimeout(1900);
    kayit.c = await sayfa.evaluate(OLC);
    await sayfa.screenshot({ path: ad("sonuc") });
    kayit.kayma = kayma(kayit);
    kayit.cls = await sayfa.evaluate(() => ({ toplam: Number((window.__clsSonuc ?? -1).toFixed(4)), liste: window.__clsListe ?? [] })).catch(() => null);
    if (!kayit.c.bant) kayit.not.push("sonuç bandı boş (yanıt gelmedi?)");
  } catch (e) {
    kayit.hata = String(e.message || e).split("\n")[0].slice(0, 160);
    try { await sayfa.screenshot({ path: ad("HATA") }); } catch { /* sayfa kapalı */ }
  }
  kayit.konsolHata = [...new Set(konsol)].slice(0, 6);
  await sayfa.close();
  console.log(`  ${etiket}: ${kayit.hata ? "HATA " + kayit.hata : `kayma ${kayit.kayma.px}px · sığıyor ${kayit.a?.sigiyor && kayit.b?.sigiyor && kayit.c?.sigiyor}`}`);
  return kayit;
}

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({ storageState: durumDosya, viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: "block" });
let cikis = 0;
try {
  for (const mod of MODLAR) for (const boyut of BOYUTLAR) for (const dil of DILLER) {
    sonuclar.push(await sayfaCalistir(baglam, mod, boyut, dil));
  }
} catch (e) {
  console.error("Betik hatası:", e);
  cikis = 1;
} finally {
  // Dönüşen oturum jetonunu kaydet (yoksa dosyadaki yenileme jetonu bir sonraki koşuda geçersiz olur)
  // YALNIZ geçerli jeton varsa yazılır: yenileme başarısızsa (jeton silinmiş) dosya boşaltılmaz.
  try {
    const son = await baglam.storageState();
    const jetonVar = son.origins?.some((o) => o.localStorage?.some((x) => /^sb-.*-auth-token$/.test(x.name)));
    if (jetonVar && OTURUM) fs.writeFileSync(OTURUM, JSON.stringify(son, null, 1));
  } catch { /* yazılamadı: bir sonraki koşu yeniden giriş ister */ }
  await baglam.close().catch(() => {});
  await tarayici.close().catch(() => {});
}

// ---------------------------------------------------------------- rapor
const raporYolu = path.join(CIKTI, "olcum.json");
let eski = [];
try { if (ARG.yalniz || ARG.dil || ARG.boyut) eski = JSON.parse(fs.readFileSync(raporYolu, "utf8")).sayfalar ?? []; } catch { /* ilk koşu */ }
const anahtar = (s) => `${s.mod}|${s.boyut}|${s.dil}`;
const birlesik = [...eski.filter((e) => !sonuclar.some((s) => anahtar(s) === anahtar(e))), ...sonuclar];
fs.writeFileSync(raporYolu, JSON.stringify({ uretim: iso(0), adres: ADRES, oturum: OTURUM ? path.basename(OTURUM) : "taklit",
  kesilenYazmalar: [...kesilenler], taklitsizRpc: [...taklitsizRpc], gecenOkumalar: [...gecenOkuma], sayfalar: birlesik }, null, 1));

console.log("\nmod      boyut    dil  kayma(px)  sığıyor  yatay  örtüşme  alt-tek-satır  soru-kayar  not");
for (const s of sonuclar) {
  if (s.hata) { console.log(`${s.mod.padEnd(8)} ${s.boyut.padEnd(8)} ${s.dil}   HATA: ${s.hata}`); continue; }
  const A = [s.a, s.b, s.c];
  const sig = A.every((x) => x.sigiyor);
  const yatay = Math.max(...A.map((x) => x.yatayTasma));
  const ort = [...new Set(A.flatMap((x) => x.binen))].length;
  const tek = A.every((x) => x.alt?.tekSatir !== false);
  const kay = A.some((x) => x.soruKaydirma?.tasar);
  console.log(`${s.mod.padEnd(8)} ${s.boyut.padEnd(8)} ${s.dil}   ${String(s.kayma.px).padEnd(9)}  ${String(sig).padEnd(7)}  ${String(yatay).padEnd(5)}  ${String(ort).padEnd(7)}  ${String(tek).padEnd(13)}  ${String(kay).padEnd(10)}  ${[...s.not, ...(sig ? [] : [...new Set(A.flatMap((x) => x.disari))].slice(0, 2))].join("; ")}${s.cls ? `  CLS=${s.cls.toplam}` : ""}`);
}
if (taklitsizRpc.size) console.log("\nTaklidi olmayan (null dönen) RPC'ler:", [...taklitsizRpc].join(", "));
if (kesilenler.size) console.log("Kesilen yazmalar:", [...kesilenler].join(", "));
if (gecenOkuma.size) console.log("Gerçek giden okumalar:", [...gecenOkuma].join(", "));
console.log(`\nÖlçüm: ${path.relative(".", raporYolu)}`);
process.exit(cikis);
