/**
 * ZAFER EFEKTİ (540) — kazananın maç sonu sahnesine eklenen efekt katmanı. TEMBEL yüklenir
 * (MacSonuKutlama React.lazy ile, sahnenin sakin anında: aşamalar + Lottie kurulumları bittikten sonra).
 * Rakip de görür: kaybeden ekranında rakibin avatarının yanında küçük boyutta ("Rakibin zaferi").
 *
 * <ZaferEfekti ef="zafer_havai_fisek" boyut="buyuk|kucuk" />
 * - Yalnız CSS (transform/opacity), ≤ 30 öğe, tek sefer (~3,5 sn) oynar ve söner; ses yok (sahne sesleri aynen).
 * - prefers-reduced-motion: durağan birkaç parça, hareket yok.
 * - Kök `position:absolute`, tıklamayı geçirir; iOS: fixed yok.
 * Görseller Noto Emoji 3D (Apache 2.0): public/kozmetik/ (havai-fisek, coin, ejder-alev, alev, kar-tanesi,
 * kayan-yildiz, yildiz).
 */
import { useMemo } from "react";
import { hareketAzaltildiMi } from "../tasarim/hareket.js";
import { kozmetikTemasi } from "../lib/kozmetik.js";
import { tt } from "../lib/dil.js";
import "../tasarim/ekranlar/zafer-efekti.css";

// Deterministik sözde rastgele (her çizimde aynı yerleşim; Math.random yok → titreme yok)
const r = (i, t) => {
  const x = Math.sin(i * 127.1 + t * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const GORSEL = {
  "havai-fisek": "/kozmetik/havai-fisek.webp",
  "altin-yagmuru": "/kozmetik/coin.webp",
  "ejder-alevi": "/kozmetik/alev.webp",
  "kar-firtinasi": "/kozmetik/kar-tanesi.webp",
  "yildiz-yagmuru": "/kozmetik/kayan-yildiz.webp",
};
const RENKLER = ["#ffd54a", "#ff6fae", "#7fd4ff", "#a3f0b0", "#ffb86b", "#e6c8ff"];

function parcalar(tema, kucuk) {
  const n = kucuk ? 0.5 : 1;
  const liste = [];
  if (tema === "havai-fisek") {
    const patlama = [[22, 28, 0], [76, 20, 450], [50, 46, 900]];
    patlama.forEach(([x, y, g], p) => {
      liste.push({ tur: "flas", x, y, g });
      const kivilcim = kucuk ? 6 : 10;
      for (let i = 0; i < kivilcim; i++) {
        const a = (i / kivilcim) * Math.PI * 2 + p;
        const R = (kucuk ? 34 : 78) * (0.75 + r(i, p) * 0.35);
        liste.push({ tur: "kivilcim", x, y, g: g + 60, dx: Math.cos(a) * R, dy: Math.sin(a) * R, renk: RENKLER[(i + p) % RENKLER.length] });
      }
    });
  } else if (tema === "ejder-alevi") {
    liste.push({ tur: "ejder", g: 100 });
    const alev = Math.round(9 * n) || 4;
    for (let i = 0; i < alev; i++) liste.push({ tur: "yuksel", x: 8 + (84 / alev) * i + r(i, 1) * 6, g: 250 + r(i, 2) * 900, s: 1300 + r(i, 3) * 700, olcek: 0.7 + r(i, 4) * 0.6, gorsel: GORSEL[tema] });
  } else {
    // Yağmur türleri: yukarıdan düşer (kar ve yıldız çapraz)
    const adet = Math.round((tema === "kar-firtinasi" ? 16 : tema === "altin-yagmuru" ? 14 : 10) * n) || 5;
    const capraz = tema === "kar-firtinasi" ? 60 : tema === "yildiz-yagmuru" ? -140 : 0;
    for (let i = 0; i < adet; i++) {
      liste.push({
        tur: "dus", x: (100 / adet) * i + r(i, 5) * (100 / adet), g: r(i, 6) * 1100, s: 1500 + r(i, 7) * 900,
        dx: capraz * (0.6 + r(i, 8) * 0.8) * (kucuk ? 0.4 : 1), don: (r(i, 9) - 0.5) * 540,
        olcek: 0.65 + r(i, 10) * 0.55, gorsel: GORSEL[tema],
      });
    }
    if (tema === "yildiz-yagmuru") {
      for (let i = 0; i < (kucuk ? 3 : 6); i++) liste.push({ tur: "parilti", x: 10 + r(i, 11) * 80, y: 10 + r(i, 12) * 60, g: 200 + r(i, 13) * 1600, gorsel: "/kozmetik/yildiz.webp" });
    }
  }
  return liste;
}

export default function ZaferEfekti({ ef, boyut = "buyuk", etiket = false, className = "", yol: yolVerilen, en: enVerilen }) {
  const tema = kozmetikTemasi(ef);
  const kucuk = boyut === "kucuk";
  const az = useMemo(() => hareketAzaltildiMi(), []);
  const liste = useMemo(() => (tema ? parcalar(tema, kucuk) : []), [tema, kucuk]);
  if (!tema) return null;
  // Düşüş yolu ve genişlik (px): büyükte ekran, küçükte kutu; önizleme kutusu kendi ölçüsünü verir
  let yol = 160;
  let en = 132;
  try {
    if (!kucuk) { yol = Math.round((window.innerHeight || 800) * 1.15); en = Math.round(window.innerWidth || 390); }
  } catch { /* sunucu çizimi yok */ }
  if (yolVerilen) yol = yolVerilen;
  if (enVerilen) en = enVerilen;
  return (
    <>
    <div className={`qt-zafer qt-zafer--${boyut}${az ? " qt-zafer--az" : ""} ${className}`} data-zafer={tema}
         style={{ "--zf-yol": `${yol}px`, "--zf-en": `${en}px` }} aria-hidden="true">
      {liste.map((p, i) => {
        const stil = {
          "--x": p.x != null ? `${p.x}%` : undefined, "--y": p.y != null ? `${p.y}%` : undefined,
          "--g": `${Math.round(p.g ?? 0)}ms`, "--s": p.s ? `${Math.round(p.s)}ms` : undefined,
          "--dx": p.dx != null ? `${p.dx.toFixed(1)}px` : undefined, "--dy": p.dy != null ? `${p.dy.toFixed(1)}px` : undefined,
          "--don": p.don != null ? `${p.don.toFixed(0)}deg` : undefined, "--olcek": p.olcek ?? 1, "--renk": p.renk,
        };
        if (p.tur === "kivilcim") return <span key={i} className="qt-zf qt-zf--kivilcim" style={stil} />;
        if (p.tur === "flas") return <span key={i} className="qt-zf qt-zf--flas" style={stil} />;
        if (p.tur === "ejder") return <img key={i} className="qt-zf qt-zf--ejder" src="/kozmetik/ejder-alev.webp" alt="" style={stil} decoding="async" />;
        return <img key={i} className={`qt-zf qt-zf--${p.tur}`} src={p.gorsel} alt="" style={stil} decoding="async" />;
      })}
    </div>
    {/* Etiket kırpılan kutunun DIŞINDA (kutu yuvarlak + overflow hidden); ebeveyn position:relative */}
    {etiket && <span className="qt-zafer-etiket">{tt("Rakibin zaferi")}</span>}
    </>
  );
}
