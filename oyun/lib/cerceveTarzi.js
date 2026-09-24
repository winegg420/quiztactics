// ============================================================
// ÇERÇEVE TARZI (550) — Ida'nın /cerceve-onizleme seçimi oyunda
//
// cerceve_tarzi_aktif() → "cizgi" | "mucevher" | "isik" | null. Seçim yoksa (ya da migration 550
// uygulanmamışsa) null → bugünkü çerçeveler aynen. Seçilen tarz bugün yalnız Altın Lig çerçevesinde
// çizilidir (DenemeCerceve); diğer çerçeveler ayrı pakette o tarzda yeniden çizilecek.
// Oturumda bir kez okunur; okunamazsa 5 dk sonra yeniden denenir (her avatar ayrı istek atmaz).
// Önizleme sayfaları cerceveTarziAyarla() ile sunucusuz dener.
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";

const TARZLAR = ["cizgi", "mucevher", "isik"];
const YENIDEN_MS = 5 * 60 * 1000;

let deger;              // undefined = okunmadı · null = seçim yok · "cizgi" | …
let bekleyen = null;
let hataZamani = 0;
const dinleyiciler = new Set();

function bildir() {
  dinleyiciler.forEach((f) => { try { f(deger ?? null); } catch { /* dinleyici hatası diğerlerini durdurmaz */ } });
}

/** Önizleme/test: sunucuya gitmeden tarzı belirler (null → bugünkü çerçeve). */
export function cerceveTarziAyarla(tarz) {
  deger = TARZLAR.includes(tarz) ? tarz : null;
  bildir();
}

async function oku() {
  if (deger !== undefined || !supabase) return;
  if (hataZamani && Date.now() - hataZamani < YENIDEN_MS) return;
  if (bekleyen) return bekleyen;
  bekleyen = (async () => {
    try {
      const { data, error } = await supabase.rpc("cerceve_tarzi_aktif");
      if (error) throw error;
      deger = TARZLAR.includes(data) ? data : null;
      bildir();
    } catch (e) {
      hataZamani = Date.now();
      console.warn("[Bildim] çerçeve tarzı okunamadı (bugünkü çerçeve):", e?.message ?? e);
    } finally {
      bekleyen = null;
    }
  })();
  return bekleyen;
}

/** Aktif çerçeve tarzı (yoksa null). */
export function useCerceveTarzi() {
  const [tarz, setTarz] = useState(deger ?? null);
  useEffect(() => {
    dinleyiciler.add(setTarz);
    setTarz(deger ?? null);
    oku();
    return () => { dinleyiciler.delete(setTarz); };
  }, []);
  return tarz;
}
