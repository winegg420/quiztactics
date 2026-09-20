// ============================================================
// SORU ÇEKME — PES ETMEYEN İSTEK (20 Eylül 2026)
//
// SORUN: Klasik, Grup ve Turnuva ekranlarının üçü de sorunun kendisini tek
// seferlik bir `.then` ile çekiyordu:
//
//     supabase.rpc("get_match_question", …).then(({ data, error }) => {
//       if (error) { console.error(…); return; }   // ← bir daha DENENMEZ
//       if (data?.[0]) setSoru(data[0]);           // ← boş dönerse de sessiz
//     });
//
// İstek ağ dalgalanmasında hata verirse ya da boş dönerse `soru` null kalıyor
// ve effect bir daha çalışmıyordu (bağımlılıkları değişmediği için). Ekranda
// soru hiç belirmiyor, sayaç da yok: oyuncu "soru takıldı" diyor. Sahibi bunu
// canlıda yaşadı.
//
// ÇÖZÜM: üstel geri çekilmeli yeniden deneme + hepsi biterse `onVazgecti`,
// böylece ekran "Tekrar dene" gösterebilir — sessizce donmaz.
//
// Kullanım (effect içinde):
//   const durdur = soruCek({
//     rpcAdi: "get_match_question",
//     param: { p_match_id: mac.id },
//     onSoru: setSoru,
//     onVazgecti: () => setSoruHatasi(true),
//   });
//   return () => durdur();
// ============================================================
import { supabase } from "../../src/lib/supabase.js";
import { zamanAsimiyla } from "./gorunurluk.js";

/**
 * @param {object} p
 * @param {string} p.rpcAdi          "get_match_question" | "get_group_match_question" | "get_tournament_question"
 * @param {object} p.param           RPC parametreleri
 * @param {(soru:object)=>void} p.onSoru
 * @param {(hata:Error)=>void} [p.onVazgecti]  bütün denemeler bitti
 * @param {number} [p.enFazlaDeneme]
 * @param {number} [p.ilkGecikmeMs]
 * @returns {() => void} iptal fonksiyonu
 */
export function soruCek({
  rpcAdi,
  param,
  onSoru,
  onVazgecti,
  enFazlaDeneme = 5,
  ilkGecikmeMs = 900,
}) {
  let iptal = false;
  let zamanlayici = null;

  const dene = async (n) => {
    if (iptal) return;
    try {
      // Sekme arka plandayken açılan RPC'nin soketi kopabiliyor ve istek ne
      // çözülüyor ne reddediliyor (bkz. mac_soruyu_atla'daki aynı tuzak).
      const { data, error } = await zamanAsimiyla(
        supabase.rpc(rpcAdi, param),
        10000,
        rpcAdi
      );
      if (iptal) return;
      if (error) throw error;
      const s = Array.isArray(data) ? data[0] : data;
      if (!s) throw new Error("boş yanıt");
      onSoru(s);
    } catch (e) {
      if (iptal) return;
      console.warn(
        `[Bildim] ${rpcAdi} başarısız (deneme ${n + 1}/${enFazlaDeneme}):`,
        e?.message ?? e
      );
      if (n + 1 >= enFazlaDeneme) {
        onVazgecti?.(e instanceof Error ? e : new Error(String(e)));
        return;
      }
      // 0,9 · 1,8 · 2,7 · 3,6 sn — dördüncüden sonra sabit kalır
      zamanlayici = setTimeout(() => dene(n + 1), ilkGecikmeMs * Math.min(n + 1, 4));
    }
  };

  dene(0);
  return () => {
    iptal = true;
    clearTimeout(zamanlayici);
  };
}
