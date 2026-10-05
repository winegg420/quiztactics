// ============================================================
// KASA (deneysel, 950) — GÖRSEL + EFEKT PARÇALARI
//
// KasaKasasi : 955: altın kenarlı HAZİNE SANDIĞI (ahşap gövde + kubbe kapak + kilit plakası + önde dökülen altın).
//              Seviye (bos/az/orta/dolu/tavan) kapak aralığını, taşan altını ve ışığı belirler; kilit halkası sahibin
//              rengini (--ks-k) taşır. (950–954'te altın/pirinç kasa kapısıydı; sınıf adları korundu.)
// UcanParcalar: ortak küçük efekt yardımcısı — bir öğeden diğerine kavisli uçan altın / anahtar. Kaynak ve hedef
//              kök içinde [data-ks-hedef="…"] ile bulunur, koordinatlar köke göre ölçülür; hareket yalnız transform.
// KasaAcAni  : AÇ anı (kapı açılır, ışık patlar, altın skor çubuğuna uçar). Soru gösterim payının (1,5 sn) içinde biter.
// KasaAltinYagmuru: maç sonu kazanana altın yağmuru (sabit katman transform'suz; hareket içteki span'larda — iOS).
// 951: KasaGirisSahnesi (maç başı; 955: tek katman ~6 sn, 3-2-1 sandığın üstünde) · KasaFinalSahnesi (maç sonu yavaş açılış ~4 sn / kaybedende kapanış) ·
//      KasaCifteBandi (ikisi de bildi). Hepsi kök .ks-mac / .ks-bitti içinde mutlak katman.
// Kural yok: yalnız sunum. prefers-reduced-motion → parçacık/yağmur çizilmez, kapı/kadran durağan (kasa-efekt.css).
// ============================================================
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { hareketAzaltildiMi } from "../tasarim/hareket.js";
import { QtIkon, sinif } from "../tasarim/index.js";
import SayanSayi from "./SayanSayi.jsx";
import "../styles/kasa-efekt.css";

/**
 * Kasa doluluk seviyesi: bos · az · orta · dolu (· tavan).
 * 955: tavan varsa (> 0) oran tavana göre — 4 kademe: az (< 1/3) · orta (< 2/3) · dolu (< 1) · tavan (= tavan).
 * Tavansız (954 ve öncesi maç) eski ölçü: hedefe oranla < %30 az, < %60 orta, üstü dolu.
 */
export function kasaSeviye(kasa, hedef, tavan = 0) {
  const k = Math.max(0, Number(kasa) || 0);
  if (k <= 0) return "bos";
  const t = Number(tavan) || 0;
  if (t > 0) {
    const o = k / t;
    return o >= 1 ? "tavan" : o < 1 / 3 ? "az" : o < 2 / 3 ? "orta" : "dolu";
  }
  const oran = k / Math.max(1, Number(hedef) || 20);
  return oran < 0.3 ? "az" : oran < 0.6 ? "orta" : "dolu";
}

// Sandığın önüne dökülen paralar (önden arkaya y artar; arka önce çizilir). Seviye büyüdükçe eklenir.
const YIGIN = {
  az: [[100, 199], [76, 201], [124, 202]],
  orta: [[88, 193], [112, 194], [54, 203], [146, 203]],
  dolu: [[100, 186], [70, 190], [130, 190], [36, 204], [164, 204]],
  tavan: [[100, 178], [40, 196], [160, 196]],
};
const SIRA = ["az", "orta", "dolu", "tavan"];
function yiginParalari(seviye) {
  const n = SIRA.indexOf(seviye);
  if (n < 0) return [];
  return SIRA.slice(0, n + 1).flatMap((x) => YIGIN[x]).sort((a, b) => a[1] - b[1]);
}
// Ağızdaki altın tepesi (kapak aralanınca görünür) ve kenardan sarkan paralar
const TEPE = {
  az: [[100, 96]],
  orta: [[84, 95], [116, 95], [100, 90]],
  dolu: [[70, 96], [130, 96], [86, 89], [114, 89], [100, 83]],
  tavan: [[56, 96], [144, 96], [72, 88], [128, 88], [92, 80], [110, 79], [100, 72]],
};
const SARKAN = { dolu: [[66, 109], [136, 110]], tavan: [[48, 110], [66, 109], [136, 110], [154, 109], [100, 112]] };

