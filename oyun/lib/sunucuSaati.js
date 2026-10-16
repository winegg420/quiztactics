// ============================================================
// ORTAK SUNUCU SAATİ (1092 · senkron paketi, 14 Eki 2026)
//
// Bütün maç sayaçları (3-2-1, soru sayacı, Düello/Hazine faz sayaçları, turnuva) sunucu saatini BURADAN okur.
// Yöntem lib/nabiz.js'in 980/D-409 yöntemiyle AYNI: her yanıt bir örnek — istek/yanıt ORTA NOKTASI ile sunucu
// zamanı arasındaki fark; son 60 sn içindeki EN KISA gidiş-dönüşlü örnek kullanılır (NTP yaklaşımı). Tek yavaş yanıt
// farkı oynatmaz; telefonun saati yanlış olsa da sayaçlar sunucuyla aynı akar.
//
// Örnekleri besleyenler: maç nabzı (nabiz.js), Düello/Hazine durum okumaları, soru kartı (soruCek / get_match_question).
// Kural: hiçbir sayaç Date.now()'u bu farkla düzeltmeden kullanmaz.
// ============================================================

const PENCERE_MS = 60000;
let ornekler = [];
let fark = null;
let monoFark = null;
let sonKaydi = null;   // son örnek anındaki tekdüze − duvar farkı (saat atlaması algısı)   // sunucu − tekdüze epoch (performance.timeOrigin + performance.now)
// Tekdüze epoch ile duvar saati (Date.now) arasındaki fark — telefonun saati ayarlanınca değişir, tekdüze saat değişmez.
const tekduzeEpoch = () => (typeof performance !== "undefined" && performance.timeOrigin ? performance.timeOrigin + performance.now() : Date.now());
const tekduzeKaydi = () => tekduzeEpoch() - Date.now();
// Telefon uyurken (ekran kapalı, sayfa gizli) tekdüze saat durabilir (Android: askıda sayılmaz) → gizliyken alınmış
// örneklerin tekdüze farkı bayatlar. Sayfa görünür olunca pencere boşaltılır; ilk TAZE örnek sayaç saatini bir kerede
// hizalar (sayfaların görünürlük okuması onu hemen getirir). Duvar saatinden kurmak telefonun saati de atladıysa yanlıştı.
let donusHizala = false;
if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    ornekler = [];
    sonKaydi = null;
    donusHizala = true;
  });
}

/**
 * Bir istek/yanıt çiftinden saat örneği ekler.
 * @param {number} gonderildiMs  istek anı (istemci Date.now)
 * @param {number} alindiMs      yanıt anı (istemci Date.now)
 * @param {string|number} sunucuZamani  yanıttaki sunucu saati (ISO ya da ms)
 * @returns {number|null}  güncel saat farkı (sunucu − istemci, ms)
 */
export function saatOrnegiEkle(gonderildiMs, alindiMs, sunucuZamani) {
  const sz = sunucuZamani == null ? NaN : new Date(sunucuZamani).getTime();
  if (!Number.isFinite(sz) || !Number.isFinite(gonderildiMs) || !Number.isFinite(alindiMs)) return fark;
  // 16 Eki: telefonun saati (Date.now) atladıysa eski örneklerin farkı bayattır — tekdüze/duvar ilişkisi > 500 ms
  // değişmiş örnekler atılır (yoksa en iyi eski örnek 60 sn boyunca yanlış farkı tutuyordu).
  const kaydi = tekduzeKaydi();
  // Atlama bu istek yoldayken olduysa (son örnekten beri ilişki değişti) bu örnek de bozuktur: pencere boşalır, örnek alınmaz.
  if (sonKaydi != null && Math.abs(kaydi - sonKaydi) >= 500) { sonKaydi = kaydi; ornekler = []; return fark; }
  sonKaydi = kaydi;
  const liste = ornekler.filter((o) => alindiMs - o.an < PENCERE_MS && o.an <= alindiMs && Math.abs((o.kaydi ?? kaydi) - kaydi) < 500);
  // 16 Eki: aynı örneğin tekdüze saate göre farkı da tutulur (sayaç saati telefonun saat ayarı değişse de kaymaz)
  liste.push({ an: alindiMs, rtt: Math.max(0, alindiMs - gonderildiMs), fark: sz - (gonderildiMs + alindiMs) / 2,
               mfark: sz - ((gonderildiMs + alindiMs) / 2 + kaydi), kaydi });
  ornekler = liste;
  const enIyi = liste.reduce((a, b) => (b.rtt < a.rtt ? b : a));
  fark = enIyi.fark;
  monoFark = enIyi.mfark;
  if (donusHizala) { donusHizala = false; duzgunFark = monoFark; duzgunAn = tekduze(); }
  return fark;
}

