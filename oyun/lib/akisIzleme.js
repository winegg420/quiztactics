// ============================================================
// AKIŞ BOZULMASI İZLEMESİ (16 Eki 2026 — migration 1113)
//
// Gerçek telefonda maç akışının bozulduğu anları bütün oyunculardan toplar (taklit testi bu bozulmaları göstermiyordu).
// Kayıt türleri ve eşikler:
//   sayac_sapma — sayaç saati sunucu saatinden > 700 ms saptı (lib/sunucuSaati.js › sayaç saati; ms = sapma)
//   sayac_sifir — sayaç 0'a indi, sonraki faz > 1 sn gelmedi (ms = 0'da kalma süresi)
//   faz_gec     — faz/sayfa geçişi sunucunun bitiş zamanından > 1 sn geç uygulandı (ms = gecikme); "atlama:<faz>" ani atlama
//   donma       — ana iş parçacığı > 500 ms dondu (uzun görev; ms = süre)
//   ses_gec     — istenen maç sesi > 300 ms geç başladı · ses_yok — hiç başlamadı (inmedi / AudioContext açılmadı)
//   ses_kesildi — (16 Eki 2026, 1116) anlam taşıyan ses yarıda kaldı: planının %80'inden önce bitti ya da çalarken yeni faz
//                 geldi ve > 150 ms kaldı (ms = kalan; an = rol|faz|kesen)
//   kasma       — (16 Eki 2026, 1119) maç boyunca > 100 ms süren kareler, aşamaya göre sayılır ve TEK özet olarak yazılır:
//                 an = "aşama:adet …" (en çok kasan aşama önce, ör. "cevap:5 sonuc:2 baslangic:1"), ms = en uzun kare.
//                 Özet maç sayfası kapanınca (maç sonu ekranının ilk 5 sn'si "macsonu" aşaması olarak dahil) ya da sayfa
//                 gizlenince yazılır. Kaynak: Long Animation Frames (boyama dahil kare süresi); yoksa uzun görev; iOS'ta saat boşluğu.
//                 Eskiden yalnız > 500 ms donma kaydediliyordu — gerçek telefonda gözle görülen 100–400 ms kasmalar hiç gelmiyordu.
// Yalnız maç sayfası açıkken (akisMacBaslat … akisMacBitir) ve sayfa görünürken ölçülür; arka planda geçen faz kaydedilmez.
//
// HAFİFLİK: kayıtlar izlemeKaydi kuyruğuna girer (tek RPC, 15 sn toplu / sayfa gizlenince). Sınırlar: aynı maçta aynı tür
// en çok 3 kayıt · dakikada en çok 8 · sekme oturumunda en çok 40. Sunucu da ayrıca sınırlar (istemci_kayit_yaz, 1113).
// KİŞİSEL VERİ YOK: mod, an adı, ms, cihaz/kip/ağ türü, sürüm, maç kimliği (30 gün sonra budanır).
// ============================================================
import { akisKaydet, gonderAcil } from "../../src/lib/izlemeKaydi.js";
import { acilisKipi } from "../../src/lib/uygulamaKipi.js";
import { saatSapmaDinle, sunucuSimdiMs } from "./sunucuSaati.js";

export const AKIS_ESIK = { sapma: 700, sifir: 1000, faz: 1000, donma: 500, ses: 300, kare: 100 };
const MAC_SONU_KUYRUK_MS = 5000;   // maç bitince maç sonu ekranının kareleri bu kadar daha "macsonu" aşamasına sayılır
const MAC_TUR_SINIR = 3;
const DAKIKA_SINIR = 8;
const OTURUM_SINIR = 40;
const OTURUM_ANAHTARI = "qt_akis_sayi";

let mac = null;            // { mod, id }
let faz = null;            // { anahtar, an, bitisMs, sifirAn, gizlendi }
let sayilar = new Map();   // `${mac}|${tur}` → adet
let dakikaBasi = 0, dakikaSayi = 0;
let gozlemci = null, yedekSaat = null, gizlenmeAni = -Infinity, gorunmeAni = -Infinity;
let kareGozlemci = null;   // Long Animation Frames (varsa)
let kasma = { asama: new Map(), enUzun: 0, adet: 0 };   // maç içi > 100 ms kareler (özet yazılınca sıfırlanır)
let kuyruk = null;         // maç bittikten sonraki "macsonu" penceresinin zamanlayıcısı
const simdi = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const gorunur = () => typeof document === "undefined" || document.visibilityState === "visible";

