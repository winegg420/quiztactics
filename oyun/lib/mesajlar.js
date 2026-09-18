// ============================================================
// DİREKT MESAJLAR — okunmamış sayısı (Paket 35 E)
//
// Sayı SUNUCUDAN gelir (dm_okunmamis_sayim). Rozeti gösteren her yer
// (Arkadaşlar › Mesajlar düğmesi, bildirim zili) aynı kancayı kullanır:
//   * bana gelen mesaj eklenince / okundu işaretlenince realtime ile yenilenir
//   * sohbet açılıp dm_okundu çağrıldığında dmTazele() ile hemen yenilenir
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";

const OLAY = "bildim-dm-degisti";

/** Okunmamış rozetlerine "yeniden oku" der (sohbet okundu işaretleyince). */
export function dmTazele() {
  try {
    window.dispatchEvent(new Event(OLAY));
  } catch {
    /* pencere yok */
  }
}

/** Rozet metni: 99'dan fazlası "99+". */
export const rozetMetni = (n) => (n > 99 ? "99+" : String(n));

/**
 * @param {string|undefined} benId
 * @returns {number} okunmamış mesaj sayısı (okunamazsa 0)
 */
export function useDmOkunmamis(benId) {
  const [sayi, setSayi] = useState(0);

  const oku = useCallback(async () => {
    if (!benId) return;
    try {
      const { data, error } = await supabase.rpc("dm_okunmamis_sayim");
      if (error) throw error;
      setSayi(Number(data) || 0);
    } catch (e) {
      // Hata olursa önceki değer kalır; rozet yanlışlıkla sıfırlanmasın.
      console.warn("[Bildim] okunmamış mesaj sayısı alınamadı:", e?.message ?? e);
    }
  }, [benId]);

  useEffect(() => {
    if (!benId) return undefined;
    oku();
    window.addEventListener(OLAY, oku);
    // Kanal adı her kullanımda ayrı: zil ve Arkadaşlar düğmesi aynı anda dinleyebilir.
    const kanal = supabase
      .channel(`dm-sayim-${Math.random().toString(36).slice(2, 9)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direkt_mesajlar", filter: `alici_id=eq.${benId}` },
        oku
      )
      .subscribe();
    return () => {
      window.removeEventListener(OLAY, oku);
      supabase.removeChannel(kanal);
    };
  }, [benId, oku]);

  return sayi;
}
