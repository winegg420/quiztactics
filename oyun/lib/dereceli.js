// ============================================================
// DERECELİ TERCİHİ — KALKTI (Ida, 16 Eki 2026; migration 1115)
//
// Bütün maçlar dereceli; "Serbest | Dereceli" anahtarı arayüzden kalktı.
// Yalnız açık bot (Meydan Oku › Antrenman) maçı puansız/yarım ödüldür —
// bunu sunucu zorlar (440), istemci karar vermez.
// profiles.dereceli_tercih ve localStorage "bildim_dereceli" artık OKUNMAZ
// ve YAZILMAZ (sütun ve dereceli_tercih_kaydet RPC'si silinmedi).
// Kanca, eski çağıranlar bozulmasın diye sabit true döndürür.
// ============================================================

const degistirme = () => {};

/** @returns {[true, (deger:boolean)=>void]} */
export function useDereceliTercih() {
  return [true, degistirme];
}
