// "… cevaplayınca soru geçecek" satırı (.m1-bekleme) m1-mac.css'te akış dışı (mutlak konum) durur. CSS tek başına komşu
// öğelerin yerini bilemez → joker çubuğu ölçülür, `bottom` buna göre yazılır; çubuk yoksa (Saf Bilgi) CSS'in varsayılanı kalır.
// 14 Eki 2026: çubuğun ÜSTÜ sonuç bandının ("Yanlış — doğrusu X") yeridir — orada banda biniyordu. Sıra:
//   1) çubuğun ALTI ile tepki satırı arasındaki boşluk yetiyorsa oraya (ortalı) — hiçbir şeyin üstüne binmez;
//   2) yetmiyorsa (kısa ekran) çubuğun hak satırının ("Arkadaş maçı: …") yerine: cevaptan sonra çubuk pasif, hak satırı
//      bu sürede gizlenir (data-bekleme-ustte); hak satırı yoksa çubuğun hemen üstü.
// React 19 ref temizleme işlevi.
const BOSLUK_PX = 6;

/** <div className="m1-bekleme" ref={beklemeJokerUstunde}> */
export function beklemeJokerUstunde(dugum) {
  if (!dugum) return undefined;
  let ro = null;
  let isaretli = null;   // hak satırını gizlemek için işaretlenen joker yuvası
  const isaretKaldir = () => { if (isaretli) { delete isaretli.dataset.beklemeUstte; isaretli = null; } };
  const yaz = () => {
    try {
      const mac = dugum.parentElement;
      const joker = mac?.querySelector(".m1-joker-yuva");
      if (!mac || !joker) { isaretKaldir(); dugum.style.bottom = ""; return; }
      const m = (dugum.offsetParent || mac).getBoundingClientRect();
      const j = joker.getBoundingClientRect();
      if (j.height < 1) { isaretKaldir(); dugum.style.bottom = ""; return; }
      const h = dugum.getBoundingClientRect().height || 20;
      const alt = mac.querySelector(":scope > .m1-alt");
      const altUst = alt && alt.getBoundingClientRect().height > 0 ? alt.getBoundingClientRect().top : m.bottom;
      const bosluk = altUst - j.bottom;
      if (bosluk >= h + BOSLUK_PX * 2) {
        isaretKaldir();
        const ust = j.bottom + (bosluk - h) / 2;
        dugum.style.bottom = `${Math.max(0, Math.round(m.bottom - ust - h))}px`;
        return;
      }
      const hak = joker.querySelector(".m1-skill-hak");
      const hk = hak?.getBoundingClientRect();
      if (hk && hk.height > 0) {
        if (isaretli !== joker) { isaretKaldir(); joker.dataset.beklemeUstte = "1"; isaretli = joker; }
        const ust = hk.top + (hk.height - h) / 2;
        dugum.style.bottom = `${Math.max(0, Math.round(m.bottom - ust - h))}px`;
        return;
      }
      isaretKaldir();
      dugum.style.bottom = `${Math.max(0, Math.round(m.bottom - j.top + BOSLUK_PX))}px`;
    } catch { /* ölçüm kritik değil: varsayılan konum kalır */ }
  };
  yaz();
  try {
    const mac = dugum.parentElement;
    const joker = mac?.querySelector(".m1-joker-yuva");
    if (joker && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(yaz);
      ro.observe(joker); ro.observe(mac); ro.observe(dugum);
      const alt = mac.querySelector(":scope > .m1-alt");
      if (alt) ro.observe(alt);
    }
  } catch { /* eski tarayıcı */ }
  return () => { try { ro?.disconnect(); } catch { /* yok */ } isaretKaldir(); dugum.style.bottom = ""; };
}
