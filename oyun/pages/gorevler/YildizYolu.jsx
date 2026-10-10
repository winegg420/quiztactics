// Yıldız yolu: görev sayısı kadar yıldız düğümü + çizgi + sonda sandık düğümü. Yanan (alınmış) görev = yeşil yıldız ve dolu çizgi.
// Çizgi dolumu scaleX (transform) ile; hareketi azalt'ta anında (CSS).
import { QtIkon, sinif } from "../../tasarim/index.js";
import { tt } from "../../lib/dil.js";

function Yildiz() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" focusable="false" aria-hidden="true">
      <path d="M12 2.8l2.8 6 6.5.8-4.8 4.5 1.3 6.5L12 17.4l-5.8 3.2 1.3-6.5L2.7 9.6l6.5-.8Z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export default function YildizYolu({ toplam, yanan, sandikYanik, sandikAcik, metin, parlayan }) {
  const dugumler = Array.from({ length: toplam }, (_, i) => i);
  return (
    <div className="gk-yol" role="group" aria-label={metin}>
      <div className="gk-yol-sira" aria-hidden="true">
        {dugumler.map((i) => (
          <span key={i} className="gk-yol-parca">
            <span className={sinif("gk-dugum", i < yanan && "gk-dugum--yanik", parlayan === i && "gk-dugum--parla")}><Yildiz /></span>
            <span className={sinif("gk-cizgi", i < yanan && "gk-cizgi--dolu")} />
          </span>
        ))}
        <span className={sinif("gk-dugum gk-dugum--sandik", sandikYanik && "gk-dugum--altin", sandikAcik && "gk-dugum--acik")}><QtIkon ad="sandik" boyut={22} /></span>
      </div>
      <p className="gk-yol-metin">{metin}</p>
    </div>
  );
}

export const yolMetni = (kalan) => (kalan === 1 ? tt("1 yıldız daha, sandık açılır") : tt("{n} yıldız daha, sandık açılır", { n: kalan }));
