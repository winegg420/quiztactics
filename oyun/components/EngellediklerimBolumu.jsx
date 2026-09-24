// ============================================================
// AYARLAR › ENGELLEDİKLERİM (620) — engellenen oyuncular + "Engeli kaldır"
// Liste ve kaldırma sunucuda (engellediklerim / engel_kaldir).
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import AvatarCerceve from "./AvatarCerceve.jsx";
import { hataMesaji } from "../lib/hata.js";
import { tt } from "../lib/dil.js";
import { QtDugme, QtIkon, QtKart } from "../tasarim/index.js";
import "../tasarim/ekranlar/sikayet.css";

export default function EngellediklerimBolumu() {
  const [liste, setListe] = useState(null);   // null = yükleniyor
  const [hata, setHata] = useState(null);
  const [calisan, setCalisan] = useState(null);

  const yukle = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("engellediklerim");
      if (error) throw error;
      setListe(data ?? []);
      setHata(null);
    } catch (e) {
      console.error("[Bildim] engellenenler alınamadı:", e);
      setHata(hataMesaji(e, tt("Yüklenemedi.")));
      setListe([]);
    }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);

  const kaldir = async (id) => {
    setCalisan(id);
    setHata(null);
    try {
      const { error } = await supabase.rpc("engel_kaldir", { p_kisi: id });
      if (error) throw error;
      setListe((l) => (l ?? []).filter((x) => x.id !== id));
    } catch (e) {
      setHata(hataMesaji(e, tt("İşlem yapılamadı.")));
    } finally {
      setCalisan(null);
    }
  };

  return (
    <QtKart as="section" className="qt-pf-bolum" aria-labelledby="qt-pf-engellenenler">
      <h2 id="qt-pf-engellenenler" className="qt-baslik-3">{tt("Engellediklerim")}</h2>
      {hata && <p className="sk-hata" role="alert"><QtIkon ad="uyari" boyut={16} /> <span>{hata}</span></p>}
      {liste === null ? (
        <p className="eg-bos" role="status">{tt("Yükleniyor…")}</p>
      ) : liste.length === 0 ? (
        <p className="eg-bos">{tt("Kimseyi engellemedin. Bir oyuncuyu profil kartından engelleyebilirsin.")}</p>
      ) : (
        <ul className="eg-liste">
          {liste.map((k) => (
            <li key={k.id} className="eg-satir">
              <AvatarCerceve profile={{ gorunen_avatar: k.avatar, gorunen_ad: k.ad }} userId={k.id} boyut={40} />
              <span className="eg-ad">{k.ad}</span>
              <QtDugme tur="ikincil" boyut="k" yukleniyor={calisan === k.id} devreDisi={Boolean(calisan) && calisan !== k.id}
                       onClick={() => kaldir(k.id)}>
                {tt("Engeli kaldır")}
              </QtDugme>
            </li>
          ))}
        </ul>
      )}
    </QtKart>
  );
}
