// Sezon Yolu üst blok: tema bandı (Sezon N · başlık · kalan gün + sezon finali kartı), seviye satırı (seviye İÇİ ilerleme),
// Battle Pass düğmesi (taç, altın, fiyat çipi; sahibiyse "aktif"). Bütün sayılar sunucudan; burada hesap yok, yalnız çizim.
import { QtDugme, QtIlerleme, QtIkon, sayiBicim } from "../index.js";
import { tt } from "../../lib/dil.js";
import { ElmasIkon } from "../../components/ParaIkonlari.jsx";
import SayanSayi from "../../components/SayanSayi.jsx";
import { SezonBandi } from "./sezonTemalari.jsx";
import { OdulGorsel } from "./OdulGorsel.jsx";
import { TacIkon } from "./simgeler.jsx";
import { tasmaAdimi } from "./tasma.js";

/** Tema bandı + final kartı. `finalOdul` = 28. seviye ücretli ödül (placeholder olabilir). */
export function SezonHero({ durum, tema, finalOdul, toplam, onFinal, testNotu }) {
  const kalanGun = Number(durum.sezon?.kalan_gun ?? 0);
  return (
    <SezonBandi tema={tema} alt={testNotu ? <p className="sy-test-not" role="note">{tt("Test sezonu · yalnız sen görüyorsun")}</p> : null}>
      <div className="sy-hero-sol">
        <span className="sy-hero-sezon">{tt("Sezon {n}", { n: durum.sezon?.no ?? "" })}</span>
        <h1 className="sy-hero-baslik">{tt("Sezon Yolu")}</h1>
        <span className="sy-cip">
          <QtIkon ad="saat" boyut={14} />
          {kalanGun <= 0 ? tt("Bugün bitiyor") : tt("{n} gün kaldı", { n: kalanGun })}
        </span>
      </div>
      {finalOdul && (
        <button type="button" className="sy-final-kart" onClick={() => onFinal(finalOdul)}
                aria-label={`${tt("Sezon finali")}, ${tt("{n}. seviye", { n: toplam })}: ${finalOdul.placeholder ? tt("Yakında") : (finalOdul.ad_tr || "")}`}>
          <span className="sy-final-gorsel" data-nadirlik={finalOdul.nadirlik ?? undefined}>
            <OdulGorsel odul={finalOdul} boyut={34} />
            <span className="sy-final-tac"><TacIkon boyut={13} /></span>
          </span>
          <span className="sy-final-metin">
            <b>{tt("Sezon finali")}</b>
            <span>{tt("Seviye {n}", { n: toplam })}</span>
            {finalOdul.placeholder && <span className="sy-final-yakinda">{tt("Yakında")}</span>}
          </span>
        </button>
      )}
    </SezonBandi>
  );
}

