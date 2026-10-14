// İlk maç rehberi — ortak mantık (Düello 1093'te doğdu, Hazine 1094 aynı kalıbı kullanır).
// Sunucu oyuncunun rehber maçını bilir (profiles.<mod>_rehber_mac → durum yanıtında `rehber: true`); istemci yalnız o maçta,
// her "an" için BİR kez kısa balon gösterir. "Geç" rehberin kalanını kapatır. Görülenler localStorage `<önek>_rehber:<maç>`
// (yenilemede tekrar çıkmaz; gizli sekmede yalnız bellekte). Balon akışa/sayaca dokunmaz.
import { useEffect, useRef, useState } from "react";

export const REHBER_MS = 5000;   // balon en çok bu kadar görünür; an değişince de kalkar

const anahtar = (onek, id) => `${onek}_rehber:${id}`;
function kaydiOku(onek, id) {
  try { const x = JSON.parse(localStorage.getItem(anahtar(onek, id)) || "null"); return { goruldu: new Set(x?.g ?? []), gec: Boolean(x?.gec) }; }
  catch { return { goruldu: new Set(), gec: false }; }
}
function kaydiYaz(onek, id, r) {
  try { localStorage.setItem(anahtar(onek, id), JSON.stringify({ g: [...r.goruldu], gec: r.gec })); } catch { /* gizli sekme: yalnız bellekte */ }
}

/**
 * onek: "d4" (Düello) · "ks" (Hazine) — localStorage anahtarı. macId: maç. aday: şu anki an anahtarı ya da null
 * (rehber maçı değilse çağıran null verir). Dönüş: { rehber (görünen an | null), gec() }.
 */
export function useIlkMacRehberi(onek, macId, aday, sureMs = REHBER_MS) {
  const ref = useRef(null);
  if (ref.current === null || ref.current.id !== macId) ref.current = { id: macId, ...kaydiOku(onek, macId) };
  const [rehber, setRehber] = useState(null);
  useEffect(() => {
    const r = ref.current;
    if (!aday) { setRehber(null); return; }
    if (r.gec || r.goruldu.has(aday)) return;
    r.goruldu.add(aday);
    kaydiYaz(onek, macId, r);
    setRehber(aday);
  }, [aday]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!rehber) return undefined;
    const t = setTimeout(() => setRehber(null), sureMs);
    return () => clearTimeout(t);
  }, [rehber, sureMs]);
  const gec = () => { const r = ref.current; r.gec = true; kaydiYaz(onek, macId, r); setRehber(null); };
  return { rehber, gec };
}
