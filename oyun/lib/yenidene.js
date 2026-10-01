// Zaman aşımında SINIRLI yeniden deneme (Düello eylemleri için).
//
// Yalnız "sunucu yetişemedi" hatalarında dener: Postgres 57014 (statement timeout), AbortError,
// "timed out", "gateway timeout" / 504. İş kuralı hataları (ör. "Rövanş süresi doldu") ASLA
// yeniden denenmez. Yalnız sunucuda İDEMPOTENT olan eylemlerde kullanılmalı (bkz. DuelloPage › eylem).

export const YENIDEN_DENEME_BEKLEMELERI_MS = [1000, 2000];   // en çok 2 yeniden deneme

const ZAMAN_ASIMI = /timed?\s*out|time-?out|gateway\s*time-?out|\b504\b/i;

export function zamanAsimiMi(hata) {
  if (!hata) return false;
  if (String(hata.code ?? "") === "57014") return true;
  if (hata.name === "AbortError") return true;
  return ZAMAN_ASIMI.test(String(hata.message ?? hata.error_description ?? hata));
}

const uyku = (ms) => new Promise((coz) => setTimeout(coz, ms));

/**
 * `calistir()` → { error } döndürür (ya da fırlatır). Zaman aşımı olursa bekleyip yeniden dener.
 * `vazgec()` true dönerse (tur ilerledi / maç bitti / ekran kapandı) deneme bırakılır ve son hata verilir.
 * Her zaman { error } döner; fırlatmaz.
 */
export async function zamanAsimindaYenidenDene(calistir, { vazgec = () => false, beklemeler = YENIDEN_DENEME_BEKLEMELERI_MS, bekle = uyku } = {}) {
  let sonuc;
  for (let deneme = 0; ; deneme++) {
    try {
      sonuc = await calistir();
    } catch (e) {
      sonuc = { error: e };
    }
    const hata = sonuc?.error;
    if (!hata || !zamanAsimiMi(hata) || deneme >= beklemeler.length) return sonuc ?? { error: null };
    await bekle(beklemeler[deneme]);
    if (vazgec()) return sonuc;
  }
}
