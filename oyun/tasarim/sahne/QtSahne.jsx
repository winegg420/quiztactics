// ============================================================
// QtSahne — TAM EKRAN OYUN SAHNESİ kabuğu (1 Eki 2026). "Web sayfası" değil, mobil oyundaki gibi tek ekran:
// uygulama üst çubuğu ve alt menü gizlenir (useOyunModu → body.bd-oyun-modu), ekran yüksekliği kilitlidir (100dvh),
// sayfa gövdesi KAYMAZ; yalnız `children` bölgesi kayar.
//
//   <QtSahne baslik={tt("Görevler")} altBaslik={…} ust={<Ozet />} alt={hazir > 0 ? <QtDugme …/> : null}>
//     …tek kaydırılan bölge…
//   </QtSahne>
//
//   baslik / altBaslik : üst şeridin ortası (h1 + küçük satır)
//   sag                : üst şeridin sağı; verilmezse coin hapı (CoinHapi — uygulama üst çubuğundakiyle AYNI bileşen)
//   ust                : üst şeridin altında SABİT alan (seviye çubuğu, günlük özet…)
//   alt                : ekranın altında SABİT eylem alanı; boş/null ise hiç yer kaplamaz
//   govdeRef           : kaydırılan bölgenin ref'i (ör. mevcut seviyeye kaydırmak için)
//   onGeri             : geri düğmesi (varsayılan: navigate(-1); geçmiş yoksa ana sayfa)
//
// Coin hapı: sahne açıkken uygulama üst çubuğu gizlidir; ödül anında zıplatılacak / coin uçuşunun hedefi olacak hap
// sahnedekidir → seçici QT_SAHNE_COIN_HAPI (ziplat(QT_SAHNE_COIN_HAPI)).
// iOS: kök `position: fixed` ve HAREKETSİZ; giriş geçişi (sağdan kayma) içteki sarmalayıcıda. Stil: sahne.css (qt-sahne-*).
// ============================================================
import { sinif } from "../temel.jsx";
import SayfaBasligi from "../SayfaBasligi.jsx";
import { useOyunModu } from "../../lib/oyunModu.js";
import "./sahne.css";

/** Sahnedeki coin hapının seçicisi (ziplat hedefi, coin uçuşunun varış noktası). */
export const QT_SAHNE_COIN_HAPI = ".qt-sahne-coin .bd-coin-hap";

export default function QtSahne({ baslik, altBaslik, sag, ust, alt, children, govdeRef, onGeri, className, ...rest }) {
  useOyunModu(true);
  const altVar = alt != null && alt !== false;

  return (
    <div className={sinif("qt-sahne-kok", className)} {...rest}>
      <div className="qt-sahne-ic">
        <SayfaBasligi tur="sahne" baslik={baslik} altYazi={altBaslik} sag={sag} onGeri={onGeri} />
        {ust != null && ust !== false && <div className="qt-sahne-sabit">{ust}</div>}
        <div className="qt-sahne-govde" ref={govdeRef}>{children}</div>
        {altVar && <div className="qt-sahne-alt">{alt}</div>}
      </div>
    </div>
  );
}
