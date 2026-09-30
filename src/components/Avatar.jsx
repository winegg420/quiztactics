// Paylaşılan avatar bileşeni (tüm oyunlar kullanır).
//
// Bildim gizlilik güncellemesinden sonra profiller `gorunen_ad` /
// `gorunen_avatar` döndürüyor; diğer modüller hâlâ `username` /
// `avatar_url` gönderiyor. Bu yüzden ikisini de kabul eder.
//
// ============================================================
// AVATAR = SEÇİLEN AVATAR FOTOĞRAFI (13 Eylül 2026 kararı)
//
// Oyunda ve profilde görünen şey, kurulumda seçilen hazır avatar ikonudur
// (`/avatars/pro/*.svg`) ya da onaylanmış Google fotoğrafı. Yoksa baş harf.
//
// BURADA 3B KARAKTER ÇİZİLMEZ. 3B karakter YALNIZ MEYDANDA yaşar
// (`oyun/avatar3d/`); listelerde, maç ekranında, lig tablosunda,
// turnuva podyumunda işi yoktur.
//
// 2B PatiRun karakter sistemi (`oyun/karakter/`) de buradan ÇIKTI.
// Dosyalar depoda duruyor ama hiçbir ekran onları çağırmıyor.
// ============================================================

import { useNadirlikSahneli } from "../lib/avatarNadirlik.js";

export default function Avatar({ profile, boyut = 42 }) {
  const ad = profile?.gorunen_ad ?? profile?.username ?? "?";
  const gorsel =
    profile?.gorunen_avatar !== undefined
      ? profile.gorunen_avatar
      : profile?.avatar_url;
  const harf = ad.charAt(0).toUpperCase();
  // 700: bayrak açıkken Sahne zemini nadirlikten türer; kapalıyken null → özgün adres
  const sahneli = useNadirlikSahneli(gorsel);

  return (
    <div
      className={gorsel ? "avatar" : "avatar avatar--harf"}
      style={{ width: boyut, height: boyut, fontSize: boyut * 0.4 }}
    >
      {gorsel ? (
        <img src={sahneli ?? gorsel} alt={ad} referrerPolicy="no-referrer" />
      ) : (
        harf
      )}
    </div>
  );
}
