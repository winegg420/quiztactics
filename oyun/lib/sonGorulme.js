// ============================================================
// SON GÖRÜLME — yalnız ARKADAŞ LİSTESİNDE, çevrimdışı arkadaş için (migration 1106)
//
// Kural sunucuda: arkadas_son_gorulme(uuid[]) yalnız kabul edilmiş arkadaşların last_seen'ini döner;
// çağıran ya da arkadaş "Son görülmemi gizle"yi açtıysa o satır gelmez. Yabancıya ve oyuncu kartına
// gösterilmez. Çevrimiçi/maçta arkadaş için metin çizilmez (Realtime Presence zaten "Çevrimiçi" der).
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { tt } from "./dil.js";

const YENILEME_MS = 90000;   // liste açıkken en çok 90 sn'de bir; arka plandayken yenilenmez

/** last_seen (ISO) → "Az önce" · "25 dk önce" · "6 sa önce" · "Dün" · "3 gün önce" · "1 haftadan uzun" */
export function sonGorulmeMetni(iso, simdi = Date.now()) {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t)) return null;
  const dk = Math.max(0, Math.floor((simdi - t) / 60000));
  if (dk < 5) return tt("Az önce");
  if (dk < 60) return tt("{0} dk önce", { 0: dk });
  const sa = Math.floor(dk / 60);
  const gunFarki = (() => {
    const a = new Date(simdi); a.setHours(0, 0, 0, 0);
    const b = new Date(t); b.setHours(0, 0, 0, 0);
    return Math.round((a - b) / 86400000);
  })();
  if (sa < 24 && gunFarki < 1) return tt("{0} sa önce", { 0: sa });
  if (gunFarki <= 1) return tt("Dün");
  if (gunFarki <= 7) return tt("{0} gün önce", { 0: gunFarki });
  return tt("1 haftadan uzun");
}

/** Dönüş: Map<uid, ISO>. Hata ya da gizleme → harita boş kalır (arayüz bir şey çizmez). */
export function useArkadasSonGorulme(idler, etkin = true) {
  const [harita, setHarita] = useState(() => new Map());
  const anahtar = (idler ?? []).filter(Boolean).slice(0, 200).join(",");

  useEffect(() => {
    if (!etkin || !anahtar) { setHarita(new Map()); return undefined; }
    let iptal = false;
    const ids = anahtar.split(",");
    const yukle = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const { data, error } = await supabase.rpc("arkadas_son_gorulme", { p_ids: ids });
        if (error) throw error;
        if (iptal) return;
        setHarita(new Map((data ?? []).filter((r) => r?.id && r?.son_gorulme).map((r) => [r.id, r.son_gorulme])));
      } catch (e) {
        if (!iptal) console.warn("[Bildim] son görülme alınamadı:", e?.message ?? e);
      }
    };
    yukle();
    const zamanlayici = setInterval(yukle, YENILEME_MS);
    const gorunurluk = () => { if (document.visibilityState === "visible") yukle(); };
    document.addEventListener("visibilitychange", gorunurluk);
    return () => {
      iptal = true;
      clearInterval(zamanlayici);
      document.removeEventListener("visibilitychange", gorunurluk);
    };
  }, [anahtar, etkin]);

  return harita;
}
