// Maç ekranı oyuncu şeridi için level (yalnız gösterim). profiles.lig istemciye kapalı
// (sütun yetkisi yok, 403) — başkasının ligi burada okunmaz. Maç başında BİR kez okunur;
// maç verisine (RPC'ler, durum akışı) dokunmaz. Okunamazsa şerit level'siz çizilir.
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";

export function useOyuncuSeviyeleri(idler) {
  const anahtar = (idler ?? []).filter(Boolean).sort().join(",");
  const [harita, setHarita] = useState({});
  useEffect(() => {
    if (!anahtar) return undefined;
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("id, level").in("id", anahtar.split(","));
        if (error) throw error;
        if (aktif) setHarita(Object.fromEntries((data ?? []).map((p) => [p.id, { level: p.level }])));
      } catch (e) {
        console.warn("[Maç şeridi] oyuncu level/lig okunamadı:", e?.message ?? e);
      }
    })();
    return () => { aktif = false; };
  }, [anahtar]);
  return harita;
}
