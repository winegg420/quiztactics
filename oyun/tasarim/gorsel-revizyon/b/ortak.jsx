// Ajan B bölümlerinin ortak parçaları: gerçek avatarlar, boy satırı, koyu sahne, kademe seçici, iç (elenen) adaylar.
import { useMemo } from "react";
import Avatar from "../../../../src/components/Avatar.jsx";
import "./b.css";

/** 6 gerçek avatar (A10 › 5): eski + yeni setten farklı ten, kostüm ve renk. */
export const AVATARLAR = [
  "/avatars/pro2/samuray-y15.svg", "/avatars/pro2/kristal-uzayli-y28.svg", "/avatars/pro2/kedili-kiz-y37.svg",
  "/avatars/pro/tilki-k04.svg", "/avatars/pro2/basortulu-y04.svg", "/avatars/pro2/savas-robotu-y30.svg",
];
export const profil = (i, ad = "Deniz") => ({ id: `grb-${i}`, gorunen_ad: ad, gorunen_avatar: AVATARLAR[i % AVATARLAR.length] });
export const Av = ({ i = 0, boyut, ad }) => <Avatar profile={profil(i, ad)} boyut={boyut} />;

export const LIG_SIRA = ["bronz", "gumus", "altin", "elmas", "efsane"];
export const LIG_AD = { bronz: "Bronz", gumus: "Gümüş", altin: "Altın", elmas: "Elmas", efsane: "Efsane" };
export const A9 = [88, 76, 64, 48, 40];

/** ?ic=1 → içeride üretilip elenen adaylar da görünür (yalnız inceleme için; Ida'ya gösterilmez). */
export function useIc() {
  return useMemo(() => {
    try { return new URLSearchParams(window.location.search).has("ic"); } catch { return false; }
  }, []);
}

export function Sahne({ koyu = true, className = "", children }) {
  return <div className={`grb-sahne${koyu ? " grb-sahne--koyu" : ""} ${className}`.trim()}>{children}</div>;
}

/** Bir öğeyi boy etiketiyle gösterir. */
export function Boy({ px, etiket, children }) {
  return (
    <span className="grb-boy">
      <span className="grb-boy-g">{children}</span>
      <span className="grb-boy-e">{etiket ?? `${px}`}</span>
    </span>
  );
}

/** Kademe seçici çipleri (vitrin). */
export function Cipler({ liste, ad, secili, onSec, etiket }) {
  return (
    <div className="grb-cipler" role="group" aria-label={etiket}>
      {liste.map((k) => (
        <button key={k} type="button" className={`grb-cip${secili === k ? " grb-cip--secili" : ""}`} aria-pressed={secili === k} onClick={() => onSec(k)}>
          {ad[k] ?? k}
        </button>
      ))}
    </div>
  );
}

/** Başlıklı küçük alt bölüm. */
export function Alt({ baslik, children, not }) {
  return (
    <div className="grb-alt">
      <p className="grb-alt-b">{baslik}</p>
      {children}
      {not && <p className="grb-alt-not">{not}</p>}
    </div>
  );
}
