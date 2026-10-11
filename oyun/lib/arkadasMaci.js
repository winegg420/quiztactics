// ============================================================
// ARKADAŞA MAÇ TEKLİFİ — Arkadaşlar sayfası ve Sohbet ortak mantığı
//
// Üç davet de mod seçim penceresinden çağrılır. Hata sayfanın üstüne değil
// pencerenin İÇİNE düşsün diye metin olarak döner (null = başarılı).
// Açık bot anında kabul eder → doğrudan maça/düelloya/kasaya girilir;
// gerçek oyuncuda davet bekler.
// ============================================================
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { hataMesaji } from "./hata.js";
import { tt } from "./dil.js";
import { y } from "./yol.js";

/**
 * @param {object} [o]
 * @param {(m:string|null) => void} [o.setHata]   sayfa hatasını temizlemek için
 * @param {(m:string|null) => void} [o.setBilgi]  "davet gönderildi" bildirimi
 * @param {() => void} [o.onBasari]               davet kurulunca (mod penceresini kapatır)
 * @param {() => Promise|void} [o.bekleyenleriYukle]  davet sonrası bekleyen şeritleri tazeler
 * @returns {{ meydanOku, duelloyaCagir, kasayaCagir, modSec }}
 */
export function useArkadasaMacTeklifi({ setHata, setBilgi, onBasari, bekleyenleriYukle } = {}) {
  const navigate = useNavigate();

  const meydanOku = useCallback(async (hedefId, jokersiz = false) => {
    setHata?.(null);
    try {
      const { error, data } = await supabase.rpc("create_challenge", { p_rakip: hedefId, p_jokersiz: jokersiz });
      if (error) throw error;
      onBasari?.();
      // Paket 35 D: sayfadan ÇIKMA — satırın altında bekleyen şerit görünür.
      // Rakip anında kabul ettiyse (açık bot) maç zaten başlamıştır → maça gir.
      if (data) {
        const { data: m } = await supabase.from("matches").select("durum").eq("id", data).maybeSingle();
        if (m?.durum === "aktif") { navigate(y(`/mac/${data}`)); return null; }
      }
      await bekleyenleriYukle?.();
      return null;
    } catch (e) {
      return hataMesaji(e, tt("Meydan okuma başlatılamadı."));
    }
  }, [setHata, onBasari, bekleyenleriYukle, navigate]);

  // Paket 24 · A.1.5: düello daveti. Açık bot anında kabul eder ve doğrudan düelloya girilir.
  const duelloyaCagir = useCallback(async (hedefId) => {
    setHata?.(null);
    setBilgi?.(null);
    try {
      const { data, error } = await supabase.rpc("duello_davet_et", { p_rakip: hedefId });
      if (error) throw error;
      onBasari?.();
      if (data?.duello_id) {
        navigate(y(`/duello/${data.duello_id}`));
        return null;
      }
      setBilgi?.(tt("Düello daveti gönderildi — rakip kabul edince düello başlayacak."));
      await bekleyenleriYukle?.();   // Paket 35 D: şerit düello davetinde de görünür
      return null;
    } catch (e) {
      return hataMesaji(e, tt("Düello daveti gönderilemedi."));
    }
  }, [setHata, setBilgi, onBasari, bekleyenleriYukle, navigate]);

  // 957: Kasa daveti — Düello ile aynı akış.
  const kasayaCagir = useCallback(async (hedefId) => {
    setHata?.(null);
    setBilgi?.(null);
    try {
      const { data, error } = await supabase.rpc("kasa_davet_et", { p_rakip: hedefId, p_dereceli: true });
      if (error) throw error;
      onBasari?.();
      if (data?.kasa_id) {
        navigate(y(`/kasa/${data.kasa_id}`));
        return null;
      }
      setBilgi?.(tt("Ortak Hazine daveti gönderildi — rakip kabul edince maç başlayacak."));
      await bekleyenleriYukle?.();
      return null;
    } catch (e) {
      return hataMesaji(e, tt("Ortak Hazine daveti gönderilemedi."));
    }
  }, [setHata, setBilgi, onBasari, bekleyenleriYukle, navigate]);

  /** ModSecimPenceresi `onSec` köprüsü: mod → ilgili davet. */
  const modSec = useCallback((hedefId, mod) => (
    mod === "duello" ? duelloyaCagir(hedefId)
      : mod === "kasa" ? kasayaCagir(hedefId)
      : meydanOku(hedefId, mod === "saf")
  ), [duelloyaCagir, kasayaCagir, meydanOku]);

  return { meydanOku, duelloyaCagir, kasayaCagir, modSec };
}
