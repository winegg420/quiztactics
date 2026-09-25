// ============================================================
// MAÇ ÜST ŞERİDİ (Paket 41 B + E + H) — bütün maç ekranlarında aynı yer, aynı görünüm:
//   sol: maçtan çık (X)   ·   orta: mod rozeti   ·   sağ: ses (pencere: Müzik · Efektler)
// Klasik, Saf Bilgi, Düello, Grup, Turnuva ve Çalışma turu bunu kullanır.
// Dokunma hedefleri 44×44 (Paket 41 J). Ses tercihi bildim_ses (Profil › Ayarlar ile ortak).
// Tasarım A (Şerit M1): QtIkonDugme + QtRozet; ses düğmesi SesDugmesi ile aynı mantık.
// ============================================================
import { useEffect, useId, useRef, useState } from "react";
import { QtAnahtar, QtIkonDugme, QtRozet } from "../tasarim/index.js";
import OyuncuAdiDugmesi from "./OyuncuAdiDugmesi.jsx";
import CerceveliAvatar from "./CerceveliAvatar.jsx";
import UnvanYazisi from "./UnvanYazisi.jsx";
import OyuncuLigAmblemi from "./OyuncuLigAmblemi.jsx";
import { LIGLER } from "../tasarim/premium/ligAmblemi.jsx";
import { useOyuncuSeviyeleri } from "../lib/oyuncuSeviye.js";
import { LIG_ADLARI } from "../lib/lig.js";
import { muzikAcikMi, muzikAyarla, muzikDinle, sesAcikMi, sesAyarla, sesDinle, sesDokunus, sesKilidiAc } from "../lib/ses.js";
import { tt } from "../lib/dil.js";
import { sesMetni } from "../lib/ceviri/ses.js";
import "../tasarim/ekranlar/m1-mac.css";
import "../tasarim/ekranlar/mac-oyuncu.css";
import "../tasarim/ekranlar/mac-ses.css";

// Ajan C (24 Eyl 2026): maç içindeki hoparlör düğmesi küçük bir pencere açar — "Müzik" ve "Efektler"
// iki ayrı anahtar. Kaynak Profil › Ayarlar ve avatar menüsüyle AYNI: bildim_muzik (muzikAyarla) +
// bildim_ses (sesAyarla); biri değişince öteki ekranlar `bildim-muzik` / `bildim-ses` olayıyla eşitlenir.
// Pencere düğmenin altında `position: absolute` (fixed + transform tuzağı yok); dışarı dokunmak ve Esc kapatır.
function SesAnahtari() {
  const [efekt, setEfekt] = useState(() => sesAcikMi());
  const [muzik, setMuzik] = useState(() => muzikAcikMi());
  const [acik, setAcik] = useState(false);
  const kap = useRef(null);
  const dugme = useRef(null);
  const panelId = useId();
  // Başka yerden (Profil › Ayarlar, avatar menüsü) değişirse bu düğme de güncellensin
  useEffect(() => {
    const b1 = sesDinle(setEfekt);
    const b2 = muzikDinle(setMuzik);
    return () => { b1(); b2(); };
  }, []);
  // Pencere açıkken: dışarı dokunmak ve Esc kapatır
  useEffect(() => {
    if (!acik) return undefined;
    const disari = (e) => {
      if (kap.current && !kap.current.contains(e.target)) setAcik(false);
    };
    const tus = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setAcik(false);
        try { dugme.current?.focus({ preventScroll: true }); } catch { /* odak verilemedi */ }
      }
    };
    document.addEventListener("pointerdown", disari, true);
    document.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("pointerdown", disari, true);
      document.removeEventListener("keydown", tus);
    };
  }, [acik]);
  const efektDegis = (yeni) => {
    try {
      sesAyarla(yeni);
      setEfekt(yeni);
      if (yeni) {
        sesKilidiAc();
        sesDokunus();
      }
    } catch {
      /* ses motoru yoksa arayüz yine çalışsın */
    }
  };
  const muzikDegis = (yeni) => {
    try {
      if (yeni) sesKilidiAc();
      muzikAyarla(yeni);
      setMuzik(yeni);
    } catch {
      /* müzik motoru yoksa arayüz yine çalışsın */
    }
  };
  const herhangi = efekt || muzik;
  return (
    <span className="m1-ses" ref={kap}>
      <QtIkonDugme
        ref={dugme}
        tur="saydam"
        ikon={herhangi ? "sesAcik" : "sesKapali"}
        etiket={sesMetni("Ses ayarları")}
        aria-haspopup="dialog"
        aria-expanded={acik}
        aria-controls={acik ? panelId : undefined}
        onClick={() => setAcik((a) => !a)}
      />
      {acik && (
        <div id={panelId} className="m1-ses-panel" role="dialog" aria-label={sesMetni("Ses ayarları")}>
          <QtAnahtar acik={muzik} etiket={sesMetni("Müzik")} onDegis={muzikDegis} />
          <QtAnahtar acik={efekt} etiket={sesMetni("Efektler")} onDegis={efektDegis} />
        </div>
      )}
    </span>
  );
}

/**
 * Oyuncu adının altındaki "Lv n · lig" satırı (Klasik/Düello şeridi, çok oyunculu şerit).
 * 560: lig adı yerine lig amblemi (önizlemedeki gibi) — telefonda nokta/tek harfe inmez, skora binmez;
 * lig adı amblemin erişilebilir adında. Amblem çizilemezse (bilinmeyen lig) eski ad hapı.
 */
export function SeviyeEtiketi({ level, lig, unvan }) {
  if (!level && !lig && !unvan) return null;
  const bilinen = LIGLER.includes(lig);
  return (
    <>
    <span className="mo-seviye">
      {level ? <b className="mo-lv">{tt("Lv {n}", { n: level })}</b> : null}
      {lig && bilinen ? <OyuncuLigAmblemi lig={lig} boyut={20} className="mo-amblem" /> : null}
      {lig && !bilinen ? <span className={`mo-lig mo-lig--${lig}`}>{LIG_ADLARI[lig] ?? lig}</span> : null}
    </span>
    {/* 643: unvan — tek oyuncu kartının küçük hâli (oyuncu_kartlari.unvan) */}
    {unvan ? <UnvanYazisi unvan={unvan} boy="k" className="mo-unvan" /> : null}
    </>
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
            <span className="mo-ben-yazi"><OyuncuAdiDugmesi userId={oyuncu.id} profil={{ gorunen_ad: oyuncu.ad, gorunen_avatar: oyuncu.avatar }} oge="b">{oyuncu.ad}</OyuncuAdiDugmesi><SeviyeEtiketi level={oyuncu.level ?? kart?.level} lig={oyuncu.lig ?? kart?.lig} /></span>
          </span>
        )}
        {sayi && <span className="mo-sayi"><b>{sayi}</b></span>}
      </div>
    )}
    </>
  );
}
