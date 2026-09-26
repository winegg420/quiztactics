// Geliştirici / tasarım sayfalarını yalnız sahibe açar (sunucu: sahip_mi()).
// Giriş şartı BildimApp'te; burada ikinci kapı: giriş yapmış herhangi bir gerçek/misafir
// oyuncu sayfayı görmez. Yerel geliştirmede (.env yok) kapı atlanır ki sayfalar ölçülebilsin.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, supabaseHazir } from "../lib/supabase.js";
import { QtKart, QtBosDurum, QtDugme, QtIskelet } from "../../oyun/tasarim/index.js";
import { tt } from "../../oyun/lib/dil.js";

const YEREL = import.meta.env.DEV && !supabaseHazir;

export default function SahipKapisi({ children }) {
  const [durum, setDurum] = useState(YEREL ? "hazir" : "yukleniyor"); // yukleniyor · sahip-degil · hata · hazir

  const yukle = useCallback(async () => {
    if (YEREL) { setDurum("hazir"); return; }
    setDurum("yukleniyor");
    try {
      const { data, error } = await supabase.rpc("sahip_mi");
      if (error) throw error;
      setDurum(data ? "hazir" : "sahip-degil");
    } catch (e) {
      console.error("sahip kapısı:", e?.message ?? e);
      setDurum("hata");
    }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);

  if (durum === "hazir") return children;
  if (durum === "yukleniyor") {
    return <div className="qt-sayfa"><div className="qt-sayfa-ic" aria-busy="true"><QtIskelet tur="kart" adet={1} /></div></div>;
  }
  const sahipDegil = durum === "sahip-degil";
  return (
    <div className="qt-sayfa"><div className="qt-sayfa-ic"><QtKart>
      <QtBosDurum ikon={sahipDegil ? "kilit" : "uyari"} ton={sahipDegil ? "mor" : "yanlis"}
                  baslik={sahipDegil ? tt("Bu sayfa yalnız sahibe açık") : tt("Sayfa yüklenemedi")}
                  eylem={sahipDegil ? <QtDugme as={Link} to="/" tur="ikincil" ikon="ev">{tt("Ana sayfaya dön")}</QtDugme>
                    : <QtDugme tur="ikincil" ikon="yenile" onClick={yukle}>{tt("Tekrar dene")}</QtDugme>} />
    </QtKart></div></div>
  );
}
