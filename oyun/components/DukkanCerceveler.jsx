/**
 * DÜKKÂN › ÇERÇEVELER — nadirlik etiketi + renk kodu, fiyat, "Sende var" / "Takılı".
 * Dokununca KENDİ avatarında önizleme (üstteki sahne), sonra satın al → tak.
 * Veri: cerceveKatalogu / cerceveSatinAl / cerceveTak (oyun/lib/cerceve.js). Satın alma sunucuda
 * (tek işlem, FOR UPDATE); lig/level çerçeveleri satılmaz, nasıl kazanılacağı yazar.
 */
import { useCallback, useEffect, useState } from "react";
import Avatar from "../../src/components/Avatar.jsx";
import { useAuth } from "../../src/context/AuthContext.jsx";
import CerceveGorseli, { icBoyut } from "../tasarim/cerceveler/CerceveGorseli.jsx";
import { cerceveTanimiBul, NADIRLIK_ADI } from "../tasarim/cerceveler/tanimlar.js";
import DurumKutusu from "./DurumKutusu.jsx";
import { cerceveKatalogu, cerceveSatinAl, cerceveTak, CERCEVE_NADIRLIKLERI } from "../lib/cerceve.js";
import { LIG_ADLARI } from "../lib/lig.js";
import { coinHatasi, coinTazele } from "../lib/coin.js";
import { tt } from "../lib/dil.js";
import { QtDugme, QtIkon, QtKart, sayiBicim } from "../tasarim/index.js";
import "../tasarim/ekranlar/dukkan-cerceve.css";

/** Satılmayan çerçevenin nasıl kazanılacağı (kosul: "lig:gumus" | "level:25"). */
function kosulMetni(c) {
  const [tur, deger] = String(c.kosul ?? "").split(":");
  if (tur === "lig") return tt("{lig} Lig'e çık", { lig: LIG_ADLARI[deger] ?? deger });
  if (tur === "level") return tt("Level {n} rozetiyle gelir", { n: deger });
  return tt("Etkinlik ödülü");
}

function NadirlikEtiketi({ nadirlik }) {
  const n = CERCEVE_NADIRLIKLERI.includes(nadirlik) ? nadirlik : "siradan";
  return <span className="qt-dc-nadirlik" data-nadirlik={n}>{tt(NADIRLIK_ADI[n])}</span>;
}