function oturumSayisi(arti = 0) {
  try {
    const n = Number(sessionStorage.getItem(OTURUM_ANAHTARI) || 0) + arti;
    if (arti) sessionStorage.setItem(OTURUM_ANAHTARI, String(n));
    return n;
  } catch { return 0; }
}
function agTuru() {
  try {
    const c = navigator.connection;
    return [c?.type, c?.effectiveType].filter(Boolean).join("/").slice(0, 20) || null;
  } catch { return null; }
}

/** Bir akış bozulması kaydı (sınırlar burada). Hiçbir koşulda fırlatmaz. */
export function akisOlay(tur, an, ms, gizliyken = false) {
  try {
    if (!mac || (!gorunur() && !gizliyken)) return;
    const anahtar = `${mac.id}|${tur}`;
    const n = sayilar.get(anahtar) ?? 0;
    if (n >= MAC_TUR_SINIR) return;
    const t = Date.now();
    if (t - dakikaBasi > 60000) { dakikaBasi = t; dakikaSayi = 0; }
    if (dakikaSayi >= DAKIKA_SINIR || oturumSayisi() >= OTURUM_SINIR) return;
    dakikaSayi++; oturumSayisi(1); sayilar.set(anahtar, n + 1);
    akisKaydet({ tur, mod: mac.mod, an: String(an ?? "").slice(0, 40), ms: Math.max(0, Math.round(Number(ms) || 0)),
                 mac: mac.id, kip: acilisKipi(), ag: agTuru() });
  } catch { /* izleme oyunu bozmaz */ }
}

/** > 100 ms kare: o anki aşamaya sayılır (görünürken; görünür olduktan sonraki ilk 1 sn — uyku dönüşü — sayılmaz). */
function kareKaydet(sure, baslangic) {
  if (!mac || !gorunur() || !(sure > AKIS_ESIK.kare) || baslangic < gorunmeAni + 1000 || baslangic < gizlenmeAni + 1000) return;
  const a = String(faz?.an || "acilis").replace(/[\s:]/g, "").slice(0, 12) || "acilis";
  kasma.asama.set(a, (kasma.asama.get(a) ?? 0) + 1);
  kasma.adet++;
  if (sure > kasma.enUzun) kasma.enUzun = sure;
}

/** Biriken kasmaların tek özet kaydı (an = "aşama:adet …", en çok kasan önce; ms = en uzun kare). */
function kasmaOzetiYaz() {
  if (!mac || !kasma.adet) return;
  let an = "";
  for (const [a, n] of [...kasma.asama].sort((x, y) => y[1] - x[1])) {
    const p = `${a}:${n}`;
    if ((an ? an.length + 1 : 0) + p.length > 40) break;
    an = an ? `${an} ${p}` : p;
  }
  const ms = kasma.enUzun;
  kasma = { asama: new Map(), enUzun: 0, adet: 0 };
  akisOlay("kasma", an, ms, true);
}

function fazKapat(yeniGeldi) {
  const f = faz;
  faz = null;
  if (!f || f.gizlendi || !gorunur()) return;
  const t = simdi();
  if (f.sifirAn != null && t - f.sifirAn > AKIS_ESIK.sifir) akisOlay("sayac_sifir", f.an, t - f.sifirAn);
  if (yeniGeldi && f.bitisMs != null) {
    const gec = sunucuSimdiMs() - f.bitisMs;
    if (gec > AKIS_ESIK.faz) akisOlay("faz_gec", f.an, gec);
  }
}

/**
 * Maç sayfası her çizimde çağırır (ucuz): faz anahtarı değişince önceki fazın 0'da kalma / geç gelme ölçüsü yazılır.
 * @param {{anahtar: string, an: string, sayacSn?: number|null, bitisMs?: number|null}} p
 *   anahtar: faz örneği (ör. "3-cevap") · an: kayıtta görünen faz adı · sayacSn: ekrandaki kalan (sayaçsız fazda null) ·
 *   bitisMs: bu fazın süreyle biteceği SUNUCU anı (eylemle biten / süresiz fazda null)
 */
