// Maç akışı tanı günlüğü (15 Eki 2026) — YALNIZ tanı modunda (?tani=1 ya da sessionStorage bd_tani / bd_ses_tani = "1").
// Tek liste: window.__akis = [{ t (Date.now), olay, ...ek }]. Faz anları (sunucu), ekranda görünen an (yazı/animasyon
// başlangıç-bitiş), puanın hazineye eklendiği an, sayaç başlangıcı ve sesler (istendi / çaldı / iptal) aynı listeye düşer;
// araclar/hazine-akis-olcum.mjs çakışma tablosunu buradan ve sayfa dışı ölçümden çıkarır. Kapalıyken hiçbir şey yazmaz.
import { sesTaniAcik } from "./ses.js";

let acik = null;
export function akisAcik() {
  if (acik == null) acik = sesTaniAcik();
  return acik;
}

/** Olay yaz (tanı kapalıysa hiçbir şey yapmaz). */
export function akis(olay, ek) {
  if (!akisAcik()) return;
  try { (window.__akis ||= []).push({ t: Date.now(), olay, ...(ek || {}) }); } catch { /* tanı kritik değil */ }
}