export default function DukkanCerceveler({ coinYetmedi, onBilgi, onHata }) {
  const { user, profile } = useAuth();
  const [katalog, setKatalog] = useState(null);
  const [hata, setHata] = useState(null);
  const [secili, setSecili] = useState(null);
  const [islem, setIslem] = useState(null);   // "al" | "tak" | null

  const yukle = useCallback(async () => {
    setHata(null);
    try {
      const k = await cerceveKatalogu();
      const sirali = [...k].sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
      setKatalog(sirali);
      setSecili((s) => sirali.find((x) => x.anahtar === s) ? s : (sirali.find((x) => x.takili)?.anahtar ?? sirali.find((x) => x.satilik)?.anahtar ?? null));
    } catch (e) {
      setHata(coinHatasi(e));
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
  const ad = (x) => x.ad ?? tt(cerceveTanimiBul(x.anahtar, x)?.ad ?? "");

  const satinAl = async () => {
    if (!c || islem) return;
    setIslem("al");
    try {
      await cerceveSatinAl(c.anahtar);
      coinTazele();
      onBilgi?.(tt("{ad} çerçevesi senin. Şimdi takabilirsin.", { ad: ad(c) }));
      await yukle();
    } catch (e) {
      const m = coinHatasi(e);
      onHata?.(m);
      if (m === tt("Coin yetmiyor")) coinYetmedi?.();
    } finally {
      setIslem(null);
    }
  };
  const tak = async (anahtar) => {
    if (islem) return;
    setIslem("tak");
    try {
      await cerceveTak(anahtar, user?.id);
      onBilgi?.(anahtar ? tt("Çerçeve takıldı.") : tt("Çerçeve çıkarıldı."));
      setKatalog((k) => k.map((x) => ({ ...x, takili: x.anahtar === anahtar })));
    } catch (e) {
      onHata?.(coinHatasi(e));
    } finally {
      setIslem(null);
    }
  };

  const dukkan = katalog.filter((x) => x.kaynak === "dukkan");
  const kazanilan = katalog.filter((x) => x.kaynak !== "dukkan");
  const kutu = (x) => (
    <li key={x.anahtar}>
      <button type="button" className="qt-dc-oge" aria-pressed={x.anahtar === secili} onClick={() => setSecili(x.anahtar)}>
        <CerceveGorseli anahtar={x.anahtar} satir={x} boyut={64}>
          <Avatar profile={profile ?? {}} boyut={icBoyut(64)} />
        </CerceveGorseli>
        <span className="qt-dc-ad">{ad(x)}</span>
        <NadirlikEtiketi nadirlik={x.nadirlik} />
        <span className="qt-dc-durum">
          {x.takili ? tt("Takılı") : x.sahip ? tt("Sende var") : x.satilik && x.fiyat != null ? (
            <span className="qt-dc-fiyat"><QtIkon ad="coin" boyut={16} /><span className="qt-sayi">{sayiBicim(Number(x.fiyat))}</span></span>
          ) : <><QtIkon ad="kilit" boyut={14} /> {tt("Kilitli")}</>}
        </span>
      </button>
    </li>
  );

  return (
    <div className="qt-dc">
      {c && (
        <QtKart className="qt-dc-sahne" aria-live="polite">
          <div className="qt-dc-onizleme">
            <CerceveGorseli anahtar={c.anahtar} satir={c} boyut={128} hareketli etiket={tt("{ad} çerçevesi", { ad: ad(c) })}>
              <Avatar profile={profile ?? {}} boyut={icBoyut(128)} />
            </CerceveGorseli>
          </div>
          <div className="qt-dc-sahne-bilgi">
            <h2 className="qt-baslik-2">{ad(c)}</h2>
            <NadirlikEtiketi nadirlik={c.nadirlik} />
            {!c.satilik && !c.sahip && <p className="qt-kucuk qt-soluk">{kosulMetni(c)}</p>}
          </div>
          <div className="qt-dc-sahne-eylem">
            {c.takili ? (
              <QtDugme tur="ikincil" tamGenislik yukleniyor={islem === "tak"} onClick={() => tak(null)}>{tt("Çıkar")}</QtDugme>
            ) : c.sahip ? (
              <QtDugme tamGenislik ikon="onay" yukleniyor={islem === "tak"} onClick={() => tak(c.anahtar)}>{tt("Tak")}</QtDugme>
            ) : c.satilik && c.fiyat != null ? (
              <QtDugme tamGenislik yukleniyor={islem === "al"} onClick={satinAl}>
                <span className="qt-dc-fiyat">{tt("Satın al")} <QtIkon ad="coin" boyut={18} /><span className="qt-sayi">{sayiBicim(Number(c.fiyat))}</span></span>
              </QtDugme>
            ) : (
              <QtDugme tur="ikincil" tamGenislik devreDisi ikon="kilit">{tt("Satılmaz")}</QtDugme>
            )}
          </div>
        </QtKart>
      )}

      <section className="qt-dk-bolum" aria-labelledby="qt-dc-dukkan">
        <h2 id="qt-dc-dukkan" className="qt-baslik-2">{tt("Çerçeveler")}</h2>
        <p className="qt-kucuk qt-soluk-zemin">{tt("Dokun, kendi avatarında dene. Taktığın çerçeveyi maçta ve listelerde herkes görür.")}</p>
        <ul className="qt-dc-izgara">{dukkan.map(kutu)}</ul>
      </section>

      {kazanilan.length > 0 && (
        <section className="qt-dk-bolum" aria-labelledby="qt-dc-kazan">
          <h2 id="qt-dc-kazan" className="qt-baslik-2">{tt("Kazanılan çerçeveler")}</h2>
          <p className="qt-kucuk qt-soluk-zemin">{tt("Lig atlayarak ve level rozetleriyle kazanılır; satılmaz.")}</p>
          <ul className="qt-dc-izgara">{kazanilan.map(kutu)}</ul>
        </section>
      )}
    </div>
  );
}
