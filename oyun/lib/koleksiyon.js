// ============================================================
// KOLEKSİYON PUANI — sunucu RPC'lerinin ince sarmalayıcısı (migration 646)
// Puan = sahip olunan kalıcı şeylerin nadirliğe göre ağırlıklı toplamı (oyun avantajı YOK, yalnız statü).
// Kartta tek sayı oyuncu_kartlari.koleksiyon_puani; profil dökümü koleksiyonDokum(); sıralama LeaderboardPage.
// ============================================================
import { supabase } from "../../src/lib/supabase.js";
import { aktifDil } from "./dil.js";

/** { puan, sira, kategoriler: {rozet:{adet,puan},…}, nadirlik: {siradan:{adet,puan},…, tanimsiz:{adet}}, agirliklar } */
export async function koleksiyonDokum() {
  try {
    const { data, error } = await supabase.rpc("koleksiyon_dokum");
    if (error) throw error;
    return data ?? null;
  } catch (e) {
    console.error("[Bildim] koleksiyon_dokum başarısız:", e?.message ?? e);
    throw e;
  }
}

/** 1240 → "1.240" (TR) / "1,240" (EN). */
export const koleksiyonSayi = (n) => new Intl.NumberFormat(aktifDil() === "en" ? "en-US" : "tr-TR").format(Number(n) || 0);
