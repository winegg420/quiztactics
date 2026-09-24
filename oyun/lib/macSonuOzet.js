// ============================================================
// MAÇ SONU ÖZETİ (A.3) — yeni maç sonu sahnesinin (MacSonuKutlama) tek veri kaynağı.
//
// Sunucu: mac_sonu_ozet(kaynak) — migration 462. Tek çağrı: ödül dökümü, XP/level, lig puanı ve
// sıra değişimi, bu maçta kazanılan rozetler, görevler (+ maç öncesi ilerleme), terk bilgisi.
// Burada ödül HESAPLANMAZ; ekrandaki her sayı sunucu kaydından gelir.
//
// Ödül maçı bitiren işlemle yazılır; ekran erken açılırsa birkaç kez daha bakılır (hazir=false).
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { macSonuOnYukle } from "../components/MacSonuLottie.jsx";

const BEKLE = [0, 1200, 2500, 5000];

// A.4: sahnenin Lottie oynatıcısı + animasyonları + konfeti, sahne takılmadan önce iner (bkz. MacSonuLottie.jsx
// başındaki KÖK SEBEP). Maç sayfası açıkken tarayıcı boşta kalınca bir kez (oturum başına), maç bitince hemen.
let bostaIsitildi = false;
function bostaIsit() {
  if (bostaIsitildi || typeof window === "undefined") return;
  bostaIsitildi = true;
  const calistir = () => { try { macSonuOnYukle(); } catch { /* ısınmazsa sahne yine kendisi indirir */ } };
  setTimeout(() => {
    if (window.requestIdleCallback) window.requestIdleCallback(calistir, { timeout: 4000 });
    else calistir();
  }, 5000);
}

/**
 * @param {string|null} kaynak  "mac:<id>" · "duello:<id>" · "turnuva:<id>" · "grup:<id>"
 * @returns {{ ozet: object|null, hata: Error|null }}
 */
export function useMacSonuOzet(kaynak) {
  const [ozet, setOzet] = useState(null);
  const [hata, setHata] = useState(null);

  useEffect(() => { bostaIsit(); }, []);

  useEffect(() => {
    if (!kaynak) return undefined;
    try { macSonuOnYukle(); } catch { /* sahne yine kendisi indirir */ }
    let aktif = true;
    let zamanlayici = null;
    setOzet(null);
    const dene = async (i) => {
      try {
        const { data, error } = await supabase.rpc("mac_sonu_ozet", { p_kaynak: kaynak });
        if (error) throw error;
        if (!aktif) return;
        // Hazır değilken yarım veriyle sahne kurulmaz; son denemede elde ne varsa o kullanılır.
        if (data?.hazir || i + 1 >= BEKLE.length) { setOzet(data ?? null); return; }
        zamanlayici = setTimeout(() => dene(i + 1), BEKLE[i + 1]);
      } catch (e) {
        console.error("[Bildim] mac_sonu_ozet başarısız:", e);
        if (!aktif) return;
        if (i + 1 < BEKLE.length) zamanlayici = setTimeout(() => dene(i + 1), BEKLE[i + 1]);
        else setHata(e);
      }
    };
    dene(0);
    return () => { aktif = false; if (zamanlayici) clearTimeout(zamanlayici); };
  }, [kaynak]);

  return { ozet, hata };
}

/**
 * Özeti sahnenin prop'larına çevirir. Terk eden oyuncuda ödül bölümü hiç çizilmez.
 * @returns {{ oduller: Array, level: object|null, lig: object|null, gorevler: Array, rozetler: Array, terk: "ben"|"rakip"|null }}
 */
export function ozettenSahne(ozet) {
  const terk = ozet?.terk?.ben ? "ben" : ozet?.terk?.rakip ? "rakip" : null;
  if (!ozet || terk === "ben") {
    return { oduller: [], level: null, lig: null, gorevler: [], rozetler: [], terk };
  }
  const coin = Number(ozet.dokum?.toplam?.coin) || 0;
  const lig = ozet.lig && Number(ozet.lig.puan) > 0
    ? { puan: Number(ozet.lig.puan), siraOnce: ozet.lig.sira_once ?? null, siraSonra: ozet.lig.sira_sonra ?? null }
    : null;
  return {
    oduller: coin > 0 ? [{ ikon: "coin", deger: coin, etiket: "coin" }] : [],
    level: ozet.level?.hazir ? ozet.level : null,
    lig,
    gorevler: (ozet.gorevler ?? []).filter((g) => g && !g.alindi),
    rozetler: ozet.rozetler ?? [],
    terk,
  };
}