/** Seviye satırı: daire + "Seviye N / 28" + seviye içi ilerleme + kalan SP. 28'de: "Sezon yolu tamam" + taşma durumu. */
export function SeviyeSatiri({ durum, toplam, bpVar, carpan }) {
  const son = durum.sonraki_esik == null;
  const tasma = durum.tasma;
  const onceki = Number(durum.onceki_esik ?? 0);
  const sp = Number(durum.sp ?? 0);
  const ilerDeger = Math.max(0, sp - onceki);
  const ilerEn = son ? 1 : Math.max(1, Number(durum.sonraki_esik) - onceki);
  const kalan = Math.max(0, ilerEn - ilerDeger);
  // Taşma bölgesi (28 sonrası): ilerleme çubuğu bir sonraki taşma ödülüne
  const adim = son ? tasmaAdimi(durum) : null;
  const tasmaKalan = tasma?.sonraki_icin_sp;
  return (
    <div className="sy-seviye">
      <span className="sy-seviye-daire" aria-hidden="true">{durum.seviye}</span>
      <div className="sy-seviye-ic">
        <div className="sy-seviye-satir">
          <b>{son ? tt("Sezon yolu tamam") : tt("Seviye {n} / {m}", { n: durum.seviye, m: toplam })}</b>
          <span className="qt-sayi">
            {son ? (tasma ? tt("Taşma {n} / {m}", { n: tasma.kazanilan ?? 0, m: tasma.azami ?? 0 }) : "")
              : <><SayanSayi deger={ilerDeger} bicim={sayiBicim} /> / {sayiBicim(ilerEn)} SP</>}
          </span>
        </div>
        <QtIlerleme ton="vurgu" boyut="b"
          deger={son ? (tasmaKalan == null || !adim ? 1 : Math.max(0, adim - tasmaKalan)) : ilerDeger}
          en={son ? (tasmaKalan == null || !adim ? 1 : adim) : ilerEn}
          etiket={son ? tt("Taşma ödülüne ilerleme") : tt("Sonraki seviyeye ilerleme")} />
        <span className={`sy-seviye-not${son ? " sy-seviye-not--kalici" : ""}`}>
          {son
            ? (tasmaKalan == null ? tt("Bu sezonun taşma ödüllerinin hepsi kazanıldı") : tt("Sonraki taşma ödülü için {n} SP", { n: sayiBicim(tasmaKalan) }))
            : tt("Seviye {n} için {sp} SP", { n: Number(durum.seviye) + 1, sp: sayiBicim(kalan) })}
          {bpVar && <b className="sy-carpan"> · SP ×{carpan}</b>}
        </span>
      </div>
    </div>
  );
}

/** Battle Pass düğmesi (taç, altın zemin, fiyat çipi) ya da "Battle Pass aktif". */
export function BpDugmesi({ durum, bpVar, onAl }) {
  if (bpVar) {
    return (
      <div className="sy-bp-aktif" role="status">
        <TacIkon boyut={20} /> <b>{tt("Battle Pass aktif")}</b>
      </div>
    );
  }
  return (
    <QtDugme tamGenislik className="sy-dugme-altin sy-bp-dugme" onClick={onAl}
             aria-label={tt("Battle Pass al, {n} elmas", { n: sayiBicim(Number(durum.bp?.fiyat ?? 0)) })}>
      <TacIkon boyut={22} />
      <span>{tt("Battle Pass al")}</span>
      <span className="sy-fiyat-cip"><ElmasIkon boyut={16} />{sayiBicim(Number(durum.bp?.fiyat ?? 0))}</span>
    </QtDugme>
  );
}

/** Battle Pass fayda çipleri (kaydırma bölgesinde). */
export function FaydaCipleri({ carpan }) {
  const liste = [
    ["yildiz", tt("Altın isim")],
    ["hizli", tt("SP ×{c}", { c: carpan })],
    ["bayrak", tt("Günlük bonus görev")],
    ["madalya", tt("Altın halka")],
  ];
  return (
    <ul className="sy-faydalar" aria-label={tt("Battle Pass avantajları")}>
      {liste.map(([ikon, yazi]) => <li key={ikon}><QtIkon ad={ikon} boyut={14} />{yazi}</li>)}
    </ul>
  );
}

const NADIRLIKLAR = [["siradan", "Sıradan"], ["nadir", "Nadir"], ["epik", "Epik"], ["efsanevi", "Efsanevi"]];

/** Yol açıklaması: nadirlik kenar renkleri + iki kol. Yalnız bilgi; kaydırma bölgesinde. */
export function Lejant() {
  return (
    <div className="sy-lejant">
      <ul className="sy-lejant-liste" aria-label={tt("Nadirlik renkleri")}>
        {NADIRLIKLAR.map(([n, ad]) => <li key={n}><i data-nadirlik={n} aria-hidden="true" />{tt(ad)}</li>)}
      </ul>
      <ul className="sy-lejant-liste" aria-label={tt("Kollar")}>
        <li><i className="sy-lejant-kol sy-lejant-kol--ucretsiz" aria-hidden="true" />{tt("Ücretsiz kol")}</li>
        <li><i className="sy-lejant-kol sy-lejant-kol--ucretli" aria-hidden="true" />{tt("Battle Pass kolu")}</li>
      </ul>
    </div>
  );
}
