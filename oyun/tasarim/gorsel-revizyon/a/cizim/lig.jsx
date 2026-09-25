// LİG AMBLEMLERİ — görsel revizyon Bölüm 9. Kademe renkle DEĞİL şekil + süsle ayrışır (renk yardımcı).
// Işık sol üstten: her faset kendi yönüne göre metalin açık / orta / koyu tonunu alır (hücre gölgesi).
// Boy: ≤ 28 px küçük çizim (iç çizgiler kalkar, kontur kalınlaşır) · 64 px vitrinde üst ligler hareketli.
// Dışa aktarım: <LigAmblemiA lig="altin" boyut={20} />, <LigAmblemiB …/>  (lig: bronz|gumus|altin|elmas|efsane)
import { METAL, TAS } from "../../palet.js";
import { BEYAZ, Hareket, Isiltilar, K, Parlama, cokgen, cz, f, kutup } from "./ortak.jsx";
import "./lig.css";

export const LIG_SIRA = ["bronz", "gumus", "altin", "elmas", "efsane"];
export const LIG_AD = { bronz: "Bronz", gumus: "Gümüş", altin: "Altın", elmas: "Elmas", efsane: "Efsane" };
const kucukMu = (b) => b <= 28;

/** Yüzey normalinin ışığa (sol üst, 315°) göre tonu. aci: yüzün baktığı yön (0 = yukarı, saat yönü). */
export function isikTonu(aci, m) {
  const d = Math.abs(((aci - 315 + 540) % 360) - 180);
  return d < 60 ? m.acik : d < 120 ? m.orta : m.koyu;
}
/** Merkezden kenarlara fasetlenmiş çokgen (kabartma): her kenar + merkez bir üçgen, ışığa göre ton. */
export function FasetCokgen({ p, c, m, w, cizgi = true }) {
  return (
    <>
      {p.map((a, i) => {
        const b = p[(i + 1) % p.length];
        const mx = (a[0] + b[0]) / 2 - c[0];
        const my = (a[1] + b[1]) / 2 - c[1];
        const aci = (Math.atan2(mx, -my) * 180) / Math.PI;
        return <path key={i} d={cokgen([c, a, b])} fill={isikTonu((aci + 360) % 360, m)} />;
      })}
      {cizgi && <path d={p.map((a) => `M${f(c[0])} ${f(c[1])}L${f(a[0])} ${f(a[1])}`).join("")} stroke={m.kenar} strokeWidth="1" strokeLinecap="round" opacity=".55" />}
      <path d={cokgen(p)} fill="none" {...cz(w)} />
    </>
  );
}
const yildizNoktalari = (n, R, r, cx, cy, don = 0) => Array.from({ length: n * 2 }, (_, i) => kutup(i % 2 ? r : R, don + (i * 180) / n, cx, cy));

/** Küçük taç (üç sivri + taşlar). */
function Tac({ x, y, s = 1, m, w, tas = TAS.yakut }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-10 4L-11 -7L-5 -2L0 -10L5 -2L11 -7L10 4Z" fill={m.orta} {...cz(w / s)} />
      <path d="M-10 4L-11 -7L-5 -2L0 -10L0 4Z" fill={m.acik} />
      <path d="M-10 4L-11 -7L-5 -2L0 -10L5 -2L11 -7L10 4Z" fill="none" {...cz(w / s)} />
      <path d="M-10.6 4H10.6V7.4H-10.6Z" fill={m.koyu} {...cz(w / s)} />
      <circle cx="0" cy="-2" r="2" fill={tas} stroke={K} strokeWidth={f(1.2 / s)} />
    </g>
  );
}
/** Kanat: n tüy (üstten alta kısalır), (x,y) kökü, yön (1 sağ / -1 sol). Tüyler kalın yaprak biçimi. */
function Kanat({ x, y, n, yon, m, w, uzun = 1 }) {
  const tuyler = Array.from({ length: n }, (_, i) => i).reverse();
  return (
    <g transform={`translate(${x} ${y}) scale(${yon} 1)`}>
      {tuyler.map((i) => {
        const a = -34 + i * 24;
        const L = (21 - i * 2.2) * uzun;
        const G = 6.2 - i * 0.4;
        return (
          <g key={i} transform={`rotate(${a})`}>
            <path d={`M-1 ${f(-G * 0.5)}C${f(L * 0.4)} ${f(-G * 1.1)} ${f(L * 0.85)} ${f(-G * 0.8)} ${f(L)} ${f(-G * 0.2)}C${f(L * 0.8)} ${f(G * 0.9)} ${f(L * 0.35)} ${f(G * 1.1)} -1 ${f(G * 0.5)}Z`}
                  fill={i === 0 ? m.acik : i === 1 ? m.orta : m.koyu} {...cz(w)} />
            {i === 0 && <path d={`M${f(L * 0.2)} ${f(-G * 0.25)}Q${f(L * 0.55)} ${f(-G * 0.55)} ${f(L * 0.8)} ${f(-G * 0.25)}`} fill="none" stroke={BEYAZ} strokeWidth="1.6" strokeLinecap="round" />}
          </g>
        );
      })}
    </g>
  );
}
function Isinlar({ n = 12, r0 = 14, r1 = 31, cx = 32, cy = 33, renk, cls = "", w = 0, gen = 6 }) {
  return (
    <g className={cls} style={{ transformOrigin: `${cx}px ${cy}px` }}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i * 360) / n;
        const [x0, y0] = kutup(r0, a - gen, cx, cy);
        const [x1, y1] = kutup(r1, a, cx, cy);
        const [x2, y2] = kutup(r0, a + gen, cx, cy);
        return <path key={i} d={`M${x0} ${y0}L${x1} ${y1}L${x2} ${y2}Z`} fill={renk} {...(w ? cz(w) : {})} />;
      })}
    </g>
  );
}

