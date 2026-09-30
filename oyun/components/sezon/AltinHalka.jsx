/**
 * ALTIN HALKA (Sezon Yolu, 720) — Battle Pass sahibinin çerçevesinin ÜSTÜNE binen ince altın kenarlık.
 * Kullanım: CerceveliAvatar içinden (`sezonBp`); tek başına: <span style={{position:"relative"}}>…<AltinHalka boyut={64} /></span>
 * - Düz altın dolgu + koyu lacivert ince kontur; kalınlık boyuta göre (36 px'te ~1,5 px → 200 px'te 4 px).
 * - En dış kenara oturur (çerçeve çizimi değişmez, avatar çevresi temiz kalır); `pointer-events: none`, aria-hidden.
 * - `hareketli` (yalnız büyük boyut; CerceveliAvatar ≤ 48 px'te vermez): çok yavaş dönen ince parıltı (16 sn/tur).
 *   Hareketi azalt: yumuşak mod (data-yumusak → oynatma hızı 0,4) — durmaz, daha da yavaşlar; flaş yok.
 * Renk: --qt-coin (altın) + --qt-metin (lacivert). Stil: sezon.css (`sz-halka*`).
 */
import "./sezon.css";

export function halkaKalinligi(boyut) {
  if (boyut <= 48) return 1.5;
  if (boyut <= 72) return 2;
  if (boyut <= 120) return 3;
  return 4;
}

export default function AltinHalka({ boyut = 64, hareketli = false, className = "" }) {
  const altin = halkaKalinligi(boyut);
  const kontur = boyut <= 48 ? 0.75 : 1;
  const tam = altin + 2 * kontur;          // lacivert altlık (altının iki yanında kontur)
  const r = boyut / 2 - tam / 2;           // dış kenar tam boyuta oturur
  const c = boyut / 2;
  const cevre = 2 * Math.PI * r;
  return (
    <svg className={`sz-halka${className ? ` ${className}` : ""}`} width={boyut} height={boyut} viewBox={`0 0 ${boyut} ${boyut}`}
         aria-hidden="true" focusable="false">
      <circle className="sz-halka-kontur" cx={c} cy={c} r={r} strokeWidth={tam} fill="none" />
      <circle className="sz-halka-altin" cx={c} cy={c} r={r} strokeWidth={altin} fill="none" />
      {hareketli && (
        <g className="sz-halka-don" data-yumusak="" style={{ transformOrigin: `${c}px ${c}px` }}>
          <circle className="sz-halka-parilti" cx={c} cy={c} r={r} strokeWidth={altin} fill="none"
                  strokeDasharray={`${(cevre * 0.1).toFixed(2)} ${(cevre * 0.9).toFixed(2)}`} />
        </g>
      )}
    </svg>
  );
}
