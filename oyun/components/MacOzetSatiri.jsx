import { useMemo } from "react";
import { tt } from "../lib/dil.js";
import { macOzetiHesapla, useMacSorulari } from "../lib/macSorulariVeri.js";
import { QtIkon } from "../tasarim/index.js";
import "../tasarim/ekranlar/mac-ozet-satiri.css";

/**
 * Maç sonu "Maç özeti" (Klasik / Saf Bilgi / Grup): tek satır — Doğru x/y · En uzun seri n.
 * Veri "Maçın soruları" ile aynı mac_sorulari yanıtından, istemcide hesaplanır (aynı kaynak tek sorgu).
 * Cevap süresi hiçbir kaynakta tutulmadığından (match_answers yalnız cevap/doğru/created_at) ortalama süre gösterilmez.
 * Düello özetiyle (D4Ozet) aynı görsel aile; MacSonuKutlama › modOzet yuvasına verilir.
 */
export default function MacOzetSatiri({ kaynak }) {
  const sorular = useMacSorulari(kaynak);
  const o = useMemo(() => macOzetiHesapla(sorular), [sorular]);
  if (!o) return null;
  return (
    <section className="mo-ozet" aria-label={tt("Maç özeti")}>
      <h3 className="mo-ozet-baslik"><QtIkon ad="onay" boyut={16} />{tt("MAÇ ÖZETİ")}</h3>
      <p className="mo-ozet-satir">
        <span className="mo-ozet-hap">{tt("Doğru {d}/{t}", { d: o.dogru, t: o.toplam })}</span>
        <span className="mo-ozet-hap">{tt("En uzun seri {n}", { n: o.enUzun })}</span>
      </p>
    </section>
  );
}
