// ============================================================
// MAÇ ÜST ŞERİDİ (Paket 41 B + E + H) — bütün maç ekranlarında aynı yer, aynı görünüm:
//   sol: maçtan çık (X)   ·   orta: mod rozeti   ·   sağ: ses aç/kapa
// Klasik, Saf Bilgi, Düello, Grup, Turnuva ve Çalışma turu bunu kullanır.
// Dokunma hedefleri 44×44 (Paket 41 J). Ses tercihi bildim_ses (Profil › Ayarlar ile ortak).
// Tasarım A (Şerit M1): QtIkonDugme + QtRozet; ses düğmesi SesDugmesi ile aynı mantık.
// ============================================================
import { useEffect, useState } from "react";
import { QtAvatar, QtIkonDugme, QtRozet } from "../tasarim/index.js";
import { LIG_ADLARI } from "../lib/lig.js";
import { sesAcikMi, sesAyarla, sesDinle, sesDokunus, sesKilidiAc } from "../lib/ses.js";
import { tt } from "../lib/dil.js";
import "../tasarim/ekranlar/m1-mac.css";
import "../tasarim/ekranlar/mac-oyuncu.css";

function SesAnahtari() {
  const [acik, setAcik] = useState(() => sesAcikMi());
  // Başka yerden (Profil › Ayarlar, avatar menüsü) değişirse bu düğme de güncellensin
  useEffect(() => sesDinle(setAcik), []);
  const degistir = () => {
    try {
      const yeni = !acik;
      sesAyarla(yeni);
      setAcik(yeni);
      if (yeni) {
        sesKilidiAc();
        sesDokunus();
      }
    } catch {
      /* ses motoru yoksa arayüz yine çalışsın */
    }
  };
  return (
    <QtIkonDugme
      tur="saydam"
      ikon={acik ? "sesAcik" : "sesKapali"}
      etiket={acik ? tt("Sesi kapat") : tt("Sesi aç")}
      aria-pressed={acik}
      onClick={degistir}
    />
  );
}

/** Oyuncu adının altındaki "Lv n · Lig" satırı (Klasik/Düello şeridi, çok oyunculu şerit). */
export function SeviyeEtiketi({ level, lig }) {
  if (!level && !lig) return null;
  return (
    <span className="mo-seviye">
      {level ? <b className="mo-lv">{tt("Lv {n}", { n: level })}</b> : null}
      {lig ? <span className={`mo-lig mo-lig--${lig}`}>{LIG_ADLARI[lig] ?? lig}</span> : null}
    </span>
  );
}

/**
 * Çok oyunculu modlar (Turnuva, Grup): oyuncu = { ad, avatar, level, lig } kendi avatarın,
 * sayi = "12/40 oyuncu kaldı" gibi kısa metin. İkisi de verilmezse şerit eskisi gibidir.
 */
export default function MacUstSerit({ onCik, cikisEtiketi, rozet, oyuncu, sayi }) {
  return (
    <>
    <div className="m1-ust">
      {onCik ? (
        <QtIkonDugme tur="saydam" ikon="carpi" etiket={cikisEtiketi ?? tt("Maçtan çık")} onClick={onCik} />
      ) : (
        <span className="m1-ust-bosluk" aria-hidden="true" />
      )}
      <span className="m1-ust-orta">{rozet ? <QtRozet ton="koyu">{rozet}</QtRozet> : null}</span>
      <SesAnahtari />
    </div>
    {(oyuncu || sayi) && (
      <div className="mo-coklu">
        {oyuncu && (
          <span className="mo-ben">
            <QtAvatar src={oyuncu.avatar} ad={oyuncu.ad} boyut="s" halka="vurgu" />
            <span className="mo-ben-yazi"><b>{oyuncu.ad}</b><SeviyeEtiketi level={oyuncu.level} lig={oyuncu.lig} /></span>
          </span>
        )}
        {sayi && <span className="mo-sayi"><b>{sayi}</b></span>}
      </div>
    )}
    </>
  );
}
