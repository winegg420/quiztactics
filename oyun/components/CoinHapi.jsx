// Üst çubuktaki coin hapı. Dokununca dükkânın Coin sekmesine götürür.
// Bakiye gelene kadar hiç çizilmez (migration uygulanmadan boş hap durmasın).
import { Link } from "react-router-dom";
import Ikon from "./Ikon.jsx";
import SayanSayi from "./SayanSayi.jsx";
import { useCoin } from "../lib/coin.js";
import { tt } from "../lib/dil.js";
import { y } from "../lib/yol.js";

const binlik = (n) => n.toLocaleString("tr-TR");

export default function CoinHapi() {
  const { bakiye } = useCoin();
  if (bakiye === null) return null;
  return (
    <Link to={y("/joker?sekme=coin")} className="bd-coin-hap coin-pill" aria-label={`${bakiye} ${tt("coin")}`}>
      <Ikon ad="coin" boyut={15} />
      {/* Paket 36: maç sonu coin uçuşu bitince bakiye sayarak yeni değerine geçer */}
      <SayanSayi deger={bakiye} sure={500} bicim={binlik} />
    </Link>
  );
}
