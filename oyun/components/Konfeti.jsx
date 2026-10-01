import { useEffect, useState } from "react";

// Tasarım A: renkler token'dan (coin, doğru, vurgu, bilgi, ikinci).
const RENKLER = ["var(--qt-coin)", "var(--qt-dogru)", "var(--qt-vurgu)", "var(--qt-bilgi)", "var(--qt-ikinci)"];

/**
 * Doğru cevapta kısa parçacık patlaması. Salt CSS animasyonu — kütüphane yok.
 * `prefers-reduced-motion` açıksa hiç çizilmez.
 * Stili kendi taşır: oyun/tasarim/hareket.css › .qt-konfeti (global yüklü). Kapsayıcı position:relative olmalı.
 * tur: "dusus" (varsayılan; maçta doğru cevap) · "patlama" (ödül anı: hızlı çıkar, süzülerek söner)
 */
export default function Konfeti({ aktif, adet = 14, tur = "dusus" }) {
  const [parcaciklar, setParcaciklar] = useState([]);

  useEffect(() => {
    if (!aktif) {
      setParcaciklar([]);
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const yeni = Array.from({ length: adet }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 260,
      y: -60 - Math.random() * 90,
      donme: (Math.random() - 0.5) * 540,
      renk: RENKLER[i % RENKLER.length],
      gecikme: Math.random() * 90,
      boyut: 6 + Math.random() * 6,
    }));
    setParcaciklar(yeni);
    const t = setTimeout(() => setParcaciklar([]), 1100);
    return () => clearTimeout(t);
  }, [aktif, adet]);

  if (parcaciklar.length === 0) return null;

  return (
    <div className={`qt-konfeti${tur === "patlama" ? " qt-konfeti--patlama" : ""}`} aria-hidden="true">
      {parcaciklar.map((p) => (
        <span
          key={p.id}
          style={{
            "--x": `${p.x}px`,
            "--y": `${p.y}px`,
            "--donme": `${p.donme}deg`,
            "--gecikme": `${p.gecikme}ms`,
            width: p.boyut,
            height: p.boyut * 0.6,
            background: p.renk,
          }}
        />
      ))}
    </div>
  );
}
