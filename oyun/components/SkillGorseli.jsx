import { QtIkon } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-sonuc.css";

// Skill id → QtIkon adı (jokerler.js ikonlarıyla aynı çizgi).
const IKON = {
  elli: "yariyari",
  sure: "ekSure",
  soru_degistir: "degistir",
  zaman_baskisi: "baski",
  sigorta: "sigorta",
  cifte_puan: "ikiKat",
  ikinci_sans: "ikinciSans",
  seri_koruma: "kalkan",
};

/**
 * Dükkân için dış görsele bağlı olmayan, ortak oyun diliyle çizilmiş skill vitrini.
 * Tasarım A (Şerit M1): mor kabartmalı rozet; paket = üç küçük skill rozeti yan yana.
 * Prop arayüzü aynı: tur ("paket" | skill id) · icerik (paket içeriği) · kucuk.
 */
export default function SkillGorseli({ tur = "paket", icerik = null, kucuk = false }) {
  if (tur === "paket") {
    const turler = Object.keys(icerik ?? {}).filter((x) => IKON[x]).slice(0, 3);
    return (
      <span className={`m1-sg m1-sg--paket${kucuk ? " m1-sg--kucuk" : ""}`} aria-hidden="true">
        {(turler.length ? turler : ["elli", "sure", "soru_degistir"]).map((x) => (
          <span key={x} className="m1-sg-mini"><QtIkon ad={IKON[x]} boyut={kucuk ? 14 : 16} /></span>
        ))}
      </span>
    );
  }

  return (
    <span className={`m1-sg m1-sg--tek${kucuk ? " m1-sg--kucuk" : ""}`} aria-hidden="true">
      <QtIkon ad={IKON[tur] ?? "yildiz"} boyut={kucuk ? 20 : 28} />
    </span>
  );
}
