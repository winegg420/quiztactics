import { useEffect, useMemo, useState } from "react";
import { hataMesaji } from "../lib/hata.js";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { konumHaftaKilitli, konumKilidiKalan, sureMetni, ulkeAdi } from "../lib/konum.js";
import Bayrak from "./Bayrak.jsx";
import SehirArama from "./SehirArama.jsx";
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
  const [sehirYukleniyor, setSehirYukleniyor] = useState(false);

  const kalan = konumKilidiKalan(profile?.konum_degisti_at);
  // 641: şehri olan oyuncu bu hafta puan kazandıysa yeni haftayı bekler (ilk seçim serbest)
  const haftaKilitli = mod === "kart" && konumHaftaKilitli(profile);
  const kilitli = haftaKilitli || (mod === "kart" && kalan > 0);
  const ulkeListesi = useMemo(
    () => ulkeler
      .map((u) => ({ ...u, gorunen: ulkeAdi(u.kod, u.ad) }))
      .sort((a, b) => a.gorunen.localeCompare(b.gorunen)),
    [ulkeler]
  );

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
      setSehirYukleniyor(true);
      try {
        // Büyük şehir önce (arama boşken listede en kalabalıklar üstte)
        const { data, error } = await supabase
          .from("sehirler")
          .select("ad, nufus")
          .eq("ulke", ulke)
          .order("nufus", { ascending: false, nullsFirst: false })
          .order("ad");
        if (error) throw error;
        if (aktif) setSehirler(data ?? []);
      } catch (e) {
        if (aktif) setHata(hataMesaji(e, tt("Şehir listesi yüklenemedi.")));
      } finally {
        if (aktif) setSehirYukleniyor(false);
      }
    };
    yukle();
    return () => {
      aktif = false;
    };
  }, [ulke]);

  const kaydet = async () => {
    setHata(null);
    if (!ulke) {
      setHata(tt("Ülke seçmelisin."));
      return;
    }
    if (!sehir.trim() || !sehirler.some((s) => s.ad === sehir)) {
      setHata(tt("Şehrini listeden seç."));
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
          {ulkeListesi.map((u) => (
            <option key={u.kod} value={u.kod}>
              {u.gorunen}
            </option>
          ))}
        </select>
      </label>

      <SehirArama
        sarmalSinif="qt-pf-alan"
        sehirler={sehirler}
        deger={sehir}
        onSec={setSehir}
        devreDisi={kilitli}
        yukleniyor={sehirYukleniyor}
      />

      {kilitli && (
        <p className="qt-pf-not qt-pf-not--uyari">
          <QtIkon ad="saat" boyut={18} />
          <span>
            {haftaKilitli
              ? tt("Bu hafta puan kazandığın için şehrini yeni hafta başlayana kadar değiştiremezsin.")
              : tt("Konumunu tekrar değiştirebilmen için {0} kaldı.", { 0: sureMetni(kalan) })}
          </span>
        </p>
      )}

      {hata && <p className="qt-pf-hata" role="alert">{hata}</p>}
    </>
  );

  const aciklama = (
    <>
      {tt("Şehir ve ülke liglerinde bu bilgiyle yarışırsın.")}{" "}
      <b>{tt("Günde en fazla bir kez değiştirebilirsin; o hafta puan kazandıysan yeni haftayı beklersin.")}</b>
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
