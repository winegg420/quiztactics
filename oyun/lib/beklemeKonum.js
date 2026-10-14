// "… cevaplayınca soru geçecek" satırı (.m1-bekleme) joker çubuğunun ÜSTÜNDE durur (m1-mac.css'te akış dışı, mutlak konum).
// CSS tek başına çubuğun yüksekliğini bilemez (joker satırı 1–2 satır, hak yazısı değişir) → çubuğun üst kenarı ölçülür,
// `bottom` buna göre yazılır; çubuk yoksa (Saf Bilgi) CSS'in varsayılan konumu kalır. React 19 ref temizleme işlevi.
const BOSLUK_PX = 6;

/** <div className="m1-bekleme" ref={beklemeJokerUstunde}> */
export function beklemeJokerUstunde(dugum) {
  if (!dugum) return undefined;
  let ro = null;
  const yaz = () => {
    try {
      const mac = dugum.parentElement;
      const joker = mac?.querySelector(".m1-joker-yuva");
      if (!mac || !joker) { dugum.style.bottom = ""; return; }
      const m = (dugum.offsetParent || mac).getBoundingClientRect();
      const j = joker.getBoundingClientRect();
      if (j.height < 1) { dugum.style.bottom = ""; return; }
      dugum.style.bottom = `${Math.max(0, Math.round(m.bottom - j.top + BOSLUK_PX))}px`;
    } catch { /* ölçüm kritik değil: varsayılan konum kalır */ }
  };
  yaz();
  try {
    const joker = dugum.parentElement?.querySelector(".m1-joker-yuva");
    if (joker && typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(yaz); ro.observe(joker); ro.observe(dugum.parentElement); }
  } catch { /* eski tarayıcı */ }
  return () => { try { ro?.disconnect(); } catch { /* yok */ } dugum.style.bottom = ""; };
}
