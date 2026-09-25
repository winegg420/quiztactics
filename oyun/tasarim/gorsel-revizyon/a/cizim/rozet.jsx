// ROZET SİSTEMİ — görsel revizyon Bölüm 10. KURAL: rozet = TEMEL AMBLEM (ne için) × SEVİYE (1–4 = bronz, gümüş,
// altın, elmas; ne kadar) × STİL. Amblem kendi renginde zeminde durur (rozetler birbirine benzemesin); seviye
// yalnız metal kenarı değil SİLUETİ de değiştirir (süs eklenir). ~15 amblem × 4 seviye (+ gizli) ≈ 100 rozet.
//
//   rozetCiz({ amblem: "seri", seviye: 3, stil: "madalyon", boyut: 64 })   → JSX
//   <Rozet amblem="galibiyet" seviye={4} stil="altigen" boyut={24} />
//
// Madalyon: 1 yalın · 2 + kurdele kuyrukları · 3 + defne dalları · 4 + taç, kenar taşları, ışıltı (64 px'te hareketli).
// Altıgen:  1 yalın · 2 + yan kanatçıklar · 3 + üst ve alt sivri tepe · 4 + arkada ışın yıldızı, tepe taşı, ışıltı.
import { MARKA, METAL, SAHNE, TAS } from "../../palet.js";
import { BEYAZ, Hareket, Isiltilar, K, Parlama, cokgen, cz, f, kutup, yay } from "./ortak.jsx";
import { FasetCokgen } from "./lig.jsx";   // lig.css (dönen ışın) de buradan gelir

export const SEVIYE_METAL = [null, "bronz", "gumus", "altin", "elmas"];
export const SEVIYE_AD = [null, "Bronz", "Gümüş", "Altın", "Elmas"];

