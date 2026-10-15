// Mod açıklamaları — TEK KAYNAK (Telefon denetimi 12 Eki 2026, Ida onaylı).
//
// Eskiden her ekran kendi cümlesini yazıyordu ve birbirini tutmuyordu (Modlar "5 joker türü · 20 tur",
// Düello lobisi "Maça götüreceğin 3 joker", Meydan Oku "7 joker türü · sıra sende"…). Ana sayfa mod kartları,
// Modlar, Meydan Oku, mod seçim penceresi ve lobiler açıklamayı BURADAN alır.
//
// Gerçek kural (PROJECT_CONTEXT + canlı oyun_ayarlari ölçümü, 12 Eki 2026):
//   • Klasik  — iki oyuncuya aynı sorular, en çok bilen kazanır; 7 joker türünden 3'ü maça seçilir (skill_seti_slot 3).
//   • Düello  — v4 (duello_v4_acik "acik"): tek bilen kontrolü alır, aynı kontrol döneminde 3/3 doğru (duello4_seri_hedef 3)
//               kazanır; 5 joker türünden 3'ü maça seçilir (Baskın/Kalkan v4'te yok).
//   • Saf Bilgi — jokersiz Klasik.
//   • Ortak Hazine — soruyu tek bilen hazineyi alır, AÇ/DEVAM; Klasik envanterinden 4 joker türü (50:50, Ek Süre,
//               Zaman Baskısı, İkinci Şans).
// Joker sayıları jokerler.js'ten HESAPLANIR; metne gömülmez.
import { tt } from "./dil.js";
import { KLASIK_JOKERLER, DUELLO_V4_JOKERLER, SKILL_SLOT_VARSAYILAN } from "./jokerler.js";

// Ortak Hazine'de kullanılabilen joker türleri (951/985: Soru Değiştir, Sigorta, 2X yok)
const HAZINE_JOKER_SAYISI = 4;

/** Tek cümlelik kısa açıklama (kart alt satırı, lobi başlığı). */
export function modAciklama(mod) {
  switch (mod) {
    case "klasik": return tt("Aynı sorular, en çok bilen kazanır.");
    case "duello": return tt("Kontrolü al, üst üste 3 doğru yap.");
    case "saf": return tt("Yalnız bilgiyle yarış.");
    case "kasa": return tt("Tek bilen hazineyi alır, doğru anda aç.");
    default: return "";
  }
}

/** Kısa joker satırı (rozet / meta). */
export function modJoker(mod) {
  switch (mod) {
    case "klasik": return tt("{n} joker türünden {s}'ünü seç", { n: KLASIK_JOKERLER.length, s: SKILL_SLOT_VARSAYILAN });
    case "duello": return tt("{n} joker türünden {s}'ünü seç", { n: DUELLO_V4_JOKERLER.length, s: SKILL_SLOT_VARSAYILAN });
    case "saf": return tt("Jokersiz");
    case "kasa": return tt("{n} joker türü", { n: HAZINE_JOKER_SAYISI });   // Klasik envanterinden (yer darlığı: rozet kısa)
    default: return "";
  }
}

/** Lobi kural maddeleri (3 kısa numaralı madde). Ortak Hazine hedef puanı ayardan gelir. */
export function modKurallari(mod, { hedef = 80 } = {}) {
  if (mod === "duello") return [
    tt("İkinize aynı soru gelir; tek bilen kontrolü alır."),
    tt("Kontrol sende: bir kartı rakibe gönder, birini kendine seç."),
    tt("Kontrolü kaybetmeden üst üste 3 doğru yapan kazanır."),
  ];
  if (mod === "kasa") return [
    tt("Soruyu tek başına bilen hazineyi alır."),
    tt("AÇ: puanına yaz. DEVAM: hazine büyür, sahipsiz kalır."),
    tt("{h} puana ilk ulaşan kazanır.", { h: hedef }),
  ];
  return [];
}
