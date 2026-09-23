// Ses arka planı (Ajan H, 23 Eyl 2026) — TEMBEL modül: ana pakete girmez.
// `src/BildimApp.jsx` rota her değiştiğinde `import()` ile çağırır (`muzikRota`).
//
// 1) SEÇİMLER: Ida'nın /ses-secim seçimlerini sunucudan okur (`ses_secimleri_oyun`),
//    yerelde sürümle önbelleğe alır ve `ses.js`'e verir. Açılışta TEK çağrı; sürüm
//    aynıysa sunucu listeyi göndermez. Yeni dağıtım gerekmeden ses değişir.
// 2) MÜZİK: üç döngü — menü (ana sayfa/menüler), maç (Klasik, Düello, Grup, Turnuva
//    maçı, Hatalarım çalışma), turnuva lobisi. Dosya = o anın seçili adayı
//    (public/ses/adaylar/muzik_*.aac); seçim yoksa / "sessiz" ise müzik yok.
//    * Ekran değişince 0,8 sn yumuşak geçiş (gain rampası; yalnız ses).
//    * Döngü noktası da 0,8 sn çapraz geçişle (dosyalar 30 sn'lik kesit, sert kesilmesin).
//    * Soru gelince seviye × muzik_kisik_oran; cevap/sonuçta geri açılır (ses.js kancası).
//    * Sekme gizlenince AudioContext durur, dönünce kaldığı yerden sürer.
//    * Tarayıcı kuralı: ilk dokunuştan önce başlamaz. Müzik kapalıyken hiçbir şey indirilmez.
//    * Dosya arka planda iner; ağ yavaşsa müzik sonra başlar, oyun beklemez.

import { supabase } from "../../src/lib/supabase.js";
import { adayYolu, muzikAcikMi, muzikDinle, sesBaglami, sesMuzikKancasi, sesSecimi, sesSecimleriniAyarla, sesTaniAcik } from "./ses.js";

const SECIM_ANAHTARI = "bildim_ses_secim";   // ses.js ile aynı anahtar
const GECIS_SN = 0.8;
const SES_KLASORU = `${import.meta.env?.BASE_URL ?? "/"}ses/`;

let onbellek = null;   // {surum, secimler, muzik_seviye, muzik_kisik_oran}
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
/** Rota → döngü anı (null → müzik yok). */
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
let iz = null;         // çalan döngü {dosya, kazanc, kaynaklar, zaman, bitti}
const tamponlar = new Map();   // dosya → Promise<AudioBuffer> (en çok 2 tutulur)

