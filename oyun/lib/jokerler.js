import { tt } from "./dil.js";

// Oyuncuya gösterilen Skill sisteminin tek kayıt kaynağı. Veritabanındaki
// joker_* adları geriye uyumluluk için bilinçli olarak korunur.
export const SKILL_SLOT_VARSAYILAN = 3;
export const SKILL_SETI_ANAHTARI = "quiztactics:skill-seti:v1";

export const SKILL_TANIMLARI = {
  elli: {
    id: "elli", ad: "50:50", aciklama: tt("İki yanlış şık elenir"), ikon: "terazi",
    kategori: "bilgi", allowedModes: ["1v1", "grup", "turnuva", "duello"],
    allowedPhases: ["cevap"], target: "self", animation: "fifty-fifty",
    aktif: true, shopVisible: true,
  },
  sure: {
    id: "sure", ad: tt("Ek Süre"), aciklama: tt("Cevap sürene zaman ekler"), ikon: "saat",
    kategori: "destek", allowedModes: ["1v1", "grup", "turnuva", "duello"],
    allowedPhases: ["cevap"], target: "self", animation: "extra-time",
    aktif: true, shopVisible: true,
  },
  soru_degistir: {
    id: "soru_degistir", ad: tt("Soru Değiştir"),
    aciklama: tt("Kendi sorunu aynı kategoriden yenisiyle değiştirir; süre yeniden başlar."),
    ikon: "ileriAtla", kategori: "taktik", allowedModes: ["1v1", "grup", "duello"],
    allowedPhases: ["cevap"], target: "self", animation: "question-swap",
    aktif: true, shopVisible: true,
  },
  zaman_baskisi: {
    id: "zaman_baskisi", ad: tt("Zaman Baskısı"),
    aciklama: tt("Rakibin cevap süresini kısaltır"), ikon: "hizli",
    kategori: "saldırı", allowedModes: ["1v1", "duello"],
    allowedPhases: ["cevap", "hazirlik"], target: "opponent", animation: "time-pressure",
    aktif: true, shopVisible: true,
  },
  sigorta: {
    id: "sigorta", ad: tt("Sigorta"),
    aciklama: tt("Yanlış cevapta normal puanın yarısını kurtarır"), ikon: "sigorta",
    kategori: "destek", allowedModes: ["1v1"], allowedPhases: ["cevap"],
    target: "self", animation: "insurance", aktif: true, shopVisible: true,
  },
  cifte_puan: {
    id: "cifte_puan", ad: "2X",
    aciklama: tt("Doğru cevabın puanını ikiye katlar"), ikon: "cifte",
    kategori: "taktik", allowedModes: ["1v1"], allowedPhases: ["cevap"],
    target: "self", animation: "double-score", aktif: true, shopVisible: true,
  },
  ikinci_sans: {
    id: "ikinci_sans", ad: tt("İkinci Şans"),
    aciklama: tt("İlk yanlışta aynı soruda bir kez daha cevaplatır"), ikon: "ikinciSans",
    kategori: "bilgi", allowedModes: ["1v1", "duello"], allowedPhases: ["cevap"],
    target: "self", animation: "second-chance", aktif: true, shopVisible: true,
  },
  // Geçmiş envanter/kullanım kayıtları silinmez; bu üç kayıt yalnız görünmez
  // uyumluluk girdileridir ve hiçbir aktif listeye girmez.
  sis: { id: "sis", ad: tt("Sis"), ikon: "sis", kategori: "saldırı", aktif: false, shopVisible: false },
  savunma_kilidi: { id: "savunma_kilidi", ad: tt("Savunma Kilidi"), ikon: "kilit", kategori: "saldırı", aktif: false, shopVisible: false },
  saldiri_degistir: { id: "saldiri_degistir", ad: tt("Soru Değiştir (eski)"), ikon: "yenile", kategori: "taktik", aktif: false, shopVisible: false },
  // Maç skill'i değildir; günlük seri mekanizması için ayrı kalır.
  seri_koruma: { id: "seri_koruma", ad: tt("Seri Koruma"), aciklama: tt("Kaçırdığın bir günü telafi eder"), ikon: "kalkan", kategori: "yardimci", aktif: true, shopVisible: false, macIci: false },
};

export const AKTIF_MAC_SKILLERI = Object.values(SKILL_TANIMLARI)
  .filter((s) => s.aktif && s.allowedModes)
  .map((s) => s.id);
export const VARSAYILAN_SKILL_SETI = ["elli", "sure", "soru_degistir"];

