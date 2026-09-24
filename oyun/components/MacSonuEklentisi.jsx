import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { hataMesaji } from "../lib/hata.js";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { JOKER_BILGI } from "../lib/jokerler.js";
import SkillRozeti from "./SkillRozeti.jsx";
import YanlisSatiri from "./YanlisSatiri.jsx";
import { QtDugme, QtIkon, QtKart, QtRozet } from "../tasarim/index.js";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";
import "../tasarim/ekranlar/m1-mac.css";
import "../tasarim/ekranlar/m1-sonuc.css";

/**
 * Maç sonucu ekranına eklenen blok:
 *  - bu maçta kullanılan jokerler
 *  - kaybedildiyse büyük "Rövanş" butonu (son 24 saat) — YALNIZ gerçek
 *    oyuncuya karşı. Bot rakipte doğrudan rövanş MatchPage'de çizilir;
 *    eskiden ikisi birden görünüyor ve oyuncu hangisine basacağını
 *    bilemiyordu (10 Eylül canlı testi).
 *  - güncel günlük seri
 *
 * Paket 36: rovansYuva (DOM düğümü) verilirse Rövanş isteği düğmesi, notu ve
 * hatası oraya (MacSonuSahnesi eylem çubuğuna) portal ile çizilir. Mantık aynı.
 * onYanlisAdet: YanlisSatiri'nın saydığı yanlış sayısı (Detay rozeti için).
 */
export default function MacSonuEklentisi({ macTur, macId, kaybettim, rakipBot = false, rovansYuva = null, onYanlisAdet }) {
  const navigate = useNavigate();
  const [jokerler, setJokerler] = useState([]);
  const [seri, setSeri] = useState(null);
  const [hata, setHata] = useState(null);
  const [calisiyor, setCalisiyor] = useState(false);

  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("joker_kullanimlari")
          .select("tur, ucretsiz, soru_index")
          .eq("mac_tur", macTur)
          .eq("mac_id", macId)
          .order("soru_index");
        if (error) throw error;
        if (aktif) setJokerler(data ?? []);
      } catch (e) {
        console.warn("[Bildim] maçta kullanılan skill'ler okunamadı:", e?.message ?? e);
      }
      try {
        const { data, error } = await supabase.rpc("seri_durumum");
        if (error) throw error;
        if (aktif) setSeri(Array.isArray(data) ? data[0] : data);
      } catch (e) {
        console.warn("[Bildim] seri_durumum başarısız:", e?.message ?? e);
      }
    })();
    return () => {
      aktif = false;
    };
  }, [macTur, macId]);

  const rovans = async () => {
    setHata(null);
    setCalisiyor(true);
    try {
      const { data, error } = await supabase.rpc("rovans_iste", { p_mac_id: macId });
      if (error) throw error;
      if (data) navigate(y(`/mac/${data}`));
      else navigate(y("/meydan"));
    } catch (e) {
      setHata(hataMesaji(e, tt("Rövanş istenemedi.")));
    } finally {
      setCalisiyor(false);
    }
  };

  const rovansNotu = tt("Rakibine istek gönderilir · aynı kategori · 24 saat geçerli");

  return (
    <div className="m1-ek">
      {/* Yanlışlar Hatalarım bankasına eklendi */}
      <YanlisSatiri macTur={macTur} macId={macId} onAdet={onYanlisAdet} />

      {(seri && (seri.seri_gun ?? 0) > 0) || jokerler.length > 0 ? (
        <QtKart dolgu="k" className="m1-ek-kart">
          {seri && (seri.seri_gun ?? 0) > 0 && (
            <p className="m1-ek-seri">
              <QtRozet ton="vurgu" ikon="ates">{tt("{n}. gün", { n: seri.seri_gun })}</QtRozet>
              {tt("Serin sürüyor")}
            </p>
          )}
          {jokerler.length > 0 && (
            <div className="m1-ek-skill">
              <span className="m1-ek-etiket">{tt("Bu maçta kullandığın jokerler:")}</span>
              <span className="m1-ss-satir">
                {jokerler.map((j, i) => (
                  <QtRozet key={i} ton="mor" boyut="k" className="m1-ss-skill">
                    <SkillRozeti tur={j.tur} boyut={20} />
                    {JOKER_BILGI[j.tur]?.ad ?? j.tur}
                    {j.ucretsiz ? ` ${tt("(ücretsiz)")}` : ""}
                  </QtRozet>
                ))}
              </span>
            </div>
          )}
        </QtKart>
      ) : null}

      {/* Rövanş İSTEĞİ yalnız gerçek oyuncuya karşı. Bot rakipte doğrudan
          rövanş MatchPage'de çizilir; ikisi aynı anda görünmez. */}
      {kaybettim && macTur === "1v1" && !rakipBot && !rovansYuva && (
        <>
          <QtDugme tamGenislik ikon="yenile" yukleniyor={calisiyor} onClick={rovans}>
            {tt("Rövanş")}
          </QtDugme>
          <p className="m1-ss-not">{rovansNotu}</p>
        </>
      )}

      {kaybettim && macTur === "1v1" && !rakipBot && rovansYuva && createPortal(
        <>
          <QtDugme className="mss-tam" ikon="yenile" yukleniyor={calisiyor} onClick={rovans}>
            {tt("Rövanş")}
          </QtDugme>
          <div className="mss-eylem-not">{rovansNotu}</div>
          {hata && <div className="m1-bant m1-bant--hata mss-tam" role="alert"><QtIkon ad="uyari" boyut={18} /><span>{hata}</span></div>}
        </>,
        rovansYuva
      )}

      {hata && !rovansYuva && <div className="m1-bant m1-bant--hata" role="alert"><QtIkon ad="uyari" boyut={18} /><span>{hata}</span></div>}
    </div>
  );
}

