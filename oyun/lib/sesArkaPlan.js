// Ses arka planı (Ajan H, 23 Eyl 2026) — TEMBEL modül: ana pakete girmez.
// `src/BildimApp.jsx` rota her değiştiğinde `import()` ile çağırır (`muzikRota`).
//
// 1) SEÇİMLER: Ida'nın /ses-secim seçimlerini sunucudan okur (`ses_secimleri_oyun`),
//    yerelde sürümle önbelleğe alır ve `ses.js`'e verir. Açılışta TEK çağrı; sürüm
//    aynıysa sunucu listeyi göndermez. Yeni dağıtım gerekmeden ses değişir.
// 2) MÜZİK: üç oda — menü (ana sayfa/menüler), maç (Klasik, Düello, Grup, Turnuva
//    maçı, Hatalarım çalışma), turnuva lobisi. Oda = o anın ÇALMA LİSTESİ (Ajan M,
//    24 Eyl 2026; migration 450): `listeler[an]` (2–4 aday) ya da tek seçim `secimler[an]`.
//    Seçim yoksa / "sessiz" ise müzik yok.
//    * Parça = TAM hâli, Supabase Storage `muzik` kovasından akış (muzikParcalari.js);
//      tam hâli yoksa/indirilemezse 30 sn önizleme (public/ses/adaylar/). Yalnız çalan
//      parça iner (sıradaki, geçiş anında); tarayıcı önbelleğe alır (1 yıl, ad sürümlü).
//    * Liste sırayla çalar, parça sonu 1,5 sn çapraz geçişle sonrakine karışır, liste bitince
//      başa döner. Odaya her girişte rastgele bir parçadan başlar. Tek parça = kendine
//      çapraz geçişle döngü.
//    * Ekran değişince 0,8 sn yumuşak geçiş (gain rampası; yalnız ses).
//    * Soru gelince seviye × muzik_kisik_oran; cevap/sonuçta geri açılır (ses.js kancası).
//    * Sekme gizlenince parçalar ve AudioContext durur, dönünce kaldığı yerden sürer.
//    * Tarayıcı kuralı: ilk dokunuştan önce başlamaz. Müzik kapalıyken hiçbir şey indirilmez.
//    * Çalma: <audio> → MediaElementSource → gain (akış; 3 dk'lık parçayı belleğe çözmez).
//      iOS: oynatıcı havuzu ilk dokunuşta kilitten çıkarılır (sessiz kısa çalış).

import { supabase } from "../../src/lib/supabase.js";
import { adayYolu, muzikAcikMi, muzikDinle, sesBaglami, sesMuzikKancasi, sesSecimi, sesSecimleriniAyarla, sesTaniAcik } from "./ses.js";
import { muzikTamSure, muzikTamUrl } from "./muzikParcalari.js";

const SECIM_ANAHTARI = "bildim_ses_secim";   // ses.js ile aynı anahtar
const GECIS_SN = 0.8;            // ekran değişince odalar arası geçiş
const PARCA_GECIS_SN = 1.5;      // parça sonu → sonraki parça çapraz geçişi
const HAVUZ_EN_COK = 4;          // aynı anda en çok bu kadar <audio> (oda geçişi + parça geçişi)
const SES_KLASORU = `${import.meta.env?.BASE_URL ?? "/"}ses/`;

let onbellek = null;   // {surum, secimler, listeler, muzik_seviye, muzik_kisik_oran}
try { onbellek = JSON.parse(localStorage.getItem(SECIM_ANAHTARI) || "null"); } catch { /* özel mod */ }
const ayar = () => ({
  seviye: Number(onbellek?.muzik_seviye) >= 0 ? Number(onbellek.muzik_seviye) : 0.35,
  kisik: Number(onbellek?.muzik_kisik_oran) >= 0 ? Number(onbellek.muzik_kisik_oran) : 0.3,
});

// ------------------------------------------------------------ seçimleri sunucudan al
let tazeleme = null;
/** Açılışta bir kez: önbellekteki sürümü yollar, değiştiyse yeni listeyi yazar. */
export function secimleriTazele() {
  if (tazeleme) return tazeleme;
  tazeleme = (async () => {
    try {
      const { data, error } = await supabase.rpc("ses_secimleri_oyun", { p_surum: onbellek?.surum ?? null });
      if (error) throw error;
      if (!data || typeof data !== "object") return;
      const yeni = { ...(onbellek ?? {}), ...data };
      if (!data.secimler) yeni.secimler = onbellek?.secimler ?? {};
      else if (!data.listeler) yeni.listeler = {};   // yeni liste geldi ama liste alanı yok → liste yok
      onbellek = yeni;
      sesSecimleriniAyarla(onbellek.secimler);
      try { localStorage.setItem(SECIM_ANAHTARI, JSON.stringify(onbellek)); } catch { /* özel mod */ }
      guncelle();
    } catch (e) {
      tazeleme = null;   // bir sonraki rota değişiminde yeniden dene
      console.warn("ses seçimleri okunamadı:", e?.message ?? e);
    }
  })();
  return tazeleme;
}

