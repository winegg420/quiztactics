/**
 * LİG AMBLEMİ (premium önizlemeden; 560'tan beri oyunda da) — isim yanında duran küçük lig rozeti
 * (Bronz · Gümüş · Altın · Elmas · Efsane); çerçeveden bağımsız. ekler.jsx'ten ayrı dosya: oyun ana paketi
 * yalnız bunu alır (altın plaka önizleme parçasında kalır). ekler.jsx aynı adlarla yeniden dışa verir.
 */
import { useId } from "react";
import { tt } from "../../lib/dil.js";

export const LIGLER = ["bronz", "gumus", "altin", "elmas", "efsane"];
export const LIG_ADI = { bronz: "Bronz", gumus: "Gümüş", altin: "Altın", elmas: "Elmas", efsane: "Efsane" };

const METAL = {
  bronz: ["#ffd9ae", "#c47a3a", "#6b3410", "#3a1a06"],
  gumus: ["#ffffff", "#c9d1dc", "#6a7688", "#2c3442"],
  altin: ["#fff3b8", "#f5c04a", "#9a5e08", "#4a2e04"],
  elmas: ["#eafdff", "#6ad6ff", "#1e6aa8", "#0a2a52"],
  efsane: ["#ffe0ff", "#c05aff", "#5a0a9a", "#26063f"],
};

function Sembol({ lig, m }) {
  switch (lig) {
    case "bronz":
      return <path d="M7.4 13.6L12 10.4L16.6 13.6" fill="none" stroke={m[3]} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />;
    case "gumus":
      return <path d="M7.4 11.4L12 8.2L16.6 11.4M7.4 15.6L12 12.4L16.6 15.6" fill="none" stroke={m[3]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />;
    case "altin":
      return <path d="M12 6.6L13.6 10.2L17.4 10.5L14.5 13L15.4 16.8L12 14.8L8.6 16.8L9.5 13L6.6 10.5L10.4 10.2Z" fill="#fffbe6" stroke={m[3]} strokeWidth="1" strokeLinejoin="round" />;
    case "elmas":
      return (
        <g stroke={m[3]} strokeWidth=".8" strokeLinejoin="round">
          <path d="M8.2 9.4L10 7.4H14L15.8 9.4L12 16.4Z" fill="#f4feff" />
          <path d="M8.2 9.4H15.8M10 7.4L11 9.4L12 16.4L13 9.4L14 7.4" fill="none" />
        </g>
      );
    default:
      return (
        <g stroke={m[3]} strokeWidth=".8" strokeLinejoin="round">
          <path d="M7.4 14.8L6.8 8.6L9.6 11L12 6.8L14.4 11L17.2 8.6L16.6 14.8Z" fill="#fff0ff" />
          <circle cx="12" cy="6.4" r="1" fill="#ffe27a" />
        </g>
      );
  }
}

/** Küçük lig amblemi (kalkan). boyut px. */
export function LigAmblemi({ lig = "bronz", boyut = 20, className = "" }) {
  const hamId = useId();
  const id = `la${hamId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const l = LIGLER.includes(lig) ? lig : "bronz";
  const m = METAL[l];
  return (
    <svg className={`pp-amblem ${className}`.trim()} width={boyut} height={boyut} viewBox="0 0 24 24" role="img" aria-label={tt("{lig} Lig", { lig: tt(LIG_ADI[l]) })}>
      <defs>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2=".3" y2="1">
          <stop offset="0" stopColor={m[0]} /><stop offset=".45" stopColor={m[1]} /><stop offset="1" stopColor={m[2]} />
        </linearGradient>
      </defs>
      {l === "efsane" && <path d="M4.2 8.4L.8 6.6L2.4 11.6L.9 14.4L4.4 14.6ZM19.8 8.4L23.2 6.6L21.6 11.6L23.1 14.4L19.6 14.6Z" fill={m[1]} stroke={m[3]} strokeWidth=".6" strokeLinejoin="round" />}
      <path d="M12 1.4L20.6 4.8V11.4C20.6 16.6 17 20.8 12 22.4C7 20.8 3.4 16.6 3.4 11.4V4.8Z" fill={`url(#${id}m)`} stroke={m[3]} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M12 3.3L18.8 6V11.3C18.8 15.4 16 18.8 12 20.3C8 18.8 5.2 15.4 5.2 11.3V6Z" fill="none" stroke="#fff" strokeWidth=".6" opacity=".55" />
      <path d="M5.4 6.2L12 3.5V20.1C8 18.6 5.4 15.2 5.4 11.2Z" fill="#fff" opacity=".14" />
      <Sembol lig={l} m={m} />
    </svg>
  );
}
