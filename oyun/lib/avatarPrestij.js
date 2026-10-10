// ============================================================
// AVATAR PRESTİJ (1049, Ida 10 Eki 2026) — sahip olunan avatarı coin'le BİR KEZ geliştirme (tek kademe)
//
// Efekt yalnız görünüm: Avatar fotoğrafının içinde ara ara çakan beyaz yıldızlar (src/styles.css › .av-parla).
// Başkalarında oyuncu_kartlari.avatar_prestij (takılı avatar prestijli mi) okunur — CerceveliAvatar, ek sorgu yok.
// Burası yalnız KENDİ durumum: oyuncu_avatar_prestij (RLS: yalnız kendi satırım) + satın alma RPC'si
// avatar_prestij_al (sunucuda FOR UPDATE + coin_harca). Fiyat/bayrak oyun_ayarlari'ndan (koda gömülmez).
// Satır anahtarı avatar_nitelikleri.anahtar = adresin dosya adı ("/avatars/pro/viking-k25.svg" → "viking-k25").
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { oyuncuKartiUnut } from "./cerceve.js";
import { coinTazele } from "./coin.js";
import { hataMesaji } from "./hata.js";
import { tt } from "./dil.js";

/** Avatar adresinden sunucu anahtarı (yoksa null; Google fotoğrafı prestijlenemez). */
export function prestijAnahtari(url) {
  const m = /\/avatars\/[^?#]*?([^/?#]+)\.svg(?:[?#].*)?$/.exec(String(url ?? ""));
  return m ? m[1] : null;
}

let kume = null;          // Set<anahtar> | null (okunmadı)
let istek = null;
const dinleyiciler = new Set();

/** Kendi prestijli avatarlarım (oturum boyunca önbellek). Hata olursa boş küme. */
export function prestijlerimYukle(taze = false) {
  if (kume && !taze) return Promise.resolve(kume);
  if (istek && !taze) return istek;
  istek = (async () => {
    try {
      const { data, error } = await supabase.from("oyuncu_avatar_prestij").select("avatar");
      if (error) throw error;
      kume = new Set((data ?? []).map((r) => r.avatar));
    } catch (e) {
      console.warn("[Prestij] okunamadı:", e?.message ?? e);
      kume = kume ?? new Set();
    } finally {
      istek = null;
    }
    for (const f of dinleyiciler) { try { f(kume); } catch { /* yut */ } }
    return kume;
  })();
  return istek;
}

/** React kancası: kendi prestijli avatar anahtarlarım (Set). */
export function usePrestijlerim() {
  const [deger, setDeger] = useState(() => kume ?? new Set());
  useEffect(() => {
    const f = (k) => setDeger(new Set(k));
    dinleyiciler.add(f);
    prestijlerimYukle().then(f, () => {});
    return () => { dinleyiciler.delete(f); };
  }, []);
  return deger;
}

const HATA = {
  kapali: "Prestij şu an kapalı.",
  sahip_degil: "Önce avatarı al",
  zaten_alindi: "Bu avatarın prestiji zaten sende.",
  coin_yetersiz: "Coin yetmiyor",
};

/** Sunucu hata kodunu okunur metne çevirir. */
export function prestijHatasi(e) {
  const m = String(e?.message ?? e ?? "");
  for (const [kod, metin] of Object.entries(HATA)) if (m.includes(kod)) return tt(metin);
  return hataMesaji(e, tt("İşlem tamamlanamadı"));
}

/**
 * Prestij satın al. Başarıda kendi kartım + bakiye + durum tazelenir (efekt her yerde anında görünür).
 * Dönüş: { alindi, coin, anahtar, url, fiyat } — hata atar (prestijHatasi ile metne çevir).
 */
export async function avatarPrestijAl(url, userId) {
  try {
    const { data, error } = await supabase.rpc("avatar_prestij_al", { p_avatar: prestijAnahtari(url) ?? url });
    if (error) throw error;
    oyuncuKartiUnut(userId);
    coinTazele();
    await prestijlerimYukle(true);
    return data;
  } catch (e) {
    console.error("[Prestij] avatar_prestij_al başarısız:", e?.message ?? e);
    throw e;
  }
}
