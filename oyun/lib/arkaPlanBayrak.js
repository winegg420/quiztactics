// ARKA PLAN DONDURMA bayrağı (Ida, 1 Eki 2026) — tek kaynak: oyun_ayarlari.arka_plan_acik (boolean, varsayılan false).
// Oyuncu KARTININ arkasındaki sahneler (Su Altı, Yağan Kar, Sonbahar Yaprakları, Yıldızlı Gece; pa_*) bayrak false iken
// hiçbir yerde çizilmez / seçilmez / satılmaz. Kod ve veri durur; geri açmak = bayrağı true yapmak (+ pa_* aktif).
// Ayar okunana dek ve okunamazsa KAPALI sayılır: arka plan hiç parlamaz, parçacık/animasyon başlamaz.

import { useEffect, useState } from "react";
import { ayarlar } from "./ayarlar.js";

let acik = false;
let okundu = false;
const dinleyiciler = new Set();

function oku() {
  if (okundu) return;
  okundu = true;
  ayarlar()
    .then((o) => {
      const v = o?.arka_plan_acik;
      const yeni = v === true || v === "true" || v === 1;
      if (yeni !== acik) { acik = yeni; dinleyiciler.forEach((f) => f(acik)); }
    })
    .catch((e) => { okundu = false; console.warn("[Bildim] arka_plan_acik okunamadı:", e?.message ?? e); });
}

/** Eşzamanlı okuma (kanca dışı yerler). Ayar okunmadıysa false. */
export const arkaPlanAcik = () => { oku(); return acik; };

/** React kancası: arka planlar oyunda açık mı (varsayılan false). */
export function useArkaPlanAcik() {
  const [deger, setDeger] = useState(acik);
  useEffect(() => {
    oku();
    dinleyiciler.add(setDeger);
    setDeger(acik);
    return () => { dinleyiciler.delete(setDeger); };
  }, []);
  return deger;
}
