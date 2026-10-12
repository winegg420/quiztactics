// ============================================================
// YENİ SÜRÜM DENETİMİ — açık kalan eski sekmenin yeni dağıtımı fark etmesi
//
// Derleme `dist/version.json` ({ "surum": "<kimlik>" }) yazar (vite.config.js) ve aynı kimliği istemciye
// `__QT_SURUM__` olarak gömer. Burada version.json yoklanır; kimlik farklıysa `degisti()` çağrılır.
// Yoklama anları: açılıştan 60 sn sonra · sonra 5 dk'da bir · sekme görünür olunca · ağ gelince.
// Sekme gizliyken yoklanmaz. Hata kullanıcıya gösterilmez (oturumda tek konsol uyarısı).
// ============================================================
const ACILIS_MS = 60000;
const ARALIK_MS = 5 * 60000;
const EN_AZ_ARA_MS = 15000;   // art arda tetikleyiciler (görünür + online) tek yoklamaya insin

/** Bu paketin gömülü derleme kimliği; geliştirmede/tanımsızken boş (denetim kapalı). */
export function mevcutSurum() {
  try {
    const k = typeof __QT_SURUM__ !== "undefined" ? String(__QT_SURUM__) : "";
    return k === "dev" ? "" : k;
  } catch {
    return "";
  }
}

let uyarildi = false;

async function sunucuSurumu() {
  const yanit = await fetch(`/version.json?k=${Date.now()}`, { cache: "no-store" });
  if (!yanit.ok) throw new Error(`version.json ${yanit.status}`);
  const veri = await yanit.json();
  return typeof veri?.surum === "string" ? veri.surum : "";
}

/** Denetimi başlatır; kimlik değişince `degisti(yeniKimlik)` bir kez çağrılır. Dönüş: temizleme işlevi. */
export function surumKontrolBaslat(degisti) {
  const mevcut = mevcutSurum();
  if (!mevcut || typeof window === "undefined" || typeof document === "undefined") return () => {};
  let bitti = false;
  let sonYoklama = 0;
  let sureliyor = false;

  const yokla = async () => {
    if (bitti || sureliyor || document.hidden) return;
    if (Date.now() - sonYoklama < EN_AZ_ARA_MS) return;
    sonYoklama = Date.now();
    sureliyor = true;
    try {
      const sunucu = await sunucuSurumu();
      if (!bitti && sunucu && sunucu !== mevcut) {
        bitti = true;
        degisti(sunucu);
      }
    } catch (e) {
      if (!uyarildi) {
        uyarildi = true;
        console.warn("[Bildim] sürüm denetimi yapılamadı:", e?.message ?? e);
      }
    } finally {
      sureliyor = false;
    }
  };

  const gorunur = () => { if (!document.hidden) yokla(); };
  const acilis = setTimeout(yokla, ACILIS_MS);
  const aralik = setInterval(yokla, ARALIK_MS);
  document.addEventListener("visibilitychange", gorunur);
  window.addEventListener("online", yokla);
  return () => {
    bitti = true;
    clearTimeout(acilis);
    clearInterval(aralik);
    document.removeEventListener("visibilitychange", gorunur);
    window.removeEventListener("online", yokla);
  };
}
