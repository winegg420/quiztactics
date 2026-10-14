import { supabase } from "../../src/lib/supabase.js";
import { tt } from "./dil.js";
import { iosMu, uygulamaIcindeMi } from "../../src/lib/uygulamaKipi.js";

const VAPID_PUBLIC_KEY =
  "BN2ichsTrBQyCJNpGwkT-ygB4tW05ioy7IoYzNlpi5CL2Yw85wjyKad4GMp6U3wyIOdN35ar2uTMB3FTAopETuQ";

function base64UrlToUint8Array(base64Url) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const ham = atob(base64);
  return Uint8Array.from([...ham].map((c) => c.charCodeAt(0)));
}

export function pushDestekleniyor() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** iPhone/iPad Safari sekmesi (ana ekrana eklenmemiş): Apple web push'u yalnız ana ekran uygulamasına veriyor. */
export function iosSekmesi() {
  // Ölçüm tek yerde: src/lib/uygulamaKipi.js
  return iosMu() && !uygulamaIcindeMi();
}

export async function pushDurumu() {
  if (!pushDestekleniyor()) return "desteklenmiyor";
  if (Notification.permission === "denied") return "engelli";
  const kayit = await navigator.serviceWorker.ready;
  const abone = await kayit.pushManager.getSubscription();
  return abone ? "acik" : "kapali";
}

export async function bildirimleriAc() {
  if (!pushDestekleniyor()) throw new Error(tt("Bu tarayıcı bildirimleri desteklemiyor."));
  const izin = await Notification.requestPermission();
  if (izin !== "granted") throw new Error(tt("Bildirim izni verilmedi."));
  const kayit = await navigator.serviceWorker.ready;
  let abone = await kayit.pushManager.getSubscription();
  // Eski VAPID anahtarıyla açılmış abonelik yeni sunucu anahtarıyla çalışmaz: yenile.
  if (abone && !anahtarUyumlu(abone)) {
    try {
      await supabase.rpc("remove_push_subscription", { p_endpoint: abone.endpoint });
    } catch (e) {
      console.warn("[Bildim] eski abonelik sunucudan silinemedi:", e?.message ?? e);
    }
    await abone.unsubscribe();
    abone = null;
  }
  if (!abone) {
    abone = await kayit.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  let { error } = await aboneligiKaydet(abone);
  // Aynı cihazda önce başka hesap bildirim açmışsa sunucu o adresi devretmez:
  // tarayıcı aboneliğini yenile (yeni adres) ve onu kaydet.
  if (error && String(error.message ?? "").includes("başka bir hesaba")) {
    await abone.unsubscribe();
    abone = await kayit.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY),
    });
    ({ error } = await aboneligiKaydet(abone));
  }
  if (error) throw error;
}

function anahtarUyumlu(abone) {
  try {
    const mevcut = abone.options?.applicationServerKey;
    if (!mevcut) return true;
    const beklenen = base64UrlToUint8Array(VAPID_PUBLIC_KEY);
    const m = new Uint8Array(mevcut);
    return m.length === beklenen.length && m.every((b, i) => b === beklenen[i]);
  } catch (e) {
    console.warn("[Bildim] abonelik anahtarı denetlenemedi:", e?.message ?? e);
    return true;
  }
}

function aboneligiKaydet(abone) {
  const j = abone.toJSON();
  return supabase.rpc("save_push_subscription", {
    p_endpoint: abone.endpoint,
    p_p256dh: j.keys.p256dh,
    p_auth: j.keys.auth,
  });
}

export async function bildirimleriKapat() {
  const kayit = await navigator.serviceWorker.ready;
  const abone = await kayit.pushManager.getSubscription();
  if (abone) {
    const { error } = await supabase.rpc("remove_push_subscription", { p_endpoint: abone.endpoint });
    if (error) console.error("[Bildim] push aboneliği sunucudan silinemedi:", error);
    await abone.unsubscribe();
  }
}
