/**
 * TUR 2 PREMIUM ÇERÇEVE (yalnız /premium-onizleme; oyunda kullanılmaz).
 *
 * <Cerceve2 tur="ejderha" aura="gece" boyut={120} hareketli><Avatar … /></Cerceve2>
 *
 * Katmanlar (alttan üste): aura + avatar (mevcut PremiumCerceve, çerçevesiz) → çizim (<img>, vektör SVG; keskin)
 * → efekt tuvali (WebGL gölgelendirici; alev, buz, şimşek, altın yansıması, göz/alev ışığı). Tuval ve çizim
 * kutunun %170'i: süsler ve efektler taşar, tıklama yutmaz.
 * Kademe: ≥ 100 px tam · 49–99 px orta (ejderha kanadı kısa, dar yerlerde kesilmesin) — ikisinde de + (varsa) WebGL · ≤ 48 px sade çizim, durağan (WebGL yok, kutudan taşmaz).
 * WebGL yoksa (eski cihaz, bağlam açılamadı) önceki SVG + CSS hâli (sanatCerceveler) gösterilir; Altın Lig
 * için oyundaki "Çizgi" tarzı. Hareket: yalnız `hareketli`, ekrandayken (IntersectionObserver), sekme
 * görünürken ve hareket azaltılmamışken; aksi hâlde tek durağan kare.
 * PNG yuvaları: public/kozmetik/premium/README.md (ejderha.png, kraliyet-tac.png).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import PremiumCerceve from "../PremiumCerceve.jsx";
import DenemeCerceve from "../../cerceveler/deneme/DenemeCerceve.jsx";
import {
  sanatAdresi, ejderhaNoktalari, buzNoktalari, kraliyetNoktalari, altinLigNoktalari, SIMSEK_ELEKTROT, KRALIYET_TAC_KUTU,
} from "./sanat.js";
import "./tur2.css";

/** PNG yuvası sözleşmesi (README ile aynı). Koordinatlar çizim birimi: kutunun %1'i, merkez 0,0, tuval −85…85. */
export const PNG_YUVALARI = {
  ejderha: { url: "/kozmetik/premium/ejderha.png", kutu: [-85, -85, 170, 170] },
  kraliyet: { url: "/kozmetik/premium/kraliyet-tac.png", kutu: KRALIYET_TAC_KUTU },
};

const RAD = Math.PI / 180;
export const TUR2 = {
  ejderha: {
    ad: "Ejderha", eski: "ejderha", efekt: "ejderha", olcek: 0.72, tepe: true, durgunT: 1.4,
    aciklama: "Halkaya sarılıp altından geçen kızıl pullu ejderha: altın karın, sırt dikenleri, açılmış kanat, halkayı kavrayan pençeler. Gözü yanar, ağzından gölgelendiriciyle çizilen gerçek alev püskürür; kıvılcım ve duman saçar.",
    n: ejderhaNoktalari,
  },
  alev: {
    ad: "Sönmeyen Alev", eski: "alev", efekt: "alev", olcek: 0.8, tepe: true,
    aciklama: "Kor çatlaklı dövme demir halka; çevresinde gerçek zamanlı yanan ateş — yukarı akan alev dilleri, beyaz sıcak çekirdek, tepede tüten duman, yükselen kıvılcımlar ve alevin üstünde titreyen ısı dalgası.",
    n: () => [],
  },
  buz: {
    ad: "Buz Kristali", eski: "buz", efekt: "buz", olcek: 0.8, tepe: true,
    aciklama: "Buzul camı halkadan büyüyen yüzeyli kristaller, don deseni ve kar taneleri. İçlerinden geçen tayf renkli kırılan ışık, kristal uçlarında yıldız parıltıları, dipte süzülen soğuk buğu.",
    n: buzNoktalari,
  },
  simsek: {
    ad: "Şimşek", eski: "simsek", efekt: "simsek", olcek: 0.9, tepe: true,
    a: [SIMSEK_ELEKTROT.sayi, SIMSEK_ELEKTROT.ilk * RAD, SIMSEK_ELEKTROT.r, 0],
    aciklama: "Halka değil enerji: elektrotlardan dışarı çakan dallı yıldırımlar, olukta akan plazma, çakma anında çevreyi (avatarı da) aydınlatan mavi ışık; ara sıra bütün çerçeve parlar.",
    n: () => [],
  },
  kraliyet: {
    ad: "Kraliyet", eski: "kraliyet", efekt: "altin", olcek: 0.8, tepe: true, a: [0.55, 1, 0, 0],
    aciklama: "Parlak sarı altın; beş uçlu, kadife başlıklı taç (yakut, safir, zümrüt, inci), zambak süsleri ve yuvalı taşlar. Işık altın yüzeyde gerçek yansıma gibi dolaşır, taşlarda renkli parıltı, tepede altın tozu.",
    n: kraliyetNoktalari,
  },
  altinlig: {
    ad: "Altın Lig", eski: null, efekt: "altin", olcek: 0.8, tepe: true, a: [0.5, 1, 0, 0],
    aciklama: "Altın Lig çerçevesinin yeni hâli, Kraliyet ile aynı altın dilinde: defne dalları, üç uçlu taç, yıldızlı plaka. Canlı sarı altın, dolaşan yansıma ve parıltı.",
    n: altinLigNoktalari,
  },
};
export const TUR2_SIRASI = Object.keys(TUR2);

