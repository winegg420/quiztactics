import { tt } from "./dil.js";

// ============================================================
// JOKER KURALLARI — TEK KAYNAK (Paket 28 B)
//
// NEDEN BU DOSYA VAR: Paket 27'de kurallar değişti ama Dükkân'daki anlatım
// eskisiyle kaldı; oyuncu canlıda "maç başına en fazla 2 joker, arkadaş
// maçlarında sınırsız" yazısını okudu — ikisi de artık yanlıştı. Kural iki
// yerde iki türlü yazıldığı sürece biri hep geride kalır.
//
// KURALI DEĞİŞTİREN BURAYI DEĞİŞTİRİR. Sunucudaki karşılıkları:
//   · toplam hak            → oyun_ayarlari.klasik_skill_toplam_hak (6)
//   · tür başına hak        → oyun_ayarlari.klasik_skill_tur_basi_hak (2)
//   · soru başına hak       → oyun_ayarlari.klasik_skill_soru_basi_hak (1)
//   · ücretsiz 50:50        → joker_ucretsiz_elli_hakki()  (yalnız serbest 1v1)
//   · turnuva finali/altın  → joker_mac_siniri()           (0 döner)
//
// Sayılar Klasik ayarlarından gelir; Düello'nun hakkı ayrı kalır.
// ============================================================

/**
 * Joker kurallarının tam anlatımı, madde madde.
 * @param {number} [hak] maç başına toplam joker hakkı (sunucudan)
 * @returns {string[]} her biri bir cümle
 */
export function jokerKurallari(hak = 6) {
  return [
    tt("Bir maçta en çok {0} skill kullanabilirsin.", { 0: hak }),
    tt("Seçtiğin her skill'i maçta en çok 2 kez kullanabilirsin."),
    tt("Her soruda en fazla 1 skill kullanabilirsin."),
    tt("Ücretsiz 50:50 yalnız Serbest Klasik Mod'da; Dereceli maçta ve Düello'da hiçbir skill ücretsiz değil."),
    tt("Turnuva finalinde ve altın soruda skill kullanılamaz."),
    tt("Skill'in bittiyse maçın içinden alabilirsin — dükkâna gitmene gerek yok."),
  ];
}

/** Tek satırlık kısa özet (dar alanlar için). */
export function jokerKuraliOzet(hak = 6) {
  return tt("Maçta en fazla {0} joker kullanımı · tür başına 2 · soru başına 1", { 0: hak });
}
