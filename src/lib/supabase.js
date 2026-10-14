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
// 1098 (14 Eki 2026): index.html ön yüklemesi ilk tur verisini `ana_sayfa_ozet` ile JS inerken çeker. Aynı adlı,
// argümansız RPC çağrısı bu yanıttan BİR KEZ karşılanır (PostgREST gövdesiyle aynı biçim); sonraki çağrılar,
// özette olmayan/hatalı anahtar, başka kullanıcı, 30 sn'den eski özet, sayım/argümanlı çağrı → normal ağ yolu.
const OZET_KAPSAM = {
  dm_okunmamis_sayim: "kabuk", posta_kutusu: "kabuk", coin_bakiyem: "kabuk", sezon_ozetim: "kabuk",
  bekleyen_davetlerim: "kabuk", bekleyen_sayim: "kabuk",
  avatar_nadirlik_renkleri: "ana", seri_durumum: "ana", sezon_yolu_durumum: "ana", gorevlerim: "ana", lig_grubum_ozet: "ana",
};
const OZET_OMUR_MS = 30000;
function ozettenYanit(adres, ayar) {
  const ad = /\/rest\/v1\/rpc\/([a-z0-9_]+)(?:\?|$)/.exec(adres)?.[1];
  const o = window.__qtOnYukleme?.ozet;
  const bekle = ad && OZET_KAPSAM[ad] ? o?.[OZET_KAPSAM[ad]] : null;
  if (!bekle || String(ayar.method ?? "GET").toUpperCase() !== "POST") return null;
  const govde = ayar.body == null ? "" : typeof ayar.body === "string" ? ayar.body.trim() : null;
  if (govde !== "" && govde !== "{}") return null;
  const basliklar = new Headers(ayar.headers);
  if ((basliklar.get("prefer") ?? "").includes("count")) return null;
  try {
    const jeton = (basliklar.get("authorization") ?? "").split(" ")[1]?.split(".")[1];
    const sub = jeton ? JSON.parse(atob(jeton.replace(/-/g, "+").replace(/_/g, "/"))).sub : null;
    if (!sub || sub !== window.__qtOnYukleme?.kimlik) return null;
  } catch { return null; }
  o.kullanildi ??= {};
  if (o.kullanildi[ad]) return null;
  o.kullanildi[ad] = true;
  const tek = (basliklar.get("accept") ?? "").includes("vnd.pgrst.object");
  return Promise.race([bekle, new Promise((coz) => setTimeout(() => coz(null), 9000))]).then((v) => {
    if (!v || typeof v !== "object" || Array.isArray(v) || !(ad in v) || Date.now() - o.an > OZET_OMUR_MS) return null;
    let deger = v[ad];
    if (tek) { if (!Array.isArray(deger) || deger.length !== 1) return null; deger = deger[0]; }
    return new Response(JSON.stringify(deger), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } });
  }, () => null);
}

function dilliFetch(girdi, ayar = {}) {
  try {
    const adres = typeof girdi === "string" ? girdi : girdi instanceof URL ? girdi.href : girdi?.url ?? "";
    if (adres.includes("/rest/v1/rpc/") && typeof window !== "undefined") {
      const hazir = ozettenYanit(adres, ayar);
      if (hazir) return hazir.then((y) => y ?? dilliFetch(girdi, ayar));
    }
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
