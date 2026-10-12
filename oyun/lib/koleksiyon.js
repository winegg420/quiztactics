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

/**
 * 1070: lig çerçevesi (lig_*) ligine göre otomatik takılır. Oyuncunun şu anki ligi dışındaki
 * lig çerçeveleri seçilemez (sunucu da reddeder) → istemcide pasif gösterilir.
 */
export const ligDisiCerceve = (anahtar, lig) =>
  typeof anahtar === "string" && anahtar.startsWith("lig_") && anahtar !== `lig_${lig || "bronz"}`;

// Level çerçevelerinin adı lig adlarıyla (Bronz/Gümüş/Altın) karışmasın — 1073 DB'yi düzeltir;
// eski önbellek ya da istemci tanımı eski adı getirirse burada da düzeltilir.
const LEVEL_CERCEVE_ADI = {
  level_25: { tr: "Level 25 Çerçevesi", en: "Level 25 Frame" },
  level_50: { tr: "Level 50 Çerçevesi", en: "Level 50 Frame" },
  level_75: { tr: "Level 75 Çerçevesi", en: "Level 75 Frame" },
  level_100: { tr: "Level 100 Kanatları", en: "Level 100 Wings" },
};
/** Çerçevenin gösterilecek adı (level çerçeveleri için lig kelimesi içermeyen ad). */
export function cerceveAdi(anahtar, ad) {
  const d = LEVEL_CERCEVE_ADI[anahtar];
  return d ? d[aktifDil() === "en" ? "en" : "tr"] : ad;
}
