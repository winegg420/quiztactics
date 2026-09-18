import { tt } from "./dil.js";
// Joker türleri ve arayüz bilgileri (tek kaynak).
// Kurallar ve envanter SUNUCUDA; burası yalnız gösterim.

export const JOKER_BILGI = {
  elli: {
    ad: "50:50",
    aciklama: tt("İki yanlış şık silinir"),
    ikon: "terazi",
    macIci: true,
  },
  sure: {
    ad: tt("+10 sn"),
    aciklama: tt("Soruya 10 saniye ekler"),
    ikon: "saat",
    macIci: true,
  },
  // "Pas" idi: yanlış cevabın cezası olmadığı için soruyu atlamak her zaman
  // rastgele bir şıkka basmaktan kötüydü, joker işlevsizdi. Artık soru
  // atlanmaz; yerine yeni bir soru gelir ve süre baştan başlar.
  soru_degistir: {
    ad: tt("Soru Değiştir"),
    aciklama: tt("Soruyu değiştirir; süre 15 saniyeden yeniden başlar."),   // Paket 32 C: sayı
    ikon: "ileriAtla",
    macIci: true,
  },
  // ---- Düello saldırı jokerleri (Paket 14, 4.5) — yalnız Saldırı Hazırlığı'nda ----
  zaman_baskisi: {
    ad: tt("Zaman Baskısı"),
    aciklama: tt("Rakibin cevap süresi 15 sn'den 10 sn'ye düşer"),
    ikon: "hizli",
    macIci: false,
    saldiri: true,
  },
  saldiri_degistir: {
    ad: tt("Soru Değiştir (saldırı)"),
    aciklama: tt("Aynı kategoriden başka bir soru gönderir"),
    ikon: "yenile",
    macIci: false,
    saldiri: true,
  },
  savunma_kilidi: {
    ad: tt("Savunma Kilidi"),
    aciklama: tt("Rakip bu soruda savunma jokeri kullanamaz"),
    ikon: "kilit",
    macIci: false,
    saldiri: true,
  },
  // Paket 32 A: Sis — yalnız Klasik Mod (Savunma Kilidi'nin yerine). Açıklama sayıyı
  // ayardan alır: bkz. jokerBilgi(). Buradaki metin ayar okunamazsa kullanılan yedektir.
  sis: {
    ad: tt("Sis"),
    aciklama: tt("Rakibin ekranını 3 saniye sise boğar."),
    ikon: "sis",
    macIci: true,
    saldiri: true,
  },
  seri_koruma: {
    ad: tt("Seri Koruma"),
    aciklama: tt("Kaçırdığın bir günü telafi eder"),
    ikon: "kalkan",
    macIci: false,
  },
};

export const MAC_ICI_JOKERLER = ["elli", "sure", "soru_degistir"];

// Paket 31 A — Klasik Mod (1v1) jokerleri. Sahibinin kararı: 5 joker, tek "Soru Değiştir"
// (Klasik'te ORTAK: iki oyuncuda da değişir). 'saldiri_degistir' Klasik'te yok.
// Paket 32 A: beşinci joker Savunma Kilidi → SİS (Savunma Kilidi düelloda duruyor).
// Aynı jokerin iki modda farklı çalıştığı OKUNARAK anlaşılsın diye açıklamalar ayrı.
// Paket 32 C: açıklamalarda SAYI var ve sayı oyun_ayarlari'ndan gelir (ayar değişirse yazı da).
export const KLASIK_JOKERLER = ["elli", "sure", "soru_degistir", "zaman_baskisi", "sis"];
const ayarSayi = (a, k, v) => (Number.isFinite(Number(a?.[k])) ? Number(a[k]) : v);
export const KLASIK_BILGI = {
  soru_degistir: { aciklama: () => tt("Soru ikinizde de değişir; süre 15 saniyeden yeniden başlar.") },
  zaman_baskisi: {
    ad: tt("Süreyi Kısalt"),
    aciklama: (a) => tt("Rakibin süresini {0} saniye kısaltır. Seninki aynı kalır.",
                        { 0: ayarSayi(a, "klasik_zaman_baskisi_sn", 5) }),
  },
  sis: {
    aciklama: (a) => tt("Rakibin ekranını {0} saniye sise boğar. Son {1} saniyede kullanılamaz.",
                        { 0: ayarSayi(a, "klasik_sis_sn", 3), 1: ayarSayi(a, "klasik_sis_son_esik_sn", 6) }),
  },
};
/** Klasik Mod Sis ayarları (ayar okunamazsa sunucunun varsayılanları). */
export function sisAyari(a) {
  return { sn: ayarSayi(a, "klasik_sis_sn", 3), esik: ayarSayi(a, "klasik_sis_son_esik_sn", 6) };
}

/** Maç türüne göre çubukta gösterilecek jokerler. */
export function macJokerleri(macTur) {
  return macTur === "1v1" ? KLASIK_JOKERLER : MAC_ICI_JOKERLER;
}

/**
 * Maç türüne göre joker bilgisi (Klasik'te ad/açıklama farklı olabilir).
 * @param {object} [ayar] oyun_ayarlari (ayarlar()); açıklamadaki sayılar buradan
 */
export function jokerBilgi(tur, macTur, ayar) {
  const temel = JOKER_BILGI[tur] ?? {};
  const k = macTur === "1v1" ? KLASIK_BILGI[tur] : null;
  if (!k) return temel;
  return {
    ...temel,
    ...(k.ad ? { ad: k.ad } : {}),
    aciklama: typeof k.aciklama === "function" ? k.aciklama(ayar) : (k.aciklama ?? temel.aciklama),
  };
}
export const SALDIRI_JOKERLERI = ["zaman_baskisi", "saldiri_degistir", "savunma_kilidi"];

export function jokerAdi(tur) {
  return JOKER_BILGI[tur]?.ad ?? tur;
}

// Artık emoji değil, <Ikon ad={...} /> için ikon ADI döner.
export function jokerIkon(tur) {
  return JOKER_BILGI[tur]?.ikon ?? "soru";
}

/** RPC'den gelen envanter dizisini { tur: adet } nesnesine çevirir. */
export function envanterNesne(satirlar) {
  const cikti = { elli: 0, sure: 0, soru_degistir: 0, seri_koruma: 0,
    zaman_baskisi: 0, saldiri_degistir: 0, savunma_kilidi: 0, sis: 0 };
  for (const s of satirlar ?? []) cikti[s.tur] = s.adet ?? 0;
  return cikti;
}
