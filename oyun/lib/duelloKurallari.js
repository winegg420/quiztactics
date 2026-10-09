// Düello kural sayıları (960) — lobi / tanıtım / mod kartı metinleri için TEK yer.
//
// Kural sunucuda; maç kendi değerlerini satırda taşır (duello_durum › hakimiyet.esik, max_tur, puan). Bu kanca yalnız MAÇ
// DIŞI metinler içindir: yeni açılacak maçın kuralı. duello_secim_modu açıkken (sıralı kategori seçimi) eşik
// duello_hakimiyet_esik (7) ve tur duello_max_tur (20); kapalıyken eski akışın değerleri duello_bos_mod_esik (5) /
// duello_bos_mod_max_tur (16). Sayılar metne gömülmez.
// 970 · puan modu (duello_puan_modu = "yeni", yalnız seçim modunda): saldırı yalnız rakibin kategorisine; hedef
// duello_puan_hedef (12) puan ya da rakibin başlangıçtaki duello_puan_kategori_yolu (4) kategorisi; tur duello_puan_max_tur.
// 982 · savunma banı: duello_ban_acik (jsonb true/false; eski biçim 1/0) — false iken ban hiç anlatılmaz. Varsayılan KAPALI.
import { useEffect, useState } from "react";
import { ayar, ayarlar, useAyar } from "./ayarlar.js";

const VARSAYILAN = { secim: true, esik: 7, tur: 20, bosEsik: 5, bosTur: 16, puan: true, hedef: 12, yol: 4, puanTur: 20, ban: false };

const coz = (secim, esik, tur, bosEsik, bosTur, puan, hedef, yol, puanTur) => (secim
  ? (puan ? { secim: true, puan: true, esik, tur: puanTur, hedef, yol } : { secim: true, puan: false, esik, tur, hedef, yol })
  : { secim: false, puan: false, esik: bosEsik, tur: bosTur, hedef, yol });

// duello_puan_modu metin ayarıdır ("yeni" | "eski"); useAyar sayı okur — bu yüzden ayrı okunur.
const puanModuOku = (o) => (o?.duello_puan_modu === undefined ? VARSAYILAN.puan : o.duello_puan_modu === "yeni");
// Düello v4 (1013–1018): duello_v4_acik "acik" iken herkes v4 oynar ("test" yalnız test hesapları — istemci ayırt edemez, eski sayılır).
const v4Oku = (o) => o?.duello_v4_acik === "acik";
const banOku = (o) => (o?.duello_ban_acik === undefined ? VARSAYILAN.ban : [true, 1, "1", "true"].includes(o.duello_ban_acik));

/** { secim, puan, esik, tur, hedef, yol, ban, v4 } — yeni açılacak Düello maçının kuralı (ayarlar okunamazsa varsayılanlar). */
export function useDuelloKurallari() {
  const secim = useAyar("duello_secim_modu", VARSAYILAN.secim ? 1 : 0) >= 1;
  const esik = useAyar("duello_hakimiyet_esik", VARSAYILAN.esik);
  const tur = useAyar("duello_max_tur", VARSAYILAN.tur);
  const bosEsik = useAyar("duello_bos_mod_esik", VARSAYILAN.bosEsik);
  const bosTur = useAyar("duello_bos_mod_max_tur", VARSAYILAN.bosTur);
  const hedef = useAyar("duello_puan_hedef", VARSAYILAN.hedef);
  const yol = useAyar("duello_puan_kategori_yolu", VARSAYILAN.yol);
  const puanTur = useAyar("duello_puan_max_tur", VARSAYILAN.puanTur);
  const [puan, setPuan] = useState(VARSAYILAN.puan);
  const [ban, setBan] = useState(VARSAYILAN.ban);
  const [v4, setV4] = useState(false);
  const [hazir, setHazir] = useState(false);   // ayarlar okunana kadar v4 bilinmez — eski kural metni çizilmesin
  useEffect(() => {
    let aktif = true;
    ayarlar().then((o) => { if (aktif) { setPuan(puanModuOku(o)); setBan(banOku(o)); setV4(v4Oku(o)); setHazir(true); } }, () => { if (aktif) setHazir(true); });
    return () => { aktif = false; };
  }, []);
  return { ...coz(secim, esik, tur, bosEsik, bosTur, puan, hedef, yol, puanTur), ban, v4, hazir };
}

/** Aynı kural, kanca dışı (async) kullanım için. Hata olursa varsayılanlar. */
export async function duelloKurallari() {
  try {
    const [secim, esik, tur, bosEsik, bosTur, hedef, yol, puanTur, o] = await Promise.all([
      ayar("duello_secim_modu", 1), ayar("duello_hakimiyet_esik", VARSAYILAN.esik), ayar("duello_max_tur", VARSAYILAN.tur),
      ayar("duello_bos_mod_esik", VARSAYILAN.bosEsik), ayar("duello_bos_mod_max_tur", VARSAYILAN.bosTur),
      ayar("duello_puan_hedef", VARSAYILAN.hedef), ayar("duello_puan_kategori_yolu", VARSAYILAN.yol),
      ayar("duello_puan_max_tur", VARSAYILAN.puanTur), ayarlar(),
    ]);
    return { ...coz(secim >= 1, esik, tur, bosEsik, bosTur, puanModuOku(o), hedef, yol, puanTur), ban: banOku(o), v4: v4Oku(o) };
  } catch (e) {
    console.warn("[Bildim] düello kuralları okunamadı:", e?.message ?? e);
    return { secim: VARSAYILAN.secim, puan: VARSAYILAN.puan, esik: VARSAYILAN.esik, tur: VARSAYILAN.puanTur, hedef: VARSAYILAN.hedef, yol: VARSAYILAN.yol, ban: VARSAYILAN.ban, v4: false };
  }
}
