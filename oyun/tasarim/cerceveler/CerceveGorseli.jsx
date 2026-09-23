/**
 * ÇERÇEVE GÖRSELİ — yalnız çizim (durumsuz, veri çekmez). Avatar `children` olarak gelir.
 * Çerçeveyi oyuncuya bağlayan bileşen `oyun/components/CerceveliAvatar.jsx`; ekranlar onu kullanır.
 *
 * <CerceveGorseli anahtar="efsanevi_tac" boyut={64} hareketli>{avatar}</CerceveGorseli>
 *
 * Kurallar: 24–160 px her boyutta düzgün · 40 px altında sadeleşir (yalnız renkli halka) ·
 * hareket yalnız transform/opacity, ekranda en çok 3 (hareketHakki.js), prefers-reduced-motion'da durağan.
 */
import { cerceveTanimiBul, SUSLER } from "./tanimlar.js";
import { useHareketHakki } from "./hareketHakki.js";
import "./cerceveler.css";

const KUCUK_SINIR = 40;
const TAS_ACILARI = { 1: [0], 3: [-90, 90, 180], 4: [45, 135, 225, 315], 6: [30, 90, 150, 210, 270, 330] };
const TAS_TONLARI = ["pembe", "turkuaz", "pembe", "turkuaz", "pembe", "turkuaz"];
const KIVILCIMLAR = [[-58, 0], [28, 1.3], [118, 2.4], [205, 0.7], [290, 1.9]];
const ARKA_YERLER = new Set(["kanat", "defne", "yan-alt"]);

/** Halka kalınlığı (px): çerçevesiz ince, küçükte kalın-yalın, büyükte orantılı. */
export function halkaKalinligi(boyut, cerceveVar) {
  if (!cerceveVar) return Math.max(2, Math.round(boyut * 0.04));
  if (boyut < KUCUK_SINIR) return Math.max(2, Math.round(boyut * 0.1));
  return Math.max(4, Math.round(boyut * 0.085));
}

/** Çerçeve içindeki avatarın çapı (px). */
export function icBoyut(boyut, cerceveVar = true) {
  return Math.max(8, boyut - 2 * halkaKalinligi(boyut, cerceveVar));
}

function Sus({ ad }) {
  const s = SUSLER[ad];
  if (!s) return null;
  if (s.kod === "tas") {
    return (TAS_ACILARI[s.adet] ?? [0]).map((a, i) => (
      <span key={`${ad}${i}`} className="qt-cerceve-yer" style={{ "--_a": `${a}deg` }}>
        <span className="qt-cerceve-tas" data-ton={s.adet === 1 ? "turkuaz" : TAS_TONLARI[i]} />
      </span>
    ));
  }
  if (s.kod === "kristal") {
    return [0, 90, 180, 270].map((a) => (
      <span key={`${ad}${a}`} className="qt-cerceve-yer qt-cerceve-yer--dis" style={{ "--_a": `${a}deg` }}>
        <span className="qt-cerceve-kristal" />
      </span>
    ));
  }
  if (s.kod === "disler") return <span className="qt-cerceve-disler" />;
  const img = (sag) => (
    <img key={sag ? "s" : "l"} src={s.src} alt="" draggable="false" decoding="async"
         className={`qt-cerceve-sus qt-cerceve-sus--${s.yer}${sag ? " qt-cerceve-sus--sag" : ""}`}
         data-ton={s.ton} />
  );
  if (s.yer === "ust-uclu") {
    return [1, 2, 3].map((n) => (
      <img key={n} src={s.src} alt="" draggable="false" decoding="async"
           className={`qt-cerceve-sus qt-cerceve-sus--ust-uclu qt-cerceve-sus--uclu-${n}`} />
    ));
  }
  return s.cift ? <>{img(false)}{img(true)}</> : img(false);
}

/**
 * @param {object} o
 * @param {string|null} [o.anahtar]  çerçeve anahtarı (yoksa çerçevesiz ince halka)
 * @param {object} [o.satir]         katalog satırı (nadirlik/kaynak) — tanımsız anahtar için
 * @param {number} [o.boyut=64]      dış çap (px); avatar içeride icBoyut() kadar
 * @param {boolean} [o.hareketli]    animasyon iste (ekranda en çok 3; listelerde verme)
 * @param {boolean} [o.sinirsiz]     3 sınırını atla — YALNIZ önizleme sayfası
 * @param {string} [o.etiket]        erişilebilir ad (ör. "Anka çerçevesi")
 */
export default function CerceveGorseli({ anahtar, satir, boyut = 64, hareketli = false, sinirsiz = false,
  etiket, className = "", children }) {
  const tanim = cerceveTanimiBul(anahtar, satir);
  const kucuk = boyut < KUCUK_SINIR;
  const istek = !!(hareketli && (tanim?.hareketli || tanim?.parilti) && !kucuk);
  const hak = useHareketHakki(istek && !sinirsiz);
  const oynar = istek && (sinirsiz || hak);
  const k = halkaKalinligi(boyut, !!tanim);
  const susler = !kucuk && tanim?.sus ? tanim.sus : [];
  const arka = susler.filter((s) => ARKA_YERLER.has(SUSLER[s]?.yer) || SUSLER[s]?.kod === "disler");
  const on = susler.filter((s) => !arka.includes(s));

  return (
    <span className={`qt-cerceve${tanim ? "" : " qt-cerceve--yok"}${kucuk ? " qt-cerceve--kucuk" : ""}${oynar ? " qt-cerceve--oynar" : ""} ${className}`.trim()}
          data-tur={tanim?.tur} data-malzeme={tanim?.malzeme} data-desen={tanim?.desen}
          style={{ "--_b": `${boyut}px`, "--_k": `${k}px` }}
          {...(etiket ? { role: "img", "aria-label": etiket } : {})}>
      {!kucuk && tanim?.hareketli && <span className="qt-cerceve-aura" aria-hidden="true" />}
      {arka.map((s) => <Sus key={s} ad={s} />)}
      <span className="qt-cerceve-halka" aria-hidden="true" />
      <span className="qt-cerceve-ic">{children}</span>
      {!kucuk && tanim?.parilti && <span className="qt-cerceve-parilti" aria-hidden="true" />}
      {on.length > 0 && <span className="qt-cerceve-onsus" aria-hidden="true">{on.map((s) => <Sus key={s} ad={s} />)}</span>}
      {!kucuk && tanim?.hareketli && (
        <span className="qt-cerceve-kivilcimlar" aria-hidden="true">
          {KIVILCIMLAR.map(([a, g], i) => (
            <span key={i} className="qt-cerceve-yer qt-cerceve-yer--dis" style={{ "--_a": `${a}deg` }}>
              <span className="qt-cerceve-kivilcim" style={{ "--_g": `${g}s` }} />
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
