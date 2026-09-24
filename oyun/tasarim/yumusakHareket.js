// ============================================================
// YUMUŞAK HAREKET MODU (Ida, 24 Eyl 2026) — "Hareketi azalt" açık oyuncu için TEK ORTAK İLKE.
//
// Önce: prefers-reduced-motion: reduce → çerçeve, aura, isim parıltısı, maç sonu tamamen DURUYORDU.
// Şimdi: hareket durmaz, YUMUŞAR:
//   · hız   — kozmetik animasyonları YUMUSAK.hiz (0,4 → 2,5× uzun süre) ile oynar (bu dosya, JS)
//   · azlık — parçacıkların yarısı gizli (CSS, her dosyanın @media (prefers-reduced-motion: reduce) bloğu)
//   · genlik — titreme/kanat/takla gibi büyük salınımlar küçük anahtar karelerle (CSS, "-y" sonekli)
//   · KAPANAN: ani ışık çakmaları (Şimşek çakması, çevreyi aydınlatan flaş), cızırtı/yanıp sönme,
//     ekran sarsıntısı, hızlı patlama ve konfeti (maç sonu coin/yıldız patlaması, konfeti).
// WebGL çerçeveler (tur2/motor.js) aynı katsayıyı kullanır (zaman × hiz, u_yumusak ile çakma yok).
// Maç sonu (MacSonuKutlama) sahneyi atlamaz; yavaş giriş, Lottie yarı hızda, patlama/konfeti yok.
//
// Nasıl: CSS süreleri tek tek değiştirilmez. Kapsamdaki (YUMUSAK_KAPSAM) bir öğede CSS animasyonu
// başlayınca (animationstart, belgede tek dinleyici) o animasyonun playbackRate'i YUMUSAK.hiz olur.
// Böylece her dosya kendi süresini korur, yumuşak modda hepsi aynı oranda yavaşlar. Kapsam dışındaki
// animasyonlara (oyun içi zamanlamalar, animationend bekleyen akışlar) DOKUNULMAZ. Ayar değişirse
// (telefonda anahtar) çalışan animasyonlar anında güncellenir. Hareketi azalt kapalıyken hiçbir şey yapmaz.
// ============================================================

export const YUMUSAK = {
  /** Oynatma hızı katsayısı: 0,4 → her hareket 2,5× uzun sürer. */
  hiz: 0.4,
};

const SORGU = "(prefers-reduced-motion: reduce)";

/** Yumuşak hareket kapsamı: premium çerçeve/aura, WebGL çerçeve kabı, eski çerçeve + aura, Altın Lig
 *  "Çizgi", elmas paketi, isim efekti/plakalar, maç sonu sahnesi (yumuşak modda) ve elle işaretlenen yerler. */
export const YUMUSAK_KAPSAM = ".pc, .p2, .qt-cerceve, .dc, .ep, .qt-isim-ef, .p2-plaka, .pp-plaka, .msk--yumusak, [data-yumusak]";

/** "Hareketi azalt" açık mı → yumuşak mod. */
export function yumusakMu() {
  try {
    return typeof window !== "undefined" && window.matchMedia(SORGU).matches;
  } catch {
    return false;
  }
}

function oranYaz(anim, oran) {
  try {
    if (anim.playbackRate !== oran) anim.playbackRate = oran;
  } catch { /* eski tarayıcı: normal hızda oynar */ }
}

const kapsamda = (el) => typeof Element !== "undefined" && el instanceof Element && Boolean(el.closest(YUMUSAK_KAPSAM));

/** Kapsamdaki çalışan bütün CSS animasyonlarına oranı yazar (kurulumda ve ayar değişince). */
function hepsineYaz(oran) {
  try {
    for (const a of document.getAnimations()) {
      const hedef = a.effect?.target;
      if (hedef && typeof a.animationName === "string" && kapsamda(hedef)) oranYaz(a, oran);
    }
  } catch { /* getAnimations yok */ }
}

let kuruldu = false;

/** Bir kez kurulur (her kullanan modül çağırabilir; tekrar çağrı bir şey yapmaz). */
export function yumusakHareketKur() {
  if (kuruldu || typeof document === "undefined" || typeof window === "undefined") return;
  kuruldu = true;
  let mq;
  try { mq = window.matchMedia(SORGU); } catch { return; }
  let aktif = mq.matches;
  document.addEventListener("animationstart", (e) => {
    if (!aktif) return;
    const el = e.target;
    if (!kapsamda(el)) return;
    try {
      for (const a of el.getAnimations({ subtree: true })) {
        // yalnız bu öğenin (ve ::before/::after'ının) bu adlı animasyonu
        if (a.effect?.target === el && a.animationName === e.animationName) oranYaz(a, YUMUSAK.hiz);
      }
    } catch { /* getAnimations yok: normal hız */ }
  }, true);
  if (aktif) hepsineYaz(YUMUSAK.hiz);
  mq.addEventListener?.("change", () => {
    aktif = mq.matches;
    hepsineYaz(aktif ? YUMUSAK.hiz : 1);
  });
}
