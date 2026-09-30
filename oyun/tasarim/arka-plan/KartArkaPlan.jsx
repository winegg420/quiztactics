/**
 * KART ARKA PLANI (ÖNİZLEME) — Su Altı (baloncuk), Yağan Kar, Düşen Sonbahar Yaprakları.
 * Oyuncu KARTININ arkasındaki sahne (avatarın arkasındaki eski "aura" değil). Yalnız /arka-plan-onizleme
 * kullanır; oyuna bağlanmadı, katalog/DB'ye dokunmaz. Onaydan sonra ayrı iş.
 *
 * <KartArkaPlan tur="su" hareketli yukseklik={100}>…kart içeriği…</KartArkaPlan>
 *
 * - HAREKETLİ ve SABİT aynı kompozisyon: sabit hâl, hareketli hâlin başlangıç karesidir. Her parçacığın
 *   konumu (q = dikey oran) ve fazı sabittir; hareketli hâlde animasyon-gecikme = −q × süre olduğu için
 *   ilk kare sabit hâlle aynıdır (sallanma merkezde, dönme başlangıç açısında başlar).
 * - Üç derinlik katmanı: uzak (küçük, sönük, yavaş) · orta · yakın (büyük, net, hızlı). Yalnız transform + opacity.
 * - Hareket koşulları: sekme görünür + kart ekranda + "hareketi azalt" kapalı + pil düşük değil + aynı anda
 *   en çok MAX_HAREKETLI kart (maç başı 2 + ana sayfa 1). Aksi hâlde sabit hâl. "Hareketi azalt" davranışı
 *   AZALT_DAVRANISI ile seçilir: "sabit" (varsayılan) ya da "yumusak" (oyundaki yumuşak mod: 2,5× yavaş, yarı parçacık).
 * - Yazı arkasında koyu yarı saydam okunabilirlik alanı (.abp-okuma) + parçacık maskesi (yazı bölgesinde sönük).
 * - tamGorunur = YENİ MOD — OYUNDA VARSAYILAN (30 Eyl 2026, Ida onayı); yukarıdaki eski davranış tamGorunur={false} ile birebir erişilir (önizleme anahtarı):
 *   · parçacıklar yazının, avatarın ve çerçevenin ARKASINDA (z 1 < içerik z 3); okunabilirlik alanı ve maske YOK (tam opaklık);
 *   · yönler: kar ve yapraklar yalnız yukarıdan aşağı (dönme iç öğede → yol saf dikey), baloncuklar karışık (genel yön yukarı);
 *   · hareketi azalt / pil düşük / 4. kart → hareketli hâlin donmuş karesi DEĞİL, ayrı çizilmiş özel sabit kompozisyon (sabit-tasarim.jsx).
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import "./arka-plan.css";
import "./arka-plan-tam.css";
import SabitTasarim from "./sabit-tasarim.jsx";

export const MAX_HAREKETLI = 3;
const AZALT_DAVRANISI = "sabit";   // "sabit" | "yumusak"

export const ARKA_PLANLAR = {
  su: { ad: "Su Altı", taban: "#0F6E7A", n: 30, tohum: 11 },
  kar: { ad: "Yağan Kar", taban: "#2C4F86", n: 34, tohum: 23 },
  yaprak: { ad: "Düşen Sonbahar Yaprakları", taban: "#7A3A17", n: 15, tohum: 37 },
};

function rng(tohum) {
  let a = tohum | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ara = (r, a, b) => a + r() * (b - a);
export const YAPRAK_RENK = ["#E8552F", "#F5A623", "#C8461F", "#F2C14E", "#D9731C"];

/**
 * ESKİ denemenin (yazının üstünden geçen tamGorunur) yerleşimi — artık KartArkaPlan/Yıldızlı Gece kullanmaz; yalnız önizlemede
 * gösterilmeyen Köz/Kuzey (arka-plan-yeni-ortak) içe aktarır. Parçacığı yazı bölgesinin dışına koyar. Dönen: x (% sol), y (px, üst kenar).
 * yatay: üçte biri avatar tarafında (sol şerit), üçte biri üst banta, üçte biri alt banta; parçacığın alt/üst kenarı banttan taşmaz.
 * dikey (avatar üstte, yazı altta): hepsi üst %44'te. k = lig satırı (dar bant; sol şerit sıra numarasından sonra başlar).
 * Dönen parçacıkların (kar tanesi, yaprak) sınır kutusu ≈ 1,2 s: bantlar buna göre pay bırakılarak hesaplanır.
 */
