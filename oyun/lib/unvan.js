// ============================================================
// UNVANLAR — sunucu RPC'lerinin ince sarmalayıcısı (migration 643; sözleşme docs/SOZLESME_ROZET_CERCEVE.md)
// Kazanım sunucuda (rozete bağlı unvanlar rozetten türetilir, lig unvanları haftalık kapanışta verilir).
// Başkasının görünen unvanı oyuncu_kartlari.unvan'dan (cerceve.js › oyuncuKarti) okunur.
// ============================================================
import { supabase } from "../../src/lib/supabase.js";
import { aktifDil } from "./dil.js";
import { oyuncuKartiUnut } from "./cerceve.js";

async function rpc(ad, parametre) {
  try {
    const { data, error } = await supabase.rpc(ad, parametre);
    if (error) throw error;
    return data;
  } catch (e) {
    console.error(`[Bildim] ${ad} başarısız:`, e?.message ?? e);
    throw e;
  }
}

/** { unvanlar: [{anahtar, tur, ad_tr, ad_en, aciklama_tr, aciklama_en, kazanildi, takili}], takili, sehir_sampiyonu, ulke_sampiyonu, dunya_sampiyonu } */
export async function unvanlarim() {
  const data = await rpc("unvanlarim");
  return data ?? { unvanlar: [], takili: null, sehir_sampiyonu: null, ulke_sampiyonu: null, dunya_sampiyonu: null };
}

/** Unvan tak (null = çıkar). Kendi kartının önbelleği tazelenir. */
export async function unvanTak(anahtar, userId) {
  const data = await rpc("unvan_tak", { p_anahtar: anahtar ?? null });
  oyuncuKartiUnut(userId);
  return data;
}

/**
 * Oyuncu kartındaki unvan → görünen metin (oyuncunun dilinde).
 * Şehir: TR "Balıkesir Şampiyonu" · EN "Champion of Balıkesir". Ülke (647): TR "Türkiye Şampiyonu" · EN "Champion of Türkiye"
 * (ad = ulkeler.ad, tek dil). Dünya (647): sabit "Dünya Şampiyonu" / "World Champion". Diğerleri sunucudan iki dilde gelir.
 */
export function unvanMetni(unvan) {
  if (!unvan) return null;
  const en = aktifDil() === "en";
  if (unvan.tur === "sehir") return en ? `Champion of ${unvan.sehir}` : `${unvan.sehir} Şampiyonu`;
  if (unvan.tur === "ulke") return en ? `Champion of ${unvan.ad}` : `${unvan.ad} Şampiyonu`;
  if (unvan.tur === "dunya") return en ? "World Champion" : "Dünya Şampiyonu";
  return (en ? unvan.en : unvan.tr) ?? unvan.tr ?? null;
}
