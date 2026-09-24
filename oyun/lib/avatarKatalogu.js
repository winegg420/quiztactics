// ============================================================
// YENİ AVATAR KATALOĞU (520/550) — profil ve kurulum avatar ızgaraları için
//
// 550 (Ida): 27 yeni avatar (13 günlük + 14 kostümlü) herkese ücretsiz. Liste koda gömülmez —
// sunucudan (avatar_katalogu_oyun, yalnız okur) gelir; seçimi avatar_onayla doğrular.
// Migration 550 uygulanmadan önce normal oyuncuya liste boş döner → ızgaralar eski 31 avatarla kalır.
// Oturum boyunca bir kez okunur (aynı anda birden çok ekran tek istek paylaşır).
// ============================================================
import { useEffect, useState } from "react";
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
