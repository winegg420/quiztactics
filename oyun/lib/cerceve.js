// ============================================================
// ÇERÇEVELER + OYUNCU KARTLARI — sunucu RPC'lerinin ince sarmalayıcısı
// (sözleşme: docs/SOZLESME_ROZET_CERCEVE.md)
//
// Satın alma / takma sunucuda (FOR UPDATE, coin_harca). Görünüm arayüzde
// (oyun/tasarim/cerceveler/, CerceveliAvatar). Başkasının çerçevesi, ligi ve
// vitrini oyuncu_kartlari ile okunur: aynı karede istenen kimlikler tek çağrıda
// gider, sonuç oturum boyunca önbellekte kalır (ligCerceve.js ile aynı desen).
// ============================================================
import { supabase } from "../../src/lib/supabase.js";
import { ligCerceveUnut } from "./ligCerceve.js";

/** Nadirlikler, düşükten yükseğe (renk kodu arayüzde her yerde aynı). */
export const CERCEVE_NADIRLIKLERI = ["siradan", "nadir", "epik", "efsanevi"];

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

/** Katalog + durumum. Dönüş: [{ anahtar, ad, ad_tr, ad_en, nadirlik, kaynak, fiyat, kosul, sira, satilik, sahip, takili }] */
export async function cerceveKatalogu() {
  return (await rpc("cerceve_katalogu")) ?? [];
}

/** Sahip olduklarım. Dönüş: [{ anahtar, ad, nadirlik, kaynak, kazanildi_at, takili }] */
export async function cercevelerim() {
  return (await rpc("cercevelerim")) ?? [];
}

/** Çerçeve tak; null = çerçevesiz. Dönüş: { takili } */
export async function cerceveTak(anahtar, userId) {
  const data = await rpc("cerceve_tak", { p_anahtar: anahtar ?? null });
  oyuncuKartiUnut(userId);
  ligCerceveUnut(userId);
  return data;
}

/** Dükkândan satın al (takmaz). Dönüş: { anahtar, fiyat, bakiye, sahip } — 'Yetersiz coin' vb. hata atar. */
export async function cerceveSatinAl(anahtar) {
  return rpc("cerceve_satin_al", { p_anahtar: anahtar });
}

// ---------- Oyuncu kartları (toplu, önbellekli) ----------
// Kart: { id, ad, avatar, level, lig, cerceve, cerceve_nadirlik, vitrin: [{ anahtar, grup, kademe, ikon }] }

const onbellek = new Map();   // user_id → kart | null
let kuyruk = new Map();       // user_id → [coz, ...]
let zamanlayici = null;
const dinleyiciler = new Set();

async function kuyrugaBak() {
  const istekler = kuyruk;
  kuyruk = new Map();
  zamanlayici = null;
  const sonuc = new Map();
  try {
    const { data, error } = await supabase.rpc("oyuncu_kartlari", { p_idler: [...istekler.keys()] });
    if (error) throw error;
    for (const k of data ?? []) sonuc.set(k.id, k);
  } catch (e) {
    console.error("[Bildim] oyuncu_kartlari başarısız:", e?.message ?? e);
    // Önbelleğe yazılmaz: bir sonraki istek yeniden dener.
    for (const cozucler of istekler.values()) for (const coz of cozucler) coz(null);
    return;
  }
  for (const [id, cozucler] of istekler) {
    const k = sonuc.get(id) ?? null;
    onbellek.set(id, k);
    for (const coz of cozucler) coz(k);
  }
}

/** Tek oyuncunun kartı (yoksa null). Aynı karedeki istekler tek RPC'de birleşir. */
export function oyuncuKarti(userId) {
  if (!userId) return Promise.resolve(null);
  if (onbellek.has(userId)) return Promise.resolve(onbellek.get(userId));
  return new Promise((coz) => {
    const liste = kuyruk.get(userId) ?? [];
    liste.push(coz);
    kuyruk.set(userId, liste);
    if (!zamanlayici) zamanlayici = setTimeout(kuyrugaBak, 30);
  });
}

/** Birden çok kart; sıra korunur. Dönüş: (kart | null)[] */
export function oyuncuKartlari(idler) {
  return Promise.all((idler ?? []).map((id) => oyuncuKarti(id)));
}

/** Önbellekten düşür (kendi çerçevem/vitrinim değişince). userId yoksa hepsi. */
export function oyuncuKartiUnut(userId) {
  if (userId) onbellek.delete(userId); else onbellek.clear();
  for (const f of dinleyiciler) {
    try { f(userId ?? null); } catch (e) { console.error("[Bildim] oyuncu kartı dinleyicisi:", e); }
  }
}

/** Kart değişince açık bileşenler yeniden okusun. Dönüş: aboneliği kaldıran fonksiyon. */
export function oyuncuKartiDinle(f) {
  dinleyiciler.add(f);
  return () => dinleyiciler.delete(f);
}

// ---------- AURALAR (481) — avatarın arkasındaki tema katmanı; yalnız ELMASLA satılır ----------

/** Aura kataloğu + durumum. Dönüş: [{ anahtar, ad, ad_tr, ad_en, nadirlik, kaynak, fiyat (elmas), kosul, sira, satilik, sahip, takili }] */
export async function auraKatalogu() {
  return (await rpc("aura_katalogu")) ?? [];
}

/** Elmasla satın al (takmaz). Dönüş: { anahtar, fiyat, bakiye, sahip } — 'Yetersiz elmas' vb. hata atar. */
export async function auraSatinAl(anahtar) {
  return rpc("aura_satin_al", { p_anahtar: anahtar });
}

/** Aura tak; null = aurasız. Önbellekleri tazeler (her yerde yeni aura görünsün). Dönüş: { takili } */
export async function auraTak(anahtar, userId) {
  const data = await rpc("aura_tak", { p_anahtar: anahtar ?? null });
  oyuncuKartiUnut(userId);
  return data;
}
