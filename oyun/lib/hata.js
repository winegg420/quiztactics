import { tt, ttSunucu } from "./dil.js";
import { sesHataUyari } from "./ses.js";
// Supabase/ağ hatalarını kullanıcıya gösterilebilir Türkçe mesaja çevirir.
// HAM SQL HATASI ASLA EKRANA ÇIKMAZ (Hızlı Mod'da "column reference dogru is
// ambiguous" kullanıcıya görünmüştü — bir daha olmasın).

const BILINEN = [
  [/giriş gerekli/i, tt("Oturumun düşmüş görünüyor. Sayfayı yenileyip tekrar dene.")],
  [/jwt|token|expired/i, tt("Oturumun sona erdi. Tekrar giriş yapman gerekiyor.")],
  [/kota|çok fazla|too many/i, tt("Çok hızlı gidiyorsun! Biraz bekleyip tekrar dene.")],
  [/soru bulunamadı/i, tt("Bu kategoride şu an soru yok. Başka bir kategori seç.")],
  [/zaten devam eden bir maçın/i, tt("Bu oyuncuyla süren bir maçın zaten var.")],
  [/rövanş süresi doldu/i, tt("Rövanş süresi doldu (24 saat).")],
  [/arkadaş/i, null], // arkadaşlıkla ilgili sunucu mesajları anlaşılır, olduğu gibi geçir
];

// Ham veritabanı/altyapı hatası kalıpları — kullanıcıya asla gösterilmez
const TEKNIK =
  /(column|relation|function|operator|syntax error|ambiguous|violates|constraint|permission denied|pgrst|duplicate key|null value)/i;

// D-407 / D-503: her ağ/sunucu hatası "İnternetini kontrol et" demesin — hata türüne göre ayrışır.
// Tür yalnız hatanın kendisinden okunur (PostgREST kodu + metin); HTTP durumu supabase-js hata nesnesinde yoktur.
const OFFLINE_KALIBI = /err_internet_disconnected|the internet connection appears to be offline|err_network_changed/i;
const ZAMAN_ASIMI_KALIBI = /statement timeout|canceling statement|gateway time-?out|timed? ?out|aborterror|request was aborted|zaman aşımı/i;
const SUNUCU_KALIBI = /internal server error|bad gateway|service unavailable|<html|upstream|too many connections|remaining connection slots|could not connect to (the )?database/i;
// Tarayıcıların ham ağ hataları ("TypeError: Failed to fetch", Safari "Load failed", Firefox "NetworkError…",
// Supabase "FetchError"): CORS başlıksız 504 de aynı metni verir → çevrimiçiyken "sunucuya ulaşılamıyor".
const AG_KALIBI = /failed to fetch|networkerror|network request failed|load failed|fetcherror/i;

/** @returns {"cevrimdisi"|"zaman_asimi"|"sunucu"|"ag"|"diger"} */
export function hataTuru(hata) {
  try {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return "cevrimdisi";
  } catch { /* navigator yok */ }
  const ham = String(hata?.message ?? hata?.error_description ?? hata ?? "");
  const kod = String(hata?.code ?? "");
  if (OFFLINE_KALIBI.test(ham)) return "cevrimdisi";
  if (kod === "57014" || hata?.name === "AbortError" || ZAMAN_ASIMI_KALIBI.test(ham)) return "zaman_asimi";
  if (/^(XX|53|57P|58|08)/.test(kod) || /^PGRST00[0-3]$/.test(kod) || SUNUCU_KALIBI.test(ham)) return "sunucu";
  if (AG_KALIBI.test(ham)) return "ag";
  return "diger";
}

/** Hata türü → tam cümle (sayfa/kutu metni). "diger" için null. */
export function hataTuruMesaji(tur) {
  switch (tur) {
    case "cevrimdisi": return tt("Bağlantı yok. İnternetini kontrol edip tekrar dene.");
    case "zaman_asimi": return tt("Sunucu geç yanıt verdi. Biraz sonra tekrar dene.");
    case "sunucu": return tt("Sunucuda geçici bir sorun var. Biraz sonra tekrar dene.");
    case "ag": return tt("Sunucuya ulaşılamıyor. Bağlantını kontrol et ya da biraz sonra tekrar dene.");
    default: return null;
  }
}

/**
 * Bir işlemin başarısızlığı: "<ön ek> <sebep>" — ör. ("Rakip aranamadı.", e) →
 * "Rakip aranamadı. Sunucuda geçici bir sorun var. Biraz sonra tekrar dene."
 * Sebep bilinmiyorsa yalnız "Tekrar dene." (bağlantıya yorulmaz).
 */
export function islemHatasi(hata, onEk) {
  return `${tt(onEk)} ${hataTuruMesaji(hataTuru(hata)) ?? tt("Tekrar dene.")}`;
}

/**
 * @param {unknown} hata  Supabase error nesnesi veya Error
 * @param {string} yedek  Duruma özel varsayılan mesaj
 * @returns {string} kullanıcıya gösterilebilir Türkçe mesaj
 */
export function hataMesaji(hata, yedek = tt("Bir şeyler ters gitti. Tekrar dener misin?")) {
  // Ajan H: kullanıcıya gösterilecek hata = "Hata / uyarı" sesi (40 ms kısıtı + tek kopya; görünür sekmede).
  try { if (!document.hidden) sesHataUyari(); } catch { /* ses kritik değil */ }
  const ham = (hata?.message ?? hata?.error_description ?? String(hata ?? "")).trim();
  if (!ham) return yedek;
  // Ağ/sunucu hatası: çevrimdışıyken hemen her hata bağlantıdandır (D-302); değilse tür ayırt edilir (D-407/D-503)
  const turMesaji = hataTuruMesaji(hataTuru(hata));
  if (turMesaji) return turMesaji;

  for (const [kalip, karsilik] of BILINEN) {
    if (kalip.test(ham)) return karsilik ?? ttSunucu(ham);
  }
  // Teknik hata: konsola yaz, kullanıcıya genel mesaj göster
  if (TEKNIK.test(ham)) {
    console.error("[Bildim] teknik hata:", ham);
    return yedek;
  }
  // Sunucunun kendi Türkçe iş kuralı mesajları (raise exception) olduğu gibi
  return ham.length <= 140 ? ttSunucu(ham) : yedek;
}
