// ============================================================
// MAÇ KATEGORİSİ TERCİHİ (860 — kategoriye göre maç, 2 Eki 2026)
//
// Klasik ve Saf Bilgi'de oyuncu OYNA'dan önce bir kategori seçer; null = "Karışık"
// (kategori seçilmedi, eski davranış). Son seçim hatırlanır — dereceli tercihiyle aynı düzen:
//   • localStorage — anında, çevrimdışı da ("" = Karışık)
//   • profiles.tercih_kategori — başka cihazdan girince de aynı olsun (tercih_kategori_kaydet)
// Tercih yalnız HATIRLAMA içindir: maçın kategorisini arama çağrısındaki p_kategori belirler
// ve sunucu onu doğrular (kuyruga_gir / quick_match).
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";

const ANAHTAR = "bildim_mac_kategori";

/** @returns {string|null|undefined} undefined = bu cihazda hiç seçilmedi */
function yerelOku() {
  try {
    const v = localStorage.getItem(ANAHTAR);
    if (v === null) return undefined;
    return v === "" ? null : v;
  } catch {
    /* özel mod: localStorage kapalı */
  }
  return undefined;
}

function yerelYaz(deger) {
  try {
    localStorage.setItem(ANAHTAR, deger ?? "");
  } catch {
    /* özel mod */
  }
}

/** @returns {[string|null, (deger: string|null) => void]} */
export function useKategoriTercih() {
  const { user, profile } = useAuth();
  const [kategori, setKategori] = useState(() => {
    const yerel = yerelOku();
    if (yerel !== undefined) return yerel;
    return profile?.tercih_kategori ?? null;
  });

  // Bu cihazda hiç seçilmemişse profil geldiğinde onun tercihi alınır.
  useEffect(() => {
    if (yerelOku() !== undefined) return;
    setKategori(profile?.tercih_kategori ?? null);
  }, [profile?.tercih_kategori]);

  const degistir = useCallback(
    (yeni) => {
      const deger = yeni || null;
      setKategori(deger);
      yerelYaz(deger);
      if (!user?.id) return;
      (async () => {
        try {
          const { error } = await supabase.rpc("tercih_kategori_kaydet", { p_kategori: deger });
          if (error) throw error;
        } catch (e) {
          // Kayıt yalnız hatırlama içindir; maç yine seçilen kategoriyle aranır.
          console.warn("[Bildim] kategori tercihi kaydedilemedi:", e?.message ?? e);
        }
      })();
    },
    [user?.id]
  );

  return [kategori, degistir];
}
