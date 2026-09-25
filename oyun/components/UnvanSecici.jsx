/**
 * PROFİL › KOLEKSİYON › UNVANLAR (643) — kazanılan unvanlar Kurdele görünümünde; birini tak / çıkar.
 * Kilitliler nasıl kazanılacağıyla görünür. Şehir Şampiyonu unvanı seçilmez: geçen haftayı şehrinde 1. bitirince
 * o hafta boyunca kendiliğinden görünür (takılı unvanın önüne geçer). Veri: unvanlarim / unvanTak (oyun/lib/unvan.js).
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../src/context/AuthContext.jsx";
import UnvanYazisi from "./UnvanYazisi.jsx";
import DurumKutusu from "./DurumKutusu.jsx";
import { unvanlarim, unvanTak, unvanMetni } from "../lib/unvan.js";
import { hataMesaji } from "../lib/hata.js";
import { aktifDil, tt } from "../lib/dil.js";
import { QtKart } from "../tasarim/index.js";

export default function UnvanSecici() {
  const { user } = useAuth();
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState(null);
  const [mesgul, setMesgul] = useState(false);
  const en = aktifDil() === "en";

  const yukle = useCallback(async () => {
    setHata(null);
    try { setVeri(await unvanlarim()); } catch (e) { setHata(hataMesaji(e, tt("Unvanlar yüklenemedi."))); }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);

  const sec = async (anahtar) => {
    if (mesgul || !veri) return;
    const yeni = veri.takili === anahtar ? null : anahtar;   // takılıya dokununca çıkar
    setMesgul(true);
    setHata(null);
    try {
      await unvanTak(yeni, user?.id);
      setVeri((v) => ({ ...v, takili: yeni, unvanlar: v.unvanlar.map((u) => ({ ...u, takili: u.anahtar === yeni })) }));
    } catch (e) {
      setHata(hataMesaji(e, tt("Unvan takılamadı.")));
    } finally {
      setMesgul(false);
    }
  };

  if (!veri) {
    return (
      <QtKart className="qt-cs">
        <DurumKutusu durum={hata ? "hata" : "yukleniyor"} metin={hata ?? undefined} onTekrar={yukle} satir={2} />
      </QtKart>
    );
  }
  const liste = [...veri.unvanlar].sort((a, b) => Number(b.kazanildi) - Number(a.kazanildi));
  return (
    <QtKart as="section" className="qt-cs" aria-labelledby="qt-ks-unvan">
      <h2 id="qt-ks-unvan" className="qt-baslik-3">{tt("Unvanlar")}</h2>
      <p className="qt-kucuk qt-soluk">{tt("Unvan isminin altında görünür. Birini seç; dokununca çıkar.")}</p>
      {veri.sehir_sampiyonu && (
        <p className="qt-kucuk">
          <UnvanYazisi unvan={{ tur: "sehir", sehir: veri.sehir_sampiyonu.sehir }} />{" "}
          {tt("Bu hafta şehir şampiyonusun: bu unvan kendiliğinden görünüyor.")}
        </p>
      )}
      {hata && <p className="qt-cs-hata" role="alert">{hata}</p>}
      <ul className="qt-un-liste">
        {liste.map((u) => (
          <li key={u.anahtar}>
            <button type="button" className={`qt-un-oge${u.kazanildi ? "" : " qt-un-oge--kilitli"}`}
                    aria-pressed={u.kazanildi ? u.takili : undefined} disabled={mesgul || !u.kazanildi}
                    onClick={() => sec(u.anahtar)}>
              <span className="qt-un-govde">
                <UnvanYazisi tur={u.tur} metin={en ? u.ad_en : u.ad_tr} boy="o" />
                <span className="qt-un-nasil">{en ? u.aciklama_en : u.aciklama_tr}</span>
              </span>
              <span className="qt-un-durum">
                {!u.kazanildi ? tt("Kilitli") : u.takili ? tt("Takılı") : tt("Tak")}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </QtKart>
  );
}

export { unvanMetni };
