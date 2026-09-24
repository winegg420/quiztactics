// ============================================================
// ELMAS KOZMETİKLERİ (540–542) — VS kartı · İsim efekti · Zafer efekti · Tepki paketi
//
// Sunucu: kozmetik_katalogu / kozmetik_satin_al / kozmetik_tak (satış kapısı + sahip test modu
// sunucuda), yalnız sahip kozmetik_onay_listesi / kozmetik_onay_kaydet. Başkasının takılı kozmetiği
// oyuncu_kartlari'ndan gelir (oyun/lib/cerceve.js — toplu + önbellekli; ek sorgu yok).
// Görünüm: oyun/tasarim/ekranlar/kozmetik.css (VS kartı, isim efekti, tepki) ve ZaferEfekti.jsx (tembel).
//
// TEPKİ (542): oyuncu tepkisi DB'ye yazılmaz — maç kanalına Realtime broadcast ("tepki" olayı,
// { id, k, u }). Alıcı yalnız bilinen 12 tepkiyi çizer, gönderen başına 3 sn / maçta 10 sınırını
// kendisi uygular (yayın istemciden olduğu için sunucu sayamaz). "Rakip tepkilerini gizle" cihazda.
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { oyuncuKartiUnut } from "./cerceve.js";
import { tt } from "./dil.js";

export const KOZMETIK_TURLERI = ["vs_karti", "isim_efekti", "zafer_efekti", "tepki_paketi", "premium_cerceve", "premium_aura"];
export const TUR_ADI = {
  aura: "Aura", avatar: "Avatar", vs_karti: "VS Kartı", isim_efekti: "İsim Efekti",
  zafer_efekti: "Zafer Efekti", tepki_paketi: "Tepki",
  premium_cerceve: "Çerçeve", premium_aura: "Aura",
};

