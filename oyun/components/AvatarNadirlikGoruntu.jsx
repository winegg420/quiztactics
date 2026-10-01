// Avatar nadirliği (770): ham <img> çizen yerler için ortak parçalar.
//  · NadirlikImg — özgün <img> gibi kullanılır; bayrak açıkken Sahne zemini nadirlik renginde çıkar.
//  · AvatarBolumBasligi — seçim ızgaralarında "● Efsanevi · 8" başlığı (ızgaranın tam genişliği).
// Renk/harita mantığı: src/lib/avatarNadirlik.js (Avatar.jsx ile aynı kaynak).
import { NADIRLIK_AD, NADIRLIK_RENK, useNadirlikSahneli } from "../../src/lib/avatarNadirlik.js";
import { aktifDil } from "../lib/dil.js";
import { QtIkon } from "../tasarim/index.js";
import "../tasarim/ekranlar/avatar-bolum.css";

export function NadirlikImg({ src, ...oz }) {
  const sahneli = useNadirlikSahneli(src);
  return <img src={sahneli ?? src} {...oz} />;
}

/**
 * 820: kilitli (sahip olunmayan Epik / Efsanevi) avatarın köşesindeki kilit. Ebeveyn düğmeye `qt-av-kilitli` sınıfı
 * verilir (resim soluklaşır, rozet sağ alta oturur). Kilit kararı sunucuda; bu yalnız gösterge.
 */
export function AvatarKilitRozeti() {
  return <span className="qt-av-kilit" aria-hidden="true"><QtIkon ad="kilit" boyut={12} /></span>;
}

/** Avatar nadirliği (yaygin|nadir|epik|efsanevi) → dükkân köşe etiketi sözlüğü (siradan|…); Yaygın'da etiket yok. */
export const etiketNadirligi = (nadirlik) => (["nadir", "epik", "efsanevi"].includes(nadirlik) ? nadirlik : null);

export function AvatarBolumBasligi({ nadirlik, sayi, as: Etiket = "div" }) {
  const ad = NADIRLIK_AD[nadirlik]?.[aktifDil() === "en" ? "en" : "tr"] ?? nadirlik;
  return (
    <Etiket className="qt-av-bolum" role="heading" aria-level={3} data-nadirlik={nadirlik}>
      <i className="qt-av-bolum-nokta" style={{ background: NADIRLIK_RENK[nadirlik] }} aria-hidden="true" />
      <span>{ad} · {sayi}</span>
    </Etiket>
  );
}
