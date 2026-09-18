// ============================================================
// ARKADAŞLIK DURUMU — oyuncu kartında hangi eylemin çizileceğine
// SAYFA karar verir (Paket 35 C); bu kanca o kararın verisini tek yerden okur.
//
// Kart kendisi "arkadaş mıyım" bilmez. Lig ve turnuva sayfaları bu kancayla
// arkadaşsa "Mesaj at", değilse "Arkadaş ekle" düğmesini verir.
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";

/**
 * @param {string|undefined} benId  oturumdaki oyuncu
 * @returns {{ arkadasMi:(id:string)=>boolean, istekVar:(id:string)=>boolean,
 *             arkadasEkle:(id:string)=>Promise<void>, yenile:()=>Promise<void> }}
 */
export function useArkadaslik(benId) {
  const [arkadaslar, setArkadaslar] = useState(() => new Set());
  const [istekler, setIstekler] = useState(() => new Set());   // iki yönde bekleyen istekler

  const yenile = useCallback(async () => {
    if (!benId) return;
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select("requester, addressee, durum")
        .or(`requester.eq.${benId},addressee.eq.${benId}`);
      if (error) throw error;
      const a = new Set();
      const b = new Set();
      for (const f of data ?? []) {
        const diger = f.requester === benId ? f.addressee : f.requester;
        (f.durum === "arkadas" ? a : b).add(diger);
      }
      setArkadaslar(a);
      setIstekler(b);
    } catch (e) {
      // Okunamazsa kart yalnız Meydan oku gösterir; oyun akışı bozulmaz.
      console.warn("[Bildim] arkadaşlık durumu okunamadı:", e?.message ?? e);
    }
  }, [benId]);

  useEffect(() => { yenile(); }, [yenile]);

  /** Arkadaşlık isteği gönderir. Hata fırlatır — kart kendi içinde gösterir. */
  const arkadasEkle = useCallback(async (id) => {
    const { error } = await supabase.rpc("send_friend_request", { p_target: id });
    if (error) throw error;
    await yenile();
  }, [yenile]);

  return {
    arkadasMi: (id) => arkadaslar.has(id),
    istekVar: (id) => istekler.has(id),
    arkadasEkle,
    yenile,
  };
}
