import { useMemo } from "react";
import { tt } from "../lib/dil.js";
import { macOzetiHesapla, useMacSorulari } from "../lib/macSorulariVeri.js";
import { QtIkon } from "../tasarim/index.js";
import { ortCevapMetni } from "./OrtCevapSatiri.jsx";
import "../tasarim/ekranlar/mac-ozet-satiri.css";

/**
 * Maç sonu "Maç özeti" (Klasik / Saf Bilgi / Grup): tek satır — Doğru x/y · En uzun seri n.
 * Veri "Maçın soruları" ile aynı mac_sorulari yanıtından, istemcide hesaplanır (aynı kaynak tek sorgu).
 * 1062: ortCevap verilirse (Klasik/Saf Bilgi — mac_sonu_ozet › ort_cevap) yanına "Ort. cevap 6,2 sn · rakip 8,1 sn" hapı.
 * Grup ortCevap vermez → aynen. Veri yoksa (1062 öncesi maç) hap çizilmez.
 * Düello özetiyle (D4Ozet) aynı görsel aile; MacSonuKutlama › modOzet yuvasına verilir.
 */
export default function MacOzetSatiri({ kaynak, ortCevap = null }) {
  const sorular = useMacSorulari(kaynak);
  const o = useMemo(() => macOzetiHesapla(sorular), [sorular]);
  const ort = ortCevapMetni(ortCevap);
  if (!o && !ort) return null;
  return (
    <section className="mo-ozet" aria-label={tt("Maç özeti")}>
      <h3 className="mo-ozet-baslik"><QtIkon ad="onay" boyut={16} />{tt("MAÇ ÖZETİ")}</h3>
      <p className="mo-ozet-satir">
        {o && <span className="mo-ozet-hap">{tt("Doğru {d}/{t}", { d: o.dogru, t: o.toplam })}</span>}
        {o && <span className="mo-ozet-hap">{tt("En uzun seri {n}", { n: o.enUzun })}</span>}
        {ort && <span className="mo-ozet-hap" aria-label={`${tt("Ortalama cevap süresi")}: ${ort}`}>{ort}</span>}
      </p>
    </section>
  );
}
