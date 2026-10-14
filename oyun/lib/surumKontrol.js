// ============================================================
// YENİ SÜRÜM DENETİMİ — açık kalan eski sekmenin yeni dağıtımı fark etmesi
//
// Derleme `dist/version.json` ({ "surum": "<kimlik>" }) yazar (vite.config.js) ve aynı kimliği istemciye
// `__QT_SURUM__` olarak gömer. Burada version.json yoklanır; kimlik farklıysa `degisti()` çağrılır.
// Yoklama anları: açılıştan 60 sn sonra · sonra 5 dk'da bir · sekme görünür olunca · ağ gelince.
// Sekme gizliyken yoklanmaz. Hata kullanıcıya gösterilmez (oturumda tek konsol uyarısı).
// Yeni sürüm fark edilince açılış dosyaları arka planda önceden iner (yeniSurumuOnYukle).
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
  return { surum: typeof veri?.surum === "string" ? veri.surum : "", onYukle: Array.isArray(veri?.on_yukle) ? veri.on_yukle : [] };
}

// ------------------------------------------------------------------ Paket B/3 (15 Eki 2026)
// YENİ SÜRÜMÜ ARKA PLANDA ÖNCEDEN İNDİRME. Yeni dağıtım fark edilince version.json › on_yukle (vite.config.js: giriş + main +
// sekme/maç sayfaları, CSS dahil) düşük öncelikle, ikişer ikişer indirilir; SW (public/sw.js) /assets/*'i önbelleğe yazar
// (SW yoksa tarayıcı önbelleği: /assets değişmez ve uzun ömürlü). Sonraki açılış (yenile bandı ya da uygulama yeniden
// açılınca) dosyaları ağdan beklemez. ZORLA YENİLEME YOK — sayfa eski sürümle sürer; yenileme sigortasına dokunulmaz.
// Maçta (body.bd-oyun-modu), veri tasarrufunda ve 2G'de beklenir / yapılmaz. three.js gibi büyük, nadir paketler atlanır.
const ON_YUKLE_ATLA = /\/assets\/three\.module-/;
let onYuklendi = false;
export function yeniSurumuOnYukle(liste) {
  if (onYuklendi || !Array.isArray(liste) || !liste.length || typeof window === "undefined") return;
  try {
    const bag = navigator.connection;
    if (bag?.saveData || /2g/.test(String(bag?.effectiveType ?? ""))) return;
  } catch { /* bağlantı bilgisi yok */ }
  onYuklendi = true;
  const kuyruk = liste.filter((a) => typeof a === "string" && a.startsWith("/assets/") && !ON_YUKLE_ATLA.test(a));
  const bekle = (ms) => new Promise((coz) => setTimeout(coz, ms));
  const isci = async () => {
    while (kuyruk.length) {
      // maç sürerken bant genişliği maçın: maç bitene kadar 30 sn'de bir bakılır
      while (document.body?.classList.contains("bd-oyun-modu")) await bekle(30000);
      const adres = kuyruk.shift();
      try { await fetch(adres, { credentials: "same-origin", priority: "low" }); } catch { /* ağ yok: bir sonraki açılış normal iner */ }
    }
  };
  setTimeout(() => { isci(); isci(); }, 3000);
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
      const { surum: sunucu, onYukle } = await sunucuSurumu();
      if (!bitti && sunucu && sunucu !== mevcut) {
        bitti = true;
        degisti(sunucu);
        yeniSurumuOnYukle(onYukle);
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
