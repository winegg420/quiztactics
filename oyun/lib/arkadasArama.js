// Arkadaşlar › takma adla arama (1075 `arkadas_ara`). Kurallar sunucuda: ≥3 karakter, ≤20 sonuç,
// engelli/bot/araç hesabı/kendisi görünmez, dakikada 20 arama. İstemci de 3 karakterden azında istek atmaz.
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { hataMesaji } from "./hata.js";
import { tt } from "./dil.js";

export const ARAMA_EN_AZ = 3;
const BEKLEME_MS = 400;

/** Yazmayı bekleyip (debounce) arar. Döner: { sonuclar, durum: bos|kisa|araniyor|hazir|hata, hata, guncelle } */
export function useArkadasArama(metin) {
  const [sonuclar, setSonuclar] = useState([]);
  const [durum, setDurum] = useState("bos");
  const [hata, setHata] = useState(null);
  const sira = useRef(0);   // eski yanıt yenisinin üstüne yazmasın

  useEffect(() => {
    const temiz = (metin ?? "").trim();
    const no = ++sira.current;
    if (!temiz) { setSonuclar([]); setDurum("bos"); setHata(null); return undefined; }
    if (temiz.length < ARAMA_EN_AZ) { setSonuclar([]); setDurum("kisa"); setHata(null); return undefined; }
    setDurum("araniyor");
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("arkadas_ara", { p_metin: temiz.slice(0, 30) });
        if (error) throw error;
        if (no !== sira.current) return;
        setSonuclar(Array.isArray(data) ? data : []);
        setHata(null);
        setDurum("hazir");
      } catch (e) {
        if (no !== sira.current) return;
        console.error("[Bildim] arkadaş araması başarısız:", e?.message ?? e);
        setSonuclar([]);
        setHata(hataMesaji(e, tt("Arama yapılamadı.")));
        setDurum("hata");
      }
    }, BEKLEME_MS);
    return () => clearTimeout(t);
  }, [metin]);

  /** İstek gönderilince satırın durumunu yerinde güncelle (yeniden arama yok). */
  const guncelle = (id, yeniDurum) => setSonuclar((l) => l.map((s) => (s.id === id ? { ...s, durum: yeniDurum } : s)));
  return { sonuclar, durum, hata, guncelle };
}
