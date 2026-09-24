// ============================================================
// ELMAS — ikinci para birimi (480). Gerçek parayla alınır + oyunla damla damla kazanılır;
// YALNIZ kozmetik (aura) alır. Coin yalnız oynayarak kazanılır, jokerler yalnız coin'le alınır.
//
// Bakiye SUNUCUDA; istemci yalnız okur (elmas_durumum()). Harcama/kazanç sonrası
// `elmasTazele()` çağrılır, bakiyeyi gösteren her yer kendini yeniler (coin.js ile aynı desen).
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { tt } from "./dil.js";

const OLAY = "bildim-elmas-degisti";

/** Elmas gösteren tüm bileşenlere "yeniden oku" der. */
export function elmasTazele() {
  try {
    window.dispatchEvent(new Event(OLAY));
  } catch {
    /* pencere yok */
  }
}

/**
 * Elmas bakiyesi + günlük elmas reklamı durumu + son hareketler.
 * @returns {{bakiye:number|null, reklam:{bugun:number,tavan:number,odul:number}|null, hareketler:Array, tazele:() => void}}
 */
export function useElmas() {
  const [durum, setDurum] = useState({ bakiye: null, reklam: null, hareketler: [] });

  const oku = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("elmas_durumum");
      if (error) throw error;
      setDurum({
        bakiye: Number(data?.bakiye ?? 0),
        reklam: data?.reklam ?? null,
        hareketler: Array.isArray(data?.hareketler) ? data.hareketler : [],
      });
    } catch (e) {
      console.error("[Bildim] elmas bakiyesi alınamadı:", e);
    }
  }, []);

  useEffect(() => {
    oku();
    window.addEventListener(OLAY, oku);
    return () => window.removeEventListener(OLAY, oku);
  }, [oku]);

  return { ...durum, tazele: oku };
}

/** Elmas paketleri (gerçek para; satın alma şimdilik kapalı → satista=false). */
export async function elmasPaketleri() {
  try {
    const { data, error } = await supabase.rpc("elmas_paketleri");
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error("[Bildim] elmas paketleri alınamadı:", e);
    throw e;
  }
}

/** Sunucu hata metnini kullanıcıya uygun hâle getirir. */
export function elmasHatasi(e) {
  const m = String(e?.message ?? e ?? "");
  if (m.includes("Yetersiz elmas")) return tt("Elmas yetmiyor");
  return m || tt("İşlem tamamlanamadı");
}
