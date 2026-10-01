// Avatar nadirliği (770): ham <img> çizen yerler için ortak parçalar.
//  · NadirlikImg — özgün <img> gibi kullanılır; bayrak açıkken Sahne zemini nadirlik renginde çıkar.
//  · AvatarBolumBasligi — seçim ızgaralarında "● Efsanevi · 8" başlığı (ızgaranın tam genişliği).
// Renk/harita mantığı: src/lib/avatarNadirlik.js (Avatar.jsx ile aynı kaynak).
import { NADIRLIK_AD, NADIRLIK_RENK, useNadirlikSahneli } from "../../src/lib/avatarNadirlik.js";
import { aktifDil } from "../lib/dil.js";
import "../tasarim/ekranlar/avatar-bolum.css";

export function NadirlikImg({ src, ...oz }) {
  const sahneli = useNadirlikSahneli(src);
  return <img src={sahneli ?? src} {...oz} />;
}

export function AvatarBolumBasligi({ nadirlik, sayi, as: Etiket = "div" }) {
  const ad = NADIRLIK_AD[nadirlik]?.[aktifDil() === "en" ? "en" : "tr"] ?? nadirlik;
  return (
    <Etiket className="qt-av-bolum" role="heading" aria-level={3} data-nadirlik={nadirlik}>
      <i className="qt-av-bolum-nokta" style={{ background: NADIRLIK_RENK[nadirlik] }} aria-hidden="true" />
      <span>{ad} · {sayi}</span>
    </Etiket>
  );
}
