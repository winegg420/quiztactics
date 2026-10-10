// Görevler sandığı — elle çizilmiş SVG hazine sandığı (kapalı / açık). Kapak ayrı grup: açılınca yukarı kalkıp eğilir (yalnız transform).
// Dışarıdan lisanslı görsel gerekmez; renkler token'dan (kahverengi ahşap dışında) — ahşap tonları bu dosyaya özgü.
import { sinif } from "../../tasarim/index.js";

export default function Sandik({ acik = false, className }) {
  return (
    <svg className={sinif("gk-sd", acik && "gk-sd--acik", className)} viewBox="0 0 200 170" focusable="false" aria-hidden="true">
      {/* gövde */}
      <rect x="24" y="82" width="152" height="72" rx="10" fill="#9a5424" stroke="#3d1f0c" strokeWidth="5" />
      <path d="M26 106h148M26 130h148" stroke="#7a3f17" strokeWidth="3" fill="none" />
      <rect x="44" y="82" width="16" height="72" fill="var(--qt-coin)" stroke="var(--qt-coin-dudak)" strokeWidth="3" />
      <rect x="140" y="82" width="16" height="72" fill="var(--qt-coin)" stroke="var(--qt-coin-dudak)" strokeWidth="3" />
      {/* içindeki altın (yalnız açıkken görünür) */}
      <g className="gk-sd-altin">
        <path d="M32 86Q58 54 100 60Q142 54 168 86Z" fill="var(--qt-coin)" stroke="var(--qt-coin-dudak)" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="74" cy="76" r="9" fill="var(--qt-coin-acik)" stroke="var(--qt-coin-dudak)" strokeWidth="3" />
        <circle cx="104" cy="70" r="10" fill="var(--qt-coin-acik)" stroke="var(--qt-coin-dudak)" strokeWidth="3" />
        <circle cx="132" cy="78" r="8" fill="var(--qt-coin-acik)" stroke="var(--qt-coin-dudak)" strokeWidth="3" />
        <path d="M56 80l7-9 7 9-7 7Z" fill="var(--qt-dogru)" stroke="var(--qt-dogru-dudak)" strokeWidth="3" strokeLinejoin="round" />
      </g>
      {/* kapak */}
      <g className="gk-sd-kapak">
        <path d="M18 86V66Q18 22 62 22H138Q182 22 182 66V86Z" fill="#b4622b" stroke="#3d1f0c" strokeWidth="5" strokeLinejoin="round" />
        <path d="M30 52Q34 36 62 34H138Q166 36 170 52" stroke="#d98a4c" strokeWidth="4" fill="none" strokeLinecap="round" />
        <rect x="44" y="24" width="16" height="60" fill="var(--qt-coin)" stroke="var(--qt-coin-dudak)" strokeWidth="3" />
        <rect x="140" y="24" width="16" height="60" fill="var(--qt-coin)" stroke="var(--qt-coin-dudak)" strokeWidth="3" />
      </g>
      {/* kilit (açılınca solar) */}
      <g className="gk-sd-kilit">
        <rect x="86" y="68" width="28" height="30" rx="6" fill="var(--qt-coin)" stroke="var(--qt-coin-dudak)" strokeWidth="4" />
        <circle cx="100" cy="82" r="4" fill="var(--qt-coin-yazi)" />
        <path d="M100 84v7" stroke="var(--qt-coin-yazi)" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
