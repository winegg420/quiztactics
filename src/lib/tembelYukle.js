// ============================================================
// TEMBEL SAYFA YÜKLEME — lazy(() => import(...)) için 1 yeniden deneme (D-103/D-201)
//
// Neden: bağlantı anlık koptuğunda bir sayfa parçası (chunk) inemezse React.lazy
// hatayı SONSUZA DEK önbelleğe alır — aynı bileşen bir daha asla yüklenmez,
// bağlantı gelse bile. Burada:
//   · ilk hata → kısa bekleme → 1 yeniden deneme (çoğu anlık kopukluk burada biter);
//   · o da başarısızsa hata HataSiniri'ne gider (kart + "Tekrar dene");
//   · `tembelleriSifirla()` başarısız olanların lazy kaydını yeniler — sayfa hatası
//     (parça dışı) için HataSiniri "Tekrar dene"de bunu çağırır.
// Başarıyla inmiş sayfalara dokunulmaz (durumları korunur).
//
// NOT (ölçüldü, Chromium): başarısız dinamik import aynı belgede önbelleğe alınır — aynı parça
// adresi sayfa yenilenmeden bir daha İSTENMEZ. Bu yüzden bağlantı gelince / "Tekrar dene"de
// parça hatası için HataSiniri sayfayı yeniler (kullanıcı eylemi ya da tek online olayı; döngü yok).
// ============================================================
import { createElement, lazy } from "react";
import { otomatikYenile } from "./yenilemeSigortasi.js";
import { ekSozlukBekle } from "../../oyun/lib/dil.js";

const BEKLEME_MS = 700;
const basarisizlar = new Set();

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/** lazy() yerine: aynı imza, yalnız 1 yeniden deneme + sıfırlanabilir. */
export function tembelYukle(yukleyici) {
  let tembel = null;
  const kur = () => {
    tembel = lazy(async () => {
      try {
        // Paket B/12: İngilizcede sayfanın metinleri ek sözlükte olabilir — sayfa modülü çalışmadan önce beklenir
        await ekSozlukBekle();
        const modul = await yukleyici();
        // vite:preloadError yakalanıp sayfa yenilemeye alındıysa modül boş döner: yenileme bitene
        // kadar "Yükleniyor…" kalsın (React "undefined.default" hatası çizmesin).
        if (!modul) return new Promise(() => {});
        return modul;
      } catch (ilk) {
        console.warn("[Bildim] sayfa parçası inemedi, yeniden deneniyor:", ilk?.message ?? ilk);
        await bekle(BEKLEME_MS);
        try {
          const modul = await yukleyici();
          if (!modul) return new Promise(() => {});
          return modul;
        } catch (e) {
          // Yeni sürüm: eski parça adı sunucuda yok → aralık bayrağıyla korunan yenileme dener;
          // yenilenirse sayfa yenilenene dek "Yükleniyor…" kalır, aksi halde "Tekrar dene" kartı.
          if (parcaHatasiMi(e) && sessizOnYukleme === 0 && parcaIcinYenile("lazy", e?.message ?? "")) return new Promise(() => {});
          basarisizlar.add(kur);
          throw e;
        }
      }
    });
  };
  kur();
  function TembelSayfa(props) {
    return createElement(tembel, props);
  }
  // Boşta önceden indirme (bkz. bostaOnYukle): modül bellekte kalır, sayfa açılınca lazy anında çözülür.
  // Hata sessiz: parça yoksa (yeni dağıtım) sayfa açıldığında normal yol (yeniden deneme / yenileme) işler.
  TembelSayfa.onYukle = () => {
    sessizOnYukleme++;
    return Promise.resolve().then(yukleyici).catch(() => null).finally(() => { sessizOnYukleme--; });
  };
  return TembelSayfa;
}

let sessizOnYukleme = 0;   // süren önceden indirme sayısı — onların parça hatası sayfayı yenilemez

// 15 Eki 2026 (perf 2): adla önceden indirme — kabuğun tembel sayfası (ör. Klasik maç sayfası) oyun modülünden de
// (ana sayfa "Oyna" / rakip arama) aynı korumalı yolla (sessiz, parça hatası sayfayı yenilemez) istenebilsin.
const adliSayfalar = new Map();
export function onYuklemeKaydet(ad, sayfa) { if (sayfa?.onYukle) adliSayfalar.set(ad, sayfa); }
export function onYukleAdla(ad) {
  const sayfa = adliSayfalar.get(ad);
  if (!sayfa || sayfa.__indi) return;
  sayfa.__indi = true;   // bir kez yeter (modül bellekte kalır); hata olursa sayfa açılınca normal yol işler
  sayfa.onYukle();
}

