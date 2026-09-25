/**
 * DÜKKÂN › AURALAR (481) — avatarın ARKASINDA duran tema katmanı; yalnız ELMASLA satılır.
 * Dokununca KENDİ avatarında (takılı çerçevenle birlikte) önizleme, sonra satın al → tak.
 * Veri: auraKatalogu / auraSatinAl / auraTak (oyun/lib/cerceve.js). Satın alma sunucuda (tek işlem,
 * FOR UPDATE, elmas_harca); coin'le aura alınamaz. Çerçeveler satılmaz — Profil › Koleksiyon'da kazanılır.
 * (Eski DukkanCerceveler.jsx; dükkân çerçeveleri aynı temanın aurasına dönüştü, qt-dc- sınıfları aynı.)
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../src/context/AuthContext.jsx";
import CerceveliAvatar from "./CerceveliAvatar.jsx";
import { auraTanimiBul, NADIRLIK_ADI } from "../tasarim/cerceveler/tanimlar.js";
import DurumKutusu from "./DurumKutusu.jsx";
import { auraKatalogu, auraSatinAl, auraTak, CERCEVE_NADIRLIKLERI } from "../lib/cerceve.js";
import { elmasTazele, useElmas } from "../lib/elmas.js";
import { ElmasIkon } from "./ParaIkonlari.jsx";
// D-302: ham ağ hatası yerine "Bağlantı yok…" — kozmetikHatasi = hataMesaji + "Yetersiz elmas" → "Elmas yetmiyor" (elmasHatasi ile aynı)
import { kozmetikHatasi } from "../lib/kozmetik.js";
import JokerSatinAlModal from "./JokerSatinAlModal.jsx";
import { sesHataUyari, sesSatinAlma } from "../lib/ses.js";
import { tt } from "../lib/dil.js";
import { y } from "../lib/yol.js";
import { QtDugme, QtIkon, QtKart, sayiBicim } from "../tasarim/index.js";
import "../tasarim/ekranlar/dukkan-cerceve.css";

export function NadirlikEtiketi({ nadirlik }) {
  const n = CERCEVE_NADIRLIKLERI.includes(nadirlik) ? nadirlik : "siradan";
  return <span className="qt-dc-nadirlik" data-nadirlik={n}>{tt(NADIRLIK_ADI[n])}</span>;
}

/** Elmas fiyatı: "◆ 150" */
export function ElmasFiyat({ fiyat, boyut = 16 }) {
  return (
    <span className="qt-dc-fiyat qt-dc-fiyat--elmas">
      <ElmasIkon boyut={boyut} />
      <span className="qt-sayi">{sayiBicim(Number(fiyat))}</span>
    </span>
  );
}

/**
 * D-301: elmasla alımların onay penceresi — maç içi joker penceresiyle AYNI bileşen (JokerSatinAlModal),
 * para = elmas, "bakiyen → kalan", yetmezse "Elmasın yetmiyor: X gerekli, Y var" + "Nasıl kazanılır?".
 * `bakiye` verilmezse (ör. Profil › Koleksiyon) mevcut useElmas() ile yalnız OKUNUR.
 */
export function ElmasliSatinAlOnayi({ bakiye, ...p }) {
  if (bakiye === undefined) return <ElmasOkuyanOnay {...p} />;
  return <JokerSatinAlModal para="elmas" kalanGoster yalnizAl onayMetni={tt("Al")} coin={bakiye} {...p} />;
}
function ElmasOkuyanOnay(p) {
  const e = useElmas();
  return <JokerSatinAlModal para="elmas" kalanGoster yalnizAl onayMetni={tt("Al")} coin={e.bakiye} {...p} />;
}

