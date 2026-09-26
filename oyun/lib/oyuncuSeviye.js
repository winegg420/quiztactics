// Maç ekranı oyuncu şeridi için level + lig + takılı çerçeve (yalnız gösterim). profiles.lig
// istemciye kapalı; başkasının ligi ve çerçevesi oyuncu_kartlari RPC'siyle gelir (oyun/lib/cerceve.js,
// toplu + önbellekli). Maç verisine (RPC'ler, durum akışı) dokunmaz. Okunamazsa şerit level'siz çizilir.
import { useEffect, useState } from "react";
import { oyuncuKartlari } from "./cerceve.js";
import { supabase } from "../../src/lib/supabase.js";

// Maç şeridindeki ülke bayrağı: profiles.ulke (gizli botlar dahil aynı alan). Kart RPC'si ülke döndürmez;
// tek toplu sorgu + oturum önbelleği. Okunamazsa bayrak çizilmez, şerit aynen çalışır.
const ulkeOnbellek = new Map();
async function ulkeleriOku(idler) {
  const eksik = idler.filter((id) => !ulkeOnbellek.has(id));
  if (eksik.length) {
    try {
      const { data, error } = await supabase.from("profiles").select("id, ulke").in("id", eksik);
      if (error) throw error;
      for (const id of eksik) ulkeOnbellek.set(id, null);
      for (const r of data ?? []) ulkeOnbellek.set(r.id, r.ulke || null);
    } catch (e) {
      console.warn("[Maç şeridi] ülke okunamadı:", e?.message ?? e);
    }
  }
  return ulkeOnbellek;
}

/** @returns {{[id:string]: {level?:number, lig?:string, cerceve?:string|null, cerceve_nadirlik?:string, vs_karti?:string|null, isim_efekti?:string|null, zafer_efekti?:string|null}}} */
export function useOyuncuSeviyeleri(idler) {
  const anahtar = (idler ?? []).filter(Boolean).sort().join(",");
  const [harita, setHarita] = useState({});
  useEffect(() => {
    if (!anahtar) return undefined;
    let aktif = true;
    (async () => {
      try {
        const idListesi = anahtar.split(",");
        const [kartlar, ulkeler] = await Promise.all([oyuncuKartlari(idListesi), ulkeleriOku(idListesi)]);
        if (!aktif) return;
        setHarita(Object.fromEntries(kartlar.filter(Boolean).map((k) => [k.id, {
          level: k.level, lig: k.lig ?? undefined, cerceve: k.cerceve ?? null, cerceve_nadirlik: k.cerceve_nadirlik,
          // 540: elmas kozmetikleri (aynı kart, ek sorgu yok)
          vs_karti: k.vs_karti ?? null, isim_efekti: k.isim_efekti ?? null, zafer_efekti: k.zafer_efekti ?? null,
          // 643: unvan (tek oyuncu kartının küçük hâli, maç şeridinde)
          unvan: k.unvan ?? null,
          koleksiyon_puani: k.koleksiyon_puani ?? 0,   // 646
          ulke: ulkeler.get(k.id) ?? null,             // ülke bayrağı (yoksa çizilmez)
        }])));
      } catch (e) {
        console.warn("[Maç şeridi] oyuncu kartları okunamadı:", e?.message ?? e);
      }
    })();
    return () => { aktif = false; };
  }, [anahtar]);
  return harita;
}