// ---------------------------------------------------------------- temel amblemler (yerel ±13 birim)
const Kilic = ({ don }) => (
  <g transform={`rotate(${don})`}>
    <path d="M-1.9 -14.5L0 -17L1.9 -14.5V3H-1.9Z" fill={METAL.gumus.acik} {...cz(1.6)} />
    <path d="M0 -15V2" stroke={METAL.gumus.koyu} strokeWidth="1.2" />
    <path d="M-6 3H6V6H-6Z" fill={METAL.altin.orta} {...cz(1.6)} />
    <path d="M-1.6 6H1.6V12H-1.6Z" fill={SAHNE.lacivert} {...cz(1.4)} />
    <circle cx="0" cy="13.4" r="2" fill={METAL.altin.orta} {...cz(1.3)} />
  </g>
);
export const AMBLEMLER = {
  galibiyet: { ad: "Galibiyet", zemin: SAHNE.kirmizi, Sembol: () => <><Kilic don={-40} /><Kilic don={40} /></> },
  seri: {
    ad: "Seri", zemin: SAHNE.mor,
    Sembol: () => (
      <g transform="translate(0 1)">
        <path d="M0 -15C7 -8 11 -3 11 3C11 10 6 14 0 14C-6 14 -11 10 -11 3C-11 -3 -7 -6 -5 -11C-3 -6 -2 -4 0 -3C1 -7 0 -11 0 -15Z" fill={MARKA.turuncu} {...cz(1.8)} />
        <path d="M0 -2C4 2 6 5 6 8C6 11 3 13 0 13C-3 13 -6 11 -6 8C-6 5 -3 3 0 -2Z" fill={METAL.altin.orta} />
        <path d="M-7 1C-7 -2 -5 -4 -4 -6" fill="none" stroke={BEYAZ} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    ),
  },
  ustalik: {
    ad: "Bilim ustalığı", zemin: SAHNE.turkuaz,
    Sembol: () => (
      <g>
        <path d="M-3.6 -14H3.6V-5L11 9C12 11.5 10.6 14 8 14H-8C-10.6 14 -12 11.5 -11 9L-3.6 -5Z" fill={BEYAZ} {...cz(1.8)} />
        <path d="M-7.3 3H7.3L11 9C12 11.5 10.6 14 8 14H-8C-10.6 14 -12 11.5 -11 9Z" fill={TAS.zumrut} />
        <path d="M-3.6 -14H3.6V-5L11 9C12 11.5 10.6 14 8 14H-8C-10.6 14 -12 11.5 -11 9L-3.6 -5Z" fill="none" {...cz(1.8)} />
        <path d="M-5.4 -14H5.4" {...cz(2.4)} />
        <circle cx="-2" cy="8" r="1.6" fill={BEYAZ} /><circle cx="3" cy="10" r="1.1" fill={BEYAZ} />
      </g>
    ),
  },
  level: {
    ad: "Level", zemin: SAHNE.mavi,
    Sembol: () => <path d={cokgen(Array.from({ length: 10 }, (_, i) => kutup(i % 2 ? 6.2 : 14, i * 36)))} fill={METAL.altin.orta} {...cz(1.8)} />,
  },
  turnuva: {
    ad: "Turnuva", zemin: SAHNE.lacivert,
    Sembol: () => (
      <g>
        <path d="M-8 -12H8V-4C8 3 4 6 0 6C-4 6 -8 3 -8 -4Z" fill={METAL.altin.orta} {...cz(1.8)} />
        <path d="M-8 -9H-12C-12 -3 -10 -1 -7 0M8 -9H12C12 -3 10 -1 7 0" fill="none" {...cz(1.8)} />
        <path d="M-2 6H2V10H-2Z" fill={METAL.altin.koyu} {...cz(1.4)} />
        <path d="M-7 10H7V14H-7Z" fill={METAL.altin.koyu} {...cz(1.6)} />
        <path d="M-4.6 -9V-4" stroke={BEYAZ} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    ),
  },
  sosyal: {
    ad: "Sosyal", zemin: SAHNE.pembe,
    Sembol: () => (
      <g transform="translate(0 1)">
        <path d="M0 12C-8 6 -13 1 -13 -5C-13 -10 -9 -13 -5 -13C-2.6 -13 -1 -11.6 0 -10C1 -11.6 2.6 -13 5 -13C9 -13 13 -10 13 -5C13 1 8 6 0 12Z" fill={TAS.yakut} {...cz(1.8)} />
        <path d="M-9 -6C-9 -8.6 -7 -10 -5 -10" fill="none" stroke={BEYAZ} strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
  },
};

// ---------------------------------------------------------------- seviye süsleri
function Kurdele({ zemin, w }) {
  const kuyruk = (
    <>
      <path d="M33 40L39 60L43 54.6L48.6 57.4L43.4 37Z" fill={zemin} {...cz(w)} />
      <path d="M36.4 42L41.2 56" stroke={K} strokeWidth="1.2" opacity=".22" strokeLinecap="round" />
    </>
  );
  return <g>{kuyruk}<g transform="translate(64 0) scale(-1 1)">{kuyruk}</g></g>;
}
function Defne({ m, w, cx, cy, r, kucuk }) {
  const yapraklar = [];
  const adet = kucuk ? 3 : 5;
  const adim = kucuk ? 26 : 17;
  for (const yon of [-1, 1]) {
    for (let i = 0; i < adet; i += 1) {
      const a = yon > 0 ? 152 - i * adim : 208 + i * adim;
      const [x, y] = kutup(r, a, cx, cy);
      yapraklar.push(
        <ellipse key={`${yon}${i}`} cx={x} cy={y} rx={kucuk ? 3.2 : 2.5} ry={kucuk ? 5.8 : 4.8} transform={`rotate(${a + 90 - yon * 35} ${x} ${y})`}
                 fill={i % 2 ? m.orta : m.acik} {...cz(w)} />,
      );
    }
  }
  return <g>{yapraklar}</g>;
}
function Tac({ x, y, m, w, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-9 4L-10 -6L-4.6 -1.6L0 -9L4.6 -1.6L10 -6L9 4Z" fill={m.orta} {...cz(w / s)} />
      <path d="M-9 4L-10 -6L-4.6 -1.6L0 -9V4Z" fill={m.acik} />
      <path d="M-9 4L-10 -6L-4.6 -1.6L0 -9L4.6 -1.6L10 -6L9 4Z" fill="none" {...cz(w / s)} />
      <circle cx="0" cy="-1" r="1.9" fill={TAS.yakut} stroke={K} strokeWidth={f(1.1 / s)} />
    </g>
  );
}

// ---------------------------------------------------------------- stiller
function Madalyon({ a, sv, m, w, k }) {
  const cx = 32, cy = sv >= 4 ? 32 : 30, R = sv >= 3 ? 16.5 : 18, r = R - (k ? 4.4 : 5);
  return (
    <>
      {sv >= 2 && <Kurdele zemin={a.zemin} w={w * 0.8} />}
      {sv >= 3 && <Defne m={m} w={w * 0.55} cx={cx} cy={cy} r={R + 4.2} kucuk={k} />}
      <circle cx={cx} cy={cy} r={R} fill={m.orta} />
      <path d={`M${kutup(R, 250, cx, cy).join(" ")}A${R} ${R} 0 0 1 ${kutup(R, 20, cx, cy).join(" ")}L${kutup(r, 20, cx, cy).join(" ")}A${r} ${r} 0 0 0 ${kutup(r, 250, cx, cy).join(" ")}Z`} fill={m.acik} />
      <path d={`M${kutup(R, 70, cx, cy).join(" ")}A${R} ${R} 0 0 1 ${kutup(R, 200, cx, cy).join(" ")}L${kutup(r, 200, cx, cy).join(" ")}A${r} ${r} 0 0 0 ${kutup(r, 70, cx, cy).join(" ")}Z`} fill={m.koyu} />
      <circle cx={cx} cy={cy} r={r} fill={a.zemin} stroke={m.kenar} strokeWidth={k ? 1.6 : 1.4} />
      <path d={`M${kutup(r, 250, cx, cy).join(" ")}A${r} ${r} 0 0 1 ${kutup(r, 20, cx, cy).join(" ")}A${r * 1.2} ${r * 1.2} 0 0 0 ${kutup(r, 250, cx, cy).join(" ")}Z`} fill={K} opacity=".18" />
      <g transform={`translate(${cx} ${cy}) scale(${f((r / 14.5) * (k ? 1.02 : 0.95))})`}><a.Sembol /></g>
      {sv >= 4 && [45, 135, 225, 315].map((g) => { const [x, y] = kutup((R + r) / 2, g, cx, cy); return <circle key={g} cx={x} cy={y} r={k ? 2 : 1.7} fill={TAS.yakut} stroke={K} strokeWidth="1" />; })}
      <Parlama d={yay(R - 2.2, 292, 334, cx, cy)} w={k ? 2.6 : 2} />
      <circle cx={cx} cy={cy} r={R} fill="none" {...cz(w)} />
      {sv >= 4 && <Tac x={cx} y={cy - R - 3} m={m} w={w * 0.8} s={k ? 1.05 : 0.9} />}
    </>
  );
}
function Altigen({ a, sv, m, w, k }) {
  const cx = 32, cy = 32, R = sv >= 3 ? 17.5 : 19, r = R - (k ? 4.6 : 5.2);
  const alti = (rr) => Array.from({ length: 6 }, (_, i) => kutup(rr, i * 60, cx, cy));
  return (
    <>
      {sv >= 4 && (
        <g className="gra-rozet-isin" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <path d={cokgen(Array.from({ length: 24 }, (_, i) => kutup(i % 2 ? 22 : 31, i * 15 + 7.5, cx, cy)))} fill={m.acik} {...cz(w * 0.7)} />
        </g>
      )}
      {sv >= 2 && [-1, 1].map((y) => (
        <path key={y} d={cokgen([[cx + y * (R - 2), cy - 7], [cx + y * (R + 9), cy - 10], [cx + y * (R + 6), cy], [cx + y * (R + 9), cy + 10], [cx + y * (R - 2), cy + 7]])}
              fill={y < 0 ? m.acik : m.koyu} {...cz(w * 0.85)} />
      ))}
      {sv >= 3 && (
        <>
          <path d={cokgen([[cx - 6, cy - R + 3], [cx, cy - R - 9], [cx + 6, cy - R + 3]])} fill={m.acik} {...cz(w * 0.85)} />
          <path d={cokgen([[cx - 6, cy + R - 3], [cx, cy + R + 9], [cx + 6, cy + R - 3]])} fill={m.koyu} {...cz(w * 0.85)} />
        </>
      )}
      <FasetCokgen p={alti(R)} c={[cx, cy]} m={m} w={w} cizgi={false} />
      <path d={cokgen(alti(r))} fill={a.zemin} stroke={m.kenar} strokeWidth={k ? 1.6 : 1.4} strokeLinejoin="round" />
      <path d={cokgen([...alti(r).slice(4), alti(r)[0], [cx + 1, cy - r * 0.55], [cx - r * 0.6, cy + 1]])} fill={K} opacity=".16" />
      <g transform={`translate(${cx} ${cy}) scale(${f((r / 14.5) * (k ? 1.02 : 0.92))})`}><a.Sembol /></g>
      {sv >= 4 && <path d="M28.4 5.2L32 1.4L35.6 5.2L32 10.4Z" transform={`translate(0 ${cy - R - 8.6})`} fill={METAL.elmas.orta} {...cz(1.4)} />}
      <Parlama d={`M${f(cx - R + 4.4)} ${f(cy - 5)}L${f(cx - 5)} ${f(cy - R + 3.6)}`} w={k ? 2.6 : 2} />
      <path d={cokgen(alti(R))} fill="none" {...cz(w)} />
    </>
  );
}
const STILLER = { madalyon: Madalyon, altigen: Altigen };

/** Kural: amblem × seviye × stil → çizim. Bilinmeyen amblem "level"e, seviye 1–4'e sıkıştırılır. */
export function rozetCiz({ amblem = "level", seviye = 1, stil = "madalyon", boyut = 64 }) {
  const a = AMBLEMLER[amblem] ?? AMBLEMLER.level;
  const sv = Math.min(4, Math.max(1, Math.round(seviye)));
  const m = METAL[SEVIYE_METAL[sv]];
  const k = boyut <= 28;
  const S = STILLER[stil] ?? Madalyon;
  return <S a={a} sv={sv} m={m} w={k ? 4 : 2.6} k={k} />;
}

export function Rozet({ amblem = "level", seviye = 1, stil = "madalyon", boyut = 64, hareketli = false }) {
  const a = AMBLEMLER[amblem] ?? AMBLEMLER.level;
  const sv = Math.min(4, Math.max(1, Math.round(seviye)));
  const oynar = hareketli && boyut >= 48 && sv >= 4;
  return (
    <Hareket className={`gra-rozet${oynar ? " gra-rozet--oynar" : ""}`} style={{ width: boyut, height: boyut }}
             role="img" aria-label={`${a.ad} — ${SEVIYE_AD[sv]}`}>
      <svg viewBox="0 0 64 64" focusable="false">{rozetCiz({ amblem, seviye: sv, stil, boyut })}</svg>
      {oynar && <Isiltilar noktalar={[[53, 12, 5, 0], [12, 50, 3.6, 1.2]]} />}
    </Hareket>
  );
}