export function sabitYer(i, s, q, x, h, k, duzen) {
  if (duzen === "dikey") return { x, y: Math.max(0, h * 0.44 - s) * q };
  const bant = k ? 9 : 20;
  const oda = bant - 1.2 * s;   // üst bant: alt kenar ≤ bant
  const b = i % 3;
  if (b === 0) {
    const bas = k ? 8 : 0.07 * s; const gen = (k ? 20 : 26) - bas - 0.35 * s;   // yüzde; s px → en dar kartta (328 px) ≈ 0,31 s %
    return { x: bas + (x / 94) * gen, y: -s + q * (h + 2 * s) };
  }
  if (b === 1) return { x, y: oda >= 0 ? oda * q : oda - (1 - q) * s * 0.3 };
  return { x, y: h - bant + 0.2 * s + (oda >= 0 ? oda * q : 0) };
}

/** Parçacık listesi (tur + boyut sınıfına göre sabit; aynı girdi → aynı sahne). k = küçük satır (≈42 px). */
function parcaciklar(tur, k) {
  const cfg = ARKA_PLANLAR[tur];
  const r = rng(cfg.tohum + (k ? 100 : 0));
  const n = k ? Math.round(cfg.n * 0.55) : cfg.n;
  const olcek = k ? 0.62 : 1;
  const liste = [];
  for (let i = 0; i < n; i++) {
    const p = { q: r(), x: r() * 94, varyant: Math.floor(r() * 3), rot: 0 };
    if (tur === "su") {
      const buyuk = r() < 0.25;
      p.s = (buyuk ? ara(r, 10, 18) : ara(r, 3, 9)) * olcek;
      p.dur = ara(r, 5, 12); p.amp = ara(r, 4, 11); p.tip = "kabarcik"; p.yon = "yuk";
      p.kat = p.s < 5 * olcek ? 0 : p.s < 10 * olcek ? 1 : 2;
      p.op = [0.45, 0.72, 0.95][p.kat];
    } else if (tur === "kar") {
      const buyuk = r() < 0.42;
      p.s = (buyuk ? ara(r, 11, 23) : ara(r, 2.5, 5.5)) * olcek;
      p.dur = (buyuk ? 7 : 10) + r() * 7 + (buyuk ? 0 : 3); p.amp = ara(r, 5, 13);
      p.tip = buyuk ? "tane" : "nokta"; p.yon = "dus"; p.rot = r() * 360; p.don = ara(r, 9, 18);
      p.kat = buyuk ? (p.s < 15 * olcek ? 0 : p.s < 19 * olcek ? 1 : 2) : (p.s < 4 * olcek ? 0 : 1);
      p.op = buyuk ? [0.6, 0.82, 1][p.kat] : [0.5, 0.75][p.kat];
    } else {
      p.s = ara(r, 13, 23) * olcek;
      p.dur = ara(r, 7, 13); p.amp = ara(r, 14, 30) * (k ? 0.6 : 1); p.tip = "yaprak"; p.yon = "dus";
      p.rot = ara(r, -40, 40); p.don = ara(r, 3, 5); p.renk = YAPRAK_RENK[Math.floor(r() * 5)];
      p.kat = p.s < 16 * olcek ? 0 : p.s < 20 * olcek ? 1 : 2;
      p.op = [0.8, 0.95, 1][p.kat];
    }
    // derinlik: uzak yavaş, yakın hızlı (spec aralığı içinde kalır)
    p.dur *= [1.15, 1, 0.88][p.kat];
    p.sdur = 2.2 + r() * 2.6;
    liste.push(p);
  }
  return liste.sort((a, b) => a.kat - b.kat);   // uzak önce çizilir
}

