// SON BİLİNEN VERİ (12 Eki 2026) — soğuk açılışta "önce yanlış sonra doğru" kaymasını önlemek için
// son okunan sunucu yanıtının tarayıcıdaki kopyası. YALNIZ ilk çizimde kullanılır; sunucu yine okunur ve
// gelen yanıt hem ekrana hem buraya yazılır. Kullanıcıya ait kayıtlar oturumdaki kimlikle (AuthContext'in
// profil önbelleği, qt_profil_onbellek) anahtarlanır → başka hesapla açılan cihazda eski kişinin verisi görünmez.
// Depolama kapalıysa (özel mod) her şey sessizce null döner: sayfa iskeletle açılır, bozulmaz.

const ONEK = "qt_sb_";

/** Oturumdaki kullanıcının kimliği (AuthContext profil önbelleğinden; yoksa null). */
export function benKimlik() {
  try {
    const o = JSON.parse(localStorage.getItem("qt_profil_onbellek") ?? "null");
    return o?.id ?? null;
  } catch {
    return null;
  }
}

function anahtarBul(ad, genel) {
  if (genel) return ONEK + ad;
  const ben = benKimlik();
  return ben ? `${ONEK}${ad}_${ben}` : null;
}

/** Kayıt yoksa `undefined` (kayıtlı null ile ayrılır: "sunucu boş dedi" bilinen bir durumdur). */
export function sonBilinenOku(ad, { genel = false } = {}) {
  try {
    const k = anahtarBul(ad, genel);
    if (!k) return undefined;
    const ham = localStorage.getItem(k);
    if (ham == null) return undefined;
    const o = JSON.parse(ham);
    return o && typeof o === "object" && "v" in o ? o.v : undefined;
  } catch {
    return undefined;
  }
}

export function sonBilinenYaz(ad, deger, { genel = false } = {}) {
  try {
    const k = anahtarBul(ad, genel);
    if (!k) return;
    if (deger === undefined) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify({ v: deger, an: Date.now() }));
  } catch { /* depolama dolu / kapalı: yalnız önbellek eksik kalır */ }
}
