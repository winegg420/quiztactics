import { useState } from "react";
import { QtModal, QtDugme, QtIkon, QtListe, QtListeSatiri, QtCoinHapi } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-mac.css";
import { JOKER_BILGI } from "../lib/jokerler.js";
import SkillRozeti from "./SkillRozeti.jsx";
import { hataMesaji } from "../lib/hata.js";
import { tt } from "../lib/dil.js";

/**
 * Maç içi joker satın alma onayı (Paket 27 C).
 *
 * TASARIM KARARLARI — hepsi maçın ortasında olduğumuz için:
 *  · Alttan açılan sayfa (`bd-alttan`): pop-up parmağın altında, tek elle
 *    erişilebilir yükseklikte. Ortada açılan bir kutu başparmakla zor.
 *  · SÜRE DURMAZ. Maç senkron, rakip bekliyor — burada sayaç dondurulmaz.
 *    Bu yüzden akış tek adım: onayla → satın al + kullan aynı çağrıda.
 *  · Coin yetmiyorsa onay pasif ve "Yetersiz coin" yazar. Dükkâna ya da coin
 *    satın alma ekranına YÖNLENDİRME YOK — maçın ortasında agresif durur ve
 *    oyuncuyu maçtan koparır.
 *  · Onaya basınca düğme kilitlenir: çift tıklama çift satın alma yapmasın.
 *
 * onOnay: async () => void — satın al(+kullan) RPC'sini çağıran fonksiyon.
 * yalnizAl: true ise joker YALNIZ envantere girer, hemen kullanılmaz
 *   (Paket 28 D — düelloda kategori seçme ekranı: orada 20 saniye var,
 *   Saldırı Hazırlığı'nın 4 saniyesi okuyup onaylamaya yetmiyordu).
 */
export default function JokerSatinAlModal({ tur, fiyat, coin, yalnizAl = false, onOnay, onKapat }) {
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState(null);
  const bilgi = JOKER_BILGI[tur] ?? {};
  const yeterli = Number(coin ?? 0) >= Number(fiyat ?? 0);

  const onayla = async () => {
    if (calisiyor || !yeterli) return;
    setCalisiyor(true);
    setHata(null);
    try {
      await onOnay();
      onKapat?.();
    } catch (e) {
      setHata(hataMesaji(e, tt("Joker alınamadı.")));
      setCalisiyor(false);
    }
  };

  const kapat = calisiyor ? undefined : onKapat;
  return (
    <QtModal
      acik
      tur="altSayfa"
      onKapat={kapat}
      ortuKapatir={!calisiyor}
      kapatDugmesi={!calisiyor}
      baslik={`${tt("Joker satın al")}: ${bilgi.ad ?? tur}`}
      aciklama={bilgi.aciklama}
      altlik={
        <div className="m1-sat-dugmeler">
          <QtDugme tur="ikincil" onClick={onKapat} devreDisi={calisiyor}>
            {tt("Vazgeç")}
          </QtDugme>
          <QtDugme onClick={onayla} devreDisi={!yeterli || calisiyor} yukleniyor={calisiyor} data-qt-ilk-odak>
            {calisiyor ? tt("Alınıyor…") : yalnizAl ? tt("Al") : tt("Al ve kullan")}
          </QtDugme>
        </div>
      }
    >
      <div className="m1-sat">
        <span className="m1-sat-ikon" aria-hidden="true">
          <SkillRozeti tur={tur} boyut={48} />
        </span>
        <QtListe>
          <QtListeSatiri baslik={tt("Fiyat")} sag={<QtCoinHapi miktar={Number(fiyat ?? 0)} />} />
          <QtListeSatiri baslik={tt("Coin'in")} sag={<QtCoinHapi miktar={Number(coin ?? 0)} />} vurgulu={!yeterli} />
        </QtListe>

        {yalnizAl && yeterli && (
          <p className="m1-sat-not">{tt("Joker envanterine girer; saldırı hazırlığında kullanırsın.")}</p>
        )}
        {!yeterli && (
          <div className="m1-bant m1-bant--hata" role="alert">
            <span>{tt("Yetersiz coin — oynayarak kazanabilirsin.")}</span>
          </div>
        )}
        {hata && (
          <div className="m1-bant m1-bant--hata" role="alert">
            <span>{hata}</span>
          </div>
        )}
      </div>
    </QtModal>
  );
}
