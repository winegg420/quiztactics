import { useEffect, useState } from "react";
import { hataMesaji } from "../lib/hata.js";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { konumKilidiKalan, sureMetni } from "../lib/konum.js";
import Bayrak from "./Bayrak.jsx";
import { tt } from "../lib/dil.js";
import { QtDugme, QtIkon, QtKart, QtModal } from "../tasarim/index.js";
import "../tasarim/ekranlar/dukkan-profil.css";

/**
 * Ülke + şehir seçimi.
 * mod = "modal": ilk girişte kapatılamayan zorunlu ekran (Home'dan açılır)
 * mod = "kart":  profil sayfasındaki düzenleme kartı
 * onKaydedildi: kayıt başarılı olunca çağrılır
 */
export default function KonumSecici({ mod = "kart", onKapat, onKaydedildi }) {
  const { profile, user, refreshProfile } = useAuth();
  const [ulkeler, setUlkeler] = useState([]);
  const [sehirler, setSehirler] = useState([]);
  const [ulke, setUlke] = useState(profile?.ulke ?? "TR");
  const [sehir, setSehir] = useState(profile?.sehir ?? "");
  const [hata, setHata] = useState(null);
  const [kaydediyor, setKaydediyor] = useState(false);

  const kalan = konumKilidiKalan(profile?.konum_degisti_at);
  const kilitli = mod === "kart" && kalan > 0;

  useEffect(() => {
    let aktif = true;
    const yukle = async () => {
      try {
        const { data, error } = await supabase
          .from("ulkeler")
          .select("kod, ad")
          .order("ad");
        if (error) throw error;
        if (aktif) setUlkeler(data ?? []);
      } catch (e) {
        if (aktif) setHata(hataMesaji(e, tt("Ülke listesi yüklenemedi.")));
      }
    };
    yukle();
    return () => {
      aktif = false;
    };
  }, []);

  useEffect(() => {
    let aktif = true;
    const yukle = async () => {
      if (!ulke) return;
      try {
        const { data, error } = await supabase
          .from("sehirler")
          .select("ad")
          .eq("ulke", ulke)
          .order("ad");
        if (error) throw error;
        if (aktif) setSehirler(data ?? []);
      } catch (e) {
        if (aktif) setHata(hataMesaji(e, tt("Şehir listesi yüklenemedi.")));
      }
    };
    yukle();
    return () => {
      aktif = false;
    };
  }, [ulke]);

  const serbestSehir = sehirler.length === 0;

  const kaydet = async () => {
    setHata(null);
    if (!ulke) {
      setHata(tt("Ülke seçmelisin."));
      return;
    }
    if (!sehir.trim()) {
      setHata(tt("Şehir seçmelisin."));
      return;
    }
    setKaydediyor(true);
    try {
      const { error } = await supabase.rpc("profil_konum_kaydet", {
        p_ulke: ulke,
        p_sehir: sehir.trim(),
      });
      if (error) throw error;
      await refreshProfile(user.id);
      onKaydedildi?.();
      onKapat?.();
    } catch (e) {
      setHata(hataMesaji(e, tt("Kaydedilemedi.")));
    } finally {
      setKaydediyor(false);
    }
  };

  const alanlar = (
    <>
      <label className="qt-pf-alan">
        <span>{tt("Ülke")} {ulke && <Bayrak kod={ulke} />}</span>
        <select
          value={ulke}
          disabled={kilitli}
          onChange={(e) => {
            setUlke(e.target.value);
            setSehir("");
          }}
        >
          {ulkeler.map((u) => (
            <option key={u.kod} value={u.kod}>
              {u.ad}
            </option>
          ))}
        </select>
      </label>

      <label className="qt-pf-alan">
        <span>{tt("Şehir")}</span>
        {serbestSehir ? (
          <input
            type="text"
            placeholder={tt("Şehrini yaz")}
            maxLength={40}
            value={sehir}
            disabled={kilitli}
            onChange={(e) => setSehir(e.target.value)}
          />
        ) : (
          <select
            value={sehir}
            disabled={kilitli}
            onChange={(e) => setSehir(e.target.value)}
          >
            <option value="">{tt("— Seç —")}</option>
            {sehirler.map((s) => (
              <option key={s.ad} value={s.ad}>
                {s.ad}
              </option>
            ))}
          </select>
        )}
      </label>

      {kilitli && (
        <p className="qt-pf-not qt-pf-not--uyari">
          <QtIkon ad="saat" boyut={18} />
          <span>{tt("Konumunu tekrar değiştirebilmen için {0} kaldı.", { 0: sureMetni(kalan) })}</span>
        </p>
      )}

      {hata && <p className="qt-pf-hata" role="alert">{hata}</p>}
    </>
  );

  const aciklama = (
    <>
      {tt("Şehir ve ülke liglerinde bu bilgiyle yarışırsın.")}{" "}
      <b>{tt("Günde yalnızca bir kez değiştirebilirsin.")}</b>
    </>
  );

  const kaydetDugmesi = (
    <QtDugme tamGenislik={mod === "modal"} boyut={mod === "modal" ? "o" : "k"} yukleniyor={kaydediyor}
             devreDisi={kilitli} onClick={kaydet}>
      {kaydediyor ? tt("Kaydediliyor…") : tt("Kaydet")}
    </QtDugme>
  );

  if (mod === "modal") {
    // İlk girişte zorunlu: onKapat yoksa kapatma düğmesi ve örtüye dokunma yok.
    return (
      <QtModal
        acik
        onKapat={onKapat ?? (() => {})}
        kapatDugmesi={Boolean(onKapat)}
        ortuKapatir={Boolean(onKapat)}
        baslik={tt("Hangi şehir için yarışıyorsun?")}
        aciklama={aciklama}
        altlik={kaydetDugmesi}
      >
        <div className="qt-pf-konum-alanlar">{alanlar}</div>
      </QtModal>
    );
  }
  return (
    <QtKart as="section" className="qt-pf-bolum qt-pf-konum" aria-labelledby="qt-pf-konum-baslik">
      <h2 id="qt-pf-konum-baslik" className="qt-baslik-3">{tt("Şehrin ve ülken")}</h2>
      <p className="qt-kucuk qt-soluk">{aciklama}</p>
      <div className="qt-pf-konum-alanlar">{alanlar}</div>
      <div className="qt-pf-dugme-sira">
        {kaydetDugmesi}
        {onKapat && (
          <QtDugme tur="ikincil" boyut="k" onClick={onKapat}>
            {tt("Vazgeç")}
          </QtDugme>
        )}
      </div>
    </QtKart>
  );
}