/**
 * YENİ MOD parçacıkları (tamGorunur). Kar ve yapraklar YALNIZ aşağı iner: dönme iç öğede (dış öğe sadece dikey yol + hafif yatay sallanma),
 * başlangıç/bitiş kart dışında (döngü dikişi görünmez). Su Altı: baloncuklar kartın her yerinde, farklı zaman/boyut/hızda karışık çıkar
 * (alttan girenler · kartın içinde yumuşakça belirenler · belirip bir süre bekleyenler); genel yön yukarı. h = kart yüksekliği (px).
 */
function parcaciklarYeni(tur, k, h) {
  const cfg = ARKA_PLANLAR[tur];
  const r = rng(cfg.tohum + 500 + (k ? 100 : 0));
  const n = k ? Math.round(cfg.n * 0.55) : cfg.n;
  const olcek = k ? 0.62 : 1;
  const liste = [];
  for (let i = 0; i < n; i++) {
    const p = { q: r(), x: r() * 96, varyant: Math.floor(r() * 3), rot: 0 };
    if (tur === "su") {
      const buyuk = r() < 0.25;
      p.s = (buyuk ? ara(r, 10, 18) : ara(r, 3, 9)) * olcek;
      p.amp = ara(r, 4, 11); p.tip = "kabarcik"; p.yon = "yuk";
      p.kat = p.s < 5 * olcek ? 0 : p.s < 10 * olcek ? 1 : 2;
      p.op = [0.45, 0.72, 0.95][p.kat];
      const t3 = r();
      p.ml = t3 < 0.4 ? "gir" : t3 < 0.72 ? "belir" : "ara";
      p.y0 = p.ml === "gir" ? h + p.s : h * ara(r, 0.12, 0.9);
      p.y1 = -p.s * 1.2;
      const hiz = ara(r, 8, 22) * [0.85, 1, 1.2][p.kat];   // px/sn: küçük yavaş, büyük hızlı
      const yol = Math.max(3.5, (p.y0 - p.y1) / hiz);
      p.dur = p.ml === "ara" ? yol / 0.68 : yol;
      p.gec = -r() * p.dur;
    } else if (tur === "kar") {
      const buyuk = r() < 0.42;
      p.s = (buyuk ? ara(r, 11, 23) : ara(r, 2.5, 5.5)) * olcek;
      p.dur = (buyuk ? 7 : 10) + r() * 7 + (buyuk ? 0 : 3); p.amp = ara(r, 2, 6);
      p.tip = buyuk ? "tane" : "nokta"; p.yon = "dus"; p.rot = r() * 360; p.don = ara(r, 9, 18);
      p.kat = buyuk ? (p.s < 15 * olcek ? 0 : p.s < 19 * olcek ? 1 : 2) : (p.s < 4 * olcek ? 0 : 1);
      p.op = buyuk ? [0.6, 0.82, 1][p.kat] : [0.5, 0.75][p.kat];
    } else {
      p.s = ara(r, 13, 23) * olcek;
      p.dur = ara(r, 7, 13); p.amp = ara(r, 2, 4); p.tip = "yaprak"; p.yon = "dus";
      p.rot = ara(r, -40, 40); p.don = ara(r, 3, 5); p.renk = YAPRAK_RENK[Math.floor(r() * 5)];
      p.kat = p.s < 16 * olcek ? 0 : p.s < 20 * olcek ? 1 : 2;
      p.op = [0.8, 0.95, 1][p.kat];
    }
    if (tur !== "su") {
      p.dur *= [1.15, 1, 0.88][p.kat];
      p.y0 = -1.5 * p.s; p.y1 = h + 0.5 * p.s;   // dönen kutu tamamen kart dışında başlar/biter → döngü dikişi görünmez
      p.gec = -p.q * p.dur;
    }
    p.sdur = (tur === "su" ? 2.2 : 3.4) + r() * 2.6;
    liste.push(p);
  }
  return liste.sort((a, b) => a.kat - b.kat);   // uzak önce çizilir
}