export function skillSlotSayisi(ayar) {
  const n = Number(ayar?.skill_seti_slot);
  return Number.isInteger(n) && n > 0 ? n : SKILL_SLOT_VARSAYILAN;
}

export function skillSetiOku(slot = SKILL_SLOT_VARSAYILAN) {
  if (typeof localStorage === "undefined") return VARSAYILAN_SKILL_SETI.slice(0, slot);
  try {
    const ids = JSON.parse(localStorage.getItem(SKILL_SETI_ANAHTARI) ?? "[]");
    const temiz = [...new Set(ids)].filter((id) => AKTIF_MAC_SKILLERI.includes(id));
    return (temiz.length ? temiz : VARSAYILAN_SKILL_SETI).slice(0, slot);
  } catch {
    return VARSAYILAN_SKILL_SETI.slice(0, slot);
  }
}

export function skillSetiKaydet(ids, slot = SKILL_SLOT_VARSAYILAN) {
  const temiz = skillSetiTemizle(ids, slot);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(SKILL_SETI_ANAHTARI, JSON.stringify(temiz));
    window.dispatchEvent(new CustomEvent("skill-seti-degisti", { detail: temiz }));
  }
  return temiz;
}

/** Kalıcı depoya dokunmadan geçerli, tekrarsız bir skill seti üretir. */
export function skillSetiTemizle(ids, slot = SKILL_SLOT_VARSAYILAN) {
  return [...new Set(Array.isArray(ids) ? ids : [])]
    .filter((id) => AKTIF_MAC_SKILLERI.includes(id))
    .slice(0, slot);
}

export function skillModdaKullanilabilir(skill, macTur) {
  return Boolean(skill?.aktif && skill?.allowedModes?.includes(macTur));
}

export function macJokerleri(macTur, secili = skillSetiOku()) {
  if (macTur === "hizli") return [];
  return secili.filter((id) => skillModdaKullanilabilir(SKILL_TANIMLARI[id], macTur));
}

const ayarSayi = (a, k, v) => (Number.isFinite(Number(a?.[k])) ? Number(a[k]) : v);
export function jokerBilgi(tur, macTur, ayar) {
  const temel = SKILL_TANIMLARI[tur] ?? {};
  if (tur === "sure") {
    const sn = macTur === "duello" ? ayarSayi(ayar, "duello_ek_sure_sn", 5) : ayarSayi(ayar, "skill_ek_sure_sn", 10);
    return { ...temel, ad: tt("Ek Süre"), aciklama: tt("Cevap sürene {0} saniye ekler", { 0: sn }), etkiDegeri: sn };
  }
  if (tur === "zaman_baskisi") {
    const sn = macTur === "duello" ? Math.max(0, 15 - ayarSayi(ayar, "duello_zaman_baskisi_sn", 10)) : ayarSayi(ayar, "klasik_zaman_baskisi_sn", 5);
    return { ...temel, ad: macTur === "1v1" ? tt("Süreyi Kısalt") : temel.ad,
      aciklama: tt("Rakibin süresini {0} saniye kısaltır", { 0: sn }), etkiDegeri: sn };
  }
  return temel;
}

// Eski import adları uygulama içi uyumluluk için kalır; yeni UI aynı registry'yi okur.
export const JOKER_BILGI = SKILL_TANIMLARI;
export const MAC_ICI_JOKERLER = AKTIF_MAC_SKILLERI.filter((id) =>
  SKILL_TANIMLARI[id].allowedPhases?.includes("cevap") && SKILL_TANIMLARI[id].target === "self");
export const KLASIK_JOKERLER = AKTIF_MAC_SKILLERI.filter((id) => SKILL_TANIMLARI[id].allowedModes?.includes("1v1"));
export const SALDIRI_JOKERLERI = AKTIF_MAC_SKILLERI.filter((id) =>
  SKILL_TANIMLARI[id].allowedPhases?.includes("hazirlik") && SKILL_TANIMLARI[id].target === "opponent");
export const KLASIK_BILGI = Object.fromEntries(KLASIK_JOKERLER.map((id) => [id, SKILL_TANIMLARI[id]]));
export const sisAyari = () => ({ sn: 0, esik: 0 });
export const jokerAdi = (tur) => SKILL_TANIMLARI[tur]?.ad ?? tur;
export const jokerIkon = (tur) => SKILL_TANIMLARI[tur]?.ikon ?? "soru";

export function envanterNesne(satirlar) {
  const cikti = Object.fromEntries(Object.keys(SKILL_TANIMLARI).map((id) => [id, 0]));
  for (const s of satirlar ?? []) cikti[s.tur] = s.adet ?? 0;
  return cikti;
}
