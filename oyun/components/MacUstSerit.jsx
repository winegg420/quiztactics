// ============================================================
// MAÇ ÜST ŞERİDİ (Paket 41 B + E + H) — bütün maç ekranlarında aynı yer, aynı görünüm:
//   sol: maçtan çık (X)   ·   orta: mod rozeti   ·   sağ: ses aç/kapa
// Klasik, Saf Bilgi, Düello, Grup, Turnuva ve Çalışma turu bunu kullanır.
// Dokunma hedefleri 44×44 (Paket 41 J). Ses tercihi bildim_ses (Profil › Ayarlar ile ortak).
// Tasarım A (Şerit M1): QtIkonDugme + QtRozet; ses düğmesi SesDugmesi ile aynı mantık.
// ============================================================
import { useEffect, useState } from "react";
import { QtIkonDugme, QtRozet } from "../tasarim/index.js";
import CerceveliAvatar from "./CerceveliAvatar.jsx";
import OyuncuLigAmblemi from "./OyuncuLigAmblemi.jsx";
import { LIGLER } from "../tasarim/premium/ligAmblemi.jsx";
import { useOyuncuSeviyeleri } from "../lib/oyuncuSeviye.js";
import { LIG_ADLARI } from "../lib/lig.js";
import { muzikAcikMi, muzikAyarla, muzikDinle, sesAcikMi, sesAyarla, sesDinle, sesDokunus, sesKilidiAc } from "../lib/ses.js";
import { tt } from "../lib/dil.js";
import "../tasarim/ekranlar/m1-mac.css";
import "../tasarim/ekranlar/mac-oyuncu.css";

// Ajan H: maç içindeki tek düğme "tam sessizlik" — efektleri VE müziği birlikte kapatır/açar.
// Ayrı ayar avatar menüsü ve Profil › Ayarlar'da (Müzik · Efektler).
function SesAnahtari() {
  const [acik, setAcik] = useState(() => sesAcikMi() || muzikAcikMi());
  // Başka yerden (Profil › Ayarlar, avatar menüsü) değişirse bu düğme de güncellensin
  useEffect(() => {
    const tazele = () => setAcik(sesAcikMi() || muzikAcikMi());
    const b1 = sesDinle(tazele);
    const b2 = muzikDinle(tazele);
    return () => { b1(); b2(); };
  }, []);
  const degistir = () => {
    try {
      const yeni = !acik;
      sesAyarla(yeni);
      muzikAyarla(yeni);
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

/**
 * Oyuncu adının altındaki "Lv n · lig" satırı (Klasik/Düello şeridi, çok oyunculu şerit).
 * 560: lig adı yerine lig amblemi (önizlemedeki gibi) — telefonda nokta/tek harfe inmez, skora binmez;
 * lig adı amblemin erişilebilir adında. Amblem çizilemezse (bilinmeyen lig) eski ad hapı.
 */
export function SeviyeEtiketi({ level, lig }) {
  if (!level && !lig) return null;
  const bilinen = LIGLER.includes(lig);
  return (
    <span className="mo-seviye">
      {level ? <b className="mo-lv">{tt("Lv {n}", { n: level })}</b> : null}
      {lig && bilinen ? <OyuncuLigAmblemi lig={lig} boyut={18} className="mo-amblem" /> : null}
      {lig && !bilinen ? <span className={`mo-lig mo-lig--${lig}`}>{LIG_ADLARI[lig] ?? lig}</span> : null}
    </span>
  );
}

/**
 * Çok oyunculu modlar (Turnuva, Grup): oyuncu = { id, ad, avatar, level, lig } kendi avatarın (çerçeveli;
 * lig/level verilmezse oyuncu kartından okunur),
 * sayi = "12/40 oyuncu kaldı" gibi kısa metin. İkisi de verilmezse şerit eskisi gibidir.
 */
export default function MacUstSerit({ onCik, cikisEtiketi, rozet, oyuncu, sayi }) {
  const kartlar = useOyuncuSeviyeleri(oyuncu?.id ? [oyuncu.id] : []);
  const kart = oyuncu?.id ? kartlar[oyuncu.id] : undefined;
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
            <CerceveliAvatar profile={{ gorunen_ad: oyuncu.ad, gorunen_avatar: oyuncu.avatar }} userId={oyuncu.id} boyut={40} kart={kart} />
            <span className="mo-ben-yazi"><b>{oyuncu.ad}</b><SeviyeEtiketi level={oyuncu.level ?? kart?.level} lig={oyuncu.lig ?? kart?.lig} /></span>
          </span>
        )}
        {sayi && <span className="mo-sayi"><b>{sayi}</b></span>}
      </div>
    )}
    </>
  );
}
