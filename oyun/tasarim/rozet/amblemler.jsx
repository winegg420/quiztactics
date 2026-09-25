// ROZET AMBLEMLERİ — Madalyon rozet sisteminin temel amblemleri (Ida seçimi 25 Eyl 2026: Bölüm 10 "1 — Madalyon").
// Her amblem: kendi ZEMİN rengi (madalyonun iç dairesi) + kendi SEMBOLÜ. Sembol yerel koordinatta, merkez 0,0,
// yaklaşık ±13 birim; madalyon onu iç daireye ölçekler. Stil rehberi (A6): kalın #0b1220 kontur · düz dolgu + hücre
// gölgesi · ışık sol üstten · tek beyaz parlama vuruşu. Renkler yalnız ortak paletten.
// İlk altı amblem (yildiz, kupa, kiliclar, alev, sosyal kalp, deney) önizlemedeki adayla aynı çizimdir
// (gorsel-revizyon/a/cizim/rozet.jsx); kalanlar aynı dille bu pakette eklendi.
import { MARKA, METAL, SAHNE, TAS, KREM, LEVEL } from "../gorsel-revizyon/palet.js";
import { KATEGORI_RENK, KATEGORI_YOLLARI } from "../../components/KategoriIkon.jsx";

const K = "#0b1220";
const B = "#ffffff";
const cz = (w) => ({ stroke: K, strokeWidth: w, strokeLinejoin: "round", strokeLinecap: "round" });
const P = ({ d, w = 2 }) => <path d={d} fill="none" stroke={B} strokeWidth={w} strokeLinecap="round" />;
const yildizYol = (n, R, r, cx = 0, cy = 0) => {
  const p = [];
  for (let i = 0; i < n * 2; i += 1) {
    const a = (i * Math.PI) / n;
    const rr = i % 2 ? r : R;
    p.push(`${(cx + rr * Math.sin(a)).toFixed(2)} ${(cy - rr * Math.cos(a)).toFixed(2)}`);
  }
  return `M${p.join("L")}Z`;
};

const Kilic = ({ don }) => (
  <g transform={`rotate(${don})`}>
    <path d="M-1.9 -14.5L0 -17L1.9 -14.5V3H-1.9Z" fill={METAL.gumus.acik} {...cz(1.6)} />
    <path d="M0 -15V2" stroke={METAL.gumus.koyu} strokeWidth="1.2" />
    <path d="M-6 3H6V6H-6Z" fill={METAL.altin.orta} {...cz(1.6)} />
    <path d="M-1.6 6H1.6V12H-1.6Z" fill={SAHNE.lacivert} {...cz(1.4)} />
    <circle cx="0" cy="13.4" r="2" fill={METAL.altin.orta} {...cz(1.3)} />
  </g>
);
const Tac = ({ m = METAL.altin, tas = TAS.yakut }) => (
  <g>
    <path d="M-12 7L-13.4 -7L-6.4 -1.4L0 -11L6.4 -1.4L13.4 -7L12 7Z" fill={m.orta} />
    <path d="M-12 7L-13.4 -7L-6.4 -1.4L0 -11V7Z" fill={m.acik} />
    <path d="M-12 7L-13.4 -7L-6.4 -1.4L0 -11L6.4 -1.4L13.4 -7L12 7Z" fill="none" {...cz(1.8)} />
    <path d="M-12.6 7H12.6V11.6H-12.6Z" fill={m.koyu} {...cz(1.7)} />
    <circle cx="0" cy="2" r="2.6" fill={tas} {...cz(1.2)} />
    <circle cx="-13.4" cy="-8" r="1.8" fill={m.acik} {...cz(1)} /><circle cx="13.4" cy="-8" r="1.8" fill={m.acik} {...cz(1)} />
    <circle cx="0" cy="-12" r="1.9" fill={m.acik} {...cz(1)} />
  </g>
);
const Kisi = ({ x = 0, y = 0, s = 1, renk = KREM }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-9 12C-9 5 -5 1.6 0 1.6C5 1.6 9 5 9 12Z" fill={renk} {...cz(1.8)} />
    <circle cx="0" cy="-5" r="5.6" fill={renk} {...cz(1.8)} />
    <path d="M-3 -7.6A3.6 3.6 0 0 1 0.6 -9.4" fill="none" stroke={B} strokeWidth="1.6" strokeLinecap="round" />
  </g>
);

