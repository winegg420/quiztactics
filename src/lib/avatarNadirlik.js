// ============================================================
// AVATAR NADİRLİĞİ → SAHNE RENGİ (700, açıldı: 770) — bayrak avatar_nadirlik_renk
//
// Avatar çizimleri statik SVG'dir (public/avatars/pro, pro2); "Sahne" = ilk <rect> (renkli yuvarlatılmış kare).
// `oyun_ayarlari.avatar_nadirlik_renk` false iken sunucu (avatar_nadirlik_renkleri) BOŞ liste döner →
// hiçbir avatar yeniden boyanmaz, her şey eskisi gibi. Ida işaretlemeyi onaylayıp bayrağı açınca Sahne
// zemini nadirlikten türer. Tek çizim noktası: src/components/Avatar.jsx (kabuk ortak bileşeni → bu dosya src/lib'te) (bkz. useNadirlikSahneli).
// Renkler (Ida, 1 Eki 2026): Yaygın gri-mavi · Nadir yeşil · Epik = oyunun Epik moru (--qt-nadir-epik) · Efsanevi altın.
// Mor YALNIZ Epik için ayrılmıştır; kırmızı kullanılmaz (mavi = sen, kırmızı = rakip).
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

export const NADIRLIKLAR = ["yaygin", "nadir", "epik", "efsanevi"];

/** Sahne zemin rengi. */
export const NADIRLIK_RENK = {
  yaygin: "#7d93ad",    // gri-mavi
  nadir: "#3fae6a",     // yeşil
  epik: "#8b2fd6",      // keskin mor (tokenlar.css › --qt-nadir-epik)
  efsanevi: "#f5c431",  // altın
};

/** Sahne üstündeki ışık çizgisi (vurgu) — zeminle uyumlu açık ton. */
export const NADIRLIK_VURGU = {
  yaygin: "#dbe5f1",
  nadir: "#c8f0d8",
  epik: "#efdcff",          // --qt-nadir-epik-acik
  efsanevi: "#fff2b8",
};

export const NADIRLIK_AD = {
  yaygin: { tr: "Yaygın", en: "Common" },
  nadir: { tr: "Nadir", en: "Rare" },
  epik: { tr: "Epik", en: "Epic" },
  efsanevi: { tr: "Efsanevi", en: "Legendary" },
};

const SAHNE_RECT = /(<rect width="320" height="320" rx="38" fill=")#[0-9a-fA-F]{3,8}(")/;
// Işık çizgisi (köşe yayları) çizimlerden kaldırıldı (30 Eyl 2026); eşleşme olmaz, replace zararsız kalır.
const SAHNE_VURGU = /(<path d="M31 64q23 12 43-3M246 50q16 14 37 4" fill="none" stroke=")#[0-9a-fA-F]{3,8}(")/;

/** SVG metninde Sahne zeminini (ve ışık çizgisini) nadirlik rengine çevirir. Bulamazsa metni aynen döndürür. */
export function sahneyiBoya(svg, nadirlik) {
  const renk = NADIRLIK_RENK[nadirlik];
  if (!renk || typeof svg !== "string") return svg;
  return svg.replace(SAHNE_RECT, `$1${renk}$2`).replace(SAHNE_VURGU, `$1${NADIRLIK_VURGU[nadirlik]}$2`);
}

const svgAdresi = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// ---- Bayrak + harita (oturum başına bir kez; bayrak kapalıyken harita boş) ----
let haritaBekleyen = null;
let harita = new Map();
let haritaSurum = 0;
let sonDeneme = 0;

function haritaYukle() {
  if (haritaBekleyen) return haritaBekleyen;
  if (Date.now() - sonDeneme < 60_000) return Promise.resolve();   // hata sonrası en çok dakikada bir
  sonDeneme = Date.now();
  haritaBekleyen = (async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase.rpc("avatar_nadirlik_renkleri");
      if (error) throw error;
      harita = new Map((Array.isArray(data) ? data : []).map((r) => [r.url, r.nadirlik]));
      haritaSurum += 1;
    } catch (e) {
      console.error("[Bildim] avatar nadirlik renkleri okunamadı:", e?.message ?? e);
      haritaBekleyen = null;
    }
  })();
  return haritaBekleyen;
}

