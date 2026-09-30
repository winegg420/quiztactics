/**
 * KUZEY IŞIKLARI (ÖNİZLEME) — koyu petrol gökyüzünde üç dalgalı ışık şeridi (yeşil · turkuaz · mor), arkada soluk yıldızlar,
 * altta karlı dağ silüeti. Eski avatar-arkası "kuzey" çiziminin (3 perde + yıldız + dağlar) kart formu. blur filtresi YOK:
 * yumuşak kenar radyal maskeyle verilir. Sabit hâl = hareketli hâlin ilk karesi (faz −f × süre). Yalnız transform + opacity.
 * 3 şerit + 14 yıldız.
 */
import { useMemo } from "react";
import YeniSahne, { rng, ara, yumusakEgri } from "./arka-plan-yeni-ortak.jsx";

export const AD = "Kuzey Işıkları";
export const TABAN = "#0A2233";

// top/h: kart yüksekliğinin yüzdesi; f: dalga fazı (0..1); dur: 9–14 sn
const SERITLER = [
  { renk: "#3EE0A0", op: 0.5, top: -14, h: 62, dur: 11, f: 0.35 },
  { renk: "#2CC4D8", op: 0.45, top: 6, h: 58, dur: 13.5, f: 0.75 },
  { renk: "#8A78F0", op: 0.42, top: 24, h: 52, dur: 9.5, f: 0.15 },
];
const DALGA_X = 14;           // px
const OLCEK_ALT = 0.9;
const OLCEK_UST = 1.1;

function yildizlar(k) {
  const r = rng(k ? 9311 : 6203);
  const olcek = k ? 0.75 : 1;
  const n = k ? 10 : 14;
  const liste = [];
  for (let i = 0; i < n; i++) liste.push({ x: r() * 97, y: r() * 62, s: ara(r, 1, 2.4) * olcek, op: ara(r, 0.3, 0.65) });
  return liste;
}

export default function KuzeyIsiklariArkaPlan({ hareketli = false, yukseklik = 100, className = "", children, katman = false, duzen = "yatay" }) {
  const k = yukseklik < 60;
  const liste = useMemo(() => yildizlar(k), [k]);
  const zemin = (
    <>
      {SERITLER.map((s, i) => {
        const e = yumusakEgri(s.f);
        return (
          <i key={i} className="abp-kuzey-serit" style={{
            top: `${s.top}%`, height: `${s.h}%`, opacity: s.op,
            "--c": s.renk, "--dur": `${s.dur}s`, "--gec": `${(-s.f * s.dur).toFixed(2)}s`,
            translate: `${(-DALGA_X + 2 * DALGA_X * e).toFixed(2)}px 0`, scale: `1 ${(OLCEK_ALT + (OLCEK_UST - OLCEK_ALT) * e).toFixed(3)}`,
          }} />
        );
      })}
      <svg className="abp-kuzey-dag" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M0 26L14 12L24 20L38 4L52 18L64 9L78 22L90 10L100 18V40H0Z" fill="#0A1C2A" />
        <path d="M38 4L44 12L41 12L46 18L36 12L40 12ZM14 12L18 17L11 16ZM90 10L94 15L87 15ZM64 9L68 14L60 14Z" fill="#DFF2FF" opacity=".8" />
        <path d="M0 34Q30 28 60 34T100 32V40H0Z" fill="#06121C" />
      </svg>
    </>
  );
  return (
    <YeniSahne tur="kuzey" katman={katman} duzen={duzen} taban={TABAN} hareketli={hareketli} yukseklik={yukseklik} className={className} zemin={zemin}
      parcalar={liste.map((p, i) => (
        <span key={i} className="abp-kuzey-yildiz" style={{ left: `${p.x.toFixed(1)}%`, top: `${p.y.toFixed(1)}%`, width: p.s, height: p.s, opacity: +p.op.toFixed(2) }} />
      ))}>
      {children}
    </YeniSahne>
  );
}
