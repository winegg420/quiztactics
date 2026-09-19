import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import AvatarCerceve from "../components/AvatarCerceve.jsx";
import SohbetKutusu from "../components/SohbetKutusu.jsx";
import Maskot from "../components/Maskot.jsx";
import DurumKutusu from "../components/DurumKutusu.jsx";
import Ikon from "../components/Ikon.jsx";
import { hataMesaji } from "../lib/hata.js";
import { rozetMetni } from "../lib/mesajlar.js";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";

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
    <div className="bd-mesajlar">
      <h1 className="baslik">{tt("Mesajlar")}</h1>
      {yukleniyor && liste.length === 0 && <DurumKutusu durum="yukleniyor" satir={4} />}
      {hata && <DurumKutusu durum="hata" onTekrar={() => { setHata(null); setYukleniyor(true); yukle(); }} />}

      {!yukleniyor && !hata && liste.length === 0 && (
        <div className="bd-bos-durum">
          <Maskot poz="selam" boyut={86} />
          <p>{tt("Henüz mesajın yok. Arkadaşlarına ilk mesajı sen at.")}</p>
          <button type="button" className="btn" onClick={() => navigate(y("/arkadaslar"))}>
            <Ikon ad="kisiler" boyut={18} /> {tt("Arkadaşlar")}
          </button>
        </div>
      )}

      {liste.map((s) => {
        const ilkSatir = String(s.son_metin ?? "").split("\n")[0];
        const okunmamis = Number(s.okunmamis) || 0;
        return (
          <button
            key={s.kisi_id}
            type="button"
            className={`liste-satir bd-dm-satir${okunmamis > 0 ? " okunmamis" : ""}`}
            onClick={() => navigate(y(`/mesajlar/${s.kisi_id}`))}
          >
            <AvatarCerceve profile={s} userId={s.kisi_id} />
            <div className="bilgi">
              <div className="isim">{s.gorunen_ad}</div>
              <div className="detay bd-dm-onizleme">
                {s.son_benden ? `${tt("Sen:")} ` : ""}{ilkSatir}
              </div>
            </div>
            <div className="bd-dm-sag">
              <span className="bd-dm-saat">{saatMetni(s.son_zaman)}</span>
              {okunmamis > 0 && (
                <span className="bd-dm-rozet" aria-label={tt("{0} okunmamış", { 0: okunmamis })}>
                  {rozetMetni(okunmamis)}
                </span>
              )}
            </div>
          </button>
        );
      })}

      {kisi && user && (
        <SohbetKutusu key={kisi} benId={user.id} kisiId={kisi} onGeri={geri} />
      )}
    </div>
  );
}
