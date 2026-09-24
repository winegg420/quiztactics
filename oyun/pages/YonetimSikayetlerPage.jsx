// ============================================================
// YÖNETİM › ŞİKÂYETLER (620) — yalnız yöneticiler (sunucu: yonetici_mi; sikayetler_yonetim / sikayet_isle)
// Menüde yok; adres: /yonetim/sikayetler. Kim, kimi, sebep, mesaj, tarih; İncelendi · Mesajlaşmasını kapat ·
// Hesabı askıya al (ve geri al). Yetkisiz hesapta sunucu boş/hata döner — sayfa yalnız "yalnız yöneticilere" yazar.
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import GeriDugmesi from "../components/GeriDugmesi.jsx";
import { hataMesaji } from "../lib/hata.js";
import { tt, aktifDil } from "../lib/dil.js";
import { QtBosDurum, QtDugme, QtIkon, QtKart } from "../tasarim/index.js";
import { SIKAYET_SEBEPLERI } from "../components/SikayetPenceresi.jsx";
import "../tasarim/ekranlar/sikayet.css";

const SEBEP_AD = Object.fromEntries(SIKAYET_SEBEPLERI.map((s) => [s.kod, s.ad]));
const tarih = (iso) => {
  try { return new Date(iso).toLocaleString(aktifDil() === "en" ? "en-GB" : "tr-TR", { dateStyle: "short", timeStyle: "short" }); }
  catch { return ""; }
};

export default function YonetimSikayetlerPage() {
  const [yetki, setYetki] = useState(null);      // null = bakılıyor
  const [filtre, setFiltre] = useState("yeni");  // "yeni" | null (hepsi)
  const [liste, setListe] = useState(null);
  const [hata, setHata] = useState(null);
  const [calisan, setCalisan] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.rpc("yonetici_mi");
        if (error) throw error;
        setYetki(Boolean(data));
      } catch (e) {
        console.error("[Bildim] yönetici kontrolü:", e);
        setYetki(false);
      }
    })();
  }, []);

  const yukle = useCallback(async () => {
    setHata(null);
    try {
      const { data, error } = await supabase.rpc("sikayetler_yonetim", { p_durum: filtre });
      if (error) throw error;
      setListe(data ?? []);
    } catch (e) {
      setHata(hataMesaji(e, tt("Yüklenemedi.")));
      setListe([]);
    }
  }, [filtre]);
  useEffect(() => { if (yetki) yukle(); }, [yetki, yukle]);

  const isle = async (id, islem) => {
    setCalisan(`${id}:${islem}`);
    setHata(null);
    try {
      const { error } = await supabase.rpc("sikayet_isle", { p_id: id, p_islem: islem });
      if (error) throw error;
      await yukle();
    } catch (e) {
      setHata(hataMesaji(e, tt("İşlem yapılamadı.")));
    } finally {
      setCalisan(null);
    }
  };

  if (yetki === false) {
    return (
      <div className="ls-sayfa yk-sayfa">
        <GeriDugmesi />
        <QtKart><QtBosDurum ikon="kilit" baslik={tt("Bu sayfa yalnız yöneticilere açık")} /></QtKart>
      </div>
    );
  }

  return (
    <div className="ls-sayfa yk-sayfa">
      <GeriDugmesi />
      <h1 className="qt-baslik-1">{tt("Şikâyetler")}</h1>
      <div className="yk-filtre" role="group" aria-label={tt("Filtre")}>
        <QtDugme boyut="k" tur={filtre === "yeni" ? "birincil" : "ikincil"} onClick={() => setFiltre("yeni")}>{tt("Yeni")}</QtDugme>
        <QtDugme boyut="k" tur={filtre === null ? "birincil" : "ikincil"} onClick={() => setFiltre(null)}>{tt("Hepsi")}</QtDugme>
        <QtDugme boyut="k" tur="ikincil" ikon="yenile" onClick={yukle}>{tt("Yenile")}</QtDugme>
      </div>
      {hata && <p className="sk-hata" role="alert"><QtIkon ad="uyari" boyut={16} /> <span>{hata}</span></p>}
      {(yetki === null || liste === null) && <p className="eg-bos" role="status">{tt("Yükleniyor…")}</p>}
      {liste && liste.length === 0 && !hata && (
        <QtKart><QtBosDurum ikon="onay" baslik={tt("Bekleyen şikâyet yok")} /></QtKart>
      )}
      {(liste ?? []).map((s) => (
        <QtKart key={s.id} as="article" className="yk-kart">
          <div className="yk-ust">
            <span className={`yk-etiket${s.durum === "yeni" ? " yk-etiket--yeni" : ""}`}>{s.durum === "yeni" ? tt("Yeni") : tt("İncelendi")}</span>
            <span>{tt(SEBEP_AD[s.sebep] ?? s.sebep)}</span>
            <span>· {tarih(s.created_at)}</span>
            {s.islem && s.islem !== "incelendi" && <span className="yk-etiket">{s.islem}</span>}
          </div>
          <p className="yk-kisiler">
            {s.eden_ad ?? "?"} → {s.edilen_ad ?? "?"}
            {" "}<span className="yk-etiket">{tt("{0} şikâyet", { 0: s.edilen_sikayet_sayisi })}</span>
            {s.edilen_mesaj_kapali && <span className="yk-etiket yk-etiket--kapali"> {tt("Mesajlaşma kapalı")}</span>}
            {s.edilen_askida && <span className="yk-etiket yk-etiket--kapali"> {tt("Askıda")}</span>}
          </p>
          {s.mesaj_metni && <blockquote className="yk-mesaj">{s.mesaj_metni}</blockquote>}
          {s.aciklama && <p className="yk-aciklama">{s.aciklama}</p>}
          <div className="yk-eylemler">
            {s.durum === "yeni" && (
              <QtDugme boyut="k" tur="ikincil" ikon="onay" yukleniyor={calisan === `${s.id}:incelendi`} onClick={() => isle(s.id, "incelendi")}>
                {tt("İncelendi")}
              </QtDugme>
            )}
            {s.edilen_id && (s.edilen_mesaj_kapali ? (
              <QtDugme boyut="k" tur="ikincil" yukleniyor={calisan === `${s.id}:mesaj_ac`} onClick={() => isle(s.id, "mesaj_ac")}>
                {tt("Mesajlaşmasını aç")}
              </QtDugme>
            ) : (
              <QtDugme boyut="k" tur="ikincil" ikon="sohbet" yukleniyor={calisan === `${s.id}:mesaj_kapat`} onClick={() => isle(s.id, "mesaj_kapat")}>
                {tt("Mesajlaşmasını kapat")}
              </QtDugme>
            ))}
            {s.edilen_id && (s.edilen_askida ? (
              <QtDugme boyut="k" tur="ikincil" yukleniyor={calisan === `${s.id}:askidan_al`} onClick={() => isle(s.id, "askidan_al")}>
                {tt("Askıdan al")}
              </QtDugme>
            ) : (
              <QtDugme boyut="k" ikon="kilit" yukleniyor={calisan === `${s.id}:askiya_al`} onClick={() => isle(s.id, "askiya_al")}>
                {tt("Hesabı askıya al")}
              </QtDugme>
            ))}
          </div>
        </QtKart>
      ))}
    </div>
  );
}
