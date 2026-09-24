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

const BEKLEME_MS = 700;
const basarisizlar = new Set();

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/** lazy() yerine: aynı imza, yalnız 1 yeniden deneme + sıfırlanabilir. */
export function tembelYukle(yukleyici) {
  let tembel = null;
  const kur = () => {
    tembel = lazy(async () => {
      try {
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
  return TembelSayfa;
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
// Çare sayfayı BİR KEZ yenilemek (oturum başına; sessionStorage bayrağı). Çevrimdışıyken
// yenilenmez (tarayıcının "bağlantı yok" sayfasına düşülmesin) — hata sayfa içi karta gider,
// bağlantı gelince kart kendiliğinden yeniden dener. Bayrak okunamazsa (gizli mod) yenileme
// YAPILMAZ: döngü riski alınmaz.
const BAYRAK = "qt_parca_yenile";

export function parcaYenilemeKur() {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (olay) => {
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      if (sessionStorage.getItem(BAYRAK)) return;   // bu oturumda zaten bir kez yenilendi
      sessionStorage.setItem(BAYRAK, String(Date.now()));
      olay.preventDefault();
      console.warn("[Bildim] sayfa parçası inemedi (yeni sürüm?) — sayfa bir kez yenileniyor:", olay?.payload?.message ?? "");
      window.location.reload();
    } catch {
      /* depolama kapalı: yenileme yapılmaz, hata sayfa içi karta gider */
    }
  });
}