export function akisFazGozle({ anahtar, an, sayacSn = null, bitisMs = null }) {
  try {
    if (!mac || !anahtar) return;
    if (!faz || faz.anahtar !== anahtar) {
      fazKapat(Boolean(faz));
      faz = { anahtar, an, bitisMs: Number.isFinite(bitisMs) ? bitisMs : null, sifirAn: null, gizlendi: !gorunur() };
    } else if (Number.isFinite(bitisMs)) faz.bitisMs = bitisMs;
    if (sayacSn != null && sayacSn <= 0 && faz.sifirAn == null && gorunur()) faz.sifirAn = simdi();
  } catch { /* sessiz */ }
}

/** Ses sonucu (lib/ses.js tanı kaydından): geç başlayan ya da hiç başlamayan maç sesi. */
export function akisSesSonuc(k, sonuc) {
  try {
    if (!mac || kuyruk || !k?.rol || !sonuc || sonuc === "yukleniyor") return;
    const ms = simdi() - (k.t ?? simdi());
    if (sonuc === "calindi") { if (ms > AKIS_ESIK.ses && !k.gecKabul) akisOlay("ses_gec", k.rol, ms); return; }
    if (/^(gec-yuklendi|atlandı|audiocontext-yok|yedek-ton \(dosya)/.test(sonuc)) akisOlay("ses_yok", `${k.rol}:${sonuc.split(" ")[0]}`, ms);
  } catch { /* sessiz */ }
}

/**
 * 16 Eki 2026 (1116): anlam taşıyan ses yarıda kaldı — planının %80'inden önce bitti ya da çalarken yeni faz geldi ve > 150 ms
 * kaldı (lib/ses.js › omurBitti karar verir). Kayıt: an = "rol|faz|kesen" (40 harf), ms = kalan.
 * kesen: ekran (yeni ekran geldi, yumuşak bitti) · ayni_ses (aynı rolün yeni kopyası) · soru_sesi (soru sesi doğru/yanlışı kıstı) ·
 * diger.
 */
// 17 Eki 2026 (ses bitiş kuralı): kalanMs = sesin DOĞAL sonuna (-45 dB) göre kalan/kesilen ms. Ses artık hiç kısaltılmaz; kayıt
// iki durumda düşer: doğal sona > 50 ms varken yeni ekran geldi (ekran) ya da ses doğal sonundan erken sustu (aski · diger).
// Kurala göre çalınmayan ses (pencereye sığmadı / üstüne binerdi) "ses_yok" (atlandı) olarak görünür. Aynı maçta aynı an bir kez.
const sesKesikYazilan = new Set();
export function akisSesKesildi({ rol, faz: f, kalanMs, kesen }) {
  try {
    if (!mac || kuyruk || !rol) return;
    const ks = String(kesen ?? "");
    // 17 Eki 2026 (ses bitiş kuralı): kesen "ekran" = doğal sonuna > 50 ms varken yeni ekran geldi · "aski" = AudioContext
    // çalarken askıya alındı (ses o an sustu) · "diger" = doğal sondan erken başka bir susma. (Pencere kısaltması / üst sınır /
    // aynı rolde kısma / soru sesinin kısması kalktı.)
    const k = ks === "ekran" || /^yeni ekran/.test(ks) ? "ekran" : /^askı/.test(ks) ? "aski" : "diger";
    const fazAd = String(f ?? faz?.an ?? "").replace(/[|]/g, "").slice(0, 14);
    const an = `${String(rol).slice(0, 18)}|${fazAd}|${k}`;
    if (sesKesikYazilan.has(`${mac.id}|${an}`)) return;
    sesKesikYazilan.add(`${mac.id}|${an}`);
    akisOlay("ses_kesildi", an, kalanMs);
  } catch { /* sessiz */ }
}

export const akisMacAcik = () => Boolean(mac) && !kuyruk;   // maç sonu kasma penceresi "maç içi" sayılmaz (ses sınırları aynı kalır)

function gizlenince() {
  if (document.visibilityState === "hidden") {
    gizlenmeAni = simdi(); if (faz) faz.gizlendi = true;
    // gizlenince (uygulama arka plana / kapanıyor): biriken kasma özeti hemen yazılır ve beklemeden gönderilir
    if (kasma.adet) { kasmaOzetiYaz(); gonderAcil(); }
  } else gorunmeAni = simdi();
}

/** Maç bitti / sayfa kapandı: özet yazılır, gözlemciler durur. */
function tamBitir() {
  if (kuyruk) { clearTimeout(kuyruk); kuyruk = null; }
  kasmaOzetiYaz();
  mac = null;
  faz = null;
  document.removeEventListener("visibilitychange", gizlenince);
  gozlemci?.disconnect(); gozlemci = null;
  kareGozlemci?.disconnect(); kareGozlemci = null;
  if (yedekSaat) { clearInterval(yedekSaat); yedekSaat = null; }
}

/** Maç sayfası açılınca (mod: klasik | saf_bilgi | duello | hazine | grup | turnuva). Aynı maç için tekrar çağrı zararsız. */
export function akisMacBaslat(mod, id) {
  try {
    if (typeof window === "undefined" || !id) return;
    if (mac?.id === String(id) && mac.mod === mod) {
      // maç sonu penceresindeyken aynı maç yeniden açıldı: pencere iptal, ölçüm sürer
      if (kuyruk) { clearTimeout(kuyruk); kuyruk = null; faz = null; }
      return;
    }
    if (mac) tamBitir();   // önceki maçın (maç sonu penceresi dahil) özeti yazılır
    mac = { mod, id: String(id) };
    faz = null;
    kasma = { asama: new Map(), enUzun: 0, adet: 0 };
    // arka plandan dönüşteki saat düzeltmesi (uyku) sapma sayılmaz
    saatSapmaDinle((ms) => { if (simdi() - gorunmeAni > 3000 && simdi() - gizlenmeAni > 3000) akisOlay("sayac_sapma", faz?.an ?? "", ms); });
    document.addEventListener("visibilitychange", gizlenince);
    const destek = typeof PerformanceObserver !== "undefined" ? PerformanceObserver.supportedEntryTypes ?? [] : [];
    // 16 Eki 2026 (1119): kare süresi (boyama dahil) — Long Animation Frames; yoksa uzun görev kareye sayılır
    const loaf = destek.includes("long-animation-frame");
    if (loaf && !kareGozlemci) {
      kareGozlemci = new PerformanceObserver((l) => { for (const e of l.getEntries()) kareKaydet(e.duration, e.startTime); });
      kareGozlemci.observe({ type: "long-animation-frame" });
    }
    if (!gozlemci && destek.includes("longtask")) {
      gozlemci = new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          if (e.duration > AKIS_ESIK.donma && e.startTime > gizlenmeAni + 1000) akisOlay("donma", faz?.an ?? "", e.duration);
          if (!loaf) kareKaydet(e.duration, e.startTime);
        }
      });
      gozlemci.observe({ type: "longtask" });
    } else if (!gozlemci && !yedekSaat) {
      // iOS Safari'de uzun görev ölçümü yok: 250 ms'lik saatin gecikmesi donmadır (görünürken)
      let son = simdi();
      yedekSaat = setInterval(() => {
        const t = simdi(), bosluk = t - son - 250;
        son = t;
        if (bosluk > AKIS_ESIK.donma && t - gizlenmeAni > bosluk + 1000) akisOlay("donma", faz?.an ?? "", bosluk);
        if (!loaf) kareKaydet(bosluk, t - bosluk);
      }, 250);
    }
  } catch { /* sessiz */ }
}

