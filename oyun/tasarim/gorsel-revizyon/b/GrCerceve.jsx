/**
 * GR ÇERÇEVE — Ajan B'nin kazanılan çerçeve adayları (lig, level, turnuva) için ortak kap.
 * Yöntem Cerceve2 (premium/tur2) ile aynı: avatar (PremiumCerceve iç dairesi) → çizim <img> (SVG metni) →
 * efekt tuvali (tur2 motoru, TEK paylaşılan WebGL bağlamı; aynı anda en çok 2 hareketli yuva — motor kuralı).
 *
 * <GrCerceve cizim={(kademe) => svgMetni} anahtar="ligA:altin" efekt={{ a: [...], n: [...] }} boyut={88} hareketli>
 *   <Avatar … />
 * </GrCerceve>
 *
 * Kademe: ≤ 48 px "kucuk" (kutudan taşmaz, durağan, WebGL yok) · 49–99 "orta" · ≥ 100 "tam".
 * WebGL yalnız `hareketli` + efekt verilince, ekrandayken (IntersectionObserver); görünmeyen yuva durur.
 * Hareketi azalt: motorun yumuşak modu (0,4 hız, ≤ 30 fps, parçacık yarı). WebGL yoksa yalnız çizim (durağan).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import PremiumCerceve from "../../premium/PremiumCerceve.jsx";
import { adres } from "./cizim/araclar.js";
import { efektleriKaydet } from "./cizim/efektler.js";
import "../../premium/tur2/tur2.css";

let motorSoz = null;
export const motorYukle = () => (motorSoz ??= (efektleriKaydet(), import("../../premium/tur2/motor.js"))
  .then((m) => m.motorAl())
  .catch((e) => { console.warn("[Bildim] efekt motoru yüklenemedi:", e?.message ?? e); return null; }));

export const kademeBul = (boyut) => (boyut <= 48 ? "kucuk" : boyut < 100 ? "orta" : "tam");

export default function GrCerceve({ cizim, anahtar, efekt = null, boyut = 88, hareketli = false, aura = null, etiket, className = "", children }) {
  const kademe = kademeBul(boyut);
  const sanat = useMemo(() => adres(`${anahtar}:${kademe}`, () => cizim(kademe)), [anahtar, kademe, cizim]);
  const webglIster = Boolean(efekt) && hareketli && kademe !== "kucuk";
  const [gl, setGl] = useState(false);
  const kok = useRef(null);
  const tuval = useRef(null);

  useEffect(() => {
    if (!webglIster) { setGl(false); return undefined; }
    let aktif = true;
    motorYukle().then((m) => { if (aktif) setGl(Boolean(m)); });
    return () => { aktif = false; };
  }, [webglIster]);

  const ayar = useMemo(() => (efekt ? {
    efekt: efekt.ad ?? "grLig", olcek: efekt.olcek ?? 0.8, a: efekt.a, n: efekt.n ?? [], durgunT: efekt.durgunT ?? 1.3,
    doku: { anahtar: `${anahtar}:${kademe}`, kaynaklar: [{ url: sanat }] },
  } : null), [efekt, anahtar, kademe, sanat]);

  useEffect(() => {
    if (!gl || !ayar || !tuval.current) return undefined;
    let aktif = true;
    let yuva = null;
    let io = null;
    motorYukle().then((m) => {
      if (!aktif || !m || !tuval.current) return;
      yuva = m.ekle(tuval.current, ayar);
      yuva.boyutla(Math.round(boyut * 1.7));
      if (typeof IntersectionObserver !== "undefined" && kok.current) {
        io = new IntersectionObserver((k) => yuva.oynat(k[k.length - 1].isIntersecting), { rootMargin: "40px" });
        io.observe(kok.current);
      } else yuva.oynat(true);
    });
    return () => { aktif = false; io?.disconnect(); yuva?.birak(); };
  }, [gl, ayar, boyut]);

  return (
    <span ref={kok} className={`p2 p2--${kademe} grb-cerceve ${className}`.trim()} style={{ "--p2-b": `${boyut}px` }}
          data-yumusak="" {...(etiket ? { role: "img", "aria-label": etiket } : {})}>
      <PremiumCerceve cerceve={null} aura={aura} boyut={boyut} hareketli={hareketli} className="p2-ic">{children}</PremiumCerceve>
      <img className="p2-sanat" src={sanat} alt="" aria-hidden="true" draggable="false" decoding="async" />
      {gl && <canvas ref={tuval} className="p2-efekt" aria-hidden="true" />}
    </span>
  );
}
