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
  const liste = ornekler.filter((o) => alindiMs - o.an < PENCERE_MS && o.an <= alindiMs);
  liste.push({ an: alindiMs, rtt: Math.max(0, alindiMs - gonderildiMs), fark: sz - (gonderildiMs + alindiMs) / 2 });
  ornekler = liste;
  fark = liste.reduce((a, b) => (b.rtt < a.rtt ? b : a)).fark;
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
}

/** Sunucu saatine göre şimdi (ms). Örnek yoksa istemci saati. */
export function sunucuSimdiMs() {
  return Date.now() + (fark ?? 0);
}
