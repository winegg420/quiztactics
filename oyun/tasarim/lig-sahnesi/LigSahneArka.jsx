/**
 * YENİ LİG ARKA PLANLARI (9 Eki 2026, 5. tur — yalnız /lig-sahne-onizleme "Yeni"; canlıda hiçbir yer `sahneArka` vermez).
 * Eski sahnenin (oyuncu-vitrin-karti.css › .qt-ok--lig-sahnesi::before) BİREBİR kompozisyonu: 18 ışın, 20°'lik
 * zemin/ışık bantları, merkez (50% 36%), avatar arkasında beyaz parlama. Eski'de olmayan öğe (motif, yıldız, nokta) YOK.
 * a1: Eski'nin kopyası, merkez parlaması daha yumuşak.
 * a2: a1 + ışık bantlarında daha belirgin iki ton + kenarlarda hafif vinyet.
 * a3: a2 + merkezden dışa renk geçişi (avatar arkası açık, kenarlar ligin koyu tonu) + yumuşak ışın kenarı.
 * Statik SVG, hareket yok. Katman: .qt-ok-sahne (z −1, kırpılı).
 */
import { useId } from "react";

/* zemin / isik = eski token değerleri (tokenlar.css 7c); derin = ışığın koyu tonu; koyu = vinyet/kenar tonu */
const PALET = {
  bronz:  { zemin: "#fbe9d9", isik: "#f0c29c", derin: "#e6a87a", koyu: "#B4612A" },
  gumus:  { zemin: "#e4eefb", isik: "#98b6e0", derin: "#7f9fcf", koyu: "#4F74AD" },
  altin:  { zemin: "#faeeda", isik: "#fac775", derin: "#efb052", koyu: "#C58F0E" },
  elmas:  { zemin: "#dff6fc", isik: "#9fe3f4", derin: "#76d2ea", koyu: "#1E7DB0" },
  efsane: { zemin: "#f1e6ff", isik: "#d2b1ff", derin: "#b993f5", koyu: "#6A35B8" },
};
const r1 = (x) => Math.round(x * 10) / 10;
const nok = (r, a) => [r1(r * Math.cos((a * Math.PI) / 180)), r1(r * Math.sin((a * Math.PI) / 180))];
const kama = (a0, a1, R = 900) => [[0, 0], nok(R, a0), nok(R, a1)].map((p) => p.join(",")).join(" ");

export default function LigSahneArka({ lig, seviye = "a1" }) {
  const id = useId().replace(/:/g, "");
  const p = PALET[lig];
  if (!p) return null;
  const s = seviye === "a3" ? 3 : seviye === "a2" ? 2 : 1;
  return (
    <span className="qt-ok-sahne" aria-hidden="true">
      <svg width="100%" height="100%" focusable="false" style={{ display: "block" }}>
        <defs>
          {/* Eski: beyaz .8 → 0 (110 px, doğrusal). Burada daha yumuşak düşüş */}
          <radialGradient id={`${id}p`} cx="0" cy="0" r="125" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity=".72" /><stop offset=".45" stopColor="#fff" stopOpacity=".42" />
            <stop offset=".8" stopColor="#fff" stopOpacity=".1" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}v`} cx="50%" cy="36%" r="78%">
            <stop offset=".5" stopColor={p.koyu} stopOpacity="0" /><stop offset="1" stopColor={p.koyu} stopOpacity=".2" />
          </radialGradient>
          <radialGradient id={`${id}r`} cx="50%" cy="36%" r="70%">
            <stop offset="0" stopColor={p.zemin} stopOpacity=".55" /><stop offset=".35" stopColor={p.zemin} stopOpacity="0" />
            <stop offset=".7" stopColor={p.koyu} stopOpacity="0" /><stop offset="1" stopColor={p.koyu} stopOpacity=".24" />
          </radialGradient>
          <filter id={`${id}y`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.4" /></filter>
        </defs>
        <rect width="100%" height="100%" fill={p.zemin} />
        <svg x="50%" y="36%" overflow="visible">
          {/* 18 bant (9 ışık): Eski conic 0–20° zemin, 20–40° ışık → SVG açısı −90° kaydırmalı */}
          <g filter={s === 3 ? `url(#${id}y)` : undefined}>
            {Array.from({ length: 9 }, (_, k) => {
              const a = k * 40 - 90;
              return (
                <g key={k}>
                  <polygon points={kama(a + 20, a + 40)} fill={p.isik} />
                  {s >= 2 && <polygon points={kama(a + 30, a + 40)} fill={p.derin} opacity=".6" />}
                </g>
              );
            })}
          </g>
          <circle r="125" fill={`url(#${id}p)`} />
        </svg>
        {s === 3 && <rect width="100%" height="100%" fill={`url(#${id}r)`} />}
        {s >= 2 && <rect width="100%" height="100%" fill={`url(#${id}v)`} />}
      </svg>
    </span>
  );
}
