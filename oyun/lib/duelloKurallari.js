// Düello kural sayıları (960) — lobi / tanıtım / mod kartı metinleri için TEK yer.
//
// Kural sunucuda; maç kendi değerlerini satırda taşır (duello_durum › hakimiyet.esik, max_tur). Bu kanca yalnız MAÇ
// DIŞI metinler içindir: yeni açılacak maçın kuralı. duello_secim_modu açıkken (sıralı kategori seçimi) eşik
// duello_hakimiyet_esik (7) ve tur duello_max_tur (20); kapalıyken eski akışın değerleri duello_bos_mod_esik (5) /
// duello_bos_mod_max_tur (16). Sayılar metne gömülmez.
import { ayar, useAyar } from "./ayarlar.js";

const VARSAYILAN = { secim: true, esik: 7, tur: 20, bosEsik: 5, bosTur: 16 };

const coz = (secim, esik, tur, bosEsik, bosTur) => (secim
  ? { secim: true, esik, tur }
  : { secim: false, esik: bosEsik, tur: bosTur });

/** { secim, esik, tur } — yeni açılacak Düello maçının kuralı (ayarlar okunamazsa 960 varsayılanları). */
export function useDuelloKurallari() {
  const secim = useAyar("duello_secim_modu", VARSAYILAN.secim ? 1 : 0) >= 1;
  const esik = useAyar("duello_hakimiyet_esik", VARSAYILAN.esik);
  const tur = useAyar("duello_max_tur", VARSAYILAN.tur);
  const bosEsik = useAyar("duello_bos_mod_esik", VARSAYILAN.bosEsik);
  const bosTur = useAyar("duello_bos_mod_max_tur", VARSAYILAN.bosTur);
  return coz(secim, esik, tur, bosEsik, bosTur);
}

/** Aynı kural, kanca dışı (async) kullanım için. Hata olursa varsayılanlar. */
export async function duelloKurallari() {
  try {
    const [secim, esik, tur, bosEsik, bosTur] = await Promise.all([
      ayar("duello_secim_modu", 1), ayar("duello_hakimiyet_esik", VARSAYILAN.esik), ayar("duello_max_tur", VARSAYILAN.tur),
      ayar("duello_bos_mod_esik", VARSAYILAN.bosEsik), ayar("duello_bos_mod_max_tur", VARSAYILAN.bosTur),
    ]);
    return coz(secim >= 1, esik, tur, bosEsik, bosTur);
  } catch (e) {
    console.warn("[Bildim] düello kuralları okunamadı:", e?.message ?? e);
    return { secim: VARSAYILAN.secim, esik: VARSAYILAN.esik, tur: VARSAYILAN.tur };
  }
}