function Para({ x, y, r = 13 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cy="3.5" rx={r} ry={r * 0.42} fill="#9a6a06" />
      <ellipse rx={r} ry={r * 0.42} fill="#ffc933" stroke="#9a6a06" strokeWidth="1.5" />
      <ellipse cy="-0.6" rx={r * 0.5} ry={r * 0.2} fill="#fff4cf" />
    </g>
  );
}

/**
 * 955: HAZİNE SANDIĞI (eski kasa kapısının yerine; sınıf adları korunur — hareketler kasa-efekt.css'te).
 * Ahşap gövde + altın kenar bantları + kubbe kapak (.ks-kasa-kapi, menteşe sol-alt) + kilit plakası (.ks-kasa-kadran) +
 * sahip rengi halkası (.ks-kasa-cerceve) + ağızda altın tepesi ve ışık (.ks-kasa-ic, kapak aralanınca görünür) +
 * önde dökülen paralar (.ks-kasa-yigin). Seviye (bos/az/orta/dolu/tavan) kapak aralığını, taşan altını ve ışığı belirler.
 * kucuk: üst şerit (dökülen paralar çizilmez).
 */
export function KasaKasasi({ seviye = "bos", kucuk = false, className }) {
  const k = useId().replace(/:/g, "");
  const paralar = yiginParalari(seviye);
  const tepe = TEPE[seviye] ?? [];
  const sarkan = SARKAN[seviye] ?? [];
  const u = (ad) => `url(#${k}${ad})`;
  const bant = (x, y, w, h) => <rect x={x} y={y} width={w} height={h} rx="2.5" fill={u("b")} stroke="#6b4206" strokeWidth="1.5" />;
  return (
    <svg className={sinif("ks-kasa", `ks-kasa--${seviye}`, className)} viewBox="0 0 200 212" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${k}a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a45a24" />
          <stop offset=".55" stopColor="#7a3f16" />
          <stop offset="1" stopColor="#4e260b" />
        </linearGradient>
        <linearGradient id={`${k}c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c0703a" />
          <stop offset=".6" stopColor="#8c4a1c" />
          <stop offset="1" stopColor="#5e2f0f" />
        </linearGradient>
        <linearGradient id={`${k}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff0a8" />
          <stop offset=".4" stopColor="#f3bf45" />
          <stop offset="1" stopColor="#a8680c" />
        </linearGradient>
        <radialGradient id={`${k}i`} cx=".5" cy=".7" r=".6">
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset=".35" stopColor="#ffd34d" stopOpacity=".9" />
          <stop offset="1" stopColor="#ffb400" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="196" rx="84" ry="9" fill="#000" opacity=".22" />
      {/* ağız: kapak aralanınca görünen iç (ışık + altın tepesi) */}
      <rect x="26" y="90" width="148" height="18" rx="4" fill="#2a1405" />
      <g className="ks-kasa-ic">
        <ellipse className="ks-kasa-isik" cx="100" cy="86" rx="92" ry="46" fill={u("i")} />
        <ellipse cx="100" cy="100" rx="70" ry="9" fill="#e9a823" stroke="#9a6a06" strokeWidth="1.5" />
        {tepe.map(([x, y], i) => <Para key={i} x={x} y={y} r={11} />)}
      </g>
      {/* gövde */}
      <rect x="24" y="100" width="152" height="88" rx="7" fill={u("a")} stroke="#3a1c06" strokeWidth="4" />
      <path d="M28 130 H172 M28 158 H172" stroke="#3a1c06" strokeOpacity=".55" strokeWidth="2.5" />
      {bant(20, 180, 160, 11)}
      {bant(42, 100, 16, 91)}
      {bant(142, 100, 16, 91)}
      {[[50, 116], [50, 172], [150, 116], [150, 172]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#7a4f0e" />)}
      {sarkan.map(([x, y], i) => <Para key={i} x={x} y={y} r={10} />)}
      {/* kapak (menteşe sol-alt; seviyeye göre aralanır) */}
      <g className="ks-kasa-kapi">
        <path d="M20 106 V72 Q20 40 54 36 H146 Q180 40 180 72 V106 Z" fill={u("c")} stroke="#3a1c06" strokeWidth="4" strokeLinejoin="round" />
        <path d="M30 70 Q32 48 58 45 H142" fill="none" stroke="#ffd9a8" strokeOpacity=".35" strokeWidth="4" strokeLinecap="round" />
        {bant(42, 37, 16, 69)}
        {bant(142, 37, 16, 69)}
        {bant(17, 96, 166, 12)}
      </g>
      {/* kilit plakası + sahip rengi halkası */}
      <g className="ks-kasa-kadran">
        <path d="M86 96 H114 V118 Q114 130 100 134 Q86 130 86 118 Z" fill={u("b")} stroke="#6b4206" strokeWidth="2.5" />
        <circle className="ks-kasa-cerceve" cx="100" cy="112" r="10" fill="none" strokeWidth="4" />
        <circle cx="100" cy="110" r="4" fill="#2a1405" />
        <path d="M97.5 112 L102.5 112 L101.5 121 L98.5 121 Z" fill="#2a1405" />
      </g>
      <path className="ks-kasa-kizil" d="M20 106 V72 Q20 40 54 36 H146 Q180 40 180 72 V106 H176 V188 H24 V106 Z" fill="#ff3b3b" />
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
 * MAÇ BAŞI giriş sahnesi — 955: TEK KATMAN, tam ekran. Soru ekranı bu sırada çizilmez (KasaPage). Sandık ekrana düşer,
 * kapak sarsılır; son 3 sn'de 3-2-1 sandığın ÜSTÜNDE sayar, her sayıda kapak zıplar. Sayım sunucu saatine bağlı:
 * bitisMs (yerel saat) = ilk sorunun gösterim başlangıcı — sahne biter bitmez soru açılır, sayaç o an başlar (kayıp süre yok).
 * gecenMs: sahnenin başından bu yana — geç gelen istemci düşüşü ortasından görür. onSayi(n): 3/2/1 (ses sayfada).
 */
export function KasaGirisSahnesi({ hedef, acmaMin, tavan = 0, carpanYazi = null, gecenMs = 0, bitisMs, onSayi, onBitti, c }) {
  // Gecikme YALNIZ ilk çizimde alınır: animasyon zaten akıyor, her karede güncellenirse iki kat hızlı biter
  const [gecikme] = useState(() => `-${Math.max(0, Math.round(gecenMs))}ms`);
  const [n, setN] = useState(null);
  const geriRef = useRef({ onSayi, onBitti });
  geriRef.current = { onSayi, onBitti };
  useEffect(() => {
    let son = null;
    let bitti = false;
    const tik = () => {
      if (bitti) return;
      const kalan = (Number(bitisMs) - Date.now()) / 1000;
      if (!(kalan > 0)) { bitti = true; setN(null); geriRef.current.onBitti?.(); return; }
      const yeni = kalan <= 3 ? Math.ceil(kalan) : null;
      if (yeni !== son) { son = yeni; setN(yeni); if (yeni) geriRef.current.onSayi?.(yeni); }
    };
    tik();
    const z = setInterval(tik, 80);
    return () => clearInterval(z);
  }, [bitisMs]);
  return (
    <div className={sinif("ks-giris-an", n && "ks-giris-an--sayim")} role="status" aria-live="polite" style={{ "--ks-gec": gecikme }}>
      <span className="ks-giris-isik" aria-hidden="true" />
      <b className="ks-giris-baslik">{c("KASA")}</b>
      <span className="ks-giris-sayac" aria-live="assertive">
        {n ? <b key={n} className="ks-giris-sayi qt-sayi">{n}</b> : <span className="ks-giris-hazir">{c("Hazır ol!")}</span>}
      </span>
      <div className="ks-giris-kasa" aria-hidden="true">
        <span className="ks-giris-halka" />
        {/* her sayıda kapak zıplar (anahtar değişince içteki animasyon yeniden başlar) */}
        <span className="ks-giris-zipla" key={n ?? 0}><KasaKasasi seviye="orta" /></span>
      </div>
      <span className="ks-giris-hedef">
        <QtIkon ad="hedef" boyut={18} />
        {c("Hedef")} <b className="qt-sayi">{hedef}</b> {c("puan")}
      </span>
      {tavan > 0 && (
        <span className="ks-giris-not">
          {carpanYazi ? c("Kasa en çok {t} · DEVAM {x}", { t: tavan, x: carpanYazi }) : c("Kasa en çok {t}", { t: tavan })}
        </span>
      )}
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
        <KasaKasasi seviye="tavan" />
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