// ------------------------------------------------------------ müzik
/** Rota → oda anı (null → müzik yok). */
function donguSec(yol) {
  if (/^\/(ses-secim|mac-sonu-onizleme|tasarim|kozmetik-onizleme|preview|insan-prototip|gizlilik|kosullar)/.test(yol)) return null;
  if (/^\/(mac|grup-mac|duello|calisma)(\/|$)/.test(yol)) return "muzik_mac";
  if (/^\/turnuva(\/|$)/.test(yol)) return turnuvaMacta ? "muzik_mac" : "muzik_turnuva";
  return "muzik_menu";
}

let rota = "/";
let turnuvaMacta = false;
let kisik = false;
let gizli = typeof document !== "undefined" && document.hidden;
let dokunuldu = typeof navigator !== "undefined" && Boolean(navigator.userActivation?.hasBeenActive);
let ana = null;        // müzik ana kazancı (seviye · kısma · aç/kapa)
let iz = null;         // çalan oda {an, liste, anahtar, sira, calan, bitti, zaman}
const havuz = [];      // oynatıcılar {el, kazanc, bosta, id, gecti, bekleyen}
const sonBaslangic = {};   // an → son başlangıç sırası (aynı parçadan iki kez üst üste başlamasın)

/** Tanı (test bayrağı açıkken): window.__muzik = son durum, __muzikGecmis = hepsi, __muzikHavuz = oynatıcılar. */
function taniYaz(olay, ek) {
  try {
    if (!sesTaniAcik()) return;
    const { seviye, kisik: oran } = ayar();
    const el = iz?.calan?.el;
    window.__muzik = {
      olay, an: donguSec(rota), liste: iz?.liste ?? null, sira: iz?.sira ?? null, id: iz?.calan?.id ?? null,
      dosya: el?.src || null, calan: Boolean(el && !el.paused),
      acik: muzikAcikMi(), kisik, gizli, dokunuldu, baglam: dokunuldu ? (sesBaglami()?.state ?? null) : null,
      hedef: muzikAcikMi() ? seviye * (kisik ? oran : 1) : 0, t: Math.round(performance.now()), ...ek,
    };
    (window.__muzikGecmis ||= []).push(window.__muzik);
    window.__muzikHavuz = havuz;
  } catch { /* tanı kritik değil */ }
}

function baglam() {
  if (!dokunuldu) return null;
  const c = sesBaglami();
  if (!c) return null;
  if (!ana) {
    ana = c.createGain();
    ana.gain.value = 0;
    ana.connect(c.destination);
  }
  return c;
}

/** Odanın çalma listesi (aday id'leri); seçim yok / "mevcut" / "sessiz" → []. */
function odaListesi(an) {
  if (!an) return [];
  const l = onbellek?.listeler?.[an];
  if (Array.isArray(l) && l.length) return l.filter((x) => typeof x === "string" && x);
  const s = sesSecimi(an);
  if (!s || s === "mevcut" || s === "sessiz") return [];
  return [s];
}

const onizlemeUrl = (id) => `${SES_KLASORU}${adayYolu(id)}`;

// 10 ms sessiz WAV (8 kHz mono; iOS kilidi için: her <audio> bir kez dokunuşla çalınmalı).
const SESSIZ = `data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YaAAAAA${"A".repeat(213)}`;

/** Havuza bir oynatıcı ekler: <audio> → MediaElementSource → kazanc → ana. */
function oynaticiEkle(c) {
  const el = new Audio();
  el.crossOrigin = "anonymous";   // Storage CORS "*" — Web Audio'ya bağlanabilsin
  el.preload = "auto";
  el.setAttribute("playsinline", "");
  const kazanc = c.createGain();
  kazanc.gain.value = 0;
  c.createMediaElementSource(el).connect(kazanc).connect(ana);
  const o = { el, kazanc, bosta: true, id: null, gecti: false, bekleyen: false };
  havuz.push(o);
  return o;
}

/** İlk dokunuşta (kullanıcı hareketi içinde) havuzu kurar ve iOS kilidini açar. */
function havuzHazirla() {
  try {
    const c = baglam();
    if (!c) return;
    while (havuz.length < 3) oynaticiEkle(c);
    for (const o of havuz) {
      if (!o.bosta || o.el.dataset.kilit === "1") continue;
      o.el.src = SESSIZ;
      const p = o.el.play();
      o.el.dataset.kilit = "1";
      if (p && typeof p.then === "function") p.then(() => { if (o.bosta) o.el.pause(); }, () => { o.el.dataset.kilit = ""; });
    }
  } catch { /* müzik kritik değil */ }
}