/** Tanı (test bayrağı açıkken): window.__muzik = son durum, __muzikGecmis = hepsi. */
function taniYaz(olay) {
  try {
    if (!sesTaniAcik()) return;
    const { seviye, kisik: oran } = ayar();
    window.__muzik = {
      olay, an: donguSec(rota), dosya: iz?.dosya ?? null, calan: Boolean(iz && !iz.bitti && iz.kaynaklar.length),
      acik: muzikAcikMi(), kisik, gizli, dokunuldu, baglam: dokunuldu ? (sesBaglami()?.state ?? null) : null,
      hedef: muzikAcikMi() ? seviye * (kisik ? oran : 1) : 0, t: Math.round(performance.now()),
    };
    (window.__muzikGecmis ||= []).push(window.__muzik);
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

/** Seçili aday dosyası; seçim yok / "mevcut" (müzikte mevcut yok) / "sessiz" → null. */
function secimDosyasi(an) {
  const s = an ? sesSecimi(an) : null;
  if (!s || s === "mevcut" || s === "sessiz") return null;
  return adayYolu(s);
}

function tamponAl(c, dosya) {
  let s = tamponlar.get(dosya);
  if (s) return s;
  s = (async () => {
    const yanit = await fetch(`${SES_KLASORU}${dosya}`);
    if (!yanit.ok) throw new Error(`müzik ${dosya}: HTTP ${yanit.status}`);
    const veri = await yanit.arrayBuffer();
    return new Promise((coz, reddet) => {
      try {
        const p = c.decodeAudioData(veri, coz, reddet);
        if (p && typeof p.then === "function") p.then(coz, reddet);
      } catch (e) { reddet(e); }
    });
  })();
  s.catch(() => tamponlar.delete(dosya));
  tamponlar.set(dosya, s);
  // Bellek: çözülmüş 30 sn stereo ≈ 10 MB — yalnız son iki dosya tutulur.
  while (tamponlar.size > 2) tamponlar.delete(tamponlar.keys().next().value);
  return s;
}

function seviyeUygula() {
  if (!ana) return;
  const c = sesBaglami();
  if (!c) return;
  const { seviye, kisik: oran } = ayar();
  const hedef = muzikAcikMi() ? seviye * (kisik ? oran : 1) : 0;
  try { ana.gain.setTargetAtTime(hedef, c.currentTime, GECIS_SN / 3); } catch { /* eski tarayıcı */ }
}

function izDurdur(eski) {
  if (!eski || eski.bitti) return;
  eski.bitti = true;
  clearTimeout(eski.zaman);
  const c = sesBaglami();
  try {
    eski.kazanc.gain.cancelScheduledValues(c.currentTime);
    eski.kazanc.gain.setValueAtTime(eski.kazanc.gain.value, c.currentTime);
    eski.kazanc.gain.linearRampToValueAtTime(0.0001, c.currentTime + GECIS_SN);
  } catch { /* zaten bitmiş */ }
  setTimeout(() => {
    for (const k of eski.kaynaklar) { try { k.stop(); } catch { /* bitmiş */ } }
    try { eski.kazanc.disconnect(); } catch { /* bağlı değil */ }
  }, GECIS_SN * 1000 + 100);
}

/** Döngüyü çapraz geçişli çalar: her tur sonu 0,8 sn içinde bir sonrakine karışır. */
function izBaslat(c, yeni, tampon) {
  const sure = tampon.duration;
  const F = Math.min(GECIS_SN, sure / 4);
  yeni.kazanc.gain.setValueAtTime(0.0001, c.currentTime);
  yeni.kazanc.gain.linearRampToValueAtTime(1, c.currentTime + GECIS_SN);
  const planla = (t, ilk) => {
    if (yeni.bitti) return;
    const k = c.createBufferSource();
    k.buffer = tampon;
    const g = c.createGain();
    if (!ilk) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + F); }
    g.gain.setValueAtTime(1, t + sure - F);
    g.gain.linearRampToValueAtTime(0.0001, t + sure);
    k.connect(g).connect(yeni.kazanc);
    k.start(t);
    k.stop(t + sure + 0.05);
    yeni.kaynaklar.push(k);
    k.onended = () => { const i = yeni.kaynaklar.indexOf(k); if (i >= 0) yeni.kaynaklar.splice(i, 1); };
    const sonraki = t + sure - F;
    // Bağlam askıdayken (sekme gizli) saat durur; yoklama sayesinde kaynak birikmez.
    const bekle = () => {
      if (yeni.bitti) return;
      if (c.currentTime >= sonraki - 1.5) planla(sonraki, false);
      else yeni.zaman = setTimeout(bekle, 500);
    };
    yeni.zaman = setTimeout(bekle, 500);
  };
  planla(c.currentTime + 0.02, true);
  taniYaz("basladi");
}

function guncelle() {
  izSec();
  taniYaz("guncelle");
}

/** Rotanın döngüsünü seçer: aynıysa yalnız seviye, farklıysa eskisini söndürüp yenisini başlatır. */
function izSec() {
  const an = donguSec(rota);
  const dosya = muzikAcikMi() ? secimDosyasi(an) : null;
  const c = baglam();
  if (!c) return;
  seviyeUygula();
  if ((iz?.dosya ?? null) === dosya) return;
  izDurdur(iz);
  iz = null;
  if (!dosya) return;
  const yeni = { dosya, kazanc: c.createGain(), kaynaklar: [], zaman: 0, bitti: false };
  yeni.kazanc.gain.value = 0.0001;
  yeni.kazanc.connect(ana);
  iz = yeni;
  tamponAl(c, dosya).then(
    (tampon) => { if (iz === yeni && !yeni.bitti) izBaslat(c, yeni, tampon); },
    (e) => { console.warn("müzik yüklenemedi:", e?.message ?? e); if (iz === yeni) { iz = null; yeni.bitti = true; } },
  );
}

/** Rota değişti (BildimApp çağırır). İlk çağrı seçimleri de tazeler. */
export function muzikRota(yol) {
  rota = String(yol || "/");
  kisik = false;
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
  document.addEventListener("visibilitychange", () => {
    gizli = document.hidden;
    try {
      const c = dokunuldu ? sesBaglami() : null;
      if (c) Promise.resolve(gizli ? c.suspend() : c.resume()).then(() => taniYaz("olay"), () => {});
    } catch { /* tarayıcı izin vermedi */ }
  });
}