/**
 * Tembel sayfaları açılıştan sonra BOŞTA önceden indirir (8 Eki 2026). Soğuk açılışın kritik
 * yolunda değiller, ama oyuncu maça girdiği anda ağa muhtaç da kalmazlar: Klasik maç sayfası 7 Eki'de
 * tembelleşince eşleşme anında parça inmesi gerekti; açık sekmede yeni dağıtım olduysa eski parça
 * adı sunucuda yok → yenileme / hata kartı, bu arada maç sunucuda başlayıp ilerliyordu.
 */
export function bostaOnYukle(sayfalar, gecikmeMs = 4000) {
  if (typeof window === "undefined") return;
  const calis = () => { for (const sayfa of sayfalar) sayfa?.onYukle?.(); };
  const basla = () => setTimeout(() => {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(calis, { timeout: 3000 });
    else calis();
  }, gecikmeMs);
  if (document.readyState === "complete") basla();
  else window.addEventListener("load", basla, { once: true });
}

/** Başarısız kalan tembel sayfaların kaydını yeniler (bir sonraki çizimde parça yeniden istenir). */
export function tembelleriSifirla() {
  for (const kur of basarisizlar) kur();
  basarisizlar.clear();
}

/** Hata bir parça (chunk) yükleme hatası mı? Sayfa içi kart doğru metni seçsin diye. */
export function parcaHatasiMi(hata) {
  const m = String(hata?.message ?? hata ?? "");
  return /dynamically imported module|Importing a module script failed|preload CSS|Unable to preload|Failed to fetch|Load failed|error loading dynamically|ChunkLoadError/i.test(m);
}

// ------------------------------------------------------------ vite:preloadError
// Yeni dağıtımdan sonra eski parça adları (hash) sunucuda yoktur → parça inmez.
// Çare sayfayı yenilemek: en çok YENILEME_ARALIK_MS'de bir (sessionStorage'da son yenileme anı).
// 8 Eki 2026: eskiden oturum başına TEK yenilemeydi; aynı sekmede ikinci dağıtımdan sonra parça
// inmeyince yenileme yapılmıyor, maç sayfası hata kartında kalıyordu (maç sunucuda sürüyordu).
// Aralık döngüyü yine engeller: yenilemeden hemen sonra da inmeyen parça hata kartına gider.
// Çevrimdışıyken yenilenmez (tarayıcının "bağlantı yok" sayfasına düşülmesin) — hata sayfa içi
// karta gider, bağlantı gelince kart kendiliğinden yeniden dener. Bayrak okunamazsa (gizli mod)
// yenileme YAPILMAZ: döngü riski alınmaz.
const BAYRAK = "qt_parca_yenile";
const YENILEME_ARALIK_MS = 60000;

/**
 * Parça inemediğinde sayfayı yeniler (aralık bayrağı döngüyü engeller). true = yenileme başlatıldı.
 * vite:preloadError ve tembelYukle'nin son hatası aynı bayrağı paylaşır (çift yenileme olmaz).
 */
function parcaIcinYenile(kaynak, ayrinti = "") {
  try {
    if (typeof window === "undefined") return false;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
    const gecen = Date.now() - Number(sessionStorage.getItem(BAYRAK) || 0);
    if (gecen >= 0 && gecen < YENILEME_ARALIK_MS) return false;   // az önce yenilendi — döngü yok
    sessionStorage.setItem(BAYRAK, String(Date.now()));
    console.warn(`[Bildim] sayfa parçası inemedi (yeni sürüm?) — sayfa yenileniyor (${kaynak}):`, ayrinti);
    return otomatikYenile("parca");   // ortak sigorta (src/lib/yenilemeSigortasi.js)
  } catch {
    return false;   // depolama kapalı: yenileme yapılmaz, hata sayfa içi karta gider
  }
}

export function parcaYenilemeKur() {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (olay) => {
    if (sessizOnYukleme > 0) return;   // boşta önceden indirme: oyuncunun önündeki sayfa yenilenmez
    if (parcaIcinYenile("preload", olay?.payload?.message ?? "")) olay.preventDefault();
  });
}
