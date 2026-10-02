import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";

/**
 * Düello yeni oyuncu kilidi (duello_acilis_benim — mevcut RPC) tek yerden okunur.
 * Dönen değer: { acik, gereken, oynanan, kalan } | null (henüz okunmadı).
 * Okunamazsa kilit GÖSTERİLMEZ ({ acik: true }); kuralı sunucu zaten zorlar.
 * `etkin` false iken okuma yapılmaz; true'ya her dönüşte yeniden okunur.
 */
export function useDuelloAcilis(etkin = true) {
  const [acilis, setAcilis] = useState(null);
  useEffect(() => {
    if (!etkin) return undefined;
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("duello_acilis_benim");
        if (error) throw error;
        if (!aktif) return;
        const kalan = Number(data?.kalan ?? 0);
        const gereken = Number(data?.gereken ?? 0);
        setAcilis({
          acik: data?.acik !== false,
          gereken,
          oynanan: Math.max(0, gereken - kalan),
          kalan,
        });
      } catch (e) {
        console.warn("[Bildim] düello açılış durumu okunamadı:", e?.message ?? e);
        if (aktif) setAcilis({ acik: true, gereken: 0, oynanan: 0, kalan: 0 });
      }
    })();
    return () => { aktif = false; };
  }, [etkin]);
  return acilis;
}
