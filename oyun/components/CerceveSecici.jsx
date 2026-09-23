/**
 * ÇERÇEVELERİM — profil › Rozetler altında: sahip olunan çerçeveler arasından tak/çıkar.
 * Veri: cercevelerim() / cerceveTak() (oyun/lib/cerceve.js). Listede çerçeveler durağan.
 * (Eski LigCerceveSecici'nin yerine; lig çerçeveleri yeni kataloğa taşındı.)
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../../src/components/Avatar.jsx";
import CerceveGorseli, { icBoyut } from "../tasarim/cerceveler/CerceveGorseli.jsx";
import { cerceveTanimiBul } from "../tasarim/cerceveler/tanimlar.js";
import DurumKutusu from "./DurumKutusu.jsx";
import { cercevelerim, cerceveTak } from "../lib/cerceve.js";
import { hataMesaji } from "../lib/hata.js";
import { tt } from "../lib/dil.js";
import { y } from "../lib/yol.js";
import { QtDugme, QtKart } from "../tasarim/index.js";
import "../tasarim/ekranlar/cerceve-secici.css";

export default function CerceveSecici({ profile, userId }) {
  const [liste, setListe] = useState(null);
  const [hata, setHata] = useState(null);
  const [mesgul, setMesgul] = useState(null);

  const yukle = useCallback(async () => {
    setHata(null);
    try { setListe(await cercevelerim()); } catch (e) { setHata(hataMesaji(e, tt("Çerçeveler yüklenemedi."))); }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);

  if (!liste) {
    return (
      <QtKart className="qt-cs">
        <DurumKutusu durum={hata ? "hata" : "yukleniyor"} metin={hata ?? undefined} onTekrar={yukle} satir={2} />
      </QtKart>
    );
  }

  const takili = liste.find((c) => c.takili)?.anahtar ?? null;
  const tak = async (anahtar) => {
    if (mesgul || anahtar === takili) return;
    setMesgul(anahtar ?? "yok");
    setHata(null);
    try {
      await cerceveTak(anahtar, userId);
      setListe((l) => l.map((c) => ({ ...c, takili: c.anahtar === anahtar })));
    } catch (e) {
      setHata(hataMesaji(e, tt("Çerçeve takılamadı.")));
    } finally {
      setMesgul(null);
    }
  };

  const secenekler = [{ anahtar: null, ad: tt("Çerçevesiz") }, ...liste];
  return (
    <QtKart as="section" className="qt-cs" aria-labelledby="qt-cs-baslik">
      <h2 id="qt-cs-baslik" className="qt-baslik-3">{tt("Çerçevelerim")}</h2>
      <p className="qt-kucuk qt-soluk">{tt("Taktığın çerçeve maçta, lig tablosunda ve arkadaş listesinde herkese görünür.")}</p>
      <ul className="qt-cs-izgara">
        {secenekler.map((c) => {
          const secili = (c.anahtar ?? null) === takili;
          const tanim = cerceveTanimiBul(c.anahtar, c);
          return (
            <li key={c.anahtar ?? "yok"}>
              <button type="button" className="qt-cs-oge" aria-pressed={secili} disabled={Boolean(mesgul)}
                      onClick={() => tak(c.anahtar ?? null)}>
                <CerceveGorseli anahtar={c.anahtar} satir={c} boyut={64}>
                  <Avatar profile={profile} boyut={icBoyut(64, !!tanim)} />
                </CerceveGorseli>
                <span className="qt-cs-ad">{c.anahtar ? (c.ad ?? tt(tanim?.ad ?? "")) : c.ad}</span>
                <span className="qt-cs-durum">{secili ? tt("Takılı") : mesgul === (c.anahtar ?? "yok") ? tt("Takılıyor…") : tt("Tak")}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {hata && <p className="qt-cs-hata" role="alert">{hata}</p>}
      <QtDugme as={Link} to={y("/joker?sekme=cerceve")} tur="ikincil" ikon="dukkan" tamGenislik>{tt("Dükkân'da daha fazla çerçeve")}</QtDugme>
    </QtKart>
  );
}