function Kap({ lig, boyut, hareketli, isilti, children, ad }) {
  const oynar = hareketli && boyut >= 48 && (lig === "elmas" || lig === "efsane" || lig === "altin");
  return (
    <Hareket className={`gra-lig gra-lig--${lig}${oynar ? " gra-lig--oynar" : ""}`} style={{ width: boyut, height: boyut }}
             role="img" aria-label={`${LIG_AD[lig]} Lig`}>
      <svg viewBox="0 0 64 64" focusable="false" data-ad={ad}>{children}</svg>
      {oynar && isilti && <Isiltilar noktalar={isilti} />}
    </Hareket>
  );
}

// ================================================================ SET A — KANATLI ARMA
// Çekirdek: fasetli baklava taş-arma. Bronz yalın → Gümüş küçük kanat → Altın kanat + taç → Elmas 3 tüy +
// taşlı taç → Efsane büyük kanat + taç + arkada dönen ışın hâlesi. Siluet her kademede genişler.
const A_SUS = {
  bronz: { kanat: 0, tac: false, isin: false },
  gumus: { kanat: 1, tac: false, isin: false },
  altin: { kanat: 2, tac: true, isin: false },
  elmas: { kanat: 3, tac: true, isin: false },
  efsane: { kanat: 4, tac: true, isin: true },
};
export function LigAmblemiA({ lig = "bronz", boyut = 64, hareketli = false }) {
  const m = METAL[lig] ?? METAL.bronz;
  const s = A_SUS[lig] ?? A_SUS.bronz;
  const k = kucukMu(boyut);
  const w = k ? 4.2 : 2.6;
  const cy = s.tac ? 37 : 34;
  const h = k ? 21 : 19.5;
  const g = k ? 15.5 : 14.5;
  const p = [[32, cy - h], [32 + g, cy], [32, cy + h], [32 - g, cy]];
  return (
    <Kap lig={lig} boyut={boyut} hareketli={hareketli} isilti={[[54, 10, 5, 0], [10, 50, 3.6, 1.3]]}>
      {s.isin && <Isinlar n={8} r0={14} r1={32} gen={14} cy={cy - 2} renk={METAL.efsane.koyu} w={w * 0.7} cls="gra-lig-isin" />}
      {s.kanat > 0 && (
        <>
          <Kanat x={32 - g + 5} y={cy - 1} n={s.kanat} yon={-1} m={m} w={w * 0.85} uzun={s.kanat >= 4 ? 1.12 : 0.9} />
          <Kanat x={32 + g - 5} y={cy - 1} n={s.kanat} yon={1} m={m} w={w * 0.85} uzun={s.kanat >= 4 ? 1.12 : 0.9} />
        </>
      )}
      <FasetCokgen p={p} c={[32, cy]} m={m} w={w} cizgi={!k} />
      {/* çekirdekteki taş: kademe taşı */}
      {!k && lig !== "bronz" && <circle cx="32" cy={cy} r={lig === "gumus" ? 3 : 3.8} fill={lig === "elmas" ? METAL.elmas.orta : lig === "efsane" ? TAS.yakut : lig === "altin" ? TAS.safir : TAS.zumrut} stroke={K} strokeWidth="1.4" />}
      {s.tac && <Tac x={32} y={cy - h - 2.5} s={k ? 1.05 : 0.95} m={lig === "efsane" ? METAL.altin : m} w={w * 0.85} tas={lig === "elmas" ? METAL.elmas.koyu : TAS.yakut} />}
      <Parlama d={`M${f(32 - g * 0.55)} ${f(cy - 3)}L${f(32 - 2)} ${f(cy - h * 0.72)}`} w={k ? 3 : 2.2} />
    </Kap>
  );
}

