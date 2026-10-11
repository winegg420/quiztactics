// ============================================================
// POSTA KUTUSU (1060) — bildirim zili paneli = posta kutusu.
// Bilgi = mevcut bildirimler; Ödüllü / Duyuru = yönetimden ("Quiz Tactics") gelen posta.
// Okuma tek çağrı (posta_kutusu), yazmalar security definer RPC. Metinler TR/EN ayrı; EN boşsa TR.
// ============================================================
import { supabase } from "../../src/lib/supabase.js";
import { aktifDil, tt } from "./dil.js";
import { SKILL_TANIMLARI } from "./jokerler.js";

export const POSTA_GONDEREN = "Quiz Tactics";

const enMi = () => aktifDil() === "en";

/** Oyuncunun dilindeki başlık/metin (EN boşsa TR). */
export const postaBaslik = (p) => (enMi() && p?.baslik_en ? p.baslik_en : p?.baslik_tr ?? "");
export const postaMetin = (p) => (enMi() && p?.metin_en ? p.metin_en : p?.metin_tr ?? "");

/** Alınmamış ödülü olan posta (süresi geçmemiş — sunucu zaten süzer). */
export const odulBekliyor = (p) => Array.isArray(p?.oduller) && p.oduller.length > 0 && !p?.alindi;

/** Zil sayısı: okunmamış ya da ödülü bekleyen posta (ikisi birden olan bir kez sayılır). */
export const postaRozetSayisi = (postalar) => (postalar ?? []).filter((p) => !p.okundu || odulBekliyor(p)).length;

/** Ödül kalemi → OdulGorsel'in beklediği biçim. */
export const odulGorselVeri = (k) => ({ tur: k.tur, veri: { tur: k.anahtar, anahtar: k.anahtar, url: k.url } });

/** Ödül kaleminin kısa adı ("100 coin", "2× 50:50", avatar adı). */
export function odulAdi(k) {
  const n = Number(k?.miktar ?? 1);
  switch (k?.tur) {
    case "coin": return tt("{0} coin", { 0: n.toLocaleString(enMi() ? "en-US" : "tr-TR") });
    case "elmas": return tt("{0} elmas", { 0: n.toLocaleString(enMi() ? "en-US" : "tr-TR") });
    case "joker": return `${n}× ${SKILL_TANIMLARI[k.anahtar]?.ad ?? k.anahtar}`;
    case "avatar": return (enMi() ? k.ad_en : k.ad_tr) || k.ad_tr || tt("Avatar");
    default: return tt("Ödül");
  }
}

/** Panel verisi: { bildirimler, postalar } — panel açılışında TEK çağrı. */
export async function postaKutusuOku() {
  const { data, error } = await supabase.rpc("posta_kutusu");
  if (error) throw error;
  return {
    bildirimler: Array.isArray(data?.bildirimler) ? data.bildirimler : [],
    postalar: Array.isArray(data?.postalar) ? data.postalar : [],
  };
}

/** Paneli açınca: bildirimler + görünür postalar okundu. */
export async function postaKutusuOkundu() {
  const { error } = await supabase.rpc("posta_kutusu_oku");
  if (error) throw error;
}

/** Ödülü al (tek sefer). Döner: verilen kalemler [{tur, miktar, anahtar, zaten_sende}]. */
export async function postaOdulAl(postaId) {
  const { data, error } = await supabase.rpc("posta_odul_al", { p_posta: postaId });
  if (error) throw error;
  return Array.isArray(data?.verilen) ? data.verilen : [];
}

// ---------- Yönetim (sunucu: sahip_mi) ----------
export async function postaOyuncuAra(q) {
  const { data, error } = await supabase.rpc("posta_oyuncu_ara", { p_q: q });
  if (error) throw error;
  return data ?? [];
}

export async function postaGonder(f) {
  const { data, error } = await supabase.rpc("posta_gonder", {
    p_tur: f.tur, p_hedef: f.hedef, p_hedef_oyuncu: f.hedefOyuncu ?? null, p_hedef_lig: f.hedefLig ?? null,
    p_baslik_tr: f.baslikTr, p_baslik_en: f.baslikEn, p_metin_tr: f.metinTr, p_metin_en: f.metinEn,
    p_oduller: f.oduller, p_bitis: f.bitis,
  });
  if (error) throw error;
  return data;
}

export async function postaGonderilenler() {
  const { data, error } = await supabase.rpc("posta_gonderilenler");
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function postaBitir(id) {
  const { error } = await supabase.rpc("posta_bitir", { p_id: id });
  if (error) throw error;
}
