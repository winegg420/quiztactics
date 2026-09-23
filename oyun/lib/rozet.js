// ============================================================
// ROZETLER — sunucu RPC'lerinin ince sarmalayıcısı (sözleşme: docs/SOZLESME_ROZET_CERCEVE.md)
//
// Kazanma mantığı tamamen sunucuda (olay anında tetikleyiciler, migration 333).
// Bu dosya yalnız okur/yazar; hata yutulmaz — konsola yazılır ve çağırana atılır,
// arayüz kendi mesajını gösterir.
// ============================================================
import { supabase } from "../../src/lib/supabase.js";

/** Kademeler, düşükten yükseğe. Renk/malzeme arayüzde. */
export const ROZET_KADEMELERI = ["bronz", "gumus", "altin", "elmas"];

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

/**
 * Bütün rozetler + kazanılanlar + ilerleme.
 * Dönüş: { gruplar: [...], rozetler: [...], vitrin: string[], vitrin_max, ozet: { kazanilan, toplam } }
 * Gizli ve kazanılmamış rozette ad/aciklama/esik/deger/ikon null gelir ("?" silüeti).
 */
export async function rozetlerim() {
  const data = await rpc("rozetlerim");
  return data ?? { gruplar: [], rozetler: [], vitrin: [], vitrin_max: 3, ozet: { kazanilan: 0, toplam: 0 } };
}

/** Vitrine en fazla 3 kazanılmış rozet koyar (sıra korunur). [] = vitrini temizle. Dönüş: kaydedilen dizi. */
export async function rozetVitriniSec(anahtarlar) {
  const data = await rpc("rozet_vitrini_sec", { p_rozetler: anahtarlar ?? [] });
  return data ?? [];
}

/**
 * Görülmemiş yeni rozetler (bildirim için). Okununca sunucuda "görüldü" işaretlenir —
 * aynı rozet ikinci kez dönmez. Dönüş: [{ anahtar, grup, kademe, ikon, ad, coin, cerceve, kazanildi_at }]
 */
export async function rozetBildirimlerim() {
  const data = await rpc("rozet_bildirimlerim");
  return data ?? [];
}
