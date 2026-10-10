// Quiz Tactics tasarım sistemi — BOŞ DURUM GÖRSELLERİ (10 Eki 2026, ekran revizyonu Aşama 1).
// QtBosDurum'un isteğe bağlı `gorsel` prop'u bunları çizer; prop verilmeyen kullanımlar etkilenmez.
// Çizgi: lacivert kontur, düz renk + tek gölge (.qt-bos-sahne-g › drop-shadow), turuncu vurgu, mor yok.
// tarz="sahne" → küçük sahne (A) · tarz="rozet" → büyük karakterli ikon rozeti (B).
import QtIkon from "./Ikon.jsx";

const L = "#1d2152";     // --qt-metin (kontur)
const T = "#ff7a2e";     // --qt-vurgu
const M = "#3b91e8";     // --qt-bilgi
const MA = "#e0efff";    // --qt-bilgi-acik
const Y = "#2fd27a";     // --qt-dogru
const Z2 = "#a3cdf5";    // --qt-zemin-2 (yer gölgesi)
const C = "#b0cdf0";     // --qt-cizgi
const K = { stroke: L, strokeWidth: 4, strokeLinejoin: "round", strokeLinecap: "round" };

// Resmi Q işareti yolu (Ikon.jsx › QtQIsareti ile aynı çizim)
const Q_YOL = "M56 10C28 10 10 29 10 58s18 48 46 48c10 0 19-2 27-7l12 11h21L94 88c7-8 10-18 10-30 0-29-19-48-48-48Zm0 23c15 0 25 10 25 25S71 83 56 83 33 73 33 58s8-25 23-25Z";
const Q_KUYRUK = "m73 78 21 10 15 15H94L69 85Z";

const Yer = ({ rx = 58 }) => <ellipse cx="90" cy="110" rx={rx} ry="6" fill={Z2} />;

/** Piyon (oyun taşı): Arkadaşlar sahnesi. bos=true → kesik çizgili boş yuva + "+". */
function Piyon({ x, renk, bos = false }) {
  const kesik = bos ? { strokeDasharray: "7 6", fill: "rgba(255,255,255,.55)" } : { fill: renk };
  return (
    <g>
      <rect x={x - 21} y="90" width="42" height="12" rx="6" {...K} {...kesik} />
      <path d={`M${x - 15} 92C${x - 15} 77 ${x - 8} 68 ${x - 6} 64H${x + 6}C${x + 8} 68 ${x + 15} 77 ${x + 15} 92Z`} {...K} {...kesik} />
      <circle cx={x} cy="48" r="14" {...K} {...kesik} />
      {bos ? (
        <path d={`M${x} 70v14M${x - 7} 77h14`} stroke={T} strokeWidth="5" strokeLinecap="round" fill="none" />
      ) : (
        <path d={`M${x - 6} 42a8 8 0 0 1 7-5`} stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
      )}
    </g>
  );
}

