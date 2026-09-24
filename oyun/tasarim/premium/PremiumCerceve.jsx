/**
 * PREMIUM ÇERÇEVE + AURA — /premium-onizleme ve (560'tan beri) oyun: CerceveliAvatar takılı premium
 * çerçeve/aurayı tembel yüklenen oyun/components/PremiumAvatarCizim.jsx ile bununla çizer.
 *
 * <PremiumCerceve cerceve="ejderha" aura="kar" boyut={88} hareketli><Avatar … /></PremiumCerceve>
 *
 * Geometri: kutu boyut × boyut; çizim birimi kutunun %1'i, merkez 0,0, halka dış yarıçapı 50,
 * avatar dairesi yarıçapı 43. Süs katmanları kutunun %170'i (−85…85) → süsler taşar, tıklama yutmaz.
 * Katmanlar: arka süsler (kanat, hale, nebula) → iç daire (aura sahnesi → avatar) → halka + ön süsler.
 *
 * Teknik: katmanlı SVG çizim; hareket YALNIZ transform/opacity ve her hareketli parça kendi küçük
 * HTML katmanında (`pc-o`) → telefonda GPU'da birleşir, SVG her karede yeniden boyanmaz. Filtre/bulanıklık
 * animasyonu yok (yumuşaklık önceden degradeyle çizilir).
 * Kademe: ≥ 72 px tam · 49–71 orta (uzak süsler ve parçacıklar yok) · ≤ 48 yalnız halka + küçük vurgu
 * (komşu satıra taşmaz, hareket yok). Hareket yalnız `hareketli` verilen yerde, ekrandayken ve
 * prefers-reduced-motion yokken; aksi hâlde her şey durağan ilk karede kalır.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Katman } from "./cizim.jsx";
import { CERCEVELER } from "./sanatCerceveler.jsx";
import { AURALAR } from "./sanatAuralar.jsx";
import "./premium.css";

/** Çerçevesiz (yalnız aura) önizleme için ince halka. */
function DuzHalka() {
  return (
    <Katman z="on">
      <circle r="49" fill="none" stroke="#0b1220" strokeWidth="2" />
      <circle r="46.5" fill="none" stroke="#fff8ec" strokeWidth="4" opacity=".92" />
      <circle r="43.6" fill="none" stroke="#0b1220" strokeWidth="1.2" opacity=".5" />
    </Katman>
  );
}

function useEkranda(ref, izle) {
  const [ekranda, setEkranda] = useState(true);
  useEffect(() => {
    if (!izle || !ref.current || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver((kayitlar) => {
      kayitlar.forEach((k) => setEkranda(k.isIntersecting));
    }, { rootMargin: "60px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref, izle]);
  return ekranda;
}

export const kademeBul = (boyut) => (boyut <= 48 ? "kucuk" : boyut < 72 ? "orta" : "tam");

/**
 * @param {object} p
 * @param {string|null} [p.cerceve]  sanatCerceveler anahtarı (null → ince halka)
 * @param {string|null} [p.aura]     sanatAuralar anahtarı (null → avatarın kendi zemini)
 * @param {number} [p.boyut=88]      dış çap (px)
 * @param {boolean} [p.hareketli]    yalnız büyük/tekil yerlerde
 * @param {boolean} [p.halkasiz]    (oyun) çerçevesiz ve halkasız: iç daire kutunun tamamı — başka bir çerçevenin
 *                                   (lig/level) içine yalnız aura sahnesi koymak için. Önizleme bunu kullanmaz.
 */
export default function PremiumCerceve({ cerceve = null, aura = null, boyut = 88, hareketli = false, etiket, className = "", halkasiz = false, children }) {
  const ref = useRef(null);
  const hamId = useId();
  const id = `pc${hamId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const kademe = kademeBul(boyut);
  const C = cerceve ? CERCEVELER[cerceve] : null;
  const A = aura ? AURALAR[aura] : null;
  const izle = hareketli && kademe !== "kucuk";
  const ekranda = useEkranda(ref, izle);
  const oynar = izle && ekranda;
  return (
    <span ref={ref} className={`pc pc--${kademe}${oynar ? " pc--oynar" : " pc--durgun"}${halkasiz && !C ? " pc--halkasiz" : ""} ${className}`.trim()}
          data-cerceve={cerceve ?? undefined} data-aura={aura ?? undefined} data-tac={C?.tepe && kademe !== "kucuk" ? "" : undefined}
          style={{ "--pc-b": `${boyut}px` }} {...(etiket ? { role: "img", "aria-label": etiket } : {})}>
      <svg className="pc-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          {C?.Defs && <C.Defs id={id} />}
          {A?.Defs && <A.Defs id={id} />}
        </defs>
      </svg>
      {C?.Arka && <C.Arka id={id} k={kademe} />}
      <span className={`pc-ic${A ? " pc-ic--aura" : ""}`}>
        {A && <A.Sahne id={id} k={kademe} />}
        {children}
      </span>
      {C ? <C.On id={id} k={kademe} /> : halkasiz ? null : <DuzHalka />}
    </span>
  );
}

// ---------------- Avatar zemini ayıklama (aura için) ----------------
// Resmî avatar SVG'leri 320×320 düz renkli <rect rx=38> zeminle ve köşelerde iki açık çizgiyle başlar.
// Aura avatarın arkasında göründüğü için önizlemede bu zemin ayıklanır (dosyalar değişmez).
const seffafOnbellek = new Map();
async function seffafYap(url) {
  if (seffafOnbellek.has(url)) return seffafOnbellek.get(url);
  const soz = (async () => {
    try {
      const yanit = await fetch(url);
      if (!yanit.ok) throw new Error(String(yanit.status));
      let metin = await yanit.text();
      metin = metin
        .replace(/<rect width="320" height="320"[^>]*>(<\/rect>)?/, "")
        .replace(/<path d="M31 64q23 12 43-3[^>]*>(<\/path>)?/, "");
      return URL.createObjectURL(new Blob([metin], { type: "image/svg+xml" }));
    } catch (e) {
      console.warn("[Bildim] avatar zemini ayıklanamadı:", e?.message ?? e);
      return url;   // ayıklanamazsa avatarın kendisi
    }
  })();
  seffafOnbellek.set(url, soz);
  return soz;
}

/** Aura varken zeminsiz avatar adresi; yokken aynen. */
export function useSeffafAvatar(url, etkin) {
  const [sonuc, setSonuc] = useState(url);
  useEffect(() => {
    let aktif = true;
    if (!etkin || !url || !url.startsWith("/avatars/")) { setSonuc(url); return undefined; }
    seffafYap(url).then((u) => { if (aktif) setSonuc(u); });
    return () => { aktif = false; };
  }, [url, etkin]);
  return sonuc;
}
