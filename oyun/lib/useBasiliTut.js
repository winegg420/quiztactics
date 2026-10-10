// Basılı tut (3 sn) → doğru şık. Bütün cevap ekranlarının ortak kancası.
//
// Kapı sunucudadır: soru RPC'leri `dogru_cevap`ı yalnız hileli_mi() (profiles.hile_yetkisi)
// hesabına verir, normal oyuncuda alan null gelir. dogruCevap null ise kanca şıklara hiçbir
// şey eklemez (sınıf da, olay da yok) — ekran normal oyuncu için birebir aynı kalır.
//
// Tetiklenince modun NORMAL cevap fonksiyonu (onTetik) çağrılır; puan, süre, seri, kayıt
// o fonksiyonun yolundan geçer. Parmak kalkar / kayar / iptal olur, ekran cevap almaz hâle
// gelir (etkin=false) ya da soru değişirse sayaç iptal. Aynı soruda (anahtar) ikinci tetik yok.
import { useCallback, useEffect, useRef, useState } from "react";

export const BASILI_TUT_MS = 3000;
const KAYMA_PX = 12;

export function useBasiliTut({ dogruCevap, etkin, anahtar, onTetik }) {
  const ozellikVar = dogruCevap !== null && dogruCevap !== undefined;
  const [basiliSik, setBasiliSik] = useState(null);
  const zamanlayici = useRef(null);
  const baslangic = useRef(null);
  const tetiklenen = useRef(null);
  const tikYut = useRef(false);
  const guncel = useRef(null);
  guncel.current = { dogruCevap, etkin, anahtar, onTetik };

  const iptal = useCallback(() => {
    clearTimeout(zamanlayici.current);
    zamanlayici.current = null;
    baslangic.current = null;
    setBasiliSik(null);
  }, []);

  // Soru değişince ya da ekran kapanınca sayaç düşer.
  useEffect(() => { tikYut.current = false; return iptal; }, [anahtar, iptal]);
  useEffect(() => { if (!etkin || !ozellikVar) iptal(); }, [etkin, ozellikVar, iptal]);

  const basla = (i, e) => {
    tikYut.current = false;
    const g = guncel.current;
    if (g.dogruCevap === null || g.dogruCevap === undefined || !g.etkin || tetiklenen.current === g.anahtar) return;
    if (e && e.pointerType === "mouse" && e.button !== 0) return;
    clearTimeout(zamanlayici.current);
    baslangic.current = e ? { x: e.clientX, y: e.clientY } : null;
    setBasiliSik(i);
    const a = g.anahtar;
    zamanlayici.current = setTimeout(() => {
      zamanlayici.current = null;
      baslangic.current = null;
      setBasiliSik(null);
      const s = guncel.current;
      if (s.anahtar !== a || !s.etkin || s.dogruCevap === null || s.dogruCevap === undefined || tetiklenen.current === a) return;
      tetiklenen.current = a;
      tikYut.current = true;   // parmak kalkınca gelen tıklama tutulan şıkkı cevaplamasın
      s.onTetik(Number(s.dogruCevap));
    }, BASILI_TUT_MS);
  };

  const kay = (e) => {
    const b = baslangic.current;
    if (b && Math.hypot(e.clientX - b.x, e.clientY - b.y) > KAYMA_PX) iptal();
  };

  /** Şık düğmesine yayılacak özellikler; className verilirse birleştirilir. */
  const sikProps = (i, className) => {
    if (!ozellikVar) return className ? { className } : {};
    return {
      className: [className, "qt-sik--tutulur", basiliSik === i && etkin && "qt-sik--basili"].filter(Boolean).join(" "),
      onContextMenu: (e) => e.preventDefault(),
      onClickCapture: (e) => { if (tikYut.current) { tikYut.current = false; e.preventDefault(); e.stopPropagation(); } },
      onPointerDown: (e) => basla(i, e),
      onPointerMove: kay,
      onPointerUp: iptal,
      onPointerLeave: iptal,
      onPointerCancel: iptal,
    };
  };

  return { sikProps, basiliSik, ozellikVar, iptal };
}

/**
 * Erken dönüşü olan sayfalarda kancayı kural dışı çağırmamak için ince sarmalayıcı:
 * <BasiliTut dogruCevap etkin anahtar onTetik>{(bt) => …bt.sikProps(i)…}</BasiliTut>
 */
export function BasiliTut({ children, ...ayar }) {
  return children(useBasiliTut(ayar));
}