/** Güncel saat farkı (sunucu − istemci, ms); henüz örnek yoksa null. */
export function saatFarkiMs() {
  return fark;
}

/** Saat farkının belirsizliği (ms): kullanılan örneğin gidiş-dönüşünün yarısı. Örnek yoksa null. */
export function saatBelirsizlikMs() {
  if (!ornekler.length) return null;
  return ornekler.reduce((a, b) => (b.rtt < a.rtt ? b : a)).rtt / 2;
}

// Normal mobil ağda (gidiş-dönüş ≤ ~600 ms) belirsizlik payı uygulanmaz; yalnız bunun ÜSTÜ (bekleyen ilk istek, takılan
// yanıt) sayımı geç bitiren tarafa kaydırır.
const SAYIM_TOLERANS_MS = 300;

/**
 * 3-2-1 sayımı için saat farkı: belirsizliğin TOLERANS üstü kadar "geç biten" tarafta tahmin edilir. İlk örnek yavaş
 * gelirse (ör. sayfa açılırken bekleyen istek, ölçüm: ~2,5 sn hata) sayım ortadan başlamaz; daha iyi örnek gelince kalan
 * yalnız AZALIR. (Hazine giriş sahnesi de bu farkla sayar.)
 * @param {number|null} [fark]  kullanılacak fark (verilmezse modülün farkı)
 */
export function sayimFarkiMs(fark) {
  const f = fark ?? saatFarkiMs() ?? 0;
  const u = saatBelirsizlikMs();
  return f - Math.max(0, (u ?? 0) - SAYIM_TOLERANS_MS);
}

/** 3-2-1'in kilitlendiği kalan (sn): bundan sonra 2 ve 1 yerel saatle tam birer saniye. */
export const SAYIM_KILIT_SN = 2;

/**
 * Ortak 3-2-1 çekirdeği (MacHazirlik › useGeriSayim bunu çağırır; araclar/senkron-testi.mjs --taklit de).
 * - Kalan > 2 iken ("3" görünür, gösterim payı dahil) bitiş her çağrıda en iyi saat örneğiyle yeniden tahmin edilir
 *   (belirsiz örnekte "geç biten" taraf — sayimFarkiMs).
 * - Orta nokta tahminine göre soru ZATEN başladıysa sayım gösterilmez (gerçekten geç gelen: soru kalan süreyle açılır;
 *   belirsizlik payı başlamış sorunun üstüne sayım çizdirmez).
 * - Kalan 2'ye inince bitiş YEREL saate (perfMs) kilitlenir — sonradan gelen örnek rakamı kısaltamaz/uzatamaz.
 * @param {{kilit: number|null}} durum  sayım başına bir nesne (çağıran saklar)
 * @param {number} bitisMs   sunucu saatiyle sayım bitişi (ilk soru başlangıcı)
 * @param {number} perfMs    yerel tekdüze saat (performance.now)
 * @param {number} istemciMs istemci duvar saati (Date.now)
 * @param {number|null} [fark] saat farkı (verilmezse modülün farkı)
 * @returns {number} kalan sn (≤ 0.05 → sayım yok / bitti)
 */
export function sayimKalani(durum, bitisMs, perfMs, istemciMs, fark) {
  if (durum.kilit != null) return (durum.kilit - perfMs) / 1000;
  const orta = (bitisMs - (istemciMs + (fark ?? saatFarkiMs() ?? 0))) / 1000;
  if (orta <= 0.05) return orta;
  const k = (bitisMs - (istemciMs + sayimFarkiMs(fark))) / 1000;
  if (k <= SAYIM_KILIT_SN) durum.kilit = perfMs + Math.max(0, k) * 1000;
  return k;
}

/** Yalnız testler için: örnek penceresini boşaltır. */
export function _saatOrnekleriniSifirla() {
  ornekler = [];
  fark = null;
  monoFark = null;
  sonKaydi = null;
}

/** Sunucu saatine göre şimdi (ms). Örnek yoksa istemci saati. */
export function sunucuSimdiMs() {
  return Date.now() + (fark ?? 0);
}