/**
 * Maç sayfası kapanınca / maç bitince: açık faz kapatılır (0'da kalan sayaç yazılır). Kasma ölçümü maç sonu ekranının ilk
 * 5 sn'sinde "macsonu" aşamasıyla sürer, sonra özet yazılır ve gözlemciler durur.
 */
export function akisMacBitir(id) {
  try {
    if (!mac || (id && mac.id !== String(id)) || kuyruk) return;
    fazKapat(false);
    saatSapmaDinle(null);
    faz = { anahtar: "macsonu", an: "macsonu", bitisMs: null, sifirAn: null, gizlendi: !gorunur() };
    kuyruk = setTimeout(() => { kuyruk = null; try { tamBitir(); } catch { /* sessiz */ } }, MAC_SONU_KUYRUK_MS);
  } catch { /* sessiz */ }
}

/** Yalnız testler için. */
export function _akisSifirla() {
  if (kuyruk) { clearTimeout(kuyruk); kuyruk = null; }
  mac = null; faz = null; sayilar = new Map(); dakikaBasi = 0; dakikaSayi = 0; kasma = { asama: new Map(), enUzun: 0, adet: 0 };
  gizlenmeAni = -Infinity; gorunmeAni = -Infinity;
}
/** Yalnız testler için: kare kaydını dışarıdan besler / maç sonu penceresini hemen kapatır. */
export function _akisKare(sure, baslangic = simdi()) { kareKaydet(sure, baslangic); }
export function _akisBitirHemen() { if (mac) tamBitir(); }
