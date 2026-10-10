// Avatar Prestij pırıltısı (1049) — TEK paylaşılan görünürlük gözcüsü. Efekt yalnız CSS'tir (styles.css › .av-parla);
// burası yalnız ekranda (± 120 px) olan avatarlarda katmanı açar (.av-parla--acik). Zamanlayıcı yok, React durumu yok.
// Neden: 100 satırlık Dünya listesinde ekran dışındaki 200 sonsuz animasyon kaydırmayı 57 → 46 kare/sn'ye
// (CPU ×4'te 21 → 7) düşürüyordu; yalnız görünenler açıkken 54–55 (×4'te 19–20) — ölçüm 10 Eki 2026.
// Gözlenen öğe katmanın KABI (.avatar): kapalı katman display:none olduğu için kendisi hiç "görünür" bildirilmez.
const ACIK = "av-parla--acik";
const katmanlar = new WeakMap();   // kap → katman
let gozcu = null;

function gozcuAl() {
  if (gozcu || typeof IntersectionObserver === "undefined") return gozcu;
  gozcu = new IntersectionObserver((girdiler) => {
    for (const g of girdiler) katmanlar.get(g.target)?.classList.toggle(ACIK, g.isIntersecting);
  }, { rootMargin: "120px" });
  return gozcu;
}

/** Katmanı izlemeye al (kabı gözlenir); dönüş izlemeyi bırakır. Gözcü yoksa (eski tarayıcı) katman hep açık. */
export function parlaIzle(el) {
  const kap = el?.parentElement;
  if (!kap) return () => {};
  const g = gozcuAl();
  if (!g) { el.classList.add(ACIK); return () => {}; }
  katmanlar.set(kap, el);
  g.observe(kap);
  return () => { g.unobserve(kap); katmanlar.delete(kap); };
}
