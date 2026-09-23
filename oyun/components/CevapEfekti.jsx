import { hareketAzalt } from "../lib/geriBildirim.js";
import { tt } from "../lib/dil.js";
import "../tasarim/ekranlar/m1-mac.css";

/**
 * Cevap sonrası görsel geri bildirim katmanı.
 * Beş oyun ekranında da aynı bileşen kullanılır (kopyalanmaz).
 *
 * dogru : cevap doğru muydu
 * puan  : kazanılan puan (yoksa/0 ise uçan rozet çizilmez)
 * seri  : üst üste doğru sayısı (>=3 ise bant görünür)
 *
 * prefers-reduced-motion açıksa hareket yok, yalnız durağan gösterim kalır.
 */
export default function CevapEfekti({ dogru, puan, seri }) {
  const azalt = hareketAzalt();
  const puanVar = dogru && puan > 0;
  const seriVar = dogru && seri >= 3;
  if (!puanVar && !seriVar) return null;

  return (
    // Azaltılmış hareket: m1-mac.css @media (prefers-reduced-motion) yalnız solma bırakır.
    <div className="m1-efekt" aria-hidden="true" data-azalt={azalt || undefined}>
      {puanVar && <div className="m1-puan-ucus">+{puan}</div>}
      {seriVar && <div className="m1-seri">{tt("{0} üst üste!", { 0: seri })}</div>}
    </div>
  );
}
