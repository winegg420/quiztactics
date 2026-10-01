// ============================================================
// YENİ AVATAR KATALOĞU (520/550) — profil ve kurulum avatar ızgaraları için
//
// 550 (Ida): 27 yeni avatar (13 günlük + 14 kostümlü) herkese ücretsiz. Liste koda gömülmez —
// sunucudan (avatar_katalogu_oyun, yalnız okur) gelir; seçimi avatar_onayla doğrular.
// Migration 550 uygulanmadan önce normal oyuncuya liste boş döner → ızgaralar eski 31 avatarla kalır.
// Oturum boyunca bir kez okunur (aynı anda birden çok ekran tek istek paylaşır).
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { aktifDil, tt } from "./dil.js";

// Profesyonel avatar seti. Eski düşük ayrıntılı SVG'ler donduruldu; 31 karakter
// aynı çizim dilinde yeniden üretildi. Kaynak: AvatarProIllustrations.jsx.
export const HAZIR_AVATARLAR = [
  { url: "/avatars/pro/kedi-k01.svg", ad: tt("Kedi") },
  { url: "/avatars/pro/kopek-k02.svg", ad: tt("Köpek") },
  { url: "/avatars/pro/baykus-k03.svg", ad: tt("Baykuş") },
  { url: "/avatars/pro/tilki-k04.svg", ad: tt("Tilki") },
  { url: "/avatars/pro/panda-k05.svg", ad: tt("Panda") },
  { url: "/avatars/pro/penguen-k06.svg", ad: tt("Penguen") },
  { url: "/avatars/pro/kurbaga-k07.svg", ad: tt("Kurbağa") },
  { url: "/avatars/pro/ayi-k08.svg", ad: tt("Ayı") },
  { url: "/avatars/pro/maymun-k09.svg", ad: tt("Maymun") },
  { url: "/avatars/pro/dinozor-k10.svg", ad: tt("Dinozor") },
  { url: "/avatars/pro/ejderha-k11.svg", ad: tt("Ejderha") },
  { url: "/avatars/pro/kopekbaligi-k12.svg", ad: tt("Köpekbalığı") },
  { url: "/avatars/pro/ahtapot-k13.svg", ad: tt("Ahtapot") },
  { url: "/avatars/pro/ari-k14.svg", ad: tt("Arı") },
  { url: "/avatars/pro/robot-k15.svg", ad: tt("Robot") },
  { url: "/avatars/pro/uzayli-k16.svg", ad: tt("Uzaylı") },
  { url: "/avatars/pro/astronot-k17.svg", ad: tt("Astronot") },
  { url: "/avatars/pro/ninja-k18.svg", ad: tt("Ninja") },
  { url: "/avatars/pro/korsan-k19.svg", ad: tt("Korsan") },
  { url: "/avatars/pro/sovalye-k20.svg", ad: tt("Şövalye") },
  { url: "/avatars/pro/buyucu-k21.svg", ad: tt("Büyücü") },
  { url: "/avatars/pro/dedektif-k22.svg", ad: tt("Dedektif") },
  { url: "/avatars/pro/asci-k23.svg", ad: tt("Aşçı") },
  { url: "/avatars/pro/profesor-k24.svg", ad: tt("Profesör") },
  { url: "/avatars/pro/viking-k25.svg", ad: tt("Viking") },
  { url: "/avatars/pro/hayalet-k26.svg", ad: tt("Hayalet") },
  { url: "/avatars/pro/zombi-k27.svg", ad: tt("Zombi") },
  { url: "/avatars/pro/mumya-k28.svg", ad: tt("Mumya") },
  { url: "/avatars/pro/kahraman-k29.svg", ad: tt("Kahraman") },
  { url: "/avatars/pro/palyaco-k30.svg", ad: tt("Palyaço") },
  { url: "/avatars/pro/kral-k31.svg", ad: tt("Kral") },
];

let bekleyen = null;

async function katalogOku() {
  try {
    const { data, error } = await supabase.rpc("avatar_katalogu_oyun");
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("[Bildim] avatar kataloğu okunamadı:", e?.message ?? e);
    bekleyen = null;   // hata önbelleğe alınmaz; sonraki açılış yeniden dener
    return [];
  }
}

/**
 * Kullanılabilir katalog avatarları: [{ url, ad, tur }] (sıra sunucudan).
 * @param {boolean} [etkin=true]  false → okuma yapılmaz (ör. ızgara kapalıyken)
 */
export function useKatalogAvatarlari(etkin = true) {
  const [liste, setListe] = useState([]);
  useEffect(() => {
    if (!etkin || !supabase) return undefined;
    let aktif = true;
    if (!bekleyen) bekleyen = katalogOku();
    bekleyen.then((satirlar) => {
      if (!aktif) return;
      const en = aktifDil() === "en";
      setListe(satirlar
        .filter((a) => a?.kullanabilir && typeof a.url === "string")
        .map((a) => ({ url: a.url, ad: (en ? a.ad_en : a.ad_tr) ?? a.ad_tr ?? "", tur: a.tur })));
    });
    return () => { aktif = false; };
  }, [etkin]);
  return liste;
}

