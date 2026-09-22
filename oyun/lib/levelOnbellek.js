import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";

// P2A — Başka oyuncuların level'i (rütbe rozeti için).
// Sıralama tablosu, oyuncu kartı, karşılaşma sahnesi gibi yerlerde rakibin verisi farklı
// RPC'lerden gelir; hepsine alan eklemek yerine rozet level'i `profiles.level`'dan
// (yalnız bu kolon istemciye açık) toplu okur. Aynı anda istenen id'ler tek istekte gider;
// sonuç sayfa ömrünce önbellekte kalır (level yalnız artar, birkaç dakikalık eskime zararsız).

const onbellek = new Map();          // id → level
const bekleyen = new Map();          // id → [çözücüler]
let zamanlayici = null;

async function topluOku() {
  zamanlayici = null;
  const idler = [...bekleyen.keys()];
  const cozuculer = new Map(bekleyen);
  bekleyen.clear();
  let sonuc = {};
  try {
    const { data, error } = await supabase.from("profiles").select("id, level").in("id", idler);
    if (error) throw error;
    for (const r of data ?? []) sonuc[r.id] = Number(r.level) || 1;
  } catch (e) {
    // Sunucu alanı henüz yoksa ya da ağ hatası: rozet Level 1 (Çaylak) gösterir, sayfa bozulmaz.
    console.warn("[Bildim] level okunamadı:", e?.message ?? e);
    sonuc = {};
  }
  for (const id of idler) {
    const l = sonuc[id] ?? 1;
    if (id in sonuc) onbellek.set(id, l);
    for (const coz of cozuculer.get(id) ?? []) coz(l);
  }
}

function levelIste(id) {
  if (onbellek.has(id)) return Promise.resolve(onbellek.get(id));
  return new Promise((coz) => {
    const liste = bekleyen.get(id) ?? [];
    liste.push(coz);
    bekleyen.set(id, liste);
    if (!zamanlayici) zamanlayici = setTimeout(topluOku, 30);
  });
}

/** Level'i bilinen bir oyuncu için (profilim) önbelleği tazeler. */
export function levelBildir(id, level) {
  if (id && level != null) onbellek.set(id, Number(level) || 1);
}

/**
 * Bir oyuncunun level'i. `verilen` (veride zaten level varsa) önceliklidir; yoksa `userId`
 * ile toplu okunur. İkisi de yoksa 1.
 */
export function useLevel(userId, verilen) {
  const [level, setLevel] = useState(() =>
    verilen != null ? Number(verilen) || 1 : (userId && onbellek.get(userId)) || null
  );
  useEffect(() => {
    if (verilen != null) { setLevel(Number(verilen) || 1); return undefined; }
    if (!userId) { setLevel(null); return undefined; }
    let aktif = true;
    levelIste(userId).then((l) => { if (aktif) setLevel(l); });
    return () => { aktif = false; };
  }, [userId, verilen]);
  return level;
}
