// ============================================================
// KASA (deneysel, 950) — GÖRSEL + EFEKT PARÇALARI
//
// KasaKasasi : altın/pirinç kasa (SVG kapı + kadran + önünde altın yığını). Seviye (bos/az/orta/dolu) büyüklüğü ve
//              yığını belirler; çerçeve halkası sahibin rengini (--ks-k) taşır.
// UcanParcalar: ortak küçük efekt yardımcısı — bir öğeden diğerine kavisli uçan altın / anahtar. Kaynak ve hedef
//              kök içinde [data-ks-hedef="…"] ile bulunur, koordinatlar köke göre ölçülür; hareket yalnız transform.
// KasaAcAni  : AÇ anı (kapı açılır, ışık patlar, altın skor çubuğuna uçar). Soru gösterim payının (1,5 sn) içinde biter.
// KasaAltinYagmuru: maç sonu kazanana altın yağmuru (sabit katman transform'suz; hareket içteki span'larda — iOS).
// 951: KasaGirisSahnesi (maç başı ~3 sn) · KasaFinalSahnesi (maç sonu yavaş açılış ~4 sn / kaybedende kapanış) ·
//      KasaCifteBandi (ikisi de bildi). Hepsi kök .ks-mac / .ks-bitti içinde mutlak katman.
// Kural yok: yalnız sunum. prefers-reduced-motion → parçacık/yağmur çizilmez, kapı/kadran durağan (kasa-efekt.css).
// ============================================================
import { useId, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { hareketAzaltildiMi } from "../tasarim/hareket.js";
import { QtIkon, sinif } from "../tasarim/index.js";
import SayanSayi from "./SayanSayi.jsx";
import "../styles/kasa-efekt.css";

/** Kasa doluluk seviyesi (hedefe oranla): bos · az · orta · dolu. */
export function kasaSeviye(kasa, hedef) {
  const k = Math.max(0, Number(kasa) || 0);
  if (k <= 0) return "bos";
  const oran = k / Math.max(1, Number(hedef) || 20);
  return oran < 0.3 ? "az" : oran < 0.6 ? "orta" : "dolu";
}

// Yığındaki paralar (önden arkaya y artar; arka önce çizilir). Seviye büyüdükçe eklenir.
const YIGIN = {
  az: [[100, 197], [72, 199], [128, 200]],
  orta: [[86, 189], [114, 190], [56, 201], [144, 201]],
  dolu: [[100, 178], [72, 186], [128, 186], [40, 203], [160, 203], [100, 168]],
};
function yiginParalari(seviye) {
  if (seviye === "bos") return [];
  const l = [...YIGIN.az];
  if (seviye !== "az") l.push(...YIGIN.orta);
  if (seviye === "dolu") l.push(...YIGIN.dolu);
  return l.sort((a, b) => a[1] - b[1]);
}

function Para({ x, y, r = 13 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cy="3.5" rx={r} ry={r * 0.42} fill="#9a6a06" />
      <ellipse rx={r} ry={r * 0.42} fill="#ffc933" stroke="#9a6a06" strokeWidth="1.5" />
      <ellipse cy="-0.6" rx={r * 0.5} ry={r * 0.2} fill="#fff4cf" />
    </g>
  );
}

const CIVATA = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
  return [Math.cos(a) * 47, Math.sin(a) * 47];
});
const CENTIK = Array.from({ length: 12 }, (_, i) => (i / 12) * 360);

/**
 * Kasa görseli. seviye: bos|az|orta|dolu · kucuk: yığın sadeleşir (üst şerit).
 * Hareket sınıfları dışarıdan (ks-kadran--…) gelir; SVG'nin kendisi durağandır.
 */