const boyali = new Map();   // "url|nadirlik" → data adresi (ya da null) | bekleyen söz
const bekleyenler = new Map();

function boyaliAdres(url, nadirlik) {
  const anahtar = `${url}|${nadirlik}`;
  if (boyali.has(anahtar)) return Promise.resolve(boyali.get(anahtar));
  if (bekleyenler.has(anahtar)) return bekleyenler.get(anahtar);
  const soz = (async () => {
    try {
      const cevap = await fetch(url);
      if (!cevap.ok) throw new Error(`HTTP ${cevap.status}`);
      const adres = svgAdresi(sahneyiBoya(await cevap.text(), nadirlik));
      boyali.set(anahtar, adres);
      return adres;
    } catch (e) {
      console.error("[Bildim] avatar Sahne boyanamadı:", url, e?.message ?? e);
      boyali.set(anahtar, null);
      return null;
    } finally {
      bekleyenler.delete(anahtar);
    }
  })();
  bekleyenler.set(anahtar, soz);
  return soz;
}

/** Bellekteki sonuç (eşzamanlı): yeniden bağlanan bileşen ilk karede doğru renkle çıkar, yanıp sönmez. */
function onbellektenAdres(url) {
  const nadirlik = harita.get(url);
  return nadirlik ? boyali.get(`${url}|${nadirlik}`) ?? null : null;
}

/**
 * Avatar adresi için nadirlik renkli Sahne'li SVG (data adresi) — bayrak kapalıysa ya da avatar
 * tabloda yoksa null (çağıran özgün adresi kullanır).
 */
export function useNadirlikSahneli(url) {
  const yerel = typeof url === "string" && url.startsWith("/avatars/pro");
  const [sonuc, setSonuc] = useState(() => (yerel ? onbellektenAdres(url) : null));
  useEffect(() => {
    if (!yerel) { setSonuc(null); return undefined; }
    let aktif = true;
    (async () => {
      await haritaYukle();
      const nadirlik = harita.get(url);
      if (!nadirlik) { if (aktif) setSonuc(null); return; }
      const adres = await boyaliAdres(url, nadirlik);
      if (aktif) setSonuc(adres);
    })();
    return () => { aktif = false; };
  }, [url, yerel]);
  return sonuc;
}

/** url → nadirlik haritası (bayrak kapalıyken boş; yüklenince bileşen yeniden çizilir). */
export function useNadirlikHaritasi() {
  const [, setSurum] = useState(haritaSurum);
  useEffect(() => {
    let aktif = true;
    haritaYukle().then(() => { if (aktif) setSurum(haritaSurum); });
    return () => { aktif = false; };
  }, []);
  return harita;
}

/**
 * Avatar seçim ekranları için bölümleme: Yaygın → Nadir → Epik → Efsanevi (Ida: kaliteliler aşağıda).
 * Aynı nadirlikte gelen sıra korunur. Harita boşsa (bayrak kapalı) tek bölüm, başlıksız: [{ nadirlik: null, ogeler }].
 * Haritada olmayan avatar Yaygın bölümüne düşer.
 */
export function nadirligeGoreBolumle(ogeler, urlAl, haritaDegeri) {
  if (!haritaDegeri || haritaDegeri.size === 0) return [{ nadirlik: null, ogeler }];
  const kovalar = new Map(NADIRLIKLAR.map((n) => [n, []]));
  for (const o of ogeler) kovalar.get(haritaDegeri.get(urlAl(o)) ?? "yaygin").push(o);
  return NADIRLIKLAR.filter((n) => kovalar.get(n).length > 0).map((n) => ({ nadirlik: n, ogeler: kovalar.get(n) }));
}
