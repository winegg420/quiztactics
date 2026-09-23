// ============================================================
// ARKADAŞ DAVETİ — sunucu RPC'lerinin ince sarmalayıcısı (sözleşme: docs/SOZLESME_ROZET_CERCEVE.md)
//
// Ödül mantığı sunucuda: davet edilen kodu bağlayınca +100, Level 5'e ulaşınca
// davet edene 300 (aynı cihaz/IP sayılmaz, ayda en çok 10 ödüllü davet).
// /davet/KOD bağlantısı mevcut arkadas_davet_kodu_ile_ekle yolundan da bağlanır.
// ============================================================
import { supabase } from "../../src/lib/supabase.js";
import { y } from "./yol.js";

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

/** Dönüş: { kod, yol: '/davet/KOD', odul_davet_eden, odul_davet_edilen, gereken_level, aylik_sinir, bu_ay_odullenen } */
export async function davetKodum() {
  return rpc("davet_kodum");
}

/** Dönüş: { davetlerim: [...], davet_eden: {...} | null, ozet: {...}, baglanabilir } */
export async function davetDurumum() {
  return rpc("davet_durumum");
}

/**
 * Kayıt ekranındaki elle kod alanı. Hata atmaz, durum döner:
 * { durum: 'baglandi' | 'ayni_cihaz' | 'zaten_bagli' | 'sure_doldu' | 'kendi_kodun' | 'gecersiz_kod',
 *   davet_eden_ad, coin, arkadas }
 */
export async function davetKoduBagla(kod) {
  return rpc("davet_kodu_bagla", { p_kod: kod ?? "" });
}

/** Paylaşılabilir tam bağlantı (yol sunucudan gelir: '/davet/KOD'; kök bu siteden, y() ile). */
export function davetBaglantisi(yol) {
  if (!yol) return null;
  return window.location.origin + y(yol);
}
