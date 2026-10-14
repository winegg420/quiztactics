import { createClient } from "@supabase/supabase-js";
import { aktifDil } from "../../oyun/lib/dil.js";
import { supabaseHatasiKaydet } from "./izlemeKaydi.js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseHazir = Boolean(url && anonKey);

// realtime eventsPerSecond: 20 — gerçek zamanlı oyunlar (Kafa Topu, DriftGP,
// PatiRun) pozisyon/durum senkronunu yüksek Hz gönderir; varsayılan 10/s dar kalır.
// Soğuk açılış (7 Eki 2026): index.html'deki ön yükleme betiği eskimiş belirteci JS inerken yeniler.
// Oturum kaydı okunmadan önce o yenileme beklenir (söz hiç reddedilmez); böylece supabase-js aynı
// yenileme belirteciyle ikinci kez yenilemez, taze kaydı okur. Depolama yoksa/kapalıysa supabase-js'in
// kendi varsayılanı (bellek) kullanılsın diye sarmalayıcı yalnız çalışan localStorage'da kurulur.
const ON_YUKLEME_BEKLE_MS = 8000;
function onYuklemeyiBekleyenDepo() {
  try {
    const depo = window.localStorage;
    depo.setItem("__qt_depo_sinama", "1");
    depo.removeItem("__qt_depo_sinama");
    return {
      getItem: async (ad) => {
        const bekle = window.__qtOnYukleme?.oturum;
        // 12 Eki 2026: ön yükleme yenilemesi kesilmez; telefonda ağ askıda kalırsa söz HİÇ bitmiyordu ve
        // bütün Supabase çağrıları (coin, zil, Meydan Oku arkadaş listesi…) sonsuza kadar bekliyordu.
        // En çok ON_YUKLEME_BEKLE_MS beklenir; sonra kayıtlı oturumla devam edilir (supabase-js kendisi yeniler).
        if (bekle && ad.endsWith("-auth-token")) {
          await Promise.race([bekle, new Promise((coz) => setTimeout(coz, ON_YUKLEME_BEKLE_MS))]);
        }
        return depo.getItem(ad);
      },
      setItem: (ad, deger) => depo.setItem(ad, deger),
      removeItem: (ad) => depo.removeItem(ad),
    };
  } catch {
    return undefined;
  }
}

// 12 Eki 2026: veritabanı isteklerine ekrandaki dil eklenir (x-arayuz-dil) — çerçeve/aura/kozmetik/rozet
// adları hesabın kayıtlı diline değil arayüz diline göre gelsin (migration 1079 › arayuz_dili). Yalnız /rest/v1/.
// 14 Eki 2026 (1097): başarısız rpc/rest yanıtları izleme kaydına düşer (izlemeKaydi; yanıt değişmez).
function dilliFetch(girdi, ayar = {}) {
  try {
    const adres = typeof girdi === "string" ? girdi : girdi instanceof URL ? girdi.href : girdi?.url ?? "";
    if (adres.includes("/rest/v1/")) {
      const basliklar = new Headers(ayar.headers ?? (girdi instanceof Request ? girdi.headers : undefined));
      basliklar.set("x-arayuz-dil", aktifDil());
      return fetch(girdi, { ...ayar, headers: basliklar }).then(
        (yanit) => { if (!yanit.ok) supabaseHatasiKaydet(adres, yanit); return yanit; },
        (hata) => { supabaseHatasiKaydet(adres, hata); throw hata; },
      );
    }
  } catch { /* başlık eklenemezse istek olduğu gibi gider */ }
  return fetch(girdi, ayar);
}

export const supabase = supabaseHazir
  ? createClient(url, anonKey, {
    realtime: { params: { eventsPerSecond: 20 } },
    global: { fetch: dilliFetch },
    auth: { storage: typeof window !== "undefined" ? onYuklemeyiBekleyenDepo() : undefined },
  })
  : null;
