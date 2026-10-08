import { supabase } from "../../src/lib/supabase.js";

/**
 * Kendi bildirimlerim (bildirimler INSERT) için TEK Realtime kanalı.
 *
 * NEDEN (Supabase Aşama 2, 8 Eki 2026): BildirimZili ve BildirimToast aynı süzgeçle iki ayrı kanal
 * açıyordu; ikisi de `user` NESNESİNE bağlı olduğu için oturum yenilemesinde kanallar yıkılıp yeniden
 * kuruluyordu. Artık kullanıcı başına tek kanal; dinleyiciler sayılır, son dinleyici çıkınca kapanır.
 *
 * bildirimDinle(uid, fn) → aboneliği bırakan fonksiyon döner.
 */
let kanal = null;
let kanalUid = null;
const dinleyiciler = new Set();
let kapatZaman = null;

function kanalKapat() {
  if (!kanal) return;
  const eski = kanal;
  kanal = null;
  kanalUid = null;
  try { supabase.removeChannel(eski); } catch (e) { console.warn("[Bildim] bildirim kanalı kapatılamadı:", e?.message ?? e); }
}

export function bildirimDinle(uid, fn) {
  if (!uid || typeof fn !== "function") return () => {};
  if (kanal && kanalUid !== uid) kanalKapat();   // hesap değişti
  dinleyiciler.add(fn);
  if (!kanal) {
    kanalUid = uid;
    try {
      kanal = supabase
        .channel("bildirimlerim")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bildirimler", filter: `user_id=eq.${uid}` },
          (yuk) => {
            for (const d of [...dinleyiciler]) {
              try { d(yuk); } catch (e) { console.error("[Bildim] bildirim dinleyicisi hatası:", e); }
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.error("[Bildim] bildirim kanalı kurulamadı:", e);
      kanal = null;
      kanalUid = null;
    }
  }
  clearTimeout(kapatZaman);
  return () => {
    dinleyiciler.delete(fn);
    // Kısa gecikme: yeniden bağlanan bileşen (StrictMode, sayfa geçişi) kanalı yıkıp kurdurmasın.
    if (!dinleyiciler.size) {
      clearTimeout(kapatZaman);
      kapatZaman = setTimeout(() => { if (!dinleyiciler.size) kanalKapat(); }, 1000);
    }
  };
}
