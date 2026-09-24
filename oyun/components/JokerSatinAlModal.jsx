import { useState } from "react";
import { QtModal, QtDugme, QtIkon, QtListe, QtListeSatiri, QtCoinHapi, sayiBicim } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-mac.css";
import "../tasarim/ekranlar/satin-al-onay.css";
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
 *
 * DÜKKÂN ONAYI (D-301, Ajan B7): aynı pencere dükkândaki BÜTÜN alımlarda (joker, paket, kilit, çerçeve,
 * aura, avatar, isim, VS, zafer, tepki) kullanılır. Ek prop'ların hepsi isteğe bağlı; verilmezse maç içi
 * davranış birebir aynıdır:
 *   baslik / aciklama / gorsel — ürünün adı, açıklaması, görseli (verilmezse jokerinki)
 *   para: "coin" | "elmas" — fiyat ve bakiye hangi para (coin = eski davranış)
 *   kalanGoster — "Bakiyen: 500 → 440" satırı ("Coin'in" satırının yerine). Bakiye okunamadıysa
 *     (null) satır gösterilmez ve alım serbest (kontrol zaten sunucuda).
 *   onayMetni — onay düğmesi ("Al", "Kilidi aç" …)
 *   yetersizEylem: () => void — bakiye yetmezse "{Para}ın yetmiyor: X gerekli, Y var" + "Nasıl kazanılır?"
 *   hataYedek / hataCevir — onOnay hata atarsa gösterilecek metin
 */
export default function JokerSatinAlModal({
  tur, fiyat, coin, yalnizAl = false, onOnay, onKapat,
  baslik, aciklama, gorsel, para = "coin", kalanGoster = false, onayMetni, yetersizEylem, hataYedek, hataCevir,
}) {
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState(null);
  const bilgi = JOKER_BILGI[tur] ?? {};
  const bakiyeBilinmiyor = kalanGoster && (coin === null || coin === undefined);
  const yeterli = bakiyeBilinmiyor || Number(coin ?? 0) >= Number(fiyat ?? 0);
  const elmasMi = para === "elmas";
  const Hap = ({ miktar }) => (elmasMi ? (
    <span className="qt-coin qt-sat-elmas" role="img" aria-label={tt("{n} elmas", { n: sayiBicim(miktar) })}>
      <QtIkon ad="elmas" boyut={20} />
      <b>{sayiBicim(miktar)}</b>
    </span>
  ) : <QtCoinHapi miktar={miktar} />);

  const onayla = async () => {
    if (calisiyor || !yeterli) return;
    setCalisiyor(true);
    setHata(null);
    try {
      await onOnay();
      onKapat?.();
    } catch (e) {
      setHata(hataCevir ? hataCevir(e) : hataMesaji(e, hataYedek ?? tt("Joker alınamadı.")));
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
      baslik={baslik ?? `${tt("Joker satın al")}: ${bilgi.ad ?? tur}`}
      aciklama={aciklama !== undefined ? aciklama : bilgi.aciklama}
      altlik={
        <div className="m1-sat-dugmeler">
          <QtDugme tur="ikincil" onClick={onKapat} devreDisi={calisiyor}>
            {tt("Vazgeç")}
          </QtDugme>
          <QtDugme onClick={onayla} devreDisi={!yeterli || calisiyor} yukleniyor={calisiyor} data-qt-ilk-odak>
            {calisiyor ? tt("Alınıyor…") : onayMetni ?? (yalnizAl ? tt("Al") : tt("Al ve kullan"))}
          </QtDugme>
        </div>
      }
    >
      <div className="m1-sat">
        <span className={gorsel ? "m1-sat-ikon qt-sat-gorsel" : "m1-sat-ikon"} aria-hidden="true">
          {gorsel ?? <SkillRozeti tur={tur} boyut={48} />}
        </span>
        <QtListe>
          <QtListeSatiri baslik={tt("Fiyat")} sag={<Hap miktar={Number(fiyat ?? 0)} />} />
          {!kalanGoster && (
            <QtListeSatiri baslik={tt("Coin'in")} sag={<QtCoinHapi miktar={Number(coin ?? 0)} />} vurgulu={!yeterli} />
          )}
          {kalanGoster && !bakiyeBilinmiyor && (
            <QtListeSatiri
              baslik={tt("Bakiyen")}
              vurgulu={!yeterli}
              sag={yeterli ? (
                <span className="qt-sat-kalan" aria-label={tt("{0} → kalan {1}", { 0: sayiBicim(Number(coin)), 1: sayiBicim(Number(coin) - Number(fiyat ?? 0)) })}>
                  <Hap miktar={Number(coin)} />
                  <QtIkon ad="ileri" boyut={18} className="qt-sat-ok" />
                  <Hap miktar={Number(coin) - Number(fiyat ?? 0)} />
                </span>
              ) : <Hap miktar={Number(coin)} />}
            />
          )}
        </QtListe>

        {yalnizAl && yeterli && !kalanGoster && (
          <p className="m1-sat-not">{tt("Joker envanterine girer; saldırı hazırlığında kullanırsın.")}</p>
        )}
        {!yeterli && !yetersizEylem && (
          <div className="m1-bant m1-bant--hata" role="alert">
            <span>{tt("Yetersiz coin — oynayarak kazanabilirsin.")}</span>
          </div>
        )}
        {/* D-304: dükkânda çıkmaz yok — ne kadar eksik olduğu ve nasıl kazanılacağı */}
        {!yeterli && yetersizEylem && (
          <div className="qt-sat-yetmez" role="alert">
            <p>
              {elmasMi
                ? tt("Elmasın yetmiyor: {0} gerekli, {1} var", { 0: sayiBicim(Number(fiyat ?? 0)), 1: sayiBicim(Number(coin ?? 0)) })
                : tt("Coin'in yetmiyor: {0} gerekli, {1} var", { 0: sayiBicim(Number(fiyat ?? 0)), 1: sayiBicim(Number(coin ?? 0)) })}
            </p>
            <QtDugme tur="ikincil" boyut="k" ikon="bilgi" onClick={() => { onKapat?.(); yetersizEylem(); }}>
              {tt("Nasıl kazanılır?")}
            </QtDugme>
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