/** Boştaki oynatıcı; yoksa yenisi (sınır dolduysa en eski sönen yeniden kullanılır). */
function oynaticiAl(c) {
  let o = havuz.find((x) => x.bosta);
  if (!o && havuz.length < HAVUZ_EN_COK) o = oynaticiEkle(c);
  if (!o) { o = havuz.find((x) => x !== iz?.calan) ?? havuz[0]; parcaBirak(o); }
  o.bosta = false;
  o.gecti = false;
  return o;
}

/** Oynatıcıyı sustur ve bırak (ağ bağlantısı da kapanır). */
function parcaBirak(o) {
  if (!o) return;
  clearTimeout(o.zaman);
  try { o.el.pause(); } catch { /* zaten durdu */ }
  try { o.el.removeAttribute("src"); o.el.load(); } catch { /* eski tarayıcı */ }
  o.el.onerror = null;
  o.el.onended = null;
  o.bosta = true;
  o.id = null;
}

/** Oynatıcıyı `sn` saniyede söndürüp bırakır. */
function parcaSondur(o, sn) {
  if (!o || o.bosta) return;
  const c = sesBaglami();
  try {
    const g = o.kazanc.gain;
    g.cancelScheduledValues(c.currentTime);
    g.setValueAtTime(g.value, c.currentTime);
    g.linearRampToValueAtTime(0, c.currentTime + sn);
  } catch { /* bağlam kapalı */ }
  clearTimeout(o.zaman);
  o.zaman = setTimeout(() => parcaBirak(o), sn * 1000 + 120);
}

/** Oynatıcıyı çal (sekme gizliyse bekler; görünür olunca sürer). */
function oynat(o) {
  if (gizli) { o.bekleyen = true; return; }
  o.bekleyen = false;
  try {
    const p = o.el.play();
    if (p && typeof p.catch === "function") p.catch((e) => { if (e?.name !== "AbortError") console.warn("müzik çalınamadı:", e?.message ?? e); });
  } catch (e) { console.warn("müzik çalınamadı:", e?.message ?? e); }
}

/** Odanın `i`'nci parçasını başlatır; `girisSn` içinde sesi açılır. */
function parcaBaslat(c, oda, i, girisSn) {
  if (oda.bitti) return;
  const id = oda.liste[i];
  const o = oynaticiAl(c);
  o.id = id;
  const tam = muzikTamUrl(id);
  o.el.onerror = () => {
    // Tam parça inemezse bu oturumda 30 sn önizlemeye düş (bir kez).
    if (oda.bitti || iz !== oda || o.id !== id) return;
    const yedek = onizlemeUrl(id);
    if (o.el.src && !o.el.src.endsWith(yedek)) { o.sure = null; console.warn("müzik tam parça inemedi, önizleme çalıyor:", id); o.el.src = yedek; oynat(o); }
  };
  o.el.onended = () => { if (!oda.bitti && iz === oda && oda.calan === o) sonrakine(c, oda); };
  o.el.src = tam ?? onizlemeUrl(id);
  o.sure = tam ? muzikTamSure(id) : null;   // gerçek süre (ADTS'de duration tahmin)
  try { o.el.currentTime = 0; } catch { /* meta yok */ }
  try {
    const g = o.kazanc.gain;
    g.cancelScheduledValues(c.currentTime);
    g.setValueAtTime(0, c.currentTime);
    g.linearRampToValueAtTime(1, c.currentTime + girisSn);
  } catch { /* bağlam kapalı */ }
  oda.calan = o;
  oda.sira = i;
  oynat(o);
  taniYaz("basladi", { kaynak: tam ? "storage" : "onizleme" });
}

/** Çapraz geçiş: çalan parça 1,5 sn'de söner, sıradaki (liste bitince baştaki) açılır. */
function sonrakine(c, oda) {
  if (oda.bitti) return;
  const eski = oda.calan;
  const sonraki = (oda.sira + 1) % oda.liste.length;
  if (eski) { eski.gecti = true; parcaSondur(eski, PARCA_GECIS_SN); }
  parcaBaslat(c, oda, sonraki, PARCA_GECIS_SN);
}

/** Oda saati: parça sonuna PARCA_GECIS_SN kala geçişi başlatır (sıradaki parça ancak o an istenir). */
function odaSaati(c, oda) {
  if (oda.bitti) return;
  const o = oda.calan;
  const el = o?.el;
  // Tam parçada gerçek süre (muzikParcalari); önizlemede tarayıcının süresi. Kaçarsa `ended` yedek.
  const sure = o?.sure || el?.duration;
  if (el && !gizli && Number.isFinite(sure) && sure > 0 && !o.gecti) {
    const kalan = sure - el.currentTime;
    if (kalan <= PARCA_GECIS_SN + 0.1) sonrakine(c, oda);
  }
  oda.zaman = setTimeout(() => odaSaati(c, oda), 250);
}

