// KLASİK / SAF BİLGİ MAÇ SATIRI ÖN YÜKLEMESİ (15 Eki 2026, yavaş telefon paketi 2)
//
// Rakip bulununca maç ekranına geçmeden önce ~2,85 sn VS anı oynar (RakipAra › ortak_arama_gecis). Maç sayfasının ilk
// okuması (matches satırı + iki profil) eskiden ancak sayfa kurulunca başlıyordu: yavaş 4G'de 0,4–0,6 sn'lik tek istek
// turu "Hazırım" ekranının önündeydi. Artık satır eşleşme anında istenir; MatchPage ilk macYukle'de BİR KEZ kullanır
// (yoklama/Realtime eskisi gibi ağdan; damga kuralı eski satırın yenisini ezmesini zaten engeller).
import { supabase } from "../../src/lib/supabase.js";

/** MatchPage'in maç satırı seçimi (tek kaynak). */
export const MAC_SECIMI = `*,
  p1:profiles!matches_oyuncu1_fkey(id, gorunen_ad, gorunen_avatar, gorunum, acik_bot),
  p2:profiles!matches_oyuncu2_fkey(id, gorunen_ad, gorunen_avatar, gorunum, acik_bot)`;

const OMUR_MS = 10000;   // VS anı + paket/kurulum payı; daha eskiyse kullanılmaz (sayfa ağdan okur)
const onYuklenen = new Map();   // maç id → { soz, an }

/** Eşleşme anında çağrılır; hata sessiz (sayfa ağdan okur). */
export function macSatiriOnYukle(id) {
  if (!id || onYuklenen.has(id)) return;
  let soz;
  try {
    soz = Promise.resolve(supabase.from("matches").select(MAC_SECIMI).eq("id", id).single())
      .then((y) => y, (e) => ({ data: null, error: e }));
  } catch (e) {
    soz = Promise.resolve({ data: null, error: e });
  }
  onYuklenen.set(id, { soz, an: Date.now() });
}

/** Ön yüklenmiş satır sözü (bir kez); yoksa / eskiyse null. */
export function macSatiriOnYuklemeAl(id) {
  const k = onYuklenen.get(id);
  onYuklenen.delete(id);
  if (!k || Date.now() - k.an > OMUR_MS) return null;
  return k.soz;
}
