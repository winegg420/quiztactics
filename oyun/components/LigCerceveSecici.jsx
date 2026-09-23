// ============================================================
// LİG ÇERÇEVESİ SEÇİCİ (Aşama 2D-E) — profil sayfası
//
// Kazanılan çerçeveler (lig atlayınca, kalıcı) arasından seçim. Kazanılmamış
// ligler kilitli görünür ve satın alınamaz; kazanma yolu yalnız lig atlamak.
// Sunucu: lig_cercevelerim / lig_cerceve_sec (migration 213).
// ============================================================
import { useCallback, useEffect, useState } from "react";
import Avatar from "../../src/components/Avatar.jsx";
import { LIG_CERCEVELERI, LIG_CERCEVE_ADI, ligCercevelerim, ligCerceveSec } from "../lib/ligCerceve.js";
import { hataMesaji } from "../lib/hata.js";
import { tt } from "../lib/dil.js";
import { QtIkon, QtKart } from "../tasarim/index.js";
import "../tasarim/ekranlar/dukkan-bilesen.css";

export default function LigCerceveSecici({ profile, userId }) {
  const [liste, setListe] = useState(null);   // [{lig, secili}]
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState(null);

  const yukle = useCallback(async () => {
    try {
      setListe(await ligCercevelerim());
    } catch (e) {
      console.error("[Bildim] lig çerçeveleri:", e);
      setHata(hataMesaji(e, tt("Çerçeveler yüklenemedi.")));
    }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);

  if (!liste) return hata ? <p className="qt-dk-hata-metin" role="alert">{hata}</p> : null;

  const kazanilan = new Set(liste.map((x) => x.lig));
  const secili = liste.find((x) => x.secili)?.lig ?? null;

  const sec = async (lig) => {
    if (mesgul || lig === secili) return;
    setMesgul(true); setHata(null);
    try {
      await ligCerceveSec(lig, userId);
      await yukle();
    } catch (e) {
      setHata(hataMesaji(e, tt("Çerçeve seçilemedi.")));
    } finally {
      setMesgul(false);
    }
  };

  // Çerçeve çizimi eski bd-cerceve / bd-lig-cerceve-<lig> sınıflarından gelir (AvatarCerceve ile ortak sanat);
  // yalnız kap ve seçim düğmeleri Tasarım A.
  return (
    <QtKart as="section" className="qt-dk-cerceveler" aria-labelledby="qt-dk-cerceve-baslik">
      <h2 id="qt-dk-cerceve-baslik" className="qt-baslik-3">{tt("Lig çerçevelerim")}</h2>
      <p className="qt-kucuk qt-soluk">{tt("Lig atlayınca o ligin çerçevesini kazanırsın. Ligden düşsen de çerçeve sende kalır. Satılmaz.")} {tt("Bronz ligin çerçevesi yoktur; ilk çerçeve Gümüş'te açılır.")}</p>
      <div className="qt-dk-cerceve-liste">
        <button type="button" className="qt-dk-cerceve-sec" aria-pressed={secili === null}
                disabled={mesgul} onClick={() => sec(null)}>
          <span className="bd-cerceve bd-cerceve-sirali" style={{ width: 56, height: 56 }}><Avatar profile={profile} boyut={56} /></span>
          <span className="qt-dk-cerceve-ad">{tt("Çerçeve takma")}</span>
        </button>
        {LIG_CERCEVELERI.map((lig) => {
          const var_ = kazanilan.has(lig);
          return (
            <button key={lig} type="button" className="qt-dk-cerceve-sec" aria-pressed={secili === lig}
                    disabled={mesgul || !var_} onClick={() => sec(lig)}
                    aria-label={var_ ? LIG_CERCEVE_ADI[lig] : tt("{lig} — kilitli, lig atlayınca kazanılır", { lig: LIG_CERCEVE_ADI[lig] })}>
              <span className={`bd-cerceve bd-lig-cerceve bd-lig-cerceve-${lig}`} style={{ width: 56, height: 56 }}>
                <Avatar profile={profile} boyut={56} />
              </span>
              <span className="qt-dk-cerceve-ad">{LIG_CERCEVE_ADI[lig]}</span>
              {!var_ && <span className="qt-dk-cerceve-kilit"><QtIkon ad="kilit" boyut={14} /> {tt("lig atla")}</span>}
            </button>
          );
        })}
      </div>
      {hata && <p className="qt-dk-hata-metin" role="alert">{hata}</p>}
    </QtKart>
  );
}
