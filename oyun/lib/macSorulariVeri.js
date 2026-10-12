import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";

// Maç sonu soru listesi (mac_sorulari RPC) — "Maçın soruları" (MacSorulari) ve "Maç özeti" (MacOzetSatiri)
// aynı veriyi okur; aynı kaynak için tek sorgu atılır (söz önbelleği). Hata/boş yanıt önbellekte tutulmaz.
const onbellek = new Map();

export function macSorulariGetir(kaynak) {
  if (!kaynak) return Promise.resolve(null);
  if (!onbellek.has(kaynak)) {
    const soz = (async () => {
      try {
        const { data, error } = await supabase.rpc("mac_sorulari", { p_kaynak: kaynak });
        if (error) throw error;
        const liste = Array.isArray(data) ? data : [];
        if (!liste.length) onbellek.delete(kaynak);
        return liste;
      } catch (e) {
        onbellek.delete(kaynak);
        console.error("[Bildim] mac_sorulari başarısız:", e);
        return null;
      }
    })();
    onbellek.set(kaynak, soz);
  }
  return onbellek.get(kaynak);
}

/** kaynak → soru listesi (yüklenene dek ya da hatada null). */
export function useMacSorulari(kaynak) {
  const [liste, setListe] = useState(null);
  useEffect(() => {
    if (!kaynak) return undefined;
    let aktif = true;
    macSorulariGetir(kaynak).then((l) => { if (aktif) setListe(l); });
    return () => { aktif = false; };
  }, [kaynak]);
  return liste;
}

/** Doğru sayısı, soru sayısı ve en uzun doğru serisi. Cevaplanmayan/süre dolan soru seriyi böler. */
export function macOzetiHesapla(sorular) {
  if (!Array.isArray(sorular) || !sorular.length) return null;
  const sirali = [...sorular].sort((a, b) => Number(a.sira) - Number(b.sira));
  let dogru = 0;
  let seri = 0;
  let enUzun = 0;
  for (const s of sirali) {
    const ok = Boolean(s.ben_cevapladim) && s.benim_cevap != null && s.benim_cevap >= 0 && s.benim_cevap === s.dogru_cevap;
    if (ok) { dogru++; seri++; enUzun = Math.max(enUzun, seri); } else seri = 0;
  }
  return { dogru, toplam: sirali.length, enUzun };
}
