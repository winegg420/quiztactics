import { useEffect, useRef } from "react";

/**
 * Sekme arka plandan geri geldiğinde (veya pencere focus aldığında) fn() çalışır.
 * Arka planda tarayıcı setInterval'leri dondurduğu ve Realtime soketini kopardığı
 * için dönüşte durumun elle tazelenmesi gerekiyor.
 *
 * MOBİL NOTU: yalnız "visibilitychange" yetmiyor.
 *  • iOS Safari sayfayı geri/ileri önbelleğine (bfcache) alıp geri getirirken
 *    çoğu zaman yalnız "pageshow" üretir.
 *  • Android'de uygulama arka plandan dönerken "focus" gelir ama
 *    visibilityState kimi sürümlerde bir tık geç güncellenir.
 * Bu yüzden üç olay birden dinleniyor. Aynı anda birkaçı tetiklenebileceği
 * için art arda gelen çağrılar 250 ms içinde teke indiriliyor.
 */
export function useGorunurlukTazele(fn, aktif = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const sonRef = useRef(0);

  useEffect(() => {
    if (!aktif) return;
    const tazele = () => {
      if (document.visibilityState !== "visible") return;
      // Üç olay aynı dönüşte tetiklenebilir; tazelemeyi bir kez çalıştır.
      const simdi = Date.now();
      if (simdi - sonRef.current < 250) return;
      sonRef.current = simdi;
      try {
        fnRef.current?.();
      } catch (e) {
        console.error("[Bildim] gorunurluk tazeleme hatasi:", e);
      }
    };
    document.addEventListener("visibilitychange", tazele);
    window.addEventListener("focus", tazele);
    window.addEventListener("pageshow", tazele);
    return () => {
      document.removeEventListener("visibilitychange", tazele);
      window.removeEventListener("focus", tazele);
      window.removeEventListener("pageshow", tazele);
    };
  }, [aktif]);
}

// Sekmenin son gizli kalma süresi. Kısa gizlenmede (pencere odağı, bildirim perdesi, başka sekmeye
// bir bakış) Realtime soketi yaşar; kanalı yıkıp kurmak sunucuda boşuna abonelik çalkantısı yapar
// (Supabase Aşama 2, 8 Eki 2026: 45 kullanıcıya 4.527 kanal açılışı).
const KANAL_YENILE_GIZLI_MS = 30000;
let gizlendiAn = 0;
let uzunGizlendi = false;
if (typeof document !== "undefined" && typeof window !== "undefined") {
  const gizlendi = () => { if (!gizlendiAn) gizlendiAn = Date.now(); };
  const dondu = (e) => {
    if (e?.persisted) uzunGizlendi = true;   // bfcache dönüşü: soket kesin kopmuştur
    if (gizlendiAn && Date.now() - gizlendiAn >= KANAL_YENILE_GIZLI_MS) uzunGizlendi = true;
    gizlendiAn = 0;
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") gizlendi(); else dondu();
  });
  window.addEventListener("pagehide", gizlendi);
  window.addEventListener("pageshow", dondu);
}

/**
 * Dönüşte kanal yeniden kurulmalı mı? Kanal bağlı değilse ya da sekme uzun süre (≥ 30 sn)
 * gizli kaldıysa evet. Uzun gizlenme bilgisini tüketir (bir dönüş = bir yeniden kurma).
 */
export function kanalYenilenmeli(kanal) {
  const uzun = uzunGizlendi;
  uzunGizlendi = false;
  return uzun || !kanal || kanal.state !== "joined";
}

/**
 * Bir sözü (promise) süre sınırına bağlar.
 *
 * NEDEN: sekme arka plandayken açılan Supabase RPC'si, soket koptuğu için
 * ne çözülüyor ne reddediliyordu — sonsuza kadar askıda kalıyordu. Çağıran
 * taraf "cevap bekliyorum" diye kilitli kaldığı için oyuncu geri döndüğünde
 * ekran donuk görünüyordu. Süre dolunca reddedilirse çağıran hata yolunu
 * işletip kilidini açabiliyor ve iş yeniden denenebiliyor.
 */
/**
 * Düşen Realtime kanalını yeniden kurmadan önce beklenecek süre (ms): 2, 4, 8, 16, 30 sn.
 * İlk deneme eskisi gibi 2 sn; Realtime uzun süre yoksa (kota, sunucu takılması) sayfa 2 sn'de bir
 * kanal kurup yıkmaz. Kanal bağlanınca sayaç çağıran tarafta sıfırlanır. Veri bu sırada yedek
 * yoklamayla akmaya devam eder.
 */
export const kanalBekleme = (deneme) => Math.min(2000 * 2 ** Math.max(0, deneme), 30000);

/**
 * Rakip arama yoklamasının (duello_ara / kasa_ara / grup_ara) aralığı, aramanın kaçıncı saniyesinde
 * olunduğuna göre: ilk 10 sn 2 sn, 30 sn'ye kadar 3 sn, sonra 5 sn (Aşama 2; eskiden her saniye).
 * Sunucu kuyruğu 90 sn tutar, hız sınırı 90/dk → en uzun aralık bile kuyrukta kalmaya yeter.
 */
export const aramaAraligiSn = (sn) => (sn < 10 ? 2 : sn < 30 ? 3 : 5);

export function zamanAsimiyla(soz, ms = 10000, etiket = "istek") {
  return Promise.race([
    Promise.resolve(soz),
    new Promise((_, red) =>
      setTimeout(() => red(new Error(`${etiket}: ${ms} ms icinde yanit gelmedi`)), ms)
    ),
  ]);
}