// ------------------------------------------------------------
// 701 · KADEMELİ AÇILIŞ: acilis_zamani gelmemiş avatar oyuncuya görünmez.
// Katalog avatarlarını sunucu zaten süzer (avatar_katalogu_oyun); koddaki 31 hazır avatarın
// süzülmesi için sunucudan kilitli adres listesi okunur (oturum başına bir kez). Seçimi ayrıca
// avatar_onayla reddeder. Okuma başarısızsa liste süzülmez (sunucu kapısı yine korur).
// ------------------------------------------------------------
let kilitliBekleyen = null;
let kilitliKume = new Set();
let kilitliSurum = 0;

export function kilitliAvatarlariYukle() {
  if (!kilitliBekleyen) {
    kilitliBekleyen = (async () => {
      try {
        if (!supabase) return;
        const { data, error } = await supabase.rpc("avatar_kilitli_urller");
        if (error) throw error;
        kilitliKume = new Set(Array.isArray(data) ? data : []);
        kilitliSurum += 1;
      } catch (e) {
        console.error("[Bildim] kilitli avatarlar okunamadı:", e?.message ?? e);
        kilitliBekleyen = null;   // sonraki açılışta yeniden dener
      }
    })();
  }
  return kilitliBekleyen;
}

/** Henüz açılmamış (gösterilmeyecek) hazır avatar adreslerinin o anki kümesi (eşzamanlı okuma). */
export const kilitliAvatarKumesi = () => kilitliKume;

// ------------------------------------------------------------
// 820 · ÜCRETLİ AVATARLAR: Epik / Efsanevi avatar elmasla alınır ya da Sezon Yolu ödülüdür; seçmek SAHİPLİK ister.
// Sunucu yalnız sahiplik isteyen avatarları döner (avatar_sahiplik_durumu); listede olmayan avatar ücretsizdir.
// Kilit kararı SUNUCUDA (avatar_onayla reddeder) — burası yalnız arayüz ipucu. Okunamazsa (ör. migration henüz
// uygulanmadı) harita boş kalır: hiçbir avatar kilitli görünmez, eski davranış.
// ------------------------------------------------------------
let sahiplikBekleyen = null;
let sahiplikHaritasi = new Map();   // url → { anahtar, nadirlik, fiyat, sahibim, satilik }
let sahiplikSurum = 0;
const sahiplikDinleyenler = new Set();

/** Ücretli avatar durumunu okur (oturum başına bir kez; `taze` → yeniden). */
export function avatarSahiplikYukle(taze = false) {
  if (taze) sahiplikBekleyen = null;
  if (!sahiplikBekleyen) {
    sahiplikBekleyen = (async () => {
      try {
        if (!supabase) return;
        const { data, error } = await supabase.rpc("avatar_sahiplik_durumu");
        if (error) throw error;
        sahiplikHaritasi = new Map((Array.isArray(data) ? data : []).map((s) => [s.url, s]));
        sahiplikSurum += 1;
        sahiplikDinleyenler.forEach((f) => f(sahiplikSurum));
      } catch (e) {
        // PGRST202: işlev yok (migration 820 uygulanmadan dağıtılan istemci) → sessizce eski davranış
        if (e?.code !== "PGRST202") console.error("[Bildim] avatar sahipliği okunamadı:", e?.message ?? e);
        sahiplikBekleyen = null;   // sonraki açılışta yeniden dener
      }
    })();
  }
  return sahiplikBekleyen;
}

/** url → { anahtar, nadirlik, fiyat, sahibim, satilik } (yalnız ücretli avatarlar). Satın alma sonrası kendiliğinden tazelenir. */
export function useAvatarSahiplik() {
  const [, setSurum] = useState(sahiplikSurum);
  useEffect(() => {
    sahiplikDinleyenler.add(setSurum);
    avatarSahiplikYukle();
    return () => { sahiplikDinleyenler.delete(setSurum); };
  }, []);
  return sahiplikHaritasi;
}

/** Avatar kilitli mi: ücretli ve oyuncu sahip değil. */
export const avatarKilitliMi = (harita, url) => {
  const s = harita?.get(url);
  return Boolean(s) && !s.sahibim;
};

/** Elmasla avatar al (anahtar ya da adres). 'Yetersiz elmas' / 'Bu avatar zaten sende' hata atar; sonra durumu tazeler. */
export async function avatarSatinAl(anahtar) {
  try {
    const { data, error } = await supabase.rpc("avatar_satin_al", { p_anahtar: anahtar });
    if (error) throw error;
    await avatarSahiplikYukle(true);
    return data;
  } catch (e) {
    console.error("[Bildim] avatar_satin_al başarısız:", e?.message ?? e);
    throw e;
  }
}

/** HAZIR_AVATARLAR'ın açılmış olanları; kilitli liste gelince kendiliğinden süzülür. */
export function useHazirAvatarlar() {
  const [surum, setSurum] = useState(kilitliSurum);
  useEffect(() => {
    let aktif = true;
    kilitliAvatarlariYukle().then(() => { if (aktif) setSurum(kilitliSurum); });
    return () => { aktif = false; };
  }, []);
  return useMemo(() => HAZIR_AVATARLAR.filter((a) => !kilitliKume.has(a.url)), [surum]);
}