/** Amblem kataloğu: zemin + Sembol. `metal` (ör. lig yıldızı) seviyeden bağımsız hedef metal. */
export const AMBLEMLER = {
  yildiz: { zemin: SAHNE.mavi, Sembol: () => <><path d={yildizYol(5, 14, 6.2)} fill={METAL.altin.orta} {...cz(1.8)} /><path d={yildizYol(5, 8, 3.4, -1.4, -1.4)} fill={METAL.altin.acik} /></> },
  kupa: {
    zemin: SAHNE.kirmizi,
    Sembol: () => (
      <g>
        <path d="M-8 -9H-12C-12 -3 -10 -1 -7 0M8 -9H12C12 -3 10 -1 7 0" fill="none" {...cz(2.2)} />
        <path d="M-8 -12H8V-4C8 3 4 6 0 6C-4 6 -8 3 -8 -4Z" fill={METAL.altin.orta} {...cz(1.8)} />
        <path d="M3.4 -12H8V-4C8 2 5 5 2 5.6C4.4 2 4 -3 3.4 -12Z" fill={METAL.altin.koyu} />
        <path d="M-8 -12H8V-4C8 3 4 6 0 6C-4 6 -8 3 -8 -4Z" fill="none" {...cz(1.8)} />
        <path d="M-2 6H2V10H-2Z" fill={METAL.altin.koyu} {...cz(1.4)} />
        <path d="M-7 10H7V14H-7Z" fill={METAL.altin.koyu} {...cz(1.6)} />
        <path d="M-4.6 -9V-4" stroke={B} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    ),
  },
  kiliclar: { zemin: SAHNE.lacivert, Sembol: () => <><Kilic don={-40} /><Kilic don={40} /></> },
  alev: {
    zemin: SAHNE.mor,
    Sembol: () => (
      <g transform="translate(0 1)">
        <path d="M0 -15C7 -8 11 -3 11 3C11 10 6 14 0 14C-6 14 -11 10 -11 3C-11 -3 -7 -6 -5 -11C-3 -6 -2 -4 0 -3C1 -7 0 -11 0 -15Z" fill={MARKA.turuncu} {...cz(1.8)} />
        <path d="M0 -2C4 2 6 5 6 8C6 11 3 13 0 13C-3 13 -6 11 -6 8C-6 5 -3 3 0 -2Z" fill={METAL.altin.orta} />
        <path d="M-7 1C-7 -2 -5 -4 -4 -6" fill="none" stroke={B} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    ),
  },
  tac: { zemin: SAHNE.turkuaz, Sembol: () => <g transform="translate(0 1)"><Tac /></g> },
  bilet: {
    zemin: SAHNE.turkuaz,
    Sembol: () => (
      <g transform="rotate(-14)">
        <path d="M-13 -8H13V-3A3 3 0 0 0 13 3V8H-13V3A3 3 0 0 0 -13 -3Z" fill={MARKA.turuncu} {...cz(1.8)} />
        <path d="M-13 3V8H13V3A3 3 0 0 1 13 3Z" fill={MARKA.turuncuKoyu} opacity=".5" />
        <path d="M5 -8V8" stroke={K} strokeWidth="1.3" strokeDasharray="2 2" />
        <path d={yildizYol(5, 5.4, 2.4, -3, 0)} fill={METAL.altin.acik} {...cz(1.2)} />
        <path d="M-10.6 -5.4H-6" stroke={B} strokeWidth="1.6" strokeLinecap="round" />
      </g>
    ),
  },
  madalya: {
    zemin: SAHNE.turkuaz,
    Sembol: () => (
      <g>
        <path d="M-8 -15L-2 -3H3L-3 -15Z" fill={TAS.safir} {...cz(1.6)} />
        <path d="M8 -15L2 -3H-3L3 -15Z" fill={TAS.yakut} {...cz(1.6)} />
        <circle cx="0" cy="4" r="9.4" fill={METAL.altin.orta} {...cz(1.8)} />
        <path d="M-6.6 -2.6A9.4 9.4 0 0 1 4 -5" fill="none" stroke={METAL.altin.acik} strokeWidth="2.6" strokeLinecap="round" />
        <path d={yildizYol(5, 5, 2.2, 0, 4.4)} fill={METAL.altin.acik} {...cz(1.1)} />
      </g>
    ),
  },
  ligYildiz: {
    zemin: SAHNE.yesil,
    Sembol: ({ metal = METAL.gumus }) => (
      <g>
        <path d={yildizYol(6, 15, 7)} fill={metal.orta} {...cz(1.8)} />
        <path d={yildizYol(6, 15, 7)} fill={metal.acik} clipPath="none" transform="translate(-1.2 -1.2) scale(.55)" />
        <circle r="3.4" fill={metal.acik} {...cz(1.3)} />
      </g>
    ),
  },
  tacEfsane: { zemin: SAHNE.yesil, Sembol: () => <g transform="translate(0 1)"><Tac m={METAL.efsane} tas={TAS.ametist} /></g> },
  sehirTac: {
    zemin: SAHNE.yesil,
    Sembol: () => (
      <g>
        <path d="M0 15C-6 8 -10.4 3.4 -10.4 -2.4A10.4 10.4 0 0 1 10.4 -2.4C10.4 3.4 6 8 0 15Z" fill={MARKA.turuncu} {...cz(1.8)} />
        <path d="M-5.4 0L-6 -7L-2.6 -4.2L0 -8.6L2.6 -4.2L6 -7L5.4 0Z" fill={METAL.altin.orta} {...cz(1.3)} />
        <path d="M-6.4 -6A10 10 0 0 1 -2 -11.6" fill="none" stroke={B} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    ),
  },
  hedef: {
    zemin: MARKA.turuncuKoyu,
    Sembol: () => (
      <g>
        <circle r="13" fill={B} {...cz(1.8)} /><circle r="9" fill={TAS.yakut} {...cz(1.4)} /><circle r="5" fill={B} {...cz(1.3)} /><circle r="2" fill={TAS.yakut} />
        <path d="M13 -13L2 -2" stroke={K} strokeWidth="3.4" strokeLinecap="round" /><path d="M13 -13L2 -2" stroke={METAL.gumus.orta} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M9 -15L15 -15L15 -9Z" fill={SAHNE.mavi} {...cz(1.2)} />
      </g>
    ),
  },
  kalp: {
    zemin: MARKA.turuncuKoyu,
    Sembol: () => (
      <g transform="translate(0 1)">
        <path d="M0 12C-8 6 -13 1 -13 -5C-13 -10 -9 -13 -5 -13C-2.6 -13 -1 -11.6 0 -10C1 -11.6 2.6 -13 5 -13C9 -13 13 -10 13 -5C13 1 8 6 0 12Z" fill={METAL.gumus.orta} {...cz(1.8)} />
        <path d="M0 12C-8 6 -13 1 -13 -5C-13 -10 -9 -13 -5 -13C-2.6 -13 -1 -11.6 0 -10Z" fill={TAS.yakut} {...cz(1.8)} />
        <path d="M-9 -6C-9 -8.6 -7 -10 -5 -10" fill="none" stroke={B} strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
  },
  donus: {
    zemin: MARKA.turuncuKoyu,
    Sembol: () => (
      <g>
        <path d="M-4 -10L-13 -2L-4 6V1C3 1 8 4 10 12C12 1 6 -5 -4 -5Z" fill={B} {...cz(1.8)} />
        <path d="M-4 1C3 1 8 4 10 12C11 7 9 3 6 1Z" fill={METAL.gumus.orta} />
      </g>
    ),
  },
  ampul: {
    zemin: MARKA.turuncuKoyu,
    Sembol: () => (
      <g>
        <path d="M-5 7C-5 3 -10 0 -10 -5A10 10 0 0 1 10 -5C10 0 5 3 5 7Z" fill={KREM} {...cz(1.8)} />
        <path d="M2 -14A10 10 0 0 1 10 -5C10 0 5 3 5 7H1C1 3 6 0 6 -5C6 -9 4.4 -12 2 -14Z" fill={METAL.altin.acik} />
        <path d="M-5 7C-5 3 -10 0 -10 -5A10 10 0 0 1 10 -5C10 0 5 3 5 7Z" fill="none" {...cz(1.8)} />
        <path d="M-5 8H5V11.6H-5ZM-3.4 11.6H3.4V14.4H-3.4Z" fill={METAL.gumus.koyu} {...cz(1.5)} />
        <path d="M-6 -5A6 6 0 0 1 -2 -10" fill="none" stroke={B} strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
  },
  simsek: {
    zemin: MARKA.turuncuKoyu,
    Sembol: () => (
      <g>
        <path d="M3 -15L-10 2H-1L-4 15L10 -3H1Z" fill={B} {...cz(1.8)} />
        <path d="M1 -3H10L-4 15L-1 3Z" fill={METAL.gumus.orta} />
        <path d="M3 -15L-10 2H-1L-4 15L10 -3H1Z" fill="none" {...cz(1.8)} />
      </g>
    ),
  },
  kisiArti: {
    zemin: SAHNE.pembe,
    Sembol: () => (
      <g>
        <Kisi x={-3} y={1} />
        <circle cx="9" cy="-7" r="5.4" fill={SAHNE.yesil} {...cz(1.5)} />
        <path d="M9 -10V-4M6 -7H12" stroke={B} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    ),
  },
  kisiler: {
    zemin: SAHNE.pembe,
    Sembol: () => <g><Kisi x={-6} y={-1} s={0.78} renk={METAL.gumus.orta} /><Kisi x={6} y={-1} s={0.78} renk={METAL.gumus.orta} /><Kisi x={0} y={3} s={0.92} /></g>,
  },
  hediye: {
    zemin: SAHNE.pembe,
    Sembol: () => (
      <g>
        <path d="M-12 -4H12V14H-12Z" fill={SAHNE.mavi} {...cz(1.8)} />
        <path d="M-13.6 -9H13.6V-3H-13.6Z" fill={SAHNE.mavi} {...cz(1.8)} />
        <path d="M-2.6 -9H2.6V14H-2.6Z" fill={METAL.altin.orta} {...cz(1.4)} />
        <path d="M0 -9C-3 -15 -10 -15 -9 -11C-8 -8.6 -3 -9 0 -9C3 -9 8 -8.6 9 -11C10 -15 3 -15 0 -9Z" fill={METAL.altin.orta} {...cz(1.5)} />
        <path d="M-10 -1V8" stroke={B} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    ),
  },
  kalpler: {
    zemin: SAHNE.pembe,
    Sembol: () => (
      <g>
        <path d="M-4 9C-10 5 -13 1 -13 -3.4C-13 -7 -10 -9 -7.4 -9C-5.8 -9 -4.6 -8 -4 -6.8C-3.4 -8 -2.2 -9 -0.6 -9C2 -9 5 -7 5 -3.4C5 1 2 5 -4 9Z" fill={TAS.yakut} {...cz(1.6)} />
        <path d="M5 13C-1 9 -4 5 -4 0.6C-4 -3 -1 -5 1.6 -5C3.2 -5 4.4 -4 5 -2.8C5.6 -4 6.8 -5 8.4 -5C11 -5 14 -3 14 0.6C14 5 11 9 5 13Z" fill={SAHNE.pembe} {...cz(1.6)} />
        <path d="M-10 -3.6C-10 -5.4 -9 -6.4 -7.6 -6.6" fill="none" stroke={B} strokeWidth="1.6" strokeLinecap="round" />
      </g>
    ),
  },
  // ——— gizli rozetler (kazanılınca) — ortak zemin ametist, her birinin kendi sembolü
  rovans: {
    zemin: LEVEL.ametist.koyu,
    Sembol: () => (
      <g fill="none">
        <path d="M-10 -2A10 10 0 0 1 8 -7" stroke={K} strokeWidth="6" strokeLinecap="round" /><path d="M-10 -2A10 10 0 0 1 8 -7" stroke={B} strokeWidth="3" strokeLinecap="round" />
        <path d="M10 2A10 10 0 0 1 -8 7" stroke={K} strokeWidth="6" strokeLinecap="round" /><path d="M10 2A10 10 0 0 1 -8 7" stroke={METAL.altin.orta} strokeWidth="3" strokeLinecap="round" />
        <path d="M5 -13L11 -6L3 -3.6Z" fill={B} {...cz(1.5)} /><path d="M-5 13L-11 6L-3 3.6Z" fill={METAL.altin.orta} {...cz(1.5)} />
      </g>
    ),
  },
  kumSaati: {
    zemin: LEVEL.ametist.koyu,
    Sembol: () => (
      <g>
        <path d="M-9 -14H9V-11C9 -5 3 -2 3 0C3 2 9 5 9 11V14H-9V11C-9 5 -3 2 -3 0C-3 -2 -9 -5 -9 -11Z" fill={KREM} {...cz(1.8)} />
        <path d="M-6 11C-6 7 -1 5 0 3C1 5 6 7 6 11Z" fill={METAL.altin.orta} /><path d="M-5 -9H5C4 -6 1 -4 0 -3C-1 -4 -4 -6 -5 -9Z" fill={METAL.altin.orta} />
        <path d="M-11 -14H11M-11 14H11" stroke={K} strokeWidth="4" strokeLinecap="round" /><path d="M-11 -14H11M-11 14H11" stroke={METAL.bronz.orta} strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
  },
  pusula: {
    zemin: LEVEL.ametist.koyu,
    Sembol: () => (
      <g>
        <circle r="13" fill={KREM} {...cz(1.8)} />
        <path d="M0 -10L4 0H-4Z" fill={TAS.yakut} {...cz(1.3)} /><path d="M0 10L4 0H-4Z" fill={METAL.gumus.koyu} {...cz(1.3)} />
        <circle r="1.8" fill={METAL.altin.orta} {...cz(1)} />
        <path d="M-9 -4A9 9 0 0 1 -4 -9" fill="none" stroke={METAL.gumus.orta} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    ),
  },
  balon: {
    zemin: LEVEL.ametist.koyu,
    Sembol: () => (
      <g>
        <path d="M-13 -9A4 4 0 0 1 -9 -13H9A4 4 0 0 1 13 -9V4A4 4 0 0 1 9 8H-2L-9 14V8H-9A4 4 0 0 1 -13 4Z" fill={KREM} {...cz(1.8)} />
        <circle cx="-6" cy="-2.6" r="2" fill={SAHNE.lacivert} /><circle cx="0" cy="-2.6" r="2" fill={SAHNE.lacivert} /><circle cx="6" cy="-2.6" r="2" fill={SAHNE.lacivert} />
      </g>
    ),
  },
  takvim: {
    zemin: LEVEL.ametist.koyu,
    Sembol: () => (
      <g>
        <path d="M-12 -9H12V13H-12Z" fill={KREM} {...cz(1.8)} />
        <path d="M-12 -9H12V-3H-12Z" fill={TAS.yakut} {...cz(1.6)} />
        <path d="M-6 -13V-6M6 -13V-6" stroke={K} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M-6 5L-2 9L7 0" fill="none" stroke={TAS.zumrut} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
  soru: {
    zemin: SAHNE.lacivert,
    Sembol: () => (
      <g>
        <path d="M-7 -6C-7 -11 -3.4 -14 1 -14C6 -14 9 -10.6 9 -6.6C9 -1 2 0 2 5.4" fill="none" stroke={K} strokeWidth="7" strokeLinecap="round" />
        <path d="M-7 -6C-7 -11 -3.4 -14 1 -14C6 -14 9 -10.6 9 -6.6C9 -1 2 0 2 5.4" fill="none" stroke={METAL.altin.orta} strokeWidth="3.6" strokeLinecap="round" />
        <circle cx="2" cy="12" r="3" fill={METAL.altin.orta} {...cz(1.6)} />
      </g>
    ),
  },
};

/** Kategori ustalığı amblemi: kategori renginde zemin + kategori sembolü (krem dolgu, kontur). */
export function kategoriAmblemi(kat) {
  const d = KATEGORI_YOLLARI[kat] ?? KATEGORI_YOLLARI.karisik;
  return {
    zemin: KATEGORI_RENK[kat] ?? KATEGORI_RENK.karisik,
    Sembol: () => (
      <g transform="translate(-13.2 -13.2) scale(1.1)">
        <path d={d} fill={K} stroke={K} strokeWidth="2.6" strokeLinejoin="round" />
        <path d={d} fill={KREM} />
      </g>
    ),
  };
}

export { P as ParlamaYolu };
