// ============================================================
// MAÇ NABZI — eş zamanlı maçların ortak kalp atışı
//
// Üç mod da (1v1, grup, hızlı) aynı sunucu sözleşmesini kullanır:
//   rpc(ad, { ...param, p_hazir }) -> { durum, basladi, ... }
//
// İki iş yapar:
//   1) HAZIR KAPISI — oyuncu "Hazır"a basana kadar p_hazir false gider;
//      basınca true'ya döner ve bir daha geri alınmaz. Herkes hazır olunca
//      sunucu ortak saati başlatır.
//   2) VARLIK BİLDİRİMİ — 3 sn'de bir atılan nabız "buradayım" demektir.
//      Sunucu 12 sn nabız gelmezse oyuncuyu kopmuş sayar, maçı duraklatır ve
//      45 sn sonra maçtan ayrılmış (hükmen mağlup) sayar.
//
// SEKME ARKA PLANDAYKEN NABIZ ATILMAZ. Bu bilerek böyle: kullanıcı
// "ekran değiştirirse diğer rakibin ekranı da kilitlenecek" dedi. Tarayıcı
// zaten arka planda zamanlayıcıları kıstığı için bu aynı zamanda dürüst olan.
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { zamanAsimiyla } from "./gorunurluk.js";

const ARALIK_MS = 3000;
// Saat farkı için örnek penceresi: en kısa gidiş-dönüşlü (en az belirsiz) örnek kullanılır (NTP yaklaşımı).
const SAAT_ORNEK_PENCERE_MS = 60000;

/**
 * @param {string} rpcAdi  "mac_nabiz" | "grup_mac_nabiz" | "hizli_mac_nabiz"
 * @param {object} parametreler  ör. { p_match_id: id }
 * @param {boolean} aktif  sayfa açıkken true
 */
export function useMacNabiz(rpcAdi, parametreler, aktif = true) {
  const [nabiz, setNabiz] = useState(null);
  const [nabizHatasi, setNabizHatasi] = useState(null);
  const hazirRef = useRef(false);
  const paramRef = useRef(parametreler);
  paramRef.current = parametreler;
  const saatOrnekleri = useRef([]);

  const nabizAt = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const gonderildiMs = Date.now();
      const { data, error } = await zamanAsimiyla(
        supabase.rpc(rpcAdi, { ...paramRef.current, p_hazir: hazirRef.current }),
        10000,
        rpcAdi
      );
      const alindiMs = Date.now();
      if (error) throw error;
      const r = Array.isArray(data) ? data[0] : data;
      if (r) {
        // Sunucu saati yanıt gelince ölçülürse dönüş gecikmesinin tamamı saat farkına biner: gidiş-dönüşün
        // orta noktası alınır (lib/soruCek.js ile aynı NTP yaklaşımı). Yüksek gecikmede geri sayım kayıyordu.
        // Tek yavaş yanıt (DB takılması) saat farkını yüzlerce ms oynatıp geri sayımı geri sıçratıyordu (D-409):
        // nabız başına yeni fark değil, penceredeki EN KISA gidiş-dönüşlü örneğin farkı verilir.
        const ornekMs = (gonderildiMs + alindiMs) / 2;
        let saatFarkMs;
        if (r.sunucu_zamani) {
          const simdi = Date.now();
          const liste = saatOrnekleri.current.filter((o) => simdi - o.at < SAAT_ORNEK_PENCERE_MS);
          liste.push({ at: simdi, rtt: alindiMs - gonderildiMs, fark: new Date(r.sunucu_zamani).getTime() - ornekMs });
          saatOrnekleri.current = liste;
          saatFarkMs = liste.reduce((en, o) => (o.rtt < en.rtt ? o : en)).fark;
        }
        setNabiz({ ...r, _saat_ornek_ms: ornekMs, _saat_fark_ms: saatFarkMs });
        setNabizHatasi(null);
      }
    } catch (e) {
      // Ağ dalgalanması olabilir; ekranı düşürmeyiz, bir sonraki tik dener.
      console.error(`[Bildim] ${rpcAdi}:`, e);
      setNabizHatasi(e);
    }
  }, [rpcAdi]);

  useEffect(() => {
    if (!aktif) return undefined;
    nabizAt();
    const id = setInterval(nabizAt, ARALIK_MS);
    // Sekmeye dönüldüğü an nabzı at: rakibin kilidi bir tik beklemeden açılsın.
    const geriDon = () => { if (!document.hidden) nabizAt(); };
    document.addEventListener("visibilitychange", geriDon);
    window.addEventListener("focus", geriDon);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", geriDon);
      window.removeEventListener("focus", geriDon);
    };
  }, [aktif, nabizAt]);

  /** "Hazır" düğmesi. Bir kez basılır, geri alınmaz. */
  const hazirla = useCallback(() => {
    hazirRef.current = true;
    nabizAt();
  }, [nabizAt]);

  return { nabiz, nabizHatasi, hazirla, nabizAt };
}
