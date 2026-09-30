/**
 * YILDIZLI GECE (ÖNİZLEME) — dikey gece gradyanı, hilal, soluk gök bandı, tepeler; yavaş parıldayan noktalar ve dört köşeli
 * parıltılar, arada bir kayan yıldız. Eski avatar-arkası "gece" çiziminin (hilal + tepeler + yıldızlar + kayan yıldız) kart formu.
 * Sabit hâl = hareketli hâlin ilk karesi (parıltı fazı −f × süre; kayan yıldız yolun %9'unda donmuş). Yalnız transform + opacity.
 * 20 nokta + 7 parıltı + 1 kayan yıldız = 28.
 */
import { useMemo } from "react";
import YeniSahne, { rng, ara, yumusakEgri, sabitYer } from "./arka-plan-yeni-ortak.jsx";

export const AD = "Yıldızlı Gece";
export const TABAN = "#0E1440";
const N_NOKTA = 20;
const N_PARILTI = 7;
const KAYAN_DUR = 11;
const KAYAN_FAZ = 0.09;   // sabit kare: kayan yıldızın yolu ne kadar aldığı (keyframe %9)

function yildizlar(k) {
  const r = rng(k ? 8123 : 7019);
  const olcek = k ? 0.7 : 1;
  const nn = k ? Math.round(N_NOKTA * 0.6) : N_NOKTA;
  const np = k ? Math.round(N_PARILTI * 0.6) : N_PARILTI;
  const liste = [];
  for (let i = 0; i < nn; i++) {
    const f = r();
    const sdur = ara(r, 2, 5);
    liste.push({
      tip: "nokta", x: r() * 96, y: r() * 68, s: ara(r, 1.5, 3) * olcek, sdur, f,
      renk: r() < 0.7 ? "#FFFFFF" : "#FFF1B8",
      op: +(0.35 + 0.65 * yumusakEgri(f)).toFixed(3),
    });
  }
  for (let i = 0; i < np; i++) {
    const f = r();
    liste.push({
      tip: "parilti", x: 3 + r() * 90, y: 4 + r() * 62, s: ara(r, 6, 12) * olcek, sdur: ara(r, 2.6, 5), f,
      renk: r() < 0.5 ? "#FFFFFF" : "#FFF1B8",
      op: +(0.35 + 0.65 * yumusakEgri(f)).toFixed(3),
    });
  }
  return liste;
}

const PARILTI_YOL = "M0 -5L1.1 -1.1L5 0L1.1 1.1L0 5L-1.1 1.1L-5 0L-1.1 -1.1Z";

export default function YildizliGeceArkaPlan({ hareketli = false, yukseklik = 100, className = "", children, katman = false, duzen = "yatay", tamGorunur = false }) {
  const k = yukseklik < 60;
  const liste = useMemo(() => yildizlar(k), [k]);
  const zemin = (
    <>
      <i className="abp-gece-bant" />
      <i className="abp-gece-hale" />
      <svg className="abp-gece-ay" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M11 1.5a8.6 8.6 0 1 0 7.5 12.6a6.7 6.7 0 1 1 -7.5 -12.6Z" fill="#FFF4C8" />
      </svg>
      <svg className="abp-gece-tepe" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M0 22Q20 8 40 20T76 14T100 18V40H0Z" fill="#232C7A" opacity=".95" />
        <path d="M0 32Q28 22 56 31T100 27V40H0Z" fill="#0A0F30" />
      </svg>
    </>
  );
  return (
    <YeniSahne tur="gece" tamGorunur={tamGorunur} katman={katman} duzen={duzen} taban={TABAN} hareketli={hareketli} yukseklik={yukseklik} className={className} zemin={zemin}
      parcalar={(sabitTam) => (
        <>
          {liste.map((p, i) => {
            // tamGorunur + sabit: yıldız yazı bölgesinin dışına yerleşir (sabitYer)
            const yer = sabitTam ? sabitYer(i, p.s, p.y / 68, p.x, yukseklik, k, duzen) : null;
            return (
            <span key={i} className={`abp-gece-yildiz abp-gece-yildiz--${p.tip}`} style={{
              left: `${(yer ? yer.x : p.x).toFixed(1)}%`, top: yer ? `${yer.y.toFixed(1)}px` : `${p.y.toFixed(1)}%`, width: p.s, height: p.s, opacity: p.op,
              "--yr": p.renk, "--sdur": `${p.sdur.toFixed(2)}s`, "--gec": `${(-p.f * p.sdur).toFixed(2)}s`,
            }}>
              {p.tip === "parilti" && (
                <svg viewBox="-5 -5 10 10" aria-hidden="true" focusable="false"><path d={PARILTI_YOL} fill={p.renk} /></svg>
              )}
            </span>
            );
          })}
          {!(sabitTam && k) && <span className="abp-gece-kayan" style={{ "--kdur": `${KAYAN_DUR}s`, "--kgec": `${(-KAYAN_FAZ * KAYAN_DUR).toFixed(2)}s` }} />}
        </>
      )}>
      {children}
    </YeniSahne>
  );
}
