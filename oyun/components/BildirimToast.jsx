import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { QtToast, QtToastYuvasi, QtDugme } from "../tasarim/index.js";
import "../tasarim/ekranlar/l-kart.css";
import { tt, ttSunucu } from "../lib/dil.js";
import { coinTazele } from "../lib/coin.js";
import { sesBildirim, sesCoin } from "../lib/ses.js";

// Davet tipleri burada YOK: onları üstteki davet bandı (DavetBandi) gösterir —
// bandda "Kabul Et" butonu da var, toast aynı şeyi ikinci kez söylemesin.
const TIP_STIL = {
  arkadas_istek: { ikon: "kisiler", sinif: "bilgi", baslik: tt("Arkadaşlık isteği") },
  arkadas_kabul: { ikon: "kisiler", sinif: "bilgi", baslik: tt("Yeni arkadaş") },
  gecildin: { ikon: "grafik", sinif: "uyari", baslik: tt("Sıran düştü") },
  lige_girdin: { ikon: "sehir", sinif: "bilgi", baslik: tt("Ligdesin") },
  hafta_sonuc: { ikon: "kupa", sinif: "odul", baslik: tt("Hafta bitti") },
  seri_hatirlatma: { ikon: "ates", sinif: "uyari", baslik: tt("Serini koru") },
  // Kabul bildirimleri (Paket 24 · A.3): GİDEN davetin kabulü. Bunlar bantta çıkmaz —
  // bant GELEN daveti gösterir — bu yüzden ikisi asla aynı anda görünmez.
  meydan_kabul: { ikon: "kilic", sinif: "kabul", baslik: tt("Meydan okuman kabul edildi") },
  duello_kabul: { ikon: "kilic", sinif: "kabul", baslik: tt("Düello kabul edildi") },
  grup_kabul: { ikon: "kisiler", sinif: "kabul", baslik: tt("Grup maçın başlıyor") },
  // Davet (migration 354): kayıt → davet edene haber; Level 5 → ödül (coin sesi + animasyon).
  davet_katildi: { ikon: "hediye", sinif: "kabul", baslik: tt("Davetin işe yaradı") },
  davet_odul: { ikon: "coin", sinif: "odul", baslik: tt("Davet ödülü"), coin: true },
};

// Tasarım A: eski sınıf → QtToast tonu (uyari/odul/kabul renkleri token’dan)
const TON = { bilgi: "bilgi", uyari: "uyari", odul: "coin", kabul: "dogru" };

// Bant tarafından gösterilenler toast'a hiç girmez.
const BANTTA_GOSTERILEN = new Set(["mac_daveti", "rovans", "grup_daveti", "hizli_daveti", "duello_daveti"]);

// Kabul bildirimi ekranda daha uzun kalsın: oyun başlamıştır, kaçırılmamalı.
const KABUL_TIPLERI = new Set(["meydan_kabul", "duello_kabul", "grup_kabul"]);

const SURE = 7000;
const SURE_KABUL = 9000;

/**
 * Bildirim geldiği anda ekranın EN ÜSTÜNDE beliren şerit.
 * Alt menüdeki rozet gözden kaçtığı için eklendi; maç sırasında (oyun modu)
 * CSS ile gizlenir, oyunu bölmez.
 */
export default function BildirimToast() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kuyruk, setKuyruk] = useState([]);
  const [kapaniyor, setKapaniyor] = useState(false);
  const sayacRef = useRef(null);

  const kapat = useCallback(() => {
    setKapaniyor(true);
    window.setTimeout(() => {
      setKapaniyor(false);
      setKuyruk((k) => k.slice(1));
    }, 220);
  }, []);

  useEffect(() => {
    if (!user) return;
    const kanal = supabase
      .channel("bildirim-toast")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bildirimler",
          filter: `user_id=eq.${user.id}`,
        },
        (yuk) => {
          const b = yuk.new;
          if (!b || BANTTA_GOSTERILEN.has(b.tip)) return;
          setKuyruk((k) => (k.some((x) => x.id === b.id) ? k : [...k, b].slice(-4)));
        }
      )
      .subscribe();
    return () => supabase.removeChannel(kanal);
  }, [user]);

  const aktif = kuyruk[0] ?? null;

  const kabulMu = aktif ? KABUL_TIPLERI.has(aktif.tip) : false;
  const sure = kabulMu ? SURE_KABUL : SURE;

  useEffect(() => {
    if (!aktif) return;
    sayacRef.current = window.setTimeout(kapat, sure);
    return () => window.clearTimeout(sayacRef.current);
  }, [aktif, kapat, sure]);

  // Coin kazandıran bildirim ekrana geldiği anda: bakiye tazelenir + coin sesi (bir kez;
  // StrictMode çift efekti ikinci kez çalmasın diye kimlik kümesi).
  const coinGosterilen = useRef(new Set());
  useEffect(() => {
    if (!aktif || !TIP_STIL[aktif.tip]?.coin || coinGosterilen.current.has(aktif.id)) return;
    coinGosterilen.current.add(aktif.id);
    coinTazele();
    if (!document.body.classList.contains("bd-oyun-modu")) sesCoin();
  }, [aktif]);
  // Ajan H: coin'siz bildirim ekrana gelince bildirim sesi (bir kez; maç sırasında sessiz).
  const sesGosterilen = useRef(new Set());
  useEffect(() => {
    if (!aktif || TIP_STIL[aktif.tip]?.coin || sesGosterilen.current.has(aktif.id)) return;
    sesGosterilen.current.add(aktif.id);
    if (!document.body.classList.contains("bd-oyun-modu")) sesBildirim();
  }, [aktif]);

  if (!aktif) return null;

  const stil = TIP_STIL[aktif.tip] ?? { ikon: "zil", sinif: "bilgi", baslik: tt("Bildirim") };

  const git = () => {
    window.clearTimeout(sayacRef.current);
    kapat();
    if (aktif.yol) navigate(aktif.yol);
  };

  return (
    // Maç sırasında (body.bd-oyun-modu) l-kart.css ile gizlenir; oyunu bölmez.
    <QtToastYuvasi konum="ust">
      <QtToast
        key={aktif.id}
        className={`bz-toast${stil.coin ? " bz-toast--coin" : ""}${kapaniyor ? " bz-toast--cikis" : ""}`}
        ton={TON[stil.sinif] ?? "bilgi"}
        ikon={stil.ikon}
        baslik={stil.baslik}
        metin={ttSunucu(aktif.metin)}
        eylem={aktif.yol ? (
          <QtDugme tur={kabulMu ? "birincil" : "ikincil"} boyut="k" onClick={git}>
            {kabulMu ? tt("Oyuna git") : tt("Göster")}
          </QtDugme>
        ) : null}
        onKapat={kapat}
      />
    </QtToastYuvasi>
  );
}
