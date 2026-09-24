// ============================================================
// YENİ AVATAR KATALOĞU (520/550) — profil ve kurulum avatar ızgaraları için
//
// 550 (Ida): 27 yeni avatar (13 günlük + 14 kostümlü) herkese ücretsiz. Liste koda gömülmez —
// sunucudan (avatar_katalogu_oyun, yalnız okur) gelir; seçimi avatar_onayla doğrular.
// Migration 550 uygulanmadan önce normal oyuncuya liste boş döner → ızgaralar eski 31 avatarla kalır.
// Oturum boyunca bir kez okunur (aynı anda birden çok ekran tek istek paylaşır).
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { aktifDil } from "./dil.js";

let bekleyen = null;

async function katalogOku() {
  try {
    const { data, error } = await supabase.rpc("avatar_katalogu_oyun");
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("[Bildim] avatar kataloğu okunamadı:", e?.message ?? e);
    bekleyen = null;   // hata önbelleğe alınmaz; sonraki açılış yeniden dener
    return [];
  }
}

/**
 * Kullanılabilir katalog avatarları: [{ url, ad, tur }] (sıra sunucudan).
 * @param {boolean} [etkin=true]  false → okuma yapılmaz (ör. ızgara kapalıyken)
 */
export function useKatalogAvatarlari(etkin = true) {
  const [liste, setListe] = useState([]);
  useEffect(() => {
    if (!etkin || !supabase) return undefined;
    let aktif = true;
    if (!bekleyen) bekleyen = katalogOku();
    bekleyen.then((satirlar) => {
      if (!aktif) return;
      const en = aktifDil() === "en";
      setListe(satirlar
        .filter((a) => a?.kullanabilir && typeof a.url === "string")
        .map((a) => ({ url: a.url, ad: (en ? a.ad_en : a.ad_tr) ?? a.ad_tr ?? "", tur: a.tur })));
    });
    return () => { aktif = false; };
  }, [etkin]);
  return liste;
}
