// "28+" taşma ödülü alt sayfası: kazanılan / alınan taşma, sonraki ödül için kalan SP, "Al" (bp_tasma_al).
// Ücretli kolda BP yoksa Battle Pass satın alma yönlendirmesi. Bütün sayılar sunucudan (durum.tasma).
import { useEffect, useRef, useState } from "react";
import { QtDugme, QtModal, QtIkon, sayiBicim } from "../index.js";
import { tt } from "../../lib/dil.js";
import { hataMesaji } from "../../lib/hata.js";
import { bpTasmaAl } from "../../lib/sezonYolu.js";
import { CoinIkon } from "../../components/ParaIkonlari.jsx";
import { TacIkon } from "./simgeler.jsx";
import { tasmaAdimi } from "./tasma.js";

export default function TasmaSayfasi({ kol, durum, userId, onKapat, onBpAl, onAlindi }) {
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState(null);
  const canli = useRef(true);
  useEffect(() => { canli.current = true; return () => { canli.current = false; }; }, []);
  const t = durum.tasma ?? {};
  const ucretli = kol === "ucretli";
  const bpVar = Boolean(durum.bp?.aktif);
  const adim = tasmaAdimi(durum);
  const alinabilir = Number(ucretli ? t.alinabilir_ucretli : t.alinabilir_ucretsiz) || 0;
  const alinan = Number(ucretli ? t.alinan_ucretli : t.alinan_ucretsiz) || 0;
  const miktar = Number(t.odul?.[kol]?.miktar ?? 0);
  const kolAdi = ucretli ? tt("Battle Pass kolu") : tt("Ücretsiz kol");
  const toplam = Number(durum.seviye_sayisi ?? 28);
  const satirlar = [
    [tt("Kazanılan"), `${Number(t.kazanilan ?? 0)} / ${Number(t.azami ?? 0)}`],
    [tt("Alınan"), String(alinan)],
    [tt("Alınabilir"), String(alinabilir)],
    [tt("Sonraki ödül için"), t.sonraki_icin_sp == null ? tt("Hepsi kazanıldı") : `${sayiBicim(Number(t.sonraki_icin_sp))} SP`],
  ];
  const al = async () => {
    if (calisiyor) return;
    setCalisiyor(true);
    setHata(null);
    try {
      const r = await bpTasmaAl(kol, userId);
      onAlindi?.({ tur: r?.odul?.tur ?? "coin", miktar: Number(r?.odul?.miktar ?? miktar) }, `tasma:${kol}`);
      onKapat();
    } catch (e) {
      if (canli.current) setHata(hataMesaji(e, tt("Ödül alınamadı. Tekrar dener misin?")));
    } finally {
      if (canli.current) setCalisiyor(false);
    }
  };
  return (
    <QtModal acik tur="altSayfa" onKapat={calisiyor ? undefined : onKapat} ortuKapatir={!calisiyor}
      baslik={tt("Taşma ödülü")}
      aciklama={adim ? tt("{n}. seviyeden sonra her {sp} SP = 1 ödül", { n: toplam, sp: sayiBicim(adim) }) : tt("{n}. seviyeden sonra her ödül SP ile kazanılır", { n: toplam })}
      altlik={
        <div className="sy-alt-dugmeler">
          {alinabilir > 0 ? (
            <QtDugme tamGenislik boyut="b" tur="dogru" ikon="hediye" onClick={al} yukleniyor={calisiyor} devreDisi={calisiyor} data-qt-ilk-odak>
              {calisiyor ? tt("Alınıyor…") : tt("Ödülü al")}
            </QtDugme>
          ) : ucretli && !bpVar ? (
            <QtDugme tamGenislik boyut="b" className="sy-dugme-altin" onClick={onBpAl} data-qt-ilk-odak>
              <TacIkon boyut={22} /> {tt("Battle Pass Al · {n} elmas", { n: sayiBicim(Number(durum.bp?.fiyat ?? 0)) })}
            </QtDugme>
          ) : (
            <QtDugme tamGenislik tur="ikincil" onClick={onKapat} data-qt-ilk-odak>{tt("Kapat")}</QtDugme>
          )}
        </div>
      }>
      <div className="sy-sayfa-ic">
        <div className="sy-onizleme" data-onizleme="tasma">
          <span className="sy-buyuk sy-buyuk--dz"><CoinIkon boyut={72} /></span>
          <b className="sy-miktar">+{sayiBicim(miktar)}</b>
        </div>
        <div className="sy-etiketler">
          <span className={`sy-kol-etiket${ucretli ? " sy-kol-etiket--ucretli" : ""}`}>{kolAdi}</span>
        </div>
        <dl className="sy-tasma-liste">
          {satirlar.map(([a, b]) => <div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}
        </dl>
        {!t.acik && (
          <ul className="sy-neden" role="status">
            <li><QtIkon ad="kilit" boyut={16} /><span>{tt("{n}. seviyeye ulaşınca açılır. Kalan: {sp} SP", { n: toplam, sp: sayiBicim(Math.max(0, Number(durum.esikler?.[toplam - 1] ?? 0) - Number(durum.sp ?? 0))) })}</span></li>
          </ul>
        )}
        {ucretli && !bpVar && t.acik && alinabilir === 0 && (
          <ul className="sy-neden" role="status">
            <li><QtIkon ad="kilit" boyut={16} /><span>{tt("Bu ödül için Battle Pass gerekir.")}</span></li>
          </ul>
        )}
        {hata && <p className="sy-hata" role="alert">{hata}</p>}
      </div>
    </QtModal>
  );
}
