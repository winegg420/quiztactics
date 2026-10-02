/**
 * JOKER SEMBOLLERİ (64×64) — yeni çizim, TEK KAYNAK. Disk 64×64 viewBox'ta (yüz merkezi 32,31.5 · r 27);
 * sembol diskin içine doğrudan SVG olarak çizilir. Kullananlar: gorsel-revizyon/a/cizim/joker.jsx › JokerIkon
 * (önizleme diski) ve SkillRozeti.jsx (oyundaki CSS diski). soru_degistir ve kalkan burada YOK: onlar
 * skillSembolleri.jsx'teki Phosphor sembolüyle kalır.
 * Renk jetonları: E kontur/koyu · A açık · O orta · G altın · W beyaz (çağıran verir).
 */
/** Düello rol jokerlerinin RENGİ — TEK KAYNAK (oyundaki SkillRozeti ve stil rehberi JokerIkon aynı değeri okur).
 *  Baskın turuncu, Kalkan açık yeşil (Ida kararı, 2 Eki 2026). Değerler tokenlar.css › --qt-skill-baskin/kalkan ile aynı. */
export const ROL_RENK = {
  baskin: { acik: "#ffb47a", orta: "#ff7a2e", koyu: "#b34a00", kenar: "#4e2813" },
  kalkan: { acik: "#c6ee7c", orta: "#8fd11f", koyu: "#4c7a0a", kenar: "#253c17" },
};

export const YENI_CIZIM = new Set(["elli", "sure", "zaman_baskisi", "ikinci_sans", "sigorta", "cifte_puan", "baskin"]);

const YILDIZ = (() => {
  const p = [];
  for (let i = 0; i < 24; i += 1) {
    const r = i % 2 ? 15.2 : 18.5;
    const a = (Math.PI * i) / 12 - Math.PI / 2;
    p.push(`${(32 + r * Math.cos(a)).toFixed(2)},${(32 + r * Math.sin(a)).toFixed(2)}`);
  }
  return p.join(" ");
})();

/** `k` = küçük boyut (≤32 px): ince detaylar çıkar, kontur ×1,25. */
export function JokerCizim({ tur, E, A, O, G = "#ffd23a", W = "#fff", k = false }) {
  const c = k ? 1.25 : 1;
  const S = (w) => ({ stroke: E, strokeWidth: w * c });
  const yuvarla = { strokeLinejoin: "round", strokeLinecap: "round" };
  switch (tur) {
    case "elli":
      return (
        <g {...yuvarla}>
          <circle cx="32" cy="32" r="15.5" fill={W} {...S(3.6)} />
          <path d="M32 16.5A15.5 15.5 0 0 1 32 47.5Z" fill={E} />
          <circle cx="32" cy="32" r="15.5" fill="none" {...S(3.6)} />
          {!k && <circle cx="25.5" cy="26" r="2.2" fill={A} />}
        </g>
      );
    case "sure":
      return (
        <g {...yuvarla}>
          <path d="M21 15H43V19.5C43 25.5 37 28.5 35 32C37 35.5 43 38.5 43 44.5V49H21V44.5C21 38.5 27 35.5 29 32C27 28.5 21 25.5 21 19.5Z" fill={W} {...S(3.4)} />
          {!k && <path d="M26 45H38C37.2 41.5 34.5 39.5 32 37C29.5 39.5 26.8 41.5 26 45Z" fill={G} />}
          <path d="M21 15H43M21 49H43" fill="none" {...S(4.6)} />
          <circle cx="46" cy="44" r="9.5" fill={G} {...S(3)} />
          <path d="M46 39.3V48.7M41.3 44H50.7" fill="none" stroke={E} strokeWidth={3.2 * c} />
        </g>
      );
    case "zaman_baskisi":
      return (
        <g {...yuvarla}>
          <rect x="27" y="15" width="8" height="5.5" rx="1.5" fill={W} {...S(3)} />
          <circle cx="31" cy="35" r="14.5" fill={W} {...S(3.6)} />
          <path d="M31 35L37.5 28.5" fill="none" stroke={E} strokeWidth={3.6 * c} />
          <circle cx="31" cy="35" r="2" fill={E} />
          {!k && <path d="M46.5 11C49.5 15 52 17.5 52 21.5C52 25 49.5 27.5 46.5 27.5C43.5 27.5 41 25 41 21.5C41 19.5 42.3 18 43.4 16.3C44.4 17.8 45.3 17 46.5 11Z" fill={G} {...S(2.8)} />}
        </g>
      );
    case "ikinci_sans":
      return (
        <g {...yuvarla}>
          <path d="M32 48C18 39 15.5 31.5 15.5 26C15.5 20.5 19.5 17 24.5 17C28 17 30.5 19 32 22C33.5 19 36 17 39.5 17C44.5 17 48.5 20.5 48.5 26C48.5 31.5 46 39 32 48Z" fill={W} {...S(3.6)} />
          {!k && <path d="M22 24.5C22.5 22.5 24 21.5 25.5 21.5" fill="none" stroke={A} strokeWidth="3" />}
        </g>
      );
    case "sigorta":
      return (
        <g {...yuvarla}>
          <path d="M32 13.5L47.5 19V31C47.5 40 40.5 46 32 50.5C23.5 46 16.5 40 16.5 31V19Z" fill={W} {...S(3.6)} />
          <path d="M32 19.5L42 23V31C42 37.5 37.5 41.5 32 44.5C26.5 41.5 22 37.5 22 31V23Z" fill={A} />
          <path d="M32 19.5V44.5C26.5 41.5 22 37.5 22 31V23Z" fill={O} />
        </g>
      );
    case "cifte_puan":
      return (
        <g {...yuvarla}>
          <polygon points={YILDIZ} fill={W} {...S(3.2)} />
          <text x="32" y="38" textAnchor="middle" fontFamily="'Baloo 2', var(--qt-f-baslik), sans-serif"
                fontWeight="800" fontSize="17" letterSpacing="-1" fill={E}>2X</text>
        </g>
      );
    case "baskin":
      return (
        <g {...yuvarla}>
          <circle cx="32" cy="32" r="13" fill="none" stroke={E} strokeWidth={8.4 * c} />
          <circle cx="32" cy="32" r="13" fill="none" stroke={W} strokeWidth={4 * (k ? 1.1 : 1)} />
          <path d="M32 13V24M32 40V51M13 32H24M40 32H51" fill="none" stroke={E} strokeWidth={8 * c} />
          <path d="M32 13V24M32 40V51M13 32H24M40 32H51" fill="none" stroke={W} strokeWidth={3.6 * (k ? 1.1 : 1)} />
          <circle cx="32" cy="32" r="3.4" fill={E} />
        </g>
      );
    default:
      return null;
  }
}