function seviyeUygula() {
  if (!ana) return;
  const c = sesBaglami();
  if (!c) return;
  const { seviye, kisik: oran } = ayar();
  const hedef = muzikAcikMi() ? seviye * (kisik ? oran : 1) : 0;
  try { ana.gain.setTargetAtTime(hedef, c.currentTime, GECIS_SN / 3); } catch { /* eski tarayıcı */ }
}

function odaDurdur(oda) {
  if (!oda || oda.bitti) return;
  oda.bitti = true;
  clearTimeout(oda.zaman);
  for (const o of havuz) if (!o.bosta && (o === oda.calan || o.gecti)) parcaSondur(o, GECIS_SN);
}

function guncelle() {
  izSec();
  taniYaz("guncelle");
}

/** Rotanın odasını seçer: aynı listeyse yalnız seviye, farklıysa eskisini söndürüp yenisini başlatır. */
function izSec() {
  const an = donguSec(rota);
  const liste = muzikAcikMi() ? odaListesi(an) : [];
  const anahtar = liste.length ? `${an}:${liste.join(",")}` : null;
  const c = baglam();
  if (!c) return;
  seviyeUygula();
  if ((iz?.anahtar ?? null) === anahtar) return;
  odaDurdur(iz);
  iz = null;
  if (!anahtar) return;
  // Her girişte rastgele bir parçadan başla (liste 2+ ise son başlangıçla aynı olmasın).
  let bas = Math.floor(Math.random() * liste.length);
  if (liste.length > 1 && bas === sonBaslangic[an]) bas = (bas + 1) % liste.length;
  sonBaslangic[an] = bas;
  const oda = { an, liste, anahtar, sira: bas, calan: null, bitti: false, zaman: 0 };
  iz = oda;
  parcaBaslat(c, oda, bas, GECIS_SN);
  oda.zaman = setTimeout(() => odaSaati(c, oda), 250);
}

/** Rota değişti (BildimApp çağırır). İlk çağrı seçimleri de tazeler. */
export function muzikRota(yol) {
  const onceki = rota;
  rota = String(yol || "/");
  kisik = false;
  // Sahip /ses-secim'den oyuna dönünce seçimleri yeniden al (yeni seçim aynı oturumda da duyulsun).
  if (onceki.startsWith("/ses-secim") && !rota.startsWith("/ses-secim")) tazeleme = null;
  if (!tazeleme) secimleriTazele();
  guncelle();
}

/** Turnuva sayfası: maç sürüyorsa maç döngüsü, değilse turnuva lobisi döngüsü. */
export function muzikTurnuvaMacta(macta) {
  if (turnuvaMacta === Boolean(macta)) return;
  turnuvaMacta = Boolean(macta);
  guncelle();
}

// ------------------------------------------------------------ olaylar (modül bir kez yüklenir)
if (typeof window !== "undefined") {
  sesMuzikKancasi((olay) => {
    const yeni = olay === "soru";
    if (yeni === kisik) return;
    kisik = yeni;
    seviyeUygula();
    taniYaz("olay");
  });
  muzikDinle(() => guncelle());
  if (!dokunuldu) {
    const ilk = () => {
      dokunuldu = true;
      for (const t of ["pointerdown", "keydown", "touchstart"]) window.removeEventListener(t, ilk, true);
      try { const c = sesBaglami(); if (c && c.state === "suspended" && !gizli) c.resume(); } catch { /* izin yok */ }
      guncelle();
    };
    for (const t of ["pointerdown", "keydown", "touchstart"]) window.addEventListener(t, ilk, true);
  }
  // iOS: <audio> yalnız dokunuş/tıklama içinde ilk kez çalabilir → havuzu o anda kilitten çıkar.
  const kilit = () => {
    if (!dokunuldu) dokunuldu = true;
    havuzHazirla();
    if (havuz.length) for (const t of ["touchend", "click", "keydown"]) window.removeEventListener(t, kilit, true);
  };
  for (const t of ["touchend", "click", "keydown"]) window.addEventListener(t, kilit, true);
  document.addEventListener("visibilitychange", () => {
    gizli = document.hidden;
    try {
      const c = dokunuldu ? sesBaglami() : null;
      if (c) Promise.resolve(gizli ? c.suspend() : c.resume()).then(() => taniYaz("olay"), () => {});
    } catch { /* tarayıcı izin vermedi */ }
    for (const o of havuz) {
      if (o.bosta) continue;
      if (gizli) { if (!o.el.paused) { o.bekleyen = true; try { o.el.pause(); } catch { /* */ } } }
      else if (o.bekleyen) oynat(o);
    }
  });
}
