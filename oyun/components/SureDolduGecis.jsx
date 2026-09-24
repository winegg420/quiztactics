import { useEffect, useRef } from "react";
import PuanSayaci from "./PuanSayaci.jsx";
import { sesSureDoldu, sesKazandin, sesKaybettin, sesBeraberlik } from "../lib/ses.js";
import { titret } from "../lib/geriBildirim.js";
import { tt } from "../lib/dil.js";
import { QtIkon } from "../tasarim/index.js";
import "../tasarim/ekranlar/ikon-disk.css";
import "../tasarim/ekranlar/m1-sonuc.css";

/**
 * Maç/tur bitişinde araya giren 0.8 sn'lik geçiş ekranı.
 *
 * Neden: süre 0'a inince ekran donuk kalıp birkaç saniye sonra sonuç ekranına
 * atlıyordu; kullanıcı "dondu mu?" diye düşünüyordu. Bu perde bitişi
 * duyurup skoru sayarak boşluğu doldurur.
 *
 * baslik : "Süre doldu!" / "Maç bitti!" gibi
 * skor   : sayacın göstereceği değer (yoksa gizlenir)
 * skorEtiket : skorun altındaki açıklama
 * onBitti: perde kapanınca çağrılır (sonuç ekranına geçiş)
 * sure   : ms (varsayılan 800)
 */
export default function SureDolduGecis({
  baslik = tt("Süre doldu!"),
  skor = null,
  skorEtiket = tt("doğru"),
  onBitti,
  sure = 800,
  kazandi = false,
  // Maç kaybedildiyse alçalan iki nota. Verilmezse yalnız "süre doldu" sesi
  // çalar (hızlı mod gibi kazanan/kaybeden olmayan ekranlar için).
  kaybetti = false,
  // Ajan H: maç berabere bittiyse beraberlik sesi.
  berabere = false,
  // A.3: ardından maç sonu sahnesi (MacSonuKutlama) geliyorsa sonuç sesini o çalar — burada çalınmaz
  // (aynı ses üst üste gelmesin). Perde sessiz geçer.
  sessiz = false,
}) {
  // Ajan H: ebeveyn her render'da yeni onBitti verdiği için (satır içi ok fonksiyonu) etki her
  // render'da yeniden koşuyor, sonuç sesi 9 kez baştan çalıyor ve 0,8 sn'lik perde uzuyordu
  // (canlı Klasik testi). onBitti ref'te; ses ve zamanlayıcı perde başına BİR kez.
  const bittiRef = useRef(onBitti);
  bittiRef.current = onBitti;
  useEffect(() => {
    try {
      if (sessiz) {
        if (kazandi) titret([15, 30, 15]);
      } else if (kazandi) {
        sesKazandin();
        titret([15, 30, 15]);
      } else if (kaybetti) {
        sesKaybettin();
      } else if (berabere) {
        sesBeraberlik();
      } else {
        sesSureDoldu();
      }
    } catch {
      /* ses çalınamadı — geçiş yine de görünür */
    }
    const t = setTimeout(() => bittiRef.current?.(), sure);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sure]);

  return (
    <div className="m1-gecis" role="status" aria-live="polite">
      {/* Baykuş maskot kaldırıldı (Ida, 24 Eyl 2026) */}
      <span className={`qt-ikon-disk ${kazandi ? "qt-ikon-disk--sari" : "qt-ikon-disk--mavi"}`} style={{ "--_boy": "80px" }} aria-hidden="true">
        <QtIkon ad={kazandi ? "kupa" : "saat"} boyut={40} />
      </span>
      <div className="m1-gecis-baslik">{baslik}</div>
      {skor !== null && (
        <div className="m1-gecis-skor">
          <PuanSayaci deger={skor} sure={600} />
          <span>{skorEtiket}</span>
        </div>
      )}
    </div>
  );
}