// ---- SAYAÇ SAATİ (16 Eki 2026, Hazine kök neden) ----
// En iyi örnek değişince (daha kısa gidiş-dönüşlü yanıt geldi ya da eski örnek 60 sn'lik pencereden düştü) fark bir anda
// 100–400 ms oynuyordu (Wi-Fi/mobil ağda yanıt yolu gidiş yolundan uzun) → ekrandaki saniye ileri/geri sıçrıyordu. Sayaçlar
// farkı BURADAN okur: yeni farka en çok %10 hızla kayar (saniyede 100 ms) — gösterilen süre 0,9–1,1 hızla akar, asla geri
// gitmez, sıçramaz. 1,5 sn'den büyük sapma (telefonun saati değişti, uzun arka plan) bir kerede uygulanır.
const KAYMA_HIZI = 0.1;
const KAYMA_ESIK_MS = 1500;
const SAPMA_ESIK_MS = 700;   // akış izlemesi: gösterilen sayaç sunucudan bu kadar sapınca kaydedilir
let duzgunFark = null;
let duzgunAn = 0;
let sapmaDinleyici = null;
let sonSapmaBildirim = -Infinity;
const tekduze = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Akış izlemesi kurar: sayaç saati sunucudan SAPMA_ESIK_MS'den fazla saptığında (ms) çağrılır (en çok 10 sn'de bir). */
export function saatSapmaDinle(f) { sapmaDinleyici = f; }

/** Düzgün saat farkı (sunucu − TEKDÜZE epoch, ms); örnek yoksa null. */
function duzgunMonoFark() {
  const hedef = monoFark;
  if (hedef == null) return duzgunFark;
  const t = tekduze();
  if (duzgunFark == null || Math.abs(hedef - duzgunFark) > KAYMA_ESIK_MS) {
    if (duzgunFark != null) sapmaBildir(Math.abs(hedef - duzgunFark), t);
    duzgunFark = hedef; duzgunAn = t;
    return duzgunFark;
  }
  const adim = Math.max(0, t - duzgunAn) * KAYMA_HIZI;
  duzgunAn = t;
  duzgunFark += Math.max(-adim, Math.min(adim, hedef - duzgunFark));
  if (Math.abs(hedef - duzgunFark) > SAPMA_ESIK_MS) sapmaBildir(Math.abs(hedef - duzgunFark), t);
  return duzgunFark;
}
/** Sayaçların kullandığı düzgün saat farkı, Date.now()'a göre (sunucu − istemci, ms); örnek yoksa null. */
export function sayacFarkiMs() {
  const m = duzgunMonoFark();
  return m == null ? null : m + tekduzeKaydi();
}
function sapmaBildir(ms, t) {
  if (!sapmaDinleyici || t - sonSapmaBildirim < 10000) return;
  sonSapmaBildirim = t;
  try { sapmaDinleyici(Math.round(ms)); } catch { /* izleme oyunu bozmaz */ }
}

/** Sayaçlar için sunucu saatine göre şimdi (ms) — düzgün fark (sayacFarkiMs). */
export function sayacSimdiMs() {
  const m = duzgunMonoFark();
  return m == null ? Date.now() + (fark ?? 0) : tekduzeEpoch() + m;
}

/** En iyi saat örneğine göre sunucu şimdi (ms; tekdüze saatle — telefonun saati atlasa da). Örnek yoksa sunucuSimdiMs. */
export function enIyiSimdiMs() {
  return monoFark == null ? Date.now() + (fark ?? 0) : tekduzeEpoch() + monoFark;
}

/**
 * 16 Eki 2026 (Düello nötr "sayaç 0'da ~1,8 sn", canlı izleme): süre dolumu bildiriminin (cevabım yok · karar yok · kart
 * yok; 1063/1114) gönderilmesine kalan ms. Sayaç saati (düzgün) en iyi örnekten 1,5 sn'ye kadar önde olabilir; yalnız ona
 * göre giden bildirim sunucuya erken varıp "Süre dolmadı" alıyor, 600 ms sonra yeniden deneniyordu (14:15:25 UTC kaydı).
 * İki saatin GEÇ olanı + pay: sayaç 0'ı göstermeden (oyuncu hâlâ dokunabilir) ve sunucunun süresi dolmadan gönderilmez.
 */
export function sureBildirimMs(bitisMs, payMs = 150) {
  return Math.max(bitisMs - sayacSimdiMs(), bitisMs - enIyiSimdiMs()) + payMs;
}

/** "Süre dolmadı" yanıtından sonra yeniden deneme beklemesi: en iyi saate göre kalan + pay (150–600 ms; eskiden hep 600). */
export function sureBildirimTekrarMs(bitisMs) {
  return Math.min(600, Math.max(150, bitisMs - enIyiSimdiMs() + 150));
}

/**
 * Yeni faz/soru başlarken (sayaç henüz akmıyorken) çağrılır: sayaç saati en iyi örneğe bir kerede hizalanır. Sayaç
 * akarken düzeltme yalnız kayarak olur; ilk (yavaş) örnekten kalan büyük hata bir sonraki fazı beklemez.
 */
export function sayacSaatiHizala() {
  if (monoFark == null) return;
  duzgunFark = monoFark; duzgunAn = tekduze();
}

/** Yalnız testler için: sayaç saatini sıfırlar. */
export function _sayacSaatiniSifirla() {
  duzgunFark = null; duzgunAn = 0; sonSapmaBildirim = -Infinity;
}
