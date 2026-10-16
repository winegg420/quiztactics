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
import { macSonuOnYukle, lottieOnKur } from "../components/MacSonuLottie.jsx";
import { hareketAzaltildiMi } from "../tasarim/hareket.js";

const BEKLE = [0, 1200, 2500, 5000];

// A.4: sahnenin Lottie oynatıcısı + animasyonları + konfeti, sahne takılmadan önce iner (bkz. MacSonuLottie.jsx
// başındaki KÖK SEBEP). Maç sayfası açıkken tarayıcı boşta kalınca bir kez (oturum başına), maç bitince hemen.
let bostaIsitildi = false;
function bostaIsit() {
  if (bostaIsitildi || typeof window === "undefined") return;
  bostaIsitildi = true;
  const calistir = () => { try { macSonuOnYukle(); } catch { /* ısınmazsa sahne yine kendisi indirir */ } };
  // 14 Eki (Paket A): ısınma (lottie_light + konfeti modülü, CPU 6x'te ~200 ms tek görev) maç başı sahnesi sürerken
  // DÜŞMESİN — 5 sn, Hazine girişinde sandık/3-2-1'in tam ortasına denk geliyordu. 3-2-1 / giriş sahnesi ekrandaysa
  // 1 sn sonra yeniden bakılır (bütün modlar: Hazine .ks-giris-an, ortak sayım .m1-sayim).
  const SAHNE = ".ks-giris-an, .m1-sayim";
  const dene = () => {
    if (document.querySelector(SAHNE)) { setTimeout(dene, 1000); return; }
    if (window.requestIdleCallback) window.requestIdleCallback(calistir, { timeout: 4000 });
    else calistir();
  };
  setTimeout(dene, 5000);
}
// 16 Eki 2026 (Hazine maç sonu karesi): kupa Lottie örneği HER MAÇTA maç sürerken boşta, sayfa dışında kurulur; maç sonu sahnesi
// hazır örneği takar (MacSonuLottie.jsx › lottieOnKur — hız MacSonuKutlama'daki kupayla aynı: azaltılmış harekette 0,5). Isınmadan
// sonra (8 sn) ve giriş sahnesi / 3-2-1 ekrandayken değil.
// 16 Eki 2026 (Hazine maç sonu karesi, dalgalı ağ 134 ms): coin / level / yıldız örnekleri de aynı yolla, kupadan sonra birer birer
// (her biri ayrı boşta görevde, 1,5 sn arayla). Eskiden sahne açıldıktan 0,4–0,8 sn sonra ana iş parçacığında kuruluyorlardı
// (CPU 6x: her biri ~25–35 ms loadAnimation + SVG ağacı) — aşama 2'nin takılması, coin uçuşu ve kupa karesiyle aynı aralıkta.
// Hızlar MacSonuKutlama'dakilerle aynı olmalı (farklıysa sahne hazır örneği almaz, kendisi kurar).
function kupaOnKur() {
  if (typeof window === "undefined") return () => {};
  let z = null;
  const az = hareketAzaltildiMi();
  const sira = [["kupa", az ? 0.5 : 1], ...(az ? [] : [["coin", 1.5]]), ["level", az ? 0.7 : 1.4], ["yildiz", 0.8]];
  let i = 0;
  const dene = () => {
    if (document.querySelector(".ks-giris-an, .m1-sayim")) { z = setTimeout(dene, 1000); return; }
    // Sahne açıldıysa kalanı sahne kendisi kurar (açık sahnenin karelerine iş eklenmez)
    if (document.documentElement.classList.contains("msk-acik")) return;
    const [ad, hiz] = sira[i++];
    try { lottieOnKur(ad, { hiz }); } catch { /* sahne yine kendisi kurar */ }
    if (i < sira.length) z = setTimeout(dene, 1500);
  };
  z = setTimeout(dene, 8000);
  return () => clearTimeout(z);
}

/**
 * @param {string|null} kaynak  "mac:<id>" · "duello:<id>" · "turnuva:<id>" · "grup:<id>"
 * @returns {{ ozet: object|null, hata: Error|null }}
 */
export function useMacSonuOzet(kaynak) {
  const [ozet, setOzet] = useState(null);
  const [hata, setHata] = useState(null);

  useEffect(() => { bostaIsit(); return kupaOnKur(); }, []);

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