/** Kalem görünümü (adlar sunucudan da gelir; bunlar önizleme/yedek). `tema` CSS data-vs / data-ef / data-zafer değeri. */
export const KOZMETIK_TANIMLARI = {
  vs_uzay:       { tur: "vs_karti", tema: "uzay", ad: "Uzay" },
  vs_orman:      { tur: "vs_karti", tema: "orman", ad: "Orman" },
  vs_neon_sehir: { tur: "vs_karti", tema: "neon-sehir", ad: "Neon Şehir" },
  vs_okyanus:    { tur: "vs_karti", tema: "okyanus", ad: "Okyanus" },
  vs_volkan:     { tur: "vs_karti", tema: "volkan", ad: "Volkan" },
  vs_sakura:     { tur: "vs_karti", tema: "sakura", ad: "Sakura" },
  isim_altin:      { tur: "isim_efekti", tema: "altin", ad: "Altın" },
  isim_gokkusagi:  { tur: "isim_efekti", tema: "gokkusagi", ad: "Gökkuşağı" },
  isim_neon_mavi:  { tur: "isim_efekti", tema: "neon-mavi", ad: "Neon Mavi" },
  isim_alev:       { tur: "isim_efekti", tema: "alev", ad: "Alev" },
  isim_buz:        { tur: "isim_efekti", tema: "buz", ad: "Buz" },
  isim_mor_isilti: { tur: "isim_efekti", tema: "mor-isilti", ad: "Mor Işıltı" },
  zafer_havai_fisek:    { tur: "zafer_efekti", tema: "havai-fisek", ad: "Havai Fişek" },
  zafer_altin_yagmuru:  { tur: "zafer_efekti", tema: "altin-yagmuru", ad: "Altın Yağmuru" },
  zafer_ejder_alevi:    { tur: "zafer_efekti", tema: "ejder-alevi", ad: "Ejder Alevi" },
  zafer_kar_firtinasi:  { tur: "zafer_efekti", tema: "kar-firtinasi", ad: "Kar Fırtınası" },
  zafer_yildiz_yagmuru: { tur: "zafer_efekti", tema: "yildiz-yagmuru", ad: "Yıldız Yağmuru" },
  tepki_eglence: { tur: "tepki_paketi", ad: "Eğlence", tepkiler: ["gulen", "ates", "hedef", "tac"] },
  tepki_rekabet: { tur: "tepki_paketi", ad: "Rekabet", tepkiler: ["kas", "korku", "selam", "rica"] },
  // 560: premium (hareketli çerçeve + iç arka plan aurası). `sanat` = oyun/tasarim/premium/ anahtarı.
  pc_sonbahar: { tur: "premium_cerceve", sanat: "sonbahar", ad: "Sonbahar" },
  pc_galaksi:  { tur: "premium_cerceve", sanat: "galaksi", ad: "Galaksi" },
  pc_sakura:   { tur: "premium_cerceve", sanat: "sakura", ad: "Sakura" },
  // 570: 2. tur (WebGL efektli; sanat oyun/tasarim/premium/tur2/ — PremiumAvatarCizim › TUR2_SANAT)
  pc_alev2:     { tur: "premium_cerceve", sanat: "alev2", ad: "Sönmeyen Alev" },
  pc_simsek2:   { tur: "premium_cerceve", sanat: "simsek2", ad: "Şimşek" },
  pc_kraliyet2: { tur: "premium_cerceve", sanat: "kraliyet2", ad: "Kraliyet" },
  // 580: Ejderha 2. tur (Ida onayı). public/kozmetik/premium/ejderha.png varsa kod çizimi yerine o (Cerceve2 › PNG_YUVALARI)
  pc_ejderha2:  { tur: "premium_cerceve", sanat: "ejderha2", ad: "Ejderha" },
  pa_yaprak:   { tur: "premium_aura", sanat: "yaprak", ad: "Düşen Sonbahar Yaprakları" },
  pa_kar:      { tur: "premium_aura", sanat: "kar", ad: "Yağan Kar" },
  pa_kor:      { tur: "premium_aura", sanat: "kor", ad: "Yükselen Köz" },
  pa_gece:     { tur: "premium_aura", sanat: "gece", ad: "Yıldızlı Gece" },
  pa_kuzey:    { tur: "premium_aura", sanat: "kuzey", ad: "Kuzey Işıkları" },
  pa_sualti:   { tur: "premium_aura", sanat: "sualti", ad: "Su Altı" },
};
export const kozmetikTemasi = (anahtar) => KOZMETIK_TANIMLARI[anahtar]?.tema ?? null;
/**
 * Premium kalem anahtarı (pc_galaksi / pa_gece) → sanat anahtarı (galaksi / gece). Bilinmeyen kalem de
 * önekinden çözülür (yeni kalem sunucuya eklenince sanat hazırsa istemci güncellemesi gerekmez);
 * sanat yoksa çizen bileşen onu yok sayar (eski görünüm).
 */
export function premiumSanat(anahtar) {
  if (!anahtar || typeof anahtar !== "string") return null;
  return KOZMETIK_TANIMLARI[anahtar]?.sanat ?? (/^p[ca]_[a-z0-9_]+$/.test(anahtar) ? anahtar.slice(3) : null);
}
export const kozmetikTurdekiler = (tur) => Object.keys(KOZMETIK_TANIMLARI).filter((k) => KOZMETIK_TANIMLARI[k].tur === tur);

/** Bilinen 12 tepki (alıcı yalnız bunları çizer). Görseller Noto Emoji 3D — public/kozmetik/tepki/. */
export const TEPKI_TANIMLARI = {
  alkis:   { emoji: "👏", ad: "Alkış" },
  havali:  { emoji: "😎", ad: "Havalı" },
  terli:   { emoji: "😅", ad: "Ter döktüm" },
  dusunen: { emoji: "🤔", ad: "Hmm" },
  gulen:   { emoji: "😂", ad: "Çok komik" },
  ates:    { emoji: "🔥", ad: "Ateş" },
  hedef:   { emoji: "🎯", ad: "Tam isabet" },
  tac:     { emoji: "👑", ad: "Kral benim" },
  kas:     { emoji: "💪", ad: "Güçlü" },
  korku:   { emoji: "😱", ad: "Olamaz" },
  selam:   { emoji: "🫡", ad: "Saygılar" },
  rica:    { emoji: "🙏", ad: "Lütfen" },
};
export const TEPKI_BEDAVA = ["alkis", "havali", "terli", "dusunen"];
export const tepkiGorseli = (k) => `/kozmetik/tepki/${k}.webp`;
export const tepkiBilinen = (k) => typeof k === "string" && Object.prototype.hasOwnProperty.call(TEPKI_TANIMLARI, k);