export function KasaKasasi({ seviye = "bos", kucuk = false, className }) {
  const k = useId().replace(/:/g, "");
  const paralar = yiginParalari(seviye);
  return (
    <svg className={sinif("ks-kasa", `ks-kasa--${seviye}`, className)} viewBox="0 0 200 212" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${k}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe48f" />
          <stop offset=".45" stopColor="#f0b434" />
          <stop offset="1" stopColor="#b0720f" />
        </linearGradient>
        <radialGradient id={`${k}k`} cx=".38" cy=".32" r=".8">
          <stop offset="0" stopColor="#fff3bf" />
          <stop offset=".5" stopColor="#f3bf45" />
          <stop offset="1" stopColor="#bf8215" />
        </radialGradient>
        <radialGradient id={`${k}i`} cx=".5" cy=".55" r=".6">
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset=".4" stopColor="#ffd34d" />
          <stop offset="1" stopColor="#5c3a05" />
        </radialGradient>
      </defs>
      <rect x="40" y="176" width="26" height="16" rx="5" fill="#6b4206" />
      <rect x="134" y="176" width="26" height="16" rx="5" fill="#6b4206" />
      <rect x="16" y="12" width="168" height="170" rx="26" fill={`url(#${k}g)`} stroke="#5c3a05" strokeWidth="5" />
      <rect x="28" y="24" width="144" height="146" rx="18" fill="none" stroke="#fff4cf" strokeOpacity=".45" strokeWidth="3" />
      <rect x="9" y="58" width="13" height="26" rx="4" fill="#7a4f0e" />
      <rect x="9" y="112" width="13" height="26" rx="4" fill="#7a4f0e" />
      <circle className="ks-kasa-cerceve" cx="100" cy="97" r="66" fill="none" strokeWidth="9" />
      {/* iç (kapı açılınca görünür): ışık + altın */}
      <g className="ks-kasa-ic">
        <circle cx="100" cy="97" r="56" fill={`url(#${k}i)`} />
        <Para x={86} y={122} r={11} /><Para x={114} y={124} r={11} /><Para x={100} y={114} r={11} />
      </g>
      <g className="ks-kasa-kapi">
        <circle cx="100" cy="97" r="56" fill={`url(#${k}k)`} stroke="#6b4206" strokeWidth="4" />
        {CIVATA.map(([x, y], i) => <circle key={i} cx={100 + x} cy={97 + y} r="4" fill="#8a5a10" />)}
        <g className="ks-kasa-kadran">
          {[90, 210, 330].map((a) => {
            const r = (a * Math.PI) / 180;
            return (
              <g key={a}>
                <line x1={100 + Math.cos(r) * 26} y1={97 + Math.sin(r) * 26} x2={100 + Math.cos(r) * 41} y2={97 + Math.sin(r) * 41}
                      stroke="#6b4206" strokeWidth="5" strokeLinecap="round" />
                <circle cx={100 + Math.cos(r) * 42} cy={97 + Math.sin(r) * 42} r="5.5" fill="#fff4cf" stroke="#6b4206" strokeWidth="2.5" />
              </g>
            );
          })}
          <circle cx="100" cy="97" r="25" fill="#fff4cf" stroke="#6b4206" strokeWidth="3.5" />
          {CENTIK.map((a) => {
            const r = (a * Math.PI) / 180;
            return <line key={a} x1={100 + Math.cos(r) * 18} y1={97 + Math.sin(r) * 18} x2={100 + Math.cos(r) * 22} y2={97 + Math.sin(r) * 22} stroke="#8a5a10" strokeWidth="2" />;
          })}
          <line x1="100" y1="97" x2="100" y2="80" stroke="#c93030" strokeWidth="4" strokeLinecap="round" />
          <circle cx="100" cy="97" r="5" fill="#6b4206" />
        </g>
        <ellipse cx="80" cy="66" rx="20" ry="9" fill="#fff" opacity=".35" transform="rotate(-28 80 66)" />
      </g>
      <rect className="ks-kasa-kizil" x="16" y="12" width="168" height="170" rx="26" fill="#ff3b3b" />
      {!kucuk && <g className="ks-kasa-yigin">{paralar.map(([x, y], i) => <Para key={i} x={x} y={y} />)}</g>}
    </svg>
  );
}

/**
 * Ortak efekt yardımcısı: kaynak öğeden hedef öğeye uçan parçalar.
 * kokRef: ölçüm kökü (position: relative; bu bileşen onun içinde .ks-efekt katmanında çizilir).
 * tur: "coin" | "anahtar" · gecikme/sure ms · dagilim: çıkışta saçılma yarıçapı (px).
 */
