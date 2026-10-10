// ============================================================
// CEVAP İMZASI (1040) — takılı imza YALNIZ kendi profilimden okunur.
// profilim() satırın tamamını döndürür (takili_cevap_imzasi dahil); kolon başkasına açık değil, oyuncu_kartlari'nda
// yok → rakip hiçbir yerde göremez. Maç ekranları ek sorgu yapmaz. Tak / çıkar anında (kozmetikTak) yerel değer
// güncellenir: profil yeniden okunana dek maç ekranı doğru imzayı oynatır.
// ============================================================
import { useEffect, useState } from "react";
import { useAuth } from "../../src/context/AuthContext.jsx";

export const CEVAP_IMZASI_TURU = "cevap_imzasi";
export const IMZA_ANAHTARLARI = ["imza_neon_tik", "imza_yildiz", "imza_ampul", "imza_elektrik", "imza_yanan_kart"];

const OLAY = "bildim-cevap-imzasi";
let yerel = null;   // { uid, anahtar } — son tak/çıkar (oturum boyu)

/** kozmetikTak çağırır: takılan (ya da null = çıkarılan) imzayı hemen yayar. */
export function imzaYerelAyarla(uid, anahtar) {
  yerel = { uid: uid ?? null, anahtar: anahtar ?? null };
  try { window.dispatchEvent(new Event(OLAY)); } catch { /* pencere yok */ }
}

/** Oturumdaki oyuncunun takılı Cevap İmzası (anahtar) ya da null. */
export function useTakiliImza() {
  const { user, profile } = useAuth();
  const [, setSurum] = useState(0);
  useEffect(() => {
    const f = () => setSurum((n) => n + 1);
    window.addEventListener(OLAY, f);
    return () => window.removeEventListener(OLAY, f);
  }, []);
  const anahtar = yerel && yerel.uid === user?.id ? yerel.anahtar : profile?.takili_cevap_imzasi;
  return IMZA_ANAHTARLARI.includes(anahtar) ? anahtar : null;
}
