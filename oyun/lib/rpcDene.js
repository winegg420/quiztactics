import { supabase } from "../../src/lib/supabase.js";

/**
 * Sonucu beklenmeyen ya da hatası oyuncuya gösterilmeyen RPC çağrıları için.
 *
 * supabase-js hata olunca promise'i REDDETMEZ; `{ data, error }` döndürür. Bu yüzden
 * `.rpc(...).catch(() => {})` / `.then(() => {}, () => {})` hatayı hiç görmez —
 * sessizce yutar (Paket 2 · Faz 3). Burada `error` alanı da ağ istisnası da yakalanır
 * ve konsola yazılır; çağıran `{ data, error }` ile devam eder, hiçbir zaman reddedilmez.
 *
 * @param {string} ad     RPC adı
 * @param {object} [params]
 * @returns {Promise<{ data: any, error: any }>}
 */
export async function rpcDene(ad, params) {
  try {
    const { data, error } = await supabase.rpc(ad, params);
    if (error) console.error(`[Bildim] ${ad} başarısız:`, error.message ?? error);
    return { data: error ? null : data, error: error ?? null };
  } catch (e) {
    console.error(`[Bildim] ${ad} çağrılamadı:`, e?.message ?? e);
    return { data: null, error: e };
  }
}
