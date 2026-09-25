/**
 * UNVAN YAZISI — isim altında duran kazanılan yazı, "Kurdele" görünümü (Ida seçimi 25 Eyl 2026, Bölüm 5 Stil 1).
 * Açık tonlu küçük kurdele, kalın lacivert kontur, çatal uçlar tür renginde; solda tür simgesi (şehir: iğne + taç ·
 * lig: defne + yıldız · sezon: bayrak · başarı: madalya). Yazı her zaman lacivert (kontrast ≥ 7). Uzun unvan tek
 * satır, sığmazsa "…" (taşma yok). Simge önizlemedeki adayla aynı kaynaktan (gorsel-revizyon/b/cizim/unvan.jsx).
 *
 * <UnvanYazisi unvan={kart.unvan} boy="k" />   — unvan oyuncu_kartlari.unvan (null → hiçbir şey çizmez)
 */
import { UnvanSimge, UNVAN_TURLERI } from "../tasarim/gorsel-revizyon/b/cizim/unvan.jsx";
import { METAL } from "../tasarim/gorsel-revizyon/palet.js";
import { unvanMetni } from "../lib/unvan.js";
import "../tasarim/ekranlar/unvan.css";

/** boy: "k" (liste, maç şeridi) · "o" (kart) · "b" (profil başı). */
export default function UnvanYazisi({ unvan, metin, tur, boy = "o", className = "" }) {
  const yazi = metin ?? unvanMetni(unvan);
  if (!yazi) return null;
  const t = tur ?? unvan?.tur ?? "basari";
  const r = UNVAN_TURLERI[t]?.r ?? METAL.gumus;
  return (
    <span className={`qt-unvan qt-unvan--${boy} ${className}`.trim()} title={yazi}
          style={{ "--u-a": r.acik, "--u-o": r.orta, "--u-k": r.koyu }}>
      <UnvanSimge tur={t} boyut={boy === "k" ? 12 : boy === "b" ? 16 : 14} />
      <span className="qt-unvan-metin">{yazi}</span>
    </span>
  );
}
