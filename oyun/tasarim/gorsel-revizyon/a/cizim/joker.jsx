// JOKER İKONLARI — stil rehberine HİZALANMIŞ hâl (Bölüm 11). Yeni set değil: her jokerin rengi ve sembolü aynı
// (components/skillSembolleri.jsx, Phosphor fill — MIT). Değişen yalnız dil: degrade + cam hilali + plastik parlaklık
// yerine düz renk + hücre gölgesi, kalın lacivert kontur (disk VE sembol), tek beyaz parlama vuruşu, sağ alt dudak.
import { LEVEL, METAL, PEMBE_TON, ZUMRUT_TON } from "../../palet.js";
import { SKILL_SEMBOLLERI } from "../../../../components/skillSembolleri.jsx";
import { HucreGolge, Parlama, cz, useKimlik, yay } from "./ortak.jsx";
import "./joker.css";

export const JOKER_RENK = {
  elli: LEVEL.ametist, sure: ZUMRUT_TON, soru_degistir: LEVEL.turkuaz, zaman_baskisi: LEVEL.yakut,
  ikinci_sans: PEMBE_TON, sigorta: LEVEL.safir, cifte_puan: METAL.altin,
};
export const JOKER_AD = {
  elli: "50:50", sure: "Ek Süre", soru_degistir: "Soru Değiştir", zaman_baskisi: "Zaman Baskısı",
  ikinci_sans: "İkinci Şans", sigorta: "Sigorta", cifte_puan: "2X",
};
const daire = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

export function JokerIkon({ tur, boyut = 48 }) {
  const id = useKimlik("jk");
  const m = JOKER_RENK[tur] ?? LEVEL.ametist;
  const Sembol = SKILL_SEMBOLLERI[tur];
  const k = boyut <= 32;
  const w = k ? 4.2 : 3;
  return (
    <span className={`gra-joker${k ? " gra-joker--kucuk" : ""}`} style={{ width: boyut, height: boyut, "--_r-koyu": m.kenar, "--qt-coin": METAL.altin.orta, "--jk-k": m.kenar }}
          role="img" aria-label={JOKER_AD[tur] ?? tur}>
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <circle cx="32" cy="35" r="27" fill={m.kenar} {...cz(w)} />
        <HucreGolge id={id} d={daire(32, 31.5, 27)} acik={m.orta} koyu={m.koyu} dx={-2.6} dy={-3} />
        <path d={`M${32 - 27} 31.5a27 27 0 0 1 12 -22.4`} fill="none" stroke={m.acik} strokeWidth="5" strokeLinecap="round" />
        <Parlama d={yay(22.4, 300, 330, 32, 31.5)} w={k ? 3.6 : 3} />
        <circle cx="32" cy="31.5" r="27" fill="none" {...cz(w)} />
      </svg>
      {Sembol && <span className="gra-joker-sembol"><Sembol /></span>}
    </span>
  );
}