// ---------------- PNG yuvası: dosya yüklenebiliyorsa kullanılır (sonuç önbellekli) ----------------
const pngDurum = new Map();
function pngDene(url) {
  if (!pngDurum.has(url)) {
    pngDurum.set(url, new Promise((coz) => {
      const img = new Image();
      img.onload = () => coz(img.naturalWidth > 0);
      img.onerror = () => coz(false);
      img.src = url;
    }));
  }
  return pngDurum.get(url);
}
function usePng(tur, etkin) {
  const yuva = etkin ? PNG_YUVALARI[tur] : null;
  const [var_, setVar] = useState(false);
  useEffect(() => {
    if (!yuva) { setVar(false); return undefined; }
    let aktif = true;
    pngDene(yuva.url).then((v) => { if (aktif) setVar(v); });
    return () => { aktif = false; };
  }, [yuva]);
  return yuva && var_ ? yuva : null;
}

// ---------------- WebGL var mı (motor tembel parçada) ----------------
let motorSoz = null;
const motorYukle = () => (motorSoz ??= import("./motor.js").then((m) => m.motorAl()).catch((e) => {
  console.warn("[Bildim] efekt motoru yüklenemedi:", e?.message ?? e);
  return null;
}));

export default function Cerceve2({ tur, aura = null, boyut = 88, hareketli = false, etiket, className = "", children }) {
  const T = TUR2[tur];
  const kademe = boyut <= 48 ? "kucuk" : boyut < 100 ? "orta" : "tam";   // orta: taşan süsler kısalır (dar yerler)
  const png = usePng(tur, kademe !== "kucuk");
  const tamPng = tur === "ejderha" && png;
  const tacPng = tur === "kraliyet" && png;
  const sanat = tamPng ? png.url : sanatAdresi(tur, kademe, { tacYok: Boolean(tacPng) });
  const [gl, setGl] = useState(kademe !== "kucuk" ? "bekliyor" : "kapali");
  const kok = useRef(null);
  const tuval = useRef(null);

  useEffect(() => {
    if (kademe === "kucuk") { setGl("kapali"); return undefined; }
    let aktif = true;
    motorYukle().then((m) => { if (aktif) setGl(m ? "var" : "yok"); });
    return () => { aktif = false; };
  }, [kademe]);

  const ayar = useMemo(() => ({
    efekt: T.efekt, olcek: T.olcek, a: T.a, n: T.n(), durgunT: T.durgunT,
    doku: {
      anahtar: `${tur}:${kademe}:${png ? "png" : "kod"}`,
      kaynaklar: tacPng ? [{ url: sanat }, { url: tacPng.url, kutu: tacPng.kutu }] : [{ url: sanat }],
    },
  }), [T, tur, kademe, png, tacPng, sanat]);

  useEffect(() => {
    if (gl !== "var" || !tuval.current) return undefined;
    let aktif = true;
    let yuva = null;
    let io = null;
    motorYukle().then((m) => {
      if (!aktif || !m || !tuval.current) return;
      yuva = m.ekle(tuval.current, ayar);
      yuva.boyutla(Math.round(boyut * 1.7));
      if (hareketli && typeof IntersectionObserver !== "undefined" && kok.current) {
        io = new IntersectionObserver((k) => yuva.oynat(k[k.length - 1].isIntersecting), { rootMargin: "40px" });
        io.observe(kok.current);
      }
    });
    return () => { aktif = false; io?.disconnect(); yuva?.birak(); };
  }, [gl, ayar, boyut, hareketli]);

  if (gl === "yok") {
    // WebGL yok → önceki hâl (SVG + CSS)
    if (!T.eski) return <DenemeCerceve tarz="cizgi" boyut={boyut} hareketli={hareketli} etiket={etiket} className={className}>{children}</DenemeCerceve>;
    return <PremiumCerceve cerceve={T.eski} aura={aura} boyut={boyut} hareketli={hareketli} etiket={etiket} className={className}>{children}</PremiumCerceve>;
  }

  return (
    <span ref={kok} className={`p2 p2--${kademe} p2--${tur} ${className}`.trim()} style={{ "--p2-b": `${boyut}px` }}
          data-cerceve2={tur} data-tac={T.tepe && kademe !== "kucuk" ? "" : undefined}
          {...(etiket ? { role: "img", "aria-label": etiket } : {})}>
      <PremiumCerceve cerceve={null} aura={aura} boyut={boyut} hareketli={hareketli} className="p2-ic">{children}</PremiumCerceve>
      <img className="p2-sanat" src={sanat} alt="" aria-hidden="true" draggable="false" decoding="async" />
      {tacPng && <img className="p2-sanat p2-sanat--tac" src={tacPng.url} alt="" aria-hidden="true" draggable="false"
                      style={{ left: `${50 + tacPng.kutu[0]}%`, top: `${50 + tacPng.kutu[1]}%`,
                               width: `${tacPng.kutu[2]}%`, height: `${tacPng.kutu[3]}%` }} />}
      {gl === "var" && <canvas ref={tuval} className="p2-efekt" aria-hidden="true" />}
    </span>
  );
}
