import Ikon from "./Ikon.jsx";

const IKON = {
  elli: "terazi",
  sure: "saat",
  soru_degistir: "yenile",
  zaman_baskisi: "hizli",
  sigorta: "sigorta",
  cifte_puan: "cifte",
  ikinci_sans: "ikinciSans",
  seri_koruma: "kalkan",
};

/** Dükkân için dış görsele bağlı olmayan, ortak oyun diliyle çizilmiş skill vitrini. */
export default function SkillGorseli({ tur = "paket", icerik = null, kucuk = false }) {
  if (tur === "paket") {
    const turler = Object.keys(icerik ?? {}).filter((x) => IKON[x]).slice(0, 3);
    return (
      <span className={`bd-skill-gorsel paket${kucuk ? " kucuk" : ""}`} aria-hidden="true">
        <span className="bd-skill-sandik"><span /></span>
        <span className="bd-skill-kartlar">
          {(turler.length ? turler : ["elli", "sure", "soru_degistir"]).map((x) => (
            <i key={x} data-tur={x}><Ikon ad={IKON[x]} boyut={14} /></i>
          ))}
        </span>
      </span>
    );
  }

  return (
    <span className={`bd-skill-gorsel tek ${kucuk ? "kucuk" : ""}`} data-tur={tur} aria-hidden="true">
      <span className="bd-skill-parilti" />
      <Ikon ad={IKON[tur] ?? "yildiz"} boyut={kucuk ? 19 : 25} />
    </span>
  );
}
