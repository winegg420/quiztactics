// Avatar nadirliği (770): ham <img> çizen yerler için ortak parçalar.
//  · NadirlikImg — özgün <img> gibi kullanılır; bayrak açıkken Sahne zemini nadirlik renginde çıkar.
//  · AvatarBolumBasligi — seçim ızgaralarında "● Efsanevi · 8" başlığı (ızgaranın tam genişliği).
// Renk/harita mantığı: src/lib/avatarNadirlik.js (Avatar.jsx ile aynı kaynak).
import { NADIRLIK_AD, NADIRLIK_RENK, useNadirlikSahneli } from "../../src/lib/avatarNadirlik.js";
import { aktifDil, tt } from "../lib/dil.js";
import { QtIkon } from "../tasarim/index.js";
import { CoinIkon, ElmasIkon } from "./ParaIkonlari.jsx";
import "../tasarim/ekranlar/avatar-bolum.css";

export function NadirlikImg({ src, ...oz }) {
  const sahneli = useNadirlikSahneli(src);
  return <img src={sahneli ?? src} {...oz} />;
}

/**
 * 820: kilitli (sahip olunmayan Epik / Efsanevi) avatarın köşesindeki kilit. Ebeveyn düğmeye `qt-av-kilitli` sınıfı
 * verilir (resim soluklaşır, rozet sağ alta oturur). Kilit kararı sunucuda; bu yalnız gösterge.
 */
export function AvatarKilitRozeti({ s } = {}) {
  // 1039: kilidin yerine edinme işareti — Lv rakamı / Sezon Yolu / coin / elmas (s = avatar_sahiplik_durumu satırı)
  if (s?.edinme === "level" && s.edinme_level) {
    return <span className="qt-av-kilit qt-av-kilit--level" aria-hidden="true">{tt("Lv {n}", { n: s.edinme_level })}</span>;
  }
  if (s?.edinme === "sezon") return <span className="qt-av-kilit qt-av-kilit--sezon" aria-hidden="true"><QtIkon ad="bayrak" boyut={12} /></span>;
  if (s?.edinme === "coin") return <span className="qt-av-kilit qt-av-kilit--para" aria-hidden="true"><CoinIkon boyut={16} /></span>;
  if (s?.edinme === "elmas") return <span className="qt-av-kilit qt-av-kilit--para" aria-hidden="true"><ElmasIkon boyut={16} /></span>;
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
