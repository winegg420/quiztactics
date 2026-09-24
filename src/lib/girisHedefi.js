// Giriş sonrası "nereye dönecektik" bilgisini saklar.
//
// NEDEN GEREKLİ: Supabase, OAuth/e-posta dönüşünde `redirectTo` adresini
// panelde tanımlı izin listesine göre doğrular. İzinli değilse sessizce
// Site URL'ine düşer. Bu durumda davet linkiyle gelen oyuncu giriş yaptıktan
// sonra davet sayfasına değil ana sayfaya iner.
//
// Çözüm: hedefi girişten ÖNCE tarayıcıda saklarız, oturum açılınca oraya
// döneriz. Böylece panel ayarı ne olursa olsun derin bağlantılar çalışır.

const ANAHTAR = "idagg_giris_hedefi";
// Eski bir hedefin çok sonra tetiklenmemesi için kısa ömür.
const OMUR_MS = 15 * 60 * 1000;

// Paket 41 I: uygulamanın tanıdığı ilk yol parçaları (BildimApp rotalarıyla aynı).
// Bilinmeyen adres hedef olarak saklanmaz; giriş sonrası ana sayfaya inilir.
const BILINEN = new Set(["", "giris", "turnuva", "meydan", "mac", "grup-mac", "hizli-mac", "siralama", "arkadaslar",
  "mesajlar", "davet", "joker", "hizli-mod", "duello", "calisma", "harita", "harita-deneme", "gorunum",
  "gorunum-3b", "profil", "gizlilik", "kosullar", "insan-prototip", "oyun", "bildim", "ses-secim",
  "cerceve-onizleme", "avatar-onizleme", "premium-onizleme", "ikon-onizleme"]);
export function bilinenYol(yol) {
  if (typeof yol !== "string") return false;
  return BILINEN.has(yol.split("?")[0].split("/")[1] ?? "");
}

// Giriş ekranına yönlendiren yollar hedef olarak saklanmaz.
function hedefeUygunMu(yol) {
  if (typeof yol !== "string" || !yol.startsWith("/")) return false;
  if (yol.startsWith("//")) return false; // protokolsüz dış adres
  if (!bilinenYol(yol)) return false;
  return yol !== "/";
}

export function girisHedefiniKaydet(yol) {
  try {
    const hedef =
      yol ?? window.location.pathname + window.location.search;
    if (!hedefeUygunMu(hedef)) {
      window.localStorage.removeItem(ANAHTAR);
      return;
    }
    window.localStorage.setItem(
      ANAHTAR,
      JSON.stringify({ yol: hedef, zaman: Date.now() })
    );
  } catch {
    /* özel sekme / depolama kapalı — sessiz geç */
  }
}

// Saklanan hedefi döndürür ve siler (tek kullanımlık).
export function girisHedefiniAl() {
  try {
    const ham = window.localStorage.getItem(ANAHTAR);
    if (!ham) return null;
    window.localStorage.removeItem(ANAHTAR);
    const { yol, zaman } = JSON.parse(ham);
    if (!hedefeUygunMu(yol)) return null;
    if (!zaman || Date.now() - zaman > OMUR_MS) return null;
    return yol;
  } catch {
    return null;
  }
}