const SAHNELER = {
  // Kitap açık, temiz soru kartı yukarı fırlamış + yeşil onay
  hatalarim: () => (
    <>
      <Yer />
      <g className="qt-bos-sahne-g">
        <path d="M24 50v52c22-6 46-6 66 4 20-10 44-10 66-4V50" fill={T} {...K} />
        <path d="M90 50c-16-9-40-10-60-4v50c20-6 44-5 60 4Z" fill="#fff" {...K} />
        <path d="M90 50c16-9 40-10 60-4v50c-20-6-44-5-60 4Z" fill="#fff" {...K} />
      </g>
      <path d="M42 62q18-4 36 0M42 74q18-4 36 0M102 62q18-4 36 0M102 74q18-4 36 0" stroke={C} strokeWidth="4" strokeLinecap="round" fill="none" />
      <g className="qt-bos-sahne-g" transform="rotate(-8 90 26)">
        <rect x="66" y="8" width="48" height="34" rx="8" fill="#fff" {...K} />
        <path d="M76 20h28M76 30h18" stroke={C} strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx="118" cy="14" r="12" fill={Y} {...K} />
      <path d="m112 14 4 4 8-8" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M44 22v8M40 26h8M146 30v8M142 34h8" stroke={T} strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),
  // İki konuşma balonu + kâğıt uçak
  mesajlar: () => (
    <>
      <Yer rx={60} />
      <g className="qt-bos-sahne-g">
        <path d="M40 24h60a14 14 0 0 1 14 14v18a14 14 0 0 1-14 14H58l-14 12v-12h-4a14 14 0 0 1-14-14V38a14 14 0 0 1 14-14Z" fill="#fff" {...K} />
        <path d="M84 60h56a14 14 0 0 1 14 14v12a14 14 0 0 1-14 14h-4v12l-14-12H84a14 14 0 0 1-14-14V74a14 14 0 0 1 14-14Z" fill={M} {...K} />
      </g>
      <circle cx="54" cy="47" r="4.5" fill={L} /><circle cx="70" cy="47" r="4.5" fill={L} /><circle cx="86" cy="47" r="4.5" fill={L} />
      <path d="M90 80h44" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d="M132 14l26-6-10 26-6-10Z" fill={T} {...K} strokeWidth="3.5" />
      <path d="M142 24l-12 10" stroke={L} strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),
  // Uyuyan zil (z z)
  bildirimler: () => (
    <>
      <Yer rx={50} />
      <g className="qt-bos-sahne-g">
        <circle cx="90" cy="96" r="9" fill={T} {...K} />
        <path d="M90 22c-21 0-33 16-33 37v17l-11 13h88l-11-13V59c0-21-12-37-33-37Z" fill={M} {...K} />
        <circle cx="90" cy="18" r="7" fill={T} {...K} />
      </g>
      <path d="M72 46c2-8 7-13 14-15" stroke={MA} strokeWidth="5" strokeLinecap="round" fill="none" />
      <text x="126" y="44" fontSize="22" fontWeight="900" fill={L} fontFamily="'Baloo 2', system-ui, sans-serif">z</text>
      <text x="140" y="28" fontSize="16" fontWeight="900" fill={L} fontFamily="'Baloo 2', system-ui, sans-serif">z</text>
      <text x="151" y="16" fontSize="12" fontWeight="900" fill={L} fontFamily="'Baloo 2', system-ui, sans-serif">z</text>
    </>
  ),
  // Mavi piyon (sen) + iki boş yuva
  arkadaslar: () => (
    <>
      <Yer rx={70} />
      <Piyon x={40} bos />
      <g className="qt-bos-sahne-g"><Piyon x={90} renk={M} /></g>
      <Piyon x={140} bos />
    </>
  ),
  // Kaybolmuş soru kartı (Q işaretli) + at hamlesi oku
  bulunamadi: () => (
    <>
      <Yer rx={62} />
      <path d="M28 98V46h34" stroke={T} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 10" fill="none" />
      <circle cx="28" cy="98" r="7" fill={T} {...K} strokeWidth="3.5" />
      <path d="M60 36l16 10-16 10Z" fill={T} {...K} strokeWidth="3.5" />
      <g className="qt-bos-sahne-g" transform="rotate(12 120 60)">
        <rect x="90" y="18" width="60" height="82" rx="10" fill="#fff" {...K} />
        <g transform="translate(99 37) scale(.4)">
          <g transform="translate(7 -1) skewX(-7)">
            <path d={Q_YOL} fillRule="evenodd" fill={L} />
            <path d={Q_KUYRUK} fill={T} />
          </g>
        </g>
        <path d="M102 90h36" stroke={C} strokeWidth="4" strokeLinecap="round" />
      </g>
      <text x="152" y="22" fontSize="24" fontWeight="900" fill={L} fontFamily="'Baloo 2', system-ui, sans-serif">?</text>
    </>
  ),
};

// Rozet (B) — her görselin karakter ikonu + köşe işareti + ton (renk rolleri: eylem turuncu, ben/bilgi mavi)
const ROZETLER = {
  hatalarim: { ikon: "kitap", ek: "onay", ton: "vurgu" },
  mesajlar: { ikon: "sohbet", ek: "gonder", ton: "bilgi" },
  bildirimler: { ikon: "zil", ek: "ay", ton: "bilgi" },
  arkadaslar: { ikon: "kisiler", ek: "arti", ton: "bilgi" },
  bulunamadi: { ikon: "haritaPini", ek: "soru", ton: "vurgu" },
};

export const BOS_GORSEL_ADLARI = Object.keys(SAHNELER);

/** <BosGorsel ad="mesajlar" tarz="sahne|rozet" /> — bilinmeyen ad → null (çağıran ikon diskine düşer). */
export default function BosGorsel({ ad, tarz = "sahne" }) {
  if (tarz === "rozet") {
    const r = ROZETLER[ad];
    if (!r) return null;
    return (
      <span className={`qt-bos-rozet qt-bos-rozet--${r.ton}`} aria-hidden="true">
        <QtIkon ad={r.ikon} boyut={52} />
        <span className="qt-bos-rozet-ek"><QtIkon ad={r.ek} boyut={18} /></span>
      </span>
    );
  }
  const Sahne = SAHNELER[ad];
  if (!Sahne) return null;
  return (
    <svg className="qt-bos-sahne" viewBox="0 0 180 120" width="180" height="120" aria-hidden="true" focusable="false">
      <Sahne />
    </svg>
  );
}
