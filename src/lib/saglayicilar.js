// Giriş sayfası ve Profil › Hesabımı güvenceye al aynı sağlayıcı kapısını kullanır (Paket 20 III: Login.jsx'ten taşındı).

// Hangi sosyal düğmeler gösterilecek?
//
// supabase-js signInWithOAuth sağlayıcıyı DOĞRULAMADAN tarayıcıyı Supabase'e
// yönlendirir. Sağlayıcı panelde kapalıysa oyuncu uygulamadan çıkıp ham JSON
// hata sayfasında ("Unsupported provider") kalıyordu — yukarıdaki Türkçe hata
// çevirisi hiç çalışmıyor, çünkü hata istemciye dönmüyor.
// Bu yüzden kapalı sağlayıcının düğmesi hiç basılmaz. X/Meta anahtarları
// Supabase'e girilince .env'e `VITE_SOSYAL=google,facebook,twitter` yaz;
// düğmeler geri gelir. Kod silinmedi, yalnız kapıya bağlandı.
export const ACIK_SAGLAYICILAR = new Set(
  String(import.meta.env.VITE_SOSYAL ?? "google,facebook")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

// Sağlayıcı Supabase panelinde AÇIK MI? Auth'un herkese açık `settings`
// ucundan öğreniliyor. Böylece kapalı bir sağlayıcıya basan oyuncu ham
// JSON hata sayfasına düşmüyor, Türkçe mesaj görüyor.
export async function acikSaglayicilariOku() {
  try {
    const kok = import.meta.env.VITE_SUPABASE_URL;
    if (!kok) return null;
    const yanit = await fetch(`${kok}/auth/v1/settings`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "" },
    });
    if (!yanit.ok) return null;
    const veri = await yanit.json();
    return veri?.external ?? null;
  } catch (e) {
    console.error("[Bildim] saglayici listesi okunamadi:", e);
    return null;   // bilinmiyor: düğmeler eskisi gibi çizilir
  }
}

// E-POSTA İLE GİRİŞ/BAĞLAMA GEÇİCİ KAPALI (2 Eki 2026).
// Supabase varsayılan e-posta servisi yalnız proje ekibinin adreslerine mail yollar; diğer herkese
// "Email address not authorized" döner (bounce oranı uyarısı geldi). Kalıcı çözüm: özel SMTP + alan adı.
// Geri açmak için `true` yap. Sahip/test için gizli kapı: adreste `?eposta=1`.
export const EPOSTA_GIRIS_ACIK = false;

// FACEBOOK DÜĞMESİ GİZLİ (2 Eki 2026): canlıda sağlayıcı kapalı (auth/v1/settings › external.facebook=false).
// Geri açmak için `true` yap; düğmeye bağlı kod ve metinler yerinde durur.
export const FACEBOOK_GIRIS_ACIK = false;

/** E-posta yolu bu oturumda görünsün mü? (bayrak ya da ?eposta=1 gizli kapısı) */
export function epostaGirisGorunur() {
  if (EPOSTA_GIRIS_ACIK) return true;
  try {
    return new URLSearchParams(window.location.search).get("eposta") === "1";
  } catch (e) {
    console.warn("[Bildim] eposta kapısı okunamadı:", e?.message ?? e);
    return false;
  }
}
