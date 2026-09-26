// Yatay kayan şeridin kesilen kenarına solma ipucu (öznitelik yazar; CSS `[data-kaydir-sol|sag]` maskeler).
// React 19 ref geri çağrısı olarak kullanılır: <div ref={kaydirIpucuBagla}> — temizlik işlevini kendisi döndürür.
export function kaydirIpucuBagla(cubuk) {
  if (!cubuk) return undefined;
  const olc = () => {
    try {
      const sol = cubuk.scrollLeft > 2;
      const sag = cubuk.scrollLeft + cubuk.clientWidth < cubuk.scrollWidth - 2;
      if (sol) cubuk.setAttribute("data-kaydir-sol", ""); else cubuk.removeAttribute("data-kaydir-sol");
      if (sag) cubuk.setAttribute("data-kaydir-sag", ""); else cubuk.removeAttribute("data-kaydir-sag");
    } catch { /* ipucu kritik değil */ }
  };
  olc();
  cubuk.addEventListener("scroll", olc, { passive: true });
  window.addEventListener("resize", olc);
  let ro = null;
  let mo = null;
  try { ro = new ResizeObserver(olc); ro.observe(cubuk); } catch { /* eski tarayıcı: resize yeter */ }
  try { mo = new MutationObserver(() => { olc(); Array.from(cubuk.children).forEach((c) => ro?.observe(c)); }); mo.observe(cubuk, { childList: true }); Array.from(cubuk.children).forEach((c) => ro?.observe(c)); } catch { /* yalnız ilk ölçüm */ }
  return () => { cubuk.removeEventListener("scroll", olc); window.removeEventListener("resize", olc); ro?.disconnect(); mo?.disconnect(); };
}
