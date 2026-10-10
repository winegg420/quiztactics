// ============================================================
// ÖDÜL PATLAMASI — Sezon Yolu ve Görevler ortak ödül alma anı (10 Eki 2026).
//
//   await odulPatlat({ kaynak: kutuEl, tur: "coin" });   // tur: coin | elmas | sp | joker
//
// Kutudan 7 ikon sahnedeki coin hapına uçar (yalnız transform/opacity, Web Animations API), kısa konfeti,
// destekleyen telefonda kısa titreşim, uçuş bitince hap zıplar. Bakiye sayacı CoinHapi › useSayanDeger ile
// eski değerden yeniye sayar — çağıran ödül alındıktan sonra coinTazele() çağırır (tek doğru değer sunucudan).
// Birden çok çağrı SIRAYLA ve kısaltılmış oynar (kuyruk). Hareketi azalt: uçuş/konfeti yok, anında biter.
// Katman <OdulPatlamasiKatmani/> QtSahne içinde takılıdır; katman yoksa çağrı hemen çözülür.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CoinIkon, ElmasIkon } from "../../components/ParaIkonlari.jsx";
import { konfetiYukle } from "../../components/MacSonuLottie.jsx";
import { QT_SAHNE_COIN_HAPI } from "./QtSahne.jsx";
import { ziplat } from "../hareket.js";

const OLAY = "qt-odul-patlat";
const PARCA = 7;
let katmanSayisi = 0;
let kuyruk = Promise.resolve();

export function hareketAzaltildi() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

/** Kısa titreşim (destek yoksa sessizce atlanır). */
export function titret(ms = 30) {
  try { if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(ms); } catch { /* yok */ }
}

/** Küçük konfeti; origin: ekran oranı {x,y}. */
export function kisaKonfeti(origin = { x: 0.5, y: 0.4 }, adet = 40) {
  if (hareketAzaltildi()) return;
  konfetiYukle()
    .then((c) => {
      try {
        const s = getComputedStyle(document.documentElement);
        const colors = ["--qt-coin", "--qt-vurgu", "--qt-dogru", "--qt-ikinci"].map((t) => s.getPropertyValue(t).trim()).filter(Boolean);
        c({ particleCount: adet, spread: 70, startVelocity: 32, ticks: 120, scalar: 0.9, gravity: 1.2, origin, colors: colors.length ? colors : undefined, disableForReducedMotion: true, zIndex: 1300 });
      } catch { /* çizilemedi */ }
    })
    .catch(() => { /* konfeti yüklenemedi: anı sürer */ });
}

/** Ödül anını kuyruğa ekler; bittiğinde çözülür. kisa: art arda alımlarda daha kısa uçuş. */
export function odulPatlat({ kaynak = null, tur = "coin", kisa = false } = {}) {
  const is = kuyruk.then(() => new Promise((coz) => {
    titret(30);
    if (!katmanSayisi || hareketAzaltildi()) { coz(); return; }
    let bitti = false;
    const son = () => { if (!bitti) { bitti = true; coz(); } };
    try { window.dispatchEvent(new CustomEvent(OLAY, { detail: { kaynak, tur, kisa, son } })); } catch { son(); }
    setTimeout(son, 1600);   // güvenlik: katman sökülürse kuyruk kilitlenmesin
  }));
  kuyruk = is.catch(() => {});
  return is;
}

function Ikon({ tur }) {
  if (tur === "elmas") return <ElmasIkon boyut={20} />;
  if (tur === "sp") return <span className="qt-op-sp">SP</span>;
  return <CoinIkon boyut={20} />;
}

/** QtSahne içinde bir kez takılır. */
export function OdulPatlamasiKatmani() {
  const [is, setIs] = useState(null);
  const kokRef = useRef(null);

  useEffect(() => {
    katmanSayisi += 1;
    const dinle = (e) => setIs({ ...e.detail, id: Date.now() + Math.random() });
    window.addEventListener(OLAY, dinle);
    return () => { katmanSayisi -= 1; window.removeEventListener(OLAY, dinle); };
  }, []);

  useEffect(() => {
    if (!is) return undefined;
    const kok = kokRef.current;
    let hedef = null;
    try { hedef = (document.querySelector(QT_SAHNE_COIN_HAPI) ?? document.querySelector(".bd-coin-hap"))?.getBoundingClientRect(); } catch { /* yok */ }
    const a = is.kaynak?.getBoundingClientRect?.();
    const x0 = a ? a.left + a.width / 2 : window.innerWidth / 2;
    const y0 = a ? a.top + a.height / 2 : window.innerHeight / 2;
    kisaKonfeti({ x: x0 / window.innerWidth, y: y0 / window.innerHeight }, is.kisa ? 20 : 40);
    if (!kok || !hedef || !hedef.width) { is.son(); setIs(null); return undefined; }
    const x1 = hedef.left + hedef.width / 2;
    const y1 = hedef.top + hedef.height / 2;
    const sure = is.kisa ? 480 : 700;
    const animler = [...kok.children].map((el, i) => {
      const aci = (i / PARCA) * Math.PI * 2;
      const sx = Math.cos(aci) * 34, sy = Math.sin(aci) * 26 - 10;
      return el.animate([
        { transform: `translate(${x0}px, ${y0}px) scale(.4)`, opacity: 0 },
        { transform: `translate(${x0 + sx}px, ${y0 + sy}px) scale(1.1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${x1}px, ${y1}px) scale(.6)`, opacity: 0.9 },
      ], { duration: sure, delay: i * (is.kisa ? 25 : 45), easing: "cubic-bezier(.5,0,.3,1)", fill: "both" });
    });
    let iptal = false;
    Promise.all(animler.map((x) => x.finished.catch(() => {}))).then(() => {
      if (iptal) return;
      ziplat(QT_SAHNE_COIN_HAPI);
      is.son();
      setIs(null);
    });
    return () => { iptal = true; animler.forEach((x) => { try { x.cancel(); } catch { /* yok */ } }); is.son(); };
  }, [is]);

  if (!is) return null;
  return createPortal(
    <div className="qt-op-kok" ref={kokRef} aria-hidden="true">
      {Array.from({ length: PARCA }, (_, i) => <span key={`${is.id}:${i}`} className="qt-op-parca"><Ikon tur={is.tur} /></span>)}
    </div>,
    document.body,
  );
}
