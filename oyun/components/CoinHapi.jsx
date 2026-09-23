// Üst çubuktaki coin hapı (Yön A: QtCoinHapi). Dokununca dükkânın Coin sekmesine götürür.
// Bakiye gelene kadar hiç çizilmez (migration uygulanmadan boş hap durmasın).
// `bd-coin-hap` EK sınıfı: MacSonuSahnesi coin uçuşunun hedefini bu sınıfla buluyor.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { QtCoinHapi, sayiBicim } from "../tasarim/index.js";
import { useCoin } from "../lib/coin.js";
import { tt } from "../lib/dil.js";
import { y } from "../lib/yol.js";

// Paket 36: maç sonu coin uçuşu bitince bakiye sayarak yeni değerine geçer
// (SayanSayi ile aynı eğri; azaltılmış harekette anında yazar).
function useSayanDeger(deger, sure = 500) {
  const [gosterilen, setGosterilen] = useState(deger);
  const onceki = useRef(deger);
  const cerceve = useRef(0);
  useEffect(() => {
    const bas = onceki.current;
    onceki.current = deger;
    if (bas === deger || bas == null || deger == null) { setGosterilen(deger); return undefined; }
    let azalt = false;
    try { azalt = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* matchMedia yok */ }
    if (azalt) { setGosterilen(deger); return undefined; }
    const t0 = performance.now();
    const adim = (simdi) => {
      const o = Math.min(1, (simdi - t0) / sure);
      const e = 1 - Math.pow(1 - o, 3);
      setGosterilen(Math.round(bas + (deger - bas) * e));
      if (o < 1) cerceve.current = requestAnimationFrame(adim);
    };
    cerceve.current = requestAnimationFrame(adim);
    return () => cancelAnimationFrame(cerceve.current);
  }, [deger, sure]);
  return gosterilen;
}

export default function CoinHapi() {
  const { bakiye } = useCoin();
  const gosterilen = useSayanDeger(bakiye);
  if (bakiye === null) return null;
  return (
    <QtCoinHapi
      as={Link}
      to={y("/joker?sekme=coin")}
      miktar={gosterilen ?? bakiye}
      etiket={tt("{n} coin — dükkâna git", { n: sayiBicim(bakiye) })}
      className="bd-coin-hap a-coin-hap"
    />
  );
}
