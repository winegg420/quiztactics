/**
 * YÜKSELEN KÖZ (ÖNİZLEME) — dipten yanan ateş ışığı; alttan yukarı süzülüp sönen közler. Eski avatar-arkası "kor" çiziminin
 * (dip ışıması + arkada soluk, önde parlak közler) kart formu. Yalnız /arka-plan-onizleme kullanır.
 * Sabit hâl = hareketli hâlin ilk karesi (konum --yy, opaklık konuma göre hesaplı; animasyon-gecikme = −t × süre).
 * Yalnız transform + opacity anime edilir; parçacık başına tek öğe; en çok 26 köz.
 */
import { useMemo } from "react";
import YeniSahne, { rng, ara } from "./arka-plan-yeni-ortak.jsx";

export const AD = "Yükselen Köz";
export const TABAN = "#3A1208";
const N = 26;
const RENKLER = [["#FF7A2F", "255,122,47"], ["#FFB020", "255,176,32"], ["#FF4B1F", "255,75,31"], ["#FFD27A", "255,210,122"]];

/** Yükselirken görünürlük: hızlı doğar (%10), üstte sönerek kaybolur — keyframe ile aynı eğri. */
const gorunurluk = (t) => (t < 0.1 ? t / 0.1 : t < 0.55 ? 1 - (0.15 * (t - 0.1)) / 0.45 : 0.85 * (1 - (t - 0.55) / 0.45));

function kozler(k, h) {
  const r = rng(k ? 5107 : 4051);
  const n = k ? Math.round(N * 0.55) : N;
  const olcek = k ? 0.62 : 1;
  const liste = [];
  for (let i = 0; i < n; i++) {
    const u = r();
    const kat = u < 0.4 ? 0 : u < 0.75 ? 1 : 2;            // 0 uzak · 1 orta · 2 yakın
    const s = [ara(r, 2, 3.2), ara(r, 3.2, 4.6), ara(r, 4.6, 6)][kat] * olcek;
    const dur = [ara(r, 9, 11), ara(r, 7, 9), ara(r, 5, 7)][kat];   // yakın hızlı, uzak yavaş
    const amp = [ara(r, 6, 9), ara(r, 8, 12), ara(r, 10, 14)][kat] * (k ? 0.7 : 1);
    const op = [0.7, 0.9, 1][kat];
    const t = Math.pow(r(), 1.25);                            // 0 = dipte, 1 = tepede (dibe biraz daha yoğun)
    const renk = RENKLER[Math.floor(r() * RENKLER.length)];
    const toplam = h + 2 * s;
    liste.push({
      kat, s, dur, amp, op, t, renk, x: r() * 94, sdur: ara(r, 1.8, 3.6),
      y0: h + s, y1: -s, yy: h + s - t * toplam, gl: [4, 6, 8][kat] * (k ? 0.7 : 1),
    });
  }
  return liste.sort((a, b) => a.kat - b.kat);                // uzak önce çizilir
}

export default function KozArkaPlan({ hareketli = false, yukseklik = 100, className = "", children, katman = false, duzen = "yatay" }) {
  const k = yukseklik < 60;
  const liste = useMemo(() => kozler(k, yukseklik), [k, yukseklik]);
  return (
    <YeniSahne tur="kor" katman={katman} duzen={duzen} taban={TABAN} hareketli={hareketli} yukseklik={yukseklik} className={className}
      zemin={<i className="abp-kor-isima" />}
      parcalar={liste.map((p, i) => (
        <span key={i} className="abp-kor-koz" style={{
          left: `${p.x.toFixed(1)}%`, width: p.s, height: p.s, opacity: +(p.op * gorunurluk(p.t)).toFixed(3),
          "--op": p.op, "--kz": p.renk[0], "--kzg": `rgba(${p.renk[1]},.9)`, "--gl": `${p.gl.toFixed(1)}px`,
          "--y0": `${p.y0.toFixed(1)}px`, "--y1": `${p.y1.toFixed(1)}px`, "--yy": `${p.yy.toFixed(1)}px`,
          "--dur": `${p.dur.toFixed(2)}s`, "--gec": `${(-p.t * p.dur).toFixed(2)}s`,
          "--amp": `${p.amp.toFixed(1)}px`, "--sdur": `${p.sdur.toFixed(2)}s`,
        }} />
      ))}>
      {children}
    </YeniSahne>
  );
}
