// Oyun ayarları (oyun_ayarlari tablosu) — tek kaynak, istemci tarafı önbelleği.
//
// Rakamlar (coin ödülleri, reklam sıklığı, joker fiyatları) KODA GÖMÜLMEZ:
// sunucudaki tablodan okunur, böylece SQL ile değiştirilen bir değer
// yeniden dağıtım gerektirmeden oyunda karşılığını bulur. Tablo herkese
// açık okunabilir (RLS: select true).

import { useEffect, useState } from "react";
import { supabase, onYuklemeOzeti } from "../../src/lib/supabase.js";
import { sonBilinenOku, sonBilinenYaz } from "./sonBilinen.js";

let onbellek = null;
let istek = null;
let ayarlarOkundu = false;
let ozetDenendi = false;
// 12 Eki 2026: son okunan tablo (tarayıcıda) — yalnız ilk çizimde (useAyar başlangıcı); sunucu yine okunur.
const kalici = sonBilinenOku("ayarlar", { genel: true }) ?? null;
const hazirDinleyici = new Set();

/** Tüm ayarları { anahtar: sayı/değer } olarak döndürür. Hata olursa {} . */
export async function ayarlar() {
  if (onbellek) return onbellek;
  if (istek) return istek;
  istek = (async () => {
    try {
      // 1109 (15 Eki 2026): ana sayfa açılışında tablo ön yükleme özetinde gelir (JS inerken, ilk turda) — yalnız ilk okuma.
      let data = null;
      if (!ozetDenendi) {
        ozetDenendi = true;
        const o = await onYuklemeOzeti("devam");
        if (Array.isArray(o?.oyun_ayarlari)) data = o.oyun_ayarlari;
      }
      if (!data) {
        const y = await supabase.from("oyun_ayarlari").select("anahtar, deger");
        if (y.error) throw y.error;
        data = y.data;
      }
      const o = {};
      for (const s of data ?? []) o[s.anahtar] = s.deger;
      onbellek = o;
      sonBilinenYaz("ayarlar", o, { genel: true });
      return o;
    } catch (e) {
      console.error("[Bildim] oyun ayarlari okunamadi:", e);
      return {}; // varsayılanlarla devam edilir
    } finally {
      istek = null;
      ayarlarOkundu = true;
      for (const f of hazirDinleyici) { try { f(); } catch { /* dinleyici */ } }
    }
  })();
  return istek;
}

/** Tek ayar; yoksa verilen varsayılan. */
export async function ayar(anahtar, varsayilan) {
  const o = await ayarlar();
  const v = Number(o?.[anahtar]);
  return Number.isFinite(v) ? v : varsayilan;
}

/**
 * React kancası: tek ayar (ör. Düello tur sayısı `duello_max_tur`). Önbellekte varsa ilk çizimde o,
 * yoksa varsayılan; tablo okununca güncellenir. Metinlerde sabit sayı yerine bunu kullan (1 Eki 2026, 16 tur).
 */
export function useAyar(anahtar, varsayilan) {
  const [deger, setDeger] = useState(() => {
    const v = Number((onbellek ?? kalici)?.[anahtar]);
    return Number.isFinite(v) ? v : varsayilan;
  });
  useEffect(() => {
    let aktif = true;
    ayar(anahtar, varsayilan).then((v) => { if (aktif) setDeger(v); }, () => {});
    return () => { aktif = false; };
  }, [anahtar, varsayilan]);
  return deger;
}

/**
 * Ayar değerleri BİLİNİYOR mu (12 Eki 2026): tablo okundu ya da son bilinen kopya var. Değere göre kart çizen
 * sayfa (ana sayfa › Ortak Hazine şeridi) bilinmezken varsayılanla yanlış düzen çizmek yerine iskelet gösterir.
 */
export function useAyarlarHazir() {
  const [hazir, setHazir] = useState(() => Boolean(onbellek || kalici || ayarlarOkundu));
  useEffect(() => {
    if (hazir) return undefined;
    const f = () => setHazir(true);
    hazirDinleyici.add(f);
    if (ayarlarOkundu || onbellek) f(); else ayarlar();
    return () => { hazirDinleyici.delete(f); };
  }, [hazir]);
  return hazir;
}

/** Senkron: bellekteki ya da son bilinen ayar tablosu (yoksa null). Yalnız ilk çizim içindir (12 Eki 2026). */
export function ayarlarSenkron() {
  return onbellek ?? kalici ?? null;
}