export default function DukkanAuralar({ elmasYetmedi, onBilgi, onHata, elmasBakiye }) {
  const { user, profile } = useAuth();
  const [onayAcik, setOnayAcik] = useState(false);   // D-301
  const [katalog, setKatalog] = useState(null);
  const [hata, setHata] = useState(null);
  const [secili, setSecili] = useState(null);
  const [islem, setIslem] = useState(null);   // "al" | "tak" | null

  const yukle = useCallback(async () => {
    setHata(null);
    try {
      const k = await auraKatalogu();
      const sirali = [...k].sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
      setKatalog(sirali);
      setSecili((s) => sirali.find((x) => x.anahtar === s) ? s : (sirali.find((x) => x.takili)?.anahtar ?? sirali.find((x) => x.satilik)?.anahtar ?? null));
    } catch (e) {
      setHata(kozmetikHatasi(e));
    }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);

  if (!katalog) {
    return (
      <QtKart>
        <DurumKutusu durum={hata ? "hata" : "yukleniyor"} metin={hata ?? undefined} onTekrar={yukle} satir={4} />
      </QtKart>
    );
  }

  const c = katalog.find((x) => x.anahtar === secili) ?? null;
  const ad = (x) => x.ad ?? tt(auraTanimiBul(x.anahtar, x)?.ad ?? "");

  const satinAl = async () => {
    if (!c || islem) return;
    setIslem("al");
    try {
      await auraSatinAl(c.anahtar);
      sesSatinAlma();
      elmasTazele();
      onBilgi?.(tt("{ad} aurası senin. Şimdi takabilirsin.", { ad: ad(c) }));
      await yukle();
    } catch (e) {
      const m = kozmetikHatasi(e);
      sesHataUyari();
      onHata?.(m);
      if (m === tt("Elmas yetmiyor")) elmasYetmedi?.();
    } finally {
      setIslem(null);
    }
  };
  const tak = async (anahtar) => {
    if (islem) return;
    setIslem("tak");
    try {
      await auraTak(anahtar, user?.id);
      onBilgi?.(anahtar ? tt("Aura takıldı.") : tt("Aura çıkarıldı."));
      setKatalog((k) => k.map((x) => ({ ...x, takili: x.anahtar === anahtar })));
    } catch (e) {
      onHata?.(kozmetikHatasi(e));
    } finally {
      setIslem(null);
    }
  };

  const kutu = (x) => (
    <li key={x.anahtar}>
      <button type="button" className="qt-dc-oge" aria-pressed={x.anahtar === secili} onClick={() => setSecili(x.anahtar)}>
        <CerceveliAvatar profile={profile ?? {}} userId={user?.id} aura={x.anahtar} boyut={64} />
        <span className="qt-dc-ad">{ad(x)}</span>
        <NadirlikEtiketi nadirlik={x.nadirlik} />
        <span className="qt-dc-durum">
          {x.takili ? tt("Takılı") : x.sahip ? tt("Sende var") : x.satilik && x.fiyat != null ? (
            <ElmasFiyat fiyat={x.fiyat} />
          ) : <><QtIkon ad="kilit" boyut={14} /> {tt("Etkinlik ödülü")}</>}
        </span>
      </button>
    </li>
  );

  return (
    <div className="qt-dc">
      {c && (
        <QtKart className="qt-dc-sahne" aria-live="polite">
          <div className="qt-dc-onizleme">
            <CerceveliAvatar profile={profile ?? {}} userId={user?.id} aura={c.anahtar} boyut={128} hareketli />
          </div>
          <div className="qt-dc-sahne-bilgi">
            <h2 className="qt-baslik-2">{ad(c)}</h2>
            <NadirlikEtiketi nadirlik={c.nadirlik} />
            <p className="qt-kucuk qt-soluk">{tt("Aura avatarının arkasında durur; takılı çerçeven önde kalır.")}</p>
          </div>
          <div className="qt-dc-sahne-eylem">
            {c.takili ? (
              <QtDugme tur="ikincil" tamGenislik yukleniyor={islem === "tak"} onClick={() => tak(null)}>{tt("Çıkar")}</QtDugme>
            ) : c.sahip ? (
              <QtDugme tamGenislik ikon="onay" yukleniyor={islem === "tak"} onClick={() => tak(c.anahtar)}>{tt("Tak")}</QtDugme>
            ) : c.satilik && c.fiyat != null ? (
              <QtDugme tamGenislik yukleniyor={islem === "al"} onClick={() => setOnayAcik(true)}
                       aria-haspopup="dialog"
                       aria-label={tt("{ad} aurasını satın al — {n} elmas", { ad: ad(c), n: c.fiyat })}>
                <span className="qt-dc-fiyat">{tt("Satın al")} <ElmasFiyat fiyat={c.fiyat} boyut={18} /></span>
              </QtDugme>
            ) : (
              <QtDugme tur="ikincil" tamGenislik devreDisi ikon="kilit">{tt("Satılmaz")}</QtDugme>
            )}
          </div>
        </QtKart>
      )}

      <section className="qt-dk-bolum" aria-labelledby="qt-dc-dukkan">
        <h2 id="qt-dc-dukkan" className="qt-baslik-2">{tt("Auralar")}</h2>
        <p className="qt-kucuk qt-soluk-zemin">{tt("Dokun, kendi avatarında dene. Aura elmasla alınır; taktığın aurayı maçta ve listelerde herkes görür.")}</p>
        <ul className="qt-dc-izgara">{katalog.map(kutu)}</ul>
      </section>

      {onayAcik && c && (
        <ElmasliSatinAlOnayi
          bakiye={elmasBakiye}
          baslik={ad(c)}
          aciklama={tt("Aura avatarının arkasında durur; takılı çerçeven önde kalır.")}
          gorsel={<CerceveliAvatar profile={profile ?? {}} userId={user?.id} aura={c.anahtar} boyut={72} />}
          fiyat={c.fiyat}
          yetersizEylem={() => elmasYetmedi?.()}
          onOnay={satinAl}
          onKapat={() => setOnayAcik(false)}
        />
      )}

      <p className="qt-kucuk qt-soluk-zemin qt-dc-not">
        {tt("Çerçeveler satılmaz: lig, turnuva, level ve etkinliklerle kazanılır.")}{" "}
        <Link to={y("/profil?sekme=koleksiyon")}>{tt("Koleksiyonuna bak")}</Link>
      </p>
    </div>
  );
}