// ================================================================ SET B — FASETLİ YILDIZ
// Kol sayısı kademeyi söyler: Bronz 4 · Gümüş 5 · Altın 6 · Elmas 8 (ortada pırlanta) · Efsane 8 + ara
// kollar (16) + arkada dönen hâle. Her kol iki fasetli (ışık / gölge yüzü).
const B_SUS = {
  bronz: { n: 4, R: 27, r: 10 },
  gumus: { n: 5, R: 28, r: 12 },
  altin: { n: 6, R: 28.5, r: 14 },
  elmas: { n: 8, R: 29, r: 17 },
  efsane: { n: 8, R: 29.5, r: 17, ara: true },
};
function FasetYildiz({ n, R, r, cx, cy, m, w, cizgi }) {
  return <FasetCokgen p={yildizNoktalari(n, R, r, cx, cy)} c={[cx, cy]} m={m} w={w} cizgi={cizgi} />;
}
export function LigAmblemiB({ lig = "bronz", boyut = 64, hareketli = false }) {
  const m = METAL[lig] ?? METAL.bronz;
  const s = B_SUS[lig] ?? B_SUS.bronz;
  const k = kucukMu(boyut);
  const w = k ? 4.2 : 2.6;
  const cx = 32, cy = 33;
  return (
    <Kap lig={lig} boyut={boyut} hareketli={hareketli} isilti={[[55, 9, 5, 0], [9, 54, 3.6, 1.3]]}>
      {s.ara && (
        <g className="gra-lig-isin" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <path d={cokgen(yildizNoktalari(8, 31, 14, cx, cy, 22.5))} fill={METAL.efsane.koyu} {...cz(w * 0.8)} />
        </g>
      )}
      <FasetYildiz n={s.n} R={s.R} r={s.r} cx={cx} cy={cy} m={m} w={w} cizgi={!k} />
      {/* göbek */}
      {lig === "elmas" || lig === "efsane" ? (
        <g transform={`translate(${cx} ${cy + 0.5})`}>
          <path d="M-6 -4.6L-3.4 -7.4H3.4L6 -4.6L0 6.4Z" fill={lig === "efsane" ? METAL.efsane.acik : METAL.elmas.acik} {...cz(k ? 2.4 : 1.6)} />
          <path d="M-6 -4.6H6L0 6.4Z" fill={lig === "efsane" ? METAL.efsane.orta : METAL.elmas.koyu} {...cz(k ? 2.4 : 1.6)} />
        </g>
      ) : (
        <circle cx={cx} cy={cy} r={k ? 5.4 : 5} fill={m.acik} {...cz(k ? 2.6 : 1.8)} />
      )}
      <Parlama d={`M${f(cx - s.r * 0.9)} ${f(cy - 3)}L${f(cx - 4)} ${f(cy - s.r * 0.7)}`} w={k ? 2.8 : 2.2} op={lig === "elmas" || lig === "efsane" ? 0 : 1} />
    </Kap>
  );
}

// ================================================================ SET C — KRİSTAL (içeride elendi)
export function LigAmblemiC({ lig = "bronz", boyut = 64 }) {
  const m = METAL[lig] ?? METAL.bronz;
  const k = kucukMu(boyut);
  const w = k ? 4.2 : 2.6;
  const adet = { bronz: 1, gumus: 1, altin: 2, elmas: 3, efsane: 3 }[lig];
  const kr = (x, h, d) => {
    const p = [[x - 7, 56], [x - 7, 56 - h + 8], [x, 56 - h], [x + 7, 56 - h + 8], [x + 7, 56]];
    return <g key={x} transform={`rotate(${d} ${x} 56)`}><FasetCokgen p={p} c={[x, 56 - h * 0.45]} m={m} w={w} cizgi={!k} /></g>;
  };
  return (
    <Kap lig={lig} boyut={boyut}>
      {lig === "efsane" && <Isinlar r0={10} r1={31} cy={30} renk={METAL.efsane.acik} />}
      {lig === "bronz" ? <FasetCokgen p={[[16, 50], [22, 28], [38, 20], [50, 32], [48, 52], [30, 58]]} c={[32, 40]} m={m} w={w} cizgi={!k} /> : null}
      {adet >= 2 && kr(20, 30, -18)}
      {adet >= 3 && kr(44, 30, 18)}
      {lig !== "bronz" && kr(32, 46, 0)}
    </Kap>
  );
}

// ================================================================ SET D — FLAMA (içeride elendi)
export function LigAmblemiD({ lig = "bronz", boyut = 64 }) {
  const m = METAL[lig] ?? METAL.bronz;
  const k = kucukMu(boyut);
  const w = k ? 4.2 : 2.6;
  const kuyruk = lig === "bronz" ? "M16 14H48V44L32 56L16 44Z" : "M16 14H48V56L40 48L32 56L24 48L16 56Z";
  return (
    <Kap lig={lig} boyut={boyut}>
      <path d={kuyruk} fill={m.orta} {...cz(w)} />
      <path d="M16 14H30V52L24 48L16 54Z" fill={m.acik} />
      <path d={kuyruk} fill="none" {...cz(w)} />
      <path d="M10 12H54" {...cz(w + 2)} />
      <path d="M10 12H54" stroke={m.koyu} strokeWidth={w - 0.5} strokeLinecap="round" />
      {lig !== "bronz" && lig !== "gumus" && <path d={cokgen(yildizNoktalari(5, 8, 3.6, 32, 32))} fill={BEYAZ} {...cz(w * 0.7)} />}
    </Kap>
  );
}

export const LIG_SETLERI = { a: LigAmblemiA, b: LigAmblemiB, c: LigAmblemiC, d: LigAmblemiD };