async function rpc(ad, parametre) {
  try {
    const { data, error } = await supabase.rpc(ad, parametre);
    if (error) throw error;
    return data;
  } catch (e) {
    console.error(`[Bildim] ${ad} başarısız:`, e?.message ?? e);
    throw e;
  }
}

/** [{ anahtar, tur, ad, ad_tr, ad_en, fiyat, icerik, sira, satilik, sahip, takili, kapali, onay }] */
export async function kozmetikKatalogu() {
  return (await rpc("kozmetik_katalogu")) ?? [];
}
/** Elmasla al (takmaz). 'Yetersiz elmas' / 'Bu kozmetik satılmıyor' hata atar. */
export async function kozmetikSatinAl(anahtar) {
  return rpc("kozmetik_satin_al", { p_anahtar: anahtar });
}
/** Tak / çıkar (anahtar null = o türün yuvası boşalır). Kendi kartımın önbelleğini tazeler. */
export async function kozmetikTak(tur, anahtar, userId) {
  const data = await rpc("kozmetik_tak", { p_tur: tur, p_anahtar: anahtar ?? null });
  oyuncuKartiUnut(userId);
  return data;
}
/** Yalnız sahip: bütün kalemler + Ida'nın satış seçimi (aura dahil). */
export async function kozmetikOnayListesi() {
  return (await rpc("kozmetik_onay_listesi")) ?? [];
}
export async function kozmetikOnayKaydet(anahtar, onay) {
  return rpc("kozmetik_onay_kaydet", { p_anahtar: anahtar, p_onay: onay });
}
/** Oturumdaki hesap sahip mi (yalnız arayüz ipucu; kapı sunucuda). */
export async function sahipMi() {
  try {
    return Boolean(await rpc("sahip_mi"));
  } catch {
    return false;
  }
}
/** Maç başında bir kez: { acik, mod, tepkiler[], aralik_sn, mac_max, balon_ms }. Okunamazsa kapalı. */
export async function tepkiDurumu(macTur, macId) {
  try {
    return (await rpc("tepki_durumu", { p_mac_tur: macTur, p_mac_id: macId })) ?? { acik: false };
  } catch {
    return { acik: false };
  }
}

// ---------- "Rakip tepkilerini gizle" (cihazda) ----------
// Neden cihazda: anahtar yalnız bu cihazın ekranını etkiler (Müzik/Efektler ile aynı), her değişimde
// veritabanına yazma olmaz (Disk IO kuralı) ve maç ekranı hiçbir ek okuma yapmadan anında bilir.
const GIZLE_ANAHTARI = "bildim_tepki_gizle";
const GIZLE_OLAY = "bildim-tepki-gizle";
export function tepkiGizliMi() {
  try { return localStorage.getItem(GIZLE_ANAHTARI) === "1"; } catch { return false; }
}
export function tepkiGizleAyarla(gizli) {
  try { localStorage.setItem(GIZLE_ANAHTARI, gizli ? "1" : "0"); } catch { /* özel mod */ }
  try { window.dispatchEvent(new Event(GIZLE_OLAY)); } catch { /* pencere yok */ }
}
export function useTepkiGizli() {
  const [gizli, setGizli] = useState(tepkiGizliMi);
  useEffect(() => {
    const f = () => setGizli(tepkiGizliMi());
    window.addEventListener(GIZLE_OLAY, f);
    window.addEventListener("storage", f);
    return () => { window.removeEventListener(GIZLE_OLAY, f); window.removeEventListener("storage", f); };
  }, []);
  return gizli;
}

/** Sunucu hata metni → kullanıcı metni. */
export function kozmetikHatasi(e) {
  const m = String(e?.message ?? e ?? "");
  if (m.includes("Yetersiz elmas")) return tt("Elmas yetmiyor");
  return m || tt("İşlem tamamlanamadı");
}
