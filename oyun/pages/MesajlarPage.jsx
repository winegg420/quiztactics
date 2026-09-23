import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import AvatarCerceve from "../components/AvatarCerceve.jsx";
import SohbetKutusu from "../components/SohbetKutusu.jsx";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";
import GeriDugmesi from "../components/GeriDugmesi.jsx";
import { QtKart, QtDugme, QtListe, QtListeSatiri, QtBosDurum, QtIskelet, QtSayiRozeti } from "../tasarim/index.js";
import "../tasarim/ekranlar/l-sosyal.css";

// ============================================================
// MESAJLAR — sohbet listesi (Paket 35 E.3.1)
// Rota: /mesajlar (liste) ve /mesajlar/:kisi (sohbet listenin üstünde açılır;
// push bildirimi de doğrudan bu adrese getirir).
// Yalnız karşılıklı arkadaşlar mesajlaşır; kontrol sunucuda (dm_gonder).
// ============================================================
const saatMetni = (iso) => {
  try {
    const t = new Date(iso);
    const bugun = new Date();
    return t.toDateString() === bugun.toDateString()
      ? t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : t.toLocaleDateString([], { day: "numeric", month: "short" });
  } catch {
    return "";
  }
};

export default function MesajlarPage() {
  const { user } = useAuth();
  const { kisi } = useParams();
  const navigate = useNavigate();
  const konum = useLocation();
  const [liste, setListe] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(null);

  const yukle = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("dm_sohbetlerim");
      if (error) throw error;
      setListe(data ?? []);
      setHata(null);
    } catch (e) {
      // Paket 41 A: ham sunucu metni gösterilmez
      console.error("[Bildim] sohbet listesi alınamadı:", e);
      setHata(true);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    yukle();
    // Yeni mesaj / okundu değişimi → liste yenilenir (RLS: yalnız kendi sohbetlerim gelir)
    const kanal = supabase
      .channel(`dm-liste-${Math.random().toString(36).slice(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "direkt_mesajlar" }, yukle)
      .subscribe();
    return () => supabase.removeChannel(kanal);
  }, [user, yukle]);

  // Sohbetten geri: uygulama içinden gelindiyse bir adım geri, doğrudan açıldıysa listeye
  const geri = () => {
    if (konum.key && konum.key !== "default") navigate(-1);
    else navigate(y("/mesajlar"), { replace: true });
  };

  return (
    <div className="ls-sayfa ms-sayfa">
      {/* Paket 42 J.3: liste ekranında geri yolu yoktu (alt sekmede Mesajlar yok) */}
      <GeriDugmesi />
      <header className="ls-baslik">
        <div className="ls-baslik-metin">
          <h1 className="qt-baslik-1">{tt("Mesajlar")}</h1>
          <p className="qt-soluk-zemin">{tt("Arkadaşlarınla yazış, maç ayarla.")}</p>
        </div>
      </header>

      {yukleniyor && liste.length === 0 && (
        <div className="qt-liste ls-iskelet" role="status" aria-busy="true">
          <span className="qt-gizli">{tt("Yükleniyor…")}</span>
          <QtIskelet tur="satir" adet={4} />
        </div>
      )}
      {hata && (
        <QtKart role="alert">
          <QtBosDurum
            ikon="uyari"
            ton="yanlis"
            baslik={tt("Yüklenemedi.")}
            metin={tt("Bağlantını kontrol edip tekrar dene.")}
            eylem={
              <QtDugme tur="ikincil" ikon="yenile" onClick={() => { setHata(null); setYukleniyor(true); yukle(); }}>
                {tt("Tekrar dene")}
              </QtDugme>
            }
          />
        </QtKart>
      )}

      {!yukleniyor && !hata && liste.length === 0 && (
        <QtKart>
          <QtBosDurum
            ikon="sohbet"
            baslik={tt("Henüz mesajın yok")}
            metin={tt("Arkadaşlarına ilk mesajı sen at.")}
            eylem={<QtDugme ikon="kisiler" onClick={() => navigate(y("/arkadaslar"))}>{tt("Arkadaşlar")}</QtDugme>}
          />
        </QtKart>
      )}

      {liste.length > 0 && (
        <QtListe etiket={tt("Sohbetler")}>
          {liste.map((s) => {
            const ilkSatir = String(s.son_metin ?? "").split("\n")[0];
            const okunmamis = Number(s.okunmamis) || 0;
            return (
              <QtListeSatiri
                key={s.kisi_id}
                className={`ms-satir${okunmamis > 0 ? " ms-satir--okunmamis" : ""}`}
                onClick={() => navigate(y(`/mesajlar/${s.kisi_id}`))}
                aria-label={okunmamis > 0
                  ? tt("{ad} ile sohbet, {0} okunmamış", { ad: s.gorunen_ad, 0: okunmamis })
                  : tt("{0} ile sohbet", { 0: s.gorunen_ad })}
                bas={<AvatarCerceve profile={s} userId={s.kisi_id} boyut={48} />}
                baslik={<span className="ls-ad">{s.gorunen_ad}</span>}
                alt={
                  <span className="ms-onizleme">
                    {s.son_benden ? <b>{tt("Sen:")} </b> : null}{ilkSatir}
                  </span>
                }
                sag={
                  <span className="ms-sag">
                    <span className="ms-saat">{saatMetni(s.son_zaman)}</span>
                    <QtSayiRozeti sayi={okunmamis} className="ms-rozet" />
                  </span>
                }
              />
            );
          })}
        </QtListe>
      )}

      {kisi && user && (
        <SohbetKutusu key={kisi} benId={user.id} kisiId={kisi} onGeri={geri} />
      )}
    </div>
  );
}
