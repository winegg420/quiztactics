import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseHazir = Boolean(url && anonKey);

// realtime eventsPerSecond: 20 — gerçek zamanlı oyunlar (Kafa Topu, DriftGP,
// PatiRun) pozisyon/durum senkronunu yüksek Hz gönderir; varsayılan 10/s dar kalır.
// Soğuk açılış (7 Eki 2026): index.html'deki ön yükleme betiği eskimiş belirteci JS inerken yeniler.
// Oturum kaydı okunmadan önce o yenileme beklenir (söz hiç reddedilmez); böylece supabase-js aynı
// yenileme belirteciyle ikinci kez yenilemez, taze kaydı okur. Depolama yoksa/kapalıysa supabase-js'in
// kendi varsayılanı (bellek) kullanılsın diye sarmalayıcı yalnız çalışan localStorage'da kurulur.
function onYuklemeyiBekleyenDepo() {
  try {
    const depo = window.localStorage;
    depo.setItem("__qt_depo_sinama", "1");
    depo.removeItem("__qt_depo_sinama");
    return {
      getItem: async (ad) => {
        const bekle = window.__qtOnYukleme?.oturum;
        if (bekle && ad.endsWith("-auth-token")) await bekle;
        return depo.getItem(ad);
      },
      setItem: (ad, deger) => depo.setItem(ad, deger),
      removeItem: (ad) => depo.removeItem(ad),
    };
  } catch {
    return undefined;
  }
}

export const supabase = supabaseHazir
  ? createClient(url, anonKey, {
    realtime: { params: { eventsPerSecond: 20 } },
    auth: { storage: typeof window !== "undefined" ? onYuklemeyiBekleyenDepo() : undefined },
  })
  : null;
