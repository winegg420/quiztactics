// Lig adları — sunucudaki `lig` kolonuyla birebir (bkz. migration 151).
// Arayüz Yenileme (20 Eyl 2026): LeaderboardPage.jsx'ten buraya taşındı;
// ana sayfadaki lig kartı da aynı adları kullanıyor ve sayfa dosyasını
// import etmek koca lider tablosunu ana sayfa paketine sokuyordu.
import { tt } from "./dil.js";
import { supabase } from "../../src/lib/supabase.js";

export const LIG_ADLARI = {
  bronz: tt("Bronz"),
  gumus: tt("Gümüş"),
  altin: tt("Altın"),
  elmas: tt("Elmas"),
  efsane: tt("Efsane"),
};

// ---------- Canlı lig kartı (sözleşme: docs/SOZLESME_ROZET_CERCEVE.md) ----------

/** Lig sırası, düşükten yükseğe (sunucudaki lig_sirasi ile aynı). */
export const LIG_SIRASI = ["bronz", "gumus", "altin", "elmas", "efsane"];

/**
 * Ana sayfa lig kartı: ligim, sıram, üstümdeki 2 + altımdaki 2 (oyuncu kartlarıyla),
 * yükselme/düşme sınırları, farklar, hafta bitişi. Grup yoksa (yeni oyuncu) null.
 */
export async function ligGrubumOzet() {
  try {
    const { data, error } = await supabase.rpc("lig_grubum_ozet");
    if (error) throw error;
    return data ?? null;
  } catch (e) {
    console.error("[Bildim] lig_grubum_ozet başarısız:", e?.message ?? e);
    throw e;
  }
}