// ------------------------- çizimler -------------------------
const TANE_KOL = [
  "M0 0V-9M0 -5L-2.6 -7.6M0 -5L2.6 -7.6M0 -2.4L-1.8 -4.2M0 -2.4L1.8 -4.2",
  "M0 0V-9M0 -6.2L-2.4 -8.4M0 -6.2L2.4 -8.4M0 -3.6L-3 -5.4M0 -3.6L3 -5.4",
  "M0 0V-8.6M-2 -7.2L0 -9.2L2 -7.2M0 -4.4L-2.6 -6M0 -4.4L2.6 -6",
];
export function Tane({ v }) {
  return (
    <svg viewBox="-10 -10 20 20" aria-hidden="true" focusable="false">
      <g stroke="#fff" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {[0, 60, 120, 180, 240, 300].map((a) => <path key={a} d={TANE_KOL[v]} transform={`rotate(${a})`} />)}
        {v === 2 && <path d="M0 -3.4L2.9 -1.7V1.7L0 3.4L-2.9 1.7V-1.7Z" strokeWidth=".9" />}
      </g>
      <circle r={v === 2 ? 0.9 : 1.5} fill="#fff" />
    </svg>
  );
}
export function Yaprak({ renk }) {
  return (
    <svg viewBox="-10 -12 20 27" aria-hidden="true" focusable="false">
      <path d="M0 -11Q9 -3 0 11Q-9 -3 0 -11Z" fill={renk} />
      <path d="M0 -11Q9 -3 0 11Z" fill="#3c1404" opacity=".22" />
      <path d="M0 -11Q-9 -3 0 11Z" fill="#fff0b0" opacity=".2" />
      <path d="M0 -11Q9 -3 0 11Q-9 -3 0 -11Z" fill="none" stroke="#5a2a10" strokeWidth="1" strokeLinejoin="round" />
      <path d="M0 -8V11M0 -3L4.4 -6.2M0 -3L-4.4 -6.2M0 2L5 -1.4M0 2L-5 -1.4M0 6.4L3.6 4M0 6.4L-3.6 4" fill="none" stroke="#5a2a10" strokeWidth=".7" opacity=".6" strokeLinecap="round" />
      <path d="M0 11L0.6 14.4" stroke="#5a2a10" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function Parcacik({ p, tur, h, sabit }) {
  const toplam = h + 2 * p.s;
  const y0 = p.yon === "dus" ? -p.s : h + p.s;
  const y1 = p.yon === "dus" ? h + p.s : -p.s;
  const yy = -p.s + p.q * toplam;   // sabit hâlde konum
  const ilerleme = p.yon === "dus" ? p.q : 1 - p.q;
  const stil = {
    left: `${p.x}%`, opacity: p.op,
    "--y0": `${y0.toFixed(1)}px`, "--y1": `${y1.toFixed(1)}px`, "--yy": `${yy.toFixed(1)}px`,
    "--dur": `${p.dur.toFixed(2)}s`, "--gec": `${(-ilerleme * p.dur).toFixed(2)}s`,
    "--amp": `${p.amp.toFixed(1)}px`, "--sdur": `${p.sdur.toFixed(2)}s`,
    "--rot": p.tip === "yaprak" ? `${p.rot.toFixed(1)}deg` : `${p.rot.toFixed(0)}`,
    "--don": `${(p.don ?? 10).toFixed(1)}s`,
    "--wgec": `${(-((p.rot + 40) / 80) * (p.don ?? 4)).toFixed(2)}s`,
  };
  let ic = null;
  if (p.tip === "kabarcik") ic = <span className={`abp-kabarcik${p.s >= 10 ? " abp-kabarcik--b" : ""}`} />;
  else if (p.tip === "nokta") ic = <span className="abp-nokta" />;
  else if (p.tip === "tane") ic = <><span className="abp-hale" /><Tane v={p.varyant} /></>;
  else ic = <Yaprak renk={p.renk} />;
  // Tek öğe, üç anahtar-kare (transform: düşme · translate: sallanma · rotate: dönme) → derinlikli parçacık başına tek katman
  return (
    <span className={`abp-d abp-d--${p.tip}`} style={{ ...stil, width: p.s, height: p.s }} data-sabit={sabit ? "" : undefined}>{ic}</span>
  );
}

/** YENİ MOD parçacığı: dış öğe yalnız dikey yol + hafif yatay sallanma (yol saf dikey); dönme İÇ öğede (rotate, translate3d'den önce uygulandığı için dış öğede yolu kaydırırdı). */
function ParcacikYeni({ p, sabit }) {
  const f = Math.min(1, Math.max(0, -p.gec / p.dur));   // dönen ilerleme: sabit kare (yalnız geçici durgunluk) bu noktada
  const stil = {
    left: `${p.x.toFixed(1)}%`, opacity: p.op,
    "--y0": `${p.y0.toFixed(1)}px`, "--y1": `${p.y1.toFixed(1)}px`, "--yy": `${(p.y0 + f * (p.y1 - p.y0)).toFixed(1)}px`,
    "--dur": `${p.dur.toFixed(2)}s`, "--gec": `${p.gec.toFixed(2)}s`,
    "--amp": `${p.amp.toFixed(1)}px`, "--sdur": `${p.sdur.toFixed(2)}s`, "--op": p.op,
    "--rot": `${p.rot.toFixed(1)}deg`, "--rotn": p.rot.toFixed(0),
    "--don": `${(p.don ?? 4).toFixed(1)}s`, "--wgec": `${(-((p.rot + 40) / 80) * (p.don ?? 4)).toFixed(2)}s`,
  };
  let ic;
  if (p.tip === "kabarcik") ic = <span className={`abp-kabarcik${p.s >= 10 ? " abp-kabarcik--b" : ""}`} />;
  else if (p.tip === "nokta") ic = <span className="abp-nokta" />;
  else if (p.tip === "tane") ic = <span className="abp-y-ic"><span className="abp-hale" /><Tane v={p.varyant} /></span>;
  else ic = <span className="abp-y-ic"><Yaprak renk={p.renk} /></span>;
  return (
    <span className={`abp-y abp-y--${p.tip}${p.ml ? ` abp-y--${p.ml}` : ""}`} style={{ ...stil, width: p.s, height: p.s }} data-sabit={sabit ? "" : undefined}>{ic}</span>
  );
}

// ------------------------- hareket koşulları -------------------------
const aktifler = new Set();

/** Hareket kararı + nedeni. statik = sabit kalma nedeni KALICI (hareketsiz kart · hareketi azalt · pil düşük · 3 kart sınırı) → yeni modda özel sabit
 *  kompozisyon gösterilir; geçici nedenlerde (sekme gizli · ekranda değil · ilk kare) parçacıklar donmuş durur, kompozisyon değişmez. */
export function useHareketAyrinti(hareketli, kok) {
  const id = useId();
  const [azalt, setAzalt] = useState(false);
  const [gorunur, setGorunur] = useState(true);
  const [ekranda, setEkranda] = useState(true);
  const [pilDusuk, setPilDusuk] = useState(false);
  const [yer, setYer] = useState(false);
  const [sinirda, setSinirda] = useState(false);

  useEffect(() => {
    let mq = null; let fn = null;
    try { mq = window.matchMedia("(prefers-reduced-motion: reduce)"); setAzalt(mq.matches); fn = () => setAzalt(mq.matches); mq.addEventListener("change", fn); } catch { /* eski tarayıcı */ }
    const gf = () => setGorunur(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", gf); gf();
    let pil = null; let pf = null;
    try {
      navigator.getBattery?.().then((b) => {
        pil = b; pf = () => setPilDusuk(!b.charging && b.level <= 0.2); pf();
        b.addEventListener("levelchange", pf); b.addEventListener("chargingchange", pf);
      }).catch(() => { /* pil bilgisi yok */ });
    } catch { /* getBattery yok */ }
    return () => {
      try { mq?.removeEventListener("change", fn); } catch { /* yut */ }
      document.removeEventListener("visibilitychange", gf);
      try { pil?.removeEventListener("levelchange", pf); pil?.removeEventListener("chargingchange", pf); } catch { /* yut */ }
    };
  }, []);

  useEffect(() => {
    if (!kok.current || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver((k) => setEkranda(k[k.length - 1].isIntersecting), { rootMargin: "40px" });
    io.observe(kok.current);
    return () => io.disconnect();
  }, [kok]);

  const iste = hareketli && gorunur && ekranda && !pilDusuk && !(azalt && AZALT_DAVRANISI === "sabit");
  useEffect(() => {
    if (!iste) { setYer(false); setSinirda(false); return undefined; }
    if (aktifler.size >= MAX_HAREKETLI) { setYer(false); setSinirda(true); return undefined; }
    setSinirda(false);
    aktifler.add(id); setYer(true);
    return () => { aktifler.delete(id); };
  }, [iste, id]);

  if (!yer) return { mod: "sabit", statik: !hareketli || pilDusuk || (azalt && AZALT_DAVRANISI === "sabit") || sinirda };
  return { mod: azalt ? "yumusak" : "oynar", statik: false };
}

export function useHareket(hareketli, kok) {
  return useHareketAyrinti(hareketli, kok).mod;
}

export default function KartArkaPlan({ tur = "su", hareketli = false, yukseklik = 100, className = "", children, katman = false, duzen = "yatay", tamGorunur = true }) {
  const kok = useRef(null);
  // katman: kart öğesinin İÇİNDE arka katman (oyundaki kartlar) — yükseklik kartınkidir, ölçülür (yukseklik = ilk tahmin)
  const [olcu, setOlcu] = useState(yukseklik);
  useEffect(() => {
    if (!katman || !kok.current || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => { const h = kok.current?.clientHeight; if (h > 0) setOlcu((o) => (Math.abs(o - h) > 2 ? h : o)); });
    ro.observe(kok.current);
    return () => ro.disconnect();
  }, [katman]);
  const yuk = katman ? olcu : yukseklik;
  const k = yuk < 60;
  const liste = useMemo(() => (tamGorunur ? parcaciklarYeni(tur, k, yuk) : parcaciklar(tur, k)), [tur, k, tamGorunur, yuk]);
  const { mod, statik } = useHareketAyrinti(hareketli, kok);
  const sabitTasarim = tamGorunur && mod === "sabit" && statik;   // yeni mod + kalıcı durgunluk → özel sabit kompozisyon
  const cfg = ARKA_PLANLAR[tur];
  return (
    <div ref={kok} className={`abp abp--${tur} abp--${mod}${k ? " abp--kucuk" : ""}${katman ? " abp--katman" : ""}${duzen === "dikey" ? " abp--dikey" : ""}${tamGorunur ? " abp--tam" : ""} ${className}`.trim()}
         style={{ "--abp-taban": cfg.taban, ...(katman ? {} : { height: yukseklik }) }} data-yumusak="" data-arka-plan={tur}>
      <span className="abp-zemin" aria-hidden="true">
        {tur === "su" && <><i className="abp-huzme abp-huzme--1" /><i className="abp-huzme abp-huzme--2" /><i className="abp-huzme abp-huzme--3" /></>}
      </span>
      <span className="abp-parca" aria-hidden="true">
        {sabitTasarim ? <SabitTasarim tur={tur} k={k} duzen={duzen} katman={katman} />
          : tamGorunur ? liste.map((p, i) => <ParcacikYeni key={i} p={p} sabit={mod === "sabit"} />)
          : liste.map((p, i) => <Parcacik key={i} p={p} tur={tur} h={yuk} sabit={mod === "sabit"} />)}
      </span>
      {!tamGorunur && <span className="abp-okuma" aria-hidden="true" />}
      {!katman && <div className="abp-icerik">{children}</div>}
    </div>
  );
}