export function UcanParcalar({ kokRef, kaynak, hedef, adet = 6, tur = "coin", gecikme = 0, sure = 760, dagilim = 36 }) {
  const [p, setP] = useState(null);
  useLayoutEffect(() => {
    try {
      const kok = kokRef?.current;
      if (!kok || hareketAzaltildiMi()) return;
      const a = kok.querySelector(`[data-ks-hedef="${kaynak}"]`);
      const b = kok.querySelector(`[data-ks-hedef="${hedef}"]`);
      if (!a || !b) return;
      const r0 = kok.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const x0 = ra.left + ra.width / 2 - r0.left, y0 = ra.top + ra.height / 2 - r0.top;
      const dx = rb.left + rb.width / 2 - r0.left - x0, dy = rb.top + rb.height / 2 - r0.top - y0;
      setP({
        x0, y0,
        liste: Array.from({ length: adet }, (_, i) => ({
          i,
          sx: (Math.random() * 2 - 1) * dagilim,
          sy: -10 - Math.random() * dagilim,
          dx: dx + (Math.random() * 2 - 1) * 6,
          dy: dy + (Math.random() * 2 - 1) * 4,
          gec: gecikme + i * Math.min(45, 360 / Math.max(1, adet)),
        })),
      });
    } catch (e) {
      console.warn("[Bildim] kasa efekti ölçülemedi:", e?.message ?? e);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return null;
  return p.liste.map((q) => (
    <span key={q.i} className={`ks-ucan ks-ucan--${tur}`}
          style={{ left: p.x0, top: p.y0, "--sx": `${q.sx}px`, "--sy": `${q.sy}px`, "--dx": `${q.dx}px`, "--dy": `${q.dy}px`,
                   animationDelay: `${q.gec}ms`, animationDuration: `${sure}ms` }}>
      {tur === "anahtar" ? "🔑" : null}
    </span>
  ));
}

/** AÇ anı katmanı (sahnenin üstünde, ~1,5 sn). */
export function KasaAcAni({ deger, benim, seviye, c }) {
  return (
    <div className={sinif("ks-ac-an", benim ? "ks-ac-an--ben" : "ks-ac-an--rakip")} aria-hidden="true">
      <span className="ks-ac-isin" />
      <span className="ks-ac-flas" />
      <div className="ks-ac-kasa" data-ks-hedef="ac-kasa">
        <KasaKasasi seviye={seviye === "bos" ? "az" : seviye} />
      </div>
      <b className="ks-ac-yazi">
        {benim ? c("KASA AÇILDI!") : c("Rakip kasayı açtı!")}
        <span className="qt-sayi">+{deger}</span>
      </b>
    </div>
  );
}

// Merkezden dışa saçılan altın (giriş/final patlaması): açı + mesafe + gecikme önceden (yalnız sunum)
function patlamaParcalari(adet, menzil) {
  return Array.from({ length: adet }, (_, i) => {
    const a = (i / adet) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const r = menzil * (0.55 + Math.random() * 0.45);
    return { i, x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r * 0.8 - 20), gec: Math.round(Math.random() * 140),
             boy: Math.round(12 + Math.random() * 10), don: Math.round((Math.random() * 2 - 1) * 420) };
  });
}
function Patlama({ adet = 18, menzil = 150, className }) {
  const p = useMemo(() => patlamaParcalari(adet, menzil), [adet, menzil]);
  return (
    <span className={sinif("ks-patlama", className)} aria-hidden="true">
      {p.map((q) => (
        <i key={q.i} style={{ "--x": `${q.x}px`, "--y": `${q.y}px`, "--don": `${q.don}deg`, width: q.boy, height: q.boy,
                              animationDelay: `${q.gec}ms` }} />
      ))}
    </span>
  );
}

/**
 * MAÇ BAŞI giriş sahnesi (3-2-1'den sonra, ~3 sn): kasa ekranın ortasına iner, kilit çözülür gibi parlar (kadran
 * döner, halka ışığı), "KASA" yazısı ve hedef puan. Kök .ks-mac içinde mutlak katman (fixed değil — iOS).
 * gecenMs: sahnenin başından bu yana (sunucu saatiyle) — geç gelen istemci sahnenin ortasından katılır.
 */
export function KasaGirisSahnesi({ hedef, acmaMin, gecenMs = 0, c }) {
  // Gecikme YALNIZ ilk çizimde alınır: animasyon zaten akıyor, her karede güncellenirse iki kat hızlı biter
  const [gecikme] = useState(() => `-${Math.max(0, Math.round(gecenMs))}ms`);
  return (
    <div className="ks-giris-an" role="status" aria-live="polite" style={{ "--ks-gec": gecikme }}>
      <span className="ks-giris-isik" aria-hidden="true" />
      <div className="ks-giris-kasa" aria-hidden="true">
        <span className="ks-giris-halka" />
        <KasaKasasi seviye="orta" />
      </div>
      <b className="ks-giris-baslik">{c("KASA")}</b>
      <span className="ks-giris-hedef">
        <QtIkon ad="hedef" boyut={18} />
        {c("Hedef")} <b className="qt-sayi">{hedef}</b> {c("puan")}
      </span>
      {acmaMin > 0 && <span className="ks-giris-not">{c("Kasa en az {m} olunca açılabilir", { m: acmaMin })}</span>}
    </div>
  );
}

/**
 * MAÇ SONU açılış sahnesi (~4 sn, yavaşlatılmış). Kazanan: kadran yavaş döner, kapı yavaş açılır, içeriden ışık,
 * altın patlaması, skor hedefe sayarak ulaşır, ekran titrer. Kaybeden: rakibin kasası kapanır ve kararır.
 * Sonra sayfa MacSonuKutlama'ya geçer (süre sayfada). Kural yok: yalnız sunum.
 */
export function KasaFinalSahnesi({ kazandim, puanOnce, puanSonra, hedef, deger, c }) {
  const [sayi, setSayi] = useState(puanOnce);
  useLayoutEffect(() => {
    const t = setTimeout(() => setSayi(puanSonra), hareketAzaltildiMi() ? 0 : kazandim ? 2350 : 1500);
    return () => clearTimeout(t);
  }, [puanSonra, kazandim]);
  return (
    <div className={sinif("ks-final", kazandim ? "ks-final--kazandi" : "ks-final--kaybetti")} role="status" aria-live="polite">
      <span className="ks-final-isin" aria-hidden="true" />
      <div className="ks-final-kasa" aria-hidden="true">
        <KasaKasasi seviye="dolu" />
        {kazandim && <Patlama adet={24} menzil={170} className="ks-final-patlama" />}
      </div>
      <b className="ks-final-baslik">
        {kazandim ? c("KASA AÇILDI!") : c("Kasa rakibe açıldı")}
        {deger > 0 && <span className="qt-sayi">+{deger}</span>}
      </b>
      <span className="ks-final-skor qt-sayi" aria-label={c("{a} / {h} puan", { a: puanSonra, h: hedef })}>
        <SayanSayi deger={sayi} sure={900} /><small>/{hedef}</small>
      </span>
    </div>
  );
}

/** İkisi de bilince "ÇİFTE" patlama bandı (sonuç fazının başında, ~1,3 sn). */
export function KasaCifteBandi({ artis, c }) {
  return (
    <div className="ks-cifte" aria-hidden="true">
      <span className="ks-cifte-isin" />
      <b className="ks-cifte-yazi">{c("ÇİFTE!")} <span className="qt-sayi">+{artis}</span></b>
      <Patlama adet={12} menzil={120} className="ks-cifte-patlama" />
    </div>
  );
}

/** Maç sonu altın yağmuru (kazanan). Sabit katman body'ye portal; transform yalnız içteki parçalarda. */
export function KasaAltinYagmuru({ adet = 26 }) {
  const parcalar = useMemo(() => Array.from({ length: adet }, (_, i) => ({
    i,
    x: Math.round((i / adet) * 100 + (Math.random() * 6 - 3)),
    gec: 600 + Math.round(Math.random() * 1100),
    sure: Math.round(1500 + Math.random() * 900),
    don: Math.round((Math.random() * 2 - 1) * 540),
    boy: Math.round(16 + Math.random() * 14),
  })), [adet]);
  if (typeof document === "undefined" || hareketAzaltildiMi()) return null;
  return createPortal(
    <div className="ks-yagmur" aria-hidden="true">
      {parcalar.map((p) => (
        <span key={p.i} style={{ left: `${p.x}%`, width: p.boy, height: p.boy, "--don": `${p.don}deg`,
                                 animationDelay: `${p.gec}ms`, animationDuration: `${p.sure}ms` }} />
      ))}
    </div>,
    document.body,
  );
}
