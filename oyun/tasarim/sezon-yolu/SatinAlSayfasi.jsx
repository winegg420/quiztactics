// Battle Pass satın alma onayı (alt sayfa). Karar ve bakiye kontrolü sunucuda; burada yalnız gösterilir.
import { useEffect, useRef, useState } from "react";
import { QtDugme, QtModal, QtIkon, sayiBicim } from "../index.js";
import { tt } from "../../lib/dil.js";
import { hataMesaji } from "../../lib/hata.js";
import { ElmasIkon } from "../../components/ParaIkonlari.jsx";

const AVANTAJLAR = [
  ["hediye", "Geriye dönük ücretli ödüller: ulaştığın bütün seviyelerin ödülü hemen düşer"],
  ["yildiz", "Sezon boyunca altın isim"],
  ["madalya", "Avatar çerçevende altın halka"],
  ["hizli", "SP ×{c}: seviyeler daha hızlı dolar"],
  ["bayrak", "Günlük bonus görev"],
  ["kupa", "28/28'de sezona özel unvan"],
  ["ates", "Özel zafer efekti"],
];

export default function SatinAlSayfasi({ durum, dil, onOnay, onKapat }) {
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState(null);
  const canli = useRef(true);
  useEffect(() => { canli.current = true; return () => { canli.current = false; }; }, []);
  const fiyat = Number(durum.bp?.fiyat ?? 0);
  const elmas = durum.elmas == null ? null : Number(durum.elmas);
  const yeterli = elmas == null || elmas >= fiyat;
  const carpan = Number(durum.bp?.sp_carpan ?? 1).toLocaleString(dil === "en" ? "en-US" : "tr-TR");
  const onayla = async () => {
    if (calisiyor || !yeterli) return;
    setCalisiyor(true);
    setHata(null);
    try {
      await onOnay();
    } catch (e) {
      if (canli.current) setHata(hataMesaji(e, tt("Battle Pass alınamadı. Tekrar dener misin?")));
    } finally {
      if (canli.current) setCalisiyor(false);
    }
  };
  return (
    <QtModal acik tur="altSayfa" onKapat={calisiyor ? undefined : onKapat} ortuKapatir={!calisiyor}
      baslik={tt("Battle Pass")} aciklama={tt("Sezon {n} boyunca geçerli", { n: durum.sezon?.no ?? "" })}
      altlik={
        <div className="sy-alt-dugmeler sy-alt-dugmeler--iki">
          <QtDugme tur="ikincil" onClick={onKapat} devreDisi={calisiyor}>{tt("Vazgeç")}</QtDugme>
          <QtDugme onClick={onayla} devreDisi={!yeterli || calisiyor} yukleniyor={calisiyor} data-qt-ilk-odak>
            {calisiyor ? tt("Alınıyor…") : tt("Satın al")}
          </QtDugme>
        </div>
      }>
      <div className="sy-sayfa-ic">
        <ul className="sy-avantaj">
          {AVANTAJLAR.map(([ikon, metin]) => (
            <li key={ikon}><span className="sy-avantaj-ikon"><QtIkon ad={ikon} boyut={18} /></span><span>{tt(metin, { c: carpan })}</span></li>
          ))}
        </ul>
        <div className="sy-fiyat">
          <span>{tt("Fiyat")}</span>
          <b className="sy-elmas"><ElmasIkon boyut={22} /> {sayiBicim(fiyat)}</b>
        </div>
        {elmas != null && (
          <div className={`sy-fiyat${yeterli ? "" : " sy-fiyat--yetmez"}`}>
            <span>{tt("Bakiyen")}</span>
            <b className="sy-elmas"><ElmasIkon boyut={22} /> {sayiBicim(elmas)}</b>
          </div>
        )}
        {!yeterli && (
          <p className="sy-hata" role="alert">{tt("Elmasın yetmiyor: {0} gerekli, {1} var", { 0: sayiBicim(fiyat), 1: sayiBicim(elmas) })}</p>
        )}
        {hata && <p className="sy-hata" role="alert">{hata}</p>}
      </div>
    </QtModal>
  );
}
